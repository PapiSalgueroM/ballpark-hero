/* ─── Round 521: the NFL career's rivalry events ─────────────────────────────

   His 2026-08-28 backlog still marks the Soccer Career depth gap open for
   the NFL career on two items: interactive rivalry events, and an inbox.
   This file is the first one, on the engine careerRivalryEvents.ts lifted
   from the flagship's eighteen beats, bound to the NFL the same way
   nflCareerMoney.ts binds the bank.

   The rival is the SAME rival every other screen already uses: careerRival.ts's
   draftRival, drafted alongside the player and simulated every season by
   judgeRivalSeason inside simSeason in nflMyCareer.ts. This file adds no
   second rival concept, it only adds narrative beats on top of the one that
   already exists.

   WHAT CHANGED FROM THE FLAGSHIP'S TABLE, and why. CareerRival (careerRival.ts)
   tracks name, position, team, overall, potential, age, rings, the head to
   head record and his last season's line: no nationality, no club tier, no
   Ballon d'Or, none of the soccer-specific fields the flagship's table gates
   on, because an NFL career has none of those things. So every gate below is
   read off what an NFL rival's save actually carries, and the flagship's
   nationality beat and club-tier beat become an NFL locker room's own
   equivalents: the same team (still a "he is your teammate now" beat) and
   the head to head record standing in for the armband snub and the chase.
   Seventeen beats rather than eighteen: the flagship's roster picked ten
   soccer-specific beats (a Ballon d'Or, a Champions League run, a nationality
   match) that have no honest NFL equivalent, and inventing one would be
   filling a gap with something plausible, which CLAUDE.md rules out.
   Round 917 added six more (218 to 223), twenty three in all, each one a
   thing a football year has in any era the game offers: the schedule
   release, a joint practice, a market reset, an all star week, a re-draft
   column and a captaincy. None of them needed a field the rival does not
   already carry.

   LEGAL SHAPE. Every description narrates the rival ("tells reporters",
   "announces", "invites you") rather than quoting him, the same rule the
   flagship's table already follows, and the rival's name is proven never to
   collide with a real player: scripts/simInventedNames.mjs section 2c
   already enumerates careerRival.ts's FIRST and LAST banks against the
   site's whole real-name harvest (8,835 names as of this round, Patrick
   Mahomes and every other real player in nflCareerPlayers.ts and
   frontOfficePlayers.ts among them) and finds zero collisions.
   scripts/simCareerRivalryEvents.mjs re-proves that as its own explicit
   section rather than trusting the existing green run. */

import type { CareerState, SeasonLine } from "./nflMyCareer";
import type { CareerRival } from "./careerRival";
import {
  rollRivalryEvent, forcedRetirementEvent, applyRivalryEvent as applyRivalryEventFor, factBeat, withSeasonPlayed, ownRosterBeat,
} from "./careerRivalryEvents";
import type { RivalryEvent, RivalryEventDef } from "./careerRivalryEvents";
import { rivalryChoiceTick, resolvePendingRivalryChoice, meterOption } from "./careerRivalryChoices";
import type { RivalryChoiceDef, RivalryChoiceCard } from "./careerRivalryChoices";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The beat that fires forced, once, the season the rival retires. */
export const NFL_RIVAL_RETIRE_ID = 205;
/** Round 1149: the award word simSeason writes on a first team All-Pro season. Beat 206 reads it. */
export const NFL_ROSTER_AWARD = 'All-Pro';

/* Twenty three beats (seventeen, plus Round 917's six at the end), gated on
   what an NFL rival's save actually tracks:
   rings, overall, team, age, and the head to head record judgeRivalSeason
   already keeps. Every mutation lands on fields the NFL career already
   has (morale, fanbase, netWorth, and the optional rivalryIntensity this
   round adds alongside pendingRivalryEvent), the same as the flagship's
   table lands on soccer's own fields. */
export const NFL_RIVALRY_EVENTS: RivalryEventDef<CareerState, CareerRival>[] = [
  {
    id: 201, emoji: "💍", title: "Rival Gets His Ring",
    description: (_s, r) => `${r.name} just won a ring. You are still chasing your first.`,
    consequence: "Motivation boost: Morale -5, focus sharpens",
    when: (s, r) => r.rings > 0 && s.rings === 0,
    apply: s => { s.morale = clamp(s.morale - 5, 0, 100); },
  },
  {
    id: 202, emoji: "📋", title: "Roster Squeeze",
    description: (_s, r) => `Word around the building is the front office is choosing between you and ${r.name} for the same cap space.`,
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
    id: 204, emoji: "🏈", title: "Head to Head Win",
    description: (_s, r) => `Your team beat ${r.name}'s team this season, and you had the better box score.`,
    consequence: "Fanbase +5, confidence boost",
    when: () => true,
    apply: s => { s.fanbase = clamp(s.fanbase + 5, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); },
  },
  {
    id: NFL_RIVAL_RETIRE_ID, emoji: "👋", title: "Rival Retires",
    description: (_s, r) => `${r.name} announces retirement. He calls the rivalry the best thing that ever happened to his career.`,
    consequence: "Legacy +10, end of an era",
    when: (_s, r) => r.retired,
    apply: s => { s.fanbase = clamp(s.fanbase + 10, 0, 100); },
  },
  /* Round 1149: no coin, and no ballot the game never holds. The beat flipped a coin for which of you made
     "the Pro Bowl ballot". simSeason picks no Pro Bowl: the one all league honour it decides is the first team
     All-Pro (allPro in careerAwards.ts), which is on your season card and in your Trophy Case. So the beat is
     about that team now, read off your own record on the builder MLB's 206 and the NHL's 306 use
     (ownRosterBeat in careerRivalryEvents.ts, where the rule is written): you made the first team, or you are
     off it a year after you were on it. The NFL rival's season is not on your stat line yet, so nothing here
     says whether HE made a team. */
  ownRosterBeat<CareerState, CareerRival>({
    id: 206, emoji: "🗳️", title: "All-Pro Team", award: NFL_ROSTER_AWARD,
    made: {
      description: r => `The All-Pro team is out and you are on the first team. It goes down as one more line in the argument between you and ${r.name}.`,
      line: "🗳️ You were named first team All-Pro.",
    },
    dropped: {
      description: r => `The All-Pro team is out and you are not on the first team, a year after you were. It goes down as one more line in the argument between you and ${r.name}.`,
      line: "🗳️ You were left off the All-Pro first team.",
    },
  }),
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
    id: 210, emoji: "🤬", title: "Sideline Scuffle",
    description: (_s, r) => `Cameras catch you and ${r.name} jawing at midfield after the whistle. It is the only clip anybody is talking about Monday.`,
    consequence: "Rivalry intensifies, Fanbase +3",
    when: () => true,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 3, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 15, 0, 100);
    },
  },
  {
    id: 211, emoji: "📉", title: "Losing the Head to Head",
    description: (_s, r) => `${r.name} is pulling away in the head to head. Every broadcast mentions it now.`,
    consequence: "Motivation surges",
    when: (_s, r) => r.hisYears >= 3 && r.hisYears > r.myYears,
    apply: s => {
      s.morale = clamp(s.morale + 2, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 5, 0, 100);
    },
  },
  {
    id: 212, emoji: "📊", title: "Winning the Head to Head",
    description: (_s, r) => `You are pulling away in the head to head against ${r.name}, and the league has noticed.`,
    consequence: "Fanbase +5",
    when: (_s, r) => r.myYears >= 3 && r.myYears > r.hisYears,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 5, 0, 100);
    },
  },
  {
    id: 213, emoji: "👕", title: "The Jersey Swap",
    description: (_s, r) => `After a hard fought game, you and ${r.name} trade jerseys at midfield. The photo is everywhere by Monday morning.`,
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
  /* Round 917: six more, each one a thing a football year really has (a
     schedule release, a joint practice, a market reset, an all star week, a
     re-draft column, a captaincy). Same rules as the seventeen above: gated
     on what the rival's save carries, narrated and never quoted, and every
     consequence line says what the apply does. The rival is drafted onto
     the player's own team (draftRival in careerRival.ts takes c.team), so a
     beat that only reads right with the two of you on different teams (218,
     219, 221, 223) gates on r.team !== s.team. The engine's team tables carry
     no conference, so no beat promises a game the schedule may not hold (218
     bills the promos, not a meeting) or a shared sideline (the all star game
     is one conference against the other, so 221 says only that the two of
     you spend the week around each other). */
  {
    id: 218, emoji: "🌙", title: "Prime Time Billing",
    description: (_s, r) => `The schedule comes out and the network builds its prime time promos around you and ${r.name}, your faces side by side. The whole country gets the two of you now.`,
    consequence: "Fanbase +6, rivalry intensifies",
    when: (s, r) => !r.retired && r.team !== s.team && s.fanbase >= 55,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 6, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
    },
  },
  /* Round 1149: no coin. The beat flipped one for who got the better of the joint practices, a result the
     game plays nowhere and records nowhere, so there is no fact to read it off. The card's own words say there
     is no scoreboard, and now nothing claims a winner: the week sharpens you and heats the rivalry, the shape
     the NBA's summer pickup run (321) already has. It is built on factBeat with its one card so a save
     sitting on the old "50/50 outcome" card resolves with no effect, like every beat that left its coin. */
  factBeat<CareerState, CareerRival>({
    id: 219, emoji: "🥊", title: "Joint Practice",
    cards: [
      {
        when: (s, r) => !r.retired && r.team !== s.team,
        description: (_s, r) => `Your team and ${r.name}'s team share a field for joint practices in camp. No scoreboard, and everybody keeps score.`,
        consequence: "Morale +3, rivalry intensifies",
        move: s => {
          s.morale = clamp(s.morale + 3, 0, 100);
          s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
        },
        line: (_s, r) => `🥊 A week of joint practices against ${r.name}'s team, and neither of you gave an inch. Morale +3.`,
      },
    ],
  }),
  {
    id: 220, emoji: "💰", title: "Rival Resets the Market",
    description: (_s, r) => `${r.name} just signed the biggest deal anyone at the position has seen. Every story about it mentions your name in the second paragraph.`,
    consequence: "Morale -3, rivalry intensifies",
    when: (_s, r) => !r.retired && r.ovr >= 84,
    apply: s => {
      s.morale = clamp(s.morale - 3, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 8, 0, 100);
    },
  },
  {
    id: 221, emoji: "🌺", title: "All Star Week",
    description: (_s, r) => `You and ${r.name} both make the all star roster and spend the week around each other. It turns out he is easy to like.`,
    consequence: "Fanbase +4, the feud softens",
    when: (s, r) => !r.retired && r.team !== s.team && s.ovr >= 82 && r.ovr >= 82,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 4, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 10, 0, 100);
    },
  },
  {
    id: 222, emoji: "🔁", title: "The Re-Draft",
    description: (_s, r) => `A national column re-drafts your class with everything known now, and it comes down to you or ${r.name} near the top.`,
    consequence: "Ranked by today's rating: Fanbase +5 or Morale -4",
    when: s => s.age >= 25,
    apply: (s, r, _rng, pushLine) => {
      if (s.ovr >= r.ovr) { s.fanbase = clamp(s.fanbase + 5, 0, 100); pushLine(`🔁 The re-draft takes you ahead of ${r.name}. Fanbase +5.`); }
      else { s.morale = clamp(s.morale - 4, 0, 100); pushLine(`🔁 The re-draft takes ${r.name} ahead of you. Morale -4.`); }
    },
  },
  {
    id: 223, emoji: "🎖️", title: "Rival Named Captain",
    description: (_s, r) => `${r.name}'s teammates voted him a captain. He is the one walking out for the coin toss the next time your teams meet.`,
    consequence: "Morale -2, rivalry intensifies",
    when: (s, r) => !r.retired && r.team !== s.team && r.age >= 26,
    apply: s => {
      s.morale = clamp(s.morale - 2, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 6, 0, 100);
    },
  },
];

/**
 * One season's rivalry roll: the coin flip while the rival is still playing,
 * or the forced retirement beat the one season he hangs it up. Called from
 * simSeason right after judgeRivalSeason, the same point in the loop the
 * flagship rolls its own. Returns null on a season with nothing to show.
 */
export function nflRivalryTick(c: CareerState, rng: () => number, season: SeasonLine): RivalryEvent | null {
  if (!c.rival) return null;
  /* Round 1149: simSeason rolls this before the season is on the save, and beat 206 reads the season, so the
     gates and the words see the save as it stands once the season is on it (the season is required: a roll
     without it would read last year's). Nothing is drawn for it and nothing is written. */
  const p = withSeasonPlayed(c, season);
  const lastId = c.lastRivalryEventId ?? null;
  const rolled = rollRivalryEvent(p, c.rival, lastId, NFL_RIVALRY_EVENTS, rng);
  if (rolled) return rolled;
  return forcedRetirementEvent(p, c.rival, lastId, NFL_RIVALRY_EVENTS, NFL_RIVAL_RETIRE_ID);
}

/**
 * Apply the pending event and clear it. Returns the state plus the lines the
 * board should push into its feed, the same {state, log} shape buyNflItem
 * already returns for a shop purchase.
 */
export function dismissNflRivalryEvent(c: CareerState, rng: () => number = Math.random): { state: CareerState; lines: string[] } {
  const s: CareerState = { ...c };
  const lines: string[] = [];
  if (s.pendingRivalryEvent && s.rival) {
    const event = s.pendingRivalryEvent;
    applyRivalryEventFor(s, s.rival, event, NFL_RIVALRY_EVENTS, rng, line => lines.push(line));
    s.lastRivalryEventId = event.id;
  }
  s.pendingRivalryEvent = null;
  return { state: s, lines };
}

/* ─── Round 796: rivalry choices ─────────────────────────────────────────────

   The beats above happen TO you. These put a decision in front of you, the
   NFL's version of Soccer Career's four rival dilemmas, on the shared engine
   careerRivalryChoices.ts lifted from them. Every option is written from
   plain numbers (meterOption), so the promise printed on the button is
   generated from the same numbers the tap applies, and every number lands on
   a meter the career already tracks and shows: morale (which feeds the
   season's form, so it is a real lever on the next stat line), fanbase,
   net worth, karma, and the feud's own heat.

   One card a season at most: a choice is only rolled in a season the beat
   roll above came up empty, so a season never stacks two rival cards. */

/** The chance a season with no beat brings a choice instead. */
export const NFL_RIVALRY_CHOICE_CHANCE = 0.45;

const opt = (spec: Parameters<typeof meterOption>[0]) => meterOption<CareerState, CareerRival>(spec);

export const NFL_RIVALRY_CHOICES: RivalryChoiceDef<CareerState, CareerRival>[] = [
  {
    id: "nfl_rival_late_hit", emoji: "🦵", title: "THE LATE HIT",
    description: (_s, r) => `${r.name} drilled you a full second after the whistle on Sunday. The flag flew, the fine is coming, and your sideline wants payback the next time you two meet.`,
    when: () => true,
    choices: [
      opt({
        label: "Settle it next time", emoji: "😈",
        promise: { effect: { heat: 25 }, risk: { chance: 0.3, hit: { morale: -5, fanbase: -5, cash: -0.1 }, miss: { morale: 8 } } },
        riskNote: "you're the one who draws the flag",
        hitLine: r => `🚩 You went looking for ${r} and drew the flag yourself. Fined, and the fans did not love it.`,
        missLine: r => `😈 You got your shot in on ${r}, clean enough to keep the flag in the pocket. The whole sideline lost it.`,
      }),
      opt({
        label: "Shake it off on camera", emoji: "🕊️",
        promise: { effect: { fanbase: 5, karma: 5, heat: -15 } },
        line: r => `🕊️ You shook it off on camera and called ${r} a good player. The grown up in the room, and the fans noticed.`,
      }),
      opt({
        label: "Say nothing, watch the film", emoji: "🎞️",
        promise: { effect: { morale: 6, heat: 10 } },
        line: r => `🎞️ Not a word. You watched the hit on loop and circled the next game against ${r}.`,
      }),
    ],
  },
  {
    id: "nfl_rival_debate_show", emoji: "🎤", title: "THE DEBATE SHOW",
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
        label: "Send a highlight reel instead", emoji: "📼",
        promise: { effect: { fanbase: 8 } },
        line: () => "📼 You sent four minutes of tape and no caption. It out-rated the show.",
      }),
      opt({
        label: "Decline. No debate.", emoji: "😎",
        promise: { effect: { morale: 5, karma: 3 } },
        line: r => `😎 You passed. Let them argue about you and ${r} without you.`,
      }),
    ],
  },
  {
    id: "nfl_rival_youth_camp", emoji: "💛", title: "TRUCE FOR ONE DAY",
    description: (_s, r) => `${r.name}'s foundation asks you to co-host a free youth camp. Same field, same whistle, one day only. A photo of you two coaching side by side would be everywhere.`,
    when: () => true,
    choices: [
      opt({
        label: "Co-host and split the bill", emoji: "🤝",
        promise: { effect: { cash: -1, fanbase: 10, karma: 8, heat: -20 } },
        line: r => `💛 One day, one field, two hundred kids. You and ${r} split the bill and the feud took the day off.`,
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
    id: "nfl_rival_ballot", emoji: "🗳️", title: "THE BALLOT CAMPAIGN",
    description: (_s, r) => `Fan voting is open and ${r.name}'s team is running ads for him everywhere. Your team's social people want to run one for you too.`,
    when: (s, r) => s.ovr >= 80 && r.ovr >= 80,
    choices: [
      opt({
        label: "Run the campaign", emoji: "📣",
        promise: { effect: { cash: -0.2, fanbase: 6, morale: 2 } },
        line: () => "📣 Your face went up on every screen in town. Paid for it yourself, too.",
      }),
      opt({
        label: "Let the tape talk", emoji: "🧊",
        promise: { effect: { morale: 4 } },
        line: () => "🧊 No ads, no posts. Just the tape.",
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
    id: "nfl_rival_big_deal", emoji: "💰", title: "THE BIGGER DEAL",
    description: (_s, r) => `${r.name} just signed the biggest deal anyone at your position has ever seen. Your phone has not stopped buzzing.`,
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
    id: "nfl_rival_reunion", emoji: "🎓", title: "DRAFT CLASS REUNION",
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

/**
 * One season's choice roll, after the beat roll in simSeason, on the shared
 * tick: only when no beat came up and no choice is already waiting.
 */
export function nflRivalryChoiceTick(c: CareerState, rng?: () => number): RivalryChoiceCard | null {
  return rivalryChoiceTick(c, NFL_RIVALRY_CHOICES, NFL_RIVALRY_CHOICE_CHANCE, rng);
}

/** Answer the pending choice; null when nothing is pending or the option
 *  does not exist (a double tap changes nothing). */
export function resolveNflRivalryChoice(
  c: CareerState, choiceIdx: number, rng: () => number = Math.random,
): { state: CareerState; line: string } | null {
  return resolvePendingRivalryChoice(c, choiceIdx, NFL_RIVALRY_CHOICES, rng);
}
