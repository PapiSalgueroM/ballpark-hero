/* Round 1604: Soccer Career's academy placement keeps its word (report 3f014b97).

   The create screen previews an academy with its own draw of
   getYouthAcademyClub, and until this round initCareer drew again on Begin
   Career, so the club a player was shown and the club he started at agreed
   about once in however many clubs sat in his band. initCareer now takes the
   shown club's name as an optional last argument and honours it whenever that
   club is in the start year's list (adjustClubsForYear); without it the draw
   runs exactly as before.

   The grid is the page's own: every nationality and every era read out of
   src/pages/SoccerCareer.tsx (NATIONALITIES and ERAS), five overall bands (35,
   45, 60, 70, 80, one in each branch of getYouthAcademyClub), SEEDS seeds.

   Sections
   1 KEPT       the screen's flow, a preview drawn then a career begun with its
                name: the career's academyClubName, currentClub, country, tier,
                league, first season row and opening event all name the shown
                club, in every case. A name that is not in the start year's
                list (no such club, or a club founded after that year) falls
                back to the draw and still lands in the list. Club names are
                unique in every era's list, so a name names one club.
   2 OLD PATH   two independent draws (preview, then initCareer without the
                name), the path before this round: the agreement rate is
                printed per band and must stay under AGREE_CEILING, which shows
                the grid can see the defect at all.
   3 UNCHANGED  initCareer without the name equals initCareer with null and
                with a name that is in no list: the whole state and the next
                three Math.random draws are byte equal. With SC_ACADEMY_BASE set
                to a commit (bundled from git show) the same holds against that
                commit's engine, so every existing caller and fleet harness is
                untouched; this round's gate runs it with 4bd20c993. Without it
                the base half is skipped and says so, so a later round that
                means to change a new career is not blamed on this one.

   Negative controls, SC_ACADEMY_CONTROL=<name>, each rewrites the engine in
   memory only and refuses to run (exit 2) when its anchor is missing. A control
   that fires turns its section red and exits 1 with the last line
   "control <name> FIRED"; one that changes nothing exits 3 "DID NOT FIRE".
     redraw     initCareer ignores the shown name           -> section 1
     pickfirst  getYouthAcademyClub returns the first home
                club, so two draws always agree             -> section 2
     extradraw  initCareer draws once more when no name is
                handed in, shifting every later draw        -> section 3

   Measured on a GitHub runner at bdff8601a (rc r1604-s2): section 1 kept
   16080 of 16080 (3 seeds) and 32160 of 32160 (6 seeds); the old path agreed
   26.0% (3 seeds) and 25.9% (6 seeds), by band 35: 39.5, 45: 42.1, 60: 21.2,
   70: 8.6, 80: 18.6 percent; the redraw control kept 4192 of 16080. The
   sampling error on 16080 cases is about 0.35 points, so AGREE_CEILING sits
   at 35 percent, some 25 errors above the measure and far below the 100 the
   pickfirst control reaches. More clubs in the pool only push it lower.
   Run: node scripts/simSoccerAcademyPlacement.mjs   (SEEDS=n, default 3;
   SC_ACADEMY_BASE=4bd20c993 adds section 3's base half, as this round's gate does)
   No network and no database: everything is bundled from this tree. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bundleCareerSources } from './lib/careerClubPool.mjs';
import { seedRandom } from './lib/careerStep.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SC_ACADEMY_CONTROL || '';
const SEEDS = Number(process.env.SEEDS || 3);
const BANDS = [35, 45, 60, 70, 80];
const AGREE_CEILING = 0.35;
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const tmpDir = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'simacademy-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

const red = new Set();
let section = '0';
let failures = 0;
const fail = m => { failures += 1; red.add(section); console.error(`  FAIL [${section}]: ${m}`); };
const ok = (cond, m) => { if (!cond) fail(m); return cond; };
const head = (id, title) => { section = id; console.log(`\n${id}. ${title}`); };

const swap = (from, to) => s => {
  if (!s.includes(from)) { console.error(`control ${CONTROL}: anchor not found: ${from.slice(0, 80)}`); process.exit(2); }
  return s.replace(from, to);
};
const CONTROLS = {
  redraw: ['1', swap('(academyName ? yearClubs.find(c => c.name === academyName) : undefined)', '(undefined)')],
  pickfirst: ['2', swap('export function getYouthAcademyClub(clubs: ClubData[], nationality: string, overall?: number): ClubData {\n',
    'export function getYouthAcademyClub(clubs: ClubData[], nationality: string, overall?: number): ClubData {\n  if (clubs.length) return clubs.find(c => c.country === nationality) ?? clubs[0];\n')],
  extradraw: ['3', swap('  const yearClubs = adjustClubsForYear(clubs, startYear);\n',
    '  const yearClubs = adjustClubsForYear(clubs, startYear);\n  if (!academyName) Math.random();\n')],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL} (${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }

function finish() {
  console.log(`\n${failures} failure(s), red sections: ${[...red].sort().join(', ') || 'none'}`);
  if (CONTROL) {
    const target = CONTROLS[CONTROL][0];
    if (red.has(target)) { console.log(`control ${CONTROL} FIRED: section ${target} went red as it must`); process.exit(1); }
    console.log(`control ${CONTROL} DID NOT FIRE: section ${target} stayed green`);
    process.exit(3);
  }
  console.log(failures ? 'simSoccerAcademyPlacement: RED' : 'simSoccerAcademyPlacement: all sections green');
  process.exit(failures ? 1 : 0);
}

/* The page's own lists, read from source so a nation or era added later is
   in the grid without anybody remembering this file. */
const page = fs.readFileSync(path.join(ROOT, 'src/pages/SoccerCareer.tsx'), 'utf8').replaceAll('\r\n', '\n');
const natBlock = page.match(/\nconst NATIONALITIES = \[([\s\S]*?)\];/);
const eraBlock = page.match(/\nconst ERAS = \[([\s\S]*?)\];/);
if (!natBlock || !eraBlock) { console.error('NATIONALITIES or ERAS not found in SoccerCareer.tsx'); process.exit(2); }
const NATIONS = [...natBlock[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
const ERAS = [...eraBlock[1].matchAll(/value: "([^"]+)", label: "[^"]*", startYear: (\d+)/g)].map(m => ({ value: m[1], startYear: Number(m[2]) }));
if (NATIONS.length < 50 || ERAS.length < 4) { console.error(`grid too small: ${NATIONS.length} nations, ${ERAS.length} eras`); process.exit(2); }

const transforms = CONTROL ? { 'lib/soccerCareerEngine.ts': CONTROLS[CONTROL][1] } : {};
let mod;
try { mod = await bundleCareerSources({ root: ROOT, tmpDir, transforms }); }
catch (e) { console.error(`bundle failed: ${e && e.message}`); process.exit(2); }
const { engine, eras } = mod;
const CLUBS = engine.FALLBACK_CLUBS;
const statsAt = ovr => ({ pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr });
const begin = (eng, nat, era, ovr, ...name) =>
  eng.initCareer('Academy Test', nat, 'ST', era.value, statsAt(ovr), ovr, era.startYear, CLUBS, null, undefined, null, null, ...name);
console.log(`grid: ${NATIONS.length} nations x ${ERAS.length} eras x ${BANDS.length} bands x ${SEEDS} seeds, ${CLUBS.length} clubs`);
const yearList = era => eras.adjustClubsForYear(CLUBS, era.startYear);
const preview = (era, nat, ovr) => engine.getYouthAcademyClub(yearList(era), nat, ovr);

head('1', 'KEPT: the career starts at the academy the screen showed');
{
  for (const era of ERAS) {
    const names = yearList(era).map(c => c.name);
    ok(new Set(names).size === names.length, `${era.value}: ${names.length - new Set(names).size} club names repeat in the year's list`);
  }
  let cases = 0, kept = 0;
  const firstMiss = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    seedRandom(16040 + seed);
    for (const era of ERAS) for (const nat of NATIONS) for (const ovr of BANDS) {
      const shown = preview(era, nat, ovr);
      const s = begin(engine, nat, era, ovr, shown.name);
      cases += 1;
      const youth = `${shown.name} Youth`;
      const same = s.academyClubName === shown.name && s.currentClub === youth && s.currentClubCountry === shown.country
        && s.currentClubTier === shown.tier && s.currentLeague === shown.league && s.currentClubColor === shown.color
        && s.seasons[0].club === youth && s.seasons[0].clubCountry === shown.country && s.seasons[0].clubTier === shown.tier
        && s.events[0] === `📋 Joined ${shown.name} Youth Academy aged 16`;
      if (same) kept += 1; else if (firstMiss.length < 3) firstMiss.push(`${nat} ${era.value} ${ovr}: shown ${shown.name}, started ${s.currentClub}`);
    }
  }
  console.log(`  ${kept} of ${cases} careers started at the academy shown`);
  ok(cases === SEEDS * ERAS.length * NATIONS.length * BANDS.length, `only ${cases} cases ran`);
  ok(kept === cases, `${cases - kept} careers started somewhere else, first: ${firstMiss.join('; ')}`);

  /* A stale or stray name is never honoured: it falls back to the draw, and
     the draw lands in the start year's list. */
  const early = ERAS.reduce((a, b) => (b.startYear < a.startYear ? b : a));
  const inEarly = new Set(yearList(early).map(c => c.name));
  const notYet = CLUBS.find(c => !inEarly.has(c.name));
  ok(!!notYet, `every club is in the ${early.startYear} list, so the founded later case cannot be built`);
  let strays = 0, landed = 0;
  for (const stray of ['No Such FC', notYet?.name].filter(Boolean)) {
    seedRandom(16049);
    for (const nat of NATIONS) for (const ovr of BANDS) {
      const s = begin(engine, nat, early, ovr, stray);
      strays += 1;
      if (s.academyClubName !== stray && inEarly.has(s.academyClubName) && s.currentClub === `${s.academyClubName} Youth`) landed += 1;
    }
  }
  console.log(`  ${landed} of ${strays} stray names (no such club, and ${notYet?.name} before it existed in ${early.startYear}) fell back to a club in the list`);
  ok(strays > 0 && landed === strays, `${strays - landed} stray names were honoured or left the list`);
}

head('2', 'OLD PATH: two independent draws, the way it was before this round');
{
  let cases = 0, agree = 0;
  const byBand = new Map(BANDS.map(b => [b, [0, 0]]));
  for (let seed = 1; seed <= SEEDS; seed++) {
    seedRandom(26040 + seed);
    for (const era of ERAS) for (const nat of NATIONS) for (const ovr of BANDS) {
      const shown = preview(era, nat, ovr);
      const s = begin(engine, nat, era, ovr);
      const hit = s.academyClubName === shown.name ? 1 : 0;
      cases += 1; agree += hit;
      const row = byBand.get(ovr); row[0] += hit; row[1] += 1;
    }
  }
  const rate = agree / cases;
  console.log(`  old path agreement ${agree} of ${cases} (${(100 * rate).toFixed(1)}%), by band: ${[...byBand].map(([b, [a, n]]) => `${b}: ${(100 * a / n).toFixed(1)}%`).join(', ')}`);
  ok(rate < AGREE_CEILING, `two independent draws agreed ${(100 * rate).toFixed(1)}% of the time, not under ${100 * AGREE_CEILING}%: the grid cannot see the defect`);
}

head('3', 'UNCHANGED: initCareer without a name is the base engine, byte for byte');
{
  /* The base half runs only when SC_ACADEMY_BASE names a commit (this round's
     gate sets the commit it was cut from, 4bd20c993). By default it is off:
     a later round that means to change a new career's opening state would
     otherwise go red here blaming this round, and a shallow clone has no
     merge base to read. The null and stray name halves below always run. */
  const baseRef = process.env.SC_ACADEMY_BASE || '';
  let baseSrc = null;
  if (!baseRef) console.log('  base half skipped (set SC_ACADEMY_BASE=<commit> to compare the default path with that engine)');
  else {
    try {
      baseSrc = execFileSync('git', ['show', `${baseRef}:src/lib/soccerCareerEngine.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }).replaceAll('\r\n', '\n');
    } catch (e) { fail(`no base engine to compare with (${baseRef}): ${e && e.message}`); }
  }
  const ownSrc = fs.readFileSync(path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), 'utf8').replaceAll('\r\n', '\n');
  let base = null;
  if (baseSrc !== null) {
    if (baseSrc === ownSrc) console.log(`  the base ${baseRef.slice(0, 9)} carries this very engine (the round is on main), so the base half compares it with itself`);
    try { base = (await bundleCareerSources({ root: ROOT, tmpDir, transforms: { 'lib/soccerCareerEngine.ts': () => baseSrc } })).engine; }
    catch (e) { fail(`the base engine ${baseRef.slice(0, 9)} did not bundle: ${e && e.message}`); }
  }
  const run = (eng, seed, nat, era, ovr, ...name) => {
    seedRandom(seed);
    const s = begin(eng, nat, era, ovr, ...name);
    return JSON.stringify(s) + `|${Math.random()}|${Math.random()}|${Math.random()}`;
  };
  let cases = 0, sameBase = 0, sameNull = 0, sameStray = 0;
  const firstMiss = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    for (const era of ERAS) for (const nat of NATIONS) for (const ovr of BANDS) {
      const s0 = 36040 + seed * 100000 + cases;
      const own = run(engine, s0, nat, era, ovr);
      cases += 1;
      if (base && run(base, s0, nat, era, ovr) === own) sameBase += 1; else if (base && firstMiss.length < 2) firstMiss.push(`${nat} ${era.value} ${ovr}`);
      if (run(engine, s0, nat, era, ovr, null) === own) sameNull += 1;
      if (run(engine, s0, nat, era, ovr, 'No Such FC') === own) sameStray += 1;
    }
  }
  if (base) console.log(`  ${sameBase} of ${cases} careers byte equal to the base engine ${baseRef.slice(0, 9)} (state and the next three draws)`);
  console.log(`  ${sameNull} of ${cases} equal with a null name, ${sameStray} of ${cases} with a name in no list`);
  ok(!base || sameBase === cases, `${cases - sameBase} careers differ from the base engine, first: ${firstMiss.join('; ')}`);
  ok(sameNull === cases && sameStray === cases, `a null or stray name changed ${cases - sameNull} and ${cases - sameStray} careers`);
}

finish();
