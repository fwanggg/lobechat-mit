import { streamChat } from './client';

/**
 * Turn Hermes' chat stream into the SSE protocol the chat UI already speaks.
 *
 * The UI's stream consumer understands exactly four chunk types
 * (src/libs/agent-runtime/utils/streams/protocol.ts):
 *   {type:'text', data:string} | {type:'tool_calls', data} | {type:'data', data} | {type:'stop'}
 *
 * Hermes emits its own vocabulary instead:
 *   run.started, message.started, assistant.delta, tool.progress,
 *   tool.started/completed/failed, assistant.completed, run.completed, error, done
 *
 * So this is a translation, not a re-implementation: deltas become text chunks,
 * the end of the run becomes a stop chunk. Everything else is dropped - the
 * minimal UI renders text, and the authoritative transcript comes from
 * GET /messages afterwards regardless of what was streamed.
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

const sse = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

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
  let finished = false;

  return new ReadableStream<Uint8Array>({
    async cancel() {
      await reader.cancel().catch(() => {});
    },

    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (!finished) {
              finished = true;
              controller.enqueue(encoder.encode(sse({ data: '', type: 'stop' })));
            }
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
              controller.enqueue(encoder.encode(sse({ data: data.delta, type: 'text' })));
              continue;
            }

            // A run can complete without having emitted deltas (short replies,
            // or an answer assembled server-side). Emit the content once so the
            // UI never shows an empty bubble.
            if (event === 'assistant.completed') {
              const content = typeof data?.content === 'string' ? data.content : '';

              if (content && !sawDelta) {
                controller.enqueue(encoder.encode(sse({ data: content, type: 'text' })));
              }

              if (!finished) {
                finished = true;
                controller.enqueue(encoder.encode(sse({ data: '', type: 'stop' })));
              }
              continue;
            }

            if (event === 'error') {
              const message = data?.message || 'Hermes reported an error mid-turn';
              options.onError?.(message);
              controller.enqueue(encoder.encode(sse({ data: message, type: 'text' })));
              continue;
            }

            if (event === 'done') {
              if (!finished) {
                finished = true;
                controller.enqueue(encoder.encode(sse({ data: '', type: 'stop' })));
              }
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
