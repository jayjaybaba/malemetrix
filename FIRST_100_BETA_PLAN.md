# FIRST 100 BETA PLAN (Phase 9.7)

Ergänzt `FIRST_100_USERS.md` (Kennzahlen & Diagnose-Baum). Dieses Dokument
regelt das **Durchführen** des Beta-Tests mit den ersten 100 echten Männern:
wen holen, was beobachten, was fragen. Bewusst leichtgewichtig — kein
Admin-System, keine neue Infrastruktur. Alle referenzierten Events sind
bereits über `MM.track()` / `MM.funnel()` instrumentiert.

---

## 1 — Wen rekrutieren (Zielprofil)

Kein Massen-Launch. 100 Männer, die dem Kernnutzer entsprechen:

- **Alter 30–50**, Job + Familie, wenig Zeit.
- Motiv: Bauchfett runter, Kraft/Energie rauf, Blutwerte/Gesundheit im Blick.
- Mischung bewusst streuen:
  - ~60 % **Einsteiger/Wiedereinsteiger** (früher fitter).
  - ~25 % **Fortgeschritten** (trainiert, will Struktur/Daten).
  - ~10 % **Metabolisches Risiko / Blutwerte-getrieben**.
  - ~5 % **Enhanced-Pfad** (getrennt, erwachsen behandelt).
- Kanal: persönliches Netzwerk, 1–2 fokussierte Communities, kein bezahlter
  Traffic in Welle 1 (Signal vor Skalierung).

**Nicht** rekrutieren: reine Neugier-Klicker ohne Zielbezug — sie verzerren
Retention-Signale.

## 2 — Wellen

| Welle | Größe | Zweck |
|---|---|---|
| 0 · Founder-Test | 5 | Grobe Blocker vor jeglichem Nutzer (siehe §7 Skripte). |
| 1 · Closed | 20 | Tiefes qualitatives Signal, 1:1 beobachtet. |
| 2 · Closed | 75 | Skaliertes Verhaltenssignal, Events statt Interviews. |

Zwischen den Wellen: fixe P0/P1, dann erst nächste Welle.

## 3 — Was beobachten (verhaltensbasiert, nicht Meinung)

Primär die instrumentierte Funnel-Kette (Definitionen unten). Ein Nutzer,
der sagt „gut", aber nach Tag 1 nie zurückkommt, hat **nicht** validiert.

**Harte Signale (Events):**
`pageview_home → score_start_click → check_started → check_completed →
map_view → (Account) → action_complete → day_closed → weekly_review →
proof`.

**Weiche Signale (beobachtet / Kurzfrage):**
- Zögern zwischen zwei Schritten (wo bricht der Blick?).
- Sagt der Nutzer den **Engpass** unaufgefordert nach dem Score korrekt?
- Versteht er nach der Map, **was als Nächstes** zu tun ist?
- Fühlt sich „Not now" als Erleichterung oder als Bevormundung an?

## 4 — Retention-Marker (die eigentliche Frage)

| Marker | Definition | Was er beweist |
|---|---|---|
| **D1-Return** | Öffnet Produkt an Tag 1–2 erneut | Es gab einen Grund zurückzukommen |
| **First Action** | `action_complete` ≥ 1 | Ausführung, nicht nur Ansehen |
| **D7-Return + Action** | Tag 7–13 zurück **und** Aktion | Echte Nützlichkeit |
| **Weekly Review** | `weekly_review` erreicht | Loop geschlossen |
| **Proof-Moment** | `proof` (erste messbare Veränderung) | Wert spürbar geworden |

Kein Streak-Zwang, keine Schuld-Loops (Produktprinzip §43).

## 5 — Bug- & Reibungs-Feedback (leichtgewichtig)

- Eine kurze In-Product-Frage nach dem ersten Weekly Review:
  *„Was war heute verwirrend?"* (ein Freitextfeld, optional).
- Ein einzelner Feedback-Kanal (E-Mail/Formular auf `kontakt.html`), keine
  Ticket-Bürokratie.
- Founder trackt Blocker in einer simplen Liste: *Symptom → Seite → Schwere
  (P0–P3) → Fix*.

## 6 — Funnel- & Event-Spec (First 100)

Nur echte, bereits gefeuerte Events. **Keine Gesundheitswerte in Analytics**
(nur Ereignis-Metadaten; Privacy-Klasse pro Zeile).

| Funnel-Stufe | Event | Warum es zählt | Privacy |
|---|---|---|---|
| Acquisition | `pageview_home` | Reichweite / Einstieg | anonym |
| Interesse | `score_start_click` | Hook funktioniert | anonym |
| Score-Start | `check_started` | Einstiegs-Friktion | anonym |
| Score-Ende | `check_completed` | Erste-Wow-Abschluss | anonym |
| First Value | `map_view` | Performance Map erreicht | anonym |
| Commitment | Account erstellt | Wert→Konto-Brücke | pseudonym |
| Aktivierung | `action_complete` | Erste echte Ausführung | pseudonym |
| Tages-Loop | `day_closed` | Tägliche Nutzung | pseudonym |
| Wochen-Loop | `weekly_review` | Adaptions-Loop | pseudonym |
| Proof | `proof` | Messbarer Fortschritt | pseudonym |
| Monetarisierung | `checkout_started → order_completed` | Zahlungs-CVR | pseudonym |

**Verboten in Properties:** Laborwerte, Testosteron, sexuelle Gesundheit,
Medikamente, Stack-Inhalte, Fotos, Diagnosen. Nur Stufe/Route/Zeitstempel.

## 7 — 10 Stranger-Test-Skripte (Founder-geführt, Welle 0/1)

Ohne Erklärung vorab. Nutzer laut denken lassen.

1. „Ohne dass ich etwas erkläre — was macht dieses Produkt?" *(10-Sek-Test)*
2. „Wo würdest du zuerst klicken?"
3. „Lies die Startseite 10 Sekunden — für wen ist das?"
4. „Starte den Score. Sag mir laut, wenn dich eine Frage nervt oder unklar ist."
5. „Du hast dein Ergebnis. Was ist dein größter Engpass — und was sollst du zuerst tun?"
6. „Schau die Performance Map an. Was hat MaleMetrix über dich gelernt?"
7. „Was glaubst du, bekommst du für 49 €?"
8. „Warum würdest du morgen wieder aufmachen?"
9. „Was hier vertraust du **nicht**? Was fehlt dir an Vertrauen?"
10. „Warum das statt einfach ChatGPT oder einer Tracking-App?"

**Auswertung je Skript:** verstanden / gezögert / falsch verstanden — plus
wörtliches Zitat. Drei gleiche Fehl-Antworten auf dieselbe Frage = P1.

## 8 — Abbruch-Hypothesen (worauf gezielt achten)

Die zehn wahrscheinlichen Weggeh-Gründe (§41) — jeweils das Gegen-Signal:

- „Verstehe ich nicht" → Skript 1/3 scheitert → Homepage/Score-Copy.
- „Zu viel" → Zögern in der Map / Today → Progressive Disclosure schärfen.
- „Zu viel Setup" → Abbruch vor `action_complete` → Time-to-Value kürzen.
- „Generisch" → Skript 5/6 falsch → Personalisierung sichtbarer machen.
- „Kein Grund zurückzukommen" → kein D1/D7-Return → Loop sichtbarer machen.
- „Vertraue nicht" → Skript 9 → Trust/Privacy prominenter.
- „Warum zahlen" → kein `checkout_started` → 49 €-Wert vor Paywall zeigen.

## 9 — Erfolgs-Schwelle für „skalieren"

Welle 1+2 gelten als grün, wenn (Hypothesen, kein Fakt):
- ≥ 70 % schließen den Score ab.
- ≥ 35 % Aktivierung (erste bedeutsame Aktion).
- ≥ 25 % D7-Return **mit** Aktion.
- 0 unbehobene P0, keine wiederkehrenden P1 aus den Skripten.

Erst dann bezahlter Traffic / Welle 3.
