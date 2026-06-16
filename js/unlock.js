/* ==========================================================================
   MaleMetrix — E-Mail-Unlock für Ebooks
   Lesen bleibt offen (SEO). Der PDF-Download / das Paket wird per E-Mail
   freigeschaltet und im Browser gemerkt — kein Passwort, kein Backend.
   ========================================================================== */

(function () {
  "use strict";
  if (!window.MM) return;

  const T = (de, en) => (window.MM.i18n && MM.i18n.lang === "en") ? en : de;

  MM.unlock = {
    isUnlocked() { return !!MM.store.get("unlock_email", null); },
    email() { return MM.store.get("unlock_email", null); },
    /** Führt onSuccess aus, wenn freigeschaltet — sonst öffnet das Gate-Modal. */
    gate(onSuccess, source) {
      if (MM.unlock.isUnlocked()) { onSuccess && onSuccess(); return; }
      openModal(onSuccess, source);
    }
  };

  function openModal(onSuccess, source) {
    let modal = document.getElementById("unlockModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "unlockModal";
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }
    modal.innerHTML =
      '<div class="modal-box" style="max-width:460px">' +
      '<div class="modal-head"><h3 class="h-card">' + T("Kostenlos freischalten", "Unlock for free") + '</h3>' +
      '<button class="cart-close" id="ulClose">✕</button></div>' +
      '<p class="muted" style="margin-bottom:18px;font-size:0.92rem">' +
      T("Trag deine E-Mail ein und lade alle MaleMetrix-Ebooks als PDF — plus gelegentliche, ehrliche Tipps für Männer. Jederzeit abbestellbar.",
        "Enter your email and download all MaleMetrix ebooks as PDF — plus the occasional, honest tip for men. Unsubscribe anytime.") + '</p>' +
      '<div class="field"><input type="email" id="ulEmail" placeholder="' + T("du@beispiel.de", "you@example.com") + '" autocomplete="email"></div>' +
      '<label class="checkbox-row" id="ulConsentRow" style="margin-bottom:16px"><input type="checkbox" id="ulConsent">' +
      '<span>' + T("Ich möchte die Ebooks und gelegentliche Tipps per E-Mail erhalten und akzeptiere die ",
                   "I'd like to receive the ebooks and occasional tips by email and accept the ") +
      '<a href="datenschutz.html" target="_blank" style="text-decoration:underline">' + T("Datenschutzerklärung", "privacy policy") + '</a>. ' +
      T("(Bestätigungsmail folgt — Double-Opt-In.)", "(Confirmation email follows — double opt-in.)") + '</span></label>' +
      '<button class="btn btn-primary btn-block" id="ulSubmit">' + T("Freischalten &amp; herunterladen", "Unlock &amp; download") + '</button>' +
      '<p class="small" style="color:var(--muted-2);margin-top:12px;text-align:center">' +
      T("Kein Spam. Deine Daten werden nicht verkauft.", "No spam. Your data is never sold.") + '</p>' +
      '</div>';

    // Pfad zur Datenschutzerklärung anpassen (Ebook-Reader liegen in /ebooks/)
    if (location.pathname.indexOf("/ebooks/") !== -1) {
      modal.querySelectorAll('a[href="datenschutz.html"]').forEach(a => a.setAttribute("href", "../datenschutz.html"));
    }

    modal.classList.add("open");
    const close = () => modal.classList.remove("open");
    modal.querySelector("#ulClose").addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    modal.querySelector("#ulConsent").addEventListener("change", (e) =>
      e.target.closest(".checkbox-row").classList.toggle("checked", e.target.checked));

    const submit = async () => {
      const email = modal.querySelector("#ulEmail").value.trim();
      const consent = modal.querySelector("#ulConsent").checked;
      if (!email || !email.includes("@")) { MM.toast(T("Bitte gültige E-Mail eingeben", "Please enter a valid email")); return; }
      if (!consent) { MM.toast(T("Bitte Einwilligung bestätigen", "Please confirm consent")); return; }
      const btn = modal.querySelector("#ulSubmit");
      btn.disabled = true; btn.textContent = T("Wird freigeschaltet…", "Unlocking…");
      const res = await MM.subscribe(email, source || "ebook");
      close();
      MM.toast(res.viaMailto
        ? T("E-Mail-Programm geöffnet — bitte absenden", "Email app opened — please send")
        : T("Freigeschaltet! Bestätige ggf. die E-Mail.", "Unlocked! Confirm the email if asked."));
      markUnlockedUI();
      onSuccess && onSuccess();
    };
    modal.querySelector("#ulSubmit").addEventListener("click", submit);
    modal.querySelector("#ulEmail").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    setTimeout(() => modal.querySelector("#ulEmail").focus(), 50);
  }

  /* Sichtbaren Zustand der gated Buttons / Capture-Box aktualisieren */
  function markUnlockedUI() {
    const unlocked = MM.unlock.isUnlocked();
    document.querySelectorAll("[data-gate]").forEach(btn => {
      if (unlocked) btn.removeAttribute("data-gated-hint");
    });
    const box = document.getElementById("unlockBox");
    if (box && unlocked) {
      box.innerHTML = '<div class="alert alert-info" style="margin:0"><span class="alert-icon">✓</span><div>' +
        T("Freigeschaltet als <strong>", "Unlocked as <strong>") + MM.unlock.email() + "</strong>. " +
        T("Du kannst jetzt in jedem Ebook auf „PDF“ tippen.", "You can now hit “PDF” in any ebook.") + '</div></div>';
    }
  }

  /* Gated Buttons verdrahten: data-gate="print" → window.print() nach Unlock */
  function wireGates() {
    document.querySelectorAll('[data-gate="print"]').forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        MM.unlock.gate(() => setTimeout(() => window.print(), 200), "ebook-pdf");
      });
    });

    // Inline-Capture-Box auf der Ebook-Bibliothek
    const form = document.getElementById("unlockBoxForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const inp = form.querySelector("input[type=email]");
        const consent = form.querySelector("input[type=checkbox]");
        const email = inp.value.trim();
        if (!email || !email.includes("@")) { MM.toast(T("Bitte gültige E-Mail eingeben", "Please enter a valid email")); return; }
        if (consent && !consent.checked) { MM.toast(T("Bitte Einwilligung bestätigen", "Please confirm consent")); return; }
        const btn = form.querySelector("button");
        btn.disabled = true;
        const res = await MM.subscribe(email, "ebook-box");
        MM.toast(res.viaMailto ? T("E-Mail-Programm geöffnet", "Email app opened") : T("Eingetragen! Bestätige ggf. die E-Mail.", "Subscribed! Confirm the email if asked."));
        markUnlockedUI();
      });
    }

    markUnlockedUI();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireGates);
  else wireGates();
  document.addEventListener("mm:langchange", markUnlockedUI);
})();
