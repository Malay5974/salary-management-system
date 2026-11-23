import { type Database, getDatabase } from '../db/connection';
import { parseSpreadsheet, type ImportEmployee, type RowError } from './parser';
import { applyStagedImport, findExisting, type ExistingEmployee } from './repository';
import { InputError } from '../../lib/errors';

export type PreviewRow = { rowNumber: number; email: string; action: 'create' | 'update' | 'unchanged' | 'error'; message?: string };
function classify(row: ImportEmployee, existing?: ExistingEmployee): PreviewRow {
  if (!existing) return { rowNumber: row.rowNumber, email: row.email, action: 'create' };
  if (existing.country !== row.country || existing.currency !== row.currency || existing.startDate !== row.startDate) {
    return { rowNumber: row.rowNumber, email: row.email, action: 'error', message: 'Existing country, currency, or start date differs; correct this row before import' };
  }
  const changed = existing.firstName !== row.firstName || existing.lastName !== row.lastName ||
    existing.department !== row.department || Number(existing.salaryMinor) !== row.salaryMinor;
  return { rowNumber: row.rowNumber, email: row.email, action: changed ? 'update' : 'unchanged' };
}
function summarize(rows: ImportEmployee[], parserErrors: RowError[], existing: Map<string, ExistingEmployee>) {
  const all = rows.map(row => classify(row, existing.get(row.email)));
  const errors = [...parserErrors, ...all.filter(row => row.action === 'error').map(row => ({ rowNumber: row.rowNumber, message: row.message ?? 'Invalid row' }))];
  return {
    totalRows: rows.length + parserErrors.length,
    createCount: all.filter(row => row.action === 'create').length,
    updateCount: all.filter(row => row.action === 'update').length,
    unchangedCount: all.filter(row => row.action === 'unchanged').length,
    errorCount: errors.length,
    errors: errors.slice(0, 100),
    sample: all.slice(0, 12)
  };
}

export async function previewImport(filename: string, bytes: Buffer, db: Database = getDatabase()) {
  const parsed = await parseSpreadsheet(filename, bytes);
  const existing = await findExisting(db, parsed.rows.map(row => row.email).sort());
  return summarize(parsed.rows, parsed.errors, existing);
}

export async function applyImport(filename: string, bytes: Buffer, db: Database = getDatabase()) {
  const parsed = await parseSpreadsheet(filename, bytes);
  if (parsed.errors.length) throw new InputError(`Import has ${parsed.errors.length} invalid row(s); correct them before applying`);
  return db.transaction(async tx => {
    const existing = await findExisting(tx, parsed.rows.map(row => row.email).sort(), true);
    const preview = summarize(parsed.rows, parsed.errors, existing);
    if (preview.errorCount) throw new InputError(`Import has ${preview.errorCount} conflicting row(s); correct them before applying`);
    await applyStagedImport(tx, parsed.rows);
    return preview;
  });
}
