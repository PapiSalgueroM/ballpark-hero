export type FightPromoterMode = 'boxing' | 'mma';

export const FIGHT_PROMOTER_PATH = '/fight-promoter';
export const FIGHT_PROMOTER_MODE_KEY = 'fight-promoter-mode-v1';
export const MMA_SAVE_KEY = 'dukb-mma-promoter-v1';
export const BOXING_SAVE_KEY = 'fight-promoter-save-v1';

export function fightPromoterMode(value: string | null): FightPromoterMode | null {
  return value === 'mma' || value === 'boxing' ? value : null;
}

export function fightPromoterModeFromSearch(search: URLSearchParams): FightPromoterMode | null {
  const modes = search.getAll('mode');
  return modes.length === 1 ? fightPromoterMode(modes[0]) : null;
}

export function savedFightPromoterMode(storage: Pick<Storage, 'getItem'> | null): FightPromoterMode | null {
  try {
    const mode = fightPromoterMode(storage?.getItem(FIGHT_PROMOTER_MODE_KEY) ?? null);
    if (mode) return mode;
    if (storage?.getItem(BOXING_SAVE_KEY)) return 'boxing';
    if (storage?.getItem(MMA_SAVE_KEY)) return 'mma';
  } catch { /* Mode selection works without storage. */ }
  return null;
}
