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