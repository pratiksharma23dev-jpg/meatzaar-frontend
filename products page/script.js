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
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

if (typeof MeatzaarAuth !== 'undefined' && MeatzaarAuth.isLoggedIn()) {
    authButtons.style.display = 'none';
    profileLink.style.display = '';
} else {
    authButtons.style.display = '';
    profileLink.style.display = 'none';
}

loginBtn.addEventListener('click', () => {
    window.location.href = '../landing page/index.html?action=login';
});

signupBtn.addEventListener('click', () => {
    window.location.href = '../landing page/index.html?action=signup';
});