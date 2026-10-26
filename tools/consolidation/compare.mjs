// Compares two probe reports (reference live game vs consolidated build).
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).map(p => JSON.parse(fs.readFileSync(p, 'utf8')));
const norm = s => s.replace(/https?:\/\/[^\s'")]+/g, u => { try { const x = new URL(u); return /berlin-metro|localhost|vercel\.app/.test(x.host) ? '<self>' + x.pathname.replace(/-[A-Za-z0-9_-]{8}\.js$/, '.js') : x.host + x.pathname; } catch { return u; } })
  .replace(/^\d+(\.\d+)?\s/, '').replace(/\d+(\.\d+)?ms/g, 'Nms').replace(/:\d+:\d+/g, '');
const bag = arr => { const m = new Map(); for (const x of arr) { const k = norm(x).slice(0, 220); m.set(k, (m.get(k) || 0) + 1); } return m; };
const diff = (name, A, B) => {
  const ma = bag(A), mb = bag(B);
  const onlyA = [...ma.keys()].filter(k => !mb.has(k)), onlyB = [...mb.keys()].filter(k => !ma.has(k));
  console.log(`\n## ${name}: ref=${A.length} new=${B.length} onlyRef=${onlyA.length} onlyNew=${onlyB.length}`);
  onlyA.slice(0, 25).forEach(k => console.log('  - REF ONLY:', k));
  onlyB.slice(0, 25).forEach(k => console.log('  + NEW ONLY:', k));
};
diff('console', a.log, b.log);
diff('page errors', a.errors, b.errors);
const ext = r => r.requests.filter(q => !/berlin-metro|localhost|vercel\.live|\/\.well-known\//.test(q.url)).map(q => `${q.status} ${new URL(q.url).host}${new URL(q.url).pathname}`);
diff('external requests', ext(a), ext(b));
const failed = r => r.failed.map(q => `${q.status} ${q.url}`);
diff('failed requests', failed(a), failed(b));
const asset = r => r.requests.filter(q => /\.(glb|gz|json|mp3|png|jpg|css)$/.test(new URL(q.url).pathname)).map(q => `${q.status} ${new URL(q.url).pathname.split('/').slice(-2).join('/')}`);
diff('asset requests', asset(a), asset(b));
for (const k of Object.keys(a.steps)) {
  const sa = JSON.stringify({ ...a.steps[k], t: 0, ls: undefined }), sb = JSON.stringify({ ...b.steps[k], t: 0, ls: undefined });
  console.log(`\n## step ${k}: ${sa === sb ? 'IDENTICAL' : 'DIFFERENT'}`);
  if (sa !== sb) { console.log('  ref:', sa.slice(0, 600)); console.log('  new:', sb.slice(0, 600)); }
}
const lsA = a.steps.ingame?.ls || [], lsB = b.steps.ingame?.ls || [];
console.log(`\n## localStorage keys: ref=${lsA.length} new=${lsB.length} same=${JSON.stringify([...lsA].sort()) === JSON.stringify([...lsB].sort())}`);
