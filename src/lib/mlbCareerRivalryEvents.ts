/* ─── Round 525: the MLB career's rivalry events ─────────────────────────────

   His 2026-08-28 backlog row "Bring the Soccer Career depth to the NFL
   career, then the other US careers" is why Round 521 gave the NFL career
   interactive rivalry events and an inbox on the engine careerRivalryEvents.ts
   lifted from the flagship's eighteen beats. This file is that same layer
   reaching MLB, bound the same way nflCareerRivalryEvents.ts binds the NFL
   and mlbCareerMoney.ts binds the bank.

   The rival is the SAME rival every other screen already uses: careerRival.ts's
   draftRival, drafted alongside the player and simulated every season by
   judgeRivalSeason inside simMlbSeason in mlbMyCareer.ts. This file adds no
   second rival concept, it only adds narrative beats on top of the one that
   already exists.

   WHAT THIS TABLE GATES ON, and why it is the same shape as the NFL's.
   CareerRival (careerRival.ts) tracks name, position, team, overall,
   potential, age, rings, the head to head record and his last season's
   line, the same fields for every RivalSport value: no nationality, no club
   tier, no Ballon d'Or, none of the soccer-specific fields the flagship's
   table gates on, because an American career has none of those things. So
   every gate below reads off what a baseball rival's save actually carries,
   the exact fields the NFL table already uses, only with a baseball voice on
   the flavor text: a ring is a World Series ring, a roster squeeze is the
   40-man, a season series stands in for a head to head football matchup a
   pitcher and a position player would otherwise never share. Seventeen
   beats, the same count the NFL table settled on for the same reason: the
   flagship's ten soccer-specific beats (a Ballon d'Or, a Champions League
   run, a nationality match) have no honest MLB equivalent, and inventing one
   would be filling a gap with something plausible, which CLAUDE.md rules
   out.

   LEGAL SHAPE. Every description narrates the rival ("tells reporters",
   "announces", "invites you") rather than quoting him, the same rule the
   flagship's table and the NFL's already follow, and the rival's name is
   proven never to collide with a real player: scripts/simInventedNames.mjs
   section 2c already enumerates careerRival.ts's FIRST and LAST banks
   against the site's whole real-name harvest, and that bank is the same one
   every RivalSport value draws from, mlb included, so nothing here mints a
   name of its own. scripts/simCareerRivalryEvents.mjs section 5 re-proves
   that as its own explicit check and its header now says plainly that MLB
   needs nothing added there. */

import type { MlbCareerState } from "./mlbMyCareer";
import type { CareerRival } from "./careerRival";
import {
  rollRivalryEvent, forcedRetirementEvent, applyRivalryEvent as applyRivalryEventFor,
} from "./careerRivalryEvents";
import type { RivalryEvent, RivalryEventDef } from "./careerRivalryEvents";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The beat that fires forced, once, the season the rival retires. */
export const MLB_RIVAL_RETIRE_ID = 205;

/* Seventeen beats, gated on what an MLB rival's save actually tracks:
   rings, overall, team, age, and the head to head (season series) record
   judgeRivalSeason already keeps. Every mutation lands on fields the MLB
   career already has (morale, fanbase, netWorth, and the optional
   rivalryIntensity this round adds alongside pendingRivalryEvent), the same
   as the NFL table lands on football's own fields. */
export const MLB_RIVALRY_EVENTS: RivalryEventDef<MlbCareerState, CareerRival>[] = [
  {
    id: 201, emoji: "💍", title: "Rival Gets His Ring",
    description: (_s, r) => `${r.name} just won a World Series ring. You are still chasing your first.`,
    consequence: "Motivation boost: Morale -5, focus sharpens",
    when: (s, r) => r.rings > 0 && s.rings === 0,
    apply: s => { s.morale = clamp(s.morale - 5, 0, 100); },
  },
  {
    id: 202, emoji: "📋", title: "40-Man Squeeze",
    description: (_s, r) => `Word out of the front office is they are choosing between you and ${r.name} for a 40-man roster spot.`,
    consequence: "Morale -5",
    when: () => true,
    apply: s => { s.morale = clamp(s.morale - 5, 0, 100); },
  },
  {
    id: 203, emoji: "🤝", title: "Rival Shows Respect",
    description: (_s, r) => `${r.name} tells reporters you are the best in the league at your position.`,
    consequence: "Fanbase +5, Morale +5",
    when: () => true,
    apply: s => { s.fanbase = clamp(s.fanbase + 5, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); },
  },
  {
    id: 204, emoji: "⚾", title: "Season Series Win",
    description: (_s, r) => `Your club took the season series from ${r.name}'s team, and you had the better box score.`,
    consequence: "Fanbase +5, confidence boost",
    when: () => true,
    apply: s => { s.fanbase = clamp(s.fanbase + 5, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); },
  },
  {
    id: MLB_RIVAL_RETIRE_ID, emoji: "👋", title: "Rival Retires",
    description: (_s, r) => `${r.name} announces retirement. He calls the rivalry the best thing that ever happened to his career.`,
    consequence: "Legacy +10, end of an era",
    when: (_s, r) => r.retired,
    apply: s => { s.fanbase = clamp(s.fanbase + 10, 0, 100); },
  },
  {
    id: 206, emoji: "🗳️", title: "All-Star Ballot Squeeze",
    description: (_s, r) => `Only one of you is making the All-Star roster at the position this year, and it comes down to ${r.name}.`,
    consequence: "50/50 outcome",
    when: (s, r) => s.ovr >= 80 && r.ovr >= 80,
    apply: (s, r, rng, pushLine) => {
      if (rng() < 0.5) { s.morale = clamp(s.morale + 5, 0, 100); pushLine(`🗳️ You made the All-Star roster over ${r.name}!`); }
      else { s.morale = clamp(s.morale - 5, 0, 100); pushLine(`🗳️ ${r.name} made the All-Star roster over you.`); }
    },
  },
  {
    id: 207, emoji: "⭐", title: "Rival's Ring",
    description: (_s, r) => `${r.name}'s team wins it all. Yours came up short.`,
    consequence: "Morale -5, motivation boost",
    when: (s, r) => r.rings > s.rings,
    apply: s => { s.morale = clamp(s.morale - 5, 0, 100); },
  },
  {
    id: 208, emoji: "📈", title: "Surpassed Your Rival!",
    description: (s, r) => `For the first time, your rating (${s.ovr}) has pulled ahead of ${r.name}'s (${r.ovr}).`,
    consequence: "Morale +10",
    when: (s, r) => s.ovr > r.ovr && s.ovr - r.ovr >= 2,
    apply: s => { s.morale = clamp(s.morale + 10, 0, 100); },
  },
  {
    id: 209, emoji: "😬", title: "Rival Becomes Teammate",
    description: (_s, r) => `${r.name} just signed with your team. The clubhouse just got a lot more interesting.`,
    consequence: "The feud cools, Morale +3, Fanbase +5",
    when: (s, r) => r.team === s.team,
    apply: s => {
      s.morale = clamp(s.morale + 3, 0, 100);
      s.fanbase = clamp(s.fanbase + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 10, 0, 100);
    },
  },
  {
    id: 210, emoji: "🤬", title: "Dugout Chirping",
    description: (_s, r) => `Cameras catch you and ${r.name} jawing from the dugouts after a bang-bang call at first. It is the only clip anybody is talking about Monday.`,
    consequence: "Rivalry intensifies, Fanbase +3",
    when: () => true,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 3, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 15, 0, 100);
    },
  },
  {
    id: 211, emoji: "📉", title: "Losing the Season Series",
    description: (_s, r) => `${r.name} is pulling away in the season series. Every broadcast mentions it now.`,
    consequence: "Motivation surges",
    when: (_s, r) => r.hisYears >= 3 && r.hisYears > r.myYears,
    apply: s => {
      s.morale = clamp(s.morale + 2, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 5, 0, 100);
    },
  },
  {
    id: 212, emoji: "📊", title: "Winning the Season Series",
    description: (_s, r) => `You are pulling away in the season series against ${r.name}, and the league has noticed.`,
    consequence: "Fanbase +5",
    when: (_s, r) => r.myYears >= 3 && r.myYears > r.hisYears,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 5, 0, 100);
    },
  },
  {
    id: 213, emoji: "🧢", title: "Batting Practice Truce",
    description: (_s, r) => `You and ${r.name} spend early batting practice at the cage mid-series, talking like old friends. The photo is everywhere by the next day.`,
    consequence: "Fanbase +8, the feud softens",
    when: () => true,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 8, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 15, 0, 100);
    },
  },
  {
    id: 214, emoji: "🏥", title: "Rival's Tough Year",
    description: (_s, r) => `${r.name} is grinding through a rough season. You send him a genuine message.`,
    consequence: "Fanbase +5, rivalry cools",
    when: (_s, r) => !r.retired && r.ovr <= 60,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 20, 0, 100);
    },
  },
  {
    id: 215, emoji: "🐐", title: "The Debate",
    description: (_s, r) => `Every pregame show runs the same segment this week: you or ${r.name}.`,
    consequence: "Fanbase +5, the era has a name now",
    when: (s, r) => s.ovr >= 88 && r.ovr >= 88,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
    },
  },
  {
    id: 216, emoji: "🎬", title: "The Documentary",
    description: (_s, r) => `A streaming service wants to film a season long documentary on you and ${r.name}.`,
    consequence: "Net worth +2M, Fanbase +8",
    when: s => s.age >= 28,
    apply: s => {
      s.netWorth = Math.round(((s.netWorth ?? 0) + 2) * 10) / 10;
      s.fanbase = clamp(s.fanbase + 8, 0, 100);
    },
  },
  {
    id: 217, emoji: "🤝", title: "Retirement Tribute",
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
 * simMlbSeason right after judgeRivalSeason, the same point in the loop the
 * flagship and the NFL career roll their own. Returns null on a season with
 * nothing to show.
 */
export function mlbRivalryTick(c: MlbCareerState, rng: () => number = Math.random): RivalryEvent | null {
  if (!c.rival) return null;
  const lastId = c.lastRivalryEventId ?? null;
  const rolled = rollRivalryEvent(c, c.rival, lastId, MLB_RIVALRY_EVENTS, rng);
  if (rolled) return rolled;
  return forcedRetirementEvent(c, c.rival, lastId, MLB_RIVALRY_EVENTS, MLB_RIVAL_RETIRE_ID);
}

/**
 * Apply the pending event and clear it. Returns the state plus the lines the
 * board should push into its feed, the same {state, log} shape buyMlbItem
 * already returns for a shop purchase.
 */
export function dismissMlbRivalryEvent(c: MlbCareerState, rng: () => number = Math.random): { state: MlbCareerState; lines: string[] } {
  const s: MlbCareerState = { ...c };
  const lines: string[] = [];
  if (s.pendingRivalryEvent && s.rival) {
    const event = s.pendingRivalryEvent;
    applyRivalryEventFor(s, s.rival, event, MLB_RIVALRY_EVENTS, rng, line => lines.push(line));
    s.lastRivalryEventId = event.id;
  }
  s.pendingRivalryEvent = null;
  return { state: s, lines };
}
