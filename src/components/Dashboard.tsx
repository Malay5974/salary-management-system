'use client';

import { useCallback, useEffect, useState } from 'react';

type Employee = { id: number; firstName: string; lastName: string; email: string; department: string; country: string; currency: string; startDate: string; salaryMinor: number; salaryEffectiveDate: string; history?: Change[] };
type Change = { id: number; oldSalaryMinor: number; newSalaryMinor: number; effectiveDate: string; reason: string; changedAt: string };
type List = { items: Employee[]; total: number; page: number; pageSize: number };
type Group = { count: number; medianMinor: number; minMinor: number; maxMinor: number; payrollMinor?: number; currency: string; country?: string; department?: string };
type Summary = { employeeCount: number; byCurrency: Group[]; byCountry: Group[]; byDepartment: Group[]; byBand: (Group & { band: string })[] };

const money = (minor: number, currency: string) => new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
const departments = ['Engineering','Product','Design','Sales','Marketing','Finance','People','Operations'];
const countries = ['US','IN','GB','DE','CA'];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export default function Dashboard() {
  const [view, setView] = useState<'overview' | 'employees'>('overview');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [department, setDepartment] = useState('');
  const [summaryCountry, setSummaryCountry] = useState('');
  const [summaryDepartment, setSummaryDepartment] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => { try {
    const params = new URLSearchParams({ country: summaryCountry, department: summaryDepartment });
    setSummary(await api<Summary>(`/api/summary?${params}`));
  } catch (e) { setError((e as Error).message); } }, [summaryCountry, summaryDepartment]);
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, country, department, sort, page: String(page), pageSize: '25' });
      setList(await api<List>(`/api/employees?${params}`)); setError('');
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [q, country, department, sort, page]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { if (view === 'employees') void loadList(); }, [view, loadList]);
  const openEmployee = async (id: number) => { try { setSelected(await api<Employee>(`/api/employees/${id}`)); } catch (e) { setError((e as Error).message); } };
  const refresh = () => { void loadList(); void loadSummary(); };

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">◈</span><span>ACME<span className="brand-light"> / People</span></span></div>
      <div className="nav-label">WORKSPACE</div>
      <button className={`nav-item ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}><span>▦</span> Overview</button>
      <button className={`nav-item ${view === 'employees' ? 'active' : ''}`} onClick={() => setView('employees')}><span>♙</span> Employees</button>
      <div className="sidebar-bottom"><div className="avatar">M</div><div><strong>HR Manager</strong><small>Salary workspace</small></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><span>People / <strong>{view === 'overview' ? 'Overview' : 'Employees'}</strong></span><span className="topbar-right">Synthetic assessment data <span className="status-dot" /></span></header>
      <div className="content">
        {error && <div className="alert" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
        {view === 'overview' ? <>
          <div className="page-heading"><div><div className="eyebrow">SALARY INTELLIGENCE</div><h1>People at a glance</h1><p>Understand how your team is paid, across countries and departments.</p></div><button className="primary" onClick={() => { setView('employees'); setShowAdd(true); }}>+ Add employee</button></div>
          <div className="insight-filters"><span>View pay for</span><select aria-label="Summary country" value={summaryCountry} onChange={e => setSummaryCountry(e.target.value)}><option value="">All countries</option>{countries.map(code => <option key={code}>{code}</option>)}</select><select aria-label="Summary department" value={summaryDepartment} onChange={e => setSummaryDepartment(e.target.value)}><option value="">All departments</option>{departments.map(name => <option key={name}>{name}</option>)}</select>{(summaryCountry || summaryDepartment) && <button onClick={() => { setSummaryCountry(''); setSummaryDepartment(''); }}>Clear filters</button>}</div>
          <div className="hero-card"><div><span className="hero-label">TOTAL EMPLOYEES</span><div className="hero-number">{summary ? summary.employeeCount.toLocaleString() : '—'}</div><p>Active salary records in your organization</p></div><div className="hero-art" aria-hidden="true"><span /><span /><span /><span /><span /></div></div>
          <div className="section-title"><div><h2>Payroll by currency</h2><p>Totals are kept separate to avoid misleading conversion.</p></div></div>
          <div className="metric-grid">{summary?.byCurrency.map(group => <div className="metric-card" key={group.currency}><span className="currency-badge">{group.currency}</span><div className="metric-value">{money(group.payrollMinor || 0, group.currency)}</div><div className="metric-meta">{group.count.toLocaleString()} employees <span>·</span> Median {money(group.medianMinor, group.currency)}</div><div className="metric-range">Range {money(group.minMinor, group.currency)}–{money(group.maxMinor, group.currency)}</div></div>) || <div className="empty">Loading payroll summary…</div>}</div>
          <div className="two-col"><SummaryTable title="By country" label="Country" groups={summary?.byCountry || []} keyName="country" /><SummaryTable title="By department" label="Department" groups={summary?.byDepartment || []} keyName="department" /></div>
          <div className="summary-card bands"><h3>Salary distribution</h3><p>Annual salary bands use each employee's own currency.</p><div className="band-grid">{summary?.byCurrency.map(currency => <div className="band-column" key={currency.currency}><strong>{currency.currency}</strong>{['Under 50k','50k-100k','100k-150k','150k+'].map(band => { const count = summary.byBand.find(item => item.currency === currency.currency && item.band === band)?.count || 0; return <div className="band-row" key={band}><span>{band}</span><div><i style={{ width: `${Math.max(2, count / currency.count * 100)}%` }} /></div><b>{count}</b></div>; })}</div>)}</div></div>
        </> : <>
          <div className="page-heading"><div><div className="eyebrow">PEOPLE DIRECTORY</div><h1>Employees</h1><p>Search and manage salary records for your organization.</p></div><button className="primary" onClick={() => setShowAdd(true)}>+ Add employee</button></div>
          <div className="table-card"><div className="filters"><input aria-label="Search employees" placeholder="Search name or email…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /><select aria-label="Country" value={country} onChange={e => { setCountry(e.target.value); setPage(1); }}><option value="">All countries</option>{countries.map(c => <option key={c}>{c}</option>)}</select><select aria-label="Department" value={department} onChange={e => { setDepartment(e.target.value); setPage(1); }}><option value="">All departments</option>{departments.map(d => <option key={d}>{d}</option>)}</select><select aria-label="Sort" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="name">Name A–Z</option><option value="salary_desc">Highest salary</option><option value="salary_asc">Lowest salary</option></select></div>
            <div className="table-scroll"><table><thead><tr><th>EMPLOYEE</th><th>DEPARTMENT</th><th>COUNTRY</th><th>CURRENT SALARY</th><th>EFFECTIVE</th><th></th></tr></thead><tbody>{list?.items.map(person => <tr key={person.id} onClick={() => void openEmployee(person.id)}><td><div className="person"><div className="person-avatar">{person.firstName[0]}{person.lastName[0]}</div><div><strong>{person.firstName} {person.lastName}</strong><small>{person.email}</small></div></div></td><td>{person.department}</td><td>{person.country}</td><td className="salary">{money(person.salaryMinor, person.currency)}</td><td>{person.salaryEffectiveDate}</td><td className="arrow">→</td></tr>)}</tbody></table>{loading && <div className="empty">Loading employees…</div>}{!loading && list?.items.length === 0 && <div className="empty">No employees match these filters.</div>}</div>
            <div className="pagination"><span>{list ? `${list.total.toLocaleString()} employees · Page ${list.page} of ${Math.max(1, Math.ceil(list.total / list.pageSize))}` : 'Loading…'}</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button disabled={!list || page * list.pageSize >= list.total} onClick={() => setPage(page + 1)}>Next</button></div></div>
          </div>
        </>}
      </div>
    </main>
    {selected && <EmployeePanel employee={selected} onClose={() => setSelected(null)} onUpdated={employee => { setSelected(employee); refresh(); }} />}
    {showAdd && <AddEmployee onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); refresh(); }} />}
  </div>;
}

function SummaryTable({ title, label, groups, keyName }: { title: string; label: string; groups: Group[]; keyName: 'country' | 'department' }) {
  const [currency, setCurrency] = useState('USD');
  const visible = keyName === 'department' ? groups.filter(g => g.currency === currency) : groups;
  return <div className="summary-card"><div className="summary-head"><h3>{title}</h3>{keyName === 'department' && <select aria-label="Department currency" value={currency} onChange={e => setCurrency(e.target.value)}>{[...new Set(groups.map(g => g.currency))].map(code => <option key={code}>{code}</option>)}</select>}</div><table><thead><tr><th>{label.toUpperCase()}</th><th>PEOPLE</th><th>MEDIAN SALARY</th></tr></thead><tbody>{visible.map((g, index) => <tr key={`${g[keyName]}-${g.currency}-${index}`}><td><strong>{g[keyName]}</strong><small>{g.currency}</small></td><td>{g.count.toLocaleString()}</td><td>{money(g.medianMinor, g.currency)}</td></tr>)}</tbody></table></div>;
}

function EmployeePanel({ employee, onClose, onUpdated }: { employee: Employee; onClose: () => void; onUpdated: (employee: Employee) => void }) {
  const [editing, setEditing] = useState(false);
  const [salary, setSalary] = useState(String(employee.salaryMinor / 100));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); setError(''); try {
    const amount = Number(salary);
    if (!Number.isFinite(amount) || !Number.isInteger(amount * 100)) throw new Error('Enter a valid amount with at most two decimals');
    const updated = await api<Employee>(`/api/employees/${employee.id}/salary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ salaryMinor: Math.round(amount * 100), effectiveDate: date, reason }) });
    onUpdated(updated); setEditing(false); setReason('');
  } catch (e) { setError((e as Error).message); } finally { setSaving(false); } };
  return <div className="overlay" onMouseDown={onClose}><section className="panel" onMouseDown={e => e.stopPropagation()} aria-label="Employee details"><div className="panel-head"><span>EMPLOYEE DETAILS</span><button onClick={onClose} aria-label="Close">×</button></div><div className="panel-body"><div className="detail-avatar">{employee.firstName[0]}{employee.lastName[0]}</div><h2>{employee.firstName} {employee.lastName}</h2><p>{employee.email}</p><div className="detail-tags"><span>{employee.department}</span><span>{employee.country}</span><span>Started {employee.startDate}</span></div><div className="current-pay"><small>CURRENT ANNUAL SALARY</small><strong>{money(employee.salaryMinor, employee.currency)}</strong><span>Effective {employee.salaryEffectiveDate}</span></div><button className="primary wide" onClick={() => setEditing(!editing)}>{editing ? 'Cancel change' : 'Change salary'}</button>{editing && <form className="form" onSubmit={save}><label>New annual salary ({employee.currency})<input type="number" min="0" step="0.01" value={salary} onChange={e => setSalary(e.target.value)} required /></label><label>Effective date<input type="date" min={employee.startDate} value={date} onChange={e => setDate(e.target.value)} required /></label><label>Reason<textarea minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Annual review" required /></label>{error && <div className="form-error">{error}</div>}<button className="primary wide" disabled={saving}>{saving ? 'Saving…' : 'Save salary change'}</button></form>}<div className="history"><h3>Salary history</h3>{employee.history?.length ? employee.history.map(change => <div className="history-item" key={change.id}><div><strong>{money(change.oldSalaryMinor, employee.currency)} → {money(change.newSalaryMinor, employee.currency)}</strong><small>{change.reason}</small></div><span>{change.effectiveDate}</span></div>) : <p>No changes recorded yet.</p>}</div></div></section></div>;
}

function AddEmployee({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [country, setCountry] = useState('US');
  const currencyByCountry: Record<string, string> = { US: 'USD', IN: 'INR', GB: 'GBP', DE: 'EUR', CA: 'CAD' };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(''); const data = new FormData(event.currentTarget); try {
    const amount = Number(data.get('salary'));
    if (!Number.isFinite(amount) || !Number.isInteger(amount * 100)) throw new Error('Enter a valid salary with at most two decimals');
    await api('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName: data.get('firstName'), lastName: data.get('lastName'), email: data.get('email'), department: data.get('department'), country: data.get('country'), currency: data.get('currency'), startDate: data.get('startDate'), salaryMinor: Math.round(amount * 100), salaryEffectiveDate: data.get('startDate') }) }); onAdded();
  } catch (e) { setError((e as Error).message); } finally { setSaving(false); } };
  return <div className="overlay" onMouseDown={onClose}><section className="panel" onMouseDown={e => e.stopPropagation()} aria-label="Add employee"><div className="panel-head"><span>NEW EMPLOYEE</span><button onClick={onClose} aria-label="Close">×</button></div><div className="panel-body"><h2>Add employee</h2><p>Create a salary record for a new team member.</p><form className="form" onSubmit={submit}><div className="form-row"><label>First name<input name="firstName" required maxLength={80} /></label><label>Last name<input name="lastName" required maxLength={80} /></label></div><label>Email<input name="email" type="email" required /></label><label>Department<select name="department" required>{departments.map(d => <option key={d}>{d}</option>)}</select></label><div className="form-row"><label>Country<select name="country" value={country} onChange={e => setCountry(e.target.value)} required>{countries.map(c => <option key={c}>{c}</option>)}</select></label><label>Currency<input name="currency" value={currencyByCountry[country]} readOnly /></label></div><label>Start date<input name="startDate" type="date" required /></label><label>Annual salary<input name="salary" type="number" min="0" step="0.01" required /></label>{error && <div className="form-error">{error}</div>}<button className="primary wide" disabled={saving}>{saving ? 'Adding…' : 'Add employee'}</button></form></div></section></div>;
}
