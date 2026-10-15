"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const symbols = { messages: "✉", quotes: "▧", orders: "▤", deals: "⇄", reviews: "★" };
  const state = { filter: "all", type: "all" };
  const node = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text !== undefined) n.textContent = text; return n; };
  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleString("en-JO", { dateStyle: "medium", timeStyle: "short" });
  }
  function feedback(message) { const p = $("#notifications-feedback"); p.hidden = !message; p.textContent = message; }
  function render() {
    const api = window.LooplyNotifications;
    if (!api) return;
    const all = api.list(); const unread = all.filter(n => !n.read).length;
    $("#all-count").textContent = String(all.length);
    $("#unread-count").textContent = String(unread);
    $("#mark-all").disabled = unread === 0;
    document.querySelectorAll("[data-filter]").forEach(button => { const active = button.dataset.filter === state.filter; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
    const selected = all.filter(n => (state.filter === "all" || !n.read) && (state.type === "all" || n.type === state.type));
    const list = $("#notifications-list"); list.replaceChildren();
    if (!selected.length) { const empty = node("div", "notifications-empty"); empty.append(node("strong", "", state.filter === "unread" ? "You're all caught up!" : "No notifications yet"), node("p", "", state.filter === "unread" ? "There are no unread notifications in this view." : "New activity will appear here when businesses interact with you.")); list.append(empty); return; }
    for (const n of selected) {
      const card = node("article", "notification-card" + (n.read ? "" : " is-unread"));
      card.append(node("div", "notification-symbol", symbols[n.type] || "•"));
      const body = node("div", "notification-body");
      const top = node("div", "notification-top"); top.append(node("h2", "", n.title), node("time", "notification-date", formatDate(n.date)));
      body.append(top, node("p", "", n.description));
      const actions = node("div", "notification-actions");
      const link = node("a", "", "View details →"); link.href = n.url;
      link.addEventListener("click", event => { if (!api.markRead(n.id)) { event.preventDefault(); feedback("Could not save read status. Please try again."); } });
      actions.append(link);
      if (!n.read) { const button = node("button", "", "Mark as read"); button.type = "button"; button.addEventListener("click", () => { if (!api.markRead(n.id)) feedback("Could not save read status."); else { feedback(""); render(); } }); actions.append(button); }
      body.append(actions); card.append(body);
      if (!n.read) card.append(node("span", "notification-dot"));
      list.append(card);
    }
  }
  document.addEventListener("looply:layout-ready", () => {
    const user = window.LooplyAuth?.getCurrentUser?.();
    if (!user?.id) { window.location.replace("../login&register/login.html"); return; }
    $("#mark-all").addEventListener("click", () => { if (!window.LooplyNotifications.markAllRead()) feedback("Could not save read status."); else { feedback(""); render(); } });
    document.querySelectorAll("[data-filter]").forEach(b => b.addEventListener("click", () => { state.filter = b.dataset.filter; render(); }));
    $("#notification-type").addEventListener("change", e => { state.type = e.target.value; render(); });
    for (const event of ["looply:notifications-updated", "looply:messages-updated", "looply:quotes-updated", "looply:orders-updated", "looply:reviews-updated"]) document.addEventListener(event, render);
    window.addEventListener("storage", render);
    window.addEventListener("pageshow", render);
    render();
  });
})();
