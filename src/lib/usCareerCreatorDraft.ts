import type { UsCareerDraft } from '@/components/us-career/UsCareerCreator';
import { safeLocalStorage, safeSetItem } from '@/lib/safeStorage';
import type { UsCareerCreate } from '@/lib/usCareerSport';
import {
  ACCESSORIES, BOOTS, CELEBRATIONS, FACIAL_HAIR, HAIR_COLORS, HAIRSTYLES, SKIN_TONES,
  type PlayerAppearance,
} from '@/lib/soccerCareerAppearance';

type CreatorSport = 'nba' | 'nfl';
const keyFor = (sport: CreatorSport) => `dukb-${sport}-career-creator-v1`;
const appearanceOptions = {
  skinTone: SKIN_TONES, hairstyle: HAIRSTYLES, hairColor: HAIR_COLORS, facialHair: FACIAL_HAIR,
  celebration: CELEBRATIONS, boots: BOOTS, accessory: ACCESSORIES,
};

function isAppearance(value: unknown): value is PlayerAppearance {
  return value !== null && typeof value === 'object'
    && Object.entries(appearanceOptions).every(([key, options]) =>
      options.some(option => option.id === (value as Record<string, unknown>)[key]));
}

function isCreatorDraft(draft: Partial<UsCareerDraft> | null, create: UsCareerCreate): draft is UsCareerDraft {
  return draft !== null && typeof draft === 'object'
    && typeof draft.nameInput === 'string' && draft.nameInput.length <= 24
    && create.eras.some(era => era.id === draft.eraId)
    && create.positions.some(pos => pos === draft.pos)
    && create.archetypes[draft.pos].some(archetype => archetype.id === draft.archetypeId)
    && isAppearance(draft.appearance);
}

export function readUsCareerCreatorDraft(sport: CreatorSport, create: UsCareerCreate, careerKey: string) {
  const raw = safeLocalStorage.getItem(keyFor(sport));
  if (raw === null || safeLocalStorage.getItem(careerKey)) return { raw, draft: null };
  try {
    const draft = JSON.parse(raw);
    return { raw, draft: isCreatorDraft(draft, create) ? draft : null };
  } catch {
    return { raw, draft: null };
  }
}

export function keepUsCareerCreatorDraft(sport: CreatorSport, careerKey: string, previous: string | null, current: string): boolean {
  const key = keyFor(sport);
  if (safeLocalStorage.getItem(careerKey) || safeLocalStorage.getItem(key) !== previous) return false;
  safeLocalStorage.setItem(key, current);
  return true;
}

export function clearUsCareerCreatorDraft(sport: CreatorSport, expected: string | null) {
  const key = keyFor(sport);
  if (expected !== null && safeLocalStorage.getItem(key) === expected) safeLocalStorage.removeItem(key);
}

export function keepReturningCreatorDraft(sport: 'nfl', previous: string | null, current: string): boolean {
  const key = keyFor(sport);
  return safeLocalStorage.getItem(key) === previous && safeSetItem(key, current);
}
