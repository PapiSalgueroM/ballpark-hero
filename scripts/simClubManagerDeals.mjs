/*
 * Round 506 harness: the deal desk. A fee agreed is the middle of a transfer
 * now rather than the end of one, and the six things his sentence asked for
 * that Round 161 had not already built are all measurable here.
 *
 * Round 506, and the defects and absences it was born from, each measured
 * against the SHIPPED engine before any of this existed:
 *
 *  - NO FOG AT ALL. askingPrice and marketBase are pure and cached across
 *    careers and the transfer screen printed money(m.value) verbatim, so every
 *    manager saw every fee to the decimal whoever was running his recruitment.
 *    The only accuracy layer in the whole game was reportBand on a youth
 *    prospect's ceiling.
 *  - NO NUMBER LOW ENOUGH TO END A CONVERSATION. An insult was anything under
 *    0.75 of the ask and cost exactly one patience. His "extreme lowballs can
 *    end talks entirely" had no code behind it.
 *  - HAGGLING WAS FREE, and this is the defect rather than the absence.
 *    Patience was spent ONLY on the lowball branch while the counter branch
 *    floored the ask at 1.02 of your package against an agree line of 0.97, so
 *    repeating one unchanged offer closed any non-lowball deal in at most three
 *    rounds at no cost whatever. Section 3 measures exactly that.
 *  - NO PERSONAL TERMS. completeSigning hard coded four years (two at 31 plus),
 *    took the wage from wageFor, and left role undefined so ensureRoles quietly
 *    decided later what you had supposedly promised him. The word wage did not
 *    appear once in TransferScreen.tsx.
 *  - A LOAN WAS A FEE AND A SEASON. No option to buy, no release figure, and
 *    onLoan was a bare boolean that did not record who owned him.
 *
 * Sections:
 *  1. The valuation band. It must ALWAYS contain the truth (a weak desk is
 *     imprecise, never wrong signed), it must be stable when read again (a band
 *     that redrew itself could be averaged back to the truth by reopening the
 *     panel), and it must narrow with the lead scout's level. Measured as the
 *     mean width as a share of value at level 1 against level 10 over the whole
 *     market, which is the strongest signal available rather than the most
 *     descriptive one.
 *  2. The walkout. Offers are swept from 0.30 to 1.00 of the ask and each
 *     verdict is counted, so the section reads the whole curve rather than one
 *     side of a threshold. Under the walkout line the talks must end AND he
 *     must go cold; over it they must not.
 *  3. Patience binds. One walker repeats a single unchanged offer at 0.80 of
 *     the opening ask until the deal closes or dies, which is precisely the
 *     free lunch the old engine served. The share of deals that close this way
 *     is the measurement.
 *  4. Nobody signs on the fee alone. After an agreeing offer the squad, the
 *     budget and seasonSignings must all be untouched and a terms table must be
 *     open. offerTerms is the only thing in the file that can sign anybody.
 *  5. Personal terms. His own asking sheet always closes; a sheet far under it
 *     ends the meeting; the length, the wage and the rung that were agreed are
 *     the ones written onto the player, not wageFor and not four years.
 *  6. Loans carry the two figures. The option makes him permanent for the
 *     figure agreed on arrival, the release figure sends him home early, and
 *     both are refused outside a window.
 *  7. The old paths are untouched. buyPlayer, payClause and a bare loan still
 *     produce the player they always produced.
 *
 * Negative controls (house rule: prove the checks can fail):
 *   CM_DEALS_CONTROL=nofog       pins the widest band to the exact one, so
 *                                section 1 cannot tell level 1 from level 10.
 *   CM_DEALS_CONTROL=nowalkout   drops the walkout line to zero, so section 2
 *                                finds no offer that ends a conversation.
 *   CM_DEALS_CONTROL=freehaggle  makes a counter cost no patience again, the
 *                                exact shipped behaviour, so section 3 goes back
 *                                to closing nearly every repeated offer.
 *   CM_DEALS_CONTROL=nohandoff   leaves the phase on the fee table after the
 *                                clubs agree, so section 4 finds no terms table.
 *   CM_DEALS_CONTROL=freeterms   drops the terms walkout line to zero, so
 *                                section 5 cannot make an agent leave.
 * Each control refuses to run if its rewrite did not find its text.
 *
 * MEASURED BANDS. Measured 2026-09-08 on the default seed and SIM_SEED 1, 2 and
 * 3 with the engine fixed, and again with each control on. Every threshold sits
 * between the two bands rather than beside either.
 *
 *   metric                                fixed band     control band        threshold
 *   band contains the truth, level 1      100%           100%   (nofog)      floor 100%
 *   band contains the truth, level 10     100%           100%   (nofog)      floor 100%
 *   mean band width, lead scout level 1   29.5 to 29.7%  0.0%   (nofog)      floor 15%
 *   mean band width, lead scout level 10  0.0% on all 4  0.0%   (nofog)      ceiling 6%
 *   fee agreements reaching the terms     12 of 12       n/a                 floor 10
 *   offers at or under 0.50 ending talks  72 of 72       0 of 72 (nowalkout) floor all
 *   offers at or over 0.80 ending talks   0 of 96        0 of 96             ceiling none
 *   repeating 0.76 of the ask: agreed     0 on all 4     see below           none needed
 *   repeating 0.76 of the ask: ran dry    9 to 16 of 30  0 (freehaggle)      see sweep
 *   repeating 0.84 of the ask: agreed     3 to 7 of 30   30     (freehaggle) none needed
 *   repeating 0.88 of the ask: agreed     14 to 19 of 30 30     (freehaggle) none needed
 *   repeating 0.92 of the ask: ran dry    0 on all 4     0                   none needed
 *   deals patience killed across a sweep  23 to 45       0      (freehaggle) floor 1
 *   deals that still closed in a sweep    37 to 40       150    (freehaggle) floor 1
 *   terms: his own sheet closes           12 of 12       12 of 12            floor all
 *   terms: a half sheet ends the meeting  12 of 12       0      (freeterms)  floor 80%
 *
 * The shape of the sweep is the point, and it is monotone on every seed: 0.76
 * never lands, 0.84 comes down to how patient this seller happened to be, and
 * 0.88 and over always land. The assertion is on the SHAPE (something dies
 * somewhere, something still closes, and pitching lower is riskier than
 * pitching higher) rather than on any single count, because the counts move
 * with the seed and a threshold sitting inside that movement is a coin toss
 * dressed as a rule.
 *
 * Hijacks are printed rather than asserted on. A rival takes the player in 8 to
 * 22 of 30 runs depending on the seed, and that is Round 71's mechanic doing
 * its job while a repeated offer sits there, not anything this round changed.
 *
 * The run prints every count, so a section cannot pass empty.
 *
 * Run: node scripts/simClubManagerDeals.mjs
 */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/cmDeals.entry.mjs`;
const BUNDLE = `${TMP}/cmDeals.bundle.mjs`;

const CONTROL = process.env.CM_DEALS_CONTROL || '';
const KNOWN = ['nofog', 'nowalkout', 'freehaggle', 'nohandoff', 'freeterms'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`CM_DEALS_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

/*
 * A control rewrites the engine source IN MEMORY and never on disk. The
 * worktree checks out CRLF and the anchors below are written LF, so the read is
 * normalised first. Each rewrite asserts its target is present before it runs:
 * a control that silently changes nothing is a control that reports green for
 * the wrong reason, which is the failure CLAUDE.md's negative control rule
 * exists to stop.
 */
const DEALS_PATH = `${ROOT}/src/lib/clubManagerDeals.ts`;
const ENGINE_PATH = `${ROOT}/src/lib/clubManager.ts`;
let enginePath = ENGINE_PATH;
/* The sections read the deal desk's own exports directly, so under a control
   they must read the REWRITTEN copy rather than the shipped one. */
let dealsPath = DEALS_PATH;

if (CONTROL) {
  let deals = fs.readFileSync(DEALS_PATH, 'utf8').replaceAll('\r\n', '\n');
  let engine = fs.readFileSync(ENGINE_PATH, 'utf8').replaceAll('\r\n', '\n');
  const swap = (src, from, to, where) => {
    if (!src.includes(from)) {
      console.error(`control cannot run: ${where} is not in the shape CM_DEALS_CONTROL=${CONTROL} rewrites`);
      console.error(`  looked for: ${from}`);
      process.exit(1);
    }
    return src.replace(from, to);
  };
  if (CONTROL === 'nofog') {
    deals = swap(deals, 'export const VALUATION_SPREAD_MAX = 0.3;', 'export const VALUATION_SPREAD_MAX = 0.02;', 'clubManagerDeals.ts');
  } else if (CONTROL === 'nowalkout') {
    deals = swap(deals, 'export const WALKOUT_RATIO = 0.55;', 'export const WALKOUT_RATIO = 0;', 'clubManagerDeals.ts');
  } else if (CONTROL === 'freehaggle') {
    deals = swap(deals, "  if (verdict === 'counter') return 1;", "  if (verdict === 'counter') return 0;", 'clubManagerDeals.ts');
  } else if (CONTROL === 'freeterms') {
    deals = swap(deals, 'export const TERMS_WALKOUT = 0.62;', 'export const TERMS_WALKOUT = 0;', 'clubManagerDeals.ts');
  } else if (CONTROL === 'nohandoff') {
    engine = swap(engine, "    next.phase = 'terms';", "    next.phase = 'fee';", 'clubManager.ts');
  }
  const dealsCopy = `${TMP}/cmDeals.control.deals.ts`;
  fs.writeFileSync(dealsCopy, deals);
  dealsPath = dealsCopy;
  /* The engine copy must point at the rewritten deals file rather than the real
     one, so the import is made explicit instead of relying on alias precedence. */
  engine = swap(engine, "} from '@/lib/clubManagerDeals';", `} from '${dealsCopy}';`, 'clubManager.ts (the deals import)');
  const engineCopy = `${TMP}/cmDeals.control.engine.ts`;
  fs.writeFileSync(engineCopy, engine);
  enginePath = engineCopy;
}

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${enginePath.replaceAll('\\', '/')}');
const deals = await import('${dealsPath.replaceAll('\\', '/')}');
const staff = await import('${ROOT_URL}/src/lib/clubManagerStaff.ts');
export const cm = mod;
export const dealsMod = deals;
export const staffMod = staff;
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);

const { cm, dealsMod, staffMod } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, buildMarket, startNegotiation, makeOffer, offerTerms,
  buyPlayer, payClause, releaseClauseOf, loanIn, loanEligible, loanFeeOf,
  exerciseLoanOption, breakLoan, wageFor,
} = cm;
/* The desk's own maths lives in its own module, so it is read from there. */
const { valuationBand, valuationSpread } = dealsMod;
const { staffLevel, ensureStaff } = staffMod;

for (const [name, fn] of Object.entries({
  startCareer, buildMarket, startNegotiation, makeOffer, offerTerms, buyPlayer,
  payClause, releaseClauseOf, loanIn, loanEligible, loanFeeOf, exerciseLoanOption,
  breakLoan, wageFor, valuationBand, valuationSpread, staffLevel, ensureStaff,
})) {
  if (typeof fn !== 'function') {
    console.error(`the harness could not reach ${name}; the bundle is not the shape it expects`);
    process.exit(1);
  }
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const pct = (n, d) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

/** A fresh career with an open summer window. */
function fresh(club = 'Aston Villa') {
  return startCareer(club);
}

/**
 * Put a named level in the lead scout's chair, leaving the block valid.
 *
 * startCareer does NOT build a staff block (only loadCareer, playNextEntry and
 * startNextSeason run ensureStaff), so a fresh career has state.staff
 * undefined. Setting a scout onto undefined produces a block with no version
 * and no other posts, isValidStaff fails closed on it, and staffOf silently
 * hands back defaultStaff, whose scout sits on level 6. That is why this
 * repairs the block first: without it every level reads 6 and the section
 * measures nothing while looking green.
 */
function withScoutLevel(state, level) {
  const s = { ...state };
  ensureStaff(s);
  s.staff = { ...s.staff };
  s.staff.scout = {
    id: `scout-test-${level}`,
    name: 'Test Scout',
    level,
    potential: Math.max(level, 10),
    wage: 10,
    since: s.season,
    academy: false,
  };
  return s;
}

/**
 * Open a negotiation on a real target this club can actually afford.
 *
 * The band was a fixed 12 to 45 against a ceiling of 80 percent of the budget,
 * which is unsatisfiable at a club with 11m: Sevilla opened 0 deals out of 8
 * every time, so a third of section 4's attempts were structurally dead rather
 * than seed noise, and its floor of 8 was sitting exactly on a measurement of
 * 8. The band is relative to what the club has now, so a poorer club still
 * finds somebody and every attempt can produce a sample.
 */
function openDeal(state, lo, hi) {
  const market = buildMarket(state);
  const top = Math.min(hi ?? 45, Math.max(1, state.budget * 0.8));
  const bottom = Math.min(lo ?? 12, Math.max(0.5, top * 0.4));
  const target = market.find(m => m.price >= bottom && m.price <= top && !m.generated);
  if (!target) return null;
  const opened = startNegotiation(state, target);
  if (!opened || !opened.negotiation) return null;
  return { state: opened, target };
}

/* ---------- 1. The valuation band ---------- */
console.log('1) Your recruitment desk reads a fee, and a better one reads it tighter');
{
  const base = fresh();
  const market = buildMarket(base).filter(m => m.value !== undefined).slice(0, 400);
  if (market.length < 100) fail(`only ${market.length} valued players on the market to read`);

  const widthAt = level => {
    const s = withScoutLevel(base, level);
    if (staffLevel(s, 'scout') !== level) {
      fail(`the harness could not seat a level ${level} lead scout (staffLevel reads ${staffLevel(s, 'scout')})`);
    }
    let contains = 0;
    let widthSum = 0;
    for (const m of market) {
      const read = valuationBand(s, m);
      const truth = m.value ?? m.price;
      if (read.low <= truth + 1e-9 && read.high >= truth - 1e-9) contains += 1;
      widthSum += (read.high - read.low) / Math.max(0.1, truth);
      /* Read again: a band that moves between reads can be averaged away. */
      const again = valuationBand(s, m);
      if (again.low !== read.low || again.high !== read.high) {
        fail(`${m.name}: the band moved between two reads (${read.low}-${read.high} then ${again.low}-${again.high})`);
        break;
      }
    }
    return { contains, mean: widthSum / market.length };
  };

  const one = widthAt(1);
  const ten = widthAt(10);
  console.log(`   ${market.length} players read: level 1 mean width ${(one.mean * 100).toFixed(1)}% of value, level 10 ${(ten.mean * 100).toFixed(1)}%`);
  console.log(`   the truth was inside the band ${pct(one.contains, market.length)}% of the time at level 1 and ${pct(ten.contains, market.length)}% at level 10`);
  console.log(`   spread at level 1 ${valuationSpread(withScoutLevel(base, 1)).toFixed(3)}, at level 10 ${valuationSpread(withScoutLevel(base, 10)).toFixed(3)}`);

  if (one.contains !== market.length) fail(`a level 1 read excluded the truth on ${market.length - one.contains} players; the band must always contain it`);
  if (ten.contains !== market.length) fail(`a level 10 read excluded the truth on ${market.length - ten.contains} players`);
  if (one.mean < 0.15) fail(`a level 1 desk read to ${(one.mean * 100).toFixed(1)}% of value, under the floor of 15%; see the header for the measured bands`);
  if (ten.mean > 0.06) fail(`a level 10 desk read to ${(ten.mean * 100).toFixed(1)}% of value, over the ceiling of 6%; see the header for the measured bands`);
  if (one.mean <= ten.mean) fail('a better lead scout did not read the market any tighter');
}

/* ---------- 2. The walkout ---------- */
console.log('2) An extreme lowball ends the conversation, a merely low one does not');
{
  const steps = [0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00];
  const rows = [];
  for (const mult of steps) {
    let ended = 0;
    let cold = 0;
    let tried = 0;
    for (let i = 0; i < 24; i++) {
      const opened = openDeal(fresh(i % 2 ? 'Aston Villa' : 'Napoli'));
      if (!opened) continue;
      const st = opened.state;
      const ask = st.negotiation.theirAsk;
      const after = makeOffer(st, ask * mult);
      if (!after) { fail(`makeOffer refused ${mult} of the ask on an open table`); continue; }
      tried += 1;
      if (after.negotiation.status === 'collapsed') {
        ended += 1;
        if ((after.coldNames ?? []).includes(st.negotiation.player.name)) cold += 1;
      }
    }
    rows.push({ mult, tried, ended, cold });
    console.log(`   ${(mult * 100).toFixed(0)}% of the ask: ${ended}/${tried} ended the talks on the spot, ${cold} went cold`);
  }
  const low = rows.filter(r => r.mult <= 0.5);
  const high = rows.filter(r => r.mult >= 0.8);
  const lowTried = low.reduce((n, r) => n + r.tried, 0);
  const lowEnded = low.reduce((n, r) => n + r.ended, 0);
  const lowCold = low.reduce((n, r) => n + r.cold, 0);
  const highTried = high.reduce((n, r) => n + r.tried, 0);
  const highEnded = high.reduce((n, r) => n + r.ended, 0);
  if (lowTried < 24) fail(`only ${lowTried} lowball offers were made, too few to read`);
  if (lowEnded !== lowTried) fail(`${lowEnded} of ${lowTried} offers at half the ask or under ended the talks; the floor is all of them`);
  if (lowCold !== lowEnded) fail(`${lowEnded} walkouts produced only ${lowCold} cold names; a walkout must close the window on him`);
  if (highEnded !== 0) fail(`${highEnded} of ${highTried} offers at 80% of the ask or over ended the talks; the ceiling is none of them`);
}

/* ---------- 3. Patience binds ---------- */
console.log('3) Repeating one offer no longer closes a deal for free');
{
  /* The exact free lunch the shipped engine served: pick a number under the
     agree line but over the insult line, and send it again and again. The old
     counter branch floored the ask at 1.02 of the package, so the gap closed by
     0.45 a round and the deal landed in at most three rounds having cost
     nothing. */
  /*
   * Swept rather than measured at one number, because the interesting thing is
   * the LINE: how high you have to pitch a repeated offer before patience stops
   * being the binding constraint. On the shipped engine there was no such line
   * at all, since a counter cost nothing and the ask closed 55 percent of the
   * gap every round, so every one of these multiples landed.
   *
   * A rival hijack is counted rather than dropped. The rival branch returns
   * before the patience code on purpose (you cannot be punished for a number
   * while somebody else is ahead of it), so those runs end another way and
   * would otherwise vanish out of the arithmetic.
   */
  const MULTS = [0.76, 0.80, 0.84, 0.88, 0.92];
  const RUNS = 40;
  let totalDied = 0;
  let totalClosed = 0;
  const curve = [];
  for (const mult of MULTS) {
    let closed = 0;
    let died = 0;
    let hijacked = 0;
    let stuck = 0;
    let rounds = 0;
    let openedRuns = 0;
    for (let i = 0; i < RUNS; i++) {
      const opened = openDeal(fresh(['Aston Villa', 'Napoli', 'Sevilla', 'Ajax'][i % 4]));
      if (!opened) continue;
      openedRuns += 1;
      let s = opened.state;
      const bid = s.negotiation.theirAsk * mult;
      let n = 0;
      while (s.negotiation && s.negotiation.status === 'open' && s.negotiation.phase !== 'terms') {
        n += 1;
        if (n > 30) { stuck += 1; break; }
        const next = makeOffer(s, bid);
        if (!next) { fail('makeOffer refused an open table mid repeat'); break; }
        s = next;
      }
      rounds += n;
      const neg = s.negotiation;
      if (neg && neg.phase === 'terms') closed += 1;
      else if (neg && neg.status === 'collapsed') died += 1;
      else if (neg && neg.status === 'hijacked') hijacked += 1;
    }
    const resolved = closed + died + hijacked + stuck;
    curve.push({ mult, closed, died, hijacked, stuck, resolved });
    totalDied += died;
    totalClosed += closed;
    console.log(`   ${(mult * 100).toFixed(0)}% repeated: ${closed} agreed, ${died} ran out of patience, ${hijacked} hijacked, ${stuck} never resolved, of ${resolved} (mean ${(rounds / Math.max(1, resolved)).toFixed(1)} rounds)`);
    if (stuck > 0) fail(`${stuck} negotiations never resolved in 30 rounds at ${mult} of the ask`);
    /* Not every club offers a target in the price band on every seed, so the
       denominator is the deals that actually opened, not the attempts. */
    if (resolved !== openedRuns) fail(`${openedRuns} deals opened at ${mult} of the ask but only ${resolved} reached an end state`);
    if (openedRuns < RUNS * 0.5) fail(`only ${openedRuns} of ${RUNS} attempts opened a deal at ${mult} of the ask`);
  }
  const lowest = curve[0];
  const highest = curve[curve.length - 1];
  console.log(`   patience killed ${totalDied} deals across the sweep and ${totalClosed} still closed`);
  if (totalDied === 0) {
    fail('no repeated offer anywhere in the sweep ran the seller out of patience; haggling is still free');
  }
  if (lowest.died <= highest.died) {
    fail(`repeating ${lowest.mult} of the ask killed ${lowest.died} deals and repeating ${highest.mult} killed ${highest.died}; pitching lower must be the riskier thing to do`);
  }
  if (totalClosed === 0) fail('no repeated offer closed anywhere in the sweep; patience now binds too hard to buy anybody');
}

/* ---------- 4. Nobody signs on the fee alone ---------- */
console.log('4) The clubs agreeing signs nobody');
{
  let checked = 0;
  for (let i = 0; i < 12; i++) {
    const opened = openDeal(fresh(['Aston Villa', 'Napoli', 'Sevilla'][i % 3]));
    if (!opened) continue;
    const st = opened.state;
    const ask = st.negotiation.theirAsk;
    const after = makeOffer(st, ask);
    if (!after) { fail('makeOffer refused a full ask'); continue; }
    const neg = after.negotiation;
    if (neg.phase !== 'terms') { fail(`meeting the ask left the phase on ${neg.phase}`); continue; }
    checked += 1;
    if (!neg.terms) fail('the terms table opened with no sheet on it');
    if (after.squad.length !== st.squad.length) fail('the squad changed on the fee alone');
    if (after.squad.some(p => p.name === neg.player.name)) fail(`${neg.player.name} joined on the fee alone`);
    if (after.budget !== st.budget) fail(`the budget moved from ${st.budget} to ${after.budget} on the fee alone`);
    if (after.seasonSignings.length !== st.seasonSignings.length) fail('a signing was recorded on the fee alone');
    /* And the fee table is shut: an offer made now must be refused outright. */
    if (makeOffer(after, ask * 1.5) !== null) fail('the fee table took another offer after the clubs had agreed');
  }
  console.log(`   ${checked} fee agreements checked, none of them signed anybody`);
  /* Floor 10 against a measurement of 12 on the default seed and SIM_SEED 1 to
     3. It was 8 against a measurement of 8, which is no headroom at all, and a
     third of the attempts could never produce a sample because the price band
     was unsatisfiable at a poor club. Both halves of that are fixed. */
  if (checked < 10) fail(`only ${checked} fee agreements reached the terms table, floor 10`);
}

/* ---------- 5. Personal terms ---------- */
console.log('5) His terms are a negotiation, and what is agreed is what is written down');
{
  let sheetClosed = 0;
  let sheetTried = 0;
  let halfEnded = 0;
  let halfTried = 0;
  let roleKept = 0;
  for (let i = 0; i < 16; i++) {
    const opened = openDeal(fresh(['Aston Villa', 'Napoli', 'Sevilla', 'Ajax'][i % 4]));
    if (!opened) continue;
    const st = opened.state;
    const feeAgreed = makeOffer(st, st.negotiation.theirAsk);
    if (!feeAgreed || feeAgreed.negotiation.phase !== 'terms') continue;
    const want = feeAgreed.negotiation.terms.want;

    /* His own sheet, with the bonus trimmed to what the budget can carry. */
    const room = Math.max(0, Math.round((feeAgreed.budget - (feeAgreed.negotiation.agreedFee ?? 0)) * 10) / 10);
    if (want.bonus <= room) {
      sheetTried += 1;
      const done = offerTerms(feeAgreed, want);
      if (done && done.negotiation.status === 'agreed') {
        sheetClosed += 1;
        const p = done.squad.find(x => x.name === feeAgreed.negotiation.player.name);
        if (!p) fail('he agreed his own terms and never arrived');
        else {
          if (p.contractYears !== want.years) fail(`agreed ${want.years} years, the player carries ${p.contractYears}`);
          if (p.wage !== want.wage) fail(`agreed ${want.wage}k a week, the player carries ${p.wage}k`);
          if (p.role !== want.role) fail(`promised ${want.role}, the player carries ${p.role}`);
          else roleKept += 1;
          if (!p.signedTerms) fail('the signed terms were not written onto the player');
        }
      } else {
        fail(`his own asking sheet was refused (status ${done?.negotiation?.status})`);
      }
    }

    /* Half of everything, one rung down: his agent should end the meeting. */
    halfTried += 1;
    const half = {
      years: Math.max(2, Math.round(want.years / 2)),
      wage: Math.max(1, Math.round(want.wage * 0.4)),
      bonus: 0,
      role: 'backup',
    };
    const bad = offerTerms(feeAgreed, half);
    if (bad && bad.negotiation.status === 'collapsed') halfEnded += 1;
  }
  console.log(`   ${sheetClosed}/${sheetTried} deals closed on his own asking sheet, and the rung promised was the rung recorded on ${roleKept} of them`);
  console.log(`   ${halfEnded}/${halfTried} agents ended the meeting over a half sheet a rung down`);
  if (sheetTried < 6) fail(`only ${sheetTried} affordable asking sheets were reachable`);
  if (sheetClosed !== sheetTried) fail(`${sheetTried - sheetClosed} asking sheets were refused; his own numbers must close`);
  if (pct(halfEnded, halfTried) < 80) fail(`only ${pct(halfEnded, halfTried)}% of half sheets ended the meeting, under the floor of 80%`);
}

/* ---------- 6. Loans carry the two figures ---------- */
console.log('6) A loan carries an option to buy and a release figure');
{
  let taken = 0;
  let bought = 0;
  let sentBack = 0;
  for (let i = 0; i < 10; i++) {
    let s = fresh(['Aston Villa', 'Napoli', 'Sevilla'][i % 3]);
    const market = buildMarket(s).filter(m => loanEligible(s, m) && loanFeeOf(m) < s.budget * 0.2);
    const mp = market[i % Math.max(1, market.length)];
    if (!mp) continue;
    const after = loanIn(s, mp);
    if (!after) continue;
    taken += 1;
    const p = after.squad.find(x => x.name === mp.name);
    if (!p) { fail('a loan signing never arrived'); continue; }
    if (!p.onLoan) fail(`${p.name} arrived on loan without the flag`);
    if (p.loanFrom !== mp.club) fail(`${p.name} does not know he belongs to ${mp.club} (has ${p.loanFrom})`);
    if (p.loanOptionFee === undefined) fail(`${p.name} arrived with no option to buy`);
    if (p.loanBreakFee === undefined) fail(`${p.name} arrived with no release figure`);
    if (p.loanOptionFee !== undefined && p.loanOptionFee <= (mp.value ?? mp.price)) {
      fail(`${p.name}'s option at ${p.loanOptionFee} is not dearer than his ${mp.value ?? mp.price} value`);
    }

    /* Take the option up: he becomes permanent and the figure leaves. */
    const budgetBefore = after.budget;
    const permanent = exerciseLoanOption(after, p.id);
    if (!permanent) {
      if (p.loanOptionFee <= after.budget) fail(`${p.name}'s option was refused with the money in the bank`);
    } else {
      bought += 1;
      const now = permanent.squad.find(x => x.id === p.id);
      if (!now) fail(`${p.name} vanished when his option was taken up`);
      else {
        if (now.onLoan) fail(`${p.name} is still flagged as on loan after being bought`);
        if (now.loanOptionFee !== undefined) fail(`${p.name} kept his option after it was used`);
        if (now.contractYears === undefined || now.contractYears < 2) fail(`${p.name} was bought onto a ${now.contractYears} year deal`);
      }
      const spent = Math.round((budgetBefore - permanent.budget) * 10) / 10;
      if (spent !== p.loanOptionFee) fail(`the option cost ${spent}, the figure agreed was ${p.loanOptionFee}`);
    }

    /* Or send him home early for the release figure. */
    const home = breakLoan(after, p.id);
    if (!home) {
      if (p.loanBreakFee <= after.budget) fail(`${p.name} could not be sent back with the money in the bank`);
    } else {
      sentBack += 1;
      if (home.squad.some(x => x.id === p.id)) fail(`${p.name} is still here after being sent back`);
      const spent = Math.round((after.budget - home.budget) * 10) / 10;
      if (spent !== p.loanBreakFee) fail(`the release cost ${spent}, the figure agreed was ${p.loanBreakFee}`);
    }

    /* Neither figure may be used with the window shut. */
    const shut = { ...after, transferWindow: null };
    if (exerciseLoanOption(shut, p.id) !== null) fail('an option was taken up with the window shut');
    if (breakLoan(shut, p.id) !== null) fail('a loan was broken with the window shut');
  }
  console.log(`   ${taken} loans taken, ${bought} options exercised, ${sentBack} sent home early`);
  if (taken < 5) fail(`only ${taken} loans could be taken at all`);
  if (bought === 0) fail('no option to buy could be exercised');
  if (sentBack === 0) fail('no loan could be ended early');
}

/* ---------- 7. The old paths are untouched ---------- */
console.log('7) An instant buy and a met clause are the deals they always were');
{
  let buys = 0;
  let clauses = 0;
  for (let i = 0; i < 12; i++) {
    const s = fresh(['Aston Villa', 'Napoli', 'Sevilla'][i % 3]);
    const market = buildMarket(s);
    const plain = market.find(m => m.price < s.budget * 0.4 && !m.generated && releaseClauseOf(m, s.season) === null);
    if (plain) {
      const after = buyPlayer(s, plain);
      if (!after) fail(`buyPlayer refused ${plain.name} at ${plain.price} on a budget of ${s.budget}`);
      else {
        buys += 1;
        const p = after.squad.find(x => x.name === plain.name);
        const expectYears = plain.age >= 31 ? 2 : 4;
        if (!p) fail('an instant buy never arrived');
        else {
          if (p.contractYears !== expectYears) fail(`an instant buy got ${p.contractYears} years, the old rule says ${expectYears}`);
          if (p.wage !== wageFor(p)) fail(`an instant buy got ${p.wage}k, wageFor says ${wageFor(p)}k`);
          if (p.role !== undefined) fail('an instant buy arrived carrying a role it was never promised');
          if (p.signedTerms !== undefined) fail('an instant buy arrived carrying signed terms');
        }
      }
    }
    const claused = market.find(m => {
      const c = releaseClauseOf(m, s.season);
      return c !== null && c < s.budget * 0.6;
    });
    if (claused) {
      const after = payClause(s, claused);
      if (!after) fail(`payClause refused ${claused.name}`);
      else {
        clauses += 1;
        if (after.negotiation !== null) fail('paying a clause left a negotiation open');
        if (!after.squad.some(x => x.name === claused.name)) fail('a met clause never delivered the player');
      }
    }
  }
  console.log(`   ${buys} instant buys and ${clauses} met clauses, all on the pre-506 shape`);
  if (buys < 6) fail(`only ${buys} instant buys were reachable`);
  if (clauses < 4) fail(`only ${clauses} clauses were reachable`);
}

if (failures) {
  console.error(`\nsimClubManagerDeals: ${failures} FAILURES`);
  process.exit(1);
}
console.log('\nsimClubManagerDeals: green. The desk reads, the table binds, and nobody signs on a handshake.');
