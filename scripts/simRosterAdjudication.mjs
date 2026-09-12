/**
 * Round 542: a Club Manager squad may not quietly carry last season's club.
 *
 * WHY THIS EXISTS. A player reported on 2026-09-11: "Joao Felix is not a part
 * of Chelsea squad for 26/27 season". He was right, and the interesting part is
 * why, because it was not a typo anybody could have found by reading.
 *
 * THE MECHANISM. scripts/bakeClubManagerRosters.mjs prefers a player's year
 * 2026 row from public.player_market_values_dedup and falls back to his 2025
 * row, ageing him a year and discounting the value 5 percent. That 2025 row
 * carries his 2025 CLUB. So a player the dataset simply stopped tracking is
 * planted at the club he was at a year ago, and in the shipped file he is
 * byte-identical to a verified current one: BakedPlayer is {n,p,a,v,r} and the
 * bake's own `isFallback` flag never reaches it. 356 of the 3667 shipped rows
 * were in that state when this was measured.
 *
 * WHY A BLANKET RULE WOULD HAVE BEEN WORSE THAN THE BUG. The obvious fix is to
 * drop every player with no 2026 row. Measured against a second dataset, that
 * would have been wrong about roughly a third of them: the 2026 World Cup
 * squads table confirms David Alaba is still at Real Madrid, Charles De
 * Ketelaere still at Atalanta, Wout Weghorst still at Ajax, and seven more.
 * Absence from one dataset is not evidence of a transfer. So nothing here is
 * dropped on a heuristic; every change carries a named source.
 *
 * THE ADJUDICATOR. public.world_cup_players at world_cup_year 2026, applied in
 * Round 389, where every row is a player two independent sources agree on
 * (Wikipedia squad templates through the API, and Al Jazeera's 2026-06-02 squad
 * article, with Yahoo Sports 2026-06-11 as the third voice on disagreements)
 * and the club is Wikipedia's. It covers only men picked for the tournament,
 * which is why it settles 23 of the 356 and leaves 332 openly pending rather
 * than guessed.
 *
 * WHAT THIS HOLDS, reading only committed files, no database and no build:
 *   1. Every adjudicated MOVE is at its new club and gone from the old one.
 *   2. Every player whose real club the game does not model is in no squad.
 *   3. Every NOT CURRENT name is in no squad at all.
 *   4. Every player the World Cup table CONFIRMED is still in his squad, so a
 *      later sweep cannot quietly drop a man two sources placed there.
 *   5. Every PENDING player is still at exactly the club the ledger records.
 *      This is the one that stops the ledger rotting: adjudicate a player and
 *      you must move his row out of `pending`, you cannot just edit the roster.
 *   6. No name sits in two categories, and the five categories still add up to
 *      the recorded population.
 *   7. Every club the changes left under 8 players is marked CM_PARTIAL, which
 *      is the existing convention for a squad the game pads and says so.
 *
 * NEGATIVE CONTROL: ROSTER_ADJ_CONTROL=stale puts Joao Felix back in the
 * Chelsea block of the in-memory roster copy, which is the exact row the player
 * reported, and section 1 must go red. It asserts the injection really changed
 * the source first and refuses to run otherwise.
 *
 * Run: node scripts/simRosterAdjudication.mjs      (no database, no build)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CONTROL = process.env.ROSTER_ADJ_CONTROL || '';
const KNOWN_CONTROLS = ['stale'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`ROSTER_ADJ_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const ROSTER_PATH = path.join(ROOT, 'src/data/clubManagerRosters.ts');
let source = fs.readFileSync(ROSTER_PATH, 'utf8');

if (CONTROL === 'stale') {
  /* The row exactly as it shipped before this round, put back where it was. */
  const anchor = `  'Chelsea': [\n`;
  if (!source.includes(anchor)) { console.error('CONTROL stale cannot find the Chelsea block'); process.exit(1); }
  if (/n: 'João Félix'/.test(source.slice(source.indexOf(anchor), source.indexOf(anchor) + 4000))) {
    console.error('CONTROL stale would change nothing: Joao Felix is already in the Chelsea block');
    process.exit(1);
  }
  const mutated = source.replace(anchor, anchor + `    { n: 'João Félix', p: 'CF', a: 26, v: 19.2, r: 82 },\n`);
  if (mutated === source) { console.error('CONTROL stale changed nothing'); process.exit(1); }
  source = mutated;
  console.log('   NEGATIVE CONTROL ON: Joao Felix put back in the Chelsea block, section 1 must go red');
}

/* ------------------------------------------------------------------ */
/* Read the shipped roster and the ledger                             */
/* ------------------------------------------------------------------ */
const sliceObject = (text, marker) => {
  const i = text.indexOf(marker);
  if (i < 0) throw new Error(`cannot find ${marker}`);
  const open = text.indexOf('{', i);
  let depth = 0;
  for (let j = open; j < text.length; j++) {
    if (text[j] === '{') depth++;
    else if (text[j] === '}') { depth--; if (depth === 0) return text.slice(open, j + 1); }
  }
  throw new Error(`unterminated ${marker}`);
};

const ROSTERS = eval('(' + sliceObject(source, 'export const CM_ROSTERS') + ')');
const PARTIAL = JSON.parse(source.match(/export const CM_PARTIAL: string\[\] = (\[[^\]]*\]);/)[1]);
const META = eval('(' + sliceObject(source, 'export const CM_ROSTER_META') + ')');

const ledgerPath = path.join(ROOT, 'scripts/data/rosterConfirmation2026.json');
const L = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

const clubsOf = name => Object.keys(ROSTERS).filter(c => ROSTERS[c].some(p => p.n === name));
const totalPlayers = Object.values(ROSTERS).reduce((s, a) => s + a.length, 0);

console.log(`Roster: ${Object.keys(ROSTERS).length} clubs, ${totalPlayers} players. Ledger measured ${L.measuredOn}, population ${L.population}.`);

/* ------------------------------------------------------------------ */
console.log('\n1) Every adjudicated move is at its new club and gone from the old one');
for (const m of L.movedTo) {
  const at = clubsOf(m.name);
  if (at.includes(m.from)) fail(`${m.name} is still in the ${m.from} squad, but the 2026 World Cup squads put him at ${m.to}`);
  if (!at.includes(m.to)) fail(`${m.name} should be at ${m.to} and is not (found: ${at.join(', ') || 'no squad'})`);
  if (at.length > 1) fail(`${m.name} is in ${at.length} squads at once: ${at.join(', ')}`);
}
if (!failures) console.log(`   ${L.movedTo.length} moves all landed`);

/* ------------------------------------------------------------------ */
console.log('2) Players whose real club the game does not model are in no squad');
let before = failures;
for (const r of L.removedClubNotModelled) {
  const at = clubsOf(r.name);
  if (at.length) fail(`${r.name} is in the ${at.join(', ')} squad, but he plays for ${r.realClub}, which this game does not model`);
}
if (failures === before) console.log(`   ${L.removedClubNotModelled.length} correctly absent`);

/* ------------------------------------------------------------------ */
console.log('3) Every not-current name is in no squad at all');
before = failures;
for (const n of L.notCurrent) {
  const at = clubsOf(n.name);
  if (at.length) fail(`${n.name} is in the ${at.join(', ')} squad and must not be in any 2026-27 squad`);
}
if (failures === before) console.log(`   ${L.notCurrent.length} correctly absent`);

/* ------------------------------------------------------------------ */
console.log('4) Players the World Cup table confirmed are still in their squad');
before = failures;
for (const c of L.confirmedStill) {
  const at = clubsOf(c.name);
  if (!at.includes(c.club)) {
    fail(`${c.name} is no longer in the ${c.club} squad, but the 2026 World Cup squads put him there (${c.wc2026}). Two sources placed him: do not drop him on an absence.`);
  }
}
if (failures === before) console.log(`   ${L.confirmedStill.length} confirmed players still present`);

/* ------------------------------------------------------------------ */
console.log('5) Every pending player is still at exactly the club the ledger records');
before = failures;
let drifted = 0;
for (const p of L.pending) {
  const at = clubsOf(p.name);
  if (!at.includes(p.club)) {
    drifted += 1;
    if (drifted <= 8) fail(`${p.name} is recorded pending at ${p.club} but the roster has him at ${at.join(', ') || 'no club'}. Adjudicating a player means moving his row out of "pending", not editing the roster alone.`);
  }
}
if (drifted > 8) fail(`...and ${drifted - 8} more pending rows that no longer describe the shipped roster`);
if (failures === before) console.log(`   all ${L.pending.length} pending rows still describe the shipped file`);

/* ------------------------------------------------------------------ */
console.log('6) The five categories are disjoint and still add up');
before = failures;
const buckets = {
  confirmedStill: L.confirmedStill.map(x => x.name),
  movedTo: L.movedTo.map(x => x.name),
  removedClubNotModelled: L.removedClubNotModelled.map(x => x.name),
  notCurrent: L.notCurrent.map(x => x.name),
  pending: L.pending.map(x => x.name),
};
const seen = new Map();
for (const [bucket, names] of Object.entries(buckets)) {
  for (const n of names) {
    if (seen.has(n)) fail(`${n} is in both ${seen.get(n)} and ${bucket}`);
    else seen.set(n, bucket);
  }
}
const sum = Object.values(buckets).reduce((s, a) => s + a.length, 0);
if (sum !== L.population) fail(`the categories hold ${sum} names but the recorded population is ${L.population}`);
if (failures === before) console.log(`   ${sum} names across five categories, none repeated`);

/* ------------------------------------------------------------------ */
console.log('7) Every club left under 8 players is marked CM_PARTIAL');
before = failures;
const partial = new Set(PARTIAL);
for (const club of Object.keys(ROSTERS)) {
  if (ROSTERS[club].length < 8 && !partial.has(club)) {
    fail(`${club} has ${ROSTERS[club].length} real players and is not in CM_PARTIAL, so the game pads it with youth without saying so`);
  }
}
if (failures === before) console.log(`   ${PARTIAL.length} clubs marked, none missing`);

/* ------------------------------------------------------------------ */
console.log('8) The file metadata matches the file');
before = failures;
if (META.players !== totalPlayers) fail(`CM_ROSTER_META says ${META.players} players, the file has ${totalPlayers}`);
if (META.clubs !== Object.keys(ROSTERS).length) fail(`CM_ROSTER_META says ${META.clubs} clubs, the file has ${Object.keys(ROSTERS).length}`);
if (failures === before) console.log(`   ${totalPlayers} players, ${META.clubs} clubs, metadata agrees`);

/* ------------------------------------------------------------------ */
if (CONTROL === 'stale') {
  if (failures > 0) { console.log('\n   CONTROL FIRED: the reported row was caught'); process.exit(0); }
  console.error('\n   CONTROL DID NOT FIRE: the harness cannot see the very row the player reported');
  process.exit(1);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsimRosterAdjudication: all green');
