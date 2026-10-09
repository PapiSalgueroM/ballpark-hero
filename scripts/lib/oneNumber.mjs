/* One man, one number: the sport neutral comparer (Round 1130, decision 10).

   Two games that show the same real man should print the same rating for him.
   This takes any number of lists of { game, club, name, number } and says, for
   every (club, name) that more than one row names, whether the rows agree. It
   knows nothing about a sport: NFL Front Office against NFL Conquest reads it
   in scripts/simFoRatingOrder.mjs, and the same call measures the NBA pair
   there, printed only, as the "from" for whichever round unifies it.

   A man is matched on club and name. Two different men who share a name on
   one club would be read as one, so a caller that can key more finely (the
   NFL files carry a position on every row) does that itself and uses this for
   the cross game comparison, where a name and a club are all both sides hold. */

/** @param {{ game: string, club: string, name: string, number: number }[][]} lists */
export function compareNumbers(lists) {
  const seen = new Map();
  for (const list of lists) for (const row of list) {
    const key = `${row.club}|${row.name}`;
    seen.set(key, [...(seen.get(key) ?? []), row]);
  }
  const twoNumbers = [], sameNumber = [];
  for (const [key, rows] of seen) {
    if (new Set(rows.map(r => r.game)).size < 2) continue;
    (new Set(rows.map(r => r.number)).size > 1 ? twoNumbers : sameNumber).push({ key, rows });
  }
  return { men: seen.size, twoNumbers, sameNumber };
}

/** Rows of one game that name a man another game holds on a DIFFERENT club, and rows it holds nowhere. */
export function strangers(rows, reference) {
  const clubsOf = new Map();
  for (const r of reference) clubsOf.set(r.name, [...(clubsOf.get(r.name) ?? []), r.club]);
  const elsewhere = [], nowhere = [];
  for (const r of rows) {
    const clubs = clubsOf.get(r.name);
    if (!clubs) nowhere.push(r);
    else if (!clubs.includes(r.club)) elsewhere.push({ ...r, on: clubs.join('/') });
  }
  return { elsewhere, nowhere };
}
