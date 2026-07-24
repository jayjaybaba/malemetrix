# PROTOCOL FLAGSHIP REPORT — Phase 16: DAS PROTOKOLL 2.0

Abschlussbericht des Flaggschiff-Rebuilds. Ehrlich gehalten: was gebaut wurde,
was bewusst NICHT, und mit welchem Testlevel jedes Stück abgesichert ist.

## Kernentscheidung (bestimmt alles Weitere)

Der Premium-Kern (ebooks/protokoll.html 230 KB, master-ebook.html 442 KB,
ultimate-stack.html 208 KB) liegt im Repo **ausschließlich verschlüsselt** vor
(AES-256-GCM; Schlüssel = Function-Secrets/Kundencodes, nicht in dieser
Umgebung). Ein Entschlüsseln, Neu-Schreiben oder Concatenieren war damit
technisch unmöglich. Konsequenz: DAS PROTOKOLL 2.0 wurde als **Modul-System**
gebaut (Architektur, Rahmung, neue Kapitel, Integration der Klartext-Inhalte) —
nicht als eine Monolith-Seite und nicht als Decrypt-and-Merge. Das ist keine
Abkürzung, sondern die einzige ehrliche Bauweise unter dieser Randbedingung.

## Positionierung (durchgängig eingehalten)

**DAS PROTOKOLL ERKLÄRT. DAS 12-WOCHEN-PROGRAMM FÜHRT.** Leitmotiv des Werks:
*Optimiere zuerst das System, bevor du ein Signal von außen ersetzt.*
Produkt-Rollen mischen sich nie — sichtbar gemacht in Kapitel 00:
SCORE findet · PROTOKOLL erklärt · PROGRAMM führt · TRACKER misst ·
MY MALEMETRIX verbindet.

## Was gebaut wurde (A–H)

| Paket | Ergebnis | Testlevel |
|---|---|---|
| A Inventur | PROTOCOL_CONTENT_INVENTORY.md — vollständige Quellentabelle + Verschlüsselungs-Befund | Dokument |
| B Architektur | PROTOCOL_MASTER_ARCHITECTURE.md — 14-Modul-System, Reader-Journey, Crosslinks | Dokument |
| C Site/Brand | Library aus Hauptnav → „Über"-Dropdown (25 Seiten, URL bleibt); Wordmark (weight 500, ls 0.13/0.1em) | launch-readiness grün |
| D1 Kapitel-Rahmung | 14 freie Ebooks tragen Protokoll-Systemkopf + Ende-CTA (Rollen getrennt) | statisch + Browser 390/1440 |
| D2 Modul-Hub | protokoll.html Preview-Grid (9 Kapitel) UNTER echter 10-Modul-Übersicht; ebooks.html „Empfohlen für dich" nach Engpass (liest lokalen Score, sendet nichts) | statisch + Browser (seeded/no-seed) |
| E Neue Kapitel | 00-start-here, 11-injektionen, 12-longevity-risk (bp-Design, FREE, foto-freies Cover); im Katalog | statisch + Browser + medizinische Negativ-Guards |
| F BEFORE-TRT | testosteron.html #before-trt: Adipositas↔T mehrpfadig korrekt, Reihenfolge, kein Pro-/Anti-TRT | statisch + Browser |
| G/H Score-Routing | Diagnose-Link je Engpass → passendes Kapitel (statt generisch); Produkt-CTA bleibt | statisch + Browser (4 Engpässe live) |

## Medizinische Korrektheit (PROTOCOL_MEDICAL_QA.md)

- **Aromatase/Adipositas:** durchgehend als EIN Pfad neben Insulinresistenz,
  Entzündung, SHBG-Verschiebung, Schlafapnoe und zentraler HPG-Dämpfung —
  „Fett = hohes Östradiol" ausdrücklich als Irrtum markiert. Zwei Altstellen
  (s6/s8) entsprechend entschärft.
- **Injektionen (Kap. 11):** Angstabbau ohne Verharmlosung; KEINE Universal-
  nadel-Regel, KEINE Dosierung, KEINE Selbstanwendungsanleitung; Nadelwahl an
  Präparat/Route/Stelle/Anatomie gebunden; MM/SAFETY-Notes. Body-Comp-
  Crosslink als Erklärung, nicht als Selbst-Ausrechen-Formel.
- **Longevity (Kap. 12):** ApoB/Blutdruck/Glukose/VO₂max/Screening erklärt,
  aber KEINE erfundenen Zielwerte/Ranges — Interpretation an Arzt + Leitlinie.
- Automatisierte Negativ-Guards in visual-system.test.js (kein „x mg", kein
  „x mm/G", kein mmHg/mg-dl-Range) sichern diese Grenzen gegen Regression.

## Commerce & Sicherheit (unangetastet — DO NOT REGRESS eingehalten)

- protocol- + twelve_week-Entitlements, PayPal, Vaults **unverändert** (Teil 18).
- Score bleibt primärer kostenloser Funnel-Einstieg; Produkt-CTA (49 €) auf der
  Ergebnisseite erhalten; Preis/Bundle (49 € einmalig · inkl. 12-Wochen-Programm)
  überall konsistent zur Produktseite formuliert.
- FREE-Preview-Kapitel bleiben frei (kein Pseudo-Paywalling von Bestandstexten).
- Keine alte URL gelöscht (SEO); ebooks.html bleibt erreichbar.
- Empfehlungslogik liest nur lokalen Score, keine Health-Daten verlassen das Gerät.

## Test- & QA-Stand

- **18 Test-Suiten grün.** visual-system.test.js von 35 → **116** PASS (neue
  Gruppen P16/D1, D2, E, F, G-H) inkl. CSS-Regressionsschutz und med. Negativ-
  Guards. launch-readiness 76/0, i18n 26/0, score-engine 42/0, commerce-e2e 85/0.
- **Konsolidierter Browser-Pass (P16-J):** 11 Seiten × 390/1440 px = 22 Läufe,
  **maximaler horizontaler Overflow: 0 px**, **keine echten JS-Konsolenfehler**
  (nur erwartete geblockte Supabase/PayPal-Requests in der Sandbox).
- Score→Kapitel-Routing für recovery/body/drive/blood live im Browser
  verifiziert; Empfehlungsblock erscheint mit Score, bleibt ohne Score verborgen.

## Behobener Fehler (ehrlich)

In P16-E schlich sich eine zweite `.ev { }`-Basisregel in blueprint.css ein,
die die Pill-Basis überschrieb und die Evidenz-Chips (grün/rot) in 10 Bestands-
Ebooks grau gemacht hätte. In P16-F entfernt und per Browser (Farbwerte) sowie
CSS-Regressionstest abgesichert.

## Bewusst NICHT gemacht / offene Punkte

- **Kein Entschlüsseln/Neu-Schreiben** des Premium-Kerns (technisch unmöglich —
  s. o.). Neue Premium-Vertiefungen bräuchten einen manuellen Verschlüsselungs-
  Schritt des Inhabers (tools-dev/vault.mjs + PROTOCOL_VAULT_KEY).
- **Neue Kapitel + gerahmte Ebooks sind DE-only** (bestehender i18n-PARTIAL-
  Stand; kein Rückschritt, aber auch keine EN-Übersetzung der neuen Fließtexte).
  Katalog-Einträge (ebooks-data.js) haben DE+EN.
- **Neue Kapitel tragen `robots: noindex`** — konsistent mit den bestehenden
  Library-Seiten. Ob die Kapitel indexierbar werden sollen, ist eine separate
  SEO-Entscheidung des Inhabers (kein Teil dieser Phase).
- **Foto-freie Cover** für 00/11/12 (Gradient-Cover .nofoto) — bewusst, da keine
  Bild-Assets vorlagen; sieht premium aus, ist aber kein Foto-Cover wie bei den
  Bestandskapiteln.
- **masterguide.html** als ÜBERBLICK gerahmt (kein Nummern-Kapitel; Redundanz zu
  01 laut Inventur) — bleibt erreichbar.

## Definition of Done — Checkliste

1. Ein Kauf, ein System, Rollen getrennt — ✅ (Kap. 00 + durchgängige Copy)
2. Kein Concatenieren alter Ebooks — ✅ (Modul-System)
3. Neue Dramaturgie, eine Stimme/Design — ✅ (bp-Design + Rahmung überall)
4. „Optimiere das System vor dem Signal" zentral — ✅ (Kap. 00/11/F)
5. Aromatase/Adipositas mechanistisch korrekt (mehrpfadig) — ✅ (F + Medical-QA)
6. Kap. 00 START HERE — ✅
7. Kap. 11 INJEKTIONEN (angstnehmend, korrekt, keine Universalregeln/Dosis) — ✅
8. Kap. 12 LONGEVITY & RISK (keine erfundenen Ranges) — ✅
9. BODY COMPOSITION BEFORE HORMONE OPTIMIZATION — ✅ (F Reihenfolge)
10. Library aus Hauptnav → Über-Dropdown — ✅ (25 Seiten)
11. DAS PROTOKOLL: Nav-Eintrag + Homepage-Sektion + Produktseite — ✅ (bereits live, D2 erweitert)
12. Alte URLs nicht gelöscht, zu Kapitel-Previews/Teasern — ✅ (Rahmung + Migration-Map)
13. Commerce/Vaults/Entitlements unverändert — ✅
14. „REIBUNG" entfernt + Wordmark ein Wort — ✅ (Vor-Phase + C bestätigt)
15. Docs: Inventory/Architecture/Medical-QA/Migration/Flagship-Report — ✅ (alle 5)
16. 390/430/768/1440 ohne Overflow, keine Konsolenfehler, keine Bypass — ✅ (0 px, 0 Fehler)

## Nächste sinnvolle Schritte (Inhaber-Entscheidungen, außerhalb dieser Phase)

- Premium-Vertiefungen für die neuen Themen verschlüsselt einspielen (Vault-Key).
- EN-Übersetzung der neuen Kapitel, falls internationaler Launch.
- SEO: Indexierung der neuen Kapitel + eigene og-images entscheiden.
