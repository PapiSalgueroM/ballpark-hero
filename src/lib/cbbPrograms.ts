/**
 * Guess the CBB Program: one program, one row. Round 706.
 *
 * cbb_programs held three schools twice, measured 2026-09-30: "Loyola Chicago"
 * beside a dashed spelling of the same name (whose championships hint said 0
 * titles, when Loyola won in 1963), "Loyola (LA)" beside "Loyola Marymount",
 * and "Seattle" beside "Seattle University". The search offered both rows of
 * each, and picking the wrong twin of the answer was charged as a wrong guess.
 * Migration 20260930120400 deletes the extra rows; this is the same rule in
 * the browser, so the game is right before it lands and unchanged after.
 *
 * THE RULE. Two rows are one program when their names fold alike (lower case,
 * letters and digits only), or when they name the same place and the same home
 * court (region_hint folded, and mascot_hint read from its last "play at" or
 * "plays at", a leading "the" dropped, folded). Measured: exactly the three
 * pairs above, nothing else. The row kept is the one its twin lists among its
 * common names ("Loyola (LA)" lists "Loyola Marymount"), else the earliest
 * created, else the smallest id; it takes over its twin's common names that it
 * lacks, so "Seattle U" still finds Seattle. A twin dealt by cbb_daily is
 * replaced by its kept row.
 *
 * The daily pick is pool[date % pool.length] over the pool ordered by id, so
 * this shifts the daily once, the day it ships; the migration then removes
 * exactly the rows this already hides and shifts nothing.
 * scripts/simCollegeTables.mjs holds this against the live table and the
 * migration.
 */

export interface CbbProgramRowLike {
  id: string;
  school_name: string;
  common_names?: string[] | null;
  region_hint?: string | null;
  mascot_hint?: string | null;
  created_at?: string | null;
}

/** Lower case, letters and digits only. */
export function foldProgramText(s: string | null | undefined): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** The home court a mascot hint names: the text after its last "play at" or "plays at", a leading "the" dropped, folded. */
export function homeCourt(mascotHint: string | null | undefined): string {
  const court = String(mascotHint ?? '').replace(/^.*\bplays? at\s+/i, '').replace(/^the\s+/i, '');
  return foldProgramText(court);
}

/** The keys that make two rows one program: the folded name, and the folded place with the home court. */
export function programKeys(row: CbbProgramRowLike): string[] {
  const keys = [`name:${foldProgramText(row.school_name)}`];
  const place = foldProgramText(row.region_hint);
  const court = homeCourt(row.mascot_hint);
  if (place && court) keys.push(`court:${place}|${court}`);
  return keys;
}

export interface DedupedPrograms<T> {
  /** One row per program, in the order the rows arrived. */
  programs: T[];
  /** Every hidden twin's id, to the row kept in its place. */
  replacedBy: Map<string, T>;
}

export function dedupePrograms<T extends CbbProgramRowLike>(rows: T[]): DedupedPrograms<T> {
  const parent = rows.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const firstWithKey = new Map<string, number>();
  rows.forEach((row, i) => {
    for (const key of programKeys(row)) {
      const j = firstWithKey.get(key);
      if (j === undefined) firstWithKey.set(key, i);
      else parent[find(i)] = find(j);
    }
  });

  const groups = new Map<number, number[]>();
  rows.forEach((_, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), i]);
  });

  const keptRow = new Map<number, T>();
  const replacedBy = new Map<string, T>();
  for (const members of groups.values()) {
    if (members.length === 1) continue;
    const namedByTwin = (i: number) => members.some(j => j !== i
      && (rows[j].common_names ?? []).some(n => foldProgramText(n) === foldProgramText(rows[i].school_name)));
    const created = (i: number) => {
      const t = Date.parse(String(rows[i].created_at ?? ''));
      return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
    };
    const ranked = [...members].sort((a, b) =>
      Number(namedByTwin(b)) - Number(namedByTwin(a))
      || created(a) - created(b)
      || (rows[a].id < rows[b].id ? -1 : rows[a].id > rows[b].id ? 1 : 0));
    const [keep, ...hidden] = ranked;
    const names = [...(rows[keep].common_names ?? [])];
    const have = new Set(names.map(foldProgramText));
    for (const i of hidden) {
      for (const n of rows[i].common_names ?? []) {
        const f = foldProgramText(n);
        if (f && !have.has(f)) { names.push(n); have.add(f); }
      }
    }
    const kept = { ...rows[keep], common_names: names };
    keptRow.set(keep, kept);
    for (const i of hidden) {
      keptRow.set(i, kept);
      replacedBy.set(rows[i].id, kept);
    }
  }

  const programs: T[] = [];
  rows.forEach((row, i) => {
    if (replacedBy.has(row.id)) return;
    programs.push(keptRow.get(i) ?? row);
  });
  return { programs, replacedBy };
}
