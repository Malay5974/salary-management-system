import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { createEmployee, listEmployees } from '@/server/employees/service';
import { requireAuth } from '@/server/auth/session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request); if (unauthorized) return unauthorized;
  try { return NextResponse.json(await listEmployees(Object.fromEntries(request.nextUrl.searchParams))); }
  catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request); if (unauthorized) return unauthorized;
  try { return NextResponse.json(await createEmployee(await request.json()), { status: 201 }); }
  catch (error) { return apiError(error); }
}
