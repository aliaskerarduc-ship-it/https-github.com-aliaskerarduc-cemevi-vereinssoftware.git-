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
    const memberId = searchParams.get('memberId');
    if (!memberId) return NextResponse.json({ error: 'memberId fehlt' }, { status: 400 });

    const [contributions, donations] = await Promise.all([
      prisma.contribution.findMany({ where: { memberId, deletedAt: null }, select: { amount: true, periodYear: true } }),
      prisma.donation.findMany({ where: { memberId, deletedAt: null }, select: { amount: true, date: true } }),
    ]);

    const totalBeitraege = contributions.reduce((s, c) => s + c.amount, 0);
    const totalSpenden = donations.reduce((s, d) => s + d.amount, 0);

    const yearMap = new Map<number, { beitraege: number; spenden: number }>();
    contributions.forEach(c => {
      const y = c.periodYear;
      if (!yearMap.has(y)) yearMap.set(y, { beitraege: 0, spenden: 0 });
      yearMap.get(y)!.beitraege += c.amount;
    });
    donations.forEach(d => {
      const y = new Date(d.date).getFullYear();
      if (!yearMap.has(y)) yearMap.set(y, { beitraege: 0, spenden: 0 });
      yearMap.get(y)!.spenden += d.amount;
    });

    const byYear = Array.from(yearMap.entries())
      .map(([year, v]) => ({ year, ...v }))
      .sort((a, b) => b.year - a.year);

    return NextResponse.json({ totalBeitraege, totalSpenden, byYear });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
