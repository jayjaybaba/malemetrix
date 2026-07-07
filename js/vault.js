/* ==========================================================================
   MaleMetrix Vault — Entschlüsselung geschützter Inhalte im Browser
   --------------------------------------------------------------------------
   Premium-Inhalte liegen NICHT im Klartext in der Seite, sondern als
   AES-256-GCM-verschlüsselter Payload (JSON-Script-Tag). Der Zugangscode
   ist der Schlüssel (PBKDF2-SHA256, 150k Iterationen) und steht nirgends
   im ausgelieferten Code. Falscher Code ⇒ Entschlüsselung schlägt fehl.
   Payloads erzeugt tools-dev/vault.mjs.
   ========================================================================== */

(function () {
  "use strict";
  if (!window.MM) window.MM = {};

  function b64(s) {
    var bin = atob(s);
    var a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }

  function norm(code) {
    return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  async function decrypt(payload, code) {
    if (!(window.crypto && crypto.subtle)) {
      throw new Error("Entschlüsselung braucht einen sicheren Kontext (https).");
    }
    var enc = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey("raw", enc.encode(norm(code)), "PBKDF2", false, ["deriveKey"]);
    var key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: b64(payload.salt), iterations: payload.iter || 150000, hash: "SHA-256" },
      keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(payload.iv) }, key, b64(payload.ct));
    return new TextDecoder().decode(pt);
  }

  MM.vault = {
    norm: norm,
    read: function (id) {
      var el = document.getElementById(id);
      if (!el) return null;
      try { return JSON.parse(el.textContent); } catch (e) { return null; }
    },
    /** Entschlüsselt den Payload aus <script type="application/json" id=...>.
        Wirft bei falschem Code (GCM-Auth schlägt fehl). */
    open: async function (id, code) {
      var payload = MM.vault.read(id);
      if (!payload) throw new Error("Vault-Payload fehlt: " + id);
      return decrypt(payload, code);
    },
    /** Entschlüsselt einen direkt übergebenen Payload (Objekt statt DOM). */
    openRaw: function (payload, code) { return decrypt(payload, code); }
  };
})();
