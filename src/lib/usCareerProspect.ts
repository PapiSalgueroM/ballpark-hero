import { loadPreDraft, preDraftChoicePool, type PreDraftState } from './careerPreDraft';
import { keyedRng } from './keyedRng';
import { defaultAppearance, type PlayerAppearance } from './soccerCareerAppearance';
import type { UsCareerSport } from './usCareerSport';

export interface UsCareerProspect {
  v: 1;
  name: string;
  pos: string;
  archetypeId: string;
  eraId: string;
  appearance: PlayerAppearance;
  seed: string;
  rating: number;
  pot: number;
  state: PreDraftState | null;
}

export function createUsCareerProspect(
  sport: UsCareerSport,
  input: Pick<UsCareerProspect, 'name' | 'pos' | 'archetypeId' | 'eraId' | 'appearance' | 'seed'>,
): UsCareerProspect {
  const arch = sport.create.archetypes[input.pos].find(a => a.id === input.archetypeId)!;
  return { v: 1, ...input, ...sport.prospectRatings(arch, keyedRng(`${input.seed}|ratings`)), state: null };
}

/** A partial prospect never replaces an already valid professional save. */
export function loadUsCareerProspect(sport: UsCareerSport, raw: unknown): UsCareerProspect | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as UsCareerProspect;
  if (p.v !== 1 || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 24
    || typeof p.seed !== 'string' || !p.seed || typeof p.pos !== 'string'
    || !sport.create.positions.includes(p.pos) || !sport.create.eras.some(e => e.id === p.eraId)
    || !sport.create.archetypes[p.pos].some(a => a.id === p.archetypeId)
    || !Number.isInteger(p.rating) || p.rating < 1 || p.rating > 99
    || !Number.isInteger(p.pot) || p.pot < p.rating || p.pot > 99) return null;
  if (!p.appearance || Object.keys(defaultAppearance()).some(k => typeof p.appearance[k as keyof PlayerAppearance] !== 'string')) return null;
  if (p.state === null) return p;
  const desc = sport.preDraft(p.eraId);
  const state = loadPreDraft(p.state, desc);
  if (!state) return null;
  const route = desc.routes.find(r => r.id === state.routeId);
  if (!route || state.sport !== sport.slug || state.eraId !== p.eraId || state.seed !== p.seed
    || state.pos !== p.pos || state.pot !== p.pot || state.seasonsDone > route.seasons
    || state.age !== route.startAge + state.seasonsDone
    || (state.phase === 'season' && state.seasonsDone >= route.seasons)
    || (['showcase', 'draft', 'done'].includes(state.phase) && state.seasonsDone !== route.seasons)) return null;
  const choices = preDraftChoicePool(desc).filter(c => !c.routes || c.routes.includes(route.id));
  // Recorded choices remain history when the current card pool changes.
  if (state.pendingChoice && (!choices.some(c => c.id === state.pendingChoice) || state.choicesSeen.includes(state.pendingChoice))) return null;
  return { ...p, state };
}
