# PREMIUM ACCESS AUDIT — Phase 10 / P1 + P4.1

Stand: 2026-07-23 · Methode: Repo-Analyse + LIVE-Abrufe (curl gegen
https://www.malemetrix.com), nicht vermutet.

## Ergebnis in einem Satz

**Es wurde kein Weg gefunden, bezahlte Inhalte ohne Entitlement im Klartext zu
lesen** — Premium-Inhalte liegen client- UND live-seitig ausschließlich als
AES-256-GCM-Ciphertext vor; das Schlüsselmaterial gibt es nur serverseitig
gegen ein aktives Entitlement (resolve-product-access) oder über einen
gültigen Legacy-Zugangscode (der selbst der Schlüssel ist).

## Geprüfte Bypass-Hypothesen (alle real getestet)

| # | Hypothese | Befund |
|---|---|---|
| 1 | „Premium-HTML ist ausgeliefert, UI versteckt es nur" | **NEIN.** `ebooks/protokoll.html` live: 0 Klartext-Kapitel (`bp-h1`-Marker), nur `protoVault`-Ciphertext. Gleiches Muster master-ebook (3 Slots), ultimate-stack, intern.html. |
| 2 | 12-Wochen-Programm im Klartext in JS/HTML | **NEIN.** Programm-Inhalt (`MM_COURSE`) steckt komplett im verschlüsselten `courseVault`-Payload (kurs-programm.html, live verifiziert: `ct:`-Blob, 0 Treffer für Klartext-Wochenpläne). Die JS-Dateien enthalten nur Engine-Logik, keine Premium-Texte. |
| 3 | localStorage-Manipulation schaltet Inhalte frei | **Nur UI, nicht Inhalt.** `hasAccess()` liest clientseitige Entitlement-Spiegel — manipulierbar, öffnet aber nur Oberflächen. Die Entschlüsselung braucht Material aus `resolve-product-access`, und der Server prüft das Entitlement dort NOCHMAL gegen die DB (`eq("user_id", uid)`, RLS-unabhängig, service-seitig). |
| 4 | Schlüssel/Codes im Repo oder in Assets | **NEIN.** `tools-dev/vault.mjs`/`rotate-vault.mjs` nehmen Schlüssel nur per CLI-Argument; Grep über js/, tools-dev/, *.md fand keine Code-Literale. Vault-Secrets leben als Function-Secrets (PROTOCOL_VAULT_KEY, TWELVE_WEEK_VAULT_KEY). |
| 5 | Entitlements clientseitig erzeugbar | **NEIN.** RLS: `entitlements` hat nur eine SELECT-Policy (eigene user_id); Writes ausschließlich Service-Role (mm-commerce, Claim-RPC). Seit P10 zusätzlich Claim-Schutz gegen Fremd-Captures. |
| 6 | Alte Zugangscodes als Backdoor | **Begrenzt by design.** Legacy-Codes SIND der Entschlüsselungs-Schlüssel (PBKDF2 150k → AES-GCM). Serverseitig sind sie gehasht (`access_codes.code_hash`, max_uses). Restrisiko: ein einmal geteilter Code entschlüsselt clientseitig weiter (Krypto kennt kein Revoke) → bei Missbrauch: Vault-Rotation (`tools-dev/rotate-vault.mjs`), dokumentiert. |
| 7 | `?code=`-URL-Einstieg (kurs-programm) leakt | **Gering.** Code wird sofort per `history.replaceState` aus der URL entfernt; er landet aber potenziell in Browser-History/Server-Logs des Referrers. Einstufung P3 — mittelfristig auf reinen Eingabefluss umstellen. |

## Asset-Rollen (P4.1 — jede Datei hat genau eine Rolle)

| Asset | Rolle | Gate | Verifiziert |
|---|---|---|---|
| `ebooks/protokoll.html` | **PAID** (DAS PROTOKOLL, 49 €) | Vault `protoVault` + Entitlement `protocol` | live: nur Ciphertext |
| `kurs-programm.html` (12-Wochen-Programm) | **PAID** | Vault `courseVault` + Entitlement `twelve_week` (Legacy-Code-Fallback) | live: nur Ciphertext |
| `ebooks/master-ebook.html` | **PAID** (3 Vault-Slots) | `masterVaultMaster/Proto/Stack` | Repo: nur Ciphertext |
| `ebooks/ultimate-stack.html` | **PAID** | `stackVault` | Repo: nur Ciphertext |
| `intern.html` | **ACCOUNT/INTERN** | `internVault` | Repo: nur Ciphertext |
| 13 freie Ebooks (testosteron, schlaf-energie, glp1, blutwerte-guide, …) | **FREE** (SEO/Vertrauen) | keins — bewusst | Klartext, gewollt |
| `ebooks/files/MaleMetrix_Schlaf-Stack.pdf` | **LEAD MAGNET** | keins (direkt abrufbar, 200) | gewollt; kein bezahlter Inhalt |
| Tracker / Tools / Score | **FREE** | keins | gewollt |

Keine Pseudo-Paywall gefunden: Alles, was bezahlt aussieht, ist kryptografisch
gated; alles Freie ist bewusst frei.

## Ehrliche Grenzen (keine falschen Häkchen)

1. **Client-Krypto-Grenze:** Ein zahlender Kunde erhält zwangsläufig
   Schlüsselmaterial im Browser und kann entschlüsselten Inhalt kopieren/
   weitergeben (wie bei jedem PDF-Verkauf). Das Schutzziel ist „kein Zugriff
   ohne Kauf/Code", nicht DRM.
2. **Legacy-Codes:** kryptografisch nicht widerrufbar (nur per Rotation).
   Neuverkäufe laufen ausschließlich über Entitlements — Codes sind Bestand.
3. **UI-Gates ohne Kryptografie** (z. B. OS-Ansichten mit `hasAccess()`):
   schützen nur Oberfläche/Komfortfunktionen, KEINE Premium-Texte. Alle
   Premium-Texte liegen in Vaults. Das ist der dokumentierte Ist-Zustand —
   keine Behauptung, UI-Gates seien Sicherheit.

## Migrationsplan (mittel-/langfristig)

- P3: `?code=`-Einstieg entfernen → nur Eingabefeld (kein URL-Artefakt).
- P3: Vault-Rotationslauf nach Missbrauchsverdacht dokumentiert durchspielen.
- P4: Optional serverseitige Auslieferung (signierte, kurzlebige URLs) statt
  eingebetteter Ciphertexte, falls Inhalte deutlich wachsen — aktuell nicht
  nötig, Payload-Größen sind beherrschbar.
