"use strict";
(() => {
  const storage = window.LooplyStorage;
  const auth = window.LooplyAuth;
  const $ = (s) => document.querySelector(s);
  const str = (v) => String(v ?? "").trim();
  const id = (v) => str(v);
  const PAGE_SIZE = 9;
  let companies = [];
  let page = 1;
  const currentUser = auth?.getCurrentUser?.();
  const accountsKey = window.LooplyConstants?.STORAGE_KEYS?.DEMO_ACCOUNTS || "looply_demo_accounts";
  const reviewKey = "looply_company_reviews";
  const readArray = (key) => { const a = storage?.getLocal?.(key, []); return Array.isArray(a) ? a : []; };
  const owner = (p) => id(p.sellerId ?? p.userId ?? p.companyId ?? p.ownerId ?? p.createdBy);
  const productActive = (p) => ["active", "published"].includes(str(p.status).toLowerCase());
  const el = (tag, cls, value) => { const e = document.createElement(tag); if (cls) e.className = cls; if (value !== undefined) e.textContent = value; return e; };
  const link = (label, href, cls) => { const a = el("a", cls, label); a.href = href; return a; };
  const initials = (name) => name.split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "B";
  const profileUrl = (companyId) => `../company/company.html?id=${encodeURIComponent(companyId)}`;
  const messageUrl = (c) => `../messages/messages.html?${new URLSearchParams({ sellerId: c.id, sellerName: c.name })}`;
  const productUrl = (companyId) => `../company/company.html?id=${encodeURIComponent(companyId)}#company-listings`;

  function load() {
    const accounts = readArray(accountsKey);
    const products = storage?.getDemoProducts?.() || [];
    const reviews = readArray(reviewKey);
    const activeProducts = (Array.isArray(products) ? products : []).filter(productActive);
    companies = accounts.filter(a => a && id(a.id) && (a.companyName || a.company || a.name)).map(a => {
      const companyId = id(a.id);
      const ratings = reviews.filter(r => id(r.companyId) === companyId && Number(r.rating) >= 1 && Number(r.rating) <= 5);
      const rating = ratings.length ? ratings.reduce((n, r) => n + Number(r.rating), 0) / ratings.length : null;
      return { id: companyId, name: str(a.companyName || a.company || a.name), industry: str(a.industry || a.sector), city: str(a.city), country: str(a.country), description: str(a.description || a.companyDescription || a.about), listingCount: activeProducts.filter(p => owner(p) === companyId).length, rating, reviewCount: ratings.length };
    });
    const unique = (field) => [...new Set(companies.map(c => c[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    for (const [selector, field] of [["#companies-industry", "industry"], ["#companies-city", "city"]]) {
      const select = $(selector);
      for (const value of unique(field)) { const opt = document.createElement("option"); opt.value = value; opt.textContent = value; select.append(opt); }
    }
    $("#companies-total").textContent = String(companies.length);
    $("#companies-active").textContent = String(companies.filter(c => c.listingCount > 0).length);
    $("#companies-listings").textContent = String(activeProducts.length);
    render();
  }

  function filtered() {
    const query = str($("#companies-search").value).toLocaleLowerCase();
    const industry = $("#companies-industry").value;
    const city = $("#companies-city").value;
    const sort = $("#companies-sort").value;
    const result = companies.filter(c => (!industry || c.industry === industry) && (!city || c.city === city) && (!query || [c.name, c.industry, c.city, c.country, c.description].some(v => v.toLocaleLowerCase().includes(query))));
    result.sort((a, b) => sort === "rating" ? (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name) : sort === "listings" ? b.listingCount - a.listingCount || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
    return result;
  }

  function renderCard(c) {
    const card = el("article", "company-card");
    const head = el("div", "company-card-head");
    head.append(el("div", "company-avatar", initials(c.name)));
    const heading = el("div");
    heading.append(link(c.name, profileUrl(c.id), "company-name"), el("div", "company-industry", c.industry || "Industry not specified"));
    head.append(heading); card.append(head);
    card.append(el("div", "company-location", [c.city, c.country].filter(Boolean).join(", ") || "Location not specified"));
    card.append(el("p", "company-description", c.description ? c.description.slice(0, 165) + (c.description.length > 165 ? "…" : "") : "Explore this company's profile and available surplus inventory."));
    const metrics = el("div", "company-metrics");
    metrics.append(el("span", "", `${c.listingCount} active listing${c.listingCount === 1 ? "" : "s"}`), el("span", "", c.rating === null ? "Not rated yet" : `★ ${c.rating.toFixed(1)} (${c.reviewCount})`));
    card.append(metrics);
    const actions = el("div", "company-actions");
    actions.append(link("View profile", profileUrl(c.id), "company-action primary"));
    if (c.listingCount) actions.append(link("View listings", productUrl(c.id), "company-action"));
    if (id(currentUser?.id) !== c.id) actions.append(link("Message", messageUrl(c), "company-action"));
    card.append(actions);
    return card;
  }

  function render() {
    const data = filtered();
    const maxPage = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
    page = Math.min(page, maxPage);
    const grid = $("#companies-grid"); grid.replaceChildren();
    data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).forEach(c => grid.append(renderCard(c)));
    $("#companies-count").textContent = `${data.length} compan${data.length === 1 ? "y" : "ies"} found`;
    $("#companies-empty").hidden = data.length !== 0;
    $("#companies-prev").disabled = page === 1;
    $("#companies-next").disabled = page >= maxPage;
    $("#companies-page-label").textContent = data.length ? `Page ${page} of ${maxPage}` : "";
  }
  ["#companies-search", "#companies-industry", "#companies-city", "#companies-sort"].forEach(selector => $(selector).addEventListener(selector === "#companies-search" ? "input" : "change", () => { page = 1; render(); }));
  $("#companies-prev").addEventListener("click", () => { if (page > 1) { page--; render(); } });
  $("#companies-next").addEventListener("click", () => { if (page * PAGE_SIZE < filtered().length) { page++; render(); } });
  $("#companies-reset").addEventListener("click", () => { $("#companies-search").value = ""; $("#companies-industry").value = ""; $("#companies-city").value = ""; $("#companies-sort").value = "name"; page = 1; render(); });
  if (!storage) { $("#companies-count").textContent = "Unable to load companies. Check shared scripts."; return; }
  load();
  window.addEventListener("storage", (event) => { if ([accountsKey, reviewKey, window.LooplyConstants?.STORAGE_KEYS?.DEMO_PRODUCTS].includes(event.key)) { $("#companies-industry").replaceChildren(new Option("All industries", "")); $("#companies-city").replaceChildren(new Option("All cities", "")); load(); } });
})();
