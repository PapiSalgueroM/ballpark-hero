/* ─── Round 525: the NHL career's rivalry events ─────────────────────────────

   The same depth gap the NFL career closed in Round 521: narrative beats on
   top of the rival every American career already has, on the engine
   careerRivalryEvents.ts lifted from the flagship's eighteen beats, bound to
   hockey the same way nhlCareerMoney.ts binds the bank.

   The rival is the SAME rival every other screen already uses: careerRival.ts's
   draftRival, drafted alongside the player and simulated every season by
   judgeRivalSeason inside simNhlSeason in nhlMyCareer.ts. This file adds no
   second rival concept, it only adds narrative beats on top of the one that
   already exists.

   WHAT CHANGED FROM THE FLAGSHIP'S TABLE, and why. CareerRival (careerRival.ts)
   tracks name, position, team, overall, potential, age, rings, the head to
   head record and his last season's line: no nationality, no club tier, no
   Ballon d'Or, none of the soccer-specific fields the flagship's table gates
   on, because an NHL career has none of those things. So every gate below is
   read off what an NHL rival's save actually carries, mirroring the same
   read the NFL table already made off the same shared type: rings become the
   Cup, and the head to head record stands in for the armband snub and the
   chase. Seventeen beats, the same count the NFL table settled on for the
   same reason: the flagship's roster picked several soccer specific beats
   that have no honest hockey equivalent, and inventing one would be filling
   a gap with something plausible, which CLAUDE.md rules out.

   LEGAL SHAPE. Every description narrates the rival ("tells reporters",
   "announces", "invites you") rather than quoting him, the same rule the
   flagship's table and the NFL's already follow, and the rival's name is
   proven never to collide with a real player: scripts/simInventedNames.mjs
   section 2c already enumerates careerRival.ts's FIRST and LAST banks against
   the site's whole real-name harvest, NHL rosters included, and finds zero
   collisions. scripts/simCareerRivalryEvents.mjs re-proves that as its own
   explicit section rather than trusting the existing green run. */

import type { NhlCareerState } from "./nhlMyCareer";
import type { CareerRival } from "./careerRival";
import {
  rollRivalryEvent, forcedRetirementEvent, applyRivalryEvent as applyRivalryEventFor,
} from "./careerRivalryEvents";
import type { RivalryEvent, RivalryEventDef } from "./careerRivalryEvents";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The beat that fires forced, once, the season the rival retires. */
export const NHL_RIVAL_RETIRE_ID = 305;

/* Seventeen beats, gated on what an NHL rival's save actually tracks: rings
   (the Cup), overall, team, age, and the head to head record judgeRivalSeason
   already keeps. Every mutation lands on fields the NHL career already has
   (morale, fanbase, netWorth, and the optional rivalryIntensity this round
   adds alongside pendingRivalryEvent), the same as the NFL table lands on
   its own fields. */
export const NHL_RIVALRY_EVENTS: RivalryEventDef<NhlCareerState, CareerRival>[] = [
  {
    id: 301, emoji: "🏆", title: "Rival Lifts the Cup",
    description: (_s, r) => `${r.name} just won the Cup. You are still chasing your first.`,
    consequence: "Motivation boost: Morale -5, focus sharpens",
    when: (s, r) => r.rings > 0 && s.cups === 0,
    apply: s => { s.morale = clamp(s.morale - 5, 0, 100); },
  },
  {
    id: 302, emoji: "📋", title: "Cap Squeeze",
    description: (_s, r) => `Word around the room is the front office is choosing between you and ${r.name} for the same cap space.`,
    consequence: "Morale -5",
    when: () => true,
    apply: s => { s.morale = clamp(s.morale - 5, 0, 100); },
  },
  {
    id: 303, emoji: "🤝", title: "Rival Shows Respect",
    description: (_s, r) => `${r.name} tells reporters you are the best in the league at your position.`,
    consequence: "Fanbase +5, Morale +5",
    when: () => true,
    apply: s => { s.fanbase = clamp(s.fanbase + 5, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); },
  },
  {
    id: 304, emoji: "🏒", title: "Head to Head Win",
    description: (_s, r) => `Your team beat ${r.name}'s team this week, and you had the better box score.`,
    consequence: "Fanbase +5, confidence boost",
    when: () => true,
    apply: s => { s.fanbase = clamp(s.fanbase + 5, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); },
  },
  {
    id: NHL_RIVAL_RETIRE_ID, emoji: "👋", title: "Rival Retires",
    description: (_s, r) => `${r.name} announces retirement. He calls the rivalry the best thing that ever happened to his career.`,
    consequence: "Legacy +10, end of an era",
    when: (_s, r) => r.retired,
    apply: s => { s.fanbase = clamp(s.fanbase + 10, 0, 100); },
  },
  {
    id: 306, emoji: "🗳️", title: "All-Star Ballot Squeeze",
    description: (_s, r) => `Only one of you is making the All-Star ballot at the position this year, and it comes down to ${r.name}.`,
    consequence: "50/50 outcome",
    when: (s, r) => s.ovr >= 80 && r.ovr >= 80,
    apply: (s, r, rng, pushLine) => {
      if (rng() < 0.5) { s.morale = clamp(s.morale + 5, 0, 100); pushLine(`🗳️ You made the ballot over ${r.name}!`); }
      else { s.morale = clamp(s.morale - 5, 0, 100); pushLine(`🗳️ ${r.name} made the ballot over you.`); }
    },
  },
  {
    id: 307, emoji: "⭐", title: "Rival's Cup",
    description: (_s, r) => `${r.name}'s team wins it all. Yours came up short.`,
    consequence: "Morale -5, motivation boost",
    when: (s, r) => r.rings > s.cups,
    apply: s => { s.morale = clamp(s.morale - 5, 0, 100); },
  },
  {
    id: 308, emoji: "📈", title: "Surpassed Your Rival!",
    description: (s, r) => `For the first time, your rating (${s.ovr}) has pulled ahead of ${r.name}'s (${r.ovr}).`,
    consequence: "Morale +10",
    when: (s, r) => s.ovr > r.ovr && s.ovr - r.ovr >= 2,
    apply: s => { s.morale = clamp(s.morale + 10, 0, 100); },
  },
  {
    id: 309, emoji: "😬", title: "Rival Becomes Teammate",
    description: (_s, r) => `${r.name} just signed with your team. The room just got a lot more interesting.`,
    consequence: "The feud cools, Morale +3, Fanbase +5",
    when: (s, r) => r.team === s.team,
    apply: s => {
      s.morale = clamp(s.morale + 3, 0, 100);
      s.fanbase = clamp(s.fanbase + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 10, 0, 100);
    },
  },
  {
    id: 310, emoji: "🤬", title: "The Scrum",
    description: (_s, r) => `Cameras catch you and ${r.name} tangled up after the whistle, gloves off, refs pulling everyone apart. It is the only clip anybody is talking about Monday.`,
    consequence: "Rivalry intensifies, Fanbase +3",
    when: () => true,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 3, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 15, 0, 100);
    },
  },
  {
    id: 311, emoji: "📉", title: "Losing the Head to Head",
    description: (_s, r) => `${r.name} is pulling away in the head to head. Every broadcast mentions it now.`,
    consequence: "Motivation surges",
    when: (_s, r) => r.hisYears >= 3 && r.hisYears > r.myYears,
    apply: s => {
      s.morale = clamp(s.morale + 2, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 5, 0, 100);
    },
  },
  {
    id: 312, emoji: "📊", title: "Winning the Head to Head",
    description: (_s, r) => `You are pulling away in the head to head against ${r.name}, and the league has noticed.`,
    consequence: "Fanbase +5",
    when: (_s, r) => r.myYears >= 3 && r.myYears > r.hisYears,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 5, 0, 100);
    },
  },
  {
    id: 313, emoji: "🤝", title: "The Handshake Line",
    description: (_s, r) => `After a brutal playoff series, you and ${r.name} share a long moment in the handshake line. The photo is everywhere by Monday morning.`,
    consequence: "Fanbase +8, the feud softens",
    when: () => true,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 8, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 15, 0, 100);
    },
  },
  {
    id: 314, emoji: "🏥", title: "Rival's Tough Year",
    description: (_s, r) => `${r.name} is grinding through a rough season. You send him a genuine message.`,
    consequence: "Fanbase +5, rivalry cools",
    when: (_s, r) => !r.retired && r.ovr <= 60,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 20, 0, 100);
    },
  },
  {
    id: 315, emoji: "🐐", title: "The GOAT Debate",
    description: (_s, r) => `Every pregame show runs the same segment this week: you or ${r.name}.`,
    consequence: "Fanbase +5, the era has a name now",
    when: (s, r) => s.ovr >= 88 && r.ovr >= 88,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
    },
  },
  {
    id: 316, emoji: "🎬", title: "The Documentary",
    description: (_s, r) => `A streaming service wants to film a season long documentary on you and ${r.name}.`,
    consequence: "Net worth +2M, Fanbase +8",
    when: s => s.age >= 28,
    apply: s => {
      s.netWorth = Math.round(((s.netWorth ?? 0) + 2) * 10) / 10;
      s.fanbase = clamp(s.fanbase + 8, 0, 100);
    },
  },
  {
    id: 317, emoji: "🤝", title: "Retirement Tribute",
    description: (_s, r) => `${r.name} personally invites you to his retirement tribute game. Years of battles, one final handshake.`,
    consequence: "Fanbase +8, the feud becomes history",
    when: s => s.age >= 32,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 8, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 25, 0, 100);
    },
  },
];

/**
 * One season's rivalry roll: the coin flip while the rival is still playing,
 * or the forced retirement beat the one season he hangs it up. Called from
 * simNhlSeason right after judgeRivalSeason, the same point in the loop the
 * flagship and the NFL career roll their own. Returns null on a season with
 * nothing to show.
 */
export function nhlRivalryTick(c: NhlCareerState, rng: () => number = Math.random): RivalryEvent | null {
  if (!c.rival) return null;
  const lastId = c.lastRivalryEventId ?? null;
  const rolled = rollRivalryEvent(c, c.rival, lastId, NHL_RIVALRY_EVENTS, rng);
  if (rolled) return rolled;
  return forcedRetirementEvent(c, c.rival, lastId, NHL_RIVALRY_EVENTS, NHL_RIVAL_RETIRE_ID);
}

/**
 * Apply the pending event and clear it. Returns the state plus the lines the
 * board should push into its feed, the same {state, log} shape buyNhlItem
 * already returns for a shop purchase.
 */
export function dismissNhlRivalryEvent(c: NhlCareerState, rng: () => number = Math.random): { state: NhlCareerState; lines: string[] } {
  const s: NhlCareerState = { ...c };
  const lines: string[] = [];
  if (s.pendingRivalryEvent && s.rival) {
    const event = s.pendingRivalryEvent;
    applyRivalryEventFor(s, s.rival, event, NHL_RIVALRY_EVENTS, rng, line => lines.push(line));
    s.lastRivalryEventId = event.id;
  }
  s.pendingRivalryEvent = null;
  return { state: s, lines };
}
