// Tiny static server for the shared web app. Used by `npm run web` and by the desktop app.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..', 'web');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.task': 'application/octet-stream' };

// The operating system's own notification sounds, served from where the OS keeps them.
const SOUND_DIR = process.platform === 'win32' ? path.join(process.env.WINDIR || 'C:\\Windows', 'Media') : '/System/Library/Sounds';
const SOUNDS = process.platform === 'win32'
  ? { message: 'Windows Notify Messaging.wav', email: 'Windows Notify Email.wav', calendar: 'Windows Notify Calendar.wav', call: 'Ring01.wav', system: 'Windows Notify System Generic.wav', critical: 'Windows Exclamation.wav' }
  : { message: 'Tink.aiff', email: 'Glass.aiff', calendar: 'Ping.aiff', call: 'Submarine.aiff', system: 'Pop.aiff', critical: 'Sosumi.aiff' };

function serve(port = 8770) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const sound = /^\/system-sound\/(\w+)$/.exec(req.url.split('?')[0]);
      if (sound) {
        const name = SOUNDS[sound[1]];
        if (!name) { res.writeHead(404); res.end(); return; }
        fs.readFile(path.join(SOUND_DIR, name), (err, body) => {
          if (err) { res.writeHead(404); res.end(); return; }
          res.writeHead(200, { 'Content-Type': name.endsWith('.wav') ? 'audio/wav' : 'audio/aiff', 'Cache-Control': 'max-age=3600' }); res.end(body);
        });
        return;
      }
      let file;
      try {
        const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
      } catch { res.writeHead(400); res.end('bad request'); return; }
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }   // stay inside web/
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
