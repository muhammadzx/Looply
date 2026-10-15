
"use strict";

// =============================================
// LOOPLY - SHARED CONSTANTS
// =============================================

window.LooplyConstants = Object.freeze({

    APP_NAME: "Looply",
    STORAGE_VERSION: "1",

    STORAGE_KEYS: Object.freeze({
        DEMO_ACCOUNTS: "looply_demo_accounts",
        CURRENT_USER: "looply_current_user",

        COOKIE_CONSENT: "looply_cookie_consent",
        UI_PREFERENCES: "looply_ui_preferences",

        FAVORITES: "looply_favorites",
        DEMO_PRODUCTS: "looply_demo_products",

        ONBOARDING_DRAFT: "looply_onboarding_draft",

        ANNOUNCEMENT_DISMISSED: "looply_announcement_dismissed"
    }),

    SESSION_KEYS: Object.freeze({
        CURRENT_USER: "looply_current_user_session",
        TEMP_MESSAGE: "looply_temp_message",
        ONBOARDING_PROGRESS: "looply_onboarding_progress"
    }),

    COOKIE_NAMES: Object.freeze({
        CONSENT: "looply_cookie_consent"
    }),

    DEFAULT_PREFERENCES: Object.freeze({
        language: "en",
        currency: "JOD",
        theme: "light"
    }),

    USER_ROLES: Object.freeze({
        BUYER: "buyer",
        SELLER: "seller",
        BOTH: "both",
        ADMIN: "admin"
    })
});
