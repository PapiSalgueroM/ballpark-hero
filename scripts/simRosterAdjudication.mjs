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
 * which is why it settled 23 of the 356 and left 332 openly pending rather
 * than guessed.
 *
 * ROUND 616, 2026-09-15. The 18 pending Premier League rows were settled on the
 * web by two source families that had to agree on status and club (A, official:
 * the Premier League squad feed, club, league and UEFA pages; B, independent
 * press), each row carrying its own URLs and read dates. The same pass found two
 * World Cup table rows the summer window had overtaken: Julio Enciso moved on
 * from Strasbourg to Ipswich Town, and David Alaba left Real Madrid and is
 * unattached. Mykhaylo Mudryk is on a season-long loan, listed at the club he
 * plays for (Tottenham), the ledger's loanPolicy. 314 stay pending.
 *
 * WHAT THIS HOLDS, reading only committed files, no database and no build:
 *   1. Every adjudicated MOVE is at its new club and gone from the old one.
 *   2. Every player whose real club the game does not model is in no squad.
 *   3. Every NOT CURRENT name is in no squad at all.
 *   4. Every player two sources CONFIRMED is still in his squad, so a later
 *      sweep cannot quietly drop a man two sources placed there.
 *   5. Every PENDING player is still at exactly the club the ledger records.
 *      This is the one that stops the ledger rotting: adjudicate a player and
 *      you must move his row out of `pending`, you cannot just edit the roster.
 *   6. No name sits in two categories, and the five categories still add up to
 *      the recorded population.
 *   7. Every club the changes left under 8 players is marked CM_PARTIAL, which
 *      is the existing convention for a squad the game pads and says so.
 *   8. CM_ROSTER_META agrees with the file.
 *   9. Julio Enciso is at Ipswich Town and in no Strasbourg block.
 *  10. David Alaba is in no squad.
 *  11. Mykhaylo Mudryk is at Tottenham and not at Chelsea.
 *  Sections 9 to 11 name the players outright, so they hold even if a later
 *  edit to the ledger drops or rewrites the row.
 *
 * NEGATIVE CONTROLS, each on the in-memory roster copy, each required to turn
 * its own section red:
 *   ROSTER_ADJ_CONTROL=stale   Joao Felix back in the Chelsea block, the exact
 *                              row the player reported. Section 1.
 *   ROSTER_ADJ_CONTROL=enciso  Enciso out of Ipswich Town and back in the
 *                              Strasbourg block, as shipped before Round 616. Section 9.
 *   ROSTER_ADJ_CONTROL=alaba   Alaba back in the Real Madrid block. Section 10.
 *   ROSTER_ADJ_CONTROL=mudryk  Mudryk out of Tottenham and back in the Chelsea
 *                              block. Section 11.
 * A control refuses to run unless every block and row it touches appears exactly
 * once, and unless the edit really changes the source.
 *
 * Run: node scripts/simRosterAdjudication.mjs      (no database, no build)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
/* Which sections went red, so a control can prove its own section fired. */
let section = '';
const redSections = new Set();
const fail = m => { failures += 1; redSections.add(section); console.error('  FAIL: ' + m); };
const begin = (id, title) => { section = id; console.log(title); };

/* Each control puts back rows exactly as they shipped before the round that
   fixed them, and names the section that must catch it. */
const CONTROLS = {
  stale: { expect: '1', what: 'Joao Felix put back in the Chelsea block',
    add: [['Chelsea', `    { n: 'João Félix', p: 'CF', a: 26, v: 19.2, r: 82 },`]] },
  enciso: { expect: '9', what: 'Julio Enciso taken out of Ipswich Town and put back in the Strasbourg block',
    remove: [['Ipswich Town', 'Julio Enciso']],
    add: [['Strasbourg', `    { n: 'Julio Enciso', p: 'CAM', a: 21, v: 17.1, r: 81 },`]] },
  alaba: { expect: '10', what: 'David Alaba put back in the Real Madrid block',
    add: [['Real Madrid', `    { n: 'David Alaba', p: 'CB', a: 33, v: 4.3, r: 74 },`]] },
  mudryk: { expect: '11', what: 'Mykhaylo Mudryk taken out of Tottenham and put back in the Chelsea block',
    remove: [['Tottenham', 'Mykhaylo Mudryk']],
    add: [['Chelsea', `    { n: 'Mykhaylo Mudryk', p: 'LW', a: 24, v: 13.5, r: 80 },`]] },
};
const CONTROL = process.env.ROSTER_ADJ_CONTROL || '';
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) {
  console.error(`ROSTER_ADJ_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const ROSTER_PATH = path.join(ROOT, 'src/data/clubManagerRosters.ts');
/* LF, so the controls' block anchors match a CRLF checkout too. */
let source = fs.readFileSync(ROSTER_PATH, 'utf8').split('\r\n').join('\n');

if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const refuse = m => { console.error(`CONTROL ${CONTROL} refuses to run: ${m}`); process.exit(1); };
  const count = (hay, needle) => hay.split(needle).length - 1;
  const block = club => {
    const head = `  '${club}': [\n`;
    if (count(source, head) !== 1) refuse(`the ${club} block appears ${count(source, head)} times, not exactly once`);
    const start = source.indexOf(head) + head.length;
    return { start, end: source.indexOf('  ],\n', start) };
  };
  for (const [club, name] of c.remove || []) {
    const prefix = `    { n: '${name}',`;
    if (count(source, prefix) !== 1) refuse(`${name} appears ${count(source, prefix)} times in the file, not exactly once`);
    const { start, end } = block(club);
    const at = source.indexOf(prefix);
    if (at < start || at >= end) refuse(`${name} is not in the ${club} block`);
    source = source.slice(0, at) + source.slice(source.indexOf('\n', at) + 1);
  }
  for (const [club, row] of c.add || []) {
    const before = source;
    const { start, end } = block(club);
    const name = row.match(/n: '([^']+)'/)[1];
    if (source.slice(start, end).includes(`n: '${name}'`)) refuse(`${name} is already in the ${club} block, the edit would change nothing`);
    source = source.slice(0, start) + row + '\n' + source.slice(start);
    if (source === before) refuse('the edit changed nothing');
  }
  console.log(`   NEGATIVE CONTROL ON: ${c.what}, section ${c.expect} must go red`);
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
begin('1', '\n1) Every adjudicated move is at its new club and gone from the old one');
for (const m of L.movedTo) {
  const at = clubsOf(m.name);
  if (at.includes(m.from)) fail(`${m.name} is still in the ${m.from} squad, but the ledger's sources put him at ${m.to}`);
  if (!at.includes(m.to)) fail(`${m.name} should be at ${m.to} and is not (found: ${at.join(', ') || 'no squad'})`);
  if (at.length > 1) fail(`${m.name} is in ${at.length} squads at once: ${at.join(', ')}`);
}
if (!failures) console.log(`   ${L.movedTo.length} moves all landed`);

/* ------------------------------------------------------------------ */
begin('2', '2) Players whose real club the game does not model are in no squad');
let before = failures;
for (const r of L.removedClubNotModelled) {
  const at = clubsOf(r.name);
  if (at.length) fail(`${r.name} is in the ${at.join(', ')} squad, but he plays for ${r.realClub}, which this game does not model`);
}
if (failures === before) console.log(`   ${L.removedClubNotModelled.length} correctly absent`);

/* ------------------------------------------------------------------ */
begin('3', '3) Every not-current name is in no squad at all');
before = failures;
for (const n of L.notCurrent) {
  const at = clubsOf(n.name);
  if (at.length) fail(`${n.name} is in the ${at.join(', ')} squad and must not be in any 2026-27 squad`);
}
if (failures === before) console.log(`   ${L.notCurrent.length} correctly absent`);

/* ------------------------------------------------------------------ */
begin('4', '4) Players two sources confirmed are still in their squad');
before = failures;
for (const c of L.confirmedStill) {
  const at = clubsOf(c.name);
  if (!at.includes(c.club)) {
    const by = c.wc2026 ? `the 2026 World Cup squads (${c.wc2026})` : `the ledger's sources (read ${c.adjudicatedOn})`;
    fail(`${c.name} is no longer in the ${c.club} squad, but ${by} put him there. Two sources placed him: do not drop him on an absence.`);
  }
}
if (failures === before) console.log(`   ${L.confirmedStill.length} confirmed players still present`);

/* ------------------------------------------------------------------ */
begin('5', '5) Every pending player is still at exactly the club the ledger records');
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
begin('6', '6) The five categories are disjoint and still add up');
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
begin('7', '7) Every club left under 8 players is marked CM_PARTIAL');
before = failures;
const partial = new Set(PARTIAL);
for (const club of Object.keys(ROSTERS)) {
  if (ROSTERS[club].length < 8 && !partial.has(club)) {
    fail(`${club} has ${ROSTERS[club].length} real players and is not in CM_PARTIAL, so the game pads it with youth without saying so`);
  }
}
if (failures === before) console.log(`   ${PARTIAL.length} clubs marked, none missing`);

/* ------------------------------------------------------------------ */
begin('8', '8) The file metadata matches the file');
before = failures;
if (META.players !== totalPlayers) fail(`CM_ROSTER_META says ${META.players} players, the file has ${totalPlayers}`);
if (META.clubs !== Object.keys(ROSTERS).length) fail(`CM_ROSTER_META says ${META.clubs} clubs, the file has ${Object.keys(ROSTERS).length}`);
if (failures === before) console.log(`   ${totalPlayers} players, ${META.clubs} clubs, metadata agrees`);

/* ------------------------------------------------------------------ */
/* Round 616 by name. Two sources each, recorded on the ledger rows.   */
/* ------------------------------------------------------------------ */
begin('9', '9) Julio Enciso is at Ipswich Town and in no Strasbourg block');
before = failures;
{
  const at = clubsOf('Julio Enciso');
  if (at.length !== 1 || at[0] !== 'Ipswich Town') fail(`Julio Enciso should be at Ipswich Town alone, who signed him from Strasbourg on 2026-08-17, and is at ${at.join(', ') || 'no club'}`);
  if (at.includes('Strasbourg')) fail('Julio Enciso is in the Strasbourg block, the June 2026 club the summer window overtook');
}
if (failures === before) console.log('   at Ipswich Town, not Strasbourg');

begin('10', '10) David Alaba is in no squad');
before = failures;
{
  const at = clubsOf('David Alaba');
  if (at.length) fail(`David Alaba is in the ${at.join(', ')} squad, but he left Real Madrid when his contract ran out in 2026 and is unattached`);
}
if (failures === before) console.log('   in no squad');

begin('11', '11) Mykhaylo Mudryk is at Tottenham and not at Chelsea');
before = failures;
{
  const at = clubsOf('Mykhaylo Mudryk');
  if (!at.includes('Tottenham')) fail(`Mykhaylo Mudryk should be at Tottenham, on a season-long loan from Chelsea, and is at ${at.join(', ') || 'no club'}`);
  if (at.includes('Chelsea')) fail('Mykhaylo Mudryk is in the Chelsea block, but a season-long loanee is listed at the club he plays for (the ledger loanPolicy)');
}
if (failures === before) console.log('   at Tottenham, not Chelsea');

/* ------------------------------------------------------------------ */
if (CONTROL) {
  const { expect } = CONTROLS[CONTROL];
  if (redSections.has(expect)) { console.log(`\n   CONTROL FIRED: section ${expect} caught it (red: ${[...redSections].join(', ')})`); process.exit(0); }
  console.error(`\n   CONTROL DID NOT FIRE: section ${expect} stayed green (red: ${[...redSections].join(', ') || 'none'})`);
  process.exit(1);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsimRosterAdjudication: all green');
