// Global API configuration for vanilla HTML/CSS/JS pages.
// Local dev -> localhost backend, production -> Render backend.
(function () {
    const DEV_BACKEND_ORIGIN = 'http://localhost:3000';
    const PROD_BACKEND_ORIGIN = 'https://meatzaar-backend.onrender.com';

    const isLocal =
        window.location.protocol === 'file:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    const origin = isLocal ? DEV_BACKEND_ORIGIN : PROD_BACKEND_ORIGIN;
    const normalizedOrigin = origin.replace(/\/+$/, '');

    window.BASE_URL = normalizedOrigin;
    window.API_BASE = `${normalizedOrigin}/api`;
    window.ADMIN_API_BASE = `${normalizedOrigin}/api/admin`;
})();
