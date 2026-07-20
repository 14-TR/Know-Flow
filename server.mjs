/**
 * ProjectIQ — Combined server
 * - Starts the API (Express) as a child process on localhost:5558
 * - Serves the React client (dist/) + proxies /api/* to the Express API
 * - Binds to localhost by default; set PROJECTIQ_HOST for a private interface
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'client/dist');
const API_INTERNAL_PORT = 5558;
const PORT = Number(process.env.PROJECTIQ_PORT || process.env.PORT || 5555);
const HOST = process.env.PROJECTIQ_HOST || '127.0.0.1';
const API_HOST = '127.0.0.1';
const API_HEALTH_PATH = '/api/health';
const API_WAIT_TIMEOUT_MS = 10000;

const mime = {
  '.html': 'text/html', '.js': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff'
};

let api = null;

function isHealthyApiResponse(body) {
  try {
    const parsed = JSON.parse(body);
    return parsed && parsed.status === 'ok';
  } catch {
    return false;
  }
}

function requestLocal(options) {
  return new Promise(resolve => {
    const req = http.request(options, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          reachable: true,
          statusCode: res.statusCode,
          body
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', error => resolve({ reachable: false, error }));
    req.end();
  });
}

function requestApiHealth() {
  return requestLocal({
    hostname: API_HOST,
    port: API_INTERNAL_PORT,
    path: API_HEALTH_PATH,
    method: 'GET',
    timeout: 1500
  });
}

function canListen(port, host) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', error => {
      resolve({ ok: false, error });
    });
    server.once('listening', () => {
      server.close(() => resolve({ ok: true }));
    });
    server.listen(port, host);
  });
}

async function waitForApiHealth(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const health = await requestApiHealth();
    if (health.reachable && health.statusCode === 200 && isHealthyApiResponse(health.body)) return true;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}

async function ensureApiAvailable() {
  const initialHealth = await requestApiHealth();
  if (initialHealth.reachable && initialHealth.statusCode === 200 && isHealthyApiResponse(initialHealth.body)) {
    console.log(`Reusing existing ProjectIQ API on ${API_HOST}:${API_INTERNAL_PORT}`);
    return;
  }

  const portCheck = await canListen(API_INTERNAL_PORT, API_HOST);
  if (!portCheck.ok) {
    const code = portCheck.error && portCheck.error.code;
    if (code === 'EADDRINUSE') {
      const occupiedHealth = await requestApiHealth();
      if (occupiedHealth.reachable && occupiedHealth.statusCode === 200 && isHealthyApiResponse(occupiedHealth.body)) {
        console.log(`Reusing existing ProjectIQ API on ${API_HOST}:${API_INTERNAL_PORT}`);
        return;
      }
      throw new Error(`Port ${API_INTERNAL_PORT} is already in use by a non-ProjectIQ service`);
    }
    throw portCheck.error;
  }

  api = spawn('node', [path.join(__dirname, 'api/dist/index.js')], {
    env: { ...process.env, PORT: String(API_INTERNAL_PORT), DATA_DIR: path.join(__dirname, 'api/data') },
    stdio: 'inherit'
  });
  api.on('error', e => console.error('API error:', e));
  api.on('exit', code => {
    if (code !== 0) console.error('API exited:', code);
  });

  const healthy = await waitForApiHealth(API_WAIT_TIMEOUT_MS);
  if (!healthy) {
    throw new Error(`ProjectIQ API did not become healthy on port ${API_INTERNAL_PORT}`);
  }
}

async function isExistingCombinedServer() {
  const root = await requestLocal({
    hostname: HOST,
    port: PORT,
    path: '/',
    method: 'GET',
    timeout: 1500
  });
  if (!root.reachable || root.statusCode !== 200) return false;

  const health = await requestLocal({
    hostname: HOST,
    port: PORT,
    path: API_HEALTH_PATH,
    method: 'GET',
    timeout: 1500
  });
  return health.reachable && health.statusCode === 200 && isHealthyApiResponse(health.body);
}

function formatPortInUseMessage(port, host, envVarName) {
  return `Port ${port} on ${host} is already in use by a non-ProjectIQ service. Stop the conflicting process or rerun with ${envVarName}=<open-port>.`;
}

function proxyToApi(req, res) {
  const opts = {
    hostname: API_HOST, port: API_INTERNAL_PORT,
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

async function start() {
  await ensureApiAvailable();
  const webPortCheck = await canListen(PORT, HOST);
  if (!webPortCheck.ok) {
    const code = webPortCheck.error && webPortCheck.error.code;
    if (code === 'EADDRINUSE' && await isExistingCombinedServer()) {
      console.log(`ProjectIQ combined server already running on ${HOST}:${PORT}`);
      return;
    }
    if (code === 'EADDRINUSE') {
      throw new Error(formatPortInUseMessage(PORT, HOST, 'PROJECTIQ_PORT'));
    }
    throw webPortCheck.error;
  }
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
}

start().catch(error => {
  console.error(error.message || error);
  if (api) api.kill();
  process.exit(1);
});

process.on('SIGTERM', () => { if (api) api.kill(); process.exit(0); });
process.on('SIGINT',  () => { if (api) api.kill(); process.exit(0); });
