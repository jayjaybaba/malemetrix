# SECURITY — Phase 9 Audit & Remediation

## Scan-Ergebnis (Repo + Git-Historie)

| Fund | Schwere | Status |
|---|---|---|
| Kein Provider-Secret (Anthropic/OpenAI/service_role/VAPID-private/PayPal-secret) im Client oder Repo | — | ✅ sauber (nur Doku-Beispiele wie `sk-ant-…`, `SERVICE_ROLE_KEY=<…>`) |
| **Delivery-Vault-Schlüssel in `js/checkout.js`** (`DELIVERY_VAULT` + `DK`) entschlüsselt zum Protokoll-Zugangscode | **P1 (Umsatzleck)** | Neutralisierungspfad gebaut (s. u.), Rotation vorbereitet |
| **Git-Historie:** `js/config.js` enthielt in `395c80f`/`267884e` `protokollAccessCode: "PROTOKOLL-M"` (Klartext) | **P1 (historisch, permanent)** | Kann nicht aus der Historie „entfernt" werden → Code muss rotiert werden |
| RLS auf allen Nutzer-Tabellen aktiv, Schreibpfade nur Service-Role | — | ✅ (Schema-Review; Live-Test = REQUIRES CONFIG) |

## Der P1 konkret

Der Delivery-Vault liefert nach einem client-seitigen PayPal-Capture den
Zugangscode auf der Bestellbestätigung an. Sein Schlüssel liegt (obfuskiert,
aber vollständig) in `checkout.js`. Ein technisch versierter Besucher kann ihn
extrahieren, den Vault entschlüsseln, den Protokoll-Code lesen und damit die
Premium-Inhalte (`protokoll.html`, `kurs-programm.html`) freischalten — **ohne
zu zahlen**. Zusätzlich steht ein noch älterer Code permanent in der
Git-Historie.

**Warum der Code nicht sofort im Repo entfernt/rotiert wurde:** Solange kein
Server (`mm-commerce` + Supabase) konfiguriert ist, ist der Client-Vault der
**einzige** Auslieferungsweg für PayPal-Käufer. Ein sofortiges Entfernen oder
Rotieren würde jeden aktuellen Kauf-Flow bzw. jeden Alt-Kunden aussperren
(§5: „Do not break existing customers"). Die Härtung ist daher als **sichere
Migration** gebaut, nicht als Hauruck-Löschung.

## Was Phase 9 bereits tut (ohne Server-Config)

1. **Server-Grant hat Vorrang:** Sobald `mm-commerce` konfiguriert ist und der
   Käufer angemeldet ist, verifiziert der Server die Zahlung und vergibt das
   Entitlement. `checkout.js` entschlüsselt den Client-Vault dann **gar nicht
   mehr** (`opts.serverGrant` ⇒ `deliveryCodes()` wird nicht aufgerufen);
   stattdessen erscheint „Zugang im Konto freigeschaltet". Damit ist der
   exponierte Pfad im Produktivbetrieb tot.
2. **Rotations-Werkzeug** `tools-dev/rotate-vault.mjs` erzeugt einen neuen,
   hochentropen Code (`MMX-xxxxxxxx-xxxxxxxx`) und die passenden Payloads.

## Founder-Sequenz zum endgültigen Retiren (Reihenfolge schützt Alt-Kunden)

1. Supabase + `mm-commerce` konfigurieren und deployen (COMMERCE.md).
2. **Alt-Kunden migrieren:** Bestandskäufer melden sich an und lösen ihren
   vorhandenen Code per „Zugang aktivieren" ein (`claimAccessCode`) → der
   Server vergibt ihr Entitlement. Ab jetzt kommt ihr Zugang aus dem Konto,
   nicht aus dem Client-Code. (Kommunikation per E-Mail, sobald Provider steht.)
3. **Rotieren:** `node tools-dev/rotate-vault.mjs _src/protokoll.html _src/kurs-programm.html`
   → neue Payloads in die Seiten einsetzen. `resolve-product-access` liefert
   den neuen Code nur an server-berechtigte Konten.
4. **Alt-Schlüssel entfernen:** `DELIVERY_VAULT` + `DK` aus `checkout.js`
   löschen (SW-Version bumpen). Der historische und der Client-Code sind damit
   wertlos — sie öffnen die rotierten Inhalte nicht mehr.
5. Verifizieren: Alt-Code entschlüsselt die neuen Payloads NICHT; server-
   berechtigtes Konto öffnet die Inhalte über `resolveProductAccess`.

**Rollback:** Bis Schritt 4 ist alles additiv — der alte Pfad bleibt bis zum
letzten Schritt funktionsfähig. Schlägt die Migration fehl, wird Schritt 3/4
zurückgehalten; kein Kunde verliert Zugang.

## Offene, config-abhängige Punkte (REQUIRES CONFIG)

Cross-User-RLS-Live-Test, PayPal-Live-Verifikation, VAPID-Rotation, CSP am
Live-Host — alle in ACTIVATION.md mit exaktem Founder-Schritt. Keiner ist
durch Code allein abschließbar; keiner wird als erledigt behauptet.
