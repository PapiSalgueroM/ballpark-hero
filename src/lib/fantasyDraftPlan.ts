import type { DraftPlayer } from '@/components/fantasy-draft/PlayerPool';
import { FANTASY_FORMATION, fantasyDraftCandidates, type CriteriaRule } from './fantasyCriteria';
import { FANTASY_TEAM_SIZE, FANTASY_TOTAL_PICKS, getPickOwner } from './fantasyDraftSave';

function priorityPool(aiTeam: DraftPlayer[], legal: DraftPlayer[]) {
  const keepers = legal.filter(p => p.position === 'GK');
  const needsKeeper = !aiTeam.some(p => p.position === 'GK') && keepers.length > 0
    && (keepers.length <= 2 || FANTASY_TEAM_SIZE - aiTeam.length <= 2);
  return needsKeeper ? keepers : legal;
}
export function fantasyAiShortlist(aiTeam: DraftPlayer[], legal: DraftPlayer[]) {
  return [...priorityPool(aiTeam, legal)]
    .sort((a, b) => (b.market_value_millions || 0) - (a.market_value_millions || 0)).slice(0, 6);
}

type ScoutOpponent = { team: DraftPlayer[]; userFirst: boolean };
const value = (player: DraftPlayer) => player.market_value_millions || 0;

export function fantasyRivalPick(rule: CriteriaRule | null, aiTeam: DraftPlayer[], pool: DraftPlayer[], claimed: Set<string>, scout?: ScoutOpponent) {
  const legal = fantasyDraftCandidates(rule, aiTeam, pool, claimed).players;
  if (!scout) return { players: fantasyAiShortlist(aiTeam, legal), reason: '' };
  const ranked = [...priorityPool(aiTeam, legal)].sort((a, b) => value(b) - value(a) || a.id.localeCompare(b.id));
  if (!ranked.length) return { players: [], reason: '' };
  const next = aiTeam.length + scout.team.length + 1;
  const contested = next < FANTASY_TOTAL_PICKS && getPickOwner(next, scout.userFirst) === 'user'
    ? new Set(fantasyDraftCandidates(rule, scout.team, pool, claimed).players.map(p => p.id)) : new Set<string>();
  let pick = ranked[0], best = value(pick), reason = 'Highest listed value among the rival’s available picks.';
  if (ranked.length !== legal.length && ranked[0].position === 'GK') reason = 'The rival protected its open goalkeeper spot.';
  for (const [position, capacity] of Object.entries(FANTASY_FORMATION)) {
    const options = ranked.filter(p => p.position === position);
    const first = options[0];
    if (!first || !contested.has(first.id)) continue;
    const openings = capacity - aiTeam.filter(p => p.position === position).length;
    const replacement = options[openings];
    // If the opponent takes this player, this is who enters the projected full group.
    const gap = value(first) - (replacement ? value(replacement) : 0);
    const score = value(first) + gap;
    if (gap <= 0 || score <= best) continue;
    best = score; pick = first;
    reason = replacement
      ? `At ${position}, passing on this £${value(first)}m pick could put a £${value(replacement)}m player in the rival’s XI.`
      : `At ${position}, passing on this pick could leave the rival short of eligible players for its remaining spots.`;
  }
  return { players: [pick], reason };
}

export function rivalPicksBeforeNextTurn(pickIndex: number, userFirst: boolean): number | null {
  if (getPickOwner(pickIndex, userFirst) !== 'user') return null;
  for (let next = pickIndex + 1; next < FANTASY_TOTAL_PICKS; next++) {
    if (getPickOwner(next, userFirst) === 'user') return next - pickIndex - 1;
  }
  return null;
}

/** Conditions on the first pick already being taken. Each member of the actual rival shortlist is equally likely. */
export function followUpChance(targetId: string, rivalPicks: number, rule: CriteriaRule | null, aiTeam: DraftPlayer[], pool: DraftPlayer[], claimed: Set<string>, scout?: ScoutOpponent): number {
  if (claimed.has(targetId)) return 0;
  if (rivalPicks === 0) return 1;
  const options = fantasyRivalPick(rule, aiTeam, pool, claimed, scout).players;
  if (!options.length) return 0;
  let probability = 0;
  for (const option of options) {
    if (option.id !== targetId) probability += followUpChance(targetId, rivalPicks - 1, rule, [...aiTeam, option], pool, new Set([...claimed, option.id]), scout);
  }
  return probability / options.length;
}
