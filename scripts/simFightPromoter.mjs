/* Round 627: Fight Promoter.
 *
 * WHAT THIS HARNESS IS FOR. The mode has exactly one claim worth checking:
 * that the two ways to fill a building pull against each other. A mismatch
 * sells on a name, costs little and is forgotten. A real fight costs both
 * purses and half the time ruins your draw, and it is the only thing that
 * builds your name. If either road simply wins, this is a spreadsheet with a
 * boxing skin on it.
 *
 * Section 2 is therefore the section that proves the round, and its control is
 * the one that matters: stop reputation caring about the quality of the fights
 * and the mismatch policy must start winning outright.
 *
 * House rules as everywhere: never assert on a maximum, never assert non
 * significance, bands from measured headroom, and a negative control per
 * section that provably fires.
 *
 * CONTROLS, one per section:
 *   PROMO_CONTROL=freerent    the room costs nothing            -> section 1
 *   PROMO_CONTROL=noquality   your name ignores the fights      -> section 2
 *   PROMO_CONTROL=noprice     the ticket price stops mattering  -> section 3
 *   PROMO_CONTROL=norep       your name stops buying fighters   -> section 4
 *   PROMO_CONTROL=nodamage    fighters never wear out           -> section 5
 *   PROMO_CONTROL=nearlyfull  99 percent counts as sold out     -> section 6
 *   PROMO_CONTROL=roundedpct  the percentage rounds up          -> section 6
 *   PROMO_CONTROL=halfhouse   no room ever gets near full       -> section 6
 */

import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PROMO_CONTROL || '';

let failures = 0;
const fail = (m) => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => console.log(`   ok   ${m}`);

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

/* Per run temp dir: a fixed name shared by two concurrent runs silently mixes
   two source trees, which has happened in this repo. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fightpromo-'));
const BUNDLE = path.join(TMP, 'bundle.mjs');

const deAlias = (s) => s
  .replaceAll('@/lib/careerEngine', './careerEngine')
  .replaceAll('@/lib/fightCareer', './fightCareer');

const engineSrc = deAlias(fs.readFileSync(path.join(ROOT, 'src/lib/careerEngine.ts'), 'utf8'));
const careerSrc = deAlias(fs.readFileSync(path.join(ROOT, 'src/lib/fightCareer.ts'), 'utf8'));
let promoSrc = deAlias(fs.readFileSync(path.join(ROOT, 'src/lib/fightPromoter.ts'), 'utf8'));

function rewrite(which, anchor, replacement) {
  if (!promoSrc.includes(anchor)) {
    console.log(`   FAIL control ${which} anchor is not in the source, so it would change nothing`);
    process.exit(1);
  }
  promoSrc = promoSrc.replace(anchor, replacement);
  console.log(`   [control ${which} applied]`);
}

if (CONTROL === 'freerent') {
  rewrite('freerent', 'const profit = Math.round((gate - purses - venue.rent) * 1000) / 1000;',
    'const profit = Math.round((gate - purses) * 1000) / 1000;');
} else if (CONTROL === 'noquality') {
  rewrite('noquality',
    'const repDelta = Math.round(((meanQ - 46) / 11 + (best >= 78 ? 2.2 : 0)) * clamp(headroom * 1.6, 0.15, 1) * 10) / 10;',
    'const repDelta = Math.round((1.4) * clamp(headroom * 1.6, 0.15, 1) * 10) / 10;');
} else if (CONTROL === 'noprice') {
  rewrite('noprice',
    'const priceFactor = clamp(1.25 - (plan.ticketPrice / Math.max(1e-9, fair)) * 0.55, 0.05, 1.2);',
    'const priceFactor = 1;');
} else if (CONTROL === 'norep') {
  rewrite('norep', 'const tier = 36 + (st.reputation / 100) * 36;', 'const tier = 36;');
} else if (CONTROL === 'nodamage') {
  rewrite('nodamage', 'a.damage = Math.round((a.damage + res.damageTaken) * 10) / 10;', 'a.damage = 0;');
  rewrite('nodamage', 'c.damage = Math.round((c.damage + res.damageDealt) * 10) / 10;', 'c.damage = 0;');
} else if (CONTROL === 'nearlyfull') {
  /* The Round 630 render rule, put back into the lib. */
  rewrite('nearlyfull', 'const soldOut = attendance >= capacity;',
    'const soldOut = Math.round((attendance / capacity) * 100) >= 99;');
} else if (CONTROL === 'roundedpct') {
  rewrite('roundedpct', 'const percent = soldOut ? 100 : clamp(Math.floor((attendance / capacity) * 100), 0, 99);',
    'const percent = soldOut ? 100 : clamp(Math.round((attendance / capacity) * 100), 0, 100);');
} else if (CONTROL === 'halfhouse') {
  rewrite('halfhouse', 'const pull = clamp((cardAppeal / 46) * (0.6 + st.reputation / 110), 0, 1.25);',
    'const pull = clamp((cardAppeal / 46) * (0.6 + st.reputation / 110), 0, 0.5);');
} else if (CONTROL) {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}

fs.writeFileSync(path.join(TMP, 'careerEngine.ts'), engineSrc);
fs.writeFileSync(path.join(TMP, 'fightCareer.ts'), careerSrc);
fs.writeFileSync(path.join(TMP, 'fightPromoter.ts'), promoSrc);
fs.writeFileSync(path.join(TMP, 'entry.ts'), `export * as pr from './fightPromoter';\nexport * as fc from './fightCareer';\n`);
execSync(`"${findEsbuild()}" "${path.join(TMP, 'entry.ts')}" --bundle --format=esm --platform=node --outfile="${BUNDLE}"`, { stdio: 'pipe' });
const { pr, fc } = await import(pathToFileURL(BUNDLE).href);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const median = (xs) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Every legal pairing in the pool, with what it would sell and what it costs. */
function options(st) {
  const out = [];
  for (let i = 0; i < st.pool.length; i += 1) {
    for (let j = i + 1; j < st.pool.length; j += 1) {
      const a = st.pool[i];
      const b = st.pool[j];
      if (!pr.legalMatch(a, b)) continue;
      out.push({
        aId: a.id, bId: b.id, rounds: 8, title: false,
        appeal: pr.appealOf(a, b, false),
        gap: Math.abs(fc.ratingOf(a) - fc.ratingOf(b)),
        purse: pr.purseFor(a, b, false),
        draw: pr.drawOf(a) + pr.drawOf(b),
      });
    }
  }
  return out;
}

/**
 * MATCHMAKING POLICIES, and the two that matter differ in exactly one thing:
 * what they optimise when choosing who fights whom.
 *
 *   mismatch  the biggest name against the softest opponent available.
 *   evenfight the closest fight available, whatever the names.
 *   balanced  the highest appeal, which is the honest middle.
 */
const PICKERS = {
  /* FEEDING A NAME, which is a big draw against somebody who cannot live with
     him. The first draft sorted by draw and then re-sorted by gap, so the
     second sort threw the first away and the policy was "any lopsided pairing",
     names or not. That is not what a promoter does and it is not what the mode
     claims: the whole point of a mismatch is that the NAME sells it. */
  mismatch: (opts) => opts.slice().sort((x, y) => (y.draw * 1.2 + y.gap) - (x.draw * 1.2 + x.gap)).slice(0, 3),
  evenfight: (opts) => opts.slice().sort((x, y) => x.gap - y.gap).slice(0, 3),
  balanced: (opts) => opts.slice().sort((x, y) => y.appeal - x.appeal).slice(0, 3),
};

/** The best room this promoter can currently take, and a sane ticket price. */
function planFor(st, picker, priceMult = 1) {
  const opts = options(st);
  if (!opts.length) return null;
  const bookings = PICKERS[picker](opts).map(o => ({ aId: o.aId, bId: o.bId, rounds: o.rounds, title: o.title }));
  if (!bookings.length) return null;
  const affordable = pr.VENUES.filter(v => v.needs <= st.reputation && v.rent <= Math.max(0.02, st.money * 0.7));
  const venue = affordable.length ? affordable[affordable.length - 1] : pr.VENUES[0];
  /* Price from what the card is worth rather than a constant, which is what a
     promoter actually does. The multiplier is how section 3 sweeps it. */
  const appeal = mean(PICKERS[picker](opts).map(o => o.appeal));
  const fair = 0.00004 + (appeal / 46) * 0.00026;
  return { venueId: venue.id, ticketPrice: fair * priceMult, bookings };
}

function runPromoter(seed, picker, shows = 40, priceMult = 1) {
  let st = pr.newPromoter(`P${seed}`, `promo-${seed}`);
  let ran = 0;
  let profitable = 0;
  const crowds = [];
  for (let i = 0; i < shows && !st.closed; i += 1) {
    const plan = planFor(st, picker, priceMult);
    if (!plan) break;
    const r = pr.runShow(st, plan);
    if (!r) break;
    st = r.state;
    ran += 1;
    crowds.push(r.result.attendance);
    if (r.result.profit > 0) profitable += 1;
  }
  const v = pr.promoterVerdict(st);
  return {
    closed: st.closed, shows: ran, money: st.money, reputation: st.reputation,
    profitable, crowd: crowds.length ? mean(crowds) : 0, score: v.score,
    poolMean: mean(st.pool.map(f => fc.ratingOf(f))),
    hurt: st.pool.filter(f => f.damage >= 40).length,
  };
}

const fleet = (picker, n, shows = 40, priceMult = 1) =>
  Array.from({ length: n }, (_, i) => runPromoter(3000 + i * 47, picker, shows, priceMult));

const N = 90;
console.log('simFightPromoter');
console.log(`   ${N} promoters per policy, 40 shows each${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);

/* ═══════════════ 1) the business can be run ═══════════════ */
console.log('1) a sensibly run promotion survives and grows');
{
  const runs = fleet('balanced', N);
  const alive = runs.filter(r => !r.closed).length;
  const pctAlive = (alive / runs.length) * 100;
  console.log(`   survived 40 shows: ${alive} of ${runs.length} (${pctAlive.toFixed(1)}%)`);
  console.log(`   reputation ${mean(runs.map(r => r.reputation)).toFixed(1)}, average house ${Math.round(mean(runs.map(r => r.crowd))).toLocaleString()}, money ${mean(runs.map(r => r.money)).toFixed(3)}m`);
  if (pctAlive < 35) fail(`only ${pctAlive.toFixed(1)}% of promotions survive, so the mode is not playable (floor 35%)`);
  else ok(`${pctAlive.toFixed(1)}% survive 40 shows (floor 35%)`);
  /* And it must be possible to LOSE, or the money is decoration. */
  const anyLoss = runs.filter(r => r.profitable < r.shows).length;
  if (!(anyLoss > 0)) fail('no promotion ever put on a show that lost money, so the economics are decoration');
  else ok(`${anyLoss} of ${runs.length} promotions ran at least one show at a loss`);
}

/* ═══════════════ 2) THE SECTION THAT PROVES THE ROUND ═══════════════ */
console.log('2) neither matchmaking road wins on its own');
{
  const mis = fleet('mismatch', N);
  const even = fleet('evenfight', N);
  const misMoney = mean(mis.map(r => r.money));
  const evenMoney = mean(even.map(r => r.money));
  const misRep = mean(mis.map(r => r.reputation));
  const evenRep = mean(even.map(r => r.reputation));
  console.log(`   money:      mismatches ${misMoney.toFixed(3)}m, real fights ${evenMoney.toFixed(3)}m`);
  console.log(`   reputation: mismatches ${misRep.toFixed(1)}, real fights ${evenRep.toFixed(1)}`);
  console.log(`   verdict:    mismatches ${mean(mis.map(r => r.score)).toFixed(1)}, real fights ${mean(even.map(r => r.score)).toFixed(1)}`);

  /* The claim, as a direction on each axis with a margin from measured
     headroom. Not a spread band, and not a claim that the two are the same. */
  if (!(evenRep > misRep + 4)) {
    fail(`making real fights is worth only ${(evenRep - misRep).toFixed(1)} reputation over feeding mismatches (margin 4), so the counterweight does not exist`);
  } else {
    ok(`real fights are worth ${(evenRep - misRep).toFixed(1)} reputation over mismatches (margin 4)`);
  }
  /* 2b) AND THE TEMPTATION IS MEASURED AT THE DECISION, not over forty shows.
     The compounded comparison cannot see it, for the same reason the gym round
     found: over a long run a promoter who fed mismatches kept his reputation
     low, and a low reputation means he cannot hold the very star he was
     protecting, so the whole advantage is eaten by a second mechanism. What the
     player actually faces is one question on one night: this main event or that
     one. So hold the state, the room and the price still, and compare what the
     two cards take at the door.

     Both roads winning on a compounded mean is also the wrong SHAPE of check.
     A strict inequality between two means is a knife edge that will always
     favour one side by some margin, so "wins" here needs a material margin or
     it is a coin toss dressed as a rule. */
  const doorGaps = [];
  for (let s = 0; s < 60; s += 1) {
    let st = pr.newPromoter(`D${s}`, `door-${s}`);
    for (let i = 0; i < 8 && !st.closed; i += 1) {
      const p = planFor(st, 'balanced');
      if (!p) break;
      const r = pr.runShow(st, p);
      if (!r) break;
      st = r.state;
    }
    const opts = options(st);
    if (opts.length < 4) continue;
    const venue = pr.VENUES.filter(v => v.needs <= st.reputation).slice(-1)[0] || pr.VENUES[0];
    const price = 0.00022;
    const take = (picker) => {
      const bookings = PICKERS[picker](opts).map(o => ({ aId: o.aId, bId: o.bId, rounds: o.rounds, title: o.title }));
      if (!bookings.length) return null;
      const plan = { venueId: venue.id, ticketPrice: price, bookings };
      return pr.expectedAttendance(st, plan) * price;
    };
    const m = take('mismatch');
    const e = take('evenfight');
    if (m === null || e === null || e <= 0) continue;
    doorGaps.push((m - e) / e);
  }
  const lift = mean(doorGaps);
  console.log(`   at the door, same room and price, ${doorGaps.length} states: the mismatch card takes ${lift >= 0 ? '+' : ''}${(lift * 100).toFixed(1)}% against the real fight`);
  if (doorGaps.length < 20) {
    fail(`only ${doorGaps.length} states reached the door comparison`);
  } else if (!(lift > 0.05)) {
    fail(`feeding a name takes only ${(lift * 100).toFixed(1)}% more at the door (margin 5%), so there is nothing tempting about it and the matchmaking has no decision in it`);
  } else {
    ok(`feeding a name takes ${(lift * 100).toFixed(1)}% more at the door tonight, and costs ${(evenRep - misRep).toFixed(1)} reputation over a career`);
  }
}

/* ═══════════════ 3) the ticket price is a real lever ═══════════════ */
console.log('3) pricing the room is a decision, not a slider');
{
  /* MEASURED ON ONE SHOW AT A FIXED STATE, not on money compounded over
     twenty four of them. The compounded version could not isolate the price at
     all: a promoter who banked more money books a bigger room next time, so the
     venue ladder and the reputation curve were both inside the number, and it
     duly reported that the dearest ticket was simply correct. The question is
     what one card takes at the door, so hold the card, the room and the
     promoter still and sweep only the price. */
  const sweep = [];
  for (let s = 0; s < 40; s += 1) {
    let st = pr.newPromoter(`X${s}`, `price-${s}`);
    /* Play a few shows so the state is a real one rather than the opening. */
    for (let i = 0; i < 6 && !st.closed; i += 1) {
      const p = planFor(st, 'balanced');
      if (!p) break;
      const r = pr.runShow(st, p);
      if (!r) break;
      st = r.state;
    }
    const base = planFor(st, 'balanced');
    if (!base) continue;
    const row = { att: {} };
    for (const mult of [0.4, 0.55, 0.7, 0.85, 1, 1.2, 1.45, 1.7, 2.1]) {
      const plan = { ...base, ticketPrice: base.ticketPrice * mult };
      const att = pr.expectedAttendance(st, plan);
      row.att[mult] = att;
      row[mult] = att * plan.ticketPrice;
    }
    sweep.push(row);
  }
  if (sweep.length < 15) { fail(`only ${sweep.length} states reached the price sweep`); }
  else {
    const mults = [0.4, 0.55, 0.7, 0.85, 1, 1.2, 1.45, 1.7, 2.1];
    const takes = mults.map(m => mean(sweep.map(r => r[m])));
    console.log('   gate by ticket price: ' + mults.map((m, i) => `${m}x ${takes[i].toFixed(3)}m`).join(', '));
    const bestI = takes.indexOf(Math.max(...takes));
    console.log(`   best price multiplier ${mults[bestI]}x`);
    /* The HOUSE must empty as the price rises, which is the mechanism. The
       first draft compared the gate money at the two ends and called it
       attendance, so it was asking whether a dear ticket takes less than a
       cheap one, which is a different question and not the one the mechanism
       answers. */
    const houses = sweep.map(r => r.att);
    const cheapHouse = mean(houses.map(h => h[0.4]));
    const dearHouse = mean(houses.map(h => h[2.1]));
    console.log(`   house at 0.4x ${Math.round(cheapHouse).toLocaleString()}, at 2.1x ${Math.round(dearHouse).toLocaleString()}`);
    if (!(dearHouse < cheapHouse)) fail('the house does not empty as the price rises, so the price is not a lever');
    else ok(`the price moves the house, ${Math.round(cheapHouse).toLocaleString()} down to ${Math.round(dearHouse).toLocaleString()}`);
    /* And the optimum must be INSIDE the range, so both extremes are wrong.
       An optimum at either end means one direction is simply correct and there
       is no decision to make. */
    if (bestI === 0 || bestI === mults.length - 1) {
      fail(`pricing has no interior optimum: the best take is at ${mults[bestI]}x, the end of the range, so one direction is simply correct`);
    } else {
      ok(`pricing has an interior optimum at ${mults[bestI]}x, and both extremes take less`);
    }
  }
}

/* ═══════════════ 4) your name buys the fighters ═══════════════ */
console.log('4) a promotion with a name attracts better fighters');
{
  const low = pr.newPromoter('low', 'poolseed-low');
  const high = { ...pr.newPromoter('high', 'poolseed-high'), reputation: 92 };
  const sample = (st, rounds) => {
    const out = [];
    let s = st;
    for (let i = 0; i < rounds; i += 1) {
      const plan = planFor(s, 'balanced');
      if (!plan) break;
      const r = pr.runShow(s, plan);
      if (!r) break;
      s = { ...r.state, reputation: st.reputation, money: 50 };
      out.push(mean(s.pool.map(f => fc.ratingOf(f))));
    }
    return out;
  };
  const lo = mean(sample(low, 14));
  const hi = mean(sample(high, 14));
  console.log(`   pool rating: name 5 gives ${lo.toFixed(1)}, name 92 gives ${hi.toFixed(1)}`);
  if (!(hi > lo + 6)) fail(`your name barely changes who will work for you: ${lo.toFixed(1)} against ${hi.toFixed(1)} (margin 6)`);
  else ok(`a name is worth ${(hi - lo).toFixed(1)} rating points on the fighters you can book (margin 6)`);
}

/* ═══════════════ 5) fighters wear out and the pool turns over ═══════════════ */
console.log('5) the men on your shows are not props');
{
  const runs = fleet('balanced', N, 60);
  const hurt = mean(runs.map(r => r.hurt));
  console.log(`   fighters carrying real damage after 60 shows: ${hurt.toFixed(2)} of 10 in the pool`);
  /* Floor from the measured gap: healthy code carries several, and the control
     drives it to exactly zero. */
  if (!(hurt >= 0.5)) fail(`nobody on the shows ever gets hurt (${hurt.toFixed(2)} of 10), so the fighters are props (floor 0.5)`);
  else ok(`${hurt.toFixed(2)} of 10 in the pool carry real damage (floor 0.5)`);
}

/* ═══════════════ 6) the house bar tells the truth about the seats ═══════════════ */
console.log('6) "sold out" means every seat, and the percentage never reads fuller than the room');
{
  /* Round 630 worked the house out inside the render, rounded it, and called
     99 a sell out, so a room with 147 empty seats got the label and the gold
     confetti. Both claims are binary and checked on every show: the label
     against the seats, and the percentage against the true share.

     The sample runs three ticket prices so it reaches the rooms that matter.
     A sample that never gets near a full house cannot see this defect at all,
     so it has to prove it got there before its zeros mean anything. */
  let shows = 0, soldOut = 0, nearly = 0, labelLies = 0, missedSellOut = 0, overstated = 0;
  let example = '';
  for (const picker of ['balanced', 'mismatch']) {
    for (const mult of [0.3, 0.6, 1]) {
      for (let seed = 0; seed < 60; seed += 1) {
        let st = pr.newPromoter(`H${seed}`, `house-${picker}-${mult}-${seed}`);
        for (let i = 0; i < 40 && !st.closed; i += 1) {
          const plan = planFor(st, picker, mult);
          if (!plan) break;
          const r = pr.runShow(st, plan);
          if (!r) break;
          st = r.state;
          shows += 1;
          const { attendance, venue } = r.result;
          const cap = venue.capacity;
          const fill = pr.houseFill(attendance, cap);
          if (attendance >= cap) soldOut += 1;
          else if (attendance * 1000 >= cap * 985) nearly += 1;
          if (fill.soldOut && attendance < cap) {
            labelLies += 1;
            if (!example) example = `${venue.name}: ${attendance.toLocaleString()} of ${cap.toLocaleString()} reads sold out with ${(cap - attendance).toLocaleString()} empty`;
          }
          if (!fill.soldOut && attendance >= cap) missedSellOut += 1;
          if (fill.percent * cap > attendance * 100) overstated += 1;
        }
      }
    }
  }
  console.log(`   ${shows} shows: ${soldOut} sold out, ${nearly} at 98.5% or more with seats still empty`);
  /* Measured on healthy code: 1,795 full rooms and 88 nearly full ones over
     13,730 shows, so a floor of 20 on each sits well under both. The
     halfhouse control caps the crowd and drives both to zero. */
  if (soldOut < 20 || nearly < 20) {
    fail(`the sample reached only ${soldOut} full rooms and ${nearly} nearly full ones (floor 20 each), so the zeros below cannot see a false sell out`);
  } else {
    ok(`the sample reaches the rooms that matter: ${soldOut} full, ${nearly} nearly full (floor 20 each)`);
  }
  if (labelLies > 0) fail(`${labelLies} shows say sold out with seats still empty, for example ${example}`);
  else ok('no show says sold out with an empty seat');
  if (missedSellOut > 0) fail(`${missedSellOut} full rooms do not say sold out`);
  else ok('every full room says sold out');
  if (overstated > 0) fail(`${overstated} shows read a fuller percentage than the room was`);
  else ok('the percentage never reads fuller than the room was');
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }

if (failures) {
  console.log(`simFightPromoter: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simFightPromoter: all sections passed');
process.exit(0);
