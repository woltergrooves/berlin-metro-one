// Static audit of the consolidated Berlin Life code base for roadmap phase 1 (cleanup + Game State 2.0).
// Usage: node audit.mjs <projectDir> <outJson>
import fs from 'node:fs';
import path from 'node:path';
import { init, parse } from 'es-module-lexer';
await init;

const [root, outJson] = process.argv.slice(2);
const SRC = path.join(root, 'src');
const files = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : /\.js$/.test(p) && files.push(p); });
walk(SRC);
const rel = p => path.relative(root, p);

const info = {};
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let imports = [];
  try { imports = parse(src)[0].filter(i => i.n).map(i => ({ spec: i.n, dynamic: i.d > -1 })); } catch {}
  const uniq = a => [...new Set(a)];
  info[rel(f)] = {
    bytes: src.length,
    imports: imports.map(i => ({ ...i, resolved: i.spec.startsWith('.') ? rel(path.resolve(path.dirname(f), i.spec)) : i.spec })),
    storageKeys: uniq([...src.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1])
      .concat([...src.matchAll(/\b(?:const|let|var)\s+[A-Z_]*(?:KEY|STORE|SAVE)[A-Z_]*\s*=\s*['"`]([^'"`]{3,60})['"`]/g)].map(m => m[1]))),
    intervals: (src.match(/\bsetInterval\s*\(/g) || []).length,
    rafLoops: (src.match(/\brequestAnimationFrame\s*\(/g) || []).length,
    timeouts: (src.match(/\bsetTimeout\s*\(/g) || []).length,
    globals: uniq([...src.matchAll(/\b(?:window|globalThis)\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)].map(m => m[1])),
    protoPatches: uniq([...src.matchAll(/\b([A-Z][\w$]*)\.prototype\.([\w$]+)\s*=(?!=)/g)].map(m => `${m[1]}.${m[2]}`)),
    domIds: uniq([...src.matchAll(/\bid\s*=\s*['"`]([A-Za-z][\w-]{2,})['"`]/g)].map(m => m[1]).concat([...src.matchAll(/\.id\s*=\s*['"`]([A-Za-z][\w-]{2,})['"`]/g)].map(m => m[1]))),
    removesDomIds: uniq([...src.matchAll(/getElementById\(\s*['"`]([\w-]+)['"`]\s*\)\s*\?\.\s*remove\(\)/g)].map(m => m[1])),
    banner: (src.match(/console\.info\(\s*['"`]\[(?:Berlin Life|Metro)\]\s*([^'"`]{0,90})/) || [])[1] || null,
    buildStatus: (src.match(/currentPhase\s*:\s*([\d.]+)\s*,\s*name\s*:\s*['"`]([^'"`]+)/) || []).slice(1).join(' ') || null,
    economyTouch: /balance|money|wallet|cash|€/i.test(src),
    saveTouch: /save|slot/i.test(src),
  };
}

// boot order: depth-first along the order of imports, as the browser evaluates the await-import chain
const order = [], seen = new Set();
const visit = f => { if (seen.has(f) || !info[f]) return; seen.add(f); for (const i of info[f].imports) visit(i.resolved); order.push(f); };
visit('src/main.js');
const unreachable = Object.keys(info).filter(f => !seen.has(f));

// who imports what
const importedBy = {};
for (const [f, v] of Object.entries(info)) for (const i of v.imports) (importedBy[i.resolved] ||= []).push(f);

// storage key ownership
const keyOwners = {};
for (const [f, v] of Object.entries(info)) for (const k of v.storageKeys) (keyOwners[k] ||= []).push(f);
const globalOwners = {};
for (const [f, v] of Object.entries(info)) for (const g of v.globals) (globalOwners[g] ||= []).push(f);
const protoOwners = {};
for (const [f, v] of Object.entries(info)) for (const g of v.protoPatches) (protoOwners[g] ||= []).push(f);
const domOwners = {};
for (const [f, v] of Object.entries(info)) for (const g of v.domIds) (domOwners[g] ||= []).push(f);

// families of versioned systems: FooV1, FooV2, ... (same stem)
const fam = {};
for (const f of Object.keys(info)) { const b = path.basename(f, '.js').replace(/\.[a-z0-9]{9}$/, ''); const stem = b.replace(/V\d+$/, ''); if (stem !== b || /V\d+/.test(b)) (fam[stem] ||= []).push(b); }
const families = Object.fromEntries(Object.entries(fam).filter(([, v]) => v.length > 1).map(([k, v]) => [k, [...new Set(v)].sort()]));

// disabled-by-importmap targets (LegacyStreetDisabled) and how often they are imported
const legacyDisabled = importedBy['src/systems/LegacyStreetDisabled.js'] || [];

const totals = Object.values(info).reduce((a, v) => ({ intervals: a.intervals + v.intervals, raf: a.raf + v.rafLoops, timeouts: a.timeouts + v.timeouts }), { intervals: 0, raf: 0, timeouts: 0 });
const out = { generated: new Date().toISOString(), files: Object.keys(info).length, totals, bootOrder: order, unreachable, importedBy, keyOwners, globalOwners, protoOwners, domOwners, families, legacyDisabledImportCount: legacyDisabled.length, info };
fs.writeFileSync(outJson, JSON.stringify(out, null, 2));

const topIntervals = Object.entries(info).filter(([, v]) => v.intervals).sort((a, b) => b[1].intervals - a[1].intervals).slice(0, 12).map(([f, v]) => `${v.intervals} ${f}`);
console.log(JSON.stringify({
  files: out.files, bootOrderLen: order.length, unreachable: unreachable.length, totals,
  storageKeys: Object.keys(keyOwners).length, globals: Object.keys(globalOwners).length,
  protoPatched: Object.fromEntries(Object.entries(protoOwners).filter(([, v]) => v.length > 1).map(([k, v]) => [k, v.length])),
  protoPatchCount: Object.keys(protoOwners).length, protoPatchSites: Object.values(protoOwners).reduce((a, v) => a + v.length, 0),
  families: Object.keys(families).length, legacyDisabledImports: legacyDisabled.length, topIntervals,
}, null, 1));
