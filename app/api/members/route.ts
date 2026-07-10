export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '25');
    const sortBy = searchParams.get('sortBy') ?? 'lastName';
    const sortDir = searchParams.get('sortDir') ?? 'asc';

    const where: any = { deletedAt: null };
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { city: { contains: search } },
      ];
      const memberNum = parseInt(search);
      if (!isNaN(memberNum)) {
        where.OR.push({ memberNumber: memberNum });
      }
    }

    const [members, total, genderGroups] = await Promise.all([
      prisma.member.findMany({
        where,
        include: {
          family: { select: { familyName: true } },
          contributions: { orderBy: { paymentDate: 'desc' }, take: 1, select: { paymentDate: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.member.count({ where }),
      prisma.member.groupBy({ by: ['gender'], where, _count: true }),
    ]);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const enriched = (members ?? []).map((m: any) => {
      const lastContrib = m?.contributions?.[0];
      const isOverdue = m?.status === 'AKTIV' && (!lastContrib || new Date(lastContrib.paymentDate) < threeMonthsAgo);
      return { ...(m ?? {}), isOverdue };
    });

    const genderStats: Record<string, number> = {};
    for (const g of genderGroups as any[]) genderStats[g.gender ?? 'UNBEKANNT'] = g._count;
    return NextResponse.json({ members: enriched, total, page, totalPages: Math.ceil(total / limit), genderStats });
  } catch (error: any) {
    console.error('Members list error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Mitglieder' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const body = await request.json();
    const {
      firstName, lastName, birthDate, gender, nationality, street, zipCode, city,
      phone, email, entryDate, status: memberStatus, contributionLevel, notes, familyId,
      gebaeudekaufBeitrag, finanzierung, zahlungsweise,
      photoPath, photoIsPublic,
    } = body ?? {};

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'Vorname und Nachname sind Pflichtfelder.' }, { status: 400 });
    }

    const member = await prisma.member.create({
      data: {
        firstName,
        lastName,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        nationality: nationality || null,
        street: street || null,
        zipCode: zipCode || null,
        city: city || null,
        phone: phone || null,
        email: email || null,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        status: memberStatus || 'AKTIV',
        contributionLevel: contributionLevel || 'NORMAL',
        notes: notes || null,
        gebaeudekaufBeitrag: (() => { if (gebaeudekaufBeitrag === undefined || gebaeudekaufBeitrag === '' || gebaeudekaufBeitrag === null) return null; const c = String(gebaeudekaufBeitrag).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'); const n = parseFloat(c); return isNaN(n) ? null : n; })(),
        finanzierung: finanzierung || null,
        zahlungsweise: zahlungsweise || null,
        familyId: familyId || null,
        photoPath: photoPath || null,
        photoIsPublic: photoIsPublic ?? false,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    console.error('Member create error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Mitglieds' }, { status: 500 });
  }
}
