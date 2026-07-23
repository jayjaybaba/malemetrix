# BUSINESS MODEL — Analyse & Entscheidung (Phase 9, §9/§23/§59/§60)

> Alle Zahlen unten sind **ANNAHMEN** (Szenarien), außer explizit als ACTUAL markiert.
> Es liegen noch keine echten Funnel-/Zahlungsdaten vor (Analytics REQUIRES CONFIG).

## 1. Ausgangslage (ACTUAL)

- Aktuelles Angebot: **DAS PROTOKOLL 49 € einmalig** (schaltet das komplette
  System frei, inkl. laufender Intelligenz/Foresight) + **1:1 Coaching 149 €/Monat**.
- Laufende Grenzkosten pro aktivem Nutzer: Supabase (Sync/DB), optional KI
  (mm-ai), Push, Speicher. Bei einem **Einmalpreis** wachsen die kumulierten
  Kosten mit der Nutzungsdauer, der Umsatz nicht.

## 2. AI-Kostenökonomie (§23 — ANNAHMEN, Modell-Preise Stand 2026-07)

Task-Routing (mm-ai): günstige Modelle für kurze Synthese, teurere nur für
Advisor/Vergleich. Grobe Schätzung pro Anfrage (input+output, gecacht wo möglich):

| Nutzertyp | KI-Anfragen/Monat | ~Kosten/Monat |
|---|---|---|
| LIGHT (öffnet Today, selten Advisor) | ~10 | < 0,05 € |
| ACTIVE (wöchentliches Review, Advisor) | ~40 | ~0,15–0,30 € |
| POWER (täglich, viele Advisor-Fragen) | ~150 | ~0,60–1,20 € |

Dazu Supabase/Push/Storage: grob 0,05–0,20 €/aktiver Nutzer/Monat.
**Deterministik bleibt Default** — ohne KI-Config fallen diese Kosten weg, das
Produkt funktioniert vollständig. Das begrenzt das Kostenrisiko strukturell.

**Kernbefund:** Ein POWER-Nutzer verursacht ~1–1,50 €/Monat laufende Kosten.
Über 24 Monate sind das ~24–36 € — bei 49 € Einmalpreis bleibt nach
Zahlungsgebühren (~1,50 €) und Kosten eine schrumpfende Marge. **Ein
KI-schweres Produkt dauerhaft für einen Einmalpreis ist strukturell fragil**
(§60). Für LIGHT/ACTIVE-Nutzer trägt der Einmalpreis dagegen bequem.

## 3. Modellvergleich (§9)

| Modell | Erwartung | Friktion | LTV | Kosten-Alignment | Positionierung |
|---|---|---|---|---|---|
| A · 49 € Lifetime | einfach, fair | niedrig | niedrig | **schlecht** bei KI-Heavy | „ehrlich, kein Abo" |
| B · Free + PRO-Abo | SaaS-üblich | hoch (Abo-Hürde) | hoch | gut | „laufende Intelligenz" |
| C · Einmal-Programm + Intelligence-Abo | fair + laufend | mittel | hoch | **gut** | „Programm gehört dir, Intelligenz mietest du" |
| D · Jahres-Mitgliedschaft | planbar | mittel | mittel-hoch | gut | „Jahresbegleitung" |
| E · Hybrid: Protokoll einmalig + optionales Intelligence-Membership | fair, opt-in | niedrig-mittel | mittel-hoch | **gut** | „Basis kaufen, Intelligenz optional abonnieren" |

## 4. ENTSCHEIDUNG (Architektur, nicht Preis-Fiktion)

**Gewählte Architektur: Modell E (Hybrid), technisch vorbereitet — Preis-Aktivierung
erst mit echten Funnel-Daten.**

Begründung:
- Respektiert die bisherige ehrliche Positionierung („kein Zwangs-Abo"): das
  **Protokoll bleibt ein einmaliger Kauf** und schaltet Programm + deterministische
  Intelligenz frei. Bestehende Käufer werden nie herabgestuft (§14 Grandfathering,
  `LEGACY_LIFETIME`).
- Die **laufend teuren, laufend wertvollen** Fähigkeiten (server-KI-Sprachschicht,
  Push-Lieferung, Cloud-Reports) können später an ein optionales
  **Intelligence-Membership** gebunden werden — der Schalter dafür ist gebaut
  (`MM.entitlements` → `SUBSCRIPTION_GATED`, heute leer = alles aus dem Kauf),
  die Billing-Zustandsmaschine (`MM.billing`) + Schema (Migration 0008) stehen.
- **Nicht aktiviert**, weil es unredlich wäre, ein Abo einzupreisen, bevor
  gemessen ist, ob Nutzer den laufenden Wert überhaupt erleben (§9: „Do not
  invent pricing merely because SaaS usually uses subscriptions").

**Founder-Aktivierungsschritt (wenn Daten es stützen):** `SUBSCRIPTION_GATED`
in `js/os/entitlements.js` auf `["FORESIGHT","REPORTS","ADVISOR"]` setzen,
Abo-Produkt im Provider anlegen, Preis in `config`/Pricing-Seiten eintragen.
Alt-Käufer behalten via `LEGACY_LIFETIME` vollen Zugriff.

## 5. Unit Economics (§59 — editierbare Szenarien, ANNAHMEN)

Eingaben (monatlich, anpassbar):

| Eingabe | CONSERVATIVE | BASE | AGGRESSIVE |
|---|---|---|---|
| Besucher | 2.000 | 5.000 | 15.000 |
| Score-Completion | 15 % | 25 % | 35 % |
| Score→Account | 8 % | 15 % | 25 % |
| Account→Paid (Protokoll) | 3 % | 6 % | 10 % |
| Protokoll-Preis | 49 € | 49 € | 49 € |
| Intelligence-Abo-Take (Modell E, später) | 0 % | 10 % | 20 % @ 9 €/M |
| Zahlungsgebühr | ~3 % + 0,35 € | " | " |
| Grenzkosten/aktiver Nutzer | 0,20 € | 0,30 € | 0,60 € |
| Coaching-Conversion | 0,3 % | 0,8 % | 1,5 % @ 149 € |

Beispiel-Rechnung BASE (illustrativ, nicht Realität):
- Zahlende Protokoll-Käufer/Monat ≈ 5.000 × 0,25 × 0,15 × 0,06 ≈ **11**.
- Protokoll-Umsatz ≈ 11 × 49 € ≈ **539 €/Monat** (Einmalzahlungen, nicht MRR).
- Coaching ≈ 5.000 × 0,008 ≈ 40 Leads → wenige Abschlüsse × 149 € (kapazitäts-
  begrenzt, §46).
- Intelligence-Abo (später, 10 % von Käuferbasis @ 9 €) baut die einzige echte
  MRR-Komponente auf.

**Ehrliche Schlussfolgerung:** Ohne wiederkehrende Komponente ist MaleMetrix ein
Einmalumsatz-Produkt mit Coaching-Oberkante. Modell E ist der risikoärmste Weg
zu MRR, ohne die Ehrlichkeit oder Alt-Kunden zu opfern — **aber die Aktivierung
gehört hinter echte Nutzungsdaten, nicht davor.**

## 6. Gross Margin / LTV / CAC (ANNAHMEN)

- Protokoll-Marge ≈ 49 € − 1,80 € Gebühr − (Nutzungsdauer × Grenzkosten). Für
  LIGHT/ACTIVE > 90 %; für POWER über 2+ Jahre fallend.
- LTV ohne Abo ≈ Protokoll-Marge (+ ggf. Coaching). Mit Modell E deutlich höher.
- CAC-Decke = LTV − Zielmarge; ohne echte Conversion-Daten **nicht seriös
  bezifferbar** → als Hypothese behandeln, nach dem Beta messen.
