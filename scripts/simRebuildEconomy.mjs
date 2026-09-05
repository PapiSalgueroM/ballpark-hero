/* Rebuild economy harness, Round 435: the two numbers the board judges you on.
 *
 * WHAT WENT WRONG, both measured on the shipped Round 434 code.
 *
 * 1. THE OPENING DELTA. The hook stored startRating as the average of the
 *    shirts somebody was actually in, and the HUD read the same XI with an
 *    empty shirt counted as 40. Two formulas for one number. The 15 of 66
 *    clubs whose real 2026 squad cannot fill a 4-3-3 therefore opened at
 *    minus 3 or minus 4 and were graded "You made it worse" before the player
 *    had spun a single shirt. The target is computed off startRating too, so
 *    those clubs were also asked for 3 or 4 points more than they should be.
 *
 * 2. CONTRADICTORY BOARD DEMANDS. dealObjectivesWithIdentity could deal "sign
 *    a true galactico worth 80M or more" beside "no single signing over 60M".
 *    Whatever the player did, one of the two drew a punishment card. Measured
 *    over 5000 seeds: 25.1% of elite hands and 25.0% of modest hands held a
 *    pair no window can satisfy, and 3 of the 66 real clubs (Barcelona,
 *    Gladbach, Celtic) were dealt one of those hands every single run.
 *
 * HOW THIS MEASURES IT, and why it is not just re-running the code.
 *
 * Section 1 walks all 66 clubs of scripts/data/rebuildSquads.json (real rows
 * from player_market_values, baked by scripts/bakeRebuildSquads.mjs) in all 9
 * shapes, and compares the shipped openingRating() against the expression the
 * HUD's own memo evaluates at mount. Those are two different pieces of shipped
 * code, so the comparison is real; three source pins keep the harness's model
 * honest by failing if either call site stops being the one it models, or if
 * the shape picker stops re-taking the opening reading. That last one was the
 * other half of the same bug: Manchester United switched from the 4-3-3 to a
 * 4-1-2-1-2 its squad actually fits and banked 4 points for nothing, while the
 * target, which is built off the opening reading, stayed where it was.
 *
 * Section 2 knows nothing about which pairs are impossible. For every hand it
 * SEARCHES a space of 40,040 candidate windows (signings and sales drawn from
 * a value ladder, ages and nationalities set so the non-money cards can pass)
 * and fails if no window in it satisfies all three cards. That catches a
 * contradiction nobody has thought of yet, including one built from a card
 * added next year, which a table of known bad pairs never would.
 *
 * And it holds the other end: refusing a pair must not collapse the deck onto
 * a couple of safe hands. Measured after the fix, 5000 seeds deal 48, 54, 48
 * and 48 distinct hands across the four tiers and the 66 real clubs see 51
 * distinct boards; the floors sit at 35 and 30. Before the fix those numbers
 * were 4, 4, 4, 4 and 15, because the old draw agreed with the seed's low
 * three bits modulo the deck size, so this section fails the old code twice
 * over: 8 failures, contradictions and variety both.
 *
 * NEGATIVE CONTROLS, one per defect, each restoring the real Round 434 code:
 *   SIM_REBUILD_ECONOMY_CONTROL=mismatch    puts the old two-formula opening
 *                                           back in rebuildLoop.ts (the engine
 *                                           the hook wraps since Round 456).
 *                                           Section 1 must FAIL on 207 of the
 *                                           594 openings, worst delta minus 9.
 *   SIM_REBUILD_ECONOMY_CONTROL=unfiltered  puts the old unfiltered deal back
 *                                           in rebuildDeck.ts. Section 2 must
 *                                           FAIL on contradictions AND on
 *                                           variety.
 * Both patch a copy of the file, both assert the text they replace is present
 * before they run, and both refuse to run if it is not.
 *
 * Run: node scripts/simRebuildEconomy.mjs
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

const CONTROL = process.env.SIM_REBUILD_ECONOMY_CONTROL || '';
if (CONTROL && CONTROL !== 'mismatch' && CONTROL !== 'unfiltered') {
  console.error(`SIM_REBUILD_ECONOMY_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

/* ---------- module paths, patched in place for a control ---------- */

/* Round 456: the opening reading moved out of the hook and into the pure
   engine, src/lib/rebuildLoop.ts, with the rest of the rules. The hook is a
   wrapper now, so this harness pins the engine's call sites instead. */
const HOOK_SRC = `${ROOT}/src/lib/rebuildLoop.ts`;
const DECK_SRC = `${ROOT}/src/lib/rebuildDeck.ts`;

/* A control's patched copy has to sit inside the worktree, or esbuild cannot
   resolve react and the run dies before any check has been made. It is deleted
   the moment the bundle exists. */
const CONTROL_DIR = `${ROOT}/.sim-control`;
fs.rmSync(CONTROL_DIR, { recursive: true, force: true });

/** Swap `oldText` for `newText` in a copy of `file`, or refuse to run. A
 *  control that cannot find what it is replacing changes nothing, and then
 *  green means "the control never fired" rather than "the check works". */
function patchedCopy(file, oldText, newText, outName) {
  /* Normalise first. Both needles below span several lines, and git checks this
     repo out with CRLF, so on any fresh clone an LF needle matches nothing and
     the control refuses to run instead of firing. */
  const src = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  if (!src.includes(oldText)) {
    console.error(`control cannot fire: ${path.basename(file)} no longer contains the text it rewrites`);
    console.error(oldText);
    process.exit(1);
  }
  fs.mkdirSync(CONTROL_DIR, { recursive: true });
  const out = `${CONTROL_DIR}/${outName}`;
  fs.writeFileSync(out, src.replace(oldText, newText));
  return out;
}

let hookPath = HOOK_SRC;
let deckPath = DECK_SRC;

if (CONTROL === 'mismatch') {
  hookPath = patchedCopy(
    HOOK_SRC,
    'export function openingRating(formation: Formation, squad: Player[]): number {\n  return xiRatingWithHoles(buildXi(formation, squad));\n}',
    `export function openingRating(formation: Formation, squad: Player[]): number {
  const picked = buildXi(formation, squad).filter(Boolean) as Player[];
  if (picked.length === 0) return 0;
  return Math.round(picked.reduce((s, p) => s + playerRating(p), 0) / picked.length);
}`,
    'simRebuildEconomy.control.rebuildLoop.ts',
  );
}

if (CONTROL === 'unfiltered') {
  deckPath = patchedCopy(
    DECK_SRC,
    `export function dealObjectives(seed: number, held: BoardObjective[] = []): BoardObjective[] {
  let s = mixSeed(seed, 0x6f626a);
  const draw = (hand: BoardObjective[]): BoardObjective => {
    for (let tries = 0; tries < 40; tries += 1) {
      s = (s * 16807) % 2147483647;
      const card = OBJECTIVE_DECK[Math.floor(((s - 1) / 2147483646) * OBJECTIVE_DECK.length)];
      if (fitsWith(card, hand)) return card;
    }
    // The board always makes a demand: if the stream somehow never lands on a
    // card that fits, take one that does rather than deal an impossible pair.
    return OBJECTIVE_DECK.find(c => fitsWith(c, hand)) ?? OBJECTIVE_DECK[0];
  };
  const first = draw(held);
  return [first, draw([...held, first])];
}`,
    `export function dealObjectives(seed: number, held: BoardObjective[] = []): BoardObjective[] {
  void held;
  const first = pick(OBJECTIVE_DECK, seed, 101);
  let second = pick(OBJECTIVE_DECK, seed, 211);
  let salt = 211;
  while (second.id === first.id) {
    salt += 97;
    second = pick(OBJECTIVE_DECK, seed, salt);
  }
  return [first, second];
}`,
    'simRebuildEconomy.control.rebuildDeck.ts',
  );
}

/* ---------- bundle the real modules ---------- */

const ENTRY = `${TMP}/rebuildEconomy.entry.mjs`;
const BUNDLE = `${TMP}/rebuildEconomy.bundle.mjs`;
fs.writeFileSync(ENTRY, `
export * as deck from '${deckPath}';
export * as hook from '${hookPath}';
export { FORMATIONS, playerRating, normalizePosition } from '${ROOT}/src/lib/squadDeal.ts';
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
const { deck, hook, FORMATIONS, normalizePosition } = await import(pathToFileURL(BUNDLE).href);
const { buildXi, xiRatingWithHoles, dealObjectivesWithIdentity, hashSeed, TIER_BUDGET } = deck;
const { openingRating } = hook;

const F433 = FORMATIONS[0];
const fixture = JSON.parse(fs.readFileSync(`${ROOT}/scripts/data/rebuildSquads.json`, 'utf8'));

/** The same mapping src/lib/fetchRebuild.ts does on the rows this was baked from. */
function toSquad(rows) {
  const out = [];
  for (const [name, rawPos, age, usd] of rows) {
    const position = normalizePosition(rawPos || '');
    if (!position) continue;
    out.push({
      name, position, age, club: 'x', nationality: 'Unknown', league: 'Other',
      goals: 0, assists: 0, kitNumber: 0, difficulty: 'easy',
      marketValue: Math.max(1, Math.round((usd || 1_000_000) / 1_000_000)),
    });
  }
  return out;
}

console.log(`Rebuild economy: ${fixture.clubs.length} clubs, market data pulled ${fixture.pulled}${CONTROL ? `  [CONTROL=${CONTROL}]` : ''}`);

/* ================= 1. The opening delta is zero, at every club ================= */
console.log('\n1. THE OPENING READING');

/* Pin the harness's model of the two shipped call sites. Comments are stripped
   first: the prose above openingRating names both functions, and a guard that
   reads its own documentation proves nothing. */
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const hookCode = stripComments(fs.readFileSync(HOOK_SRC, 'utf8'));
if (!hookCode.includes('const startRating = openingRating(formation, setup.squad);')) {
  fail('createRun no longer stores startRating from openingRating(), so section 1 is measuring the wrong function');
}
if (!/const xi = xiOf\(s\);[\s\S]{0,200}xiRatingWithHoles\(xi, lift\)/.test(hookCode)) {
  fail('the live rating (ratingOf) no longer reads xiRatingWithHoles over xiOf(s), so this harness models a HUD that does not exist');
}
/* The shape is a pre spin choice, so the opening reading has to follow it.
   Without this line a squad with a hole in the 4-3-3 banks free points by
   switching to a shape it fits, and the target does not move with it. */
if (!/export function setFormation\([\s\S]{0,900}const startRating = openingRating\(formation, s\.squad\);/.test(hookCode)) {
  fail('setFormation no longer re-takes the opening reading, so a shape change hands out a delta nobody earned');
}

let holeClubs = 0;
let offenders = 0;
let openings = 0;
const deltas = [];
for (const c of fixture.clubs) {
  const squad = toSquad(c.squad);
  if (buildXi(F433, squad).some(p => !p)) holeClubs += 1;

  // Every shape the player can pick before the first spin, 4-3-3 first.
  for (const formation of FORMATIONS) {
    openings += 1;
    // What the hook stores, at the club choice and at every shape change.
    const stored = openingRating(formation, squad);
    // What the HUD's memo evaluates at that same moment: no coach yet, nothing
    // sold, nothing decided, so startingXi is the inherited XI with its holes.
    const startingXi = buildXi(formation, squad).map(p => p ?? null);
    const live = startingXi.some(Boolean) ? Math.max(1, Math.min(99, xiRatingWithHoles(startingXi))) : 0;

    if (live !== stored) {
      offenders += 1;
      deltas.push(live - stored);
      if (offenders <= 6) console.error(`  ${c.club} in ${formation.name}: stored ${stored}, HUD ${live}, delta ${live - stored}`);
    }
  }
}
if (offenders > 0) fail(`${offenders} of ${openings} club and shape openings show a delta the player did not earn (worst ${Math.min(...deltas)})`);
if (holeClubs < 5) fail(`only ${holeClubs} clubs have an unfillable 4-3-3, so this section cannot see the bug it exists for (15 when it was written)`);
console.log(`  ${fixture.clubs.length} clubs across ${FORMATIONS.length} shapes: ${openings} openings walked`);
console.log(`  ${holeClubs} clubs cannot fill a 4-3-3 from their own squad, openings on a non-zero delta: ${offenders}`);

/* ================= 2. The board never asks for two impossible things ================= */
console.log('\n2. THE BOARD DEMANDS');

const TIERS = ['elite', 'strong', 'mid', 'modest'];
const SIGN_LADDER = [5, 15, 20, 25, 35, 50, 60, 70, 80];
const SALE_LADDER = [5, 25, 30, 60, 90];

/** Every multiset of `values` up to `maxSize`, as arrays. */
function multisets(values, maxSize) {
  const out = [[]];
  let level = [[]];
  for (let size = 1; size <= maxSize; size += 1) {
    const next = [];
    for (const combo of level) {
      const from = combo.length ? values.indexOf(combo[combo.length - 1]) : 0;
      for (let i = from; i < values.length; i += 1) next.push([...combo, values[i]]);
    }
    out.push(...next);
    level = next;
  }
  return out;
}

/* The candidate windows. Ages sit at 22 and nationalities all match, so a card
   about youth or a national core can pass and only the money is in question. */
const signSets = multisets(SIGN_LADDER, 4).map(vals => vals.map((v, i) => ({
  name: `in${i}${v}`, position: 'CM', age: 22, nationality: 'Spain', marketValue: v,
  club: 'x', league: 'Other', goals: 0, assists: 0, kitNumber: 0, difficulty: 'easy',
})));
const saleSets = multisets(SALE_LADDER, 3).map(vals => vals.map((v, i) => ({
  name: `out${i}${v}`, position: 'CM', age: 27, nationality: 'Spain', marketValue: v,
  club: 'x', league: 'Other', goals: 0, assists: 0, kitNumber: 0, difficulty: 'easy',
})));
const sum = arr => arr.reduce((t, p) => t + p.marketValue, 0);
const signTotals = signSets.map(sum);
const saleTotals = saleSets.map(sum);
const candidateCount = signSets.length * saleSets.length;

/** Can ANY window in the candidate space satisfy every card in this hand? */
function satisfiable(hand, tier) {
  const base = TIER_BUDGET[tier];
  for (let i = 0; i < signSets.length; i += 1) {
    for (let j = 0; j < saleSets.length; j += 1) {
      const state = { signed: signSets[i], sold: saleSets[j], budget: base + saleTotals[j] - signTotals[i] };
      if (hand.every(o => o.check(state))) return true;
    }
  }
  return false;
}

const verdict = new Map();
function impossible(hand, tier) {
  const key = tier + ':' + hand.map(o => o.id).join('+');
  if (!verdict.has(key)) verdict.set(key, !satisfiable(hand, tier));
  return verdict.get(key);
}

// 2a. The 66 real clubs, which is the only deal a player ever actually sees.
let badClubs = 0;
const clubHands = new Set();
for (const c of fixture.clubs) {
  const hand = dealObjectivesWithIdentity(hashSeed(c.club), { club: c.club, tier: c.tier, squadSize: 0, squadValueM: 0 });
  clubHands.add(hand.map(o => o.id).sort().join('+'));
  if (impossible(hand, c.tier)) {
    badClubs += 1;
    if (badClubs <= 6) console.error(`  ${c.club} (${c.tier}) is dealt an unsatisfiable board: ${hand.map(o => o.id).join(' | ')}`);
  }
}
if (badClubs > 0) fail(`${badClubs} of the ${fixture.clubs.length} real clubs are dealt a board no window can satisfy`);
if (clubHands.size < 30) fail(`the 66 clubs only see ${clubHands.size} distinct boards, so the deck has stopped dealing (51 when this was written, floor 30)`);
console.log(`  66 real clubs: ${badClubs} unsatisfiable boards, ${clubHands.size} distinct boards dealt`);

// 2b. A wide seed sweep, because a club name is only a seed and the list grows.
let badHands = 0;
let hands = 0;
const varietyLine = [];
for (const tier of TIERS) {
  const seen = new Set();
  let bad = 0;
  for (let s = 0; s < 5000; s += 1) {
    const hand = dealObjectivesWithIdentity(hashSeed(`rebuild-seed-${s}`), { club: 'x', tier, squadSize: 0, squadValueM: 0 });
    hands += 1;
    seen.add(hand.map(o => o.id).sort().join('+'));
    if (impossible(hand, tier)) { bad += 1; badHands += 1; }
  }
  if (bad > 0) fail(`${tier}: ${bad} of 5000 dealt hands cannot be satisfied by any window`);
  if (seen.size < 35) fail(`${tier}: 5000 seeds deal only ${seen.size} distinct hands, the deck is predictable (48 or more when this was written, floor 35)`);
  varietyLine.push(`${tier} ${seen.size}`);
}
console.log(`  ${hands} seeded hands searched against ${candidateCount} candidate windows each: ${badHands} unsatisfiable`);
console.log(`  distinct hands per 5000 seeds: ${varietyLine.join(', ')}`);

/* ================= verdict ================= */
console.log('');
if (failures > 0) {
  console.error(`simRebuildEconomy: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('simRebuildEconomy: all checks passed');
