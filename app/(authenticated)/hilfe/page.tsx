'use client';

import { useState } from 'react';
import { HelpCircle, Users, CreditCard, Heart, FileText, Calendar, BarChart3, Mail, Package, FolderOpen, Settings, ChevronDown, ChevronRight } from 'lucide-react';

const TOPICS = [
  {
    icon: Users,
    title: 'Mitgliederverwaltung',
    color: 'text-blue-500',
    content: `Die Mitgliederverwaltung ist das Herzstück der Software. Hier können Sie alle Mitglieder anlegen, bearbeiten und verwalten.

- Neues Mitglied anlegen: Klicken Sie auf "Neues Mitglied" und füllen Sie die Pflichtfelder aus.
- Mitglied suchen: Nutzen Sie die Suchfunktion oben rechts.
- Mitglied bearbeiten: Klicken Sie auf einen Mitgliedsnamen, um die Detailansicht zu öffnen.
- Profilfoto: Im Detailbereich können Sie ein Foto hochladen und zuschneiden.
- Familienzugehörigkeit: Weisen Sie Mitglieder einer Familie zu.
- Gremien & Ämter: Erfassen Sie Vorstandstätigkeiten im entsprechenden Tab.`,
  },
  {
    icon: CreditCard,
    title: 'Beitragsverwaltung',
    color: 'text-emerald-500',
    content: `Verwalten Sie Mitgliedsbeiträge und Beitragssätze.

- Neuer Beitrag: Klicken Sie auf "Neuer Beitrag" und wählen Sie das Mitglied aus.
- Beitragssätze: Klicken Sie auf "Bearbeiten" um die Beitragssätze anzupassen.
- Stufen: Student, Ermäßigt, Normal, Familie, Partner/in.
- Änderungen werden automatisch auf alle Mitglieder angewendet.`,
  },
  {
    icon: Heart,
    title: 'Spendenverwaltung',
    color: 'text-red-500',
    content: `Erfassen und verwalten Sie alle Spenden.

- Neue Spende: Klicken Sie auf "Neue Spende" und wählen Sie den Spender aus.
- Zuwendungsbestätigung: Unter Berichte können Sie Zuwendungsbestätigungen für Einzelpersonen oder Familien erstellen.
- Export: Spenden können als Excel exportiert werden.`,
  },
  {
    icon: Users,
    title: 'Familienverwaltung',
    color: 'text-purple-500',
    content: `Verwalten Sie Familien und deren Mitglieder.

- Neue Familie: Klicken Sie auf "Neue Familie" und geben Sie einen Familiennamen ein.
- Mitglieder hinzufügen: Klicken Sie auf das + Symbol neben einem Mitglied.
- Familienbeitrag: Mitglieder einer Familie können den Familien-Beitragssatz erhalten.`,
  },
  {
    icon: Mail,
    title: 'Briefe & Serienbriefe',
    color: 'text-amber-500',
    content: `Erstellen Sie Einzel- und Serienbriefe für Ihre Mitglieder.

- Serienbrief: Wählen Sie mehrere Mitglieder aus und erstellen Sie einen Brief für alle.
- Einzelbrief: Suchen Sie ein Mitglied und erstellen Sie einen persönlichen Brief.
- Vorlagen: Nutzen Sie vorgefertigte Vorlagen (Beitragserhöhung, Einladung, Mahnung).
- Variablen: {{ANREDE}}, {{NACHNAME}}, {{VORNAME}}, {{DATUM}}, {{BETRAG}}
- Formatierung: Nutzen Sie die Toolbar für Fett, Kursiv, Unterstrichen etc.`,
  },
  {
    icon: Calendar,
    title: 'Versammlungen',
    color: 'text-indigo-500',
    content: `Verwalten Sie Mitgliederversammlungen und Anwesenheitslisten.

- Neue Versammlung: Geben Sie Titel, Datum und Beschreibung ein.
- Einchecken: Klicken Sie auf "Einchecken" um Mitglieder als anwesend zu markieren.
- Digitale Unterschrift: Mitglieder können auf Tablet oder Telefon unterschreiben.
- Anwesenheitsliste: Laden Sie die PDF-Liste herunter.`,
  },
  {
    icon: Calendar,
    title: 'Terminkalender',
    color: 'text-teal-500',
    content: `Verwalten Sie Termine und Veranstaltungen.

- Neuer Termin: Klicken Sie auf ein Datum im Kalender.
- Ansichten: Monat, Woche oder Liste.
- Typen: Veranstaltung, Geburtstag, Versammlung, Feiertag, Sonstiges.`,
  },
  {
    icon: BarChart3,
    title: 'Berichte & Auswertungen',
    color: 'text-orange-500',
    content: `Erstellen Sie Berichte und Statistiken.

- Geschlechterverteilung, Nationalitäten, Beitragsstufen.
- Zuwendungsbestätigung: Für Einzelmitglieder oder Familien.
- Datenexport: Mitglieder, Spenden und Beiträge als Excel.
- Bericht drucken: Alle Statistiken auf einen Blick.`,
  },
  {
    icon: Package,
    title: 'Inventarliste',
    color: 'text-gray-500',
    content: `Verwalten Sie das Inventar und die Ausstattung des Vereins.

- Neuer Eintrag: Bezeichnung, Modell, Anzahl und Kaufdatum eingeben.
- Herkunft: Cemevi (gekauft) oder Spende/Geschenk.
- Status: Aktiv, Defekt oder Ausgemustert.
- Drucken: Inventarliste mit Vereinslogo ausdrucken.`,
  },
  {
    icon: FolderOpen,
    title: 'Vereinsdokumente',
    color: 'text-yellow-500',
    content: `Verwalten Sie wichtige Vereinsdokumente.

- Ordner erstellen: Strukturieren Sie Ihre Dokumente in Ordnern.
- Dateien hochladen: PDF, Word, Excel und andere Formate.
- Herunterladen: Klicken Sie auf das Download-Symbol.
- Löschen: Nur Administratoren können Dateien löschen.`,
  },
  {
    icon: Settings,
    title: 'Einstellungen',
    color: 'text-slate-500',
    content: `Passen Sie die Software an Ihre Bedürfnisse an.

- Vereinsdaten: Name, Adresse, Vorsitzender, Bankverbindung etc.
- Design: Wählen Sie zwischen Hell, Dunkel oder System-Theme.
- Hauptfarbe: Passen Sie die Primärfarbe der Anwendung an.
- Beitragssätze: Unter Beiträge können die Sätze angepasst werden.
- Backup: Erstellen Sie regelmäßige Datensicherungen.`,
  },
];

export default function HilfePage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" /> Hilfe & Anleitung
        </h1>
        <p className="text-muted-foreground text-sm">Kurzanleitung für alle Module der Cem Evi Vereinssoftware</p>
      </div>

      <div className="space-y-2">
        {TOPICS.map((topic, i) => (
          <div key={i} className="bg-card rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <topic.icon className={`w-5 h-5 ${topic.color}`} />
                <span className="font-medium">{topic.title}</span>
              </div>
              {open === i ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {open === i && (
              <div className="px-5 pb-5 pt-1 border-t border-border">
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{topic.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
