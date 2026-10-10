/* Round 1224: Game Day for the front offices, the TOLD PATH.

   src/lib/gmGameScore.ts gives a decided game its final (the quick path, what
   a press needs in the same tick). This file tells that final: the scoring
   plays a sport's story law lays out for it, the score by period, the one to
   three plays that decided it and the shape of the game. One law, two paths:
   `tellGame` asks the quick path for the final and tells THAT final, so a
   game that is watched and the same game that is only scored cannot differ.

   SPORT NEUTRAL. A sport hands in a `GameDayLaw`: its story law
   (src/lib/gameLaws/types.ts), how its clock is cut into periods, and the two
   numbers and the sentences that name a game's shape. The NFL's is
   src/lib/gameLaws/nflGameDay.ts. Nothing here knows a sport.

   PURE. A story is a function of the saved final and a stream keyed to it
   (`${key}|story|${home}-${away}`): watching it again and reloading in the
   middle give the same game, no engine generator and no Math.random moves,
   and nothing but the final has to be saved. TEAM LEVEL ONLY: a line names a
   club, never a man, and there is no speaker.

   FAILS CLOSED: a final with no winner, a final with a side above the
   sport's own `maxScore` or above GM_SCORE_CEILING (src/lib/gmGameScore.ts
   says why: such a final is refused BEFORE the law is asked), a final the law
   has no list for, a list that does not add up to the final, or a minute
   outside the clock gives null, and a card then shows the final alone.

   THE SAVE FIELD (`GmLastGame`) is the one shape all four boards save for
   Game Day: the GM club's last told game. It is optional, absent on a bye
   and on every older save, and `readGmLastGame` answers null for anything
   that does not read as one (mark, never fill). It never throws. */
import { keyedRng } from './keyedRng';
import { isGmScore, quickGame, toldWinner, type GameDayFixture, type ToldGame } from './gmGameScore';
import type { DerivedGame, SeasonEvent } from './season/core';
import type { ScoreLaw, StoryLaw } from './gameLaws/types';

export type StoryShape = 'rout' | 'comeback' | 'late' | 'wire' | 'trade';

/** What a sport hands Game Day to tell a final. */
export interface GameDayLaw {
  story: StoryLaw;
  /** The highest score a side can have in a final this sport's score law gives. A final above it was never told by that law, and `gameStory` refuses it without asking the story law. */
  maxScore: number;
  /** How the law's clock is cut: `count` periods, the one (0 based) a minute falls in, and its short name. */
  periods: { count: number; of(minute: number): number; name(i: number): string };
  /** THIS SIM'S OWN: the margin that makes a rout, the deficit that makes a comeback, and the sentence for each shape. */
  shape: { rout: number; comeback: number; say(shape: StoryShape, winner: string, loser: string): string };
}

export interface GameStory {
  /** The game from the viewed club's side ('us' is that club), in the shape the match clock is handed. */
  game: DerivedGame;
  /** Points by period of the law's clock; each list sums to that side's final. */
  periods: { us: number[]; them: number[] };
  /** One to three of `game.events`, minute ordered: see `decidingPlays`. */
  deciding: SeasonEvent[];
  shape: StoryShape;
}

const pointsOf = (e: SeasonEvent) => (typeof e.pts === 'number' && e.pts > 0 ? e.pts : 0);

/** The plays that decided a game, by rule and not by taste, from a minute
 *  ordered list in which `winner` is the side that won:
 *  (1) the go ahead that stood: the first score after the last moment the
 *      winner was level or behind;
 *  (2) the loser's last score before it (it always left the game level or the
 *      loser in front: that is what makes (1) the go ahead);
 *  (3) the winner's last score, when it is not (1).
 *  Also the biggest deficit the winner was ever in. Null: the list does not
 *  end with `winner` ahead. */
export function decidingPlays(events: readonly SeasonEvent[], winner: 'us' | 'them'): { goAhead: SeasonEvent; plays: SeasonEvent[]; deficit: number; first: boolean } | null {
  const scores = events.filter(e => pointsOf(e) > 0);
  let lead = 0;
  let last = -1;
  let deficit = 0;
  scores.forEach((e, i) => {
    lead += e.side === winner ? pointsOf(e) : -pointsOf(e);
    if (lead <= 0) last = i;
    if (-lead > deficit) deficit = -lead;
  });
  if (lead <= 0 || last + 1 >= scores.length) return null;
  const goAhead = scores[last + 1];
  const plays: SeasonEvent[] = [];
  for (let i = last; i >= 0; i -= 1) if (scores[i].side !== winner) { plays.push(scores[i]); break; }
  plays.push(goAhead);
  for (let i = scores.length - 1; i > last + 1; i -= 1) if (scores[i].side === winner) { plays.push(scores[i]); break; }
  return { goAhead, plays, deficit, first: last === -1 };
}

/** The story of a told final from one club's side. Null: see FAILS CLOSED above. */
export function gameStory(law: GameDayLaw, g: ToldGame, viewAs: 'home' | 'away', md = 1): GameStory | null {
  if (!g || typeof g.key !== 'string' || !isGmScore(g.homeScore) || !isGmScore(g.awayScore) || g.homeScore === g.awayScore) return null;
  /* written so that a law with no number here (or one that is not a number) is told nothing */
  if (typeof law.maxScore !== 'number' || !(g.homeScore <= law.maxScore) || !(g.awayScore <= law.maxScore)) return null;
  const raw = law.story.events(g.homeScore, g.awayScore, keyedRng(`${g.key}|story|${g.homeScore}-${g.awayScore}`));
  if (!Array.isArray(raw)) return null;
  const length = law.story.clock.length;
  const count = law.periods.count;
  const us: number[] = Array.from({ length: count }, () => 0);
  const them: number[] = Array.from({ length: count }, () => 0);
  const flip = viewAs === 'away';
  const events: SeasonEvent[] = [];
  for (const e of raw) {
    if (!e || typeof e.min !== 'number' || !Number.isFinite(e.min) || e.min < 0 || e.min > length || (e.side !== 'us' && e.side !== 'them')) return null;
    if (e.pts !== undefined && (!Number.isInteger(e.pts) || e.pts < 0)) return null;
  }
  for (const e of [...raw].sort((a, b) => a.min - b.min)) {
    const side: 'us' | 'them' = flip ? (e.side === 'us' ? 'them' : 'us') : e.side;
    const p = law.periods.of(e.min);
    if (!Number.isInteger(p) || p < 0 || p >= count) return null;
    (side === 'us' ? us : them)[p] += pointsOf(e);
    events.push({ ...e, side });
  }
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const mine = flip ? g.awayScore : g.homeScore;
  const theirs = flip ? g.homeScore : g.awayScore;
  if (sum(us) !== mine || sum(them) !== theirs) return null;
  const decided = decidingPlays(events, mine > theirs ? 'us' : 'them');
  if (!decided) return null;
  const margin = Math.abs(mine - theirs);
  const shape: StoryShape = margin >= law.shape.rout ? 'rout'
    : decided.deficit >= law.shape.comeback ? 'comeback'
      : law.periods.of(decided.goAhead.min) === count - 1 ? 'late'
        : decided.first ? 'wire' : 'trade';
  const game: DerivedGame = { md, opp: 0, home: !flip, us: mine, them: theirs, fixed: false, played: true, started: true, line: {}, events };
  return { game, periods: { us, them }, deciding: decided.plays, shape };
}

/** THE TOLD PATH: the quick path's final for a decided fixture, and its story
 *  from one club's side (null story: the final alone). Null when the law
 *  refuses the fixture, exactly when `quickGame` does. */
export function tellGame(score: ScoreLaw, day: GameDayLaw, f: GameDayFixture, viewAs: 'home' | 'away', md = 1): { told: ToldGame; story: GameStory | null } | null {
  const told = quickGame(score, f);
  return told ? { told, story: gameStory(day, told, viewAs, md) } : null;
}

/** The one save field the boards share for Game Day: the GM club's last told game. */
export interface GmLastGame extends ToldGame { v: 1; where: string; winner: string }

/** What a board saves after a press. `where` says when it was played, in the bind's own words ("w6", a round's name). */
export function makeGmLastGame(told: ToldGame, where: string): GmLastGame | null {
  const winner = toldWinner(told);
  return winner === null ? null : { v: 1, key: told.key, where, home: told.home, away: told.away, homeScore: told.homeScore, awayScore: told.awayScore, winner };
}

/** A saved last game, or null for anything that does not read as one. Never throws; hands back a fresh object of the known fields only. */
export function readGmLastGame(value: unknown, isClub: (id: string) => boolean): GmLastGame | null {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const o = value as Record<string, unknown>;
    const text = (x: unknown): x is string => typeof x === 'string' && x !== '';
    if (o.v !== 1 || !text(o.key) || !text(o.where) || !text(o.home) || !text(o.away) || !text(o.winner)) return null;
    if (o.home === o.away || isClub(o.home) !== true || isClub(o.away) !== true) return null;
    if (!isGmScore(o.homeScore) || !isGmScore(o.awayScore) || o.homeScore === o.awayScore) return null;
    if (o.winner !== (o.homeScore > o.awayScore ? o.home : o.away)) return null;
    return { v: 1, key: o.key, where: o.where, home: o.home, away: o.away, homeScore: o.homeScore, awayScore: o.awayScore, winner: o.winner };
  } catch {
    return null;
  }
}
