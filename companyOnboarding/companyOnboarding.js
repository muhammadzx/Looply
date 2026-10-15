
"use strict";

const form = document.getElementById("onboarding-form");
const steps = [...document.querySelectorAll(".form-step")];
const indicators = [...document.querySelectorAll(".step-indicator")];

const backButton = document.getElementById("back-button");
const nextButton = document.getElementById("next-button");
const finishButton = document.getElementById("finish-button");

const stepLabel = document.getElementById("step-label");
const progressPercent = document.getElementById("progress-percent");
const progressFill = document.getElementById("progress-fill");
const progressBar = document.getElementById("progress-bar");
const feedback = document.getElementById("form-feedback");

const description = document.getElementById("description");
const descriptionCount = document.getElementById("description-count");

let currentStep = 0;


const storage = window.LooplyStorage;
const auth = window.LooplyAuth;
const constants = window.LooplyConstants;

function enforceOnboardingAccess() {
    if (!auth || !auth.isLoggedIn()) {
        window.location.replace("../login&register/login.html");
        return false;
    }

    const user = auth.getCurrentUser();

    if (!user) {
        window.location.replace("../login&register/login.html");
        return false;
    }

    if (user.onboardingCompleted === true) {
        window.location.replace(
            "../dashboard/companyDashboard.html"
        );
        return false;
    }

    return true;
}

// Read all onboarding fields.
function getOnboardingData() {
    return {
        companyName: document.getElementById("company-name").value.trim(),
        industry: document.getElementById("industry").value,
        companySize: document.getElementById("company-size").value,
        country: document.getElementById("country").value,
        city: document.getElementById("city").value.trim(),
        website: document.getElementById("website").value.trim(),
        role: document.getElementById("role").value,
        description: document.getElementById("description").value.trim(),
        categories: document.getElementById("categories").value,
        goals: [
            ...form.querySelectorAll('input[name="goals"]:checked')
        ].map((checkbox) => checkbox.value)
    };
}

// Save the form as a draft.
function saveOnboardingDraft() {
    if (!storage || !constants) return false;

    const user = auth?.getCurrentUser();

    return storage.setLocal(
        constants.STORAGE_KEYS.ONBOARDING_DRAFT,
        {
            userId: user?.id ?? null,
            data: getOnboardingData(),
            currentStep,
            updatedAt: new Date().toISOString()
        }
    );
}


function prefillCompanyDataFromAccount() {
    const user = auth?.getCurrentUser();

    if (!user) return;

    const fields = {
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

    Object.entries(fields).forEach(([id, value]) => {
        const field = document.getElementById(id);

        // Fill only empty fields so existing values are preserved.
        if (
            field &&
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {
            field.value = value;
        }
    });

    const userGoals = Array.isArray(user.goals)
        ? user.goals
        : [];

    form.querySelectorAll('input[name="goals"]').forEach((checkbox) => {
        checkbox.checked = userGoals.includes(checkbox.value);
    });

    if (descriptionCount && description) {
        descriptionCount.textContent = String(description.value.length);
    }
}


// Restore a previously saved draft.
function restoreOnboardingDraft() {
    if (!storage || !constants) return;

    const draft = storage.getLocal(
        constants.STORAGE_KEYS.ONBOARDING_DRAFT,
        null
    );

    const user = auth?.getCurrentUser();

    if (!draft || !draft.data) return;

    // Avoid showing another account's draft.
    if (!user || draft.userId !== user.id) return;

    const data = draft.data;

    const fields = {
        "company-name": data.companyName,
        industry: data.industry,
        "company-size": data.companySize,
        country: data.country,
        city: data.city,
        website: data.website,
        role: data.role,
        description: data.description,
        categories: data.categories
    };

    Object.entries(fields).forEach(([id, value]) => {
        const field = document.getElementById(id);

        if (field && value !== undefined && value !== null) {
            field.value = value;
        }
    });

    form.querySelectorAll('input[name="goals"]').forEach((checkbox) => {
        checkbox.checked = (data.goals || []).includes(checkbox.value);
    });

    descriptionCount.textContent = String(description.value.length);

    const savedStep = Number(draft.currentStep);

    if (
        Number.isInteger(savedStep) &&
        savedStep >= 0 &&
        savedStep < steps.length
    ) {
        showStep(savedStep);
    }
}

function showFeedback(message, type = "") {
    feedback.textContent = message;
    feedback.className = "form-feedback";

    if (type) {
        feedback.classList.add(type);
    }
}

function clearFeedback() {
    showFeedback("");
}

function showStep(index) {
    currentStep = index;

    steps.forEach((step, stepIndex) => {
        const isActive = stepIndex === index;

        step.hidden = !isActive;
        step.classList.toggle("active", isActive);
    });

    indicators.forEach((indicator, stepIndex) => {
        indicator.classList.toggle("active", stepIndex === index);
        indicator.classList.toggle("completed", stepIndex < index);
    });

    const progress = Math.round(((index + 1) / steps.length) * 100);

    stepLabel.textContent = `Step ${index + 1} of ${steps.length}`;
    progressPercent.textContent = `${progress}%`;
    progressFill.style.width = `${progress}%`;

    progressBar.setAttribute("aria-valuenow", String(index + 1));

    backButton.hidden = index === 0;
    nextButton.hidden = index === steps.length - 1;
    finishButton.hidden = index !== steps.length - 1;

    if (storage && constants) {
        storage.setSession(
            constants.SESSION_KEYS.ONBOARDING_PROGRESS,
            index
        );
    }

    clearFeedback();

    const heading = steps[index].querySelector("h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setError(field, message) {
    const errorElement = document.getElementById(`${field.id}-error`);

    field.setAttribute("aria-invalid", "true");

    if (errorElement) {
        errorElement.textContent = message;
    }
}

function clearError(field) {
    field.removeAttribute("aria-invalid");

    const errorElement = document.getElementById(`${field.id}-error`);

    if (errorElement) {
        errorElement.textContent = "";
    }
}

function isValidWebsite(value) {
    try {
        const url = new URL(value);

        return (
            ["http:", "https:"].includes(url.protocol) &&
            Boolean(url.hostname.includes(".")) &&
            !/\s/.test(value)
        );
    } catch {
        return false;
    }
}

function validateStep(index) {
    let isValid = true;
    let firstInvalidField = null;

    const currentFields = [
        ...steps[index].querySelectorAll("input, select, textarea")
    ].filter((field) => {
        return field.type !== "checkbox" && field.type !== "button";
    });

    currentFields.forEach((field) => {
        clearError(field);

        const value = field.value.trim();

        if (field.required && !value) {
            setError(field, "This field is required.");
            isValid = false;
        } else if (
            field.id === "company-name" &&
            value.length > 100
        ) {
            setError(field, "Company name is too long.");
            isValid = false;
        } else if (
            field.id === "city" &&
            value.length > 80
        ) {
            setError(field, "City name is too long.");
            isValid = false;
        } else if (
            field.id === "description" &&
            value.length < 20
        ) {
            setError(field, "Please enter at least 20 characters.");
            isValid = false;
        } else if (
            field.id === "website" &&
            value &&
            !isValidWebsite(value)
        ) {
            setError(field, "Enter a valid website URL starting with https:// or http://.");
            isValid = false;
        }

        if (field.getAttribute("aria-invalid") === "true" && !firstInvalidField) {
            firstInvalidField = field;
        }
    });

    if (index === 2) {
        const selectedGoals = form.querySelectorAll(
            'input[name="goals"]:checked'
        );

        const goalsError = document.getElementById("goals-error");

        if (selectedGoals.length === 0) {
            goalsError.textContent = "Select at least one business goal.";
            isValid = false;
        } else {
            goalsError.textContent = "";
        }
    }

    if (!isValid) {
        showFeedback("Please review the highlighted fields.", "error");

        if (firstInvalidField) {
            firstInvalidField.focus();
        } else if (index === 2) {
            form.querySelector('input[name="goals"]')?.focus();
        }
    }

    return isValid;
}

nextButton.addEventListener("click", () => {
    if (!validateStep(currentStep)) {
        return;
    }

    if (currentStep < steps.length - 1) {
        showStep(currentStep + 1);
    }
});

backButton.addEventListener("click", () => {
    if (currentStep > 0) {
        showStep(currentStep - 1);
    }
});

description.addEventListener("input", () => {
    descriptionCount.textContent = String(description.value.length);
    clearError(description);
});

form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => clearError(field));
    field.addEventListener("change", () => clearError(field));
});


form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateStep(currentStep)) {
        return;
    }

    const user = auth?.getCurrentUser();

    if (!user) {
        showFeedback(
            "Please sign in before completing company setup.",
            "error"
        );
        return;
    }

    const data = getOnboardingData();

    // Interpret the selected business goals.
    const goals = data.goals.includes("both")
        ? ["buy", "sell"]
        : data.goals;

    const companyData = {
        companyName: data.companyName,
        industry: data.industry,
        companySize: data.companySize,
        country: data.country,
        city: data.city,
        website: data.website,
        role: data.role,
        description: data.description,
        categories: data.categories,
        goals,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString()
    };

    const updated = auth.updateCurrentUser(companyData);

    if (!updated) {
        showFeedback(
            "We could not save your company profile. Please try again.",
            "error"
        );
        return;
    }

    // Remove the completed draft and saved progress.
    storage.removeLocal(constants.STORAGE_KEYS.ONBOARDING_DRAFT);
    storage.removeSession(constants.SESSION_KEYS.ONBOARDING_PROGRESS);

    showFeedback(
        "Your company profile has been saved successfully!",
        "success"
    );


    finishButton.disabled = true;
    finishButton.textContent = "Setup completed ✓";

    setTimeout(() => {
        window.location.replace(
            "../dashboard/companyDashboard.html"
        );
    }, 800);
});


form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", saveOnboardingDraft);
    field.addEventListener("change", saveOnboardingDraft);
});


if (enforceOnboardingAccess()) {
    prefillCompanyDataFromAccount();
    showStep(0);
    restoreOnboardingDraft();
}

