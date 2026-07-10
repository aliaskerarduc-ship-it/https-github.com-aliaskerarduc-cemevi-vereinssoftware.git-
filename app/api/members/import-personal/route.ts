import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

function parseDate(s: string): Date | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!m) return null;
  let year = parseInt(m[3]);
  if (m[3].length === 2) year = year <= 30 ? 2000 + year : 1900 + year;
  const d = new Date(Date.UTC(year, parseInt(m[2]) - 1, parseInt(m[1])));
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function beitragToStufe(amount: number | null): string | null {
  if (amount === null) return null;
  const map: Record<number, string> = { 5: "STUDENT", 8: "ERMAESSIGT", 12: "NORMAL", 16: "FAMILIE", 4: "PARTNER" };
  return map[Math.round(amount)] || null;
}

function normalizeNationality(s: string): string | null {
  const t = (s || "").trim().toUpperCase().replace(/\s/g, "");
  if (!t) return null;
  if (["TR/DE","DE/TR","TR-DE","DE-TR"].includes(t) || t.includes("DOPPELTE")) return "deutsch-t\u00fcrkisch";
  if (t === "TR" || t === "T\u00dcRKISCH") return "t\u00fcrkisch";
  if (t === "DE" || t === "DEUTSCH") return "deutsch";
  return "andere";
}

function normalizeZahlungsweise(s: string): string | null {
  const t = (s || "").trim().toLowerCase();
  if (!t) return null;
  if (t.includes("3 monat") || t.includes("viertel")) return "vierteljährlich";
  if (t.includes("halb")) return "halbjährlich";
  if (t.includes("monat")) return "monatlich";
  if (t.includes("jahr") || t.includes("jähr")) return "jährlich";
  if (t.includes("bar")) return "bar";
  return t;
}

function parseGender(s: string): string | null {
  const g = (s || "").trim().toUpperCase();
  if (g === "M") return "MAENNLICH";
  if (g === "W") return "WEIBLICH";
  if (g === "D") return "DIVERS";
  return null;
}

function parseStatus(s: string): string | null {
  const t = (s || "").trim().toUpperCase();
  if (t === "AKTIV") return "AKTIV";
  if (t === "PASSIV") return "PASSIV";
  if (t === "AUSGETRETEN") return "AUSGETRETEN";
  if (t === "VERSTORBEN") return "VERSTORBEN";
  if (t === "AUSGESCHLOSSEN") return "AUSGESCHLOSSEN";
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    const { csvText } = await req.json();
    if (!csvText) return NextResponse.json({ error: "Keine Daten" }, { status: 400 });

    const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: "Keine Datenzeilen" }, { status: 400 });

    // Trennzeichen erkennen: das mit den meisten Spalten gewinnt
    const first = lines[0];
    const cand: [string, number][] = [
      ["\t", first.split("\t").length],
      [";", first.split(";").length],
      [",", first.split(",").length],
    ];
    cand.sort((a, b) => b[1] - a[1]);
    const SEP = cand[0][0];
    console.log("IMPORT-PERSONAL SEP:", JSON.stringify(SEP), "| Spalten:", first.split(SEP).length, "| Header:", first.substring(0, 250));

    const header = first.split(SEP).map((h: string) => h.trim().toLowerCase());
    const norm = (h: string) => h.replace(/[.\s]/g, "");
    const col = (names: string[]) => {
      for (const n of names) {
        const i = header.findIndex((h: string) => norm(h).includes(n));
        if (i >= 0) return i;
      }
      return -1;
    };

    const idx: Record<string, number> = {
      nr: col(["mitgliedsnummer", "mitgliedsnr"]),
      vorname: col(["vorname"]),
      strasse: col(["straße", "strasse"]),
      plz: col(["plz"]),
      stadt: col(["stadt"]),
      geburtsdatum: col(["geburtsdatum"]),
      geschlecht: col(["geschlecht"]),
      nationalitaet: col(["staatsangehörigkeit", "staatsangehoerigkeit", "nationalität", "nationalitaet"]),
      eintrittsdatum: col(["eintrittsdatum"]),
      telefon: col(["telefon"]),
      email: col(["email"]),
      gebaeudekauf: col(["gebäudekauf", "gebaeudekauf"]),
      finanzierung: col(["finazierung", "finanzierung"]),
      zahlungsweise: col(["zahlungsweise"]),
      status: col(["status"]),
      name: -1,
      beitrag: -1,
    };
    idx.name = header.findIndex((h: string) => norm(h) === "name");
    idx.beitrag = header.findIndex((h: string) => norm(h) === "beitrag");
    const notizIdx: number[] = [];
    header.forEach((h: string, i: number) => { if (norm(h) === "notiz") notizIdx.push(i); });

    if (idx.nr < 0) return NextResponse.json({ error: "Spalte Mitgliedsnummer nicht gefunden. Header: " + first.substring(0, 200) }, { status: 400 });

    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(SEP).map((p: string) => p.trim());
      const nrRaw = parts[idx.nr] || "";
      const memberNumber = parseInt(nrRaw.replace(/\D/g, ""), 10);
      if (!memberNumber || memberNumber > 2000000000) { skipped++; errors.push(`Zeile ${i + 1}: ungültige Mitgliedsnummer "${nrRaw.substring(0, 30)}"`); continue; }

      const get = (j: number) => (j >= 0 && parts[j] ? parts[j] : "");
      const beitragAmount = parseAmount(get(idx.beitrag));
      const stufe = beitragToStufe(beitragAmount);
      const notizen = notizIdx.map(j => get(j)).filter(Boolean).join(" | ");

      const data: any = {};
      if (get(idx.name)) data.lastName = get(idx.name);
      if (get(idx.vorname)) data.firstName = get(idx.vorname);
      if (get(idx.strasse)) data.street = get(idx.strasse);
      if (get(idx.plz)) data.zipCode = get(idx.plz);
      if (get(idx.stadt)) data.city = get(idx.stadt);
      const bd = parseDate(get(idx.geburtsdatum)); if (bd) data.birthDate = bd;
      const g = parseGender(get(idx.geschlecht)); if (g) data.gender = g;
      const nat = normalizeNationality(get(idx.nationalitaet)); if (nat) data.nationality = nat;
      const ed = parseDate(get(idx.eintrittsdatum)); if (ed) data.entryDate = ed;
      if (get(idx.telefon)) data.phone = get(idx.telefon);
      if (get(idx.email)) data.email = get(idx.email);
      if (stufe) data.contributionLevel = stufe;
      const st = parseStatus(get(idx.status)); if (st) data.status = st;
      if (notizen) data.notes = notizen;
      const gk = parseAmount(get(idx.gebaeudekauf)); if (gk !== null) data.gebaeudekaufBeitrag = gk;
      if (get(idx.finanzierung)) data.finanzierung = get(idx.finanzierung);
      const zw = normalizeZahlungsweise(get(idx.zahlungsweise)); if (zw) data.zahlungsweise = zw;

      try {
        const existing = await prisma.member.findUnique({ where: { memberNumber } });
        if (existing) {
          await prisma.member.update({ where: { memberNumber }, data });
          updated++;
        } else {
          if (!data.firstName || !data.lastName) { skipped++; errors.push(`Zeile ${i + 1}: Nr. ${memberNumber} neu, aber Name/Vorname fehlt`); continue; }
          await prisma.member.create({ data: { memberNumber, ...data } });
          created++;
        }
      } catch (e: any) {
        skipped++;
        errors.push(`Zeile ${i + 1} (Nr. ${memberNumber}): ${e.message?.substring(0, 100)}`);
      }
    }

    console.log("IMPORT-PERSONAL:", { created, updated, skipped, errors: errors.slice(0, 5) });
    return NextResponse.json({ created, updated, skipped, errors: errors.slice(0, 20) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
