// Global API configuration for vanilla HTML/CSS/JS pages.
// Always use deployed backend.
(function () {
    const PROD_BACKEND_ORIGIN = 'https://meatzaar-backend.onrender.com';
    const normalizedOrigin = PROD_BACKEND_ORIGIN.replace(/\/+$/, '');
    window.BASE_URL = normalizedOrigin;
    window.API_BASE = `${normalizedOrigin}/api`;
    window.ADMIN_API_BASE = `${normalizedOrigin}/api/admin`;
})();
