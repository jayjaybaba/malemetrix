# Growth OS — Feature-Status

Stand: 2026-07-21 (v2 nach Security-/Architektur-Audit) · Legende: ✅ fertig & getestet · 🟡 benötigt Konfiguration · 🔴 blockiert durch externe Genehmigung · ⚪ bewusst nicht gebaut (Begründung)

## Foundation
| Feature | Status |
|---|---|
| Geschützter Bereich `/admin/growth/` (Gate, noindex, robots) | ✅ |
| Local-first Datenmodell mit source/timestamp/verified je Kennzahl (§51/§73) | ✅ |
| Backup-Export/-Import, Komplett-Löschung (DSGVO §75) | ✅ |
| Audit-Log (§76) | ✅ |
| Mobile Quick Bar / iPhone-UX (§71) | ✅ |
| Design im MaleMetrix-Look, Admin-Code nur im Admin-Bereich (§69/§82) | ✅ |

## Analytics (Level 0 · Manual Mode)
| Feature | Status |
|---|---|
| TikTok-Studio-CSV-Import mit Mapping-Bestätigung, DE/EN-Header, Duplikat→Snapshot (§50) | ✅ |
| Manuelle Video-Anlage + Kennzahlen-Snapshots mit Verlauf | ✅ |
| Executive KPIs 7/30 Tage + Vergleichsperiode (§8) | ✅ |
| Follower-Conversion /1k Views (§30), Reward-Effizienz & RPM (§31/§33), QV-Quote + Diagnose (§32) | ✅ |
| Winner Detector normalisiert mit Begründung (§28) + Folge-Ideen ohne Kopieren (§29) | ✅ |
| What Works / What Doesn’t (Themen, Formate, Längen, Hooks; min. n=3) (§88/§89) | ✅ |
| Posting-Zeit-Learning (nur ab n=5/Bucket, keine Mythen) (§47/§97) | ✅ |
| Monatsziel/Target Mode mit Pace & Forecast, ohne Garantien (§92) | ✅ |

## Content Intelligence
| Feature | Status |
|---|---|
| Ideen-Pipeline mit 11 Status (§48) | ✅ (Statuswechsel per Dropdown; Drag&Drop bewusst weggelassen — mobil unzuverlässig) |
| Viral/Growth/Reward-Score mit Historien-Anpassung, Confidence, Begründung (§9/§84/§85) | ✅ |
| Opportunity Score, 5 Presets + Custom-Gewichte, versioniert (§10/§93) | ✅ |
| Do-Not-Produce mit Gründen (§38) | ✅ |
| Daily Opportunity Brief + Next Best Action + „Skript erzeugen“ (§37/§53) | ✅ |
| Recommendation Memory + Kalibrierung ab 5 Ergebnissen (§86/§87) | ✅ |
| Hook Lab: 10 Typen, Beispiele, First-5s-Selbstcheck, Empfehlung, Account-Learning (§21/§22/§12) | ✅ |
| Script Studio: 8 Modi mit Retention Map, Visual-Zeile je Block, CTA/Caption/Hashtags/Quellen, Kopieren (§13/§23/§24/§63) | ✅ |
| Medizinischer Risiko-Check LOW/REVIEW/HIGH + Quellen-Pflichtfeld (§54/§55) | ✅ |
| Search Opportunity Radar (manuelle Erfassung, Score, → Idee) (§14) | ✅ |
| Cluster-Abdeckung (§15/§16 vereinfacht als Coverage-Karten) | ✅ |
| Daily Missions (§39) | ✅ |

## Reward Engine
| Feature | Status |
|---|---|
| Pre-Publish-Check: 10 Checks, Compliance ≠ Eligibility getrennt (§57/§58) | ✅ |
| platform_rules mit Quelle + Verifikationsdatum + Freshness-Alarm (§94/§95) | ✅ (Startwerte als „unverifiziert“ markiert — Ural bestätigt sie im TikTok Studio) |
| Monetization Router: Content-Klassen + Warnungen (Sponsored ≠ Reward, Promote ≠ Qualified Views) (§36/§65) | ✅ |
| Reward-Import (Qualified Views, Vergütung) via CSV/Snapshot | ✅ |

## TikTok-API
| Feature | Status |
|---|---|
| OAuth-Worker v2: Passwort-Login → kurzlebige Server-Session (12 h, KV), KEIN Secret im Frontend/Repo/URL, CSRF-immun via Custom-Header, State-Replay-Schutz, atomare Refresh-Rotation, Parallel-Refresh-Lock — 35 automatisierte Tests + Browser-Integrationstest | 🟡 Code fertig & getestet — braucht TikTok-Developer-App + Worker-Deploy + `apiBase` in config.js (GROWTH-OS.md §6) |
| Profil + Account-Stats im Growth OS (Level 1) | 🟡 wie oben |
| Eigene Videoliste per Display API (Level 2) | 🟡 wie oben + Scope `video.list` im App-Review |
| Draft-Upload „An TikTok senden“ (Level 3) | 🔴 TikTok-Audit erforderlich — unauditierte Apps posten nur privat (offizielle Doku, geprüft 2026-07-20). UI zeigt das ehrlich an; kein Fake-Button. |
| Direct Post (Level 4) | 🔴 wie Level 3 |
| Creator-Rewards-Daten per API | ⚪ nicht möglich — TikTok bietet dafür keine öffentliche API; dauerhaft Studio-Import |

## Phase 2 (v2 — Audit-Nachrüstung)
| Feature | Status |
|---|---|
| Score-Stufenmodell 0–4: Daten-Gewicht wächst mit n (bis 60 %), Kalibrierung erhöht es weiter (bis 75 %); Stage + Gewichte an jeder Idee sichtbar | ✅ |
| Geschlossener Feedback-Loop: Prognose wird bei READY/PUBLISHED/Verknüpfung automatisch eingefroren → Ergebnis-Vergleich → Kalibrierung wirkt auf künftige Scores zurück | ✅ |
| Breakout-Detektor aus Snapshot-Velocity (lokal, ehrliche Mindest-Datenbasis) | ✅ |
| API-Snapshot-Merge (Level 2): Videoliste per Display API als Snapshots in lokale Videos | ✅ (nach Worker-Setup) |
| Schnell-Import Suchbegriffe (Bulk, Creator Search Insights/Google Trends abtippen) | ✅ |
| Research-Radar via PubMed E-Utilities (offizielle freie API, serverseitig) | 🟡 nach Worker-Setup + Anmeldung |
| Creator-Watchlist (§19, manuell — Lücke → Idee) | ✅ |
| Cloud-Sync geräteübergreifend (D1, Push/Pull mit Bestätigung) | 🟡 Worker + D1-Binding (GROWTH-OS.md §6b) |
| Tägliche Auto-Snapshots per Cron → D1-Zeitreihen (`schema.sql` v1) | 🟡 wie oben + Cron-Trigger |

## KI (optional)
| Feature | Status |
|---|---|
| Skript-/Hook-Entwürfe (markiert als KI-VORSCHLAG) | 🟡 `config.js → growth.ai` (Proxy-Endpoint empfohlen); ohne Konfiguration kein Button |
| Screenshot-Import per Vision | ⚪ nicht gebaut — erfordert serverseitigen Endpoint; ohne ihn wäre es ein API-Key im Browser. Kann nach Worker-Setup ergänzt werden. |

## Bewusst NICHT gebaut (§98)
Auto-Likes/-Kommentare/-Follows, Engagement-Bots, Fake-Views, Geo-/VPN-Manipulation,
Scraper fremder Plattformen — gefährden Account & Monetarisierung und sind
nicht Teil dieses Systems. Kommentar-Arbeit bleibt manuell (Missions §39/§40).
