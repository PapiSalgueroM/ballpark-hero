import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Pause, Play, FastForward, Users, ArrowLeft, ArrowLeftRight, Gauge, X } from 'lucide-react';
import {
  FORMATIONS, MENTALITIES, slotPosition, pitchLineOf, resolveXI, extraTimeCall,
  liveFeed, liveStatsAt, myOnPitchAt, oppOnPitchAt, squadNumbers, benchFor, MAX_SUBS, liveGoneIds,
} from '@/lib/clubManager';
import type {
  CareerState, CMPlayer, LiveMatch, MatchWeekReport, MatchStats, Mentality, TalkTone,
  LiveChange, LiveFeedEvent, FormationSlot,
} from '@/lib/clubManager';
/* Round 781: the clock label, the board aware "has it happened", and the tie on a second leg. */
import { minuteLabel, playedBy, secondLegContext } from '@/lib/clubManager';
import { HalftimeScreen } from '@/components/club-manager/HalftimeScreen';
import { MadeUpTag } from '@/components/club-manager/SquadScreen';
import { ShootoutKicks } from '@/components/club-manager/ShootoutKicks';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { cardsAndSubsAt, liveLines, reportLines } from '@/lib/clubManagerMatchCentre';
import type { CardsAndSubs } from '@/lib/clubManagerMatchCentre';
import { LivePitchPlayer, useLiveSimMotion } from '@/components/club-manager/LiveSimMotion';
import type { MotionEvent } from '@/components/club-manager/LiveSimMotion';
/* Round 1101: the pitch itself is the shared part now. New imports go on their own lines: the two
   above are anchors a harness swaps by exact text. */
import { ACTION_SPAN, BEAT_SPAN, NET_AT } from '@/components/pitch-motion/contract';
import type { PitchFigure, PitchInput, PitchSide } from '@/components/pitch-motion/contract';
import { goalWindow } from '@/components/pitch-motion/motion';
import { PitchSurface, pitchSpot } from '@/components/pitch-motion/PitchSurface';
import { CelebrationStyles } from '@/components/club-manager/CelebrationStyles';
import { pitchPlan, pitchScene, pitchSceneKey } from '@/components/pitch-motion/scene';
/* Round 1146: the mark after a goal, the report's own. */
import { scorerMark } from '@/lib/clubManagerScorerLine';
import type { GoalMarks } from '@/lib/clubManagerScorerLine';
import { cmVarEventWaiting, cmVarPlayWaiting, cmVarCanAnnounce, cmVarPlayedReviewIds, cmVarLabel } from '@/lib/clubManagerVar';
import { ClubManagerVarReview } from '@/components/club-manager/ClubManagerVarReview';

/**
 * Round 158: the Live Sim. His words, the ones he said to really pay
 * attention to: "both sides with each of their formations start and then u
 * see the little circles moving about... people can choose the speed of
 * that... there should be stats counter there with gx and also momentum
 * graph... as manger u can see ur players and make subs and see their
 * stamina".
 *
 * Round 504, his words again: "Ball at players' feet, both teams with names
 * and numbers on their dots, players cover the whole pitch, throw ins,
 * corners and fouls exist. Live stats visible during play, subs and tactics
 * at any moment, the AI opponent also subs."
 *
 * What it is: a 2D walk through the match the engine has already committed,
 * never a second simulation. The engine decides each half as a stream (goals,
 * chances, corners, throw ins, fouls, cards, an injury, the other dugout's
 * subs, every one with a minute), the first at kick off and the second when
 * the manager sends them back out, and this screen walks liveFeed(live) with
 * a clock. The stats strip is liveStatsAt(live, minute), the same function
 * the report's stats block is counted with, so the counter at the final
 * whistle and the number on the report are one number by construction.
 *
 * A change at any minute (tap one of your dots, bring somebody on or change
 * the shape) goes to the engine through onChange, which keeps everything at
 * or before that minute and redraws the rest of the half. The interval is
 * still the real dressing room (HalftimeScreen, embedded). onStartSecondHalf
 * draws the second half; onSecondHalf FINISHES the match at the final whistle
 * and lands the report.
 *
 * Round 670: a level Champions League decider does not finish at 90. At 90 the
 * viewer calls onStartExtraTime once, the engine draws the thirty minutes on
 * the latest save when they are due (never decided here), and the viewer
 * reads the answer off live.et: extra time runs the clock on to 120 before
 * onSecondHalf, and no extra time finishes the match at 90.
 *
 * Round 781: the board is football. Each period's clock runs on past its
 * last minute by the board the engine drew for it (live.added), reading
 * 45+2' and 90+4', and a line in the board (minute 90, plus 3) fires when the
 * clock reaches 90+3, not at 90. The whistle, the interval and the question
 * at the end of the ninety all move to the end of the board. A change made in
 * the board is filed at the period's last minute with its plus, and the
 * engine draws the rest of that board again off it (recutBoard).
 *
 * Round 1101: the choreography between events (who is carrying the ball, both
 * sides holding their shape around it, the walk back for a kick off, the
 * corner swung in) is theatre, and it is no longer drawn in this file. It is
 * the shared pitch in src/components/pitch-motion: stagePitchInput hands it
 * this period's feed, pitchPlan and pitchScene say where everybody stands at
 * the clock, off a generator keyed on the match, and this file draws no
 * random number at all. The score, the scorers and every event minute are the
 * sim's own. The screen never lies about the sim; it is allowed to dance around it.
 */

type Stage = 'first' | 'interval' | 'second' | 'extra' | 'done';
type Side = 'me' | 'opp';

/** One man on the grass before he is placed: who he is and the slot his shape gives him. */
interface Man {
  key: string;
  slot: FormationSlot;
  /** Last name, or '' for an opposition with no named eleven. */
  label: string;
  name?: string;
  number: number;
  /** Mine only. */
  id?: string;
  side: Side;
  /** Theirs only: a man the game made up, tagged the way the ratings sheet tags him. */
  gen?: boolean;
}
/** A run of banner or event line text; `gen` hangs the MADE UP tag after it. */
interface Seg { t: string; gen?: boolean; }
interface Banner { segs: Seg[]; club: string; tone: Side | 'none'; }
/** Round 1101: a goal that is playing out on the pitch. The card rises with it when the ball is in the net. */
interface GoalMoment { key: string; at: number; side: Side; segs: Seg[]; club: string; nth: number; season: number | null; line: LogLine; }
/** Round 1101: the one panel that can be open beside (or, on a phone, over the foot of) the pitch. */
type Panel = 'stats' | 'squad' | 'help' | 'kicks';
/** Round 1101: one line of the match as it was announced, for the list beside the pitch on a wide screen. */
interface LogLine { key: string; at: string; segs: Seg[]; }

interface LiveSimScreenProps {
  career: CareerState;
  live: LiveMatch | null;
  report: MatchWeekReport | null;
  clubColor: string;
  onSub: (outId: string, inId: string) => void;
  onShape: (m: Mentality) => void;
  onTalk: (tone: TalkTone | null) => void;
  /** Round 504: finishes the match (the page passes resumeMatch). Called once,
   *  at the final whistle: at 90, or at the end of extra time (Round 670). */
  onSecondHalf: () => void;
  onExit: () => void;
  /** Round 504: draws the second half when they go back out. */
  onStartSecondHalf: () => void;
  /** Round 670: called once when the clock reaches 90. The engine draws extra
   *  time on the LATEST save when it is due and leaves the save alone when it
   *  is not; the viewer then reads live.et to know which it was. */
  onStartExtraTime: () => void;
  /** Round 504: a sub or a shape change at a minute of the half being played.
   *  Round 781: with how far into the board it was made, when it was. */
  onChange: (minute: number, change: LiveChange, plus?: number) => void;
  /** Round 504: tells the save where the clock stands (the interval, the
   *  page going hidden), so a reload resumes from there rather than from
   *  the last change. Never called on a tick. */
  onMark: (minute: number) => void;
}

const SPEEDS = [0.5, 1, 2, 4] as const;
/** Sim minutes per real second at 1x. 0.5 makes a match about three minutes. */
const BASE_RATE = 0.5;
/** Round 1101: the last stretch of a goal's action, from the ball in the net to the end of the action. */
const GOAL_HOLD_SPAN = ACTION_SPAN - NET_AT;
/** How long that stretch stays on screen, in real seconds, by speed: 2.5 at 1x to read the card, shorter
 *  the faster the match is being watched. A tap on the card always ends it. */
const GOAL_HOLD_SECONDS: Record<number, number> = { 0.5: 2.5, 1: 2.5, 2: 1.8, 4: 1.2 };
/** A line's place on the clock: its minute plus how far into the board it sits. */
const placeOf = (e: { minute: number; plus?: number }) => e.minute + (e.plus ?? 0);
/** A line the pitch can play out: a goal, a shot or a save. */
const isChance = (e: { kind: string }) => e.kind === 'goal' || e.kind === 'shot' || e.kind === 'save';
/** One line's key: what the banner effect remembers it by, and what the plan's start times are looked up by. */
const lineKey = (e: { kind: string; side: string; minute: number; plus?: number; text: string }) => `${e.kind}:${e.side}:${e.minute}${e.plus ? `+${e.plus}` : ''}:${e.text}`;
/* Round 1218 fix: a goal a review rules out is DRAWN before its review. The engine keeps no shot for it (it counts
   for nothing), so the pitch is handed one line in its place, by the man the review names at the review's minute.
   The plan stages it as a shot (what follows it is the defending side's restart, never a kick off) and the screen
   plays it as a goal (the ball goes in). Nothing else here reads it: not the score, not the stats, not a card. */
type RuledOutChance = LiveFeedEvent & { ruledOut: string };
/** A review that takes a goal away. */
const isRuledOut = (e: LiveFeedEvent): boolean => e.kind === 'var' && e.side !== 'none' && e.review?.incident === 'goal' && e.review.decision === 'disallowed';
/** How many clock places before the whistle a ruled out goal still has the room to be played with its ball in the
 *  net before the period ends (an action may start 0.9 after its place and the ball is in 0.756 after that). */
const RULED_OUT_ROOM = 2;
const ruledOutChance = (e: LiveFeedEvent): RuledOutChance => ({ minute: e.minute, ...(e.plus ? { plus: e.plus } : {}), side: e.side, kind: 'shot', text: e.text, ruledOut: e.review!.id });
/** The review a staged line stands for, or null for a line of the feed. */
const ruledOutOf = (e: object): string | null => (typeof (e as Partial<RuledOutChance>).ruledOut === 'string' ? (e as RuledOutChance).ruledOut : null);
/** The key the screen remembers that goal's action by. Its third field is the minute, like every fired key. */
const ruledOutKey = (e: LiveFeedEvent) => `ruledout:${e.side}:${e.minute}:${e.review?.id ?? ''}`;
/**
 * Round 1146: a goal as this screen announces it (the pill, the goal card and the list beside the pitch all
 * print these runs): the lead words, the scorer, the minute, then the mark a match report prints after it,
 * from the report's own function, so a penalty reads (P) here exactly where the full time report has it.
 */
export function goalSegs(lead: string, who: Seg, at: { minute: number; plus?: number }, marks: GoalMarks): Seg[] {
  const mark = scorerMark(marks);
  return [{ t: lead }, who, { t: ` ${minuteLabel(at)}` }, ...(mark ? [{ t: mark }] : [])];
}
/**
 * Round 1146: the goal card's own line. The card holds 296 px of text at every width, and "GOAL! Own goal, "
 * or "GOAL! Penalty, " in front of an ordinary name with its minute and its mark ran to 320 to 355, so the
 * ellipsis ate the mark and often the minute. On the card a goal that wears a mark therefore drops the words
 * the mark already says. The pill and the list beside the pitch have the room and keep the long form.
 */
export function cardSegs(segs: Seg[]): Seg[] {
  return segs.length > 3 ? [{ t: 'GOAL! ' }, ...segs.slice(1)] : segs;
}
/**
 * Round 1146: who a goal line names. An own goal names the man who put it in, and he plays for the OTHER
 * side, so that is the side his name is looked up on (`named` tags a made up man of the opposition). Kept
 * out of the component so a test can hold which side is asked: nothing else on the screen would notice.
 */
export function goalScorerSeg(e: { og?: boolean; text: string }, side: Side, who: Seg, named: (side: Side, name: string) => Seg): Seg {
  return e.og && e.text ? named(side === 'me' ? 'opp' : 'me', e.text) : who;
}
const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
/** The shape a nameless opposition lines up in: 4-4-2. */
const DEFAULT_OPP_FORMATION = 1;

const lastName = (n: string) => n.replace(' (Youth)', '').split(' ').slice(-1)[0];

function initialStage(live: LiveMatch | null, report: MatchWeekReport | null): Stage {
  if (report) return 'done';
  if (!live) return 'first';
  const m = live.minute ?? 0;
  if (live.et && m >= live.et.from) return 'extra';
  if (live.h2Drawn && m >= 46) return 'second';
  if (m >= 45) return 'interval';
  return 'first';
}

/**
 * Everyone on the grass at a minute, both sides, in slot order. A man sent
 * off, or down injured and not yet replaced, is not on it. After a sub the
 * new man is (that was the bug this round fixed: the dots never changed).
 */
function menAt(career: CareerState, live: LiveMatch | null, report: MatchWeekReport | null, minute: number, plus?: number, mineAt: number = minute): { mine: Man[]; theirs: Man[] } {
  /* Round 781: a red or an injury in the board takes its man off at its own plus, not at the minute's start. */
  /* Release AR: `minute` and `plus` are where the changes that come off the clock are read (their
     substitutions, a red card, a man going down), and the viewer holds them while a chance is playing.
     `mineAt` is the minute on the clock itself, for my own substitutions, which are on the grass at once. */
  const gone = playedBy(minute, plus);
  const mine: Man[] = [];
  const theirs: Man[] = [];
  /* The shape the eleven kicked off in, whatever the tactics tab says now. */
  const myFormation = FORMATIONS[live?.formationIndex ?? career.formationIndex] ?? FORMATIONS[0];
  if (live) {
    /* Round 548: minute + 1, so a change made AT the minute on the clock is on
       the pitch rather than one minute late. Tapping a dot pauses the clock, so
       a substitution from the pitch is filed at exactly the frozen minute, and
       myOnPitchAt's rule is strictly-after (he played that minute), which left
       the man who had just come off still standing there until you unpaused.
       My side only, deliberately: my substitutions are recorded when I make
       them, so nothing beyond the current minute exists, while the opponent's
       half is drawn ahead and reading theirs inclusively would show their
       change a minute before it happens. */
    const ids = myOnPitchAt(live, mineAt + 1);
    const numbers = squadNumbers(career, live);
    const goneIds = new Set<string>();
    for (const c of [...(live.h1Cards ?? []), ...(live.h2Cards ?? [])]) if (c.kind === 'red' && c.id && gone(c)) goneIds.add(c.id);
    for (const inj of [...(live.h1Injuries ?? []), ...(live.h2Injuries ?? [])]) if (inj.id && gone(inj)) goneIds.add(inj.id);
    ids.forEach((id, i) => {
      const slot = myFormation.slots[i];
      if (!slot || goneIds.has(id)) return;
      const p = career.squad.find(q => q.id === id);
      mine.push({ key: `m${i}`, slot, label: p ? lastName(p.name) : slot.label, name: p?.name, number: numbers.get(id) ?? i + 1, id, side: 'me' });
    });
    const oppFormation = FORMATIONS[live.oppFormationIndex ?? DEFAULT_OPP_FORMATION] ?? FORMATIONS[DEFAULT_OPP_FORMATION];
    if (live.oppXi) {
      const on = oppOnPitchAt(live, minute);
      const sentOff = new Set<string>();
      for (const c of [...(live.h1OppCards ?? []), ...(live.h2OppCards ?? [])]) if (c.kind === 'red' && gone(c)) sentOff.add(c.name);
      on.forEach((p, i) => {
        const slot = oppFormation.slots[i];
        if (!slot || sentOff.has(p.n)) return;
        const started = live.oppXi?.[i]?.n === p.n;
        const benchIdx = (live.oppBench ?? []).findIndex(b => b.n === p.n);
        theirs.push({ key: `o${i}`, slot, label: lastName(p.n), name: p.n, number: started ? i + 1 : 12 + Math.max(0, benchIdx), side: 'opp', gen: p.g });
      });
    } else {
      oppFormation.slots.forEach((slot, i) => theirs.push({ key: `o${i}`, slot, label: '', number: i + 1, side: 'opp' }));
    }
    return { mine, theirs };
  }
  /* A finished match drawn on its own: the report's elevens, nobody removed. */
  const xi = resolveXI(career);
  myFormation.slots.forEach((slot, i) => {
    const p = xi[i];
    mine.push({ key: `m${i}`, slot, label: p ? lastName(p.name) : slot.label, name: p?.name, number: i + 1, id: p?.id, side: 'me' });
  });
  const d = report?.detail;
  const oppFormation = FORMATIONS[d?.oppFormationIndex ?? DEFAULT_OPP_FORMATION] ?? FORMATIONS[DEFAULT_OPP_FORMATION];
  oppFormation.slots.forEach((slot, i) => {
    const p = d?.oppXi?.[i];
    theirs.push({ key: `o${i}`, slot, label: p ? lastName(p.n) : '', name: p?.n, number: i + 1, side: 'opp', gen: p?.g });
  });
  return { mine, theirs };
}

/**
 * Round 1101: the two counts on a goal card, as facts and nothing else. `nth` is how many this scorer has
 * in this match up to and including this goal, counted off the feed. `season` is for one of my players
 * only: his league and cup goals this season with this one in, which is the count the squad row will show
 * once the match is settled (the engine credits a match's scorers at settlement, so the save holds his
 * season up to kick off and the feed holds the rest). Null when the scorer is not in my squad by name.
 */
export function goalCardCount(career: CareerState, feed: LiveFeedEvent[], goal: LiveFeedEvent): { nth: number; season: number | null } {
  /* Round 1146: an own goal is nobody's goal, so its card counts nothing: no "2nd of the match", no season. */
  if (goal.og) return { nth: 1, season: null };
  const upTo = feed.indexOf(goal);
  const nth = feed.filter((e, i) => e.kind === 'goal' && !e.og && e.side === goal.side && e.text === goal.text && (upTo < 0 || i <= upTo)).length;
  const player = goal.side === 'me' ? career.squad.find(p => p.name === goal.text) : undefined;
  return { nth, season: player ? (player.seasonGoals ?? 0) + nth : null };
}

/**
 * Round 1101: whose name is drawn above his figure instead of under it. A name sits just under its figure,
 * which is exactly where the next man and his name are when two stand close, so the name of the one in
 * front goes up out of the way: another figure within LABEL_ACROSS units across and 0 to LABEL_BELOW units
 * below him. Two men level with each other take one each (the later key keeps his under). A pure function
 * of the frame. The brief drew the rule at 7 across, which keeps a name off the next FIGURE; a name is up to
 * 52 px wide, 13 units of a phone's pitch, so two names still ran into each other between 7 and 12.
 */
const LABEL_ACROSS = 12;
const LABEL_BELOW = 6;
/** Two men within this much of each other along the pitch are level: their names would be on one line. */
const LABEL_LEVEL = 2.5;
export function labelsAbove(figures: { key: string; x: number; y: number }[]): Set<string> {
  const up = new Set<string>();
  for (const a of figures) {
    if (figures.some(b => b !== a && Math.abs(b.x - a.x) < LABEL_ACROSS
      && (b.y - a.y > 0 || (b.y === a.y && b.key > a.key)) && b.y - a.y <= LABEL_BELOW)) up.add(a.key);
  }
  /* Men standing level and close (a free kick's wall, two of a back line, a striker and his marker) are
     neither in front of the other, so the rule above can leave their names side by side on one line, or
     send both up. Going across the pitch, a man with nobody just under him takes the other place from
     his nearest level neighbour's. */
  const under = (a: { x: number; y: number }) => figures.some(b => Math.abs(b.x - a.x) < LABEL_ACROSS && b.y - a.y > 0 && b.y - a.y <= LABEL_BELOW);
  const across = [...figures].sort((a, b) => a.x - b.x || (a.key < b.key ? -1 : 1));
  for (let i = 1; i < across.length; i++) {
    const a = across[i];
    for (let j = i - 1; j >= 0 && a.x - across[j].x < LABEL_ACROSS; j--) {
      const b = across[j];
      if (Math.abs(b.y - a.y) > LABEL_LEVEL) continue;
      if (up.has(a.key) === up.has(b.key) && !under(a)) { if (up.has(a.key)) up.delete(a.key); else up.add(a.key); }
      break;
    }
  }
  return up;
}
/** Round 1101: who shows his number without his name for now. Three or more men level and shoulder to
 *  shoulder (a free kick's wall) have no room for three names in any two rows, so each shows his number
 *  until they break. So does a man in a crowd: with three or more others inside the room his own name and
 *  the next one would need (a corner coming in, a scramble in the area) the names print through each other
 *  whichever row each takes, worst on a 320 px phone. A pure function of the frame. */
const LABEL_WALL = 8;
const LABEL_CROWD = 3;
export function labelsShort(figures: { key: string; x: number; y: number }[]): Set<string> {
  const short = new Set<string>();
  for (const a of figures) {
    const wall = figures.filter(b => b !== a && Math.abs(b.x - a.x) < LABEL_WALL && Math.abs(b.y - a.y) <= LABEL_LEVEL).length >= 2;
    const crowd = figures.filter(b => b !== a && Math.abs(b.x - a.x) < LABEL_ACROSS && Math.abs(b.y - a.y) <= LABEL_BELOW).length >= LABEL_CROWD;
    if (wall || crowd) short.add(a.key);
  }
  return short;
}

/** Round 1101: a window that is wide and short, a phone on its side. The stylesheet asks the same question
 *  of the same two numbers: (orientation: landscape) and (max-height: 499px). */
const isSideways = (width: number, height: number) => width >= height && height <= 499;

/** Round 1101: a 32 bit hash of a string, the pitch's seed. Nothing in this file draws a random number. */
function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/**
 * Round 1101: everything the shared pitch needs to draw one period of this match, as plain data.
 * The viewer calls it and the harness calls it, so no test rebuilds the mapping by hand. It reads
 * the committed match and decides nothing: the feed is liveFeed(live), cut to the period.
 *
 * The figures are roles and slots (what the old placement read off each man), the span runs from
 * where the period's clock starts to the end of its board, and the share of the ball is the
 * period's own (possH1, possH2), which is constant for the stage: the running stat on the counter
 * moves every minute and would re-roll who has the ball for the whole plan each time.
 *
 * `openedAt` is where the clock stood when the screen opened on a match already under way. A chance
 * before it is never played here (the viewer opens after it), so it is left out of what the pitch
 * stages, and the first chance the viewer does play is not made to wait for one nobody saw.
 */
export function stagePitchInput(
  career: CareerState, live: LiveMatch | null, report: MatchWeekReport | null, stage: Stage, minute: number, plus: number | undefined, stageStop: number,
  openedAt = 0, mineAt: number = minute, settledReviews?: ReadonlySet<string>,
): PitchInput {
  const men = menAt(career, live, report, minute, plus, mineAt);
  const mentality: Mentality = live?.mentality ?? career.mentality;
  const figure = (m: Man): PitchFigure => {
    const f: PitchFigure = { key: m.key, line: pitchLineOf(m.slot), slot: slotPosition(m.slot, m.side === 'me' ? mentality : 'balanced') };
    if (m.name !== undefined) f.name = m.name;
    return f;
  };
  const mine = men.mine.map(figure);
  const theirs = men.theirs.map(figure);
  const seed = seedOf(`${career.clubName}:${live?.week ?? 0}:${stage}`);
  if (!live || (stage !== 'first' && stage !== 'second' && stage !== 'extra')) {
    /* The interval, and a finished match drawn off its report: nothing is left to play, so the pitch
       holds the kick off shape for one beat. */
    return { mine, theirs, feed: [], span: { from: stageStop, to: stageStop + BEAT_SPAN }, kickoffs: [{ at: stageStop, side: 'me' }], possession: 0.5, seed };
  }
  const lo = stage === 'first' ? 0 : stage === 'extra' ? 91 : 46;
  const hi = stage === 'first' ? 45 : stage === 'extra' ? live.et?.to ?? 120 : 90;
  const from = stage === 'first' ? 0 : stage === 'extra' ? 90 : 46;
  /* Whoever kicked off the match kicks off extra time, and the other side the second half. */
  const first: PitchSide = live.home === false ? 'opp' : 'me';
  const kicking: PitchSide = stage === 'second' ? (first === 'me' ? 'opp' : 'me') : first;
  const share = stage === 'first' ? live.possH1 : live.possH2 ?? live.possH1;
  return {
    mine, theirs,
    feed: liveFeed(live).filter(e => e.kind !== 'halftime' && e.minute >= lo && e.minute <= hi
      && !(isChance(e) && placeOf(e) < openedAt)
      && (!settledReviews || !cmVarEventWaiting(e, liveFeed(live), settledReviews)))
      /* Round 1218 fix: the goal a review rules out is staged like any chance, whether its review has been shown
         or not (so the plan does not change under the review), unless the viewer opened after it or it comes
         too late in the period to be played out before the whistle. */
      .map(e => (isRuledOut(e) && placeOf(e) >= openedAt && placeOf(e) <= stageStop - RULED_OUT_ROOM ? ruledOutChance(e) : e)),
    span: { from, to: Math.max(from + BEAT_SPAN, stageStop) },
    kickoffs: [{ at: from, side: kicking }],
    possession: (share ?? 50) / 100,
    seed,
  };
}

/** Round 1101: the "?" on the match. It is in the DOM only while its panel is open. */
function LiveMatchHelp({ onClose, reviews }: { onClose: () => void; reviews?: boolean }) {
  return (
    <div data-cm-live-help="1" className="bg-card border border-border rounded-2xl p-3 text-left">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">Watching the match</h3>
        <button type="button" onClick={onClose} aria-label="Close the help" className="w-11 h-11 shrink-0 rounded-lg border border-border bg-background flex items-center justify-center text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="mt-1 space-y-1.5 text-xs text-muted-foreground list-disc pl-4">
        <li>The half you are watching has already been played by the game. You are seeing it back minute by minute.</li>
        <li>Every goal, shot, save, corner, throw in, foul and card is the real one, at its real minute. The passing and running in between is drawn to fit them.</li>
        <li>{reviews ? 'The score changes when the ball is in the net, not before. A penalty a review gives waits for the review first.' : 'The score changes when the ball is in the net, not before.'}</li>
        <li>A goal marked (P) was a penalty. A goal marked (O.G) is an own goal: it counts for the club it is listed under, and the man named put it into his own net.</li>
        {reviews && <li>VAR here reviews goals and penalties only, and you only see a review that changed the call. A goal that gets ruled out goes in first: the check opens with the ball in the net, the score does not move, and it adds no scorer or shot stats. A foul the referee missed can become a penalty, and that kick can go in, be saved or miss.</li>}
        <li>Tap one of your players to make a sub or change shape. Everything up to that minute stays. The rest of the half is played again with your change.</li>
        <li>Pause, pick a speed, or Skip to the whistle. Tap a goal card to move on.</li>
      </ul>
      <p className="mt-2 text-xs text-foreground">
        <span className="font-bold">Worked example: </span>
        {"It is 0-0 at 61'. You tap your striker, bring on fresh legs and go Attacking. The first 61 minutes stay exactly as they were. From 62' the half is played again with your change, and that new half is what you watch next."}
      </p>
      {reviews && <p className="mt-2 text-xs text-foreground"><span className="font-bold">VAR example: </span>At 0-0 the ball goes in, a check opens and the goal is ruled out. It stays 0-0 and nobody gets a goal. If a review gives a penalty and the kick misses, it still stays 0-0.</p>}
    </div>
  );
}

function fitnessTone(f: number): string {
  if (f >= 78) return 'text-emerald-400';
  if (f >= 62) return 'text-yellow-400';
  return 'text-destructive';
}

/** One stat, mine left and theirs right, the way every stats block on this game reads. */
function StatCell({ label, mine, theirs }: { label: string; mine: string; theirs: string }) {
  return (
    <div className="flex items-center justify-between gap-1 text-[10px] min-w-0" data-cm-live-stat={label}>
      <span className="font-bold text-foreground tabular-nums shrink-0">{mine}</span>
      <span className="text-[8px] uppercase tracking-wider text-muted-foreground truncate">{label}</span>
      <span className="font-bold text-muted-foreground tabular-nums shrink-0">{theirs}</span>
    </div>
  );
}

/**
 * The live stats strip: possession both ways, shots (on target), expected
 * goals, corners and fouls, counted off the committed play at this minute.
 * Three short rows, so a 390 wide phone never scrolls sideways.
 */
function LiveStats({ stats, counts, clubName, opponent }: { stats: MatchStats | null; counts: CardsAndSubs | null; clubName: string; opponent: string }) {
  const poss = stats ? Math.round(stats.possession) : 50;
  return (
    <div className="bg-card border border-border rounded-xl p-2.5" data-cm-live-stats="1">
      <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
        <span className="text-primary normal-case font-bold truncate">{clubName}</span>
        <span className="shrink-0">Balance of play</span>
        <span className="normal-case font-bold truncate">{opponent}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-primary tabular-nums w-8 shrink-0" data-cm-live-poss="mine">{poss}%</span>
        <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-secondary">
          <div className="bg-primary" style={{ width: `${poss}%`, transition: 'width 0.8s' }} />
          <div className="bg-muted-foreground/40" style={{ width: `${100 - poss}%` }} />
        </div>
        <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-8 shrink-0 text-right" data-cm-live-poss="theirs">{100 - poss}%</span>
      </div>
      <div className="mt-1.5">
        <StatCell
          label="Shots (on target)"
          mine={stats ? `${stats.shots} (${stats.onTarget})` : '-'}
          theirs={stats ? `${stats.oppShots} (${stats.oppOnTarget})` : '-'}
        />
      </div>
      <div className="grid grid-cols-3 gap-x-3 mt-1">
        <StatCell label="xG" mine={stats ? stats.xg.toFixed(2) : '-'} theirs={stats ? stats.oppXg.toFixed(2) : '-'} />
        <StatCell label="Corners" mine={stats ? String(stats.corners) : '-'} theirs={stats ? String(stats.oppCorners) : '-'} />
        <StatCell label="Fouls" mine={stats ? String(stats.fouls) : '-'} theirs={stats ? String(stats.oppFouls) : '-'} />
      </div>
      {/* Round 714: keeper saves off the same play, and both dugouts' bookings
          and changes off their committed lines, at this minute. */}
      <div className="grid grid-cols-4 gap-x-2 mt-1" data-cm-live-extra="1">
        <StatCell
          label="Saves"
          mine={stats?.saves !== undefined ? String(stats.saves) : '-'}
          theirs={stats?.oppSaves !== undefined ? String(stats.oppSaves) : '-'}
        />
        <StatCell label="Yellow" mine={counts ? String(counts.yellows) : '-'} theirs={counts ? String(counts.oppYellows) : '-'} />
        <StatCell label="Red" mine={counts ? String(counts.reds) : '-'} theirs={counts ? String(counts.oppReds) : '-'} />
        <StatCell label="Subs" mine={counts ? String(counts.subs) : '-'} theirs={counts ? String(counts.oppSubs) : '-'} />
      </div>
    </div>
  );
}

export function LiveSimScreen({
  career, live, report, clubColor, onSub, onShape, onTalk, onSecondHalf, onExit, onStartSecondHalf, onStartExtraTime, onChange, onMark,
}: LiveSimScreenProps) {
  /* The clock and the stage come off the save, so a match closed at the 30th
     minute opens again at the 30th. No randomness in here. */
  const [stage, setStage] = useState<Stage>(() => initialStage(live, report));
  const [clock, setClock] = useState<number>(() => (report ? report.detail?.et?.to ?? 90 : live?.minute ?? 0));
  const openedAt = useRef(clock);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  /* Round 1101: match mode. One panel at a time, the kicks of a shootout open by themselves at the
     whistle, and Back folds the whole screen away to a small card in the page. */
  const [panel, setPanel] = useState<Panel | null>(() => (report?.shootout ? 'kicks' : null));
  const [collapsed, setCollapsed] = useState(false);
  const pausedBeforeBack = useRef(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [eventLine, setEventLine] = useState<Seg[] | null>(null);
  const [motionEvent, setMotionEvent] = useState<MotionEvent | null>(null);
  /* Round 1101: the goal sequence. The moment is set beside the motion when a goal fires on time; the
     hold rate is read by the clock's own frame, and the render sets it. */
  const [goalMoment, setGoalMoment] = useState<GoalMoment | null>(null);
  const [reviewEvent, setReviewEvent] = useState<LiveFeedEvent | null>(null);
  const [settledReviews, setSettledReviews] = useState<Set<string>>(() => cmVarPlayedReviewIds(live ? liveFeed(live) : [], clock, stage));
  const reviewCap = useRef(Infinity);
  const holdRate = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReducedMotion(media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  /* A phone on its side (a window wider than it is tall, and short): the pitch is drawn on its side too, 'me'
     attacking right, beside the strip and the controls, instead of an upright pitch squashed into the height
     that is left. Read off the window's own size, the way the stylesheet's query reads it. */
  const [sideways, setSideways] = useState(() => typeof window !== 'undefined' && isSideways(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const sized = () => setSideways(isSideways(window.innerWidth, window.innerHeight));
    sized();
    window.addEventListener('resize', sized);
    return () => window.removeEventListener('resize', sized);
  }, []);
  const orientation = sideways ? 'landscape' : 'portrait';
  /* Every stage change ends whatever was playing: a goal's card never rises in the wrong half, and an
     action that fired late (Skip) is not replayed when the next period opens. */
  const clearAction = () => { setMotionEvent(null); setGoalMoment(null); setReviewEvent(null); };
  const [picking, setPicking] = useState<string | null>(null);
  /* Round 670 review: the clock reached 90 and the engine has been asked
     about extra time; the next render reads its answer off the live match. */
  const [askedAt90, setAskedAt90] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);
  const pausedBefore = useRef(false);
  /* The whistle takes the live match off the save in the same tick the report
     lands, so the last one seen keeps the pitch drawn at the whistle until then. */
  const lastLive = useRef<LiveMatch | null>(live);
  useEffect(() => { if (live) lastLive.current = live; }, [live]);
  const liveNow = live ?? lastLive.current;

  /* Round 670: where the stage being played ends on the clock, and where the
     match ended: 120 when there was extra time, 90 otherwise. */
  const stageEnd = stage === 'first' ? 45 : stage === 'extra' ? liveNow?.et?.to ?? 120 : 90;
  /* Round 781: the board on the period being played, and where its clock
     stops. A live match drawn before this round carries no board and stops
     on the minute, as it always did. */
  const board = stage === 'first' ? liveNow?.added?.h1 ?? 0 : stage === 'second' ? liveNow?.added?.h2 ?? 0 : stage === 'extra' ? liveNow?.added?.et ?? 0 : 0;
  const stageStop = stageEnd + board;
  const endMinute = report?.detail?.et?.to ?? 90;
  const minute = stage === 'done' ? endMinute : stage === 'interval' ? 45 : Math.min(stageEnd, Math.floor(clock));
  /* Round 781: how far into the board the clock stands while a period is
     being played; undefined at the break and the end, where the whole minute
     counts, board included. */
  const plus = stage === 'first' || stage === 'second' || stage === 'extra' ? Math.max(0, Math.min(stageStop, Math.floor(clock)) - stageEnd) : undefined;
  const mentality: Mentality = liveNow?.mentality ?? career.mentality;
  const opponent = liveNow?.opponent ?? (report ? (report.home === career.clubName ? report.away : report.home) : '');
  const compLabel = liveNow?.compLabel ?? report?.compLabel ?? '';
  const finalMy = report ? (report.home === career.clubName ? report.homeGoals : report.awayGoals) : null;
  const finalOpp = report ? (report.home === career.clubName ? report.awayGoals : report.homeGoals) : null;
  const running = stage === 'first' || stage === 'second' || stage === 'extra';
  /* Round 670 review: no change while the engine is answering at 90. */
  const canChange = running && !finished && !reviewEvent && !(stage === 'second' && askedAt90) && !!liveNow;

  /* ---- the truth this walk goes through ---- */
  const feed: LiveFeedEvent[] = useMemo(() => (liveNow ? liveFeed(liveNow) : []), [liveNow]);
  const nextReview = feed.find(e => e.kind === 'var' && e.review && !settledReviews.has(e.review.id)
    && e.minute >= (stage === 'first' ? 0 : stage === 'extra' ? 91 : 46) && e.minute <= stageEnd
    && placeOf(e) >= openedAt.current);
  /* Round 1218 fix: WHEN that review opens is worked out further down, where the plan of the period is known
     (see "when a review opens"): it reads what the pitch is playing, so a card never opens over an action. */
  /* Round 781: the whistle goes at the end of the board, and the last action is the one deepest in it. */
  const terminalMinute = stageStop;
  // The last action at the whistle gets its wind-up before the clock reaches it.
  // Feed order gives a goal priority over another chance at the same minute.
  const terminalAction = useMemo(() => [...feed].reverse().find(e => e.minute === stageEnd && (e.plus ?? 0) === board
    && (e.kind === 'goal' || e.kind === 'shot' || e.kind === 'save')
    && !cmVarEventWaiting(e, feed, settledReviews)), [feed, stageEnd, board, settledReviews]);
  const terminalWindup = !!terminalAction && clock >= terminalMinute - 1.05 && clock < terminalMinute;
  useEffect(() => {
    if (!running || finished || !terminalWindup || !terminalAction) return;
    const at = terminalMinute - 1.05;
    const key = `${terminalAction.kind}:${terminalAction.side}:${terminalAction.minute}:${terminalAction.text}`;
    setMotionEvent(current => current?.event === terminalAction && current.at === at
      ? current : { event: terminalAction, key, at });
  }, [running, finished, terminalWindup, terminalAction, terminalMinute]);

  /* Round 505: the feed carries a name and a minute per event, so the flank
     of a corner, a saved penalty, and a goal from the spot or a direct free
     kick are read back off the committed play and the goal lines the feed
     was built from, keyed the way the feed keys them. */
  type Extra = { flank?: 'left' | 'right'; penalty?: boolean; freeKick?: boolean };
  const extras = useMemo(() => {
    const m = new Map<string, Extra>();
    if (!liveNow) return m;
    for (const e of [...(liveNow.h1Play ?? []), ...(liveNow.h2Play ?? [])]) {
      if (e.kind === 'corner' && e.flank) m.set(`corner:${e.side}:${e.minute}:${e.who}`, { flank: e.flank });
      else if (e.kind === 'shot' && e.on && !e.goal && e.penalty) m.set(`save:${e.side}:${e.minute}:${e.who}`, { penalty: true });
    }
    for (const g of [...(liveNow.h1My ?? []), ...(liveNow.h2My ?? [])]) {
      if (g.penalty || g.freeKick) m.set(`goal:me:${g.minute}:${g.name}`, { penalty: g.penalty, freeKick: g.freeKick });
    }
    for (const g of [...(liveNow.h1Opp ?? []), ...(liveNow.h2Opp ?? [])]) {
      if (g.penalty || g.freeKick) m.set(`goal:opp:${g.minute}:${g.name}`, { penalty: g.penalty, freeKick: g.freeKick });
    }
    return m;
  }, [liveNow]);
  /* Round 505: the armband, worn on the dot while he is out there. */
  const captainId = career.setPieces?.captain ?? null;

  /* A save paused at the interval before the scorer lines existed: the honest
     fallback is skipping the first half's animation for that one match. */
  const canAnimateH1 = !!liveNow && liveNow.h1My !== undefined && liveNow.h1Opp !== undefined;
  useEffect(() => {
    if (stage === 'first' && !canAnimateH1) setClock(45);
  }, [stage, canAnimateH1]);

  /* ---- score on the clock ---- */
  /* Round 781: a line has happened when its period is over, or when its clock
     position (its minute plus how far into the board it sits) is behind the
     clock, so a goal at 90+3 lands at 90+3 and not at 90. */
  const STAGE_RANK: Record<Stage, number> = { first: 0, interval: 0.5, second: 1, extra: 2, done: 3 };
  const periodRank = (m: number): number => (m <= 45 ? 0 : m <= 90 ? 1 : 2);
  const happened = (e: { minute: number; plus?: number }): boolean => {
    const r = periodRank(e.minute);
    return r < STAGE_RANK[stage] || (r === STAGE_RANK[stage] && e.minute + (e.plus ?? 0) <= clock);
  };
  const goalsAt = (side: Side) => feed.filter(e => e.kind === 'goal' && e.side === side && happened(e) && !cmVarEventWaiting(e, feed, settledReviews)).length;
  const myGoalsNow = stage === 'done' && finalMy !== null ? finalMy : goalsAt('me');
  const oppGoalsNow = stage === 'done' && finalOpp !== null ? finalOpp : goalsAt('opp');
  /* Round 781: on the second leg of a two legged tie, the first leg and the
     running aggregate in my orientation, off the engine (secondLegContext)
     while it is on and off the report's own tie line once it is over. */
  const legCtx = useMemo(() => {
    const t = report?.tie;
    if (t && t.leg === 2 && t.leg1Mine !== undefined && t.leg1Theirs !== undefined) {
      return { leg1Mine: t.leg1Mine, leg1Theirs: t.leg1Theirs, leg1Home: !!t.leg1Home, aggMine: t.aggMine, aggTheirs: t.aggTheirs };
    }
    return liveNow ? secondLegContext(career, liveNow.week, myGoalsNow, oppGoalsNow) : null;
  }, [report, career, liveNow, myGoalsNow, oppGoalsNow]);

  /* ---- stats at this minute, the report's own function ---- */
  const stats: MatchStats | null = useMemo(() => {
    if (stage === 'done' && report?.detail) return report.detail.stats;
    if (liveNow) {
      const visible = liveNow.varReviews ? { ...liveNow,
        h1Play: liveNow.h1Play?.filter(e => !cmVarPlayWaiting(e, feed, settledReviews)),
        h2Play: liveNow.h2Play?.filter(e => !cmVarPlayWaiting(e, feed, settledReviews)),
      } : liveNow;
      return liveStatsAt(visible, minute, plus);
    }
    return report?.detail?.stats ?? null;
  }, [stage, report, liveNow, minute, plus, feed, settledReviews]);
  /* Round 714: bookings and changes at this minute, off the committed lines. */
  const counts: CardsAndSubs | null = useMemo(() => {
    if (stage === 'done' && report?.detail) {
      const lines = reportLines(report.detail);
      return lines ? cardsAndSubsAt(lines, endMinute) : null;
    }
    if (liveNow) return cardsAndSubsAt(liveLines(liveNow), minute, plus);
    return null;
  }, [stage, report, liveNow, minute, plus, endMinute]);

  /* ---- the clock: BASE_RATE sim minutes per real second, times speed ---- */
  useEffect(() => {
    if (paused || !running || finished || reviewEvent) { lastTs.current = null; return; }
    const cap = stageStop;
    const step = (ts: number) => {
      if (lastTs.current === null) lastTs.current = ts;
      const dt = Math.min(0.25, (ts - lastTs.current) / 1000);
      lastTs.current = ts;
      /* Round 1101: while a goal's card is up the clock all but stops, at every speed. */
      /* Round 1218 fix: a review holds the clock where it opens, and never sets it back. */
      setClock(c => Math.min(cap, Math.max(c, reviewCap.current), holdRate.current > 0 ? c + dt * holdRate.current : c + dt * BASE_RATE * speed));
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [paused, running, finished, stage, speed, stageStop, reviewEvent]);

  /* Stage transitions off the clock. The whistle is called exactly once.
     Round 781: at the end of each period's board, not on its last minute. */
  useEffect(() => {
    if (stage === 'first' && clock >= stageStop) {
      setClock(45);
      setStage('interval');
      clearAction();
      setPicking(null);
      setEventLine(null);
      /* The save stands at the break now, so a reload opens the dressing room. */
      onMark(45);
    }
    if (stage === 'second' && clock >= stageStop && !finishedRef.current) {
      /* Round 670: the engine says whether a level decider goes on, and the
         page never decides football.
         Round 670 review: it is asked on the LATEST save, not on the career
         this render was given. A change landing at 89 or 90 can still be on
         its way to the save when the clock gets here, so a question asked of
         this render's career could say level when the score had just moved,
         and the viewer ran thirty empty minutes badged ET into a report with
         no extra time. So the ninetieth minute asks once (the hook draws extra
         time on the latest save, or leaves it alone), and the render that
         follows, which carries that answer, reads it off live.et. */
      if (!askedAt90) {
        setClock(stageStop);
        setPicking(null);
        setAskedAt90(true);
        onStartExtraTime();
        return;
      }
      if (liveNow?.et) {
        setStage('extra');
        clearAction();
        /* Round 781: extra time's clock starts at 90, past the second half's board. */
        setClock(90);
        /* Round 670 polish: a second leg is level on the aggregate, and the
           night's score beside the banner often is not, so the engine says
           which (and gives the aggregate) rather than a line typed here. */
        setBanner({ segs: [{ t: 'Extra time' }], club: extraTimeCall(career, liveNow), tone: 'none' });
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        bannerTimer.current = setTimeout(() => setBanner(null), 2600);
        return;
      }
      finishedRef.current = true;
      setFinished(true);
      onSecondHalf();
    }
    if (stage === 'extra' && clock >= stageStop && !finishedRef.current) {
      finishedRef.current = true;
      setFinished(true);
      setClock(stageStop);
      setPicking(null);
      onSecondHalf();
    }
  }, [clock, stage, stageStop, askedAt90, liveNow, career, onSecondHalf, onStartExtraTime, onMark]);

  /* Where the clock stands goes to the save when the page is hidden or
     leaves (a tab switch, the app going to the background, a reload), never
     on a tick: every career write is a localStorage write. The ref keeps the
     listener off the clock's own dependency list. */
  const clockRef = useRef(clock);
  /* Round 781: capped at the period's last minute, so a save hidden at 90+2
     stands at 90 and resumes through its board, and the save's own clock
     stays in minutes the engine knows. */
  useEffect(() => { clockRef.current = Math.min(stageEnd, clock); }, [clock, stageEnd]);
  useEffect(() => {
    if (!running || finished || !live) return;
    const mark = () => onMark(Math.floor(clockRef.current));
    const onVisibility = () => { if (document.visibilityState === 'hidden') mark(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', mark);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', mark);
    };
  }, [running, finished, live, onMark]);

  /* Round 543: the listeners above only fire when the DOCUMENT goes away, and
     a router navigation is not that. Tapping Back, or the DoUKnowBall logo, or
     any nav link unmounts this viewer with the document still very much alive,
     so the minute was thrown away and "Resume match" replayed the half from
     minute 1. A player reported it as the watch mode needing fixing.

     It has to be its own effect with an empty dependency list, because the
     cleanup of the effect above runs on every change of running, finished,
     live or onMark, and marking the clock there would write the career on
     every one of them. Everything this cleanup reads goes through a ref for
     the same reason. */
  const runningRef = useRef(running);
  const liveRef = useRef(live);
  const onMarkRef = useRef(onMark);
  useEffect(() => {
    runningRef.current = running;
    liveRef.current = live;
    onMarkRef.current = onMark;
  });
  useEffect(() => () => {
    if (runningRef.current && !finishedRef.current && liveRef.current) {
      onMarkRef.current(Math.floor(clockRef.current));
    }
  }, []);

  /* The report is the match settled: full time, whatever the clock says. */
  useEffect(() => {
    if (report && stage !== 'done') {
      setStage('done');
      clearAction();
      setClock(report.detail?.et?.to ?? 90);
      setPicking(null);
      setEventLine(null);
      /* Round 1101: a match settled on penalties opens its kicks at the whistle. */
      setPanel(report.shootout ? 'kicks' : null);
    }
  }, [report, stage]);

  /* A change at minute M redraws everything after M, so anything fired past
     it is forgotten and the redrawn half fires fresh. */
  const firedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!live) return;
    const m = live.minute ?? 0;
    for (const k of [...firedRef.current]) {
      const at = Number(k.split(':')[2]);
      if (Number.isFinite(at) && at > m) firedRef.current.delete(k);
    }
  }, [live]);

  /* ---- who is on the grass at this minute ---- */
  /* Release AR: a chance is played out by the men it started with. A change that comes off the clock (the
     other dugout's substitution, a red card, a man going down) used to come onto the grass at its whole
     minute whatever was playing, and the part drops an action when the line up under it changes. So a goal
     still on its way at that minute lost its net and its card and the score changed with the ball in the
     air: every goal that waited its turn behind the chance of the minute before (it starts 0.3 into its
     minute behind a shot or a save and later behind a goal, so its ball is in just past the next whole
     minute) when their change was made in the goal's own minute, or a man was sent off or went down in the
     one after. The browser walk met exactly that at 79'. And any goal with such a change lost the end of
     its card. The change now waits for the action to end, ACTION_SPAN at most. Its line under the pitch
     and on the list is told at its own minute as before, and a change of mine is still on the grass at once
     (the rest of the half is drawn again then, and an action under it is rightly dropped). */
  // A tactics change can replace a future terminal chance during its wind-up.
  // Round 781: "already happened" reads the board too, so a chance at 45+3 is still future at 45+2.
  const motionStillCommitted = !motionEvent || motionEvent.event.minute + (motionEvent.event.plus ?? 0) <= clock || feed.includes(motionEvent.event);
  const liveAction = running && !finished && motionStillCommitted ? motionEvent : null;
  /* Never from before the viewer opened: a last kick's wind up starts 1.05 before the whistle whenever the
     screen opens, and a match opened again inside it shows the men of the minute it opened at. */
  const castFrom = liveAction && clock >= liveAction.at && clock - liveAction.at <= ACTION_SPAN ? Math.max(liveAction.at, openedAt.current) : null;
  const castMinute = castFrom === null ? minute : Math.min(stageEnd, Math.floor(castFrom));
  const castPlus = castFrom === null ? plus : Math.max(0, Math.min(stageStop, Math.floor(castFrom)) - stageEnd);
  const men = useMemo(() => menAt(career, liveNow, report, castMinute, castPlus, minute), [career, liveNow, report, castMinute, castPlus, minute]);

  /* The keeper of a side at a minute, for the save line. */
  const keeperOf = (side: Side, m: number): Seg => {
    if (!liveNow) return { t: side === 'me' ? `${career.clubName} keeper` : `${opponent} keeper` };
    if (side === 'me') {
      const ids = myOnPitchAt(liveNow, m);
      const ps = ids.map(id => career.squad.find(p => p.id === id)).filter((p): p is CMPlayer => !!p);
      const gk = ps.find(p => p.position === 'GK') ?? ps[0];
      return { t: gk ? gk.name : `${career.clubName} keeper` };
    }
    const on = oppOnPitchAt(liveNow, m);
    const gk = on.find(p => p.p === 'GK') ?? on[0];
    return gk ? { t: gk.n, gen: gk.g } : { t: `${opponent} keeper` };
  };
  /* The feed carries names only, so a made up man in their eleven or on
     their bench is looked up here. Nobody real ever gets the tag: it is
     only ever true on a line the engine wrote as made up. */
  const oppGen = (name: string): boolean => !!liveNow
    && [...(liveNow.oppXi ?? []), ...(liveNow.oppBench ?? [])].some(p => p.n === name && !!p.g);
  /* One name as a segment, tagged when it is the other side's made up man. */
  const named = (side: Side, name: string): Seg => (side === 'opp' && oppGen(name) ? { t: name, gen: true } : { t: name });

  /* ---- the plan of this period on the shared pitch (Round 1101) ----
     This period's feed staged once: open play on a keyed generator, and every chance, kick off and dead
     ball of the feed. It is rebuilt only when what it reads changes (a sub, a red card, a redraw), never
     on a tick, and the scene only when the clock crosses into the plan's next stretch. */
  const pitchInput = useMemo(
    () => stagePitchInput(career, liveNow, report, stage, castMinute, castPlus, stageStop, openedAt.current, minute, settledReviews),
    [career, liveNow, report, stage, castMinute, castPlus, stageStop, minute, settledReviews],
  );
  const pitchKey = useMemo(() => JSON.stringify(pitchInput), [pitchInput]);
  // The key is the input's whole content, so the plan survives a minute tick that changed nothing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => pitchPlan(pitchInput), [pitchKey]);
  /* When each chance the pitch plays really starts. The plan plays one action at a time, so a chance in the
     minute after another waits its turn inside its own minute, and its line is announced when it starts. */
  const startAt = useMemo(() => new Map(plan.actions.filter(a => ruledOutOf(a.event) === null).map(a => [lineKey(a.event), a.at])), [plan]);
  /* Round 1218 fix: and when the goal a review rules out is played, by its review. */
  const ruledOutAt = useMemo(() => new Map(plan.actions.flatMap(a => { const id = ruledOutOf(a.event); return id === null ? [] : [[id, a.at] as [string, number]]; })), [plan]);
  /* When a line is told: at its place on the clock, or for a chance that waits, when its action starts.
     (The last kick of a period is wound up BEFORE its place, and is still told at its place.) */
  const firesAt = (e: LiveFeedEvent): number => Math.max(placeOf(e), startAt.get(lineKey(e)) ?? 0);

  /* Round 1101: which lines get their action on the pitch. Written once: the banner effect starts the
     motion with it, and the score that waits for the ball reads it. The last kick of a period is not one
     of them (it has its wind up before the whistle), nor anything before the minute this screen opened at,
     nor a chance the plan does not stage (of two at one place only the later line is played). */
  const playsOut = (e: LiveFeedEvent): boolean => {
    const terminal = e.minute === stageEnd && (e.plus ?? 0) === board;
    return !terminalWindup && !terminal && placeOf(e) >= openedAt.current && isChance(e) && startAt.has(lineKey(e));
  };

  /* ---- when a review opens (Round 1218 fix) ----
     A review used to open 0.05 before its minute whatever the pitch was doing: over a goal of the minute before
     that was still in the air (a chance may start 0.9 after its place and plays for 1.05), with the score not
     moved yet, so a card reading "goal ruled out" sat on a goal that then counted. And a goal a review ruled
     out was never drawn at all. Now:
       a ruled out goal is played first, and its review opens with the ball in the net;
       any other review (a penalty a review gives) opens at its own minute, so the foul is told first;
       no review opens while another action is still playing: it waits for that action to end;
       one due inside the last kick's wind up opens just before the wind up, and every review opens before
       the whistle of its period. */
  const nextRuledOutKey = nextReview && isRuledOut(nextReview) ? ruledOutKey(nextReview) : null;
  const reviewOpensAt = (r: LiveFeedEvent): number => {
    const floor = Math.max(openedAt.current, stage === 'second' ? 46 : stage === 'extra' ? 90 : 0);
    const staged = ruledOutAt.get(r.review!.id);
    const playing = liveAction && liveAction.key === nextRuledOutKey ? liveAction.at : null;
    let t: number;
    /* A hair past NET_AT: the clock is a float, and a hair short of it the ball would stop on the line, not in the net. */
    if (staged !== undefined) t = (playing ?? Math.max(staged, floor)) + (reducedMotion ? 0 : NET_AT + 0.004);
    else {
      t = placeOf(r);
      /* The last kick of a period is wound up ACTION_SPAN before the whistle. A review at the whistle's own place
         (the penalty it gives then IS the last kick) or one due inside a staged last kick's wind up opens just
         before that wind up, so the kick is played whole after it. */
      const atWhistle = r.minute === stageEnd && (r.plus ?? 0) === board;
      const lastKickStaged = plan.actions.some(a => placeOf(a.event) >= stageStop - 1e-6);
      if ((atWhistle || lastKickStaged) && t > stageStop - ACTION_SPAN - 0.05) t = stageStop - ACTION_SPAN - 0.05;
      /* Never over an action still playing: it waits for that action to be over, a hair past its end (at its
         end to the frame, a goal's card and its last picture are still up). */
      const over = ACTION_SPAN + 0.01;
      for (const a of [...plan.actions].sort((x, y) => x.at - y.at)) if (a.at < t - 1e-6 && t < a.at + over) t = a.at + over;
      if (liveAction && liveAction.at < t - 1e-6 && t < liveAction.at + over) t = liveAction.at + over;
    }
    return Math.max(floor, Math.min(t, stageStop - 0.05));
  };
  reviewCap.current = nextReview ? reviewOpensAt(nextReview) : Infinity;
  const reviewDue = !!nextReview && clock >= reviewCap.current - 0.001;
  useEffect(() => {
    if (running && !finished && !reviewEvent && nextReview && reviewDue) setReviewEvent(nextReview);
  }, [running, finished, reviewEvent, nextReview, reviewDue]);
  /* The goal a review is about to rule out starts on the pitch when its turn comes, like any chance. Only the
     next review's: one review at a time. */
  useEffect(() => {
    if (!running || finished || !nextReview || !nextRuledOutKey || (reviewEvent && reviewEvent !== nextReview)) return;
    const at = ruledOutAt.get(nextReview.review!.id);
    /* The hair of slack is for reduced motion, where the review opens on the very tick its goal starts. */
    if (at === undefined || at > clock + 0.002 || firedRef.current.has(nextRuledOutKey)) return;
    firedRef.current.add(nextRuledOutKey);
    setMotionEvent({ event: { minute: nextReview.minute, ...(nextReview.plus ? { plus: nextReview.plus } : {}), side: nextReview.side, kind: 'goal', text: nextReview.text }, key: nextRuledOutKey, at: clock });
    // firedRef is a ref; the clock, the plan and the review are the inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock, running, finished, reviewEvent, nextReview, nextRuledOutKey, ruledOutAt]);

  /* ---- banners and the event line, off the committed feed ---- */
  useEffect(() => {
    if (!running || finished) return;
    const lo = stage === 'first' ? 0 : stage === 'extra' ? 91 : 46;
    const hi = stageEnd;
    let big: Banner | null = null;
    let small: Seg[] | null = null;
    let moved: LiveFeedEvent | null = null;
    let scored: { e: LiveFeedEvent; key: string; banner: Banner } | null = null;
    const lines: LogLine[] = [];
    for (const e of feed) {
      /* Round 781: a line in the board fires when the clock reaches its plus.
         Round 1101: and a chance that waits its turn on the pitch fires when its action starts. */
      if (e.kind === 'halftime' || e.minute < lo || e.minute > hi || firesAt(e) > clock) continue;
      if (!cmVarCanAnnounce(e, feed, settledReviews)) continue;
      /* Round 1218 fix: a chance that would start in the very tick a review opens waits for the review to close. */
      if (reviewDue && isChance(e) && firesAt(e) >= reviewCap.current - 1e-6) continue;
      const key = `${e.kind}:${e.side}:${e.minute}${e.plus ? `+${e.plus}` : ''}:${e.text}`;
      if (firedRef.current.has(key)) continue;
      firedRef.current.add(key);
      if (playsOut(e)) { setMotionEvent({ event: e, key, at: clock }); moved = e; }
      const club = e.side === 'me' ? career.clubName : opponent;
      const side: Side = e.side === 'me' ? 'me' : 'opp';
      const who: Seg = e.text ? named(side, e.text) : { t: club };
      /* Round 505 review: the event's own flank and spot flags first. Two
         corners can share kind, side, minute and taker with different
         flanks, and the keyed lookup below cannot tell them apart; it stays
         only as the fallback for a feed line that carries none of them. */
      const x: Extra | undefined = e.flank || e.penalty || e.freeKick
        ? { flank: e.flank, penalty: e.penalty, freeKick: e.freeKick }
        : extras.get(`${e.kind}:${e.side}:${e.minute}:${e.text}`);
      const bigBefore = big as Banner | null;
      const smallBefore = small as Seg[] | null;
      switch (e.kind) {
        case 'goal': {
          /* Round 1146: an own goal names the man who put it in. He plays for the other side, so that is
             the side his MADE UP tag is read on; the club under the line is still the club that got the goal. */
          const scorer: Seg = goalScorerSeg(e, side, who, named);
          big = {
            /* Round 1146: the mark the report prints, from the same function, after the minute as the report has it. */
            segs: goalSegs(e.og ? 'GOAL! Own goal, ' : x?.penalty ? 'GOAL! Penalty, ' : x?.freeKick ? 'GOAL! Free kick, ' : 'GOAL! ', scorer, e, { penalty: x?.penalty, og: e.og }),
            club,
            tone: e.side === 'me' ? 'me' : 'opp',
          };
          scored = { e, key, banner: big };
          break;
        }
        case 'var':
          /* Round 1218 fix: the line says whose it was, like the report's own row: the man and his club. */
          if (e.review) small = e.text ? [{ t: `${cmVarLabel(e.review)}: ` }, who, { t: ` (${club})` }] : [{ t: `${cmVarLabel(e.review)}, ${club}` }];
          break;
        case 'yellow': big = { segs: [{ t: 'Booked: ' }, who, { t: ` ${minuteLabel(e)}` }], club, tone: 'none' }; break;
        case 'red': big = { segs: [{ t: 'RED CARD! ' }, who, { t: ` ${minuteLabel(e)}` }], club, tone: 'none' }; break;
        case 'injury': big = { segs: [{ t: 'Injury: ' }, who, { t: ` ${minuteLabel(e)}` }], club, tone: 'none' }; break;
        case 'sub': {
          /* The feed writes a sub as "X on for Y"; each name is tagged on its own. */
          const at = e.text.indexOf(' on for ');
          big = at > 0
            ? { segs: [{ t: 'Sub: ' }, named(side, e.text.slice(0, at)), { t: ' on for ' }, named(side, e.text.slice(at + 8))], club, tone: 'none' }
            : { segs: [{ t: `Sub: ${e.text}` }], club, tone: 'none' };
          break;
        }
        case 'shot':
          small = [{ t: 'Shot: ' }, who];
          break;
        case 'save':
          small = [{ t: x?.penalty ? 'Penalty saved! ' : 'Save! ' }, keeperOf(e.side === 'me' ? 'opp' : 'me', e.minute)];
          break;
        case 'corner':
          /* Round 505: the flank and the taker, "Corner, left, Saka"; the club when nobody is named. */
          small = [{ t: x?.flank ? `Corner, ${x.flank}, ` : 'Corner, ' }, who];
          break;
        case 'throwin':
          small = [{ t: `Throw in, ${club}` }];
          break;
        case 'foul': small = [{ t: 'Foul by ' }, who]; break;
        default: break;
      }
      /* Round 1101: whatever this line announced also goes on the list beside the pitch, with its minute
         in front (so the minute a banner ends on is left off). */
      const bigNow = big as Banner | null;
      const smallNow = small as Seg[] | null;
      const said = bigNow !== bigBefore && bigNow ? bigNow.segs : smallNow !== smallBefore ? smallNow : null;
      if (said) {
        const at = minuteLabel(e);
        lines.unshift({ key, at, segs: said.filter(sg => sg.t !== ` ${at}`) });
      }
    }
    /* Round 1101: a goal that fired on time and has the pitch (it is the last chance at its place, so its
       action is the one playing) gets the goal sequence in place of the pill: its card rises when the ball
       is in the net. A goal fired late (Skip, a catch up) keeps the pill, and so does the last kick of a period. */
    const sequence = scored as { e: LiveFeedEvent; key: string; banner: Banner } | null;
    if (sequence && moved === sequence.e && clock - firesAt(sequence.e) <= 0.5) {
      const count = goalCardCount(career, feed, sequence.e);
      /* Nothing says GOAL before the ball is in: its line on the list beside the pitch waits with the score
         (the effect below tells it), and the line under the pitch says nothing else while the goal plays. */
      const at = lines.findIndex(l => l.key === sequence.key);
      const line: LogLine = at >= 0 ? lines.splice(at, 1)[0] : { key: sequence.key, at: minuteLabel(sequence.e), segs: sequence.banner.segs };
      setGoalMoment({ key: sequence.key, at: clock, side: sequence.e.side === 'me' ? 'me' : 'opp', segs: sequence.banner.segs, club: sequence.banner.club, nth: count.nth, season: count.season, line });
      if (big === sequence.banner) big = null;
      small = null;
      setEventLine(null);
    }
    if (lines.length) setLog(prev => [...lines, ...prev].slice(0, 5));
    if (big) {
      setBanner(big);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => setBanner(null), 2600);
    }
    if (small) setEventLine(small);
    // The feed, its extras and the clock are the inputs; the rest are stable per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock, stage, stageEnd, board, feed, extras, running, finished, terminalWindup, startAt, settledReviews, reviewDue]);
  useEffect(() => () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }, []);

  /* ---- the dots and the ball, off the shared pitch (Round 1101): the plan is built further up ---- */
  const sceneKey = pitchSceneKey(plan, clock);
  // The key changes exactly when the scene does, so the clock itself is deliberately not a dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scene = useMemo(() => pitchScene(plan, clock), [plan, sceneKey]);
  /* The part places roles; who each one is (his name, number, id, armband) is this screen's own. */
  const manOf = useMemo(() => new Map([...men.mine, ...men.theirs].map(m => [m.key, m])), [men]);
  const motion = useLiveSimMotion(scene, motionEvent, clock, running && !finished && motionStillCommitted);

  /* ---- the goal sequence (Round 1101), derived in render and never from effect state ---- */
  const goalPhase = goalWindow(liveAction, clock, reducedMotion);
  /* An action the pitch has shown and then stopped showing before its time is one the part dropped (the line
     up changed under it: a substitution in a goal's wind up). The goal it was has nothing left to wait for. */
  const shownAction = useRef<string | null>(null);
  const [droppedKey, setDroppedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!liveAction) return;
    if (motion.action !== 'pass') shownAction.current = liveAction.key;
    else if (shownAction.current === liveAction.key && clock - liveAction.at < ACTION_SPAN && droppedKey !== liveAction.key) setDroppedKey(liveAction.key);
  });
  /* The card and the hold exist only inside the goal's own action, and only while the pitch is drawing it. */
  const gm = goalMoment && liveAction && liveAction.key === goalMoment.key && clock - goalMoment.at >= 0 && clock - goalMoment.at <= ACTION_SPAN
    && motion.action === 'goal' ? goalMoment : null;
  const cardUp = !!gm && goalPhase === 'net';
  /* Under reduced motion the last frame shows at once, so the hold is the first stretch after the line fires. */
  const holding = cardUp && !!gm && (!reducedMotion || clock - gm.at < GOAL_HOLD_SPAN);
  holdRate.current = holding ? GOAL_HOLD_SPAN / (GOAL_HOLD_SECONDS[speed] ?? 2.5) : 0;
  /* The score the eyes see waits for the ball. The engine counts a goal from its place on the clock; it is
     SHOWN from the instant its ball is in the net, which is its start on the pitch plus NET_AT (plus nothing
     under reduced motion, where the last frame shows at once). That is read off the clock and the plan, never
     off state an effect sets, so no frame can paint the new score early while an effect catches up. Only a
     goal the engine has already counted ever waits (the last kick of a period, wound up before its place,
     never does), and one the part dropped does not. Nothing is ever taken off the engine's own count, which
     the attributes keep. */
  const waiting: Record<Side, number> = { me: 0, opp: 0 };
  if (running && !finished) {
    const lo = stage === 'first' ? 0 : stage === 'extra' ? 91 : 46;
    for (const e of feed) {
      if (e.kind !== 'goal' || e.side === 'none' || e.minute < lo || e.minute > stageEnd || placeOf(e) > clock || !playsOut(e)) continue;
      /* The pitch counts the action from the tick its line fired on, a hair after the instant the plan gave
         it. Once that action is the one playing, the wait is read off its own start, so the new score and the
         ball in the net are the same frame (read off the plan alone the score led the net by one frame). */
      const struck = liveAction?.event === e ? liveAction.at : firesAt(e);
      if (clock >= struck + (reducedMotion ? 0 : NET_AT) || droppedKey === lineKey(e)) continue;
      waiting[e.side]++;
    }
  }
  const shownMy = Math.max(0, myGoalsNow - waiting.me);
  const shownOpp = Math.max(0, oppGoalsNow - waiting.opp);
  /* The list beside the pitch and the line under it are told about a goal when the score is: with the ball
     in the net, or the moment that goal stops waiting for any other reason (its action was dropped, Skip).
     Never before. */
  const goalStillWaiting = !!goalMoment && running && !finished && droppedKey !== goalMoment.key
    && clock < goalMoment.at + (reducedMotion ? 0 : NET_AT);
  const toldGoal = useRef<string | null>(null);
  const periodOn = running && !finished && clock < stageStop;
  useEffect(() => {
    if (!goalMoment || goalStillWaiting || toldGoal.current === goalMoment.key) return;
    toldGoal.current = goalMoment.key;
    setLog(prev => [goalMoment.line, ...prev].slice(0, 5));
    if (periodOn) setEventLine(goalMoment.line.segs);
  }, [goalMoment, goalStillWaiting, periodOn]);
  const skipGoal = () => { if (gm) setClock(c => Math.min(stageStop, Math.max(c, gm.at + ACTION_SPAN + 0.001))); };

  /* ---- the change sheet: tap one of your dots ---- */
  const sheetRef = useRevealScroll<HTMLDivElement>(`pick:${picking ?? ''}`, { skipFirst: true });
  const closeSheet = () => {
    setPicking(null);
    setPaused(pausedBefore.current);
  };
  const openSheet = (id: string) => {
    if (!canChange) return;
    if (picking === id) { closeSheet(); return; }
    if (picking === null) { pausedBefore.current = paused; setPaused(true); }
    setPicking(id);
    setPanel(null);
  };

  /* ---- match mode (Round 1101): one panel at a time, Back, Escape, and a page that stays put ---- */
  const togglePanel = (p: Panel) => {
    if (picking !== null) closeSheet();
    setPanel(current => (current === p ? null : p));
  };
  /* The interval is the real dressing room, drawn in the page as it always was. Everything else of a
     match (a period being played, the whistle, full time) is the stage. */
  const stageUp = (!!live || !!report) && !(stage === 'interval' && !!career.live) && !collapsed;
  /* Back pauses the match and folds the stage away to a small card in the page. */
  const leaveStage = () => {
    pausedBeforeBack.current = picking !== null ? pausedBefore.current : paused;
    setPicking(null);
    setPaused(true);
    setCollapsed(true);
  };
  /* And the card's one button puts the stage back, with the pause it had. */
  const backToMatch = () => {
    setCollapsed(false);
    setPaused(pausedBeforeBack.current);
  };
  /* Escape closes whatever is open, and with nothing open it is Back. */
  const stageBox = useRef<HTMLDivElement>(null);
  const onEscape = useRef<() => void>(() => {});
  onEscape.current = () => {
    if (picking !== null) closeSheet();
    else if (panel !== null) setPanel(null);
    else leaveStage();
  };
  useEffect(() => {
    if (!stageUp) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape.current(); };
    /* The button that opened the match is under the stage now. The keyboard starts from the stage itself,
       so the first Tab lands on Back and not on something that cannot be seen. */
    const box = stageBox.current;
    if (box && !box.contains(document.activeElement)) box.focus({ preventScroll: true });
    window.addEventListener('keydown', onKey);
    /* The stage is the whole window, so the page under it must not scroll while it is up. */
    const was = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = was;
    };
  }, [stageUp]);
  const changeMinute = Math.min(stageEnd, Math.floor(clock));
  /* The sheet holds the clock, and the pause button is locked under it, so
     the only way the picked man leaves the grass with it open is a skip or
     a redraw. Either way the sheet closes rather than offering a change the
     engine will refuse. A man down injured and not yet replaced is still
     his to change, so he stays. */
  useEffect(() => {
    if (!picking) return;
    if (!running || !liveNow) { closeSheet(); return; }
    /* Round 548: same inclusive read as the pitch above, so the action sheet for
       a man you have just taken off closes instead of hanging over a dot that
       is no longer his. */
    const on = new Set(myOnPitchAt(liveNow, minute + 1));
    /* Round 781: in a board, only what the clock has reached there. */
    const gone = liveGoneIds(liveNow, minute, plus);
    const by = playedBy(minute, plus);
    for (const inj of [...(liveNow.h1Injuries ?? []), ...(liveNow.h2Injuries ?? [])]) {
      if (inj.id && by(inj) && on.has(inj.id)) gone.delete(inj.id);
    }
    if (!on.has(picking) || gone.has(picking)) closeSheet();
    // closeSheet is stable per render; the inputs are the pick, the stage, the match and the minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, running, liveNow, minute, plus]);
  const doSub = (inId: string) => {
    if (!picking || !liveNow) return;
    onChange(changeMinute, { kind: 'sub', outId: picking, inId }, plus);
    closeSheet();
  };
  const doShape = (m: Mentality) => {
    if (!liveNow) return;
    onChange(changeMinute, { kind: 'shape', mentality: m }, plus);
  };
  const subsLeft = liveNow ? Math.max(0, MAX_SUBS - liveNow.subsUsed) : 0;
  const picked = picking ? career.squad.find(p => p.id === picking) ?? null : null;
  const sheetOpen = !!(picking && picked && canChange);
  /* Round 505: ordered for the man coming off, same position first. */
  const bench: CMPlayer[] = useMemo(() => {
    if (!liveNow || !career.live) return [];
    const usedUp = new Set<string>();
    for (const s of liveNow.subs ?? []) if (s.offId) usedUp.add(s.offId);
    for (const inj of [...(liveNow.h1Injuries ?? []), ...(liveNow.h2Injuries ?? [])]) if (inj.id) usedUp.add(inj.id);
    return benchFor(career, picking ?? undefined).filter(p => !usedUp.has(p.id));
  }, [career, liveNow, picking]);

  /* Somebody down and not yet replaced comes off the grass (that is what an
     injury is) and gets a line under the pitch instead, so the change is one
     tap away rather than lost with his dot. */
  const injuredWaiting: CMPlayer[] = useMemo(() => {
    if (!liveNow || !running) return [];
    const on = new Set(myOnPitchAt(liveNow, minute));
    /* Round 781: an injury or a red deeper in the board has not happened yet. */
    const by = playedBy(minute, plus);
    const reds = new Set<string>();
    for (const c of [...(liveNow.h1Cards ?? []), ...(liveNow.h2Cards ?? [])]) if (c.kind === 'red' && c.id && by(c)) reds.add(c.id);
    const out: CMPlayer[] = [];
    for (const inj of [...(liveNow.h1Injuries ?? []), ...(liveNow.h2Injuries ?? [])]) {
      if (!inj.id || !by(inj) || !on.has(inj.id) || reds.has(inj.id)) continue;
      const p = career.squad.find(q => q.id === inj.id);
      if (p) out.push(p);
    }
    return out;
  }, [liveNow, running, minute, plus, career]);

  /* ---- the interval: the real dressing room, embedded ---- */
  const startSecond = () => {
    onStartSecondHalf();
    setStage('second');
    clearAction();
    setClock(46);
    setPaused(false);
    setPicking(null);
    setEventLine(null);
  };

  if (!live && !report) return null;

  if (stage === 'interval' && career.live) {
    return (
      <div className="max-w-md mx-auto space-y-3" data-cm-live-stage="interval">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{compLabel} · Half time</div>
          <div data-cm-live-score className="text-2xl font-display font-bold text-foreground tabular-nums mt-1">
            {myGoalsNow} - {oppGoalsNow}
          </div>
          <div className="text-[10px] text-muted-foreground">{career.clubName} vs {opponent}</div>
          {legCtx && (
            <div className="mt-1 text-[10px] text-muted-foreground tabular-nums" data-cm-live-agg={`${legCtx.aggMine}-${legCtx.aggTheirs}`}>
              First leg {legCtx.leg1Mine}-{legCtx.leg1Theirs} {legCtx.leg1Home ? 'at home' : 'away'} · Agg {legCtx.aggMine}-{legCtx.aggTheirs}
            </div>
          )}
        </div>
        <LiveStats stats={stats} counts={counts} clubName={career.clubName} opponent={opponent} />
        <HalftimeScreen
          career={career}
          onSub={onSub}
          onShape={onShape}
          onTalk={onTalk}
          onSecondHalf={startSecond}
        />
      </div>
    );
  }

  const onPitchPlayers = men.mine
    .map(d => (d.id ? career.squad.find(p => p.id === d.id) : undefined))
    .filter((p): p is CMPlayer => !!p)
    .sort((a, b) => a.fitness - b.fitness);

  /* Round 670: a match that went to extra time ends AET, and its clock reads ET while it runs. */
  const badge = stage === 'done'
    ? (report?.detail?.et ? 'AET' : report?.detail?.added ? `FT 90+${report.detail.added.h2}'` : 'FT')
    : finished ? 'Full time' : stage === 'extra' ? `ET ${minuteLabel({ minute, plus })}` : `LIVE ${minuteLabel({ minute, plus })}`;

  /* ---- match mode's own bits (Round 1101) ---- */
  const kicksUp = panel === 'kicks' && stage === 'done' && !!report?.shootout;
  const sidePanel: Panel | 'change' | null = sheetOpen ? 'change' : panel === 'kicks' ? (kicksUp ? 'kicks' : null) : panel;
  /* The label rules read the pitch as the eyes do: on its side, across is along. */
  const drawn = [...motion.mine, ...motion.theirs].map(p => (sideways ? { key: p.key, x: 100 - p.y, y: p.x } : p));
  const above = labelsAbove(drawn);
  const short = labelsShort(drawn);
  /* The scorer card sits in the half the goal did NOT go in, so it never covers the scorer and the men
     celebrating with him: my side attacks the top goal (the right one on its side), theirs the other. */
  const cardSpot = !gm ? '' : sideways
    ? (gm.side === 'me' ? 'left-[4%] right-[52%] top-[34%]' : 'left-[52%] right-[4%] top-[34%]')
    : (gm.side === 'me' ? 'inset-x-[7%] top-[62%]' : 'inset-x-[7%] top-[16%]');
  const poss = stats ? Math.round(stats.possession) : null;
  const scoreDigits = (
    <>
      <span key={`m${shownMy}`} data-cm-score-of="me" className={cardUp && gm?.side === 'me' ? 'cm-slam inline-block' : undefined}>{shownMy}</span>
      {' - '}
      <span key={`o${shownOpp}`} data-cm-score-of="opp" className={cardUp && gm?.side === 'opp' ? 'cm-slam inline-block' : undefined}>{shownOpp}</span>
    </>
  );

  return (
    <div className="max-w-md mx-auto" data-cm-live-stage={stage} data-cm-live-minute={minute} data-cm-live-plus={plus ?? 0}>
      <CelebrationStyles />
      {collapsed ? (
        /* Back was pressed: the match waits here, paused, one tap from the stage. */
        <div data-cm-live-compact="1" className="bg-card border border-border rounded-2xl p-4 text-center">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{compLabel}</div>
          <div className="mt-1 flex items-center justify-center gap-3">
            <div className="flex-1 text-right text-sm font-bold text-primary truncate">{career.clubName}</div>
            <div data-cm-live-score className="px-3 py-1 rounded-xl bg-secondary font-display text-xl font-bold text-foreground shrink-0 tabular-nums">
              {scoreDigits}
            </div>
            <div className="flex-1 text-left text-sm font-bold text-foreground truncate">{opponent}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {stage === 'done' || finished ? 'Full time' : `Paused at ${minuteLabel({ minute, plus })}`}
          </div>
          <button
            type="button"
            onClick={backToMatch}
            className="mt-3 w-full min-h-[44px] rounded-lg bg-primary text-primary-foreground px-3 text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Back to the match
          </button>
          {/* At full time the way on is the report, from here as well as from the stage. */}
          {stage === 'done' && (
            <button
              type="button"
              onClick={onExit}
              className="mt-2 w-full min-h-[44px] rounded-lg border border-border bg-card px-3 text-sm font-bold text-foreground hover:border-primary/60 transition-colors"
            >
              Full report
            </button>
          )}
        </div>
      ) : (
        /* The stage covers the window, so it says what it is and takes the keyboard when it opens. It is not
           marked modal: the cookie notice is drawn over it from outside it and has to stay reachable. */
        <div ref={stageBox} role="dialog" aria-label={`${career.clubName} against ${opponent}, the match`} tabIndex={-1} data-cm-live-stagebox="1" className="cm-stagebox bg-background text-foreground outline-none">
          <div className="cm-stage">
            <div className="cm-stage-main">
              {/* The strip: Back, the help, both clubs and the score, the clock. Two rows on a phone. */}
              <div data-cm-live-strip="1" className="cm-strip">
                <button
                  type="button"
                  onClick={leaveStage}
                  aria-label="Back to the club page"
                  className="w-11 h-11 shrink-0 rounded-lg border border-border bg-card flex items-center justify-center text-foreground hover:border-primary/60 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => togglePanel('help')}
                  aria-label="How watching a match works"
                  aria-expanded={sidePanel === 'help'}
                  className={cn(
                    'w-11 h-11 shrink-0 rounded-lg border bg-card text-sm font-bold transition-colors',
                    sidePanel === 'help' ? 'border-primary text-primary' : 'border-border text-foreground hover:border-primary/60',
                  )}
                >
                  ?
                </button>
                <div className="cm-strip-score">
                  <div className="flex-1 min-w-0 text-right text-sm font-bold text-primary truncate">{career.clubName}</div>
                  <div data-cm-live-score className="px-3 py-0.5 rounded-xl bg-secondary font-display text-xl font-bold text-foreground shrink-0 tabular-nums">
                    {scoreDigits}
                  </div>
                  <div className="flex-1 min-w-0 text-left text-sm font-bold text-foreground truncate">{opponent}</div>
                </div>
                {/* The whole label, on up to three short lines beside the buttons: never cut off with dots. */}
                <div className="cm-strip-comp text-[11px] text-muted-foreground uppercase tracking-wide">{compLabel}</div>
                <div className={cn(
                  'shrink-0 text-[11px] font-bold px-2 py-1 rounded-full tabular-nums',
                  stage === 'done' || finished ? 'bg-secondary text-muted-foreground' : 'bg-red-500/15 text-red-400',
                )}>
                  {/* Round 472: the whistle went after the board went up, so the
                      badge says when. The number is the report's own. */}
                  {badge}
                </div>
                <button
                  type="button"
                  onClick={() => togglePanel('stats')}
                  aria-expanded={sidePanel === 'stats'}
                  className={cn(
                    'cm-strip-stats h-11 min-w-[44px] shrink-0 rounded-lg border bg-card px-2 text-[11px] font-bold transition-colors',
                    sidePanel === 'stats' ? 'border-primary text-primary' : 'border-border text-foreground hover:border-primary/60',
                  )}
                >
                  Stats
                </button>
                {/* Round 781: the tie on a second leg, so the night's score is never read alone. */}
                {legCtx && (
                  <div className="cm-strip-leg text-center text-[11px] text-muted-foreground tabular-nums" data-cm-live-agg={`${legCtx.aggMine}-${legCtx.aggTheirs}`}>
                    First leg {legCtx.leg1Mine}-{legCtx.leg1Theirs} {legCtx.leg1Home ? 'at home' : 'away'} · Agg {Math.max(0, legCtx.aggMine - waiting.me)}-{Math.max(0, legCtx.aggTheirs - waiting.opp)}
                  </div>
                )}
              </div>

              {/* The pitch: the shared surface (grass, markings, nets, ball), with this screen's own dots on it.
                  It takes every pixel the rows around it leave. */}
              <div className="cm-pitchbox">
                <PitchSurface frame={motion} orientation={orientation} className="cm-stage-pitch" style={{ aspectRatio: 'auto' }}>
                  {/* their dots: numbers, and names when the engine has an eleven for them */}
                  {motion.theirs.map(d => {
                    const m = manOf.get(d.key);
                    if (!m) return null;
                    const up = above.has(d.key);
                    return (
                      <div
                        key={d.key}
                        data-cm-dot-opp={m.number}
                        className={cn('absolute flex items-center pointer-events-none', up ? 'flex-col-reverse' : 'flex-col')}
                        style={{ ...pitchSpot(d, orientation), transform: `translate(-50%, ${up ? -35 : -24}px)` }}
                      >
                        <LivePitchPlayer color="#d6e6ed" keeper={d.keeper} pose={motion.poses[d.key]} />
                        <span className={cn('cm-dot-label text-[9px] text-white/80 leading-none truncate tabular-nums', up ? 'mb-0.5' : 'mt-0.5')}>
                          {m.number}{m.label && !short.has(d.key) ? ` ${m.label}` : ''}{m.gen ? '*' : ''}
                        </span>
                      </div>
                    );
                  })}

                  {/* my dots: a tap area a thumb can hit around a dot that stays small */}
                  {motion.mine.map(d => {
                    const m = manOf.get(d.key);
                    if (!m) return null;
                    const captain = !!m.id && m.id === captainId;
                    const up = above.has(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        data-cm-dot={m.id ?? ''}
                        data-cm-captain={captain ? '1' : undefined}
                        aria-label={`${m.label}, number ${m.number}${captain ? ', captain' : ''}. Tap to bring somebody on or change the shape.`}
                        disabled={!canChange || !m.id}
                        onClick={() => { if (m.id) openSheet(m.id); }}
                        className={cn(
                          'absolute flex items-center w-9 min-h-[28px] bg-transparent border-0 p-0 rounded-md',
                          up ? 'flex-col-reverse' : 'flex-col',
                          canChange ? 'cursor-pointer' : 'cursor-default',
                        )}
                        style={{ ...pitchSpot(d, orientation), transform: `translate(-50%, ${up ? -35 : -24}px)` }}
                      >
                        <LivePitchPlayer color={clubColor} keeper={d.keeper} pose={motion.poses[d.key]} selected={picking === m.id} />
                        <span className={cn('cm-dot-label text-[9px] text-white/90 leading-none truncate tabular-nums', up ? 'mb-0.5' : 'mt-0.5')}>
                          {m.number}{short.has(d.key) ? '' : ` ${m.label}`}
                          {captain && (
                            <span className="ml-0.5 inline-block px-[2px] rounded-sm bg-yellow-400 text-black font-black leading-[9px] align-middle">C</span>
                          )}
                        </span>
                      </button>
                    );
                  })}

                  {reviewEvent?.review && (
                    <ClubManagerVarReview key={reviewEvent.review.id} review={reviewEvent.review}
                      club={reviewEvent.side === 'me' ? career.clubName : opponent} who={reviewEvent.text} minute={minuteLabel(reviewEvent)} reducedMotion={reducedMotion}
                      onComplete={() => {
                        const id = reviewEvent.review!.id;
                        setSettledReviews(previous => new Set([...previous, id]));
                        setReviewEvent(null);
                        /* Round 1218 fix: the goal that was just ruled out stops there. Nobody celebrates it. */
                        setMotionEvent(current => (current && current.key.startsWith('ruledout:') ? null : current));
                      }} />
                  )}
                  {/* event banner */}
                  {banner && (
                    <div className={cn(
                      /* Round 1101: under the six yard box, so the pill is never over a goal mouth. */
                      'absolute left-1/2 top-[8%] -translate-x-1/2 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-lg animate-in fade-in slide-in-from-top-2 pointer-events-none text-center max-w-[92%]',
                      banner.tone === 'me' ? 'bg-emerald-500 text-black' : banner.tone === 'opp' ? 'bg-red-500 text-black' : 'bg-background/90 text-foreground border border-border',
                    )}>
                      <div className="truncate">
                        {banner.segs.map((sg, i) => (
                          <span key={i}>{sg.t}{sg.gen && <MadeUpTag className="ml-1" />}</span>
                        ))}
                      </div>
                      <div className={cn('text-[11px] font-normal leading-tight truncate', banner.tone === 'none' ? 'text-muted-foreground' : 'text-black/70')}>{banner.club}</div>
                    </div>
                  )}

                  {/* Round 1101: the scorer card. Facts only: who, when, and his count. A tap carries on. */}
                  {cardUp && gm && (
                    <button
                      type="button"
                      data-cm-goal-card={gm.side}
                      onClick={skipGoal}
                      className={cn(
                        'cm-rise absolute z-20 mx-auto max-w-[320px] rounded-2xl border-0 px-3 py-2 text-center shadow-xl', cardSpot,
                        gm.side === 'me' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-black',
                      )}
                    >
                      {/* Round 1146: only the name gives way on a narrow card. The words before it and the
                          minute and mark after it are never clipped (whitespace-pre keeps their spaces). */}
                      <div className="flex min-w-0 items-baseline justify-center truncate text-sm font-bold" data-cm-goal-card-line="1">
                        {cardSegs(gm.segs).map((sg, i) => (
                          <Fragment key={i}>
                            <span className={i === 1 ? 'min-w-0 truncate' : 'shrink-0 whitespace-pre'}>{sg.t}</span>
                            {sg.gen && <MadeUpTag className="ml-1 shrink-0" />}
                          </Fragment>
                        ))}
                      </div>
                      <div className="truncate text-[11px] leading-tight text-black/75">
                        {gm.club}{gm.nth >= 2 ? ` · ${ordinal(gm.nth)} of the match` : ''}{gm.season !== null ? ` · ${gm.season} this season` : ''}
                      </div>
                      <span className="sr-only">Tap to carry on</span>
                    </button>
                  )}

                  {stage === 'done' && (
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-white font-display font-bold text-2xl">FULL TIME</div>
                        {report?.decidedBy === 'pens' && (
                          <div className="text-white/90 text-xs mt-1">
                            {/* Round 782: the count, when the kicks were played one by one. */}
                            Decided on penalties{report.shootout ? `, ${report.shootout.mine}-${report.shootout.theirs}` : ''}
                          </div>
                        )}
                        {report?.decidedBy === 'aet' && (
                          <div className="text-white/90 text-xs mt-1">Decided in extra time</div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Somebody down and not yet replaced: said over a corner of the pitch, clear of the goal,
                    so the change is one tap away without leaving it. It is drawn ON the grass (inside the
                    surface), so on a wide screen, where the pitch is narrower than its box, it stays on it. */}
                {injuredWaiting.length > 0 && (
                  <div className={cn('absolute left-1.5 z-20 flex flex-col gap-1 max-w-[36%]', sideways ? 'top-1.5' : 'bottom-1.5')}>
                    {injuredWaiting.map(p => (
                      subsLeft > 0 ? (
                        <button
                          key={p.id}
                          onClick={() => openSheet(p.id)}
                          className="min-h-[44px] rounded-xl border border-yellow-500/60 bg-background/90 px-2 py-1 text-[11px] leading-tight font-bold text-yellow-400 text-left"
                        >
                          🩹 {p.name} is down. Tap to bring somebody on.
                        </button>
                      ) : (
                        <p key={p.id} className="rounded-xl border border-yellow-500/40 bg-background/90 px-2 py-1 text-[11px] leading-tight text-yellow-400">🩹 {p.name} is down and you have no changes left.</p>
                      )
                    ))}
                  </div>
                )}
                </PitchSurface>
              </div>

              {/* Round 1101: on a phone the full stats are a panel, so the three numbers that tell the match
                  stay in view the whole time, off the same count the panel reads. */}
              <div data-cm-live-statline="1" className="cm-statline text-[11px] text-muted-foreground tabular-nums">
                {/* Its name, for a screen reader: the full stats, where the words are printed, are a panel away on a phone. */}
                <span className="sr-only">Balance of play: </span>
                <span>Poss <b className="text-foreground">{poss === null ? '-' : `${poss}%`}</b> {poss === null ? '-' : `${100 - poss}%`}</span>
                <span>Shots <b className="text-foreground">{stats ? `${stats.shots} (${stats.onTarget})` : '-'}</b> {stats ? `${stats.oppShots} (${stats.oppOnTarget})` : '-'}</span>
                <span>xG <b className="text-foreground">{stats ? stats.xg.toFixed(2) : '-'}</b> {stats ? stats.oppXg.toFixed(2) : '-'}</span>
              </div>

              {/* The small stuff: chances, saves, corners, throw ins, fouls, at their minutes. */}
              <div className="cm-eventline text-center text-[11px] text-muted-foreground truncate" data-cm-live-event="1">
                {running && !finished && eventLine ? eventLine.map((sg, i) => (
                  <span key={i}>{sg.t}{sg.gen && <MadeUpTag className="ml-1" />}</span>
                )) : ''}
              </div>

              {/* controls: equal cells, a thumb wide each */}
              <div data-cm-live-controls="1" className="cm-controls">
                <button
                  onClick={() => setPaused(p => !p)}
                  disabled={stage === 'done' || finished || sheetOpen}
                  aria-label={paused ? 'Resume' : 'Pause'}
                  className="rounded-lg border border-border bg-card text-foreground hover:border-primary/60 transition-colors disabled:opacity-40 inline-flex items-center justify-center"
                >
                  {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={cn(
                      'rounded-lg border text-[11px] font-bold transition-colors',
                      speed === s ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/50',
                    )}
                  >
                    {s}x
                  </button>
                ))}
                <button
                  onClick={() => togglePanel('squad')}
                  aria-label="Squad and stamina"
                  aria-expanded={sidePanel === 'squad'}
                  className={cn(
                    'rounded-lg border transition-colors inline-flex items-center justify-center',
                    sidePanel === 'squad' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/60',
                  )}
                >
                  <Users className="w-4 h-4" />
                </button>
                {stage === 'done' ? (
                  <button
                    onClick={onExit}
                    className="rounded-lg bg-primary text-primary-foreground text-[11px] leading-tight font-bold hover:opacity-90 transition-opacity"
                  >
                    Full report
                  </button>
                ) : finished ? null : (
                  <button
                    onClick={() => {
                      setSettledReviews(previous => new Set([...previous, ...feed.filter(e => e.kind === 'var' && e.review && e.minute <= stageEnd).map(e => e.review!.id)]));
                      setReviewEvent(null);
                      setClock(stageStop);
                    }}
                    className="rounded-lg border border-border bg-card text-[11px] leading-tight font-bold text-foreground hover:border-primary/60 transition-colors inline-flex flex-col items-center justify-center"
                  >
                    <FastForward className="w-3.5 h-3.5" /> Skip
                  </button>
                )}
              </div>
            </div>

            {/* The side: beside the pitch on a wide screen, a sheet over its foot on a phone. One panel at a time. */}
            <div data-cm-live-side={sidePanel ?? 'none'} className="cm-stage-side">
              {(sidePanel === 'stats' || sidePanel === 'squad' || sidePanel === 'kicks') && (
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {sidePanel === 'stats' ? 'Match stats' : sidePanel === 'squad' ? 'On the pitch' : 'The shootout'}
                  </h3>
                  <button type="button" onClick={() => setPanel(null)} aria-label="Close the panel" className="w-11 h-11 shrink-0 rounded-lg border border-border bg-background flex items-center justify-center text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* The match line by line, newest first: a wide screen has the room for it. */}
              <div data-cm-live-log="1" className="cm-side-log bg-card border border-border rounded-xl p-2.5">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">As it happens</div>
                {log.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nothing to report yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {log.map((line, i) => (
                      <li key={`${line.key}:${i}`} className="flex items-baseline gap-2 text-xs">
                        <span className="w-11 shrink-0 text-muted-foreground tabular-nums">{line.at}</span>
                        <span className="min-w-0 flex-1 text-foreground">
                          {line.segs.map((sg, j) => (
                            <span key={j}>{sg.t}{sg.gen && <MadeUpTag className="ml-1" />}</span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* the live stats, the report's own numbers counted up to this minute.
                  Round 472: with the other club's name on it rather than "Them". */}
              <LiveStats stats={stats} counts={counts} clubName={career.clubName} opponent={opponent} />

              {/* Round 782: at the whistle, the shootout kick by kick when the manager had set an order. */}
              {sidePanel === 'kicks' && report?.shootout && (
                <ShootoutKicks shootout={report.shootout} clubName={career.clubName} opponent={opponent} />
              )}

              {/* Round 1101: how watching a match works, only while it is asked for. */}
              {sidePanel === 'help' && <LiveMatchHelp onClose={() => setPanel(null)} reviews={!!liveNow?.varReviews} />}

              {/* the change sheet: a sub or a shape, at this minute */}
              {sheetOpen && picked && (
                <div ref={sheetRef} className="bg-card border border-border rounded-xl p-3" data-cm-live-sheet={picking ?? ''}>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <ArrowLeftRight className="w-3 h-3" /> Change at {minuteLabel({ minute: changeMinute, plus })} · Subs left: {subsLeft}
                    </div>
                    <button
                      onClick={closeSheet}
                      aria-label="Close"
                      className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-2 py-1.5">
                    <span className="w-9 shrink-0 text-[11px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">
                      {picked.position}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs text-foreground truncate">{picked.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {picked.rating} rated {'·'} <span className={fitnessTone(picked.fitness)}>{Math.round(picked.fitness)} fit</span>
                      </span>
                    </span>
                  </div>

                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-2 mb-1 flex items-center gap-1">
                    <Gauge className="w-3 h-3" /> Shape from here
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MENTALITIES.map(m => (
                      <button
                        key={m.id}
                        data-cm-live-shape={m.id}
                        onClick={() => doShape(m.id)}
                        className={cn(
                          'min-h-[44px] rounded-lg border px-1 text-center transition-colors',
                          mentality === m.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                        )}
                      >
                        <span className="block text-sm leading-none">{m.emoji}</span>
                        <span className={cn('block text-[11px] font-bold mt-0.5', mentality === m.id ? 'text-primary' : 'text-foreground')}>{m.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-2 mb-1">Bring on for {lastName(picked.name)}</div>
                  {subsLeft === 0 ? (
                    <p className="text-[11px] text-yellow-400">You have used all three. Nobody else is coming off.</p>
                  ) : bench.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Nobody fit is left on the bench.</p>
                  ) : (
                    <div className="space-y-0.5 max-h-56 overflow-y-auto">
                      {bench.map(b => (
                        <button
                          key={b.id}
                          data-cm-live-bench={b.id}
                          onClick={() => doSub(b.id)}
                          className="w-full min-h-[44px] flex items-center gap-2 rounded-lg border border-border hover:border-primary/50 px-2 py-1.5 text-left transition-colors"
                        >
                          <span className="w-9 shrink-0 text-[11px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">
                            {b.position}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs text-foreground truncate">{b.name}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {b.rating} rated {'·'} <span className={fitnessTone(b.fitness)}>{Math.round(b.fitness)} fit</span>
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* the squad panel: who is out there and how much they have left */}
              {sidePanel === 'squad' && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">On the pitch · fitness</div>
                  <div className="space-y-1">
                    {onPitchPlayers.map(p => (
                      <div key={p.id} className="flex items-center gap-2 text-[11px]">
                        <span className="w-7 shrink-0 text-muted-foreground">{p.position}</span>
                        <span className="text-foreground truncate flex-1">{p.name}</span>
                        <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden shrink-0">
                          <div
                            className={cn('h-full rounded-full', p.fitness >= 70 ? 'bg-emerald-500' : p.fitness >= 45 ? 'bg-yellow-500' : 'bg-red-500')}
                            style={{ width: `${p.fitness}%` }}
                          />
                        </div>
                        <span className="w-6 text-right tabular-nums text-muted-foreground shrink-0">{Math.round(p.fitness)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">Tap a player on the pitch to make a change at any minute.</p>
                  {/* The asterisk on a dot is the ratings sheet's MADE UP, at dot size. */}
                  {men.theirs.some(d => d.gen) && (
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      * on a dot is <MadeUpTag />
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveSimScreen;
