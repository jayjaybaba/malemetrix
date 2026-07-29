# Browser-QA (Pakete 3–8)

Diese Skripte fahren die realen Nutzerabläufe im echten Browser bei 390 px und
1440 px durch. Sie gehörten bis Paket 7 in ein flüchtiges Arbeitsverzeichnis und
waren damit nach dem Ende einer Sitzung nicht mehr nachvollziehbar. Seit Paket 8
liegen sie hier, damit das Release-Gate „alle paketbezogenen Browser-QA-Skripte
reproduzierbar grün“ auch später noch überprüfbar ist.

## Voraussetzungen

```sh
npm install playwright-core          # nur der Treiber, kein Browser-Download
python3 -m http.server 8899 --bind 127.0.0.1     # im Repo-Wurzelverzeichnis
```

Ein Chromium muss vorhanden sein. Pfad und Adresse lassen sich überschreiben:

| Variable          | Standard                                          |
|-------------------|---------------------------------------------------|
| `MM_BASE`         | `http://127.0.0.1:8899/`                          |
| `MM_CHROMIUM`     | `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` |
| `MM_PLAYWRIGHT`   | `playwright-core` (Modulname oder absoluter Pfad) |

## Ausführen

```sh
node tools-dev/qa/run-all.mjs           # alle Skripte nacheinander
node tools-dev/qa/alltagstest.js        # ein einzelnes Skript
```

Ein Skript endet mit `EXIT=0`, wenn alle Prüfungen bestanden sind.

## Was welches Skript prüft

| Skript                    | Gegenstand |
|---------------------------|------------|
| `layout.js`               | Überlauf, JS-Fehler und kanonische Begriffe auf den Hauptseiten |
| `punkte.js`               | Optimierungspunkte: Entstehung, Status, persönlicher Standard (Paket 3) |
| `fokusphase.js`           | „Ein Auftrag“: Dauer, Zeitraum, Prüfungstag (Paket 3) |
| `bereichswerte.js`        | Bereichswerte auf der Ergebnisseite (Paket 4) |
| `messdaten.js`            | Messdatenbrücke und assistierte Erfüllung (Paket 5) |
| `kapitel.js`              | Kapitelempfehlungen und Deep-Links (Paket 6) |
| `kapitel-legacy.js`       | Alt-Ergebnisse ohne gespeicherte Bereiche (Paket 6) |
| `massnahmen.js`           | Stack- und Maßnahmenprüfung (Paket 7) |
| `massnahmen-ergebnis.js`  | Ergebnisprüfung, Standard und Historie (Paket 7) |
| `alltagstest.js`          | Alltagstest, 12-Wochen-Abschluss, Punkt-Integrität (Paket 8) |

## Hinweise für spätere Änderungen

* Die Tageserfassung eines Auftrags ist seit Paket 5 **zwei** Formen: eine
  Checkbox (`#focusToday`, Stufe C) oder Schaltflächen (`[data-fday]`,
  Stufe A/B). Skripte müssen beide bedienen — `punkte.js` und `fokusphase.js`
  zeigen den Weg.
* Der Alt-Bestand eines abgehakten Tages ist `true`, nicht `1`.
* Mehrere Flächen sind per CSS versalisiert. Für Textprüfungen `textContent`
  verwenden, nicht `innerText`.
* Entitlements ohne `mm_account_access_validation` werden beim nächsten Laden
  zu Recht verworfen — Fixtures müssen den Nachweis mitliefern.
