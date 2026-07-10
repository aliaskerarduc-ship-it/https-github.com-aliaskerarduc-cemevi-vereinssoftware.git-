'use client';

import { useEffect, useState, useCallback } from 'react';
import { Receipt, Plus, Search, ChevronLeft, ChevronRight, Trash2, Printer, X, Eye, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const STANDARD_CATEGORIES = [
  'Hausgeld', 'Strom', 'Wasser', 'Internet/Telefon',
  'Reinigung', 'Veranstaltung', 'Büromaterial',
  'Versicherung', 'AABF Mitgliedsbeitrag', 'AABF-NRW Mitgliedsbeitrag',
  'Bund der Alevitischen Frauen (AAKB)', 'Reisekosten', 'Renovierung',
  'Inventar', 'Sonstige', 'Manuell Eingabe',
];
const PAYMENT_METHODS = ['BAR', 'UBERWEISUNG', 'LASTSCHRIFT'];
const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));
const PERIODS = [
  { value: '1', label: 'Monatlich (1 Monat)' }, { value: '3', label: 'Quartal (3 Monate)' },
  { value: '6', label: 'Halbjahr (6 Monate)' }, { value: '12', label: 'Jahresbericht (12 Monate)' },
];
const MONTHS = [
  { value: '1', label: 'Januar' }, { value: '2', label: 'Februar' }, { value: '3', label: 'März' },
  { value: '4', label: 'April' }, { value: '5', label: 'Mai' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Dezember' },
];
const QUARTERS = [
  { value: '1', label: 'Q1 (Jan-Mrz)' }, { value: '2', label: 'Q2 (Apr-Jun)' },
  { value: '3', label: 'Q3 (Jul-Sep)' }, { value: '4', label: 'Q4 (Okt-Dez)' },
];
const HALFYEARS = [
  { value: '1', label: '1. Halbjahr (Jan-Jun)' }, { value: '2', label: '2. Halbjahr (Jul-Dez)' },
];

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  category: '', customCategory: '', description: '', amount: '', paymentMethod: 'BAR', notes: '', rechnungsNummer: '', lieferant: '',
};

export default function AusgabenPage() {
  const [ausgaben, setAusgaben] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isManual, setIsManual] = useState(false);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfYear, setPdfYear] = useState(String(new Date().getFullYear()));
  const [pdfPeriod, setPdfPeriod] = useState('12');
  const [pdfSubPeriod, setPdfSubPeriod] = useState('1');

  const [form, setForm] = useState(emptyForm);

  const fetchAusgaben = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), search, limit: '25' });
      if (year) params.append('year', year);
      if (month) params.append('month', month);
      const res = await fetch(`/api/ausgaben?${params}`);
      const data = await res.json();
      setAusgaben(data?.ausgaben ?? []);
      setTotal(data?.total ?? 0);
      setTotalAmount(data?.totalAmount ?? 0);
      setTotalPages(data?.totalPages ?? 1);
    } catch { console.error('Fehler'); }
    finally { setLoading(false); }
  }, [page, search, year, month]);

  useEffect(() => { fetchAusgaben(); }, [fetchAusgaben]);

  const handleCategoryChange = (val: string) => {
    if (val === 'Manuell Eingabe') {
      setIsManual(true);
      setForm(p => ({ ...p, category: '', customCategory: '' }));
    } else {
      setIsManual(false);
      setForm(p => ({ ...p, category: val, customCategory: '' }));
    }
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setIsManual(false);
    setShowForm(true);
  };

  const openEdit = (a: any) => {
    setEditId(a.id);
    const isStandard = STANDARD_CATEGORIES.includes(a.category);
    setIsManual(!isStandard);
    setForm({
      date: new Date(a.date).toISOString().split('T')[0],
      category: isStandard ? a.category : '',
      customCategory: !isStandard ? a.category : '',
      description: a.description ?? '',
      amount: String(a.amount),
      paymentMethod: a.paymentMethod ?? 'BAR',
      notes: a.notes ?? '',
      rechnungsNummer: a.rechnungsNummer ?? '',
      lieferant: a.lieferant ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isManual ? form.customCategory.trim() : form.category;
    if (!finalCategory) { toast.error('Kategorie eingeben.'); return; }
    setSaving(true);
    try {
      const payload = {
        date: form.date, category: finalCategory, description: form.description,
        amount: form.amount, paymentMethod: form.paymentMethod, notes: form.notes,
        rechnungsNummer: form.rechnungsNummer, lieferant: form.lieferant,
      };
      const res = await fetch('/api/ausgaben', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err?.error ?? 'Fehler'); return; }
      toast.success(editId ? 'Ausgabe aktualisiert.' : 'Ausgabe gespeichert.');
      setShowForm(false); setIsManual(false); setEditId(null);
      setForm(emptyForm);
      fetchAusgaben();
    } catch { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ausgabe wirklich löschen?')) return;
    try {
      const res = await fetch('/api/ausgaben', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Ausgabe gelöscht.');
      setPreviewItem(null);
      fetchAusgaben();
    } catch { toast.error('Fehler'); }
  };

  const downloadPdf = (inline?: boolean) => {
    let fromMonth = 1, toMonth = 12;
    if (pdfPeriod === '1') { fromMonth = toMonth = parseInt(pdfSubPeriod); }
    else if (pdfPeriod === '3') { const q = parseInt(pdfSubPeriod); fromMonth = (q-1)*3+1; toMonth = q*3; }
    else if (pdfPeriod === '6') { fromMonth = pdfSubPeriod === '1' ? 1 : 7; toMonth = pdfSubPeriod === '1' ? 6 : 12; }
    const params = new URLSearchParams({ year: pdfYear, fromMonth: String(fromMonth), toMonth: String(toMonth) });
    if (inline) params.set('inline', '1');
    window.open(`/api/ausgaben-pdf?${params}`, '_blank');
    setShowPdfModal(false);
  };

  const selectedMonthLabel = month ? MONTHS.find(m => m.value === month)?.label : '';
  const inp = 'w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm';

  return (
    <div className="space-y-6">

      {/* PDF Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">Ausgaben PDF erstellen</h2>
              <button onClick={() => setShowPdfModal(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Jahr</label>
              <select value={pdfYear} onChange={e => setPdfYear(e.target.value)} className={inp}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zeitraum</label>
              <select value={pdfPeriod} onChange={e => { setPdfPeriod(e.target.value); setPdfSubPeriod('1'); }} className={inp}>
                {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {pdfPeriod === '1' && (
              <div>
                <label className="block text-sm font-medium mb-1">Monat</label>
                <select value={pdfSubPeriod} onChange={e => setPdfSubPeriod(e.target.value)} className={inp}>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            )}
            {pdfPeriod === '3' && (
              <div>
                <label className="block text-sm font-medium mb-1">Quartal</label>
                <select value={pdfSubPeriod} onChange={e => setPdfSubPeriod(e.target.value)} className={inp}>
                  {QUARTERS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                </select>
              </div>
            )}
            {pdfPeriod === '6' && (
              <div>
                <label className="block text-sm font-medium mb-1">Halbjahr</label>
                <select value={pdfSubPeriod} onChange={e => setPdfSubPeriod(e.target.value)} className={inp}>
                  {HALFYEARS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => downloadPdf(false)} className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90">
                <Printer className="w-4 h-4" /> PDF erstellen
              </button>
              <button onClick={() => downloadPdf(true)} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:opacity-90">
                <Printer className="w-4 h-4" /> Drucken
              </button>
              <button onClick={() => setShowPdfModal(false)} className="px-4 py-2.5 border border-input rounded-lg hover:bg-muted">Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Önizleme Modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" /> Ausgabe #{previewItem.ausgabeNumber}
              </h2>
              <button onClick={() => setPreviewItem(null)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                ['Nr.', `#${previewItem.ausgabeNumber}`],
                ['Datum', new Date(previewItem.date).toLocaleDateString('de-DE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })],
                ['Kategorie', previewItem.category],
                ['Beschreibung', previewItem.description ?? '—'],
                ['Betrag', `${previewItem.amount?.toFixed(2)} €`],
                ['Zahlungsart', previewItem.paymentMethod],
                ['Bemerkungen', previewItem.notes ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`text-sm font-medium ${label === 'Betrag' ? 'text-destructive' : ''}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { openEdit(previewItem); setPreviewItem(null); }}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:opacity-90 text-sm">
                <Pencil className="w-4 h-4" /> Bearbeiten
              </button>
              <button onClick={() => handleDelete(previewItem.id)}
                className="flex items-center justify-center gap-2 border border-destructive text-destructive px-4 py-2.5 rounded-lg font-medium hover:bg-destructive/10 text-sm">
                <Trash2 className="w-4 h-4" /> Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" /> Ausgaben
          </h1>
          <p className="text-muted-foreground text-sm">
            {total} Ausgabe{total !== 1 ? 'n' : ''} · Gesamt:{' '}
            <span className="font-bold text-destructive">{totalAmount.toFixed(2)} €</span>
            {year && (
              <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                {year}{selectedMonthLabel ? ` · ${selectedMonthLabel}` : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPdfModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:opacity-90">
            <Printer className="w-4 h-4" /> PDF
          </button>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Neue Ausgabe
          </button>
        </div>
      </div>

      {/* Form (Neu / Bearbeiten) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-display font-bold text-lg">{editId ? 'Ausgabe bearbeiten' : 'Neue Ausgabe erfassen'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Datum *</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} required className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategorie *</label>
              <select value={isManual ? 'Manuell Eingabe' : form.category} onChange={e => handleCategoryChange(e.target.value)} className={inp}>
                <option value="">Kategorie wählen...</option>
                {STANDARD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {isManual && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Eigene Kategorie *</label>
                <input value={form.customCategory} onChange={e => setForm(p => ({...p, customCategory: e.target.value}))} required placeholder="z.B. Besondere Ausgabe..." className={inp} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Betrag (€) *</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} required placeholder="0.00" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zahlungsart</label>
              <select value={form.paymentMethod} onChange={e => setForm(p => ({...p, paymentMethod: e.target.value}))} className={inp}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Beschreibung</label>
              <input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="z.B. Januar 2026" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bemerkungen</label>
              <input value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rechnungsnummer</label>
              <input value={form.rechnungsNummer} onChange={e => setForm(p => ({...p, rechnungsNummer: e.target.value}))} placeholder="z.B. RE-2026-001" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lieferant</label>
              <input value={form.lieferant} onChange={e => setForm(p => ({...p, lieferant: e.target.value}))} placeholder="z.B. Stadtwerke Duisburg" className={inp} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'Speichere...' : editId ? 'Aktualisieren' : 'Ausgabe speichern'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setIsManual(false); setEditId(null); }} className="px-6 py-2.5 rounded-lg border border-input hover:bg-muted">Abbrechen</button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Kategorie, Beschreibung suchen..." className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
        </div>
        <select value={year} onChange={e => { setYear(e.target.value); setMonth(''); setPage(1); }} className="px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm">
          <option value="">Alle Jahre</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => { setMonth(e.target.value); setPage(1); }} disabled={!year} className="px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm disabled:opacity-40">
          <option value="">Alle Monate</option>
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Tabelle */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : ausgaben.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Keine Ausgaben gefunden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Nr.</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Datum</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Kategorie</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Beschreibung</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Betrag</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Zahlungsart</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {ausgaben.map((a: any, i: number) => (
                  <tr key={a?.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{a?.ausgabeNumber}</td>
                    <td className="px-4 py-3 text-sm">{new Date(a?.date).toLocaleDateString('de-DE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-sm font-medium">{a?.category}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a?.description ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-destructive">{a?.amount?.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-sm">{a?.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPreviewItem(a)} className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Vorschau">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(a)} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors" title="Bearbeiten">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(a?.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Löschen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 border-t-2 border-border">
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold">Gesamt</td>
                  <td className="px-4 py-3 text-sm font-bold text-destructive">{totalAmount.toFixed(2)} €</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Seite {page} von {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="p-2 rounded-lg border border-input hover:bg-muted disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="p-2 rounded-lg border border-input hover:bg-muted disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
