
"use strict";

// =============================================
// LOOPLY - DEMO AUTHENTICATION
// Front-end demonstration only
// =============================================

(function () {
    const storage = window.LooplyStorage;
    const constants = window.LooplyConstants;

    if (!storage || !constants) {
        console.error("LooplyAuth requires constants.js and storage.js.");
        return;
    }

    const { STORAGE_KEYS } = constants;
    const HASH_ITERATIONS = 120000;

    function normalizeEmail(email) {
        return String(email || "").trim().toLowerCase();
    }

    function getAccounts() {
        const accounts = storage.getLocal(
            STORAGE_KEYS.DEMO_ACCOUNTS,
            []
        );

        return Array.isArray(accounts) ? accounts : [];
    }

    function saveAccounts(accounts) {
        return storage.setLocal(STORAGE_KEYS.DEMO_ACCOUNTS, accounts);
    }

    function getCurrentUser() {
        return storage.getLocal(
            STORAGE_KEYS.CURRENT_USER,
            null
        ) || storage.getSession(
            constants.SESSION_KEYS.CURRENT_USER,
            null
        );
    }

    function isLoggedIn() {
        return Boolean(getCurrentUser());
    }

    function bytesToHex(bytes) {
        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    function hexToBytes(hex) {
        if (
            typeof hex !== "string" ||
            hex.length % 2 !== 0 ||
            !/^[0-9a-f]+$/i.test(hex)
        ) {
            throw new Error("Invalid password hash data.");
        }

        const bytes = new Uint8Array(hex.length / 2);

        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }

        return bytes;
    }

    function ensureCryptoSupport() {
        if (
            !window.crypto ||
            !window.crypto.subtle ||
            !window.crypto.getRandomValues
        ) {
            throw new Error(
                "Secure password processing is unavailable. " +
                "Open Looply through localhost or HTTPS."
            );
        }
    }

    async function hashPassword(password, saltHex) {
        ensureCryptoSupport();

        const encoder = new TextEncoder();
        const salt = saltHex
            ? hexToBytes(saltHex)
            : window.crypto.getRandomValues(new Uint8Array(16));

        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
        );

        const derivedBits = await window.crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt,
                iterations: HASH_ITERATIONS,
                hash: "SHA-256"
            },
            keyMaterial,
            256
        );

        return {
            salt: bytesToHex(salt),
            hash: bytesToHex(new Uint8Array(derivedBits))
        };
    }

    function safeUser(account) {
        return {
            id: account.id,
            companyName: account.companyName || "",
            email: account.email || "",
            industry: account.industry || "",
            companySize: account.companySize || "",
            country: account.country || "",
            city: account.city || "",
            website: account.website || "",
            role: account.role || "",
            description: account.description || "",
            categories: account.categories || "",
            goals: Array.isArray(account.goals) ? account.goals : [],
            onboardingCompleted: account.onboardingCompleted === true,
            onboardingCompletedAt: account.onboardingCompletedAt || null,
            createdAt: account.createdAt,
            demo: true
        };
    }

    function registerAccount(accountData) {
        return registerAccountAsync(accountData);
    }

    async function registerAccountAsync(accountData) {
        if (!accountData || typeof accountData !== "object") {
            return {
                success: false,
                message: "Invalid account information."
            };
        }

        const companyName = String(accountData.companyName || "").trim();
        const email = normalizeEmail(accountData.email);
        const password = String(accountData.password || "");

        if (!companyName || !email || !password) {
            return {
                success: false,
                message: "Company name, email, and password are required."
            };
        }

        if (password.length < 8) {
            return {
                success: false,
                message: "Password must contain at least 8 characters."
            };
        }

        const accounts = getAccounts();

        if (accounts.some(account =>
            normalizeEmail(account.email) === email
        )) {
            return {
                success: false,
                message: "An account with this email already exists."
            };
        }

        try {
            const passwordData = await hashPassword(password);

            const account = {
                id: `demo-${Date.now()}-${Math.random()
                    .toString(36).slice(2, 8)}`,
                companyName,
                email,
                industry: String(accountData.industry || "").trim(),
                country: String(accountData.country || "").trim(),
                city: String(accountData.city || "").trim(),
                role: accountData.role || "both",
                description: String(accountData.description || "").trim(),
                passwordSalt: passwordData.salt,
                passwordHash: passwordData.hash,
                passwordAlgorithm: "PBKDF2-SHA-256",
                passwordIterations: HASH_ITERATIONS,
                onboardingCompleted: false,
                onboardingCompletedAt: null,
                companySize: "",
                website: "",
                categories: "",
                goals: [],
                createdAt: new Date().toISOString(),
                demo: true
            };

            const saved = saveAccounts([...accounts, account]);

            if (!saved) {
                return {
                    success: false,
                    message: "Could not save the demo account."
                };
            }

            return {
                success: true,
                message: "Your account was created successfully.",
                user: safeUser(account)
            };
        } catch (error) {
            console.error("Looply registration error:", error);

            return {
                success: false,
                message: error.message ||
                    "Could not create the account. Please try again."
            };
        }
    }

    async function loginDemo(email, password, rememberMe = true) {
        const normalizedEmail = normalizeEmail(email);
        const enteredPassword = String(password || "");

        if (!normalizedEmail || !enteredPassword) {
            return {
                success: false,
                message: "Please enter your email and password."
            };
        }

        const account = getAccounts().find(
            item => normalizeEmail(item.email) === normalizedEmail
        );

        if (!account) {
            return {
                success: false,
                message: "No account found with this email."
            };
        }

        // Older demo accounts created without password data
        // must be registered again for this demo authentication flow.
        if (!account.passwordHash || !account.passwordSalt) {
            return {
                success: false,
                message: "This demo account has no password set. Please create a new account."
            };
        }

        try {
            const result = await hashPassword(
                enteredPassword,
                account.passwordSalt
            );

            if (result.hash !== account.passwordHash) {
                return {
                    success: false,
                    message: "Incorrect email or password."
                };
            }

            const sessionUser = safeUser(account);

            const sessionKey = constants.SESSION_KEYS.CURRENT_USER;

            let saved;

            if (rememberMe) {
                saved = storage.setLocal(
                    STORAGE_KEYS.CURRENT_USER,
                    sessionUser
                );

                storage.removeSession(sessionKey);
            } else {
                saved = storage.setSession(sessionKey, sessionUser);

                storage.removeLocal(STORAGE_KEYS.CURRENT_USER);
            }

            if (!saved) {
                return {
                    success: false,
                    message: "Could not save the demo session."
                };
            }

            return {
                success: true,
                message: "Demo login successful.",
                user: sessionUser
            };
        } catch (error) {
            console.error("Looply login error:", error);

            return {
                success: false,
                message: "Could not verify the password. Please try again."
            };
        }
    }

    function logout() {
        const localRemoved = storage.removeLocal(
            STORAGE_KEYS.CURRENT_USER
        );

        const sessionRemoved = storage.removeSession(
            constants.SESSION_KEYS.CURRENT_USER
        );

        return localRemoved && sessionRemoved;
    }


    function updateCurrentUser(updates) {
        const currentUser = getCurrentUser();

        if (!currentUser || !updates || typeof updates !== "object") {
            return false;
        }

        const safeUpdates = { ...updates };

        delete safeUpdates.id;
        delete safeUpdates.email;
        delete safeUpdates.demo;
        delete safeUpdates.password;
        delete safeUpdates.passwordHash;
        delete safeUpdates.passwordSalt;
        delete safeUpdates.passwordAlgorithm;
        delete safeUpdates.passwordIterations;

        const updatedUser = {
            ...currentUser,
            ...safeUpdates
        };

        const sessionKey = constants.SESSION_KEYS.CURRENT_USER;

        const isLocalSession = Boolean(
            storage.getLocal(STORAGE_KEYS.CURRENT_USER, null)
        );

        const saved = isLocalSession
            ? storage.setLocal(STORAGE_KEYS.CURRENT_USER, updatedUser)
            : storage.setSession(sessionKey, updatedUser);

        if (!saved) {
            return false;
        }

        const accounts = getAccounts();

        const updatedAccounts = accounts.map(account =>
            account.id === currentUser.id
                ? { ...account, ...safeUpdates }
                : account
        );

        return saveAccounts(updatedAccounts);
    }


    function getAccountById(accountId) {
        const account = getAccounts().find(
            item => item.id === accountId
        );

        return account ? safeUser(account) : null;
    }


    // Demo-only password update. Verify old password using the existing PBKDF2 scheme.
    async function changePassword(currentPassword, newPassword) {
        const user = getCurrentUser();
        if (!user) return { success: false, message: "Please sign in again." };
        if (typeof newPassword !== "string" || newPassword.length < 8) {
            return { success: false, message: "New password must contain at least 8 characters." };
        }
        const accounts = getAccounts();
        const index = accounts.findIndex(account => String(account.id) === String(user.id));
        if (index < 0) return { success: false, message: "Account not found." };
        const account = accounts[index];
        if (!account.passwordHash || !account.passwordSalt) {
            return { success: false, message: "This account does not have a password configured." };
        }
        try {
            const verified = await hashPassword(String(currentPassword || ""), account.passwordSalt);
            if (verified.hash !== account.passwordHash) {
                return { success: false, message: "Current password is incorrect." };
            }
            const replacement = await hashPassword(newPassword);
            accounts[index] = {
                ...account,
                passwordSalt: replacement.salt,
                passwordHash: replacement.hash,
                passwordAlgorithm: "PBKDF2-SHA-256",
                passwordIterations: HASH_ITERATIONS
            };
            if (!saveAccounts(accounts)) return { success: false, message: "Could not save new password." };
            return { success: true, message: "Password updated successfully." };
        } catch (error) {
            console.error("Looply password update failed:", error);
            return { success: false, message: "Password update failed. Use localhost or HTTPS." };
        }
    }

    window.LooplyAuth = Object.freeze({
        getAccounts,
        getCurrentUser,
        isLoggedIn,
        registerAccount,
        loginDemo,
        logout,
        updateCurrentUser,
        getAccountById
    });
})();
