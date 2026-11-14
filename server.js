// Zero-dependency proxy + static server for market-compare.html
// Usage: node server.js   (Node 18+)  then open http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const UPSTREAMS = {
  '/api/kalshi/': 'https://api.elections.kalshi.com/trade-api/v2/',
  '/api/poly/': 'https://gamma-api.polymarket.com/',
};
const PAGE = path.join(__dirname, 'market-compare.html');

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const prefix = Object.keys(UPSTREAMS).find(p => url.pathname.startsWith(p));

  if (prefix) {
    const target = UPSTREAMS[prefix] + url.pathname.slice(prefix.length) + url.search;
    try {
      const upstream = await fetch(target, {
        headers: { accept: 'application/json', 'user-agent': 'market-compare/1.0' },
      });
      const body = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch (err) {
      console.error('Upstream error:', target, err.message);
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    fs.readFile(PAGE, (err, data) => {
      if (err) { res.writeHead(500); return res.end('market-compare.html not found next to server.js'); }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  res.writeHead(404); res.end('Not found');
}).listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));
