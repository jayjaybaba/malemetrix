/* ==========================================================================
   MaleMetrix — Food-Vision-Proxy (Cloudflare Worker)
   Hält deinen Anthropic-API-Schlüssel geheim: Die Website schickt das
   Foto hierher, der Worker leitet es mit deinem Schlüssel an die
   Claude-API weiter. Der Schlüssel taucht nie im Browser auf.

   Einrichtung: siehe proxy/README.md (5 Minuten, nur Copy-Paste).
   ========================================================================== */

// Nur dieses günstige Vision-Modell ist erlaubt — verhindert, dass jemand
// deinen Proxy für teure Modelle missbraucht.
const ALLOWED_MODELS = ["claude-haiku-4-5"];
const MAX_TOKENS_CAP = 400;        // reicht locker für die Kalorien-Schätzung
const MAX_BODY_BYTES = 900_000;    // ~ downgescaltes Foto als base64

export default {
  async fetch(request, env) {
    // Erlaubte Herkunft: deine Domain (Vorschau/localhost zum Testen ok).
    const origin = request.headers.get("Origin") || "";
    const allowed =
      /^https:\/\/(www\.)?malemetrix\.de$/.test(origin) ||
      /^https:\/\/[a-z0-9-]+\.github\.io$/.test(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      origin === "null" || origin === ""; // file:// beim lokalen Testen

    const cors = {
      "Access-Control-Allow-Origin": allowed && origin ? origin : "https://malemetrix.de",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST")
      return json({ error: "Nur POST" }, 405, cors);
    if (!allowed)
      return json({ error: "Herkunft nicht erlaubt" }, 403, cors);
    if (!env.ANTHROPIC_API_KEY)
      return json({ error: "ANTHROPIC_API_KEY fehlt (Worker → Settings → Variables)" }, 500, cors);

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES)
      return json({ error: "Anfrage zu groß" }, 413, cors);

    let body;
    try { body = JSON.parse(raw); }
    catch { return json({ error: "Ungültiges JSON" }, 400, cors); }

    // Absichern: Modell festnageln, Token-Limit deckeln.
    if (!ALLOWED_MODELS.includes(body.model)) body.model = ALLOWED_MODELS[0];
    body.max_tokens = Math.min(Number(body.max_tokens) || MAX_TOKENS_CAP, MAX_TOKENS_CAP);

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": "application/json", ...cors }
    });
  }
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...cors }
  });
}
