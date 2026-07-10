export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const memberId = formData.get('memberId') as string || 'general';

    if (!file) return NextResponse.json({ error: 'Keine Datei' }, { status: 400 });

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', memberId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.name);
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);
    const fileUrl = `/uploads/${memberId}/${uniqueName}`;

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      url: fileUrl,
      key: fileUrl,
      fileName: file.name,
      fileType: file.type,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload fehlgeschlagen: ' + error.message }, { status: 500 });
  }
}
