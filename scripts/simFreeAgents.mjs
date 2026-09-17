/**
 * Round 619: free agents, and what it costs to end a contract early.
 *
 * The owner asked for two things: free agents in Manager Mode, and the ability
 * to terminate a contract so a player becomes one. The danger the whole design
 * exists to prevent is a single line of arithmetic: wageBill was a reduce over
 * the squad, so a released player's wage left the bill in the same tick he left
 * the squad. Termination would have cost nothing, instantly bought wage cap
 * room, and been strictly better than selling him, loaning him out or playing
 * him. Every save would have opened by binning its three worst contracts.
 *
 * So this harness is mostly about money, and section 2 is the one that actually
 * defends the mode: a policy of releasing your worst contracts every season has
 * to be WORSE than keeping them, by a margin measured on healthy code rather
 * than by a number that felt right.
 *
 * Sections:
 *   1) Termination is not free, and the projection says so.
 *   2) Termination is not dominant over many seasons.
 *   3) The window bypass is exactly one door wide.
 *   4) The pool is not an upgrade rack (the academy's defence).
 *   5) The pool stays sane across a long save.
 *   6) A save written before this round loads and plays on.
 *
 * CONTROLS, one per section, each asserting its anchor exists before it edits:
 *   FA_CONTROL=nosev      release writes no severance row      -> section 1
 *   FA_CONTROL=billblind  wageBill ignores severance           -> section 2
 *   FA_CONTROL=openall    one window guard removed             -> section 3
 *   FA_CONTROL=goodpool   interest stops refusing better clubs -> section 4
 *   FA_CONTROL=staleforever the pool never clears out          -> section 5
 *   FA_CONTROL=nodedupe   ensureFreeAgents keeps duplicates    -> section 6
 *   FA_CONTROL=nomigrate  ensureFreeAgents drops its defaults  -> section 6
 *
 * billblind trips section 1 as well as section 2, and that is expected rather
 * than sloppy: both sections are claims about the same wage bill, one on a
 * single release and one across eight seasons of them.
 *
 * Run: node scripts/simFreeAgents.mjs
 */
import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.FA_CONTROL || '';

let failures = 0;
const fail = (m) => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => console.log(`   ok   ${m}`);

/* A worktree carries no node_modules of its own, so walk up for the binary. */
function findEsbuild() {
  const exe = process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild';
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, 'node_modules', '.bin', exe);
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('esbuild not found walking up from ' + ROOT);
}

/* Per run temp dir. Two concurrent runs sharing one fixed filename have
   silently mixed two source trees in this repo before, which is why Round 626
   had to give simPress the same treatment. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'freeagents-'));
const BUNDLE = path.join(TMP, 'bundle.mjs');

/* clubManager.ts is 15,000 lines and imports a dozen sibling modules by their
   @/ alias, so a control cannot copy the module graph into a temp folder the
   way the smaller libs do. Instead the patched copy is aliased OVER the real
   one: esbuild resolves @/lib/clubManager to the temp file and every other @/
   import to the real src, so exactly one module in the graph is swapped and
   everything that imports it, clubManagerFinances included, gets the patched
   version. Nothing under src/ is touched, which also means an interrupted run
   cannot leave a control file behind for someone else to find. */
let cmSrc = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8');

function rewrite(which, anchor, replacement) {
  if (!cmSrc.includes(anchor)) {
    console.log(`   FAIL control ${which} anchor is not in the source, so it would change nothing`);
    process.exit(1);
  }
  cmSrc = cmSrc.replace(anchor, replacement);
  console.log(`   [control ${which} applied]`);
}

if (CONTROL === 'nosev') {
  rewrite('nosev',
    "  next.severance = [...(next.severance ?? []), { name: p.name, weekly: sev.weekly, weeksLeft: sev.weeksLeft }];",
    "  next.severance = [...(next.severance ?? [])];");
} else if (CONTROL === 'billblind') {
  rewrite('billblind',
    '  const squad = career.squad.reduce((s, p) => s + (p.wage ?? wageFor(p)), 0);\n  return squad + severanceBill(career);',
    '  const squad = career.squad.reduce((s, p) => s + (p.wage ?? wageFor(p)), 0);\n  return squad;');
} else if (CONTROL === 'openall') {
  /* One door, not all nine: acceptBid stops caring about the window. If the
     section only counted guards in the source this control would be a string
     test; it checks behaviour, so this has to actually open a function. */
  rewrite('openall',
    "  const bid = bids.find(b => b.playerId === playerId);\n  if (!bid) return null;\n  if (career.transferWindow === null) return null;",
    "  const bid = bids.find(b => b.playerId === playerId);\n  if (!bid) return null;\n  if (false) return null;");
} else if (CONTROL === 'goodpool') {
  rewrite('goodpool',
    '  if (fa.rating - level > tolerated) {',
    '  if (false) {');
} else if (CONTROL === 'staleforever') {
  /* The pool never clears. This is section 5's control rather than a dedupe
     one: addFreeAgent's guard only runs on a manual release, so a control
     pointed at it sat green through eight simulated seasons and proved
     nothing. The two season drop runs every single summer, which is what a
     control for "the pool stays sane across a long save" has to break. */
  rewrite('staleforever',
    '    if (season - f.since >= 2) continue;',
    '    if (false) continue;');
} else if (CONTROL === 'nodedupe') {
  rewrite('nodedupe',
    '    if (seen.has(f.name)) continue;',
    '    if (false) continue;');
} else if (CONTROL === 'nomigrate') {
  rewrite('nomigrate',
    '  state.freeAgents = clean;',
    '  if (state.freeAgents !== undefined) state.freeAgents = clean;');
} else if (CONTROL) {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}

const PATCHED = path.join(TMP, 'clubManager.ts');
fs.writeFileSync(PATCHED, cmSrc);
fs.writeFileSync(path.join(TMP, 'entry.ts'), `export * as cm from '@/lib/clubManager';\nexport * as fin from '@/lib/clubManagerFinances';\n`);
fs.writeFileSync(path.join(TMP, 'boot.ts'), '');
execSync(
  `"${findEsbuild()}" "${path.join(TMP, 'entry.ts')}" --bundle --format=esm --platform=node --outfile="${BUNDLE}"`
  + ` "--alias:@/lib/clubManager=${PATCHED.replaceAll('\\', '/')}"`
  + ` "--alias:@=${path.join(ROOT, 'src').replaceAll('\\', '/')}"`
  + ' --log-level=error',
  { stdio: 'pipe' },
);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { cm, fin } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  wageBill, severanceBill, wageFor, sellValue,
  releasePlayer, signFreeAgent, ensureFreeAgents, severanceFor,
  freeAgentAsk, freeAgentInterest,
  acceptBid, startNegotiation, makeOffer, offerTerms,
  loanOutPlayer, recallLoanedPlayer, exerciseLoanOption, breakLoan,
} = cm;
const { projectFinances, booksOf } = fin;

function runSeason(s) {
  let guard = 0;
  while (s.week < s.calendar.length && guard < 140) {
    guard += 1;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

const releasable = (s) => s.squad.filter(p => !p.onLoan && !p.isYouth && p.age >= 20);

/* Section 1 wants the clearest possible arithmetic, so it releases the biggest
   earner at the club: the bigger the wage, the more obvious it is whether the
   bill fell by all of it or half of it. */
function biggestEarner(s) {
  const el = releasable(s);
  if (!el.length) return null;
  return el.slice().sort((a, b) => (b.wage ?? wageFor(b)) - (a.wage ?? wageFor(a)))[0];
}

/* Section 2 wants something else entirely: the contract a manager trying to
   save money would actually bin. That is the one paying most ABOVE what the
   player is worth, with the lowest rated man breaking the tie.
 *
 * The first version of this sorted on wage divided by rating and called the
 * result "the worst contract". It is not: a 140k striker rated 88 scores worse
 * on that than a 31k defender rated 70, so the policy it modelled was "release
 * Haaland and Mbappe every August". The section was measuring the cost of
 * throwing away your best players rather than the cost of clearing out dead
 * weight, it reported that releasing BEAT keeping, and that was a true fact
 * about the wrong policy. */
function worstValueContract(s) {
  const el = releasable(s);
  if (!el.length) return null;
  const over = (p) => (p.wage ?? wageFor(p)) / Math.max(1, wageFor(p));
  return el.slice().sort((a, b) => (over(b) - over(a)) || (a.rating - b.rating))[0];
}

/* ---------- 1. Termination is not free ---------- */
console.log('1) releasing a player does not simply delete his wage');
{
  const clubs = ['Manchester City', 'Burnley', 'Real Madrid', 'Inter Miami'];
  let checked = 0;
  for (const club of clubs) {
    let s = startCareer(club);
    s = runSeason(s);
    /* Mid season, so there are real weeks left to owe. */
    s.week = Math.floor(s.calendar.length / 3);
    const victim = biggestEarner(s);
    if (!victim) { fail(`${club}: nobody releasable`); continue; }
    const wage = victim.wage ?? wageFor(victim);
    const before = wageBill(s);
    const quote = severanceFor(s, victim);
    const after = releasePlayer(s, victim.id);
    if (!after) { fail(`${club}: releasing ${victim.name} was refused`); continue; }
    checked += 1;
    const billAfter = wageBill(after);
    const drop = before - billAfter;
    console.log(`   ${club}: ${victim.name} on ${wage}k, bill ${before}k -> ${billAfter}k (drop ${drop}k), owed ${quote.weekly}k for ${quote.weeksLeft} weeks`);
    if (drop >= wage) {
      fail(`${club}: the bill fell by ${drop}k against his ${wage}k wage, so termination was free`);
    }
    if (severanceBill(after) <= 0) fail(`${club}: no severance is being carried after a release`);
    if (quote.weeksLeft < 4) fail(`${club}: severance quoted for only ${quote.weeksLeft} weeks`);
    if (after.squad.some(p => p.id === victim.id)) fail(`${club}: ${victim.name} is still in the squad`);
    /* xiIds is POSITIONAL: index i is formation slot i, null is an empty slot.
       The first draft of releasePlayer filtered him out instead of nulling his
       slot, which shortened the array and shifted every man behind him into
       somebody else's position. tsc cannot see that and no season level check
       would have caught it either, because the team still played. */
    if (after.xiIds.length !== s.xiIds.length) {
      fail(`${club}: the XI went from ${s.xiIds.length} slots to ${after.xiIds.length}, so the formation has shifted`);
    }
    if (after.xiIds.includes(victim.id)) fail(`${club}: ${victim.name} is still named in the XI`);
    for (let i = 0; i < s.xiIds.length; i += 1) {
      if (s.xiIds[i] !== victim.id && s.xiIds[i] !== after.xiIds[i]) {
        fail(`${club}: XI slot ${i} changed from ${s.xiIds[i]} to ${after.xiIds[i]} on a release that was not his`);
        break;
      }
    }
    if (!(after.freeAgents ?? []).some(f => f.name === victim.name)) fail(`${club}: ${victim.name} did not reach the pool`);
    /* And the money is visible rather than mysterious. */
    const proj = projectFinances(after);
    const line = [...proj.spend].find(l => l.id === 'severance');
    if (!line) fail(`${club}: the finance projection has no settled contracts line`);
    else if (line.projected <= 0) fail(`${club}: the settled contracts line projects ${line.projected}`);
  }
  if (checked < clubs.length) fail(`only ${checked} of ${clubs.length} clubs were actually tested`);
  else ok(`${checked} clubs: the wage bill never fell by the full wage`);
}

/* ---------- 2. Termination is not dominant ---------- */
console.log('2) releasing your worst contracts does not pay for itself');
{
  const CLUBS = ['Everton', 'Sevilla', 'Napoli', 'Aston Villa', 'Burnley', 'Leeds United'];
  const SEASONS = 8;
  const run = (club, releasing) => {
    let s = startCareer(club);
    let released = 0;
    let wagesAvoided = 0;   // what the released men would have earned, per week, summed over the weeks they were gone
    let wagePaid = 0;       // squad wages actually booked
    let sevPaid = 0;        // settlements actually booked
    let billDropped = 0;    // what the wage bill actually fell by, summed over releases
    let fullWages = 0;      // what those men were on, summed over the same releases
    for (let yr = 0; yr < SEASONS; yr += 1) {
      if (releasing) {
        for (let k = 0; k < 2; k += 1) {
          const v = worstValueContract(s);
          if (!v) break;
          const wage = v.wage ?? wageFor(v);
          const billBefore = wageBill(s);
          const next = releasePlayer(s, v.id);
          if (!next) break;
          /* The saving the WAGE BILL actually shows, which is the number the
             board and the cap read. Measured here rather than taken from the
             books, because a version of this round that recorded severance in
             the ledger but left it out of the bill would look correct in the
             accounts and still hand back the free cap room the whole round
             exists to prevent. */
          billDropped += billBefore - wageBill(next);
          fullWages += wage;
          s = next;
          released += 1;
          wagesAvoided += (wage / 1000) * Math.max(0, s.calendar.length - s.week);
        }
      }
      s = runSeason(s);
      const led = booksOf(s).season;
      wagePaid += led.playerWages ?? 0;
      sevPaid += led.severance ?? 0;
      s = startNextSeason(finishSeason(s).state);
      if (s.sacked) break;
    }
    const h = s.history ?? [];
    const seasons = Math.max(1, h.length);
    /* Points PER SEASON, never a sum: a manager sacked in season four has
       fewer seasons to accumulate in, and comparing totals across runs of
       different lengths would read that as a footballing difference. */
    const pps = h.reduce((n, x) => n + (x.points ?? 0), 0) / seasons;
    const xi = s.squad.slice().sort((a, b) => b.rating - a.rating).slice(0, 11);
    const xiAvg = xi.length ? xi.reduce((n, p) => n + p.rating, 0) / xi.length : 0;
    return { pps, xiAvg, released, wagesAvoided, wagePaid, sevPaid, billDropped, fullWages, seasons };
  };
  let totalReleased = 0;
  let totalAvoided = 0;
  let totalSev = 0;
  let totalBillDrop = 0;
  let totalFullWages = 0;
  let sumPps = 0;
  let worstPps = Infinity;
  for (const club of CLUBS) {
    const keep = run(club, false);
    const rel = run(club, true);
    totalReleased += rel.released;
    totalAvoided += rel.wagesAvoided;
    totalSev += rel.sevPaid;
    totalBillDrop += rel.billDropped;
    totalFullWages += rel.fullWages;
    const gap = keep.pps - rel.pps;
    sumPps += gap;
    worstPps = Math.min(worstPps, gap);
    console.log(`   ${club}: keep ${keep.pps.toFixed(1)} pts/season | release ${rel.pps.toFixed(1)} pts/season, ${rel.released} released, settlements ${rel.sevPaid.toFixed(2)}m vs ${rel.wagesAvoided.toFixed(2)}m of wages dodged`);
  }
  const meanPps = sumPps / CLUBS.length;
  /* How much of the wage he stopped paying the manager actually kept. The
     whole round is the claim that this is well under 1. */
  const kept = totalAvoided > 0 ? 1 - (totalSev / totalAvoided) : 1;
  console.log(`   ${totalReleased} releases: ${totalSev.toFixed(2)}m of settlements against ${totalAvoided.toFixed(2)}m of wages dodged, so the manager kept ${(kept * 100).toFixed(0)} percent of the saving`);
  console.log(`   mean football gap in favour of keeping: ${meanPps.toFixed(2)} points per season (worst club ${worstPps.toFixed(2)})`);

  if (totalReleased < CLUBS.length) {
    fail(`only ${totalReleased} releases happened across ${CLUBS.length} clubs, so this section barely ran`);
  }
  /* THE ASSERTION THAT MATTERS, and it is on the money rather than the
     football, because the money is the mechanism this round installs and it is
     deterministic while the football is not.
   *
     Measured across four seed bases on healthy code, the mean football gap ran
     +1.94, +2.15, -3.88 and +0.3 points per season, so it crosses zero: at six
     clubs and eight seasons a policy of binning dead weight is not reliably
     worse ON THE PITCH, because the men it bins were not playing. Asserting a
     positive football margin there would have been a coin toss dressed as a
     rule, which is the Round 284 mistake, and asserting the two are the SAME is
     the forbidden shape because it gets easier the less data it is fed.
   *
     What IS reliable is that a settlement claws back a large, measurable share
     of the wage the manager thought he had stopped paying. That is the claim
     the mode rests on, the billblind and nosev controls both destroy it, and it
     needs no seed to hold. */
  const billRelief = totalFullWages > 0 ? totalBillDrop / totalFullWages : 1;
  console.log(`   the wage bill fell by ${(billRelief * 100).toFixed(0)} percent of the released wages, so ${(100 - billRelief * 100).toFixed(0)} percent stayed on the books`);
  /* The bill is where the cap and the board look, so this is the half of the
     claim that a "recorded but not charged" regression would break while the
     accounts still balanced. Healthy code lands near 50 percent, because a
     settlement is half the wage; the billblind control puts it at 100. */
  if (billRelief > 0.8) {
    fail(`releasing cut the wage bill by ${(billRelief * 100).toFixed(0)} percent of the wages, so the cap room is nearly free`);
  }
  if (totalSev <= 0) {
    fail('the releasing manager paid no settlements at all, so termination is free');
  } else if (kept > 0.75) {
    fail(`the manager kept ${(kept * 100).toFixed(0)} percent of the wages he stopped paying, so ending a contract is nearly free`);
  } else {
    ok(`settlements clawed back ${((1 - kept) * 100).toFixed(0)} percent of the wages dodged across ${totalReleased} releases`);
  }
  /* And a one sided bound on the football, generous enough not to be a coin
     toss but tight enough to catch a real regression. The worst single sample
     measured was the releaser 3.88 points a season AHEAD; 8 sits clear of that
     while still failing if releasing ever becomes properly dominant. */
  if (meanPps < -8) {
    fail(`releasing is ahead by ${(-meanPps).toFixed(2)} points per season, which is past anything measured on healthy code`);
  }
}

/* ---------- 3. The window bypass is exactly one door wide ---------- */
console.log('3) with the window shut, only the free agent door opens');
{
  let s = startCareer('Sevilla');
  s = runSeason(s);
  s.transferWindow = null;
  ensureFreeAgents(s);
  /* Put a signable man in the pool: below the club's level, so interest is
     about the window and not about his ambition. */
  const level = s.clubStrengths?.[s.clubName] ?? 66;
  s.freeAgents = [{
    name: 'Testable Freeman', position: 'CM', age: 27,
    rating: Math.round(level - 8), value: 4, generated: true,
    since: s.season - 1, reason: 'expired',
  }];
  const ask = freeAgentAsk(s.freeAgents[0]);
  const signed = signFreeAgent(s, 'Testable Freeman', { years: 2, wage: ask.wage });
  if (!signed) fail('signFreeAgent refused with the window shut, which is the whole point of the round');
  else if (!signed.squad.some(p => p.name === 'Testable Freeman')) fail('signFreeAgent returned a state without the player in it');
  else ok('a free agent signs with the window shut');

  const target = s.squad.find(p => !p.onLoan && !p.isYouth);
  const mp = { name: 'Nobody Real', club: 'Elsewhere', position: 'CM', age: 25, rating: 70, price: 10 };
  /* A real bid on the table, or acceptBid returns null at `if (!bid)` and
     never reaches the window guard at all. The first version of this section
     called it with no bids pending, so it "refused" on every run including one
     where the guard had been deleted: a check that passed for the wrong
     reason. The open-window control below is what proves it is not doing that
     again. */
  s.incomingBids = [{
    playerId: target?.id, playerName: target?.name, club: 'Elsewhere',
    offer: Math.max(1, Math.round(sellValue(target))), status: 'open',
  }];
  const openCopy = JSON.parse(JSON.stringify(s));
  openCopy.transferWindow = 'summer';
  if (acceptBid(openCopy, target?.id) === null) {
    fail('acceptBid refuses even with the window OPEN, so section 3 is not testing the window at all');
  } else {
    ok('acceptBid works with the window open, so refusing it below means the guard');
  }
  const gated = [
    ['acceptBid', () => acceptBid(s, target?.id)],
    ['startNegotiation', () => startNegotiation(s, mp)],
    ['makeOffer', () => makeOffer(s, 10)],
    ['offerTerms', () => offerTerms(s, { wage: 50, years: 3 })],
    ['loanOutPlayer', () => loanOutPlayer(s, target?.id)],
    ['recallLoanedPlayer', () => recallLoanedPlayer(s, target?.id)],
    ['exerciseLoanOption', () => exerciseLoanOption(s, target?.id)],
    ['breakLoan', () => breakLoan(s, target?.id)],
  ];
  let open = 0;
  for (const [name, call] of gated) {
    let res = null;
    try { res = call(); } catch { res = null; }
    if (res !== null) { open += 1; fail(`${name} still worked with the window shut`); }
  }
  /* completeSigning is not exported, so its guard is checked where it lives.
     Counting them all also catches a guard deleted from a function this
     section does not happen to call. */
  const guards = (cmSrc.match(/transferWindow === null\) return null;/g) || []).length;
  if (guards !== 9) fail(`expected 9 window guards in clubManager.ts, found ${guards}`);
  if (!open) ok(`all ${gated.length} exported transfer functions still refuse, and 9 guards are in place`);
}

/* ---------- 4. The pool is not an upgrade rack ---------- */
console.log('4) a free agent will not join a club he is better than');
{
  const clubs = ['Manchester City', 'Real Madrid', 'Burnley', 'Sevilla', 'Inter Miami'];
  let tempted = 0;
  let refusedAtAsk = 0;
  let total = 0;
  for (const club of clubs) {
    const s = startCareer(club);
    const level = s.clubStrengths?.[s.clubName] ?? 66;
    for (const over of [2, 6, 10]) {
      const fa = {
        name: `Better Than ${club} ${over}`, position: 'CM', age: 26,
        rating: Math.round(level + over), value: 30, generated: true,
        since: s.season - 1, reason: 'expired',
      };
      const ask = freeAgentAsk(fa);
      total += 1;
      /* At his asking wage he should not join a club he is better than. */
      if (freeAgentInterest(s, fa, { years: 2, wage: ask.wage }).willSign) tempted += 1;
      else refusedAtAsk += 1;
    }
  }
  console.log(`   ${refusedAtAsk} of ${total} above-level free agents refused their asking wage at ${clubs.length} clubs`);
  if (tempted > 0) fail(`${tempted} free agents rated above their club's level signed at the asking wage, which is the free upgrade rack simAcademy measured`);
  else ok('nobody rated above a club joined it at the asking wage');
  /* And money buys back only so much: doubling the wage should persuade a man
     a little better than the club, but not one far better. */
  const s2 = startCareer('Burnley');
  const lvl = s2.clubStrengths?.[s2.clubName] ?? 66;
  const near = { name: 'Near Miss', position: 'CM', age: 26, rating: Math.round(lvl + 4), value: 12, generated: true, since: s2.season - 1, reason: 'expired' };
  const far = { name: 'Far Better', position: 'CM', age: 26, rating: Math.round(lvl + 20), value: 60, generated: true, since: s2.season - 1, reason: 'expired' };
  const nearAsk = freeAgentAsk(near).wage;
  const farAsk = freeAgentAsk(far).wage;
  if (!freeAgentInterest(s2, near, { years: 2, wage: nearAsk * 2 }).willSign) fail('doubling the wage persuaded nobody at all, so the lever does not exist');
  if (freeAgentInterest(s2, far, { years: 2, wage: farAsk * 4 }).willSign) fail('a player 20 rating points above the club signed for money, so the band is not bounded');
  ok('money buys a few rating points of persuasion and no more');
}

/* ---------- 5. The pool stays sane across a long save ---------- */
console.log('5) the pool over a long save: no duplicates, no ghosts, no drift');
{
  let s = startCareer('Everton');
  const sizes = [];
  const means = [];
  for (let yr = 0; yr < 8; yr += 1) {
    s = runSeason(s);
    s = startNextSeason(finishSeason(s).state);
    if (s.sacked) break;
    const pool = s.freeAgents ?? [];
    sizes.push(pool.length);
    if (pool.length) means.push(pool.reduce((n, f) => n + f.rating, 0) / pool.length);
    const names = pool.map(f => f.name);
    if (new Set(names).size !== names.length) fail(`season ${s.season}: the pool holds a duplicate name`);
    const retired = new Set(s.retiredNames ?? []);
    for (const f of pool) {
      if (retired.has(f.name)) fail(`season ${s.season}: ${f.name} retired and is still a free agent`);
      if (s.squad.some(p => p.name === f.name)) fail(`season ${s.season}: ${f.name} is in the squad AND the pool`);
      if (s.season - f.since >= 3) fail(`season ${s.season}: ${f.name} has been unsigned since ${f.since}`);
    }
  }
  console.log(`   pool sizes by season: ${sizes.join(', ')}`);
  if (means.length >= 2) {
    console.log(`   mean pool rating: ${means.map(m => m.toFixed(1)).join(', ')}`);
    const drift = means[means.length - 1] - means[0];
    if (drift > 4) fail(`the pool's mean rating drifted up by ${drift.toFixed(1)}, so it is slowly becoming an upgrade rack`);
  }
  const biggest = Math.max(0, ...sizes);
  if (biggest > 40) fail(`the pool reached ${biggest} entries, so it is unbounded`);
  if (!sizes.length) fail('no season produced a pool at all, so this section checked nothing');
  else if (sizes.every(n => n === 0)) fail('the pool was empty in every season, so nothing here was tested');
  else ok(`${sizes.length} seasons, largest pool ${biggest}, no duplicate, retired or ghost entries`);
}

/* ---------- 6. Old saves load ---------- */
console.log('6) a save written before this round loads and plays on');
{
  let s = startCareer('Napoli');
  s = runSeason(s);
  /* Exactly what a pre-619 save looks like: neither field has ever existed. */
  const old = JSON.parse(JSON.stringify(s));
  delete old.freeAgents;
  delete old.severance;
  ensureFreeAgents(old);
  if (!Array.isArray(old.freeAgents)) fail('ensureFreeAgents left freeAgents undefined on an old save');
  if (!Array.isArray(old.severance)) fail('ensureFreeAgents left severance undefined on an old save');
  if (!Number.isFinite(wageBill(old))) fail(`wageBill on a migrated save is ${wageBill(old)}`);
  /* Idempotent: every ensure in this file runs twice on every load, and one
     that changes something the second time is a save that will not settle. */
  const once = JSON.stringify({ f: old.freeAgents, s: old.severance });
  ensureFreeAgents(old);
  if (JSON.stringify({ f: old.freeAgents, s: old.severance }) !== once) fail('ensureFreeAgents is not idempotent');
  /* And rubbish is dropped rather than trusted into the wage bill. */
  const junk = JSON.parse(JSON.stringify(s));
  junk.severance = [{ name: 'Ghost', weekly: Number.NaN, weeksLeft: 5 }, { name: 'Done', weekly: 10, weeksLeft: 0 }];
  junk.freeAgents = [{ name: 'Twice', position: 'CM', age: 26, rating: 70, since: 1, reason: 'expired' },
    { name: 'Twice', position: 'CM', age: 26, rating: 70, since: 1, reason: 'expired' }];
  ensureFreeAgents(junk);
  if (junk.severance.length !== 0) fail(`a NaN row and a spent row survived ensureFreeAgents: ${JSON.stringify(junk.severance)}`);
  if (junk.freeAgents.length !== 1) fail(`ensureFreeAgents kept ${junk.freeAgents.length} copies of one name`);
  if (!Number.isFinite(wageBill(junk))) fail('a mangled severance ledger poisoned the wage bill');
  /* It plays on. */
  let played = old;
  for (let i = 0; i < 3; i += 1) played = playNextEntry(played, { skipHalftime: true }).state;
  if (!Array.isArray(played.freeAgents)) fail('playNextEntry lost the pool on a migrated save');
  ok('an old save migrates, is idempotent, drops rubbish and plays on');
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(failures ? `\n${failures} failure(s)` : '\nall sections green');
process.exit(failures ? 1 : 0);
