export interface CareerChanceWheelReceipt {
  title: string; chance: number; roll: number; hit: string; miss: string; result: boolean; seen: boolean;
}
type WheelState = { chanceWheel?: CareerChanceWheelReceipt };

/** Keeps the engine's one real draw so a reveal never rolls again. */
export function rollCareerChance(state: WheelState, chance: number, title: string, hit: string, miss: string, rng = Math.random): boolean {
  const roll = rng();
  const result = roll < chance;
  state.chanceWheel = { title, chance, roll, hit, miss, result, seen: false };
  return result;
}
export function validChanceWheel(value: unknown): value is CareerChanceWheelReceipt {
  if (!value || typeof value !== 'object') return false;
  const r = value as CareerChanceWheelReceipt;
  return typeof r.title === 'string' && typeof r.hit === 'string' && typeof r.miss === 'string'
    && Number.isFinite(r.chance) && r.chance > 0 && r.chance < 1 && Number.isFinite(r.roll) && r.roll >= 0 && r.roll < 1
    && typeof r.result === 'boolean' && r.result === (r.roll < r.chance) && typeof r.seen === 'boolean';
}
export function acknowledgeChanceWheel<T extends WheelState>(state: T): T {
  return validChanceWheel(state.chanceWheel) && !state.chanceWheel.seen
    ? { ...state, chanceWheel: { ...state.chanceWheel, seen: true } } : state;
}
