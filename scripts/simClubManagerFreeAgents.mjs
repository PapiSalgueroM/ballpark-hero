/**
 * Round 619 harness: is the free agent board a real market, and does paying a
 * contract off actually cost something?
 *
 * The feature was reported through the footer form ("Add free agents to
 * Manager Mode, and allow players to have their contracts terminated so they
 * become free agents"), and both halves have a failure mode that a type check
 * cannot see and that a "does it crash" harness would sail past:
 *
 *   THE BOARD BECOMES THE GAME. A free transfer saves the entire fee, so if
 *   the board ever carries players as good as the market does, there is no
 *   reason to use the transfer screen again. The first build did exactly this:
 *   a flat catch-all in worldReleaseOdds put a 24 year old rated 88 on
 *   Everton's board in season two for a signing on fee. Section 2 and section
 *   8 are the two ends of that check, one on the input distribution and one on
 *   the outcome.
 *
 *   THE CONTRACT STOPS MEANING ANYTHING. Terminate, re-sign cheaper, repeat.
 *   Or never renew anybody and re-sign the lot on frees in June, which measured
 *   strictly cheaper than the contracts desk before the guard went in. Section
 *   6.
 *
 *   THE SAME MAN EXISTS TWICE. The pool survives the rollover and goneNames
 *   does not, so without the buildMarket filter a free agent in season two is
 *   also on sale at the club he left, at a full fee. Section 3.
 *
 * WHAT THIS MEASURES AGAINST A BASELINE, rather than asserting no crash:
 *   2  the released population against the market population it is drawn from
 *   4  settlement rates for contented players against players who want out
 *   8  a free agent only manager's XI against a market manager's, paired seeds
 *
 * Negative controls (house rule: prove the checks can fail). Each rewrites the
 * engine source IN MEMORY, never on disk, and refuses to run if its anchor is
 * not found, because a control that changes nothing reports green for the
 * wrong reason:
 *   CM_FA_CONTROL=nogate         drops WORLD_POOL_FROM_YEAR to 0, so season one
 *                                lists real professionals as unemployed.
 *                                Section 1 must find real names on a day one
 *                                board.
 *   CM_FA_CONTROL=primefree      puts back the flat 12 in ten thousand
 *                                catch-all, so players in their prime come
 *                                free. Section 2 must find them.
 *   CM_FA_CONTROL=nodupeguard    lifts BOTH things that stop a free agent also
 *                                being on the market: the subtraction in
 *                                buildMarket and the rollover's goneNames sync.
 *                                Section 3 must then find the same man on the
 *                                board and on sale at the club he left.
 *   CM_FA_CONTROL=windowlock     gives signFreeAgent the window check every
 *                                other signing path has. Section 5 must find
 *                                the board unusable in a closed window, which
 *                                is the entire point of the feature.
 *   CM_FA_CONTROL=noresignguard  removes the this-season re-sign lock. Section
 *                                6 must find both loops open.
 *   CM_FA_CONTROL=nopayoffledger stops the settlement being written to
 *                                seasonSignings. Section 4 must find the
 *                                finance desk projecting money that is gone.
 *   CM_FA_CONTROL=youthonboard   puts back the missing academy filter on the
 *                                expiry path, which is the bug this section
 *                                was written for. Section 3 must find men
 *                                called "(Youth)" on a first team board.
 *
 * MEASURED BANDS, 2026-09-16, on the filename seed and on SIM_SEED 1, 2 and 3.
 * Every threshold sits between the two bands rather than beside either.
 *
 *   metric                                    fixed          control              gate
 *   real names on a day one board             0 of 4         4 of 4 (nogate)      must be 0
 *   world free agents 80+ and under 31        0              10 (primefree)       must be 0
 *   names in both the pool and the market     0              75 (nodupeguard)     must be 0
 *   academy pads on the board                 0              8 of 125 (youthonboard) must be 0
 *   mean settle rate, wants out               0.270          n/a                  under contented
 *   mean settle rate, contented               0.670          n/a                  by 0.15 or more
 *   free agent signings in a shut window      12 of 12       0 of 12 (windowlock) must be 12
 *   payoffs reaching the finance desk         4 of 4         0 of 4 (nopayoffledger) must be all
 *   re-signs allowed, payoff then expiry      0 and 0        4 and 14 (noresignguard) must be 0
 *   8a mean quality gap, market over board    16.7           n/a                  floor 5
 *   8a p5 gap                                 11             n/a                  (reported)
 *   8a rounds the board beat the market       0.0%           n/a                  ceiling 10%
 *   8b XI, buying / free only / nobody        75.25 / 74.50 / 74.25                free must not
 *                                                                                 lead by over 1.5
 *
 * Two notes on reading those. Section 8 reseeds its own arms (see reseed
 * below), so 8a and 8b are identical on every SIM_SEED by design: they are a
 * fixed measurement, not a sample. Everything above them does move with the
 * seed, and section 2's real free agent count ran 8 to 51 across the four
 * seeds, which is why it refuses to pass on an empty sample rather than
 * asserting a floor on a number that thin.
 *
 * The 8b threshold is set from the FAILURE and not from the pass, because a
 * three season eleven is not a precise instrument. The broken build had the
 * free agent arm 4.0 points AHEAD of the buyer; the fixed one has it 0.75
 * behind. A 1.5 slack sits between the two with headroom on both sides.
 *
 * Run: node scripts/simClubManagerFreeAgents.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir();
const ENTRY = path.join(TMP, 'cmFa.entry.mjs');
const BUNDLE = path.join(TMP, 'cmFa.bundle.mjs');

const CONTROL = process.env.CM_FA_CONTROL || '';
const KNOWN = ['nogate', 'primefree', 'nodupeguard', 'windowlock', 'noresignguard', 'nopayoffledger', 'youthonboard'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`CM_FA_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

const ENGINE_PATH = `${ROOT}/src/lib/clubManager.ts`;
const FA_PATH = `${ROOT}/src/lib/clubManagerFreeAgents.ts`;
let enginePath = ENGINE_PATH;
let faPath = FA_PATH;

if (CONTROL) {
  /* The worktree may check out CRLF and the anchors below are written LF, so
     the read is normalised first. */
  let engine = fs.readFileSync(ENGINE_PATH, 'utf8').replaceAll('\r\n', '\n');
  let fa = fs.readFileSync(FA_PATH, 'utf8').replaceAll('\r\n', '\n');
  const swap = (src, from, to, where) => {
    if (!src.includes(from)) {
      console.error(`control cannot run: ${where} is not in the shape CM_FA_CONTROL=${CONTROL} rewrites`);
      console.error(`  looked for: ${from}`);
      process.exit(1);
    }
    return src.replace(from, to);
  };
  if (CONTROL === 'nogate') {
    fa = swap(fa, 'export const WORLD_POOL_FROM_YEAR = 1;', 'export const WORLD_POOL_FROM_YEAR = 0;', 'clubManagerFreeAgents.ts');
  } else if (CONTROL === 'primefree') {
    fa = swap(fa, '  /* Prime age, wanted: his club does not let him walk. */\n  return 0;',
      '  /* Prime age, wanted: his club does not let him walk. */\n  return 12;', 'clubManagerFreeAgents.ts');
  } else if (CONTROL === 'nodupeguard') {
    /* BOTH guards, and finding that out is what this control is for. The first
       version lifted only the buildMarket filter and section 3 stayed green,
       because rollFreeAgents re-adds every pool name to the summer's fresh
       goneNames and goneNames is subtracted from the market too. Two guards
       hold this invariant; a control that lifts one proves nothing. */
    engine = swap(engine,
      '    .filter(p => !squadNames.has(p.name) && !gone.has(p.name) && !retired.has(p.name) && !free.has(p.name));',
      '    .filter(p => !squadNames.has(p.name) && !retired.has(p.name));',
      'clubManager.ts (the buildMarket filter)');
    engine = swap(engine,
      '  for (const fa of pool) if (!gone.has(fa.name)) state.goneNames.push(fa.name);',
      '',
      'clubManager.ts (the rollover goneNames sync)');
  } else if (CONTROL === 'windowlock') {
    engine = swap(engine,
      'export function signFreeAgent(career: CareerState, faId: string): CareerState | null {\n  if (freeAgentRefusal(career, faId) !== null) return null;',
      'export function signFreeAgent(career: CareerState, faId: string): CareerState | null {\n  if (career.transferWindow === null) return null;\n  if (freeAgentRefusal(career, faId) !== null) return null;',
      'clubManager.ts (signFreeAgent)');
  } else if (CONTROL === 'noresignguard') {
    engine = swap(engine,
      "  if (fa.wasMine && fa.since === career.season && (fa.reason === 'terminated' || fa.reason === 'expired')) {",
      '  if (false) {',
      'clubManager.ts (the re-sign guard)');
  } else if (CONTROL === 'youthonboard') {
    engine = swap(engine,
      '      if (p.isYouth) continue;\n      walkedToPool.push(freeAgentFromPlayer(p, career.clubName, season, \'expired\'));',
      '      walkedToPool.push(freeAgentFromPlayer(p, career.clubName, season, \'expired\'));',
      'clubManager.ts (the academy filter on the expiry path)');
  } else if (CONTROL === 'nopayoffledger') {
    engine = swap(engine,
      "    seasonSignings: [...career.seasonSignings, { dir: 'out', name: p.name, fee: 0, payoff: cost }],",
      '',
      'clubManager.ts (the payoff ledger row)');
  }
  const faCopy = `${TMP}/cmFa.control.fa.ts`;
  fs.writeFileSync(faCopy, fa);
  faPath = faCopy;
  /* The engine copy must point at the rewritten module rather than the real
     one, so the import is made explicit instead of relying on alias order. */
  engine = swap(engine, "} from '@/lib/clubManagerFreeAgents';", `} from '${faCopy}';`, 'clubManager.ts (the free agents value import)');
  engine = swap(engine, "import type { FreeAgent } from '@/lib/clubManagerFreeAgents';", `import type { FreeAgent } from '${faCopy}';`, 'clubManager.ts (the free agents type import)');
  const engineCopy = `${TMP}/cmFa.control.engine.ts`;
  fs.writeFileSync(engineCopy, engine);
  enginePath = engineCopy;
  console.log(`CONTROL ${CONTROL} is on. The sections it targets are SUPPOSED to fail.\n`);
}

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${enginePath.replaceAll('\\', '/')}');
const fa = await import('${faPath.replaceAll('\\', '/')}');
const fin = await import('${ROOT_URL}/src/lib/clubManagerFinances.ts');
export const cm = mod;
export const faMod = fa;
export const finMod = fin;
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);

const { cm, faMod, finMod } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  buildMarket, buyPlayer, wageBill, xiAverageRating,
  freeAgentPool, terminateContract, terminationQuote, signFreeAgent, freeAgentRefusal,
  ensureFreeAgents, canLeaveSquad,
} = cm;
const {
  FA_BOARD_FLOOR, FA_SHELF_WEEKS, PAYOFF_FLOOR, PAYOFF_CEILING,
  freeAgentTerms, payoffRate, terminationCost, wageOwed, worldReleaseOdds,
} = faMod;
const { projectFinances } = finMod;

for (const [name, fn] of Object.entries({
  startCareer, playNextEntry, finishSeason, startNextSeason, buildMarket, buyPlayer,
  wageBill, xiAverageRating, freeAgentPool, terminateContract, terminationQuote,
  signFreeAgent, freeAgentRefusal, ensureFreeAgents, canLeaveSquad,
  freeAgentTerms, payoffRate, terminationCost, wageOwed, worldReleaseOdds, projectFinances,
})) {
  if (typeof fn !== 'function') {
    console.error(`the bundle did not export ${name}, so this harness would pass by doing nothing`);
    process.exit(1);
  }
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const mean = a => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0);

/*
 * PAIRED SEEDS, the simContracts rule: run k of each arm must see the identical
 * random stream, so the only difference between two arms is the thing being
 * measured. seedRandom.mjs installs one stream for the whole harness, which is
 * the right default but is NOT pairing: arm two starts wherever arm one left
 * off, and the first build of section 8 measured a do-nothing arm at 74.0 in
 * one run and 79.0 in the next off nothing but that drift. This reinstalls the
 * same generator at a known seed before each arm.
 */
function reseed(n) {
  let a = (n >>> 0) || 1;
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const armSeed = (club, run) => run * 7919 + club.length;
/* Four real clubs across four leagues, at four different levels. Names must be
   the registry's own spelling: 'VfB Stuttgart' is not in it, startCareer
   accepts it anyway, and the career it builds has a fixture list that involves
   nobody, so every entry is skipped and the season is over in three calls. That
   cost section 5 a run. */
const CLUBS = ['Everton', 'Sevilla', 'Bologna', 'Stuttgart'];
for (const club of CLUBS) {
  const probe = startCareer(club);
  if (!probe.leagueClubs.includes(club)) {
    console.error(`${club} is not in its own league's fixture list, so every section below would run on an empty season`);
    process.exit(1);
  }
}

/** One full season, the way the page plays it. */
function runSeason(s) {
  let guard = 0;
  while (s.week < s.calendar.length && guard < 200) {
    guard += 1;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
    if (s.sacked) break;
  }
  return s;
}

function nextSeason(s) {
  return startNextSeason(s, finishSeason(s));
}

/* ================================================================== */
console.log('1) Season one never says a real professional is out of work');
/* The world gate. In season one the save still IS the real baked season, so a
   real name on the board reads as a claim about the man rather than about the
   simulation. Made up players carry MADE UP on every screen, so they are the
   only thing allowed on a day one board. */
{
  let withRealNames = 0;
  let boardsSeen = 0;
  let emptyBoards = 0;
  for (const club of CLUBS) {
    const s = startCareer(club);
    const board = freeAgentPool(s);
    boardsSeen += 1;
    if (board.length === 0) emptyBoards += 1;
    const real = board.filter(fa => !fa.generated);
    if (real.length) {
      withRealNames += 1;
      console.log(`   ${club}: ${real.length} real name(s), e.g. ${real.slice(0, 3).map(f => `${f.name} ${f.rating}`).join(', ')}`);
    }
  }
  console.log(`   ${boardsSeen} day one boards, ${withRealNames} carrying a real player, ${emptyBoards} empty`);
  if (withRealNames > 0) {
    fail(`${withRealNames} of ${boardsSeen} day one boards list a real footballer as unattached`);
  }
  /* And the board must not be empty either, or the feature does not exist on
     day one and nobody would ever find it. */
  if (emptyBoards > 0) fail(`${emptyBoards} of ${boardsSeen} careers open with nothing on the board at all`);
}

/* ================================================================== */
console.log('2) Nobody in his prime comes free');
/* The input distribution, measured against the market it is drawn from. The
   shipped shape of this bug was a rating 88 age 24 free agent, which is both
   unbalancing and not a thing that happens in football. */
{
  const flagged = [];
  let realSeen = 0;
  const ages = [];
  const ratings = [];
  for (const club of CLUBS) {
    let s = startCareer(club);
    for (let season = 0; season < 3; season += 1) {
      s = runSeason(s);
      if (s.sacked) break;
      s = nextSeason(s);
      for (const fa of freeAgentPool(s)) {
        if (fa.generated) continue;
        /* Only what the WORLD released. A real star whose deal you let run out
           at your own club absolutely does become a free agent, and that is
           the feature working, not a bug: real clubs lose real players on
           frees every summer. What must never happen is the world handing one
           out. Without this filter the first run flagged Everton's own
           Branthwaite, 89 and 26, whose contract the test manager had simply
           failed to renew. */
        if (fa.wasMine) continue;
        realSeen += 1;
        ages.push(fa.age);
        ratings.push(fa.rating);
        /* The rule: anything genuinely good is old. */
        if (fa.rating >= 80 && fa.age < 31) flagged.push(`${fa.name} ${fa.rating} aged ${fa.age} (${club})`);
      }
    }
  }
  console.log(`   ${realSeen} real free agents seen, mean age ${mean(ages).toFixed(1)}, mean rating ${mean(ratings).toFixed(1)}`);
  if (realSeen === 0) {
    fail('no real free agents appeared at all across 12 seasons, so this section proves nothing');
  }
  if (flagged.length) {
    console.log(`   ${flagged.slice(0, 6).join('; ')}`);
    fail(`${flagged.length} real free agents are rated 80 or better and under 31`);
  }
  /* The table itself, read directly, so the check does not depend on a lucky
     sample: a wanted player in his prime must be flatly impossible. */
  if (worldReleaseOdds(26, 86) !== 0) fail('worldReleaseOdds still releases a 26 year old rated 86');
  if (worldReleaseOdds(24, 88) !== 0) fail('worldReleaseOdds still releases a 24 year old rated 88');
  if (worldReleaseOdds(34, 72) <= 0) fail('worldReleaseOdds never releases a 34 year old, so the board would be empty');
}

/* ================================================================== */
console.log('3) One man, one record');
/* The pool and the market are two lists and a name may never be in both. The
   rollover is where this bites: goneNames is cleared every summer and the pool
   is carried, so the subtraction in buildMarket is the only thing holding it. */
{
  let bothLists = 0;
  let inSquad = 0;
  let twiceInPool = 0;
  let retiredOnBoard = 0;
  let academyPads = 0;
  let checks = 0;
  for (const club of CLUBS) {
    let s = startCareer(club);
    for (let season = 0; season < 3; season += 1) {
      s = runSeason(s);
      if (s.sacked) break;
      s = nextSeason(s);
      const board = freeAgentPool(s);
      const market = new Set(buildMarket(s).map(m => m.name));
      const squad = new Set(s.squad.map(p => p.name));
      const retired = new Set(s.retiredNames ?? []);
      const seen = new Set();
      checks += 1;
      for (const fa of board) {
        if (market.has(fa.name)) bothLists += 1;
        if (squad.has(fa.name)) inSquad += 1;
        if (retired.has(fa.name)) retiredOnBoard += 1;
        if (seen.has(fa.name)) twiceInPool += 1;
        /* An academy pad is not a first team free agent, and the symptom is
           right there in his generated name. Three paths put players on this
           board and all three must filter him; the expiry path did not, and
           this walk is where that showed up. Matching the suffix reads the
           visible bug rather than a flag, which is the point: whatever the
           mechanism is next time, a man called "(Youth)" on this board is
           wrong. */
        if (fa.name.includes('(Youth)')) academyPads += 1;
        seen.add(fa.name);
      }
    }
  }
  console.log(`   ${checks} boards checked: ${bothLists} on the market too, ${inSquad} already signed, ${twiceInPool} listed twice, ${retiredOnBoard} retired, ${academyPads} academy pads`);
  if (checks === 0) fail('no boards were checked, so this section proves nothing');
  if (bothLists > 0) fail(`${bothLists} free agents are ALSO for sale at the club they left, at a full fee`);
  if (inSquad > 0) fail(`${inSquad} players are on the board and in the squad at the same time`);
  if (twiceInPool > 0) fail(`${twiceInPool} duplicate records on the board`);
  if (retiredOnBoard > 0) fail(`${retiredOnBoard} retired players are still looking for a club`);
  if (academyPads > 0) fail(`${academyPads} academy pads are on a first team free agent board, names and all`);
}

/* ================================================================== */
console.log('4) A payoff costs real money, and the books see it');
{
  const wantsOutRates = [];
  const contentRates = [];
  let checked = 0;
  let ledgerMisses = 0;
  for (const club of CLUBS) {
    const s = startCareer(club);
    const victim = s.squad.filter(p => canLeaveSquad(s, p) && !p.isYouth)
      .sort((a, b) => (b.wage ?? 0) - (a.wage ?? 0))[0];
    if (!victim) { fail(`${club} has nobody who can be paid off at all`); continue; }
    const quote = terminationQuote(s, victim.id);
    const billBefore = Math.round(wageBill(s));
    const budgetBefore = s.budget;
    const after = terminateContract(s, victim.id);
    if (!after) { fail(`${club}: the payoff of ${victim.name} was refused although it was quoted at ${quote}`); continue; }
    checked += 1;
    /* The kitty drops by exactly the quote the screen showed. Round 506's
       rule: the screen reads the engine's own verdict. */
    const paid = Math.round((budgetBefore - after.budget) * 10) / 10;
    if (Math.abs(paid - quote) > 0.051) fail(`${club}: quoted ${quote} and charged ${paid}`);
    /* The weekly wage goes with him, which is the reason to do it. */
    const billAfter = Math.round(wageBill(after));
    const saved = billBefore - billAfter;
    if (Math.abs(saved - (victim.wage ?? 0)) > 1) {
      fail(`${club}: paid off a ${victim.wage}k a week player and the bill moved by ${saved}k`);
    }
    /* And the finance desk must not project money that has already gone. */
    const row = projectFinances(after).spend.find(l => l.id === 'payoffs');
    if (!row || Math.abs(row.actual - quote) > 0.051) {
      ledgerMisses += 1;
    }
    /* He is on the board, once, with the right story. */
    const board = freeAgentPool(after).filter(fa => fa.name === victim.name);
    if (board.length !== 1) fail(`${club}: ${victim.name} appears ${board.length} times on the board after a payoff`);
    else if (board[0].reason !== 'terminated' || !board[0].wasMine) fail(`${club}: ${victim.name} is on the board with the wrong story`);
    /* Two populations, not two anecdotes: a man who wants out settles cheaper
       than a contented one, every time, and both stay inside the clamps. */
    for (const p of s.squad.filter(x => !x.onLoan)) {
      const wantsOut = { ...p, wantsOut: true, morale: 35 };
      const content = { ...p, wantsOut: false, morale: 85 };
      wantsOutRates.push(payoffRate(wantsOut));
      contentRates.push(payoffRate(content));
    }
  }
  const wo = mean(wantsOutRates);
  const co = mean(contentRates);
  console.log(`   ${checked} payoffs charged correctly; settle rate wants-out ${wo.toFixed(3)} vs contented ${co.toFixed(3)}`);
  if (checked === 0) fail('no payoff was measured, so this section proves nothing');
  if (!(wo < co)) fail(`a player who wants out does not settle cheaper (${wo.toFixed(3)} vs ${co.toFixed(3)})`);
  if (co - wo < 0.15) fail(`the gap between wanting out and being content is only ${(co - wo).toFixed(3)}, which no manager would ever notice`);
  if (Math.min(...wantsOutRates) < PAYOFF_FLOOR - 1e-9) fail('a settlement went under the floor, so freezing a man out is free');
  if (Math.max(...contentRates) > PAYOFF_CEILING + 1e-9) fail('a settlement went over the ceiling');
  if (ledgerMisses > 0) fail(`${ledgerMisses} payoffs never reached the finance desk, so the projection shows money that is gone`);
}

/* ================================================================== */
console.log('5) The board works with the window shut');
/* The headline rule, and the only reason this feature is worth having in
   February: an unattached player has no club, so there is no registration to
   trade and no window to be inside. Every other signing path must still be
   locked, which is what stops this becoming a hole in the window itself. */
{
  let shutWeeksSeen = 0;
  let signed = 0;
  let buyLeaked = 0;
  for (const club of CLUBS) {
    let s = startCareer(club);
    /* Play on until the summer deadline has passed. The guard has to clear a
       whole league season, because a calendar entry is not always a match week
       (cup and European ties, the January window marker), so the 60 the first
       build used ran out at Stuttgart before the deadline landed. */
    let guard = 0;
    while (s.transferWindow !== null && s.week < s.calendar.length && guard < 200) {
      guard += 1;
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    if (s.transferWindow !== null) { fail(`${club}: the window never shut after ${guard} entries, so this section proves nothing`); continue; }
    /* Three goes at a shut-window signing across the closed stretch. */
    for (let attempt = 0; attempt < 3 && s.transferWindow === null && s.week < s.calendar.length; attempt += 1) {
      shutWeeksSeen += 1;
      const target = freeAgentPool(s).find(fa => freeAgentRefusal(s, fa.id) === null);
      if (target) {
        const after = signFreeAgent(s, target.id);
        if (after && after.squad.some(p => p.name === target.name)) { signed += 1; s = after; }
        else fail(`${club}: a free agent the engine said was signable was refused with the window shut`);
      } else {
        fail(`${club}: nothing on the board was signable in a shut window, so the feature is invisible when it matters`);
      }
      /* The ordinary market must still be shut. */
      const mp = buildMarket(s).find(m => m.price <= s.budget);
      if (mp && buyPlayer(s, mp)) buyLeaked += 1;
      let step = 0;
      while (step < 3 && s.transferWindow === null && s.week < s.calendar.length) {
        step += 1;
        s = playNextEntry(s, { skipHalftime: true }).state;
      }
    }
  }
  console.log(`   ${signed} of ${shutWeeksSeen} shut-window attempts signed a free agent; ${buyLeaked} ordinary purchases leaked through`);
  if (shutWeeksSeen === 0) fail('no shut window was reached, so this section proves nothing');
  if (signed < shutWeeksSeen) fail(`${shutWeeksSeen - signed} shut-window free agent signings were refused`);
  if (buyLeaked > 0) fail(`${buyLeaked} ordinary transfers went through with the window shut, so the window itself is broken`);
}

/* ================================================================== */
console.log('6) You cannot re-sign a man you let go this season');
/* Two loops, one rule. Without it a contract means nothing: pay him off and
   take him back cheaper, or run every deal down and re-sign the lot on frees. */
{
  let payoffLoops = 0;
  let expiryLoops = 0;
  let payoffsTried = 0;
  let expiriesSeen = 0;
  for (const club of CLUBS) {
    const s = startCareer(club);
    const victim = s.squad.filter(p => canLeaveSquad(s, p) && !p.isYouth)
      .sort((a, b) => (b.wage ?? 0) - (a.wage ?? 0))[0];
    if (victim) {
      const after = terminateContract(s, victim.id);
      if (after) {
        payoffsTried += 1;
        const back = freeAgentPool(after).find(fa => fa.name === victim.name);
        if (back && signFreeAgent(after, back.id)) payoffLoops += 1;
      }
    }
    /* And the expiry loop. Run a season so deals tick down at the rollover. */
    let t = runSeason(s);
    if (t.sacked) continue;
    t = nextSeason(t);
    const walked = freeAgentPool(t).filter(fa => fa.wasMine && fa.reason === 'expired');
    for (const fa of walked) {
      expiriesSeen += 1;
      if (signFreeAgent(t, fa.id)) expiryLoops += 1;
    }
  }
  console.log(`   ${payoffsTried} payoffs and ${expiriesSeen} expiries tested: ${payoffLoops} + ${expiryLoops} re-signs allowed`);
  if (payoffsTried === 0) fail('no payoff was tested, so this section proves nothing');
  if (expiriesSeen === 0) fail('no expiry reached the board, so half of this section proves nothing');
  if (payoffLoops > 0) fail(`${payoffLoops} players were paid off and re-signed the same season`);
  if (expiryLoops > 0) fail(`${expiryLoops} players walked for nothing and re-signed at the same club the same summer`);
}

/* ================================================================== */
console.log('7) The board turns over and never empties');
/* A board that never changes is a list, not a market, and one that empties in
   February takes the feature away in the week it is most useful. */
{
  let emptiedWeeks = 0;
  let weeksWatched = 0;
  const churn = [];
  for (const club of CLUBS) {
    let s = startCareer(club);
    s = runSeason(s);
    if (s.sacked) continue;
    s = nextSeason(s);
    let previous = new Set(freeAgentPool(s).map(fa => fa.id));
    let changedWeeks = 0;
    for (let week = 0; week < 22 && s.week < s.calendar.length; week += 1) {
      s = playNextEntry(s, { skipHalftime: true }).state;
      const now = freeAgentPool(s);
      weeksWatched += 1;
      if (now.length === 0) emptiedWeeks += 1;
      const ids = new Set(now.map(fa => fa.id));
      if (ids.size !== previous.size || [...ids].some(id => !previous.has(id))) changedWeeks += 1;
      previous = ids;
    }
    churn.push(changedWeeks);
  }
  console.log(`   ${weeksWatched} weeks watched, ${emptiedWeeks} with an empty board, board changed in ${mean(churn).toFixed(1)} of 22 weeks on average`);
  if (weeksWatched === 0) fail('no weeks were watched, so this section proves nothing');
  if (emptiedWeeks > 0) fail(`the board was empty in ${emptiedWeeks} weeks, so the floor of ${FA_BOARD_FLOOR} is not holding`);
  if (mean(churn) < 3) fail(`the board only changed in ${mean(churn).toFixed(1)} of 22 weeks, which is a list and not a market`);
}

/* ================================================================== */
console.log('8) A free agent board does not replace the transfer market');
/*
 * The balance check, in two halves, because the obvious version of it is a
 * coin toss dressed as a rule.
 *
 * A free transfer saves the whole fee, so the board is ALWAYS better value.
 * What must not be true is that it is better FOOTBALL. The first draft measured
 * only the outcome, a free agent only manager's eleven against a buyer's after
 * three seasons, and that number is noisy: over four clubs it read a 0.5 gap,
 * and the three arms were not even paired, so a do-nothing arm measured 74.0 in
 * one run and 79.0 in the next. A threshold on that is Round 284's coin toss.
 *
 * 8a is the low variance half and it carries the weight: at every shopping
 * round, the best free agent the engine would actually let you sign against the
 * best market player you could actually afford. Hundreds of samples, and it
 * reads the design intent directly.
 *
 * 8b is the outcome, kept because an input check cannot see a second-order
 * effect like depth (the fit adjusted rating rewards a full squad, which is how
 * the second build still finished a free agent arm on 80.0 against a buyer's
 * 76.0 while signing nobody above 73). Its threshold is set from the measured
 * failure, not from the measured pass.
 */
{
  /* ---- 8a: what is on the two boards, round by round ---- */
  const gaps = [];
  let boardWon = 0;
  let rounds = 0;
  for (const club of CLUBS) {
    for (let run = 1; run <= 2; run += 1) {
      reseed(armSeed(club, run));
      let s = startCareer(club);
      for (let season = 0; season < 2; season += 1) {
        for (let week = 0; week < 40 && s.week < s.calendar.length; week += 1) {
          if (week % 5 === 0) {
            const fa = freeAgentPool(s).filter(x => freeAgentRefusal(s, x.id) === null)
              .sort((a, b) => b.rating - a.rating)[0];
            const mp = buildMarket(s).filter(m => m.price <= s.budget)
              .sort((a, b) => b.rating - a.rating)[0];
            if (fa && mp) {
              rounds += 1;
              gaps.push(mp.rating - fa.rating);
              if (fa.rating > mp.rating) boardWon += 1;
            }
          }
          const r = playNextEntry(s, { skipHalftime: true });
          s = r.state;
          if (r.kind === 'seasonOver' || s.sacked) break;
        }
        if (s.sacked) break;
        if (season < 1) s = nextSeason(s);
      }
    }
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  const p5 = sorted.length ? sorted[Math.floor(sorted.length * 0.05)] : 0;
  const wonPct = rounds ? (boardWon / rounds) * 100 : 0;
  console.log(`   8a: ${rounds} rounds. Best signable free agent vs best affordable buy: mean gap ${mean(gaps).toFixed(1)}, p5 ${p5}, board won ${boardWon} (${wonPct.toFixed(1)}%)`);
  if (rounds < 50) fail(`only ${rounds} shopping rounds were sampled, which is too few to read a distribution`);
  /* Measured 2026-09-16 over 138 rounds: mean 16.6, min 10, p5 11, and the
     board won nothing. The floor at 5 sits well under the whole fixed band and
     well over a collapsed one. */
  if (mean(gaps) < 5) fail(`the market is only ${mean(gaps).toFixed(1)} rating points better than the free agent board, so the transfer screen is pointless`);
  if (wonPct > 10) fail(`the board offered a better player than the market in ${wonPct.toFixed(1)}% of rounds`);

  /* ---- 8b: where three managers end up ---- */
  const arms = { market: [], free: [], nothing: [] };
  for (const club of CLUBS) {
    for (const arm of ['market', 'free', 'nothing']) {
      reseed(armSeed(club, 1));
      let s = startCareer(club);
      for (let season = 0; season < 3; season += 1) {
        for (let round = 0; round < 3; round += 1) {
          for (let buy = 0; buy < 3 && arm !== 'nothing'; buy += 1) {
            if (s.squad.length >= 30) break;
            if (arm === 'market') {
              const mp = buildMarket(s).filter(m => m.price <= s.budget).sort((a, b) => b.rating - a.rating)[0];
              const next = mp ? buyPlayer(s, mp) : null;
              if (!next) break;
              s = next;
            } else {
              const fa = freeAgentPool(s).find(x => freeAgentRefusal(s, x.id) === null);
              const next = fa ? signFreeAgent(s, fa.id) : null;
              if (!next) break;
              s = next;
            }
          }
          let step = 0;
          while (step < 6 && s.week < s.calendar.length) {
            step += 1;
            const r = playNextEntry(s, { skipHalftime: true });
            s = r.state;
            if (r.kind === 'seasonOver') break;
          }
        }
        s = runSeason(s);
        if (s.sacked) break;
        if (season < 2) s = nextSeason(s);
      }
      arms[arm].push(Math.round(xiAverageRating(s) * 10) / 10);
    }
  }
  const mk = mean(arms.market);
  const fr = mean(arms.free);
  const no = mean(arms.nothing);
  console.log(`   8b: after 3 seasons, XI by arm: buying ${mk.toFixed(2)}, free agents only ${fr.toFixed(2)}, signing nobody ${no.toFixed(2)}`);
  if (arms.market.length !== CLUBS.length || arms.free.length !== CLUBS.length || arms.nothing.length !== CLUBS.length) {
    fail('an arm did not finish at every club, so the comparison is not paired');
  }
  /* Threshold set from the FAILURE, not from the pass. The broken build had the
     free agent arm 4.0 points AHEAD; the fixed one has it 1.0 BEHIND over 12
     paired runs. 1.5 of slack sits between the two with real headroom either
     way, and does not pretend a three season eleven is a precise instrument. */
  if (fr - mk > 1.5) {
    fail(`signing only free agents finished ${(fr - mk).toFixed(2)} rating points AHEAD of buying, so the board has replaced the market`);
  }
  /* And the other direction: a board nobody would ever use is not a feature.
     Same slack as above and for the same reason. Three arms cannot be kept in
     lockstep once they make different numbers of draws, so this reads as "not
     clearly worse than doing nothing" rather than "better", which a paired
     three season eleven is not precise enough to say. The primefree run is the
     worked example: it landed free agents 1.0 BELOW the do-nothing arm on pure
     divergence while the board was, if anything, too strong. */
  if (no - fr > 1.5) {
    fail(`signing free agents (${fr.toFixed(2)}) finished clearly behind signing nobody (${no.toFixed(2)}), so the board is worthless`);
  }
}

/* ================================================================== */
console.log('9) An old save opens on an empty board, and the repair is a fixed point');
{
  const s = startCareer('Everton');
  const legacy = JSON.parse(JSON.stringify(s));
  delete legacy.freeAgents;
  ensureFreeAgents(legacy);
  if (!Array.isArray(legacy.freeAgents)) fail('the repair did not give an old save a board at all');
  if (legacy.freeAgents.length !== 0) fail('the repair invented free agents for a save that had none');
  const before = JSON.stringify(legacy);
  ensureFreeAgents(legacy);
  if (JSON.stringify(legacy) !== before) fail('the repair changed an already repaired save');
  /* And a real board survives a JSON round trip unchanged, which is the whole
     of its persistence: it rides inside the existing save blob. */
  const withBoard = JSON.parse(JSON.stringify(s));
  ensureFreeAgents(withBoard);
  if (JSON.stringify(withBoard.freeAgents) !== JSON.stringify(s.freeAgents)) {
    fail('the repair rewrote a board that was already there');
  }
  console.log(`   repaired an old save to 0 entries and left a live board of ${s.freeAgents.length} alone`);
}

/* ================================================================== */
console.log('10) Copy check');
{
  let dashes = 0;
  for (const file of ['src/lib/clubManagerFreeAgents.ts', 'src/components/club-manager/TransferScreen.tsx', 'src/components/club-manager/ContractsCard.tsx']) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/[–—]/.test(line) && !line.includes('─')) { dashes += 1; fail(`${file}:${i + 1} has an em or en dash`); }
    });
  }
  if (dashes === 0) console.log('   clean');
}

console.log(failures === 0 ? '\nALL FREE AGENT CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
