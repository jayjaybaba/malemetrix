# Kalender-Voraussicht — ehrliche Status-Klassifikation (Phase 7)

## Was HEUTE funktioniert (ohne externe Config)
- Busy/Free-Store `os_busy` — nur {date, start, end, source}, NIE Titel (§81).
- .ics-Import in den Einstellungen: parst ausschließlich DTSTART/DTEND der
  nächsten 21 Tage, verwirft SUMMARY/DESCRIPTION ungelesen (§179/§251).
- Konflikt-Engine: geplante Session × belegte Fenster (§82).
- Beste Ausweichfenster: frei × Nähe zur Präferenz (§83).
- Wochen-Autopilot: Konflikte der NÄCHSTEN Woche vor Wochenstart + ACCEPT WEEK
  (nur Reschedules/Zeitfenster — §57-sichere Ausführungs-Präferenzen).

## CONFIG REQUIRED
Google Calendar busy/free via OAuth: Edge-Function-Seam vorgesehen
(Token NUR serverseitig, §168; Disconnect löscht Token, §169). Nicht gebaut,
bis OAuth-Credentials existieren — kein Fake-„Verbunden“.
Apple: ehrlich via ICS-Import/Abo — kein direkter Privat-API-Zugriff im Web.
