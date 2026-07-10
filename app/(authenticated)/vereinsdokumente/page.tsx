'use client';

import { useEffect, useState, useRef } from 'react';
import { Folder, FolderPlus, FileText, Upload, Trash2, Download, ChevronRight, ChevronDown, Plus, X, File } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

type Doc = {
  id: string;
  name: string;
  fileKey: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  createdAt: string;
};

type VereinsFolder = {
  id: string;
  name: string;
  documents: Doc[];
  createdAt: string;
};

function formatSize(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType?: string }) {
  const t = mimeType ?? '';
  if (t.includes('pdf')) return <span className="text-red-500">📄</span>;
  if (t.includes('word') || t.includes('document')) return <span className="text-blue-500">📝</span>;
  if (t.includes('excel') || t.includes('sheet')) return <span className="text-green-500">📊</span>;
  if (t.includes('image')) return <span className="text-purple-500">🖼️</span>;
  return <span className="text-gray-500">📎</span>;
}

export default function VereinsDocPage() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [papierkorb, setPapierkorb] = useState<any>(null);
  const restoreItem = async (id: string, type: 'folder' | 'document') => {
    try {
      const res = await fetch('/api/vereinsdokumente', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type, action: 'restore' }) });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Wiederhergestellt!');
      fetch_();
    } catch { toast.error('Fehler'); }
  };
  const destroyItem = async (id: string, type: 'folder' | 'document', name: string) => {
    if (!confirm(`"${name}" endgültig löschen? Dies kann NICHT rückgängig gemacht werden!`)) return;
    try {
      const res = await fetch('/api/vereinsdokumente', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type, action: 'destroy' }) });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Endgültig gelöscht');
      fetch_();
    } catch { toast.error('Fehler'); }
  };

  const [folders, setFolders] = useState<VereinsFolder[]>([]);
  const [unfiled, setUnfiled] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vereinsdokumente');
      const data = await res.json();
      setFolders(data.folders ?? []);
      setPapierkorb(data.papierkorb ?? null);
      setUnfiled(data.unfiled ?? []);
    } catch { toast.error('Fehler beim Laden'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const toggleFolder = (id: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [folderRoles, setFolderRoles] = useState<string[]>([]);
  const ROLE_OPTIONS: [string, string][] = [['VORSTAND','Vorsitzender'],['KASSIERER','Kassierer'],['SACHBEARBEITER','Sachbearbeiter'],['SCHRIFTFUEHRER','Schriftf\u00fchrer']];
  const toggleFolderRole = (r: string) => setFolderRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api/vereinsdokumente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), allowedRoles: folderRoles }),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Ordner erstellt!');
      setNewFolderName('');
      setFolderRoles([]);
      setShowNewFolder(false);
      fetch_();
    } catch { toast.error('Fehler'); }
  };

  const uploadFile = async (file: File, folderId: string | null) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folderId', folderId);
      const res = await fetch('/api/vereinsdokumente', { method: 'POST', body: formData });
      if (!res.ok) { toast.error('Upload fehlgeschlagen'); return; }
      toast.success('Datei hochgeladen!');
      fetch_();
    } catch { toast.error('Fehler'); }
    finally { setUploading(false); setUploadFolderId(null); }
  };

  const deleteItem = async (id: string, type: 'folder' | 'document', name: string) => {
    if (!confirm(`"${name}" wirklich löschen?`)) return;
    try {
      const res = await fetch('/api/vereinsdokumente', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type }),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Gelöscht!');
      fetch_();
    } catch { toast.error('Fehler'); }
  };

  const downloadFile = (fileKey: string, name: string) => {
    const a = document.createElement('a');
    a.href = `/vereinsdokumente/${fileKey}`;
    a.download = name;
    a.click();
  };

  const inp = 'w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm';

  const DocRow = ({ doc, folderId }: { doc: Doc; folderId?: string }) => (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 group border-b border-border last:border-0">
      <FileIcon mimeType={doc.mimeType} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatSize(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString('de-DE')}
          {doc.uploadedBy && ` · ${doc.uploadedBy}`}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => downloadFile(doc.fileKey, doc.name)}
          className="p-1.5 rounded hover:bg-primary/10 text-primary" title="Herunterladen">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={() => deleteItem(doc.id, 'document', doc.name)}
            className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Löschen">
            <Trash2 className="w-4 h-4" />
          </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <Folder className="w-6 h-6 text-primary" /> Vereinsdokumente
          </h1>
          <p className="text-muted-foreground text-sm">Cemevi belgeleri ve dosyaları</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-2 border border-input px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted">
              <FolderPlus className="w-4 h-4" /> Neuer Ordner
            </button>
            <button onClick={() => { setUploadFolderId(null); fileRef.current?.click(); }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90">
              <Upload className="w-4 h-4" /> Datei hochladen
            </button>
          </div>
      </div>

      {/* Gizli file input */}
      <input ref={fileRef} type="file" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, uploadFolderId); e.target.value = ''; }} />

      {/* Yeni klasör formu */}
      {showNewFolder && (
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex gap-3 items-center">
            <FolderPlus className="w-5 h-5 text-primary flex-shrink-0" />
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFolder()}
              placeholder="Ordnername..." className={`${inp} flex-1`} autoFocus />
            <button onClick={createFolder} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
              Erstellen
            </button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); setFolderRoles([]); }} className="p-2 rounded hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="pl-8">
            <p className="text-xs text-muted-foreground mb-2">Sichtbar für (leer = alle Rollen; Ihre eigene Rolle wird automatisch hinzugefügt):</p>
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map(([val, label]) => (
                <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={folderRoles.includes(val)} onChange={() => toggleFolderRole(val)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-3">
          {/* Klasörler */}
          {folders.map(folder => (
            <div key={folder.id} className="bg-card rounded-xl shadow-sm overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleFolder(folder.id)}
              >
                {openFolders.has(folder.id) ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <Folder className="w-5 h-5 text-amber-500" />
                <span className="font-medium flex-1">{folder.name}</span>
                <span className="text-xs text-muted-foreground">{folder.documents.length} Datei{folder.documents.length !== 1 ? 'en' : ''}</span>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setUploadFolderId(folder.id); fileRef.current?.click(); }}
                      className="p-1.5 rounded hover:bg-primary/10 text-primary text-xs flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteItem(folder.id, 'folder', folder.name)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
              </div>
              {openFolders.has(folder.id) && (
                <div className="border-t border-border">
                  {folder.documents.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Keine Dateien in diesem Ordner.
                      <button onClick={() => { setUploadFolderId(folder.id); fileRef.current?.click(); }}
                          className="ml-2 text-primary hover:underline">Datei hochladen</button>
                    </div>
                  ) : (
                    folder.documents.map(doc => <DocRow key={doc.id} doc={doc} folderId={folder.id} />)
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Klasörsüz belgeler */}
          {unfiled.length > 0 && (
            <div className="bg-card rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 border-b border-border">
                <File className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-sm text-muted-foreground">Ohne Ordner</span>
                <span className="text-xs text-muted-foreground ml-auto">{unfiled.length} Datei{unfiled.length !== 1 ? 'en' : ''}</span>
              </div>
              {unfiled.map(doc => <DocRow key={doc.id} doc={doc} />)}
            </div>
          )}

          {folders.length === 0 && unfiled.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Noch keine Dokumente</p>
              <p className="text-sm mt-1">Erstellen Sie einen Ordner oder laden Sie eine Datei hoch.</p>
            </div>
          )}
        </div>
      )}

      {isAdmin && papierkorb && ((papierkorb.folders?.length ?? 0) > 0 || (papierkorb.documents?.length ?? 0) > 0) && (
        <div className="bg-card rounded-xl p-4 shadow-sm border border-dashed border-red-300">
          <h2 className="font-display font-bold text-sm mb-3 text-red-600">Papierkorb (nur für Admin sichtbar)</h2>
          <div className="space-y-2">
            {(papierkorb.folders ?? []).map((f: any) => (
              <div key={f.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted">
                <span>{f.name} <span className="text-xs text-muted-foreground">— gelöscht von {f.deletedBy ?? '?'} am {f.deletedAt ? new Date(f.deletedAt).toLocaleDateString('de-DE') : ''}</span></span>
                <span className="flex gap-2">
                  <button onClick={() => restoreItem(f.id, 'folder')} className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Wiederherstellen</button>
                  <button onClick={() => destroyItem(f.id, 'folder', f.name)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Endgültig löschen</button>
                </span>
              </div>
            ))}
            {(papierkorb.documents ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted">
                <span>{d.name} <span className="text-xs text-muted-foreground">— gelöscht von {d.deletedBy ?? '?'} am {d.deletedAt ? new Date(d.deletedAt).toLocaleDateString('de-DE') : ''}</span></span>
                <span className="flex gap-2">
                  <button onClick={() => restoreItem(d.id, 'document')} className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Wiederherstellen</button>
                  <button onClick={() => destroyItem(d.id, 'document', d.name)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Endgültig löschen</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-4 border-primary border-t-transparent rounded-full" />
            <span className="font-medium">Datei wird hochgeladen...</span>
          </div>
        </div>
      )}
    </div>
  );
}
