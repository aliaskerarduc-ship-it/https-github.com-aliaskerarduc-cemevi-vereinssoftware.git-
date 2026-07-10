// app/api/verein-settings/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'verein-settings.json');

const DEFAULT_SETTINGS = {
  name: 'Alevitische Kulturgemeinde Duisburg und Umgebung e.V.',
  unterzeile: 'Mitglied der Dachverband Alevitische Gemeinde Deutschland K.d.ö.R',
  strasse: 'Goethe-Str. 49',
  plz: '47166',
  stadt: 'Duisburg',
  telefon: '+ (0) 176 42029618',
  fax: '+49 203-36975341',
  email: 'akm-duisburg@hotmail.com',
  website: 'www.akm-duisburg.de',
  vorsitzender: 'Ismail Sahin',
  aufsichtsrat: 'Haydar Temiz',
  iban: 'DE39 3505 0000 0200 3308 35',
  bic: 'DUISDE33XXX',
  bank: 'Stadtsparkasse Duisburg',
  amtsgericht: 'Amtsgericht Duisburg VR 5739',
  logoLeft: '/Logo_Du_Hamborn.png',
  logoRight: '/AABF.jpeg',
};

function readSettings() {
  try {
    if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
      fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
    }
    if (!fs.existsSync(SETTINGS_FILE)) return DEFAULT_SETTINGS;
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_SETTINGS; }
}

export async function GET() {
  return NextResponse.json(readSettings());
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 });
    const body = await request.json();
    const current = readSettings();
    const updated = { ...current, ...body };
    if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
      fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 });
  }
}
