/* Round 1584: the namesake detection, in plain JS. It computes on an array of
 * player_market_values rows exactly what scripts/qa/clubNamesakes1584Detect.sql
 * computes on the table, and scripts/qa/rehearseClubNamesakes1584.mjs runs both
 * over the same rows in PGlite and requires them to agree.
 *
 * A namesake merge puts two squads from two football worlds under one club
 * string ("Arsenal FC" holding London's squad and Arsenal de Sarandí's). The
 * table has no league column, so it is seen two ways:
 *   S1, TWO SQUADS IN ONE: the largest club year of its year, at least 5 rows
 *       above the second largest. Sized from every row, nationality or not.
 *   S2, THE CHEAP FOREIGN BLOC: in a club year of 12 or more rows that carry a
 *       nationality, a nationality bloc of 3 or more whose most valuable man is
 *       still below the lower quartile of the rest of the squad (6 or more
 *       rows). A club buys its foreign bloc at its own prices; a merged club's
 *       second squad lives in another market.
 * It is a CANDIDATE LIST for a person, never a verdict: Emiliano Martinez sits
 * in Arsenal FC's Argentine bloc in 2016 and 2017 and played for London.
 *
 * WHAT IT CANNOT SEE: a namesake valued like its host (two clubs of one
 * market), a merge whose bloc is under 3 in every year, a merge of two clubs
 * of one nationality unless S1 catches its size, and anything in "A / B" split
 * season rows (left out of the club years, as the SQL leaves them out).
 *
 * The quartile and the median are percentile_cont's, interpolated, never an
 * index pick: on a borderline bloc the two differ. Pure: imports nothing. */

export const DETECT_RULES = { minClubYear: 12, minBloc: 3, minRest: 6, s1Margin: 5 };

const SKIP_CLUB = /^(retired|without club|unknown|career break)/;

/* Postgres percentile_cont over values sorted ascending. */
export function percentileCont(sortedAsc, p) {
  if (!sortedAsc.length) return null;
  const pos = p * (sortedAsc.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sortedAsc[lo] + (pos - lo) * (sortedAsc[hi] - sortedAsc[lo]);
}

function usable(r) {
  return r.club != null && r.market_value_usd != null && r.year != null
    && !SKIP_CLUB.test(String(r.club).toLowerCase()) && !String(r.club).includes(' / ');
}

/* rows: { club, year, nationality, player_name, market_value_usd }. Returns the
   S2 rows then the S1 rows, the same columns the SQL returns, names as an array
   (most valuable first) because the SQL's string order among equal values is
   not defined. */
export function detectNamesakes(rows, rules = DETECT_RULES) {
  const all = new Map();
  const withNat = new Map();
  for (const r of rows) {
    if (!usable(r)) continue;
    const key = `${r.year}\u0001${r.club}`;
    if (!all.has(key)) all.set(key, { club: r.club, year: Number(r.year), n: 0 });
    all.get(key).n += 1;
    if (r.nationality == null) continue;
    if (!withNat.has(key)) withNat.set(key, { club: r.club, year: Number(r.year), rows: [] });
    withNat.get(key).rows.push({ v: Number(r.market_value_usd), nat: r.nationality, p: r.player_name });
  }

  /* S1 sizes: rank within the year by row count, and the margin to the second
     largest count of that year (nth_value 2, so a tie at the top is margin 0). */
  const byYear = new Map();
  for (const cy of all.values()) {
    if (!byYear.has(cy.year)) byYear.set(cy.year, []);
    byYear.get(cy.year).push(cy);
  }
  const sized = new Map();
  for (const list of byYear.values()) {
    const counts = list.map(c => c.n).sort((a, b) => b - a);
    const second = counts.length > 1 ? counts[1] : null;
    for (const c of list) {
      const rank = 1 + counts.filter(n => n > c.n).length;
      sized.set(`${c.year}\u0001${c.club}`, { size_rank: rank, size_margin: second == null ? null : c.n - second });
    }
  }

  const s2 = [];
  for (const [key, cy] of withNat) {
    const n = cy.rows.length;
    if (n < rules.minClubYear) continue;
    const nats = new Map();
    for (const x of cy.rows) {
      if (!nats.has(x.nat)) nats.set(x.nat, []);
      nats.get(x.nat).push(x);
    }
    for (const [nat, bloc] of nats) {
      if (bloc.length < rules.minBloc) continue;
      const rest = cy.rows.filter(x => x.nat !== nat).map(x => x.v).sort((a, b) => a - b);
      if (rest.length < rules.minRest) continue;
      const blocVs = bloc.map(x => x.v).sort((a, b) => a - b);
      const blocMax = blocVs[blocVs.length - 1];
      const restQ1 = percentileCont(rest, 0.25);
      if (!(blocMax < restQ1)) continue;
      s2.push({
        signal: 'S2', club: cy.club, year: cy.year, n, size_rank: sized.get(key).size_rank, nat, k: bloc.length,
        bloc_max: blocMax, bloc_med: percentileCont(blocVs, 0.5), rest_q1: restQ1, rest_med: percentileCont(rest, 0.5),
        names: bloc.slice().sort((a, b) => b.v - a.v).map(x => x.p),
      });
    }
  }
  const s1 = [];
  for (const [key, cy] of all) {
    const s = sized.get(key);
    if (s.size_rank === 1 && s.size_margin != null && s.size_margin >= rules.s1Margin) {
      s1.push({ signal: 'S1', club: cy.club, year: cy.year, n: cy.n, size_rank: 1, nat: null, k: null,
        bloc_max: null, bloc_med: null, rest_q1: null, rest_med: null, names: null });
    }
  }
  const order = (a, b) => (b.k ?? -1) - (a.k ?? -1) || a.year - b.year || (a.club < b.club ? -1 : a.club > b.club ? 1 : 0)
    || (a.nat < b.nat ? -1 : a.nat > b.nat ? 1 : 0);
  return [...s2.sort(order), ...s1.sort(order)];
}
