"use strict";
(() => {
  const READ_KEY = "looply_notification_read_v1";
  const key = (name, fallback) => window.LooplyConstants?.STORAGE_KEYS?.[name] || fallback;
  const storage = () => window.LooplyStorage;
  const me = () => String(window.LooplyAuth?.getCurrentUser?.()?.id ?? "");
  const same = (a,b) => String(a ?? "") === String(b ?? "");
  function records(k) {
    const value = storage()?.getLocal?.(k, []);
    return Array.isArray(value) ? value : [];
  }
  function readMap() {
    const value = storage()?.getLocal?.(READ_KEY, {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  function add(list, id, type, title, description, date, url) {
    if (!id) return;
    list.push({id, type, title, description, date: date || "", url});
  }
  function collect() {
    const userId = me();
    if (!userId) return [];
    const list = [];
    for (const c of records(key("MESSAGES", "looply_messages"))) {
      if (!Array.isArray(c?.participants) || !c.participants.some(p => same(p.id, userId))) continue;
      const sender = c.participants.find(p => !same(p.id, userId));
      for (const m of c.messages || []) {
        if (same(m.senderId, userId)) continue;
        const messageId = m.id || `${m.senderId}:${m.createdAt || m.timestamp || ""}:${m.text || ""}`;
        add(list, `message:${c.id}:${messageId}`, "messages", "New message", `${sender?.name || "A company"} sent you a message`, m.createdAt || m.timestamp || c.updatedAt, `../messages/messages.html?sellerId=${encodeURIComponent(m.senderId)}&sellerName=${encodeURIComponent(sender?.name || "Company")}`);
      }
    }
    for (const q of records(key("QUOTE_REQUESTS", "looply_quote_requests"))) {
      if (!q?.id) continue;
      if (same(q.sellerId,userId) && q.status === "pending") {
        add(list,`quote:${q.id}:pending`,"quotes","New quote request",`${q.buyerCompany || "A buyer"} requested a quote for ${q.productTitle || "a listing"}`,q.createdAt,"../quotes/quote-requests.html");
      }
      if (same(q.buyerId,userId) && ["quoted","rejected","accepted","completed"].includes(q.status)) {
        add(list,`quote:${q.id}:${q.status}`,"quotes",q.status === "quoted" ? "Quotation received" : "Quote status updated",`${q.productTitle || "Your quote request"}: ${q.status}`,q.updatedAt || q.createdAt,"../quotes/quote-requests.html");
      }
      if (same(q.sellerId,userId) && ["accepted","completed"].includes(q.status)) {
        add(list,`quote:${q.id}:${q.status}`,"deals",q.status === "accepted" ? "Quotation accepted" : "Deal completed",`${q.buyerCompany || "Buyer"} · ${q.productTitle || "Listing"}`,q.updatedAt || q.createdAt,"../deals/deals.html");
      }
    }
    for (const o of records("looply_purchase_orders")) {
      if (!o?.id) continue;
      if (same(o.sellerId,userId) && o.status === "pending") {
        add(list,`order:${o.id}:pending`,"orders","New purchase request",`${o.buyerCompany || "A buyer"} requested ${o.productTitle || "a product"}`,o.createdAt,"../orders/orders.html");
      }
      if (same(o.buyerId,userId) && ["confirmed","rejected","cancelled","completed"].includes(o.status)) {
        add(list,`order:${o.id}:${o.status}`,"orders",o.status === "confirmed" ? "Purchase confirmed" : "Order status updated",`${o.productTitle || "Order"}: ${o.status}`,o.updatedAt || o.createdAt,"../orders/orders.html");
      }
      if (same(o.sellerId,userId) && o.status === "cancelled") {
        add(list,`order:${o.id}:cancelled`,"orders","Purchase cancelled",`${o.productTitle || "Order"} was cancelled`,o.updatedAt || o.createdAt,"../orders/orders.html");
      }
    }
    for (const r of records("looply_company_reviews")) {
      if (!r?.id || !same(r.companyId,userId)) continue;
      add(list,`review:${r.id}`,"reviews","New company review",`${r.reviewerCompany || "A buyer"} left a rating`,r.createdAt,`../company/company.html?id=${encodeURIComponent(userId)}`);
    }
    const seen = new Set();
    return list.filter(n => {if(seen.has(n.id))return false;seen.add(n.id);return true;})
      .sort((a,b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  }
  function list() {
    const userId = me();
    const marked = readMap()[userId] || {};
    return collect().map(n => ({...n, read: Boolean(marked[n.id])}));
  }
  function unreadCount() {return list().filter(n=>!n.read).length;}
  function mark(ids) {
    const userId = me();
    if (!userId) return false;
    const data = readMap();
    data[userId] = {...(data[userId] || {})};
    for (const id of ids) data[userId][id] = true;
    const ok = storage()?.setLocal?.(READ_KEY,data);
    if (ok) document.dispatchEvent(new CustomEvent("looply:notifications-updated"));
    return Boolean(ok);
  }
  window.LooplyNotifications = Object.freeze({list, unreadCount, markRead:id=>mark([id]), markAllRead:()=>mark(list().map(n=>n.id)), READ_KEY});
})();
