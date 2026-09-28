import { Player } from '@/types/game';
import { FORMATIONS, Formation, FormationSlot, playerRating } from '@/lib/squadDeal';
import { eligiblePositions } from '@/lib/worldXi';
import { skillPoints } from '@/lib/skillPoints';

/**
 * Search and Discard (Round 325, the second of the three new games from the
 * owner's 2026-08-28 review): "the classic squad building duel, adapted:
 * build XIs by drawing and discarding, then settle it in a season sim, with
 * online or pass and play". Online rooms are a real backend project and are
 * out of scope on purpose, the review's own note says so; this is the CPU
 * duel and same screen pass and play.
 *
 * THE DUEL. Two managers, one shared pool, both building the same 4-3-3.
 * On your turn you SEARCH: three players from the pool, of whom at least
 * one is guaranteed to fit one of your empty slots (the deal enforces it,
 * and the harness proves it over hundreds of seeds). You KEEP exactly one
 * into a compatible empty slot; the other two are DISCARDED from the whole
 * game, which is the tension: binning a star your rival needed is as real a
 * move as keeping one for yourself. Eleven keeps each, alternating, then
 * the season settles it.
 *
 * THE SETTLE. Both XIs play the same simulated 38 game season, one shared
 * deterministic stream seeded from both squads together, so replaying the
 * same two XIs always tells the same story. Ratings come from
 * squadDeal.playerRating, the one card curve the whole site uses.
 *
 * Everything here is derived from the same verified pool Squad Deal plays;
 * no player, value or attribute is invented.
 */

export const SD_FORMATION: Formation = FORMATIONS[0]; /* 4-3-3 */
export const SEARCH_SIZE = 3;

export function sdRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** A player fits a slot when the slot's own set, widened by the sitewide
 *  position families (a winger covers both flanks), accepts their position. */
export function sdFits(p: Player, slot: FormationSlot): boolean {
  return eligiblePositions(p.position as Parameters<typeof eligiblePositions>[0])
    .some(pos => (slot.allowed as string[]).includes(pos));
}

export interface SdState {
  pool: Player[];
  /** squads[0] and squads[1], each aligned to SD_FORMATION.slots. */
  squads: (Player | null)[][];
  /** whose turn: 0 or 1. */
  turn: 0 | 1;
  /** the current search trio, or null between turns. */
  offer: Player[] | null;
  discards: Player[];
  rng: () => number;
}

export function newDuel(pool: Player[], seed: number): SdState {
  const rng = sdRng(seed);
  /* The baked fallback pool lists 32 players twice (once in the famous tier,
     once in a harder one), which the harness caught as the same man in two
     squads. One name, one card, the first listing kept. */
  const seen = new Set<string>();
  const deduped = pool.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
  return {
    pool: deduped,
    squads: [SD_FORMATION.slots.map(() => null), SD_FORMATION.slots.map(() => null)],
    turn: 0,
    offer: null,
    discards: [],
    rng,
  };
}

export function emptySlots(state: SdState, side: 0 | 1): number[] {
  return state.squads[side].map((p, i) => (p === null ? i : -1)).filter(i => i >= 0);
}

export function duelOver(state: SdState): boolean {
  return emptySlots(state, 0).length === 0 && emptySlots(state, 1).length === 0;
}

/**
 * Draws the turn's search trio. The GUARANTEE, which is what makes the game
 * playable at all: at least one of the three fits one of the drafter's
 * empty slots. Drawn by index off the deterministic stream; if the blind
 * draw misses, the last card is replaced with the first pool player who
 * fits, scanned in pool order so it stays deterministic.
 */
export function drawOffer(state: SdState): Player[] {
  const empties = emptySlots(state, state.turn).map(i => SD_FORMATION.slots[i]);
  const picks: Player[] = [];
  const taken = new Set<Player>();
  for (let i = 0; i < SEARCH_SIZE && state.pool.length > taken.size; i += 1) {
    let p: Player;
    do { p = state.pool[Math.floor(state.rng() * state.pool.length)]; } while (taken.has(p));
    taken.add(p);
    picks.push(p);
  }
  const anyFits = picks.some(p => empties.some(s => sdFits(p, s)));
  if (!anyFits) {
    const saviour = state.pool.find(p => !taken.has(p) && empties.some(s => sdFits(p, s)));
    if (saviour) picks[picks.length - 1] = saviour;
  }
  return picks;
}

/** Applies a keep: the chosen player into the chosen slot, the rest of the
 *  offer discarded from the game, the turn passing. Throws on an illegal
 *  keep so a UI bug cannot corrupt a duel silently. */
export function applyKeep(state: SdState, offer: Player[], keep: Player, slotIndex: number): SdState {
  if (!offer.includes(keep)) throw new Error('keep is not in the offer');
  const slot = SD_FORMATION.slots[slotIndex];
  if (!slot || state.squads[state.turn][slotIndex] !== null) throw new Error('slot is not open');
  if (!sdFits(keep, slot)) throw new Error(`${keep.name} does not fit ${slot.label}`);
  const squads = state.squads.map(s => [...s]) as (Player | null)[][];
  squads[state.turn][slotIndex] = keep;
  const dropped = offer.filter(p => p !== keep);
  return {
    ...state,
    squads,
    pool: state.pool.filter(p => !offer.includes(p)),
    discards: [...state.discards, ...dropped],
    offer: null,
    turn: (state.turn === 0 ? 1 : 0) as 0 | 1,
  };
}

/** The CPU's keep: the highest rated player that fits any open slot, into
 *  the open slot with the FEWEST other fitting candidates left in the pool,
 *  so it fills its scarce positions (the keeper) before they dry up.
 *  Deterministic on purpose: the harness replays it. */
export function cpuKeep(state: SdState, offer: Player[]): { keep: Player; slotIndex: number } {
  const open = emptySlots(state, state.turn);
  let best: { keep: Player; slotIndex: number; score: number } | null = null;
  for (const p of offer) {
    for (const si of open) {
      if (!sdFits(p, SD_FORMATION.slots[si])) continue;
      const scarcity = state.pool.filter(q => sdFits(q, SD_FORMATION.slots[si])).length;
      const score = playerRating(p) * 1000 - scarcity;
      if (!best || score > best.score) best = { keep: p, slotIndex: si, score };
    }
  }
  if (!best) throw new Error('the offer guarantee failed: nothing in the offer fits the CPU');
  return { keep: best.keep, slotIndex: best.slotIndex };
}

/** Round 645: the keep a player with no skill makes, the lowest rated player
 *  in the offer that fits an open slot, into the first open slot he fits. */
export function worstKeep(state: SdState, offer: Player[]): { keep: Player; slotIndex: number } {
  const open = emptySlots(state, state.turn);
  let worst: { keep: Player; slotIndex: number; rating: number } | null = null;
  for (const p of offer) {
    const si = open.find(i => sdFits(p, SD_FORMATION.slots[i]));
    if (si === undefined) continue;
    const rating = playerRating(p);
    if (!worst || rating < worst.rating) worst = { keep: p, slotIndex: si, rating };
  }
  if (!worst) throw new Error('the offer guarantee failed: nothing in the offer fits');
  return { keep: worst.keep, slotIndex: worst.slotIndex };
}

/**
 * Round 645: the season a player with no skill would have had on the same
 * deal: the duel replayed from the same pool and seed, the worst keep every
 * turn, the CPU keeping as it always does. The CPU is deterministic, so this
 * is the exact counterfactual of a CPU duel. In pass and play it stands in
 * for the second human with the CPU's keeps, which is the closest the deal
 * alone can say about what nothing would have earned.
 */
export function zeroSkillDuel(pool: Player[], seed: number): SdSeason {
  let st = newDuel(pool, seed);
  while (!duelOver(st)) {
    const offer = drawOffer(st);
    const k = st.turn === 0 ? worstKeep(st, offer) : cpuKeep(st, offer);
    st = applyKeep(st, offer, k.keep, k.slotIndex);
  }
  return settleSeason(st.squads[0], st.squads[1]);
}

/** The most points a 38 game season holds. */
export const SEASON_POINTS_MAX = 114;

/** A season's points as a share of a perfect season, out of 100: the season
 *  score Search and Discard and Fantasy Draft showed and recorded before
 *  Round 645. */
export function seasonShare(points: number): number {
  return Math.min(100, Math.round((points / SEASON_POINTS_MAX) * 100));
}

/**
 * Round 645: what a settled duel records, Search and Discard and Fantasy
 * Draft both. They recorded the season share, and the settle plays each side
 * against a fixed ladder of opposition rated 55 to 88 while the pool's
 * cheapest cards rate in the mid 70s, so the worst possible squad still banked
 * most of a season: measured before this round, a keeper who took the worst
 * card every turn scored 62 against the best keeper's 68 in Search and
 * Discard, and the worst eleven of the Fantasy pool scored 73. The share is
 * scored above the zero skill season on the same deal now: that season records
 * 0 and a perfect 114 point season still records 100.
 */
export function duelScore(myPoints: number, zeroSkillPoints: number): number {
  return skillPoints(seasonShare(myPoints), seasonShare(zeroSkillPoints), 100);
}

/* ---------------- The settle ---------------- */

export interface SdSeason {
  ratings: [number, number];
  points: [number, number];
  positions: [number, number];
  headToHead: string;
  winner: 0 | 1 | -1; /* -1 = dead level */
  story: string[];
}

export function squadRating(squad: (Player | null)[]): number {
  const players = squad.filter((p): p is Player => p !== null);
  if (players.length === 0) return 0;
  const avg = players.reduce((s, p) => s + playerRating(p), 0) / players.length;
  return Math.round(avg);
}

function seasonSeed(a: (Player | null)[], b: (Player | null)[]): number {
  const key = [...a, ...b].map(p => (p ? p.name : '-')).join('|');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h % 2147483646) + 1;
}

/**
 * One shared 38 game season. Each side plays 36 league games against a
 * spread of opposition strengths plus the two head to head derbies. Win
 * probability per game comes from the rating gap through a logistic curve,
 * points 3/1/0, everything off one stream so the same two squads always
 * settle the same way.
 */
export function settleSeason(squadA: (Player | null)[], squadB: (Player | null)[]): SdSeason {
  const rA = squadRating(squadA);
  const rB = squadRating(squadB);
  const rng = sdRng(seasonSeed(squadA, squadB));
  /* Divisor 13 and a 0.16 draw band, sharpened from the first cut's 18 and
     0.22 after the harness measured a greedy drafter beating a deliberate
     worst picker only 73 percent of the time: a duel whose whole game is
     the draft should reward the draft harder than that. */
  const winP = (mine: number, theirs: number) => 1 / (1 + Math.pow(10, (theirs - mine) / 13));
  const playGame = (mine: number, theirs: number): number => {
    const p = winP(mine, theirs);
    const roll = rng();
    if (roll < p * 0.84) return 3;
    if (roll < p * 0.84 + 0.16) return 1;
    return 0;
  };
  const points: [number, number] = [0, 0];
  /* 36 league fixtures each against the same ladder of opposition. */
  for (let g = 0; g < 36; g += 1) {
    const opp = 55 + (g % 12) * 3; /* 55 to 88, the league's spread */
    points[0] += playGame(rA, opp);
    points[1] += playGame(rB, opp);
  }
  /* the two derbies, the games the whole draft was for */
  let derbyA = 0;
  let derbyB = 0;
  for (let d = 0; d < 2; d += 1) {
    const a = playGame(rA, rB);
    points[0] += a;
    if (a === 3) derbyA += 1;
    else if (a === 1) { points[1] += 1; }
    else { points[1] += 3; derbyB += 1; }
  }
  const headToHead = derbyA === derbyB ? 'the derbies were shared' : derbyA > derbyB ? `your side took the derbies ${derbyA}-${derbyB}` : `their side took the derbies ${derbyB}-${derbyA}`;
  const position = (pts: number) => Math.max(1, Math.min(20, 20 - Math.floor(pts / 5)));
  const winner: 0 | 1 | -1 = points[0] === points[1] ? -1 : points[0] > points[1] ? 0 : 1;
  const story = [
    `Two squads, one season. Yours rated ${rA}, theirs ${rB}.`,
    headToHead + '.',
    winner === -1
      ? `Dead level on ${points[0]} points after 38 games. Nobody blinked.`
      : `${winner === 0 ? 'Your' : 'Their'} side finished on ${points[Math.max(winner, 0)]} points against ${points[winner === 0 ? 1 : 0]}.`,
  ];
  return { ratings: [rA, rB], points, positions: [position(points[0]), position(points[1])], headToHead, winner, story };
}
