// app/api/backup/cron/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import nodemailer from 'nodemailer';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.BACKUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `cemevi_backup_${dateStr}.sql`;

    let sqlContent = '';
    const dbUrl = process.env.DATABASE_URL ?? '';
    const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (match) {
      const [, user, password, host, port, dbname] = match;
      const { stdout } = await execAsync(
        `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${dbname} --no-password 2>/dev/null`
      );
      sqlContent = stdout;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"Cemevi Backup" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: `🗄️ Cemevi Tägliches Backup – ${dateStr}`,
      html: `<div style="font-family:Arial;max-width:500px;"><h2 style="color:#16a34a;">Tägliches Backup</h2><p>Datum: ${now.toLocaleDateString('de-DE')} ${now.toLocaleTimeString('de-DE')}</p></div>`,
      attachments: [{ filename, content: Buffer.from(sqlContent) }],
    });

    return NextResponse.json({ success: true, filename });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
