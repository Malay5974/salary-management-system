import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../db/connection';
import { changeSalary } from './service';
import * as repository from './repository';

vi.mock('./repository', () => ({
  findEmployee: vi.fn(), findSalaryHistory: vi.fn(), insertEmployee: vi.fn(),
  insertSalaryHistory: vi.fn(), listEmployeeRows: vi.fn(), lockEmployee: vi.fn(), updateSalary: vi.fn()
}));

const person: repository.EmployeeRow = {
  id: '1', firstName: 'Ava', lastName: 'Chen', email: 'ava@example.test',
  department: 'Engineering', country: 'US', currency: 'USD', startDate: '2020-01-01',
  salaryMinor: '10000000', salaryEffectiveDate: '2020-01-01'
};
const db = { transaction: vi.fn(async (work: (tx: Database) => Promise<unknown>) => work(db as Database)) } as unknown as Database;
const input = { salaryMinor: 11_000_000, effectiveDate: '2024-01-01', reason: 'Annual review' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repository.lockEmployee).mockResolvedValue(person);
  vi.mocked(repository.findEmployee).mockResolvedValue({ ...person, salaryMinor: '11000000' });
  vi.mocked(repository.findSalaryHistory).mockResolvedValue([{ id: '4', oldSalaryMinor: '10000000', newSalaryMinor: '11000000', effectiveDate: '2024-01-01', reason: 'Annual review', changedAt: '2024-01-01 00:00:00' }]);
});

describe('salary change service', () => {
  it('rejects a missing employee without writing', async () => {
    vi.mocked(repository.lockEmployee).mockResolvedValue(null);
    await expect(changeSalary(1, input, db)).rejects.toThrow('Employee missing');
    expect(repository.updateSalary).not.toHaveBeenCalled();
    expect(repository.insertSalaryHistory).not.toHaveBeenCalled();
  });

  it('rejects dates before start and unchanged salary without writing', async () => {
    await expect(changeSalary(1, { ...input, effectiveDate: '2019-01-01' }, db)).rejects.toThrow('Date before employee start');
    await expect(changeSalary(1, { ...input, salaryMinor: 10_000_000 }, db)).rejects.toThrow('Salary unchanged');
    expect(repository.updateSalary).not.toHaveBeenCalled();
    expect(repository.insertSalaryHistory).not.toHaveBeenCalled();
  });

  it('updates current pay and records the prior pay in one transaction', async () => {
    const result = await changeSalary(1, input, db);
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(repository.updateSalary).toHaveBeenCalledWith(db, 1, 11_000_000, '2024-01-01');
    expect(repository.insertSalaryHistory).toHaveBeenCalledWith(db, 1, 10_000_000, 11_000_000, '2024-01-01', 'Annual review');
    expect(result).toMatchObject({ salaryMinor: 11_000_000, history: [{ oldSalaryMinor: 10_000_000 }] });
  });
});
