'use client';

import { useEffect, useState } from 'react';
import { FileText, Upload, Download, Search, Trash2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

const CATEGORIES = ['Mitgliedsantrag', 'Einverständniserklärung', 'Ausweiskopie', 'Foto', 'Sonstiges'];

export default function DokumentePage() {
  const searchParams = useSearchParams();
  const presetMemberId = searchParams?.get('memberId') ?? '';
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(!!presetMemberId);
  const [members, setMembers] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ memberId: presetMemberId, category: '', notes: '' });
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = presetMemberId ? `?memberId=${presetMemberId}` : '';
      const res = await fetch(`/api/documents${params}`);
      const data = await res.json();
      setDocuments(data?.documents ?? []);
    } catch { console.error('Fehler'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocuments(); }, []);
  useEffect(() => {
    fetch('/api/members?limit=1000').then(r => r.json()).then(d => setMembers(d?.members ?? [])).catch(console.error);
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !uploadForm.memberId) { toast.error('Datei und Mitglied sind erforderlich.'); return; }
    setUploading(true);
    try {
      // Dosyayı FormData ile gönder
      const formData = new FormData();
      formData.append('file', file);
      formData.append('memberId', uploadForm.memberId);

      const uploadRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        toast.error(err?.error ?? 'Upload fehlgeschlagen');
        return;
      }

      const { url, fileName: originalName, fileType } = await uploadRes.json();

      // Belgeyi veritabanına kaydet
      const docRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: uploadForm.memberId,
          fileName: file.name,
          fileType: file.type,
          cloudStoragePath: url,
          isPublic: false,
          category: uploadForm.category || null,
          notes: uploadForm.notes || null,
        }),
      });

      if (!docRes.ok) {
        toast.error('Fehler beim Speichern');
        return;
      }

      toast.success('Dokument wurde hochgeladen.');
      setShowUpload(false);
      setFile(null);
      setUploadForm({ memberId: presetMemberId, category: '', notes: '' });
      fetchDocuments();
    } catch (err: any) {
      toast.error('Fehler: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (doc: any) => {
    if (!doc?.downloadUrl && !doc?.cloudStoragePath) { toast.error('Download nicht verfügbar'); return; }
    const url = doc?.downloadUrl || doc?.cloudStoragePath;
    const a = document.createElement('a');
    a.href = url;
    a.download = doc?.fileName ?? 'dokument';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Dokument wirklich löschen?')) return;
    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { toast.error('Fehler beim Löschen'); return; }
      toast.success('Dokument gelöscht.');
      fetchDocuments();
    } catch { toast.error('Fehler'); }
  };

  const filtered = documents.filter(d =>
    !search || d?.fileName?.toLowerCase().includes(search.toLowerCase()) ||
    d?.member?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    d?.category?.toLowerCase().includes(search.toLowerCase())
  );

  const isImage = (f: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f);
  const isPdf = (f: string) => /\.pdf$/i.test(f);

  return (
    <div className="space-y-6">
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <p className="font-medium">{previewDoc.fileName}</p>
              <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-auto max-h-[80vh] flex items-center justify-center">
              {isImage(previewDoc.fileName) ? (
                <img src={previewDoc.cloudStoragePath} alt={previewDoc.fileName} className="max-w-full rounded-lg" />
              ) : isPdf(previewDoc.fileName) ? (
                <iframe src={previewDoc.cloudStoragePath} className="w-full h-[70vh] rounded-lg" />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3" />
                  <p>Vorschau nicht verfügbar.</p>
                  <a href={previewDoc.cloudStoragePath} download={previewDoc.fileName} className="text-primary hover:underline mt-2 inline-block">Herunterladen</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Dokumente
          </h1>
          <p className="text-muted-foreground text-sm">{documents.length} Dokument{documents.length !== 1 ? 'e' : ''}</p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90">
          <Upload className="w-4 h-4" /> Dokument hochladen
        </button>
      </div>

      {showUpload && (
        <form onSubmit={handleUpload} className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-display font-bold">Dokument hochladen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Mitglied *</label>
              <select value={uploadForm.memberId} onChange={e => setUploadForm(p => ({...p, memberId: e.target.value}))} required
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Mitglied auswählen...</option>
                {members?.map((m: any) => (
                  <option key={m?.id} value={m?.id}>{String(m?.memberNumber ?? 0).padStart(5, "0")} – {m?.lastName}, {m?.firstName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategorie</label>
              <select value={uploadForm.category} onChange={e => setUploadForm(p => ({...p, category: e.target.value}))}
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Kategorie wählen</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bemerkungen</label>
              <input value={uploadForm.notes} onChange={e => setUploadForm(p => ({...p, notes: e.target.value}))}
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Datei *</label>
              <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} required
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC, DOCX</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={uploading} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
              {uploading ? 'Lädt hoch...' : 'Hochladen'}
            </button>
            <button type="button" onClick={() => setShowUpload(false)} className="px-6 py-2.5 rounded-lg border border-input hover:bg-muted">Abbrechen</button>
          </div>
        </form>
      )}

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..."
          className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {/* Liste */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Keine Dokumente gefunden.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((doc: any) => (
              <div key={doc?.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{doc?.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc?.member ? `${doc.member.lastName}, ${doc.member.firstName}` : ''} ·
                      {doc?.category ?? 'Allgemein'} ·
                      {new Date(doc?.createdAt).toLocaleDateString('de-DE', { timeZone: 'UTC' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewDoc(doc)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Vorschau">
                    <Eye className="w-4 h-4 text-primary" />
                  </button>
                  <button onClick={() => handleDownload(doc)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Herunterladen">
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(doc?.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Löschen">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
