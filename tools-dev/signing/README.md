# Signierung ohne App-Store-Connect-API-Schluessel

## Warum es diesen Weg gibt

Der Download des `.p8`-API-Schluessels schlaegt bei Apple mit
„Es ist ein Fehler aufgetreten" fehl — reproduzierbar ueber zwei Tage,
mit mehreren Schluesseln, auf Team- wie Individualebene. Der Weg ueber
`.github/workflows/ios-app.yml` (Job `release`) haengt an genau dieser
Datei und ist damit blockiert.

Dieser Weg braucht sie nicht. Er benutzt ausschliesslich Dateien, die
ueber **normale HTTP-Downloads** kommen (developer.apple.com liefert
`.cer` und `.mobileprovision` als gewoehnliche Dateien, nicht ueber den
kaputten XHR-Mechanismus von App Store Connect) und ein
**app-spezifisches Passwort**, das Apple als Text anzeigt — also gar
keinen Download.

## Was hier liegt

| Datei | Was es ist | Vertraulich? |
|---|---|---|
| `MaleMetrix.certSigningRequest` | Zertifikatsanfrage: enthaelt den **oeffentlichen** Schluessel und den Namen. | Nein |
| `MaleMetrix.cer` | Von Apple ausgestelltes Zertifikat. Oeffentlich per Definition. | Nein |
| `MaleMetrix.mobileprovision` | Bereitstellungsprofil: Team-ID, App-ID, Berechtigungen, oeffentliches Zertifikat. | Kaum — ohne den privaten Schluessel wertlos |

**Der private Schluessel liegt NICHT hier** und darf hier nie liegen. Er
gehoert ausschliesslich in das Repository-Secret `IOS_SIGNING_KEY`.

## Sicherheitseinordnung

Ein Verteilungszertifikat kann genau eine Sache: Apps im Namen dieses
Kontos signieren. Es kann keine Kaeufe taetigen, keine Nutzerdaten lesen,
keine App veroeffentlichen und keine Kontoeinstellungen aendern — anders
als der `.p8`-Schluessel, der die gesamte App-Store-Connect-API oeffnet.

Es ist jederzeit widerrufbar: developer.apple.com → Certificates →
Zertifikat auswaehlen → Revoke. Danach ist jede damit erzeugte Signatur
fuer neue Builds wertlos.

## Wenn der `.p8`-Download irgendwann doch funktioniert

Dann ist `ios-app.yml` der bessere Weg: Xcode legt Zertifikate und
Profile selbst an und erneuert sie, wenn sie ablaufen. Dieser Weg hier
verlangt in einem Jahr eine Handverlaengerung.
