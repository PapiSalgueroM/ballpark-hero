/** One fee curve for generated academy kids and first team players. */
export type PlayerValuePos = 'GK' | 'DF' | 'MF' | 'FW';

const POS_PRICE: Record<PlayerValuePos, number> = { GK: 0.95, DF: 1.0, MF: 1.04, FW: 1.08 };

/** The youth premium fades from 21 to 23, exactly as before. */
export function ageFactor(age: number): number {
  if (age <= 20) return 1;
  if (age >= 23) return 0;
  return (23 - age) / 3;
}

/** Seniors lose resale value after their prime and retire at 34. */
export function primeFactor(age: number): number {
  if (age < 28) return 1;
  if (age >= 34) return 0;
  return [0.90, 0.78, 0.64, 0.50, 0.36, 0.22][Math.floor(age) - 28];
}

export function basePrice(rating: number, potential: number, age: number, pos: PlayerValuePos = 'MF'): number {
  const skill = Math.pow(rating, 2.35) / 60;
  /* This coefficient keeps a fee rising with rating at every fixed age. */
  const promise = 1 + (potential - rating) * 0.022 * ageFactor(age);
  return skill * promise * POS_PRICE[pos] * primeFactor(age);
}
