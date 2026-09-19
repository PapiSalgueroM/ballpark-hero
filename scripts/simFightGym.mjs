/* Round 625: Fight Gym.
 *
 * WHAT THIS HARNESS IS FOR. The gym mode has one claim that has to be true or
 * the whole thing is distasteful as well as broken: that running fighters into
 * the ground must not be the winning strategy. In the career mode the damage
 * lands on you and the tradeoff enforces itself. In the gym the damage lands on
 * somebody else and the money lands on you, so nothing enforces it except the
 * design. Section 2 is the section that proves the round, and its control is
 * the one that matters: remove the reputation cost of wrecking men and the
 * grinding policy must start winning, because if it does not then that cost was
 * never load bearing and the mode does not say what it claims to say.
 *
 * The repo's harness rules apply as they do everywhere: never assert on a
 * maximum, never assert non significance, bands from measured headroom, and a
 * negative control per section that provably fires.
 *
 * CONTROLS, one per section:
 *   GYM_CONTROL=nocut        the gym takes no cut of a purse   -> section 1
 *   GYM_CONTROL=nopenalty    wrecking a fighter costs nothing  -> section 2
 *   GYM_CONTROL=norep        reputation stops buying prospects -> section 3
 *   GYM_CONTROL=noretire     fighters never finish             -> section 4
 *   GYM_CONTROL=freecost     the bills stop arriving           -> section 5
 *   GYM_CONTROL=strongpin    Round 628's clamped bar is back   -> section 6
 */

import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.GYM_CONTROL || '';

let failures = 0;
const fail = (m) => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => console.log(`   ok   ${m}`);

/* A worktree carries no node_modules of its own, so walk up for the binary.
   Same reason as scripts/simFightCareer.mjs. */
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

/* Per run temp dir: concurrent runs sharing one fixed filename have silently
   mixed two source trees in this repo before. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fightgym-'));
const BUNDLE = path.join(TMP, 'bundle.mjs');

const deAlias = (s) => s
  .replaceAll('@/lib/careerEngine', './careerEngine')
  .replaceAll('@/lib/fightCareer', './fightCareer');

/* Line endings normalised before any control reads this text. See the same
   block in simFightCareer.mjs: Anthony's checkout is CRLF, an anchor written
   here is LF, so a multi line anchor can never match and its control silently
   changes nothing. `noretire` below is four lines long and had never fired. */
const readSrc = p => deAlias(fs.readFileSync(path.join(ROOT, p), 'utf8').replaceAll('\r\n', '\n'));
let engineSrc = readSrc('src/lib/careerEngine.ts');
let careerSrc = readSrc('src/lib/fightCareer.ts');
let gymSrc = readSrc('src/lib/fightGym.ts');

/* Each control asserts its anchor exists BEFORE it edits. A control that
   rewrites a string the file does not contain changes nothing, the harness
   stays green, and green then means the control did not fire. */
function rewrite(which, anchor, replacement, inCareer = false) {
  const target = inCareer ? careerSrc : gymSrc;
  if (!target.includes(anchor)) {
    console.log(`   FAIL control ${which} anchor is not in the source, so it would change nothing`);
    process.exit(1);
  }
  if (inCareer) careerSrc = target.replace(anchor, replacement);
  else gymSrc = target.replace(anchor, replacement);
  console.log(`   [control ${which} applied]`);
}

if (CONTROL === 'nocut') {
  rewrite('nocut',
    'return 0.2 + (g.reputation / 100) * 0.15;',
    'return 0;');
} else if (CONTROL === 'nopenalty') {
  rewrite('nopenalty',
    'const penalty = f.damage >= 70 ? 4.5 : f.damage >= 50 ? 1.8 : 0;',
    'const penalty = 0;');
  rewrite('nopenalty',
    '  if (fighter.damage >= 55) rep -= 1.7;\n  if (fighter.damage >= 70) rep -= 2.6;',
    '  if (false) rep -= 1.7;');
  rewrite('nopenalty',
    "if (!won && (result.method === 'KO' || result.method === 'TKO') && fighter.damage > 45) rep -= 3.2;",
    "if (false) rep -= 3.2;");
} else if (CONTROL === 'norep') {
  rewrite('norep',
    'const tier = 38 + (g.reputation / 100) * 34;',
    'const tier = 38;');
} else if (CONTROL === 'noretire') {
  rewrite('noretire',
    '  if (f.age >= 39) return true;\n  if (f.damage >= 82) return true;\n  if (f.age >= 34 && f.damage >= 58) return true;\n  return false;',
    '  return false;');
} else if (CONTROL === 'freecost') {
  rewrite('freecost',
    'return Math.round((0.012 + g.roster.length * 0.009) * 1000) / 1000;',
    'return 0;');
} else if (CONTROL === 'strongpin') {
  /* Round 636: the bars come from fightCareer.ts, so this one edits that
     file. Round 628's straight line clamped at the floor, put back exactly. */
  rewrite('strongpin',
    '  if (straight >= SOFT_FLOOR_FROM) return straight;',
    '  return Math.max(STANDING_FLOOR, straight);', true);
} else if (CONTROL) {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}

fs.writeFileSync(path.join(TMP, 'careerEngine.ts'), engineSrc);
fs.writeFileSync(path.join(TMP, 'fightCareer.ts'), careerSrc);
fs.writeFileSync(path.join(TMP, 'fightGym.ts'), gymSrc);
fs.writeFileSync(path.join(TMP, 'entry.ts'), `export * as gym from './fightGym';\nexport * as fc from './fightCareer';\n`);
execSync(`"${findEsbuild()}" "${path.join(TMP, 'entry.ts')}" --bundle --format=esm --platform=node --outfile="${BUNDLE}"`, { stdio: 'pipe' });
const { gym, fc } = await import(pathToFileURL(BUNDLE).href);

const TACTICS = ['box', 'press', 'counter', 'brawl'];
const bestTactic = (style) => TACTICS.find(t => fc.tacticEdge(t, style) > 0) || 'box';
const styleThatBeats = (t) => ['outboxer', 'swarmer', 'slugger', 'counter'].find(s => fc.tacticEdge(t, s) < 0);
function smartLine(style, n) {
  const out = [];
  let expect = style;
  for (let i = 0; i < n; i += 1) {
    const t = bestTactic(expect);
    out.push(t);
    expect = styleThatBeats(t) || style;
  }
  return out;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const median = (xs) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/**
 * POLICIES. The two that matter are careful and grinder, and section 2 is the
 * comparison between them.
 *
 *   careful  retires a man before he is wrecked and keeps the roster fresh.
 *   grinder  never lets anybody go and always takes the biggest purse, so the
 *            damaged keep earning until they physically cannot.
 */
const POLICIES = {
  careful: {
    releaseAt: 52,
    pickOffer: (offers) => offers[Math.min(1, offers.length - 1)],
    train: true,
  },
  /* IDENTICAL TO careful EXCEPT FOR ONE FIELD, and that is the whole point.
     The first draft of this policy also always took the hardest fight and never
     trained, so it differed from careful in three ways at once. It duly lost by
     55 points, and its negative control could not move that, because most of
     the gap came from taking step ups and losing them rather than from anything
     to do with damaged men. A comparison that changes three things measures
     none of them. Only releaseAt differs here, so section 2 is a clean test of
     one question: what happens when you keep sending out men who are finished. */
  grinder: {
    releaseAt: Infinity,
    pickOffer: (offers) => offers[Math.min(1, offers.length - 1)],
    train: true,
  },
  balanced: {
    releaseAt: 66,
    pickOffer: (offers) => offers[Math.min(1, offers.length - 1)],
    train: true,
  },
};

function runGym(seed, policyName, weeks = 160) {
  const pol = POLICIES[policyName];
  let g = gym.newGym(`G${seed}`, `gymseed-${seed}`);
  let fights = 0;
  for (let w = 0; w < weeks && !g.closed; w += 1) {
    /* Let go of anybody past this policy's line. */
    for (const f of g.roster.slice()) {
      if (f.damage >= pol.releaseAt) {
        const r = gym.releaseFighter(g, f.id);
        if (r) g = r;
      }
    }
    /* Sign while there is room and money. */
    if (g.roster.length < 4) {
      const affordable = g.prospects.filter(p => p.fee <= g.money * 0.6);
      if (affordable.length) {
        const s = gym.signProspect(g, affordable[affordable.length - 1].id);
        if (s) g = s;
      }
    }
    /* Put somebody in. Pick the healthiest man who can earn. */
    const able = g.roster.filter(f => f.damage < 80).sort((a, b) => a.damage - b.damage);
    if (able.length) {
      const f = able[0];
      const offers = gym.offersForFighter(g, f.id);
      if (offers.length) {
        const o = pol.pickOffer(offers);
        const res = gym.takeGymFight(g, f.id, o, smartLine(o.opponent.style, o.rounds));
        if (res) { g = res.state; fights += 1; }
      }
    } else if (pol.train && g.money > gym.TRAIN_COST * 3 && g.roster.length) {
      const t = gym.trainFighter(g, g.roster[0].id);
      if (t) g = t;
    }
    g = gym.advanceWeek(g);
  }
  const v = gym.gymVerdict(g);
  return {
    closed: g.closed,
    weeksRun: g.week,
    money: g.money,
    reputation: g.reputation,
    titles: g.titles,
    fights,
    alumni: g.alumni.length,
    wrecked: g.alumni.filter(a => a.damage >= 70).length,
    clean: g.alumni.filter(a => a.damage < 45).length,
    earned: Math.round(g.history.reduce((a, h) => a + h.cut, 0) * 1000) / 1000,
    score: v.score,
  };
}

const fleet = (policy, n, weeks) => Array.from({ length: n }, (_, i) => runGym(2000 + i * 53, policy, weeks));

const N = 120;
console.log('simFightGym');
console.log(`   ${N} gyms per policy, 160 weeks each${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);

/* ═══════════════ 1) a gym can actually be run ═══════════════ */
console.log('1) a carefully run gym survives and grows');
{
  const careful = fleet('careful', N, 160);
  const survived = careful.filter(r => !r.closed).length;
  const pct = (survived / careful.length) * 100;
  console.log(`   survived 160 weeks: ${survived} of ${careful.length} (${pct.toFixed(1)}%)`);
  console.log(`   reputation ${mean(careful.map(r => r.reputation)).toFixed(1)}, fights ${mean(careful.map(r => r.fights)).toFixed(1)}, titles ${mean(careful.map(r => r.titles)).toFixed(2)}`);
  if (pct < 40) fail(`only ${pct.toFixed(1)}% of carefully run gyms survive, so the mode is not playable (floor 40%)`);
  else ok(`${pct.toFixed(1)}% of carefully run gyms survive (floor 40%)`);
  const repGrew = mean(careful.map(r => r.reputation));
  if (!(repGrew > 8)) fail(`reputation does not grow: ends at ${repGrew.toFixed(1)} against a start of 8`);
  else ok(`reputation grows from 8 to ${repGrew.toFixed(1)}`);
}

/* ═══════════════ 2) THE SECTION THAT PROVES THE ROUND ═══════════════ */
console.log('2) running men into the ground is not the winning strategy');
{
  const careful = fleet('careful', N, 160);
  const grinder = fleet('grinder', N, 160);
  const cs = mean(careful.map(r => r.score));
  const gs = mean(grinder.map(r => r.score));
  console.log(`   verdict: careful ${cs.toFixed(1)}, grinder ${gs.toFixed(1)}`);
  console.log(`   wrecked fighters: careful ${mean(careful.map(r => r.wrecked)).toFixed(2)}, grinder ${mean(grinder.map(r => r.wrecked)).toFixed(2)}`);
  console.log(`   reputation: careful ${mean(careful.map(r => r.reputation)).toFixed(1)}, grinder ${mean(grinder.map(r => r.reputation)).toFixed(1)}`);
  /* Direction with a margin taken from measured headroom, on means over a
     fleet, never a max and never a claim that the two are the same. */
  if (!(cs > gs + 5)) {
    fail(`grinding pays: careful ${cs.toFixed(1)} against grinder ${gs.toFixed(1)}, margin needed 5`);
  } else {
    ok(`caring for fighters beats grinding them by ${(cs - gs).toFixed(1)} (margin 5)`);
  }
  /* And the mechanism must be real, not an accident of some other number. */
  const wc = mean(careful.map(r => r.wrecked));
  const wg = mean(grinder.map(r => r.wrecked));
  if (!(wg > wc)) fail(`the grinding policy does not actually wreck more fighters (${wg.toFixed(2)} against ${wc.toFixed(2)})`);
  else ok(`grinding wrecks ${(wg - wc).toFixed(2)} more fighters per gym`);

  /* 2c) AND IT HAS TO BE TEMPTING, which is the half a first draft of this
     harness never asked. A choice that loses on every axis at once is not a
     moral decision, it is a clearly labelled wrong button, and proving nobody
     presses it proves nothing about the design. Grinding must pay BETTER in the
     money, right up until the reputation bill arrives. If it does not, the
     mode has no decision in it however virtuous the verdict looks.

     MEASURED IN THE SHORT RUN, on purpose. Over a full career the careful gym
     also earns more per fight, but only because its reputation has grown and
     reputation buys a bigger cut of every purse. That is the bill arriving, not
     the temptation failing, and averaging across the whole run hides the thing
     being tested. The claim is "it pays NOW and costs LATER", so the now is
     measured while both gyms still have the same name and the same cut.

     AND MEASURED ON THE TILL, not on gross earnings. Letting a man go does not
     only cost you his purses, it costs you the signing fee for whoever replaces
     him, and that second half is most of the temptation. Comparing gross income
     alone put the two policies 0.5 percent apart, which is inside the noise and
     is a coin toss dressed as a rule rather than a measured claim.

     AND IT IS A PAIRED EXPERIMENT, not a fleet average, because the question is
     about ONE decision and a fleet average cannot see it. Two earlier drafts
     compared whole policies over 40 and then 90 weeks and read 1.6 and 2.8
     percent apart, which is noise, for a simple reason: at those horizons the
     two policies have barely diverged, and by the time they have, the
     reputation bill has already been paid and is what the number is measuring.
     So build a gym until somebody is actually hurt, then fork the identical
     state and play both branches: keep him and fight him, or let him go, pay
     for a replacement and fight that man instead. Same gym, same week, same
     money, one decision different. */
  const deltas = [];
  const tills = [];
  for (let s = 0; s < 90; s += 1) {
    let g = gym.newGym(`T${s}`, `tempt-${s}`);
    let guard = 0;
    while (!g.closed && guard < 240 && !g.roster.some(f => f.damage >= 52)) {
      const able = g.roster.filter(f => f.damage < 80).sort((a, b) => a.damage - b.damage);
      if (able.length) {
        const offers = gym.offersForFighter(g, able[0].id);
        if (offers.length) {
          const o = offers[1];
          const r = gym.takeGymFight(g, able[0].id, o, smartLine(o.opponent.style, o.rounds));
          if (r) g = r.state;
        }
      }
      if (g.roster.length < 4) {
        const aff = g.prospects.filter(p => p.fee <= g.money * 0.6);
        if (aff.length) {
          const sx = gym.signProspect(g, aff[aff.length - 1].id);
          if (sx) g = sx;
        }
      }
      g = gym.advanceWeek(g);
      guard += 1;
    }
    const hurt = g.roster.find(f => f.damage >= 52);
    if (!hurt || g.closed) continue;

    const play = (start, keepHim) => {
      let x = start;
      if (!keepHim) {
        const rel = gym.releaseFighter(x, hurt.id);
        if (rel) x = rel;
        const aff = x.prospects.filter(p => p.fee <= x.money * 0.7);
        if (aff.length) {
          const sx = gym.signProspect(x, aff[aff.length - 1].id);
          if (sx) x = sx;
        }
      }
      for (let w = 0; w < 14 && !x.closed; w += 1) {
        const pick = keepHim
          ? x.roster.find(f => f.id === hurt.id)
          : x.roster.filter(f => f.damage < 80).sort((a, b) => a.damage - b.damage)[0];
        if (pick) {
          const offers = gym.offersForFighter(x, pick.id);
          if (offers.length) {
            const o = offers[1];
            const r = gym.takeGymFight(x, pick.id, o, smartLine(o.opponent.style, o.rounds));
            if (r) x = r.state;
          }
        }
        x = gym.advanceWeek(x);
      }
      return x.money;
    };
    const keep = play(g, true);
    const swap = play(g, false);
    deltas.push(keep - swap);
    tills.push(swap);
  }
  const lift = mean(deltas);
  const base = Math.max(0.001, Math.abs(mean(tills)));
  console.log(`   paired at the moment of choice, ${deltas.length} gyms: keeping the hurt man is worth ${lift >= 0 ? '+' : ''}${lift.toFixed(3)}m over 14 weeks (${((lift / base) * 100).toFixed(1)}% of the till)`);
  if (deltas.length < 30) {
    fail(`only ${deltas.length} gyms reached the decision, too few to measure it`);
  } else if (!(lift > 0)) {
    fail(`keeping the hurt man pays ${lift.toFixed(3)}m, so it is a wrong button rather than a temptation and the mode has no decision in it`);
  } else {
    ok(`keeping the hurt man pays ${lift.toFixed(3)}m in the short run, and costs ${(cs - gs).toFixed(1)} verdict points in the long run`);
  }
}

/* ═══════════════ 3) reputation buys better prospects ═══════════════ */
console.log('3) a gym with a name is shown better fighters');
{
  const low = gym.newGym('low', 'repseed-low');
  const high = { ...gym.newGym('high', 'repseed-high'), reputation: 92 };
  const rate = (g, n) => {
    const out = [];
    let s = g;
    for (let i = 0; i < n; i += 1) {
      const ps = gym.prospectsFor(s);
      for (const p of ps) out.push(fc.ratingOf(p.fighter));
      s = { ...s, rngTick: s.rngTick + 40 };
    }
    return out;
  };
  const lo = rate(low, 60);
  const hi = rate(high, 60);
  const lm = mean(lo);
  const hm = mean(hi);
  console.log(`   prospect rating: reputation 8 gives ${lm.toFixed(1)}, reputation 92 gives ${hm.toFixed(1)}`);
  if (!(hm > lm + 8)) fail(`reputation barely changes who walks in: ${lm.toFixed(1)} against ${hm.toFixed(1)}, margin 8`);
  else ok(`reputation is worth ${(hm - lm).toFixed(1)} rating points on a prospect (margin 8)`);
}

/* ═══════════════ 4) fighters finish, and the gym turns over ═══════════════ */
console.log('4) nobody fights forever');
{
  /* The policy that NEVER lets anybody go, on purpose. Using a policy that
     releases fighters made this section test the test rather than the engine:
     turnover happened because the harness chose to release at 66 damage, so the
     control that stops fighters ever finishing left it green. With a policy
     that never releases, the only way anybody can leave is the engine deciding
     he is finished, which is the thing the section claims. */
  const runs = fleet('grinder', N, 220);
  const alumni = mean(runs.map(r => r.alumni));
  const stillOpen = runs.filter(r => !r.closed);
  console.log(`   fighters who came and went per gym: ${alumni.toFixed(2)} over 220 weeks`);
  /* Floor from the measured gap, not from a round number. Healthy code sits at
     about 1.17 and the control drives it to exactly 0.00, so 0.5 separates them
     with room on both sides. A floor of 1 sat inside the healthy distribution,
     which is a coin toss dressed as a rule. */
  if (!(alumni >= 0.5)) fail(`no turnover: ${alumni.toFixed(2)} fighters left per gym, so men fight forever (floor 0.5)`);
  else ok(`${alumni.toFixed(2)} fighters per gym came through and left through the engine alone (floor 0.5)`);
  if (!stillOpen.length) fail('no gym survived 220 weeks, so the long game cannot be measured');
  else ok(`${stillOpen.length} of ${runs.length} gyms still open at 220 weeks`);
}

/* ═══════════════ 5) the bills are a real constraint ═══════════════ */
console.log('5) money is a constraint, not decoration');
{
  /* A gym that signs everything it can and never earns enough must close more
     often than a careful one. Measured as a direction with a margin. */
  const careful = fleet('careful', N, 160);
  const reckless = Array.from({ length: N }, (_, i) => {
    let g = gym.newGym(`R${i}`, `reckseed-${i}`);
    for (let w = 0; w < 160 && !g.closed; w += 1) {
      for (const p of g.prospects) {
        const s = gym.signProspect(g, p.id);
        if (s) g = s;
      }
      if (g.roster.length) {
        const t = gym.trainFighter(g, g.roster[0].id);
        if (t) g = t;
      }
      g = gym.advanceWeek(g);
    }
    return { closed: g.closed, week: g.week };
  });
  const cc = careful.filter(r => r.closed).length / careful.length * 100;
  const rc = reckless.filter(r => r.closed).length / reckless.length * 100;
  console.log(`   closed inside 160 weeks: careful ${cc.toFixed(1)}%, spend everything and never fight ${rc.toFixed(1)}%`);
  console.log(`   median week a reckless gym closed: ${median(reckless.filter(r => r.closed).map(r => r.week)).toFixed(0)}`);
  if (!(rc > cc + 25)) fail(`the bills do not bite: reckless ${rc.toFixed(1)}% against careful ${cc.toFixed(1)}%, margin 25`);
  else ok(`spending without earning closes ${(rc - cc).toFixed(1)} percentage points more gyms (margin 25)`);
}

/* ═════════ 6) the result screen's bars, on the gym's own fights ═════════ */
console.log('6) the condition bars on a gym fight tell the truth, for every kind of player');
{
  /* Round 636. The gym's result screen draws the same two bars as Fight
     Career, from the same conditionTrack, and simFightCareer section 6 only
     ever measures career bouts. The gym's men and offers are drawn another
     way, and a harness that samples a population the player never meets will
     confirm anything, so the gym's bouts are measured here, played by the
     same four kinds of player (see simFightCareer section 6), each through
     the gym plan screen's three looks:
       random    three looks at random
       strong    three looks, each answering what he will switch to next
       stubborn  one answer to his style, held all night
       weak      the tactic his style punishes, all night
     The gym is run the careful way (let a man go at 52 damage, sign while
     there is room and money, fight the healthiest man) and the offer is
     picked at random, so only how the fights are fought differs.

     PINNED CEILING, a share of decision losers checked for each player, never
     a max. Over eight seed bases (2000 to 9000 step 1000, 200 gyms or 4,000
     bouts each), with Round 636's bar and beside it Round 628's straight line
     and clamp, which the strongpin control puts back:
                 Round 636      Round 628
       random    0.0 to 0.1     4.1 to 5.4
       strong    0.0 to 0.1     9.8 to 11.1
       stubborn  0.2 to 0.5     7.6 to 10.3
       weak      0.0            19.4 to 21.8
     A ceiling of 2 percent is one and a half points above the worst healthy
     seed and two below the lowest Round 628 seed of any player. It sits
     lower than Fight Career's 8 because the gym's fights are shorter and its
     careers turn over, so its tail is thinner under either bar. */
  const PIN_CEILING = 2;
  const rngFrom = (seed) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const trapTactic = (style) => TACTICS.find(t => fc.tacticEdge(t, style) < 0) || 'box';
  const BAR_POLICIES = {
    random: (o, rng) => Array.from({ length: 3 }, () => TACTICS[Math.floor(rng() * 4)]),
    strong: (o) => smartLine(o.opponent.style, 3),
    stubborn: (o) => [bestTactic(o.opponent.style)],
    weak: (o) => [trapTactic(o.opponent.style)],
  };
  const gymBouts = (policy) => {
    const bag = [];
    for (let s = 0; s < 200 && bag.length < 4000; s += 1) {
      const rng = rngFrom(2000 + s);
      let g = gym.newGym(`G${s}`, `gymbar-2000-${s}`);
      for (let w = 0; w < 160 && !g.closed && bag.length < 4000; w += 1) {
        for (const f of g.roster.slice()) {
          if (f.damage >= 52) { const r = gym.releaseFighter(g, f.id); if (r) g = r; }
        }
        if (g.roster.length < 4) {
          const aff = g.prospects.filter(p => p.fee <= g.money * 0.6);
          if (aff.length) { const sx = gym.signProspect(g, aff[aff.length - 1].id); if (sx) g = sx; }
        }
        const able = g.roster.filter(f => f.damage < 80).sort((a, b) => a.damage - b.damage);
        if (able.length) {
          const offers = gym.offersForFighter(g, able[0].id);
          if (offers.length) {
            const o = offers[Math.floor(rng() * offers.length)];
            const r = gym.takeGymFight(g, able[0].id, o, BAR_POLICIES[policy](o, rng));
            if (r) { g = r.state; bag.push(r.result); }
          }
        }
        g = gym.advanceWeek(g);
      }
    }
    return bag;
  };

  for (const policy of Object.keys(BAR_POLICIES)) {
    const tag = `[${policy}]`;
    let decisions = 0, stoppedTotal = 0, stoppedZero = 0, standingZero = 0, rose = 0;
    let losersPinned = 0, losersNear = 0, bothPinned = 0;
    const bag = gymBouts(policy);
    for (const res of bag) {
      const track = fc.conditionTrack(res);
      if (!track.length) continue;
      const stopped = res.method === 'KO' || res.method === 'TKO';
      for (let i = 1; i < track.length; i += 1) {
        if (track[i].player > track[i - 1].player || track[i].opp > track[i - 1].opp) rose += 1;
      }
      /* The one 0 allowed anywhere on a track is the stopped man's last one. */
      track.forEach((pt, i) => {
        const stoppedHere = stopped && i === track.length - 1;
        if (pt.player === 0 && !(stoppedHere && res.winner === 'opp')) standingZero += 1;
        if (pt.opp === 0 && !(stoppedHere && res.winner === 'player')) standingZero += 1;
      });
      const end = track[track.length - 1];
      if (stopped) {
        stoppedTotal += 1;
        if ((res.winner === 'player' ? end.opp : end.player) === 0) stoppedZero += 1;
        continue;
      }
      if (res.winner === 'draw') continue;
      decisions += 1;
      const w = res.winner === 'player' ? end.player : end.opp;
      const l = res.winner === 'player' ? end.opp : end.player;
      if (l <= fc.STANDING_FLOOR) losersPinned += 1;
      if (l <= fc.STANDING_FLOOR + 4) losersNear += 1;
      if (w <= fc.STANDING_FLOOR && l <= fc.STANDING_FLOOR) bothPinned += 1;
    }
    const pinPct = (100 * losersPinned) / Math.max(1, decisions);
    const nearPct = (100 * losersNear) / Math.max(1, decisions);
    const bothPct = (100 * bothPinned) / Math.max(1, decisions);
    console.log(`   ${tag} ${bag.length} gym bouts, ${decisions} decisions, ${stoppedTotal} stoppages; decision losers on the floor ${losersPinned} (${pinPct.toFixed(1)}%), within 4 of it ${losersNear} (${nearPct.toFixed(1)}%), both men on it ${bothPinned} (${bothPct.toFixed(2)}%)`);
    if (decisions < 500 || stoppedTotal < 100) {
      fail(`${tag} only ${decisions} decisions and ${stoppedTotal} stoppages, too few to measure a share of either`);
    }
    if (stoppedZero !== stoppedTotal) fail(`${tag} ${stoppedTotal - stoppedZero} of ${stoppedTotal} stopped men do not end on an empty bar`);
    else ok(`${tag} every one of the ${stoppedTotal} stopped men ends on an empty bar`);
    if (standingZero > 0) fail(`${tag} ${standingZero} readings of a man still on his feet show empty, so the bar calls him stopped`);
    else ok(`${tag} nobody on his feet reads empty, on any round of any bout`);
    if (rose > 0) fail(`${tag} condition went back UP ${rose} times, so the bar is not a condition bar`);
    else ok(`${tag} condition never rises, across every round of every bout`);
    if (!(pinPct < PIN_CEILING)) fail(`${tag} ${pinPct.toFixed(1)}% of decision losers end pinned on the floor, so a close loss and a beating read the same (ceiling ${PIN_CEILING}%)`);
    else ok(`${tag} ${pinPct.toFixed(1)}% of decision losers end on the floor (ceiling ${PIN_CEILING}%)`);
    if (!(bothPct < 1)) fail(`${tag} ${bothPinned} decisions (${bothPct.toFixed(2)}%) leave both men on the floor (ceiling 1%)`);
    else ok(`${tag} both men end on the floor in ${bothPct.toFixed(2)}% of decisions (ceiling 1%)`);
  }
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }

if (failures) {
  console.log(`simFightGym: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simFightGym: all sections passed');
process.exit(0);
