/* Sports Bingo seats harness, Round 727: the table, driven with no page.
 *
 * WHAT IT DRIVES. src/lib/sportsBingo.ts seats two to four players at one
 * table (createTable, openTurn, revealNext, claimSquare, closeTurn,
 * declareWinner): one card per seat off one seeded deal, the ten packs the
 * same objects for every seat, a turn per seat on every pack, CPU seats
 * playing their temper inside the engine, and a verdict when the round in
 * which somebody met the goal is over, or after pack ten. This bundles the
 * REAL module with esbuild over the baked pool (src/data/players.ts, the
 * same fallback pool the game plays offline) and plays hundreds of tables
 * through the very functions the page calls, the human seats driven by
 * scripted policies.
 *
 * WHAT IT HOLDS
 *   1) one call, every card: every seat's view of the deal carries the
 *      identical pack sequence, and during play every seat is shown the
 *      same players in the same order
 *   2) the families mean what they say: over every one of the 63 family
 *      picks, a card never carries a condition outside the pick when the
 *      pick can fill 24 squares, the fallback flag is raised exactly when it
 *      cannot, and a topped up card still carries every allowed condition
 *      and exactly the shortfall from outside the pick
 *   3) every seat's card is completable from the shared packs, restricted
 *      picks included, and a perfect seat blacks it out
 *   4) the verdict is the rule: with seats finishing after different numbers
 *      of players turned up, the engine's winner equals a winner computed
 *      here from the rule as written (fewest players to the goal, then most
 *      squares, shared when level, most squares when nobody got there), its
 *      doneAt bookkeeping matches the harness's own count, and the table
 *      stops after the round the goal was first met in
 *   5) the three tempers keep their order at a table, by margins set from
 *      measured runs, so filling seats with CPUs does not flatten them
 *   6) saves: a Round 428 daily record loads unchanged, a table survives a
 *      round trip, and six kinds of wreckage load as nothing
 *   7) the hand over hides every card: the component the phone changes
 *      hands on reads nothing of the deal, and the page hands it a name and
 *      a pack number and nothing else
 *   8) one seed, one table: a replay is byte identical, another seed differs
 *
 * NEGATIVE CONTROLS, each patching a copy of a file after normalising CRLF,
 * asserting the text it rewrites is present exactly once, and refusing to
 * run otherwise:
 *   SIM_BINGO_SEATS_CONTROL=split      rotates the packs per seat, so seat two
 *                                      hears pack two first: sections 1 and
 *                                      3 must FAIL
 *   SIM_BINGO_SEATS_CONTROL=anyfamily  ignores the family pick when dealing:
 *                                      section 2 must FAIL
 *   SIM_BINGO_SEATS_CONTROL=tiebreak   drops the fewest players rule from the
 *                                      verdict: section 4 must FAIL
 *   SIM_BINGO_SEATS_CONTROL=peek       makes the hand over print a card and
 *                                      the page hand it one: section 7 must
 *                                      FAIL
 *
 * Run: node scripts/simBingoSeats.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
/* The bundler through its own API rather than node_modules/.bin, so the
   harness also runs from a git worktree that resolves its modules by walking
   up to the main tree's node_modules (where the .bin path does not exist). */
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const TMP = os.tmpdir().replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CONTROLS = ['split', 'anyfamily', 'tiebreak', 'peek'];
const CONTROL = process.env.SIM_BINGO_SEATS_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`SIM_BINGO_SEATS_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

/* ---------- module paths, patched in place for a control ---------- */

const LIB_SRC = `${ROOT}/src/lib/sportsBingo.ts`;
const PAGE_SRC = `${ROOT}/src/pages/SportsBingo.tsx`;
const HANDOVER_SRC = `${ROOT}/src/components/sports-bingo/BingoHandOver.tsx`;
const CONTROL_DIR = `${ROOT}/.sim-control/bingo-seats`;
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

let libPath = LIB_SRC;
let pageSrc = readLf(PAGE_SRC);
let handoverSrc = readLf(HANDOVER_SRC);
if (CONTROL === 'split') {
  libPath = patchedCopy(LIB_SRC, [[
    'return { cardIds: t.cards[index], packs: t.packs };',
    'return { cardIds: t.cards[index], packs: [...t.packs.slice(index), ...t.packs.slice(0, index)] };',
  ]], 'simBingoSeats.control.sportsBingo.ts');
  console.log('NEGATIVE CONTROL ON: every seat hears the packs rotated by its seat number');
}
if (CONTROL === 'anyfamily') {
  libPath = patchedCopy(LIB_SRC, [[
    'const allowed = allowedConditions(families);',
    'const allowed = allowedConditions(ALL_FAMILIES);',
  ]], 'simBingoSeats.control.sportsBingo.ts');
  console.log('NEGATIVE CONTROL ON: the deal ignores the family pick');
}
if (CONTROL === 'tiebreak') {
  libPath = patchedCopy(LIB_SRC, [[
    'field = met.filter(s => s.doneAt === first);',
    'field = met;',
  ]], 'simBingoSeats.control.sportsBingo.ts');
  console.log('NEGATIVE CONTROL ON: the verdict no longer prefers the seat that got there with fewer players turned up');
}
if (CONTROL === 'peek') {
  handoverSrc = rewrite('BingoHandOver.tsx', handoverSrc, [[
    "{first ? 'First up' : 'Pass the phone'}",
    "{first ? 'First up' : 'Pass the phone'} {String(marked)}",
  ]]);
  pageSrc = rewrite('SportsBingo.tsx', pageSrc, [[
    'onReady={takeTurn}',
    "onReady={takeTurn}\n            peek={seatInChair.marked.join(',')}",
  ]]);
  console.log('NEGATIVE CONTROL ON: the hand over prints the card and the page hands it one');
}

/* ---------- bundle the real module ---------- */

const ENTRY = `${TMP}/bingoSeats.entry.mjs`;
const BUNDLE = `${TMP}/bingoSeats.bundle.mjs`;
fs.writeFileSync(ENTRY, `
export * as bingo from '${libPath}';
export { players as POOL } from '${ROOT}/src/data/players.ts';
`);
try {
  await esbuild.build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': `${ROOT}/src` } });
} finally {
  fs.rmSync(CONTROL_DIR, { recursive: true, force: true });
}
const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
const { bingo, POOL } = await import(pathToFileURL(BUNDLE).href);
const {
  ALL_FAMILIES, CARD_SIZE, CONDITIONS, CPU_LEVELS, DIFFICULTIES, FREE_INDEX, PACK_COUNT, PACK_SIZE, PACK_SECONDS,
  allowedConditions, claimSquare, claimableSquares, closeTurn, conditionById, createTable, dealCards, declareWinner,
  goalMet, lehmer, lineCount, loadBingoTable, loadDailyBingo, openTurn, parseBingoTable, revealNext, saveBingoTable,
  seatGame, squaresOf,
} = bingo;

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const packPrint = packs => packs.flat().map(p => p.name).join(',');
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

console.log(`Sports Bingo seats: pool ${POOL.length}, ${CONDITIONS.length} conditions in ${ALL_FAMILIES.length} families${CONTROL ? `  [CONTROL=${CONTROL}]` : ''}`);

/* ---------- the driver ---------- */

const PERFECT = { name: 'perfect', reveal: 5, keep: () => true };
const EAGER = { name: 'eager', reveal: 3, keep: () => true };
const SLEEPY = { name: 'sleepy', reveal: 2, keep: () => true };
const IDLE = { name: 'idle', reveal: 5, keep: () => false };
const coin = rng => ({ name: 'coin', reveal: 5, keep: () => rng() < 0.5 });

/* Which pack a CPU seat played inside the last engine call, or null when it
   did not play. After a human at seat h closes its turn on pack p, the engine
   runs on through the CPU seats after h up to the next human (pack p); when
   no human follows, the round is over, and unless the table ended it opens
   pack p+1 and runs through the CPU seats before the first human. At the
   deal, the CPU seats before the first human play pack 0. */
function cpuPackPlayed(prev, t, seatIndex, wasCreate) {
  if (wasCreate) return seatIndex < t.turn ? 0 : null;
  const h = prev.turn;
  const nextHuman = prev.seats.findIndex(x => x.kind === 'human' && x.index > h);
  const aEnd = nextHuman === -1 ? prev.seats.length : nextHuman;
  if (seatIndex > h && seatIndex < aEnd) return prev.packIndex;
  if (nextHuman === -1 && t.phase !== 'done' && seatIndex < t.turn) return prev.packIndex + 1;
  return null;
}

/** Plays a whole table through the engine. Human seats follow `policies[index]`
 *  one engine call at a time, the way the page applies a tap. Returns the
 *  finished table plus everything the harness counted for itself. */
function playTable(setup, seed, policies) {
  let t = createTable(POOL, seed, setup);
  const n = t.seats.length;
  const shown = t.seats.map(() => []); /* per seat: the players turned up, in order */
  const myDoneAt = t.seats.map(() => null);
  const turnsTaken = t.seats.map(() => 0);
  const prevMarked = t.seats.map(s => [...s.marked]);
  const packsOf = t.seats.map(() => []);

  const noteCpu = (prev, wasCreate) => {
    for (const s of t.seats) {
      if (s.kind !== 'cpu') continue;
      const changed = s.marked.some((m, i) => m !== prevMarked[s.index][i]);
      const p = cpuPackPlayed(prev, t, s.index, wasCreate);
      if (p === null) {
        if (changed) throw new Error(`seed ${seed}: CPU seat ${s.index} marked squares outside its turn`);
        continue;
      }
      turnsTaken[s.index] += 1;
      packsOf[s.index].push(p);
      for (const pl of seatGame(t, s.index).packs[p]) shown[s.index].push(pl.name);
      if (myDoneAt[s.index] === null && goalMet(s.marked, t.goal)) myDoneAt[s.index] = p * PACK_SIZE + PACK_SIZE;
      prevMarked[s.index] = [...s.marked];
    }
  };
  noteCpu(t, true);

  let guard = 0;
  while (t.phase !== 'done') {
    if (++guard > 200) throw new Error(`seed ${seed}: the table never finished`);
    if (t.phase !== 'handover') throw new Error(`seed ${seed}: phone stopped in phase ${t.phase}`);
    const seat = t.seats[t.turn];
    if (seat.kind !== 'human') throw new Error(`seed ${seed}: the phone stopped on a CPU seat`);
    const opened = openTurn(t);
    if (opened === t) throw new Error(`seed ${seed}: openTurn refused for seat ${seat.index}`);
    t = opened;
    const pol = policies[seat.index];
    turnsTaken[seat.index] += 1;
    packsOf[seat.index].push(t.packIndex);
    for (let r = 0; r < pol.reveal; r += 1) {
      const next = revealNext(t);
      if (next === t) throw new Error(`seed ${seed}: revealNext refused at ${t.revealed}`);
      t = next;
      shown[seat.index].push(seatGame(t, seat.index).packs[t.packIndex][t.revealed - 1].name);
    }
    const options = claimableSquares(seatGame(t, seat.index), t.packs[t.packIndex].slice(0, t.revealed), seat.marked);
    for (const sq of options) {
      if (!pol.keep()) continue;
      const before = t;
      t = claimSquare(t, sq);
      if (t === before) throw new Error(`seed ${seed}: claimSquare refused a claimable square ${sq}`);
      const mine = t.seats[seat.index];
      if (myDoneAt[seat.index] === null && goalMet(mine.marked, t.goal)) myDoneAt[seat.index] = t.packIndex * PACK_SIZE + t.revealed;
    }
    /* A square nothing turned up satisfies is refused unchanged. */
    const dud = [...Array(CARD_SIZE).keys()].find(sq => sq !== FREE_INDEX && !t.seats[seat.index].marked[sq] && !options.includes(sq));
    if (dud !== undefined && claimSquare(t, dud) !== t) throw new Error(`seed ${seed}: a square nobody shown satisfies was claimed`);
    prevMarked[seat.index] = [...t.seats[seat.index].marked];
    const prev = t;
    t = closeTurn(t);
    if (t === prev) throw new Error(`seed ${seed}: closeTurn refused`);
    noteCpu(prev, false);
  }
  return { t, shown, myDoneAt, turnsTaken, packsOf, n };
}

/** The rule as written, computed from the harness's own counts. */
function ruleVerdict(t, myDoneAt) {
  const met = t.seats.filter(s => myDoneAt[s.index] !== null);
  let field = t.seats;
  let by = 'squares';
  if (met.length > 0) {
    const first = Math.min(...met.map(s => myDoneAt[s.index]));
    field = met.filter(s => myDoneAt[s.index] === first);
    by = 'goal';
  }
  const top = Math.max(...field.map(s => squaresOf(s.marked)));
  return { winners: field.filter(s => squaresOf(s.marked) === top).map(s => s.index), by };
}

const SEEDS = Number(process.env.SIM_BINGO_SEATS_SEEDS || 60);
const seedAt = k => 7919 * (k + 1) + 13;
const NO_NATIONALITY = ALL_FAMILIES.filter(f => f !== 'nationality');
const LEAGUES_AND_POSITIONS = ['league', 'position'];
const PICKS = [['all', ALL_FAMILIES], ['no nationality', NO_NATIONALITY], ['leagues and positions', LEAGUES_AND_POSITIONS]];
const seatsOf = (kinds) => kinds.map((k, i) => (k === 'cpu'
  ? { kind: 'cpu', name: `CPU ${i}`, level: CPU_LEVELS[i % CPU_LEVELS.length].id }
  : { kind: 'human', name: `Seat ${i}`, level: 'casual' }));

/* ================= 1. one call, every card ================= */
console.log('\n1. EVERY SEAT HEARS THE SAME PACKS');
const dealt = [];
{
  let views = 0;
  let viewsOff = 0;
  for (const n of [2, 3, 4]) {
    for (const [label, families] of PICKS) {
      for (let k = 0; k < SEEDS; k += 1) {
        const kinds = Array.from({ length: n }, (_, i) => (i % 2 === 1 ? 'cpu' : 'human'));
        const t = createTable(POOL, seedAt(k), { seats: seatsOf(kinds), families, difficulty: 'standard', goal: 'line' });
        dealt.push({ n, label, families, t });
        const shared = packPrint(t.packs);
        for (let i = 0; i < n; i += 1) {
          views += 1;
          if (packPrint(seatGame(t, i).packs) !== shared) viewsOff += 1;
        }
      }
    }
  }
  console.log(`  ${dealt.length} tables dealt (two, three and four seats, three family picks, ${SEEDS} seeds each): ${views} seat views, views whose packs differ from the table's ${viewsOff}`);
  if (viewsOff > 0) fail(`${viewsOff} seat views carry a pack sequence other than the table's`);
}

/* ================= 2. the families mean what they say ================= */
console.log('\n2. THE FAMILIES MEAN WHAT THEY SAY');
{
  const subsets = [];
  for (let mask = 1; mask < (1 << ALL_FAMILIES.length); mask += 1) subsets.push(ALL_FAMILIES.filter((_, i) => mask & (1 << i)));
  let fillable = 0;
  let outside = 0;
  let flagOff = 0;
  let missingAllowed = 0;
  let shortfallOff = 0;
  let cards = 0;
  const FAM_SEEDS = Math.max(5, Math.floor(SEEDS / 4));
  for (const pick of subsets) {
    const keep = new Set(pick);
    const allowed = CONDITIONS.filter(c => keep.has(c.family));
    const canFill = allowed.length >= CARD_SIZE - 1;
    if (canFill) fillable += 1;
    for (let k = 0; k < FAM_SEEDS; k += 1) {
      const deal = dealCards(POOL, seedAt(k) ^ 0x2b7, 3, pick);
      if (deal.fallback !== !canFill) flagOff += 1;
      for (const card of deal.cards) {
        cards += 1;
        const ids = new Set(card);
        const out = card.filter(id => !keep.has(conditionById(id).family)).length;
        if (canFill) {
          if (out > 0) outside += 1;
        } else {
          if (out !== CARD_SIZE - 1 - allowed.length) shortfallOff += 1;
          if (!allowed.every(c => ids.has(c.id))) missingAllowed += 1;
        }
      }
    }
  }
  console.log(`  ${subsets.length} family picks, ${fillable} can fill a card on their own; ${cards} cards dealt`);
  console.log(`  cards outside the pick when it could fill ${outside}; fallback flag wrong ${flagOff}; topped up cards missing an allowed condition ${missingAllowed}, with the wrong shortfall ${shortfallOff}`);
  if (fillable !== 10) fail(`${fillable} picks can fill a card, the bank was 33 conditions in six families when this was written (10 picks)`);
  if (outside > 0) fail(`${outside} cards carry a condition outside a pick that could fill them`);
  if (flagOff > 0) fail(`${flagOff} deals raised or withheld the fallback flag against the pick's real count`);
  if (missingAllowed > 0) fail(`${missingAllowed} topped up cards dropped a condition the pick allowed`);
  if (shortfallOff > 0) fail(`${shortfallOff} topped up cards took other than exactly the shortfall from outside the pick`);
}

/* ================= 3. every card is completable from the shared packs ================= */
console.log('\n3. EVERY CARD IS COMPLETABLE FROM THE SHARED PACKS');
{
  let cards = 0;
  let incompletable = 0;
  let blackouts = 0;
  for (const { t } of dealt) {
    for (let i = 0; i < t.seats.length; i += 1) {
      cards += 1;
      const g = seatGame(t, i);
      const all = t.packs.flat();
      if (g.cardIds.some(id => !all.some(p => conditionById(id).test(p)))) incompletable += 1;
      const marked = new Array(CARD_SIZE).fill(false);
      for (const pack of g.packs) for (const sq of claimableSquares(g, pack, marked)) marked[sq] = true;
      if (squaresOf(marked) === CARD_SIZE - 1) blackouts += 1;
    }
  }
  console.log(`  ${cards} cards over ${dealt.length} tables: incompletable from the table's packs ${incompletable}, blacked out by a perfect seat through its own view ${blackouts}`);
  if (incompletable > 0) fail(`${incompletable} cards carry a condition the shared packs cannot satisfy`);
  if (blackouts !== cards) fail(`a perfect seat blacked out only ${blackouts} of ${cards} cards`);
}

/* ================= 4. the verdict is the rule ================= */
console.log('\n4. THE VERDICT IS THE RULE');
{
  const LINEUPS = [
    { kinds: ['human', 'human'], pols: [PERFECT, EAGER] },
    { kinds: ['human', 'cpu', 'human'], pols: [EAGER, null, PERFECT] },
    { kinds: ['human', 'human', 'human', 'cpu'], pols: [SLEEPY, PERFECT, EAGER, null] },
    { kinds: ['cpu', 'human', 'cpu', 'human'], pols: [null, PERFECT, null, 'coin'] },
    { kinds: ['human', 'human', 'human'], pols: [EAGER, EAGER, PERFECT] },
    /* Nobody at this table turns up every player, so on the full card goal
       it usually runs all ten packs and the square count decides. */
    { kinds: ['human', 'cpu', 'human'], pols: [SLEEPY, null, 'coin'] },
  ];
  let tables = 0;
  let verdictOff = 0;
  let doneAtOff = 0;
  let stopOff = 0;
  let turnsOff = 0;
  let shownOff = 0;
  let byGoal = 0;
  let bySquares = 0;
  let shared = 0;
  let revealsDecided = 0;
  let revealsOverSquares = 0;
  for (const goal of ['line', 'card']) {
    for (const lineup of LINEUPS) {
      for (let k = 0; k < SEEDS; k += 1) {
        const seed = seedAt(k) ^ (goal === 'line' ? 0x11 : 0x22);
        const rng = lehmer(seed + 5);
        const pols = lineup.pols.map(p => (p === 'coin' ? coin(rng) : p));
        let played;
        try {
          played = playTable({ seats: seatsOf(lineup.kinds), families: ALL_FAMILIES, difficulty: 'quick', goal }, seed, pols);
        } catch (e) {
          fail(e.message);
          continue;
        }
        const { t, shown, myDoneAt, turnsTaken, packsOf, n } = played;
        tables += 1;
        /* bookkeeping */
        for (const s of t.seats) if (s.doneAt !== myDoneAt[s.index]) doneAtOff += 1;
        /* stop after the round the goal was first met in, or after pack ten */
        const firstMet = myDoneAt.filter(d => d !== null);
        const expectLast = firstMet.length ? Math.ceil(Math.min(...firstMet) / PACK_SIZE) - 1 : PACK_COUNT - 1;
        if (t.packIndex !== expectLast) stopOff += 1;
        /* every seat took one turn per pack, on the same packs */
        const expectPacks = [...Array(expectLast + 1).keys()].join();
        for (let i = 0; i < n; i += 1) if (turnsTaken[i] !== expectLast + 1 || packsOf[i].join() !== expectPacks) turnsOff += 1;
        /* every seat was shown the same players in the same order, as far as it turned them up */
        const full = t.packs.slice(0, expectLast + 1).flat().map(p => p.name);
        for (let i = 0; i < n; i += 1) {
          const seen = shown[i];
          const perPack = t.seats[i].kind === 'cpu' ? PACK_SIZE : pols[i].reveal;
          for (let p = 0; p <= expectLast; p += 1) {
            for (let r = 0; r < perPack; r += 1) {
              if (seen[p * perPack + r] !== full[p * PACK_SIZE + r]) { shownOff += 1; p = expectLast + 1; break; }
            }
          }
        }
        /* the verdict */
        const mine = ruleVerdict(t, myDoneAt);
        const theirs = declareWinner(t);
        if (!sameSet(mine.winners, theirs.winners) || mine.by !== theirs.by) verdictOff += 1;
        if (mine.by === 'goal') byGoal += 1; else bySquares += 1;
        if (mine.winners.length > 1) shared += 1;
        const met = t.seats.filter(s => myDoneAt[s.index] !== null);
        if (met.length > 1 && new Set(met.map(s => myDoneAt[s.index])).size > 1) {
          revealsDecided += 1;
          const first = Math.min(...met.map(s => myDoneAt[s.index]));
          const topMet = Math.max(...met.map(s => squaresOf(s.marked)));
          if (!met.some(s => myDoneAt[s.index] === first && squaresOf(s.marked) === topMet)) revealsOverSquares += 1;
        }
      }
    }
  }
  console.log(`  ${tables} tables played (both goals, ${LINEUPS.length} lineups of two to four seats, ${SEEDS} seeds each): verdicts off the rule ${verdictOff}, doneAt off the harness's count ${doneAtOff}`);
  console.log(`  tables that stopped on the wrong pack ${stopOff}, seats that took the wrong turns ${turnsOff}, seats shown a different sequence ${shownOff}`);
  console.log(`  decided by the goal ${byGoal}, by the square count after ten packs ${bySquares}, shared ${shared}; tables where seats reached the goal with different counts ${revealsDecided}, of which the fewest count seat had fewer squares than another finisher ${revealsOverSquares}`);
  if (verdictOff > 0) fail(`${verdictOff} verdicts disagree with the rule as written`);
  if (doneAtOff > 0) fail(`${doneAtOff} seats carry a doneAt the harness did not count`);
  if (stopOff > 0) fail(`${stopOff} tables stopped on a pack other than the round the goal was first met in`);
  if (turnsOff > 0) fail(`${turnsOff} seats took a different number of turns or different packs from the table`);
  if (shownOff > 0) fail(`${shownOff} seats were shown players out of the shared order`);
  /* Coverage: every branch of the rule has to have been exercised, or the
     tiebreak control has nothing to bite and a dead branch would read green.
     Measured 2026-10-01 over 720 tables on these fixed seeds: 123 tables
     with finishers on different counts, 79 of them where the fewest count
     seat had fewer squares than another finisher, and 54 decided by the
     square count after ten packs. The floors sit at about half of each. */
  if (revealsDecided < 50) fail(`only ${revealsDecided} tables had finishers on different counts, too few to exercise the tie rule`);
  if (revealsOverSquares < 35) fail(`only ${revealsOverSquares} tables set the fewest count against the most squares, too few to tell the rule from a square count`);
  if (bySquares < 25) fail(`only ${bySquares} tables were decided by the square count, too few to exercise the no finisher branch`);
}

/* ================= 5. the tempers keep their order at a table ================= */
console.log('\n5. THE TEMPERS KEEP THEIR ORDER AT A TABLE');
{
  const GAMES = 120;
  const totals = { casual: [], sharp: [], ruthless: [] };
  for (let k = 0; k < GAMES; k += 1) {
    const seed = 104729 * (k + 1);
    const seats = [
      { kind: 'human', name: 'Idle', level: 'casual' },
      { kind: 'cpu', name: 'Casual CPU', level: 'casual' },
      { kind: 'cpu', name: 'Sharp CPU', level: 'sharp' },
      { kind: 'cpu', name: 'Ruthless CPU', level: 'ruthless' },
    ];
    let played;
    try {
      played = playTable({ seats, families: ALL_FAMILIES, difficulty: 'standard', goal: 'card' }, seed, [IDLE, null, null, null]);
    } catch (e) {
      fail(e.message);
      continue;
    }
    for (const s of played.t.seats) if (s.kind === 'cpu') totals[s.level].push(squaresOf(s.marked));
  }
  const casual = mean(totals.casual);
  const sharp = mean(totals.sharp);
  const ruthless = mean(totals.ruthless);
  console.log(`  over ${GAMES} four seat tables on the full card goal: casual ${casual.toFixed(1)}, sharp ${sharp.toFixed(1)}, ruthless ${ruthless.toFixed(1)} squares`);
  /* simSportsBingo section 5 pins the solo run at about 9.4, 17.9 and 22.1
     (gaps 8.5 and 4.2) and demands 2. At the table a ruthless blackout ends
     the game early for everyone, so the table numbers sit at or near the
     solo ones; measured 2026-10-01 over these 120 seeds: 9.5, 17.9, 22.3,
     gaps of 8.4 and 4.4. Same floor of 2, under half the smaller gap. */
  if (!(sharp >= casual + 2)) fail(`sharp (${sharp.toFixed(1)}) does not clearly out-mark casual (${casual.toFixed(1)}) at a table`);
  if (!(ruthless >= sharp + 2)) fail(`ruthless (${ruthless.toFixed(1)}) does not clearly out-mark sharp (${sharp.toFixed(1)}) at a table`);
  const secs = DIFFICULTIES.map(d => d.seconds);
  if (!(secs[0] > secs[1] && secs[1] > secs[2]) || secs[1] !== PACK_SECONDS) fail(`the difficulties run ${secs.join(', ')} seconds, not strictly slower to faster through the solo pace`);
  else console.log(`  difficulties run ${secs.join(', ')} seconds a pack, the middle one the solo pace`);
}

/* ================= 6. saves ================= */
console.log('\n6. SAVES LOAD UNCHANGED, WRECKAGE LOADS AS NOTHING');
{
  store.clear();
  const date = '2026-09-30';
  const board = new Array(CARD_SIZE).fill(false).map((_, i) => i % 3 === 0);
  /* The Round 428 record exactly as that round wrote it. */
  store.set(`sports-bingo-daily-${date}`, JSON.stringify({ marked: board, v: 1, date }));
  const rec = loadDailyBingo(date);
  if (!rec || rec.date !== date || rec.marked.join() !== board.join()) fail('a Round 428 daily record no longer loads unchanged');
  else console.log('  the Round 428 daily record loads unchanged');
  if (loadDailyBingo('2026-10-01') !== null) fail('a daily record loaded for a day it was not written on');

  const t = (() => {
    const played = playTable({ seats: seatsOf(['human', 'cpu', 'human']), families: NO_NATIONALITY, difficulty: 'relaxed', goal: 'card' }, 4242, [EAGER, null, PERFECT]);
    return played.t;
  })();
  saveBingoTable(t);
  const back = loadBingoTable();
  if (JSON.stringify(back) !== JSON.stringify(t)) fail('a finished table does not survive a round trip through storage');
  /* Mid game too: the phone on a human seat with squares marked. */
  let mid = createTable(POOL, 999, { seats: seatsOf(['cpu', 'human', 'human']), families: ALL_FAMILIES, difficulty: 'quick', goal: 'line' });
  mid = openTurn(mid);
  mid = revealNext(revealNext(mid));
  for (const sq of claimableSquares(seatGame(mid, mid.turn), mid.packs[0].slice(0, 2), mid.seats[mid.turn].marked)) mid = claimSquare(mid, sq);
  saveBingoTable(mid);
  const midBack = loadBingoTable();
  if (JSON.stringify(midBack) !== JSON.stringify(mid)) fail('a table mid turn does not survive a round trip through storage');
  else console.log(`  a finished table and a table mid turn (${squaresOf(mid.seats[mid.turn].marked)} squares marked, 2 players up) both round trip byte for byte`);

  const WRECKAGE = [
    ['garbage', 'not json at all {'],
    ['truncated', '{"v":1,"table":{"seed":12'],
    ['hostileVersion', '{"v":999,"table":{}}'],
    ['emptyObject', '{}'],
    ['bareNull', 'null'],
    ['emptyArray', '[]'],
    ['cpuInChair', JSON.stringify({ v: 1, table: { ...t, phase: 'handover', turn: t.seats.findIndex(s => s.kind === 'cpu') } })],
    ['unknownSquare', JSON.stringify({ v: 1, table: { ...t, cards: t.cards.map(c => ['not-a-condition', ...c.slice(1)]) } })],
  ];
  let survived = 0;
  for (const [label, raw] of WRECKAGE) {
    const got = parseBingoTable(raw);
    if (got !== null) fail(`wreckage "${label}" loaded as a table`);
    else survived += 1;
  }
  console.log(`  ${survived} of ${WRECKAGE.length} kinds of wreckage load as nothing`);
}

/* ================= 7. the hand over hides every card ================= */
console.log('\n7. THE HAND OVER HIDES EVERY CARD');
{
  const READINGS = /\b(marked|cards|packs|squareCondition|claimable|revealed|seatGame|BingoCardGrid|BingoPackList|Player)\b/;
  const comp = stripComments(handoverSrc);
  const hit = READINGS.exec(comp);
  if (hit) fail(`BingoHandOver reads "${hit[1]}", a reading of the deal`);
  else console.log(`  BingoHandOver (${comp.split('\n').length} lines, comments stripped) reads nothing of the deal`);
  if (!/show me the pack/.test(comp) || !/\{name\}/.test(comp)) fail('BingoHandOver no longer shows the next name and a ready button, so this is not the hand over');

  const page = stripComments(pageSrc);
  const open = page.indexOf('<BingoHandOver');
  if (open < 0) fail('the page never draws BingoHandOver');
  else {
    const close = page.indexOf('/>', open);
    const element = page.slice(open, close);
    const leak = READINGS.exec(element);
    if (leak) fail(`the page hands the hand over "${leak[1]}", a reading of the deal`);
    else console.log(`  the page hands the hand over ${(element.match(/\w+=\{/g) || []).length} props and none of them reads the deal`);
    if (!/name=\{seatInChair\.name\}/.test(element) || !/packNumber=/.test(element)) fail('the hand over element no longer receives the next name and the pack number');
  }
}

/* ================= 8. one seed, one table ================= */
console.log('\n8. ONE SEED, ONE TABLE');
{
  const setup = { seats: seatsOf(['human', 'cpu', 'human']), families: NO_NATIONALITY, difficulty: 'standard', goal: 'line' };
  const strip = p => JSON.stringify({ seats: p.t.seats, cards: p.t.cards, packs: packPrint(p.t.packs), verdict: declareWinner(p.t) });
  try {
    const a = strip(playTable(setup, 31337, [PERFECT, null, EAGER]));
    const b = strip(playTable(setup, 31337, [PERFECT, null, EAGER]));
    const c = strip(playTable(setup, 31338, [PERFECT, null, EAGER]));
    if (a !== b) fail('the same seed and seats produced two different tables');
    if (a === c) fail('two different seeds produced the same table');
    console.log('  seed 31337 replays byte for byte across three seats and a verdict, seed 31338 differs');
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
  console.error(`simBingoSeats: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('simBingoSeats: all checks passed');
