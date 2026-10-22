/* Round 1546: Fight Career retires when you say.
 *
 * THE GAP. A career ended only when shouldRetire said so (age, damage, or three
 * straight losses unranked), and the hub's only way out, "Retire and start
 * again", wiped the save in one tap with no verdict. The page promised "Retire
 * and get the verdict". The two sibling games already had the shape: Fight Gym
 * sells after 26 weeks, Fight Promoter hands over after 10 shows. This round
 * binds that shape: canRetire and retireByChoice beside shouldRetire, a gate of
 * RETIRE_MIN_FIGHTS, lifeRetire closing the life layer the way a forced
 * retirement does, and a past fighters list kept under its own key.
 *
 * SECTIONS
 *   1 The gate: probed after every fight of every career, the door is shut
 *     below the gate and open at and above it, and nothing else.
 *   2 Retired at every fight number from the gate on: the career is over
 *     (no offers, no camp, nothing waiting from the life layer, no fight can
 *     be taken, no second retirement), the record and the score are exactly
 *     the ones the career had, the verdict says who called it, and a reload
 *     keeps all of it.
 *   3 The past fighters list: one entry a career across a save and a reload,
 *     a second career adds a second, a forced retirement and a save from
 *     before the round are listed as not chosen, junk in storage is dropped.
 *     (The completion paid once across a reload is the board's and is checked
 *     in src/test/fightCareerRetireBoard.test.tsx.)
 *   4 The gate is a door, not a trick: the same careers played the way a
 *     person plays (the adaptive policy of simFightCareer), walked away from
 *     ten fights after the gate, score more than walked away from at it. The
 *     earliest exit is never the best one.
 *   5 The copy says the gate: the How to play line and the guide sentence
 *     name the same number of fights as RETIRE_MIN_FIGHTS. (What's New is a
 *     dated record of the day it shipped and is not held to a later retune.)
 *
 * THE GATE IS PINNED HERE (GATE = 10), not read off the engine, so lowering
 * RETIRE_MIN_FIGHTS turns section 1 red instead of moving the harness with it
 * (Round 1546 review: at 1 the harness used to stay green while a 1-0 fighter
 * retired 229 times). A deliberate retune changes the engine, this pin and
 * the copy together, and section 5 catches the copy left behind.
 *
 * CONTROLS (RETIRE_CONTROL=...), each must turn its section red:
 *   nogate       anybody can retire, a 1-0 fighter included        -> 1
 *   gate1        RETIRE_MIN_FIGHTS lowered to 1                     -> 1
 *   keepcards    lifeRetire leaves the life layer's cards waiting   -> 2
 *   twice        the past list keeps the same career twice         -> 3
 *   keyseed      the past list key is the seed alone, so two
 *                careers under one reused name list as one         -> 3
 *   cleanrecord  an unbeaten record is worth 60, not 18, so banking
 *                a short perfect record is the best play            -> 4
 *   copy         the guide sentence says 12 fights                  -> 5
 *
 * MEASURED (2026-10-22, 240 careers, seed sets 4000, 9000, 15000).
 *   Walking away at 10 fights: legacy 20.8, 20.1, 20.5; the same careers
 *   played out to the end 20.1, 21.1, 20.3; a walkaway at the gate is a
 *   Footnote 97.4, 96.1, 95.3 percent of the time and a tier above the played
 *   out career 1.7, 3.0, 3.8 percent. Walking away at 20 instead of 10:
 *   +3.8, +5.2, +5.0 (bar 2). Walking away at 15 to 25 beats playing out on
 *   average (23.3 to 25.4 against about 20): the decline at the end of a
 *   career costs legacy, which is the decision this round hands the player.
 *   Added by the review fix (seed 4000): one reused name played two ways, 60
 *   pairs, 0 listed as one (60 under keyseed); both copy lines say 10 (the
 *   guide says 12 under copy); under gate1 a 1-0 fighter retired 229 times.
 */
import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.RETIRE_CONTROL || '';
const KNOWN = ['', 'nogate', 'gate1', 'keepcards', 'twice', 'keyseed', 'cleanrecord', 'copy'];
if (!KNOWN.includes(CONTROL)) {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}
const CAREERS = Number(process.env.RETIRE_CAREERS || 240);
const SEED0 = Number(process.env.RETIRE_SEED0 || 4000);

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

/* The engine and the life layer it binds, copied into one tree so a control
   can rewrite any of them. Line endings normalised before any anchor is read. */
const FILES = [
  'careerEngine', 'fightCareer', 'fightCareerLife', 'fightCareerLifeFlow', 'fightCareerInbox',
  'fightCareerRivalry', 'fightCareerMoney', 'careerInbox', 'careerRivalryEvents', 'careerRivalryChoices',
  'careerBadges', 'keyedRng',
];
const src = Object.fromEntries(FILES.map(n => [
  n, fs.readFileSync(path.join(ROOT, 'src/lib', `${n}.ts`), 'utf8').replaceAll('\r\n', '\n'),
]));
/* Section 5's copy, read here so a control can rewrite it. Each pattern opens
   on the string's own quote or runs into its next words, so a comment that
   quotes the line cannot satisfy it. */
const COPY = [
  { file: 'src/pages/FightCareer.tsx', what: 'the How to play line', re: /'Retire any time after (\d+) fights, or when your body makes you/g },
  { file: 'src/data/gameContent/moreSports.ts', what: 'the guide sentence', re: /, or retire yourself any time after (\d+) fights, then read the verdict/g },
];
const copyText = Object.fromEntries(COPY.map(c => [c.file, fs.readFileSync(path.join(ROOT, c.file), 'utf8').replaceAll('\r\n', '\n')]));

/* Every control asserts its anchor exists before editing, so a control that
   changes nothing aborts instead of reading as green. */
function swap(which, file, anchor, replacement) {
  if (!src[file].includes(anchor)) {
    console.log(`   FAIL control ${which}: anchor is not in ${file}.ts, so it would change nothing`);
    process.exit(1);
  }
  src[file] = src[file].replace(anchor, replacement);
  console.log(`   [control ${which} applied]`);
}
if (CONTROL === 'nogate') {
  swap('nogate', 'fightCareer', '  return !st.retired && st.fightNo >= RETIRE_MIN_FIGHTS;', '  return !st.retired;');
} else if (CONTROL === 'gate1') {
  swap('gate1', 'fightCareer', 'export const RETIRE_MIN_FIGHTS = 10;', 'export const RETIRE_MIN_FIGHTS = 1;');
} else if (CONTROL === 'keyseed') {
  swap('keyseed', 'fightCareer',
    '    key: `${st.seed >>> 0}:${st.fightNo}:${f.wins}-${f.losses}-${f.draws}:${f.kos}:${st.earnings}`,',
    '    key: `${st.seed >>> 0}`,');
} else if (CONTROL === 'copy') {
  const guide = 'src/data/gameContent/moreSports.ts';
  const anchor = 'or retire yourself any time after 10 fights';
  if (!copyText[guide].includes(anchor)) {
    console.log(`   FAIL control copy: anchor is not in ${guide}, so it would change nothing`);
    process.exit(1);
  }
  copyText[guide] = copyText[guide].replace(anchor, 'or retire yourself any time after 12 fights');
  console.log('   [control copy applied]');
} else if (CONTROL === 'keepcards') {
  swap('keepcards', 'fightCareerLifeFlow',
    '  next.life.pending = [];\n  next.life.pendingRivalryChoice = null;\n  next.life.pendingRivalryEvent = null;\n', '');
} else if (CONTROL === 'twice') {
  swap('twice', 'fightCareer', '  if (list.some(p => p.key === entry.key)) return list;\n', '');
} else if (CONTROL === 'cleanrecord') {
  swap('cleanrecord', 'fightCareer', '    18 * winPct +', '    60 * winPct +');
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fightretire-'));
for (const n of FILES) fs.writeFileSync(path.join(TMP, `${n}.ts`), src[n].replaceAll('@/lib/', './'));
fs.writeFileSync(path.join(TMP, 'entry.ts'), [
  "export * as fc from './fightCareer';",
  "export * as fl from './fightCareerLife';",
  "export * as ff from './fightCareerLifeFlow';",
  "export * as fi from './fightCareerInbox';",
  "export * as fr from './fightCareerRivalry';",
  '',
].join('\n'));
const BUNDLE = path.join(TMP, 'bundle.mjs');
execSync(`"${findEsbuild()}" "${path.join(TMP, 'entry.ts')}" --bundle --format=esm --platform=node --outfile="${BUNDLE}"`, { stdio: 'pipe' });
const { fc, fl, ff, fi, fr } = await import(pathToFileURL(BUNDLE).href);
/* Pinned, see the header: the gate the game promises, not whatever the engine says today. */
const GATE = 10;

/* ─── playing a career, as simFightCareer plays one through the life layer ─── */
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
const WEIGHTS = ['fly', 'light', 'welter', 'middle', 'heavy'];
const PLAN = { conditioning: 2, power: 2, defence: 1, speed: 1 };
const bestTactic = (style) => TACTICS.find(t => fc.tacticEdge(t, style) > 0) || 'box';
const styleThatBeats = (tactic) => STYLES.find(s => fc.tacticEdge(tactic, s) < 0) || null;
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
/* simFightCareer's "adaptive" policy: how a person plays. Learn the trade,
   climb on even terms, step up once close, take the belt when it is there. */
function adaptive(offers, st) {
  if (st.champion || st.fighter.rank <= 1) return offers[1];
  const rank = st.fighter.rank === 99 ? 20 : st.fighter.rank;
  if (st.fightNo < 6) return offers[0];
  if (rank > 8) return offers[1];
  return offers[2];
}
/* Every screen between fights answered with its neutral choice. */
function clearGap(st0) {
  let st = st0;
  for (let guard = 0; guard < 24; guard += 1) {
    const step = ff.nextLifeStep(st);
    if (!step) break;
    if (step.kind === 'beat') st = fr.dismissFightRivalryEvent(st) ?? st;
    else if (step.kind === 'choice') st = fr.answerFightRivalryChoice(st, fr.neutralRivalryChoice(step.card.id))?.state ?? st;
    else st = fl.answerLifeCard(st, step.card.options.findIndex(o => o.neutral))?.state ?? st;
  }
  for (const m of st.life.phoneInbox.filter(x => x.answered === undefined)) {
    st = ff.lifeAnswerInbox(st, m.id, fi.neutralInboxChoice(m)) ?? st;
  }
  return st;
}
/* One career to its natural end. `onFight` sees the state right after each
   fight (and the fresh career), before the gap is cleared, which is the state
   with the most left waiting on it. */
function playCareer(seed, onFight) {
  const rng = rngFrom(seed);
  const w = WEIGHTS[Math.floor(rng() * WEIGHTS.length)];
  let st = ff.lifeNewCareer(`R${seed}`, w, STYLES[Math.floor(rng() * 4)], 'allround', 'family', `retire-${seed}`);
  onFight(st);
  for (let fights = 0; !st.retired && fights < 60; fights += 1) {
    st = clearGap(st);
    const offer = adaptive(st.offers, st);
    if (!offer) break;
    const res = ff.lifeTakeFight(ff.lifeRunCamp(st, PLAN), offer.id, smartLine(offer.opponent.style, offer.rounds));
    if (!res) break;
    st = res.state;
    onFight(st);
  }
  return st;
}
/* A career played to fight n with the given pick and then retired by choice,
   or null if the body or the record ended it first. */
function retireAt(st0, n, pick) {
  let st = st0;
  while (!st.retired && st.fightNo < n) {
    st = clearGap(st);
    const offer = pick(st.offers, st);
    if (!offer) return null;
    const res = ff.lifeTakeFight(ff.lifeRunCamp(st, PLAN), offer.id, smartLine(offer.opponent.style, offer.rounds));
    if (!res) return null;
    st = res.state;
  }
  return st.retired ? null : ff.lifeRetire(st);
}
const roundTrip = (x) => JSON.parse(JSON.stringify(x));
const mean =(xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const waiting = (st) => st.life.pending.length > 0 || !!st.life.pendingRivalryChoice || !!st.life.pendingRivalryEvent;
const recordOf = (st) => JSON.stringify([st.fighter, st.history, st.fightNo, st.earnings, st.champion, st.titleDefences, st.life.bank]);

/* ─── one pass over every career; the sections read what it gathered ─── */
const s1 = { probes: 0, below: 0, above: 0, wrongShut: 0, wrongOpen: 0, oneAndOh: 0 };
const s2 = { retired: 0, hadCards: 0, notOver: 0, cardsLeft: 0, recordMoved: 0, scoreMoved: 0, noLine: 0, fightAfter: 0, twice: 0, reloadLost: 0 };
const chosen = [];
const forced = [];
/* Section 4: every career's verdict walked away from at the gate and at later
   fight numbers, beside the verdict it got played out to the end. */
const LATER = [GATE, GATE + 5, GATE + 10, GATE + 15];
const played = [];
for (let i = 0; i < CAREERS; i += 1) {
  const seed = SEED0 + i * 37;
  let atGate = null;
  const atK = new Map();
  const final = playCareer(seed, (st) => {
    if (!st.retired && LATER.includes(st.fightNo)) atK.set(st.fightNo, fc.legacyOf(st).score);
    s1.probes += 1;
    const shouldOpen = !st.retired && st.fightNo >= GATE;
    const r = ff.lifeRetire(st);
    if (st.fightNo < GATE) s1.below += 1; else s1.above += 1;
    if (fc.canRetire(st) !== shouldOpen || (r !== null) !== shouldOpen) {
      if (shouldOpen) s1.wrongShut += 1; else s1.wrongOpen += 1;
    }
    if (r && st.fightNo === 1 && st.fighter.wins === 1) s1.oneAndOh += 1;
    if (!r) return;
    if (st.fightNo === GATE) atGate = r;
    if (st.fightNo === GATE || st.fightNo === GATE + 1 + (i % 9)) chosen.push(r);
    s2.retired += 1;
    if (waiting(st)) s2.hadCards += 1;
    if (!(r.retired && r.retiredBy === 'choice' && r.offers.length === 0 && r.camp === null)) s2.notOver += 1;
    if (waiting(r) || ff.nextLifeStep(r) !== null) s2.cardsLeft += 1;
    if (recordOf(r) !== recordOf(st)) s2.recordMoved += 1;
    const before = fc.legacyOf(st);
    const after = fc.legacyOf(r);
    if (after.score !== before.score || after.tier !== before.tier) s2.scoreMoved += 1;
    if (!after.bullets.some(b => b.includes(`called time himself after ${st.fightNo} fights`))) s2.noLine += 1;
    const o = st.offers[0];
    if (o && (ff.lifeTakeFight(r, o.id, smartLine(o.opponent.style, o.rounds)) || fc.takeFight(r, o.id, smartLine(o.opponent.style, o.rounds)))) s2.fightAfter += 1;
    if (ff.lifeRetire(r) !== null) s2.twice += 1;
    const back = ff.lifeLoadState(roundTrip(r));
    if (!back.retired || back.retiredBy !== 'choice' || fc.legacyOf(back).score !== after.score || recordOf(back) !== recordOf(r)) s2.reloadLost += 1;
  });
  if (final.retired && final.retiredBy === undefined) forced.push(final);
  /* The verdict a retirement by choice gave at the gate (section 2 proved it
     is the record's own score) beside the same career's other endings. */
  if (atGate) atK.set(GATE, fc.legacyOf(atGate).score);
  if (final.retired) played.push({ at: atK, out: fc.legacyOf(final).score });
}

/* ─── 1. The gate ─── */
console.log(`\n1. The gate (${GATE} fights, the engine says ${fc.RETIRE_MIN_FIGHTS}), probed after every fight of ${CAREERS} careers`);
console.log(`   ${s1.probes} probes, ${s1.below} below the gate, ${s1.above} at or above it`);
console.log(`   open below the gate ${s1.wrongOpen} (a 1-0 fighter retired ${s1.oneAndOh} times), shut at or above it ${s1.wrongShut}`);
if (s1.below < CAREERS * GATE * 0.9 || s1.above < CAREERS * 5) fail('too few probes on one side of the gate to mean anything');
if (fc.RETIRE_MIN_FIGHTS !== GATE) fail(`the engine's gate is ${fc.RETIRE_MIN_FIGHTS} fights, not the ${GATE} the game promises`);
if (s1.oneAndOh) fail(`a 1-0 fighter could retire (${s1.oneAndOh} times), banking a perfect record before meeting anybody`);
if (s1.wrongOpen) fail(`${s1.wrongOpen} careers could retire below the gate`);
else ok('nobody retires below the gate');
if (s1.wrongShut) fail(`${s1.wrongShut} careers at or past the gate were refused`);
else ok('every career at or past the gate can retire');

/* ─── 2. Retired at every fight number from the gate on ─── */
console.log(`\n2. Retired by choice at every fight number from the gate on: ${s2.retired} retirements`);
console.log(`   ${s2.hadCards} of them had something from the life layer waiting at the moment of retiring`);
console.log(`   not over ${s2.notOver}, still waiting on a card ${s2.cardsLeft}, record changed ${s2.recordMoved}, score changed ${s2.scoreMoved}, verdict silent on who called it ${s2.noLine}`);
console.log(`   a fight taken afterwards ${s2.fightAfter}, retired twice ${s2.twice}, lost on a reload ${s2.reloadLost}`);
if (s2.retired < CAREERS * 5 || s2.hadCards < CAREERS) fail('too few retirements, or too few with a card waiting, to mean anything');
if (s2.notOver || s2.fightAfter || s2.twice) fail(`a retired career was not over (${s2.notOver} not marked, ${s2.fightAfter} fought on, ${s2.twice} retired twice)`);
else ok('a retired career is over: no offers, no camp, no fight, no second retirement');
if (s2.cardsLeft) fail(`${s2.cardsLeft} retired careers still have a card, a choice or a beat waiting`);
else ok('nothing from the life layer is left waiting on a career that is over');
if (s2.recordMoved || s2.scoreMoved) fail(`retiring changed the record ${s2.recordMoved} times and the score ${s2.scoreMoved} times`);
else ok('the verdict scores the record the career had, nothing added and nothing taken');
if (s2.noLine) fail(`${s2.noLine} verdicts do not say he called time himself`);
else ok('the verdict says he called it himself, and after how many fights');
if (s2.reloadLost) fail(`${s2.reloadLost} retirements came back different after a save and reload`);
else ok('a reload lands on the same finished career');

/* ─── 3. The past fighters list ─── */
console.log(`\n3. The past fighters list: ${chosen.length} chosen retirements, ${forced.length} forced ones`);
{
  let dup = 0;
  let wrongChose = 0;
  let pairs = 0;
  let badPair = 0;
  for (const r of chosen) {
    const once = fc.archiveCareer([], r);
    const again = fc.archiveCareer(fc.sanitizePastFighters(roundTrip(once)), ff.lifeLoadState(roundTrip(r)));
    if (once.length !== 1 || again.length !== 1) dup += 1;
    if (once[0]?.chose !== true) wrongChose += 1;
  }
  for (let k = 1; k < chosen.length; k += 1) {
    const a = chosen[k - 1];
    const b = chosen[k];
    if (fc.pastFighterOf(a).key === fc.pastFighterOf(b).key) continue;
    pairs += 1;
    let list = fc.archiveCareer([], a);
    list = fc.archiveCareer(fc.sanitizePastFighters(roundTrip(list)), b);
    list = fc.archiveCareer(fc.sanitizePastFighters(roundTrip(list)), ff.lifeLoadState(roundTrip(b)));
    if (list.length !== 2 || list[0].key !== fc.pastFighterOf(b).key) badPair += 1;
  }
  let forcedWrong = 0;
  for (const f of forced) {
    const e = fc.archiveCareer([], f);
    if (e.length !== 1 || e[0].chose !== false || fc.legacyOf(f).bullets.some(b => b.includes('called time himself'))) forcedWrong += 1;
  }
  const live = ff.lifeNewCareer('Still Going', 'welter', 'outboxer');
  const liveListed = fc.archiveCareer([], live).length;
  const sample = fc.pastFighterOf(chosen[0]);
  const many = Array.from({ length: 12 }, (_, k) => ({ ...sample, key: `k${k}` }));
  const junk = [fc.sanitizePastFighters('x'), fc.sanitizePastFighters(null), fc.sanitizePastFighters([{}, 3, { ...sample, weight: 'cruiser' }])]
    .reduce((n, l) => n + l.length, 0);
  const capped = fc.sanitizePastFighters(many).length;
  /* Two careers under one reused name, weight and style share a seed, which is
     what the board gives a player who types the same name again. Played two
     ways (tune ups only, and the way a person plays) and walked away from at
     the gate, they are two careers and are listed as two (Round 1546 review:
     a key cut down to the seed was caught only by an activity floor). */
  const SAME = 60;
  let sameSeedPairs = 0;
  let sameSeedOne = 0;
  let notSameSeed = 0;
  for (let k = 0; k < SAME; k += 1) {
    const args = [`Same Name ${k}`, WEIGHTS[k % WEIGHTS.length], STYLES[k % STYLES.length]];
    const a = retireAt(ff.lifeNewCareer(...args), GATE, (offers) => offers[0]);
    const b = retireAt(ff.lifeNewCareer(...args), GATE, adaptive);
    if (!a || !b) continue;
    if (a.seed !== b.seed) { notSameSeed += 1; continue; }
    if (recordOf(a) === recordOf(b)) continue;
    sameSeedPairs += 1;
    let list = fc.archiveCareer([], a);
    list = fc.archiveCareer(fc.sanitizePastFighters(roundTrip(list)), b);
    if (list.length !== 2) sameSeedOne += 1;
  }
  console.log(`   listed twice across a reload ${dup}, chosen shown as forced ${wrongChose}; ${pairs} pairs of careers, ${badPair} not listed as two, newest first`);
  console.log(`   one name, weight and style played two ways: ${sameSeedPairs} pairs, ${sameSeedOne} listed as one, ${notSameSeed} that did not share a seed`);
  if (sameSeedPairs < SAME / 2 || notSameSeed) fail(`only ${sameSeedPairs} same seed pairs (${notSameSeed} did not share a seed), too few to mean anything`);
  if (sameSeedOne) fail(`${sameSeedOne} pairs of careers under one reused name were listed as one`);
  else ok('two careers under one reused name are listed as two');
  console.log(`   forced retirements listed wrong ${forcedWrong}, a live career listed ${liveListed}, junk entries kept ${junk}, a list of 12 kept as ${capped}`);
  if (chosen.length < CAREERS || forced.length < CAREERS / 2 || pairs < CAREERS) fail('too few careers reached the list to mean anything');
  if (dup || badPair) fail(`the same career was listed twice (${dup}) or two careers were not listed as two (${badPair})`);
  else ok('one entry a career across a save and a reload, and a second career adds a second');
  if (wrongChose || forcedWrong || liveListed) fail(`entries say the wrong thing (${wrongChose} chosen as forced, ${forcedWrong} forced wrong, ${liveListed} live careers listed)`);
  else ok('a forced retirement and an old save read as forced, a chosen one as chosen, a live career is not listed');
  if (junk || capped !== fc.PAST_FIGHTERS_MAX) fail(`storage junk kept ${junk}, a long list kept as ${capped}`);
  else ok(`junk in storage is dropped and the list holds the newest ${fc.PAST_FIGHTERS_MAX}`);
}

/* ─── 4. The gate is a door, not a trick ─── */
/* Measured on 240 careers at three seed sets (4000, 9000, 15000): +3.8, +5.2
   and +5.0. The bar sits under the lowest, never in the middle. */
const MARGIN = 2;
const LATE = GATE + 10;
console.log(`\n4. Walking away at the gate against walking away later and against playing it out, ${played.length} careers played the way a person plays`);
{
  const tierRank = (score) => [28, 46, 62, 78, 92].filter(t => score >= t).length;
  for (const k of LATER) {
    const rows = played.filter(p => p.at.has(k));
    const n = Math.max(1, rows.length);
    const atLeast = rows.filter(p => p.at.get(k) >= p.out).length;
    const tierUp = rows.filter(p => tierRank(p.at.get(k)) > tierRank(p.out)).length;
    console.log(`   walked away at ${k}: ${rows.length} careers, legacy ${mean(rows.map(p => p.at.get(k))).toFixed(1)} against ${mean(rows.map(p => p.out)).toFixed(1)} for the same careers played out; as well or better ${(atLeast / n * 100).toFixed(1)} percent, a tier higher ${(tierUp / n * 100).toFixed(1)} percent`);
  }
  const both = played.filter(p => p.at.has(GATE) && p.at.has(LATE));
  const gain = mean(both.map(p => p.at.get(LATE) - p.at.get(GATE)));
  const footnotes = played.filter(p => p.at.has(GATE) && p.at.get(GATE) < 28).length / Math.max(1, played.filter(p => p.at.has(GATE)).length) * 100;
  console.log(`   the same ${both.length} careers walked away at ${LATE} rather than ${GATE}: ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} legacy (bar ${MARGIN}); ${footnotes.toFixed(1)} percent of walkaways at the gate are a Footnote`);
  if (both.length < CAREERS * 0.7) fail(`only ${both.length} careers reached fight ${LATE} to compare`);
  if (gain < MARGIN) fail(`walking away at the gate scores within ${MARGIN} of walking away ten fights later, so the earliest door is the best one`);
  else ok('playing on past the gate pays: the earliest exit is not the best exit');
}

/* ─── 5. The copy says the gate ─── */
console.log(`\n5. The copy names the gate the engine holds (${fc.RETIRE_MIN_FIGHTS} fights)`);
for (const c of COPY) {
  const found = [...copyText[c.file].matchAll(c.re)].map(m => Number(m[1]));
  console.log(`   ${c.what} (${c.file}): ${found.length ? found.join(', ') : 'not found'}`);
  if (found.length !== 1) fail(`${c.what} was found ${found.length} times in ${c.file}, not once`);
  else if (found[0] !== fc.RETIRE_MIN_FIGHTS) fail(`${c.what} says ${found[0]} fights, the engine's gate is ${fc.RETIRE_MIN_FIGHTS}`);
  else ok(`${c.what} says ${found[0]} fights, the engine's gate`);
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }

if (failures) {
  console.log(`\nsimFightCareerRetire: ${failures} failure(s)${CONTROL ? ` under control ${CONTROL}` : ''}`);
  process.exit(1);
}
console.log(`\nsimFightCareerRetire: all sections passed${CONTROL ? ` under control ${CONTROL} (a control that passes did NOT fire)` : ''}`);
process.exit(0);

