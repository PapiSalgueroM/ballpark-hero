import { COMPETITIONS, buildRound, fetchCompetitionRows, type ChampRound, type ChampRow } from '@/lib/champOrNot';

export const RUGBY_ROUNDS = 10;
const RUGBY_KEYS = ['nrl', 'dallym'] as const;

export async function fetchRugbyLeagueRows(): Promise<Map<string, ChampRow[]>> {
  const entries = await Promise.all(RUGBY_KEYS.map(async key => {
    const def = COMPETITIONS.find(comp => comp.key === key)!;
    return [key, await fetchCompetitionRows(def)] as const;
  }));
  return new Map(entries);
}

export function buildRugbyLeagueRun(rowsByKey: ReadonlyMap<string, ChampRow[]>, seed: string): ChampRound[] | null {
  const categories: ChampRound[][] = [];
  for (const key of RUGBY_KEYS) {
    const rows = (rowsByKey.get(key) ?? []).filter(row => Number.isInteger(row.year) && row.year <= 2025 && row.team.trim().length >= 3);
    if (rows.length < 8 || new Set(rows.map(row => row.year)).size < RUGBY_ROUNDS / 2) return null;
    const def = COMPETITIONS.find(comp => comp.key === key)!;
    const selected: ChampRound[] = [];
    const years = new Set<number>();
    // Keep the full bank in each draw so tied winners remain true and decoys stay outside the tie.
    for (let attempt = 0; attempt < 256 && selected.length < RUGBY_ROUNDS / 2; attempt += 1) {
      const round = buildRound(def, rows, `${seed}:rugby:${key}:${attempt}`);
      if (round && !years.has(round.year)) {
        years.add(round.year);
        selected.push(round);
      }
    }
    if (selected.length !== RUGBY_ROUNDS / 2) return null;
    categories.push(selected);
  }
  return Array.from({ length: RUGBY_ROUNDS }, (_, index) => categories[index % 2][Math.floor(index / 2)]);
}
