/* ─── Round 525: the NBA career's rivalry events ─────────────────────────────

   His 2026-08-28 backlog marked the Soccer Career depth gap open for the
   American careers on two items: interactive rivalry events, and an inbox.
   Round 521 closed both for the NFL. This file is the rivalry half for the
   NBA, on the engine careerRivalryEvents.ts lifted from the flagship's
   eighteen beats, bound to basketball the same way nbaCareerMoney.ts binds
   the bank.

   The rival is the SAME rival every other screen already uses: careerRival.ts's
   draftRival, drafted alongside the player and simulated every season by
   judgeRivalSeason inside simNbaSeason in nbaMyCareer.ts. This file adds no
   second rival concept, it only adds narrative beats on top of the one that
   already exists.

   WHAT CHANGED FROM THE FLAGSHIP'S TABLE, and why. CareerRival (careerRival.ts)
   tracks name, position, team, overall, potential, age, rings, the head to
   head record and his last season's line: no nationality, no club tier, no
   Ballon d'Or, none of the soccer-specific fields the flagship's table gates
   on, because an NBA career has none of those things. So every gate below is
   read off what an NBA rival's save actually carries, and the flagship's
   nationality beat and club-tier beat become an NBA locker room's own
   equivalents: the same team (still a "he is your teammate now" beat) and
   the head to head record standing in for the armband snub and the chase.
   Seventeen beats, the same count the NFL binding landed on: the flagship's
   roster picked ten soccer-specific beats (a Ballon d'Or, a Champions League
   run, a nationality match) that have no honest NBA equivalent, and inventing
   one would be filling a gap with something plausible, which CLAUDE.md rules
   out.

   LEGAL SHAPE. Every description narrates the rival ("tells reporters",
   "announces", "invites you") rather than quoting him, the same rule the
   flagship's table and the NFL binding already follow, and the rival's name
   is proven never to collide with a real player: scripts/simInventedNames.mjs
   section 2c already enumerates careerRival.ts's FIRST and LAST banks against
   the site's whole real-name harvest and finds zero collisions.
   scripts/simCareerRivalryEvents.mjs re-proves that as its own explicit
   section rather than trusting the existing green run. */

import type { NbaCareerState } from "./nbaMyCareer";
import type { CareerRival } from "./careerRival";
import {
  rollRivalryEvent, forcedRetirementEvent, applyRivalryEvent as applyRivalryEventFor,
} from "./careerRivalryEvents";
import type { RivalryEvent, RivalryEventDef } from "./careerRivalryEvents";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The beat that fires forced, once, the season the rival retires. */
export const NBA_RIVAL_RETIRE_ID = 305;

/* Seventeen beats, gated on what an NBA rival's save actually tracks: rings,
   overall, team, age, and the head to head record judgeRivalSeason already
   keeps. Every mutation lands on fields the NBA career already has (morale,
   fanbase, netWorth, and the optional rivalryIntensity this round adds
   alongside pendingRivalryEvent), the same as the flagship's table lands on
   soccer's own fields and the NFL binding lands on its own. */
export const NBA_RIVALRY_EVENTS: RivalryEventDef<NbaCareerState, CareerRival>[] = [
  {
    id: 301, emoji: "💍", title: "Rival Gets His Ring",
    description: (_s, r) => `${r.name} just won a ring. You are still chasing your first.`,
    consequence: "Motivation boost: Morale -5, focus sharpens",
    when: (s, r) => r.rings > 0 && s.rings === 0,
    apply: s => { s.morale = clamp(s.morale - 5, 0, 100); },
  },
  {
    id: 302, emoji: "📋", title: "Cap Squeeze",
    description: (_s, r) => `Word around the building is the front office is choosing between you and ${r.name} for the same cap space.`,
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
    id: 304, emoji: "🏀", title: "Head to Head Win",
    description: (_s, r) => `Your team beat ${r.name}'s team this season, and you had the better box score.`,
    consequence: "Fanbase +5, confidence boost",
    when: () => true,
    apply: s => { s.fanbase = clamp(s.fanbase + 5, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); },
  },
  {
    id: NBA_RIVAL_RETIRE_ID, emoji: "👋", title: "Rival Retires",
    description: (_s, r) => `${r.name} announces retirement. He calls the rivalry the best thing that ever happened to his career.`,
    consequence: "Legacy +10, end of an era",
    when: (_s, r) => r.retired,
    apply: s => { s.fanbase = clamp(s.fanbase + 10, 0, 100); },
  },
  {
    id: 306, emoji: "🗳️", title: "All-Star Ballot Squeeze",
    description: (_s, r) => `Only one of you is making the All-Star roster at the position this year, and it comes down to ${r.name}.`,
    consequence: "50/50 outcome",
    when: (s, r) => s.ovr >= 80 && r.ovr >= 80,
    apply: (s, r, rng, pushLine) => {
      if (rng() < 0.5) { s.morale = clamp(s.morale + 5, 0, 100); pushLine(`🗳️ You made the All-Star roster over ${r.name}!`); }
      else { s.morale = clamp(s.morale - 5, 0, 100); pushLine(`🗳️ ${r.name} made the All-Star roster over you.`); }
    },
  },
  {
    id: 307, emoji: "⭐", title: "Rival's Ring",
    description: (_s, r) => `${r.name}'s team wins it all. Yours came up short.`,
    consequence: "Morale -5, motivation boost",
    when: (s, r) => r.rings > s.rings,
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
    description: (_s, r) => `${r.name} just signed with your team. The locker room just got a lot more interesting.`,
    consequence: "The feud cools, Morale +3, Fanbase +5",
    when: (s, r) => r.team === s.team,
    apply: s => {
      s.morale = clamp(s.morale + 3, 0, 100);
      s.fanbase = clamp(s.fanbase + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 10, 0, 100);
    },
  },
  {
    id: 310, emoji: "🤬", title: "Courtside Scuffle",
    description: (_s, r) => `Cameras catch you and ${r.name} jawing at midcourt after a hard foul. It is the only clip anybody is talking about Monday.`,
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
    id: 313, emoji: "🤝", title: "The Postgame Handshake",
    description: (_s, r) => `After a hard fought game, you and ${r.name} find each other at half court for a long handshake. The photo is everywhere by Monday morning.`,
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
    id: 315, emoji: "🐐", title: "The Debate",
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
    description: (_s, r) => `${r.name} personally invites you to his retirement tribute game. Years of battles, one final ovation.`,
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
 * simNbaSeason right after judgeRivalSeason, the same point in the loop the
 * flagship and the NFL binding roll their own. Returns null on a season with
 * nothing to show.
 */
export function nbaRivalryTick(c: NbaCareerState, rng: () => number = Math.random): RivalryEvent | null {
  if (!c.rival) return null;
  const lastId = c.lastRivalryEventId ?? null;
  const rolled = rollRivalryEvent(c, c.rival, lastId, NBA_RIVALRY_EVENTS, rng);
  if (rolled) return rolled;
  return forcedRetirementEvent(c, c.rival, lastId, NBA_RIVALRY_EVENTS, NBA_RIVAL_RETIRE_ID);
}

/**
 * Apply the pending event and clear it. Returns the state plus the lines the
 * board should push into its feed, the same {state, log} shape buyNbaItem
 * already returns for a shop purchase.
 */
export function dismissNbaRivalryEvent(c: NbaCareerState, rng: () => number = Math.random): { state: NbaCareerState; lines: string[] } {
  const s: NbaCareerState = { ...c };
  const lines: string[] = [];
  if (s.pendingRivalryEvent && s.rival) {
    const event = s.pendingRivalryEvent;
    applyRivalryEventFor(s, s.rival, event, NBA_RIVALRY_EVENTS, rng, line => lines.push(line));
    s.lastRivalryEventId = event.id;
  }
  s.pendingRivalryEvent = null;
  return { state: s, lines };
}
