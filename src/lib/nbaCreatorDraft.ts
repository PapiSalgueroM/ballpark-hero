import type { UsCareerDraft } from '@/components/us-career/UsCareerCreator';
import { NBA_CAREER_CREATE, NBA_CAREER_SAVE_KEY } from '@/lib/nbaCareerCreation';
import { safeLocalStorage } from '@/lib/safeStorage';
import {
  ACCESSORIES, BOOTS, CELEBRATIONS, FACIAL_HAIR, HAIR_COLORS, HAIRSTYLES, SKIN_TONES,
  type PlayerAppearance,
} from '@/lib/soccerCareerAppearance';

const KEY = 'dukb-nba-career-creator-v1';
const appearanceOptions = {
  skinTone: SKIN_TONES, hairstyle: HAIRSTYLES, hairColor: HAIR_COLORS, facialHair: FACIAL_HAIR,
  celebration: CELEBRATIONS, boots: BOOTS, accessory: ACCESSORIES,
};

function isAppearance(value: unknown): value is PlayerAppearance {
  return value !== null && typeof value === 'object'
    && Object.entries(appearanceOptions).every(([key, options]) =>
      options.some(option => option.id === (value as Record<string, unknown>)[key]));
}

function isCreatorDraft(draft: Partial<UsCareerDraft> | null): draft is UsCareerDraft {
  return draft !== null && typeof draft === 'object'
    && typeof draft.nameInput === 'string' && draft.nameInput.length <= 24
    && NBA_CAREER_CREATE.eras.some(era => era.id === draft.eraId)
    && NBA_CAREER_CREATE.positions.some(pos => pos === draft.pos)
    && NBA_CAREER_CREATE.archetypes[draft.pos].some(archetype => archetype.id === draft.archetypeId)
    && isAppearance(draft.appearance);
}

export function readNbaCreatorDraft() {
  const raw = safeLocalStorage.getItem(KEY);
  try {
    const draft = raw === null ? null : JSON.parse(raw);
    return { raw, draft: isCreatorDraft(draft) ? draft : null };
  } catch {
    return { raw, draft: null };
  }
}

export function keepNbaCreatorDraft(previous: string | null, current: string): boolean {
  if (safeLocalStorage.getItem(NBA_CAREER_SAVE_KEY) || safeLocalStorage.getItem(KEY) !== previous) return false;
  safeLocalStorage.setItem(KEY, current);
  return true;
}

export function clearNbaCreatorDraft(expected: string | null) {
  if (expected !== null && safeLocalStorage.getItem(KEY) === expected) safeLocalStorage.removeItem(KEY);
}
