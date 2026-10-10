import type { CareerState, SeasonRecord } from './soccerCareerEngine';

export interface RecentClubForm {
  swing: -2 | 0 | 2;
  row: Readonly<SeasonRecord> | null;
  reason: string;
}

const YEAR_OUT = ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'];

/** The league games a saved row can really hold.
 *  Release AT: outside a saved league world an injury cuts a row's appearances and leaves its drawn league
 *  count alone (312 of 9,469 rows measured had more league games than games), so the league count by
 *  itself let a season lost to injury pass the ten game test and printed games that were never played
 *  ("5.4 over 13 league games" for a year of 6 appearances). The count is held to his appearances. */
function leagueGamesOf(row: SeasonRecord): number | null {
  const league = row.leagueApps;
  if (typeof league !== 'number' || !Number.isInteger(league) || league > 38) return null;
  return typeof row.apps === 'number' && Number.isInteger(row.apps) && row.apps >= 0 ? Math.min(league, row.apps) : league;
}

/** A small selection adjustment from the club season immediately before this one. */
export function recentClubForm(
  career: CareerState,
  club = career.currentClub,
  year = (career.seasons[career.seasons.length - 1]?.year ?? 0) + 1,
): RecentClubForm {
  const none: RecentClubForm = { swing: 0, row: null,
    reason: 'No form adjustment: the game needs the previous season at this club, with at least 10 recorded league appearances and a valid rating.' };
  if (!Number.isInteger(year)) return none;
  let row: SeasonRecord | undefined;
  for (let i = career.seasons.length - 1; i >= 0; i--) {
    if (career.seasons[i].year === year - 1) { row = career.seasons[i]; break; }
  }
  const games = row ? leagueGamesOf(row) : null;
  if (!row || row.type !== 'playing' || row.club !== club || YEAR_OUT.includes(row.club)
    || games === null || games < 10
    || !Number.isFinite(row.rating) || row.rating < 0 || row.rating > 10) return none;
  const swing = row.rating >= 7.6 ? 2 : row.rating <= 6.4 ? -2 : 0;
  const record = `Last season at ${club}: ${row.rating.toFixed(1)} over ${games} league games.`;
  const effect = swing > 0 ? 'Strong form adds up to 2 league games in this simulation.'
    : swing < 0 ? 'Poor form takes away up to 2 league games in this simulation.'
      : 'That form keeps the next season\'s appearance plan unchanged.';
  return { swing, row, reason: `${record} ${effect}` };
}
