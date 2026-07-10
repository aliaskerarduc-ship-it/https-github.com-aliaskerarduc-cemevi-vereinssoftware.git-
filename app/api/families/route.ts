import { auditLog } from '@/lib/audit';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const families = await prisma.family.findMany({
      include: { members: { select: { id: true, firstName: true, lastName: true, memberNumber: true } } },
      orderBy: { familyName: 'asc' },
    });
    return NextResponse.json({ families });
  } catch (error: any) {
    console.error('Families error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { familyName } = await request.json();
    if (!familyName) return NextResponse.json({ error: 'Familienname ist erforderlich' }, { status: 400 });
    const family = await prisma.family.create({ data: { familyName } });
    return NextResponse.json(family, { status: 201 });
  } catch (error: any) {
    console.error('Family create error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
    const _f = await prisma.family.findUnique({ where: { id } });
    await prisma.family.delete({ where: { id } });
    await auditLog('Gelöscht', 'Familien', _f ? (_f as any).name ?? id : id, session);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
