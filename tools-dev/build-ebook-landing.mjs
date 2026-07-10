/* ==========================================================================
   MaleMetrix — Generator für Ebook-Landingpages
   --------------------------------------------------------------------------
   Erzeugt pro (freiem) Ebook eine fokussierte Verkaufsseite unter  lp/<id>.html
   — mit eigenem Titel, Social-Preview (OG-Bild = Hero-Foto), automatisch aus
   dem Ebook gezogenem Inhaltsverzeichnis + Leseprobe und einem Name-+-E-Mail-
   Formular, das das Ebook freischaltet.

   Aufruf:   node tools-dev/build-ebook-landing.mjs
   Neu bauen, wann immer sich ein Ebook oder seine Beschreibung ändert.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const SITE = 'https://malemetrix.de';

/* ---- Ebook-Daten aus der zentralen Quelle laden (Browser-Global evaluieren) ---- */
function loadEbooks() {
  const src = readFileSync(ROOT + 'js/ebooks-data.js', 'utf8');
  const sandbox = { window: {} };
  new Function('window', src + '\nthis.__out = window.MM_EBOOKS;').call(sandbox, sandbox.window);
  return sandbox.__out || sandbox.window.MM_EBOOKS;
}

/* ---- Hero-Foto pro Ebook (für Seite + Social-Preview) ---- */
const HERO = {
  masterguide: 'masterguide-hero.jpg', 'training-system': 'training-system-hero.jpg',
  'protein-system': 'protein-system-hero.jpg', 'schlaf-energie': 'schlaf-energie-hero.jpg',
  'schlaf-stack': 'schlaf-stack-hero.jpg', fettabbau: 'fettabbau-hero.jpg',
  'taeglich-trainieren': 'taeglich-trainieren-hero.jpg', 'sexuelle-gesundheit': 'sexuelle-gesundheit-hero.jpg',
  testosteron: 'testosteron-hero.jpg', 'glp1-agonisten': 'glp1-hero.jpg',
  'blutwerte-guide': 'blutwerte-hero.jpg', supplements: 'supplements-hero.jpg',
  gewohnheiten: 'gewohnheiten-hero.jpg',
};
/* Echte PDF-Datei, wo vorhanden */
const PDF = { 'schlaf-stack': '../ebooks/files/MaleMetrix_Schlaf-Stack.pdf' };

const de = (o) => (o && typeof o === 'object') ? (o.de || '') : (o || '');
const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* ---- Inhaltsverzeichnis + Leseprobe aus dem Ebook-HTML ziehen ---- */
function extract(id) {
  const html = readFileSync(ROOT + 'ebooks/' + id + '.html', 'utf8');
  // TOC: alle <h2>…</h2> (innere Badges/Tags entfernen)
  const toc = [];
  const h2re = /<h2[^>]*>([\s\S]*?)<\/h2>/g;
  let m;
  while ((m = h2re.exec(html)) !== null) {
    const t = decode(stripTags(m[1]));
    if (t) toc.push(t);
  }
  // Leseprobe: die ersten beiden inhaltlichen <p> im doc-paper
  const preview = [];
  const pre = /<p>([\s\S]*?)<\/p>/g;
  while ((m = pre.exec(html)) !== null && preview.length < 2) {
    if (stripTags(m[1]).length > 70) preview.push(m[1].trim());
  }
  return { toc, preview };
}

const FAVICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%232e7cf6'/><stop offset='1' stop-color='%2300c2ff'/></linearGradient></defs><rect width='32' height='32' rx='8' fill='url(%23g)'/><path d='M8 23V9.5l8 7 8-7V23' fill='none' stroke='white' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'/><circle cx='8' cy='9.5' r='2.2' fill='white'/><circle cx='24' cy='9.5' r='2.2' fill='white'/><circle cx='16' cy='16.5' r='1.9' fill='%23bfe9ff'/></svg>";

function page(b) {
  const id = b.id;
  const title = de(b.title);
  const kicker = de(b.kicker);
  const badge = de(b.badge);
  const desc = de(b.desc);
  const minutes = b.minutes || 10;
  const hero = HERO[id];
  const heroPath = hero ? ('../ebooks/img/' + hero) : '';
  const ogImg = hero ? (SITE + '/ebooks/img/' + hero) : (SITE + '/icons/icon-512.png');
  const pdf = PDF[id] || '';
  const { toc, preview } = extract(id);
  const metaDesc = stripTags(desc).slice(0, 180);
  const url = SITE + '/lp/' + id + '.html';

  const tocHTML = toc.map((t) =>
    '<li><span class="lp-toc-dot"></span>' + escAttr(t).replace(/&quot;/g, '"') + '</li>').join('\n          ');
  const previewHTML = preview.map((p) => '<p>' + p + '</p>').join('\n          ');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <script>try{var _t=localStorage.getItem('mm_theme');if(_t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escAttr(title)} — Gratis-Ebook | MaleMetrix</title>
  <meta name="description" content="${escAttr(metaDesc)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="MaleMetrix">
  <meta property="og:title" content="${escAttr(title)} — Gratis-Ebook">
  <meta property="og:description" content="${escAttr(metaDesc)}">
  <meta property="og:image" content="${ogImg}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escAttr(title)} — Gratis-Ebook">
  <meta name="twitter:description" content="${escAttr(metaDesc)}">
  <meta name="twitter:image" content="${ogImg}">
  <link rel="stylesheet" href="../css/fonts.css">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="icon" href="${FAVICON}">
  <meta name="theme-color" content="#07090d">
</head>
<body>
  <header class="lp-topbar">
    <a href="../index.html" class="lp-logo" aria-label="MaleMetrix Startseite">
      <span class="lp-logo-mark"></span> MALE<strong>METRIX</strong>
    </a>
    <a href="../ebooks.html" class="lp-topbar-link">Alle Ebooks →</a>
  </header>

  <main>
    <!-- HERO -->
    <section class="lp-hero">
      <div class="lp-hero-media"${heroPath ? ` style="background-image:url('${heroPath}')"` : ''}></div>
      <div class="lp-hero-inner">
        <span class="lp-kicker">${escAttr(badge || kicker)}</span>
        <h1>${escAttr(title)}</h1>
        <p class="lp-sub">${escAttr(stripTags(desc))}</p>
        <div class="lp-meta">
          <span class="lp-pill lp-pill-free">Kostenlos</span>
          <span class="lp-meta-item">📖 ${minutes} Min. Lesezeit</span>
          <span class="lp-meta-item">✓ Sofort-Zugang</span>
        </div>
        <a href="#holen" class="btn btn-primary btn-lg btn-arrow" data-track="lp_hero_cta" data-track-id="${id}">Gratis herunterladen</a>
      </div>
    </section>

    <div class="container lp-body">
      <div class="lp-grid">
        <!-- LINKS: Inhalt + Leseprobe -->
        <div class="lp-content">
          <h2 class="lp-h2">Das erwartet dich im Ebook</h2>
          <ul class="lp-toc">
          ${tocHTML}
          </ul>

          <h2 class="lp-h2">Leseprobe</h2>
          <div class="lp-preview">
          ${previewHTML}
            <div class="lp-preview-fade"></div>
          </div>
          <p class="muted lp-preview-note">… weiter im vollständigen Ebook — gratis, nach Eintrag.</p>
        </div>

        <!-- RECHTS: Lead-Formular (sticky) -->
        <aside class="lp-aside" id="holen">
          <div class="lp-form-card">
            <div id="lpFormIntro">
              <h2 class="lp-form-title">Ebook gratis sichern</h2>
              <p class="muted" style="margin-bottom:18px">Trag deinen Namen und deine E-Mail ein — du bekommst sofort Zugang zu „${escAttr(title)}". Kein Spam, jederzeit abbestellbar.</p>
              <form id="lpForm"
                    data-ebook-id="${id}"
                    data-ebook-title="${escAttr(title)}"
                    data-ebook-read="../ebooks/${id}.html"
                    data-ebook-pdf="${pdf}">
                <div class="field"><input type="text" id="lpName" placeholder="Dein Vorname" autocomplete="given-name" required></div>
                <div class="field"><input type="email" id="lpEmail" placeholder="deine@email.de" autocomplete="email" required></div>
                <label class="checkbox-row" style="margin-bottom:14px"><input type="checkbox" id="lpConsent">
                  <span>Ich möchte das Ebook und gelegentliche, ehrliche Tipps für Männer per E-Mail erhalten und akzeptiere die <a href="../datenschutz.html" target="_blank" style="text-decoration:underline">Datenschutzerklärung</a>. Jederzeit abbestellbar.</span></label>
                <button type="submit" class="btn btn-primary btn-lg btn-block btn-arrow">Gratis herunterladen</button>
                <p id="lpErr" class="small" style="color:var(--red);display:none;margin-top:10px"></p>
                <p class="small" style="color:var(--muted-2);margin-top:12px;text-align:center">Kein Spam. Deine Daten werden nicht verkauft.</p>
              </form>
            </div>
            <div id="lpSuccess" hidden></div>
          </div>
        </aside>
      </div>

      <p class="lp-disclaimer">Allgemeine Information und Aufklärung, kein Ersatz für ärztliche Beratung, Diagnose oder Therapie. Bei gesundheitlichen Fragen wende dich an eine Ärztin oder einen Arzt.</p>
    </div>
  </main>

  <footer class="lp-footer">
    <a href="../index.html">Startseite</a>
    <a href="../ebooks.html">Alle Ebooks</a>
    <a href="../impressum.html">Impressum</a>
    <a href="../datenschutz.html">Datenschutz</a>
    <span class="lp-footer-brand">© MaleMetrix</span>
  </footer>

  <script src="../js/config.js"></script>
  <script src="../js/analytics.js"></script>
  <script src="../js/i18n.js"></script>
  <script src="../js/main.js"></script>
  <script src="../js/unlock.js"></script>
  <script src="../js/landing.js"></script>
</body>
</html>
`;
}

/* ---- Bauen ---- */
const ebooks = loadEbooks();
const SKIP = new Set(['master-ebook']); // Premium / in Überarbeitung — kein Lead-Magnet
mkdirSync(ROOT + 'lp', { recursive: true });

let built = [];
for (const b of ebooks) {
  if (SKIP.has(b.id)) continue;
  if (!HERO[b.id]) { console.warn('WARN: kein Hero-Bild für ' + b.id + ' — übersprungen'); continue; }
  const out = page(b);
  writeFileSync(ROOT + 'lp/' + b.id + '.html', out);
  built.push(b.id);
}
console.log('Gebaut: ' + built.length + ' Landingpages\n  ' + built.map((id) => 'lp/' + id + '.html').join('\n  '));
