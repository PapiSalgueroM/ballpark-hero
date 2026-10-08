/* The pure rules of scripts/data/nfl2025Production.json (Round 1130).

   One place for what a row of that file MEANS: which fields are its headline,
   when two publishers agree, when a third one settles a dispute, and which
   numbers a rating or a printed stat may read off it. The script that writes
   the file (scripts/fetchNfl2025Production.mjs), the generator that rates on
   it (scripts/genFrontOfficeRoster.mjs) and the harness that fences it
   (scripts/simFoRatingOrder.mjs) all call these, so none of them can hold its
   own idea of "agreed". Nothing here reads a file or the network. */

/** Every field an offense row carries, in the file's own order. */
export const OFFENSE_FIELDS = ['games', 'passAtt', 'passYds', 'passTd', 'passInt', 'rushAtt', 'rushYds', 'rushTd', 'targets', 'rec', 'recYds', 'recTd'];
/** The fields that must ALL agree before a row may feed a rating or a printed stat. */
export const HEADLINE = {
  QB: ['games', 'passAtt', 'passYds', 'passTd', 'passInt', 'rushYds', 'rushTd'],
  RB: ['games', 'rushAtt', 'rushYds', 'rushTd', 'rec', 'recYds', 'recTd'],
  WR: ['games', 'rec', 'recYds', 'recTd', 'rushYds', 'rushTd'],
  TE: ['games', 'rec', 'recYds', 'recTd', 'rushYds', 'rushTd'],
  OL: ['games'],
  DL: ['games'], LB: ['games'], DB: ['games'],
};
export const OFFENSE_SHELVES = ['QB', 'RB', 'WR', 'TE'];

/** Which fields a row carries for its shelf: the whole offense line for the four skill shelves, games for the rest. */
export const fieldsFor = shelf => (OFFENSE_SHELVES.includes(shelf) ? OFFENSE_FIELDS : ['games']);

/** `agreed` and `status` from the row's own `a`, `b` and `settledBy`, and nothing else. */
export function derive(row) {
  const headline = HEADLINE[row.shelf];
  const agreed = row.a && row.b ? fieldsFor(row.shelf).filter(f => row.a[f] !== null && row.a[f] !== undefined && row.a[f] === row.b[f]) : [];
  let status = !row.a || !row.b ? 'one-source' : headline.every(f => agreed.includes(f)) ? 'agree' : 'disagree';
  if (status === 'disagree' && settledSide(row, agreed)) status = 'settled';
  return { agreed, status };
}

/** Which publisher a third source sided with on a disputed row, or null. It must print every headline
    field the two dispute and agree with ONE of them on all of those, and nothing it prints may contradict
    that publisher anywhere else on the headline list. A field it leaves blank (a league page prints no
    rushing line for a receiver who never carried) is covered only when the two publishers already agree
    on it: a blank is never read as a zero. */
export function settledSide(row, agreed = derive({ ...row, settledBy: undefined }).agreed) {
  const v = row.settledBy?.values;
  if (!v || !row.a || !row.b) return null;
  for (const side of [row.a, row.b]) {
    if (HEADLINE[row.shelf].every(f => (Number.isFinite(v[f]) ? v[f] === side[f] : agreed.includes(f)))) return side;
  }
  return null;
}

/** The numbers a rating or a printed stat may read off a row, or null when the row may feed nothing.
    An agreed row gives its agreed fields; a settled row gives the headline fields of the publisher the
    third source sided with, plus whatever else the two publishers agree on. A field outside that set is
    simply absent. */
export function usable(row) {
  if (row.status === 'agree') return Object.fromEntries(row.agreed.map(f => [f, row.a[f]]));
  if (row.status === 'settled') {
    const side = settledSide(row, row.agreed);
    if (!side) return null;
    const out = Object.fromEntries(row.agreed.map(f => [f, row.a[f]]));
    for (const f of HEADLINE[row.shelf]) out[f] = side[f];
    return out;
  }
  return null;
}

/** The headline opportunity count both publishers print: pass attempts, carries plus catches, catches. */
export function workloadOf(shelf, u) {
  if (!u) return null;
  if (shelf === 'QB') return u.passAtt ?? null;
  if (shelf === 'RB') return u.rushAtt == null || u.rec == null ? null : u.rushAtt + u.rec;
  if (shelf === 'WR' || shelf === 'TE') return u.rec ?? null;
  return null;
}

/** A usable line on the fantasy basis the selection rule has always used (the generator's skillScore), as a
    season total: passing yards / 25 + passing touchdowns x 4 + rushing yards / 10 + rushing touchdowns x 6 +
    catches x 0.5 + receiving yards / 10 + receiving touchdowns x 6. A field the line does not hold adds nothing. */
export function productionScore(u) {
  const n = f => (Number.isFinite(u?.[f]) ? u[f] : 0);
  return n('passYds') / 25 + n('passTd') * 4 + n('rushYds') / 10 + n('rushTd') * 6 + n('rec') * 0.5 + n('recYds') / 10 + n('recTd') * 6;
}

/** The offense layer's production Map from the file's rows: record key to { games, score }, agreed and settled
    rows of the four skill shelves only. A disputed or one source row is not in the Map. */
export function productionMap(rows) {
  const out = new Map();
  for (const row of rows) {
    if (!OFFENSE_SHELVES.includes(row.shelf)) continue;
    const u = usable(row);
    if (!u || !Number.isFinite(u.games)) continue;
    out.set(row.key, { games: u.games, score: productionScore(u), workload: workloadOf(row.shelf, u) });
  }
  return out;
}
