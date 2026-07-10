'use client';

import { useEffect, useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, CreditCard, Heart, FileText, Trash2, Users, Plus, Eye, Download, X, Camera, BarChart3 } from 'lucide-react';;
import { toast } from 'sonner';
import { GENDER_LABELS, CONTRIBUTION_LEVELS, MEMBER_STATUS_LABELS, PAYMENT_METHODS } from '@/lib/roles';
import { useSession } from 'next-auth/react';

const CATEGORIES = ['Mitgliedsantrag', 'Einverständniserklärung', 'Ausweiskopie', 'Foto', 'Sonstiges'];


function FinanzenTab({ memberId }: { memberId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) return;
    fetch(`/api/members/${memberId}/finanzen`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [memberId]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!data) return <p className="text-muted-foreground text-sm">Keine Daten gefunden.</p>;

  const printFinanzen = async (mid: string) => {
    const memberRes = await fetch(`/api/members/${mid}`).then(r => r.json()).catch(() => ({}));
    const member = memberRes?.member ?? memberRes;
    const s = await fetch('/api/verein-settings').then(r => r.json()).catch(() => ({}));
    const rows = (data.byYear ?? []).map((row: any) => `<tr>
      <td style="padding:5px 8px;border:1px solid #ddd;">${row.year}</td>
      <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:#16a34a">${row.beitraege?.toFixed(2)} €</td>
      <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;color:#dc2626">${row.spenden?.toFixed(2)} €</td>
      <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-weight:bold">${(row.beitraege + row.spenden)?.toFixed(2)} €</td>
    </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:10pt}
      .page{width:210mm;min-height:297mm;padding:15mm 20mm}
      .hdr{display:flex;align-items:center;gap:12px;margin-bottom:4mm}
      .logo{width:75px;height:75px;border-radius:50%;object-fit:cover}
      .logo-r{width:75px;height:75px;object-fit:contain}
      .band{border-top:1px solid #555;border-bottom:1px solid #555;padding:2mm 0;font-size:7pt;color:#333;margin-bottom:6mm}
      table{width:100%;border-collapse:collapse;margin-top:4mm}
      th{background:#f0f0f0;padding:5px 8px;border:1px solid #ddd;text-align:left;font-size:9pt}
      .summary{display:flex;gap:20px;margin:5mm 0}
      .box{flex:1;padding:8px;border-radius:8px;text-align:center}
      @media print{.page{margin:0}@page{margin:0;size:A4}}
    </style></head><body><div class="page">
      <div class="hdr">
        <img class="logo" src="${s.logoLeft ?? '/logo.jpg'}" />
        <div style="flex:1"><div style="font-size:11pt;font-weight:bold;line-height:1.2">${s.name ?? 'Alevitische Kulturgemeinde Duisburg'}</div>
        <div style="font-size:8pt;color:#333">${s.unterzeile ?? ''}</div></div>
        <img class="logo-r" src="${s.logoRight ?? '/AABF.jpeg'}" />
      </div>
      <div class="band">${s.strasse ?? ''}, ${s.plz ?? ''} ${s.stadt ?? ''} | Tel: ${s.telefon ?? ''} | ${s.email ?? ''} | Vorsitzender: ${s.vorsitzender ?? ''}</div>
      <p style="text-align:right;margin-bottom:5mm">${s.stadt ?? 'Duisburg'}, ${new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}</p>
      <p style="margin-bottom:6mm"><strong>${member?.gender === 'WEIBLICH' ? 'Frau' : 'Herr'} ${member?.firstName} ${member?.lastName}</strong><br/>Mitgliedsnummer: ${String(member?.memberNumber ?? 0).padStart(5,'0')}</p>
      <p style="font-weight:bold;font-size:11pt;margin-bottom:3mm">Übersicht & Finanzen</p>
      <div class="summary">
        <div class="box" style="background:#f0fdf4"><div style="font-size:16pt;font-weight:bold;color:#16a34a">${data.totalBeitraege?.toFixed(2)} €</div><div style="font-size:8pt">Gesamt Beiträge</div></div>
        <div class="box" style="background:#fef2f2"><div style="font-size:16pt;font-weight:bold;color:#dc2626">${data.totalSpenden?.toFixed(2)} €</div><div style="font-size:8pt">Gesamt Spenden</div></div>
        <div class="box" style="background:#eff6ff"><div style="font-size:16pt;font-weight:bold;color:#2563eb">${(data.totalBeitraege + data.totalSpenden)?.toFixed(2)} €</div><div style="font-size:8pt">Gesamt</div></div>
      </div>
      <table><thead><tr><th>Jahr</th><th style="text-align:right">Beiträge</th><th style="text-align:right">Spenden</th><th style="text-align:right">Gesamt</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div></body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="space-y-6">
      {/* Gesamtübersicht */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{data.totalBeitraege?.toFixed(2)} €</p>
          <p className="text-xs text-muted-foreground mt-1">Gesamt Beiträge</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{data.totalSpenden?.toFixed(2)} €</p>
          <p className="text-xs text-muted-foreground mt-1">Gesamt Spenden</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{(data.totalBeitraege + data.totalSpenden)?.toFixed(2)} €</p>
          <p className="text-xs text-muted-foreground mt-1">Gesamt</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => printFinanzen(memberId)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          🖨️ Drucken
        </button>
      </div>

      {/* Yıllara göre */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Jahr</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Beiträge</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Spenden</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {(data.byYear ?? []).map((row: any) => (
              <tr key={row.year} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-sm">{row.year}</td>
                <td className="px-4 py-3 text-right text-sm text-emerald-600">{row.beitraege?.toFixed(2)} €</td>
                <td className="px-4 py-3 text-right text-sm text-red-500">{row.spenden?.toFixed(2)} €</td>
                <td className="px-4 py-3 text-right text-sm font-bold">{(row.beitraege + row.spenden)?.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MitgliedDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession() || {};
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [dlFromYear, setDlFromYear] = useState(String(new Date().getFullYear()));
  const [dlToYear, setDlToYear] = useState(String(new Date().getFullYear()));

  const downloadBeitraege = async () => {
    const from = parseInt(dlFromYear);
    const to = parseInt(dlToYear);
    const filtered = (member?.contributions ?? []).filter((c: any) => c.periodYear >= from && c.periodYear <= to);
    if (!filtered.length) { alert('Keine Beiträge im gewählten Zeitraum.'); return; }
    const s = await fetch('/api/verein-settings').then(r => r.json()).catch(() => ({}));
    const total = filtered.reduce((sum: number, c: any) => sum + (c.amount ?? 0), 0);
    const anrede = member?.gender === 'WEIBLICH' ? 'Frau' : 'Herr';
    const trs = filtered.map((c: any) => `<tr>
      <td style="padding:4px 8px;border:1px solid #ddd;">${String(c.periodMonth).padStart(2,'0')}/${c.periodYear}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${c.amount?.toFixed(2)} €</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${c.paymentMethod}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${new Date(c.paymentDate).toLocaleDateString('de-DE',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'})}</td>
    </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:10pt}
      .page{width:210mm;min-height:297mm;padding:15mm 20mm}
      .hdr{display:flex;align-items:center;gap:12px;margin-bottom:4mm}
      .logo{width:75px;height:75px;border-radius:50%;object-fit:cover}
      .logo-r{width:75px;height:75px;object-fit:contain}
      .band{border-top:1px solid #555;border-bottom:1px solid #555;padding:2mm 0;font-size:7pt;color:#333;margin-bottom:6mm}
      table{width:100%;border-collapse:collapse;margin-top:4mm}
      th{background:#f0f0f0;padding:5px 8px;border:1px solid #ddd;text-align:left;font-size:9pt}
      @media print{.page{margin:0}@page{margin:0;size:A4}}
    </style></head><body><div class="page">
      <div class="hdr">
        <img class="logo" src="${s.logoLeft ?? '/logo.jpg'}" />
        <div style="flex:1"><div style="font-size:11pt;font-weight:bold;line-height:1.2">${s.name ?? 'Alevitische Kulturgemeinde Duisburg'}</div>
        <div style="font-size:8pt;color:#333">${s.unterzeile ?? ''}</div></div>
        <img class="logo-r" src="${s.logoRight ?? '/AABF.jpeg'}" />
      </div>
      <div class="band">${s.strasse ?? ''}, ${s.plz ?? ''} ${s.stadt ?? ''} | Tel: ${s.telefon ?? ''} | ${s.email ?? ''} | Vorsitzender: ${s.vorsitzender ?? ''} | IBAN: ${s.iban ?? ''}</div>
      <p style="text-align:right;margin-bottom:5mm">${s.stadt ?? 'Duisburg'}, ${new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}</p>
      <p style="margin-bottom:6mm"><strong>${anrede} ${member?.firstName} ${member?.lastName}</strong><br/>Mitgliedsnummer: ${String(member?.memberNumber ?? 0).padStart(5,'0')}</p>
      <p style="font-weight:bold;font-size:11pt;margin-bottom:3mm">Beitragsübersicht ${from} – ${to}</p>
      <table><thead><tr><th>Zeitraum</th><th>Betrag</th><th>Zahlungsart</th><th>Datum</th></tr></thead>
      <tbody>${trs}</tbody></table>
      <p style="text-align:right;font-weight:bold;margin-top:5mm;font-size:11pt">Gesamt: ${total.toFixed(2)} €</p>
    </div></body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };
  const [cropModal, setCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const onCropComplete = useCallback((_: any, cap: any) => setCroppedAreaPixels(cap), []);

  
  const memberId = searchParams?.get("id") ?? "";

  const fetchMember = useCallback(async () => {
    if (!memberId) return;
    try {
      const res = await fetch(`/api/members/${memberId}`);
      const data = await res.json();
      setMember(data);
      setForm(data);
      setLoading(false);
    } catch { setLoading(false); }
  }, [memberId]);

  useEffect(() => { if (memberId) fetchMember(); }, [fetchMember]);

  const fetchFamilies = useCallback(async () => {
    try {
      const res = await fetch('/api/families');
      const data = await res.json();
      setFamilies(data.families ?? []);
    } catch {}
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!memberId) return;
    try {
      const res = await fetch('/api/documents?memberId=' + memberId);
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch {}
  }, [memberId]);

  useEffect(() => { fetchFamilies(); }, [fetchFamilies]);
  useEffect(() => { if (memberId) fetchDocuments(); }, [fetchDocuments]);

  const printBescheinigung = () => {
    const anrede = member?.gender === 'WEIBLICH' ? 'Frau' : 'Herr';
    const geb = member?.birthDate ? new Date(member.birthDate).toLocaleDateString('de-DE', { timeZone: 'UTC' }) : '________________';
    const eintritt = member?.entryDate ? new Date(member.entryDate).toLocaleDateString('de-DE', { timeZone: 'UTC' }) : '________________';
    const anschrift = [member?.street, [member?.zipCode, member?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '______________________';
    const heute = new Date().toLocaleDateString('de-DE');
    const nr = String(member?.memberNumber ?? 0).padStart(5, '0');
    const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mitgliedsbescheinigung</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; padding: 20mm 25mm; line-height: 1.6; }
  .kopf { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 8mm; border-bottom: 2px solid #16a34a; padding-bottom: 5mm; }
  .kopf .logo-links { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; }
  .kopf .logo-rechts { width: 80px; height: 80px; object-fit: contain; }
  .kopf-mitte { flex: 1; text-align: center; }
  .kopf-mitte h1 { font-size: 12pt; font-weight: bold; margin: 0; line-height: 1.25; white-space: nowrap; }
  .kopf-mitte p { font-size: 9 pt; color: #333; margin-top: 2px; }
  h2.titel { text-align: center; font-size: 16pt; margin: 10mm 0 8mm; text-decoration: underline; }
  .zeile { margin: 4mm 0; }
  .hinweis { font-size: 9.5pt; color: #444; margin-top: 8mm; }
  .sign { margin-top: 20mm; }
  .sign .line { border-top: 1px solid #000; width: 60mm; margin-top: 12mm; padding-top: 2mm; font-size: 9pt; }
  @media print { @page { margin: 0; } }
</style></head><body>
  <div class="kopf">
    <img class="logo-links" src="/Logo_Du_Hamborn.jpg" />
    <div class="kopf-mitte">
      <h1>Alevitische Kulturgemeinde Duisburg und Umgebung e.V.</h1>
      <p>Goethestraße 49, 47166 Duisburg · akm-duisburg@hotmail.com</p>
    </div>
    <img class="logo-rechts" src="/AABF.jpeg" />
  </div>
  <h2 class="titel">Mitgliedsbescheinigung</h2>
  <p class="zeile">Hiermit bestätigen wir, dass</p>
  <p class="zeile"><strong>${anrede} ${member?.firstName ?? ''} ${member?.lastName ?? ''}</strong></p>
  <p class="zeile">Geburtsdatum: ${geb}</p>
  <p class="zeile">Anschrift: ${anschrift}</p>
  <p class="zeile">seit dem <strong>${eintritt}</strong> Mitglied in unserem Verein</p>
  <p class="zeile"><strong>Alevitische Kulturgemeinde Duisburg und Umgebung e.V.</strong> ist.</p>
  <p class="zeile">Mitgliedsnummer: <strong>${nr}</strong></p>
  <p class="hinweis">Diese Bescheinigung wird auf Wunsch des Mitglieds zur Vorlage bei Behörden, Institutionen oder anderen Stellen ausgestellt.</p>
  <div class="sign">
    <p>Ort, Datum: Duisburg, ${heute}</p>
    <div class="line">Vorstand / Vorsitzende(r)</div>
    <div class="line">Name</div>
    <p style="margin-top:15mm;color:#999;font-size:9pt">Vereinsstempel</p>
  </div>
</body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  };

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Nur Bilder erlaubt.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setPendingFile(file);
      setCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const getCroppedImage = async (): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc!;
    await new Promise(r => { image.onload = r; });
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(200, 200, 200, 0, Math.PI * 2);
    ctx.clip();
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    ctx.drawImage(image, croppedAreaPixels.x * scaleX, croppedAreaPixels.y * scaleY, croppedAreaPixels.width * scaleX, croppedAreaPixels.height * scaleY, 0, 0, 400, 400);
    return new Promise(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.9));
  };

  const handleCropConfirm = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setPhotoUploading(true);
    setCropModal(false);
    try {
      const blob = await getCroppedImage();
      const croppedFile = new File([blob], pendingFile?.name ?? 'photo.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', croppedFile);
      formData.append('memberId', memberId);
      const uploadRes = await fetch('/api/upload/presigned', { method: 'POST', body: formData });
      if (!uploadRes.ok) { toast.error('Upload fehlgeschlagen'); return; }
      const { url } = await uploadRes.json();
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photoPath: url }),
      });
      if (!res.ok) { toast.error('Fehler beim Speichern'); return; }
      toast.success('Foto gespeichert.');
      fetchMember();
    } catch { toast.error('Fehler'); }
    finally { setPhotoUploading(false); setImageSrc(null); setPendingFile(null); }
  };

  const handlePhotoDelete = async () => {
    if (!confirm('Foto wirklich löschen?')) return;
    try {
      await fetch(`/api/members/${memberId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photoPath: null }),
      });
      toast.success('Foto gelöscht.');
      fetchMember();
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
    { key: 'finanzen', label: 'Übersicht & Finanzen', icon: BarChart3 },
  ];


  return (
    <div className="space-y-6">
      {/* Crop Modal */}
      {cropModal && imageSrc && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
          <div style={{background:'white',borderRadius:'12px',width:'100%',maxWidth:'500px',padding:'24px',display:'flex',flexDirection:'column',gap:'16px'}}>
            <h2 style={{fontWeight:'bold',fontSize:'18px'}}>Foto zuschneiden</h2>
            <div style={{position:'relative',width:'100%',height:'320px',background:'#f3f4f6',borderRadius:'8px',overflow:'hidden'}}>
              <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
                onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
            </div>
            <div>
              <label style={{display:'block',fontSize:'13px',color:'#666',marginBottom:'4px'}}>Zoom</label>
              <input type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={e => setZoom(Number(e.target.value))} style={{width:'100%'}} />
            </div>
            <div style={{display:'flex',gap:'12px'}}>
              <button onClick={handleCropConfirm} disabled={photoUploading}
                style={{flex:1,background:'#16a34a',color:'white',border:'none',borderRadius:'8px',padding:'10px',fontWeight:'600',cursor:'pointer',opacity:photoUploading?0.5:1}}>
                {photoUploading ? 'Speichere...' : 'Übernehmen'}
              </button>
              <button onClick={() => { setCropModal(false); setImageSrc(null); }}
                style={{padding:'10px 16px',border:'1px solid #e5e7eb',borderRadius:'8px',background:'white',cursor:'pointer'}}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
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
        <button onClick={printBescheinigung} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
            <FileText className="w-4 h-4" /> Bescheinigung
          </button>
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
            
            {/* Fotoğraf */}
            <div className="flex items-center gap-6 pb-4 border-b border-border">
              <div className="relative">
                {member?.photoPath ? (
                  <img src={member.photoPath} alt="Foto" className="w-36 h-36 rounded-full object-cover border-4 border-border" />
                ) : (
                  <div className="w-36 h-36 rounded-full bg-primary/10 border-4 border-border flex items-center justify-center">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Profilfoto</p>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer hover:opacity-90">
                    <Camera className="w-4 h-4" />
                    {photoUploading ? 'Lädt...' : 'Foto hochladen'}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={photoUploading} />
                  </label>
                  {member?.photoPath && (
                    <button onClick={handlePhotoDelete} className="flex items-center gap-1.5 px-3 py-2 border border-destructive text-destructive rounded-lg text-sm hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" /> Löschen
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">JPG, PNG, max. 5MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Mitgliedsnummer</label><input value={member?.memberNumber ? String(member.memberNumber).padStart(5, '0') : '—'} readOnly className="w-full px-3 py-2.5 border border-input rounded-lg bg-muted text-muted-foreground cursor-not-allowed" /></div>
              <div><label className="block text-sm font-medium mb-1">Vorname</label><input name="firstName" value={form?.firstName ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Nachname</label><input name="lastName" value={form?.lastName ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Geburtsdatum</label><input name="birthDate" type="date" value={form?.birthDate ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Geschlecht</label><select name="gender" value={form?.gender ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"><option value="">-</option>{Object.entries(GENDER_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Staatsangehörigkeit</label><select name="nationality" value={form?.nationality ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"><option value="">Bitte wählen</option><option value="deutsch">Deutsch</option><option value="türkisch">Türkisch</option><option value="deutsch-türkisch">Deutsch / Türkisch (Doppelte)</option><option value="andere">Andere</option></select></div>
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
              <div><label className="block text-sm font-medium mb-1">Beitragsstufe</label><select name="contributionLevel" value={form?.contributionLevel ?? 'NORMAL'} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">{Object.entries(CONTRIBUTION_LEVELS).map(([k,v]) => <option key={k} value={k}>{v.label} ({v.amount}€)</option>)}</select></div>
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
              <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Zahlungsweise</label><select name="zahlungsweise" value={form?.zahlungsweise ?? ''} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"><option value="">Bitte wählen</option><option value="monatlich">Monatlich</option><option value="vierteljährlich">Vierteljährlich</option><option value="halbjährlich">Halbjährlich</option><option value="jährlich">Jährlich</option></select></div>
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Von</span>
              <input type="number" value={dlFromYear} onChange={e => setDlFromYear(e.target.value)} className="w-20 px-2 py-1 border border-input rounded text-sm bg-background" />
              <span className="text-xs text-muted-foreground">Bis</span>
              <input type="number" value={dlToYear} onChange={e => setDlToYear(e.target.value)} className="w-20 px-2 py-1 border border-input rounded text-sm bg-background" />
              <button onClick={downloadBeitraege} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90">
                <Download className="w-3 h-3" /> Drucken
              </button>
              <Link href={`/beitraege?memberId=${memberId}`} className="text-sm text-primary hover:underline">Hinzufügen</Link>
            </div>
          </div>
          {(member?.contributions?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">Noch keine Beiträge vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-muted/50"><th className="text-left text-xs px-3 py-2">Nr.</th><th className="text-left text-xs px-3 py-2">Zeitraum</th><th className="text-left text-xs px-3 py-2">Betrag</th><th className="text-left text-xs px-3 py-2">Zahlungsart</th><th className="text-left text-xs px-3 py-2">Datum</th></tr></thead>
                <tbody>{member?.contributions?.map((c: any) => <tr key={c?.id} className="border-t border-border"><td className="px-3 py-2 font-mono text-sm">{c?.contributionNumber}</td><td className="px-3 py-2 text-sm">{String(c?.periodMonth).padStart(2,'0')}/{c?.periodYear}</td><td className="px-3 py-2 text-sm font-mono">{c?.amount?.toFixed?.(2)} €</td><td className="px-3 py-2 text-sm">{PAYMENT_METHODS[c?.paymentMethod] ?? c?.paymentMethod}</td><td className="px-3 py-2 text-sm">{new Date(c?.paymentDate).toLocaleDateString('de-DE',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'})}</td></tr>)}</tbody>
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
                <tbody>{member?.donations?.map((d: any) => <tr key={d?.id} className="border-t border-border"><td className="px-3 py-2 font-mono text-sm">{d?.donationNumber}</td><td className="px-3 py-2 text-sm">{new Date(d?.date).toLocaleDateString('de-DE',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'})}</td><td className="px-3 py-2 text-sm font-mono">{d?.amount?.toFixed?.(2)} €</td><td className="px-3 py-2 text-sm">{d?.purpose ?? '-'}</td><td className="px-3 py-2 text-sm">{PAYMENT_METHODS[d?.paymentMethod] ?? d?.paymentMethod}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dokumente Tab */}

      {/* Gremien & Ämter Tab */}

      {/* Übersicht & Finanzen Tab */}
      {tab === 'finanzen' && (
        <FinanzenTab memberId={memberId} />
      )}

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
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm">
                    {Object.keys(GREMIEN).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Amt</label>
                  <select value={gremiumForm.amt} onChange={e => setGremiumForm(p => ({...p, amt: e.target.value}))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm">
                    {(GREMIEN[gremiumForm.gremium] ?? []).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Von Jahr</label>
                  <input type="number" value={gremiumForm.vonJahr} onChange={e => setGremiumForm(p => ({...p, vonJahr: parseInt(e.target.value)}))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Bis Jahr</label>
                  <input type="number" value={gremiumForm.bisJahr} onChange={e => setGremiumForm(p => ({...p, bisJahr: e.target.value}))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm" placeholder="aktuell" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Bemerkung</label>
                  <input value={gremiumForm.notes} onChange={e => setGremiumForm(p => ({...p, notes: e.target.value}))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm" />
                </div>
              </div>
              <button onClick={async () => {
                try {
                  const memberId = member?.id;
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
                    fetchGremium(member?.id);
                  }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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