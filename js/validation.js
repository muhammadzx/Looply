
"use strict";

(function () {
    function isEmpty(value) {
        return value === null ||
            value === undefined ||
            String(value).trim() === "";
    }

    function isValidEmail(email) {
        if (isEmpty(email)) {
            return false;
        }

        const normalizedEmail = String(email).trim();

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    }

    function isValidPhone(phone) {
        if (isEmpty(phone)) {
            return false;
        }

        const normalizedPhone = String(phone).trim();

        // يسمح بالأرقام والمسافات وعلامة + والأقواس والشرطات.
        if (!/^[+\d\s()-]+$/.test(normalizedPhone)) {
            return false;
        }

        const digits = normalizedPhone.replace(/\D/g, "");

        return digits.length >= 7 && digits.length <= 15;
    }

    function hasMinLength(value, minLength) {
        return !isEmpty(value) &&
            String(value).trim().length >= minLength;
    }

    function hasMaxLength(value, maxLength) {
        return String(value ?? "").length <= maxLength;
    }

    function isValidUrl(value) {
        if (isEmpty(value)) {
            return false;
        }

        try {
            const url = new URL(String(value).trim());

            return url.protocol === "http:" ||
                url.protocol === "https:";
        } catch (error) {
            return false;
        }
    }

    function isPositiveNumber(value) {
        if (isEmpty(value)) {
            return false;
        }

        const number = Number(value);

        return Number.isFinite(number) && number > 0;
    }

    function isNonNegativeNumber(value) {
        if (isEmpty(value)) {
            return false;
        }

        const number = Number(value);

        return Number.isFinite(number) && number >= 0;
    }

    function matchesConfirmation(value, confirmation) {
        return String(value ?? "") === String(confirmation ?? "");
    }

    function validateRequiredFields(data, requiredFields) {
        const errors = {};

        requiredFields.forEach(function (field) {
            if (isEmpty(data[field])) {
                errors[field] = "This field is required.";
            }
        });

        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors
        };
    }

    function validateEmailField(email) {
        if (isEmpty(email)) {
            return {
                isValid: false,
                message: "Email is required."
            };
        }

        if (!isValidEmail(email)) {
            return {
                isValid: false,
                message: "Please enter a valid email address."
            };
        }

        return {
            isValid: true,
            message: ""
        };
    }

    function validateForm(form) {
        if (!(form instanceof HTMLFormElement)) {
            return {
                isValid: false,
                errors: {
                    form: "A valid form element is required."
                }
            };
        }

        const errors = {};

        const fields = Array.from(form.querySelectorAll(
            "input, select, textarea"
        ));

        fields.forEach(function (field) {
            if (field.disabled) {
                return;
            }

            const value = field.value;
            const fieldName = field.name || field.id || "field";

            if (field.required && isEmpty(value)) {
                errors[fieldName] = "This field is required.";
                return;
            }

            if (isEmpty(value)) {
                return;
            }

            if (field.type === "email" && !isValidEmail(value)) {
                errors[fieldName] = "Please enter a valid email address.";
                return;
            }

            if (field.type === "url" && !isValidUrl(value)) {
                errors[fieldName] = "Please enter a valid URL.";
                return;
            }

            if (
                field.minLength > 0 &&
                value.length < field.minLength
            ) {
                errors[fieldName] =
                    `Enter at least ${field.minLength} characters.`;
                return;
            }

            if (
                field.maxLength > 0 &&
                value.length > field.maxLength
            ) {
                errors[fieldName] =
                    `Enter no more than ${field.maxLength} characters.`;
                return;
            }

            if (
                field.type === "number" &&
                value !== "" &&
                !Number.isFinite(Number(value))
            ) {
                errors[fieldName] = "Please enter a valid number.";
                return;
            }

            if (
                field.type === "number" &&
                field.min !== "" &&
                Number(value) < Number(field.min)
            ) {
                errors[fieldName] =
                    `The minimum value is ${field.min}.`;
                return;
            }

            if (
                field.type === "number" &&
                field.max !== "" &&
                Number(value) > Number(field.max)
            ) {
                errors[fieldName] =
                    `The maximum value is ${field.max}.`;
            }
        });

        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors
        };
    }

    window.LooplyValidation = Object.freeze({
        isEmpty,
        isValidEmail,
        isValidPhone,
        hasMinLength,
        hasMaxLength,
        isValidUrl,
        isPositiveNumber,
        isNonNegativeNumber,
        matchesConfirmation,
        validateRequiredFields,
        validateEmailField,
        validateForm
    });
})();
