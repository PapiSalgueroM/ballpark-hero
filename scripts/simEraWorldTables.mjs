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
 *   4. THE QUALIFIERS: at group stage end the knockout field is exactly the
 *      groups' top twos in the COMPETITION'S OWN ORDER (no pool club when
 *      the groups can supply eight), and a doctored mid-group table with my
 *      club second still projects my club into the bracket, never paired
 *      inside its own group.
 *
 *      Round 505 gate pass: the top twos are read through sortedUclGroup,
 *      the order the engine seeds the round of 16 from, and no longer
 *      through the bare sortedTable. A 2005 group splits level points on
 *      the games between the clubs first (src/lib/clubManagerUclGroups.ts
 *      carries the regulations, Round 478) and the bare sort splits them on
 *      goal difference, so the two orders disagree whenever a club level on
 *      points won the head to head and lost the goal difference. On this
 *      harness's fixed seed that is Juventus in Group F: level with Club
 *      Brugge on 8 points, 1-0 and 3-2 in the two meetings, goal difference
 *      minus 8 against 0. The engine sent Juventus up, which is the rule,
 *      and the old check called it a club that had not earned it. The Round
 *      504 engine drew a stream with no such split and the same check was
 *      green, so the check was a coin toss that the stream happened to win.
 *      Every level pair is now also held against the engine's own ledger of
 *      the games between the two clubs, so the section is not only the
 *      engine agreeing with itself, and where the era has a round of 16 the
 *      sixteen in it must be exactly the top twos.
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
 * WORLD_CONTROL=gdfield bundles an engine copy whose round of 16 field is
 * seeded from the bare goal difference order (asserting the fixed line was
 * present exactly once, and refusing to pass if no group on this stream
 * splits the two orders, so the control cannot be green for having changed
 * nothing) and section 4 must go red.
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
if (CONTROL && CONTROL !== 'modern' && CONTROL !== 'flagless' && CONTROL !== 'field' && CONTROL !== 'gdfield') { console.error(`WORLD_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const ENGINE = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
let enginePath = ENGINE.replaceAll('\\', '/');
if (CONTROL === 'gdfield') {
  /* The round of 16 field seeded from the bare sort, the order a group table
     reads when the competition's rule is forgotten. Refuses to run if the
     fixed line is not there, exactly once, to break. */
  const src = fs.readFileSync(ENGINE, 'utf8');
  const fixed = 'const rows = sortedUclGroup(state, g.table).map(r => r.club);';
  if (src.split(fixed).length !== 2) { console.error('control cannot run: the round of 16 field line is not in clubManager.ts in the shape gdfield rewrites'); process.exit(1); }
  enginePath = path.join(os.tmpdir(), 'eraWorld.gdfield.ts').replaceAll('\\', '/');
  fs.writeFileSync(enginePath, src.replace(fixed, 'const rows = sortedTable(g.table).map(r => r.club);'));
  console.log('NEGATIVE CONTROL ON: the round of 16 field is seeded from the bare goal difference order in memory, section 4 must go red');
}
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const m = await import('${enginePath}');
export const { startCareer, playNextEntry, sortedTable, sortedUclGroup, worldLeagueDefs, projectedUclBracket, ERA_LEAGUES, REAL_LEAGUES, leagueRounds, careerLeagueOf, LEAGUE_NATIONS, ERA_UCL_FIELDS } = m;
`);
/* The @ alias is spelled out so a control copy of the engine written to the
   temp dir resolves its imports back to this tree's src. */
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --alias:@=${path.join(ROOT, 'src').replaceAll('\\', '/')} --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { startCareer, playNextEntry, sortedTable, sortedUclGroup, worldLeagueDefs, projectedUclBracket, ERA_LEAGUES, REAL_LEAGUES, leagueRounds, careerLeagueOf, LEAGUE_NATIONS, ERA_UCL_FIELDS } = await import(pathToFileURL(BUNDLE).href);

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
  /* The top twos in the competition's own order, which is the order the
     engine seeds the round of 16 from (uclRoundOf16Field reads
     sortedUclGroup). The bare sortedTable splits level points on goal
     difference and a 2005 group splits them on the games between the clubs,
     so the two can disagree on who finished second; the harness read the
     bare order until the Round 505 gate pass and called Juventus a club
     that had not earned its place. */
  const groups = [];
  if (era.uclGroup) groups.push({ letter: 'A', table: era.uclGroup.table });
  for (const g of era.uclWorld ?? []) groups.push({ letter: g.letter, table: g.table });
  const topTwos = new Set();
  const groupOf = new Map();
  let splitGroups = 0, levelPairs = 0;
  const ledger = era.pairResults?.uclGroups ?? {};
  if (!Object.keys(ledger).length) fail('the group stage ledger (pairResults.uclGroups) is empty after a full season, so the head to head check below ran on nothing');
  for (const g of groups) {
    const rule = sortedUclGroup(era, g.table).map(r => r.club);
    const bare = sortedTable(g.table).map(r => r.club);
    for (const c of rule.slice(0, 2)) topTwos.add(c);
    for (const c of rule) groupOf.set(c, g.letter);
    if (rule.slice(0, 2).join('|') !== bare.slice(0, 2).join('|')) splitGroups += 1;
    /* Independent of either sort: a club placed above a club it is level
       with must have taken at least as many points off it over the two games
       between them, read from the engine's own ledger. */
    for (let i = 0; i + 1 < rule.length; i++) {
      const a = g.table.find(r => r.club === rule[i]);
      const b = g.table.find(r => r.club === rule[i + 1]);
      if (!a || !b || a.pts !== b.pts) continue;
      const ab = ledger[`${a.club}|${b.club}`];
      const ba = ledger[`${b.club}|${a.club}`];
      if (!ab || !ba) continue;
      levelPairs += 1;
      const pts = (f, ag) => (f > ag ? 3 : f === ag ? 1 : 0);
      const ptsA = pts(ab[0], ab[1]) + pts(ba[1], ba[0]);
      const ptsB = pts(ab[1], ab[0]) + pts(ba[0], ba[1]);
      if (ptsA < ptsB) fail(`group ${g.letter}: ${a.club} is placed above ${b.club} on level points with fewer head to head points (${ptsA} v ${ptsB})`);
    }
  }
  if (CONTROL === 'gdfield' && splitGroups === 0) { console.error('control found nothing to change: no group on this stream splits the two orders, so a field seeded from either would look the same'); process.exit(1); }
  const groupCount = groups.length;
  const r16 = bracket.filter(t => t.round === 'R16');
  const names = qf.flatMap(t => [t.home, t.away]);
  if (new Set(names).size !== names.length) fail(`a club appears twice in the quarter finals: ${names.join(', ')}`);
  if (topTwos.size >= 8) {
    if (r16.length) {
      /* An era with a round of 16: the sixteen in it are exactly the top
         twos, no tie pairs a group with itself, and the quarter finalists
         are the eight who won a tie. */
      const field = r16.flatMap(t => [t.home, t.away]);
      if (new Set(field).size !== field.length) fail(`a club appears twice in the round of 16: ${field.join(', ')}`);
      for (const n of field) if (!topTwos.has(n)) fail(`${n} is in the round of 16 without finishing top two of a group in the competition's order`);
      for (const c of topTwos) if (!field.includes(c)) fail(`${c} finished top two of group ${groupOf.get(c)} and is not in the round of 16`);
      for (const t of r16) if (groupOf.get(t.home) === groupOf.get(t.away)) fail(`round of 16 tie ${t.home} v ${t.away} pairs group ${groupOf.get(t.home)} against itself`);
      const winners = new Set(r16.map(t => t.winner).filter(Boolean));
      for (const n of names) if (!winners.has(n)) fail(`${n} is in the quarter finals without winning a round of 16 tie`);
    }
    for (const n of names) if (!topTwos.has(n)) fail(`${n} is in the quarter finals without finishing top two of a group in the competition's order`);
  }
  console.log(`   ${groupCount} groups sent up ${r16.length ? `${r16.length * 2} round of 16 clubs and ` : ''}${names.length} quarter finalists, all from the top twos in the competition's order; ${levelPairs} level pair(s) held against the ledger; the bare goal difference order would have picked a different top two in ${splitGroups} group(s)`);

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
if (CONTROL === 'gdfield') {
  if (failures > 0) { console.log(`simEraWorldTables control: green. The round of 16 seeded from the bare order was reported (${failures} finding).`); process.exit(0); }
  console.error('simEraWorldTables control: RED. A round of 16 seeded from the wrong order went unreported.'); process.exit(1);
}
if (failures > 0) { console.error(`simEraWorldTables: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simEraWorldTables: green. Era worlds play, the picker lists the truth, and the knockout takes the top twos.');
