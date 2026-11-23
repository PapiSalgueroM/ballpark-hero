import { resolveSoccerNamesakeRecord, soccerNamesakeGroup, type NamesakePosition } from '../../supabase/functions/_shared/soccerNamesakeRecord';
import { normalizeName, type PlayerEntityMeta } from '@/lib/playerSearch';
import { normalizePosition } from '@/lib/squadShape';
import type { FilledSlot, PickMeta, PositionRole } from '@/types/lineupBuilder';

const POSITION_GROUP: Record<PositionRole, NamesakePosition> = {
  GK: 'gk',
  CB: 'def', LB: 'def', RB: 'def', LWB: 'def', RWB: 'def',
  CDM: 'mid', CM: 'mid', CAM: 'mid', LM: 'mid', RM: 'mid',
  LW: 'fwd', RW: 'fwd', ST: 'fwd', CF: 'fwd',
};

export function buildXiNamesake(name: string, pick?: PickMeta) {
  const scopedName = soccerNamesakeGroup(name) ? name : pick?.rawName ?? name;
  const group = soccerNamesakeGroup(scopedName);
  if (!group) return null;
  const position = pick?.rawPosition ? normalizePosition(pick.rawPosition.trim()) : null;
  return {
    group: normalizeName(group.name),
    person: resolveSoccerNamesakeRecord(scopedName, {
      club: pick?.club,
      nationality: pick?.nationality,
      position: position ? POSITION_GROUP[position] : undefined,
    }),
  };
}

export function buildXiReviewedName(name: string, pick?: PickMeta) {
  return buildXiNamesake(name, pick)?.person ?? null;
}

export function buildXiExclusions(slots: Iterable<FilledSlot>) {
  const keys = new Set<string>();
  for (const slot of slots) {
    const scope = buildXiNamesake(slot.playerName, slot.pick);
    if (!scope) {
      keys.add(normalizeName(slot.playerName));
    } else if (scope.person) {
      keys.add('person:' + normalizeName(scope.person));
      keys.add('unknown:' + scope.group);
    } else {
      keys.add('group:' + scope.group);
    }
  }
  return keys;
}

function candidateKeys(name: string, pick?: PickMeta) {
  const scope = buildXiNamesake(name, pick);
  if (!scope) return [normalizeName(name)];
  return [
    'group:' + scope.group,
    scope.person ? 'person:' + normalizeName(scope.person) : 'unknown:' + scope.group,
  ];
}

export function buildXiSearchExclusionKeys(name: string, meta: PlayerEntityMeta) {
  return candidateKeys(name, { club: meta.club, nationality: meta.nationality, rawPosition: meta.position });
}

export function buildXiAlreadyPicked(exclusions: Set<string>, name: string, pick?: PickMeta) {
  return candidateKeys(name, pick).some(key => exclusions.has(key));
}

export function buildXiReportName(slot: FilledSlot, lineup: FilledSlot[]) {
  const shared = lineup.some(other => other !== slot && normalizeName(other.playerName) === normalizeName(slot.playerName));
  return shared ? buildXiReviewedName(slot.playerName, slot.pick) ?? slot.playerName : slot.playerName;
}
