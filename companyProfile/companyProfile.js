"use strict";

(() => {
    const auth = window.LooplyAuth;
    const form = document.getElementById("company-profile-form");
    const editButton = document.getElementById("edit-profile-button");
    const cancelButton = document.getElementById("cancel-profile-button");
    const saveButton = document.getElementById("save-profile-button");
    const actions = document.getElementById("profile-form-actions");
    const feedback = document.getElementById("profile-feedback");
    const goalsFieldset = document.getElementById("profile-goals");
    const fields = [...form.querySelectorAll("input:not([type=checkbox]), select, textarea")];
    const requiredFields = ["company-name", "industry", "company-size", "country", "city", "role", "description"];
    let editing = false;
    let savedUser = null;

    const $ = (selector) => document.querySelector(selector);
    const setText = (selector, value) => { const el = $(selector); if (el) el.textContent = value; };
    const getValue = (id) => document.getElementById(id).value.trim();

    function initials(name) {
        return String(name || "Looply Company").trim().split(/\s+/).filter(Boolean)
            .slice(0, 2).map(word => word[0].toUpperCase()).join("");
    }

    function selectedLabel(id) {
        const select = document.getElementById(id);
        return select.selectedOptions[0]?.textContent || "";
    }

    function showFeedback(message, error = false) {
        feedback.hidden = !message;
        feedback.textContent = message;
        feedback.classList.toggle("is-error", error);
    }

    function setFieldError(id, message) {
        const field = document.getElementById(id);
        const error = document.getElementById(`${id}-error`);
        if (field) {
            if (message) field.setAttribute("aria-invalid", "true");
            else field.removeAttribute("aria-invalid");
        }
        if (error) error.textContent = message;
    }

    function clearErrors() {
        fields.forEach(field => setFieldError(field.id, ""));
        setText("#goals-error", "");
    }

    function fillFromUser(user) {
        const values = {
            "company-name": user.companyName,
            industry: user.industry,
            "company-size": user.companySize,
            country: user.country,
            city: user.city,
            website: user.website,
            role: user.role,
            description: user.description,
            categories: user.categories
        };
        Object.entries(values).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (!element) return;
            const safeValue = String(value ?? "");
            if (element instanceof HTMLSelectElement && safeValue &&
                ![...element.options].some(option => option.value === safeValue)) {
                // Preserve previously stored values rather than silently deleting them.
                element.add(new Option(safeValue, safeValue));
            }
            element.value = safeValue;
        });
        const goals = Array.isArray(user.goals) ? user.goals : [];
        form.querySelectorAll('input[name="goals"]').forEach(checkbox => {
            checkbox.checked = goals.includes(checkbox.value) || goals.includes("both");
        });
        setText("#description-count", String(getValue("description").length));
        updateHero();
    }

    function updateHero() {
        const name = getValue("company-name") || "Your Company";
        setText("#profile-company-name", name);
        setText("#profile-company-avatar", initials(name));
        setText("#profile-company-industry", getValue("industry") ? selectedLabel("industry") : "Industry not specified");
        const location = [getValue("city"), getValue("country")].filter(Boolean).join(", ");
        setText("#profile-company-location", location || "Location not specified");
        setText("#profile-company-size", getValue("company-size") ? `${selectedLabel("company-size")}` : "Company size not specified");
    }

    function setEditing(enabled) {
        editing = enabled;
        fields.forEach(field => { field.disabled = !enabled; });
        goalsFieldset.disabled = !enabled;
        actions.hidden = !enabled;
        editButton.hidden = enabled;
        clearErrors();
        if (enabled) showFeedback("");
    }

    function validWebsite(value) {
        if (!value) return true;
        try {
            const url = new URL(value);
            return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".") && !/\s/.test(value);
        } catch { return false; }
    }

    function validate() {
        clearErrors();
        let valid = true;
        let firstInvalid = null;
        function error(id, message) {
            setFieldError(id, message);
            valid = false;
            if (!firstInvalid) firstInvalid = document.getElementById(id);
        }
        requiredFields.forEach(id => { if (!getValue(id)) error(id, "This field is required."); });
        if (getValue("description") && getValue("description").length < 20) {
            error("description", "Please enter at least 20 characters.");
        }
        if (!validWebsite(getValue("website"))) {
            error("website", "Enter a valid URL starting with https:// or http://.");
        }
        if (!form.querySelector('input[name="goals"]:checked')) {
            setText("#goals-error", "Select at least one business goal.");
            valid = false;
            firstInvalid ||= form.querySelector('input[name="goals"]');
        }
        if (!valid) {
            showFeedback("Please review the highlighted fields.", true);
            firstInvalid?.focus();
        }
        return valid;
    }

    function readData() {
        return {
            companyName: getValue("company-name"),
            industry: getValue("industry"),
            companySize: getValue("company-size"),
            country: getValue("country"),
            city: getValue("city"),
            website: getValue("website"),
            role: getValue("role"),
            description: getValue("description"),
            categories: getValue("categories"),
            goals: [...form.querySelectorAll('input[name="goals"]:checked')].map(input => input.value)
        };
    }

    function initialize() {
        if (!auth?.isLoggedIn?.()) {
            window.location.replace("../login&register/login.html");
            return;
        }
        savedUser = auth.getCurrentUser?.();
        if (!savedUser) {
            window.location.replace("../login&register/login.html");
            return;
        }
        if (savedUser.onboardingCompleted !== true) {
            window.location.replace("../companyOnboarding/companyOnboarding.html");
            return;
        }
        fillFromUser(savedUser);
        setEditing(false);
    }

    editButton.addEventListener("click", () => {
        setEditing(true);
        document.getElementById("company-name").focus();
    });

    cancelButton.addEventListener("click", () => {
        fillFromUser(savedUser);
        setEditing(false);
        showFeedback("");
    });

    $("#description").addEventListener("input", () => {
        setText("#description-count", String(getValue("description").length));
    });

    fields.forEach(field => {
        field.addEventListener("input", () => setFieldError(field.id, ""));
        field.addEventListener("change", () => setFieldError(field.id, ""));
    });

    form.addEventListener("submit", event => {
        event.preventDefault();
        if (!editing || !validate()) return;
        if (typeof auth?.updateCurrentUser !== "function") {
            showFeedback("Account storage is unavailable. Please refresh and try again.", true);
            return;
        }
        saveButton.disabled = true;
        try {
            const updated = auth.updateCurrentUser(readData());
            if (!updated) {
                showFeedback("We could not save your changes. Please try again.", true);
                return;
            }
            savedUser = auth.getCurrentUser?.() || { ...savedUser, ...readData() };
            fillFromUser(savedUser);
            setEditing(false);
            showFeedback("Company profile updated successfully.");
            // Shared sidebar/header may need refreshed company name and initials.
            document.dispatchEvent(new CustomEvent("looply:company-profile-updated", { detail: { companyName: savedUser.companyName } }));
            const name = savedUser.companyName;
            const shortName = initials(name);
            ["#sidebar-company", "#topbar-company"].forEach(id => setText(id, name));
            ["#sidebar-avatar", "#topbar-avatar"].forEach(id => setText(id, shortName));
        } finally {
            saveButton.disabled = false;
        }
    });

    initialize();
})();
