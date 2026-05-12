/**
 * ProjectIQ — Combined server
 * - Starts the API (Express) as a child process on localhost:5558
 * - Serves the React client (dist/) + proxies /api/* to the Express API
 * - Binds to localhost by default; set PROJECTIQ_HOST for a private interface
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'client/dist');
const API_INTERNAL_PORT = 5558;
const PORT = Number(process.env.PROJECTIQ_PORT || process.env.PORT || 5555);
const HOST = process.env.PROJECTIQ_HOST || '127.0.0.1';

const mime = {
  '.html': 'text/html', '.js': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff'
};

// Start the Express API as a child process
const api = spawn('node', [path.join(__dirname, 'api/dist/index.js')], {
  env: { ...process.env, PORT: String(API_INTERNAL_PORT), DATA_DIR: path.join(__dirname, 'api/data') },
  stdio: 'inherit'
});
api.on('error', e => console.error('API error:', e));
api.on('exit', code => { if (code !== 0) console.error('API exited:', code); });

function proxyToApi(req, res) {
  const opts = {
    hostname: '127.0.0.1', port: API_INTERNAL_PORT,
    path: req.url, method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${API_INTERNAL_PORT}` }
  };
  const proxy = http.request(opts, pr => {
    res.writeHead(pr.statusCode, pr.headers);
    pr.pipe(res);
  });
  proxy.on('error', e => { res.writeHead(502); res.end('API unavailable'); });
  req.pipe(proxy);
}

// Wait a moment for API to start, then open the proxy server
setTimeout(() => {
  http.createServer((req, res) => {
    if (req.url.startsWith('/api')) return proxyToApi(req, res);
    let filePath = req.url === '/' ? path.join(DIST, 'index.html') : path.join(DIST, req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) filePath = path.join(DIST, 'index.html');
    const ext = path.extname(filePath);
    try {
      const headers = { 'Content-Type': mime[ext] || 'text/plain' };
      if (ext === '.html') headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    } catch(e) { res.writeHead(500); res.end('Error'); }
  }).listen(PORT, HOST, () => console.log(`ProjectIQ listening on ${HOST}:${PORT}`));
}, 2000);

process.on('SIGTERM', () => { api.kill(); process.exit(0); });
process.on('SIGINT',  () => { api.kill(); process.exit(0); });
