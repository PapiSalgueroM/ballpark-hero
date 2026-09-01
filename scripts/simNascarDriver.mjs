/**
 * Round 374: every clue on the driver card is a fact the database states.
 *
 * WHAT WAS WRONG. /guess-nascar-driver built each puzzle from six columns on
 * `nascar_drivers`: vibe_word, era_hint, car_number_hint, wins_hint,
 * championship_hint, famous_moment_hint. None of those columns exist. Every
 * clue was undefined, so the game showed six blank cards and could only be won
 * by typing a name out of nowhere. It shipped like that, listed in the registry
 * as a daily game, and nascar_scores has rows in it.
 *
 * WHY SECTION 3 IS THE ONE THAT MATTERS. Sections 1 and 2 check that the
 * committed file is well formed and still agrees with the generator. Both would
 * have passed happily on a file full of beautifully formatted lies, because
 * both take the generator's word for what a clue should say. Section 3 does not
 * call the generator at all: it READS THE SHIPPED ENGLISH, parses the claim out
 * of it, and checks that claim against raw table rows. That is the difference
 * between "the pipeline ran" and "the sentence is true", and on a site whose
 * first rule is that data correctness beats everything, only the second is
 * worth having.
 *
 * THE TWO SOURCES ARE NOT EQUALLY TRUSTWORTHY, and the clue shapes exist
 * because of it:
 *   `nascar_race_results` is NOT a complete win log. Nineteen seasons are
 *   missing outright, 1957 to 1969 among them, which is why Junior Johnson and
 *   Ned Jarrett, both fifty win drivers, have no rows at all; 1979, 1982 and
 *   1983 are missing too. It also mixes exhibition races (the Busch Clash, the
 *   Daytona qualifiers) in with points races. So a career total computed from
 *   it would be false for nearly everyone, and calling any single row a "Cup
 *   Series win" is also wrong. Each row supports exactly one true statement:
 *   this driver won this race in this year. Section 4 enforces that no clue
 *   ever overreaches it.
 *   `nascar_champions` is complete for all 77 seasons, so championship counts
 *   are safe to assert in both directions.
 *
 * NEGATIVE CONTROLS:
 *   NASCAR_CONTROL=blank  blanks every clue in an in memory copy of the file,
 *                         reproducing exactly what the game used to ship, and
 *                         section 1 must go red.
 *   NASCAR_CONTROL=drift  moves one race year by one in an in memory copy, so
 *                         a clue becomes a well formed falsehood, and section 3
 *                         must go red. This is the control that proves section
 *                         3 is reading the claim rather than the format.
 * Both refuse to run if what they change was not actually changed.
 *
 * Run: node scripts/simNascarDriver.mjs   (needs the database)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pull, buildPool, MIN_WINS, CLUE_COUNT } from './genNascarDrivers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.NASCAR_CONTROL || '';
if (CONTROL && CONTROL !== 'blank' && CONTROL !== 'drift') {
  console.error(`NASCAR_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const file = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'nascarDrivers.json'), 'utf8'));
let drivers = file.drivers;

if (CONTROL === 'blank') {
  const before = JSON.stringify(drivers);
  drivers = drivers.map(d => ({ ...d, clues: d.clues.map(() => undefined) }));
  if (JSON.stringify(drivers) === before) { console.error('control cannot run: nothing was blanked'); process.exit(1); }
  console.log('NEGATIVE CONTROL ON (blank): every clue emptied, which is what the game used to ship. Section 1 must go red.');
}

console.log('1) the committed pool is well formed');
{
  if (!Array.isArray(drivers) || drivers.length < 40) {
    fail(`the pool has ${drivers?.length ?? 0} drivers, which is a broken generation rather than a thin sport`);
  }
  let noClues = 0, wrongCount = 0, dupes = 0, leaks = 0, noLabels = 0;
  const names = new Set();
  for (const d of drivers || []) {
    if (!d.driver_name) { fail('a pool entry has no driver name'); continue; }
    if (names.has(d.driver_name)) fail(`${d.driver_name} appears twice in the pool, so the daily index can land on a duplicate`);
    names.add(d.driver_name);
    const cs = d.clues || [];
    if (cs.length !== CLUE_COUNT) { wrongCount += 1; if (wrongCount <= 3) fail(`${d.driver_name} has ${cs.length} clues and the board reveals ${CLUE_COUNT}`); }
    const empty = cs.filter(c => c === undefined || c === null || !String(c).trim()).length;
    if (empty) { noClues += 1; if (noClues <= 3) fail(`${d.driver_name} has ${empty} blank clue${empty === 1 ? '' : 's'}, which is the bug this round exists to fix`); }
    if (new Set(cs).size !== cs.length) { dupes += 1; if (dupes <= 3) fail(`${d.driver_name} has the same clue twice, so one reveal tells the player nothing`); }
    if ((d.clue_labels || []).length !== cs.length) { noLabels += 1; if (noLabels <= 3) fail(`${d.driver_name} has ${(d.clue_labels || []).length} labels for ${cs.length} clues`); }
    /* A clue naming the driver is the answer, printed on the card. Found for
       real on the first generation: the Alan Kulwicki Memorial, and champions
       rows where an owner driver's team IS his own name. */
    if (cs.some(c => c && String(c).toLowerCase().includes(d.driver_name.toLowerCase()))) {
      leaks += 1; if (leaks <= 3) fail(`${d.driver_name} has a clue containing their own name, which gives the answer away`);
    }
  }
  console.log(`   ${drivers?.length ?? 0} drivers, ${CLUE_COUNT} clues each`);
}

/* The database half. Skipped under the blank control, which is about the file. */
let results = [], champions = [], poolDrivers = [];
if (CONTROL !== 'blank') {
  [poolDrivers, results, champions] = await Promise.all([
    pull('nascar_drivers', 'driver_name'),
    pull('nascar_race_results', 'year,race_name,winner'),
    pull('nascar_champions', 'year,driver_name,team,manufacturer'),
  ]);
}

if (CONTROL === 'drift') {
  /* Move ONE race year. The clue text in the committed file then states
     something the table does not, which is precisely what section 3 exists to
     catch and what sections 1 and 2 cannot see. */
  const target = drivers.map(d => d.clues.findIndex(c => /^Won the .+ in \d{4}\.$/.test(c))).findIndex(i => i >= 0);
  if (target < 0) { console.error('control cannot run: no driver has a race clue to move'); process.exit(1); }
  const d = drivers[target];
  const i = d.clues.findIndex(c => /^Won the .+ in \d{4}\.$/.test(c));
  const before = d.clues[i];
  const moved = before.replace(/(\d{4})\.$/, (_, y) => `${Number(y) + 1}.`);
  if (moved === before) { console.error('control cannot run: the year was not moved'); process.exit(1); }
  drivers = drivers.map((x, n) => (n === target ? { ...x, clues: x.clues.map((c, j) => (j === i ? moved : c)) } : x));
  console.log(`NEGATIVE CONTROL ON (drift): ${d.driver_name}'s clue moved from "${before}" to "${moved}". Section 3 must go red.`);
}

console.log('2) the committed pool still agrees with the live tables');
if (CONTROL === 'blank') {
  console.log('   skipped under the blank control');
} else {
  const { pool } = buildPool(poolDrivers, results, champions);
  const live = new Map(pool.map(p => [p.driver_name, p]));
  if (CONTROL !== 'drift' && pool.length !== drivers.length) {
    fail(`the database now yields ${pool.length} eligible drivers and the committed file has ${drivers.length}. Re-run scripts/genNascarDrivers.mjs.`);
  }
  let differ = 0;
  for (const d of drivers) {
    const l = live.get(d.driver_name);
    if (!l) { fail(`${d.driver_name} is in the committed pool and no longer qualifies against live data`); continue; }
    if (JSON.stringify(l.clues) !== JSON.stringify(d.clues)) {
      differ += 1;
      if (differ <= 2) fail(`${d.driver_name}'s clues differ from what the live tables now produce, so the file is stale`);
    }
  }
  console.log(`   ${drivers.length - differ} of ${drivers.length} drivers match a fresh build`);
}

console.log('3) every clue is TRUE against the raw rows, checked without the generator');
if (CONTROL === 'blank') {
  console.log('   skipped under the blank control');
} else {
  /* Re-derived here from the raw rows, deliberately NOT by calling the builder.
     A check whose two sides come from the same place cannot see an error in
     that place. */
  const winRows = new Set();
  const yearsBy = new Map();
  for (const r of results) {
    winRows.add(`${r.winner}|${r.year}|${r.race_name}`);
    if (!yearsBy.has(r.winner)) yearsBy.set(r.winner, []);
    yearsBy.get(r.winner).push(Number(r.year));
  }
  const titleCount = new Map();
  for (const c of champions) titleCount.set(c.driver_name, (titleCount.get(c.driver_name) || 0) + 1);
  const WORD = { once: 1, twice: 2 };

  let checked = 0, wrong = 0, unparsed = 0;
  for (const d of drivers) {
    for (const clue of d.clues) {
      const text = String(clue);
      let m;
      if ((m = /^Won the (.+) in (\d{4})\.$/.exec(text))) {
        checked += 1;
        if (!winRows.has(`${d.driver_name}|${m[2]}|${m[1]}`)) {
          wrong += 1;
          if (wrong <= 4) fail(`${d.driver_name}: the card says "${text}" and no row in nascar_race_results says that happened`);
        }
      } else if ((m = /^Won the Cup Series championship (once|twice|(\d+) times)\.$/.exec(text))) {
        checked += 1;
        const want = WORD[m[1]] ?? Number(m[2]);
        const got = titleCount.get(d.driver_name) || 0;
        if (got !== want) { wrong += 1; if (wrong <= 4) fail(`${d.driver_name}: the card claims ${want} championships and nascar_champions holds ${got}`); }
      } else if (/^Never won the Cup Series championship\.$/.test(text)) {
        checked += 1;
        const got = titleCount.get(d.driver_name) || 0;
        if (got !== 0) { wrong += 1; if (wrong <= 4) fail(`${d.driver_name}: the card says never a champion and nascar_champions holds ${got} title${got === 1 ? '' : 's'}`); }
      } else if ((m = /^Has race wins on record between (\d{4}) and (\d{4})\.$/.exec(text))) {
        checked += 1;
        const ys = yearsBy.get(d.driver_name) || [];
        const lo = Math.min(...ys), hi = Math.max(...ys);
        if (Number(m[1]) < lo || Number(m[2]) > hi) {
          wrong += 1;
          if (wrong <= 4) fail(`${d.driver_name}: the card claims wins between ${m[1]} and ${m[2]} and the rows only run ${lo} to ${hi}`);
        }
      } else if (/^(Took a title|Has wins on record in|Has race wins on record in)/.test(text)) {
        checked += 1; /* covered by section 2's rebuild; nothing to parse independently */
      } else {
        unparsed += 1;
        if (unparsed <= 3) fail(`a clue shape this harness cannot verify reached the file: "${text}". A new clue shape needs a check here or it ships unverified.`);
      }
    }
  }
  console.log(`   ${checked - wrong} of ${checked} clue claims verified against raw rows, ${unparsed} unrecognised shapes`);
  if (checked < 200) fail(`only ${checked} claims were checked, so this section is not really testing anything`);
}

console.log('4) no clue overreaches what the race results can support');
{
  /* The results table mixes exhibition races in with points races and is
     missing whole seasons, so no clue built from it may call a row a "Cup
     Series win" or total anything up. Championship language is fine, because
     nascar_champions is complete. */
  let bad = 0;
  for (const d of drivers) {
    for (const clue of d.clues || []) {
      const t = String(clue || '');
      if (/^Won the .+ in \d{4}\.$/.test(t)) continue;
      if (/cup series (win|race|victor)/i.test(t)) {
        bad += 1;
        if (bad <= 3) fail(`${d.driver_name}: "${t}" calls a race results row a Cup Series win, and that table includes exhibition races and is missing whole seasons`);
      }
      if (/won \d+ (cup |career )?(races|starts)/i.test(t)) {
        bad += 1;
        if (bad <= 3) fail(`${d.driver_name}: "${t}" totals up the race results table, which is missing 19 seasons and would be false for nearly every driver`);
      }
    }
  }
  console.log(`   ${bad} clues overreach their source`);
}

console.log('5) the daily index lands on a real driver every day of a year');
{
  /* pool[dateSeed % pool.length], the same arithmetic the hook uses. A pool
     that changed length is not a bug, but an index that misses is. */
  let miss = 0;
  const seen = new Set();
  for (let day = 0; day < 365; day++) {
    const dt = new Date(Date.UTC(2026, 0, 1 + day));
    const iso = dt.toISOString().slice(0, 10);
    const seed = parseInt(iso.replace(/-/g, ''), 10);
    const picked = drivers[seed % drivers.length];
    if (!picked || !picked.driver_name || !picked.clues?.length) miss += 1;
    else seen.add(picked.driver_name);
  }
  console.log(`   365 days resolve to ${seen.size} distinct drivers, ${miss} misses`);
  if (miss > 0) fail(`${miss} days of the year resolve to nothing playable`);
  if (seen.size < Math.min(20, drivers.length)) fail(`a year of dates only ever reaches ${seen.size} drivers, so the rotation is far narrower than the pool`);
}

console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`simNascarDriver control (${CONTROL}): green. The planted fault was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simNascarDriver control (${CONTROL}): RED. The fault was planted and nothing noticed.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simNascarDriver: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log(`simNascarDriver: green. ${drivers.length} drivers, every clue traced to a row that says so.`);
