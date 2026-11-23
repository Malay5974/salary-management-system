import { InputError } from '../../lib/errors';

export async function readImportFile(request: Request) {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > 11 * 1024 * 1024) throw new InputError('File must be 10 MB or smaller');
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw new InputError('Choose a CSV or XLSX file');
  if (file.size > 10 * 1024 * 1024) throw new InputError('File must be 10 MB or smaller');
  return { filename: file.name, bytes: Buffer.from(await file.arrayBuffer()) };
}
