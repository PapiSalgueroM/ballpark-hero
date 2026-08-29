import { Player } from '@/types/game';
import { FORMATIONS, Formation, FormationSlot, playerRating } from '@/lib/squadDeal';
import { eligiblePositions } from '@/lib/worldXi';
import { dailyPrngSeed } from '@/lib/dateUtils';

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

export const PICK_SIZE = 5;

export function gdRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function gdFits(p: Player, slot: FormationSlot): boolean {
  return eligiblePositions(p.position as Parameters<typeof eligiblePositions>[0])
    .some(pos => (slot.allowed as string[]).includes(pos));
}

export interface DraftPick {
  slot: FormationSlot;
  choices: Player[];
}

export interface GauntletDraft {
  formation: Formation;
  picks: DraftPick[];
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
  const rng = gdRng(seed);
  const seen = new Set<string>();
  const deduped = pool.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
  const formation = FORMATIONS[Math.floor(rng() * FORMATIONS.length)];
  const used = new Set<string>();

  const slotOrder = formation.slots
    .map((slot, index) => ({ slot, index, supply: deduped.filter(p => gdFits(p, slot)).length }))
    .sort((a, b) => a.supply - b.supply);

  const picksByIndex: DraftPick[] = new Array(formation.slots.length);
  for (const { slot, index } of slotOrder) {
    const fits = deduped.filter(p => gdFits(p, slot) && !used.has(p.name))
      .sort((a, b) => playerRating(b) - playerRating(a));
    const grab = (lo: number, hi: number): Player => {
      const a = Math.floor(lo * fits.length);
      const b = Math.max(a + 1, Math.floor(hi * fits.length));
      const band = fits.slice(a, b).filter(p => !used.has(p.name));
      const src = band.length ? band : fits.filter(p => !used.has(p.name));
      return src[Math.floor(rng() * src.length)];
    };
    const choices: Player[] = [];
    for (const [lo, hi] of [[0, 0.12], [0.15, 0.4], [0.3, 0.6], [0.5, 0.8], [0.8, 1]] as const) {
      let c = grab(lo, hi);
      let hops = 0;
      while (choices.includes(c) && hops < 10) { c = grab(lo, hi); hops += 1; }
      if (!choices.includes(c)) { choices.push(c); used.add(c.name); }
    }
    picksByIndex[index] = { slot, choices };
  }
  return { formation, picks: picksByIndex };
}

export function dailyDraftSeed(dateStr: string): number {
  return dailyPrngSeed(dateStr) ^ 0x47445231 || 11;
}

export function squadRatingOf(squad: (Player | null)[]): number {
  const players = squad.filter((p): p is Player => p !== null);
  if (players.length === 0) return 0;
  return Math.round(players.reduce((s, p) => s + playerRating(p), 0) / players.length);
}

export interface GauntletMatch {
  round: (typeof GAUNTLET_ROUNDS)[number];
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

function seedFromSquad(squad: (Player | null)[]): number {
  const key = squad.map(p => (p ? p.name : '-')).join('|');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h % 2147483646) + 1;
}

/**
 * The knockout. Goals per side are drawn from the rating gap (a stronger
 * side expects more), level after ninety goes to extra time and then
 * pens, and the run is fully deterministic in the XI.
 *
 * Scoring on the sitewide ~100 scale: 16 a round cleared, 20 more for
 * lifting the trophy, so a champion lands exactly 100 and every earlier
 * exit is worth exactly what it survived.
 */
export function runGauntlet(squad: (Player | null)[]): GauntletRun {
  const rating = squadRatingOf(squad);
  const rng = gdRng(seedFromSquad(squad));
  const matches: GauntletMatch[] = [];
  let cleared = 0;
  for (const round of GAUNTLET_ROUNDS) {
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
        /* pens: the gap still matters, but barely, the way pens really are */
        const p = 0.5 + gap / 120;
        wonOnPens = rng() < Math.max(0.25, Math.min(0.75, p));
      }
    }
    const won = wonOnPens !== null ? wonOnPens : mine > theirs;
    matches.push({ round, yourGoals: mine, theirGoals: theirs, wonOnPens, won });
    if (!won) break;
    cleared += 1;
  }
  const champion = cleared === GAUNTLET_ROUNDS.length;
  const score = Math.min(100, cleared * 16 + (champion ? 20 : 0));
  return { rating, matches, roundsCleared: cleared, champion, score };
}
