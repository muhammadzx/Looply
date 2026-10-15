
"use strict";

// ===============================
// 1. GET HTML ELEMENTS
// ===============================

const loginForm = document.querySelector(".form-panel form");
const loginEmail = document.getElementById("email");
const loginPassword = document.getElementById("password");

const loginButton = loginForm?.querySelector(
    'button[type="submit"]'
);

const rememberCheckbox = loginForm?.querySelector(
    'input[name="remember"]'
);

// ===============================
// 2. CREATE FEEDBACK MESSAGE
// ===============================

let loginMessage;

if (loginForm) {
    loginMessage = document.createElement("p");

    loginMessage.className = "auth-feedback";
    loginMessage.setAttribute("role", "status");
    loginMessage.setAttribute("aria-live", "polite");
    loginMessage.hidden = true;

    loginForm.appendChild(loginMessage);
}

// ===============================
// 3. SHOW / HIDE PASSWORD
// ===============================

if (loginPassword) {
    const toggleButton = document.createElement("button");

    toggleButton.type = "button";
    toggleButton.className = "password-toggle";
    toggleButton.textContent = "Show";
    toggleButton.setAttribute("aria-label", "Show password");

    loginPassword.insertAdjacentElement("afterend", toggleButton);

    toggleButton.addEventListener("click", function () {
        const isHidden = loginPassword.type === "password";

        loginPassword.type = isHidden ? "text" : "password";
        toggleButton.textContent = isHidden ? "Hide" : "Show";

        toggleButton.setAttribute(
            "aria-label",
            isHidden ? "Hide password" : "Show password"
        );
    });
}

// ===============================
// 4. FEEDBACK HELPERS
// ===============================

function clearLoginMessage() {
    if (!loginMessage) return;

    loginMessage.textContent = "";
    loginMessage.hidden = true;
    loginMessage.className = "auth-feedback";
}

function showLoginMessage(message, type = "info") {
    if (!loginMessage) return;

    loginMessage.textContent = message;
    loginMessage.className = `auth-feedback ${type}`;
    loginMessage.hidden = false;
}

loginEmail?.addEventListener("input", clearLoginMessage);
loginPassword?.addEventListener("input", clearLoginMessage);

// ===============================
// 5. FIND SAFE REDIRECT DESTINATION
// ===============================

function getRedirectDestination() {
    const navigation = window.LooplyNavigation;

    const defaultDestination = navigation
        ? navigation.getRoute("dashboard")
        : "../dashboard/dashboard.html";

    const requestedDestination =
        new URLSearchParams(window.location.search).get("next");

    if (!requestedDestination) {
        return defaultDestination;
    }

    try {
        const target = new URL(
            requestedDestination,
            window.location.href
        );

        // Only allow destinations within this Looply project.
        const projectRoot = navigation
            ? new URL("../", navigation.getRoute("home"))
            : new URL("../", window.location.href);

        if (
            target.origin !== window.location.origin ||
            !target.pathname.startsWith(projectRoot.pathname) ||
            /\/(?:login|register)\.html$/i.test(target.pathname)
        ) {
            return defaultDestination;
        }

        return target.href;
    } catch {
        return defaultDestination;
    }
}

// ===============================
// 6. HANDLE LOGIN
// ===============================

loginForm?.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearLoginMessage();

    if (!loginForm.checkValidity()) {
        loginForm.reportValidity();
        return;
    }

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        showLoginMessage(
            "Please enter your business email and password.",
            "error"
        );
        return;
    }

    if (!window.LooplyAuth) {
        showLoginMessage(
            "The account service could not load. Please refresh the page.",
            "error"
        );
        return;
    }

    if (loginButton) {
        loginButton.disabled = true;
    }

    try {
        const rememberMe = Boolean(rememberCheckbox?.checked);

        // loginDemo must accept the rememberMe argument.
        const result = await window.LooplyAuth.loginDemo(
            email,
            password,
            rememberMe
        );

        if (!result.success) {
            showLoginMessage(result.message, "error");
            return;
        }

        showLoginMessage(
            "Signed in successfully. Redirecting...",
            "success"
        );

        window.location.assign(getRedirectDestination());
    } catch (error) {
        console.error("Looply login error:", error);

        showLoginMessage(
            "Something went wrong while signing in. Please try again.",
            "error"
        );
    } finally {
        if (loginButton) {
            loginButton.disabled = false;
        }
    }
});
