/* Round 911: the recruiting trail, src/lib/collegeRecruiting.ts, held to
   what it promises, for college football AND basketball (one module, two
   descriptors). Every run is seeded; the policies below are coaches written
   against the module's public API, not reaching into it.

   Four programs a sport, spread from the bottom of the table to the top
   (cfb UNLV, LOU, MIA, OSU; cbb CUSE, LOU, BAMA, KU), 120 seeds each. A
   class score is each signee's TRUE rating over 50, summed.

     1) the right pitch. Same targets, same hours, same draws: a coach who
        sells each man's top priority signs a better class than one who
        sells a random one, and both beat a coach who does nothing.
     2) equal budget. All NIL and no contact (offers at his ask, best man
        first, while the pot covers it, made cold in week one) against a
        balanced coach spending the same pot under the same rule plus calls,
        pitches and visits. Balanced wins.
     3) a low prestige program (UNLV, CUSE) working in-state three stars
        signs a better class than the same program chasing the stars.
     4) on every run of every section, plus a greedy coach who asks for
        everything every week: every man signs exactly once, no school
        passes the cap, signings match commitments, the pot never goes
        negative and NIL paid is exactly my signees' offers, no week spends
        more hours than it has, visits stay inside the limit, nothing moves
        after signing day, and a second signing day changes nothing.
     4b) a commitment can still flip: a coach who stops working his commits
        loses more of them than one who keeps at it.
     5) the scouting band: evaluation walks 16, 8, 4, 2 exactly (every step,
        not just the ends), never leaves the old band, always holds the
        truth; no other action ever moves a band.
     6) the portal: a man I sat down with never leaves, the sit down does
        not change who else goes (one draw a man), no senior and no one and
        done freshman enters, a good man stuck behind a starter leaves at
        the module's rate and far more than a starter, outside men carry
        exact tape, the window is short, everyone signs, the cap holds.
     7) the official visit: home win week > away week > home loss week > 0.

   Measured, seed bases 0 / 1000 / 2000 (COLLEGE_RECRUITING_SEED_BASE), and
   each floor is about half the smallest of the three:

     1  top minus random   cfb 81.9 / 79.8 / 79.0  floor 40   cbb 45.8 / 49.1 / 44.3  floor 22
     1  random minus none  cfb 23.9 / 23.8 / 25.8  floor 12   cbb 23.0 / 22.6 / 26.1  floor 11
     2  balanced minus NIL cfb 110.6 / 110.7 / 110.3 floor 55 cbb 69.3 / 70.8 / 70.4  floor 35
     3  home minus chase   cfb 47.2 / 53.4 / 51.9  floor 24   cbb 40.2 / 33.1 / 35.7  floor 16
     4b neglect flips away cfb 2.40 / 2.48 / 2.40  floor 1.2  cbb 0.81 / 0.81 / 0.84  floor 0.4
        (a steady coach lost 0.00 on every base)
     6  stuck men leave .309 / .303 / .303 of about 1,000 (band 0.25 to 0.37,
        about four standard errors each way); starters .016 / .016 / .026,
        so the gap floor is 0.2
     7  a home win visit is worth 1.70 of an away one

   Negative controls, COLLEGE_RECRUITING_CONTROL=<name>. Each asserts its
   anchor is in the bundle exactly once before it edits, and the run passes
   only if the sections it names went red:

     nopitch    the pitch bonus is zeroed                -> 1 red (and 4b)
     nowork     calls, pitches, visits and drift do nothing, cold money counts full -> 2 red
     noreach    a five star listens to anyone            -> 3 red
     nocap      every school always has room             -> 4 red
     overspend  a NIL offer stops checking the pot       -> 4 red
     unsigned   a committed man never signs              -> 4 red
     noflip     a commitment can never flip              -> 4b red
     badband    evaluation can narrow past the truth     -> 5 red
     noretain   a sit down keeps nobody                  -> 6 red
     visitflat  a home win visit is worth an away one    -> 7 red

   Run: node scripts/simCollegeRecruiting.mjs (about 25 s)
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

/* Each control: the exact bundled text it rewrites, what it becomes, and the
   sections that must go red when it runs. A control that turns no section
   red, or the wrong one, fails the run. */
const CONTROLS = {
  nopitch: { red: ['1'], edits: [['PITCH_RANK_BONUS = [9, 5, 2.5]', 'PITCH_RANK_BONUS = [0, 0, 0]']] },
  nowork: {
    red: ['2'],
    edits: [
      ['CONTACT_GAIN = 3;', 'CONTACT_GAIN = 0;'],
      ['PITCH_BASE = 2;', 'PITCH_BASE = 0;'],
      ['PITCH_RANK_BONUS = [9, 5, 2.5]', 'PITCH_RANK_BONUS = [0, 0, 0]'],
      ['VISIT_GAIN = 24;', 'VISIT_GAIN = 0;'],
      ['NIL_COLD_MULT = 0.5;', 'NIL_COLD_MULT = 1;'],
      ['NEGLECT_DRIFT = 0.05;', 'NEGLECT_DRIFT = 0;'],
    ],
  },
  noreach: { red: ['3'], edits: [['return clamp(1 - Math.max(0, need - prestige) / sport.reachSpan, REACH_MIN, 1);', 'return 1;']] },
  nocap: { red: ['4'], edits: [['var hasRoom = (t, id) => id === OFF_BOARD || (t.commits[id] ?? 0) < t.classCap;', 'var hasRoom = (t, id) => true;']] },
  overspend: { red: ['4'], edits: [['const amount = Math.floor(Math.min(a.amount ?? r.nilAsk, t.nilLeft));', 'const amount = Math.floor(a.amount ?? r.nilAsk);']] },
  unsigned: { red: ['4'], edits: [['r.signedWith = r.committedTo;', 'r.signedWith = null;']] },
  noflip: { red: ['4b'], edits: [['FLIP_MARGIN = 10;', 'FLIP_MARGIN = 1e9;']] },
  badband: { red: ['5'], edits: [['const to = Math.min(r.trueOvr, r.hi - 2 * nw);', 'const to = r.hi - 2 * nw;']] },
  noretain: { red: ['6'], edits: [['if (goes && !retained.includes(m.id)) lost.push(m);', 'if (goes) lost.push(m);']] },
  visitflat: { red: ['7'], edits: [['VISIT_HOME_WIN = 1.7;', 'VISIT_HOME_WIN = 1;']] },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`COLLEGE_RECRUITING_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

let failures = 0;
let SECTION = '';
const redSections = new Set();
const fail = m => { failures += 1; redSections.add(SECTION); console.error('  FAIL: ' + m); };
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
  for (const [from, to] of CONTROLS[CONTROL].edits) {
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
const FLIP_FLOOR = { cfb: 1.2, cbb: 0.4 };
/* The portal (section 6): the rate a good man stuck behind a starter leaves, and how much more than a starter. */
const STUCK_BAND = [0.25, 0.37];
const STUCK_OVER_STARTER = 0.2;
/* Floors, each set well under the measured gap (see the header). */
const FLOORS = {
  s1TopOverRandom: { cfb: 40, cbb: 22 },
  s1RandomOverNone: { cfb: 12, cbb: 11 },
  s2BalancedOverNil: { cfb: 55, cbb: 35 },
  s3HomeOverChase: { cfb: 24, cbb: 16 },
};

for (const sportKey of ['cfb', 'cbb']) {
  const schools = spread(sportKey);
  console.log(`\n== ${sportKey}: programs ${schools.join(', ')}, ${SEEDS} seeds each`);

  SECTION = '1'; console.log('-- 1) the right pitch: top priority beats a random pitch, and both beat no effort');
  const top = mean(runMany(sportKey, schools, worker({ pitch: 'top' }), 's1top'));
  const rnd = mean(runMany(sportKey, schools, worker({ pitch: 'random' }), 's1rnd'));
  const none = mean(runMany(sportKey, schools, nobody(), 's1none'));
  MEASURED[`${sportKey} s1`] = { top, rnd, none };
  console.log(`     class score: top ${fmt(top)}  random ${fmt(rnd)}  none ${fmt(none)}`);
  if (top - rnd >= FLOORS.s1TopOverRandom[sportKey]) ok(`top over random ${fmt(top - rnd)} >= ${FLOORS.s1TopOverRandom[sportKey]}`);
  else fail(`${sportKey} top priority pitch over random pitch is ${fmt(top - rnd)}, floor ${FLOORS.s1TopOverRandom[sportKey]}`);
  if (rnd - none >= FLOORS.s1RandomOverNone[sportKey]) ok(`random over none ${fmt(rnd - none)} >= ${FLOORS.s1RandomOverNone[sportKey]}`);
  else fail(`${sportKey} random pitch over no effort is ${fmt(rnd - none)}, floor ${FLOORS.s1RandomOverNone[sportKey]}`);

  SECTION = '2'; console.log('-- 2) equal budget: a balanced coach beats all NIL and no contact');
  const bal = mean(runMany(sportKey, schools, worker({ pitch: 'top', visits: true, nil: true }), 's2bal'));
  const nilOnly = mean(runMany(sportKey, schools, allNil(), 's2nil'));
  MEASURED[`${sportKey} s2`] = { bal, nilOnly };
  console.log(`     class score: balanced ${fmt(bal)}  all NIL ${fmt(nilOnly)}`);
  if (bal - nilOnly >= FLOORS.s2BalancedOverNil[sportKey]) ok(`balanced over all NIL ${fmt(bal - nilOnly)} >= ${FLOORS.s2BalancedOverNil[sportKey]}`);
  else fail(`${sportKey} balanced over all NIL is ${fmt(bal - nilOnly)}, floor ${FLOORS.s2BalancedOverNil[sportKey]}`);

  SECTION = '3'; console.log('-- 3) a low prestige program: working in-state three stars beats chasing the stars');
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

SECTION = '4'; console.log('\n-- 4) on every run: every man signs once, and no cap, pot, hour or visit limit is ever broken');
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
const flipsBy = {};
for (const r of ALL_RUNS) flipsBy[r.tag] = (flipsBy[r.tag] ?? 0) + r.log.flips;
MEASURED.s4 = { runs: ALL_RUNS.length, flipRate, greedySpent, commitShare, commitMine, flipsBy };
console.log(`     ${ALL_RUNS.length} runs, ${fmt(flipRate)} flips a run, greedy coach spent ${fmt(greedySpent)} a run before signing day`);
for (const [k, v] of Object.entries(bad)) {
  if (v === 0) ok(`${k}: 0 runs broke it`);
  else fail(`${k}: ${v} runs broke it`);
}
if (greedySpent > 0) ok('the greedy coach did reach the pot, so the pot check was exercised');
else fail('the greedy coach never spent, so the pot check proved nothing');

SECTION = '4b'; console.log('\n-- 4b) a commitment can still flip: a coach who stops working his commits loses more of them than one who keeps at it');
for (const sportKey of ['cfb', 'cbb']) {
  runMany(sportKey, spread(sportKey), worker({ pitch: 'top', hold: false }), 's4neglect');
  const of = tag => ALL_RUNS.filter(r => r.tag === tag && r.sportKey === sportKey);
  const away = { steady: mean(of('s1top').map(r => r.log.flipsAway)), neglect: mean(of('s4neglect').map(r => r.log.flipsAway)) };
  MEASURED[`${sportKey} s4b`] = away;
  console.log(`     ${sportKey}: commits flipped away a run, steady ${fmt(away.steady)}  neglect ${fmt(away.neglect)}`);
  if (away.neglect - away.steady >= FLIP_FLOOR[sportKey]) ok(`neglect loses ${fmt(away.neglect - away.steady)} more a run >= ${FLIP_FLOOR[sportKey]}`);
  else fail(`${sportKey} neglected commits flip away only ${fmt(away.neglect - away.steady)} a run more than worked ones, floor ${FLIP_FLOOR[sportKey]}`);
}

SECTION = '5'; console.log('\n-- 5) the scouting band: only evaluation narrows it, every step halves it, and it always holds the truth');
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

SECTION = '6'; console.log('\n-- 6) the portal: a sit down keeps a man, real tape, a short window, and its own cap');
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

SECTION = '7'; console.log('\n-- 7) the official visit: a home win week is worth more than a week away, which is worth more than a home loss');
{
  let wrong = 0;
  let cases = 0;
  const ratios = [];
  for (const sportKey of ['cfb', 'cbb']) {
    const sp = SPORTS[sportKey];
    const ctx = programOf(sp, sp.schools.find(s => s.id === spread(sportKey)[3]));
    for (let k = 0; k < SEEDS; k++) {
      let n = 0;
      const t0 = rec.openTrail(sp.d, sp.schools, ctx, 2026, { rng: mulberry32(SEED_BASE + k + 77), genName: sp.genName, newId: () => `v${++n}` });
      const id = t0.recruits[k % t0.recruits.length].id;
      const gain = wk => {
        const t = rec.sanitizeTrail(JSON.parse(JSON.stringify(t0)));
        const before = t.recruits.find(r => r.id === id).interest[t.mySchool];
        rec.runTrailWeek(sp.d, t, [{ kind: 'visit', recruitId: id }], ctx, wk, sp.schools, mulberry32(k));
        return t.recruits.find(r => r.id === id).interest[t.mySchool] - before;
      };
      const win = gain({ home: true, won: true });
      const away = gain({ home: false, won: false });
      const loss = gain({ home: true, won: false });
      cases += 1;
      if (!(win > away && away > loss && loss > 0)) wrong += 1;
      ratios.push(win / away);
    }
  }
  MEASURED.s7 = { cases, meanWinOverAway: mean(ratios) };
  console.log(`     ${cases} visits priced three ways, a home win worth ${fmt(mean(ratios))} of an away week`);
  if (wrong === 0) ok('home win > away > home loss > 0 on every case'); else fail(`${wrong} of ${cases} visits did not order home win > away > home loss > 0`);
}

if (MEASURE) console.log('\nMEASURED ' + JSON.stringify(MEASURED));

const red = [...redSections].sort();
if (CONTROL) {
  const want = CONTROLS[CONTROL].red;
  const missed = want.filter(s => !redSections.has(s));
  if (missed.length === 0) {
    console.log(`\ncontrol "${CONTROL}": section(s) ${red.join(', ')} went red (wanted ${want.join(', ')}), ${failures} failure(s), the check works`);
    process.exit(0);
  }
  console.error(`\ncontrol "${CONTROL}": wanted section(s) ${want.join(', ')} red, got [${red.join(', ')}], the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimCollegeRecruiting: ${failures} failure(s) in section(s) ${red.join(', ')}`); process.exit(1); }
console.log('\nsimCollegeRecruiting: all checks green');
