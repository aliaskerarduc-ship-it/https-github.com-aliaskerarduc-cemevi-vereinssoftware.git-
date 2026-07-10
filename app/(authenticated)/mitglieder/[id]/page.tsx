'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, CreditCard, Heart, FileText, Trash2, Users, Plus, Eye, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { GENDER_LABELS, CONTRIBUTION_LEVELS, MEMBER_STATUS_LABELS, PAYMENT_METHODS } from '@/lib/roles';
import { useSession } from 'next-auth/react';

const CATEGORIES = ['Mitgliedsantrag', 'Einverständniserklärung', 'Ausweiskopie', 'Foto', 'Sonstiges'];

// Dinamik beitragsstufe tutarları
const DEFAULT_AMOUNTS: Record<string, number> = { STUDENT: 5, ERMAESSIGT: 8, NORMAL: 12, FAMILIE: 16, PARTNER: 4 };

export default function MitgliedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [memberId, setMemberId] = useState("");
  const { data: session } = useSession() || {};
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dynamicLevels, setDynamicLevels] = useState<Record<string, number>>(DEFAULT_AMOUNTS);

  useEffect(() => {
    fetch('/api/verein-settings')
      .then(r => r.json())
      .then(d => {
        if (d.contributionLevels) {
          try {
            const saved = JSON.parse(d.contributionLevels);
            setDynamicLevels({ ...DEFAULT_AMOUNTS, ...saved });
          } catch {}
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState('stammdaten');
  const [gremiumItems, setGremiumItems] = useState<any[]>([]);
  const [showGremiumForm, setShowGremiumForm] = useState(false);
  const [gremiumForm, setGremiumForm] = useState({ gremium: 'Vorstand', amt: 'Vorsitzender', vonJahr: new Date().getFullYear(), bisJahr: '', notes: '' });

  const GREMIEN: Record<string, string[]> = {
    'Vorstand': ['Vorsitzender', 'Stellvertretender Vorsitzender', 'Schriftführer', 'Stellvertretender Schriftführer', 'Kassierer', 'Stellvertretender Kassierer', 'Beirat'],
    'Kontrollausschuss': ['Vorsitzender', 'Stellvertreter', 'Schriftführer', 'Kassierer', 'Mitglied'],
    'Disziplinarausschuss': ['Vorsitzender', 'Stellvertreter', 'Schriftführer', 'Kassierer', 'Mitglied'],
    'Frauenverein': ['Vorsitzende', 'Stellvertreterin', 'Schriftführerin', 'Stellvertretende Schriftführerin', 'Kassiererin', 'Stellvertretende Kassiererin', 'Mitglied'],
    'Jugendverein': ['Vorsitzender', 'Stellvertreter', 'Schriftführer', 'Stellvertretender Schriftführer', 'Kassierer', 'Stellvertretender Kassierer', 'Mitglied'],
    'Glaubensrat': ['Vorsitzender', 'Stellvertreter', 'Schriftführer', 'Kassierer', 'Mitglied'],
    'Sonstiges': ['Mitglied'],
  };

  const fetchGremium = async (id: string) => {
    try {
      const res = await fetch(`/api/gremium?memberId=${id}`);
      setGremiumItems(await res.json());
    } catch {}
  };
  const [families, setFamilies] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [showNewFamily, setShowNewFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ category: '', notes: '' });
  const [file, setFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);



  useEffect(() => { const id = params?.id; if (id) setMemberId(Array.isArray(id) ? id[0] : id); }, [params]);

  const fetchFamilies = () => {
    fetch('/api/families').then(r => r.json()).then(d => setFamilies(d?.families ?? [])).catch(console.error);
  };

  const fetchMember = async () => {
    try {
      const res = await fetch(`/api/members/${memberId}`);
      if (!res.ok) { router.push('/mitglieder'); return; }
      const data = await res.json();
      setMember(data);
      setForm({
        firstName: data?.firstName ?? '', lastName: data?.lastName ?? '',
        birthDate: data?.birthDate ? new Date(data.birthDate).toISOString().split('T')[0] : '',
        gender: data?.gender ?? '', nationality: data?.nationality ?? '',
        street: data?.street ?? '', zipCode: data?.zipCode ?? '', city: data?.city ?? '',
        phone: data?.phone ?? '', email: data?.email ?? '',
        entryDate: data?.entryDate ? new Date(data.entryDate).toISOString().split('T')[0] : '',
        exitDate: data?.exitDate ? new Date(data.exitDate).toISOString().split('T')[0] : '',
        status: data?.status ?? 'AKTIV', contributionLevel: data?.contributionLevel ?? 'NORMAL',
        notes: data?.notes ?? '', familyId: data?.familyId ?? '',
        gebaeudekaufBeitrag: data?.gebaeudekaufBeitrag ?? '', finanzierung: data?.finanzierung ?? '', zahlungsweise: data?.zahlungsweise ?? '',
      });
    } catch { toast.error('Fehler beim Laden'); }
    finally { setLoading(false); }
  };

  const fetchDocuments = async () => {
    const res = await fetch(`/api/documents?memberId=${memberId}`);
    const d = await res.json();
    setDocuments(d?.documents ?? []);
  };

  useEffect(() => { if (memberId && memberId.length > 5) { fetchMember(); fetchDocuments(); fetchGremium(memberId); } }, [memberId]);
  useEffect(() => { fetchFamilies(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev: any) => ({ ...(prev ?? {}), [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err?.error ?? 'Fehler'); return; }
      toast.success('Mitglied wurde aktualisiert.');
      fetchMember();
    } catch { toast.error('Fehler beim Speichern'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie dieses Mitglied wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); toast.error(err?.error ?? 'Fehler'); return; }
      toast.success('Mitglied wurde gelöscht.');
      router.push('/mitglieder');
    } catch { toast.error('Fehler beim Löschen'); }
  };

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) { toast.error('Familienname eingeben.'); return; }
    setCreatingFamily(true);
    try {
      const res = await fetch('/api/families', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyName: newFamilyName.trim() }),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      const family = await res.json();
      toast.success(`Familie "${family.familyName}" erstellt.`);
      setNewFamilyName(''); setShowNewFamily(false);
      fetchFamilies();
      setForm((prev: any) => ({ ...prev, familyId: family.id }));
    } catch { toast.error('Fehler.'); }
    finally { setCreatingFamily(false); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error('Datei auswählen.'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('memberId', memberId);
      const uploadRes = await fetch('/api/upload/presigned', { method: 'POST', body: formData });
      if (!uploadRes.ok) { toast.error('Upload fehlgeschlagen'); return; }
      const { url } = await uploadRes.json();
      await fetch('/api/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, fileName: file.name, fileType: file.type, cloudStoragePath: url, isPublic: false, category: uploadForm.category || null, notes: uploadForm.notes || null }),
      });
      toast.success('Dokument hochgeladen.');
      setShowUpload(false); setFile(null); setUploadForm({ category: '', notes: '' });
      fetchDocuments();
    } catch { toast.error('Fehler'); }
    finally { setUploading(false); }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Dokument wirklich löschen?')) return;
    try {
      await fetch('/api/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      toast.success('Dokument gelöscht.');
      fetchDocuments();
    } catch { toast.error('Fehler'); }
  };

  const isImage = (fileName: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  const isPdf = (fileName: string) => /\.pdf$/i.test(fileName);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!member) return null;

  const tabs = [
    { key: 'stammdaten', label: 'Stammdaten', icon: User },
    { key: 'beitraege', label: 'Beiträge', icon: CreditCard },
    { key: 'spenden', label: 'Spenden', icon: Heart },
    { key: 'dokumente', label: `Dokumente (${documents.length})`, icon: FileText },
    { key: 'gremien', label: 'Gremien & Ämter', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Önizleme Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <p className="font-medium">{previewDoc.fileName}</p>
              <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-auto max-h-[80vh]">
              {isImage(previewDoc.fileName) ? (
                <img src={previewDoc.cloudStoragePath} alt={previewDoc.fileName} className="max-w-full mx-auto rounded-lg" />
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/mitglieder" className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">{member?.firstName} {member?.lastName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">Nr. {String(member?.memberNumber ?? 0).padStart(5, "0")}</span>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full">{MEMBER_STATUS_LABELS[member?.status] ?? member?.status}</span>
            </div>
          </div>
        </div>
        {(session?.user as any)?.role === 'ADMIN' && (
          <button onClick={handleDelete} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab === t.key ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-4 h-4" /><span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Stammdaten */}
      {tab === 'stammdaten' && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-display font-bold">Persönliche Daten</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Mitgliedsnummer</label><input value={member?.memberNumber ? String(member.memberNumber).padStart(5, '0') : '—'} readOnly className="w-full px-3 py-2.5 border border-input rounded-lg bg-muted text-muted-foreground cursor-not-allowed" /></div>
              <div><label className="block text-sm font-medium mb-1">Vorname</label><input name="firstName" value={form?.firstName ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Nachname</label><input name="lastName" value={form?.lastName ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Geburtsdatum</label><input name="birthDate" type="date" value={form?.birthDate ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Geschlecht</label><select name="gender" value={form?.gender ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"><option value="">-</option>{Object.entries(GENDER_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Staatsangehörigkeit</label><input name="nationality" value={form?.nationality ?? ''} onChange={handleChange} placeholder="z.B. TR, DE, TR/DE" className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-display font-bold">Adresse & Kontakt</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Straße</label><input name="street" value={form?.street ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">PLZ</label><input name="zipCode" value={form?.zipCode ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Ort</label><input name="city" value={form?.city ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Telefon</label><input name="phone" value={form?.phone ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">E-Mail</label><input name="email" type="email" value={form?.email ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-display font-bold">Mitgliedschaft</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Eintrittsdatum</label><input name="entryDate" type="date" value={form?.entryDate ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Austrittsdatum</label><input name="exitDate" type="date" value={form?.exitDate ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Status</label><select name="status" value={form?.status ?? 'AKTIV'} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">{Object.entries(MEMBER_STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Beitragsstufe</label><select name="contributionLevel" value={form?.contributionLevel ?? 'NORMAL'} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">{Object.entries(CONTRIBUTION_LEVELS).map(([k,v]) => <option key={k} value={k}>{v.label} ({dynamicLevels[k] ?? 0}€)</option>)}</select></div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Familienzugehörigkeit</label>
                <div className="flex gap-2">
                  <select name="familyId" value={form?.familyId ?? ''} onChange={handleChange} className="flex-1 px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Einzelmitglied (keine Familie)</option>
                    {families?.map((f: any) => <option key={f?.id} value={f?.id}>Familie: {f?.familyName} ({f?.members?.length ?? 0} Mitglieder)</option>)}
                  </select>
                  <button type="button" onClick={() => setShowNewFamily(!showNewFamily)} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-input hover:bg-muted text-sm whitespace-nowrap">
                    <Plus className="w-4 h-4" /> Neue Familie
                  </button>
                </div>
                {showNewFamily && (
                  <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                    <div className="flex gap-2">
                      <input value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} placeholder="z.B. Familie Yilmaz" className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <button type="button" onClick={handleCreateFamily} disabled={creatingFamily} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50">{creatingFamily ? '...' : 'Erstellen'}</button>
                      <button type="button" onClick={() => setShowNewFamily(false)} className="px-3 py-2 border border-input rounded-lg text-sm">Abbrechen</button>
                    </div>
                  </div>
                )}
                {form?.familyId && <p className="text-xs text-emerald-600 mt-1">Familienmitgliedschaft: {families.find((f: any) => f.id === form.familyId)?.familyName}</p>}
              </div>
              <div><label className="block text-sm font-medium mb-1">Beitrag zum Gebäudekauf (€)</label><input name="gebaeudekaufBeitrag" type="number" step="0.01" value={form?.gebaeudekaufBeitrag ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Finanzierung</label><input name="finanzierung" value={form?.finanzierung ?? ''} onChange={handleChange} placeholder="ja / nein / Betrag" className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Zahlungsweise</label><input name="zahlungsweise" value={form?.zahlungsweise ?? ''} onChange={handleChange} placeholder="z.B. Bank monatlich" className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Bemerkungen</label><textarea name="notes" value={form?.notes ?? ''} onChange={handleChange} rows={3} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" /></div>
            </div>
          </div>

          {member?.family && (
            <div className="bg-card rounded-xl p-6 shadow-sm">
              <h2 className="font-display font-bold flex items-center gap-2 mb-3"><Users className="w-5 h-5 text-primary" /> Familienmitglieder</h2>
              <div className="space-y-2">
                {member?.family?.members?.filter((m: any) => m?.id !== memberId)?.map((m: any) => (
                  <Link key={m?.id} href={`/mitglieder/${m?.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{m?.firstName} {m?.lastName} (Nr. {String(m?.memberNumber ?? 0).padStart(5, "0")})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      )}

      {/* Beiträge Tab */}
      {tab === 'beitraege' && (
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">Beiträge</h2>
            <Link href={`/beitraege?memberId=${memberId}`} className="text-sm text-primary hover:underline">Beitrag hinzufügen</Link>
          </div>
          {(member?.contributions?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">Noch keine Beiträge vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-muted/50"><th className="text-left text-xs px-3 py-2">Nr.</th><th className="text-left text-xs px-3 py-2">Zeitraum</th><th className="text-left text-xs px-3 py-2">Betrag</th><th className="text-left text-xs px-3 py-2">Zahlungsart</th><th className="text-left text-xs px-3 py-2">Datum</th></tr></thead>
                <tbody>{member?.contributions?.map((c: any) => <tr key={c?.id} className="border-t border-border"><td className="px-3 py-2 font-mono text-sm">{c?.contributionNumber}</td><td className="px-3 py-2 text-sm">{String(c?.periodMonth).padStart(2,'0')}/{c?.periodYear}</td><td className="px-3 py-2 text-sm font-mono">{c?.amount?.toFixed?.(2)} €</td><td className="px-3 py-2 text-sm">{PAYMENT_METHODS[c?.paymentMethod] ?? c?.paymentMethod}</td><td className="px-3 py-2 text-sm">{new Date(c?.paymentDate).toLocaleDateString('de-DE',{timeZone:'UTC'})}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Spenden Tab */}
      {tab === 'spenden' && (
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">Spenden</h2>
            <Link href={`/spenden?memberId=${memberId}`} className="text-sm text-primary hover:underline">Spende hinzufügen</Link>
          </div>
          {(member?.donations?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">Noch keine Spenden vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-muted/50"><th className="text-left text-xs px-3 py-2">Nr.</th><th className="text-left text-xs px-3 py-2">Datum</th><th className="text-left text-xs px-3 py-2">Betrag</th><th className="text-left text-xs px-3 py-2">Zweck</th><th className="text-left text-xs px-3 py-2">Zahlungsart</th></tr></thead>
                <tbody>{member?.donations?.map((d: any) => <tr key={d?.id} className="border-t border-border"><td className="px-3 py-2 font-mono text-sm">{d?.donationNumber}</td><td className="px-3 py-2 text-sm">{new Date(d?.date).toLocaleDateString('de-DE',{timeZone:'UTC'})}</td><td className="px-3 py-2 text-sm font-mono">{d?.amount?.toFixed?.(2)} €</td><td className="px-3 py-2 text-sm">{d?.purpose ?? '-'}</td><td className="px-3 py-2 text-sm">{PAYMENT_METHODS[d?.paymentMethod] ?? d?.paymentMethod}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* Gremien & Ämter Tab */}
      {tab === 'gremien' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold">Gremien & Ämter</h2>
            <button onClick={() => setShowGremiumForm(!showGremiumForm)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> Hinzufügen
            </button>
          </div>

          {showGremiumForm && (
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Gremium</label>
                  <select value={gremiumForm.gremium} onChange={e => setGremiumForm(p => ({...p, gremium: e.target.value, amt: GREMIEN[e.target.value][0]}))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {Object.keys(GREMIEN).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Amt</label>
                  <select value={gremiumForm.amt} onChange={e => setGremiumForm(p => ({...p, amt: e.target.value}))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {(GREMIEN[gremiumForm.gremium] ?? []).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Von Jahr</label>
                  <input type="number" value={gremiumForm.vonJahr} onChange={e => setGremiumForm(p => ({...p, vonJahr: parseInt(e.target.value)}))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Bis Jahr (leer = aktuell)</label>
                  <input type="number" value={gremiumForm.bisJahr} onChange={e => setGremiumForm(p => ({...p, bisJahr: e.target.value}))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="aktuell" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Bemerkung</label>
                  <input value={gremiumForm.notes} onChange={e => setGremiumForm(p => ({...p, notes: e.target.value}))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <button onClick={async () => {
                try {
                  const payload = { memberId, gremium: gremiumForm.gremium, amt: gremiumForm.amt, vonJahr: gremiumForm.vonJahr, bisJahr: gremiumForm.bisJahr ? parseInt(String(gremiumForm.bisJahr)) : null, notes: gremiumForm.notes || null };
                  const res = await fetch('/api/gremium', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                  if (!res.ok) { toast.error('Fehler'); return; }
                  toast.success('Gespeichert!');
                  setShowGremiumForm(false);
                  fetchGremium(memberId);
                } catch { toast.error('Fehler'); }
              }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
                Speichern
              </button>
            </div>
          )}

          {gremiumItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">Noch keine Einträge.</p>
          ) : (
            <div className="space-y-2">
              {gremiumItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                  <div>
                    <p className="font-medium text-sm">{item.gremium}</p>
                    <p className="text-xs text-muted-foreground">{item.amt} · {item.vonJahr} – {item.bisJahr ?? 'aktuell'}</p>
                    {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                  </div>
                  <button onClick={async () => {
                    if (!confirm('Löschen?')) return;
                    await fetch('/api/gremium', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) });
                    fetchGremium(memberId);
                  }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dokumente Tab */}
      {tab === 'dokumente' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold">Dokumente</h2>
              <button onClick={() => setShowUpload(!showUpload)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
                <Plus className="w-4 h-4" /> Hochladen
              </button>
            </div>

            {showUpload && (
              <form onSubmit={handleUpload} className="mb-6 p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Kategorie</label>
                    <select value={uploadForm.category} onChange={e => setUploadForm(p => ({...p, category: e.target.value}))} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Kategorie wählen</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bemerkungen</label>
                    <input value={uploadForm.notes} onChange={e => setUploadForm(p => ({...p, notes: e.target.value}))} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Datei *</label>
                    <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={uploading} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{uploading ? 'Lädt...' : 'Hochladen'}</button>
                  <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 border border-input rounded-lg text-sm">Abbrechen</button>
                </div>
              </form>
            )}

            {documents.length === 0 ? (
              <p className="text-muted-foreground text-sm">Noch keine Dokumente vorhanden.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div key={doc?.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      {isImage(doc?.fileName) ? (
                        <img src={doc?.cloudStoragePath} alt={doc?.fileName} className="w-10 h-10 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{doc?.fileName}</p>
                        <p className="text-xs text-muted-foreground">{doc?.category ?? 'Allgemein'} · {new Date(doc?.createdAt).toLocaleDateString('de-DE', { timeZone: 'UTC' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPreviewDoc(doc)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Vorschau">
                        <Eye className="w-4 h-4 text-primary" />
                      </button>
                      <a href={doc?.cloudStoragePath} download={doc?.fileName} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Herunterladen">
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </a>
                      <button onClick={() => handleDeleteDoc(doc?.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Löschen">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
