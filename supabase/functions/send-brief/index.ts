// ============================================================================
// MaleMetrix Phase 7 — Edge Function `send-brief` (Server-Push-Sender)
// STATUS: CODE COMPLETE · CONFIG REQUIRED (VAPID-Keys + Scheduler; PUSH.md).
// Aufruf: Scheduler (pg_cron/extern) → sendet Morning Brief / Weekly Review /
// Decision-Review-Pushes. Wert-Filter (§69): dedupliziert (push_delivery_log),
// Privacy-Modus DISCREET per Default (§74) — Inhalte nie auf dem Lockscreen.
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

Deno.serve(async (req) => {
  const auth = req.headers.get("x-scheduler-secret");
  if (auth !== Deno.env.get("SCHEDULER_SECRET")) return new Response("forbidden", { status: 403 });
  const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return json({ error: "vapid_not_configured" }, 503);
  webpush.setVapidDetails("mailto:kontakt@malemetrix.com", pub, priv);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { type = "morning_brief" } = await req.json().catch(() => ({}));
  const today = new Date().toISOString().slice(0, 10);
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("revoked", false).limit(500);
  let sent = 0, skipped = 0;
  for (const s of subs ?? []) {
    const dedup = `${type}:${today}`;
    const { error: dupErr } = await admin.from("push_delivery_log").insert({ user_id: s.user_id, notification_type: type, dedup_key: dedup, scheduled_at: new Date().toISOString() });
    if (dupErr) { skipped++; continue; }   // unique(user_id, dedup_key) ⇒ Duplikat (§76)
    const discreet = (s.privacy_mode ?? "discreet") !== "full";
    const payload = JSON.stringify(discreet
      ? { title: "MaleMetrix", body: type === "weekly_review" ? "Deine Woche ist bereit." : "Dein Brief ist bereit.", deepLink: type === "weekly_review" ? "#review" : "#today", tag: dedup, privacy: "discreet" }
      : { title: type === "weekly_review" ? "Deine Woche ist bereit" : "Guten Morgen", body: "Öffnen für Prioritäten & Plan.", deepLink: type === "weekly_review" ? "#review" : "#today", tag: dedup });
    try {
      await webpush.sendNotification(s.subscription, payload);
      await admin.from("push_delivery_log").update({ sent_at: new Date().toISOString(), result: "sent" }).eq("user_id", s.user_id).eq("dedup_key", dedup);
      sent++;
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode === 410) await admin.from("push_subscriptions").update({ revoked: true }).eq("id", s.id);
      await admin.from("push_delivery_log").update({ result: "failed" }).eq("user_id", s.user_id).eq("dedup_key", dedup);
    }
  }
  return json({ sent, skipped });
});
function json(o: unknown, status = 200) { return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } }); }
