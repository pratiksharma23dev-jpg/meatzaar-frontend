// ==================== SHOW/HIDE PASSWORD ====================
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const closeMenu = document.getElementById('closeMenu');

const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const loginBtnMobile = document.getElementById('loginBtnMobile');
const signupBtnMobile = document.getElementById('signupBtnMobile');

const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const closeSignupModal = document.getElementById('closeSignupModal');

const switchToSignup = document.getElementById('switchToSignup');
const switchToLogin = document.getElementById('switchToLogin');
let pendingSignupEmail = '';

function resetPasswordToggles(scope) {
    if (!scope) return;

    scope.querySelectorAll('.password-wrapper input').forEach(input => {
        input.type = 'password';
    });

    scope.querySelectorAll('.toggle-password i').forEach(icon => {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    });
}

function resetSignupModalState() {
    const signupFormEl = document.getElementById('signupForm');
    const verifyFormEl = document.getElementById('verifyForm');
    const signupError = document.getElementById('signupError');
    const verifyError = document.getElementById('verifyError');
    const verifySuccess = document.getElementById('verifySuccess');
    const verifyEmailDisplay = document.getElementById('verifyEmailDisplay');
    const verificationCode = document.getElementById('verificationCode');

    if (signupFormEl) signupFormEl.style.display = 'flex';
    if (verifyFormEl) {
        verifyFormEl.style.display = 'none';
        verifyFormEl.reset();
    }

    if (signupError) {
        signupError.textContent = '';
        signupError.style.display = 'none';
    }
    if (verifyError) {
        verifyError.textContent = '';
        verifyError.style.display = 'none';
    }
    if (verifySuccess) {
        verifySuccess.textContent = '';
        verifySuccess.style.display = 'none';
    }
    if (verifyEmailDisplay) {
        verifyEmailDisplay.textContent = '';
    }
    if (verificationCode) {
        verificationCode.value = '';
    }

    pendingSignupEmail = '';
    resetPasswordToggles(signupModal);
}

function openSignupModal() {
    resetSignupModalState();
    signupModal.classList.add('active');
    overlay.classList.add('active');
}

// ==================== SIDE MENU ==================== 
menuToggle.addEventListener('click', () => {
    sideMenu.classList.add('active');
    overlay.classList.add('active');
});

closeMenu.addEventListener('click', () => {
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
});

overlay.addEventListener('click', () => {
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
    if (loginModal.classList.contains('active')) {
        loginModal.classList.remove('active');
    }
    if (signupModal.classList.contains('active')) {
        signupModal.classList.remove('active');
        resetSignupModalState();
    }
});

// Close menu when a regular link is clicked
const sideLinks = document.querySelectorAll('.side-link');
sideLinks.forEach(link => {
    link.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        overlay.classList.remove('active');
    });
});

// ==================== SHOP NOW ====================
const shopNowBtn = document.getElementById('shopNowBtn');
if (shopNowBtn) {
    shopNowBtn.addEventListener('click', () => {
        window.location.href = '../product_list/product_list.html';
    });
}

// ==================== LOGIN/SIGNUP MODALS ==================== 
// Auto-open modal from URL param (e.g. ?action=login or ?action=signup)
const urlAction = new URLSearchParams(window.location.search).get('action');
if (urlAction === 'login') {
    loginModal.classList.add('active');
    overlay.classList.add('active');
} else if (urlAction === 'signup') {
    openSignupModal();
}

// Login Modal
loginBtn.addEventListener('click', () => {
    loginModal.classList.add('active');
    overlay.classList.add('active');
});

loginBtnMobile.addEventListener('click', () => {
    loginModal.classList.add('active');
    overlay.classList.add('active');
    sideMenu.classList.remove('active');
});

closeLoginModal.addEventListener('click', () => {
    loginModal.classList.remove('active');
    overlay.classList.remove('active');
});

// Sign Up Modal
signupBtn.addEventListener('click', () => {
    openSignupModal();
});

signupBtnMobile.addEventListener('click', () => {
    openSignupModal();
    sideMenu.classList.remove('active');
});

closeSignupModal.addEventListener('click', () => {
    signupModal.classList.remove('active');
    overlay.classList.remove('active');
    resetSignupModalState();
});

// Switch between Login and Sign Up
switchToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.remove('active');
    openSignupModal();
});

switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupModal.classList.remove('active');
    loginModal.classList.add('active');
});

// ==================== FORM HANDLING ====================
// Login Form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('loginError');
        errorEl.style.display = 'none';

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        try {
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            await MeatzaarAuth.login(email, password);

            loginForm.reset();
            loginModal.classList.remove('active');
            overlay.classList.remove('active');
            window.location.reload();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        } finally {
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
}

// Signup Form — Step 1: Send verification code
const signupForm = document.getElementById('signupForm');
const verifyForm = document.getElementById('verifyForm');

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('signupError');
        errorEl.style.display = 'none';

        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirm').value;

        if (password !== confirmPassword) {
            errorEl.textContent = 'Passwords do not match.';
            errorEl.style.display = 'block';
            return;
        }

        try {
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending code...';

            await MeatzaarAuth.sendVerification(name, email, password, confirmPassword);

            pendingSignupEmail = email;
            signupForm.style.display = 'none';
            verifyForm.style.display = 'block';
            document.getElementById('verifyEmailDisplay').textContent = email;
            document.getElementById('verificationCode').focus();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        } finally {
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Verification Code';
        }
    });
}

// Step 2: Verify code & create account
if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('verifyError');
        const successEl = document.getElementById('verifySuccess');
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        const code = document.getElementById('verificationCode').value.trim();

        try {
            const submitBtn = verifyForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verifying...';

            await MeatzaarAuth.signup(pendingSignupEmail, code);

            signupForm.reset();
            verifyForm.reset();
            signupModal.classList.remove('active');
            overlay.classList.remove('active');
            window.location.reload();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        } finally {
            const submitBtn = verifyForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify & Create Account';
        }
    });

    // Back button
    document.getElementById('backToSignup').addEventListener('click', (e) => {
        e.preventDefault();
        verifyForm.style.display = 'none';
        signupForm.style.display = 'block';
        document.getElementById('verifyError').style.display = 'none';
        document.getElementById('verifySuccess').style.display = 'none';
    });

    // Resend code
    document.getElementById('resendCode').addEventListener('click', async (e) => {
        e.preventDefault();
        const successEl = document.getElementById('verifySuccess');
        const errorEl = document.getElementById('verifyError');
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        try {
            const name = document.getElementById('signupName').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirm').value;
            await MeatzaarAuth.sendVerification(name, pendingSignupEmail, password, confirmPassword);
            successEl.textContent = 'A new code has been sent to your email.';
            successEl.style.display = 'block';
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        }
    });
}

// ==================== SEARCH DROPDOWN ==================== 
const searchInput = document.getElementById('searchInput');
const searchDropdown = document.getElementById('searchDropdown');

if (searchInput && searchDropdown && typeof productCatalog !== 'undefined') {
    const MAX_DROPDOWN_RESULTS = 8;

    function fuzzyScore(query, target) {
        query = query.toLowerCase();
        target = target.toLowerCase();
        if (target.includes(query)) return 1;
        const queryWords = query.split(/\s+/).filter(Boolean);
        const targetWords = target.split(/\s+/).filter(Boolean);
        let wordMatchCount = 0;
        for (const qw of queryWords) {
            for (const tw of targetWords) {
                if (tw.includes(qw) || qw.includes(tw)) { wordMatchCount++; break; }
            }
        }
        if (wordMatchCount === queryWords.length) return 0.9;
        const bigrams = (s) => {
            const b = new Set();
            for (let i = 0; i < s.length - 1; i++) b.add(s[i] + s[i + 1]);
            return b;
        };
        const qBigrams = bigrams(query);
        const tBigrams = bigrams(target);
        if (qBigrams.size === 0 || tBigrams.size === 0) return 0;
        let intersect = 0;
        for (const b of qBigrams) { if (tBigrams.has(b)) intersect++; }
        return (2 * intersect) / (qBigrams.size + tBigrams.size);
    }

    function fuzzyMatchProduct(product, searchTerm) {
        const fields = [
            product.name,
            product.category.replace(/-/g, ' '),
            product.country,
            product.classification,
            (categoryLabels[product.category] || '')
        ];
        let best = 0;
        for (const f of fields) {
            const s = fuzzyScore(searchTerm, f);
            if (s > best) best = s;
        }
        return best;
    }

    function searchAllProducts(searchTerm) {
        if (!searchTerm) return [];
        const exact = productCatalog.filter(product =>
            product.name.toLowerCase().includes(searchTerm)
            || product.category.replace(/-/g, ' ').toLowerCase().includes(searchTerm)
            || product.country.toLowerCase().includes(searchTerm)
            || product.classification.toLowerCase().includes(searchTerm)
            || (categoryLabels[product.category] || '').toLowerCase().includes(searchTerm)
        );
        if (exact.length > 0) return exact;
        const FUZZY_THRESHOLD = 0.3;
        return productCatalog
            .map(product => ({ product, score: fuzzyMatchProduct(product, searchTerm) }))
            .filter(item => item.score >= FUZZY_THRESHOLD)
            .sort((a, b) => b.score - a.score)
            .map(item => item.product);
    }

    function renderSearchDropdown() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (!searchTerm) {
            searchDropdown.classList.remove('active');
            searchDropdown.innerHTML = '';
            return;
        }
        const results = searchAllProducts(searchTerm);
        if (results.length === 0) {
            searchDropdown.innerHTML = '<div class="search-dropdown-empty">No products found</div>';
            searchDropdown.classList.add('active');
            return;
        }
        const shown = results.slice(0, MAX_DROPDOWN_RESULTS);
        let html = shown.map(product => {
            const catLabel = categoryLabels[product.category] || product.category;
            return `
                <a href="../product_template/product_template.html?product=${product.id}" class="search-dropdown-item">
                    <img src="${product.image}" alt="${product.name}">
                    <div class="search-dropdown-info">
                        <div class="search-dropdown-name">${product.name}</div>
                        <div class="search-dropdown-meta">${catLabel} &bull; ${product.weight}</div>
                    </div>
                    <span class="search-dropdown-price">\u20B9${product.price.toLocaleString()}</span>
                </a>`;
        }).join('');
        if (results.length > MAX_DROPDOWN_RESULTS) {
            html += `<a href="../product_list/product_list.html" class="search-dropdown-viewall">${results.length - MAX_DROPDOWN_RESULTS} more results — view all products</a>`;
        }
        searchDropdown.innerHTML = html;
        searchDropdown.classList.add('active');
    }

    searchInput.addEventListener('input', renderSearchDropdown);
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) renderSearchDropdown();
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            searchDropdown.classList.remove('active');
        }
    });
}

// ==================== REVIEW CARDS SCROLL ANIMATION ====================
const reviewObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            reviewObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.review-card').forEach(card => {
    reviewObserver.observe(card);
});
