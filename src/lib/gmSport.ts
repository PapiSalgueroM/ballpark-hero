/**
 * Round 907: the GM sport descriptor.
 *
 * The four Front Office sims (NFL, NBA, MLB, NHL) grew up as four boards with
 * four save shapes, and every sport word lived as a constant on its own board.
 * Club Manager has a staff desk, a job market, an inbox, scouting and contract
 * talks; the front offices have none of them. Before any of that gets built
 * once and shared, the shared code needs one place to ask "what does this
 * sport call it, and how big is it". This file is that place.
 *
 * WHAT IS IN HERE. Words, the season's shape, the roster limits and the kind
 * of payroll line the sport plays under. Nothing else: no engine, no state,
 * no import from any of the four engines (a board must not drag the other
 * three sports' data into its chunk to learn one word).
 *
 * WHERE THE NUMBERS COME FROM. Every number below is the GAME's own rule, a
 * mirror of a constant an engine already exports and a board already enforces
 * (REGULAR_WEEKS, NBA_ROSTER_MAX and so on). None of them is a new claim about
 * the real league. scripts/simGmDesk.mjs bundles the four engines and fails if
 * a mirror here drifts from the constant it copies, so the two cannot quietly
 * disagree.
 *
 * EVERY FIELD IS REQUIRED. A sport that honestly has no such thing says null
 * (the NBA is the only one with a tip off floor above its roster minimum). A
 * field left out is a bug the harness catches, which is the point: a module
 * written against this file never has to guess a default for hockey.
 */
import type { FoSportWords } from './foOwnerMandate';

export type GmSportKey = 'nfl' | 'nba' | 'mlb' | 'nhl';

/**
 * The payroll line a GM works under.
 *   hard     a ceiling the payroll may not pass (NFL, NHL)
 *   softTax  a cap with a taxed band above it (NBA)
 *   cbtLine  no cap at all, one tax line (MLB)
 */
export type GmCapModel = 'hard' | 'softTax' | 'cbtLine';

/**
 * What the sport calls things. The first four fields are FoSportWords, so a
 * descriptor's words can be handed straight to the owner mandate engine.
 */
export interface GmSportWords extends FoSportWords {
  /** How the league is named in a sentence: 'the NFL', 'MLB'. */
  league: string;
  /** One unit of the season on this board: 'week' or 'round'. */
  period: string;
  /** What the play box is called: 'This week' or 'Play'. */
  play: string;
  /** What letting a man go is called, as a verb: 'cut', 'waive'. */
  release: string;
  /** The same, as the board already says it to you: 'You waived him this season.' */
  released: string;
  /** Who runs the bench. Baseball has a manager, the other three a head coach. */
  coach: string;
}

/** Roster limits for a full roster club. A club from an older, shorter save reads its own through its engine. */
export interface GmRosterLimits {
  /** The fewest men a club may carry. Release is refused at it. */
  min: number;
  /** The most. Signing is refused at it. */
  max: number;
  /** The count a season may not start below, when that is higher than min. null when the sport has none. */
  floor: number | null;
}

export interface GmCapShape {
  model: GmCapModel;
  /** What the board calls the line the payroll is read against. */
  line: string;
}

export interface GmSport {
  key: GmSportKey;
  words: GmSportWords;
  /** Regular season periods on this board (weeks or rounds), before the postseason. */
  periods: number;
  roster: GmRosterLimits;
  cap: GmCapShape;
}

export const GM_SPORT_KEYS: readonly GmSportKey[] = ['nfl', 'nba', 'mlb', 'nhl'];

export const GM_SPORTS: Record<GmSportKey, GmSport> = {
  nfl: {
    key: 'nfl',
    words: {
      title: 'the Super Bowl', playoffs: 'the playoffs', round: 'a playoff round', games: 17,
      league: 'the NFL', period: 'week', play: 'This week',
      release: 'cut', released: 'You cut him this season.', coach: 'head coach',
    },
    periods: 17,
    roster: { min: 6, max: 53, floor: null },
    cap: { model: 'hard', line: 'salary cap' },
  },
  nba: {
    key: 'nba',
    words: {
      title: 'the Finals', playoffs: 'the playoffs', round: 'a series', games: 80,
      league: 'the NBA', period: 'round', play: 'Play',
      release: 'waive', released: 'You waived him this season.', coach: 'head coach',
    },
    periods: 20,
    roster: { min: 8, max: 15, floor: 14 },
    cap: { model: 'softTax', line: 'salary cap' },
  },
  mlb: {
    key: 'mlb',
    words: {
      title: 'the World Series', playoffs: 'October', round: 'a series', games: 162,
      league: 'MLB', period: 'round', play: 'Play',
      release: 'designate for assignment', released: 'You designated him for assignment this season.', coach: 'manager',
    },
    periods: 27,
    roster: { min: 22, max: 28, floor: null },
    cap: { model: 'cbtLine', line: 'tax line' },
  },
  nhl: {
    key: 'nhl',
    words: {
      title: 'the Stanley Cup', playoffs: 'the playoffs', round: 'a series', games: 80,
      league: 'the NHL', period: 'round', play: 'Play',
      release: 'waive', released: 'You waived him this season.', coach: 'head coach',
    },
    periods: 20,
    roster: { min: 8, max: 15, floor: null },
    cap: { model: 'hard', line: 'salary cap' },
  },
};

/** The descriptor for a key. A key that is not one of the four throws: a wrong sport must never borrow another's rules. */
export function gmSport(key: GmSportKey): GmSport {
  const s = GM_SPORTS[key];
  if (!s) throw new Error(`gmSport: unknown sport ${String(key)}`);
  return s;
}
