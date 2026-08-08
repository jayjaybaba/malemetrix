// =============================================================================
// ig-webhook — Supabase Edge Function
//
// Nimmt Instagram-Webhooks entgegen und beantwortet Kommentare mit genau EINER
// Direktnachricht ("Private Reply", Instagram Messaging API). Das ist die
// einzige von Meta erlaubte automatische Erstansprache. Alles Weitere — jede
// zweite Nachricht — passiert erst, wenn der Empfänger geantwortet hat, und
// dann von Hand im Instagram-Posteingang.
//
// Sicherheitszusagen:
//   · JEDER POST wird gegen `x-hub-signature-256` (HMAC-SHA256 über den ROHEN
//     Body, App-Secret) geprüft. Ohne gültige Signatur: 403, kein Schreibzugriff,
//     kein API-Aufruf. Ein ungeprüfter Webhook wäre ein Formular, in das jeder
//     erfundene Kommentare wirft — und jeder davon kostet eine echte DM.
//   · Idempotenz über die UNIQUE-Spalte ig_comments.comment_id. Der Datensatz
//     wird VOR dem Senden angelegt. Metas Wiederholung nach einem Timeout
//     findet ihn vor und sendet nicht erneut.
//   · Not-Aus, Tagesdeckel, Cooldown pro Person und Opt-out werden in
//     funnel.mjs entschieden — einer Datei ohne Netzwerk und ohne Datenbank,
//     die vollständig durchgetestet ist (tools-dev/tests/ig-funnel.test.js).
//   · Der Kommentartext wird nie gespeichert, nur das getroffene Stichwort.
//
// config.toml: verify_jwt = false — Meta schickt keinen Supabase-JWT und kann
// keinen schicken. Die Authentizität kommt aus der Signatur, nicht aus einem
// Token. Ohne diesen Eintrag würde die Platform-Ebene jeden Webhook mit 401
// abweisen, bevor der Handler läuft.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   IG_APP_SECRET     App-Secret der Meta-App (signiert die Webhooks)
//   IG_VERIFY_TOKEN   frei gewählte Zeichenkette, identisch im Meta-Dashboard
//   IG_ACCESS_TOKEN   Instagram-User-Access-Token mit instagram_business_manage_messages
//   IG_BUSINESS_ID    die eigene IGSID (erkennt eigene Kommentare)
//   IG_GRAPH_BASE     optional, Standard https://graph.instagram.com/v23.0
//
// Deploy: supabase functions deploy ig-webhook
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  decide, isOptOut, matchRule, parseComments, parseInbound, renderMessage,
  timingSafeEqual, verifySignature,
} from "./funnel.mjs";

const GRAPH_DEFAULT = "https://graph.instagram.com/v23.0";

function text(body: string, status: number) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}
function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

/** Meta-Fehlerantworten in einen kurzen, speicherbaren Code übersetzen. Der
 *  Klartext der Fehlermeldung kann Nutzerdaten enthalten und wird deshalb
 *  nicht gespeichert — der Code reicht, um zu verstehen, was zu tun ist. */
function graphErrorCode(status: number, payload: any): string {
  const code = payload?.error?.code;
  const sub = payload?.error?.error_subcode;
  if (status === 401 || code === 190) return "token_invalid";
  if (code === 10 || sub === 2534022) return "outside_window";      // Fenster zu / keine Berechtigung
  if (code === 4 || code === 613 || status === 429) return "rate_limited";
  if (code === 100) return "bad_request";
  if (status >= 500) return "meta_server_error";
  return "http_" + status;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ----------------------------------------------------------- VERIFIKATION --
  // Meta ruft die URL einmalig per GET auf und erwartet die Challenge im Klartext.
  // Der Token-Vergleich läuft in Konstantzeit — er ist der einzige Schutz davor,
  // dass ein Fremder unsere Webhook-URL auf seine App abonniert.
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode") || "";
    const token = url.searchParams.get("hub.verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge") || "";
    const expected = Deno.env.get("IG_VERIFY_TOKEN") || "";
    if (mode === "subscribe" && expected && timingSafeEqual(token, expected)) {
      return text(challenge, 200);
    }
    return text("forbidden", 403);
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // ------------------------------------------------------------- SIGNATUR ----
  const raw = await req.text();
  if (raw.length > 512 * 1024) return json({ error: "payload_too_large" }, 413);

  const appSecret = Deno.env.get("IG_APP_SECRET") || "";
  const sigOk = await verifySignature(raw, req.headers.get("x-hub-signature-256"), appSecret);
  if (!sigOk) return json({ error: "bad_signature" }, 403);

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return json({ ok: false, error: "bad_json" }, 200); }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Ab hier gilt: Meta bekommt IMMER 200. Ein 500 würde die Zustellung
  // wiederholen lassen und bei anhaltendem Fehler das Webhook-Abo deaktivieren.
  // Was schiefging, steht im Datensatz des jeweiligen Kommentars.
  try {
    const inbound = parseInbound(payload);
    for (const m of inbound) {
      await service.rpc("ig_note_reply", {
        p_message_id: m.messageId, p_igsid: m.igsid, p_opt_out: isOptOut(m.text),
      });
    }

    const comments = parseComments(payload);
    if (!comments.length) return json({ ok: true, handled: inbound.length }, 200);

    const [{ data: settings }, { data: rules }, { data: sentTodayRaw }] = await Promise.all([
      service.from("ig_settings").select("*").eq("id", 1).maybeSingle(),
      service.from("ig_rules").select("id,keyword,match_mode,message,link_url,priority,is_default,active").eq("active", true),
      service.rpc("ig_dm_sent_today"),
    ]);

    const cfg = settings || { active: false, daily_cap: 0, per_lead_cooldown_days: 30, comment_window_days: 7 };
    const ownId = Deno.env.get("IG_BUSINESS_ID") || "";
    const graphBase = (Deno.env.get("IG_GRAPH_BASE") || GRAPH_DEFAULT).replace(/\/+$/, "");
    const accessToken = Deno.env.get("IG_ACCESS_TOKEN") || "";
    const now = Date.now();

    // Der Tagesstand wird EINMAL geladen und lokal mitgezählt. Ein Batch mit
    // 50 Kommentaren darf den Deckel nicht 50-mal gegen denselben Startwert
    // prüfen und ihn dadurch überschreiten.
    let sentToday = Number(sentTodayRaw) || 0;
    let sent = 0, skipped = 0;

    for (const c of comments) {
      // 1) Kommentar beanspruchen. Kommt hier nichts zurück, hat ihn ein
      //    früherer Zustellversuch schon bearbeitet — dann ist Schweigen die
      //    einzig richtige Reaktion.
      const { data: claimed, error: claimErr } = await service
        .from("ig_comments")
        .upsert(
          { comment_id: c.commentId, media_id: c.mediaId || null, igsid: c.igsid, action: "pending" },
          { onConflict: "comment_id", ignoreDuplicates: true },
        )
        .select("id");
      if (claimErr || !claimed || !claimed.length) { skipped++; continue; }

      // 2) Person anlegen/anfassen — atomar in der Datenbank, damit zwei
      //    gleichzeitige Webhooks sich nicht gegenseitig überschreiben.
      const { data: lead } = await service.rpc("ig_touch_lead", {
        p_igsid: c.igsid, p_username: c.username || null,
      });

      const rule = matchRule(c.text, rules || []);
      const ageDays = c.createdAtMs ? (now - c.createdAtMs) / 86400000 : 0;

      const verdict = decide({
        active: cfg.active === true,
        isOwnComment: !!ownId && c.igsid === ownId,
        commentAgeDays: ageDays,
        commentWindowDays: cfg.comment_window_days,
        optedOut: !!(lead && (lead.opted_out_at || lead.status === "opted_out")),
        rule,
        lastDmAtMs: lead && lead.last_dm_at ? Date.parse(lead.last_dm_at) : null,
        nowMs: now,
        cooldownDays: cfg.per_lead_cooldown_days,
        sentToday,
        dailyCap: cfg.daily_cap,
      });

      if (verdict.action !== "send") {
        await service.rpc("ig_mark_comment", {
          p_comment_id: c.commentId,
          p_action: verdict.action,
          p_rule_id: rule ? rule.id : null,
          p_matched_keyword: rule ? rule.keyword : null,
          p_error_code: null,
        });
        skipped++;
        continue;
      }

      // 3) Senden. Empfänger ist die KOMMENTAR-ID, nicht die Person — genau das
      //    macht den Aufruf zur erlaubten Private Reply statt zu einer
      //    unaufgeforderten Direktnachricht.
      let action = "dm_sent";
      let errorCode: string | null = null;
      try {
        const res = await fetch(`${graphBase}/${encodeURIComponent(ownId || "me")}/messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": "Bearer " + accessToken,
          },
          body: JSON.stringify({
            recipient: { comment_id: c.commentId },
            message: { text: renderMessage(rule, { username: c.username }) },
          }),
        });
        if (!res.ok) {
          let body: any = null;
          try { body = await res.json(); } catch { /* Meta antwortet nicht immer JSON */ }
          action = "dm_failed";
          errorCode = graphErrorCode(res.status, body);
        }
      } catch {
        action = "dm_failed";
        errorCode = "network_error";
      }

      await service.rpc("ig_mark_comment", {
        p_comment_id: c.commentId,
        p_action: action,
        p_rule_id: rule.id,
        p_matched_keyword: rule.keyword,
        p_error_code: errorCode,
      });

      if (action === "dm_sent") { sent++; sentToday++; } else { skipped++; }
    }

    return json({ ok: true, sent, skipped }, 200);
  } catch {
    // Bewusst 200: siehe oben. Der Fehler darf das Webhook-Abo nicht kosten.
    return json({ ok: false }, 200);
  }
});
