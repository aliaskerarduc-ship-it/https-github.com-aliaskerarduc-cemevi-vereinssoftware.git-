// app/api/update-contribution-levels/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/options';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur für Administratoren' }, { status: 403 });
    }

    const { levels } = await request.json();
    // levels: { STUDENT: 5, ERMAESSIGT: 8, NORMAL: 12, FAMILIE: 16, PARTNER: 7.5 }

    const rolesPath = path.join(process.cwd(), 'lib', 'roles.ts');
    let content = readFileSync(rolesPath, 'utf-8');

    // Her level için tutarı güncelle
    for (const [key, amount] of Object.entries(levels)) {
      const regex = new RegExp(`(${key}:\\s*\\{\\s*label:\\s*'[^']*',\\s*amount:\\s*)([\\d.]+)`, 'g');
      content = content.replace(regex, `$1${amount}`);
    }

    writeFileSync(rolesPath, content, 'utf-8');

    // Otomatik build tetikle
    const { exec } = require('child_process');
    exec('cd /var/www/cemevi && npm run build && pm2 restart cemevi', (err: any) => {
      if (err) console.error('Build error:', err);
      else console.log('Build tamamlandı');
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('UPDATE ROLES ERROR:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
