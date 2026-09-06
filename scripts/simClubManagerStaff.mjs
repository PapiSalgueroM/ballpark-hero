/* Club Manager: the four staff posts cost what the desk says, help the half
   of the pitch they say they help, tax nobody who ignores them, and can be
   taken off you by a rival.

   Round 471. His words: "Staff: hire and fire attack, defense, goalkeeping
   coaches, lead scout, and promote from the academy staff. Generated people
   with generated portrait art, each with levels and potential. Rivals can
   poach them; you can match offers a limited number of times." The desk is
   src/lib/clubManagerStaff.ts and this file holds it to those words.

   Sections:
     1) day one men come from stature and nothing typed per club: every
        playable modern and era club opens with four men inside 1 to 10,
        every potential at or above its level, the tier 1 giants high and
        the floor budget clubs low, the same club always the same four.
     2) the wage really reaches the ledger: staffPayrollWeekly is the sum of
        the four wages to the pound, staffWagesWeekly is the academy line
        plus exactly that, a whole season's ledger equals the sum of the
        weekly charges, and a hire and a pay off leave the kitty for exactly
        what the desk quoted and land on the books' Staff fees line.
     3) each effect runs the right way and stays bounded, measured with and
        without on identical draws:
          growth: developmentRate read for EVERY position in the Position
            union, one coach at a time, so a coach wired to the wrong unit
            fails rather than hiding inside a pooled mean; then the same
            summer rolled at level 1 and at level 10 over ten clubs, mean
            positive drift of everybody with headroom, and no player past
            his ceiling either way (the Round 96 and 116 rule).
          scouting: every week played TWICE from the same state and the same
            point in the stream, once at lead scout 1 and once at 10, and
            only that week's reports compared, so the two runs cannot drift
            apart; mean ceiling of what came home, never above the 93 the
            trip already capped.
     4) Round 95's rule, twice: every effect in the module is exactly
        neutral at level 1 AND on an empty post, the effects are counted off
        the source so a fifth one cannot be added without being checked, the
        coach factor sits inside developmentRate's clamp, and a club that
        never opens the desk spends nothing on it all season.
     5) poaching fires for EVERY post, the deadline takes the man, matching
        keeps him and costs a match, and the limit binds and comes back in
        the summer.
     6) the desk: the shortlist is three men from outside plus the academy
        promotion, the promotion is free and follows the club's own academy
        coaching level and has the most room left, a hire charges the quoted
        fee and refuses a short kitty and a filled post, a pay off charges
        the quoted severance and opens the job, and a promoted man really
        grows over seasons.
     7) an old save and a mangled block both fail closed to the club's day
        one men, a garbage block loads through loadCareer, and a stay keeps
        the staff while a move drops them.
     8) nobody on the staff is a real footballer: the whole cross product of
        the two banks against every real name the worlds carry, and every
        name the module actually emits is one of those pairings.

   Negative controls (house rule: prove the checks can fail):
     CM_STAFF_CONTROL=nolift bundles a copy of the engine with the coach
       factor taken back out of developmentRate. Section 3 must go red.
     CM_STAFF_CONTROL=tax bundles a copy of the desk whose post multiplier
       reads 1.05 at level 1. Section 4 must go red.
     CM_STAFF_CONTROL=freewage bundles a copy of the books whose weekly
       staff wage forgets the four men. Section 2 must go red.
     Every control refuses to run if its rewrite did not find its text.

   Bands, measured on this harness's own seeded stream on 2026-09-06:
     growth, all four at level 10 over all four at level 1, mean whole point
       drift of every player with three or more points of headroom pooled
       over ten clubs: measured 1.098x on the default seed, 1.052x on
       SIM_SEED=2 and 1.056x on SIM_SEED=3, against a multiplier of 1.099x
       and a nolift control that reads 1.000x. The band is 1.03x to 1.20x:
       the floor sits half way between the control and the thinnest run
       measured, so a coach whose effect halved fails and a quiet seed does
       not. The strong reading in this section is the per position one above
       it, which is exact; the season drift is the outcome behind it and
       carries agePlayer's whole point rounding.
     scouting, mean paired lift in the ceiling of the boys a week brings
       home: +6.00 exactly on all three seeds, on 70 to 76 weeks that
       produced a report, which is the 6 the desk adds with the 93 clamp
       never biting at these means. The band is 4 to 6.5, wide enough for a
       run where the clamp does bite.
     approaches: with all four men on level 10 the limit probe drew 3 in 26
       weeks (2 matched, the third refused), the per post probe drew its
       first rival after 62, 1, 7 and 26 weeks, and three seasons of level 5
       men drew none. Those four numbers are hashed rather than drawn, so
       they do not move with the seed.

   Run: node scripts/simClubManagerStaff.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.CM_STAFF_CONTROL || '';
if (CONTROL && !['nolift', 'tax', 'freewage'].includes(CONTROL)) {
  console.error(`CM_STAFF_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const lf = s => s.replaceAll('\r\n', '\n');
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* ---- bundle the engine, the desk and the books, regressed on a control ---- */
let enginePath = `${ROOT_URL}/src/lib/clubManager.ts`;
let deskPath = `${ROOT_URL}/src/lib/clubManagerStaff.ts`;
let booksPath = `${ROOT_URL}/src/lib/clubManagerFinances.ts`;
if (CONTROL === 'nolift') {
  const src = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8'));
  const fixed = 'trainingGroundGrowthMult(career) * coachGrowthMult(career, p.position)';
  const broken = 'trainingGroundGrowthMult(career)';
  if (!src.includes(fixed)) { console.error('control cannot run: clubManager.ts is not in the shape CM_STAFF_CONTROL=nolift rewrites'); process.exit(1); }
  enginePath = `${TMP}/clubManagerStaff.nolift.ts`;
  fs.writeFileSync(enginePath, src.replace(fixed, broken));
  console.log('NEGATIVE CONTROL ON: the coaches no longer reach developmentRate');
}
if (CONTROL === 'tax') {
  const src = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerStaff.ts'), 'utf8'));
  const fixed = 'return 1 + 0.011 * (staffLevel(state, post) - 1);';
  const broken = 'return 1.05 + 0.011 * (staffLevel(state, post) - 1);';
  if (!src.includes(fixed)) { console.error('control cannot run: clubManagerStaff.ts is not in the shape CM_STAFF_CONTROL=tax rewrites'); process.exit(1); }
  deskPath = `${TMP}/clubManagerStaff.tax.ts`;
  fs.writeFileSync(deskPath, src.replace(fixed, broken));
  console.log('NEGATIVE CONTROL ON: the post multiplier cannot reach 1');
}
if (CONTROL === 'freewage') {
  const src = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerFinances.ts'), 'utf8'));
  const fixed = 'return Math.round(k * (eraHistOf(state) ? ERA_MONEY : 1)) + staffPayrollWeekly(state);';
  const broken = 'return Math.round(k * (eraHistOf(state) ? ERA_MONEY : 1));';
  if (!src.includes(fixed)) { console.error('control cannot run: clubManagerFinances.ts is not in the shape CM_STAFF_CONTROL=freewage rewrites'); process.exit(1); }
  booksPath = `${TMP}/clubManagerStaff.freewage.ts`;
  fs.writeFileSync(booksPath, src.replace(fixed, broken));
  console.log('NEGATIVE CONTROL ON: the four men work for nothing in the ledger');
}
const ENTRY = `${TMP}/clubManagerStaff.entry.mjs`;
const BUNDLE = `${TMP}/clubManagerStaff.bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const engine = await import('${enginePath}');
export const desk = await import('${deskPath}');
export const books = await import('${booksPath}');
export { NATIONALITY_BY_WORLD } from '${ROOT_URL}/src/data/playerNationalities.ts';
`);
/* Every module under test is aliased in by its import path, so the engine's
   own imports resolve to the control copy when one is on. */
const aliases = [
  `--alias:@/lib/clubManagerStaff=${deskPath}`,
  `--alias:@/lib/clubManagerFinances=${booksPath}`,
  `--alias:@/lib/clubManager=${enginePath}`,
  `--alias:@=${ROOT_URL}/src`,
];
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error ${aliases.join(' ')}`, { stdio: 'inherit' });
const mod = await import(pathToFileURL(BUNDLE).href);
const cm = mod.engine;
const st = mod.desk;
const fin = mod.books;
const {
  startCareer, playNextEntry, finishSeason, startNextSeason, developmentRate, clubDefFor, eraClubDefFor,
  playableClubs, REAL_LEAGUES, eraPlayableClubs, eraLeaguesFor, CM_ERAS, loadCareer, SCOUT_REGIONS, hireScout,
} = cm;
const {
  STAFF_POST_IDS, STAFF_MAX, STAFF_MATCHES_PER_SEASON, POACH_WEEKS, STAFF_POST_INFO,
  staffStartLevel, staffOf, staffIn, staffLevel, ensureStaff, isValidStaff, staffWage, staffPayrollWeekly,
  postGrowthMult, coachGrowthMult, coachForPosition, scoutQualityBonus, staffShortlist, severanceFor,
  hireStaff, sackStaff, matchStaffOffer, releaseToPoacher, tickStaff, rolloverStaff, staffPortraitSvg,
  staffEffectLine,
} = st;
const { staffWagesWeekly, projectFinances, closeLedger } = fin;

/* A stream the harness owns, so two rolls of one summer share their draws.
   Its position can be read and put back, which is how section 3 replays one
   single week twice on exactly the same draws. */
function makeStream(seed) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.mark = () => a;
  next.rewind = v => { a = v; };
  return next;
}
const SEED_OFFSET = (Number(process.env.SIM_SEED) || 0) * 7919;
const withStream = (seed, fn) => {
  const saved = Math.random;
  Math.random = makeStream(seed + SEED_OFFSET);
  try { return fn(); } finally { Math.random = saved; }
};

const clone = s => JSON.parse(JSON.stringify(s));
const floorClub = (() => {
  for (const l of REAL_LEAGUES) for (const c of playableClubs(l.id)) if (c.budget <= 8 && c.tier === 4) return c.name;
  throw new Error('no floor club in the playable lists');
})();
/** Every post at one level, potentials lifted to match so nobody is capped. */
const setAll = (s, level) => {
  const c = clone(s);
  const block = ensureStaff(c);
  for (const post of STAFF_POST_IDS) {
    if (!block[post]) continue;
    block[post].level = level;
    block[post].potential = Math.max(level, block[post].potential);
  }
  return c;
};
/** One post at a level, every other post empty. */
const onlyPost = (s, post, level) => {
  const c = setAll(s, level);
  const block = ensureStaff(c);
  for (const other of STAFF_POST_IDS) if (other !== post) block[other] = null;
  return c;
};
const emptyAll = s => {
  const c = clone(s);
  const block = ensureStaff(c);
  for (const post of STAFF_POST_IDS) block[post] = null;
  return c;
};
function playSeason(s, opts = {}) {
  let guard = 0;
  while (guard < 120 && s.week < s.calendar.length && !s.sacked) {
    guard++;
    if (opts.each) s = opts.each(s) ?? s;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

/* ---------- 1. Day one men come from stature ---------- */
console.log('1) Day one staff come from stature, four men per club, every one inside 1 to 10');
{
  const defs = [];
  for (const l of REAL_LEAGUES) for (const c of playableClubs(l.id)) defs.push({ ...c, where: l.id });
  for (const era of CM_ERAS) {
    if (era.id === 'now') continue;
    for (const l of eraLeaguesFor(era.id)) for (const c of eraPlayableClubs(era.id, l.id)) defs.push({ ...c, where: `${era.id}/${l.id}` });
  }
  let giants = 0, giantsHigh = 0, floor = 0, floorLow = 0, outside = 0;
  for (const d of defs) {
    const levels = STAFF_POST_IDS.map(post => staffStartLevel(d, d.name, post));
    for (const lv of levels) if (!(Number.isInteger(lv) && lv >= 1 && lv <= STAFF_MAX)) outside++;
    if (d.tier === 1) { giants++; if (Math.min(...levels) >= 7) giantsHigh++; }
    if (d.tier === 4 && d.budget <= 8) { floor++; if (Math.max(...levels) <= 2) floorLow++; }
  }
  if (outside) fail(`${outside} day one levels fall outside 1 to 10`);
  if (giants < 5) fail(`only ${giants} tier 1 clubs found, the sample is too thin`);
  if (giantsHigh !== giants) fail(`${giants - giantsHigh} of ${giants} tier 1 clubs open under 7 somewhere`);
  if (floor < 100) fail(`only ${floor} floor budget clubs found, the sample is too thin`);
  if (floorLow !== floor) fail(`${floor - floorLow} of ${floor} floor budget clubs open above 2 somewhere`);
  /* The same club always opens on the same four men, and every ceiling sits
     at or above the level it belongs to. */
  let checked = 0;
  for (const club of ['Real Madrid', 'Everton', floorClub, 'Ajax']) {
    const a = staffOf(startCareer(club));
    const b = staffOf(startCareer(club));
    for (const post of STAFF_POST_IDS) {
      const p = a[post], q = b[post];
      if (!p) { fail(`${club}: ${post} opened empty`); continue; }
      if (JSON.stringify(p) !== JSON.stringify(q)) fail(`${club}: ${post} opened as two different men`);
      if (p.potential < p.level) fail(`${club}: ${post} has a ceiling of ${p.potential} under his level ${p.level}`);
      if (p.wage !== staffWage(p.level, false)) fail(`${club}: ${post} is on ${p.wage}k, the ladder says ${staffWage(p.level, false)}k`);
      if (p.academy) fail(`${club}: ${post} opened as an academy promotion nobody promoted`);
      checked++;
    }
  }
  /* An era save's men are on era money, which is smaller. */
  const eraId = CM_ERAS.find(e => e.id !== 'now')?.id;
  const eraCareer = startCareer('Manchester United', eraId);
  const eraMan = staffOf(eraCareer).attack;
  if (eraMan && eraMan.wage !== staffWage(eraMan.level, true)) fail(`an era coach is on ${eraMan.wage}k, the era ladder says ${staffWage(eraMan.level, true)}k`);
  if (eraMan && staffWage(eraMan.level, true) >= staffWage(eraMan.level, false)) fail('era money is not smaller than modern money on a staff wage');
  const rm = staffOf(startCareer('Real Madrid'));
  const small = staffOf(startCareer(floorClub));
  console.log(`   ${defs.length} clubs checked (${giants} tier 1 all on 7 or more, ${floor} floor budget all on 2 or less), ${checked} men re-opened identically; Real Madrid ${STAFF_POST_IDS.map(p => rm[p].level).join('/')} on ${STAFF_POST_IDS.map(p => rm[p].wage).join('/')}k, ${floorClub} ${STAFF_POST_IDS.map(p => small[p].level).join('/')} on ${STAFF_POST_IDS.map(p => small[p].wage).join('/')}k`);
}

/* ---------- 2. The wage reaches the ledger, the fee leaves the kitty ---------- */
console.log('2) The staff wage reaches the ledger and the fees leave the kitty for what the desk quoted');
{
  for (const club of ['Real Madrid', 'Everton', floorClub]) {
    const s = startCareer(club);
    const block = staffOf(s);
    const sum = STAFF_POST_IDS.reduce((n, p) => n + (block[p]?.wage ?? 0), 0);
    if (staffPayrollWeekly(s) !== sum) fail(`${club}: payroll reads ${staffPayrollWeekly(s)}k, the four wages sum to ${sum}k`);
    const without = staffWagesWeekly(emptyAll(s));
    const gap = staffWagesWeekly(s) - without;
    if (gap !== sum) fail(`${club}: the weekly staff wage rises ${gap}k when the four are on the books, they earn ${sum}k`);
  }
  /* A whole season: what the ledger charged is what the desk was owed for
     every calendar week it played. One entry can carry more than one week
     (a match plus the free week after it), so the owed figure counts the
     weeks the entry actually advanced rather than the entries. */
  let seasons = 0;
  for (const [i, club] of ['Everton', 'Napoli', 'Brentford'].entries()) {
    const { end, owed, weeks } = withStream(30 + i, () => {
      let s = startCareer(club);
      let owedM = 0, guard = 0, wk = 0;
      while (guard < 120 && s.week < s.calendar.length && !s.sacked) {
        guard++;
        const rate = staffWagesWeekly(s) / 1000;
        const before = s.week;
        const r = playNextEntry(s, { skipHalftime: true });
        s = r.state;
        owedM += rate * Math.max(0, s.week - before);
        wk += Math.max(0, s.week - before);
        if (r.kind === 'seasonOver') break;
      }
      return { end: s, owed: owedM, weeks: wk };
    });
    const ledger = closeLedger(end);
    if (weeks !== ledger.weeks) fail(`${club}: the calendar advanced ${weeks} weeks and the ledger charged ${ledger.weeks}`);
    if (!near(ledger.staffWages, owed, 0.03)) fail(`${club}: the ledger charged ${ledger.staffWages}m of staff wages over ${ledger.weeks} weeks, the desk was owed ${owed.toFixed(3)}m`);
    if (!(ledger.staffWages > 0)) fail(`${club}: no staff wages in the ledger at all`);
    seasons++;
    if (i === 0) {
      console.log(`   ${club}: ${staffPayrollWeekly(end)}k a week on the four inside a ${staffWagesWeekly(end)}k staff line, ledger ${ledger.staffWages.toFixed(2)}m over ${ledger.weeks} weeks against ${owed.toFixed(2)}m owed`);
    }
  }
  if (seasons < 3) fail(`only ${seasons} seasons measured`);
  /* The fee and the severance: exactly what was quoted, on the books. */
  const base = { ...startCareer('Everton'), budget: 400 };
  const pay = severanceFor(base, 'attack');
  const sacked = sackStaff(base, 'attack');
  if (!sacked) fail('a funded pay off returned null');
  else {
    if (!near(base.budget - sacked.budget, pay, 0.011)) fail(`the pay off took ${(base.budget - sacked.budget).toFixed(2)}m, quoted ${pay}m`);
    if (staffIn(sacked, 'attack')) fail('the attack coach is still in the job after being paid off');
    if (staffOf(base).attack === null) fail('sackStaff mutated the state it was handed');
    if (!near(closeLedger(sacked).staffFees, pay, 0.011)) fail(`the closed ledger says ${closeLedger(sacked).staffFees}m of staff fees, the pay off was ${pay}m`);
    const line = projectFinances(sacked).spend.find(l => l.id === 'staffFees');
    if (!line) fail('the projection has no Staff fees line');
    else if (!near(line.actual, pay, 0.011)) fail(`the projection's Staff fees line reads ${line.actual}m, the pay off was ${pay}m`);
    else if (!line.kitty) fail('the Staff fees line says it does not move the kitty, and it does');
    const cand = staffShortlist(sacked, 'attack')[0];
    const poor = hireStaff({ ...sacked, budget: cand.fee - 0.01 }, 'attack', cand.person.id);
    if (poor) fail(`a kitty of ${(cand.fee - 0.01).toFixed(2)}m hired a ${cand.fee}m coach`);
    const hired = hireStaff(sacked, 'attack', cand.person.id);
    if (!hired) fail('a funded hire returned null');
    else {
      if (!near(sacked.budget - hired.budget, cand.fee, 0.011)) fail(`the hire took ${(sacked.budget - hired.budget).toFixed(2)}m, quoted ${cand.fee}m`);
      if (staffIn(hired, 'attack')?.id !== cand.person.id) fail('the man hired is not the man on the shortlist');
      if (hireStaff(hired, 'attack', cand.person.id)) fail('a filled post hired a second coach');
      if (!near(closeLedger(hired).staffFees, Math.round((pay + cand.fee) * 100) / 100, 0.011)) fail('the ledger lost the hire fee');
      console.log(`   Everton: pay off ${pay}m and a ${cand.fee}m replacement both left the kitty to the pound and both sit on the books' Staff fees line (${closeLedger(hired).staffFees}m)`);
    }
  }
}

/* ---------- 3. The effects, with and without, on identical draws ---------- */
console.log('3) Each effect runs the right way, on every position, and stays bounded');
{
  /* Every position in the union, one coach at a time. A coach wired to the
     wrong unit fails here rather than hiding inside a pooled mean, and the
     count of positions is read off the type so a new one cannot slip in
     uncovered. */
  const typeSrc = lf(fs.readFileSync(path.join(ROOT, 'src/types/game.ts'), 'utf8'));
  const m = typeSrc.match(/export type Position\s*=\s*([^;]+);/);
  if (!m) fail('could not read the Position union out of src/types/game.ts');
  const POSITIONS = m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : [];
  if (POSITIONS.length < 12) fail(`only ${POSITIONS.length} positions read out of the Position union`);
  const base = startCareer('Everton');
  const kid = { id: 'k', name: 'k', position: 'CM', rating: 60, age: 19, potential: 80, apps: 20, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0, isYouth: false, seasonGoals: 0, seasonAssists: 0 };
  const owners = {};
  let covered = 0, shared = 0;
  for (const pos of POSITIONS) {
    const owner = coachForPosition(pos);
    owners[pos] = owner;
    if (owner === null) shared++; else covered++;
    if (owner !== null && !STAFF_POST_IDS.includes(owner)) fail(`${pos} is owned by ${owner}, which is not a post`);
    if (owner === 'scout') fail(`${pos} is coached by the lead scout`);
  }
  if (covered + shared !== POSITIONS.length) fail('a position is neither owned nor shared');
  if (shared < 1) fail('nobody stands on the halfway line, which the desk says the two coaches split');
  /* One coach at level 10, every other post empty: his own men move by the
     full factor, the halfway line by half of it, and nobody else moves. */
  const full = 1 + 0.011 * (STAFF_MAX - 1);
  let exact = 0;
  for (const post of ['attack', 'defence', 'goalkeeping']) {
    const solo = onlyPost(base, post, STAFF_MAX);
    for (const pos of POSITIONS) {
      const want = owners[pos] === post ? full : owners[pos] === null && post !== 'goalkeeping' ? 1 + (full - 1) / 2 : 1;
      const got = coachGrowthMult(solo, pos);
      if (!near(got, want, 0.0001)) fail(`${post} coach at 10: ${pos} reads ${got.toFixed(4)}, should be ${want.toFixed(4)}`);
      const rate = developmentRate({ ...kid, position: pos }, solo);
      const bare = developmentRate({ ...kid, position: pos }, emptyAll(base));
      if (!near(rate / bare, want, 0.0005)) fail(`${post} coach at 10: developmentRate for a ${pos} moved ${(rate / bare).toFixed(4)}, the multiplier says ${want.toFixed(4)}`);
      exact++;
    }
  }
  console.log(`   ${POSITIONS.length} positions in the union, ${covered} owned by one coach and ${shared} split between the two; ${exact} exact developmentRate readings, each coach moving only his own unit by x${full.toFixed(3)}`);

  /* Nobody grows past his ceiling, whoever is coaching. */
  const atCeiling = developmentRate({ ...kid, rating: 80 }, setAll(base, STAFF_MAX));
  const withRoom = developmentRate(kid, setAll(base, STAFF_MAX));
  if (!(atCeiling < withRoom * 0.2)) fail(`a player already at his ceiling still develops at ${atCeiling} with level 10 coaches`);

  /* The outcome: the same summer rolled at level 1 and at level 10. */
  const CLUBS = ['Everton', 'Napoli', 'Brentford', 'Newcastle', 'Ajax', 'Benfica', 'Leverkusen', 'Lyon', 'Sevilla', 'Coventry'];
  const pooledLo = [], pooledHi = [];
  let overCeiling = 0;
  for (const [i, club] of CLUBS.entries()) {
    const end = withStream(100 + i, () => playSeason(startCareer(club)));
    const { state: closed } = withStream(200 + i, () => finishSeason(end));
    const roll = level => withStream(300 + i, () => startNextSeason(setAll(closed, level)));
    const lo = roll(1), hiRun = roll(STAFF_MAX);
    const drift = next => {
      const by = new Map(next.squad.map(p => [p.id, p]));
      const out = [];
      for (const p of closed.squad) {
        const q = by.get(p.id);
        if (!q) continue;
        const pot = p.potential ?? p.rating;
        if (pot - p.rating >= 3 && p.age <= 27) out.push(q.rating - p.rating);
        if (q.rating > (q.potential ?? q.rating)) overCeiling++;
      }
      return out;
    };
    pooledLo.push(...drift(lo));
    pooledHi.push(...drift(hiRun));
  }
  const ml = mean(pooledLo), mh = mean(pooledHi);
  const ratio = mh / Math.max(0.01, ml);
  console.log(`   growth: mean drift of ${pooledLo.length} players with headroom across ${CLUBS.length} clubs, level 1 ${ml.toFixed(3)} vs level 10 ${mh.toFixed(3)} (${ratio.toFixed(3)}x, multiplier ${full.toFixed(3)}x)`);
  if (pooledLo.length < 60) fail(`only ${pooledLo.length} players with headroom sampled`);
  if (!(ratio >= 1.03)) fail(`level 10 coaches moved growth ${ratio.toFixed(3)}x, the effect is gone`);
  if (!(ratio <= 1.2)) fail(`level 10 coaches moved growth ${ratio.toFixed(3)}x, which is not small`);
  if (overCeiling) fail(`${overCeiling} players grew past their potential`);

  /* Scouting: the same trips, run at lead scout 1 and at 10. Boys are
     recorded the week they arrive, because the books only hold twelve at a
     time and the worst report is dropped when a thirteenth lands. */
  const scoutClubs = ['Everton', 'Napoli', 'Brentford', 'Newcastle', 'Ajax', 'Benfica', 'Leverkusen', 'Lyon', 'Sevilla', 'Coventry', 'Real Madrid', 'Manchester City'];
  /* The same three scouts in both runs, written straight onto the academy
     rather than hired. Hiring draws its candidates from the stream, so the
     two runs would be comparing different men (a network of 1 against a
     network of 5 is worth seven ceiling points on its own, more than the
     effect being measured) and the reading would be noise. */
  const FIXED_SCOUTS = SCOUT_REGIONS.slice(0, 3).map((region, n) => ({
    id: `probe-${n}`, name: `Probe ${n}`, judgement: 3, network: 3, fee: 2,
    regionId: region.id, regionName: region.name, regionFlag: region.flag, weeksLeft: 12, found: 0,
  }));
  /* Paired week by week, on exactly the same draws. Every week is played
     twice from the same state and the same point in the stream, once with
     a level 1 lead scout and once with a level 10 one, and only that week's
     new reports are compared. Running two whole seasons side by side does
     NOT work here: the youth name generator re-rolls until a name is free,
     so one better report earlier in the season costs a different number of
     draws and the two seasons quietly stop being the same season. That is
     what a first pass measured, and it read the effect at half its size. */
  const lowAll = [], highAll = [];
  const perWeek = [];
  let weeks = 0;
  for (const [i, club] of scoutClubs.slice(0, 8).entries()) {
    const saved = Math.random;
    const stream = makeStream(70 + i + SEED_OFFSET);
    Math.random = stream;
    try {
      let s = onlyPost(startCareer(club), 'scout', 1);
      let guard = 0;
      while (guard < 120 && s.week < s.calendar.length && !s.sacked) {
        guard++;
        s.academy.scouts = FIXED_SCOUTS.map(sc => ({ ...sc }));
        const before = new Set((s.academy?.prospects ?? []).map(p => p.id));
        const mark = stream.mark();
        const hi = playNextEntry(onlyPost(s, 'scout', STAFF_MAX), { skipHalftime: true }).state;
        stream.rewind(mark);
        const r = playNextEntry(s, { skipHalftime: true });
        s = r.state;
        weeks++;
        const fresh = state => (state.academy?.prospects ?? []).filter(p => !before.has(p.id) && p.source !== 'Academy').map(p => p.potential);
        const lo = fresh(s), up = fresh(hi);
        lowAll.push(...lo);
        highAll.push(...up);
        if (lo.length && lo.length === up.length) perWeek.push(mean(up) - mean(lo));
        if (up.some(p => p > 93)) fail(`${club}: a scouted ceiling went past the 93 the trip caps at`);
        if (r.kind === 'seasonOver') break;
      }
    } finally { Math.random = saved; }
  }
  if (perWeek.length < 40) fail(`only ${perWeek.length} paired weeks produced a report, the sample is too thin`);
  if (lowAll.length < 60) fail(`only ${lowAll.length} boys found on the road, the sample is too thin`);
  const lift = mean(perWeek);
  const worst = Math.min(...perWeek);
  console.log(`   scouting: ${weeks} weeks played twice on the same draws over ${scoutClubs.slice(0, 8).length} clubs, ${perWeek.length} of them bringing a report home; mean ceiling ${mean(lowAll).toFixed(2)} at lead scout 1 against ${mean(highAll).toFixed(2)} at 10, mean paired lift +${lift.toFixed(2)}, thinnest week +${worst.toFixed(2)} (the desk adds ${scoutQualityBonus(onlyPost(base, 'scout', STAFF_MAX))} before the 93 cap)`);
  if (!(lift >= 4)) fail(`the lead scout moved the ceiling of what came home by ${lift.toFixed(2)}, and he adds 6 before the cap`);
  if (!(lift <= 6.5)) fail(`the lead scout moved the ceiling by ${lift.toFixed(2)}, which is more than the 6 he is allowed to add`);
  if (!(worst > 0)) fail(`a week's reports came home no better with a level 10 lead scout (${worst.toFixed(2)})`);
}

/* ---------- 4. Round 95's rule, and nothing charged to a club that ignores it ---------- */
console.log('4) Every effect is exactly neutral at level 1 and on an empty chair, and the desk charges an idle club nothing');
{
  const base = startCareer('Everton');
  const floorState = setAll(base, 1);
  const bare = emptyAll(base);
  /* Count the effects off the source, so a fifth one cannot be added
     without being checked here. */
  const deskSrc = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerStaff.ts'), 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const effects = [...deskSrc.matchAll(/export function (\w+(?:Mult|Bonus|Lift))\(/g)].map(x => x[1]).sort();
  const known = ['coachGrowthMult', 'postGrowthMult', 'scoutQualityBonus'];
  if (JSON.stringify(effects) !== JSON.stringify(known)) {
    fail(`the desk exports ${effects.join(', ')} as effects, this section checks ${known.join(', ')}; add the new one`);
  }
  const typeSrc = lf(fs.readFileSync(path.join(ROOT, 'src/types/game.ts'), 'utf8'));
  const POSITIONS = [...(typeSrc.match(/export type Position\s*=\s*([^;]+);/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(x => x[1]);
  let neutral = 0;
  for (const state of [floorState, bare]) {
    for (const post of STAFF_POST_IDS) {
      if (postGrowthMult(state, post) !== 1) fail(`postGrowthMult for ${post} reads ${postGrowthMult(state, post)}, not 1`);
      neutral++;
    }
    for (const pos of POSITIONS) {
      if (coachGrowthMult(state, pos) !== 1) fail(`coachGrowthMult for ${pos} reads ${coachGrowthMult(state, pos)}, not 1`);
      neutral++;
    }
    if (scoutQualityBonus(state) !== 0) fail(`scoutQualityBonus reads ${scoutQualityBonus(state)}, not 0`);
    neutral++;
    if (staffPayrollWeekly(bare) !== 0) fail('an empty staff room still costs a wage');
  }
  /* And no effect anywhere on the ladder can dip under neutral. */
  for (let level = 1; level <= STAFF_MAX; level++) {
    const s = setAll(base, level);
    for (const pos of POSITIONS) if (coachGrowthMult(s, pos) < 1) fail(`coachGrowthMult for ${pos} at level ${level} is under 1`);
    if (scoutQualityBonus(s) < 0) fail(`scoutQualityBonus at level ${level} is negative`);
  }
  /* The factor sits inside developmentRate's clamp, read on the source. */
  const engineSrc = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const dev = engineSrc.match(/export function developmentRate\([\s\S]*?\n}\n/);
  if (!dev) fail('could not find developmentRate in the engine');
  else if (!/return clamp\([^;]*coachGrowthMult\(career, p\.position\)[^;]*, 0\.1, 2\.6\);/.test(dev[0])) fail('the coach factor is not inside developmentRate\'s clamp');
  const strength = engineSrc.match(/function myMatchStrength\([\s\S]*?\n}\n/);
  if (!strength) fail('could not find myMatchStrength in the engine');
  else if (/staffOf|coachGrowthMult|staffLevel|STAFF_POST/.test(strength[0])) fail('myMatchStrength reads the staff desk');
  /* A manager who never opens the desk is charged nothing for it. */
  let idleSpend = 0, idleFees = 0;
  for (const [i, club] of ['Everton', 'Brentford', floorClub].entries()) {
    const end = withStream(40 + i, () => playSeason(startCareer(club)));
    idleSpend += staffOf(end).seasonSpend;
    idleFees += closeLedger(end).staffFees;
  }
  if (idleSpend !== 0 || idleFees !== 0) fail(`three idle seasons spent ${idleSpend}m on staff and put ${idleFees}m on the fees line`);
  console.log(`   ${neutral} readings at level 1 and on an empty chair, all exactly neutral; ${effects.length} effects counted off the source; the clamp and myMatchStrength read on the comment stripped engine; three idle seasons spent 0m`);
}

/* ---------- 5. Poaching, the deadline and the match limit ---------- */
console.log('5) A rival can come for every post, the deadline takes the man, and the match limit binds');
{
  const base = startCareer('Real Madrid');
  /* Every post, one at a time, so a post nobody wrote a rival for fails. */
  const weeksTo = {};
  for (const post of STAFF_POST_IDS) {
    let s = onlyPost(base, post, STAFF_MAX);
    let week = 0;
    while (week < 300 && !staffOf(s).poach) { s.week = week; tickStaff(s); week++; }
    const poach = staffOf(s).poach;
    if (!poach) { fail(`no rival ever came in for the ${post} man in 300 weeks`); continue; }
    if (poach.postId !== post) fail(`the approach for the ${post} man names ${poach.postId}`);
    if (poach.club === s.clubName) fail('a club came in for its own coach');
    if (poach.weeksLeft !== POACH_WEEKS) fail(`the approach opened with ${poach.weeksLeft} weeks, the desk says ${POACH_WEEKS}`);
    if (!s.aiHeadlines.some(h => h.includes(poach.club))) fail(`the approach for the ${post} man never reached the news feed`);
    weeksTo[post] = week;
    /* Ignore it: he goes when it runs out, and not before. */
    const ignored = clone(s);
    for (let i = 0; i < POACH_WEEKS - 1; i++) { ignored.week = week + i; tickStaff(ignored); }
    if (!staffIn(ignored, post)) fail(`the ${post} man left before the deadline`);
    ignored.week = week + POACH_WEEKS;
    tickStaff(ignored);
    if (staffIn(ignored, post)) fail(`the ${post} man stayed after the deadline nobody answered`);
    if (staffOf(ignored).poach) fail('the approach is still on the desk after the man left');
    /* Match it: he stays, on more money, one match down. */
    const matched = matchStaffOffer(s);
    if (!matched) { fail(`matching the approach for the ${post} man returned null`); continue; }
    const before = staffIn(s, post), after = staffIn(matched, post);
    if (!after) fail(`matching lost the ${post} man anyway`);
    else if (!(after.wage > before.wage)) fail(`matching kept the ${post} man on the same ${after.wage}k`);
    if (staffOf(matched).poach) fail('the approach is still on the desk after it was matched');
    if (staffOf(matched).matchesLeft !== staffOf(s).matchesLeft - 1) fail('matching did not spend a match');
    if (staffOf(s).matchesLeft !== STAFF_MATCHES_PER_SEASON) fail('matchStaffOffer mutated the state it was handed');
    /* Or let him go. */
    const let_go = releaseToPoacher(s);
    if (!let_go) fail('letting him go returned null');
    else if (staffIn(let_go, post)) fail(`the ${post} man is still in the job after being let go`);
    else if (staffOf(let_go).matchesLeft !== STAFF_MATCHES_PER_SEASON) fail('letting him go spent a match');
  }
  /* The limit binds: the season's matches run out and the next one is refused. */
  let s = setAll(base, STAFF_MAX);
  let spent = 0, week = 0, offers = 0;
  while (week < 400 && spent <= STAFF_MATCHES_PER_SEASON) {
    s.week = week; week++;
    tickStaff(s);
    if (!staffOf(s).poach) continue;
    offers++;
    const next = matchStaffOffer(s);
    if (next) { s = next; spent++; }
    else break;
  }
  if (spent !== STAFF_MATCHES_PER_SEASON) fail(`${spent} offers were matched before the desk refused, the limit is ${STAFF_MATCHES_PER_SEASON}`);
  if (staffOf(s).matchesLeft !== 0) fail(`${staffOf(s).matchesLeft} matches left after spending them all`);
  if (matchStaffOffer(s)) fail('an offer was matched with no matches left');
  if (offers <= STAFF_MATCHES_PER_SEASON) fail(`only ${offers} approaches arrived, the limit was never actually reached`);
  /* Poor staff are never noticed. */
  let quiet = setAll(base, 5);
  let quietOffers = 0;
  for (let w = 0; w < 3 * 52; w++) { quiet.week = w % 52; tickStaff(quiet); if (staffOf(quiet).poach) quietOffers++; }
  if (quietOffers) fail(`${quietOffers} rivals came in for a staff of level 5 men`);
  /* And the summer hands the matches back. */
  const summer = { ...clone(s), season: (s.season ?? 1) + 1 };
  rolloverStaff(summer, s, false);
  if (summer.staff.matchesLeft !== STAFF_MATCHES_PER_SEASON) fail(`the new season opened with ${summer.staff.matchesLeft} matches, not ${STAFF_MATCHES_PER_SEASON}`);
  if (summer.staff.poach !== null) fail('an approach followed the club into the new season');
  console.log(`   every post drew a rival (first approach after ${STAFF_POST_IDS.map(p => `${p} ${weeksTo[p]}w`).join(', ')} at level 10); ${offers} approaches in ${week} weeks, ${spent} matched then refused; 0 approaches over three seasons of level 5 men; the summer hands ${STAFF_MATCHES_PER_SEASON} back`);
}

/* ---------- 6. The shortlist, the promotion and the growth ---------- */
console.log('6) Three men from outside plus your own academy, and the promoted man really grows');
{
  const base = { ...emptyAll(startCareer('Everton')), budget: 400 };
  let lists = 0;
  for (const post of STAFF_POST_IDS) {
    const list = staffShortlist(base, post);
    if (list.length !== 4) fail(`the ${post} shortlist has ${list.length} names, the desk promises four`);
    const outside = list.slice(0, 3), promo = list[3];
    if (outside.some(c => c.person.academy)) fail(`an outside candidate for ${post} is marked as an academy man`);
    if (outside.some(c => !(c.fee > 0))) fail(`an outside candidate for ${post} is free`);
    if (!promo.person.academy) fail(`the last name on the ${post} shortlist is not the academy promotion`);
    if (promo.fee !== 0) fail(`promoting from the academy costs ${promo.fee}m`);
    const head = promo.person.potential - promo.person.level;
    if (head < 3) fail(`the ${post} promotion has ${head} levels of room, the desk promises the most room of anybody`);
    if (promo.person.level > Math.max(...outside.map(c => c.person.level))) fail(`the ${post} promotion starts above everybody on the shortlist`);
    if (new Set(list.map(c => c.person.id)).size !== 4) fail(`the ${post} shortlist has two men with one id`);
    lists++;
  }
  /* The promotion reads the club's own academy coaching level and nothing else. */
  const poor = staffShortlist({ ...base, academy: { ...base.academy, coaching: 4 } }, 'attack')[3].person.level;
  const rich = staffShortlist({ ...base, academy: { ...base.academy, coaching: 20 } }, 'attack')[3].person.level;
  if (!(rich > poor)) fail(`a coaching level of 20 promotes a level ${rich} man and a level 4 promotes level ${poor}`);
  /* A fresh vacancy draws a fresh three. */
  const first = staffShortlist(base, 'attack');
  const hired = hireStaff(base, 'attack', first[0].person.id);
  const again = hired ? staffShortlist(sackStaff({ ...hired, budget: 400 }, 'attack'), 'attack') : [];
  if (again.length && again[0].person.id === first[0].person.id) fail('a fresh vacancy put the same man back at the top of the shortlist');
  /* And the promoted man grows on the training pitch. */
  let career = hireStaff({ ...base, budget: 400 }, 'goalkeeping', staffShortlist(base, 'goalkeeping')[3].person.id);
  if (!career) fail('promoting from the academy returned null');
  else {
    const start = staffIn(career, 'goalkeeping');
    let grew = 0;
    for (let year = 0; year < 8; year++) {
      const next = { ...clone(career), season: (career.season ?? 1) + 1 + year };
      rolloverStaff(next, career, false);
      const before = staffIn(career, 'goalkeeping').level;
      const after = staffIn(next, 'goalkeeping').level;
      if (after < before) fail('a coach went backwards over a summer');
      if (after > before + 1) fail(`a coach jumped ${after - before} levels in one summer`);
      if (after > staffIn(next, 'goalkeeping').potential) fail('a coach grew past his own ceiling');
      if (after > before) grew++;
      career = next;
    }
    const end = staffIn(career, 'goalkeeping');
    if (!(end.level > start.level)) fail(`the promoted keeper coach opened on ${start.level} and is still on ${end.level} after eight summers`);
    if (end.wage < start.wage) fail('a coach who got better got cheaper');
    console.log(`   ${lists} shortlists of four; the academy man is free with ${staffShortlist(base, 'attack')[3].person.potential - staffShortlist(base, 'attack')[3].person.level} levels of room; a promotion at level ${start.level} grew to ${end.level} of ${end.potential} in ${grew} of eight summers, wage ${start.wage}k to ${end.wage}k`);
  }
  /* The portrait is flat shapes and nothing else. */
  const art = staffPortraitSvg({ id: 'st-probe' }, 44);
  if (!/^<svg /.test(art) || !art.endsWith('</svg>')) fail('the portrait is not a self contained svg');
  if (/<image|href=|url\(|<script/i.test(art)) fail('the portrait reaches outside itself');
  if (staffPortraitSvg({ id: 'st-probe' }, 44) !== art) fail('the same man drew two different portraits');
  if (staffPortraitSvg({ id: 'st-other' }, 44) === art) fail('two different men drew the same portrait');
}

/* ---------- 7. Old saves and wreckage fail closed ---------- */
console.log('7) A save from before the desk, and a mangled block, both open on the club\'s day one men');
{
  const base = startCareer('Newcastle');
  const dayOne = staffOf({ ...base, staff: undefined });
  const shape = b => STAFF_POST_IDS.map(p => (b[p] ? `${b[p].name}:${b[p].level}` : 'none')).join('/');
  const good = clone(dayOne);
  const WRECK = [
    'garbage', '{"v":1,"att', 42, {}, null, [],
    { ...clone(good), v: 99 },
    { ...clone(good), attack: { ...good.attack, level: 11 } },
    { ...clone(good), attack: { ...good.attack, potential: 1, level: 5 } },
    { ...clone(good), defence: 'a man' },
    { ...clone(good), matchesLeft: STAFF_MATCHES_PER_SEASON + 1 },
    { ...clone(good), seasonSpend: -1 },
    /* An approach for a post nobody holds: the block contradicts itself. */
    { ...clone(good), scout: null, poach: { postId: 'scout', club: 'Ajax', weeksLeft: 2 } },
  ];
  for (const w of WRECK) {
    if (isValidStaff(w)) fail(`wreckage ${JSON.stringify(w).slice(0, 60)} passed as valid`);
    const s = { ...clone(base), staff: w };
    const repaired = ensureStaff(s);
    if (shape(repaired) !== shape(dayOne)) fail(`wreckage ${JSON.stringify(w).slice(0, 60)} repaired to ${shape(repaired)}, day one is ${shape(dayOne)}`);
  }
  if (!isValidStaff(good)) fail('the day one block does not pass its own shape check');
  /* staffOf never writes into what it is handed. */
  const probe = { ...clone(base), staff: undefined };
  staffOf(probe);
  if (probe.staff !== undefined) fail('staffOf wrote into the state it was handed');
  /* Through the real load path: an old save with no staff key at all. */
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  const old = clone(base);
  delete old.staff;
  const played = withStream(5, () => playSeason(old));
  store.set('dukb-club-manager-save', JSON.stringify({ ...played, staff: 'garbage' }));
  const loaded = loadCareer();
  if (!loaded) fail('a save with a garbage staff block refused to load');
  else if (!isValidStaff(loaded.staff)) fail('loadCareer handed back an invalid staff block');
  const preDesk = withStream(6, () => playSeason({ ...clone(base), staff: undefined }));
  if (!isValidStaff(preDesk.staff)) fail('a save from before the desk played a season without ever getting a staff');
  if (!(closeLedger(preDesk).staffWages > 0)) fail('a save from before the desk paid nobody all season');
  /* The summer: stay and keep, move and drop. */
  const { state: closed } = withStream(7, () => finishSeason(played));
  const paid = sackStaff({ ...closed, budget: 400 }, 'scout');
  const stay = withStream(8, () => startNextSeason(paid));
  if (staffIn(stay, 'scout')) fail('a job you left open filled itself over the summer');
  if (!staffIn(stay, 'attack')) fail('staying lost the attack coach over the summer');
  if (staffOf(stay).seasonSpend !== 0) fail(`the new season opened with ${staffOf(stay).seasonSpend}m already spent on staff`);
  const moved = withStream(9, () => startNextSeason(paid, 'Ajax'));
  if (moved.clubName === 'Ajax' && moved.staff !== undefined) fail('the manager took the coaching staff to Ajax in a suitcase');
  console.log(`   ${WRECK.length} wreckages repaired to ${shape(dayOne)}; a save with no staff key played a season and paid ${closeLedger(preDesk).staffWages.toFixed(2)}m; a garbage block loads through loadCareer; stay keeps, move drops`);
}

/* ---------- 8. Nobody on the staff is a real footballer ---------- */
console.log('8) Every name the desk can print, against every real player the worlds carry');
{
  const real = new Set();
  for (const world of Object.values(mod.NATIONALITY_BY_WORLD)) for (const n of Object.keys(world)) real.add(n);
  if (real.size < 4000) fail(`only ${real.size} real names harvested, the check is not checking much`);
  const deskSrc = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerStaff.ts'), 'utf8'));
  const bank = name => {
    const m = deskSrc.match(new RegExp(`const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\];`));
    return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : null;
  };
  const firsts = bank('STAFF_FIRST'), lasts = bank('STAFF_LAST');
  if (!firsts || !lasts) fail('could not read STAFF_FIRST x STAFF_LAST out of the desk');
  const combos = new Set();
  for (const a of firsts ?? []) for (const b of lasts ?? []) combos.add(`${a} ${b}`);
  if (combos.size < 300) fail(`only ${combos.size} possible staff names, repeats would be constant`);
  const hits = [...combos].filter(n => real.has(n));
  if (hits.length) fail(`the staff desk can name a real player: ${hits.slice(0, 6).join(' | ')}`);
  /* And every name the module actually emits is one of those pairings, so a
     second name source cannot creep in beside the bank. */
  const emitted = new Set();
  const clubs = [];
  for (const l of REAL_LEAGUES) for (const c of playableClubs(l.id).slice(0, 6)) clubs.push(c.name);
  for (const club of clubs) {
    const s = startCareer(club);
    for (const post of STAFF_POST_IDS) {
      const man = staffIn(s, post);
      if (man) emitted.add(man.name);
      for (const c of staffShortlist(s, post)) emitted.add(c.person.name);
    }
  }
  const strays = [...emitted].filter(n => !combos.has(n));
  if (strays.length) fail(`${strays.length} staff names came from somewhere other than the two banks: ${strays.slice(0, 4).join(' | ')}`);
  if (emitted.size < 100) fail(`only ${emitted.size} distinct staff names emitted over ${clubs.length} clubs`);
  /* No dash of either kind in anything this round wrote. */
  const files = ['src/lib/clubManagerStaff.ts', 'src/components/club-manager/StaffScreen.tsx', 'scripts/simClubManagerStaff.mjs'];
  let dashes = 0;
  for (const f of files) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    /* Written as escapes on purpose: a literal pair here would make this
       harness fail on itself, which is exactly what the first run did. */
    const found = [...t.matchAll(/[\u2013\u2014]/g)];
    dashes += found.length;
    if (found.length) fail(`${f} carries ${found.length} em or en dash${found.length === 1 ? '' : 'es'}`);
  }
  /* And the words on the screen match the code they describe. */
  const screen = lf(fs.readFileSync(path.join(ROOT, 'src/components/club-manager/StaffScreen.tsx'), 'utf8'));
  if (!screen.includes('STAFF_MATCHES_PER_SEASON')) fail('the screen types the match limit as a number instead of reading it');
  const line = staffEffectLine(onlyPost(startCareer('Everton'), 'attack', STAFF_MAX), 'attack');
  const pct = Math.round((postGrowthMult(onlyPost(startCareer('Everton'), 'attack', STAFF_MAX), 'attack') - 1) * 1000) / 10;
  if (!line.includes(String(pct))) fail(`the desk's own line says "${line}" while the multiplier is ${pct}% faster`);
  if (staffEffectLine(emptyAll(startCareer('Everton')), 'attack').includes('%')) fail('an empty chair claims a percentage');
  console.log(`   ${combos.size} possible staff names, 0 belong to any of the ${real.size} real men in the worlds; ${emitted.size} names emitted across ${clubs.length} clubs, all off the two banks; ${dashes} dashes in the round's ${files.length} new files`);
}

console.log('');
if (failures > 0) {
  console.error(`simClubManagerStaff: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simClubManagerStaff: PASS. Four made up men who cost what the desk says, lift only their own half of the pitch, tax nobody who ignores them, and can be taken off you.');
