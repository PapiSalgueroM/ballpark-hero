/* No zero facts: a number the database does not have must never reach a screen
   as though it did.

   Round 443. The owner's report: "in the who am i game u have rodris age listed
   as zero and his value as zero". A zero age is not a wrong number, it is a
   MISSING one printed as a fact, which is the same class of defect as an
   invented stat. This harness runs the REAL pool builders against the REAL
   tables and the REAL render rules, and fails when a game states something the
   row behind it does not carry.

   What it found on the day it was written, all measured, none of it theoretical:

     Footle    1,375 of 1,507 pool players carried kit number 0, the file's
               "unknown" sentinel, including Vinicius Junior and the entire
               1,200-player insane tier. The board printed that 0 in the KIT #
               tile, and compareGuess painted it GREEN whenever the guess was
               also unknown, telling the player they had matched a squad number
               nobody on either side has. It also drew a higher/lower arrow
               pointing at that zero.
     /career   173 season rows across 8 real players (Cruyff, Baggio, Platini,
               Shearer, Robbie Keane, Anelka, van der Sar, Schmeichel) have a
               null assists column, and the AST cell rendered String(null), so
               the board printed the literal word "null". Six more rows carry
               market_value 0 (Vardy at Stocksbridge Park Steels, Inzaghi at
               Leffe: non-league seasons with no valuation on file) and the
               VALUE cell printed "$0M", which claims a valuation of nothing.
     Who Am I  a current row whose age column is missing was thrown away whole,
               so an active player came back as club "Retired" with no age and
               no value, scored as if he were worth a dollar. Carlos Bello
               (Monagas SC, 2025) is the live example and Rodri was the one the
               owner hit, when he had no 2025 or 2026 row at all.
     Who Am I  the boot pulled every current row on the planet (11,910 rows,
               2,054 KiB over 20 requests, 1,947 ms) to keep 500 of them,
               because one fetch was serving both the pool and a guess
               resolver. After: 10 requests, 446 KiB, 978 ms.

   Sections 1 to 3 are the correctness half, section 4 is the weight half.

   Network. Live database, no stubs. Identical GET URLs are answered from a
   memo after the first live fetch so the four sections can share one boot; the
   first answer for every URL is the real database. If the database is
   unreachable the run says SUPABASE UNREACHABLE. NOTHING WAS CHECKED. and
   exits 1 rather than reporting green on nothing.

   Negative controls (house rule: each must reproduce the defect that was
   fixed, and each asserts it found the text it rewrites before it runs):
     SIM_NO_ZERO_FACTS_CONTROL=kitmatch    gives gameLogic back the plain
       numeric compare for kit numbers. Section 1 must go red with a real pair.
     SIM_NO_ZERO_FACTS_CONTROL=nullassist  gives the career board back
       String(assists) and $marketValueM. Section 2 must go red naming a real
       player and a real season.
     SIM_NO_ZERO_FACTS_CONTROL=zeroage     puts the age filter back on the Who
       Am I guess resolver. Section 3 must go red naming Carlos Bello.
     SIM_NO_ZERO_FACTS_CONTROL=fullfetch   lets the boot sweep the whole
       current season again. Section 4 must go red on requests and bytes.

   Run: node scripts/simNoZeroFacts.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROLS = ['kitmatch', 'nullassist', 'zeroage', 'fullfetch'];
const CONTROL = process.env.SIM_NO_ZERO_FACTS_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`SIM_NO_ZERO_FACTS_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0, 3: 0, 4: 0 };
const fail = m => { failures += 1; bySection[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

/* A worktree checks out CRLF and every anchor below is written LF, so a raw
   match would silently find nothing and the control would sit green for the
   wrong reason. Normalise before matching, the way simClubManagerBudget does. */
const readLf = p => fs.readFileSync(p, 'utf8').replaceAll('\r\n', '\n');

/* Controls rewrite a copy in the temp directory and esbuild is pointed at the
   copy for that one module, so nothing in the worktree is ever touched. */
const aliases = [];
function control(relative, alias, fixed, broken, note) {
  const file = path.join(ROOT, relative);
  const src = readLf(file);
  if (!src.includes(fixed)) {
    abort(`control cannot run: ${relative} is not in the shape SIM_NO_ZERO_FACTS_CONTROL=${CONTROL} rewrites`);
  }
  const copy = `${TMP}/noZeroFacts.${CONTROL}.${path.basename(relative)}`;
  fs.writeFileSync(copy, src.replace(fixed, broken));
  aliases.push(`--alias:${alias}=${copy}`);
  console.log('NEGATIVE CONTROL ON: ' + note);
}

if (CONTROL === 'kitmatch') {
  control(
    'src/lib/gameLogic.ts', '@/lib/gameLogic',
    '      kitNumber: compareKitNumber(guess.kitNumber, target.kitNumber),',
    '      kitNumber: compareNumeric(guess.kitNumber ?? 0, target.kitNumber ?? 0, 3),',
    'the kit tile compares unknown squad numbers as plain zeros again',
  );
}
if (CONTROL === 'nullassist') {
  control(
    'src/lib/careerBoardCells.ts', '@/lib/careerBoardCells',
    "    case 'assists':\n      return season.assists == null ? UNKNOWN : String(season.assists);",
    "    case 'assists':\n      return String(season.assists);",
    'the career board prints the assists column straight again',
  );
}
if (CONTROL === 'zeroage') {
  control(
    'src/lib/whoAmI.ts', '@/lib/whoAmI',
    "      .in('year', CURRENT_YEARS_LIST)\n      .order('year', { ascending: false })",
    "      .in('year', CURRENT_YEARS_LIST)\n      .gt('age', 0)\n      .order('year', { ascending: false })",
    'the guess resolver refuses a current row whose age column is empty again',
  );
}
if (CONTROL === 'fullfetch') {
  control(
    'src/lib/whoAmI.ts', '@/lib/whoAmI',
    'const POOL_FETCH_ROWS = 1000;',
    'const POOL_FETCH_ROWS = 12000;',
    'the boot sweeps the whole current season again instead of the pool',
  );
}

const ENTRY = `${TMP}/noZeroFacts.entry.mjs`;
const BUNDLE = `${TMP}/noZeroFacts.bundle.mjs`;
fs.writeFileSync(ENTRY, `
export * as footle from '@/lib/fetchFootlePlayerPool';
export * as logic from '@/lib/gameLogic';
export * as careerFetch from '@/lib/fetchCareerPlayers';
export * as careerCells from '@/lib/careerBoardCells';
export * as w from '@/lib/whoAmI';
export { supabase } from '@/integrations/supabase/client';
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src ${aliases.join(' ')}`,
  { stdio: 'inherit' },
);

/* Both stubs go in before the bundle is imported: the supabase client reads
   localStorage and captures fetch while its module evaluates. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const realFetch = globalThis.fetch;
const memo = new Map();
const net = { live: 0, memo: 0, failed: 0, refused: false };
let trace = null;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  const method = ((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
  if (method !== 'GET') return realFetch(input, init);
  if (!memo.has(url)) {
    net.live += 1;
    memo.set(url, (async () => {
      const r = await realFetch(input, init);
      const body = await r.text();
      if (/host not in allowlist/i.test(body)) net.refused = true;
      const headers = [...r.headers.entries()].filter(([k]) => !/^content-(encoding|length)$/i.test(k));
      return { status: r.status, statusText: r.statusText, headers, body };
    })().catch(err => { net.failed += 1; throw err; }));
  } else {
    net.memo += 1;
  }
  const c = await memo.get(url);
  if (trace) trace.push({ url, bytes: Buffer.byteLength(c.body, 'utf8') });
  return new Response(c.body, { status: c.status, statusText: c.statusText, headers: c.headers });
};

const { footle, logic, careerFetch, careerCells, w, supabase } = await import(pathToFileURL(BUNDLE).href);
const nothingChecked = () => abort('\nSUPABASE UNREACHABLE. NOTHING WAS CHECKED.');

/* ------------------------------------------------------------------ */
section = 1;
console.log('1) Footle: the kit tile never states a squad number nobody has');
{
  const pool = await footle.fetchFootlePlayerPool();
  if (!Array.isArray(pool) || pool.length === 0) nothingChecked();
  /* Measured 1,507 on 2026-09-04. The floor is a "did the pool actually load"
     guard well under that, not a target: a short pool would make every
     assertion below pass on nothing. */
  if (pool.length < 900) fail(`the Footle pool came back with ${pool.length} players, too few to be the real pool`);

  const unknownKit = pool.filter(p => p.kitNumber == null || p.kitNumber === 0);
  const knownKit = pool.filter(p => typeof p.kitNumber === 'number' && p.kitNumber > 0);
  const share = ((100 * unknownKit.length) / pool.length).toFixed(1);
  console.log(`   pool ${pool.length} players, ${unknownKit.length} with no squad number on file (${share}%), ${knownKit.length} with one`);
  if (knownKit.length < 50) fail(`only ${knownKit.length} pool players carry a real squad number, so this section would be testing nothing`);
  if (unknownKit.length < 50) fail(`only ${unknownKit.length} pool players are missing a squad number, so the unknown path would go untested`);

  /* Deterministic pairs: every combination of known and unknown on both sides,
     taken from the head and the tail of each list so the sample is not one
     club. compareGuess is the page's own function, imported, not restated. */
  const pick = (list, n) => [...list.slice(0, n), ...list.slice(-n)];
  const guesses = [...pick(unknownKit, 25), ...pick(knownKit, 25)];
  const targets = [...pick(unknownKit, 12), ...pick(knownKit, 12)];
  let printedZero = 0, falseMatch = 0, fakeArrow = 0, spokenWrong = 0, checked = 0;
  let firstPrinted = '', firstMatch = '', firstArrow = '', firstSpoken = '';
  for (const g of guesses) {
    for (const t of targets) {
      const cell = logic.compareGuess(g, t).cells.kitNumber;
      checked += 1;
      const gUnknown = g.kitNumber == null || g.kitNumber === 0;
      const tUnknown = t.kitNumber == null || t.kitNumber === 0;
      if (gUnknown) {
        if (/^\d+$/.test(cell.value)) {
          printedZero += 1;
          if (!firstPrinted) firstPrinted = `${g.name} (${g.club}) has no squad number on file and the tile printed "${cell.value}"`;
        }
        if (cell.status === 'correct') {
          falseMatch += 1;
          if (!firstMatch) firstMatch = `guessing ${g.name} against ${t.name} painted the kit tile as a match on two unknowns`;
        }
      }
      if ((gUnknown || tUnknown) && cell.arrow) {
        fakeArrow += 1;
        if (!firstArrow) firstArrow = `${g.name} against ${t.name} drew a "${cell.arrow}" arrow off a squad number nobody has`;
      }
      /* The board speaks its verdict as well as painting it, so the status a
         missing squad number carries has to be the one that says "not on
         file". 'incorrect' would have a screen reader announce a miss on a
         comparison the game cannot make. See GameBoard's sr-only span. */
      if ((gUnknown || tUnknown) && cell.status !== 'unknown') {
        spokenWrong += 1;
        if (!firstSpoken) firstSpoken = `${g.name} against ${t.name}: the kit tile is "${cell.value}" with status "${cell.status}", which the board reads out as a verdict`;
      }
    }
  }
  console.log(`   ${checked} guess/answer pairs scored through the page's own compareGuess`);
  if (printedZero > 0) fail(`${printedZero} kit tiles printed a squad number the pool does not have: ${firstPrinted}`);
  if (falseMatch > 0) fail(`${falseMatch} kit tiles claimed a match between two players with no squad number: ${firstMatch}`);
  if (fakeArrow > 0) fail(`${fakeArrow} kit tiles drew a higher/lower arrow off a missing squad number: ${firstArrow}`);
  if (spokenWrong > 0) fail(`${spokenWrong} kit tiles were given a hit/miss verdict on a squad number nobody has: ${firstSpoken}`);
  if (printedZero === 0 && falseMatch === 0 && fakeArrow === 0 && spokenWrong === 0) {
    console.log('   no tile stated, matched, pointed at or judged a squad number that is not on file');
  }
}

/* ------------------------------------------------------------------ */
section = 2;
console.log('2) Career Quiz: no board cell states a stat the season row does not carry');
{
  const players = await careerFetch.fetchCareerPlayers();
  if (!Array.isArray(players) || players.length === 0) nothingChecked();
  const seasons = players.flatMap(p => p.career.map(s => ({ player: p.name, s })));
  /* Measured 253 players / 3,685 seasons on 2026-09-04. */
  if (players.length < 150 || seasons.length < 2500) {
    fail(`career pool came back with ${players.length} players and ${seasons.length} seasons, too few to be the real table`);
  }

  const holes = seasons.filter(({ s }) => s.assists == null || s.marketValue === 0);
  const holePlayers = [...new Set(holes.map(h => h.player))];
  console.log(`   ${players.length} players, ${seasons.length} seasons, ${holes.length} of them missing a stat (${holePlayers.length} players)`);
  if (holes.length < 20) {
    fail(`only ${holes.length} season rows are missing a stat, so the unknown path would go untested`);
  }

  let stated = 0, firstStated = '';
  let checked = 0;
  for (const { player, s } of seasons) {
    for (const key of careerCells.CAREER_COLUMN_KEYS) {
      const value = careerCells.careerCellValue(s, key);
      checked += 1;
      const missing =
        (key === 'assists' && s.assists == null) ||
        (key === 'goals' && s.goals == null) ||
        (key === 'appearances' && s.appearances == null) ||
        (key === 'marketValue' && (s.marketValue == null || s.marketValue === 0));
      if (!missing) continue;
      if (/\d/.test(value) || /null|undefined|NaN/.test(value)) {
        stated += 1;
        if (!firstStated) firstStated = `${player}, ${s.season} at ${s.club}: the ${key} cell reads "${value}" and the table has nothing there`;
      }
    }
  }
  console.log(`   ${checked} board cells rendered through the board's own careerCellValue`);
  if (stated > 0) fail(`${stated} board cells stated a stat the table does not carry: ${firstStated}`);
  else console.log('   every missing stat renders as unknown, none of them as a number or as the word null');
}

/* ------------------------------------------------------------------ */
section = 3;
console.log('3) Who Am I: a player with a current listing resolves to it, never to "no listing"');
{
  trace = [];
  const data = await w.fetchWhoAmIPool();
  const bootTrace = trace;
  trace = null;
  if (!data) nothingChecked();
  console.log(`   pool ${data.pool.length} players, club history for ${data.clubHistory.size}`);

  /* Ground truth straight from the table: the current row each of these
     players actually has. Three of them are the rows whose age column is
     empty, which is the shape that made the owner's report. */
  const sampleNames = [];
  {
    const zeroAge = await supabase
      .from('player_market_values')
      .select('player_name')
      .eq('age', 0)
      .gte('year', 2025);
    if (zeroAge.error) nothingChecked();
    for (const r of zeroAge.data ?? []) sampleNames.push(r.player_name);

    /* A broad sample of ordinary current players, taken on id so it is not
       just the famous end, plus the top of the value order so the pool's own
       members are covered too. */
    const spread = await supabase
      .from('player_market_values')
      .select('player_name, club, nationality, position, market_value_usd, age, year')
      .eq('year', 2026)
      .order('id', { ascending: true })
      .range(0, 399);
    if (spread.error) nothingChecked();
    for (const r of spread.data ?? []) sampleNames.push(r.player_name);
  }

  const truth = new Map();
  for (let i = 0; i < sampleNames.length; i += 60) {
    const chunk = sampleNames.slice(i, i + 60);
    const { data: rows, error } = await supabase
      .from('player_market_values')
      .select('player_name, club, nationality, position, market_value_usd, age, year')
      .in('player_name', chunk)
      .gte('year', 2025)
      .order('year', { ascending: false });
    if (error) nothingChecked();
    for (const r of rows ?? []) {
      const prev = truth.get(r.player_name);
      if (!prev || r.year > prev.year || (r.year === prev.year && r.market_value_usd > prev.market_value_usd)) {
        truth.set(r.player_name, r);
      }
    }
  }
  if (truth.size < 200) fail(`only ${truth.size} sample players came back with a current row, too few to measure`);

  let wrongClub = 0, calledUnlisted = 0, fabricated = 0, checked = 0;
  let firstUnlisted = '', firstWrong = '', firstFabricated = '';
  for (const [name, row] of truth) {
    const entity = {
      key: name.toLowerCase(),
      name,
      rawName: name,
      meta: {
        club: row.club,
        nationality: row.nationality,
        position: row.position,
        value: row.market_value_usd,
        year: row.year,
        age: row.age,
      },
      matchRank: 0,
      prominence: row.market_value_usd,
    };
    const p = await w.whoAmIPlayerFromEntity(entity);
    checked += 1;
    if (!p || p.club === 'Retired' || p.year === 0) {
      calledUnlisted += 1;
      if (!firstUnlisted) firstUnlisted = `${name} has a ${row.year} row at ${row.club} worth $${row.market_value_usd} and the game reports no current listing`;
      continue;
    }
    if (p.club !== row.club || p.value !== row.market_value_usd) {
      wrongClub += 1;
      if (!firstWrong) firstWrong = `${name}: the table says ${row.club} / $${row.market_value_usd} (${row.year}), the game says ${p.club} / $${p.value} (${p.year})`;
    }
    /* The other half of the same rule: never invent a number the row lacks. */
    if ((row.age > 0 && p.age !== row.age) || (row.age === 0 && p.age !== 0)) {
      fabricated += 1;
      if (!firstFabricated) firstFabricated = `${name}: the table's age column reads ${row.age} and the game reports ${p.age}`;
    }
  }
  console.log(`   ${checked} current players resolved through the game's own guess path`);
  if (calledUnlisted > 0) fail(`${calledUnlisted} players with a current row were reported as having none: ${firstUnlisted}`);
  if (wrongClub > 0) fail(`${wrongClub} players resolved to the wrong current row: ${firstWrong}`);
  if (fabricated > 0) fail(`${fabricated} players were given an age the table does not carry: ${firstFabricated}`);
  if (calledUnlisted === 0 && wrongClub === 0 && fabricated === 0) {
    console.log('   every sampled current player resolved to his real club, value and age');
  }

  /* ---------------------------------------------------------------- */
  section = 4;
  console.log('4) Who Am I: the boot fetches the pool, not the whole season');
  const requests = bootTrace.length;
  const kib = Math.round(bootTrace.reduce((a, c) => a + c.bytes, 0) / 1024);
  console.log(`   boot: ${requests} requests, ${kib} KiB`);
  /* Measured after the Round 443 narrowing: 10 requests, 446 KiB, 978 ms (the
     pool leg, the carry-over leg, one name check, and the club-history
     chunks). Before it: 20 requests, 2,054 KiB, 1,947 ms, median of three real
     boots each. The ceilings sit between the two with room for the
     club-history chunk count to move as the pool's names change, and well
     under half of what the old boot cost. Milliseconds are not asserted on:
     they are a property of whoever's network is running this, and requests
     and bytes are the thing the code actually controls. */
  if (requests > 14) fail(`the boot made ${requests} requests, more than the 14 the pool needs`);
  if (kib > 800) fail(`the boot pulled ${kib} KiB, more than the 800 the pool needs`);
  if (requests <= 14 && kib <= 800) console.log('   the boot stays inside the pool budget');

  /* Cheap is worthless if it is also wrong, and the way to get this wrong is
     the Round 315 bug: rank a man on a season he has already left. So the
     exhaustive sweep the narrowing replaced is run here, every current row of
     both seasons, and the pool it produces must be the pool the game returned,
     in the same order. The RULE (latest year wins, value breaks a tie, rank by
     value with the name as tiebreak) is imported from whoAmI.ts, not restated:
     this section supplies rows and compares outputs, nothing more. */
  const sweep = new Map();
  for (const year of [2026, 2025]) {
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await supabase
        .from('player_market_values')
        .select('player_name, nationality, position, club, market_value_usd, age, year')
        .eq('year', year)
        .gt('market_value_usd', 0)
        .gt('age', 0)
        .order('id', { ascending: true })
        .range(from, from + 999);
      if (error) nothingChecked();
      for (const r of rows ?? []) w.keepLatest(sweep, w.currentRowFrom(r));
      if (!rows || rows.length < 1000) break;
    }
  }
  const exhaustive = [...sweep.values()].sort(w.byCurrentValue).slice(0, data.pool.length);
  console.log(`   exhaustive sweep: ${sweep.size} current players, pool of ${exhaustive.length}`);
  if (sweep.size < 5000) fail(`the exhaustive sweep found only ${sweep.size} current players, so it is not the sweep it replaced`);
  let drift = 0, firstDrift = '';
  for (let i = 0; i < exhaustive.length; i++) {
    const got = data.pool[i];
    const want = exhaustive[i];
    if (!got || got.name !== want.name || got.club !== want.club || got.value !== want.value || got.year !== want.year) {
      drift += 1;
      if (!firstDrift) {
        firstDrift = `rank ${i + 1}: the narrowed boot returned ${got ? `${got.name} (${got.club}, $${got.value}, ${got.year})` : 'nothing'}, the full sweep says ${want.name} (${want.club}, $${want.value}, ${want.year})`;
      }
    }
  }
  if (drift > 0) fail(`${drift} of ${exhaustive.length} pool seats differ from the exhaustive sweep: ${firstDrift}`);
  else console.log(`   all ${exhaustive.length} pool seats match the exhaustive sweep, same players, same rows, same order`);
}

/* ------------------------------------------------------------------ */
console.log(`\nnetwork: ${net.live} live GETs, ${net.memo} answered from the memo, ${net.failed} failed`);
if (net.refused) abort('\nSUPABASE UNREACHABLE. NOTHING WAS CHECKED.');
if (CONTROL) {
  const targetSection = { kitmatch: 1, nullassist: 2, zeroage: 3, fullfetch: 4 }[CONTROL];
  if (bySection[targetSection] === 0) {
    console.error(`\nCONTROL DID NOT FIRE: section ${targetSection} stayed green with SIM_NO_ZERO_FACTS_CONTROL=${CONTROL}`);
    process.exit(1);
  }
  console.log(`\nCONTROL FIRED: section ${targetSection} went red as it must (${bySection[targetSection]} findings)`);
  process.exit(0);
}
if (failures > 0) {
  console.error(`\nsimNoZeroFacts: ${failures} findings (section 1: ${bySection[1]}, 2: ${bySection[2]}, 3: ${bySection[3]}, 4: ${bySection[4]})`);
  process.exit(1);
}
console.log('simNoZeroFacts: all four sections green');
