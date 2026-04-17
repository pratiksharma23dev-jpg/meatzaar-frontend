const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.FRONTEND_PORT) || 3000;
const HOST = process.env.FRONTEND_HOST || '127.0.0.1';
const ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function safeResolve(urlPath) {
    const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
    const relPath = cleanPath === '/'
        ? 'landing page/index.html'
        : cleanPath.replace(/^\/+/, '');

    const normalized = path.normalize(relPath);
    if (normalized.startsWith('..')) return null;
    return path.join(ROOT, normalized);
}

const server = http.createServer((req, res) => {
    const filePath = safeResolve(req.url || '/');

    if (!filePath || !filePath.startsWith(ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (statErr, stats) => {
        let targetPath;
        if (statErr) {
            // Fallback: serve index.html for unknown routes (SPA/landing page)
            targetPath = path.join(ROOT, 'index.html');
        } else {
            targetPath = stats.isDirectory()
                ? path.join(filePath, 'index.html')
                : filePath;
        }

        fs.readFile(targetPath, (readErr, content) => {
            if (readErr) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Not Found');
                return;
            }
            const ext = path.extname(targetPath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        });
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Frontend server running on http://${HOST}:${PORT}`);
});
