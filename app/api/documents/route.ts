import { auditLog } from '@/lib/audit';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') ?? '';

    const where: any = {};
    if (memberId) where.memberId = memberId;

    const documents = await prisma.document.findMany({
      where,
      include: { member: { select: { firstName: true, lastName: true, memberNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const docsWithUrls = (documents ?? []).map((doc: any) => ({
      ...(doc ?? {}),
      downloadUrl: doc?.cloudStoragePath ?? null,
    }));

    return NextResponse.json({ documents: docsWithUrls });
  } catch (error: any) {
    console.error('Documents error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { memberId, fileName, fileType, cloudStoragePath, isPublic, category, notes } = await request.json();
    if (!memberId || !fileName || !cloudStoragePath) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    }

    const document = await prisma.document.create({
      data: {
        memberId, fileName, fileType: fileType || 'application/octet-stream',
        cloudStoragePath, isPublic: isPublic ?? false,
        category: category || null, notes: notes || null,
      },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error: any) {
    console.error('Document create error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
    const _d = await prisma.document.findUnique({ where: { id } });
    await prisma.document.delete({ where: { id } });
    await auditLog('Gelöscht', 'Dokumente', _d ? _d.fileName ?? id : id, session);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
