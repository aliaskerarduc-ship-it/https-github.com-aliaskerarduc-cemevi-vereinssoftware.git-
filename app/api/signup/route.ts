export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Allow signup if no session but check admin for authenticated users
    if (session && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur Administratoren können Benutzer anlegen.' }, { status: 403 });
    }
    const body = await request.json();
    const { email, password, name, role } = body ?? {};
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'E-Mail, Name und Passwort sind erforderlich.' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Ein Benutzer mit dieser E-Mail existiert bereits.' }, { status: 400 });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || 'SACHBEARBEITER' },
    });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Benutzers.' }, { status: 500 });
  }
}
