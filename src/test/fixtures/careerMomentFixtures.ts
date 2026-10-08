/* Round 1107: the tournaments the career moment kit's record and tests draw.

   The winner and the group exit are the two fixtures of
   src/test/tournamentCardMoment.test.tsx, field for field (that file keeps
   its own copies; this one exists so the lift's record, the kit's tests and
   the kit's browser rig all draw the SAME cards). The beaten finalist and the
   two missed paths are built from them so every path TournamentCard can take
   has a card on record. Nothing here is a real result: every nation, score
   and number is a test value. */
import type { IntlTournament, IntlTableRow } from '@/lib/soccerCareerEngine';

const row = (nation: string, won: number, drawn: number, lost: number, gf: number, ga: number): IntlTableRow => ({
  nation, played: won + drawn + lost, won, drawn, lost, gf, ga, points: won * 3 + drawn,
});

export function winnerTournament(year = 2030): IntlTournament {
  return {
    year, name: 'World Cup', short: 'WC', kind: 'World Cup',
    confederation: null, nation: 'Portugal', teams: 48,
    qualifying: { confederation: 'UEFA', table: [row('Portugal', 6, 1, 1, 17, 5), row('Poland', 5, 1, 2, 12, 7)], myPosition: 1, through: 1, qualified: true, automatic: false },
    qualified: true,
    squad: { called: true, role: 'Starter', reason: 'You are in.', myRank: 2, poolSize: 9, places: 3, myScore: 81, cutScore: 74 },
    groupTable: [row('Portugal', 2, 1, 0, 6, 2), row('Ghana', 1, 1, 1, 3, 3), row('Uruguay', 1, 0, 2, 2, 4), row('Japan', 0, 2, 1, 2, 4)],
    groupLabel: 'Group F', thirdsThrough: 8,
    bracket: [
      { round: 'SF', slot: 0, home: 'Portugal', away: 'France', homeGoals: 2, awayGoals: 1, winner: 'Portugal', mine: true },
      { round: 'SF', slot: 1, home: 'Brazil', away: 'Spain', homeGoals: 1, awayGoals: 1, pens: true, winner: 'Brazil', mine: false },
      { round: 'F', slot: 0, home: 'Portugal', away: 'Brazil', homeGoals: 3, awayGoals: 2, winner: 'Portugal', mine: true },
    ],
    champion: 'Portugal', runnerUp: 'Brazil', myResult: 'Winner',
    matches: [
      { round: 'SF', home: 'Portugal', away: 'France', homeGoals: 2, awayGoals: 1, pens: false, playerGoals: 1, playerAssists: 1, playerRating: 8.2 },
      { round: 'Final', home: 'Portugal', away: 'Brazil', homeGoals: 3, awayGoals: 2, pens: false, playerGoals: 2, playerAssists: 0, playerRating: 9.1 },
    ],
    playerApps: 7, playerGoals: 6, playerAssists: 3, playerAvgRating: 7.86,
    goldenBoot: true, bestPlayer: true,
  };
}

export function groupExitTournament(year = 2028): IntlTournament {
  return {
    ...winnerTournament(year), name: 'European Championship', short: 'Euros', kind: 'Continental',
    confederation: 'UEFA', nation: 'Scotland', teams: 24,
    groupTable: [row('Germany', 3, 0, 0, 8, 1), row('Switzerland', 1, 1, 1, 3, 3), row('Hungary', 1, 0, 2, 2, 5), row('Scotland', 0, 1, 2, 2, 6)],
    qualifying: { confederation: 'UEFA', table: [row('Scotland', 5, 2, 1, 14, 6), row('Norway', 4, 2, 2, 11, 8)], myPosition: 1, through: 1, qualified: true, automatic: false },
    groupLabel: 'Group A', thirdsThrough: 4,
    bracket: [{ round: 'F', slot: 0, home: 'Spain', away: 'England', homeGoals: 2, awayGoals: 1, winner: 'Spain', mine: false }],
    champion: 'Spain', runnerUp: 'England', myResult: 'Group Stage',
    matches: [{ round: 'Group', home: 'Scotland', away: 'Germany', homeGoals: 1, awayGoals: 5, pens: false, playerGoals: 1, playerAssists: 0, playerRating: 6.4 }],
    playerApps: 3, playerGoals: 1, playerAssists: 0, playerAvgRating: 6.43,
    goldenBoot: false, bestPlayer: false,
  };
}

/** The winner's own run, lost in the final: the same games, the other result. */
export function finalistTournament(year = 2034): IntlTournament {
  const t = winnerTournament(year);
  return {
    ...t,
    bracket: [t.bracket[0], t.bracket[1], { ...t.bracket[2], homeGoals: 1, awayGoals: 2, winner: 'Brazil' }],
    champion: 'Brazil', runnerUp: 'Portugal', myResult: 'Runner-up',
    matches: [t.matches[0], { ...t.matches[1], homeGoals: 1, awayGoals: 2, playerGoals: 1, playerRating: 7.4 }],
    playerGoals: 5, playerAvgRating: 7.51,
    goldenBoot: false, bestPlayer: false,
  };
}

/** His nation never got out of qualifying: no squad, no group, no game. */
export function didNotQualifyTournament(year = 2038): IntlTournament {
  const t = groupExitTournament(year);
  return {
    ...t,
    qualifying: { ...t.qualifying, table: [row('Norway', 6, 1, 1, 15, 6), row('Scotland', 3, 2, 3, 9, 10)], myPosition: 2, qualified: false },
    qualified: false, squad: null, groupTable: [],
    myResult: 'Did Not Qualify',
    matches: [], playerApps: 0, playerGoals: 0, playerAssists: 0, playerAvgRating: 0,
  };
}

/** His nation went, he was left at home. */
export function notSelectedTournament(year = 2042): IntlTournament {
  const t = groupExitTournament(year);
  return {
    ...t,
    squad: { called: false, role: null, reason: 'You missed the cut.', myRank: 6, poolSize: 9, places: 3, myScore: 68, cutScore: 74 },
    myResult: 'Not Selected',
    matches: [], playerApps: 0, playerGoals: 0, playerAssists: 0, playerAvgRating: 0,
  };
}
