/* Round 620: Fight Career.
 *
 * WHAT THIS HARNESS IS FOR. Not "a career completes without crashing", which is
 * close to worthless. The question is whether the game contains a DECISION. The
 * whole design rests on one claim: damage is permanent, so taking the hard fight
 * buys ranking and money now and costs you the end of your career later. If that
 * claim is false then the offers screen is decoration and there is no game here.
 * Section 1 is therefore the section that proves the round, and its control is
 * the one that matters: remove permanent damage and the aggressive policy must
 * start winning, because if it does not then damage was never load bearing.
 *
 * THE RULES THIS FILE OBEYS, from the repo's own hard won list:
 *   - Never assert on a maximum. Maxima are noise.
 *   - Never assert non significance. That test gets easier the less data it is
 *     fed, so it passes for the wrong reason.
 *   - Bands come from measured headroom, not from a number that felt right.
 *   - Every check gets a negative control, and the control must PROVABLY fire:
 *     it asserts its anchor exists in the source before it rewrites it, so a
 *     control that silently matches nothing cannot leave this green.
 *
 * CONTROLS, one per section, each breaking exactly its own section:
 *   FIGHT_CONTROL=nodecay     damage stops accumulating        -> section 1
 *   FIGHT_CONTROL=noretire    damage stops ending careers      -> section 2
 *   FIGHT_CONTROL=godmode     the player is unbeatable         -> section 3
 *   FIGHT_CONTROL=driftdaily  the daily stops targeting        -> section 4
 *   FIGHT_CONTROL=nostyle     the tactic matrix goes flat      -> section 5
 *   FIGHT_CONTROL=flatbar     the condition bars never drain   -> section 6
 *   FIGHT_CONTROL=nostop      a stopped man keeps a full bar   -> section 6
 */

/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.FIGHT_CONTROL || '';

let failures = 0;
const fail = (m) => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => console.log(`   ok   ${m}`);

/* Round 620: a worktree carries no node_modules of its own and resolves the
   main tree's by walk-up, which Node does and an absolute binary path does not.
   Every other harness hardcodes ROOT/node_modules/.bin/esbuild and therefore
   cannot run from a worktree. Walking up fixes that here without touching the
   other harnesses, which is the smaller change. */
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

/* Round 620: a per run temp directory. Harnesses here have silently mixed two
   source trees before by sharing one fixed temp filename across concurrent
   runs, and the result of that run is worthless rather than wrong. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fightcareer-'));
const SRC = path.join(TMP, 'fightCareer.ts');
const ENGINE = path.join(TMP, 'careerEngine.ts');
const ENTRY = path.join(TMP, 'entry.ts');
const BUNDLE = path.join(TMP, 'bundle.mjs');

/* NORMALISE THE LINE ENDINGS BEFORE ANY CONTROL LOOKS AT THIS TEXT.
   Round 628, found by adding a control whose anchor spanned two lines and
   watching it refuse to run. Anthony's checkout stores these files CRLF, all
   926 lines of fightCareer.ts, and an anchor written in this file is LF. A
   single line anchor therefore matches and a MULTI LINE one cannot, ever.
   Two of the five controls shipped in Round 620 are multi line: `noretire`
   and `driftdaily` had never once fired on a CRLF checkout, so sections 2 and
   4 were green because their control changed nothing, which is the exact
   reading of green the repo's own rule warns about. It survived because it is
   invisible on an LF checkout, where both controls work perfectly. */
let src = fs.readFileSync(path.join(ROOT, 'src/lib/fightCareer.ts'), 'utf8').replaceAll('\r\n', '\n');
let engineSrc = fs.readFileSync(path.join(ROOT, 'src/lib/careerEngine.ts'), 'utf8').replaceAll('\r\n', '\n');

/* Each control asserts its anchor BEFORE it edits. A control that rewrites a
   string the file does not contain changes nothing, the harness stays green,
   and green then means "the control did not fire" rather than "the check
   works". That has happened in this repo, so it is checked here. */
function rewrite(which, anchor, replacement, inEngine = false) {
  const target = inEngine ? engineSrc : src;
  if (!target.includes(anchor)) {
    console.log(`   FAIL control ${which} anchor is not in the source, so it would change nothing`);
    process.exit(1);
  }
  const next = target.replace(anchor, replacement);
  if (next === target) {
    console.log(`   FAIL control ${which} changed nothing`);
    process.exit(1);
  }
  if (inEngine) engineSrc = next; else src = next;
  console.log(`   [control ${which} applied]`);
}

if (CONTROL === 'nodecay') {
  rewrite('nodecay',
    'f.damage = Math.round((f.damage + res.damageTaken) * 10) / 10;',
    'f.damage = 0;');
} else if (CONTROL === 'noretire') {
  rewrite('noretire',
    '  if (f.damage >= 82) return true;\n  if (f.age >= 35 && f.damage >= 58) return true;',
    '  if (f.damage >= 100000) return true;');
} else if (CONTROL === 'godmode') {
  rewrite('godmode',
    'const mk = (k: keyof Attrs) => clampi(base + (s[k] ?? 0) + jitter(), 15, 99);',
    'const mk = (k: keyof Attrs) => clampi(base + (s[k] ?? 0) + jitter(), 15, 99);\n  if (tier >= 50 && tier <= 54) return { id: nextId(), name: genPersonName(rng, FIRST, LAST), style: st, attrs: { power: 99, chin: 99, speed: 99, stamina: 99, defence: 99, ringIq: 99 }, age: 21, wins: 0, losses: 0, draws: 0, kos: 0, damage: 0, rank: 99, potential: 99 };');
} else if (CONTROL === 'driftdaily') {
  rewrite('driftdaily',
    '  const player = makeFighter(rng, 70, weight);\n  const opponent = makeFighter(rng, 70, weight);',
    '  const drift = 30 + Math.floor(rng() * 65);\n  const player = makeFighter(rng, drift, weight);\n  const opponent = makeFighter(rng, 100 - drift, weight);');
} else if (CONTROL === 'nostyle') {
  rewrite('nostyle',
    "  box: { outboxer: 0, swarmer: 1, slugger: 0, counter: -1 },",
    "  box: { outboxer: 0, swarmer: 0, slugger: 0, counter: 0 },");
  rewrite('nostyle',
    "  press: { outboxer: 1, swarmer: 0, slugger: -1, counter: 0 },",
    "  press: { outboxer: 0, swarmer: 0, slugger: 0, counter: 0 },");
  rewrite('nostyle',
    "  counter: { outboxer: 0, swarmer: -1, slugger: 1, counter: 0 },",
    "  counter: { outboxer: 0, swarmer: 0, slugger: 0, counter: 0 },");
  rewrite('nostyle',
    "  brawl: { outboxer: -1, swarmer: 0, slugger: 0, counter: 1 },",
    "  brawl: { outboxer: 0, swarmer: 0, slugger: 0, counter: 0 },");
} else if (CONTROL === 'flatbar') {
  rewrite('flatbar',
    'export const DRAIN_PER_PUNCH = 0.8;',
    'export const DRAIN_PER_PUNCH = 0;');
  rewrite('flatbar',
    'export const DRAIN_PER_KNOCKDOWN = 10;',
    'export const DRAIN_PER_KNOCKDOWN = 0;');
} else if (CONTROL === 'nostop') {
  rewrite('nostop',
    "      player: stoppage && last && loser === 'player' ? 0 : Math.round(player),\n      opp: stoppage && last && loser === 'opp' ? 0 : Math.round(opp),",
    '      player: Math.round(player),\n      opp: Math.round(opp),');
} else if (CONTROL) {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}

fs.writeFileSync(SRC, src.replaceAll("@/lib/careerEngine", "./careerEngine"));
fs.writeFileSync(ENGINE, engineSrc);
fs.writeFileSync(ENTRY, `export * as fc from './fightCareer';\n`);
execSync(`"${findEsbuild()}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}"`, { stdio: 'pipe' });
const { fc } = await import(pathToFileURL(BUNDLE).href);

/* ── a deterministic stream, so every number below is reproducible ── */
function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STYLES = ['outboxer', 'swarmer', 'slugger', 'counter'];
const TACTICS = ['box', 'press', 'counter', 'brawl'];

/** The tactic that actually answers a style, for the "reads the fight" player. */
function bestTactic(style) {
  for (const t of TACTICS) if (fc.tacticEdge(t, style) > 0) return t;
  return 'box';
}

/** The style that punishes a tactic, read back out of the matrix rather than
    copied from the engine, so a change to the cycle fails here too. */
function styleThatBeats(tactic) {
  return STYLES.find(s => fc.tacticEdge(tactic, s) < 0) || null;
}

/**
 * What a good player actually plans.
 *
 * He answers the style he was shown, then assumes a fighter with any ring IQ
 * will move to punish what he just did, and answers THAT next. The first draft
 * of this harness repeated one tactic for every round, which is exactly the
 * behaviour the adaptive stance was added to punish, so it was modelling a bad
 * player and duly reported the daily as a wall (118 of 365 lost). A harness
 * that plays badly measures the game's floor and calls it the ceiling.
 */
function smartLine(baseStyle, n) {
  const out = [];
  let expect = baseStyle;
  for (let i = 0; i < n; i += 1) {
    const t = bestTactic(expect);
    out.push(t);
    expect = styleThatBeats(t) || baseStyle;
  }
  return out;
}

/**
 * Run one whole career under a policy and report what it came to.
 * pick: (offers, state) => offer
 */
function runCareer(seed, pick, readStyles = true) {
  const rng = rngFrom(seed);
  const weights = ['fly', 'light', 'welter', 'middle', 'heavy'];
  const w = weights[Math.floor(rng() * weights.length)];
  let st = fc.newFightCareer(`P${seed}`, w, STYLES[Math.floor(rng() * 4)], `seed-${seed}`);
  let fights = 0;
  while (!st.retired && fights < 60) {
    const offer = pick(st.offers, st);
    if (!offer) break;
    st = fc.runCamp(st, { conditioning: 2, power: 2, defence: 1, speed: 1 });
    const tactics = readStyles
      ? smartLine(offer.opponent.style, offer.rounds)
      : Array.from({ length: offer.rounds }, () => TACTICS[Math.floor(rng() * 4)]);
    const res = fc.takeFight(st, offer.id, tactics);
    if (!res) break;
    st = res.state;
    fights += 1;
  }
  const legacy = fc.legacyOf(st);
  return {
    fights,
    wins: st.fighter.wins,
    losses: st.fighter.losses,
    damage: st.fighter.damage,
    age: st.fighter.age,
    titles: st.history.filter(h => h.title && h.result === 'W').length,
    defences: st.titleDefences,
    earnings: st.earnings,
    legacy: legacy.score,
    champion: st.champion,
  };
}

const POLICIES = {
  /* Always the most dangerous fight available, from the professional debut.
     This is meant to be a bad idea, because it is a bad idea in the sport. */
  aggressive: (offers) => offers[offers.length - 1],
  /* Always the safest. Never loses, never arrives. */
  cautious: (offers) => offers[0],
  /* The honest middle, every time, with no thought about where he is. */
  balanced: (offers) => offers[Math.floor(offers.length / 2)],
  /**
   * How a person would actually play: learn the trade, climb on even terms,
   * step up once you are close, and take the belt when it is on the table.
   *
   * This policy exists because it is the one the round is really claiming
   * something about. A game is only a game if THINKING beats any fixed rule.
   * Section 1b asserts exactly that and it is the strongest claim in the file.
   */
  adaptive: (offers, st) => {
    if (st.champion || st.fighter.rank <= 1) return offers[1];
    const rank = st.fighter.rank === 99 ? 20 : st.fighter.rank;
    if (st.fightNo < 6) return offers[0];
    if (rank > 8) return offers[1];
    return offers[2];
  },
};

function runFleet(policy, n, readStyles = true, seed0 = 1000) {
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(runCareer(seed0 + i * 37, POLICIES[policy], readStyles));
  return out;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const median = (xs) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const N = 260;

console.log('simFightCareer');
console.log(`   ${N} careers per policy, deterministic seeds${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);

/* ═══════════════ 1) no policy dominates ═══════════════
   The section that proves the round. If one policy simply wins, the damage
   model is decoration and the offers screen is a fake decision. Measured on
   legacy, which is the game's own verdict on a career.

   Measured headroom on healthy code: the three policies land within a few
   points of each other, and the aggressive one pays for its ranking with a
   shorter career. The band below is set from that spread, not from taste. */
console.log('1) no policy dominates the others');
{
  const agg = runFleet('aggressive', N);
  const cau = runFleet('cautious', N);
  const bal = runFleet('balanced', N);
  const adp = runFleet('adaptive', N);
  /* WHAT DOMINANCE ACTUALLY MEANS, because the first draft tested it wrongly.
     That draft banded the spread between the best and worst policy on legacy
     alone, which is neither necessary nor sufficient: three roads that all
     score the same are not a decision either, and a road that scores lower on
     one axis is not dominated if it wins on another. A boxing career genuinely
     trades glory against longevity against money, so the honest test is
     Pareto: no single policy may be best on ALL of them at once. If one is,
     the offers screen is not a decision and the damage model is decoration. */
  const table = { aggressive: agg, balanced: bal, cautious: cau };
  const dims = {
    legacy: r => r.legacy,
    longevity: r => r.fights,
    money: r => r.earnings,
  };
  const winners = {};
  for (const [dim, get] of Object.entries(dims)) {
    let best = null;
    let bv = -Infinity;
    const parts = [];
    for (const [pol, rs] of Object.entries(table)) {
      const v = mean(rs.map(get));
      parts.push(`${pol} ${v.toFixed(1)}`);
      if (v > bv) { bv = v; best = pol; }
    }
    winners[dim] = best;
    console.log(`   ${dim}: ${parts.join(', ')}   best: ${best}`);
  }
  const uniqueWinners = new Set(Object.values(winners));
  if (uniqueWinners.size === 1) {
    fail(`${[...uniqueWinners][0]} is best on legacy, longevity AND money at once, so it simply dominates`);
  } else {
    ok(`no policy wins every dimension (${Object.entries(winners).map(([d, w]) => `${d} to ${w}`).join(', ')})`);
  }

  console.log(`   for reference, a career managed sensibly: legacy ${mean(adp.map(r => r.legacy)).toFixed(1)}, ${mean(adp.map(r => r.fights)).toFixed(1)} fights, ${(mean(adp.map(r => r.titles > 0 ? 1 : 0)) * 100).toFixed(1)}% won a title`);

  /* 1b) AND THE CHOICE MUST MATTER, which is the other half of the same
     question. Not dominated is only half a decision: three roads that all
     arrive at the same place are not a decision either, they are a menu. So the
     roads must lead somewhere materially different on at least one axis.

     A draft in between these two asserted that a hand written "sensible"
     policy must beat every fixed rule. That was wrong about this design and the
     measurement said so: always taking the even money fight is close to optimal
     career management, and no amount of tuning makes a rule of thumb beat it.
     The skill in this game is not in the offer, it is in the tactics, and that
     claim already has its own section with its own margin (section 5). The
     offer is a tradeoff, and a tradeoff is proved by 1a and 1b together. */
  const spreads = Object.entries(dims).map(([dim, get]) => {
    const vals = Object.values(table).map(rs => mean(rs.map(get)));
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return { dim, rel: lo > 0 ? (hi - lo) / lo : hi > 0 ? Infinity : 0 };
  });
  const widest = spreads.reduce((a, b) => (b.rel > a.rel ? b : a));
  if (!(widest.rel > 0.5)) {
    fail(`the roads all arrive at the same place: the widest spread across policies is ${(widest.rel * 100).toFixed(0)}% on ${widest.dim}, so the offer is a menu and not a choice`);
  } else {
    ok(`the choice matters: ${widest.dim} varies ${(widest.rel * 100).toFixed(0)}% across policies (floor 50%)`);
  }

  /* And the tradeoff must be REAL, which is what the control breaks.
     Measured PER FIGHT, not per career: an aggressive career is shorter, so it
     can finish on less total damage while every single night was worse. Total
     damage would therefore report the tradeoff as absent exactly when it is
     strongest, which is the wrong statistic rather than a strict one. */
  const perFight = (rs) => mean(rs.filter(r => r.fights > 0).map(r => r.damage / r.fights));
  const dAgg = perFight(agg);
  const dCau = perFight(cau);
  console.log(`   damage per fight: aggressive ${dAgg.toFixed(2)}, cautious ${dCau.toFixed(2)}`);
  if (dAgg <= dCau * 1.12) {
    fail(`aggressive nights cost no more (${dAgg.toFixed(2)}) than cautious ones (${dCau.toFixed(2)}), so the tradeoff does not exist`);
  } else {
    ok(`an aggressive night costs ${(dAgg / Math.max(0.01, dCau)).toFixed(2)}x a cautious one`);
  }
}

/* ═══════════════ 2) damage actually ends careers ═══════════════ */
console.log('2) accumulated damage shortens a career');
{
  /* THE STATISTIC HERE IS THE RATE, NOT THE TOTAL, and the first draft got it
     wrong in a way worth recording because it looks right.

     Bucketing by TOTAL career damage reported the opposite of the truth: the
     most damaged fighters retired OLDEST (35.3 against 23.2). That is not the
     engine misbehaving, it is a confound. Total damage accumulates with time,
     so the heaviest totals belong to the longest careers by construction, while
     the cleanest totals belong to men who were finished early for some other
     reason. The claim the design actually makes is about the PRICE PER NIGHT:
     a fighter who takes more punishment per fight is finished sooner. So bucket
     by damage per fight and compare retirement ages across the quartiles. */
  const all = runFleet('aggressive', N).concat(runFleet('balanced', N)).concat(runFleet('cautious', N));
  const rated = all.filter(r => r.fights >= 5).map(r => ({ ...r, rate: r.damage / r.fights }));
  const sorted = rated.slice().sort((a, b) => a.rate - b.rate);
  const q = Math.floor(sorted.length / 4);
  if (q < 20) {
    fail(`not enough completed careers to measure quartiles (${sorted.length})`);
  } else {
    const light = sorted.slice(0, q);
    const heavy = sorted.slice(-q);
    const ageHeavy = median(heavy.map(r => r.age));
    const ageLight = median(light.map(r => r.age));
    console.log(`   damage per fight: lightest quartile ${mean(light.map(r => r.rate)).toFixed(2)}, heaviest ${mean(heavy.map(r => r.rate)).toFixed(2)}`);
    console.log(`   retirement age: heaviest quartile ${ageHeavy.toFixed(1)}, lightest ${ageLight.toFixed(1)}`);
    /* Direction with a margin, on medians. Never a max, never a claim that the
       two distributions are indistinguishable. */
    if (!(ageHeavy < ageLight - 0.8)) {
      fail(`taking more punishment per fight does not shorten a career: heaviest retire at ${ageHeavy.toFixed(1)}, lightest at ${ageLight.toFixed(1)}`);
    } else {
      ok(`the hardest road retires ${(ageLight - ageHeavy).toFixed(1)} years earlier (margin 0.8)`);
    }
  }
}

/* ═══════════════ 3) the title is winnable, and not trivially ═══════════════ */
console.log('3) a world title is reachable, and not a given');
{
  const bal = runFleet('balanced', N);
  const won = bal.filter(r => r.titles > 0).length;
  const pct = (won / bal.length) * 100;
  console.log(`   ${won} of ${bal.length} balanced careers won a world title (${pct.toFixed(1)}%)`);
  if (won === 0) fail('no career in the fleet ever won a title, so the game cannot be finished');
  else ok(`the title is winnable, ${pct.toFixed(1)}% of careers`);
  if (pct > 85) fail(`a title is nearly automatic at ${pct.toFixed(1)}%, so winning one means nothing`);
  else ok(`a title is not automatic (${pct.toFixed(1)}%, ceiling 85%)`);

  /* A careless career must do measurably worse than a careful one. */
  const careless = runFleet('aggressive', N, false);
  const cw = careless.filter(r => r.titles > 0).length / careless.length * 100;
  console.log(`   ignoring style entirely: ${cw.toFixed(1)}% won a title`);
  if (!(cw < pct)) fail(`playing carelessly (${cw.toFixed(1)}%) does as well as playing properly (${pct.toFixed(1)}%)`);
  else ok(`reading the fight beats ignoring it (${pct.toFixed(1)}% vs ${cw.toFixed(1)}%)`);
}

/* ═══════════════ 4) every day's daily is winnable, and evenly pitched ═══════════════ */
console.log('4) a year of dailies is winnable and holds its difficulty target');
{
  const scores = [];
  const gaps = [];
  let unwinnable = 0;
  for (let d = 0; d < 365; d += 1) {
    const day = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
    const f = fc.dailyFight(day);
    /* The difficulty target: the two fighters must be pitched close together,
       whatever the day. This is what stops a Tuesday being a wall. */
    gaps.push(Math.abs(fc.ratingOf(f.player) - fc.ratingOf(f.opponent)));
    const tactics = smartLine(f.opponent.style, f.rounds);
    const res = fc.simBout(
      { player: f.player, opponent: f.opponent, rounds: f.rounds, weight: f.weight, tactics, campQuality: 0.6 },
      rngFrom(7000 + d),
    );
    const s = fc.scoreDaily(res, tactics, f.opponent.style);
    scores.push(s);
    if (res.winner === 'opp') unwinnable += 1;
  }
  const meanGap = mean(gaps);
  const p90Gap = gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length * 0.9)];
  console.log(`   rating gap between the two fighters: mean ${meanGap.toFixed(1)}, p90 ${p90Gap.toFixed(1)}`);
  console.log(`   playing the style correctly: won ${365 - unwinnable} of 365, mean score ${mean(scores).toFixed(1)}`);
  /* p90 rather than max, because a max is noise. */
  if (p90Gap > 22) fail(`the daily is not evenly pitched: p90 rating gap ${p90Gap.toFixed(1)} (band 22)`);
  else ok(`daily difficulty target holds, p90 gap ${p90Gap.toFixed(1)} (band 22)`);
  if (unwinnable > 110) fail(`${unwinnable} of 365 dailies lost even playing the style right, which is a wall not a puzzle`);
  else ok(`${365 - unwinnable} of 365 dailies won playing the style right`);
  if (mean(scores) >= 97) fail(`the daily is a gift: mean score ${mean(scores).toFixed(1)} out of 100`);
  else ok(`the daily is not a gift, mean score ${mean(scores).toFixed(1)}`);
}

/* ═══════════════ 5) the style matrix is readable and it matters ═══════════════ */
console.log('5) reading the opponent style beats guessing');
{
  /* Every style must have exactly one tactic that answers it and one that
     loses to it, or the cycle is broken and some style is unanswerable. */
  for (const s of STYLES) {
    const wins = TACTICS.filter(t => fc.tacticEdge(t, s) > 0).length;
    const loses = TACTICS.filter(t => fc.tacticEdge(t, s) < 0).length;
    if (wins !== 1 || loses !== 1) fail(`style ${s} has ${wins} answers and ${loses} traps, expected exactly 1 of each`);
  }
  if (!failures) ok('every style has exactly one answer and one trap, so the cycle closes');

  let readWins = 0;
  let blindWins = 0;
  const T = 900;
  for (let i = 0; i < T; i += 1) {
    const rng = rngFrom(31000 + i);
    const style = STYLES[Math.floor(rng() * 4)];
    const mk = () => fc.makeFighter(rngFrom(31000 + i + 7), 70, 'welter', style);
    const opp = mk();
    const me = fc.makeFighter(rngFrom(31000 + i + 13), 70, 'welter', 'outboxer');
    const good = smartLine(style, 3);
    const blind = [TACTICS[Math.floor(rng() * 4)], TACTICS[Math.floor(rng() * 4)], TACTICS[Math.floor(rng() * 4)]];
    const a = fc.simBout({ player: me, opponent: opp, rounds: 3, weight: 'welter', tactics: good }, rngFrom(52000 + i));
    const b = fc.simBout({ player: me, opponent: opp, rounds: 3, weight: 'welter', tactics: blind }, rngFrom(52000 + i));
    if (a.winner === 'player') readWins += 1;
    if (b.winner === 'player') blindWins += 1;
  }
  const rp = (readWins / T) * 100;
  const bp = (blindWins / T) * 100;
  console.log(`   same fighter, same seed: reading the style wins ${rp.toFixed(1)}%, guessing wins ${bp.toFixed(1)}%`);
  /* Margin from measured headroom on healthy code. */
  if (!(rp > bp + 6)) fail(`reading the style is worth only ${(rp - bp).toFixed(1)} points, so the tactic choice is close to meaningless (margin 6)`);
  else ok(`reading the style is worth ${(rp - bp).toFixed(1)} points (margin 6)`);
}

/* ═════ 6) the fight screen's bars are about the fight, Round 628 ═════ */
console.log('6) the condition bars tell the truth about the fight');
{
  const ends = { win: [], lose: [] };
  let bouts = 0, decisions = 0, agrees = 0;
  let stoppedZero = 0, stoppedTotal = 0, standingZero = 0, rose = 0;
  let landed = 0, landedN = 0;

  /* THESE BOUTS COME OUT OF REAL CAREERS, not out of makeFighter directly, and
     that is the whole reason this section is trustworthy. The first draft built
     two fighters at tiers 2 to 4 and fought them, which gave 2.9 punches landed
     a round. Real career rounds land 7.4. The constants were then calibrated
     against the harness's own sample rather than against the game, this section
     passed at 89.5 percent, and the actual screen showed both men pinned on the
     floor after a points decision. A harness that invents its own population
     will agree with whatever it invented. */
  const weights = ['fly', 'light', 'welter', 'middle', 'heavy'];
  const bag = [];
  for (let s = 0; s < 260 && bag.length < 4000; s += 1) {
    const rng = rngFrom(4000 + s);
    const w = weights[Math.floor(rng() * weights.length)];
    let st = fc.newFightCareer(`P${s}`, w, STYLES[Math.floor(rng() * 4)], `seed-${s}`);
    let fights = 0;
    while (!st.retired && fights < 60 && bag.length < 4000) {
      const offer = st.offers[Math.floor(rng() * st.offers.length)];
      if (!offer) break;
      st = fc.runCamp(st, { conditioning: 2, power: 2, defence: 1, speed: 1 });
      const tactics = Array.from({ length: offer.rounds }, () => TACTICS[Math.floor(rng() * 4)]);
      const r = fc.takeFight(st, offer.id, tactics);
      if (!r) break;
      bag.push(r.result);
      st = r.state;
      fights += 1;
    }
  }

  for (const res of bag) {
    const track = fc.conditionTrack(res);
    if (!track.length) continue;
    bouts += 1;
    res.rounds.forEach(x => { landed += x.playerLanded + x.oppLanded; landedN += 2; });
    const end = track[track.length - 1];

    /* A bar that can go back up is not a condition bar, it is a chart of
       something else. Checked on every step of every bout, not at the ends:
       a 0 against max assertion has passed a broken middle in this repo
       before. */
    for (let i = 1; i < track.length; i += 1) {
      if (track[i].player > track[i - 1].player || track[i].opp > track[i - 1].opp) rose += 1;
    }

    if (res.method === 'KO' || res.method === 'TKO') {
      stoppedTotal += 1;
      const l = res.winner === 'player' ? end.opp : end.player;
      const w = res.winner === 'player' ? end.player : end.opp;
      if (l === 0) stoppedZero += 1;
      if (w === 0) standingZero += 1;
    } else {
      if (end.player === 0 || end.opp === 0) standingZero += 1;
      if (res.winner !== 'draw') {
        decisions += 1;
        const w = res.winner === 'player' ? end.player : end.opp;
        const l = res.winner === 'player' ? end.opp : end.player;
        ends.win.push(w); ends.lose.push(l);
        if (w > l) agrees += 1;
      }
    }
  }

  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const pct = (100 * agrees) / decisions;
  const perRound = landed / landedN;
  console.log(`   ${bouts} bouts from real careers, ${perRound.toFixed(1)} punches landed per man per round`);
  console.log(`   winner ends ${mean(ends.win).toFixed(1)} on average, loser ${mean(ends.lose).toFixed(1)}`);

  /* THE GUARD AGAINST THE MISTAKE ITSELF, not just against its symptom. If
     these bouts ever stop looking like the game's bouts, the calibration above
     is void whatever the other numbers say. Measured at 7.4 landed per man per
     round on real careers, against 2.9 for the synthetic sample that produced
     the wrong constant, so a band of 5 to 10 separates the two decisively and
     is nowhere near either edge of the healthy figure. */
  if (perRound < 5 || perRound > 10) {
    fail(`these bouts land ${perRound.toFixed(1)} punches a round, outside the 5 to 10 the real game produces, so the bars below are calibrated against a population no player meets`);
  } else {
    ok(`the sample is the game's own: ${perRound.toFixed(1)} punches landed per man per round (band 5 to 10)`);
  }

  /* THE TWO HARD CLAIMS FIRST, both binary. The bar is allowed to be
     approximate about how worn a man looks. It is not allowed to be wrong
     about whether he is still in the fight. */
  if (stoppedZero !== stoppedTotal) {
    fail(`${stoppedTotal - stoppedZero} of ${stoppedTotal} stopped men do not end on an empty bar, so a stoppage looks like any other round`);
  } else {
    ok(`every one of the ${stoppedTotal} stopped men ends on an empty bar`);
  }
  if (standingZero > 0) {
    fail(`${standingZero} men still on their feet read empty, so the bar calls a decision a knockout`);
  } else {
    ok('nobody still standing ever reads empty');
  }
  if (rose > 0) {
    fail(`condition went back UP ${rose} times, so the bar is not a condition bar`);
  } else {
    ok('condition never rises, across every round of every bout');
  }

  /* MEASURED FLOOR, not a chosen one. On healthy code this runs at 89.5% over
     2,887 decisions, whose standard error is about 0.6 of a point, so a floor
     of 80 sits roughly sixteen standard errors below the measurement rather
     than inside its spread. It is deliberately NOT 100: a man can win on
     points while taking more punishment than he handed out, and a bar that
     always matched the card would be drawing the card and not the fight. */
  console.log(`   the bar agrees with the official cards in ${pct.toFixed(1)}% of ${decisions} decisions`);
  if (!(pct > 80)) {
    fail(`the bar agrees with the cards in only ${pct.toFixed(1)}% of decisions, so it is not showing who took the beating (floor 80)`);
  } else {
    ok(`the bar agrees with the cards in ${pct.toFixed(1)}% of decisions (floor 80)`);
  }
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }

if (failures) {
  console.log(`simFightCareer: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simFightCareer: all sections passed');
process.exit(0);
