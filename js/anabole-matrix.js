/* ==========================================================================
   MALEMETRIX — DIE ANABOLE MATRIX (Darstellung)
   Rendert Matrix, Signalwege, Hebel, Trigger-Plan, den ehrlichen Vergleich
   und das Quellenregister aus js/anabole-matrix-data.js. Keine Daten in
   dieser Datei — wer Inhalt ändert, ändert die Datendatei.
   ========================================================================== */
(function () {
  "use strict";

  var D = window.MM_ANABOLIC;
  if (!D) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function el(id) { return document.getElementById(id); }
  function put(id, html) { var n = el(id); if (n) n.innerHTML = html; }

  var ROLLE = {
    gas:        { label: "ANTRIEB",  klasse: "r-gas" },
    kapazitaet: { label: "KAPAZITÄT", klasse: "r-kap" },
    bremse:     { label: "BREMSE",   klasse: "r-bremse" }
  };

  /* ---------- Quellenverweis als kompakte Marke (Autor Jahr) ---------- */
  function quellMarken(ids) {
    if (!ids || !ids.length) return "";
    return '<span class="am-refs">' + ids.map(function (id) {
      var q = D.quelle(id);
      if (!q) return "";
      return '<a class="am-ref" href="#quelle-' + esc(id) + '" title="' + esc(q.titel) + '">' + esc(q.kurz) + "</a>";
    }).join("") + "</span>";
  }

  /* ================================================================ MATRIX */
  function renderMatrix() {
    var kopf = '<th scope="col" class="am-corner"><span class="am-corner-t">HEBEL</span><span class="am-corner-b">SIGNALWEG</span></th>';
    D.signalwege.forEach(function (w) {
      var r = ROLLE[w.rolle];
      kopf += '<th scope="col" class="am-col ' + r.klasse + '">' +
        '<a href="#' + esc(w.id) + '" title="' + esc(w.name) + '"><span class="am-col-id">' + esc(w.id) + "</span>" +
        '<span class="am-col-n">' + esc(w.kurz) + "</span></a></th>";
    });

    var zeilen = D.hebel.map(function (h) {
      var tds = D.signalwege.map(function (w) {
        var v = (D.matrix[h.id] || {})[w.id] || 0;
        var m = D.wirkung[String(v)];
        return '<td class="am-cell ' + m.klasse + '" data-weg="' + esc(w.id) + '" data-hebel="' + esc(h.id) + '">' +
          '<span aria-hidden="true">' + m.zeichen + "</span>" +
          '<span class="sr-only">' + esc(h.name + " — " + w.name + ": " + m.name) + "</span></td>";
      }).join("");
      return '<tr><th scope="row" class="am-row"><a href="#' + esc(h.id) + '">' +
        '<span class="am-row-id">' + esc(h.id) + "</span>" +
        '<span class="am-row-n">' + esc(h.name) + "</span></a></th>" + tds + "</tr>";
    }).join("");

    put("amMatrix",
      '<table class="am-table"><caption class="sr-only">Zwölf Hebel und ihre Wirkung auf elf Signalwege</caption>' +
      "<thead><tr>" + kopf + "</tr></thead><tbody>" + zeilen + "</tbody></table>");
  }

  /* ============================================================ KENNZAHLEN
     Alle Zahlen werden gerechnet, keine gepflegt. Wer eine Matrixzelle
     ändert, ändert die Kopfzeile mit. */
  function renderKennzahlen() {
    var direkt = 0;
    D.hebel.forEach(function (h) {
      var z = D.matrix[h.id] || {};
      Object.keys(z).forEach(function (k) { if (z[k] === 2) direkt++; });
    });
    var breit = D.hebel.slice().sort(function (a, b) { return D.deckung(b.id) - D.deckung(a.id); })[0];

    put("amZahlen",
      metric(D.signalwege.length, "Signalwege") +
      metric(D.hebel.length, "steuerbare Hebel") +
      metric(direkt, "direkte Schaltpunkte") +
      metric(D.formel.faktoren.length, "Faktoren, multipliziert") +
      metric(D.deckung(breit.id) + '<small> Wege</small>', "breitester Hebel: " + breit.kurz) +
      metric(D.ohneHebel.length, "Wege ohne steuerbaren Hebel", "is-watch"));
  }
  function metric(v, k, mod) {
    return '<div class="mm-metric ' + (mod || "") + '"><span class="v">' + v + '</span><span class="k">' + esc(k) + "</span></div>";
  }

  /* =========================================================== SIGNALWEGE */
  function renderWege() {
    put("amWege", D.signalwege.map(function (w) {
      var r = ROLLE[w.rolle];
      var hebel = D.hebelFuer(w.id).map(function (hid) {
        var h = D.hebel.filter(function (x) { return x.id === hid; })[0];
        var v = D.matrix[hid][w.id];
        return '<a class="am-chip ' + D.wirkung[String(v)].klasse + '" href="#' + esc(hid) +
          '">' + D.wirkung[String(v)].zeichen + " " + esc(h.kurz) + "</a>";
      }).join("");

      var reihen = [
        ["Was er tut", w.was],
        [w.rolle === "bremse" ? "Was ihn anschaltet" : "Was ihn schaltet", w.schalter],
        w.loesen ? ["Wie du ihn löst", w.loesen] : null,
        ["Zeitfenster", w.fenster],
        ["Woran du es prüfst", w.nachweis],
        ["Häufigster Fehler", w.fehler],
        ["Die Grenze", w.grenze]
      ].filter(Boolean).map(function (p) {
        return '<div class="am-def"><dt>' + esc(p[0]) + "</dt><dd>" + esc(p[1]) + "</dd></div>";
      }).join("");

      return '<article class="am-item" id="' + esc(w.id) + '">' +
        '<header class="am-item-h">' +
          '<span class="am-id">' + esc(w.id) + "</span>" +
          "<h3>" + esc(w.name) + "</h3>" +
          '<span class="am-rolle ' + r.klasse + '">' + r.label + "</span>" +
        "</header>" +
        '<p class="am-sub">' + esc(w.unter) + "</p>" +
        '<dl class="am-defs">' + reihen + "</dl>" +
        '<div class="am-foot">' +
          '<span class="am-ev ev-' + w.evidenz.toLowerCase() + '">EVIDENZ ' + esc(w.evidenz) + "</span>" +
          '<span class="am-art">' + esc(w.evidenzArt) + "</span>" +
          quellMarken(w.quellen) +
          (hebel ? '<span class="am-chips">' + hebel + "</span>" : "") +
        "</div>" +
        (w.evidenzNote ? '<p class="am-note">' + esc(w.evidenzNote) + "</p>" : "") +
        "</article>";
    }).join(""));
  }

  /* ================================================================= HEBEL */
  function renderHebel() {
    put("amHebel", D.hebel.map(function (h) {
      var wege = D.signalwege.filter(function (w) { return (D.matrix[h.id] || {})[w.id]; })
        .map(function (w) {
          var v = D.matrix[h.id][w.id];
          return '<a class="am-chip ' + D.wirkung[String(v)].klasse + '" href="#' + esc(w.id) + '">' +
            D.wirkung[String(v)].zeichen + " " + esc(w.name) + "</a>";
        }).join("");

      return '<article class="am-item" id="' + esc(h.id) + '">' +
        '<header class="am-item-h">' +
          '<span class="am-id">' + esc(h.id) + "</span>" +
          "<h3>" + esc(h.name) + "</h3>" +
          '<span class="am-rolle r-hebel">' + esc(h.kurz) + "</span>" +
        "</header>" +
        '<dl class="am-defs">' +
          '<div class="am-def"><dt>Dosis</dt><dd>' + esc(h.dosis) + "</dd></div>" +
          '<div class="am-def"><dt>Warum er zieht</dt><dd>' + esc(h.warum) + "</dd></div>" +
          '<div class="am-def"><dt>Woran du es prüfst</dt><dd>' + esc(h.nachweis) + "</dd></div>" +
          '<div class="am-def"><dt>Häufigster Fehler</dt><dd>' + esc(h.fehler) + "</dd></div>" +
        "</dl>" +
        '<div class="am-foot">' +
          '<span class="am-ev ev-' + h.evidenz.toLowerCase() + '">EVIDENZ ' + esc(h.evidenz) + "</span>" +
          '<span class="am-art">' + esc(h.evidenzArt) + "</span>" +
          quellMarken(h.quellen) +
          '<span class="am-deck">' + D.deckung(h.id) + " von " + D.signalwege.length + " Wegen</span>" +
        "</div>" +
        (wege ? '<span class="am-chips">' + wege + "</span>" : "") +
        (h.evidenzNote ? '<p class="am-note">' + esc(h.evidenzNote) + "</p>" : "") +
        "</article>";
    }).join(""));
  }

  /* ============================================================== FORMEL
     Die multiplikative Logik. Sie steht vor der Matrix, weil sie erklärt,
     warum es eine Matrix ist und keine Rangliste. */
  function renderFormel() {
    var f = D.formel;
    put("amFormel",
      '<p class="am-formel-satz">' + esc(f.satz) + "</p>" +
      '<p class="am-formel-kern">' + esc(f.kern) + "</p>" +
      '<div class="am-faktoren">' + f.faktoren.map(function (fa, i) {
        var wege = fa.wege.map(function (id) {
          var w = D.signalwege.filter(function (x) { return x.id === id; })[0];
          return '<a class="am-chip" href="#' + esc(id) + '">' + esc(w ? w.kurz : id) + "</a>";
        }).join("");
        return '<div class="am-faktor">' +
          '<span class="am-faktor-n">' + (i + 1) + "</span>" +
          "<div><b>" + esc(fa.name) + "</b>" +
          '<p class="am-faktor-f">' + esc(fa.frage) + "</p>" +
          '<p class="am-faktor-l"><span>Steht bei null, wenn:</span> ' + esc(fa.leer) + "</p>" +
          '<span class="am-chips">' + wege + "</span></div></div>";
      }).join("") + "</div>" +
      '<p class="am-formel-folge">' + esc(f.folgerung) + "</p>");
  }

  /* ====================================================== WEGE OHNE HEBEL
     Real, aber nicht steuerbar. Sie stehen außerhalb der Matrix, weil eine
     Zeile ohne Hebel eine leere Zeile wäre — und trotzdem auf der Seite,
     weil genau unter diesen Namen Präparate verkauft werden. */
  function renderOhneHebel() {
    put("amOhne", D.ohneHebel.map(function (o) {
      return '<article class="am-oh" id="' + esc(o.id) + '">' +
        '<header class="am-oh-h"><h3>' + esc(o.name) + "</h3>" +
        '<span class="am-art">' + esc(o.art) + "</span></header>" +
        '<p class="am-oh-was">' + esc(o.was) + "</p>" +
        '<p class="am-oh-warum"><span>Warum kein Hebel:</span> ' + esc(o.warum) + "</p>" +
        "</article>";
    }).join(""));
  }

  /* ========================================================= TRIGGER-PLAN */
  function renderWoche() {
    put("amWoche", D.woche.map(function (t) {
      var wege = t.wege.map(function (id) {
        var w = D.signalwege.filter(function (x) { return x.id === id; })[0];
        return '<a class="am-chip" href="#' + esc(id) + '">' + esc(w ? w.name : id) + "</a>";
      }).join("");
      return '<div class="am-tag">' +
        '<span class="am-tag-d">' + esc(t.tag) + "</span>" +
        '<div class="am-tag-b"><b>' + esc(t.einheit) + "</b><p>" + esc(t.inhalt) + "</p>" +
        '<span class="am-chips">' + wege + "</span></div></div>";
    }).join(""));
  }

  /* ============================================================= VERGLEICH */
  function renderVergleich() {
    var v = D.vergleich;
    put("amVergleich",
      '<p class="am-frage">' + esc(v.frage) + "</p>" +
      '<p class="am-kern">' + esc(v.kern) + "</p>" +
      v.punkte.map(function (p) {
        return '<div class="am-vp"><b>' + esc(p.titel) + "</b><p>" + esc(p.text) + "</p>" +
          quellMarken(p.quellen) + "</div>";
      }).join(""));
  }

  /* ============================================================== QUELLEN */
  function renderQuellen() {
    var ids = Object.keys(D.quellen).sort(function (a, b) {
      return D.quellen[a].jahr - D.quellen[b].jahr;
    });
    put("amQuellen", "<ul>" + ids.map(function (id) {
      var q = D.quellen[id];
      return '<li id="quelle-' + esc(id) + '">' +
        "<div>" + esc(q.autoren) + " (" + q.jahr + "). " + esc(q.titel) + ".</div>" +
        "<div>" + esc(q.venue) + " · " + esc(q.art) + "</div>" +
        "<div><em>" + esc(q.aussage) + "</em></div>" +
        '<div><a href="' + esc(q.url) + '" rel="noopener" target="_blank">' + esc(q.url) + "</a> · DOI " + esc(q.doi) + "</div>" +
        "</li>";
    }).join("") + "</ul>");
  }

  /* ====================================================== INTERAKTION: FILTER
     Ein Schalter, kein Filtermenü: „nur direkte Schaltpunkte" blendet die
     erlaubenden und bremslösenden Zellen aus, damit sichtbar wird, wie
     schmal die Zahl der echten Schalter ist. */
  function wireFilter() {
    var btn = el("amOnlyDirect");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var an = document.body.classList.toggle("am-only-direct");
      btn.setAttribute("aria-pressed", an ? "true" : "false");
      btn.querySelector(".am-sw-l").textContent = an ? "NUR DIREKTE SCHALTER" : "ALLE WIRKUNGEN";
    });
  }

  /* ============================ Zeile + Spalte hervorheben beim Zeigen ==== */
  function wireCrosshair() {
    var tbl = el("amMatrix");
    if (!tbl) return;
    function markiere(weg) {
      tbl.querySelectorAll(".am-cell").forEach(function (c) {
        c.classList.toggle("is-col", !!weg && c.getAttribute("data-weg") === weg);
      });
    }
    tbl.addEventListener("mouseover", function (e) {
      var c = e.target.closest(".am-cell");
      markiere(c ? c.getAttribute("data-weg") : null);
    });
    tbl.addEventListener("mouseleave", function () { markiere(null); });
  }

  function init() {
    renderMatrix();
    renderKennzahlen();
    renderFormel();
    renderWege();
    renderHebel();
    renderOhneHebel();
    renderWoche();
    renderVergleich();
    renderQuellen();
    wireFilter();
    wireCrosshair();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
