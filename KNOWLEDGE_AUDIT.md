# KNOWLEDGE AUDIT (Phase 9.5, §9)

18 Objekte, 5 real verifizierte Landmark-Quellen (DOI+URL), Publikations-Gate
aktiv. **Nichts erfunden** — Objekte ohne aufgelöste Quelle stehen ehrlich als
REVIEWED und tragen öffentlich KEIN Zitat.

## Deckung je Objekt

| Objekt | Zustand | Aufgelöste Quelle |
|---|---|---|
| protein_target | **PUBLISHED** | Morton 2018, Br J Sports Med (10.1136/bjsports-2017-097608) |
| creatine | **PUBLISHED** | Kreider 2017, ISSN Position Stand (10.1186/s12970-017-0173-z) |
| testosterone_basics | REVIEWED | Bhasin 2018, JCEM (10.1210/jc.2018-00229) — Kern-Claim belegt |
| trt_context | REVIEWED | Bhasin 2018, JCEM |
| glp1_context | REVIEWED | Wilding/STEP-1 2021, NEJM (10.1056/NEJMoa2032183) |
| apob_lipids | REVIEWED | Mach/ESC-EAS 2019, Eur Heart J (10.1093/eurheartj/ehz455) |
| energy_balance, plateau, hypertrophy_volume, omega3, recovery_sleep, glucose_hba1c, kidney_markers, liver_markers, hematocrit_ctx, enhanced_monitoring, fatloss_rate, supplement_evidence | REVIEWED | — (kuratiert, Quelle noch nicht aufgelöst) |

**Deckung:** 2 PUBLISHED · 16 REVIEWED · 5 verifizierte Quellen.

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

Knowledge-Version `KV = 2`. Entscheidungs-Snapshots referenzieren die zum
Entscheidungszeitpunkt gültige Version → das Auflösen von Quellen schreibt
historische Begründungen nicht um.

## Nächster Schritt (Founder/Redaktion)

Die 16 REVIEWED-Objekte brauchen je 1–2 verifizierte Quellen (Leitlinie/
Meta-Analyse) für die PUBLISHED-Stufe. Priorität nach Nutzer-/Suchwert:
omega3, recovery_sleep, hypertrophy_volume, energy_balance, glucose_hba1c,
hematocrit_ctx. **Bis dahin bleibt der Zustand ehrlich REVIEWED** — kein
Objekt gibt vor, mehr belegt zu sein, als es ist.
