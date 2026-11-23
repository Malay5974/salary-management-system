import type { Database } from '../db/connection';
import { getDatabase } from '../db/connection';
import { listSalaryRows } from '../employees/repository';
import { summaryInput } from '../../lib/validation';
import { z } from 'zod';

type SalaryRow = { country: string; department: string; currency: string; salaryMinor: string };
type Group = { count: number; medianMinor: number; minMinor: number; maxMinor: number; payrollMinor?: number; currency: string; country?: string; department?: string; band?: string };
function median(values: number[]) {
  const ordered = values.sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return Math.round(ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2);
}

export async function getSummary(input: z.input<typeof summaryInput> = {}, db: Database = getDatabase()) {
  const filter = summaryInput.parse(input);
  const rows = await listSalaryRows(db, filter);
  return summarizeRows(rows);
}

export function summarizeRows(rows: SalaryRow[]) {
  const currencies = new Map<string, number[]>();
  const countries = new Map<string, number[]>();
  const departments = new Map<string, number[]>();
  const bands = new Map<string, number>();
  for (const row of rows) {
    const amount = Number(row.salaryMinor);
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
      return { ...(label ? { [label]: name } : {}), currency, count: values.length,
        medianMinor: median(values), minMinor: Math.min(...values), maxMinor: Math.max(...values),
        ...(!label ? { payrollMinor: values.reduce((a, b) => a + b, 0) } : {}) };
    });
  return {
    employeeCount: rows.length,
    byCurrency: grouped(currencies).sort((a, b) => a.currency.localeCompare(b.currency)),
    byCountry: grouped(countries, 'country').sort((a, b) => b.count - a.count || (a.country ?? '').localeCompare(b.country ?? '')),
    byDepartment: grouped(departments, 'department').sort((a, b) => (a.department ?? '').localeCompare(b.department ?? '') || a.currency.localeCompare(b.currency)),
    byBand: [...bands].map(([key, count]) => { const [currency, band] = key.split('|'); return { currency, band, count }; })
  };
}
