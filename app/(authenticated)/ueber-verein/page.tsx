'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Info, Pencil, Save, X } from 'lucide-react';

const DEFAULT_ABOUT = `# Alevitische Kulturgemeinde Duisburg und Umgebung e.V.
**Mitglied der Alevitischen Gemeinde Deutschland K.d.ö.R.**

## Anschrift
**Goethestraße 49**, 47166 Duisburg
**E-Mail:** akm-duisburg@hotmail.com

# Vorstand
| Funktion | Name | Telefon |
| --- | --- | --- |
| Vorsitzender | Ismail Şahin | +49 155 66069161 |
| Stellv. Vorsitzender | Ali Canpolat |  |
| Schriftführer | Sezer Arduç | +49 176 42029618 |
| Kassierer | Mustafa Tepe | +49 176 47080902 |

# Gründer der Gemeinde
| Nachname | Vorname |
| --- | --- |
| Arduç | Ali Asker |
| Şen | Cemal |
| Şahin | Ibrahim |
| Canpolat | Ali |
| Sezer | Haydar |
| Fırat | Yaşar |
| Çatalkaya | Kemal |
| Aksu | Haluk |
| Demir | Mustafa |
`;

function renderMarkdown(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = md.split(/\r?\n/);
  let html = '';
  let inTable = false;
  const closeTable = () => { if (inTable) { html += '</tbody></table>'; inTable = false; } };
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (/^\|(.+)\|\s*$/.test(line)) {
      const cells = line.split('|').slice(1, -1).map(x => x.trim());
      if (cells.every(x => /^:?-+:?$/.test(x))) continue;
      if (!inTable) { html += '<table class="w-full text-sm border-collapse my-3"><tbody>'; inTable = true; }
      const isHeader = i + 1 < lines.length && /^\|[\s:-]+\|\s*$/.test(lines[i + 1]);
      const tag = isHeader ? 'th' : 'td';
      html += '<tr>' + cells.map(x => '<' + tag + ' class="border border-border px-3 py-1.5 text-left">' + inline(x) + '</' + tag + '>').join('') + '</tr>';
      continue;
    }
    closeTable();
    if (/^# /.test(line)) html += '<h1 class="text-2xl font-display font-bold mt-6 mb-2">' + inline(line.slice(2)) + '</h1>';
    else if (/^## /.test(line)) html += '<h2 class="text-lg font-bold mt-4 mb-1">' + inline(line.slice(3)) + '</h2>';
    else if (/^---\s*$/.test(line)) html += '<hr class="my-4 border-border" />';
    else if (line.trim() === '') html += '';
    else html += '<p class="my-1">' + inline(line) + '</p>';
  }
  closeTable();
  return html;
}

export default function UeberVereinPage() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [content, setContent] = useState('');
  const [temp, setTemp] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/verein-settings').then(r => r.json()).then(d => {
      setContent(d.aboutContent || DEFAULT_ABOUT);
      setLoading(false);
    }).catch(() => { setContent(DEFAULT_ABOUT); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/verein-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aboutContent: temp }) });
      if (!res.ok) { toast.error('Fehler beim Speichern'); return; }
      setContent(temp);
      setEditing(false);
      toast.success('Gespeichert!');
    } catch { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2"><Info className="w-6 h-6 text-primary" /> Über diesen Verein</h1>
        {isAdmin && !editing && (
          <button onClick={() => { setTemp(content); setEditing(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">
            <Pencil className="w-4 h-4" /> Bearbeiten
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Markdown: # Titel, ## Untertitel, **fett**, Tabellen mit | Spalte | Spalte |</p>
          <textarea value={temp} onChange={e => setTemp(e.target.value)} rows={24} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Speichern...' : 'Speichern'}
            </button>
            <button onClick={() => setEditing(false)} className="inline-flex items-center gap-2 px-4 py-2.5 border border-input rounded-lg hover:bg-muted">
              <X className="w-4 h-4" /> Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl p-6 shadow-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
      )}
    </div>
  );
}
