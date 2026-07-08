---
name: verify
description: Statische Website (kein Build) im echten Browser verifizieren — Server starten, Seiten mit Playwright/Chromium durchklicken, Konsole auf Fehler prüfen.
---

# MaleMetrix verifizieren

Reines HTML/CSS/JS ohne Build-Schritt. Verifikation = Seiten im Browser laden
und die Flows durchklicken, nicht Unit-Tests.

## Starten

```bash
python3 serve.py 4173 &            # statischer Server, http://127.0.0.1:4173
```

## Browser-Smoke-Test (Playwright)

- Chromium liegt unter `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
  (`executablePath` explizit setzen — der Symlink `/opt/pw-browsers/chromium`
  zeigt nicht auf die Binary). `npm install playwright` in einem Scratch-Ordner
  genügt (Browser-Download wird per `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` übersprungen).
- **Externe Endpoints abfangen**, sonst gehen echte Requests raus:
  `context.route("**formsubmit.co**", …fulfill 200 JSON…)`.
- Konsole überwachen: `page.on("pageerror")` + `console`-Errors pro Seite sammeln.

## Flows, die sich lohnen

- **index.html**: Cart-Drawer injiziert (`#cartDrawer`), Lead-Band (`#leadBand`),
  E-Mail-Validierung (ungültig → `#leadErr`, gültig → Erfolgs-UI ohne mailto-Redirect).
- **check.html**: Ergebnis-Rendering ohne 45 Fragen testen — `mm_check_result`
  in localStorage seeden (per `addInitScript`), dann `#existingResult [data-show]`
  klicken. Wizard: Consent-Checkboxen → `#btnConsentNext` → Option klicken →
  Draft landet in `mm_check_draft`.
- **tracker.html**: `mm_trk_sessions` / `mm_trk_templates` / `mm_trk_custom_ex`
  seeden, Tabs (History/Pläne/Workout) durchklicken.
- **checkout.html**: `mm_cart` seeden (Produkt-IDs in `js/shop-data.js`,
  z. B. `starter-report`), Formular ausfüllen, Vorkasse-Bestellung abschicken.
- **termin.html**: Tag + Slot wählen, Formular absenden → Erfolgsansicht.
- **Ebook-Unlock**: Reader-Seite (z. B. `ebooks/testosteron.html`),
  `[data-gate="print"]` klicken. Vorher `mm_unlock_email` aus localStorage
  entfernen, sonst öffnet das Modal nicht (bereits freigeschaltet).
  `window.print` vor dem Submit stubben (headless).

## Stolpersteine

- Seiten teilen sich localStorage (gleiche Origin) — Tests beeinflussen sich
  gegenseitig; Zustand pro Test gezielt seeden/räumen.
- `innerText` gibt in Chrome `text-transform: uppercase` wieder —
  Assertions case-insensitiv schreiben.
- Skript-Ladereihenfolge: `config.js → analytics.js → shop-data.js → i18n.js →
  main.js → Seiten-Skript`. Gemeinsame Helfer (`MM.esc`, `MM.ymd`,
  `MM.validEmail`, `MM.store`, `MM.toast`) kommen aus `js/main.js`.
