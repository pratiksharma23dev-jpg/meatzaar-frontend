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
    signupModal.classList.add('active');
    overlay.classList.add('active');
});
if (signupBtnMobile) signupBtnMobile.addEventListener('click', () => {
    signupModal.classList.add('active');
    overlay.classList.add('active');
    sideMenu.classList.remove('active');
});
if (closeSignupModal) closeSignupModal.addEventListener('click', () => {
    signupModal.classList.remove('active');
    overlay.classList.remove('active');
    const vf = document.getElementById('verifyForm');
    const sf = document.getElementById('signupForm');
    if (vf) vf.style.display = 'none';
    if (sf) sf.style.display = 'block';
});
if (switchToSignup) switchToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.remove('active');
    signupModal.classList.add('active');
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