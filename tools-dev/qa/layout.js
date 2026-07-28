/* Paket-1-Layout-Check: 390px + 1440px, Overflow + Konsolenfehler + Kernbegriffe. */
(async () => {
  const pw = require("/tmp/claude-0/-home-user-malemetrix/ccfa1b5f-d4bc-5257-9780-9508a0622917/scratchpad/node_modules/playwright-core");
  const browser = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const pages = ["index.html", "check.html", "ueber.html", "tracker.html", "mein-protokoll.html"];
  const widths = [390, 1440];
  let fail = 0;
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    for (const p of pages) {
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", e => errs.push(String(e.message || e)));
      await page.goto("http://127.0.0.1:8899/" + p, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(1200);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const realErrs = errs.filter(e => !/supabase|fetch|Failed to load|NetworkError|ERR_/i.test(e));
      const ok = over <= 0 && realErrs.length === 0;
      if (!ok) fail++;
      console.log((ok ? "  ✓ " : "  ✗ ") + p + " @" + w + "px — Overflow: " + over + "px, JS-Fehler: " + (realErrs.length ? realErrs.join(" | ") : "keine"));
      await page.close();
    }
    await ctx.close();
  }
  // Stichprobe: neue Begriffe sind wirklich gerendert (index)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:8899/index.html", { waitUntil: "load" });
  /* textContent statt innerText: .os14-band .stat-label ist per CSS
     versalisiert — innerText liefert die Großschreibung. */
  const body = await page.evaluate(() => document.body.textContent);
  for (const t of ["Optimierungsbereich", "Bereiche · eine Diagnose", "Engpass"]) {
    const ok = body.includes(t); if (!ok) fail++;
    console.log((ok ? "  ✓ " : "  ✗ ") + "index rendert: " + t);
  }
  await browser.close();
  console.log(fail ? "LAYOUT-CHECK: " + fail + " FEHLER" : "LAYOUT-CHECK: OK");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("QA ERROR: " + e); process.exit(1); });
