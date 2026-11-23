import { createHmac, scryptSync } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSession, verifyCredentials, verifySession } from './session';

const keys = ['HR_EMAIL','HR_PASSWORD_SALT','HR_PASSWORD_HASH','SESSION_SECRET'] as const;
const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
beforeAll(() => {
  process.env.HR_EMAIL = 'hr@acme.test';
  process.env.HR_PASSWORD_SALT = 'test-salt';
  process.env.HR_PASSWORD_HASH = scryptSync('correct-password', 'test-salt', 32).toString('hex');
  process.env.SESSION_SECRET = 'test-session-secret-with-more-than-32-characters';
});
afterAll(() => { for (const key of keys) { if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key]; } });

describe('HR demo session', () => {
  it('accepts only the configured credentials', () => {
    expect(verifyCredentials('HR@ACME.TEST', 'correct-password')).toBe(true);
    expect(verifyCredentials('hr@acme.test', 'wrong-password')).toBe(false);
    expect(verifyCredentials('other@acme.test', 'correct-password')).toBe(false);
  });
  it('rejects changed and expired cookies', () => {
    const now = Date.UTC(2026, 0, 1);
    const token = createSession(now);
    expect(verifySession(token, now + 1000)).toBe(true);
    expect(verifySession(`${token}x`, now + 1000)).toBe(false);
    expect(verifySession(token, now + 9 * 60 * 60 * 1000)).toBe(false);
  });
  it('rejects a correctly signed cookie for another email', () => {
    const payload = Buffer.from(JSON.stringify({ email: 'other@acme.test', expires: Date.now() + 60_000 })).toString('base64url');
    const signature = createHmac('sha256', process.env.SESSION_SECRET!).update(payload).digest('hex');
    expect(verifySession(`${payload}.${signature}`)).toBe(false);
  });
});
