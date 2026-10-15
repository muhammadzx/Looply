"use strict";
(() => {
  const KEY = window.LooplyConstants?.STORAGE_KEYS?.MESSAGES || "looply_messages";
  const $ = selector => document.querySelector(selector);
  const auth = window.LooplyAuth;
  const storage = window.LooplyStorage;
  let currentUser = null;
  let selectedId = null;
  let started = false;

  function read() {
    const value = storage?.getLocal?.(KEY, []);
    return Array.isArray(value) ? value : [];
  }
  function write(conversations) {
    if (storage?.setLocal) storage.setLocal(KEY, conversations);
    else localStorage.setItem(KEY, JSON.stringify(conversations));
    document.dispatchEvent(new CustomEvent("looply:messages-updated"));
  }
  function id(value) { return String(value ?? ""); }
  function includesMe(conversation) { return Array.isArray(conversation.participants) && conversation.participants.some(person => id(person.id) === id(currentUser.id)); }
  function mine() { return read().filter(includesMe).sort((a,b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)); }
  function other(conversation) { return conversation.participants.find(person => id(person.id) !== id(currentUser.id)) || {id:"",name:"Company"}; }
  function unread(conversation) { return (conversation.messages || []).filter(message => id(message.senderId) !== id(currentUser.id) && !(message.readBy || []).some(person => id(person) === id(currentUser.id))).length; }
  function initials(name) { return String(name || "C").trim().split(/\s+/).slice(0,2).map(word=>word[0]?.toUpperCase() || "").join(""); }
  function time(value) { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-JO",{hour:"2-digit",minute:"2-digit"}); }
  function notice(message) { const element = $("#messages-notice"); if (element) element.textContent = message; }
  function el(tag, className, text) { const node = document.createElement(tag); if(className)node.className=className; if(text !== undefined)node.textContent=text; return node; }
  function renderList() {
    const query = $("#conversation-search").value.trim().toLowerCase();
    const conversations = mine();
    $("#conversation-count").textContent = String(conversations.length);
    const list = $("#conversation-list"); list.replaceChildren();
    const filtered = conversations.filter(c => `${other(c).name} ${c.productTitle || ""}`.toLowerCase().includes(query));
    $("#conversation-list-empty").hidden = filtered.length !== 0;
    for (const c of filtered) {
      const person = other(c); const last = (c.messages || []).at(-1);
      const button = el("button","messages-conversation" + (selectedId === c.id ? " is-active" : "")); button.type="button";
      const avatar = el("span","messages-company-avatar",initials(person.name));
      const info = el("span","messages-conversation-info");
      const top = el("span","messages-conversation-top"); const companyLink = el("a","messages-company-link",person.name);
      companyLink.href = `../company/company.html?id=${encodeURIComponent(id(person.id))}`;
      companyLink.addEventListener("click", event => event.stopPropagation());
      top.append(companyLink,el("time","",time(c.updatedAt)));
      const bottom = el("span","messages-conversation-bottom"); bottom.append(el("p","",last?.text || c.productTitle || "Start a conversation"));
      const count = unread(c); if (count) bottom.append(el("span","messages-unread",String(count)));
      info.append(top,bottom); button.append(avatar,info); button.addEventListener("click",()=>select(c.id)); list.append(button);
    }
  }
  function renderChat() {
    const conversation = mine().find(c => c.id === selectedId);
    $("#chat-placeholder").hidden = Boolean(conversation);
    $("#chat-content").hidden = !conversation;
    if (!conversation) { $(".messages-app").classList.remove("is-chat-open"); return; }
    const person = other(conversation);
    const chatCompany = $("#chat-company");
    chatCompany.replaceChildren();
    const profileLink = el("a","messages-company-link",person.name);
    profileLink.href = `../company/company.html?id=${encodeURIComponent(id(person.id))}`;
    chatCompany.append(profileLink);
    $("#chat-avatar").textContent = initials(person.name);
    $("#chat-subtitle").textContent = "Business conversation";
    $("#chat-product").hidden = !conversation.productTitle;
    $("#chat-product-title").textContent = conversation.productTitle || "";
    const thread = $("#chat-messages"); thread.replaceChildren();
    if (!(conversation.messages || []).length) thread.append(el("p","messages-thread-empty","No messages yet. Say hello to start the conversation."));
    for (const message of conversation.messages || []) {
      const own = id(message.senderId) === id(currentUser.id);
      const wrapper = el("div","messages-message"+(own ? " is-own" : ""));
      wrapper.append(el("div","messages-bubble",message.text),el("time","messages-time",time(message.createdAt)));
      thread.append(wrapper);
    }
    thread.scrollTop = thread.scrollHeight;
  }
  function select(conversationId) {
    selectedId = conversationId;
    const all = read(); const c = all.find(item => item.id === selectedId && includesMe(item));
    if (c) { for (const message of c.messages || []) { if (id(message.senderId) !== id(currentUser.id)) { message.readBy = Array.isArray(message.readBy) ? message.readBy : []; if (!message.readBy.some(person => id(person) === id(currentUser.id))) message.readBy.push(currentUser.id); } } write(all); }
    renderList(); renderChat(); $(".messages-app").classList.add("is-chat-open");
  }
  function startConversation(sellerId,sellerName,productId="",productTitle="") {
    sellerId = id(sellerId).trim(); sellerName = String(sellerName || "").trim();
    if (!sellerId || !sellerName) { notice("Company information is missing."); return; }
    if (sellerId === id(currentUser.id)) { notice("You cannot start a conversation with your own company."); return; }
    const all = read();
    let conversation = all.find(c => Array.isArray(c.participants) && c.participants.length === 2 && c.participants.some(p=>id(p.id)===id(currentUser.id)) && c.participants.some(p=>id(p.id)===sellerId) && (!productId || id(c.productId) === id(productId)));
    if (!conversation) {
      conversation = { id: crypto.randomUUID?.() || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`, participants:[{id:currentUser.id,name:currentUser.companyName || currentUser.company || currentUser.name || "My company"},{id:sellerId,name:sellerName}], productId,productTitle,messages:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      all.push(conversation); write(all);
    }
    select(conversation.id);
  }
  function send(event) {
    event.preventDefault(); const input = $("#message-input"); const text = input.value.trim(); if (!text || !selectedId) return;
    const all = read(); const c = all.find(item => item.id === selectedId && includesMe(item)); if (!c) return;
    const now = new Date().toISOString(); c.messages = Array.isArray(c.messages) ? c.messages : [];
    c.messages.push({id:crypto.randomUUID?.() || `msg-${Date.now()}`,senderId:currentUser.id,text,createdAt:now,readBy:[currentUser.id]}); c.updatedAt = now;
    try { write(all); input.value=""; renderList(); renderChat(); notice(""); } catch(error) { console.error(error); notice("Could not save the message. Please try again."); }
  }
  // Only public company fields are used in the directory; account credentials are never displayed.
  function directoryCompanies() {
    const accountsKey = window.LooplyConstants?.STORAGE_KEYS?.DEMO_ACCOUNTS || "looply_demo_accounts";
    const accounts = storage?.getLocal?.(accountsKey, []);
    if (!Array.isArray(accounts)) return [];
    const unique = new Map();
    for (const account of accounts) {
      if (!account || !account.id || id(account.id) === id(currentUser.id)) continue;
      const name = String(account.companyName || account.company || "").trim();
      if (!name) continue;
      unique.set(id(account.id), { id: id(account.id), name,
        industry: String(account.industry || "").trim(), city: String(account.city || "").trim() });
    }
    return [...unique.values()].sort((a,b) => a.name.localeCompare(b.name));
  }
  function listingCounts() {
    const products = storage?.getDemoProducts?.() || [];
    const counts = new Map();
    if (!Array.isArray(products)) return counts;
    for (const product of products) {
      const seller = id(product?.sellerId ?? product?.userId ?? product?.companyId ?? product?.ownerId ?? product?.createdBy);
      const status = String(product?.status || "").toLowerCase();
      if (seller && ["active", "published"].includes(status)) counts.set(seller, (counts.get(seller) || 0) + 1);
    }
    return counts;
  }
  function fillDirectoryFilters(companies) {
    for (const [selector, field] of [["#company-directory-industry","industry"],["#company-directory-city","city"]]) {
      const select = $(selector); const selected = select.value;
      select.replaceChildren(new Option(field === "industry" ? "All industries" : "All cities", ""));
      [...new Set(companies.map(company => company[field]).filter(Boolean))]
        .sort((a,b) => a.localeCompare(b)).forEach(value => select.add(new Option(value, value)));
      if ([...select.options].some(option => option.value === selected)) select.value = selected;
    }
  }
  function renderDirectory() {
    const companies = directoryCompanies();
    const query = $("#company-directory-search").value.trim().toLocaleLowerCase();
    const industry = $("#company-directory-industry").value;
    const city = $("#company-directory-city").value;
    const filtered = companies.filter(company =>
      `${company.name} ${company.industry} ${company.city}`.toLocaleLowerCase().includes(query) &&
      (!industry || company.industry === industry) && (!city || company.city === city)
    );
    $("#company-directory-count").textContent = `${filtered.length} ${filtered.length === 1 ? "company" : "companies"} found`;
    const results = $("#company-directory-results"); results.replaceChildren();
    if (!companies.length) { results.append(el("p","directory-empty","No other companies are registered in this browser yet. Create a second test account to try company discovery.")); return; }
    if (!filtered.length) { results.append(el("p","directory-empty","No companies match your filters.")); return; }
    const counts = listingCounts();
    for (const company of filtered) {
      const card = el("div","directory-card"); card.setAttribute("role","listitem");
      const details = el("div","directory-details");
      const profileLink = el("a","messages-company-link",company.name);
      profileLink.href = `../company/company.html?id=${encodeURIComponent(id(company.id))}`;
      details.append(profileLink,el("small","",[company.industry,company.city].filter(Boolean).join(" · ") || "Business account"));
      details.append(el("small","",`${counts.get(company.id) || 0} active listings`));
      const button = el("button","messages-btn messages-btn-primary","Message"); button.type="button";
      button.addEventListener("click",() => { startConversation(company.id,company.name); $("#new-conversation-dialog").close(); });
      card.append(el("span","messages-company-avatar",initials(company.name)),details,button); results.append(card);
    }
  }
  function openDirectory() {
    $("#company-directory-search").value = "";
    $("#company-directory-industry").value = "";
    $("#company-directory-city").value = "";
    fillDirectoryFilters(directoryCompanies()); renderDirectory();
    $("#new-conversation-dialog").showModal();
    $("#company-directory-search").focus();
  }
  function initialize() {
    if (started) return; started = true;
    currentUser = auth?.getCurrentUser?.();
    if (!currentUser?.id) { window.location.replace("../login&register/login.html"); return; }
    $("#conversation-search").addEventListener("input",renderList);
    $("#message-form").addEventListener("submit",send);
    $("#message-input").addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();$("#message-form").requestSubmit();}});
    $("#back-to-conversations").addEventListener("click",()=>$(".messages-app").classList.remove("is-chat-open"));
    const dialog = $("#new-conversation-dialog");
    $("#new-conversation-btn").addEventListener("click",openDirectory);
    $("#close-dialog").addEventListener("click",()=>dialog.close());
    $("#cancel-dialog").addEventListener("click",()=>dialog.close());
    $("#new-conversation-form").addEventListener("submit",event=>event.preventDefault());
    for (const selector of ["#company-directory-search", "#company-directory-industry", "#company-directory-city"]) {
      $(selector).addEventListener(selector.includes("search") ? "input" : "change",renderDirectory);
    }
    const params = new URLSearchParams(window.location.search);
    const sellerId = params.get("sellerId") || params.get("recipientId");
    const sellerName = params.get("sellerName") || params.get("recipientName");
    const matchingCompany = directoryCompanies().find(company => company.id === id(sellerId));
    if (sellerId && (sellerName || matchingCompany)) startConversation(sellerId,matchingCompany?.name || sellerName,params.get("productId") || "",params.get("productTitle") || "");
    else {renderList();renderChat();}
    window.addEventListener("storage",event=>{if(event.key===KEY){renderList();renderChat();}});
  }
  document.addEventListener("looply:layout-ready",initialize);
})();
