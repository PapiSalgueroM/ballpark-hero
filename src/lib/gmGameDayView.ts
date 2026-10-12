/* Round 1307: every word and number on a front office's Game Day tile.

   A board saves his club's told games (src/lib/gmGameLog.ts). The tile
   shows one of them: the final, the score by period, the shape of the game
   in one sentence, the one to three plays that decided it and where he
   stands. All of it is decided HERE, in a lib with no React, so a unit test
   holds every string and the card (GmGameDayCard.tsx) only lays it out.

   SPORT FREE. A sport hands in its `GameDayLaw` (the NFL's is
   src/lib/gameLaws/nflGameDay.ts). Every sentence about a play or a shape
   is the law's own (`law.story.line`, `law.shape.say`); the few patterns
   written here are plain facts in a fixed form (a seed, a fixture, a chip).

   NOTHING IS DECIDED TWICE. `gameDayView` asks `gameStory` for the story of
   the saved final and prints what it answers: the periods sum to the final
   because the told path refuses a story that does not. A final the law
   will not tell has no line score, no sentence and no plays: the tile then
   shows the final alone. Mark, never fill.

   TEAM LEVEL. A line names a club and a kind of score. No man is credited
   and nobody speaks: the engine does not decide who scored.

   NOT THE SEASON'S RECORD. A log can begin in the middle of a season (a
   save from before the log existed), so nothing here counts the chips or
   prints a record from them. A chip says its own week and its own score.

   It imports the told path (src/lib/gmGameDay.ts), so it rides with a card
   in a lazy chunk and never with a board's press. */
import { gameStory, type GameDayLaw } from './gmGameDay';
import type { GmLastGame } from './gmGameScore';
import type { DerivedGame, SeasonEvent } from './season/core';
import type { SeasonClock } from '@/components/season-centre/MatchClock';

export interface GameDayPlay {
  /** The law's clock at the play ("Q3 8:00"). */
  clock: string;
  /** The law's line for it, about the club that scored. */
  text: string;
  /** The score once it stood, his club first ("21-14"). */
  after: string;
  /** The go ahead that stood: the one a card may call the play that decided it. */
  decided: boolean;
}

export interface GameDayView {
  /** The log entry's own word for when it was played ("w6", a round's name). */
  where: string;
  /** Club ids, from his side. */
  us: string;
  them: string;
  home: boolean;
  final: { us: number; them: number };
  won: boolean;
  /** One column a period this game had; null when the story is refused. */
  line: { names: string[]; us: number[]; them: number[] } | null;
  /** The law's sentence for the shape of the game; null when the story is refused. */
  shape: string | null;
  /** One to three, minute ordered; empty when the story is refused. */
  deciding: GameDayPlay[];
  /** What a match clock is handed; null when the story is refused (nothing to watch). */
  game: DerivedGame | null;
}

const pointsOf = (e: SeasonEvent) => (typeof e.pts === 'number' && e.pts > 0 ? e.pts : 0);

/** One saved game as the tile prints it, from `club`'s side. `name` gives a club the word a sentence uses. */
export function gameDayView(law: GameDayLaw, last: GmLastGame, club: string, name: (id: string) => string): GameDayView {
  const home = last.home === club;
  const us = home ? last.home : last.away;
  const them = home ? last.away : last.home;
  const final = { us: home ? last.homeScore : last.awayScore, them: home ? last.awayScore : last.homeScore };
  const base = { where: last.where, us, them, home, final, won: last.winner === club };
  const story = gameStory(law, last, home ? 'home' : 'away');
  if (!story) return { ...base, line: null, shape: null, deciding: [], game: null };
  /* the periods this game had: the extra ones belong to a game past regulation */
  const count = last.beyond === true ? law.periods.count : law.periods.regulation ?? law.periods.count;
  const names = Array.from({ length: count }, (_, i) => law.periods.name(i));
  const winner = base.won ? us : them;
  const loser = base.won ? them : us;
  const running = new Map<SeasonEvent, string>();
  let a = 0, b = 0;
  for (const e of story.game.events) {
    if (e.side === 'us') a += pointsOf(e); else b += pointsOf(e);
    running.set(e, `${a}-${b}`);
  }
  const deciding = [...story.deciding].sort((x, y) => x.min - y.min).map(e => ({
    clock: law.story.clock.label(e.min),
    text: law.story.line(e, name(e.side === 'us' ? us : them)),
    after: running.get(e) ?? '',
    decided: e === story.goAhead,
  }));
  return {
    ...base,
    line: { names, us: story.periods.us.slice(0, count), them: story.periods.them.slice(0, count) },
    shape: law.shape.say(story.shape, name(winner), name(loser)),
    deciding,
    game: story.game,
  };
}

/** The law's clock and its club lines, in the shape the match clock takes. */
export function gameDayClock(law: GameDayLaw, short?: (name: string) => string): SeasonClock {
  const c = law.story.clock;
  return {
    length: c.length,
    label: c.label,
    words: (e, us, them) => law.story.line(e, e.side === 'us' ? us : them),
    start: c.start,
    end: c.end,
    endShort: c.endShort,
    ...(c.labelClass ? { labelClass: c.labelClass } : {}),
    ...(short ? { short } : {}),
  };
}

const ordinal = (n: number): string => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
};

/** Where he stands today, in the engine's own seeding: his seed of the
 *  `seeds` a table sends on, or outside them. It says what the table reads
 *  now and nothing about who will go through. */
export function standingLine(s: { table: string; seed: number | null; seeds: number }): string {
  return s.seed !== null
    ? `${s.table}: ${ordinal(s.seed)} seed of ${s.seeds} as it stands.`
    : `${s.table}: outside the ${s.seeds} seeds as it stands.`;
}

/** His next game in a board's words: "at Titans", "home to Titans". */
export function fixtureLine(next: { label: string; home: boolean }): string {
  return next.home ? `home to ${next.label}` : `at ${next.label}`;
}

export interface GameDayChip { key: string; where: string; won: boolean; text: string }

/** His told games as chips, oldest first: "W 27-20", "L 13-24", his score first. Each says its own game and no more. */
export function logChips(log: readonly GmLastGame[], club: string): GameDayChip[] {
  return log.map(g => {
    const home = g.home === club;
    const won = g.winner === club;
    return { key: g.key, where: g.where, won, text: `${won ? 'W' : 'L'} ${home ? g.homeScore : g.awayScore}-${home ? g.awayScore : g.homeScore}` };
  });
}
