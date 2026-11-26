import type { DraftPlayer } from '@/components/fantasy-draft/PlayerPool';
import { fantasyDraftCandidates, type CriteriaRule } from './fantasyCriteria';
import { FANTASY_TEAM_SIZE, FANTASY_TOTAL_PICKS, getPickOwner } from './fantasyDraftSave';

export function fantasyAiShortlist(aiTeam: DraftPlayer[], legal: DraftPlayer[]) {
  const keepers = legal.filter(p => p.position === 'GK');
  const needsKeeper = !aiTeam.some(p => p.position === 'GK') && keepers.length > 0
    && (keepers.length <= 2 || FANTASY_TEAM_SIZE - aiTeam.length <= 2);
  return [...(needsKeeper ? keepers : legal)]
    .sort((a, b) => (b.market_value_millions || 0) - (a.market_value_millions || 0)).slice(0, 6);
}

export function rivalPicksBeforeNextTurn(pickIndex: number, userFirst: boolean): number | null {
  if (getPickOwner(pickIndex, userFirst) !== 'user') return null;
  for (let next = pickIndex + 1; next < FANTASY_TOTAL_PICKS; next++) {
    if (getPickOwner(next, userFirst) === 'user') return next - pickIndex - 1;
  }
  return null;
}

/** Conditions on the first pick already being taken. Each member of the actual rival shortlist is equally likely. */
export function followUpChance(targetId: string, rivalPicks: number, rule: CriteriaRule | null, aiTeam: DraftPlayer[], pool: DraftPlayer[], claimed: Set<string>): number {
  if (claimed.has(targetId)) return 0;
  if (rivalPicks === 0) return 1;
  const legal = fantasyDraftCandidates(rule, aiTeam, pool, claimed).players;
  const options = fantasyAiShortlist(aiTeam, legal);
  if (!options.length) return 0;
  let probability = 0;
  for (const option of options) {
    if (option.id !== targetId) probability += followUpChance(targetId, rivalPicks - 1, rule, [...aiTeam, option], pool, new Set([...claimed, option.id]));
  }
  return probability / options.length;
}
