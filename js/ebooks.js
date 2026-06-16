/* ==========================================================================
   MaleMetrix — Ebook-Bibliothek (rendert aus js/ebooks-data.js)
   Du musst diese Datei normalerweise NICHT anfassen — neue Ebooks trägst du
   nur in js/ebooks-data.js ein.
   ========================================================================== */

(function () {
  "use strict";
  var grid = document.getElementById("ebookGrid");
  var feat = document.getElementById("featuredEbook");
  if (!grid && !feat) return;

  var books = window.MM_EBOOKS || [];
  var LANG = function () { return (window.MM && MM.i18n) ? MM.i18n.lang : "de"; };
  var tr = function (o) { if (o == null) return ""; if (typeof o === "string") return o; return o[LANG()] || o.de || ""; };
  var T = function (k, fb) { return (window.MM && MM.i18n && MM.i18n.t(k)) || fb; };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function readControl(b, cls, extraStyle) {
    var label = T("eb.read", "Jetzt lesen");
    if (b.gated) {
      // PDF/gated: E-Mail-Abfrage vor dem Öffnen
      return '<button class="btn btn-primary ' + cls + ' btn-arrow" data-read="' + esc(b.id) + '"' +
        (extraStyle ? ' style="' + extraStyle + '"' : "") + '>' + label + '</button>';
    }
    // frei lesbar: echter Link (gut für SEO, rechtsklick-fähig)
    return '<a href="' + esc(b.read) + '" class="btn btn-primary ' + cls + ' btn-arrow"' +
      (extraStyle ? ' style="' + extraStyle + '"' : "") + '>' + label + '</a>';
  }

  function badgeHTML(b, inCover) {
    if (!b.badge) return inCover ? "<div></div>" : "";
    var cls = inCover ? 'product-badge" style="position:static;display:inline-block' : 'cov-kicker';
    return '<div><span class="' + cls + '">' + esc(tr(b.badge)) + '</span></div>';
  }

  function fileFormatLabel(b) {
    return /\.pdf($|\?)/i.test(b.read || "") ? "📄 PDF" : "📖 " + T("eb.online", "Online lesen");
  }

  function render() {
    var featured = books.filter(function (b) { return b.featured; })[0];
    var rest = books.filter(function (b) { return b !== featured; });

    if (feat) {
      feat.innerHTML = featured ? (
        '<article class="ebook-card" style="border-color:var(--accent-line)">' +
        '<div class="masterguide-row" style="display:grid;grid-template-columns:0.9fr 1.1fr;gap:0">' +
        '<div class="ebook-cover" style="background:' + esc(featured.cover) + ';border-bottom:none;border-right:1px solid var(--line);min-height:280px">' +
        badgeHTML(featured, true) +
        '<div class="cov-title" style="font-size:1.9rem">' + esc(tr(featured.title)) + '</div>' +
        '<div class="cov-brand">malemetrix.de</div>' +
        '</div>' +
        '<div class="ebook-body" style="justify-content:center">' +
        '<span class="free-pill" style="margin-bottom:12px;align-self:flex-start">' + T("common.free", "Kostenlos") + '</span>' +
        '<p style="font-size:0.95rem">' + esc(tr(featured.desc)) + '</p>' +
        '<div class="ebook-meta"><span>' + fileFormatLabel(featured) + '</span><span>' + featured.minutes + ' ' + T("eb.minutes", "Min. Lesezeit") + '</span></div>' +
        readControl(featured, "", "align-self:flex-start") +
        '</div></div></article>'
      ) : "";
    }

    if (grid) {
      grid.innerHTML = rest.map(function (b) {
        return '<article class="ebook-card">' +
          '<div class="ebook-cover" style="background:' + esc(b.cover) + '">' +
          (b.badge ? '<div><span class="cov-kicker">' + esc(tr(b.badge)) + '</span></div>' : '<div><span class="cov-kicker">' + esc(tr(b.kicker)) + '</span></div>') +
          '<div class="cov-title">' + esc(tr(b.title)) + '</div>' +
          '<div class="cov-brand">malemetrix.de</div>' +
          '</div>' +
          '<div class="ebook-body">' +
          '<p>' + esc(tr(b.desc)) + '</p>' +
          '<div class="ebook-meta"><span>' + fileFormatLabel(b) + '</span><span>' + b.minutes + ' ' + T("eb.minutes", "Min. Lesezeit") + '</span></div>' +
          readControl(b, "btn-block") +
          '</div></article>';
      }).join("");
    }

    // Gated Ebooks: vor dem Öffnen E-Mail abfragen
    document.querySelectorAll("[data-read]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var b = books.filter(function (x) { return x.id === btn.getAttribute("data-read"); })[0];
        if (!b) return;
        if (window.MM && MM.track) MM.track("ebook_open", { id: b.id });
        var open = function () { window.open(b.read, "_blank", "noopener"); };
        if (window.MM && MM.unlock) MM.unlock.gate(open, "ebook-" + b.id);
        else open();
      });
    });
  }

  document.addEventListener("mm:langchange", render);
  render();
})();
