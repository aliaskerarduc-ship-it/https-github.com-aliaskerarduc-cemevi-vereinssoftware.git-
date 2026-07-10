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
    const meetings = await prisma.meeting.findMany({
      orderBy: { date: 'desc' },
      include: { _count: { select: { attendances: { where: { checkedIn: true } } } } },
    });
    return NextResponse.json({ meetings });
  } catch (error: any) {
    console.error('Meetings error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { title, date, description } = await request.json();
    if (!title || !date) return NextResponse.json({ error: 'Titel und Datum erforderlich' }, { status: 400 });
    const meeting = await prisma.meeting.create({
      data: { title, date: new Date(date), description: description || null },
    });
    return NextResponse.json(meeting, { status: 201 });
  } catch (error: any) {
    console.error('Meeting create error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
    const _m = await prisma.meeting.findUnique({ where: { id } });
    await prisma.meeting.delete({ where: { id } });
    await auditLog('Gelöscht', 'Versammlungen', _m ? _m.title ?? id : id, session);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
