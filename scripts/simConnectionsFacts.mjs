/**
 * Round 1553 harness: Soccer Connections, every group true and one right
 * answer a board.
 *
 * A Connections guess is right only when the four tiles equal one stored
 * group (src/hooks/useConnections.ts submitGuess), so a false tile costs a
 * life from whoever knows the game, and a tile that honestly belongs to a
 * second group on its board makes a board with two answers where the game
 * accepts one. simFairPuzzles (Round 214) only ever asked whether a NAME was
 * typed into two groups. This asks whether the claims are true.
 *
 * Sections:
 *   1) no group claims the present: a dated group names a past season in
 *      the past tense ("Played for Bayern Munich in 2025-26"), and no label
 *      says Current, now or this season, because a saved board outlives it
 *   2) no refuted claim is on any board (scripts/data/connectionsVerified2026-10/ledger.json
 *      "refuted": a claim two hosts show false, such as Wayne Rooney in a
 *      treble group)
 *   3) every group the ledger covers is held to it: each member stands on
 *      two different hosts, none of them a wiki, and the group on the board
 *      is the group in the ledger, word for word
 *   4) the cross check (scripts/lib/connectionsCrossCheck.mjs with soccer's
 *      checker, scripts/lib/soccerConnectionsCheck.mjs) over every board:
 *      a member the data says does not fit, or a man from another group
 *      the data says also fits. A finding the ledger adjudicates (the data
 *      wrong, or a namesake) is cleared with its reason; the boards this
 *      round did not rebuild carry theirs in "owed", a list that may only
 *      shrink (Part B of the round empties it); anything else fails
 *   5) the count of groups nothing checks yet, a ceiling that may only fall
 *
 * Live rows: the boards players are dealt come from the connections_puzzles
 * table. This harness never reads it. The lead exports the table once with
 * a read only SELECT and runs CONN_LIVE=<that json file> node scripts/simConnectionsFacts.mjs,
 * which checks those rows by the same rules (sections 1 to 4).
 *
 * Controls (each must exit 1, and the harness first asserts the control
 * changed its input):
 *   CONN_CONTROL=rooney   puts Wayne Rooney back in a treble group (section 2)
 *   CONN_CONTROL=zidane   puts Zinedine Zidane back in puzzle-1's World Cup
 *                         final group, beside a Ballon d'Or group (section 4)
 *   CONN_CONTROL=current  writes "Current" back into a dated group (section 1)
 *
 * Run: node scripts/simConnectionsFacts.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { crossCheckBoards, findingKey } from './lib/connectionsCrossCheck.mjs';
import { makeSoccerChecker, fold } from './lib/soccerConnectionsCheck.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'connfacts-'));
const ENTRY = path.join(TMP, 'entry.mjs');
const OUT = path.join(TMP, 'bundle.mjs');
const LEDGER_DIR = path.join(ROOT, 'scripts/data/connectionsVerified2026-10');
const CONTROL = process.env.CONN_CONTROL ?? '';
const MEASURE = process.env.CONN_MEASURE ?? '';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const boards = (await import('${R}/src/data/connectionsPuzzles.ts')).connectionsPuzzles;
export const careerPlayers = (await import('${R}/src/data/careerPlayers.ts')).careerPlayers;
export const { clubSeasonsOf } = await import('${R}/src/lib/transferPathGraph.ts');
export const { NATIONALITY_WORLD_NOW } = await import('${R}/src/data/playerNationalities.ts');
export const e2005 = (await import('${R}/src/data/nationalities/era2005.ts')).NATIONALITY_WORLD.era2005;
export const e2010 = (await import('${R}/src/data/nationalities/era2010.ts')).NATIONALITY_WORLD.era2010;
export const e2015 = (await import('${R}/src/data/nationalities/era2015.ts')).NATIONALITY_WORLD.era2015;
export const e2020 = (await import('${R}/src/data/nationalities/era2020.ts')).NATIONALITY_WORLD.era2020;
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const data = await import(pathToFileURL(OUT).href);
const ledger = JSON.parse(fs.readFileSync(path.join(LEDGER_DIR, 'ledger.json'), 'utf8'));
ledger.squads = JSON.parse(fs.readFileSync(path.join(LEDGER_DIR, 'squads.json'), 'utf8')).squads;

/* The boards under test: the shipped file, or the lead's export of the live table. */
let boards = data.boards.map(b => ({ id: b.id, groups: b.groups.map(g => ({ ...g, players: [...g.players] })) }));
if (process.env.CONN_LIVE) {
  const rows = JSON.parse(fs.readFileSync(process.env.CONN_LIVE, 'utf8'));
  boards = rows.map(r => ({ id: r.puzzle_id, groups: typeof r.groups_json === 'string' ? JSON.parse(r.groups_json) : r.groups_json }));
  console.log(`CONN_LIVE: checking ${boards.length} rows of the live table export, not the shipped file`);
}

/* The closed award lists the checker may judge, each from a verified ledger. */
const ballon = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/ballonDorVerified2026-09.json'), 'utf8'));
const awards = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/soccerAwardsVerified2026-09.json'), 'utf8'));
const setOf = names => new Set(names.map(fold));
const men = ballon.rows.filter(r => r.award_type === 'Men' && r.rank === 1);
/* knownGaps are winners the sources have decided and the table does not hold yet: still winners. */
const winnersOf = award => { const a = awards.verifiedAwards.find(x => x.award === award); return [...(a?.winners ?? []), ...(a?.knownGaps ?? [])].map(w => w.winner); };
const awardLists = {
  ballonDor: { labels: [/^Won the Ballon d'Or$/], members: setOf(men.map(r => r.player_name)) },
  ballonDor2000s: { labels: [/^Won the Ballon d'Or in the 2000s$/], members: setOf(men.filter(r => r.year >= 2000 && r.year <= 2009).map(r => r.player_name)) },
  ballonDor2010s: { labels: [/^Won the Ballon d'Or in the 2010s$/], members: setOf(men.filter(r => r.year >= 2010 && r.year <= 2019).map(r => r.player_name)) },
  ballonDorFeminin: { labels: [/^Won the Ballon d'Or F[eé]minin$/], members: setOf(ballon.rows.filter(r => r.award_type === 'Women' && r.rank === 1).map(r => r.player_name)) },
  goldenShoe: { labels: [/^Won the European Golden Shoe$/], members: setOf(winnersOf('European Golden Shoe')) },
  plPlayerOfSeason: { labels: [/^Won the Premier League Player of the Season$/], members: setOf(winnersOf('Premier League Player of the Season')) },
  mlsMvp: { labels: [/^Won the MLS MVP$/, /^MLS MVP winners$/], members: setOf(winnersOf('MLS MVP')) },
};
/* Lists this round verified, two hosts each, live in the ledger. */
for (const [key, list] of Object.entries(ledger.lists ?? {})) {
  awardLists[key] = { labels: list.labels.map(l => ({ test: t => t === l })), members: setOf(list.members) };
}
const soccer = makeSoccerChecker({
  careerPlayers: data.careerPlayers,
  clubSeasonsOf: data.clubSeasonsOf,
  nationalityMaps: [data.NATIONALITY_WORLD_NOW.now, data.e2005, data.e2010, data.e2015, data.e2020],
  awardLists,
  ledger,
});


/* ---- the controls: each changes the boards under test, and proves it did ---- */
const boardById = id => boards.find(b => b.id === id);
if (CONTROL) {
  let changed = false;
  if (CONTROL === 'rooney') {
    /* the treble claim the scout found twice: put it back on a board */
    const b = boardById('puzzle-10');
    const g = b?.groups[2];
    if (g && !g.players.includes('Wayne Rooney')) {
      g.category = 'Won the Treble';
      g.players[3] = 'Wayne Rooney';
      changed = true;
    }
  } else if (CONTROL === 'zidane') {
    /* Zidane scored in two World Cup finals and won the 1998 Ballon d'Or */
    const b = boardById('puzzle-1');
    const final = b?.groups.find(x => x.category === 'Scored in a World Cup Final');
    const ballon = b?.groups.find(x => x.category === "Won the Ballon d'Or");
    if (final && ballon && !final.players.includes('Zinedine Zidane')) {
      final.players[1] = 'Zinedine Zidane';
      changed = true;
    }
  } else if (CONTROL === 'current') {
    const b = boardById('puzzle-76');
    const g = b?.groups.find(x => x.category === 'Played for Arsenal in 2025-26');
    if (g) { g.category = 'Current Arsenal stars (2025-26)'; changed = true; }
  } else {
    console.error(`unknown CONN_CONTROL=${CONTROL}`);
    process.exit(2);
  }
  if (!changed) {
    console.error(`CONN_CONTROL=${CONTROL} ABORTED: the input it mutates is not there, so a green run would prove nothing`);
    process.exit(1);
  }
  console.log(`CONN_CONTROL=${CONTROL}: the boards were changed; this run must end red`);
}

const WIKI = /wiki/i;
const hostsOk = sources => {
  const hosts = new Set((sources ?? []).filter(s => !WIKI.test(String(s.host ?? '')) && !WIKI.test(String(s.url ?? ''))).map(s => String(s.host ?? '').toLowerCase()).filter(Boolean));
  return hosts.size >= 2;
};

console.log('1) no group claims the present');
{
  const PRESENT = /\bcurrent\b|\bnow\b|this season|present day|\bactive\b/i;
  let n = 0;
  for (const b of boards) for (const g of b.groups) {
    if (PRESENT.test(g.category)) { n += 1; fail(`${b.id}: "${g.category}" claims the present, and a saved board outlives it; stamp a past season`); }
  }
  console.log(`   ${n} present tense labels`);
}

console.log('2) no refuted claim is on a board');
{
  let n = 0;
  for (const r of ledger.refuted ?? []) {
    if (!hostsOk(r.sources)) fail(`refuted "${r.name}" in "${r.labels?.[0]}" does not stand on two hosts`);
    const labels = new Set(r.labels ?? []);
    for (const b of boards) for (const g of b.groups) {
      if (labels.has(g.category) && g.players.some(p => fold(p) === fold(r.name))) {
        n += 1;
        fail(`${b.id}: ${r.name} in "${g.category}" is refuted (${r.why})`);
      }
    }
  }
  console.log(`   ${(ledger.refuted ?? []).length} refuted claims held off every board, ${n} found`);
}
/* ---- measurement (CONN_MEASURE=<file>): every finding, before any baseline ---- */
const cross = crossCheckBoards(boards, soccer);
if (MEASURE) {
  const byKind = {};
  for (const f of cross.findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
  const boardsHit = new Set(cross.findings.map(f => f.id));
  fs.writeFileSync(MEASURE, cross.findings.map(findingKey).join('\n') + '\n');
  fs.writeFileSync(MEASURE + '.unchecked.txt', cross.unchecked.map(u => `${u.id} | ${u.label}`).join('\n') + '\n');
  console.log(`measure: ${cross.boards} boards, ${cross.groups} groups, ${cross.checked} judged, ${cross.unchecked.length} not judged`);
  console.log(`measure: members judged ${cross.memberChecks} (unknown ${cross.memberUnknown}), other tiles judged ${cross.otherChecks} (unknown ${cross.otherUnknown})`);
  console.log(`measure: findings ${JSON.stringify(byKind)} on ${boardsHit.size} boards`);
  process.exit(0);
}

console.log('3) every group this round wrote stands on two hosts');
{
  /* the ledger's own facts first: a list, a squad, a title, a man's nation or clubs */
  for (const [key, list] of Object.entries(ledger.lists ?? {})) if (!hostsOk(list.sources)) fail(`list ${key} does not stand on two hosts`);
  for (const [key, sq] of Object.entries(ledger.squads ?? {})) {
    if (!hostsOk(sq.sources)) fail(`squad ${key} does not stand on two hosts`);
    if (sq.wonLeague && !hostsOk(sq.wonLeague)) fail(`the title of ${key} does not stand on two hosts`);
  }
  for (const [name, p] of Object.entries(ledger.players ?? {})) if (!hostsOk(p.sources)) fail(`${name}: the ledger's facts do not stand on two hosts`);
  /* a group the ledger writes out member by member */
  const ledgered = new Set();
  for (const lg of ledger.groups ?? []) {
    const b = boardById(lg.id);
    const g = b?.groups.find(x => x.category === lg.category);
    if (!g) { fail(`${lg.id}: the ledger holds "${lg.category}" and the board has no such group`); continue; }
    ledgered.add(`${lg.id}|${lg.category}`);
    const want = Object.keys(lg.members).map(fold).sort().join('|');
    if (g.players.map(fold).sort().join('|') !== want) fail(`${lg.id}: "${lg.category}" on the board is not the group the ledger checked`);
    for (const [name, sources] of Object.entries(lg.members)) if (!hostsOk(sources)) fail(`${lg.id}: ${name} in "${lg.category}" does not stand on two hosts`);
  }
  /* a stamped group (a season, a title) and every group of a board this round rebuilt: each member judged true */
  const rebuilt = new Set(ledger.rebuilt ?? []);
  let stamped = 0, members = 0;
  for (const b of boards) for (const g of b.groups) {
    const c = soccer.criterion(g.category);
    const isStamp = c && (c.kind === 'clubSeason' || c.kind === 'leagueSeason');
    if (!isStamp && !rebuilt.has(b.id)) continue;
    if (ledgered.has(`${b.id}|${g.category}`)) continue;
    if (isStamp) stamped += 1;
    if (!c) { fail(`${b.id}: "${g.category}" is on a rebuilt board and nothing checks it`); continue; }
    for (const p of g.players) {
      members += 1;
      const v = soccer.fits(p, c);
      if (v !== true) fail(`${b.id}: ${p} in "${g.category}" is ${v === false ? 'contradicted' : 'not confirmed'} by the record`);
    }
  }
  console.log(`   ${Object.keys(ledger.squads ?? {}).length} squads, ${Object.keys(ledger.lists ?? {}).length} lists, ${(ledger.groups ?? []).length} ledgered groups, ${stamped} stamped groups, ${members} members confirmed, ${rebuilt.size} rebuilt boards`);
}

console.log('4) one right answer: the cross check over every board');
{
  const rebuilt = new Set(ledger.rebuilt ?? []);
  const adjudicated = new Map((ledger.adjudicated ?? []).map(a => [a.key, a]));
  const owed = new Set(ledger.owed ?? []);
  const seen = new Set();
  let cleared = 0, carried = 0;
  for (const f of cross.findings) {
    const key = findingKey(f);
    seen.add(key);
    const adj = adjudicated.get(key);
    if (adj) {
      if (!hostsOk(adj.sources)) fail(`${key}: adjudicated without two hosts`);
      cleared += 1;
      continue;
    }
    if (owed.has(key) && !rebuilt.has(f.id) && !process.env.CONN_LIVE) { carried += 1; continue; }
    fail(`${key}${f.kind === 'second-fit' ? ', so the board has two right answers' : ''}`);
  }
  if (!process.env.CONN_LIVE && !CONTROL) {
    for (const key of owed) if (!seen.has(key)) fail(`owed "${key}" no longer fires: take it off the owed list so it cannot come back`);
    for (const key of adjudicated.keys()) if (!seen.has(key)) fail(`adjudicated "${key}" no longer fires: take it off the list`);
  }
  console.log(`   ${cross.checked} of ${cross.groups} groups judged; members ${cross.memberChecks} judged (${cross.memberUnknown} unknown), other tiles ${cross.otherChecks} judged (${cross.otherUnknown} unknown)`);
  console.log(`   ${cross.findings.length} findings: ${cleared} adjudicated, ${carried} owed to part B on boards not yet rebuilt`);
}

console.log('5) the groups nothing checks yet may only get fewer');
{
  const ledgered = new Set((ledger.groups ?? []).map(lg => `${lg.id}|${lg.category}`));
  const n = cross.unchecked.filter(u => !ledgered.has(`${u.id}|${u.label}`)).length;
  const ceiling = ledger.uncheckedCeiling;
  if (!process.env.CONN_LIVE) {
    if (typeof ceiling !== 'number') fail('the ledger has no uncheckedCeiling');
    else if (n > ceiling) fail(`${n} groups nothing checks, over the ceiling of ${ceiling}`);
    else if (n < ceiling) fail(`${n} groups nothing checks, under the ceiling of ${ceiling}: lower uncheckedCeiling to ${n} so they cannot come back`);
  }
  console.log(`   ${n} groups nothing checks yet (ceiling ${ceiling}); part B ledgers them`);
}

console.log('');
if (failures > 0) {
  console.error(`simConnectionsFacts: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simConnectionsFacts: green. Every claim this round checked stands on two hosts and no rebuilt board has a second answer.');
