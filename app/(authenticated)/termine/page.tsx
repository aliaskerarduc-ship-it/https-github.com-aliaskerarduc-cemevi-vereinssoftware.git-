'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, Cake, CalendarDays, List } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DAYS = ['Mo','Di','Mi','Do','Fr','Sa','So'];

const TYPE_COLORS: Record<string, string> = {
  VERANSTALTUNG: '#16a34a',
  GEBURTSTAG: '#f59e0b',
  VERSAMMLUNG: '#2563eb',
  FEIERTAG: '#dc2626',
  SONSTIGES: '#7c3aed',
};

const TYPE_LABELS: Record<string, string> = {
  VERANSTALTUNG: 'Veranstaltung',
  GEBURTSTAG: 'Geburtstag',
  VERSAMMLUNG: 'Versammlung',
  FEIERTAG: 'Feiertag',
  SONSTIGES: 'Sonstiges',
};

type Termin = {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  type: string;
  color?: string;
  memberId?: string;
  createdBy?: string;
};

export default function TerminePage() {
  const [view, setView] = useState<'month' | 'week' | 'list'>('month');
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [termine, setTermine] = useState<Termin[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTermine, setSelectedTermine] = useState<Termin[]>([]);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    allDay: true,
    type: 'VERANSTALTUNG',
    color: '',
  });

  const year = current.getFullYear();
  const month = current.getMonth();

  const fetchTermine = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/termine?year=${year}&month=${month + 1}`);
      const data = await res.json();
      const all = [...(data.termine ?? []), ...(data.birthdays ?? [])];
      setTermine(all);
    } catch { toast.error('Fehler beim Laden'); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchTermine(); }, [fetchTermine]);

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));
  const prevWeek = () => setCurrent(new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7));
  const nextWeek = () => setCurrent(new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7));

  const goToday = () => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1));

  const getTermineForDay = (date: Date) => {
    const d = date.toISOString().split('T')[0];
    return termine.filter(t => t.startDate.split('T')[0] === d);
  };

  const handleDayClick = (date: Date) => {
    const dayTermine = getTermineForDay(date);
    setSelectedDay(date);
    setSelectedTermine(dayTermine);
  };

  const startEdit = (t: any) => {
    const sd = new Date(t.startDate);
    const ed = t.endDate ? new Date(t.endDate) : null;
    const pad = (n: number) => String(n).padStart(2, '0');
    setForm({
      title: t.title ?? '',
      description: t.description ?? '',
      startDate: sd.toISOString().split('T')[0],
      endDate: ed ? ed.toISOString().split('T')[0] : '',
      startTime: t.allDay ? '' : `${pad(sd.getUTCHours())}:${pad(sd.getUTCMinutes())}`,
      endTime: (!t.allDay && ed) ? `${pad(ed.getUTCHours())}:${pad(ed.getUTCMinutes())}` : '',
      allDay: t.allDay ?? true,
      type: t.type ?? 'VERANSTALTUNG',
      color: t.color ?? '',
    });
    setEditId(t.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startDate) { toast.error('Pflichtfelder fehlen'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!form.allDay && form.startTime) payload.startDate = `${form.startDate}T${form.startTime}:00Z`;
      if (!form.allDay && form.endTime) {
        const endDay = form.endDate || form.startDate;
        payload.endDate = `${endDay}T${form.endTime}:00Z`;
      }
      if (editId) payload.id = editId;
      const res = await fetch('/api/termine', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Termin gespeichert!');
      setShowForm(false);
      setForm({ title: '', description: '', startDate: '', endDate: '', startTime: '', endTime: '', allDay: true, type: 'VERANSTALTUNG', color: '' });
      setEditId(null);
      fetchTermine();
    } catch { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('birthday-')) { toast.error('Geburtstage können nicht gelöscht werden.'); return; }
    if (!confirm('Termin löschen?')) return;
    try {
      await fetch('/api/termine', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      toast.success('Termin gelöscht.');
      setSelectedDay(null);
      fetchTermine();
    } catch { toast.error('Fehler'); }
  };

  // Build month grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mo=0
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

  // Build week grid
  const getWeekStart = (d: Date) => {
    const dow = (d.getDay() + 6) % 7;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  };
  const weekStart = getWeekStart(view === 'week' ? current : today);
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));

  const inp = 'w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" /> Terminkalender
          </h1>
          <p className="text-muted-foreground text-sm">Veranstaltungen, Versammlungen und Geburtstage</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 text-sm">
            <Plus className="w-4 h-4" /> Neuer Termin
          </button>
        </div>
      </div>

      {/* Legende */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[k] }} />
            {v}
          </div>
        ))}
      </div>

      {/* Navigation + View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={view === 'week' ? prevWeek : prevMonth} className="p-2 rounded-lg border border-input hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold min-w-[180px] text-center">
            {view === 'week'
              ? `${weekDays[0].getDate()}. – ${weekDays[6].getDate()}. ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
              : `${MONTHS[month]} ${year}`}
          </h2>
          <button onClick={view === 'week' ? nextWeek : nextMonth} className="p-2 rounded-lg border border-input hover:bg-muted">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs rounded-lg border border-input hover:bg-muted">Heute</button>
        </div>

        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setView('month')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'month' ? 'bg-white shadow text-primary' : 'text-muted-foreground'}`}>
            <CalendarDays className="w-3.5 h-3.5" /> Monat
          </button>
          <button onClick={() => setView('week')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'week' ? 'bg-white shadow text-primary' : 'text-muted-foreground'}`}>
            <Calendar className="w-3.5 h-3.5" /> Woche
          </button>
          <button onClick={() => setView('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-white shadow text-primary' : 'text-muted-foreground'}`}>
            <List className="w-3.5 h-3.5" /> Liste
          </button>
        </div>
      </div>

      {/* MONATSANSICHT */}
      {view === 'month' && (
        <div className="bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((date, i) => {
              const isToday = date?.toDateString() === today.toDateString();
              const dayTermine = date ? getTermineForDay(date) : [];
              const isSelected = date?.toDateString() === selectedDay?.toDateString();
              return (
                <div key={i}
                  onClick={() => date && handleDayClick(date)}
                  className={`min-h-[90px] p-1.5 border-b border-r border-border cursor-pointer transition-colors
                    ${!date ? 'bg-muted/20' : 'hover:bg-muted/30'}
                    ${isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary' : ''}
                  `}>
                  {date && (
                    <>
                      <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1
                        ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayTermine.slice(0, 3).map(t => (
                          <div key={t.id} className="text-xs px-1.5 py-0.5 rounded truncate text-white font-medium"
                            style={{ background: t.color || TYPE_COLORS[t.type] || '#16a34a' }}>
                            {t.title}
                          </div>
                        ))}
                        {dayTermine.length > 3 && (
                          <div className="text-xs text-muted-foreground px-1">+{dayTermine.length - 3} mehr</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WOCHENANSICHT */}
      {view === 'week' && (
        <div className="bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={i} className={`py-3 text-center border-r border-border last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
                  <p className="text-xs text-muted-foreground">{DAYS[i]}</p>
                  <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-primary' : ''}`}>{d.getDate()}</p>
                  <p className="text-xs text-muted-foreground">{MONTHS[d.getMonth()].slice(0,3)}</p>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[300px]">
            {weekDays.map((d, i) => {
              const dayTermine = getTermineForDay(d);
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={i}
                  onClick={() => handleDayClick(d)}
                  className={`p-2 border-r border-border last:border-r-0 cursor-pointer hover:bg-muted/20 ${isToday ? 'bg-primary/5' : ''}`}>
                  <div className="space-y-1">
                    {dayTermine.map(t => (
                      <div key={t.id} className="text-xs px-1.5 py-1 rounded text-white font-medium"
                        style={{ background: t.color || TYPE_COLORS[t.type] || '#16a34a' }}>
                        {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LISTENANSICHT */}
      {view === 'list' && (
        <div className="bg-card rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : termine.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Keine Termine gefunden.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Datum</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Titel</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Typ</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Beschreibung</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Erstellt von</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {termine.map(t => (
                  <tr key={t.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">{new Date(t.startDate).toLocaleDateString('de-DE')}{!t.allDay && (<span className="text-muted-foreground"> {new Date(t.startDate).toLocaleTimeString('de-DE', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}{t.endDate ? ' – ' + new Date(t.endDate).toLocaleTimeString('de-DE', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }) : ''}</span>)}</td>
                    <td className="px-4 py-3 text-sm font-medium flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color || TYPE_COLORS[t.type] }} />
                      {t.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: t.color || TYPE_COLORS[t.type] }}>
                        {TYPE_LABELS[t.type] ?? t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t.description ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t.createdBy ?? '—'}</td>
                    <td className="px-4 py-3">
                      {!t.id.startsWith('birthday-') && (
                        <button onClick={() => handleDelete(t.id)} className="text-destructive hover:opacity-70 text-xs">Löschen</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tag Detail Panel */}
      {selectedDay && (
        <div className="bg-card rounded-xl shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{selectedDay.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => { setForm(p => ({ ...p, startDate: selectedDay.toISOString().split('T')[0] })); setShowForm(true); }}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                <Plus className="w-3 h-3" /> Termin
              </button>
              <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {selectedTermine.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag.</p>
          ) : (
            <div className="space-y-2">
              {selectedTermine.map(t => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: t.color || TYPE_COLORS[t.type] }} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t.title}</p>
                    {!t.allDay && <p className="text-xs text-primary font-medium mt-0.5">{new Date(t.startDate).toLocaleTimeString('de-DE', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} Uhr{t.endDate ? ' \u2013 ' + new Date(t.endDate).toLocaleTimeString('de-DE', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }) + ' Uhr' : ''}</p>}
                    {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{TYPE_LABELS[t.type]}</span>
                      {t.createdBy && <span className="text-xs text-muted-foreground">· Erstellt von: <span className="font-medium">{t.createdBy}</span></span>}
                    </div>
                  </div>
                  {!t.id.startsWith('birthday-') && (
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(t)} className="text-xs text-primary hover:opacity-70">Bearbeiten</button>
                      <button onClick={() => handleDelete(t.id)} className="text-xs text-destructive hover:opacity-70">Löschen</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Neuer Termin Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{editId ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Titel *</label>
                <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required className={inp} placeholder="z.B. Mitgliederversammlung" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Typ</label>
                <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} className={inp}>
                  {Object.entries(TYPE_LABELS).filter(([k]) => k !== 'GEBURTSTAG').map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Datum *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} required className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Bis (optional)</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))} className={inp} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.allDay} onChange={e => setForm(p => ({...p, allDay: e.target.checked}))} className="rounded" />
                Ganztägig (ohne Uhrzeit)
              </label>
              {!form.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Von (Uhrzeit)</label>
                    <input type="time" value={form.startTime} onChange={e => setForm(p => ({...p, startTime: e.target.value}))} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Bis (Uhrzeit)</label>
                    <input type="time" value={form.endTime} onChange={e => setForm(p => ({...p, endTime: e.target.value}))} className={inp} />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Beschreibung</label>
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3} className={`${inp} resize-none`} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Speichern...' : 'Termin speichern'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-input rounded-lg hover:bg-muted">Abbrechen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
