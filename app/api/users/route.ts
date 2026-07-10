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
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur Administratoren.' }, { status: 403 });
    }
    const { id, role, permissions } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(permissions !== undefined && { permissions }),
      },
    });
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur Administratoren.' }, { status: 403 });
    }
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
    if ((session.user as any)?.id === id) {
      return NextResponse.json({ error: 'Sich selbst nicht löschen.' }, { status: 400 });
    }
    const _u = await prisma.user.findUnique({ where: { id } });
    await prisma.user.delete({ where: { id } });
    await auditLog('Gelöscht', 'Benutzer', _u ? `${_u.name ?? ''} (${_u.email ?? ''})` : id, session);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
