
"use strict";

// ===============================
// 1. GET HTML ELEMENTS
// ===============================

const registerForm = document.querySelector(".form-panel form");

const companyInput = document.getElementById("company");
const registerEmail = document.getElementById("email");
const industryInput = document.getElementById("industry");
const locationInput = document.getElementById("location");
const registerPassword = document.getElementById("password");

const termsCheckbox = registerForm?.querySelector(
    'input[name="terms"]'
);

const registerButton = registerForm?.querySelector(
    'button[type="submit"]'
);

// ===============================
// 2. CREATE FEEDBACK MESSAGE
// ===============================

let registerMessage;

if (registerForm) {
    registerMessage = document.createElement("p");
    registerMessage.className = "auth-feedback";
    registerMessage.setAttribute("role", "status");
    registerMessage.setAttribute("aria-live", "polite");
    registerMessage.hidden = true;

    registerForm.appendChild(registerMessage);
}

// ===============================
// 3. SHOW / HIDE PASSWORD
// ===============================

if (registerPassword) {
    const toggleButton = document.createElement("button");

    toggleButton.type = "button";
    toggleButton.className = "password-toggle";
    toggleButton.textContent = "Show";
    toggleButton.setAttribute("aria-label", "Show password");

    registerPassword.insertAdjacentElement(
        "afterend",
        toggleButton
    );

    toggleButton.addEventListener("click", function () {
        const isHidden = registerPassword.type === "password";

        registerPassword.type = isHidden ? "text" : "password";
        toggleButton.textContent = isHidden ? "Hide" : "Show";

        toggleButton.setAttribute(
            "aria-label",
            isHidden ? "Hide password" : "Show password"
        );
    });
}

// ===============================
// 4. PASSWORD STRENGTH HINT
// ===============================

const passwordHint = registerForm?.querySelector(".field-hint");

registerPassword?.addEventListener("input", function () {
    clearRegisterMessage();

    if (!passwordHint) return;

    const password = registerPassword.value;

    if (!password) {
        passwordHint.textContent = "Use at least 8 characters.";
        return;
    }

    if (password.length < 8) {
        passwordHint.textContent =
            "Password is too short. Use at least 8 characters.";
        return;
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);

    let strength = 1;

    if (hasLetter && hasNumber) strength++;
    if (hasSymbol) strength++;
    if (password.length >= 12) strength++;

    if (strength <= 1) {
        passwordHint.textContent =
            "Password length is valid, but consider adding numbers or symbols.";
    } else if (strength <= 2) {
        passwordHint.textContent =
            "Good start. A longer password can be stronger.";
    } else {
        passwordHint.textContent =
            "Your password meets the length requirement.";
    }
});

// ===============================
// 5. CLEAR FEEDBACK
// ===============================

function clearRegisterMessage() {
    if (!registerMessage) return;

    registerMessage.textContent = "";
    registerMessage.hidden = true;
    registerMessage.className = "auth-feedback";
}

[
    companyInput,
    registerEmail,
    industryInput,
    locationInput
].forEach(function (field) {
    field?.addEventListener("input", clearRegisterMessage);
    field?.addEventListener("change", clearRegisterMessage);
});

registerPassword?.addEventListener("input", clearRegisterMessage);
termsCheckbox?.addEventListener("change", clearRegisterMessage);

// ===============================
// 6. DISPLAY FEEDBACK
// ===============================

function showRegisterMessage(message, type = "info") {
    if (!registerMessage) return;

    registerMessage.textContent = message;
    registerMessage.className = `auth-feedback ${type}`;
    registerMessage.hidden = false;
}

// ===============================
// 7. HANDLE REGISTRATION
// ===============================

registerForm?.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearRegisterMessage();

    if (!registerForm.checkValidity()) {
        registerForm.reportValidity();
        return;
    }

    const companyName = companyInput.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const industry = industryInput.value.trim();
    const location = locationInput.value.trim();

    if (!companyName || !email || !industry || !location) {
        showRegisterMessage(
            "Please complete all required fields.",
            "error"
        );
        return;
    }

    if (password.length < 8) {
        showRegisterMessage(
            "Your password must contain at least 8 characters.",
            "error"
        );
        registerPassword.focus();
        return;
    }

    if (!termsCheckbox || !termsCheckbox.checked) {
        showRegisterMessage(
            "Please agree to the Terms of Service and Privacy Policy.",
            "error"
        );
        termsCheckbox?.focus();
        return;
    }

    const auth = window.LooplyAuth;

    if (!auth) {
        showRegisterMessage(
            "The account service could not load. Please refresh the page.",
            "error"
        );
        return;
    }

    const locationNames = {
        amman: "Amman",
        zarqa: "Zarqa",
        irbid: "Irbid",
        aqaba: "Aqaba",
        other: "Other"
    };

    if (registerButton) {
        registerButton.disabled = true;
        registerButton.textContent = "Creating account...";
    }

    try {
        // STEP 1: CREATE THE ACCOUNT

        const result = await auth.registerAccount({
            companyName,
            email,
            password,
            industry,
            country: "Jordan",
            city: locationNames[location.toLowerCase()] || location,
            role: "both",
            companySize: "",
            website: "",
            categories: "",
            goals: [],
            onboardingCompleted: false,
            onboardingCompletedAt: null
        });

        if (!result.success) {
            showRegisterMessage(
                result.message || "Could not create your account.",
                "error"
            );
            return;
        }

        // STEP 2: SIGN IN AUTOMATICALLY

        const loginResult = await auth.loginDemo(
            email,
            password,
            true
        );

        if (!loginResult.success) {
            showRegisterMessage(
                "Your account was created, but automatic sign-in failed. Please sign in using your credentials.",
                "error"
            );
            return;
        }

        // STEP 3: OPEN COMPANY ONBOARDING

        showRegisterMessage(
            "Account created successfully! Redirecting to company setup...",
            "success"
        );

        if (registerButton) {
            registerButton.textContent = "Redirecting...";
        }

        window.setTimeout(function () {
            window.location.replace(
                "../companyOnboarding/companyOnboarding.html"
            );
        }, 500);

    } catch (error) {
        console.error("Registration failed:", error);

        showRegisterMessage(
            "Something went wrong while creating your account. Please try again.",
            "error"
        );
    } finally {
        // Do not re-enable the button while redirecting.
        // Re-enable it only if the user remains on this page.
        if (
            registerButton &&
            !registerMessage?.textContent.includes("Redirecting")
        ) {
            registerButton.disabled = false;
            registerButton.textContent = "Create Account";
        }
    }
});
