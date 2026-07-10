// app/api/datev/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// DATEV Buchungsstapel Header
function buchungsstapelHeader(berater: string, mandant: string, year: number, month: number) {
  const von = `${String(month).padStart(2,'0')}${year}`;
  const bis = `${String(month).padStart(2,'0')}${year}`;
  return `"EXTF";510;21;"Buchungsstapel";7;${new Date().toISOString().replace(/[-:T.]/g,'').slice(0,14)};;"RE";"";1;${berater};${mandant};${year};4;${von};${bis};"";"";"";"";"";"";"";"";"";"";"";"";""\r\n`;
}

// DATEV Kassenbuch Header  
function kassenbuchHeader(berater: string, mandant: string, year: number, month: number) {
  const von = `${String(month).padStart(2,'0')}${year}`;
  return `"EXTF";510;21;"Kassenbuch";1;${new Date().toISOString().replace(/[-:T.]/g,'').slice(0,14)};;"KB";"";1;${berater};${mandant};${year};4;${von};${von};"";"";"";"";"";"";"";"";"";"";"";"";""\r\n`;
}

const BUCHUNGSSTAPEL_COLS = `"Umsatz (ohne Soll/Haben-Kz)";"Soll/Haben-Kennzeichen";"WKZ Umsatz";"Kurs";"Basis-Umsatz";"WKZ Basis-Umsatz";"Konto";"Gegenkonto (ohne BU-Schlüssel)";"BU-Schlüssel";"Belegdatum";"Belegfeld 1";"Belegfeld 2";"Skonto";"Buchungstext"\r\n`;

const KASSENBUCH_COLS = `"Umsatz";"Soll/Haben";"Kurs";"Basis-Umsatz";"WKZ";"Datum";"Belegfeld 1";"Belegfeld 2";"Buchungstext";"Kostenstelle"\r\n`;

function formatDate(d: Date) {
  return `${String(d.getUTCDate()).padStart(2,'0')}${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}

function formatAmount(n: number) {
  return n.toFixed(2).replace('.', ',');
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1));
    const format = searchParams.get('format') ?? 'buchungsstapel'; // buchungsstapel | kassenbuch
    const berater = searchParams.get('berater') ?? '1001';
    const mandant = searchParams.get('mandant') ?? '1';

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Tüm verileri çek
    const [ausgaben, spenden, beitraege] = await Promise.all([
      prisma.ausgabe.findMany({ where: { date: { gte: startDate, lte: endDate } }, orderBy: { date: 'asc' } }),
      prisma.donation.findMany({ where: { date: { gte: startDate, lte: endDate } }, orderBy: { date: 'asc' } }),
      prisma.contribution.findMany({ where: { paymentDate: { gte: startDate, lte: endDate } }, orderBy: { paymentDate: 'asc' } }),
    ]);

    let csv = '';

    if (format === 'buchungsstapel') {
      csv = buchungsstapelHeader(berater, mandant, year, month);
      csv += BUCHUNGSSTAPEL_COLS;

      // Ausgaben → Soll (S)
      for (const a of ausgaben) {
        const d = formatDate(new Date(a.date));
        csv += `${formatAmount(a.amount)};"S";"EUR";"";"";"";4000;1200;"";${d};"${a.ausgabeNumber}";"";"";"${a.category} - ${a.description ?? ''}"\r\n`;
      }

      // Spenden → Haben (H) - Einnahmen
      for (const s of spenden) {
        const d = formatDate(new Date(s.date));
        const text = s.purpose ?? 'Spende';
        csv += `${formatAmount(s.amount)};"H";"EUR";"";"";"";1200;8600;"";${d};"${s.donationNumber}";"";"";"${text}"\r\n`;
      }

      // Beiträge → Haben (H) - Einnahmen
      for (const b of beitraege) {
        const d = formatDate(new Date(b.paymentDate));
        csv += `${formatAmount(b.amount)};"H";"EUR";"";"";"";1200;8400;"";${d};"${b.contributionNumber}";"";"";"Mitgliedsbeitrag ${b.periodMonth}/${b.periodYear}"\r\n`;
      }

    } else {
      // KASSENBUCH
      csv = kassenbuchHeader(berater, mandant, year, month);
      csv += KASSENBUCH_COLS;

      // Alle BAR Transaktionen
      const barAusgaben = ausgaben.filter(a => a.paymentMethod === 'BAR');
      const barSpenden = spenden.filter(s => s.paymentMethod === 'BAR');
      const barBeitraege = beitraege.filter(b => b.paymentMethod === 'BAR');

      for (const a of barAusgaben) {
        const d = new Date(a.date).toLocaleDateString('de-DE', { timeZone: 'UTC' });
        csv += `${formatAmount(a.amount)};"S";"";"";"EUR";${d};"${a.ausgabeNumber}";"";\"${a.category} - ${a.description ?? ''}";""\r\n`;
      }

      for (const s of barSpenden) {
        const d = new Date(s.date).toLocaleDateString('de-DE', { timeZone: 'UTC' });
        csv += `${formatAmount(s.amount)};"H";"";"";"EUR";${d};"${s.donationNumber}";"";\"${s.purpose ?? 'Spende'}";""\r\n`;
      }

      for (const b of barBeitraege) {
        const d = new Date(b.paymentDate).toLocaleDateString('de-DE', { timeZone: 'UTC' });
        csv += `${formatAmount(b.amount)};"H";"";"";"EUR";${d};"${b.contributionNumber}";"";\"Mitgliedsbeitrag ${b.periodMonth}/${b.periodYear}";""\r\n`;
      }
    }

    const filename = `DATEV_${format}_${year}_${String(month).padStart(2,'0')}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (e: any) {
    console.error('DATEV ERROR:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
