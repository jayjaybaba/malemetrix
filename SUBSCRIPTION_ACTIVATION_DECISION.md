# SUBSCRIPTION ACTIVATION DECISION (Phase 9.5, §7.4)

**Kein erfundenes Pricing.** Diese Datei sagt, WAS gemessen werden muss, bevor
ein Abo aktiviert wird — und wie der Schalter aussieht.

## Fähigkeiten mit laufenden Grenzkosten

| Fähigkeit | Laufende Kostenquelle | Kandidat fürs Abo? |
|---|---|---|
| FORESIGHT / REPORTS | Server-KI-Sprachschicht (optional), Cloud-Compute | ja |
| ADVISOR (KI-verstärkt) | KI-Anfragen | ja (deterministischer Advisor bleibt frei) |
| Push-Lieferung | Scheduler + Edge-Function-Runs | teilweise |
| Cloud-Sync/Storage | Supabase | gering, Basisnutzen |
| PROGRAM / TRACKING / PROGRESS | keine laufenden (lokal-first) | **nein — bleibt Einmalkauf** |

Geschätzte Grenzkosten (BUSINESS-MODEL.md §2): LIGHT < 0,05 €/M, ACTIVE
0,15–0,30 €/M, POWER 0,60–1,20 €/M — dominiert von KI-Anfragen.

## Kandidaten-Grenze (Modell E, technisch vorbereitet)

- Einmalkauf **PROTOKOLL** = Programm + deterministische Intelligenz, dauerhaft
  (`LEGACY_LIFETIME`, Grandfathering garantiert).
- Optionales **Intelligence-Membership** = die laufend teuren Fähigkeiten
  (KI-Sprachschicht, Push, Cloud-Reports) — nur falls Daten zeigen, dass Nutzer
  den laufenden Wert erleben.

Schalter: `js/os/entitlements.js` → `SUBSCRIPTION_GATED = ["FORESIGHT","REPORTS","ADVISOR"]`
(heute `[]`). Alt-Käufer bleiben via `LEGACY_LIFETIME` in `can()` live — durch
Test abgesichert (Phase 9: „gekündigtes Abo entzieht Legacy-Käufer nichts").

## Was VOR der Preis-Aktivierung gemessen sein muss

1. Erleben Käufer den laufenden Wert? → Proof-Moment-Rate, Weekly-Review-Rate der ersten 100.
2. Reale KI-Kosten pro aktivem Nutzer (nach Provider-Aktivierung + Eval-Lauf).
3. Zahlungsbereitschaft für laufende Intelligenz (qualitativ + Preis-Test-Architektur).
4. Retention bezahlter Nutzer über ≥8 Wochen.

**Ohne diese Daten wird kein Abo eingepreist** (§7.4/§28: „No fake unit economics").
