/**
 * Works around the Supabase REST API's 1,000-row response cap.
 *
 * Any .select() (even with a bigger .limit()) is silently truncated to 1,000
 * rows by PostgREST's max-rows setting. That bug cut career_seasons (~2,700
 * rows) down to 1,000, leaving most Career Quiz players with empty careers -
 * and dropped the 12 hand-crafted Connections puzzles (rows 1,001-1,012).
 *
 * This helper pages through the query with .range() until a short page
 * arrives, so callers get every row. The query passed in MUST have a
 * deterministic .order() (ideally on a unique column or column pair), or
 * pages can overlap/skip.
 */

const PAGE_SIZE = 1000;
const RETRIES = 2;

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  maxRows?: number,
): Promise<{ data: T[]; error: unknown }> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let { data, error } = await page(from, from + PAGE_SIZE - 1);
    /* ROUND 359: one page failing must not cost the whole read.
       Paging turns a single read into ten or twenty separate queries, so it
       multiplies the chance of meeting a transient by the number of pages, and
       the database does cancel these under load (Postgres 57014, statement
       timeout). Before this, one cancelled page anywhere in the sequence meant
       the caller got an error and the visitor got an unplayable game, silently.
       Found in Round 358 in the three franchise grids, which page by hand;
       nine more libs page through here.
       Retry the SAME range, because nothing has been appended for this page
       yet, so a retry cannot duplicate or skip a row. A page that fails every
       attempt still returns its error: a database that is genuinely down has to
       surface rather than be retried forever. */
    for (let attempt = 1; attempt <= RETRIES && error; attempt++) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
      ({ data, error } = await page(from, from + PAGE_SIZE - 1));
    }
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    if (maxRows !== undefined && all.length >= maxRows) break;
  }
  if (maxRows !== undefined && all.length > maxRows) all.length = maxRows;
  return { data: all, error: null };
}

/**
 * ROUND 821: the same read with its first pages asked for at once.
 *
 * The Perfect Season wheels read 1,000 to 15,000 rows when a game opens, and
 * a page at a time costs one round trip per page before the wheel can spin.
 * The NBA wheel had always fetched a fixed fifteen pages in parallel instead,
 * which is fast but stops at 15,000 rows whatever the table holds: it was 278
 * rows from silently dropping the oldest seasons. The MLB and NHL wheels made
 * one request and got the server's first 1,000 rows (the MLB wheel never left
 * 1901 to 1962). This asks for the first `firstPages` pages together, keeps
 * reading one page at a time while the last one came back full, and stops at
 * the first short page, so it is as fast as the old parallel read when the
 * guess is right and still complete when the table outgrows it. Same rules as
 * fetchAllRows: a deterministic .order(), the same retries on a failed page,
 * and an error (with the rows before it) when a page fails every attempt.
 *
 * ROUND 1145: `maxRows`, as fetchAllRows has it, for a caller that wants the
 * top N of an ordered table rather than all of it (Dart Draft's pool is the
 * top 2,000 of 5,865). The read stops once it holds that many and never asks
 * for a page past them.
 */
export async function fetchAllRowsParallel<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  firstPages: number,
  maxRows?: number,
): Promise<{ data: T[]; error: unknown }> {
  const fetchPage = async (i: number) => {
    const from = i * PAGE_SIZE;
    let { data, error } = await page(from, from + PAGE_SIZE - 1);
    for (let attempt = 1; attempt <= RETRIES && error; attempt++) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
      ({ data, error } = await page(from, from + PAGE_SIZE - 1));
    }
    return { data, error };
  };
  const all: T[] = [];
  const first = await Promise.all(Array.from({ length: Math.max(1, firstPages) }, (_, i) => fetchPage(i)));
  for (let i = 0; ; i++) {
    const { data, error } = i < first.length ? first[i] : await fetchPage(i);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    if (maxRows !== undefined && all.length >= maxRows) break;
  }
  if (maxRows !== undefined && all.length > maxRows) all.length = maxRows;
  return { data: all, error: null };
}
