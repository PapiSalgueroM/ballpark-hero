import { NHL_FO_ROSTERS } from '@/data/nhlFoPlayers';
import { GauntletConfig, FormationLike } from '@/lib/gauntletEngine';

/**
 * Gauntlet Draft: NHL (Round 724). The fifth sport on the shared engine in
 * src/lib/gauntletEngine.ts, and the last of the big four leagues. Data plus
 * the sport's own language, no new rules, per the one engine many sports rule
 * in CLAUDE.md. src/lib/gauntletDraftMlb.ts is the shape this follows.
 *
 * THE POOL. src/data/nhlFoPlayers.ts, the real 2026-27 rosters NHL Front
 * Office already plays: 32 clubs, 13 players each, pulled from the NHL's own
 * public API. Like the MLB pool and unlike the NFL one, the ratings come from
 * real production: forwards off their 2025-26 points per game percentile,
 * defensemen the same among defensemen, goalies off a blend of save percentage
 * and wins. See that data file's own header for the generation rules.
 *
 * ONE THING LEFT OUT, ON PURPOSE. That generator gives a player with no
 * qualifying 2025-26 season a flat 68 instead of a percentile, and the file
 * does not mark which rows got the stand in. Measured on it (2026-10-01):
 * exactly four rows sit at 68, all four are goalies (one of them a 22 year old
 * prospect), and no goalie anywhere in the file sits at 66 or 67, where the
 * goalie scale actually starts. A 68 there could be a real percentile, but it
 * cannot be told apart from the placeholder, and a card is a rating claim. So
 * all four stay out of the deal (59 goalies remain, plenty for one slot)
 * rather than risk dealing a number the stats never produced.
 * scripts/simGauntletEngine.mjs section 7 holds this: every pool card is a
 * source row with the same name, position and rating, every source row not at
 * 68 is in the pool, and nothing at 68 is.
 *
 * THE SHAPE. A hockey team's lineup as people actually talk about it: the top
 * six forwards (two lines of a centre and two wingers), the top four on
 * defense (two pairs) and a starter in net. Eleven slots, the same depth the
 * soccer XI and the MLB lineup card play at. The data carries C, W, D and G
 * (the generator folds left and right wing into W), so a wing slot takes a
 * winger or a centre, because a centre moving out to the wing is an everyday
 * line change, while a centre slot takes only a centre, because a winger taking
 * the draws is not. Defense and goal take only their own.
 *
 * WHY THE CARD SAYS "EDM". Same reason as the MLB board: the full club names
 * live in src/data/conquestDataNhl.ts, which pulls the conquest map geometry
 * into whatever imports it. The abbreviation is a real fact the roster data
 * carries itself, and any hockey fan reads it at a glance.
 */

export interface NhlGauntletPlayer {
  name: string;
  pos: string;
  ovr: number;
  team: string;
}

/** The generator's stand in for "no qualifying 2025-26 season". */
export const NHL_NO_SEASON_DEFAULT = 68;

/** Flattened straight off NHL_FO_ROSTERS: every player on every 2026-27
 *  roster except the ones at the placeholder rating, real name, real derived
 *  rating, nothing invented. */
export const NHL_GAUNTLET_POOL: NhlGauntletPlayer[] = Object.entries(NHL_FO_ROSTERS)
  .flatMap(([abbr, seeds]) => seeds
    .filter(s => s.ovr !== NHL_NO_SEASON_DEFAULT)
    .map(s => ({ name: s.name, pos: s.pos, ovr: s.ovr, team: abbr })));

const NHL_FORMATION: FormationLike = {
  name: 'Top Six, Top Four and a Starter',
  slots: [
    { label: 'C', allowed: ['C'] },
    { label: 'W', allowed: ['W', 'C'] },
    { label: 'W', allowed: ['W', 'C'] },
    { label: 'C', allowed: ['C'] },
    { label: 'W', allowed: ['W', 'C'] },
    { label: 'W', allowed: ['W', 'C'] },
    { label: 'D', allowed: ['D'] },
    { label: 'D', allowed: ['D'] },
    { label: 'D', allowed: ['D'] },
    { label: 'D', allowed: ['D'] },
    { label: 'G', allowed: ['G'] },
  ],
};

/* MEASURED, not chosen (2026-10-01, five independent seed streams of 300
   drafts each, the same recipe scripts/simGauntletEngine.mjs section 4 runs on
   one of them): an always-best-card eleven off this pool rates 95.0 and an
   always-worst-card eleven 78.6, a 16 point gap, close to the MLB pool's 94
   and 76. So the ladder takes the MLB ladder's offsets: the qualifier sits
   just under the worst eleven so a bad draft still gets a game, and the final
   sits three over the best eleven so the Cup is rare rather than unreachable.
   Against it the best eleven clears 3.42 to 3.60 rounds and lifts the Cup in
   11.0 to 18.0 percent of runs; the worst clears 0.69 to 0.74 and never once
   lifted it in 1500 runs.

   Five rounds, because the scoring identity needs five and the real playoffs
   have four, so the extra one in front is the Qualifying Round, which the NHL
   really did play in the 2020 return to play. */
export const NHL_GAUNTLET_ROUNDS = [
  { name: 'The Qualifying Round', opp: 'Pinecrest Huskies', rating: 77 },
  { name: 'The First Round', opp: 'Harrowgate Blizzard', rating: 84 },
  { name: 'The Second Round', opp: 'Silver Narrows Lynx', rating: 89 },
  { name: 'The Conference Final', opp: 'Kingsmere Foxes', rating: 94 },
  { name: 'The Cup Final', opp: 'Fort Aurora Northmen', rating: 98 },
] as const;

/* Distinct from soccer's 0x47445231, the NBA's 0x4e424131, the NFL's
   0x4e464c31 and the MLB's 0x4d4c4231 so no two sports draw the same daily
   seed off the same ET date. 'NHL1' read as bytes, the value the MLB file
   already reserved for it. */
const NHL_DAILY_SALT = 0x4e484c31;

export const NHL_GAUNTLET_CONFIG: GauntletConfig<NhlGauntletPlayer> = {
  gameId: 'nhl-gauntlet-draft',
  pool: NHL_GAUNTLET_POOL,
  nameOf: p => p.name,
  ratingOf: p => p.ovr,
  fitsSlot: (p, slot) => slot.allowed.includes(p.pos),
  formations: [NHL_FORMATION],
  rounds: NHL_GAUNTLET_ROUNDS,
  dailySeedSalt: NHL_DAILY_SALT,

  gameName: 'Gauntlet Draft: NHL',
  gamePath: '/nhl-gauntlet-draft',
  emoji: '🏒',
  squadNoun: 'lineup',
  slotsPhrase: 'spots in the lineup (two forward lines, two defense pairs and a goalie)',
  /* A knockout is the playoffs, and playoff hockey has no shootout: a level
     game goes to twenty minute sudden death periods until somebody scores. */
  tiebreak: { phrase: 'sudden death overtime, period after period until somebody scores', won: 'Won in overtime', lost: 'Lost in overtime' },
  /* Round 826: the first overtime period settling it is still overtime. */
  extraTime: { won: 'Won in overtime', lost: 'Lost in overtime' },
  subtitleOf: p => p.team,
  positionOf: p => p.pos,
  /* The pool runs 69 to 97 on real production percentiles, a little tighter
     than the MLB pool, so the floors sit a little higher than its 93, 85, 77. */
  tierFloors: [94, 88, 82],
  /* Identity: the engine's goals already read as a real hockey score. */
  scoreline: g => g,
  /* The overtime winner. */
  tiebreakBump: 1,
};
