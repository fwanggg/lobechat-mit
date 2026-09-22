import { NextResponse } from 'next/server';

import { getTranscript, HermesError } from '@/libs/hermes/client';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hermes/sessions/:id/messages
 *
 * One session's transcript, oldest-first, for the chat list to render. The
 * gateway pages newest-first; getTranscript walks and reorders it.
 */
export const GET = async (req: Request, { params }: { params: { id: string } }) => {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit')) || 100;

  try {
    const transcript = await getTranscript(params.id, limit);
    return NextResponse.json(transcript);
  } catch (error) {
    const err = error as HermesError;
    return NextResponse.json({ error: err.message }, { status: err.status ?? 502 });
  }
};
