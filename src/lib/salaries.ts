import { Database, ensureSchema, getDatabase } from './db';
import { employeeInput, listInput, salaryChangeInput } from './validation';
import { z } from 'zod';

const asNumber = (value: unknown) => Number(value);
const employeeSelect = `id, first_name AS firstName, last_name AS lastName, email,
  department, country, currency, start_date AS startDate,
  salary_minor AS salaryMinor, salary_effective_date AS salaryEffectiveDate`;

function mapEmployee(row: Record<string, unknown>): Record<string, unknown> & { id: number; salaryMinor: number } {
  return { ...row, id: asNumber(row.id), salaryMinor: asNumber(row.salaryMinor) };
}

export async function listEmployees(input: z.input<typeof listInput>, db: Database = getDatabase()) {
  await ensureSchema(db);
  const args = listInput.parse(input);
  const where = `WHERE (? = '' OR LOCATE(LOWER(?), LOWER(CONCAT(first_name, ' ', last_name, ' ', email))) > 0)
    AND (? = '' OR country = ?) AND (? = '' OR department = ?)`;
  const filters = [args.q, args.q, args.country.toUpperCase(), args.country.toUpperCase(), args.department, args.department];
  const order = { name: 'last_name ASC, first_name ASC, id ASC', salary_asc: 'salary_minor ASC, id ASC', salary_desc: 'salary_minor DESC, id ASC' }[args.sort];
  const [rows, count] = await Promise.all([
    db.query(`SELECT ${employeeSelect} FROM employees ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...filters, args.pageSize, (args.page - 1) * args.pageSize]),
    db.query<{ count: number }>(`SELECT COUNT(*) AS count FROM employees ${where}`, filters)
  ]);
  return { items: rows.map(mapEmployee), total: asNumber(count[0].count), page: args.page, pageSize: args.pageSize };
}

export async function getEmployee(id: number, db: Database = getDatabase()) {
  await ensureSchema(db);
  const rows = await db.query(`SELECT ${employeeSelect} FROM employees WHERE id = ?`, [id]);
  if (!rows.length) return null;
  const history = await db.query(`SELECT id, old_salary_minor AS oldSalaryMinor, new_salary_minor AS newSalaryMinor,
    effective_date AS effectiveDate, reason, changed_at AS changedAt
    FROM salary_changes WHERE employee_id = ? ORDER BY changed_at DESC, id DESC LIMIT 100`, [id]);
  return { ...mapEmployee(rows[0]), history: history.map(row => ({ ...row, id: asNumber(row.id), oldSalaryMinor: asNumber(row.oldSalaryMinor), newSalaryMinor: asNumber(row.newSalaryMinor) })) };
}

export async function createEmployee(input: z.input<typeof employeeInput>, db: Database = getDatabase()) {
  await ensureSchema(db);
  const value = employeeInput.parse(input);
  const result = await db.execute(`INSERT INTO employees
    (first_name, last_name, email, department, country, currency, start_date, salary_minor, salary_effective_date)
    VALUES (?,?,?,?,?,?,?,?,?)`,
    [value.firstName, value.lastName, value.email, value.department, value.country, value.currency, value.startDate, value.salaryMinor, value.salaryEffectiveDate]);
  return getEmployee(result.insertId, db);
}

export async function changeSalary(id: number, input: z.input<typeof salaryChangeInput>, db: Database = getDatabase()) {
  await ensureSchema(db);
  const value = salaryChangeInput.parse(input);
  return db.transaction(async tx => {
    const previous = await tx.query<{ salaryMinor: string; startDate: string }>(
      'SELECT salary_minor AS salaryMinor, start_date AS startDate FROM employees WHERE id = ? FOR UPDATE', [id]);
    if (!previous.length) throw new Error('Employee missing');
    if (value.effectiveDate < previous[0].startDate) throw new Error('Date before employee start');
    if (value.salaryMinor === asNumber(previous[0].salaryMinor)) throw new Error('Salary unchanged');
    await tx.execute('UPDATE employees SET salary_minor = ?, salary_effective_date = ? WHERE id = ?', [value.salaryMinor, value.effectiveDate, id]);
    await tx.execute(`INSERT INTO salary_changes (employee_id, old_salary_minor, new_salary_minor, effective_date, reason)
      VALUES (?,?,?,?,?)`, [id, previous[0].salaryMinor, value.salaryMinor, value.effectiveDate, value.reason]);
    return getEmployee(id, tx);
  });
}

type SalaryRow = { country: string; department: string; currency: string; salaryMinor: string };
type Group = { count: number; medianMinor: number; payrollMinor?: number; currency: string; country?: string; department?: string; band?: string };
function median(values: number[]) {
  const ordered = values.sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return Math.round(ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2);
}

export async function getSummary(db: Database = getDatabase()) {
  await ensureSchema(db);
  // At the assessment scale (10,000 records), one bounded server-side scan is simpler
  // and portable across MySQL and Hostinger MariaDB. No salary rows go to the browser.
  const rows = await db.query<SalaryRow>('SELECT country, department, currency, salary_minor AS salaryMinor FROM employees');
  return summarizeRows(rows);
}

export function summarizeRows(rows: SalaryRow[]) {
  const currencies = new Map<string, number[]>();
  const countries = new Map<string, number[]>();
  const departments = new Map<string, number[]>();
  const bands = new Map<string, number>();
  for (const row of rows) {
    const amount = asNumber(row.salaryMinor);
    const add = (map: Map<string, number[]>, key: string) => {
      const values = map.get(key) ?? []; values.push(amount); map.set(key, values);
    };
    add(currencies, row.currency);
    add(countries, `${row.country}|${row.currency}`);
    add(departments, `${row.department}|${row.currency}`);
    const band = amount < 5_000_000 ? 'Under 50k' : amount < 10_000_000 ? '50k-100k' : amount < 15_000_000 ? '100k-150k' : '150k+';
    const bandKey = `${row.currency}|${band}`;
    bands.set(bandKey, (bands.get(bandKey) ?? 0) + 1);
  }
  const grouped = (map: Map<string, number[]>, label?: 'country' | 'department'): Group[] =>
    [...map].map(([key, values]) => {
      const [name, currency] = label ? key.split('|') : ['', key];
      return { ...(label ? { [label]: name } : {}), currency, count: values.length, medianMinor: median(values), ...(!label ? { payrollMinor: values.reduce((a, b) => a + b, 0) } : {}) };
    });
  return {
    employeeCount: rows.length,
    byCurrency: grouped(currencies).sort((a, b) => a.currency.localeCompare(b.currency)),
    byCountry: grouped(countries, 'country').sort((a, b) => b.count - a.count || (a.country ?? '').localeCompare(b.country ?? '')),
    byDepartment: grouped(departments, 'department').sort((a, b) => (a.department ?? '').localeCompare(b.department ?? '') || a.currency.localeCompare(b.currency)),
    byBand: [...bands].map(([key, count]) => { const [currency, band] = key.split('|'); return { currency, band, count }; })
  };
}
