'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Users, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function VersammlungenPage() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', date: new Date().toISOString().split('T')[0], description: '' });

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/meetings');
      const data = await res.json();
      setMeetings(data?.meetings ?? []);
    } catch { console.error('Fehler'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMeetings(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err?.error ?? 'Fehler'); return; }
      toast.success('Versammlung wurde erstellt.');
      setShowForm(false);
      setForm({ title: '', date: new Date().toISOString().split('T')[0], description: '' });
      fetchMeetings();
    } catch { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (meetingId: string, isActive: boolean) => {
    try {
      await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      toast.success(isActive ? 'Versammlung beendet.' : 'Versammlung aktiviert.');
      fetchMeetings();
    } catch { toast.error('Fehler'); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" toplantısını silmek istediğinizden emin misiniz?`)) return;
    try {
      const res = await fetch('/api/meetings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { toast.error('Fehler beim Löschen'); return; }
      toast.success('Versammlung gelöscht.');
      fetchMeetings();
    } catch { toast.error('Fehler'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" /> Mitgliederversammlungen
          </h1>
          <p className="text-muted-foreground text-sm">Versammlungen verwalten und Anwesenheit prüfen</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Neue Versammlung
        </button>
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleCreate} className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-display font-bold">Neue Versammlung</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titel *</label>
              <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Datum *</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} required className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Beschreibung</label>
              <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">{saving ? 'Erstelle...' : 'Erstellen'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-lg border border-input hover:bg-muted">Abbrechen</button>
          </div>
        </motion.form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (meetings?.length ?? 0) === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-sm text-center text-muted-foreground">Noch keine Versammlungen vorhanden.</div>
      ) : (
        <div className="space-y-4">
          {meetings?.map((m: any) => (
            <motion.div key={m?.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-display font-bold text-lg">{m?.title}</h3>
                  <p className="text-sm text-muted-foreground">{new Date(m?.date).toLocaleDateString('de-DE', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m?.isActive ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3" /> Aktiv</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium"><XCircle className="w-3 h-3" /> Beendet</span>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(m?.id, m?.title)}
                      className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      title="Versammlung löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {m?.description && <p className="text-sm text-muted-foreground mb-3">{m.description}</p>}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground"><Users className="w-4 h-4 inline mr-1" />{m?._count?.attendances ?? 0} Anwesende</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Link href={`/versammlungen/${m?.id}`} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Anwesenheit verwalten</Link>
                <button onClick={() => toggleActive(m?.id, m?.isActive)} className="px-4 py-2 rounded-lg text-sm border border-input hover:bg-muted">
                  {m?.isActive ? 'Beenden' : 'Aktivieren'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
