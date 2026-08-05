# KNOWLEDGE AUDIT (§9 · Stand 05.08.2026)

18 Objekte, 10 real verifizierte Landmark-Quellen (DOI+URL), Publikations-Gate
aktiv. **Nichts erfunden** — Objekte ohne aufgelöste Quelle stehen ehrlich als
REVIEWED und tragen öffentlich KEIN Zitat.

## Deckung je Objekt

| Objekt | Zustand | Aufgelöste Quelle |
|---|---|---|
| protein_target | **PUBLISHED** | Morton 2018, Br J Sports Med (10.1136/bjsports-2017-097608) |
| creatine | **PUBLISHED** | Kreider 2017, ISSN Position Stand (10.1186/s12970-017-0173-z) |
| recovery_sleep | **PUBLISHED** (05.08.) | Watson 2015 (10.5664/jcsm.4758) · Nedeltcheva 2010 (10.7326/0003-4819-153-7-201010050-00006) · Drake 2013 (10.5664/jcsm.3170) — alle Claims belegt |
| testosterone_basics | **PUBLISHED** (05.08.) | Bhasin 2018 (10.1210/jc.2018-00229) · Leproult 2011 (10.1001/jama.2011.710) — alle Claims belegt |
| omega3 | **PUBLISHED** (05.08.) | Mach/ESC-EAS 2019 (10.1093/eurheartj/ehz455), Triglyceride + zurückhaltender Endpunkt-Kontext — beide Claims belegt |
| trt_context | REVIEWED | Bhasin 2018, JCEM (trt3 Fertilität noch offen) |
| glp1_context | REVIEWED | Wilding/STEP-1 2021, NEJM (10.1056/NEJMoa2032183) — g2/g3 noch offen |
| apob_lipids | REVIEWED | Mach/ESC-EAS 2019 (ab3 Anabolika-Kontext noch offen) |
| hypertrophy_volume | REVIEWED | Schoenfeld 2017 (10.1080/02640414.2016.1210197); hv3 ist bewusst REAL_WORLD_LIMITED-Heuristik → nicht als Leitlinie belegbar |
| energy_balance, plateau, glucose_hba1c, kidney_markers, liver_markers, hematocrit_ctx, enhanced_monitoring, fatloss_rate, supplement_evidence | REVIEWED | — (kuratiert, Quelle noch nicht aufgelöst) |

**Deckung:** 5 PUBLISHED · 13 REVIEWED · **10 verifizierte Quellen**
(05.08.2026: +Nedeltcheva 2010, +Leproult 2011, +Drake 2013 — jede vor dem
Eintrag im Web gegen DOI/Venue geprüft).

## Publikations-Gate (§29)

- **PUBLISHED**: alle Kern-Claims tragen aufgelöste Quellen → darf öffentlich als
  „Evidenz" mit Zitat erscheinen (Learn zeigt es).
- **REVIEWED**: kuratiert, teils/nicht extern belegt → intern nutzbar, öffentlich
  ohne autoritatives Zitat. `citations()` gibt für unbelegte Objekte `[]` zurück
  (durch Test erzwungen: keine Zitation ohne echte url/doi).
- **STALE**: `reviewedAt` älter als 365 Tage.

## Evidenz-Trennung (§28)

Evidenztypen pro Claim: STRONG / MODERATE / EMERGING / REAL_WORLD_LIMITED /
MECHANISTIC / EXPERIMENTAL. Heuristiken (z. B. „Execution First unter 70 %
Umsetzung") sind als REAL_WORLD_LIMITED markiert und werden **nie** als
Leitlinie ausgegeben.

## Versionierung (§30)

Knowledge-Version `KV = 3`. Entscheidungs-Snapshots referenzieren die zum
Entscheidungszeitpunkt gültige Version → das Auflösen von Quellen schreibt
historische Begründungen nicht um.

## Nächster Schritt (Founder/Redaktion)

Am 05.08.2026 wurden **omega3, recovery_sleep und testosterone_basics** auf
PUBLISHED gehoben (3 neue web-verifizierte Quellen). Verbleibende Priorität
nach Nutzer-/Suchwert für die 13 REVIEWED-Objekte:

- **glucose_hba1c** (2 STRONG-Claims, gut belegbar — ADA-Standards + Trainings-/
  Insulinsensitivitäts-Meta) und **kidney_markers** (KDIGO 2012 + Cystatin-C-
  Referenz) sind die nächsten sauberen PUBLISHED-Kandidaten.
- **glp1_context** braucht für g2/g3 die STEP-1-Körperkomposition- bzw.
  Ruhepuls-Auswertung; **hematocrit_ctx** eine Erythropoese-Quelle (z. B.
  Coviello 2008).
- **hypertrophy_volume, plateau, fatloss_rate, enhanced_monitoring** enthalten
  je einen bewusst als REAL_WORLD_LIMITED markierten Heuristik-Claim — diese
  dürfen **nicht** mit einer Leitlinie belegt werden (das würde eine Heuristik
  als Evidenz ausgeben) und bleiben daher regelkonform REVIEWED.

**Verfahren bleibt bindend:** jede Quelle vor dem Eintrag im Web gegen DOI und
Venue prüfen; ein Claim wird nur belegt, wo die Quelle genau ihn stützt. Kein
Objekt gibt vor, mehr belegt zu sein, als es ist.
