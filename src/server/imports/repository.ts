import type { Database } from '../db/connection';
import type { ImportEmployee } from './parser';

export type ExistingEmployee = {
  id: string; email: string; firstName: string; lastName: string; department: string;
  country: string; currency: string; startDate: string; salaryMinor: string; salaryEffectiveDate: string;
};
export async function findExisting(db: Database, emails: string[], lock = false) {
  const results: ExistingEmployee[] = [];
  for (let index = 0; index < emails.length; index += 300) {
    const batch = emails.slice(index, index + 300);
    results.push(...await db.query<ExistingEmployee>(`SELECT id, email, first_name AS firstName,
      last_name AS lastName, department, country, currency, start_date AS startDate,
      salary_minor AS salaryMinor, salary_effective_date AS salaryEffectiveDate
      FROM employees WHERE email IN (${batch.map(() => '?').join(',')}) ORDER BY email ${lock ? 'FOR UPDATE' : ''}`, batch));
  }
  return new Map(results.map(row => [row.email.toLowerCase(), row]));
}

export async function applyStagedImport(db: Database, rows: ImportEmployee[]) {
  await db.execute('DROP TEMPORARY TABLE IF EXISTS salary_import_stage');
  await db.execute(`CREATE TEMPORARY TABLE salary_import_stage (
    email VARCHAR(254) NOT NULL PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    department VARCHAR(80) NOT NULL,
    country CHAR(2) NOT NULL,
    currency CHAR(3) NOT NULL,
    start_date DATE NOT NULL,
    salary_minor BIGINT UNSIGNED NOT NULL,
    salary_effective_date DATE NOT NULL
  ) ENGINE=InnoDB`);
  try {
    for (let index = 0; index < rows.length; index += 200) {
      const batch = rows.slice(index, index + 200);
      const values = batch.flatMap(row => [row.email, row.firstName, row.lastName, row.department,
        row.country, row.currency, row.startDate, row.salaryMinor, row.salaryEffectiveDate]);
      await db.execute(`INSERT INTO salary_import_stage
        (email, first_name, last_name, department, country, currency, start_date, salary_minor, salary_effective_date)
        VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?,?)').join(',')}`, values);
    }
    await db.execute(`INSERT INTO salary_changes (employee_id, old_salary_minor, new_salary_minor, effective_date, reason)
      SELECT e.id, e.salary_minor, s.salary_minor, s.salary_effective_date, 'Spreadsheet import'
      FROM employees e JOIN salary_import_stage s ON e.email = s.email
      WHERE e.salary_minor <> s.salary_minor`);
    await db.execute(`UPDATE employees e JOIN salary_import_stage s ON e.email = s.email
      SET e.first_name = s.first_name, e.last_name = s.last_name, e.department = s.department`);
    await db.execute(`UPDATE employees e JOIN salary_import_stage s ON e.email = s.email
      SET e.salary_minor = s.salary_minor, e.salary_effective_date = s.salary_effective_date
      WHERE e.salary_minor <> s.salary_minor`);
    await db.execute(`INSERT INTO employees
      (first_name, last_name, email, department, country, currency, start_date, salary_minor, salary_effective_date)
      SELECT s.first_name, s.last_name, s.email, s.department, s.country, s.currency,
        s.start_date, s.salary_minor, s.salary_effective_date
      FROM salary_import_stage s LEFT JOIN employees e ON e.email = s.email WHERE e.id IS NULL`);
  } finally {
    await db.execute('DROP TEMPORARY TABLE IF EXISTS salary_import_stage');
  }
}
