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
 *   2) no refuted claim is on any board (scripts/data/connectionsVerified2026-10.json
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
const LEDGER_PATH = path.join(ROOT, 'scripts/data/connectionsVerified2026-10.json');
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
const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));

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
const winnersOf = award => (awards.verifiedAwards.find(a => a.award === award)?.winners ?? []).map(w => w.winner);
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
});

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
