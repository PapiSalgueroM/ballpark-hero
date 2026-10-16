/* Round 1344, step 1: a MEASUREMENT PROBE, never product code. It is composed nowhere by default.
 *
 * WHAT IT IS FOR. Round 1344 will record every deal between two other clubs in the world ledger of a seeded Club
 * Manager career (the player report of 2026-10-16: a man another club buys vanishes from the market and is back at
 * his old club next season). Before any product step the lead rules the save size lever and whether the world may
 * change shape without a shedding rule, on numbers. This probe is the throwaway patch those numbers are taken with:
 * it records the AI deals of the three window sites (the post seed flush of startCareer, January in playNextEntry
 * and the summer in startNextSeason) through recordActualRosterTransfer, the way the brief's design 3.3 and 3.4
 * sketch it, so simClubManagerSaveSize, simClubManagerSlots, simCmLedgerBound and simCmWorldMoves can measure a
 * world that remembers every club's deals. The hijack, the walk away and joinClubNow are NOT patched: the size
 * harnesses never negotiate or change jobs, so those sites add nothing to what they measure.
 *
 * NINE EDITS, failing closed: each anchor must stand exactly once in src/lib/clubManager.ts (line endings read as
 * LF), or nothing is changed and the caller is told (exit 2 from the command line, a thrown error from the function).
 *   1. generateHeadlines returns the deals it pushed news for (today it returns nothing; two edits, the head and
 *      the tail of the function);
 *   2. in a seeded career it skips a candidate whose deal the ledger would refuse (the brief's correction 5: the
 *      skip tests the record, not the lookup), after the candidate's three draws, so the draws do not move;
 *   3. the deal is collected beside its news line;
 *   4. NEW aiDealPlayer1344 and recordAiDeals1344 beside recordActualRosterTransfer, pure, no draw;
 *   5. startCareer keeps the opening window's deals, and 6. records them after the seed block (the flush);
 *   7. January and 8. the summer record theirs (only the ledger key is taken back).
 *
 *   import { withAiRecording, PROBE_EDITS } from './lib/cmAiRecordProbe1344.mjs';   source => patched source
 *   node scripts/lib/cmAiRecordProbe1344.mjs --apply     the same edits IN PLACE, for a runner or a throwaway
 *                                                       checkout only; it refuses a file with uncommitted changes.
 *                                                       The way back: git checkout -- src/lib/clubManager.ts
 *   node scripts/lib/cmAiRecordProbe1344.mjs --check     says whether every edit can be made (exit 0)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FILE = 'src/lib/clubManager.ts';
const DEAL = '{ mp: MarketPlayer; to: string; fee: number }';
export const PROBE_EDITS = [
  ['generateHeadlines returns its deals',
    'function generateHeadlines(state: CareerState): void {\n  const market = buildMarket(state);\n',
    `function generateHeadlines(state: CareerState): ${DEAL}[] {\n  const deals1344: ${DEAL}[] = [];\n  const market = buildMarket(state);\n`],
  ['the seeded skip',
    '    const buyer = pick(pool).name;\n    heads.push(`${buyer} sign ${mp.name} from ${mp.club} for ${money(fee)}.`);\n',
    '    const buyer = pick(pool).name;\n    if (worldSeedOf(state) !== undefined) {\n      const moved1344 = aiDealPlayer1344(state, mp);\n      if (!moved1344 || recordActualRosterTransfer(state, moved1344, mp.club, buyer, \'permanent\') === state) continue;\n    }\n    heads.push(`${buyer} sign ${mp.name} from ${mp.club} for ${money(fee)}.`);\n'],
  ['the deal is collected',
    '    pushNews(state, { name: mp.name, from: mp.club, to: buyer, fee });\n  }\n',
    '    pushNews(state, { name: mp.name, from: mp.club, to: buyer, fee });\n    deals1344.push({ mp, to: buyer, fee });\n  }\n'],
  ['generateHeadlines hands them back',
    '  generateIncomingBids(state);\n}\n',
    '  generateIncomingBids(state);\n  return deals1344;\n}\n'],
  ['the helpers',
    '/** A rival club\'s projected roster minus every man who is in my squad. */\n',
    `function aiDealPlayer1344(state: CareerState, mp: MarketPlayer): CMPlayer | null {\n  const current = refreshWorldRoster(state);\n  const found = worldRosterFor(current, mp.club).filter(p => mp.worldRosterKey ? p.worldRosterKey === mp.worldRosterKey : p.n === mp.name && p.a === mp.age && p.p === mp.position);\n  if (found.length !== 1) return null;\n  const key = found[0].worldRosterKey;\n  const record = key ? worldRosterView(current)?.records.find(r => r.key === key && r.owner === mp.club && r.status === 'owned') : undefined;\n  return record ? plainCopy(record.player) : bakedToCMPlayer(found[0]);\n}\nfunction recordAiDeals1344(state: CareerState, deals: readonly ${DEAL}[]): CareerState {\n  if (worldSeedOf(state) === undefined) return state;\n  let next = state;\n  for (const deal of deals) { const player = aiDealPlayer1344(next, deal.mp); if (player) next = recordActualRosterTransfer(next, player, deal.mp.club, deal.to, 'permanent'); }\n  return next;\n}\n/** A rival club's projected roster minus every man who is in my squad. */\n`],
  ['startCareer keeps the opening deals',
    '  generateHeadlines(state);\n  /* Round 1021 review: a late season can meet its first international window\n',
    '  const opening1344 = generateHeadlines(state);\n  /* Round 1021 review: a late season can meet its first international window\n'],
  ['the flush after the seed block',
    '    state.worldSeed = world.worldSeed;\n  }\n  return state;\n}\n',
    '    state.worldSeed = world.worldSeed;\n  }\n  return recordAiDeals1344(state, opening1344);\n}\n'],
  ['January records',
    '      generateHeadlines(state);\n      // Round 135: a January window is exactly when somebody gets asked whether\n',
    '      const january1344 = generateHeadlines(state);\n      { const recorded1344 = recordAiDeals1344(state, january1344); if (recorded1344 !== state) state.worldRoster = recorded1344.worldRoster; }\n      // Round 135: a January window is exactly when somebody gets asked whether\n'],
  ['the summer records',
    '  state.intl = freshIntl(state);\n  generateHeadlines(state);\n',
    '  state.intl = freshIntl(state);\n  const summer1344 = generateHeadlines(state);\n  { const recorded1344 = recordAiDeals1344(state, summer1344); if (recorded1344 !== state) state.worldRoster = recorded1344.worldRoster; }\n'],
];

/** How many times each anchor stands in the source (LF). */
export function probeAnchorCounts(source) {
  const text = source.split('\r\n').join('\n');
  return PROBE_EDITS.map(([label, from]) => [label, text.split(from).length - 1]);
}

/** The source of clubManager.ts with the AI deals recorded. Line endings are read as LF. */
export function withAiRecording(source) {
  let text = source.split('\r\n').join('\n');
  for (const [label, from, to] of PROBE_EDITS) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`cmAiRecordProbe1344: the anchor of "${label}" is in ${FILE} ${count} times, it must be exactly once`);
    text = text.replace(from, () => to);
  }
  return text;
}

const here = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  const root = path.resolve(path.dirname(here), '../..');
  const file = path.join(root, FILE);
  const mode = process.argv[2];
  try {
    const out = withAiRecording(readFileSync(file, 'utf8'));
    if (mode === '--check') { console.log(`cmAiRecordProbe1344: all ${PROBE_EDITS.length} anchors stand once in ${FILE}`); process.exit(0); }
    if (mode !== '--apply') { console.error('cmAiRecordProbe1344: say --check or --apply'); process.exit(2); }
    const dirty = spawnSync('git', ['status', '--porcelain', '--', FILE], { cwd: root, encoding: 'utf8' });
    if (dirty.status !== 0 || dirty.stdout.trim()) { console.error(`cmAiRecordProbe1344: ${FILE} has uncommitted changes (or git could not say). Nothing was changed.`); process.exit(2); }
    writeFileSync(file, out);
    console.log(`cmAiRecordProbe1344: the AI deals are recorded in ${root}/${FILE}. The way back: git checkout -- ${FILE}`);
  } catch (e) {
    console.error(`${e.message}. Nothing was changed.`);
    process.exit(2);
  }
}
