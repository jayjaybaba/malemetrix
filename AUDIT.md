# AUDIT — MaleMetrix als Produkt, nicht als Feature-Sammlung

Stand: 07.08.2026. Adversarieller Audit des tatsaechlichen Codes, danach
Umsetzung der P0-Punkte. Sicherungspunkt vor allen Aenderungen:
Branch `backup/app-v1-vor-audit`.

---

## Die erste Frage: warum MaleMetrix statt ChatGPT, MacroFactor, Hevy, Whoop?

Die ehrliche Antwort auf den Stand **vor** diesem Audit lautete: **kaum ein
Grund.** Nicht weil das Produkt schlecht gebaut war — der Planmotor ist
sauber, deterministisch und getestet — sondern weil er das Kernversprechen
nicht eingeloest hat.

„MaleMetrix entscheidet, was du als Naechstes tun solltest" war zum Zeitpunkt
des Audits **einmal pro Woche** wahr und **an sechs von sieben Tagen falsch**.
Der Today-Screen war eine Projektion des Plans auf den heutigen Wochentag.
Tag 31 sah exakt aus wie Tag 3, solange derselbe Wochentag war — unabhaengig
davon, ob der Nutzer die letzten drei Tage ausgelassen, schlecht geschlafen
oder die Woche perfekt durchgezogen hatte.

Damit war MaleMetrix ein sehr gut gebauter **Plan-Renderer**. MacroFactor
adaptiert taeglich. Whoop interpretiert taeglich. Genau dort lag die Luecke.

### Was tatsaechlich verteidigbar ist

Nach den Aenderungen dieses Audits ist der unfair advantage nicht „Kombination
von Funktionen", sondern eine Haltung, die in Code steht und die die Konkurrenz
strukturell nicht kopieren kann, ohne ihr Geschaeftsmodell zu beschaedigen:

> **MaleMetrix trennt Ergebnis von Ausfuehrung und weigert sich, ein
> Ausfuehrungsproblem als Koerperproblem zu behandeln.**

Konkret: Wer stagniert und den Plan zu 48 % ausfuehrt, bekommt bei MaleMetrix
**keine** Kalorienkuerzung — sondern den Satz, dass zuerst die Ausfuehrung
zaehlt. Jede engagement-getriebene App tut das Gegenteil, weil „wir haben
deinen Plan angepasst" sich nach Fortschritt anfuehlt und „aendere erst dein
Verhalten" sich nach Vorwurf anfuehlt. Das ist kein Feature, das man in einer
Woche nachbaut — es ist eine Entscheidung gegen kurzfristige Engagement-
Metriken.

Zweiter Punkt, gleiche Familie: **Nach einem Ausfall wird nichts nachgeholt.**
Kein Strafcardio, kein tieferes Defizit, keine verlorene Streak. Die haeufigste
Abbruchursache ist nicht der schlechte Tag, sondern die Kompensation danach.

---

## PHASE 1 — Audit

Bewertung des Standes **vor** diesem Audit. „Nachher" nennt den Stand nach den
in diesem Dokument umgesetzten Aenderungen.

| Bereich | Stand vorher | /10 | Problem | Umsetzung | Prio | /10 nachher |
|---|---|---|---|---|---|---|
| **Differenzierung** | Plan-Renderer mit Wochenregel | 4 | Versprechen „entscheidet taeglich" nicht eingeloest | Tages-Entscheidungsschicht `decide.js` | **P0** | 8 |
| **Today** | statische Projektion des Plans | 5 | Tag 31 = Tag 3; keine Reaktion auf Verhalten | Tagesauftrag mit Modus, Fokus, Begruendung | **P0** | 8 |
| **Decision Engine** | 9 Regeln, woechentlich, Selbstauskunft | 6 | Case A/B nur aus „gut/mittel/schlecht" | gemessene Ausfuehrung ueberstimmt Selbstbild | **P0** | 9 |
| **Execution vs. Outcome** | nicht getrennt | 2 | Nutzer haelt Umsetzungsproblem fuer Planproblem | Execution Score aus dem Tagesprotokoll | **P0** | 9 |
| **Adaptivitaet** | 1× pro Woche | 4 | zwischen den Checks passiert nichts | taeglich + „never miss twice" | **P0** | 8 |
| **Life Happens** | nicht vorhanden | 1 | Restaurant/30 Min/Reise/krank: kein Weg | „Heute passt nicht" mit 5 definierten Faellen | **P0** | 7 |
| **Rescue Mode** | nicht vorhanden | 0 | nach 3 Tagen Pause: derselbe Plan wie immer | Wiedereinstiegsmodus ohne Kompensation | **P0** | 8 |
| **Prediction** | nicht vorhanden | 0 | Nutzer sieht nie, wohin sein Verhalten fuehrt | Trajectory aus gemessener Rate | **P1** | 7 |
| **Intervention Tracking** | Planversionierung ohne Bewertung | 3 | Aenderung ohne Erfolgskriterium | Maßnahme mit Pruefdatum, eine Variable | **P1** | 7 |
| **Erklaerbarkeit** | Wochencheck begruendet, sonst nichts | 5 | tägliche Vorgaben unbegruendet | jede Tagesentscheidung traegt ihr „warum" | **P0** | 8 |
| **12-Week Engine** | deterministisch, getestet, sauber | 8 | — | unveraendert | — | 8 |
| **Training** | Runner mit Progression aus letztem Mal | 7 | Autoregulation fehlte | Volumen sinkt bei 2 Erholungssignalen | P1 | 8 |
| **Nutrition** | Bausteine + Einkaufsliste, deterministisch | 7 | kein Restaurant-/Unterwegs-Modus | Auswaerts-Modifier (Verteilung statt Verzicht) | P1 | 7 |
| **Progress** | Gewicht, Trend, Training geplant/absolviert | 6 | nur Ergebnis, keine Ausfuehrung | Execution-Karte + Trajectory | **P0** | 8 |
| **Weekly Check** | 9 Regeln, ehrlich, „keep" erlaubt | 8 | Selbstauskunft als einzige Quelle | Messung als Korrektiv | P1 | 9 |
| **Health Integration** | TDEE mit Leitplanken | 7 | Schlaf/HRV/Schritte gelesen, ohne Konsequenz | Erholungssignal steuert Volumen; Schritte zaehlen in den Score | **P0** | 8 |
| **Notifications** | 2 lokale Erinnerungen | 6 | generisch, nicht kontextbezogen | unveraendert (P2) | P2 | 6 |
| **Native UX** | Haptik, Statusleiste, Splash, Health | 7 | kein Widget, keine Live Activity | bewusst spaeter | P3 | 7 |
| **Design** | eigenes Token-System, ruhig, dunkel | 7 | Today war Liste statt Auftrag | Auftrag oben, Begruendung als Randnotiz | P1 | 8 |
| **Performance** | statisch, offline, kein Build | 9 | — | unveraendert | — | 9 |
| **Reliability** | 47 Suiten, 4169 Assertions | 9 | Entscheidungsschicht fehlte in Tests | +80 Assertions, adversariell | — | 9 |
| **Privacy** | local-first, Fotos bleiben lokal | 9 | — | Modifier bleiben lokal, 30-Tage-Verfall | — | 9 |
| **Retention** | Wochencheck als einziger Rueckkehrgrund | 4 | nichts fuer Tag 2, 30, 60 | taeglicher Auftrag + Trajectory + Rescue | **P0** | 7 |
| **Monetization** | Website-Kauf, App kaufsfrei | 5 | Premium-Grenze undefiniert | bewusst offen (siehe unten) | P2 | 5 |
| **Lifecycle nach Tag 84** | Abschlussbildschirm | 3 | kein Anschluss | bewusst offen (P2) | P2 | 3 |
| **Onboarding** | Transformation → Score → 7 Fragen → Plan | 7 | Wow-Moment kommt spaet, aber er kommt | unveraendert | P2 | 7 |
| **Copilot** | nicht vorhanden | 0 | — | bewusst NICHT gebaut (Begruendung unten) | P3 | 0 |

---

## PHASE 2 — Die unbequemen Antworten

**1 · Was war das schwaechste Element?**
Der Today-Screen. Er war das Herz der App und hat nichts entschieden. Er hat
den Plan auf den Wochentag projiziert. Das ist eine Kalenderfunktion.

**2 · Was wirkte wie ein Prototyp?**
Nichts sah wie ein Prototyp aus — das war das Problem. Alles war fertig
gebaut und funktionierte, aber die Teile redeten nicht miteinander. Das
Tagesprotokoll wusste, dass drei Tage fehlten. Der Today-Screen wusste es nicht.

**3 · Feature-Theater?**
Der Health-Abschnitt zeigte Schritte, Schlaf, HRV und Ruhepuls — und keiner
dieser Werte hat je eine Entscheidung veraendert. Nur der Tagesverbrauch tat
es. Vier von fuenf Werten waren Dekoration. Jetzt steuern Schlaf/HRV/Ruhepuls
das Trainingsvolumen und Schritte zaehlen in den Execution Score.

**4 · Wo wurden Daten ohne Konsequenz gesammelt?**
Tagesprotokoll (Haekchen), Tagesabschluesse, Workout-Verbesserungen,
Health-Werte ausser TDEE. Das Tagesprotokoll war der teuerste Fall: der
Nutzer pflegte es taeglich, und es beeinflusste exakt nichts.

**5 · Was unterscheidet MaleMetrix heute wirklich?**
Die Weigerung, ein Ausfuehrungsproblem als Koerperproblem zu behandeln — und
die Weigerung, nach einem Ausfall kompensieren zu lassen. Beides steht als
Regel im Code, nicht als Marketingtext.

**6 · Was ist in einer Woche kopierbar?**
Execution Score: trivial. Trajectory: trivial. Der Tagesauftrag als UI: eine
Woche. **Nicht kopierbar in einer Woche** ist die Regelmatrix mit ihren
bewussten Nicht-Reaktionen — weil sie gegen die Engagement-Interessen der
meisten Anbieter laeuft. Wer bei Plateau nichts aendert, hat einen schlechteren
Wochenbericht.

**7 · Wo entsteht langfristiger Vorteil?**
Im Intervention-Log. Nach zwoelf Wochen weiss MaleMetrix, welche Maßnahme bei
diesem Nutzer gewirkt hat und welche nicht — pro Nutzer, mit Ausgangswert und
Ergebnis. Das ist die Grundlage fuer alles Weitere und wurde in dieser Runde
angelegt.

**8 · Was wuerde ich nach einer Woche vermissen?**
Den Satz „heute zaehlt nur, dass du anfaengst" nach drei verpassten Tagen.
Jede andere App zeigt an dieser Stelle eine verlorene Streak.

**9 · Warum das Abo nach drei Monaten behalten?**
Aktuell: kein zwingender Grund — die Monetarisierung ist noch nicht definiert.
Ehrlich benannt statt schoengeredet (siehe Offene Punkte).

**10 · Was erzaehlt ein Nutzer weiter?**
„Ich hab drei Tage nichts gemacht, und die App hat nicht gemeckert, sondern
den Tag kleiner gemacht." Das ist die Geschichte.

**11 · Drei Funktionen, deren Entfernung nichts kostet?**
Die 19 Rechner in der App (Website-Funktion, kein App-Nutzen), das Haekchen
„Meal-Prep" (Kalendereintrag genuegt), der Foto-Chip an festen Tagen
(gehoert in den Fortschritt).

**12 · Drei fehlende Funktionen mit grossem Hebel?**
Umgesetzt: Execution Score, taeglicher Auftrag, Rescue. Noch offen: der
Anschluss nach Tag 84.

**13 · Zu viel UX-Komplexitaet?**
Der Wochencheck fragt sieben Dinge, von denen die App vier schon weiss.
Teilweise vorbefuellt, aber noch nicht konsequent.

**14 · Zu wenig Intelligenz?**
War: ueberall ausserhalb des Wochenchecks. Jetzt: im Trainingsinneren — die
Progression schlaegt vor, ohne zu wissen, wie die letzten Wochen liefen.

**15 · Wo wurde Personalisierung behauptet?**
Nirgends unehrlich. Der Plan ist wirklich aus 12+ Eingaben gerechnet. Aber er
war nach Tag 1 eingefroren — personalisiert heisst nicht adaptiv.

**16 · Wo wirkt KI dekorativ?**
Nirgends: Es gibt keine KI in Generation 2, und das steht so in
`PRODUCT_ARCHITECTURE.md`. Das ist eine Staerke, kein Mangel.

**17 · Welche Entscheidung sollte die App treffen statt der Nutzer?**
„Soll ich heute trotz schlechtem Schlaf trainieren?" — jetzt beantwortet.
„Wie steige ich nach einer Woche Pause wieder ein?" — jetzt beantwortet.

**18 · Was koennte automatisch erfasst werden?**
Schritte (jetzt aus Health), Gewicht (Health, noch offen), absolvierte
Workouts (Health-Workouts, noch offen).

**19 · Wann soll MaleMetrix bewusst NICHT reagieren?**
Ein verpasster Tag. Eine schlechte Nacht. Vier Tage Stillstand. Ein Plateau
bei schlechter Ausfuehrung. Eine Reisewoche. Alle fuenf sind als Test
festgeschrieben.

**20 · Warum in 12 Monaten noch relevant?**
Weil das Intervention-Log dann pro Nutzer weiss, was gewirkt hat — und weil
ein System, das bewusst nicht reagiert, mit der Zeit vertrauenswuerdiger wird
statt nerviger.

---

## PHASE 3 — Produktthese

> **MaleMetrix ist** ein Entscheidungssystem, das aus Zielbild, Diagnose und
> gemessener Ausfuehrung jeden Tag genau eine Handlung ableitet — und
> begruendet, warum gerade diese.
>
> **MaleMetrix ist NICHT** ein Tracker, kein Kalorienzaehler, kein
> Trainingslogbuch mit Charts und keine KI, die Gesundheitsaussagen erfindet.
>
> **Unser Core Loop ist:** gemessene Ausfuehrung → Interpretation (Ergebnis
> getrennt von Verhalten) → genau eine Entscheidung → ein Tagesauftrag →
> Ausfuehrung → zurueck zur Messung.
>
> **Unser unfair advantage ist**, dass wir uns weigern, ein
> Ausfuehrungsproblem als Koerperproblem zu behandeln, und nach einem Ausfall
> nichts nachholen lassen — beides gegen das kurzfristige Engagement-Interesse.
>
> **Nutzer empfehlen MaleMetrix weiter, weil** die App nach drei verpassten
> Tagen den Tag kleiner macht statt eine Streak zu loeschen.

---

## PHASE 4/5/6 — Was in dieser Runde gebaut wurde

Neu: `js/simple/decide.js` (rein, ohne DOM, ohne Storage, 4 Funktionen).

| Baustein | Was er entscheidet | Leitplanke |
|---|---|---|
| `executionScore` | Wie gut wird der Plan ausgefuehrt? Training 40 %, Ernaehrung 30 %, Schritte 20 %, Wiegen 10 % | Der heutige Tag zaehlt nicht mit. Gemessene Schritte schlagen das Haekchen. Am Starttag: `null`, keine erfundene 0. |
| `dailyPrescription` | Modus des Tages: normal / deload / recover / short / reentry / rest | Gemeldete Umstaende schlagen Messwerte. Ein Signal loest nichts aus, zwei schon. |
| `trajectory` | Wohin fuehrt das Verhalten? | Rechnet mit der **gemessenen** Rate. Bei Stillstand oder falscher Richtung: **kein** Datum statt einer Fantasiezahl. |
| `reviewIntervention` | Hat die letzte Maßnahme gewirkt? | Bei Ausfuehrung < 70 % lautet das Urteil „nicht bewertbar" — nicht „gewirkt" oder „nicht gewirkt". |

Angebunden: Today (Auftrag + Begruendung + „Heute passt nicht"), Fortschritt
(Execution-Karte + Trajectory), Wochencheck (Messung ueberstimmt Selbstbild).

### Die vier Regeln, die im Code stehen

1. **Ergebnis ≠ Ausfuehrung.** Unter 70 % wird der Plan nicht verschaerft.
2. **Never miss twice.** Ein Tag: kein Wort. Zwei: ein Satz. Drei: Wiedereinstieg.
3. **Keine Kompensation.** Nach dem Ausfall wird der Tag kleiner, nicht groesser.
4. **Eine Variable.** Eine Maßnahme, ein Pruefdatum, dann Urteil.

---

## PHASE 7 — Adversarielle QA

Alle folgenden Faelle sind als Test festgeschrieben
(`tools-dev/tests/decide.test.js`, 80 Assertions):

| Situation | Was ein naives System tut | Was MaleMetrix tut |
|---|---|---|
| Plateau + 48 % Umsetzung | Kalorien kuerzen | nichts aendern, Luecke benennen |
| Plateau + Selbstauskunft „gut", Messung 48 % | Kalorien kuerzen | nichts aendern, beide Zahlen zeigen |
| Abnahme 1,6 kg/Woche + Kraftverlust | weiter kuerzen | Kalorien **hoch** |
| Eine schlechte Nacht | Trainingsplan umbauen | gar nichts |
| Zwei Erholungssignale | Training streichen | ein Satz weniger, Last bleibt |
| Ein verpasster Tag | Streak-Warnung | kein Wort |
| Sechs Tage Pause | Nachholplan | kleinerer Tag, kein Nachholen |
| Urlaubswoche | Plan neu berechnen | Plan unveraendert |
| Krank + gute Health-Werte | „Du koenntest trainieren" | Meldung schlaegt Messung |
| Stillstand | „Ziel in 200 Wochen" | kein Datum |

---

## PHASE 8 — Bewertung

| Dimension | vorher | nachher | Begruendung fuer die Luecke zu 10 |
|---|---|---|---|
| Product Differentiation | 4 | **8** | Die Haltung steht im Code. Fehlt: das Lernen ueber Zyklen hinweg. |
| User Value | 6 | **8** | Taeglich nutzbar. Fehlt: Ernaehrungserfassung fuer Flexible-Esser. |
| Daily Usefulness | 5 | **8** | Der Auftrag steht ohne Scrollen. Fehlt: Widget. |
| Personalization | 6 | **7** | Plan personalisiert, Reaktion personalisiert. Fehlt: Lernen aus Historie. |
| Adaptivity | 4 | **8** | Taeglich + woechentlich + Maßnahmenbewertung. |
| Retention | 4 | **7** | Rescue Mode ist der Hebel. Fehlt: Anschluss nach Tag 84. |
| UX | 6 | **7** | Ein Auftrag, drei Aufgaben, eine Begruendung. Nicht auf echtem Geraet erprobt. |
| Design | 7 | **8** | Ruhig, eigene Tokens. Nicht unverwechselbar genug ohne Logo. |
| Engineering Quality | 8 | **9** | Pure Module, 4251 Assertions, adversarielle Tests. |
| Trust | 8 | **9** | Jede Entscheidung begruendet, jede Nicht-Entscheidung auch. |
| Recommendation Potential | 4 | **7** | Es gibt jetzt eine erzaehlbare Geschichte. |
| **Overall** | **5** | **7,8** | |

Keine 10 irgendwo, und das ist ehrlich: Nichts davon lief bisher auf einem
echten iPhone mit echten Daten ueber echte Wochen.

---

## Bewusst NICHT gebaut — mit Begruendung

| Idee | Einstufung | Warum nicht |
|---|---|---|
| **Copilot / LLM-Chat** | D (jetzt) | `PRODUCT_ARCHITECTURE.md` §11: kein KI-Aufruf in Gen 2. Ein Chat, der Plaene aendert, waere die groesste Angriffsflaeche fuer falsche Gesundheitsaussagen — und die fuenf haeufigsten Anliegen („nur 30 Minuten", „auswaerts", „unterwegs", „krank") sind jetzt als deterministische Knoepfe geloest, schneller als jeder Chat. Ein Copilot ist erst sinnvoll, wenn die Regeln nicht mehr reichen. |
| **Future You / Foto-Zielbild** | C | Die Transformation zeigt bereits zwei realistische Zielbilder. KI-generierte Koerperbilder waeren ein Versprechen, das medizinisch nicht haltbar ist. |
| **Transformation Reel / Social** | C | Erst wenn echte Nutzer echte 84 Tage abgeschlossen haben. Vorher waere es ein Feature ohne Inhalt. |
| **Streaks** | D | Ausdruecklich verworfen. Die Execution-Quote ueber 14 Tage ersetzt sie und bestraft einen einzelnen Tag nicht. |
| **Readiness-Zahl (0–100)** | C | Eine Zahl aus HRV + Schlaf + Ruhepuls suggeriert Praezision, die die Daten nicht hergeben. Stattdessen: zwei Signale → eine Konsequenz, benannt. |
| **What-If-Simulator** | C | Interessant, aber der Trajectory-Block beantwortet die Kernfrage („wohin fuehrt das?") bereits. Ein Simulator ohne validierte Rate waere Kaffeesatz. |
| **Widget / Live Activity** | B, spaeter | Echter Nutzen, aber erst sinnvoll, wenn der Tagesauftrag auf echten Geraeten erprobt ist. |
| **Netzwerkeffekt / anonyme Muster** | P3 | Architektur schliesst es nicht aus (Intervention-Log ist strukturiert). Umsetzung braucht Einwilligung und Nutzerzahl. |

## Offene Punkte, die ich nicht verschweige

1. **Nichts davon lief auf einem echten iPhone.** Simulator und Unit-Tests
   beweisen Logik und Start, nicht Alltagstauglichkeit.
2. **Anschluss nach Tag 84** fehlt weiterhin (Abschlussbildschirm ohne
   Fortsetzung). Das ist der groesste verbleibende Retention-Hebel.
3. **Monetarisierung** ist undefiniert. Die App enthaelt bewusst keine
   Kaeufe (Richtlinie 3.1.1); womit sie langfristig Geld verdient, ist eine
   Produktentscheidung, keine technische.
4. **Ernaehrungserfassung** existiert nur als Bausteine. Wer flexibel isst,
   hat in MaleMetrix keinen Weg — das ist die groesste Funktionsluecke.
5. **Der Execution Score haengt an Haekchen.** Training und Ernaehrung sind
   selbst bestaetigt. Erst Health-Workouts und eine echte Mahlzeitenerfassung
   machen ihn faelschungssicher.
