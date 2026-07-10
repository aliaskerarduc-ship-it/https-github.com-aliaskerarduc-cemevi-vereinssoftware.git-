export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: { attendances: { include: { member: { select: { id: true, firstName: true, lastName: true, memberNumber: true, entryDate: true, status: true } } } } },
    });
    if (!meeting) return NextResponse.json({ error: 'Versammlung nicht gefunden' }, { status: 404 });

    return NextResponse.json(meeting);
  } catch (error: any) {
    console.error('Meeting detail error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const body = await request.json();
    const meeting = await prisma.meeting.update({ where: { id: params.id }, data: body });
    return NextResponse.json(meeting);
  } catch (error: any) {
    console.error('Meeting update error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
