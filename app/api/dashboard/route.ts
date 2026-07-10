export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [totalMembers, activeMembers, familyCount, donationSum, contributionSum, recentDonations, recentContributions] = await Promise.all([
      prisma.member.count({ where: { deletedAt: null } }),
      prisma.member.count({ where: { status: 'AKTIV', deletedAt: null } }),
      prisma.member.count({ where: { familyId: { not: null }, deletedAt: null } }),
      prisma.donation.aggregate({ where: { deletedAt: null }, _sum: { amount: true } }),
      prisma.contribution.aggregate({ where: { deletedAt: null }, _sum: { amount: true } }),
      prisma.donation.findMany({ where: { deletedAt: null }, take: 5, orderBy: { date: 'desc' }, include: { member: { select: { firstName: true, lastName: true } } } }),
      prisma.contribution.findMany({ where: { deletedAt: null }, take: 5, orderBy: { paymentDate: 'desc' }, include: { member: { select: { firstName: true, lastName: true } } } }),
    ]);

    // Find members with overdue contributions (>3 months)
    const activeWithContributions = await prisma.member.findMany({
      where: { status: 'AKTIV', deletedAt: null },
      select: {
        id: true, firstName: true, lastName: true, memberNumber: true,
        contributions: { orderBy: { paymentDate: 'desc' }, take: 1, select: { paymentDate: true } },
      },
    });

    const overdueMembers = (activeWithContributions ?? []).filter((m: any) => {
      const lastContrib = m?.contributions?.[0];
      if (!lastContrib) return true;
      return new Date(lastContrib.paymentDate) < threeMonthsAgo;
    }).map((m: any) => ({
      id: m?.id,
      firstName: m?.firstName,
      lastName: m?.lastName,
      memberNumber: m?.memberNumber,
      lastPayment: m?.contributions?.[0]?.paymentDate
        ? new Date(m.contributions[0].paymentDate).toLocaleDateString('de-DE')
        : null,
    }));

    return NextResponse.json({
      totalMembers,
      activeMembers,
      familyMembers: familyCount,
      singleMembers: totalMembers - familyCount,
      totalDonations: donationSum?._sum?.amount ?? 0,
      totalContributions: contributionSum?._sum?.amount ?? 0,
      overdueMembers,
      recentDonations,
      recentContributions,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Dashboards' }, { status: 500 });
  }
}
