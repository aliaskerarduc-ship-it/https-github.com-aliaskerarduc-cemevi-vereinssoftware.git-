export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

const ASSOC_NAME = "Alevitische Kulturgemeinde Duisburg und Umgebung e.V.";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    if (!meetingId) return NextResponse.json({ error: 'Meeting ID fehlt' }, { status: 400 });

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        attendances: {
          where: { checkedIn: true },
          include: {
            member: {
              select: {
                memberNumber: true,
                firstName: true,
                lastName: true,
                street: true,
                zipCode: true,
                city: true,
              }
            }
          },
          orderBy: { member: { memberNumber: 'asc' } }
        }
      }
    });

    if (!meeting) return NextResponse.json({ error: 'Versammlung nicht gefunden' }, { status: 404 });

    const meetingDate = new Date(meeting.date).toLocaleDateString('de-DE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
    const today = new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });

    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const green = rgb(0.1, 0.36, 0.22);
    const black = rgb(0, 0, 0);
    const gray = rgb(0.5, 0.5, 0.5);
    const lightGray = rgb(0.85, 0.85, 0.85);
    const white = rgb(1, 1, 1);
    const headerBg = rgb(0.92, 0.97, 0.93);

    const ROWS_PER_PAGE = 20;
    const attendances = meeting.attendances;
    const totalPages = Math.ceil(Math.max(attendances.length, 1) / ROWS_PER_PAGE);

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const page = pdfDoc.addPage([842, 595]); // A4 Landscape
      const { width, height } = page.getSize();

      // Logo
      try {
        const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
        const logoBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedJpg(logoBytes);
        const logoDims = logoImage.scale(0.06);
        page.drawImage(logoImage, { x: 30, y: height - 70, width: logoDims.width, height: logoDims.height });
      } catch {}

      // Başlık
      page.drawText('Anwesenheitsliste', { x: 110, y: height - 40, size: 18, font: fontBold, color: green });
      page.drawText('Mitgliederversammlung', { x: 110, y: height - 58, size: 11, font: fontNormal, color: gray });

      // Toplantı bilgileri sağda
      page.drawText(`Versammlung: ${meeting.title}`, { x: 480, y: height - 35, size: 10, font: fontBold, color: black });
      page.drawText(`Datum: ${meetingDate}`, { x: 480, y: height - 50, size: 10, font: fontNormal, color: black });
      page.drawText(`${ASSOC_NAME}`, { x: 480, y: height - 65, size: 8, font: fontNormal, color: gray });
      page.drawText(`Seite ${pageNum + 1} von ${totalPages}`, { x: 480, y: height - 78, size: 8, font: fontNormal, color: gray });

      // Yatay çizgi
      page.drawLine({ start: { x: 30, y: height - 85 }, end: { x: width - 30, y: height - 85 }, thickness: 1.5, color: green });

      // Tablo başlıkları
      const y = height - 105;
      const cols = [
        { x: 30, w: 60, label: 'Mitgl.-Nr.' },
        { x: 95, w: 110, label: 'Nachname' },
        { x: 210, w: 110, label: 'Vorname' },
        { x: 325, w: 220, label: 'Adresse' },
        { x: 550, w: 60, label: 'PLZ' },
        { x: 615, w: 100, label: 'Stadt' },
        { x: 720, w: 92, label: 'Unterschrift' },
      ];

      // Başlık satırı arka planı
      page.drawRectangle({ x: 30, y: y - 5, width: width - 60, height: 20, color: green });
      cols.forEach(col => {
        page.drawText(col.label, { x: col.x + 3, y: y + 2, size: 9, font: fontBold, color: white });
      });

      // Satırlar
      const pageAttendances = attendances.slice(pageNum * ROWS_PER_PAGE, (pageNum + 1) * ROWS_PER_PAGE);
      
      pageAttendances.forEach((att: any, idx: number) => {
        const rowY = y - 22 - idx * 22;
        const isEven = idx % 2 === 0;

        if (isEven) {
          page.drawRectangle({ x: 30, y: rowY - 6, width: width - 60, height: 20, color: headerBg });
        }

        const m = att.member;
        const addr = [m.street].filter(Boolean).join('');

        page.drawText(String(m.memberNumber ?? ''), { x: 33, y: rowY, size: 8, font: fontNormal, color: black });
        page.drawText((m.lastName ?? '').substring(0, 16), { x: 98, y: rowY, size: 8, font: fontNormal, color: black });
        page.drawText((m.firstName ?? '').substring(0, 16), { x: 213, y: rowY, size: 8, font: fontNormal, color: black });
        page.drawText(addr.substring(0, 30), { x: 328, y: rowY, size: 8, font: fontNormal, color: black });
        page.drawText((m.zipCode ?? '').substring(0, 8), { x: 553, y: rowY, size: 8, font: fontNormal, color: black });
        page.drawText((m.city ?? '').substring(0, 14), { x: 618, y: rowY, size: 8, font: fontNormal, color: black });

        // İmza alanı veya mevcut imza
        if (att.signatureData) {
          try {
            const base64Data = att.signatureData.replace(/^data:image\/png;base64,/, '');
            const sigBytes = Buffer.from(base64Data, 'base64');
            pdfDoc.embedPng(sigBytes).then(sigImg => {
              const sigDims = sigImg.scaleToFit(85, 18);
              page.drawImage(sigImg, { x: 723, y: rowY - 4, width: sigDims.width, height: sigDims.height });
            }).catch(() => {
              page.drawLine({ start: { x: 723, y: rowY }, end: { x: 808, y: rowY }, thickness: 0.5, color: lightGray });
            });
          } catch {
            page.drawLine({ start: { x: 723, y: rowY }, end: { x: 808, y: rowY }, thickness: 0.5, color: lightGray });
          }
        } else {
          page.drawLine({ start: { x: 723, y: rowY }, end: { x: 808, y: rowY }, thickness: 0.5, color: lightGray });
        }

        // Satır alt çizgisi
        page.drawLine({ start: { x: 30, y: rowY - 7 }, end: { x: width - 30, y: rowY - 7 }, thickness: 0.3, color: lightGray });
      });

      // Boş satırlar (sayfa doldurmak için)
      const emptyRows = ROWS_PER_PAGE - pageAttendances.length;
      if (pageNum === totalPages - 1) {
        for (let i = 0; i < Math.min(emptyRows, 5); i++) {
          const rowY = y - 22 - (pageAttendances.length + i) * 22;
          if (rowY < 40) break;
          const isEven = (pageAttendances.length + i) % 2 === 0;
          if (isEven) {
            page.drawRectangle({ x: 30, y: rowY - 6, width: width - 60, height: 20, color: headerBg });
          }
          page.drawLine({ start: { x: 723, y: rowY }, end: { x: 808, y: rowY }, thickness: 0.5, color: lightGray });
          page.drawLine({ start: { x: 30, y: rowY - 7 }, end: { x: width - 30, y: rowY - 7 }, thickness: 0.3, color: lightGray });
        }
      }

      // Alt bilgi
      page.drawLine({ start: { x: 30, y: 30 }, end: { x: width - 30, y: 30 }, thickness: 0.5, color: lightGray });
      page.drawText(`Alevitische Kulturgemeinde Duisburg und Umgebung e.V. · Goethestrase 49, 47167 Duisburg · Erstellt am: ${today}`, {
        x: 30, y: 18, size: 7, font: fontNormal, color: gray
      });
      page.drawText(`Anwesend: ${attendances.length} Mitglieder`, {
        x: width - 150, y: 18, size: 7, font: fontBold, color: green
      });
    }

    
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${new URL(request.url).searchParams.get('inline') ? 'inline' : 'attachment'}; filename="anwesenheitsliste_${meeting.title.replace(/\s+/g, '_')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Attendance PDF error:', error);
    return NextResponse.json({ error: 'PDF fehlgeschlagen: ' + error.message }, { status: 500 });
  }
}
