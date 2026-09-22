import { NextResponse } from 'next/server';

import { deleteSession, HermesError, updateSession } from '@/libs/hermes/client';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

/** PATCH /api/hermes/sessions/:id - rename a topic, or pin/unpin it. */
export const PATCH = async (req: Request, { params }: { params: { id: string } }) => {
  const patch = await req.json().catch(() => ({}));

  try {
    const session = await updateSession(params.id, patch);
    return NextResponse.json({ session });
  } catch (error) {
    const err = error as HermesError;
    return NextResponse.json(
      { error: err.message },
      { status: err.status && err.status >= 400 ? err.status : 502 },
    );
  }
};

/** DELETE /api/hermes/sessions/:id - delete a topic and its messages. */
export const DELETE = async (_req: Request, { params }: { params: { id: string } }) => {
  try {
    await deleteSession(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as HermesError;
    return NextResponse.json(
      { error: err.message },
      { status: err.status && err.status >= 400 ? err.status : 502 },
    );
  }
};
