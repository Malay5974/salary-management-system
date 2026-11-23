import { NextResponse } from 'next/server';
import { apiError } from '@/lib/http';
import { readImportFile } from '@/server/imports/request';
import { previewImport } from '@/server/imports/service';
import { requireAuth } from '@/server/auth/session';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const unauthorized = await requireAuth(request); if (unauthorized) return unauthorized;
  try {
    const { filename, bytes } = await readImportFile(request);
    return NextResponse.json(await previewImport(filename, bytes));
  } catch (error) { return apiError(error); }
}
