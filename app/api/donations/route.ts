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
        { purpose: { contains: search } },
        { externalDonorName: { contains: search } },
        { member: { firstName: { contains: search } } },
        { member: { lastName: { contains: search } } },
      ];
    }

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        include: { member: { select: { firstName: true, lastName: true, memberNumber: true } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.donation.count({ where }),
    ]);

    return NextResponse.json({ donations, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error('Donations error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { memberId, date, amount, paymentMethod, purpose, notes, externalDonorName, externalDonorAddress } = await request.json();
    
    if (!date || !amount) return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    if (!memberId && !externalDonorName) return NextResponse.json({ error: 'Mitglied oder externer Spender erforderlich' }, { status: 400 });

    const donation = await prisma.donation.create({
      data: {
        memberId: memberId || null,
        date: new Date(date),
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || 'BAR',
        purpose: purpose || null,
        notes: notes || null,
        externalDonorName: externalDonorName || null,
        externalDonorAddress: externalDonorAddress || null,
      },
    });
    return NextResponse.json(donation, { status: 201 });
  } catch (error: any) {
    console.error('Donation create error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
    const _d = await prisma.donation.findUnique({ where: { id }, include: { member: true } });
    await prisma.donation.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: (session.user as any)?.name || session.user?.email || 'Unbekannt' } });
    await auditLog('Gelöscht', 'Spenden', _d ? `Nr. ${_d.donationNumber} – ${_d.member ? _d.member.lastName + ', ' + _d.member.firstName : (_d.externalDonorName ?? '')} ${_d.amount ?? ''}€` : id, session);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
