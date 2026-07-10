export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const donationId = searchParams.get('id');
    if (!donationId) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });

    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: { member: true },
    });
    if (!donation) return NextResponse.json({ error: 'Spende nicht gefunden' }, { status: 404 });

    const today = new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });
    const donationDate = new Date(donation.date).toLocaleDateString('de-DE', { timeZone: 'UTC' });

    const donorName = donation.externalDonorName
      ? donation.externalDonorName
      : donation.member ? `${donation.member.firstName} ${donation.member.lastName}` : '—';

    const donorAddress = donation.externalDonorAddress
      ? donation.externalDonorAddress
      : donation.member ? `${donation.member.street ?? ''} ${donation.member.zipCode ?? ''} ${donation.member.city ?? ''}`.trim() : '';

    const memberNumber = donation.member ? `Mitgl.-Nr.: ${donation.member.memberNumber}` : 'Kein Mitglied';

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
    } catch (e) { }

    let y = height - 55;

    // Başlık
    page.drawText('Spendenquittung', { x: 175, y, size: 20, font: fontBold, color: green });
    y -= 18;
    page.drawText('Alevitische Kulturgemeinde Duisburg und Umgebung e.V.', { x: 175, y, size: 9, font: fontNormal, color: gray });

    // Nr sağ üstte
    page.drawText(`Nr. ${donation.donationNumber}`, { x: 440, y: height - 40, size: 10, font: fontBold, color: green });

    y = height - 90;
    page.drawLine({ start: { x: 60, y }, end: { x: 535, y }, thickness: 1.5, color: green });
    y -= 20;

    // Dernek bilgileri
    page.drawText('Aussteller:', { x: 60, y, size: 11, font: fontBold, color: black });
    y -= 16;
    page.drawText('Alevitische Kulturgemeinde Duisburg und Umgebung e.V.', { x: 60, y, size: 10, font: fontNormal, color: black });
    y -= 14;
    page.drawText('Goethestrase 49, 47167 Duisburg', { x: 60, y, size: 10, font: fontNormal, color: black });
    y -= 14;
    page.drawText('www.akm-duisburg.de', { x: 60, y, size: 10, font: fontNormal, color: black });
    y -= 24;

    // Spender bilgileri
    page.drawText('Spender:', { x: 60, y, size: 11, font: fontBold, color: black });
    y -= 16;
    page.drawText(donorName, { x: 60, y, size: 10, font: fontNormal, color: black });
    y -= 14;
    if (donorAddress) {
      page.drawText(donorAddress, { x: 60, y, size: 10, font: fontNormal, color: black });
      y -= 14;
    }
    page.drawText(memberNumber, { x: 60, y, size: 10, font: fontNormal, color: gray });
    y -= 24;

    // Spende detayları
    page.drawLine({ start: { x: 60, y }, end: { x: 535, y }, thickness: 0.5, color: lightGray });
    y -= 16;

    // Yeşil kutu — tutar
    page.drawRectangle({ x: 60, y: y - 8, width: 475, height: 36, color: lightGreen });
    page.drawText('Gespendeter Betrag:', { x: 70, y, size: 12, font: fontBold, color: green });
    page.drawText(`${donation.amount.toFixed(2)} EUR`, { x: 400, y, size: 16, font: fontBold, color: green });
    y -= 30;

    page.drawLine({ start: { x: 60, y }, end: { x: 535, y }, thickness: 0.5, color: lightGray });
    y -= 20;

    // Detaylar tablosu
    const drawRow = (label: string, value: string) => {
      page.drawText(label, { x: 60, y, size: 10, font: fontBold, color: black });
      page.drawText(value, { x: 200, y, size: 10, font: fontNormal, color: black });
      y -= 16;
    };

    drawRow('Datum:', donationDate);
    drawRow('Zahlungsart:', donation.paymentMethod ?? '—');
    if (donation.purpose) drawRow('Verwendungszweck:', donation.purpose);
    if (donation.notes) drawRow('Bemerkungen:', donation.notes);

    y -= 20;
    page.drawLine({ start: { x: 60, y }, end: { x: 535, y }, thickness: 0.5, color: lightGray });
    y -= 20;

    // Açıklama
    page.drawText('Vielen Dank fur Ihre Spende!', { x: 60, y, size: 11, font: fontBold, color: green });
    y -= 16;
    page.drawText('Diese Quittung bestatigt den Eingang Ihrer Spende.', { x: 60, y, size: 9, font: fontNormal, color: gray });
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
        'Content-Disposition': `inline; filename="spendenquittung_${donation.donationNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Spendenquittung error:', error);
    return NextResponse.json({ error: 'PDF fehlgeschlagen: ' + error.message }, { status: 500 });
  }
}
