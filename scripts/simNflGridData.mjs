/* NFL answer key harness: the derived file obeys its own rules, matches its sources, and matches the record.

   Round 403 built the key from the tables the site holds; Round 404 reached
   back to 1970 through the nflverse season files and a season aware
   franchise code map. A derived file that nobody re-checks drifts the day a
   source is refreshed, so this fence holds it five ways.

   WHAT THIS HOLDS:
     1. SHAPE AND RULES. Every row has an identity (a gsis_id, or a name
        plus birth date key where the old files carry no id), a name, at
        least one team drawn from the 32 current franchise codes (pulled
        live from nfl_team_codes), a season span inside the stated coverage,
        position codes the roster files actually use, a draft value of the
        three allowed shapes, and a dup flag that is true exactly when another
        row shares the name.
     2. RECOMPUTE, A SAMPLE. Every 500th player is rebuilt through the
        generator's own buildKey from their live roster rows plus the cached
        season files; teams, seasons and titles must agree with the file.
     3. THE RECORD. Famous careers checked against facts two sources agree on
        (Pro Football Reference and NFL.com, read 2026-09-02): Brady's seven
        titles, Montana's four, Rice's three teams and three titles, Payton's
        one, Elway's two, Marino's draft slot, Warner undrafted and his 1999
        title, Manning first overall, Earl Campbell's Oilers as the Titans,
        Art Monk's three titles under the Washington name the table uses.
     4. COVERAGE SAID OUT LOUD. The file carries its coverage and rule text.
     5. THE CODE MAP IS WHAT THE FILES SAY. Every rule in
        scripts/lib/nflFranchiseCodes.mjs covers exactly a season range that
        code occupies in the 1970 to 2001 files, and every code that appears
        in two separate ranges has a rule for each, so a code cannot change
        meaning without the map knowing.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_NFLKEY_CONTROL=teams    moves one sampled player onto a team the
                                 rosters never had, in memory; section 2 must
                                 go red.
     SIM_NFLKEY_CONTROL=famous   gives Tom Brady an eighth title, in memory;
                                 section 3 must go red.
     SIM_NFLKEY_CONTROL=map      stretches the measured Cardinals range for
                                 STL by one season, in memory; section 5 must
                                 go red.
   Each control refuses to run if what it rewrites is not there, and is
   judged on its own section only.

   Needs the database for sections 1 and 2 and the cached season files
   (downloaded on first use). When the database cannot be reached it says so
   and checks nothing.

   Run: node scripts/simNflGridData.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_NFLKEY_CONTROL || '';
const FILE = path.join(ROOT, 'scripts', 'data', 'nflGridPlayers.json');
const failures = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

const gen = await import(pathToFileURL(path.join(ROOT, 'scripts', 'genNflGridData.mjs')).href);
const codesLib = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'nflFranchiseCodes.mjs')).href);
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
if (players.length < 15000) abort(`the file holds ${players.length} players, far below what 1970 to 2025 yields; NOTHING WAS CHECKED`);

const codes = await rest('nfl_team_codes?select=team_code,team_name,franchise&limit=100');
const superBowls = await rest('super_bowls?select=sb_number,year,winner&order=year.asc&limit=100');
const canon = gen.canonicalCodes(codes);
const CURRENT = new Set(Object.values(canon));
const POSITIONS = new Set(['QB', 'RB', 'FB', 'HB', 'WR', 'TE', 'OL', 'T', 'G', 'C', 'OT', 'OG', 'DL', 'DE', 'DT', 'NT', 'LB', 'ILB', 'OLB', 'MLB', 'DB', 'CB', 'S', 'SS', 'FS', 'K', 'P', 'LS', 'KR', 'PR', 'SPEC']);
const { oldRosters } = await gen.pullOldRosters();

section = 1;
console.log(`1) Shape and rules over ${players.length} players (${CURRENT.size} current franchise codes)`);
{
  const byName = new Map();
  for (const p of players) { const k = gen.normalizeName(p.name); byName.set(k, (byName.get(k) ?? 0) + 1); }
  let shown = 0;
  const bad = m => { shown += 1; if (shown <= 8) fail(m); };
  for (const p of players) {
    if (!/^\d{2}-\d{7}$/.test(String(p.id)) && !/^nb:.+\|\d{4}-\d{2}-\d{2}$/.test(String(p.id))) bad(`${p.name}: id "${p.id}" is neither a gsis_id nor a name plus birth date key`);
    if (!p.name || !p.name.trim()) bad(`${p.id}: no name`);
    if (!Array.isArray(p.teams) || p.teams.length === 0) bad(`${p.name}: no team`);
    for (const t of p.teams ?? []) if (!CURRENT.has(t)) bad(`${p.name}: team code ${t} is not a current franchise code`);
    if (!(p.seasons?.[0] >= 1970 && p.seasons?.[1] <= 2025 && p.seasons[0] <= p.seasons[1])) bad(`${p.name}: seasons ${JSON.stringify(p.seasons)} outside 1970 to 2025 or reversed`);
    for (const c of p.pos ?? []) if (!POSITIONS.has(c)) bad(`${p.name}: position code ${c} is not one the roster files use`);
    const d = p.draft;
    const okDraft = d === null || d === 'undrafted' || (d && typeof d === 'object' && Number.isFinite(d.pick) && d.pick > 0 && (d.year === null || d.year >= 1936) && (d.round === null || Number.isFinite(d.round)));
    if (!okDraft) bad(`${p.name}: draft ${JSON.stringify(d)} is not null, undrafted or {year, round, pick}`);
    for (const k of ['pass4k', 'rush1k', 'rec1k', 'sbWins']) if (!(Number.isInteger(p[k]) && p[k] >= 0)) bad(`${p.name}: ${k} is ${p[k]}`);
    const shared = (byName.get(gen.normalizeName(p.name)) ?? 0) > 1;
    if (shared !== !!p.dup) bad(`${p.name}: dup is ${p.dup} but the name is ${shared ? 'shared' : 'unique'}`);
    if (!p.display || (!shared && p.display !== p.name) || (shared && !p.display.startsWith(p.name + ' ('))) bad(`${p.name}: display "${p.display}" does not follow the display rule`);
  }
  const displays = new Set(players.map(p => p.display));
  if (displays.size !== players.length) fail(`${players.length - displays.size} display names are shared, so a guess could not tell the namesakes apart`);
  {
    /* The display rule, recomputed: the file must carry exactly what assignDisplayNames derives. */
    const copy = players.map(p => ({ ...p, display: '' }));
    gen.assignDisplayNames(copy);
    let off = 0;
    copy.forEach((c, i) => { if (c.display !== players[i].display) off += 1; });
    if (off > 0) fail(`${off} display names differ from what the display rule derives`);
  }
  if (shown > 8) fail(`${shown - 8} further shape failures beyond the eight shown`);
  console.log(`   ${players.filter(p => p.id.startsWith('nb:')).length} keyed on name plus birth date, ${players.filter(p => p.dup).length} shared names, ${players.filter(p => p.draft === 'undrafted').length} undrafted, ${players.filter(p => p.sbWins > 0).length} with a title`);
}

section = 2;
console.log('2) Recompute: every 500th player through buildKey from live rows plus the season files');
{
  const sample = players.filter((_, i) => i % 500 === 0);
  const gsisIds = sample.map(p => p.id).filter(id => !id.startsWith('nb:'));
  const rows = gsisIds.length ? await rest(`nflfastr_rosters?select=gsis_id,esb_id,full_name,birth_date,team,season,status,game_type,position,college,draft_number,draft_club,entry_year&gsis_id=in.(${gsisIds.map(encodeURIComponent).join(',')})&limit=5000`) : [];
  const rebuilt = gen.buildKey({ rosters: rows, oldRosters, stats: [], picks: [], codes, superBowls });
  const byId = new Map(rebuilt.map(p => [p.id, p]));
  let checked = 0;
  for (const p of sample) {
    let r = byId.get(p.id);
    if (!r) { fail(`${p.name} (${p.id}) rebuilt to nothing from the sources`); continue; }
    if (CONTROL === 'teams' && checked === 0) {
      const foreign = [...CURRENT].find(c => !p.teams.includes(c));
      if (!foreign) abort('control cannot run: the first sampled player is on every team');
      r = { ...r, teams: [...r.teams, foreign].sort() };
      console.log(`   NEGATIVE CONTROL ON: ${p.name} rebuilt onto ${foreign}, in memory`);
    }
    checked += 1;
    if (r.teams.join(',') !== p.teams.join(',')) fail(`${p.name}: file says ${p.teams.join(',')}, sources say ${r.teams.join(',')}`);
    if (r.seasons.join('-') !== p.seasons.join('-')) fail(`${p.name}: file seasons ${p.seasons.join('-')}, sources ${r.seasons.join('-')}`);
    if (r.sbWins !== p.sbWins) fail(`${p.name}: file titles ${p.sbWins}, sources ${r.sbWins}`);
  }
  console.log(`   ${checked} of ${sample.length} sampled players recomputed from ${rows.length} live rows and ${oldRosters.length} season file rows`);
}

section = 3;
console.log('3) The record: famous careers inside the coverage window');
{
  /* Facts two sources agree on (Pro Football Reference and NFL.com, read
     2026-09-02), restricted to what the file's coverage can see. Titles are
     counted by season: Brady 2001, 2003, 2004, 2014, 2016, 2018, 2020;
     Montana 1981, 1984, 1988, 1989; Rice 1988, 1989, 1994; Payton 1985;
     Elway 1997, 1998; Warner 1999; Manning 2006, 2015; Mahomes 2019, 2022,
     2023; Monk 1982, 1987, 1991. Brady's 4,000 yard passing seasons number
     fourteen (2005 to 2022 minus 2006, 2008, 2010, 2016); Mahomes six
     (2018 to 2023); Henry's 1,000 yard rushing seasons six (2018 to 2024
     minus 2021). Draft slots: Brady 2000 round 6 pick 199, Mahomes 2017 1st
     round 10th, Henry 2016 2nd round 45th, Manning 1998 1st overall, Montana
     1979 3rd round 82nd, Rice 1985 1st round 16th, Payton 1975 1st round
     4th, Marino 1983 1st round 27th, Elway 1983 1st overall, Campbell 1978
     1st overall, Sanders 1989 1st round 3rd, Warner undrafted 1994. Teams
     are the franchise's current code: Campbell's Oilers are TEN, Warner's
     St. Louis Rams are LA, Rice's Raiders are LV. */
  const find = (id, name) => players.find(p => p.id === id) ?? players.find(p => p.name === name && !p.dup);
  const cases = [
    { who: 'Tom Brady', id: '00-0019596', expect: { teams: ['NE', 'TB'], seasons: [2000, 2022], sbWins: 7, pass4k: 14, draft: { year: 2000, round: 6, pick: 199 } } },
    { who: 'Patrick Mahomes', expect: { teams: ['KC'], sbWins: 3, pass4k: 6, draft: { year: 2017, round: 1, pick: 10 } } },
    { who: 'Derrick Henry', expect: { teams: ['BAL', 'TEN'], rush1k: 6, draft: { year: 2016, round: 2, pick: 45 } } },
    { who: 'Kurt Warner', id: '00-0017200', expect: { teams: ['ARI', 'LA', 'NYG'], seasons: [1998, 2009], sbWins: 1, draft: 'undrafted' } },
    { who: 'Peyton Manning', expect: { teams: ['DEN', 'IND'], sbWins: 2, draft: { year: 1998, round: 1, pick: 1 } } },
    { who: 'Joe Montana', id: '00-0011493', expect: { teams: ['KC', 'SF'], seasons: [1979, 1994], sbWins: 4, draft: { year: 1979, round: 3, pick: 82 } } },
    { who: 'Jerry Rice', id: '00-0013639', expect: { teams: ['LV', 'SEA', 'SF'], seasons: [1985, 2004], sbWins: 3, draft: { year: 1985, round: 1, pick: 16 } } },
    { who: 'Walter Payton', expect: { teams: ['CHI'], seasons: [1975, 1987], sbWins: 1, draft: { year: 1975, round: 1, pick: 4 } } },
    { who: 'Dan Marino', expect: { teams: ['MIA'], seasons: [1983, 1999], sbWins: 0, draft: { year: 1983, round: 1, pick: 27 } } },
    { who: 'John Elway', expect: { teams: ['DEN'], seasons: [1983, 1998], sbWins: 2, draft: { year: 1983, round: 1, pick: 1 } } },
    { who: 'Earl Campbell', expect: { teams: ['NO', 'TEN'], seasons: [1978, 1985], draft: { year: 1978, round: 1, pick: 1 } } },
    { who: 'Barry Sanders', expect: { teams: ['DET'], seasons: [1989, 1998], draft: { year: 1989, round: 1, pick: 3 } } },
    { who: 'Art Monk', expect: { teams: ['NYJ', 'PHI', 'WAS'], sbWins: 3 } },
  ];
  let controlled = false;
  for (const c of cases) {
    let p = find(c.id, c.who);
    if (!p) { fail(`${c.who} is not in the file`); continue; }
    if (CONTROL === 'famous' && c.who === 'Tom Brady') {
      p = { ...p, sbWins: 8 };
      controlled = true;
      console.log('   NEGATIVE CONTROL ON: Tom Brady given an eighth title, in memory');
    }
    for (const [k, want] of Object.entries(c.expect)) {
      const got = p[k];
      if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${c.who}: ${k} is ${JSON.stringify(got)}, the record says ${JSON.stringify(want)}`);
    }
  }
  if (CONTROL === 'famous' && !controlled) abort('control cannot run: Tom Brady is not in the file to perturb');
  console.log(`   ${cases.length} careers checked`);
}

section = 4;
console.log('4) Coverage said out loud');
{
  if (!file.coverage?.rosters?.includes('1970')) fail('the file does not state its 1970 roster floor');
  if (!file.coverage?.stats?.includes('1999')) fail('the file does not state its 1999 stats floor');
  if (!file.rules?.teams || !file.rules?.sbWins || !file.rules?.draft || !file.rules?.identity) fail('the file does not carry its derivation rules');
  console.log(`   generated ${file.generatedOn}, rosters "${file.coverage?.rosters}"`);
}

section = 5;
console.log('5) The code map is what the season files say');
{
  const seasonsByCode = new Map();
  for (const r of oldRosters) {
    const s = Number(r.season);
    if (!seasonsByCode.has(r.team)) seasonsByCode.set(r.team, new Set());
    seasonsByCode.get(r.team).add(s);
  }
  const ranges = new Map();
  for (const [code, set] of seasonsByCode) {
    const s = [...set].sort((a, b) => a - b);
    const out = [];
    let start = s[0], prev = s[0];
    for (const y of s.slice(1)) { if (y === prev + 1) { prev = y; continue; } out.push([start, prev]); start = y; prev = y; }
    out.push([start, prev]);
    ranges.set(code, out);
  }
  if (CONTROL === 'map') {
    const stl = ranges.get('STL');
    if (!stl || stl[0][1] !== 1987) abort('control cannot run: STL does not end its first range in 1987 in the files');
    stl[0][1] = 1988;
    console.log('   NEGATIVE CONTROL ON: the measured Cardinals range for STL stretched to 1988, in memory');
  }
  for (const rule of codesLib.HISTORICAL_CODE_RULES) {
    const have = ranges.get(rule.code) ?? [];
    if (!have.some(([a, b]) => a === rule.from && b === rule.to)) fail(`${rule.code} ${rule.from} to ${rule.to} (${rule.note}) is not a range the files carry; they carry ${have.map(r => r.join(' to ')).join(', ') || 'nothing'}`);
  }
  for (const [code, list] of ranges) {
    if (list.length < 2) continue;
    for (const [a, b] of list) {
      if (!codesLib.HISTORICAL_CODE_RULES.some(r => r.code === code && r.from === a && r.to === b)) fail(`${code} occupies ${a} to ${b} and ${list.length - 1} other range(s) but the map has no rule for that range`);
    }
  }
  console.log(`   ${codesLib.HISTORICAL_CODE_RULES.length} rules against ${ranges.size} codes`);
}

const own = { teams: 2, famous: 3, map: 5 }[CONTROL];
const total = failures[1] + failures[2] + failures[3] + failures[4] + failures[5];
if (CONTROL) {
  if (!own) abort(`unknown control "${CONTROL}" (teams, famous, map)`);
  if (failures[own] > 0) { console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) { console.error(`\nsimNflGridData: ${total} failure(s)`); process.exit(1); }
console.log('\nsimNflGridData: green. The key obeys its rules, matches its sources, and matches the record.');
