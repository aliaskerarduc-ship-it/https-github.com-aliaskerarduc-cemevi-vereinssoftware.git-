'use client';

import { useEffect, useState, useCallback } from 'react';
import { CreditCard, Plus, Search, ChevronLeft, ChevronRight, Pencil, Save, X, Trash2, Users, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { PAYMENT_METHODS, CONTRIBUTION_LEVELS } from '@/lib/roles';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

export default function BeitraegePage() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const searchParams = useSearchParams();
  const presetMemberId = searchParams?.get('memberId') ?? '';
  const [contributions, setContributions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!presetMemberId);
  const [members, setMembers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showMonatlich, setShowMonatlich] = useState(false);
  const [monatMonth, setMonatMonth] = useState(String(new Date().getMonth() + 1));
  const [monatYear, setMonatYear] = useState(String(new Date().getFullYear()));
  const [monatMembers, setMonatMembers] = useState<any[]>([]);
  const [monatPaid, setMonatPaid] = useState<Set<string>>(new Set());
  const [monatPaymentMethod, setMonatPaymentMethod] = useState('BAR');
  const [monatLoading, setMonatLoading] = useState(false);
  const [monatSaving, setMonatSaving] = useState(false);

  const loadMonatMembers = async () => {
    setMonatLoading(true);
    try {
      const res = await fetch(`/api/members?limit=2000`);
      const data = await res.json();
      const allMembers = (data?.members ?? []).filter((m: any) => m.status === 'AKTIV');
      // O ay zaten ödeyenleri bul
      const contribRes = await fetch(`/api/contributions?month=${monatMonth}&year=${monatYear}&limit=2000`);
      const contribData = await contribRes.json();
      const paidIds = new Set<string>((contribData?.contributions ?? []).map((c: any) => c.memberId));
      setMonatMembers(allMembers);
      setMonatPaid(paidIds);
    } catch { toast.error('Fehler'); }
    finally { setMonatLoading(false); }
  };

  const saveMonatlich = async () => {
    setMonatSaving(true);
    try {
      const unpaidSelected = monatMembers.filter((m: any) => monatPaid.has(m.id));
      // Sadece yeni işaretlenenleri kaydet
      let saved = 0;
      for (const m of unpaidSelected) {
        try {
          await fetch('/api/contributions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId: m.id,
              paymentDate: new Date().toISOString().split('T')[0],
              periodMonth: parseInt(monatMonth),
              periodYear: parseInt(monatYear),
              amount: (() => {
                const levels: Record<string, number> = { STUDENT: 5, ERMAESSIGT: 8, NORMAL: 12, FAMILIE: 16, PARTNER: 4 };
                return levels[m.contributionLevel] ?? 12;
              })(),
              paymentMethod: monatPaymentMethod,
            }),
          });
          saved++;
        } catch {}
      }
      toast.success(`${saved} Beiträge gespeichert!`);
      setShowMonatlich(false);
      fetchContributions();
    } catch { toast.error('Fehler'); }
    finally { setMonatSaving(false); }
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', paymentMethod: 'BAR', paymentDate: '', notes: '' });
  const now = new Date();
  const [form, setForm] = useState({
    memberId: presetMemberId, paymentDate: now.toISOString().split('T')[0],
    periodMonth: String(now.getMonth() + 1), periodYear: String(now.getFullYear()),
    amount: '', paymentMethod: 'BAR', notes: '',
  });

  const fetchContributions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), search });
      const res = await fetch(`/api/contributions?${params}`);
      const data = await res.json();
      setContributions(data?.contributions ?? []);
      setTotal(data?.total ?? 0);
      setTotalPages(data?.totalPages ?? 1);
    } catch { console.error('Fehler'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchContributions(); }, [fetchContributions]);
  useEffect(() => {
    fetch('/api/members?limit=1000').then(r => r.json()).then(d => setMembers(d?.members ?? [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.memberId) {
      const member = members?.find((m: any) => m?.id === form.memberId);
      if (member && member.contributionLevel) {
        const savedAmount = currentLevels[member.contributionLevel];
        const defaultLevel = CONTRIBUTION_LEVELS[member.contributionLevel];
        const amount = savedAmount ?? defaultLevel?.amount;
        if (amount) setForm(p => ({ ...p, amount: String(amount) }));
      }
    }
  }, [form.memberId, members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/contributions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err?.error ?? 'Fehler'); return; }
      toast.success('Beitrag wurde erfasst.');
      setShowForm(false);
      setForm({ memberId: '', paymentDate: new Date().toISOString().split('T')[0], periodMonth: String(new Date().getMonth() + 1), periodYear: String(new Date().getFullYear()), amount: '', paymentMethod: 'BAR', notes: '' });
      fetchContributions();
    } catch { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setEditForm({
      amount: String(c.amount),
      paymentMethod: c.paymentMethod ?? 'BAR',
      paymentDate: new Date(c.paymentDate).toISOString().split('T')[0],
      notes: c.notes ?? '',
    });
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await fetch('/api/contributions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Beitrag aktualisiert!');
      setEditingId(null);
      fetchContributions();
    } catch { toast.error('Fehler'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Beitrag wirklich löschen?')) return;
    try {
      const res = await fetch('/api/contributions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Beitrag gelöscht.');
      fetchContributions();
    } catch { toast.error('Fehler'); }
  };

  const [editLevels, setEditLevels] = useState<Record<string, number>>({});
  const [editingLevels, setEditingLevels] = useState(false);
  const [currentLevels, setCurrentLevels] = useState<Record<string, number>>({
    STUDENT: 5, ERMAESSIGT: 8, NORMAL: 12, FAMILIE: 16, PARTNER: 4,
  });

  useEffect(() => {
    fetch('/api/verein-settings')
      .then(r => r.json())
      .then(d => {
        if (d.contributionLevels) {
          try {
            const saved = JSON.parse(d.contributionLevels);
            setCurrentLevels(prev => ({ ...prev, ...saved }));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const saveLevels = async () => {
    try {
      // 1. verein-settings'e kaydet
      await fetch('/api/verein-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contributionLevels: JSON.stringify(editLevels) }),
      });

      // 2. roles.ts dosyasını güncelle
      const res = await fetch('/api/update-contribution-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levels: editLevels }),
      });
      if (!res.ok) { toast.error('Fehler beim Speichern'); return; }

      setCurrentLevels(prev => ({ ...prev, ...editLevels }));
      toast.success('Beitragssätze gespeichert! Seite wird neu geladen...');
      setEditingLevels(false);
      // Sayfayı yenile ki roles.ts yeni değerleri yüklesin
      setTimeout(() => window.location.reload(), 1500);
    } catch { toast.error('Fehler'); }
  };

  const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const inp = 'w-full px-2 py-1.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2"><CreditCard className="w-6 h-6 text-blue-500" /> Beitragsverwaltung</h1>
          <p className="text-muted-foreground text-sm">{total} Beiträge erfasst</p>
        </div>
        <button onClick={() => { setShowMonatlich(!showMonatlich); if (!showMonatlich) loadMonatMembers(); }} className="inline-flex items-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium hover:opacity-90 mr-2">
          <Users className="w-4 h-4" /> Monatliche Erfassung
        </button>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Neuer Beitrag
        </button>
      </div>

      {/* Beitragsstufen Info */}
      <div className="bg-card rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Beitragssätze</span>
          {isAdmin && !editingLevels && (
            <button onClick={() => {
              const init: Record<string, number> = {};
              Object.entries(CONTRIBUTION_LEVELS).forEach(([k, v]) => { init[k] = v.amount; });
              setEditLevels(init);
              setEditingLevels(true);
            }} className="text-xs px-3 py-1.5 border border-input rounded-lg hover:bg-muted flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Bearbeiten
            </button>
          )}
          {isAdmin && editingLevels && (
            <div className="flex gap-2">
              <button onClick={saveLevels} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg flex items-center gap-1">
                <Save className="w-3 h-3" /> Speichern
              </button>
              <button onClick={() => setEditingLevels(false)} className="text-xs px-3 py-1.5 border border-input rounded-lg hover:bg-muted">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(CONTRIBUTION_LEVELS).map(([key, val]) => (
            <div key={key} className="bg-muted/40 rounded-lg p-3 text-center">
              {editingLevels ? (
                <input
                  type="number"
                  step="0.5"
                  value={editLevels[key] ?? currentLevels[key] ?? val.amount}
                  onChange={e => setEditLevels(p => ({...p, [key]: parseFloat(e.target.value)}))}
                  className="w-full text-center text-lg font-mono font-bold border border-input rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <p className="text-lg font-mono font-bold">{currentLevels[key] ?? val.amount} €</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{val.label}</p>
            </div>
          ))}
        </div>
        {editingLevels && (
          <p className="text-xs text-amber-600">⚠️ Hinweis: Die Änderungen werden in den Einstellungen gespeichert. Für neue Beiträge wird der aktualisierte Betrag automatisch vorgeschlagen.</p>
        )}
      </div>


      {/* Monatliche Erfassung */}
      {showMonatlich && (
        <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2"><CheckSquare className="w-5 h-5 text-emerald-600" /> Monatliche Beitragserfassung</h2>
            <button onClick={() => setShowMonatlich(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs font-medium mb-1">Monat</label>
              <select value={monatMonth} onChange={e => setMonatMonth(e.target.value)} className="px-3 py-2 border border-input rounded-lg bg-background text-sm">
                {['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'].map((m,i) => (
                  <option key={i} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Jahr</label>
              <input type="number" value={monatYear} onChange={e => setMonatYear(e.target.value)} className="px-3 py-2 border border-input rounded-lg bg-background text-sm w-24" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Zahlungsart</label>
              <select value={monatPaymentMethod} onChange={e => setMonatPaymentMethod(e.target.value)} className="px-3 py-2 border border-input rounded-lg bg-background text-sm">
                <option value="BAR">Bar</option>
                <option value="UEBERWEISUNG">Überweisung</option>
                <option value="LASTSCHRIFT">Lastschrift</option>
              </select>
            </div>
            <button onClick={loadMonatMembers} className="px-4 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80">Laden</button>
            <button onClick={saveMonatlich} disabled={monatSaving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {monatSaving ? 'Speichere...' : 'Speichern'}
            </button>
          </div>
          {monatLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-border rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-2 text-left text-xs text-muted-foreground w-10">✓</th>
                    <th className="px-4 py-2 text-left text-xs text-muted-foreground">Mitglied</th>
                    <th className="px-4 py-2 text-left text-xs text-muted-foreground">Beitragsstufe</th>
                  </tr>
                </thead>
                <tbody>
                  {monatMembers.map((m: any) => (
                    <tr key={m.id} className={`border-t border-border cursor-pointer hover:bg-muted/30 ${monatPaid.has(m.id) ? 'bg-emerald-50' : ''}`}
                      onClick={() => setMonatPaid(prev => { const n = new Set(prev); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n; })}>
                      <td className="px-4 py-2">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${monatPaid.has(m.id) ? 'bg-emerald-500 border-emerald-500' : 'border-input'}`}>
                          {monatPaid.has(m.id) && <span className="text-white text-xs">✓</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm font-medium">{m.lastName}, {m.firstName} <span className="text-xs text-muted-foreground">#{String(m.memberNumber).padStart(5,'0')}</span></td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{m.contributionLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{monatPaid.size} von {monatMembers.length} Mitgliedern ausgewählt</p>
        </div>
      )}

      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-display font-bold">Beitrag erfassen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mitglied *</label>
              <select value={form.memberId} onChange={e => setForm(p => ({...p, memberId: e.target.value}))} required className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Bitte wählen</option>
                {members?.map((m: any) => <option key={m?.id} value={m?.id}>{m?.lastName}, {m?.firstName} (Nr. {String(m?.memberNumber ?? 0).padStart(5, "0")})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zahlungsdatum *</label>
              <input type="date" value={form.paymentDate} onChange={e => setForm(p => ({...p, paymentDate: e.target.value}))} required className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monat *</label>
              <select value={form.periodMonth} onChange={e => setForm(p => ({...p, periodMonth: e.target.value}))} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Jahr *</label>
              <input type="number" value={form.periodYear} onChange={e => setForm(p => ({...p, periodYear: e.target.value}))} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Betrag (€) *</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} required className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zahlungsart</label>
              <select value={form.paymentMethod} onChange={e => setForm(p => ({...p, paymentMethod: e.target.value}))} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">{saving ? 'Speichere...' : 'Beitrag speichern'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-lg border border-input hover:bg-muted">Abbrechen</button>
          </div>
        </motion.form>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Suche nach Name..." className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Nr.</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Mitglied</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Zeitraum</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Betrag</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Zahlungsart</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Zahlungsdatum</th>
                {isAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : (contributions?.length ?? 0) === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Keine Beiträge gefunden.</td></tr>
              ) : contributions?.map((c: any) => (
                <tr key={c?.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-sm">{c?.contributionNumber}</td>
                  <td className="px-4 py-3 text-sm font-medium">{c?.member?.lastName}, {c?.member?.firstName}</td>
                  <td className="px-4 py-3 text-sm">{String(c?.periodMonth).padStart(2, '0')}/{c?.periodYear}</td>
                  <td className="px-4 py-3 text-sm">
                    {editingId === c.id ? (
                      <input type="number" step="0.01" value={editForm.amount}
                        onChange={e => setEditForm(p => ({...p, amount: e.target.value}))}
                        className={`${inp} w-24`} />
                    ) : (
                      <span className="font-mono font-bold text-blue-600">{c?.amount?.toFixed?.(2)} €</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">
                    {editingId === c.id ? (
                      <select value={editForm.paymentMethod}
                        onChange={e => setEditForm(p => ({...p, paymentMethod: e.target.value}))}
                        className={inp}>
                        {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    ) : (
                      PAYMENT_METHODS[c?.paymentMethod] ?? c?.paymentMethod
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">
                    {editingId === c.id ? (
                      <input type="date" value={editForm.paymentDate}
                        onChange={e => setEditForm(p => ({...p, paymentDate: e.target.value}))}
                        className={inp} />
                    ) : (
                      new Date(c?.paymentDate).toLocaleDateString('de-DE', { timeZone: 'UTC' })
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {editingId === c.id ? (
                          <>
                            <button onClick={() => handleEdit(c.id)}
                              className="p-1.5 rounded hover:bg-emerald-100 text-emerald-600" title="Speichern">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Abbrechen">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(c)}
                              className="p-1.5 rounded hover:bg-amber-100 text-amber-600" title="Bearbeiten">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(c.id)}
                              className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Löschen">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">Seite {page} von {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
