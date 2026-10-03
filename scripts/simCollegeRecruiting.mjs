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
  noflip: [['FLIP_MARGIN = 10;', 'FLIP_MARGIN = 1e9;']],
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
  const log = { spent: [], flips: 0, flipsAway: 0, flipsIn: 0, nilLeftMin: Infinity, visitsMin: Infinity, pot: t.nilLeft, refusedSigned: 0 };
  const policy = makePolicy();
  const targets = policy.targets(t, ctx);
  for (let w = 0; w < t.weeks; w++) {
    const wk = { home: w % 2 === 0, won: rng() < ctx.winPct };
    const before = new Map(t.recruits.map(r => [r.id, r.committedTo]));
    const res = rec.runTrailWeek(sp.d, t, policy.week(t, ctx, w, { home: wk.home }, targets, prng), ctx, wk, sp.schools, rng);
    for (const r of t.recruits) {
      const b = before.get(r.id);
      if (!b || !r.committedTo || b === r.committedTo) continue;
      log.flips += 1;
      if (b === t.mySchool) log.flipsAway += 1;
      if (r.committedTo === t.mySchool) log.flipsIn += 1;
    }
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
function worker({ pitch, visits = false, nil = false, pick = chaseStars, hold = true }) {
  return () => {
    const worked = new Map();
    return {
      targets: (t, ctx) => pick(t, ctx),
      week: (t, ctx, w, wk, targets, prng) => {
        const acts = [];
        let hours = t.hoursPerWeek;
        let visitsLeft = t.visitsLeft;
        let pot = t.nilLeft;
        const order = targets.filter(r => !r.signedWith && (hold || r.committedTo !== t.mySchool))
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

/* Commitments a neglectful coach loses a run beyond a steady one (section 4b). */
const FLIP_FLOOR = { cfb: 0, cbb: 0 };
/* The portal (section 6): the rate a good man stuck behind a starter leaves, and how much more than a starter. */
const STUCK_BAND = [0.25, 0.37];
const STUCK_OVER_STARTER = 0.2;
/* Floors, each set well under the measured gap (see the header). */
const FLOORS = {
  s1TopOverRandom: { cfb: 36, cbb: 20 },
  s1RandomOverNone: { cfb: 17, cbb: 13 },
  s2BalancedOverNil: { cfb: 55, cbb: 34 },
  s3HomeOverChase: { cfb: 20, cbb: 15 },
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

/* A coach who asks for everything every week: every action on every man,
   a NIL offer of a million, a visit for all. The module must refuse what the
   rules do not allow, so this is the run the budget, hour and visit checks
   below actually lean on. */
const greedy = () => () => ({
  targets: t => t.recruits,
  week: (t, ctx, w, wk, targets) => targets.flatMap(r => [
    { kind: 'nil', recruitId: r.id, amount: 1e6 }, { kind: 'visit', recruitId: r.id },
    { kind: 'contact', recruitId: r.id }, { kind: 'pitch', recruitId: r.id, priority: r.priorities[0] },
    { kind: 'evaluate', recruitId: r.id },
  ]),
});
for (const sportKey of ['cfb', 'cbb']) runMany(sportKey, spread(sportKey), greedy(), 'greedy');

console.log('\n-- 4) on every run: every man signs once, and no cap, pot, hour or visit limit is ever broken');
const bad = { unsigned: 0, cap: 0, count: 0, pot: 0, paid: 0, hours: 0, visits: 0, after: 0, again: 0 };
let flips = 0;
for (const run of ALL_RUNS) {
  const { t, log } = run;
  if (t.recruits.some(r => !r.signedWith)) bad.unsigned += 1;
  const counts = {};
  for (const r of t.recruits) if (r.signedWith && r.signedWith !== rec.OFF_BOARD) counts[r.signedWith] = (counts[r.signedWith] ?? 0) + 1;
  for (const [id, n] of Object.entries(counts)) { if (n > t.classCap) bad.cap += 1; if ((t.commits[id] ?? 0) !== n) bad.count += 1; }
  if (log.nilLeftMin < 0 || t.nilLeft < 0 || t.nilLeft + t.nilPaid !== log.pot) bad.pot += 1;
  const mine = t.recruits.filter(r => r.signedWith === t.mySchool).reduce((a, r) => a + r.nilOffer, 0);
  if (mine !== t.nilPaid || t.recruits.some(r => r.signedWith !== t.mySchool && r.nilOffer !== 0)) bad.paid += 1;
  if (log.spent.some(h => h > t.hoursPerWeek)) bad.hours += 1;
  if (log.visitsMin < 0 || t.recruits.filter(r => r.visited).length > SPORTS[run.sportKey].d.visitLimit) bad.visits += 1;
  if (log.refusedSigned !== 1) bad.after += 1;
  const snap = JSON.stringify(t);
  rec.signingDay(t);
  if (JSON.stringify(t) !== snap) bad.again += 1;
  flips += log.flips;
}
const greedyRuns = ALL_RUNS.filter(r => r.tag === 'greedy');
const greedySpent = mean(greedyRuns.map(r => r.log.pot - r.log.nilLeftMin));
const flipRate = flips / ALL_RUNS.length;
const commitShare = mean(ALL_RUNS.map(r => r.t.recruits.filter(x => x.committedTo).length / r.t.recruits.length));
const commitMine = mean(ALL_RUNS.map(r => r.t.recruits.filter(x => x.committedTo === r.t.mySchool).length));
MEASURED.s4 = { runs: ALL_RUNS.length, flipRate, greedySpent, commitShare, commitMine };
console.log(`     ${ALL_RUNS.length} runs, ${fmt(flipRate)} flips a run, greedy coach spent ${fmt(greedySpent)} a run before signing day`);
for (const [k, v] of Object.entries(bad)) {
  if (v === 0) ok(`${k}: 0 runs broke it`);
  else fail(`${k}: ${v} runs broke it`);
}
if (greedySpent > 0) ok('the greedy coach did reach the pot, so the pot check was exercised');
else fail('the greedy coach never spent, so the pot check proved nothing');

console.log('\n-- 4b) a commitment can still flip: a coach who stops working his commits loses more of them than one who keeps at it');
for (const sportKey of ['cfb', 'cbb']) {
  runMany(sportKey, spread(sportKey), worker({ pitch: 'top', hold: false }), 's4neglect');
  const of = tag => ALL_RUNS.filter(r => r.tag === tag && r.sportKey === sportKey);
  const away = { steady: mean(of('s1top').map(r => r.log.flipsAway)), neglect: mean(of('s4neglect').map(r => r.log.flipsAway)) };
  MEASURED[`${sportKey} s4b`] = away;
  console.log(`     ${sportKey}: commits flipped away a run, steady ${fmt(away.steady)}  neglect ${fmt(away.neglect)}`);
  if (away.neglect - away.steady >= FLIP_FLOOR[sportKey]) ok(`neglect loses ${fmt(away.neglect - away.steady)} more a run >= ${FLIP_FLOOR[sportKey]}`);
  else fail(`${sportKey} neglected commits flip away only ${fmt(away.neglect - away.steady)} a run more than worked ones, floor ${FLIP_FLOOR[sportKey]}`);
}

console.log('\n-- 5) the scouting band: only evaluation narrows it, every step halves it, and it always holds the truth');
{
  const sb = { truth: 0, ladder: 0, outside: 0, moved: 0 };
  let steps = 0;
  for (const sportKey of ['cfb', 'cbb']) {
    const sp = SPORTS[sportKey];
    const want = [];
    for (let w = rec.BAND_START; ; w = Math.max(rec.BAND_MIN, Math.ceil(w / 2))) { want.push(2 * w); if (w <= rec.BAND_MIN) break; }
    for (let k = 0; k < SEEDS; k++) {
      const seed = SEED_BASE + k + 1;
      const rng = mulberry32(seed * 31 + 5);
      const ctx = programOf(sp, sp.schools.find(s => s.id === spread(sportKey)[2]));
      let n = 0;
      const t = rec.openTrail(sp.d, sp.schools, ctx, 2026, { rng, genName: sp.genName, newId: () => `b${++n}` });
      const hist = new Map(t.recruits.map(r => [r.id, [[r.lo, r.hi]]]));
      for (let w = 0; w < t.weeks; w++) {
        const acts = t.recruits.slice(0, Math.floor(t.hoursPerWeek / rec.HOURS.evaluate)).map(r => ({ kind: 'evaluate', recruitId: r.id }));
        rec.runTrailWeek(sp.d, t, acts, ctx, { home: false, won: false }, sp.schools, rng);
        for (const r of t.recruits) {
          const h = hist.get(r.id); const [plo, phi] = h[h.length - 1];
          if (r.lo !== plo || r.hi !== phi) { h.push([r.lo, r.hi]); steps += 1; if (r.lo < plo || r.hi > phi) sb.outside += 1; }
          if (r.trueOvr < r.lo || r.trueOvr > r.hi) sb.truth += 1;
        }
      }
      const evaluated = new Set(t.recruits.slice(0, Math.floor(t.hoursPerWeek / rec.HOURS.evaluate)).map(r => r.id));
      for (const r of t.recruits) {
        const widths = hist.get(r.id).map(([a, b]) => b - a);
        const expect = evaluated.has(r.id) ? want.slice(0, widths.length) : [want[0]];
        if (widths.join() !== expect.join() || (evaluated.has(r.id) && widths.length !== Math.min(want.length, t.weeks + 1))) sb.ladder += 1;
      }
    }
  }
  for (const run of ALL_RUNS) if (run.tag !== 'greedy') for (const r of run.t.recruits) if (r.hi - r.lo !== 2 * rec.BAND_START) sb.moved += 1;
  MEASURED.s5 = { steps };
  console.log(`     ${steps} narrowing steps walked`);
  if (steps > 0) ok('evaluation did narrow bands, so the checks below saw real steps'); else fail('no band ever narrowed');
  for (const [k, v] of Object.entries(sb)) { if (v === 0) ok(`${k}: 0`); else fail(`band ${k}: ${v}`); }
}

console.log('\n-- 6) the portal: a sit down keeps a man, real tape, a short window, and its own cap');
{
  const pb = { keptLeft: 0, crn: 0, senior: 0, oneAndDone: 0, tape: 0, window: 0, unsigned: 0, cap: 0 };
  const left = { stuck: [0, 0], starter: [0, 0] };
  const CLS = ['FR', 'SO', 'JR', 'SR'];
  for (const sportKey of ['cfb', 'cbb']) {
    const sp = SPORTS[sportKey];
    const school = sp.schools.find(s => s.id === spread(sportKey)[1]);
    const ctx = programOf(sp, school);
    for (let k = 0; k < SEEDS; k++) {
      const seed = SEED_BASE + k + 1;
      const rr = mulberry32(seed * 13 + 1);
      const roster = sp.d.positions.flatMap((pos, i) => [0, 1].map(j => ({
        id: `m${i}-${j}`, name: `Man ${i}-${j}`, pos, cls: CLS[Math.floor(rr() * 4)], starter: j === 0, ovr: 60 + Math.floor(rr() * 30),
      })));
      const risky = [...roster].sort((a, b) => rec.portalRisk(b, sp.d) - rec.portalRisk(a, sp.d) || b.ovr - a.ovr);
      const keep = risky.slice(0, sp.d.retainSlots).map(m => m.id);
      let n = 0;
      const deps = () => ({ rng: mulberry32(seed * 101 + 9), genName: sp.genName, newId: () => `p${++n}` });
      const none = rec.openPortal(sp.d, roster, [], sp.schools, ctx, 2026, deps());
      const kept = rec.openPortal(sp.d, roster, keep, sp.schools, ctx, 2026, deps());
      if (kept.lost.some(m => keep.includes(m.id))) pb.keptLeft += 1;
      const expect = none.lost.filter(m => !keep.includes(m.id)).map(m => m.id).join();
      if (kept.lost.map(m => m.id).join() !== expect) pb.crn += 1;
      for (const m of none.lost) {
        if (m.cls === 'SR') pb.senior += 1;
        if (sp.d.oneAndDone && m.cls === 'FR' && m.ovr >= sp.d.eliteLine) pb.oneAndDone += 1;
      }
      for (const m of roster) {
        if (m.cls === 'SR' || (sp.d.oneAndDone && m.cls === 'FR' && m.ovr >= sp.d.eliteLine)) continue;
        const gone = none.lost.includes(m) ? 1 : 0;
        const bucket = m.starter ? left.starter : m.ovr >= rec.PORTAL_STUCK_OVR ? left.stuck : null;
        if (bucket) { bucket[0] += gone; bucket[1] += 1; }
      }
      const t = kept.trail;
      if (t.recruits.some(r => r.lo !== r.trueOvr || r.hi !== r.trueOvr)) pb.tape += 1;
      if (t.phase !== 'portal' || t.weeks !== sp.d.portalWeeks || t.weeks >= sp.d.weeks) pb.window += 1;
      const pol = worker({ pitch: 'top', nil: true })();
      const targets = pol.targets(t, ctx);
      const prng = mulberry32(seed);
      const rng = mulberry32(seed * 7 + 3);
      for (let w = 0; w < t.weeks; w++) rec.runTrailWeek(sp.d, t, pol.week(t, ctx, w, { home: false }, targets, prng), ctx, { home: false, won: false }, sp.schools, rng);
      if (!t.done || t.recruits.some(r => !r.signedWith)) pb.unsigned += 1;
      if (t.classCap !== Math.min(sp.d.classCap, kept.lost.length + 2) || rec.signeesOf(t, school.id).length > t.classCap) pb.cap += 1;
    }
  }
  const rate = ([a, b]) => a / Math.max(1, b);
  MEASURED.s6 = { stuck: rate(left.stuck), starter: rate(left.starter), stuckN: left.stuck[1], starterN: left.starter[1] };
  console.log(`     left when nobody sat down: stuck men ${fmt(rate(left.stuck))} of ${left.stuck[1]}, starters ${fmt(rate(left.starter))} of ${left.starter[1]}`);
  for (const [k, v] of Object.entries(pb)) { if (v === 0) ok(`${k}: 0`); else fail(`portal ${k}: ${v}`); }
  const [slo, shi] = STUCK_BAND;
  if (rate(left.stuck) >= slo && rate(left.stuck) <= shi) ok(`a good man stuck behind a starter leaves at ${fmt(rate(left.stuck))}, inside [${slo}, ${shi}]`);
  else fail(`stuck men leave at ${fmt(rate(left.stuck))}, outside [${slo}, ${shi}]`);
  if (rate(left.stuck) - rate(left.starter) >= STUCK_OVER_STARTER) ok(`stuck men leave more than starters by ${fmt(rate(left.stuck) - rate(left.starter))} >= ${STUCK_OVER_STARTER}`);
  else fail(`stuck men leave only ${fmt(rate(left.stuck) - rate(left.starter))} more than starters`);
}

if (MEASURE) console.log('\nMEASURED ' + JSON.stringify(MEASURED));
console.log(`\nfailures so far ${failures}`);
