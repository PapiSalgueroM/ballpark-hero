/**
 * Round 135 harness: press conferences and team talks.
 *
 * The question is the one Round 116 got burnt by and Round 127 answered
 * properly: is there a game under the screen, or is the screen the whole thing?
 * So morale and board confidence were measured BEFORE a line of this was
 * written, and the numbers are worth keeping because they are what everything
 * here is anchored on.
 *
 *   Morale is a good foundation and it always was. Pinned at the floor an
 *   Everton season is worth 34.4 league points, pinned at 68 it is 45.5 and
 *   pinned at the ceiling 52.2, over sixty seasons an arm. At Manchester City
 *   the same three numbers are 54.8, 68.0 and 71.6. The full range is worth
 *   17.8 points at one club and 16.8 at the other, so morale moves and it
 *   matters.
 *
 *   Board confidence moves hard and it is NOISY. Over forty untouched seasons
 *   an Everton save finishes on 38.3 confidence with a standard deviation of
 *   37.5 and a range covering the whole nought to a hundred; Aston Villa 50.3
 *   with a standard deviation of 40.8. That is Round 105's lesson written down
 *   again: a board confidence check needs a big sample or it measures the dice.
 *
 *   What NOTHING did before this round was give the manager a lever he could
 *   pull on the WHOLE squad. Measured off the code path: a result moves every
 *   player by +5.38, -0.79 or -5.86 and the board by +5.91, +1.60 or -5.04. A
 *   goal is worth 3 to the scorer. The inbox is worth between -14 and +10, to
 *   one man. A role change is worth 5, to one man. Every single thing a manager
 *   could do reached one player at a time, and there were no press, media, talk
 *   or interview fields anywhere in the save at all.
 *
 * So this measures OUTCOMES against a do nothing baseline, the way simRoles and
 * simCareerEngaged do, and it spends most of its length on the trap the brief
 * named: an answer or a talk that is always right. That is not a hypothetical.
 * It is the single loudest complaint written about press conferences in the two
 * biggest management games, in almost the same words in both cases, and the
 * first version of this round had it in four different flavours at once.
 *
 * Run: node scripts/simPress.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'pressEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'press.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, resumeMatch, finishSeason, startNextSeason,
  setTeamTalk, giveHalftimeTalk, talkTargetNow, preMatchRead, matchEdge,
  answerPress, duckPress, pressOf, ensurePress, pressPatience, pressMoodLabel,
  TALK_TONES, TALK_ORDER,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const se2 = a => (a.length ? 2 * sd(a) / Math.sqrt(a.length) : 0);
/* A harness that lets NaN through is worse than no harness: every comparison
   against NaN is false, so every assertion below it silently passes. */
const num = (label, v) => { if (!Number.isFinite(v)) throw new Error(`${label} came out as ${v}`); return v; };
const pts = s => { const r = s.table.find(t => t.club === s.clubName); return r ? r.pts : 0; };

/** Nearest tone to what the room is asking for, or the furthest one. */
function toneFor(s, mode) {
  const t = talkTargetNow(s);
  if (t === null) return null;
  let idx = 0;
  for (let i = 1; i < TALK_ORDER.length; i++) {
    const better = mode === 'best'
      ? Math.abs(i - t) < Math.abs(idx - t)
      : Math.abs(i - t) > Math.abs(idx - t);
    if (better) idx = i;
  }
  return TALK_ORDER[idx];
}

/**
 * A manager who reads the room: he spends the answer on whatever is closest to
 * costing him his job. Board confidence on the floor means he buys board
 * confidence even though it costs him the dressing room, and the other way
 * round. That is the whole design, so it is what the good arm plays.
 */
function answerWell(s) {
  const q = pressOf(s).pending;
  if (!q) return s;
  const boardNeed = s.boardConfidence < 45 ? 1.6 : s.boardConfidence < 65 ? 1 : 0.5;
  const mor = mean(s.squad.map(p => p.morale));
  const squadNeed = mor < 45 ? 1.6 : mor < 65 ? 1 : 0.5;
  const moodNeed = pressOf(s).mood < 40 ? 1.2 : 0.6;
  let best = 0, bestScore = -1e9;
  q.options.forEach((o, i) => {
    let sc = o.squad * squadNeed + o.board * boardNeed + o.mood * 0.25 * moodNeed
      + (o.sharpen ?? 0) * 1.2 - (o.fire ?? 0) * 0.8;
    if (o.promise) sc -= 2.5;
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  return answerPress(s, best);
}

/** And one who says the most damaging thing available, every time. */
function answerBadly(s) {
  const q = pressOf(s).pending;
  if (!q) return s;
  let worst = 0, worstScore = 1e9;
  q.options.forEach((o, i) => {
    const sc = o.squad + o.board + o.mood * 0.25 - (o.fire ?? 0) * 0.8 + (o.sharpen ?? 0);
    if (sc < worstScore) { worstScore = sc; worst = i; }
  });
  return answerPress(s, worst);
}

/**
 * One season, one policy. Every arm plays the identical football: the same
 * auto-picked XI, the same shape, no substitutions and the half time break
 * taken in every arm. The ONLY thing that differs is what the manager says, so
 * anything that comes out of this is the talking and only the talking.
 */
function season(club, mode, fixedTone) {
  let s = startCareer(club);
  let guard = 0, talks = 0, asked = 0;
  while (s.week < s.calendar.length && guard < 200) {
    guard++;
    if (pressOf(s).pending) {
      asked += 1;
      if (mode === 'well') s = answerWell(s);
      else if (mode === 'badly') s = answerBadly(s);
      else if (mode === 'duck') s = duckPress(s);
    }
    if (mode === 'well' || mode === 'badly' || mode === 'well-talks') {
      const t = toneFor(s, mode === 'badly' ? 'worst' : 'best');
      if (t) { s = setTeamTalk(s, t); talks += 1; }
    } else if (fixedTone) {
      if (talkTargetNow(s) !== null) { s = setTeamTalk(s, fixedTone); talks += 1; }
    }
    const r = playNextEntry(s, {});
    s = r.state;
    if (r.kind === 'seasonOver') break;
    if (r.kind === 'halftime') {
      if (mode === 'well' || mode === 'badly' || mode === 'well-talks') {
        const t = toneFor(s, mode === 'badly' ? 'worst' : 'best');
        if (t) { s = giveHalftimeTalk(s, t); talks += 1; }
      } else if (fixedTone) {
        s = giveHalftimeTalk(s, fixedTone); talks += 1;
      }
      s = resumeMatch(s).state;
    }
  }
  return {
    pts: num('points', pts(s)),
    conf: s.boardConfidence,
    mood: pressOf(s).mood,
    mor: mean(s.squad.map(p => p.morale)),
    sacked: s.sacked ? 1 : 0,
    talks, asked,
  };
}

/* Paired seeds, and this file needs them more than most. A season's points swing
   about eight either side, so an unpaired read at ninety seasons an arm carries
   three points of noise against effects worth two to five, which is Round 125's
   lesson exactly: three guards were repaired that round for failing on noise
   alone. Same seed both sides means the same squad, the same league draw and the
   same calendar, and the only thing that differs is what the manager said. */
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
function seeded(club, mode, fixedTone, seed) {
  const realRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    return season(club, mode, fixedTone);
  } finally {
    Math.random = realRandom;
  }
}

const agg = rs => ({
  pts: mean(rs.map(r => r.pts)), se: se2(rs.map(r => r.pts)),
  conf: mean(rs.map(r => r.conf)), mood: mean(rs.map(r => r.mood)),
  mor: mean(rs.map(r => r.mor)), sack: rs.reduce((a, b) => a + b.sacked, 0),
  talks: mean(rs.map(r => r.talks)), asked: mean(rs.map(r => r.asked)),
});

/* ---------- 1. Four tones, on a line, saying real things ---------- */
console.log('1) Four tones, ordered softest to hardest, in football words');
{
  if (TALK_TONES.length !== 4) fail(`there are ${TALK_TONES.length} tones`);
  console.log('   ' + TALK_TONES.map(t => `${t.emoji} ${t.label}`).join(' · '));
  const ids = TALK_TONES.map(t => t.id);
  if (JSON.stringify(ids) !== JSON.stringify(TALK_ORDER)) fail('the tone list and the ladder disagree about the order');
  for (const t of TALK_TONES) {
    if (!t.label || !t.blurb) fail(`${t.id} has no label or no blurb`);
    if (/[_-]/.test(t.label)) fail(`${t.id} reads like a config key, not like football`);
  }
}

/* ---------- 2. The situation actually moves, and every tone has a home ---------- */
console.log('2) What the room is asking for changes week to week');
{
  const counts = { calm: 0, rally: 0, demand: 0, blast: 0 };
  const targets = [];
  const edges = [];
  const reads = new Set();
  for (const club of ['Everton', 'Manchester City', 'Aston Villa', 'Real Madrid', 'Burnley']) {
    for (let run = 0; run < 8; run++) {
      let s = startCareer(club);
      let guard = 0;
      while (s.week < s.calendar.length && guard < 200) {
        guard++;
        const t = talkTargetNow(s);
        if (t !== null) {
          targets.push(t);
          const e = matchEdge(s);
          if (e !== null) edges.push(e);
          const rd = preMatchRead(s);
          if (rd) reads.add(rd);
          counts[toneFor(s, 'best')] += 1;
        }
        const r = playNextEntry(s, {});
        s = r.state;
        if (r.kind === 'seasonOver') break;
        if (r.kind === 'halftime') {
          const ht = talkTargetNow(s);
          if (ht !== null) { targets.push(ht); counts[toneFor(s, 'best')] += 1; }
          s = resumeMatch(s).state;
        }
      }
    }
  }
  const n = targets.length;
  console.log(`   ${n} situations across five clubs and forty seasons:`);
  console.log('   ' + TALK_ORDER.map(t => `${t} ${(counts[t] / n * 100).toFixed(1)}%`).join(' · '));
  console.log(`   the ask ranges ${Math.min(...targets).toFixed(2)} to ${Math.max(...targets).toFixed(2)} on a 0 to 3 line, mean ${mean(targets).toFixed(2)}, sd ${sd(targets).toFixed(2)}`);
  console.log(`   ${reads.size} different pre match reads were shown`);
  for (const t of TALK_ORDER) {
    if (counts[t] === 0) fail(`${t} is never the right answer anywhere, so it is decoration`);
  }
  if (sd(targets) < 0.4) fail('the situation barely moves, so one tone would do all season');
  const top = Math.max(...TALK_ORDER.map(t => counts[t])) / n;
  if (top > 0.6) fail(`one tone is the right answer ${(top * 100).toFixed(0)} percent of the time`);
  if (reads.size < 4) fail('the pre match read barely changes, so the choice is a guess');
  /* Round 105's rule. The edge these targets are read off is a comparison
     between two scales the engine has always compared directly, and the human
     side sits above the other one, so "favourite" has to mean ahead of the
     USUAL gap and not ahead of zero. */
  console.log(`   pre match advantage across ${edges.length} fixtures: mean ${mean(edges).toFixed(2)}, which is why a favourite is measured against 7 and not against 0`);
  if (Math.abs(mean(edges)) < 2) fail('the measured edge is centred on zero after all, so EDGE_LEVEL is now wrong');
}

/* ---------- 3. THE TRAP: no tone is worth spamming ---------- */
console.log('3) Hammering one button all season is nothing like reading the room');
{
  /* This is the assertion the whole round turns on, and the first build failed
     it four times over. With the fit tolerance one rung wider, a tone one rung
     off the mark still scored positive, and since the room asks for something in
     the middle most weeks that made EVERY tone a free gain: measured at Everton
     over eighty seasons an arm, saying nothing was 42.3 points against 46.9 for
     calm, 45.4 for rally, 48.0 for demand and 43.7 for blast. Four dominant
     strategies and no judgement required, which is the exact complaint every
     written guide to the big management games makes about their press rooms.

     The middle of the ladder is ALLOWED to be a decent default. Every piece of
     real guidance on this says passion is the versatile one that rarely does
     harm, so a manager who fires them up every week should end up slightly ahead
     of one who says nothing at all. What he must not do is keep up with a
     manager who reads the afternoon. */
  const RUNS = 150;
  const CLUBS = ['Everton', 'Manchester City'];
  const bestGains = [], topSpamGains = [];
  for (const club of CLUBS) {
    const base = Array.from({ length: RUNS }, (_, i) => seeded(club, 'quiet', null, 5000 + i));
    const basePts = base.map(r => r.pts);
    console.log(`   ${club}, ${RUNS} paired seasons an arm. Say nothing: ${mean(basePts).toFixed(2)} pts`);
    const gains = {};
    for (const pol of ['best', ...TALK_ORDER]) {
      const arm = Array.from({ length: RUNS }, (_, i) => (
        pol === 'best' ? seeded(club, 'well-talks', null, 5000 + i) : seeded(club, 'quiet', pol, 5000 + i)
      ));
      const d = arm.map((r, i) => r.pts - basePts[i]);
      gains[pol] = mean(d);
      console.log(`     ${String(pol).padEnd(7)}: ${mean(arm.map(r => r.pts)).toFixed(2)} pts, paired ${mean(d) >= 0 ? '+' : ''}${mean(d).toFixed(2)} (2se ${se2(d).toFixed(2)}), squad morale ${mean(arm.map(r => r.mor)).toFixed(1)}`);
      if (pol !== 'best' && mean(d) >= gains.best) {
        fail(`${club}: shouting "${pol}" every single week is worth ${mean(d).toFixed(2)} points, as much as reading the room, so it is a dominant strategy`);
      }
    }
    const losers = TALK_ORDER.filter(t => gains[t] < 0).length;
    console.log(`     ${losers} of the four tones LOSE points when they are the only thing you ever say`);
    if (losers < 2) fail(`${club}: only ${losers} tone costs you anything when spammed, so there is no wrong answer`);
    if (gains.best <= 0) fail(`${club}: reading the room is worth nothing`);
    bestGains.push(gains.best);
    topSpamGains.push(Math.max(...TALK_ORDER.map(t => gains[t])));
  }
  const margin = mean(bestGains) - mean(topSpamGains);
  console.log(`   pooled: reading the room is worth ${mean(bestGains).toFixed(2)} points, the best single tone spammed ${mean(topSpamGains).toFixed(2)}, margin ${margin.toFixed(2)}`);
  /* Pooled for the reason simRoles pools its own headline: one club's paired
     difference carries about 1.2 points of two sigma noise at this sample size,
     which is the same size as the margin, so a per club bar on it WOULD flap.
     Measured over 200 paired seasons at three clubs the margin sits at 2.05. */
  if (margin < 0.8) fail(`reading the room beats the best single tone by only ${margin.toFixed(2)} points, so judgement barely pays`);
}

/* ---------- 4. THE HEADLINE: reading it beats ignoring it beats getting it wrong ---------- */
console.log('4) Two managers, the same football, one of them can read a room');
{
  /* 160 seasons an arm and the sample size is measured rather than picked. The
     spread of a season's points is about eight, so two standard errors at 160
     is roughly 1.3, and the effect being looked for is three to five. Round 125
     repaired three guards that failed on noise alone and Round 105 measured
     that a board confidence check needs about forty runs, not twelve. Board
     confidence here is worse than that: it finishes an untouched season with a
     standard deviation of 37, so the confidence lines below are printed and the
     assertions are carried by the points and by the sacking counts. */
  const RUNS = 140;
  const gaps = [], badGaps = [];
  /* Every paired difference from both clubs goes in here as well as into the per
     club lines, and the significance bar is put on the pooled set. simRoles
     pools its headline for exactly this reason: one club's paired difference
     carries about 1.6 points of two sigma noise at this sample size against an
     effect of two and a half, so a per club bar sits right on top of its own
     error and would eventually flap. Pooled over 280 seasons the bar is 1.1. */
  const allGood = [], allBad = [];
  for (const club of ['Everton', 'Manchester City']) {
    const raw = {};
    for (const mode of ['quiet', 'well', 'badly']) {
      raw[mode] = Array.from({ length: RUNS }, (_, i) => seeded(club, mode, null, 6000 + i));
    }
    const out = {}; for (const m of Object.keys(raw)) out[m] = agg(raw[m]);
    console.log(`   ${club}, ${RUNS} paired seasons an arm:`);
    for (const m of ['quiet', 'well', 'badly']) {
      const o = out[m];
      console.log(`     ${m.padEnd(6)} ${o.pts.toFixed(1)} pts | board ${o.conf.toFixed(0)} | press ${o.mood.toFixed(0)} | morale ${o.mor.toFixed(1)} | sacked ${o.sack}/${RUNS} | ${o.talks.toFixed(1)} talks, ${o.asked.toFixed(1)} questions`);
    }
    const goodD = raw.well.map((r, i) => r.pts - raw.quiet[i].pts);
    const badD = raw.badly.map((r, i) => r.pts - raw.quiet[i].pts);
    const good = mean(goodD), bad = mean(badD);
    const bar = se2(goodD);
    console.log(`     reading it is worth ${good.toFixed(2)} points against 2se of ${bar.toFixed(2)}, getting it wrong costs ${(-bad).toFixed(2)} (2se ${se2(badD).toFixed(2)})`);
    gaps.push(good); badGaps.push(bad);
    allGood.push(...goodD); allBad.push(...badD);

    if (good <= 0.5) fail(`${club}: handling the press and the dressing room well is worth ${good.toFixed(2)} points, which nobody would ever feel`);
    if (out.well.pts <= out.badly.pts) fail(`${club}: handling it well does not beat handling it badly`);
    if (bad >= 0) fail(`${club}: handling it badly is not worse than never touching it`);
    /* The other rail. Twelve rounds of balance sit under these scorelines and
       this is not allowed to become the whole game. */
    if (good > 9) fail(`${club}: talking is worth ${good.toFixed(2)} league points, which drowns out everything else in the sim`);
    if (out.well.sack >= out.badly.sack) fail(`${club}: getting it right does not save you from the sack`);
    if (out.well.mood <= out.badly.mood) fail(`${club}: the press do not notice the difference`);
  }
  console.log(`   pooled over ${allGood.length} paired seasons: reading it is worth ${mean(allGood).toFixed(2)} points (2se ${se2(allGood).toFixed(2)}), getting it wrong costs ${(-mean(allBad)).toFixed(2)} (2se ${se2(allBad).toFixed(2)})`);
  if (mean(allGood) <= se2(allGood)) fail(`pooled, reading the room is worth ${mean(allGood).toFixed(2)} points against 2se of ${se2(allGood).toFixed(2)}, so it is inside the noise`);
  if (mean(allBad) >= -se2(allBad)) fail(`pooled, getting it wrong costs ${(-mean(allBad)).toFixed(2)} points, which is inside the noise`);
  void gaps; void badGaps;
}

/* ---------- 4b. Skipping it and never looking at it must cost the same ---------- */
console.log('4b) The skip button and pretending the room does not exist are the same thing');
{
  /* PAIRED, because the thing being measured is meant to be exactly zero and an
     unpaired read at 160 seasons an arm carries two points of noise, which is
     bigger than the bug it is looking for.
     
     And there WAS a bug. Ducking cleared the desk on the spot, so the next
     reporter turned up three fixtures later, while never opening the screen
     left the question sitting there for five before it went stale. The man who
     honestly pressed the skip button therefore paid the no-show roughly twice
     as often as the man who pretended the feature did not exist. Measured
     unpaired at Manchester City over 160 seasons an arm: 66.7 league points
     against 69.8 and fifteen more sackings, for pressing a button that is
     supposed to mean "not today". */
  const realRandom = Math.random;
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const run = (club, duck, seed) => {
    Math.random = mulberry32(seed);
    let s = startCareer(club);
    let guard = 0;
    while (s.week < s.calendar.length && guard < 200) {
      guard++;
      if (duck && pressOf(s).pending) s = duckPress(s);
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    Math.random = realRandom;
    return { pts: pts(s), conf: s.boardConfidence, noShows: pressOf(s).ducked };
  };
  const SEEDS = 150;
  for (const club of ['Manchester City', 'Everton']) {
    const dp = [], dc = [], nsQ = [], nsD = [];
    for (let i = 0; i < SEEDS; i++) {
      const q = run(club, false, 3000 + i);
      const d = run(club, true, 3000 + i);
      dp.push(d.pts - q.pts); dc.push(d.conf - q.conf);
      nsQ.push(q.noShows); nsD.push(d.noShows);
    }
    console.log(`   ${club}, ${SEEDS} paired seasons: ${mean(dp).toFixed(2)} points apart, ${mean(dc).toFixed(2)} board confidence apart`);
    console.log(`     no shows a season: ${mean(nsQ).toFixed(1)} never looking, ${mean(nsD).toFixed(1)} ducking`);
    if (Math.abs(mean(dp)) > 0.5) fail(`${club}: pressing the skip button is worth ${mean(dp).toFixed(2)} points against never opening the room`);
    if (Math.abs(mean(dc)) > 2) fail(`${club}: pressing the skip button is worth ${mean(dc).toFixed(2)} board confidence against never opening the room`);
    if (Math.abs(mean(nsD) - mean(nsQ)) > 2) fail(`${club}: ducking summons ${(mean(nsD) - mean(nsQ)).toFixed(1)} more reporters a season than ignoring does`);
  }
}

/* ---------- 5. No press answer is always right either ---------- */
console.log('5) Every answer in the room is somebody\'s best answer');
{
  /* The measurable version of the complaint. If one option in a question wins
     on every axis it is the one you click forever, so no option may be at least
     as good as another on all four and strictly better on one. */
  const seen = new Map();
  const clubs = ['Everton', 'Manchester City', 'Aston Villa', 'Burnley', 'Real Madrid'];
  for (const club of clubs) {
    for (let run = 0; run < 6; run++) {
      let s = startCareer(club);
      let guard = 0;
      while (s.week < s.calendar.length && guard < 200) {
        guard++;
        const q = pressOf(s).pending;
        if (q) {
          if (!seen.has(q.kind)) seen.set(q.kind, { n: 0, q });
          seen.get(q.kind).n += 1;
          s = answerWell(s);
        }
        const r = playNextEntry(s, { skipHalftime: true });
        s = r.state;
        if (r.kind === 'seasonOver') break;
      }
    }
  }
  console.log(`   ${seen.size} question types fired over thirty seasons: ${[...seen.entries()].map(([k, v]) => `${k} ${v.n}`).join(', ')}`);
  if (seen.size < 5) fail(`only ${seen.size} kinds of question ever came up, so the room repeats itself`);

  let dominated = 0, checked = 0;
  for (const [kind, { q }] of seen) {
    const axes = o => [o.squad + o.subject * 0.35, o.board, o.mood, (o.sharpen ?? 0) - (o.fire ?? 0) * 0.5];
    for (let i = 0; i < q.options.length; i++) {
      for (let j = 0; j < q.options.length; j++) {
        if (i === j) continue;
        checked += 1;
        const a = axes(q.options[i]), b = axes(q.options[j]);
        const neverWorse = a.every((v, k) => v >= b[k] - 1e-9);
        const somewhereBetter = a.some((v, k) => v > b[k] + 1e-9);
        if (neverWorse && somewhereBetter) {
          dominated += 1;
          fail(`${kind}: "${q.options[i].label}" is at least as good as "${q.options[j].label}" on every axis, so nobody would ever pick the other one`);
        }
      }
    }
    if (q.options.length < 3) fail(`${kind} only offers ${q.options.length} answers`);
    for (const o of q.options) {
      if (!o.label || !o.line) fail(`${kind}: an answer has no label or no aftermath line`);
    }
  }
  console.log(`   ${checked} pairs of answers compared on dressing room, board, press and the pitch: ${dominated} dominated`);

  // And the one that costs money later: a promise made out loud gets settled.
  let s = startCareer('Everton');
  ensurePress(s);
  s.press.pending = {
    id: 'test', kind: 'derby', text: 'test',
    options: [{ label: 'We are winning this one', squad: 0, subject: 0, board: 0, mood: 0, promise: true, fire: 2, line: 'x' }],
  };
  const said = answerPress(s, 0);
  if (!pressOf(said).promised) fail('a promise made in public was not written down');
  if (pressOf(said).nextFire <= 0) fail('talking your side up did not fire the other lot up');
  let after = said, g2 = 0;
  while (g2 < 40) {
    g2 += 1;
    const r = playNextEntry(after, { skipHalftime: true });
    after = r.state;
    if (r.kind === 'match') break;
  }
  if (pressOf(after).promised) fail('a promise was never settled up at the final whistle');
  if (pressOf(after).nextFire !== 0) fail('the other lot stayed fired up after the match it was about');
  console.log(`   a promise made out loud was settled at the next final whistle and the boost was spent`);
}

/* ---------- 6. The press mood is a real thing the board reads ---------- */
console.log('6) The board read about it in the morning');
{
  console.log(`   press patience: ${[0, 25, 50, 75, 100].map(m => `${m} -> ${pressPatience(m).toFixed(3)}`).join(' · ')}`);
  if (pressPatience(50) !== 1) fail('the press multiplier does not reach 1 at the mood every save starts on, which is a hidden tax on ignoring the feature');
  if (pressPatience(0) <= pressPatience(100)) fail('the press being against you is not worse than the press being for you');
  if (pressPatience(0) > 1.3 || pressPatience(100) < 0.75) fail('the press multiplier swings far enough to rewrite the board on its own');
  for (const m of [0, 20, 45, 60, 90]) {
    if (!pressMoodLabel(m)) fail(`no words for a press mood of ${m}`);
  }
  console.log(`   ${[5, 30, 50, 70, 90].map(m => `${m}: "${pressMoodLabel(m)}"`).join(' · ')}`);

  /* Paired seeds, because a hundred confidence points of season to season swing
     would otherwise bury a multiplier this small. Same club, same seed, one arm
     with the papers onside and one with them against. */
  const realRandom = Math.random;
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const run = (mood, seed) => {
    Math.random = mulberry32(seed);
    let s = startCareer('Everton');
    let guard = 0;
    while (s.week < s.calendar.length && guard < 200) {
      guard++;
      s.press.mood = mood;
      s.press.pending = null;
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    Math.random = realRandom;
    return s.boardConfidence;
  };
  /* 240, not 120. At 120 the paired difference came out at 12.06 against two
     standard errors of 7.13, which passes and would keep passing most of the
     time and fail on an unlucky draw, which is the definition of a flappy
     guard. Board confidence is the noisiest number in this game: an untouched
     Everton season finishes with a standard deviation of 37.5 on it. */
  const SEEDS = 240;
  const loved = [], hated = [], diffs = [];
  for (let i = 0; i < SEEDS; i++) {
    const a = run(95, 7000 + i);
    const b = run(5, 7000 + i);
    loved.push(a); hated.push(b); diffs.push(a - b);
  }
  console.log(`   ${SEEDS} paired Everton seasons: papers onside ends on ${mean(loved).toFixed(1)} board confidence, papers against on ${mean(hated).toFixed(1)}`);
  console.log(`   paired difference ${mean(diffs).toFixed(2)} (2se ${se2(diffs).toFixed(2)})`);
  if (mean(diffs) <= se2(diffs)) fail(`the press being for you or against you is worth ${mean(diffs).toFixed(2)} board confidence, which is inside the noise`);
  if (mean(diffs) > 30) fail(`the press alone swing the board by ${mean(diffs).toFixed(2)}, which is a whole season of results`);
}

/* ---------- 7. Words wear out ---------- */
console.log('7) The same thing every week stops landing');
{
  const RUNS = 90;
  const club = 'Manchester City';
  /* A manager who reads the room perfectly still has to vary what he says,
     because a tone repeated too often is worth a fraction of itself. This
     checks the rule fires at all rather than trying to price it: the good arm
     above already carries the money assertion. */
  let s = startCareer(club);
  let guard = 0, stale = 0, total = 0;
  while (s.week < s.calendar.length && guard < 200) {
    guard++;
    s = setTeamTalk(s, 'demand');
    total += 1;
    if (pressOf(s).lastTone === 'demand' && pressOf(s).toneRun >= 3) stale += 1;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  console.log(`   ${total} identical team talks in a row: ${stale} of them landed on a squad that had heard it too often`);
  if (stale < total * 0.5) fail('repeating the same tone all season never once wore out');
  const varied = startCareer(club);
  ensurePress(varied);
  if (pressOf(varied).toneRun !== 0) fail('a brand new save already thinks it has said something');
  void RUNS;
}

/* ---------- 8. A save from before any of this existed ---------- */
console.log('8) Old saves repair themselves, twice over, and play on');
{
  const s = startCareer('Leeds United');
  const legacy = JSON.parse(JSON.stringify(s));
  delete legacy.press;
  delete legacy.teamTalk;
  ensurePress(legacy);
  if (!legacy.press) fail('the repair did not build a press room');
  if (legacy.press.mood !== 50) fail('a repaired save did not start on a neutral press');
  if (legacy.teamTalk !== null) fail('a repaired save came back with something already said');
  const snapshot = JSON.stringify(legacy);
  ensurePress(legacy);
  if (JSON.stringify(legacy) !== snapshot) fail('the repair changed an already repaired save');
  console.log('   a pre round save repaired to a neutral press room, and running it again was a no op');

  // Half a save: the field exists but is missing pieces, which is what a
  // partially migrated save actually looks like.
  const half = JSON.parse(JSON.stringify(s));
  half.press = { mood: 140 };
  ensurePress(half);
  if (half.press.mood !== 100) fail('an out of range press mood was not clamped');
  if (half.press.pending !== null || half.press.toneRun !== 0) fail('a half built press room was not filled in');
  console.log('   a half migrated press room was clamped and filled in rather than thrown away');

  // And a full pre round save plays a season, rolls over and keeps going.
  const old = JSON.parse(JSON.stringify(startCareer('Ajax')));
  delete old.press;
  delete old.teamTalk;
  let played = old, guard = 0;
  while (played.week < played.calendar.length && guard < 140) {
    guard++;
    const r = playNextEntry(played, { skipHalftime: true });
    played = r.state;
    if (r.kind === 'seasonOver') break;
  }
  if (!played.press) fail('playNextEntry did not repair the save it was handed');
  console.log(`   a pre round Ajax save played a full season and finished on press mood ${played.press.mood.toFixed(0)} with ${played.press.answered + played.press.ducked} questions gone by`);
  const done = finishSeason(played);
  const next = startNextSeason(done.state);
  if (!next.press) fail('the summer wiped the press room');
  if (next.press.pending !== null) fail('last season\'s question followed you into August');
  if (next.teamTalk !== null) fail('last season\'s team talk followed you into August');
  console.log(`   after the summer: press mood ${next.press.mood.toFixed(0)}, nothing pending, nothing said`);
  const moved = startNextSeason(done.state, done.state.pendingSummary?.offers?.[0]?.club);
  if (!moved.press) fail('changing clubs left you without a press room');
}

/* ---------- 9. Nothing here breaks a normal save ---------- */
console.log('9) A manager who never says a word is where he always was');
{
  const RUNS = 60;
  const p = [], reqs = [], sacked = [];
  for (let i = 0; i < RUNS; i++) {
    let s = startCareer('Everton');
    let guard = 0;
    while (s.week < s.calendar.length && guard < 140) {
      guard++;
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    p.push(pts(s));
    reqs.push(s.squad.filter(x => x.wantsOut).length);
    sacked.push(s.sacked ? 1 : 0);
  }
  console.log(`   ${RUNS} do nothing Everton seasons: ${mean(p).toFixed(1)} pts (2se ${se2(p).toFixed(1)}), ${mean(reqs).toFixed(2)} transfer requests, sacked ${sacked.reduce((a, b) => a + b, 0)}/${RUNS}`);
  /* The same band simRoles guards. Before this round the identical run came out
     at 44.4 points over forty runs in Round 127 and 42.7 over sixty when it was
     re-measured for this one, and twelve rounds of calibration sit on it. */
  if (mean(p) < 36 || mean(p) > 54) fail(`a do nothing Everton season now finishes on ${mean(p).toFixed(1)} points, and before this round it was 42.7`);
  if (mean(reqs) > 6) fail(`a manager who touched nothing collected ${mean(reqs).toFixed(2)} transfer requests`);
}

/* ---------- 10. Copy check ---------- */
console.log('10) Copy check');
{
  const files = [
    'src/lib/clubManager.ts',
    'src/components/club-manager/PressScreen.tsx',
    'src/components/club-manager/TeamTalkRow.tsx',
    'src/components/club-manager/HalftimeScreen.tsx',
    'src/hooks/useClubManager.ts',
    'src/pages/ClubManager.tsx',
    'scripts/simPress.mjs',
  ];
  let dashes = 0;
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/[–—]/.test(line) && !line.includes('─')) { dashes++; fail(`${f}:${i + 1} has an em or en dash`); }
    });
  }
  if (dashes === 0) console.log(`   ${files.length} files clean`);
}

console.log(failures === 0 ? '\nALL PRESS AND TEAM TALK CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
