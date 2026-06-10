// Global API configuration for vanilla HTML/CSS/JS pages.
(function () {
    const PROD_BACKEND_ORIGIN = 'https://meatzaar-backend.onrender.com';
    const LOCAL_BACKEND_ORIGIN = 'http://localhost:3000';
    const LEGACY_LOCAL_BACKEND_ORIGIN = 'http://localhost:5000';
    const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
    const isLocal = localHosts.has(window.location.hostname);
    // Only allow override via the window global (set at build/deploy time), never via localStorage.
    // Accepting an attacker-controlled localStorage value would let any XSS redirect all API
    // traffic to a malicious server and capture credentials.
    const overrideOrigin = window.MEATZAAR_BACKEND_ORIGIN || null;
    const backendOrigin = overrideOrigin
        || (isLocal ? LOCAL_BACKEND_ORIGIN : PROD_BACKEND_ORIGIN);
    const normalizedOrigin = backendOrigin.replace(/\/+$/, '');
    const fallbackOrigins = [];

    if (isLocal && normalizedOrigin !== PROD_BACKEND_ORIGIN && !overrideOrigin) {
        fallbackOrigins.push(LEGACY_LOCAL_BACKEND_ORIGIN);
        fallbackOrigins.push(PROD_BACKEND_ORIGIN);
    }

    window.BASE_URL = normalizedOrigin;
    window.API_BASE = `${normalizedOrigin}/api`;
    window.ADMIN_API_BASE = `${normalizedOrigin}/api/admin`;
    window.API_FALLBACK_BASES = [...new Set(fallbackOrigins)]
        .map(origin => `${origin.replace(/\/+$/, '')}/api`);
    window.ADMIN_API_FALLBACK_BASES = [...new Set(fallbackOrigins)]
        .map(origin => `${origin.replace(/\/+$/, '')}/api/admin`);
})();
