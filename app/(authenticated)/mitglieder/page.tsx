'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Search, ChevronLeft, ChevronRight, AlertTriangle , Printer } from 'lucide-react';
import Link from 'next/link';

export default function MitgliederPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<string>('memberNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const arrow = (key: string) => sortKey === key ? (sortDir === 'asc' ? ' \u25b2' : ' \u25bc') : '';

  const printList = () => {
    const rows = members.map(m => `
      <tr>
        <td>${String(m.memberNumber).padStart(5,'0')}</td>
        <td>${m.lastName}, ${m.firstName}</td>
        <td>${m.street ?? ''} ${m.zipCode ?? ''} ${m.city ?? ''}</td>
        <td>${m.phone ?? '—'}</td>
        <td>${m.email ?? '—'}</td>
        <td>${m.status}</td>
        <td>${m.contributionLevel}</td>
      </tr>
    `).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mitgliederliste</title>
      <style>body{font-family:Arial;font-size:9pt;padding:10mm}h1{font-size:12pt;margin-bottom:5mm}
      .kopf{display:flex;align-items:center;justify-content:center;gap:15px;margin-bottom:6mm;text-align:center;border-bottom:2px solid #16a34a;padding-bottom:4mm}
      .kopf .logo-links{width:75px;height:75px;border-radius:50%;object-fit:cover;flex-shrink:0}
      .kopf .logo-rechts{width:75px;height:75px;object-fit:contain;flex-shrink:0}
      .kopf-mitte{flex:1;text-align:center}
      .kopf-mitte h2{font-size:11pt;font-weight:bold;color:#000;margin:0;line-height:1.25;white-space:nowrap}
      .kopf-mitte p{font-size:8pt;color:#333;margin-top:2px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:3px 5px;text-align:left;font-size:8pt}
      th{background:#f0f0f0;font-weight:bold}</style></head><body>
      <div class="kopf">
        <img class="logo-links" src="/Logo_Du_Hamborn.jpg" alt="Logo" />
        <div class="kopf-mitte">
          <h2>Alevitische Kulturgemeinde Duisburg und Umgebung e.V.</h2>
          <p>Mitglied der Dachverband Alevitische Gemeinde Deutschland K.d.ö.R</p>
        </div>
        <img class="logo-rechts" src="/AABF.jpeg" alt="AABF" />
      </div>
      <h1>Mitgliederliste (${members.length} Mitglieder) — ${new Date().toLocaleDateString('de-DE')}</h1>
      <table><thead><tr><th>Nr.</th><th>Name</th><th>Adresse</th><th>Telefon</th><th>E-Mail</th><th>Status</th><th>Stufe</th></tr></thead>
      <tbody>${rows}</tbody></table>
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };
  const [total, setTotal] = useState(0);
  const [genderStats, setGenderStats] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), search, limit: '25' });
      if (filter !== 'all') params.set('status', filter.toUpperCase());
      const apiSortMap: Record<string, string> = { memberNumber: 'memberNumber', name: 'lastName', adresse: 'street', contributionLevel: 'contributionLevel', status: 'status', gender: 'gender', nationality: 'nationality' };
      params.set('sortBy', apiSortMap[sortKey] ?? 'lastName');
      params.set('sortDir', sortDir);
      const res = await fetch(`/api/members?${params}`);
      const data = await res.json();
      setMembers(data?.members ?? []);
      setTotal(data?.total ?? 0);
      setGenderStats(data?.genderStats ?? {});
      setTotalPages(data?.totalPages ?? 1);
    } catch { console.error('Fehler'); }
    finally { setLoading(false); }
  }, [page, search, filter, sortKey, sortDir]);
  useEffect(() => { setPage(1); }, [filter, search]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const statusColors: Record<string, string> = {
    AKTIV: 'bg-emerald-100 text-emerald-700',
    PASSIV: 'bg-amber-100 text-amber-700',
    AUSGETRETEN: 'bg-gray-100 text-gray-600',
    VERSTORBEN: 'bg-slate-200 text-slate-500',
    AUSGESCHLOSSEN: 'bg-red-100 text-red-600',
  };

  const statusLabels: Record<string, string> = {
    AKTIV: 'Aktiv',
    PASSIV: 'Passiv',
    AUSGETRETEN: 'Ausgetreten',
    VERSTORBEN: 'Verstorben',
    AUSGESCHLOSSEN: 'Ausgeschlossen',
  };

  const filtered = members;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Mitglieder
          </h1>
          <p className="text-muted-foreground text-sm">{total} Mitglied{total !== 1 ? 'er' : ''} gesamt{(genderStats?.MAENNLICH || genderStats?.WEIBLICH) ? ` · ♂ ${genderStats?.MAENNLICH ?? 0} · ♀ ${genderStats?.WEIBLICH ?? 0}${genderStats?.UNBEKANNT ? ` · ${genderStats.UNBEKANNT} ohne Angabe` : ''}` : ''}</p>
        </div>
        <button onClick={printList} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-medium text-sm mr-2"><Printer className="w-4 h-4" /> Drucken</button>
        <Link href="/mitglieder/neu" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Neues Mitglied
        </Link>
      </div>

      {/* Arama ve filtreler */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Name, Mitgliedsnummer suchen..."
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {[['all','Alle'],['aktiv','Aktiv'],['passiv','Passiv'],['ausgetreten','Ausgetreten'],['verstorben','Verstorben'],['ausgeschlossen','Ausgeschlossen']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === val ? 'bg-primary text-primary-foreground' : 'border border-input hover:bg-muted'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Keine Mitglieder gefunden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th onClick={() => toggleSort('memberNumber')} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer select-none hover:text-foreground">Nr.{arrow('memberNumber')}</th>
                  <th onClick={() => toggleSort('name')} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer select-none hover:text-foreground">Name{arrow('name')}</th>
                  <th onClick={() => toggleSort('adresse')} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer select-none hover:text-foreground">Adresse{arrow('adresse')}</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Telefon</th>
                  <th onClick={() => toggleSort('gender')} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer select-none hover:text-foreground">Geschlecht{arrow('gender')}</th>
                  <th onClick={() => toggleSort('nationality')} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer select-none hover:text-foreground">Nationalität{arrow('nationality')}</th>
                  <th onClick={() => toggleSort('contributionLevel')} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer select-none hover:text-foreground">Beitragsstufe{arrow('contributionLevel')}</th>
                  <th onClick={() => toggleSort('status')} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer select-none hover:text-foreground">Status{arrow('status')}</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Beitrag</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: any, i: number) => {
                  const isOverdue = m?.contributionStatus === 'OVERDUE';
                  return (
                    <tr key={m?.id} className={`border-b border-border hover:bg-muted/30 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-muted/10'} ${isOverdue ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <Link href={`/mitglieder/detail?id=${m?.id}`} className="block">
                          <span className="font-mono text-sm text-muted-foreground">{String(m?.memberNumber ?? 0).padStart(5, "0")}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/mitglieder/detail?id=${m?.id}`} className="block">
                          <p className="font-medium text-sm">{m?.lastName}, {m?.firstName}</p>
                          {m?.family && <p className="text-xs text-muted-foreground">👨‍👩‍👧 {m.family.familyName}</p>}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/mitglieder/detail?id=${m?.id}`} className="block">
                          <p className="text-sm">{m?.street}</p>
                          <p className="text-xs text-muted-foreground">{m?.zipCode} {m?.city}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <Link href={`/mitglieder/detail?id=${m?.id}`} className="block">{m?.phone ?? '—'}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <Link href={`/mitglieder/detail?id=${m?.id}`} className="block">{m?.gender === 'MAENNLICH' ? 'Männlich' : m?.gender === 'WEIBLICH' ? 'Weiblich' : m?.gender === 'DIVERS' ? 'Divers' : '—'}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <Link href={`/mitglieder/detail?id=${m?.id}`} className="block">{m?.nationality === 'deutsch' ? 'Deutsch' : m?.nationality === 'türkisch' ? 'Türkisch' : m?.nationality === 'deutsch-türkisch' ? 'DE/TR (Doppelte)' : m?.nationality === 'andere' ? 'Andere' : '—'}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link href={`/mitglieder/detail?id=${m?.id}`} className="block">{m?.contributionLevel ?? '—'}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/mitglieder/detail?id=${m?.id}`} className="block">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[m?.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {statusLabels[m?.status] ?? m?.status}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/mitglieder/detail?id=${m?.id}`} className="block">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                              <AlertTriangle className="w-3 h-3" /> Rückstand
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600">✓ OK</span>
                          )}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Seite {page} von {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-input hover:bg-muted disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-input hover:bg-muted disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
