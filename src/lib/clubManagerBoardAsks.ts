/**
 * Round 474: board asks that name a real target.
 *
 * His words (docs/TWEAKS-2026-08-28.md, the Club Manager arc): "Board asks
 * get specific: nationality quotas (usually the club's own country),
 * experience counts, position targets, a 90+ potential signing, a 100m+
 * marquee buy scaled to era."
 *
 * The old board wanted a league place, a cup run, a rival beaten and one of
 * three season quotas. All of those are things that HAPPEN to you. These five
 * are things you go and DO in the transfer market, and each one is derived
 * from the club and the era rather than typed:
 *
 *   NATIONALITY  one more player from the club's own country than it already
 *                has. The country comes from the league (LEAGUE_NATIONS) and
 *                the player's from Round 194's per world nationality map
 *                (src/data/playerNationalities.ts), which is the same source
 *                the transfer screen's nation filter and flags read. Per
 *                world matters here as much as it does there: the 2010 Aaron
 *                Ramsey is Welsh and the modern one is English, so an ask
 *                counted off one flat map would be counting the wrong men in
 *                an era save. A player the map has no country for counts for
 *                nobody: unknown is never a guess.
 *   EXPERIENCE   one more player aged 30 or over than the club already has.
 *   POSITION     a signing in the thinnest line in the squad.
 *   YOUNG STAR   a signing 21 or under at a rating floor read off the market.
 *   MARQUEE      one fee at or above a threshold read off the market and the
 *                club's own pot, which is what makes it era scaled without a
 *                single typed number: a 2005 modest club's world prices its
 *                own players and hands its own budget, so the ask lands at a
 *                few million there and at tens of millions at a 2026 giant.
 *
 * THE ASK HAS TO BE POSSIBLE, and that is the whole reason this file builds
 * an ask instead of writing one down. Every threshold above is read off the
 * market THIS SAVE ACTUALLY HAS, with a margin of spare targets on top, and
 * an ask whose margin is not there is never issued at all. A board that asks
 * a modest club for a hundred million pound signing in 2005 is not a hard
 * board, it is a broken one. scripts/simBoardAsks.mjs walks every playable
 * club in every era and holds that every ask a board can make is reachable
 * in that save, and prints the measured headroom.
 *
 * ON THE 90 PLUS POTENTIAL LINE. Potential in this engine is rolled with a
 * dice at the moment a signing joins (rollPotential in clubManager.ts) and is
 * not on the transfer screen, so a board ask graded on it would be a lottery
 * ticket rather than a target: the manager could not aim at it and could not
 * see whether he had hit it. The ask is graded on what the market screen
 * really shows, age and rating, and it is labelled as exactly that. The
 * ceiling is still what the board is buying, because that is where this
 * engine puts headroom (a 21 year old's roll adds up to ten, and up to
 * twenty five for the one in twelve carrying something special), and the
 * guide says so in those words.
 *
 * ADDITIVE ON PURPOSE. Nothing in here is stored beyond the objectives the
 * save already carries, plus one version number so an old save can be
 * repaired lazily and only once.
 */
import type { BoardObjective, CareerState, CMPlayer, MarketPlayer, ObjectiveStatus, PosGroup } from '@/lib/clubManager';
import {
  LEAGUE_NATIONS, SQUAD_LIMIT, buildMarket, careerLeagueOf, groupOf, money,
} from '@/lib/clubManager';
import { nationalityOf } from '@/data/playerNationalities';

/** Bump when the shape of a stored ask changes so old saves rebuild theirs. */
export const BOARD_ASKS_VERSION = 1;

export type BoardAskId = 'natQuota' | 'veterans' | 'posGap' | 'youngStar' | 'marquee';

const ASK_IDS: BoardAskId[] = ['natQuota', 'veterans', 'posGap', 'youngStar', 'marquee'];

export function isBoardAsk(id: string): id is BoardAskId {
  return (ASK_IDS as string[]).includes(id);
}

/** How many asks a board hands out on top of the league, cup and rival ones.
 *  Two, because the board screen is a list a phone has to hold and the base
 *  demands already run to four or six lines. */
const ASKS_PER_SEASON = 2;

/** The country the league sits in, spelt the way the nationality pull spells
 *  it. Only one of the nineteen league nations disagrees with the data. */
const LEAGUE_NATION_ALIAS: Record<string, string> = { USA: 'United States' };

/** The oldest a player can be and still count as one for the future. */
const YOUNG_AGE = 21;
/** Where "experienced" starts, which is also where rollPotential stops
 *  giving anybody any headroom at all. */
const VETERAN_AGE = 30;

const POS_GROUP_WORD: Record<PosGroup, string> = {
  GK: 'goalkeeper', DEF: 'defender', MID: 'midfielder', ATT: 'forward',
};

const GROUP_ORDER: PosGroup[] = ['GK', 'DEF', 'MID', 'ATT'];
/**
 * What a squad in this game normally carries in each line, so "thin" is
 * measured against the job rather than in raw headcount (four forwards is a
 * full attack, four keepers is a hoarder).
 *
 * MEASURED, not guessed. Over the starting squad of all 470 playable club and
 * era combinations the medians are exactly GK 2, DEF 5, MID 5, ATT 4 on a
 * median squad of 17. The first pass of this round used a guessed GK 2, DEF 6,
 * MID 6, ATT 4 and a fixed tie order, and the board asked 470 clubs for a
 * goalkeeper 49 times and for a forward not once. Re-measure these if a roster
 * re-bake moves the composition; scripts/simBoardAsks.mjs prints the
 * distribution and fails if a whole line stops being reachable.
 */
const GROUP_NEED: Record<PosGroup, number> = { GK: 2, DEF: 5, MID: 5, ATT: 4 };

function hash32(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Round a money threshold down to a number a board would say out loud. */
function niceFloor(m: number): number {
  if (m >= 100) return Math.floor(m / 10) * 10;
  if (m >= 20) return Math.floor(m / 5) * 5;
  if (m >= 5) return Math.floor(m);
  return Math.max(0.5, Math.floor(m * 2) / 2);
}

/** The club's own country, or null where the league has none on file. */
export function clubCountry(career: Pick<CareerState, 'clubName' | 'eraId' | 'customClub'>): string | null {
  const raw = LEAGUE_NATIONS[careerLeagueOf(career).id];
  if (!raw) return null;
  return LEAGUE_NATION_ALIAS[raw] ?? raw;
}

/** Squad members who count towards a country quota, read in the save's own
 *  world. A generated player and a player the map has no country for both
 *  count for nobody, on purpose. */
function fromCountry(squad: CMPlayer[], country: string, eraId: string | undefined): number {
  return squad.filter(p => !p.onLoan && nationalityOf(eraId, p.name) === country).length;
}

/* ================================================================== */
/* Building the asks                                                  */
/* ================================================================== */

/** One candidate ask plus the headroom that says it is reachable. */
export interface AskCandidate {
  objective: BoardObjective;
  /** How many ways this save has of meeting it. Never issued under 2. */
  targets: number;
  /** The cheapest cash this save can meet it for, in £m. Two asks are only
   *  put on the same board when both of these fit inside the pot. */
  minSpend: number;
}

/**
 * The share of the pot an ask is allowed to point at. A fee can move in a
 * negotiation and a rival bidder can drive it up, so an ask read off a
 * target priced at the very last pound of the budget is an ask the manager
 * can lose by haggling. Fifteen percent is the room this leaves.
 */
const SPEND_MARGIN = 0.85;

/** Every ask this save could hand out, with its measured headroom. Exported
 *  so scripts/simBoardAsks.mjs can hold the headroom rather than re-deriving
 *  it beside the engine and drifting. */
export function askCandidates(career: CareerState): AskCandidate[] {
  const squad = career.squad ?? [];
  const budget = career.budget ?? 0;
  const market: MarketPlayer[] = buildMarket(career);
  const affordable = market.filter(p => p.price <= budget * SPEND_MARGIN);
  const out: AskCandidate[] = [];
  const room = SQUAD_LIMIT - squad.length;
  const cheapest = (pool: MarketPlayer[]): number =>
    pool.reduce((lo, p) => Math.min(lo, p.price), Infinity);

  /* ---- nationality ---- */
  const country = clubCountry(career);
  if (country) {
    const have = fromCountry(squad, country, career.eraId);
    const pool = affordable.filter(p => nationalityOf(career.eraId, p.name) === country);
    /* Two spare targets, not one: the market screen sells to other clubs too
       and a single reachable name is a coin flip dressed as an objective. */
    if (pool.length >= 2 && room >= 1 && have + 1 <= SQUAD_LIMIT) {
      const n = have + 1;
      out.push({
        targets: pool.length,
        minSpend: cheapest(pool),
        objective: {
          id: 'natQuota',
          target: n,
          country,
          label: `Have ${n} player${n === 1 ? '' : 's'} from ${country} in the squad`,
        },
      });
    }
  }

  /* ---- experience ---- */
  {
    const have = squad.filter(p => !p.onLoan && p.age >= VETERAN_AGE).length;
    const pool = affordable.filter(p => p.age >= VETERAN_AGE);
    /* A board wants a head on the squad, not a pension scheme, so the ask
       stops climbing once the dressing room already has six of them. */
    if (pool.length >= 2 && room >= 1 && have < 6) {
      const n = have + 1;
      out.push({
        targets: pool.length,
        minSpend: cheapest(pool),
        objective: {
          id: 'veterans',
          target: n,
          minAge: VETERAN_AGE,
          label: `Have ${n} player${n === 1 ? '' : 's'} aged ${VETERAN_AGE} or over in the squad`,
        },
      });
    }
  }

  /* ---- position ---- */
  {
    /* The thinnest line as a share of what that line normally carries. Ties
       (and a squad padded to the coverage floor ties in all four) are broken
       by the club's own name, not by a fixed order, or every padded squad in
       the world would be told to sign the same kind of player. */
    const spin = hash32(`${career.clubName}|line`) % GROUP_ORDER.length;
    let thin: PosGroup = GROUP_ORDER[spin];
    let worst = Infinity;
    for (let i = 0; i < GROUP_ORDER.length; i++) {
      const g = GROUP_ORDER[(spin + i) % GROUP_ORDER.length];
      const n = squad.filter(p => !p.onLoan && groupOf(p.position) === g).length;
      const short = n / GROUP_NEED[g];
      if (short < worst) { worst = short; thin = g; }
    }
    const pool = affordable.filter(p => groupOf(p.position) === thin);
    if (pool.length >= 2 && room >= 1) {
      out.push({
        targets: pool.length,
        minSpend: cheapest(pool),
        objective: {
          id: 'posGap',
          target: 1,
          posGroup: thin,
          label: `Sign a ${POS_GROUP_WORD[thin]} this season`,
        },
      });
    }
  }

  /* ---- the young star ---- */
  {
    const young = affordable
      .filter(p => p.age <= YOUNG_AGE)
      .sort((a, b) => b.rating - a.rating);
    /* The floor is the rating of the FIFTH best affordable kid, so the ask
       always leaves five ways of meeting it rather than pointing at the one
       name the save happens to be able to reach. Three is the hard minimum;
       under that the club is not shopping in this part of the market and the
       board does not ask. */
    if (young.length >= 3) {
      const floor = young[Math.min(4, young.length - 1)].rating;
      const hits = young.filter(p => p.rating >= floor);
      const reach = hits.length;
      /* And it has to be a signing worth calling one. Below 70 this is not a
         star of the future, it is a squad filler, and a board asking for one
         is noise on the screen. */
      if (floor >= 70 && room >= 1) {
        out.push({
          targets: reach,
          minSpend: cheapest(hits),
          objective: {
            id: 'youngStar',
            target: 1,
            minRating: floor,
            maxAge: YOUNG_AGE,
            label: `Sign someone ${YOUNG_AGE} or under rated ${floor} or better`,
          },
        });
      }
    }
  }

  /* ---- the marquee buy ---- */
  {
    const priced = affordable.map(p => p.price).sort((a, b) => b - a);
    if (priced.length >= 3) {
      /* The third dearest name the club can actually afford, held under
         seventy percent of the pot so meeting it does not eat the window
         whole. Rounded down to a number a board would say out loud. */
      const raw = Math.min(priced[2], budget * 0.7);
      const feeMin = niceFloor(raw);
      const hits = affordable.filter(p => p.price >= feeMin);
      if (feeMin >= 0.5 && hits.length >= 3) {
        out.push({
          targets: hits.length,
          minSpend: cheapest(hits),
          objective: {
            id: 'marquee',
            target: 1,
            feeMin,
            label: `Spend ${money(feeMin)} or more on one signing`,
          },
        });
      }
    }
  }

  return out;
}

/**
 * The two asks this club's board makes this season. Deterministic from the
 * club and the season, so a save always asks the same thing and the league as
 * a whole still feels varied, and drawn only from the asks this save can
 * actually meet.
 *
 * TWO ASKS THAT ARE EACH POSSIBLE CAN STILL BE IMPOSSIBLE TOGETHER, and this
 * is where that is caught. Every ask on this list is met by signing somebody,
 * so a pair costs the club two fees and two squad slots. The first draft of
 * this round put a ninety five million pound marquee buy on Chelsea's board
 * beside a rated 89 under 21, which is two thirds of the pot each and one
 * squad that cannot have both. The second ask is only added when the cheapest
 * way of meeting BOTH still fits inside the budget, which is the conservative
 * read (a single signing that happens to answer both is a bonus, never an
 * assumption).
 */
export function buildBoardAsks(career: CareerState): BoardObjective[] {
  const pool = askCandidates(career);
  if (pool.length === 0) return [];
  const budget = career.budget ?? 0;
  const room = SQUAD_LIMIT - (career.squad?.length ?? 0);
  const h = hash32(`${career.clubName}|${career.season}|${career.eraId ?? 'now'}`);
  const start = h % pool.length;
  const out: BoardObjective[] = [];
  /* The same fifteen percent of haggling room the single ask leaves, applied
     to the pair, so a board can never spend the whole pot for you. */
  const ceiling = budget * SPEND_MARGIN;
  let spent = 0;
  for (let i = 0; i < pool.length && out.length < ASKS_PER_SEASON; i++) {
    const cand = pool[(start + i) % pool.length];
    if (out.length >= room) break;
    if (spent + cand.minSpend > ceiling) continue;
    spent += cand.minSpend;
    out.push(cand.objective);
  }
  return out;
}

/**
 * Repair a save made before this round, or one whose asks were built by an
 * older shape. Fails closed: a save already carrying this version's asks is
 * left alone, and a mid season save past its last window never has a signing
 * ask bolted on that it could no longer meet.
 */
export function ensureBoardAsks(state: CareerState): void {
  if (state.boardAsksVersion === BOARD_ASKS_VERSION) return;
  if (!Array.isArray(state.boardObjectives) || state.boardObjectives.length === 0) return;
  if (!Array.isArray(state.squad) || !Array.isArray(state.calendar)) return;
  const already = state.boardObjectives.some(o => isBoardAsk(o.id));
  if (already) {
    // Built by this round's code already; just stamp it so this stops running.
    state.boardAsksVersion = BOARD_ASKS_VERSION;
    return;
  }
  /* Fail closed: a save whose world will not build a market keeps the board
     it already had rather than opening on a broken screen, and it is left
     unstamped so a later load can try again. */
  try {
    /* A mid season save whose last window has already shut never has a
       signing ask bolted onto it: it could not meet one, and an objective
       nobody can meet is the exact thing this round exists to stop. */
    if (windowAhead(state)) {
      state.boardObjectives = [...state.boardObjectives, ...buildBoardAsks(state)];
    }
    state.boardAsksVersion = BOARD_ASKS_VERSION;
  } catch {
    /* leave the save exactly as it was */
  }
}

/* ================================================================== */
/* Grading                                                            */
/* ================================================================== */

/** Is there still a transfer window between here and the end of the season? */
function windowAhead(career: CareerState): boolean {
  if (career.transferWindow) return true;
  const cal = career.calendar ?? [];
  for (let i = Math.max(0, career.week); i < cal.length; i++) {
    if (cal[i].type === 'window') return true;
  }
  return false;
}

/** Names that came IN this season, so a signing ask reads the squad rather
 *  than a transfer record that never carried a position or an age. */
function signedThisSeason(career: CareerState, includeLoans: boolean): Set<string> {
  const out = new Set<string>();
  for (const s of career.seasonSignings ?? []) {
    if (s.dir !== 'in') continue;
    if (!includeLoans && s.loan) continue;
    out.add(s.name);
  }
  return out;
}

/**
 * The live status of one board ask, or null when the objective is one of the
 * older shapes objectiveStatuses grades itself.
 *
 * Every ask grades the same way: met is done and stays done, an unmet ask at
 * the final whistle has failed, and in between it reads on track while a
 * window is still to come and behind once the last one has shut.
 */
export function askStatus(career: CareerState, objective: BoardObjective): ObjectiveStatus | null {
  if (!isBoardAsk(objective.id)) return null;
  const squad = career.squad ?? [];
  const seasonDone = career.week >= (career.calendar?.length ?? 0);
  let met = false;

  if (objective.id === 'natQuota') {
    met = !!objective.country && fromCountry(squad, objective.country, career.eraId) >= objective.target;
  } else if (objective.id === 'veterans') {
    const age = objective.minAge ?? VETERAN_AGE;
    met = squad.filter(p => !p.onLoan && p.age >= age).length >= objective.target;
  } else if (objective.id === 'posGap') {
    const ins = signedThisSeason(career, true);
    met = !!objective.posGroup && squad.some(p => ins.has(p.name) && groupOf(p.position) === objective.posGroup);
  } else if (objective.id === 'youngStar') {
    const ins = signedThisSeason(career, false);
    const maxAge = objective.maxAge ?? YOUNG_AGE;
    const minRating = objective.minRating ?? 99;
    met = squad.some(p => ins.has(p.name) && p.age <= maxAge && p.rating >= minRating);
  } else if (objective.id === 'marquee') {
    const feeMin = objective.feeMin ?? Infinity;
    met = (career.seasonSignings ?? []).some(s => s.dir === 'in' && !s.loan && s.fee >= feeMin);
  }

  if (met) return 'done';
  if (seasonDone) return 'failed';
  return windowAhead(career) ? 'onTrack' : 'behind';
}

/** One line of plain English for the board screen, saying how the ask is
 *  judged. Kept beside the grading above so the words cannot drift from it. */
export function askExplainer(objective: BoardObjective): string | null {
  if (!isBoardAsk(objective.id)) return null;
  switch (objective.id) {
    case 'natQuota':
      return `Counts everyone in your squad from ${objective.country ?? 'that country'}. A player you have in on loan does not count, and neither does anybody whose country we do not have on file.`;
    case 'veterans':
      return `Counts everyone in your squad aged ${objective.minAge ?? VETERAN_AGE} or over. A player you have in on loan does not count.`;
    case 'posGap':
      return 'Any signing in that line does it, loans included. It is the thinnest part of your squad right now.';
    case 'youngStar':
      return 'A permanent signing only. He counts once he is in your squad at that age and that rating or better.';
    case 'marquee':
      return 'One fee, not a season of them. Loans and free transfers do not count.';
    default:
      return null;
  }
}
