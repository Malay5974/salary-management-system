import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export const SESSION_COOKIE = 'salary_session';
const SESSION_SECONDS = 8 * 60 * 60;

function config() {
  const email = process.env.HR_EMAIL?.toLowerCase();
  const salt = process.env.HR_PASSWORD_SALT;
  const hash = process.env.HR_PASSWORD_HASH;
  const secret = process.env.SESSION_SECRET;
  if (!email || !salt || !hash || !secret || secret.length < 32) throw new Error('HR login is not configured');
  return { email, salt, hash, secret };
}
function equalHex(left: string, right: string) {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex'); const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
export function verifyCredentials(email: string, password: string) {
  const values = config();
  const candidate = scryptSync(password, values.salt, 32).toString('hex');
  return email.trim().toLowerCase() === values.email && equalHex(candidate, values.hash);
}
export function createSession(now = Date.now()) {
  const values = config();
  const payload = Buffer.from(JSON.stringify({ email: values.email, expires: now + SESSION_SECONDS * 1000 })).toString('base64url');
  const signature = createHmac('sha256', values.secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}
export function verifySession(token: string | undefined, now = Date.now()) {
  if (!token) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  const values = config();
  const expected = createHmac('sha256', values.secret).update(payload).digest('hex');
  if (!equalHex(signature, expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { email?: string; expires?: number };
    return value.email === values.email && typeof value.expires === 'number' && value.expires > now;
  } catch { return false; }
}
export function cookieOptions() {
  return { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' && Boolean(process.env.VERCEL), path: '/', maxAge: SESSION_SECONDS };
}
export function requireAuth(request: Request) {
  const cookies = request.headers.get('cookie') ?? '';
  const token = cookies.split(';').map(item => item.trim()).find(item => item.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (verifySession(token)) return null;
  return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
}
