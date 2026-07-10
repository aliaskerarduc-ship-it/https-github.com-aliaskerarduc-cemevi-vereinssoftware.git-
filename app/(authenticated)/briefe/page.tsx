'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Mail, Users, User, Search, Printer, X, Check } from 'lucide-react';
import { toast } from 'sonner';

const CURRENT_YEAR = new Date().getFullYear();

const TEMPLATES = {
  beitrag: {
    label: 'Beitragserhöhung',
    betreff: 'Beitragserhöhung {{JAHR}}',
    text: `Liebe/r {{ANREDE}} {{NACHNAME}},

wir möchten Sie darüber informieren, dass der Mitgliedsbeitrag ab dem {{DATUM}} angepasst wird.

Ihr neuer monatlicher Beitrag beträgt: {{BETRAG}} €

Bitte überweisen Sie den Betrag auf unser Konto.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen,
Der Vorstand`,
  },
  einladung: {
    label: 'Einladung Versammlung',
    betreff: 'Einladung zur Mitgliederversammlung {{JAHR}}',
    text: `Liebe/r {{ANREDE}} {{NACHNAME}},

wir laden Sie herzlich zur Mitgliederversammlung ein.

Datum: {{DATUM}}
Uhrzeit: 18:00 Uhr
Ort: Alevitische Kulturgemeinde Duisburg, Goethe-Str. 49, 47166 Duisburg

Tagesordnung:
1. Begrüßung
2. Jahresbericht
3. Finanzbericht
4. Verschiedenes

Wir freuen uns auf Ihre Teilnahme.

Mit freundlichen Grüßen,
Der Vorstand`,
  },
  mahnung: {
    label: 'Beitragsrückstand',
    betreff: 'Erinnerung: Ausstehender Mitgliedsbeitrag',
    text: `Liebe/r {{ANREDE}} {{NACHNAME}},

wir möchten Sie freundlich daran erinnern, dass Ihr Mitgliedsbeitrag noch aussteht.

Ausstehender Betrag: {{BETRAG}} €

Bitte überweisen Sie den Betrag bis zum {{DATUM}} auf unser Konto.

Mit freundlichen Grüßen,
Der Vorstand`,
  },
  allgemein: {
    label: 'Allgemeines Schreiben',
    betreff: 'Wichtige Mitteilung',
    text: `Liebe/r {{ANREDE}} {{NACHNAME}},

wir möchten Sie über folgendes informieren:



Mit freundlichen Grüßen,
Der Vorstand`,
  },
};

type VereinSettings = {
  name: string;
  unterzeile: string;
  strasse: string;
  plz: string;
  stadt: string;
  telefon: string;
  fax: string;
  email: string;
  website: string;
  vorsitzender: string;
  aufsichtsrat: string;
  iban: string;
  bic: string;
  bank: string;
  amtsgericht: string;
  logoLeft: string;
  logoRight: string;
};

const DEFAULT_SETTINGS: VereinSettings = {
  name: 'Alevitische Kulturgemeinde Duisburg und Umgebung e.V.',
  unterzeile: 'Mitglied der Dachverband Alevitische Gemeinde Deutschland K.d.ö.R',
  strasse: 'Goethe-Str. 49',
  plz: '47166',
  stadt: 'Duisburg',
  telefon: '+ (0) 176 42029618',
  fax: '+49 203-36975341',
  email: 'akm-duisburg@hotmail.com',
  website: 'www.akm-duisburg.de',
  vorsitzender: 'Ismail Sahin',
  aufsichtsrat: 'Haydar Temiz',
  iban: 'DE39 3505 0000 0200 3308 35',
  bic: 'DUISDE33XXX',
  bank: 'Stadtsparkasse Duisburg',
  amtsgericht: 'Amtsgericht Duisburg VR 5739',
  logoLeft: '/Logo_Du_Hamborn.jpg',
  logoRight: '/AABF.jpeg',
};

const getLetterCSS = () => `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; background: #fff; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
  .page {
    width: 210mm;
    height: 297mm;
    padding: 10mm 22mm 48mm 22mm;
    position: relative;
    overflow: hidden;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
    margin-bottom: 4mm;
    text-align: center;
  }
  .logo-left {
    width: 95px; height: 95px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  .header-center {
    flex: 1;
    text-align: center;
  }
  .header-center h1 { font-size: 12pt; font-weight: bold; line-height: 1.25; white-space: nowrap; }
  .header-center p { font-size: 8.5pt; color: #333; margin-top: 2px; }
  .logo-right {
    width: 95px; height: 95px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .absender-klein {
    position: absolute;
    left: 20mm;
    top: 44mm;
    font-size: 7.5pt;
    color: #333;
    text-decoration: underline;
  }
  .empfaenger {
    position: absolute;
    left: 20mm;
    top: 50mm;
    width: 85mm;
    height: 40mm;
    font-size: 11pt;
    line-height: 1.7;
    overflow: hidden;
  }
  .after-empfaenger {
    position: absolute;
    left: 20mm;
    right: 20mm;
    top: 100mm;
  }
  .datum { text-align: right; font-size: 10.5pt; margin-bottom: 5mm; }
  .betreff { font-size: 11pt; font-weight: bold; margin-bottom: 5mm; }
  .text { font-size: 10.5pt; line-height: 1.75; }
  .footer {
    position: absolute;
    bottom: 0;
    left: 22mm;
    right: 22mm;
    padding-top: 3mm;
    padding-bottom: 6mm;
  }
  .footer-note { font-size: 8pt; color: #222; margin-bottom: 2mm; }
  .footer-info {
    border-top: 1px solid #888;
    padding-top: 2mm;
    font-size: 6.5pt;
    color: #555;
    line-height: 1.6;
  }
  @media print {
    html, body { width: 210mm; height: 297mm; }
    .page { margin: 0; page-break-after: always; }
    @page { margin: 0; size: A4 portrait; }
  }
`;

const buildPage = (member: any, betreff: string, text: string, datum: string, betrag: string, s: VereinSettings) => {
  const anrede = member.gender === 'WEIBLICH' ? 'Frau' : 'Herr';
  const empfaengerName = member.family ? ('Familie ' + member.family.familyName) : (anrede + ' ' + (member.firstName || '') + ' ' + (member.lastName || ''));
  const resolve = (str: string) => str
    .replace(/{{ANREDE}}/g, anrede)
    .replace(/{{NACHNAME}}/g, member.lastName ?? '')
    .replace(/{{VORNAME}}/g, member.firstName ?? '')
    .replace(/{{DATUM}}/g, datum)
    .replace(/{{BETRAG}}/g, betrag || '...')
    .replace(/{{JAHR}}/g, String(CURRENT_YEAR))
    .replace(/\n/g, '<br/>');

  const adresse = `${s.name}, ${s.strasse}, ${s.plz} ${s.stadt}`;

  return `
<div class="page">
  <div class="header">
    <img class="logo-left" src="${s.logoLeft}" alt="Logo" />
    <div class="header-center">
      <h1>${s.name}</h1>
      <p>${s.unterzeile}</p>
    </div>
    <img class="logo-right" src="${s.logoRight}" alt="AABF" />
  </div>



  <div class="absender-klein">${adresse}</div>

  <div class="empfaenger">
    ${empfaengerName}<br/>
    ${member.street ? member.street + '<br/>' : ''}
    ${(member.zipCode ?? '') + ' ' + (member.city ?? '')}
  </div>

  <div class="after-empfaenger">
    <div class="datum">${s.stadt}, ${datum}</div>
    ${resolve(betreff) ? `<div class="betreff">${resolve(betreff)}</div>` : ''}
    <div class="text">${resolve(text)}</div>
  </div>

  <div class="footer">
    <p class="footer-note">Dieses Dokument ist elektronisch erstellt und daher ohne Unterschrift gültig.</p>
    <div class="footer-info">
      Adresse: ${adresse} &nbsp;
      <a href="http://${s.website}" style="color:#555;">${s.website}</a> ,
      ${s.email}<br/>
      Telefon: ${s.telefon} &nbsp; Telefax: ${s.fax} ,
      Vorsitzender: ${s.vorsitzender}, Aufsichtsrat: ${s.aufsichtsrat}<br/>
      Bankverbindung: ${s.bank} IBAN:${s.iban} BIC: ${s.bic} , ${s.amtsgericht}
    </div>
  </div>
</div>`;
};

const FONTS = ['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New'];
const FONT_SIZES = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt'];

function RichTextEditor({ value, onChange, rows = 12 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const setFontSize = (size: string) => {
    // CSS ile font boyutu ayarla
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;
    document.execCommand('fontSize', false, '7');
    const fontElements = editorRef.current?.querySelectorAll('font[size="7"]');
    fontElements?.forEach(el => {
      (el as HTMLElement).removeAttribute('size');
      (el as HTMLElement).style.fontSize = size;
    });
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="border border-input rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-muted/30 border-b border-input">
        <select onChange={e => exec('fontName', e.target.value)}
          className="text-xs border border-input rounded px-1 py-0.5 bg-background h-6">
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select defaultValue="12pt" onChange={e => setFontSize(e.target.value)}
          className="text-xs border border-input rounded px-1 py-0.5 bg-background w-16 h-6">
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="w-px h-5 bg-border mx-0.5" />
        <button type="button" onClick={() => exec('bold')}
          className="w-7 h-6 rounded hover:bg-muted text-sm font-bold border border-transparent hover:border-border" title="Fett (Strg+B)">
          B
        </button>
        <button type="button" onClick={() => exec('italic')}
          className="w-7 h-6 rounded hover:bg-muted text-sm italic border border-transparent hover:border-border" title="Kursiv (Strg+I)">
          I
        </button>
        <button type="button" onClick={() => exec('underline')}
          className="w-7 h-6 rounded hover:bg-muted text-sm underline border border-transparent hover:border-border" title="Unterstrichen (Strg+U)">
          U
        </button>
        <button type="button" onClick={() => exec('strikeThrough')}
          className="w-7 h-6 rounded hover:bg-muted text-sm line-through border border-transparent hover:border-border" title="Durchgestrichen">
          S
        </button>
        <div className="w-px h-5 bg-border mx-0.5" />
        <button type="button" onClick={() => exec('justifyLeft')}
          className="w-7 h-6 rounded hover:bg-muted text-xs border border-transparent hover:border-border" title="Links">≡</button>
        <button type="button" onClick={() => exec('justifyCenter')}
          className="w-7 h-6 rounded hover:bg-muted text-xs border border-transparent hover:border-border" title="Zentriert">≡</button>
        <button type="button" onClick={() => exec('removeFormat')}
          className="px-2 h-6 rounded hover:bg-muted text-xs border border-transparent hover:border-border ml-auto" title="Formatierung entfernen">
          ✕ Format
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, '<br/>') }}
        className="p-3 focus:outline-none"
        style={{ fontFamily: 'Arial', fontSize: '12pt', lineHeight: '1.75', minHeight: `${rows * 1.75 * 12}px` }}
      />
    </div>
  );
}

export default function BriefePage() {
  const [tab, setTab] = useState<'serien' | 'einzeln'>('serien');
  const [settings, setSettings] = useState<VereinSettings>(DEFAULT_SETTINGS);

  const [members, setMembers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [serienSearch, setSerienSearch] = useState('');
  const [serienFilter, setSerienFilter] = useState('AKTIV');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [serienBetreff, setSerienBetreff] = useState('');
  const [serienText, setSerienText] = useState('');
  const [serienDatum, setSerienDatum] = useState(new Date().toLocaleDateString('de-DE'));
  const [serienBetrag, setSerienBetrag] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [einzelnSearch, setEinzelnSearch] = useState('');
  const [einzelnResults, setEinzelnResults] = useState<any[]>([]);
  const [einzelnMember, setEinzelnMember] = useState<any>(null);
  const [einzelnBetreff, setEinzelnBetreff] = useState('');
  const [einzelnText, setEinzelnText] = useState('');
  const [einzelnDatum, setEinzelnDatum] = useState(new Date().toLocaleDateString('de-DE'));
  const [einzelnBetrag, setEinzelnBetrag] = useState('');
  const [einzelnTemplate, setEinzelnTemplate] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Ayarları yükle
  useEffect(() => {
    fetch('/api/verein-settings')
      .then(r => r.json())
      .then(d => setSettings({ ...DEFAULT_SETTINGS, ...d }))
      .catch(() => {});
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const params = new URLSearchParams({ limit: '500', search: serienSearch });
      const res = await fetch(`/api/members?${params}`);
      const data = await res.json();
      const all: any[] = data?.members ?? [];
      setMembers(serienFilter === 'all' ? all : all.filter((m: any) => m.status === serienFilter));
    } catch { toast.error('Fehler beim Laden'); }
    finally { setLoadingMembers(false); }
  }, [serienSearch, serienFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const searchEinzeln = useCallback(async (q: string) => {
    if (!q.trim()) { setEinzelnResults([]); return; }
    try {
      const res = await fetch(`/api/members?search=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      setEinzelnResults(data?.members ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchEinzeln(einzelnSearch), 300);
    return () => clearTimeout(t);
  }, [einzelnSearch, searchEinzeln]);

  const applyTemplate = (key: string, bSetter: (v: string) => void, tSetter: (v: string) => void, datum: string, betrag: string, member?: any) => {
    if (!key) return;
    const tmpl = TEMPLATES[key as keyof typeof TEMPLATES];
    if (!tmpl) return;
    const anrede = member?.gender === 'WEIBLICH' ? 'Frau' : 'Herr';
    bSetter(tmpl.betreff.replace(/{{JAHR}}/g, String(CURRENT_YEAR)).replace(/{{DATUM}}/g, datum).replace(/{{BETRAG}}/g, betrag || '...'));
    tSetter(tmpl.text.replace(/{{ANREDE}}/g, anrede).replace(/{{NACHNAME}}/g, member?.lastName ?? 'Mitglied').replace(/{{DATUM}}/g, datum).replace(/{{BETRAG}}/g, betrag || '...').replace(/{{JAHR}}/g, String(CURRENT_YEAR)));
  };

  const toggleAll = () => setSelectedIds(selectedIds.size === members.length ? new Set() : new Set(members.map(m => m.id)));
  const toggleMember = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const openPrint = (pages: string) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Brief</title><style>${getLetterCSS()}</style></head><body>${pages}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 700);
  };

  const printSerien = () => {
    const sel = members.filter(m => selectedIds.has(m.id));
    if (!sel.length) { toast.error('Bitte Mitglieder auswählen.'); return; }
    if (!serienText.trim()) { toast.error('Bitte Brieftext eingeben.'); return; }
    // Aynı aileden 2+ üye seçilince tek mektup, tek üye seçilince bireysel
    const familyCount = new Map<string, number>();
    sel.forEach(m => {
      if (m.family && m.family.familyName) {
        const key = m.family.familyName;
        familyCount.set(key, (familyCount.get(key) || 0) + 1);
      }
    });
    const familyMap = new Map<string, any>();
    const result: any[] = [];
    sel.forEach(m => {
      if (m.family && m.family.familyName && familyCount.get(m.family.familyName)! > 1) {
        const key = m.family.familyName;
        if (!familyMap.has(key)) { familyMap.set(key, m); result.push(m); }
      } else {
        result.push({ ...m, family: null });
      }
    });
    openPrint(result.map(m => buildPage(m, serienBetreff, serienText, serienDatum, serienBetrag, settings)).join(''));
  };

  const printEinzeln = () => {
    if (!einzelnMember) { toast.error('Bitte Mitglied auswählen.'); return; }
    if (!einzelnText.trim()) { toast.error('Bitte Brieftext eingeben.'); return; }
    openPrint(buildPage({...einzelnMember, family: null}, einzelnBetreff, einzelnText, einzelnDatum, einzelnBetrag, settings));
  };

  const inp = 'w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" /> Briefe
        </h1>
        <p className="text-muted-foreground text-sm">Serienbriefe und Einzelbriefe erstellen</p>
      </div>

      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {(['serien','einzeln'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'serien' ? <><Users className="w-4 h-4" /> Serienbrief</> : <><User className="w-4 h-4" /> Einzelbrief</>}
          </button>
        ))}
      </div>

      {/* SERIENBRIEF */}
      {tab === 'serien' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Empfänger */}
          <div className="bg-card rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Empfänger</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={serienSearch} onChange={e => setSerienSearch(e.target.value)} placeholder="Name suchen..." className={`${inp} pl-9`} />
              </div>
              <select value={serienFilter} onChange={e => setSerienFilter(e.target.value)} className="px-3 py-2.5 border border-input rounded-lg bg-background text-sm">
                <option value="all">Alle</option>
                <option value="AKTIV">Aktiv</option>
                <option value="PASSIV">Passiv</option>
                <option value="AUSGETRETEN">Ausgetreten</option>
              </select>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{members.length} Mitglieder · <span className="font-bold text-primary">{selectedIds.size} gewählt</span></span>
              <button onClick={toggleAll} className="text-primary text-xs hover:underline">
                {selectedIds.size === members.length && members.length > 0 ? 'Alle abwählen' : 'Alle auswählen'}
              </button>
            </div>
            <div className="border border-border rounded-lg overflow-hidden max-h-[380px] overflow-y-auto">
              {loadingMembers ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-4 border-primary border-t-transparent rounded-full" /></div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Keine Mitglieder.</div>
              ) : (
                <table className="w-full">
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id} onClick={() => toggleMember(m.id)}
                        className={`border-b border-border cursor-pointer transition-colors ${selectedIds.has(m.id) ? 'bg-primary/10' : 'hover:bg-muted/40'}`}>
                        <td className="px-3 py-2.5 w-10">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedIds.has(m.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                            {selectedIds.has(m.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                          <p className="text-xs text-muted-foreground">{m.city ?? '—'} · #{String(m.memberNumber).padStart(5,'0')}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.status === 'AKTIV' ? 'bg-emerald-100 text-emerald-700' : m.status === 'PASSIV' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* İçerik */}
          <div className="bg-card rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Briefinhalt</h2>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Vorlage</label>
              <select value={selectedTemplate} onChange={e => { setSelectedTemplate(e.target.value); applyTemplate(e.target.value, setSerienBetreff, setSerienText, serienDatum, serienBetrag); }} className={inp}>
                <option value="">— Vorlage wählen —</option>
                {Object.entries(TEMPLATES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Datum</label>
                <input value={serienDatum} onChange={e => setSerienDatum(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Betrag (€)</label>
                <input value={serienBetrag} onChange={e => setSerienBetrag(e.target.value)} className={inp} placeholder="z.B. 10.00" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Betreff</label>
              <input value={serienBetreff} onChange={e => setSerienBetreff(e.target.value)} className={inp} placeholder="Betreff..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Brieftext <span className="font-normal opacity-60 text-xs">{`{{ANREDE}} {{NACHNAME}} {{VORNAME}} {{DATUM}} {{BETRAG}}`}</span>
              </label>
              <RichTextEditor value={serienText} onChange={setSerienText} rows={11} />
            </div>
            <button onClick={printSerien} disabled={selectedIds.size === 0 || !serienText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
              <Printer className="w-4 h-4" />
              {selectedIds.size > 0 ? `${selectedIds.size} Brief${selectedIds.size !== 1 ? 'e' : ''} drucken` : 'Empfänger auswählen'}
            </button>
          </div>
        </div>
      )}

      {/* EINZELBRIEF */}
      {tab === 'einzeln' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Empfänger</h2>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={einzelnSearch}
                  onChange={e => { setEinzelnSearch(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Mitglied suchen..." className={`${inp} pl-9`} />
                {einzelnSearch && (
                  <button onClick={() => { setEinzelnSearch(''); setEinzelnResults([]); setSearchOpen(false); setEinzelnMember(null); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              {searchOpen && einzelnResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
                  {einzelnResults.map(m => (
                    <button key={m.id} onClick={() => { setEinzelnMember(m); setEinzelnSearch(`${m.firstName} ${m.lastName}`); setSearchOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left">
                      <div>
                        <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-muted-foreground">#{String(m.memberNumber).padStart(5,'0')} · {m.city ?? '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {einzelnMember ? (
              <div className="bg-muted/40 rounded-lg p-4 space-y-1">
                <div className="flex items-start justify-between">
                  <p className="font-bold">{einzelnMember.firstName} {einzelnMember.lastName}</p>
                  <button onClick={() => { setEinzelnMember(null); setEinzelnSearch(''); }} className="p-1 rounded hover:bg-muted">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">#{String(einzelnMember.memberNumber).padStart(5,'0')}</p>
                {einzelnMember.street && <p className="text-sm">{einzelnMember.street}</p>}
                {(einzelnMember.zipCode || einzelnMember.city) && <p className="text-sm">{einzelnMember.zipCode} {einzelnMember.city}</p>}
                {einzelnMember.email && <p className="text-sm text-muted-foreground">{einzelnMember.email}</p>}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                Mitglied suchen und auswählen
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Briefinhalt</h2>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Vorlage</label>
              <select value={einzelnTemplate} onChange={e => { setEinzelnTemplate(e.target.value); applyTemplate(e.target.value, setEinzelnBetreff, setEinzelnText, einzelnDatum, einzelnBetrag, einzelnMember); }} className={inp}>
                <option value="">— Vorlage wählen —</option>
                {Object.entries(TEMPLATES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Datum</label>
                <input value={einzelnDatum} onChange={e => setEinzelnDatum(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Betrag (€)</label>
                <input value={einzelnBetrag} onChange={e => setEinzelnBetrag(e.target.value)} className={inp} placeholder="z.B. 10.00" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Betreff</label>
              <input value={einzelnBetreff} onChange={e => setEinzelnBetreff(e.target.value)} className={inp} placeholder="Betreff..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Brieftext <span className="font-normal opacity-60 text-xs">{`{{ANREDE}} {{NACHNAME}} {{VORNAME}} {{DATUM}} {{BETRAG}}`}</span>
              </label>
              <RichTextEditor value={einzelnText} onChange={setEinzelnText} rows={11} />
            </div>
            <button onClick={printEinzeln} disabled={!einzelnMember || !einzelnText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
              <Printer className="w-4 h-4" /> Brief drucken
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
