/* Deadline Day: the last day of the window on the Club Manager engine (Round 721).

   The game is a frame around the shared engine: a real club's XI read into
   three or four needs, real players from the engine's market as the
   approaches, a budget read off what they cost, a clock in game hours, rival
   clubs that move for the same players, and a grade. Every ask, counter,
   patience cost, closeness reading, valuation band, rival hijack, terms
   verdict, signing and sale is the engine's (src/lib/clubManager.ts and
   src/lib/clubManagerDeals.ts, Round 506's deal desk), imported unchanged and
   driven on a seeded stream. What this harness holds is the frame:

     1) the brief is the club's and it is real. Many seeded windows across
        the pool: three or four needs, at least two approaches each, every
        approach a real market player who can play the slot and clears its
        line, none at a partial club or the club itself, and a budget that
        covers the cheapest man for every need at his sticker but NOT the
        dearest, so the window is a choice.
     2) the desk pays. Two scripted managers play the same windows on the same
        dice, picking the same targets in the same order and handling terms
        the same way. One prices every bid off the valuation desk's band and
        haggles while the clock allows; the other pays the asking price. The
        desk manager must grade higher on average, win more of the paired
        windows than he loses, and take more value points.
     3) the clock binds (hard). A third manager agrees fees and leaves the
        terms unsigned while he burns the hours elsewhere. When the window
        shuts every deal still in talks or at the terms table has collapsed,
        none of those men is in the squad, none of their fees was charged,
        and nothing can be done after the shut. The clock is counted off the
        actions that cost an hour (bid, terms, sale), never off run.hour,
        which the shut pins: no window spends more than DEADLINE_HOURS of
        them, a window the clock shut spent exactly DEADLINE_HOURS, and while
        the window is open the wall clock always equals the hours spent. The
        guide's "11am to 11pm, 12 hours" is this clock's.
     4) the daily (hard). The same date gives the same club, seed and window;
        each of 28 consecutive days gives a different window from the day
        before; and a window rebuilt from its seed and its actions matches
        the original in every status, fee, budget and grade.
     5) the budget never goes negative (hard), after every action of every
        manager in sections 2 and 3 and of a reckless one who pays every ask
        and every agent's full terms without looking at the budget. The
        actions read and the reckless manager's overreaches (1693 on the
        filename seed) are held to floors so the check cannot pass on nothing.
     6) Club Manager's module registrations come back. A custom club and a
        league override registered the way a Club Manager save registers
        them survive a start, every kind of action and a replay, and the
        window never shows the registered club.
     7) the rivals. Every hour a rival is in for a live man you did not push
        that hour, he closes at the rate the rules, the guide and the tips
        state (RIVAL_CLOSE), counted by stepping the desk and asking price
        windows through again action by action, and the man goes to the club
        that was in. Walking away from a terms table with a rival circling
        usually loses him, as the guide says.
     8) the bonus is paid (hard). Wage and length cost nothing in a one day
        game, so the board caps both at his ask: on every terms table, no
        offer that trades the bonus for wage or length signs him, nothing over
        his ask is recorded, and exactly his ask still signs him.
     9) the worked examples are the engine's (hard). The 2026-10-01 daily is
        played as the rules screen and the guide describe it, and every figure
        they quote, and the guide's grade arithmetic, is rebuilt from the
        engine and looked for in the copy.

   Negative controls (house rule: prove the checks can fail). Each rewrites an
   in memory copy of a file and refuses to run if its anchor is not there:
     DEADLINE_CONTROL=blind    the grade stops reading money (value and budget
       points to zero): the desk's edge is gone. Section 2 must go red.
     DEADLINE_CONTROL=noclock  the shut stops collapsing unfinished deals.
       Section 3 must go red.
     DEADLINE_CONTROL=frozen   the daily ignores its date. Section 4 must go red.
     DEADLINE_CONTROL=drift    withSeed (Manager Hot Seat's) stops swapping the
       stream in, so a replay walks different dice. Section 4 must go red.
     DEADLINE_CONTROL=overdraw the engine's two affordability checks (makeOffer
       and offerTerms) and the frame's two pre checks are removed, the shape
       of a frame that trusts the screen. Section 5 must go red.
     DEADLINE_CONTROL=leak     Manager Hot Seat's onStaticWorld stops restoring
       registrations, its own leak control copied. Section 6 must go red.
     DEADLINE_CONTROL=longday  the clock shuts after 13 hours instead of 12
       (the review's mutation, which every check passed). Section 3 must go red.
     DEADLINE_CONTROL=norivals a rival never closes on a man left alone
       (RIVAL_CLOSE 0, which every check passed). Section 7 must go red.
     DEADLINE_CONTROL=walkfree walking away from the terms table never loses
       him to a circling rival, as before the review fix. Section 7 must go red.
     DEADLINE_CONTROL=freewage the board pays any wage and any length again,
       as before the review fix. Section 8 must go red.
     DEADLINE_CONTROL=salt     the daily draws a different window for the same
       date, the shape of an engine change under the worked example.
       Section 9 must go red.
     DEADLINE_CONTROL=curve    the grade's budget points bend to a square root
       while every constant stays put, so only gradeWindow itself can tell
       the guide's grade paragraph no longer adds up. Section 9 must go red.

   Thresholds: see the THRESHOLDS block in section 2 for the measured runs
   and the margins. The hard sections (3 to 6) have no band: one breach is red.
   Section 3's floor of held deals caught at the shut (one for every two
   windows, so 100) measured 275 to 309 over 200 windows on the same six
   streams.
   Section 7's bands and floor are in the same block, measured on the same
   streams. Sections 8 and 9 are hard: one breach is red.
   Run: node scripts/simDeadlineDay.mjs (about 50 seconds)
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const CONTROLS = ['blind', 'noclock', 'frozen', 'drift', 'overdraw', 'leak', 'longday', 'norivals', 'walkfree', 'freewage', 'salt', 'curve'];
/* The section each control must turn red. */
const PREDICTED = { blind: 2, noclock: 3, frozen: 4, drift: 4, overdraw: 5, leak: 6, longday: 3, norivals: 7, walkfree: 7, freewage: 8, salt: 9, curve: 9 };
const CONTROL = process.env.DEADLINE_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`DEADLINE_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}
/* DEADLINE_SETUPS raises the sample when re-measuring the bands; the default
   is what the thresholds were measured on. */
const SETUPS = Math.max(12, Number(process.env.DEADLINE_SETUPS) || 200);

let failures = 0;
const failedSections = new Set();
let section = 0;
const fail = m => { failures += 1; failedSections.add(section); console.error('  FAIL: ' + m); };
const ok = m => console.log('   ok  ' + m);
const lf = s => s.replaceAll('\r\n', '\n');
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const pct = (n, d) => (d ? (100 * n) / d : NaN);
const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : String(n));

/* ---- the files, rewritten when a control asks ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `deadlineDay-${process.pid}-`));
const LIB = path.join(SRC, 'lib', 'deadlineDay.ts');
const HOT = path.join(SRC, 'lib', 'managerHotSeat.ts');
const CM = path.join(SRC, 'lib', 'clubManager.ts');
/* '@/lib/x' paths swapped for a rewritten copy, for every importer at once,
   so the bundle still holds one engine and one set of registrations. */
const swaps = {};
let libPath = LIB;
function rewrite(file, edits, outName, what) {
  let src = lf(fs.readFileSync(file, 'utf8'));
  for (const [from, to] of edits) {
    if (!src.includes(from)) {
      console.error(`control cannot run: ${what} is not in the shape DEADLINE_CONTROL=${CONTROL} rewrites (${from.slice(0, 70)}...)`);
      process.exit(1);
    }
    src = src.replace(from, to);
  }
  const out = path.join(TMP, outName);
  fs.writeFileSync(out, src);
  return out;
}
if (CONTROL === 'blind') {
  libPath = rewrite(LIB, [
    ['export const VALUE_POINTS = 30;\n', 'export const VALUE_POINTS = 0;\n'],
    ['export const BUDGET_POINTS = 20;\n', 'export const BUDGET_POINTS = 0;\n'],
  ], 'deadlineDay.blind.ts', 'the money weights of the grade');
  console.log('NEGATIVE CONTROL ON: the grade ignores fees and budget; section 2 must go red');
}
if (CONTROL === 'noclock') {
  libPath = rewrite(LIB, [["    if (t.status === 'talks' || t.status === 'terms') {\n      t.status = 'collapsed';\n", "    if (false) {\n      t.status = 'collapsed';\n"]], 'deadlineDay.noclock.ts', 'the collapse at the shut');
  console.log('NEGATIVE CONTROL ON: the shut leaves unfinished deals standing; section 3 must go red');
}
if (CONTROL === 'frozen') {
  libPath = rewrite(LIB, [['  const pool = dailyPool(date);\n  /* Half a pool', "  date = '2026-01-01';\n  const pool = dailyPool(date);\n  /* Half a pool"]], 'deadlineDay.frozen.ts', 'the daily pick');
  console.log('NEGATIVE CONTROL ON: every date gets the same window; section 4 must go red');
}
if (CONTROL === 'drift') {
  swaps['@/lib/managerHotSeat'] = rewrite(HOT, [['  Math.random = mulberry32(seed >>> 0);\n', '  Math.random = saved;\n']], 'managerHotSeat.drift.ts', 'the seeded stream swap');
  console.log('NEGATIVE CONTROL ON: engine calls draw from the ambient stream; section 4 must go red');
}
if (CONTROL === 'leak') {
  swaps['@/lib/managerHotSeat'] = rewrite(HOT, [['  const swap = had.custom !== null || had.overrides !== null;\n', '  const swap = false;\n']], 'managerHotSeat.leak.ts', 'the registration swap');
  console.log('NEGATIVE CONTROL ON: the window runs inside whatever the tab registered and startCareer wipes it; section 6 must go red');
}
if (CONTROL === 'overdraw') {
  swaps['@/lib/clubManager'] = rewrite(CM, [
    ['  if (amount > career.budget) {\n    return {\n      ...career,\n      negotiation: { ...neg, note: `You do not have', '  if (false) {\n    return {\n      ...career,\n      negotiation: { ...neg, note: `You do not have'],
    ['  if (fee + clean.bonus > career.budget) {\n', '  if (false) {\n'],
    ['  if (fee > career.budget) return `That costs', '  if (false) return `That costs'],
  ], 'clubManager.overdraw.ts', 'the engine affordability checks');
  libPath = rewrite(LIB, [
    ['  if (!(amt > 0) || amt > prev.state.budget) return prev;\n', '  if (!(amt > 0)) return prev;\n'],
    ['  if (fee + bonus > prev.state.budget) return prev;\n', ''],
  ], 'deadlineDay.overdraw.ts', 'the frame pre checks');
  console.log('NEGATIVE CONTROL ON: nothing checks what the club can afford; section 5 must go red');
}
if (CONTROL === 'longday') {
  libPath = rewrite(LIB, [['  if (run.hour >= DEADLINE_HOURS) shutWindow(run);\n', '  if (run.hour > DEADLINE_HOURS) shutWindow(run);\n']], 'deadlineDay.longday.ts', 'the clock shut');
  console.log('NEGATIVE CONTROL ON: the window shuts an hour late (13 hours, the review\'s mutation); section 3 must go red');
}
if (CONTROL === 'norivals') {
  libPath = rewrite(LIB, [['export const RIVAL_CLOSE = 0.3;\n', 'export const RIVAL_CLOSE = 0;\n']], 'deadlineDay.norivals.ts', 'the rival close chance');
  console.log('NEGATIVE CONTROL ON: a rival never closes on a player you leave alone; section 7 must go red');
}
if (CONTROL === 'walkfree') {
  libPath = rewrite(LIB, [["    if (t.status === 'terms' && t.rival && t.neg) t.neg = { ...t.neg, rivalBidder: t.rival.club, rivalOffer: t.rival.offer };\n", '']], 'deadlineDay.walkfree.ts', 'the rival seated for a walk at the terms table');
  console.log('NEGATIVE CONTROL ON: walking away from the terms table never loses him to a circling rival, as before the review fix; section 7 must go red');
}
if (CONTROL === 'freewage') {
  libPath = rewrite(LIB, [[
    '    years: Math.max(MIN_TERMS_YEARS, Math.min(want.years, Math.round(offer.years))),\n    wage: Math.max(1, Math.min(want.wage, Math.round(offer.wage))),\n',
    '    years: Math.round(offer.years),\n    wage: Math.max(1, Math.round(offer.wage)),\n',
  ]], 'deadlineDay.freewage.ts', 'the board\'s cap on wage and length');
  console.log('NEGATIVE CONTROL ON: the board pays any wage and any length, as before the review fix; section 8 must go red');
}
if (CONTROL === 'salt') {
  libPath = rewrite(LIB, [['seed: mixSeed(dailyPrngSeed(date), 721)', 'seed: mixSeed(dailyPrngSeed(date), 722)']], 'deadlineDay.salt.ts', 'the daily seed');
  console.log('NEGATIVE CONTROL ON: the daily draws a different window for the same date, the shape of an engine change under the worked example; section 9 must go red');
}
if (CONTROL === 'curve') {
  libPath = rewrite(LIB, [[
    '  const budgetPts = BUDGET_POINTS * Math.max(0, Math.min(1, budgetLeft / Math.max(0.1, run.startBudget))) * share;\n',
    '  const budgetPts = BUDGET_POINTS * Math.sqrt(Math.max(0, Math.min(1, budgetLeft / Math.max(0.1, run.startBudget)))) * share;\n',
  ]], 'deadlineDay.curve.ts', 'the budget points line of the grade');
  console.log('NEGATIVE CONTROL ON: the budget points bend to a square root curve while the constants stay put; section 9 must go red');
}

/* One CommonJS bundle: the lib (or its rewritten copy) and the engine, with
   '@/' resolved here so a swapped file replaces the real one for every
   importer. */
const aliasPlugin = {
  name: 'dukb-alias',
  setup(b) {
    b.onResolve({ filter: /^@\// }, async args => {
      if (swaps[args.path]) return { path: swaps[args.path] };
      const r = await b.resolve('./' + args.path.slice(2), { resolveDir: SRC, kind: args.kind });
      return { path: r.path, errors: r.errors };
    });
  },
};
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.cjs');
fs.writeFileSync(ENTRY, `
export * as dd from ${JSON.stringify(libPath.replaceAll('\\', '/'))};
export * as cm from '@/lib/clubManager';
export * as hs from '@/lib/managerHotSeat';
export { askingTerms } from '@/lib/clubManagerDeals';
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', outfile: BUNDLE, logLevel: 'error', plugins: [aliasPlugin] });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { dd, cm, hs, askingTerms } = createRequire(import.meta.url)(BUNDLE);
const {
  startDeadlineDay, openTalks, placeBid, offerPersonalTerms, walkFrom, sellPlayer, endDay, replayDeadlineDay,
  dailyDeadlineDay, deskRead, termsWanted, rivalOn, hoursLeft, DEADLINE_HOURS, CANDIDATES_PER_NEED, BUDGET_SHARE,
  applyAction, clockLabel, valueShare, letterFor, slotWord, RIVAL_CLOSE, NEEDS_POINTS, VALUE_POINTS, BUDGET_POINTS,
  gradeWindow,
} = dd;
const { registerCustomClub, registerLeagueOverrides, engineRegistrations, activeCustomClub, playableClubs, isPartialClub, money } = cm;
const { hotSeatPool } = hs;

/* ---------- the setups: clubs spread across the pool, seeds from the harness stream ---------- */
const POOL = hotSeatPool().map(c => c.club);
section = 1;
if (POOL.length < 40) fail(`the club pool has ${POOL.length} clubs, the real leagues should give far more`);
const setups = [];
for (let i = 0; i < SETUPS; i++) {
  const club = POOL[Math.floor((i / SETUPS) * POOL.length) % POOL.length];
  setups.push({ club, seed: Math.floor(Math.random() * 4294967296) >>> 0 });
}

/* ---------- the budget fence and the clock, read after every action ---------- */
/* The actions that cost an hour. Opening talks, walking away and ending the
   day cost none. */
const hoursUsed = r => r.actions.filter(a => a.t === 'bid' || a.t === 'terms' || a.t === 'sell').length;
let actionsRead = 0, negatives = 0, clockDrift = 0;
const firstNegative = [], firstDrift = [];
function watch(run, tag) {
  actionsRead += 1;
  if (!(run.state.budget >= 0)) {
    negatives += 1;
    if (firstNegative.length < 3) firstNegative.push(`${tag}: budget ${run.state.budget} at hour ${run.hour}`);
  }
  /* While the window is open the wall clock is exactly the hours spent. */
  if (!run.grade && run.hour !== hoursUsed(run)) {
    clockDrift += 1;
    if (firstDrift.length < 3) firstDrift.push(`${tag}: hour ${run.hour} after ${hoursUsed(run)} hour costing actions`);
  }
  return run;
}

/* ---------- the managers ---------- */
const sticker = mp => mp.price + askingTerms(mp).bonus;
const filledNeeds = run => new Set(run.targets.filter(t => t.status === 'signed').map(t => t.need));

/* The next target for the next open need, in queue order (cheap to dear). */
function nextTarget(run, skipped) {
  const filled = filledNeeds(run);
  for (let n = 0; n < run.needs.length; n++) {
    if (filled.has(n) || skipped.has(n)) continue;
    const inPlay = run.targets.findIndex(t => t.need === n && (t.status === 'talks' || t.status === 'terms'));
    if (inPlay >= 0) return inPlay;
    const idle = run.targets.findIndex(t => t.need === n && t.status === 'idle');
    if (idle >= 0) return idle;
    skipped.add(n);
  }
  return -1;
}
function openSale(run) {
  return run.sales.findIndex(s => !s.done && run.state.squad.some(p => p.id === s.playerId));
}
/* Terms: both managers offer exactly what he asks. The board will not go over
   his wage or his length (boardTerms), so nothing can stand in for the bonus:
   when it will not fit they sell a bench man first, and when it still will
   not fit the frame refuses the offer and they walk. (Before the review fix
   this traded the bonus for wage, which section 8 now proves cannot sign.) */
function termsOffer(run, i) {
  const want = termsWanted(run, i);
  return { wage: want.wage, years: want.years, bonus: want.bonus };
}
function bidFor(run, i, arm, last) {
  const t = run.targets[i];
  const ask = t.neg.theirAsk;
  const rival = rivalOn(t);
  const beat = rival ? Math.round((rival.offer + 0.1) * 10) / 10 : 0;
  if (arm === 'over') return Math.max(Math.round(ask * 10) / 10, beat);
  /* The desk manager: aim at the middle of the desk's band, climb half way to
     the agree line each round, and close at the line when the seller's
     patience or the clock says so. */
  const desk = deskRead(run, i);
  const mid = (desk.low + desk.high) / 2;
  const line = Math.ceil(ask * 0.97 * 10) / 10;
  /* Every open need costs at least a bid and a terms offer, and he keeps an
     hour a need in hand for a rival or a sale. */
  const open = run.needs.length - filledNeeds(run).size;
  const spare = hoursLeft(run) - 3 * Math.max(1, open);
  let bid;
  if (spare <= 0 || t.neg.patience <= 2) bid = line;
  else if (last === undefined) bid = Math.min(line, Math.max(Math.ceil(ask * 0.77 * 10) / 10, mid * 0.98));
  else bid = Math.min(line, Math.max(last + (line - last) * 0.5, mid * 0.98));
  return Math.round(Math.max(bid, beat) * 10) / 10;
}
function play(start, arm) {
  let run = start;
  const skipped = new Set();
  const lastBid = new Map();
  const tag = `${start.setup.club} seed ${start.setup.seed} ${arm}`;
  let guard = 0;
  while (!run.grade && guard++ < 200) {
    const i = nextTarget(run, skipped);
    if (i < 0) { run = watch(endDay(run), tag); break; }
    const t = run.targets[i];
    if (t.status === 'idle') {
      const next = openTalks(run, i);
      if (next === run) {
        /* A full squad is fixed by a sale; anything else skips the need. */
        const k = run.state.squad.length >= 30 ? openSale(run) : -1;
        if (k >= 0) run = watch(sellPlayer(run, k), tag);
        else skipped.add(t.need);
        continue;
      }
      run = watch(next, tag);
      continue;
    }
    if (t.status === 'talks') {
      const bid = bidFor(run, i, arm, lastBid.get(i));
      if (bid > run.state.budget) {
        const k = openSale(run);
        if (k >= 0) { run = watch(sellPlayer(run, k), tag); continue; }
        run = watch(walkFrom(run, i), tag);
        continue;
      }
      const next = placeBid(run, i, bid);
      if (next === run) { run = watch(walkFrom(run, i), tag); continue; }
      lastBid.set(i, bid);
      run = watch(next, tag);
      continue;
    }
    /* terms */
    const want = termsWanted(run, i);
    const fee = t.neg.agreedFee ?? 0;
    if (fee + want.bonus > run.state.budget || run.state.squad.length >= 30) {
      const k = openSale(run);
      if (k >= 0) { run = watch(sellPlayer(run, k), tag); continue; }
    }
    const next = offerPersonalTerms(run, i, termsOffer(run, i));
    if (next === run) { run = watch(walkFrom(run, i), tag); continue; }
    run = watch(next, tag);
  }
  if (!run.grade) fail(`${tag}: never reached the shut in 200 steps`);
  return run;
}
/* The staller: agree two fees, leave both at the terms table, then burn the
   clock on low bids elsewhere. Never touches 'end', so the clock shuts it. */
function stall(start) {
  let run = start;
  const tag = `${start.setup.club} seed ${start.setup.seed} stall`;
  const held = [];
  let guard = 0;
  while (!run.grade && guard++ < 300) {
    if (held.length < 2) {
      let i = run.targets.findIndex((t, j) => (t.status === 'talks') && !held.includes(j));
      if (i < 0) {
        const heldNeeds = new Set(held.map(h => run.targets[h].need));
        i = run.targets.findIndex(t => t.status === 'idle' && !heldNeeds.has(t.need));
        if (i < 0) break;
        const opened = openTalks(run, i);
        if (opened === run) break;
        run = watch(opened, tag);
        continue;
      }
      const t = run.targets[i];
      const rival = rivalOn(t);
      const bid = Math.max(t.neg.theirAsk, rival ? rival.offer + 0.1 : 0);
      const next = bid <= run.state.budget ? placeBid(run, i, bid) : run;
      if (next === run) { run = watch(walkFrom(run, i), tag); continue; }
      run = watch(next, tag);
      if (run.targets[i].status === 'terms') held.push(i);
      continue;
    }
    /* burn an hour: a low bid on some other table, opening one if needed */
    let j = run.targets.findIndex((t, k) => t.status === 'talks' && !held.includes(k));
    if (j < 0) {
      j = run.targets.findIndex(t => t.status === 'idle');
      if (j >= 0) { const o = openTalks(run, j); if (o === run) break; run = watch(o, tag); continue; }
      const k = openSale(run);
      if (k >= 0) { run = watch(sellPlayer(run, k), tag); continue; }
      /* nothing left to burn on: haggle the held terms down, which costs an
         hour a time and can make his agent walk, both of which are fine */
      const h = held.find(x => run.targets[x].status === 'terms');
      if (h === undefined) break;
      const want = termsWanted(run, h);
      const next = offerPersonalTerms(run, h, { wage: Math.max(1, Math.round(want.wage * 0.85)), years: want.years, bonus: 0 });
      if (next === run) break;
      run = watch(next, tag);
      continue;
    }
    const t = run.targets[j];
    const bid = Math.round(Math.max(0.1, t.neg.theirAsk * 0.8) * 10) / 10;
    const next = bid <= run.state.budget ? placeBid(run, j, bid) : run;
    if (next === run) { run = watch(walkFrom(run, j), tag); continue; }
    run = watch(next, tag);
  }
  /* Ran out of things to burn the clock on: the day is ended by hand, which
     section 3 counts apart from a shut by the clock. */
  if (!run.grade) run = watch(endDay(run), tag);
  return { run, held };
}

/* ---------- 1. the brief ---------- */
section = 1;
console.log(`1) The brief over ${SETUPS} seeded windows`);
const starts = [];
let tight = 0, needCounts = { 3: 0, 4: 0 };
for (const setup of setups) {
  const run = startDeadlineDay(setup);
  starts.push(run);
  const tag = `${setup.club} seed ${setup.seed}`;
  const n = run.needs.length;
  if (n !== 3 && n !== 4) { fail(`${tag}: ${n} needs`); continue; }
  needCounts[n] += 1;
  if (run.hour !== 0 || run.grade) fail(`${tag}: the day starts at hour ${run.hour}${run.grade ? ' already graded' : ''}`);
  if (!(run.startBudget > 0) || run.state.budget !== run.startBudget) fail(`${tag}: the budget is ${run.state.budget} against a start of ${run.startBudget}`);
  let cheapest = 0, dearest = 0;
  for (let k = 0; k < n; k++) {
    const need = run.needs[k];
    const mine = run.targets.filter(t => t.need === k);
    if (mine.length < 2) fail(`${tag}: the ${need.label} need has ${mine.length} approaches`);
    if (mine.length > CANDIDATES_PER_NEED) fail(`${tag}: the ${need.label} need has ${mine.length} approaches, more than ${CANDIDATES_PER_NEED}`);
    for (const t of mine) {
      const mp = t.mp;
      if (!need.allowed.includes(mp.position)) fail(`${tag}: ${mp.name} (${mp.position}) cannot play ${need.label}`);
      if (mp.rating < need.min) fail(`${tag}: ${mp.name} is rated ${mp.rating}, under the ${need.label} line of ${need.min}`);
      if (mp.generated) fail(`${tag}: ${mp.name} is a generated player`);
      if (!(mp.value > 0)) fail(`${tag}: ${mp.name} has no real value`);
      if (mp.club === run.state.clubName) fail(`${tag}: ${mp.name} already plays for the club`);
      if (isPartialClub(mp.club)) fail(`${tag}: ${mp.name} is at ${mp.club}, a partial roster`);
      if (run.state.squad.some(p => p.name === mp.name)) fail(`${tag}: ${mp.name} is in the squad already`);
    }
    if (mine.length) {
      cheapest += Math.min(...mine.map(t => sticker(t.mp)));
      dearest += Math.max(...mine.map(t => sticker(t.mp)));
    }
  }
  if (cheapest * BUDGET_SHARE - run.startBudget > 0.5) fail(`${tag}: the budget ${run.startBudget} does not cover the cheapest man for every need (${fmt(cheapest, 1)} at sticker)`);
  if (dearest > run.startBudget) tight += 1;
  const names = run.targets.map(t => t.mp.name);
  if (new Set(names).size !== names.length) fail(`${tag}: a player is in the queue twice`);
}
console.log(`   needs: ${needCounts[3]} windows of three, ${needCounts[4]} of four; the dearest men for every need overrun the budget in ${tight} of ${SETUPS} (${fmt(pct(tight, SETUPS), 1)} percent)`);
if (needCounts[3] < SETUPS * 0.2 || needCounts[4] < SETUPS * 0.2) fail('three and four need windows should both be common');
if (pct(tight, SETUPS) < 90) fail(`the budget covers every need's dearest man in ${SETUPS - tight} windows; under 90 percent tight is not a choice (floor 90)`);
if (!failedSections.has(1)) ok(`${SETUPS} briefs: real approaches who fit the slot and clear the line, a budget that covers the cheap route and not the dear one`);

/* ---------- 2. the desk pays ---------- */
section = 2;
console.log('2) Pricing off the desk against paying the asking price, on the same dice');
const arms = { desk: [], over: [] };
for (const start of starts) {
  for (const arm of Object.keys(arms)) arms[arm].push(play(start, arm));
}
const g = (arm, k) => mean(arms[arm].map(r => r.grade[k]));
let deskWins = 0, overWins = 0;
for (let i = 0; i < starts.length; i++) {
  const a = arms.desk[i].grade.score, b = arms.over[i].grade.score;
  if (a > b) deskWins += 1; else if (b > a) overWins += 1;
}
for (const arm of Object.keys(arms)) {
  const full = arms[arm].filter(r => r.grade.filled === r.grade.needs).length;
  const st = {};
  for (const r of arms[arm]) for (const t of r.targets) if (t.status !== 'idle') st[t.status] = (st[t.status] || 0) + 1;
  const ratio = mean(arms[arm].flatMap(r => r.grade.signings.map(s => s.fee / s.value)));
  console.log(`   ${arm.padEnd(4)} score ${fmt(g(arm, 'score'))}, needs ${fmt(g(arm, 'needsPts'))}, value ${fmt(g(arm, 'valuePts'))}, budget ${fmt(g(arm, 'budgetPts'))}; every need filled in ${fmt(pct(full, starts.length), 1)} percent; hours used ${fmt(mean(arms[arm].map(hoursUsed)), 1)}; fee over value ${fmt(ratio, 3)}; sales ${fmt(mean(arms[arm].map(r => r.sales.filter(s => s.done).length)), 2)}; deals ${JSON.stringify(st)}`);
}
const scoreGap = g('desk', 'score') - g('over', 'score');
const valueGap = g('desk', 'valuePts') - g('over', 'valuePts');
console.log(`   desk minus asking price: ${scoreGap >= 0 ? '+' : ''}${fmt(scoreGap)} score, ${valueGap >= 0 ? '+' : ''}${fmt(valueGap)} value points; desk wins ${deskWins}, asking price wins ${overWins}, level ${starts.length - deskWins - overWins}`);
/* THRESHOLDS, measured again on 2026-10-01 after the review fix (the bonus
   can no longer be traded for wage, so a manager who cannot fit it sells or
   walks), at the default 200 windows over six streams (the filename seed,
   then SIM_SEED=1 to 5):
     score gap        3.96, 3.64, 4.10, 4.08, 4.06, 4.11   (spread 0.47)
     desk win share   90.1, 87.8, 88.5, 90.8, 90.0, 88.6 percent of decided pairs
     value point gap  4.70, 4.59, 4.66, 4.85, 4.67, 4.58
     desk fills all   87.0, 87.0, 87.0, 88.5, 86.0, 89.5 percent of windows
     (the asking price manager fills every need in 92.0 to 94.5 percent)
   Before the fix: score gap 3.30 to 3.80, win share 84.7 to 88.3, value gap
   4.60 to 4.86, desk fills 87.5 to 89.5. Each floor sits under the lowest
   stream by more than the whole spread. The blind control takes value and
   budget points to zero, which leaves the desk behind on needs alone, so
   every one of the first three goes red under it.
   Section 7, same six streams:
     rival hours exposed   2197, 2043, 2289, 2147, 2249, 2190
     closed on them        29.2, 28.2, 28.8, 28.6, 29.0, 31.4 percent (rule 30)
     walk with a rival     55.5, 62.0, 66.5, 63.0, 61.5, 62.0 percent of 200
   The close band 24 to 36 is about five standard errors of a 2000 hour
   sample either side of 30; the walk band 45 to 78 is four to five of a 200
   table sample either side of the engine's 60. The norivals and walkfree
   controls take each to zero. */
const T = {
  scoreGap: 2.5,
  winShare: 75,
  valueGap: 3.5,
  deskFullLo: 75, deskFullHi: 97,
};
if (!(scoreGap >= T.scoreGap)) fail(`pricing off the desk is worth ${fmt(scoreGap)} points over paying the ask (floor +${T.scoreGap})`);
if (!(pct(deskWins, deskWins + overWins) >= T.winShare)) fail(`the desk wins ${fmt(pct(deskWins, deskWins + overWins), 1)} percent of the decided pairs (floor ${T.winShare})`);
if (!(valueGap >= T.valueGap)) fail(`the desk takes ${fmt(valueGap)} more value points (floor +${T.valueGap})`);
const deskFull = pct(arms.desk.filter(r => r.grade.filled === r.grade.needs).length, starts.length);
if (!(deskFull >= T.deskFullLo && deskFull <= T.deskFullHi)) fail(`the desk manager fills every need in ${fmt(deskFull, 1)} percent of windows (band ${T.deskFullLo} to ${T.deskFullHi}): never or always is not a game`);
if (!failedSections.has(2)) ok('the manager who prices off the desk grades higher, wins more pairs and takes more value points, and the clock still beats him sometimes');

/* ---------- 3. the clock binds ---------- */
section = 3;
console.log('3) A deal unfinished at the shut collapses');
let caught = 0, clockShut = 0, overHour = 0, wrongShut = 0, lateMoves = 0, graded = 0;
const firstWrongShut = [];
const stalls = [];
for (const start of starts) {
  const { run, held } = stall(start);
  stalls.push(run);
  const tag = `${start.setup.club} seed ${start.setup.seed}`;
  if (!run.grade) { fail(`${tag}: the staller never reached the shut`); continue; }
  if (!run.actions.some(a => a.t === 'end')) clockShut += 1;
  for (const r of [run, ...[arms.desk, arms.over].map(a => a[starts.indexOf(start)])]) {
    graded += 1;
    /* The clock is counted off the actions, not off run.hour, which the shut
       pins to DEADLINE_HOURS whatever happened (the review found the old
       run.hour check could not fail). No window spends more hours than the
       day has, and a window the clock shut spent exactly all of them. */
    const used = hoursUsed(r);
    if (used > DEADLINE_HOURS) overHour += 1;
    if (!r.actions.some(a => a.t === 'end') && used !== DEADLINE_HOURS) {
      wrongShut += 1;
      if (firstWrongShut.length < 3) firstWrongShut.push(`${r.setup.club} seed ${r.setup.seed}: shut by the clock after ${used} hours`);
    }
    for (const t of r.targets) {
      if (t.status === 'talks' || t.status === 'terms') fail(`${tag}: ${t.mp.name} is still ${t.status === 'talks' ? 'in talks' : 'at the terms table'} after the shut`);
    }
  }
  for (const h of held) {
    const t = run.targets[h];
    if (t.status === 'signed') continue;
    if (t.status === 'collapsed' && t.note.startsWith('The window shut')) caught += 1;
    if (run.state.squad.some(p => p.name === t.mp.name)) fail(`${tag}: ${t.mp.name} collapsed at the shut and is in the squad anyway`);
  }
  /* Money in and out: only signings and sales move the budget. */
  const spent = run.targets.filter(t => t.status === 'signed').reduce((a, t) => a + (t.fee ?? 0) + (t.bonus ?? 0), 0);
  const sold = run.sales.filter(s => s.done).reduce((a, s) => a + s.offer, 0);
  const expect = Math.round((run.startBudget - spent + sold) * 10) / 10;
  if (Math.abs(run.state.budget - expect) > 0.25) fail(`${tag}: the budget is ${run.state.budget} and signings and sales say ${expect}, so an unfinished deal was charged`);
  /* Nothing moves after the shut. */
  const after = [
    openTalks(run, run.targets.findIndex(t => t.status === 'idle')),
    ...held.map(h => offerPersonalTerms(run, h, { wage: 999, years: 4, bonus: 0 })),
    sellPlayer(run, 0),
    endDay(run),
  ];
  if (after.some(x => x !== run)) lateMoves += 1;
}
console.log(`   ${caught} held deals caught at the shut, ${clockShut} of ${starts.length} days shut by the clock itself, ${lateMoves} days that moved after the shut`);
console.log(`   the clock: ${graded} graded windows, ${overHour} spent more than ${DEADLINE_HOURS} hours, ${wrongShut} shut by the clock on another count${firstWrongShut.length ? ` (${firstWrongShut.join('; ')})` : ''}; ${actionsRead} actions read so far, ${clockDrift} with the wall clock off the hours spent${firstDrift.length ? ` (${firstDrift.join('; ')})` : ''}`);
if (caught < starts.length * 0.5) fail(`only ${caught} deals were left at the terms table when the window shut (floor ${starts.length * 0.5}), so the collapse was barely measured`);
if (clockShut < starts.length * 0.8) fail(`only ${clockShut} of ${starts.length} stalled days were shut by the clock rather than by ending early (floor 80 percent)`);
if (lateMoves) fail(`${lateMoves} days took an action after the window shut`);
if (overHour) fail(`${overHour} windows spent more than the ${DEADLINE_HOURS} hours the day has`);
if (wrongShut) fail(`${wrongShut} windows were shut by the clock after some count of hours other than ${DEADLINE_HOURS}`);
if (clockDrift) fail(`${clockDrift} actions left the clock reading something other than the hours spent`);
/* The words on the rules screen and in the guide are this clock's. */
const PAGE_SRC = lf(fs.readFileSync(path.join(SRC, 'pages', 'DeadlineDay.tsx'), 'utf8'));
const GUIDE_ALL = lf(fs.readFileSync(path.join(SRC, 'data', 'gameContent', 'soccer2.ts'), 'utf8'));
const guideStart = GUIDE_ALL.indexOf("'/deadline-day': {");
const guideEnd = guideStart < 0 ? -1 : GUIDE_ALL.indexOf("\n  '/", guideStart + 10);
const GUIDE = guideStart < 0 ? '' : GUIDE_ALL.slice(guideStart, guideEnd < 0 ? undefined : guideEnd);
if (!GUIDE) fail('the Deadline Day guide is not in src/data/gameContent/soccer2.ts');
const clockLine = `The window opens at ${clockLabel(0)} and shuts at ${clockLabel(DEADLINE_HOURS)}, so you have ${DEADLINE_HOURS} hours.`;
if (!GUIDE.includes(clockLine)) fail(`the guide does not say "${clockLine}"`);
if (clockLabel(0) !== '11am' || clockLabel(DEADLINE_HOURS) !== '11pm' || DEADLINE_HOURS !== 12) fail(`the day runs ${clockLabel(0)} to ${clockLabel(DEADLINE_HOURS)}, ${DEADLINE_HOURS} hours; the page says twelve hours and the FAQ says the window shuts at 11pm`);
if (!failedSections.has(3)) ok('every unfinished deal collapses at the shut, none of them signs or is charged, and nothing moves after it');

/* ---------- 4. the daily and the replay ---------- */
section = 4;
console.log('4) The daily is one window per date, and a window replays from its actions');
const sig = run => JSON.stringify({
  club: run.state.clubName, b: run.startBudget, budget: run.state.budget, hour: run.hour,
  needs: run.needs.map(n => [n.label, n.min]),
  t: run.targets.map(t => [t.mp.name, t.status, t.fee ?? null, t.bonus ?? null, t.neg ? t.neg.theirAsk : null, t.lostTo ?? null]),
  s: run.sales.map(s => [s.name, s.club, s.offer, s.done]),
  g: run.grade ? [run.grade.score, run.grade.filled] : null,
});
const brief = run => JSON.stringify({ club: run.state.clubName, b: run.startBudget, needs: run.needs.map(n => [n.label, n.min]), t: run.targets.map(t => t.mp.name) });
const day = d => new Date(Date.UTC(2026, 9, 1) + d * 86400000).toISOString().slice(0, 10);
const a1 = dailyDeadlineDay('2026-10-01'), a2 = dailyDeadlineDay('2026-10-01');
if (a1.club !== a2.club || a1.seed !== a2.seed) fail('the same date gives two different dailies');
if (brief(startDeadlineDay(a1)) !== brief(startDeadlineDay(a2))) fail('the same date opens two different windows');
let sameAsYesterday = 0;
let prev = brief(startDeadlineDay(dailyDeadlineDay(day(0))));
for (let d = 1; d <= 28; d++) {
  const now = brief(startDeadlineDay(dailyDeadlineDay(day(d))));
  if (now === prev) sameAsYesterday += 1;
  prev = now;
}
if (sameAsYesterday) fail(`${sameAsYesterday} of 28 days opened the same window as the day before`);
let replays = 0, replayDiffs = 0;
const every = Math.max(1, Math.floor(starts.length / 24));
for (let i = 0; i < starts.length; i += every) {
  for (const original of [arms.desk[i], stalls[i]]) {
    const again = replayDeadlineDay(original.setup, original.actions);
    replays += 1;
    if (sig(again) !== sig(original)) {
      replayDiffs += 1;
      if (replayDiffs <= 3) console.error(`   replay differs: ${original.setup.club} seed ${original.setup.seed}`);
    }
  }
}
if (replayDiffs) fail(`${replayDiffs} of ${replays} windows rebuilt from their actions differ from the original`);
if (replays < 12) fail(`only ${replays} replays compared (floor 12)`);
console.log(`   ${replays} replays compared, ${replayDiffs} differ; 28 days, ${sameAsYesterday} repeats of the day before`);
if (!failedSections.has(4)) ok('the same date is the same window, each new day is a new one, and every window replays from its seed and actions');

/* ---------- 5. the budget ---------- */
section = 5;
console.log('5) The budget never goes negative');
/* The managers above never ask for money they do not have, so on their own
   they would hold the fence whether or not it exists. The reckless manager
   goes after the dearest man for every need and pays whatever is asked,
   fee and full terms, without once looking at the budget, which is the
   screen a player could build by typing a big number. Every one of those
   asks the club cannot cover must be refused before it costs a penny. */
let overAsks = 0;
function reckless(start) {
  let run = start;
  const tag = `${start.setup.club} seed ${start.setup.seed} reckless`;
  const order = run.targets.map((_, i) => i).sort((a, b) => sticker(run.targets[b].mp) - sticker(run.targets[a].mp) || a - b);
  const refused = new Set();
  let guard = 0;
  while (!run.grade && guard++ < 200) {
    const i = order.find(k => ['idle', 'talks', 'terms'].includes(run.targets[k].status) && !refused.has(k));
    if (i === undefined) break;
    const t = run.targets[i];
    let next = run;
    if (t.status === 'idle') next = openTalks(run, i);
    else if (t.status === 'talks') {
      const rival = rivalOn(t);
      const bid = Math.round(Math.max(t.neg.theirAsk, rival ? rival.offer + 0.1 : 0) * 10) / 10;
      if (bid > run.state.budget) overAsks += 1;
      next = placeBid(run, i, bid);
    } else {
      const want = termsWanted(run, i);
      if ((t.neg.agreedFee ?? 0) + want.bonus > run.state.budget) overAsks += 1;
      next = offerPersonalTerms(run, i, { wage: want.wage, years: want.years, bonus: want.bonus });
    }
    if (next === run) {
      refused.add(i);
      if (t.status !== 'idle') run = watch(walkFrom(run, i), tag);
      continue;
    }
    run = watch(next, tag);
  }
  if (!run.grade) run = watch(endDay(run), tag);
  return run;
}
for (const start of starts) reckless(start);
console.log(`   ${actionsRead} actions read, ${negatives} left the budget below zero${firstNegative.length ? ` (${firstNegative.join('; ')})` : ''}; the reckless manager asked for money the club did not have ${overAsks} times`);
if (negatives) fail(`${negatives} actions left the budget below zero`);
if (actionsRead < SETUPS * 10) fail(`only ${actionsRead} actions read (floor ${SETUPS * 10}), so the fence saw too little`);
if (overAsks < SETUPS * 0.5) fail(`the reckless manager overreached only ${overAsks} times (floor ${SETUPS * 0.5}), so the fence was barely tested`);
if (!failedSections.has(5)) ok('no action of any manager took the budget below zero');

/* ---------- 6. the shared engine's session state comes back ---------- */
section = 6;
console.log('6) A Club Manager save\'s registrations survive a Deadline Day');
const spec = {
  name: 'Harness Athletic', stadium: 'Harness Park', budgetTier: 'mid', leagueId: 'premier', replacedClub: '',
  crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#abcdef', initials: 'HA' }, quality: 70,
};
const overrides = { premier: [...playableClubs('premier').map(c => c.name).slice(1), 'Harness Athletic'] };
registerCustomClub(spec, undefined, 70);
registerLeagueOverrides(overrides);
const before = engineRegistrations();
if (activeCustomClub() !== spec) fail('the probe could not register its custom club');
if (!playableClubs('premier').some(c => c.name === 'Harness Athletic')) fail('the probe could not register its league override');
let probe = startDeadlineDay(setups[0]);
probe = openTalks(probe, 0);
probe = placeBid(probe, 0, Math.min(probe.state.budget, probe.targets[0].neg ? probe.targets[0].neg.theirAsk : 1));
if (probe.targets[0].status === 'terms') {
  const want = termsWanted(probe, 0);
  probe = offerPersonalTerms(probe, 0, { wage: want.wage, years: want.years, bonus: Math.min(want.bonus, Math.max(0, probe.state.budget - (probe.targets[0].neg.agreedFee ?? 0))) });
}
probe = sellPlayer(probe, 0);
probe = openTalks(probe, 1);
probe = walkFrom(probe, 1);
probe = endDay(probe);
replayDeadlineDay(setups[0], probe.actions);
dailyDeadlineDay('2026-10-01');
const after = engineRegistrations();
if (activeCustomClub() !== spec) fail(`after the day the active custom club is ${activeCustomClub()?.name ?? 'null'}, not the save's`);
if (after.overrides !== before.overrides) fail('after the day the league overrides are not the save\'s object');
if (!playableClubs('premier').some(c => c.name === 'Harness Athletic')) fail('after the day the save\'s promoted club has left its league');
if (probe.targets.some(t => t.mp.club === 'Harness Athletic') || probe.sales.some(s => s.club === 'Harness Athletic')) fail('the window carries the save\'s custom club');
if (probe.actions.length < 5) fail(`the probe made only ${probe.actions.length} actions, so it barely drove the engine`);
registerCustomClub(null);
registerLeagueOverrides(null);
if (!failedSections.has(6)) ok(`a custom club and a league override are the same objects after a start, ${probe.actions.length} actions and a replay, and the window never shows them`);

/* One terms table per window, reached by paying the ask (beating any rival)
   on the first man whose club picks up, kept only when his asking bonus
   fits, so an offer of exactly what he asks can sign him. Sections 7 and 8
   share them. */
const LIVE_ST = ['idle', 'talks', 'terms'];
const tablesOf = [];
for (const start of starts) {
  let found = null;
  for (let i = 0; i < start.targets.length && !found; i++) {
    const opened = openTalks(start, i);
    if (opened === start) continue;
    const t = opened.targets[i];
    const rival = rivalOn(t);
    const bid = Math.round(Math.max(t.neg.theirAsk, rival ? rival.offer + 0.1 : 0) * 10) / 10;
    if (bid > opened.state.budget) continue;
    const agreed = placeBid(opened, i, bid);
    if (agreed.targets[i].status !== 'terms') continue;
    const want = termsWanted(agreed, i);
    if ((agreed.targets[i].neg.agreedFee ?? 0) + want.bonus > agreed.state.budget) continue;
    found = { run: agreed, i, want };
  }
  if (found) tablesOf.push(found);
}

/* ---------- 7. the rivals ---------- */
section = 7;
console.log('7) Rival clubs take the players you leave alone');
/* Every hour that passes, every live target with a rival in for him that you
   did not push that hour is exposed, and the rules, the guide and the tips
   all say a rival closes RIVAL_CLOSE of the time. The desk and asking price
   windows are stepped through again action by action to count it. The
   review found nothing measured this: with rivals switched off every check
   stayed green. */
let exposed = 0, closedOn = 0, wrongClub = 0, lostAll = 0;
for (const arm of ['desk', 'over']) {
  arms[arm].forEach((r, idx) => {
    let cur = starts[idx];
    for (const a of r.actions) {
      const next = applyAction(cur, a);
      if (next === cur) break;
      if (a.t === 'bid' || a.t === 'terms' || a.t === 'sell') {
        const pushed = a.t === 'sell' ? null : a.i;
        cur.targets.forEach((t, j) => {
          if (j === pushed || !LIVE_ST.includes(t.status)) return;
          const on = rivalOn(t);
          if (!on) return;
          exposed += 1;
          const after = next.targets[j];
          if (after.status === 'gone') {
            closedOn += 1;
            if (after.lostTo !== on.club) wrongClub += 1;
          }
        });
      }
      cur = next;
    }
    lostAll += r.targets.filter(t => t.status === 'gone').length;
  });
}
const closeRate = exposed ? closedOn / exposed : NaN;
console.log(`   ${exposed} hours a rival was in for a man left alone, ${closedOn} closed (${fmt(100 * closeRate, 1)} percent, the rule says ${fmt(100 * RIVAL_CLOSE, 0)}); ${fmt(lostAll / (2 * starts.length), 2)} players a window lost to rivals in all`);
/* Walking away with a rival circling: at the terms table the rival lives on
   the frame, and the review found walking there never lost him. Every terms
   table above gets a rival seated on the frame, then the walk. */
let walkTables = 0, walkLost = 0;
for (const { run, i } of tablesOf) {
  const seated = { ...run, targets: run.targets.map((t, k) => (k === i ? { ...t, rival: { club: 'Harness Rovers', offer: t.neg.agreedFee ?? 1 } } : t)) };
  const walked = walkFrom(seated, i);
  walkTables += 1;
  if (walked.targets[i].status === 'gone' && walked.targets[i].lostTo === 'Harness Rovers') walkLost += 1;
}
const walkRate = walkTables ? walkLost / walkTables : NaN;
console.log(`   walking away from ${walkTables} terms tables with a rival circling lost the man ${walkLost} times (${fmt(100 * walkRate, 1)} percent; the engine's walk away rule is 60)`);
/* THRESHOLDS for section 7, see the THRESHOLDS block in section 2 for the
   streams. */
const T7 = { exposedFloor: 1000, closeLo: 0.24, closeHi: 0.36, walkLo: 0.45, walkHi: 0.78 };
if (!(exposed >= T7.exposedFloor)) fail(`only ${exposed} rival hours were exposed (floor ${T7.exposedFloor}), so rivals barely move`);
if (!(closeRate >= T7.closeLo && closeRate <= T7.closeHi)) fail(`a rival closed ${fmt(100 * closeRate, 1)} percent of the hours he was in for a man left alone (band ${100 * T7.closeLo} to ${100 * T7.closeHi}); the rules say ${fmt(100 * RIVAL_CLOSE, 0)}`);
if (wrongClub) fail(`${wrongClub} players went to a club other than the rival who was in for them`);
if (!(walkRate >= T7.walkLo && walkRate <= T7.walkHi)) fail(`walking away with a rival circling lost the man ${fmt(100 * walkRate, 1)} percent of the time (band ${100 * T7.walkLo} to ${100 * T7.walkHi}); the guide says they usually take him`);
const rivalLine = `there is a ${Math.round(100 * RIVAL_CLOSE)} percent chance they sign him`;
if (!GUIDE.includes(rivalLine)) fail(`the guide does not say "${rivalLine}"`);
if (!failedSections.has(7)) ok('rivals close at the rate the rules state on a man left alone, take him to the club that was in, and usually take him when you walk');

/* ---------- 8. the bonus is paid ---------- */
section = 8;
console.log('8) Nothing free stands in for the signing bonus');
/* Wage and length cost nothing in a one day game. Before the review fix a
   zero bonus on 1.2 times his wage signed 120 of 120 tables first time, and
   so did 99999k a week, so the bonus never had to be paid. The board now
   caps both at his ask (boardTerms). Each table hears three offers that try
   to buy the bonus off with free terms, and then exactly his ask. */
let freeTried = 0, freeSigned = 0, overCap = 0, askSigned = 0, bonusAtStake = 0;
const firstFree = [];
for (const { run, i, want } of tablesOf) {
  const offers = [
    { wage: Math.ceil(want.wage * 1.2), years: want.years, bonus: 0 },
    { wage: 99999, years: 6, bonus: 0 },
    { wage: Math.ceil(want.wage * 1.6), years: 6, bonus: Math.floor(want.bonus * 5) / 10 },
  ];
  for (const o of offers) {
    const x = offerPersonalTerms(run, i, o);
    freeTried += 1;
    if (x.targets[i].status === 'signed') {
      freeSigned += 1;
      bonusAtStake += want.bonus - o.bonus;
      if (firstFree.length < 3) firstFree.push(`${run.targets[i].mp.name}: ${o.wage}k, ${o.years}y, bonus ${o.bonus} against ${want.wage}k, ${want.years}y, ${want.bonus}`);
    }
    const a = x.actions[x.actions.length - 1];
    if (x !== run && a && a.t === 'terms' && (a.wage > want.wage || a.years > want.years)) overCap += 1;
  }
  if (offerPersonalTerms(run, i, { wage: want.wage, years: want.years, bonus: want.bonus }).targets[i].status === 'signed') askSigned += 1;
}
console.log(`   ${tablesOf.length} terms tables, ${freeTried} offers trading the bonus for free terms, ${freeSigned} signed${firstFree.length ? ` (${firstFree.join('; ')})` : ''}, ${fmt(bonusAtStake, 1)}m of bonus dodged; ${overCap} recorded over his ask; exactly his ask signed ${askSigned}`);
if (tablesOf.length < starts.length * 0.5) fail(`only ${tablesOf.length} terms tables were reached (floor ${starts.length * 0.5})`);
if (freeSigned) fail(`${freeSigned} offers signed a man without his bonus by paying in wage or length, which cost nothing today`);
if (overCap) fail(`${overCap} offers were recorded above his asking wage or length`);
if (askSigned < tablesOf.length * 0.95) fail(`exactly his ask signed only ${askSigned} of ${tablesOf.length} tables, so the tables were not signable`);
if (!failedSections.has(8)) ok('no wage or length buys off the bonus, nothing over his ask is recorded, and his ask still signs him');

/* ---------- 9. the worked example is the engine's ---------- */
section = 9;
console.log('9) The worked example on the rules screen and in the guide is what the engine plays');
/* The example is the 2026-10-01 daily, played: call the cheapest keeper, bid
   3.1, bid 3.3, offer exactly his ask. Every number the copy quotes is
   rebuilt here from the engine and looked for in the copy, so an engine
   change under it (three other branches edit clubManager.ts) turns this red
   instead of leaving the copy wrong. The grade paragraph's arithmetic is the
   engine's too. */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const clockWord = h => (clockLabel(h) === '12pm' ? 'noon' : clockLabel(h));
const exDay = dailyDeadlineDay('2026-10-01');
let ex = startDeadlineDay({ club: exDay.club, seed: exDay.seed, daily: exDay.daily });
const exNeeds = ex.needs.map(n => `a ${slotWord(n.label)}`);
const needsPhrase = exNeeds.length > 1 ? `${exNeeds.slice(0, -1).join(', ')} and ${exNeeds[exNeeds.length - 1]}` : exNeeds.join('');
const keeperIdx = ex.targets.findIndex(t => t.need === 0);
const keeper = ex.targets[keeperIdx];
const keeperNeed = ex.needs[0];
const pageWant = [], guideWant = [];
let gradeLine = 'the grade paragraph was not reached';
if (!keeper || keeperNeed.label !== 'GK') fail(`the example's first need is ${keeperNeed?.label}, not a goalkeeper`);
else {
  const desk = deskRead(ex, keeperIdx);
  ex = openTalks(ex, keeperIdx);
  const ask0 = ex.targets[keeperIdx].neg?.theirAsk;
  ex = placeBid(ex, keeperIdx, 3.1);
  const afterFirst = ex.targets[keeperIdx];
  const ask1 = afterFirst.neg?.theirAsk;
  const hour1 = ex.hour;
  ex = placeBid(ex, keeperIdx, 3.3);
  if (ex.targets[keeperIdx].status !== 'terms') fail(`a bid of 3.3 left the keeper ${ex.targets[keeperIdx].status}, the example says the fee is agreed`);
  const want = termsWanted(ex, keeperIdx);
  if (want) ex = offerPersonalTerms(ex, keeperIdx, { wage: want.wage, years: want.years, bonus: want.bonus });
  if (ex.targets[keeperIdx].status !== 'signed') fail(`the example's keeper is ${ex.targets[keeperIdx].status} after his ask, not signed`);
  if (afterFirst.status !== 'talks' || !(ask1 < ask0)) fail(`a bid of 3.1 did not bring the ask down (${ask0} to ${ask1}, ${afterFirst.status})`);
  const spent = hoursUsed(ex), left = hoursLeft(ex);
  /* The dearest keeper the rival took while you were on the phone. */
  const dear = ex.targets.map((t, k) => ({ t, k })).filter(x => x.t.need === 0).sort((a, b) => b.t.mp.price - a.t.mp.price)[0];
  const moved = [...ex.ticker].reverse().find(l => l.text.includes(`move for ${dear.t.mp.name}`));
  const signedBy = [...ex.ticker].reverse().find(l => l.text.includes(`complete the signing of ${dear.t.mp.name}`));
  if (dear.t.status !== 'gone' || !moved || !signedBy) fail(`the dearest keeper, ${dear.t.mp.name}, is ${dear.t.status} after the keeper is signed; the guide says a rival took him`);
  pageWant.push(
    `Say the board want ${needsPhrase} and leave you ${money(ex.startBudget)}.`,
    `a keeper listed at ${money(keeper.mp.price)} and his club want ${money(ask0)}`,
    `worth ${money(desk.low)} to ${money(desk.high)}, so you bid ${money(3.1)}`,
    `They come down to ${money(ask1)}`,
    `His agent wants ${want?.years} years at ${want?.wage}k a week and a ${money(want?.bonus ?? 0)} signing bonus`,
    `That is ${WORDS[spent]} hours gone and ${money(ex.state.budget)} left, with ${WORDS[left]} hours to find the other ${WORDS[ex.needs.length - 1]}.`,
  );
  /* The grade paragraph: the keeper's real value, his share of the value
     points, and the rest as the paragraph assumes it (the other three at the
     same share, 1m left). */
  const fee = 3.3, value = keeper.mp.value ?? keeper.mp.price;
  const share = valueShare(fee, value);
  const overPct = Math.round((fee / value - 1) * 100);
  const vp = VALUE_POINTS * share;
  const bp = BUDGET_POINTS * (1 / ex.startBudget);
  const total = Math.round(NEEDS_POINTS + vp + bp);
  const letter = letterFor(total);
  const article = /^[AEF]/.test(letter) ? 'an' : 'a';
  /* The same window graded by gradeWindow itself rather than by the sum
     above: the keeper as signed, the first man for every other need signed at
     10 percent over his value, and 1m left. A grade formula that moved (the
     curve control bends the budget points) leaves the paragraph's sum and
     the engine's grade apart. */
  const assumed = {
    ...ex,
    state: { ...ex.state, budget: 1 },
    targets: ex.targets.map((t, k) => (t.need !== 0 && ex.targets.findIndex(x => x.need === t.need) === k
      ? { ...t, status: 'signed', fee: (t.mp.value ?? t.mp.price) * 1.1 }
      : t)),
  };
  const eg = gradeWindow(assumed);
  gradeLine = `the guide's sum is ${total} (${letter}) and gradeWindow grades that window ${eg.score} (${eg.letter}: needs ${eg.needsPts}, value ${eg.valuePts}, budget ${eg.budgetPts})`;
  if (eg.filled !== ex.needs.length || eg.needsPts !== NEEDS_POINTS || Math.abs(eg.valuePts - vp) > 0.05 || Math.abs(eg.budgetPts - bp) > 0.05 || eg.score !== total || eg.letter !== letter) {
    fail(`the guide's grade paragraph sums to ${total} (${letter}), but gradeWindow grades that window ${eg.score} (${eg.letter}): needs ${eg.needsPts} of ${NEEDS_POINTS}, value ${eg.valuePts} against ${fmt(vp, 1)}, budget ${eg.budgetPts} against ${fmt(bp, 1)}, ${eg.filled} of ${ex.needs.length} needs filled`);
  }
  guideWant.push(
    `needs ${needsPhrase}, and the board have left you ${money(ex.startBudget)}.`,
    `His club are asking ${money(ask0)}, your desk says he is worth ${money(desk.low)} to ${money(desk.high)}, and you bid ${money(3.1)}. That is a counter: they come down to ${money(ask1)} and one round of patience is gone. It is ${clockWord(hour1)}.`,
    `His agent wants ${want?.years} years at ${want?.wage}k a week and a ${money(want?.bonus ?? 0)} bonus. You offer exactly that and he signs. It is ${clockWord(spent)} and you have ${money(ex.state.budget)} left.`,
    `came in for the dearest keeper on your list at ${clockWord(moved?.hour ?? -1)} and signed him at ${clockWord(signedBy?.hour ?? -1)}.`,
    `The keeper cost ${money(fee)} for a ${money(value)} player, ${overPct} percent over his real worth, which keeps ${Math.round(share * 100)} percent of his share of the value points`,
    `That is ${NEEDS_POINTS} for needs, ${fmt(vp, 0)} for value and, with ${money(1)} of the ${money(ex.startBudget)} left, ${fmt(bp, 1)} for budget: ${total} out of 100, ${article} ${letter}.`,
  );
}
const missingPage = pageWant.filter(s => !PAGE_SRC.includes(s));
const missingGuide = guideWant.filter(s => !GUIDE.includes(s));
for (const s of missingPage) fail(`the rules screen's example does not say what the engine plays: "${s}"`);
for (const s of missingGuide) fail(`the guide's example does not say what the engine plays: "${s}"`);
console.log(`   ${pageWant.length} figures on the rules screen and ${guideWant.length} in the guide checked against the 2026-10-01 daily (${exDay.club}), ${missingPage.length + missingGuide.length} differ; ${gradeLine}`);
if (!failedSections.has(9)) ok('every figure in both worked examples is what the engine plays on the 2026-10-01 daily, and the grade adds up');

/* ---------- verdict ---------- */
fs.rmSync(TMP, { recursive: true, force: true });
if (CONTROL) {
  const want = PREDICTED[CONTROL];
  console.log(`\ncontrol ${CONTROL}: sections red ${[...failedSections].sort().join(', ') || 'none'}; predicted ${want}`);
  if (failedSections.has(want)) { console.log('the control fired: the check can fail'); process.exit(1); }
  console.error('the control did NOT fire: the check proves nothing');
  process.exit(2);
}
if (failures) {
  console.error(`\nsimDeadlineDay: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimDeadlineDay: green. The brief is real, the desk pays, the clock binds, the daily is one window a day, the budget holds, a Club Manager save keeps its registrations, rivals close at the stated rate, the bonus is paid and the worked examples are what the engine plays.');
