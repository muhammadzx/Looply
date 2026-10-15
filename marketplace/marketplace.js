"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const storage = window.LooplyStorage;
  const auth = window.LooplyAuth;
  const accountsKey = window.LooplyConstants?.STORAGE_KEYS?.DEMO_ACCOUNTS || "looply_demo_accounts";
  const pageSize = 9;
  let page = 1;
  let listings = [];
  let companies = new Map();
  let currentUser = null;
  const text = value => String(value ?? "").trim();
  const ownerId = item => text(item.sellerId ?? item.companyId ?? item.ownerId ?? item.userId ?? item.createdBy);
  const isActive = item => ["active", "published"].includes(text(item.status).toLowerCase());
  const validImage = value => {
    if (typeof value !== "string" || !value) return false;
    if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(value)) return true;
    try { return ["http:", "https:"].includes(new URL(value, location.href).protocol); } catch { return false; }
  };
  const getTitle = p => text(p.title || p.name || p.productName) || "Untitled listing";
  const getSeller = p => companies.get(ownerId(p))?.companyName || companies.get(ownerId(p))?.company || text(p.companyName || p.sellerCompany || p.sellerName) || "Business seller";
  const detailUrl = p => `../products/product-details.html?id=${encodeURIComponent(text(p.id ?? p.productId))}`;
  const companyUrl = p => `../company/company.html?id=${encodeURIComponent(ownerId(p))}`;
  const money = value => Number.isFinite(Number(value)) && value !== "" && value != null ? `${Number(value).toLocaleString("en-JO", {maximumFractionDigits:2})} JOD` : "Request a quote";
  function el(tag, className, content) { const node = document.createElement(tag); if (className) node.className = className; if (content !== undefined) node.textContent = content; return node; }
  function link(href, className, content) { const a = el("a", className, content); a.href = href; return a; }
  function load() {
    currentUser = auth?.getCurrentUser?.() || null;
    const raw = storage?.getDemoProducts?.() || [];
    listings = (Array.isArray(raw) ? raw : []).filter(p => p && typeof p === "object" && isActive(p) && text(p.id ?? p.productId));
    const accounts = storage?.getLocal?.(accountsKey, []) || [];
    companies = new Map((Array.isArray(accounts) ? accounts : []).filter(a => a?.id != null).map(a => [text(a.id), a]));
  }
  function fillSelect(id, values) {
    const select = $(id);
    const previous = select.value;
    for (const value of [...new Set(values.map(text).filter(Boolean))].sort((a,b) => a.localeCompare(b))) {
      const option = document.createElement("option"); option.value = value; option.textContent = value; select.appendChild(option);
    }
    if ([...select.options].some(o => o.value === previous)) select.value = previous;
  }
  function filters() {
    const search = text($("#market-search").value).toLowerCase();
    const category = $("#market-category").value;
    const condition = $("#market-condition").value;
    const city = $("#market-city").value;
    const min = $("#price-min").value;
    const max = $("#price-max").value;
    const hideOwn = $("#exclude-own").checked;
    let result = listings.filter(p => {
      if (hideOwn && currentUser?.id && ownerId(p) === text(currentUser.id)) return false;
      if (category && text(p.category) !== category) return false;
      if (condition && text(p.condition) !== condition) return false;
      if (city && text(p.city) !== city) return false;
      const price = Number(p.price);
      if (min !== "" && (!Number.isFinite(price) || price < Number(min))) return false;
      if (max !== "" && (!Number.isFinite(price) || price > Number(max))) return false;
      if (search && ![getTitle(p),p.description,p.category,p.city,p.country,getSeller(p)].some(value => text(value).toLowerCase().includes(search))) return false;
      return true;
    });
    const sort = $("#sort-by").value;
    result.sort((a,b) => {
      if (sort === "price-low") return (Number(a.price)||0)-(Number(b.price)||0);
      if (sort === "price-high") return (Number(b.price)||0)-(Number(a.price)||0);
      if (sort === "name") return getTitle(a).localeCompare(getTitle(b));
      const diff = (Date.parse(b.createdAt || b.updatedAt) || 0)-(Date.parse(a.createdAt || a.updatedAt) || 0);
      return sort === "oldest" ? -diff : diff;
    });
    return result;
  }
  function createCard(p) {
    const card = el("article", "listing-card");
    const imageLink = link(detailUrl(p), "listing-image-link");
    imageLink.setAttribute("aria-label", `View ${getTitle(p)}`);
    const imageUrl = p.image || p.imageUrl;
    if (validImage(imageUrl)) {
      const img = document.createElement("img"); img.src = imageUrl; img.alt = getTitle(p); img.loading = "lazy"; img.onerror = () => img.replaceWith(el("div", "listing-placeholder", "▤")); imageLink.append(img);
    } else imageLink.append(el("div", "listing-placeholder", "▤"));
    imageLink.append(el("span", "listing-tag", text(p.condition) || "Surplus listing"));
    const body = el("div", "listing-body");
    body.append(el("div", "listing-category", text(p.category) || "Other"),link(detailUrl(p), "listing-title", getTitle(p)));
    const price = el("div", "listing-price", money(p.price));
    if (p.price != null && p.price !== "") price.append(el("small", " / unit"));
    body.append(price);
    const meta = el("div", "listing-meta");
    meta.append(el("span", "", `▣ ${text(p.quantity) || "Ask"} ${text(p.unit) || "units"}`));
    if (p.city || p.country) meta.append(el("span", "", `⌖ ${[p.city,p.country].map(text).filter(Boolean).join(", ")}`));
    body.append(meta);
    if (ownerId(p)) body.append(link(companyUrl(p), "seller-link", `⌂ ${getSeller(p)} →`));
    else body.append(el("div", "seller-link", `⌂ ${getSeller(p)}`));
    const actions = el("div", "listing-actions");
    actions.append(link(detailUrl(p), "action-primary", "View & Buy / Quote"));
    if (ownerId(p) && ownerId(p) !== text(currentUser?.id)) {
      const params = new URLSearchParams({sellerId:ownerId(p),sellerName:getSeller(p),productId:text(p.id ?? p.productId),productTitle:getTitle(p)});
      actions.append(link(`../messages/messages.html?${params}`, "action-secondary", "Message"));
    }
    body.append(actions); card.append(imageLink,body); return card;
  }
  function render() {
    const matches = filters();
    const totalPages = Math.max(1,Math.ceil(matches.length/pageSize));
    page = Math.min(page,totalPages);
    $("#results-count").textContent = String(matches.length);
    $("#results-description").textContent = `${matches.length} available listing${matches.length === 1 ? "" : "s"}`;
    const grid = $("#market-grid");
    grid.replaceChildren(...matches.slice((page-1)*pageSize,page*pageSize).map(createCard));
    $("#market-empty").hidden = matches.length !== 0;
    $("#page-label").textContent = matches.length ? `Page ${page} of ${totalPages}` : "";
    $("#prev-page").disabled = page <= 1 || !matches.length;
    $("#next-page").disabled = page >= totalPages || !matches.length;
  }
  function reset() {
    for (const id of ["#market-search","#market-category","#market-condition","#market-city","#price-min","#price-max"]) $(id).value = "";
    $("#sort-by").value = "newest";
    $("#exclude-own").checked = true;
    page = 1; render();
  }
  function initialize() {
    load();
    fillSelect("#market-category", listings.map(p => p.category));
    fillSelect("#market-condition", listings.map(p => p.condition));
    fillSelect("#market-city", listings.map(p => p.city));
    for (const id of ["#market-search","#market-category","#market-condition","#market-city","#price-min","#price-max","#exclude-own","#sort-by"]) {
      $(id).addEventListener(id === "#market-search" || id.startsWith("#price-") ? "input" : "change", () => {page = 1; render();});
    }
    $("#reset-all").addEventListener("click",reset);
    $("#empty-reset").addEventListener("click",reset);
    $("#prev-page").addEventListener("click",() => {page--;render();window.scrollTo({top:0,behavior:"smooth"});});
    $("#next-page").addEventListener("click",() => {page++;render();window.scrollTo({top:0,behavior:"smooth"});});
    window.addEventListener("storage",event => { if ([window.LooplyConstants?.STORAGE_KEYS?.DEMO_PRODUCTS,accountsKey].includes(event.key)) {load();render();} });
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",initialize,{once:true}); else initialize();
})();
