import { streamChat } from '@/libs/hermes/client';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/hermes/sessions/:id/chat
 *
 * Send a user turn and pipe the assistant's reply back to the browser.
 *
 * The body is forwarded to the gateway verbatim: this route deliberately does
 * not re-shape it, so the API's contract stays the single source of truth.
 * The response body is streamed through untouched (SSE or chunked, whichever
 * the gateway speaks) so tokens reach the UI as they are produced rather than
 * after the whole turn completes.
 */
export const POST = async (req: Request, { params }: { params: { id: string } }) => {
  const body = await req.json().catch(() => ({}));

  try {
    const upstream = await streamChat(params.id, body);

    if (!upstream.body) {
      return new Response(JSON.stringify({ error: 'Hermes returned an empty stream' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    return new Response(upstream.body, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Type': upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
      status: upstream.status,
    });
  } catch (error) {
    const err = error as { message?: string; status?: number };
    return new Response(JSON.stringify({ error: err.message ?? 'Hermes request failed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: err.status && err.status >= 400 ? err.status : 502,
    });
  }
};
