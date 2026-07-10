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
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '25');
    const search = searchParams.get('search') ?? '';
    const year = searchParams.get('year') ?? '';
    const month = searchParams.get('month') ?? '';

    const where: any = { deletedAt: null };
    if (search) where.OR = [
      { category: { contains: search } },
      { description: { contains: search } },
      { notes: { contains: search } },
    ];
    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      const firstDay = new Date(`${y}-${String(m).padStart(2,'0')}-01`);
      const lastDay = new Date(y, m, 0); // last day of month
      lastDay.setHours(23, 59, 59, 999);
      where.date = { gte: firstDay, lte: lastDay };
    } else if (year) {
      where.date = { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) };
    }

    const [ausgaben, total, sumResult] = await Promise.all([
      prisma.ausgabe.findMany({ where, orderBy: { date: 'desc' }, skip: (page-1)*limit, take: limit }),
      prisma.ausgabe.count({ where }),
      prisma.ausgabe.aggregate({ where, _sum: { amount: true } }),
    ]);

    return NextResponse.json({ ausgaben, total, totalPages: Math.ceil(total/limit), totalAmount: sumResult._sum.amount ?? 0 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { date, category, description, amount, paymentMethod, notes, rechnungsNummer, lieferant } = await request.json();
    if (!date || !category || !amount) return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    const ausgabe = await prisma.ausgabe.create({
      data: { date: new Date(date), category, description: description || null, amount: parseFloat(amount), paymentMethod: paymentMethod || 'BAR', notes: notes || null, rechnungsNummer: rechnungsNummer || null, lieferant: lieferant || null },
    });
    return NextResponse.json(ausgabe, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}


export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { id, date, category, description, amount, paymentMethod, notes, rechnungsNummer, lieferant } = await request.json();
    if (!id || !date || !category || !amount) return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    const ausgabe = await prisma.ausgabe.update({
      where: { id },
      data: { date: new Date(date), category, description: description || null, amount: parseFloat(amount), paymentMethod: paymentMethod || 'BAR', notes: notes || null, rechnungsNummer: rechnungsNummer || null, lieferant: lieferant || null },
    });
    return NextResponse.json(ausgabe);
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
    const _a = await prisma.ausgabe.findUnique({ where: { id } });
    await prisma.ausgabe.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: (session.user as any)?.name || session.user?.email || 'Unbekannt' } });
    await auditLog('Gelöscht', 'Ausgaben', _a ? `Nr. ${_a.ausgabeNumber} – ${_a.category ?? ''} ${_a.amount ?? ''}€` : id, session);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
