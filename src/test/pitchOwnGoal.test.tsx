/* Round 1216: an own goal is drawn as one by the shared pitch part.
 *
 * THE MATERIAL is a DENSE fleet: the five clubs and seeds of liveSimMotion.test.tsx, twenty matches each, 200
 * half feeds through the real engine and the viewer's own stagePitchInput, with one thing changed for this
 * file only: the tag roll of '@/lib/ownGoalRule' always says yes, so every eligible goal is an own goal with
 * the engine's OWN named man (the role roll is the real one). The tag is a keyed re-label and no draw, so no
 * result moves. Each own goal is read on the cast the VIEWER holds for it (the eleven at the floor of the
 * instant its action starts), never on the half's opening eleven: a substitute who came on at 60 and puts it
 * in at 75 is on the grass.
 *
 * EVERY RULE IS READ AGAINST A BASELINE ARM: the same line with `og` taken off, through the same function,
 * which is the picture before this round (a man of the side that got the goal shoots and celebrates). A rule
 * both arms pass proves nothing, so each prints both.
 *
 * scripts/simOwnGoalMotion.mjs runs this file and holds its negative controls. The helpers below (seeded,
 * mount, step, the walk) are small copies of the ones liveSimMotion.test.tsx keeps to itself. */
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, resumeMatch, startSecondHalf, liveFeed, changeLive } from '@/lib/clubManager';
import type { CareerState, LiveFeedEvent } from '@/lib/clubManager';
import { ACTION_SPAN, GOAL_MOUTH, NET_AT } from '@/components/pitch-motion/contract';
import type { PitchEvent, PitchInput } from '@/components/pitch-motion/contract';
import { actionFrame, LivePitchPlayer, ownGoalFigure, useLiveSimMotion } from '@/components/pitch-motion/motion';
import type { MotionEvent, MotionFrame, MotionPlayer, MotionScene } from '@/components/pitch-motion/motion';
import { pitchPlan, pitchScene } from '@/components/pitch-motion/scene';
import type { PitchPlaced } from '@/components/pitch-motion/scene';
import { LiveSimScreen, stagePitchInput, labelsShort } from '@/components/club-manager/LiveSimScreen';

vi.mock('@/lib/ownGoalRule', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/ownGoalRule')>()), ownGoalTagged: () => true }));

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
  vi.spyOn(Math, 'random').mockImplementation(seeded(1216));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

type Point = { x: number; y: number };
const FIVE_CLUBS = [
  { seed: 110101, club: 'Aston Villa' }, { seed: 110102, club: 'Real Madrid' }, { seed: 110103, club: 'Lyon' },
  { seed: 110104, club: 'Ajax' }, { seed: 110105, club: 'Celtic' },
] as const;
const MATCHES_EACH = 20;
const boardAt = (career: CareerState, cap: number) => (cap === 45 ? career.live!.added?.h1 : career.live!.added?.h2) ?? 0;
const clockPos = (e: { minute: number; plus?: number }) => e.minute + (e.plus ?? 0);
/** Twenty matches of one club through the engine's own calls, each half handed to `onHalf` as it stands. */
function walkClub(seed: number, club: string, onHalf: (career: CareerState, stage: 'first' | 'second') => void): number {
  vi.mocked(Math.random).mockImplementation(seeded(seed));
  let career = startCareer(club);
  /* As liveSimMotion.test.tsx: the generated fixture list, so the walk is twenty matches for every club. */
  delete career.realLeagueFixtures;
  let matches = 0;
  for (let guard = 0; guard < 400 && matches < MATCHES_EACH; guard++) {
    const next = playNextEntry(career);
    career = next.state;
    if (next.kind === 'seasonOver' || career.sacked) break;
    if (next.kind !== 'halftime' || !career.live) continue;
    onHalf(career, 'first');
    const second = startSecondHalf(career)!;
    onHalf(second, 'second');
    career = resumeMatch(second).state;
    matches++;
  }
  return matches;
}

/** One own goal of the fleet: the frame its action starts from, its line, and the same line with `og` off. */
interface Own {
  label: string; mine: boolean; scene: MotionScene<PitchPlaced>; own: MotionEvent; plain: MotionEvent;
  /** The named man among the side that conceded, on the viewer's cast (null: he is not on the grass). */
  man: PitchPlaced | null;
}
interface Fleet { owns: Own[]; matches: number; halves: number; plainGoals: number; offMinute: number; lastKick: number }
let fleet: Fleet | null = null;
function buildFleet(): Fleet {
  if (fleet) return fleet;
  const owns: Own[] = [];
  let matches = 0, halves = 0, plainGoals = 0, offMinute = 0, lastKick = 0;
  for (const { seed, club } of FIVE_CLUBS) {
    matches += walkClub(seed, club, (career, stage) => {
      halves++;
      const cap = stage === 'first' ? 45 : 90;
      const stop = cap + boardAt(career, cap);
      /* When an action starts depends on the feed alone, so the half's opening cast says when; the cast the
         viewer then holds for it is the one at the floor of that instant. */
      const opening = pitchPlan(stagePitchInput(career, career.live!, null, stage, stage === 'first' ? 0 : 46, 0, stop));
      for (const first of opening.actions) {
        const e = first.event as LiveFeedEvent;
        if (e.kind !== 'goal') continue;
        if (!e.og) { plainGoals++; continue; }
        const floor = Math.floor(first.at);
        if (floor !== Math.floor(clockPos(e))) offMinute++;
        if (first.at < clockPos(e) - 1e-9) lastKick++;
        const plan = pitchPlan(stagePitchInput(career, career.live!, null, stage, Math.min(cap, floor), Math.max(0, Math.min(stop, floor) - cap), stop));
        const staged = plan.actions.find(a => a.event.kind === 'goal' && a.event.side === e.side && a.event.minute === e.minute && (a.event.plus ?? 0) === (e.plus ?? 0))!;
        const scene = pitchScene(plan, staged.at - .05);
        const mine = e.side === 'me';
        const own: MotionEvent = { event: staged.event, key: `own${owns.length}`, at: staged.at };
        owns.push({
          label: `${club} ${e.minute}${e.plus ? `+${e.plus}` : ''}' ${e.side} ${e.text}`, mine, scene, own,
          plain: { ...own, event: { ...staged.event, og: false } },
          man: (mine ? scene.theirs : scene.mine).find(p => p.name === e.text) ?? null,
        });
      }
    });
  }
  fleet = { owns, matches, halves, plainGoals, offMinute, lastKick };
  return fleet;
}

/* ---- reading frames ---- */
type Frame = MotionFrame<PitchPlaced>;
/** Every .025 of the clock, from the instant the line fires to the end of the action. */
const TICKS = Array.from({ length: 43 }, (_unused, i) => i * .025);
const framesOf = (o: Own, arm: 'own' | 'plain', ticks: number[] = TICKS): Frame[] => ticks.map(t => actionFrame(o.scene, arm === 'own' ? o.own : o.plain, t));
const quantile = (values: number[], share: number) => { const s = [...values].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(share * s.length))] : NaN; };
const spreadOf = (values: number[]) => `least ${quantile(values, 0).toFixed(1)}, median ${quantile(values, .5).toFixed(1)}, 90th percentile ${quantile(values, .9).toFixed(1)}, most ${quantile(values, 1).toFixed(1)}`;
const inMouth = (ball: Point) => ball.x >= GOAL_MOUTH.x0 && ball.x <= GOAL_MOUTH.x1 && (ball.y < GOAL_MOUTH.depth || ball.y > 100 - GOAL_MOUTH.depth);
const everybody = (frame: Frame) => [...frame.mine, ...frame.theirs];
const gapTo = (p: Point, ball: Point) => Math.hypot(p.x - ball.x, p.y - ball.y);
const headingChange = (a: Point, b: Point, c: Point, d: Point) => {
  const turn = Math.abs(Math.atan2(b.y - a.y, b.x - a.x) - Math.atan2(d.y - c.y, d.x - c.x)) * 180 / Math.PI;
  return turn > 180 ? 360 - turn : turn;
};
/** The sharpest turn of the ball in flight, in degrees of pitch percent. It is read across one whole step (the
 *  step into sample `at` against the step out of sample `at + 1`), so a corner a sample cuts still counts in full. */
function sharpestTurn(frames: { phase: string; ball: Point }[]): { turn: number; at: number } {
  let best = { turn: 0, at: -1 };
  for (let i = 1; i + 2 < frames.length; i++) {
    if (![i - 1, i, i + 1, i + 2].every(k => frames[k].phase === 'flight')) continue;
    const turn = headingChange(frames[i - 1].ball, frames[i].ball, frames[i + 1].ball, frames[i + 2].ball);
    if (turn > best.turn) best = { turn, at: i };
  }
  return best;
}
/** The touch itself: the instant between sample `at` and the next at which the ball is nearest the man. */
function touchOf(o: Own, at: number): { t: number; frame: Frame; gap: number } {
  let best: { t: number; frame: Frame; gap: number } | null = null;
  for (let k = 0; k <= 10; k++) {
    const t = TICKS[at] + k * .0025;
    const frame = actionFrame(o.scene, o.own, t);
    const man = everybody(frame).find(p => p.key === o.man!.key)!;
    const gap = gapTo(man, frame.ball);
    if (!best || gap < best.gap) best = { t, frame, gap };
  }
  return best!;
}
/** Pairs of one side standing on each other (R2's box: closer than 2.5 both ways), as keys. */
function overlapping(frame: { mine: MotionPlayer[]; theirs: MotionPlayer[] }): string[] {
  const out: string[] = [];
  for (const list of [frame.mine, frame.theirs]) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    if (Math.abs(list[i].x - list[j].x) < 2.5 && Math.abs(list[i].y - list[j].y) < 2.5) out.push(`${list[i].key}:${list[j].key}`);
  }
  return out;
}
const runsOf = (samples: string[][]) => samples.reduce((count, now, i) => count + (i ? now.filter(pair => samples[i - 1].includes(pair)).length : 0), 0);
/** How far from the goal line the ball goes over. */
const depthOf = (o: Own, y: number) => (o.mine ? y : 100 - y);

describe('Round 1216: an own goal on real feeds', () => {
  it('the material is a dense fleet of own goals, each on the cast the viewer holds for it', () => {
    const f = buildFleet();
    const present = f.owns.filter(o => o.man);
    const keepers = present.filter(o => o.man!.keeper);
    console.log(`[1216 material] ${f.matches} matches, ${f.halves} half feeds; own goals staged ${f.owns.length} (goals left as they were: ${f.plainGoals}), for me ${f.owns.filter(o => o.mine).length}, against me ${f.owns.filter(o => !o.mine).length}; the named man on the viewer's cast ${present.length}, not on it ${f.owns.length - present.length}; by a back ${present.length - keepers.length}, by the keeper ${keepers.length}; actions that start outside the goal's own minute ${f.offMinute}, wound up as a last kick ${f.lastKick}`);
    for (const o of f.owns.filter(x => !x.man).slice(0, 5)) console.log(`[1216 material] not on the grass: ${o.label}`);
    expect(f.matches).toBe(100);
    expect(f.halves).toBe(200);
    /* Floors at half of what was measured (163 staged, 79 for me, 84 against me, 139 by a back, 24 by the keeper, 163 on the grass). */
    expect(f.owns.length).toBeGreaterThanOrEqual(81);
    expect(f.owns.filter(o => o.mine).length).toBeGreaterThanOrEqual(39);
    expect(f.owns.filter(o => !o.mine).length).toBeGreaterThanOrEqual(42);
    expect(present.length - keepers.length).toBeGreaterThanOrEqual(69);
    expect(keepers.length).toBeGreaterThanOrEqual(12);
    expect(present.length).toBeGreaterThanOrEqual(81);
  }, 300000);

  it('OG1: the ball goes in off the man the line names', () => {
    const present = buildFleet().owns.filter(o => o.man);
    let ownArm = 0, plainArm = 0;
    const gaps: number[] = [];
    const examples: string[] = [];
    for (const o of present) {
      const { at } = sharpestTurn(framesOf(o, 'own'));
      if (at < 0) { if (examples.length < 4) examples.push(`${o.label}: the ball never turns`); continue; }
      const touch = touchOf(o, at);
      const nearest = everybody(touch.frame).reduce((a, b) => (gapTo(a, touch.frame.ball) <= gapTo(b, touch.frame.ball) ? a : b));
      gaps.push(touch.gap);
      if (nearest.key === o.man!.key && touch.gap <= 1) ownArm++;
      else if (examples.length < 4) examples.push(`${o.label}: nearest ${nearest.key} at ${gapTo(nearest, touch.frame.ball).toFixed(2)}, the man ${o.man!.key} at ${touch.gap.toFixed(2)}`);
      /* The baseline arm at that same instant: is the named man the figure nearest ITS ball, that close? */
      const before = actionFrame(o.scene, o.plain, touch.t);
      const near = everybody(before).reduce((a, b) => (gapTo(a, before.ball) <= gapTo(b, before.ball) ? a : b));
      if (near.key === o.man!.key && gapTo(near, before.ball) <= 1) plainArm++;
    }
    console.log(`[1216 OG1] own goals with the man on the grass ${present.length}; at the touch the figure nearest the ball is the named man, within 1: own goal arm ${ownArm}, baseline arm ${plainArm}; the man's gap to the ball at the touch: ${spreadOf(gaps)}${examples.length ? ` | ${examples.join('; ')}` : ''}`);
    expect(ownArm).toBe(present.length);
    expect(plainArm).toBeLessThan(present.length / 10);
  }, 300000);

  it('OG9: from the touch to the net the ball passes nobody else', () => {
    const present = buildFleet().owns.filter(o => o.man);
    let offenders = 0, byKeeper = 0, byScoringSide = 0;
    const examples: string[] = [];
    for (const o of present) {
      const { at } = sharpestTurn(framesOf(o, 'own'));
      const from = touchOf(o, Math.max(0, at)).t;
      let hit: string | null = null;
      for (let t = from; t <= ACTION_SPAN && !hit; t += .0125) {
        const frame = actionFrame(o.scene, o.own, t);
        if (frame.phase !== 'flight') break;
        const other = everybody(frame).find(p => p.key !== o.man!.key && gapTo(p, frame.ball) < 2);
        if (other) { hit = other.key; if (other.keeper) byKeeper++; else if ((o.mine ? frame.mine : frame.theirs).includes(other)) byScoringSide++; }
      }
      if (hit) { offenders++; if (examples.length < 4) examples.push(`${o.label} passes ${hit}`); }
    }
    console.log(`[1216 OG9] own goals whose ball comes within 2 of another figure between the touch and the net: ${offenders} of ${present.length} (a keeper ${byKeeper}, a man of the side that got it ${byScoringSide})${examples.length ? ` | ${examples.join('; ')}` : ''}`);
    expect(offenders).toBe(0);
  }, 300000);

  it('OG2: the instants are the goal it always was', () => {
    const owns = buildFleet().owns;
    let samples = 0, moved = 0, mouth = 0, mouthOffenders = 0, netGoals = 0;
    for (const o of owns) {
      const own = framesOf(o, 'own'), plain = framesOf(o, 'plain');
      let net = false;
      own.forEach((frame, i) => {
        samples++;
        const was = plain[i];
        if (frame.phase !== was.phase || frame.action !== was.action || frame.net !== was.net || frame.netPulse !== was.netPulse || frame.holderKey !== was.holderKey) moved++;
        if (inMouth(frame.ball)) { mouth++; if (frame.phase !== 'flight' && frame.phase !== 'net') mouthOffenders++; else if (frame.phase === 'net') net = true; }
      });
      if (net) netGoals++;
    }
    console.log(`[1216 OG2] own goals ${owns.length}, samples ${samples}; samples whose phase, action, net, net pulse or holder differ from the baseline arm's ${moved}; frames with the ball in the goal mouth ${mouth}, outside flight and net ${mouthOffenders}; own goals with a frame in the net ${netGoals}`);
    expect(moved).toBe(0);
    expect(mouthOffenders).toBe(0);
    expect(netGoals).toBe(owns.length);
  }, 300000);

  it('OG3: nobody is the scorer, and the man holds his head', () => {
    const present = buildFleet().owns.filter(o => o.man);
    let hops = 0, plainHops = 0, noRue = 0, manCheers = 0, wrongSide = 0, unlike = 0, walkers = 0, cheered = 0;
    for (const o of present) {
      const own = framesOf(o, 'own'), plain = framesOf(o, 'plain');
      const scoring = (frame: Frame) => (o.mine ? frame.mine : frame.theirs);
      const conceding = (frame: Frame) => (o.mine ? frame.theirs : frame.mine);
      const lastFlight = own.filter(frame => frame.phase === 'flight').pop()!;
      let hopped = false, plainHopped = false;
      own.forEach((frame, i) => {
        if (plain[i].phase === 'net' && Object.values(plain[i].poses).some(pose => (pose.hop ?? 0) > 1e-9)) plainHopped = true;
        if (frame.phase !== 'net') return;
        if (Object.values(frame.poses).some(pose => pose.hop !== undefined)) hopped = true;
        const his = frame.poses[o.man!.key];
        if (!((his?.rue ?? 0) > 0)) noRue++;
        if (his?.celebrate) manCheers++;
        if (conceding(frame).some(p => frame.poses[p.key]?.celebrate)) wrongSide++;
        const arms = scoring(frame).filter(p => frame.poses[p.key]?.celebrate);
        if (arms.length) cheered++;
        if (arms.length > 3 || new Set(arms.map(p => frame.poses[p.key].celebrate)).size > 1) unlike++;
        /* Nobody walks to anybody: each man with his arms up stands where he stood on the last frame of the flight. */
        for (const p of arms) { const stood = scoring(lastFlight).find(q => q.key === p.key)!; if (Math.abs(stood.x - p.x) > 1e-9 || Math.abs(stood.y - p.y) > 1e-9) walkers++; }
      });
      if (hopped) hops++;
      if (plainHopped) plainHops++;
    }
    console.log(`[1216 OG3] own goals ${present.length}; with a hop on a net frame: own goal arm ${hops}, baseline arm ${plainHops}; net frames where the man has no rue ${noRue}, where he celebrates ${manCheers}, where a man of his side celebrates ${wrongSide}, where the raised arms are more than three or not alike ${unlike}, where a man with raised arms has moved ${walkers}; net frames with arms raised ${cheered}`);
    expect(hops).toBe(0);
    expect(plainHops).toBe(present.length);
    expect(noRue + manCheers + wrongSide + unlike + walkers).toBe(0);
    expect(cheered).toBeGreaterThan(present.length);
  }, 300000);

  it('OG4: nobody stands on a team mate while it plays', () => {
    const owns = buildFleet().owns;
    let runs = 0;
    const examples: string[] = [];
    for (const o of owns) {
      /* R2's own reading (every .05) and the finer one (every .025). */
      const found = runsOf(framesOf(o, 'own', TICKS.filter((_t, i) => i % 2 === 0)).map(overlapping)) + runsOf(framesOf(o, 'own').map(overlapping));
      runs += found;
      if (found && examples.length < 4) examples.push(o.label);
    }
    /* A walk through a team mate, made by hand: a man of the side that conceded far up the pitch, with a team mate
       on the straight line to where he meets the ball. The fleet has one or two of these and may have none tomorrow. */
    const through: MotionScene<MotionPlayer> = {
      mine: [{ key: 'm0', name: 'Home keeper', keeper: true, x: 50, y: 93 }, { key: 'm9', name: 'Home striker', keeper: false, x: 52, y: 26 }],
      theirs: [{ key: 'o0', name: 'Away keeper', keeper: true, x: 50, y: 7 }, { key: 'o5', name: 'Away far', keeper: false, x: 34, y: 46 }, { key: 'o4', name: 'Away between', keeper: false, x: 34.5, y: 31 }],
      ball: { x: 53.6, y: 23.8 }, holderKey: 'm9',
    };
    const line: MotionEvent = { key: 'through', at: 5, event: { minute: 5, side: 'me', kind: 'goal', text: 'Away far', og: true } };
    const hand = TICKS.map(t => actionFrame(through, line, t));
    const walked = gapTo(hand[hand.length - 1].theirs.find(p => p.key === 'o5')!, through.theirs[1]);
    const handRuns = runsOf(hand.map(overlapping));
    console.log(`[1216 OG4] own goals ${owns.length}; pairs of one side overlapping two samples running ${runs}${examples.length ? ` (${examples.join('; ')})` : ''}; the scene made by hand: the man covers ${walked.toFixed(1)} past a team mate, pairs overlapping two samples running ${handRuns}`);
    expect(walked).toBeGreaterThan(20);
    expect(runs).toBe(0);
    expect(handRuns).toBe(0);
  }, 300000);

  it('OG5: the turn can be seen, and the ball comes to the man', () => {
    const present = buildFleet().owns.filter(o => o.man);
    const ownTurns: number[] = [], plainTurns: number[] = [], walks: number[] = [], homeWalks: number[] = [];
    let away = 0, short = 0;
    for (const o of present) {
      const frames = framesOf(o, 'own');
      const { turn, at } = sharpestTurn(frames);
      ownTurns.push(turn);
      plainTurns.push(sharpestTurn(framesOf(o, 'plain')).turn);
      const last = everybody(frames[frames.length - 1]).find(p => p.key === o.man!.key)!;
      const walk = gapTo(last, o.man!);
      walks.push(walk);
      /* A back who stands in his own third when it starts. One the cast has further up the pitch is counted apart. */
      if (depthOf(o, o.man!.y) <= 24) homeWalks.push(walk); else away++;
      /* For the lead: is the man shown by his number alone (a crowd) at the touch? The viewer's own rule. */
      const touch = touchOf(o, Math.max(0, at)).frame;
      if (labelsShort(everybody(touch).map(p => ({ key: p.key, x: p.x, y: p.y }))).has(o.man!.key)) short++;
    }
    console.log(`[1216 OG5] the sharpest turn of the ball in flight, degrees: own goal arm ${spreadOf(ownTurns)}; baseline arm ${spreadOf(plainTurns)}; the floor is 20`);
    console.log(`[1216 OG5 walk] how far the man goes to meet it: ${spreadOf(walks)}; from his own third (${homeWalks.length} of ${present.length}): ${spreadOf(homeWalks)}; standing further up when it starts ${away}; shown by his number alone at the touch ${short}`);
    /* Measured: the own goal arm never under 36 and the baseline arm never over 4. The floor sits between them. */
    expect(ownTurns.filter(turn => turn < 20).length).toBe(0);
    expect(plainTurns.filter(turn => turn >= 20).length).toBe(0);
    /* Bounds of the geometry, on every own goal: a back in his own third is moved into a band and off a line, never across the box. */
    expect(homeWalks.every(walk => walk <= 15)).toBe(true);
    expect(quantile(walks, .5)).toBeLessThanOrEqual(3);
    expect(quantile(walks, .9)).toBeLessThanOrEqual(8);
  }, 300000);
});

/* ---- scenes made by hand: what a fleet cannot be asked for. No outcome of a match is read off them. ---- */
const HAND = (holderKey: string): MotionScene<MotionPlayer> => ({
  mine: [
    { key: 'm0', name: 'Home keeper', keeper: true, x: 50, y: 93 },
    { key: 'm3', name: 'Home back', keeper: false, x: 40, y: 83 },
    { key: 'm4', name: 'Home other back', keeper: false, x: 62, y: 84 },
    { key: 'm8', name: 'Home near', keeper: false, x: 44, y: 34 },
    { key: 'm7', name: 'Home next', keeper: false, x: 60, y: 38 },
    { key: 'm9', name: 'Home striker', keeper: false, x: 52, y: 27 },
  ],
  theirs: [
    { key: 'o0', name: 'Away keeper', keeper: true, x: 50, y: 7 },
    { key: 'o3', name: 'Away back', keeper: false, x: 60, y: 17 },
    { key: 'o4', name: 'Away other back', keeper: false, x: 38, y: 16 },
    { key: 'o8', name: 'Away near', keeper: false, x: 56, y: 66 },
    { key: 'o7', name: 'Away next', keeper: false, x: 40, y: 62 },
    { key: 'o9', name: 'Away striker', keeper: false, x: 48, y: 73 },
  ],
  ball: holderKey === 'm9' ? { x: 53.6, y: 24.8 } : { x: 49.6, y: 75.2 }, holderKey,
});
const handLine = (side: 'me' | 'opp', text: string, extra: Partial<PitchEvent> = {}): MotionEvent => ({
  key: `hand:${side}:${text}`, at: 5, event: { minute: 5, side, kind: 'goal', text, og: true, ...extra },
});
const sceneFor = (side: 'me' | 'opp') => HAND(side === 'me' ? 'm9' : 'o9');
const handFrames = (side: 'me' | 'opp', text: string, extra: Partial<PitchEvent> = {}, ticks: number[] = TICKS) => ticks.map(t => actionFrame(sceneFor(side), handLine(side, text, extra), t));

describe('Round 1216: an own goal on scenes made by hand', () => {
  it('OG6: who it goes in off, and a man who is not there moves nobody', () => {
    for (const side of ['me', 'opp'] as const) {
      const scene = sceneFor(side);
      const conceding = side === 'me' ? scene.theirs : scene.mine;
      const [back, otherBack, scorer] = side === 'me' ? ['Away back', 'Away other back', 'Home near'] : ['Home back', 'Home other back', 'Away near'];
      const keyOf = (name: string) => conceding.find(p => p.name === name)!.key;
      /* The name in the line's text. */
      expect(ownGoalFigure(conceding, handLine(side, back).event)?.key).toBe(keyOf(back));
      expect(handFrames(side, back).every(frame => frame.ownGoalBy === keyOf(back))).toBe(true);
      /* A key beats the name. */
      expect(ownGoalFigure(conceding, handLine(side, back, { ogBy: keyOf(otherBack) }).event)?.key).toBe(keyOf(otherBack));
      expect(handFrames(side, back, { ogBy: keyOf(otherBack) }).every(frame => frame.ownGoalBy === keyOf(otherBack))).toBe(true);
      /* A key alone, for a binder whose figures have no names. */
      expect(handFrames(side, '', { ogBy: keyOf(back) }).every(frame => frame.ownGoalBy === keyOf(back))).toBe(true);
      /* Never a man of the side that GOT the goal, whatever the text says, and never a guess: a name nobody on
         the conceding side has, and no name at all, find nobody. */
      for (const text of [scorer, 'Nobody Here', '']) {
        expect(ownGoalFigure(conceding, handLine(side, text).event)).toBeNull();
        const frames = handFrames(side, text);
        expect(frames.every(frame => frame.ownGoalBy === null)).toBe(true);
        /* Nobody of the side that conceded is moved to it (their keeper dives, as on any goal), nobody holds his head, */
        for (const frame of frames) {
          for (const p of side === 'me' ? frame.theirs : frame.mine) if (!p.keeper) expect({ x: p.x, y: p.y }).toEqual({ x: conceding.find(q => q.key === p.key)!.x, y: conceding.find(q => q.key === p.key)!.y });
          expect(Object.values(frame.poses).some(pose => pose.rue !== undefined || pose.hop !== undefined)).toBe(false);
        }
        /* and the ball still turns in front of that goal and ends in the net. */
        expect(sharpestTurn(frames).turn).toBeGreaterThanOrEqual(20);
        expect(frames[frames.length - 1].phase).toBe('net');
        expect(inMouth(frames[frames.length - 1].ball)).toBe(true);
      }
      /* The man who delivers it is the man the plan led in, never one found by the line's text: with a namesake
         of the man who put it in standing on the scoring side, the holder still has the ball. */
      const namesake = structuredClone(scene);
      (side === 'me' ? namesake.mine : namesake.theirs)[3].name = back;
      expect(actionFrame(namesake, handLine(side, back), 0).holderKey).toBe(scene.holderKey);
      /* A side with nobody on the grass: nothing throws and the goal is still a goal. */
      const empty: MotionScene<MotionPlayer> = side === 'me' ? { ...scene, theirs: [] } : { ...scene, mine: [] };
      const lone = actionFrame(empty, handLine(side, back), ACTION_SPAN);
      expect([lone.phase, lone.net, lone.ownGoalBy]).toEqual(['net', side === 'me' ? 'opp' : 'me', null]);
    }
  });

  it('OG7: reduced motion shows the last frame at once, the man with his head in his hands', () => {
    for (const [side, back] of [['me', 'Away back'], ['opp', 'Home back']] as const) {
      const scene = sceneFor(side);
      const line = handLine(side, back);
      const key = (side === 'me' ? scene.theirs : scene.mine).find(p => p.name === back)!.key;
      const { result, rerender, unmount } = renderHook(({ clock }) => useLiveSimMotion(scene, line, clock, true, true), { initialProps: { clock: 5.01 } });
      const first = structuredClone(result.current);
      expect([first.phase, first.action, first.net, first.ownGoalBy]).toEqual(['net', 'goal', side === 'me' ? 'opp' : 'me', key]);
      expect(inMouth(first.ball)).toBe(true);
      expect(first.poses[key].rue).toBe(1);
      expect(Object.values(first.poses).some(pose => pose.hop !== undefined)).toBe(false);
      /* The man is where he met it, not where he started. */
      const start = (side === 'me' ? scene.theirs : scene.mine).find(p => p.key === key)!;
      const shown = (side === 'me' ? first.theirs : first.mine).find(p => p.key === key)!;
      expect(gapTo(shown, start)).toBeGreaterThan(0);
      /* Nothing moves after that: a fifth of a second on (0.4 of the clock at the default speed) it is the same frame. */
      rerender({ clock: 5.41 });
      expect(result.current).toEqual(first);
      unmount();
    }
  });

  it('OG8: a goal from the spot or from a direct free kick is never drawn as an own goal', () => {
    for (const side of ['me', 'opp'] as const) for (const flag of [{ penalty: true }, { freeKick: true }]) {
      const back = side === 'me' ? 'Away back' : 'Home back';
      const tagged = handFrames(side, back, flag);
      const plain = TICKS.map(t => actionFrame(sceneFor(side), { ...handLine(side, back, flag), event: { ...handLine(side, back, flag).event, og: false } }, t));
      expect(tagged).toEqual(plain);
      expect(tagged.every(frame => frame.ownGoalBy === undefined)).toBe(true);
    }
  });
});

/* ---- the record. A small FNV-1a hash over JSON with numbers rounded to four places, as in
   liveSimCelebration.test.tsx, whose three digests (every frame that is NOT an own goal, and the figure in every
   pose it had) this round does not edit. These two are new: recorded once, in the commit that drew the own goal. */
const fnv = (text: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
  return (hash >>> 0).toString(16).padStart(8, '0');
};
const FRAME_FIELDS = ['mine', 'theirs', 'ball', 'holderKey', 'poses', 'action', 'net', 'netPulse', 'phase', 'ownGoalBy'] as const;
const digest = (value: unknown) => fnv(JSON.stringify(value, (_key, v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v)));
const SAMPLES = Array.from({ length: 22 }, (_unused, i) => i * .05);
const OWN_DIGEST = 'pending';
const RUE_DIGEST = 'pending';

describe('Round 1216: the recorded own goal', () => {
  it('OWN: every own goal frame of the hand made scenes is the recorded one', () => {
    const frames: unknown[] = [];
    for (const side of ['me', 'opp'] as const) {
      const [back, keeper, backKey] = side === 'me' ? ['Away back', 'Away keeper', 'o4'] : ['Home back', 'Home keeper', 'm4'];
      const variants: [string, Partial<PitchEvent>][] = [
        [back, {}], [keeper, {}], [keeper, { flank: 'left' }], [keeper, { flank: 'right' }], ['', { ogBy: backKey }],
        ['Nobody Here', {}], ['Nobody Here', { flank: 'left' }], ['Nobody Here', { flank: 'right' }],
      ];
      for (const [text, extra] of variants) for (const frame of handFrames(side, text, extra, SAMPLES)) {
        frames.push(Object.fromEntries(FRAME_FIELDS.map(field => [field, (frame as unknown as Record<string, unknown>)[field]])));
      }
    }
    expect(frames).toHaveLength(2 * 8 * 22);
    console.log(`[1216 digest] OWN ${digest(frames)}`);
    expect(digest(frames)).toBe(OWN_DIGEST);
  });

  it('RUE: the figure with his head in his hands is the recorded one, and at rue 0 it is the figure it was', () => {
    const still = renderToStaticMarkup(<LivePitchPlayer color="#85bcf0" keeper={false} />);
    expect(renderToStaticMarkup(<LivePitchPlayer color="#85bcf0" keeper={false} pose={{ rue: 0 }} />)).toBe(still);
    const poses = [
      { keeper: false, pose: { rue: 1 } }, { keeper: false, pose: { rue: .5 } }, { keeper: false, pose: { kick: .3, rue: 1 } },
      { keeper: true, pose: { dive: 68, rue: 1 } },
    ];
    const markup = poses.map(p => renderToStaticMarkup(<LivePitchPlayer color="#85bcf0" keeper={p.keeper} pose={p.pose} />));
    expect(new Set([still, ...markup]).size).toBe(poses.length + 1);
    for (const drawn of markup) expect(drawn).toContain('data-pm-rue="1"');
    expect(still).not.toContain('data-pm-rue');
    /* Both hands at the height of the head, close in beside it. */
    const { container } = render(<LivePitchPlayer color="#85bcf0" keeper={false} pose={{ rue: 1 }} />);
    expect([...container.querySelectorAll('circle')].map(hand => [Math.abs(Number(hand.getAttribute('cx'))), Number(hand.getAttribute('cy'))])).toEqual([[6, -20], [6, -20]]);
    console.log(`[1216 digest] RUE ${fnv(markup.join('\n'))}`);
    expect(fnv(markup.join('\n'))).toBe(RUE_DIGEST);
  });
});

/* ---- the viewer, on the dense engine: every fixture is FOUND by a bounded seeded search, none is typed ---- */
async function step(ms: number) { for (let time = 0; time < ms; time += 16) await act(async () => { vi.advanceTimersByTime(Math.min(16, ms - time)); }); }
function mount(career: CareerState) {
  const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
  return { ...render(<LiveSimScreen career={career} live={career.live ?? null} report={null} clubColor="#86bced" {...callbacks} />), callbacks };
}
const readScore = (container: HTMLElement) => container.querySelector('[data-cm-live-score]')!.textContent!.trim();
const scoreBy = (career: CareerState, pos: number) => ['me', 'opp'].map(side => liveFeed(career.live!)
  .filter(e => e.kind === 'goal' && e.side === side && clockPos(e) <= pos).length).join(' - ');
const isChance = (e: LiveFeedEvent) => ['goal', 'save', 'shot'].includes(e.kind);
/** Who the man is on the page: one of mine by his id (data-cm-dot), one of theirs by the number on his back
 *  (data-cm-dot-opp: his place in their eleven plus one, or 12 plus his place on their bench). */
function manOnPage(career: CareerState, goal: LiveFeedEvent): { attr: 'cmDot' | 'cmDotOpp'; value: string } {
  if (goal.side === 'opp') return { attr: 'cmDot', value: career.squad.find(p => p.name === goal.text)!.id };
  const live = career.live!;
  const started = (live.oppXi ?? []).findIndex(p => p.n === goal.text);
  return { attr: 'cmDotOpp', value: String(started >= 0 ? started + 1 : 12 + (live.oppBench ?? []).findIndex(p => p.n === goal.text)) };
}
const percent = (value: string) => Number(value.replace('%', ''));
/** One frame of the page: the pitch's own attributes, the score, the card, and where the ball and every dot are. */
function readPage(container: HTMLElement) {
  const pitch = container.querySelector<HTMLElement>('[data-cm-live-pitch]')!;
  const ball = pitch.querySelector<HTMLElement>('[data-cm-ball]')!;
  const dots = [...pitch.querySelectorAll<HTMLElement>('[data-cm-dot],[data-cm-dot-opp]')].map(dot => ({
    mine: dot.dataset.cmDot !== undefined, id: dot.dataset.cmDot ?? dot.dataset.cmDotOpp ?? '', x: percent(dot.style.left), y: percent(dot.style.top),
    rue: !!dot.querySelector('[data-pm-rue]'), pose: dot.querySelector('svg')?.getAttribute('data-cm-actor-pose') ?? '',
  }));
  const card = container.querySelector<HTMLElement>('[data-cm-goal-card]');
  return {
    motion: pitch.getAttribute('data-cm-motion'), phase: pitch.getAttribute('data-cm-motion-phase'), own: pitch.getAttribute('data-pm-own-goal'),
    score: readScore(container), dots,
    card: card ? { side: card.dataset.cmGoalCard ?? '', line: card.children[0]?.textContent ?? '', club: card.children[1]?.textContent ?? '' } : null,
    ball: { x: percent(ball.style.left), y: percent(ball.style.top) },
    minute: Number(container.querySelector('[data-cm-live-minute]')!.getAttribute('data-cm-live-minute')),
    cast: dots.map(d => `${d.mine ? 'm' : 'o'}${d.id}`).join(','),
  };
}
type PageFrame = ReturnType<typeof readPage>;
/** What every own goal on the page must show, read off the frames of its action. */
function expectOwnGoalOnPage(frames: PageFrame[], career: CareerState, goal: LiveFeedEvent, before: string, after: string) {
  const who = manOnPage(career, goal);
  const isMan = (d: PageFrame['dots'][number]) => d.mine === (who.attr === 'cmDot') && d.id === who.value;
  const playing = frames.filter(f => f.motion === 'goal');
  const windup = playing.filter(f => f.phase === 'plant' || f.phase === 'flight');
  const net = playing.filter(f => f.phase === 'net');
  expect(windup.length).toBeGreaterThan(20);
  expect(net.length).toBeGreaterThan(5);
  /* The pitch says it is an own goal on every frame of it, and the man is on the grass. */
  expect(playing.every(f => f.own !== null && f.own !== '')).toBe(true);
  expect(playing.every(f => f.dots.filter(isMan).length === 1)).toBe(true);
  /* The score waits for the ball, and the first frame with the new score is the ball in the net. */
  expect(windup.filter(f => f.score !== before).length).toBe(0);
  const changed = frames.find(f => f.score !== before);
  expect(changed && { score: changed.score, motion: changed.motion, phase: changed.phase }).toEqual({ score: after, motion: 'goal', phase: 'net' });
  /* The last touch: on the frame of the flight where the ball is nearest the man, no dot is nearer it than his. */
  const flight = playing.filter(f => f.phase === 'flight');
  const gap = (f: PageFrame, d: PageFrame['dots'][number]) => Math.hypot(d.x - f.ball.x, d.y - f.ball.y);
  const touch = flight.reduce((a, b) => (gap(a, a.dots.find(isMan)!) <= gap(b, b.dots.find(isMan)!) ? a : b));
  const nearest = touch.dots.reduce((a, b) => (gap(touch, a) <= gap(touch, b) ? a : b));
  expect({ nearestIsTheMan: isMan(nearest), within: gap(touch, touch.dots.find(isMan)!) <= 2.5 }).toEqual({ nearestIsTheMan: true, within: true });
  /* In the net: he alone holds his head, nobody of his side has his arms up, and somebody of the other side does. */
  const settled = net.slice(3);
  expect(settled.every(f => f.dots.filter(d => d.rue).length === 1 && f.dots.find(d => d.rue) === f.dots.find(isMan))).toBe(true);
  expect(net.some(f => f.dots.some(d => d.mine === (who.attr === 'cmDot') && d.pose === 'celebrate'))).toBe(false);
  expect(net.some(f => f.dots.some(d => d.mine !== (who.attr === 'cmDot') && d.pose === 'celebrate'))).toBe(true);
  /* The card rises with the ball in the net and reads GOAL!, the man, the minute and (O.G), under the club that got it. */
  const carded = frames.filter(f => f.card);
  expect(carded.length).toBeGreaterThan(0);
  expect(carded.every(f => f.motion === 'goal' && f.phase === 'net' && f.score === after)).toBe(true);
  return carded[0].card!;
}

describe('Round 1216: an own goal in the live match', () => {
  /** The first own goal for each side that stands alone in a first half of the search. */
  function findOwnGoals() {
    vi.mocked(Math.random).mockImplementation(seeded(121601));
    const found = new Map<string, { career: CareerState; goal: LiveFeedEvent; match: number }>();
    let career = startCareer('Aston Villa');
    let match = 0;
    for (let attempt = 0; attempt < 60 && found.size < 2; attempt++) {
      const next = playNextEntry(career);
      career = next.state;
      if (!career.live) continue;
      match++;
      const feed = liveFeed(career.live);
      for (const goal of feed) {
        if (goal.kind !== 'goal' || !goal.og || goal.minute < 3 || goal.minute > 40 || found.has(goal.side)) continue;
        /* On its own: no other chance and no review within two minutes of it, so the score has one step to take. */
        if (feed.some(other => other !== goal && (isChance(other) || other.kind === 'var') && Math.abs(clockPos(other) - clockPos(goal)) < 2.2)) continue;
        const copy = structuredClone(career);
        copy.live!.minute = goal.minute - .2;
        found.set(goal.side, { career: copy, goal, match });
      }
      career = resumeMatch(career).state;
    }
    return found;
  }

  it.each(['me', 'opp'] as const)('the live match draws an own goal for %s off the man on its card', async side => {
    const fixture = findOwnGoals().get(side);
    expect(fixture, `no first half of the search held an own goal for ${side} standing on its own`).toBeTruthy();
    const { career, goal } = fixture!;
    const before = scoreBy(career, clockPos(goal) - 1), after = scoreBy(career, clockPos(goal));
    expect(after).not.toBe(before);
    const mounted = mount(career);
    const told = () => [...mounted.container.querySelectorAll('[data-cm-live-log] li')]
      .some(li => li.textContent!.startsWith(`${goal.minute}'`) && li.textContent!.includes('GOAL!') && li.textContent!.includes(goal.text) && li.textContent!.includes('(O.G)'));
    const frames: PageFrame[] = [];
    let toldEarly = 0;
    /* 1.3 seconds at the default speed: the line fires a fifth of a second in and the ball is in at about one. */
    for (let i = 0; i < 80; i++) {
      await step(16);
      frames.push(readPage(mounted.container));
      if (told() && frames[frames.length - 1].phase !== 'net') toldEarly++;
    }
    const card = expectOwnGoalOnPage(frames, career, goal, before, after)!;
    console.log(`[1216 viewer] an own goal for ${side}, match ${fixture!.match} of the search, ${goal.minute}' ${goal.text}: card "${card.line}" under "${card.club}"`);
    expect(card.side).toBe(side);
    expect(card.line.startsWith('GOAL! ')).toBe(true);
    expect(card.line).toContain(goal.text);
    expect(card.line.endsWith(`${goal.minute}' (O.G)`)).toBe(true);
    /* Under the club that GOT the goal, with no count: an own goal is nobody's second of the match. */
    expect(card.club).toBe(side === 'me' ? career.clubName : career.live!.opponent);
    /* The list beside the pitch says it only once the ball is in. */
    expect(toldEarly).toBe(0);
    expect(told()).toBe(true);
    expect(mounted.callbacks.onChange).not.toHaveBeenCalled();
  }, 120000);
});

/* The twin of Release AR's test ('a goal still on its way when the line up changes off the clock keeps its net,
   its card and its men', liveSimMotion.test.tsx): the same search on the dense engine, so the goal that waited
   behind a chance, with the line up changing in the next minute while its ball is in the air, is an OWN goal.
   And, where the bounded search meets one, the case where the man who put it in is the one who leaves. */
describe('Round 1216: an own goal and a change of line up off the clock', () => {
  const SEARCH_CAP = 4000;
  type Held = { career: CareerState; goal: LiveFeedEvent; at: number; attempt: number; leaves: boolean };
  function findHeld(): { held: Held | null; leaving: Held | null; attempts: number } {
    vi.mocked(Math.random).mockImplementation(seeded(121601));
    let base = startCareer('Aston Villa');
    for (let guard = 0; guard < 40 && !base.live; guard++) base = playNextEntry(base).state;
    const names = (input: PitchInput) => [...input.mine, ...input.theirs].map(f => f.name ?? '');
    const eleven = (input: PitchInput) => JSON.stringify([input.mine, input.theirs].map(list => list.map(f => [f.key, f.name ?? ''])));
    let held: Held | null = null, leaving: Held | null = null, attempt = 0;
    for (; attempt < SEARCH_CAP && !(held && leaving); attempt++) {
      vi.mocked(Math.random).mockImplementation(seeded(12160077 + attempt * 104729));
      const first = changeLive(base, 0, { kind: 'shape', mentality: 'balanced' })!;
      const second = startSecondHalf(structuredClone(first))!;
      for (const [cap, stage, career] of [[45, 'first', first], [90, 'second', second]] as const) {
        const stop = cap + boardAt(career, cap);
        const feed = liveFeed(career.live!).filter(e => e.minute > cap - 45 && e.minute <= cap);
        for (const goal of feed) {
          const m = goal.minute;
          if (goal.kind !== 'goal' || !goal.og || goal.plus || m < cap - 40 || m > cap - 4) continue;
          if (feed.some(e => e !== goal && (e.kind === 'goal' || e.kind === 'var') && Math.abs(clockPos(e) - m) <= 2)) continue;
          const opened = m - 1.2;
          const cast = (minute: number) => stagePitchInput(career, career.live!, null, stage, minute, 0, stop, opened);
          if (eleven(cast(m - 2)) !== eleven(cast(m)) || eleven(cast(m)) === eleven(cast(m + 1))) continue;
          const staged = pitchPlan(cast(m)).actions.find(a => a.event.kind === 'goal' && a.event.side === goal.side && a.event.minute === m && !a.event.plus);
          if (!staged || staged.at > m + 0.6 || staged.at + NET_AT < m + 1.04) continue;
          if (!names(cast(m)).includes(goal.text)) continue;
          const leaves = !names(cast(m + 1)).includes(goal.text);
          const copy = structuredClone(career);
          copy.live!.minute = opened;
          const one: Held = { career: copy, goal, at: staged.at, attempt, leaves };
          if (!held) held = one;
          if (leaves && !leaving) leaving = one;
        }
      }
    }
    return { held, leaving, attempts: attempt };
  }

  it('an own goal still on its way when the line up changes off the clock keeps its net, its card and its men', async () => {
    const search = findHeld();
    console.log(`[1216 held cast] ${search.attempts} halves redrawn (cap ${SEARCH_CAP}); the own goal found on attempt ${search.held?.attempt ?? 'none'}; one whose man is the one leaving on attempt ${search.leaving?.attempt ?? 'none'}`);
    expect(search.held, 'no half held an own goal still on its way when the line up changes off the clock').not.toBeNull();
    for (const found of [search.held!, ...(search.leaving && search.leaving !== search.held ? [search.leaving] : [])]) {
      const { career, goal } = found;
      const m = goal.minute;
      const before = scoreBy(career, m - 1), after = scoreBy(career, m);
      expect(after).not.toBe(before);
      const mounted = mount(career);
      const frames: PageFrame[] = [];
      for (let i = 0; i < 900; i++) {
        await step(16);
        frames.push(readPage(mounted.container));
        if (frames[frames.length - 1].minute >= m + 2) break;
      }
      const card = expectOwnGoalOnPage(frames, career, goal, before, after)!;
      console.log(`[1216 held cast] ${goal.minute}' for ${goal.side}, ${goal.text}${found.leaves ? ' (he is the man who leaves at ' + (m + 1) + ')' : ''}: staged at ${found.at.toFixed(3)}, the ball in at ${(found.at + NET_AT).toFixed(3)}, card "${card.line}"`);
      expect(card.line.endsWith(`${m}' (O.G)`)).toBe(true);
      const playing = frames.filter(f => f.motion === 'goal');
      const windup = playing.filter(f => f.phase === 'plant' || f.phase === 'flight');
      /* The stretch watched is the one the search promised: the next minute came with the ball on its way. */
      expect(windup.some(f => f.minute === m + 1)).toBe(true);
      /* The card is held as any goal's is (1.8 real seconds at this speed: over a hundred frames). */
      expect(frames.filter(f => f.card).length).toBeGreaterThan(60);
      /* The own goal is played out by the men it started with, the man who put it in among them, */
      expect(new Set(playing.map(f => f.cast)).size).toBe(1);
      /* and the change comes onto the grass as soon as it has been seen, and stays. */
      const since = frames.slice(frames.lastIndexOf(playing[playing.length - 1]) + 1);
      expect(since.length).toBeGreaterThan(10);
      expect(since.every(f => f.cast !== playing[0].cast && f.score === after && !f.card)).toBe(true);
      expect(frames[frames.length - 1].minute).toBe(m + 2);
      mounted.unmount();
    }
  }, 300000);
});
