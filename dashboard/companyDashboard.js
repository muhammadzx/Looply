"use strict";

document.addEventListener("looply:layout-ready", () => {
    (() => {
        // =========================
        // ELEMENTS AND SHARED TOOLS
        // =========================

        const storage = window.LooplyStorage;
        const auth = window.LooplyAuth;
        const navigation = window.LooplyNavigation;

        const $ = (selector) => document.querySelector(selector);

        const elements = {
            welcomeCompany: $("#welcome-company"),
            sidebarCompany: $("#sidebar-company"),
            topbarCompany: $("#topbar-company"),
            sidebarAvatar: $("#sidebar-avatar"),
            topbarAvatar: $("#topbar-avatar"),
            previewNotice: $("#preview-notice"),

            activeListings: $("#active-listings"),
            totalViews: $("#total-views"),
            quoteRequests: $("#quote-requests"),
            completedDeals: $("#completed-deals"),
            quoteNavCount: $("#quote-nav-count"),

            listingsBody: $("#recent-listings-body"),
            listingsEmpty: $("#listings-empty"),
            search: $("#dashboard-search"),

            profileProgressText: $("#profile-progress-text"),
            profileProgressHint: $("#profile-progress-hint"),
            profileProgressDescription: $("#profile-progress-description"),
            profileProgressBar: $("#profile-progress-bar"),
            profileProgressFill: $("#profile-progress-fill"),

            activityList: $("#activity-list"),
            toastContainer: $("#toast-container")
        };

        const STATUS_LABELS = {
            active: "Active",
            published: "Active",
            pending: "Pending review",
            "pending-review": "Pending review",
            draft: "Draft",
            sold: "Sold",
            inactive: "Inactive",
            rejected: "Rejected",
            archived: "Archived"
        };

        const STATUS_CLASSES = {
            active: "status-active",
            published: "status-active",
            pending: "status-pending",
            "pending-review": "status-pending",
            draft: "status-draft",
            sold: "status-sold",
            inactive: "status-inactive",
            rejected: "status-inactive",
            archived: "status-draft"
        };

        const PRODUCT_ICONS = {
            electronics: "▣",
            machinery: "⚙",
            construction: "▤",
            packaging: "▥",
            office: "▦",
            "raw-materials": "◆",
            food: "♧",
            agriculture: "♧",
            energy: "ϟ"
        };

        const PREVIEW_PRODUCTS = [
            {
                id: "preview-1",
                title: "Industrial Copper Wire",
                category: "Raw Materials",
                status: "active",
                views: 342,
                updatedAt: "Today"
            },
            {
                id: "preview-2",
                title: "Office Chairs (Bulk)",
                category: "Office Supplies",
                status: "pending",
                views: 186,
                updatedAt: "Yesterday"
            },
            {
                id: "preview-3",
                title: "Packaging Cartons",
                category: "Packaging",
                status: "draft",
                views: 0,
                updatedAt: "Oct 10"
            },
            {
                id: "preview-4",
                title: "LED Panel Lights",
                category: "Electronics",
                status: "active",
                views: 94,
                updatedAt: "Oct 9"
            }
        ];

        let currentUser = null;
        let isPreviewMode = false;
        let currentListings = [];

        // =========================
        // SAFE HELPERS
        // =========================

        function normalizeText(value, fallback = "") {
            return typeof value === "string" && value.trim()
                ? value.trim()
                : fallback;
        }

        function normalizeNumber(value) {
            const number = Number(value);

            return Number.isFinite(number) && number > 0
                ? number
                : 0;
        }

        function normalizeStatus(value) {
            const status = normalizeText(value, "draft")
                .toLowerCase()
                .replace(/_/g, "-")
                .replace(/\s+/g, "-");

            return STATUS_LABELS[status] ? status : "draft";
        }

        function getInitials(name) {
            return normalizeText(name, "Looply Company")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((word) => word.charAt(0).toUpperCase())
                .join("");
        }

        function showToast(message, type = "info") {
            if (!elements.toastContainer) return;

            const toast = document.createElement("div");
            toast.className = `toast ${type}`;
            toast.textContent = message;

            elements.toastContainer.appendChild(toast);

            window.setTimeout(() => {
                toast.remove();
            }, 3500);
        }

        function formatDate(value) {
            if (!value) return "—";

            if (typeof value === "string") {
                if (!/^\d{4}-\d{2}-\d{2}/.test(value)) {
                    return value;
                }
            }

            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                return "—";
            }

            return new Intl.DateTimeFormat("en-JO", {
                day: "numeric",
                month: "short"
            }).format(date);
        }

        // =========================
        // ACCESS CONTROL
        // =========================

        function enforceDashboardAccess() {
            if (!auth || !auth.isLoggedIn()) {
                window.location.replace(
                    "../login&register/login.html"
                );
                return false;
            }

            currentUser = auth.getCurrentUser();

            if (!currentUser) {
                window.location.replace(
                    "../login&register/login.html"
                );
                return false;
            }

            if (currentUser.onboardingCompleted !== true) {
                window.location.replace(
                    "../companyOnboarding/companyOnboarding.html"
                );
                return false;
            }

            return true;
        }

        // =========================
        // CURRENT USER
        // =========================

        function getCompanyName() {
            return normalizeText(
                currentUser?.companyName ||
                currentUser?.company ||
                currentUser?.name,
                "Your Company"
            );
        }

        function initializeUser() {
            try {
                currentUser = auth?.getCurrentUser?.() || null;
            } catch (error) {
                console.error("Unable to read current user:", error);
                currentUser = null;
            }

            isPreviewMode = !currentUser;

            if (elements.previewNotice) {
                elements.previewNotice.hidden = !isPreviewMode;
            }

            const companyName = isPreviewMode
                ? "GreenTech Solutions"
                : getCompanyName();

            const initials = getInitials(companyName);

            elements.welcomeCompany.textContent = companyName;

            if (elements.sidebarCompany) {
                elements.sidebarCompany.textContent = companyName;
            }

            if (elements.topbarCompany) {
                elements.topbarCompany.textContent = companyName;
            }

            if (elements.sidebarAvatar) {
                elements.sidebarAvatar.textContent = initials;
            }

            if (elements.topbarAvatar) {
                elements.topbarAvatar.textContent = initials;
            }
        }

        // =========================
        // READ COMPANY LISTINGS
        // =========================

        function getStoredListings() {
            if (
                !storage ||
                typeof storage.getDemoProducts !== "function"
            ) {
                return [];
            }

            try {
                const products = storage.getDemoProducts();

                if (!Array.isArray(products) || !currentUser) {
                    return [];
                }

                return products.filter((product) => {
                    if (!product || typeof product !== "object") {
                        return false;
                    }

                    const ownerId =
                        product.sellerId ??
                        product.userId ??
                        product.companyId ??
                        product.ownerId ??
                        product.createdBy;

                    return ownerId != null &&
                        String(ownerId) === String(currentUser.id);
                });
            } catch (error) {
                console.error("Unable to load company listings:", error);
                return [];
            }
        }

        function normalizeProduct(product) {
            const category = normalizeText(
                product.category || product.productCategory,
                "Other"
            );

            return {
                id: product.id ?? product.productId ?? "",
                title: normalizeText(
                    product.title ||
                    product.name ||
                    product.productName,
                    "Untitled listing"
                ),
                category,
                status: normalizeStatus(product.status),
                views: normalizeNumber(
                    product.views ?? product.viewCount
                ),
                updatedAt: formatDate(
                    product.updatedAt ||
                    product.updated_at ||
                    product.createdAt ||
                    product.created_at
                ),
                image: normalizeText(
                    product.image || product.imageUrl
                ),
                icon: PRODUCT_ICONS[
                    category.toLowerCase()
                ] || "▤"
            };
        }

        function loadListings() {
            currentListings = isPreviewMode
                ? PREVIEW_PRODUCTS.map(normalizeProduct)
                : getStoredListings().map(normalizeProduct);
        }

        // =========================
        // STATISTICS
        // =========================

        function getActiveListings() {
            return currentListings.filter((product) =>
                ["active", "published"].includes(product.status)
            ).length;
        }

        function renderStatistics() {
            elements.activeListings.textContent =
                String(getActiveListings());

            elements.totalViews.textContent =
                currentListings.reduce(
                    (total, product) => total + product.views,
                    0
                ).toLocaleString("en-US");

            // These remain zero until their data structures are implemented.
            elements.quoteRequests.textContent = "0";
            elements.completedDeals.textContent = "0";
            elements.quoteNavCount.textContent = "0";
        }

        // =========================
        // LISTINGS TABLE
        // =========================

        function createCell() {
            return document.createElement("td");
        }

        function isSafeImageUrl(value) {
            try {
                const url = new URL(value, window.location.href);

                return ["http:", "https:", "file:"].includes(
                    url.protocol
                );
            } catch {
                return false;
            }
        }

        function renderListingRow(product) {
            const row = document.createElement("tr");

            const productCell = createCell();
            const productWrapper = document.createElement("div");
            productWrapper.className = "product-cell";

            const thumbnail = document.createElement("span");
            thumbnail.className = "product-thumb";
            thumbnail.setAttribute("aria-hidden", "true");

            if (product.image && isSafeImageUrl(product.image)) {
                const image = document.createElement("img");

                image.src = product.image;
                image.alt = "";
                image.width = 37;
                image.height = 37;
                image.loading = "lazy";
                image.style.objectFit = "cover";
                image.style.borderRadius = "8px";

                thumbnail.appendChild(image);
            } else {
                thumbnail.textContent = product.icon;
            }

            const info = document.createElement("div");
            info.className = "product-info";

            const title = document.createElement("strong");
            title.textContent = product.title;

            const category = document.createElement("span");
            category.textContent = product.category;

            info.append(title, category);
            productWrapper.append(thumbnail, info);
            productCell.appendChild(productWrapper);

            const statusCell = createCell();
            const status = document.createElement("span");

            status.className =
                `status-pill ${STATUS_CLASSES[product.status] || "status-draft"
                }`;

            status.textContent =
                STATUS_LABELS[product.status] || "Draft";

            statusCell.appendChild(status);

            const viewsCell = createCell();
            viewsCell.textContent =
                product.views.toLocaleString("en-US");

            const updatedCell = createCell();
            updatedCell.textContent = product.updatedAt;

            row.append(
                productCell,
                statusCell,
                viewsCell,
                updatedCell
            );

            return row;
        }

        function renderListings(query = "") {
            const normalizedQuery = query.trim().toLowerCase();

            const filteredListings = currentListings
                .filter((product) =>
                    product.title.toLowerCase().includes(normalizedQuery) ||
                    product.category.toLowerCase().includes(normalizedQuery) ||
                    product.status.toLowerCase().includes(normalizedQuery)
                )
                .slice(0, 5);

            elements.listingsBody.replaceChildren();

            elements.listingsEmpty.hidden =
                filteredListings.length > 0;

            elements.listingsBody.closest(".table-scroll").hidden =
                filteredListings.length === 0;

            if (filteredListings.length === 0) return;

            const fragment = document.createDocumentFragment();

            filteredListings.forEach((product) => {
                fragment.appendChild(renderListingRow(product));
            });

            elements.listingsBody.appendChild(fragment);
        }

        // =========================
        // PROFILE COMPLETION
        // =========================

        function renderProfileProgress() {
            if (!currentUser) {
                setProfileProgress(0);
                return;
            }

            const fields = [
                currentUser.companyName,
                currentUser.industry,
                currentUser.companySize,
                currentUser.country,
                currentUser.city,
                currentUser.website,
                currentUser.role,
                currentUser.description
            ];

            const completedFields = fields.filter((value) =>
                typeof value === "string" && value.trim().length > 0
            ).length;

            setProfileProgress(
                Math.round((completedFields / fields.length) * 100)
            );
        }

        function setProfileProgress(progress) {
            elements.profileProgressText.textContent =
                `${progress}% complete`;

            elements.profileProgressBar.setAttribute(
                "aria-valuenow",
                String(progress)
            );

            elements.profileProgressFill.style.width =
                `${progress}%`;

            if (progress >= 100) {
                elements.profileProgressHint.textContent = "All set!";
                elements.profileProgressDescription.textContent =
                    "Your company profile contains all the main details.";
            } else if (progress >= 60) {
                elements.profileProgressHint.textContent = "Almost there";
                elements.profileProgressDescription.textContent =
                    "Add any missing details to help other businesses learn about your company.";
            } else {
                elements.profileProgressHint.textContent = "Getting started";
                elements.profileProgressDescription.textContent =
                    "Complete your company details to build a stronger business profile.";
            }
        }

        // =========================
        // RECENT ACTIVITY
        // =========================

        function renderActivity() {
            elements.activityList.replaceChildren();

            if (!currentListings.length) {
                const empty = document.createElement("div");
                empty.className = "activity-empty";
                empty.textContent =
                    "Your recent activity will appear here as you use Looply.";

                elements.activityList.appendChild(empty);
                return;
            }

            const activities = [...currentListings]
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .slice(0, 3);

            const fragment = document.createDocumentFragment();

            activities.forEach((product, index) => {
                const item = document.createElement("div");
                item.className = "activity-item";

                const timeline = document.createElement("div");
                timeline.className = "activity-timeline";

                const dot = document.createElement("span");
                dot.className = "activity-dot";

                if (index === 1) dot.classList.add("orange");
                if (index === 2) dot.classList.add("purple");

                timeline.appendChild(dot);

                const content = document.createElement("div");
                content.className = "activity-content";

                const title = document.createElement("strong");
                title.textContent = `Listing: ${product.title}`;

                const description = document.createElement("p");
                description.textContent =
                    `Current status: ${STATUS_LABELS[product.status] || "Draft"
                    }`;

                const time = document.createElement("span");
                time.className = "activity-time";
                time.textContent = product.updatedAt;

                content.append(title, description, time);
                item.append(timeline, content);
                fragment.appendChild(item);
            });

            elements.activityList.appendChild(fragment);
        }

        // =========================
        // PAGE NAVIGATION
        // =========================


        // =========================
        // PAGE NAVIGATION
        // =========================

        const availablePages = {
            dashboard: "dashboard",
            home: "home",
            onboarding: "onboarding",
            createListing: "createListing"
        };

        const futurePages = new Set([

        ]);

        function handlePageNavigation(page) {
            // Navigate to pages that already have a route.
            if (availablePages[page]) {
                if (
                    navigation &&
                    typeof navigation.navigateTo === "function"
                ) {
                    navigation.navigateTo(availablePages[page]);
                } else {
                    showToast(
                        "Navigation is not available. Please refresh the page.",
                        "error"
                    );
                }

                return;
            }

            // Keep the existing notices for pages not yet implemented.
            if (futurePages.has(page)) {
                const labels = {
                    myListings: "My Listings",
                    quoteRequests: "Quote Requests",
                    messages: "Messages",
                    deals: "Deals",
                    notifications: "Notifications",
                    companyProfile: "Company Profile",
                    settings: "Settings"
                };

                showToast(
                    `${labels[page]} will be available when we build that page.`,
                    "info"
                );

                return;
            }

            // Support any other routes registered in navigation.js.
            if (
                navigation &&
                typeof navigation.navigateTo === "function"
            ) {
                navigation.navigateTo(page);
                return;
            }

            showToast("This page is not available yet.", "info");
        }

        document.addEventListener("looply:navigate", (event) => {
            const page = event.detail?.page;

            if (page) {
                handlePageNavigation(page);
            }
        });

        // =========================
        // SEARCH
        // =========================

        elements.search?.addEventListener("input", () => {
            renderListings(elements.search.value);
        });

        // =========================
        // INITIALIZE DASHBOARD
        // =========================

        function initializeDashboard() {


            initializeUser();
            loadListings();
            renderStatistics();
            renderListings();
            renderProfileProgress();
            renderActivity();
        }

        if (enforceDashboardAccess()) {
            initializeDashboard();
        }
    })();
});
