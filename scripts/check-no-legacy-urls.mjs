// Fails when any source file still points at an old berlin-metro-*.vercel.app deployment.
import fs from 'node:fs';
import path from 'node:path';
const roots = ['index.html', 'src'];
const hits = [];
const walk = p => fs.statSync(p).isDirectory() ? fs.readdirSync(p).forEach(n => walk(path.join(p, n))) : /\.(m?js|html|css|json)$/.test(p) && !p.startsWith(path.join('src', 'missing')) && fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => /berlin-metro[a-z0-9-]*\.vercel\.app/.test(l) && hits.push(`${p}:${i + 1}`));
roots.forEach(walk);
if (hits.length) { console.error('Legacy deployment URLs found:\n' + hits.join('\n')); process.exit(1); }
console.log('OK – no references to old deployments.');
