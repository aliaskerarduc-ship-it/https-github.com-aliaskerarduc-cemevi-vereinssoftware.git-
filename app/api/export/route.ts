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
    const type = searchParams.get('type') ?? 'members';
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));

    let csv = '';
    if (type === 'members') {
      const members = await prisma.member.findMany({ include: { family: true }, orderBy: { memberNumber: 'asc' } });
      csv = 'Mitgliedsnr;Vorname;Nachname;Geburtsdatum;Geschlecht;Strasse;PLZ;Ort;Telefon;Email;Status;Beitragsstufe;Eintrittsdatum;Familie\n';
      (members ?? []).forEach((m: any) => {
        csv += `${m?.memberNumber};${m?.firstName};${m?.lastName};${m?.birthDate ? new Date(m.birthDate).toLocaleDateString('de-DE',{timeZone:'UTC'}) : ''};${m?.gender ?? ''};${m?.street ?? ''};${m?.zipCode ?? ''};${m?.city ?? ''};${m?.phone ?? ''};${m?.email ?? ''};${m?.status};${m?.contributionLevel};${new Date(m?.entryDate).toLocaleDateString('de-DE',{timeZone:'UTC'})};${m?.family?.familyName ?? ''}\n`;
      });
    } else if (type === 'donations') {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      const donations = await prisma.donation.findMany({ where: { date: { gte: startDate, lte: endDate } }, include: { member: true }, orderBy: { date: 'desc' } });
      csv = 'Spendennr;Mitglied;Datum;Betrag;Zahlungsart;Zweck\n';
      (donations ?? []).forEach((d: any) => {
        csv += `${d?.donationNumber};${d?.member?.firstName} ${d?.member?.lastName};${new Date(d?.date).toLocaleDateString('de-DE',{timeZone:'UTC'})};${d?.amount?.toFixed?.(2)};${d?.paymentMethod};${d?.purpose ?? ''}\n`;
      });
    } else if (type === 'contributions') {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      const contributions = await prisma.contribution.findMany({ where: { paymentDate: { gte: startDate, lte: endDate } }, include: { member: true }, orderBy: { paymentDate: 'desc' } });
      csv = 'Beitragsnr;Mitglied;Zeitraum;Betrag;Zahlungsart;Zahlungsdatum\n';
      (contributions ?? []).forEach((c: any) => {
        csv += `${c?.contributionNumber};${c?.member?.firstName} ${c?.member?.lastName};${String(c?.periodMonth).padStart(2,'0')}/${c?.periodYear};${c?.amount?.toFixed?.(2)};${c?.paymentMethod};${new Date(c?.paymentDate).toLocaleDateString('de-DE',{timeZone:'UTC'})}\n`;
      });
    }

    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${type}_${year}.csv"` },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
