#!/usr/bin/env node
/**
 * asc.mjs — spricht mit der App-Store-Connect-API, damit die Einrichtung bei
 * Apple nicht von Hand in Formularen passieren muss.
 *
 * Braucht drei Werte (als Umgebungsvariablen, in CI aus den Repository-Secrets):
 *   ASC_KEY_ID       Schluessel-ID des App-Store-Connect-API-Schluessels
 *   ASC_ISSUER_ID    Issuer-ID (steht ueber der Schluesselliste)
 *   ASC_PRIVATE_KEY  Inhalt der .p8-Datei
 *
 * Befehle:
 *   node scripts/asc.mjs whoami        Zugang pruefen (Apps auflisten)
 *   node scripts/asc.mjs ensure-app    Bundle-ID + App-Eintrag anlegen, falls sie fehlen
 *   node scripts/asc.mjs builds        Die letzten TestFlight-Builds zeigen
 *
 * Grundsatz: Dieses Skript legt nur an, was fehlt, und aendert nie etwas
 * Bestehendes. Wenn Apple etwas nicht ueber die API zulaesst, sagt es das
 * mit dem genauen Handgriff, statt still zu scheitern.
 */
import crypto from "node:crypto";

const BUNDLE_ID = "de.malemetrix.app";
const APP_NAME = "MaleMetrix";
const SKU = "malemetrix-app-001";
const PRIMARY_LOCALE = "de-DE";
const BASE = "https://api.appstoreconnect.apple.com";

function token() {
  const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY } = process.env;
  const missing = ["ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY"].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("Es fehlen: " + missing.join(", ") + "\nSiehe APP.md, Abschnitt „Was nur du tun kannst\".");
    process.exit(2);
  }
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: ASC_KEY_ID, typ: "JWT" };
  const payload = { iss: ASC_ISSUER_ID, iat: now, exp: now + 900, aud: "appstoreconnect-v1" };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const signingInput = `${b64(header)}.${b64(payload)}`;
  const key = crypto.createPrivateKey(ASC_PRIVATE_KEY.includes("BEGIN")
    ? ASC_PRIVATE_KEY
    : `-----BEGIN PRIVATE KEY-----\n${ASC_PRIVATE_KEY}\n-----END PRIVATE KEY-----`);
  const der = crypto.sign("sha256", Buffer.from(signingInput), { key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${der.toString("base64url")}`;
}

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: "Bearer " + token(),
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* Apple antwortet nicht immer mit JSON */ }
  if (!res.ok) {
    const detail = json && json.errors
      ? json.errors.map((e) => `${e.title}: ${e.detail}`).join("; ")
      : text.slice(0, 400);
    const err = new Error(`${method} ${path} → ${res.status}: ${detail}`);
    err.status = res.status;
    err.errors = (json && json.errors) || [];
    throw err;
  }
  return json;
}

async function whoami() {
  const apps = await api("GET", "/v1/apps?limit=200");
  console.log(`Zugang steht. ${apps.data.length} App(s) im Konto:`);
  for (const a of apps.data) console.log(`  ${a.attributes.bundleId}  —  ${a.attributes.name}  (id ${a.id})`);
}

async function ensureApp() {
  // 1 · Bundle-ID registrieren (idempotent)
  const found = await api("GET", `/v1/bundleIds?filter[identifier]=${encodeURIComponent(BUNDLE_ID)}&limit=1`);
  if (found.data.length) {
    console.log(`Bundle-ID ${BUNDLE_ID} existiert bereits (id ${found.data[0].id}).`);
  } else {
    const created = await api("POST", "/v1/bundleIds", {
      data: { type: "bundleIds", attributes: { identifier: BUNDLE_ID, name: APP_NAME, platform: "IOS" } }
    });
    console.log(`Bundle-ID ${BUNDLE_ID} angelegt (id ${created.data.id}).`);
  }

  // 2 · App-Eintrag anlegen (idempotent)
  const apps = await api("GET", `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`);
  if (apps.data.length) {
    console.log(`App-Eintrag existiert bereits: „${apps.data[0].attributes.name}" (id ${apps.data[0].id}).`);
    return;
  }
  try {
    const created = await api("POST", "/v1/apps", {
      data: {
        type: "apps",
        attributes: { bundleId: BUNDLE_ID, name: APP_NAME, primaryLocale: PRIMARY_LOCALE, sku: SKU }
      }
    });
    console.log(`App-Eintrag „${APP_NAME}" angelegt (id ${created.data.id}).`);
  } catch (e) {
    // Apple erlaubt das Anlegen nicht in jedem Kontovertragsstand ueber die API.
    // Dann ist der Handgriff klein — aber er muss benannt werden, statt zu scheitern.
    console.error("App-Eintrag konnte nicht ueber die API angelegt werden:\n  " + e.message);
    console.error(
      "\nEinmalig von Hand (2 Minuten):\n" +
      "  App Store Connect → Apps → „+\" → Neue App\n" +
      `  Plattform: iOS · Name: ${APP_NAME} · Primaersprache: Deutsch\n` +
      `  Bundle-ID: ${BUNDLE_ID} · SKU: ${SKU}\n` +
      "Danach laeuft der Upload ohne weitere Handgriffe.");
    process.exit(3);
  }
}

async function builds() {
  const apps = await api("GET", `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`);
  if (!apps.data.length) { console.log("Noch kein App-Eintrag — zuerst `ensure-app`."); return; }
  const list = await api("GET", `/v1/builds?filter[app]=${apps.data[0].id}&limit=10&sort=-uploadedDate`);
  if (!list.data.length) { console.log("Noch keine Builds hochgeladen."); return; }
  for (const b of list.data) {
    const a = b.attributes;
    console.log(`  Build ${a.version}  ${a.processingState}  ${a.uploadedDate}  ${a.expired ? "(abgelaufen)" : ""}`);
  }
}

const cmd = process.argv[2] || "whoami";
const commands = { whoami, "ensure-app": ensureApp, builds };
if (!commands[cmd]) {
  console.error("Unbekannter Befehl. Moeglich: " + Object.keys(commands).join(", "));
  process.exit(1);
}
commands[cmd]().catch((e) => { console.error(e.message); process.exit(1); });
