"use strict";

// ========================================
// MY LISTINGS
// ========================================

const MyListingsPage = (() => {
    const PAGE_SIZE = 8;

    const state = {
        allListings: [],
        filteredListings: [],
        currentPage: 1,
        searchQuery: "",
        status: "all",
        sort: "newest",
        currentUser: null,
        isPreview: false,
        loadFailed: false
    };

    const elements = {};

    // ========================================
    // INITIALIZATION
    // ========================================

    function init() {
        cacheElements();
        bindEvents();
        loadListings();
    }

    function cacheElements() {
        const ids = [
            "preview-notice",
            "total-listings",
            "active-listings",
            "draft-listings",
            "inactive-listings",
            "visible-listings-count",
            "listing-search",
            "clear-search",
            "listing-status-filter",
            "listing-sort",
            "my-listings-body",
            "listings-loading",
            "listings-table-container",
            "listings-empty",
            "empty-state-title",
            "empty-state-description",
            "listings-error",
            "listings-error-message",
            "retry-load-listings",
            "listings-pagination",
            "pagination-info",
            "pagination-current",
            "previous-page",
            "next-page",
            "tab-count-all",
            "tab-count-active",
            "tab-count-draft",
            "tab-count-inactive",
            "current-year",
            "toast-container"
        ];

        ids.forEach((id) => {
            elements[id] = document.getElementById(id);
        });
    }

    function bindEvents() {
        elements["listing-search"].addEventListener("input", (event) => {
            state.searchQuery = event.target.value.trim().toLowerCase();
            state.currentPage = 1;

            elements["clear-search"].hidden = !event.target.value;

            applyFilters();
        });

        elements["clear-search"].addEventListener("click", () => {
            elements["listing-search"].value = "";
            state.searchQuery = "";
            state.currentPage = 1;

            elements["clear-search"].hidden = true;

            applyFilters();
            elements["listing-search"].focus();
        });

        elements["listing-status-filter"].addEventListener("change", (event) => {
            state.status = event.target.value;
            state.currentPage = 1;

            updateActiveTab();
            applyFilters();
        });

        elements["listing-sort"].addEventListener("change", (event) => {
            state.sort = event.target.value;
            state.currentPage = 1;

            applyFilters();
        });

        document.querySelectorAll(".listing-tab").forEach((tab) => {
            tab.addEventListener("click", () => {
                state.status = tab.dataset.status;
                state.currentPage = 1;

                elements["listing-status-filter"].value = state.status;

                updateActiveTab();
                applyFilters();
            });
        });

        elements["previous-page"].addEventListener("click", () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                renderListings();
            }
        });

        elements["next-page"].addEventListener("click", () => {
            const totalPages = getTotalPages();

            if (state.currentPage < totalPages) {
                state.currentPage++;
                renderListings();
            }
        });

        elements["retry-load-listings"].addEventListener("click", loadListings);

        elements["my-listings-body"].addEventListener("click", handleTableAction);

        // Use the project's existing navigation system.
        document.querySelectorAll('[data-page="createListing"]').forEach((button) => {
            button.addEventListener("click", () => {
                navigateTo("createListing");
            });
        });

        // Ensure the shared sidebar and header are not replaced here.
    }

    // ========================================
    // LOAD DATA
    // ========================================

    function loadListings() {
        showLoading();
        state.loadFailed = false;

        try {
            if (!window.LooplyStorage ||
                typeof window.LooplyStorage.getDemoProducts !== "function") {
                throw new Error("The LooplyStorage product service is unavailable.");
            }

            state.currentUser = getCurrentUser();

            const products = window.LooplyStorage.getDemoProducts();

            if (!Array.isArray(products)) {
                throw new Error("The product storage returned invalid data.");
            }

            state.isPreview = !state.currentUser;

            elements["preview-notice"].hidden = !state.isPreview;

            state.allListings = products.filter(isOwnedByCurrentUser);

            // Newest first is the default ordering.
            state.sort = elements["listing-sort"].value || "newest";

            updateStatistics();
            updateTabCounts();
            applyFilters();

        } catch (error) {
            console.error("My Listings: failed to load products.", error);

            state.loadFailed = true;

            elements["listings-loading"].hidden = true;
            elements["listings-table-container"].hidden = true;
            elements["listings-empty"].hidden = true;
            elements["listings-pagination"].hidden = true;
            elements["listings-error"].hidden = false;

            elements["listings-error-message"].textContent =
                "Your listings could not be loaded. Please try again.";

            showToast("Unable to load your listings.", "error");
        }
    }

    function getCurrentUser() {
        // Adapt to the existing authentication API without inventing a new one.
        if (window.LooplyAuth) {
            if (typeof window.LooplyAuth.getCurrentUser === "function") {
                return window.LooplyAuth.getCurrentUser();
            }

            if (typeof window.LooplyAuth.getUser === "function") {
                return window.LooplyAuth.getUser();
            }

            if (window.LooplyAuth.currentUser) {
                return window.LooplyAuth.currentUser;
            }
        }

        // Fallback for projects that expose the current user on window.
        if (window.currentUser) {
            return window.currentUser;
        }

        return null;
    }

    function isOwnedByCurrentUser(product) {
        if (!product || typeof product !== "object") {
            return false;
        }

        if (!state.currentUser || state.currentUser.id == null) {
            // Do not expose all companies' products in preview mode.
            return false;
        }

        const userId = String(state.currentUser.id);

        const ownerFields = [
            product.sellerId,
            product.userId,
            product.companyId,
            product.ownerId,
            product.createdBy
        ];

        return ownerFields.some((ownerId) => {
            return ownerId != null && String(ownerId) === userId;
        });
    }

    // ========================================
    // STATUS HELPERS
    // ========================================

    function normalizeStatus(product) {
        const rawStatus = String(product.status || "active")
            .trim()
            .toLowerCase();

        if (["active", "published", "available", "live"].includes(rawStatus)) {
            return "active";
        }

        if (["draft", "pending"].includes(rawStatus)) {
            return "draft";
        }

        if (
            ["inactive", "paused", "unavailable", "archived", "disabled"]
                .includes(rawStatus)
        ) {
            return "inactive";
        }

        return "inactive";
    }

    function updateStatistics() {
        const total = state.allListings.length;
        const active = state.allListings.filter(
            (product) => normalizeStatus(product) === "active"
        ).length;
        const drafts = state.allListings.filter(
            (product) => normalizeStatus(product) === "draft"
        ).length;
        const inactive = state.allListings.filter(
            (product) => normalizeStatus(product) === "inactive"
        ).length;

        elements["total-listings"].textContent = total;
        elements["active-listings"].textContent = active;
        elements["draft-listings"].textContent = drafts;
        elements["inactive-listings"].textContent = inactive;
    }

    function updateTabCounts() {
        elements["tab-count-all"].textContent = state.allListings.length;

        elements["tab-count-active"].textContent =
            state.allListings.filter(
                (product) => normalizeStatus(product) === "active"
            ).length;

        elements["tab-count-draft"].textContent =
            state.allListings.filter(
                (product) => normalizeStatus(product) === "draft"
            ).length;

        elements["tab-count-inactive"].textContent =
            state.allListings.filter(
                (product) => normalizeStatus(product) === "inactive"
            ).length;
    }

    function updateActiveTab() {
        document.querySelectorAll(".listing-tab").forEach((tab) => {
            const isActive = tab.dataset.status === state.status;

            tab.classList.toggle("active", isActive);
            tab.setAttribute("aria-pressed", String(isActive));
        });
    }

    // ========================================
    // SEARCH, FILTER AND SORT
    // ========================================

    function applyFilters() {
        let results = [...state.allListings];

        if (state.status !== "all") {
            results = results.filter(
                (product) => normalizeStatus(product) === state.status
            );
        }

        if (state.searchQuery) {
            results = results.filter((product) => {
                const searchableText = [
                    product.title,
                    product.name,
                    product.productName,
                    product.category,
                    product.description
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchableText.includes(state.searchQuery);
            });
        }

        results.sort(getSortComparator());

        state.filteredListings = results;

        const totalPages = getTotalPages();

        if (state.currentPage > totalPages) {
            state.currentPage = totalPages;
        }

        renderListings();
    }

    function getSortComparator() {
        switch (state.sort) {
            case "oldest":
                return (a, b) => getTimestamp(a) - getTimestamp(b);

            case "name-asc":
                return (a, b) => getProductName(a).localeCompare(
                    getProductName(b)
                );

            case "name-desc":
                return (a, b) => getProductName(b).localeCompare(
                    getProductName(a)
                );

            case "price-low":
                return (a, b) => getPrice(a) - getPrice(b);

            case "price-high":
                return (a, b) => getPrice(b) - getPrice(a);

            case "newest":
            default:
                return (a, b) => getTimestamp(b) - getTimestamp(a);
        }
    }

    // ========================================
    // RENDER LISTINGS
    // ========================================

    function renderListings() {
        elements["listings-loading"].hidden = true;
        elements["listings-error"].hidden = true;

        const results = state.filteredListings;
        const total = results.length;

        elements["visible-listings-count"].textContent =
            `${total} ${total === 1 ? "product" : "products"}`;

        if (total === 0) {
            elements["listings-table-container"].hidden = true;
            elements["listings-pagination"].hidden = true;
            elements["listings-empty"].hidden = false;

            renderEmptyState();
            return;
        }

        elements["listings-empty"].hidden = true;
        elements["listings-table-container"].hidden = false;

        const totalPages = getTotalPages();
        const startIndex = (state.currentPage - 1) * PAGE_SIZE;
        const pageItems = results.slice(startIndex, startIndex + PAGE_SIZE);

        elements["my-listings-body"].innerHTML = pageItems
            .map(renderListingRow)
            .join("");

        renderPagination(total, totalPages, startIndex, pageItems.length);
    }

    function renderListingRow(product) {
        const id = product.id == null ? "" : String(product.id);
        const name = getProductName(product);
        const category = product.category || "Uncategorized";
        const quantity = formatQuantity(product);
        const price = formatPrice(product);
        const status = normalizeStatus(product);
        const statusLabel = capitalize(status);
        const updated = formatDate(product.updatedAt || product.createdAt);
        const image = getProductImage(product);

        const imageMarkup = image
            ? `<img class="listing-product-image"
                    src="${escapeAttribute(image)}"
                    alt="${escapeAttribute(name)}"
                    loading="lazy"
                    onerror="this.hidden=true;this.nextElementSibling.hidden=false">
               <span class="listing-product-placeholder" hidden aria-hidden="true">▤</span>`
            : `<span class="listing-product-placeholder" aria-hidden="true">▤</span>`;

        return `
            <tr>
                <td>
                    <div class="listing-product-cell">
                        ${imageMarkup}
                        <div class="listing-product-info">
                            <p class="listing-product-name"
                               title="${escapeAttribute(name)}">
                                ${escapeHTML(name)}
                            </p>
                            <p class="listing-product-meta">
                                ID: ${escapeHTML(id || "N/A")}
                            </p>
                        </div>
                    </div>
                </td>

                <td>${escapeHTML(category)}</td>

                <td>${escapeHTML(quantity)}</td>

                <td>
                    <div class="listing-price">${escapeHTML(price)}</div>
                </td>

                <td>
                    <span class="listing-status listing-status-${status}">
                        ${escapeHTML(statusLabel)}
                    </span>
                </td>

                <td>${escapeHTML(updated)}</td>

                <td>
                    <div class="listing-actions">
                        <button
                            class="listing-action-btn"
                            type="button"
                            data-action="edit"
                            data-id="${escapeAttribute(id)}"
                            aria-label="Edit ${escapeAttribute(name)}"
                            title="Edit listing"
                        >Edit</button>

                        <button
                            class="listing-action-btn listing-action-delete"
                            type="button"
                            data-action="delete"
                            data-id="${escapeAttribute(id)}"
                            aria-label="Delete ${escapeAttribute(name)}"
                            title="Delete listing"
                        >×</button>
                    </div>
                </td>
            </tr>
        `;
    }

    function renderEmptyState() {
        const hasFilters =
            Boolean(state.searchQuery) || state.status !== "all";

        if (state.allListings.length === 0) {
            elements["empty-state-title"].textContent = "No listings yet";

            elements["empty-state-description"].textContent =
                "Start listing your surplus products to connect with other businesses on Looply.";

            elements["empty-state-add-btn"].hidden = false;

            return;
        }

        if (hasFilters) {
            elements["empty-state-title"].textContent = "No matching listings";

            elements["empty-state-description"].textContent =
                "Try changing your search or selecting a different status.";

            elements["empty-state-add-btn"].hidden = true;

            return;
        }

        elements["empty-state-title"].textContent = "No listings found";

        elements["empty-state-description"].textContent =
            "There are no products to display right now.";

        elements["empty-state-add-btn"].hidden = false;
    }

    function renderPagination(total, totalPages, startIndex, visibleCount) {
        const hasMultiplePages = totalPages > 1;

        elements["listings-pagination"].hidden = !hasMultiplePages;

        elements["pagination-info"].textContent =
            `Showing ${startIndex + 1}-${startIndex + visibleCount} of ${total} products`;

        elements["pagination-current"].textContent =
            `${state.currentPage} / ${totalPages}`;

        elements["previous-page"].disabled = state.currentPage <= 1;
        elements["next-page"].disabled = state.currentPage >= totalPages;
    }

    function getTotalPages() {
        return Math.max(1, Math.ceil(state.filteredListings.length / PAGE_SIZE));
    }

    // ========================================
    // TABLE ACTIONS
    // ========================================

    function handleTableAction(event) {
        const button = event.target.closest("button[data-action]");

        if (!button) {
            return;
        }

        const productId = button.dataset.id;
        const action = button.dataset.action;

        if (!productId) {
            showToast("This listing does not have a valid ID.", "error");
            return;
        }

        if (action === "edit") {
            editListing(productId);
        } else if (action === "delete") {
            deleteListing(productId);
        }
    }

   
function editListing(productId) {
    const product = state.allListings.find(
        (item) => String(item.id) === String(productId)
    );

    if (!product) {
        showToast("The selected listing could not be found.", "error");
        return;
    }

    const editRoute = window.LooplyNavigation?.getRoute("editListing");

    if (!editRoute) {
        showToast("The edit page route is unavailable.", "error");
        return;
    }

    const url = new URL(editRoute);
    url.searchParams.set("id", String(product.id));

    window.location.href = url.href;
}


    function deleteListing(productId) {
        const product = state.allListings.find(
            (item) => String(item.id) === String(productId)
        );

        if (!product) {
            showToast("The selected listing could not be found.", "error");
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to delete "${getProductName(product)}"? This action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        try {
            if (!window.LooplyStorage ||
                typeof window.LooplyStorage.deleteDemoProduct !== "function") {
                throw new Error("The product deletion service is unavailable.");
            }

            const deleted = window.LooplyStorage.deleteDemoProduct(productId);

            if (deleted === false) {
                throw new Error("The product could not be deleted.");
            }

            state.allListings = state.allListings.filter(
                (item) => String(item.id) !== String(productId)
            );

            updateStatistics();
            updateTabCounts();
            applyFilters();

            showToast("Listing deleted successfully.", "success");

        } catch (error) {
            console.error("My Listings: failed to delete product.", error);

            showToast(
                "Unable to delete this listing. Please try again.",
                "error"
            );
        }
    }

    // ========================================
    // DATA FORMATTERS
    // ========================================

    function getProductName(product) {
        return String(
            product.title ||
            product.name ||
            product.productName ||
            "Untitled product"
        );
    }

    function getProductImage(product) {
        const image = product.image || product.imageUrl || "";

        if (typeof image !== "string") {
            return "";
        }

        // Only allow data URLs and HTTP(S) URLs for product images.
        if (
            image.startsWith("data:image/") ||
            /^https?:\/\//i.test(image)
        ) {
            return image;
        }

        return "";
    }

    function getPrice(product) {
        const value = Number(product.price);

        return Number.isFinite(value) ? value : 0;
    }

    function formatPrice(product) {
        const price = getPrice(product);
        const currency = product.currency || "JOD";

        return `${price.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        })} ${currency}`;
    }

    function formatQuantity(product) {
        const quantity = product.quantity;

        if (quantity == null || quantity === "") {
            return "—";
        }

        const unit = product.unit ? ` ${product.unit}` : "";

        return `${Number(quantity).toLocaleString()}${unit}`;
    }

    function getTimestamp(product) {
        const date = new Date(product.updatedAt || product.createdAt || 0);
        const timestamp = date.getTime();

        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString("en", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function capitalize(value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    // ========================================
    // SECURITY HELPERS
    // ========================================

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, (character) => {
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

    function escapeAttribute(value) {
        return escapeHTML(value);
    }

    // ========================================
    // UI HELPERS
    // ========================================

    function showLoading() {
        elements["listings-loading"].hidden = false;
        elements["listings-table-container"].hidden = true;
        elements["listings-empty"].hidden = true;
        elements["listings-error"].hidden = true;
        elements["listings-pagination"].hidden = true;
    }

    

    function navigateTo(page) {
        if (
            window.LooplyNavigation &&
            typeof window.LooplyNavigation.navigateTo === "function"
        ) {
            window.LooplyNavigation.navigateTo(page);
            return;
        }

        showToast("Navigation is currently unavailable.", "error");
    }

    function showToast(message, type = "info") {
        // Use an existing shared toast helper if one is available.
        if (window.LooplyUI &&
            typeof window.LooplyUI.showToast === "function") {
            window.LooplyUI.showToast(message, type);
            return;
        }

        const container = elements["toast-container"];

        if (!container) {
            console.info(message);
            return;
        }

        const toast = document.createElement("div");

        toast.className = `looply-toast looply-toast-${type}`;
        toast.textContent = message;
        toast.setAttribute("role", "status");

        Object.assign(toast.style, {
            padding: "12px 16px",
            marginTop: "10px",
            background: "#24382b",
            color: "#ffffff",
            borderRadius: "10px",
            boxShadow: "0 5px 18px rgb(0 0 0 / 12%)",
            fontSize: "14px",
            maxWidth: "360px"
        });

        container.appendChild(toast);

        window.setTimeout(() => {
            toast.remove();
        }, 3500);
    }

    return { init };
})();

// Wait until the HTML has loaded. Deferred scripts execute before DOMContentLoaded.
document.addEventListener("DOMContentLoaded", MyListingsPage.init);
