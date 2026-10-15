"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const str = value => String(value ?? "");
  const ownerId = product => str(product.sellerId ?? product.userId ?? product.companyId ?? product.ownerId ?? product.createdBy);
  const safeImage = value => typeof value === "string" && /^(data:image\/(png|jpeg|webp|gif);base64,|https?:\/\/|\.\.\/|\/)/i.test(value);
  const set = (selector, value) => { const node = $(selector); if (node) node.textContent = str(value); };
  function showError(message) { const node = $("#product-alert"); node.hidden = false; node.textContent = message; }
  const quoteKey = () => window.LooplyConstants?.STORAGE_KEYS?.QUOTE_REQUESTS || "looply_quote_requests";
  const orderKey = "looply_purchase_orders";
  const id = () => window.crypto?.randomUUID?.() || `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function feedback(message, error = false) {
    const node = $("#purchase-feedback"); node.hidden = false; node.textContent = message; node.classList.toggle("error", error);
  }
  function render() {
    const storage = window.LooplyStorage;
    const user = window.LooplyAuth?.getCurrentUser?.();
    if (!user?.id) { window.location.replace("../login&register/login.html"); return; }
    const productId = new URLSearchParams(location.search).get("id");
    if (!productId) { showError("No product selected. Open a listing from a company profile."); return; }
    const products = storage?.getDemoProducts?.() || [];
    const product = (Array.isArray(products) ? products : []).find(item => str(item.id ?? item.productId) === productId);
    if (!product || !["active","published"].includes(str(product.status).toLowerCase())) { showError("This listing is unavailable or is no longer active."); return; }
    const sellerId = ownerId(product);
    const key = window.LooplyConstants?.STORAGE_KEYS?.DEMO_ACCOUNTS || "looply_demo_accounts";
    const accounts = storage?.getLocal?.(key, []) || [];
    const seller = (Array.isArray(accounts) ? accounts : []).find(a => str(a.id) === sellerId);
    const sellerName = seller?.companyName || seller?.company || seller?.name || product.sellerCompany || "Business seller";
    const companyUrl = sellerId ? `../company/company.html?id=${encodeURIComponent(sellerId)}` : null;
    const title = product.title || product.name || product.productName || "Untitled listing";
    document.title = `${title} | Looply`;
    set("#product-title", title); set("#product-category", product.category || "Other");
    const quantity = product.quantity ?? product.availableQuantity;
    set("#product-quantity", quantity != null && quantity !== "" ? `${quantity} ${product.unit || "units"}` : "Contact seller");
    set("#product-status", "Available");
    const rawPrice = product.price;
    const price = rawPrice != null && rawPrice !== "" && Number.isFinite(Number(rawPrice)) ? `JOD ${Number(rawPrice).toLocaleString("en-JO")}` : "Price on request";
    set("#product-price", price);
    set("#product-description", product.description || "No description has been provided for this listing.");
    const visual = $("#product-visual"); const image = product.image || product.imageUrl || product.productImage;
    if (safeImage(image)) { const img = document.createElement("img"); img.src = image; img.alt = title; img.loading = "lazy"; visual.replaceChildren(img); }
    const sellerLink = $("#product-seller"); sellerLink.textContent = sellerName;
    const companyLink = $("#product-company"); const back = $("#back-company");
    if (companyUrl) { sellerLink.href = companyUrl; companyLink.href = companyUrl; back.href = companyUrl; back.textContent = sellerName; }
    else { sellerLink.removeAttribute("href"); companyLink.hidden = true; }
    const contact = $("#product-message");
    if (!sellerId || sellerId === str(user.id)) contact.hidden = true;
    else contact.href = `../messages/messages.html?${new URLSearchParams({sellerId,sellerName,productId,productTitle:title}).toString()}`;
    const stock = Number(quantity);
    const minimum = Math.max(1, Number(product.minimumOrder) || 1);
    const priceNumber = Number(rawPrice);
    const fixedPrice = rawPrice !== "" && rawPrice != null && Number.isFinite(priceNumber) && priceNumber > 0;
    const canTrade = sellerId && sellerId !== str(user.id) && Number.isInteger(stock) && stock > 0 && minimum <= stock;
    if (canTrade) {
      $("#purchase-panel").hidden = false;
      const qtyInput = $("#purchase-qty"); qtyInput.min = String(minimum); qtyInput.max = String(stock); qtyInput.value = String(minimum);
      set("#purchase-range", `Min ${minimum} · Available ${stock} ${product.unit || "units"}`);
      const buyButton = $("#purchase-buy"); buyButton.hidden = !fixedPrice;
      const updateTotal = () => {
        const qty = Number(qtyInput.value);
        set("#purchase-total", fixedPrice && Number.isInteger(qty) && qty >= minimum && qty <= stock
          ? `Estimated total: JOD ${(qty * priceNumber).toLocaleString("en-JO", {minimumFractionDigits:2, maximumFractionDigits:2})}`
          : fixedPrice ? "Enter a valid quantity" : "Price on request");
      };
      qtyInput.addEventListener("input", updateTotal); updateTotal();
      function submit(type) {
        const qty = Number(qtyInput.value);
        if (!Number.isSafeInteger(qty) || qty < minimum || qty > stock) {
          feedback(`Quantity must be a whole number between ${minimum} and ${stock}.`, true); return;
        }
        const latest = storage.getDemoProducts().find(p => str(p.id ?? p.productId) === productId);
        if (!latest || !["active", "published"].includes(str(latest.status).toLowerCase()) || Number(latest.quantity) < qty || ownerId(latest) !== sellerId) {
          feedback("Listing stock or availability has changed. Refresh the page.", true); return;
        }
        if (type === "order" && !fixedPrice) { feedback("This listing requires a quotation.", true); return; }
        const now = new Date().toISOString();
        const common = {
          id:id(), productId, productTitle:title, sellerId, sellerCompany:sellerName,
          buyerId:user.id, buyerCompany:user.companyName || user.name || "Buyer",
          quantity:qty, unit:product.unit || "units",
          deliveryPreference:$("#purchase-delivery").value.trim(),
          message:$("#purchase-notes").value.trim(), createdAt:now, updatedAt:now
        };
        const key = type === "quote" ? quoteKey() : orderKey;
        const previous = storage.getLocal(key, []);
        if (!Array.isArray(previous)) { feedback("Unable to read existing requests.", true); return; }
        const record = type === "quote"
          ? {...common, status:"pending", quotation:null}
          : {...common, status:"pending", unitPrice:priceNumber, totalPrice:Math.round(priceNumber * qty * 100) / 100};
        if (!storage.setLocal(key, [...previous, record])) {
          feedback("Could not save request. Check browser storage.", true); return;
        }
        document.dispatchEvent(new CustomEvent(type === "quote" ? "looply:quotes-updated" : "looply:orders-updated"));
        feedback(type === "quote" ? "Quote request sent. Track it in Quote Requests." : "Purchase request submitted. Seller confirmation is required. Track it in My Orders.");
        $("#purchase-buy").disabled = true; $("#purchase-quote").disabled = true;
      }
      $("#purchase-buy").addEventListener("click", () => submit("order"));
      $("#purchase-quote").addEventListener("click", () => submit("quote"));
    }
    $("#product-content").hidden = false;
  }
  document.addEventListener("looply:layout-ready", render, {once:true});
})();