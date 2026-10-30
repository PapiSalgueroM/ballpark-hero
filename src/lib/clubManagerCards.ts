/**
 * Round 1601: the player card's reader. A read of the save that draws nothing and writes nothing; it returns plain
 * data the card screen prints as it is. Only the lazy card screen and the harnesses import it.
 *
 * Every number on a card is one the game played or the data holds, and null means "the game does not count
 * this", never zero:
 *   - one of MY men: this season off his own line (all competitions), his league line off comp.league with his
 *     league clean sheets from the book (left off on a late book, which counts them from a later round only), and
 *     one row a season he played for my club, from the season archive (clubManagerCareerLines.ts), newest first,
 *     with history's club for that season;
 *   - a man of a RIVAL club of my league: his roster line (the one the club page shows) and his row in this
 *     season's league book at that club; the book holds no appearances, ratings or cards, so those are null;
 *   - a man of a club OUTSIDE my league: his roster line only; the game keeps goals for the clubs of my league.
 * The past rows speak the metric shape of Soccer Career's season history (SeasonHistoryMetric: key, label,
 * digits, value), so the site's two career tables are one shape. Its comparison screen is a different thing (two
 * seasons side by side) and is not shared.
 */
import {
  groupOf, leagueBoardsOf, leagueBookOf, oppRosterFor, sellValue,
  type CareerState, type CMPlayer, type LeagueBoards,
} from '@/lib/clubManager';
import type { Position } from '@/types/game';
import { mineSheets, rowKey } from '@/lib/clubManagerLeagueBook';
import { BOOK_FULL_SHARE } from '@/lib/clubManagerLeagueBoards';
import { averageOf, pastOf, rowIsHere } from '@/lib/clubManagerCareerLines';
import { worldYearOf } from '@/lib/clubManagerCalendar';
import { seasonLabel } from '@/lib/clubManagerEras';
import type { SeasonHistoryMetric } from '@/lib/soccerCareerSeasonHistory';

/** What a link opens: one of my men by squad id, or a man of another club by name, position and club. */
export type CardRef = { k: 'mine'; id: string } | { k: 'man'; name: string; pos: Position; club: string };

/** A season's line. null is "the game does not count this", never zero. */
export interface SeasonLine {
  apps: number | null;
  goals: number;
  assists: number;
  cleanSheets: number | null;
  yellows: number | null;
  reds: number | null;
  average: number | null;
}

/** One season he played for my club. */
export interface PastLine {
  season: number;
  label: string;
  club: string | null;
  metrics: SeasonHistoryMetric[];
}

/** The plain lines a card may carry, as codes the screen words once. */
export type CardNote =
  | { k: 'nobook' }            // no readable league book this season: the leaders card's own words
  | { k: 'late'; from: number }  // the book counts from round `from`
  | { k: 'thin'; share: number } // only part of the league's goals have a name
  | { k: 'outside' }           // a club outside my league: the game keeps goals for my league only
  | { k: 'leftclub' }          // a book row whose man the club's roster no longer holds
  | { k: 'thisclub' }          // a rival's count is for the club named only (a man who joined it this season)
  | { k: 'keptfrom'; from: number }; // seasons before season `from` were played before the game kept them

export interface PlayerCard {
  ref: CardRef;
  name: string;
  pos: Position;
  /** null when the club's roster no longer holds him (a book row only). */
  age: number | null;
  rating: number | null;
  /** In millions; null for a man who is not mine to sell (on loan here) or not on a roster. */
  worth: number | null;
  club: string;
  madeUp: boolean;
  mine: boolean;
  /** A keeper or a defender, by the engine's own crediting rule: the clean sheet lines show only for him. */
  back: boolean;
  now: SeasonLine | null;
  league: SeasonLine | null;
  past: PastLine[];
  keptFrom: number | null;
  notes: CardNote[];
}

/** The engine's clean sheet rule (clubManager.ts creditMatch): a keeper or a man of the defensive line. */
export const isBack = (pos: Position): boolean => pos === 'GK' || groupOf(pos) === 'DEF';

/** "2026-27" for a season number of this save. */
export function seasonLabelOf(state: Pick<CareerState, 'startYear'>, season: number): string {
  return seasonLabel(worldYearOf({ startYear: state.startYear, season }));
}

/** A past row's numbers in the shared metric shape. */
export function pastMetrics(row: readonly number[], back: boolean): SeasonHistoryMetric[] {
  const [, apps, goals, assists, cleanSheets, rating10] = row;
  return [
    { key: 'apps', label: 'Apps', digits: 0, value: apps },
    { key: 'goals', label: 'Goals', digits: 0, value: goals },
    { key: 'assists', label: 'Assists', digits: 0, value: assists },
    ...(back ? [{ key: 'cleanSheets' as const, label: 'Clean sheets', digits: 0 as const, value: cleanSheets }] : []),
    { key: 'rating', label: 'Average', digits: 1, value: averageOf(apps, rating10) },
  ];
}

const lineOfMine = (p: CMPlayer): SeasonLine => ({
  apps: p.apps ?? 0, goals: p.seasonGoals, assists: p.seasonAssists, cleanSheets: p.cleanSheets ?? 0,
  yellows: p.seasonYellows ?? 0, reds: p.seasonReds ?? 0, average: averageOf(p.apps ?? 0, Math.round((p.ratingSum ?? 0) * 10)),
});

/** The notes about this season's book, for a rival's league line. */
function bookNotes(boards: LeagueBoards | null): CardNote[] {
  if (!boards) return [{ k: 'nobook' }];
  const out: CardNote[] = [];
  if (boards.from !== null) out.push({ k: 'late', from: boards.from + 1 });
  if (boards.share < BOOK_FULL_SHARE) out.push({ k: 'thin', share: boards.share });
  return out;
}

/** Seasons before this one were played before the game kept them: the note, when there are any. */
function keptNote(state: CareerState): CardNote[] {
  const first = Math.min(state.season, ...state.history.map(h => h.season));
  /* No season has ended since the update: the season in play is the first one kept, or, on a save parked on its
     season review by the engine before the update, the one after it. */
  const from = state.pastFrom ?? (state.pendingSummary ? state.season + 1 : state.season);
  return from > first ? [{ k: 'keptfrom', from }] : [];
}

/** One card, or null when the man is not found (sold since the link was drawn, or never there). */
export function playerCardOf(state: CareerState, ref: CardRef): PlayerCard | null {
  if (ref.k === 'mine') {
    const away = (state.loanedOut ?? []).find(l => l?.player?.id === ref.id);
    const p = state.squad.find(x => x.id === ref.id) ?? away?.player;
    if (!p) return null;
    const back = isBack(p.position);
    const boards = leagueBoardsOf(state);
    const lg = p.comp?.league;
    const now = lineOfMine(p);
    const notes: CardNote[] = [];
    if (back && !boards) notes.push({ k: 'nobook' });
    if (back && boards && boards.from !== null) notes.push({ k: 'late', from: boards.from + 1 });
    return {
      ref, name: p.name, pos: p.position, age: p.age, rating: p.rating, worth: p.onLoan ? null : sellValue(p),
      club: state.clubName, madeUp: !!p.generated, mine: true, back,
      now: { ...now, cleanSheets: back ? now.cleanSheets : null },
      league: {
        apps: lg?.apps ?? 0, goals: lg?.goals ?? 0, assists: lg?.assists ?? 0,
        cleanSheets: back && boards && boards.from === null ? mineSheets(boards.input.book, p.id) : null,
        yellows: lg?.yellows ?? 0, reds: lg?.reds ?? 0, average: averageOf(lg?.apps ?? 0, Math.round((lg?.ratingSum ?? 0) * 10)),
      },
      /* Seasons HERE only: a row of a season finished at a club the manager has left is another man's. */
      past: pastOf(state.pastLines, p.id).filter(row => rowIsHere(state, row)).reverse().map(row => ({
        season: row[0], label: seasonLabelOf(state, row[0]),
        club: state.history.find(h => h.season === row[0])?.club ?? null,
        metrics: pastMetrics(row, back),
      })),
      keptFrom: state.pastFrom ?? null,
      notes: [...notes, ...keptNote(state)],
    };
  }
  const back = isBack(ref.pos);
  const roster = oppRosterFor(state, ref.club);
  const r = roster.find(x => x.n === ref.name && x.p === ref.pos) ?? null;
  const inLeague = ref.club !== state.clubName && (state.leagueClubs ?? []).includes(ref.club);
  const base = { ref, name: ref.name, pos: ref.pos, club: ref.club, mine: false, back, now: null, past: [], keptFrom: null };
  if (!inLeague) {
    if (!r) return null;
    return { ...base, age: r.a, rating: r.r, worth: r.v, madeUp: !!r.g, league: null, notes: [{ k: 'outside' }] };
  }
  const boards = leagueBoardsOf(state);
  /* ONLY his row at the club named: a row at a club he left cannot be told from a namesake's. */
  const row = boards ? boards.input.book.c[ref.club]?.m[rowKey({ n: ref.name, p: ref.pos, r: 0 })] : undefined;
  if (!r && !row) return null;
  return {
    ...base,
    age: r ? r.a : null, rating: r ? r.r : null, worth: r ? r.v : null, madeUp: r ? !!r.g : row?.[3] === 1,
    league: boards
      ? { apps: null, goals: row?.[0] ?? 0, assists: row?.[1] ?? 0, cleanSheets: back ? row?.[2] ?? 0 : null, yellows: null, reds: null, average: null }
      : null,
    notes: [...bookNotes(boards), ...(r ? (boards ? [{ k: 'thisclub' } as const] : []) : [{ k: 'leftclub' } as const])],
  };
}
