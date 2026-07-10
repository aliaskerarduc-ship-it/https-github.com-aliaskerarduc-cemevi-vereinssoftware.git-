'use client';

import { Info, Plus, Trash2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

const DEFAULT_INFO = {
  appName: 'Cem Evi Vereinssoftware',
  appVersion: '1.0',
  appYear: '2026',
  appAuthor: 'Ali Asker Arduc',
  appFeatures: [
    'Mitgliederverwaltung', 'Familienverwaltung', 'Beitragsverwaltung',
    'Spendenverwaltung', 'Ausgabenverwaltung', 'Terminkalender',
    'Briefe & Serienbriefe', 'Dokumente', 'Berichte & Auswertungen',
    'Versammlungen', 'DATEV Export',
  ],
};

export default function UeberPage() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [info, setInfo] = useState(DEFAULT_INFO);
  const [tempInfo, setTempInfo] = useState(DEFAULT_INFO);
  const [editingInfo, setEditingInfo] = useState(false);
  const [newFeature, setNewFeature] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Ayarları yükle
  useEffect(() => {
    fetch('/api/verein-settings')
      .then(r => r.json())
      .then(d => {
        const merged = {
          appName: d.appName || DEFAULT_INFO.appName,
          appVersion: d.appVersion || DEFAULT_INFO.appVersion,
          appYear: d.appYear || DEFAULT_INFO.appYear,
          appAuthor: d.appAuthor || DEFAULT_INFO.appAuthor,
          appFeatures: d.appFeatures ? JSON.parse(d.appFeatures) : DEFAULT_INFO.appFeatures,
        };
        setInfo(merged);
        setTempInfo(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveInfo = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/verein-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: tempInfo.appName,
          appVersion: tempInfo.appVersion,
          appYear: tempInfo.appYear,
          appAuthor: tempInfo.appAuthor,
          appFeatures: JSON.stringify(tempInfo.appFeatures),
        }),
      });
      if (!res.ok) { toast.error('Fehler beim Speichern'); return; }
      setInfo(tempInfo);
      setEditingInfo(false);
      toast.success('Gespeichert!');
    } catch { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  const addFeature = async () => {
    if (!newFeature.trim()) return;
    const updated = { ...info, appFeatures: [...info.appFeatures, newFeature.trim()] };
    setInfo(updated);
    setTempInfo(updated);
    setNewFeature('');
    await fetch('/api/verein-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appFeatures: JSON.stringify(updated.appFeatures) }),
    });
    toast.success('Funktion hinzugefügt!');
  };

  const removeFeature = async (i: number) => {
    const updated = { ...info, appFeatures: info.appFeatures.filter((_, idx) => idx !== i) };
    setInfo(updated);
    setTempInfo(updated);
    await fetch('/api/verein-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appFeatures: JSON.stringify(updated.appFeatures) }),
    });
    toast.success('Funktion entfernt!');
  };

  const inp = 'w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm';

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
          <Info className="w-6 h-6 text-primary" /> Über diese Software
        </h1>
      </div>

      {/* Mac-style About Dialog */}
      <div className="bg-[#f0f0f0] rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <div className="h-8 bg-[#e8e8e8] border-b border-gray-300" />
        <div className="px-12 py-10 flex flex-col items-center text-center space-y-6">
          <div className="flex items-center gap-8">
            <div className="w-28 h-28 rounded-[22px] overflow-hidden shadow-lg bg-white flex items-center justify-center">
              <img src="/app-icon.png" alt="App Icon" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <h2 className="text-4xl font-bold text-[#1c1c1e] leading-tight">{info.appName}</h2>
            </div>
          </div>
          <div className="w-full border-t border-gray-300" />
          <p className="text-gray-500 text-sm">© {info.appYear} {info.appAuthor}. Alle Rechte vorbehalten.</p>
        </div>
      </div>

      {/* Info bearbeiten - sadece Admin */}
      <div className="bg-card rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">App-Informationen</h2>
          {isAdmin && !editingInfo && (
            <button onClick={() => { setTempInfo(info); setEditingInfo(true); }}
              className="text-xs px-3 py-1.5 border border-input rounded-lg hover:bg-muted">
              Bearbeiten
            </button>
          )}
          {isAdmin && editingInfo && (
            <button onClick={saveInfo} disabled={saving}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
              <Save className="w-3 h-3" /> {saving ? 'Speichern...' : 'Speichern'}
            </button>
          )}
        </div>

        {isAdmin && editingInfo ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">App-Name</label>
              <input value={tempInfo.appName} onChange={e => setTempInfo(p => ({...p, appName: e.target.value}))} className={inp} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Version</label>
              <input value={tempInfo.appVersion} onChange={e => setTempInfo(p => ({...p, appVersion: e.target.value}))} className={inp} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Entwickler</label>
              <input value={tempInfo.appAuthor} onChange={e => setTempInfo(p => ({...p, appAuthor: e.target.value}))} className={inp} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Jahr</label>
              <input value={tempInfo.appYear} onChange={e => setTempInfo(p => ({...p, appYear: e.target.value}))} className={inp} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[['App-Name', info.appName], ['Version', info.appVersion], ['Entwickler', info.appAuthor], ['Jahr', info.appYear]].map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span className="text-xs text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Funktionen */}
      <div className="bg-card rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-base">Funktionen</h2>
        <div className="space-y-2">
          {info.appFeatures.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 bg-muted/40 rounded-lg group">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {f}
              </div>
              {isAdmin && (
                <button onClick={() => removeFeature(i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className="flex gap-2 pt-2">
            <input value={newFeature} onChange={e => setNewFeature(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFeature()}
              placeholder="Neue Funktion hinzufügen..."
              className={`${inp} flex-1`} />
            <button onClick={addFeature}
              className="flex items-center gap-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 text-sm">
              <Plus className="w-4 h-4" /> Hinzufügen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
