// ==================== MEATZAAR API CLIENT ====================
const API_BASE = window.API_BASE || '/api';
const API_FALLBACK_BASES = Array.isArray(window.API_FALLBACK_BASES) ? window.API_FALLBACK_BASES : [];
const REQUEST_TIMEOUT_MS = 25000;

function normalizeApiUrl(url) {
    return new URL(url, window.location.origin).toString();
}

function fallbackUrlsFor(url) {
    const absoluteUrl = normalizeApiUrl(url);
    const primaryApiBase = normalizeApiUrl(API_BASE).replace(/\/+$/, '');
    const parsedUrl = new URL(absoluteUrl);

    if (!absoluteUrl.startsWith(`${primaryApiBase}/`)) {
        return [absoluteUrl];
    }

    const apiPath = absoluteUrl.slice(primaryApiBase.length);
    const urls = [absoluteUrl];

    API_FALLBACK_BASES.forEach(base => {
        const normalizedBase = normalizeApiUrl(base).replace(/\/+$/, '');
        urls.push(`${normalizedBase}${apiPath}`);
    });

    return [...new Set(urls)].filter(candidate => {
        const candidateUrl = new URL(candidate);
        return candidateUrl.protocol === 'http:' || candidateUrl.protocol === 'https:';
    });
}

async function fetchJsonFrom(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        let data;
        try {
            data = await res.json();
        } catch (_) {
            if (res.ok) {
                // 200 with non-JSON body = static/wrong server intercepting the request
                throw new TypeError('Non-JSON response from server');
            }
            data = {};
        }
        if (!res.ok) {
            throw new Error(data.message || 'Something went wrong. Please try again.');
        }
        return data;
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('The request is taking too long. Please check your connection and try again.');
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

function _isLocalhost(url) {
    try {
        const { hostname } = new URL(url);
        return hostname === 'localhost' || hostname === '127.0.0.1';
    } catch (_) {
        return false;
    }
}

async function fetchJson(url, options = {}) {
    const urls = fallbackUrlsFor(url);
    let lastNetworkError = null;

    for (const candidateUrl of urls) {
        try {
            return await fetchJsonFrom(candidateUrl, options);
        } catch (err) {
            const isNetworkError = err instanceof TypeError;
            const isTimeout = err.name === 'AbortError'
                || err.message === 'The request is taking too long. Please check your connection and try again.';
            // For localhost URLs always try the next fallback — the local server may be
            // absent or may be a different process (e.g. the frontend static server).
            const isLocalUrl = _isLocalhost(candidateUrl);

            if (!isNetworkError && !isTimeout && !isLocalUrl) {
                throw err;
            }

            lastNetworkError = err;
        }
    }

    const isLocalApi = urls.some(u => _isLocalhost(u));

    if (isLocalApi) {
        throw new Error('Could not reach the API. Start the backend with "npm start" in the backend folder, or set MEATZAAR_BACKEND_ORIGIN to your deployed backend URL.');
    }

    throw new Error(lastNetworkError && lastNetworkError.message
        ? lastNetworkError.message
        : 'Could not reach the API. Please check your connection and try again.');
}

const MeatzaarAuth = {
    // Get stored token
    getToken() {
        return localStorage.getItem('meatzaar_token');
    },

    // Get stored user
    getUser() {
        const user = localStorage.getItem('meatzaar_user');
        return user ? JSON.parse(user) : null;
    },

    // Check if logged in
    isLoggedIn() {
        return !!this.getToken();
    },

    // Save auth data
    _saveAuth(data) {
        localStorage.setItem('meatzaar_token', data.token);
        localStorage.setItem('meatzaar_user', JSON.stringify(data.user));
    },

    // Clear auth data
    logout() {
        localStorage.removeItem('meatzaar_token');
        localStorage.removeItem('meatzaar_user');
    },

    // Signup
    // Send verification code to email
    async sendVerification(name, email, password, confirmPassword) {
        return fetchJson(`${API_BASE}/auth/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, confirmPassword })
        });
    },

    // Signup with verification code
    async signup(email, verificationCode) {
        const data = await fetchJson(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, verificationCode })
        });
        this._saveAuth(data);
        return data;
    },

    // Login
    async login(email, password) {
        const data = await fetchJson(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        this._saveAuth(data);
        return data;
    },

    // Get current user profile
    async getProfile() {
        const data = await fetchJson(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        return data.user;
    },

    // Update profile
    async updateProfile(updates) {
        const data = await fetchJson(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify(updates)
        });
        localStorage.setItem('meatzaar_user', JSON.stringify(data.user));
        return data;
    },

    // Place order
    async placeOrder(items, deliveryInfo) {
        return fetchJson(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify({ items, deliveryInfo })
        });
    },

    // Send phone OTP for checkout verification
    async sendPhoneOtp(phone) {
        return fetchJson(`${API_BASE}/orders/phone/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify({ phone })
        });
    },

    // Verify phone OTP for checkout verification
    async verifyPhoneOtp(phone, otp) {
        return fetchJson(`${API_BASE}/orders/phone/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify({ phone, otp })
        });
    },

    // Get all orders
    async getOrders() {
        const data = await fetchJson(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        return data.orders;
    },

    // Contact form
    async sendContact(name, email, message) {
        return fetchJson(`${API_BASE}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message })
        });
    }
};

// ==================== UI AUTH STATE ====================
function updateAuthUI() {
    const isLoggedIn = MeatzaarAuth.isLoggedIn();
    const user = MeatzaarAuth.getUser();
    const sideNav = document.querySelector('.side-nav');
    const hasLocalAuthModals = !!(document.getElementById('loginModal') && document.getElementById('signupModal'));

    const ensureSideDivider = () => {
        if (!sideNav) return null;
        let divider = sideNav.querySelector('hr');
        if (!divider) {
            divider = document.createElement('hr');
            sideNav.appendChild(divider);
        }
        divider.classList.add('side-auth-divider');
        return divider;
    };

    const createSideAuthButton = (id, className, text, action) => {
        const button = document.createElement('button');
        button.className = className;
        button.id = id;
        button.type = 'button';
        button.textContent = text;
        button.addEventListener('click', () => {
            window.location.href = `/index.html?action=${action}`;
        });
        return button;
    };

    const sessionControlsHTML = (profilePath, cartPath, avatarUrl, firstName, cartBadgeHTML) => `
        <a href="${profilePath}" class="user-avatar-link" aria-label="Profile">
            <span class="user-greeting">Hi, ${firstName}</span>
            <img src="${avatarUrl}" alt="Profile" class="user-avatar">
        </a>
        <a href="${cartPath}" class="nav-cart-link" aria-label="Cart">
            <i class="fas fa-shopping-cart"></i>
            ${cartBadgeHTML}
        </a>
    `;

    // Inject shared nav styles (always needed for cart icon)
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --session-icon-gap: 0.65rem;
            --session-avatar-size: 38px;
            --session-cart-size: 1.25rem;
            --session-badge-size: 18px;
            --session-badge-font: 0.65rem;
        }
        .user-avatar-link {
            display: flex;
            align-items: center;
            text-decoration: none;
            margin-left: auto;
            gap: 0.5rem;
        }
        .auth-buttons.auth-session-controls,
        .shared-auth-session-controls {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: var(--session-icon-gap);
            margin-left: auto;
            flex-wrap: nowrap;
        }
        .auth-buttons.auth-session-controls .user-avatar-link,
        .shared-auth-session-controls .user-avatar-link {
            margin-left: 0;
            gap: 0.5rem;
            flex: 0 0 auto;
        }
        .auth-buttons.auth-session-controls .nav-cart-link,
        .shared-auth-session-controls .nav-cart-link {
            margin-left: 0;
            flex: 0 0 auto;
        }
        .user-greeting {
            color: #fff;
            font-weight: 600;
            font-size: 0.95rem;
            white-space: nowrap;
        }
        .user-avatar {
            width: var(--session-avatar-size);
            height: var(--session-avatar-size);
            border-radius: 50%;
            border: 2px solid #FF7300;
            cursor: pointer;
            object-fit: cover;
            transition: border-color 0.3s ease;
        }
        .user-avatar:hover {
            border-color: #fff;
        }
        .nav-cart-link {
            position: relative;
            display: flex;
            align-items: center;
            text-decoration: none;
            color: #fff;
            font-size: var(--session-cart-size);
            margin-left: 0.75rem;
            transition: color 0.3s ease;
        }
        .nav-cart-link:hover {
            color: #FF7300;
        }
        .cart-badge {
            position: absolute;
            top: -8px;
            right: -10px;
            background-color: #FF7300;
            color: #fff;
            font-size: var(--session-badge-font);
            font-weight: 700;
            min-width: var(--session-badge-size);
            height: var(--session-badge-size);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }
        .cart-badge.hidden {
            display: none;
        }
        .side-nav .side-auth-divider {
            border: none;
            border-top: 1px solid rgba(255, 255, 255, 0.18);
            width: 100%;
            margin: 0.75rem 0 0.25rem;
        }
        .side-nav #loginBtnMobile,
        .side-nav #signupBtnMobile,
        .side-logout-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 0.75rem 1.5rem;
            border-radius: 5px;
            font-weight: 600;
            font-size: 1rem;
            line-height: 1.2;
            text-align: center;
            text-decoration: none;
            cursor: pointer;
            margin: 0.35rem 0 0;
            transition: all 0.3s ease;
        }
        .side-nav #loginBtnMobile {
            background: transparent;
            border: 2px solid #ffffff;
            color: #ffffff;
        }
        .side-nav #loginBtnMobile:hover {
            background: #ffffff;
            color: #1a1a1a;
        }
        .side-nav #signupBtnMobile {
            background: #FF7300;
            border: 2px solid #FF7300;
            color: #ffffff;
        }
        .side-nav #signupBtnMobile:hover {
            background: #ffffff;
            border-color: #ffffff;
            color: #1a1a1a;
        }
        .side-logout-btn {
            background: transparent;
            border: 2px solid #e74c3c;
            color: #e74c3c;
        }
        .side-logout-btn:hover {
            background-color: #e74c3c;
            color: #fff;
        }
        .side-nav #loginBtnMobile + #signupBtnMobile {
            margin-top: 0.65rem;
        }
        .side-nav .btn-full {
            width: 100%;
        }
        @media (min-width: 769px) {
            .auth-session-host.auth-session-search-host {
                gap: 1.5rem;
            }
            .auth-session-host.auth-session-search-host .search-wrapper {
                margin-left: 0;
                margin-right: 0;
            }
            .auth-session-host.auth-session-search-host .auth-buttons.auth-session-controls {
                width: 210px;
                min-width: 210px;
                margin-left: 0;
            }
        }
        @media (max-width: 768px) {
            :root {
                --session-icon-gap: 0.45rem;
                --session-avatar-size: 30px;
                --session-cart-size: 1.05rem;
                --session-badge-size: 15px;
                --session-badge-font: 0.55rem;
            }
            .logo h1 {
                font-size: 1.4rem !important;
            }
            .auth-session-host {
                position: relative;
            }
            .auth-buttons.auth-session-controls,
            .shared-auth-session-controls {
                display: flex !important;
                align-items: center;
                gap: var(--session-icon-gap);
                position: absolute;
                top: 50%;
                right: 0.55rem;
                transform: translateY(-50%);
                z-index: 105;
                flex-wrap: nowrap;
                max-width: 72px;
            }
            .auth-session-host.auth-session-search-host > .auth-buttons.auth-session-controls,
            .auth-session-host.auth-session-search-host > .shared-auth-session-controls {
                top: 0.35rem;
                transform: none;
            }
            header.auth-session-host.auth-session-search-host > .auth-buttons.auth-session-controls,
            header.auth-session-host.auth-session-search-host > .shared-auth-session-controls {
                top: calc(0.75rem + 21px);
                transform: translateY(-50%);
            }
            .auth-buttons.auth-session-controls .user-greeting,
            .shared-auth-session-controls .user-greeting {
                display: none;
            }
            .auth-buttons.auth-session-controls .user-avatar-link,
            .shared-auth-session-controls .user-avatar-link {
                gap: 0;
            }
            .auth-buttons.auth-session-controls .cart-badge,
            .shared-auth-session-controls .cart-badge {
                top: -6px;
                right: -8px;
            }
        }
        @media (max-width: 380px) {
            :root {
                --session-icon-gap: 0.35rem;
                --session-avatar-size: 28px;
                --session-cart-size: 1rem;
            }
            .auth-buttons.auth-session-controls,
            .shared-auth-session-controls {
                right: 0.45rem;
                max-width: 64px;
            }
        }
    `;
    document.head.appendChild(style);

    // Cart path & badge (always needed)
    const cartLink = document.querySelector('.side-nav a[href*="cart"]');
    const cartPath = cartLink ? cartLink.getAttribute('href') : '../cart/cart.html';
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const cartBadgeHTML = `<span class="cart-badge${cartCount === 0 ? ' hidden' : ''}" id="navCartBadge">${cartCount}</span>`;

    // Remove any existing static cart icons to avoid duplicates
    const existingCartIcons = document.querySelectorAll('header .cart-icon');
    existingCartIcons.forEach(el => el.remove());

    // Find the header container to append to
    const container = document.querySelector('.header-container')
        || document.querySelector('.header-right')
        || document.querySelector('header');

    if (isLoggedIn && user) {
        const profileLink = document.querySelector('.side-nav a[href*="profile"]');
        const profilePath = profileLink ? profileLink.getAttribute('href') : '../profile/profile.html';
        const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`;
        const firstName = user.name.split(' ')[0];

        const authButtons = document.querySelector('.auth-buttons');

        if (authButtons) {
            if (authButtons.parentElement) {
                authButtons.parentElement.classList.add('auth-session-host');
                if (authButtons.parentElement.querySelector('.search-wrapper')) {
                    authButtons.parentElement.classList.add('auth-session-search-host');
                }
            }
            authButtons.classList.add('auth-session-controls');
            authButtons.innerHTML = sessionControlsHTML(profilePath, cartPath, avatarUrl, firstName, cartBadgeHTML);
        } else if (container && !container.querySelector('.user-avatar-link')) {
            container.classList.add('auth-session-host');
            if (container.querySelector('.search-wrapper')) {
                container.classList.add('auth-session-search-host');
            }
            const controls = document.createElement('div');
            controls.className = 'shared-auth-session-controls';
            controls.innerHTML = sessionControlsHTML(profilePath, cartPath, avatarUrl, firstName, cartBadgeHTML);
            container.appendChild(controls);
        }

        // --- Side menu: replace login/signup with logout ---
        if (sideNav) {
            const loginBtnMobile = document.getElementById('loginBtnMobile');
            const signupBtnMobile = document.getElementById('signupBtnMobile');
            if (loginBtnMobile) loginBtnMobile.remove();
            if (signupBtnMobile) signupBtnMobile.remove();

            if (!sideNav.querySelector('.side-logout-btn')) {
                ensureSideDivider();
                const logoutBtn = document.createElement('button');
                logoutBtn.className = 'side-logout-btn';
                logoutBtn.textContent = 'Logout';
                logoutBtn.addEventListener('click', () => {
                    MeatzaarAuth.logout();
                    window.location.href = '/index.html';
                });
                sideNav.appendChild(logoutBtn);
            }
        }
    } else if (sideNav) {
        const authButtons = document.querySelector('.auth-buttons.auth-session-controls');
        if (authButtons) authButtons.classList.remove('auth-session-controls');
        document.querySelectorAll('.shared-auth-session-controls').forEach(el => el.remove());

        const logoutBtn = sideNav.querySelector('.side-logout-btn');
        if (logoutBtn) logoutBtn.remove();

        ensureSideDivider();

        let loginBtnMobile = document.getElementById('loginBtnMobile');
        if (!loginBtnMobile) {
            loginBtnMobile = createSideAuthButton('loginBtnMobile', 'btn btn-login btn-full', 'Login', 'login');
            sideNav.appendChild(loginBtnMobile);
        } else {
            loginBtnMobile.textContent = 'Login';
            if (!hasLocalAuthModals) {
                loginBtnMobile.onclick = () => {
                    window.location.href = '/index.html?action=login';
                };
            }
        }

        let signupBtnMobile = document.getElementById('signupBtnMobile');
        if (!signupBtnMobile) {
            signupBtnMobile = createSideAuthButton('signupBtnMobile', 'btn btn-signup btn-full', 'Sign Up', 'signup');
            sideNav.appendChild(signupBtnMobile);
        } else {
            signupBtnMobile.textContent = 'Sign Up';
            if (!hasLocalAuthModals) {
                signupBtnMobile.onclick = () => {
                    window.location.href = '/index.html?action=signup';
                };
            }
        }
    }

    document.body.classList.add('auth-ui-ready');
}

// Run on page load
document.addEventListener('DOMContentLoaded', updateAuthUI);

// Global function to update the nav cart badge in real-time
function updateNavCartBadge() {
    const badge = document.getElementById('navCartBadge');
    if (!badge) return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
}
