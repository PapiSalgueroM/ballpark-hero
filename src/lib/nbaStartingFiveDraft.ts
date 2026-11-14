import { NBA_TEAMS, type NbaTeam } from '@/data/nbaTeams';
import { nbaFiveNameKey, challengeByStat } from '@/lib/nbaStartingFiveScore';
import { safeLocalStorage } from '@/lib/safeStorage';
import { NBA_POSITIONS, type NbaFilledSlot, type StatChallenge } from '@/types/nba';

const KEY = 'dukb-nba-starting-five-draft-v1';

type Draft = {
  challenge: StatChallenge;
  teamAssignments: NbaTeam[];
  filledSlots: Map<number, NbaFilledSlot>;
  selectedPosition: number | null;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function positionIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < NBA_POSITIONS.length;
}

function decodeDraft(value: unknown): Draft | null {
  if (!record(value) || typeof value.stat !== 'string'
    || (value.direction !== 'highest' && value.direction !== 'lowest')
    || !Array.isArray(value.teams) || value.teams.length !== NBA_POSITIONS.length
    || !Array.isArray(value.picks) || value.picks.length > NBA_POSITIONS.length) return null;
  const def = challengeByStat(value.stat);
  if (!def) return null;
  const teamAssignments = value.teams.map(id => NBA_TEAMS.find(team => team.abbreviation === id));
  if (!teamAssignments.every(team => team !== undefined) || new Set(teamAssignments).size !== NBA_POSITIONS.length) return null;

  const filledSlots = new Map<number, NbaFilledSlot>();
  const names = new Set<string>();
  for (const [pickIndex, pick] of value.picks.entries()) {
    if (!record(pick) || !positionIndex(pick.index) || filledSlots.has(pick.index)
      || typeof pick.name !== 'string' || !pick.name.trim()
      || typeof pick.value !== 'number' || !Number.isFinite(pick.value) || pick.value < 0) return null;
    const key = nbaFiveNameKey(pick.name);
    if (!key || names.has(key)) return null;
    names.add(key);
    filledSlots.set(pick.index, {
      ...NBA_POSITIONS[pick.index],
      playerName: pick.name,
      excludeName: pick.name,
      assignedTeam: teamAssignments[pickIndex].name,
      statValue: pick.value,
    });
  }
  const selectedPosition = value.selectedPosition;
  if (selectedPosition !== null && (!positionIndex(selectedPosition) || filledSlots.has(selectedPosition))) return null;
  const { stat, emoji, unit } = def;
  return { challenge: { stat, emoji, unit, direction: value.direction }, teamAssignments, filledSlots, selectedPosition };
}

export function loadNbaStartingFiveDraft(): { raw: string | null; draft: Draft | null } {
  const raw = safeLocalStorage.getItem(KEY);
  try {
    return { raw, draft: raw ? decodeDraft(JSON.parse(raw)) : null };
  } catch {
    return { raw, draft: null };
  }
}

export function encodeNbaStartingFiveDraft({ challenge, teamAssignments, filledSlots, selectedPosition }: Draft): string {
  return JSON.stringify({
    stat: challenge.stat,
    direction: challenge.direction,
    teams: teamAssignments.map(team => team.abbreviation),
    picks: Array.from(filledSlots, ([index, slot]) => ({ index, name: slot.playerName, value: slot.statValue })),
    selectedPosition,
  });
}

export function writeNbaStartingFiveDraft(previous: string | null, next: string | null): boolean {
  if (safeLocalStorage.getItem(KEY) !== previous) return false;
  if (next === null) safeLocalStorage.removeItem(KEY);
  else safeLocalStorage.setItem(KEY, next);
  return true;
}
