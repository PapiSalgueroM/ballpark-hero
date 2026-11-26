import { clubs, nations, clubYearClubs, clubEraClubs, CLUB_TABLE_NAMES, clubEraAdditionalNames } from '@/data/lineupTeams';
import { ALL_POSITIONS, SLOT_ALLOWED_BY_ROLE } from '@/lib/positionFit';
import { safeLocalStorage } from '@/lib/safeStorage';
import { normalizePosition } from '@/lib/squadShape';
import type { Position } from '@/types/game';
import type { WorldXiSeasonApproach } from '@/lib/worldXi';
import { FORMATIONS, lastRecordedYear } from '@/types/lineupBuilder';
import type { DraftChoice, FilledSlot, Formation, PickMeta, RecordedClubDraft, TeamAssignment } from '@/types/lineupBuilder';

export const BUILD_XI_DRAFT_KEY = 'dukb-build-your-xi-draft-v1';

type Draft = {
  formation: Formation;
  draftChoice: DraftChoice;
  teamAssignments: TeamAssignment[];
  slots: [number, FilledSlot][];
  seasonApproach?: WorldXiSeasonApproach;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isDraftChoice(value: unknown): value is DraftChoice {
  if (!record(value)) return false;
  if (value.mode === 'mixed') return true;
  return (value.mode === 'club-year' || value.mode === 'club-era')
    && typeof value.year === 'number' && Number.isInteger(value.year)
    && value.year >= 2004 && lastRecordedYear({ mode: value.mode, year: value.year }) <= 2026;
}

function isPickMeta(value: unknown): value is PickMeta {
  return record(value)
    && ['rawName', 'rawPosition', 'club', 'nationality'].every(key => value[key] === undefined || typeof value[key] === 'string')
    && ['value', 'age', 'year'].every(key => value[key] === undefined || Number.isFinite(value[key]))
    && (value.recordId === undefined || (typeof value.recordId === 'number' && Number.isSafeInteger(value.recordId) && value.recordId > 0))
    && (value.position === undefined || ALL_POSITIONS.some(position => position === value.position))
    && (value.played === undefined || (Array.isArray(value.played)
      && value.played.every(role => ALL_POSITIONS.some(position => position === role))));
}

/**
 * A matching club record settles membership when the slot and the player's
 * position are known. Some records list two clubs in one season.
 */
export function clubPickVerifies(team: TeamAssignment, slotRole: Position, pick: PickMeta | undefined): boolean {
  if (team.isNation || !pick?.club || !pick.rawPosition) return false;
  if (!SLOT_ALLOWED_BY_ROLE[slotRole]) return false;
  if (!normalizePosition(pick.rawPosition.trim())) return false;
  const stored = CLUB_TABLE_NAMES[team.name] ?? clubEraAdditionalNames[team.name];
  if (!stored) return false;
  return pick.club.split(' / ').map(part => part.trim()).some(part => stored.includes(part));
}

export function recordedPickVerifies(team: TeamAssignment, role: Position, pick: PickMeta | undefined, draft: RecordedClubDraft): boolean {
  return typeof pick?.year === 'number' && Number.isInteger(pick.year)
    && pick.year >= draft.year && pick.year <= lastRecordedYear(draft)
    && typeof pick?.rawName === 'string' && Boolean(pick.rawName.trim())
    && typeof pick.club === 'string' && typeof pick.rawPosition === 'string'
    && clubPickVerifies(team, role, pick);
}

export function readBuildXiPicks(value: unknown): Draft | null {
  if (!record(value) || typeof value.formation !== 'string' || !Object.prototype.hasOwnProperty.call(FORMATIONS, value.formation)
    || !isDraftChoice(value.draftChoice) || !Array.isArray(value.teamAssignments) || !Array.isArray(value.slots)) return null;
  const formation = value.formation as Formation;
  const draftChoice = value.draftChoice;
  const roles = FORMATIONS[formation];
  const pool = draftChoice.mode === 'club-era' ? clubEraClubs : draftChoice.mode === 'club-year' ? clubYearClubs : clubs;
  const assignments = value.teamAssignments;
  if (assignments.length !== roles.length || !assignments.every((team): team is TeamAssignment => {
    if (!record(team) || typeof team.name !== 'string' || typeof team.isNation !== 'boolean') return false;
    return team.isNation ? draftChoice.mode === 'mixed' && nations.includes(team.name) : pool.includes(team.name);
  })) return null;
  if (new Set(assignments.map(team => team.name)).size !== assignments.length || value.slots.length > roles.length) return null;

  const slots: Draft['slots'] = [];
  for (const [pickIndex, entry] of value.slots.entries()) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [index, slot] = entry;
    if (typeof index !== 'number' || !Number.isInteger(index) || !roles[index] || !record(slot)
      || typeof slot.playerName !== 'string' || !slot.playerName.trim()
      || slot.role !== roles[index].role || slot.label !== roles[index].label
      || slot.assignedTeam !== assignments[pickIndex].name || slot.isNation !== assignments[pickIndex].isNation
      || (slot.pick !== undefined && !isPickMeta(slot.pick))) return null;
    slots.push([index, {
      ...roles[index],
      playerName: slot.playerName,
      assignedTeam: assignments[pickIndex].name,
      isNation: assignments[pickIndex].isNation,
      ...(slot.pick === undefined ? {} : { pick: slot.pick }),
    }]);
  }
  if (new Set(slots.map(([index]) => index)).size !== slots.length) return null;
  if (draftChoice.mode !== 'mixed' && slots.some(([, slot], pickIndex) =>
    !recordedPickVerifies(assignments[pickIndex], slot.role, slot.pick, draftChoice))) return null;
  const approach = value.seasonApproach;
  return { formation, draftChoice, teamAssignments: assignments, slots, ...(approach === 'protect' || approach === 'attack' ? { seasonApproach: approach } : {}) };
}

export function readBuildXiDraft(raw: string | null): Draft | null {
  try {
    return raw ? readBuildXiPicks(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function isCurrentBuildXiDraft(previous: string | null): boolean {
  return safeLocalStorage.getItem(BUILD_XI_DRAFT_KEY) === previous;
}

export function writeBuildXiDraft(previous: string | null, next: string | null): boolean {
  if (!isCurrentBuildXiDraft(previous)) return false;
  if (next === null) safeLocalStorage.removeItem(BUILD_XI_DRAFT_KEY);
  else safeLocalStorage.setItem(BUILD_XI_DRAFT_KEY, next);
  return true;
}
