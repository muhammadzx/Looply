
"use strict";

(function () {
    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        });
    }

    function formatDate(dateValue, locale = "en-JO") {
        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "short",
            day: "numeric"
        }).format(date);
    }

    function formatCurrency(amount, currency = "JOD", locale = "en-JO") {
        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount)) {
            return "";
        }

        try {
            return new Intl.NumberFormat(locale, {
                style: "currency",
                currency: currency
            }).format(numericAmount);
        } catch (error) {
            return `${numericAmount.toFixed(2)} ${currency}`;
        }
    }

    function getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    function generateId(prefix = "item") {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return `${prefix}_${window.crypto.randomUUID()}`;
        }

        return `${prefix}_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 10)}`;
    }

    function debounce(callback, delay = 300) {
        let timeoutId;

        return function (...args) {
            clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                callback.apply(this, args);
            }, delay);
        };
    }

    function getElement(selector, parent = document) {
        return parent.querySelector(selector);
    }

    function getElements(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    }

    function scrollToElement(selector, options = {}) {
        const element = getElement(selector);

        if (!element) {
            return false;
        }

        element.scrollIntoView({
            behavior: options.behavior || "smooth",
            block: options.block || "start"
        });

        return true;
    }

    function showMessage(message, type = "info") {
        const allowedTypes = ["success", "error", "warning", "info"];

        if (!allowedTypes.includes(type)) {
            type = "info";
        }

        const event = new CustomEvent("looply:message", {
            detail: {
                message: String(message ?? ""),
                type: type
            }
        });

        document.dispatchEvent(event);
    }

    window.LooplyUtils = Object.freeze({
        escapeHtml,
        formatDate,
        formatCurrency,
        getQueryParam,
        generateId,
        debounce,
        getElement,
        getElements,
        scrollToElement,
        showMessage
    });
})();
