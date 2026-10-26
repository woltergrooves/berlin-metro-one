// Dev server zonder Vite: serveert src/ direct; three via import map. Usage: node devserve.mjs <repo> <three.js-checkout> [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const [root, threeRoot, port = '4180'] = process.argv.slice(2);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const importMap = `<script type="importmap">${JSON.stringify({ imports: { three: '/__three/build/three.module.js', 'three/addons/': '/__three/examples/jsm/', 'three/examples/jsm/': '/__three/examples/jsm/' } })}</script>`;
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<script type="module"', importMap + '<script type="module"');
    res.writeHead(200, { 'content-type': types['.html'] }); return res.end(html);
  }
  let f;
  if (p.startsWith('/__three/')) f = path.join(threeRoot, p.slice(9));
  else if (p.startsWith('/src/')) f = path.join(root, p);
  else f = path.join(root, 'public', p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(Number(port), () => console.log('dev', root, 'on', port));
