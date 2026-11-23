import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { getSummary } from '@/server/reports/summary';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try { return NextResponse.json(await getSummary(Object.fromEntries(request.nextUrl.searchParams))); }
  catch (error) { return apiError(error); }
}
