import type { Lineup } from '@/lib/missingXi';
import { normalizeName } from '@/lib/playerSearch';
import verifiedNames from '@/data/missingXiStarterNames.json';

// Match-specific spellings from the Missing XI two-source ledger. The archive test checks every published eleven.
const publishedNames: Record<string, Record<string, string>> = verifiedNames;

type Starter = { name: string; position: string; aliases: string[]; surname: string };
export interface RecallSheet {
  starters: Starter[];
  found: number[];
  hinted: number[];
  finished: boolean;
  best: number | null;
}

export function newRecallSheet(lineup: Lineup, best: number | null = null): RecallSheet {
  return {
    starters: lineup.slots.map((slot, index) => {
      const candidate = lineup.blankCandidates.find(c => c.slotIndex === index);
      const published = publishedNames[lineup.id]?.[slot.name];
      const aliases = [...(candidate?.aliases ?? []), ...(published ? [published] : [])];
      return { name: slot.name, position: slot.position, aliases,
        surname: candidate?.surname ?? slot.name.split(' ').at(-1)! };
    }),
    found: [], hinted: [], finished: false, best,
  };
}

export function readRecallSheet(raw: string | null): RecallSheet | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as RecallSheet;
    if (!s || !Array.isArray(s.starters) || s.starters.length !== 11 || !s.starters.every(p =>
      p && typeof p.name === 'string' && p.name && typeof p.surname === 'string' && p.surname &&
      typeof p.position === 'string' && p.position && Array.isArray(p.aliases) && p.aliases.every(a => typeof a === 'string'))) return null;
    const slots = (arr: unknown) => Array.isArray(arr) && arr.every(i => Number.isInteger(i) && i >= 0 && i < 11)
      && new Set(arr).size === arr.length;
    if (!slots(s.found) || !slots(s.hinted) || typeof s.finished !== 'boolean' || (!s.finished && s.found.length === 11)
      || (s.best === null ? s.finished : !Number.isInteger(s.best) || s.best < 0 || s.best > 11)
      || (s.finished && s.best! < unassistedCount(s))) return null;
    return s;
  } catch { return null; }
}

export function unassistedCount(sheet: RecallSheet) {
  return sheet.found.filter(i => !sheet.hinted.includes(i)).length;
}

export function closeRecallSheet(sheet: RecallSheet): RecallSheet {
  return { ...sheet, finished: true, best: Math.max(sheet.best ?? 0, unassistedCount(sheet)) };
}

export function recallStarter(sheet: RecallSheet, input: string): { sheet: RecallSheet; message: string } {
  if (sheet.finished) return { sheet, message: '' };
  const key = normalizeName(input);
  const matches = sheet.starters.filter(p => [p.name, ...p.aliases].some(a => normalizeName(a) === key));
  const candidates = matches.length ? matches : sheet.starters.filter(p => normalizeName(p.surname) === key
    || p.aliases.some(alias => normalizeName(alias).split(' ').at(-1) === key));
  if (candidates.length > 1) return { sheet, message: 'More than one starter fits. Try the full name.' };
  if (!candidates.length) return { sheet, message: 'No match in this starting XI. Try another name.' };
  const player = candidates[0], index = sheet.starters.indexOf(player);
  if (sheet.found.includes(index)) return { sheet, message: player.name + ' is already on your sheet.' };
  const next = { ...sheet, found: [...sheet.found, index] };
  return { sheet: next.found.length === 11 ? closeRecallSheet(next) : next, message: player.name + ' fills ' + player.position + '.' };
}
