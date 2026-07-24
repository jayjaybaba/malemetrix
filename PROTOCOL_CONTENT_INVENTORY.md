# PROTOCOL CONTENT INVENTORY — Phase 16/A

Methode: vollständiger Repo-Scan (Dateigrößen, Kapitel-Marker `bp-h1`/`bp-part-no`,
Vault-Slots `"ct":"`), plus Begriffs-Grep (glp/schlaf/blut/testosteron/stack/…).

## HARTE RANDBEDINGUNG (bestimmt die gesamte Architektur)

Die drei Premium-Werke liegen im Repo **ausschließlich verschlüsselt** vor
(AES-256-GCM; Schlüssel = Supabase-Function-Secrets bzw. Kunden-Codes, NICHT
in dieser Umgebung verfügbar):

| Datei | Größe | Slots |
|---|---|---|
| ebooks/protokoll.html | 230 KB | protoVault |
| ebooks/master-ebook.html | 442 KB | masterVaultMaster/Proto/Stack |
| ebooks/ultimate-stack.html | 208 KB | stackVault |

⇒ Ein redaktionelles NEU-Schreiben dieser Kerninhalte ist hier technisch
unmöglich (Klartext nicht lesbar). Der Premium-Kern bleibt bestehen; die
Neuordnung passiert über **Architektur, Rahmung, neue Kapitel und die
Integration der Klartext-Inhalte** — nicht über Entschlüsseln/Concatenieren.
Alles, was NEU als Premium verschlüsselt werden soll, braucht einen manuellen
Schritt des Inhabers (tools-dev/vault.mjs + PROTOCOL_VAULT_KEY).

## VOLLSTÄNDIGE QUELLENTABELLE

| Quelle | Thema | Umfang | Zustand | Rolle in DAS PROTOKOLL 2.0 |
|---|---|---|---|---|
| ebooks/protokoll.html (Vault) | Gesamtsystem-Erklärwerk | 230 KB enc | PAID, bp-Design, live | **Premium-Kern, bleibt** — wird Modul-Hub-Ziel |
| ebooks/master-ebook.html (3 Vaults) | Master + Proto + Stack kombiniert | 442 KB enc | PAID | bleibt als Legacy-Zugang; im neuen Index als „Gesamtausgabe" geführt, kein separater Verkauf |
| ebooks/ultimate-stack.html (Vault) | Ultimate Stack | 208 KB enc | PAID | **Kapitel 08 DER ULTIMATIVE STACK** (Premium-Ziel) |
| ebooks/taeglich-trainieren.html | Jeden Tag trainieren | 51 KB, 16 Kap. | FREE Klartext | Kapitel 03 — Klartext-Basis; alte URL → Kapitel-Preview |
| ebooks/schlaf-energie.html | Schlaf & Energie | 41 KB, 13 Kap. | FREE | Kapitel 04 SCHLAF (Basis 1/2) |
| ebooks/schlaf-stack.html | Schlaf-Stack + PDF-Lead | 48 KB, 15 Kap. | LEAD (PDF frei) | Kapitel 04 (Basis 2/2, Supplement-Teil) |
| ebooks/blutwerte-guide.html | Blutwerte | 54 KB, 15 Kap. | FREE | Kapitel 05 BLUTWERTE (+ labs-data.js Marker-DB als System-Skelett) |
| ebooks/testosteron.html | Testosteron/Hormone | 47 KB, 15 Kap. | FREE | Kapitel 06 HORMONE — enthält bereits Schilddrüse-zuerst + Lifestyle-vor-Booster-Logik → Basis für BEFORE-TRT |
| ebooks/glp1-agonisten.html | GLP-1 | 51 KB, 14 Kap. | FREE | Kapitel 07 GLP-1 & METABOLIC MEDICINE |
| ebooks/supplements.html | Supplemente m. Evidenz | 40 KB, 12 Kap. | FREE | Kapitel 09 (Nachschlagewerk; Stack-Priorisierung bleibt Premium-08) |
| ebooks/sexuelle-gesundheit.html | Sexuelle Gesundheit | 54 KB, 16 Kap. | FREE | Kapitel 10 |
| ebooks/fettabbau.html | Fettverlust | 37 KB, 9 Kap. | FREE | Kapitel 02 KÖRPERKOMPOSITION (Basis 1/3) |
| ebooks/protein-system.html | Protein | 31 KB, 9 Kap. | FREE | Kapitel 02 (Basis 2/3) |
| ebooks/training-system.html | Training | 44 KB, 15 Kap. | FREE | Kapitel 03 (ergänzend zu taeglich-trainieren) |
| ebooks/blueprint.html | „Blueprint" Gesamtguide | 82 KB, 36 Kap. | FREE, im SW-CORE | Kapitel 01 DAS FUNDAMENT (stärkste Klartext-Quelle) |
| ebooks/masterguide.html | Masterguide (frei) | 36 KB, 12 Kap. | FREE | Redundanz zu blueprint prüfen → Kandidat MERGE/Teaser |
| ebooks/gewohnheiten.html | Gewohnheiten | 32 KB, 6 Kap. | FREE | in Kapitel 13 DAS SYSTEM ZUSAMMENSETZEN integrieren |
| blutwerte.html (root) | Blutwerte-Landing (SEO) | 16 KB | FREE Landing | bleibt SEO-Einstieg → verweist auf Kapitel 05 + Protokoll-CTA |
| protokoll.html (root) | Produkt-/Salespage 49 € | 21 KB | Sales, live | **wird Flagship-Produktseite 2.0** (Teil 15) |
| kurs-programm.html | 12-Wochen-Programm (courseVault) | 73 KB enc | PAID interaktiv | bleibt EIGENES Produktmodul („führt"), kein Protokoll-Kapitel |
| js/os/intelligence/knowledge.js | Knowledge-Graph (zitierte Quellen) | Code | aktiv | Evidenz-Rückgrat für Kapitel-Evidence-Notes |
| js/os/labs-data.js | Marker-DB (Einheiten, Kontext) | Code | getestet | System-Skelett Kapitel 05 |
| blog.html | Magazin-Hub | 10 KB | FREE | unverändert, Discovery |
| ebooks/files/MaleMetrix_Schlaf-Stack.pdf | Lead-PDF | — | LEAD | unverändert |

**Lücken (müssen NEU geschrieben werden):** Kapitel 00 START HERE ·
11 INJEKTIONEN (komplett neu) · 12 LONGEVITY & RISK (Teile in blueprint/
blutwerte vorhanden, aber kein eigenes Werk) · Kapitel-übergreifende
Brücken-/Crosslink-Texte · BEFORE-TRT-Vertiefung (Basis in testosteron.html).

**Duplikate/Überschneidungen:** blueprint ⟷ masterguide (Gesamtguide 2×);
schlaf-energie ⟷ schlaf-stack (Supplement-Teil überlappt); fettabbau ⟷
blueprint (Defizit-Grundlagen). Entscheidungen in MASTER_ARCHITECTURE.

**Nichts wird gelöscht.** Alte URLs bleiben (SEO/Backlinks) und werden pro
Seite zu Kapitel-Einstiegen mit Protokoll-Rahmung (Teil 13 B/C).
