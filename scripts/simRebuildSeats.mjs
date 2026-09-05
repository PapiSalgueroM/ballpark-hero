/* Rebuild seats harness, Round 461: the table, driven with no page.
 *
 * WHAT IT DRIVES. src/lib/rebuildTable.ts seats one to four players at one
 * table, one RunState per seat: humans pick clubs in seat order, CPU seats
 * draw theirs, the windows run seat by seat (a CPU seat plays the thinking
 * policy from src/lib/rebuildPolicy.ts to the whistle in one call), and when
 * the last window shuts the finished XIs play one seeded season together
 * (simulateSharedSeason in src/lib/rebuildDeck.ts, through the same fixture
 * player as the solo season). This bundles the REAL modules with esbuild,
 * builds every club's market through the REAL buildMarket from the baked
 * pool (scripts/data/rebuildMarket.json), and plays hundreds of tables
 * through the very functions the hook calls, with the human seats driven by
 * the policies the way scripts/simRebuildLoop.mjs drives a single run.
 *
 * WHAT IT HOLDS
 *   1) two, three and four seat tables all finish: every window shuts with
 *      every shirt settled after the same number of spins, every seat drew
 *      its own envelope, and the season is played with a full table and a
 *      position for every seat
 *   2) no two seats share a club, and no two seats end the window holding
 *      the same man: every other seat's squad is cut from a seat's market,
 *      and so is every man an earlier seat signed or lost to a rival
 *   3) a CPU seat IS the thinking policy: a table of CPU seats and a table
 *      of human seats driven by the thinking policy, same clubs, same salt,
 *      end in byte identical runs
 *   4) skill beats spam at the table: the CPU seats finish above human seats
 *      playing keep everything and sell everything by the floors
 *      simRebuildLoop holds for the thinking policy, on rating and on the
 *      target
 *   5) the season tracks the squads: over many tables the higher rated of two
 *      seats finishes above the lower rated one far more often than not, the
 *      table adds up, the positions match it, and the records and trophies
 *      are results and tallies about the XIs that played and nothing more
 *   6) the hand over hides the previous board: while the phone changes hands
 *      no run is on the board and the seat in the chair has not opened, the
 *      hook hands the page seats without their runs, and the page's hand
 *      over block (comments stripped) reads none of the open window's
 *      readings
 *   7) one salt, one table: a replay is byte identical, another salt differs
 *
 * NEGATIVE CONTROLS, each patching a copy of a file after normalising CRLF,
 * asserting the text it rewrites is present exactly once, and refusing to
 * run otherwise:
 *   SIM_REBUILD_SEATS_CONTROL=shuffle  rotates the seats' ratings inside
 *                                      simulateSharedSeason, so every squad
 *                                      plays the season on the next seat's
 *                                      rating: section 5 must FAIL
 *   SIM_REBUILD_SEATS_CONTROL=share    hands every seat the uncut single
 *                                      player market, with the other seats'
 *                                      men still in it: section 2 must FAIL
 *   SIM_REBUILD_SEATS_CONTROL=dumbcpu  makes the CPU seat play keep
 *                                      everything: sections 3 and 4 must FAIL
 *   SIM_REBUILD_SEATS_CONTROL=leak     leaves the shut seat in the chair and
 *                                      makes activeRun blind to the phase, so
 *                                      the shut board is what the hook would
 *                                      show during the hand over: section 6
 *                                      must FAIL
 *   SIM_REBUILD_SEATS_CONTROL=peek     makes the page's hand over block print
 *                                      the XI: section 6 must FAIL
 *
 * Run: node scripts/simRebuildSeats.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const TMP = os.tmpdir().replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CONTROLS = ['shuffle', 'share', 'dumbcpu', 'leak', 'peek'];
const CONTROL = process.env.SIM_REBUILD_SEATS_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`SIM_REBUILD_SEATS_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

/* ---------- module paths, patched in place for a control ---------- */

const DECK_SRC = `${ROOT}/src/lib/rebuildDeck.ts`;
const TABLE_SRC = `${ROOT}/src/lib/rebuildTable.ts`;
const HOOK_SRC = `${ROOT}/src/hooks/useRebuild.ts`;
const PAGE_SRC = `${ROOT}/src/components/rebuild/RebuildBoard.tsx`;
/* Under the ignored .sim-control, in a folder of its own: runAllSims runs the
   harnesses side by side and simRebuildLoop clears the parent. */
const CONTROL_DIR = `${ROOT}/.sim-control/seats`;
fs.rmSync(CONTROL_DIR, { recursive: true, force: true });

const readLf = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Rewrites text in memory, refusing unless every old text is present exactly once. */
function rewrite(label, src, edits) {
  let out = src;
  for (const [oldText, newText] of edits) {
    const hits = out.split(oldText).length - 1;
    if (hits !== 1) {
      console.error(`control cannot fire: ${label} contains the text it rewrites ${hits} times, not once`);
      console.error(oldText);
      process.exit(1);
    }
    out = out.replace(oldText, newText);
  }
  return out;
}

function patchedCopy(file, edits, outName) {
  fs.mkdirSync(CONTROL_DIR, { recursive: true });
  const out = `${CONTROL_DIR}/${outName}`;
  fs.writeFileSync(out, rewrite(path.basename(file), readLf(file), edits));
  return out;
}

let deckPath = DECK_SRC;
let tablePath = TABLE_SRC;
let pageSrc = readLf(PAGE_SRC);
if (CONTROL === 'shuffle') {
  deckPath = patchedCopy(DECK_SRC, [[
    'const rows: SeasonRow[] = teams.map(t => mk({ name: t.name, clubName: t.clubName, emoji: t.emoji, rating: t.rating, seat: t.seat }));',
    'const rows: SeasonRow[] = teams.map((t, k) => mk({ name: t.name, clubName: t.clubName, emoji: t.emoji, rating: teams[(k + 1) % teams.length].rating, seat: t.seat }));',
  ]], 'simRebuildSeats.control.rebuildDeck.ts');
  /* The table has to play the season through the patched deck, not the real one. */
  tablePath = patchedCopy(TABLE_SRC, [["} from '@/lib/rebuildDeck';", `} from '${deckPath}';`]], 'simRebuildSeats.control.rebuildTable.ts');
  console.log('NEGATIVE CONTROL ON: every seat plays the season on the next seat\'s rating');
}
if (CONTROL === 'share') {
  tablePath = patchedCopy(TABLE_SRC, [[
    'const market = others.length === 0 ? base : base.filter(p => !otherClubs.has(p.club) && !taken.has(p.name));',
    'const market = base;',
  ]], 'simRebuildSeats.control.rebuildTable.ts');
  console.log('NEGATIVE CONTROL ON: every seat is dealt from the uncut single player market');
}
if (CONTROL === 'dumbcpu') {
  tablePath = patchedCopy(TABLE_SRC, [[
    'const first = playToWhistle(run, THINKING);',
    'const first = playToWhistle(run, KEEP_ALL);',
  ]], 'simRebuildSeats.control.rebuildTable.ts');
  console.log('NEGATIVE CONTROL ON: the CPU seat keeps every man the wheel lands on');
}
if (CONTROL === 'leak') {
  tablePath = patchedCopy(TABLE_SRC, [
    ["return t.phase === 'window' ? (t.seats[t.turn]?.run ?? null) : null;", 'return t.seats[t.turn]?.run ?? null;'],
    ["if (turn < t.seats.length) return { ...t, turn, phase: 'handover' };", "if (turn < t.seats.length) return { ...t, phase: 'handover' };"],
  ], 'simRebuildSeats.control.rebuildTable.ts');
  console.log('NEGATIVE CONTROL ON: the shut seat stays in the chair and its run is on the board through the hand over');
}
if (CONTROL === 'peek') {
  pageSrc = rewrite('RebuildBoard.tsx', pageSrc, [[
    'Windows shut so far</p>',
    "Windows shut so far</p>\n              {startingXi.map(p => p?.name ?? '40 overall').join(', ')}",
  ]]);
  console.log('NEGATIVE CONTROL ON: the hand over screen prints the XI');
}

/* ---------- bundle the real modules ---------- */

const ENTRY = `${TMP}/rebuildSeats.entry.mjs`;
const BUNDLE = `${TMP}/rebuildSeats.bundle.mjs`;
fs.writeFileSync(ENTRY, `
export * as deck from '${deckPath}';
export * as loop from '${ROOT}/src/lib/rebuildLoop.ts';
export * as policy from '${ROOT}/src/lib/rebuildPolicy.ts';
export * as table from '${tablePath}';
export { normalizePosition } from '${ROOT}/src/lib/squadDeal.ts';
export { getEnrichment } from '${ROOT}/src/data/footleEnrichment.ts';
`);
try {
  execSync(
    `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`,
    { stdio: 'inherit' },
  );
} finally {
  fs.rmSync(CONTROL_DIR, { recursive: true, force: true });
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { deck, loop, policy, table, normalizePosition, getEnrichment } = await import(pathToFileURL(BUNDLE).href);

/* ---------- fixtures, the same mapping simRebuildLoop and fetchRebuild do ---------- */

const squadsFixture = JSON.parse(fs.readFileSync(`${ROOT}/scripts/data/rebuildSquads.json`, 'utf8'));
const marketFixture = JSON.parse(fs.readFileSync(`${ROOT}/scripts/data/rebuildMarket.json`, 'utf8'));

function toSquad(rows) {
  const out = [];
  for (const [name, rawPos, age, usd] of rows) {
    const position = normalizePosition(rawPos || '');
    if (!position) continue;
    out.push({
      name, position, age, club: 'x', nationality: 'Unknown', league: 'Other',
      goals: 0, assists: 0, kitNumber: null, difficulty: 'easy',
      marketValue: Math.max(1, Math.round((usd || 1_000_000) / 1_000_000)),
    });
  }
  return out;
}
const MARKET_ROWS = marketFixture.rows.map(([player_name, position, age, nationality, club, market_value_usd]) => ({ player_name, position, age, nationality, club, market_value_usd }));
const leagueOf = (name, club) => getEnrichment(name, club).league;
const CLUBS = squadsFixture.clubs.map(c => ({ club: c.club, tier: c.tier, squadSize: c.squad.length, squadValueM: 0 }));
const SQUADS = new Map(squadsFixture.clubs.map(c => [c.club, toSquad(c.squad)]));
/* One market per club, cut the way the single player fetch cuts it (everyone
   outside that club); the table cuts the other seats out of it itself. */
const DATA = {
  squads: SQUADS,
  markets: new Map(CLUBS.map(c => [c.club, deck.buildMarket(MARKET_ROWS, c.club, leagueOf)])),
  preset: 'none',
};

const { KEEP_ALL, SELL_ALL, THINKING } = policy;
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
/* Conduct, as opposed to a simulated result: the line scripts/simNoInventedConduct.mjs draws. */
const CONDUCT = /transfer request|bust-up|bust up|agents? for|leaked|reject(ed|s)? a|refus(ed|es)|demand(ed|s)|storm(ed|s) out|fell out|falling out|row over|walked out|went on strike|downed tools|sulk|tantrum|forced? (a|his) (move|exit)|handed in/i;

console.log(`Rebuild seats: ${CLUBS.length} clubs, ${MARKET_ROWS.length} market rows pulled ${marketFixture.pulled}${CONTROL ? `  [CONTROL=${CONTROL}]` : ''}`);

/* ---------- the driver ---------- */

/* Salt 0 is the page's own (a club plays the run it always has); the rest
   vary the runs. SIM_REBUILD_SEATS_SALTS widens the sample for a measurement. */
const SALT_COUNT = Number(process.env.SIM_REBUILD_SEATS_SALTS || 160);
const SALTS = [0, ...Array.from({ length: SALT_COUNT - 1 }, (_, k) => deck.hashSeed(`table-${k + 1}`))];

/** A human seat's club, by hash of the salt and the seat, never one already held. */
function pickByHash(t, seat) {
  const open = CLUBS.filter(c => !t.seats.some(s => s.club?.club === c.club));
  return open[deck.hashSeed(`pick-${t.salt}-${seat.index}`) % open.length];
}

/** What a run decided, for a byte for byte comparison. */
const stripRun = s => JSON.stringify({
  decided: Object.fromEntries(Object.entries(s.decided).map(([k, p]) => [k, p ? p.name : null])),
  sold: s.sold.map(p => p.name),
  signed: s.signed.map(p => p.name),
  lost: s.lost,
  manager: s.manager?.id ?? null,
  funds: s.reckoning.funds,
  notes: s.reckoning.notes,
  rating: loop.ratingOf(s),
});

let handoverChecks = 0;
let leaks = 0;

/** Plays a whole table through the table's own functions: the clubs, every
 *  window in turn, the season. Human seats are driven by `pol` one move at a
 *  time through updateRun, the way the hook applies a tap; a CPU seat plays
 *  inside openWindow. Every refused move is a finding. */
function playTable(kinds, salt, pol, pickFor = pickByHash) {
  let t = table.createTable(kinds, salt);
  if (!t.seats.some(s => s.kind === 'human')) t = table.drawClubs(t, CLUBS);
  let picks = 0;
  while (t.phase === 'clubs') {
    if (++picks > 8) throw new Error(`salt ${salt}: the clubs never got picked`);
    const seat = t.seats[t.turn];
    const club = pickFor(t, seat);
    const next = table.pickClub(t, club, CLUBS);
    if (next === t) throw new Error(`salt ${salt}: pickClub refused ${club?.club} for seat ${seat.index}`);
    t = next;
  }
  while (t.phase === 'handover') {
    const seat = t.seats[t.turn];
    /* The hand over: nothing on the board, the seat in the chair not yet open. */
    if (t.seats.some(s => s.run?.phase === 'done')) {
      handoverChecks += 1;
      if (table.activeRun(t) !== null || (table.activeSeat(t)?.run ?? null) !== null) leaks += 1;
    }
    const opened = table.openWindow(t, DATA, CLUBS);
    if (opened === t) throw new Error(`salt ${salt}: openWindow refused for seat ${t.turn} (${seat.kind}, ${seat.club?.club})`);
    t = opened;
    if (seat.kind === 'human') {
      let steps = 0;
      for (;;) {
        const s = table.activeRun(t);
        if (!s) throw new Error(`salt ${salt}: no run on the board while seat ${seat.index}'s window is open`);
        if (s.phase === 'done') break;
        if (++steps > 800) throw new Error(`salt ${salt}: seat ${seat.index} did not reach the whistle in 800 steps`);
        const { what, next } = policy.policyMove(s, pol);
        if (next === s) throw new Error(`${pol.name} at ${seat.club.club}: "${what}" was refused with the same state back (phase ${s.phase}, spun ${s.spun}, deal ${!!s.deal}, war ${!!s.war})`);
        const after = table.updateRun(t, () => next);
        if (after === t) throw new Error(`salt ${salt}: updateRun refused "${what}" for seat ${seat.index}`);
        t = after;
      }
    }
    const closed = table.closeWindow(t, CLUBS);
    if (closed === t) throw new Error(`salt ${salt}: closeWindow refused for seat ${t.turn}`);
    t = closed;
  }
  if (t.phase !== 'season' || !t.season) throw new Error(`salt ${salt}: the table ended in phase ${t.phase} with ${t.season ? 'a' : 'no'} season`);
  return t;
}

/* ================= 1. every table finishes ================= */
console.log('\n1. TWO, THREE AND FOUR SEATS ALL FINISH');
const finished = [];
let tried = 0;
for (const n of [2, 3, 4]) {
  for (const salt of SALTS) {
    const cpuKinds = Array(n).fill('cpu');
    const mixKinds = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'human' : 'cpu'));
    for (const [kinds, label] of [[cpuKinds, 'cpu'], [mixKinds, 'mixed']]) {
      tried += 1;
      try {
        finished.push({ n, salt, label, t: playTable(kinds, salt, THINKING) });
      } catch (e) {
        fail(e.message);
      }
    }
  }
}
{
  let windows = 0;
  let unsettled = 0;
  let spinsOff = 0;
  let tableShort = 0;
  let positionsOff = 0;
  let sameEnvelope = 0;
  const bySeats = { 2: 0, 3: 0, 4: 0 };
  const spinsSeen = new Set();
  for (const f of finished) {
    bySeats[f.n] += 1;
    const seats = f.t.seats;
    const spins = seats[0].run.order.length;
    for (const s of seats) {
      windows += 1;
      spinsSeen.add(s.run.order.length);
      if (s.run.phase !== 'done' || s.run.settledCount !== s.run.formation.slots.length || !s.run.reckoning) unsettled += 1;
      if (s.run.order.length !== spins || s.run.settledCount !== spins) spinsOff += 1;
    }
    const demands = seats.map(s => s.run.board.demands.map(o => o.id).join('|') + '#' + s.run.financeDeck.map(c => c.id ?? c.title).join('|'));
    if (new Set(demands).size !== demands.length) sameEnvelope += 1;
    const season = f.t.season;
    if (season.table.length !== table.SEASON_SIZE) tableShort += 1;
    const pos = season.positions;
    if (pos.length !== f.n || new Set(pos).size !== pos.length || pos.some(p => p < 1 || p > season.table.length)) positionsOff += 1;
  }
  console.log(`  ${finished.length} of ${tried} tables finished (${bySeats[2]} two seat, ${bySeats[3]} three seat, ${bySeats[4]} four seat, half all CPU and half humans and CPU mixed), ${windows} windows shut`);
  console.log(`  spins per window: ${[...spinsSeen].join(', ')}; windows unsettled at the whistle ${unsettled}, seats spun a different count ${spinsOff}; tables where two seats drew the same envelopes ${sameEnvelope}`);
  console.log(`  seasons short of ${table.SEASON_SIZE} teams ${tableShort}, tables with a position missing or doubled ${positionsOff}`);
  if (finished.length < tried) fail(`only ${finished.length} of ${tried} tables reached the season`);
  if (unsettled > 0) fail(`${unsettled} windows shut with a shirt unsettled or no reckoning`);
  if (spinsOff > 0) fail(`${spinsOff} seats spun a different number of times from the first seat`);
  if (spinsSeen.size !== 1) fail(`the windows ran for ${[...spinsSeen].join(' and ')} spins, not one number`);
  if (tableShort > 0) fail(`${tableShort} seasons were played short of ${table.SEASON_SIZE} teams`);
  if (positionsOff > 0) fail(`${positionsOff} seasons handed a seat no position, or two seats one position`);
  if (sameEnvelope > 0) fail(`${sameEnvelope} tables dealt two seats the same board and the same finance deck`);
}

/* ================= 2. no two seats share a club or a man ================= */
console.log('\n2. NO TWO SEATS SHARE A CLUB OR A MAN');
{
  let sameClub = 0;
  let sameMan = 0;
  let marketLeak = 0;
  let marketsChecked = 0;
  let namesHeld = 0;
  for (const f of finished) {
    const seats = f.t.seats;
    const clubs = seats.map(s => s.club.club);
    if (new Set(clubs).size !== clubs.length) sameClub += 1;
    const holders = new Map();
    for (const s of seats) {
      const mine = new Set();
      for (const p of s.run.reckoning.xi) if (p) mine.add(p.name);
      for (const p of s.run.signed) mine.add(p.name);
      for (const name of mine) {
        namesHeld += 1;
        if (!holders.has(name)) holders.set(name, new Set());
        holders.get(name).add(s.index);
      }
    }
    if ([...holders.values()].some(set => set.size > 1)) sameMan += 1;
    /* The cut itself: no other seat's squad, nothing an earlier seat signed or lost. */
    for (const s of seats) {
      const others = seats.filter(o => o !== s);
      const otherClubs = new Set(others.map(o => o.club.club));
      const banned = new Set();
      for (const o of others) for (const p of SQUADS.get(o.club.club)) banned.add(p.name);
      for (const o of others.filter(o => o.index < s.index)) {
        for (const p of o.run.signed) banned.add(p.name);
        for (const n of Object.keys(o.run.lost)) banned.add(n);
        for (const p of o.run.reckoning.xi) if (p) banned.add(p.name);
      }
      marketsChecked += 1;
      if (s.run.market.some(p => otherClubs.has(p.club) || banned.has(p.name))) marketLeak += 1;
    }
  }
  console.log(`  ${finished.length} tables: two seats at one club ${sameClub}; ${namesHeld} shirts and signings held, tables where one man was held by two seats ${sameMan}`);
  console.log(`  ${marketsChecked} seat markets checked, markets still holding another seat's man ${marketLeak}`);
  if (sameClub > 0) fail(`${sameClub} tables seated two players at the same club`);
  if (sameMan > 0) fail(`${sameMan} tables ended with one man held by two seats`);
  if (marketLeak > 0) fail(`${marketLeak} seat markets still held another seat's squad or an earlier seat's signing`);
}

/* ================= 3. the CPU seat is the thinking policy ================= */
console.log('\n3. THE CPU SEAT IS THE THINKING POLICY');
const fours = [];
{
  let compared = 0;
  let differ = 0;
  for (const salt of SALTS) {
    try {
      const cpu = playTable(['cpu', 'cpu', 'cpu', 'cpu'], salt, THINKING);
      const sameClubs = (t, seat) => cpu.seats[seat.index].club;
      const think = playTable(['human', 'human', 'human', 'human'], salt, THINKING, sameClubs);
      for (let k = 0; k < 4; k += 1) {
        compared += 1;
        if (stripRun(cpu.seats[k].run) !== stripRun(think.seats[k].run)) differ += 1;
      }
      fours.push({ salt, cpu, think, sameClubs });
    } catch (e) {
      fail(e.message);
    }
  }
  console.log(`  ${compared} CPU windows replayed by a human seat on the thinking policy at the same club and salt: differing ${differ}`);
  if (compared < SALTS.length * 4) fail(`only ${compared} of ${SALTS.length * 4} CPU windows could be compared`);
  if (differ > 0) fail(`${differ} CPU windows differ from the thinking policy played by hand, so the CPU seat is not the policy the harness measures`);
}

/* ================= 4. skill beats spam at the table ================= */
console.log('\n4. SKILL BEATS SPAM AT THE TABLE');
const spamTables = [];
{
  const summary = {};
  const runsOf = { cpu: [], keep: [], sell: [] };
  for (const f of fours) {
    for (const s of f.cpu.seats) runsOf.cpu.push(s.run);
    try {
      const keep = playTable(['human', 'human', 'human', 'human'], f.salt, KEEP_ALL, f.sameClubs);
      const sell = playTable(['human', 'human', 'human', 'human'], f.salt, SELL_ALL, f.sameClubs);
      for (const s of keep.seats) runsOf.keep.push(s.run);
      for (const s of sell.seats) runsOf.sell.push(s.run);
      spamTables.push(keep, sell);
    } catch (e) {
      fail(e.message);
    }
  }
  for (const name of ['cpu', 'keep', 'sell']) {
    const rs = runsOf[name];
    const delta = mean(rs.map(r => loop.ratingOf(r) - r.startRating));
    const hit = mean(rs.map(r => (loop.ratingOf(r) >= r.target ? 1 : 0)));
    const debt = mean(rs.map(r => (r.reckoning.windowFunds < 0 ? 1 : 0)));
    summary[name] = { delta, hit, debt, n: rs.length };
    const label = name === 'cpu' ? 'CPU seat (thinking)' : name === 'keep' ? 'keep everything' : 'sell everything';
    console.log(`  ${label.padEnd(20)} rating ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} on average, target hit ${(hit * 100).toFixed(0)}%, closed in debt ${(debt * 100).toFixed(0)}% over ${rs.length} windows`);
  }
  const t = summary.cpu;
  const k = summary.keep;
  const d = summary.sell;
  /* The same floors simRebuildLoop section 7 holds for the thinking policy
     on single runs (1.5 and 0.6 rating points, 8 and 2 points on the hit
     rate). Measured at the table on 2026-09-05, 640 windows a policy at the
     same clubs and salts (160 salts, four seats): CPU +1.51 against keep
     everything -1.49 and sell everything -0.09, gaps of 3.0 and 1.6 points;
     target hit 14% against 0% and 10%, gaps of 14 and 4 points. The floors
     sit at about half of each gap, as they do there. The hit rate is the
     coarse one: on 40 salts (160 windows) it read 12% against 11%, which is
     why the sample is 160 salts and not 40. The salts are fixed, so the
     numbers move only when the deck or the policy does. */
  if (!(t.delta >= k.delta + 1.5)) fail(`the CPU seat (${t.delta.toFixed(2)}) does not beat keep everything (${k.delta.toFixed(2)}) by 1.5 rating points`);
  if (!(t.delta >= d.delta + 0.6)) fail(`the CPU seat (${t.delta.toFixed(2)}) does not beat sell everything (${d.delta.toFixed(2)}) by 0.6 rating points`);
  if (!(t.hit >= k.hit + 0.08)) fail(`the CPU seat hits the target ${(t.hit * 100).toFixed(0)}% against keep everything's ${(k.hit * 100).toFixed(0)}%, not 8 points clear`);
  if (!(t.hit >= d.hit + 0.02)) fail(`the CPU seat hits the target ${(t.hit * 100).toFixed(0)}% against sell everything's ${(d.hit * 100).toFixed(0)}%, not 2 points clear`);
}

/* ================= 5. the season tracks the squads ================= */
console.log('\n5. THE SEASON TRACKS THE SQUADS');
{
  const seasons = [...finished.map(f => f.t), ...fours.flatMap(f => [f.cpu, f.think]), ...spamTables];
  let pairs = 0;
  let agree = 0;
  let topTitles = 0;
  let rowsOff = 0;
  let goalsOff = 0;
  let positionsOff = 0;
  let recordsOff = 0;
  let trophiesOff = 0;
  let conduct = 0;
  let titlesToSeats = 0;
  let boots = 0;
  for (const t of seasons) {
    const season = t.season;
    const ratings = t.seats.map(s => loop.ratingOf(s.run));
    for (let i = 0; i < ratings.length; i += 1) {
      for (let j = i + 1; j < ratings.length; j += 1) {
        if (ratings[i] === ratings[j]) continue;
        pairs += 1;
        if ((ratings[i] > ratings[j]) === (season.positions[i] < season.positions[j])) agree += 1;
      }
    }
    const best = ratings.indexOf(Math.max(...ratings));
    if (season.positions[best] === 1) topTitles += 1;

    const rows = season.table;
    let gf = 0;
    let ga = 0;
    for (const r of rows) {
      gf += r.gf;
      ga += r.ga;
      if (r.w + r.d + r.l !== season.gamesEach || r.pts !== 3 * r.w + r.d) rowsOff += 1;
    }
    if (gf !== ga) goalsOff += 1;
    for (let i = 1; i < rows.length; i += 1) {
      const a = rows[i - 1];
      const b = rows[i];
      if (a.pts < b.pts || (a.pts === b.pts && a.gf - a.ga < b.gf - b.ga)) rowsOff += 1;
    }
    t.seats.forEach((s, k) => {
      if (rows[season.positions[k] - 1]?.seat !== s.index) positionsOff += 1;
    });
    for (const rec of season.records) {
      const seat = t.seats.find(s => s.index === rec.seat);
      const row = rows.find(r => r.seat === rec.seat);
      if (!seat || !row) { recordsOff += 1; continue; }
      const xi = seat.run.reckoning.xi.filter(Boolean);
      if ((rec.biggestWin === null) !== (row.w === 0)) recordsOff += 1;
      if (rec.longestUnbeaten > season.gamesEach || (rec.longestUnbeaten === 0) !== (row.w + row.d === 0)) recordsOff += 1;
      if (rec.topScorer) {
        if (rec.topScorer.goals > row.gf || rec.topScorer.goals < 1 || !xi.some(p => p.name === rec.topScorer.player)) recordsOff += 1;
      } else if (xi.length > 0) recordsOff += 1;
      if (rec.biggestWin && CONDUCT.test(rec.biggestWin)) conduct += 1;
    }
    const title = season.trophies.find(x => x.title === 'League title');
    if (!title || (title.seat ?? null) !== (rows[0].seat ?? null)) trophiesOff += 1;
    if (title && title.seat !== null) titlesToSeats += 1;
    const boot = season.trophies.find(x => x.title === 'Golden Boot');
    if (boot) {
      boots += 1;
      const seat = t.seats.find(s => s.index === boot.seat);
      if (!seat || !seat.run.reckoning.xi.some(p => p && p.name === boot.winner)) trophiesOff += 1;
    }
    for (const x of season.trophies) if (CONDUCT.test(x.winner) || CONDUCT.test(x.detail) || CONDUCT.test(x.title)) conduct += 1;
    if (CONDUCT.test(season.thriller)) conduct += 1;
  }
  const share = pairs ? agree / pairs : 0;
  console.log(`  ${seasons.length} seasons: the higher rated of two seats finished above the lower one in ${(share * 100).toFixed(0)}% of ${pairs} pairs; the top rated seat took the title ${(topTitles / seasons.length * 100).toFixed(0)}% of the time, a seat rather than a neutral club ${(titlesToSeats / seasons.length * 100).toFixed(0)}%`);
  console.log(`  rows that do not add up ${rowsOff}, seasons where goals for and against disagree ${goalsOff}, positions off the table ${positionsOff}, records off ${recordsOff}, trophies off ${trophiesOff} (${boots} Golden Boots), lines with conduct beside a name ${conduct}`);
  /* Measured 2026-09-05 over 1600 seasons of ten games a team (6463 pairs):
     80% of pairs in rating order and the top rated seat champion 45% of the
     time; with the ratings rotated (the shuffle control) 40% and 11%. The
     floor sits between the two arms, a little nearer the healthy one, and
     the salts are fixed so the number moves only when the goal model does. */
  if (!(share >= 0.62)) fail(`the higher rated seat finished above the lower one in only ${(share * 100).toFixed(0)}% of pairs, so the season is not playing the squads that were built (80% healthy, 40% with the ratings rotated)`);
  if (rowsOff > 0) fail(`${rowsOff} table rows do not add up or sit out of order`);
  if (goalsOff > 0) fail(`${goalsOff} seasons scored more goals than were conceded`);
  if (positionsOff > 0) fail(`${positionsOff} seat positions disagree with the table`);
  if (recordsOff > 0) fail(`${recordsOff} squad records are not tallies of the games the squad played`);
  if (trophiesOff > 0) fail(`${trophiesOff} trophies went to the wrong row or to a man who did not play`);
  if (conduct > 0) fail(`${conduct} season lines put conduct beside a name`);
}

/* ================= 6. the hand over hides the previous board ================= */
console.log('\n6. THE HAND OVER HIDES THE PREVIOUS BOARD');
{
  console.log(`  ${handoverChecks} hand overs after a shut window: a run on the board or the chair already open ${leaks} times`);
  if (handoverChecks < 100) fail(`only ${handoverChecks} hand overs were checked`);
  if (leaks > 0) fail(`${leaks} hand overs had the shut window's run on the board`);

  const tableCode = stripComments(readLf(TABLE_SRC));
  const hookCode = stripComments(readLf(HOOK_SRC));
  if (!tableCode.includes("export type SeatView = Omit<Seat, 'run'>;")) fail('rebuildTable.ts no longer defines SeatView as a seat without its run');
  if (!/seats: SeatView\[\];/.test(hookCode) || !/seat: SeatView \| null;/.test(hookCode)) fail('useRebuild hands the board seats with their runs, so a hand over could reach the last board');
  else console.log('  the hook hands the board SeatView[] and a SeatView, seats without their runs');

  const code = stripComments(pageSrc);
  const start = code.indexOf("if (phase === 'handover') {");
  if (start < 0) fail('the page has no hand over block');
  else {
    const rest = code.slice(start + 1);
    const nextBranch = /\n  (if \(|const |return )/.exec(rest);
    const block = rest.slice(0, nextBranch ? nextBranch.index : rest.length);
    if (!/scoreboard/.test(block) || !/takeSeat/.test(block)) fail('the hand over block reads neither the scoreboard nor takeSeat, so this is not the block');
    const READINGS = /\b(run|startingXi|objectives|deal|war|sold|signed|formation|decided|budget|spendCeiling|rivals|season|incumbent)\b/;
    const hit = READINGS.exec(block);
    if (hit) fail(`the page's hand over block reads "${hit[1]}", a reading of the open window`);
    else console.log(`  the page's hand over block (${block.split('\n').length} lines, comments stripped) reads the scoreboard and none of the window's readings`);
    if (!/numbers|none of it is showing/.test(block)) fail('the hand over block no longer tells the room the last window is not showing');
  }
}

/* ================= 7. one salt, one table ================= */
console.log('\n7. ONE SALT, ONE TABLE');
{
  const strip = t => JSON.stringify({
    seats: t.seats.map(s => [s.club.club, stripRun(s.run)]),
    table: t.season.table.map(r => [r.clubName, r.pts, r.gf, r.ga]),
    trophies: t.season.trophies.map(x => [x.title, x.winner]),
  });
  try {
    const a = strip(playTable(['cpu', 'human', 'cpu'], 4242, THINKING));
    const b = strip(playTable(['cpu', 'human', 'cpu'], 4242, THINKING));
    const c = strip(playTable(['cpu', 'human', 'cpu'], 4243, THINKING));
    if (a !== b) fail('the same salt and seats produced two different tables');
    if (a === c) fail('two different salts produced the same table');
    console.log(`  salt 4242 replays byte for byte across three seats and a season, salt 4243 differs`);
  } catch (e) {
    fail(e.message);
  }
}

/* ================= verdict ================= */
console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`control "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`control "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simRebuildSeats: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('simRebuildSeats: all checks passed');
