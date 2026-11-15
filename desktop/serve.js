// Tiny static server for the shared web app. Used by `npm run web` and by the desktop app.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..', 'web');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.task': 'application/octet-stream' };

function serve(port = 8770) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\.\./g, '');
      const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
      fs.readFile(file, (err, body) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(body);
      });
    });
    server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}
module.exports = { serve };
if (require.main === module) serve(+process.env.PORT || 8770).then(({ url }) => console.log('Rest Easy (web) on ' + url));
