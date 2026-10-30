/**
 * Round 1570: the Hall wall (src/lib/usCareerHallWall.ts) in all four US My Careers.
 *
 * Every player retired in NBA, NFL, MLB or NHL My Career goes up on a wall kept under its own key beside the
 * save, so a restart no longer takes his Hall of Fame card. This harness holds the module to that promise.
 *
 *   1. FLEET. SIM_WALL_CAREERS careers a sport (default 200, seeds 1 on), made with the binding's own calls and
 *      played to retirement, stamped as the board's persist stamps them. For every career the plaque's record
 *      deep equals hallRecordFor (what the card shows), its legacy, verdict and Hall verdict equal legacyOf, its
 *      career line is the save's, the career is not touched, the three functions draw no Math.random, and the
 *      round trip through JSON and the sanitizer is lossless. Prints each sport's plaque bytes and outcomes.
 *   2. OLD SAVES. Every retired save in scripts/data/usBoardFixture.json, every row of
 *      src/test/fixtures/careerHallV1.json and every retired row of src/test/fixtures/careerHallSaves1301.json,
 *      repaired in memory the way the board's load repairs it: the plaque carries what that save's card told the
 *      player (V1 whole; 1301 apart from the weighs sentence, which its own test leaves free, and whole against
 *      the card today), the career is not touched, nothing is written to storage, the round trip is lossless.
 *   3. THE STORE. The cap and its one eviction rule (the new plaque always goes up; past 12 the oldest that
 *      missed the Hall comes down; the oldest Hall of Famer only when all 12 up are Hall of Famers), the keyed
 *      upsert (the same plaque is the same list, a changed record replaces it where it hangs), the worst case
 *      size, a newer version left alone, a bad or foreign plaque dropped alone, every clamp above every real
 *      string, and the weight fence: any of the four routes loads the module (and the board loads its key file,
 *      usCareerHallWallKey.ts, on the first frame), so neither may import a sport
 *      (scripts/lib/usCareerFiles.mjs weightProblemsIn; a planted sport import must be found on every run).
 *
 * Controls (SIM_HALL_WALL_CONTROL), each must turn its own check red:
 *   draw       one Math.random planted in hallWallEntry                      section 1 no draw
 *   unstamped  the plaque built on a copy with no calibration stamp          section 1 record equals the card
 *   calnow     old saves read on today's calibration                         section 2 V1 records
 *   dupe       the key check off                                             section 3 idempotence
 *   evict      the oldest comes down whatever its outcome                    section 3 Hall of Famer kept
 *   newcomer   the eviction looks at all 13, the new plaque included         section 3 the new plaque goes up
 *   clamp      the verdict clamp off                                         section 3 worst case size
 *   version    any version accepted                                          section 3 newer version left alone
 *   sportimport  an NBA import planted in the module                         section 3 weight fence
 *   nokeep     the board's keep effect returns at once                       section 4: C1 C3 C4b C5 C6 C8 C9 C10b C10c
 *   loadonly   the keep effect only for a career that was live in this visit section 4: C3 C4b C6 C10b C10c
 *   kept       hallKept forced true                                          section 4: C4 C4b C6 C10c
 *   anyplaque  hallKept true when ANY plaque is up, not this career's        section 4: C4b
 *   rewrite    the keep effect writes the same plaque again                  section 4: C3
 *   oldline    the "did not keep" line for any missing plaque, not a refusal  section 4: C10c
 *   createline the "did not keep" line from the create screen as well        section 4: C10a C10c
 *   nogate     the bound Hall gate taken out of both effects and the opener  section 4: C7
 *   stalesave  the keep effect no longer waits for a refused save            section 4: C9
 *   boarddraw  one Math.random planted in the keep effect                    section 4: C8
 *   readdraw   one Math.random planted in the read effect                    section 4: C8b (C8 stays green)
 *
 *   4. THE BOARD (normal run and the board controls only). src/test/usCareerHallWall.test.tsx run by vitest
 *      on the board, or on a copy of it under .sim-control with the control's edits swapped in for it
 *      (NO_DOUBLE_SWAP, the simUsCareerActionConfirm way). A board control is FIRED only when its cases are red
 *      in all four sports and the cases it names as untouched stay green in all four; one of those red is a
 *      refusal (exit 2), never a FIRED.
 * A control's string must be in the source exactly once or the run refuses (exit 2, never 1).
 * Exit: 0 green, 1 red (or, under a control, FIRED), 2 could not run, 3 a control that did not fire.
 *
 * Measured 2026-10-29 (seeds 1 to 200 a sport, this tree): plaque bytes median and p90 nfl 993 and 1068, nba 730
 * and 1083, mlb 585 and 1034, nhl 800 and 1042; Hall of Famers 18, 15, 16 and 26 of 200. Old saves: 16 retired
 * parity saves, 86 V1 rows, 50 retired 1301 rows. The worst case plaque is 2,251 characters, a full wall of them
 * 27,043. Longest real strings against their clamps (fixed sources, r1570-fix2): name 24/40 (the input's cap;
 * the fleet's longest is 12), pos 4/6, eraId 5/16, team 3/8, verdict 54/160, hallName 41/80, teamName 22/60,
 * weighs 187/320 (the fleet's 175), honours label 22/48. Every
 * control fired on 5 careers a sport. Fleet sizes are printed, never asserted; the clamp fence asks for a quarter
 * of room above the longest real string. Since the review fixes the fence reads fixed, finite sources only (the
 * old saves, the tables, the bindings' lists and labels, the name input's cap) and prints the fleet's longest
 * beside them, so a bigger SIM_WALL_CAREERS can never move it.
 */
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { weightProblemsIn } from './lib/usCareerFiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_HALL_WALL_CONTROL || '';
const CAREERS = Number(process.env.SIM_WALL_CAREERS || 200);
const MODULE = 'src/lib/usCareerHallWall.ts';
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const ENGINE = { nfl: { file: 'nflMyCareer', weights: 'NFL_LEGACY_WEIGHTS' }, nba: { file: 'nbaMyCareer', weights: 'NBA_LEGACY_WEIGHTS' }, mlb: { file: 'mlbMyCareer', weights: 'MLB_LEGACY_WEIGHTS' }, nhl: { file: 'nhlMyCareer', weights: 'NHL_LEGACY_WEIGHTS' } };
const PLANT = "import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';\n";

/* Each source control rewrites one string of the module as it is bundled; the string must be there once. */
const SOURCE_CONTROLS = {
  draw: { from: 'const hall = sport.hall;', to: 'const hall = sport.hall; Math.random();' },
  dupe: { from: 'const at = list.findIndex(e => e.key === entry.key);', to: 'const at = -1;' },
  evict: { from: "if (next[i].hall.outcome !== 'inducted') { drop = i; break; }", to: 'if (true) { drop = i; break; }' },
  newcomer: { from: 'for (let i = next.length - 1; i >= 1; i -= 1)', to: 'for (let i = next.length - 1; i >= 0; i -= 1)' },
  clamp: { from: 'verdict = cut(raw.verdict, C.verdict)', to: 'verdict = cut(raw.verdict, 1e9)' },
  version: { from: 'if (raw.v !== 1) return', to: 'if (false) return' },
  sportimport: { from: "import type { UsCareerCore } from '@/lib/usCareerSport';\n", to: `import type { UsCareerCore } from '@/lib/usCareerSport';\n${PLANT}` },
};
const HARNESS_CONTROLS = ['unstamped', 'calnow', 'nokeep', 'loadonly', 'kept', 'anyplaque', 'rewrite', 'oldline', 'createline', 'nogate', 'stalesave', 'boarddraw', 'readdraw'];
if (CONTROL && !SOURCE_CONTROLS[CONTROL] && !HARNESS_CONTROLS.includes(CONTROL)) {
  console.error(`simUsCareerHallWall: SIM_HALL_WALL_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(2);
}
/* Normalised on the read itself, so a multi line control string matches on a CRLF checkout (simHarnessAnchors). */
const source = readFileSync(path.join(ROOT, MODULE), 'utf8').replace(/\r\n/g, '\n');
let controlled = source;
if (SOURCE_CONTROLS[CONTROL]) {
  const { from, to } = SOURCE_CONTROLS[CONTROL];
  const hits = source.split(from).length - 1;
  if (hits !== 1) { console.error(`simUsCareerHallWall CONTROL ${CONTROL}: REFUSED, its string is in ${MODULE} ${hits} times, not once (not a FIRED)`); process.exit(2); }
  controlled = source.replace(from, to);
}

const TMP = mkdtempSync(path.join(os.tmpdir(), 'hall-wall-'));
const OUT = path.join(TMP, 'bundle.mjs');
const entry = [
  `export * from './${MODULE}';`,
  `export { hallRecordFor, stampHallCalibration, hallWeighLine, HALL_CALIBRATION, LEGACY_GAME_RULES } from './src/lib/careerHallOfFame.ts';`,
  `export { repairSummerOnLoad, newSummerSalt } from './src/lib/usCareerSummer.ts';`,
  `export { repairHallOnLoad } from './src/lib/usCareerRetirementFlow.ts';`,
  ...SPORTS.map(s => `export { ${s.toUpperCase()}_CAREER_SPORT as SPORT_${s} } from './src/lib/${s}CareerSport.ts';`),
  ...SPORTS.map(s => `export { ${s.toUpperCase()}_HALL_WORDS as WORDS_${s} } from './src/lib/${s}CareerHall.ts';`),
  ...SPORTS.map(s => `export { ${ENGINE[s].weights} as WEIGHTS_${s} } from './src/lib/${ENGINE[s].file}.ts';`),
].join('\n');
const modulePath = path.join(ROOT, MODULE);
const controlPlugin = {
  name: 'hall-wall-control',
  setup(b) {
    b.onLoad({ filter: /usCareerHallWall\.ts$/ }, args => (path.resolve(args.path) === modulePath ? { contents: controlled, loader: 'ts' } : undefined));
  },
};
try {
  await build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: OUT,
    absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, plugins: [controlPlugin], jsx: 'automatic',
    banner: { js: "import { createRequire as __wallRequire } from 'node:module'; const require = __wallRequire(import.meta.url);" },
  });
} catch (err) {
  console.error(`simUsCareerHallWall: the bundle did not build (${String(err && err.message).split('\n')[0]})`);
  process.exit(2);
}
/* The bindings and the stamp read localStorage; this run keeps it in memory and counts every write. */
const store = new Map();
let storageWrites = 0;
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { storageWrites += 1; store.set(k, String(v)); },
  removeItem: k => { storageWrites += 1; store.delete(k); }, clear: () => store.clear(), key: () => null, get length() { return store.size; },
};
const W = await import(pathToFileURL(OUT).href);
rmSync(TMP, { recursive: true, force: true });

/* Every check has an id; a control names the id it must turn red. */
const red = new Map();
const ran = new Map();
const ok = (id, cond, msg) => {
  ran.set(id, (ran.get(id) ?? 0) + 1);
  if (cond) return;
  if (!red.has(id)) red.set(id, []);
  red.get(id).push(typeof msg === 'function' ? msg() : msg);
};
const same = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch { return false; } };
const clone = v => JSON.parse(JSON.stringify(v));
const realRandom = Math.random;
let draws = 0;
Math.random = () => { draws += 1; return realRandom(); };
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pct = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
/* The longest real string for each clamp. The clamp fence (section 3) asserts on `longest` alone, which holds
   fixed, finite sources only: the old saves (recordings), every honours label and every team label (each team
   the old saves name, in every era) their bindings give, the four legacy verdict tables, every weighs line, each
   binding's positions, eras and Hall name, and the create screen's name cap. The fleet's strings go in
   `fleetLongest`, printed and never asserted: the max of a sample only grows with the sample (the read lens). */
const longest = { name: 0, pos: 0, eraId: 0, team: 0, verdict: 0, hallName: 0, teamName: 0, weighs: 0, label: 0 };
const fleetLongest = { ...longest };
const seeLen = (k, s, into = longest) => { if (typeof s === 'string' && s.length > into[k]) into[k] = s.length; };
const seeEntry = (e, into) => {
  seeLen('name', e.name, into); seeLen('pos', e.pos, into); seeLen('eraId', e.eraId, into); seeLen('verdict', e.verdict, into);
  for (const t of e.teams) seeLen('team', t, into);
  for (const h of e.honours) seeLen('label', h.label, into);
  seeLen('hallName', e.hall.hallName, into); seeLen('weighs', e.hall.weighs, into);
  if (e.hall.jersey) { seeLen('team', e.hall.jersey.team, into); seeLen('teamName', e.hall.jersey.teamName, into); }
};
/** The checks every plaque must pass, against the career it was built from. */
function checkPlaque(id, S, c, e, expectHall) {
  ok(`${id}.built`, !!e, `${S.slug} ${c.name}: no plaque for a retired career`);
  if (!e) return;
  seeEntry(e, id === 's1' ? fleetLongest : longest);
  ok(`${id}.record`, same(e.hall, expectHall), () => `${S.slug} ${c.name}: the plaque's record is not the card's`);
  const L = S.legacyOf(c);
  ok(`${id}.legacy`, e.legacy === L.score && e.verdict === L.verdict && e.hof === L.hof, `${S.slug} ${c.name}: legacy differs`);
  const teams = [...new Set(c.seasons.map(s => s.team))];
  const line = { key: W.wallKeyOf(c, S.hall), name: c.name, pos: c.pos, seasons: c.seasons.length, from: c.seasons[0]?.year ?? c.year,
    to: c.seasons.length ? c.seasons[c.seasons.length - 1].year : c.year, teams: teams.slice(0, 8), moreTeams: teams.length > 8 ? teams.length - 8 : undefined,
    rings: S.ringsOf(c), honours: S.honours(c).filter(h => h.n > 0), eraId: c.eraId };
  const got = { key: e.key, name: e.name, pos: e.pos, seasons: e.seasons, from: e.from, to: e.to, teams: e.teams, moreTeams: e.moreTeams, rings: e.rings, honours: e.honours, eraId: e.eraId };
  ok(`${id}.line`, same(got, line), () => `${S.slug} ${c.name}: career line ${JSON.stringify(got).slice(0, 160)}`);
  const back = W.sanitizeHallWall(JSON.parse(JSON.stringify({ v: 1, entries: [e] })), S.slug);
  ok(`${id}.roundtrip`, same(back, { entries: [e], writable: true }), `${S.slug} ${c.name}: the round trip lost something`);
}

/* ---------------------------------------------------------------- 1. FLEET */
const fleet = {};
for (const [si, slug] of SPORTS.entries()) {
  const S = W[`SPORT_${slug}`];
  const positions = Object.keys(S.create.archetypes);
  const eras = S.create.eras.map(e => e.id);
  const bytes = [], outcomes = {};
  for (let seed = 1; seed <= CAREERS; seed += 1) {
    try {
      const rng = seeded(seed * 4 + si);
      const pos = positions[seed % positions.length];
      const arch = S.create.archetypes[pos][Math.floor(rng() * S.create.archetypes[pos].length)];
      const c = S.startCareer(`Wall ${slug} ${seed}`, pos, arch, rng, null, eras[seed % eras.length]);
      c.summerSalt = W.newSummerSalt ? W.newSummerSalt(rng) : Math.floor(rng() * 0x100000000).toString(36);
      let tq = S.rollTeamQuality(null, rng);
      S.assignRole(c, tq, rng);
      for (let i = 0; i < 40 && !S.shouldRetire(c); i += 1) { S.simSeason(c, tq, rng); S.progress(c, rng); tq = S.rollTeamQuality(tq, rng); }
      c.retired = true;
      W.stampHallCalibration(c);
      const expectHall = W.hallRecordFor(S.hall, c);
      const before = JSON.stringify(c);
      const built = CONTROL === 'unstamped' ? (() => { const u = clone(c); delete u.hallCal; return u; })() : c;
      draws = 0;
      const e = W.hallWallEntry(S, built);
      const again = e ? W.addToWall(W.addToWall([], e), e) : [];
      W.sanitizeHallWall(JSON.parse(JSON.stringify({ v: 1, entries: again })), slug);
      ok('s1.nodraw', draws === 0, `${slug} seed ${seed}: ${draws} Math.random calls`);
      ok('s1.untouched', JSON.stringify(c) === before, `${slug} seed ${seed}: the career changed`);
      ok('s1.once', again.length === (e ? 1 : 0), `${slug} seed ${seed}: the same plaque twice made ${again.length}`);
      checkPlaque('s1', S, c, e, expectHall);
      if (e) { bytes.push(JSON.stringify(e).length); outcomes[e.hall.outcome] = (outcomes[e.hall.outcome] ?? 0) + 1; }
    } catch (err) {
      ok('s1.crash', false, `${slug} seed ${seed}: ${String(err && err.message).split('\n')[0]}`);
    }
  }
  fleet[slug] = { n: bytes.length, median: pct(bytes, 0.5), p90: pct(bytes, 0.9), outcomes };
  console.log(`section 1 ${slug}: ${bytes.length} plaques of ${CAREERS} careers, bytes median ${fleet[slug].median} p90 ${fleet[slug].p90}, outcomes ${JSON.stringify(outcomes)}`);
}

/* ------------------------------------------------------------ 2. OLD SAVES */
/** The board's load effect, in memory: the repairs it makes before it sets the career. */
function loadAsBoard(S, c) {
  if (!c.role) c.role = 'starter';
  const loaded = S.repairNetWorth(c);
  W.repairSummerOnLoad(loaded);
  W.repairHallOnLoad(loaded);
  return loaded;
}
/** One old retired save: the plaque carries what its card said, nothing is written, the career is not touched. */
function oldSave(id, S, raw, expect) {
  store.clear();
  store.set(S.saveKey, raw);
  const writesBefore = storageWrites;
  const c = loadAsBoard(S, JSON.parse(raw).c);
  const before = JSON.stringify(c);
  const built = CONTROL === 'calnow' ? { ...clone(c), hallCal: W.HALL_CALIBRATION } : c;
  draws = 0;
  const e = W.hallWallEntry(S, built);
  ok(`${id}.nodraw`, draws === 0, `${S.slug}: ${draws} draws`);
  ok(`${id}.untouched`, JSON.stringify(c) === before, `${S.slug} ${c.name}: the career changed`);
  ok(`${id}.nowrite`, storageWrites === writesBefore && store.get(S.saveKey) === raw, `${S.slug} ${c.name}: storage was written`);
  checkPlaque(id, S, c, e, expect(c).hall);
  // Every label the binding can give this save, and every team it names labelled in every era (the jersey's words).
  for (const h of S.honours(c)) seeLen('label', h.label);
  for (const t of new Set(c.seasons.map(s => s.team))) for (const era of S.create.eras) seeLen('teamName', S.teamLabelOf(t, era.id));
  if (e && expect(c).rest) {
    const { weighs, ...rest } = e.hall;
    ok(`${id}.told`, same(rest, expect(c).rest) && typeof weighs === typeof expect(c).weighs, () => `${S.slug} ${c.name}: the record differs from what the old code told him`);
  }
  if (e && expect(c).legacy) {
    const t = expect(c).legacy;
    ok(`${id}.toldLegacy`, e.legacy === t.score && e.verdict === t.verdict && e.hof === t.hof, `${S.slug} ${c.name}: the legacy differs from what he was told`);
  }
  return e;
}
const readJson = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const FX = readJson('scripts/data/usBoardFixture.json');
const V1 = readJson('src/test/fixtures/careerHallV1.json');
const R1301 = readJson('src/test/fixtures/careerHallSaves1301.json');
const counted = { fixture: 0, v1: 0, r1301: 0 };
for (const slug of SPORTS) {
  const S = W[`SPORT_${slug}`];
  for (const raw of Object.values(FX.sports[slug].saves)) {
    let s; try { s = JSON.parse(raw); } catch { continue; }
    if (!s?.c?.retired) continue;
    counted.fixture += 1;
    oldSave('s2.fixture', S, raw, c => ({ hall: W.hallRecordFor(S.hall, c) }));
  }
  for (const row of V1.sports[slug]) {
    counted.v1 += 1;
    // A V1 row is a bare career; the board's save wraps it.
    oldSave('s2.v1', S, JSON.stringify({ c: row.save, phase: 'retired', teamQuality: 80, coach: null }), () => ({ hall: row.hall, legacy: row.legacy }));
  }
  for (const r of R1301.recordings) {
    for (const row of r.sports[slug].filter(x => x.kind !== 'open')) {
      counted.r1301 += 1;
      const { weighs, ...rest } = row.hall;
      oldSave('s2.r1301', S, JSON.stringify({ c: row.save, phase: 'retired', teamQuality: 80, coach: null }), c => ({ hall: W.hallRecordFor(S.hall, c), rest, weighs, legacy: row.legacy }));
    }
  }
}
console.log(`section 2: ${counted.fixture} retired saves of the parity fixture, ${counted.v1} V1 rows, ${counted.r1301} retired 1301 rows`);
ok('s2.counted', counted.fixture > 0 && counted.v1 > 0 && counted.r1301 > 0, `section 2 read nothing: ${JSON.stringify(counted)}`);

/* ---------------------------------------------------------------- 3. THE STORE */
const CL = W.HALL_WALL_CLAMPS, LI = W.HALL_WALL_LISTS;
const wide = n => 'W'.repeat(n);
/** A raw plaque with every string past its clamp and every list past its length. */
function overlong(sport, key = wide(W.HALL_WALL_KEY_MAX), outcome = 'notOnBallot') {
  return {
    key, name: wide(2 * CL.name), pos: wide(2 * CL.pos), eraId: wide(2 * CL.eraId), seasons: 99, from: 9999, to: 9999,
    teams: Array.from({ length: LI.teams + 3 }, () => wide(2 * CL.team)), moreTeams: 999, rings: 999,
    honours: Array.from({ length: LI.honours + 3 }, () => ({ label: wide(2 * CL.label), n: 9999 })), legacy: -99999,
    verdict: wide(2 * CL.verdict), hof: false,
    hall: { sport, hallName: wide(2 * CL.hallName), firstClass: 9999, score: -99999, outcome,
      ballots: Array.from({ length: LI.ballots + 3 }, () => ({ classYear: 9999, share: 99.9, elected: false })),
      inductedClass: 9999, firstBallot: false, jersey: { team: wide(2 * CL.team), seasons: 99, teamName: wide(2 * CL.teamName) }, weighs: wide(2 * CL.weighs) },
  };
}
const plaque = (key, outcome) => {
  const e = W.sanitizeHallWall({ v: 1, entries: [{ ...overlong('nba', key, outcome), name: `P ${key}` }] }, 'nba').entries[0];
  if (!e) throw new Error(`simUsCareerHallWall: the store's plaque ${key} did not pass`);
  return e;
};
const keys = list => list.map(e => e.key);
const hof = (n, tag) => Array.from({ length: n }, (_, i) => plaque(`${tag}${i}`, 'inducted'));
// Idempotence and the keyed upsert.
{
  const wall = [plaque('a', 'inducted'), plaque('b', 'fellOff'), plaque('c', 'waiting')];
  const again = W.addToWall(wall, clone(wall[1]));
  ok('s3.idem', again === wall && again.length === 3, `the same plaque again gave ${keys(again)}`);
  const changed = { ...clone(wall[1]), rings: 3 };
  const up = W.addToWall(wall, changed);
  ok('s3.upsert', up !== wall && same(keys(up), ['a', 'b', 'c']) && same(up[1], changed), `a changed record gave ${keys(up)}`);
  ok('s3.upsert', W.addToWall(up, clone(changed)) === up, 'an unchanged record after an update was written again');
}
// The cap: 9 Hall of Famers and 3 misses, the OLDEST plaque a Hall of Famer, the misses in the middle.
{
  const wall = [...hof(4, 'h'), plaque('m0', 'fellOff'), plaque('m1', 'waiting'), ...hof(3, 'g'), plaque('m2', 'notOnBallot'), ...hof(2, 'f')];
  ok('s3.setup', wall.length === W.HALL_WALL_CAP, `the cap wall has ${wall.length}`);
  const next = W.addToWall(wall, plaque('new', 'fellOff'));
  ok('s3.hofkept', next.length === W.HALL_WALL_CAP && next[0].key === 'new' && !keys(next).includes('m2')
    && next.filter(e => e.hall.outcome === 'inducted').length === 9, `13th miss on 9 + 3 gave ${keys(next)}`);
}
// Twelve Hall of Famers: the new plaque still goes up, one Hall of Famer comes down, and a second quick career takes the first.
{
  const wall = hof(12, 'h');
  const one = W.addToWall(wall, plaque('miss1', 'notOnBallot'));
  ok('s3.newcomer', same(keys(one), ['miss1', ...keys(wall).slice(0, 11)]), `a miss on 12 Hall of Famers gave ${keys(one)}`);
  const two = W.addToWall(one, plaque('miss2', 'fellOff'));
  ok('s3.newcomer', same(keys(two), ['miss2', ...keys(wall).slice(0, 11)]), `a second miss gave ${keys(two)}`);
}
// The size: one plaque with every clamp hit is the stated bound, and twelve fit the stated total.
{
  const e = W.sanitizeHallWall({ v: 1, entries: [overlong('nhl')] }, 'nhl').entries[0];
  const n = e ? JSON.stringify(e).length : -1;
  const full = e ? JSON.stringify({ v: 1, entries: Array(W.HALL_WALL_CAP).fill(e) }).length : -1;
  console.log(`section 3: the worst case plaque is ${n} characters of JSON (stated ${W.HALL_WALL_ENTRY_MAX_BYTES}), a full wall of them ${full}`);
  ok('s3.bytes', n === W.HALL_WALL_ENTRY_MAX_BYTES, `the worst case is ${n}, the module states ${W.HALL_WALL_ENTRY_MAX_BYTES}`);
  ok('s3.longkey', W.sanitizeHallWall({ v: 1, entries: [overlong('nhl', wide(W.HALL_WALL_KEY_MAX + 1))] }, 'nhl').entries.length === 0, 'a key past the bound was kept');
}
// A newer version is left alone; junk is an empty writable wall; a bad, foreign or repeated plaque is dropped alone.
{
  const good = [plaque('a', 'inducted'), plaque('b', 'fellOff')];
  ok('s3.version', same(W.sanitizeHallWall({ v: 2, entries: good }, 'nba'), { entries: [], writable: false }), 'a v 2 wall was read as this build\'s');
  for (const junk of [null, 'x', 7, [], {}]) ok('s3.junk', same(W.sanitizeHallWall(junk, 'nba'), { entries: [], writable: true }), `junk ${JSON.stringify(junk)}`);
  const bad = { ...clone(good[0]), key: 'x', from: 'soon' };
  const foreign = { ...clone(good[1]), key: 'y', hall: { ...clone(good[1].hall), sport: 'nhl' } };
  const got = W.sanitizeHallWall(clone({ v: 1, entries: [good[0], bad, foreign, good[0], good[1]] }), 'nba');
  ok('s3.dropalone', same(got, { entries: good, writable: true }), `a mixed wall kept ${keys(got.entries)}`);
}
// Every clamp sits above every real string with room, over fixed sources only (see `longest`): the old saves,
// every verdict in the four legacy tables, every weighs line the four sports' words can build, each binding's
// positions, eras and Hall name, and the create screen's name cap. The fleet is printed beside it.
{
  const board = readFileSync(path.join(ROOT, 'src/components/us-career/UsCareerBoard.tsx'), 'utf8');
  const caps = [...board.matchAll(/maxLength=\{(\d+)\}/g)].map(m => Number(m[1]));
  ok('s3.tables', caps.length === 1, `the board has ${caps.length} maxLength caps, not the name input's one`);
  if (caps.length === 1) seeLen('name', 'W'.repeat(caps[0]));
}
for (const slug of SPORTS) {
  const S = W[`SPORT_${slug}`];
  for (const p of Object.keys(S.create.archetypes)) seeLen('pos', p);
  for (const era of S.create.eras) seeLen('eraId', era.id);
  seeLen('hallName', S.hall?.rules.hallName);
  const src = readFileSync(path.join(ROOT, `src/lib/${ENGINE[slug].file}.ts`), 'utf8').replace(/\r\n/g, '\n');
  const at = src.indexOf('const verdict = score >=');
  ok('s3.tables', at >= 0, `${slug}: no verdict table found`);
  const table = at >= 0 ? src.slice(at, src.indexOf(';', at)) : '';
  for (const m of table.matchAll(/'([^']*)'/g)) seeLen('verdict', m[1]);
  const words = W[`WORDS_${slug}`];
  for (const cal of [2, 3]) {
    const weights = W[`WEIGHTS_${slug}`][cal];
    for (const pos of Object.keys(weights.positions)) {
      seeLen('weighs', W.hallWeighLine(words, weights, pos, null));
      for (const s of weights.positions[pos].standout ?? []) {
        seeLen('weighs', W.hallWeighLine(words, weights, pos, { stat: s.stat, label: s.label, total: 999999, credit: 999 }));
      }
    }
  }
}
for (const k of Object.keys(longest)) {
  console.log(`section 3 clamp ${k}: longest real ${longest[k]} (the fleet's longest ${fleetLongest[k]}, printed only), clamp ${CL[k]}`);
  ok('s3.clamps', longest[k] > 0 || k === 'eraId', `${k}: no real string was seen`);
  ok('s3.clamps', longest[k] * 1.25 <= CL[k], `${k}: the longest real string ${longest[k]} has under a quarter of room below its clamp ${CL[k]}`);
}
// The weight fence: any US career route may load this module and every one loads the key file, so neither may import a sport.
{
  const KEY_FILE = 'src/lib/usCareerHallWallKey.ts';
  const found = [...weightProblemsIn(MODULE, controlled, null), ...weightProblemsIn(KEY_FILE, readFileSync(path.join(ROOT, KEY_FILE), 'utf8').replace(/\r\n/g, '\n'), null)];
  ok('s3.weight', found.length === 0, () => found.join('; '));
  const planted = weightProblemsIn(MODULE, source.replace("import type { UsCareerCore } from '@/lib/usCareerSport';\n", `import type { UsCareerCore } from '@/lib/usCareerSport';\n${PLANT}`), null);
  ok('s3.fence', planted.length === 1 && /NBA code/.test(planted[0]), `the fence did not name a planted NBA import: ${JSON.stringify(planted)}`);
}

/* ---------------------------------------------------------------- 4. THE BOARD */
/* The board's wall code, held to src/test/usCareerHallWall.test.tsx: each control edits one or two executable
   strings of the shared board in a copy under .sim-control (each string asserted there exactly once), swaps the
   copy in for the board (vitest.config.ts NO_DOUBLE_SWAP, as simUsCareerActionConfirm does), and names the
   cases that must go red and the ones that must stay green. Tags: C1 is "C1 and C2", C10a/b/c the three C10
   cases (create screen, retirement screen, the honest lines), J the jersey words. */
const BOARD = 'src/components/us-career/UsCareerBoard.tsx';
const BOARD_TEST = 'src/test/usCareerHallWall.test.tsx';
/* 57 since Release BU: C11 (NBA only, one case) is the lead's L3 seam, the keep effect held while a loaded save's
   intl repair is pending. No board control names it (each control's tags count four sports); its negative control
   is the release's mutl3hold line, which takes the hold out and must turn C11 red. */
const BOARD_CASES = 57;
const KEEP = 'if (!sport.hall || !career?.retired || saveFailure || intlRepairPending) return;';
const MISSING = "missing={view.from === 'retired' && hallRefused}";
const KEPT_LINE ='const hallKept = hallWallKeyNow !== null && !!wall?.entries.some(e => e.key === hallWallKeyNow);';
const READ = 'if (!sport.hall) return;\n    try {\n      const raw = localStorage.getItem(hallWallKey(sport.slug));';
const BOARD_CONTROLS = {
  /* nokeep and loadonly also turn C10c red: with no keep effect no write is ever refused, and the wall's honest
     line shows only after a refusal. */
  nokeep: { edits: [[KEEP, 'if (true) return;']], fail: ['C1', 'C3', 'C4b', 'C5', 'C6', 'C8', 'C9', 'C10b', 'C10c'], hold: ['C4', 'C7', 'C8b', 'C10a', 'J'] },
  loadonly: { edits: [['const [wall, setWall] = useState<HallWall | null>(null);', 'const [wall, setWall] = useState<HallWall | null>(null); const wallSawLive = useRef(false);'],
    [KEEP, 'if (career && !career.retired) wallSawLive.current = true; if (!sport.hall || !career?.retired || saveFailure || intlRepairPending || !wallSawLive.current) return;']],
    fail: ['C3', 'C4b', 'C6', 'C10b', 'C10c'], hold: ['C1', 'C4', 'C5', 'C7', 'C8', 'C8b', 'C9', 'C10a', 'J'] },
  kept: { edits: [[KEPT_LINE, 'const hallKept = hallWallKeyNow !== null;']],
    fail: ['C4', 'C4b', 'C6', 'C10c'], hold: ['C1', 'C3', 'C5', 'C7', 'C8', 'C8b', 'C9', 'C10a', 'C10b', 'J'] },
  /* The reviewers' run lens (r1570-run-mut): "the card stays" read off ANY plaque up, not this career's. */
  anyplaque: { edits: [[KEPT_LINE, 'const hallKept = hallWallKeyNow !== null && !!wall?.entries.length;']],
    fail: ['C4b'], hold: ['C1', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C8b', 'C9', 'C10a', 'C10b', 'C10c', 'J'] },
  /* The keep effect writes the same plaque again on every load (the read lens: no control proved C3's "a second
     visit writes nothing" could fail). */
  rewrite: { edits: [['if (next !== was.entries) localStorage.setItem(', 'if (true) localStorage.setItem(']],
    fail: ['C3'], hold: ['C1', 'C4', 'C4b', 'C5', 'C6', 'C7', 'C8', 'C8b', 'C9', 'C10a', 'C10b', 'C10c', 'J'] },
  /* The wall's "did not keep" line: shown for any missing plaque, refused or not (oldline), and shown from the
     create screen as well (createline). */
  oldline: { edits: [[MISSING, "missing={view.from === 'retired' && !hallKept}"]],
    fail: ['C10c'], hold: ['C1', 'C3', 'C4', 'C4b', 'C5', 'C6', 'C7', 'C8', 'C8b', 'C9', 'C10a', 'C10b', 'J'] },
  createline: { edits: [[MISSING, 'missing={!hallKept}']],
    fail: ['C10a', 'C10c'], hold: ['C1', 'C3', 'C4', 'C4b', 'C5', 'C6', 'C7', 'C8', 'C8b', 'C9', 'C10b', 'J'] },
  nogate: { edits: [[READ, READ.replace('if (!sport.hall) return;\n    ', '')], [KEEP, 'if (!career?.retired || saveFailure || intlRepairPending) return;'],
    ['{sport.hall && wall && wall.entries.length > 0 && (', '{wall && wall.entries.length > 0 && (']],
    fail: ['C7'], hold: ['C1', 'C3', 'C4', 'C4b', 'C5', 'C6', 'C8', 'C8b', 'C9', 'C10a', 'C10b', 'C10c', 'J'] },
  stalesave: { edits: [[KEEP, 'if (!sport.hall || !career?.retired || intlRepairPending) return;']], fail: ['C9'], hold: ['C1', 'C3', 'C4', 'C4b', 'C5', 'C6', 'C7', 'C8', 'C8b', 'C10a', 'C10b', 'C10c', 'J'] },
  boarddraw: { edits: [['if (!entry) return;', 'if (!entry) return; Math.random();']], fail: ['C8'], hold: ['C1', 'C3', 'C4', 'C4b', 'C5', 'C6', 'C7', 'C8b', 'C9', 'C10a', 'C10b', 'C10c', 'J'] },
  /* The closing check's residual: a draw planted in the read effect is equal in all three of C8's arms (each binds
     the Hall), so C8 stays green and C8b, whose baseline binds none, must go red. */
  readdraw: { edits: [[READ, READ.replace('if (!sport.hall) return;', 'if (!sport.hall) return; Math.random();')]],
    fail: ['C8b'], hold: ['C1', 'C3', 'C4', 'C4b', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10a', 'C10b', 'C10c', 'J'] },
};
const tagOf = name => (name.includes('C1 and C2') ? 'C1' : name.includes('C10: focus') ? 'C10a' : name.includes('C10: from the retirement') ? 'C10b'
  : name.includes('C10: the wall says') ? 'C10c' : name.includes('jersey') ? 'J' : (name.match(/\bC(\d+b?):/) ?? [])[1] ? `C${name.match(/\bC(\d+b?):/)[1]}` : '?');
let boardVerdict = null;
if (!CONTROL || BOARD_CONTROLS[CONTROL]) {
  const { spawnSync } = await import('node:child_process');
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const boardSource = readFileSync(path.join(ROOT, BOARD), 'utf8').replace(/\r\n/g, '\n');
  for (const [name, c] of Object.entries(BOARD_CONTROLS)) for (const [from] of c.edits) {
    const n = boardSource.split(from).length - 1;
    if (n !== 1) { console.error(`simUsCareerHallWall board control ${name}: REFUSED, its string is in the board ${n} times, not once (not a FIRED)`); process.exit(2); }
  }
  const work = path.join(ROOT, '.sim-control', `hall-wall-${process.pid}-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  if (CONTROL) {
    let changed = boardSource;
    for (const [from, to] of BOARD_CONTROLS[CONTROL].edits) changed = changed.replace(from, to);
    const copy = path.join(work, 'UsCareerBoard.tsx');
    writeFileSync(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/us-career/UsCareerBoard': copy });
  }
  const report = path.join(work, 'report.json');
  const run = spawnSync(process.execPath, ['--require', path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', BOARD_TEST,
    '--reporter=json', `--outputFile.json=${report}`, '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=300000', '--hookTimeout=120000'],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
  let rows = [];
  try { rows = JSON.parse(readFileSync(report, 'utf8')).testResults.flatMap(f => f.assertionResults); } catch { /* read below */ }
  rmSync(work, { recursive: true, force: true });
  ok('s4.held', readFileSync(path.join(ROOT, BOARD), 'utf8').replace(/\r\n/g, '\n') === boardSource, 'the board changed under the run');
  if (!rows.length) { console.error(`simUsCareerHallWall section 4: the board test did not report (${String(run.stderr || run.error || '').split('\n').slice(-3).join(' | ')})`); process.exit(2); }
  const byTag = {};
  for (const r of rows) (byTag[tagOf(r.fullName)] ??= []).push(r.status);
  console.log(`section 4${CONTROL ? ` (${CONTROL})` : ''}: ${rows.length} board cases, ${rows.filter(r => r.status === 'passed').length} passed, by tag ${JSON.stringify(Object.fromEntries(Object.entries(byTag).map(([t, s]) => [t, `${s.filter(x => x === 'passed').length}/${s.length}`])))}`);
  ok('s4.cases', rows.length === BOARD_CASES && !byTag['?'], `the board test has ${rows.length} cases (stated ${BOARD_CASES}), untagged ${byTag['?']?.length ?? 0}`);
  if (!CONTROL) ok('s4.board', rows.every(r => r.status === 'passed'), () => `board cases red: ${rows.filter(r => r.status !== 'passed').map(r => r.fullName).join('; ').slice(0, 400)}`);
  else {
    const c = BOARD_CONTROLS[CONTROL];
    const fired = c.fail.every(t => byTag[t]?.length === 4 && byTag[t].every(s => s === 'failed'));
    const heldUp = c.hold.every(t => byTag[t]?.length === 4 && byTag[t].every(s => s === 'passed'));
    boardVerdict = { fired, heldUp };
  }
}

/* ---------------------------------------------------------------- the verdict */
const TARGET = { draw: 's1.nodraw', unstamped: 's1.record', calnow: 's2.v1.record', dupe: 's3.idem', evict: 's3.hofkept', newcomer: 's3.newcomer', clamp: 's3.bytes', version: 's3.version', sportimport: 's3.weight' };
Math.random = realRandom;
for (const [id, msgs] of red) console.log(`RED ${id}: ${msgs.length} (first: ${msgs[0]})`);
const checks = [...ran.values()].reduce((a, b) => a + b, 0);
if (CONTROL && BOARD_CONTROLS[CONTROL]) {
  const c = BOARD_CONTROLS[CONTROL];
  if (!boardVerdict.heldUp) { console.log(`simUsCareerHallWall CONTROL ${CONTROL}: REFUSED, a case it must leave green went red (${c.hold.join(', ')}); not a FIRED`); process.exit(2); }
  if (boardVerdict.fired) { console.log(`simUsCareerHallWall CONTROL ${CONTROL}: FIRED, ${c.fail.join(', ')} red in all four sports and ${c.hold.join(', ')} green`); process.exit(1); }
  console.log(`simUsCareerHallWall CONTROL ${CONTROL}: DID NOT FIRE, ${c.fail.join(', ')} not red in all four sports`);
  process.exit(3);
}
if (CONTROL) {
  const t = TARGET[CONTROL], n = red.get(t)?.length ?? 0;
  if (n > 0) { console.log(`simUsCareerHallWall CONTROL ${CONTROL}: FIRED, ${t} red ${n} times`); process.exit(1); }
  console.log(`simUsCareerHallWall CONTROL ${CONTROL}: DID NOT FIRE, ${t} stayed green over ${ran.get(t) ?? 0} checks`);
  process.exit(3);
}
if (red.size) { console.log(`simUsCareerHallWall: RED, ${red.size} check ids failed of ${ran.size} (${checks} checks)`); process.exit(1); }
console.log(`simUsCareerHallWall: ok, ${ran.size} check ids, ${checks} checks, ${CAREERS} careers a sport, ${counted.fixture + counted.v1 + counted.r1301} old saves`);
process.exit(0);
