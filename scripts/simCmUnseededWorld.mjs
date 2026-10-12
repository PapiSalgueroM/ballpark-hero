/* Release AZ, the lead's ruling Y1: a Club Manager save with no world seed plays exactly as it did.
 *
 * WHY. Round 1250 (the other lane's PR224, merge e of Release AZ) keeps the men a manager buys, sells or releases
 * where they went, in a ledger on the save, and gives every NEW career a world seed. The ledger was written for
 * every career, seeded or not, and a readable ledger alone turns on the same branches the seed does (every rival
 * roster and the market through the ledger, the club strengths drawn at a rollover, the rating ceiling of my own
 * squad). So a save from before the release kept its world only until its first deal. The ruling: a career with
 * no seed never writes a ledger (one guard at the top of recordActualRosterTransfer in src/lib/clubManager.ts).
 *
 * WHAT IT HOLDS, against the source of the first parent of merge e (BASE below, Release AX as published), with
 * both engines handed the same save bytes and the same random stream, and every step compared on the whole state,
 * the number and values of the draws it took, and the bytes a save writes:
 *   (a) quiet: old saves with no deal, played into the season, saved and reloaded, played to its end, finished
 *       (the summer before a rollover), saved and reloaded;
 *   (b) deals: old saves with every deal the recorder sees, each followed by a save and a reload: a release, a
 *       buy, a part exchange (the swap), a sale through acceptBid, a loan with its option exercised, then the
 *       season played out, the rollover (its exits and its loan returns), and the next season begun;
 *   on every era, three clubs an era (two picked from the era's first two leagues, and the club with the
 *   thinnest projected roster of the era), three seeds a club; plus the committed save of Round 1052
 *   (scripts/data/cmOldSave1052Fixture.json) and three Manager Hot Seat days handed over to Club Manager by the
 *   base engine, each through both plans;
 *   (c) fresh, the inverse: new careers started by both engines with scripts/lib/cmWorldSeed1250.mjs composed
 *       into this tree's engine (the seed block of startCareer out), through plan (b), byte equal to BASE.
 *
 * CONTROLS, each must go red where it says and nowhere else (exit 1, last line says FIRED):
 *   CM_UNSEEDED_CONTROL=guard      takes the guard out: the deal fleet (b) goes red, the quiet fleet (a) stays
 *                                  green (the fresh section is not run)
 *   CM_UNSEEDED_CONTROL=noinverse  runs only the fresh section, without the inverse: it goes red
 * CM_UNSEEDED_FLEET=quick plays one seed a club and no fixtures (for trying it out; never a gate line).
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 *
 *   node scripts/simCmUnseededWorld.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { withoutWorldSeed } from './lib/cmWorldSeed1250.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* The first parent of merge e of Release AZ: Release AX as published (origin/main b6eb78e7). */
const BASE = 'b6eb78e799b12c851e4e8e583e9e926aed117f1c';
const ENGINE = 'src/lib/clubManager.ts';
const GUARD = '  if (worldSeedOf(state) === undefined) return state;\n';
const CONTROL = process.env.CM_UNSEEDED_CONTROL || '';
const QUICK = process.env.CM_UNSEEDED_FLEET === 'quick';
const cannot = why => { console.log(`simCmUnseededWorld: cannot run: ${why}`); process.exit(2); };
if (CONTROL && !['guard', 'noinverse'].includes(CONTROL)) cannot(`unknown control ${CONTROL}`);
try { execFileSync('git', ['cat-file', '-e', `${BASE}^{commit}`], { cwd: ROOT, stdio: 'ignore' }); } catch { cannot(`the base commit ${BASE.slice(0, 8)} is not in this clone (fetch its history)`); }

const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const lf = s => s.split('\r\n').join('\n');
const clone = v => JSON.parse(JSON.stringify(v));

/* One engine, bundled once and run in a fresh context per journey (module state such as registered league
   memberships must not leak from one save into the next). `edit` changes this tree's clubManager.ts. */
async function engine(label, { base = false, edit = null } = {}) {
  let edited = false;
  const plugin = {
    name: 'unseeded-source',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (!rel.startsWith('src/')) return null;
        let text = base
          ? lf(execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }))
          : lf(fs.readFileSync(args.path, 'utf8'));
        if (edit && rel === ENGINE) { text = edit(text); edited = true; }
        return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    },
  };
  const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as hs from './src/lib/managerHotSeat';\n";
  const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: `unseeded-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  if (edit && !edited) cannot(`the ${label} engine was to be edited and ${ENGINE} was never loaded`);
  const script = new vm.Script(out.outputFiles[0].text, { filename: `unseeded-${label}.cjs` });
  return {
    label,
    async fresh() {
      const module = { exports: {} };
      const store = new Map();
      const NOW = 1791633600000;
      class HeldDate extends Date {
        constructor(...a) { super(...(a.length ? a : [NOW])); }
        static now() { return NOW; }
      }
      const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
        console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
        setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
      script.runInContext(ctx);
      await module.exports.eras.ensureAllEraRosters();
      return { ...module.exports, store };
    },
  };
}

/* The random stream: a counter generator, the same on both engines, every draw kept. */
function tape(seed, action) {
  let state = seed >>> 0; const draws = [];
  const original = Math.random;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0; let v = state;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    const d = ((v ^ v >>> 14) >>> 0) / 4294967296; draws.push(d); return d;
  };
  try { return { value: action(), draws }; } finally { Math.random = original; }
}

/* Where two states first part: the first top level key whose value differs, and forty characters either side of
   the first character that differs in it. */
function firstDifference(a, b) {
  const A = JSON.parse(a), B = JSON.parse(b);
  for (const key of [...new Set([...Object.keys(A), ...Object.keys(B)])]) {
    const x = JSON.stringify(A[key]) ?? 'absent', y = JSON.stringify(B[key]) ?? 'absent';
    if (x === y) continue;
    let i = 0; while (i < x.length && x[i] === y[i]) i += 1;
    return `${key}: base ...${x.slice(Math.max(0, i - 40), i + 40)}... this tree ...${y.slice(Math.max(0, i - 40), i + 40)}...`;
  }
  return 'the key order differs';
}

/* One journey of one save through one plan on one engine. Every step draws from its own stretch of the stream. */
async function journey(E, input, plan, seed) {
  const M = await E.fresh();
  const steps = [];
  let s = null; let k = 0;
  const step = (label, fn) => {
    k += 1;
    const r = tape((seed + k * 7919) >>> 0, () => fn(s));
    const got = r.value ?? {};
    if (got.state) s = got.state;
    steps.push({ label, note: got.note ?? '', json: JSON.stringify(s), draws: r.draws.length, drawSha: sha(r.draws), saved: got.saved ?? null });
  };
  const reload = () => step('save-and-reload', cur => {
    M.store.clear();
    if (!M.cm.saveCareer(cur)) return { note: 'the save was refused' };
    const saved = sha([...M.store.entries()].sort());
    const loaded = M.cm.loadCareer();
    return { state: loaded, saved, note: loaded ? '' : 'the reload was refused' };
  });
  const play = (n, label) => { for (let i = 0; i < n; i += 1) step(`${label}-${i + 1}`, cur => ({ state: M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }).state })); };
  const toEnd = label => {
    for (let i = 0; i < 220; i += 1) {
      let over = false;
      step(`${label}-${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }); over = r.kind === 'seasonOver'; return { state: r.state }; });
      if (over) return;
    }
    throw new Error('a season did not end in 220 entries');
  };
  if (input.start) step('start', () => ({ state: M.cm.startCareer(input.start[0], input.start[1]) }));
  else step('load', () => { M.store.clear(); M.store.set(M.cm.SAVE_KEY, input.raw); return { state: M.cm.loadCareer() }; });
  if (!s) throw new Error(`${input.name}: the save did not open`);
  if (plan === 'quiet') {
    play(8, 'early'); reload(); toEnd('rest');
    step('finish', cur => ({ state: M.cm.finishSeason(cur).state })); reload();
    return steps;
  }
  const outfield = cur => cur.squad.filter(p => !p.onLoan && p.position !== 'GK');
  const names = cur => new Set(cur.squad.map(p => p.name));
  step('open-window', cur => ({ state: { ...cur, budget: 9999, wageCap: 9999, transferWindow: 'summer' } }));
  step('release', cur => {
    const man = [...outfield(cur)].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0];
    const next = man && M.cm.releasePlayer(cur, man.id);
    return next ? { state: next, note: 'done' } : { note: 'refused' };
  });
  reload();
  step('buy', cur => {
    const mine = names(cur);
    const mp = M.cm.buildMarket(cur).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 80 && !mine.has(p.name));
    const next = mp && M.cm.buyPlayer(cur, mp);
    return next ? { state: next, note: 'done' } : { note: 'refused' };
  });
  reload();
  step('swap', cur => {
    const mine = names(cur);
    const mp = M.cm.buildMarket(cur).filter(p => p.position !== 'GK' && p.age < 30 && !mine.has(p.name))[3];
    const open = mp && M.cm.startNegotiation(cur, mp);
    if (!open?.negotiation) return { note: 'refused' };
    const man = [...outfield(open)].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[3];
    const cash = Math.max(0.1, Math.round((open.negotiation.theirAsk - M.cm.sellValue(man) * 0.85) * 10) / 10);
    const offered = M.cm.makeOffer(open, cash, { swapId: man.id });
    if (offered?.negotiation?.phase !== 'terms' || !offered.negotiation.terms) return { note: 'refused' };
    const settled = M.cm.offerTerms(offered, offered.negotiation.terms.want);
    const done = settled?.negotiation?.status === 'agreed' && !settled.squad.some(p => p.id === man.id);
    return done ? { state: settled, note: 'done' } : { note: 'refused' };
  });
  reload();
  step('sale', cur => {
    const man = [...outfield(cur)].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[1];
    const buyer = M.cm.buildMarket(cur).find(p => p.club !== cur.clubName)?.club;
    if (!man || !buyer) return { note: 'refused' };
    const bid = { playerId: man.id, playerName: man.name, club: buyer, offer: 30, status: 'open' };
    const next = M.cm.acceptBid({ ...cur, incomingBids: [...(cur.incomingBids ?? []), bid] }, man.id);
    return next ? { state: next, note: 'done' } : { note: 'refused' };
  });
  reload();
  step('loan-option', cur => {
    const mine = names(cur);
    const mp = M.cm.buildMarket(cur).find(p => p.age <= 23 && p.rating <= 84 && (p.value ?? p.price) <= 25 && p.position !== 'GK' && !mine.has(p.name));
    const loaned = mp && M.cm.loanIn(cur, mp);
    const man = loaned && loaned.squad.find(p => p.name === mp.name);
    const bought = man && M.cm.exerciseLoanOption(loaned, man.id);
    return bought ? { state: bought, note: 'done' } : loaned ? { state: loaned, note: 'loan only' } : { note: 'refused' };
  });
  reload();
  play(6, 'with-deals'); toEnd('rest');
  step('finish', cur => ({ state: M.cm.finishSeason(cur).state }));
  step('rollover', cur => ({ state: M.cm.startNextSeason(cur) }));
  reload(); play(4, 'next-season'); reload();
  return steps;
}

/* Two journeys of one save, base and this tree, compared step by step. */
async function pair(sectionName, A, B, input, plan, seed, acc) {
  let a, b;
  try { a = await journey(A, input, plan, seed); } catch (e) { cannot(`${input.name} (${plan}) on the base engine: ${e.message}`); }
  try { b = await journey(B, input, plan, seed); } catch (e) { b = null; acc.fails.push(`${sectionName} ${input.name} (${plan}, seed ${seed}): this tree threw: ${e.message}`); }
  acc.journeys += 1;
  for (const x of a) if (x.note) acc.notes[`${x.label} ${x.note}`] = (acc.notes[`${x.label} ${x.note}`] ?? 0) + 1;
  if (!b) return;
  acc.steps += a.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const x = a[i], y = b[i];
    if (!x || !y || x.label !== y.label) { acc.fails.push(`${sectionName} ${input.name} (${plan}, seed ${seed}): the steps part at ${i} (${x?.label} against ${y?.label})`); return; }
    const why = [];
    if (x.json !== y.json) why.push(`the state differs, ${firstDifference(x.json, y.json)}`);
    if (x.draws !== y.draws || x.drawSha !== y.drawSha) why.push(`the draws differ (${x.draws} against ${y.draws})`);
    if (x.saved !== y.saved) why.push('the saved bytes differ');
    if (x.note !== y.note) why.push(`the step went otherwise (${x.note} against ${y.note})`);
    if (why.length) { acc.fails.push(`${sectionName} ${input.name} (${plan}, seed ${seed}) at step ${i} ${x.label}: ${why.join('; ')}`.slice(0, 600)); return; }
  }
  for (const y of b) if (/"worldRoster":|"worldSeed":/.test(y.json)) { acc.fails.push(`${sectionName} ${input.name} (${plan}): this tree's save carries a ledger or a seed at ${y.label}`); return; }
}
const newAcc = () => ({ journeys: 0, steps: 0, fails: [], notes: {} });

const ERAS = ['now', 'era2020', 'era2015', 'era2010', 'era2005'];
const SEEDS = QUICK ? [0x5eed01] : [0x5eed01, 0x5eed02, 0x5eed03];
const HOT_DATES = QUICK ? [] : ['2026-10-10', '2026-10-27', '2027-01-19'];

const baseEngine = await engine('base', { base: true });
const sections = CONTROL === 'noinverse' ? ['fresh'] : CONTROL === 'guard' ? ['quiet', 'deals'] : ['quiet', 'deals', 'fresh'];
const thisTree = CONTROL === 'guard'
  ? await engine('noguard', { edit: text => { const n = text.split(GUARD).length - 1; if (n !== 1) cannot(`control guard: the guard is in ${ENGINE} ${n} times, it must be exactly once`); return text.replace(GUARD, ''); } })
  : await engine('tree');
const inverse = CONTROL === 'noinverse' ? await engine('tree') : await engine('inverse', { edit: withoutWorldSeed });

/* The fleet, picked from the base engine's own tables and printed, so a data update that moves a club shows. */
const M0 = await baseEngine.fresh();
const fleet = [];
for (const era of ERAS) {
  const leagues = era === 'now' ? M0.cm.REAL_LEAGUES : M0.cm.ERA_LEAGUES[era];
  if (!leagues?.length) cannot(`the era ${era} has no leagues`);
  const all = [...new Set(leagues.flatMap(l => l.clubs))];
  const size = c => M0.eras.projectedRoster(c, 0, era).length;
  const thin = [...all].sort((x, y) => size(x) - size(y) || x.localeCompare(y))[0];
  const picks = [leagues[0].clubs[3], leagues[1]?.clubs[5] ?? leagues[0].clubs[6], thin];
  console.log(`  ${era}: ${picks[0]}, ${picks[1]}, and the thinnest roster of the era ${thin} (${size(thin)} projected men)`);
  for (const club of picks) for (const seed of SEEDS) fleet.push({ era, club, seed });
}
const oldSaves = [];
for (const f of fleet) {
  const M = await baseEngine.fresh();
  const s = tape(f.seed, () => M.cm.startCareer(f.club, f.era)).value;
  M.store.clear(); assert.ok(M.cm.saveCareer(s));
  oldSaves.push({ name: `${f.club} (${f.era})`, raw: M.store.get(M.cm.SAVE_KEY), seed: f.seed });
}
if (!QUICK) {
  oldSaves.push({ name: 'the committed save of Round 1052 (Sevilla)', raw: fs.readFileSync(path.join(ROOT, 'scripts/data/cmOldSave1052Fixture.json'), 'utf8'), seed: 0x7001 });
  for (const date of HOT_DATES) {
    const M = await baseEngine.fresh();
    const s = tape(0x4807, () => {
      const setup = M.hs.dailyHotSeat(date);
      let run = M.hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
      for (let g = 0; !run.verdict && g < 60; g += 1) run = M.hs.pendingPress(run) ? M.hs.answerHotSeatPress(run, 0) : M.hs.playHotSeatMatch(run, 'balanced', null);
      return M.hs.handoverState(run);
    }).value;
    M.store.clear(); assert.ok(M.cm.saveCareer(s));
    oldSaves.push({ name: `the Hot Seat day of ${date} handed over (${s.clubName})`, raw: M.store.get(M.cm.SAVE_KEY), seed: 0x4807 });
  }
}

const results = {};
for (const section of sections) {
  const acc = newAcc(); results[section] = acc;
  const t0 = Date.now();
  if (section === 'fresh') {
    for (const f of fleet.filter(x => x.seed === SEEDS[0])) await pair(section, baseEngine, inverse, { name: `${f.club} (${f.era}) started fresh`, start: [f.club, f.era] }, 'deals', f.seed, acc);
  } else {
    for (const save of oldSaves) await pair(section, baseEngine, thisTree, save, section, save.seed, acc);
  }
  console.log(`${section}: ${acc.journeys} saves, ${acc.steps} steps compared, ${acc.fails.length} red, ${Math.round((Date.now() - t0) / 1000)}s`);
  if (Object.keys(acc.notes).length) console.log(`  deals on the base engine: ${Object.entries(acc.notes).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const f of acc.fails.slice(0, 8)) console.log(`  FAIL ${f}`);
  if (acc.fails.length > 8) console.log(`  ... and ${acc.fails.length - 8} more`);
}

/* The deal fleet must have made every deal the recorder sees at least once, or it proves nothing about them. */
if (results.deals || results.fresh) {
  for (const [name, acc] of Object.entries(results).filter(([n]) => n !== 'quiet')) {
    const missing = ['release done', 'buy done', 'swap done', 'sale done', 'loan-option done'].filter(k => !acc.notes[k]);
    if (missing.length) cannot(`the ${name} fleet never completed: ${missing.join(', ')} (pick other men for that step)`);
  }
}

const red = s => (results[s]?.fails.length ?? 0) > 0;
if (CONTROL === 'guard') {
  const fired = red('deals') && !red('quiet');
  console.log(fired
    ? `simCmUnseededWorld: CONTROL guard FIRED: with the guard out the deal fleet went red (${results.deals.fails.length} saves) and the quiet fleet stayed green`
    : `simCmUnseededWorld: CONTROL guard DID NOT FIRE as it must: deals red ${red('deals')}, quiet red ${red('quiet')}`);
  process.exit(fired ? 1 : 3);
}
if (CONTROL === 'noinverse') {
  console.log(red('fresh')
    ? `simCmUnseededWorld: CONTROL noinverse FIRED: without the inverse the fresh careers differ from the base (${results.fresh.fails.length} of ${results.fresh.journeys})`
    : 'simCmUnseededWorld: CONTROL noinverse DID NOT FIRE: new careers on this tree equal the base without the inverse');
  process.exit(red('fresh') ? 1 : 3);
}
const total = sections.reduce((n, s) => n + results[s].fails.length, 0);
console.log(total === 0
  ? `simCmUnseededWorld: green. ${results.quiet.journeys} old saves with no deal and ${results.deals.journeys} with every deal play byte equal to ${BASE.slice(0, 8)} (state, draws and saved bytes at every step), and ${results.fresh.journeys} new careers with the seed block out do too`
  : `simCmUnseededWorld: ${total} FAILURE(S)`);
process.exit(total === 0 ? 0 : 1);
