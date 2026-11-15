const http = require('http');
const fs = require('fs');
const path = require('path');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

const appRoot = __dirname;
const distRoot = path.join(appRoot, 'dist');

function isInside(base, target) {
  const rel = path.relative(base, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

const server = http.createServer((req, res) => {
  let reqUrl;
  try {
    reqUrl = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400);
    return res.end();
  }

  let file;
  if (reqUrl === '/') {
    file = path.join(distRoot, 'index.html');
  } else {
    const cleanRel = reqUrl.replace(/^\/+/, '');
    const distCandidate = path.resolve(distRoot, cleanRel);
    const rootCandidate = path.resolve(appRoot, cleanRel);

    if (isInside(distRoot, distCandidate) && fs.existsSync(distCandidate) && fs.statSync(distCandidate).isFile()) {
      file = distCandidate;
    } else if (isInside(appRoot, rootCandidate) && fs.existsSync(rootCandidate) && fs.statSync(rootCandidate).isFile()) {
      file = rootCandidate;
    } else {
      file = distCandidate;
    }
  }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`File not found: ${reqUrl}. Run npm run build first.`);
    }

    const headers = {
      'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    };

    let start = 0;
    let end = stat.size - 1;
    let code = 200;

    if (req.headers.range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!m) {
        res.writeHead(416);
        return res.end();
      }
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), end) : end;
      if (start > end) {
        res.writeHead(416);
        return res.end();
      }
      code = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }

    headers['Content-Length'] = end - start + 1;
    res.writeHead(code, headers);
    fs.createReadStream(file, { start, end }).pipe(res);
  });
});

server.on('error', e => {
  console.error('Cannot start Ver4 server:', e.message);
  process.exitCode = 1;
});

const PORT = Number(process.env.PORT) || 8787;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Ver4 Native React Studio ready: http://127.0.0.1:${PORT}`);
});
