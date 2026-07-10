export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'VORSTAND'].includes((session.user as any)?.role ?? '')) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    if (!file || !type) return NextResponse.json({ error: 'Datei und Typ erforderlich' }, { status: 400 });

    const text = await file.text();
    const lines = text.split('\n').filter((l: string) => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: 'Datei ist leer oder hat keine Daten' }, { status: 400 });

    const sep = lines[0].includes('\t') ? '\t' : ';';
    const headers = lines[0].split(sep).map((h: string) => h.trim().toLowerCase());
    let imported = 0;

    if (type === 'members') {
      // Tarih parse: "15.03.1971" → Date
      const parseDate = (str: string): Date | null => {
        if (!str) return null;
        const parts = str.trim().split('.');
        if (parts.length !== 3) return null;
        let yr = parseInt(parts[2]);
        if (yr < 100) yr = yr > 30 ? 1900 + yr : 2000 + yr;
        const d = new Date(yr, parseInt(parts[1]) - 1, parseInt(parts[0]));
        return isNaN(d.getTime()) ? null : d;
      };
      const GENDERS: Record<string, string> = { 'maennlich':'MAENNLICH','männlich':'MAENNLICH','m':'MAENNLICH','weiblich':'WEIBLICH','w':'WEIBLICH' };
      const STATUSES: Record<string, string> = { 'aktiv':'AKTIV','passiv':'PASSIV','ausgetreten':'AUSGETRETEN' };
      const LEVELS: Record<string, string> = { 'student':'STUDENT','ermaessigt':'ERMAESSIGT','ermäßigt':'ERMAESSIGT','normal':'NORMAL','familie':'FAMILIE','partner':'PARTNER','partner/in':'PARTNER' };
      for (let i = 1; i < lines.length; i++) {
        const sep = lines[0].includes('\t') ? '\t' : ';';
        const values = lines[i].split(sep).map((v: string) => v.trim());
        const row: any = {};
        headers.forEach((h: string, idx: number) => { row[h] = values[idx] ?? ''; });
        if (!row.vorname && !row.nachname) continue;
        try {
          const birthDate = parseDate(row.geburtsdatum || row.birthdate || '');
          const entryDate = parseDate(row.eintrittsdatum || row.entrydate || '');
          const exitDate = parseDate(row.austrittsdatum || row.exitdate || '');
          await prisma.member.create({
            data: {
              firstName: row.vorname || row.firstname || 'Unbekannt',
              lastName: row.nachname || row.lastname || 'Unbekannt',
              birthDate: birthDate,
              gender: (GENDERS[(row.geschlecht || '').toLowerCase()] as any) || null,
              nationality: row.nationalitaet || row['nationalität'] || row.nationality || null,
              street: row.strasse || row['straße'] || row.street || null,
              zipCode: row.plz || row.zipcode || null,
              city: row.ort || row.stadt || row.city || null,
              phone: row.telefon || row.phone || null,
              email: row.email || null,
              entryDate: entryDate || new Date(),
              exitDate: exitDate,
              status: (STATUSES[(row.status || '').toLowerCase()] as any) || 'AKTIV',
              contributionLevel: (LEVELS[(row.beitragsstufe || '').toLowerCase()] as any) || 'NORMAL',
              notes: row.notiz || row.bemerkung || row.notes || null,
            },
          });
          imported++;
        } catch { /* skip duplicates */ }
      }
    } else if (type === 'donations') {
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map((v: string) => v.trim());
        const row: any = {};
        headers.forEach((h: string, idx: number) => { row[h] = values[idx] ?? ''; });
        const memberNumber = parseInt(row.mitgliedsnr || row.membernumber || '0');
        if (!memberNumber) continue;
        const member = await prisma.member.findUnique({ where: { memberNumber } });
        if (!member) continue;
        try {
          await prisma.donation.create({
            data: {
              memberId: member.id,
              date: row.datum ? new Date(row.datum) : new Date(),
              amount: parseFloat(row.betrag || row.amount || '0'),
              paymentMethod: 'BAR',
              purpose: row.zweck || row.purpose || null,
            },
          });
          imported++;
        } catch { /* skip */ }
      }
    } else if (type === 'contributions') {
      const MONTHS: Record<string, number> = {
        'jan':1,'feb':2,'mär':3,'mar':3,'apr':4,'mai':5,'jun':6,
        'jul':7,'aug':8,'sep':9,'okt':10,'nov':11,'dez':12,
        'januar':1,'februar':2,'märz':3,'april':4,'juni':6,
        'juli':7,'august':8,'september':9,'oktober':10,'november':11,'dezember':12
      };
      const METHODS: Record<string, string> = {
        'ueberweisung':'UEBERWEISUNG','überweisung':'UEBERWEISUNG','bar':'BAR','lastschrift':'LASTSCHRIFT'
      };
      for (let i = 1; i < lines.length; i++) {
        const sep2 = lines[0].includes('\t') ? '\t' : ';';
        const values = lines[i].split(sep2).map((v: string) => v.trim());
        const row: any = {};
        headers.forEach((h: string, idx: number) => { row[h] = values[idx] ?? ''; });
        const mitgliedStr = (row.mitglied || '').trim();
        if (!mitgliedStr) continue;
        // İsimle üye bul
        const parts = mitgliedStr.split(' ');
        let member = null;
        if (parts.length >= 2) {
          const firstName = parts.slice(1).join(' ');
          const lastName = parts[0];
          member = await prisma.member.findFirst({ where: { lastName, firstName } });
          if (!member) {
            // Ters sırada dene: "Ali Asker Arduc" → firstName: Ali Asker, lastName: Arduc
            const ln = parts[parts.length - 1];
            const fn = parts.slice(0, parts.length - 1).join(' ');
            member = await prisma.member.findFirst({ where: { lastName: ln, firstName: fn } });
          }
        }
        if (!member) continue;
        // Zeitraum: "Mai 17" veya "Mai 2017"
        const zeitraum = (row.zeitraum || '').trim().toLowerCase();
        const zpParts = zeitraum.split(' ');
        let month = 1;
        let year = new Date().getFullYear();
        if (zpParts.length >= 2) {
          month = MONTHS[zpParts[0]] || 1;
          const yr = parseInt(zpParts[1]);
          year = yr < 100 ? 2000 + yr : yr;
        }
        // Zahlungsdatum: "01.05.17"
        const datumStr = (row.zahlungsdatum || row.datum || '').trim();
        let paymentDate = new Date();
        if (datumStr) {
          const dp = datumStr.split('.');
          if (dp.length === 3) {
            const dy = parseInt(dp[2]) < 100 ? 2000 + parseInt(dp[2]) : parseInt(dp[2]);
            paymentDate = new Date(dy, parseInt(dp[1]) - 1, parseInt(dp[0]));
          }
        }
        const paymentMethod = METHODS[(row.zahlungsart || '').toLowerCase()] || 'BAR';
        const amount = parseFloat((row.betrag || '0').replace(',', '.'));
        try {
          await prisma.contribution.create({
            data: { memberId: member.id, paymentDate, periodMonth: month, periodYear: year, amount, paymentMethod: paymentMethod as any },
          });
          imported++;
        } catch { /* skip duplicates */ }
      }
    }

    return NextResponse.json({ imported });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import fehlgeschlagen' }, { status: 500 });
  }
}
