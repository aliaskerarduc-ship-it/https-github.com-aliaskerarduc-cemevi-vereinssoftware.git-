import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'verein-settings.json');

function saveSettings(data: any) {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const current = fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) : {};
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...current, ...data }, null, 2));
}

export async function GET() {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  return NextResponse.json({ needed: adminCount === 0 });
}

export async function POST(request: Request) {
  try {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount > 0) return NextResponse.json({ error: 'Setup bereits abgeschlossen' }, { status: 400 });

    const { vereinName, strasse, plz, stadt, telefon, email: vereinEmail, vorsitzender, adminName, adminEmail, adminPassword } = await request.json();

    if (!adminEmail || !adminPassword || !adminName) return NextResponse.json({ error: 'Admin-Daten fehlen' }, { status: 400 });
    if (adminPassword.length < 8) return NextResponse.json({ error: 'Passwort mindestens 8 Zeichen' }, { status: 400 });

    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({ data: { email: adminEmail, name: adminName, password: hashed, role: 'ADMIN' } });

    saveSettings({ name: vereinName, strasse, plz, stadt, telefon, email: vereinEmail, vorsitzender });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Fehler' }, { status: 500 });
  }
}
