# APP — MaleMetrix als native iOS-App

Stand: 07.08.2026. Diese Datei ist die einzige Anlaufstelle fuer die App:
was sie ist, wie sie gebaut wird, und welche drei Handgriffe nur du selbst
machen kannst.

---

## Das Wichtigste zuerst: du brauchst keinen gemieteten Mac

Der Plan war, mir online einen Mac zu mieten. Das ist nicht noetig — und der
gemietete Mac waere sogar der schlechtere Weg.

Dieses Repository ist oeffentlich. Damit stellt GitHub **kostenlose
macOS-Runner** bereit: echte Macs mit installiertem Xcode, die auf Zuruf einen
Build fahren. Der Workflow `.github/workflows/ios-app.yml` nutzt genau die.
Ein gemieteter Mac (MacStadium, MacinCloud, Scaleway) kostet 20–60 € im Monat
und muesste zusaetzlich noch fernbedient werden — er koennte nichts, was der
Runner nicht auch kann.

**Kosten fuer die App insgesamt: 99 € pro Jahr fuer das Apple Developer
Program. Sonst nichts.** Ohne dieses Programm gibt es weder TestFlight noch
App Store — das ist Apples Regel, daran fuehrt kein Weg vorbei.

---

## Was gebaut ist

Eine echte native iOS-App (Capacitor), die die bestehende Oberflaeche mitbringt
— dieselben Dateien, derselbe Planmotor. Es gibt **keine zweite Planlogik**,
die auseinanderlaufen koennte; das war die Vorgabe aus
`PRODUCT_ARCHITECTURE.md` und sie gilt weiter.

```
capacitor.config.json          Bundle-ID de.malemetrix.app, Startseite = Mein Plan
scripts/build-app.mjs          baut aus der Website das App-Bundle (app-build/)
scripts/build-app-assets.mjs   App-Icon (1024, ohne Alpha) und Startbild
scripts/asc.mjs                legt Bundle-ID und App-Eintrag bei Apple an
ios-app/App/App/HealthPlugin.swift   Apple Health (nur lesen, was der Plan braucht)
js/native-bridge.js            Bruecke Web -> nativ (nur im App-Bundle geladen)
css/native.css                 App-Anpassungen (Website-Navigation aus)
ios-app/                       das Xcode-Projekt (von Capacitor erzeugt)
tools-dev/run-tests.mjs        npm test — alle Testdateien in einem Lauf
tools-dev/qa/*.mjs             Browser-Nachweise (siehe unten)
.github/workflows/ios-app.yml  Build + Simulator-Test + TestFlight
```

Der Ordner `ios/` bleibt unberuehrt: der fruehere SwiftUI-Entwurf. Seine
HealthKit-Logik ist die Vorlage fuer `HealthPlugin.swift` gewesen — jetzt
haengt sie am bestehenden Planmotor, statt eine zweite Rechnung danebenzustellen.

### Was die App nativ kann, was die Website nicht kann

| | Website / PWA | diese App |
|---|---|---|
| Vom Home-Bildschirm starten, offline | ✅ (nach manueller Installation) | ✅ ab Installation |
| Zuverlaessige Erinnerungen | ⚠️ nur mit Konto + Server-Push | ✅ von iOS geplant, ohne Konto, ohne Server |
| Haptisches Feedback, Statusleiste, Startbild | ❌ | ✅ |
| Im App Store auffindbar | ❌ | ✅ |
| Apple Health (Schritte, HRV, echter Verbrauch) | ❌ technisch unmoeglich | ✅ |

Die Erinnerungen laufen ueber **lokale Mitteilungen**: das iPhone plant sie
selbst, es geht kein Datum an einen Server. Der Schalter dafuer steht in der
App unter *Mein Plan → iPhone einrichten → Benachrichtigungen*. Wird die
Erlaubnis verweigert, zeigt die App das ehrlich an, statt „aktiv" zu behaupten.

### Apple Health — gemessen statt geschaetzt

Das ist der eigentliche Grund fuer eine App: HealthKit ist fuer Websites
technisch unerreichbar.

Bisher rechnet der Planmotor `Grundumsatz x Aktivitaetsfaktor`, und der Faktor
kommt aus einem Auswahlfeld („sitzend" bis „hoch"). Das ist eine Schaetzung
ueber einen Menschen, den man nicht kennt. Apple Health kennt den echten Wert:
Aktiv- plus Grundumsatz, gemessen von Uhr oder iPhone.

Der Unterschied ist nicht kosmetisch. Ein Beispiel aus der Testsuite — jemand
mit 95 kg, Ziel 85 kg, im Fragebogen „sitzend", tatsaechlich aber 2950 kcal
Verbrauch: Kalorienziel **1688 → 2323 kcal**. Die Schaetzung haette ihn dicht
an die Untergrenze von 1500 gedrueckt.

**Die Leitplanken sind der wichtigere Teil.** Eine nicht getragene Uhr meldet
800 kcal; wuerde das durchgehen, entstuende ein Hungerziel. Deshalb wird ein
gemessener Wert nur uebernommen, wenn er

- mindestens **5 volle Tage** abdeckt,
- ueber **1200 kcal** liegt,
- und im Korridor **75 %–140 %** der Formel bleibt.

Sonst gilt weiter die Formel — und die App schreibt unter das Kalorienziel,
welcher Wert gemeldet und warum er nicht uebernommen wurde. Diese Pruefung
liegt in `MMSimple.engine.resolveTdee`, also an EINER Stelle fuer App und Web,
und ist mit 50 Assertions abgedeckt (`tools-dev/tests/health-energy.test.js`).

Mindestens iOS 16 (iPhone 8 und neuer) — die Schlafphasen in HealthKit gibt
es nicht frueher.

Gelesen werden: Aktiv- und Grundumsatz, Schritte, HRV, Ruhepuls, Schlaf,
Gewicht. Geschrieben wird ausschliesslich das Gewicht, und nur auf Aktion.
Nichts verlaesst das Geraet. Einschalten in der App unter *Mein Plan → iPhone
einrichten → Apple Health*.

> **Noch nicht auf einem echten Geraet geprueft.** Der Simulator hat keine
> Health-Daten; die CI beweist nur, dass es uebersetzt und startet. Ob die
> Werte stimmen, zeigt der erste TestFlight-Build auf deinem iPhone. Bis
> dahin ist das eine begruendete Erwartung, kein Nachweis.

### Was in der App ist — und was bewusst nicht

**Drin:** Transformation (Zielbild), Score-Check, Mein Plan mit Heute /
Fortschritt / Profil, die 19 Rechner, der Trainings-Tracker, Impressum,
Datenschutz, AGB.

**Nicht drin:** Shop, Checkout, Ebook-Verkauf, Coaching- und Kursseiten.
Grund ist keine Sparsamkeit, sondern App-Store-Richtlinie 3.1.1: digitale
Inhalte, die in einer iOS-App freigeschaltet werden, muessen ueber
In-App-Purchase laufen, und eine App darf auch nicht an Apple vorbei auf einen
externen Shop verlinken. Eine App mit PayPal-Checkout fuer Ebooks wird
abgelehnt. Deshalb ist die App v1 das persoenliche System — der Verkauf bleibt
auf der Website. Wenn Verkauf in der App gewuenscht ist, ist das ein eigener
Schritt (In-App-Purchase einbauen, Apple behaelt 15–30 %).

---

## Was nur du tun kannst

Drei Dinge, zusammen etwa 30 Minuten plus Apples Prueffrist. Alles andere
laeuft danach automatisch.

### 1 · Apple Developer Program (99 €/Jahr)

Nur du kannst das: Apple verlangt eine Identitaetspruefung mit Ausweis und
eine Zahlung auf deinen Namen.

1. <https://developer.apple.com/programs/enroll/> mit deiner Apple-ID
   (Zwei-Faktor muss aktiv sein).
2. Als **Einzelperson** anmelden — dann ist keine D-U-N-S-Nummer noetig.
   (Nur bei Anmeldung als Firma braucht es eine, das dauert Tage.)
3. Identitaet bestaetigen (Apple fragt Ausweis oder eine Bestaetigung ueber
   die Apple-Developer-App ab), 99 € zahlen.
4. Freischaltung dauert ueblicherweise 24–48 Stunden.

Danach in App Store Connect einmal die **Vertraege** bestaetigen
(*Business → Agreements*, „Free Apps" annehmen) — ohne das laesst Apple keinen
Build zu TestFlight.

### 2 · Vier Werte als Repository-Secrets hinterlegen

In App Store Connect: **Users and Access → Integrations → App Store Connect
API → Team Keys → „+"**

- Name: `MaleMetrix CI`
- Rolle: **Admin** (App Manager reicht nicht — Xcode muss Zertifikate anlegen)
- Danach die **.p8-Datei herunterladen**. Apple bietet den Download **genau
  einmal** an. Geht sie verloren, muss ein neuer Schluessel her.

Dann in GitHub: **Settings → Secrets and variables → Actions → New repository
secret**, viermal:

| Secret | Woher |
|---|---|
| `ASC_KEY_ID` | steht in der Schluesselliste, Spalte „Key ID" (10 Zeichen) |
| `ASC_ISSUER_ID` | steht ueber der Liste, „Issuer ID" (eine UUID) |
| `ASC_PRIVATE_KEY` | **der ganze Inhalt der .p8-Datei**, inklusive der `-----BEGIN PRIVATE KEY-----`-Zeilen |
| `APPLE_TEAM_ID` | <https://developer.apple.com/account> → Membership details → „Team ID" (10 Zeichen) |

> Die .p8-Datei ist ein Generalschluessel fuer dein Apple-Konto. Sie gehoert
> ausschliesslich in die GitHub-Secrets — nie in eine Datei im Repository, nie
> in einen Chat. GitHub zeigt sie nach dem Speichern niemandem mehr an, auch
> dir nicht.

### Wenn der .p8-Download bei Apple scheitert — Weg B: Xcode Cloud

Der Download des API-Schluessels wird von Apple **nur einmal** angeboten, und
er schlaegt gelegentlich mit „Es ist ein Fehler aufgetreten. Versuche es
spaeter erneut" fehl. Das ist ein bekannter serverseitiger Fehler, kein
Bedienfehler — er verschwindet meist nach einigen Stunden.

**Wichtig dabei:** Ein fehlgeschlagener Download verbraucht den Schluessel
nicht. Der Link „Laden" bleibt stehen. Es lohnt sich also NICHT, immer neue
Schluessel anzulegen — das fuellt nur die Widerrufen-Liste.

Falls es dauerhaft scheitert oder kein Computer zum Herunterladen zur
Verfuegung steht, gibt es einen zweiten Weg, der **ganz ohne .p8** auskommt:

**Xcode Cloud.** Apples eigene Bauumgebung. Sie signiert mit Apples
Infrastruktur — kein Schluessel, kein Zertifikat, keine Datei. Einrichtung
komplett im Browser, auch auf dem iPhone.

1. App Store Connect → **Apps** → **+** → **Neue App**
   (Plattform iOS · Name MaleMetrix · Deutsch · Bundle-ID `de.malemetrix.app`
   · SKU `malemetrix-app-001`).
2. In der App → **Xcode Cloud** → GitHub verbinden, dieses Repository und den
   Branch waehlen.
3. Workflow anlegen: Ziel **App**, Aktion **Archivieren**, Nachbearbeitung
   **An TestFlight**.

Vorbereitet ist alles: `ios-app/App/ci_scripts/ci_post_clone.sh` installiert
Node, faehrt die Fachtests, baut das Web-Bundle und synct es ins Xcode-Projekt,
bevor Apple uebersetzt. Ohne dieses Skript wuerde Xcode Cloud eine App mit
leerem Inhalt bauen.

Kostenlos sind 25 Rechenstunden im Monat — fuer dieses Projekt reichlich.

| | GitHub Actions (Weg A) | Xcode Cloud (Weg B) |
|---|---|---|
| Braucht .p8 | ja | **nein** |
| Einrichtung | 4 Secrets | im Browser, ohne Datei |
| Kosten | kostenlos (oeffentliches Repo) | 25 h/Monat frei |
| Simulator-Test bei jedem Push | ja | nein |

Weg A bleibt der Hauptweg, weil er bei jeder Aenderung ohne Apple-Konto
prueft. Weg B ist der Ausweg, wenn der Schluessel nicht zu bekommen ist —
beide bauen dasselbe.

### 3 · Den Upload starten

Zuerst der 20-Sekunden-Test, damit ein Tippfehler nicht erst nach 40 Minuten
Build auffliegt:

**Actions → apple-zugang → Run workflow.** Der Lauf prueft die Form der vier
Werte, meldet sich bei Apple an und listet die Apps im Konto. Er aendert
nichts. Ist er gruen, stimmen die Zugaenge.

Dann der eigentliche Lauf:

**Actions → ios-app → Run workflow → „Signiert bauen und zu TestFlight" ✓ →
Run.**

Der Lauf macht dann von allein: Bundle-ID registrieren, App-Eintrag anlegen,
Zertifikat und Profil erzeugen, signiert bauen, pruefen, hochladen. Nach
10–30 Minuten Apple-Verarbeitung liegt der Build in TestFlight und du kannst
ihn auf deinem iPhone installieren.

**Fuer den App Store** kommt danach noch einmal Handarbeit dazu, die Apple
niemandem abnimmt: Screenshots auswaehlen, Beschreibungstext, Alterseinstufung,
Datenschutz-Angaben („App-Datenschutz"), und die Einreichung selbst. Die
Screenshots liefert der Build-Workflow bereits als Artefakt mit; den Rest
schreibe ich dir vor, sobald der erste TestFlight-Build steht — dann sehen wir
die App und koennen ueber das Echte reden statt ueber Vermutungen.

---

## Was ohne Apple-Konto schon nachweisbar ist

Der Job **build** in `.github/workflows/ios-app.yml` laeuft bei jeder
Aenderung, ohne jeden Zugang, auf einem echten Mac. Er

- fuehrt `npm test` aus — alle 49 Testdateien, nicht nur eine,
- uebersetzt die App mit Xcode,
- startet sie im iPhone-Simulator und prueft, dass sie den ersten Bildschirm
  ueberlebt (ein Absturz im WebView wuerde hier auffallen),
- legt Screenshots als Artefakt ab.

Ein gruener Lauf heisst: die App baut und startet. Was ein gruener Lauf **nicht**
heisst: dass sie sich auf einem echten iPhone gut anfuehlt. Der Simulator kennt
keine echten Health-Daten, keine echte Mitteilungszustellung und kein echtes
Scrollverhalten. Das entscheidet der erste TestFlight-Build auf deinem Geraet.

### Vier Werkzeuge, die im Browser pruefen, was Unit-Tests nicht sehen

Unit-Tests pruefen Logik. Die peinlichen Fehler sitzen daneben: ein Knopf ohne
Wirkung, eine Tippflaeche, die der Daumen verfehlt, ein Modal, ueber dem noch
die Kopfzeile liegt, eine Datei, die im Bundle fehlt. Dafuer gibt es vier
Laeufe in einem echten Chromium bei iPhone-16-Pro-Groesse (393x852):

```bash
node tools-dev/qa/app-sweep.mjs      # 11 Ansichten x 4 Zustaende, ~25 Min
node tools-dev/qa/motion.mjs         # Bewegung: greift sie, und im richtigen Moment?
node tools-dev/qa/tempo.mjs          # Ladezeit auf 4x gedrosselter CPU
node scripts/build-app.mjs && node tools-dev/qa/bundle-smoke.mjs
```

| Werkzeug | Prueft | Gefunden hat es u. a. |
|---|---|---|
| `app-sweep` | jede Ansicht in jedem Zustand: Laufzeitfehler, tote Knoepfe, Ueberlauf, Tippflaechen, leere Bildschirme, verdeckter Inhalt | 98 Bedienelemente unter 44 pt; „Umsetzung 0 % ueber 1 Tage" am zweiten Tag |
| `motion` | ob Animationen wirklich laufen, nur beim Ansichtswechsel, und bei „Bewegung reduzieren" verschwinden | das Blatt lag UNTER der festen Kopfzeile — es war gar kein Modal |
| `tempo` | Kaltstart, Ansichtswechsel, Abhaken, mit Grenzwerten | derzeit 580 ms / 1496 ms / 124 ms / 37 ms |
| `bundle-smoke` | ob das fertige `app-build/` in jeder Seite ohne fehlende Datei laedt | `transformation.html` konnte seine Zielengine nicht laden — Onboarding-Schritt 1 war in der App tot |

`app-sweep` schreibt `tools-dev/qa/out/sweep/bericht.json` und je einen
Screenshot pro Bildschirm. Der Bericht gehoert auf die Platte, nicht nur in
die Konsole: ein Lauf dauert eine halbe Stunde.

## Lokal bauen (falls du doch mal einen Mac vor dir hast)

```bash
npm ci
npm run sync:ios      # Web-Bundle bauen und ins Xcode-Projekt kopieren
npm run open:ios      # Xcode oeffnet das Projekt
```

Mit einer kostenlosen Apple-ID laesst sich die App so 7 Tage lang auf dem
eigenen iPhone testen — ohne die 99 €. Fuer TestFlight und App Store reicht das
nicht.

## Was als Naechstes kommt

1. **Android** — Capacitor kann das aus demselben Bundle, ohne Mac. Google Play
   kostet einmalig 25 $ statt 99 €/Jahr. Sag Bescheid, dann kommt es dazu.
3. **In-App-Purchase**, falls in der App verkauft werden soll.
