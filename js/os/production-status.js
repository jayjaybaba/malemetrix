/* ==========================================================================
   MALEMETRIX PRODUCTION STATUS — MM.productionStatus()  (Phase 9, §91)
   --------------------------------------------------------------------------
   Sichere Bereitschafts-Diagnose. Meldet je externer Abhängigkeit nur:
   configured (ja/nein) und — wo gefahrlos — reachable. NIEMALS Secrets,
   niemals Schlüsselwerte, niemals Nutzerdaten. Öffentliche Client-Werte
   (z. B. ob eine Supabase-URL gesetzt ist) sind ohnehin im Auslieferungs-
   Code sichtbar; hier wird nur ihr Vorhandensein als Boolean gespiegelt.

   Aufruf in der Konsole:  await MM.productionStatus()
   ========================================================================== */
(function () {
  "use strict";
  if (!window.MM) window.MM = {};
  var CFG = window.MM_CONFIG || {};

  function present(v) { return !!(v && String(v).trim() && !/\[.*EINTRAGEN.*\]/i.test(String(v))); }

  function snapshot() {
    return {
      supabase: {
        client_configured: present(CFG.supabaseUrl) && (present(CFG.supabasePublishableKey) || present(CFG.supabaseAnonKey)),
        note: "Server-Secrets (service_role, Edge-Function-Keys) sind hier bewusst nicht sichtbar."
      },
      paypal: {
        buttons_configured: present(CFG.paypalClientId),
        mode: CFG.paypalClientId === "sb" ? "sandbox" : (present(CFG.paypalClientId) ? "live_client_id_set" : "off"),
        server_verification: "REQUIRES CONFIG (mm-commerce Deploy + PAYPAL_SECRET)"
      },
      bank_transfer: { configured: present((CFG.bank || {}).iban) && present((CFG.bank || {}).inhaber) },
      ai: {
        enabled_flag: !!CFG.AI_ENABLED,
        seam_ready: !!(MM.ai && MM.ai.configured),
        live: !!(MM.ai && MM.ai.configured && MM.ai.configured()),
        status: (MM.ai && MM.ai.status) ? MM.ai.status().state : "unknown"
      },
      push: {
        vapid_public_configured: present(CFG.vapidPublicKey),
        sw_registered: (typeof navigator !== "undefined" && "serviceWorker" in navigator),
        status: present(CFG.vapidPublicKey) ? "client_ready" : "REQUIRES CONFIG (VAPID + Scheduler)"
      },
      analytics: {
        provider_configured: present((CFG.analytics || {}).plausibleDomain),
        local_funnel: true,   // MM.funnel() zählt immer lokal
        status: present((CFG.analytics || {}).plausibleDomain) ? "provider_set" : "local_only"
      },
      email: { provider_configured: present(CFG.brevoFormAction), fallback: "FormSubmit/mailto", status: present(CFG.brevoFormAction) ? "provider_set" : "relay_only" },
      calendar_oauth: { configured: false, status: "DEFERRED (ICS-Import ist live)" },
      account_state: (MM.account && MM.account.snapshot) ? MM.account.snapshot().state : "unknown"
    };
  }

  // Async-Variante: pingt nur gefahrlose, öffentliche Endpunkte (keine Secrets).
  function check() {
    var s = snapshot();
    var probes = [];
    if (s.supabase.client_configured) {
      probes.push(fetch(CFG.supabaseUrl + "/auth/v1/health", { method: "GET" })
        .then(function (r) { s.supabase.reachable = r.ok || r.status === 400; })
        .catch(function () { s.supabase.reachable = false; }));
    }
    s.checked_at = new Date().toISOString();
    return Promise.all(probes).then(function () { return s; });
  }

  MM.productionStatus = check;
  MM.productionStatusSync = snapshot;
})();
