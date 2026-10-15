"use strict";
(() => {
  const KEY = "looply_purchase_orders";
  let view = "received";
  const $ = s => document.querySelector(s);
  const str = v => String(v ?? "");
  function render() {
    const user = window.LooplyAuth?.getCurrentUser?.();
    const storage = window.LooplyStorage;
    if (!user?.id || !storage?.getLocal) { location.replace("../login&register/login.html"); return; }
    const saved = storage.getLocal(KEY, []);
    const orders = (Array.isArray(saved) ? saved : []).filter(o => str(o[view === "received" ? "sellerId" : "buyerId"]) === str(user.id))
      .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));
    const list = $("#orders-list"); list.replaceChildren();
    if (!orders.length) { const empty = document.createElement("p"); empty.className = "order-empty"; empty.textContent = "No purchase requests here yet."; list.append(empty); return; }
    for (const order of orders) {
      const card = document.createElement("article"); card.className = "order-card";
      const heading = document.createElement("h2"); heading.textContent = order.productTitle || "Product"; card.append(heading);
      const info = [
        `Status: ${order.status}`, `Buyer: ${order.buyerCompany || "Buyer"}`,
        `Seller: ${order.sellerCompany || "Seller"}`,
        `Quantity: ${order.quantity} ${order.unit || "units"}`,
        `Unit price: JOD ${Number(order.unitPrice).toFixed(2)}`,
        `Total: JOD ${Number(order.totalPrice).toFixed(2)}`,
        `Delivery: ${order.deliveryPreference || "Not specified"}`,
        `Notes: ${order.message || "None"}`
      ];
      for (const line of info) { const p = document.createElement("p"); p.textContent = line; card.append(p); }
      const link = document.createElement("a"); link.href = `../products/product-details.html?id=${encodeURIComponent(order.productId)}`; link.textContent = "View listing"; card.append(link);
      const actions = document.createElement("div"); actions.className = "order-actions";
      const allowed = view === "received" && order.status === "pending" ? [["Confirm", "confirmed"], ["Decline", "rejected"]] :
        view === "sent" && order.status === "pending" ? [["Cancel request", "cancelled"]] :
          view === "received" && order.status === "confirmed" ? [["Mark completed", "completed"]] : [];
      for (const [label, status] of allowed) {
        const btn = document.createElement("button"); btn.type = "button"; btn.textContent = label;
        btn.addEventListener("click", () => {
          const all = storage.getLocal(KEY, []);
          if (!Array.isArray(all)) return;
          const target = all.find(o => str(o.id) === str(order.id));
          if (!target || target.status !== order.status || str(target[view === "received" ? "sellerId" : "buyerId"]) !== str(user.id)) return;
          if (status === "confirmed") {
            const products = storage.getDemoProducts?.() || [];
            const product = products.find(p => str(p.id) === str(order.productId));
            if (!product || Number(product.quantity) < Number(order.quantity) || !["active", "published"].includes(str(product.status).toLowerCase())) {
              $("#orders-feedback").hidden = false; $("#orders-feedback").textContent = "Insufficient stock or inactive listing. Cannot confirm."; return;
            }
            const updated = products.map(p => str(p.id) === str(order.productId)
              ? { ...p, quantity: Number(p.quantity) - Number(order.quantity), status: Number(p.quantity) === Number(order.quantity) ? "sold" : p.status, updatedAt: new Date().toISOString() } : p);
            if (!storage.saveDemoProducts?.(updated)) { $("#orders-feedback").hidden = false; $("#orders-feedback").textContent = "Could not update stock."; return; }
          }
          target.status = status; target.updatedAt = new Date().toISOString();
          if (!storage.setLocal(KEY, all)) { $("#orders-feedback").hidden = false; $("#orders-feedback").textContent = "Could not save status."; return; }
          document.dispatchEvent(new CustomEvent("looply:orders-updated")); render();
        });
        actions.append(btn);
      }
      card.append(actions); list.append(card);
    }
  }
  document.addEventListener("looply:layout-ready", () => {
    document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => {
      view = btn.dataset.view; document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b === btn)); render();
    }));
    render();
  }, { once: true });
})();