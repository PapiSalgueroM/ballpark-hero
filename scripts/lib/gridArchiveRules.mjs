/**
 * Round 653: the rules the grid archive applies before it counts or names a
 * player. scripts/genGridArchive.mjs writes the file with these;
 * scripts/simGridArchive.mjs imports only longDate and addDays from here (the
 * calendar helpers, which decide nothing about what is printed) and carries its
 * own copy of the name rule, its own id count and its own rarest first check,
 * so a bug in dedupeById, rarestFirst, malformedName or namesToShow below
 * cannot hide itself by being shared with the fence that checks it. Measured
 * before the fence was made independent: malformedName broken to return null
 * put "_ Eldredge" back in the file and the fence, importing the same
 * function, still said 0 malformed.
 *
 * WHY THIS EXISTS. ncaa_player_stats holds 1,600 players twice: two batches of
 * the 2026-05-09 load were sent again (ids 16201 to 17400 copy 15001 to 16200,
 * and 23001 to 23400 copy 22601 to 23000, same slug and same stats). It also
 * holds three players whose first name is an underscore because the source had
 * none. The game does not care: a duplicate row is a duplicate map entry, and
 * nobody types "_ Eldredge". An archive publishes counts and names, so a
 * duplicate row became a count one too high and a name printed twice in a cell
 * (Bradley Beal twice at Florida and Started 2010 or Later), and the underscore
 * went out as a Hofstra guard.
 *
 * WHY BY ID AND NOT BY NAME. 1,697 college names belong to two different
 * players. Deduping by name would fold each pair into one and undercount every
 * cell they sit in. The id folds only rows that really are one player.
 *
 * WHAT A PLACEHOLDER NAME STILL COUNTS FOR. The player behind "_ Eldredge" is a
 * real Hofstra guard and the game accepts him, so he stays in the count. The
 * page just never prints the placeholder as his name.
 */

/** Why a name cannot be printed, or null when it can. Unicode aware, because
    Éric, Šarūnas and Ľubomír are names and "_ Ford" is not. The MLB table tells
    namesakes apart with a career span, "Alex Gonzalez (1994-2006)", so one
    trailing span in parentheses is allowed and only digits outside it count. */
export function malformedName(name) {
  const n = String(name ?? '').trim();
  if (!n) return 'is empty';
  if (n.includes('_')) return 'carries an underscore, the source placeholder for a missing name';
  const core = n.replace(/\s*\(\d{4}-\d{4}\)$/, '');
  if (!/^\p{L}/u.test(core)) return 'does not start with a letter';
  if ((core.match(/\p{L}/gu) ?? []).length < 2) return 'has fewer than two letters';
  if (/\d/.test(core)) return 'carries a digit outside a career span';
  if (/\s{2,}/.test(core)) return 'carries a double space';
  return null;
}

/** One entry per player id, the first row kept. A player with no id cannot be
    deduped, so he is reported rather than guessed at, and the generator
    refuses to write when there is one. */
export function dedupeById(players) {
  const seen = new Set();
  const kept = [];
  const duplicates = [];
  let noId = 0;
  for (const pl of players) {
    if (pl.id === undefined || pl.id === null || String(pl.id) === '') { noId += 1; continue; }
    const key = String(pl.id);
    if (seen.has(key)) { duplicates.push(pl); continue; }
    seen.add(key);
    kept.push(pl);
  }
  return { kept, duplicates, noId };
}

/* Code unit order, not localeCompare: the same data has to give the same file
   on every machine, and a locale aware sort depends on the machine. */
const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Rarest first by career games, ties by name and then id, so the same data
    always lists the same names in the same order. */
export function rarestFirst(a, b) {
  return (a.games - b.games) || byString(a.name, b.name) || byString(String(a.id), String(b.id));
}

/** The names a cell prints: the rarest `perCell` players whose names can be
    printed, each name once. Two players sharing a name would read as one man
    listed twice, so the second is skipped; the count still includes both.
    The game accepts a shared name when ANY player under it fits (pickNamesake
    in src/lib/gridEngine.ts), so a name listed for its rarer bearer is one the
    game takes; the generator checks that through the game's own lookup before
    it writes, and refuses if it ever stops being true. */
export function namesToShow(valid, perCell) {
  const out = [];
  for (const pl of valid.slice().sort(rarestFirst)) {
    if (malformedName(pl.name)) continue;
    if (out.includes(pl.name)) continue;
    out.push(pl.name);
    if (out.length >= perCell) break;
  }
  return out;
}

/** "2026-08-30" to "August 30, 2026", split from the string with a fixed month
    table and never through Date: a Date built from an ISO string is UTC
    midnight, and formatting it west of Greenwich gives the day before. The page
    carries its own copy of this so the fence does not inherit a page bug. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function longDate(iso) {
  const [y, m, d] = String(iso).split('-');
  return `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`;
}

/** Calendar arithmetic on a YYYY-MM-DD string, UTC noon so no offset moves it. */
export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
