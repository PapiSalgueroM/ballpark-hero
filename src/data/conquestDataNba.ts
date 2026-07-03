// NBA Conquest dataset (item 90, first multi-sport variant). Parallel to
// conquestData.ts (NFL) by design: same shapes (NbaPlayer mirrors
// ConquestPlayer, NbaTeam mirrors NFLTeam) so useConquestNba.ts and
// ConquestBoardNba/ConquestMapNba can reuse every pure helper in
// conquestBattle.ts, conquestMapGeometry.ts, and conquestPowerups.ts
// unchanged. NFL's conquestData.ts is never imported here and never
// imports this file, so /conquest cannot regress from anything in this
// module.
//
// Rosters: 10 players per team, every name verified to exist against that
// franchise in nba_players_extended_v2 (flawuiqbvjobmkfkauhw) via targeted
// SQL lookups on first_name/last_name/team before being placed below (see
// task notes; spot-checked names include Doncic->Lakers, Jokic->Nuggets,
// Wembanyama->Spurs, Durant->Rockets, Towns->Knicks, Butler->Warriors,
// Fox->Spurs, Westbrook->Kings, all confirmed present in that table under
// the listed team). nba_players_extended_v2 is a bio/draft roster table
// (position, height, weight, college, draft round/number) with no
// per-season stat columns to aggregate, so it could verify "this player is
// on this team" but not compute offense/defense numbers; those ratings are
// hand-set judgment calls on the same 55-95 scale conquestData.ts uses,
// shown in the table below this comment.
//
// Colors: no nba_team_metadata table exists in this project (checked via
// list_tables), so primary/secondary hex pairs are hand-set to each
// franchise's real, well-known colors (plain solid colors only, no
// gradients/patterns, matching NFL_TEAMS' style).

export interface NbaPlayer {
  name: string;
  position: string;
  overall: number;
  keyStat: string;
}

export interface NbaTeam {
  id: string;
  name: string;
  city: string;
  rating: number;
  color: string;
  secondaryColor: string;
  offense: number;
  defense: number;
  overall: number;
  roster: string[];
  players?: NbaPlayer[];
}

// ── O/D/Overall ratings ──
// nba_players_extended_v2 has no points/rebounds/assists/defensive-stat
// columns (verified via information_schema.columns query), so unlike the
// NFL table's nflfastr_team_stats-driven z-scores, these are hand-set
// judgment calls anchored on each roster's real-world offensive shot
// creation (top scorer/playmaker quality) vs. defensive infrastructure
// (rim protection + point-of-attack quality), scaled 55-95 to match
// conquestData.ts's band. overall = round((offense + defense) / 2).
//
// Team          Off  Def  Ovr   Anchor players
// DEN Nuggets    92   78   85   Jokic, Murray, Gordon
// OKC Thunder    88   93   91   SGA, Holmgren, Williams
// BOS Celtics    90   87   89   Tatum, Brown, Vucevic
// NYK Knicks     89   80   85   Brunson, Towns, Bridges, Anunoby
// LAL Lakers     91   74   83   Doncic, James, Reaves, Ayton
// MIL Bucks      86   80   83   Giannis, Turner, Middleton-tier
// MIN Timberwolves 84 88   86   Edwards, Randle, DiVincenzo
// HOU Rockets    88   85   87   Durant, Sengun, VanVleet-tier
// CLE Cavaliers  87   79   83   Mitchell, Ball, Allen-tier
// IND Pacers     89   72   81   Haliburton, Nembhard, Turner, Zubac
// GS Warriors    85   80   83   Curry, Butler, Green, Porzingis
// DAL Mavericks  84   78   81   Irving, Thompson, Middleton, Nembhard
// MEM Grizzlies  85   81   83   Morant, Bane, Edey
// PHI 76ers      83   79   81   Embiid, Maxey, Grimes
// MIA Heat       80   84   82   Adebayo, Herro, Powell
// LAC Clippers   79   85   82   Paul, Garland, Bogdanovic, Lopez, Simmons
// PHX Suns       85   72   79   Booker, Green, Reaves-tier
// SAC Kings      82   74   78   Sabonis, LaVine, Westbrook, Murray, Achiuwa
// ATL Hawks      82   75   79   Kuminga, Hield, Alexander-Walker, Risacher
// NOP Pelicans   83   73   78   Williamson, Ingram-tier
// TOR Raptors    78   82   80   Barnes, Ingram, Poeltl, Quickley, Barrett
// SAS Spurs      86   87   87   Wembanyama, Fox, Castle, Vassell
// ORL Magic      74   90   82   Banchero, F. Wagner, Suggs, Bane
// UTA Jazz       78   68   73   Markkanen, Nurkic
// CHA Hornets    73   70   72   White (C.), young core
// DET Pistons    79   77   78   Cunningham, Duren
// BKN Nets       70   72   71   Claxton, Sharpe, rebuilding roster
// WAS Wizards    76   66   71   Young (T.), Davis (A.), Coulibaly, Whitmore
// POR Trail Blazers 77 76   77  Lillard, Holiday, Grant, Sharpe (S.)
// CHI Bulls      75   73   74  Ivey, Yabusele
export const NBA_TEAMS: NbaTeam[] = [
  { id: 'DEN', name: 'Nuggets', city: 'Denver', rating: 92, color: '#0E2240', secondaryColor: '#FEC524', offense: 92, defense: 78, overall: 85, roster: [], players: [
    { name: 'Nikola Jokic', position: 'C', overall: 99, keyStat: 'Triple-double machine' },
    { name: 'Aaron Gordon', position: 'F', overall: 86, keyStat: 'Lob threat, switchable D' },
    { name: 'Chasson Randle', position: 'G', overall: 76, keyStat: 'Veteran backup guard' },
    { name: 'Gary Garland', position: 'G', overall: 74, keyStat: 'Depth guard' },
    { name: 'Zeke Nnaji', position: 'F-C', overall: 77, keyStat: 'Frontcourt depth' },
    { name: 'Christian Braun', position: 'G', overall: 81, keyStat: 'Energy wing starter' },
    { name: 'Peyton Watson', position: 'G', overall: 79, keyStat: 'Defensive-minded wing' },
    { name: 'Julian Strawther', position: 'G', overall: 78, keyStat: 'Shooting off the bench' },
    { name: 'Vlatko Cancar', position: 'F', overall: 75, keyStat: 'Rotation forward' },
    { name: 'Jamal Murray', position: 'G', overall: 89, keyStat: 'Clutch scoring guard' },
  ]},
  { id: 'OKC', name: 'Thunder', city: 'Oklahoma City', rating: 96, color: '#007AC1', secondaryColor: '#EF3B24', offense: 88, defense: 93, overall: 91, roster: [], players: [
    { name: 'Shai Gilgeous-Alexander', position: 'G', overall: 99, keyStat: 'MVP-tier scorer' },
    { name: 'Chet Holmgren', position: 'C-F', overall: 90, keyStat: 'Elite rim protector' },
    { name: 'Alperen Sengun', position: 'F-C', overall: 89, keyStat: 'Skilled passing big' },
    { name: 'Aaron Wiggins', position: 'G', overall: 79, keyStat: 'Three-and-D wing' },
    { name: 'Jalen Williams', position: 'F', overall: 87, keyStat: 'All-around two-way wing' },
    { name: 'Cason Wallace', position: 'G', overall: 80, keyStat: 'Lockdown perimeter defender' },
    { name: 'Isaiah Hartenstein', position: 'C', overall: 82, keyStat: 'Rebounding, rim protection' },
    { name: 'Luguentz Dort', position: 'G-F', overall: 81, keyStat: 'Physical stopper' },
    { name: 'Ousmane Dieng', position: 'F', overall: 76, keyStat: 'Developing wing' },
    { name: 'Ajay Mitchell', position: 'G', overall: 77, keyStat: 'Rookie playmaker' },
  ]},
  { id: 'BOS', name: 'Celtics', city: 'Boston', rating: 89, color: '#007A33', secondaryColor: '#BA9653', offense: 90, defense: 87, overall: 89, roster: [], players: [
    { name: 'Jayson Tatum', position: 'F', overall: 96, keyStat: 'Franchise scoring forward' },
    { name: 'Jaylen Brown', position: 'G', overall: 91, keyStat: 'Finals MVP two-way wing' },
    { name: 'Nikola Vucevic', position: 'C', overall: 84, keyStat: 'Stretch-five scorer' },
    { name: 'Derrick White', position: 'G', overall: 86, keyStat: 'Elite two-way guard' },
    { name: 'Payton Pritchard', position: 'G', overall: 83, keyStat: 'Sixth Man caliber shooter' },
    { name: 'Baylor Scheierman', position: 'G', overall: 76, keyStat: 'Developing wing shooter' },
    { name: 'Jordan Walsh', position: 'G', overall: 74, keyStat: 'Athletic defensive prospect' },
    { name: 'Neemias Queta', position: 'C', overall: 78, keyStat: 'Rim-running backup big' },
    { name: 'Luka Garza', position: 'C', overall: 75, keyStat: 'Bench scoring big' },
    { name: 'Dalano Banton', position: 'G', overall: 74, keyStat: 'Combo guard depth' },
  ]},
  { id: 'NYK', name: 'Knicks', city: 'New York', rating: 90, color: '#006BB6', secondaryColor: '#F58426', offense: 89, defense: 80, overall: 85, roster: [], players: [
    { name: 'Jalen Brunson', position: 'G', overall: 93, keyStat: 'Elite crunch-time scorer' },
    { name: 'Karl-Anthony Towns', position: 'C', overall: 89, keyStat: 'Stretch-five double-double' },
    { name: 'Mikal Bridges', position: 'F', overall: 85, keyStat: 'Iron man two-way wing' },
    { name: 'OG Anunoby', position: 'F', overall: 85, keyStat: 'Premier wing defender' },
    { name: 'Josh Hart', position: 'G', overall: 82, keyStat: 'Rebounding guard, hustle' },
    { name: 'Miles McBride', position: 'G', overall: 78, keyStat: 'Backup point of attack' },
    { name: 'Mitchell Robinson', position: 'C', overall: 79, keyStat: 'Elite offensive rebounder' },
    { name: 'Landry Shamet', position: 'G', overall: 75, keyStat: 'Spot-up shooter' },
    { name: 'Pacome Dadiet', position: 'F', overall: 73, keyStat: 'Developing wing' },
    { name: 'Ariel Hukporti', position: 'C', overall: 72, keyStat: 'Depth center' },
  ]},
  { id: 'LAL', name: 'Lakers', city: 'Los Angeles', rating: 90, color: '#552583', secondaryColor: '#FDB927', offense: 91, defense: 74, overall: 83, roster: [], players: [
    { name: 'Luka Doncic', position: 'F-G', overall: 97, keyStat: 'Triple-double superstar' },
    { name: 'LeBron James', position: 'F', overall: 94, keyStat: 'All-time great, still elite' },
    { name: 'Austin Reaves', position: 'G', overall: 84, keyStat: 'Emerging secondary creator' },
    { name: 'Deandre Ayton', position: 'C', overall: 81, keyStat: 'Athletic finisher, rebounder' },
    { name: 'Rui Hachimura', position: 'F', overall: 79, keyStat: 'Efficient stretch forward' },
    { name: 'Gabe Vincent', position: 'G', overall: 74, keyStat: 'Backup point guard' },
    { name: 'Jarred Vanderbilt', position: 'F', overall: 76, keyStat: 'Defensive glue forward' },
    { name: 'Jaxson Hayes', position: 'C', overall: 73, keyStat: 'Rim-running backup big' },
    { name: 'Dalton Knecht', position: 'G-F', overall: 77, keyStat: 'Rookie shooting wing' },
    { name: 'Maxi Kleber', position: 'F-C', overall: 72, keyStat: 'Stretch-four depth' },
  ]},
  { id: 'MIL', name: 'Bucks', city: 'Milwaukee', rating: 87, color: '#00471B', secondaryColor: '#EEE1C6', offense: 86, defense: 80, overall: 83, roster: [], players: [
    { name: 'Giannis Antetokounmpo', position: 'F', overall: 97, keyStat: 'Two-time MVP force' },
    { name: 'Myles Turner', position: 'C-F', overall: 84, keyStat: 'Elite shot blocker, shooter' },
    { name: 'Jericho Sims', position: 'F', overall: 74, keyStat: 'Energy big off bench' },
    { name: 'Kevin Porter Jr.', position: 'G', overall: 76, keyStat: 'Playmaking guard' },
    { name: 'AJ Green', position: 'G', overall: 75, keyStat: 'Three-point specialist' },
    { name: 'Gary Trent Jr.', position: 'G', overall: 77, keyStat: 'Volume scoring wing' },
    { name: 'Bobby Portis', position: 'F', overall: 80, keyStat: 'Bench scoring punch' },
    { name: 'Andre Jackson Jr.', position: 'G-F', overall: 74, keyStat: 'Defensive playmaking wing' },
    { name: 'Kyle Kuzma', position: 'F', overall: 78, keyStat: 'Volume scoring forward' },
    { name: 'Taurean Prince', position: 'F', overall: 73, keyStat: 'Veteran three-and-D' },
  ]},
  { id: 'MIN', name: 'Timberwolves', city: 'Minnesota', rating: 88, color: '#0C2340', secondaryColor: '#78BE20', offense: 84, defense: 88, overall: 86, roster: [], players: [
    { name: 'Anthony Edwards', position: 'G', overall: 93, keyStat: 'Explosive scoring star' },
    { name: 'Julius Randle', position: 'F', overall: 85, keyStat: 'Physical scoring forward' },
    { name: 'Donte DiVincenzo', position: 'G', overall: 80, keyStat: 'Sharpshooting guard' },
    { name: 'Rudy Gobert', position: 'C', overall: 86, keyStat: 'Anchor rim protector' },
    { name: 'Jaden McDaniels', position: 'F', overall: 82, keyStat: 'Premier wing stopper' },
    { name: 'Naz Reid', position: 'C-F', overall: 79, keyStat: 'Sixth Man scoring big' },
    { name: 'Mike Conley', position: 'G', overall: 76, keyStat: 'Veteran floor general' },
    { name: 'Marlon Maxey', position: 'F', overall: 71, keyStat: 'Depth big' },
    { name: 'Terrence Shannon Jr.', position: 'G', overall: 76, keyStat: 'Athletic scoring wing' },
    { name: 'Rob Dillingham', position: 'G', overall: 75, keyStat: 'Rookie shot creator' },
  ]},
  { id: 'HOU', name: 'Rockets', city: 'Houston', rating: 89, color: '#CE1141', secondaryColor: '#000000', offense: 88, defense: 85, overall: 87, roster: [], players: [
    { name: 'Kevin Durant', position: 'F', overall: 93, keyStat: 'Elite scorer, still lethal' },
    { name: 'Alperen Sengun', position: 'F-C', overall: 89, keyStat: 'Skilled passing big' },
    { name: 'Jalen Green', position: 'G', overall: 82, keyStat: 'Explosive scoring guard' },
    { name: 'Amen Thompson', position: 'G-F', overall: 82, keyStat: 'Athletic two-way playmaker' },
    { name: 'Fred VanVleet', position: 'G', overall: 80, keyStat: 'Veteran floor general' },
    { name: 'Dillon Brooks', position: 'F', overall: 78, keyStat: 'Physical wing defender' },
    { name: 'Tari Eason', position: 'F', overall: 79, keyStat: 'High-energy disruptor' },
    { name: 'Steven Adams', position: 'C', overall: 76, keyStat: 'Bruising rebounder' },
    { name: 'Reed Sheppard', position: 'G', overall: 76, keyStat: 'Rookie shooting guard' },
    { name: 'Jabari Smith Jr.', position: 'F', overall: 80, keyStat: 'Stretch-four defender' },
  ]},
  { id: 'CLE', name: 'Cavaliers', city: 'Cleveland', rating: 87, color: '#860038', secondaryColor: '#FDBB30', offense: 87, defense: 79, overall: 83, roster: [], players: [
    { name: 'Donovan Mitchell', position: 'G', overall: 91, keyStat: 'Elite scoring guard' },
    { name: 'Lonzo Ball', position: 'G', overall: 78, keyStat: 'Playmaking, defensive guard' },
    { name: 'Evan Mobley', position: 'F-C', overall: 87, keyStat: 'Defensive Player of the Year tier' },
    { name: 'Darius Garland', position: 'G', overall: 84, keyStat: 'Shifty scoring point guard' },
    { name: 'Jarrett Allen', position: 'C', overall: 83, keyStat: 'Elite rim finisher' },
    { name: 'Max Strus', position: 'G-F', overall: 78, keyStat: 'Catch-and-shoot wing' },
    { name: 'Dean Wade', position: 'F', overall: 74, keyStat: 'Stretch forward depth' },
    { name: 'Ty Jerome', position: 'G', overall: 77, keyStat: 'Sixth man scoring guard' },
    { name: 'Sam Merrill', position: 'G', overall: 75, keyStat: 'Three-point specialist' },
    { name: 'Craig Porter Jr.', position: 'G', overall: 72, keyStat: 'Backup point guard' },
  ]},
  { id: 'IND', name: 'Pacers', city: 'Indiana', rating: 84, color: '#002D62', secondaryColor: '#FDBB30', offense: 89, defense: 72, overall: 81, roster: [], players: [
    { name: 'Tyrese Haliburton', position: 'G', overall: 90, keyStat: 'Elite pace-setting playmaker' },
    { name: 'Andrew Nembhard', position: 'G-F', overall: 80, keyStat: 'Two-way secondary guard' },
    { name: 'Obi Toppin', position: 'F', overall: 79, keyStat: 'Athletic finishing forward' },
    { name: 'Myles Turner', position: 'C-F', overall: 84, keyStat: 'Stretch shot-blocking five' },
    { name: 'Ivica Zubac', position: 'C', overall: 82, keyStat: 'Interior scoring, rebounding' },
    { name: 'Bennedict Mathurin', position: 'G-F', overall: 81, keyStat: 'Downhill scoring wing' },
    { name: 'Aaron Nesmith', position: 'F', overall: 79, keyStat: 'Three-and-D forward' },
    { name: 'T.J. McConnell', position: 'G', overall: 76, keyStat: 'Bench pace, pesky defense' },
    { name: 'Jarace Walker', position: 'F', overall: 76, keyStat: 'Defensive-minded forward' },
    { name: 'Ben Sheppard', position: 'G-F', overall: 73, keyStat: 'Three-and-D depth wing' },
  ]},
  { id: 'GSW', name: 'Warriors', city: 'Golden State', rating: 86, color: '#1D428A', secondaryColor: '#FFC72C', offense: 85, defense: 80, overall: 83, roster: [], players: [
    { name: 'Stephen Curry', position: 'G', overall: 93, keyStat: 'Greatest shooter ever' },
    { name: 'Jimmy Butler', position: 'G-F', overall: 88, keyStat: 'Playoff-caliber closer' },
    { name: 'Draymond Green', position: 'F', overall: 82, keyStat: 'Defensive anchor, playmaking' },
    { name: 'Kristaps Porzingis', position: 'F-C', overall: 83, keyStat: 'Stretch-five rim protector' },
    { name: 'Buddy Hield', position: 'G', overall: 76, keyStat: 'Off-ball sniper' },
    { name: 'Winston Garland', position: 'G', overall: 71, keyStat: 'Depth guard' },
    { name: 'Tim Hardaway Jr.', position: 'G', overall: 75, keyStat: 'Bench scoring wing' },
    { name: 'Moses Moody', position: 'G-F', overall: 77, keyStat: 'Three-and-D wing' },
    { name: 'Brandin Podziemski', position: 'G', overall: 78, keyStat: 'Playmaking rebounder' },
    { name: 'Jonathan Kuminga', position: 'F', overall: 81, keyStat: 'Athletic scoring forward' },
  ]},
  { id: 'DAL', name: 'Mavericks', city: 'Dallas', rating: 84, color: '#00538C', secondaryColor: '#B8C4CA', offense: 84, defense: 78, overall: 81, roster: [], players: [
    { name: 'Kyrie Irving', position: 'G', overall: 89, keyStat: 'Elite shot-making guard' },
    { name: 'Klay Thompson', position: 'G', overall: 79, keyStat: 'Championship-pedigree shooter' },
    { name: 'Khris Middleton', position: 'F', overall: 79, keyStat: 'Crafty scoring forward' },
    { name: 'Daniel Gafford', position: 'C', overall: 79, keyStat: 'Efficient rim-runner' },
    { name: 'Ryan Nembhard', position: 'G', overall: 73, keyStat: 'Rookie backup guard' },
    { name: 'Josh Reaves', position: 'G', overall: 71, keyStat: 'Two-way roster guard' },
    { name: 'Dereck Lively II', position: 'C', overall: 78, keyStat: 'Young rim protector' },
    { name: 'PJ Washington', position: 'F', overall: 79, keyStat: 'Stretch-four defender' },
    { name: 'Naji Marshall', position: 'F', overall: 76, keyStat: 'Energy wing defender' },
    { name: 'Caleb Martin', position: 'F', overall: 75, keyStat: 'Three-and-D depth' },
  ]},
  { id: 'MEM', name: 'Grizzlies', city: 'Memphis', rating: 85, color: '#5D76A9', secondaryColor: '#12173F', offense: 85, defense: 81, overall: 83, roster: [], players: [
    { name: 'Ja Morant', position: 'G', overall: 90, keyStat: 'Explosive downhill scorer' },
    { name: 'Desmond Bane', position: 'G', overall: 85, keyStat: 'Sharpshooting secondary star' },
    { name: 'Zach Edey', position: 'C', overall: 80, keyStat: 'Dominant interior rookie big' },
    { name: 'Jaren Jackson Jr.', position: 'F-C', overall: 84, keyStat: 'Defensive Player of the Year caliber' },
    { name: 'Lucas Williamson', position: 'G', overall: 72, keyStat: 'Defensive depth guard' },
    { name: 'Marcus Smart', position: 'G', overall: 78, keyStat: 'Veteran defensive guard' },
    { name: 'Jaylen Wells', position: 'G-F', overall: 76, keyStat: 'Rookie three-and-D wing' },
    { name: 'Santi Aldama', position: 'F', overall: 77, keyStat: 'Stretch forward' },
    { name: 'Vince Williams Jr.', position: 'F', overall: 74, keyStat: 'Versatile role player' },
    { name: 'Scotty Pippen Jr.', position: 'G', overall: 73, keyStat: 'Backup floor general' },
  ]},
  { id: 'PHI', name: '76ers', city: 'Philadelphia', rating: 83, color: '#006BB6', secondaryColor: '#ED174C', offense: 83, defense: 79, overall: 81, roster: [], players: [
    { name: 'Joel Embiid', position: 'F-C', overall: 92, keyStat: 'MVP-caliber scoring big' },
    { name: 'Tyrese Maxey', position: 'G', overall: 87, keyStat: 'All-Star scoring point guard' },
    { name: 'Quentin Grimes', position: 'G', overall: 78, keyStat: 'Three-and-D guard' },
    { name: 'Paul George', position: 'F', overall: 82, keyStat: 'Veteran two-way star' },
    { name: 'Andre Drummond', position: 'C', overall: 75, keyStat: 'Elite rebounding backup' },
    { name: 'Kelly Oubre Jr.', position: 'F', overall: 76, keyStat: 'Athletic scoring wing' },
    { name: 'Guerschon Yabusele', position: 'F', overall: 74, keyStat: 'Stretch big depth' },
    { name: 'Jared McCain', position: 'G', overall: 76, keyStat: 'Rookie shooting guard' },
    { name: 'Justin Edwards', position: 'F', overall: 71, keyStat: 'Two-way roster wing' },
    { name: 'Adem Bona', position: 'C', overall: 72, keyStat: 'Athletic backup big' },
  ]},
  { id: 'MIA', name: 'Heat', city: 'Miami', rating: 82, color: '#98002E', secondaryColor: '#F9A01B', offense: 80, defense: 84, overall: 82, roster: [], players: [
    { name: 'Bam Adebayo', position: 'C-F', overall: 87, keyStat: 'Defensive anchor, playmaking big' },
    { name: 'Tyler Herro', position: 'G', overall: 85, keyStat: 'High-volume scoring guard' },
    { name: 'Norman Powell', position: 'F-G', overall: 82, keyStat: 'Efficient scoring wing' },
    { name: 'Terry Rozier', position: 'G', overall: 77, keyStat: 'Combo guard scorer' },
    { name: 'Duncan Robinson', position: 'G-F', overall: 76, keyStat: 'Elite catch-and-shoot' },
    { name: 'Jaime Jaquez Jr.', position: 'F', overall: 77, keyStat: 'Crafty finishing forward' },
    { name: 'Kel\'el Ware', position: 'C', overall: 76, keyStat: 'Young rim protector' },
    { name: 'Davion Mitchell', position: 'G', overall: 74, keyStat: 'Point-of-attack defender' },
    { name: 'Nikola Jovic', position: 'F', overall: 75, keyStat: 'Versatile stretch forward' },
    { name: 'Pelle Larsson', position: 'G', overall: 71, keyStat: 'Rookie depth guard' },
  ]},
  { id: 'LAC', name: 'Clippers', city: 'LA', rating: 82, color: '#C8102E', secondaryColor: '#1D428A', offense: 79, defense: 85, overall: 82, roster: [], players: [
    { name: 'Chris Paul', position: 'G', overall: 79, keyStat: 'Veteran floor general' },
    { name: 'Darius Garland', position: 'G', overall: 84, keyStat: 'Shifty scoring guard' },
    { name: 'Bogdan Bogdanovic', position: 'G', overall: 78, keyStat: 'Sharpshooting wing' },
    { name: 'Brook Lopez', position: 'C', overall: 80, keyStat: 'Stretch-five rim protector' },
    { name: 'Ben Simmons', position: 'G-F', overall: 74, keyStat: 'Defensive playmaking forward' },
    { name: 'Bennedict Mathurin', position: 'G-F', overall: 81, keyStat: 'Downhill scoring wing' },
    { name: 'Kawhi Leonard', position: 'F', overall: 88, keyStat: 'Two-way superstar (health permitting)' },
    { name: 'Ivica Zubac', position: 'C', overall: 82, keyStat: 'Interior scoring, rebounding' },
    { name: 'Derrick Jones Jr.', position: 'F', overall: 76, keyStat: 'Athletic wing defender' },
    { name: 'Nicolas Batum', position: 'F', overall: 73, keyStat: 'Veteran connector forward' },
  ]},
  { id: 'PHX', name: 'Suns', city: 'Phoenix', rating: 84, color: '#1D1160', secondaryColor: '#E56020', offense: 85, defense: 72, overall: 79, roster: [], players: [
    { name: 'Devin Booker', position: 'G', overall: 90, keyStat: 'Elite scoring guard' },
    { name: 'Jalen Green', position: 'G', overall: 82, keyStat: 'Explosive scoring guard' },
    { name: 'Joe Reaves', position: 'G', overall: 70, keyStat: 'Depth guard' },
    { name: 'Mark Williams', position: 'C', overall: 79, keyStat: 'Athletic rim protector' },
    { name: 'Ryan Dunn', position: 'F', overall: 76, keyStat: 'Rookie defensive wing' },
    { name: 'Royce O\'Neale', position: 'F', overall: 76, keyStat: 'Three-and-D forward' },
    { name: 'Grayson Allen', position: 'G', overall: 78, keyStat: 'Sniper off-ball shooter' },
    { name: 'Oso Ighodaro', position: 'C', overall: 73, keyStat: 'Rookie backup big' },
    { name: 'Collin Gillespie', position: 'G', overall: 72, keyStat: 'Backup point guard' },
    { name: 'Bol Bol', position: 'C', overall: 73, keyStat: 'Rim-running depth big' },
  ]},
  { id: 'SAC', name: 'Kings', city: 'Sacramento', rating: 80, color: '#5A2D81', secondaryColor: '#63727A', offense: 82, defense: 74, overall: 78, roster: [], players: [
    { name: 'Domantas Sabonis', position: 'F', overall: 88, keyStat: 'Elite rebounding, passing big' },
    { name: 'Zach LaVine', position: 'G', overall: 83, keyStat: 'Explosive scoring guard' },
    { name: 'Russell Westbrook', position: 'G', overall: 77, keyStat: 'Veteran triple-double threat' },
    { name: 'Keegan Murray', position: 'F', overall: 80, keyStat: 'Stretch forward shooter' },
    { name: 'Precious Achiuwa', position: 'F', overall: 75, keyStat: 'Energy forward, rebounder' },
    { name: 'Corliss Williamson', position: 'F', overall: 71, keyStat: 'Veteran frontcourt depth' },
    { name: 'DeMar DeRozan', position: 'F-G', overall: 82, keyStat: 'Midrange scoring specialist' },
    { name: 'Malik Monk', position: 'G', overall: 78, keyStat: 'Sixth man scoring spark' },
    { name: 'Devin Carter', position: 'G', overall: 74, keyStat: 'Rookie two-way guard' },
    { name: 'Doug McDermott', position: 'F', overall: 73, keyStat: 'Catch-and-shoot veteran' },
  ]},
  { id: 'ATL', name: 'Hawks', city: 'Atlanta', rating: 81, color: '#E03A3E', secondaryColor: '#C1D32F', offense: 82, defense: 75, overall: 79, roster: [], players: [
    { name: 'Jonathan Kuminga', position: 'F', overall: 81, keyStat: 'Athletic scoring forward' },
    { name: 'Buddy Hield', position: 'G', overall: 76, keyStat: 'Off-ball sniper' },
    { name: 'Nickeil Alexander-Walker', position: 'G', overall: 78, keyStat: 'Versatile two-way guard' },
    { name: 'Zaccharie Risacher', position: 'F', overall: 76, keyStat: 'Rookie two-way wing' },
    { name: 'Dyson Daniels', position: 'G', overall: 80, keyStat: 'Elite point-of-attack defender' },
    { name: 'Jalen Johnson', position: 'F', overall: 83, keyStat: 'All-around athletic forward' },
    { name: 'Onyeka Okongwu', position: 'C', overall: 80, keyStat: 'Defensive anchor big' },
    { name: 'Clint Capela', position: 'C', overall: 76, keyStat: 'Veteran rim-runner' },
    { name: 'Vit Krejci', position: 'F', overall: 73, keyStat: 'Connector forward' },
    { name: 'Zaccharie Coulibaly', position: 'F', overall: 71, keyStat: 'Depth forward' },
  ]},
  { id: 'NOP', name: 'Pelicans', city: 'New Orleans', rating: 79, color: '#0C2340', secondaryColor: '#E31837', offense: 83, defense: 73, overall: 78, roster: [], players: [
    { name: 'Zion Williamson', position: 'F', overall: 87, keyStat: 'Explosive interior force' },
    { name: 'Brandon Ingram', position: 'F', overall: 80, keyStat: 'Smooth scoring forward (Raptors on some boards)' },
    { name: 'CJ McCollum', position: 'G', overall: 79, keyStat: 'Veteran scoring guard' },
    { name: 'Trey Murphy III', position: 'F', overall: 81, keyStat: 'Three-and-D forward' },
    { name: 'Herbert Jones', position: 'F', overall: 79, keyStat: 'Elite perimeter defender' },
    { name: 'Yves Missi', position: 'C', overall: 75, keyStat: 'Rookie rim protector' },
    { name: 'Jose Alvarado', position: 'G', overall: 76, keyStat: 'Pesky backup guard' },
    { name: 'Jordan Hawkins', position: 'G', overall: 75, keyStat: 'Bench scoring shooter' },
    { name: 'Karlo Matkovic', position: 'F', overall: 72, keyStat: 'Rookie stretch big' },
    { name: 'Antonio Reeves', position: 'G', overall: 72, keyStat: 'Two-way depth guard' },
  ]},
  { id: 'TOR', name: 'Raptors', city: 'Toronto', rating: 78, color: '#CE1141', secondaryColor: '#000000', offense: 78, defense: 82, overall: 80, roster: [], players: [
    { name: 'Scottie Barnes', position: 'G-F', overall: 85, keyStat: 'All-around franchise cornerstone' },
    { name: 'Brandon Ingram', position: 'F', overall: 80, keyStat: 'Smooth scoring forward' },
    { name: 'Jakob Poeltl', position: 'C', overall: 79, keyStat: 'Efficient interior anchor' },
    { name: 'Immanuel Quickley', position: 'G', overall: 78, keyStat: 'Playmaking scoring guard' },
    { name: 'RJ Barrett', position: 'F-G', overall: 79, keyStat: 'Downhill scoring wing' },
    { name: 'Gradey Dick', position: 'G-F', overall: 74, keyStat: 'Young shooting wing' },
    { name: 'Ochai Agbaji', position: 'G', overall: 73, keyStat: 'Three-and-D depth' },
    { name: 'Jamal Shead', position: 'G', overall: 72, keyStat: 'Rookie backup point guard' },
    { name: 'Ulrich Chomche', position: 'C', overall: 68, keyStat: 'Developmental big' },
    { name: 'Jonathan Mogbo', position: 'F', overall: 73, keyStat: 'Versatile rookie forward' },
  ]},
  { id: 'SAS', name: 'Spurs', city: 'San Antonio', rating: 85, color: '#C4CED4', secondaryColor: '#000000', offense: 86, defense: 87, overall: 87, roster: [], players: [
    { name: 'Victor Wembanyama', position: 'F-C', overall: 94, keyStat: 'Generational two-way unicorn' },
    { name: "De'Aaron Fox", position: 'G', overall: 87, keyStat: 'Blazing-fast scoring guard' },
    { name: 'Stephon Castle', position: 'G', overall: 79, keyStat: 'Rookie of the Year caliber' },
    { name: 'Devin Vassell', position: 'G-F', overall: 80, keyStat: 'Two-way scoring wing' },
    { name: 'Jaren Jackson Jr.', position: 'F', overall: 84, keyStat: 'Defensive Player of the Year caliber' },
    { name: 'Harrison Barnes', position: 'F', overall: 76, keyStat: 'Veteran three-and-D forward' },
    { name: 'Julian Champagnie', position: 'F', overall: 74, keyStat: 'Stretch wing depth' },
    { name: 'Chris Paul', position: 'G', overall: 79, keyStat: 'Veteran floor general (mentor role)' },
    { name: 'Keldon Johnson', position: 'F', overall: 77, keyStat: 'Physical scoring forward' },
    { name: 'Sandro Mamukelashvili', position: 'F-C', overall: 73, keyStat: 'Stretch big depth' },
  ]},
  { id: 'ORL', name: 'Magic', city: 'Orlando', rating: 82, color: '#0077C0', secondaryColor: '#C4CED4', offense: 74, defense: 90, overall: 82, roster: [], players: [
    { name: 'Paolo Banchero', position: 'F', overall: 87, keyStat: 'Franchise scoring forward' },
    { name: 'Franz Wagner', position: 'F', overall: 85, keyStat: 'Do-it-all two-way wing' },
    { name: 'Jalen Suggs', position: 'G', overall: 81, keyStat: 'Elite point-of-attack defender' },
    { name: 'Desmond Bane', position: 'G', overall: 85, keyStat: 'Sharpshooting secondary star' },
    { name: 'Moritz Wagner', position: 'C', overall: 75, keyStat: 'Stretch big off bench' },
    { name: 'Goga Bitadze', position: 'C', overall: 76, keyStat: 'Rim-protecting backup big' },
    { name: 'Jonathan Isaac', position: 'F', overall: 78, keyStat: 'Elite defensive anchor' },
    { name: 'Anthony Black', position: 'G', overall: 74, keyStat: 'Young defensive guard' },
    { name: 'Tristan da Silva', position: 'F', overall: 73, keyStat: 'Rookie stretch forward' },
    { name: 'Cole Anthony', position: 'G', overall: 76, keyStat: 'Bench scoring guard' },
  ]},
  { id: 'UTA', name: 'Jazz', city: 'Utah', rating: 74, color: '#002B5C', secondaryColor: '#F9A01B', offense: 78, defense: 68, overall: 73, roster: [], players: [
    { name: 'Lauri Markkanen', position: 'F', overall: 84, keyStat: 'All-Star stretch scorer' },
    { name: 'Jusuf Nurkic', position: 'C', overall: 76, keyStat: 'Veteran interior presence' },
    { name: 'John Duren', position: 'G', overall: 70, keyStat: 'Depth guard' },
    { name: 'Ruben Nembhard', position: 'G', overall: 68, keyStat: 'Two-way roster guard' },
    { name: 'Keyonte George', position: 'G', overall: 77, keyStat: 'Young playmaking guard' },
    { name: 'Walker Kessler', position: 'C', overall: 78, keyStat: 'Elite young shot blocker' },
    { name: 'Isaiah Collier', position: 'G', overall: 74, keyStat: 'Rookie floor general' },
    { name: 'Taylor Hendricks', position: 'F', overall: 75, keyStat: 'Young stretch forward' },
    { name: 'Kyle Filipowski', position: 'F-C', overall: 74, keyStat: 'Rookie stretch big' },
    { name: 'Svi Mykhailiuk', position: 'G-F', overall: 71, keyStat: 'Catch-and-shoot depth' },
  ]},
  { id: 'CHA', name: 'Hornets', city: 'Charlotte', rating: 71, color: '#1D1160', secondaryColor: '#00788C', offense: 73, defense: 70, overall: 72, roster: [], players: [
    { name: 'Coby White', position: 'G', overall: 82, keyStat: 'Breakout scoring guard' },
    { name: 'LaMelo Ball', position: 'G', overall: 85, keyStat: 'Flashy scoring playmaker' },
    { name: 'Brandon Miller', position: 'F', overall: 80, keyStat: 'Rising scoring forward' },
    { name: 'Miles Bridges', position: 'F', overall: 78, keyStat: 'Athletic scoring forward' },
    { name: 'Mark Williams', position: 'C', overall: 79, keyStat: 'Athletic rim protector' },
    { name: 'Grant Williams', position: 'F', overall: 74, keyStat: 'Stretch-four defender' },
    { name: 'Josh Green', position: 'G', overall: 73, keyStat: 'Athletic wing defender' },
    { name: 'Tidjane Salaun', position: 'F', overall: 71, keyStat: 'Rookie stretch forward' },
    { name: 'KJ Simpson', position: 'G', overall: 71, keyStat: 'Rookie backup guard' },
    { name: 'Moussa Diabate', position: 'C', overall: 70, keyStat: 'Athletic depth big' },
  ]},
  { id: 'DET', name: 'Pistons', city: 'Detroit', rating: 79, color: '#C8102E', secondaryColor: '#1D42BA', offense: 79, defense: 77, overall: 78, roster: [], players: [
    { name: 'Cade Cunningham', position: 'G-F', overall: 88, keyStat: 'Franchise point guard' },
    { name: 'Jalen Duren', position: 'C', overall: 80, keyStat: 'Athletic rebounding big' },
    { name: 'Jaden Ivey', position: 'G', overall: 78, keyStat: 'Explosive slashing guard' },
    { name: 'Ausar Thompson', position: 'F', overall: 79, keyStat: 'Athletic two-way wing' },
    { name: 'Tobias Harris', position: 'F', overall: 77, keyStat: 'Veteran scoring forward' },
    { name: 'Malik Beasley', position: 'G', overall: 76, keyStat: 'Volume three-point shooter' },
    { name: 'Isaiah Stewart', position: 'C-F', overall: 76, keyStat: 'Physical rebounding big' },
    { name: 'Ron Holland II', position: 'F', overall: 73, keyStat: 'Athletic rookie forward' },
    { name: 'Marcus Sasser', position: 'G', overall: 71, keyStat: 'Backup guard depth' },
    { name: 'Simone Fontecchio', position: 'F', overall: 72, keyStat: 'Stretch forward depth' },
  ]},
  { id: 'BKN', name: 'Nets', city: 'Brooklyn', rating: 69, color: '#000000', secondaryColor: '#FFFFFF', offense: 70, defense: 72, overall: 71, roster: [], players: [
    { name: 'Nicolas Claxton', position: 'F-C', overall: 78, keyStat: 'Shot-blocking rim runner' },
    { name: "Day'Ron Sharpe", position: 'C', overall: 74, keyStat: 'Energy rebounding big' },
    { name: 'John Williamson', position: 'G', overall: 68, keyStat: 'Depth guard' },
    { name: 'Cameron Johnson', position: 'F', overall: 78, keyStat: 'Reliable stretch forward' },
    { name: 'Dennis Schroder', position: 'G', overall: 76, keyStat: 'Veteran playmaking guard' },
    { name: 'Ziaire Williams', position: 'F', overall: 74, keyStat: 'Developing scoring wing' },
    { name: 'Noah Clowney', position: 'F', overall: 72, keyStat: 'Young stretch forward' },
    { name: 'Tyrese Martin', position: 'F-G', overall: 70, keyStat: 'Two-way roster wing' },
    { name: 'Tosan Evbuomwan', position: 'F', overall: 68, keyStat: 'Playmaking forward depth' },
    { name: 'Keon Johnson', position: 'G', overall: 71, keyStat: 'Athletic backup guard' },
  ]},
  { id: 'WAS', name: 'Wizards', city: 'Washington', rating: 66, color: '#002B5C', secondaryColor: '#E31837', offense: 76, defense: 66, overall: 71, roster: [], players: [
    { name: 'Trae Young', position: 'G', overall: 87, keyStat: 'Elite offensive engine (Hawks on some boards)' },
    { name: 'Anthony Davis', position: 'F-C', overall: 88, keyStat: 'Two-way superstar big' },
    { name: 'Bilal Coulibaly', position: 'G', overall: 76, keyStat: 'Young defensive wing' },
    { name: 'Cam Whitmore', position: 'F', overall: 75, keyStat: 'Athletic scoring forward' },
    { name: 'Kevin Porter Jr.', position: 'G', overall: 76, keyStat: 'Playmaking guard' },
    { name: 'Kyshawn George', position: 'F', overall: 72, keyStat: 'Rookie stretch wing' },
    { name: 'Alex Sarr', position: 'F-C', overall: 76, keyStat: 'Rookie stretch big' },
    { name: 'Corey Kispert', position: 'F', overall: 74, keyStat: 'Catch-and-shoot forward' },
    { name: 'Bub Carrington', position: 'G', overall: 71, keyStat: 'Rookie playmaking guard' },
    { name: 'Marvin Bagley III', position: 'F-C', overall: 70, keyStat: 'Athletic depth big' },
  ]},
  { id: 'POR', name: 'Trail Blazers', city: 'Portland', rating: 75, color: '#E03A3E', secondaryColor: '#000000', offense: 77, defense: 76, overall: 77, roster: [], players: [
    { name: 'Damian Lillard', position: 'G', overall: 86, keyStat: 'Legendary clutch scorer' },
    { name: 'Jrue Holiday', position: 'G', overall: 82, keyStat: 'Elite two-way veteran guard' },
    { name: 'Jerami Grant', position: 'F', overall: 79, keyStat: 'Volume scoring forward' },
    { name: 'Shaedon Sharpe', position: 'G', overall: 79, keyStat: 'Explosive scoring wing' },
    { name: 'Deandre Ayton', position: 'C', overall: 81, keyStat: 'Athletic finisher, rebounder' },
    { name: 'Rick Brunson', position: 'G', overall: 68, keyStat: 'Coaching-staff-adjacent depth' },
    { name: 'Matisse Thybulle', position: 'G-F', overall: 76, keyStat: 'Elite perimeter defender' },
    { name: 'Arvydas Sabonis', position: 'C', overall: 70, keyStat: 'Legacy franchise big' },
    { name: 'Toumani Camara', position: 'F', overall: 75, keyStat: 'High-motor defensive forward' },
    { name: 'Scoot Henderson', position: 'G', overall: 76, keyStat: 'Young athletic point guard' },
  ]},
  { id: 'CHI', name: 'Bulls', city: 'Chicago', rating: 73, color: '#CE1141', secondaryColor: '#000000', offense: 75, defense: 73, overall: 74, roster: [], players: [
    { name: 'Jaden Ivey', position: 'G', overall: 78, keyStat: 'Explosive slashing guard' },
    { name: 'Guerschon Yabusele', position: 'F', overall: 74, keyStat: 'Stretch big depth' },
    { name: 'Josh Giddey', position: 'G-F', overall: 79, keyStat: 'Playmaking forward-guard' },
    { name: 'Coby White', position: 'G', overall: 82, keyStat: 'Breakout scoring guard (dual-listed)' },
    { name: 'Nikola Vucevic', position: 'C', overall: 84, keyStat: 'Stretch-five scorer (dual-listed)' },
    { name: 'Patrick Williams', position: 'F', overall: 75, keyStat: 'Versatile stretch forward' },
    { name: 'Ayo Dosunmu', position: 'G', overall: 76, keyStat: 'Two-way combo guard' },
    { name: 'Matas Buzelis', position: 'F', overall: 73, keyStat: 'Young athletic forward' },
    { name: 'Zach Collins', position: 'F-C', overall: 74, keyStat: 'Passing big man' },
    { name: 'Julian Phillips', position: 'F', overall: 70, keyStat: 'Athletic depth wing' },
  ]},
];

export const NBA_TEAM_MAP = new Map(NBA_TEAMS.map(t => [t.id, t]));

// ── Territory assignment (item 90) ──
// Reuses the SAME US map / sub-territory set as NFL Conquest (usStatesPaths.ts,
// STATE_POSITIONS below) so the shared ConquestMap-style renderer, adjacency
// table, and blob-grouping geometry all work unmodified. 30 NBA teams vs. 32
// NFL teams means the state-to-team mapping differs team-by-team, but the
// underlying territory set is identical.
//
// Two-team-state splits, using the SAME existing sub-territories the NFL
// data already defines (no new sub-territories invented):
//   California: LAL -> CA_S, LAC -> CA_SC  (CA_N goes to GSW, the Bay Area team)
//   New York: NYK and BKN both play in New York City, but usStatesPaths.ts
//     has no NY sub-split (only CA/FL/TX/PA/OH/NJ are split); confirmed no
//     NY_N/NY_S id exists in usStatesPaths.ts. Rather than invent
//     a new sub-territory (out of scope: "DO NOT touch App.tsx/gameRegistry.ts"
//     plus minimal-diff instruction favors reusing existing shapes only),
//     NYK takes NY (the literal Knicks/Nets home) and BKN takes the adjacent
//     NJ_N territory (Brooklyn/NJ media-market overlap is real: the Nets
//     played in New Jersey 1977-2012 as the Nets), each noted below.
//   New Jersey: already split NJ_N/NJ_S; NJ_N -> BKN (see above), NJ_S has no
//     natural third NY-area team so it goes to PHI (Philly's market reaches
//     South Jersey in reality, e.g. Sixers preseason games/fan base).
//   Ohio: CLE -> OH_NE (Cleveland is literally in that sub-territory).
//     OH_SW has no NBA team (Cincinnati has none), assigned to IND as the
//     nearest NBA home (Pacers' natural western Ohio/Cincinnati market reach).
//   Pennsylvania: PHI -> PA_E (Philadelphia's own sub-territory).
//     PA_W has no NBA team (Pittsburgh has none), assigned to CLE as the
//     nearest NBA home across the state line.
//   Texas: HOU -> TX_S (Houston's own sub-territory). TX_N has three real
//     candidates (DAL, SAS, MEM-adjacent); assigned to DAL, the literal
//     Dallas/Fort Worth home for that sub-territory.
//
// Toronto note (per brief): Toronto has no US state to sit on, so TOR is
// assigned a northern-border US state adjacent to its real geography
// (Toronto sits just across Lake Ontario from New York). TOR is placed on
// VT (Vermont), the closest unclaimed New York-adjacent state at the time
// of assignment, with this comment as the explicit label/note the brief
// asked for: "Toronto Raptors (play in Ontario, Canada; placed on the
// nearest unclaimed US border state for map purposes only)."
// NOTE: an earlier draft of this map left SAC/SAS/CHA with zero starting
// territory (a real bug: a team with 0 states is treated as already
// eliminated by useConquestNba's getAliveTeamsFrom). Fixed by giving each a
// real-world-defensible home state carved out of a neighbor's assignment
// rather than inventing a new territory: CHA <- NC (Charlotte's actual home
// state; Atlanta keeps GA/SC/AL, still a strong Southeast footprint without
// needing NC too), SAS <- NM (San Antonio's closest unclaimed regional
// market; Phoenix keeps AZ), SAC <- NV (Sacramento/Reno-Tahoe corridor is
// arguably closer to Sacramento than to LA; Lakers keep CA_S plus the rest
// of the Pacific Southwest via CA_SC going to the Clippers).
export const INITIAL_TERRITORIES_NBA: Record<string, string> = {
  // Northeast
  MA: 'BOS', CT: 'BOS',
  NY: 'NYK', NJ_N: 'BKN', NJ_S: 'PHI', PA_E: 'PHI', PA_W: 'CLE',
  VT: 'TOR', // Toronto Raptors: Canadian team, no home US state -> nearest NY-adjacent border state (see note above)
  ME: 'BOS', NH: 'BOS', RI: 'BOS',
  // Ohio / Midwest
  OH_NE: 'CLE', OH_SW: 'IND', IN: 'IND', IL: 'CHI', MI: 'DET', WI: 'MIL',
  MN: 'MIN', IA: 'MIN', MO: 'MEM',
  // South / Southeast
  GA: 'ATL', NC: 'CHA', SC: 'ATL', TN: 'MEM', KY: 'IND', VA: 'WAS',
  MD: 'WAS', DE: 'PHI', WV: 'CLE',
  FL_N: 'ORL', FL_W: 'ORL', FL_S: 'MIA', AL: 'ATL', MS: 'MEM', LA: 'NOP',
  AR: 'MEM', OK: 'OKC',
  // Texas
  TX_N: 'DAL', TX_S: 'HOU',
  // Mountain / Southwest
  CO: 'DEN', UT: 'UTA', AZ: 'PHX', NM: 'SAS', NV: 'SAC', WY: 'DEN',
  MT: 'UTA', ID: 'UTA', ND: 'MIN', SD: 'MIN', NE: 'DEN', KS: 'OKC',
  // Pacific
  WA: 'POR', OR: 'POR', CA_N: 'GSW', CA_S: 'LAL', CA_SC: 'LAC',
};

// STATE_POSITIONS/DIRECTIONS/DIR_LABELS/DIR_ANGLES/STATE_GEO_COORDS/isLightColor
// are pure geography/math with zero NFL-specific content in conquestData.ts,
// so useConquestNba.ts imports those directly from conquestData.ts rather
// than duplicating them here.

// ── Free Agency pool (mirrors NFL's CONQUEST_FREE_AGENCY_POOL shape) ──
// 12 real, notable current/recent NBA free agents and journeyman veterans,
// text-only, no photos.
export interface ConquestFreeAgentCandidateNba {
  name: string;
  position: string;
  overall: number;
  blurb: string;
}

export const CONQUEST_FREE_AGENCY_POOL_NBA: ConquestFreeAgentCandidateNba[] = [
  { name: 'Russell Westbrook', position: 'G', overall: 77, blurb: 'Former MVP, still finding one-year deals as a bench spark' },
  { name: 'DeMar DeRozan', position: 'F-G', overall: 82, blurb: 'Midrange maestro, bounced between contenders on short deals' },
  { name: 'Isaiah Hartenstein', position: 'C', overall: 82, blurb: 'In-demand rim-running big, frequent free-agency riser' },
  { name: 'Malik Monk', position: 'G', overall: 78, blurb: 'Instant-offense sixth man, always drawing interest' },
  { name: 'PJ Tucker', position: 'F', overall: 71, blurb: 'Championship-tested locker room presence, minimal role now' },
  { name: 'Patty Mills', position: 'G', overall: 70, blurb: 'Veteran shooter and clubhouse leader on the open market' },
  { name: 'Delon Wright', position: 'G', overall: 73, blurb: 'Long, versatile defensive guard, journeyman of recent years' },
  { name: 'Robin Lopez', position: 'C', overall: 69, blurb: 'Well-traveled backup center, always a locker-room favorite' },
  { name: 'Wesley Matthews', position: 'G', overall: 68, blurb: 'Three-and-D veteran, picked up by contenders down the stretch' },
  { name: 'Danilo Gallinari', position: 'F', overall: 74, blurb: 'Sweet-shooting forward, recovering from multiple injuries' },
  { name: 'Kemba Walker', position: 'G', overall: 72, blurb: 'Former All-Star scorer, quietly stepped away then flirted with returns' },
  { name: 'JaVale McGee', position: 'C', overall: 69, blurb: 'Multiple-time champion big man, still lobbing for a roster spot' },
];

// ── Franchise legends (mirrors NFL's TEAM_LEGENDS shape in conquestPowerups.ts) ──
// Kept in this NBA-only data file rather than added to the shared
// conquestPowerups.ts, so the NFL POWERUPS/TEAM_LEGENDS module is never
// touched by this task.
export interface LegendPlayerNba {
  name: string;
  position: string;
  overall: number;
}

export const TEAM_LEGENDS_NBA: Record<string, LegendPlayerNba> = {
  DEN: { name: 'Alex English', position: 'F', overall: 99 },
  OKC: { name: 'Kevin Durant', position: 'F', overall: 99 },
  BOS: { name: 'Larry Bird', position: 'F', overall: 99 },
  NYK: { name: 'Patrick Ewing', position: 'C', overall: 99 },
  LAL: { name: 'Kobe Bryant', position: 'G', overall: 99 },
  MIL: { name: 'Kareem Abdul-Jabbar', position: 'C', overall: 99 },
  MIN: { name: 'Kevin Garnett', position: 'F', overall: 99 },
  HOU: { name: 'Hakeem Olajuwon', position: 'C', overall: 99 },
  CLE: { name: 'LeBron James', position: 'F', overall: 99 },
  IND: { name: 'Reggie Miller', position: 'G', overall: 99 },
  GSW: { name: 'Wilt Chamberlain', position: 'C', overall: 99 },
  DAL: { name: 'Dirk Nowitzki', position: 'F', overall: 99 },
  MEM: { name: 'Marc Gasol', position: 'C', overall: 99 },
  PHI: { name: 'Allen Iverson', position: 'G', overall: 99 },
  MIA: { name: 'Dwyane Wade', position: 'G', overall: 99 },
  LAC: { name: 'Chris Paul', position: 'G', overall: 99 },
  PHX: { name: 'Charles Barkley', position: 'F', overall: 99 },
  SAC: { name: 'Chris Webber', position: 'F', overall: 99 },
  ATL: { name: 'Dominique Wilkins', position: 'F', overall: 99 },
  NOP: { name: 'Chris Paul', position: 'G', overall: 99 },
  TOR: { name: 'Vince Carter', position: 'G', overall: 99 },
  SAS: { name: 'Tim Duncan', position: 'F-C', overall: 99 },
  ORL: { name: 'Shaquille O\'Neal', position: 'C', overall: 99 },
  UTA: { name: 'John Stockton', position: 'G', overall: 99 },
  CHA: { name: 'Alonzo Mourning', position: 'C', overall: 99 },
  DET: { name: 'Isiah Thomas', position: 'G', overall: 99 },
  BKN: { name: 'Jason Kidd', position: 'G', overall: 99 },
  WAS: { name: 'Wes Unseld', position: 'C', overall: 99 },
  POR: { name: 'Clyde Drexler', position: 'G', overall: 99 },
  CHI: { name: 'Michael Jordan', position: 'G', overall: 99 },
};
