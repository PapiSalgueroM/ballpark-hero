/* Round 713: the bug report queue gets a real workflow.

   Before this the admin screen had one switch per report, resolved or not, so
   "I am looking at it", "confirmed, it is real", "fixed" and "not a bug" all
   collapsed into the same two states and nothing said what happened. The
   master spec (sections 19 and 123) asks for seven statuses, four priorities,
   a note, a fix reference, and a filter by game. This module is the whole of
   that logic, kept out of the page so the harness can run it.

   The status and priority keys here are the SAME strings the check
   constraints in supabase/migrations/20260930_round_713_report_triage.sql
   accept. simReportRelay section 5 holds the two lists together, so adding a
   status here without the migration (or the other way round) goes red.

   The old `resolved` column stays and stays true to its name: a closed status
   (Fixed, Not a bug, Duplicate, Won't fix) writes resolved true, an open one
   writes false. Until the migration is applied the page still works on that
   one column, and says so. */

export type ReportStatus =
  | 'new'
  | 'investigating'
  | 'confirmed'
  | 'fixed'
  | 'not_a_bug'
  | 'duplicate'
  | 'wont_fix';

export type ReportPriority = 'critical' | 'high' | 'medium' | 'low';

export const REPORT_STATUSES: ReadonlyArray<{ key: ReportStatus; label: string; closed: boolean }> = [
  { key: 'new', label: 'New', closed: false },
  { key: 'investigating', label: 'Investigating', closed: false },
  { key: 'confirmed', label: 'Confirmed', closed: false },
  { key: 'fixed', label: 'Fixed', closed: true },
  { key: 'not_a_bug', label: 'Not a bug', closed: true },
  { key: 'duplicate', label: 'Duplicate', closed: true },
  { key: 'wont_fix', label: "Won't fix", closed: true },
];

/* Round 713 fix: what the status select may offer before the migration. A
   save then keeps only the old switch, so the two choices are the two the
   switch had, under the names it had: Open is stored as new and Closed as
   fixed, which is exactly what statusOf reads back. Offering the other five
   would let a choice snap back to one of these on the next read. */
export const REDUCED_STATUSES: ReadonlyArray<{ key: ReportStatus; label: string; closed: boolean }> = [
  { key: 'new', label: 'Open', closed: false },
  { key: 'fixed', label: 'Closed', closed: true },
];

export function statusChoices(withColumns: boolean): ReadonlyArray<{ key: ReportStatus; label: string; closed: boolean }> {
  return withColumns ? REPORT_STATUSES : REDUCED_STATUSES;
}

export const REPORT_PRIORITIES: ReadonlyArray<{ key: ReportPriority; label: string }> = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

/* What earns Critical, straight from the spec, shown on the screen so the
   call is the same every time. */
export const CRITICAL_EXAMPLES = 'wrong score, leaderboard corruption, save loss, a security hole, or a game broken for everyone';

export const NOTE_MAX = 2000;
export const FIX_REF_MAX = 200;

export type StatusFilter = 'open' | 'all' | ReportStatus;
export const ALL_GAMES = '';

export interface TriageRow {
  id: string;
  game_type: string;
  created_at: string;
  resolved: boolean;
  resolved_at: string | null;
  status?: string | null;
  priority?: string | null;
  admin_note?: string | null;
  fix_ref?: string | null;
}

const STATUS_KEYS = new Set<string>(REPORT_STATUSES.map((s) => s.key));
const PRIORITY_KEYS = new Set<string>(REPORT_PRIORITIES.map((p) => p.key));

export function isClosed(status: ReportStatus): boolean {
  return REPORT_STATUSES.some((s) => s.key === status && s.closed);
}

/* The label the screen prints. Before the migration it is the reduced name,
   so the badge and the select say the same thing. */
export function statusLabel(status: ReportStatus, withColumns = true): string {
  return statusChoices(withColumns).find((s) => s.key === status)?.label ?? status;
}

/* A row read before the migration has no status at all, so it falls back to
   what the old switch said. Once the column exists this is just the column. */
export function statusOf(row: TriageRow): ReportStatus {
  if (row.status && STATUS_KEYS.has(row.status)) return row.status as ReportStatus;
  return row.resolved ? 'fixed' : 'new';
}

export function priorityOf(row: TriageRow): ReportPriority | null {
  return row.priority && PRIORITY_KEYS.has(row.priority) ? (row.priority as ReportPriority) : null;
}

/* Whether the database has the Round 713 columns yet. PostgREST returns every
   column for select('*'), so one row is enough to tell. With no rows there is
   nothing to triage and nothing to lose by assuming yes. */
export function hasTriageColumns(rows: ReadonlyArray<TriageRow>): boolean {
  return rows.length === 0 || rows.some((r) => 'status' in r);
}

export function matchesStatus(row: TriageRow, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  const s = statusOf(row);
  if (filter === 'open') return !isClosed(s);
  return s === filter;
}

export function matchesGame(row: TriageRow, game: string): boolean {
  return game === ALL_GAMES || row.game_type === game;
}

/* Counts per filter chip, over the reports for the chosen game, so the
   numbers on the chips always add up to what is on screen. */
export function statusCounts(rows: ReadonlyArray<TriageRow>, game: string): Record<StatusFilter, number> {
  const counts = { open: 0, all: 0 } as Record<StatusFilter, number>;
  for (const s of REPORT_STATUSES) counts[s.key] = 0;
  for (const row of rows) {
    if (!matchesGame(row, game)) continue;
    const s = statusOf(row);
    counts.all += 1;
    counts[s] += 1;
    if (!isClosed(s)) counts.open += 1;
  }
  return counts;
}

/* Every game that has ever been reported, busiest open queue first. */
export function gameCounts(rows: ReadonlyArray<TriageRow>): Array<{ game: string; total: number; open: number }> {
  const byGame = new Map<string, { game: string; total: number; open: number }>();
  for (const row of rows) {
    const entry = byGame.get(row.game_type) ?? { game: row.game_type, total: 0, open: 0 };
    entry.total += 1;
    if (!isClosed(statusOf(row))) entry.open += 1;
    byGame.set(row.game_type, entry);
  }
  return [...byGame.values()].sort((a, b) => b.open - a.open || b.total - a.total || a.game.localeCompare(b.game));
}

const PRIORITY_RANK: Record<ReportPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/* Critical first, then High, Medium, Low, then the ones nobody has ranked yet;
   newest first inside each. */
export function sortForTriage<T extends TriageRow>(rows: ReadonlyArray<T>): T[] {
  const rank = (r: TriageRow) => {
    const p = priorityOf(r);
    return p ? PRIORITY_RANK[p] : 4;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at));
}

/* The write for a status change. resolved moves with it, and resolved_at keeps
   the first time a report was closed if it only moves between closed states. */
export function statusUpdate(
  row: TriageRow,
  next: ReportStatus,
  nowIso: string,
  withColumns: boolean,
): Record<string, unknown> {
  const closed = isClosed(next);
  const wasClosed = isClosed(statusOf(row));
  const resolved_at = closed ? (wasClosed && row.resolved_at ? row.resolved_at : nowIso) : null;
  return withColumns ? { status: next, resolved: closed, resolved_at } : { resolved: closed, resolved_at };
}

const clean = (value: string, max: number): string | null => {
  const t = value.trim().slice(0, max);
  return t ? t : null;
};

export function noteUpdate(note: string, fixRef: string): { admin_note: string | null; fix_ref: string | null } {
  return { admin_note: clean(note, NOTE_MAX), fix_ref: clean(fixRef, FIX_REF_MAX) };
}
