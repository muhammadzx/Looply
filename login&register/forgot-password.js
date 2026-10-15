
"use strict";

const forgotPasswordForm = document.getElementById(
    "forgotPasswordForm"
);

const emailInput = document.getElementById("email");
const formMessage = document.getElementById("formMessage");
const submitButton = forgotPasswordForm.querySelector(
    'button[type="submit"]'
);

forgotPasswordForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();

    formMessage.hidden = true;
    formMessage.className = "forgot-message";

    if (!emailInput.checkValidity() || !email) {
        emailInput.reportValidity();
        return;
    }

    formMessage.textContent =
        "Password reset is not connected yet. Once the backend is ready, reset instructions can be sent to your business email.";

    formMessage.classList.add("is-info");
    formMessage.hidden = false;
});

emailInput.addEventListener("input", function () {
    if (!formMessage.hidden) {
        formMessage.hidden = true;
        formMessage.className = "forgot-message";
    }
});
