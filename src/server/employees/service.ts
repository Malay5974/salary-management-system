import type { Database } from '../db/connection';
import { getDatabase } from '../db/connection';
import { employeeInput, listInput, salaryChangeInput } from '../../lib/validation';
import { z } from 'zod';
import { findEmployee, findSalaryHistory, insertEmployee, insertSalaryHistory, listEmployeeRows, lockEmployee, updateSalary, type EmployeeRow, type HistoryRow } from './repository';

function presentEmployee(row: EmployeeRow) {
  return { ...row, id: Number(row.id), salaryMinor: Number(row.salaryMinor) };
}
function presentHistory(row: HistoryRow) {
  return { ...row, id: Number(row.id), oldSalaryMinor: Number(row.oldSalaryMinor), newSalaryMinor: Number(row.newSalaryMinor) };
}

export async function listEmployees(input: z.input<typeof listInput>, db: Database = getDatabase()) {
  const filter = listInput.parse(input);
  const result = await listEmployeeRows(db, { ...filter, country: filter.country.toUpperCase() });
  return { items: result.items.map(presentEmployee), total: result.total, page: filter.page, pageSize: filter.pageSize };
}
export async function getEmployee(id: number, db: Database = getDatabase()) {
  const row = await findEmployee(db, id);
  if (!row) return null;
  const history = await findSalaryHistory(db, id);
  return { ...presentEmployee(row), history: history.map(presentHistory) };
}
export async function createEmployee(input: z.input<typeof employeeInput>, db: Database = getDatabase()) {
  const value = employeeInput.parse(input);
  const id = await insertEmployee(db, { ...value, salaryMinor: String(value.salaryMinor) });
  return getEmployee(id, db);
}
export async function changeSalary(id: number, input: z.input<typeof salaryChangeInput>, db: Database = getDatabase()) {
  const value = salaryChangeInput.parse(input);
  return db.transaction(async tx => {
    const previous = await lockEmployee(tx, id);
    if (!previous) throw new Error('Employee missing');
    if (value.effectiveDate < previous.startDate) throw new Error('Date before employee start');
    const oldSalary = Number(previous.salaryMinor);
    if (value.salaryMinor === oldSalary) throw new Error('Salary unchanged');
    await updateSalary(tx, id, value.salaryMinor, value.effectiveDate);
    await insertSalaryHistory(tx, id, oldSalary, value.salaryMinor, value.effectiveDate, value.reason);
    return getEmployee(id, tx);
  });
}
