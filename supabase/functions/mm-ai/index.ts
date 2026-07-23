// ============================================================================
// MaleMetrix Phase 7 — Edge Function `mm-ai`
// KI-Sprachschicht (LAYER 3). Provider-Secrets leben NUR hier (§5/§166).
// STATUS: CODE COMPLETE · CONFIG REQUIRED (Secrets + Deploy — siehe AI.md).
//   supabase secrets set ANTHROPIC_API_KEY=...   (oder OPENAI_API_KEY)
//   supabase functions deploy mm-ai
// Sicherheit: verlangt authentifizierte Session (verify_jwt), Rate-Limit pro
// Nutzer, Payload-Validierung, minimaler Kontext, keine Secrets in Antwort.
// Die KI ist NIE Quelle der Wahrheit — der Client validiert zusätzlich (§9).
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const RATE_LIMIT_PER_HOUR = 30;
const MAX_BODY_BYTES = 32_000;

const TASK_MODEL: Record<string, { anthropic: string; openai: string; maxTokens: number }> = {
  SHORT_SYNTHESIS:        { anthropic: "claude-haiku-4-5-20251001", openai: "gpt-4o-mini", maxTokens: 300 },
  ADVISOR_REASONING:      { anthropic: "claude-sonnet-5",           openai: "gpt-4o",      maxTokens: 700 },
  WEEKLY_REVIEW_LANGUAGE: { anthropic: "claude-haiku-4-5-20251001", openai: "gpt-4o-mini", maxTokens: 500 },
  KNOWLEDGE_EXPLANATION:  { anthropic: "claude-sonnet-5",           openai: "gpt-4o",      maxTokens: 600 },
  CONTENT_GENERATION:     { anthropic: "claude-sonnet-5",           openai: "gpt-4o",      maxTokens: 900 },
  COMPLEX_COMPARISON:     { anthropic: "claude-sonnet-5",           openai: "gpt-4o",      maxTokens: 800 },
};

const SYSTEM = `Du bist die Sprachschicht von MaleMetrix, einem Performance-System für Männer.
REGELN (nicht verhandelbar):
- Du bekommst deterministische Fakten, ausgewählten Nutzerkontext, Wissensobjekte und ggf. eine deterministische Entscheidung. Du erklärst, verdichtest, personalisierst Sprache. Du erfindest KEINE Nutzerdaten und KEINE Quellen.
- Du widersprichst der deterministischen Entscheidung nicht. Wenn sie KEEP sagt, empfiehlst du keine Änderung.
- Keine Diagnosen. Keine Dosierungen verschreibungspflichtiger Substanzen oder PEDs. Bei medizinischen Grenzfragen: professionelle Einordnung empfehlen — direkt, ohne Alarmismus.
- Antworte auf Deutsch, direkt und knapp: erst die Antwort (1-3 Sätze), dann kurz WARUM (nur relevante Evidenz), dann höchstens EINE konkrete Handlung, dann was NICHT zu ändern ist, dann wann neu bewertet wird.
- Unsicherheit benennen statt kaschieren. Fehlt Wissen oder Datenlage: sag es.`;

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
    const body = JSON.parse(raw);

    // --- Auth: Nutzer-JWT verifizieren (kein anonymer Zugriff) ---
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user }, error: authErr } = await supa.auth.getUser();
    if (authErr || !user) return json({ error: "unauthorized" }, 401);

    // --- Rate-Limit pro Nutzer (ai_request_log, RLS: service-only) ---
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin.from("ai_request_log").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", oneHourAgo);
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) return json({ error: "rate_limited" }, 429);

    // --- Payload-Validierung: nur erwartete Felder, keine Roh-Dumps ---
    const task = TASK_MODEL[body.task] ? body.task : "SHORT_SYNTHESIS";
    const route = TASK_MODEL[task];
    const question = String(body.question ?? "").slice(0, 500);
    const ctx = body.context ?? {};
    const knowledge = Array.isArray(body.knowledge) ? body.knowledge.slice(0, 3) : [];
    const det = body.deterministicDecision ?? null;

    const userMsg = JSON.stringify({
      aufgabe: task, frage: question, kontext: ctx,
      wissen: knowledge, deterministische_entscheidung: det,
      unsicherheit: body.uncertainty ?? [],
    });

    // --- Provider-Aufruf (Anthropic bevorzugt, OpenAI-Fallback) ---
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let text: string | null = null; let model = "";
    if (anthropicKey) {
      model = route.anthropic;
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: route.maxTokens, system: SYSTEM, messages: [{ role: "user", content: userMsg }] }),
      });
      if (r.ok) { const d = await r.json(); text = d?.content?.[0]?.text ?? null; }
    } else if (openaiKey) {
      model = route.openai;
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model, max_tokens: route.maxTokens, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg }] }),
      });
      if (r.ok) { const d = await r.json(); text = d?.choices?.[0]?.message?.content ?? null; }
    } else {
      return json({ error: "provider_not_configured" }, 503);
    }
    if (!text) return json({ error: "provider_error" }, 502);

    // --- Observability ohne sensible Rohdaten (§23/§253) ---
    await admin.from("ai_request_log").insert({ user_id: user.id, task, model, ok: true });
    return json({ text, model, task });
  } catch (e) {
    return json({ error: "internal", detail: String((e as Error)?.message ?? e).slice(0, 200) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
