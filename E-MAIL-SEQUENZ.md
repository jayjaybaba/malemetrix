# Die E-Mail-Strecke nach dem Score

Diese Datei ist kein Code. Sie ist der Text, der aus einer E-Mail-Adresse
Umsatz macht. Ohne sie ist die Liste eine Liste; mit ihr ist sie ein Kanal.

## Wo die Adressen herkommen

Am Ende des Scores (`js/check.js`, Block `#scoreLead`) stehen zwei getrennte
Dinge:

1. **Die Auswertung zuschicken.** Das ist die Erfüllung dessen, was der
   Besucher angefordert hat. Dafür braucht es keine Werbeeinwilligung.
2. **Das Häkchen darunter.** Freiwillig, nicht vorangekreuzt. Nur wer es
   setzt, wird über `MM.subscribe()` in die Liste eingetragen und darf die
   Strecke unten bekommen. Der Zeitpunkt der Einwilligung geht mit der
   Benachrichtigung raus und ist damit nachweisbar.

Wer nicht zugestimmt hat, bekommt genau eine Mail: sein Ergebnis. Punkt.
Diese Trennung ist keine Förmlichkeit — eine Abmahnung wegen unerlaubter
Werbe-E-Mail kostet mehr, als die Strecke in den ersten Monaten einbringt.

## Vorbereitung in Brevo (einmalig, ca. 20 Minuten)

1. Konto auf brevo.com (kostenlos bis 300 Mails/Tag — reicht für den Anfang).
2. Liste anlegen, z. B. „Score-Leads".
3. Formular anlegen, Double-Opt-In aktivieren. Die `action`-URL des Formulars
   (beginnt mit `https://....sibforms.com/serve/...`) in `js/config.js` unter
   `brevoFormAction` eintragen. Ab dann landen die Adressen direkt dort statt
   im Postfach.
4. Automation anlegen: Auslöser „Kontakt tritt Liste bei" → die sieben Mails
   unten mit den angegebenen Abständen.

## Das Prinzip

Sechs Mails erklären, eine verkauft. Das ist kein Anstand, das ist Rechnung:
Wer bei Mail 1 verkauft bekommt, meldet sich bei Mail 2 ab, und dann ist die
Adresse für immer verbrannt. Die 99 € entstehen bei Mail 7, weil Mail 1 bis 6
bewiesen haben, dass du weißt, wovon du redest.

Jede Mail hat genau ein Thema und endet mit einem Satz, der die nächste
ankündigt. Das ist der einzige Grund, warum jemand Mail 3 öffnet.

---

## Mail 1 — sofort · „Dein Ergebnis"

**Betreff:** Dein MaleMetrix Score: [SCORE]/100

Das ist die Mail, die er angefordert hat. Sie liefert, und sie liefert nur.

- Score, Level, Archetyp, primärer Engpass
- Die sieben Modulwerte als Liste
- Der 7-Tage-Plan
- Ein Satz zum Engpass: warum ausgerechnet der zuerst kommt
- Kein Angebot. Kein Link zum Protokoll. Nichts.

Letzter Satz: *„Morgen schreibe ich dir, warum fast jeder am falschen Ende
anfängt — und woran du merkst, ob du dazugehörst."*

## Mail 2 — Tag 1 · „Warum die meisten am falschen Ende anfangen"

Das häufigste Muster: Es wird an dem gearbeitet, was am sichtbarsten ist,
nicht an dem, was am meisten bremst. Training, wenn der Schlaf das Problem
ist. Supplemente, wenn die Kalorien das Problem sind.

Ein konkretes Beispiel aus deiner eigenen Erfahrung. Keine Studie, keine
Theorie — eine Geschichte, in der er sich wiedererkennt.

Letzter Satz kündigt Mail 3 an.

## Mail 3 — Tag 3 · „Der Engpass"

Jetzt persönlich: sein Engpass aus dem Score. Was dahintersteckt, woran man
ihn erkennt, was die ersten zwei Wochen daran ändern.

Hier zeigt sich, ob die Liste segmentiert ist. In Brevo lässt sich der
Engpass als Kontaktfeld speichern; dann bekommt jeder die Version für seinen
Engpass. Das ist der größte Einzelhebel der ganzen Strecke — der Unterschied
zwischen „eine Mail an alle" und „er denkt, du meinst ihn".

## Mail 4 — Tag 6 · „Was messbar ist, ändert sich"

Warum Messen der Unterschied zwischen Versuch und System ist. Der Tracker
und die Rechner sind kostenlos — Link dorthin.

Diese Mail verkauft nichts und gibt trotzdem etwas her. Sie ist der Beweis,
dass die Liste nicht nur ein Verkaufskanal ist.

## Mail 5 — Tag 10 · „Der Fehler, der mich zwei Jahre gekostet hat"

Deine Geschichte. Ehrlich, mit Zahlen, mit dem Teil, der unangenehm ist.

Das ist die Mail, nach der Menschen kaufen — nicht wegen des Angebots,
sondern weil sie ab hier glauben, dass du weißt, wovon du redest. Sie ist
die wichtigste der Strecke. Nimm dir für sie mehr Zeit als für die anderen
sechs zusammen.

## Mail 6 — Tag 14 · „Was du in zwölf Wochen wirklich verändern kannst"

Realistische Erwartung statt Versprechen. Was sich in 12 Wochen ändern lässt
und was nicht. Wo die Grenze zum Arzt verläuft.

Am Ende zum ersten Mal ein Hinweis, kein Verkauf: *„Genau diesen Weg habe
ich aufgeschrieben. Morgen erzähle ich dir, was drinsteht."*

## Mail 7 — Tag 15 · „DAS PROTOKOLL"

Jetzt das Angebot, und zwar vollständig:

- Was drin ist — zehn Kapitel, konkret benannt
- Das 12-Wochen-Programm
- 99 €, einmalig, kein Abo
- 30 Tage Geld zurück
- Ein klarer Link

Ein einziges Angebot. Keine Dringlichkeit, die nicht echt ist — ein
erfundener Countdown kostet dich genau die Leute, die sonst gekauft hätten.

## Danach

Eine Mail pro Woche, dauerhaft. Thema, nicht Verkauf. Etwa jede sechste
darf ein Angebot sein. Wer nach acht Wochen nicht gekauft hat, kauft
vielleicht im vierten Monat — aber nur, wenn er die Mails bis dahin noch
öffnet.

## Was das rechnerisch bedeutet

Bei 3–5 % Kaufquote auf die Liste (üblich für eine gute Strecke bei diesem
Preis) braucht es rund **25.000 bis 33.000 Adressen im Jahr** für 1.000
Verkäufe. Das ist die eigentliche Zahl hinter dem 100.000-€-Ziel — nicht die
Verkäufe, sondern die Adressen davor.

Realistisch im ersten Jahr: 2.000 bis 5.000 Adressen. Daraus 60 bis 250
Verkäufe. Das ist der Grund für die Einschätzung, dass 100.000 € eher im
zweiten Jahr liegen.
