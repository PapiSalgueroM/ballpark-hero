/* NFL answer key harness: the derived file obeys its own rules, matches the live tables, and matches the record.

   Round 403, phase 2 of docs/designs/NFL-GRID-ENGINE-DESIGN.md.
   scripts/genNflGridData.mjs derives scripts/data/nflGridPlayers.json from the
   roster, draft, stat and Super Bowl tables. A derived file that nobody
   re-checks drifts the day a source table is refreshed, so this fence holds
   it three ways.

   WHAT THIS HOLDS:
     1. SHAPE AND RULES. Every row has a gsis_id, a name, at least one team
        drawn from the 32 current franchise codes (pulled live from
        nfl_team_codes), a season span inside the stated coverage, position
        codes the roster table actually uses, a draft value of the three
        allowed shapes, and a dup flag that is true exactly when another row
        shares the name.
     2. LIVE RECOMPUTE, A SAMPLE. Every 500th player's roster rows are pulled
        again and the generator's own buildKey recomputes teams, seasons and
        Super Bowl wins for them; the file must agree. One request, no
        guessing, and the same code path the generator ran.
     3. THE RECORD. Famous careers checked against facts two sources agree on
        (Pro Football Reference and NFL.com, read 2026-09-02), each fact
        inside the file's stated coverage: Tom Brady's six titles from 2002
        on, Patrick Mahomes' three, Peyton Manning's two, Derrick Henry's six
        1,000 yard seasons, Kurt Warner undrafted, Manning first overall.
     4. COVERAGE SAID OUT LOUD. The file carries its coverage and rule text,
        so a consumer cannot read it without meeting the 2002 floor.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_NFLKEY_CONTROL=teams    moves one sampled player onto a team the
                                 rosters never had, in memory; section 2 must
                                 go red.
     SIM_NFLKEY_CONTROL=famous   gives Tom Brady a seventh title inside the
                                 coverage window, in memory; section 3 must go
                                 red.
   Each control refuses to run if what it rewrites is not there, and is
   judged on its own section only.

   Needs the database for sections 1 and 2. When it cannot be reached it says
   so and checks nothing.

   Run: node scripts/simNflGridData.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_NFLKEY_CONTROL || '';
const FILE = path.join(ROOT, 'scripts', 'data', 'nflGridPlayers.json');
const failures = { 1: 0, 2: 0, 3: 0, 4: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

const gen = await import(pathToFileURL(path.join(ROOT, 'scripts', 'genNflGridData.mjs')).href);
const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEADERS = { apikey: KEY, authorization: `Bearer ${KEY}` };
async function rest(pathAndQuery) {
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let res;
    try { res = await fetch(`${URL_}/rest/v1/${pathAndQuery}`, { headers: HEADERS }); }
    catch (err) { last = `unreachable (${String(err).slice(0, 80)})`; res = null; }
    if (res && res.ok) return res.json();
    if (res) last = `HTTP ${res.status}`;
    if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
  }
  abort(`\nSUPABASE ${last} for ${pathAndQuery.slice(0, 120)} after 3 attempts. NOTHING WAS CHECKED.`);
}

if (!fs.existsSync(FILE)) abort('scripts/data/nflGridPlayers.json is missing; run node scripts/genNflGridData.mjs');
const file = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const players = file.players ?? [];
if (players.length < 10000) abort(`the file holds ${players.length} players, far below the 14,000 the roster table yields; NOTHING WAS CHECKED`);

const codes = await rest('nfl_team_codes?select=team_code,team_name,franchise&limit=100');
const superBowls = await rest('super_bowls?select=sb_number,year,winner&order=year.asc&limit=100');
const canon = gen.canonicalCodes(codes);
const CURRENT = new Set(Object.values(canon));
const POSITIONS = new Set(['QB', 'RB', 'FB', 'HB', 'WR', 'TE', 'OL', 'T', 'G', 'C', 'OT', 'OG', 'DL', 'DE', 'DT', 'NT', 'LB', 'ILB', 'OLB', 'MLB', 'DB', 'CB', 'S', 'SS', 'FS', 'K', 'P', 'LS', 'KR', 'PR']);

section = 1;
console.log(`1) Shape and rules over ${players.length} players (${CURRENT.size} current franchise codes)`);
{
  const byName = new Map();
  for (const p of players) { const k = gen.normalizeName(p.name); byName.set(k, (byName.get(k) ?? 0) + 1); }
  let shown = 0;
  const bad = m => { shown += 1; if (shown <= 8) fail(m); };
  for (const p of players) {
    if (!/^\d{2}-\d{7}$/.test(String(p.id))) bad(`${p.name}: id "${p.id}" is not a gsis_id`);
    if (!p.name || !p.name.trim()) bad(`${p.id}: no name`);
    if (!Array.isArray(p.teams) || p.teams.length === 0) bad(`${p.name}: no team`);
    for (const t of p.teams ?? []) if (!CURRENT.has(t)) bad(`${p.name}: team code ${t} is not a current franchise code`);
    if (!(p.seasons?.[0] >= 2002 && p.seasons?.[1] <= 2025 && p.seasons[0] <= p.seasons[1])) bad(`${p.name}: seasons ${JSON.stringify(p.seasons)} outside 2002 to 2025 or reversed`);
    for (const c of p.pos ?? []) if (!POSITIONS.has(c)) bad(`${p.name}: position code ${c} is not one the roster table uses`);
    const d = p.draft;
    const okDraft = d === null || d === 'undrafted' || (d && typeof d === 'object' && Number.isFinite(d.pick) && d.pick > 0 && (d.year === null || d.year >= 1936) && (d.round === null || Number.isFinite(d.round)));
    if (!okDraft) bad(`${p.name}: draft ${JSON.stringify(d)} is not null, undrafted or {year, round, pick}`);
    for (const k of ['pass4k', 'rush1k', 'rec1k', 'sbWins']) if (!(Number.isInteger(p[k]) && p[k] >= 0)) bad(`${p.name}: ${k} is ${p[k]}`);
    const shared = (byName.get(gen.normalizeName(p.name)) ?? 0) > 1;
    if (shared !== !!p.dup) bad(`${p.name}: dup is ${p.dup} but the name is ${shared ? 'shared' : 'unique'}`);
  }
  if (shown > 8) fail(`${shown - 8} further shape failures beyond the eight shown`);
  console.log(`   ${players.filter(p => p.dup).length} shared names, ${players.filter(p => p.draft === 'undrafted').length} undrafted, ${players.filter(p => p.sbWins > 0).length} with a title`);
}

section = 2;
console.log('2) Live recompute: every 500th player against the roster table');
{
  const sample = players.filter((_, i) => i % 500 === 0);
  const ids = sample.map(p => p.id);
  const rows = await rest(`nflfastr_rosters?select=gsis_id,full_name,team,season,status,game_type,position,college,draft_number,draft_club,entry_year&gsis_id=in.(${ids.map(encodeURIComponent).join(',')})&limit=5000`);
  if (rows.length < sample.length) abort(`the roster table answered ${rows.length} rows for ${sample.length} sampled players; NOTHING WAS CHECKED`);
  const rebuilt = gen.buildKey({ rosters: rows, stats: [], picks: [], codes, superBowls });
  const byId = new Map(rebuilt.map(p => [p.id, p]));
  let checked = 0;
  for (const p of sample) {
    let r = byId.get(p.id);
    if (!r) { fail(`${p.name} (${p.id}) rebuilt to nothing from the live rows`); continue; }
    if (CONTROL === 'teams' && checked === 0) {
      const foreign = [...CURRENT].find(c => !p.teams.includes(c));
      if (!foreign) abort('control cannot run: the first sampled player is on every team');
      r = { ...r, teams: [...r.teams, foreign].sort() };
      console.log(`   NEGATIVE CONTROL ON: ${p.name} rebuilt onto ${foreign}, in memory`);
    }
    checked += 1;
    if (r.teams.join(',') !== p.teams.join(',')) fail(`${p.name}: file says ${p.teams.join(',')}, live rows say ${r.teams.join(',')}`);
    if (r.seasons.join('-') !== p.seasons.join('-')) fail(`${p.name}: file seasons ${p.seasons.join('-')}, live ${r.seasons.join('-')}`);
    if (r.sbWins !== p.sbWins) fail(`${p.name}: file titles ${p.sbWins}, live ${r.sbWins}`);
  }
  console.log(`   ${checked} of ${sample.length} sampled players recomputed from ${rows.length} live rows`);
}

section = 3;
console.log('3) The record: famous careers inside the coverage window');
{
  /* Facts two sources agree on (Pro Football Reference and NFL.com, read
     2026-09-02), restricted to what the file's coverage can see. Brady won
     seven Super Bowls; the 2001 season is before the roster table starts, so
     inside 2002 to 2025 the count is six (2003, 2004, 2014, 2016, 2018, 2020
     seasons). Brady's 4,000 yard passing seasons: 2005, 2007, 2009, 2011,
     2012, 2013, 2014, 2015, 2017, 2018, 2019, 2020, 2021, 2022, fourteen.
     Mahomes: titles in the 2019, 2022 and 2023 seasons; 4,000 yard seasons
     2018 to 2023, six, with 2024 below at 3,928. Henry: 1,000 yard rushing
     seasons 2018, 2019, 2020, 2022, 2023, 2024, six (2021 was 937). Warner:
     undrafted in 1994, Rams, Giants, Cardinals. Manning: first overall in
     1998, titles in the 2006 (Colts) and 2015 (Broncos) seasons. */
  const find = (id, name) => players.find(p => p.id === id) ?? players.find(p => p.name === name && !p.dup);
  const cases = [
    { who: 'Tom Brady', id: '00-0019596', expect: { teams: ['NE', 'TB'], seasons: [2002, 2022], sbWins: 6, pass4k: 14, draft: { year: 2000, round: 6, pick: 199 } } },
    { who: 'Patrick Mahomes', expect: { teams: ['KC'], sbWins: 3, pass4k: 6, draft: { year: 2017, round: 1, pick: 10 } } },
    { who: 'Derrick Henry', expect: { teams: ['BAL', 'TEN'], rush1k: 6, draft: { year: 2016, round: 2, pick: 45 } } },
    { who: 'Kurt Warner', id: '00-0017200', expect: { teams: ['ARI', 'LA', 'NYG'], seasons: [2002, 2009], draft: 'undrafted' } },
    { who: 'Peyton Manning', expect: { teams: ['DEN', 'IND'], sbWins: 2, draft: { year: 1998, round: 1, pick: 1 } } },
  ];
  let controlled = false;
  for (const c of cases) {
    let p = find(c.id, c.who);
    if (!p) { fail(`${c.who} is not in the file`); continue; }
    if (CONTROL === 'famous' && c.who === 'Tom Brady') {
      p = { ...p, sbWins: 7 };
      controlled = true;
      console.log('   NEGATIVE CONTROL ON: Tom Brady given a seventh title inside the window, in memory');
    }
    for (const [k, want] of Object.entries(c.expect)) {
      const got = p[k];
      const same = JSON.stringify(got) === JSON.stringify(want);
      if (!same) fail(`${c.who}: ${k} is ${JSON.stringify(got)}, the record says ${JSON.stringify(want)}`);
    }
  }
  if (CONTROL === 'famous' && !controlled) abort('control cannot run: Tom Brady is not in the file to perturb');
  console.log(`   ${cases.length} careers checked`);
}

section = 4;
console.log('4) Coverage said out loud');
{
  if (!file.coverage?.rosters?.includes('2002')) fail('the file does not state its 2002 roster floor');
  if (!file.rules?.teams || !file.rules?.sbWins || !file.rules?.draft) fail('the file does not carry its derivation rules');
  console.log(`   generated ${file.generatedOn}, rosters "${file.coverage?.rosters}"`);
}

const own = { teams: 2, famous: 3 }[CONTROL];
const total = failures[1] + failures[2] + failures[3] + failures[4];
if (CONTROL) {
  if (!own) abort(`unknown control "${CONTROL}" (teams, famous)`);
  if (failures[own] > 0) { console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) { console.error(`\nsimNflGridData: ${total} failure(s)`); process.exit(1); }
console.log('\nsimNflGridData: green. The key obeys its rules, matches the rosters, and matches the record.');
