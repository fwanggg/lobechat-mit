import { NextResponse } from 'next/server';

import { forkSession, HermesError } from '@/libs/hermes/client';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

/** POST /api/hermes/sessions/:id/fork - clone a topic, optionally re-titled. */
export const POST = async (req: Request, { params }: { params: { id: string } }) => {
  const body = await req.json().catch(() => ({}));

  try {
    const session = await forkSession(params.id, body);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const err = error as HermesError;
    return NextResponse.json(
      { error: err.message },
      { status: err.status && err.status >= 400 ? err.status : 502 },
    );
  }
};
