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
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const [totalMembers, activeMembers, familyCount,
      yearDonationSum, yearContributionSum,
      statusCounts,
      genderCounts,
      nationalityCounts,
      beitragsstufen,
      familyMemberCount,
    ] = await Promise.all([
      prisma.member.count({ where: { deletedAt: null } }),
      prisma.member.count({ where: { status: 'AKTIV', deletedAt: null } }),
      prisma.family.count(),
      prisma.donation.aggregate({ where: { date: { gte: startDate, lte: endDate }, deletedAt: null }, _sum: { amount: true } }),
      prisma.contribution.aggregate({ where: { paymentDate: { gte: startDate, lte: endDate }, deletedAt: null }, _sum: { amount: true } }),
      prisma.member.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
      prisma.member.groupBy({ by: ['gender'], _count: true, where: { status: 'AKTIV', deletedAt: null } }),
      prisma.member.groupBy({ by: ['nationality'], _count: true, where: { status: 'AKTIV', deletedAt: null } }),
      prisma.member.groupBy({
        by: ['contributionLevel'],
        _count: true,
        where: { status: 'AKTIV' },
      }),
      prisma.member.count({ where: { status: 'AKTIV', familyId: { not: null }, deletedAt: null } }),
    ]);

    // Monthly data
    const monthlyData = [];
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1);
      const mEnd = new Date(year, m + 1, 0, 23, 59, 59);
      const [donSum, contSum] = await Promise.all([
        prisma.donation.aggregate({ where: { date: { gte: mStart, lte: mEnd }, deletedAt: null }, _sum: { amount: true } }),
        prisma.contribution.aggregate({ where: { paymentDate: { gte: mStart, lte: mEnd }, deletedAt: null }, _sum: { amount: true } }),
      ]);
      monthlyData.push({ donations: donSum?._sum?.amount ?? 0, contributions: contSum?._sum?.amount ?? 0 });
    }

    const statusLabels: Record<string, string> = { AKTIV: 'Aktiv', PASSIV: 'Passiv', AUSGETRETEN: 'Ausgetreten', VERSTORBEN: 'Verstorben', AUSGESCHLOSSEN: 'Ausgeschlossen' };
    const memberStatusData = (statusCounts ?? []).map((s: any) => ({ name: statusLabels[s?.status] ?? s?.status, value: s?._count ?? 0 }));

    const genderLabels: Record<string, string> = { MAENNLICH: 'Männlich', WEIBLICH: 'Weiblich', DIVERS: 'Divers' };
    const genderData = (genderCounts ?? []).map((g: any) => ({ name: genderLabels[g?.gender] ?? g?.gender ?? 'Unbekannt', value: g?._count ?? 0 }));

    // Nationalität grupla
    const nationalityMap: Record<string, number> = {};
    for (const n of nationalityCounts ?? []) {
      const key = n?.nationality?.toLowerCase() ?? '';
      if (key.includes('-') || key.includes('/') || key.includes('doppelt')) {
        nationalityMap['Deutsch/Türkisch (Doppelte)'] = (nationalityMap['Deutsch/Türkisch (Doppelte)'] ?? 0) + (n?._count ?? 0);
      } else if (key.includes('deutsch') || key === 'de' || key === 'german') {
        nationalityMap['Deutsch'] = (nationalityMap['Deutsch'] ?? 0) + (n?._count ?? 0);
      } else if (key.includes('türk') || key.includes('turk') || key === 'tr') {
        nationalityMap['Türkisch'] = (nationalityMap['Türkisch'] ?? 0) + (n?._count ?? 0);
      } else {
        nationalityMap['Andere'] = (nationalityMap['Andere'] ?? 0) + (n?._count ?? 0);
      }
    }
    const nationalityData = Object.entries(nationalityMap).map(([name, value]) => ({ name, value }));

    const einzelmitgliedCount = activeMembers - familyMemberCount;

    const levelLabels: Record<string, string> = {
      STUDENT: 'Student',
      ERMAESSIGT: 'Ermäßigt',
      NORMAL: 'Normal',
      FAMILIE: 'Familie',
      PARTNER: 'Partner/in',
    };
    const beitragsstufeData = (beitragsstufen ?? []).map((b: any) => ({
      name: levelLabels[b?.contributionLevel] ?? b?.contributionLevel ?? 'Unbekannt',
      value: b?._count ?? 0,
    }));

    return NextResponse.json({
      totalMembers, activeMembers, familyCount,
      yearDonations: yearDonationSum?._sum?.amount ?? 0,
      yearContributions: yearContributionSum?._sum?.amount ?? 0,
      monthlyData, memberStatusData,
      genderData,
      nationalityData,
      beitragsstufeData,
      familyMemberCount,
      einzelmitgliedCount,
    });
  } catch (error: any) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
