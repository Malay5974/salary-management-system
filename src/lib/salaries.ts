import { Database, ensureSchema, getDatabase } from './db';
import { employeeInput, listInput, salaryChangeInput } from './validation';
import { z } from 'zod';

const number = (value: unknown) => Number(value);
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
const employeeSelect = `id, first_name AS "firstName", last_name AS "lastName", email,
  department, country, currency, start_date::text AS "startDate",
  salary_minor AS "salaryMinor", salary_effective_date::text AS "salaryEffectiveDate"`;

function mapEmployee(row: Record<string, unknown>): Record<string, unknown> & { id: number; salaryMinor: number } {
  return { ...row, id: number(row.id), salaryMinor: number(row.salaryMinor) };
}

export async function listEmployees(input: z.input<typeof listInput>, db: Database = getDatabase()) {
  await ensureSchema(db);
  const args = listInput.parse(input);
  const q = `%${escapeLike(args.q)}%`;
  const where = `WHERE ($1 = '%%' OR first_name ILIKE $1 ESCAPE '\\' OR last_name ILIKE $1 ESCAPE '\\' OR email ILIKE $1 ESCAPE '\\')
    AND ($2 = '' OR country = $2) AND ($3 = '' OR department = $3)`;
  const filters = [q, args.country.toUpperCase(), args.department];
  const order = { name: 'last_name ASC, first_name ASC, id ASC', salary_asc: 'salary_minor ASC, id ASC', salary_desc: 'salary_minor DESC, id ASC' }[args.sort];
  const [rows, count] = await Promise.all([
    db.query(`SELECT ${employeeSelect} FROM employees ${where} ORDER BY ${order} LIMIT $4 OFFSET $5`, [...filters, args.pageSize, (args.page - 1) * args.pageSize]),
    db.query<{ count: string }>(`SELECT count(*)::text AS count FROM employees ${where}`, filters)
  ]);
  return { items: rows.map(mapEmployee), total: number(count[0].count), page: args.page, pageSize: args.pageSize };
}

export async function getEmployee(id: number, db: Database = getDatabase()) {
  await ensureSchema(db);
  const rows = await db.query(`SELECT ${employeeSelect} FROM employees WHERE id = $1`, [id]);
  if (!rows.length) return null;
  const history = await db.query(`SELECT id, old_salary_minor AS "oldSalaryMinor", new_salary_minor AS "newSalaryMinor",
    effective_date::text AS "effectiveDate", reason, changed_at::text AS "changedAt"
    FROM salary_changes WHERE employee_id = $1 ORDER BY changed_at DESC, id DESC LIMIT 100`, [id]);
  return { ...mapEmployee(rows[0]), history: history.map(row => ({ ...row, id: number(row.id), oldSalaryMinor: number(row.oldSalaryMinor), newSalaryMinor: number(row.newSalaryMinor) })) };
}

export async function createEmployee(input: z.input<typeof employeeInput>, db: Database = getDatabase()) {
  await ensureSchema(db);
  const value = employeeInput.parse(input);
  const rows = await db.query(`INSERT INTO employees
    (first_name, last_name, email, department, country, currency, start_date, salary_minor, salary_effective_date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${employeeSelect}`,
    [value.firstName, value.lastName, value.email, value.department, value.country, value.currency, value.startDate, value.salaryMinor, value.salaryEffectiveDate]);
  return mapEmployee(rows[0]);
}

export async function changeSalary(id: number, input: z.input<typeof salaryChangeInput>, db: Database = getDatabase()) {
  await ensureSchema(db);
  const value = salaryChangeInput.parse(input);
  const rows = await db.query(`WITH previous AS MATERIALIZED (
    SELECT id, salary_minor, start_date FROM employees WHERE id = $1 FOR UPDATE
  ), updated AS (
    UPDATE employees e SET salary_minor = $2, salary_effective_date = $3
    FROM previous p WHERE e.id = p.id AND p.start_date <= $3 AND p.salary_minor <> $2
    RETURNING e.id, p.salary_minor AS old_salary_minor
  )
  INSERT INTO salary_changes (employee_id, old_salary_minor, new_salary_minor, effective_date, reason)
  SELECT id, old_salary_minor, $2, $3, $4 FROM updated
  RETURNING id`, [id, value.salaryMinor, value.effectiveDate, value.reason]);
  if (!rows.length) throw new Error('Employee missing, date before start, or salary unchanged');
  return getEmployee(id, db);
}

export async function getSummary(db: Database = getDatabase()) {
  await ensureSchema(db);
  const [total, byCurrency, byCountry, byDepartment, byBand] = await Promise.all([
    db.query<{ count: string }>('SELECT count(*)::text AS count FROM employees'),
    db.query(`SELECT currency, count(*)::text AS count, sum(salary_minor)::text AS "payrollMinor",
      percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_minor)::bigint::text AS "medianMinor"
      FROM employees GROUP BY currency ORDER BY currency`),
    db.query(`SELECT country, currency, count(*)::text AS count,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_minor)::bigint::text AS "medianMinor"
      FROM employees GROUP BY country, currency ORDER BY count(*) DESC, country LIMIT 30`),
    db.query(`SELECT department, currency, count(*)::text AS count,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY salary_minor)::bigint::text AS "medianMinor"
      FROM employees GROUP BY department, currency ORDER BY department, currency LIMIT 50`),
    db.query(`SELECT currency, CASE
      WHEN salary_minor < 5000000 THEN 'Under 50k'
      WHEN salary_minor < 10000000 THEN '50k-100k'
      WHEN salary_minor < 15000000 THEN '100k-150k'
      ELSE '150k+' END AS band, count(*)::text AS count
      FROM employees GROUP BY currency, band ORDER BY currency, band`)
  ]);
  const numeric = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).map(([key, value]) =>
    ['count', 'payrollMinor', 'medianMinor'].includes(key) ? [key, value === null ? null : number(value)] : [key, value]));
  return { employeeCount: number(total[0].count), byCurrency: byCurrency.map(numeric), byCountry: byCountry.map(numeric), byDepartment: byDepartment.map(numeric), byBand: byBand.map(numeric) };
}
