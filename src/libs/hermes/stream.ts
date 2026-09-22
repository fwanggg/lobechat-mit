import { streamChat } from './client';

/**
 * Translate Hermes' chat stream into the SSE the chat UI consumes.
 *
 * The wire format is standard SSE with a NAMED EVENT - the event name is what
 * the client dispatches on, not the payload:
 *
 *   - src/utils/fetch.ts reads `ev.event` inside its onmessage handler and
 *     switches on 'text' or 'tool_calls'. An unnamed frame arrives as 'message'
 *     and matches neither case, so its content is silently dropped.
 *   - src/libs/agent-runtime/utils/streams/protocol.ts tracks the same name via
 *     createCallbacksTransformer, confirming the `event:` line is load-bearing.
 *
 * So a delta goes out as:
 *
 *   event: text
 *   data: "<delta>"
 *
 * The data line is JSON (the client calls JSON.parse and falls back to raw text
 * if that throws). Hermes itself speaks a different vocabulary - run.started,
 * assistant.delta, tool.progress, assistant.completed, run.completed, error,
 * done - which this module maps down to the one event name the UI needs.
 *
 * There is no terminator to send: the client's onFinish fires when the body
 * closes, which it does when the run ends.
 */

/** Pull the JSON payload out of one `event: X\ndata: {...}` SSE frame. */
const parseFrame = (frame: string): { data: any; event: string } | null => {
  let event = '';
  const dataLines: string[] = [];

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }

  if (!dataLines.length) return null;

  try {
    return { data: JSON.parse(dataLines.join('\n')), event };
  } catch {
    return null;
  }
};

/** One SSE frame, with the event name the client dispatches on. */
const sse = (data: string) => `event: text\ndata: ${JSON.stringify(data)}\n\n`;

export interface HermesStreamOptions {
  onError?: (message: string) => void;
  signal?: AbortSignal;
}

/**
 * Stream one turn, yielding UI-protocol SSE.
 *
 * `text` is the user's message. The topicId is the Hermes session id - a topic
 * in this UI and a session in Hermes are the same thing.
 */
export const hermesChatStream = async (
  topicId: string,
  text: string,
  options: HermesStreamOptions = {},
): Promise<ReadableStream<Uint8Array>> => {
  const upstream = await streamChat(topicId, { message: text });

  if (!upstream.body) throw new Error('Hermes returned no stream body');

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  let buffer = '';
  let sawDelta = false;

  return new ReadableStream<Uint8Array>({
    async cancel() {
      await reader.cancel().catch(() => {});
    },

    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // The run is over; closing the body is what fires the client's
            // onFinish. Nothing more to send.
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line.
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            // The gateway sends `: keepalive` comments every 30s - not JSON.
            if (!frame.trim() || frame.trimStart().startsWith(':')) continue;

            const parsed = parseFrame(frame);
            if (!parsed) continue;

            const { data, event } = parsed;

            if (event === 'assistant.delta' && typeof data?.delta === 'string' && data.delta) {
              sawDelta = true;
              controller.enqueue(encoder.encode(sse(data.delta)));
              continue;
            }

            // A run can complete without having emitted deltas (short replies,
            // or an answer assembled server-side). Emit the content once so the
            // UI never shows an empty bubble.
            if (event === 'assistant.completed') {
              const content = typeof data?.content === 'string' ? data.content : '';

              if (content && !sawDelta) controller.enqueue(encoder.encode(sse(content)));
              continue;
            }

            if (event === 'error') {
              const message = data?.message || 'Hermes reported an error mid-turn';
              options.onError?.(message);
              controller.enqueue(encoder.encode(sse(message)));
            }
          }
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          controller.close();
          return;
        }

        controller.error(error);
      }
    },
  });
};
