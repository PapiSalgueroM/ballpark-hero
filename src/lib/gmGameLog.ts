/* Round 1305: the season's told games of the GM's club, as one save field.

   A front office press tells the score of every game it plays
   (src/lib/gmGameScore.ts, the quick path). The games of the GM's own club
   are kept here, in order, so the season's results are in the save and a
   screen can read a result again after a reload. A board's saved schedule
   holds fixtures and no results, and its week's scores live in React state
   that a reload empties: before this field a finished game could not be
   read back at all.

   ONE SHAPE FOR FOUR BOARDS. Nothing in this file knows a sport. A bind
   (the NFL's is src/lib/frontOfficeGameDay.ts) makes the entries; this file
   holds them, reads them back and counts them. It sits in a board's own
   chunk (a press writes it and a load reads it, both in the same tick), so
   it imports the save field's reader and nothing else.

   ABSENT WHEREVER THERE IS NOTHING TO HOLD. The key is never written as
   null and never as an empty log: `addToGmGameLog` answers null until a
   game has been told, and a board spreads the key only when it holds a log
   (`...(log ? { gameLog: log } : {})`). A board must also DROP the log
   where its league starts over: a new franchise, an abandoned one, and the
   summer. A log outlives a press only inside one season of one franchise.

   THE READER IS ALL OR NOTHING AND NEVER REFUSES A SAVE. `readGmGameLog`
   answers null for anything that is not this season's log of this club's
   games, whole: a log with a hole would print a record that is not the
   league's. Null means the key is treated as absent, the save loads, and
   the next press starts a fresh log. Mark, never fill.

   THE LOG IS NOT THE SEASON'S RECORD. A save written before this round
   adopts the log in the middle of a season, so its log starts at the week
   it was first played here. `gmLogRecord` counts what the log holds and is
   the league's record only for a log kept from the first game: a harness
   holds that, and no screen may print it as "his record". */
import { readGmLastGame, type GmLastGame } from './gmGameScore';

/** The GM club's told games of one season, oldest first. */
export interface GmGameLog { v: 1; season: number; games: GmLastGame[] }

/** THIS SIM'S OWN: above any club's games in one season here (162 and a 22 game October is the longest). */
export const GM_GAME_LOG_CAP = 240;

/** The log with `games` added at its end. A null log, or a log of another
 *  season, starts a fresh one. Null: there is nothing to hold yet. Never
 *  mutates what it is handed; past the cap nothing is added. */
export function addToGmGameLog(log: GmGameLog | null, season: number, games: readonly GmLastGame[]): GmGameLog | null {
  const kept = log && log.season === season ? log.games : [];
  if (kept.length + games.length > GM_GAME_LOG_CAP) return kept.length > 0 ? { v: 1, season, games: [...kept] } : null;
  if (kept.length + games.length === 0) return null;
  return { v: 1, season, games: [...kept, ...games] };
}

/** A saved log, or null for anything that does not read as this season's
 *  log of `club`'s games (see the header). Never throws; hands back fresh
 *  objects of the known fields only. `isClub` must be a real membership
 *  test (a Set, or Object.hasOwn), as `readGmLastGame` says. */
export function readGmGameLog(value: unknown, isClub: (id: string) => boolean, season: number, club: string): GmGameLog | null {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const o = value as Record<string, unknown>;
    if (o.v !== 1 || o.season !== season || !Number.isInteger(season)) return null;
    if (!Array.isArray(o.games) || o.games.length === 0 || o.games.length > GM_GAME_LOG_CAP) return null;
    if (typeof club !== 'string' || isClub(club) !== true) return null;
    const games: GmLastGame[] = [];
    const keys = new Set<string>();
    for (const entry of o.games) {
      const g = readGmLastGame(entry, isClub);
      if (!g || (g.home !== club && g.away !== club) || keys.has(g.key)) return null;
      keys.add(g.key);
      games.push(g);
    }
    return { v: 1, season, games };
  } catch {
    return null;
  }
}

/* Round 1307: THE TILE'S BOX AND WHAT A BOARD HANDS IT. Both live here and
   not with the card, because a board needs them before the card's chunk
   has landed: the box is the board's own markup, so the page is the same
   height while the card loads, after it has loaded and on every face of
   it. One height a breakpoint (the match clock's feed is taller from md
   up, and a phone's lines wrap more); the card fills the box and only its
   named scroller ever scrolls. The two numbers are THIS SIM'S OWN and are
   only right while a browser walk says so: at 320, 390 and 1280 nothing
   in the box but that scroller may be taller than its own frame. */
export const GM_GAME_DAY_BOX = 'relative h-[400px] md:h-[352px]';

/** What a board hands its Game Day tile. Sport free: a bound card (the NFL's is src/components/front-office/NflGameDay.tsx) adds the law. */
export interface GmGameDayMount {
  /** His told games of the season, oldest first; the tile opens on the last. Empty: nothing told yet. */
  log: readonly GmLastGame[];
  /** His club, and the two words a club has: the one a sentence uses and the short one a score line uses. */
  my: string;
  name(id: string): string;
  short(id: string): string;
  /** His next game in the board's words; null: a bye, or the season is over. */
  next: { label: string; home: boolean } | null;
  /** The line under that fixture when the tile's own ("Play it or watch it. Your result lands here.") would not be true of this press; absent: the tile's own. */
  nextNote?: string;
  /** 'watch': the last game of `log` was just played and he asked to watch it. A BOARD SETS IT ONLY FOR A PRESS THAT ADDED AN ENTRY TO `log`: the tile opens the last entry, so a watched press that logged nothing would run the game before it on the clock. Nothing of its result is drawn until the clock is done, and `onWatched` then says so once. */
  mode: 'result' | 'watch';
  onWatched(): void;
  /** Where he stands today in the engine's own seeding; null: nothing to say. */
  standing: { table: string; seed: number | null; seeds: number } | null;
  /** Where the "?" sheet is put: an empty element inside a board's week box (the box must be `relative`, the element must take no spacing), so the sheet lies over the whole box; null: not there yet. */
  helpHost: HTMLElement | null;
}

/** His last told game, or null when the log holds none. */
export function lastGmGame(log: GmGameLog | null): GmLastGame | null {
  return log && log.games.length > 0 ? log.games[log.games.length - 1] : null;
}

/** What the log holds for `club`, counted by winner. `lostBeyond` is the
 *  losses the engine marked as past regulation (the NHL's third column,
 *  zero elsewhere). `counts` narrows it (a bind's regular season games
 *  only). This is the record OF THE LOG (see the header). */
export function gmLogRecord(log: GmGameLog | null, club: string, counts?: (g: GmLastGame) => boolean): { won: number; lost: number; lostBeyond: number } {
  const out = { won: 0, lost: 0, lostBeyond: 0 };
  for (const g of log ? log.games : []) {
    if ((g.home !== club && g.away !== club) || (counts && !counts(g))) continue;
    if (g.winner === club) out.won += 1;
    else { out.lost += 1; if (g.beyond === true) out.lostBeyond += 1; }
  }
  return out;
}
