import { MLB_FO_ROSTERS } from '@/data/mlbFoPlayers';
import { GauntletConfig, FormationLike } from '@/lib/gauntletEngine';

/**
 * Gauntlet Draft: MLB (Round 538). The fourth sport on the shared engine in
 * src/lib/gauntletEngine.ts. Data plus the sport's own language, no new rules,
 * per the one engine many sports rule in CLAUDE.md.
 *
 * THE POOL. src/data/mlbFoPlayers.ts, the real 2026 40 man roster data MLB
 * Front Office already plays: 30 clubs, 13 players each, pulled from MLB's own
 * public StatsAPI. Worth saying plainly because the NFL board could not say
 * it: these ratings are derived from real 2025 production, hitters off their
 * OPS percentile and pitchers off a FIP-lite percentile, not from draft
 * position and years served. So unlike src/lib/gauntletDraftNfl.ts, which is
 * scoped to four skill positions because the other four families lean on proxy
 * ratings, this one can field the whole lineup card honestly. See that data
 * file's own header for the generation rules.
 *
 * THE SHAPE. The nine in the batting order, plus a starter and a closer,
 * because a modern baseball game is decided by the bullpen as much as by the
 * order, and because eleven slots is the same depth the soccer XI already
 * plays at. Positional fit follows the real sport: the corner outfield spots
 * take either corner, centre field does not (it is the premium defensive spot
 * and treating it as interchangeable would be the kind of small untruth this
 * repo keeps catching), and the designated hitter takes any position player at
 * all, which is exactly what the rule says. A catcher turning up as your DH is
 * correct baseball, not a bug.
 *
 * WHY THE CARD SAYS "LAD" AND NOT "Los Angeles Dodgers". The full club names
 * live in src/data/conquestDataMlb.ts, whose 30 ids match these roster keys
 * exactly (checked, not assumed). Importing that module to letter a card
 * subtitle would pull src/data/usStatesPaths.ts and the conquest map geometry
 * into this route's chunk, roughly 23KB of SVG for a line of text, and would
 * couple a draft game to the conquest data the map work is actively reshaping.
 * Copying the 30 names in here instead would be a second copy of a table this
 * repo already holds once. So the card shows the abbreviation, which is a real
 * fact carried by the roster data itself and which any baseball fan reads at a
 * glance. If a small shared club identity module ever lands, this should use
 * it, and that would improve the conquest data too.
 */

export interface MlbGauntletPlayer {
  name: string;
  pos: string;
  ovr: number;
  team: string;
}

/** Flattened straight off MLB_FO_ROSTERS: every player on every 2026 roster,
 *  real name, real derived rating, nothing invented. */
export const MLB_GAUNTLET_POOL: MlbGauntletPlayer[] = Object.entries(MLB_FO_ROSTERS)
  .flatMap(([abbr, seeds]) => seeds.map(s => ({ name: s.name, pos: s.pos, ovr: s.ovr, team: abbr })));

const POSITION_PLAYERS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

const MLB_FORMATION: FormationLike = {
  name: 'The Lineup Card',
  slots: [
    { label: 'C', allowed: ['C'] },
    { label: '1B', allowed: ['1B'] },
    { label: '2B', allowed: ['2B'] },
    { label: '3B', allowed: ['3B'] },
    { label: 'SS', allowed: ['SS'] },
    { label: 'LF', allowed: ['LF', 'RF'] },
    { label: 'CF', allowed: ['CF'] },
    { label: 'RF', allowed: ['RF', 'LF'] },
    { label: 'DH', allowed: POSITION_PLAYERS },
    { label: 'SP', allowed: ['SP'] },
    { label: 'CL', allowed: ['CL', 'RP'] },
  ],
};

/* MEASURED, not chosen: scripts/simGauntletEngine.mjs section 4 prints the
   real numbers over 300 seeded drafts. An always-best-card eleven off this
   pool averages a squad rating of 94, an always-worst-card eleven 76, an 18
   point gap. That sits between the NBA's narrow curated band and the NFL's
   very wide one, which is what a whole league of real production percentiles
   should look like. Set from that measurement: the qualifier sits under the
   worst eleven so a bad draft still gets a game, and the final sits a little
   over the best eleven's own ceiling so the trophy is rare rather than
   unreachable, the shape every ladder here uses. */
export const MLB_GAUNTLET_ROUNDS = [
  { name: 'The Wild Card', opp: 'Brambleton Bandits', rating: 74 },
  { name: 'The Division Series', opp: 'Lakeshore Mariners', rating: 81 },
  { name: 'The Championship Series', opp: 'Fort Amity Sluggers', rating: 87 },
  { name: 'The Pennant', opp: 'Cypress Hollow Owls', rating: 92 },
  { name: 'The Series', opp: 'Old Mill Monarchs', rating: 97 },
] as const;

/* Distinct from soccer's 0x47445231, the NBA's 0x4e424131, the NFL's
   0x4e464c31 and the NHL's 0x4e484c31 so no two sports draw the same daily
   seed off the same ET date. 'MLB1' read as bytes. */
const MLB_DAILY_SALT = 0x4d4c4231;

export const MLB_GAUNTLET_CONFIG: GauntletConfig<MlbGauntletPlayer> = {
  gameId: 'mlb-gauntlet-draft',
  pool: MLB_GAUNTLET_POOL,
  nameOf: p => p.name,
  ratingOf: p => p.ovr,
  fitsSlot: (p, slot) => slot.allowed.includes(p.pos),
  formations: [MLB_FORMATION],
  rounds: MLB_GAUNTLET_ROUNDS,
  dailySeedSalt: MLB_DAILY_SALT,

  gameName: 'Gauntlet Draft: MLB',
  gamePath: '/mlb-gauntlet-draft',
  emoji: '⚾',
  squadNoun: 'lineup',
  slotsPhrase: 'spots on the lineup card (the nine, a starter and a closer)',
  tiebreak: { phrase: 'extra innings, and more of them until somebody wins', won: 'Won in extra innings', lost: 'Lost in extra innings' },
  subtitleOf: p => p.team,
  positionOf: p => p.pos,
  /* The pool runs 64 to 97 on real production percentiles, so these floors sit
     near the NFL's rather than the NBA's curated legends band. */
  tierFloors: [93, 85, 77],
  /* Identity: a baseball score is already small integers, and the engine's own
     model lands squarely in the range a real game does. */
  scoreline: g => g,
  tiebreakBump: 1,
};
