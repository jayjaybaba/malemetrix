# Instagram-Comment-Funnel

Kommentar unter einem Beitrag → automatisch **eine** Direktnachricht mit dem
passenden Link → Lead in der eigenen Datenbank → Gespräch von Hand.

Verwaltung: **My MaleMetrix → Einstellungen → Betreiber → Instagram-Funnel**
(`#insta`, nur für den Konto-Inhaber).

---

## Was hier bewusst NICHT gebaut ist

Die ursprüngliche Anforderung war, *alle* Nutzer und Besucher der Instagram- und
TikTok-Seite anzuschreiben — jeden, der liked oder kommentiert. Das ist nicht
umgesetzt, und zwar nicht aus Bequemlichkeit:

| Wunsch | Warum nicht |
|---|---|
| Alle **Liker** anschreiben | Weder Instagram noch TikTok geben die Liste der Liker über eine API heraus. Sie wäre nur durch Automatisierung des eingeloggten Kontos zu bekommen — genau das, wofür Konten gesperrt werden (Instagram Platform Policy). |
| Alle **Profilbesucher** anschreiben | Diese Daten existieren für Drittsysteme nicht. Instagram zeigt Besucherzahlen nur aggregiert in den eigenen Insights, nie als Personenliste. |
| **TikTok**-Nutzer automatisch anschreiben | TikTok hat keine öffentliche Direktnachrichten-API. Jede Automatisierung dort ist Konto-Automatisierung und verstößt gegen die Nutzungsbedingungen. |
| Unaufgeforderte Werbe-DMs | In Deutschland unzumutbare Belästigung nach **§ 7 UWG** — abmahnfähig, unabhängig von der Plattform, unabhängig davon ob E-Mail, SMS oder DM. |

Was Meta ausdrücklich **erlaubt**, ist die **Private Reply**: die automatische
Antwort auf einen Kommentar. Genau eine Nachricht pro Kommentar, innerhalb von
7 Tagen. Antwortet der Empfänger, öffnet sich ein 24-Stunden-Fenster für eine
echte Unterhaltung — die führt ein Mensch, nicht dieses System.

Der entscheidende Unterschied: Die Person hat durch ihren Kommentar selbst
gehandelt. Sie wird nicht kalt angeschrieben, sie bekommt eine Antwort. Das
ist rechtlich und plattformseitig eine andere Sache — und praktisch die
bessere: Antwortquoten auf Private Replies liegen weit über allem, was kalte
Direktnachrichten je erreichen, weil der Empfänger den Auslöser selbst gesetzt
hat.

Diese Grenze ist als Test festgeschrieben (`IG10` in
`tools-dev/tests/ig-funnel.test.js`): Wer einen Liker- oder Follower-Pfad
nachrüstet, bricht den Build.

---

## Architektur

```
Instagram (Kommentar)
        │  Webhook, signiert mit HMAC-SHA256
        ▼
supabase/functions/ig-webhook/       ← öffentlich erreichbar, Signatur = Auth
        ├── index.ts                     Transport, Graph-API-Aufruf
        └── funnel.mjs                   Entscheidungslogik (ohne Netz, ohne DB)
        │
        ▼
public.ig_settings · ig_rules · ig_leads · ig_comments · ig_inbound
        │  RLS an, KEINE Policy — nur service_role kommt heran
        ▼
supabase/functions/ig-admin/         ← Owner-Rolle Pflicht
        │
        ▼
js/os/app.js  →  Ansicht #insta
```

Warum die Logik in einer eigenen Datei (`funnel.mjs`) liegt: Die Frage „geht
hier eine Nachricht an einen echten Menschen raus?" entscheidet über
Kontosperre und Abmahnung. Sie gehört an eine Stelle, die man ohne Webhook,
ohne Datenbank und ohne Meta-Konto vollständig durchtesten kann — und die ist
mit 112 Assertions durchgetestet.

---

## Die Schutzschichten

Leitsatz: **Schweigen ist die Voreinstellung.** Jede Prüfung kann nur
verhindern, nie erlauben.

1. **Signatur.** Jeder POST wird gegen `x-hub-signature-256` geprüft (HMAC-SHA256
   über den rohen Body, App-Secret, Konstantzeit-Vergleich). Ohne gültige
   Signatur: 403, bevor ein Datenbank-Client entsteht. Ein ungeprüfter Webhook
   wäre ein offenes Formular, in das jeder erfundene Kommentare wirft — und
   jeder davon kostet eine echte Direktnachricht.
2. **Not-Aus** (`ig_settings.active`, Voreinstellung `false`). Steht in der
   Datenbank, nicht im Code: Stoppen darf keinen Deploy brauchen.
3. **Eigene Kommentare** werden ignoriert. Sonst antwortet das System auf sich
   selbst.
4. **7-Tage-Fenster.** Ältere Kommentare werden gar nicht erst versucht — Meta
   lehnt ab, und jeder Fehlversuch zählt aufs API-Konto.
5. **Widerspruch.** Wer „STOPP" (oder „abmelden", „kein Interesse", „spam" …)
   schreibt, ist dauerhaft gesperrt. Die Prüfung steht **vor** dem
   Stichwort-Abgleich: ein Opt-out greift auch dann, wenn die Person später ein
   Stichwort kommentiert.
6. **Regel nötig.** Passt kein Stichwort und gibt es keine Standard-Regel,
   passiert nichts.
7. **Sperrfrist pro Person** (Voreinstellung 30 Tage). Ohne sie wird aus
   Automatisierung Belästigung.
8. **Tagesdeckel** (Voreinstellung 40). Schützt vor dem viralen Beitrag, der über
   Nacht hunderte Nachrichten auslöst — der schnellste Weg zur Kontosperre. Der
   Stand wird pro Batch lokal mitgezählt, damit 50 gleichzeitige Kommentare den
   Deckel nicht 50-mal gegen denselben Startwert prüfen.
9. **Idempotenz.** `ig_comments.comment_id` ist UNIQUE und der Datensatz wird
   **vor** dem Senden angelegt. Metas Wiederholung nach einem Timeout findet ihn
   vor und sendet nicht erneut.
10. **Opt-out-Hinweis** wird an jede Nachricht angehängt und lässt sich nicht
    abschalten. Rechtlich der Unterschied zwischen einer Antwort und einer
    Belästigung.

### Datensparsamkeit

- Der **Kommentartext wird nie gespeichert** — nur, welches Stichwort gegriffen
  hat. Das reicht für jede Auswertung.
- Von eingehenden Direktnachrichten nur ID und Zeitpunkt, nie der Inhalt. Der
  liegt ohnehin im Instagram-Posteingang.
- Die IGSID ist eine app-spezifische Pseudonym-ID, nicht die öffentliche
  Profil-ID.
- `ig_forget_lead()` erledigt eine Löschanfrage nach Art. 17 DSGVO in einem
  Aufruf (Knopf „Daten löschen" in der Ansicht). Die Kommentar-Datensätze
  bleiben pseudonymisiert bestehen — sonst bräche die Idempotenz und eine
  Meta-Wiederholung löste erneut eine Nachricht aus.

---

## Einrichtung

Ohne diese Schritte passiert **nichts** — der Funnel schweigt, und die Ansicht
`#insta` sagt unter „Einrichtung — noch offen", was fehlt.

### 1. Voraussetzungen bei Instagram

- Ein **Instagram-Professional-Konto** (Business oder Creator). Ein privates
  Konto kann die Messaging-API nicht nutzen.
- In der Instagram-App: **Einstellungen → Nachrichten → Zugriff auf Nachrichten
  durch verbundene Tools erlauben** aktivieren.

### 2. Meta-App anlegen

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps** →
   **Create App** → Anwendungsfall **„Other" / Business**.
2. Produkt **Instagram** hinzufügen → **API setup with Instagram login**.
3. Konto verbinden, Berechtigungen anfordern:
   `instagram_business_basic`, `instagram_business_manage_messages`,
   `instagram_business_manage_comments`.
4. Notieren: **Instagram App Secret** und die **Instagram-Konto-ID** (IGSID der
   eigenen Seite, steht im API-Setup).
5. Access Token erzeugen. Kurzlebige Tokens gegen ein **Long-Lived Token**
   tauschen (60 Tage) — siehe Abschnitt „Token-Verlängerung" unten.

### 3. Deployen

```bash
supabase db push                               # Migration 0019
supabase functions deploy ig-webhook
supabase functions deploy ig-admin
```

### 4. Secrets setzen

Supabase → Edge Functions → Secrets:

| Secret | Inhalt |
|---|---|
| `IG_APP_SECRET` | App-Secret der Meta-App — signiert die Webhooks |
| `IG_VERIFY_TOKEN` | frei gewählte Zufallszeichenkette, gleich im Meta-Dashboard |
| `IG_ACCESS_TOKEN` | Long-Lived Instagram User Access Token |
| `IG_BUSINESS_ID` | die eigene IGSID (erkennt eigene Kommentare) |
| `IG_GRAPH_BASE` | optional, Standard `https://graph.instagram.com/v23.0` |

Diese Werte gehören **ausschließlich** in die Supabase-Secrets — nie ins
Repository, nie in `js/config.js`, nie in einen Log.

### 5. Webhook eintragen

Meta-App → **Instagram → Webhooks**:

- **Callback URL:** `https://vczhfyxltiyvtvppfodt.supabase.co/functions/v1/ig-webhook`
- **Verify Token:** derselbe Wert wie `IG_VERIFY_TOKEN`
- **Felder abonnieren:** `comments` und `messages`

Meta ruft die URL einmalig per GET auf und erwartet die Challenge zurück. Kommt
„The URL couldn't be validated", ist entweder das Verify-Token verschieden oder
die Function nicht deployt.

### 6. Erste Regel anlegen und einschalten

In `#insta` → **Regeln**:

| Feld | Beispiel |
|---|---|
| Stichwort | `plan` |
| Nachricht | `Hey {name} — hier ist dein kostenloser Score: {link} Dauert 4 Minuten und sagt dir, wo dein Engpass wirklich liegt.` |
| Link | `https://www.malemetrix.com/check.html` |

`{name}` wird durch den Benutzernamen ersetzt, `{link}` durch den Link. Der
Hinweis „Antworte STOPP…" hängt automatisch an.

Dann unter **Schalter** den Funnel einschalten. Danach in einem Beitrag zum
Kommentieren des Stichworts auffordern („Kommentier PLAN und ich schick dir
den Link") — das ist der Auslöser, ohne den nichts passiert.

---

## Betrieb

### Was die Zahlen bedeuten

Beim Einrichten ist **„Nicht gesendet — warum"** die wichtigste Kachel. Fast
immer steht dort am Anfang „kein Stichwort getroffen" — dann fehlt schlicht
eine Regel oder die Aufforderung im Beitrag ist zu vage.

### Token-Verlängerung

Long-Lived Tokens laufen nach **60 Tagen** ab. Danach schlägt jeder Versand mit
`token_invalid` fehl (sichtbar in „Nicht gesendet — warum"). Verlängern:

```
GET https://graph.instagram.com/refresh_access_token
    ?grant_type=ig_refresh_token&access_token=<aktuelles Token>
```

Das neue Token als `IG_ACCESS_TOKEN` hinterlegen. Ein Token, das mehr als 60
Tage nicht benutzt wurde, lässt sich nicht mehr verlängern — dann neu erzeugen.

### Fehlercodes in der Ansicht

| Code | Bedeutung | Was tun |
|---|---|---|
| `token_invalid` | Token abgelaufen oder zurückgezogen | verlängern (siehe oben) |
| `outside_window` | Kommentar zu alt oder Berechtigung fehlt | Berechtigungen prüfen |
| `rate_limited` | Metas Limit erreicht | Tagesdeckel senken |
| `meta_server_error` | Störung bei Meta | abwarten |
| `network_error` | Aufruf kam nicht durch | einmalig, sonst Logs prüfen |

### Aufbewahrung

Kein Trigger, bewusst manuell (siehe Fußnote in Migration 0019):

```sql
delete from public.ig_comments where received_at < now() - interval '180 days';
delete from public.ig_inbound  where received_at < now() - interval '180 days';
delete from public.ig_leads where last_reply_at is null
  and coalesce(last_comment_at, first_seen_at) < now() - interval '365 days';
```

---

## Datenschutzerklärung — Ergänzung

`datenschutz.html` braucht einen Absatz, sobald der Funnel läuft. Vorschlag:

> **Kommentare und Direktnachrichten auf Instagram.** Kommentierst du einen
> unserer Instagram-Beiträge, verarbeiten wir deinen von Instagram vergebenen
> pseudonymen Nutzer-Kennzeichner, deinen Benutzernamen und den Zeitpunkt, um
> dir automatisiert einmalig per Direktnachricht zu antworten (Art. 6 Abs. 1
> lit. f DSGVO — berechtigtes Interesse an der Beantwortung einer an uns
> gerichteten Äußerung). Der Inhalt deines Kommentars wird dabei nicht
> gespeichert, sondern nur ausgewertet, welches Stichwort er enthielt. Du kannst
> jederzeit widersprechen, indem du „STOPP" antwortest; danach erhältst du keine
> automatischen Nachrichten mehr. Auf Anfrage löschen wir alle zu dir
> gespeicherten Daten.

Rechtliche Prüfung durch einen Anwalt ersetzt dieser Vorschlag nicht.

---

## Was TikTok angeht

Für TikTok gibt es weiterhin **keinen** Versandpfad, weil es keine
Direktnachrichten-API gibt. Die realistischen Wege dort:

1. **Link in Bio** auf eine Landingpage mit Lead-Magnet und Double-Opt-In —
   speist dieselbe E-Mail-Strecke (`E-MAIL-SEQUENZ.md`).
2. **Kommentar-Antworten als Video** — TikToks eigene Mechanik, kostet nichts
   und bringt zusätzliche Reichweite.
3. **TikTok Lead Generation** über bezahlte Anzeigen, wenn Budget da ist.

Das bestehende Growth OS (`admin/growth/`, `GROWTH-OS.md`) deckt die
TikTok-Seite bereits auf der Inhaltsebene ab.

---

## Tests

```bash
node tools-dev/tests/ig-funnel.test.js
```

112 Assertions über Signaturprüfung, Entscheidungsreihenfolge, Stichwort-
Zuordnung, Opt-out-Erkennung, Nachrichtenaufbau, Webhook-Parsing, die
Owner-Schranke von `ig-admin` und das Datenmodell — plus die Zusicherung, dass
kein Liker-, Follower- oder TikTok-Versandpfad existiert.
