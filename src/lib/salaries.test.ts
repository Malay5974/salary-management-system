import { describe, expect, it } from 'vitest';
import { employeeInput, salaryChangeInput, listInput } from './validation';
import { summarizeRows } from '../server/reports/summary';

const employee = {
  firstName: 'Ava', lastName: 'Chen', email: 'AVA@example.test', department: 'Engineering',
  country: 'US', currency: 'USD', startDate: '2020-01-01', salaryMinor: 10_000_000,
  salaryEffectiveDate: '2020-01-01'
};

describe('salary rules', () => {
  it('normalizes the identity and requires the country currency pair', () => {
    expect(employeeInput.parse(employee).email).toBe('ava@example.test');
    expect(() => employeeInput.parse({ ...employee, country: 'IN' })).toThrow();
  });

  it('rejects invalid effective dates and salary changes', () => {
    expect(() => employeeInput.parse({ ...employee, salaryEffectiveDate: '2019-12-31' })).toThrow();
    expect(() => salaryChangeInput.parse({ salaryMinor: -1, effectiveDate: '2024-01-01', reason: 'Annual review' })).toThrow();
    expect(() => salaryChangeInput.parse({ salaryMinor: 10_000_000, effectiveDate: '2024-01-01', reason: '  ' })).toThrow();
  });

  it('bounds pagination to avoid unbounded responses', () => {
    expect(listInput.parse({ page: '2', pageSize: '100' })).toMatchObject({ page: 2, pageSize: 100 });
    expect(() => listInput.parse({ pageSize: '1000' })).toThrow();
  });

  it('keeps payroll totals and medians separate by currency', () => {
    const summary = summarizeRows([
      { country: 'US', department: 'Engineering', currency: 'USD', salaryMinor: '10000' },
      { country: 'US', department: 'Engineering', currency: 'USD', salaryMinor: '20000' },
      { country: 'IN', department: 'Engineering', currency: 'INR', salaryMinor: '90000' }
    ]);
    expect(summary.employeeCount).toBe(3);
    expect(summary.byCurrency).toMatchObject([
      { currency: 'INR', payrollMinor: 90000, medianMinor: 90000, minMinor: 90000, maxMinor: 90000 },
      { currency: 'USD', payrollMinor: 30000, medianMinor: 15000, minMinor: 10000, maxMinor: 20000 }
    ]);
    expect(summary.byDepartment).toHaveLength(2);
  });
});
