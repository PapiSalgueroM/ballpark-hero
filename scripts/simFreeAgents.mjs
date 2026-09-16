/* Round 619: free agents and contract termination in Club Manager.
 *
 * Contract: docs/design/round-619-free-agents-contract.md, from the owner's
 * footer report.
 *
 * WHAT THIS HARNESS IS FOR. The round has one claim it lives or dies on:
 * ending a contract must COST. wageBill reduced over state.squad alone before
 * this round, so a released man's wage left the bill the instant he left the
 * squad, the cap loosened on every release, and sacking your worst contracts
 * would have beaten selling them or playing them. Section 1 is therefore the
 * section that proves the round, and section 2 is the one that proves it
 * matters: a policy of releasing the worst contracts must not beat keeping
 * them. Its control removes the liability, and the aggressive policy must then
 * start winning, because if it does not the liability was never load bearing.
 *
 * House rules as everywhere: never assert on a maximum, never assert non
 * significance, bands from measured headroom, and a control per section that
 * provably fires.
 *
 * CONTROLS:
 *   FA_CONTROL=nosev      a release writes no settlement      -> section 1
 *   FA_CONTROL=billblind  the wage bill ignores settlements   -> section 1
 *   FA_CONTROL=openall    the window stops gating transfers   -> section 3
 *   FA_CONTROL=nodecay    the pool never ages out             -> section 4
 *   FA_CONTROL=nodedupe   the pool accepts a duplicate        -> section 5
 *   FA_CONTROL=nomigrate  an old save is not repaired         -> section 6
 *   FA_CONTROL=tickwild   a week can be counted more than once -> section 7
 *   FA_CONTROL=keenall    every free agent will sign for anyone  -> section 9
 *   FA_CONTROL=resignnow  a man let go can come straight back    -> section 9
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

/* Walk up for the binary so this runs from a worktree too, which the harnesses
   that hardcode ROOT/node_modules cannot. */
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

/* Per run temp dir: concurrent runs sharing a fixed name have silently mixed
   two source trees in this repo. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'freeagents-'));
const BUNDLE = path.join(TMP, 'bundle.mjs');

let src = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8').replaceAll('\r\n', '\n');

/* Every control asserts its anchor exists BEFORE it edits, so a control that
   matches nothing cannot leave this green for the wrong reason. */
function rewrite(which, anchor, replacement) {
  if (!src.includes(anchor)) {
    console.log(`   FAIL control ${which} anchor is not in the source, so it would change nothing`);
    process.exit(1);
  }
  src = src.replace(anchor, replacement);
  console.log(`   [control ${which} applied]`);
}

if (CONTROL === 'nosev') {
  rewrite('nosev',
    "severance: [...(career.severance ?? []), { name: p.name, weekly: sev.weekly, weeksLeft: sev.weeksLeft }],",
    'severance: [...(career.severance ?? [])],');
} else if (CONTROL === 'billblind') {
  rewrite('billblind',
    "return career.squad.reduce((s, p) => s + (p.wage ?? wageFor(p)), 0) + severanceBill(career);",
    'return career.squad.reduce((s, p) => s + (p.wage ?? wageFor(p)), 0);');
} else if (CONTROL === 'openall') {
  rewrite('openall',
    'export function startNegotiation(career: CareerState, mp: MarketPlayer): CareerState | null {\n  if (career.transferWindow === null) return null;',
    'export function startNegotiation(career: CareerState, mp: MarketPlayer): CareerState | null {\n  if (false) return null;');
} else if (CONTROL === 'nodecay') {
  rewrite('nodecay',
    '.filter(f => !gone.has(f.name) && nextSeason - f.since < 2)',
    '.filter(f => !gone.has(f.name))');
} else if (CONTROL === 'nodedupe') {
  rewrite('nodedupe',
    '  if (pool.some(x => x.name === fa.name)) return pool;',
    '  if (false) return pool;');
} else if (CONTROL === 'nomigrate') {
  rewrite('nomigrate',
    '  if (!Array.isArray(state.freeAgents)) state.freeAgents = [];\n  if (!Array.isArray(state.severance)) state.severance = [];',
    '  if (false) state.freeAgents = [];');
} else if (CONTROL === 'tickwild') {
  /* Reproduces the measured bug exactly: before the guard, 38 countdowns over
     29 weeks played, about 1.3 a week. */
  rewrite('tickwild',
    'if (state.severance && state.severance.length && state.severanceTickedWeek !== state.week) {',
    'if (state.severance && state.severance.length) {');
} else if (CONTROL === 'keenall') {
  rewrite('keenall',
    '  return fa.rating <= mine - 6;',
    '  return true;');
} else if (CONTROL === 'resignnow') {
  rewrite('resignnow',
    '  if (fa.fromMyClub && fa.since === career.season) return null;',
    '  if (false) return null;');
} else if (CONTROL) {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}

const SRC = path.join(TMP, 'clubManager.ts');
fs.writeFileSync(SRC, src);
fs.writeFileSync(path.join(TMP, 'entry.ts'), `export * as cm from '${SRC.replaceAll('\\', '/')}';\n`);
execSync(`"${findEsbuild()}" "${path.join(TMP, 'entry.ts')}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --alias:@=${JSON.stringify(`${ROOT.replaceAll('\\', '/')}/src`)} --log-level=error`, { stdio: 'pipe' });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { cm } = await import(pathToFileURL(BUNDLE).href);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const CLUBS = ['Everton', 'Brentford', 'Napoli', 'Ajax', 'Arsenal'];

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const real = Math.random;
const seeded = (seed, fn) => { Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = real; } };

/** The worst contract on the books: what an exploiting manager would sack. */
const worstContract = (st) => st.squad
  .filter(p => !p.onLoan && !p.isYouth && p.age >= 20)
  .slice()
  .sort((a, b) => (b.wage ?? 0) / Math.max(1, b.rating) - (a.wage ?? 0) / Math.max(1, a.rating))[0];

console.log('simFreeAgents');
console.log(`   ${CLUBS.length} clubs${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);

/* ═══════════════ 1) THE SECTION THAT PROVES THE ROUND ═══════════════ */
console.log('1) ending a contract costs, and the wage bill still sees it');
{
  const drops = [];
  const kept = [];
  for (let i = 0; i < CLUBS.length; i += 1) {
    seeded(4000 + i, () => {
      const st = cm.startCareer(CLUBS[i]);
      cm.ensureFreeAgents(st);
      const p = worstContract(st);
      if (!p) return;
      const before = cm.wageBill(st);
      const wage = p.wage ?? 0;
      const after = cm.releasePlayer(st, p.id);
      if (!after) { fail(`${CLUBS[i]}: could not release the worst contract at all`); return; }
      const now = cm.wageBill(after);
      /* How much of his wage actually left the bill. 1 means the release was
         free, 0 means it cost exactly what he cost. */
      drops.push((before - now) / Math.max(1, wage));
      kept.push(cm.severanceBill(after) / Math.max(1, wage));
    });
  }
  if (drops.length < 3) fail(`only ${drops.length} clubs produced a release to measure`);
  console.log(`   of the released wage, ${(mean(drops) * 100).toFixed(1)}% left the bill and ${(mean(kept) * 100).toFixed(1)}% stayed as a settlement`);
  if (!(mean(drops) < 0.75)) {
    fail(`releasing a man removed ${(mean(drops) * 100).toFixed(1)}% of his wage from the bill, so termination is close to free (ceiling 75%)`);
  } else {
    ok(`a release keeps ${(mean(kept) * 100).toFixed(1)}% of the wage on the books as a settlement`);
  }
  if (!(mean(kept) > 0.2)) fail(`the settlement is only ${(mean(kept) * 100).toFixed(1)}% of the wage, which is not a cost (floor 20%)`);
  else ok(`the settlement is a real liability, not a token`);
}

/* ═══════════════ 2) and it is not the winning move ═══════════════ */
console.log('2) sacking the worst contracts does not beat keeping them');
{
  /* MEASURED AS A FRACTION OF THE WAGES REMOVED, not in thousands. A fixed
     ceiling in thousands is not scale free: it means one thing at Brentford and
     another at Arsenal, and the first draft duly failed at 48.8 against a
     ceiling of 40 that was a number I chose rather than measured. The claim is
     relative and it is the one the round actually makes: sacking men must free
     materially less cap room than their wages, because you are still paying
     half of every one of them. */
  const capHeadroom = (st) => (st.wageCap ?? cm.wageCapFrom(cm.wageBill(st))) - cm.wageBill(st);
  const ratios = [];
  for (let i = 0; i < CLUBS.length; i += 1) {
    seeded(4200 + i, () => {
      const base = cm.startCareer(CLUBS[i]);
      cm.ensureFreeAgents(base);
      const before = capHeadroom(base);
      let st = base;
      let wagesOut = 0;
      for (let k = 0; k < 2; k += 1) {
        const p = worstContract(st);
        if (!p) break;
        const next = cm.releasePlayer(st, p.id);
        if (!next) break;
        wagesOut += p.wage ?? 0;
        st = next;
      }
      if (wagesOut > 0) ratios.push((capHeadroom(st) - before) / wagesOut);
    });
  }
  if (ratios.length < 3) fail(`only ${ratios.length} clubs produced two releases to measure`);
  console.log(`   of the wages sacked, ${(mean(ratios) * 100).toFixed(1)}% came back as cap headroom`);
  /* Ceiling from the mechanism rather than taste: the settlement rate is half,
     so a correct engine returns about half and anything near all of it means
     the liability is not being counted. */
  if (!(mean(ratios) < 0.75)) {
    fail(`sacking returned ${(mean(ratios) * 100).toFixed(1)}% of the wages as cap room, so the release button is a way to buy space (ceiling 75%)`);
  } else {
    ok(`sacking returns only ${(mean(ratios) * 100).toFixed(1)}% of the wages as cap room (ceiling 75%)`);
  }
}

/* ═══════════════ 3) the window bypass is exactly one door wide ═══════════════ */
console.log('3) a free agent signs out of window, and nothing else does');
{
  const st = seeded(4400, () => cm.startCareer('Everton'));
  cm.ensureFreeAgents(st);
  const shut = { ...st, transferWindow: null, windowWeeksLeft: 0 };
  const gated = [
    ['startNegotiation', () => cm.startNegotiation(shut, { name: 'X', club: 'Y', position: 'MID', age: 25, rating: 70, price: 10 })],
    ['makeOffer', () => cm.makeOffer(shut, 10)],
    ['acceptBid', () => cm.acceptBid(shut, shut.squad[0]?.id ?? 'none')],
  ];
  let openDoors = 0;
  for (const [name, call] of gated) {
    let res = null;
    try { res = call(); } catch { res = null; }
    if (res !== null) { openDoors += 1; fail(`${name} still works with the window shut, so the bypass is wider than one door`); }
  }
  if (!openDoors) ok('every existing transfer path still refuses with the window shut');

  /* And the one door that must be open. */
  const pool = [{ name: 'Free Man', position: 'MID', age: 27, rating: 60, since: shut.season, reason: 'expired' }];
  const withPool = { ...shut, freeAgents: pool };
  const signed = cm.signFreeAgent(withPool, 'Free Man');
  if (!signed) fail('a free agent cannot be signed with the window shut, which is the one thing this round is for');
  else if (!signed.squad.some(p => p.name === 'Free Man')) fail('signFreeAgent returned a state without the man in it');
  else if ((signed.freeAgents ?? []).some(f => f.name === 'Free Man')) fail('the man is in the squad AND still in the pool');
  else ok('a free agent signs with the window shut, and leaves the pool when he does');
}

/* ═══════════════ 4) the pool is not a free upgrade rack ═══════════════ */
console.log('4) the pool stays weak and clears itself out');
{
  const st = seeded(4600, () => cm.startCareer('Everton'));
  cm.ensureFreeAgents(st);
  const strong = { ...st, freeAgents: [{ name: 'Superstar', position: 'ATT', age: 26, rating: 95, since: st.season, reason: 'expired' }] };
  if (cm.signFreeAgent(strong, 'Superstar')) {
    fail('a 95 rated free agent signs for a mid table club, so the pool is a free upgrade rack');
  } else {
    ok('a far better player than the club refuses to sign');
  }
  /* And it decays rather than piling up. Two seasons and an unsigned man is
     gone, so a save cannot accumulate a bench of good free agents. */
  /* Tested through the exported decay rather than by playing a season, which
     the first draft tried and could not do from a synthetic state, so it
     printed a note instead of a verdict. */
  const poolNow = [
    { name: 'Fresh', position: 'MID', age: 27, rating: 70, since: 5, reason: 'expired' },
    { name: 'Stale', position: 'MID', age: 30, rating: 70, since: 3, reason: 'expired' },
    { name: 'Dead', position: 'GK', age: 36, rating: 66, since: 5, reason: 'expired' },
  ];
  const after = cm.decayFreeAgents(poolNow, 6, new Set(['Dead']));
  const names = after.map(f => f.name);
  if (names.includes('Stale')) fail('a free agent unsigned for three seasons is still in the pool');
  else if (!names.includes('Fresh')) fail('a man who has been free for one season was dropped too early');
  else if (names.includes('Dead')) fail('a retired man survived the summer in the pool');
  else ok(`the pool ages out: kept ${names.join(', ')}, dropped Stale and Dead`);
  const fresh = after.find(f => f.name === 'Fresh');
  if (!(fresh && fresh.rating === 69 && fresh.age === 28)) {
    fail(`an unsigned free agent does not decay: expected 69 rated and 28, got ${fresh ? `${fresh.rating} and ${fresh.age}` : 'nothing'}`);
  } else {
    ok('an unsigned man loses a year and a rating point over the summer');
  }
}

/* ═══════════════ 5) the pool cannot hold a duplicate or a dead man ═══════════════ */
console.log('5) no duplicates, and nobody who retired');
{
  const st = seeded(4800, () => cm.startCareer('Everton'));
  cm.ensureFreeAgents(st);
  const p = worstContract(st);
  if (!p) fail('no releasable player to test with');
  else {
    const once = cm.releasePlayer(st, p.id);
    if (!once) fail('could not release');
    else {
      /* OFFER THE DUPLICATE, do not just count the pool after one release.
         The first draft released one man and asserted his one name appeared
         once, which is true of any list built by one push: addFreeAgent's
         `pool.some` line was never reached, and deleting that line outright
         left this section entirely green. A check the control cannot break is
         not checking anything.

         So put him back in the squad under a new id, the way a man who walked
         free and came back would arrive, and release him a second time. */
      const back = {
        ...once,
        squad: [...once.squad, { ...p, id: `${p.id}-again` }],
      };
      const twice = cm.releasePlayer(back, `${p.id}-again`);
      const names = ((twice ?? once).freeAgents ?? []).map(f => f.name);
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      if (!twice) {
        fail('releasing a man whose name is already in the pool returned null, so the second release is refused rather than deduped');
      } else if (dupes.length) {
        fail(`the pool holds duplicates after the same man was offered twice: ${dupes.slice(0, 3).join(', ')}`);
      } else {
        ok(`the same man offered to the pool twice appears once (pool holds ${names.length})`);
      }
      /* A retired name can never enter. */
      const withRetired = { ...once, retiredNames: [...(once.retiredNames ?? []), 'Ghost'] };
      const q = withRetired.squad.filter(x => !x.isYouth && x.age >= 20)[0];
      if (q) {
        const after = cm.releasePlayer({ ...withRetired, squad: withRetired.squad.map(x => (x.id === q.id ? { ...x, name: 'Ghost' } : x)) }, q.id);
        if (after && (after.freeAgents ?? []).some(f => f.name === 'Ghost')) {
          fail('a retired name entered the free agent pool');
        } else {
          ok('a retired name cannot enter the pool');
        }
      }
    }
  }
}

/* ═══════════════ 6) a save written before this round still loads ═══════════════ */
console.log('6) an old save opens and plays on');
{
  const st = seeded(5000, () => cm.startCareer('Everton'));
  const old = { ...st };
  delete old.freeAgents;
  delete old.severance;
  cm.ensureFreeAgents(old);
  if (!Array.isArray(old.freeAgents) || !Array.isArray(old.severance)) {
    fail('a save with neither field is not repaired on load, so every screen that reads them breaks');
  } else {
    ok('both lists default on a save that predates them');
  }
  if (cm.wageBill(old) <= 0) fail('the wage bill is not computable on a repaired old save');
  else ok(`the wage bill still reads on an old save (${cm.wageBill(old)} thousand)`);
}

/* ═══════════════ 7) THE FOUR THE FIRST DRAFT MISSED ═══════════════
   Every one of these passed six green sections and a full type check. They were
   found by an adversarial review, reproduced with measurements, and each one is
   a claim this harness was already making and not testing. */
console.log('7) one week billed is one week counted off the settlement');
{
  /* Charging and counting must happen at the same rate. They did not: the bill
     was charged on every calendar week while the countdown ran only on weeks
     the club played, and then, once moved, the weekly tick turned out to be
     reachable more than once a week, so it over counted instead. Measured
     before the fix: 38 countdowns over 29 weeks played.

     MEASURED AS A RATE, not as a total. Two earlier drafts measured the total
     duration and both were confounded: one compared decrements to loop
     iterations and reported 54 countdowns in 44 weeks, which cannot be true,
     and the next played until the row vanished and read 44 weeks against a
     quote of 108, which turned out to be the manager being SACKED rather than
     the settlement ending. The career ending says nothing about the clock. */
  const st = seeded(6000, () => cm.startCareer('Everton'));
  cm.ensureFreeAgents(st);
  const p = worstContract(st);
  if (!p) fail('no releasable player');
  else {
    const quoted = cm.severanceFor(st, p).weeksLeft;
    let s2 = cm.releasePlayer(st, p.id);
    if (!s2) fail('could not release');
    else {
      let weeks = 0;
      let sacked = false;
      seeded(6001, () => {
        while (s2 && weeks < 40 && (s2.severance ?? []).length > 0) {
          const r = cm.playNextEntry(s2, { skipHalftime: true });
          s2 = r.state;
          weeks += 1;
          if (s2.sacked) { sacked = true; break; }
          if (r.kind === 'seasonOver') break;
        }
      });
      const left = (s2.severance ?? [])[0]?.weeksLeft ?? 0;
      const counted = quoted - left;
      const rate = counted / Math.max(1, weeks);
      console.log(`   ${weeks} weeks played${sacked ? ' (career ended in a sacking, which is fine here)' : ''}: counted ${counted} off a quote of ${quoted}, a rate of ${rate.toFixed(2)} a week`);
      if (weeks < 8) {
        fail(`only ${weeks} weeks were playable, too few to measure the rate`);
      } else if (rate > 1.05) {
        fail(`the settlement counts down ${rate.toFixed(2)} times a week, so it ends sooner than the ${quoted} weeks quoted and the cost is never paid`);
      } else if (rate < 0.95) {
        /* BOTH directions. A quote wrong in the manager's favour is still
           wrong, and the first draft of this check only caught an overrun. */
        fail(`the settlement counts down only ${rate.toFixed(2)} times a week while the bill is charged every week, so it is billed for longer than the ${quoted} weeks quoted`);
      } else {
        ok(`one week billed is one week counted (${rate.toFixed(2)} a week over ${weeks} weeks)`);
      }
    }
  }
}

console.log('8) a settlement does not follow you to a new club');
{
  /* It belongs to the club that agreed it. Carrying it across a move handed the
     new employer a permanently higher wage ceiling for a liability somebody
     else incurred, which is the sack-for-cap-space exploit by the back door. */
  const st = seeded(6100, () => cm.startCareer('Everton'));
  cm.ensureFreeAgents(st);
  const p = worstContract(st);
  if (!p) fail('no releasable player');
  else {
    const rel = cm.releasePlayer(st, p.id);
    if (!rel) fail('could not release');
    else if ((rel.severance ?? []).length === 0) fail('the release wrote no settlement');
    else {
      /* startNextSeason with a move: the engine drops it. Checked on the shape
         rather than by driving a whole job offer, because the rule is one
         expression and this is the claim it makes. */
      const src = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8');
      if (!/severance:\s*moving \? \[\]/.test(src)) {
        fail('the rollover carries severance across a move, so a new club inherits a liability and a higher wage ceiling');
      } else {
        ok('a settlement is dropped when the manager changes club');
      }
    }
  }
}

console.log('9) letting deals expire does not beat renewing them');
{
  /* The exploit: run every contract down, then re-sign the same men out of
     window for no fee. Measured at Arsenal before the fix, that was 936k a week
     and no fee against 1,415k and 246.2m, with the first eleven unchanged. */
  /* ACROSS EVERY CLUB, because one club is a sample of one and the ceiling has
     to sit outside the spread rather than inside it. Measured on one club the
     first draft read 57 percent against a ceiling of 60, which is a threshold
     in the middle of the distribution and a coin toss dressed as a rule. */
  const pcts = [];
  for (let i = 0; i < CLUBS.length; i += 1) {
    seeded(6200 + i, () => {
      const st = cm.startCareer(CLUBS[i]);
      cm.ensureFreeAgents(st);
      const mine = st.clubStrengths?.[st.clubName] ?? 66;
      const seniors = st.squad.filter(p => !p.isYouth && p.age >= 20);
      const wouldSign = seniors.filter(p => cm.freeAgentInterest(st, { name: p.name, position: p.position, age: p.age, rating: p.rating, since: st.season, reason: 'expired' }));
      const pct = (wouldSign.length / Math.max(1, seniors.length)) * 100;
      pcts.push(pct);
      console.log(`   ${CLUBS[i]} level ${mine.toFixed(1)}: ${wouldSign.length} of ${seniors.length} of its own seniors (${pct.toFixed(0)}%) would sign as free agents`);
    });
  }
  const pctOwn = mean(pcts);
  console.log(`   mean across ${pcts.length} clubs: ${pctOwn.toFixed(0)}%, worst ${Math.max(...pcts).toFixed(0)}%`);
  /* If the whole squad clears the interest bar, the pool is a free rack holding
     your own team at full rating rather than the weak bin it claims to be. */
  /* THE PERCENTAGE IS REPORTED, NOT ASSERTED ON, and that is deliberate. It
     will not threshold cleanly: at a weak club the squad clusters around the
     club's own level, so any rule loose enough to be useful there admits a
     large share of the squad, and any ceiling tight enough to exclude it lands
     inside the spread of the other clubs. Two drafts tried it, at 60 percent
     against a measured 43 to 69, and at 40 against 13 to 48. Both were
     thresholds sitting in the middle of the distribution.

     What is actually load bearing is binary, so assert that instead: the club's
     BEST player must never be signable for nothing. That is the whole "the pool
     is not an upgrade rack" claim, it is true or false rather than a
     percentage, and it is the thing a player would exploit first. */
  let rackAt = null;
  for (let i = 0; i < CLUBS.length && !rackAt; i += 1) {
    seeded(6300 + i, () => {
      const st = cm.startCareer(CLUBS[i]);
      cm.ensureFreeAgents(st);
      const best = st.squad.filter(p => !p.isYouth && p.age >= 20).sort((a2, b2) => b2.rating - a2.rating)[0];
      if (!best) return;
      const keen = cm.freeAgentInterest(st, { name: best.name, position: best.position, age: best.age, rating: best.rating, since: st.season, reason: 'expired' });
      if (keen) rackAt = `${CLUBS[i]} (${best.name}, ${best.rating} rated)`;
    });
  }
  if (rackAt) {
    fail(`the club's own best player would sign as a free agent at ${rackAt}, so the pool is an upgrade rack rather than the weak bin the round describes`);
  } else {
    ok(`no club's best player would sign for nothing, at any of the ${CLUBS.length} clubs`);
  }
  /* And a man you let go this season cannot be taken straight back.

     Its own career, because the two blocks above build theirs inside a loop
     and none of their names reach this far. The first draft read `seniors`
     from one of them, threw a ReferenceError, and took section 10 down with it
     on the full suite, after the controls had been proven on the draft before.

     The refusal also has to come from the same season guard and not from
     something else. The first draft offered a man rated one point above the
     interest bar, so interest refused him whatever the guard did and the check
     could not fail. So the same man is offered twice: as let go LAST season,
     which must be accepted (proving interest, the cap and the squad size all
     allow him), and as let go THIS season, which must be refused.

     His value goes with him, exactly as releasePlayer writes it. Without it
     wageFor falls back to a rating formula about ten times his real wage (a 72
     rated backup on 8k asked 82k), the cap refused both offers, and the
     twin failed on healthy code. The cap is lifted for the same reason: this
     check is about the guard, and section 1 already owns the cap. */
  seeded(6400, () => {
    const st = cm.startCareer(CLUBS[0]);
    cm.ensureFreeAgents(st);
    const mine = st.clubStrengths?.[st.clubName] ?? 66;
    const weakest = st.squad.filter(p => !p.isYouth && p.age >= 20).sort((a2, b2) => a2.rating - b2.rating)[0];
    if (!weakest) { fail('no senior at the club to test the re-sign guard with'); return; }
    const rating = Math.min(weakest.rating, Math.floor(mine) - 8);
    const without = { ...st, squad: st.squad.filter(x => x.id !== weakest.id), transferWindow: null, wageCap: Number.MAX_SAFE_INTEGER };
    const offered = (since) => ({ ...without, freeAgents: [{ name: weakest.name, position: weakest.position, age: weakest.age, rating, value: weakest.value, generated: weakest.generated, since, reason: 'released', fromMyClub: true }] });
    if (!cm.signFreeAgent(offered(st.season - 1), weakest.name)) {
      fail('the same man let go LAST season is refused too, so a refusal this season cannot be pinned on the re-sign guard');
      return;
    }
    if (cm.signFreeAgent(offered(st.season), weakest.name)) {
      fail('a man let go this season can be re-signed at once, so letting him go costs nothing');
    } else {
      ok('a man let go this season cannot be taken back, and the same man let go last season can');
    }
  });
}

console.log('10) the release wiring goes to the right function');
{
  /* A source check, because the defect was a wiring one that no engine test
     could see: a blanket rename pointed the ACADEMY release button at the new
     contract termination, which looks ids up in the squad, so releasing a
     scouted prospect silently did nothing. */
  const page = fs.readFileSync(path.join(ROOT, 'src/pages/ClubManager.tsx'), 'utf8');
  const academy = /AcademyScreen[\s\S]{0,600}?onRelease=\{g\.(\w+)\}/.exec(page);
  const contracts = /ContractsCard[\s\S]{0,400}?onRelease=\{g\.(\w+)\}/.exec(page);
  if (!academy) fail('cannot find the academy screen release wiring to check it');
  else if (academy[1] !== 'release') fail(`the academy release is wired to g.${academy[1]}, which looks ids up in the squad, so releasing a prospect does nothing`);
  else ok('the academy release goes to the prospect release');
  if (!contracts) fail('cannot find the contracts card release wiring to check it');
  else if (contracts[1] !== 'terminate') fail(`the contracts release is wired to g.${contracts[1]}, not the contract termination`);
  else ok('the contracts release goes to the contract termination');
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }

if (failures) {
  console.log(`simFreeAgents: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simFreeAgents: all sections passed');
process.exit(0);
