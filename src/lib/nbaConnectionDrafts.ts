export interface NbaConnectionDrafts {
  v: 1;
  scope: string;
  roster: string[];
  active: number;
  groups: string[][];
}

export const nbaDraftKey = (mode: 'daily' | 'unlimited') => `nba-connections-notes-v1:${mode}`;
export const nbaDraftScope = (mode: 'daily' | 'unlimited', puzzleId: string, date: string) =>
  JSON.stringify([mode, puzzleId, mode === 'daily' ? date : null]);

export function emptyNbaDrafts(scope: string, roster: string[]): NbaConnectionDrafts {
  return { v: 1, scope, roster: [...roster].sort(), active: 0, groups: [[], [], [], []] };
}

/** Validate the complete document before pruning names already solved in this game. */
export function parseNbaDrafts(raw: string | null, scope: string, roster: string[], remaining: string[]): NbaConnectionDrafts | null {
  if (!raw || raw.length > 12000) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || value.v !== 1 || value.scope !== scope || !Number.isInteger(value.active)
      || value.active < 0 || value.active > 3 || !Array.isArray(value.roster)
      || value.roster.length !== roster.length || !value.roster.every((name: unknown) => typeof name === 'string')
      || JSON.stringify([...value.roster].sort()) !== JSON.stringify([...roster].sort())
      || !Array.isArray(value.groups) || value.groups.length !== 4) return null;
    const canonical = new Set(roster), seen = new Set<string>();
    for (const group of value.groups) {
      if (!Array.isArray(group) || group.length > 5) return null;
      for (const name of group) {
        if (typeof name !== 'string' || !canonical.has(name) || seen.has(name)) return null;
        seen.add(name);
      }
    }
    const available = new Set(remaining);
    return { ...emptyNbaDrafts(scope, roster), active: value.active,
      groups: value.groups.map((group: string[]) => group.filter(name => available.has(name))) };
  } catch { return null; }
}

export function toggleNbaDraft(notes: NbaConnectionDrafts, name: string): NbaConnectionDrafts {
  if (!notes.roster.includes(name)) return notes;
  const current = notes.groups[notes.active];
  if (!current.includes(name) && current.length >= 5) return notes;
  const groups = notes.groups.map(group => group.filter(player => player !== name));
  if (!current.includes(name)) groups[notes.active].push(name);
  return { ...notes, groups };
}
