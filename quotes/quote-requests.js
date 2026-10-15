"use strict";

(() => {
  const auth = window.LooplyAuth;
  const storage = window.LooplyStorage;
  const KEY = window.LooplyConstants?.STORAGE_KEYS?.QUOTE_REQUESTS || "looply_quote_requests";
  const $ = (selector) => document.querySelector(selector);
  const user = auth?.getCurrentUser?.();

  if (!user || !auth?.isLoggedIn?.()) {
    window.location.replace("../login&register/login.html");
    return;
  }
  if (user.onboardingCompleted !== true) {
    window.location.replace("../companyOnboarding/companyOnboarding.html");
    return;
  }
  if (!storage?.getLocal || !storage?.setLocal || !storage?.getDemoProducts) {
    console.error("Looply Quote Requests requires the shared storage service.");
    return;
  }

  const state = { direction: "received", search: "", status: "all" };
  const getRequests = () => {
    const records = storage.getLocal(KEY, []);
    return Array.isArray(records) ? records : [];
  };
  const getProducts = () => storage.getDemoProducts();
  const isMine = (value) => String(value ?? "") === String(user.id);
  const productOwner = (product) => product.sellerId ?? product.companyId ?? product.ownerId ?? product.userId;
  const safeText = (value) => String(value ?? "");
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };
  const money = (value) => `JOD ${Number(value).toLocaleString("en-JO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const feedback = (message, error = false) => {
    const el = $("#quote-feedback");
    el.hidden = false;
    el.textContent = message;
    el.classList.toggle("error", error);
  };
  const save = (records) => {
    if (!storage.setLocal(KEY, records)) {
      feedback("Could not save your changes. Please check browser storage.", true);
      return false;
    }
    render();
    return true;
  };
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = safeText(text);
    if (className) node.className = className;
    return node;
  };

  function render() {
    const records = getRequests();
    const received = records.filter((r) => isMine(r.sellerId));
    const sent = records.filter((r) => isMine(r.buyerId));
    const mine = records.filter((r) => isMine(r.sellerId) || isMine(r.buyerId));
    $("#stat-received").textContent = received.length;
    $("#stat-sent").textContent = sent.length;
    $("#stat-pending").textContent = mine.filter((r) => r.status === "pending").length;
    $("#stat-accepted").textContent = mine.filter((r) => r.status === "accepted").length;
    $("#received-count").textContent = received.length;
    $("#sent-count").textContent = sent.length;
    const active = (state.direction === "received" ? received : sent)
      .filter((r) => state.status === "all" || r.status === state.status)
      .filter((r) => [r.productTitle, r.buyerCompany, r.sellerCompany, r.id].join(" ").toLowerCase().includes(state.search))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    const tbody = $("#quote-rows");
    tbody.replaceChildren();
    for (const r of active) {
      const tr = document.createElement("tr");
      const product = el("td");
      product.append(el("strong", r.productTitle), el("small", `#${safeText(r.id).slice(0, 8)}`));
      const company = el("td");
      const partnerId = state.direction === "received" ? r.buyerId : r.sellerId;
      const partnerName = state.direction === "received" ? r.buyerCompany : r.sellerCompany;
      if (partnerId) {
        const companyLink = el("a", partnerName || "Company");
        companyLink.href = `../company/company.html?id=${encodeURIComponent(String(partnerId))}`;
        companyLink.className = "quote-company-link";
        company.append(companyLink);
      } else company.textContent = partnerName || "Company";
      const quantity = el("td", `${r.quantity} ${r.unit || "units"}`);
      const status = el("td");
      status.append(el("span", r.status, `quotes-status ${r.status}`));
      const date = el("td", formatDate(r.updatedAt || r.createdAt));
      const action = el("td");
      const button = el("button", "View details", "quotes-btn quotes-btn-outline quotes-btn-small");
      button.type = "button";
      button.dataset.requestId = r.id;
      action.append(button);
      tr.append(product, company, quantity, status, date, action);
      tbody.append(tr);
    }
    $(".quotes-table-wrap").hidden = active.length === 0;
    $("#quotes-empty").hidden = active.length !== 0;
    $("#quotes-empty-text").textContent = state.search || state.status !== "all"
      ? "Try a different search or status filter."
      : state.direction === "received"
        ? "When another company requests a quote for your listings, it will appear here."
        : "Request a quote from an available listing to get started.";
    $("#empty-request-btn").hidden = state.direction === "received";
  }

  function populateListings() {
    const select = $("#request-listing");
    select.replaceChildren(new Option("Choose a listing", ""));
    const available = getProducts().filter((p) =>
      !isMine(productOwner(p)) && productOwner(p) != null &&
      ["active", "published", "available"].includes(String(p.status || "active").toLowerCase()) &&
      Number(p.quantity) > 0
    );
    for (const p of available) {
      select.add(new Option(`${p.title || p.productName || p.name || "Listing"} — ${p.companyName || p.sellerName || "Supplier"} (${p.quantity} ${p.unit || "units"})`, String(p.id)));
    }
    return available;
  }

  function openNewRequest() {
    const available = populateListings();
    if (!available.length) {
      feedback("No listings from other companies are available in this browser yet. Create a listing using another demo company account first.", true);
      return;
    }
    $("#request-form").reset();
    $("#request-error").hidden = true;
    $("#quote-dialog").showModal();
  }

  function createRequest(event) {
    event.preventDefault();
    const productId = $("#request-listing").value;
    const product = getProducts().find((p) => String(p.id) === productId);
    const qty = Number($("#request-quantity").value);
    const error = $("#request-error");
    const invalid = !product || isMine(productOwner(product)) || !["active", "published", "available"].includes(String(product.status || "active").toLowerCase()) ||
      !Number.isInteger(qty) || qty <= 0 || qty > Number(product.quantity) ||
      (Number(product.minimumOrder) > 0 && qty < Number(product.minimumOrder));
    if (invalid) {
      error.textContent = "Choose an available listing and enter a valid quantity within its available stock and minimum order.";
      error.hidden = false;
      return;
    }
    const now = new Date().toISOString();
    const request = {
      id: window.crypto?.randomUUID?.() || `quote-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      productId: product.id,
      productTitle: product.title || product.productName || product.name || "Listing",
      sellerId: productOwner(product),
      sellerCompany: product.companyName || product.sellerName || "Supplier",
      buyerId: user.id,
      buyerCompany: user.companyName || user.name || "Buyer",
      quantity: qty,
      unit: product.unit || "units",
      deliveryPreference: $("#request-delivery").value.trim(),
      message: $("#request-message").value.trim(),
      status: "pending",
      quotation: null,
      createdAt: now,
      updatedAt: now
    };
    if (save([...getRequests(), request])) {
      $("#quote-dialog").close();
      state.direction = "sent";
      updateTabs();
      render();
      feedback("Quote request saved successfully. It is visible to the supplier when they use this browser's demo data.");
    }
  }

  function updateTabs() {
    document.querySelectorAll("[data-direction]").forEach((button) => {
      const active = button.dataset.direction === state.direction;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }

  function openDetails(id) {
    const r = getRequests().find((item) => String(item.id) === String(id));
    if (!r || (!isMine(r.sellerId) && !isMine(r.buyerId))) return;
    const dialog = $("#details-dialog");
    const content = $("#details-content");
    content.replaceChildren();
    const header = el("div", undefined, "quotes-dialog-heading");
    const heading = el("div");
    heading.append(el("span", "QUOTE REQUEST", "quotes-eyebrow"), el("h2", r.productTitle));
    const close = el("button", "×", "quotes-close");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", () => dialog.close());
    header.append(heading, close);
    content.append(header);
    const grid = el("div", undefined, "quotes-details-grid");
    const fields = [
      ["Buyer", r.buyerCompany], ["Seller", r.sellerCompany],
      ["Quantity", `${r.quantity} ${r.unit || "units"}`], ["Status", r.status],
      ["Requested", formatDate(r.createdAt)], ["Delivery", r.deliveryPreference || "Not specified"]
    ];
    for (const [label, value] of fields) {
      const box = el("div"); box.append(el("small", label), el("strong", value)); grid.append(box);
    }
    content.append(grid);
    if (r.message) { content.append(el("h3", "Buyer notes"), el("p", r.message, "quotes-note")); }
    if (r.quotation) {
      content.append(el("h3", "Supplier quotation"));
      const q = r.quotation;
      const total = Number(q.unitPrice) * Number(r.quantity);
      content.append(el("p", `${money(q.unitPrice)} per ${r.unit || "unit"} · Total: ${money(total)}`, "quotes-note"));
      if (q.notes) content.append(el("p", q.notes, "quotes-note"));
    }
    const actions = el("div", undefined, "quotes-action-form");
    if (isMine(r.sellerId) && r.status === "pending") {
      const form = el("form");
      const priceLabel = el("label", "Unit price (JOD) *", "quotes-field");
      const price = el("input"); price.type = "number"; price.min = "0.01"; price.step = "0.01"; price.required = true;
      priceLabel.append(price);
      const noteLabel = el("label", "Quotation terms", "quotes-field");
      const note = el("textarea"); note.maxLength = 1000; note.rows = 3; note.placeholder = "Lead time, payment and delivery terms...";
      noteLabel.append(note);
      const submit = el("button", "Send Quotation", "quotes-btn quotes-btn-primary"); submit.type = "submit";
      const reject = el("button", "Decline Request", "quotes-btn quotes-btn-outline"); reject.type = "button";
      reject.addEventListener("click", () => changeStatus(r, "rejected", dialog));
      const buttons = el("div", undefined, "quotes-dialog-actions"); buttons.append(reject, submit);
      form.append(priceLabel, noteLabel, buttons);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!Number.isFinite(Number(price.value)) || Number(price.value) <= 0) { price.focus(); return; }
        updateRequest(r, { status: "quoted", quotation: { unitPrice: Number(price.value), currency: "JOD", notes: note.value.trim(), sentAt: new Date().toISOString() } }, dialog);
      });
      actions.append(form);
    } else if (isMine(r.buyerId) && r.status === "quoted") {
      const buttons = el("div", undefined, "quotes-dialog-actions");
      const decline = el("button", "Reject Offer", "quotes-btn quotes-btn-outline"); decline.type = "button";
      const accept = el("button", "Accept Offer", "quotes-btn quotes-btn-primary"); accept.type = "button";
      decline.addEventListener("click", () => changeStatus(r, "rejected", dialog));
      accept.addEventListener("click", () => changeStatus(r, "accepted", dialog));
      buttons.append(decline, accept); actions.append(buttons);
    } else if (isMine(r.buyerId) && r.status === "pending") {
      const buttons = el("div", undefined, "quotes-dialog-actions");
      const cancel = el("button", "Cancel Request", "quotes-btn quotes-btn-outline"); cancel.type = "button";
      cancel.addEventListener("click", () => changeStatus(r, "cancelled", dialog));
      buttons.append(cancel); actions.append(buttons);
    } else {
      actions.append(el("p", "This request has no available actions at its current stage.", "quotes-dialog-intro"));
    }
    content.append(actions);
    dialog.showModal();
  }

  function updateRequest(original, changes, dialog) {
    const records = getRequests();
    const index = records.findIndex((r) => r.id === original.id);
    if (index === -1 || records[index].status !== original.status) {
      feedback("This request has changed. Please refresh the page.", true);
      return;
    }
    records[index] = { ...records[index], ...changes, updatedAt: new Date().toISOString() };
    if (save(records)) { dialog.close(); feedback("Request updated successfully."); }
  }
  function changeStatus(r, status, dialog) { updateRequest(r, { status }, dialog); }

  $("#new-request-btn").addEventListener("click", openNewRequest);
  $("#empty-request-btn").addEventListener("click", openNewRequest);
  $("#quote-form").addEventListener("submit", createRequest);
  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => $("#quote-dialog").close()));
  $("#quote-rows").addEventListener("click", (event) => {
    const button = event.target.closest("[data-request-id]");
    if (button) openDetails(button.dataset.requestId);
  });
  document.querySelectorAll("[data-direction]").forEach((button) => button.addEventListener("click", () => {
    state.direction = button.dataset.direction;
    updateTabs(); render();
  }));
  $("#quote-search").addEventListener("input", (event) => { state.search = event.target.value.trim().toLowerCase(); render(); });
  $("#quote-status").addEventListener("change", (event) => { state.status = event.target.value; render(); });
  document.addEventListener("looply:layout-ready", () => {
    const crumb = document.querySelector("[data-breadcrumb-current]");
    if (crumb) crumb.textContent = "Quote Requests";
    const badge = document.getElementById("quote-nav-count");
    if (badge) badge.textContent = String(getRequests().filter((r) => isMine(r.sellerId) && r.status === "pending").length);
  });
  render();
})();
