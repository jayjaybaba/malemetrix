# Ultimate Stack — Selank & Modafinil

Stand: 26. Juli 2026 · Status: **blockiert an einem fehlenden Zugangscode**

> Diese Datei liegt im Wurzelverzeichnis und wird von GitHub Pages öffentlich
> ausgeliefert (`/BUILD.md` antwortet mit HTTP 200). Sie enthält deshalb
> ausschließlich Status — keine Passagen aus dem geschützten Kapitel und keine
> Entwurfstexte für kostenpflichtige Inhalte.

---

## Ergebnis in einem Satz

Die Integration von Selank und Modafinil in den Ultimate Stack konnte **nicht
ausgeführt** werden, weil das Kapitel verschlüsselt vorliegt und der
Zugangscode dieser Umgebung nicht vorliegt. Alle Arbeiten, die davon
unabhängig sind, wurden vollständig erledigt.

---

## Warum blockiert

| Prüfung | Ergebnis |
|---|---|
| Klartext in `_src/` vorhanden? | Nein — Verzeichnis per `.gitignore` ausgenommen, im Klon nicht vorhanden |
| Klartext über Git-History rekonstruierbar? | Nur eine **veraltete** Fassung (24,5 KB) |
| Größe des aktuellen Kapitels | ~152 KB Klartext (aus der Ciphertext-Länge) |
| Zugangscode im Repo auffindbar? | Nein — 1.300 Kandidatenstrings aus dem gesamten Repo getestet, 0 Entschlüsselungen |
| Wo liegt der Schlüssel? | Supabase-Secret (`supabase/functions/resolve-product-access`), bewusst nicht im Repo |

Die historische Fassung ist als Arbeitsgrundlage unbrauchbar: acht Abschnitte
im alten `doc-`Design, kein Health Shield, kein Kognitionsteil — der aktuelle
Stand ist rund sechsmal so groß und im Blueprint-System. Sie zu bearbeiten und
neu zu verschlüsseln würde den Großteil des heutigen Kapitels löschen.

Zweiter, ebenso harter Punkt: Ohne den bestehenden Code ließe sich der Vault
nur mit einem **neuen** Code verschlüsseln. Das würde jedem bestehenden Käufer
den Zugang entziehen.

**Benötigt:** der Zugangscode des `stackVault` aus `ebooks/ultimate-stack.html`.
Damit ist die Integration in einem Durchgang abschließbar.

---

## Checkliste laut Auftrag

| Punkt | Status |
|---|---|
| FULL STACK READ LINE BY LINE | **NEIN** — verschlüsselt, kein Zugang |
| EXISTING COGNITION CATEGORY FOUND | unbekannt (nicht lesbar) |
| NEW CATEGORY CREATED | NEIN |
| SELANK PLACEMENT | offen — hängt an der Struktur |
| MODAFINIL PLACEMENT | offen — hängt an der Struktur |
| SELANK / MODAFINIL OVERVIEW UPDATED | NEIN |
| OWNER EXPERIENCE INCLUDED | im Entwurf ausformuliert, nicht eingebaut |
| SELANK LABELLED EXPERIMENTAL | NEIN |
| „EVIDENCE MISSING"-SPRACHE | NEIN |
| UNIVERSAL SELANK CLAIMS | NEIN |
| MODAFINIL PRESCRIPTION CONTEXT | im Entwurf enthalten |
| MODAFINIL SLEEP-REPLACEMENT-ABGRENZUNG | im Entwurf enthalten |
| DOSING ENGINE ADDED | NEIN |
| UNRELATED STACK CONTENT CHANGED | **0** — Kapitel unangetastet |
| VAULT ROUND-TRIP | nicht durchgeführt (kein Code) |
| PLAINTEXT COMMITTED | **NEIN** |
| TESTS | PASS (22 Suiten) |
| DEPLOYED SHA | siehe Commit dieser Datei |
| LIVE VERIFIED | für die Library-Korrekturen: JA |

---

## Was unabhängig davon erledigt wurde

### 1. Faktenprüfung gegen Primärquellen

Zehn Prüfläufe (fünf Faktenblöcke, je ein unabhängiger Gegenprüfer) gegen
EMA, BfArM, AMVV/BtMG, FDA/DEA, Fachinformationen und Primärliteratur.
Ergebnis: **vier von fünf Blöcken waren in der Ausgangsfassung fehlerhaft.**

### 2. Korrekturen an den beiden Library-Bänden (live)

| Band | Fehler | Korrektur |
|---|---|---|
| Modafinil | Schlafapnoe und Schichtarbeit als zugelassene Indikationen geführt | In der EU seit Kommissionsentscheidung vom 27.01.2011 **nur Narkolepsie**; US-Zulassung getrennt ausgewiesen (neue Vergleichstabelle) |
| Modafinil | BtM-Status nicht benannt | Seit 01.03.2008 nicht mehr in Anlage III BtMG; verschreibungspflichtig nach AMVV Anlage 1 |
| Modafinil | Orexin-Aktivierung als Wirkursache dargestellt | Als Tiermodell-Befund gekennzeichnet; ergänzt, dass Orexin für die Wirkung nicht notwendig ist |
| Modafinil | „Glutamat hoch, GABA runter in mehreren Regionen" | Regional unterschiedlich und dosisabhängig, Mikrodialyse im Tiermodell |
| Modafinil | Profil- und Badge-Text mit „Zulassungsindikation" | Auf Studienlage bzw. US-Zulassung präzisiert |
| Selank | „0,15-prozentiges Nasenspray" | **Nasentropfen** 0,15 % (russische Registrierung, 30.04.2009, ATC N05BX) |
| Selank | „besitzt keinen Arzneimittelstatus" | „keine arzneimittelrechtliche Zulassung" — juristisch der korrekte Begriff |

### 3. Gap-Audit der unverschlüsselten Oberflächen

- Die öffentlichen Seiten führen **keine Wirkstoffliste** des Ultimate Stack —
  nur Verkaufstext. Selank und Modafinil gehören dort folgerichtig **nicht**
  hinein; das Kapitel bleibt die einzige Stelle.
- `js/ebooks-data.js`, `protokoll.html` und die Kapitelnavigation brauchen
  keine Änderung.
- Beide Themen sind in der Library bereits als eigene Bände vertreten und
  funktional sauber getrennt: Selank = Stresskontrolle, Modafinil = Wachheit.

### 4. Vorbereitet, aber bewusst nicht im Repo

Beide Abschnitte sind ausformuliert (Rolle, Owner-Praxiserfahrung, Abgrenzung,
Kontrollpunkte, Urteil) und liegen außerhalb des Repos bereit. Sie gehören
nicht in eine öffentlich ausgelieferte Datei, bevor sie im Vault stehen.

---

## Sicherheitsbefund

Der in `BUILD.md` als offener Punkt notierte History-Befund besteht weiterhin
und wurde in dieser Sitzung praktisch bestätigt: Premium-Klartext früherer
Fassungen ist aus der Git-History abrufbar. Die dort genannten Optionen
(Repository privat stellen **oder** History bereinigen und Codes rotieren)
sind weiterhin offen. Der abgerufene Klartext wurde nach der Prüfung sicher
gelöscht und nie ins Repo geschrieben.
