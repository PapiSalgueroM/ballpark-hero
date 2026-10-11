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
   has no list for, a list that does not add up to the final, a minute outside
   the clock, a game marked past regulation in a sport that tells no such
   game, or a law that throws gives null, and a card then shows the final
   alone.

   THE SAVE FIELD (`GmLastGame`, the GM club's last told game) is not here:
   a press writes it and a save validator reads it, so it lives with the
   quick path in src/lib/gmGameScore.ts and this file rides with a card
   alone. `gameStory` takes what `readGmLastGame` hands back as it is. */
import { keyedRng } from './keyedRng';
import { isGmScore, quickGame, type GameDayFixture, type ToldGame } from './gmGameScore';
import type { DerivedGame, SeasonEvent } from './season/core';
import type { ScoreLaw, StoryLaw } from './gameLaws/types';

export type StoryShape = 'rout' | 'comeback' | 'late' | 'wire' | 'trade';

/** What a sport hands Game Day to tell a final. */
export interface GameDayLaw {
  story: StoryLaw;
  /** For a sport whose engine draws whether a game went past regulation: the scoring plays of a final that DID (the contract of `story.events`, which then tells the games that did not). A told game marked `beyond` is told by this; in a sport without it there is no such game, and one marked so is told nothing. */
  storyBeyond?: StoryLaw['events'];
  /** The highest score a side can have in a final this sport's score law gives. A final above it was never told by that law, and `gameStory` refuses it without asking the story law. */
  maxScore: number;
  /** How the law's clock is cut: `count` periods, the one (0 based) a minute falls in, and its short name. `regulation`: how many of them a game that did NOT go past regulation has (absent: all of them). The periods after those are only reached by a game marked `beyond`; a play there in any other game is refused, and the last period, the one the shape `late` reads, is the last one that game has. */
  periods: { count: number; regulation?: number; of(minute: number): number; name(i: number): string };
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
  /** The one of `deciding` that is the go ahead that stood: the play a card calls the one that decided it. */
  goAhead: SeasonEvent;
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
  try {
    return storyOf(law, g, viewAs, md);
  } catch {
    /* a law that throws has refused: a card shows the final alone, it does not crash */
    return null;
  }
}

function storyOf(law: GameDayLaw, g: ToldGame, viewAs: 'home' | 'away', md: number): GameStory | null {
  if (!g || typeof g.key !== 'string' || !isGmScore(g.homeScore) || !isGmScore(g.awayScore) || g.homeScore === g.awayScore) return null;
  /* written so that a law with no number here (or one that is not a number) is told nothing */
  if (typeof law.maxScore !== 'number' || !(g.homeScore <= law.maxScore) || !(g.awayScore <= law.maxScore)) return null;
  const past = g.beyond === true;
  if (past && typeof law.storyBeyond !== 'function') return null;
  const rng = keyedRng(`${g.key}|story|${g.homeScore}-${g.awayScore}`);
  const raw = past ? law.storyBeyond!(g.homeScore, g.awayScore, rng) : law.story.events(g.homeScore, g.awayScore, rng);
  if (!Array.isArray(raw)) return null;
  const length = law.story.clock.length;
  const count = law.periods.count;
  /* the last period THIS game has: the extra ones are only reached by a game past regulation */
  const last = (past ? count : law.periods.regulation ?? count) - 1;
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
    if (!Number.isInteger(p) || p < 0 || p >= count || !(p <= last)) return null;
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
      : law.periods.of(decided.goAhead.min) === last ? 'late'
        : decided.first ? 'wire' : 'trade';
  const game: DerivedGame = { md, opp: 0, home: !flip, us: mine, them: theirs, fixed: false, played: true, started: true, line: {}, events };
  return { game, periods: { us, them }, deciding: decided.plays, goAhead: decided.goAhead, shape };
}

/** THE TOLD PATH: the quick path's final for a decided fixture, and its story
 *  from one club's side (null story: the final alone). Null when the law
 *  refuses the fixture, exactly when `quickGame` does. */
export function tellGame(score: ScoreLaw, day: GameDayLaw, f: GameDayFixture, viewAs: 'home' | 'away', md = 1): { told: ToldGame; story: GameStory | null } | null {
  const told = quickGame(score, f);
  return told ? { told, story: gameStory(day, told, viewAs, md) } : null;
}
