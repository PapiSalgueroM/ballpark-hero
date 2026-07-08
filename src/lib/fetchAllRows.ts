/**
 * Works around the Supabase REST API's 1,000-row response cap.
 *
 * Any .select() (even with a bigger .limit()) is silently truncated to 1,000
 * rows by PostgREST's max-rows setting. That bug cut career_seasons (~2,700
 * rows) down to 1,000 — leaving most Career Quiz players with empty careers —
 * and dropped the 12 hand-crafted Connections puzzles (rows 1,001-1,012).
 *
 * This helper pages through the query with .range() until a short page
 * arrives, so callers get every row. The query passed in MUST have a
 * deterministic .order() (ideally on a unique column or column pair), or
 * pages can overlap/skip.
 */

const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  maxRows?: number,
): Promise<{ data: T[]; error: unknown }> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    if (maxRows !== undefined && all.length >= maxRows) break;
  }
  if (maxRows !== undefined && all.length > maxRows) all.length = maxRows;
  return { data: all, error: null };
}
