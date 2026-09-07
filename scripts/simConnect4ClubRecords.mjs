/* Soccer Connect 4 answers its club squares from our own tables, exactly.
 *
 * Round 497. The free Gemini allowance is a DAILY one shared by every AI
 * checked game, so the biggest consumer starves the rest. Measured on
 * ai_validation_cache 2026-09-06 over verdicts written in the previous 14 days:
 * football-connect4 407, soccer-grid 192, college-grid 145, nba-connect4 82,
 * nfl-connect4 35, nhl-connect4 32, football-grid 23, mlb-connect4 16. This one
 * is more than double the next, and those are only the SUCCESSFUL calls because
 * a failure is never cached, so the real spend is higher.
 *
 * The boards use "Played for X" 92 times across 29 distinct club labels, which
 * soccer_player_club_stints already answers for Soccer Grid. The validator did
 * not open that table at all. (The board note this round was planned from said
 * 76 of 104 uses; counted again here the club figure is 92 over 29 labels,
 * which is exact because "Played for " is unambiguous, so section 1 prints the
 * count it measures rather than a number carried over.)
 *
 * THE DANGER THIS HARNESS EXISTS FOR. A confirm-only pass that OVER-accepts is
 * not a missing answer, it is a WRONG one, and it is wrong silently because it
 * never calls the model to be corrected. The loose substring rule Soccer Grid
 * uses would accept Berekum Chelsea FC for Chelsea, Barcelona SC Guayaquil for
 * Barcelona and RCD Espanyol Barcelona, the city rival, for Barcelona. So the
 * map is EXACT and section 3 proves those impostors are really in the table and
 * really refused.
 *
 * WHAT THIS HOLDS:
 *   1. Every "Played for X" label on the real boards resolves in the map, and
 *      the map carries nothing the boards do not use.
 *   2. Every club string in the map exists in the live table. A typo would make
 *      a label silently unanswerable and nothing else would notice.
 *   3. The exact rule refuses impostors a substring rule accepts, measured
 *      against the live table rather than asserted.
 *   4. The shipped code is confirm-only in shape: the helper never returns a
 *      denial, it returns the name or null, and it sits after the fact lookup
 *      and before the cacheOnly guard so both keep behaving as they did.
 *   5. The DEPLOYED function really does it, tested against production with
 *      cacheOnly on so it can never spend an AI request.
 *
 * NEGATIVE CONTROLS, all three fire on correct code:
 *   C4_RECORDS_CONTROL=substring switches section 3 to the loose rule, which
 *     accepts the impostors, so it goes red naming them.
 *   C4_RECORDS_CONTROL=dropmap deletes three entries from the parsed map, so
 *     section 1 goes red with the labels that no longer resolve.
 *   C4_RECORDS_CONTROL=denyonmiss expects the live function to DENY on a
 *     records miss, which is what a fail-open rewrite of this pass would do, so
 *     section 5 goes red against correct code.
 *
 * Run: node scripts/simConnect4ClubRecords.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FN = path.join(ROOT, 'supabase', 'functions', 'football-connect4-validate', 'index.ts');
const CONTROL = process.env.C4_RECORDS_CONTROL || '';
if (CONTROL && !['substring', 'dropmap', 'denyonmiss'].includes(CONTROL)) {
  console.error(`C4_RECORDS_CONTROL=${CONTROL} is not a control this harness knows (substring, dropmap, denyonmiss)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/* The map is parsed out of the SHIPPED function, not retyped here. A copy in
   the harness would pass while the deployed file said something else. */
const src = readFileSync(FN, 'utf8');
const mapBody = src.match(/const C4_CLUB_STRINGS: Record<string, string\[\]> = \{([\s\S]*?)\n\};/);
if (!mapBody) {
  console.error('could not find C4_CLUB_STRINGS in the shipped function');
  process.exit(1);
}
const CLUB_MAP = new Map();
for (const m of mapBody[1].matchAll(/"([^"]+)":\s*\[([^\]]*)\]/g)) {
  CLUB_MAP.set(m[1], [...m[2].matchAll(/"([^"]*)"/g)].map(x => x[1]));
}
if (CONTROL === 'dropmap') ['chelsea', 'liverpool', 'psg'].forEach(k => CLUB_MAP.delete(k));
console.log(`   ${CLUB_MAP.size} club labels parsed out of the shipped validator`);

const types = readFileSync(path.join(ROOT, 'src', 'types', 'footballConnect4.ts'), 'utf8');
const uses = [...types.matchAll(/'Played for ([^']+)'/g)].map(m => m[1]);
const labels = [...new Set(uses)];
console.log(`   ${uses.length} "Played for" attribute uses across the boards, ${labels.length} distinct`);

console.log('1) every board label resolves, and the map carries nothing spare');
{
  const unresolved = labels.filter(l => !CLUB_MAP.has(norm(l)));
  unresolved.forEach(l => fail(`the boards use "Played for ${l}" and the map has no entry for it, so that square always costs an AI call`));
  const labelKeys = new Set(labels.map(norm));
  const spare = [...CLUB_MAP.keys()].filter(k => !labelKeys.has(k));
  spare.forEach(k => fail(`the map carries "${k}", which no board uses`));
  console.log(`   ${labels.length - unresolved.length}/${labels.length} labels resolve, ${spare.length} spare entries`);
  if (CONTROL === 'dropmap' && unresolved.length === 0) {
    console.error('   CONTROL dropmap changed nothing: the deleted keys must have been in use');
    process.exit(1);
  }
}

/* ONE paged scan of the stint table, feeding both the club inventory and the
   two-club player list. A transient failure on any page REFUSES THE RUN rather
   than continuing: the first version let a 500 leave the inventory empty, and
   sections 2 and 3 then reported 38 confident findings saying every club in the
   map was missing from the table. A check that turns an outage into a pile of
   findings is worse than one that does not run. */
const exactToLabel = new Map();
for (const [label, strings] of CLUB_MAP) for (const s of strings) exactToLabel.set(s, label);
const allClubs = new Set();
const byPlayer = new Map();
let rows = 0;
for (let from = 0; from < 200000; from += 1000) {
  let page = null;
  for (let attempt = 0; attempt < 4 && page === null; attempt += 1) {
    try {
      const r = await fetch(`${URL_}/rest/v1/soccer_player_club_stints?select=player_name,club&order=player_name.asc,club.asc`,
        { headers: { ...HEAD, Range: `${from}-${from + 999}` } });
      if (r.ok) page = await r.json();
      else if (attempt === 3) {
        console.error(`could not read soccer_player_club_stints at offset ${from} (HTTP ${r.status}) after 4 attempts; refusing to run rather than report findings against an empty table`);
        process.exit(1);
      }
    } catch (e) {
      if (attempt === 3) {
        console.error(`could not read soccer_player_club_stints at offset ${from} (${e.message}); refusing to run`);
        process.exit(1);
      }
    }
    if (page === null) await new Promise(r => setTimeout(r, 900 * (attempt + 1)));
  }
  rows += page.length;
  for (const row of page) {
    for (const raw of String(row.club ?? '').split(' / ')) {
      const part = raw.trim();
      if (!part) continue;
      allClubs.add(part);
      const label = exactToLabel.get(part);
      if (!label) continue;
      if (!byPlayer.has(row.player_name)) byPlayer.set(row.player_name, new Set());
      byPlayer.get(row.player_name).add(label);
    }
  }
  if (page.length < 1000) break;
}
console.log(`   ${rows} stint rows read, ${allClubs.size} distinct club strings`);
if (allClubs.size < 1000) {
  console.error(`only ${allClubs.size} club strings were read, which cannot be the whole table; refusing to run`);
  process.exit(1);
}

console.log('2) every club string in the map exists in the live table');
{
  let missing = 0;
  for (const [label, strings] of CLUB_MAP) {
    for (const s of strings) {
      if (!allClubs.has(s)) { missing += 1; fail(`the map sends "${label}" to "${s}", which is not a club string in the table`); }
    }
  }
  console.log(`   ${missing} map entries pointing at a string the table does not hold`);
}

console.log('3) the exact rule refuses the impostors a substring rule accepts');
{
  const TRAPS = [['chelsea', 'Chelsea'], ['barcelona', 'Barcelona'], ['liverpool', 'Liverpool'], ['roma', 'Roma'], ['napoli', 'Napoli']];
  let checked = 0, accepted = 0, trapsSeen = 0;
  for (const [key, needle] of TRAPS) {
    const want = CLUB_MAP.get(key);
    if (!want) continue;
    const impostors = [...allClubs].filter(c => c.toLowerCase().includes(needle.toLowerCase()) && !want.includes(c));
    trapsSeen += impostors.length;
    for (const imp of impostors) {
      checked += 1;
      const hit = CONTROL === 'substring'
        ? imp.toLowerCase().includes(needle.toLowerCase())
        : want.includes(imp);
      if (hit) { accepted += 1; if (accepted <= 6) fail(`"${imp}" would be accepted as "Played for ${needle}", which is a wrong answer the model never gets to correct`); }
    }
  }
  console.log(`   ${trapsSeen} real impostor club strings found in the table, ${accepted}/${checked} accepted`);
  if (trapsSeen === 0) fail('no impostor club strings were found at all, so this section proved nothing');
  if (CONTROL === 'substring' && accepted === 0) {
    console.error('   CONTROL substring changed nothing: the loose rule must accept the impostors');
    process.exit(1);
  }
  console.log(`   placeholder "---" present in the table: ${allClubs.has('---') ? 'yes, and no map entry names it' : 'no'}`);
  if (allClubs.has('---') && [...CLUB_MAP.values()].flat().includes('---')) fail('a map entry names the "---" placeholder club');
}

console.log('4) the shipped code is confirm-only, and sits between the fact lookup and cacheOnly');
{
  const body = src.slice(src.indexOf('async function confirmClubAttribute'));
  const fn = body.slice(0, body.indexOf('\n}\n') + 3);
  if (/return\s+false/.test(fn)) fail('confirmClubAttribute can return a denial; a miss must be null so it falls through to the model');
  if (!/catch\s*\{\s*return null/.test(fn)) fail('confirmClubAttribute does not return null on error, so a table outage could read as a verdict');
  if (!/\.split\(" \/ "\)/.test(fn)) fail('confirmClubAttribute does not split a stored club on " / ", so split seasons are missed');
  if (!/want\.includes\(/.test(fn)) fail('confirmClubAttribute no longer matches with an exact includes over the mapped strings');
  const posRecords = src.indexOf('const determined:');
  const posCacheOnly = src.indexOf('if (cacheOnly === true)');
  const posFacts = src.indexOf('.in("cache_key", [rowKey, colKey])');
  if (!(posFacts > 0 && posRecords > posFacts && posCacheOnly > posRecords)) {
    fail('the records pass is not between the attribute fact lookup and the cacheOnly guard');
  }
  console.log(`   order: facts@${posFacts} -> records@${posRecords} -> cacheOnly@${posCacheOnly}`);
}

console.log('5) the DEPLOYED function answers club squares from records, and a miss still falls through');
{
  /* cacheOnly is checked AFTER the records pass, so this exercises the live
     path and can never spend a single AI request. A harness that burned the
     daily quota to prove the quota is being saved would be absurd.

     TWO WRONG VERSIONS CAME FIRST and both are worth writing down, because
     both were GREEN while proving nothing.

     The first hardcoded one player. It went red on its second run: the smoke
     test that proved the deploy had already cached him, and the cache is read
     BEFORE the records pass, so a fixed subject reports correct code as broken
     forever after.

     The second tried to dodge that by asking the cache which subjects were
     already answered and skipping them. THAT QUERY RETURNS EMPTY ALWAYS:
     ai_validation_cache is not readable with the anon key, only with the
     service role the edge function itself holds. The skip was a silent no-op,
     the same player was re-picked, and it passed once then went red. A
     permission failure that reads as "nothing is cached" is the worst shape a
     check can have, because it looks like a clean answer.

     So this version asks the FUNCTION, not the table, and classifies every
     reply instead of hunting for one that suits:
       source "records"  the records pass answered it. What we are proving.
       cached true       the cache answered first. Cheaper still, and fine.
       neither           NOBODY answered, and for a pair the table PROVES that
                         is a real failure: the records pass had both halves
                         available and did not use them.
     Zero unanswered is the assertion. At least one "records" is required too,
     so a run where the cache happens to hold everything cannot pass without the
     new path ever running. */
  const call = async (playerName, rowAttribute, columnAttribute) => {
    const r = await fetch(`${URL_}/functions/v1/football-connect4-validate`, {
      method: 'POST',
      headers: { ...HEAD, 'Content-Type': 'application/json', origin: 'https://douknowball.com' },
      body: JSON.stringify({ playerName, rowAttribute, columnAttribute, cacheOnly: true }),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const labelText = new Map(labels.map(l => [norm(l), l]));
  /* ASCII only: the lookup is ilike on the raw column and therefore accent
     sensitive, a limit this round states rather than hides, so an accented
     name would be a known miss and not evidence of anything. */
  const candidates = [...byPlayer.entries()]
    .filter(([name, set]) => set.size >= 2 && !/[^\x20-\x7e]/.test(name))
    .map(([name, set]) => [name, [...set]]);
  console.log(`   ${candidates.length} players in the table played for 2 or more mapped clubs`);
  if (candidates.length < 10) fail(`only ${candidates.length} candidate players, which is too few to conclude anything`);

  let fromRecords = 0, fromCache = 0, missed = 0, tried = 0;
  let subject = null;
  const missNames = [];
  for (const [name, clubLabels] of candidates.slice(0, 40)) {
    const rowA = `Played for ${labelText.get(clubLabels[0]) ?? clubLabels[0]}`;
    const colA = `Played for ${labelText.get(clubLabels[1]) ?? clubLabels[1]}`;
    const res = await call(name, rowA, colA);
    tried += 1;
    if (res.body.source === 'records' && res.body.valid === true) {
      fromRecords += 1;
      if (!subject) subject = { name, rowA };
    } else if (res.body.cached === true) {
      fromCache += 1;
    } else {
      missed += 1;
      if (missNames.length < 5) missNames.push(`${name} (${rowA} x ${colA}) -> ${JSON.stringify(res.body).slice(0, 120)}`);
    }
    if (fromRecords >= 3 && tried >= 10) break;
  }
  console.log(`   ${tried} pairs the table proves: ${fromRecords} answered from records, ${fromCache} from cache, ${missed} answered by nobody`);
  missNames.forEach(n => fail(`the table proves both clubs and the deployed function still could not answer: ${n}`));
  if (missed > missNames.length) fail(`and ${missed - missNames.length} more unanswered pairs`);
  if (fromRecords === 0) fail('not one pair was answered from records, so the new path never ran and this section proved nothing');

  /* ONE half missing: the miss must NOT become a denial. Repeatable by
     construction: a records miss writes no pair verdict, so nothing this call
     does changes what the next run sees. */
  if (subject) {
    const notHis = [...CLUB_MAP.keys()].find(k => !byPlayer.get(subject.name).has(k));
    const missAttr = `Played for ${labelText.get(notHis) ?? notHis}`;
    const mixed = await call(subject.name, subject.rowA, missAttr);
    const fellThrough = CONTROL === 'denyonmiss'
      ? (mixed.body.valid === false && mixed.body.source === 'records')
      : (mixed.body.cacheMiss === true && mixed.body.unverified === true);
    if (!fellThrough) {
      fail(`a records MISS did not fall through: ${subject.name} x ${missAttr} came back as ${JSON.stringify(mixed.body).slice(0, 200)}. A miss must never be read as a denial.`);
    }
    console.log(`   one-half-missing (${subject.name} x ${missAttr}): cacheMiss=${mixed.body.cacheMiss ?? false} unverified=${mixed.body.unverified ?? false} source=${mixed.body.source ?? '(none)'}`);
    if (CONTROL === 'denyonmiss' && failures === 0) {
      console.error('   CONTROL denyonmiss changed nothing: correct code must NOT deny on a records miss');
      process.exit(1);
    }
  }
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else {
  console.log(failures === 0
    ? '\nsimConnect4ClubRecords: green. Every club label resolves exactly, no impostor gets in, and production answers from records.'
    : `\nsimConnect4ClubRecords: ${failures} finding(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}
