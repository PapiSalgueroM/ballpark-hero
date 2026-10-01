/* The verified 2026 moves are the same list everywhere they are written, and
 * the three Round 707 stint migrations still describe the live table.
 *
 * Round 707. soccer_player_club_stints never learned the summer 2026 moves in
 * scripts/transferOverlay2026.mjs, so Soccer Grid's records pass cached hard
 * refusals for them ("Mohamed Salah does not satisfy Played for Trabzonspor").
 * The round carries the overlay into TWO edge functions as a hand copied map
 * (soccer-grid-validate and football-connect4-validate, each under the name
 * TRANSFER_OVERLAY_2026), writes it into the table with one migration, deletes
 * the table's exact copies with a second and keys stint rows from their market
 * rows with a third. That is four copies of one real world list plus three
 * counts measured on one day, and until this file existed nothing held any of
 * them: the triage deleted a function entry, dropped the cache guard and
 * changed a migration count, and every harness that reads these files stayed
 * green. The function comment and all three migration headers cite this
 * harness by name, so it has to exist and it has to read the code.
 *
 * WHAT THIS HOLDS:
 *   0. Parity. Under the grid function's own lifted norm(), every overlay entry
 *      is one entry of the grid's map (key, name, exactly one club, the db
 *      spelling), one entry of the connect4 map under its lifted foldName(),
 *      and one (name, club) row of the overlay migration's VALUES list, in the
 *      overlay's own order. Same counts; nothing extra in any copy.
 *   1. Live, read only: "would insert N" for the overlay migration, computed
 *      the way the migration computes it (a (name, club) pair with no stint of
 *      that name at that exact club covering 2026), plus the precondition that
 *      every name has a stint row to copy from. N must be the file's own
 *      expected_missing constant (before it is applied) or 0 (after).
 *   2. Live, read only: "would delete N in G groups" for the duplicates
 *      migration, rows equal on every column but id. (G, N) must be the file's
 *      constants (before) or (0, 0) (after).
 *   3. Live, read only: "would update N" for the person key migration, the
 *      same join it runs (a stint with a null person_key whose market rows at
 *      that club and inside its years all carry one key). N must be the file's
 *      expected_updates constant (before) or 0 (after).
 *   4. Source, comments stripped: the grid serves a cached verdict only past
 *      the records refusal guard, the guard exempts only World Cup squad
 *      refusals, and the refusal regex really matches the refusal writer's own
 *      output with the criterion captured; connect4 puts a cached no on a club
 *      half to confirmClubAttribute before serving it; both overlay lookups
 *      refuse a name whose rows are more than one man.
 *
 * MEASURED 2026-09-30 (the headroom every threshold here comes from): overlay
 * 241 entries, grid map 241, connect4 map 241, migration list 241, 0
 * mismatches; live would insert 240 = expected_missing, 241 of 241 names have a
 * stint row; 1,423 copy groups holding 1,465 surplus rows = the constants;
 * 0 market rows carry a person_key so would update 0 = expected_updates. Every
 * check is an exact equality against a constant the code itself carries, so
 * there is no margin to set and no max to lean on.
 *
 * NEGATIVE CONTROLS (SOCCER_STINTS_CONTROL=...), each refuses to run if the
 * text it edits is not there, so a green control run cannot mean "the control
 * did not fire":
 *   dropentry      deletes Salah's line from the grid map in memory: section 0
 *   noname         drops every stint row of one overlay name from the scan in
 *                  memory, the table having "moved": section 1
 *   dupe           adds one exact copy of a row to the scan in memory: section 2
 *   servedrefusal  drops the "!recordsRefusal" guard from the grid's cache read
 *                  in memory, the pre Round 707 code: section 4
 *   nameonly       drops the identities.size guard from both overlay lookups in
 *                  memory, so a merged name would take the move: section 4
 *
 * Run: node scripts/simSoccerStints.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stintPages, stintPageUrl } from './lib/stintPages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLS = ['dropentry', 'noname', 'dupe', 'servedrefusal', 'nameonly'];
const CONTROL = process.env.SOCCER_STINTS_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`SOCCER_STINTS_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const refuse = m => { console.error(m); process.exit(1); };

/* Every read normalises line endings: Anthony's checkout is CRLF and a shape
   that spans a line would otherwise never match there. */
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
/* Code, not prose. The anchors below are the strings the guards look for, and
   the comments explaining the guards are the one place those strings are
   guaranteed to appear, so they are cut before anything is matched. */
const stripTs = src => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const stripSql = src => src.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
/* An in memory edit that must change the text, or the run stops. */
const mutate = (src, from, to, what) => {
  if (!src.includes(from)) refuse(`CONTROL ${CONTROL} cannot run: "${what}" is not in the text it edits`);
  return src.split(from).join(to);
};

const GRID = 'supabase/functions/soccer-grid-validate/index.ts';
const C4 = 'supabase/functions/football-connect4-validate/index.ts';
const MIG_OVERLAY = 'supabase/migrations/20260930170000_round_707_overlay_stints.sql';
const MIG_DUPES = 'supabase/migrations/20260930170100_round_707_stint_duplicates.sql';
const MIG_KEYS = 'supabase/migrations/20260930170200_round_707_stint_person_keys.sql';

let gridSrc = read(GRID);
let c4Src = read(C4);
if (CONTROL === 'dropentry') {
  gridSrc = mutate(gridSrc, '  "mohamed salah": { name: "Mohamed Salah", clubs: ["Trabzonspor"] },\n', '', 'the Salah entry of the grid map');
}
if (CONTROL === 'servedrefusal') {
  gridSrc = mutate(gridSrc, 'if (cachedVerdict && !recordsRefusal) return json(', 'if (cachedVerdict) return json(', 'the records refusal guard on the grid cache read');
}
if (CONTROL === 'nameonly') {
  gridSrc = mutate(gridSrc, '  if (identities.size > 1) return [];\n', '', 'the grid identity guard');
  c4Src = mutate(c4Src, '  if (identities.size > 1) return null;\n', '', 'the connect4 identity guard');
}
const gridCode = stripTs(gridSrc);
const c4Code = stripTs(c4Src);

/* The folds are LIFTED out of the shipped functions, never retyped, the way
   simSoccerStintNameFold does it: the keys of the maps are whatever the
   deployed code computes, not what a harness thinks it computes. */
function liftFold(code, declName) {
  const lines = code.split('\n');
  const start = lines.findIndex(l => l.startsWith('const TRANSLIT'));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && l.includes('.trim();'));
  if (end < 0) return null;
  const js = lines.slice(start, end + 1).join('\n').replace(': Record<string, string>', '').replace('(s: string)', '(s)');
  return eval(`(() => { ${js}; return ${declName}; })()`);
}
const norm = liftFold(gridCode, 'norm');
const foldName = liftFold(c4Code, 'foldName');
if (!norm || !foldName) refuse('could not lift the fold out of one of the shipped functions');

/* The maps are PARSED out of the code, one entry per line of the literal. */
function parseMap(code, label) {
  const m = code.match(/const TRANSFER_OVERLAY_2026: Record<string, \{ name: string; clubs: string\[\] \}> = \{\n([\s\S]*?)\n\};/);
  if (!m) refuse(`could not find TRANSFER_OVERLAY_2026 in ${label}`);
  const entries = [];
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const e = line.match(/^\s*"([^"]+)": \{ name: "([^"]+)", clubs: \[([^\]]*)\] \},?\s*$/);
    if (!e) refuse(`${label}: a map line does not have the shape this harness reads: ${line.trim()}`);
    entries.push({ key: e[1], name: e[2], clubs: [...e[3].matchAll(/"([^"]*)"/g)].map(x => x[1]) });
  }
  return entries;
}
const gridMap = parseMap(gridCode, 'soccer-grid-validate');
const c4Map = parseMap(c4Code, 'football-connect4-validate');

/* The migration's list is parsed out of its VALUES rows, comments cut. */
const migOverlaySql = stripSql(read(MIG_OVERLAY));
const valuesBlock = migOverlaySql.match(/insert into r707_overlay \(player_name, club\) values\n([\s\S]*?)\n\s*;/);
if (!valuesBlock) refuse('could not find the r707_overlay VALUES list in the overlay migration');
const migList = [...valuesBlock[1].matchAll(/\('([^']+)', '([^']+)'\)/g)].map(m => ({ name: m[1], club: m[2] }));
const sqlConst = (sql, name) => {
  const m = sql.match(new RegExp(`${name} constant integer := (\\d+);`));
  if (!m) refuse(`the migration no longer declares ${name} as a constant integer`);
  return Number(m[1]);
};
const expectedEntries = sqlConst(migOverlaySql, 'expected_entries');
const expectedMissing = sqlConst(migOverlaySql, 'expected_missing');
const migDupesSql = stripSql(read(MIG_DUPES));
const expectedGroups = sqlConst(migDupesSql, 'expected_groups');
const expectedSurplus = sqlConst(migDupesSql, 'expected_surplus');
const migKeysSql = stripSql(read(MIG_KEYS));
const expectedUpdates = sqlConst(migKeysSql, 'expected_updates');

/* Imported inside the run, never at module scope. */
const { TRANSFER_OVERLAY_2026: overlay } = await import('./transferOverlay2026.mjs');
if (!Array.isArray(overlay) || overlay.length < 200) refuse('scripts/transferOverlay2026.mjs did not yield the overlay list');

console.log('0) the overlay, both function maps and the migration list are one list');
{
  console.log(`   overlay ${overlay.length}, grid map ${gridMap.length}, connect4 map ${c4Map.length}, migration list ${migList.length}, expected_entries ${expectedEntries}`);
  if (gridMap.length !== overlay.length) fail(`the grid map holds ${gridMap.length} entries and the overlay ${overlay.length}`);
  if (c4Map.length !== overlay.length) fail(`the connect4 map holds ${c4Map.length} entries and the overlay ${overlay.length}`);
  if (migList.length !== overlay.length) fail(`the migration lists ${migList.length} rows and the overlay ${overlay.length}`);
  if (expectedEntries !== overlay.length) fail(`the migration's expected_entries is ${expectedEntries} and the overlay has ${overlay.length}`);
  const gridByKey = new Map(gridMap.map(e => [e.key, e]));
  const c4ByKey = new Map(c4Map.map(e => [e.key, e]));
  let mismatches = 0;
  const shown = [];
  const say = m => { mismatches += 1; if (shown.length < 8) shown.push(m); };
  overlay.forEach((o, i) => {
    if (!o.db) { say(`overlay "${o.name}" has no db spelling, and the maps need one`); return; }
    for (const [label, map, fold] of [['grid', gridByKey, norm], ['connect4', c4ByKey, foldName]]) {
      const e = map.get(fold(o.name));
      if (!e) { say(`${label} map has no entry for "${o.name}" (key "${fold(o.name)}")`); continue; }
      if (e.name !== o.name) say(`${label} map spells "${o.name}" as "${e.name}"`);
      if (e.clubs.length !== 1 || e.clubs[0] !== o.db) say(`${label} map sends "${o.name}" to [${e.clubs.join(', ')}], the overlay says "${o.db}"`);
    }
    const r = migList[i];
    if (!r) say(`the migration has no row ${i + 1} for "${o.name}"`);
    else if (r.name !== o.name || r.club !== o.db) say(`migration row ${i + 1} is ('${r.name}', '${r.club}'), the overlay says ('${o.name}', '${o.db}')`);
  });
  const overlayKeysGrid = new Set(overlay.map(o => norm(o.name)));
  const overlayKeysC4 = new Set(overlay.map(o => foldName(o.name)));
  gridMap.filter(e => !overlayKeysGrid.has(e.key)).forEach(e => say(`the grid map carries "${e.key}", which is in no overlay entry`));
  c4Map.filter(e => !overlayKeysC4.has(e.key)).forEach(e => say(`the connect4 map carries "${e.key}", which is in no overlay entry`));
  shown.forEach(fail);
  if (mismatches > shown.length) fail(`and ${mismatches - shown.length} more mismatches`);
  console.log(`   ${mismatches} mismatches across the four copies`);
  if (CONTROL === 'dropentry' && mismatches === 0) refuse('   CONTROL dropentry changed nothing: deleting a map entry must show as a mismatch');
}

/* ONE paged scan of the whole table, every column but id in the row, feeding
   sections 1 to 3. A failed page refuses the run rather than reporting a
   moved table against a short read. */
const client = read('src/integrations/supabase/client.ts');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const COLS = 'player_name,club,first_year,last_year,seasons,nationality,position,debut_year,debut_age,person_key,name_folded';
async function getJson(url, what) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const r = await fetch(url, { headers: HEAD });
      if (r.ok) return await r.json();
      if (attempt === 3) refuse(`could not read ${what} (HTTP ${r.status}); refusing to run rather than report findings against a bad read`);
    } catch (e) {
      if (attempt === 3) refuse(`could not read ${what} (${e.message}); refusing to run`);
    }
    await new Promise(r => setTimeout(r, 900 * (attempt + 1)));
  }
  return null;
}
let rows = [];
for await (const page of stintPages(afterId => getJson(stintPageUrl(URL_, COLS, afterId), `soccer_player_club_stints after id ${afterId}`))) {
  rows.push(...page);
}
console.log(`   ${rows.length} stint rows read`);
if (rows.length < 50000) refuse(`only ${rows.length} rows read, which cannot be the whole table; refusing to run`);
if (CONTROL === 'noname') {
  const before = rows.length;
  rows = rows.filter(r => r.player_name !== 'Mohamed Salah');
  if (rows.length === before) refuse('CONTROL noname changed nothing: the table holds no row for Mohamed Salah to drop');
}
if (CONTROL === 'dupe') {
  rows.push({ ...rows[0], id: rows[rows.length - 1].id + 1 });
}

console.log('1) the overlay migration: would insert N, the way the file counts it');
{
  const before = failures;
  const byName = new Map();
  for (const r of rows) {
    if (!byName.has(r.player_name)) byName.set(r.player_name, []);
    byName.get(r.player_name).push(r);
  }
  const noRow = overlay.filter(o => !byName.has(o.name));
  const missing = overlay.filter(o => !(byName.get(o.name) || []).some(r => r.club === o.db && r.first_year <= 2026 && 2026 <= r.last_year));
  console.log(`   would insert ${missing.length} (expected_missing ${expectedMissing}, 0 once applied); ${overlay.length - noRow.length}/${overlay.length} names have a stint row to copy from`);
  noRow.forEach(o => fail(`"${o.name}" has no stint row at all, so the migration has nothing to copy his debut and folded name from and would refuse`));
  if (missing.length !== 0 && missing.length !== expectedMissing) {
    fail(`would insert ${missing.length}, but the migration expects ${expectedMissing} before it runs and 0 after. The table has moved since 2026-09-30: re-measure and set expected_missing before applying.`);
  }
  if (CONTROL === 'noname' && failures === before) refuse('   CONTROL noname changed nothing: dropping a name from the scan must leave it with no row to copy from');
}

console.log('2) the duplicates migration: would delete N in G groups');
{
  const groups = new Map();
  for (const r of rows) {
    const k = JSON.stringify([r.player_name, r.club, r.first_year, r.last_year, r.seasons, r.nationality, r.position, r.debut_year, r.debut_age, r.person_key, r.name_folded]);
    groups.set(k, (groups.get(k) || 0) + 1);
  }
  let g = 0, surplus = 0;
  for (const c of groups.values()) if (c > 1) { g += 1; surplus += c - 1; }
  console.log(`   would delete ${surplus} in ${g} groups (expected ${expectedSurplus} in ${expectedGroups}, 0 in 0 once applied)`);
  const before = failures;
  if (!((g === 0 && surplus === 0) || (g === expectedGroups && surplus === expectedSurplus))) {
    fail(`${g} copy groups holding ${surplus} surplus rows, but the migration expects ${expectedGroups} and ${expectedSurplus} before it runs and none after. The table has moved since 2026-09-30: re-measure and set the constants before applying.`);
  }
  if (CONTROL === 'dupe' && failures === before) refuse('   CONTROL dupe changed nothing: an added exact copy must move the group count off both accepted values');
}

console.log('3) the person key migration: would update N, the same join');
{
  const head = await fetch(`${URL_}/rest/v1/player_market_values?select=id&person_key=not.is.null`, { headers: { ...HEAD, Prefer: 'count=exact', Range: '0-0' } });
  const range = head.headers.get('content-range') || '';
  const keyed = Number(range.split('/')[1]);
  if (!head.ok || !Number.isFinite(keyed)) refuse(`could not count keyed market rows (HTTP ${head.status}, content-range "${range}"); refusing to run`);
  let wouldUpdate = 0;
  if (keyed > 0) {
    /* Only names with a keyed market row can qualify; read their market rows
       (keyed and unkeyed, the join needs both) and run the file's rule. */
    const keyedRows = [];
    let after = null;
    for (let page = 0; page < 200; page += 1) {
      const cursor = after === null ? '' : `&id=gt.${after}`;
      const j = await getJson(`${URL_}/rest/v1/player_market_values?select=id,player_name&person_key=not.is.null&order=id.asc&limit=1000${cursor}`, 'keyed market rows');
      keyedRows.push(...j);
      if (j.length < 1000) break;
      after = j[j.length - 1].id;
    }
    const names = [...new Set(keyedRows.map(r => r.player_name))];
    const market = [];
    for (let i = 0; i < names.length; i += 40) {
      const list = names.slice(i, i + 40).map(n => `"${n.replace(/"/g, '\\"')}"`).join(',');
      market.push(...await getJson(`${URL_}/rest/v1/player_market_values?select=player_name,club,year,person_key&player_name=in.(${encodeURIComponent(list)})&limit=100000`, 'market rows of keyed names'));
    }
    const byName = new Map();
    for (const m of market) {
      if (!byName.has(m.player_name)) byName.set(m.player_name, []);
      byName.get(m.player_name).push(m);
    }
    for (const s of rows) {
      if (s.person_key !== null) continue;
      const ev = (byName.get(s.player_name) || []).filter(m => m.club === s.club && s.first_year <= m.year && m.year <= s.last_year);
      if (ev.length === 0) continue;
      const keys = new Set(ev.map(m => m.person_key));
      const unkeyed = ev.filter(m => m.person_key === null).length;
      if (keys.size === 1 && unkeyed === 0) wouldUpdate += 1;
    }
  }
  console.log(`   ${keyed} market rows carry a person_key; would update ${wouldUpdate} (expected_updates ${expectedUpdates}, 0 once applied)`);
  if (wouldUpdate !== 0 && wouldUpdate !== expectedUpdates) {
    fail(`would update ${wouldUpdate}, but the migration expects ${expectedUpdates}. Re-measure and set expected_updates before running it.`);
  }
}

console.log('4) the shipped code: refusals are worked out again, and a move belongs to one man');
{
  const before = failures;
  /* The grid: the cache return sits behind the refusal guard, the guard is the
     regex, and the regex really matches what the refusal writer produces. */
  if (!/const recordsRefusal = isRecomputedRefusal\(cachedVerdict\);\s*\n\s*if \(cachedVerdict && !recordsRefusal\) return json\(/.test(gridCode)) {
    fail('soccer-grid-validate serves a cached verdict without first asking whether it is a records refusal to work out again');
  }
  const guardFn = gridCode.match(/function isRecomputedRefusal\([\s\S]*?\n\}/);
  if (!guardFn) fail('soccer-grid-validate has no isRecomputedRefusal');
  else {
    if (!/RECORDS_REFUSAL\.exec\(/.test(guardFn[0])) fail('isRecomputedRefusal no longer reads the refusal regex');
    if (!/parseCriterion\(m\[1\]\)\.kind !== "wc_winner"/.test(guardFn[0])) fail('isRecomputedRefusal no longer exempts exactly the World Cup squad refusals');
  }
  const writer = gridCode.match(/const recordsRefusalReason = \(shown: string, which: string\) => (`[^`]*`);/);
  const regex = gridCode.match(/const RECORDS_REFUSAL = (\/.*\/);/);
  if (!writer || !regex) fail('the refusal writer or its regex is gone from soccer-grid-validate');
  else {
    const reasonOf = eval(`((shown, which) => ${writer[1]})`);
    const re = eval(regex[1]);
    const which = 'Played for Trabzonspor';
    const m = re.exec(reasonOf('Mohamed Salah', which));
    if (!m || m[1] !== which) fail(`RECORDS_REFUSAL does not capture the criterion out of the refusal the writer produces (${JSON.stringify(reasonOf('Mohamed Salah', which))})`);
    if (re.test('Couldn\'t verify your answer right now, please try again.')) fail('RECORDS_REFUSAL matches the unverified message, so a blip would be treated as a records refusal');
  }
  /* The grid overlay lookup refuses a merged name. */
  const gridLookup = gridCode.match(/async function overlayClubsFor\([\s\S]*?\n\}/);
  if (!gridLookup) fail('soccer-grid-validate has no async overlayClubsFor');
  else if (!/if \(identities\.size > 1\) return \[\];/.test(gridLookup[0])) fail('the grid overlay lookup no longer refuses a name whose rows are more than one man');
  else if (!/player_market_values/.test(gridLookup[0])) fail('the grid overlay lookup no longer checks the mover against his 2026 market row');
  /* Connect4: a cached no on a club half goes to the records first, and its
     overlay lookup carries the same identity guard. */
  if (!/if \(v\.valid === false\) \{\s*\n\s*if \(v\.matchesRow !== true\) provedRow = await confirmClubAttribute\(playerName, rowAttribute\);\s*\n\s*if \(v\.matchesColumn !== true\) provedCol = await confirmClubAttribute\(playerName, columnAttribute\);/.test(c4Code)) {
    fail('football-connect4-validate serves a cached pair refusal without putting its club halves to the records');
  }
  if (!/if \(!provedRow && !provedCol\) \{\s*\n\s*return new Response\(JSON\.stringify\(\{ \.\.\.v, cached: true \}\)/.test(c4Code)) {
    fail('football-connect4-validate returns the cached pair even when the records overturned a half');
  }
  if (!/if \(rowKnown === false && !provedRow\) provedRow = await confirmClubAttribute\(/.test(c4Code) || !/if \(colKnown === false && !provedCol\) provedCol = await confirmClubAttribute\(/.test(c4Code)) {
    fail('football-connect4-validate serves a cached fact of match:false on a club half without putting it to the records');
  }
  const c4Lookup = c4Code.match(/async function overlayProves\([\s\S]*?\n\}/);
  if (!c4Lookup) fail('football-connect4-validate has no overlayProves');
  else if (!/if \(identities\.size > 1\) return null;/.test(c4Lookup[0])) fail('the connect4 overlay lookup no longer refuses a name whose rows are more than one man');
  else if (!/player_market_values/.test(c4Lookup[0])) fail('the connect4 overlay lookup no longer checks the mover against his 2026 market row');
  const confirm = c4Code.match(/async function confirmClubAttribute\([\s\S]*?\n\}/);
  if (!confirm) fail('football-connect4-validate has no confirmClubAttribute');
  else if (!/return await overlayProves\(foldName\(playerName\), identities, want\);/.test(confirm[0])) fail('confirmClubAttribute no longer reaches the overlay after the table');
  console.log(`   ${failures - before} shape findings`);
  if (CONTROL === 'servedrefusal' && failures === before) refuse('   CONTROL servedrefusal changed nothing: dropping the guard must read as serving refusals');
  if (CONTROL === 'nameonly' && failures === before) refuse('   CONTROL nameonly changed nothing: dropping the identity guards must read as a name taking the move');
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else {
  console.log(failures === 0
    ? '\nsimSoccerStints: green. One list in four places, and the three migrations still describe the table.'
    : `\nsimSoccerStints: ${failures} finding(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}
