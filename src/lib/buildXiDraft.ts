import { clubs, nations, clubYearClubs, clubEraClubs } from '@/data/lineupTeams';
import { ALL_POSITIONS } from '@/lib/positionFit';
import { safeLocalStorage } from '@/lib/safeStorage';
import { FORMATIONS, lastRecordedYear } from '@/types/lineupBuilder';
import type { DraftChoice, FilledSlot, Formation, PickMeta, TeamAssignment } from '@/types/lineupBuilder';

const DRAFT_KEY = 'dukb-build-your-xi-draft-v1';

type Draft = {
  formation: Formation;
  draftChoice: DraftChoice;
  teamAssignments: TeamAssignment[];
  slots: [number, FilledSlot][];
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
    && (value.position === undefined || ALL_POSITIONS.some(position => position === value.position))
    && (value.played === undefined || (Array.isArray(value.played)
      && value.played.every(role => ALL_POSITIONS.some(position => position === role))));
}

function readDraft(value: unknown): Draft | null {
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
  return { formation, draftChoice, teamAssignments: assignments, slots };
}

export function loadBuildXiDraft(): { raw: string | null; draft: Draft | null } {
  const raw = safeLocalStorage.getItem(DRAFT_KEY);
  try {
    return { raw, draft: raw ? readDraft(JSON.parse(raw)) : null };
  } catch {
    return { raw, draft: null };
  }
}

export function isCurrentBuildXiDraft(previous: string | null): boolean {
  return safeLocalStorage.getItem(DRAFT_KEY) === previous;
}

export function writeBuildXiDraft(previous: string | null, next: string | null): boolean {
  if (!isCurrentBuildXiDraft(previous)) return false;
  if (next === null) safeLocalStorage.removeItem(DRAFT_KEY);
  else safeLocalStorage.setItem(DRAFT_KEY, next);
  return true;
}
