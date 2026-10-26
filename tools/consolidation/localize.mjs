// Turns the crawled deployment graph into ONE self-contained project.
// Every module that lived at https://berlin-metro-<hash>-wolter1.vercel.app/<path> gets exactly one
// local file; every import specifier is rewritten to a relative local path; import-map remaps are
// baked in; assets go to public/. No URL to an old deployment survives.
// Usage: node localize.mjs <manifest.json> <extraAssetsMirrorDir> <outProjectDir>
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { init, parse } from 'es-module-lexer';

await init;
const [manifestPath, extraMirror, OUT] = process.argv.slice(2);
const M = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const ENTRY = M.entry;
const ENTRY_HOST = new URL(ENTRY).host;
const DEPLOY_RE = /^https:\/\/berlin-metro-[a-z0-9-]+\.vercel\.app\//;
const hashOf = host => host.replace(/^berlin-metro-/, '').replace(/-wolter1\.vercel\.app$/, '');
const importMap = M.importMap;

// ---------- 1. collect files ----------
const okFiles = M.files.filter(f => f.status === 200 && DEPLOY_RE.test(f.url));
const missing = M.files.filter(f => f.status === 404 && DEPLOY_RE.test(f.url) && /\.m?js$/.test(f.url.split('?')[0]));
// extra assets fetched separately (station GLBs, train .gz) that are only referenced by computed URLs
const extra = [];
async function walk(dir) { for (const e of await fs.readdir(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); e.isDirectory() ? await walk(p) : extra.push(p); } }
if (extraMirror && fss.existsSync(extraMirror)) await walk(extraMirror);
for (const p of extra) {
  const rel = path.relative(extraMirror, p); const [host, ...rest] = rel.split(path.sep);
  const url = `https://${host}/${rest.join('/')}`;
  if (!okFiles.some(f => f.url.split('?')[0] === url) && !/\.m?js$/.test(url) && !/index\.html$/.test(url)) okFiles.push({ url, status: 200, localPath: p, bytes: fss.statSync(p).size, extra: true });
}

const isJs = u => /\.m?js$/.test(u.split('?')[0]);
const isCss = u => /\.css$/.test(u.split('?')[0]);
const isHtml = u => /\/$|\.html$/.test(u.split('?')[0]);

// ---------- 2. assign new local paths ----------
// key = URL without query (query-variants of the same file are reported, see below)
const byKey = new Map();
for (const f of okFiles) { const k = f.url.split('?')[0]; if (!byKey.has(k)) byKey.set(k, f); }
const queryVariants = {};
for (const f of M.files.filter(f => f.status === 200)) { const [k, q] = f.url.split('?'); if (q) (queryVariants[k] ||= new Set()).add(q); }

const jsKeys = [...byKey.keys()].filter(isJs);
const nameCount = {};
const logical = k => { const p = new URL(k).pathname.replace(/^\/src\//, ''); return p; }; // e.g. systems/Foo.js
for (const k of jsKeys) nameCount[logical(k)] = (nameCount[logical(k)] || 0) + 1;
const newPath = new Map(); // key -> project-relative path
const entryMain = new URL('src/main.js', ENTRY).href;
for (const k of jsKeys) {
  const lp = logical(k), host = new URL(k).host;
  let p;
  if (k === entryMain) p = 'src/main.js';
  else if (lp === 'main.js') p = `src/boot/main.${hashOf(host)}.js`;       // historical main.js chain
  else if (nameCount[lp] > 1) p = `src/${lp.replace(/\.m?js$/, '')}.${hashOf(host)}.js`;
  else p = `src/${lp}`;
  newPath.set(k, p);
}
const assetCollisions = [];
for (const k of [...byKey.keys()].filter(k => !isJs(k) && !isHtml(k))) {
  const u = new URL(k);
  let p = isCss(k) ? `src/styles/${path.basename(u.pathname)}` : `public${u.pathname}`;
  const clash = [...newPath.entries()].find(([kk, pp]) => pp === p);
  if (clash) { assetCollisions.push([k, clash[0]]); p = p.replace(/(\.[^./]+)$/, `.${hashOf(u.host)}$1`); }
  newPath.set(k, p);
}
// stubs for modules the LIVE game already fails to load (404) – keep identical failure semantics
for (const f of missing) {
  const k = f.url.split('?')[0];
  newPath.set(k, `src/missing/${hashOf(new URL(k).host)}-${path.basename(k)}`);
}

// ---------- 3. resolution (identical to what the browser did) ----------
function resolve(spec, fromUrl) {
  if (importMap[spec]) return new URL(importMap[spec], ENTRY).href;          // bare or exact key
  if (!/^(\.{1,2}\/|\/|https?:)/.test(spec)) return null;                      // bare specifier (three)
  const abs = new URL(spec, fromUrl).href;
  if (importMap[abs]) return new URL(importMap[abs], ENTRY).href;
  return abs;
}
function relFrom(fromNew, toNew) {
  if (toNew.startsWith('public/')) return toNew.slice('public'.length);        // served from site root
  let r = path.posix.relative(path.posix.dirname(fromNew), toNew);
  return r.startsWith('.') ? r : './' + r;
}
const report = { rewritten: 0, leftovers: [], unresolvedDynamic: [], bare: new Set(), stubbedImports: [] };

function rewriteJs(src, fileKey, fromNew) {
  const fileUrl = fileKey; // original URL (query irrelevant for resolution)
  let imports; try { [imports] = parse(src); } catch (err) { console.log("PARSE_FAIL", fromNew, err.message); imports = []; const add = (re, dyn) => { for (const m of src.matchAll(re)) { const sp = m[m.length - 1]; const off = m.index + m[0].lastIndexOf(sp); imports.push(dyn ? { n: sp, s: off - 1, e: off + sp.length + 1, d: 1 } : { n: sp, s: off, e: off + sp.length, d: -1 }); } }; add(/(\bfrom\s*|\bimport\s*)(['"])([^'"]+)\2/g, false); add(/\bimport\(\s*(['"])([^'"]+)\1\s*\)/g, true); report.leftovers.push({ file: fromNew, why: "lexer parse error, regex fallback used: " + err.message }); }
  // constants for template expansion
  const consts = {};
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['"`]([^'"`$]+)['"`]/g)) consts[m[1]] = m[2];
  const edits = [];
  for (const im of imports) {
    let spec = im.n, s = im.s, e = im.e;
    if (im.d > -1 && spec === undefined) {                                   // dynamic, non-literal
      const expr = src.slice(im.s, im.e).trim();
      let exp = expr;
      const tm = expr.match(/^`([^`]*)`$/);
      if (tm) exp = tm[1].replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (a, n) => (n in consts ? consts[n] : a));
      const cm = expr.match(/^([A-Za-z_$][\w$]*)\s*\+\s*['"]([^'"]+)['"]$/);
      if (cm && cm[1] in consts) exp = consts[cm[1]] + cm[2];
      if (/^[A-Za-z_$][\w$]*$/.test(expr) && expr in consts) exp = consts[expr];
      if (exp.includes('${') || exp === expr) { report.unresolvedDynamic.push({ file: fromNew, expr }); continue; }
      spec = exp;
    } else if (spec === undefined) continue;
    if (spec === 'import.meta') continue;
    const target = resolve(spec, fileUrl);
    if (target === null) { report.bare.add(spec); continue; }
    const tk = target.split('?')[0];
    if (!DEPLOY_RE.test(tk)) { if (/^https?:/.test(spec)) report.leftovers.push({ file: fromNew, spec, why: 'external import' }); continue; }
    const np = newPath.get(tk);
    if (!np) { report.leftovers.push({ file: fromNew, spec, target, why: 'target not captured' }); continue; }
    if (np.startsWith('src/missing/')) report.stubbedImports.push({ file: fromNew, spec, dynamic: im.d > -1 });
    const rel = relFrom(fromNew, np);
    edits.push(im.d > -1 ? [s, e, `'${rel}'`] : [s, e, rel]);
  }
  edits.sort((a, b) => b[0] - a[0]);
  for (const [s, e, t] of edits) { src = src.slice(0, s) + t + src.slice(e); report.rewritten++; }

  // drop constants that only held an old deployment URL and are no longer referenced after rewriting
  src = src.replace(/(^|[;\n])\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"`])https:\/\/berlin-metro-[a-z0-9-]+\.vercel\.app[^'"`]*\3\s*;?/g, (all, lead, name) => {
    const uses = (src.match(new RegExp('(?<![\\w$.])' + name.replace(/\$/g, '\\$') + '(?![\\w$])', 'g')) || []).length;
    if (uses <= 1) { report.droppedConsts = (report.droppedConsts || 0) + 1; return lead; }
    return all;
  });
  // asset URLs built from import.meta.url → root-absolute public paths
  src = src.replace(/new\s+URL\(\s*(['"`])((?:\.\.?\/)[^'"`]*)\1\s*,\s*import\.meta\.url\s*\)/g, (all, q, rel) => {
    const prefix = rel.split('${')[0];
    const abs = new URL(prefix, fileUrl);
    if (!DEPLOY_RE.test(abs.href)) return all;
    return `new URL(${q}${abs.pathname}${rel.slice(prefix.length)}${q}, location.href)`;
  });
  return src;
}

// ---------- 4. write project ----------
await fs.rm(OUT, { recursive: true, force: true });
const provenance = [];
for (const [k, np] of newPath) {
  const dest = path.join(OUT, np);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  if (np.startsWith('src/missing/')) {
    await fs.writeFile(dest, `// This module was NOT available in the original live game either (HTTP 404 at\n// ${k}).\n// The stub keeps the original behaviour: importing it fails exactly like the 404 did.\nthrow new Error('Module not available in original deployment: ${path.basename(k)}');\n`);
    provenance.push({ file: np, original: k, status: 'missing-in-live-game (stub)' });
    continue;
  }
  const f = byKey.get(k);
  let buf = await fs.readFile(f.localPath);
  if (isJs(k)) buf = Buffer.from(rewriteJs(buf.toString('utf8'), k, np));
  await fs.writeFile(dest, buf);
  provenance.push({ file: np, original: k, bytes: buf.length, sha1: crypto.createHash('sha1').update(await fs.readFile(f.localPath)).digest('hex').slice(0, 12), queryVariants: queryVariants[k] ? [...queryVariants[k]] : undefined });
}

// index.html
let html = await fs.readFile(byKey.get(ENTRY).localPath, 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, '')
  .replace(/<script async data-explicit-opt-in[^>]*><\/script>/g, '')
  .replace(/<link rel="stylesheet" href="[^"]*\/styles\.css"\/>/, '<link rel="stylesheet" href="/src/styles/styles.css"/>')
  .replace(/<script type="module" src="[^"]*"><\/script>/, '<script type="module" src="/src/main.js"></script>');
await fs.writeFile(path.join(OUT, 'index.html'), html);

// final scan: any deployment URL left anywhere in the project?
const left = [];
async function scan(dir) { for (const e of await fs.readdir(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) await scan(p); else if (/\.(m?js|html|css|json)$/.test(e.name)) { const t = await fs.readFile(p, 'utf8'); for (const m of t.matchAll(/https?:\/\/berlin-metro[a-z0-9-]*\.vercel\.app[^\s'"`)]*/g)) left.push({ file: path.relative(OUT, p), url: m[0] }); } } }
await scan(OUT);

await fs.mkdir(path.join(OUT, 'docs'), { recursive: true });
await fs.writeFile(path.join(OUT, 'docs', 'provenance.json'), JSON.stringify({ entry: ENTRY, generatedAt: new Date().toISOString(), importMap, files: provenance }, null, 2));
const summary = { files: provenance.length, js: jsKeys.length, missingStubs: missing.length, rewritten: report.rewritten, bare: [...report.bare], unresolvedDynamic: report.unresolvedDynamic, leftoversInImports: report.leftovers, deploymentUrlsLeftInText: left.length, assetCollisions, queryVariantFiles: Object.keys(queryVariants).length, stubbedImports: report.stubbedImports };
await fs.writeFile(path.join(OUT, 'docs', 'localize-report.json'), JSON.stringify({ ...summary, leftInText: left }, null, 2));
console.log(JSON.stringify(summary, null, 1).slice(0, 4000));
const byFile = {}; for (const l of left) byFile[l.file] = (byFile[l.file] || 0) + 1;
console.log('LEFT IN TEXT by file:', JSON.stringify(byFile));
