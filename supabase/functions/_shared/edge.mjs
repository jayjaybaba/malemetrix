// ============================================================================
// MaleMetrix — gemeinsamer Edge-Function-Baustein (Phase 10 / P0.6 + P0.7).
// Reines ESM ohne Deno-Globals: nutzbar in allen Functions UND in Node-Tests.
//
// AUTH-STANDARD (P0.6) — gilt für JEDE geschützte, browser-aufgerufene Function:
//   Dieses Supabase-Projekt nutzt asymmetrische Signing Keys (ES256) + das
//   Publishable-Key-System. Die Platform-Ebene verify_jwt kann diese Tokens
//   nicht prüfen (401 VOR dem Handler) und der alte Weg — ANON_KEY-Client +
//   getUser() ohne Token — liefert keinen User. Deshalb verbindlich:
//     · config.toml: verify_jwt = false für die Function
//     · Handler: Bearer-Token extrahieren → service.auth.getUser(jwt)
//       (server-autoritativ; NIEMALS ungeprüfte JWT-Claims verwenden)
//     · 401-Codes: auth_missing | auth_invalid_token | auth_validation_failed
//   verify_jwt=false macht NICHTS öffentlich — die Auth wandert nur in den
//   Handler, wo sie mit ES256 tatsächlich funktioniert.
//
// CORS-STANDARD (P0.7): Allowlist statt Wildcard. supabase-js sendet
// authorization + apikey + x-client-info + content-type → der Browser macht
// einen Preflight (OPTIONS), der 204 + diese Header zurückbekommen MUSS,
// sonst wird der eigentliche POST nie gesendet (Live-Root-Cause Juli 2026).
// ============================================================================

export const ALLOWED_ORIGINS = [
  "https://www.malemetrix.com",
  "https://malemetrix.com",
];

// CORS-Header für eine Anfrage: erlaubte Origins werden gespiegelt, alles
// andere bekommt die kanonische Produktions-Origin (der Browser blockt dann —
// gewollt). `vary: origin` hält Caches/CDNs korrekt.
export function corsHeaders(originHeader) {
  const origin = ALLOWED_ORIGINS.includes(originHeader) ? originHeader : ALLOWED_ORIGINS[0];
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, apikey, x-client-info, content-type",
    "access-control-max-age": "86400",
    "vary": "origin",
  };
}

export function jsonResponse(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

// Preflight: 204 ohne Body. Aufrufer: `if (req.method === "OPTIONS") return preflight(cors)`.
export function preflight(cors) {
  return new Response(null, { status: 204, headers: cors });
}

// Bearer-Token server-autoritativ validieren. Rückgabe:
//   { user }               bei Erfolg
//   { errorResponse }      fertige 401-Response (Codes siehe oben)
// `service` ist ein Service-Role-Supabase-Client des Aufrufers.
export async function requireUser(req, service, cors) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return { errorResponse: jsonResponse({ error: "auth_missing" }, 401, cors) };
  try {
    const { data, error } = await service.auth.getUser(jwt);
    if (error || !data?.user) {
      return { errorResponse: jsonResponse({ error: "auth_invalid_token" }, 401, cors) };
    }
    return { user: data.user };
  } catch (_e) {
    return { errorResponse: jsonResponse({ error: "auth_validation_failed" }, 401, cors) };
  }
}
