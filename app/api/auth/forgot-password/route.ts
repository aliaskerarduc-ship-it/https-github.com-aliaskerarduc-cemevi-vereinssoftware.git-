// app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'E-Mail fehlt' }, { status: 400 });

    // Kullanıcı var mı kontrol et
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Güvenlik için aynı mesajı dön
      return NextResponse.json({ message: 'Falls diese E-Mail registriert ist, erhalten Sie eine E-Mail.' });
    }

    // Eski tokenları sil
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    // Yeni token oluştur
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    });

    // E-posta gönder
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"Cemevi Software" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Passwort zurücksetzen – Cemevi Software',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Passwort zurücksetzen</h2>
          <p>Hallo ${user.name},</p>
          <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
          <p>Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p>
          <a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;">
            Passwort zurücksetzen
          </a>
          <p style="color:#666;font-size:12px;">Dieser Link ist 1 Stunde gültig.</p>
          <p style="color:#666;font-size:12px;">Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="color:#999;font-size:11px;">Cemevi Mitgliederverwaltung Software</p>
        </div>
      `,
    });

    return NextResponse.json({ message: 'Falls diese E-Mail registriert ist, erhalten Sie eine E-Mail.' });
  } catch (e: any) {
    console.error('FORGOT PASSWORD ERROR:', e);
    return NextResponse.json({ error: 'Fehler beim Senden' }, { status: 500 });
  }
}
