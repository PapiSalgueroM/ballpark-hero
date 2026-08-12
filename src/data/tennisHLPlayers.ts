/**
 * Tennis Higher/Lower pool, career GRAND SLAM SINGLES TITLES.
 *
 * Source: public.tennis_grand_slam_winners (Supabase), aggregated per champion
 * with "(N)"/"†" noise stripped, verified 2026-07-21. Current through the
 * 2026 Australian Open (French/Wimbledon 2026 rows are null in the source).
 *
 * Name-variant merges applied (the table records married names inconsistently):
 *   - Margaret Court     = "Margaret Smith" 11 + "Margaret Court" 13      = 24 ✓
 *   - Helen Wills        = "Helen Wills" 9 + "Helen Wills Moody" 5
 *                          + "Helen Moody" 5                              = 19 ✓
 *   - Margaret Osborne duPont = "Margaret Osborne" 4 + "…duPont" 2        =  6 ✓
 * All three merged totals match the canonical record exactly.
 *
 * Deliberately EXCLUDED (do not re-add without resolving):
 *   - Suzanne Lenglen, table counts 12 (incl. pre-1925 closed French);
 *     the commonly cited figure is 8. Disputed either way.
 *   - Henri Cochet, table counts 8 incl. the 1922 World Hard Court title;
 *     usually cited as 7.
 *   - Evonne Goolagong, canonical 7, but the table is keyed one slam per
 *     year and drops the SECOND 1977 Australian Open (Dec edition), so it
 *     says 6. Wrong number either way you bake it.
 *   - Everyone whose slam career started before 1920 (challenge-round /
 *     closed-era titles: Decugis, Sears, Renshaw, Larned, Doherty, Wilding,
 *     Mallory…), counting conventions for that era are all disputed.
 *
 * Anchors verified vs canonical: Djokovic 24, Court 24, Serena 23, Nadal 22,
 * Graf 22, Federer 20, Wills 19, Evert/Navratilova 18, Sampras 14.
 * Active players (Alcaraz, Sinner, Świątek, Sabalenka) are snapshots through
 * AO 2026 and will need a re-bake after future slams.
 *
 * NOTE: this pool intentionally mixes men's and women's champions, the axis
 * is total major titles, and cross-tour matchups (Serena 23 vs Federer 20)
 * are the fun ones. Ties (24/24, 22/22, 18/18…) are common; the HL hooks
 * score a tie as correct for either pick.
 */
export interface TennisHLPlayer {
  name: string;
  /** Career Grand Slam singles titles (through AO 2026 for active players). */
  slams: number;
  /** Year of first slam title. */
  firstYear: number;
  /** Year of most recent slam title. */
  lastYear: number;
  /** Tour: men's or women's singles. */
  tour: 'M' | 'W';
}

export const tennisHLPlayers: TennisHLPlayer[] = [
  // ── 20+ club ─────────────────────────────────────────────────────────
  { name: 'Novak Djokovic', slams: 24, firstYear: 2008, lastYear: 2023, tour: 'M' },
  { name: 'Margaret Court', slams: 24, firstYear: 1960, lastYear: 1973, tour: 'W' },
  { name: 'Serena Williams', slams: 23, firstYear: 1999, lastYear: 2017, tour: 'W' },
  { name: 'Rafael Nadal', slams: 22, firstYear: 2005, lastYear: 2022, tour: 'M' },
  { name: 'Steffi Graf', slams: 22, firstYear: 1987, lastYear: 1999, tour: 'W' },
  { name: 'Roger Federer', slams: 20, firstYear: 2003, lastYear: 2018, tour: 'M' },
  // ── 10–19 ───────────────────────────────────────────────────────────
  { name: 'Helen Wills', slams: 19, firstYear: 1923, lastYear: 1938, tour: 'W' },
  { name: 'Chris Evert', slams: 18, firstYear: 1974, lastYear: 1986, tour: 'W' },
  { name: 'Martina Navratilova', slams: 18, firstYear: 1978, lastYear: 1990, tour: 'W' },
  { name: 'Pete Sampras', slams: 14, firstYear: 1990, lastYear: 2002, tour: 'M' },
  { name: 'Roy Emerson', slams: 12, firstYear: 1961, lastYear: 1967, tour: 'M' },
  { name: 'Billie Jean King', slams: 12, firstYear: 1966, lastYear: 1975, tour: 'W' },
  { name: 'Björn Borg', slams: 11, firstYear: 1974, lastYear: 1981, tour: 'M' },
  { name: 'Rod Laver', slams: 11, firstYear: 1960, lastYear: 1969, tour: 'M' },
  { name: 'Bill Tilden', slams: 10, firstYear: 1920, lastYear: 1930, tour: 'M' },
  // ── 6–9 ─────────────────────────────────────────────────────────────
  { name: 'Monica Seles', slams: 9, firstYear: 1990, lastYear: 1996, tour: 'W' },
  { name: 'Maureen Connolly', slams: 9, firstYear: 1951, lastYear: 1954, tour: 'W' },
  { name: 'Andre Agassi', slams: 8, firstYear: 1992, lastYear: 2003, tour: 'M' },
  { name: 'Jimmy Connors', slams: 8, firstYear: 1974, lastYear: 1983, tour: 'M' },
  { name: 'Ivan Lendl', slams: 8, firstYear: 1984, lastYear: 1990, tour: 'M' },
  { name: 'Fred Perry', slams: 8, firstYear: 1933, lastYear: 1936, tour: 'M' },
  { name: 'Ken Rosewall', slams: 8, firstYear: 1953, lastYear: 1972, tour: 'M' },
  { name: 'Carlos Alcaraz', slams: 7, firstYear: 2022, lastYear: 2026, tour: 'M' },
  { name: 'John McEnroe', slams: 7, firstYear: 1979, lastYear: 1984, tour: 'M' },
  { name: 'John Newcombe', slams: 7, firstYear: 1967, lastYear: 1975, tour: 'M' },
  { name: 'Mats Wilander', slams: 7, firstYear: 1982, lastYear: 1988, tour: 'M' },
  { name: 'René Lacoste', slams: 7, firstYear: 1925, lastYear: 1929, tour: 'M' },
  { name: 'Justine Henin', slams: 7, firstYear: 2003, lastYear: 2007, tour: 'W' },
  { name: 'Venus Williams', slams: 7, firstYear: 2000, lastYear: 2008, tour: 'W' },
  { name: 'Maria Bueno', slams: 7, firstYear: 1959, lastYear: 1966, tour: 'W' },
  { name: 'Boris Becker', slams: 6, firstYear: 1985, lastYear: 1996, tour: 'M' },
  { name: 'Stefan Edberg', slams: 6, firstYear: 1985, lastYear: 1992, tour: 'M' },
  { name: 'Don Budge', slams: 6, firstYear: 1937, lastYear: 1938, tour: 'M' },
  { name: 'Jack Crawford', slams: 6, firstYear: 1931, lastYear: 1935, tour: 'M' },
  { name: 'Iga Świątek', slams: 6, firstYear: 2020, lastYear: 2025, tour: 'W' },
  { name: 'Doris Hart', slams: 6, firstYear: 1949, lastYear: 1955, tour: 'W' },
  { name: 'Louise Brough', slams: 6, firstYear: 1947, lastYear: 1955, tour: 'W' },
  { name: 'Margaret Osborne duPont', slams: 6, firstYear: 1946, lastYear: 1950, tour: 'W' },
  // ── modern stars below the legacy cutoff ────────────────────────────
  { name: 'Martina Hingis', slams: 5, firstYear: 1997, lastYear: 1999, tour: 'W' },
  { name: 'Maria Sharapova', slams: 5, firstYear: 2004, lastYear: 2014, tour: 'W' },
  { name: 'Jannik Sinner', slams: 4, firstYear: 2024, lastYear: 2025, tour: 'M' },
  { name: 'Aryna Sabalenka', slams: 4, firstYear: 2023, lastYear: 2025, tour: 'W' },
  { name: 'Naomi Osaka', slams: 4, firstYear: 2018, lastYear: 2021, tour: 'W' },
  { name: 'Kim Clijsters', slams: 4, firstYear: 2005, lastYear: 2011, tour: 'W' },
];
