import { NextResponse } from 'next/server';

import { health } from '@/libs/hermes/client';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

/** GET /api/hermes/health - liveness of the Hermes link, for the UI's indicator. */
export const GET = async () => {
  const result = await health();

  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
};
