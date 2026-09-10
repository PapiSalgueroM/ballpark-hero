import { NBA_POOL, NBA_LINEUP_CONFIG, NbaPoolPlayer } from '@/data/nbaPerfectLineupPool';
import { GauntletConfig, FormationLike } from '@/lib/gauntletEngine';

/**
 * Gauntlet Draft: NBA (Round 520, the first of the two follow-up sports the
 * owner's "a draft mode game per sport" backlog row asked for; see
 * src/lib/gauntletEngine.ts for the shared mechanism and src/lib/gauntletDraft.ts
 * for the original soccer game this genericizes).
 *
 * The pool and the starting five shape are NOT new: both come straight off
 * src/data/nbaPerfectLineupPool.ts, the same 66 player curated pool and the
 * same five slot PG/SG/SF/PF/C shape (with the same cross position fit,
 * e.g. an SG slot also takes a PG or an SF) that Perfect Lineup: NBA already
 * plays and the owner already signed off on. Nothing here re-derives a
 * position, a rating or an eligibility rule; this file only wires those
 * existing accessors into a GauntletConfig.
 *
 * NBA basketball has one real starting five shape, not several formations
 * the way a soccer XI does, so `formations` below is an array of one: the
 * draw mechanism still runs (buildDraft still calls Math.floor(rng() *
 * formations.length)), it just always lands on the same shape, which is
 * honest rather than inventing lineup variety the sport does not have here.
 */

const NBA_FORMATION: FormationLike = {
  name: 'Starting Five',
  slots: NBA_LINEUP_CONFIG.formation,
};

/* Tuned against measured draft distributions (scripts/simGauntletEngine.mjs
   section 4 prints the real numbers over 500 seeded drafts): an
   always-best-card five off this pool averages a squad rating around 98, an
   always-worst-card five around 87. Against this ladder that lands the
   best five 3.3 rounds cleared and the trophy about 1 run in 10, the worst
   five under 1 round cleared and the trophy effectively never; NBA's own
   pool is a curated legends list (84 to 99 rating, a 66 player pool, not the
   thousands soccer draws from), so the ladder sits inside that narrower
   85 to 101 band rather than soccer's wider 70 to 89, and reaches slightly
   past the best five's own ceiling the same way soccer's final round (89)
   sits three points over its measured best-card ceiling (86 to 88). */
export const NBA_GAUNTLET_ROUNDS = [
  { name: 'The Qualifier', opp: 'Redridge Runners', rating: 85 },
  { name: 'The Last Sixteen', opp: 'Harborlight Comets', rating: 89 },
  { name: 'The Quarter Final', opp: 'Union Vipers', rating: 93 },
  { name: 'The Semi Final', opp: 'Northgate Sentinels', rating: 97 },
  { name: 'The Final', opp: 'Granite Bay Aces', rating: 101 },
] as const;

/* Round 520: distinct from soccer's 0x47445231 salt so the two games never
   draw the same daily seed off the same ET date. 'NBA1' read as bytes. */
const NBA_DAILY_SALT = 0x4e424131;

export const NBA_GAUNTLET_CONFIG: GauntletConfig<NbaPoolPlayer> = {
  gameId: 'nba-gauntlet-draft',
  pool: NBA_POOL,
  nameOf: NBA_LINEUP_CONFIG.nameOf,
  ratingOf: NBA_LINEUP_CONFIG.ratingOf,
  fitsSlot: (p, slot) => slot.allowed.includes(NBA_LINEUP_CONFIG.positionOf(p)),
  formations: [NBA_FORMATION],
  rounds: NBA_GAUNTLET_ROUNDS,
  dailySeedSalt: NBA_DAILY_SALT,
};
