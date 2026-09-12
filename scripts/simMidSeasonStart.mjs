/**
 * Round 549: taking a club over part way through a season.
 *
 * WHY THIS EXISTS. A player asked for it on 2026-09-11: "add live start points
 * to manager career: take over a club mid season for example leicester in 15/16
 * midway thru".
 *
 * WHAT IT IS, AND THE LINE IT MUST NOT CROSS. The season is played forward
 * before the handover, by the engine, through the real match engine rather than
 * a lighter model, so the table, the form, the injuries, the fitness, the
 * money, the cup run and the European campaign are genuine consequences of
 * matches that were actually played. It is NOT history. This game's fixture
 * list is a per save shuffle over its own synthetic calendar, so the real
 * 2015-16 run of results cannot be reproduced here, and a simulated Leicester
 * lands mid table rather than top. Typing the real table instead would be
 * asserting history the repo cannot two source verify, which is exactly what
 * the data rules exist to stop. So the feature ships with the claim it can
 * actually support, and section 5 holds the copy to it.
 *
 * WHAT THIS HOLDS:
 *   1. The run-in really happened. Every entry point lands further into the
 *      calendar than the one before it, the club has played real matches, and
 *      the league table has the points to show for them. A "mid season start"
 *      that quietly began at week zero would look identical on the hub.
 *   2. The whole world moved, not just my club. Every other league is as far
 *      through its own season as I am through mine, which is the invariant
 *      syncWorld exists to keep and the thing a hand seeded table would break.
 *   3. THE HANDOVER IS CLEAN. This is the load bearing one. Nothing belonging
 *      to the manager before you follows you in: you are not sacked on arrival,
 *      you inherit no pending approach or agreed move, the board's opinion is a
 *      new appointment's rather than the one they had formed of somebody else,
 *      and your own progression starts now rather than crediting you with
 *      matches you never picked a team for.
 *   4. It terminates. The loop calls a simulator until a number goes up, which
 *      is the shape that hangs a page, so it is measured for time and for
 *      actually reaching its target across every era and entry point.
 *   5. The save says what it is. midSeasonStart is recorded, and the shipped
 *      copy calls the run-in simulated rather than implying it is the real one.
 *
 * NEGATIVE CONTROL: MIDSEASON_CONTROL=dirty skips the handover tidy-up inside
 * the bundle, which is what a first version of this would have done, and
 * section 3 must go red.
 *
 * Run: node scripts/simMidSeasonStart.mjs      (no database)
 */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CONTROL = process.env.MIDSEASON_CONTROL || '';
const KNOWN_CONTROLS = ['dirty'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`MIDSEASON_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const ENTRY = path.join(os.tmpdir(), 'midSeasonEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'midSeason.bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const cm = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
const cal = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManagerCalendar.ts');
export const engine = { ...cm, ...cal };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

if (CONTROL === 'dirty') {
  const text = fs.readFileSync(BUNDLE, 'utf8');
  /* Hand the club over exactly as the run-in left it, which is what a version
     that forgot the previous manager was a different person would do. */
  const re = /(\n\s*sacked: false,\n\s*approach: null,\n\s*pendingMove: null,\n\s*wilderness: null,)/;
  if (!re.test(text)) {
    console.error('CONTROL dirty cannot find the handover tidy-up in the bundle, so it would change nothing');
    process.exit(1);
  }
  const mutated = text.replace(re, '\n');
  if (mutated === text) { console.error('CONTROL dirty changed nothing'); process.exit(1); }
  fs.writeFileSync(BUNDLE, mutated);
  console.log('   NEGATIVE CONTROL ON: the handover tidy-up skipped, section 3 must go red');
}

const cm = (await import(pathToFileURL(BUNDLE).href)).engine;
const { startCareer, startMidSeason, MIDSEASON_ENTRY, sortedLeagueTable, worldLeagueDefs, careerLeagueOf, leagueRounds } = cm;

const ENTRIES = ['autumn', 'newYear', 'runIn'];
const CASES = [
  { club: 'Leicester City', era: 'era2015', label: 'Leicester 2015-16' },
  { club: 'Real Madrid', era: undefined, label: 'Real Madrid 2026-27' },
  { club: 'Celtic', era: undefined, label: 'Celtic 2026-27' },
];

const runs = [];
for (const c of CASES) {
  for (const entry of ENTRIES) {
    const fresh = startCareer(c.club, c.era);
    const t0 = Date.now();
    const state = startMidSeason(fresh, entry);
    runs.push({ ...c, entry, fresh, state, ms: Date.now() - t0 });
  }
}
console.log(`\n${runs.length} takeovers across ${CASES.length} clubs and ${ENTRIES.length} entry points.`);

/* ------------------------------------------------------------------ */
console.log('1) The run-in really happened');
{
  const before = failures;
  for (const c of CASES) {
    const mine = runs.filter(r => r.club === c.club);
    let lastWeek = 0;
    for (const r of mine) {
      if (r.state.week <= 0) { fail(`${c.label} ${r.entry}: the career is still at week 0, so nothing was played`); continue; }
      if (r.state.week <= lastWeek) fail(`${c.label} ${r.entry}: week ${r.state.week} is not further in than the previous entry point's ${lastWeek}`);
      lastWeek = r.state.week;
      const row = sortedLeagueTable(r.state).find(x => x.club === r.state.clubName);
      if (!row) { fail(`${c.label} ${r.entry}: my club is not in its own league table`); continue; }
      const played = row.w + row.d + row.l;
      if (played < 3) fail(`${c.label} ${r.entry}: only ${played} league matches played by week ${r.state.week}`);
      if (row.pts !== row.w * 3 + row.d) fail(`${c.label} ${r.entry}: ${row.pts} points does not match ${row.w}W ${row.d}D`);
      /* A table with matches played and nothing else moved would be a seeded
         table rather than a played one. */
      if (row.gf === 0 && row.ga === 0 && played > 4) fail(`${c.label} ${r.entry}: ${played} matches played and not one goal scored or conceded either way`);
    }
  }
  if (failures === before) console.log(`   every entry point deeper than the last, real matches and real points behind each`);
}

/* ------------------------------------------------------------------ */
console.log('2) The whole world moved, not just my club');
{
  const before = failures;
  for (const r of runs) {
    const myLeague = careerLeagueOf(r.state);
    const myTotal = leagueRounds(myLeague.clubs.length);
    const myPlayed = r.state.calendar.slice(0, r.state.week).filter(e => e.type === 'league').length;
    const frac = myPlayed / myTotal;
    let checked = 0;
    for (const lg of worldLeagueDefs(r.state)) {
      const w = r.state.world?.[lg.id];
      if (!w) continue;
      checked += 1;
      const theirFrac = w.round / leagueRounds(lg.clubs.length);
      if (Math.abs(theirFrac - frac) > 0.12) {
        fail(`${r.label} ${r.entry}: ${lg.id} is ${(theirFrac * 100).toFixed(0)}% through its season where I am ${(frac * 100).toFixed(0)}% through mine`);
        break;
      }
    }
    /* Not an absolute count: a historic era's world is its own league set and
       2015-16 runs far fewer than the modern one, so the bar is that EVERY
       league the save models carries a table, whatever that number is. */
    const modelled = worldLeagueDefs(r.state).filter(lg => lg.id !== myLeague.id).length;
    if (checked < modelled) {
      fail(`${r.label} ${r.entry}: ${checked} of ${modelled} other leagues carry a table`);
      break;
    }
    if (modelled < 1) { fail(`${r.label} ${r.entry}: the save models no other leagues at all`); break; }
  }
  if (failures === before) console.log('   every other league is as far through its own season as I am through mine');
}

/* ------------------------------------------------------------------ */
console.log('3) The handover is clean: nothing of the last manager follows you in');
{
  const before = failures;
  for (const r of runs) {
    if (r.state.sacked) fail(`${r.label} ${r.entry}: the career arrives already sacked`);
    if (r.state.approach) fail(`${r.label} ${r.entry}: you inherit an approach from another club that was made to somebody else`);
    if (r.state.pendingMove) fail(`${r.label} ${r.entry}: you inherit a pre-agreed move somebody else shook hands on`);
    if (r.state.wilderness) fail(`${r.label} ${r.entry}: the career arrives out of work`);
    if (r.state.boardConfidence !== 62) {
      fail(`${r.label} ${r.entry}: board confidence is ${r.state.boardConfidence}, which is the opinion they formed of the last manager rather than a new appointment's`);
    }
    /* Your own progression starts now: the run-in was not your work. */
    const a = JSON.stringify(r.state.managerXp ?? null);
    const b = JSON.stringify(r.fresh.managerXp ?? null);
    if (a !== b) fail(`${r.label} ${r.entry}: the manager progression carries the run-in, crediting you with matches you never picked a team for`);
    const inboxA = (r.state.inbox ?? []).length;
    const inboxB = (r.fresh.inbox ?? []).length;
    if (inboxA !== inboxB) fail(`${r.label} ${r.entry}: you inherit ${inboxA - inboxB} message(s) addressed to the manager before you`);
  }
  if (failures === before) console.log(`   ${runs.length} handovers, all clean`);
}

/* ------------------------------------------------------------------ */
console.log('4) It terminates, and it reaches where it said it would');
{
  const before = failures;
  const slowest = runs.reduce((a, r) => (r.ms > a.ms ? r : a), runs[0]);
  if (slowest.ms > 4000) fail(`the slowest takeover took ${slowest.ms}ms (${slowest.label} ${slowest.entry}), which is long enough to look like a hang`);
  for (const r of runs) {
    const total = r.state.calendar.length;
    const want = Math.max(1, Math.min(total - 3, Math.round(total * MIDSEASON_ENTRY[r.entry].fraction)));
    if (r.state.week < want - 2) fail(`${r.label} ${r.entry}: stopped at week ${r.state.week} of a ${want} target`);
    if (r.state.week >= total) fail(`${r.label} ${r.entry}: ran the season out entirely, leaving nothing to manage`);
  }
  if (failures === before) console.log(`   slowest ${slowest.ms}ms (${slowest.label} ${slowest.entry}), every run reached its target with a season left to play`);
}

/* ------------------------------------------------------------------ */
console.log('5) The save and the copy both say the run-in was simulated');
{
  const before = failures;
  for (const r of runs) {
    if (r.state.midSeasonStart !== r.entry) fail(`${r.label} ${r.entry}: the save records midSeasonStart as ${r.state.midSeasonStart ?? 'nothing'}`);
  }
  if (startCareer('Real Madrid').midSeasonStart) fail('an ordinary summer start is marked as a mid season takeover');
  /* The claim in the shipped copy has to be the one the feature can support.
     A guard that reads the code and not the comments: strip the block comments
     before matching, per the house rule. */
  const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const form = strip(fs.readFileSync(path.join(ROOT, 'src/components/club-manager/ManagerForm.tsx'), 'utf8'));
  if (!/simulated run-in, not the real one/i.test(form)) {
    fail('the dugout screen does not tell the player the run-in is simulated rather than the real season');
  }
  /* Affirmative claims only. A first version of this matched the bare phrase
     "real results" and went red on the screen's own DENIAL of it ("nobody's
     real results can be replayed here"), which would have pushed whoever hit it
     into weakening the honest sentence to get a harness green. Each pattern
     below can only match a claim being made. */
  for (const claim of [
    /the real \d{4}-\d{2} (season|table|results|run)/i,
    /exactly as it happened/i,
    /these are the real results/i,
    /replays? the real season/i,
  ]) {
    if (claim.test(form)) fail(`the dugout screen makes a historical claim this feature cannot support: ${claim}`);
  }
  const hub = strip(fs.readFileSync(path.join(ROOT, 'src/pages/ClubManager.tsx'), 'utf8'));
  if (!/run-in simulated/i.test(hub)) fail('the hub does not carry the mid season badge, so the framing is lost once the picker is gone');
  if (failures === before) console.log('   the save records it, the dugout says simulated, the hub keeps saying it');
}

/* ------------------------------------------------------------------ */
if (CONTROL === 'dirty') {
  if (failures > 0) { console.log('\n   CONTROL FIRED: the untidied handover was caught'); process.exit(0); }
  console.error('\n   CONTROL DID NOT FIRE: the harness cannot see the previous manager following you in');
  process.exit(1);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsimMidSeasonStart: all green');
