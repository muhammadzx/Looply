
"use strict";

// ========================================
// LOOPLY - EDIT LISTING
// ========================================

const storage = window.LooplyStorage;
const auth = window.LooplyAuth;

const form = document.getElementById("edit-listing-form");
const feedback = document.getElementById("edit-feedback");
const loading = document.getElementById("edit-loading");
const errorPanel = document.getElementById("edit-error");
const errorMessage = document.getElementById("edit-error-message");
const saveButton = document.getElementById("save-changes");

const fields = {
    title: document.getElementById("product-name"),
    category: document.getElementById("category"),
    condition: document.getElementById("condition"),
    description: document.getElementById("description"),
    quantity: document.getElementById("quantity"),
    unit: document.getElementById("unit"),
    price: document.getElementById("price"),
    minimumOrder: document.getElementById("minimum-order"),
    country: document.getElementById("listing-country"),
    city: document.getElementById("listing-city"),
    availability: document.getElementById("availability")
};

const imageInput = document.getElementById("product-image");
const currentImage = document.getElementById("current-image");
const noImage = document.getElementById("no-image");
const removeImageCheckbox = document.getElementById("remove-image");
const descriptionCount = document.getElementById("description-count");

const listingId = new URLSearchParams(window.location.search).get("id");

let currentUser = null;
let originalListing = null;
let selectedImageData = "";
let isSaving = false;

// ========================================
// FEEDBACK AND PAGE STATES
// ========================================

function showFeedback(message, type = "info") {
    feedback.textContent = message;
    feedback.className = `edit-feedback ${type}`;
    feedback.hidden = false;

    feedback.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function showPageError(message) {
    loading.hidden = true;
    form.hidden = true;
    errorPanel.hidden = false;
    errorMessage.textContent = message;
}

function getCurrentUser() {
    if (typeof auth?.getCurrentUser === "function") {
        return auth.getCurrentUser();
    }

    return null;
}

function isOwnedByCurrentUser(product) {
    if (!product || !currentUser || currentUser.id == null) {
        return false;
    }

    const userId = String(currentUser.id);

    return [
        product.sellerId,
        product.companyId,
        product.ownerId,
        product.userId,
        product.createdBy
    ].some((id) => id != null && String(id) === userId);
}

// ========================================
// LOAD LISTING
// ========================================

function loadListing() {
    if (!listingId) {
        showPageError("No listing ID was provided. Open Edit from My Listings.");
        return;
    }

    if (!storage || !auth) {
        showPageError("Looply services could not load. Please refresh the page.");
        return;
    }

    if (typeof auth.isLoggedIn !== "function" || !auth.isLoggedIn()) {
        window.location.replace("../login&register/login.html");
        return;
    }

    currentUser = getCurrentUser();

    if (!currentUser) {
        window.location.replace("../login&register/login.html");
        return;
    }

    if (currentUser.onboardingCompleted !== true) {
        window.location.replace(
            "../companyOnboarding/companyOnboarding.html"
        );
        return;
    }

    const products = storage.getDemoProducts();

    originalListing = products.find(
        (product) => String(product.id) === String(listingId)
    );

    if (!originalListing) {
        showPageError("This listing no longer exists or could not be found.");
        return;
    }

    if (!isOwnedByCurrentUser(originalListing)) {
        showPageError("You do not have permission to edit this listing.");
        return;
    }

    populateForm(originalListing);

    loading.hidden = true;
    form.hidden = false;
}

// ========================================
// POPULATE FORM
// ========================================

function populateForm(product) {
    fields.title.value =
        product.title || product.name || product.productName || "";

    fields.category.value = product.category || "";
    fields.condition.value = product.condition || "";
    fields.description.value = product.description || "";
    fields.quantity.value = product.quantity ?? "";
    fields.unit.value = product.unit || "";
    fields.price.value = product.price ?? "";
    fields.minimumOrder.value = product.minimumOrder ?? "";
    fields.country.value = product.country || "";
    fields.city.value = product.city || "";
    fields.availability.value = product.availability || "";

    descriptionCount.textContent =
        `${fields.description.value.length} / 2000`;

    const image = product.image || product.imageUrl || "";

    if (typeof image === "string" && image.startsWith("data:image/")) {
        currentImage.src = image;
        currentImage.hidden = false;
        noImage.hidden = true;
    } else if (
        typeof image === "string" &&
        /^https?:\/\//i.test(image)
    ) {
        currentImage.src = image;
        currentImage.hidden = false;
        noImage.hidden = true;
    } else {
        currentImage.removeAttribute("src");
        currentImage.hidden = true;
        noImage.hidden = false;
    }
}

// ========================================
// IMAGE HANDLING
// ========================================

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = function () {
            try {
                const maxDimension = 1000;
                const scale = Math.min(
                    1,
                    maxDimension / Math.max(image.width, image.height)
                );

                const canvas = document.createElement("canvas");

                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));

                const context = canvas.getContext("2d");

                if (!context) {
                    throw new Error("Could not process the selected image.");
                }

                context.drawImage(
                    image,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                const data = canvas.toDataURL("image/jpeg", 0.78);

                URL.revokeObjectURL(objectUrl);
                resolve(data);
            } catch (error) {
                URL.revokeObjectURL(objectUrl);
                reject(error);
            }
        };

        image.onerror = function () {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("The selected image could not be opened."));
        };

        image.src = objectUrl;
    });
}

imageInput.addEventListener("change", async function () {
    feedback.hidden = true;

    const file = imageInput.files?.[0];

    if (!file) {
        selectedImageData = "";
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        showFeedback("Choose a JPG, PNG, or WEBP image.", "error");
        imageInput.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showFeedback("The image must be smaller than 5 MB.", "error");
        imageInput.value = "";
        return;
    }

    saveButton.disabled = true;

    try {
        selectedImageData = await compressImage(file);

        currentImage.src = selectedImageData;
        currentImage.hidden = false;
        noImage.hidden = true;

        removeImageCheckbox.checked = false;

        showFeedback("New image selected. Save changes to apply it.", "info");
    } catch (error) {
        console.error("Edit listing: image processing failed.", error);
        selectedImageData = "";
        imageInput.value = "";

        showFeedback("Could not process the image. Please try another one.", "error");
    } finally {
        saveButton.disabled = false;
    }
});

removeImageCheckbox.addEventListener("change", function () {
    if (removeImageCheckbox.checked) {
        selectedImageData = "";
        imageInput.value = "";
        currentImage.removeAttribute("src");
        currentImage.hidden = true;
        noImage.hidden = false;
    } else if (originalListing) {
        const originalImage =
            originalListing.image || originalListing.imageUrl || "";

        if (originalImage) {
            currentImage.src = originalImage;
            currentImage.hidden = false;
            noImage.hidden = true;
        }
    }
});

// ========================================
// DESCRIPTION COUNTER
// ========================================

fields.description.addEventListener("input", function () {
    descriptionCount.textContent =
        `${fields.description.value.length} / 2000`;
});

// ========================================
// VALIDATION
// ========================================

function validateForm() {
    form.querySelectorAll("[aria-invalid='true']").forEach((field) => {
        field.removeAttribute("aria-invalid");
        field.setCustomValidity("");
    });

    let firstInvalid = null;

    Object.values(fields).forEach((field) => {
        if (!field.checkValidity()) {
            field.setAttribute("aria-invalid", "true");

            if (!firstInvalid) {
                firstInvalid = field;
            }
        }
    });

    const title = fields.title.value.trim();
    const description = fields.description.value.trim();
    const quantity = Number(fields.quantity.value);
    const minimumValue = fields.minimumOrder.value.trim();

    if (title.length === 0 || title.length > 120) {
        fields.title.setCustomValidity(
            "Enter a title between 1 and 120 characters."
        );
        fields.title.setAttribute("aria-invalid", "true");
        firstInvalid ||= fields.title;
    }

    if (description.length < 20) {
        fields.description.setCustomValidity(
            "Description must contain at least 20 characters."
        );
        fields.description.setAttribute("aria-invalid", "true");
        firstInvalid ||= fields.description;
    }

    if (
        minimumValue &&
        (
            !Number.isFinite(Number(minimumValue)) ||
            Number(minimumValue) <= 0 ||
            Number(minimumValue) > quantity
        )
    ) {
        fields.minimumOrder.setCustomValidity(
            "Minimum order must be greater than zero and no more than the available quantity."
        );
        fields.minimumOrder.setAttribute("aria-invalid", "true");
        firstInvalid ||= fields.minimumOrder;
    }

    if (firstInvalid) {
        showFeedback("Please review the highlighted fields.", "error");
        firstInvalid.focus();
        firstInvalid.reportValidity();
        return false;
    }

    return true;
}

// ========================================
// SAVE CHANGES
// ========================================

form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (isSaving || !originalListing) {
        return;
    }

    if (!validateForm()) {
        return;
    }

    // Re-read storage and verify ownership immediately before updating.
    const latestProducts = storage.getDemoProducts();

    const latestListing = latestProducts.find(
        (product) => String(product.id) === String(listingId)
    );

    if (!latestListing || !isOwnedByCurrentUser(latestListing)) {
        showFeedback(
            "This listing is no longer available to edit.",
            "error"
        );
        return;
    }

    isSaving = true;
    saveButton.disabled = true;
    saveButton.textContent = "Saving changes...";

    try {
        let image = latestListing.image || latestListing.imageUrl || "";

        if (removeImageCheckbox.checked) {
            image = "";
        } else if (selectedImageData) {
            image = selectedImageData;
        }

        const title = fields.title.value.trim();
        const description = fields.description.value.trim();
        const quantity = Number(fields.quantity.value);
        const minimumOrderValue = fields.minimumOrder.value.trim();

        const updates = {
            // Keep aliases synchronized for existing pages.
            title,
            name: title,
            productName: title,

            category: fields.category.value,
            condition: fields.condition.value,
            description,

            quantity,
            unit: fields.unit.value,
            price: Number(fields.price.value),
            currency: latestListing.currency || "JOD",
            minimumOrder: minimumOrderValue
                ? Number(minimumOrderValue)
                : null,

            country: fields.country.value.trim(),
            city: fields.city.value.trim(),
            location:
                `${fields.city.value.trim()}, ${fields.country.value.trim()}`,

            availability: fields.availability.value,

            image,
            imageUrl: "",

            // Preserve original identity, ownership, status and creation date.
            id: latestListing.id,
            sellerId: latestListing.sellerId,
            companyId: latestListing.companyId,
            ownerId: latestListing.ownerId,
            userId: latestListing.userId,
            createdBy: latestListing.createdBy,
            createdAt: latestListing.createdAt,
            status: latestListing.status || "active",

            updatedAt: new Date().toISOString()
        };

        const saved = storage.updateDemoProduct(
            latestListing.id,
            updates
        );

        const savedListing = storage.getDemoProducts().find(
            (product) => String(product.id) === String(listingId)
        );

        if (!saved || !savedListing) {
            throw new Error("The updated listing could not be verified.");
        }

        showFeedback(
            "Your listing has been updated successfully.",
            "success"
        );

        saveButton.textContent = "Changes saved";

        window.setTimeout(() => {
            window.location.href = "myListings.html";
        }, 900);

    } catch (error) {
        console.error("Edit listing: could not save changes.", error);

        showFeedback(
            "Could not save your changes. Browser storage may be full. Try removing the image or choosing a smaller one.",
            "error"
        );

        isSaving = false;
        saveButton.disabled = false;
        saveButton.textContent = "Save changes";
    }
});

// ========================================
// INITIALIZE
// ========================================

loadListing();
