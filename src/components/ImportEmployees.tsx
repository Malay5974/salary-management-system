'use client';

import { useState } from 'react';

type Preview = {
  totalRows: number; createCount: number; updateCount: number; unchangedCount: number; errorCount: number;
  errors: { rowNumber: number; message: string }[];
  sample: { rowNumber: number; email: string; action: string; message?: string }[];
};

export default function ImportEmployees({ onClose, onApplied }: { onClose: () => void; onApplied: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [done, setDone] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const submit = async (action: 'preview' | 'apply') => {
    if (!file) return;
    setWorking(true); setError('');
    try {
      const form = new FormData(); form.append('file', file);
      const response = await fetch(`/api/imports/${action}`, { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Import failed');
      setPreview(result as Preview);
      if (action === 'apply') setDone(true);
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(false); }
  };
  return <div className="overlay" onMouseDown={onClose}><section className="panel import-panel" onMouseDown={event => event.stopPropagation()} aria-label="Import employees">
    <div className="panel-head"><span>SPREADSHEET IMPORT</span><button onClick={onClose} aria-label="Close">×</button></div>
    <div className="panel-body"><h2>Import employees</h2><p>Upload a CSV or Excel file with up to 10,000 rows. Review every change before applying it.</p>
      <a className="template-link" href="/employee-import-template.csv" download>Download CSV template</a>
      {!done && <><label className="upload-field">Choose CSV or XLSX file<input type="file" accept=".csv,.xlsx" onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); setError(''); }} /></label>
        <p className="import-note">Matching emails update names, department, and salary. Salary changes receive a history entry. Country, currency, and start date conflicts must be corrected before import.</p>
        <button className="primary wide" disabled={!file || working} onClick={() => void submit('preview')}>{working ? 'Checking…' : 'Preview import'}</button></>}
      {error && <div className="form-error" role="alert">{error}</div>}
      {preview && <div className="import-results"><h3>{done ? 'Import complete' : 'Review changes'}</h3><div className="import-counts"><span><strong>{preview.totalRows}</strong> rows</span><span><strong>{preview.createCount}</strong> new</span><span><strong>{preview.updateCount}</strong> updates</span><span><strong>{preview.unchangedCount}</strong> unchanged</span><span className={preview.errorCount ? 'bad' : ''}><strong>{preview.errorCount}</strong> errors</span></div>
        {preview.errors.length > 0 && <div className="import-errors"><strong>Fix these rows before applying</strong>{preview.errors.map(item => <p key={`${item.rowNumber}-${item.message}`}>Row {item.rowNumber}: {item.message}</p>)}{preview.errorCount > preview.errors.length && <p>Showing the first {preview.errors.length} errors.</p>}</div>}
        <div className="import-sample"><h4>First {preview.sample.length} valid rows</h4>{preview.sample.map(row => <div key={row.rowNumber}><span>Row {row.rowNumber}</span><span>{row.email}</span><strong className={`import-action ${row.action}`}>{row.action}</strong></div>)}</div>
        {!done && <button className="primary wide" disabled={working || preview.errorCount > 0} onClick={() => void submit('apply')}>{working ? 'Applying…' : `Apply ${preview.createCount + preview.updateCount} changes`}</button>}
        {done && <button className="primary wide" onClick={onApplied}>Done</button>}
      </div>}
    </div>
  </section></div>;
}
