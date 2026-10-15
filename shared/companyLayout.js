"use strict";



(() => {

    const $ = (selector) => document.querySelector(selector);



    async function loadComponent(selector, path) {

        const container = $(selector);



        if (!container) {

            throw new Error(`Missing layout container: ${selector}`);

        }



        const response = await fetch(path);



        if (!response.ok) {

            throw new Error(`Unable to load ${path}: ${response.status}`);

        }



        container.innerHTML = await response.text();

    }





function updateQuoteRequestsCounter() {

    const counter = document.getElementById("quote-nav-count");



    if (!counter) return;



    const user = window.LooplyAuth?.getCurrentUser?.();

    const storage = window.LooplyStorage;



    if (!user?.id || !storage?.getLocal) {

        return;

    }



    const key =

        window.LooplyConstants?.STORAGE_KEYS?.QUOTE_REQUESTS ||

        "looply_quote_requests";



    const savedRequests = storage.getLocal(key, []);



    const requests = Array.isArray(savedRequests)

        ? savedRequests

        : [];



    const count = requests.filter(request =>

        String(request.sellerId) === String(user.id) &&

        request.status === "pending"

    ).length;



    counter.textContent = String(count);

}





    function updateMessagesCounter() {
        const badge = document.getElementById("messages-nav-count");
        if (!badge) return;

        const user = window.LooplyAuth?.getCurrentUser?.();
        const storage = window.LooplyStorage;
        const key = window.LooplyConstants?.STORAGE_KEYS?.MESSAGES || "looply_messages";
        const records = storage?.getLocal?.(key, []) || [];
        const conversations = Array.isArray(records) ? records : [];
        const myId = String(user?.id ?? "");

        let unreadCount = 0;
        if (myId) {
            for (const conversation of conversations) {
                if (!Array.isArray(conversation?.participants) ||
                    !conversation.participants.some(person => String(person.id) === myId)) continue;

                for (const message of conversation.messages || []) {
                    if (String(message.senderId) === myId) continue;
                    const readBy = Array.isArray(message.readBy) ? message.readBy : [];
                    if (!readBy.some(person => String(person) === myId)) unreadCount++;
                }
            }
        }

        badge.textContent = unreadCount ? String(unreadCount) : "";
        badge.hidden = unreadCount === 0;
        badge.setAttribute("aria-label", `${unreadCount} unread messages`);
    }

    function updateNotificationsCounter() {
        const badge = document.getElementById("notifications-nav-count");
        if (!badge) return;
        const count = window.LooplyNotifications?.unreadCount?.() || 0;
        badge.textContent = count ? String(count) : "";
        badge.hidden = count === 0;
        badge.setAttribute("aria-label", `${count} unread notifications`);
    }

    function getInitials(name) {

        return String(name || "Looply Company")

            .trim()

            .split(/\s+/)

            .filter(Boolean)

            .slice(0, 2)

            .map((word) => word.charAt(0).toUpperCase())

            .join("");

    }



    function updateCompanyDetails() {

        const user = window.LooplyAuth?.getCurrentUser?.();



        if (!user) return;



        const companyName =

            user.companyName ||

            user.company ||

            user.name ||

            "Your Company";



        const initials = getInitials(companyName);



        const sidebarCompany = $("#sidebar-company");

        const topbarCompany = $("#topbar-company");

        const sidebarAvatar = $("#sidebar-avatar");

        const topbarAvatar = $("#topbar-avatar");



        if (sidebarCompany) sidebarCompany.textContent = companyName;

        if (topbarCompany) topbarCompany.textContent = companyName;

        if (sidebarAvatar) sidebarAvatar.textContent = initials;

        if (topbarAvatar) topbarAvatar.textContent = initials;

    }









    function updateActiveSidebarTab() {

        const currentPath = new URL(window.location.href).pathname;



        const sidebarLinks = document.querySelectorAll(

            "#sidebar .nav-link"

        );



        // إزالة حالة النشاط من جميع التبويبات

        sidebarLinks.forEach((link) => {

            link.classList.remove("active");

            link.classList.remove("is-active");

            link.removeAttribute("aria-current");

        });



        // تحديد التبويب المطابق للصفحة الحالية

        sidebarLinks.forEach((link) => {

            const page = link.dataset.page;



            // معالجة Dashboard لأنه لا يستخدم data-page

            const route = page

                ? window.LooplyNavigation?.getRoute(page)

                : link.hasAttribute("data-dashboard-link")

                    ? window.LooplyNavigation?.getRoute("dashboard")

                    : null;



            if (!route) return;



            const routePath = new URL(route).pathname;



            if (currentPath === routePath) {

                link.classList.add("active");

                link.setAttribute("aria-current", "page");

            }

        });

    }







    function initializeFooter() {

        const yearElement = $("#company-footer-year");



        if (yearElement) {

            yearElement.textContent = new Date().getFullYear();

        }

    }





    function initializeLayout() {

        const sidebar = $("#sidebar");

        const overlay = $("#sidebar-overlay");

        const menuToggle = $("#menu-toggle");

        const profileButton = $("#profile-button");

        const profileMenu = $("#profile-menu");

        document.addEventListener(

            "looply:quotes-updated",

            updateQuoteRequestsCounter

        );

        window.addEventListener("pageshow", updateQuoteRequestsCounter);
        document.addEventListener("looply:messages-updated", updateMessagesCounter);
        window.addEventListener("pageshow", updateMessagesCounter);
        window.addEventListener("pageshow", updateNotificationsCounter);
        for (const name of ["looply:notifications-updated", "looply:messages-updated", "looply:quotes-updated", "looply:orders-updated", "looply:reviews-updated"]) {
            document.addEventListener(name, updateNotificationsCounter);
        }
        window.addEventListener("storage", updateNotificationsCounter);
        window.addEventListener("storage", event => {
            const key = window.LooplyConstants?.STORAGE_KEYS?.MESSAGES || "looply_messages";
            if (event.key === key) updateMessagesCounter();
        });

        function closeSidebar() {

            sidebar?.classList.remove("is-open");

            overlay?.classList.remove("is-visible");



            menuToggle?.setAttribute("aria-expanded", "false");

            menuToggle?.setAttribute("aria-label", "Open navigation");



            document.body.style.overflow = "";

        }



        function openSidebar() {

            sidebar?.classList.add("is-open");

            overlay?.classList.add("is-visible");



            menuToggle?.setAttribute("aria-expanded", "true");

            menuToggle?.setAttribute("aria-label", "Close navigation");



            document.body.style.overflow = "hidden";

        }



        function closeProfileMenu() {

            if (profileMenu) profileMenu.hidden = true;

            profileButton?.setAttribute("aria-expanded", "false");

        }



        menuToggle?.addEventListener("click", () => {

            if (sidebar?.classList.contains("is-open")) {

                closeSidebar();

            } else {

                openSidebar();

            }

        });



        overlay?.addEventListener("click", closeSidebar);



        profileButton?.addEventListener("click", () => {

            if (!profileMenu) return;



            const opening = profileMenu.hidden;

            profileMenu.hidden = !opening;



            profileButton.setAttribute(

                "aria-expanded",

                String(opening)

            );

        });



        document.addEventListener("click", (event) => {

            const target = event.target;



            if (!(target instanceof Element)) return;



            if (

                profileMenu &&

                profileButton &&

                !profileMenu.contains(target) &&

                !profileButton.contains(target)

            ) {

                closeProfileMenu();

            }



            const logoutButton = target.closest("[data-looply-logout]");



            if (logoutButton) {

                event.preventDefault();



                try {

                    window.LooplyAuth?.logout?.();

                } finally {

                    window.location.href =

                        "../login&register/login.html";

                }



                return;

            }





            const pageElement = target.closest("[data-page]");



            if (!pageElement) return;



            const page = pageElement.dataset.page;



            if (!page) return;



            event.preventDefault();



            closeSidebar();

            closeProfileMenu();



            if (window.LooplyNavigation?.navigateTo) {

                window.LooplyNavigation.navigateTo(page);

            } else {

                console.error(

                    "Looply Navigation is not loaded. Unable to navigate to:",

                    page

                );

            }



        });



        document.addEventListener("keydown", (event) => {

            if (event.key === "Escape") {

                closeSidebar();

                closeProfileMenu();

            }



            if (

                (event.ctrlKey || event.metaKey) &&

                event.key.toLowerCase() === "k"

            ) {

                const search = $("#dashboard-search");



                if (search) {

                    event.preventDefault();

                    search.focus();

                }

            }

        });



        updateCompanyDetails();

        updateActiveSidebarTab();

        initializeFooter();

        updateQuoteRequestsCounter();
        updateNotificationsCounter();
        updateMessagesCounter();



        document.dispatchEvent(

            new CustomEvent("looply:layout-ready")

        );

    }





    async function initialize() {

        try {

            const components = [

                loadComponent(

                    "#company-sidebar-slot",

                    "../shared/companySidebar.html"

                ),

                loadComponent(

                    "#company-header-slot",

                    "../shared/companyHeader.html"

                )

            ];



            // Load the footer only on pages that have its slot.

            if ($("#company-footer-slot")) {

                components.push(

                    loadComponent(

                        "#company-footer-slot",

                        "../shared/companyFooter.html"

                    )

                );

            }



            await Promise.all(components);



            // The notification service must be ready before the layout-ready event.
            if (!window.LooplyNotifications) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement("script");
                    script.src = "../shared/notificationsService.js";
                    script.onload = resolve;
                    script.onerror = () => reject(new Error("Unable to load notificationsService.js"));
                    document.head.appendChild(script);
                });
            }
            initializeLayout();



        } catch (error) {

            console.error(

                "Looply layout failed to load:",

                error

            );



            document.dispatchEvent(

                new CustomEvent("looply:layout-error", {

                    detail: { error }

                })

            );

        }

    }







    initialize();

})();
