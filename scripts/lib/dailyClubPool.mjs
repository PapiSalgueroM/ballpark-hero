/* Round 1044: the dailies' club ledger, src/data/dailyClubPool.json, read,
   planned and written in one place. scripts/genDailyClubPool.mjs appends what
   planLines returns, and simDailyClubPool fails while planLines returns
   anything, so the check and the fix cannot drift apart.

   The file is { about, lines }, one line per club event, in two shapes:
     join   { club, leagueId, leagueName, from }   in the pool from that ET day
     leave  { club, leagueId, until }              closes that club's latest
                                                   open join line in the same
                                                   league from that ET day on
   Its meaning is DailyPoolLine and dailyPoolOn in src/lib/managerHotSeat.ts,
   the one reader: the pool on a day is the join lines live that day, in file
   order. It is APPEND ONLY: Manager Hot Seat's and Deadline Day's dailies are
   a pure function of the date and this file, so an edited, moved or deleted
   line re-deals days people have already played. */
import fs from 'node:fs';
import path from 'node:path';

export const LEDGER_PATH = path.join('src', 'data', 'dailyClubPool.json');
export const LEDGER_ABOUT = 'The clubs Manager Hot Seat and Deadline Day deal their dailies from. Append only, written by scripts/genDailyClubPool.mjs and never edited by hand: a daily is worked out from this file and the date, so changing, moving or removing a line re-deals days already played. A join line {club, leagueId, leagueName, from} puts a club in the pool from that Eastern day; a leave line {club, leagueId, until} closes that club\'s latest open join line from that day on. The pool on a day is the join lines live that day, in file order (dailyPoolOn in src/lib/managerHotSeat.ts). The lines dated 2000-01-01 are exactly the pool origin/main 1c10e7e5 dealt from when Round 1044 made this file. Days before it shipped were dealt from a list worked out fresh on every load, which moved whenever a league or the partial list changed, and this file cannot repair them.';

export function readLedger(root) {
  const file = path.join(root, LEDGER_PATH);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')).lines;
}

/** A join line or a leave line, its keys always in the same order. */
export function lineOf(l) {
  return 'from' in l
    ? { club: l.club, leagueId: l.leagueId, leagueName: l.leagueName, from: l.from }
    : { club: l.club, leagueId: l.leagueId, until: l.until };
}

/** One line per row, so a diff of the file shows exactly the lines appended. */
export function formatLedger(lines) {
  return `{\n  "about": ${JSON.stringify(LEDGER_ABOUT)},\n  "lines": [\n${lines.map(l => `    ${JSON.stringify(lineOf(l))}`).join(',\n')}\n  ]\n}\n`;
}

/** The latest date any line carries, so new lines stay in date order. */
export function latestDate(lines) {
  return lines.reduce((m, l) => {
    const d = 'from' in l ? l.from : l.until;
    return d > m ? d : m;
  }, '');
}

const key = c => `${c.leagueId}\u0000${c.club}`;

/**
 * The lines the ledger needs so its open lines are the engine's eligible
 * clubs: a join line for every eligible club with no open line, a leave line
 * for every open line whose club is no longer eligible. `entries` is
 * dailyPoolEntries over the ledger (the app's own reader); `eligible` is
 * hotSeatPool() without a date, in its order. Every line counts from `since`,
 * except a club rejoining before the leave line already written for it takes
 * effect, which rejoins on that leave day so it is never in twice.
 */
export function planLines({ eligible, entries, since }) {
  const latest = new Map();
  for (const e of entries) latest.set(key(e), e);
  const want = new Set(eligible.map(key));
  const out = [];
  for (const c of eligible) {
    const e = latest.get(key(c));
    if (e && e.until === null) continue;
    const from = e && e.until > since ? e.until : since;
    out.push({ club: c.club, leagueId: c.leagueId, leagueName: c.leagueName, from });
  }
  for (const [k, e] of latest) {
    if (e.until === null && !want.has(k)) out.push({ club: e.club, leagueId: e.leagueId, until: since });
  }
  return out;
}
