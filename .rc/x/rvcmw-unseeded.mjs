// Reviewer cm-world (Release AZ), never committed. Ruling Y1 on the paths the builder's fleets did not walk: an
// UNSEEDED save (started by the base engine, Release AX b6eb78e7) taken through a free agent signing, a mid season
// job move (applyForJob, the application, joinClubNow), the wilderness (sacked, weeks out, a job taken), a summer
// job move, January, and two rollovers, on both engines from the same bytes with the same random stream. Every step:
// the whole state, the number of draws and the saved string must be equal. Run: node .rc/x/rvcmw-unseeded.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const BASE = 'b6eb78e799b12c851e4e8e583e9e926aed117f1c';
const lf = s => s.split('\r\n').join('\n');
async function engine(base) {
  const plugin = { name: 'src', setup(b) { b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
    const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
    if (!rel.startsWith('src/')) return null;
    const text = base ? execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }) : fs.readFileSync(args.path, 'utf8');
    return { contents: lf(text), loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
  }); } };
  const entry = "export * as cm from './src/lib/clubManager';\nexport * as cal from './src/lib/clubManagerCalendar';\nexport * as eras from './src/lib/clubManagerEras';\n";
  const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: `rv-${base}.ts`, loader: 'ts' }, bundle: true, write: false,
    format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  const script = new vm.Script(out.outputFiles[0].text, { filename: `rv-${base}.cjs` });
  return async () => {
    const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
    class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
    const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date: D,
      URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('offline')),
      localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
    script.runInContext(ctx); await module.exports.eras.ensureAllEraRosters();
    return { ...module.exports, store };
  };
}
function tape(seed, action, forced) {
  let st = seed >>> 0; let n = 0; const original = Math.random;
  Math.random = () => { n += 1; if (forced !== undefined) return forced; st = (st + 0x6d2b79f5) >>> 0; let v = st;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; };
  try { return { value: action(), n }; } finally { Math.random = original; }
}
const baseE = await engine(true), headE = await engine(false);
const fails = []; let steps = 0; const moves = {};
function firstDiff(a, b) {
  const A = JSON.parse(a), B = JSON.parse(b);
  for (const key of [...new Set([...Object.keys(A), ...Object.keys(B)])]) {
    const x = JSON.stringify(A[key]) ?? 'absent', y = JSON.stringify(B[key]) ?? 'absent'; if (x === y) continue;
    let i = 0; while (i < x.length && x[i] === y[i]) i += 1;
    return `${key}: base ...${x.slice(Math.max(0, i - 30), i + 30)}... head ...${y.slice(Math.max(0, i - 30), i + 30)}...`;
  }
  return 'key order';
}
async function journey(era, club, other, seed) {
  const B = await baseE(), H = await headE(); const where = `${club} ${era} seed ${seed}`;
  let json = null; let k = 0;
  /* One step on both engines from the same bytes; the base result carries on. */
  const step = (label, fn, forced) => {
    k += 1; steps += 1;
    const run = M => { const input = json === null ? null : JSON.parse(json); const r = tape((seed + k * 7919) >>> 0, () => fn(M, input), forced);
      const out = r.value ?? input; M.store.clear(); const ok = out ? M.cm.saveCareer(out) : false;
      return { js: JSON.stringify(out), n: r.n, saved: ok ? [...M.store.values()].join('|') : null, ret: !!r.value }; };
    const b = run(B), h = run(H);
    if (b.js !== h.js) { fails.push(`${where} ${label}: state differs, ${firstDiff(b.js, h.js)}`); throw new Error('stop'); }
    if (b.n !== h.n) { fails.push(`${where} ${label}: draws ${b.n} on base, ${h.n} on head`); throw new Error('stop'); }
    if (b.saved !== h.saved) { fails.push(`${where} ${label}: the saved bytes differ`); throw new Error('stop'); }
    if (h.js.includes('"worldSeed"') || h.js.includes('"worldRoster"')) { fails.push(`${where} ${label}: the unseeded save gained a world key`); throw new Error('stop'); }
    json = b.js; if (b.ret) moves[label.replace(/ \d+$/, '')] = (moves[label.replace(/ \d+$/, '')] ?? 0) + 1;
    return b.ret;
  };
  const cur = () => JSON.parse(json);
  const toEnd = label => { for (let i = 0; i < 240; i += 1) { let over = false;
    step(`${label} ${i}`, (M, c) => { const r = M.cm.playNextEntry(c, { skipHalftime: true, noCoach: true }); over = r.kind === 'seasonOver'; return r.state; });
    if (over) { step(`${label} finished`, (M, c) => M.cm.finishSeason(c).state); return; } } throw new Error('no season end'); };
  try {
    /* The save is an OLD one: the base engine starts it, and both engines are handed its bytes. */
    json = JSON.stringify(tape(seed, () => B.cm.startCareer(club, era)).value);
    /* The head engine's own module counters (ids) must stand where the base's do: it starts a career too, unused. */
    tape(seed, () => H.cm.startCareer(club, era));
    step('money', (M, c) => ({ ...c, budget: 9999, wageCap: 9999 }));
    const fa = (() => { const c = cur(); B.cm.ensureFreeAgents(c); return (c.freeAgents ?? [])[0]?.name; })();
    if (fa) step('free agent', (M, c) => M.cm.signFreeAgent(c, fa));
    const low = cur().squad.filter(p => !p.isYouth && p.position !== 'GK').sort((a, b) => a.rating - b.rating)[0];
    if (low) step('release', (M, c) => M.cm.releasePlayer(c, low.id));
    for (let i = 0; i < 8; i += 1) step(`entry ${i}`, (M, c) => M.cm.playNextEntry(c, { skipHalftime: true, noCoach: true }).state);
    const target = B.cm.applyTargets(cur()).find(t => t.club !== cur().clubName)?.club;
    if (target && step('apply', (M, c) => M.cm.applyForJob(c, target), 0)) {
      for (let n = 0; n < 20 && cur().jobHunt?.open?.status === 'pending'; n += 1) step(`application ${n}`, (M, c) => M.cm.playNextEntry(c, { skipHalftime: true, noCoach: true }).state, 0.6);
      if (cur().jobHunt?.open?.status === 'accepted') step('join now', (M, c) => M.cal.joinClubNow(c), 0.6);
    }
    for (let i = 0; i < 6; i += 1) step(`after move ${i}`, (M, c) => M.cm.playNextEntry(c, { skipHalftime: true, noCoach: true }).state);
    step('sacked', (M, c) => M.cm.enterWilderness({ ...c, sacked: true }));
    for (let w = 0; w < 10 && !(cur().wilderness?.offers?.length); w += 1) step(`wilderness ${w}`, (M, c) => M.cm.wildernessWeek(c));
    const offer = cur().wilderness?.offers?.[0]?.club;
    if (offer) step('take wilderness job', (M, c) => M.cm.acceptWildernessJob(c, offer));
    else { toEnd('season one'); step('rollover', (M, c) => M.cm.startNextSeason(c)); }
    for (let i = 0; i < 6; i += 1) step(`season two ${i}`, (M, c) => M.cm.playNextEntry(c, { skipHalftime: true, noCoach: true }).state);
    toEnd('season two');
    step('summer move', (M, c) => M.cm.startNextSeason(c, other));
    toEnd('season three');
    step('rollover three', (M, c) => M.cm.startNextSeason(c));
  } catch (e) { if (String(e) !== 'Error: stop') fails.push(`${where}: ${String(e).slice(0, 200)}`); }
}
const PLAN = [['now', 'Everton', 'Brentford'], ['now', 'Lincoln City', 'Everton'], ['era2010', 'Blackburn Rovers', 'Everton'], ['era2020', 'Real Betis', 'Celta Vigo'], ['era2005', 'Cadiz', 'Celta Vigo'], ['era2015', 'Eibar', 'Getafe']];
for (const [era, club, other] of PLAN) for (const seed of [7, 8]) await journey(era, club, other, seed);
console.log(`steps ${steps}; moves ${JSON.stringify(moves)}`);
for (const f of fails.slice(0, 20)) console.log(`  FAIL ${f}`);
console.log(fails.length ? `rvcmw-unseeded: ${fails.length} journeys parted from the base` : 'rvcmw-unseeded: green, every step byte equal to the base (state, draws, saved bytes)');
process.exit(fails.length ? 1 : 0);
