/** Frozen Round 585 fee curve, copied before Round 586 at cf15dce5434567e87af320ec1b017e76e0fd9f19.
 * This is a regression oracle, not a second live engine. Do not update it when prices change. */
const POS_PRICE = { GK: 0.95, DF: 1.0, MF: 1.04, FW: 1.08 };

function ageFactor(age) {
  if (age <= 20) return 1;
  if (age >= 23) return 0;
  return (23 - age) / 3;
}

export function basePrice(rating, potential, age, pos = 'MF') {
  const skill = Math.pow(rating, 2.35) / 60;
  const promise = 1 + (potential - rating) * 0.022 * ageFactor(age);
  return skill * promise * POS_PRICE[pos];
}
