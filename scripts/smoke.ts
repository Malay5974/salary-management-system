import { closeDatabase, getDatabase } from '../src/server/db/connection';
import { changeSalary, createEmployee, getEmployee, listEmployees } from '../src/server/employees/service';
import { getSummary } from '../src/server/reports/summary';

const url = new URL(process.env.DATABASE_URL ?? '');
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Smoke test only runs against a local database');
const db = getDatabase();
let id: number | undefined;
try {
  const summary = await getSummary({}, db);
  if (summary.employeeCount < 10_000) throw new Error(`Expected at least 10,000 employees, found ${summary.employeeCount}`);
  const usSummary = await getSummary({ country: 'US' }, db);
  if (usSummary.employeeCount !== 2_000 || usSummary.byCurrency.length !== 1) throw new Error('Filtered summary failed');
  const list = await listEmployees({ q: 'employee1', pageSize: 2 }, db);
  if (list.total < 1 || list.items.length !== 2) throw new Error('Filtered pagination failed');
  const created = await createEmployee({
    firstName: 'Smoke', lastName: 'Test', email: `smoke-${Date.now()}@example.test`,
    department: 'Engineering', country: 'US', currency: 'USD', startDate: '2024-01-01',
    salaryMinor: 9_000_000, salaryEffectiveDate: '2024-01-01'
  }, db);
  if (!created) throw new Error('Employee creation failed');
  id = created.id;
  try {
    await createEmployee({ firstName: 'Duplicate', lastName: 'Test', email: created.email, department: 'Engineering', country: 'US', currency: 'USD', startDate: '2024-01-01', salaryMinor: 9_000_000, salaryEffectiveDate: '2024-01-01' }, db);
    throw new Error('Duplicate email was accepted');
  } catch (error) {
    if (!/Duplicate entry/i.test((error as Error).message)) throw error;
  }
  const updated = await changeSalary(id, { salaryMinor: 10_000_000, effectiveDate: '2024-02-01', reason: 'Integration test' }, db);
  if (updated?.salaryMinor !== 10_000_000 || updated.history[0]?.oldSalaryMinor !== 9_000_000) throw new Error('Salary transaction or history failed');
  try {
    await changeSalary(id, { salaryMinor: 10_000_000, effectiveDate: '2024-02-01', reason: 'No change' }, db);
    throw new Error('Unchanged salary was accepted');
  } catch (error) {
    if ((error as Error).message !== 'Salary unchanged') throw error;
  }
  if ((await getEmployee(id, db))?.history.length !== 1) throw new Error('Rejected change created a history event');
  try {
    await db.transaction(async tx => {
      await tx.execute('UPDATE employees SET salary_minor = ? WHERE id = ?', [12_000_000, id]);
      throw new Error('rollback-check');
    });
  } catch (error) {
    if ((error as Error).message !== 'rollback-check') throw error;
  }
  if ((await getEmployee(id, db))?.salaryMinor !== 10_000_000) throw new Error('Transaction rollback failed');
  console.log('Local MySQL smoke test passed: summary, search, create, duplicate rejection, salary history, transaction rollback.');
} finally {
  if (id) {
    await db.execute('DELETE FROM salary_changes WHERE employee_id = ?', [id]);
    await db.execute('DELETE FROM employees WHERE id = ?', [id]);
  }
  await closeDatabase();
}
