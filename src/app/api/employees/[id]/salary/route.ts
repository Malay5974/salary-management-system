import { NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { changeSalary } from '@/server/employees/service';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 });
    return NextResponse.json(await changeSalary(id, await request.json()));
  } catch (error) { return apiError(error); }
}
