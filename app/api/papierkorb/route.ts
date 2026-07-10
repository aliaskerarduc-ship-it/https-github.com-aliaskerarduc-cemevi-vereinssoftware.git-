import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 });
    }
    const [members, contributions, donations, ausgaben] = await Promise.all([
      prisma.member.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' } }),
      prisma.contribution.findMany({ where: { deletedAt: { not: null } }, include: { member: { select: { firstName: true, lastName: true } } }, orderBy: { deletedAt: 'desc' } }),
      prisma.donation.findMany({ where: { deletedAt: { not: null } }, include: { member: { select: { firstName: true, lastName: true } } }, orderBy: { deletedAt: 'desc' } }),
      prisma.ausgabe.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' } }),
    ]);
    return NextResponse.json({ members, contributions, donations, ausgaben });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 });
    }
    const { module: mod, id, action } = await request.json();
    const models: any = { members: prisma.member, contributions: prisma.contribution, donations: prisma.donation, ausgaben: prisma.ausgabe };
    const labels: any = { members: 'Mitglieder', contributions: 'Beiträge', donations: 'Spenden', ausgaben: 'Ausgaben' };
    const model = models[mod];
    if (!model) return NextResponse.json({ error: 'Ungültiges Modul' }, { status: 400 });

    if (action === 'restore') {
      await model.update({ where: { id }, data: { deletedAt: null, deletedBy: null } });
      await auditLog('Wiederhergestellt', labels[mod], id, session);
    } else if (action === 'destroy') {
      await model.delete({ where: { id } });
      await auditLog('Endgültig gelöscht', labels[mod], id, session);
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
