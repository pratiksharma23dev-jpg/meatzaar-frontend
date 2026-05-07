// ==================== LOGIN/SIGNUP MODALS ====================
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
    const signupForm = document.getElementById('signupForm');
    const verifyForm = document.getElementById('verifyForm');
    const signupError = document.getElementById('signupError');
    const verifyError = document.getElementById('verifyError');
    const verifySuccess = document.getElementById('verifySuccess');
    const verifyEmailDisplay = document.getElementById('verifyEmailDisplay');
    const verificationCode = document.getElementById('verificationCode');

    if (signupForm) signupForm.style.display = 'flex';
    if (verifyForm) {
        verifyForm.style.display = 'none';
        verifyForm.reset();
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

    resetPasswordToggles(signupModal);
}

function openSignupModal() {
    resetSignupModalState();
    signupModal.classList.add('active');
    overlay.classList.add('active');
}

if (loginBtn) loginBtn.addEventListener('click', () => {
    loginModal.classList.add('active');
    overlay.classList.add('active');
});
if (loginBtnMobile) loginBtnMobile.addEventListener('click', () => {
    loginModal.classList.add('active');
    overlay.classList.add('active');
    sideMenu.classList.remove('active');
});
if (closeLoginModal) closeLoginModal.addEventListener('click', () => {
    loginModal.classList.remove('active');
    overlay.classList.remove('active');
});
if (signupBtn) signupBtn.addEventListener('click', () => {
    openSignupModal();
});
if (signupBtnMobile) signupBtnMobile.addEventListener('click', () => {
    openSignupModal();
    sideMenu.classList.remove('active');
});
if (closeSignupModal) closeSignupModal.addEventListener('click', () => {
    signupModal.classList.remove('active');
    overlay.classList.remove('active');
    resetSignupModalState();
});
if (switchToSignup) switchToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.remove('active');
    openSignupModal();
});
if (switchToLogin) switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupModal.classList.remove('active');
    loginModal.classList.add('active');
});

document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const icon = btn.querySelector('i');
        input.type = input.type === 'password' ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
});

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('loginError');
        if (errorEl) errorEl.style.display = 'none';

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        try {
            await MeatzaarAuth.login(
                document.getElementById('loginEmail').value.trim(),
                document.getElementById('loginPassword').value
            );
            window.location.reload();
        } catch (err) {
            if (errorEl) {
                errorEl.textContent = err.message;
                errorEl.style.display = 'block';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
}

const signupForm = document.getElementById('signupForm');
const verifyForm = document.getElementById('verifyForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('signupError');
        if (errorEl) errorEl.style.display = 'none';

        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirm').value;

        if (password !== confirmPassword) {
            if (errorEl) {
                errorEl.textContent = 'Passwords do not match.';
                errorEl.style.display = 'block';
            }
            return;
        }

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending code...';

        try {
            await MeatzaarAuth.sendVerification(name, email, password, confirmPassword);
            pendingSignupEmail = email;
            signupForm.style.display = 'none';
            verifyForm.style.display = 'block';
            document.getElementById('verifyEmailDisplay').textContent = email;
            document.getElementById('verificationCode').focus();
        } catch (err) {
            if (errorEl) {
                errorEl.textContent = err.message;
                errorEl.style.display = 'block';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Verification Code';
        }
    });
}

if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('verifyError');
        if (errorEl) errorEl.style.display = 'none';

        const submitBtn = verifyForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';

        try {
            await MeatzaarAuth.signup(pendingSignupEmail, document.getElementById('verificationCode').value.trim());
            window.location.reload();
        } catch (err) {
            if (errorEl) {
                errorEl.textContent = err.message;
                errorEl.style.display = 'block';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify & Create Account';
        }
    });
}

const backToSignup = document.getElementById('backToSignup');
if (backToSignup) backToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    if (verifyForm) verifyForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'flex';
});

const resendCode = document.getElementById('resendCode');
if (resendCode) resendCode.addEventListener('click', async (e) => {
    e.preventDefault();
    if (signupForm) signupForm.requestSubmit();
});
// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const closeMenu = document.getElementById('closeMenu');

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
    if (loginModal) {
        loginModal.classList.remove('active');
    }
    if (signupModal && signupModal.classList.contains('active')) {
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

// ==================== AUTH STATE ====================
const authButtons = document.getElementById('authButtons');
const profileLink = document.getElementById('profileLink');

if (typeof MeatzaarAuth !== 'undefined' && MeatzaarAuth.isLoggedIn()) {
    if (authButtons) authButtons.style.display = 'none';
    if (profileLink) profileLink.style.display = '';
} else {
    if (authButtons) authButtons.style.display = '';
    if (profileLink) profileLink.style.display = 'none';
}

// ==================== CLICKABLE CATEGORY CARDS ====================
const categoryCards = document.querySelectorAll('.category-card[data-href]');
categoryCards.forEach(card => {
    card.tabIndex = 0;
    card.setAttribute('role', 'link');

    card.addEventListener('click', () => {
        window.location.href = card.dataset.href;
    });

    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            window.location.href = card.dataset.href;
        }
    });
});
