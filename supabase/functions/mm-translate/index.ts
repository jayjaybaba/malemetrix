// =============================================================================
// mm-translate — Supabase Edge Function
//
// Übersetzt deutsche Sätze nach Englisch und merkt sich JEDE Übersetzung in
// public.translations. Damit ist die Website dynamisch zweisprachig, ohne dass
// jemand ein Wörterbuch pflegt: Wird ein deutscher Text geändert, entsteht ein
// neuer Hash — der Satz wird beim nächsten englischen Besuch frisch übersetzt.
//
// BEWUSST ÖFFENTLICH (verify_jwt = false): Besucher sind anonym, ein Login-Zwang
// nur zum Lesen der Seite wäre absurd. Der Schutz liegt woanders:
//
//   · Origin-Allowlist (_shared/edge.mjs) — Browser fremder Seiten kommen nicht
//     durch.
//   · Harte Größengrenzen: Anzahl Sätze, Länge pro Satz, Zeichen pro Anfrage.
//   · MONATSBUDGET: Sind in diesem Monat mehr als BUDGET_CHARS Zeichen NEU
//     übersetzt worden, ruft die Function keinen Anbieter mehr auf und liefert
//     nur noch Cache-Treffer. Der schlimmste Fall ist damit "Englisch wird
//     diesen Monat nicht mehr ergänzt" — nie eine Rechnung.
//   · Stundenbremse: mehr als MAX_NEW_PER_HOUR neue Sätze in 60 Minuten →
//     ebenfalls nur noch Cache. Fängt einen Missbrauchs-Spike ab, bevor er das
//     Monatsbudget frisst.
//   · Der Cache ist die eigentliche Kostenbremse: derselbe Satz kostet genau
//     einmal, egal wie viele Besucher ihn sehen.
//
// EINRICHTUNG (eines von beiden genügt):
//   supabase secrets set DEEPL_API_KEY=...              (empfohlen)
//   supabase secrets set GOOGLE_TRANSLATE_API_KEY=...
// Ohne Schlüssel antwortet die Function 'provider_not_configured'; der Client
// lässt die Seite dann auf Deutsch stehen. Nie ein leerer Text, nie Kauderwelsch.
//
// Deploy: supabase functions deploy mm-translate
// =============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, preflight } from "../_shared/edge.mjs";

/* ---------- Grenzen ---------- */
const MAX_TEXTS = 48;            // Sätze pro Anfrage
const MAX_TEXT_LEN = 1200;       // Zeichen pro Satz (längere sind fast immer Layout-Unfälle)
const MAX_REQUEST_CHARS = 9000;  // Summe pro Anfrage
const MAX_BODY_BYTES = 64 * 1024;
const BUDGET_CHARS = Number(Deno.env.get("TRANSLATE_BUDGET_CHARS") || "400000");
const MAX_NEW_PER_HOUR = Number(Deno.env.get("TRANSLATE_MAX_NEW_PER_HOUR") || "1500");

function normalize(s: string): string {
  return String(s).replace(/\s+/g, " ").trim();
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- Markennamen schützen ----------
   Eigennamen dürfen NIE übersetzt werden — aus "MaleMetrix" darf kein
   "MaleMetric" und aus "BloodMetrix" kein "Blutmetrix" werden. DeepL kann
   Bereiche verbindlich auslassen, wenn sie in Tags stehen und diese Tags als
   "ignore_tags" deklariert sind. Genau dafür ist das hier: Marke einpacken,
   übersetzen lassen, Tags wieder entfernen.
   Reihenfolge nach Länge, damit "MaleMetrix Score" vor "MaleMetrix" greift. */
const BRANDS = ["MaleMetrix Score", "MaleMetrix Circle", "MaleMetrix", "BloodMetrix", "Ural Bayramoglu"];
const XML_ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

function protectBrands(s: string): string {
  let out = s.replace(/[&<>]/g, (c) => XML_ESC[c]);
  BRANDS.forEach((b) => {
    out = out.split(b).join("<x>" + b + "</x>");
  });
  return out;
}
function unprotect(s: string): string {
  return s.replace(/<\/?x>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/* ---------- Anbieter: DeepL ----------
   Der kostenlose Schlüssel endet auf ":fx" und gehört auf einen anderen Host —
   ein häufiger Stolperstein, deshalb hier automatisch. */
async function translateDeepL(key: string, texts: string[]): Promise<string[] | null> {
  const host = key.trim().endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const body = new URLSearchParams();
  body.set("source_lang", "DE");
  body.set("target_lang", "EN-US");
  body.set("preserve_formatting", "1");
  body.set("tag_handling", "xml");
  body.set("ignore_tags", "x");
  texts.forEach((t) => body.append("text", protectBrands(t)));
  const r = await fetch(host + "/v2/translate", {
    method: "POST",
    headers: {
      authorization: "DeepL-Auth-Key " + key.trim(),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!r.ok) {
    console.error("[mm-translate] deepl", r.status, (await r.text()).slice(0, 300));
    return null;
  }
  const j = await r.json();
  const out = (j.translations || []).map((x: { text?: string }) => unprotect(String(x.text || "")));
  return out.length === texts.length ? out : null;
}

/* ---------- Anbieter: Google Cloud Translation v2 (Alternative) ---------- */
async function translateGoogle(key: string, texts: string[]): Promise<string[] | null> {
  const r = await fetch("https://translation.googleapis.com/language/translate/v2?key=" + encodeURIComponent(key.trim()), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: texts, source: "de", target: "en", format: "text" }),
  });
  if (!r.ok) {
    console.error("[mm-translate] google", r.status, (await r.text()).slice(0, 300));
    return null;
  }
  const j = await r.json();
  const out = ((j.data || {}).translations || []).map((x: { translatedText?: string }) => String(x.translatedText || ""));
  return out.length === texts.length ? out : null;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin") || "");
  if (req.method === "OPTIONS") return preflight(cors);
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, cors);

  try {
    const raw = await req.text();
    if (!raw || raw.length > MAX_BODY_BYTES) return jsonResponse({ error: "payload_too_large" }, 413, cors);
    let body: { texts?: unknown };
    try { body = JSON.parse(raw); } catch { return jsonResponse({ error: "bad_json" }, 400, cors); }
    if (!Array.isArray(body.texts)) return jsonResponse({ error: "bad_request" }, 400, cors);

    // --- Eingabe säubern: normalisieren, entdoppeln, Grenzen einhalten ---
    const wanted: string[] = [];
    let sum = 0;
    for (const t of body.texts) {
      if (typeof t !== "string") continue;
      const n = normalize(t);
      if (!n || n.length > MAX_TEXT_LEN) continue;
      if (!/[A-Za-zÄÖÜäöüß]/.test(n)) continue;           // Zahlen/Symbole brauchen keine Übersetzung
      if (wanted.includes(n)) continue;
      if (wanted.length >= MAX_TEXTS) break;
      if (sum + n.length > MAX_REQUEST_CHARS) break;
      wanted.push(n);
      sum += n.length;
    }
    if (!wanted.length) return jsonResponse({ ok: true, map: {}, provider: "none" }, 200, cors);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // --- 1) Cache zuerst. Der Normalfall endet hier: kostenlos und schnell. ---
    const hashes = await Promise.all(wanted.map(sha256Hex));
    const byHash = new Map<string, string>();          // hash → deutscher Satz
    hashes.forEach((h, i) => byHash.set(h, wanted[i]));

    const map: Record<string, string> = {};
    const { data: hits, error: readErr } = await service
      .from("translations")
      .select("source_hash,target_text")
      .eq("target_lang", "en")
      .in("source_hash", hashes);
    if (readErr) return jsonResponse({ error: "db_error" }, 500, cors);
    (hits || []).forEach((row: { source_hash: string; target_text: string }) => {
      const de = byHash.get(row.source_hash);
      if (de) map[de] = row.target_text;
    });

    const missing = wanted.filter((w) => map[w] == null);
    if (!missing.length) return jsonResponse({ ok: true, map, provider: "cache" }, 200, cors);

    // --- 2) Budget- und Missbrauchs-Bremsen, BEVOR Geld ausgegeben wird ---
    // Eine Zahl aus der Datenbank statt aller Monatszeilen (translation_budget).
    const { data: budget } = await service.rpc("translation_budget");
    const verbraucht = Number((budget || {}).chars_month || 0);
    const neuStunde = Number((budget || {}).new_last_hour || 0);

    const gebremst = verbraucht >= BUDGET_CHARS || neuStunde >= MAX_NEW_PER_HOUR;
    if (gebremst) {
      // Ehrlich melden statt still nichts tun: der Client lässt die fehlenden
      // Sätze deutsch stehen und fragt sie nicht in einer Schleife erneut.
      return jsonResponse({ ok: true, map, provider: "cache", throttled: true, missing: missing.length }, 200, cors);
    }

    // --- 3) Übersetzen lassen ---
    const deepl = Deno.env.get("DEEPL_API_KEY") || "";
    const google = Deno.env.get("GOOGLE_TRANSLATE_API_KEY") || "";
    if (!deepl && !google) {
      return jsonResponse({ ok: true, map, provider: "none", error: "provider_not_configured", missing: missing.length }, 200, cors);
    }
    const provider = deepl ? "deepl" : "google";
    const out = deepl ? await translateDeepL(deepl, missing) : await translateGoogle(google, missing);
    if (!out) {
      // Anbieterfehler ist kein Grund, die Seite zu zerstören: was im Cache war,
      // wird geliefert, der Rest bleibt deutsch.
      return jsonResponse({ ok: true, map, provider: "cache", providerFailed: true, missing: missing.length }, 200, cors);
    }

    // --- 4) Ergebnis merken (Cache füllen) und ausliefern ---
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < missing.length; i++) {
      const de = missing[i];
      const en = normalize(out[i] || "");
      if (!en) continue;
      map[de] = en;
      rows.push({
        target_lang: "en",
        source_hash: await sha256Hex(de),
        source_text: de,
        target_text: en.slice(0, 4000),
        provider,
        chars: de.length,
      });
    }
    if (rows.length) {
      // ignoreDuplicates: zwei Besucher können denselben Satz gleichzeitig
      // anfragen. Der Zweite darf keinen Fehler erzeugen — und eine von Hand
      // korrigierte Zeile (provider='manual') wird so nie überschrieben.
      const { error: writeErr } = await service
        .from("translations")
        .upsert(rows, { onConflict: "target_lang,source_hash", ignoreDuplicates: true });
      if (writeErr) console.error("[mm-translate] cache write", writeErr.message);
    }

    return jsonResponse({ ok: true, map, provider, fresh: rows.length }, 200, cors);
  } catch (e) {
    console.error("[mm-translate] unhandled", e);
    return jsonResponse({ error: "unexpected" }, 500, cors);
  }
});
