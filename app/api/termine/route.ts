import { auditLog } from '@/lib/audit';
// app/api/termine/route.ts
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
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
    const month = searchParams.get('month');

    let startRange: Date, endRange: Date;
    if (month) {
      const m = parseInt(month);
      startRange = new Date(year, m - 1, 1);
      endRange = new Date(year, m, 0, 23, 59, 59);
    } else {
      startRange = new Date(year, 0, 1);
      endRange = new Date(year, 11, 31, 23, 59, 59);
    }

    // Termine aus DB
    const termine = await prisma.termin.findMany({
      where: { startDate: { gte: startRange, lte: endRange } },
      orderBy: { startDate: 'asc' },
    });

    // Geburtstage aus Mitglieder
    const members = await prisma.member.findMany({
      where: {
        status: { not: 'AUSGETRETEN' },
        birthDate: { not: null },
      },
      select: { id: true, firstName: true, lastName: true, birthDate: true },
    });

    const birthdays = members
      .filter(m => m.birthDate)
      .map(m => {
        const bd = new Date(m.birthDate!);
        const thisYear = new Date(year, bd.getMonth(), bd.getDate());
        return {
          id: `birthday-${m.id}`,
          title: `🎂 ${m.firstName} ${m.lastName}`,
          startDate: thisYear.toISOString(),
          type: 'GEBURTSTAG',
          allDay: true,
          color: '#f59e0b',
          memberId: m.id,
        };
      })
      .filter(b => {
        const d = new Date(b.startDate);
        return d >= startRange && d <= endRange;
      });

    return NextResponse.json({ termine, birthdays });
  } catch (e: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const body = await request.json();
    const { title, description, startDate, endDate, allDay, type, color } = body;
    if (!title || !startDate) return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });

    const termin = await prisma.termin.create({
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay: allDay ?? true,
        type: type || 'VERANSTALTUNG',
        color: color || null,
        createdBy: session.user?.name || session.user?.email || 'Unbekannt',
      },
    });
    return NextResponse.json(termin, { status: 201 });
  } catch (e: any) {
    console.error("TERMIN POST ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { id } = await request.json();
    const _t = await prisma.termin.findUnique({ where: { id } });
    await prisma.termin.delete({ where: { id } });
    await auditLog('Gelöscht', 'Termine', _t ? _t.title ?? id : id, session);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const body = await request.json();
    const { id, title, description, startDate, endDate, allDay, type, color } = body;
    if (!id || !title || !startDate) return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    const termin = await prisma.termin.update({
      where: { id },
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay: allDay ?? true,
        type: type || 'VERANSTALTUNG',
        color: color || null,
      },
    });
    return NextResponse.json(termin);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
