/* Round 911: the recruiting trail, src/lib/collegeRecruiting.ts, held to
   what it promises, for college football AND basketball (one module, two
   descriptors). Every run is seeded; the policies below are coaches written
   against the module's public API, not reaching into it.

   HEADER_NUMBERS_PLACEHOLDER
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.COLLEGE_RECRUITING_CONTROL || '';
const MEASURE = process.env.COLLEGE_RECRUITING_MEASURE === '1';
const SEED_BASE = Number(process.env.COLLEGE_RECRUITING_SEED_BASE || 0);
const SEEDS = 120;

/* Each control: the exact bundled text it rewrites and what it becomes. */
const CONTROLS = {
  nopitch: [['PITCH_RANK_BONUS = [9, 5, 2.5]', 'PITCH_RANK_BONUS = [0, 0, 0]']],
  nowork: [
    ['CONTACT_GAIN = 3;', 'CONTACT_GAIN = 0;'],
    ['PITCH_BASE = 2;', 'PITCH_BASE = 0;'],
    ['PITCH_RANK_BONUS = [9, 5, 2.5]', 'PITCH_RANK_BONUS = [0, 0, 0]'],
    ['VISIT_GAIN = 10;', 'VISIT_GAIN = 0;'],
    ['NIL_COLD_MULT = 0.5;', 'NIL_COLD_MULT = 1;'],
  ],
  weakrivals: [['const pool = others.filter(fits);', 'const pool = others.filter((s) => s.prestige < 75);']],
  nocap: [['const hasRoom = (t, id) => id === OFF_BOARD || (t.commits[id] ?? 0) < t.classCap;', 'const hasRoom = (t, id) => true;']],
  overspend: [['const amount = Math.floor(Math.min(a.amount ?? r.nilAsk, t.nilLeft));', 'const amount = Math.floor(a.amount ?? r.nilAsk);']],
  unsigned: [['r.signedWith = r.committedTo;', 'r.signedWith = null;']],
  noflip: [['FLIP_MARGIN = 20;', 'FLIP_MARGIN = 1e9;']],
  badband: [['const to = Math.min(r.trueOvr, r.hi - 2 * nw);', 'const to = r.hi - 2 * nw;']],
  noretain: [['if (goes && !retained.includes(m.id)) lost.push(m);', 'if (goes) lost.push(m);']],
  visitflat: [['VISIT_HOME_WIN = 1.7;', 'VISIT_HOME_WIN = 1;']],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`COLLEGE_RECRUITING_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok   ' + m);

/* ---- bundle the module and the two dynasties' school tables ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `collegeRecruiting-${process.pid}-`));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
export * as rec from '${ROOT_URL}/src/lib/collegeRecruiting.ts';
export { CFB_SCHOOLS, CFB_SCHOOL_STATES, cfbGenName, nilBudgetFor } from '${ROOT_URL}/src/lib/cfbDynasty.ts';
export { CBB_SCHOOLS, CBB_SCHOOL_STATES, cbbGenName, cbbNilFor } from '${ROOT_URL}/src/lib/cbbDynasty.ts';
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': `${ROOT_URL}/src` } });
if (CONTROL) {
  let text = fs.readFileSync(BUNDLE, 'utf8');
  for (const [from, to] of CONTROLS[CONTROL]) {
    const hits = text.split(from).length - 1;
    if (hits !== 1) { console.error(`control cannot run: "${from}" is in the bundle ${hits} times, not once`); process.exit(1); }
    text = text.replace(from, to);
  }
  fs.writeFileSync(BUNDLE, text);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}`);
}
const B = await import(pathToFileURL(BUNDLE).href);
const { rec } = B;
fs.rmSync(TMP, { recursive: true, force: true });

/* ---- the two sports, bound to the tables the dynasties ship ---- */
const withStates = (schools, states) => schools.map(s => ({ id: s.id, prestige: s.prestige, state: states[s.id] }));
const SPORTS = {
  cfb: { d: rec.CFB_RECRUITING, schools: withStates(B.CFB_SCHOOLS, B.CFB_SCHOOL_STATES), genName: B.cfbGenName, nil: B.nilBudgetFor },
  cbb: { d: rec.CBB_RECRUITING, schools: withStates(B.CBB_SCHOOLS, B.CBB_SCHOOL_STATES), genName: B.cbbGenName, nil: B.cbbNilFor },
};

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* My program for one run: a school, last season read off its prestige, a
   head coach three years in, every other position opening a starting spot,
   and the NIL pot the dynasty itself would hand it. */
function programOf(sp, school) {
  const winPct = Math.max(0, Math.min(1, (school.prestige - 55) / 45));
  const wins = Math.round(winPct * (sp.d.sport === 'cfb' ? 12 : 30));
  const distinct = [...new Set(sp.d.positions)];
  const openSpots = Object.fromEntries(distinct.map((p, i) => [p, i % 2 === 0 ? 1 : 0]));
  return { schoolId: school.id, prestige: school.prestige, state: school.state, winPct, coachYears: 3, openSpots, nilPot: sp.nil(school.prestige, wins) };
}

/* One cycle. The trail has its own seeded stream; a policy's coin is a
   second stream, so a random pitcher never moves the trail's draws and two
   policies on one seed face the same board, the same rivals, the same luck. */
function play(sportKey, schoolId, makePolicy, seed) {
  const sp = SPORTS[sportKey];
  const school = sp.schools.find(s => s.id === schoolId);
  const ctx = programOf(sp, school);
  const rng = mulberry32(seed * 7919 + 17);
  const prng = mulberry32(seed * 104729 + 3);
  let n = 0;
  const t = rec.openTrail(sp.d, sp.schools, ctx, 2026, { rng, genName: sp.genName, newId: () => `r${++n}` });
  const log = { spent: [], flips: 0, nilLeftMin: Infinity, visitsMin: Infinity, pot: t.nilLeft, refusedSigned: 0 };
  const policy = makePolicy();
  const targets = policy.targets(t, ctx);
  for (let w = 0; w < t.weeks; w++) {
    const wk = { home: w % 2 === 0, won: rng() < ctx.winPct };
    const before = new Map(t.recruits.map(r => [r.id, r.committedTo]));
    const res = rec.runTrailWeek(sp.d, t, policy.week(t, ctx, w, { home: wk.home }, targets, prng), ctx, wk, sp.schools, rng);
    for (const r of t.recruits) { const b = before.get(r.id); if (b && r.committedTo && b !== r.committedTo) log.flips += 1; }
    log.spent.push(res.spent);
    log.nilLeftMin = Math.min(log.nilLeftMin, t.nilLeft);
    log.visitsMin = Math.min(log.visitsMin, t.visitsLeft);
  }
  /* After signing day nothing moves: one more week is refused whole. */
  const after = rec.runTrailWeek(sp.d, t, [{ kind: 'contact', recruitId: t.recruits[0].id }], ctx, { home: true, won: true }, sp.schools, rng);
  log.refusedSigned = after.refused;
  return { t, ctx, log, score: rec.classScore(t, schoolId), signed: rec.signeesOf(t, schoolId).length };
}

/* ---- the coaches ---- */
const byStars = t => [...t.recruits].sort((a, b) => b.stars - a.stars || (b.lo + b.hi) - (a.lo + a.hi) || (a.id < b.id ? -1 : 1));
const chaseStars = t => byStars(t).slice(0, t.classCap + 3);
const inStateThrees = (t, ctx) => byStars(t).filter(r => r.stars === 3 && r.home === ctx.state).slice(0, t.classCap + 3);

/* A coach who works a fixed list: each week the men he has worked least
   come first, and each gets a call, a NIL offer at his ask while the pot
   still covers it (once), a visit on a home week while visits last, and a
   pitch. 'top' sells what the man told him matters most; 'random' sells
   any of the six. */
function worker({ pitch, visits = false, nil = false, pick = chaseStars }) {
  return () => {
    const worked = new Map();
    return {
      targets: (t, ctx) => pick(t, ctx),
      week: (t, ctx, w, wk, targets, prng) => {
        const acts = [];
        let hours = t.hoursPerWeek;
        let visitsLeft = t.visitsLeft;
        let pot = t.nilLeft;
        const order = targets.filter(r => !r.signedWith)
          .map((r, i) => ({ r, i })).sort((a, b) => (worked.get(a.r.id) ?? 0) - (worked.get(b.r.id) ?? 0) || a.i - b.i);
        for (const { r } of order) {
          const plan = [{ kind: 'contact', recruitId: r.id }];
          const offer = nil && r.nilOffer === 0 && pot >= r.nilAsk;
          if (offer) plan.push({ kind: 'nil', recruitId: r.id, amount: r.nilAsk });
          if (visits && wk.home && visitsLeft > 0 && !r.visited) plan.push({ kind: 'visit', recruitId: r.id });
          const p = pitch === 'top' ? r.priorities[0] : rec.RECRUIT_PRIORITIES[Math.floor(prng() * 6)];
          plan.push({ kind: 'pitch', recruitId: r.id, priority: p });
          const cost = rec.hoursOf(plan);
          if (cost > hours) continue;
          hours -= cost;
          if (plan.some(a => a.kind === 'visit')) visitsLeft -= 1;
          if (offer) pot -= r.nilAsk;
          acts.push(...plan);
          worked.set(r.id, (worked.get(r.id) ?? 0) + 1);
        }
        return acts;
      },
    };
  };
}
const nobody = () => () => ({ targets: () => [], week: () => [] });
/* All NIL, no contact: the same pot under the same rule (his ask, best man
   first, while it covers it), offered cold in week one, and nothing else. */
const allNil = () => () => ({
  targets: t => chaseStars(t),
  week: (t, ctx, w, wk, targets) => {
    if (w !== 0) return [];
    let pot = t.nilLeft;
    const acts = [];
    for (const r of targets) if (pot >= r.nilAsk) { acts.push({ kind: 'nil', recruitId: r.id, amount: r.nilAsk }); pot -= r.nilAsk; }
    return acts;
  },
});

const mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const fmt = x => x.toFixed(2);
/* Four programs a sport, spread from the bottom of the table to the top. */
function spread(sportKey) {
  const s = [...SPORTS[sportKey].schools].filter(x => x.state).sort((a, b) => a.prestige - b.prestige || (a.id < b.id ? -1 : 1));
  return [0, 0.33, 0.66, 0.99].map(q => s[Math.floor(q * (s.length - 1))].id);
}
const lowest = sportKey => spread(sportKey)[0];
const ALL_RUNS = [];
function runMany(sportKey, schools, makePolicy, tag) {
  const scores = [];
  for (const id of schools) for (let k = 0; k < SEEDS; k++) {
    const res = play(sportKey, id, makePolicy, SEED_BASE + k + 1);
    res.tag = tag; res.sportKey = sportKey;
    ALL_RUNS.push(res);
    scores.push(res.score);
  }
  if (MEASURE) {
    const by = schools.map(id => { const r = ALL_RUNS.filter(x => x.tag === tag && x.sportKey === sportKey && x.t.mySchool === id); return `${id} ${fmt(mean(r.map(x => x.signed)))} signed, ${fmt(mean(r.map(x => x.score)))}`; });
    console.log(`     [${tag}] ${by.join(' | ')}`);
  }
  return scores;
}
const MEASURED = {};

/* Floors, each set well under the measured gap (see the header). */
const FLOORS = {
  s1TopOverRandom: { cfb: 0, cbb: 0 },
  s1RandomOverNone: { cfb: 0, cbb: 0 },
  s2BalancedOverNil: { cfb: 0, cbb: 0 },
  s3HomeOverChase: { cfb: 0, cbb: 0 },
};

for (const sportKey of ['cfb', 'cbb']) {
  const schools = spread(sportKey);
  console.log(`\n== ${sportKey}: programs ${schools.join(', ')}, ${SEEDS} seeds each`);

  console.log('-- 1) the right pitch: top priority beats a random pitch, and both beat no effort');
  const top = mean(runMany(sportKey, schools, worker({ pitch: 'top' }), 's1top'));
  const rnd = mean(runMany(sportKey, schools, worker({ pitch: 'random' }), 's1rnd'));
  const none = mean(runMany(sportKey, schools, nobody(), 's1none'));
  MEASURED[`${sportKey} s1`] = { top, rnd, none };
  console.log(`     class score: top ${fmt(top)}  random ${fmt(rnd)}  none ${fmt(none)}`);
  if (top - rnd >= FLOORS.s1TopOverRandom[sportKey]) ok(`top over random ${fmt(top - rnd)} >= ${FLOORS.s1TopOverRandom[sportKey]}`);
  else fail(`${sportKey} top priority pitch over random pitch is ${fmt(top - rnd)}, floor ${FLOORS.s1TopOverRandom[sportKey]}`);
  if (rnd - none >= FLOORS.s1RandomOverNone[sportKey]) ok(`random over none ${fmt(rnd - none)} >= ${FLOORS.s1RandomOverNone[sportKey]}`);
  else fail(`${sportKey} random pitch over no effort is ${fmt(rnd - none)}, floor ${FLOORS.s1RandomOverNone[sportKey]}`);

  console.log('-- 2) equal budget: a balanced coach beats all NIL and no contact');
  const bal = mean(runMany(sportKey, schools, worker({ pitch: 'top', visits: true, nil: true }), 's2bal'));
  const nilOnly = mean(runMany(sportKey, schools, allNil(), 's2nil'));
  MEASURED[`${sportKey} s2`] = { bal, nilOnly };
  console.log(`     class score: balanced ${fmt(bal)}  all NIL ${fmt(nilOnly)}`);
  if (bal - nilOnly >= FLOORS.s2BalancedOverNil[sportKey]) ok(`balanced over all NIL ${fmt(bal - nilOnly)} >= ${FLOORS.s2BalancedOverNil[sportKey]}`);
  else fail(`${sportKey} balanced over all NIL is ${fmt(bal - nilOnly)}, floor ${FLOORS.s2BalancedOverNil[sportKey]}`);

  console.log('-- 3) a low prestige program: working in-state three stars beats chasing the stars');
  const low = lowest(sportKey);
  const home = mean(runMany(sportKey, [low], worker({ pitch: 'top', visits: true, nil: true, pick: inStateThrees }), 's3home'));
  const chase = mean(runMany(sportKey, [low], worker({ pitch: 'top', visits: true, nil: true, pick: chaseStars }), 's3chase'));
  MEASURED[`${sportKey} s3`] = { low, home, chase };
  console.log(`     ${low}: in-state threes ${fmt(home)}  chasing stars ${fmt(chase)}`);
  if (home - chase >= FLOORS.s3HomeOverChase[sportKey]) ok(`in-state over chase ${fmt(home - chase)} >= ${FLOORS.s3HomeOverChase[sportKey]}`);
  else fail(`${sportKey} ${low} in-state threes over chasing stars is ${fmt(home - chase)}, floor ${FLOORS.s3HomeOverChase[sportKey]}`);
}
if (MEASURE) console.log('\nMEASURED ' + JSON.stringify(MEASURED));
console.log(`\nfailures so far ${failures}`);
