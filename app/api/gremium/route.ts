import { auditLog } from '@/lib/audit';
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
    const memberId = searchParams.get('memberId');
    if (!memberId) return NextResponse.json({ error: 'memberId fehlt' }, { status: 400 });
    const items = await prisma.gremiumAmter.findMany({ where: { memberId }, orderBy: { vonJahr: 'desc' } });
    return NextResponse.json(items);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const body = await request.json();
    const item = await prisma.gremiumAmter.create({ data: body });
    return NextResponse.json(item, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    const { id } = await request.json();
    const _g = await prisma.gremiumAmter.findUnique({ where: { id }, include: { member: true } });
    await prisma.gremiumAmter.delete({ where: { id } });
    await auditLog('Gelöscht', 'Gremien', _g ? `${_g.gremium ?? ''} ${_g.amt ?? ''} – ${_g.member ? _g.member.lastName + ', ' + _g.member.firstName : ''}` : id, session);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
