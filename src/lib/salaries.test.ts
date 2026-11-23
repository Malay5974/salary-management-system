import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { changeSalary, createEmployee, getEmployee, getSummary, listEmployees } from './salaries';
import { Database } from './db';

const pg = new PGlite();
const db: Database = { query: async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  (await pg.query<T>(sql, params)).rows };

const sample = {
  firstName: 'Ava', lastName: 'Chen', email: 'ava@example.test', department: 'Engineering',
  country: 'US', currency: 'USD', startDate: '2020-01-01', salaryMinor: 10_000_000,
  salaryEffectiveDate: '2020-01-01'
};

describe('salary records', () => {
  beforeAll(async () => {
    await createEmployee(sample, db);
    await createEmployee({ ...sample, firstName: 'Riya', lastName: 'Shah', email: 'riya@example.test', country: 'IN', currency: 'INR', salaryMinor: 5_000_000 }, db);
  });

  it('rejects an effective date before employment', async () => {
    await expect(createEmployee({ ...sample, email: 'other@example.test', salaryEffectiveDate: '2019-12-31' }, db)).rejects.toThrow();
    await expect(createEmployee({ ...sample, email: 'other@example.test', country: 'IN' }, db)).rejects.toThrow();
  });

  it('lists with server-side filtering and pagination', async () => {
    const result = await listEmployees({ q: 'ava', pageSize: 1 }, db);
    expect(result.total).toBe(1);
    expect(result.items[0].email).toBe(sample.email);
    expect((await listEmployees({ q: 'missing' }, db)).total).toBe(0);
  });

  it('updates salary and adds an audit event atomically', async () => {
    const person = (await listEmployees({}, db)).items[0];
    const updated = await changeSalary(person.id as number, { salaryMinor: 11_000_000, effectiveDate: '2024-01-01', reason: 'Annual review' }, db);
    expect(updated?.salaryMinor).toBe(11_000_000);
    expect(updated?.history).toMatchObject([{ oldSalaryMinor: 10_000_000, newSalaryMinor: 11_000_000, reason: 'Annual review' }]);
    await expect(changeSalary(person.id as number, { salaryMinor: 11_000_000, effectiveDate: '2024-01-01', reason: 'No change' }, db)).rejects.toThrow();
    expect((await getEmployee(person.id as number, db))?.history).toHaveLength(1);
  });

  it('summarizes salary within its own currency', async () => {
    const summary = await getSummary(db);
    expect(summary.employeeCount).toBe(2);
    expect(summary.byCurrency).toMatchObject([
      { currency: 'INR', count: 1, payrollMinor: 5_000_000 },
      { currency: 'USD', count: 1, payrollMinor: 11_000_000 }
    ]);
  });
});
