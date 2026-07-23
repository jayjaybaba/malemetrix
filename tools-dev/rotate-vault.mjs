/* MaleMetrix — Delivery-Vault-Rotation (Phase 9, §5/§77)
   ---------------------------------------------------------------------------
   Erzeugt einen NEUEN Zugangscode und die dazu passenden verschlüsselten
   Payloads für die Premium-Inhalte. Zweck: den in der Git-Historie/im
   Client exponierten Alt-Code entwerten, OHNE bestehende Käufer auszusperren
   (die migrieren vorher per Konto-Claim auf server-vergebene Entitlements).

   NUTZUNG (lokal, Klartext-Master aus _src/, nie im Repo):
     node tools-dev/rotate-vault.mjs _src/protokoll.html _src/kurs-programm.html
   Ausgabe: neuer Code (einmalig, sicher verwahren) + Payloads je Datei.

   ABLAUF (siehe SECURITY.md): erst Cloud+mm-commerce aktiv, dann Käufer
   auf Konto-Entitlement migrieren, dann rotieren, dann DELIVERY_VAULT/DK aus
   checkout.js entfernen. Reihenfolge ist wichtig — sie schützt Alt-Kunden. */
import { readFileSync } from "node:fs";
import { pbkdf2Sync, randomBytes, createCipheriv } from "node:crypto";

const ITER = 150000;
const norm = (c) => String(c || "").trim().toUpperCase().replace(/\s+/g, "");

function encrypt(text, code) {
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = pbkdf2Sync(norm(code), salt, ITER, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(text, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return { v: 1, iter: ITER, salt: salt.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64") };
}
function newCode() {
  // MMX-<8 hex>-<8 hex> — genug Entropie, menschlich handhabbar.
  const h = randomBytes(8).toString("hex").toUpperCase();
  return "MMX-" + h.slice(0, 8) + "-" + h.slice(8, 16);
}

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: rotate-vault.mjs <klartext-datei> [weitere...]"); process.exit(1); }
const code = newCode();
console.error("NEUER CODE (nur hier ausgegeben, sicher verwahren): " + code);
const out = {};
for (const f of files) out[f] = encrypt(readFileSync(f, "utf8"), code);
process.stdout.write(JSON.stringify(out, null, 2));
