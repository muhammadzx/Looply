
"use strict";

(function () {
    // تحديد المجلد الرئيسي للمشروع من موقع هذا الملف.
    const currentScript = document.currentScript;

    if (!currentScript || !currentScript.src) {
        console.error("Looply Navigation: Could not determine the project path.");
        return;
    }

    const projectRoot = new URL("../", currentScript.src);

    // جميع المسارات مكتوبة نسبةً إلى المجلد الرئيسي.
    const routes = Object.freeze({
        home: "landingPage/index.html",

        login: "login&register/login.html",
        register: "login&register/register.html",
        forgotPassword: "login&register/forgot-password.html",
        resetPassword: "login&register/reset-password.html",

        onboarding: "companyOnboarding/companyOnboarding.html",

        marketplace: "marketplace/marketplace.html",
        companies: "companies/companies.html",
        orders: "orders/orders.html",
        productDetails: "products/product-details.html",
        favorites: "marketplace/favorites.html",

        createListing: "listings/createListing.html",
        editListing: "listings/edit-listing.html",
        myListings: "listings/myListings.html",
        aiListingAssistant: "listings/ai-listing-assistant.html",

        dashboard: "dashboard/companyDashboard.html",
        sellerOverview: "dashboard/seller-overview.html",
        buyerOverview: "dashboard/buyer-overview.html",

        requestQuote: "quotes/request-quote.html",
        quoteRequests: "quotes/quote-requests.html",
        quoteRequestDetails: "quotes/quote-request-details.html",
        makeOffer: "quotes/make-offer.html",
        offerDetails: "quotes/offer-details.html",

        messages: "messages/messages.html",
        deals: "deals/deals.html",
        dealDetails: "deals/deal-details.html",
        notifications: "notifications/notifications.html",

        companyProfile: "companyProfile/companyProfile.html",
        editCompanyProfile: "companyProfile/edit-company-profile.html",
        settings: "companyProfile/settings.html",

        adminLogin: "admin/admin-login.html",
        adminDashboard: "admin/admin-dashboard.html",
        manageCompanies: "admin/manage-companies.html",
        companyReview: "admin/company-review.html",
        manageListings: "admin/manage-listings.html",
        reports: "admin/reports.html",

        howItWorks: "pages/how-it-works.html",
        about: "pages/about.html",
        contact: "pages/contact.html",
        termsPrivacy: "pages/terms-privacy.html",

        loading: "states/loading.html",
        error: "states/error.html",
        notFound: "states/404.html"
    });

    function getRoute(page) {
        const route = routes[page];

        if (!route) {
            console.error(`Looply Navigation: Unknown route "${page}".`);
            return null;
        }

        return new URL(route, projectRoot).href;
    }

    function navigateTo(page) {
        const destination = getRoute(page);

        if (!destination) {
            return false;
        }

        window.location.href = destination;
        return true;
    }

    function requireDemoLogin(redirectPage = "login") {
        const auth = window.LooplyAuth;

        if (auth && auth.isLoggedIn()) {
            return true;
        }

        const loginUrl = getRoute(redirectPage);

        if (!loginUrl) {
            return false;
        }

        const destination = new URL(loginUrl);

        destination.searchParams.set(
            "next",
            window.location.href
        );

        window.location.href = destination.href;

        return false;
    }

    function logoutAndRedirect() {
        if (window.LooplyAuth) {
            window.LooplyAuth.logout();
        }

        navigateTo("home");
    }

    function bindLogoutButtons() {
        document.querySelectorAll("[data-looply-logout]")
            .forEach(function (button) {
                if (button.dataset.looplyLogoutBound === "true") {
                    return;
                }

                button.dataset.looplyLogoutBound = "true";

                button.addEventListener("click", function (event) {
                    event.preventDefault();
                    logoutAndRedirect();
                });
            });
    }

    document.addEventListener("DOMContentLoaded", bindLogoutButtons);

    window.LooplyNavigation = Object.freeze({
        routes,
        getRoute,
        navigateTo,
        requireDemoLogin,
        logoutAndRedirect
    });
})();
