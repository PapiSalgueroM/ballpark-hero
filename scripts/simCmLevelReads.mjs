/**
 * Round 1600: Club Manager reads a man's LEVEL where it reads what a club is, and his RATING where it reads what
 * he does on the pitch (levelOf in src/lib/clubManagerEras.ts). Proposal 1 of the veteran ratings design
 * (C:/Users/antho/dukb-handoff/2026-10-10/briefs/proposals-cm-veteran-ratings.md).
 *
 * The age read itself is Round 1214's (src/lib/cmAgeRead.ts). It is applied at load to a modern file whose META
 * says `curve: 2` (src/data/clubManagerWorldRosters.ts): the file's `r` is the level, the shown rating is the
 * read, and the level rides beside it as `lv`. Everything that says what a CLUB is must then read the level, or
 * a club with three veterans is filed a tier up and its board demands the title for their birthdays.
 *
 * THREE ARMS of the real engine, bundled with esbuild:
 *   A   the files as shipped.
 *   B1  the 2026 squads file stamped curve 2 with its ages untouched. The level of every man is then exactly the
 *       rating arm A shows, so every read of a club must equal arm A's to the digit. This is the seam test.
 *   B2  stamped and every age moved to 1 August 2026 (scripts/data/cmAgesBasis2026.json through the rule in
 *       scripts/lib/cmAges.mjs): the flip as it will ship. Stature still equals arm A (ages do not enter it).
 *
 * SECTIONS
 *   1  arm A: no row carries a level; every club's eleven, tier, budget, expected finish, value scale and slot
 *      anchors equal scripts/data/cmStatureRecording.json (written from arm A with --record).
 *   2  arm B1: the stamp applied (rows carry a level and show another rating); the same recording holds at every
 *      club; the real men under 24 still in the game a year on are arm A's, man for man (the exit reads the
 *      higher of rating and level); the ceilings rolled for every day one squad man under 30 at four clubs equal
 *      arm A's on the same dice (the ceiling reads the higher of the two).
 *   3  arm B2: the recording's elevens, tiers, budgets, expected finishes and anchors hold; prints the owner's
 *      three and the value scales the age move shifts (information).
 *
 * CONTROLS (CM_LEVEL_READS_CONTROL=name), each must turn the harness red, and each first proves its anchor
 * exists (a control that changes nothing aborts with exit 2, never a quiet green):
 *   xi       bakedXIAvg reads the rating (section 2: elevens, tiers, expected finishes)
 *   anchor   projectClub's anchor reads the rating (section 2: anchors)
 *   scale    valueScaleFor reads the rating (section 2: scales)
 *   exit     the world exit reads the rating (section 2: survival)
 *   ceiling  the day one ceiling roll reads the rating (section 2: ceilings)
 *   nostamp  the load reads age whatever the stamp says (section 1: arm A moves)
 *   pointsfirst  the past seasons add the points under the stretch, Round 1102's order (section 4)
 *   noeraread    the past seasons do not read age (section 4)
 *
 * SECTION 4 (Proposal 4): every past season is read at load the same way, the stretch first (the level), then the
 * points on the season's own top: every row's level is the stretch of its file rating and its shown rating the read
 * (scripts/lib/cmEraRead.mjs), nobody past the top, each top the stretch of the season's best man, the rows changed
 * per season and Round 1214's table rows as its notes give them.
 *
 * MEASURED (runner, see docs/audits/ROUND-1600-NOTES.md): the counts printed per section are the numbers.
 */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { stampedSquads, agedSquads, unflippedSquads, unstampedLeague, unstampedFreeAgents, isStamped } from './lib/cmSquadAges.mjs';
import { eraShown } from './lib/cmEraRead.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CM_LEVEL_READS_CONTROL || '';
const RECORD = process.argv.includes('--record');
const RECORDING = path.join(ROOT, 'scripts/data/cmStatureRecording.json');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');

/* ---------- the engine text, with a control applied ---------- */
const SRC = {
  'src/lib/clubManager.ts': read('src/lib/clubManager.ts'),
  'src/lib/clubManagerEras.ts': read('src/lib/clubManagerEras.ts'),
  'src/data/clubManagerWorldRosters.ts': read('src/data/clubManagerWorldRosters.ts'),
};
const CONTROLS = {
  xi: ['src/lib/clubManager.ts', '     world still on curve 1 the level is the rating. */\n  const rs = roster.map(p => levelOf(p))',
    '     world still on curve 1 the level is the rating. */\n  const rs = roster.map(p => p.r)'],
  anchor: ['src/lib/clubManagerEras.ts', 'r: b.r, anchor: levelOf(b), since: 0,', 'r: b.r, anchor: b.r, since: 0,'],
  scale: ['src/lib/clubManagerEras.ts', 'rawCurveValue(levelOf(b), b.a)', 'rawCurveValue(b.r, b.a)'],
  exit: ['src/lib/clubManagerEras.ts', 'worldExitChance(age, futureRead(pl), pl.p, ', 'worldExitChance(age, pl.r, pl.p, '],
  ceiling: ['src/lib/clubManager.ts', 'p.potential = rollPotential(ceilingBase(p), p.age);', 'p.potential = rollPotential(p.rating, p.age);'],
  nostamp: ['src/data/clubManagerWorldRosters.ts', '  if (curve !== CM_AGE_CURVE) return rosters;\n', ''],
  /* Round 1214's mutation: the points under the stretch, as Round 1102 had them (2010 Messi 95, not 97). */
  pointsfirst: ['src/lib/clubManagerEras.ts', '      const shown = readInWorld(b.r, b.a, world).rating;',
    '      const shown = eraUpliftRating(eraId, readInWorld(b.r, b.a, { ageShift: ERA_RATING_AGE_SHIFT }).rating);'],
  noeraread: ['src/lib/clubManagerEras.ts', 'const PAST_SEASONS_READ_AGE = true;', 'const PAST_SEASONS_READ_AGE = false;'],
};
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  if (!c) { console.log(`simCmLevelReads: unknown control ${CONTROL}`); process.exit(2); }
  const [file, from, to] = c;
  if (SRC[file].split(from).length !== 2) { console.log(`simCmLevelReads: control ${CONTROL} ABORTED, its anchor is not in ${file} exactly once`); process.exit(2); }
  SRC[file] = SRC[file].replace(from, to);
  console.log(`CONTROL ${CONTROL} APPLIED to ${file}`);
}

/* ---------- the 2026 files either side of the flip ----------
   Since the flip ships, the files are curve 2: arm A is the curve 1 world rebuilt from them (no stamp on any of the
   three modern files, every man of the main file at the age the curve 1 view holds), and arm B2 is the files as
   shipped. On a tree from before the flip the files are curve 1 and it runs the other way round. */
const SHIPPED = read('src/data/clubManagerRosters.ts');
const LEAGUES = { aleague: read('src/data/clubManagerALeague2026.ts'), russia: read('src/data/clubManagerRussia2026.ts'), fa: read('src/data/clubManagerFreeAgents2026.ts') };
const BASIS = JSON.parse(read('scripts/data/cmAgesBasis2026.json'));
const FLIPPED = isStamped(SHIPPED);
const BACK = FLIPPED ? unflippedSquads(SHIPPED, read('src/data/clubManagerCurve1View.ts')) : null;
const CURVE1 = FLIPPED ? BACK.text : SHIPPED;
const AGED = FLIPPED ? { text: SHIPPED, moved: BACK.moved, rows: BACK.rows } : agedSquads(stampedSquads(SHIPPED), BASIS);
const ROSTERS = CURVE1;
const ROSTERS_STAMPED = stampedSquads(CURVE1);
const CURVE1_LEAGUES = { aleague: unstampedLeague(LEAGUES.aleague), russia: unstampedLeague(LEAGUES.russia), fa: unstampedFreeAgents(LEAGUES.fa) };

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cmlevelreads-'));
async function bundle(name, rosterText, leagues = CURVE1_LEAGUES, src = SRC) {
  const outfile = path.join(TMP, `${name}.cjs`);
  await build({
    stdin: { contents: "export * as cm from '@/lib/clubManager'; export * as eras from '@/lib/clubManagerEras';", resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'cjs', platform: 'node', outfile, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'arm', setup(b) {
      const FILTERS = {
        'src/lib/clubManager.ts': /[\\/]src[\\/]lib[\\/]clubManager\.ts$/,
        'src/lib/clubManagerEras.ts': /[\\/]src[\\/]lib[\\/]clubManagerEras\.ts$/,
        'src/data/clubManagerWorldRosters.ts': /[\\/]src[\\/]data[\\/]clubManagerWorldRosters\.ts$/,
      };
      for (const [rel, filter] of Object.entries(FILTERS)) b.onLoad({ filter }, () => ({ contents: src[rel], loader: 'ts' }));
      b.onLoad({ filter: /[\\/]src[\\/]data[\\/]clubManagerRosters\.ts$/ }, () => ({ contents: rosterText, loader: 'ts' }));
      b.onLoad({ filter: /[\\/]src[\\/]data[\\/]clubManagerALeague2026\.ts$/ }, () => ({ contents: leagues.aleague, loader: 'ts' }));
      b.onLoad({ filter: /[\\/]src[\\/]data[\\/]clubManagerRussia2026\.ts$/ }, () => ({ contents: leagues.russia, loader: 'ts' }));
      b.onLoad({ filter: /[\\/]src[\\/]data[\\/]clubManagerFreeAgents2026\.ts$/ }, () => ({ contents: leagues.fa, loader: 'ts' }));
    } }],
  });
  return createRequire(import.meta.url)(outfile);
}
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } };
const A = await bundle('A', ROSTERS);
/* Arm B1 stamps the file with its ages untouched, so the drop out table must read the age as it is there (the
   shift by one is for the August column, arm B2): the seam test holds the level reads alone. */
const DROP_SHIFT = "  const dropShift = trajectoryEra === 'now' && cmWorldReadsAge() ? 1 : 0;\n";
if (SRC['src/lib/clubManagerEras.ts'].split(DROP_SHIFT).length !== 2) { console.log('simCmLevelReads: ABORTED, the drop out shift line is not in clubManagerEras.ts once'); process.exit(2); }
const B1 = await bundle('B1', ROSTERS_STAMPED, CURVE1_LEAGUES, { ...SRC, 'src/lib/clubManagerEras.ts': SRC['src/lib/clubManagerEras.ts'].replace(DROP_SHIFT, '  const dropShift = 0;\n') });
const B2 = await bundle('B2', AGED.text, FLIPPED ? LEAGUES : CURVE1_LEAGUES);
for (const arm of [A, B1, B2]) await arm.cm.ensureAllEraRosters();

/* ---------- helpers ---------- */
const failures = {};
let section = 0, checks = 0;
const fail = msg => { failures[section] = (failures[section] ?? 0) + 1; console.log(`  FAIL ${msg}`); };
const check = (ok, msg) => { checks += 1; if (!ok) fail(msg); };
const sha = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 12);
const hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const levelled = arm => Object.values(arm.eras.eraRosters('now')).flat().filter(b => b.lv !== undefined).length;

/** What a club IS, read off one arm: its eleven, its value scale, its slot anchors, and its def. */
function stature(arm) {
  const { cm, eras } = arm;
  const clubs = {};
  for (const [club, rows] of Object.entries(eras.eraRosters('now'))) {
    clubs[club] = { xi: cm.bakedXIAvg(club), scale: Math.round(eras.valueScaleFor(club, rows) * 1e9) / 1e9,
      anchors: sha(eras.projectedRoster(club, 0).map(p => p.anchor)) };
  }
  for (const lg of cm.REAL_LEAGUES) for (const def of cm.playableClubs(lg.id)) {
    if (clubs[def.name]) Object.assign(clubs[def.name], { tier: def.tier, budget: def.budget, exp: def.expectation });
  }
  return clubs;
}
function compare(rec, got, keys, label) {
  const names = Object.keys(rec);
  let bad = 0;
  for (const name of names) {
    const off = keys.filter(k => JSON.stringify(rec[name]?.[k]) !== JSON.stringify(got[name]?.[k]));
    if (off.length) { bad += 1; if (bad <= 5) console.log(`    ${label}: ${name} differs on ${off.join(', ')}`); }
  }
  const extra = Object.keys(got).filter(n => !(n in rec)).length;
  console.log(`   ${label}: ${names.length - bad} of ${names.length} clubs equal on ${keys.join(', ')}${extra ? `, ${extra} clubs not in the recording` : ''}`);
  check(bad === 0 && extra === 0, `${label}: ${bad} clubs differ from the recording, ${extra} not in it`);
}

/* ---------- section 1: the files as shipped ---------- */
section = 1;
console.log('1. arm A, the files as shipped');
const nA = levelled(A);
console.log(`   rows carrying a level: ${nA}`);
check(nA === 0, `arm A: ${nA} rows carry a level on files no META stamps`);
const statA = stature(A);
if (RECORD) {
  if (CONTROL) { console.log('simCmLevelReads: --record refuses to run under a control'); process.exit(2); }
  const about = 'Round 1600: what every modern club IS on the files as shipped (curve 1), read off the engine by scripts/simCmLevelReads.mjs --record: the best eleven bakedXIAvg ranks with (xi), the value scale of its projected men (scale), a digest of its slot anchors at year 0 (anchors), and for a club of a real league its tier, budget and the finish its board expects (exp). The age read must leave every one of these where it is: the harness holds the files as shipped and both stamped arms to it.';
  fs.writeFileSync(RECORDING, `${JSON.stringify({ about, clubs: statA }, null, 1)}\n`);
  console.log(`simCmLevelReads: recorded ${Object.keys(statA).length} clubs into scripts/data/cmStatureRecording.json`);
  process.exit(0);
}
const REC = JSON.parse(read('scripts/data/cmStatureRecording.json'));
compare(REC.clubs, statA, ['xi', 'scale', 'anchors', 'tier', 'budget', 'exp'], 'arm A');

/* ---------- section 2: stamped, ages untouched: every club read must be arm A's ---------- */
section = 2;
console.log('2. arm B1, the squads file stamped curve 2 with its ages untouched');
const nB1 = levelled(B1);
const rowsA = Object.values(A.eras.eraRosters('now')).flat();
const rowsB1 = Object.values(B1.eras.eraRosters('now')).flat();
const shown = rowsB1.filter((b, i) => b.r !== rowsA[i]?.r).length;
const levelIsOld = rowsB1.filter((b, i) => (b.lv ?? b.r) === rowsA[i]?.r).length;
console.log(`   rows carrying a level ${nB1}, shown on another rating ${shown}, level equal to arm A's rating ${levelIsOld} of ${rowsB1.length}`);
check(nB1 > 0 && shown === nB1, `arm B1: the stamp did not apply (${nB1} levels, ${shown} moved ratings)`);
check(levelIsOld === rowsA.length && rowsB1.length === rowsA.length, `arm B1: ${rowsA.length - levelIsOld} men's level is not the rating arm A shows`);
compare(REC.clubs, stature(B1), ['xi', 'scale', 'anchors', 'tier', 'budget', 'exp'], 'arm B1');
{
  let youths = 0, gone = 0, differ = 0;
  for (const club of Object.keys(A.eras.eraRosters('now'))) {
    const young = A.eras.projectedRoster(club, 0).filter(p => p.a < 24).map(p => p.n);
    const inA = new Set(A.eras.projectedRoster(club, 1).filter(p => !p.g).map(p => p.n));
    const inB = new Set(B1.eras.projectedRoster(club, 1).filter(p => !p.g).map(p => p.n));
    for (const n of young) { youths += 1; if (!inA.has(n)) gone += 1; if (inA.has(n) !== inB.has(n)) differ += 1; }
  }
  console.log(`   real men under 24: ${youths}, of whom ${gone} leave the game the first summer in arm A; arm B1 differs on ${differ}`);
  check(gone > 0 && differ === 0, `arm B1: ${differ} men under 24 leave or stay where arm A has the opposite (the exit must read the higher of rating and level)`);
}
{
  const roll = (arm, club) => {
    const outer = Math.random;
    try {
      Math.random = mulberry(hash(`start|${club}`));
      const s = arm.cm.startCareer(club);
      s.squad.sort((x, y) => x.name.localeCompare(y.name));
      for (const p of s.squad) delete p.potential;
      Math.random = mulberry(hash(`roll|${club}`));
      arm.cm.ensureAcademy(s);
      return new Map(s.squad.filter(p => p.age < 30).map(p => [p.name, { pot: p.potential, rating: p.rating, lv: p.lv }]));
    } finally { Math.random = outer; }
  };
  let men = 0, below = 0, differ = 0;
  for (const club of ['Chelsea', 'Barcelona', 'Arsenal', 'Inter Miami']) {
    const a = roll(A, club), b = roll(B1, club);
    for (const [name, x] of a) {
      const y = b.get(name);
      men += 1;
      if (y && y.rating < x.rating) below += 1;
      if (!y || y.pot !== x.pot) differ += 1;
    }
  }
  console.log(`   day one ceilings at four clubs: ${men} men under 30, ${below} shown under their level in arm B1, ceilings differing ${differ}`);
  check(men > 60 && below > 0 && differ === 0, `arm B1: ${differ} of ${men} ceilings differ from arm A's on the same dice (the roll must read the higher of rating and level)`);
}

/* ---------- section 3: stamped and aged to 1 August 2026, the flip as it will ship ---------- */
section = 3;
console.log(`3. arm B2, stamped and aged (${AGED.moved} of ${AGED.rows} ages moved)`);
const statB2 = stature(B2);
compare(REC.clubs, statB2, ['xi', 'anchors', 'tier', 'budget', 'exp'], 'arm B2');
const scaleMoved = Object.keys(REC.clubs).filter(n => REC.clubs[n].scale !== statB2[n]?.scale).length;
console.log(`   value scales the age move shifts (information, ages enter the curve): ${scaleMoved} clubs`);
const who = (arm, club, name) => (arm.eras.eraRosters('now')[club] ?? []).find(b => b.n === name);
/* The owner's three and the rest of Round 1214's 2026 table (docs/audits/ROUND-1214-NOTES.md, two other people's
   arithmetic on the same files): the flip must show exactly these, on the level curve 1 showed. */
for (const [club, name, want] of [['Inter Miami', 'Lionel Messi', 86], ['Al-Nassr', 'Cristiano Ronaldo', 86], ['AC Milan', 'Luka Modrić', 80],
  ['Liverpool', 'Virgil van Dijk', 85], ['Bayern Munich', 'Harry Kane', 91], ['Barcelona', 'Lamine Yamal', 94]]) {
  const a = who(A, club, name), b = who(B2, club, name);
  console.log(`   ${name} (${club}): curve 1 ${a?.r ?? '-'} at ${a?.a ?? '-'}, flipped ${b?.r ?? '-'} at ${b?.a ?? '-'} on level ${b ? (b.lv ?? b.r) : '-'}`);
  check(b?.r === want && (b?.lv ?? b?.r) === a?.r, `arm B2: ${name} shows ${b?.r} on level ${b?.lv ?? b?.r}, the table says ${want} on ${a?.r}`);
}

/* ---------- section 4: every past season read the same way (Proposal 4) ---------- */
section = 4;
console.log('4. the past seasons, read at load: the stretch (the level), then the points on the season\'s top');
{
  const { eras } = B2;
  /* Round 1214's counts of the rows the read changes in each season, and its 2005 to 2020 table rows (the notes'
     table, two other people's arithmetic on the same files). */
  const CHANGED = { era2005: 829, era2010: 890, era2015: 738, era2020: 862 };
  const TABLE = [
    ['era2005', 'Barcelona', 'Ronaldinho', 96], ['era2005', 'Arsenal', 'Thierry Henry', 96], ['era2005', 'Barcelona', 'Lionel Messi', 67],
    ['era2005', 'Manchester United', 'Cristiano Ronaldo', 84], ['era2010', 'Barcelona', 'Lionel Messi', 97], ['era2010', 'Real Madrid', 'Cristiano Ronaldo', 97],
    ['era2010', 'Barcelona', 'Xavi', 95], ['era2010', 'Tottenham', 'Luka Modrić', 83], ['era2015', 'Real Madrid', 'Cristiano Ronaldo', 98],
    ['era2015', 'Barcelona', 'Lionel Messi', 98], ['era2015', 'Barcelona', 'Neymar', 95], ['era2015', 'Real Madrid', 'Luka Modrić', 92],
    ['era2020', 'Barcelona', 'Lionel Messi', 94], ['era2020', 'Juventus', 'Cristiano Ronaldo', 92], ['era2020', 'Real Madrid', 'Luka Modrić', 83],
  ];
  for (const era of Object.keys(CHANGED)) {
    const raw = eras.eraRostersRaw(era), shown = eras.eraRosters(era);
    const rawTop = Math.max(...Object.values(raw).flat().map(b => b.r));
    let rows = 0, changed = 0, offLevel = 0, offRead = 0, over = 0;
    for (const [club, list] of Object.entries(raw)) {
      list.forEach((b, i) => {
        const s = shown[club][i];
        rows += 1;
        if ((s.lv ?? s.r) !== eras.eraUpliftRating(era, b.r)) offLevel += 1;
        if (s.r !== eraShown(eras, era, b)) offRead += 1;
        if (s.r !== (s.lv ?? s.r)) changed += 1;
        if (s.r > eras.eraTop(era)) over += 1;
      });
    }
    console.log(`   ${era}: top ${eras.eraTop(era)} (the stretch of the file's best, raw ${rawTop}), ${rows} rows, ${changed} read differently from their level, ${offLevel} levels off the stretch, ${offRead} off the read, ${over} past the top`);
    check(eras.eraTop(era) === eras.eraUpliftRating(era, rawTop), `${era}: its top ${eras.eraTop(era)} is not the stretch of its best man (${rawTop})`);
    check(offLevel === 0 && offRead === 0 && over === 0, `${era}: ${offLevel} levels off the stretch, ${offRead} ratings off the read, ${over} past the top`);
    check(changed === CHANGED[era], `${era}: the read changes ${changed} rows, Round 1214 counted ${CHANGED[era]}`);
  }
  let wrong = 0;
  for (const [era, club, name, want] of TABLE) {
    const s = (eras.eraRosters(era)[club] ?? []).find(b => b.n === name);
    if (s?.r !== want) { wrong += 1; console.log(`    ${era} ${name} (${club}) shows ${s?.r}, the table says ${want}`); }
  }
  console.log(`   the table: ${TABLE.length - wrong} of ${TABLE.length} rows as Round 1214 worked them out`);
  check(wrong === 0, `${wrong} past season rows of the table are off`);
}

const total = Object.values(failures).reduce((s, n) => s + n, 0);
for (const [s, n] of Object.entries(failures)) console.log(`   section ${s}: ${n} failures`);
console.log(`simCmLevelReads: ${checks} checks, ${total} failures${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(total ? 1 : 0);
