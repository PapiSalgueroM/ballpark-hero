/**
 * Round 647: the six sports' seasons, as the season ledger's projection
 * plays them (projectSeason in src/lib/seasonLedger.ts), side by side.
 *
 * Each shape is that engine's own season read off the engine: the win curve
 * it simulates with, its schedule, its field, its bracket, and the name it
 * gives every postseason round. Nothing here decides a game. The ledger
 * projects each season from these and scores the season against the
 * projection, so a shape that drifts from its engine would bias the score
 * against whichever teams the drift favours. scripts/simSeasonLedger.mjs
 * therefore plays the real engines and checks every shape against them: the
 * field size, the round count, the wins a series takes, the games spread,
 * and that every postseason game maps to a round.
 *
 * What legitimately differs per sport lives here as data; the scoring, the
 * row and the ledger live in the shared module and nowhere else.
 *
 * Round 647 fix: each shape also carries the offseason a GM who touches
 * nothing gets (untouched), because the next season is projected at the
 * close from the league as the regular season finished it, carried through
 * that offseason (projectNext in the ledger). In the four front offices the
 * draft cannot be skipped, so the untouched GM takes the first name on the
 * board at every pick, exactly as the board draws and orders it, and the
 * rival picks land where the board sends them; every man he cut this
 * season counts as his again, so a cut can never lower his own bar. The
 * dynasties' trail can be skipped, so the untouched coach signs nobody and
 * the engine refills the roster. scripts/simSeasonLedger.mjs reads each
 * board's draft to hold these to the board.
 *
 * Round names are data too: the recap states the projection in them.
 *
 * Type only import from the ledger, erased at build, so the harnesses can
 * load the ledger (or a control copy of it) beside the engines.
 */
import type { ProjectionTeam, SeasonFormat } from '@/lib/seasonLedger';
import {
  teamStrength, conferenceOf, divisionOf, NFL_WIN_SCALE, REGULAR_WEEKS, generateDraftClass, prospectToPlayer, draftOrder, runOffseason,
  type LeagueState, type PlayoffRound,
} from '@/lib/frontOffice';
import { nbaStrength, EAST, NBA_WIN_SCALE, NBA_ROUNDS, GAMES_PER_ROUND, nbaDraftClass, nbaProspectToPlayer, nbaStandings, nbaOffseason, type NbaLeague } from '@/lib/nbaFrontOffice';
import { mlbStrength, AL, MLB_DIVISIONS, MLB_WIN_SCALE, MLB_ROUNDS, MLB_GAMES_PER_ROUND, mlbDraftClass, mlbProspectToPlayer, mlbStandings, mlbOffseason, type MlbLeague } from '@/lib/mlbFrontOffice';
import { nhlStrength, EASTERN, NHL_FO_DIVISIONS, NHL_WIN_SCALE, NHL_FO_ROUNDS, NHL_GAMES_PER_ROUND, nhlDraftClass, nhlProspectToPlayer, nhlFoStandings, nhlOffseason, type NhlLeague } from '@/lib/nhlFrontOffice';
import { cfbStrength, CFB_SCHOOL_MAP, CFB_WIN_SCALE, CFB_ROUNDS, CONF_GAMES_START, cfbOffseason, type CfbState } from '@/lib/cfbDynasty';
import { cbbStrength, CBB_SCHOOL_MAP, CBB_WIN_SCALE, CBB_ROUNDS, DANCE_SIZE, cbbOffseason, type CbbState } from '@/lib/cbbDynasty';
import { leagueNames } from '@/lib/foNames';

export interface SeasonShape<L> {
  /* Each shape's format is a getter, read when a board projects rather than
     when this module loads, because the house rule is that nothing imported
     is evaluated at module scope (that is how an import cycle got in once). */
  readonly format: SeasonFormat;
  /** Rounds in the bracket, the final included. */
  rounds: number;
  /** The round a postseason game or series belongs to, 0 for one outside
      the bracket (a play-in). */
  roundOf: (name: string) => number;
  /** Every team in the league, as the projection reads it. */
  teams: (league: L) => ProjectionTeam[];
  /** Each round's name, round one first, the way the recap says it. */
  roundNames: readonly string[];
  /** What a season that never reached the field is called on the recap. */
  noField: string;
  /** Round 647 fix: the offseason a GM who touches nothing gets, played in
      place on a copy of the league as the regular season finished it. */
  untouched: (league: L, team: string, rng: () => number) => void;
}

/** A round as the recap says it: out in which round, the title, or no field. */
export function roundPhrase(shape: Pick<SeasonShape<unknown>, 'rounds' | 'roundNames' | 'noField'>, stage: number): string {
  if (!(stage > 0)) return shape.noField;
  if (stage > shape.rounds) return 'the title';
  return `out in the ${shape.roundNames[stage - 1] ?? `round ${stage}`}`;
}

/* The four front offices' leagues, as far as putting a cut man back needs. */
interface ProLeague {
  teams: Record<string, { players: { id: string }[]; releasedThisSeason?: string[] }>;
  freeAgents: { id: string }[];
}
/* Every man this team cut this season, back on its roster, from the pool
   or from the rival who signed him: the bar is the roster the season was
   played with, and a cut does not lower it. */
function keepReleased(lg: ProLeague, team: string): void {
  const mine = lg.teams[team];
  const cut = new Set(mine?.releasedThisSeason ?? []);
  if (!mine || !cut.size) return;
  const back: { id: string }[] = [];
  const keep = <P extends { id: string }>(xs: P[]): P[] => xs.filter(p => (cut.has(p.id) ? (back.push(p), false) : true));
  lg.freeAgents = keep(lg.freeAgents);
  for (const [id, t] of Object.entries(lg.teams)) if (id !== team) t.players = keep(t.players);
  mine.players.push(...back);
}
/* The board's draft for a GM who takes the first name every time: the class
   the board draws, the GM's pick, then the rivals' takes in the board's
   order, pick after pick. The four boards hold these numbers too, and
   simSeasonLedger reads them there. */
function untouchedDraft<P extends { id: string }, M>(
  cls: P[], picks: number, rivals: number, mine: M[], toPlayer: (p: P) => M | null, order: () => string[], rosterOf: (id: string) => M[],
): void {
  let left = cls;
  for (let k = 0; k < picks && left.length; k += 1) {
    const [first, ...rest] = left;
    const pl = toPlayer(first);
    if (pl) mine.push(pl);
    const takes = rest.slice(0, rivals);
    const ord = order();
    takes.forEach((p, i) => { const q = toPlayer(p); if (q && ord.length) rosterOf(ord[i % ord.length]).push(q); });
    left = rest.slice(rivals);
  }
}
/** What each front office's draft is: its class size, the GM's picks and the rival takes after each. */
export const FO_DRAFTS = {
  nfl: { size: 40, picks: 3, rivals: 6 },
  nba: { size: 24, picks: 2, rivals: 5 },
  mlb: { size: 24, picks: 2, rivals: 5 },
  nhl: { size: 24, picks: 2, rivals: 5 },
} as const;

/* The NBA, NHL and MLB engines draw each round's games: every team takes
   GAMES_PER_ROUND chances at a random opponent and plays each with
   probability one half. A team's own games are then binomial with variance
   games / 4, and the games other teams draw against it are close to Poisson
   with variance games / 2, so the count spreads by the square root of three
   quarters of the mean. Standings rank raw wins, which is why the spread
   matters: it is measured against the engines in simSeasonLedger. */
const drawnSpread = (games: number) => Math.sqrt(0.75 * games);

export const NFL_SEASON: SeasonShape<LeagueState> = {
  get format(): SeasonFormat {
    return {
      winScale: NFL_WIN_SCALE, games: REGULAR_WEEKS, gamesSpread: 0, groupGames: 0,
      /* 7 seeds a conference, the four division winners first, the 1 seed's
         bye, reseeded for the divisional round, one game a round. */
      bracket: 'group', field: 7, reseed: true, autoBids: false, divisions: 'winners',
      winsToAdvance: [1, 1, 1, 1],
    };
  },
  rounds: 4,
  roundOf: name => (/Super Bowl/.test(name) ? 4 : /Championship/.test(name) ? 3 : /Divisional/.test(name) ? 2 : /Wild Card/.test(name) ? 1 : 0),
  teams: lg => Object.values(lg.teams).map(t => ({ id: t.abbr, group: conferenceOf(t.abbr), division: divisionOf(t.abbr), strength: teamStrength(t) })),
  roundNames: ['Wild Card round', 'Divisional round', 'conference title game', 'Super Bowl'],
  noField: 'no playoff spot',
  untouched: (lg, team, rng) => {
    keepReleased(lg, team);
    const d = FO_DRAFTS.nfl;
    untouchedDraft(generateDraftClass(rng, d.size, leagueNames(lg)), d.picks, d.rivals, lg.teams[team].players,
      p => prospectToPlayer(p, rng), () => draftOrder(lg.teams).filter(a => a !== team), id => lg.teams[id].players);
    runOffseason(lg, rng);
  },
};

/** The NFL bracket as the ledger reads it: every game with its round's name. */
export function nflPlayoffGames(rounds: readonly PlayoffRound[]): { name: string; home: string; away: string; winner: string }[] {
  return rounds.flatMap(r => r.games.map(g => ({ name: r.name, home: g.home, away: g.away, winner: g.winner })));
}

export const NBA_SEASON: SeasonShape<NbaLeague> = {
  get format(): SeasonFormat {
    return {
      winScale: NBA_WIN_SCALE, games: NBA_ROUNDS * GAMES_PER_ROUND, gamesSpread: drawnSpread(NBA_ROUNDS * GAMES_PER_ROUND), groupGames: 0,
      /* 8 a conference on the bracket sheet (the play-in decides 7 and 8 and
         is not a round), best of seven throughout. */
      bracket: 'group', field: 8, reseed: false, autoBids: false, divisions: 'none',
      winsToAdvance: [4, 4, 4, 4],
    };
  },
  rounds: 4,
  roundOf: name => (/Play-In/.test(name) ? 0 : name === 'NBA Finals' ? 4 : / Finals$/.test(name) ? 3 : / Semis$/.test(name) ? 2 : / R1$/.test(name) ? 1 : 0),
  teams: lg => Object.values(lg.teams).map(t => ({ id: t.abbr, group: EAST.includes(t.abbr) ? 'East' : 'West', strength: nbaStrength(t) })),
  roundNames: ['first round', 'conference semis', 'conference finals', 'NBA Finals'],
  noField: 'no playoff spot',
  untouched: (lg, team, rng) => {
    keepReleased(lg, team);
    const d = FO_DRAFTS.nba;
    untouchedDraft(nbaDraftClass(rng, d.size, leagueNames(lg)), d.picks, d.rivals, lg.teams[team].players,
      p => nbaProspectToPlayer(p, rng), () => nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team), id => lg.teams[id].players);
    nbaOffseason(lg, rng);
  },
};

export const MLB_SEASON: SeasonShape<MlbLeague> = {
  get format(): SeasonFormat {
    return {
      winScale: MLB_WIN_SCALE, games: MLB_ROUNDS * MLB_GAMES_PER_ROUND, gamesSpread: drawnSpread(MLB_ROUNDS * MLB_GAMES_PER_ROUND), groupGames: 0,
      /* 6 a league, the three division winners first, byes for the top two,
         then best of three, five, seven and seven. */
      bracket: 'group', field: 6, reseed: false, autoBids: false, divisions: 'winners',
      winsToAdvance: [2, 3, 4, 4],
    };
  },
  rounds: 4,
  roundOf: name => (name === 'World Series' ? 4 : /CS$/.test(name) ? 3 : /DS$/.test(name) ? 2 : /Wild Card/.test(name) ? 1 : 0),
  teams: lg => Object.values(lg.teams).map(t => ({
    id: t.abbr, group: AL.includes(t.abbr) ? 'AL' : 'NL',
    division: MLB_DIVISIONS.find(d => d.teams.includes(t.abbr))?.name, strength: mlbStrength(t),
  })),
  roundNames: ['Wild Card Series', 'Division Series', 'Championship Series', 'World Series'],
  noField: 'no October spot',
  untouched: (lg, team, rng) => {
    keepReleased(lg, team);
    const d = FO_DRAFTS.mlb;
    untouchedDraft(mlbDraftClass(rng, d.size, leagueNames(lg)), d.picks, d.rivals, lg.teams[team].players,
      p => mlbProspectToPlayer(p, rng), () => mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team), id => lg.teams[id].players);
    mlbOffseason(lg, rng);
  },
};

export const NHL_SEASON: SeasonShape<NhlLeague> = {
  get format(): SeasonFormat {
    return {
      winScale: NHL_WIN_SCALE, games: NHL_FO_ROUNDS * NHL_GAMES_PER_ROUND, gamesSpread: drawnSpread(NHL_FO_ROUNDS * NHL_GAMES_PER_ROUND), groupGames: 0,
      /* Each division's top three and the conference's two wild cards,
         drawn inside the divisions, best of seven throughout. */
      bracket: 'group', field: 8, reseed: false, autoBids: false, divisions: 'sheet',
      winsToAdvance: [4, 4, 4, 4],
    };
  },
  rounds: 4,
  roundOf: name => (name === 'Stanley Cup Final' ? 4 : /^(Eastern|Western) Final$/.test(name) ? 3 : / Final$/.test(name) ? 2 : / Semi$/.test(name) ? 1 : 0),
  teams: lg => Object.values(lg.teams).map(t => ({
    id: t.abbr, group: EASTERN.includes(t.abbr) ? 'Eastern' : 'Western',
    division: NHL_FO_DIVISIONS.find(d => d.teams.includes(t.abbr))?.name, strength: nhlStrength(t),
  })),
  roundNames: ['first round', 'second round', 'conference final', 'Stanley Cup Final'],
  noField: 'no playoff spot',
  untouched: (lg, team, rng) => {
    keepReleased(lg, team);
    const d = FO_DRAFTS.nhl;
    untouchedDraft(nhlDraftClass(rng, d.size, leagueNames(lg)), d.picks, d.rivals, lg.teams[team].players,
      p => nhlProspectToPlayer(p, rng), () => nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team), id => lg.teams[id].players);
    nhlOffseason(lg, rng);
  },
};

export const CFB_SEASON: SeasonShape<CfbState> = {
  get format(): SeasonFormat {
    return {
      winScale: CFB_WIN_SCALE, games: CFB_ROUNDS, gamesSpread: 0, groupGames: CFB_ROUNDS - CONF_GAMES_START + 1,
      /* The twelve team Playoff: the conference champions in, seven at large,
         straight seeding, byes for 1 to 4, the bracket sheet after that. */
      bracket: 'league', field: 12, reseed: false, autoBids: true, divisions: 'none',
      winsToAdvance: [1, 1, 1, 1],
    };
  },
  rounds: 4,
  roundOf: name => (name === 'National Championship' ? 4 : name === 'CFP Semifinal' ? 3 : name === 'CFP Quarterfinal' ? 2 : name === 'CFP First Round' ? 1 : 0),
  teams: st => Object.values(st.teams).map(t => ({ id: t.id, group: CFB_SCHOOL_MAP.get(t.id)?.conf ?? '', strength: cfbStrength(t) })),
  roundNames: ['CFP First Round', 'CFP Quarterfinal', 'CFP Semifinal', 'National Championship'],
  noField: 'no Playoff spot',
  /* The trail can be skipped: an untouched coach signs nobody, and the
     offseason graduates, develops and refills the roster on its own. */
  untouched: (st, team, rng) => { st.myTeam = team; cfbOffseason(st, rng); },
};

const CBB_ROUND_NAMES = ['Round of 32', 'Sweet 16', 'Elite Eight', 'Final Four', 'National Championship'];

export const CBB_SEASON: SeasonShape<CbbState> = {
  get format(): SeasonFormat {
    return {
      /* Two games a round, one in the conference and one outside it. */
      winScale: CBB_WIN_SCALE, games: CBB_ROUNDS * 2, gamesSpread: 0, groupGames: CBB_ROUNDS,
      /* The 32 team Dance: the conference tournament winners in, the rest at
         large, reseeded every round, one game a round. */
      bracket: 'league', field: DANCE_SIZE, reseed: true, autoBids: true, divisions: 'none',
      winsToAdvance: [1, 1, 1, 1, 1],
    };
  },
  rounds: 5,
  roundOf: name => CBB_ROUND_NAMES.indexOf(name) + 1,
  teams: st => Object.values(st.teams).map(t => ({ id: t.id, group: CBB_SCHOOL_MAP.get(t.id)?.conf ?? '', strength: cbbStrength(t) })),
  roundNames: CBB_ROUND_NAMES,
  noField: 'no Tournament bid',
  untouched: (st, team, rng) => { st.myTeam = team; cbbOffseason(st, rng); },
};
