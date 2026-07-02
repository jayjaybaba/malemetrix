# MaleMetrix iOS-App (Apple-Health-Anbindung)

Native SwiftUI-App mit HealthKit: Sie liest deinen **echten Kalorienverbrauch**,
Schritte, Schlaf, HRV, Ruhepuls und Gewicht aus Apple Health und rechnet sie in
die Analyse ein — Kalorien-Budget aus deinem echten Verbrauch statt Schätzformel,
plus Readiness-Score wie beim Oura Ring.

**Warum eine App?** Apple Health ist für Websites technisch unzugänglich —
HealthKit-Daten bekommt nur eine native iOS-App. Deshalb liegt hier eine echte
App, kein Web-Wrapper.

## Was die App kann (v1)

| Tab | Inhalt |
|---|---|
| **Heute** | Readiness-Score (0–100 aus HRV + Ruhepuls + Schlaf vs. deiner 14-Tage-Baseline), Verbrauch heute (aktiv + Grundumsatz), Schritte, Schlaf, HRV, Ruhepuls, Gewicht |
| **Training** | Das MaleMetrix-Prinzip als Wochenplan: Gym-Tage (z. B. Mo/Mi/Fr = Push/Pull/Legs) + tägliches Bewegungsziel — und die **Morgen-Erinnerung**: jeden Tag zur Wunschzeit eine Mitteilung, die genau sagt, was heute dran ist („Heute ist Gym-Tag 🏋️ Push" bzw. „25 Minuten Bewegung 🚶 — kein Null-Tag") |
| **Kalorien** | Tages-Budget = dein echter Ø-Verbrauch (7 Tage, aus Health) minus einstellbares Defizit · Mahlzeiten erfassen · optional automatisch nach Apple Health schreiben (kcal + Protein) |
| **Analyse** | 14-Tage-Charts (Aktivkalorien, HRV) + Klartext-Einordnung |

Die Morgen-Erinnerung nutzt **lokale Mitteilungen** (kein Server, keine Daten
verlassen das Gerät). Beim ersten Aktivieren fragt iOS einmalig nach der
Mitteilungs-Erlaubnis.

Gelesen werden: Aktiv-/Grundumsatz-Kalorien, Schritte, HRV (SDNN), Ruhepuls,
Schlafanalyse, Gewicht. Geschrieben werden (optional): Mahlzeiten-Kalorien und
Protein. Daten von Apple Watch, Oura, Withings & Co. landen automatisch in
Apple Health und damit in der App.

## Das brauchst du

1. **Einen Mac mit Xcode 15+** (kostenlos aus dem Mac App Store). Ohne Mac geht
   es nicht — iOS-Apps lassen sich nur dort bauen.
2. **Dein iPhone** (HealthKit funktioniert im Simulator nur mit manuell
   eingetragenen Testdaten — echte Watch-Daten gibt es nur auf dem Gerät).
3. **Apple-ID**: Zum Testen auf dem eigenen iPhone reicht die kostenlose
   Apple-ID (App läuft dann 7 Tage, danach neu installieren). Für App Store /
   TestFlight brauchst du das Apple Developer Program (99 €/Jahr).

## Projekt öffnen (2 Wege)

**Weg A — XcodeGen (empfohlen, 1 Befehl):**
```bash
brew install xcodegen
cd ios
xcodegen generate
open MaleMetrix.xcodeproj
```

**Weg B — manuell in Xcode (~5 Min):**
1. Xcode → *File → New → Project → iOS App*, Name `MaleMetrix`,
   Interface *SwiftUI*, Language *Swift*.
2. Die von Xcode erzeugten Swift-Dateien löschen und alle Dateien aus
   `ios/Sources/` ins Projekt ziehen („Copy items if needed“).
3. Target → *Signing & Capabilities* → **+ Capability → HealthKit**.
4. Target → *Info* → zwei Einträge hinzufügen:
   - `Privacy - Health Share Usage Description`: „MaleMetrix liest Aktivitäts-, Schlaf- und Herzdaten aus Apple Health, um Verbrauch und Erholung zu analysieren.“
   - `Privacy - Health Update Usage Description`: „MaleMetrix kann erfasste Mahlzeiten in Apple Health speichern.“

## Auf dein iPhone bringen

1. iPhone per Kabel anschließen, oben als Ziel auswählen.
2. *Signing & Capabilities* → Team: deine Apple-ID auswählen
   (einmalig „Add Account“).
3. ▶︎ Run. Beim ersten Start fragt iOS nach den Health-Berechtigungen —
   alles erlauben, sonst bleibt das Dashboard leer.
4. Falls „Untrusted Developer“: iPhone → *Einstellungen → Allgemein →
   VPN & Geräteverwaltung* → deinem Zertifikat vertrauen.

## In den App Store (wenn du so weit bist)

1. Apple Developer Program beitreten (99 €/Jahr).
2. In Xcode: *Product → Archive* → *Distribute App* → App Store Connect.
3. In App Store Connect: App anlegen, Screenshots + Datenschutzangaben
   (Health-Daten: „wird nicht getrackt, verlässt das Gerät nicht“) ausfüllen,
   zur Prüfung einreichen. Health-Apps werden von Apple genau geprüft —
   die Beschreibungstexte oben sind dafür schon passend formuliert.

## Roadmap-Ideen (sag Bescheid, was zuerst)

- **Foto-Kalorienschätzung** in der App (nutzt denselben Cloudflare-Worker
  wie der Dinner-Planer der Website — `proxy/food-vision-worker.js`).
- Workout-Liste + Auto-Erkennung der 3 Gym-Tage (Push/Pull/Legs-Tracking).
- 12-Wochen-Masterplan als In-App-Checkliste mit den Messpunkten aus dem Protokoll.
- Widget mit Rest-Budget + Readiness auf dem Homescreen.

## Datenschutz

Alle Health-Daten bleiben auf dem Gerät. Die App hat keinen Server, kein
Tracking, keine Accounts. Mahlzeiten werden lokal (UserDefaults) und — nur
wenn aktiviert — in Apple Health gespeichert.
