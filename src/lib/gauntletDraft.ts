import { Player } from '@/types/game';
import { FORMATIONS, Formation, FormationSlot, playerRating } from '@/lib/squadDeal';
import { eligiblePositions } from '@/lib/worldXi';
import {
  GauntletConfig, FormationSlotLike, PICK_SIZE as ENGINE_PICK_SIZE, gRng,
  buildDraft as engineBuildDraft, dailySeedFor, squadRatingOf as engineSquadRatingOf,
  runGauntlet as engineRunGauntlet, loadDailyRun as engineLoadDailyRun,
  saveDailyRun as engineSaveDailyRun, GauntletRun,
} from '@/lib/gauntletEngine';
export type { GauntletRun } from '@/lib/gauntletEngine';

/**
 * Gauntlet Draft (Round 328, the third and last of the owner's three new
 * game requests: "a draft mode game for every sport, each with its own feel
 * and original card art. The concept is fine; the rival game vocabulary is
 * not. Names stay ours.").
 *
 * THE DRAFT. Eleven picks, one per slot of the drawn formation, in the
 * slot's own order. Each pick deals FIVE real players who fit the slot
 * (position families included, the same sitewide rules), spread across the
 * value bands so every pick is a real choice between a star and depth, and
 * you keep exactly one. No player appears twice in a draft.
 *
 * THE GAUNTLET. Your finished XI runs a five round knockout against
 * escalating opposition, rated 70 up to 89. One match a round,
 * win probability from the rating gap through the same logistic family the
 * other settles use, extra time and shootouts when the ninety minutes are
 * level. Lose and the run ends where it ends. The whole run is
 * deterministic in the finished XI, so the same squad always runs the same
 * gauntlet and the draft is the game.
 *
 * Daily mode deals the same five card choices to everyone (dailyPrngSeed);
 * unlimited deals fresh. Everything is derived from the same verified pool
 * Squad Deal plays; nothing is invented.
 *
 * Round 520: this file used to hold the whole engine. It is now a thin
 * wrapper over src/lib/gauntletEngine.ts, the generic config-driven engine
 * that also runs the NBA and NFL gauntlets (src/lib/gauntletDraftNba.ts,
 * src/lib/gauntletDraftNfl.ts), the same way nflCareerMoney.ts wraps
 * careerMoney.ts. Every function below still does exactly what it did
 * before: the seed math, the band spread, the daily record shape and the
 * scoring are unchanged, only pulled out from under a soccer only name so a
 * second and third sport could reuse them instead of copying them. Nothing
 * about this page's behavior changed; the soccer regression in
 * scripts/simGauntletEngine.mjs section 1 proves the same seed still deals
 * the same draft and runs the same gauntlet as before this round.
 */

/* Tuned against the measured draft distributions (best-card XIs land 86 to
   88, worst-card 70 to 73): the ladder starts under the worst draft and
   finishes three over the best, so a bargain XI usually falls early, an
   elite one reaches the final as a slight underdog, and the trophy is a
   real target rather than a lottery ticket. The first ladder topped out at
   93 and a PERFECT draft lifted it 3 percent of the time, which made the
   champion line pure luck. */
export const GAUNTLET_ROUNDS = [
  { name: 'The Qualifier', opp: 'Ironvale Athletic', rating: 70 },
  { name: 'The Last Sixteen', opp: 'Port Meridian', rating: 76 },
  { name: 'The Quarter Final', opp: 'Casterbridge City', rating: 81 },
  { name: 'The Semi Final', opp: 'Aurora Continental', rating: 85 },
  { name: 'The Final', opp: 'Los Reyes del Sur', rating: 89 },
] as const;

export const PICK_SIZE = ENGINE_PICK_SIZE;

/** Kept for anything reading this file's own seed stream (nothing external
 *  does; the sim harness bundles gauntletEngine.ts directly for its
 *  controls). */
export function gdRng(seed: number): () => number {
  return gRng(seed);
}

export function gdFits(p: Player, slot: FormationSlotLike): boolean {
  return eligiblePositions(p.position as Parameters<typeof eligiblePositions>[0])
    .some(pos => slot.allowed.includes(pos));
}

export interface DraftPick {
  slot: FormationSlot;
  choices: Player[];
}

export interface GauntletDraft {
  formation: Formation;
  picks: DraftPick[];
}

/** Round 428: the daily record slug, `gauntlet-draft-daily-${date}` in
 *  localStorage (src/lib/dailyRecord.ts). Declared here, ahead of the
 *  functions that read and write under it, now that this file no longer
 *  ends with the daily lock section that used to define it in place. */
const DAILY_SLUG = 'gauntlet-draft';
const SOCCER_DAILY_SALT = 0x47445231;

/** The soccer descriptor: the pool is whatever the caller fetched (Squad
 *  Deal's live pool or its offline fallback), so this is built fresh per
 *  call rather than once at module scope, the way the soccer formations and
 *  rating curve were always read live rather than frozen at import time. */
function soccerConfig(pool: Player[]): GauntletConfig<Player> {
  return {
    gameId: DAILY_SLUG,
    pool,
    nameOf: p => p.name,
    ratingOf: playerRating,
    fitsSlot: gdFits,
    formations: FORMATIONS,
    rounds: GAUNTLET_ROUNDS,
    dailySeedSalt: SOCCER_DAILY_SALT,

    /* Round 538: the presentation half of the config. Soccer's own page is
       NOT drawn by the shared board yet and is the one sport that cannot be
       yet: it fetches its pool from the database, so it carries boot and error
       phases the static pool sports have no use for, and it draws a flag on
       every card. Filling these in anyway costs nothing and means the soccer
       config is a complete GauntletConfig like every other, so whoever folds
       this page in later has the copy already written and only has to teach
       the board an async pool and a card decoration. */
    gameName: 'Gauntlet Draft',
    gamePath: '/gauntlet-draft',
    emoji: '⚔️',
    squadNoun: 'XI',
    slotsPhrase: 'slots in the formation you drew',
    tiebreak: { phrase: 'extra time, then a shootout', won: 'Won in a shootout', lost: 'Lost in a shootout' },
    subtitleOf: p => p.club,
    positionOf: p => p.position,
    tierFloors: [86, 78, 70],
    scoreline: g => g,
    tiebreakBump: 1,
  };
}

/**
 * Builds the whole draft: a formation off the seed and, for each slot in
 * order, five fitting players spread across the pool's value range (one
 * from the top band, one from the floor, three from the middle), no player
 * dealt twice anywhere in the draft. Slots are dealt scarcest position
 * first internally so a thin pool can never strand the keeper, but the
 * PLAYER always picks in the formation's own display order.
 */
export function buildDraft(pool: Player[], seed: number): GauntletDraft {
  /* The engine is generic in FormationSlotLike/FormationLike; soccer's real
     runtime objects (FORMATIONS' FormationSlot entries, carrying x/y on top
     of label/allowed) satisfy that shape exactly, so this cast only narrows
     the TYPE back to the soccer-specific one, nothing about the VALUE
     changes. scripts/simGauntletEngine.mjs section 1 proves the output is
     byte identical to the pre-refactor implementation. */
  return engineBuildDraft(soccerConfig(pool), seed) as unknown as GauntletDraft;
}

export function dailyDraftSeed(dateStr: string): number {
  return dailySeedFor(soccerConfig([]), dateStr);
}

export function squadRatingOf(squad: (Player | null)[]): number {
  return engineSquadRatingOf(soccerConfig([]), squad);
}

export function runGauntlet(squad: (Player | null)[]): GauntletRun {
  return engineRunGauntlet(soccerConfig([]), squad);
}

/**
 * Round 428: the one attempt a day, kept. The page saves the finished run
 * under `gauntlet-draft-daily-${date}` (src/lib/dailyRecord.ts) the moment
 * the eleventh pick decides it, and start('daily') restores it instead of
 * dealing the same draft again with the cup already known. Only the run is
 * stored: the result screen, the share text and the emoji grid all derive
 * from it. The read fails closed: every round is rebuilt from
 * GAUNTLET_ROUNDS by index, every number is range checked, and a run whose
 * rounds cleared, champion flag or score do not follow from its matches is
 * refused, so a tampered or broken record deals a fresh daily rather than
 * drawing a screen that adds up to nothing.
 */
export function loadDailyRun(date: string): GauntletRun | null {
  return engineLoadDailyRun(soccerConfig([]), date);
}

export function saveDailyRun(date: string, run: GauntletRun): void {
  engineSaveDailyRun(soccerConfig([]), date, run);
}
