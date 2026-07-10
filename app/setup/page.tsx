'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vereinName: '', strasse: '', plz: '', stadt: '', telefon: '', email: '', vorsitzender: '',
    adminName: '', adminEmail: '', adminPassword: '', adminPassword2: '',
  });

  useEffect(() => {
    fetch('/api/setup').then(r => r.json()).then(d => {
      if (!d.needed) router.replace('/login');
      else setChecking(false);
    });
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.adminEmail || !form.adminPassword || !form.adminName) { toast.error('Admin-Daten ausfüllen'); return; }
    if (form.adminPassword !== form.adminPassword2) { toast.error('Passwörter stimmen nicht überein'); return; }
    if (form.adminPassword.length < 8) { toast.error('Passwort mindestens 8 Zeichen'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Fehler'); return; }
      toast.success('Setup abgeschlossen!');
      setTimeout(() => router.replace('/login'), 1500);
    } catch { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const inp = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600';
  const lbl = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🏛️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Willkommen!</h1>
          <p className="text-sm text-gray-500 mt-1">Vereinssoftware einrichten</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 border-b pb-1">Vereinsdaten</h2>
          <div><label className={lbl}>Vereinsname *</label><input value={form.vereinName} onChange={set('vereinName')} className={inp} placeholder="z.B. Alevitische Kulturgemeinde..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Straße</label><input value={form.strasse} onChange={set('strasse')} className={inp} /></div>
            <div><label className={lbl}>PLZ</label><input value={form.plz} onChange={set('plz')} className={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Stadt</label><input value={form.stadt} onChange={set('stadt')} className={inp} /></div>
            <div><label className={lbl}>Telefon</label><input value={form.telefon} onChange={set('telefon')} className={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>E-Mail</label><input value={form.email} onChange={set('email')} className={inp} /></div>
            <div><label className={lbl}>Vorsitzender</label><input value={form.vorsitzender} onChange={set('vorsitzender')} className={inp} /></div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 border-b pb-1">Administrator-Konto</h2>
          <div><label className={lbl}>Name *</label><input value={form.adminName} onChange={set('adminName')} className={inp} placeholder="Vollständiger Name" /></div>
          <div><label className={lbl}>E-Mail *</label><input type="email" value={form.adminEmail} onChange={set('adminEmail')} className={inp} /></div>
          <div><label className={lbl}>Passwort * (min. 8 Zeichen)</label><input type="password" value={form.adminPassword} onChange={set('adminPassword')} className={inp} /></div>
          <div><label className={lbl}>Passwort bestätigen *</label><input type="password" value={form.adminPassword2} onChange={set('adminPassword2')} className={inp} /></div>
        </div>

        <p className="text-xs text-gray-400">Logos können nach der Einrichtung unter Einstellungen hochgeladen werden.</p>

        <button onClick={handleSubmit} disabled={saving}
          className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors">
          {saving ? 'Wird eingerichtet...' : '✓ Installieren'}
        </button>
      </div>
    </div>
  );
}
