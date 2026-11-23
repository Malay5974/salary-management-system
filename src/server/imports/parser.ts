import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { employeeInput } from '../../lib/validation';
import { InputError } from '../../lib/errors';
import { ZodError } from 'zod';

export type ImportEmployee = ReturnType<typeof employeeInput.parse> & { rowNumber: number };
export type RowError = { rowNumber: number; message: string };
const headers = ['firstName','lastName','email','department','country','currency','startDate','annualSalary','salaryEffectiveDate'] as const;
const canonical = (name: string) => name.replace(/[\s_-]/g, '').toLowerCase();
const headerMap = new Map(headers.map(name => [canonical(name), name]));

function amountToMinor(value: string) {
  const clean = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(clean)) throw new Error('annualSalary must be a nonnegative number with at most two decimal places');
  const [whole, fraction = ''] = clean.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount)) throw new Error('annualSalary is too large');
  return amount;
}
function dateCell(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '').trim();
}
function textCell(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'result' in value) return textCell((value as { result: unknown }).result);
  return String(value).trim();
}

export async function parseSpreadsheet(filename: string, bytes: Buffer): Promise<{ rows: ImportEmployee[]; errors: RowError[] }> {
  if (bytes.length > 10 * 1024 * 1024) throw new InputError('File must be 10 MB or smaller');
  const extension = filename.toLowerCase().split('.').pop();
  let raw: { rowNumber: number; values: Record<string, string> }[] = [];
  if (extension === 'csv') {
    let records: string[][];
    try { records = parse(bytes, { bom: true, columns: false, skip_empty_lines: true, relax_column_count: false }) as string[][]; }
    catch { throw new InputError('CSV file is malformed'); }
    if (!records.length) throw new InputError('Spreadsheet is empty');
    const names = records[0].map(textCell);
    const missing = headers.filter(name => !names.some(value => canonical(value) === canonical(name)));
    if (missing.length) throw new InputError(`Missing columns: ${missing.join(', ')}`);
    raw = records.slice(1).map((record, index) => ({ rowNumber: index + 2,
      values: Object.fromEntries(names.map((name, cell) => [headerMap.get(canonical(name)) ?? name, textCell(record[cell])])) }));
  } else if (extension === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer); }
    catch { throw new InputError('Excel file is malformed'); }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new InputError('Spreadsheet has no worksheet');
    const names = Array.from({ length: sheet.columnCount }, (_, index) => textCell(sheet.getRow(1).getCell(index + 1).value));
    const missing = headers.filter(name => !names.some(value => canonical(value) === canonical(name)));
    if (missing.length) throw new InputError(`Missing columns: ${missing.join(', ')}`);
    for (let number = 2; number <= sheet.rowCount; number++) {
      const row = sheet.getRow(number);
      if (!row.hasValues) continue;
      raw.push({ rowNumber: number, values: Object.fromEntries(names.map((name, index) => {
        const value = row.getCell(index + 1).value;
        return [headerMap.get(canonical(name)) ?? name, name.toLowerCase().includes('date') ? dateCell(value) : textCell(value)];
      })) });
    }
  } else throw new InputError('Upload a .csv or .xlsx file');
  if (raw.length === 0) throw new InputError('Spreadsheet has no employee rows');
  if (raw.length > 10_000) throw new InputError('Import up to 10,000 employees per file');

  const rows: ImportEmployee[] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    try {
      const salaryMinor = amountToMinor(entry.values.annualSalary ?? '');
      const employee = employeeInput.parse({ ...entry.values, salaryMinor });
      if (seen.has(employee.email)) throw new Error('Duplicate email within the file');
      seen.add(employee.email);
      rows.push({ ...employee, rowNumber: entry.rowNumber });
    } catch (error) {
      const message = error instanceof ZodError
        ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')
        : error instanceof Error ? error.message : 'Invalid row';
      errors.push({ rowNumber: entry.rowNumber, message });
    }
  }
  return { rows, errors };
}

export const importHeaders = headers;
