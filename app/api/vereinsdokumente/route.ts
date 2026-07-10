import { auditLog } from '@/lib/audit';
// app/api/vereinsdokumente/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/options';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'vereinsdokumente');

async function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// GET - Klasörler ve belgeler
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const userRole = (session.user as any)?.role;
    const isAdmin = userRole === 'ADMIN';
    const folders = await prisma.vereinsFolder.findMany({
      where: isAdmin ? { deletedAt: null } : { AND: [{ deletedAt: null }, { adminOnly: false }, { OR: [{ allowedRoles: { isEmpty: true } }, { allowedRoles: { has: userRole } }] }] },
      include: { documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } } },
      orderBy: { name: 'asc' },
    });

    const unfiled = await prisma.vereinsDocument.findMany({
      where: { folderId: null, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    let papierkorb = null;
    if (isAdmin) {
      const delFolders = await prisma.vereinsFolder.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' } });
      const delDocs = await prisma.vereinsDocument.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' } });
      papierkorb = { folders: delFolders, documents: delDocs };
    }

    return NextResponse.json({ folders, unfiled, papierkorb });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST - Klasör oluştur veya belge yükle
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      // Klasör oluştur
      const { name, allowedRoles } = await request.json();
      if (!name?.trim()) return NextResponse.json({ error: 'Name fehlt' }, { status: 400 });
      let roles: string[] = Array.isArray(allowedRoles) ? allowedRoles.filter((r: string) => typeof r === 'string') : [];
      const creatorRole = (session.user as any)?.role;
      if (roles.length > 0 && creatorRole && !roles.includes(creatorRole)) roles.push(creatorRole);
      const folder = await prisma.vereinsFolder.create({ data: { name: name.trim(), allowedRoles: roles } });
      return NextResponse.json(folder, { status: 201 });
    }

    // Dosya yükle
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string | null;
    if (folderId) {
      const target = await prisma.vereinsFolder.findUnique({ where: { id: folderId }, select: { adminOnly: true } });
      if (target?.adminOnly && (session.user as any)?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Nur Administratoren können in diesen Ordner hochladen.' }, { status: 403 });
      }
    }

    if (!file) return NextResponse.json({ error: 'Datei fehlt' }, { status: 400 });

    await ensureDir();

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}_${safeName}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    await writeFile(filePath, buffer);

    const doc = await prisma.vereinsDocument.create({
      data: {
        name: file.name,
        fileKey: fileName,
        fileSize: file.size,
        mimeType: file.type,
        folderId: folderId || null,
        uploadedBy: (session.user as any)?.name || session.user?.email || 'Unbekannt',
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (e: any) {
    console.error('VEREINSDOKUMENTE ERROR:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Belge veya klasör sil
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

    const { id, type } = await request.json();

    if (type === 'folder') {
      // Klasördeki belgeleri sil
      const delTarget = await prisma.vereinsFolder.findUnique({ where: { id }, select: { adminOnly: true } });
      if (delTarget?.adminOnly && (session.user as any)?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Nur Administratoren können diesen Ordner löschen.' }, { status: 403 });
      }
      const deletedBy = (session.user as any)?.name || session.user?.email || 'Unbekannt';
      const now = new Date();
      await prisma.vereinsDocument.updateMany({ where: { folderId: id, deletedAt: null }, data: { deletedAt: now, deletedBy } });
      const _vf = await prisma.vereinsFolder.findUnique({ where: { id } });
      await prisma.vereinsFolder.update({ where: { id }, data: { deletedAt: now, deletedBy } });
      await auditLog('Gelöscht (Papierkorb)', 'Vereinsdokumente', _vf ? `Ordner "${_vf.name}"` : id, session);
    } else {
      const deletedBy = (session.user as any)?.name || session.user?.email || 'Unbekannt';
      const _vd = await prisma.vereinsDocument.findUnique({ where: { id } });
      await prisma.vereinsDocument.update({ where: { id }, data: { deletedAt: new Date(), deletedBy } });
      await auditLog('Gelöscht (Papierkorb)', 'Vereinsdokumente', _vd ? `Datei "${_vd.name}"` : id, session);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH - Papierkorb: wiederherstellen oder endgueltig loeschen (nur Admin)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur Administratoren' }, { status: 403 });
    }
    const { id, type, action } = await request.json();

    if (action === 'restore') {
      await auditLog('Wiederhergestellt', 'Vereinsdokumente', `${type === 'folder' ? 'Ordner' : 'Datei'} ${id}`, session);
      if (type === 'folder') {
        await prisma.vereinsFolder.update({ where: { id }, data: { deletedAt: null, deletedBy: null } });
        await prisma.vereinsDocument.updateMany({ where: { folderId: id }, data: { deletedAt: null, deletedBy: null } });
      } else {
        await prisma.vereinsDocument.update({ where: { id }, data: { deletedAt: null, deletedBy: null } });
      }
    } else if (action === 'destroy') {
      await auditLog('Endgültig gelöscht', 'Vereinsdokumente', `${type === 'folder' ? 'Ordner' : 'Datei'} ${id}`, session);
      if (type === 'folder') {
        const docs = await prisma.vereinsDocument.findMany({ where: { folderId: id } });
        for (const doc of docs) {
          const fp = path.join(UPLOAD_DIR, doc.fileKey);
          if (existsSync(fp)) await unlink(fp);
        }
        await prisma.vereinsDocument.deleteMany({ where: { folderId: id } });
        await prisma.vereinsFolder.delete({ where: { id } });
      } else {
        const doc = await prisma.vereinsDocument.findUnique({ where: { id } });
        if (doc) {
          const fp = path.join(UPLOAD_DIR, doc.fileKey);
          if (existsSync(fp)) await unlink(fp);
          await prisma.vereinsDocument.delete({ where: { id } });
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
