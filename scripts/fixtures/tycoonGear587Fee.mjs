/** Frozen from 9a2f6da1: playerValue.ts and wonderkidFactory.ts salePrice/priceMult.
 * Independent of the current engine and any boot or ledger calculation.
 */
const POS_PRICE = { GK: 0.95, DF: 1, MF: 1.04, FW: 1.08 };
export function feeBeforeGear(s, p) {
  const youth = p.age <= 20 ? 1 : p.age >= 23 ? 0 : (23 - p.age) / 3;
  const prime = p.age < 28 ? 1 : p.age >= 34 ? 0 : [0.90, 0.78, 0.64, 0.50, 0.36, 0.22][Math.floor(p.age) - 28];
  const raw = Math.pow(p.rating, 2.35) / 60 * (1 + (p.potential - p.rating) * 0.022 * youth) * POS_PRICE[p.pos] * prime;
  return Math.round(raw * ((1 + 0.08 * s.levels.agents) * (1 + 0.1 * s.rep) * (s.deadlineLeft > 0 ? 1.5 : 1)));
}
