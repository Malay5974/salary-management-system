import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { createEmployee, listEmployees } from '@/server/employees/service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try { return NextResponse.json(await listEmployees(Object.fromEntries(request.nextUrl.searchParams))); }
  catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try { return NextResponse.json(await createEmployee(await request.json()), { status: 201 }); }
  catch (error) { return apiError(error); }
}
