export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

const ASSOC_NAME = 'Alevitische Kulturgemeinde Duisburg und Umgebung e.V.';
const ASSOC_ADDR = 'Goethestrase 49, 47167 Duisburg';

function cleanText(text: string): string {
  return text.replace(/[ığüşöçİĞÜŞÖÇ]/g, (m) => {
    const map: Record<string, string> = {'i':'i','g':'g','u':'u','s':'s','o':'o','c':'c','I':'I','G':'G','U':'U','S':'S','O':'O','C':'C','ı':'i','ğ':'g','ü':'u','ş':'s','ö':'o','ç':'c'};
    return map[m] || m;
  });
}

const MONTH_NAMES = ['','Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ?? String(new Date().getFullYear());
    const fromMonth = parseInt(searchParams.get('fromMonth') ?? '1');
    const toMonth = parseInt(searchParams.get('toMonth') ?? '12');
    const today = new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });

    const fromDate = new Date(`${year}-${String(fromMonth).padStart(2,'0')}-01`);
    const toDate = new Date(parseInt(year), toMonth, 0); // son gün

    const [ausgaben, sumResult] = await Promise.all([
      prisma.ausgabe.findMany({ where: { date: { gte: fromDate, lte: toDate } }, orderBy: { date: 'asc' } }),
      prisma.ausgabe.aggregate({ where: { date: { gte: fromDate, lte: toDate } }, _sum: { amount: true } }),
    ]);

    const totalAmount = sumResult._sum.amount ?? 0;

    // Dönem başlığı
    let periodLabel = '';
    if (fromMonth === toMonth) {
      periodLabel = `${MONTH_NAMES[fromMonth]} ${year}`;
    } else if (fromMonth === 1 && toMonth === 3) periodLabel = `Q1 ${year} (Jan-Mrz)`;
    else if (fromMonth === 4 && toMonth === 6) periodLabel = `Q2 ${year} (Apr-Jun)`;
    else if (fromMonth === 7 && toMonth === 9) periodLabel = `Q3 ${year} (Jul-Sep)`;
    else if (fromMonth === 10 && toMonth === 12) periodLabel = `Q4 ${year} (Okt-Dez)`;
    else if (fromMonth === 1 && toMonth === 6) periodLabel = `1. Halbjahr ${year}`;
    else if (fromMonth === 7 && toMonth === 12) periodLabel = `2. Halbjahr ${year}`;
    else if (fromMonth === 1 && toMonth === 12) periodLabel = `Jahresbericht ${year}`;
    else periodLabel = `${MONTH_NAMES[fromMonth]}-${MONTH_NAMES[toMonth]} ${year}`;

    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const green = rgb(0.1, 0.36, 0.22);
    const black = rgb(0, 0, 0);
    const gray = rgb(0.5, 0.5, 0.5);
    const lightGray = rgb(0.85, 0.85, 0.85);
    const white = rgb(1, 1, 1);
    const red = rgb(0.7, 0.1, 0.1);
    const headerBg = rgb(0.92, 0.97, 0.93);

    const ROWS_PER_PAGE = 28;
    const totalPages = Math.ceil(Math.max(ausgaben.length, 1) / ROWS_PER_PAGE);

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const page = pdfDoc.addPage([595, 842]);
      const { width, height } = page.getSize();

      // Logo
      try {
        const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
        const logoBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedJpg(logoBytes);
        const logoDims = logoImage.scale(0.07);
        page.drawImage(logoImage, { x: 40, y: height - 80, width: logoDims.width, height: logoDims.height });
      } catch {}

      // Başlık
      page.drawText('Ausgabenliste', { x: 130, y: height - 45, size: 18, font: fontBold, color: green });
      page.drawText(periodLabel, { x: 130, y: height - 63, size: 12, font: fontBold, color: black });
      page.drawText(ASSOC_NAME, { x: 130, y: height - 78, size: 8, font: fontNormal, color: gray });

      // Sağ
      page.drawText(`Erstellt: ${today}`, { x: 430, y: height - 50, size: 9, font: fontNormal, color: gray });
      page.drawText(`Seite ${pageNum + 1} / ${totalPages}`, { x: 430, y: height - 63, size: 9, font: fontNormal, color: gray });

      // Çizgi
      page.drawLine({ start: { x: 40, y: height - 90 }, end: { x: width - 40, y: height - 90 }, thickness: 1.5, color: green });

      // Tablo başlık
      const tableY = height - 110;
      page.drawRectangle({ x: 40, y: tableY - 5, width: width - 80, height: 20, color: green });
      page.drawText('Nr.', { x: 43, y: tableY + 2, size: 9, font: fontBold, color: white });
      page.drawText('Datum', { x: 73, y: tableY + 2, size: 8, font: fontBold, color: white });
      page.drawText('Kategorie', { x: 125, y: tableY + 2, size: 8, font: fontBold, color: white });
      page.drawText('Lieferant', { x: 230, y: tableY + 2, size: 8, font: fontBold, color: white });
      page.drawText('Rechnungsnr', { x: 320, y: tableY + 2, size: 8, font: fontBold, color: white });
      page.drawText('Zahlung', { x: 420, y: tableY + 2, size: 8, font: fontBold, color: white });
      page.drawText('Betrag', { x: 495, y: tableY + 2, size: 8, font: fontBold, color: white });

      // Satırlar
      const pageAusgaben = ausgaben.slice(pageNum * ROWS_PER_PAGE, (pageNum + 1) * ROWS_PER_PAGE);
      pageAusgaben.forEach((a: any, idx: number) => {
        const rowY = tableY - 18 - idx * 18;
        if (idx % 2 === 0) page.drawRectangle({ x: 40, y: rowY - 4, width: width - 80, height: 16, color: headerBg });
        const dateStr = new Date(a.date).toLocaleDateString('de-DE', { timeZone: 'UTC' });
        page.drawText(String(a.ausgabeNumber), { x: 43, y: rowY, size: 7, font: fontNormal, color: gray });
        page.drawText(dateStr, { x: 73, y: rowY, size: 7, font: fontNormal, color: black });
        page.drawText(cleanText(a.category ?? '').substring(0, 20), { x: 125, y: rowY, size: 7, font: fontNormal, color: black });
        page.drawText(cleanText(a.lieferant ?? '').substring(0, 17), { x: 230, y: rowY, size: 7, font: fontNormal, color: black });
        page.drawText(cleanText(a.rechnungsNummer ?? '').substring(0, 18), { x: 320, y: rowY, size: 7, font: fontNormal, color: gray });
        page.drawText((a.paymentMethod ?? '').substring(0, 10), { x: 420, y: rowY, size: 7, font: fontNormal, color: black });
        page.drawText(`${a.amount.toFixed(2)} EUR`, { x: 495, y: rowY, size: 7, font: fontBold, color: red });
        page.drawLine({ start: { x: 40, y: rowY - 5 }, end: { x: width - 40, y: rowY - 5 }, thickness: 0.3, color: lightGray });
      });

      // Son sayfada toplam
      if (pageNum === totalPages - 1) {
        const lastRowY = tableY - 18 - pageAusgaben.length * 18 - 8;
        page.drawRectangle({ x: 40, y: lastRowY - 6, width: width - 80, height: 20, color: green });
        page.drawText('GESAMT', { x: 43, y: lastRowY, size: 10, font: fontBold, color: white });
        page.drawText(`${ausgaben.length} Ausgaben`, { x: 133, y: lastRowY, size: 9, font: fontNormal, color: white });
        page.drawText(`${totalAmount.toFixed(2)} EUR`, { x: 495, y: lastRowY, size: 10, font: fontBold, color: white });
      }

      // Alt bilgi
      page.drawLine({ start: { x: 40, y: 35 }, end: { x: width - 40, y: 35 }, thickness: 0.5, color: lightGray });
      page.drawText(`${ASSOC_NAME} · ${ASSOC_ADDR}`, { x: 40, y: 22, size: 7, font: fontNormal, color: gray });
    }

    const pdfBytes = await pdfDoc.save();
    const filename = `ausgaben_${periodLabel.replace(/\s+/g, '_')}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${new URL(request.url).searchParams.get('inline') ? 'inline' : 'attachment'}; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Ausgaben PDF error:', error);
    return NextResponse.json({ error: 'PDF fehlgeschlagen: ' + error.message }, { status: 500 });
  }
}
