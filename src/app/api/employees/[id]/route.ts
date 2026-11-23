import { NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { getEmployee } from '@/lib/salaries';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 });
    const employee = await getEmployee(id);
    return employee ? NextResponse.json(employee) : NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  } catch (error) { return apiError(error); }
}
