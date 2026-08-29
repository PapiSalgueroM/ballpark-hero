/**
 * Round 312 harness: an era save's world is alive, listed honestly, and its
 * Champions League sends up the clubs that earned it.
 *
 * Anthony found all three on 2026-08-28, three matches into a 2005/06
 * Barcelona save:
 *
 *   1. Every OTHER league's table read "pre-season, alphabetical order" with
 *      zero points after a transfer window had passed. Cause: syncWorld
 *      iterated REAL_LEAGUES, whose ids (premier, laliga...) never match an
 *      era world's (premier2005, laliga2005...), so the era world never
 *      advanced one round in the game's whole history.
 *   2. The league picker offered the entire modern set in an era save,
 *      including a SECOND La Liga with no points (the modern def, same name,
 *      different id, never simulated).
 *   3. The projected quarter finals excluded his second placed club while
 *      the engine's own rule (pos <= 2 at matchday 6) would send it through,
 *      because the field took group winners only and filled the rest from a
 *      pool of clubs that finished nowhere.
 *
 * What this holds, era save and modern control both driven through the
 * engine's own loop (startCareer + playNextEntry), never a hand built state:
 *
 *   1. ERA WORLD ADVANCES. After the season, every league in the era world
 *      has played to its own final round and every table row carries games.
 *   2. MODERN WORLD STILL ADVANCES (the control the fix must not break).
 *   3. THE PICKER LIST is the save's own world: era ids only, no duplicate
 *      league names, and the modern save still lists the full modern set.
 *   4. THE QUALIFIERS: at group stage end the real QF field is exactly the
 *      groups' top twos (no pool club when the groups can supply eight), and
 *      a doctored mid-group table with my club second still projects my club
 *      into the bracket, never paired inside its own group.
 *   5. SOURCE SHAPE: syncWorld's loop reads worldLeagueDefs, checked on the
 *      comment stripped source.
 *   6. THE FLAGS: every league id in every era of ERA_LEAGUES has a nation
 *      in LEAGUE_NATIONS (Round 312 added the era ids by hand), so the next
 *      era added without one goes red instead of shipping flagless in the
 *      world tables picker. Checked on the real exported values, never on
 *      the source text.
 *
 * NEGATIVE CONTROL: WORLD_CONTROL=modern rewrites the in memory source back
 * to the pre-312 REAL_LEAGUES loop (asserting the fixed string was present
 * first) and section 5 must go red. WORLD_CONTROL=flagless plants an era
 * league id with no LEAGUE_NATIONS entry into the imported tables (refusing
 * to run if the id already exists anywhere) and section 6 must go red.
 *
 * Run: node scripts/simEraWorldTables.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'eraWorldEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'eraWorld.bundle.mjs');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.WORLD_CONTROL || '';
if (CONTROL && CONTROL !== 'modern' && CONTROL !== 'flagless' && CONTROL !== 'field') { console.error(`WORLD_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const m = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const { startCareer, playNextEntry, sortedTable, worldLeagueDefs, projectedUclBracket, ERA_LEAGUES, REAL_LEAGUES, leagueRounds, careerLeagueOf, LEAGUE_NATIONS, ERA_UCL_FIELDS } = m;
`);
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { startCareer, playNextEntry, sortedTable, worldLeagueDefs, projectedUclBracket, ERA_LEAGUES, REAL_LEAGUES, leagueRounds, careerLeagueOf, LEAGUE_NATIONS, ERA_UCL_FIELDS } = await import(pathToFileURL(BUNDLE).href);

const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

const playSeason = (state) => {
  let s = state;
  for (let i = 0; i < 80; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
};

console.log('1) the era world plays its own season');
Math.random = seeded(41);
let era = startCareer('Barcelona', 'era2005');
era = playSeason(era);
{
  const worldIds = Object.keys(era.world ?? {});
  if (!worldIds.length) fail('the 2005 era save has no world at all');
  for (const id of worldIds) {
    const w = era.world[id];
    const def = (ERA_LEAGUES.era2005 ?? []).find(l => l.id === id);
    if (!def) { fail(`world league ${id} is not a 2005 era league`); continue; }
    const total = leagueRounds(def.clubs.length);
    if (w.round < total) fail(`${id} played ${w.round} of ${total} rounds over a full season (the pre-312 number was 0)`);
    const games = w.table.reduce((n, r) => n + r.w + r.d + r.l, 0);
    if (games === 0) fail(`${id}'s table has zero games played after a full season`);
    const pts = w.table.reduce((n, r) => n + r.pts, 0);
    if (pts === 0) fail(`${id}'s table has zero points after a full season`);
  }
  console.log(`   ${worldIds.length} era world league(s) at full distance with real tables`);
}

console.log('2) the modern world still advances (control)');
{
  Math.random = seeded(43);
  let mod = startCareer('Arsenal');
  mod = playSeason(mod);
  const ids = Object.keys(mod.world ?? {});
  const stuck = ids.filter(id => (mod.world[id]?.round ?? 0) === 0);
  if (!ids.length) fail('the modern save has no world');
  if (stuck.length) fail(`modern world leagues stuck at round zero after a season: ${stuck.join(', ')}`);
  console.log(`   ${ids.length} modern world leagues all moved`);
}

console.log('3) the picker offers this save\'s world and nothing else');
{
  const eraDefs = worldLeagueDefs({ eraId: 'era2005' });
  const eraIds = new Set((ERA_LEAGUES.era2005 ?? []).map(l => l.id));
  for (const l of eraDefs) if (!eraIds.has(l.id)) fail(`worldLeagueDefs offers ${l.id} in a 2005 era save`);
  if (eraDefs.length !== eraIds.size) fail(`worldLeagueDefs offers ${eraDefs.length} leagues where the 2005 era has ${eraIds.size}`);
  // The card's own list build: my league first, the rest filtered by id.
  const myLeague = careerLeagueOf({ clubName: 'Barcelona', eraId: 'era2005' });
  const picker = [myLeague, ...eraDefs.filter(l => l.id !== myLeague.id)];
  const names = picker.map(l => l.name);
  if (new Set(names).size !== names.length) fail(`the era picker repeats a league name: ${names.join(', ')}`);
  const modernDefs = worldLeagueDefs({ eraId: undefined });
  if (modernDefs.length !== REAL_LEAGUES.length) fail(`the modern picker lists ${modernDefs.length} leagues where the game has ${REAL_LEAGUES.length}`);
  console.log(`   era picker: ${names.join(', ')}; modern picker: ${modernDefs.length} leagues`);
}

console.log('4) the knockout field is the clubs that earned it');
{
  // The season played in section 1 finished its group stage; the bracket
  // must be drawn from the groups' top twos, not from the pool.
  const bracket = era.uclBracket ?? [];
  const qf = bracket.filter(t => t.round === 'QF');
  if (!era.uclGroup) fail('2005 Barcelona did not have a Champions League group at all');
  if (!qf.length) fail('no quarter final ties exist after a full season');
  const topTwos = new Set();
  if (era.uclGroup) for (const r of sortedTable(era.uclGroup.table).slice(0, 2)) topTwos.add(r.club);
  for (const g of era.uclWorld ?? []) for (const r of sortedTable(g.table).slice(0, 2)) topTwos.add(r.club);
  const groupCount = 1 + (era.uclWorld?.length ?? 0);
  const names = qf.flatMap(t => [t.home, t.away]);
  if (new Set(names).size !== names.length) fail(`a club appears twice in the quarter finals: ${names.join(', ')}`);
  if (topTwos.size >= 8) {
    for (const n of names) if (!topTwos.has(n)) fail(`${n} is in the quarter finals without finishing top two of a group`);
  }
  console.log(`   ${groupCount} groups sent up ${names.length} quarter finalists, all from the top twos`);

  // A doctored mid-group state: my club second, projection must include it
  // and never pair a club against its own group.
  const mid = JSON.parse(JSON.stringify(era));
  mid.uclBracket = null;
  mid.uclKoRound = null;
  mid.uclGroup.matchday = 4;
  mid.uclGroup.table.forEach((r, i) => { r.pts = [12, 9, 3, 1][i] ?? 0; r.w = r.pts / 3; r.d = 0; r.l = 4 - r.w; r.gf = 8 - i; r.ga = i; });
  const meSecond = sortedTable(mid.uclGroup.table)[1]?.club;
  mid.uclGroup.table.forEach(r => { if (r.club === mid.clubName) { r.pts = 9; r.w = 3; } else if (r.pts === 9) { r.pts = 12; r.w = 4; } });
  const proj = projectedUclBracket(mid) ?? [];
  if (!proj.length) fail('no projection mid groups');
  if (!proj.some(p => p.home === mid.clubName || p.away === mid.clubName)) {
    fail(`a second placed ${mid.clubName} is missing from the projected bracket (the reported bug)`);
  }
  const groupsByClub = new Map();
  sortedTable(mid.uclGroup.table).forEach(r => groupsByClub.set(r.club, 'A'));
  for (const g of mid.uclWorld ?? []) for (const c of g.clubs) groupsByClub.set(c, g.letter);
  for (const p of proj) {
    if (groupsByClub.get(p.home) && groupsByClub.get(p.home) === groupsByClub.get(p.away)) {
      fail(`projected tie ${p.home} v ${p.away} pairs a group against itself`);
    }
  }
  console.log(`   projection carries the second placed club (checked as ${meSecond ?? mid.clubName}) and never pairs a group with itself`);
}

console.log('5) the source shape that keeps it fixed');
{
  let src = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8');
  if (CONTROL === 'modern') {
    const fixed = 'for (const lg of worldLeagueDefs(state)) {';
    if (!src.includes(fixed)) { console.error('control found nothing to break: the fixed loop is not in the source'); process.exit(1); }
    src = src.replace(fixed, 'for (const lg of REAL_LEAGUES.map(effectiveLeague)) {');
    console.log('   NEGATIVE CONTROL ON: syncWorld\'s loop rewritten to the pre-312 shape in memory, this section must go red');
  }
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const syncStart = stripped.indexOf('function syncWorld');
  const body = syncStart >= 0 ? stripped.slice(syncStart, stripped.indexOf('\nfunction ', syncStart + 10)) : '';
  if (!body) fail('cannot find syncWorld in clubManager.ts');
  else if (!/for \(const lg of worldLeagueDefs\(state\)\)/.test(body)) {
    fail('syncWorld does not iterate worldLeagueDefs(state), so era worlds will freeze again');
  }
  console.log('   syncWorld iterates the era aware league list');
}

console.log('6) every era league id has a nation for its flag');
{
  if (CONTROL === 'flagless') {
    const plantEra = 'era2005';
    const plantId = 'bundesliga2005';
    const already = Object.values(ERA_LEAGUES).flat().some(l => l.id === plantId) || plantId in LEAGUE_NATIONS;
    if (!ERA_LEAGUES[plantEra] || already) { console.error(`control found nothing to plant: ${plantId} already exists or ${plantEra} does not`); process.exit(1); }
    ERA_LEAGUES[plantEra].push({ id: plantId, name: 'Bundesliga', cupName: 'DFB-Pokal', euro: true, clubs: [] });
    console.log(`   NEGATIVE CONTROL ON: ${plantId} planted into ${plantEra} with no LEAGUE_NATIONS entry, this section must go red`);
  }
  let checked = 0;
  for (const [eraId, leagues] of Object.entries(ERA_LEAGUES)) {
    for (const lg of leagues) {
      checked += 1;
      const nation = LEAGUE_NATIONS[lg.id];
      if (typeof nation !== 'string' || !nation.trim()) {
        fail(`${eraId}'s ${lg.id} has no nation in LEAGUE_NATIONS, so the world tables picker ships it flagless`);
      }
    }
  }
  if (checked === 0) fail('ERA_LEAGUES has no leagues at all, this check ran on nothing');
  console.log(`   ${checked} era league id(s) checked against LEAGUE_NATIONS`);
}

console.log('7) the verified Champions League fields, and the full eight group draw');
{
  /* Round 342. Each era's group stage was 32 named clubs, two-source
     researched with an adversarial re-check; this section holds the shipped
     tables to the shape only a real 32 team season can have, proves the
     spellings actually hit the baked rosters, and proves the era save now
     draws all eight groups instead of the starved four the review found.
     WORLD_CONTROL=field misspells one in-league entry in memory (the exact
     drift a careless edit would cause) and the pinned in-league counts must
     go red. */
  if (CONTROL === 'field') {
    const row = (ERA_UCL_FIELDS.era2010 ?? []).find(e => e.name === 'Tottenham');
    if (!row) { console.error('control found nothing to misspell: era2010 has no Tottenham entry'); process.exit(1); }
    row.name = 'Tottenham Hotspur';
    console.log('   NEGATIVE CONTROL ON: era2010 Tottenham misspelled in memory, the pinned in-league count must go red');
  }
  /* every 32 team Champions League season has exactly this finish shape */
  const WANT_FINISH = { winner: 1, runner_up: 1, semi_final: 2, quarter_final: 4, round_of_16: 8, group_stage: 16 };
  /* the documented number of field members that come from the era's own
     baked leagues, which is exactly what a misspelling silently lowers */
  const IN_LEAGUE = { era2005: 8, era2010: 7, era2015: 11 };
  let erasChecked = 0;
  for (const [eraId, field] of Object.entries(ERA_UCL_FIELDS)) {
    erasChecked += 1;
    if (field.length !== 32) fail(`${eraId}'s field has ${field.length} clubs, a group stage is 32`);
    const names = field.map(e => e.name);
    if (new Set(names).size !== names.length) fail(`${eraId}'s field repeats a club`);
    const dist = {};
    for (const e of field) dist[e.finish] = (dist[e.finish] ?? 0) + 1;
    for (const [fin, want] of Object.entries(WANT_FINISH)) {
      if ((dist[fin] ?? 0) !== want) fail(`${eraId} has ${dist[fin] ?? 0} ${fin} where a real season has ${want}`);
    }
    const baked = new Set((ERA_LEAGUES[eraId] ?? []).flatMap(l => l.clubs));
    const inLeague = names.filter(n => baked.has(n)).length;
    if (inLeague !== IN_LEAGUE[eraId]) {
      fail(`${eraId}'s field matches ${inLeague} baked club names where the season had ${IN_LEAGUE[eraId]}, a spelling drifted off the rosters`);
    }
  }
  if (erasChecked === 0) fail('ERA_UCL_FIELDS is empty, this section ran on nothing');
  /* the played 2005 save from section 1: the real eight group draw */
  const world = era.uclWorld ?? [];
  if (!era.uclGroup) fail('2005 Barcelona has no Champions League group, so the draw was never built');
  if (world.length !== 7) fail(`the 2005 save drew ${world.length} AI groups where the field supports 7 (eight with mine, the review's number was 3)`);
  const fieldNames = new Set((ERA_UCL_FIELDS.era2005 ?? []).map(e => e.name));
  const seen = new Set([era.clubName, ...(era.uclGroup?.opponents ?? [])]);
  for (const g of world) {
    if (g.clubs.length !== 4) fail(`group ${g.letter} has ${g.clubs.length} clubs, a group is 4`);
    for (const c of g.clubs) {
      if (!fieldNames.has(c)) fail(`group ${g.letter}'s ${c} is not in the verified 2005-06 field`);
      if (seen.has(c)) fail(`${c} appears in two groups at once`);
      seen.add(c);
    }
  }
  console.log(`   ${erasChecked} era field(s) held to the 32 club shape, and the 2005 save drew ${1 + world.length} groups of 4`);
}

console.log('');
if (CONTROL === 'modern') {
  if (failures > 0) { console.log(`simEraWorldTables control: green. The rewritten loop was reported (${failures} finding).`); process.exit(0); }
  console.error('simEraWorldTables control: RED. The pre-312 loop went unreported.'); process.exit(1);
}
if (CONTROL === 'flagless') {
  if (failures > 0) { console.log(`simEraWorldTables control: green. The planted flagless era league was reported (${failures} finding).`); process.exit(0); }
  console.error('simEraWorldTables control: RED. An era league with no nation went unreported.'); process.exit(1);
}
if (CONTROL === 'field') {
  if (failures > 0) { console.log(`simEraWorldTables control: green. The misspelled field entry was reported (${failures} finding).`); process.exit(0); }
  console.error('simEraWorldTables control: RED. A field spelling that misses the rosters went unreported.'); process.exit(1);
}
if (failures > 0) { console.error(`simEraWorldTables: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simEraWorldTables: green. Era worlds play, the picker lists the truth, and the knockout takes the top twos.');
