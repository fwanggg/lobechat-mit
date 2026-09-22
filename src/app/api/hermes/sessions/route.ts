import { NextResponse } from 'next/server';

import { createSession, HermesError, listSessions } from '@/libs/hermes/client';

export const runtime = 'nodejs';

/** Never cache: this is a live view of a store another process is writing. */
export const dynamic = 'force-dynamic';

/**
 * GET /api/hermes/sessions
 *
 * The topic list. A Hermes session is what this UI calls a topic, so this maps
 * 1:1 onto the topic sidebar: id, title, last_active, message_count, preview.
 */
export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit')) || 50;
  const offset = Number(searchParams.get('offset')) || 0;

  try {
    const page = await listSessions({ limit, offset });
    return NextResponse.json(page);
  } catch (error) {
    const err = error as HermesError;
    return NextResponse.json(
      { error: err.message, hint: 'Is the SSH tunnel up? pnpm hermes:tunnel' },
      { status: err.status && err.status >= 400 ? err.status : 502 },
    );
  }
};

/**
 * POST /api/hermes/sessions
 *
 * Start a new topic - a new Hermes session. Sends no turn: the user types into
 * it first, which is how the chat UI creates a topic on first message.
 */
export const POST = async (req: Request) => {
  const body = await req.json().catch(() => ({}));

  try {
    const session = await createSession(body);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const err = error as HermesError;
    return NextResponse.json(
      { error: err.message },
      { status: err.status && err.status >= 400 ? err.status : 502 },
    );
  }
};
