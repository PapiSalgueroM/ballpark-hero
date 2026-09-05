/**
 * Round 140 harness: boards talk like boards.
 *
 * The owner's review, 2026-08-16, verbatim where it matters: "in real life
 * Barca and no team is looking for top 2. There looking to win it all. And
 * teams like malagar or whatever arent looking to be top 20... So time teams
 * should be like win the league or get champions league football or Europa
 * league or conference league or finish mid table or dont get relegated."
 *
 * So this measures the DEMAND LADDER across every playable club in every
 * league, plus the grading of the three new objective shapes (points floor,
 * the double, market profit). Not "does it crash": the assertions are about
 * the distribution of demands over the real 196-club world and about grading
 * flipping at exactly the right table states.
 *
 * Round 145 second pass, owner review 2026-08-17: the title band now runs on
 * the measured XI gap (TITLE_GAP in clubManager.ts), so Sporting CP, Feyenoord
 * and Union Saint-Gilloise demand the title like their stature says, and every
 * positional parenthetical ("(top 4)") is gone from every label. Section 1b
 * pins the giants list directly to target 1.
 *
 * What would catch a real regression here:
 *  - a heavyweight told to finish second (the exact complaint)
 *  - any label containing the league size ("top 20" on a 20 team league)
 *  - a Europa or Conference band vanishing from a top five league
 *  - a relegation demand appearing in MLS, which cannot relegate anybody
 *  - a demand target a stronger club could not hit while a weaker one could
 *    (except a title demanded of a stature club, Round 399, see GIANTS)
 *  - the double grading "done" before both trophies are in the cabinet
 *
 * Run: node scripts/simBoardObjectives.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'boardsEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'boards.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`,
  { stdio: 'inherit' },
);

const { cm } = await import(pathToFileURL(BUNDLE).href);

/* The clubs whose boards demand the title on stature. Since Round 399 the
   engine holds the same list as TITLE_STATURE in src/lib/clubManager.ts;
   section 2 checks every one of them is asked for the title, and the
   monotone check below lets one of them out-demand a stronger squad, because
   that is exactly what stature means (Milan sits 2.73 behind Serie A's best
   eleven and its board still wants the league). */
const GIANTS = [
    'Arsenal', 'Manchester City', 'Liverpool', 'Chelsea',
    'Real Madrid', 'Barcelona',
    'Inter Milan', 'Juventus', 'AC Milan',
    'Bayern Munich', 'Borussia Dortmund',
    'PSG', 'Marseille',
    'PSV', 'Ajax', 'Feyenoord',
    'Porto', 'Benfica', 'Sporting CP',
    'Celtic', 'Rangers',
    'Galatasaray', 'Fenerbahçe',
    'Club Brugge', 'Genk', 'Union Saint-Gilloise',
  ];
const {
  REAL_LEAGUES, playableClubs, buildBoardObjectives, objectiveStatuses,
  startCareer, EURO_SLOTS,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---------- 1. Every club's ladder, across the whole world ---------- */
console.log('1) The demand ladder over all playable clubs');
{
  const bandCounts = {};
  let total = 0;
  for (const league of REAL_LEAGUES) {
    const size = league.clubs.length;
    const perLeague = {};
    const targets = [];
    for (const club of playableClubs(league.id)) {
      total += 1;
      const objs = buildBoardObjectives(club.name, false, size);
      const lg = objs.find(o => o.id === 'league');
      if (!lg) { fail(`${club.name} got no league demand at all`); continue; }

      // The exact complaint: a demand that names the league size is "finish
      // in the league", which is no demand at all.
      if (lg.label.includes(`top ${size}`)) fail(`${club.name}: "${lg.label}" names the whole league`);
      if (lg.target < 1 || lg.target > size) fail(`${club.name}: target ${lg.target} is outside the table`);
      // Boards demand competitions, so every label is words, not a bare rank.
      if (/^Finish top \d+$/i.test(lg.label)) fail(`${club.name}: "${lg.label}" is a bare rank, boards do not talk like that`);
      /* Round 145, his second pass on this screen: "stop with this top 20 or
         top 2 nonsense." No league demand may carry a positional phrase at
         all, not even as a parenthetical after the named prize. */
      if (/top \d+/i.test(lg.label)) fail(`${club.name}: "${lg.label}" still carries a positional phrase`);

      const key = lg.label.replace(/\d+/g, 'N');
      perLeague[key] = (perLeague[key] ?? 0) + 1;
      bandCounts[key] = (bandCounts[key] ?? 0) + 1;
      targets.push({ rank: club.expectation, target: lg.target, name: club.name });

      // MLS boards cannot threaten relegation. Nobody's board can demand it.
      if (league.id.startsWith('mls') && /releg/i.test(lg.label)) {
        fail(`${club.name}: an MLS board is talking about relegation`);
      }
    }

    // Monotone: a club the league rates stronger never has a WEAKER demand.
    targets.sort((a, b) => a.rank - b.rank);
    for (let i = 1; i < targets.length; i++) {
      /* Round 399: a stature club may be asked for more than a stronger
         squad. Nothing else may. */
      if (targets[i].target < targets[i - 1].target && !(targets[i].target === 1 && GIANTS.includes(targets[i].name))) {
        fail(`${league.name}: ${targets[i].name} (rank ${targets[i].rank}) is asked for top ${targets[i].target} while stronger ${targets[i - 1].name} is only asked for top ${targets[i - 1].target}`);
      }
    }

    const bands = Object.keys(perLeague);
    console.log(`   ${league.name}: ${bands.length} bands over ${playableClubs(league.id).length} clubs`);
    for (const [k, v] of Object.entries(perLeague)) console.log(`      ${v}x ${k}`);

    // Every top five league must speak the full ladder the owner listed.
    if (EURO_SLOTS[league.id] && ['premier', 'laliga', 'seriea', 'bundesliga', 'ligue1'].includes(league.id)) {
      for (const want of ['Win the', 'Champions League', 'Europa League', 'Conference League']) {
        if (!bands.some(b => b.includes(want))) fail(`${league.name} has no "${want}" band`);
      }
    }
    if (league.id === 'championship') {
      for (const want of ['promotion']) {
        if (!bands.some(b => b.toLowerCase().includes(want))) fail(`Championship has no ${want} band`);
      }
      if (bands.some(b => b.includes('Champions League'))) fail('the Championship is promising European football');
    }
    if (league.id === 'saudi' && !bands.some(b => b.includes('AFC'))) {
      fail('the Saudi Pro League has no AFC band');
    }
  }
  console.log(`   ${total} clubs graded, ${Object.keys(bandCounts).length} distinct demand shapes`);
  if (total < 150) fail(`only ${total} clubs graded, the world shrank`);
  if (Object.keys(bandCounts).length < 8) fail('the whole world shares a handful of demands, the ladder collapsed');
}

/* ---------- 1b. The giants all demand the title itself ---------- */
console.log('1b) Every league-relative giant is told to win it');
{
  /* Round 145, his words: "The second highest overall team dosent want to be
     top 2. They also want to win it. The same with 3rd place." These clubs
     all sit within the measured TITLE_GAP of their league's best XI (or in
     the top two ranks), so every one of them must carry a target 1 league
     demand. If this fails after a roster re-bake, re-measure the gap table
     (the TITLE_GAP comment in clubManager.ts says how) and retune, do not
     silently let a giant's board start asking for a Champions League spot. */
  /* And the sanity mirror: clubs miles off their league's top XI must NOT be
     told to win it, or the band stopped meaning anything. Measured gaps on
     2026-08-17: Aberdeen 13.7, Hearts 13.7, Basaksehir 11.1, Casa Pia deep
     in the primeira tail. Re-measured 2026-09-05 after Round 450 re-baked the
     rosters from the verified summer window: Roma's XI is 83.3, 2.20 behind
     Inter's 85.5 and inside the 2.5 band, so Roma's board demands the title
     by the engine's own rule and left this list; Fiorentina at 4.00 took the
     Serie A seat. Napoli 2.90, Atalanta 3.10, Tottenham 2.70 still sit
     outside. When a re-bake moves a club across the band, re-measure before
     touching the rule: this list is the mirror, not the law. */
  const NOT_TITLE = ['Aberdeen', 'Hearts', 'Başakşehir', 'Casa Pia', 'St Mirren', 'Kortrijk', 'Fiorentina', 'Napoli', 'Atalanta', 'Tottenham'];
  for (const name of GIANTS) {
    const league = REAL_LEAGUES.find(l => l.clubs.includes(name));
    if (!league) { fail(`${name} is in the giants list but not in any league`); continue; }
    const lg = buildBoardObjectives(name, false, league.clubs.length).find(o => o.id === 'league');
    if (!lg || lg.target !== 1) {
      fail(`${name}: a giant's board is asking for "${lg ? lg.label : 'nothing'}" instead of the title`);
    }
  }
  for (const name of NOT_TITLE) {
    const league = REAL_LEAGUES.find(l => l.clubs.includes(name));
    if (!league) { fail(`${name} is in the sanity list but not in any league`); continue; }
    const lg = buildBoardObjectives(name, false, league.clubs.length).find(o => o.id === 'league');
    if (lg && lg.target === 1) {
      fail(`${name} is being told to win the league from ${(lg && lg.label) || '?'}, the title band lost its meaning`);
    }
  }
  console.log(`   ${GIANTS.length} giants all demand the title, ${NOT_TITLE.length} outsiders correctly do not`);
}

/* ---------- 2. More wants than before, and varied ---------- */
console.log('2) Boards want more than a league position');
{
  const shapes = new Set();
  let withExtra = 0, checked = 0;
  for (const league of REAL_LEAGUES) {
    for (const club of playableClubs(league.id)) {
      const objs = buildBoardObjectives(club.name, false, league.clubs.length);
      checked += 1;
      for (const o of objs) shapes.add(o.id);
      if (objs.length >= 4) withExtra += 1;
      if (objs.length < 3) fail(`${club.name} got only ${objs.length} objectives`);
    }
  }
  console.log(`   shapes in use: ${[...shapes].sort().join(', ')}`);
  console.log(`   ${withExtra}/${checked} clubs carry 4+ objectives`);
  for (const want of ['league', 'cup', 'rival', 'points', 'double', 'netSpend', 'youth']) {
    if (!shapes.has(want)) fail(`no club anywhere got a "${want}" objective, the shape is dead code`);
  }
}

/* ---------- 3. Grading flips exactly where it should ---------- */
console.log('3) The new shapes grade correctly');
{
  // A live career to doctor. Everton: tier 3, so it can carry netSpend.
  const base = startCareer('Everton');

  const withObj = (career, obj) => ({ ...career, boardObjectives: [obj] });
  const statusOf = (career, obj) => objectiveStatuses(withObj(career, obj))[0].status;

  // points: a floor on pace.
  const pts = { id: 'points', target: 60, label: 'Bank 60+ league points' };
  const table = clubPts => base.table.map(r => r.club === 'Everton' ? { ...r, w: 10, d: 0, l: 0, pts: clubPts } : r);
  const early = { ...base, table: table(30), week: 10 };
  if (statusOf(early, pts) !== 'onTrack') fail('30 points from 10 games is title pace and graded ' + statusOf(early, pts));
  const slow = { ...base, table: table(8), week: 10 };
  if (statusOf(slow, pts) !== 'behind') fail('8 points from 10 games is relegation form and graded ' + statusOf(slow, pts));
  const doneState = { ...base, table: table(61), week: base.calendar.length };
  if (statusOf(doneState, pts) !== 'done') fail('61 points at season end misses a 60 point floor?');
  const failedState = { ...base, table: table(41), week: base.calendar.length };
  if (statusOf(failedState, pts) !== 'failed') fail('41 points at season end passes a 60 point floor?');

  // double: both or nothing.
  const dbl = { id: 'double', target: 0, label: 'Win the double' };
  const topOfTable = base.table.map(r => r.club === 'Everton' ? { ...r, w: 30, pts: 90 } : { ...r, pts: 40 });
  const cupOut = { ...base, table: topOfTable, cupRound: 'out', cupExit: 'QF' };
  if (statusOf(cupOut, dbl) !== 'failed') fail('cup exit still counts as a live double');
  const bothWon = { ...base, table: topOfTable, cupRound: 'won', week: base.calendar.length };
  if (statusOf(bothWon, dbl) !== 'done') fail('league won plus cup won does not grade the double as done');
  const cupOnly = { ...base, table: base.table.map(r => r.club === 'Everton' ? { ...r, pts: 10 } : { ...r, pts: 70 }), cupRound: 'won', week: base.calendar.length };
  if (statusOf(cupOnly, dbl) !== 'failed') fail('cup alone at season end still grades the double as done');

  // netSpend: sell side of the ledger.
  const ns = { id: 'netSpend', target: 0, label: 'Turn a profit in the transfer market' };
  const selling = { ...base, seasonSignings: [{ dir: 'out', name: 'A', fee: 30 }, { dir: 'in', name: 'B', fee: 12 }] };
  if (statusOf(selling, ns) !== 'onTrack') fail('plus 18m in the market grades as ' + statusOf(selling, ns));
  const splurge = { ...base, seasonSignings: [{ dir: 'in', name: 'B', fee: 40 }], week: base.calendar.length };
  if (statusOf(splurge, ns) !== 'failed') fail('minus 40m at season end still passes a profit demand');
}

/* ---------- 4. The words themselves ---------- */
console.log('4) Copy rules hold in every label');
{
  let labels = 0;
  for (const league of REAL_LEAGUES) {
    for (const club of playableClubs(league.id)) {
      for (const o of buildBoardObjectives(club.name, true, league.clubs.length)) {
        labels += 1;
        if (/[–—]/.test(o.label)) fail(`em or en dash in "${o.label}"`);
        if (o.label.length > 70) fail(`label is a paragraph: "${o.label}"`);
        // Round 145: the positional-phrase ban covers EVERY objective label,
        // so "(top 4)" can never ride back in on a cup or euro want either.
        if (/top \d+/i.test(o.label)) fail(`positional phrase in "${o.label}"`);
      }
    }
  }
  console.log(`   ${labels} labels checked`);
}

console.log('');
if (failures > 0) {
  console.error(`simBoardObjectives: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simBoardObjectives: green. Every board talks like a board.');
