
"use strict";

// =============================================
// LOOPLY - CENTRAL STORAGE SYSTEM
// Front-end demo only
// =============================================

(function () {

    const constants = window.LooplyConstants;

    if (!constants) {
        console.error(
            "LooplyStorage requires constants.js to load first."
        );
        return;
    }

    const STORAGE_KEYS = constants.STORAGE_KEYS;
    const SESSION_KEYS = constants.SESSION_KEYS;
    const COOKIE_NAMES = constants.COOKIE_NAMES;

    // =============================================
    // 1. SAFE JSON HELPERS
    // =============================================

    function parseJSON(value, fallback = null) {
        if (value === null || value === undefined) {
            return fallback;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.warn("Looply: Invalid stored JSON.", error);
            return fallback;
        }
    }

    // =============================================
    // 2. LOCAL STORAGE
    // Data persists after closing the browser.
    // =============================================

    function setLocal(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("Looply: Could not save local data.", error);
            return false;
        }
    }

    function getLocal(key, fallback = null) {
        try {
            const value = localStorage.getItem(key);
            return parseJSON(value, fallback);
        } catch (error) {
            console.error("Looply: Could not read local data.", error);
            return fallback;
        }
    }

    function removeLocal(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error("Looply: Could not remove local data.", error);
            return false;
        }
    }

    // =============================================
    // 3. SESSION STORAGE
    // Data is temporary for the current tab session.
    // =============================================

    function setSession(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("Looply: Could not save session data.", error);
            return false;
        }
    }

    function getSession(key, fallback = null) {
        try {
            const value = sessionStorage.getItem(key);
            return parseJSON(value, fallback);
        } catch (error) {
            console.error("Looply: Could not read session data.", error);
            return fallback;
        }
    }

    function removeSession(key) {
        try {
            sessionStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error("Looply: Could not remove session data.", error);
            return false;
        }
    }

    // =============================================
    // 4. COOKIES
    // JavaScript cookies are NOT HttpOnly.
    // Do not store passwords or sensitive information.
    // =============================================

    function setCookie(name, value, days = 180) {
        try {
            const maxAge = Math.max(0, days) * 24 * 60 * 60;

            document.cookie =
                `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}; ` +
                `Max-Age=${maxAge}; Path=/; SameSite=Lax` +
                (window.location.protocol === "https:" ? "; Secure" : "");

            return true;
        } catch (error) {
            console.error("Looply: Could not save cookie.", error);
            return false;
        }
    }

    function getCookie(name) {
        try {
            const prefix = `${encodeURIComponent(name)}=`;

            const cookie = document.cookie
                .split("; ")
                .find((item) => item.startsWith(prefix));

            if (!cookie) {
                return null;
            }

            return decodeURIComponent(
                cookie.substring(prefix.length)
            );
        } catch (error) {
            console.error("Looply: Could not read cookie.", error);
            return null;
        }
    }

    function removeCookie(name) {
        try {
            document.cookie =
                `${encodeURIComponent(name)}=; Max-Age=0; Path=/; SameSite=Lax` +
                (window.location.protocol === "https:" ? "; Secure" : "");

            return true;
        } catch (error) {
            console.error("Looply: Could not remove cookie.", error);
            return false;
        }
    }

    // =============================================
    // 5. COOKIE CONSENT
    // This stores the user's choice, not a consent banner.
    // The UI will be connected separately.
    // =============================================

    function saveCookieConsent(choice) {
        const allowedChoices = ["accepted", "rejected", "custom"];

        if (!allowedChoices.includes(choice)) {
            return false;
        }

        const saved = setLocal(
            STORAGE_KEYS.COOKIE_CONSENT,
            {
                choice,
                updatedAt: new Date().toISOString()
            }
        );

        if (saved) {
            setCookie(COOKIE_NAMES.CONSENT, choice, 180);
        }

        return saved;
    }

    function getCookieConsent() {
        return getLocal(STORAGE_KEYS.COOKIE_CONSENT, null);
    }

    // =============================================
    // 6. UI PREFERENCES
    // =============================================

    function getPreferences() {
        return {
            ...constants.DEFAULT_PREFERENCES,
            ...getLocal(STORAGE_KEYS.UI_PREFERENCES, {})
        };
    }

    function savePreferences(preferences) {
        if (
            !preferences ||
            typeof preferences !== "object" ||
            Array.isArray(preferences)
        ) {
            return false;
        }

        const currentPreferences = getPreferences();

        return setLocal(
            STORAGE_KEYS.UI_PREFERENCES,
            {
                ...currentPreferences,
                ...preferences
            }
        );
    }

    // =============================================
    // 7. FAVORITES
    // =============================================

    function getFavorites() {
        const favorites = getLocal(STORAGE_KEYS.FAVORITES, []);

        return Array.isArray(favorites) ? favorites : [];
    }

    function saveFavorites(favorites) {
        if (!Array.isArray(favorites)) {
            return false;
        }

        return setLocal(STORAGE_KEYS.FAVORITES, favorites);
    }

    function isFavorite(productId) {
        return getFavorites().some(
            (favorite) => favorite === productId
        );
    }

    function toggleFavorite(productId) {
        if (
            productId === null ||
            productId === undefined ||
            productId === ""
        ) {
            return false;
        }

        const favorites = getFavorites();
        const exists = favorites.some(
            (favorite) => favorite === productId
        );

        const updatedFavorites = exists
            ? favorites.filter((favorite) => favorite !== productId)
            : [...favorites, productId];

        return saveFavorites(updatedFavorites);
    }

    // =============================================
    // 8. DEMO PRODUCTS
    // =============================================

    function getDemoProducts() {
        const products = getLocal(STORAGE_KEYS.DEMO_PRODUCTS, []);

        return Array.isArray(products) ? products : [];
    }

    function saveDemoProducts(products) {
        if (!Array.isArray(products)) {
            return false;
        }

        return setLocal(STORAGE_KEYS.DEMO_PRODUCTS, products);
    }

    function addDemoProduct(product) {
        if (
            !product ||
            typeof product !== "object" ||
            Array.isArray(product) ||
            product.id === undefined ||
            product.id === null
        ) {
            return false;
        }

        const products = getDemoProducts();
        const alreadyExists = products.some(
            (item) => item.id === product.id
        );

        if (alreadyExists) {
            return false;
        }

        return saveDemoProducts([...products, product]);
    }

    function updateDemoProduct(productId, updates) {
        if (
            productId === null ||
            productId === undefined ||
            !updates ||
            typeof updates !== "object" ||
            Array.isArray(updates)
        ) {
            return false;
        }

        const products = getDemoProducts();
        const exists = products.some(
            (product) => product.id === productId
        );

        if (!exists) {
            return false;
        }

        const updatedProducts = products.map((product) => {
            if (product.id !== productId) {
                return product;
            }

            // The original ID cannot be overwritten.
            return {
                ...product,
                ...updates,
                id: product.id
            };
        });

        return saveDemoProducts(updatedProducts);
    }

    function deleteDemoProduct(productId) {
        const products = getDemoProducts();

        return saveDemoProducts(
            products.filter((product) => product.id !== productId)
        );
    }

    // =============================================
    // 9. ONBOARDING DRAFT
    // =============================================

    function saveOnboardingDraft(draft) {
        if (
            !draft ||
            typeof draft !== "object" ||
            Array.isArray(draft)
        ) {
            return false;
        }

        return setLocal(
            STORAGE_KEYS.ONBOARDING_DRAFT,
            {
                ...draft,
                updatedAt: new Date().toISOString()
            }
        );
    }

    function getOnboardingDraft() {
        return getLocal(STORAGE_KEYS.ONBOARDING_DRAFT, null);
    }

    function clearOnboardingDraft() {
        return removeLocal(STORAGE_KEYS.ONBOARDING_DRAFT);
    }

    function saveOnboardingProgress(step) {
        if (!Number.isInteger(step) || step < 1) {
            return false;
        }

        return setSession(SESSION_KEYS.ONBOARDING_PROGRESS, step);
    }

    function getOnboardingProgress() {
        return getSession(SESSION_KEYS.ONBOARDING_PROGRESS, 1);
    }

    // =============================================
    // 10. ANNOUNCEMENT BAR
    // =============================================

    function isAnnouncementDismissed() {
        return getLocal(
            STORAGE_KEYS.ANNOUNCEMENT_DISMISSED,
            false
        ) === true;
    }

    function dismissAnnouncement() {
        return setLocal(
            STORAGE_KEYS.ANNOUNCEMENT_DISMISSED,
            true
        );
    }

    // =============================================
    // 11. CLEAR DEMO DATA
    // Does not clear unrelated website storage.
    // =============================================

    function clearLooplyDemoData() {
        const localKeys = Object.values(STORAGE_KEYS);
        const sessionKeys = Object.values(SESSION_KEYS);

        localKeys.forEach(removeLocal);
        sessionKeys.forEach(removeSession);

        Object.values(COOKIE_NAMES).forEach(removeCookie);
    }

    // =============================================
    // 12. PUBLIC STORAGE API
    // Other files use this shared object.
    // =============================================

    window.LooplyStorage = Object.freeze({

        setLocal,
        getLocal,
        removeLocal,

        setSession,
        getSession,
        removeSession,

        setCookie,
        getCookie,
        removeCookie,

        saveCookieConsent,
        getCookieConsent,

        getPreferences,
        savePreferences,

        getFavorites,
        saveFavorites,
        isFavorite,
        toggleFavorite,

        getDemoProducts,
        saveDemoProducts,
        addDemoProduct,
        updateDemoProduct,
        deleteDemoProduct,

        saveOnboardingDraft,
        getOnboardingDraft,
        clearOnboardingDraft,

        saveOnboardingProgress,
        getOnboardingProgress,

        isAnnouncementDismissed,
        dismissAnnouncement,

        clearLooplyDemoData
    });

})();
