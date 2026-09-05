/* Club Manager: the four facilities cost what the desk says, help what they
   say they help, and never tax a club that ignores them.

   Round 467. His words: "dressing room, stadium, training ground, medical,
   each level 1 to 10, big clubs start high, small clubs start near zero,
   upgrades cost real money and help the squad." The desk is
   src/lib/clubManagerFacilities.ts and this file holds it to those words.

   Sections:
     1) day one levels come from stature and nothing typed per club: every
        modern and era club opens inside 1 to 10, the tier 1 giants on 8 or
        more, the floor budget clubs on 2 or less, the same club always on
        the same numbers.
     2) the price on the screen is the price charged: facilityUpgradeCost is
        what upgradeFacility takes off the kitty, level by level to 10, the
        desk refuses a kitty that cannot cover it and refuses at 10, and a
        stadium level grows the crowd (groundUpgrades, capped at 3) and warms
        the board by exactly 2 as the old ground card promised.
     3) a floor budget club cannot build a 10 in a season. A tier 4 club on
        the 8m floor buys the cheapest level it can afford every week for a
        whole season under a seeded stream, and the best it reaches is
        measured, well short of 10.
     4) the effects run the right way and stay bounded, measured with and
        without under identical draws:
          training ground: the same season end rolled at level 1 and at level
            10 on the same stream, mean positive drift of every player with
            headroom, and no player past his potential either way (the
            Round 96 and 116 rule).
          medical: the same injury draws written at level 1 and at level 10,
            mean spell, and no spell under one week.
          dressing room: a squad flattened to 30 morale and ticked eight
            weeks at level 1 (no movement) and at level 10 (up, never past 70).
          stadium: food money a head at level 1 against level 10.
     5) Round 95's rule: every multiplier reaches exactly 1 at level 1, the
        recovery reaches exactly 0, and myMatchStrength never reads a
        facility (the comment stripped source of the engine is read for it).
     6) an old save and a mangled block both fail closed: six wreckages for
        the facilities block all repair to the club's day one levels, a save
        from before the desk that had bought two ground expansions opens its
        stadium two higher, and a stay keeps levels while a move drops them.

   Negative controls (house rule: prove the checks can fail):
     CM_FACILITIES_CONTROL=nolift bundles a copy of the engine with the
       training ground factor taken back out of developmentRate. Section 4's
       growth check must go red (level 10 no longer beats level 1).
     CM_FACILITIES_CONTROL=tax bundles a copy of the desk whose growth
       multiplier reads 1.05 at level 1. Section 5 must go red.
     Either control refuses to run if its rewrite did not find its text.

   Bands, measured on this harness's own seeded stream on 2026-09-05:
     growth, level 10 over level 1, mean whole point drift of every player
       with three or more points of headroom, pooled over ten clubs (83
       players): measured 1.101x, and 1.090x and 1.074x on SIM_SEED=2 and
       3; the multiplier itself is 1.117x and the nolift control reads
       1.000x; band 1.03x to 1.20x.
     medical, mean spell at level 10 over level 1: the formula gives 0.667
       exactly on the uniform 1 to 5 draw (1,1,2,3,3 over 1,2,3,4,5); the
       harness measured 0.665x on a thousand draws and asserts 0.60 to 0.75.
     floor club after a season of buying the cheapest level each week:
       measured 1/2/2/3 (stadium, training ground, medical, dressing room)
       on 13m spent; the check is "under 10" and prints the levels.

   Run: node scripts/simClubManagerFacilities.mjs
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
const CONTROL = process.env.CM_FACILITIES_CONTROL || '';
if (CONTROL && CONTROL !== 'nolift' && CONTROL !== 'tax') {
  console.error(`CM_FACILITIES_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const lf = s => s.replaceAll('\r\n', '\n');

/* ---- bundle the engine and the desk, regressed when a control is on ---- */
let enginePath = `${ROOT_URL}/src/lib/clubManager.ts`;
let deskPath = `${ROOT_URL}/src/lib/clubManagerFacilities.ts`;
if (CONTROL === 'nolift') {
  const src = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8'));
  const fixed = 'headroom * minutes * intensity * focus * staff * trainingGroundGrowthMult(career)';
  const broken = 'headroom * minutes * intensity * focus * staff';
  if (!src.includes(fixed)) { console.error('control cannot run: clubManager.ts is not in the shape CM_FACILITIES_CONTROL=nolift rewrites'); process.exit(1); }
  enginePath = `${TMP}/clubManagerFacilities.nolift.ts`;
  fs.writeFileSync(enginePath, src.replace(fixed, broken));
  console.log('NEGATIVE CONTROL ON: the training ground no longer reaches developmentRate');
}
if (CONTROL === 'tax') {
  const src = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerFacilities.ts'), 'utf8'));
  const fixed = "return 1 + 0.013 * (facilityLevel(state, 'trainingGround') - 1);";
  const broken = "return 1.05 + 0.013 * (facilityLevel(state, 'trainingGround') - 1);";
  if (!src.includes(fixed)) { console.error('control cannot run: clubManagerFacilities.ts is not in the shape CM_FACILITIES_CONTROL=tax rewrites'); process.exit(1); }
  deskPath = `${TMP}/clubManagerFacilities.tax.ts`;
  fs.writeFileSync(deskPath, src.replace(fixed, broken));
  console.log('NEGATIVE CONTROL ON: the growth multiplier cannot reach 1');
}
const ENTRY = `${TMP}/clubManagerFacilities.entry.mjs`;
const BUNDLE = `${TMP}/clubManagerFacilities.bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const engine = await import('${enginePath}');
export const desk = await import('${deskPath}');
`);
/* The desk under test is aliased in by its import path so the engine's own
   import of it resolves to the control copy when one is on. */
const aliases = [`--alias:@/lib/clubManagerFacilities=${deskPath}`, `--alias:@/lib/clubManager=${enginePath}`, `--alias:@=${ROOT_URL}/src`];
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error ${aliases.join(' ')}`, { stdio: 'inherit' });
const mod = await import(pathToFileURL(BUNDLE).href);
const cm = mod.engine;
const fac = mod.desk;
const {
  startCareer, playNextEntry, finishSeason, startNextSeason, developmentRate, clubDefFor, eraClubDefFor,
  playableClubs, REAL_LEAGUES, eraPlayableClubs, eraLeaguesFor, CM_ERAS, loadCareer,
} = cm;
const {
  FACILITY_IDS, FACILITY_MAX, facilityStartLevels, facilitiesOf, ensureFacilities, facilityUpgradeCost,
  facilityCostLadder, upgradeFacility, trainingGroundGrowthMult, injurySpell, dressingRoomLift,
  stadiumConcessionMult, tickFacilities, isValidFacilities, rolloverFacilities, DRESSING_ROOM_REST,
} = fac;

/* A stream the harness owns, so two rolls of one summer share their draws. */
function makeStream(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* SIM_SEED moves every stream this harness owns, so a threshold can be
   re-measured on a fresh sample on purpose (the seedRandom convention). */
const SEED_OFFSET = (Number(process.env.SIM_SEED) || 0) * 7919;
const withStream = (seed, fn) => {
  const saved = Math.random;
  Math.random = makeStream(seed + SEED_OFFSET);
  try { return fn(); } finally { Math.random = saved; }
};

const clone = s => JSON.parse(JSON.stringify(s));
/* The floor club comes off the playable lists, never from memory: a name
   that is not in its league's list plays the whole season as byes. */
const floorClub = (() => {
  for (const l of REAL_LEAGUES) for (const c of playableClubs(l.id)) if (c.budget <= 8 && c.tier === 4) return c.name;
  throw new Error('no floor club in the playable lists');
})();
const setLevel = (s, id, level) => {
  const c = clone(s);
  const f = ensureFacilities(c);
  f[id] = level;
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

/* ---------- 1. Day one levels ---------- */
console.log('1) Day one levels come from stature, every club inside 1 to 10');
{
  const defs = [];
  for (const l of REAL_LEAGUES) for (const c of playableClubs(l.id)) defs.push({ ...c, where: l.id });
  for (const era of CM_ERAS) {
    if (era.id === 'now') continue;
    for (const l of eraLeaguesFor(era.id)) for (const c of eraPlayableClubs(era.id, l.id)) defs.push({ ...c, where: `${era.id}/${l.id}` });
  }
  let giants = 0, floor = 0, giantsHigh = 0, floorLow = 0, outside = 0;
  for (const d of defs) {
    const lv = facilityStartLevels(d);
    for (const id of FACILITY_IDS) if (!(Number.isInteger(lv[id]) && lv[id] >= 1 && lv[id] <= FACILITY_MAX)) outside++;
    if (d.tier === 1) { giants++; if (Math.min(...FACILITY_IDS.map(id => lv[id])) >= 8) giantsHigh++; }
    /* "Small" is tier 4 on the floor budget. A tier 3 club worth 8m is a
       Celtic shaped club in a small league, big in every way but money. */
    if (d.tier === 4 && d.budget <= 8) { floor++; if (Math.max(...FACILITY_IDS.map(id => lv[id])) <= 2) floorLow++; }
  }
  if (outside) fail(`${outside} day one levels fall outside 1 to 10`);
  if (giants < 5) fail(`only ${giants} tier 1 clubs found, the sample is too thin`);
  if (giantsHigh !== giants) fail(`${giants - giantsHigh} of ${giants} tier 1 clubs open under 8 somewhere`);
  if (floor < 100) fail(`only ${floor} floor budget clubs found, the sample is too thin`);
  if (floorLow !== floor) fail(`${floor - floorLow} of ${floor} floor budget clubs open above 2 somewhere`);
  const a = facilitiesOf(startCareer('Real Madrid'));
  const b = facilitiesOf(startCareer('Real Madrid'));
  if (JSON.stringify(a) !== JSON.stringify(b)) fail('the same club opened on two different sets of levels');
  const small = facilitiesOf(startCareer(floorClub));
  const rm = facilitiesOf(startCareer('Real Madrid'));
  console.log(`   ${defs.length} clubs checked (${giants} tier 1 all on 8 or more, ${floor} floor budget all on 2 or less); Real Madrid ${FACILITY_IDS.map(id => rm[id]).join('/')}, ${floorClub} ${FACILITY_IDS.map(id => small[id]).join('/')}`);
}

/* ---------- 2. The price on the screen is the price charged ---------- */
console.log('2) Upgrades charge exactly what the desk quotes, refuse what the kitty cannot cover, stop at 10');
{
  let charged = 0;
  for (const club of [floorClub, 'Everton', 'Manchester City']) {
    let s = startCareer(club);
    s.budget = 5000;
    for (const id of FACILITY_IDS) {
      let guard = 0;
      while (guard++ < 12) {
        const cost = facilityUpgradeCost(s, id);
        const level = facilitiesOf(s)[id];
        if (cost === null) { if (level !== FACILITY_MAX) fail(`${club} ${id}: no price at level ${level}`); break; }
        const ladder = facilityCostLadder(id, false);
        if (ladder[level - 1] !== cost) fail(`${club} ${id}: ladder says ${ladder[level - 1]} at level ${level}, desk says ${cost}`);
        const poor = { ...s, budget: cost - 0.1 };
        if (upgradeFacility(poor, id) !== null) fail(`${club} ${id}: a kitty of ${cost - 0.1} bought a ${cost} level`);
        const before = s.budget;
        const conf = s.boardConfidence;
        const ground = s.finance?.groundUpgrades ?? 0;
        const next = upgradeFacility(s, id);
        if (!next) { fail(`${club} ${id}: a funded upgrade at level ${level} returned null`); break; }
        if (Math.abs(before - next.budget - cost) > 0.011) fail(`${club} ${id}: charged ${(before - next.budget).toFixed(2)}, quoted ${cost}`);
        if (facilitiesOf(next)[id] !== level + 1) fail(`${club} ${id}: level went ${level} to ${facilitiesOf(next)[id]}`);
        if (facilitiesOf(s)[id] !== level) fail(`${club} ${id}: the upgrade mutated the state it was handed`);
        if (id === 'stadium') {
          const g = next.finance?.groundUpgrades ?? 0;
          if (g !== Math.min(3, ground + 1)) fail(`${club} stadium: groundUpgrades went ${ground} to ${g}`);
          if (conf < 98 && Math.abs(next.boardConfidence - (conf + 2)) > 0.001) fail(`${club} stadium: the board moved ${next.boardConfidence - conf}, promised 2`);
        } else if (next.boardConfidence !== conf) {
          fail(`${club} ${id}: the board moved on a ${id} upgrade`);
        }
        charged++;
        s = next;
      }
      if (facilitiesOf(s)[id] !== FACILITY_MAX) fail(`${club} ${id}: stopped at ${facilitiesOf(s)[id]}`);
      if (upgradeFacility({ ...s, budget: 5000 }, id) !== null) fail(`${club} ${id}: bought a level past 10`);
    }
    if (facilitiesOf(s).seasonSpend <= 0) fail(`${club}: the season's spend was not recorded`);
  }
  const eraLadder = facilityCostLadder('trainingGround', true);
  const modernLadder = facilityCostLadder('trainingGround', false);
  if (!eraLadder.every((c, i) => c <= modernLadder[i])) fail('era money is not smaller than modern money on the ladder');
  console.log(`   ${charged} upgrades charged to the pound across three clubs; training ground 1 to 10 costs ${modernLadder.reduce((a, b) => a + b, 0)}m today, ${eraLadder.reduce((a, b) => a + b, 0)}m in an era; stadium ${facilityCostLadder('stadium', false).reduce((a, b) => a + b, 0)}m`);
}

/* ---------- 3. A floor club cannot build a 10 in a season ---------- */
console.log('3) A floor budget club buying every week still cannot reach 10');
{
  const best = withStream(467, () => {
    let s = startCareer(floorClub);
    s = playSeason(s, {
      each: st => {
        let cur = st;
        for (let i = 0; i < 4; i++) {
          const cheapest = FACILITY_IDS
            .map(id => ({ id, cost: facilityUpgradeCost(cur, id) }))
            .filter(x => x.cost !== null && x.cost <= cur.budget)
            .sort((a, b) => a.cost - b.cost)[0];
          if (!cheapest) break;
          cur = upgradeFacility(cur, cheapest.id) ?? cur;
        }
        return cur;
      },
    });
    const f = facilitiesOf(s);
    return { levels: FACILITY_IDS.map(id => f[id]), spent: f.seasonSpend, budget: s.budget, week: s.week };
  });
  if (Math.max(...best.levels) >= FACILITY_MAX) fail(`${floorClub} built a level ${Math.max(...best.levels)} in one season`);
  console.log(`   ${floorClub} (8m floor) bought the cheapest level it could afford every week: ended on ${best.levels.join('/')} after spending ${best.spent}m across ${best.week} weeks, ${best.budget}m left`);
}

/* ---------- 4. The effects, with and without, on identical draws ---------- */
console.log('4) Each effect runs the right way and stays bounded, measured with and without');
{
  /* Training ground: the same season end rolled at level 1 and 10, pooled
     across ten clubs because agePlayer rounds the drift to a whole point
     and one club's seven kids cannot show an eleven percent factor. */
  const pooledLo = [], pooledHi = [];
  let overCeiling = 0;
  const CLUBS = ['Everton', 'Napoli', 'Brentford', 'Newcastle', 'Ajax', 'Benfica', 'Leverkusen', 'Lyon', 'Sevilla', 'Coventry'];
  for (const [i, club] of CLUBS.entries()) {
    const end = withStream(100 + i, () => playSeason(startCareer(club)));
    const { state: closed } = withStream(200 + i, () => finishSeason(end));
    const roll = level => withStream(300 + i, () => startNextSeason(setLevel(closed, 'trainingGround', level)));
    const lo = roll(1), hi = roll(10);
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
    pooledHi.push(...drift(hi));
    const r1 = trainingGroundGrowthMult(setLevel(closed, 'trainingGround', 1));
    const r10 = trainingGroundGrowthMult(setLevel(closed, 'trainingGround', 10));
    if (Math.abs(r10 - 1.117) > 0.0001) fail(`level 10 growth multiplier reads ${r10}, designed 1.117`);
    if (r10 <= r1) fail('level 10 does not beat level 1 on the multiplier');
  }
  const ml = mean(pooledLo), mh = mean(pooledHi);
  const pooledRatio = mh / Math.max(0.01, ml);
  console.log(`   training ground: mean drift of ${pooledLo.length} players with headroom across ${CLUBS.length} clubs, level 1 ${ml.toFixed(3)} vs level 10 ${mh.toFixed(3)} (${pooledRatio.toFixed(3)}x)`);
  if (!(pooledRatio >= 1.03)) fail(`the training ground moved growth ${pooledRatio.toFixed(3)}x at level 10, the effect is gone`);
  if (!(pooledRatio <= 1.2)) fail(`the training ground moved growth ${pooledRatio.toFixed(3)}x at level 10, which is not small`);
  if (overCeiling) fail(`${overCeiling} players grew past their potential`);
  if (pooledLo.length < 60) fail(`only ${pooledLo.length} players with headroom sampled`);
  const kid = { id: 'k', name: 'k', position: 'CM', rating: 60, age: 19, potential: 80, apps: 20, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0, isYouth: false, seasonGoals: 0, seasonAssists: 0 };
  const base = startCareer('Everton');
  const capped = { ...kid, rating: 80 };
  const rateLo = developmentRate(kid, setLevel(base, 'trainingGround', 1));
  const rateHi = developmentRate(kid, setLevel(base, 'trainingGround', 10));
  const cappedHi = developmentRate(capped, setLevel(base, 'trainingGround', 10));
  if (!(rateHi > rateLo)) fail(`developmentRate did not rise with the training ground (${rateLo} vs ${rateHi})`);
  if (!(cappedHi < rateHi * 0.2)) fail(`a player at his ceiling still develops at ${cappedHi} with a level 10 training ground (headroom ignored)`);
  console.log(`   developmentRate for a 60 rated 19 year old with an 80 ceiling: level 1 ${rateLo.toFixed(3)}, level 10 ${rateHi.toFixed(3)}; the same lad already at 80: ${cappedHi.toFixed(3)}`);

  /* Medical: the same draws written at level 1 and 10. */
  const s1 = setLevel(base, 'medical', 1), s10 = setLevel(base, 'medical', 10);
  const draws = withStream(9, () => Array.from({ length: 1000 }, () => 1 + Math.floor(Math.random() * 5)));
  const spellLo = draws.map(w => injurySpell(s1, w));
  const spellHi = draws.map(w => injurySpell(s10, w));
  if (spellLo.some((w, i) => w !== draws[i])) fail('level 1 medical rewrote an injury spell');
  if (spellHi.some(w => w < 1)) fail('a spell went under one week');
  if (spellHi.some((w, i) => w > spellLo[i])) fail('level 10 medical wrote a spell LONGER than level 1');
  const medRatio = mean(spellHi) / mean(spellLo);
  if (!(medRatio >= 0.6 && medRatio <= 0.75)) fail(`level 10 medical wrote spells at ${medRatio.toFixed(3)}x of level 1, outside 0.60 to 0.75`);
  /* And a whole season on one stream, counted the way simAcademy counts
     knocks: player weeks spent injured, summed over every entry. The two
     runs share their draws until the first injury is written shorter, so
     this is a print rather than a band. */
  const hurtWeeks = level => {
    let hurt = 0;
    withStream(11, () => playSeason(setLevel(startCareer('Everton'), 'medical', level), { each: st => { hurt += st.squad.filter(p => p.injuryWeeks > 0).length; return st; } }));
    return hurt;
  };
  console.log(`   medical: mean spell ${mean(spellLo).toFixed(2)} weeks at level 1, ${mean(spellHi).toFixed(2)} at level 10 (${medRatio.toFixed(3)}x) over ${draws.length} draws; player weeks spent injured over one Everton season: ${hurtWeeks(1)} at level 1, ${hurtWeeks(10)} at level 10`);

  /* Dressing room: a flattened squad ticked eight weeks. */
  const flat = st => ({ ...st, squad: st.squad.map(p => ({ ...p, morale: 30 })) });
  const tick = (st, weeks) => { const c = clone(st); for (let i = 0; i < weeks; i++) tickFacilities(c); return c; };
  const dLo = tick(flat(setLevel(base, 'dressingRoom', 1)), 8);
  const dHi = tick(flat(setLevel(base, 'dressingRoom', 10)), 8);
  const mLo = mean(dLo.squad.map(p => p.morale)), mHi = mean(dHi.squad.map(p => p.morale));
  if (mLo !== 30) fail(`level 1 dressing room moved morale to ${mLo}`);
  if (!(mHi > 33 && mHi <= DRESSING_ROOM_REST)) fail(`level 10 dressing room moved morale to ${mHi} in eight weeks, expected up and under ${DRESSING_ROOM_REST}`);
  const happy = tick({ ...setLevel(base, 'dressingRoom', 10), squad: base.squad.map(p => ({ ...p, morale: 90 })) }, 8);
  if (happy.squad.some(p => p.morale !== 90)) fail('the dressing room touched a player already above 70');
  const long = tick(flat(setLevel(base, 'dressingRoom', 10)), 200);
  if (long.squad.some(p => p.morale > DRESSING_ROOM_REST)) fail('two hundred weeks in the dressing room pushed somebody past 70');
  console.log(`   dressing room: a squad on 30 morale after eight weeks, level 1 ${mLo.toFixed(1)}, level 10 ${mHi.toFixed(1)} (lift ${dressingRoomLift(setLevel(base, 'dressingRoom', 10))} a week), never past ${DRESSING_ROOM_REST}`);

  /* Stadium: food money a head. */
  const c1 = stadiumConcessionMult(1), c10 = stadiumConcessionMult(10);
  if (c1 !== 1) fail(`stadium level 1 reads ${c1} on food money`);
  if (Math.abs(c10 - 1.18) > 0.0001) fail(`stadium level 10 reads ${c10} on food money, designed 1.18`);
  console.log(`   stadium: food money a head x${c1} at level 1, x${c10.toFixed(2)} at level 10`);
}

/* ---------- 5. Round 95's rule ---------- */
console.log('5) Every multiplier reaches exactly 1 at level 1, and match strength never reads a facility');
{
  const base = startCareer('Everton');
  const floorState = FACILITY_IDS.reduce((st, id) => setLevel(st, id, 1), base);
  if (trainingGroundGrowthMult(floorState) !== 1) fail(`growth multiplier at level 1 is ${trainingGroundGrowthMult(floorState)}, not 1`);
  if (dressingRoomLift(floorState) !== 0) fail(`dressing room lift at level 1 is ${dressingRoomLift(floorState)}, not 0`);
  if (stadiumConcessionMult(1) !== 1) fail('stadium multiplier at level 1 is not 1');
  for (let w = 1; w <= 6; w++) if (injurySpell(floorState, w) !== w) fail(`medical at level 1 rewrote a ${w} week spell`);
  const src = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const m = src.match(/function myMatchStrength\([\s\S]*?\n}\n/);
  if (!m) fail('could not find myMatchStrength in the engine');
  else if (/facilit|trainingGround|dressingRoom|medical|stadium/i.test(m[0])) fail('myMatchStrength reads a facility');
  /* The one growth path: the factor sits inside the clamp, and agePlayer still caps at potential. */
  const dev = src.match(/export function developmentRate\([\s\S]*?\n}\n/);
  if (!dev) fail('could not find developmentRate');
  else if (!/return clamp\([^;]*trainingGroundGrowthMult\(career\)[^;]*, 0\.1, 2\.6\);/.test(dev[0])) fail('the training ground factor is not inside developmentRate\'s clamp');
  console.log('   growth x1, medical identity, dressing room +0, stadium x1 at level 1; myMatchStrength and the clamp read on the comment stripped source');
}

/* ---------- 6. Old saves and wreckage fail closed ---------- */
console.log('6) A save from before the desk, and a mangled block, both open on the club\'s day one levels');
{
  const base = startCareer('Newcastle');
  const dayOne = facilitiesOf({ ...base, facilities: undefined });
  const WRECK = ['garbage', '{"v":1,"stad', 42, {}, null, [], { v: 99, stadium: 5, trainingGround: 5, medical: 5, dressingRoom: 5, seasonSpend: 0 }, { v: 1, stadium: 11, trainingGround: 5, medical: 5, dressingRoom: 5, seasonSpend: 0 }, { v: 1, stadium: 5, trainingGround: 5, medical: 5, dressingRoom: 5, seasonSpend: -1 }];
  for (const w of WRECK) {
    const s = { ...clone(base), facilities: w };
    if (isValidFacilities(w)) fail(`wreckage ${JSON.stringify(w)} passed as valid`);
    const f = ensureFacilities(s);
    if (JSON.stringify(FACILITY_IDS.map(id => f[id])) !== JSON.stringify(FACILITY_IDS.map(id => dayOne[id]))) fail(`wreckage ${JSON.stringify(w)} repaired to ${FACILITY_IDS.map(id => f[id]).join('/')}, day one is ${FACILITY_IDS.map(id => dayOne[id]).join('/')}`);
  }
  /* A Round 171 save that bought two expansions before the desk existed. */
  const old = { ...clone(base), facilities: undefined, finance: { ticketTier: 1, groundUpgrades: 2, seasonGate: 0, lastGate: null } };
  const f = facilitiesOf(old);
  if (f.stadium !== Math.min(10, dayOne.stadium + 2)) fail(`two old expansions opened the stadium on ${f.stadium}, day one is ${dayOne.stadium}`);
  /* Through the real load path. */
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  const played = withStream(5, () => playSeason(clone(old)));
  const before = JSON.stringify(played);
  store.set('dukb-club-manager-save', before.replace(/"facilities":\{[^}]*\}/, '"facilities":"garbage"'));
  const loaded = loadCareer();
  if (!loaded) fail('a save with a garbage facilities block refused to load');
  else if (!isValidFacilities(loaded.facilities)) fail('loadCareer handed back an invalid facilities block');
  /* The summer: stay and keep, move and drop. */
  const { state: closed } = withStream(6, () => finishSeason(played));
  const bought = upgradeFacility({ ...closed, budget: 5000 }, 'medical');
  const stay = withStream(7, () => startNextSeason(bought));
  const stayF = facilitiesOf(stay);
  if (stayF.medical !== facilitiesOf(bought).medical) fail('staying lost a medical level over the summer');
  if (stayF.seasonSpend !== 0) fail(`the new season opened with ${stayF.seasonSpend}m already spent`);
  const moved = withStream(8, () => startNextSeason(bought, 'Ajax'));
  if (moved.clubName === 'Ajax' && moved.facilities !== undefined) fail('the manager took the medical department to Ajax in a suitcase');
  const probe = { ...clone(base), facilities: undefined };
  const seen = facilitiesOf(probe);
  if (probe.facilities !== undefined) fail('facilitiesOf wrote into the state it was handed');
  if (!seen) fail('facilitiesOf returned nothing');
  console.log(`   ${WRECK.length} wreckages repaired to ${FACILITY_IDS.map(id => dayOne[id]).join('/')}; two old expansions open the stadium on ${f.stadium}; a garbage block loads through loadCareer; stay keeps, move drops`);
}

console.log('');
if (failures > 0) {
  console.error(`simClubManagerFacilities: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simClubManagerFacilities: PASS. Four facilities that cost what the desk says, help what they say, and tax nobody who ignores them.');
