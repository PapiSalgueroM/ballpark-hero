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

import type { MlbCareerState, MlbSeasonLine } from "./mlbMyCareer";
import type { CareerRival } from "./careerRival";
import {
  rollRivalryEvent, forcedRetirementEvent, applyRivalryEvent as applyRivalryEventFor, withSeasonPlayed, ownRosterBeat, ALL_STAR_OWN_ROSTER,
} from "./careerRivalryEvents";
import type { RivalryEvent, RivalryEventDef } from "./careerRivalryEvents";
import { rivalryChoiceTick, resolvePendingRivalryChoice, meterOption } from "./careerRivalryChoices";
import type { RivalryChoiceDef, RivalryChoiceCard } from "./careerRivalryChoices";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The beat that fires forced, once, the season the rival retires. */
export const MLB_RIVAL_RETIRE_ID = 205;
/** Round 1149: the award word simMlbSeason writes on a season that made the All-Star roster. Beat 206 reads it. */
export const MLB_ROSTER_AWARD = 'All-Star';

/* Seventeen beats (six more since Round 919), gated on what an MLB rival's save actually tracks:
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
  /* Round 1149: no coin. The beat flipped one for which of you made the All-Star roster, in a game whose
     engine picks All-Stars for real (mlbAllStar in careerAwards.ts), so the card could say you made it in a
     year your own season card said you did not. It is read off your own season now, the one just played. The
     MLB rival's season is not on your stat line yet (only the NBA rival's is, since Round 1112), so nothing here
     says whether HE made a roster: you made it, or you are off it a year after you were on it. The round that
     moves the MLB rival onto the player's line can add the cards that name his roster, the way the NBA's 306
     does. The two cards and their words are the shared ones (ownRosterBeat and ALL_STAR_OWN_ROSTER in
     careerRivalryEvents.ts, where the rule is written): the NHL deals the same beat. */
  ownRosterBeat<MlbCareerState, CareerRival>({ id: 206, award: MLB_ROSTER_AWARD, ...ALL_STAR_OWN_ROSTER }),
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
  /* Round 919: six more beats, the same rules as the seventeen above. Gated
     only on fields the save and the rival already carry, narrated rather
     than quoted, and every consequence line says exactly what apply moves
     (the rivalry meter is flavor and is named without a number). */
  {
    id: 218, emoji: "🪞", title: "One Line Apart",
    description: (_s, r) => `${r.name} plays your position, and every list of the best at it this year has the two of you one line apart.`,
    consequence: "Morale +4, the rivalry heats up",
    /* One line apart means close ratings, not just the same position. */
    when: (s, r) => !r.retired && r.pos === s.pos && Math.abs(r.ovr - s.ovr) <= 3,
    apply: s => {
      s.morale = clamp(s.morale + 4, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
    },
  },
  {
    id: 219, emoji: "⚔️", title: "The Eighth Inning Matchup",
    description: (_s, r) => `Tie game, eighth inning, and it comes down to you against ${r.name}, pitcher against hitter, with the whole park standing.`,
    consequence: "Fanbase +5, the rivalry heats up",
    /* Pitcher against hitter needs two clubs: a teammate never faces you. */
    when: (s, r) => !r.retired && r.team !== s.team && (s.pos === "SP" || s.pos === "RP") !== (r.pos === "SP" || r.pos === "RP"),
    apply: s => {
      s.fanbase = clamp(s.fanbase + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
    },
  },
  {
    id: 220, emoji: "💰", title: "The Bigger Contract",
    description: (_s, r) => `${r.name} signs an extension, and the comparison graphics on every pregame show put his number right next to yours.`,
    consequence: "Morale -4, Fanbase +2",
    when: (s, r) => !r.retired && r.ovr >= s.ovr,
    apply: s => {
      s.morale = clamp(s.morale - 4, 0, 100);
      s.fanbase = clamp(s.fanbase + 2, 0, 100);
    },
  },
  {
    id: 221, emoji: "🌴", title: "Same Winter Club",
    description: (_s, r) => `${r.name} signs with the same winter ball club you play for, and the little ballpark sells out every night the two of you are in the lineup.`,
    consequence: "Fanbase +3, Morale +2",
    when: (s, r) => !r.retired && s.age <= 28 && r.age <= 28,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 3, 0, 100);
      s.morale = clamp(s.morale + 2, 0, 100);
    },
  },
  {
    id: 222, emoji: "📺", title: "Sunday Night Series",
    description: (_s, r) => `The network moves your series against ${r.name}'s club to Sunday night and builds the whole broadcast around the two of you.`,
    consequence: "Fanbase +6, Morale +2",
    when: (s, r) => !r.retired && r.team !== s.team,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 6, 0, 100);
      s.morale = clamp(s.morale + 2, 0, 100);
    },
  },
  {
    id: 223, emoji: "🏛️", title: "The Hall Question",
    description: (_s, r) => `Writers have started asking whether you and ${r.name} both belong in the Hall of Fame, or only one of you.`,
    consequence: "Fanbase +4, the rivalry heats up",
    when: (s, r) => s.age >= 33 && r.age >= 33,
    apply: s => {
      s.fanbase = clamp(s.fanbase + 4, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 5, 0, 100);
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
export function mlbRivalryTick(c: MlbCareerState, rng: () => number, season: MlbSeasonLine): RivalryEvent | null {
  if (!c.rival) return null;
  /* Round 1149: simMlbSeason rolls this before the season is on the save, and beat 206 reads the season, so
     the gates and the words see the save as it stands once the season is on it (the season is required: a
     roll without it would read last year's). Nothing is drawn for it and nothing is written. */
  const p = withSeasonPlayed(c, season);
  const lastId = c.lastRivalryEventId ?? null;
  const rolled = rollRivalryEvent(p, c.rival, lastId, MLB_RIVALRY_EVENTS, rng);
  if (rolled) return rolled;
  return forcedRetirementEvent(p, c.rival, lastId, MLB_RIVALRY_EVENTS, MLB_RIVAL_RETIRE_ID);
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

/* ─── Round 796: rivalry choices ─────────────────────────────────────────────

   The MLB's half of what the NFL career got this round: the rival puts a
   decision in front of you, on the shared engine careerRivalryChoices.ts.
   Baseball words and baseball moments (the benches clearing, the All-Star
   vote, the free agent deal), the same meters the NFL table moves, written
   from plain numbers through meterOption so the button cannot promise one
   thing and do another. Morale feeds simMlbSeason's form, so the morale
   options are a real lever on the next stat line. Every line works for a
   pitcher and a hitter alike, because the rival plays your position. One
   card a season at most, and only in a season the beat roll came up empty. */

/** The chance a season with no beat brings a choice instead. */
export const MLB_RIVALRY_CHOICE_CHANCE = 0.45;

const opt = (spec: Parameters<typeof meterOption>[0]) => meterOption<MlbCareerState, CareerRival>(spec);

export const MLB_RIVALRY_CHOICES: RivalryChoiceDef<MlbCareerState, CareerRival>[] = [
  {
    id: "mlb_rival_benches_clear", emoji: "⚾", title: "BENCHES CLEARED",
    description: (_s, r) => `Both benches emptied after a pitch up and in on Tuesday, and ${r.name} was the first one out of his dugout. Your clubhouse wants an answer the next time you two meet.`,
    when: () => true,
    choices: [
      opt({
        label: "Answer it on the field", emoji: "😈",
        promise: { effect: { heat: 25 }, risk: { chance: 0.3, hit: { morale: -5, fanbase: -5, cash: -0.1 }, miss: { morale: 8 } } },
        riskNote: "you're the one who gets tossed",
        hitLine: r => `🚩 You went after ${r} in the next series and got tossed yourself. Fined, and the fans did not love it.`,
        missLine: r => `😈 You answered ${r} the right way, on the field, and stared down his dugout after. The whole clubhouse lost it.`,
      }),
      opt({
        label: "Play peacemaker on camera", emoji: "🕊️",
        promise: { effect: { fanbase: 5, karma: 5, heat: -15 } },
        line: r => `🕊️ You stepped between the benches and walked ${r} back. The grown up on the field, and the fans noticed.`,
      }),
      opt({
        label: "Say nothing, watch the tape", emoji: "🎞️",
        promise: { effect: { morale: 6, heat: 10 } },
        line: r => `🎞️ Not a word. You watched the tape on loop and circled the next series against ${r}.`,
      }),
    ],
  },
  {
    id: "mlb_rival_debate_show", emoji: "🎤", title: "THE DEBATE SHOW",
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
    id: "mlb_rival_youth_clinic", emoji: "💛", title: "TRUCE FOR ONE DAY",
    description: (_s, r) => `${r.name}'s foundation asks you to co-host a free youth clinic. Same field, same cages, one day only. A photo of you two coaching side by side would be everywhere.`,
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
        line: r => `😉 The clinic turned into a trash talk show between you and ${r}. The kids loved every second.`,
      }),
      opt({
        label: "Send a check, skip it", emoji: "💸",
        promise: { effect: { cash: -1, karma: 3 } },
        line: () => "💸 You sent the check and skipped the cameras. The quiet kind of good.",
      }),
    ],
  },
  {
    id: "mlb_rival_allstar_vote", emoji: "🗳️", title: "THE ALL-STAR VOTE",
    description: (_s, r) => `All-Star fan voting is open and ${r.name}'s team is running ads for him everywhere. Your team's social people want to run one for you too.`,
    when: (s, r) => s.ovr >= 80 && r.ovr >= 80,
    choices: [
      opt({
        label: "Run the campaign", emoji: "📣",
        promise: { effect: { cash: -0.2, fanbase: 6, morale: 2 } },
        line: () => "📣 Your face went up on every board in the ballpark. Paid for it yourself, too.",
      }),
      opt({
        label: "Let the numbers talk", emoji: "🧊",
        promise: { effect: { morale: 4 } },
        line: () => "🧊 No ads, no posts. Just the numbers.",
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
    id: "mlb_rival_big_deal", emoji: "💰", title: "THE BIGGER DEAL",
    description: (_s, r) => `${r.name} just signed the biggest free agent deal anyone at your position has ever seen. Your phone has not stopped buzzing.`,
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
    id: "mlb_rival_reunion", emoji: "🎓", title: "ROOKIE CLASS REUNION",
    description: (_s, r) => `A network is doing a five years later piece on your rookie class and wants you and ${r.name} on set together.`,
    when: s => s.seasons.length >= 5,
    choices: [
      opt({
        label: "Do it together", emoji: "🤝",
        promise: { effect: { fanbase: 6, heat: -10 } },
        line: r => `🤝 You and ${r} told minor league bus stories for an hour. Best thing the network aired all month.`,
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

/** One season's choice roll, after the beat roll in simMlbSeason, on the
 *  shared tick: only when no beat came up and no choice is already waiting. */
export function mlbRivalryChoiceTick(c: MlbCareerState, rng?: () => number): RivalryChoiceCard | null {
  return rivalryChoiceTick(c, MLB_RIVALRY_CHOICES, MLB_RIVALRY_CHOICE_CHANCE, rng);
}

/** Answer the pending choice; null when nothing is pending or the option
 *  does not exist (a double tap changes nothing). */
export function resolveMlbRivalryChoice(
  c: MlbCareerState, choiceIdx: number, rng: () => number = Math.random,
): { state: MlbCareerState; line: string } | null {
  return resolvePendingRivalryChoice(c, choiceIdx, MLB_RIVALRY_CHOICES, rng);
}
