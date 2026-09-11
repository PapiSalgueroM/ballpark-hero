import { dailyPrngSeed } from '@/lib/dateUtils';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';

/**
 * Gauntlet Draft, the generic engine (Round 520).
 *
 * Round 328 built this as one soccer file (src/lib/gauntletDraft.ts). The
 * owner's standing rule ("u can use a lot of the same formatting and such
 * for diffrent games... using the soccer manager and career in other manager
 * and career games") means a second sport should not be a second copy of
 * the same idea, so this file is what src/lib/perfectLineupEngine.ts already
 * is for Perfect Lineup: a config-driven engine that only ever touches a
 * GauntletConfig, never a specific sport's types. Soccer, NBA and NFL each
 * hand it a pool, a rating function, a fit check, a set of formations and a
 * five round ladder, and get the exact same draft-then-cup game back.
 *
 * THE DRAFT. One pick per slot of a drawn formation, in the formation's own
 * order. Each pick deals five real entries who fit the slot, spread across
 * the value bands (one from the top, one from the floor, three from the
 * middle) so every pick is a real choice between a star and a bargain, and
 * you keep exactly one. No entry appears twice in a draft. Slots are dealt
 * scarcest position first internally so a thin pool can never strand a
 * slot, but the picks are always shown to the player in the formation's own
 * display order (buildDraft restores that order before returning).
 *
 * THE GAUNTLET. The finished squad runs a five round knockout against
 * escalating opposition. One match a round, win probability from the rating
 * gap through the same logistic-family curve every sport shares, extra time
 * and a shootout when the scores are level. The whole run is deterministic
 * in the finished squad, so the same squad always runs the same gauntlet.
 * Scoring is fixed at 16 points a round survived plus 20 for the trophy, so
 * a five round ladder always lands a champion on exactly 100: this is the
 * one thing CLAUDE.md says must not differ per sport (the scoring pipeline,
 * the save shape, the result screen), so every sport config carries exactly
 * five rounds.
 *
 * Daily mode deals the same five choices to everyone off dailyPrngSeed
 * salted per sport (dailySeedSalt); unlimited deals fresh off Math.random.
 */

export interface FormationSlotLike {
  label: string;
  allowed: string[];
}

export interface FormationLike {
  name: string;
  slots: FormationSlotLike[];
}

export interface GauntletRoundDef {
  name: string;
  opp: string;
  rating: number;
}

export interface GauntletConfig<P> {
  /** Slug for the daily record key and useGameCompletion, e.g. 'gauntlet-draft',
   *  'nba-gauntlet-draft', 'nfl-gauntlet-draft'. */
  gameId: string;
  pool: P[];
  nameOf: (p: P) => string;
  ratingOf: (p: P) => number; // 0..100 scale
  fitsSlot: (p: P, slot: FormationSlotLike) => boolean;
  /** One is drawn at seed time, same as soccer drawing a formation. A sport
   *  with only one real lineup shape (NBA's starting five) passes an array
   *  of one; buildDraft still draws from it so the mechanism is identical. */
  formations: FormationLike[];
  /** The five round ladder, GAUNTLET_ROUNDS-shaped. Always length 5: see the
   *  scoring note above. */
  rounds: readonly GauntletRoundDef[];
  /** XORed into dailyPrngSeed so two sports never draw the same daily seed
   *  off the same date, the way soccer XORs with 0x47445231. */
  dailySeedSalt: number;
}

export const PICK_SIZE = 5;

export function gRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface DraftPick<P> {
  slot: FormationSlotLike;
  choices: P[];
}

export interface GauntletDraftResult<P> {
  formation: FormationLike;
  picks: DraftPick<P>[];
}

/**
 * Builds the whole draft: a formation off the seed and, for each slot in
 * order, five fitting entries spread across the pool's value range (one
 * from the top band, one from the floor, three from the middle), no entry
 * dealt twice anywhere in the draft. Slots are dealt scarcest position
 * first internally so a thin pool can never strand a slot, but the picks
 * are always returned in the formation's own display order.
 */
export function buildDraft<P>(config: GauntletConfig<P>, seed: number): GauntletDraftResult<P> {
  const rng = gRng(seed);
  const seen = new Set<string>();
  const deduped = config.pool.filter(p => {
    const name = config.nameOf(p);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
  const formation = config.formations[Math.floor(rng() * config.formations.length)];
  const used = new Set<string>();

  const slotOrder = formation.slots
    .map((slot, index) => ({ slot, index, supply: deduped.filter(p => config.fitsSlot(p, slot)).length }))
    .sort((a, b) => a.supply - b.supply);

  const picksByIndex: DraftPick<P>[] = new Array(formation.slots.length);
  for (const { slot, index } of slotOrder) {
    const fits = deduped
      .filter(p => config.fitsSlot(p, slot) && !used.has(config.nameOf(p)))
      .sort((a, b) => config.ratingOf(b) - config.ratingOf(a));
    const grab = (lo: number, hi: number): P => {
      const a = Math.floor(lo * fits.length);
      const b = Math.max(a + 1, Math.floor(hi * fits.length));
      const band = fits.slice(a, b).filter(p => !used.has(config.nameOf(p)));
      const src = band.length ? band : fits.filter(p => !used.has(config.nameOf(p)));
      return src[Math.floor(rng() * src.length)];
    };
    const choices: P[] = [];
    const choiceNames = new Set<string>();
    for (const [lo, hi] of [[0, 0.12], [0.15, 0.4], [0.3, 0.6], [0.5, 0.8], [0.8, 1]] as const) {
      let c = grab(lo, hi);
      let hops = 0;
      while (choiceNames.has(config.nameOf(c)) && hops < 10) { c = grab(lo, hi); hops += 1; }
      if (!choiceNames.has(config.nameOf(c))) { choices.push(c); choiceNames.add(config.nameOf(c)); used.add(config.nameOf(c)); }
    }
    picksByIndex[index] = { slot, choices };
  }
  return { formation, picks: picksByIndex };
}

export function dailySeedFor<P>(config: GauntletConfig<P>, dateStr: string): number {
  return dailyPrngSeed(dateStr) ^ config.dailySeedSalt || 11;
}

export function squadRatingOf<P>(config: GauntletConfig<P>, squad: (P | null)[]): number {
  const players = squad.filter((p): p is P => p !== null);
  if (players.length === 0) return 0;
  return Math.round(players.reduce((s, p) => s + config.ratingOf(p), 0) / players.length);
}

export interface GauntletMatch {
  round: GauntletRoundDef;
  yourGoals: number;
  theirGoals: number;
  wonOnPens: boolean | null; /* null = decided in normal or extra time */
  won: boolean;
}

export interface GauntletRun {
  rating: number;
  matches: GauntletMatch[];
  roundsCleared: number;
  champion: boolean;
  score: number;
}

function seedFromSquad<P>(config: GauntletConfig<P>, squad: (P | null)[]): number {
  const key = squad.map(p => (p ? config.nameOf(p) : '-')).join('|');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h % 2147483646) + 1;
}

/**
 * The knockout. Goals per side are drawn from the rating gap (a stronger
 * side expects more), level after regulation goes to extra time and then a
 * shootout, and the run is fully deterministic in the squad.
 *
 * Scoring: 16 a round cleared, 20 more for lifting the trophy, so a
 * champion lands exactly 100 on any five round ladder and every earlier
 * exit is worth exactly what it survived.
 */
export function runGauntlet<P>(config: GauntletConfig<P>, squad: (P | null)[]): GauntletRun {
  const rating = squadRatingOf(config, squad);
  const rng = gRng(seedFromSquad(config, squad));
  const matches: GauntletMatch[] = [];
  let cleared = 0;
  for (const round of config.rounds) {
    const gap = rating - round.rating;
    const myExp = Math.max(0.35, 1.45 + gap / 7);
    const theirExp = Math.max(0.35, 1.45 - gap / 7);
    const goals = (exp: number) => {
      let g = 0;
      for (let i = 0; i < 6; i += 1) if (rng() < exp / 6) g += 1;
      return g;
    };
    let mine = goals(myExp);
    let theirs = goals(theirExp);
    let wonOnPens: boolean | null = null;
    if (mine === theirs) {
      /* extra time: one more short burst each */
      const extraMine = rng() < myExp / 8 ? 1 : 0;
      const extraTheirs = rng() < theirExp / 8 ? 1 : 0;
      mine += extraMine;
      theirs += extraTheirs;
      if (mine === theirs) {
        /* the gap still matters, but barely, the way a shootout really is */
        const p = 0.5 + gap / 120;
        wonOnPens = rng() < Math.max(0.25, Math.min(0.75, p));
      }
    }
    const won = wonOnPens !== null ? wonOnPens : mine > theirs;
    matches.push({ round, yourGoals: mine, theirGoals: theirs, wonOnPens, won });
    if (!won) break;
    cleared += 1;
  }
  const champion = cleared === config.rounds.length;
  const score = Math.min(100, cleared * 16 + (champion ? 20 : 0));
  return { rating, matches, roundsCleared: cleared, champion, score };
}

/**
 * Round 428: the one attempt a day, kept. The page saves the finished run
 * under `${gameId}-daily-${date}` (src/lib/dailyRecord.ts) the moment the
 * last pick decides it, and the page's restore path reads it back instead
 * of dealing the same draft again with the cup already known. Only the run
 * is stored: the result screen, the share text and the emoji grid all
 * derive from it. The read fails closed: every round is rebuilt from
 * config.rounds by index, every number is range checked, and a run whose
 * rounds cleared, champion flag or score do not follow from its matches is
 * refused, so a tampered or broken record deals a fresh daily instead of
 * drawing a screen that adds up to nothing.
 */
function validateDailyRun<P>(config: GauntletConfig<P>, fields: Record<string, unknown>): GauntletRun | null {
  const raw = fields.run;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const run = raw as Record<string, unknown>;
  const { rating, roundsCleared, champion, score } = run;
  if (!Number.isInteger(rating) || (rating as number) < 0 || (rating as number) > 99) return null;
  if (!Array.isArray(run.matches) || run.matches.length < 1 || run.matches.length > config.rounds.length) return null;
  const goals = (g: unknown) => Number.isInteger(g) && (g as number) >= 0 && (g as number) <= 9;
  const matches: GauntletMatch[] = [];
  for (let i = 0; i < run.matches.length; i += 1) {
    const m = run.matches[i] as Record<string, unknown> | null;
    if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
    if (!goals(m.yourGoals) || !goals(m.theirGoals)) return null;
    if (m.wonOnPens !== null && typeof m.wonOnPens !== 'boolean') return null;
    if (typeof m.won !== 'boolean') return null;
    /* the run only goes on while it is being won */
    if (!m.won && i < run.matches.length - 1) return null;
    matches.push({
      round: config.rounds[i],
      yourGoals: m.yourGoals as number,
      theirGoals: m.theirGoals as number,
      wonOnPens: m.wonOnPens as boolean | null,
      won: m.won,
    });
  }
  const cleared = matches.filter(m => m.won).length;
  const consistent = roundsCleared === cleared
    && champion === (cleared === config.rounds.length)
    && score === Math.min(100, cleared * 16 + (champion ? 20 : 0));
  if (!consistent) return null;
  return { rating: rating as number, matches, roundsCleared: cleared, champion: champion as boolean, score: score as number };
}

export function loadDailyRun<P>(config: GauntletConfig<P>, date: string): GauntletRun | null {
  return readDailyRecord(config.gameId, date, fields => validateDailyRun(config, fields));
}

export function saveDailyRun<P>(config: GauntletConfig<P>, date: string, run: GauntletRun): void {
  writeDailyRecord(config.gameId, date, { run });
}
