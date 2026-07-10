/* ==========================================================================
   MaleMetrix — Ebook-Landingpages (lp/*.html)
   Eine fokussierte Seite pro Ebook: Name + E-Mail → freischalten & lesen.
   Nutzt die bestehende Lead-Infrastruktur (MM.subscribe / MM.unlock).
   Konfiguration kommt aus data-Attributen auf #lpForm — dieses Skript ist
   für ALLE Landingpages identisch und wird zentral gepflegt.
   ========================================================================== */

(function () {
  "use strict";
  if (!window.MM) return;

  var form = document.getElementById("lpForm");
  var success = document.getElementById("lpSuccess");
  if (!form || !success) return;

  var id     = form.getAttribute("data-ebook-id") || "ebook";
  var title  = form.getAttribute("data-ebook-title") || "Ebook";
  var read   = form.getAttribute("data-ebook-read") || "#";
  var pdf    = form.getAttribute("data-ebook-pdf") || "";

  var nameI  = document.getElementById("lpName");
  var emailI = document.getElementById("lpEmail");
  var consentI = document.getElementById("lpConsent");
  var errEl  = document.getElementById("lpErr");
  var btn    = form.querySelector("button[type=submit]");

  function showErr(msg) { if (errEl) { errEl.textContent = msg; errEl.style.display = "block"; } }
  function clearErr() { if (errEl) errEl.style.display = "none"; }

  /* Baut den Erfolgs-Block: „Jetzt lesen" + optional echte PDF. */
  function reveal(name) {
    var greet = name ? ("Perfekt, " + name + " — ") : "Perfekt — ";
    var pdfBtn = pdf
      ? '<a class="btn btn-dark btn-lg btn-block" style="margin-top:10px" href="' + pdf + '" download>Als PDF herunterladen</a>'
      : '';
    success.innerHTML =
      '<div class="lp-success-card">' +
        '<div class="lp-check">✓</div>' +
        '<h2 style="margin:6px 0 6px">' + greet + 'dein Ebook ist freigeschaltet.</h2>' +
        '<p class="muted" style="margin-bottom:20px">„' + title + '" — du kannst es jetzt lesen. ' +
          'Wir haben dir den Zugang auf diesem Gerät gemerkt; du kommst jederzeit wieder rein.</p>' +
        '<a class="btn btn-primary btn-lg btn-block btn-arrow" href="' + read + '" target="_blank" rel="noopener" ' +
          'data-track="lp_open" data-track-id="' + id + '">Ebook jetzt lesen</a>' +
        pdfBtn +
        (pdf ? '' : '<p class="small" style="color:var(--muted-2);margin-top:12px">Tipp: Im Ebook oben auf „Als PDF speichern" für die Offline-Version.</p>') +
      '</div>';
    form.hidden = true;
    var intro = document.getElementById("lpFormIntro");
    if (intro) intro.hidden = true;
    success.hidden = false;
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* Schon freigeschaltet (früher eingetragen)? Dann Formular überspringen. */
  if (MM.unlock && MM.unlock.isUnlocked()) {
    reveal(MM.store.get("unlock_name", ""));
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErr();
    var name = String(nameI ? nameI.value : "").trim();
    var email = String(emailI ? emailI.value : "").trim();
    if (name.length < 2) { showErr("Bitte gib deinen Namen ein."); nameI && nameI.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showErr("Bitte gib eine gültige E-Mail-Adresse ein."); emailI && emailI.focus(); return; }
    if (consentI && !consentI.checked) { showErr("Bitte bestätige die Einwilligung."); return; }

    btn.disabled = true;
    var oldLabel = btn.textContent;
    btn.textContent = "Wird freigeschaltet…";

    if (MM.track) MM.track("lp_submit", { id: id });

    // Lead senden (mit Name) + Unlock lokal merken
    try {
      await MM.subscribe(email, "lp-" + id, { name: name, quiet: true, ebook: title });
    } catch (err) { /* Unlock bleibt lokal gespeichert */ }
    MM.store.set("unlock_name", name);

    btn.textContent = oldLabel;
    btn.disabled = false;
    reveal(name);
  });
})();
