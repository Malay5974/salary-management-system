import { afterEach, describe, expect, it, vi } from 'vitest';
const query=vi.hoisted(()=>vi.fn());
vi.mock('../db/connection',()=>({getDatabase:()=>({query})}));
import { createSession, hashPassword, matchesPassword, verifySession } from './session';
const user={id:'1',name:'HR',email:'hr@test.example',role:'hr' as const,mustChangePassword:0,active:1,sessionVersion:1};
afterEach(()=>vi.resetAllMocks());
describe('Database authentication',()=>{
 it('uses independent salted password hashes',()=>{const a=hashPassword('long-password-123');const b=hashPassword('long-password-123');expect(a.hash).not.toBe(b.hash);expect(matchesPassword('long-password-123',a.salt,a.hash)).toBe(true);expect(matchesPassword('wrong',a.salt,a.hash)).toBe(false);});
 it('rejects tampered and expired tokens',async()=>{process.env.SESSION_SECRET='a'.repeat(40);const token=createSession(user,1000);expect(await verifySession(token+'x',2000)).toBeNull();expect(await verifySession(token,1000+9*3600000)).toBeNull();expect(query).not.toHaveBeenCalled();});
 it('rejects disabled accounts and revoked sessions',async()=>{process.env.SESSION_SECRET='a'.repeat(40);const token=createSession(user);query.mockResolvedValueOnce([user]).mockResolvedValueOnce([{...user,active:0}]).mockResolvedValueOnce([{...user,sessionVersion:2}]);expect(await verifySession(token)).toEqual(user);expect(await verifySession(token)).toBeNull();expect(await verifySession(token)).toBeNull();});
});
