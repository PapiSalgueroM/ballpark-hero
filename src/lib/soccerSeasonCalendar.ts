import type { SavedCompetitionMatch, SavedSeasonCompetition } from './soccerSeasonCompetitions';

export interface CalendarCupGame {
  id: string;
  competition: 'domestic' | 'club';
  name: string;
  matchIndex: number;
  afterLeague: number;
  previous: string | null;
  match: SavedCompetitionMatch;
}
export const CUP_CALENDAR_NOTE = 'Cup nights are placed between league games by this simulation. Your save kept their opponents and results, not calendar dates. Early rounds without match details stay marked.';
const number = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const recordedMatch = (match: SavedCompetitionMatch) => !!match && typeof match.round === 'string' && match.round.trim().length > 0
  && (match.opponent === null || typeof match.opponent === 'string' && match.opponent.trim().length > 0)
  && (match.goalsFor === null || number(match.goalsFor)) && (match.goalsAgainst === null || number(match.goalsAgainst))
  && (match.home === undefined || typeof match.home === 'boolean') && (match.playerGoals === undefined || number(match.playerGoals));

/** Only saved games enter the calendar. A deciding loss ends that club's route. */
export function cupCalendar(competitions: readonly SavedSeasonCompetition[], leagueGames: number): CalendarCupGame[] {
  if (!number(leagueGames) || leagueGames < 1) return [];
  const calendar: CalendarCupGame[] = [];
  for (const competition of competitions) {
    if (!['domestic', 'club'].includes(competition.id) || !Array.isArray(competition.matches) || !competition.matches.every(recordedMatch)) continue;
    let previous: string | null = null;
    let after = 0;
    const firstStageGames = competition.matches.filter(match => /game \d+/i.test(match.round)).length;
    for (let index = 0; index < competition.matches.length; index++) {
      const match = competition.matches[index];
      let position: number;
      if (competition.id === 'domestic') {
        const share = match.round === 'Quarter-final' ? 0.65 : match.round === 'Semi-final' ? 0.82 : match.round === 'Final' ? 0.95 : 0;
        position = share ? Math.round(leagueGames * share) : 5;
      } else {
        const game = match.round.match(/game (\d+)/i);
        const legTwo = /leg 2$/.test(match.round);
        const share = /^Play-off/.test(match.round) ? legTwo ? 0.63 : 0.60
          : /^Round of 16/.test(match.round) ? legTwo ? 0.70 : 0.66
            : /^Quarter-final/.test(match.round) ? legTwo ? 0.78 : 0.74
              : /^Semi-final/.test(match.round) ? legTwo ? 0.89 : 0.84
                : /^Final/.test(match.round) ? 0.98 : 0;
        position = share ? Math.round(leagueGames * share) : game ? 3 + Math.round(index * Math.max(0, Math.round(leagueGames * 0.56) - 3) / Math.max(1, firstStageGames - 1)) : 3 + index * 3;
      }
      after = Math.max(after, Math.min(leagueGames, Math.max(1, position)));
      const id = `${competition.id}:${index}`;
      calendar.push({ id, competition: competition.id, name: competition.name, matchIndex: index, afterLeague: after, previous, match: { ...match } });
      previous = id;
      if (match.result === 'Out' || match.result === 'Knocked out') break;
    }
  }
  return calendar.sort((a, b) => a.afterLeague - b.afterLeague || (a.competition === b.competition ? a.matchIndex - b.matchIndex : a.competition === 'domestic' ? -1 : 1));
}
/** A next-round opponent is shown only after the preceding saved game is revealed. */
export function visibleCupGames(calendar: readonly CalendarCupGame[], seen: ReadonlySet<string>): CalendarCupGame[] {
  return calendar.filter(game => game.previous === null || seen.has(game.previous));
}
export function nextCupGame(calendar: readonly CalendarCupGame[], leaguePlayed: number, seen: ReadonlySet<string>): CalendarCupGame | null {
  return visibleCupGames(calendar, seen).find(game => game.afterLeague <= leaguePlayed && !seen.has(game.id)) ?? null;
}
