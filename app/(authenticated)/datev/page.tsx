'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, BookOpen, Info } from 'lucide-react';
import { toast } from 'sonner';

const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));
const MONTHS = [
  { value: '1', label: 'Januar' }, { value: '2', label: 'Februar' },
  { value: '3', label: 'März' }, { value: '4', label: 'April' },
  { value: '5', label: 'Mai' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' }, { value: '12', label: 'Dezember' },
];

export default function DatevPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [berater, setBerater] = useState('1001');
  const [mandant, setMandant] = useState('1');
  const [loading, setLoading] = useState<string | null>(null);

  const download = async (format: 'buchungsstapel' | 'kassenbuch') => {
    setLoading(format);
    try {
      const params = new URLSearchParams({ year, month, format, berater, mandant });
      const res = await fetch(`/api/datev?${params}`);
      if (!res.ok) { toast.error('Export fehlgeschlagen'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DATEV_${format}_${year}_${String(month).padStart(2,'0')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('DATEV Export erfolgreich!');
    } catch { toast.error('Fehler beim Export'); }
    finally { setLoading(null); }
  };

  const inp = 'w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-primary" /> DATEV Export
        </h1>
        <p className="text-muted-foreground text-sm">Buchungsdaten im DATEV-Format exportieren</p>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 space-y-1">
          <p className="font-medium">Was wird exportiert?</p>
          <ul className="space-y-0.5 text-xs">
            <li>• <strong>Ausgaben</strong> → Soll-Buchungen (Konto 4000 / Gegenkonto 1200)</li>
            <li>• <strong>Spenden</strong> → Haben-Buchungen (Konto 1200 / Gegenkonto 8600)</li>
            <li>• <strong>Beiträge</strong> → Haben-Buchungen (Konto 1200 / Gegenkonto 8400)</li>
            <li>• <strong>Kassenbuch</strong> → Nur BAR-Zahlungen</li>
          </ul>
        </div>
      </div>

      {/* Einstellungen */}
      <div className="bg-card rounded-xl shadow-sm p-6 space-y-5">
        <h2 className="font-bold text-base">Export-Einstellungen</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Jahr</label>
            <select value={year} onChange={e => setYear(e.target.value)} className={inp}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Monat</label>
            <select value={month} onChange={e => setMonth(e.target.value)} className={inp}>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Beraternummer</label>
            <input value={berater} onChange={e => setBerater(e.target.value)} className={inp} placeholder="1001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Mandantennummer</label>
            <input value={mandant} onChange={e => setMandant(e.target.value)} className={inp} placeholder="1" />
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Buchungsstapel */}
        <div className="bg-card rounded-xl shadow-sm p-6 space-y-4 border-2 border-transparent hover:border-primary/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Buchungsstapel</h3>
              <p className="text-xs text-muted-foreground">DATEV EXTF Format</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Alle Buchungen (Ausgaben, Spenden, Beiträge) als DATEV Buchungsstapel — für Steuerberater geeignet.
          </p>
          <button
            onClick={() => download('buchungsstapel')}
            disabled={loading === 'buchungsstapel'}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 text-sm"
          >
            <Download className="w-4 h-4" />
            {loading === 'buchungsstapel' ? 'Exportiere...' : 'Buchungsstapel exportieren'}
          </button>
        </div>

        {/* Kassenbuch */}
        <div className="bg-card rounded-xl shadow-sm p-6 space-y-4 border-2 border-transparent hover:border-emerald-500/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Kassenbuch</h3>
              <p className="text-xs text-muted-foreground">Nur BAR-Zahlungen</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Nur Barzahlungen als DATEV Kassenbuch — für die monatliche Kassenführung.
          </p>
          <button
            onClick={() => download('kassenbuch')}
            disabled={loading === 'kassenbuch'}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 text-sm"
          >
            <Download className="w-4 h-4" />
            {loading === 'kassenbuch' ? 'Exportiere...' : 'Kassenbuch exportieren'}
          </button>
        </div>
      </div>

      {/* Kontenrahmen Info */}
      <div className="bg-card rounded-xl shadow-sm p-6 space-y-3">
        <h2 className="font-bold text-sm">Verwendete Konten (SKR49)</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ['1200', 'Kasse'],
            ['4000', 'Betriebliche Ausgaben'],
            ['8400', 'Mitgliedsbeiträge'],
            ['8600', 'Spenden'],
          ].map(([konto, name]) => (
            <div key={konto} className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg">
              <span className="font-mono font-bold text-primary">{konto}</span>
              <span className="text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
