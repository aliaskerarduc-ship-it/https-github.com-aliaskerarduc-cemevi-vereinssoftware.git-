import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN')
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const side = formData.get('side') as string;
    if (!file) return NextResponse.json({ error: 'Keine Datei' }, { status: 400 });
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });
    const ext = file.name.split('.').pop() ?? 'png';
    const filename = 'logo-' + side + '-' + Date.now() + '.' + ext;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    return NextResponse.json({ url: '/uploads/logos/' + filename });
  } catch {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
