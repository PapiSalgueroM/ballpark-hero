/* Round 941: the seat packs. Who sits upstairs, what the prize is called and
   what each mandate level asks, for every manager seat on the site. Pure
   data: the ladder lives in foOwnerMandate.ts and the adapter in gmSeat.ts.

   Season lengths are each game's own rule, read from its engine, never a
   real league fact: the four front offices use 17, 80, 80 and 162 (the
   words their boards pass today), CFB_ROUNDS is 12 one game rounds, CBB is
   10 rounds of two (CBB_ROUNDS times CBB_GAMES_PER_ROUND), and the Aussie
   rules manager plays 10 rounds.

   The Aussie rules manager has NO finals: ten home and away rounds and the
   ladder leader wins the league (aussieRulesManager.ts, its board and its
   guide all say so). So its asks are ladder places, never finals, and the
   pack carries `ladder` for ladderSeasonOutcome: top four is the 'make it'
   level, top three the deep run, first the title, of its six clubs.

   HELD: Fight Gym. In that game you open and own the gym, the money lands on
   you and the gym closes when the money runs out (fightGym.ts). Nobody sits
   upstairs to sack you, there is no season and no circuit of rival gyms to
   hire you, so the seat this module models does not exist there. A pack
   would have to change the game's premise to bind, so there is none until a
   gym round gives the game a seat.

   Every line is narrated and every speaker is a role. Nothing here is a
   quote and nothing names a real person. */

import type { GmSeatPack, SeatAskKey } from '../../lib/gmSeat';
import type { FoGradeResult } from '../../lib/foOwnerMandate';

const PRO_ASKS: Record<SeatAskKey, string> = {
  title: 'Win {title}. Anything less is a failed season upstairs.',
  champDefend: 'Defend the crown: a deep run in {playoffs} is the minimum {upstairs} will accept.',
  contend: 'Make {playoffs} and win {round}. This {roster} is built for it.',
  playoffs: 'Make {playoffs}. {Upstairs} thinks this {roster} belongs there.',
  respect: 'Win {winGames} and show the fans a direction.',
  rebuild: 'Rebuild honestly: {wins} keeps the project on schedule upstairs.',
};

const PRO_VERDICTS: Record<FoGradeResult, string> = {
  title: '🏆 A parade. {Upstairs} will not hear a word against you for a while.',
  overachieved: '📈 Ahead of the ask. {Upstairs} noticed.',
  met: '✅ Mandate met. The seat stays comfortable.',
  missed: '⚠️ Short of the ask. Patience upstairs got thinner.',
  badly: '🔻 Nowhere near the ask. The room upstairs went quiet.',
};

const pro = (
  id: 'nfl' | 'nba' | 'nhl' | 'mlb', game: string,
  title: string, playoffs: string, round: string, games: number,
): GmSeatPack => ({
  id, game, role: 'general manager', seat: 'franchise', seats: 'franchises', upstairs: 'ownership',
  words: { title, playoffs, round, games }, roster: 'roster', winUnit: 'games',
  asks: PRO_ASKS, verdicts: PRO_VERDICTS, poachable: false,
});

const COLLEGE_ASKS: Record<SeatAskKey, string> = {
  title: 'Win {title}. Anything short of it and the boosters start asking questions.',
  champDefend: 'Defend the crown: the boosters expect another deep run in {playoffs}.',
  contend: 'Make {playoffs} and win {round}. The boosters paid for this {roster}.',
  playoffs: 'Make {playoffs}. The athletic director thinks this {roster} belongs there.',
  respect: 'Win {winGames} and give the boosters a reason to keep writing checks.',
  rebuild: 'Rebuild it right: {wins} keeps the athletic director on your side.',
};

const COLLEGE_VERDICTS: Record<FoGradeResult, string> = {
  title: '🏆 National champions. The boosters are already planning the banner.',
  overachieved: '📈 Ahead of the ask. The athletic director noticed, and so did everybody else.',
  met: '✅ Ask met. The boosters stay happy.',
  missed: '⚠️ Short of the ask. The booster money got quieter.',
  badly: '🔻 Nowhere near the ask. The athletic director stopped returning calls.',
};

const college = (
  id: 'cfb' | 'cbb', game: string, playoffs: string, round: string, games: number,
): GmSeatPack => ({
  id, game, role: 'head coach', seat: 'program', seats: 'programs',
  upstairs: 'the athletic director and the boosters',
  words: { title: 'the national title', playoffs, round, games }, roster: 'roster', winUnit: 'games',
  asks: COLLEGE_ASKS, verdicts: COLLEGE_VERDICTS, poachable: true,
});

export const GM_SEAT_PACKS: Record<GmSeatPack['id'], GmSeatPack> = {
  nfl: pro('nfl', 'NFL Front Office', 'the Super Bowl', 'the playoffs', 'a playoff round', 17),
  nba: pro('nba', 'NBA Front Office', 'the Finals', 'the playoffs', 'a series', 80),
  nhl: pro('nhl', 'NHL Front Office', 'the Stanley Cup', 'the playoffs', 'a series', 80),
  mlb: pro('mlb', 'MLB Front Office', 'the World Series', 'October', 'a series', 162),
  cfb: college('cfb', 'College Football Dynasty', 'the Playoff', 'a Playoff game', 12),
  /* The national tournament, said in full: the game also plays conference
     tournaments, and a conference win must not read as meeting the ask. */
  cbb: college('cbb', 'College Basketball Dynasty', 'the national tournament', 'a national tournament game', 20),
  afl: {
    id: 'afl', game: 'Aussie Rules Manager', role: 'senior coach', seat: 'club', seats: 'clubs',
    upstairs: 'the board',
    words: { title: 'the league', playoffs: 'the top four', round: 'a top three finish', games: 10 },
    roster: 'squad', winUnit: 'games', poachable: false,
    ladder: { cut: 4, deep: 3 },
    asks: {
      title: 'Win {title}: finish top of the ladder. Anything less and the board calls it a wasted year.',
      champDefend: 'Defend the title: {round} is the least the board will take.',
      contend: 'Get {round} and stay in the race for top spot. This {roster} is built for it.',
      playoffs: 'Finish in {playoffs}. The board thinks this {roster} belongs there.',
      respect: 'Win {winGames} and show the members a direction.',
      rebuild: 'Rebuild properly: {wins} keeps the board patient.',
    },
    verdicts: {
      title: '🏆 Top of the ladder. The board will not hear a word against you for a while.',
      overachieved: '📈 Ahead of the ask. The board noticed.',
      met: '✅ Ask met. The board is comfortable.',
      missed: '⚠️ Short of the ask. The board is less patient now.',
      badly: '🔻 Nowhere near the ask. The board room went quiet.',
    },
  },
};
