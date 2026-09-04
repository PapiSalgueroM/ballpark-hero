/**
 * Round 437 harness: the money app has to keep telling the truth after the
 * boots go in the bag.
 *
 * THE BUG THIS EXISTS FOR. /soccer-career keeps the phone on screen forever.
 * There is no `!career.retired` guard on the handset button the way there is on
 * the training ground one, so a retired player can open the bank and the market
 * in every post retirement season. Both screens make a promise in shipped copy:
 * the bank says savings "pays 2.5% a season, never loses" and the market says
 * "Prices move every season whether you look or not."
 *
 * Neither was true after retirement. `moneySeasonTick` is reachable from
 * exactly one place, `simulateSeasonFinances`, and that only runs in a PLAYING
 * season. The moment the career turns, the money app freezes: savings stops
 * compounding, every price stops moving, the anchor the price labels are read
 * against stops drifting, and the statement stops recording. Meanwhile the
 * engine carries on crediting the account, most obviously on the club owner
 * path, which pays €1M to €20M of revenue straight into `s.netWorth` every
 * season. A manager career has no cap, so this ran for as long as the player
 * kept pressing the button.
 *
 * WHY NOTHING CAUGHT IT. simMoney plays careers hard but stops the moment
 * `c.retired` flips, so every assertion it makes is about the playing career.
 * simManagerCareer drives the dugout for ten seasons at a time but on synthetic
 * careers with no money block at all, so it could not have noticed. A money
 * harness that ends at retirement cannot find a money bug that starts there.
 *
 * WHAT THIS MEASURES, over seeded careers played from a real signing on to a
 * real retirement, then 25 post retirement seasons on all three paths:
 *
 *   1. setup and the playing baseline, so the retirement numbers have something
 *      honest to be compared against
 *   2. the market clock: one season of market per season of retirement
 *   3. savings pays the 2.5% the bank screen prints, in euros
 *   4. prices move in retirement as much as they move while playing
 *   5. the statement keeps recording
 *   6. the headline "everything you have" does not drift from what the player
 *      would have if the two screens told the truth
 *
 * NEGATIVE CONTROL: MONEY_AFTER_RETIREMENT_CONTROL=freeze puts the freeze back
 * by gutting the one line that runs the money season after retirement, and
 * sections 2 to 6 must all go red. The patch asserts the line it replaces is
 * actually in the file first, because a control that rewrites a string that is
 * not there changes nothing and then reads as green for the wrong reason.
 *
 * Run: node scripts/simCareerMoneyAfterRetirement.mjs [careers]
 */
import { build } from 'esbuild';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAREERS = Number(process.argv[2] || 40);
const TAIL = 25;

const CONTROL = process.env.MONEY_AFTER_RETIREMENT_CONTROL || '';
if (CONTROL && CONTROL !== 'freeze') {
  console.error(`MONEY_AFTER_RETIREMENT_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

/* The single line the fix turns on. The control kills it and nothing else, so
   what goes red below is the shipped defect and not an invented one. */
const TICK_LINE = 'const tick = moneySeasonTick(s, year);';
const FROZEN_LINE = 'const tick = { events: [] as string[] }; if (year < -1) return;';

const ENGINE_SRC = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
let ENGINE_PATH = ENGINE_SRC;
const controlFiles = [];
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'retiremoney-'));
const cleanup = () => {
  for (const f of controlFiles) { try { fs.rmSync(f, { force: true }); } catch { /* best effort */ } }
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
};
process.on('exit', cleanup);

if (CONTROL === 'freeze') {
  const raw = fs.readFileSync(ENGINE_SRC, 'utf8').split('\r\n').join('\n');
  if (!raw.includes(TICK_LINE)) {
    console.error(`control freeze: soccerCareerEngine.ts does not contain ${JSON.stringify(TICK_LINE)}, so this control would prove nothing`);
    process.exit(1);
  }
  /* The patched copy has to sit BESIDE the original: this file imports a dozen
     siblings by relative path and a copy in the OS temp directory cannot
     resolve any of them. It is deleted again on exit whatever happens. */
  ENGINE_PATH = path.join(ROOT, 'src/lib', '__control_soccerCareerEngine.ts');
  fs.writeFileSync(ENGINE_PATH, raw.replace(TICK_LINE, FROZEN_LINE));
  controlFiles.push(ENGINE_PATH);
  console.log('   NEGATIVE CONTROL ON: the money season never runs after retirement, exactly as shipped before Round 437');
}

const ENTRY = path.join(tmpDir, 'retireMoneyEntry.mjs');
const BUNDLE = path.join(tmpDir, 'retireMoney.bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ENGINE_PATH.replaceAll('\\', '/')}');
const money = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerMoney.ts');
export { engine, money };
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const { engine, money } = await import(pathToFileURL(BUNDLE).href);

const {
  initCareer, advanceYouthYear, advanceProSeason, applyMoneyAction,
  acceptRetirementSuggestion, choosePostRetirement, advanceManagerSeason,
  advancePunditSeason, advanceOwnerSeason, loadManagerMarket, FALLBACK_CLUBS,
} = engine;
const { ASSETS, ensureMoney, bankSummary, investedValue, spendable, SAVINGS_RATE } = money;

await loadManagerMarket();

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const NATIONS = ['England', 'Spain', 'France', 'Brazil', 'Germany', 'Argentina', 'Portugal', 'Italy'];
const POSITIONS = ['ST', 'CM', 'CB', 'LW', 'GK', 'CAM', 'RB'];
const REAL_RANDOM = Math.random;
const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const avg = arr => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
const eur = v => (Math.abs(v) >= 1 ? `€${v.toFixed(2)}M` : `€${Math.round(v * 1000)}k`);
const priceVector = c => {
  const m = ensureMoney(c);
  return ASSETS.map(a => m.price[a.id] ?? 0);
};
/** Mean absolute season on season price move, across every asset, as a fraction. */
const meanMove = (before, after) => {
  const moves = [];
  for (let i = 0; i < before.length; i += 1) {
    if (!(before[i] > 0)) continue;
    moves.push(Math.abs(after[i] - before[i]) / before[i]);
  }
  return avg(moves);
};

/* ─── play a career, saving and investing like a sane player ──────────────── */

function freshCareer(seed) {
  Math.random = mulberry32(seed);
  const c = initCareer(
    `Retiree ${seed}`,
    NATIONS[seed % NATIONS.length],
    POSITIONS[seed % POSITIONS.length],
    'modern', flat(70), 70, 2020, FALLBACK_CLUBS, null, 88 + (seed % 11),
  );
  Math.random = REAL_RANDOM;
  return c;
}

const act = (c, action) => applyMoneyAction(c, action).state;

/**
 * One whole playing career, from the youth academy to the ceremony. A fifth of
 * what is free goes into savings and a fifth of what is left into the steady
 * fund, every season, so the player arrives at retirement with a vault and a
 * holding, which is the only state in which this bug is visible. Nothing is
 * handed to him: every euro measured below was earned by the career. Also
 * records the market move per PLAYING season, which is the baseline section 4
 * measures the retirement tail against.
 */
function playToRetirement(seed) {
  let c = freshCareer(seed);
  const playingMoves = [];
  let guard = 0;
  while (!c.retired && guard < 40) {
    guard += 1;
    if (c.phase !== 'youth') {
      const free = spendable(c);
      if (free > 1) c = act(c, { t: 'deposit', amount: free * 0.2 });
      const left = spendable(c);
      if (left > 1) c = act(c, { t: 'buy', id: ASSETS[0].id, amount: left * 0.2 });
    }
    const before = priceVector(c);
    Math.random = mulberry32(seed * 7919 + guard);
    if (c.phase === 'retirement_suggestion') c = acceptRetirementSuggestion(c);
    else c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
    Math.random = REAL_RANDOM;
    if (c.transferSituation) c = { ...c, transferSituation: null };
    if (c.phase !== 'youth' && !c.retired) playingMoves.push(meanMove(before, priceVector(c)));
  }
  return { career: c, playingMoves };
}

/**
 * The post retirement tail, one path, TAIL seasons, no trading at all so the
 * savings and market numbers below are the engine's own work and nothing else.
 */
function runTail(retired, path_, seed) {
  let c = structuredClone(retired);
  Math.random = mulberry32(seed * 104729 + 17);
  c = choosePostRetirement(c, path_, FALLBACK_CLUBS);
  Math.random = REAL_RANDOM;

  const m0 = ensureMoney(c);
  const start = {
    age: m0.age, year: m0.year, vault: m0.vault, invested: investedValue(m0),
    log: JSON.stringify(m0.log), cash: c.netWorth, total: bankSummary(c).total,
  };
  const moves = [];
  let seasons = 0;
  for (let k = 0; k < TAIL; k += 1) {
    const before = priceVector(c);
    Math.random = mulberry32(seed * 104729 + k * 31 + 5);
    if (path_ === 'manager') c = advanceManagerSeason(c, FALLBACK_CLUBS);
    else if (path_ === 'owner') c = advanceOwnerSeason(c);
    else c = advancePunditSeason(c, 'praise_player');
    Math.random = REAL_RANDOM;
    seasons += 1;
    moves.push(meanMove(before, priceVector(c)));
  }
  const m1 = ensureMoney(c);
  return {
    path: path_, seasons, start, moves,
    end: {
      age: m1.age, year: m1.year, vault: m1.vault, invested: investedValue(m1),
      log: JSON.stringify(m1.log), cash: c.netWorth, total: bankSummary(c).total,
    },
  };
}

/* ─── 1. Careers reach retirement with money on the board ─────────────────── */

console.log(`1) ${CAREERS} seeded careers played to retirement, then ${TAIL} post retirement seasons on each path`);
const tails = [];
const playingBaseline = [];
let retiredCount = 0;
let vaultAtRetirement = 0;
let investedAtRetirement = 0;
let ownerRuns = 0;
for (let seed = 1; seed <= CAREERS; seed += 1) {
  const { career, playingMoves } = playToRetirement(seed);
  if (!career.retired) continue;
  const m = ensureMoney(career);
  /* Only careers with a real balance can show this bug, and a career with no
     savings and nothing invested would let a frozen market pass unnoticed. The
     cash bar is well clear of CASH_FLOOR so the tick's forced sale never fires
     and the savings numbers below are interest and nothing else. */
  if (!(m.vault > 0.5) || !(career.netWorth > 0.5)) continue;
  retiredCount += 1;
  vaultAtRetirement += m.vault;
  investedAtRetirement += investedValue(m);
  for (const move of playingMoves) playingBaseline.push(move);
  tails.push(runTail(career, 'manager', seed));
  tails.push(runTail(career, 'pundit', seed));
  /* The third door. Buying a club is gated on €200M in the current account,
     and the economy does not hand that to a simulated career: the lifestyle
     bill is levelled off total wealth, so the balance settles in single digit
     millions however the player saves. So this arm alone starts from a career
     whose CASH is set to the game's own gate plus the biggest purchase price,
     which is the poorest player who could ever press that button. Everything
     else about it, the vault, the holdings, the market seed, is what the
     career actually earned. */
  if (retiredCount <= 6) {
    tails.push(runTail({ ...career, netWorth: 300 }, 'owner', seed));
    ownerRuns += 1;
  }
}
console.log(`   ${retiredCount} usable careers, mean vault at retirement ${eur(vaultAtRetirement / Math.max(1, retiredCount))}, mean invested ${eur(investedAtRetirement / Math.max(1, retiredCount))}`);
console.log(`   ${tails.length} retirement tails (${ownerRuns} of them club owners), ${playingBaseline.length} playing seasons of market baseline`);
if (retiredCount < 8) fail(`only ${retiredCount} careers reached retirement with money on the board, not enough to measure anything`);
if (playingBaseline.length < 60) fail(`only ${playingBaseline.length} playing seasons of baseline`);

const baselineMove = avg(playingBaseline);
console.log(`   while playing, prices move ${(baselineMove * 100).toFixed(2)}% a season on average`);
if (!(baselineMove > 0.02)) fail(`the playing baseline itself is ${(baselineMove * 100).toFixed(2)}%, so the market is not moving even during a career and nothing below means anything`);

/* ─── 2. The market clock runs once per retirement season ─────────────────── */

console.log('2) Every season of retirement is a season of market');
{
  let worstAgeDrift = 0;
  let worstYearDrift = 0;
  for (const t of tails) {
    const ageDrift = t.seasons - (t.end.age - t.start.age);
    /* The calendar may legitimately run one ahead of the market clock, because
       the season record the retirement itself writes carries the following
       year. Anything short of `seasons` is the market sitting a season out. */
    const yearDrift = t.seasons - (t.end.year - t.start.year);
    if (Math.abs(ageDrift) > Math.abs(worstAgeDrift)) worstAgeDrift = ageDrift;
    if (yearDrift > worstYearDrift) worstYearDrift = yearDrift;
  }
  console.log(`   over ${TAIL} seasons the market clock is behind by ${worstAgeDrift} seasons at worst, the calendar by ${worstYearDrift}`);
  if (worstAgeDrift !== 0) fail(`the market ran ${TAIL - worstAgeDrift} times over ${TAIL} retirement seasons`);
  if (worstYearDrift > 0) fail(`the money calendar is ${worstYearDrift} seasons behind after ${TAIL} retirement seasons`);
}

/* ─── 3. Savings pays the 2.5% the bank screen prints ─────────────────────── */

console.log('3) Savings pays 2.5% a season after retirement, the way the bank screen says it does');
{
  /* Nothing is deposited or withdrawn in the tail, so the only honest answer is
     compound interest. Tolerance is measured, not felt: moneySeasonTick rounds
     the balance to the penny once a season, so 25 seasons can lose at most
     €0.25M of rounding, and the interest an untouched vault should earn over
     the same 25 seasons is 85.4% of it. The bar below is 25 pennies plus one
     percent of the promised growth. Healthy code measures a worst shortfall of
     €32k against a bar of about €310k, so roughly 10x of headroom, while the
     freeze misses by €15.79M on the same tail. */
  const promisedFactor = Math.pow(1 + SAVINGS_RATE, TAIL);
  let worstGap = 0;
  let worstPct = 0;
  let totalMissing = 0;
  let paid = 0;
  for (const t of tails) {
    if (t.start.vault <= 0) continue;
    const promised = t.start.vault * promisedFactor;
    const gap = promised - t.end.vault;
    const tolerance = TAIL * 0.01 + Math.abs(promised - t.start.vault) * 0.01;
    if (t.end.vault > t.start.vault + 0.01) paid += 1;
    if (gap > worstGap) { worstGap = gap; worstPct = (gap / promised) * 100; }
    if (gap > tolerance) totalMissing += gap;
  }
  const withVault = tails.filter(t => t.start.vault > 0).length;
  console.log(`   ${paid} of ${withVault} vaults grew; promised factor over ${TAIL} seasons is ${promisedFactor.toFixed(4)}x`);
  console.log(`   worst shortfall ${eur(worstGap)} (${worstPct.toFixed(1)}% of the promised balance), total unpaid across every tail ${eur(totalMissing)}`);
  if (paid < withVault) fail(`${withVault - paid} of ${withVault} retirement tails paid no savings interest at all, while the bank screen prints "pays 2.5% a season, never loses"`);
  if (totalMissing > 0.01) fail(`savings is short by ${eur(totalMissing)} across ${withVault} tails, past the measured rounding tolerance`);
}

/* ─── 4. Prices move in retirement the way they move while playing ────────── */

console.log('4) Prices move every season after retirement, the way the market screen says they do');
{
  const tailMoves = [];
  let deadSeasons = 0;
  for (const t of tails) for (const move of t.moves) {
    tailMoves.push(move);
    if (move === 0) deadSeasons += 1;
  }
  const tailMove = avg(tailMoves);
  const ratio = baselineMove > 0 ? tailMove / baselineMove : 0;
  console.log(`   retirement seasons move ${(tailMove * 100).toFixed(2)}% against the playing baseline's ${(baselineMove * 100).toFixed(2)}% (ratio ${ratio.toFixed(3)})`);
  console.log(`   ${deadSeasons} of ${tailMoves.length} retirement seasons had every price frozen to the penny`);
  /* The two populations are the same market model with the same anchors, so a
     healthy ratio sits at 1. The bar is 0.6, which the frozen code misses by
     the whole distance (it scores 0.000) and healthy code clears with room,
     because the only real difference between the arms is that a retirement
     tail is 25 consecutive seasons while the playing sample is shorter. */
  if (!(ratio > 0.6)) fail(`prices move ${(tailMove * 100).toFixed(2)}% a season in retirement against ${(baselineMove * 100).toFixed(2)}% while playing, so the market is frozen`);
  if (deadSeasons > tailMoves.length * 0.02) fail(`${deadSeasons} of ${tailMoves.length} retirement seasons moved no price at all`);
}

/* ─── 5. The statement keeps recording ───────────────────────────────────── */

console.log('5) The bank statement keeps recording while money is moving');
{
  /* The statement is capped at MAX_LEDGER, so counting lines would call a full
     statement silent. What matters is whether the CONTENT changed: a tail that
     paid interest for 25 seasons cannot hand back the same twelve lines it
     started with. */
  let silent = 0;
  for (const t of tails) if (t.end.log === t.start.log) silent += 1;
  console.log(`   ${tails.length - silent} of ${tails.length} tails wrote something to the statement over ${TAIL} seasons, ${silent} handed back the same lines they started with`);
  if (silent > 0) fail(`${silent} retirement tails recorded not one statement line in ${TAIL} seasons while savings and the market were both meant to be running`);
}

/* ─── 6. The headline number does not drift from the honest one ──────────── */

console.log('6) "Everything you have" matches what the two screens promise');
{
  const promisedFactor = Math.pow(1 + SAVINGS_RATE, TAIL);
  let worst = 0;
  let worstPct = 0;
  let worstPath = '';
  for (const t of tails) {
    /* What the player should have, taken from the screens rather than from the
       engine: the cash the engine actually credited, plus a vault that
       compounded at the printed rate, plus what is invested. */
    const honest = t.end.cash + t.start.vault * promisedFactor + t.end.invested;
    const gap = honest - t.end.total;
    if (gap > worst) { worst = gap; worstPct = (gap / Math.max(honest, 0.01)) * 100; worstPath = t.path; }
  }
  console.log(`   worst drift after ${TAIL} seasons: ${eur(worst)} (${worstPct.toFixed(1)}% of the honest total, on the ${worstPath || 'n/a'} path)`);
  if (worst > TAIL * 0.01 + 0.05) fail(`the app shows ${eur(worst)} less than the two screens promise after ${TAIL} retirement seasons`);
}

if (failures > 0) {
  console.error(`\n${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('\nAll good: the money app keeps running for the whole retirement tail.');
