export interface NflConnectionGroup {
  theme: string;
  players: string[];
  difficulty: 'yellow' | 'green' | 'blue' | 'purple';
}

export interface NflConnectionsPuzzle {
  id: string;
  groups: NflConnectionGroup[];
}

/**
 * NFL Connections puzzles (task #26, Connections port to NFL).
 *
 * EVERY fact verified against Supabase on 2026-07-22:
 *   - teams / colleges / era: nfl_player_team_stints (COVERAGE STARTS 2002 -
 *     pre-2002 stints are invisible, so only players whose relevant career
 *     is fully 2002+ are used for team facts; Ray Lewis is admitted because
 *     his invisible 1996-2001 years are the same single franchise)
 *   - draft slots: nfl_draft_picks ("^~" suffixes stripped)
 *   - stat sums (incl. playoffs): nflfastr_player_stats with ::numeric casts
 *
 * Verified sums backing the milestone groups: Gore 16,668 / AP 16,625 /
 * Lynch 11,394 / McCoy 11,324 / Forte 9,939 rushing (all >= 8,500; nearest
 * outsider Mark Ingram II sits at 8,414, retired, so the margin is frozen);
 * Brees 85,794 / Roethlisberger 70,100 / Rivers 66,399 / Ryan 65,464 /
 * Eli 59,841 passing (>= 55,000; Russell Wilson is at 50,191 and must be
 * re-checked before any puzzle ever pairs him with this group); Fitzgerald
 * 18,466 / A.Johnson 14,543 / C.Johnson 11,920 / Green 10,746 / Evans
 * 13,485 receiving (>= 10,000, Antonio Brown at 13,209 is exactly why he
 * was PULLED from the Steelers group in nflconn-004).
 *
 * Name-collision notes (nfl tables key by name only, task #15 bug):
 * "Chris Johnson" is unusable (CB+RB merged); "Adrian Peterson" merges a
 * 2002 Bears RB but the real AP alone clears every threshold used; "Chris
 * Jones" and "Lamar Jackson" carry phantom teams from namesakes, verified
 * that none of those phantom teams collide with their puzzles' groups.
 * Jamaal Charles was dropped from the Chiefs group because he really did
 * play for Denver (2017) and Denver is the same puzzle's green group.
 * Within a puzzle, no player satisfies another group's criterion, the
 * partition is unique. Cross-puzzle reuse is fine.
 */
export const nflConnectionsPuzzles: NflConnectionsPuzzle[] = [
  {
    id: 'nflconn-001',
    groups: [
      { theme: 'Played for the Patriots', players: ['Rob Gronkowski', 'Julian Edelman', 'Stephon Gilmore', 'Chandler Jones', 'Jimmy Garoppolo'], difficulty: 'yellow' },
      { theme: 'Drafted #1 overall', players: ['Matthew Stafford', 'Andrew Luck', 'Joe Burrow', 'Myles Garrett', 'Kyler Murray'], difficulty: 'green' },
      { theme: '8,500+ career rushing yards', players: ['Frank Gore', 'Adrian Peterson', 'Marshawn Lynch', 'LeSean McCoy', 'Matt Forte'], difficulty: 'blue' },
      { theme: 'Played college ball at Alabama', players: ['Julio Jones', 'Amari Cooper', 'Mark Ingram II', 'Tua Tagovailoa', 'DeVonta Smith'], difficulty: 'purple' },
    ],
  },
  {
    id: 'nflconn-002',
    groups: [
      { theme: 'Played for the Cowboys', players: ['Dez Bryant', 'Jason Witten', 'DeMarcus Ware', 'Tony Romo', 'Zack Martin'], difficulty: 'yellow' },
      { theme: '55,000+ career passing yards', players: ['Drew Brees', 'Philip Rivers', 'Ben Roethlisberger', 'Matt Ryan', 'Eli Manning'], difficulty: 'green' },
      { theme: 'Played for the Seahawks', players: ['Russell Wilson', 'Richard Sherman', 'Bobby Wagner', 'Kam Chancellor', 'Doug Baldwin'], difficulty: 'blue' },
      { theme: 'Played college ball at LSU', players: ['Odell Beckham Jr.', 'Jarvis Landry', 'Tyrann Mathieu', "Ja'Marr Chase", 'Justin Jefferson'], difficulty: 'purple' },
    ],
  },
  {
    id: 'nflconn-003',
    groups: [
      { theme: 'Played for the Chiefs', players: ['Patrick Mahomes', 'Travis Kelce', 'Tyreek Hill', 'Eric Berry', 'Chris Jones'], difficulty: 'yellow' },
      { theme: 'Played for the Broncos', players: ['Von Miller', 'Demaryius Thomas', 'Emmanuel Sanders', 'Chris Harris Jr.', 'Courtland Sutton'], difficulty: 'green' },
      { theme: 'Played college ball at Ohio State', players: ['Nick Bosa', 'Joey Bosa', 'Ezekiel Elliott', 'Marshon Lattimore', 'Denzel Ward'], difficulty: 'blue' },
      { theme: 'Played for the Packers', players: ['Davante Adams', 'Jordy Nelson', 'Clay Matthews', 'Aaron Jones', 'Jaire Alexander'], difficulty: 'purple' },
    ],
  },
  {
    id: 'nflconn-004',
    groups: [
      { theme: 'Played for the Steelers', players: ['T.J. Watt', 'Cam Heyward', "Le'Veon Bell", 'Troy Polamalu', 'James Harrison'], difficulty: 'yellow' },
      { theme: 'Played for the Ravens', players: ['Ray Lewis', 'Ed Reed', 'Lamar Jackson', 'Justin Tucker', 'Terrell Suggs'], difficulty: 'green' },
      { theme: '10,000+ career receiving yards', players: ['Larry Fitzgerald', 'Andre Johnson', 'Calvin Johnson', 'A.J. Green', 'Mike Evans'], difficulty: 'blue' },
      { theme: 'Played college ball at Clemson', players: ['Trevor Lawrence', 'Deshaun Watson', 'Travis Etienne', 'Tee Higgins', 'Hunter Renfrow'], difficulty: 'purple' },
    ],
  },
];
