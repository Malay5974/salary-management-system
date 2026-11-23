import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/http';
import { cookieOptions, createSession, SESSION_COOKIE, verifyCredentials } from '@/server/auth/session';

export const runtime = 'nodejs';
const input = z.object({ email: z.email(), password: z.string().min(1).max(200) });
export async function POST(request: Request) {
  try {
    const value = input.parse(await request.json());
    if (!verifyCredentials(value.email, value.password)) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    const response = NextResponse.json({ signedIn: true });
    response.cookies.set(SESSION_COOKIE, createSession(), cookieOptions());
    return response;
  } catch (error) { return apiError(error); }
}
