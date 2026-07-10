'use client';

import { useEffect, useState, useCallback } from 'react';
import { Heart, Plus, Search, ChevronLeft, ChevronRight, User, UserX, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { PAYMENT_METHODS } from '@/lib/roles';

export default function SpendenPage() {
  const searchParams = useSearchParams();
  const presetMemberId = searchParams?.get('memberId') ?? '';
  const [donations, setDonations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!presetMemberId);
  const [members, setMembers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [isExternal, setIsExternal] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);
  const [form, setForm] = useState({
    memberId: presetMemberId,
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'BAR',
    purpose: '',
    notes: '',
    externalDonorName: '',
    externalDonorAddress: '',
  });

  const [printFrom, setPrintFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [printTo, setPrintTo] = useState(`${new Date().getFullYear()}-12-31`);

  const printSpenden = async () => {
    const res = await fetch(`/api/donations?fromDate=${printFrom}&toDate=${printTo}&limit=5000`);
    const data = await res.json();
    const list = data?.donations ?? [];
    if (!list.length) { alert('Keine Spenden im gewählten Zeitraum.'); return; }
    const s = await fetch('/api/verein-settings').then(r => r.json()).catch(() => ({}));
    const total = list.reduce((sum: number, d: any) => sum + (d.amount ?? 0), 0);
    const rows = list.map((d: any) => `<tr>
      <td style="padding:4px 8px;border:1px solid #ddd;">${d.donationNumber}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${d.member ? d.member.lastName + ', ' + d.member.firstName : (d.externalDonorName ?? '—')}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${new Date(d.date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;text-align:right">${d.amount?.toFixed(2)} €</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${d.paymentMethod}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${d.purpose ?? '—'}</td>
    </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:9pt}
      .page{width:210mm;min-height:297mm;padding:12mm 15mm;max-width:210mm}
      .hdr{display:flex;align-items:center;gap:12px;margin-bottom:3mm}
      .logo{width:70px;height:70px;border-radius:50%;object-fit:cover}
      .logo-r{width:70px;height:70px;object-fit:contain}
      .band{border-top:1px solid #555;border-bottom:1px solid #555;padding:2mm 0;font-size:7pt;color:#333;margin-bottom:5mm}
      table{width:100%;border-collapse:collapse;margin-top:3mm}
      th{background:#f0f0f0;padding:4px 8px;border:1px solid #ddd;text-align:left;font-size:8pt}
      @media print{.page{margin:0}@page{margin:0;size:A4}}
    </style></head><body><div class="page">
      <div class="hdr">
        <img class="logo" src="${s.logoLeft ?? '/logo.jpg'}" />
        <div style="flex:1;text-align:center"><div style="font-size:13pt;font-weight:bold;line-height:1.3">${s.name ?? 'Alevitische Kulturgemeinde Duisburg'}</div>
        <div style="font-size:8pt;color:#333;margin-top:2px">${s.unterzeile ?? ''}</div></div>
        <img class="logo-r" src="${s.logoRight ?? '/AABF.jpeg'}" />
      </div>
      <div class="band">${s.strasse ?? ''}, ${s.plz ?? ''} ${s.stadt ?? ''} | Tel: ${s.telefon ?? ''} | ${s.email ?? ''} | Vorsitzender: ${s.vorsitzender ?? ''}</div>
      <p style="font-weight:bold;font-size:11pt;margin-bottom:2mm">Spendenliste: ${new Date(printFrom).toLocaleDateString('de-DE')} – ${new Date(printTo).toLocaleDateString('de-DE')}</p>
      <p style="font-size:8pt;color:#555;margin-bottom:3mm">${list.length} Spenden gesamt</p>
      <table><thead><tr><th>Nr.</th><th>Spender</th><th>Datum</th><th style="text-align:right">Betrag</th><th>Zahlungsart</th><th>Zweck</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p style="text-align:right;font-weight:bold;margin-top:4mm;font-size:11pt">Gesamt: ${total.toFixed(2)} €</p>
    </div></body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const deleteDonation = async (id: string, nr: number) => {
    if (!confirm(`Spende Nr. ${nr} wirklich l\u00f6schen? (Wiederherstellung durch Admin m\u00f6glich)`)) return;
    try {
      const res = await fetch('/api/donations', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) { toast.error('Fehler beim L\u00f6schen'); return; }
      toast.success('Spende gel\u00f6scht');
      fetchDonations();
    } catch { toast.error('Fehler'); }
  };

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), search });
      const res = await fetch(`/api/donations?${params}`);
      const data = await res.json();
      setDonations(data?.donations ?? []);
      setTotal(data?.total ?? 0);
      setTotalPages(data?.totalPages ?? 1);
    } catch { console.error('Fehler'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);
  useEffect(() => {
    fetch('/api/members?limit=1000').then(r => r.json()).then(d => setMembers(d?.members ?? [])).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanAmount = (() => { const s = String(form.amount).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'); const n = parseFloat(s); return isNaN(n) ? form.amount : n; })();
      const base = { ...form, amount: cleanAmount };
      const payload = isExternal
        ? { ...base, memberId: null }
        : { ...base, externalDonorName: null, externalDonorAddress: null };

      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err?.error ?? 'Fehler'); return; }
      toast.success('Spende gespeichert.');
      setShowForm(false);
      setForm({ memberId: '', date: new Date().toISOString().split('T')[0], amount: '', paymentMethod: 'BAR', purpose: '', notes: '', externalDonorName: '', externalDonorAddress: '' });
      setIsExternal(false);
      fetchDonations();
    } catch { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  const handlePrint = async (donationId: string, donationNumber: number) => {
    const a = document.createElement('a');
    a.href = `/api/spendenquittung?id=${donationId}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const donorName = (d: any) => {
    if (d?.externalDonorName) return d.externalDonorName;
    if (d?.member) return `${d.member.firstName} ${d.member.lastName}`;
    return '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" /> Spenden
          </h1>
          <p className="text-muted-foreground text-sm">{total} Spende{total !== 1 ? 'n' : ''} gesamt</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Von</span>
          <input type="date" value={printFrom} onChange={e => setPrintFrom(e.target.value)} className="px-2 py-1.5 border border-input rounded-lg text-sm bg-background" />
          <span className="text-xs text-muted-foreground">Bis</span>
          <input type="date" value={printTo} onChange={e => setPrintTo(e.target.value)} className="px-2 py-1.5 border border-input rounded-lg text-sm bg-background" />
          <button onClick={printSpenden} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:opacity-90">
            🖨️ Drucken
          </button>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Neue Spende
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-display font-bold text-lg">Neue Spende erfassen</h2>
          <div className="flex gap-3">
            <button type="button" onClick={() => setIsExternal(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border transition-colors ${!isExternal ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}>
              <User className="w-4 h-4" /> Mitglied
            </button>
            <button type="button" onClick={() => setIsExternal(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border transition-colors ${isExternal ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}>
              <UserX className="w-4 h-4" /> Kein Mitglied
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isExternal ? (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Mitglied *</label>
                <select value={form.memberId} onChange={e => setForm(p => ({ ...p, memberId: e.target.value }))} required
                  className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Mitglied auswählen...</option>
                  {members?.map((m: any) => (
                    <option key={m?.id} value={m?.id}>{String(m?.memberNumber ?? 0).padStart(5, "0")} – {m?.lastName}, {m?.firstName}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Name des Spenders *</label>
                  <input value={form.externalDonorName} onChange={e => setForm(p => ({ ...p, externalDonorName: e.target.value }))} required
                    placeholder="Vor- und Nachname"
                    className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Adresse</label>
                  <input value={form.externalDonorAddress} onChange={e => setForm(p => ({ ...p, externalDonorAddress: e.target.value }))}
                    placeholder="Straße, PLZ Ort"
                    className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Datum *</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Betrag (€) *</label>
              <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required
                onBlur={e => { const raw = e.target.value.replace(/[^\d,.-]/g, ''); if (!raw) return; const n = parseFloat(raw.replace(/\./g, '').replace(',', '.')); if (!isNaN(n)) setForm(p => ({ ...p, amount: n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' })); }}
                placeholder="z.B. 1.000,00 €"
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zahlungsart</label>
              <select value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                {Object.keys(PAYMENT_METHODS ?? { BAR: 'BAR', ÜBERWEISUNG: 'ÜBERWEISUNG', LASTSCHRIFT: 'LASTSCHRIFT' }).map((m: string) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Verwendungszweck</label>
              <input value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                placeholder="z.B. Spende, Veranstaltung..."
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Bemerkungen</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'Speichern...' : 'Spende speichern'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setIsExternal(false); }} className="px-6 py-2.5 rounded-lg border border-input hover:bg-muted">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Suchen..." className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {/* Liste */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : donations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Keine Spenden gefunden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Nr.</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Spender</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Datum</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Betrag</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Zahlungsart</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Zweck</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Bemerkung</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Herunterladen</th>
                </tr>
              </thead>
              <tbody>
                {donations?.map((d: any, i: number) => (
                  <tr key={d?.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{d?.donationNumber}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {d?.externalDonorName && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            <UserX className="w-3 h-3" /> Kein Mitglied
                          </span>
                        )}
                        <span>{donorName(d)}</span>
                      </div>
                      {d?.externalDonorAddress && <p className="text-xs text-muted-foreground mt-0.5">{d.externalDonorAddress}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm">{d?.date ? new Date(d.date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">{d?.amount?.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-sm">{d?.paymentMethod}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{d?.purpose ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{d?.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handlePrint(d?.id, d?.donationNumber)}
                        disabled={printing === d?.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {printing === d?.id ? (
                          <div className="w-3 h-3 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Printer className="w-3.5 h-3.5" />
                        )}
                        Quittung
                      </button>
                      <button
                        onClick={() => deleteDonation(d?.id, d?.donationNumber)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Seite {page} von {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-input hover:bg-muted disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-input hover:bg-muted disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
