
"use strict";

// ==========================================
// 1. SHARED SERVICES AND HTML ELEMENTS
// ==========================================

const storage = window.LooplyStorage;
const auth = window.LooplyAuth;
const constants = window.LooplyConstants;

const listingForm = document.getElementById("listing-form");
const formFeedback = document.getElementById("form-feedback");
const publishButton = document.getElementById("publish-button");

const productNameInput = document.getElementById("product-name");
const categoryInput = document.getElementById("category");
const conditionInput = document.getElementById("condition");
const descriptionInput = document.getElementById("description");
const quantityInput = document.getElementById("quantity");
const unitInput = document.getElementById("unit");
const priceInput = document.getElementById("price");
const minimumOrderInput = document.getElementById("minimum-order");
const countryInput = document.getElementById("listing-country");
const cityInput = document.getElementById("listing-city");
const availabilityInput = document.getElementById("availability");

const productImageInput = document.getElementById("product-image");
const uploadArea = document.getElementById("upload-area");
const imagePreview = document.getElementById("image-preview");
const uploadIcon = document.getElementById("upload-icon");
const uploadTitle = document.getElementById("upload-title");
const uploadDescription = document.getElementById("upload-description");
const removeImageButton = document.getElementById("remove-image");

const descriptionCount = document.getElementById("description-count");
const sidebar = document.getElementById("sidebar");


let currentUser = null;
let selectedImageData = "";
let isSubmitting = false;


// ==========================================
// 2. AUTHENTICATION AND ACCESS
// ==========================================

function enforceListingAccess() {
    if (!auth || !auth.isLoggedIn()) {
        window.location.replace("../login&register/login.html");
        return false;
    }

    currentUser = auth.getCurrentUser();

    if (!currentUser) {
        window.location.replace("../login&register/login.html");
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


// ==========================================
// 3. FEEDBACK MESSAGES
// ==========================================

function showFeedback(message, type = "info") {
    formFeedback.textContent = message;
    formFeedback.className = `form-feedback ${type}`;
    formFeedback.hidden = false;

    formFeedback.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function clearFeedback() {
    formFeedback.textContent = "";
    formFeedback.className = "form-feedback";
    formFeedback.hidden = true;
}

function setFieldError(field, message) {
    field.setAttribute("aria-invalid", "true");
    field.setCustomValidity(message);
}

function clearFieldError(field) {
    field.removeAttribute("aria-invalid");
    field.setCustomValidity("");
}


// ==========================================
// 4. LIVE DESCRIPTION COUNTER
// ==========================================

descriptionInput.addEventListener("input", function () {
    descriptionCount.textContent =
        `${descriptionInput.value.length} / 2000`;

    clearFieldError(descriptionInput);
    clearFeedback();

    updatePreview();
});


// ==========================================
// 5. LIVE LISTING PREVIEW
// ==========================================

function updatePreview() {

    const productName =
        productNameInput.value.trim() || "Your listing title";

    const category =
        categoryInput.value || "Category";

    const description =
        descriptionInput.value.trim() ||
        "Your product description will appear here.";

    const city = countryInput.value.trim() &&
        cityInput.value.trim()
        ? `${cityInput.value.trim()}, ${countryInput.value.trim()}`
        : cityInput.value.trim() ||
        countryInput.value.trim() ||
        "Location";

    const condition =
        conditionInput.value || "Condition";

    const priceValue = priceInput.value;
    const price = priceValue === ""
        ? "JOD 0.00"
        : `JOD ${Number(priceValue).toLocaleString("en-JO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    const unit = unitInput.value || "unit";
    const availability =
        availabilityInput.value || "Availability";

    document.getElementById("preview-title").textContent =
        productName;

    document.getElementById("preview-category").textContent =
        category;

    document.getElementById("preview-description").textContent =
        description;

    document.getElementById("preview-location").textContent =
        city;

    document.getElementById("preview-condition").textContent =
        condition;

    document.getElementById("preview-price").textContent =
        price;

    document.getElementById("preview-unit").textContent =
        `per ${unit}`;

    document.getElementById("preview-availability").textContent =
        availability;

    document.getElementById("preview-company-name").textContent =
        currentUser?.companyName || "Your company";

    const companyInitial =
    (currentUser?.companyName || "L").trim().charAt(0).toUpperCase();


const companyDot = document.querySelector(".company-dot");

if (companyDot) {
    companyDot.textContent = companyInitial;
}
}

[
    productNameInput,
    categoryInput,
    conditionInput,
    quantityInput,
    unitInput,
    priceInput,
    minimumOrderInput,
    countryInput,
    cityInput,
    availabilityInput
].forEach((field) => {
    field.addEventListener("input", () => {
        clearFieldError(field);
        clearFeedback();
        updatePreview();
    });

    field.addEventListener("change", () => {
        clearFieldError(field);
        clearFeedback();
        updatePreview();
    });
});


// ==========================================
// 6. IMAGE COMPRESSION
// ==========================================

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

                canvas.width = Math.max(
                    1,
                    Math.round(image.width * scale)
                );

                canvas.height = Math.max(
                    1,
                    Math.round(image.height * scale)
                );

                const context = canvas.getContext("2d");

                if (!context) {
                    throw new Error("Could not process the image.");
                }

                context.drawImage(
                    image,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                const compressedData = canvas.toDataURL(
                    "image/jpeg",
                    0.78
                );

                URL.revokeObjectURL(objectUrl);
                resolve(compressedData);
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

function showSelectedImage(dataUrl) {
    selectedImageData = dataUrl;

    imagePreview.src = dataUrl;
    imagePreview.hidden = false;

    uploadIcon.hidden = true;
    uploadTitle.textContent = "Image selected";
    uploadDescription.textContent =
        "Your image has been optimized for browser storage.";

    removeImageButton.hidden = false;

    const previewCardImage =
        document.getElementById("preview-card-image");

    const previewPlaceholder =
        document.getElementById("preview-image-placeholder");

    previewCardImage.src = dataUrl;
    previewCardImage.hidden = false;
    previewPlaceholder.hidden = true;
}

function removeSelectedImage() {
    selectedImageData = "";
    productImageInput.value = "";

    imagePreview.removeAttribute("src");
    imagePreview.hidden = true;

    uploadIcon.hidden = false;
    uploadTitle.textContent = "Click to upload an image";
    uploadDescription.textContent =
        "PNG, JPG or WEBP · Maximum 5 MB";

    removeImageButton.hidden = true;

    const previewCardImage =
        document.getElementById("preview-card-image");

    const previewPlaceholder =
        document.getElementById("preview-image-placeholder");

    previewCardImage.removeAttribute("src");
    previewCardImage.hidden = true;
    previewPlaceholder.hidden = false;
}

productImageInput.addEventListener("change", async function () {
    clearFeedback();

    const file = productImageInput.files?.[0];

    if (!file) return;

    const supportedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!supportedTypes.includes(file.type)) {
        showFeedback(
            "Please choose a JPG, PNG, or WEBP image.",
            "error"
        );

        removeSelectedImage();
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showFeedback(
            "The image is larger than 5 MB. Choose a smaller image.",
            "error"
        );

        removeSelectedImage();
        return;
    }

    uploadTitle.textContent = "Processing image...";
    publishButton.disabled = true;

    try {
        const compressedData = await compressImage(file);

        showSelectedImage(compressedData);
    } catch (error) {
        console.error("Image processing failed:", error);

        removeSelectedImage();

        showFeedback(
            "Could not process this image. Please choose another one.",
            "error"
        );
    } finally {
        publishButton.disabled = false;
    }
});

removeImageButton.addEventListener("click", function () {
    removeSelectedImage();
    clearFeedback();
});


// ==========================================
// 7. VALIDATION
// ==========================================

function validateListing() {
    const requiredFields = [
        productNameInput,
        categoryInput,
        conditionInput,
        descriptionInput,
        quantityInput,
        unitInput,
        priceInput,
        countryInput,
        cityInput,
        availabilityInput
    ];

    let firstInvalidField = null;

    requiredFields.forEach((field) => {
        clearFieldError(field);

        if (!field.checkValidity()) {
            const message = field.validity.valueMissing
                ? "This field is required."
                : field.validity.rangeUnderflow
                    ? "The value must be greater than or equal to the minimum."
                    : field.validity.rangeOverflow
                        ? "The value exceeds the permitted maximum."
                        : field.validity.stepMismatch
                            ? "Enter a valid numeric value."
                            : field.validity.tooShort
                                ? "Please provide more details."
                                : "Please enter a valid value.";

            setFieldError(field, message);

            if (!firstInvalidField) {
                firstInvalidField = field;
            }
        }
    });

    const minimumOrder = minimumOrderInput.value.trim();
    const quantity = Number(quantityInput.value);

    clearFieldError(minimumOrderInput);

    if (
        minimumOrder &&
        (
            !Number.isFinite(Number(minimumOrder)) ||
            Number(minimumOrder) <= 0 ||
            Number(minimumOrder) > quantity
        )
    ) {
        setFieldError(
            minimumOrderInput,
            "Minimum order must be greater than 0 and no more than the available quantity."
        );

        if (!firstInvalidField) {
            firstInvalidField = minimumOrderInput;
        }
    }

    if (descriptionInput.value.trim().length < 20) {
        setFieldError(
            descriptionInput,
            "Please provide a description of at least 20 characters."
        );

        if (!firstInvalidField) {
            firstInvalidField = descriptionInput;
        }
    }

    if (productNameInput.value.trim().length > 120) {
        setFieldError(
            productNameInput,
            "The listing title must not exceed 120 characters."
        );

        if (!firstInvalidField) {
            firstInvalidField = productNameInput;
        }
    }

    if (firstInvalidField) {
        showFeedback(
            "Please review the highlighted fields before creating your listing.",
            "error"
        );

        firstInvalidField.focus();
        firstInvalidField.reportValidity();

        return false;
    }

    return true;
}


// ==========================================
// 9. CREATE LISTING OBJECT
// ==========================================

function createListingData() {
    const now = new Date().toISOString();

    const quantity = Number(quantityInput.value);
    const minimumOrderValue = minimumOrderInput.value.trim();

    const minimumOrder = minimumOrderValue
        ? Number(minimumOrderValue)
        : null;

    const id = (
        window.crypto?.randomUUID?.() ||
        `listing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );

    return {
        id,

        // Ownership identifiers for future dashboard integration.
        sellerId: currentUser.id,
        companyId: currentUser.id,
        ownerId: currentUser.id,
        userId: currentUser.id,

        companyName: currentUser.companyName || "",
        sellerName: currentUser.companyName || "",

        // Product information.
        title: productNameInput.value.trim(),
        name: productNameInput.value.trim(),
        productName: productNameInput.value.trim(),

        category: categoryInput.value,
        condition: conditionInput.value,
        description: descriptionInput.value.trim(),

        quantity,
        unit: unitInput.value,
        price: Number(priceInput.value),
        currency: "JOD",
        minimumOrder,

        country: countryInput.value.trim(),
        city: cityInput.value.trim(),
        location: `${cityInput.value.trim()}, ${countryInput.value.trim()}`,

        availability: availabilityInput.value,

        // This is a local demo listing, not a remotely published offer.
        status: "active",
        image: selectedImageData || "",
        imageUrl: "",

        createdAt: now,
        updatedAt: now
    };
}


// ==========================================
// 10. SUBMIT AND SAVE LISTING
// ==========================================

listingForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (isSubmitting) return;

    clearFeedback();

    if (!validateListing()) return;

    if (!auth?.isLoggedIn()) {
        window.location.replace("../login&register/login.html");
        return;
    }

    currentUser = auth.getCurrentUser();

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

    isSubmitting = true;
    publishButton.disabled = true;

    const buttonLabel = publishButton.querySelector("span");

    if (buttonLabel) {
        buttonLabel.textContent = "Creating listing...";
    }

    try {


        const listing = createListingData();

        const saved = storage.addDemoProduct(listing);

        // تحقق من وجود الإعلان في التخزين بعد محاولة الحفظ
        const productsAfterSave = storage.getDemoProducts();

        const listingExists = productsAfterSave.some(
            (product) => product.id === listing.id
        );

        if (!saved && !listingExists) {
            throw new Error(
                "Saving failed. Browser storage may be full or unavailable."
            );
        }

        // الإعلان موجود في التخزين؛ اعرض رسالة نجاح
        showFeedback(
            "Your listing was saved successfully.",
            "success"
        );

        listingForm.reset();
        removeSelectedImage();

        descriptionCount.textContent = "0 / 2000";

        clearAllFieldErrors();
        updatePreview();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {
        console.error("Could not save listing:", error);

        showFeedback(
            "The listing could not be saved. Browser storage may be full. Try a smaller image or remove some demo data, then try again.",
            "error"
        );
    } finally {
        isSubmitting = false;
        publishButton.disabled = false;

        if (buttonLabel) {
            buttonLabel.textContent = "Create listing";
        }
    }
});

function clearAllFieldErrors() {
    [
        productNameInput,
        categoryInput,
        conditionInput,
        descriptionInput,
        quantityInput,
        unitInput,
        priceInput,
        minimumOrderInput,
        countryInput,
        cityInput,
        availabilityInput
    ].forEach(clearFieldError);
}


// ==========================================
// 12. TEMPORARY NAVIGATION PLACEHOLDERS
// ==========================================

document.querySelectorAll(".coming-soon").forEach((link) => {
    link.addEventListener("click", function (event) {
        event.preventDefault();

        const feature = link.dataset.feature || "This feature";

        showFeedback(
            `${feature} will be available when that page is implemented.`,
            "info"
        );

        document.getElementById("sidebar")?.classList.remove("is-open");
        document.getElementById("sidebar-overlay")?.classList.remove("is-visible");
    });
});


// ==========================================
// 13. INITIALIZATION
// ==========================================

function initializeCreateListing() {
    if (!storage || !auth || !constants) {
        showFeedback(
            "Looply services could not load. Please refresh the page.",
            "error"
        );
        return;
    }

    if (!enforceListingAccess()) return;

    countryInput.value = currentUser.country || "Jordan";
    cityInput.value = currentUser.city || "";

    updatePreview();
}

initializeCreateListing();
