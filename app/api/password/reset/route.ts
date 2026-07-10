// app/api/password/reset/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) return NextResponse.json({ error: 'Fehlende Daten' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen haben' }, { status: 400 });

    // Token kontrol et
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken) return NextResponse.json({ error: 'Ungültiger Link' }, { status: 400 });
    if (new Date() > resetToken.expiresAt) return NextResponse.json({ error: 'Link abgelaufen. Bitte erneut anfordern.' }, { status: 400 });

    // Şifreyi güncelle
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword },
    });

    // Token sil
    await prisma.passwordResetToken.delete({ where: { token } });

    return NextResponse.json({ message: 'Passwort erfolgreich geändert.' });
  } catch (e: any) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
