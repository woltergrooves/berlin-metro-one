// Fase 1 stap 7: unit-test van src/state/Tick.js zonder browser (node tools/consolidation/tick-test.mjs)
const listeners = {};
globalThis.document = { hidden: false, addEventListener: (k, f) => (listeners[k] = f) };
const { Tick } = await import('../../src/state/Tick.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, m) => { console.log(c ? 'OK  ' : 'FOUT', m); if (!c) process.exitCode = 1; };

let a = 0, b = 0, c = 0, d = 0, timedOut = false;
const ia = Tick.every('a', 100, () => a++);
Tick.every('b', 250, () => { b++; throw new Error('test'); });
Tick.until('c', 50, () => ++c >= 3);
Tick.until('d', 50, () => { d++; return false; }, 300, () => (timedOut = true));
await sleep(1030);
ok(a >= 9 && a <= 10, `every 100 ms → ${a}× in 1 s`);
ok(b === 4 && Tick.list().find(t => t.name === 'b').errors === 4, `fout in taak telt, andere lopen door (b=${b})`);
ok(c === 3 && !Tick.list().some(t => t.name === 'c'), 'until stopt bij waar');
ok(timedOut && !Tick.list().some(t => t.name === 'd'), `until stopt na time-out (d=${d})`);
document.hidden = true; listeners.visibilitychange();
const before = a; await sleep(400);
ok(a === before, 'pauze bij verborgen tabblad');
document.hidden = false; listeners.visibilitychange(); await sleep(30);
ok(a === before + 1, 'direct weer aan de beurt bij terugkeer (niet inhalen)');
Tick.cancel(ia); const after = a; await sleep(250);
ok(a === after, 'cancel stopt de taak');
Tick.cancel(null);
const w0 = Tick.stats.wakeups; let x = 0, y = 0;
Tick.every('x', 200, () => x++); Tick.every('y', 205, () => y++);
await sleep(1010);
ok(x === 5 && (y === 4 || y === 5), `bijna-gelijke taken samen (x=${x}, y=${y})`);
console.log('wekbeurten in laatste seconde:', Tick.stats.wakeups - w0, '(b loopt ook mee)');
// Deel 2: opstart-slapers (Tick.sleep) — minstens ms, samen gewekt op het raster, ook verborgen.
const t0 = performance.now(), w1 = Tick.stats.wakeups, done = [];
await Promise.all(Array.from({ length: 40 }, (_, i) => Tick.sleep(100, 's' + i).then(() => done.push(performance.now() - t0))));
ok(done.length === 40 && Math.min(...done) >= 99 && Math.max(...done) < 100 + 25 + 15, `sleep(100) ×40 duurt ${Math.round(Math.min(...done))}–${Math.round(Math.max(...done))} ms`);
ok(Tick.stats.wakeups - w1 <= 3, `40 slapers in ${Tick.stats.wakeups - w1} wekbeurt(en)`);
ok(!Tick.list().some(t => t.kind === 'once'), 'slapers verdwijnen na het wekken');
document.hidden = true; listeners.visibilitychange();
let slept = false; Tick.sleep(50, 'verborgen').then(() => (slept = true)); await sleep(120);
ok(slept, 'sleep loopt door bij verborgen tabblad');
document.hidden = false; listeners.visibilitychange();
let n = 0; for (let i = 0; i < 5; i++) { n++; await Tick.sleep(30, 'lus'); }
ok(n === 5, 'wachtlus met Tick.sleep doet alle pogingen');
process.exit();
