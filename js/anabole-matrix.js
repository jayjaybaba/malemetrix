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
        '<span class="am-col-n">' + esc(w.kurz) + "</span>" +
        '<span class="am-col-st" data-weg="' + esc(w.id) + '"></span></a></th>';
    });

    var zeilen = D.hebel.map(function (h) {
      var tds = D.signalwege.map(function (w) {
        var v = (D.matrix[h.id] || {})[w.id] || 0;
        var m = D.wirkung[String(v)];
        return '<td class="am-cell ' + m.klasse + '" data-weg="' + esc(w.id) + '" data-hebel="' + esc(h.id) +
        '" data-stark="' + (v === 2 || v === -1 ? "1" : "0") + '">' +
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

  /* ============================================================ SELBSTCHECK
     Projiziert das eigene Trainings- und Regenerationsverhalten auf die
     Matrix. Er misst nichts im Muskel — jede Formulierung hier bleibt bei
     „dein Verhalten adressiert" und behauptet nie molekulare Aktivität.
     Der Test in tools-dev/tests/anabole-matrix.test.js hält das fest. */
  var SPEICHER = "anabolic_check";
  var antworten = {};
  /* Welche Antworten aus dem Score stammen. Nur Anzeigezustand, wird nicht
     gespeichert — nach einem Neuladen sind alle Antworten gleichwertig
     editierbar und werden nicht länger als übernommen ausgewiesen. */
  var uebernommen = {};

  function ladeAntworten() {
    try {
      var a = (window.MM && MM.store) ? MM.store.get(SPEICHER, {}) : {};
      Object.keys(a || {}).forEach(function (k) {
        if (typeof a[k] === "number" && a[k] >= 0 && a[k] <= 2) antworten[k] = a[k];
      });
    } catch (e) { /* Speicher blockiert — der Check läuft trotzdem */ }
  }
  function sichereAntworten() {
    try { if (window.MM && MM.store) MM.store.set(SPEICHER, antworten); } catch (e) { /* noop */ }
  }

  /* ---- Übernahme aus dem Score ----------------------------------------
     Nur lesend. Der Score bleibt unberührt: keine Rückschreibung, keine
     Änderung an seiner Engine, keine zweite Kopie der Antworten.

     Die Abbildung Score-Antwort → Hebel liegt in js/matrix-cta.js, weil die
     Score-Ergebnisseite dieselbe Prüfung braucht, um zu entscheiden, ob sie
     eine Vorbelegung überhaupt ankündigen darf. Läge sie doppelt vor, würde
     die eine Seite versprechen, was die andere nicht einlöst.

     Gelesen wird beides: `check_result.answers` nach einem abgeschlossenen
     Score — check.js löscht `check_draft` beim Abschluss — und ersatzweise
     der Entwurf eines noch laufenden Score-Durchgangs. */
  function scoreRohdaten() {
    if (!(window.MM && MM.store)) return null;
    var res = null, draft = null;
    try { res = MM.store.get("check_result", null); } catch (e) { res = null; }
    try { draft = MM.store.get("check_draft", null); } catch (e) { draft = null; }
    var M = window.MM_MATRIX_CTA;
    if (M) return M.scoreAntworten(res, draft);
    return (res && res.answers) || draft || null;
  }

  function ausScore() {
    var M = window.MM_MATRIX_CTA;
    if (!M) return {};
    try { return M.prefillFrom(scoreRohdaten()); } catch (e) { return {}; }
  }

  function renderCheck() {
    var wrap = el("amCheckFragen");
    if (!wrap) return;
    wrap.innerHTML = D.fragen.map(function (f, i) {
      var h = D.hebel.filter(function (x) { return x.id === f.hebel; })[0];
      return '<fieldset class="am-q" data-hebel="' + esc(f.hebel) + '">' +
        '<legend><span class="am-q-n">' + (i + 1) + " / " + D.fragen.length + "</span>" +
        '<span class="am-q-t">' + esc(f.frage) + "</span></legend>" +
        '<div class="am-q-opts">' + f.optionen.map(function (o) {
          return '<button type="button" class="am-opt" data-hebel="' + esc(f.hebel) + '" data-w="' + o.w + '"' +
            ' aria-pressed="false">' + esc(o.label) + "</button>";
        }).join("") + "</div>" +
        '<a class="am-q-ref" href="#' + esc(f.hebel) + '">' + esc(h ? h.name : f.hebel) + " nachlesen</a>" +
        "</fieldset>";
    }).join("");

    wrap.addEventListener("click", function (e) {
      var b = e.target.closest(".am-opt");
      if (!b) return;
      var h = b.getAttribute("data-hebel");
      antworten[h] = Number(b.getAttribute("data-w"));
      delete uebernommen[h];              // eigene Wahl ersetzt die Übernahme
      sichereAntworten();
      zeichneCheck();
    });

    var reset = el("amCheckReset");
    if (reset) reset.addEventListener("click", function () {
      antworten = {};
      uebernommen = {};
      sichereAntworten();
      zeichneCheck();
    });

    var uebernahme = el("amCheckScore");
    if (uebernahme) {
      /* Der Knopf verspricht nur, was tatsächlich geht: Ohne verwertbare
         Score-Antworten bleibt er deaktiviert statt wirkungslos zu klicken. */
      var vorhanden = Object.keys(ausScore()).length;
      if (!vorhanden) {
        uebernahme.disabled = true;
        uebernahme.title = "Keine übernehmbaren Antworten gefunden — mach zuerst den Score.";
      }
      uebernahme.addEventListener("click", function () {
        var v = ausScore();
        Object.keys(v).forEach(function (k) { antworten[k] = v[k]; uebernommen[k] = true; });
        sichereAntworten();
        zeichneCheck();
      });
    }
  }

  /* ---- Zeichnen: Auswahlzustand, Matrix-Einfärbung, Auswertung ---- */
  function zeichneCheck() {
    var r = D.bewerte(antworten);

    document.querySelectorAll(".am-opt").forEach(function (b) {
      var an = antworten[b.getAttribute("data-hebel")] === Number(b.getAttribute("data-w"));
      b.classList.toggle("is-on", an);
      b.setAttribute("aria-pressed", an ? "true" : "false");
    });

    /* Übernommene Antworten sind als solche erkennbar und bleiben genauso
       änderbar wie selbst gegebene. Sie sind eine Ableitung aus früheren
       Angaben, kein gemessener Befund. */
    document.querySelectorAll(".am-q").forEach(function (f) {
      var h = f.getAttribute("data-hebel");
      f.classList.toggle("is-uebernommen", !!uebernommen[h]);
      var m = f.querySelector(".am-q-src");
      if (uebernommen[h] && !m) {
        m = document.createElement("span");
        m.className = "am-q-src";
        m.textContent = "aus deinem Score übernommen · änderbar";
        f.querySelector("legend").appendChild(m);
      } else if (!uebernommen[h] && m) { m.remove(); }
    });

    /* Matrix einfärben: Zeilen nach der eigenen Antwort, Spaltenmarker nach
       dem Zustand des Weges. Ohne eine einzige Antwort bleibt die Matrix
       neutral — sie ist zuerst eine Referenz und erst dann ein Spiegel. */
    var tbl = el("amMatrix");
    if (tbl) {
      tbl.classList.toggle("is-checked", r.beantwortet > 0);
      tbl.querySelectorAll(".am-cell").forEach(function (c) {
        var a = antworten[c.getAttribute("data-hebel")];
        c.classList.remove("ck-2", "ck-1", "ck-0");
        if (typeof a === "number") c.classList.add("ck-" + a);
        var z = r.wege[c.getAttribute("data-weg")];
        c.classList.toggle("ck-weg-keiner", z === "keiner");
      });
      tbl.querySelectorAll(".am-col-st").forEach(function (s) {
        var id = s.getAttribute("data-weg"), z = r.wege[id];
        s.className = "am-col-st " + D.status[z].klasse;
        s.title = D.statusLabel(id, z);
      });
    }

    put("amCheckFortschritt", r.beantwortet + " von " + r.gesamt + " beantwortet");
    renderCheckErgebnis(r);
  }

  function renderCheckErgebnis(r) {
    var box = el("amCheckResult");
    if (!box) return;
    if (!r.beantwortet) {
      box.innerHTML = '<p class="am-ck-leer">Noch keine Antwort. Die Matrix oben bleibt neutral, bis du die erste Frage beantwortest — sie ist zuerst eine Referenz und erst dann ein Spiegel.</p>';
      return;
    }

    /* Wege nach Zustand gruppiert. „Noch offen" steht eigenständig da und
       wird nie als Versäumnis gezählt. */
    var gruppen = ["keiner", "schwach", "stark", "offen"].map(function (z) {
      var ids = D.signalwege.filter(function (w) { return r.wege[w.id] === z; });
      if (!ids.length) return "";
      var titel = { keiner: "Dein Verhalten adressiert diese nicht", schwach: "Nur teilweise adressiert",
        stark: "Adressiert", offen: "Noch offen — dazu fehlen Antworten" }[z];
      return '<div class="am-ck-grp ' + D.status[z].klasse + '">' +
        '<span class="am-ck-grp-k">' + esc(titel) + " · " + ids.length + "</span>" +
        '<div class="am-chips">' + ids.map(function (w) {
          return '<a class="am-chip" href="#' + esc(w.id) + '">' + esc(w.kurz) +
            ' <em>' + esc(D.statusLabel(w.id, z)) + "</em></a>";
        }).join("") + "</div></div>";
    }).join("");

    var sw = r.schwaechster;
    var faktor = sw
      ? '<div class="am-ck-faktor"><span class="k">Schwächster Faktor der Rechnung</span>' +
        "<b>" + esc(sw.name) + "</b><p>" + esc(sw.frage) + "</p>" +
        (sw.bewertbar < sw.gesamt ? '<p class="am-ck-teil">Beurteilt aus ' + sw.bewertbar + " von " + sw.gesamt + " Wegen — der Rest ist noch offen.</p>" : "") +
        "</div>"
      : '<div class="am-ck-faktor"><span class="k">Schwächster Faktor der Rechnung</span>' +
        "<b>Kein Faktor liegt zurück</b><p>Nach dem, was bisher beantwortet ist, steht keiner der Faktoren hinter den anderen. Ein „schwächster“ wird hier nicht benannt, solange es keinen gibt — sonst wäre es nur die Reihenfolge der Liste.</p></div>";

    var n = r.naechster;
    var wegNamen = n ? esc(n.oeffnet.map(function (id) {
      var w = D.signalwege.filter(function (x) { return x.id === id; })[0];
      return w ? w.name : id;
    }).join(", ")) : "";
    var eins = n && n.n === 1;
    var wirkung = !n ? "" : (n.zustand === "keiner"
      ? (eins ? "Er würde einen Weg erreichen, den dein Verhalten aktuell nicht adressiert: "
              : "Er würde " + n.n + " Wege erreichen, die dein Verhalten aktuell nicht adressiert: ") + wegNamen + "."
      : (eins ? "Er würde einen Weg vervollständigen, der bisher nur teilweise adressiert ist: "
              : "Er würde " + n.n + " Wege vervollständigen, die bisher nur teilweise adressiert sind: ") + wegNamen + ".");

    var naechster = n
      ? '<div class="am-ck-next"><span class="k">Ein Hebel, nicht sieben</span>' +
        "<b>" + esc(n.hebel.name) + "</b><p>" + esc(n.hebel.dosis) + "</p>" +
        '<p class="am-ck-next-w">' + wirkung + '</p><a class="am-chip" href="#' + esc(n.hebel.id) + '">Hebel nachlesen</a></div>'
      : (r.vollstaendig
        ? '<div class="am-ck-next"><span class="k">Ein Hebel, nicht sieben</span><b>Aktuell keiner offen</b>' +
          "<p>Nach deinen Angaben adressiert dein Verhalten jeden Weg, den die Hebel direkt bedienen. Das heißt nicht, dass nichts mehr geht — es heißt, dass der nächste Schritt Zeit ist und nicht eine weitere Maßnahme.</p></div>"
        : '<div class="am-ck-next"><span class="k">Ein Hebel, nicht sieben</span><b>Noch nicht bestimmbar</b>' +
          "<p>Dafür fehlen Antworten. Es wird hier kein Hebel empfohlen, solange die Grundlage dafür unvollständig ist — " + (r.gesamt - r.beantwortet) + " Fragen sind noch offen.</p></div>");

    box.innerHTML =
      '<p class="am-ck-hinweis"><span>Was das ist</span> Eine Projektion deiner eigenen Angaben auf die Matrix — kein Messwert und kein Rückschluss auf das, was in deinem Muskel tatsächlich passiert. Selbstauskunft überschätzt vor allem RIR und Satzzahl zuverlässig. Und es gibt bewusst keine Gesamtnote: Die Rechnung ist multiplikativ, ein Mittelwert würde genau das verwischen.</p>' +
      faktor + naechster +
      '<div class="am-ck-wege">' + gruppen + "</div>" +
      (r.vollstaendig ? "" : '<p class="am-ck-teil">Noch nicht alle Fragen beantwortet — die offenen Wege bleiben ausdrücklich unbewertet, statt als Versäumnis zu zählen.</p>');
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
    ladeAntworten();
    renderCheck();
    zeichneCheck();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
