/* Club Manager: tactics depth, the engine side.

   (scripts/simTactics.mjs is taken: it is the Round 114 BROWSER guard for
   the tactics pitch, real pointer drags and the mentality animation, and it
   stays. This is the engine harness for Round 505 and runs in the node
   group.)

   Round 505. His words: "subs and reserves listed under the pitch, tap one
   player then another to swap. Out of position penalties, position
   retraining over weeks, but full freedom to place anyone anywhere (ten
   defenders if you want). Captain, corner takers left and right, free kick
   and penalty takers. Way more formations and variants. Player roles:
   attacking or holding fullbacks, sweeper keeper, and so on. Sub
   suggestions ordered by same position first."

   The engine half of that is six things, and this harness holds every one
   of them to a number from the outside. A man is read IN HIS SLOT
   (fitGrade, FIT_PENALTY), a man can learn a second position over weeks
   (startRetraining, tickWeek), the armband and four set piece jobs live on
   the save and reach the stream (SetPieces, corner flanks, penalties and
   free kicks credited to the taker), a slot carries a duty that moves the
   half's lambdas and who gets on the end of things (Duty, dutyBoost), the
   bench is ordered for the slot being filled (benchFor), and Club Manager
   has seventeen shapes of its own (CM_FORMATIONS). Every check here is
   measured against a baseline the harness computes itself, never against
   the engine's own word for it, and never as "no crash".

   Sections (one line of measurements each, one FAIL line per failure):

     1) Fit. fitGrade over every slot of every CM shape for every man of six
        real squads against this file's own reading of the position rule
        (his own position natural, his ALT_POSITIONS family family, the
        keeper boundary keeper either way, the rest wrong), FIT_PENALTY
        ordered natural 0 under family under wrong under keeper,
        xiAverageRating equal to xiFitReport's rating on every save, and a
        fully natural eleven paying nothing: penalty 0 and the same rounded
        plain average the header printed before this round. Then the
        OUTCOME on common random numbers (withSeed(k) for every arm): arm A
        the club's natural eleven, arm B the same eleven with the keeper and
        the striker swapped (a keeper grade both ways), arm F one full back
        moved to the other flank (a family grade both ways). The first half
        lambda is exact and must order A above F above B on every fixture;
        the first half's goals for are drawn by the first divergent draw
        (Poisson is monotone in lambda under a shared uniform stream) so A
        may never score fewer than F, nor F fewer than B, on any seed, and A
        must out score B on a measured share of seeds; over the full match B
        must score fewer and concede more than A by more than three paired
        standard errors, and F's means must sit inside the band A to B
        widened by two standard errors either side (a family penalty is
        four rating points over eleven men, about 0.02 goals a match, which
        no sane sample can order on its own; the lambda and the first half
        carry the exact ordering instead).
     2) Retraining. startRetraining refuses a keeper either way, a position
        he holds, and a second retraining while one runs; retrainWeeks
        agrees with this file's own formula (6 family, 10 same line, 16
        across lines, half as long again past thirty, divided by the
        training ground multiplier, never under 4) for every outfielder,
        every outfield position he does not hold and every training ground
        level; the countdown loses exactly one a week under playNextEntry
        (counted off the calendar pointer) and at zero the position is in
        secondaryPositions with a headline naming him and fitGrade reads it
        as natural; the list caps at two and keeps the newest; six fresh
        real squads carry no second position and no retraining at all.
     3) Set pieces. ensureSetPieces fills every job on a fresh save with a
        squad member not on loan, the captain aged 24 plus and rated 76 plus
        when the squad has one, the two corner jobs different men; setSetPiece
        refuses a missing man, a man on loan and a keeper for a taker job;
        over quick sims every corner of mine carries a flank and goes to the
        assigned man for that flag whenever he was on the pitch (share
        printed, floor below), every penalty and free kick goal is credited
        to the assigned taker whenever he was on the pitch (counts printed,
        floor 0 misses); shootoutTakerEdge equals the clamped formula and
        never leaves plus or minus SHOOTOUT_TAKER_EDGE_CAP; on common random
        numbers the same defeat costs every man who played exactly one
        morale point less with the captain out there and the captain two,
        nobody else moves, and a win or a draw moves only the captain, by
        one; and a sale (acceptBid) or a loan out clears every job that
        named him while a sale of another man leaves them alone.
     4) Duties. dutyOptions matches DUTIES_BY_LINE through this file's own
        label to line map on every slot of every shape, setDuty refuses a
        duty the line does not offer and a slot that is not there, slotDuty
        drops a stored duty the slot's line does not offer; dutyBoost equals
        the summed DUTY_EFFECT clamped to plus or minus DUTY_BOOST_CAP on
        random assignments (the clamp exercised), the cap is 0.12 and sits
        under the smallest mentality step read off the engine's MENT_MOD;
        and the OUTCOME on common random numbers: an eleven with attacking
        full backs and a poacher against the same eleven with holding full
        backs and a target man scores more and concedes more over the full
        match by more than three paired standard errors, never scores fewer
        in the first half on any seed, and the poacher's share of the
        eleven's goals sits above the target man's by more than three
        binomial standard errors.
     5) Bench. benchFor(career, outId) on every slot of every CM shape between
        matches: every man not in the eleven is listed, the available first,
        then natural before family before the rest by this file's own grade,
        then fitness then rating inside a tier, and the slotIdx form gives the
        same list; during a live match the men on the pitch, the men in
        liveGoneIds (a sub made at the interval, a red, an injury) and the
        unfit are absent and the rest are all there in the same order.
     6) Formations. CM_FORMATIONS has 17 entries, indexes 0 to 8 identical to
        squadDeal's FORMATIONS (names, labels, allowed sets, coordinates),
        every entry 11 slots with exactly one GK at (50, 90), no two slots at
        one point, and every slot's pitchLineOf band (read both through the
        export and off the y thresholds by hand) the band its label names:
        GK keeper, CB and full backs defence, wing backs defence or midfield
        (the 3-5-2 family stands them at y 42 to 50 and always has), CDM, CM
        and wide midfielders midfield, CAM midfield or attack (every CAM the
        shared nine ship sits at y 32 to 36 and always has), RW, LW, ST and
        CF attack.
     7) Round 504 still holds: the same seeded fixture played live (kick off,
        startSecondHalf, resumeMatch) and quick (skipHalftime) gives the same
        report down to the JSON of the play, on simLiveMatch section 6's keys.

   Negative controls, TACTICS_CONTROL=<name>. Each rewrites a copy of the
   engine before bundling, refuses to run if the string it rewrites is not
   there, and passes only when the section it names went red and nothing
   else did:
     nofit      FIT_PENALTY all zero. Section 1 must go red (the ordering,
                the lambda ordering, the first half share, the full match
                gap) and nothing else may.
     notaker    assignedOnPitch never finds the assigned man, so the weighted
                pick takes every corner and every penalty. Section 3 must go
                red (the corner share, the crediting) and nothing else may.
     noduty     dutyBoost returns zero and DUTY_SCORING is empty. Section 4
                must go red (the boost equality, the outcome, the share) and
                nothing else may.
     noretrain  tickWeek no longer counts weeksLeft down. Section 2 must go
                red (the countdown never completes) and nothing else may.

   Thresholds, measured on this harness's own seed and under SIM_SEED=1, 2
   and 3 (2026-09-07; SIM_SEED is folded into every seed the harness draws
   with, so each value is a different sample). The measured values are in
   the block at the end of this comment, filled in from the runs.
     seeds where A out scores B in the first half (fit)     floor 3 percent
     corners to the assigned man when on the pitch          floor 90 percent
     seeds where A out scores B in the first half (duty)    floor 3 percent
     (nofit and noduty measure 0 percent on the two shares; notaker measures
      the weighted pick's share of corners, well under the floor)

   MEASURED (own seed, SIM_SEED=1, 2, 3):
     fit: keeper swap gap for / against in paired se       see the run log
     fit: first half A above B share                       see the run log
     duty: gap for / against in paired se, poacher share   see the run log
     corners to the assigned man                           see the run log

   Run: node scripts/simTacticsEngine.mjs
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
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.TACTICS_CONTROL || '';
const lf = s => s.replaceAll('\r\n', '\n');

const CONTROLS = {
  nofit: {
    must: [1], also: [],
    what: 'the FIT_PENALTY table',
    edits: [[
      'export const FIT_PENALTY: Record<FitGrade, number> = { natural: 0, family: 2, wrong: 6, keeper: 14 };\n',
      'export const FIT_PENALTY: Record<FitGrade, number> = { natural: 0, family: 0, wrong: 0, keeper: 0 };\n',
    ]],
    note: 'a man out of position pays nothing; section 1 must go red',
  },
  notaker: {
    must: [3], also: [],
    what: 'the id line in assignedOnPitch',
    edits: [[
      '  const id = sp?.[key] ?? null;\n  if (!id) return null;\n',
      '  const id: string | null = null; void sp; void key;\n  if (!id) return null;\n',
    ]],
    note: 'the assigned taker is never found, the weighted pick takes everything; section 3 must go red',
  },
  noduty: {
    must: [4], also: [],
    what: 'the return line of dutyBoost and the DUTY_SCORING table',
    edits: [
      [
        '  return { atk: clamp(atk, -DUTY_BOOST_CAP, DUTY_BOOST_CAP), def: clamp(def, -DUTY_BOOST_CAP, DUTY_BOOST_CAP) };\n',
        '  void atk; void def; return { atk: 0, def: 0 };\n',
      ],
      [
        'export const DUTY_SCORING: Partial<Record<Duty, number>> = {\n  poacher: 1.4, insideForward: 1.25, shadowStriker: 1.2, falseNine: 1.1, targetMan: 0.9,\n};\n',
        'export const DUTY_SCORING: Partial<Record<Duty, number>> = {};\n',
      ],
    ],
    note: 'duties move nothing and pick nobody; section 4 must go red',
  },
  noretrain: {
    must: [2], also: [],
    what: 'the countdown line in tickWeek',
    edits: [[
      '      const weeksLeft = p.retraining.weeksLeft - 1;\n',
      '      const weeksLeft = p.retraining.weeksLeft;\n',
    ]],
    note: 'a week of work counts for nothing; section 2 must go red',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`TACTICS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

/* ---- the engine, regressed in a copy beside the original when a control asks ---- */
const ENGINE = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
let enginePath = `${ROOT_URL}/src/lib/clubManager.ts`;
const ENTRY = `${TMP}/tacticsEngine.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/tacticsEngine.${process.pid}.bundle.mjs`;
let controlCopy = null;
const cleanup = () => {
  for (const f of [controlCopy, ENTRY, BUNDLE]) {
    if (f) { try { fs.rmSync(f, { force: true }); } catch { /* already gone */ } }
  }
  controlCopy = null;
};
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(130); });

const engineSource = lf(fs.readFileSync(ENGINE, 'utf8'));
if (CONTROL) {
  const spec = CONTROLS[CONTROL];
  let src = engineSource;
  for (const [from, to] of spec.edits) {
    if (!src.includes(from)) {
      console.error(`control cannot run: ${spec.what} is not in the shape TACTICS_CONTROL=${CONTROL} rewrites (${from.slice(0, 70).replaceAll('\n', '\\n')}...)`);
      process.exit(1);
    }
    src = src.replace(from, to);
  }
  controlCopy = path.join(ROOT, 'src', 'lib', `__control_clubManager.${CONTROL}.${process.pid}.ts`);
  fs.writeFileSync(controlCopy, src);
  enginePath = controlCopy.replaceAll('\\', '/');
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${spec.note}`);
}

/* The simLiveMatch bundle: the shim goes in before the engine is imported,
   because the engine may touch storage at module scope. positionFit and
   squadDeal ride along so the baselines below are read off the shared
   position rule and the shared nine shapes rather than off the engine. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const mod = await import('${enginePath}');
const fit = await import('${ROOT_URL}/src/lib/positionFit.ts');
const sd = await import('${ROOT_URL}/src/lib/squadDeal.ts');
const fac = await import('${ROOT_URL}/src/lib/clubManagerFacilities.ts');
export const engine = mod;
export const positionFit = fit;
export const squadDeal = sd;
export const facilities = fac;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --alias:@=${ROOT_URL}/src --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const bundle = await import(pathToFileURL(BUNDLE).href);
const cm = bundle.engine;
for (const name of ['startCareer', 'playNextEntry', 'resumeMatch', 'startSecondHalf', 'changeLive', 'makeHalftimeSub', 'liveGoneIds',
  'myOnPitchAt', 'effectiveXIWithSlots', 'autoPickXI', 'resolveXI', 'isAvailable', 'heldPositions',
  'fitGrade', 'FIT_PENALTY', 'xiFitReport', 'xiAverageRating', 'benchFor', 'benchForHalftime', 'CM_FORMATIONS', 'FORMATIONS', 'pitchLineOf',
  'SET_PIECE_KEYS', 'SET_PIECE_INFO', 'SHOOTOUT_TAKER_EDGE_CAP', 'setPieceCandidates', 'ensureSetPieces', 'setSetPiece', 'autoSetPieces', 'shootoutTakerEdge',
  'acceptBid', 'loanOutPlayer',
  'MAX_SECONDARY_POSITIONS', 'RETRAIN_MIN_WEEKS', 'retrainWeeks', 'retrainRefusal', 'startRetraining', 'stopRetraining',
  'DUTIES_BY_LINE', 'DUTY_INFO', 'DUTY_EFFECT', 'DUTY_BOOST_CAP', 'DUTY_SCORING', 'dutyOptions', 'setDuty', 'slotDuty', 'dutyBoost']) {
  if (cm[name] === undefined) { console.error(`the engine does not export ${name}`); process.exit(1); }
}
const {
  startCareer, playNextEntry, resumeMatch, startSecondHalf, makeHalftimeSub, liveGoneIds,
  effectiveXIWithSlots, autoPickXI, resolveXI, isAvailable,
  fitGrade, FIT_PENALTY, xiFitReport, xiAverageRating, benchFor, CM_FORMATIONS, FORMATIONS, pitchLineOf,
  SET_PIECE_KEYS, SET_PIECE_INFO, SHOOTOUT_TAKER_EDGE_CAP, ensureSetPieces, setSetPiece, autoSetPieces, shootoutTakerEdge,
  acceptBid, loanOutPlayer,
  MAX_SECONDARY_POSITIONS, RETRAIN_MIN_WEEKS, retrainWeeks, retrainRefusal, startRetraining, stopRetraining,
  DUTIES_BY_LINE, DUTY_INFO, DUTY_EFFECT, DUTY_BOOST_CAP, DUTY_SCORING, dutyOptions, setDuty, slotDuty, dutyBoost,
} = cm;
const { ALT_POSITIONS, ALL_POSITIONS } = bundle.positionFit;
const SHARED = bundle.squadDeal.FORMATIONS;
const { facilityLevel, ensureFacilities, dressingRoomLift, DRESSING_ROOM_REST } = bundle.facilities;

/* ---- failures, attributed to the section they fell in ---- */
let section = 0;
let failures = 0;
const failedIn = new Map();
const PRINT_CAP = 10;
const fail = m => {
  failures += 1;
  const n = (failedIn.get(section) ?? 0) + 1;
  failedIn.set(section, n);
  if (n <= PRINT_CAP) console.error(`  FAIL [${section}]: ${m}`);
  else if (n === PRINT_CAP + 1) console.error(`  FAIL [${section}]: (further failures in this section not printed)`);
};
const begin = (n, title) => { section = n; console.log(`${n}) ${title}`); };
const J = v => JSON.stringify(v);
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const sdev = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const seOf = a => (a.length > 1 ? sdev(a) / Math.sqrt(a.length) : NaN);
const pct = (n, d) => (d ? (100 * n / d).toFixed(1) : 'n/a');
const clone = v => JSON.parse(J(v));
const num = (label, v) => { if (!Number.isFinite(v)) { fail(`${label} came out as ${v}`); return 0; } return v; };

/* ---- a seeded stream I can rewind, on top of the harness's own ---- */
const OFF = Number(process.env.SIM_SEED) || 0;
const HOUSE_RANDOM = Math.random;
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function withSeed(seed, fn) {
  Math.random = seeded(seed + OFF);
  try { return fn(); } finally { Math.random = HOUSE_RANDOM; }
}

/* ---- this file's own reading of the rules the engine is measured against ---- */
const DEF_POS = new Set(['CB', 'LB', 'RB', 'LWB', 'RWB']);
const MID_POS = new Set(['CDM', 'CM', 'CAM', 'LM', 'RM']);
const lineOf = pos => (pos === 'GK' ? 'GK' : DEF_POS.has(pos) ? 'DEF' : MID_POS.has(pos) ? 'MID' : 'ATT');
const held = p => [p.position, ...(p.secondaryPositions ?? [])];
/** The grade this file expects: the keeper boundary first, then a held position in the slot's list, then the family, else wrong. */
function expectedGrade(p, slot) {
  const slotIsGoal = slot.allowed.includes('GK');
  if (slotIsGoal !== (p.position === 'GK')) return 'keeper';
  const hs = held(p);
  if (hs.some(pos => slot.allowed.includes(pos))) return 'natural';
  if (hs.some(pos => (ALT_POSITIONS[pos] ?? []).some(alt => slot.allowed.includes(alt)))) return 'family';
  return 'wrong';
}
const TIER = { natural: 0, family: 1, wrong: 2, keeper: 2 };
/** The weeks this file expects a retraining to take. */
function expectedWeeks(p, to, level) {
  const hs = held(p);
  const family = hs.some(pos => (ALT_POSITIONS[pos] ?? []).includes(to) || (ALT_POSITIONS[to] ?? []).includes(pos));
  const sameLine = hs.some(pos => lineOf(pos) === lineOf(to));
  const base = family ? 6 : sameLine ? 10 : 16;
  const age = p.age > 30 ? 1.5 : 1;
  return Math.max(4, Math.round((base * age) / (1 + 0.013 * (level - 1))));
}
/** The duty line this file expects a slot label to offer. */
const LABEL_LINE = {
  GK: 'keeper', CB: 'centreBack', RB: 'fullBack', LB: 'fullBack', RWB: 'fullBack', LWB: 'fullBack',
  CDM: 'holdingMid', CM: 'centralMid', CAM: 'attackingMid', RW: 'wide', LW: 'wide', RM: 'wide', LM: 'wide', ST: 'striker', CF: 'striker',
};
/** The pitch band this file expects a label to stand in. */
const LABEL_BANDS = {
  GK: ['keeper'], CB: ['defence'], RB: ['defence'], LB: ['defence'], RWB: ['defence', 'midfield'], LWB: ['defence', 'midfield'],
  CDM: ['midfield'], CM: ['midfield'], RM: ['midfield'], LM: ['midfield'], CAM: ['midfield', 'attack'],
  RW: ['attack'], LW: ['attack'], ST: ['attack'], CF: ['attack'],
};
const bandOfY = y => (y > 86 ? 'keeper' : y >= 62 ? 'defence' : y >= 40 ? 'midfield' : 'attack');

/* ---- the material: six real squads, each with a save standing before a match and the same match paused at the interval ---- */
const CLUBS = ['Everton', 'Real Madrid', 'Wolves', 'Ajax', 'Napoli', 'Newcastle'];
/** { club, fresh: day one, pre: the save before kick off, ht: paused at the interval, seed } */
const material = [];
for (const club of CLUBS) {
  const fresh = withSeed(4100 + club.length, () => startCareer(club));
  let base = fresh;
  let guard = 0;
  while (guard < 30) {
    guard += 1;
    const seed = 70001 + material.length * 7919 + guard;
    const res = withSeed(seed, () => playNextEntry(base));
    if (res.kind === 'seasonOver') break;
    if (res.kind === 'halftime' && res.state.live) {
      /* The third match in, so fitness has spread and the bench has a shape. */
      if (guard >= 3) { material.push({ club, fresh, pre: base, ht: res.state, seed }); break; }
      base = withSeed(seed + 1, () => resumeMatch(res.state)).state;
    } else {
      base = res.state;
    }
  }
}
if (material.length < 5) {
  console.error(`only ${material.length} clubs reached a match, the walk is too shallow to measure anything`);
  process.exit(1);
}
const byId = (state, id) => state.squad.find(p => p.id === id) ?? null;
const swapXi = (state, ia, ib) => {
  const xiIds = [...state.xiIds];
  [xiIds[ia], xiIds[ib]] = [xiIds[ib], xiIds[ia]];
  return { ...state, xiIds };
};
const quick = (state, seed) => withSeed(seed, () => playNextEntry(state, { skipHalftime: true }));
const h1Goals = r => r.report.myScorers.filter(s => s.minute <= 45).length;

/* ---------- 1. fit ---------- */
begin(1, 'Fit: every man is read in his slot, and the wrong slot shows in the football');
{
  /* 1a: the grade on every slot of every shape for every man of every squad. */
  const counts = { natural: 0, family: 0, wrong: 0, keeper: 0 };
  let pairs = 0;
  for (const { club, pre } of material) {
    for (const f of CM_FORMATIONS) {
      for (const slot of f.slots) {
        for (const p of pre.squad) {
          const g = fitGrade(p, slot);
          const e = expectedGrade(p, slot);
          pairs += 1;
          if (g in counts) counts[g] += 1;
          if (g !== e) fail(`${club}: ${p.name} (${p.position}) in ${f.name} ${slot.label} [${slot.allowed}] graded ${g}, the position rule says ${e}`);
        }
      }
    }
  }
  if (!(FIT_PENALTY.natural === 0 && FIT_PENALTY.family > 0 && FIT_PENALTY.wrong > FIT_PENALTY.family && FIT_PENALTY.keeper > FIT_PENALTY.wrong)) {
    fail(`FIT_PENALTY ${J(FIT_PENALTY)} is not ordered natural 0 under family under wrong under keeper`);
  }
  /* 1b: the header's number is the adjusted one, and a natural eleven pays nothing. */
  let natural = 0;
  for (const { club, pre } of material) {
    const rep = xiFitReport(pre);
    if (xiAverageRating(pre) !== rep.rating) fail(`${club}: xiAverageRating ${xiAverageRating(pre)} is not xiFitReport's rating ${rep.rating}`);
    const xi = resolveXI(pre).filter(Boolean);
    const plain = Math.round(mean(xi.map(p => p.rating)));
    if (rep.grades.length !== 11 || rep.grades.some(g => g === null)) fail(`${club}: the fit report grades ${J(rep.grades)} do not cover eleven slots`);
    if (rep.grades.every(g => g === 'natural')) {
      natural += 1;
      if (rep.penalty !== 0) fail(`${club}: a fully natural eleven pays ${rep.penalty}`);
      if (rep.rating !== plain) fail(`${club}: a fully natural eleven prints ${rep.rating}, the plain rounded average is ${plain}`);
    }
    /* And a swapped eleven pays exactly what the table says, on those men only. */
    const f = CM_FORMATIONS[pre.formationIndex];
    const st = f.slots.findIndex(s => s.label === 'ST');
    const swapped = swapXi(pre, 0, st);
    const rs = xiFitReport(swapped);
    if (xiAverageRating(swapped) !== rs.rating) fail(`${club}: xiAverageRating on the swapped eleven ${xiAverageRating(swapped)} is not the report's ${rs.rating}`);
    const penSum = rs.grades.reduce((s, g) => s + (g ? FIT_PENALTY[g] : 0), 0);
    if (rs.penalty !== Math.round((penSum / 11) * 10) / 10) fail(`${club}: the swapped eleven's penalty ${rs.penalty} is not the table's ${Math.round((penSum / 11) * 10) / 10}`);
    if (rs.rating !== Math.round(mean(xi.map(p => p.rating)) - penSum / 11)) fail(`${club}: the swapped eleven's rating ${rs.rating} is not the plain average minus the penalties`);
  }
  if (natural < 3) fail(`only ${natural} of ${material.length} auto picked elevens are fully natural, too few to prove the zero`);
  console.log(`   ${pairs} man and slot pairs over ${CM_FORMATIONS.length} shapes and ${material.length} squads graded as the position rule says (natural ${counts.natural}, family ${counts.family}, wrong ${counts.wrong}, keeper ${counts.keeper}), FIT_PENALTY ${FIT_PENALTY.natural}/${FIT_PENALTY.family}/${FIT_PENALTY.wrong}/${FIT_PENALTY.keeper}, xiAverageRating is the adjusted figure, ${natural} fully natural elevens pay 0 and print their plain average`);

  /* 1c: the outcome, three arms on common random numbers. */
  const SEEDS_PER_CLUB = 600;
  const arms = [];
  for (const m of material) {
    const f = CM_FORMATIONS[m.pre.formationIndex];
    const st = f.slots.findIndex(s => s.label === 'ST');
    const rb = f.slots.findIndex(s => s.label === 'RB' || s.label === 'RWB');
    const lb = f.slots.findIndex(s => s.label === 'LB' || s.label === 'LWB');
    if (st < 0 || rb < 0 || lb < 0) continue;
    const A = m.pre;
    const B = swapXi(A, 0, st);
    const F = swapXi(A, rb, lb);
    const gB = xiFitReport(B).grades;
    const gF = xiFitReport(F).grades;
    /* The keeper swap grades keeper on both men. The flank swap grades family
       on at least one (the shared RB slot allows a CB and autoPickXI takes
       the best rated fit, so most elevens carry a centre back at right back
       who reads natural on the other flank too) and nothing worse. */
    if (gB.filter(g => g === 'keeper').length !== 2) continue;
    if (!gF.includes('family') || gF.some(g => g === 'wrong' || g === 'keeper')) continue;
    /* And the eleven that kicks off must be the eleven that was graded:
       xiFitReport reads the picked ids, kickOff reads effectiveXIWithSlots,
       and a man who is hurt or banned is replaced at kick off by a fit for
       his slot, which would silently take the penalty off the pitch. */
    const intact = s => J(effectiveXIWithSlots(s).map(x => x.p.id)) === J(s.xiIds);
    if (!intact(A) || !intact(B) || !intact(F)) continue;
    if (arms.length < 4) arms.push({ ...m, A, B, F, familyGrades: gF.filter(g => g === 'family').length });
  }
  if (arms.length < 3) fail(`only ${arms.length} clubs could field the three arms`);
  let seeds = 0;
  let h1Greater = 0;
  let h1Wrong = 0;
  const forA = []; const forB = []; const forF = [];
  const agA = []; const agB = []; const agF = [];
  const lamGaps = [];
  for (const arm of arms) {
    const ctx = arm.club;
    /* The lambda, exact: the halftime save carries the first half's. */
    const lam = s => withSeed(arm.seed, () => playNextEntry(s)).state.live?.lamMine;
    const lA = num(`${ctx} lamMine A`, lam(arm.A));
    const lB = num(`${ctx} lamMine B`, lam(arm.B));
    const lF = num(`${ctx} lamMine F`, lam(arm.F));
    if (!(lA > lF && lF > lB)) fail(`${ctx}: first half lambda natural ${lA.toFixed(4)}, family ${lF.toFixed(4)}, keeper swap ${lB.toFixed(4)} is not ordered A above F above B`);
    lamGaps.push(lA - lB);
    for (let k = 0; k < SEEDS_PER_CLUB; k++) {
      const seed = 100000 + seeds * 17;
      seeds += 1;
      const rA = quick(arm.A, seed);
      const rB = quick(arm.B, seed);
      const rF = quick(arm.F, seed);
      if (rA.kind !== 'match' || rB.kind !== 'match' || rF.kind !== 'match') { fail(`${ctx} seed ${seed}: an arm came back ${rA.kind}/${rB.kind}/${rF.kind}`); continue; }
      const hA = h1Goals(rA); const hB = h1Goals(rB); const hF = h1Goals(rF);
      if (!(hA >= hF && hF >= hB)) { h1Wrong += 1; fail(`${ctx} seed ${seed}: first half goals natural ${hA}, family ${hF}, keeper swap ${hB} on one stream`); }
      if (hA > hB) h1Greater += 1;
      forA.push(rA.report.myScorers.length); forB.push(rB.report.myScorers.length); forF.push(rF.report.myScorers.length);
      agA.push(rA.report.oppScorers.length); agB.push(rB.report.oppScorers.length); agF.push(rF.report.oppScorers.length);
    }
  }
  const dFor = forA.map((g, i) => g - forB[i]);
  const dAg = agB.map((g, i) => g - agA[i]);
  const seFor = seOf(dFor);
  const seAg = seOf(dAg);
  const tFor = mean(dFor) / seFor;
  const tAg = mean(dAg) / seAg;
  const H1_SHARE_FLOOR = 0.03;
  if (seeds < 300) fail(`only ${seeds} seeds compared`);
  if (!(tFor > 3)) fail(`the keeper swap scored ${mean(forB).toFixed(3)} a match against the natural eleven's ${mean(forA).toFixed(3)}: gap ${mean(dFor).toFixed(3)} is ${tFor.toFixed(1)} standard errors, needs 3`);
  if (!(tAg > 3)) fail(`the keeper swap conceded ${mean(agB).toFixed(3)} a match against the natural eleven's ${mean(agA).toFixed(3)}: gap ${mean(dAg).toFixed(3)} is ${tAg.toFixed(1)} standard errors, needs 3`);
  if (!(h1Greater / seeds >= H1_SHARE_FLOOR)) fail(`the natural eleven out scored the keeper swap in the first half on ${pct(h1Greater, seeds)} percent of seeds, floor ${Math.round(H1_SHARE_FLOOR * 100)}`);
  const seF = Math.max(seOf(forF), seFor);
  const seG = Math.max(seOf(agF), seAg);
  if (!(mean(forF) >= mean(forB) - 2 * seF && mean(forF) <= mean(forA) + 2 * seF)) fail(`the family arm scored ${mean(forF).toFixed(3)} a match, outside the band ${mean(forB).toFixed(3)} to ${mean(forA).toFixed(3)} widened by two standard errors (${(2 * seF).toFixed(3)})`);
  if (!(mean(agF) >= mean(agA) - 2 * seG && mean(agF) <= mean(agB) + 2 * seG)) fail(`the family arm conceded ${mean(agF).toFixed(3)} a match, outside the band ${mean(agA).toFixed(3)} to ${mean(agB).toFixed(3)} widened by two standard errors (${(2 * seG).toFixed(3)})`);
  console.log(`   ${seeds} seeds over ${arms.length} clubs (family arm ${arms.map(a => a.familyGrades).join('/')} family grades), common random numbers: goals for natural ${mean(forA).toFixed(3)}, family ${mean(forF).toFixed(3)}, keeper swap ${mean(forB).toFixed(3)} (paired gap ${mean(dFor).toFixed(3)}, ${tFor.toFixed(1)} se, needs 3); against ${mean(agA).toFixed(3)}, ${mean(agF).toFixed(3)}, ${mean(agB).toFixed(3)} (gap ${mean(dAg).toFixed(3)}, ${tAg.toFixed(1)} se, needs 3); first half lambda gap ${Math.min(...lamGaps).toFixed(3)} to ${Math.max(...lamGaps).toFixed(3)} ordered A, F, B on every club; first half goals never out of order (${h1Wrong} seeds), natural above keeper swap on ${pct(h1Greater, seeds)} percent (floor ${Math.round(H1_SHARE_FLOOR * 100)})`);
}

/* ---------- 2. retraining ---------- */
begin(2, 'Retraining: a second position is earned over counted weeks');
{
  /* 2a: fresh real squads carry none. */
  let real = 0;
  let withSecondary = 0;
  let withRetraining = 0;
  for (const { fresh } of material) {
    for (const p of fresh.squad) {
      if (!p.generated) real += 1;
      if (p.secondaryPositions) withSecondary += 1;
      if (p.retraining) withRetraining += 1;
    }
  }
  if (withSecondary || withRetraining) fail(`${withSecondary} men start with a second position and ${withRetraining} with a retraining on day one`);
  if (real < 60) fail(`only ${real} real footballers across ${material.length} fresh squads`);

  /* 2b: the quote against this file's formula, every outfielder, every outfield position he does not hold, every training ground level. */
  let quotes = 0;
  let minQuote = Infinity;
  const byBase = new Map();
  for (const { club, fresh } of material) {
    const facs = ensureFacilities(clone(fresh));
    for (let level = 1; level <= 10; level++) {
      const s = { ...fresh, facilities: { ...facs, trainingGround: level } };
      if (facilityLevel(s, 'trainingGround') !== level) { fail(`${club}: the training ground would not sit at level ${level}`); continue; }
      for (const p of fresh.squad) {
        if (p.position === 'GK') continue;
        for (const to of ALL_POSITIONS) {
          if (to === 'GK' || held(p).includes(to)) continue;
          const got = retrainWeeks(s, p, to);
          const want = expectedWeeks(p, to, level);
          quotes += 1;
          minQuote = Math.min(minQuote, got);
          if (got !== want) fail(`${club}: ${p.name} (${p.position}, ${p.age}) to ${to} at training ground ${level} quoted ${got} weeks, the formula says ${want}`);
          if (level === 1 && p.age <= 30) {
            const key = held(p).some(pos => (ALT_POSITIONS[pos] ?? []).includes(to) || (ALT_POSITIONS[to] ?? []).includes(pos)) ? 'family' : held(p).some(pos => lineOf(pos) === lineOf(to)) ? 'same line' : 'cross line';
            byBase.set(key, got);
          }
        }
      }
    }
  }
  if (!(minQuote >= RETRAIN_MIN_WEEKS) || RETRAIN_MIN_WEEKS !== 4) fail(`the shortest quote is ${minQuote} against a floor of ${RETRAIN_MIN_WEEKS} (which must be 4)`);
  if (byBase.get('family') !== 6 || byBase.get('same line') !== 10 || byBase.get('cross line') !== 16) fail(`the base quotes read ${J([...byBase])}, expected family 6, same line 10, cross line 16`);
  /* The over thirty rule and the training ground, on one man each way. */
  {
    const { fresh } = material[0];
    const facs = ensureFacilities(clone(fresh));
    const young = fresh.squad.find(p => p.position === 'CM' && p.age <= 30) ?? fresh.squad.find(p => lineOf(p.position) === 'MID' && p.age <= 30);
    const old = fresh.squad.find(p => p.position !== 'GK' && p.age > 30);
    const level1 = { ...fresh, facilities: { ...facs, trainingGround: 1 } };
    const level10 = { ...fresh, facilities: { ...facs, trainingGround: 10 } };
    if (young) {
      if (retrainWeeks(level1, young, 'CB') !== 16) fail(`${young.name} (${young.position}) to CB at level 1 quoted ${retrainWeeks(level1, young, 'CB')}, not 16`);
      if (!(retrainWeeks(level10, young, 'CB') < retrainWeeks(level1, young, 'CB'))) fail(`the training ground at 10 did not shorten ${young.name}'s cross line quote (${retrainWeeks(level10, young, 'CB')} against ${retrainWeeks(level1, young, 'CB')})`);
    } else fail('no midfielder aged 30 or under to quote');
    if (old) {
      const to = lineOf(old.position) === 'DEF' ? 'ST' : 'CB';
      if (retrainWeeks(level1, old, to) !== 24) fail(`${old.name} (${old.position}, ${old.age}) across lines at level 1 quoted ${retrainWeeks(level1, old, to)}, not 24`);
    } else fail('no outfielder over thirty to quote');
  }

  /* 2c: refusals. */
  const { fresh } = material[0];
  const gk = fresh.squad.find(p => p.position === 'GK');
  const cm0 = fresh.squad.find(p => p.position === 'CM' && p.age <= 30 && isAvailable(p)) ?? fresh.squad.find(p => p.position === 'CM');
  if (!gk || !cm0) { fail('no keeper or no central midfielder to refuse'); }
  else {
    if (startRetraining(fresh, gk.id, 'CB') !== null) fail('a keeper was allowed to retrain outfield');
    if (startRetraining(fresh, cm0.id, 'GK') !== null) fail('an outfielder was allowed to retrain in goal');
    if (startRetraining(fresh, cm0.id, 'CM') !== null) fail('a man was allowed to retrain into the position he holds');
    if (startRetraining(fresh, 'p-nobody', 'CB') !== null) fail('a man not in the squad was allowed to retrain');
    if (typeof retrainRefusal(gk, 'CB') !== 'string' || typeof retrainRefusal(cm0, 'GK') !== 'string' || typeof retrainRefusal(cm0, 'CM') !== 'string' || typeof retrainRefusal(undefined, 'CB') !== 'string') fail('retrainRefusal has no words for a refusal');
    if (retrainRefusal(cm0, 'RM') !== null) fail(`retrainRefusal refuses a legal retraining: ${retrainRefusal(cm0, 'RM')}`);
  }

  /* 2d: the countdown, week by week, then the cap. */
  if (cm0) {
    const rmSlot = CM_FORMATIONS[1].slots.find(s => s.label === 'RM');
    if (fitGrade(cm0, rmSlot) === 'natural') fail(`${cm0.name} already reads natural at RM before learning it`);
    let s = startRetraining(fresh, cm0.id, 'RM');
    if (!s) { fail(`${cm0.name} could not start learning RM`); }
    else {
      const started = byId(s, cm0.id);
      const total = started.retraining?.weeksTotal;
      if (started.retraining?.weeksLeft !== total || total !== retrainWeeks(fresh, cm0, 'RM')) fail(`the retraining started as ${J(started.retraining)}, quoted ${retrainWeeks(fresh, cm0, 'RM')}`);
      if (startRetraining(s, cm0.id, 'CB') !== null) fail('a second retraining was allowed while one runs');
      if (byId(stopRetraining(s, cm0.id), cm0.id).retraining) fail('stopRetraining left the retraining in place');
      if (!startRetraining(stopRetraining(s, cm0.id), cm0.id, 'CB')) fail('a new retraining was refused after the first was stopped');
      const week0 = s.week;
      let prevElapsed = 0;
      let calls = 0;
      let done = false;
      let ticks = 0;
      while (calls < 60 && !done) {
        const r = withSeed(200000 + calls, () => playNextEntry(s, { skipHalftime: true }));
        calls += 1;
        s = r.state;
        const p = byId(s, cm0.id);
        if (!p) { fail(`${cm0.name} left the squad mid retraining`); break; }
        const elapsed = s.week - week0;
        if (p.retraining) {
          ticks += 1;
          if (p.retraining.weeksLeft !== total - elapsed) fail(`after ${elapsed} weeks weeksLeft reads ${p.retraining.weeksLeft}, expected ${total - elapsed}`);
          if (elapsed >= total) fail(`${elapsed} weeks gone of ${total} and he is still learning`);
        } else {
          done = true;
          if (!(prevElapsed < total && total <= elapsed)) fail(`the retraining finished with ${elapsed} weeks gone (was ${prevElapsed}) of ${total}`);
          if (!(p.secondaryPositions ?? []).includes('RM')) fail(`RM is not in his positions after the weeks: ${J(p.secondaryPositions)}`);
          if (!s.aiHeadlines.some(h => h.includes(cm0.name) && h.includes('RM'))) fail(`no headline names ${cm0.name} learning RM: ${J(s.aiHeadlines)}`);
          if (fitGrade(p, rmSlot) !== 'natural') fail(`${cm0.name} reads ${fitGrade(p, rmSlot)} at RM after learning it`);
          if (expectedGrade(p, rmSlot) !== 'natural') fail('this file no longer reads a learned position as natural');
        }
        prevElapsed = elapsed;
        if (r.kind === 'seasonOver') break;
      }
      if (!done) fail(`${cm0.name} never finished learning RM in ${calls} calls`);
      /* The cap: two more, the newest two kept. */
      if (done) {
        const push = (state, to, seed) => {
          let n = startRetraining(state, cm0.id, to);
          if (!n) { fail(`could not start ${to}`); return state; }
          n = clone(n);
          byId(n, cm0.id).retraining.weeksLeft = 1;
          const r = withSeed(seed, () => playNextEntry(n, { skipHalftime: true }));
          return r.state;
        };
        s = push(s, 'CB', 210001);
        let p = byId(s, cm0.id);
        if (J(p.secondaryPositions) !== J(['RM', 'CB'])) fail(`after learning CB his positions read ${J(p.secondaryPositions)}, expected RM then CB`);
        s = push(s, 'ST', 210002);
        p = byId(s, cm0.id);
        if (J(p.secondaryPositions) !== J(['CB', 'ST'])) fail(`after a third position his list reads ${J(p.secondaryPositions)}, expected the newest two CB then ST`);
        if ((p.secondaryPositions ?? []).length > MAX_SECONDARY_POSITIONS || MAX_SECONDARY_POSITIONS !== 2) fail(`the cap is ${MAX_SECONDARY_POSITIONS} and he holds ${(p.secondaryPositions ?? []).length}`);
        if (startRetraining(s, cm0.id, 'CB') !== null) fail('he was allowed to relearn a position he holds');
      }
      console.log(`   ${real} real footballers on ${material.length} fresh squads, none with a second position; ${quotes} quotes equal the formula (family 6, same line 10, cross line 16, x1.5 past thirty, training ground 1 to 10, shortest ${minQuote}, floor ${RETRAIN_MIN_WEEKS}); keeper, held position, second retraining and a stranger refused; ${cm0.name} learned RM in ${total} counted weeks (${ticks} ticks checked) with a headline and reads natural there, then CB and ST kept the newest two`);
    }
  }
}

/* ---------- 3. set pieces ---------- */
begin(3, 'Set pieces: the armband and the takers reach the stream');
{
  /* 3a: the fresh block. */
  let filled = 0;
  for (const { club, fresh } of material) {
    const s = clone(fresh);
    const sp = ensureSetPieces(s);
    if (J(s.setPieces) !== J(sp)) fail(`${club}: ensureSetPieces did not write the block on the save`);
    for (const k of SET_PIECE_KEYS) {
      const p = byId(s, sp[k]);
      if (!p) { fail(`${club}: ${k} is ${J(sp[k])} on a fresh save`); continue; }
      if (p.onLoan) fail(`${club}: ${k} went to ${p.name}, who is on loan`);
      if (k !== 'captain' && p.position === 'GK') fail(`${club}: ${k} went to the keeper ${p.name}`);
      filled += 1;
    }
    const cap = byId(s, sp.captain);
    const grown = s.squad.filter(p => !p.onLoan && !p.isYouth && p.age >= 24 && p.rating >= 76);
    if (cap && grown.length && !(cap.age >= 24 && cap.rating >= 76 && !cap.isYouth)) fail(`${club}: the captain ${cap.name} (${cap.age}, ${cap.rating}) with ${grown.length} men aged 24 plus and rated 76 plus available`);
    if (sp.cornersLeft && sp.cornersLeft === sp.cornersRight && s.squad.filter(p => p.position !== 'GK' && !p.onLoan).length >= 2) fail(`${club}: both corner jobs went to one man`);
    if (SET_PIECE_KEYS.some(k => !SET_PIECE_INFO[k]?.label)) fail('a set piece job has no label');
    /* Again on a save that already has one: idempotent. */
    const again = ensureSetPieces(s);
    if (J(again) !== J(sp)) fail(`${club}: a second ensureSetPieces changed a full block`);
    /* A job naming a man who left is cleared and refilled. */
    const gone = clone(s);
    gone.squad = gone.squad.filter(p => p.id !== sp.captain);
    const sp2 = ensureSetPieces(gone);
    if (sp2.captain === sp.captain || !sp2.captain) fail(`${club}: the captain who left is still ${J(sp2.captain)}`);
    const auto = autoSetPieces(s);
    if (J(auto.setPieces) !== J(sp)) fail(`${club}: autoSetPieces on a fresh block gives ${J(auto.setPieces)} against ${J(sp)}`);
  }
  /* 3b: refusals. */
  {
    const s = clone(material[0].fresh);
    ensureSetPieces(s);
    const gk = s.squad.find(p => p.position === 'GK');
    const out = s.squad.find(p => p.position !== 'GK');
    if (setSetPiece(s, 'penalties', 'p-nobody') !== null) fail('a man not in the squad was handed the penalties');
    const loaned = clone(s);
    byId(loaned, out.id).onLoan = true;
    if (setSetPiece(loaned, 'captain', out.id) !== null) fail('a man on loan was handed the armband');
    if (setSetPiece(s, 'cornersLeft', gk.id) !== null) fail('the keeper was handed the left corners');
    if (setSetPiece(s, 'freeKicks', gk.id) !== null) fail('the keeper was handed the free kicks');
    const capGk = setSetPiece(s, 'captain', gk.id);
    if (!capGk || capGk.setPieces.captain !== gk.id) fail('a keeper was refused the armband');
    const pens = setSetPiece(s, 'penalties', out.id);
    if (!pens || pens.setPieces.penalties !== out.id) fail('an outfielder was refused the penalties');
    if (pens && pens.setPieces === s.setPieces) fail('setSetPiece changed the save it was given');
  }
  /* 3c: the stream. */
  const PER_CLUB = 25;
  let matches = 0;
  let cornersMine = 0;
  let flanked = 0;
  let takerOn = 0;
  let takerRight = 0;
  let pens = 0;
  let fks = 0;
  let eligible = 0;
  let credited = 0;
  let savedPens = 0;
  let oppFlags = 0;
  for (const m of material) {
    const s0 = clone(m.pre);
    const sp = ensureSetPieces(s0);
    const startXi = new Set(effectiveXIWithSlots(s0).map(x => x.p.id));
    const nameCount = new Map();
    for (const p of s0.squad) nameCount.set(p.name, (nameCount.get(p.name) ?? 0) + 1);
    for (let k = 0; k < PER_CLUB; k++) {
      const seed = 300000 + matches * 13;
      const r = quick(s0, seed);
      matches += 1;
      if (r.kind !== 'match' || !r.report?.detail?.play) { fail(`${m.club} seed ${seed}: the quick sim came back ${r.kind}`); continue; }
      const d = r.report.detail;
      const exits = new Map();
      for (const c of d.cards) if (c.kind === 'red' && c.id) exits.set(c.id, c.minute);
      for (const inj of d.injuries) if (inj.id) exits.set(inj.id, Math.min(exits.get(inj.id) ?? 99, inj.minute));
      const onAt = (p, minute) => startXi.has(p.id) && (exits.get(p.id) ?? 99) > minute;
      for (const e of d.play) {
        if (e.side !== 'me') continue;
        if (e.kind === 'shot' && e.penalty && !e.goal) savedPens += 1;
        if (e.kind !== 'corner') continue;
        cornersMine += 1;
        if (e.flank !== 'left' && e.flank !== 'right') { fail(`${m.club} seed ${seed}: a corner at ${e.minute} with flank ${J(e.flank)}`); continue; }
        flanked += 1;
        const taker = byId(s0, e.flank === 'left' ? sp.cornersLeft : sp.cornersRight);
        if (!taker || nameCount.get(taker.name) !== 1) continue;
        if (!onAt(taker, e.minute)) continue;
        takerOn += 1;
        if (e.who === taker.name) takerRight += 1;
      }
      for (const g of r.report.myScorers) {
        if (!g.penalty && !g.freeKick) continue;
        if (g.penalty) pens += 1; else fks += 1;
        const taker = byId(s0, g.penalty ? sp.penalties : sp.freeKicks);
        if (!taker || nameCount.get(taker.name) !== 1) continue;
        if (!onAt(taker, g.minute)) continue;
        eligible += 1;
        if (g.name === taker.name) credited += 1;
        else fail(`${m.club} seed ${seed}: a ${g.penalty ? 'penalty' : 'free kick'} at ${g.minute} went to ${g.name} with ${taker.name} on the pitch`);
        if (!d.play.some(e => e.side === 'me' && e.kind === 'shot' && e.goal && e.minute === g.minute && ((g.penalty && e.penalty) || (g.freeKick && e.freeKick)))) fail(`${m.club} seed ${seed}: the goal at ${g.minute} is flagged on the scorer line and not on its shot`);
      }
      for (const g of r.report.oppScorers) if (g.penalty || g.freeKick) oppFlags += 1;
    }
  }
  const CORNER_FLOOR = 0.9;
  const cornerShare = takerOn ? takerRight / takerOn : 0;
  if (matches < 30) fail(`only ${matches} quick sims`);
  if (flanked !== cornersMine) fail(`${cornersMine - flanked} of my ${cornersMine} corners carry no flank`);
  if (takerOn < 50) fail(`the assigned taker was on the pitch for only ${takerOn} corners`);
  if (!(cornerShare >= CORNER_FLOOR)) fail(`the assigned man took ${takerRight} of ${takerOn} corners with him on the pitch (${pct(takerRight, takerOn)} percent), floor ${Math.round(CORNER_FLOOR * 100)}`);
  if (eligible < 3) fail(`only ${eligible} penalty or free kick goals had the taker on the pitch, too few to prove the crediting`);
  console.log(`   ${matches} quick sims: ${cornersMine} corners of mine every one with a flank, the assigned man took ${takerRight} of ${takerOn} with him on the pitch (${pct(takerRight, takerOn)} percent, floor ${Math.round(CORNER_FLOOR * 100)}); ${pens} penalty and ${fks} free kick goals, ${credited} of ${eligible} credited to the taker with him on the pitch (floor: all), ${savedPens} saved penalties, ${oppFlags} of theirs flagged; ${filled} jobs filled on ${material.length} fresh saves`);

  /* 3d: the shootout edge. */
  {
    let checked = 0;
    let atCap = 0;
    for (let r = 40; r <= 99; r++) {
      const got = shootoutTakerEdge({ rating: r });
      const want = Math.max(-SHOOTOUT_TAKER_EDGE_CAP, Math.min(SHOOTOUT_TAKER_EDGE_CAP, (r - 75) * 0.004));
      checked += 1;
      if (Math.abs(got - want) > 1e-9) fail(`shootoutTakerEdge at ${r} is ${got}, expected ${want}`);
      if (Math.abs(got) > SHOOTOUT_TAKER_EDGE_CAP + 1e-12) fail(`shootoutTakerEdge at ${r} is ${got}, past the cap ${SHOOTOUT_TAKER_EDGE_CAP}`);
      if (Math.abs(got) === SHOOTOUT_TAKER_EDGE_CAP) atCap += 1;
    }
    if (SHOOTOUT_TAKER_EDGE_CAP !== 0.06) fail(`SHOOTOUT_TAKER_EDGE_CAP is ${SHOOTOUT_TAKER_EDGE_CAP}, the design says 0.06`);
    if (shootoutTakerEdge(null) !== 0 || shootoutTakerEdge(undefined) !== 0) fail('shootoutTakerEdge with nobody assigned is not 0');
    if (!atCap) fail('no rating reached the shootout cap, so the clamp was never exercised');
    console.log(`   shootoutTakerEdge over ${checked} ratings 40 to 99: equals the clamped formula, ${atCap} ratings pinned at plus or minus ${SHOOTOUT_TAKER_EDGE_CAP}, nobody assigned is 0`);
  }

  /* 3e: the armband, two arms on common random numbers. */
  {
    let played = 0;
    let defeats = 0;
    let starterRows = 0;
    let captainRows = 0;
    let otherRows = 0;
    let liftRows = 0;
    let skipped = 0;
    let nearRest = 0;
    for (const m of material) {
      const s0 = clone(m.pre);
      ensureSetPieces(s0);
      /* The week's tick lifts a man sitting under DRESSING_ROOM_REST by a
         fraction of a point (Round 467), so a pair that straddles that line
         after the match differs by one minus the lift rather than one. That
         is the dressing room, not the armband, and it is tolerated only on
         a pair within two points of the line. */
      const lift = dressingRoomLift(s0);
      const straddles = (a, b) => Math.abs(a - DRESSING_ROOM_REST) <= 2 || Math.abs(b - DRESSING_ROOM_REST) <= 2;
      const xiSet = new Set(s0.xiIds.filter(Boolean));
      const capMan = s0.squad.find(p => xiSet.has(p.id) && p.position !== 'GK' && isAvailable(p));
      const benchMan = s0.squad.find(p => !xiSet.has(p.id) && p.position !== 'GK' && isAvailable(p));
      if (!capMan || !benchMan) { fail(`${m.club}: nobody to wear the armband or nobody to hold it on the bench`); continue; }
      const A = setSetPiece(s0, 'captain', capMan.id);
      const B = setSetPiece(s0, 'captain', benchMan.id);
      if (!A || !B) { fail(`${m.club}: the armband could not be handed out`); continue; }
      for (let k = 0; k < 20; k++) {
        const seed = 400000 + played * 7 + k;
        const rA = quick(A, seed);
        const rB = quick(B, seed);
        if (rA.kind !== 'match' || rB.kind !== 'match') { fail(`${m.club} seed ${seed}: an arm came back ${rA.kind}/${rB.kind}`); continue; }
        if (J(rA.report.myScorers) !== J(rB.report.myScorers) || J(rA.report.oppScorers) !== J(rB.report.oppScorers)) { fail(`${m.club} seed ${seed}: the armband changed the match`); continue; }
        const onA = new Set(rA.report.detail.myRatings.map(l => l.name));
        const onB = new Set(rB.report.detail.myRatings.map(l => l.name));
        if (!onA.has(capMan.name) || onB.has(benchMan.name)) { skipped += 1; continue; }
        played += 1;
        const lost = !rA.report.won && !rA.report.drawn;
        if (lost) defeats += 1;
        for (const pA of rA.state.squad) {
          const pB = byId(rB.state, pA.id);
          if (!pB) continue;
          if (pB.morale <= 5 || pB.morale >= 99 || pA.morale >= 99 || pA.morale <= 5) continue;
          const diff = pA.morale - pB.morale;
          const isCap = pA.id === capMan.id;
          const wasOn = onA.has(pA.name);
          const want = isCap ? (lost ? 2 : 1) : (lost && wasOn ? 1 : 0);
          if (isCap) captainRows += 1;
          else if (lost && wasOn) starterRows += 1;
          else otherRows += 1;
          if (!lost && isCap) liftRows += 1;
          const exact = Math.abs(diff - want) < 1e-9;
          const roomLift = !exact && want !== 0 && straddles(pA.morale, pB.morale) && Math.abs(diff - want) <= lift + 1e-9;
          if (roomLift) nearRest += 1;
          if (!exact && !roomLift) fail(`${m.club} seed ${seed}: ${pA.name} (${isCap ? 'captain' : wasOn ? 'played' : 'did not play'}, ${lost ? 'defeat' : 'not a defeat'}) is ${diff} morale off the arm without a captain, expected ${want}`);
        }
      }
    }
    if (defeats < 10) fail(`only ${defeats} defeats to measure the armband on`);
    if (starterRows < 50) fail(`only ${starterRows} men who played a defeat`);
    console.log(`   ${played} matches both arms (${skipped} skipped, the armband not on the pitch), ${defeats} defeats: ${starterRows} men who played lost exactly one point less with the captain out there, the captain ${captainRows} rows (two in a defeat, one otherwise, ${liftRows} lifts), ${otherRows} other rows unmoved, ${nearRest} pairs on the dressing room rest line within its lift`);
  }

  /* 3f: a sale or a loan out clears the jobs. */
  {
    let cleared = 0;
    for (const m of material) {
      const s = clone(m.pre);
      ensureSetPieces(s);
      const xiSet = new Set(s.xiIds.filter(Boolean));
      const cap = s.squad.find(p => xiSet.has(p.id) && p.position !== 'GK' && !p.onLoan);
      const other = s.squad.find(p => p.id !== cap?.id && p.position !== 'GK' && !p.onLoan);
      if (!cap || !other || s.squad.length <= 15) { fail(`${m.club}: no man to sell`); continue; }
      let all = s;
      for (const k of SET_PIECE_KEYS) {
        all = setSetPiece(all, k, cap.id);
        if (!all) { fail(`${m.club}: ${k} could not go to ${cap.name}`); break; }
      }
      if (!all) continue;
      all = { ...all, transferWindow: 'summer', windowWeeksLeft: 4, incomingBids: [
        { playerId: cap.id, playerName: cap.name, club: 'Bidding Club', offer: 20, status: 'open' },
        { playerId: other.id, playerName: other.name, club: 'Bidding Club', offer: 5, status: 'open' },
      ] };
      const sold = withSeed(500001, () => acceptBid(all, cap.id));
      if (!sold) { fail(`${m.club}: the bid for ${cap.name} could not be accepted`); continue; }
      for (const k of SET_PIECE_KEYS) if (sold.setPieces?.[k] !== null) fail(`${m.club}: ${k} still reads ${J(sold.setPieces?.[k])} after ${cap.name} was sold`);
      if (sold.squad.some(p => p.id === cap.id)) fail(`${m.club}: ${cap.name} is still in the squad after the sale`);
      const soldOther = withSeed(500002, () => acceptBid(all, other.id));
      if (!soldOther) fail(`${m.club}: the bid for ${other.name} could not be accepted`);
      else for (const k of SET_PIECE_KEYS) if (soldOther.setPieces?.[k] !== cap.id) fail(`${m.club}: selling ${other.name} moved ${k} off ${cap.name}`);
      const loaned = withSeed(500003, () => loanOutPlayer(all, cap.id));
      if (!loaned) { fail(`${m.club}: ${cap.name} could not be loaned out`); continue; }
      for (const k of SET_PIECE_KEYS) if (loaned.setPieces?.[k] !== null) fail(`${m.club}: ${k} still reads ${J(loaned.setPieces?.[k])} after ${cap.name} was loaned out`);
      /* And the next match refills every job with somebody else. */
      const next = withSeed(500004, () => playNextEntry(loaned, { skipHalftime: true }));
      for (const k of SET_PIECE_KEYS) {
        const id = next.state.setPieces?.[k];
        if (!id || id === cap.id || !byId(next.state, id)) fail(`${m.club}: ${k} reads ${J(id)} at the next match after ${cap.name} left`);
      }
      cleared += 1;
    }
    console.log(`   ${cleared} clubs: every job naming the captain cleared by a sale and by a loan out, a sale of another man left them alone, the next match refilled them with men still here`);
  }
}

/* ---------- 4. duties ---------- */
begin(4, 'Duties: what a slot is asked to do moves the football, a little');
{
  /* 4a: the options per slot, the refusals, the drop. */
  let slots = 0;
  for (const f of CM_FORMATIONS) {
    f.slots.forEach((slot, i) => {
      slots += 1;
      const want = DUTIES_BY_LINE[LABEL_LINE[slot.label]];
      if (!want) { fail(`${f.name} slot ${i} has a label this file does not know: ${slot.label}`); return; }
      if (J(dutyOptions(slot)) !== J(want)) fail(`${f.name} ${slot.label} offers ${J(dutyOptions(slot))}, expected ${J(want)}`);
    });
  }
  const allDuties = Object.values(DUTIES_BY_LINE).flat();
  if (new Set(allDuties).size !== 17 || allDuties.some(d => !DUTY_INFO[d]?.label || !DUTY_EFFECT[d])) fail(`the duty table has ${new Set(allDuties).size} distinct duties, or one without a label or an effect`);
  {
    const s = { ...material[0].pre, formationIndex: 0 };
    if (setDuty(s, 0, 'poacher') !== null) fail('the keeper was given the poacher duty');
    if (setDuty(s, 9, 'sweeper') !== null) fail('the striker was given the sweeper duty');
    if (setDuty(s, 11, 'cover') !== null) fail('a slot that is not there took a duty');
    const set = setDuty(s, 1, 'attackingFullBack');
    if (!set || slotDuty(set, CM_FORMATIONS[0], 1) !== 'attackingFullBack') fail('the right back did not take the attacking full back duty');
    const cleared = set && setDuty(set, 1, null);
    if (!cleared || slotDuty(cleared, CM_FORMATIONS[0], 1) !== null) fail('the duty could not be cleared');
    const foreign = set && { ...set, xiDuties: ['poacher', ...set.xiDuties.slice(1)] };
    if (!foreign || slotDuty(foreign, CM_FORMATIONS[0], 0) !== null) fail('slotDuty kept a poacher duty on the keeper slot');
    /* The same stored duty read through a shape whose slot 1 is a centre back: dropped, not carried. */
    if (set && slotDuty(set, CM_FORMATIONS[5], 1) !== null) fail('a full back duty was read on a centre back slot after a shape change');
  }
  /* 4b: dutyBoost equals the summed effects, clamped, and the cap is under a mentality step. */
  let steps = [];
  {
    let checks = 0;
    let clamped = 0;
    let maxAbs = 0;
    withSeed(600000, () => {
      for (let i = 0; i < 2000; i++) {
        const xi = [];
        let atk = 0;
        let def = 0;
        for (let j = 0; j < 11; j++) {
          const d = Math.random() < 0.15 ? null : allDuties[Math.floor(Math.random() * allDuties.length)];
          xi.push({ p: null, slot: null, duty: d });
          if (d) { atk += DUTY_EFFECT[d].atk; def += DUTY_EFFECT[d].def; }
        }
        const got = dutyBoost(xi);
        const want = { atk: Math.max(-0.12, Math.min(0.12, atk)), def: Math.max(-0.12, Math.min(0.12, def)) };
        checks += 1;
        if (Math.abs(atk) > 0.12 || Math.abs(def) > 0.12) clamped += 1;
        maxAbs = Math.max(maxAbs, Math.abs(got.atk), Math.abs(got.def));
        if (Math.abs(got.atk - want.atk) > 1e-9 || Math.abs(got.def - want.def) > 1e-9) fail(`dutyBoost over ${J(xi.map(x => x.duty))} is ${J(got)}, expected ${J(want)}`);
      }
    });
    if (DUTY_BOOST_CAP !== 0.12) fail(`DUTY_BOOST_CAP is ${DUTY_BOOST_CAP}, the design says 0.12`);
    if (!(maxAbs <= 0.12 + 1e-12)) fail(`dutyBoost reached ${maxAbs}, past 0.12`);
    if (!clamped) fail('no random assignment exceeded the cap, so the clamp was never exercised');
    const mentBlock = engineSource.match(/const MENT_MOD: Record<Mentality, \{ atk: number; def: number \}> = \{([\s\S]*?)\};/);
    steps = mentBlock ? [...mentBlock[1].matchAll(/-?\d+\.\d+/g)].map(x => Math.abs(Number(x[0]))).filter(v => v > 0) : [];
    if (!steps.length) fail('MENT_MOD could not be read off the engine source');
    else if (!(DUTY_BOOST_CAP < Math.min(...steps))) fail(`the duty cap ${DUTY_BOOST_CAP} is not under the smallest mentality step ${Math.min(...steps)}`);
    console.log(`   ${slots} slots offer exactly their line's duties (${new Set(allDuties).size} duties), refusals hold, a duty the slot's line does not offer is dropped; dutyBoost equals the summed effects clamped on ${checks} random elevens (${clamped} past the cap, largest ${maxAbs.toFixed(3)}, cap ${DUTY_BOOST_CAP} under the smallest mentality step ${steps.length ? Math.min(...steps) : 'n/a'})`);
  }
  /* 4c: the outcome on common random numbers. */
  const SEEDS_PER_CLUB = 500;
  let seeds = 0;
  let h1Wrong = 0;
  let h1Greater = 0;
  const forA = []; const forB = []; const agA = []; const agB = [];
  let stA = 0; let stB = 0;
  let goalsA = 0; let goalsB = 0;
  let armsUsed = 0;
  for (const m of material) {
    if (armsUsed >= 4) break;
    const base = { ...m.pre, formationIndex: 0, xiIds: autoPickXI(m.pre.squad, CM_FORMATIONS[0]) };
    if (!xiFitReport(base).grades.every(g => g === 'natural')) continue;
    let A = base;
    let B = base;
    for (const [i, d] of [[1, 'attackingFullBack'], [4, 'attackingFullBack'], [9, 'poacher']]) A = A && setDuty(A, i, d);
    for (const [i, d] of [[1, 'holdingFullBack'], [4, 'holdingFullBack'], [9, 'targetMan']]) B = B && setDuty(B, i, d);
    if (!A || !B) { fail(`${m.club}: the duties could not be set`); continue; }
    const stMan = effectiveXIWithSlots(A)[9]?.p;
    if (!stMan || effectiveXIWithSlots(B)[9]?.p.id !== stMan.id) { fail(`${m.club}: the striker slot is not the same man in both arms`); continue; }
    armsUsed += 1;
    for (let k = 0; k < SEEDS_PER_CLUB; k++) {
      const seed = 700000 + seeds * 11;
      seeds += 1;
      const rA = quick(A, seed);
      const rB = quick(B, seed);
      if (rA.kind !== 'match' || rB.kind !== 'match') { fail(`${m.club} seed ${seed}: an arm came back ${rA.kind}/${rB.kind}`); continue; }
      const hA = h1Goals(rA); const hB = h1Goals(rB);
      if (hA < hB) { h1Wrong += 1; fail(`${m.club} seed ${seed}: the attacking duties scored ${hA} in the first half, the holding ones ${hB}, on one stream`); }
      if (hA > hB) h1Greater += 1;
      forA.push(rA.report.myScorers.length); forB.push(rB.report.myScorers.length);
      agA.push(rA.report.oppScorers.length); agB.push(rB.report.oppScorers.length);
      goalsA += rA.report.myScorers.length; goalsB += rB.report.myScorers.length;
      stA += rA.report.myScorers.filter(s => s.name === stMan.name).length;
      stB += rB.report.myScorers.filter(s => s.name === stMan.name).length;
    }
  }
  const dFor = forA.map((g, i) => g - forB[i]);
  const dAg = agA.map((g, i) => g - agB[i]);
  const tFor = mean(dFor) / seOf(dFor);
  const tAg = mean(dAg) / seOf(dAg);
  const shareA = goalsA ? stA / goalsA : 0;
  const shareB = goalsB ? stB / goalsB : 0;
  const seShare = Math.sqrt((shareA * (1 - shareA)) / Math.max(1, goalsA) + (shareB * (1 - shareB)) / Math.max(1, goalsB));
  const tShare = (shareA - shareB) / seShare;
  const H1_SHARE_FLOOR = 0.03;
  if (seeds < 400) fail(`only ${seeds} seeds compared`);
  if (!(tFor > 3)) fail(`attacking full backs and a poacher scored ${mean(forA).toFixed(3)} a match against ${mean(forB).toFixed(3)} holding with a target man: gap ${mean(dFor).toFixed(3)} is ${tFor.toFixed(1)} standard errors, needs 3`);
  if (!(tAg > 3)) fail(`attacking full backs and a poacher conceded ${mean(agA).toFixed(3)} a match against ${mean(agB).toFixed(3)}: gap ${mean(dAg).toFixed(3)} is ${tAg.toFixed(1)} standard errors, needs 3`);
  if (!(h1Greater / seeds >= H1_SHARE_FLOOR)) fail(`the attacking duties out scored the holding ones in the first half on ${pct(h1Greater, seeds)} percent of seeds, floor ${Math.round(H1_SHARE_FLOOR * 100)}`);
  if (!(tShare > 3)) fail(`the poacher took ${pct(stA, goalsA)} percent of the goals, the target man ${pct(stB, goalsB)}: ${tShare.toFixed(1)} standard errors apart, needs 3`);
  if (!(DUTY_SCORING.poacher > 1 && DUTY_SCORING.targetMan < 1)) fail(`DUTY_SCORING reads poacher ${DUTY_SCORING.poacher}, target man ${DUTY_SCORING.targetMan}`);
  console.log(`   ${seeds} seeds over ${armsUsed} clubs, common random numbers: goals for ${mean(forA).toFixed(3)} against ${mean(forB).toFixed(3)} (paired gap ${mean(dFor).toFixed(3)}, ${tFor.toFixed(1)} se, needs 3), goals against ${mean(agA).toFixed(3)} against ${mean(agB).toFixed(3)} (gap ${mean(dAg).toFixed(3)}, ${tAg.toFixed(1)} se, needs 3), first half never fewer (${h1Wrong} seeds), more on ${pct(h1Greater, seeds)} percent (floor ${Math.round(H1_SHARE_FLOOR * 100)}); the striker slot took ${pct(stA, goalsA)} percent of ${goalsA} goals as a poacher and ${pct(stB, goalsB)} of ${goalsB} as a target man (${tShare.toFixed(1)} se apart, needs 3)`);
}

/* ---------- 5. the bench ---------- */
begin(5, 'The bench is ordered for the slot being filled');
{
  /** The order this file expects: available first, then the tier for the slot, then fitness, then rating. */
  const keyOf = (p, slot) => [isAvailable(p) ? 0 : 1, slot ? TIER[expectedGrade(p, slot)] : 0, -p.fitness, -p.rating];
  const before = (a, b) => { for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) return a[i] < b[i]; } return true; };
  let lists = 0;
  let tiersSeen = 0;
  for (const m of material) {
    CM_FORMATIONS.forEach((f, fi) => {
      const s = { ...m.pre, formationIndex: fi, xiIds: autoPickXI(m.pre.squad, f) };
      const xiSet = new Set(s.xiIds.filter(Boolean));
      f.slots.forEach((slot, i) => {
        const outId = s.xiIds[i];
        if (!outId) return;
        const bench = benchFor(s, outId);
        const bySlot = benchFor(s, undefined, i);
        lists += 1;
        const ctx = `${m.club} ${f.name} ${slot.label}`;
        if (J(bench.map(p => p.id)) !== J(bySlot.map(p => p.id))) fail(`${ctx}: benchFor by outId and by slotIdx disagree`);
        const expectedIds = new Set(s.squad.filter(p => !xiSet.has(p.id)).map(p => p.id));
        if (bench.length !== expectedIds.size || bench.some(p => !expectedIds.has(p.id))) fail(`${ctx}: the bench lists ${bench.length} men, the squad minus the eleven is ${expectedIds.size}`);
        if (new Set(bench.map(p => p.id)).size !== bench.length) fail(`${ctx}: the bench repeats a man`);
        const tiers = new Set(bench.map(p => TIER[expectedGrade(p, slot)]));
        if (tiers.size > 1) tiersSeen += 1;
        for (let j = 1; j < bench.length; j++) {
          const a = keyOf(bench[j - 1], slot);
          const b = keyOf(bench[j], slot);
          if (!before(a, b)) fail(`${ctx}: ${bench[j - 1].name} (${bench[j - 1].position}, ${expectedGrade(bench[j - 1], slot)}, fit ${bench[j - 1].fitness}, ${bench[j - 1].rating}) is listed before ${bench[j].name} (${bench[j].position}, ${expectedGrade(bench[j], slot)}, fit ${bench[j].fitness}, ${bench[j].rating})`);
        }
      });
    });
  }
  if (tiersSeen < lists / 2) fail(`only ${tiersSeen} of ${lists} benches spanned more than one tier, the ordering was barely exercised`);
  /* During a live match. */
  let liveLists = 0;
  for (const m of material) {
    const ht = clone(m.ht);
    const live = ht.live;
    const f = FORMATIONS[live.formationIndex ?? ht.formationIndex];
    const pool = benchFor(ht);
    const outId = live.onPitch.find(id => !liveGoneIds(live, 90).has(id) && byId(ht, id)?.position !== 'GK');
    if (!pool.length || !outId) { fail(`${m.club}: nobody to bring on or nobody to take off`); continue; }
    const subbed = withSeed(800000 + liveLists, () => makeHalftimeSub(ht, outId, pool[0].id));
    if (!subbed) { fail(`${m.club}: the interval sub was refused`); continue; }
    const s = clone(subbed);
    const hurt = s.squad.find(p => !s.live.onPitch.includes(p.id) && p.id !== outId && isAvailable(p));
    if (hurt) byId(s, hurt.id).injuryWeeks = 3;
    const gone = liveGoneIds(s.live, 90);
    if (!gone.has(outId)) fail(`${m.club}: the man taken off at the interval is not in liveGoneIds`);
    const target = s.live.onPitch[1];
    const bench = benchFor(s, target);
    liveLists += 1;
    const ctx = `${m.club} live`;
    for (const p of bench) {
      if (s.live.onPitch.includes(p.id)) fail(`${ctx}: ${p.name} is on the pitch and on the bench`);
      if (gone.has(p.id)) fail(`${ctx}: ${p.name} has gone from the match and is on the bench`);
      if (!isAvailable(p)) fail(`${ctx}: ${p.name} is unfit and on the bench`);
    }
    if (hurt && bench.some(p => p.id === hurt.id)) fail(`${ctx}: the man hurt on the bench is still listed`);
    if (bench.some(p => p.id === outId)) fail(`${ctx}: the man taken off is listed to come back on`);
    const expected = s.squad.filter(p => !s.live.onPitch.includes(p.id) && !gone.has(p.id) && isAvailable(p)).map(p => p.id).sort();
    if (J(bench.map(p => p.id).sort()) !== J(expected)) fail(`${ctx}: the live bench is not exactly the squad minus the pitch, the gone and the unfit`);
    const slot = f.slots[1];
    for (let j = 1; j < bench.length; j++) if (!before(keyOf(bench[j - 1], slot), keyOf(bench[j], slot))) fail(`${ctx}: ${bench[j - 1].name} before ${bench[j].name} for the ${slot.label} slot`);
  }
  console.log(`   ${lists} benches over ${CM_FORMATIONS.length} shapes and ${material.length} squads: every man outside the eleven listed once, the available first, natural before family before the rest, fitness then rating inside a tier (${tiersSeen} spanned more than one tier), the slotIdx form identical; ${liveLists} live benches drop the pitch, the men gone and the unfit and keep the order`);
}

/* ---------- 6. formations ---------- */
begin(6, 'Club Manager has seventeen shapes, the shared nine first and unchanged');
{
  if (CM_FORMATIONS.length !== 17) fail(`CM_FORMATIONS has ${CM_FORMATIONS.length} entries, expected 17`);
  if (FORMATIONS !== CM_FORMATIONS) fail('the engine FORMATIONS export is not CM_FORMATIONS');
  if (SHARED.length !== 9) fail(`squadDeal ships ${SHARED.length} shapes, expected 9`);
  for (let i = 0; i < Math.min(9, CM_FORMATIONS.length); i++) {
    if (J(CM_FORMATIONS[i]) !== J(SHARED[i])) fail(`index ${i} (${CM_FORMATIONS[i].name}) differs from squadDeal's ${SHARED[i].name}`);
  }
  const names = new Set();
  let slots = 0;
  let bandsChecked = 0;
  for (const f of CM_FORMATIONS) {
    if (names.has(f.name)) fail(`two shapes are named ${f.name}`);
    names.add(f.name);
    if (f.slots.length !== 11) fail(`${f.name} has ${f.slots.length} slots`);
    const gks = f.slots.filter(s => s.allowed.includes('GK'));
    if (gks.length !== 1 || gks[0].label !== 'GK' || gks[0].x !== 50 || gks[0].y !== 90 || gks[0].allowed.length !== 1) fail(`${f.name}: the keeper slot reads ${J(gks)}`);
    const points = new Set();
    for (const s of f.slots) {
      slots += 1;
      const pt = `${s.x},${s.y}`;
      if (points.has(pt)) fail(`${f.name}: two slots at (${pt})`);
      points.add(pt);
      if (!(s.x >= 0 && s.x <= 100 && s.y >= 0 && s.y <= 100)) fail(`${f.name} ${s.label} at (${s.x}, ${s.y}) is off the grass`);
      if (!s.allowed.length || s.allowed.some(pos => !ALL_POSITIONS.includes(pos))) fail(`${f.name} ${s.label} allows ${J(s.allowed)}`);
      if (!LABEL_BANDS[s.label]) { fail(`${f.name}: a label this file does not know, ${s.label}`); continue; }
      const band = pitchLineOf(s);
      bandsChecked += 1;
      if (band !== bandOfY(s.y)) fail(`${f.name} ${s.label} at y ${s.y}: pitchLineOf says ${band}, the thresholds say ${bandOfY(s.y)}`);
      if (!LABEL_BANDS[s.label].includes(band)) fail(`${f.name} ${s.label} at y ${s.y} stands in the ${band} band`);
      if (s.label !== 'GK' && s.allowed.includes('GK')) fail(`${f.name} ${s.label} allows a keeper`);
    }
    /* The name against the bands: its first number is the defence band
       (a wing back stood at y 42 to 50 is one of the 3-5-2's five, not its
       three), its numbers sum to ten, and the attack band holds at least
       the last number and at most everything after the first (a 4-3-3's
       wingers are in its three, a 4-2-3-1's are in the three behind its one). */
    const shape = f.name.split(' ')[0].split('-').map(Number);
    const inBand = b => f.slots.filter(s => bandOfY(s.y) === b).length;
    const rest = shape.slice(1).reduce((a, b) => a + b, 0);
    if (shape[0] !== inBand('defence')) fail(`${f.name} names ${shape[0]} at the back and stands ${inBand('defence')} in the defence band`);
    if (shape.reduce((a, b) => a + b, 0) !== 10) fail(`${f.name} does not add up to ten outfielders`);
    if (!(inBand('attack') >= shape.at(-1) && inBand('attack') <= rest)) fail(`${f.name} stands ${inBand('attack')} in the attack band for a name whose last number is ${shape.at(-1)} of ${rest} after the back line`);
  }
  console.log(`   ${CM_FORMATIONS.length} shapes, indexes 0 to 8 byte identical to squadDeal's nine, ${slots} slots each shape eleven with one GK at (50, 90), no two slots at one point, ${bandsChecked} bands read off pitchLineOf and the thresholds agree and match their labels, every name's back line is its defence band and its numbers add to ten`);
}

/* ---------- 7. one match, two ways ---------- */
begin(7, 'Round 504 still holds: the same seeded fixture live and quick gives the same report');
{
  const sameKeys = r => J({
    home: r.home, away: r.away, hg: r.homeGoals, ag: r.awayGoals, decidedBy: r.decidedBy,
    mine: r.myScorers.map(s => `${s.name} ${s.minute} ${s.assist ?? ''} ${s.penalty ? 'pen' : ''} ${s.freeKick ? 'fk' : ''}`),
    theirs: r.oppScorers.map(s => `${s.name} ${s.minute} ${s.penalty ? 'pen' : ''} ${s.freeKick ? 'fk' : ''}`),
    poss: r.detail?.stats.possession, xg: r.detail?.stats.xg, oppXg: r.detail?.stats.oppXg,
    shots: r.detail?.stats.shots, oppShots: r.detail?.stats.oppShots,
    corners: r.detail?.stats.corners, oppCorners: r.detail?.stats.oppCorners,
    fouls: r.detail?.stats.fouls, oppFouls: r.detail?.stats.oppFouls,
    oppSubs: r.detail?.oppSubs, oppCards: r.detail?.oppCards,
    momentum: r.detail?.momentum, added: r.detail?.added,
    play: r.detail?.play,
  });
  let pairs = 0;
  const scorelines = new Set();
  for (const m of material) {
    /* With duties and a hand picked set piece block on, so the new fields ride the same draw both ways. */
    let pre = { ...m.pre };
    pre = setDuty(pre, 1, dutyOptions(CM_FORMATIONS[pre.formationIndex].slots[1])[0]) ?? pre;
    pre = setDuty(pre, 9, dutyOptions(CM_FORMATIONS[pre.formationIndex].slots[9])[0]) ?? pre;
    for (let k = 0; k < 6; k++) {
      const seed = m.seed + 900 + k * 3;
      const liveRun = withSeed(seed, () => {
        const stop = playNextEntry(pre);
        if (stop.kind !== 'halftime') return stop;
        const s2 = startSecondHalf(stop.state);
        if (!s2) return { kind: 'null' };
        return resumeMatch(s2);
      });
      const quickRun = withSeed(seed, () => playNextEntry(pre, { skipHalftime: true }));
      if (liveRun.kind !== 'match' || quickRun.kind !== 'match') { fail(`${m.club} seed ${seed}: live gave "${liveRun.kind}", quick gave "${quickRun.kind}"`); continue; }
      const a = sameKeys(liveRun.report);
      const b = sameKeys(quickRun.report);
      if (a !== b) fail(`${m.club} seed ${seed}: the two ways played different matches\n        live : ${a.slice(0, 180)}\n        quick: ${b.slice(0, 180)}`);
      if (liveRun.state.week !== quickRun.state.week) fail(`${m.club} seed ${seed}: live left the calendar on ${liveRun.state.week}, quick on ${quickRun.state.week}`);
      if (liveRun.state.live || quickRun.state.live) fail(`${m.club} seed ${seed}: a finished match left a live match on the save`);
      if (J(liveRun.state.setPieces) !== J(quickRun.state.setPieces)) fail(`${m.club} seed ${seed}: the set piece block differs between the two ways`);
      scorelines.add(`${liveRun.report.homeGoals}-${liveRun.report.awayGoals}`);
      pairs += 1;
    }
  }
  if (pairs < 20) fail(`only ${pairs} fixtures replayed both ways`);
  if (scorelines.size < 4) fail(`the ${pairs} pairs produced only ${scorelines.size} distinct scorelines`);
  console.log(`   ${pairs} fixtures replayed both ways with duties and takers on, ${scorelines.size} distinct scorelines, every pair identical down to the JSON of the play and the flags on the scorer lines`);
}

/* ---------- the verdict ---------- */
const red = [...failedIn.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const spec = CONTROLS[CONTROL];
  const missing = spec.must.filter(s => !failedIn.has(s));
  const unexpected = red.filter(s => !spec.must.includes(s) && !spec.also.includes(s));
  const tolerated = red.filter(s => spec.also.includes(s));
  console.log(`\nsimTacticsEngine control ${CONTROL}: sections red [${red.join(', ')}], required [${spec.must.join(', ')}]${tolerated.length ? `, tolerated [${tolerated.join(', ')}]` : ''}`);
  if (missing.length) console.error(`  the control did not fire: section(s) ${missing.join(', ')} stayed green`);
  if (unexpected.length) console.error(`  the control bled: section(s) ${unexpected.join(', ')} went red and were not expected to`);
  const ok = !missing.length && !unexpected.length;
  console.log(ok
    ? `simTacticsEngine control ${CONTROL}: PASS (the named section went red, the rest stayed green)`
    : `simTacticsEngine control ${CONTROL}: FAIL`);
  process.exit(ok ? 0 : 1);
}
console.log(failures === 0
  ? '\nsimTacticsEngine: PASS. A man is read in his slot, a second position is earned over counted weeks, the armband and the takers reach the stream, a duty moves the football a little, the bench is ordered for the slot, and the seventeen shapes stand where they say.'
  : `\nsimTacticsEngine: ${failures} FAILURES in section(s) ${red.join(', ')}`);
process.exit(failures === 0 ? 0 : 1);
