'use client';
import { useEffect, useState } from 'react';
import type { User } from '@/server/auth/session';
type HR = {id:string;name:string;email:string;active:number;mustChangePassword:number};
export default function Account({user}:{user:User}) {
  const [users,setUsers]=useState<HR[]>([]);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  async function load() { const r=await fetch('/api/users'); if(r.ok)setUsers(await r.json()); }
  useEffect(()=>{if(user.role==='admin' && !user.mustChangePassword)void load();},[user.role,user.mustChangePassword]);
  async function submit(url:string,method:string,body:unknown) {
    setBusy(true);setMessage('');
    try {const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error ?? 'Request failed');return data;}
    catch(e){setMessage((e as Error).message);return null;} finally {setBusy(false);}
  }
  return <main className="login-page"><section className="login-card" style={{maxWidth:900,width:'100%'}}><h1>Account</h1><p>{user.name} · {user.email} · {user.role}</p>{!user.mustChangePassword && <a href="/">Back to workspace</a>}
    <h2>Change password</h2>{Boolean(user.mustChangePassword)&&<p>Change your initial password before accessing the workspace.</p>}
    <form className="form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(f.get('password')!==f.get('confirm')){setMessage('Passwords do not match');return;}if(await submit('/api/auth/password','POST',{currentPassword:f.get('current'),password:f.get('password')}))window.location.href='/';}}>
      <label>Current password<input name="current" type="password" autoComplete="current-password" required maxLength={200}/></label>
      <label>New password (at least 12 characters)<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={200} required/></label>
      <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" required/></label><button disabled={busy}>Change password and sign in again</button>
    </form>
    {user.role==='admin'&&!user.mustChangePassword&&<><h2>Manage HR users</h2><form className="form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const data=await submit('/api/users','POST',{name:f.get('name'),email:f.get('email')});if(data){setMessage(`Temporary password: ${data.temporaryPassword} — share privately with this HR user.`);void load();}}}><label>Name<input name="name" required maxLength={80}/></label><label>Email<input name="email" type="email" required/></label><button disabled={busy}>Add HR user</button></form>
    {users.map(hr=><div key={hr.id} style={{padding:12,borderBottom:'1px solid #ddd'}}><strong>{hr.name}</strong> · {hr.email} · {hr.active?'Active':'Disabled'} {hr.mustChangePassword?'· Password change required':''}<div>{(['reset',hr.active?'disable':'enable'] as const).map(action=><button key={action} disabled={busy} onClick={async()=>{const data=await submit('/api/users','PATCH',{id:hr.id,action});if(data){setMessage(data.temporaryPassword?`Temporary password for ${hr.email}: ${data.temporaryPassword}`:'User updated');void load();}}}>{action==='reset'?'Reset password':action==='disable'?'Disable':'Enable'}</button>)}</div></div>)}</>}
    {message&&<p role="status" style={{overflowWrap:'anywhere'}}>{message}</p>}<button onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});window.location.href='/';}}>Sign out</button>
  </section></main>;
}
