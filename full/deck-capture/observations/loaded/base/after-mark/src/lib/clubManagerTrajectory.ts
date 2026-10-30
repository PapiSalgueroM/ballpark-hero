export interface ClubManagerTrajectoryPlayer {
  a: number;
  r: number;
  anchor: number;
  potential?: number;
}

export interface ClubManagerTrajectoryContext {
  seed?: number;
  identity: string;
  year: number;
  ageBand: readonly [number, number];
  declineScale: number;
}

const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

function unit(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  hash ^= hash << 13;
  hash ^= hash >>> 17;
  hash ^= hash << 5;
  return (hash >>> 0) / 4294967296;
}

/** The caller keeps retirement, the existing age curve and value calculation. */
export function advanceClubManagerTrajectory<T extends ClubManagerTrajectoryPlayer>(
  player: T,
  context?: ClubManagerTrajectoryContext | null,
): T & { potential?: number } {
  if (!context || context.year === 0) return player;
  if (!Number.isSafeInteger(context.seed) || context.seed! < 0 || context.seed! > 4294967295
    || typeof context.identity !== 'string' || !context.identity.trim()
    || !Number.isSafeInteger(context.year) || context.year < 1
    || !Array.isArray(context.ageBand) || context.ageBand.length !== 2
    || !context.ageBand.every(value => Number.isSafeInteger(value) && value >= -99 && value <= 99)
    || context.ageBand[0] > context.ageBand[1]
    || !Number.isFinite(context.declineScale) || context.declineScale <= 0 || context.declineScale > 2
    || !Number.isSafeInteger(player.a) || player.a < 1 || player.a >= 99
    || !Number.isSafeInteger(player.r) || player.r < 40 || player.r > 99
    || !Number.isSafeInteger(player.anchor)
    || (player.potential !== undefined && (!Number.isSafeInteger(player.potential)
      || player.potential < player.r || player.potential > 99))) return player;

  const age = player.a + 1;
  const key = JSON.stringify([context.seed, context.identity, context.year]);
  const draw = (label: string): number => unit(`${key}|${label}`);
  const integer = (label: string, low: number, high: number): number => low + Math.floor(draw(label) * (high - low + 1));
  let potential = player.potential ?? clamp(player.anchor + 4 + integer('ceiling', -2, 2), player.r, 99);
  if (age >= 30) potential = Math.max(player.r, potential - 2);

  let drift = integer('drift', context.ageBand[0], context.ageBand[1]);
  if (drift < 0) drift = Math.round(drift * context.declineScale);
  const turn = draw('turn');
  if (turn < 0.04 && age <= 29) {
    potential = clamp(potential + integer('breakout-ceiling', 3, 6), player.r, 99);
    drift += integer('breakout', 1, 3);
  } else if (turn >= 0.96) {
    potential = clamp(potential - integer('setback-ceiling', 2, 4), player.r, 99);
    drift -= integer('setback', 1, 3);
  }
  if (drift > 0) drift = Math.min(drift, potential - player.r);
  const rating = clamp(player.r + drift, 40, 99);
  return { ...player, a: age, r: rating, potential: Math.max(rating, potential) };
}
