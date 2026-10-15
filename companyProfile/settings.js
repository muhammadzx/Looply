"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const auth = window.LooplyAuth;
  const storage = window.LooplyStorage;
  const user = auth?.getCurrentUser?.();
  if (!user) {
    window.LooplyNavigation?.navigateTo?.("login");
    return;
  }
  const prefKey = `looply_settings_preferences_${String(user.id)}`;
  const notice = $("ls-notice");
  function showNotice(message, isError = false) {
    notice.textContent = message;
    notice.classList.toggle("ls-error", isError);
    notice.hidden = false;
    notice.scrollIntoView({behavior:"smooth", block:"nearest"});
  }
  function setValue(id, value) { $(id).value = String(value ?? ""); }
  function loadCompany() {
    const account = auth.getCurrentUser();
    setValue("ls-name", account.companyName);
    setValue("ls-email", account.email);
    setValue("ls-industry", account.industry);
    setValue("ls-city", account.city);
    setValue("ls-country", account.country);
    setValue("ls-size", account.companySize);
    setValue("ls-website", account.website);
    setValue("ls-description", account.description);
    updateCount();
  }
  function updateCount() { $("ls-description-count").textContent = $("ls-description").value.length; }
  $("ls-description").addEventListener("input", updateCount);
  $("ls-company-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const companyName = $("ls-name").value.trim();
    if (!companyName) return showNotice("Company name is required.", true);
    const website = $("ls-website").value.trim();
    if (website) {
      try {
        const url = new URL(website);
        if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid protocol");
      } catch { return showNotice("Enter a valid http:// or https:// website URL.", true); }
    }
    const success = auth.updateCurrentUser({
      companyName,
      industry: $("ls-industry").value.trim(),
      city: $("ls-city").value.trim(),
      country: $("ls-country").value.trim(),
      companySize: $("ls-size").value.trim(),
      website,
      description: $("ls-description").value.trim()
    });
    if (!success) return showNotice("Could not save company information.", true);
    document.dispatchEvent(new CustomEvent("looply:company-updated"));
    showNotice("Company information saved successfully.");
  });
  $("ls-password-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const oldPassword = $("ls-old-password").value;
    const newPassword = $("ls-new-password").value;
    if (newPassword !== $("ls-confirm-password").value) return showNotice("New passwords do not match.", true);
    if (newPassword.length < 8) return showNotice("Password must contain at least 8 characters.", true);
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await auth.changePassword(oldPassword, newPassword);
      showNotice(result.message || "Password updated.", !result.success);
      if (result.success) event.currentTarget.reset();
    } catch {
      showNotice("Password update failed. Please try again.", true);
    } finally { button.disabled = false; }
  });
  const defaults = {currency:"JOD", language:"en", messages:true, quotes:true, orders:true};
  const stored = storage.getLocal(prefKey, {});
  const prefs = {...defaults, ...(stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {})};
  $("ls-currency").value = ["JOD","USD","EUR"].includes(prefs.currency) ? prefs.currency : "JOD";
  $("ls-language").value = window.LooplyUI?.getLanguage?.() || "en";
  $("ls-notify-messages").checked = prefs.messages !== false;
  $("ls-notify-quotes").checked = prefs.quotes !== false;
  $("ls-notify-orders").checked = prefs.orders !== false;
  $("ls-preferences-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const updated = {
      currency: $("ls-currency").value,
      language: $("ls-language").value,
      messages: $("ls-notify-messages").checked,
      quotes: $("ls-notify-quotes").checked,
      orders: $("ls-notify-orders").checked
    };
    if (!storage.setLocal(prefKey, updated)) return showNotice("Could not save preferences.", true);
    window.LooplyUI?.setLanguage?.(updated.language);
    window.LooplyUI?.setTheme?.($("ls-theme").value);
    document.dispatchEvent(new CustomEvent("looply:preferences-updated", {detail:updated}));
    showNotice("Preferences saved. Other features will need to read these settings to apply them.");
  });
  loadCompany();
})();
