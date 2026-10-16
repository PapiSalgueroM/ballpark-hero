/* Round 1344: the bridge, for attribution only. It is composed NOWHERE by default.
 *
 * WHAT IT DOES. Round 1344 writes every deal between two other clubs into the world ledger of a seeded Club Manager
 * career (the player report of 2026-10-16: a man another club bought vanished from the market and turned up at his old
 * club the next season). That moves every seeded career from its first day: the opening window's deals change who
 * plays for two clubs, so every later match against either draws differently. This takes the recording back out of a
 * COPY of the engine, so a harness that plays seeded careers must then replay as on the round's base (d4f2c6f6): the
 * proof that whatever moved moved for the recording and nothing else (the brief's decision 7, the critic's
 * correction 6). The pattern is scripts/lib/cmWorldSeed1250.mjs's.
 *
 * FIVE EDITS, each failing closed (its anchor must stand exactly once, line endings read as LF, or nothing is changed
 * and the caller is told: exit 2 from the command line, a thrown error from the function), and counted:
 *   1. generateHeadlines records nothing and skips nothing: every deal goes back on the list it hands back;
 *   2. recordAiDeals' loop is taken out, so the opening flush, the hijack, the walk away and the repair on load write
 *      nothing (and the lead's ruling 3, inside the recording, goes with them);
 *   3. joinClubNow takes the departed career's ledger again (src/lib/clubManagerCalendar.ts);
 *   4. and the departed career's gone names are not carried over;
 *   5. and a rival in a bidding war closes whatever the ledger says (rivalCloseRefused answers false, the review's
 *      fix of 2026-10-16), as it did before the round.
 * What stays: the screen's market (marketForScreen, read by the transfer screen only) and the refusal, which only a
 * ledger record of an AI deal or of a sale of mine this season can trip; the dailies' strip of a ledger that is then
 * never written; the optional pack parameter of the two writers.
 *
 *   import { withoutAiMoves, BRIDGE_FILES } from './lib/cmNoAiMoves1344.mjs';   (source, file) => source
 *   node scripts/lib/cmNoAiMoves1344.mjs --check     says whether every edit can be made (exit 0)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE = 'src/lib/clubManager.ts', CALENDAR = 'src/lib/clubManagerCalendar.ts';
export const BRIDGE_FILES = [ENGINE, CALENDAR];
export const BRIDGE_EDITS = [
  [ENGINE, 'the window records nothing',
    '    if (working && seen) { const moved = recordAiDeal(working, { mp, to: buyer, fee }, seen); if (moved === working) continue; working = moved; }\n    else unrecorded.push({ mp, to: buyer, fee });\n',
    '    unrecorded.push({ mp, to: buyer, fee });\n'],
  [ENGINE, 'recordAiDeals records nothing', '  for (const deal of deals) next = recordAiDeal(next, deal, state);\n', ''],
  [CALENDAR, 'the join keeps the departed ledger',
    '    ...(s.worldRoster !== undefined ? { worldRoster: plainCopy(s.worldRoster) }\n      : departed.worldRoster === undefined ? {} : { worldRoster: plainCopy(departed.worldRoster) }),\n',
    '    ...(departed.worldRoster === undefined ? {} : { worldRoster: plainCopy(departed.worldRoster) }),\n'],
  [CALENDAR, 'the join keeps the run in\'s gone names',
    '    ...(worldSeedOf(departed) === undefined ? {} : { goneNames: [...new Set([...s.goneNames, ...career.goneNames.filter(name => movedElsewhere.has(name))])] }),\n', ''],
  [ENGINE, 'a rival closes whatever the ledger says',
    '  return worldSeedOf(career) !== undefined && recordAiDeal(career, deal, career) === career;\n', '  return false;\n'],
];

/** How many times each anchor stands in its file's source (LF). */
export function bridgeAnchorCounts(read) {
  return BRIDGE_EDITS.map(([file, label, from]) => [label, read(file).split('\r\n').join('\n').split(from).length - 1]);
}

/** The source of one file with the recording taken out (unchanged for any other file). Line endings read as LF. */
export function withoutAiMoves(source, file) {
  const edits = BRIDGE_EDITS.filter(([f]) => f === file);
  if (!edits.length) return source;
  let text = source.split('\r\n').join('\n');
  for (const [, label, from, to] of edits) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`cmNoAiMoves1344: the anchor of "${label}" is in ${file} ${count} times, it must be exactly once`);
    text = text.replace(from, () => to);
  }
  return text;
}

const here = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  const root = path.resolve(path.dirname(here), '../..');
  try {
    for (const file of BRIDGE_FILES) withoutAiMoves(readFileSync(path.join(root, file), 'utf8'), file);
    if (process.argv[2] !== '--check') { console.error('cmNoAiMoves1344: say --check'); process.exit(2); }
    console.log(`cmNoAiMoves1344: all ${BRIDGE_EDITS.length} anchors stand once and can be taken out`);
  } catch (e) {
    console.error(`${e.message}. Nothing was changed.`);
    process.exit(2);
  }
}
