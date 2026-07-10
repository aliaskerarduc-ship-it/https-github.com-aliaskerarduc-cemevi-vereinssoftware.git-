export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { memberId, signatureData } = await request.json();
    if (!memberId) return NextResponse.json({ error: 'Mitglied erforderlich' }, { status: 400 });

    const meeting = await prisma.meeting.findUnique({ where: { id: params.id } });
    if (!meeting) return NextResponse.json({ error: 'Versammlung nicht gefunden' }, { status: 404 });

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { contributions: { orderBy: { paymentDate: 'desc' }, take: 1 } },
    });
    if (!member) return NextResponse.json({ error: 'Mitglied nicht gefunden' }, { status: 404 });

    // Calculate eligibility
    const now = new Date();
    const entryDate = new Date(member.entryDate);
    const monthsSinceEntry = (now.getFullYear() - entryDate.getFullYear()) * 12 + (now.getMonth() - entryDate.getMonth());

    // Check contribution payment
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const lastContrib = member?.contributions?.[0];
    const hasRecentPayment = lastContrib && new Date(lastContrib.paymentDate) >= threeMonthsAgo;

    let isEligibleVote = false;
    let isEligibleElect = false;
    let ineligibleReason = '';

    if (member.status !== 'AKTIV') {
      ineligibleReason = 'Mitglied ist nicht aktiv.';
    } else if (monthsSinceEntry < 3) {
      ineligibleReason = 'Mitgliedschaft kürzer als 3 Monate. Nicht berechtigt.';
    } else if (!hasRecentPayment) {
      ineligibleReason = 'Offene Beitragsrückstände. Nicht wahlberechtigt.';
    } else {
      isEligibleVote = true;
      if (monthsSinceEntry > 24) {
        isEligibleElect = true;
      }
    }

    const attendance = await prisma.meetingAttendance.upsert({
      where: { meetingId_memberId: { meetingId: params.id, memberId } },
      update: {
        checkedIn: true,
        signatureData: signatureData || null,
        checkInTime: now,
        isEligibleVote,
        isEligibleElect,
        ineligibleReason: ineligibleReason || null,
      },
      create: {
        meetingId: params.id,
        memberId,
        checkedIn: true,
        signatureData: signatureData || null,
        checkInTime: now,
        isEligibleVote,
        isEligibleElect,
        ineligibleReason: ineligibleReason || null,
      },
    });

    return NextResponse.json({
      ...attendance,
      member: { firstName: member.firstName, lastName: member.lastName, memberNumber: member.memberNumber },
      eligibility: {
        isEligibleVote,
        isEligibleElect,
        ineligibleReason,
        monthsSinceEntry,
      },
    });
  } catch (error: any) {
    console.error('Attendance error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
