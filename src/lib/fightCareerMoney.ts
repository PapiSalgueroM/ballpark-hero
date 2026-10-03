/**
 * Round 916: the bank and the camp shop for Fight Career.
 *
 * A PLAIN BANK ON PURPOSE. The four American careers bank through
 * careerMoney.ts, which carries funds, property and a card school, and that
 * module has no switch to leave the cards out. Fight Career's first rule is
 * that there is nothing in it to wager on (see the header of fightCareer.ts),
 * so it does not bind that module at all: a purse comes in, the corner takes
 * its share, and what is left can be spent on the camp. That is the whole
 * economy, and there is no screen in it where money is risked for money.
 *
 * Amounts are in millions, to two decimals, the unit every purse in this game
 * already uses.
 */

export const round2 = (v: number): number => Math.round(v * 100) / 100;

/** What the bank needs on a save. The life block carries both. */
export interface BankHost {
  bank: number;
  shop?: Partial<Record<UpgradeId, number>>;
}

export type UpgradeId = 'sparring' | 'strength' | 'roadwork' | 'padman' | 'cutman';

export interface UpgradeDef {
  id: UpgradeId;
  emoji: string;
  label: string;
  /** What ONE level does, in the words the shop shows. */
  per: string;
  /** The number behind `per`, read by the camp and by the harness. */
  step: number;
}

export const MAX_UPGRADE_LEVEL = 3;

/** Level 1, 2 and 3. A club fighter can afford the first, a contender the
 *  second, and the third is champion money. */
export const UPGRADE_PRICES = [0.05, 0.25, 1] as const;

export const UPGRADES: UpgradeDef[] = [
  { id: 'sparring', emoji: '🥊', label: 'Sparring partners', per: 'Every fight night is 1 point sharper', step: 1 },
  { id: 'strength', emoji: '🏋️', label: 'Strength coach', per: 'Power weeks are worth 12% more', step: 0.12 },
  { id: 'roadwork', emoji: '🏃', label: 'Conditioning coach', per: 'Conditioning weeks are worth 12% more', step: 0.12 },
  { id: 'padman', emoji: '🎯', label: 'Pad man', per: 'Defence and speed weeks are worth 10% more', step: 0.1 },
  { id: 'cutman', emoji: '🩹', label: 'Cut man', per: 'You carry 4% less damage out of every fight', step: 0.04 },
];

export function upgradeLevel(h: BankHost, id: UpgradeId): number {
  const n = h.shop?.[id] ?? 0;
  return Number.isFinite(n) ? Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(n))) : 0;
}

/** The price of the NEXT level, or null when the upgrade is maxed. */
export function upgradePrice(h: BankHost, id: UpgradeId): number | null {
  const lvl = upgradeLevel(h, id);
  return lvl >= MAX_UPGRADE_LEVEL ? null : UPGRADE_PRICES[lvl];
}

export function canBuyUpgrade(h: BankHost, id: UpgradeId): boolean {
  const price = upgradePrice(h, id);
  return price !== null && h.bank >= price;
}

/**
 * Buy one level. Mutates the host and returns the line for the feed, or null
 * when it is maxed or the bank does not cover it (the shop never lends).
 */
export function buyUpgrade(h: BankHost, id: UpgradeId): string | null {
  const def = UPGRADES.find(u => u.id === id);
  const price = upgradePrice(h, id);
  if (!def || price === null || h.bank < price) return null;
  h.bank = round2(h.bank - price);
  h.shop = { ...(h.shop ?? {}), [id]: upgradeLevel(h, id) + 1 };
  return `${def.emoji} ${def.label}, level ${upgradeLevel(h, id)}, for ${price.toFixed(2)}m.`;
}

/** What a purse leaves once the corner is paid. `cuts` are fractions of the
 *  whole purse, each taken off the top, which is what "takes 10% of every
 *  purse" says on the setup screen. */
export function purseAfterCuts(purse: number, cuts: number[]): number {
  const taken = cuts.reduce((sum, c) => sum + Math.max(0, c), 0);
  return round2(purse * Math.max(0, 1 - taken));
}

/** "0.35m", or "owes 0.04m" when a card put the bank on the tab. */
export function fmtBank(v: number): string {
  return v < 0 ? `owes ${Math.abs(v).toFixed(2)}m` : `${v.toFixed(2)}m`;
}
