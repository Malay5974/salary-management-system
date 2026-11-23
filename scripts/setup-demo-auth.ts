import { randomBytes, scryptSync } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';

const email = 'hr@acme.test';
const password = randomBytes(18).toString('base64url');
const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 32).toString('hex');
const secret = randomBytes(32).toString('hex');
const filename = '.env.local';
let existing = '';
try { existing = readFileSync(filename, 'utf8'); } catch { /* First local setup. */ }
const lines = existing.split(/\r?\n/).filter(line => !/^(HR_EMAIL|HR_PASSWORD_SALT|HR_PASSWORD_HASH|SESSION_SECRET)=/.test(line));
const updated = `${lines.join('\n').trimEnd()}\nHR_EMAIL=${email}\nHR_PASSWORD_SALT=${salt}\nHR_PASSWORD_HASH=${hash}\nSESSION_SECRET=${secret}\n`;
writeFileSync(filename, updated, { mode: 0o600 });
chmodSync(filename, 0o600);
mkdirSync('.data', { recursive: true });
writeFileSync('.data/demo-login.txt', `Email: ${email}\nPassword: ${password}\n`, { mode: 0o600 });
chmodSync('.data/demo-login.txt', 0o600);
console.log('Demo HR login configured. Credentials saved to .data/demo-login.txt (ignored by Git).');
