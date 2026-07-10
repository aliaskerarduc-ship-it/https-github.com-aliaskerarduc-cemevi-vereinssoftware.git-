export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { memberId, familyId, typ, fromDate, toDate } = await request.json();
    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59);

    // Familie veya Einzelmitglied
    let members: any[] = [];
    let member: any = null;
    let memberIds: string[] = [];

    if (typ === 'familie' && familyId) {
      const family = await prisma.family.findUnique({
        where: { id: familyId },
        include: { members: true },
      });
      if (!family) return NextResponse.json({ error: 'Familie nicht gefunden' }, { status: 404 });
      members = family.members;
      memberIds = members.map((m: any) => m.id);
      // Aile temsilcisi olarak ilk üyeyi kullan
      member = members[0];
      member = { ...member, familyName: family.familyName, isFamily: true, familyMembers: members };
    } else {
      member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member) return NextResponse.json({ error: 'Mitglied nicht gefunden' }, { status: 404 });
      memberIds = [memberId];
    }

    const [donations, contributions] = await Promise.all([
      prisma.donation.findMany({
        where: { memberId: { in: memberIds }, date: { gte: from, lte: to } },
        orderBy: { date: 'asc' },
      }),
      prisma.contribution.findMany({
        where: { memberId: { in: memberIds }, paymentDate: { gte: from, lte: to } },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const spenden = donations.reduce((s, d) => s + (d.amount ?? 0), 0);
    const beitraege = contributions.reduce((s, c) => s + (c.amount ?? 0), 0);
    const gesamt = spenden + beitraege;

    const fromStr = from.toLocaleDateString('de-DE', { timeZone: 'UTC' });
    const toStr = to.toLocaleDateString('de-DE', { timeZone: 'UTC' });
    const today = new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });

    // Zuwendungs-Nummer: ZB-JJJJ-MITGLIEDSNR
    const year = from.getFullYear();
    const zuwendungsNr = `ZB-${year}-${String(member.memberNumber).padStart(5, '0')}`;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const green = rgb(0.1, 0.36, 0.22);
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.8, 0.8, 0.8);
    const lightGreen = rgb(0.9, 0.97, 0.93);

    // Logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedJpg(logoBytes);
      const logoDims = logoImage.scale(0.07);
      page.drawImage(logoImage, { x: 60, y: height - 75, width: logoDims.width, height: logoDims.height });
    } catch (e) { console.log('Logo yuklenemedi:', e); }

    let y = height - 60;

    // Başlık
    page.drawText('Zuwendungsbestatigung', { x: 175, y, size: 18, font: fontBold, color: green });
    y -= 18;
    page.drawText('im Sinne des SS 10b EStG und SS 9 Abs. 1 Nr. 2 KStG', { x: 175, y, size: 9, font: fontNormal, color: gray });

    // Zuwendungs-Nr sağ üstte
    page.drawText(`Nr: ${zuwendungsNr}`, { x: 400, y: height - 40, size: 9, font: fontBold, color: green });

    y = height - 90;
    page.drawLine({ start: { x: 60, y }, end: { x: 535, y }, thickness: 1.5, color: green });
    y -= 20;

    // Dernek
    page.drawText('Aussteller:', { x: 60, y, size: 11, font: fontBold, color: black });
    y -= 16;
    page.drawText('Alevitische Kulturgemeinde Duisburg und Umgebung e.V.', { x: 60, y, size: 10, font: fontNormal, color: black });
    y -= 14;
    page.drawText('Goethestrase 49, 47167 Duisburg', { x: 60, y, size: 10, font: fontNormal, color: black });
    y -= 14;
    page.drawText('www.akm-duisburg.de', { x: 60, y, size: 10, font: fontNormal, color: black });
    y -= 24;

    // Üye
    page.drawText('Zuwendender:', { x: 60, y, size: 11, font: fontBold, color: black });
    y -= 16;
    if (member.isFamily) {
      const nameList = member.familyMembers.map((m: any) => `${m.firstName} ${m.lastName}`).join(' & ');
      page.drawText(`Familie ${member.familyName}: ${nameList}`, { x: 60, y, size: 10, font: fontNormal, color: black });
      y -= 14;
      if (member.street || member.zipCode || member.city) {
        page.drawText(`${member.street ?? ''} ${member.zipCode ?? ''} ${member.city ?? ''}`.trim(), { x: 60, y, size: 10, font: fontNormal, color: black });
        y -= 14;
      }
    } else {
      page.drawText(`${member.firstName} ${member.lastName}`, { x: 60, y, size: 10, font: fontNormal, color: black });
      y -= 14;
      if (member.street || member.zipCode || member.city) {
        page.drawText(`${member.street ?? ''} ${member.zipCode ?? ''} ${member.city ?? ''}`.trim(), { x: 60, y, size: 10, font: fontNormal, color: black });
        y -= 14;
      }
      page.drawText(`Mitgliedsnummer: ${member.memberNumber}`, { x: 60, y, size: 10, font: fontNormal, color: black });
    }
    y -= 24;

    // Dönem
    page.drawText('Zeitraum:', { x: 60, y, size: 11, font: fontBold, color: black });
    y -= 16;
    page.drawText(`${fromStr} bis ${toStr}`, { x: 60, y, size: 10, font: fontNormal, color: black });
    y -= 20;

    // Beiträge listesi
    if (contributions.length > 0) {
      page.drawLine({ start: { x: 60, y }, end: { x: 535, y }, thickness: 0.5, color: lightGray });
      y -= 14;
      page.drawText('Mitgliedsbeitraege:', { x: 60, y, size: 10, font: fontBold, color: black });
      y -= 14;
      for (const c of contributions) {
        const dateStr = new Date(c.paymentDate).toLocaleDateString('de-DE', { timeZone: 'UTC' });
        const period = `${String(c.periodMonth).padStart(2,'0')}/${c.periodYear}`;
        page.drawText(`Nr.${c.contributionNumber}  ${dateStr}  Zeitraum: ${period}`, { x: 70, y, size: 9, font: fontNormal, color: black });
        page.drawText(`${c.amount.toFixed(2)} EUR`, { x: 460, y, size: 9, font: fontNormal, color: black });
        y -= 12;
      }
      page.drawText(`Summe Beitraege:`, { x: 70, y, size: 9, font: fontBold, color: black });
      page.drawText(`${beitraege.toFixed(2)} EUR`, { x: 460, y, size: 9, font: fontBold, color: black });
      y -= 16;
    }

    // Spenden listesi
    if (donations.length > 0) {
      page.drawLine({ start: { x: 60, y }, end: { x: 535, y }, thickness: 0.5, color: lightGray });
      y -= 14;
      page.drawText('Spenden:', { x: 60, y, size: 10, font: fontBold, color: black });
      y -= 14;
      for (const d of donations) {
        const dateStr = new Date(d.date).toLocaleDateString('de-DE', { timeZone: 'UTC' });
        const purpose = d.purpose ? `  ${d.purpose}` : '';
        page.drawText(`Nr.${d.donationNumber}  ${dateStr}${purpose}`, { x: 70, y, size: 9, font: fontNormal, color: black });
        page.drawText(`${d.amount.toFixed(2)} EUR`, { x: 460, y, size: 9, font: fontNormal, color: black });
        y -= 12;
      }
      page.drawText(`Summe Spenden:`, { x: 70, y, size: 9, font: fontBold, color: black });
      page.drawText(`${spenden.toFixed(2)} EUR`, { x: 460, y, size: 9, font: fontBold, color: black });
      y -= 16;
    }

    // Gesamtsumme
    page.drawLine({ start: { x: 60, y }, end: { x: 535, y }, thickness: 1, color: green });
    y -= 16;
    page.drawRectangle({ x: 60, y: y - 4, width: 475, height: 22, color: lightGreen });
    page.drawText('Gesamtsumme:', { x: 65, y, size: 12, font: fontBold, color: green });
    page.drawText(`${gesamt.toFixed(2)} EUR`, { x: 440, y, size: 12, font: fontBold, color: green });
    y -= 30;

    // Açıklama
    page.drawText('Wir bestatigen, dass die Zuwendung nur zur Foerderung der im Freistellungsbescheid', { x: 60, y, size: 9, font: fontNormal, color: gray });
    y -= 13;
    page.drawText('aufgefuehrten Zwecke verwendet wird. Verzicht auf Erstattung: Nein', { x: 60, y, size: 9, font: fontNormal, color: gray });
    y -= 40;

    // İmza
    page.drawText(`Duisburg, den ${today}`, { x: 60, y, size: 10, font: fontNormal, color: black });
    y -= 50;
    page.drawLine({ start: { x: 60, y }, end: { x: 250, y }, thickness: 0.5, color: black });
    y -= 12;
    page.drawText('Unterschrift / Stempel', { x: 60, y, size: 9, font: fontNormal, color: gray });

    // Alt bilgi
    page.drawLine({ start: { x: 60, y: 45 }, end: { x: 535, y: 45 }, thickness: 0.5, color: lightGray });
    page.drawText('Alevitische Kulturgemeinde Duisburg und Umgebung e.V. - Goethestrase 49 - 47167 Duisburg', { x: 60, y: 30, size: 8, font: fontNormal, color: gray });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="zuwendungsbestaetigung_${zuwendungsNr}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Zuwendung error:', error);
    return NextResponse.json({ error: 'PDF-Erstellung fehlgeschlagen: ' + error.message }, { status: 500 });
  }
}
