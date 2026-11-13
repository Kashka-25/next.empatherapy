// Tiny static server for the Golden Pause preview (test use only).
//   node _test/serve.js [port]        (run from the preview folder; default port 8765)
// Serves the preview folder on 127.0.0.1 with byte ranges (video seeking needs them).
// Test helpers: /_slow/<file> serves _test/<file> after a 4 s delay (to test the 1.5 s fallback).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8765);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.webm': 'audio/webm',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function send(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
    if (range) {
      let start = range[1] === '' ? Math.max(0, st.size - Number(range[2])) : Number(range[1]);
      let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : st.size - 1;
      end = Math.min(end, st.size - 1);
      if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); res.end(); return; }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { ...headers, 'Content-Length': st.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    }
  });
}

http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); res.end(); return; }
  let delay = 0;
  if (p.startsWith('/_slow/')) { delay = 4000; p = '/_test/' + p.slice('/_slow/'.length); }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.resolve(ROOT, '.' + p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  setTimeout(() => send(req, res, file), delay);
}).listen(PORT, '127.0.0.1', () => console.log(`Golden Pause preview on http://127.0.0.1:${PORT}/  (root ${ROOT})`));
