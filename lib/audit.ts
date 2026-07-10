import { prisma } from '@/lib/db';

export async function auditLog(action: string, module: string, itemLabel: string, session: any) {
  try {
    const userName = session?.user?.name || session?.user?.email || 'Unbekannt';
    await prisma.auditLog.create({ data: { action, module, itemLabel, userName } });
  } catch (e) {
    console.error('AuditLog Fehler:', e);
  }
}
