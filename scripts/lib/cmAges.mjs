/**
 * Ages for Club Manager's 2026 squads, one rule, and how sure each one is.
 * Measured and written in Round 1102; Round 1214 (part one of four) lands it as a
 * library that NOTHING SHIPPED READS YET. The bake starts reading it in the round
 * that re-rates the 2026 files.
 *
 * THE APP IMPORTS THIS FILE (src/lib/cmAgeRead.ts takes ERA_RATING_AGE_SHIFT), so it
 * stays pure: no import, no node module, no network, no file read, no clock.
 * src/test/cmValueCurve.test.ts fails the day an import statement appears.
 *
 * WHAT IS WRONG TODAY. The value table has no birth date column. A bulk row holds the
 * man's age on 1 January of the row's year, the game says August, so most men ship a
 * year young.
 *
 * THE RULE, augustAge2026(row, births), the first case that fits:
 *   1. "born"    a birth date is on file FOR THIS MAN (same name AND the ledger's club is the club
 *                he is baked at or the club of his table row): his exact age on 1 August 2026.
 *   2. "moved"   a bulk row (id under HAND_WRITTEN_FROM_ID): the table's age plus one for a 2026
 *                row, plus two for a 2025 row. Right for the men born 1 January to 1 August, about
 *                seven in ten of them, and one year over for the rest. Today the same seven in
 *                ten are a year young.
 *   3. "written" a row written by hand during 2026: the age as written (the age on the day it was
 *                written, which is right for August for most).
 *   4. "unknown" no table row at all (a transfer overlay add): the age as typed. The bake prints
 *                every such man and refuses to write a file with one in it.
 *
 * WHAT IT STANDS ON, measured 2026-10-07 on the lead's dump of the table (11,631 rows):
 *   - bulk ids run 1 to 166,766 and hand written ids start at 176,416, with nothing between. A row
 *     inside that gap means the table changed shape, so the boundary is measured again and never
 *     guessed: the function throws.
 *   - scripts/data/defensiveMidfield2026.json (Round 669) holds a birth date for 413 men and says its
 *     366 written rows carry the age on 2026-01-01; 257 of them (70.2 percent) are a year older on
 *     2026-08-01.
 *
 * The birth dates come from three committed ledgers, read where they lie and never copied:
 * scripts/data/cmBirthDates2026.json (two publishers of two different kinds a man, neither a
 * wiki), the Round 669 ledger above and scripts/data/window2026/missingPlayers.json. buildBirths
 * joins them and fails closed when two of them disagree about one man. A row of the birth date
 * ledger marked `thin` (it could not be given a second independent source) is LEFT OUT here, so
 * the man falls back to the table rule and nothing downstream reads a thin date.
 */

/** The day every 2026 squad's ages are for. */
export const AGES_AS_OF = '2026-08-01';
/** Ids at or above this were written by hand in 2026; ids under it are the bulk import. */
export const HAND_WRITTEN_FROM_ID = 170000;
/** The measured gap between the two kinds of row (2026-10-07). A row inside it is fatal. */
export const ID_GAP_FROM = 167000;
export const ID_GAP_TO = 176415;
/** A birth date further than this from the table's age is another man of the same name. */
export const NAMESAKE_YEARS = 2;
/** The four past seasons ship the table's 1 January age and are RATED one year on, at that season's
 *  August, the same reading the 2026 squads get. One constant, so the engine and every harness
 *  agree. Known wart, kept on purpose: a man born from August to December is read a year older
 *  than he was on the day that season opened. The round that gives the past seasons real August
 *  ages removes it. */
export const ERA_RATING_AGE_SHIFT = 1;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The days a month holds, worked out by hand: this file may not read a clock or build a Date. */
function daysIn(year, month) {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}
const onCalendar = (year, month, day) => year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysIn(year, month);

/** Whole years between a birth date and a day, both 'YYYY-MM-DD'. Throws on anything else: a text
 *  that is not that shape, a day no calendar holds (30 February, 31 April, 29 February of a year
 *  that has none) and a birth date AFTER the day it is asked about. buildBirths runs every ledger
 *  date through here, so a typing slip in a ledger stops the join instead of being read. */
export function ageOn(born, isoDate) {
  const b = ISO.exec(String(born));
  const d = ISO.exec(String(isoDate));
  if (!b || !d) throw new Error(`ageOn: both dates must read YYYY-MM-DD (got born ${born}, day ${isoDate})`);
  const [by, bm, bd] = [Number(b[1]), Number(b[2]), Number(b[3])];
  const [y, m, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  if (!onCalendar(by, bm, bd) || !onCalendar(y, m, day)) {
    throw new Error(`ageOn: not a calendar date (got born ${born}, day ${isoDate})`);
  }
  let age = y - by;
  if (m < bm || (m === bm && day < bd)) age -= 1;
  if (age < 0) throw new Error(`ageOn: the birth date is after the day (got born ${born}, day ${isoDate})`);
  return age;
}

/**
 * Join the three ledgers into one map: name -> [{ born, clubs, from }].
 *   ledgerRows   scripts/data/cmBirthDates2026.json rows: { name, club (engine spelling), born, thin? }
 *   round669     scripts/data/defensiveMidfield2026.json, whole
 *   missing      scripts/data/window2026/missingPlayers.json, whole (an array)
 *   dbToEngine   the table's club spelling -> the engine's (scripts/lib/dbClubNames.mjs)
 * `clubs` is the set of engine clubs the ledger ties the date to. A table club the game does not
 * model maps to nothing, so that date can match nobody. Two ledgers that give one man (same name,
 * a club in common) two dates are fatal. A ledger row marked thin is not read at all.
 */
export function buildBirths({ ledgerRows = [], round669 = null, missing = [], dbToEngine = {} } = {}) {
  const births = new Map();
  const add = (name, born, clubs, from) => {
    const key = String(name ?? '').trim();
    if (!key) throw new Error(`buildBirths: a ${from} row has no name`);
    if (!ISO.test(String(born))) throw new Error(`buildBirths: ${key} (${from}) has a birth date that is not YYYY-MM-DD: ${born}`);
    try { ageOn(born, AGES_AS_OF); } catch (slip) { throw new Error(`buildBirths: ${key} (${from}): ${slip.message}`); }
    const set = new Set(clubs.filter(Boolean));
    const list = births.get(key) ?? [];
    for (const other of list) {
      const shared = [...set].some(c => other.clubs.has(c));
      if (shared && other.born !== born) {
        throw new Error(`buildBirths: two birth dates for ${key} at ${[...set].join(', ')}: ${other.born} (${other.from}) and ${born} (${from})`);
      }
    }
    list.push({ born, clubs: set, from });
    births.set(key, list);
  };
  if (round669) {
    const tied = new Map();
    const loose = [];
    /* A checked row stores the club the table had BEFORE the round corrected it ("Without Club"
       for four men); the correction's `to` is the club the table holds now. Both are tried. */
    const correctedClub = new Map();
    for (const c of round669.corrections ?? []) {
      if (c?.field === 'club' && c.to) correctedClub.set(String(c.name).trim(), c.to);
    }
    const clubsOf = {
      write: x => [x.club],
      existingChecked: x => [x.stored?.club, correctedClub.get(String(x.name).trim())],
      corrections: x => [x.club, x.stored?.club],
    };
    for (const part of ['write', 'existingChecked', 'corrections']) {
      for (const x of round669[part] ?? []) {
        const born = x?.fotmob?.born;
        if (!born) continue;
        const tableClubs = clubsOf[part](x).filter(Boolean);
        if (!tableClubs.length) { loose.push({ name: String(x.name).trim(), born, part }); continue; }
        add(x.name, born, tableClubs.map(c => dbToEngine[c]), `the Round 669 ledger, ${part}`);
        tied.set(`${String(x.name).trim()}|${born}`, true);
      }
    }
    /* A Round 669 row that carries a date and no club (an age correction) is the same man as a
       row that carries both, or it is fatal: a date tied to no club could land on a namesake. */
    for (const l of loose) {
      if (!tied.has(`${l.name}|${l.born}`)) {
        throw new Error(`buildBirths: the Round 669 ledger's ${l.part} row for ${l.name} has a birth date and no club, and no other row of his carries the same date`);
      }
    }
  }
  for (const x of missing ?? []) {
    if (!x?.born) continue;
    add(x.name, x.born, [x.to, dbToEngine[x.db]], 'the window ledger of missing players');
  }
  for (const x of ledgerRows ?? []) {
    if (x?.thin) continue;
    add(x.name, x.born, [x.club], 'the birth date ledger');
  }
  return births;
}

/** What the table alone says about a man's age on 1 August 2026: cases 2 to 4 of the rule. */
export function tableAugustAge({ name, age, year, id }) {
  if (!Number.isInteger(age)) throw new Error(`augustAge2026: ${name} has no whole number age (got ${age})`);
  if (id === undefined || id === null) return { age, basis: 'unknown' };
  if (!Number.isInteger(id) || id < 1) throw new Error(`augustAge2026: ${name} has a row id that is not a positive whole number (got ${id})`);
  if (id >= ID_GAP_FROM && id <= ID_GAP_TO) {
    throw new Error(`augustAge2026: ${name} has row id ${id}, inside the gap ${ID_GAP_FROM} to ${ID_GAP_TO} that held no row when the rule was measured. The table changed shape: measure the boundary again before baking`);
  }
  if (id < HAND_WRITTEN_FROM_ID) {
    if (year !== 2025 && year !== 2026) throw new Error(`augustAge2026: ${name} has a bulk row of year ${year}; the rule knows 2025 and 2026 only`);
    return { age: age + (2026 - year) + 1, basis: 'moved' };
  }
  if (year !== 2026) throw new Error(`augustAge2026: ${name} has a hand written row of year ${year}; every hand written row measured was a 2026 row`);
  return { age, basis: 'written' };
}

/**
 * A man's age on 1 August 2026 and how it is known.
 *   row     { name, club, tableClub, age, year, id }: club is the engine club he is BAKED at (after
 *           the overlay and the roster ledger moved him), tableClub the engine club of his table
 *           row, age the table's age (or the age typed on an overlay add), id undefined when he has
 *           no table row.
 *   births  the map buildBirths returns.
 * Returns { age, basis, born?, note? }. `note` is set when a date is on file for his NAME at a club
 * that is neither of his: it is another man's, the table rule stands, and the caller prints it.
 * Throws when a date tied to one of his clubs sits more than NAMESAKE_YEARS from the table's age.
 */
export function augustAge2026(row, births) {
  const table = tableAugustAge(row);
  const cands = births?.get(String(row.name ?? '').trim()) ?? [];
  const mine = cands.filter(c => c.clubs.has(row.club) || (row.tableClub && c.clubs.has(row.tableClub)));
  if (mine.length) {
    const dates = [...new Set(mine.map(c => c.born))];
    if (dates.length > 1) throw new Error(`augustAge2026: ${row.name} at ${row.club} matches two birth dates: ${dates.join(' and ')}`);
    const age = ageOn(dates[0], AGES_AS_OF);
    if (Math.abs(age - table.age) > NAMESAKE_YEARS) {
      throw new Error(`augustAge2026: ${row.name} at ${row.club} is ${table.age} by his table row (${table.basis}, id ${row.id ?? 'none'}) and ${age} by the birth date ${dates[0]} from ${mine[0].from}: more than ${NAMESAKE_YEARS} years apart, so the date is a namesake's or the row is`);
    }
    return { age, basis: 'born', born: dates[0] };
  }
  if (cands.length) {
    const where = [...new Set(cands.flatMap(c => [...c.clubs]))].join(', ') || 'a club the game does not model';
    return { ...table, note: `a birth date is on file for the name ${row.name} at ${where}, not at ${row.club}${row.tableClub && row.tableClub !== row.club ? ` or ${row.tableClub}` : ''}: another man's, so the table's age stands` };
  }
  return table;
}
