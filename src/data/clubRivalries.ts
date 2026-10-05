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

/* Sourced pairs. Filled from the Round 1012 research; see the header. */
export const CLUB_RIVALRIES: ClubRivalry[] = [
];

/* PRIMARY_RIVAL keys whose edge has no sourced pair in CLUB_RIVALRIES yet.
   A ratchet, in the style of RAW_RANDOM_BASELINE: it may only shrink, and a
   key whose pair gets sourced must leave the list (simCareerDerbies section
   1 fails on either). */
export const PRIMARY_RIVAL_UNSOURCED: readonly string[] = [
];

/** Every sourced row that names this canonical club. */
export function rivalriesOf(canonicalName: string): ClubRivalry[] {
  return CLUB_RIVALRIES.filter(r => r.a === canonicalName || r.b === canonicalName);
}
