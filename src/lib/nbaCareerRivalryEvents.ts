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

import type { NbaCareerState, NbaSeasonLine } from "./nbaMyCareer";
import type { CareerRival } from "./careerRival";
import {
  rollRivalryEvent, forcedRetirementEvent, applyRivalryEvent as applyRivalryEventFor,
} from "./careerRivalryEvents";
import type { RivalryEvent, RivalryEventDef } from "./careerRivalryEvents";
import { rivalryChoiceTick, resolvePendingRivalryChoice, meterOption } from "./careerRivalryChoices";
import type { RivalryChoiceDef, RivalryChoiceCard } from "./careerRivalryChoices";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The beat that fires forced, once, the season the rival retires. */
export const NBA_RIVAL_RETIRE_ID = 305;

/* Round 1112: who made the All-Star roster in the season the rival was last judged on. Mine is my own season
   of that year off the save (the engine picks All-Stars since Round 1103). His is the same pass on his line
   (nbaRivalSeason in nbaMyCareer.ts writes it on the rival). Null when the save's last season is not that
   year, so a beat that reads this is never dealt on two different seasons. */
export function nbaAllStarFacts(s: Pick<NbaCareerState, 'seasons'>, r: Pick<CareerRival, 'lastYear' | 'lastAllStar'>): { mine: boolean; his: boolean } | null {
  const last = s.seasons[s.seasons.length - 1];
  if (!last || r.lastYear !== last.year) return null;
  return { mine: !!last.allStar, his: r.lastAllStar === true };
}

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
  /* Round 1112: no coin. Until this round the beat flipped one for who made the roster, in a game whose
     engine has picked All-Stars for real since Round 1103, so the card could say you made it in a year your
     season card said you did not. Now it is dealt only when at least one of you made it, and it says and does
     only what those two facts support. */
  {
    id: 306, emoji: "🗳️", title: "All-Star Rosters",
    description: (s, r) => {
      const f = nbaAllStarFacts(s, r);
      if (f?.mine && f.his) return `The All-Star rosters are out, and you and ${r.name} are both on them.`;
      return f?.mine
        ? `The All-Star rosters are out. You are on one and ${r.name} is not.`
        : `The All-Star rosters are out. ${r.name} is on one and you are not.`;
    },
    consequence: (s, r) => {
      const f = nbaAllStarFacts(s, r);
      return f?.mine && f.his ? "Fanbase +3" : f?.mine ? "Morale +5" : "Morale -5";
    },
    when: (s, r) => { const f = nbaAllStarFacts(s, r); return !!f && (f.mine || f.his); },
    apply: (s, r, _rng, pushLine) => {
      const f = nbaAllStarFacts(s, r);
      if (!f) return;
      if (f.mine && f.his) { s.fanbase = clamp(s.fanbase + 3, 0, 100); pushLine(`🗳️ You and ${r.name} both made the All-Star roster.`); }
      else if (f.mine) { s.morale = clamp(s.morale + 5, 0, 100); pushLine(`🗳️ You made the All-Star roster and ${r.name} did not.`); }
      else if (f.his) { s.morale = clamp(s.morale - 5, 0, 100); pushLine(`🗳️ ${r.name} made the All-Star roster and you did not.`); }
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
  /* Round 918: six more beats, the same rules as the seventeen above. Gated
     only on fields the save and the rival already carry, narrated rather
     than quoted, and every consequence line says exactly what apply moves
     (the rivalry meter is flavor and is named without a number). */
  {
    id: 318, emoji: "🪞", title: "Same Spot, Same Night",
    description: (_s, r) => `${r.name} plays your position, and the schedule has the two of you guarding each other on opening night.`,
    consequence: "Morale +4, the rivalry heats up",
    /* Guarding each other needs two teams: the rival is drafted onto your
       own team and keeps it, so without the team check this beat mostly
       told a player to guard his own teammate (simNbaCareer R1). */
    when: (s, r) => !r.retired && r.pos === s.pos && r.team !== s.team,
    apply: s => {
      s.morale = clamp(s.morale + 4, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
    },
  },
  {
    id: 319, emoji: "💰", title: "The Bigger Number",
    description: (_s, r) => `${r.name} signs an extension, and every comment section has already decided it is bigger than yours.`,
    consequence: "Morale -4, Fanbase +2",
    when: (s, r) => !r.retired && r.ovr >= s.ovr,
    apply: s => {
      s.morale = clamp(s.morale - 4, 0, 100);
      s.fanbase = clamp(s.fanbase + 2, 0, 100);
    },
  },
  {
    id: 320, emoji: "📞", title: "The Deadline Rumor",
    description: (_s, r) => `The rumor at the deadline was that your team tried to trade for ${r.name}, and your contract was the salary going the other way.`,
    consequence: "Morale -6, the rivalry heats up",
    when: (s, r) => !r.retired && r.team !== s.team && r.ovr >= 82,
    apply: s => {
      s.morale = clamp(s.morale - 6, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
    },
  },
  {
    id: 321, emoji: "☀️", title: "Summer Pickup",
    description: (_s, r) => `${r.name} turns up at the summer pickup run you have played in for years. Neither of you leaves until the gym closes.`,
    consequence: "Morale +3, the rivalry heats up",
    when: (s, r) => !r.retired && s.age <= 30,
    apply: s => {
      s.morale = clamp(s.morale + 3, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
    },
  },
  {
    id: 322, emoji: "👕", title: "Wrong Jersey",
    description: (_s, r) => `A kid at your youth camp shows up in a ${r.name} jersey. You sign it anyway, right under his number.`,
    consequence: "Fanbase +6",
    when: s => s.age >= 26,
    apply: s => { s.fanbase = clamp(s.fanbase + 6, 0, 100); },
  },
  {
    id: 323, emoji: "💍", title: "Count the Rings",
    description: (_s, r) => `You and ${r.name} both have rings now, so the argument has moved on to who has more.`,
    consequence: "Fanbase +4, the rivalry heats up",
    when: (s, r) => s.rings >= 1 && r.rings >= 1,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 4, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
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
export function nbaRivalryTick(c: NbaCareerState, rng: () => number = Math.random, season?: NbaSeasonLine): RivalryEvent | null {
  if (!c.rival) return null;
  /* Round 1112: simNbaSeason rolls this before the season is on the save, and a beat may read the season (306
     does), so the gates and the words see the save as it stands once the season is on it. Nothing is drawn
     for it and nothing is written. */
  const p = season ? { ...c, seasons: [...c.seasons, season] } : c;
  const lastId = c.lastRivalryEventId ?? null;
  const rolled = rollRivalryEvent(p, c.rival, lastId, NBA_RIVALRY_EVENTS, rng);
  if (rolled) return rolled;
  return forcedRetirementEvent(p, c.rival, lastId, NBA_RIVALRY_EVENTS, NBA_RIVAL_RETIRE_ID);
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

/* ─── Round 796: rivalry choices ─────────────────────────────────────────────

   The NBA's half of what the NFL career got this round: the rival puts a
   decision in front of you, on the shared engine careerRivalryChoices.ts.
   Basketball words and basketball moments (the flagrant, the All-Star vote,
   the max deal), the same meters the NFL table moves, written from plain
   numbers through meterOption so the button cannot promise one thing and do
   another. Morale feeds simNbaSeason's form, so the morale options are a real
   lever on the next stat line. One card a season at most, and only in a
   season the beat roll above came up empty. */

/** The chance a season with no beat brings a choice instead. */
export const NBA_RIVALRY_CHOICE_CHANCE = 0.45;

const opt = (spec: Parameters<typeof meterOption>[0]) => meterOption<NbaCareerState, CareerRival>(spec);

export const NBA_RIVALRY_CHOICES: RivalryChoiceDef<NbaCareerState, CareerRival>[] = [
  {
    id: "nba_rival_flagrant", emoji: "💥", title: "THE FLAGRANT",
    description: (_s, r) => `${r.name} took you out on a drive and the refs upgraded it to a flagrant at the monitor. Your bench wants him to feel it the next time you two meet.`,
    when: () => true,
    choices: [
      opt({
        label: "Give it right back", emoji: "😈",
        promise: { effect: { heat: 25 }, risk: { chance: 0.3, hit: { morale: -5, fanbase: -5, cash: -0.1 }, miss: { morale: 8 } } },
        riskNote: "you're the one who gets tossed",
        hitLine: r => `🚩 You went looking for ${r} and picked up two techs yourself. Tossed, fined, and the fans did not love it.`,
        missLine: r => `😈 You went right at ${r} the next time down and scored through the contact. The whole bench lost it.`,
      }),
      opt({
        label: "Help him up on camera", emoji: "🕊️",
        promise: { effect: { fanbase: 5, karma: 5, heat: -15 } },
        line: r => `🕊️ You walked over and helped ${r} up. The grown up in the building, and the fans noticed.`,
      }),
      opt({
        label: "Say nothing, watch the film", emoji: "🎞️",
        promise: { effect: { morale: 6, heat: 10 } },
        line: r => `🎞️ Not a word. You watched the play on loop and circled the next game against ${r}.`,
      }),
    ],
  },
  {
    id: "nba_rival_debate_show", emoji: "🎤", title: "THE DEBATE SHOW",
    description: (_s, r) => `A sports network offers $2M for one live hour: you against a panel arguing ${r.name} is better. No script, one microphone.`,
    when: s => s.ovr >= 85,
    choices: [
      opt({
        label: "Go on and cook them", emoji: "🔥",
        promise: { effect: { cash: 2 }, risk: { chance: 0.35, hit: { fanbase: -8 }, miss: { fanbase: 6 } } },
        riskNote: "a clip goes viral for the wrong reasons",
        hitLine: () => "🎤 You went on the show and one heated clip went viral for the wrong reasons. The check cleared anyway.",
        missLine: () => "🔥 You cooked the whole panel live. The check cleared and the clip ends arguments.",
      }),
      opt({
        label: "Post a mixtape instead", emoji: "📼",
        promise: { effect: { fanbase: 8 } },
        line: () => "📼 You posted four minutes of buckets and no caption. It out-rated the show.",
      }),
      opt({
        label: "Decline. No debate.", emoji: "😎",
        promise: { effect: { morale: 5, karma: 3 } },
        line: r => `😎 You passed. Let them argue about you and ${r} without you.`,
      }),
    ],
  },
  {
    id: "nba_rival_youth_camp", emoji: "💛", title: "TRUCE FOR ONE DAY",
    description: (_s, r) => `${r.name}'s foundation asks you to co-host a free youth camp. Same gym, same whistle, one day only. A photo of you two coaching side by side would be everywhere.`,
    when: () => true,
    choices: [
      opt({
        label: "Co-host and split the bill", emoji: "🤝",
        promise: { effect: { cash: -1, fanbase: 10, karma: 8, heat: -20 } },
        line: r => `💛 One day, one gym, two hundred kids. You and ${r} split the bill and the feud took the day off.`,
      }),
      opt({
        label: "Show up and talk trash all day", emoji: "😉",
        promise: { effect: { fanbase: 12, heat: 5 } },
        line: r => `😉 The camp turned into a trash talk show between you and ${r}. The kids loved every second.`,
      }),
      opt({
        label: "Send a check, skip it", emoji: "💸",
        promise: { effect: { cash: -1, karma: 3 } },
        line: () => "💸 You sent the check and skipped the cameras. The quiet kind of good.",
      }),
    ],
  },
  {
    id: "nba_rival_allstar_vote", emoji: "🗳️", title: "THE ALL-STAR VOTE",
    description: (_s, r) => `All-Star fan voting is open and ${r.name}'s team is running ads for him everywhere. Your team's social people want to run one for you too.`,
    when: (s, r) => s.ovr >= 80 && r.ovr >= 80,
    choices: [
      opt({
        label: "Run the campaign", emoji: "📣",
        promise: { effect: { cash: -0.2, fanbase: 6, morale: 2 } },
        line: () => "📣 Your face went up on every screen in the arena. Paid for it yourself, too.",
      }),
      opt({
        label: "Let the box scores talk", emoji: "🧊",
        promise: { effect: { morale: 4 } },
        line: () => "🧊 No ads, no posts. Just the box scores.",
      }),
      opt({
        label: "Call out the vote buying", emoji: "🎯",
        promise: { effect: { heat: 15 }, risk: { chance: 0.4, hit: { fanbase: -6 }, miss: { fanbase: 8 } } },
        riskNote: "it reads as sour grapes",
        hitLine: r => `🍇 You called out ${r}'s ad money and it read as sour grapes. The replies were rough.`,
        missLine: r => `🎯 You called out ${r}'s ad money and the fans ran with it. Your name trended all week.`,
      }),
    ],
  },
  {
    id: "nba_rival_max_deal", emoji: "💰", title: "THE BIGGER DEAL",
    description: (_s, r) => `${r.name} just signed a max extension bigger than anything at your position. Your phone has not stopped buzzing.`,
    when: (s, r) => s.age >= 24 && r.ovr >= s.ovr - 3,
    choices: [
      opt({
        label: "Congratulate him publicly", emoji: "👏",
        promise: { effect: { fanbase: 4, karma: 5, heat: -10 } },
        line: r => `👏 You posted a congrats for ${r}. Classy, and people noticed.`,
      }),
      opt({
        label: "Use it as fuel", emoji: "🔥",
        promise: { effect: { morale: 6, heat: 10 } },
        line: r => `🔥 You screenshotted ${r}'s contract and made it your lock screen.`,
      }),
      opt({
        label: "Complain to the press", emoji: "📰",
        promise: { effect: { morale: 2, karma: -6 }, risk: { chance: 0.5, hit: { fanbase: -6 }, miss: { fanbase: 3 } } },
        riskNote: "the fans side with him",
        hitLine: r => `📰 You told reporters ${r}'s deal was a joke. The fans took his side.`,
        missLine: () => "📰 You told reporters you are underpaid. Half the city agreed with you.",
      }),
    ],
  },
  {
    id: "nba_rival_reunion", emoji: "🎓", title: "DRAFT CLASS REUNION",
    description: (_s, r) => `A network is doing a five years later piece on your draft class and wants you and ${r.name} on set together.`,
    when: s => s.seasons.length >= 5,
    choices: [
      opt({
        label: "Do it together", emoji: "🤝",
        promise: { effect: { fanbase: 6, heat: -10 } },
        line: r => `🤝 You and ${r} told draft night stories for an hour. Best thing the network aired all month.`,
      }),
      opt({
        label: "Do it, but only your highlights", emoji: "🎬",
        promise: { effect: { fanbase: 4, morale: 2, heat: 5 } },
        line: () => "🎬 You did the piece and made sure the cut was all your plays.",
      }),
      opt({
        label: "Skip it", emoji: "🙅",
        promise: { effect: { morale: 1 } },
        line: () => "🙅 You skipped it. Nostalgia can wait until you're done.",
      }),
    ],
  },
];

/** One season's choice roll, after the beat roll in simNbaSeason, on the
 *  shared tick: only when no beat came up and no choice is already waiting. */
export function nbaRivalryChoiceTick(c: NbaCareerState, rng?: () => number): RivalryChoiceCard | null {
  return rivalryChoiceTick(c, NBA_RIVALRY_CHOICES, NBA_RIVALRY_CHOICE_CHANCE, rng);
}

/** Answer the pending choice; null when nothing is pending or the option
 *  does not exist (a double tap changes nothing). */
export function resolveNbaRivalryChoice(
  c: NbaCareerState, choiceIdx: number, rng: () => number = Math.random,
): { state: NbaCareerState; line: string } | null {
  return resolvePendingRivalryChoice(c, choiceIdx, NBA_RIVALRY_CHOICES, rng);
}
