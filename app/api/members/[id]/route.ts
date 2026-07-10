import { auditLog } from '@/lib/audit';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const member = await prisma.member.findUnique({
      where: { id: params.id },
      include: {
        family: { include: { members: { select: { id: true, firstName: true, lastName: true, memberNumber: true } } } },
        donations: { orderBy: { date: 'desc' } },
        contributions: { orderBy: { paymentDate: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        customFieldValues: { include: { customField: true } },
      },
    });

    if (!member) return NextResponse.json({ error: 'Mitglied nicht gefunden' }, { status: 404 });
    return NextResponse.json(member);
  } catch (error: any) {
    console.error('Member detail error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Mitglieds' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const body = await request.json();
    const {
      firstName, lastName, birthDate, gender, nationality, street, zipCode, city,
      phone, email, entryDate, exitDate, status: memberStatus, contributionLevel,
      notes, familyId, photoPath, photoIsPublic, gebaeudekaufBeitrag, finanzierung, zahlungsweise,
    } = body ?? {};

    // Ausgeschlossen-Sperre: nur Admin darf diesen Status aendern
    if (memberStatus !== undefined) {
      const current = await prisma.member.findUnique({ where: { id: params.id }, select: { status: true } });
      const role = (session.user as any)?.role;
      if (current?.status === 'AUSGESCHLOSSEN' && memberStatus !== 'AUSGESCHLOSSEN' && role !== 'ADMIN') {
        return NextResponse.json({ error: 'Nur ein Administrator kann den Status "Ausgeschlossen" ändern.' }, { status: 403 });
      }
    }

    const member = await prisma.member.update({
      where: { id: params.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(gender !== undefined && { gender: gender || null }),
        ...(nationality !== undefined && { nationality: nationality || null }),
        ...(street !== undefined && { street: street || null }),
        ...(zipCode !== undefined && { zipCode: zipCode || null }),
        ...(city !== undefined && { city: city || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(entryDate !== undefined && { entryDate: new Date(entryDate) }),
        ...(exitDate !== undefined && { exitDate: exitDate ? new Date(exitDate) : null }),
        ...(memberStatus !== undefined && { status: memberStatus }),
        ...(contributionLevel !== undefined && { contributionLevel }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(gebaeudekaufBeitrag !== undefined && { gebaeudekaufBeitrag: (() => { if (gebaeudekaufBeitrag === '' || gebaeudekaufBeitrag === null) return null; const c = String(gebaeudekaufBeitrag).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'); const n = parseFloat(c); return isNaN(n) ? null : n; })() }),
        ...(finanzierung !== undefined && { finanzierung: finanzierung || null }),
        ...(zahlungsweise !== undefined && { zahlungsweise: zahlungsweise || null }),
        ...(familyId !== undefined && { familyId: familyId || null }),
        ...(photoPath !== undefined && { photoPath: photoPath || null }),
        ...(photoIsPublic !== undefined && { photoIsPublic }),
      },
    });

    return NextResponse.json(member);
  } catch (error: any) {
    console.error('Member update error:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Mitglieds' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur Administratoren können Mitglieder löschen.' }, { status: 403 });
    }

    const _mb = await prisma.member.findUnique({ where: { id: params.id } });
    await prisma.member.update({ where: { id: params.id }, data: { deletedAt: new Date(), deletedBy: (session.user as any)?.name || session.user?.email || 'Unbekannt' } });
    await auditLog('Gelöscht', 'Mitglieder', _mb ? `Nr. ${String(_mb.memberNumber).padStart(5,'0')} – ${_mb.lastName}, ${_mb.firstName}` : params.id, session);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Member delete error:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen des Mitglieds' }, { status: 500 });
  }
}
