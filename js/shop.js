/* ==========================================================================
   MaleMetrix Shop — Produktgrid, Filter, Detail-Modal
   ========================================================================== */

(function () {
  "use strict";

  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const products = window.MM_PRODUCTS || [];
  let activeFilter = "alle";
  const T = (k, fb) => (window.MM && MM.i18n && MM.i18n.t(k)) || fb;

  function render() {
    // hidden-Produkte (interne Testpfade) erscheinen nie im öffentlichen Shop.
    const list = products.filter(p => !p.hidden && (activeFilter === "alle" || p.cat === activeFilter));
    grid.innerHTML = list.map(p =>
      '<article class="product-card reveal visible">' +
      '<div class="product-visual">' + p.svg +
      (p.badge ? '<span class="product-badge">' + p.badge + '</span>' : '') +
      '</div>' +
      '<div class="product-body">' +
      '<span class="product-cat">' + p.catLabel + '</span>' +
      '<h3>' + p.name + '</h3>' +
      '<p class="desc">' + p.desc + '</p>' +
      '<div class="product-foot">' +
      '<div class="product-price">' + MM.eur(p.price) +
      (p.compareAt ? ' <s style="color:var(--muted-2);font-weight:400;font-size:0.72em">' + MM.eur(p.compareAt) + '</s>' : '') +
      '<small>inkl. ggf. USt.' + (p.digital ? " · kein Versand" : "") + '</small></div>' +
      '<div style="display:flex;gap:8px">' +
      (p.cta ? '<a class="btn btn-dark btn-sm" href="' + p.cta.href + '">' + p.cta.label + '</a>'
             : '<button class="btn btn-dark btn-sm" data-details="' + p.id + '">' + T("common.details", "Details") + '</button>') +
      '<button class="btn btn-primary btn-sm" data-add="' + p.id + '">' + T("common.addCart", "In den Warenkorb") + '</button>' +
      '</div></div></div></article>'
    ).join("");

    grid.querySelectorAll("[data-add]").forEach(b =>
      b.addEventListener("click", () => MM.cart.add(b.dataset.add, 1)));
    grid.querySelectorAll("[data-details]").forEach(b =>
      b.addEventListener("click", () => openModal(b.dataset.details)));
  }

  /* ---------- Detail-Modal ---------- */

  function openModal(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    let modal = document.getElementById("productModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "productModal";
      modal.className = "cart-overlay open";
      modal.style.display = "grid";
      modal.style.placeItems = "center";
      modal.style.padding = "24px";
      document.body.appendChild(modal);
      modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    }
    modal.innerHTML =
      '<div class="card" style="max-width:560px;width:100%;max-height:88vh;overflow-y:auto;background:var(--bg-1);border-color:var(--line-strong)" role="dialog" aria-modal="true">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px">' +
      '<div><span class="product-cat">' + p.catLabel + '</span><h3 style="font-size:1.35rem">' + p.name + '</h3></div>' +
      '<button class="cart-close" id="pmClose" aria-label="Schließen">✕</button></div>' +
      '<div style="border-radius:12px;overflow:hidden;border:1px solid var(--line);margin-bottom:18px">' + p.svg + '</div>' +
      '<p class="muted" style="margin-bottom:18px">' + p.desc + '</p>' +
      '<ul class="check-list" style="margin-bottom:24px">' + p.details.map(d => "<li>" + d + "</li>").join("") + '</ul>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">' +
      '<div class="product-price" style="font-size:1.5rem">' + MM.eur(p.price) + '</div>' +
      '<button class="btn btn-primary" id="pmAdd">In den Warenkorb</button></div></div>';

    modal.style.opacity = "1";
    modal.style.pointerEvents = "auto";
    document.body.style.overflow = "hidden";

    modal.querySelector("#pmClose").addEventListener("click", closeModal);
    modal.querySelector("#pmAdd").addEventListener("click", () => { closeModal(); MM.cart.add(p.id, 1); });
  }

  function closeModal() {
    const modal = document.getElementById("productModal");
    if (modal) { modal.remove(); document.body.style.overflow = ""; }
  }

  /* ---------- Filter ---------- */

  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.dataset.filter;
      render();
    });
  });

  document.addEventListener("mm:langchange", render);

  render();
})();
