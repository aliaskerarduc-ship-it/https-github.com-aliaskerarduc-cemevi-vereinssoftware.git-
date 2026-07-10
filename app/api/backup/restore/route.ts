// app/api/backup/restore/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/options';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur für Administratoren' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Keine Datei' }, { status: 400 });
    if (!file.name.endsWith('.sql')) return NextResponse.json({ error: 'Nur .sql Dateien erlaubt' }, { status: 400 });

    // Geçici dosyaya yaz
    const tmpPath = path.join('/tmp', `restore_${Date.now()}.sql`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tmpPath, buffer);

    // Restore et
    const { stdout, stderr } = await execAsync(
      `psql -h localhost -U aliaskerarduc -d cemevi < ${tmpPath} 2>&1`
    );

    // Geçici dosyayı sil
    await unlink(tmpPath).catch(() => {});

    return NextResponse.json({ success: true, message: 'Datenbank erfolgreich wiederhergestellt.' });
  } catch (e: any) {
    console.error('RESTORE ERROR:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
