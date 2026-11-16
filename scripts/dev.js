import http from 'node:http';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { inspectLegacy } from './verify-legacy.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const { html } = await inspectLegacy();
const headers = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.method !== 'GET') { response.writeHead(405, headers).end(); return; }
    if (url.pathname === '/') { response.writeHead(200, { ...headers, 'content-type': 'text/html; charset=utf-8' }).end(html); return; }
    const relative = url.pathname === '/order-intake' ? 'src/client/index.html' : url.pathname.slice(1);
    // Deliberately expose only source modules needed by the preview. Never cwd/private reports.
    if (!/^src\/(client|storage|parsers|domain)\/[a-z0-9-]+\.(?:js|html|css)$/.test(relative)) { response.writeHead(404, headers).end(); return; }
    const bytes = await fs.readFile(path.join(root, relative));
    const contentType = relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : 'text/html';
    response.writeHead(200, { ...headers, 'content-type': contentType + '; charset=utf-8', 'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" }).end(bytes);
  } catch { response.writeHead(404, headers).end(); }
});
server.listen(4173, '127.0.0.1', () => console.log('Local-only development preview: http://127.0.0.1:4173/order-intake'));
