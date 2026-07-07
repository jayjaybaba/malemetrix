/* MaleMetrix Vault-Tool: verschlüsselt Premium-Inhalte für die statische Site.
   Nutzung:
     node tools-dev/vault.mjs encrypt <datei> <CODE>   → Payload-JSON auf stdout
     node tools-dev/vault.mjs decrypt <payload.json> <CODE> → Klartext auf stdout
   Format kompatibel zu js/vault.js (PBKDF2-SHA256 150k → AES-256-GCM,
   ct = ciphertext||tag, alles base64). */
import { readFileSync } from "node:fs";
import { pbkdf2Sync, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ITER = 150000;
const norm = (c) => String(c || "").trim().toUpperCase().replace(/\s+/g, "");

function encrypt(text, code) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(norm(code), salt, ITER, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(text, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return { v: 1, iter: ITER, salt: salt.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64") };
}

function decrypt(payload, code) {
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const data = Buffer.from(payload.ct, "base64");
  const key = pbkdf2Sync(norm(code), salt, payload.iter || ITER, 32, "sha256");
  const tag = data.subarray(data.length - 16);
  const ct = data.subarray(0, data.length - 16);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

const [mode, file, code] = process.argv.slice(2);
if (mode === "encrypt") process.stdout.write(JSON.stringify(encrypt(readFileSync(file, "utf8"), code)));
else if (mode === "decrypt") process.stdout.write(decrypt(JSON.parse(readFileSync(file, "utf8")), code));
else { console.error("usage: vault.mjs encrypt|decrypt <file> <CODE>"); process.exit(1); }
