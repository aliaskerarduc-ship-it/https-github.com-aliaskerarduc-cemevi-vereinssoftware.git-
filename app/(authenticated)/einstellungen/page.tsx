'use client';

import { Settings, Database, Upload, Shield, Building2, Save } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function EinstellungenPage() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showProtokoll, setShowProtokoll] = useState(false);
  const [papierkorb, setPapierkorb] = useState<any>(null);
  const [showPapierkorb, setShowPapierkorb] = useState(false);
  const loadPapierkorb = async () => {
    try {
      const res = await fetch('/api/papierkorb');
      if (!res.ok) return;
      setPapierkorb(await res.json());
      setShowPapierkorb(true);
    } catch {}
  };
  const pkAction = async (mod: string, id: string, action: 'restore' | 'destroy') => {
    if (action === 'destroy' && !confirm('Endg\u00fcltig l\u00f6schen? Kann NICHT r\u00fcckg\u00e4ngig gemacht werden!')) return;
    try {
      const res = await fetch('/api/papierkorb', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ module: mod, id, action }) });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success(action === 'restore' ? 'Wiederhergestellt!' : 'Endg\u00fcltig gel\u00f6scht');
      loadPapierkorb();
    } catch { toast.error('Fehler'); }
  };

  const loadProtokoll = async () => {
    try {
      const res = await fetch('/api/audit-log');
      if (!res.ok) return;
      const data = await res.json();
      setAuditLogs(data.logs ?? []);
      setShowProtokoll(true);
    } catch {}
  };
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verein, setVerein] = useState<any>({});

  useEffect(() => {
    fetch('/api/verein-settings').then(r => r.json()).then(d => setVerein(d)).catch(() => {});
  }, []);

  const inp = 'w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm';

  const saveVerein = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/verein-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(verein),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Vereinsdaten gespeichert!');
    } catch { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  const handleImport = async (type: string, file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      if (!res.ok) { const err = await res.json(); toast.error(err?.error ?? 'Import fehlgeschlagen'); return; }
      const data = await res.json();
      toast.success(`${data?.imported ?? 0} Datensätze importiert.`);
    } catch { toast.error('Import fehlgeschlagen'); }
    finally { setImporting(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2"><Settings className="w-6 h-6 text-primary" /> Einstellungen</h1>
        <p className="text-muted-foreground text-sm">Systemeinstellungen und Datenimport</p>
      </div>

      {/* Vereinsdaten */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-display font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Vereinsdaten</h2>
        <p className="text-xs text-muted-foreground">Diese Daten werden im Briefkopf und Footer verwendet. Bei Vorstandswechsel hier aktualisieren.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Vereinsname</label>
            <input value={verein.name ?? ''} onChange={e => setVerein((p:any) => ({...p, name: e.target.value}))} className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Unterzeile</label>
            <input value={verein.unterzeile ?? ''} onChange={e => setVerein((p:any) => ({...p, unterzeile: e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Straße</label>
            <input value={verein.strasse ?? ''} onChange={e => setVerein((p:any) => ({...p, strasse: e.target.value}))} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">PLZ</label>
              <input value={verein.plz ?? ''} onChange={e => setVerein((p:any) => ({...p, plz: e.target.value}))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Stadt</label>
              <input value={verein.stadt ?? ''} onChange={e => setVerein((p:any) => ({...p, stadt: e.target.value}))} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Telefon</label>
            <input value={verein.telefon ?? ''} onChange={e => setVerein((p:any) => ({...p, telefon: e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Fax</label>
            <input value={verein.fax ?? ''} onChange={e => setVerein((p:any) => ({...p, fax: e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">E-Mail</label>
            <input value={verein.email ?? ''} onChange={e => setVerein((p:any) => ({...p, email: e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Website</label>
            <input value={verein.website ?? ''} onChange={e => setVerein((p:any) => ({...p, website: e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Vorsitzender</label>
            <input value={verein.vorsitzender ?? ''} onChange={e => setVerein((p:any) => ({...p, vorsitzender: e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Aufsichtsrat</label>
            <input value={verein.aufsichtsrat ?? ''} onChange={e => setVerein((p:any) => ({...p, aufsichtsrat: e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Bank</label>
            <input value={verein.bank ?? ''} onChange={e => setVerein((p:any) => ({...p, bank: e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Amtsgericht / VR-Nr.</label>
            <input value={verein.amtsgericht ?? ''} onChange={e => setVerein((p:any) => ({...p, amtsgericht: e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">IBAN</label>
            <input value={verein.iban ?? ''} onChange={e => setVerein((p:any) => ({...p, iban: e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">BIC</label>
            <input value={verein.bic ?? ''} onChange={e => setVerein((p:any) => ({...p, bic: e.target.value}))} className={inp} />
          </div>
        </div>
        <button onClick={saveVerein} disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Speichern...' : 'Vereinsdaten speichern'}
        </button>
      </div>
            {/* Logos */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-display font-bold flex items-center gap-2"><Upload className="w-5 h-5 text-primary" /> Logos</h2>
        <p className="text-xs text-muted-foreground">Diese Logos erscheinen auf allen Ausdrucken und Bescheinigungen. Wird hier geändert, wirkt es sich überall aus.</p>
        <div className="grid grid-cols-2 gap-6">
          {(['logoLeft', 'logoRight'] as const).map((side) => (
            <div key={side} className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">{side === 'logoLeft' ? 'Logo Links' : 'Logo Rechts'}</p>
              {verein[side] ? (
                <div className="flex items-center gap-3">
                  <img src={verein[side]} alt="Logo" className="h-16 w-16 object-contain border rounded-lg p-1 bg-white" />
                  <button
                    onClick={async () => {
                      const updated = { ...verein, [side]: '' };
                      await fetch('/api/verein-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
                      setVerein(updated);
                      toast.success('Logo entfernt');
                    }}
                    className="text-xs px-3 py-1.5 border border-destructive text-destructive rounded-lg hover:bg-destructive/10"
                  >Entfernen</button>
                </div>
              ) : (
                <div className="h-16 w-16 border-2 border-dashed border-input rounded-lg flex items-center justify-center text-muted-foreground text-xs">Kein Logo</div>
              )}
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-input rounded-lg text-xs hover:bg-muted w-fit">
                <Upload className="w-3 h-3" /> Logo hochladen
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const fd = new FormData();
                  fd.append('file', f);
                  fd.append('side', side);
                  const res = await fetch('/api/upload/logo', { method: 'POST', body: fd });
                  if (!res.ok) { toast.error('Upload fehlgeschlagen'); return; }
                  const data = await res.json();
                  const updated = { ...verein, [side]: data.url };
                  await fetch('/api/verein-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
                  setVerein(updated);
                  toast.success('Logo gespeichert!');
                }} />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Import */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-display font-bold flex items-center gap-2"><Upload className="w-5 h-5 text-primary" /> Daten importieren (CSV)</h2>
        <p className="text-sm text-muted-foreground">Laden Sie CSV-Dateien hoch, um Mitglieder, Spenden oder Beiträge zu importieren.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-dashed border-input rounded-lg p-4 text-center">
            <p className="text-sm font-medium mb-2">Mitglieder</p>
            <input type="file" accept=".csv" disabled={importing} onChange={e => { const f = e.target?.files?.[0]; if (f) handleImport('members', f); }} className="text-xs w-full" />
          </div>
          <div className="border border-dashed border-input rounded-lg p-4 text-center">
            <p className="text-sm font-medium mb-2">Spenden</p>
            <input type="file" accept=".csv" disabled={importing} onChange={e => { const f = e.target?.files?.[0]; if (f) handleImport('donations', f); }} className="text-xs w-full" />
          </div>
          <div className="border border-dashed border-input rounded-lg p-4 text-center">
            <p className="text-sm font-medium mb-2">Beiträge</p>
            <input type="file" accept=".csv" disabled={importing} onChange={e => { const f = e.target?.files?.[0]; if (f) handleImport('contributions', f); }} className="text-xs w-full" />
          </div>
          <div className="border border-dashed border-input rounded-lg p-4 text-center">
            <p className="text-sm font-medium mb-2">Persönliche Daten</p>
            <input type="file" accept=".csv,.tsv,.txt" disabled={importing} onChange={async e => {
              const f = e.target?.files?.[0];
              if (!f) return;
              try {
                setImporting(true);
                const csvText = await f.text();
                const res = await fetch('/api/members/import-personal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvText }) });
                const data = await res.json();
                if (!res.ok) { toast.error(data.error ?? 'Import fehlgeschlagen'); return; }
                toast.success(`${data.created} neu, ${data.updated} aktualisiert, ${data.skipped} übersprungen`);
                if (data.errors?.length) { toast.error(data.errors[0], { duration: 10000 }); console.warn('Import-Fehler:', data.errors); }
              } catch { toast.error('Import fehlgeschlagen'); }
              finally { setImporting(false); e.target.value = ''; }
            }} className="text-xs w-full" />
            <p className="text-[10px] text-muted-foreground mt-1">Tab-getrennt, Abgleich per Mitgliedsnr.</p>
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-display font-bold flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Datensicherung (Backup)</h2>
        <p className="text-sm text-muted-foreground">Erstellt ein vollständiges Backup der Datenbank und aller Dateien. Das Backup wird heruntergeladen und per E-Mail gesendet.</p>
        <button
          onClick={async () => {
            try {
              setImporting(true);
              const res = await fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sendEmail: true }) });
              const data = await res.json();
              if (!res.ok) { toast.error(data.error ?? 'Fehler'); return; }
              const bytes = Uint8Array.from(atob(data.data), c => c.charCodeAt(0));
              const blob = new Blob([bytes], { type: 'application/zip' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = data.filename; a.click();
              URL.revokeObjectURL(url);
              toast.success('Backup erstellt und E-Mail gesendet!');
            } catch { toast.error('Backup fehlgeschlagen'); }
            finally { setImporting(false); }
          }}
          disabled={importing}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 text-sm"
        >
          <Database className="w-4 h-4" /> {importing ? 'Erstelle Backup...' : 'Backup jetzt erstellen'}
        </button>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 Tägliches automatisches Backup (02:00 Uhr) — Cron Job:</p>
          <code className="block bg-muted p-2 rounded font-mono">0 2 * * * curl -s "http://localhost:3000/api/backup/cron?secret=CEMEVI_BACKUP_2026"</code>
        </div>

        {/* Restore */}
        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-sm font-medium">Backup wiederherstellen</p>
          <p className="text-xs text-muted-foreground">Laden Sie eine .sql Backup-Datei hoch, um die Datenbank wiederherzustellen. ⚠️ Alle aktuellen Daten werden überschrieben!</p>
          <input
            type="file"
            accept=".sql"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!confirm('⚠️ ACHTUNG: Die aktuelle Datenbank wird überschrieben! Fortfahren?')) return;
              try {
                setImporting(true);
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('/api/backup/restore', { method: 'POST', body: formData });
                const data = await res.json();
                if (!res.ok) { toast.error(data.error ?? 'Fehler'); return; }
                toast.success('Datenbank erfolgreich wiederhergestellt!');
              } catch { toast.error('Restore fehlgeschlagen'); }
              finally { setImporting(false); e.target.value = ''; }
            }}
            disabled={importing}
            className="block text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-destructive/10 file:text-destructive hover:file:bg-destructive/20 disabled:opacity-50"
          />
        </div>
      </div>

      {/* DSGVO */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-3">
        <h2 className="font-display font-bold flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Datenschutz (DSGVO)</h2>
        <p className="text-sm text-muted-foreground">Alle Mitgliederdaten werden verschlüsselt gespeichert und sind nur für autorisierte Benutzer zugänglich. Der Zugriff ist rollenbasiert eingeschränkt.</p>
      </div>

      {isAdmin && (
        <div className="bg-card rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold">Lösch-Protokoll</h2>
            <button onClick={loadProtokoll} className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">{showProtokoll ? 'Aktualisieren' : 'Anzeigen'}</button>
          </div>
          <p className="text-sm text-muted-foreground">Protokoll aller Löschvorgänge (wer, wann, was).</p>
          {showProtokoll && (auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Keine Einträge vorhanden.</p>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted"><tr><th className="text-left px-3 py-2 text-xs">Datum</th><th className="text-left px-3 py-2 text-xs">Benutzer</th><th className="text-left px-3 py-2 text-xs">Aktion</th><th className="text-left px-3 py-2 text-xs">Modul</th><th className="text-left px-3 py-2 text-xs">Eintrag</th></tr></thead>
                <tbody>{auditLogs.map((l: any) => (<tr key={l.id} className="border-t border-border"><td className="px-3 py-2 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('de-DE')}</td><td className="px-3 py-2">{l.userName}</td><td className="px-3 py-2">{l.action}</td><td className="px-3 py-2">{l.module}</td><td className="px-3 py-2">{l.itemLabel}</td></tr>))}</tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="bg-card rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold">Papierkorb (Mitglieder, Beiträge, Spenden, Ausgaben)</h2>
            <button onClick={loadPapierkorb} className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">{showPapierkorb ? 'Aktualisieren' : 'Anzeigen'}</button>
          </div>
          {showPapierkorb && papierkorb && (
            <div className="space-y-4">
              {[['members','Mitglieder',(m:any)=>`Nr. ${String(m.memberNumber).padStart(5,'0')} – ${m.lastName}, ${m.firstName}`],['contributions','Beiträge',(m:any)=>`Nr. ${m.contributionNumber} – ${m.member?(m.member.lastName+', '+m.member.firstName):''} ${m.amount}€`],['donations','Spenden',(m:any)=>`Nr. ${m.donationNumber} – ${m.member?(m.member.lastName+', '+m.member.firstName):(m.externalDonorName||'Spende')} ${m.amount}€`],['ausgaben','Ausgaben',(m:any)=>`Nr. ${m.ausgabeNumber} – ${m.category} ${m.amount}€`]].map(([key,label,fmt]: any) => (
                (papierkorb[key]?.length ?? 0) > 0 && (
                  <div key={key}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{label} ({papierkorb[key].length})</p>
                    {papierkorb[key].map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted">
                        <span>{fmt(it)} <span className="text-xs text-muted-foreground">— {it.deletedBy ?? '?'}, {it.deletedAt ? new Date(it.deletedAt).toLocaleDateString('de-DE') : ''}</span></span>
                        <span className="flex gap-2">
                          <button onClick={() => pkAction(key, it.id, 'restore')} className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Wiederherstellen</button>
                          <button onClick={() => pkAction(key, it.id, 'destroy')} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Endgültig</button>
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ))}
              {(!papierkorb.members?.length && !papierkorb.contributions?.length && !papierkorb.donations?.length && !papierkorb.ausgaben?.length) && (
                <p className="text-sm text-muted-foreground py-4 text-center">Papierkorb ist leer.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
