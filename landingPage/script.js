
"use strict";

// =============================================
// LOOPLY LANDING PAGE
// Vanilla JavaScript
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    // =============================================
    // 1. ELEMENTS
    // =============================================

    const header = document.getElementById("header");

    const menuToggle = document.querySelector(".menu-toggle");
    const navMenu = document.getElementById("nav-menu");
    const navLinks = document.querySelectorAll(".nav-link");

    const announcementBar = document.querySelector(".announcement-bar");
    const announcementClose = document.querySelector(".announcement-close");

    const backToTopButton = document.getElementById("back-to-top-floating");
    const currentYear = document.getElementById("current-year");

    const aiInput = document.getElementById("ai-input");
    const aiGenerateButton = document.getElementById("ai-generate");

    const aiTitle = document.getElementById("ai-title");
    const aiCategory = document.getElementById("ai-category");
    const aiDescription = document.getElementById("ai-description");

    // =============================================
    // 2. CURRENT YEAR
    // =============================================

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    // =============================================
    // 3. ANNOUNCEMENT BAR
    // =============================================

    
    // =============================================
    // 3. ANNOUNCEMENT BAR
    // Persist dismissal without changing its design.
    // =============================================

    if (announcementBar && announcementClose) {
        const looplyStorage = window.LooplyStorage;

        if (
            looplyStorage &&
            looplyStorage.isAnnouncementDismissed()
        ) {
            announcementBar.remove();
        } else {
            announcementClose.addEventListener("click", () => {
                if (looplyStorage) {
                    looplyStorage.dismissAnnouncement();
                }

                announcementBar.remove();
            });
        }
    }


    // =============================================
    // 4. MOBILE NAVIGATION
    // =============================================

    function closeMobileMenu() {
        if (!menuToggle || !navMenu) return;

        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation menu");

        navMenu.classList.remove("open");
        document.body.classList.remove("menu-open");
    }

    function openMobileMenu() {
        if (!menuToggle || !navMenu) return;

        menuToggle.setAttribute("aria-expanded", "true");
        menuToggle.setAttribute("aria-label", "Close navigation menu");

        navMenu.classList.add("open");
        document.body.classList.add("menu-open");
    }

    if (menuToggle && navMenu) {

        menuToggle.addEventListener("click", () => {
            const isOpen =
                menuToggle.getAttribute("aria-expanded") === "true";

            if (isOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        // Close the menu after selecting a navigation link.
        navMenu.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", closeMobileMenu);
        });

        // Close the menu when clicking outside it.
        document.addEventListener("click", (event) => {
            const clickedInsideMenu = navMenu.contains(event.target);
            const clickedToggle = menuToggle.contains(event.target);

            if (!clickedInsideMenu && !clickedToggle) {
                closeMobileMenu();
            }
        });

        // Close the menu using Escape.
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeMobileMenu();
            }
        });

        // Reset mobile menu when switching to desktop.
        window.addEventListener("resize", () => {
            if (window.innerWidth > 900) {
                closeMobileMenu();
            }
        });
    }

    // =============================================
    // 5. HEADER SCROLL EFFECT
    // =============================================

    function updateHeader() {
        if (!header) return;

        if (window.scrollY > 20) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    }

    window.addEventListener("scroll", updateHeader, {
        passive: true
    });

    updateHeader();

    // =============================================
    // 6. BACK TO TOP
    // =============================================

    function updateBackToTop() {
        if (!backToTopButton) return;

        if (window.scrollY > 500) {
            backToTopButton.classList.add("visible");
        } else {
            backToTopButton.classList.remove("visible");
        }
    }

    window.addEventListener("scroll", updateBackToTop, {
        passive: true
    });

    updateBackToTop();

    if (backToTopButton) {
        backToTopButton.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }

    // =============================================
    // 7. SCROLL REVEAL ANIMATIONS
    // =============================================

    const revealElements = document.querySelectorAll(".reveal");

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {

        revealElements.forEach((element) => {
            element.classList.add("visible");
        });

    } else {

        const revealObserver = new IntersectionObserver(
            (entries, observer) => {

                entries.forEach((entry) => {

                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");

                        // Animate each element only once.
                        observer.unobserve(entry.target);
                    }

                });

            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -40px 0px"
            }
        );

        revealElements.forEach((element) => {
            revealObserver.observe(element);
        });
    }

    // =============================================
    // 8. ACTIVE NAVIGATION LINK
    // =============================================

    const sections = document.querySelectorAll(
        "main section[id]"
    );

    if ("IntersectionObserver" in window && sections.length > 0) {

        const sectionObserver = new IntersectionObserver(
            (entries) => {

                entries.forEach((entry) => {

                    if (!entry.isIntersecting) return;

                    const sectionId = entry.target.id;

                    navLinks.forEach((link) => {

                        const linkTarget = link.getAttribute("href");

                        if (linkTarget === `#${sectionId}`) {

                            link.classList.add("active");

                        } else {

                            link.classList.remove("active");

                        }

                    });

                });

            },
            {
                rootMargin: "-25% 0px -60% 0px",
                threshold: 0
            }
        );

        sections.forEach((section) => {
            sectionObserver.observe(section);
        });
    }

    // =============================================
    // 9. FAQ ACCORDION
    // Keep only one FAQ item open at a time.
    // =============================================

    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach((item) => {

        item.addEventListener("toggle", () => {

            if (!item.open) return;

            faqItems.forEach((otherItem) => {

                if (otherItem !== item && otherItem.open) {
                    otherItem.open = false;
                }

            });

        });

    });

    // =============================================
    // 10. AI LISTING ASSISTANT DEMO
    //
    // IMPORTANT:
    // This is a local demonstration.
    // It does not call an actual AI model or API.
    // =============================================

    const demoCategories = [
        {
            keywords: [
                "box", "boxes", "carton", "cartons",
                "packaging", "package", "packaging materials"
            ],
            category: "Packaging"
        },
        {
            keywords: [
                "cement", "brick", "bricks", "concrete",
                "construction", "building material"
            ],
            category: "Construction Materials"
        },
        {
            keywords: [
                "machine", "machinery", "equipment",
                "industrial", "spare parts"
            ],
            category: "Industrial Supplies"
        },
        {
            keywords: [
                "metal", "steel", "aluminum", "aluminium",
                "plastic", "wood", "raw material"
            ],
            category: "Raw Materials"
        }
    ];

    function detectDemoCategory(text) {

        const normalizedText = text.toLowerCase();

        const matchedCategory = demoCategories.find((item) => {

            return item.keywords.some((keyword) =>
                normalizedText.includes(keyword)
            );

        });

        return matchedCategory
            ? matchedCategory.category
            : "General Business Supplies";
    }

    function createDemoTitle(text) {

        const cleanedText = text
            .trim()
            .replace(/\s+/g, " ")
            .replace(/[.!?]+$/g, "");

        if (!cleanedText) {
            return "Business Surplus Listing";
        }

        const category = detectDemoCategory(cleanedText);

        if (category === "Packaging") {
            return "Surplus Packaging Materials";
        }

        if (category === "Construction Materials") {
            return "Available Construction Materials";
        }

        if (category === "Industrial Supplies") {
            return "Surplus Industrial Supplies";
        }

        if (category === "Raw Materials") {
            return "Available Raw Materials";
        }

        // Keep the title short and readable.
        const words = cleanedText.split(" ").slice(0, 7);

        const title = words.join(" ");

        return title.charAt(0).toUpperCase() + title.slice(1);
    }

    function createDemoDescription(text, category) {

        const cleanedText = text
            .trim()
            .replace(/\s+/g, " ")
            .replace(/[.!?]+$/g, "");

        if (!cleanedText) {
            return "Enter a product description to see a sample suggestion.";
        }

        return (
            `${cleanedText}. ` +
            `Suggested category: ${category}. ` +
            "Confirm the quantity, unit, condition, and other product details before publishing."
        );
    }

    function generateDemoSuggestion() {

        if (!aiInput || !aiTitle || !aiCategory || !aiDescription) {
            return;
        }

        const userText = aiInput.value.trim();

        if (!userText) {

            aiInput.focus();

            aiInput.setCustomValidity(
                "Please enter a short product description."
            );

            aiInput.reportValidity();

            return;
        }

        aiInput.setCustomValidity("");

        const originalButtonText = aiGenerateButton.innerHTML;

        aiGenerateButton.disabled = true;
        aiGenerateButton.textContent = "Preparing example...";

        // Short visual delay for the demo only.
        window.setTimeout(() => {

            const category = detectDemoCategory(userText);
            const title = createDemoTitle(userText);
            const description = createDemoDescription(
                userText,
                category
            );

            aiTitle.textContent = title;
            aiCategory.textContent = category;
            aiDescription.textContent = description;

            aiGenerateButton.disabled = false;
            aiGenerateButton.innerHTML = originalButtonText;

        }, 450);
    }

    if (aiGenerateButton && aiInput) {

        aiGenerateButton.addEventListener(
            "click",
            generateDemoSuggestion
        );

        aiInput.addEventListener("input", () => {
            aiInput.setCustomValidity("");
        });

    }

    // =============================================
    // 11. SMOOTH SCROLL FOR INTERNAL LINKS
    // =============================================

    document.querySelectorAll('a[href^="#"]').forEach((link) => {

        link.addEventListener("click", (event) => {

            const href = link.getAttribute("href");

            if (!href || href === "#") return;

            const target = document.querySelector(href);

            if (!target) return;

            event.preventDefault();

            target.scrollIntoView({
                behavior: reducedMotion ? "auto" : "smooth",
                block: "start"
            });

        });

    });

});
