// ==================== MEATZAAR API CLIENT ====================
const API_BASE = window.API_BASE || '/api';

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
        const res = await fetch(`${API_BASE}/auth/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, confirmPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data;
    },

    // Signup with verification code
    async signup(email, verificationCode) {
        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, verificationCode })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        this._saveAuth(data);
        return data;
    },

    // Login
    async login(email, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        this._saveAuth(data);
        return data;
    },

    // Get current user profile
    async getProfile() {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data.user;
    },

    // Update profile
    async updateProfile(updates) {
        const res = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        localStorage.setItem('meatzaar_user', JSON.stringify(data.user));
        return data;
    },

    // Place order
    async placeOrder(items, deliveryInfo) {
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify({ items, deliveryInfo })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data;
    },

    // Send phone OTP for checkout verification
    async sendPhoneOtp(phone) {
        const res = await fetch(`${API_BASE}/orders/phone/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data;
    },

    // Verify phone OTP for checkout verification
    async verifyPhoneOtp(phone, otp) {
        const res = await fetch(`${API_BASE}/orders/phone/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify({ phone, otp })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data;
    },

    // Get all orders
    async getOrders() {
        const res = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data.orders;
    },

    // Contact form
    async sendContact(name, email, message) {
        const res = await fetch(`${API_BASE}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data;
    }
};

// ==================== UI AUTH STATE ====================
function updateAuthUI() {
    const isLoggedIn = MeatzaarAuth.isLoggedIn();
    const user = MeatzaarAuth.getUser();

    // Inject shared nav styles (always needed for cart icon)
    const style = document.createElement('style');
    style.textContent = `
        .user-avatar-link {
            display: flex;
            align-items: center;
            text-decoration: none;
            margin-left: auto;
            gap: 0.5rem;
        }
        .user-greeting {
            color: #fff;
            font-weight: 600;
            font-size: 0.95rem;
            white-space: nowrap;
        }
        .user-avatar {
            width: 38px;
            height: 38px;
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
            font-size: 1.25rem;
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
            font-size: 0.65rem;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }
        .cart-badge.hidden {
            display: none;
        }
        .side-logout-btn {
            background: none;
            border: 2px solid #e74c3c;
            color: #e74c3c;
            padding: 0.75rem 1.5rem;
            border-radius: 5px;
            font-weight: 600;
            width: 100%;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
            margin-top: 1rem;
        }
        .side-logout-btn:hover {
            background-color: #e74c3c;
            color: #fff;
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
            authButtons.innerHTML = `
                <a href="${profilePath}" class="user-avatar-link">
                    <span class="user-greeting">Hi, ${firstName}</span>
                    <img src="${avatarUrl}" alt="Profile" class="user-avatar">
                </a>
                <a href="${cartPath}" class="nav-cart-link">
                    <i class="fas fa-shopping-cart"></i>
                    ${cartBadgeHTML}
                </a>
            `;
        } else if (container && !container.querySelector('.user-avatar-link')) {
            const avatarLink = document.createElement('a');
            avatarLink.href = profilePath;
            avatarLink.className = 'user-avatar-link';
            avatarLink.innerHTML = `<span class="user-greeting">Hi, ${firstName}</span><img src="${avatarUrl}" alt="Profile" class="user-avatar">`;
            container.appendChild(avatarLink);

            const cartEl = document.createElement('a');
            cartEl.href = cartPath;
            cartEl.className = 'nav-cart-link';
            cartEl.innerHTML = `<i class="fas fa-shopping-cart"></i>${cartBadgeHTML}`;
            container.appendChild(cartEl);
        }

        // --- Side menu: replace login/signup with logout ---
        const sideNav = document.querySelector('.side-nav');
        if (sideNav) {
            const loginBtnMobile = document.getElementById('loginBtnMobile');
            const signupBtnMobile = document.getElementById('signupBtnMobile');
            if (loginBtnMobile) loginBtnMobile.remove();
            if (signupBtnMobile) signupBtnMobile.remove();

            if (!sideNav.querySelector('.side-logout-btn')) {
                if (!sideNav.querySelector('hr')) {
                    sideNav.appendChild(document.createElement('hr'));
                }
                const logoutBtn = document.createElement('button');
                logoutBtn.className = 'side-logout-btn';
                logoutBtn.textContent = 'Logout';
                logoutBtn.addEventListener('click', () => {
                    MeatzaarAuth.logout();
                    window.location.reload();
                });
                sideNav.appendChild(logoutBtn);
            }
        }
    }
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
