import { getPreferredRegion } from '@/app/api/config';
import { createErrorResponse } from '@/app/api/errorResponse';
import { AgentRuntime, ChatCompletionErrorPayload } from '@/libs/agent-runtime';
import { ChatErrorType } from '@/types/fetch';
import { ChatStreamPayload } from '@/types/openai/chat';
import { getTracePayload } from '@/utils/trace';

import { checkAuth } from '../../middleware/auth';
import { createTraceOptions, initAgentRuntimeWithUserPayload } from '../agentRuntime';
import { hermesChatStream } from '@/libs/hermes/stream';

/**
 * The Hermes branch needs server-side env (the gateway bearer key) and holds a
 * stream open for the length of a turn, neither of which edge gives us.
 */
export const runtime = 'nodejs';

/** Hermes is the household agent; there is no per-provider credential to pick. */
const HERMES_PROVIDER = 'hermes';

interface TextPart {
  text?: string;
  type?: string;
}

const isTextPart = (value: unknown): value is TextPart =>
  typeof value === 'object' && value !== null && 'type' in value;

const textOf = (content: unknown): string => {
  if (typeof content === 'string') return content;

  // Vision requests arrive as OpenAI content parts; keep the text ones.
  if (Array.isArray(content)) {
    return content
      .filter(isTextPart)
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text as string)
      .join('\n');
  }

  return '';
};

/**
 * POST /api/chat/hermes
 *
 * The UI already posts here with an OpenAI-shaped payload, so the whole
 * integration is a branch: take the user's last message and its topic, send
 * it to Hermes, and re-emit the reply in the SSE protocol the UI parses.
 *
 * In this build a topic IS a Hermes session, so `topicId` on the message is
 * the session id - that is why no extra plumbing is needed to reach it.
 */
const hermesHandler = async (req: Request) => {
  const payload = (await req.json()) as {
    messages?: { content?: unknown; role?: string; topicId?: string }[];
    sessionId?: string;
    topicId?: string;
  };

  // The store sends the active topic on every request inside the trace header
  // (see the `trace` argument at the chat store's createAssistantMessageStream
  // call site), which reaches us as base64 JSON. The payload's own messages are
  // OpenAI-shaped and carry no topic, so this header is the reliable source.
  const trace = getTracePayload(req);

  const messages = payload.messages || [];
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const topicId =
    lastUser?.topicId ||
    payload.topicId ||
    payload.sessionId ||
    trace?.topicId ||
    trace?.sessionId ||
    [...messages].reverse().find((m) => m.topicId)?.topicId;
  const text = textOf(lastUser?.content);

  if (!topicId) {
    console.error('Route: [hermes] no topicId in payload', {
      messages: messages.map((m) => ({ role: m.role, topicId: m.topicId })),
      topLevelKeys: Object.keys(payload),
    });

    return createErrorResponse(ChatErrorType.InternalServerError, {
      error: new Error(
        `No topic selected - every turn is sent into a Hermes session. Received ${messages.length} message(s), none carrying a topicId.`,
      ),
    });
  }

  if (!text.trim()) {
    return createErrorResponse(ChatErrorType.InternalServerError, {
      error: new Error('The message was empty.'),
    });
  }

  try {
    const stream = await hermesChatStream(topicId, text);

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Route: [hermes]', error);
    return createErrorResponse(ChatErrorType.InternalServerError, { error: error as Error });
  }
};

export const preferredRegion = getPreferredRegion();

export const POST = checkAuth(async (req: Request, { params, jwtPayload, createRuntime }) => {
  const { provider } = params;
  if (provider === HERMES_PROVIDER) return hermesHandler(req);

  try {
    // ============  1. init chat model   ============ //
    let agentRuntime: AgentRuntime;
    if (createRuntime) {
      agentRuntime = createRuntime(jwtPayload);
    } else {
      agentRuntime = await initAgentRuntimeWithUserPayload(provider, jwtPayload);
    }

    // ============  2. create chat completion   ============ //

    const data = (await req.json()) as ChatStreamPayload;

    const tracePayload = getTracePayload(req);

    let traceOptions = {};
    // If user enable trace
    if (tracePayload?.enabled) {
      traceOptions = createTraceOptions(data, {
        provider,
        trace: tracePayload,
      });
    }

    return await agentRuntime.chat(data, { user: jwtPayload.userId, ...traceOptions });
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;
    // track the error at server side
    console.error(`Route: [${provider}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider });
  }
});
