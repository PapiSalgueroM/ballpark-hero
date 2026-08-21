import { supabase } from '@/integrations/supabase/client';

/**
 * The Record Books (/records, Round 238): the audited champion tables as
 * a readable reference. Rounds 232 to 236 verified every one of these
 * season by season (two sources each, wrong scrapes rebuilt, shifted
 * columns repaired, stripped titles honestly vacant), so the site can
 * stand behind a public year-by-year page. Columns are shown only where
 * the data behind them is verified and reasonably filled; a blank cell
 * means the record was never scraped, never that we guessed.
 *
 * simRecords.mjs fences the page contract; simListQuizSources.mjs and
 * simChampOrNot.mjs fence the tables themselves.
 */

export interface RecordRow {
  year: number;
  champion: string;
  /** extra cells, keyed by column key below; missing keys render blank */
  extra: Record<string, string>;
}

export interface RecordSection {
  key: string;
  emoji: string;
  title: string;
  /** one short factual paragraph under the heading */
  blurb: string;
  /** label of the first column (Year or Season) */
  yearLabel: string;
  /** extra columns after Champion, in order: [key, label] */
  columns: [string, string][];
  /** honest footnote rendered under the table, when the history needs one */
  note?: string;
  /** routes of games that play on this history */
  play: { path: string; label: string }[];
  fetch: () => Promise<RecordRow[]>;
}

async function rows(
  table: string,
  yearCol: string,
  champCol: string,
  extraCols: Record<string, string>,
  filter?: (q: unknown) => unknown,
): Promise<RecordRow[]> {
  const cols = [yearCol, champCol, ...Object.values(extraCols)].join(', ');
  let q: unknown = supabase.from(table as never).select(cols);
  if (filter) q = filter(q);
  const { data, error } = await (q as { limit: (n: number) => PromiseLike<{ data: unknown; error: unknown }> }).limit(5000);
  if (error || !Array.isArray(data)) throw new Error(`${table} unavailable`);
  const out: RecordRow[] = [];
  for (const r of data as Record<string, unknown>[]) {
    const year = r[yearCol];
    const champion = r[champCol];
    if (typeof year !== 'number' || typeof champion !== 'string' || !champion.trim()) continue;
    const extra: Record<string, string> = {};
    for (const [key, col] of Object.entries(extraCols)) {
      const v = r[col];
      if (typeof v === 'string' && v.trim()) extra[key] = v.trim();
      else if (typeof v === 'number' && Number.isFinite(v)) extra[key] = String(v);
    }
    out.push({ year, champion, extra });
  }
  out.sort((a, b) => b.year - a.year || a.champion.localeCompare(b.champion));
  return out;
}

export const RECORD_SECTIONS: RecordSection[] = [
  {
    key: 'sb', emoji: '🏈', title: 'Super Bowl Champions',
    blurb: 'Every Super Bowl by the year it was played, with the final score and the MVP.',
    yearLabel: 'Year',
    columns: [['runnerUp', 'Runner-up'], ['score', 'Score'], ['mvp', 'MVP']],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: async () => {
      const base = await rows('super_bowls', 'year', 'winner', { runnerUp: 'loser', mvp: 'mvp', ws: 'winner_score', ls: 'loser_score' });
      return base.map(r => {
        const { ws, ls, ...rest } = r.extra;
        return { ...r, extra: ws && ls ? { ...rest, score: `${ws}-${ls}` } : rest };
      });
    },
  },
  {
    key: 'nba', emoji: '🏀', title: 'NBA Champions',
    blurb: 'Every Finals back to the 1947 BAA with the beaten finalist, the series winner first, and every Finals MVP since the award began in 1969.',
    yearLabel: 'Year',
    columns: [['runnerUp', 'Runner-up'], ['series', 'Series'], ['mvp', 'Finals MVP']],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('nba_finals', 'year', 'winner', { runnerUp: 'loser', series: 'series_result', mvp: 'finals_mvp' }),
  },
  {
    key: 'ws', emoji: '⚾', title: 'World Series Champions',
    blurb: 'Every World Series since 1903 with the beaten pennant winner. There was no series in 1904 or 1994, and the early best-of-nine years read as they were played.',
    yearLabel: 'Year',
    columns: [['runnerUp', 'Runner-up'], ['series', 'Series']],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('world_series_v2', 'year', 'winner', { runnerUp: 'loser', series: 'series_result' }),
  },
  {
    key: 'cup', emoji: '🏒', title: 'Stanley Cup Champions',
    blurb: 'Cup winners since 1915. The 1919 final was abandoned for the flu pandemic and 2005 was lost to the lockout, so neither year appears.',
    yearLabel: 'Year',
    columns: [['series', 'Series']],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('stanley_cup_finals_v2', 'year', 'winner', { series: 'series_result' }),
  },
  {
    key: 'wnba', emoji: '🏀', title: 'WNBA Champions',
    blurb: 'Every WNBA Finals since the league began in 1997, with the beaten finalist.',
    yearLabel: 'Year',
    columns: [['runnerUp', 'Runner-up'], ['series', 'Series']],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('wnba_finals', 'year', 'winner', { runnerUp: 'loser', series: 'series_result' }),
  },
  {
    key: 'cfb', emoji: '🏈', title: 'College Football National Champions',
    blurb: 'National champions by season since 1981. Years where the polls split carry one row per selector, because both titles are real.',
    yearLabel: 'Season',
    columns: [['selector', 'Selector'], ['record', 'Result'], ['coach', 'Coach']],
    play: [
      { path: '/college-grid', label: 'College Grid' },
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('cfb_national_champions', 'year', 'champion', { selector: 'selector', record: 'record', coach: 'coach' }),
  },
  {
    key: 'cbb', emoji: '🏀', title: "Men's NCAA Basketball Champions",
    blurb: "Every men's national champion in our records, through the most recent tournament.",
    yearLabel: 'Year',
    columns: [],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('ncaa_basketball_champions', 'year', 'champion', {},
      q => (q as { eq: (c: string, v: string) => unknown }).eq('division', "Men's D1")),
  },
  {
    key: 'epl', emoji: '⚽', title: 'English Champions',
    blurb: 'Champions of the English top flight, by the year the season finished.',
    yearLabel: 'Year',
    columns: [],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('soccer_league_champions', 'year', 'champion', {},
      q => (q as { ilike: (c: string, v: string) => unknown }).ilike('league', '%premier%')),
  },
  {
    key: 'afl', emoji: '🏉', title: 'VFL/AFL Premiers',
    blurb: 'Every premiership since 1897, each club under the name it wore at the time. Essendon, Carlton and Collingwood lead the count on 16 flags apiece.',
    yearLabel: 'Year',
    columns: [],
    play: [
      { path: '/afl-higher-lower', label: 'AFL Higher or Lower' },
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('afl_premiers', 'year', 'premier', {}),
  },
  {
    key: 'nrl', emoji: '🏉', title: 'NRL/NSWRL Premiers',
    blurb: 'Every top grade rugby league premiership since 1908. 1997 lists both premiers because the game split that year, Newcastle in the ARL and Brisbane in Super League.',
    yearLabel: 'Year',
    columns: [['competition', 'Competition']],
    note: 'No premiership is shown for 2007 or 2009. Melbourne’s titles from those seasons were stripped for salary cap breaches and remain vacant in the official record, so they stay vacant here too.',
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('nrl_premiers', 'year', 'premier', { competition: 'competition' }),
  },
];
