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
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '25');
    const search = searchParams.get('search') ?? '';

    const where: any = { deletedAt: null };
    if (memberId) where.memberId = memberId;
    if (search) {
      where.OR = [
        { member: { firstName: { contains: search } } },
        { member: { lastName: { contains: search } } },
      ];
    }

    const [contributions, total] = await Promise.all([
      prisma.contribution.findMany({
        where, include: { member: { select: { firstName: true, lastName: true, memberNumber: true } } },
        orderBy: { paymentDate: 'desc' }, skip: (page - 1) * limit, take: limit,
      }),
      prisma.contribution.count({ where }),
    ]);

    return NextResponse.json({ contributions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error('Contributions error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { memberId, paymentDate, periodMonth, periodYear, amount, paymentMethod, notes } = await request.json();
    if (!memberId || !paymentDate || !periodMonth || !periodYear || !amount) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    }

    // Check duplicate
    const existing = await prisma.contribution.findFirst({
      where: { memberId, periodMonth: parseInt(periodMonth), periodYear: parseInt(periodYear) },
    });
    if (existing) {
      return NextResponse.json({ error: `Beitrag für ${periodMonth}/${periodYear} existiert bereits.` }, { status: 400 });
    }

    const contribution = await prisma.contribution.create({
      data: {
        memberId, paymentDate: new Date(paymentDate),
        periodMonth: parseInt(periodMonth), periodYear: parseInt(periodYear),
        amount: parseFloat(amount), paymentMethod: paymentMethod || 'BAR', notes: notes || null,
      },
    });
    return NextResponse.json(contribution, { status: 201 });
  } catch (error: any) {
    console.error('Contribution create error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { id, amount, paymentMethod, paymentDate, notes } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
    const contribution = await prisma.contribution.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        paymentMethod: paymentMethod,
        paymentDate: new Date(paymentDate),
        notes: notes || null,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(contribution);
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
    const _c = await prisma.contribution.findUnique({ where: { id }, include: { member: true } });
    await prisma.contribution.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: (session.user as any)?.name || session.user?.email || 'Unbekannt' } });
    await auditLog('Gelöscht', 'Beiträge', _c ? `Nr. ${_c.contributionNumber} – ${_c.member ? _c.member.lastName + ', ' + _c.member.firstName : ''} ${_c.amount ?? ''}€` : id, session);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
