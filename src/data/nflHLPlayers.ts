/**
 * NFL Higher/Lower pool, career TOUCHDOWNS SCORED (rushing + receiving,
 * regular season), baked from nflfastr_player_stats on 2026-07-22.
 *
 * DESIGN CONSTRAINTS (matter if you regenerate):
 *  - QBs are EXCLUDED: their touchdowns are thrown, a different stat, mixing
 *    "TD passes" with "TDs scored" would make the comparison meaningless.
 *  - nflfastr coverage starts 1999, so the pool only admits players whose
 *    FIRST season is >= 2000, careers fully inside the window. That's why
 *    there's no Jerry Rice / Emmitt Smith here: their pre-1999 seasons would
 *    make the "career" number silently wrong.
 *  - Aggregated by the stable player_id (no name-collision risk), REG season
 *    type only. Verified exact: LaDainian Tomlinson 162, Adrian Peterson 126,
 *    Larry Fitzgerald 121, Antonio Gates 116, Calvin Johnson 84.
 */
export interface NflHLPlayer {
  name: string;
  position: string;
  teams: string;
  /** Career rushing + receiving TDs, regular season. */
  careerTds: number;
  lastSeason: number;
}

export const nflHLPlayers: NflHLPlayer[] = [
  { name: 'LaDainian Tomlinson', position: 'RB', teams: 'LAC, NYJ', careerTds: 162, lastSeason: 2011 },
  { name: 'Adrian Peterson', position: 'RB', teams: 'MIN, NO, ARI, DET, SEA', careerTds: 126, lastSeason: 2021 },
  { name: 'Larry Fitzgerald', position: 'WR', teams: 'ARI', careerTds: 121, lastSeason: 2020 },
  { name: 'Antonio Gates', position: 'TE', teams: 'LAC', careerTds: 116, lastSeason: 2018 },
  { name: 'Shaun Alexander', position: 'RB', teams: 'SEA, WAS', careerTds: 112, lastSeason: 2008 },
  { name: 'Derrick Henry', position: 'RB', teams: 'TEN, BAL', careerTds: 111, lastSeason: 2024 },
  { name: 'Mike Evans', position: 'WR', teams: 'TB', careerTds: 105, lastSeason: 2024 },
  { name: 'Davante Adams', position: 'WR', teams: 'GB, LV, NYJ', careerTds: 103, lastSeason: 2024 },
  { name: 'Frank Gore', position: 'RB', teams: 'SF, IND, BUF, MIA, NYJ', careerTds: 99, lastSeason: 2020 },
  { name: 'Marshawn Lynch', position: 'RB', teams: 'BUF, SEA, LV', careerTds: 94, lastSeason: 2019 },
  { name: 'Rob Gronkowski', position: 'TE', teams: 'NE, TB', careerTds: 93, lastSeason: 2021 },
  { name: 'Jimmy Graham', position: 'TE', teams: 'NO, SEA, GB, CHI', careerTds: 89, lastSeason: 2023 },
  { name: 'LeSean McCoy', position: 'RB', teams: 'PHI, BUF, KC, TB', careerTds: 89, lastSeason: 2020 },
  { name: 'Tyreek Hill', position: 'WR', teams: 'KC, MIA', careerTds: 89, lastSeason: 2024 },
  { name: 'Ezekiel Elliott', position: 'RB', teams: 'DAL, NE', careerTds: 88, lastSeason: 2024 },
  { name: 'Alvin Kamara', position: 'RB', teams: 'NO', careerTds: 85, lastSeason: 2024 },
  { name: 'Calvin Johnson', position: 'WR', teams: 'DET', careerTds: 84, lastSeason: 2015 },
  { name: 'Anquan Boldin', position: 'WR', teams: 'ARI, BAL, SF, DET', careerTds: 83, lastSeason: 2016 },
  { name: 'Steve Smith Sr.', position: 'WR', teams: 'CAR, BAL', careerTds: 83, lastSeason: 2016 },
  { name: 'Antonio Brown', position: 'WR', teams: 'PIT, NE, TB', careerTds: 83, lastSeason: 2021 },
  { name: 'DeAndre Hopkins', position: 'WR', teams: 'HOU, ARI, TEN, KC', careerTds: 83, lastSeason: 2024 },
  { name: 'Brandon Marshall', position: 'WR', teams: 'DEN, MIA, CHI, NYJ, NYG', careerTds: 83, lastSeason: 2018 },
  { name: 'Reggie Wayne', position: 'WR', teams: 'IND', careerTds: 82, lastSeason: 2014 },
  { name: 'Christian McCaffrey', position: 'RB', teams: 'CAR, SF', careerTds: 81, lastSeason: 2024 },
  { name: 'Clinton Portis', position: 'RB', teams: 'DEN, WAS', careerTds: 80, lastSeason: 2010 },
  { name: 'Todd Gurley', position: 'RB', teams: 'LA, ATL', careerTds: 79, lastSeason: 2020 },
  { name: 'Travis Kelce', position: 'TE', teams: 'KC', careerTds: 79, lastSeason: 2024 },
  { name: 'Maurice Jones-Drew', position: 'RB', teams: 'JAX, LV', careerTds: 79, lastSeason: 2014 },
  { name: 'Steven Jackson', position: 'RB', teams: 'LA, ATL, NE', careerTds: 78, lastSeason: 2015 },
  { name: 'Mark Ingram', position: 'RB', teams: 'NO, BAL, HOU', careerTds: 75, lastSeason: 2022 },
  { name: 'Dez Bryant', position: 'WR', teams: 'DAL, BAL', careerTds: 75, lastSeason: 2020 },
  { name: 'Matt Forte', position: 'RB', teams: 'CHI, NYJ', careerTds: 75, lastSeason: 2017 },
  { name: 'Jason Witten', position: 'TE', teams: 'DAL, LV', careerTds: 74, lastSeason: 2020 },
  { name: 'Joe Mixon', position: 'RB', teams: 'CIN, HOU', careerTds: 74, lastSeason: 2024 },
  { name: 'Austin Ekeler', position: 'RB', teams: 'LAC, WAS', careerTds: 73, lastSeason: 2024 },
  { name: 'Jordy Nelson', position: 'WR', teams: 'GB, LV', careerTds: 72, lastSeason: 2018 },
  { name: 'Marques Colston', position: 'WR', teams: 'NO', careerTds: 72, lastSeason: 2015 },
  { name: 'Thomas Jones', position: 'RB', teams: 'ARI, TB, CHI, NYJ, KC', careerTds: 71, lastSeason: 2011 },
  { name: 'Brian Westbrook', position: 'RB', teams: 'PHI, SF', careerTds: 71, lastSeason: 2010 },
  { name: 'Stefon Diggs', position: 'WR', teams: 'MIN, BUF, HOU', careerTds: 71, lastSeason: 2024 },
  { name: 'A.J. Green', position: 'WR', teams: 'CIN, ARI', careerTds: 70, lastSeason: 2022 },
  { name: 'DeAngelo Williams', position: 'RB', teams: 'CAR, PIT', careerTds: 70, lastSeason: 2016 },
  { name: 'James Conner', position: 'RB', teams: 'PIT, ARI', careerTds: 70, lastSeason: 2024 },
  { name: 'Willis McGahee', position: 'RB', teams: 'BUF, BAL, DEN, CLE', careerTds: 70, lastSeason: 2013 },
  { name: 'Aaron Jones', position: 'RB', teams: 'GB, MIN', careerTds: 70, lastSeason: 2024 },
  { name: 'Andre Johnson', position: 'WR', teams: 'HOU, IND, TEN', careerTds: 70, lastSeason: 2016 },
  { name: 'Melvin Gordon', position: 'RB', teams: 'LAC, DEN, BAL', careerTds: 70, lastSeason: 2023 },
  { name: 'Arian Foster', position: 'RB', teams: 'HOU, MIA', careerTds: 68, lastSeason: 2016 },
  { name: 'Chad Johnson', position: 'WR', teams: 'CIN, NE', careerTds: 67, lastSeason: 2011 },
  { name: 'Michael Turner', position: 'RB', teams: 'LAC, ATL', careerTds: 67, lastSeason: 2012 },
  { name: 'Keenan Allen', position: 'WR', teams: 'LAC, CHI', careerTds: 66, lastSeason: 2024 },
  { name: 'Santana Moss', position: 'WR', teams: 'NYJ, WAS', careerTds: 66, lastSeason: 2014 },
  { name: 'Julio Jones', position: 'WR', teams: 'ATL, TEN, TB, PHI', careerTds: 66, lastSeason: 2023 },
  { name: 'Adam Thielen', position: 'WR', teams: 'MIN, CAR', careerTds: 65, lastSeason: 2024 },
  { name: 'Jamaal Charles', position: 'RB', teams: 'KC, DEN, JAX', careerTds: 64, lastSeason: 2018 },
  { name: 'Plaxico Burress', position: 'WR', teams: 'PIT, NYG, NYJ', careerTds: 64, lastSeason: 2012 },
  { name: 'Chris Johnson', position: 'RB', teams: 'TEN, NYJ, ARI', careerTds: 64, lastSeason: 2017 },
  { name: 'Amari Cooper', position: 'WR', teams: 'LV, DAL, CLE, BUF', careerTds: 64, lastSeason: 2024 },
  { name: 'Brandon Jacobs', position: 'RB', teams: 'NYG, SF', careerTds: 64, lastSeason: 2013 },
  { name: 'Greg Jennings', position: 'WR', teams: 'GB, MIN, MIA', careerTds: 64, lastSeason: 2015 },
];
