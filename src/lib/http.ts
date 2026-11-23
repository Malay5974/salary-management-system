import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function apiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 400 });
  if (error instanceof Error && ['Employee missing', 'Date before employee start', 'Salary unchanged'].includes(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && /Duplicate entry/i.test(error.message)) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  console.error(error);
  return NextResponse.json({ error: 'Unable to complete request' }, { status: 500 });
}
