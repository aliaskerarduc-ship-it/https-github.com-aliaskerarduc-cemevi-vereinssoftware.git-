'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Download, FileText, Users, Heart, CreditCard, Calendar, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const RechartsCharts = dynamic(() => import('@/components/reports/charts'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div> });

export default function BerichtePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [pdfLoading, setPdfLoading] = useState(false);
  const [zuwendungForm, setZuwendungForm] = useState({ typ: 'einzeln', memberId: '', familyId: '', fromDate: `${new Date().getFullYear()}-01-01`, toDate: `${new Date().getFullYear()}-12-31` });
  const [members, setMembers] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/reports?year=${year}`).then(r => r.json()).then(setStats).catch(console.error).finally(() => setLoading(false));
    fetch('/api/members?limit=2000').then(r => r.json()).then(d => setMembers(d?.members ?? [])).catch(console.error);
    fetch('/api/families').then(r => r.json()).then(d => setFamilies(d?.families ?? [])).catch(console.error);
  }, [year]);

  const exportExcel = async (type: string) => {
    try {
      const res = await fetch(`/api/export?type=${type}&year=${year}`);
      if (!res.ok) { toast.error('Export fehlgeschlagen'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${year}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export erfolgreich');
    } catch { toast.error('Export fehlgeschlagen'); }
  };

  const generateZuwendung = async () => {
    if (zuwendungForm.typ === 'einzeln' && !zuwendungForm.memberId) { toast.error('Bitte ein Mitglied auswählen'); return; }
    if (zuwendungForm.typ === 'familie' && !zuwendungForm.familyId) { toast.error('Bitte eine Familie auswählen'); return; }
    setPdfLoading(true);
    try {
      const res = await fetch('/api/zuwendung', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zuwendungForm),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err?.error ?? 'Fehler'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zuwendungsbestaetigung.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Zuwendungsbestätigung erstellt');
    } catch { toast.error('Fehler'); }
    finally { setPdfLoading(false); }
  };

  const printReport = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bericht ${year}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; padding: 15mm; }
          .kopf { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 6mm; text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 4mm; }
          .kopf .logo-links { width: 85px; height: 85px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
          .kopf .logo-rechts { width: 85px; height: 85px; object-fit: contain; flex-shrink: 0; }
          .kopf-mitte { flex: 1; text-align: center; }
          .kopf-mitte h1 { font-size: 12pt; font-weight: bold; color: #000; margin: 0; line-height: 1.25; white-space: nowrap; }
          .kopf-mitte p { font-size: 9pt; color: #333; margin-top: 2px; }
          h1 { font-size: 18pt; color: #16a34a; margin-bottom: 5mm; }
          h2 { font-size: 13pt; margin: 6mm 0 3mm; border-bottom: 1px solid #ccc; padding-bottom: 2mm; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-bottom: 6mm; }
          .card { border: 1px solid #ddd; border-radius: 6px; padding: 4mm; }
          .card-title { font-size: 9pt; color: #666; margin-bottom: 2mm; }
          .card-value { font-size: 20pt; font-weight: bold; color: #16a34a; }
          .row { display: flex; justify-content: space-between; padding: 1.5mm 0; border-bottom: 1px solid #f0f0f0; }
          .bar-container { background: #f0f0f0; border-radius: 4px; height: 8px; flex: 1; margin: 0 8px; }
          .bar { height: 8px; border-radius: 4px; background: #16a34a; }
          .footer { margin-top: 10mm; font-size: 8pt; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="kopf">
          <img class="logo-links" src="/Logo_Du_Hamborn.jpg" alt="Logo" />
          <div class="kopf-mitte">
            <h1>Alevitische Kulturgemeinde Duisburg und Umgebung e.V.</h1>
            <p>Mitglied der Dachverband Alevitische Gemeinde Deutschland K.d.ö.R</p>
          </div>
          <img class="logo-rechts" src="/AABF.jpeg" alt="AABF" />
        </div>
        <h1>Jahresbericht ${year}</h1>
        <p style="color:#666;font-size:9pt;margin-bottom:6mm;">Erstellt: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}</p>

        <h2>Übersicht</h2>
        <div class="grid">
          <div class="card"><div class="card-title">Mitglieder gesamt</div><div class="card-value">${stats?.totalMembers ?? 0}</div></div>
          <div class="card"><div class="card-title">Familien</div><div class="card-value">${stats?.familyCount ?? 0}</div></div>
          <div class="card"><div class="card-title">Spenden ${year}</div><div class="card-value">${(stats?.yearDonations ?? 0).toFixed(2)} €</div></div>
          <div class="card"><div class="card-title">Beiträge ${year}</div><div class="card-value">${(stats?.yearContributions ?? 0).toFixed(2)} €</div></div>
        </div>

        <h2>Geschlechterverteilung (Aktive Mitglieder)</h2>
        ${(stats?.genderData ?? []).map((g: any) => `
          <div class="row">
            <span>${g.name}</span>
            <strong>${g.value} Mitglieder</strong>
          </div>
        `).join('')}

        <h2>Nationalitäten (Aktive Mitglieder)</h2>
        ${(stats?.nationalityData ?? []).map((n: any) => `
          <div class="row">
            <span>${n.name}</span>
            <strong>${n.value} Mitglieder</strong>
          </div>
        `).join('')}

        <h2>Beitragsstufen ${year}</h2>
        ${(stats?.beitragsstufeData ?? []).map((b: any) => `<div class="row"><span>${b.name}</span><strong>${b.value} Mitglieder</strong></div>`).join('')}
        <div class="row"><span>Gesamt aktive Mitglieder</span><strong>${stats?.activeMembers ?? 0}</strong></div>
        <div class="row"><span>Familienmitglieder</span><strong>${stats?.familyMemberCount ?? 0}</strong></div>
        <div class="row"><span>Einzelmitglieder</span><strong>${stats?.einzelmitgliedCount ?? 0}</strong></div>

        <h2>Mitgliedsstatus</h2>
        ${(stats?.memberStatusData ?? []).map((s: any) => `
          <div class="row">
            <span>${s.name}</span>
            <strong>${s.value}</strong>
          </div>
        `).join('')}

        <div class="footer">Cemevi Mitgliederverwaltung – Jahresbericht ${year}</div>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(printContent);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Berichte & Statistiken</h1>
          <p className="text-muted-foreground text-sm">Übersicht und Auswertungen</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={printReport}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            <Printer className="w-4 h-4" /> Bericht drucken
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-sm"><div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Mitglieder gesamt</span></div><p className="text-2xl font-display font-bold">{stats?.totalMembers ?? 0}</p></div>
        <div className="bg-card rounded-xl p-5 shadow-sm"><div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground">Familien</span></div><p className="text-2xl font-display font-bold">{stats?.familyCount ?? 0}</p></div>
        <div className="bg-card rounded-xl p-5 shadow-sm"><div className="flex items-center gap-2 mb-2"><Heart className="w-4 h-4 text-rose-500" /><span className="text-xs text-muted-foreground">Spenden {year}</span></div><p className="text-2xl font-display font-bold">{(stats?.yearDonations ?? 0).toFixed?.(2)} €</p></div>
        <div className="bg-card rounded-xl p-5 shadow-sm"><div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Beiträge {year}</span></div><p className="text-2xl font-display font-bold">{(stats?.yearContributions ?? 0).toFixed?.(2)} €</p></div>
      </div>

      {/* Detay İstatistikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Cinsiyet */}
        <div className="bg-card rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Geschlechterverteilung (Aktive Mitglieder)</h3>
          <div className="space-y-2">
            {(stats?.genderData ?? []).map((g: any) => (
              <div key={g.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${g.name === 'Männlich' ? 'bg-blue-500' : g.name === 'Weiblich' ? 'bg-pink-500' : 'bg-gray-400'}`} />
                  <span className="text-sm">{g.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div className={`h-2 rounded-full ${g.name === 'Männlich' ? 'bg-blue-500' : g.name === 'Weiblich' ? 'bg-pink-500' : 'bg-gray-400'}`}
                      style={{ width: `${Math.round((g.value / (stats?.activeMembers || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-bold w-8 text-right">{g.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nationalität */}
        <div className="bg-card rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-amber-500" /> Nationalitäten (Aktive Mitglieder)</h3>
          <div className="space-y-2">
            {(stats?.nationalityData ?? []).map((n: any) => (
              <div key={n.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${n.name === 'Deutsch' ? 'bg-black' : n.name === 'Türkisch' ? 'bg-red-500' : 'bg-gray-400'}`} />
                  <span className="text-sm">{n.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div className={`h-2 rounded-full ${n.name === 'Deutsch' ? 'bg-gray-800' : n.name === 'Türkisch' ? 'bg-red-500' : 'bg-gray-400'}`}
                      style={{ width: `${Math.round((n.value / (stats?.activeMembers || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-bold w-8 text-right">{n.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Beitragsstufen */}
        <div className="bg-card rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-500" /> Beitragsstufen (Aktive Mitglieder)</h3>
          <div className="space-y-2">
            {(() => {
              const amounts: Record<string, number> = { Student: 5, 'Ermäßigt': 8, Normal: 12, Familie: 16, 'Partner/in': 4, PARTNER: 4, STUDENT: 5, ERMAESSIGT: 8, NORMAL: 12, FAMILIE: 16 };
              return (stats?.beitragsstufeData ?? []).map((b: any) => (
                <div key={b.name} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm font-medium">{b.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{amounts[b.name] ?? '?'} €/Monat</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${Math.round((b.value / (stats?.activeMembers || 1)) * 100)}%` }} />
                    </div>
                    <div className="text-right min-w-[80px]">
                      <span className="text-sm font-bold">{b.value} Pers.</span>
                      <span className="text-xs text-muted-foreground ml-1">= {((amounts[b.name] ?? 0) * b.value).toFixed(0)} €</span>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{stats?.activeMembers ?? 0}</p>
              <p className="text-xs text-muted-foreground">Gesamt aktiv</p>
            </div>
            <div className="text-center p-2 bg-emerald-50 rounded-lg">
              <p className="text-xl font-bold text-emerald-600">{stats?.familyMemberCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Familienmitgl.</p>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <p className="text-xl font-bold text-amber-600">{stats?.einzelmitgliedCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Einzelmitgl.</p>
            </div>
          </div>
        </div>

        {/* Aktif / Pasif */}
        <div className="bg-card rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-purple-500" /> Mitgliedsstatus</h3>
          <div className="space-y-2">
            {(stats?.memberStatusData ?? []).map((s: any) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${s.name === 'Aktiv' ? 'bg-emerald-500' : s.name === 'Passiv' ? 'bg-amber-400' : 'bg-gray-400'}`} />
                  <span className="text-sm">{s.name}</span>
                </div>
                <span className="text-sm font-bold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Charts */}
      {stats?.monthlyData && (
        <RechartsCharts monthlyData={stats.monthlyData} memberStatusData={stats.memberStatusData} />
      )}

      {/* Zuwendungsbestätigung */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-display font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Zuwendungsbestätigung erstellen</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Typ</label>
            <select value={zuwendungForm.typ} onChange={e => setZuwendungForm(p => ({...p, typ: e.target.value, memberId: '', familyId: ''}))} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="einzeln">Einzelmitglied</option>
              <option value="familie">Familie</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{zuwendungForm.typ === 'familie' ? 'Familie' : 'Mitglied'}</label>
            {zuwendungForm.typ === 'einzeln' ? (
              <select value={zuwendungForm.memberId} onChange={e => setZuwendungForm(p => ({...p, memberId: e.target.value}))} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Bitte wählen</option>
                {members?.map((m: any) => <option key={m?.id} value={m?.id}>{m?.lastName}, {m?.firstName} (Nr. {String(m?.memberNumber ?? 0).padStart(5, "0")})</option>)}
              </select>
            ) : (
              <select value={zuwendungForm.familyId} onChange={e => setZuwendungForm(p => ({...p, familyId: e.target.value}))} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Bitte wählen</option>
                {families?.map((f: any) => <option key={f?.id} value={f?.id}>Familie {f?.familyName}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Von</label>
            <input type="date" value={zuwendungForm.fromDate} onChange={e => setZuwendungForm(p => ({...p, fromDate: e.target.value}))} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bis</label>
            <input type="date" value={zuwendungForm.toDate} onChange={e => setZuwendungForm(p => ({...p, toDate: e.target.value}))} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <button onClick={generateZuwendung} disabled={pdfLoading} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
          {pdfLoading ? 'Erstelle PDF...' : 'Zuwendungsbestätigung erstellen'}
        </button>
      </div>

      {/* Export */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-display font-bold flex items-center gap-2"><Download className="w-5 h-5 text-primary" /> Daten exportieren</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => exportExcel('members')} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-input hover:bg-muted transition-colors font-medium text-sm">
            <Users className="w-4 h-4" /> Mitglieder exportieren
          </button>
          <button onClick={() => exportExcel('donations')} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-input hover:bg-muted transition-colors font-medium text-sm">
            <Heart className="w-4 h-4" /> Spenden exportieren
          </button>
          <button onClick={() => exportExcel('contributions')} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-input hover:bg-muted transition-colors font-medium text-sm">
            <CreditCard className="w-4 h-4" /> Beiträge exportieren
          </button>
        </div>
      </div>
    </div>
  );
}
