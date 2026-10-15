"use strict";
(() => {
  const $ = s => document.querySelector(s);
  const storage = window.LooplyStorage;
  const auth = window.LooplyAuth;
  const QUOTES = window.LooplyConstants?.STORAGE_KEYS?.QUOTE_REQUESTS || "looply_quote_requests";
  const ORDERS = "looply_purchase_orders";
  const REVIEWS = "looply_company_reviews";
  const asId = v => String(v ?? "");
  const records = key => { const value = storage?.getLocal?.(key, []); return Array.isArray(value) ? value : []; };
  const money = v => Number.isFinite(Number(v)) ? `JOD ${Number(v).toLocaleString("en-JO",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "Not specified";
  const node = (tag, text, className) => { const n = document.createElement(tag); if (text != null) n.textContent = String(text); if(className)n.className=className; return n; };
  const state = {direction:"all",status:"all",reviewId:null};
  let user;
  function deals() {
    const orderDeals = records(ORDERS).filter(o => ["confirmed","completed"].includes(o.status)).map(o => ({...o,kind:"order",sourceKey:ORDERS,dealId:`order:${o.id}`,phase:o.status === "completed" ? "completed":"in-progress",price:o.totalPrice,sourceStatus:o.status}));
    const quoteDeals = records(QUOTES).filter(q => ["accepted","completed"].includes(q.status)).map(q => ({...q,kind:"quote",sourceKey:QUOTES,dealId:`quote:${q.id}`,phase:q.status === "completed" ? "completed":"in-progress",price:Number(q.quotation?.unitPrice)*Number(q.quantity),sourceStatus:q.status}));
    return [...orderDeals,...quoteDeals].filter(d=>asId(d.buyerId)===asId(user.id)||asId(d.sellerId)===asId(user.id)).sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")));
  }
  function feedback(message,error=false) { const el=$("#deals-feedback"); el.hidden=false; el.textContent=message; el.classList.toggle("error",error); }
  function reviewFor(deal) {return records(REVIEWS).find(r=>asId(r.dealId)===deal.dealId && asId(r.reviewerId)===asId(user.id));}
  function addLink(parent,label,url) {const a=node("a",label);a.href=url;parent.append(a);}
  function render() {
    const all=deals();
    $("#stat-all").textContent=all.length;
    $("#stat-progress").textContent=all.filter(d=>d.phase==="in-progress").length;
    $("#stat-completed").textContent=all.filter(d=>d.phase==="completed").length;
    const selected=all.filter(d=>(state.direction==="all" || (state.direction==="buying"?asId(d.buyerId):asId(d.sellerId))===asId(user.id)) && (state.status==="all"||state.status===d.phase));
    const area=$("#deals-list");area.replaceChildren();
    if(!selected.length){area.append(node("p","No deals in this view yet. Accepted quotations and confirmed purchase orders will appear here.","deals-empty"));return;}
    for(const deal of selected){
      const card=node("article",null,"deal-card");
      const top=node("div",null,"deal-top");const title=node("div");title.append(node("h2",deal.productTitle||"Product"),node("small",deal.kind==="order"?"Direct purchase request":"Accepted quotation"));top.append(title,node("span",deal.phase==="completed"?"Completed":"In progress",`deal-tag ${deal.phase}`));card.append(top);
      const otherId=asId(deal.buyerId)===asId(user.id)?deal.sellerId:deal.buyerId;
      const otherName=asId(deal.buyerId)===asId(user.id)?deal.sellerCompany:deal.buyerCompany;
      const meta=node("div",null,"deal-meta");
      for(const [label,value] of [["Partner",otherName||"Company"],["Quantity",`${deal.quantity??"—"} ${deal.unit||"units"}`],["Agreed amount",money(deal.price)],["Updated",deal.updatedAt||deal.createdAt?new Date(deal.updatedAt||deal.createdAt).toLocaleDateString("en-JO"):"—"]]){const cell=node("div");cell.append(node("small",label),node("span",value));meta.append(cell);}card.append(meta);
      const actions=node("div",null,"deal-actions");
      if(otherId) addLink(actions,"Company profile",`../company/company.html?id=${encodeURIComponent(otherId)}`);
      if(deal.productId) addLink(actions,"View listing",`../products/product-details.html?id=${encodeURIComponent(deal.productId)}`);
      if(otherId) addLink(actions,"Message company",`../messages/messages.html?${new URLSearchParams({sellerId:asId(otherId),sellerName:otherName||"Company"})}`);
      if(deal.phase==="in-progress" && asId(deal.sellerId)===asId(user.id)) {
        const button=node("button","Mark completed","primary");button.type="button";
        button.addEventListener("click",()=>complete(deal));actions.append(button);
      }
      if(deal.phase==="completed" && asId(deal.buyerId)===asId(user.id)) {
        if(reviewFor(deal)) actions.append(node("span","Review submitted ✓"));
        else {const button=node("button","Review seller","primary");button.type="button";button.addEventListener("click",()=>openReview(deal));actions.append(button);}
      }
      card.append(actions);area.append(card);
    }
  }
  function complete(deal) {
    if(!window.confirm("Confirm this deal has been fulfilled? This does not process payment."))return;
    const all=records(deal.sourceKey);
    const original=all.find(x=>asId(x.id)===asId(deal.id));
    const expected=deal.kind==="order"?"confirmed":"accepted";
    if(!original||original.status!==expected||asId(original.sellerId)!==asId(user.id)){feedback("Deal was updated elsewhere. Refresh and try again.",true);render();return;}
    original.status="completed";original.updatedAt=new Date().toISOString();
    if(!storage.setLocal(deal.sourceKey,all)){feedback("Could not save the completed deal.",true);return;}
    document.dispatchEvent(new CustomEvent(deal.kind==="order"?"looply:orders-updated":"looply:quotes-updated"));
    feedback("Deal marked completed. The buyer can now review your company.");render();
  }
  function openReview(deal){state.reviewId=deal.dealId;$("#review-partner").textContent=`Review ${deal.sellerCompany||"the seller"} for ${deal.productTitle||"this deal"}.`;$("#review-rating").value="";$("#review-comment").value="";$("#review-dialog").showModal();}
  function submitReview(event){event.preventDefault();const deal=deals().find(d=>d.dealId===state.reviewId);const rating=Number($("#review-rating").value);if(!deal||deal.phase!=="completed"||asId(deal.buyerId)!==asId(user.id)||reviewFor(deal)||!Number.isInteger(rating)||rating<1||rating>5){feedback("Review is not available for this deal.",true);$("#review-dialog").close();return;}
    const review={id:window.crypto?.randomUUID?.()||`review-${Date.now()}`,dealId:deal.dealId,companyId:deal.sellerId,reviewerId:user.id,reviewerCompany:user.companyName||user.company||"Buyer",rating,comment:$("#review-comment").value.trim().slice(0,1000),createdAt:new Date().toISOString()};
    if(!storage.setLocal(REVIEWS,[...records(REVIEWS),review])){feedback("Could not save your review.",true);return;}
    $("#review-dialog").close();feedback("Thank you. Your review is now visible on the seller's public profile.");render();
  }
  document.addEventListener("looply:layout-ready",()=>{
    user=auth?.getCurrentUser?.();if(!user?.id||!storage?.getLocal||!storage?.setLocal){location.replace("../login&register/login.html");return;}
    document.querySelectorAll("[data-direction]").forEach(btn=>btn.addEventListener("click",()=>{state.direction=btn.dataset.direction;document.querySelectorAll("[data-direction]").forEach(b=>b.classList.toggle("active",b===btn));render();}));
    $("#deal-status").addEventListener("change",e=>{state.status=e.target.value;render();});
    $("#review-form").addEventListener("submit",submitReview);
    $("#review-cancel").addEventListener("click",()=>$("#review-dialog").close());
    render();
  },{once:true});
})();
