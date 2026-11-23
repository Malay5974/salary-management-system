import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { hashPassword } from '../src/server/auth/session';
import { getDatabase, closeDatabase } from '../src/server/db/connection';
import { runMigrations } from '../src/server/db/migrations';
const db=getDatabase();
try {
 await runMigrations(db);
 const credentials:string[]=[];
 const accounts=[{name:'Administrator',email:'admin@acme.test',role:'admin'},...Array.from({length:20},(_,i)=>({name:`HR ${i+1}`,email:`hr${i+1}@acme.test`,role:'hr'}))];
 for(const account of accounts){
  const existing=await db.query('SELECT id FROM users WHERE email=? OR (role = ? AND ? = ?)',[account.email,'admin',account.role,'admin']);
  if(existing.length)continue;
  const temporary=randomBytes(15).toString('base64url');const password=hashPassword(temporary);
  await db.execute('INSERT INTO users (name,email,role,password_salt,password_hash) VALUES (?,?,?,?,?)',[account.name,account.email,account.role,password.salt,password.hash]);
  credentials.push(`${account.email}: ${temporary}`);
 }
 if(credentials.length){await mkdir('.data',{recursive:true});await writeFile('.data/seed-user-logins.txt',credentials.join('\n')+'\n',{mode:0o600});}
 console.log(`Created ${credentials.length} accounts. New credentials are in .data/seed-user-logins.txt; existing accounts were preserved.`);
}finally{await closeDatabase();}
