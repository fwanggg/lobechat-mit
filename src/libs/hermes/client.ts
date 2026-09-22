/**
 * Server-side client for the Hermes gateway HTTP API.
 *
 * Hermes exposes two HTTP surfaces on hermes-box (both loopback-only):
 *   :9119  the operator dashboard (web_server.py) - ephemeral per-process token
 *   :8642  the gateway API server (gateway/platforms/api_server.py) - static bearer
 *
 * We use :8642: its key is stable, and its routes are the ones a client wants.
 * Both bind 127.0.0.1 on the box, so from this Mac they are reached through an
 * SSH tunnel (`pnpm hermes:tunnel`), pointed at by HERMES_API_URL.
 *
 * SESSION == TOPIC. A Hermes session carries title / last_active / preview /
 * message_count, which is exactly what a topic list renders - there is no
 * translation layer between the two concepts.
 *
 * This module must only ever run on the server: it holds the bearer key. The
 * browser-facing service clients (src/services/*) call our own route handlers
 * under /api/hermes/*, which call this.
 */

const DEFAULT_TIMEOUT_MS = 30_000;

/** A Hermes session - what this UI calls a topic. */
export interface HermesSession {
  api_call_count?: number;
  archived: boolean;
  /** e.g. 'deepseek/deepseek-v4-flash-0731' */
  cached_read_tokens?: number;
  ended_at: number | null;
  estimated_cost_usd?: number;
  has_system_prompt?: boolean;
  hidden: boolean;
  id: string;
  input_tokens?: number;
  last_active: number;
  message_count: number;
  model: string;
  output_tokens?: number;
  parent_session_id: string | null;
  pinned: boolean;
  preview: string;
  reasoning_tokens?: number;
  /** 'slack' | 'telegram' | 'cli' | ... */
  source: string;
  started_at: number;
  title: string;
  tool_call_count?: number;
  user_id?: string;
}

/** One message in a session - OpenAI-shaped, so it maps onto the chat UI directly. */
export interface HermesMessage {
  content: string | null;
  /** renderer hint, e.g. for tool or system rows */
  display_kind?: string | null;
  finish_reason?: string | null;
  id: number;
  reasoning?: string | null;
  reasoning_content?: string | null;
  role: 'assistant' | 'system' | 'tool' | 'user';
  session_id: string;
  timestamp: number;
  token_count?: number | null;
  tool_call_id?: string | null;
  /** raw OpenAI tool-call array when the assistant requested tools */
  tool_calls?: unknown[] | null;
  tool_name?: string | null;
}

export interface HermesPage<T> {
  data: T[];
  has_more?: boolean;
  limit?: number;
  object?: string;
  offset?: number;
  pagination?: Record<string, unknown>;
  session_id?: string;
}

export class HermesError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'HermesError';
  }
}

const config = () => {
  const baseUrl = (process.env.HERMES_API_URL || 'http://127.0.0.1:18642').replace(/\/+$/, '');
  const apiKey = process.env.HERMES_API_KEY;

  if (!apiKey) {
    throw new HermesError(
      'HERMES_API_KEY is not set. Copy it from /root/.hermes/.env on hermes-box (API_SERVER_KEY).',
    );
  }

  return { apiKey, baseUrl };
};

/** Raw call against the gateway. Adds the bearer key and normalises errors. */
export const hermesFetch = async (
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> => {
  const { apiKey, baseUrl } = config();
  const controller = new AbortController();
  // A timeout of 0 means "no deadline": streaming turns run as long as they run.
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      // Next caches fetch GETs by default; a session's transcript changes under
      // us every time a turn runs, so every read here must hit the gateway.
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      // Drain a little of the body for the error message, but never leak headers.
      const body = await res.text().catch(() => '');
      throw new HermesError(
        `Hermes ${init.method || 'GET'} ${path} failed: ${res.status} ${res.statusText}`,
        res.status,
        body.slice(0, 500),
      );
    }

    return res;
  } catch (error) {
    if (error instanceof HermesError) throw error;
    if ((error as Error)?.name === 'AbortError') {
      throw new HermesError(
        `Hermes request timed out after ${timeoutMs}ms: ${path}. Is the SSH tunnel up? (pnpm hermes:tunnel)`,
      );
    }
    throw new HermesError(
      `Cannot reach Hermes at ${baseUrl}: ${(error as Error)?.message}. Is the SSH tunnel up? (pnpm hermes:tunnel)`,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const getJson = async <T>(path: string, timeoutMs?: number): Promise<T> =>
  (await hermesFetch(path, { method: 'GET' }, timeoutMs)).json() as Promise<T>;

const postJson = async <T>(path: string, body: unknown, timeoutMs?: number): Promise<T> =>
  (await hermesFetch(
    path,
    { body: JSON.stringify(body), method: 'POST' },
    timeoutMs,
  )).json() as Promise<T>;

/* -------------------------------------------------------------------------- */
/* Sessions (topics)                                                          */
/* -------------------------------------------------------------------------- */

/** Topic list. `limit`/`offset` page it; newest-active first is the gateway's order. */
export const listSessions = async (params: { limit?: number; offset?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const suffix = query.toString();
  return getJson<HermesPage<HermesSession>>(`/api/sessions${suffix ? `?${suffix}` : ''}`);
};

export const getSession = (id: string) =>
  getJson<HermesSession>(`/api/sessions/${encodeURIComponent(id)}`);
/**
 * Create a session - what this UI calls a new topic.
 *
 * `source` matters for more than bookkeeping: Hermes' own dashboard treats
 * 'api_server' as an automation source and hides those sessions behind its
 * default Chats filter. Creating with 'cli' keeps our topics visible beside
 * the household's real conversations rather than buried in a filtered view.
 */
export const createSession = async (params: {
  id?: string;
  model?: string;
  provider?: string;
  source?: string;
  system_prompt?: string;
  title?: string;
} = {}) => {
  const res = await hermesFetch('/api/sessions', {
    body: JSON.stringify({ source: 'cli', ...params }),
    method: 'POST',
  });

  const created = (await res.json()) as { session?: HermesSession };

  if (!created?.session?.id) throw new HermesError('Hermes returned no session id');

  return created.session;
};
/** Rename a topic, or pin/archive/hide it. */
export const updateSession = async (id: string, patch: Record<string, unknown>) => {
  const res = await hermesFetch(`/api/sessions/${encodeURIComponent(id)}`, {
    body: JSON.stringify(patch),
    method: 'PATCH',
  });

  const updated = (await res.json()) as { session?: HermesSession };

  return updated?.session ?? (updated as unknown as HermesSession);
};

/** Delete a topic and everything in it. */
export const deleteSession = async (id: string) => {
  await hermesFetch(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
};

/** Clone a topic, optionally under a new title. */
export const forkSession = async (id: string, body: Record<string, unknown> = {}) => {
  const res = await hermesFetch(`/api/sessions/${encodeURIComponent(id)}/fork`, {
    body: JSON.stringify(body),
    method: 'POST',
  });

  const forked = (await res.json()) as { session?: HermesSession };

  if (!forked?.session?.id) throw new HermesError('Hermes returned no session id for the fork');

  return forked.session;
};

/* -------------------------------------------------------------------------- */
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

/** The full conversation of one session, in order, as the gateway stores it. */
export const getMessages = async (
  sessionId: string,
  params: { limit?: number; offset?: number } = {},
) => {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const suffix = query.toString();
  return getJson<HermesPage<HermesMessage>>(
    `/api/sessions/${encodeURIComponent(sessionId)}/messages${suffix ? `?${suffix}` : ''}`,
  );
};

/**
 * One session's transcript, oldest-first.
 *
 * The gateway orders and pages this itself (`order=oldest`, limit capped at 500),
 * so there is nothing to walk or reverse - ask for exactly what the UI renders.
 */
export const getTranscript = async (sessionId: string, wanted = 200) => {
  const limit = Math.min(500, Math.max(20, wanted));

  return getJson<HermesPage<HermesMessage>>(
    `/api/sessions/${encodeURIComponent(sessionId)}/messages?limit=${limit}&order=oldest`,
  );
};

/* -------------------------------------------------------------------------- */
/* Sending a turn                                                             */
/* -------------------------------------------------------------------------- */

/**
 * POST a user turn and stream the assistant's reply.
 *
 * Returns the raw Response so the caller decides how to consume it: the route
 * handler pipes the body straight through to the browser as SSE, which keeps
 * tokens flowing without buffering a whole turn server-side.
 */
export const streamChat = async (sessionId: string, body: Record<string, unknown>) =>
  hermesFetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/chat/stream`,
    { body: JSON.stringify(body), method: 'POST' },
    0, // no client timeout: the tunnel stays open for the whole turn
  );

/** Non-streaming variant, for callers that want the complete reply at once. */
export const sendChat = (sessionId: string, body: Record<string, unknown>) =>
  postJson<{ content?: string; message?: HermesMessage }>(
    `/api/sessions/${encodeURIComponent(sessionId)}/chat`,
    body,
    180_000,
  );

/** Cheap liveness probe for the UI's connection indicator. */
export const health = async () => {
  try {
    const res = await hermesFetch('/health', { method: 'GET' }, 5000);
    return { ok: true, status: res.status };
  } catch (error) {
    return { error: (error as Error).message, ok: false };
  }
};
