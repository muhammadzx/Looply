"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const storage = window.LooplyStorage;
  const auth = window.LooplyAuth;
  const constants = window.LooplyConstants;
  const id = value => String(value ?? "");
  const text = (selector, value) => { const node = $(selector); if(node) node.textContent = String(value ?? ""); };
  const accountKey = constants?.STORAGE_KEYS?.DEMO_ACCOUNTS || "looply_demo_accounts";
  const reviewsKey = "looply_company_reviews";
  const dealsKey = constants?.STORAGE_KEYS?.DEALS || "looply_deals";
  function list(key) { const value = storage?.getLocal?.(key, []); return Array.isArray(value) ? value : []; }
  function getOwner(product) { return id(product.sellerId ?? product.userId ?? product.companyId ?? product.ownerId ?? product.createdBy); }
  function format(value) { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-JO",{month:"long",year:"numeric"}) : "Not available"; }
  function message(textValue) { const node = $("#company-alert"); node.hidden = false; node.textContent = textValue; }
  function initials(name) { return String(name).trim().split(/\s+/).slice(0,2).map(word => word[0]?.toUpperCase() || "").join(""); }
  function make(tag, className, content) { const node = document.createElement(tag); if(className) node.className=className; if(content != null) node.textContent=content; return node; }
  function website(value) { try { const url = new URL(value); return ["https:","http:"].includes(url.protocol) ? url.href : null; } catch { return null; } }
  function render() {
    const current = auth?.getCurrentUser?.();
    if (!current?.id) { window.location.replace("../login&register/login.html"); return; }
    const companyId = new URLSearchParams(location.search).get("id");
    if (!companyId) { message("No company was selected. Open a business profile from Messages or Quote Requests."); return; }
    const account = list(accountKey).find(a => id(a.id) === id(companyId));
    if (!account) { message("This company could not be found in the current browser's demo accounts."); return; }
    $("#company-view").hidden = false;
    const name = String(account.companyName || account.company || account.name || "Business");
    document.title = `${name} | Looply`;
    text("#company-avatar",initials(name)); text("#company-name",name);
    text("#company-industry",account.industry || "Industry not specified");
    const place = [account.city,account.country].filter(Boolean).join(", ") || "Location not specified";
    text("#company-location",place); text("#company-description",account.description || "This company has not added a description yet.");
    text("#company-fact-industry",account.industry || "Not provided"); text("#company-fact-location",place);
    text("#company-size",account.companySize || "Not provided"); text("#company-joined",format(account.createdAt));
    text("#company-role",account.role || "Not provided");
    const site = website(account.website); const siteNode = $("#company-website");
    if (site) { const link = make("a","",new URL(site).hostname); link.href=site; link.target="_blank"; link.rel="noopener noreferrer"; siteNode.append(link); }
    else siteNode.textContent="Not provided";
    const contact = $("#company-message");
    if(id(current.id)===id(companyId)) { contact.hidden=true; }
    else { const params = new URLSearchParams({sellerId:id(companyId),sellerName:name}); contact.href=`../messages/messages.html?${params}`; }
    const allProducts = storage?.getDemoProducts?.() || [];
    const products = (Array.isArray(allProducts)?allProducts:[]).filter(p => getOwner(p) === id(companyId) && ["active","published"].includes(String(p.status || "").toLowerCase()));
    text("#company-listing-count",products.length); text("#listing-label",`${products.length} active`);
    const area = $("#company-products");
    if (!products.length) area.append(make("p","company-empty","No active listings from this company yet."));
    products.forEach(p => {
      const productId = p.id ?? p.productId;
      const card = make(productId != null ? "a" : "article", "company-product company-product-link");
      if (productId != null) {
        card.href = `../products/product-details.html?id=${encodeURIComponent(String(productId))}`;
        card.setAttribute("aria-label", `View details for ${p.title || p.name || p.productName || "listing"}`);
      }
      const imageUrl = p.image || p.imageUrl || p.productImage;
      if (typeof imageUrl === "string" && /^(data:image\/(png|jpeg|webp|gif);base64,|https?:\/\/|\.\.\/|\/)/i.test(imageUrl)) {
        const img = make("img", "company-product-image");
        img.src = imageUrl; img.alt = ""; img.loading = "lazy";
        card.append(img);
      }
      card.append(
        make("strong", "", p.title || p.name || p.productName || "Untitled listing"),
        make("p", "", [p.category, p.quantity ? `${p.quantity} ${p.unit || "units"}` : ""].filter(Boolean).join(" · ")),
        make("span", "company-product-cta", productId != null ? "View product details →" : "Details unavailable")
      );
      area.append(card);
    });
    const reviews = list(reviewsKey).filter(r => id(r.companyId) === id(companyId) && Number.isFinite(Number(r.rating)) && Number(r.rating)>=1 && Number(r.rating)<=5);
    const average = reviews.length ? reviews.reduce((sum,r)=>sum+Number(r.rating),0)/reviews.length : null;
    text("#company-rating",average == null ? "—" : average.toFixed(1)+" / 5"); text("#company-review-count",reviews.length);
    text("#reviews-summary",reviews.length ? `${reviews.length} review${reviews.length===1?"":"s"}` : "No reviews yet");
    const reviewArea=$("#company-reviews");
    if(!reviews.length) reviewArea.append(make("p","company-empty","No verified transaction reviews yet. Ratings will be enabled after completed deals are implemented."));
    else reviews.sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0)).forEach(r=> {const article=make("article","company-review"); article.append(make("strong","",`${Number(r.rating).toFixed(1)} / 5 · ${r.reviewerCompany || "Business customer"}`),make("p","",r.comment || "No written review"),make("small","",format(r.createdAt))); reviewArea.append(article);});
  }
  document.addEventListener("looply:layout-ready",render,{once:true});
})();
