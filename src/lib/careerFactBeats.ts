/* Round 1313: the fact beat and roster beat builders of the four US careers, moved here character for
   character from careerRivalryEvents.ts (Round 1149 wrote them, Round 1227 lifted the roster beat onto
   both seasons).

   ONLY the four US rivalry files import this module (nflCareerRivalryEvents.ts, nbaCareerRivalryEvents.ts,
   mlbCareerRivalryEvents.ts and nhlCareerRivalryEvents.ts). careerRivalryEvents.ts is shared with Soccer
   Career (about one pageview in five on the whole site) and the fight careers, and a module is one unit to
   the bundler, so while these builders lived there every Soccer Career player downloaded code that only the
   US careers call. Never import this file from careerRivalryEvents.ts and never re export it there: either
   puts the link straight back (and an import there also breaks the copied tree of scripts/simFightCareer.mjs).
   Held by scripts/simFlagshipWeight.mjs (sections 1c and 3b) and scripts/simCareerRivalryEvents.mjs
   (section 1, HOMES). */
import type { RivalryEventDef } from './careerRivalryEvents';

/* ─── Round 1149: a beat that reports a fact of the season ─────────────────────

   Until Round 1112 the All-Star beat flipped a coin for who made the roster,
   in games whose engines pick that roster for real, so the card could say you
   made it in a year your own season card said you did not. Round 1112 fixed
   the NBA's by hand. This is that fix as one builder, for every sport and for
   any beat whose outcome is already on the save.

   A fact beat is a short list of cards. Each card says when the season's
   facts support it, what it reads, what it promises and what the tap moves.
   The beat is dealt when one card is supported, the pending card carries that
   card's words, and the tap finds the card again BY THE PROMISE PRINTED ON IT
   and only then moves anything. Three things follow, and they are the rule:

     no coin        nothing is drawn, at the deal or at the tap.
     no drift       the tap does what the card in front of the player says,
                    because it is found by those words (meterOption in
                    careerRivalryChoices.ts holds a choice to the same rule).
     old cards      a save sitting on a card dealt before a beat moved here
                    (its promise reads "50/50 outcome") matches no card, so
                    Continue moves nothing and only logs the card's title.

   So every card of one beat must promise something different: the promise is
   the key. scripts/simCareerRivalryEvents.mjs holds each sport's cards to
   that, and to their words. */

/** One card a fact beat can deal. */
export interface FactCard<P, R> {
  /** Do the facts on the save and the rival support this card? Nothing is drawn. */
  when: (p: P, r: R) => boolean;
  description: (p: P, r: R) => string;
  /** What the card promises, and how the tap finds the card it was shown: unique within its beat. */
  consequence: string;
  /** What the tap moves: exactly what `consequence` says. */
  move: (s: P, r: R) => void;
  /** The line the tap pushes into the feed before the standard title line. */
  line: (p: P, r: R) => string;
}

/** Build a beat from its cards. The first supported card is the one dealt. */
export function factBeat<P, R>(spec: { id: number; emoji: string; title: string; cards: FactCard<P, R>[] }): RivalryEventDef<P, R> {
  const dealt = (p: P, r: R) => spec.cards.find(k => k.when(p, r));
  return {
    id: spec.id, emoji: spec.emoji, title: spec.title,
    when: (p, r) => !!dealt(p, r),
    description: (p, r) => dealt(p, r)?.description(p, r) ?? '',
    consequence: (p, r) => dealt(p, r)?.consequence ?? '',
    apply: (s, r, _rng, pushLine, event) => {
      const card = spec.cards.find(k => (!event || k.consequence === event.consequence) && k.when(s, r));
      if (!card) return;
      card.move(s, r);
      pushLine(card.line(s, r));
    },
  };
}

/**
 * Round 1149: the save as it stands once the season just played is on it. Every engine rolls its rivalry beat
 * before it pushes the season onto the save, and a fact beat reads that season, so the tick hands the roll this
 * view. Nothing is drawn for it and nothing is written (Round 1112 wrote this line inside the NBA's tick).
 */
export function withSeasonPlayed<P extends { seasons: L[] }, L>(c: P, season?: L): P {
  return season ? { ...c, seasons: [...c.seasons, season] } : c;
}

/** Round 1149: whether the last season on a save holds an award, in the engine's own word for it. Null when the
 *  save holds no season, so a beat that reads this is never dealt on nothing. */
export function lastSeasonHolds(p: { seasons: { awards?: string[] }[] }, award: string): boolean | null {
  const last = p.seasons[p.seasons.length - 1];
  return last ? (last.awards ?? []).includes(award) : null;
}

/* ─── Round 1149: the roster beat of a sport that knows only your own season ───

   The NBA's roster beat reads two seasons, yours and the rival's, because
   since Round 1112 the NBA rival plays his season on your own stat line. The
   MLB, NHL and NFL rivals do not yet: their line is a few numbers off a
   rating, with no roster pick behind it. So in those three the beat is dealt
   on the one fact the save does hold, the award word the engine wrote on
   your own season, and NO CARD SAYS A WORD ABOUT THE RIVAL'S ROSTER. Two
   cards, each a fact of your own record:

     you made it     the season just played holds the award. Morale +5.
     you dropped off the season just played does not hold it and the one
                     before it did. Morale -5.

   A year you were never on the roster and are not on it now deals nothing:
   there is no news in it, and the two ratings are no evidence that anybody
   "had you in the conversation". (The first draft of this beat kept the
   coin beat's gate, both rated 80 or better, for the miss. Measured on the
   NHL fleet that dealt the miss 145 to 167 times a seed against 15 to 29
   for making it, in a league where one season in twenty holds the honour:
   a morale tax on being ordinary, sold as a snub.)

   The round that moves one of those rivals onto the player's line replaces
   its binding with the cards that name his roster too, the way the NBA's
   306 does. */

const meter = (v: number) => Math.max(0, Math.min(100, v));
/** Whether the season before the last one on a save holds an award (false when there is no such season). */
function seasonBeforeHolds(p: { seasons: { awards?: string[] }[] }, award: string): boolean {
  const before = p.seasons[p.seasons.length - 2];
  return !!before && (before.awards ?? []).includes(award);
}

/** What a sport hands the two own cards for one card: its words and the line the tap logs. */
export interface OwnRosterWords<R> { description: (r: R) => string; line: string }

/** What the two own cards read of a sport: the award word its engine writes on a season that made the roster,
 *  and the words of the two cards. */
export interface OwnRosterSpec<R> { award: string; made: OwnRosterWords<R>; dropped: OwnRosterWords<R> }

/** The two own cards (Round 1227 cut them out of ownRosterBeat unchanged, so rosterBeat below can keep them
 *  for a card dealt before a sport's rival moved onto the player's line; Round 1313 deleted ownRosterBeat,
 *  which no sport deals any more, and kept these two). */
function ownRosterCards<P extends { seasons: { awards?: string[] }[]; morale: number }, R>(spec: OwnRosterSpec<R>): FactCard<P, R>[] {
  return [
    {
      when: s => lastSeasonHolds(s, spec.award) === true,
      description: (_s, r) => spec.made.description(r),
      consequence: "Morale +5",
      move: s => { s.morale = meter(s.morale + 5); },
      line: () => spec.made.line,
    },
    {
      when: s => lastSeasonHolds(s, spec.award) === false && seasonBeforeHolds(s, spec.award),
      description: (_s, r) => spec.dropped.description(r),
      consequence: "Morale -5",
      move: s => { s.morale = meter(s.morale - 5); },
      line: () => spec.dropped.line,
    },
  ];
}

/** The All-Star words MLB and the NHL share: both leagues call it the All-Star roster. */
export const ALL_STAR_OWN_ROSTER = {
  emoji: "🗳️", title: "All-Star Rosters",
  made: {
    description: (r: { name: string }) => `The All-Star rosters are out and you are on one. It goes down as one more line in the argument between you and ${r.name}.`,
    line: "🗳️ You made the All-Star roster.",
  },
  dropped: {
    description: (r: { name: string }) => `The All-Star rosters are out and you are not on one, a year after you were. It goes down as one more line in the argument between you and ${r.name}.`,
    line: "🗳️ You were left off the All-Star roster.",
  },
};

/* ─── Round 1227: the roster beat of a sport whose rival plays your own line ────

   Round 1112 wrote the NBA's three cards by hand: both of you made the roster,
   only you, only him, dealt only when at least one of you did, each saying and
   doing only what the two seasons support. This is that beat as one builder,
   and the NBA's 306 is bound to it with not a word or a number changed. A
   sport binds to it in the round that moves its rival onto the player's own
   stat line, because only then is there a roster pick behind HIS season.

   `own` keeps the two own cards (ownRosterCards) for ONE purpose: a save sitting
   on a card that the release before dealt ("Morale +5" for making the roster,
   "Morale -5" for dropping off it) still pays what that card printed. Each is
   supported only while rosterFacts is null, which is never once the sport's
   rival has been judged on the season at hand, so an own card is never DEALT
   again, and the tap (which finds its card by the promise printed on it and
   by `when`) never has two cards to choose from: the fact cards and the own
   cards are never supported together. */

/** Who made the roster in the season the rival was last judged on. `mine` reads the player's own last season
 *  (the engine picked his roster); his is what his season's own pick wrote on him. Null when the save holds no
 *  season or the rival's last season is not that year, so a card is never dealt on two different seasons. */
export function rosterFacts<L extends { year: number }>(
  s: { seasons: L[] }, r: { lastYear?: number; lastAllStar?: boolean }, mine: (last: L) => boolean,
): { mine: boolean; his: boolean } | null {
  const last = s.seasons[s.seasons.length - 1];
  if (!last || r.lastYear !== last.year) return null;
  return { mine: mine(last), his: r.lastAllStar === true };
}

/** What a sport hands rosterBeat for one of its three cards: its words and the line the tap logs. */
export interface RosterWords<R> { description: (r: R) => string; line: (r: R) => string }

export function rosterBeat<
  L extends { year: number; awards?: string[] },
  P extends { seasons: L[]; morale: number; fanbase: number },
  R extends { lastYear?: number; lastAllStar?: boolean },
>(spec: {
  id: number; emoji: string; title: string;
  /** Did the player's own season make the roster? Read off the season line, in the engine's own word. */
  mine: (last: L) => boolean;
  both: RosterWords<R>; onlyYou: RosterWords<R>; onlyHim: RosterWords<R>;
  own?: OwnRosterSpec<R>;
}): RivalryEventDef<P, R> {
  const facts = (s: P, r: R) => rosterFacts(s, r, spec.mine);
  const own: FactCard<P, R>[] = spec.own
    ? ownRosterCards<P, R>(spec.own).map(k => ({ ...k, when: (s: P, r: R) => facts(s, r) === null && k.when(s, r) }))
    : [];
  return factBeat<P, R>({
    id: spec.id, emoji: spec.emoji, title: spec.title,
    cards: [
      {
        when: (s, r) => { const f = facts(s, r); return !!f && f.mine && f.his; },
        description: (_s, r) => spec.both.description(r),
        consequence: "Fanbase +3",
        move: s => { s.fanbase = meter(s.fanbase + 3); },
        line: (_s, r) => spec.both.line(r),
      },
      {
        when: (s, r) => { const f = facts(s, r); return !!f && f.mine && !f.his; },
        description: (_s, r) => spec.onlyYou.description(r),
        consequence: "Morale +5",
        move: s => { s.morale = meter(s.morale + 5); },
        line: (_s, r) => spec.onlyYou.line(r),
      },
      {
        when: (s, r) => { const f = facts(s, r); return !!f && !f.mine && f.his; },
        description: (_s, r) => spec.onlyHim.description(r),
        consequence: "Morale -5",
        move: s => { s.morale = meter(s.morale - 5); },
        line: (_s, r) => spec.onlyHim.line(r),
      },
      ...own,
    ],
  });
}

/** The three cards in the words of a league that calls it the All-Star roster (the NBA's own since Round 1112,
 *  word for word). */
export const ALL_STAR_ROSTER = {
  emoji: "🗳️", title: "All-Star Rosters",
  both: {
    description: (r: { name: string }) => `The All-Star rosters are out, and you and ${r.name} are both on them.`,
    line: (r: { name: string }) => `🗳️ You and ${r.name} both made the All-Star roster.`,
  },
  onlyYou: {
    description: (r: { name: string }) => `The All-Star rosters are out. You are on one and ${r.name} is not.`,
    line: (r: { name: string }) => `🗳️ You made the All-Star roster and ${r.name} did not.`,
  },
  onlyHim: {
    description: (r: { name: string }) => `The All-Star rosters are out. ${r.name} is on one and you are not.`,
    line: (r: { name: string }) => `🗳️ ${r.name} made the All-Star roster and you did not.`,
  },
};
