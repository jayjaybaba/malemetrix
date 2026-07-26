# .well-known

Dieses Verzeichnis wird von GitHub Pages nur ausgeliefert, weil im Wurzel-
verzeichnis eine leere Datei `.nojekyll` liegt. Ohne sie filtert Jekyll alle
Pfade heraus, die mit einem Punkt beginnen. Beide Dateien gehören zusammen —
wird eine gelöscht, funktioniert die Domain-Verifizierung nicht mehr.

## Wofür

Falls Apple Pay später direkt über PayPal statt über die Stripe-Bezahlseite
laufen soll, verlangt Apple einen Nachweis, dass die Domain dir gehört. PayPal
stellt dafür im Händler-Dashboard eine Datei bereit
(`apple-developer-merchantid-domain-association`, ohne Dateiendung). Sie muss
unverändert hier liegen und unter

    https://www.malemetrix.com/.well-known/apple-developer-merchantid-domain-association

erreichbar sein.

Der Vorteil dieses Wegs: Apple Pay liefe dann durch dieselbe PayPal-Bestellung
wie heute, das heißt der Zugang würde automatisch und sofort freigeschaltet.
Der Aufwand ist höher — es braucht ein PayPal-Konto mit freigeschaltetem Apple
Pay und eine eigene Integration im Frontend.

Der aktuell eingebaute Weg über Stripe braucht diese Datei NICHT.
