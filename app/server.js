// Minimal zero-dependency web server for the LoanLens app.
// Serves static files from ./public and a small JSON API backed by ./data/loans.json.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'loans.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(body));
}

function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/health') return sendJson(res, 200, { status: 'ok' });

  if (url.pathname === '/api/loans') {
    const loans = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const filtered = loans.filter(
      (l) => (!type || l.type === type) && (!status || l.status === status),
    );
    return sendJson(res, 200, filtered);
  }

  if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Not found' });

  const rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: 'Forbidden' });

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function start(port = Number(process.env.PORT) || 3000) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.once('error', reject);
    server.listen(port, () => resolve(server));
  });
}

if (require.main === module) {
  start().then((s) => console.log(`LoanLens running at http://localhost:${s.address().port}`));
}

module.exports = { start };
