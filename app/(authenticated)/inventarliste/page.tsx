'use client';

import { useEffect, useState } from 'react';
import { Package, Plus, Pencil, Trash2, X, Save, Search, Printer } from 'lucide-react';
import { toast } from 'sonner';

type Inventar = {
  id: string;
  name: string;
  model?: string;
  quantity: number;
  purchaseDate?: string;
  source: string;
  donorName?: string;
  price?: number;
  status: string;
  notes?: string;
};

const STATUS_LABELS: Record<string, string> = {
  AKTIV: 'Aktiv',
  BOZUK: 'Defekt',
  HURDA: 'Ausgemustert',
};

const STATUS_COLORS: Record<string, string> = {
  AKTIV: 'bg-emerald-100 text-emerald-700',
  BOZUK: 'bg-amber-100 text-amber-700',
  HURDA: 'bg-red-100 text-red-700',
};

const emptyForm = {
  name: '', model: '', quantity: 1, purchaseDate: '',
  source: 'CEMEVI', donorName: '', price: '', status: 'AKTIV', notes: '',
};

export default function InventarlistePage() {
  const [items, setItems] = useState<Inventar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventarliste');
      const data = await res.json();
      setItems(data ?? []);
    } catch { toast.error('Fehler'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item: Inventar) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      model: item.model ?? '',
      quantity: item.quantity,
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
      source: item.source,
      donorName: item.donorName ?? '',
      price: item.price ?? '',
      status: item.status,
      notes: item.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Bezeichnung pflicht!'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: parseInt(form.quantity),
        price: form.price ? parseFloat(form.price) : null,
        purchaseDate: form.purchaseDate ? new Date(form.purchaseDate) : null,
        donorName: form.source === 'BAGIS' ? form.donorName : null,
      };
      const res = await fetch('/api/inventarliste', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success(editId ? 'Aktualisiert!' : 'Gespeichert!');
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      fetchItems();
    } catch { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Löschen?')) return;
    try {
      await fetch('/api/inventarliste', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      toast.success('Gelöscht!');
      fetchItems();
    } catch { toast.error('Fehler'); }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.model ?? '').toLowerCase().includes(search.toLowerCase())
  );


  const printList = () => {
    const rows = filtered.map(item => '<tr><td>' + item.name + (item.model ? ' / ' + item.model : '') + '</td><td>' + item.quantity + '</td><td>' + (item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('de-DE') : '-') + '</td><td>' + (item.source === 'CEMEVI' ? 'Cemevi' : 'Spende') + '</td><td>' + (item.price ? item.price.toFixed(2) + ' EUR' : '-') + '</td><td>' + (item.status === 'AKTIV' ? 'Aktiv' : item.status === 'BOZUK' ? 'Defekt' : 'Ausgemustert') + '</td><td>' + (item.notes ?? '-') + '</td></tr>').join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Inventarliste</title><style>body{font-family:Arial;font-size:10pt;padding:15mm}h1{font-size:14pt;margin-bottom:5mm}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt}th{background:#f0f0f0}.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8mm}.logo{width:60px;height:60px;object-fit:contain}</style></head><body><div class="header"><img src="/Logo_Du_Hamborn.jpg" class="logo"/><div style="text-align:center"><strong>Alevitische Kulturgemeinde Duisburg und Umgebung e.V.</strong><br/>Inventarliste</div><img src="/AABF.jpeg" class="logo"/></div><table><thead><tr><th>Bezeichnung</th><th>Anzahl</th><th>Kaufdatum</th><th>Herkunft</th><th>Preis</th><th>Status</th><th>Bemerkung</th></tr></thead><tbody>' + rows + '</tbody></table></body></html>');
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const inp = 'w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm';


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Inventarliste
          </h1>
          <p className="text-muted-foreground text-sm">Inventar und Ausstattungsverwaltung</p>
        </div>
        <button onClick={printList} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:opacity-90 text-sm mr-2"><Printer className="w-4 h-4" /> Drucken</button>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 text-sm">
          <Plus className="w-4 h-4" /> Neuer Eintrag
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{editId ? 'Bearbeiten' : 'Neuer Eintrag'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Bezeichnung *</label>
                  <input value={form.name} onChange={e => setForm((p: any) => ({...p, name: e.target.value}))} required className={inp} placeholder="z.B. Beamer" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Modell</label>
                  <input value={form.model} onChange={e => setForm((p: any) => ({...p, model: e.target.value}))} className={inp} placeholder="z.B. Epson EB-X05" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Anzahl</label>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm((p: any) => ({...p, quantity: e.target.value}))} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Kaufdatum</label>
                  <input type="date" value={form.purchaseDate} onChange={e => setForm((p: any) => ({...p, purchaseDate: e.target.value}))} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Preis (€)</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm((p: any) => ({...p, price: e.target.value}))} className={inp} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Herkunft</label>
                  <select value={form.source} onChange={e => setForm((p: any) => ({...p, source: e.target.value}))} className={inp}>
                    <option value="CEMEVI">Cemevi</option>
                    <option value="BAGIS">Spende/Geschenk</option>
                  </select>
                </div>
                {form.source === 'BAGIS' && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Spender/in</label>
                    <input value={form.donorName} onChange={e => setForm((p: any) => ({...p, donorName: e.target.value}))} className={inp} placeholder="Vor- und Nachname" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm((p: any) => ({...p, status: e.target.value}))} className={inp}>
                    <option value="AKTIV">Aktiv</option>
                    <option value="BOZUK">Defekt</option>
                    <option value="HURDA">Ausgemustert</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Bemerkung</label>
                  <textarea value={form.notes} onChange={e => setForm((p: any) => ({...p, notes: e.target.value}))} rows={3} className={`${inp} resize-none`} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? 'Speichere...' : 'Speichern'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-input rounded-lg hover:bg-muted">Abbrechen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Bezeichnung oder Modell suchen..."
          className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
      </div>

      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Noch keine Einträge.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Bezeichnung / Modell</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Anzahl</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Kaufdatum</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Herkunft</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Preis</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Bemerkung</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{item.name}</p>
                      {item.model && <p className="text-xs text-muted-foreground">{item.model}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm">
                      {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('de-DE') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span>{item.source === 'CEMEVI' ? 'Cemevi' : 'Spende/Geschenk'}</span>
                      {item.donorName && <p className="text-xs text-muted-foreground">{item.donorName}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm">{item.price ? `${item.price.toFixed(2)} €` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{item.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-amber-100 text-amber-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
