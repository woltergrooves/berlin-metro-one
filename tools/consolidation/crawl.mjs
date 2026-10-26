import fs from 'node:fs/promises';
import path from 'node:path';

const ENTRY = process.argv[2];
const OUT = process.argv[3] || './mirror';
const ASSET_EXT = /\.(glb|gltf|bin|png|jpe?g|webp|ktx2|hdr|mp3|ogg|wav|m4a|json|css|svg|woff2?|ttf)$/i;

const files = new Map();
const edges = [];
const unresolved = [];
const assetMentions = [];
let importMap = {};

function local(url) {
  const u = new URL(url);
  let p = u.pathname;
  if (p.endsWith('/')) p += 'index.html';
  return path.join(OUT, u.host, decodeURIComponent(p));
}

function mapSpecifier(spec, base) {
  if (importMap[spec]) return { url: new URL(importMap[spec], ENTRY).href, mapped: spec };
  let abs;
  try { abs = new URL(spec, base).href; } catch { return null; }
  if (importMap[abs]) return { url: new URL(importMap[abs], ENTRY).href, mapped: abs };
  return { url: abs };
}

async function fetchFile(url, from, kind, spec) {
  edges.push({ from, to: url, kind, specifier: spec });
  if (files.has(url)) { files.get(url).from.add(from); return null; }
  const rec = { from: new Set([from]), status: null };
  files.set(url, rec);
  if (url.includes('cdn.jsdelivr.net') || url.includes('unpkg.com')) { rec.status = 'external-cdn'; return null; }
  try {
    const res = await fetch(url);
    rec.status = res.status;
    rec.type = res.headers.get('content-type') || '';
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    rec.bytes = buf.length;
    rec.localPath = local(url);
    await fs.mkdir(path.dirname(rec.localPath), { recursive: true });
    await fs.writeFile(rec.localPath, buf);
    return { buf, type: rec.type };
  } catch (e) { rec.status = 'error: ' + e.message; return null; }
}

const queue = [];
function enqueue(url, from, kind, spec) { queue.push({ url, from, kind, spec }); }

function scanJs(text, base) {
  const out = [];
  const consts = {};
  for (const m of text.matchAll(/\b(?:const|let|var)\s+([A-Z_a-z][\w$]*)\s*=\s*['"`]([^'"`$]+)['"`]/g)) consts[m[1]] = m[2];
  text = text.replace(/`([^`]*)`/g, (all, body) => {
    const exp = body.replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (a, n) => (n in consts ? consts[n] : a));
    return exp.includes('${') ? all : "'" + exp + "'";
  });
  for (const m of text.matchAll(/\bimport\s*\(\s*([A-Za-z_$][\w$]*)\s*\+\s*['"]([^'"]+)['"]\s*\)/g)) if (m[1] in consts) out.push([consts[m[1]] + m[2], 'dynamic-concat']);
  const re = [
    [/\bimport\s+(?:[^'"`;]*?\s+from\s+)?['"]([^'"]+)['"]/g, 'static'],
    [/\bexport\s+[^'"`;]*?\s+from\s+['"]([^'"]+)['"]/g, 'reexport'],
    [/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, 'dynamic'],
    [/new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g, 'url'],
  ];
  for (const [r, kind] of re) for (const m of text.matchAll(r)) out.push([m[1], kind]);
  for (const m of text.matchAll(/\bimport\s*\(\s*([^'")][^)]{0,200})\)/g)) unresolved.push({ base, expr: m[1].trim() });
  for (const m of text.matchAll(/['"`]([^'"`\s]{3,300})['"`]/g)) {
    const s = m[1];
    if (s.includes('${')) { if (ASSET_EXT.test(s) || /vercel\.app/.test(s)) unresolved.push({ base, expr: s }); continue; }
    if (ASSET_EXT.test(s.split('?')[0])) { assetMentions.push({ base, s }); out.push([s, 'asset']); }
    else if (/^https:\/\/berlin-metro[^/]*\.vercel\.app\//.test(s)) out.push([s, 'url-literal']);
  }
  return out;
}

function scanCss(text, base) {
  return [...text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(m => [m[1], 'css-url'])
    .concat([...text.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map(m => [m[1], 'css-import']));
}

function scanHtml(text, base) {
  const out = [];
  const im = text.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (im) {
    const map = JSON.parse(im[1]).imports || {};
    for (const [k, v] of Object.entries(map)) importMap[k] = v;
    for (const v of Object.values(map)) out.push([v, 'importmap-target']);
  }
  for (const m of text.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) if (!m[1].includes('vercel.live')) out.push([m[1], 'script']);
  for (const m of text.matchAll(/<link[^>]*\shref="([^"]+)"/g)) out.push([m[1], 'link']);
  for (const m of text.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) out.push(...scanJs(m[1], base));
  return out;
}

enqueue(ENTRY, '(root)', 'entry', ENTRY);
for (const seed of (process.argv[4] ? JSON.parse(await fs.readFile(process.argv[4], 'utf8')) : [])) enqueue(seed, '(runtime-probe)', 'runtime', seed);
while (queue.length) {
  const { url, from, kind, spec } = queue.shift();
  const got = await fetchFile(url, from, kind, spec);
  if (!got) continue;
  const text = got.buf.toString('utf8');
  const clean = url.split('?')[0];
  let refs = [];
  if (/\.html$|\/$/.test(clean) || got.type.includes('html')) refs = scanHtml(text, url);
  else if (/\.m?js$/.test(clean) || got.type.includes('javascript')) refs = scanJs(text, url);
  else if (/\.css$/.test(clean)) refs = scanCss(text, url);
  for (const [s, k] of refs) {
    if (s.startsWith('data:') || s.startsWith('blob:')) continue;
    if (k === 'asset' && !/^(\.|\/|https?:)/.test(s)) {
      const m = mapSpecifier('/' + s.replace(/^\/+/, ''), url); if (m) enqueue(m.url, url, 'asset-root', s);
      continue;
    }
    const m = mapSpecifier(s, url);
    if (m) enqueue(m.url, url, k + (m.mapped ? ' (importmap)' : ''), s);
  }
}

const manifest = {
  entry: ENTRY, crawledAt: new Date().toISOString(), importMap,
  files: [...files].map(([url, r]) => ({ url, status: r.status, type: r.type, bytes: r.bytes, localPath: r.localPath, referencedBy: [...r.from] })),
  edges, unresolved, assetMentions,
};
await fs.writeFile(path.join(OUT, '..', 'manifest.json'), JSON.stringify(manifest, null, 2));
const ok = manifest.files.filter(f => f.status === 200), bad = manifest.files.filter(f => f.status !== 200 && f.status !== 'external-cdn');
console.log(`files ok=${ok.length} failed=${bad.length} unresolved=${unresolved.length} bytes=${ok.reduce((a, f) => a + f.bytes, 0)}`);
for (const f of bad) console.log('FAIL', f.status, f.url);
const hosts = {}; for (const f of ok) { const h = new URL(f.url).host; hosts[h] = (hosts[h] || 0) + 1; }
console.log('hosts', Object.keys(hosts).length); for (const [h, n] of Object.entries(hosts).sort((a, b) => b[1] - a[1])) console.log(' ', n, h);
