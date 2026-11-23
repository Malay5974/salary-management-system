import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { getSummary } from '@/server/reports/summary';
import { requireAuth } from '@/server/auth/session';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth(request); if (unauthorized) return unauthorized;
  try { return NextResponse.json(await getSummary(Object.fromEntries(request.nextUrl.searchParams))); }
  catch (error) { return apiError(error); }
}
