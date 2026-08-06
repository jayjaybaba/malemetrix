/* ==========================================================================
   MaleMetrix — zentrales Feature-Flag-System (Generation 2)

   EINE Quelle der Wahrheit für den Umschalt-Zustand zwischen der
   vereinfachten 12-Wochen-App ("simple") und der vollständigen OS-v1-App
   ("legacy"). Drei Ebenen, jede spätere gewinnt:

     1. DEFAULTS (unten)                    — sicherer Auslieferungszustand
     2. window.MM_CONFIG.featureFlags       — Deploy-Stand (js/config.js)
     3. mm_flags_user (MM.store, gesynct)   — pro Konto (Rollback je Nutzer)
     4. mm_flags_local (MM.store, Gerät)    — Gerät/Tester (höchste Stufe)

   WICHTIG (Sicherheitsmodell): Flags steuern NUR die Oberflächen-Führung.
   Sie sind KEIN Zugriffsschutz. Bezahlte Inhalte und Admin-Daten bleiben
   ausschließlich server-autoritativ geschützt (Entitlements per Service-Role,
   RLS, Owner-Rolle in mm-admin). Ein manipuliertes Client-Flag öffnet weder
   Inhalte noch Server-Ressourcen — es ändert nur, welche Ansicht geladen wird.

   Rollback ohne Codeänderung: siehe ROLLBACK.md.
   ========================================================================== */
(function () {
  "use strict";
  window.MM = window.MM || {};

  var DEFAULTS = {
    /* Vereinfachte App (meinplan.html) erreichbar? */
    simpleAppEnabled: true,
    /* Führt der Standard-Einstieg (My MaleMetrix) in die vereinfachte App?
       Rollout Stufe 1-2: false (Legacy bleibt Standard, Simple per Opt-in). */
    simpleAppDefault: false,
    /* Legacy-OS-App (mein-protokoll.html) erreichbar? */
    legacyAppEnabled: true,
    /* Legacy nur für Owner/Admin + Testkonten sichtbar verlinken?
       (Erreichbarkeit der URL bleibt — Inhalte sind ohnehin server-geschützt.) */
    legacyAppAdminOnly: false,
    /* Neue deterministische Plan-Engine aktiv? */
    newPlanEngineEnabled: true,
    /* Bei fehlendem/inkonsistentem Simple-Plan auf Legacy-Programmdaten
       zurückfallen (lesend)? */
    legacyPlanFallbackEnabled: true
  };

  function store() { return (window.MM && MM.store) ? MM.store : null; }

  function read(key) {
    var s = store();
    var v = s ? s.get(key, null) : null;
    return (v && typeof v === "object") ? v : {};
  }

  function resolve() {
    var out = {};
    var cfg = (window.MM_CONFIG && MM_CONFIG.featureFlags) || {};
    var user = read("flags_user");
    var local = read("flags_local");
    Object.keys(DEFAULTS).forEach(function (k) {
      var v = DEFAULTS[k];
      if (typeof cfg[k] === "boolean") v = cfg[k];
      if (typeof user[k] === "boolean") v = user[k];
      if (typeof local[k] === "boolean") v = local[k];
      out[k] = v;
    });
    return out;
  }

  MM.flags = {
    /* Aktueller effektiver Wert eines Flags. */
    get: function (name) {
      var all = resolve();
      return Object.prototype.hasOwnProperty.call(all, name) ? all[name] : undefined;
    },
    /* Alle effektiven Flags (Kopie). */
    all: resolve,
    /* Ebenen einzeln — für Diagnose (#profil → System). */
    layers: function () {
      return {
        defaults: JSON.parse(JSON.stringify(DEFAULTS)),
        config: (window.MM_CONFIG && MM_CONFIG.featureFlags) || {},
        user: read("flags_user"),
        local: read("flags_local")
      };
    },
    /* Konto-Ebene setzen (gesynct über os_state-Domain "flags_user" —
       Registrierung in js/simple/plan-store.js). Für Rollback pro Nutzer. */
    setUser: function (name, value) {
      if (!(name in DEFAULTS)) return false;
      var s = store(); if (!s) return false;
      var cur = read("flags_user");
      if (value === null || value === undefined) delete cur[name];
      else cur[name] = !!value;
      s.set("flags_user", cur);
      try { document.dispatchEvent(new CustomEvent("mm:flags", { detail: { level: "user", name: name } })); } catch (e) {}
      return true;
    },
    /* Geräte-Ebene setzen (nur dieses Gerät; für Tester und Support). */
    setLocal: function (name, value) {
      if (!(name in DEFAULTS)) return false;
      var s = store(); if (!s) return false;
      var cur = read("flags_local");
      if (value === null || value === undefined) delete cur[name];
      else cur[name] = !!value;
      s.set("flags_local", cur);
      try { document.dispatchEvent(new CustomEvent("mm:flags", { detail: { level: "local", name: name } })); } catch (e) {}
      return true;
    },
    /* Bekannte Flag-Namen (für Diagnose-UI). */
    names: function () { return Object.keys(DEFAULTS); },
    _defaults: DEFAULTS
  };
})();
