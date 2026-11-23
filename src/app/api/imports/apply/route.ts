import { NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { readImportFile } from '@/server/imports/request';
import { applyImport } from '@/server/imports/service';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { filename, bytes } = await readImportFile(request);
    return NextResponse.json(await applyImport(filename, bytes));
  } catch (error) { return apiError(error); }
}
