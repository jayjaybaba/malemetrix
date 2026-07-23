-- ===========================================================================
-- PHASE 10 / P0.5 — SERVICE-ROLE-GRANTS VERSIONIEREN
--
-- WARUM DIESE MIGRATION EXISTIERT:
-- Der erfolgreiche PayPal-LIVE-E2E-Test (1,00 €, Juli 2026) funktionierte erst,
-- nachdem diese Rechte MANUELL im Supabase-Dashboard gesetzt wurden — die Edge
-- Function mm-commerce (Service-Role-Client) bekam vorher "permission denied"
-- beim Schreiben von orders/entitlements. Manuelle Dashboard-Änderungen sind
-- kein reproduzierbares Deployment; ein frisches Environment würde denselben
-- Live-Bug erneut produzieren. Deshalb hier idempotent versioniert.
--
-- WARUM DIESE GRANTS NÖTIG SIND (Least Privilege, pro Edge Function):
--   mm-commerce            → orders (select/insert/update: Order-first-
--                            Fulfillment + Replay-Lookup), entitlements
--                            (select/insert/update: idempotenter Upsert),
--                            commerce_events (select/insert: Audit),
--                            subscriptions + subscription_events (Abo-Pfad).
--   resolve-product-access → entitlements (select: Entitlement-Check).
--   mm-ai                  → ai_request_log (select/insert: Rate-Limit + Log).
--   send-brief             → push_subscriptions (select/update: Revoke bei 410),
--                            push_delivery_log (select/insert/update: Dedup).
-- KEIN delete: keine Funktion löscht Zeilen. Aufbewahrung (Orders/Audit) bleibt
-- dadurch strukturell geschützt; Account-Löschung läuft über auth.admin +
-- FK-Verhalten (on delete cascade / set null), nicht über Tabellen-DELETEs.
--
-- SICHERHEITSMODELL (unverändert, hier nur dokumentiert):
--   · RLS bleibt auf ALLEN Tabellen aktiv. service_role umgeht RLS by design
--     (BYPASSRLS) — genau deshalb leben Service-Role-Keys NUR in Edge-Function-
--     Secrets, nie im Client, nie im Repo, nie in Logs.
--   · authenticated wird durch RLS gestoppt: Es existieren KEINE insert/update/
--     delete-Policies auf diesen Tabellen (nur select auf die eigene user_id,
--     wo dokumentiert). Selbst wenn Plattform-Default-Grants Tabellenrechte
--     vergeben, blockt RLS ohne Policy jeden Client-Write: Entitlements/Orders
--     können clientseitig nicht erzeugt oder verändert werden.
--   · commerce_events / subscription_events / ai_request_log / push_delivery_log
--     haben keinerlei Policies für authenticated → reine Server-Tabellen.
-- ===========================================================================

-- Basis: Schema-Zugriff (idempotent; in Standard-Supabase-Projekten bereits
-- vorhanden, hier explizit für reproduzierbare Environments).
grant usage on schema public to service_role;

-- Commerce (mm-commerce)
grant select, insert, update on table public.orders               to service_role;
grant select, insert, update on table public.entitlements         to service_role;
grant select, insert         on table public.commerce_events      to service_role;
grant select, insert, update on table public.subscriptions        to service_role;
grant select, insert         on table public.subscription_events  to service_role;

-- Zugriffsauflösung (resolve-product-access): nur lesen.
-- (entitlements select ist oben bereits enthalten.)

-- KI-Sprachschicht (mm-ai)
grant select, insert on table public.ai_request_log to service_role;

-- Push-Versand (send-brief)
grant select, update          on table public.push_subscriptions to service_role;
grant select, insert, update  on table public.push_delivery_log  to service_role;

-- Identity-Spalten (generated always as identity) ziehen intern Sequenzen —
-- ohne usage/select darauf schlägt jeder Insert fehl. Bewusst pauschal für
-- public-Sequenzen: Sequenzen tragen keine Nutzdaten, das Risiko ist minimal,
-- und neue Tabellen brechen nicht still.
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

-- ---------------------------------------------------------------------------
-- VERIFIKATION (nicht Teil der Migration — im SQL-Editor ausführbar):
--   select grantee, table_name, privilege_type
--     from information_schema.role_table_grants
--    where grantee in ('service_role','authenticated')
--      and table_schema = 'public'
--      and table_name in ('orders','entitlements','commerce_events',
--                         'subscriptions','subscription_events')
--    order by table_name, grantee, privilege_type;
-- Erwartung: authenticated hat hier höchstens SELECT (RLS-beschränkt auf die
-- eigene user_id), service_role exakt die oben vergebenen Rechte.
-- ---------------------------------------------------------------------------
