# Web Push — ehrliche Status-Klassifikation (Phase 6)

## Was HEUTE funktioniert (ohne weitere Konfiguration)
- **Reminder-Engine** (`js/os/execution.js`): Wert-Filter (nur actionable, nie
  für Erledigtes), Dedup pro Tag, Quiet Hours, max. N/Tag, Eskalation genau 1×.
- **Lokale System-Notifications**, solange die App/der Tab geöffnet ist
  (`Notification` + `registration.showNotification`), inkl. Privacy-Modus
  (FULL / DISCREET / OFF) und Deep-Link via `notificationclick` im SW.
- **Permission-UX**: Opt-in zuerst in den Einstellungen (Wert vor Permission),
  erst danach der Browser-Prompt. Nie beim ersten Seitenaufruf.

## Was CODE COMPLETE, aber CONFIG REQUIRED ist (Server-Push bei geschlossener App)
| Baustein | Status |
|---|---|
| SW `push`-Handler mit Privacy-Contract (`sw.js`) | CODE COMPLETE |
| SW `notificationclick` → exakte Aktion | CODE COMPLETE |
| Client-Subscription (`MM.exec.subscribePush`, gated auf `MM_CONFIG.VAPID_PUBLIC_KEY`) | CODE COMPLETE |
| Tabelle `push_subscriptions` (Migration 0004, RLS) | CODE COMPLETE |
| VAPID-Keypair (Public im Client-Config, Private als Supabase Secret) | **CONFIG REQUIRED** |
| Edge Function `send-reminders` (webpush-Versand) | **NOT IMPLEMENTED** (bewusst — ohne Keys nicht testbar; kein Fake-Deploy) |
| Scheduler (pg_cron oder externer Cron → Edge Function) | **CONFIG REQUIRED** |

## Aktivierungspfad (wenn Config vorhanden)
1. VAPID-Keys generieren (`npx web-push generate-vapid-keys`).
2. Public Key in `js/config.js` als `MM_CONFIG.VAPID_PUBLIC_KEY` eintragen;
   Private Key als Supabase Secret (`supabase secrets set VAPID_PRIVATE_KEY=…`).
3. Edge Function `send-reminders` implementieren: liest fällige Aktionen
   (Server kennt `os_state`-Domains + `push_subscriptions`), respektiert
   `quiet_from/quiet_to` + `privacy` pro Subscription, sendet Payload-Contract
   `{title, body, deepLink, tag, privacy}`.
4. Scheduler: alle 15 min. `send-reminders` aufrufen.
5. Client zeigt danach in den Einstellungen `pushStatus().state === "ready"`.

## Nicht-Verhandelbares
- Kein Secret im Client. Keine vorgetäuschten Push-Zusagen in der UI:
  `MM.exec.pushStatus()` sagt dem Nutzer wahrheitsgemäß, was geht.
- Notification-Inhalt respektiert IMMER den Privacy-Modus; sensible Inhalte
  (Labs/Enhanced) erscheinen nie im Sperrbildschirm-Volltext per Default.
