import { NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { getSummary } from '@/lib/salaries';

export const runtime = 'nodejs';
export async function GET() {
  try { return NextResponse.json(await getSummary()); }
  catch (error) { return apiError(error); }
}
