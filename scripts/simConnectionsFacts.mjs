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
 *      says Current, now or this season, because a saved board outlives it.
 *      A label naming a year from 2020 on, or the 2020s, is a dated claim
 *      too: it passes only as a stamped shape the checker holds, a group the
 *      ledger writes out on two hosts, or an entry of the ledger's
 *      "datedOwed" (part B's list, which may only shrink). puzzle-136 said
 *      "Won the 2026 Champions League" over four Barcelona men; PSG won it
 *   2) no refuted claim is on any board (scripts/data/connectionsVerified2026-10/ledger.json
 *      "refuted": a claim two hosts show false, such as Wayne Rooney in a
 *      treble group, matched by the claim: the label folded, or the entry's
 *      claimWords, so "Won the treble" and "Won a treble" are caught too)
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
 *   5) the count of groups nothing checks yet, a ceiling that may only fall;
 *      and (Round 1565 review) the count of members of judged groups the
 *      record cannot place, not ledgered: the cross check passes such a man
 *      unseen (Gian Piero Gasperini, who managed Atalanta and never played for
 *      them, sat in "Played for Atalanta"), so that count is a ceiling too
 *   6) Round 1565: the shipped file is the copy of the live table. The lead's
 *      read of the table (scripts/data/connectionsLiveSnapshot.json: puzzle_id,
 *      sort_order and md5(groups_json::text), written by
 *      scripts/qa/connectionsLiveSnapshot.mjs at each release's live pass)
 *      and the file must hold the same ids, in the same order, board for
 *      board. Round 1553 found 136 of 326 live boards edited or added in the
 *      table alone, where no fix to the file could reach them
 *
 * Live rows: the boards players are dealt come from the connections_puzzles
 * table. This harness never reads it. The lead exports the table once with
 * a read only SELECT and runs CONN_LIVE=<that json file> node scripts/simConnectionsFacts.mjs,
 * which checks those rows by the same rules (sections 1 to 4).
 *
 * Controls (each must exit 1, and the harness first asserts the control
 * changed its input):
 *   CONN_CONTROL=rooney   puts Wayne Rooney back in a treble group (section 2)
 *   CONN_CONTROL=zidane   deals Zinedine Zidane (Ballon d'Or 1998) into another group
 *                         of puzzle-1, which carries a Ballon d'Or group: section 4
 *                         must report him as a second answer
 *   CONN_CONTROL=current  writes "Current" back into a dated group (section 1)
 *   CONN_CONTROL=treblecase writes Rooney into "Won a treble" on puzzle-136, a
 *                         board this round did not rebuild (section 2 matches the
 *                         claim, not the exact label)
 *   CONN_CONTROL=onehost  deals a man only one host lists in Chelsea's 2025-26
 *                         squad into puzzle-1's Chelsea group (section 3, the two
 *                         host rule)
 *   CONN_CONTROL=nominee  deals Harry Kane, a 2026 Ballon d'Or nominee, back into
 *                         puzzle-151's Bayern group beside its Ballon d'Or group
 *                         (section 3, the ledger's watch on the award list)
 *   CONN_CONTROL=bareyear writes "Won the 2026 Champions League" back over
 *                         puzzle-136's Barcelona men (section 1)
 *   CONN_CONTROL=snapshot changes puzzle-136's hash in the live snapshot, in
 *                         memory: the table moved and the file did not (section 6)
 *   CONN_CONTROL=snapshotorder swaps the sort_order of crafted-1001 and
 *                         crafted-1002 in the snapshot, in memory (section 6, order)
 *   CONN_CONTROL=snapshotids drops puzzle-136's row from the snapshot, in memory
 *                         (section 6, the id set)
 *   CONN_CONTROL=unknownman deals Marcelo Bielsa, who managed Athletic and never
 *                         played there and whom the record does not hold, into
 *                         cx-20260805-8's Athletic group, a board no round rebuilt:
 *                         the cross check cannot see him, so section 5's
 *                         memberUnknownCeiling must go red
 *
 * Run: node scripts/simConnectionsFacts.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { crossCheckBoards, findingKey } from './lib/connectionsCrossCheck.mjs';
import { makeSoccerChecker, fold, keysOf, loadConnectionsRecord } from './lib/soccerConnectionsCheck.mjs';
import { boardMd5 } from './lib/pgJsonbText.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'connfacts-'));
const ENTRY = path.join(TMP, 'entry.mjs');
const OUT = path.join(TMP, 'bundle.mjs');
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
const { ledger, awardLists } = loadConnectionsRecord(ROOT);
/* Round 1565: the lead's read of the live table, one md5 a board (section 6) */
const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/connectionsLiveSnapshot.json'), 'utf8'));

/* The boards under test: the shipped file, or the lead's export of the live table. */
let boards = data.boards.map(b => ({ id: b.id, groups: b.groups.map(g => ({ ...g, players: [...g.players] })) }));
if (process.env.CONN_LIVE) {
  const rows = JSON.parse(fs.readFileSync(process.env.CONN_LIVE, 'utf8'));
  const groupsOf = raw => { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(v) ? v : (v?.groups ?? []); };
  boards = rows.map(r => ({ id: r.puzzle_id, groups: groupsOf(r.groups_json) }));
  console.log(`CONN_LIVE: checking ${boards.length} rows of the live table export, not the shipped file`);
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
    /* Zidane won the 1998 Ballon d'Or: deal him into another group of a board that carries the Ballon d'Or */
    const b = boardById('puzzle-1');
    const ballon = b?.groups.find(x => x.category === "Won the Ballon d'Or");
    const other = b?.groups.find(x => x !== ballon && x.category === 'Over 100 Premier League assists');
    if (ballon && other && !b.groups.some(x => x.players.includes('Zinedine Zidane'))) {
      other.players[3] = 'Zinedine Zidane';
      changed = true;
    }
  } else if (CONTROL === 'current') {
    const b = boardById('puzzle-76');
    const g = b?.groups.find(x => x.category === 'Played for Arsenal in 2025-26');
    if (g) { g.category = 'Current Arsenal stars (2025-26)'; changed = true; }
  } else if (CONTROL === 'treblecase') {
    /* Rooney's treble claim in another spelling, on a board this round did not rebuild: only section 2 can see it */
    const b = boardById('puzzle-136');
    const g = b?.groups.find(x => x.category === 'Won the Puskas Award');
    if (g && !b.groups.some(x => x.players.includes('Wayne Rooney'))) { g.category = 'Won a treble'; g.players[3] = 'Wayne Rooney'; changed = true; }
  } else if (CONTROL === 'onehost') {
    /* a man only one host lists in Chelsea's 2025-26 squad, dealt into puzzle-1's Chelsea group: the two host rule must refuse him */
    const sq = ledger.squads?.['Chelsea 2025-26'];
    const b = boardById('puzzle-1');
    const g = b?.groups.find(x => x.category === 'Played for Chelsea in 2025-26');
    const [a, c] = (sq?.sources ?? []).map(s => new Set(s.players.map(fold)));
    const onBoard = new Set((b?.groups ?? []).flatMap(x => x.players).map(fold));
    const one = a && c ? [...sq.sources[0].players, ...sq.sources[1].players].find(p => (a.has(fold(p)) !== c.has(fold(p))) && !onBoard.has(fold(p))) : undefined;
    if (g && one) { g.players[2] = one; changed = true; console.log(`CONN_CONTROL=onehost: ${one} is on one host only`); }
  } else if (CONTROL === 'nominee') {
    /* Harry Kane (Bayern 2025-26, a 2026 Ballon d'Or nominee) back on puzzle-151, beside its Ballon d'Or group */
    const b = boardById('puzzle-151');
    const g = b?.groups.find(x => x.category === 'Played for Bayern Munich in 2025-26');
    if (g && b.groups.some(x => x.category === "Won the Ballon d'Or") && !b.groups.some(x => x.players.includes('Harry Kane'))) { g.players[0] = 'Harry Kane'; changed = true; }
  } else if (CONTROL === 'bareyear') {
    /* the label puzzle-136 carried before this round, on the four Barcelona men: a bare year nothing holds */
    const b = boardById('puzzle-136');
    const g = b?.groups.find(x => x.category === 'Played for Barcelona in 2025-26');
    if (g) { g.category = 'Won the 2026 Champions League'; changed = true; }
  } else if (CONTROL === 'snapshot') {
    /* one board of the live table moves and the file does not follow: section 6 must see it */
    const row = snapshot.rows.find(r => r.puzzle_id === 'puzzle-136');
    if (row && /^[0-9a-f]{32}$/.test(row.md5)) { row.md5 = (row.md5[0] === '0' ? '1' : '0') + row.md5.slice(1); changed = true; }
  } else if (CONTROL === 'snapshotorder') {
    /* two neighbours swap places in the table and the file keeps its order: the fallback deals another board (section 6) */
    const a = snapshot.rows.find(r => r.puzzle_id === 'crafted-1001');
    const b = snapshot.rows.find(r => r.puzzle_id === 'crafted-1002');
    if (a && b && a.sort_order !== b.sort_order) { [a.sort_order, b.sort_order] = [b.sort_order, a.sort_order]; changed = true; }
  } else if (CONTROL === 'snapshotids') {
    /* a row the file holds is gone from the table (section 6, the id set) */
    const at = snapshot.rows.findIndex(r => r.puzzle_id === 'puzzle-136');
    if (at >= 0) { snapshot.rows.splice(at, 1); changed = true; }
  } else if (CONTROL === 'unknownman') {
    /* a man the record cannot place, dealt over a confirmed member of a judged group on a board no round rebuilt */
    const b = boardById('cx-20260805-8');
    const g = b?.groups.find(x => /^Played for Athletic/.test(x.category));
    const c = g && soccer.criterion(g.category);
    const at = c ? g.players.findIndex(p => soccer.fits(p, c) === true) : -1;
    const bielsa = 'Marcelo Bielsa';
    if (at >= 0 && soccer.fits(bielsa, c) === null && !(ledger.rebuilt ?? []).includes(b.id) && !b.groups.some(x => x.players.includes(bielsa))) {
      g.players[at] = bielsa;
      changed = true;
    }
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
  const SEASON = /(19|20)[0-9]{2}-[0-9]{2}/;
  /* a year from 2020 on, or the 2020s: "Won the 2026 Champions League" was written before that final and named the wrong club */
  const RECENT = /(^|[^0-9])20[2-9][0-9]/;
  const ledgeredGroups = new Set((ledger.groups ?? []).map(lg => `${lg.id} | ${lg.category}`));
  const datedOwed = new Set(ledger.datedOwed ?? []);
  const datedSeen = new Set();
  let n = 0;
  for (const b of boards) for (const g of b.groups) {
    if (PRESENT.test(g.category)) { n += 1; fail(`${b.id}: "${g.category}" claims the present, and a saved board outlives it; stamp a past season`); continue; }
    const season = SEASON.test(g.category);
    if (!season && !RECENT.test(g.category)) continue;
    /* a dated label is a claim about that time: the stamped shapes the checker holds to a squad pass */
    const c = soccer.criterion(g.category);
    if (c && (c.kind === 'clubSeason' || c.kind === 'leagueSeason')) continue;
    const key = `${b.id} | ${g.category}`;
    /* so does a group the ledger writes out member by member (section 3 holds it to two hosts) */
    if (ledgeredGroups.has(key)) continue;
    /* and a recent year group part B has not checked yet, from a list that may only shrink */
    if (!season && datedOwed.has(key) && !process.env.CONN_LIVE) { datedSeen.add(key); continue; }
    n += 1;
    fail(season
      ? `${b.id}: "${g.category}" names a season in a shape nothing holds to that season's squad`
      : `${b.id}: "${g.category}" names a year from 2020 on and nothing holds the group to it: stamp a season the checker holds, write the group out in the ledger on two hosts, or retire it`);
  }
  if (!process.env.CONN_LIVE && !CONTROL) {
    for (const key of datedOwed) if (!datedSeen.has(key)) fail(`datedOwed "${key}" is no longer on a board: take it off the list so it cannot come back`);
  }
  console.log(`   ${n} present tense, unstamped season or unheld recent year labels; ${datedSeen.size} recent year groups owed to part B`);
}

console.log('2) no refuted claim is on a board');
{
  let n = 0;
  for (const r of ledger.refuted ?? []) {
    if (!hostsOk(r.sources)) fail(`refuted "${r.name}" in "${r.labels?.[0]}" does not stand on two hosts`);
    /* the claim, not its spelling: a label matches when it folds to one of the entry's labels (case, spaces
       and punctuation aside) or carries every word of one of its claimWords ("Won a treble" is Rooney's
       treble claim too) */
    const labels = new Set((r.labels ?? []).map(fold));
    const words = (r.claimWords ?? []).map(alt => alt.map(fold));
    const claims = label => { const f = fold(label); return labels.has(f) || words.some(alt => alt.length > 0 && alt.every(w => f.includes(w))); };
    for (const b of boards) for (const g of b.groups) {
      if (claims(g.category) && g.players.some(p => fold(p) === fold(r.name))) {
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
  /* a list that is still moving names the men about to join it: none may share a board with it outside
     its own group. The round's own lists carry watchNames; ledger.watches put a watch on a closed award
     list the checker holds (the 2026 Ballon d'Or shortlist, until the ceremony is in the verified record) */
  const watches = [];
  for (const [key, list] of Object.entries(ledger.lists ?? {})) if ((list.watchNames ?? []).length) watches.push({ key, label: list.labels[0], names: list.watchNames });
  for (const [key, w] of Object.entries(ledger.watches ?? {})) {
    if (!hostsOk(w.sources)) fail(`watch ${key} does not stand on two hosts`);
    if (!awardLists[key]) fail(`watch ${key} names no award list the checker holds`);
    watches.push({ key, label: w.label, names: w.names ?? [] });
  }
  let watched = 0;
  for (const w of watches) {
    const watch = new Set(w.names.map(fold));
    watched += watch.size;
    for (const b of boards) {
      const own = b.groups.filter(g => soccer.criterion(g.category)?.key === w.key);
      if (!own.length) continue;
      for (const g of b.groups) if (!own.includes(g)) for (const p of g.players) {
        if (keysOf(p).some(k => watch.has(k))) fail(`${b.id}: ${p} in "${g.category}" may soon join "${w.label}" (${w.key} watch), so he cannot share a board with it`);
      }
    }
  }
  console.log(`   ${watches.length} watches over ${watched} men about to join a list`);
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
  /* Round 1565 review: a member the record cannot place passes the cross check unseen (fits is unknown, so no
     finding), which is how Gian Piero Gasperini sat in "Played for Atalanta". A ledgered group stands on two hosts
     member by member, so only the others count. */
  let unknown = 0;
  for (const b of boards) for (const g of b.groups) {
    if (ledgered.has(`${b.id}|${g.category}`)) continue;
    const c = soccer.criterion(g.category);
    if (!c) continue;
    for (const p of g.players) if (soccer.fits(p, c) === null) unknown += 1;
  }
  const uCeiling = ledger.memberUnknownCeiling;
  if (!process.env.CONN_LIVE) {
    if (typeof uCeiling !== 'number') fail('the ledger has no memberUnknownCeiling');
    else if (unknown > uCeiling) fail(`${unknown} members of judged groups the record cannot place, over the ceiling of ${uCeiling}`);
    else if (unknown < uCeiling) fail(`${unknown} members of judged groups the record cannot place, under the ceiling of ${uCeiling}: lower memberUnknownCeiling to ${unknown} so they cannot come back`);
  }
  console.log(`   ${unknown} members of judged groups the record cannot place (ceiling ${uCeiling}); a ledger fact or a swap brings it down`);
}

console.log('6) the shipped file is the copy of the live table (scripts/data/connectionsLiveSnapshot.json)');
{
  /* Round 1565: the game deals from the table and falls back to the file. Round 1553 found 136 of 326 live
     boards the file did not hold, edited or added in the table alone, so a fix to the file never reached
     them. The file must hold every live board, the same board, in the table's order. */
  const live = [...snapshot.rows].sort((a, b) => a.sort_order - b.sort_order);
  const file = data.boards;
  const liveIds = new Set(live.map(r => r.puzzle_id));
  const fileIds = new Set(file.map(b => b.id));
  for (const b of file) if (!liveIds.has(b.id)) fail(`${b.id} is in the file and not in the live table`);
  for (const r of live) if (!fileIds.has(r.puzzle_id)) fail(`${r.puzzle_id} is live and not in the file`);
  const order = (ids, keep) => ids.filter(id => keep.has(id));
  const a = order(file.map(b => b.id), liveIds), c = order(live.map(r => r.puzzle_id), fileIds);
  const at = a.findIndex((id, i) => id !== c[i]);
  if (at >= 0) fail(`the file's board order leaves the table's at position ${at} (${a[at]} in the file, ${c[at]} live): the fallback would deal another board than the table on the same day`);
  const md5Of = new Map(live.map(r => [r.puzzle_id, r.md5]));
  let differ = 0;
  for (const b of file) {
    const want = md5Of.get(b.id);
    if (want && boardMd5(b.groups) !== want) { differ += 1; fail(`${b.id}: the file's board is not the live board (md5 ${boardMd5(b.groups)}, live ${want})`); }
  }
  let liveDiffer = 0;
  if (process.env.CONN_LIVE) for (const b of boards) if (md5Of.has(b.id) && boardMd5(b.groups) !== md5Of.get(b.id)) liveDiffer += 1;
  console.log(`   ${file.length} file boards, ${live.length} live rows (${snapshot.takenAt.slice(0, 60)}...), ${differ} boards differ${process.env.CONN_LIVE ? `; the export under test differs from the snapshot on ${liveDiffer}` : ''}`);
}

console.log('');
if (failures > 0) {
  console.error(`simConnectionsFacts: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simConnectionsFacts: green. Every claim this round checked stands on two hosts and no rebuilt board has a second answer.');
