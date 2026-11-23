import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { parseSpreadsheet } from './parser';

const header = 'firstName,lastName,email,department,country,currency,startDate,annualSalary,salaryEffectiveDate';
const row = 'Ava,Chen,ava@example.test,Engineering,US,USD,2024-01-01,95000.25,2024-01-01';

describe('spreadsheet parser', () => {
  it('parses CSV salary amounts exactly and flags duplicate emails', async () => {
    const result = await parseSpreadsheet('employees.csv', Buffer.from(`${header}\n${row}\n${row}\n`));
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].salaryMinor).toBe(9_500_025);
    expect(result.errors).toMatchObject([{ rowNumber: 3, message: 'Duplicate email within the file' }]);
  });

  it('rejects missing columns and excess decimal places', async () => {
    await expect(parseSpreadsheet('bad.csv', Buffer.from('name,email\nAva,ava@example.test\n'))).rejects.toThrow('Missing columns');
    const result = await parseSpreadsheet('bad.csv', Buffer.from(`${header}\n${row.replace('95000.25', '95000.251')}\n`));
    expect(result.errors[0].message).toContain('two decimal places');
  });

  it('parses an Excel worksheet with the same columns', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employees');
    sheet.addRow(header.split(','));
    sheet.addRow(['Ava','Chen','ava@example.test','Engineering','US','USD','2024-01-01',95000.25,'2024-01-01']);
    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
    const result = await parseSpreadsheet('employees.xlsx', bytes);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].salaryMinor).toBe(9_500_025);
  });
});
