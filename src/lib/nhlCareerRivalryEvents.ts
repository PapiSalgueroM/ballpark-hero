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

import type { NhlCareerState, NhlSeasonLine } from "./nhlMyCareer";
import type { CareerRival } from "./careerRival";
import {
  rollRivalryEvent, forcedRetirementEvent, applyRivalryEvent as applyRivalryEventFor, withSeasonPlayed, ownRosterBeat, ALL_STAR_OWN_ROSTER,
} from "./careerRivalryEvents";
import type { RivalryEvent, RivalryEventDef } from "./careerRivalryEvents";
import { rivalryChoiceTick, resolvePendingRivalryChoice, meterOption } from "./careerRivalryChoices";
import type { RivalryChoiceDef, RivalryChoiceCard } from "./careerRivalryChoices";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The beat that fires forced, once, the season the rival retires. */
export const NHL_RIVAL_RETIRE_ID = 305;
/** Round 1149: the award word simNhlSeason writes on a season that made the All-Star roster. Beat 306 reads it. */
export const NHL_ROSTER_AWARD = 'All-Star';

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
  /* Round 1149: no coin. The beat flipped one for which of you made the All-Star ballot, in a game whose
     engine picks All-Stars for real (nhlAllStar in careerAwards.ts), so the card could say you made it in a
     year your own season card said you did not. It is read off your own season now, the one just played, on
     the builder MLB's 206 uses (ownRosterBeat in careerRivalryEvents.ts, where the rule is written): you made
     it, or you are off it a year after you were on it. The NHL rival's season is not on your stat line yet, so
     nothing here says whether HE made a roster. */
  ownRosterBeat<NhlCareerState, CareerRival>({ id: 306, award: NHL_ROSTER_AWARD, ...ALL_STAR_OWN_ROSTER }),
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
  /* Round 920: six more beats, the same rules as the seventeen above and
     the same six moments the NBA table gained in Round 918, told in hockey.
     Gated only on fields the save and the rival already carry, narrated
     rather than quoted, and every consequence line says exactly what apply
     moves (the rivalry meter is flavor and is named without a number). */
  {
    id: 318, emoji: "🪞", title: "Matched Up",
    description: (_s, r) => `${r.name} plays your position, and his coach has him out against you every shift tonight.`,
    consequence: "Morale +4, the rivalry heats up",
    when: (s, r) => !r.retired && r.pos === s.pos && r.team !== s.team,
    apply: s => {
      s.morale = clamp(s.morale + 4, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
    },
  },
  {
    id: 319, emoji: "💰", title: "The Bigger Cap Hit",
    description: (_s, r) => `${r.name} signs an extension, and every comment section has already decided his number is bigger than yours.`,
    consequence: "Morale -4, Fanbase +2",
    when: (s, r) => !r.retired && r.ovr >= s.ovr,
    apply: s => {
      s.morale = clamp(s.morale - 4, 0, 100);
      s.fanbase = clamp(s.fanbase + 2, 0, 100);
    },
  },
  {
    id: 320, emoji: "📞", title: "The Deadline Rumor",
    description: (_s, r) => `The rumor at the deadline was that your club tried to trade for ${r.name}, and your contract was the money going the other way.`,
    consequence: "Morale -6, the rivalry heats up",
    when: (s, r) => !r.retired && r.team !== s.team && r.ovr >= 82,
    apply: s => {
      s.morale = clamp(s.morale - 6, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
    },
  },
  {
    id: 321, emoji: "☀️", title: "Summer Shinny",
    description: (_s, r) => `${r.name} turns up at the summer skate you have run for years. Nobody leaves the ice until they turn the lights off.`,
    consequence: "Morale +3, the rivalry heats up",
    when: (s, r) => !r.retired && s.age <= 30,
    apply: s => {
      s.morale = clamp(s.morale + 3, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
    },
  },
  {
    id: 322, emoji: "👕", title: "Wrong Sweater",
    description: (_s, r) => `A kid at your hockey school shows up in a ${r.name} sweater. You sign it anyway, right under his number.`,
    consequence: "Fanbase +6",
    when: s => s.age >= 26,
    apply: s => { s.fanbase = clamp(s.fanbase + 6, 0, 100); },
  },
  {
    id: 323, emoji: "🏆", title: "Count the Cups",
    description: (_s, r) => `You and ${r.name} have both lifted the Cup now, so the argument has moved on to who has more.`,
    consequence: "Fanbase +4, the rivalry heats up",
    when: (s, r) => s.cups >= 1 && r.rings >= 1,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 4, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
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
export function nhlRivalryTick(c: NhlCareerState, rng: () => number, season: NhlSeasonLine): RivalryEvent | null {
  if (!c.rival) return null;
  /* Round 1149: simNhlSeason rolls this before the season is on the save, and beat 306 reads the season, so
     the gates and the words see the save as it stands once the season is on it (the season is required: a
     roll without it would read last year's). Nothing is drawn for it and nothing is written. */
  const p = withSeasonPlayed(c, season);
  const lastId = c.lastRivalryEventId ?? null;
  const rolled = rollRivalryEvent(p, c.rival, lastId, NHL_RIVALRY_EVENTS, rng);
  if (rolled) return rolled;
  return forcedRetirementEvent(p, c.rival, lastId, NHL_RIVALRY_EVENTS, NHL_RIVAL_RETIRE_ID);
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

/* ─── Round 796: rivalry choices ─────────────────────────────────────────────

   The NHL's half of what the NFL career got this round: the rival puts a
   decision in front of you, on the shared engine careerRivalryChoices.ts.
   Hockey words and hockey moments (the cheap shot after the whistle, the
   All-Star vote, the big extension), the same meters the NFL table moves,
   written from plain numbers through meterOption so the button cannot promise
   one thing and do another. Morale feeds simNhlSeason's form, so the morale
   options are a real lever on the next stat line. Every line works for a
   goalie and a skater alike, because the rival plays your position. One card
   a season at most, and only in a season the beat roll came up empty. */

/** The chance a season with no beat brings a choice instead. */
export const NHL_RIVALRY_CHOICE_CHANCE = 0.45;

const opt = (spec: Parameters<typeof meterOption>[0]) => meterOption<NhlCareerState, CareerRival>(spec);

export const NHL_RIVALRY_CHOICES: RivalryChoiceDef<NhlCareerState, CareerRival>[] = [
  {
    id: "nhl_rival_cheap_shot", emoji: "🏒", title: "THE CHEAP SHOT",
    description: (_s, r) => `${r.name} got away with a cheap shot after the whistle on Saturday, no call. Your bench wants him to answer for it the next time you two meet.`,
    when: () => true,
    choices: [
      opt({
        label: "Settle it next game", emoji: "😈",
        promise: { effect: { heat: 25 }, risk: { chance: 0.3, hit: { morale: -5, fanbase: -5, cash: -0.1 }, miss: { morale: 8 } } },
        riskNote: "you're the one who gets the penalty",
        hitLine: r => `🚨 You went after ${r} after the whistle and the league fined you for it. The fans did not love it.`,
        missLine: r => `😈 You got your answer in on ${r}, clean enough that the stripes let it go. The whole bench lost it.`,
      }),
      opt({
        label: "Shrug it off on camera", emoji: "🕊️",
        promise: { effect: { fanbase: 5, karma: 5, heat: -15 } },
        line: r => `🕊️ You shrugged it off on camera and called ${r} a good player. The grown up in the rink, and the fans noticed.`,
      }),
      opt({
        label: "Say nothing, watch the tape", emoji: "🎞️",
        promise: { effect: { morale: 6, heat: 10 } },
        line: r => `🎞️ Not a word. You watched the shift on loop and circled the next game against ${r}.`,
      }),
    ],
  },
  {
    id: "nhl_rival_debate_show", emoji: "🎤", title: "THE DEBATE SHOW",
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
        label: "Post a highlight reel instead", emoji: "📼",
        promise: { effect: { fanbase: 8 } },
        line: () => "📼 You posted four minutes of tape and no caption. It out-rated the show.",
      }),
      opt({
        label: "Decline. No debate.", emoji: "😎",
        promise: { effect: { morale: 5, karma: 3 } },
        line: r => `😎 You passed. Let them argue about you and ${r} without you.`,
      }),
    ],
  },
  {
    id: "nhl_rival_youth_clinic", emoji: "💛", title: "TRUCE FOR ONE DAY",
    description: (_s, r) => `${r.name}'s foundation asks you to co-host a free youth hockey clinic. Same rink, same whistle, one day only. A photo of you two coaching side by side would be everywhere.`,
    when: () => true,
    choices: [
      opt({
        label: "Co-host and split the bill", emoji: "🤝",
        promise: { effect: { cash: -1, fanbase: 10, karma: 8, heat: -20 } },
        line: r => `💛 One day, one sheet of ice, two hundred kids. You and ${r} split the bill and the feud took the day off.`,
      }),
      opt({
        label: "Show up and chirp all day", emoji: "😉",
        promise: { effect: { fanbase: 12, heat: 5 } },
        line: r => `😉 The clinic turned into a chirping contest between you and ${r}. The kids loved every second.`,
      }),
      opt({
        label: "Send a check, skip it", emoji: "💸",
        promise: { effect: { cash: -1, karma: 3 } },
        line: () => "💸 You sent the check and skipped the cameras. The quiet kind of good.",
      }),
    ],
  },
  {
    id: "nhl_rival_allstar_vote", emoji: "🗳️", title: "THE ALL-STAR VOTE",
    description: (_s, r) => `All-Star fan voting is open and ${r.name}'s team is running ads for him everywhere. Your team's social people want to run one for you too.`,
    when: (s, r) => s.ovr >= 80 && r.ovr >= 80,
    choices: [
      opt({
        label: "Run the campaign", emoji: "📣",
        promise: { effect: { cash: -0.2, fanbase: 6, morale: 2 } },
        line: () => "📣 Your face went up on every board in the rink. Paid for it yourself, too.",
      }),
      opt({
        label: "Let the stats talk", emoji: "🧊",
        promise: { effect: { morale: 4 } },
        line: () => "🧊 No ads, no posts. Just the stats.",
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
    id: "nhl_rival_big_deal", emoji: "💰", title: "THE BIGGER DEAL",
    description: (_s, r) => `${r.name} just signed the richest extension anyone at your position has ever seen. Your phone has not stopped buzzing.`,
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
    id: "nhl_rival_reunion", emoji: "🎓", title: "DRAFT CLASS REUNION",
    description: (_s, r) => `A network is doing a five years later piece on your draft class and wants you and ${r.name} on set together.`,
    when: s => s.seasons.length >= 5,
    choices: [
      opt({
        label: "Do it together", emoji: "🤝",
        promise: { effect: { fanbase: 6, heat: -10 } },
        line: r => `🤝 You and ${r} told junior hockey stories for an hour. Best thing the network aired all month.`,
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

/** One season's choice roll, after the beat roll in simNhlSeason, on the
 *  shared tick: only when no beat came up and no choice is already waiting. */
export function nhlRivalryChoiceTick(c: NhlCareerState, rng?: () => number): RivalryChoiceCard | null {
  return rivalryChoiceTick(c, NHL_RIVALRY_CHOICES, NHL_RIVALRY_CHOICE_CHANCE, rng);
}

/** Answer the pending choice; null when nothing is pending or the option
 *  does not exist (a double tap changes nothing). */
export function resolveNhlRivalryChoice(
  c: NhlCareerState, choiceIdx: number, rng: () => number = Math.random,
): { state: NhlCareerState; line: string } | null {
  return resolvePendingRivalryChoice(c, choiceIdx, NHL_RIVALRY_CHOICES, rng);
}
