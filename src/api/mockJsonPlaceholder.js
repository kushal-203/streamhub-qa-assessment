// Local stand-in for https://jsonplaceholder.typicode.com used ONLY when the real API is unreachable
// (TEST_ENV=mock). It mirrors JSONPlaceholder's documented behaviour for POST /posts: it is a fake
// json-server that performs no validation, echoes the JSON body and assigns id 101 with HTTP 201.
// Results produced against this mock are labelled as such in /results.
const http = require('http');

function startMock(port) {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      if (req.method === 'POST' && req.url === '/posts') {
        let body;
        try { body = raw ? JSON.parse(raw) : {}; } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ...body, id: 101 }));
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

module.exports = { startMock };
