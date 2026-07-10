'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { GENDER_LABELS, CONTRIBUTION_LEVELS, MEMBER_STATUS_LABELS } from '@/lib/roles';

export default function NeuesMitgliedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [families, setFamilies] = useState<any[]>([]);
  const [showNewFamily, setShowNewFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', birthDate: '', gender: '', nationality: 'deutsch',
    street: '', zipCode: '', city: 'Duisburg', phone: '', email: '',
    entryDate: new Date().toISOString().split('T')[0],
    status: 'AKTIV', contributionLevel: 'NORMAL', notes: '', familyId: '',
    gebaeudekaufBeitrag: '', finanzierung: '', zahlungsweise: '',
  });

  const fetchFamilies = () => {
    fetch('/api/families').then(r => r.json()).then(d => setFamilies(d?.families ?? [])).catch(console.error);
  };

  useEffect(() => { fetchFamilies(); }, []);

  const formatEuroBlur = (e: any) => {
    const raw = e.target.value.replace(/[^\d,.-]/g, '');
    if (!raw) return;
    const n = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    if (isNaN(n)) return;
    const formatted = n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    setForm((prev: any) => ({ ...prev, [e.target.name]: formatted }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...(prev ?? {}), [e.target.name]: e.target.value }));
  };

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) { toast.error('Familienname eingeben.'); return; }
    setCreatingFamily(true);
    try {
      const res = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyName: newFamilyName.trim() }),
      });
      if (!res.ok) { toast.error('Familie konnte nicht erstellt werden.'); return; }
      const family = await res.json();
      toast.success(`Familie "${family.familyName}" wurde erstellt.`);
      setNewFamilyName('');
      setShowNewFamily(false);
      fetchFamilies();
      setForm(prev => ({ ...prev, familyId: family.id }));
    } catch { toast.error('Fehler.'); }
    finally { setCreatingFamily(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err?.error ?? 'Fehler beim Erstellen');
        return;
      }
      const member = await res.json();
      toast.success(`Mitglied ${member?.firstName} ${member?.lastName} (Nr. ${String(member?.memberNumber ?? 0).padStart(5, "0")}) wurde erstellt.`);
      router.push(`/mitglieder/${member?.id}`);
    } catch {
      toast.error('Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/mitglieder" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-primary" /> Neues Mitglied
          </h1>
          <p className="text-muted-foreground text-sm">Stammdaten des neuen Mitglieds eingeben</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-display font-bold text-lg">Persönliche Daten</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vorname *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} required className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nachname *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} required className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Geburtsdatum</label>
              <input name="birthDate" type="date" value={form.birthDate} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Geschlecht</label>
              <select name="gender" value={form.gender} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Bitte wählen</option>
                {Object.entries(GENDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Staatsangehörigkeit</label>
              <select name="nationality" value={form.nationality} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"><option value="">Bitte wählen</option><option value="deutsch">Deutsch</option><option value="türkisch">Türkisch</option><option value="deutsch-türkisch">Deutsch / Türkisch (Doppelte)</option><option value="andere">Andere</option></select>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-display font-bold text-lg">Adresse & Kontakt</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Straße</label>
              <input name="street" value={form.street} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PLZ</label>
              <input name="zipCode" value={form.zipCode} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ort</label>
              <input name="city" value={form.city} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefon</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-Mail</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-display font-bold text-lg">Mitgliedschaft</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Eintrittsdatum</label>
              <input name="entryDate" type="date" value={form.entryDate} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                {Object.entries(MEMBER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Beitragsstufe</label>
              <select name="contributionLevel" value={form.contributionLevel} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                {Object.entries(CONTRIBUTION_LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label} ({v.amount}€)</option>)}
              </select>
            </div>

            {/* Aile seçimi */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Familienzugehörigkeit</label>
              <div className="flex gap-2">
                <select
                  name="familyId"
                  value={form.familyId}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Einzelmitglied (keine Familie)</option>
                  {families?.map((f: any) => (
                    <option key={f?.id} value={f?.id}>
                      👨‍👩‍👧 {f?.familyName} ({f?.members?.length ?? 0} Mitglieder)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewFamily(!showNewFamily)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-input hover:bg-muted text-sm font-medium whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Neue Familie
                </button>
              </div>

              {/* Yeni aile oluşturma */}
              {showNewFamily && (
                <div className="mt-3 p-4 bg-muted/30 rounded-lg border border-input">
                  <p className="text-sm font-medium mb-2">Neue Familie erstellen:</p>
                  <div className="flex gap-2">
                    <input
                      value={newFamilyName}
                      onChange={e => setNewFamilyName(e.target.value)}
                      placeholder="z.B. Familie Yilmaz"
                      className="flex-1 px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateFamily())}
                    />
                    <button
                      type="button"
                      onClick={handleCreateFamily}
                      disabled={creatingFamily}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {creatingFamily ? 'Erstelle...' : 'Erstellen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewFamily(false); setNewFamilyName(''); }}
                      className="px-4 py-2 border border-input rounded-lg text-sm hover:bg-muted"
                    >
                      Abbrechen
                    </button>
                  </div>
                  {families.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Vorhandene Familien: {families.map(f => f.familyName).join(', ')}
                    </p>
                  )}
                </div>
              )}

              {form.familyId && (
                <p className="text-xs text-emerald-600 mt-1">
                  ✓ Familienmitgliedschaft: {families.find(f => f.id === form.familyId)?.familyName}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Zahlungsweise</label>
              <select name="zahlungsweise" value={form.zahlungsweise} onChange={handleChange} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"><option value="">Bitte wählen</option><option value="monatlich">Monatlich</option><option value="vierteljährlich">Vierteljährlich</option><option value="halbjährlich">Halbjährlich</option><option value="jährlich">Jährlich</option></select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Bemerkungen</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'Speichere...' : 'Mitglied anlegen'}
          </button>
          <Link href="/mitglieder" className="px-6 py-2.5 rounded-lg border border-input hover:bg-muted transition-colors font-medium">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
