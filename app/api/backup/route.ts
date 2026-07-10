// app/api/backup/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/options';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const execAsync = promisify(exec);

async function createBackup(): Promise<{ content: string; filename: string }> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const filename = `cemevi_backup_${dateStr}.sql`;

  let sqlContent = `-- Cemevi Backup ${dateStr}\n-- Erstellt: ${now.toISOString()}\n\n`;

  try {
    const { stdout } = await execAsync(`pg_dump "${process.env.DATABASE_URL}"`, { maxBuffer: 1024 * 1024 * 100 });
    sqlContent = stdout;
  } catch (e: any) {
    sqlContent += `-- DB Dump Fehler: ${e.message}\n`;
  }

  return { content: sqlContent, filename };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur für Administratoren' }, { status: 403 });
    }

    const { sendEmail } = await request.json().catch(() => ({ sendEmail: true }));
    const { content, filename } = await createBackup();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    if (sendEmail) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? '587'),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await transporter.sendMail({
        from: `"Cemevi Backup" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        subject: `🗄️ Cemevi Backup – ${dateStr}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px;">
            <h2 style="color: #16a34a;">Datensicherung</h2>
            <p>Das Backup wurde erfolgreich erstellt.</p>
            <p><strong>Datum:</strong> ${now.toLocaleDateString('de-DE')}</p>
            <p><strong>Uhrzeit:</strong> ${now.toLocaleTimeString('de-DE')}</p>
            <p>Die SQL-Datei ist im Anhang.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
            <p style="color:#999;font-size:11px;">Cemevi Mitgliederverwaltung Software</p>
          </div>
        `,
        attachments: [{ filename, content: Buffer.from(content) }],
      });
    }

    return NextResponse.json({
      success: true,
      filename,
      data: Buffer.from(content).toString('base64'),
      emailSent: sendEmail,
    });

  } catch (e: any) {
    console.error('BACKUP ERROR:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
