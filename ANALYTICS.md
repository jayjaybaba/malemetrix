# ANALYTICS — Generation 2 (anonyme Funnel-Events)

System: bestehendes `js/analytics.js` (`MM.track`) — lokal zählend, mit
optionalem Plausible (`MM_CONFIG.analytics.plausibleDomain`; derzeit leer →
nur lokal). Es wurde KEIN neues Analytics-System gebaut.

## Gen-2-Events (alle ohne Gesundheits-/Personendaten)

Funnel: `transform_goal_selected`* · `transform_plan_questions_start`* ·
`transform_plan_preview_view`* · `check_completed`* (Bestand) ·
`simple_app_opened` · `plan_questions_started` · `plan_questions_completed` ·
`plan_preview_seen` · `simple_unlock_cta` · `plan_activated` · `plan_created`

Migration: `migration_started` · `migration_succeeded` · `migration_warning` ·
`legacy_fallback_activated`

Nutzung: `today_opened` · `workout_started` · `workout_completed` ·
`day_closed` · `weekly_check_started` · `weekly_check_completed` ·
`plan_adjusted` · `plan_kept` · `program_completed`

iPhone: `iphone_setup_opened` · `calendar_feed_created` ·
`calendar_subscribe_started` · `calendar_export_done` · `pwa_help_opened` ·
`shopping_copied` · `shopping_shared` · `reminders_copied` · `notes_copied` ·
`notes_shared`

(* Bestands-Events der Transformation/des Scores, unverändert.)

## Nicht übertragen (Invariante, §31)

Gewicht, Größe, Taille, Kalorien, Protein, Diagnosen, Score-Antworten,
konkrete Zielwerte, Essenspräferenzen, Bilddaten, E-Mail-Adressen,
Inhalte aus Legacy-Snapshots. Alle Gen-2-Events werden ohne Properties
oder nur mit groben Kategorien gesendet — dieselbe Regel wie die bestehende
Score-Invariante (§91.23). `push aktiviert` existiert bewusst noch nicht
(Push ist nicht aktiv — kein Fake-Event).
