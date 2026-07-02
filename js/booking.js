/* ==========================================================================
   MaleMetrix Terminbuchung — Kalender, Slots, ICS-Export
   ========================================================================== */

(function () {
  "use strict";

  const CFG = (window.MM_CONFIG || {}).booking || {};
  const WEEKDAYS = CFG.weekdays || [1, 2, 3, 4, 5];

  // Uhrzeiten je nach Tag: Mo–Fr nur abends, Sa/So ganztags.
  function slotsForDate(d) {
    const day = d.getDay(); // 0 = So, 6 = Sa
    const weekend = (day === 0 || day === 6);
    if (weekend && CFG.slotsWeekend && CFG.slotsWeekend.length) return CFG.slotsWeekend;
    if (!weekend && CFG.slotsWeekday && CFG.slotsWeekday.length) return CFG.slotsWeekday;
    return CFG.slots || ["17:00", "17:45", "18:30"];
  }
  const WEEKS_AHEAD = CFG.weeksAhead || 4;
  const DURATION = CFG.durationMin || 45;

  /* ---------- Cal.com (wenn calLink gesetzt) ---------- */
  const CAL_LINK = (window.MM_CONFIG || {}).calLink;
  const bookingWrap = document.getElementById("bookingWrap");
  if (CAL_LINK && bookingWrap) {
    mountCalCom(CAL_LINK, bookingWrap);
    return;
  }

  function mountCalCom(link, wrap) {
    const layout = wrap.querySelector(".booking-layout");
    const host = document.createElement("div");
    host.id = "cal-embed";
    host.style.minHeight = "640px";
    host.style.borderRadius = "16px";
    host.style.overflow = "hidden";
    if (layout) layout.replaceWith(host); else wrap.querySelector(".container").appendChild(host);

    // Offizieller Cal.com Embed-Loader
    (function (C, A, L) {
      let p = function (a, ar) { a.q.push(ar); };
      let d = C.document;
      C.Cal = C.Cal || function () {
        let cal = C.Cal; let ar = arguments;
        if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; }
        if (ar[0] === L) {
          const api = function () { p(api, arguments); };
          const namespace = ar[1]; api.q = api.q || [];
          if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); }
          else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");
    const dark = document.documentElement.getAttribute("data-theme") !== "light";
    window.Cal("init", { origin: "https://cal.com" });
    window.Cal("inline", { elementOrSelector: "#cal-embed", calLink: link, config: { theme: dark ? "dark" : "light" } });
    window.Cal("ui", { theme: dark ? "dark" : "light", hideEventTypeDetails: false, styles: { branding: { brandColor: "#2e7cf6" } } });
  }

  const $ = (s) => document.querySelector(s);
  const calGrid = document.getElementById("calGrid");
  if (!calGrid) return;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minDate = new Date(today); minDate.setDate(minDate.getDate() + 1); // ab morgen
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + WEEKS_AHEAD * 7);

  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selDate = null;
  let selSlot = null;

  const fmtDate = (d) => d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const keyOf = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  function bookedSlots(dateKey) {
    const bookings = MM.store.get("bookings", []);
    return bookings.filter(b => b.dateKey === dateKey).map(b => b.slot);
  }

  function isBookable(d) {
    return d >= minDate && d <= maxDate && WEEKDAYS.includes(d.getDay());
  }

  /* ---------- Kalender ---------- */

  function renderCalendar() {
    const first = new Date(viewYear, viewMonth, 1);
    const monthName = first.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    $("#calMonth").textContent = monthName;

    // Navigation begrenzen
    const prevOk = new Date(viewYear, viewMonth, 0) >= new Date(today.getFullYear(), today.getMonth(), 1);
    const nextOk = new Date(viewYear, viewMonth + 1, 1) <= maxDate;
    $("#calPrev").disabled = !prevOk;
    $("#calNext").disabled = !nextOk;

    let html = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => '<div class="cal-dow">' + d + '</div>').join("");

    // Leerzellen vor Monatsbeginn (Mo = Spalte 1)
    const lead = (first.getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) html += "<div></div>";

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      const bookable = isBookable(d);
      const isSel = selDate && keyOf(d) === keyOf(selDate);
      html += '<button type="button" class="cal-day ' + (bookable ? "available" : "disabled") + (isSel ? " selected" : "") + '"' +
        (bookable ? ' data-day="' + day + '"' : " disabled") + '>' + day + '</button>';
    }
    calGrid.innerHTML = html;

    calGrid.querySelectorAll("[data-day]").forEach(btn => {
      btn.addEventListener("click", () => {
        selDate = new Date(viewYear, viewMonth, parseInt(btn.dataset.day, 10));
        selSlot = null;
        renderCalendar();
        renderSlots();
        updateSummary();
      });
    });
  }

  function renderSlots() {
    const box = $("#slotBox");
    if (!selDate) {
      box.innerHTML = '<p class="muted small">Wähle zuerst einen Tag im Kalender.</p>';
      return;
    }
    const taken = bookedSlots(keyOf(selDate));
    box.innerHTML = '<p class="small" style="margin-bottom:14px;color:var(--muted)">Freie Zeiten am <strong style="color:var(--text)">' + fmtDate(selDate) + '</strong>:</p>' +
      '<div class="slot-grid">' +
      slotsForDate(selDate).map(s => {
        const isTaken = taken.includes(s);
        const isSel = selSlot === s;
        return '<button type="button" class="slot-chip' + (isTaken ? " taken" : "") + (isSel ? " selected" : "") + '"' +
          (isTaken ? " disabled" : ' data-slot="' + s + '"') + '>' + s + ' Uhr</button>';
      }).join("") + '</div>';

    box.querySelectorAll("[data-slot]").forEach(btn => {
      btn.addEventListener("click", () => {
        selSlot = btn.dataset.slot;
        renderSlots();
        updateSummary();
      });
    });
  }

  function updateSummary() {
    const sum = $("#bookingSummary");
    const btn = $("#bookSubmit");
    if (selDate && selSlot) {
      sum.style.display = "";
      sum.innerHTML = '<strong>Dein Termin:</strong><span>' + fmtDate(selDate) + ' · ' + selSlot + ' Uhr · ' + DURATION + ' Minuten · Video-Call oder Telefon</span>';
      btn.disabled = false;
    } else {
      sum.style.display = "none";
      btn.disabled = true;
    }
  }

  /* ---------- ICS ---------- */

  function icsString(d, slot) {
    const [h, m] = slot.split(":").map(Number);
    const start = new Date(d); start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + DURATION * 60000);
    const f = (x) => x.getFullYear() + String(x.getMonth() + 1).padStart(2, "0") + String(x.getDate()).padStart(2, "0") +
      "T" + String(x.getHours()).padStart(2, "0") + String(x.getMinutes()).padStart(2, "0") + "00";
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MaleMetrix//Termin//DE", "BEGIN:VEVENT",
      "UID:" + Date.now() + "@malemetrix",
      "DTSTART:" + f(start), "DTEND:" + f(end),
      "SUMMARY:MaleMetrix Analysegespräch",
      "DESCRIPTION:Dein kostenloses 45-Minuten-Analysegespräch. Wir melden uns zur Bestätigung mit dem Video-Link.",
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  }

  /* ---------- Absenden ---------- */

  async function submit() {
    const name = $("#bkName").value.trim();
    const email = $("#bkEmail").value.trim();
    const phone = $("#bkPhone").value.trim();
    const goal = $("#bkGoal").value;
    const note = $("#bkNote").value.trim();

    let ok = true;
    [["bkName", !name], ["bkEmail", !email || !email.includes("@")], ["bkGoal", !goal]].forEach(([id, bad]) => {
      document.getElementById(id).classList.toggle("invalid", bad);
      if (bad) ok = false;
    });
    if (!ok) { MM.toast("Bitte prüfe die markierten Felder"); return; }
    if (!selDate || !selSlot) { MM.toast("Bitte Tag und Uhrzeit wählen"); return; }

    const btn = $("#bookSubmit");
    btn.disabled = true; btn.textContent = "Wird übermittelt…";

    /* Score anhängen, falls vorhanden */
    const result = MM.store.get("check_result", null);
    const scoreInfo = (result && $("#bkAttachScore") && $("#bkAttachScore").checked)
      ? result.total + "/100 (" + result.level + "), Typ: " + result.archetype.name + ", Engpass: " + result.bottleneck.name
      : "—";

    const booking = { dateKey: keyOf(selDate), slot: selSlot, name, email, created: new Date().toISOString() };
    const bookings = MM.store.get("bookings", []);
    bookings.push(booking);
    MM.store.set("bookings", bookings);
    if (MM.track) MM.track("booking_submitted");

    const res = await MM.sendForm("📅 Terminanfrage: " + fmtDate(selDate) + ", " + selSlot + " Uhr — " + name, {
      Typ: "Analysegespräch",
      Termin: fmtDate(selDate) + ", " + selSlot + " Uhr (" + DURATION + " Min)",
      Name: name,
      "E-Mail": email,
      Telefon: phone || "—",
      Thema: goal,
      Nachricht: note || "—",
      "Score-Ergebnis": scoreInfo
    });

    /* Erfolgsansicht */
    const ics = icsString(selDate, selSlot);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const icsUrl = URL.createObjectURL(blob);

    document.getElementById("bookingWrap").innerHTML =
      '<div class="order-success">' +
      '<div class="success-icon">✓</div>' +
      '<span class="eyebrow" style="justify-content:center">Terminanfrage eingegangen</span>' +
      '<h1 class="h-section" style="margin-bottom:14px">Stark, ' + name.split(" ")[0] + ' — dein Termin ist reserviert.</h1>' +
      '<p class="muted" style="margin-bottom:6px"><strong style="color:var(--text)">' + fmtDate(selDate) + ' · ' + selSlot + ' Uhr</strong> (' + DURATION + ' Minuten)</p>' +
      '<p class="muted" style="margin-bottom:28px">' +
      (res.viaMailto
        ? "Bitte sende die geöffnete E-Mail noch ab, damit uns deine Anfrage erreicht. Danach bestätigen wir den Termin mit dem Video-Link."
        : "Wir bestätigen den Termin per E-Mail an <strong style=\"color:var(--text)\">" + email + "</strong> und schicken dir den Video-Link.") + '</p>' +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:32px">' +
      '<a class="btn btn-primary" href="' + icsUrl + '" download="malemetrix-analysegespraech.ics">📅 In meinen Kalender eintragen</a>' +
      '<a class="btn btn-ghost" href="check.html">Vorher den Score-Check machen</a></div>' +
      '<div class="card" style="text-align:left;max-width:520px;margin:0 auto"><span class="card-num">SO BEREITEST DU DICH VOR (OPTIONAL)</span>' +
      '<ul class="check-list"><li>Mach den kostenlosen Score-Check — er ist die beste Gesprächsgrundlage</li>' +
      '<li>Notiere dein wichtigstes Ziel für die nächsten 12 Wochen</li>' +
      '<li>Halte grob deine Trainings- und Zeitfenster bereit</li></ul></div></div>';

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Init ---------- */

  $("#calPrev").addEventListener("click", () => {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  $("#calNext").addEventListener("click", () => {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });
  $("#bookSubmit").addEventListener("click", submit);

  /* Score-Hinweis anzeigen, falls Check gemacht */
  const result = MM.store.get("check_result", null);
  if (result) {
    const hint = document.getElementById("scoreAttach");
    if (hint) {
      hint.style.display = "";
      hint.querySelector("[data-score]").textContent = result.total + "/100 · " + result.archetype.name;
    }
  }

  renderCalendar();
  renderSlots();
  updateSummary();
})();
