/* Round 1012: one table of real club rivalries, read by two games.

   This is a leaf module on purpose: it imports nothing at runtime, so the
   Soccer Career binding (src/lib/soccerCareerDerby.ts) and Club Manager can
   both read it without the engine and careerEras cycle trap coming back
   (careerEras.ts explains that trap).

   PRIMARY_RIVAL is Club Manager's old RIVALS table, moved here unchanged from
   src/lib/clubManager.ts. Club Manager imports it back under its old name, so
   its derby week headline and its "Finish above X" board objective read
   exactly what they read before. simCareerDerbies section 2 hashes it against
   the copy recorded before the move.

   CLUB_RIVALRIES is the sourced list Soccer Career plays. Every row carries
   two sources from two different publishers, never a wiki, and the date they
   were checked. A pair two sources could not back is not in the list. Names
   are canonical: Club Manager's spelling where Club Manager has the club,
   otherwise Soccer Career's. SC_CLUB_CANON maps the Soccer Career spellings
   that differ. Club Manager does not read CLUB_RIVALRIES yet; that would move
   its board objectives and is its own round. */

export type RivalryKind = 'derby' | 'rivalry';

export interface RivalrySource {
  publisher: string;
  title: string;
  url: string;
}

export interface ClubRivalry {
  a: string;
  b: string;
  /** The common English name, no dashes other than a hyphen. */
  name: string;
  /** 'derby' for a city or regional derby, 'rivalry' for a national one. */
  kind: RivalryKind;
  /** Exactly two, from two different publishers. */
  sources: RivalrySource[];
  /** The date the two sources were read, YYYY-MM-DD. */
  checked: string;
}

/**
 * Real rivalries for the "finish above them" board objective. One direction
 * per club; clubs without a famous league rival get the nearest-strength
 * club instead (see buildBoardObjectives).
 */
export const PRIMARY_RIVAL: Record<string, string> = {
  // England
  'Arsenal': 'Tottenham', 'Tottenham': 'Arsenal', 'Manchester United': 'Liverpool',
  'Liverpool': 'Everton', 'Everton': 'Liverpool', 'Manchester City': 'Manchester United',
  'Chelsea': 'Arsenal', 'Newcastle': 'Sunderland', 'Sunderland': 'Newcastle',
  'Crystal Palace': 'Brighton',
  'Brighton': 'Crystal Palace', 'Fulham': 'Chelsea',
  'Brentford': 'Fulham', 'Leeds United': 'Manchester United', 'Nottingham Forest': 'Leeds United',
  // Spain
  'Real Madrid': 'Barcelona', 'Barcelona': 'Real Madrid', 'Atlético Madrid': 'Real Madrid',
  'Sevilla': 'Real Betis', 'Real Betis': 'Sevilla', 'Athletic Club': 'Real Sociedad',
  'Real Sociedad': 'Athletic Club', 'Espanyol': 'Barcelona', 'Girona': 'Barcelona',
  'Valencia': 'Levante', 'Levante': 'Valencia', 'Villarreal': 'Valencia',
  'Alavés': 'Athletic Club', 'Getafe': 'Rayo Vallecano', 'Rayo Vallecano': 'Atlético Madrid',
  // Italy
  'Inter Milan': 'AC Milan', 'AC Milan': 'Inter Milan', 'Juventus': 'Inter Milan',
  'Torino': 'Juventus', 'Roma': 'Lazio', 'Lazio': 'Roma', 'Napoli': 'Juventus',
  'Fiorentina': 'Juventus', 'Pisa': 'Fiorentina', 'Bologna': 'Fiorentina',
  // Germany
  'Bayern Munich': 'Borussia Dortmund', 'Borussia Dortmund': 'Bayern Munich',
  'Gladbach': 'Köln', 'Köln': 'Gladbach', 'Hamburg': 'Werder Bremen', 'Werder Bremen': 'Hamburg',
  'St. Pauli': 'Hamburg', 'Eintracht Frankfurt': 'Mainz', 'Mainz': 'Eintracht Frankfurt',
  'Bayer Leverkusen': 'Köln', 'Freiburg': 'Stuttgart', 'Stuttgart': 'Freiburg',
  'Union Berlin': 'RB Leipzig',
  // France
  'PSG': 'Marseille', 'Marseille': 'PSG', 'Lyon': 'Marseille', 'Nice': 'Monaco',
  'Monaco': 'Nice', 'Lens': 'Lille', 'Lille': 'Lens', 'Rennes': 'Nantes', 'Nantes': 'Rennes',
  'Brest': 'Lorient', 'Lorient': 'Brest', 'Strasbourg': 'Metz', 'Metz': 'Strasbourg',
  'Paris FC': 'PSG',
  // Round 72: new-league rivalries
  'Hull City': 'Leeds United',
  'Wolves': 'West Brom', 'West Brom': 'Wolves', 'Cardiff City': 'Swansea City',
  'Swansea City': 'Cardiff City', 'Portsmouth': 'Southampton', 'Southampton': 'Portsmouth',
  'West Ham': 'Millwall', 'Millwall': 'West Ham', 'Blackburn Rovers': 'Burnley',
  'Burnley': 'Blackburn Rovers', 'Preston North End': 'Blackburn Rovers',
  'Bristol City': 'Cardiff City',
  'Al-Hilal': 'Al-Nassr', 'Al-Nassr': 'Al-Hilal', 'Al-Ittihad': 'Al-Ahli', 'Al-Ahli': 'Al-Ittihad',
  'Al-Shabab': 'Al-Hilal',
  'LA Galaxy': 'LAFC', 'LAFC': 'LA Galaxy', 'Inter Miami': 'Orlando City',
  'Orlando City': 'Inter Miami', 'New York City FC': 'New York Red Bulls',
  'New York Red Bulls': 'New York City FC', 'Seattle Sounders': 'Portland Timbers',
  'Portland Timbers': 'Seattle Sounders', 'Vancouver Whitecaps': 'Seattle Sounders',
  'FC Dallas': 'Houston Dynamo', 'Houston Dynamo': 'FC Dallas',
  'Columbus Crew': 'FC Cincinnati', 'FC Cincinnati': 'Columbus Crew',
  'D.C. United': 'New York Red Bulls', 'Toronto FC': 'CF Montréal', 'CF Montréal': 'Toronto FC',
  'Ajax': 'Feyenoord', 'Feyenoord': 'Ajax', 'PSV': 'Ajax', 'Sparta Rotterdam': 'Feyenoord',
  'Groningen': 'Heerenveen', 'Heerenveen': 'Groningen', 'ADO Den Haag': 'Ajax',
  // Round 883: Liga MX, only the five clasicos two sources both name
  // (Mediotiempo, "Que antiguedad tiene cada clasico del futbol mexicano",
  // and Goal, "En Mexico, cuantos clasicos de futbol existen"): Nacional
  // (America and Guadalajara), Joven (America and Cruz Azul), Capitalino
  // (Pumas and America), Tapatio (Guadalajara and Atlas), Regio (Monterrey
  // and Tigres). One direction per club, so America point at Guadalajara.
  'América': 'Guadalajara', 'Guadalajara': 'América', 'Cruz Azul': 'América',
  'Pumas UNAM': 'América', 'Atlas': 'Guadalajara',
  'Monterrey': 'Tigres UANL', 'Tigres UANL': 'Monterrey',
};

/** Soccer Career spelling to canonical spelling, only where the two games
 *  spell a club differently. Exact match only, the same rule and reason as
 *  CLUB_DATA_NAME in clubSquads.ts: a fuzzy match would pair the wrong club. */
export const SC_CLUB_CANON: Record<string, string> = {
  'Man City': 'Manchester City',
  'Man United': 'Manchester United',
  'Athletic Bilbao': 'Athletic Club',
  'Atletico Madrid': 'Atlético Madrid',
  'Dortmund': 'Borussia Dortmund',
  'Frankfurt': 'Eintracht Frankfurt',
  'Leipzig': 'RB Leipzig',
  'Leverkusen': 'Bayer Leverkusen',
  'Hertha Berlin': 'Hertha BSC',
  'Vitoria Guimaraes': 'Vitória Guimarães',
  'Sao Paulo': 'São Paulo',
  'Gremio': 'Grêmio',
  'Chivas': 'Guadalajara',
  'Club America': 'América',
  'Pumas': 'Pumas UNAM',
  'Al Hilal': 'Al-Hilal',
  'Al Nassr': 'Al-Nassr',
  'Al Ittihad': 'Al-Ittihad',
  'Al Ahli': 'Al-Ahli',
  'Al Shabab': 'Al-Shabab',
  'Fenerbahce': 'Fenerbahçe',
  'Besiktas': 'Beşiktaş',
};

/* Sourced pairs, all read on 2026-10-05. A pair whose clubs are not both in
   the same Soccer Career league today is kept anyway when both clubs exist in
   at least one of the two games: it stays dormant until a later round adds
   the missing club. Held for now, one strong source only or no common name
   for the fixture: Aston Villa and Birmingham City, Villarreal and Valencia,
   Bayer Leverkusen and Koln, Fiorentina and Juventus, Napoli and Juventus. */
export const CLUB_RIVALRIES: ClubRivalry[] = [
  // England
  { a: 'Arsenal', b: 'Tottenham', name: 'North London derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'ESPN', title: 'North London derby: History, stats for Tottenham-Arsenal', url: 'https://www.espn.com/soccer/story/_/id/41247087/north-london-derby-history-stats-tottenham-arsenal' },
    { publisher: 'Goal', title: 'Arsenal vs Tottenham: Everything you need to know about the north London derby', url: 'https://www.goal.com/en-us/news/north-london-derby-arsenal-tottenham-everything-you-need-to-know-/65ysonfwoofz1nhaq82x7nkoc' },
  ] },
  { a: 'Liverpool', b: 'Everton', name: 'Merseyside derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Liverpool FC', title: 'Which grounds have Merseyside derbies been played at?', url: 'https://www.liverpoolfc.com/news/which-grounds-have-merseyside-derbies-been-played' },
    { publisher: 'The Analyst', title: "Goodison Park's Final Derby: 130 Years of Merseyside Rivalry in Numbers", url: 'https://theanalyst.com/articles/everton-vs-liverpool-merseyside-derby-goodison-park' },
  ] },
  { a: 'Manchester City', b: 'Manchester United', name: 'Manchester derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Sports Illustrated', title: 'Man Utd vs. Man City: Complete Head-to-Head Record', url: 'https://www.si.com/soccer/manchester-city-vs-manchester-united-complete-head-to-head-record' },
    { publisher: 'The Sporting News (on Yahoo Sports)', title: 'Man United vs. Man City history, head to head: All-time records in Manchester derby', url: 'https://sports.yahoo.com/articles/man-united-vs-man-city-185000803.html' },
  ] },
  { a: 'Liverpool', b: 'Manchester United', name: 'North West derby', kind: 'rivalry', checked: '2026-10-05', sources: [
    { publisher: 'FBref', title: 'North West Derby History Liverpool vs. Manchester United Historical Head-to-Head', url: 'https://fbref.com/en/stathead/matchup/teams/822bd0ba/19538871/North-West-Derby-Liverpool-vs-Manchester-United-History' },
    { publisher: 'Goal', title: 'Are Liverpool the biggest rivals for Manchester United?', url: 'https://www.goal.com/en-us/news/are-liverpool-the-biggest-rivals-for-manchester-united/pw1pwl5czf3w1k2gfl2l39fha' },
  ] },
  { a: 'Crystal Palace', b: 'Brighton', name: 'M23 derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Football Ground Guide', title: 'Brighton vs. Crystal Palace rivalry: M23 derby origin, history and head-to-head record', url: 'https://footballgroundguide.com/news/brighton-vs-crystal-palace-rivalry-m23-derby-origin-history-and-head-to-head-record.html' },
    { publisher: 'NationalWorld', title: 'Why are Brighton and Crystal Palace rivals? M23 derby explained', url: 'https://www.nationalworld.com/sport/football/why-are-brighton-and-crystal-palace-rivals-m23-derby-explained-3398190' },
  ] },
  { a: 'Chelsea', b: 'Tottenham', name: 'London derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Chelsea FC', title: 'Tottenham vs Chelsea: Fixture history and London derby record up for grabs', url: 'https://www.chelseafc.com/en/news/article/tottenham-vs-chelsea-fixture-history-and-london-derby-record-up-for-grabs' },
    { publisher: 'Goal', title: 'Tottenham vs Chelsea London derby: History, games and players who played for both clubs', url: 'https://www.goal.com/en/news/tottenham-vs-chelsea-london-derby-history-games--players-who-played-for-both-clubs/xajnbyec4o2s1at4t59jly1c7' },
  ] },
  { a: 'Arsenal', b: 'Chelsea', name: 'London derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Sky Sports', title: 'Arsenal 2-1 Chelsea: comeback win for champions in pulsating London derby', url: 'https://www.skysports.com/football/news/11095/13571847/arsenal-2-1-chelsea-kai-havertz-and-martin-odegaard-secure-comeback-win-for-champions-in-pulsating-london-derby' },
    { publisher: 'ESPN', title: 'Title hopes of Chelsea, Arsenal make for wildly entertaining London derby draw', url: 'https://www.espn.com/soccer/story/_/id/47153486/chelseaarsenal-premier-league-title-hopes-make-wildly-entertaining-london-derby' },
  ] },
  { a: 'Chelsea', b: 'Fulham', name: 'West London derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: '90min', title: 'West London derby: Teams involved, most wins and memorable matches', url: 'https://www.90min.com/posts/west-london-derby-teams-involved-most-wins-memorable-matches' },
    { publisher: 'West London Sport', title: 'The Rich History of the West London Derby: Fulham vs. Chelsea', url: 'https://www.westlondonsport.com/sport/the-rich-history-of-the-west-london-derby-fulham-vs-chelsea' },
  ] },
  { a: 'Brentford', b: 'Fulham', name: 'West London derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Brentford FC', title: 'Match report: Brentford 0 Fulham 0, a west London derby', url: 'https://www.brentfordfc.com/en/news/article/match-reports-brentford-0-fulham-0-premier-league-18-04-2026' },
    { publisher: 'Sky Sports', title: 'Fulham 3-1 Brentford: Cottagers win third straight west London derby', url: 'https://www.skysports.com/football/news/11661/13432900/fulham-3-1-brentford-harry-wilson-stars-again-as-cottagers-win-third-straight-west-london-derby' },
  ] },
  { a: 'West Ham', b: 'Tottenham', name: 'London derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Goal', title: 'West Ham v Tottenham: A most unusual rivalry', url: 'https://www.goal.com/en/news/west-ham-v-tottenham-a-most-unusual-rivalry/bltd05f5aded655b431' },
    { publisher: 'Bleacher Report', title: 'West Ham United Vs. Tottenham Hotspur: A Brief History of the London Rivalry', url: 'https://bleacherreport.com/articles/639764-west-ham-united-vs-tottenham-hotspur-a-rivalry-written-in-history-and-violence' },
  ] },
  { a: 'Aston Villa', b: 'Wolves', name: 'West Midlands derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Sky Sports', title: 'Aston Villa 3-1 Wolves: late show settles West Midlands Premier League derby', url: 'https://www.skysports.com/football/news/11661/13217321/aston-villa-3-1-wolves-jhon-duran-strikes-again-as-late-show-settles-west-midlands-premier-league-derby' },
    { publisher: 'NBC Sports', title: 'Wolves 2-0 Aston Villa: 20th-place Wolves get Midlands derby win', url: 'https://www.nbcsports.com/soccer/news/wolves-vs-aston-villa-recap-final-score-video-highlights-analysis' },
  ] },
  { a: 'Newcastle', b: 'Sunderland', name: 'Tyne-Wear derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'My Football Facts', title: 'Tyne-Wear Derby: Head-to-Head History and Overview', url: 'https://www.myfootballfacts.com/premier-league/tyne-wear-derby-head-to-head-history-overview-newcastle-united-vs-sunderland/' },
    { publisher: 'Sports Mole', title: 'Newcastle vs. Sunderland: Head-to-head record and past meetings in Tyne-Wear derby', url: 'https://www.sportsmole.co.uk/football/sunderland/tyne-wear-derby/head-to-head/sunderland-vs-newcastle-head-to-head-record-and-past-meetings_587719.html' },
  ] },
  { a: 'Wolves', b: 'West Brom', name: 'Black Country derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Wolves', title: 'Old Gold: ten moments that define the Black Country derby', url: 'https://www.wolves.co.uk/news/features/20240124-old-gold-ten-moments-that-define-the-black-country-derby/' },
    { publisher: 'Shropshire Star', title: 'Last 5 Black Country derbies as Wolves-West Brom dates revealed', url: 'https://www.shropshirestar.com/sport/football/wolverhampton-wanderers/last-5-black-country-derbies-as-wolves-west-brom-dates-revealed-8760918' },
  ] },
  { a: 'West Ham', b: 'Millwall', name: 'Dockers derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'beIN Sports', title: 'West Ham Relegated From Premier League as the Dockers Derby Returns After 14 Years', url: 'https://www.beinsports.com/en-us/soccer/premier-league/articles/west-ham-relegated-from-premier-league-as-the-dockers-derby-returns-after-14-years-2026-05-24' },
    { publisher: 'GiveMeSport', title: 'West Ham United vs Millwall: Biggest rivalries in world football', url: 'https://www.givemesport.com/west-ham-united-vs-millwall-biggest-rivalries-in-world-football-here-is-what-you-need-to-know/' },
  ] },
  { a: 'Norwich City', b: 'Ipswich Town', name: 'East Anglian derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Pink Un', title: 'Decade of East Anglian Derby dominance for Norwich', url: 'https://www.pinkun.com/sport/norwich-city/decade-of-east-nglian-erby-dominance-for-norwich-6500712' },
    { publisher: 'Flashscore', title: 'Derby Week: Ipswich Town vs Norwich City, the duel for East Anglian pride', url: 'https://www.flashscoreusa.com/news/soccer-championship-derby-week-ipswich-town-vs-norwich-city-the-duel-for-east-anglian-pride/lYZz0AQr/' },
  ] },
  { a: 'Manchester United', b: 'Leeds United', name: 'Roses rivalry', kind: 'rivalry', checked: '2026-10-05', sources: [
    { publisher: 'The Yorkshire Post', title: 'Roses rivalry? Leeds United motivated enough even without Manchester United task, says Daniel Farke', url: 'https://www.yorkshirepost.co.uk/sport/football/leeds-united/roses-rivalry-leeds-united-motivated-enough-even-without-manchester-united-task-says-daniel-farke-6570391' },
    { publisher: 'Arizona State University', title: 'A Rivalry of Roses? An analysis of the Manchester United vs. Leeds United football rivalry', url: 'https://keep.lib.asu.edu/items/160967' },
  ] },
  // Spain
  { a: 'Real Madrid', b: 'Barcelona', name: 'El Clasico', kind: 'rivalry', checked: '2026-10-05', sources: [
    { publisher: 'beIN Sports', title: 'Everything You Need to Know About El Clasico Between Real Madrid and Barcelona', url: 'https://www.beinsports.com/en-us/soccer/la-liga/articles/everything-you-need-to-know-about-el-cl%C3%A1sico-between-real-madrid-and-barcelona-2025-10-21' },
    { publisher: 'The Sporting News (on Yahoo Sports)', title: 'Real Madrid vs. Barcelona history: El Clasico all-time head to head', url: 'https://ca.sports.yahoo.com/news/real-madrid-vs-barcelona-history-100900932.html' },
  ] },
  { a: 'Real Madrid', b: 'Atlético Madrid', name: 'Madrid derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'LaLiga', title: 'El Derbi de Madrid', url: 'https://www.laliga.com/en-GB/partidazos/el-derbi-de-madrid' },
    { publisher: '90min', title: "Real Madrid vs Atletico Madrid: Spain's ferocious capital derby", url: 'https://www.90min.com/posts/real-madrid-vs-atletico-madrid-spain-ferocious-capital-derby' },
  ] },
  { a: 'Sevilla', b: 'Real Betis', name: 'El Gran Derbi', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'LaLiga', title: 'Sevilla FC vs Real Betis head-to-head record: who has won more times?', url: 'https://www.laliga.com/en-GB/news/el-gran-derbi-a-history-of-real-betis-vs-sevilla-fc' },
    { publisher: 'Football Espana', title: 'El Gran Derbi: A history of Sevilla and Real Betis', url: 'https://www.football-espana.net/2022/02/26/el-gran-derbi-a-history-of-sevilla-real-betis' },
  ] },
  { a: 'Athletic Club', b: 'Real Sociedad', name: 'Basque derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'LaLiga', title: 'Derby stats and curiosities of the Basque derby', url: 'https://www.laliga.com/en-GB/news/derby-stats-and-curiosities-of-the-basque-derby' },
    { publisher: 'Football Espana', title: 'Athletic Club vs Real Sociedad: A history of the Basque Derby', url: 'https://www.football-espana.net/2024/01/13/athletic-club-vs-real-sociedad-a-history-of-the-basque-derby' },
  ] },
  { a: 'Barcelona', b: 'Girona', name: 'Catalan derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'FC Barcelona', title: 'FC Barcelona 4-1 Girona FC: Derby victory', url: 'https://www.fcbarcelona.com/en/news/4241205/fc-barcelona-4-1-girona-fc-derby-victory' },
    { publisher: 'Catalan News', title: 'Barca wins against Girona with last minute goal at Catalan derby in Montjuic', url: 'https://www.catalannews.com/sports/item/barca-girona-game-league-18-october-2025-catalan-derby' },
  ] },
  { a: 'Barcelona', b: 'Espanyol', name: 'Barcelona derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'LaLiga', title: 'FC Barcelona vs. RCD Espanyol: LALIGA Derby Statistics', url: 'https://www.laliga.com/en-GB/news/statistics-fc-barcelona-rcd-espanyol' },
    { publisher: 'FC Barcelona', title: 'The Lowdown on the derby against Espanyol', url: 'https://www.fcbarcelona.com/en/news/4158957/the-lowdown-on-the-derby-against-espanyol' },
  ] },
  { a: 'Celta Vigo', b: 'Deportivo La Coruña', name: 'Galician derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'The National', title: 'Galician derby glory over Celta Vigo offers Deportivo La Coruna ray of light', url: 'https://www.thenationalnews.com/sport/galician-derby-glory-over-celta-vigo-offers-deportivo-la-coruna-ray-of-light-1.470302' },
    { publisher: 'Sportskeeda', title: 'The Galician Derby: Celta Vigo take on relegated Deportivo La Coruna', url: 'https://www.sportskeeda.com/football/the-galician-derby-the-last-one-for-a-while-as-celta-vigo-take-on-relegated-deportivo-la-coruna-1' },
  ] },
  { a: 'Valencia', b: 'Levante', name: 'Valencia derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'elDiario.es', title: 'Cinco datos y curiosidades historicas del derbi valenciano de futbol', url: 'https://www.eldiario.es/spin/deportes/cinco-datos-curiosidades-historicas-derbi-valenciano-futbol-valencia-levante-laliga-pm_1_12785107.html' },
    { publisher: '7 Televalencia', title: 'Vuelve el Valencia-Levante: los datos de un derbi de primera', url: 'https://7televalencia.com/vuelve-valencia-levante-derbi-valenciano/' },
  ] },
  // Italy
  { a: 'AC Milan', b: 'Inter Milan', name: 'Derby della Madonnina', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Inter', title: 'Inter vs AC Milan: origins, heroes and records from the derby', url: 'https://www.inter.it/en/news/inter-ac-milan-origins-heroes-records-guide-derby' },
    { publisher: 'Flashscore', title: 'AC Milan - Inter: The most memorable matches from Derby della Madonnina history', url: 'https://www.flashscore.com/news/ac-milan-inter-the-most-memorable-matches-from-derby-della-madonnina-history/zLW83mht/' },
  ] },
  { a: 'Juventus', b: 'Torino', name: 'Derby della Mole', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Juventus', title: 'Great Juventus moments in the Derby Della Mole', url: 'https://www.juventus.com/en/news/articles/great-moments-juventus-derby-della-mole' },
    { publisher: 'My Football Facts', title: 'Derby della Mole Head-to-Head', url: 'https://www.myfootballfacts.com/top-leagues/serie%20a/derby-della-mole-head-to-head-torino-vs-juventus-history-stats/' },
  ] },
  { a: 'Juventus', b: 'Inter Milan', name: "Derby d'Italia", kind: 'rivalry', checked: '2026-10-05', sources: [
    { publisher: 'ESPN', title: "Derby d'Italia: The infamous Inter-Juventus rivalry", url: 'https://www.espn.com/soccer/story/_/id/37389114/infamous-inter-juventus-rivalry' },
    { publisher: '90min', title: 'Inter vs Juventus: The Rivalry at the Heart of Italian Football', url: 'https://www.90min.com/posts/inter-vs-juventus-the-rivalry-at-the-heart-of-italian-football-01e9fsbz2cn0' },
  ] },
  { a: 'Roma', b: 'Napoli', name: 'Derby del Sole', kind: 'rivalry', checked: '2026-10-05', sources: [
    { publisher: 'FBref', title: 'Derby del Sole History Napoli vs. Roma Historical Head-to-Head', url: 'https://fbref.com/en/stathead/matchup/teams/d48ad4ff/cf74a709/Derby-del-Sole-Napoli-vs-Roma-History' },
    { publisher: 'La Gazzetta Italiana', title: 'Calcio: Derby Del Sole', url: 'https://www.lagazzettaitaliana.com/sports/9949-calcio-derby-del-sole' },
  ] },
  { a: 'Bologna', b: 'Fiorentina', name: "Derby dell'Appennino", kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Quotidiano Sportivo', title: 'Bologna-Fiorentina 1-2, the Apennine derby goes to Fiorentina', url: 'https://sport.quotidiano.net/en/calcio/bologna/bologna-fiorentina-1-2-derby-appennino-viola-fa06aad1' },
    { publisher: 'Il Primato Nazionale', title: "Bologna-Fiorentina, il derby dell'Appennino", url: 'https://www.ilprimatonazionale.it/sport/bologna-fiorentina-il-derby-appennino-243568' },
  ] },
  { a: 'Roma', b: 'Lazio', name: 'Derby della Capitale', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'World Football Index (on OneFootball)', title: 'A Brief History Of The Derby Della Capitale Ahead Of Roma vs Lazio Clash', url: 'https://onefootball.com/en/news/a-brief-history-of-the-derby-della-capitale-ahead-of-roma-vs-lazio-clash-28891985' },
    { publisher: 'My Football Facts', title: 'Derby della Capitale Head-to-Head', url: 'https://www.myfootballfacts.com/top-leagues/serie-a/derby-della-capitale-head-to-head-as-roma-vs-lazio-history-stats' },
  ] },
  // Germany
  { a: 'Bayern Munich', b: 'Borussia Dortmund', name: 'Der Klassiker', kind: 'rivalry', checked: '2026-10-05', sources: [
    { publisher: 'Bundesliga', title: 'Borussia Dortmund vs. Bayern Munich: The top 5 matches in Der Klassiker history', url: 'https://www.bundesliga.com/en/bundesliga/news/bayern-munich-vs-borussia-dortmund-top-5-matches-in-klassiker-history-reus-lewandowski-3242' },
    { publisher: 'FourFourTwo', title: 'Why Borussia Dortmund vs Bayern Munich matters: a brief history of Der Klassiker', url: 'https://www.fourfourtwo.com/features/bayern-munich-borussia-dortmund-bundesliga-der-klassiker-history-rivalry-derby-head-to-head-statistics-title-wins' },
  ] },
  { a: 'Borussia Dortmund', b: 'Schalke 04', name: 'Revierderby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Bundesliga', title: 'Get set for the return of the Revierderby between Borussia Dortmund and Schalke', url: 'https://www.bundesliga.com/en/bundesliga/news/revierderby-return-borussia-dortmund-schalke-2026-27-37946' },
    { publisher: 'ESPN', title: "Schalke's Bundesliga return revives Revierderby, arguably the biggest and most genuine rivalry in Germany", url: 'https://www.espn.com/soccer/story/_/id/37631994/schalke-bundesliga-return-revives-revierderby-arguably-biggest-most-genuine-rivalry-germany' },
  ] },
  { a: 'Werder Bremen', b: 'Hamburg', name: 'Nordderby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Bundesliga', title: 'Hamburg vs. Werder Bremen: A history of the Nordderby', url: 'https://www.bundesliga.com/en/2bundesliga/news/hamburg-vs-werder-bremen-a-history-of-the-nordderby-19024' },
    { publisher: 'Deichstube', title: 'Werder Bremen gegen HSV: Kurios, spektakulaer, historisch', url: 'https://www.deichstube.de/news/werder-bremen-gegen-hsv-legendaerste-nordderby-momente-spiele-geschichte-svw-hamburger-sv-bundesliga-zr-94264632.html' },
  ] },
  { a: 'Hertha BSC', b: 'Union Berlin', name: 'Berlin derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Union Berlin', title: 'Derby Day in Berlin', url: 'https://www.fc-union-berlin.de/en/news/derby-day-in-berlin-VZXKG' },
    { publisher: 'Bundesliga', title: 'The biggest soccer derbies and rivalries in the Bundesliga: Klassiker, Revierderby and more', url: 'https://www.bundesliga.com/en/bundesliga/news/biggest-soccer-derbies-in-germany-klassiker-revierderby-oldest-rivalries-7578' },
  ] },
  { a: 'Köln', b: 'Gladbach', name: 'Rhine derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Bundesliga', title: 'The biggest soccer derbies and rivalries in the Bundesliga: Klassiker, Revierderby and more', url: 'https://www.bundesliga.com/en/bundesliga/news/biggest-soccer-derbies-in-germany-klassiker-revierderby-oldest-rivalries-7578' },
    { publisher: 'Bulinews', title: 'FC Koln vs. Borussia Monchengladbach preview: Rhine derby bragging rights up for grabs', url: 'https://bulinews.com/koln-borussia-monchengladbach-preview-rhine-derby-bragging-rights-for-grabs' },
  ] },
  { a: 'Stuttgart', b: 'Karlsruhe', name: 'Baden-Württemberg derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Goal', title: 'KSC gegen VfB, Baden gegen Schwaben: Woher kommt die Rivalitaet?', url: 'https://www.goal.com/de/meldungen/ksc-gegen-vfb-baden-gegen-schwaben-woher-kommt-die-rivalit%C3%A4t/blt0b058609d87c06f4' },
    { publisher: 'Karlsruher SC', title: 'Matchfacts: Alles Wissenswerte zum 50. baden-wuerttembergischen Derby', url: 'https://www.ksc.de/profis/saison/news/show/article/matchfacts-alles-wissenswerte-zum-50-baden-wuerttembergischen-derby/' },
  ] },
  // France
  { a: 'PSG', b: 'Marseille', name: 'Le Classique', kind: 'rivalry', checked: '2026-10-05', sources: [
    { publisher: 'beIN Sports', title: 'PSG vs Marseille: The History Behind Le Classique', url: 'https://www.beinsports.com/en-us/soccer/ligue-1/articles/psg-vs-marseille-the-history-behind-le-classique-2026-09-17' },
    { publisher: 'France 24', title: "'Le Classique', French football's fallen icon", url: 'https://www.france24.com/en/20190316-classique-french-football-psg-marseille-ligue-1' },
  ] },
  { a: 'Monaco', b: 'Nice', name: "Cote d'Azur derby", kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'AS Monaco', title: "The 100th Cote d'Azur derby is Monegasque!", url: 'https://www.asmonaco.com/en/news/the-100th-cote-dazur-derby-is-monegasque' },
    { publisher: 'Flashscore', title: 'Nice take derby spoils against Monaco as Laborde nets winner in tempestuous affair', url: 'https://www.flashscore.com/news/nice-monaco-report-2024-10-27/AFauaJ7F/' },
  ] },
  { a: 'Lyon', b: 'Marseille', name: 'Choc des Olympiques', kind: 'rivalry', checked: '2026-10-05', sources: [
    { publisher: 'FBref', title: 'Choc des Olympiques History Lyon vs. Marseille Historical Head-to-Head', url: 'https://fbref.com/en/stathead/matchup/teams/d53c0b06/5725cc7b/Choc-des-Olympiques-Lyon-vs-Marseille-History' },
    { publisher: 'My Football Facts', title: 'Choc des Olympiques Head-to-Head', url: 'https://www.myfootballfacts.com/top-leagues/ligue-1/choc-des-olympiques-head-to-head-lyon-vs-marseille-history-stats/' },
  ] },
  { a: 'Lille', b: 'Lens', name: 'Derby du Nord', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Departement du Nord', title: 'Lille-Lens : les grands moments du derby du Nord', url: 'https://info.lenord.fr/lille-lens--les-grands-moments-du-derby-du-nord' },
    { publisher: 'Foot Sur 7', title: 'Derby du Nord Lens-Lille : bilan, records et matchs legendaires', url: 'https://www.foot-sur7.fr/784150-derby-du-nord-lens-lille-bilan' },
  ] },
  { a: 'Nantes', b: 'Rennes', name: 'Breton derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'ici (France Bleu)', title: 'Football en Bretagne : 20 ans de rivalites au plus haut niveau', url: 'https://www.ici.fr/sports/football/football-en-bretagne-20-ans-de-rivalite-au-plus-haut-niveau-1659537960' },
    { publisher: 'Foot Sur 7', title: 'Derby Nantes-Rennes : bilan, records et matchs legendaires', url: 'https://www.foot-sur7.fr/784043-derby-nantes-rennes-bilan' },
  ] },
  // Portugal
  { a: 'Benfica', b: 'Sporting CP', name: 'Lisbon derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'SL Benfica', title: 'Rivalry as old as the derby itself', url: 'https://www.slbenfica.pt/en-us/agora/noticias/2018-2019/08/24/futebol-benfica-historico-sporting-liga-nos-3-jornada-estadio-da-luz' },
    { publisher: 'Portugoal', title: 'Lisbon derby between Eagles and Lions: a century of passion between Benfica and Sporting', url: 'https://portugoal.net/classics-topmenu/3772-lisbon-derby-between-eagles-and-lions-a-century-of-passion-between-benfica-and-sporting' },
  ] },
  { a: 'Benfica', b: 'Porto', name: 'O Classico', kind: 'rivalry', checked: '2026-10-05', sources: [
    { publisher: 'My Football Facts', title: 'O Classico Head-to-Head: Benfica vs FC Porto History and Stats', url: 'https://www.myfootballfacts.com/top-leagues/liga-portugal/o-classico-head-to-head-benfica-vs-fc-porto-history-stats/' },
    { publisher: '90min', title: "Benfica vs Porto: A Classic Rivalry Between Portugal's Two Most Decorated Clubs", url: 'https://www.90min.com/posts/benfica-vs-porto-a-classic-rivalry-between-portugal-s-two-most-decorated-clubs-01e9bbx5ynpb' },
  ] },
  { a: 'Porto', b: 'Sporting CP', name: 'O Classico', kind: 'rivalry', checked: '2026-10-05', sources: [
    { publisher: 'My Football Facts', title: 'O Classico Head-to-Head: FC Porto vs Sporting CP', url: 'https://www.myfootballfacts.com/top-leagues/liga-portugal/o-classico-head-to-head-fc-porto-vs-sporting-cp-history-stats/' },
    { publisher: 'Football Ground Guide', title: 'Porto vs. Sporting rivalry: Origin, history, head-to-head record', url: 'https://footballgroundguide.com/news/porto-vs-sporting-rivalry-origin-history-head-to-head-record.html' },
  ] },
  { a: 'Braga', b: 'Vitória Guimarães', name: 'Minho derby', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'A Bola', title: 'SC Braga-V. Guimaraes: o derbi minhoto esta de volta!', url: 'https://www.abola.pt/futebol/jogo/sc-braga-vitoria-de-guimaraes-11216284/liveblog' },
    { publisher: 'Publico', title: 'No derby do Minho, Vitoria e Sp. Braga acabaram como comecaram', url: 'https://www.publico.pt/2025/02/16/desporto/noticia/derby-minho-vitoria-sp-braga-acabaram-comecaram-2122773' },
  ] },
  // Brazil
  { a: 'Corinthians', b: 'Palmeiras', name: 'Derby Paulista', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Corinthians', title: 'Historico do Derby: Corinthians x Palmeiras', url: 'https://www.corinthians.com.br/noticias/historico-do-derby-corinthians-x-palmeiras' },
    { publisher: 'Gazeta Esportiva', title: 'Relembre 12 grandes partidas da historia do Derby Paulista', url: 'https://www.gazetaesportiva.com/fotos/100-anos-de-derbys-veja-os-10-maiores-da-historia/' },
  ] },
  { a: 'Corinthians', b: 'São Paulo', name: 'Majestoso', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Lance!', title: 'Ha 90 anos, Corinthians e Sao Paulo jogavam o primeiro Majestoso', url: 'https://www.lance.com.br/futebol-nacional/anos-corinthians-sao-paulo-jogavam-primeiro-majestoso.html' },
    { publisher: 'Jovem Pan', title: 'Sao Paulo x Corinthians: os tabus que marcaram a historia do Majestoso', url: 'https://jovempan.com.br/esportes/futebol/sao-paulo-x-corinthians-os-tabus-que-marcaram-a-historia-do-majestoso/' },
  ] },
  { a: 'Palmeiras', b: 'São Paulo', name: 'Choque-Rei', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Sao Paulo FC', title: 'Choque-Rei: 300 jogos de historia', url: 'https://www.saopaulofc.net/choque-rei-300-jogos-de-historia/' },
    { publisher: 'Lance!', title: 'Choque-Rei: de onde vem o apelido de Palmeiras x Sao Paulo', url: 'https://www.lance.com.br/futebol-nacional/choque-rei-de-onde-vem-o-apelido-de-palmeiras-sao-paulo.html' },
  ] },
  { a: 'Santos', b: 'São Paulo', name: 'San-Sao', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Santos FC', title: 'Neste seculo o San domina o Sao', url: 'https://www.santosfc.com.br/neste-seculo-o-san-domina-o-sao/' },
    { publisher: 'Lance!', title: 'Sao Paulo x Santos: quem venceu mais o San-Sao?', url: 'https://www.lance.com.br/lancepedia/sao-paulo-santos-quem-venceu-mais-classicos.html' },
  ] },
  { a: 'Santos', b: 'Corinthians', name: 'Classico Alvinegro', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Goal', title: 'Corinthians x Santos: Quem venceu mais vezes o Classico Alvinegro?', url: 'https://www.goal.com/br/listas/corinthians-x-santos-quem-venceu-mais-vezes-classico-alvinegro/blt3cae65fc39880b5c' },
    { publisher: 'Terra', title: 'Corinthians x Santos: confira o retrospecto do classico alvinegro', url: 'https://www.terra.com.br/esportes/corinthians/corinthians-x-santos-confira-o-retrospecto-do-classico-alvinegro,b9a5ffe3060665179b8c64d6feba7de8fu2dsuny.html' },
  ] },
  { a: 'Santos', b: 'Palmeiras', name: 'Classico da Saudade', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Palmeiras', title: 'Trofeu Classico da Saudade', url: 'https://www.palmeiras.com.br/lightbox_galeria/trofeu-classico-da-saudade-2024/' },
    { publisher: 'Lance!', title: 'Palmeiras x Santos: quem venceu mais o Classico da Saudade?', url: 'https://www.lance.com.br/lancepedia/palmeiras-santos-quem-venceu-mais-classicos.html' },
  ] },
  { a: 'Flamengo', b: 'Botafogo', name: 'Classico da Rivalidade', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Lance!', title: 'Classico da Rivalidade: apelido do jogo entre Botafogo x Flamengo', url: 'https://www.lance.com.br/futebol-nacional/classico-da-rivalidade-de-onde-vem-o-apelido-de-botafogo-flamengo.html' },
    { publisher: 'Band', title: 'Botafogo x Flamengo: origem e curiosidades do Classico da Rivalidade', url: 'https://www.band.com.br/esportes/botafogo-x-flamengo-origem-e-curiosidades-do-classico-da-rivalidade-202510141804' },
  ] },
  { a: 'Flamengo', b: 'Fluminense', name: 'Fla-Flu', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Fluminense', title: 'Tricolor sai vencedor do primeiro Fla-Flu, em 1912', url: 'https://www.fluminense.com.br/noticia/tricolor-sai-vencedor-do-primeiro-fla-flu-em-1912' },
    { publisher: 'Goal', title: 'Flamengo x Fluminense: quem venceu mais, artilharia e curiosidades do Fla-Flu', url: 'https://www.goal.com/br/not%C3%ADcias/as-curiosidades-do-fla-flu-quem-mais-venceu-maior-goleada-artilheiros/pd32feyxtmut1x4m6eu7bnpkb' },
  ] },
  { a: 'Flamengo', b: 'Vasco da Gama', name: 'Classico dos Milhoes', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Flamengo', title: 'BuzzFla: Lembrancas do Classico dos Milhoes', url: 'https://www.flamengo.com.br/noticias/futebol/buzzfla--lembrancas-do-classico-dos-milhoes' },
    { publisher: 'Lance!', title: 'Flamengo x Vasco: quem venceu mais o Classico dos Milhoes?', url: 'https://www.lance.com.br/lancepedia/flamengo-vasco-uem-venceu-mais-classicos.html' },
  ] },
  { a: 'Botafogo', b: 'Fluminense', name: 'Classico Vovo', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Fluminense', title: '115 anos da goleada historica do Flu no Classico Vovo', url: 'https://www.fluminense.com.br/noticia/115-anos-da-goleada-historica-do-flu-no-classico-vovo' },
    { publisher: 'Lance!', title: 'Botafogo x Fluminense: quem venceu mais o Classico Vovo?', url: 'https://www.lance.com.br/lancepedia/botafogo-fluminense-quem-venceu-mais-classicos.html' },
  ] },
  { a: 'Fluminense', b: 'Vasco da Gama', name: 'Classico dos Gigantes', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Lance!', title: 'Classico dos Gigantes: o apelido do jogo de Fluminense x Vasco', url: 'https://www.lance.com.br/lancepedia/classico-dos-milhoes-de-onde-vem-o-apelido-de-fluminense-vasco.html' },
    { publisher: 'Terra', title: 'Classico de Gigantes: Fluminense e Vasco, grandes rivais!', url: 'https://www.terra.com.br/amp/story/esportes/classico-de-gigantes-fluminense-e-vasco-grandes-rivais,00f9b51fb4dadd78e08567c818e72ddfabnwigq1.html' },
  ] },
  { a: 'Grêmio', b: 'Internacional', name: 'Gre-Nal', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Internacional', title: 'Lista de todos os GreNais da historia', url: 'https://internacional.com.br/clube/grenais' },
    { publisher: 'Sportbuzz', title: 'Gremio e Internacional: conheca algumas curiosidades do Gre-nal', url: 'https://sportbuzz.com.br/futebol/2021/08/24/gremio-e-internacional-conheca-algumas-curiosidades-do-gre-nal/' },
  ] },
  { a: 'Cruzeiro', b: 'Atlético Mineiro', name: 'Classico Mineiro', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Olympics.com', title: 'Cruzeiro x Atletico-MG: relembre o historico dos rivais em classicos no seculo', url: 'https://www.olympics.com/pt/noticias/cruzeiro-atletico-mg-relembre-o-historico-dos-rivais-em-classicos-no-seculo' },
    { publisher: 'VAVEL Brasil', title: 'Cruzeiro x Atletico: relembre momentos do classico mineiro', url: 'https://www.vavel.com/br/futebol/2026/08/25/serie-a/1269060-cruzeiro-x-atletico-relembre-momentos-do-classico-mineiro.html' },
  ] },
  // Mexico: the five clasicos Round 883 two-sourced for Club Manager, re-read.
  { a: 'América', b: 'Guadalajara', name: 'Clasico Nacional', kind: 'rivalry', checked: '2026-10-05', sources: [
    { publisher: 'Mediotiempo', title: 'Que antiguedad tiene cada clasico del futbol mexicano?', url: 'https://www.mediotiempo.com/futbol/liga-mx/que-antiguedad-tiene-cada-clasico-del-futbol-mexicano' },
    { publisher: 'Goal', title: 'En Mexico, cuantos clasicos de futbol existen?', url: 'https://www.goal.com/es-mx/noticias/cuantos-clasicos-hay-mexico/ivx26cjdwgz41e0g2mkym9sgy' },
  ] },
  { a: 'América', b: 'Cruz Azul', name: 'Clasico Joven', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Mediotiempo', title: 'Que antiguedad tiene cada clasico del futbol mexicano?', url: 'https://www.mediotiempo.com/futbol/liga-mx/que-antiguedad-tiene-cada-clasico-del-futbol-mexicano' },
    { publisher: 'Goal', title: 'En Mexico, cuantos clasicos de futbol existen?', url: 'https://www.goal.com/es-mx/noticias/cuantos-clasicos-hay-mexico/ivx26cjdwgz41e0g2mkym9sgy' },
  ] },
  { a: 'América', b: 'Pumas UNAM', name: 'Clasico Capitalino', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Mediotiempo', title: 'Que antiguedad tiene cada clasico del futbol mexicano?', url: 'https://www.mediotiempo.com/futbol/liga-mx/que-antiguedad-tiene-cada-clasico-del-futbol-mexicano' },
    { publisher: 'Goal', title: 'En Mexico, cuantos clasicos de futbol existen?', url: 'https://www.goal.com/es-mx/noticias/cuantos-clasicos-hay-mexico/ivx26cjdwgz41e0g2mkym9sgy' },
  ] },
  { a: 'Monterrey', b: 'Tigres UANL', name: 'Clasico Regio', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Mediotiempo', title: 'Que antiguedad tiene cada clasico del futbol mexicano?', url: 'https://www.mediotiempo.com/futbol/liga-mx/que-antiguedad-tiene-cada-clasico-del-futbol-mexicano' },
    { publisher: 'Goal', title: 'En Mexico, cuantos clasicos de futbol existen?', url: 'https://www.goal.com/es-mx/noticias/cuantos-clasicos-hay-mexico/ivx26cjdwgz41e0g2mkym9sgy' },
  ] },
  { a: 'Guadalajara', b: 'Atlas', name: 'Clasico Tapatio', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'Mediotiempo', title: 'Que antiguedad tiene cada clasico del futbol mexicano?', url: 'https://www.mediotiempo.com/futbol/liga-mx/que-antiguedad-tiene-cada-clasico-del-futbol-mexicano' },
    { publisher: 'Goal', title: 'En Mexico, cuantos clasicos de futbol existen?', url: 'https://www.goal.com/es-mx/noticias/cuantos-clasicos-hay-mexico/ivx26cjdwgz41e0g2mkym9sgy' },
  ] },
  // Argentina: stored, never played until a league cadence is verified.
  { a: 'Boca Juniors', b: 'River Plate', name: 'Superclasico', kind: 'derby', checked: '2026-10-05', sources: [
    { publisher: 'ESPN', title: 'River Plate vs. Boca Juniors, a rivalry rooted in Argentine culture and history', url: 'https://www.espn.com/soccer/story/_/id/37412978/river-plate-vs-boca-juniors-rivalry-rooted-argentine-culture-history' },
    { publisher: 'World Soccer', title: "Football's Greatest Rivalries: River Plate v Boca Juniors", url: 'https://www.worldsoccer.com/world-soccer-latest/footballs-greatest-rivalries-river-plate-v-boca-juniors-366649' },
  ] },
];

/* PRIMARY_RIVAL keys whose edge has no sourced pair in CLUB_RIVALRIES yet.
   A ratchet, in the style of RAW_RANDOM_BASELINE: it may only shrink, and a
   key whose pair gets sourced must leave the list (simCareerDerbies section
   1 fails on either). */
export const PRIMARY_RIVAL_UNSOURCED: readonly string[] = [
  'Nottingham Forest', 'Villarreal', 'Alavés', 'Getafe', 'Rayo Vallecano', 'Napoli', 'Fiorentina', 'Pisa',
  'St. Pauli', 'Eintracht Frankfurt', 'Mainz', 'Bayer Leverkusen', 'Freiburg', 'Stuttgart', 'Union Berlin',
  'Brest', 'Lorient', 'Strasbourg', 'Metz', 'Paris FC', 'Hull City', 'Cardiff City', 'Swansea City',
  'Portsmouth', 'Southampton', 'Blackburn Rovers', 'Burnley', 'Preston North End', 'Bristol City',
  'Al-Hilal', 'Al-Nassr', 'Al-Ittihad', 'Al-Ahli', 'Al-Shabab', 'LA Galaxy', 'LAFC', 'Inter Miami',
  'Orlando City', 'New York City FC', 'New York Red Bulls', 'Seattle Sounders', 'Portland Timbers',
  'Vancouver Whitecaps', 'FC Dallas', 'Houston Dynamo', 'Columbus Crew', 'FC Cincinnati', 'D.C. United',
  'Toronto FC', 'CF Montréal', 'Ajax', 'Feyenoord', 'PSV', 'Sparta Rotterdam', 'Groningen', 'Heerenveen',
  'ADO Den Haag',
];

/** Every sourced row that names this canonical club. */
export function rivalriesOf(canonicalName: string): ClubRivalry[] {
  return CLUB_RIVALRIES.filter(r => r.a === canonicalName || r.b === canonicalName);
}
