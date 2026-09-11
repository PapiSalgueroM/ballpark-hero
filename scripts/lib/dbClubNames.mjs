/**
 * The market value table's club spellings, mapped to the Club Manager engine
 * names. Lifted out of scripts/bakeClubManagerRosters.mjs in Round 531 so the
 * players pool bake (scripts/bakePlayers.mjs) reads the same 2026-27
 * memberships instead of carrying a second copy: a club that moves league is
 * then fixed once, here, for both bakes. Every comment below is the roster
 * bake's own, with the verification it recorded.
 */
export const DB_TO_ENGINE = {
  // Premier League 2026-27
  'Arsenal FC': 'Arsenal', 'Aston Villa': 'Aston Villa', 'AFC Bournemouth': 'Bournemouth',
  'Brentford FC': 'Brentford', 'Brighton & Hove Albion': 'Brighton',
  'Chelsea FC': 'Chelsea', 'Coventry City': 'Coventry City', 'Crystal Palace': 'Crystal Palace',
  'Everton FC': 'Everton', 'Fulham FC': 'Fulham', 'Hull City': 'Hull City',
  'Ipswich Town': 'Ipswich Town', 'Leeds United': 'Leeds United', 'Liverpool FC': 'Liverpool',
  'Manchester City': 'Manchester City', 'Manchester United': 'Manchester United',
  'Newcastle United': 'Newcastle', 'Nottingham Forest': 'Nottingham Forest',
  'Sunderland AFC': 'Sunderland', 'Tottenham Hotspur': 'Tottenham',
  // EFL Championship 2026-27
  'West Ham United': 'West Ham', 'Wolverhampton Wanderers': 'Wolves', 'Burnley FC': 'Burnley',
  'Birmingham City': 'Birmingham City', 'Blackburn Rovers': 'Blackburn Rovers',
  'Bolton Wanderers': 'Bolton Wanderers', 'Bristol City': 'Bristol City',
  'Cardiff City': 'Cardiff City', 'Charlton Athletic': 'Charlton Athletic',
  'Derby County': 'Derby County', 'Lincoln City': 'Lincoln City',
  'Middlesbrough FC': 'Middlesbrough', 'Millwall FC': 'Millwall', 'Norwich City': 'Norwich City',
  'Portsmouth FC': 'Portsmouth', 'Preston North End': 'Preston North End',
  'Queens Park Rangers': 'QPR', 'Sheffield United': 'Sheffield United',
  'Southampton FC': 'Southampton', 'Stoke City': 'Stoke City', 'Swansea City': 'Swansea City',
  'Watford FC': 'Watford', 'West Bromwich Albion': 'West Brom', 'Wrexham AFC': 'Wrexham',
  // La Liga 2026-27
  'Deportivo Alavés': 'Alavés', 'Athletic Bilbao': 'Athletic Club', 'Atlético de Madrid': 'Atlético Madrid',
  'FC Barcelona': 'Barcelona', 'Real Betis Balompié': 'Real Betis', 'Celta de Vigo': 'Celta Vigo',
  'Deportivo de La Coruña': 'Deportivo La Coruña', 'Elche CF': 'Elche',
  'RCD Espanyol Barcelona': 'Espanyol', 'Getafe CF': 'Getafe', 'Levante UD': 'Levante',
  'Málaga CF': 'Málaga', 'CA Osasuna': 'Osasuna', 'Racing Santander': 'Racing Santander',
  'Rayo Vallecano': 'Rayo Vallecano', 'Real Madrid': 'Real Madrid', 'Real Sociedad': 'Real Sociedad',
  'Sevilla FC': 'Sevilla', 'Valencia CF': 'Valencia', 'Villarreal CF': 'Villarreal',
  // Serie A 2026-27
  'Atalanta BC': 'Atalanta', 'Bologna FC 1909': 'Bologna', 'Cagliari Calcio': 'Cagliari',
  'Como 1907': 'Como', 'ACF Fiorentina': 'Fiorentina', 'Frosinone Calcio': 'Frosinone',
  'Genoa CFC': 'Genoa', 'Inter Milan': 'Inter Milan', 'Juventus FC': 'Juventus',
  'SS Lazio': 'Lazio', 'US Lecce': 'Lecce', 'AC Milan': 'AC Milan', 'AC Monza': 'Monza',
  'SSC Napoli': 'Napoli', 'Parma Calcio 1913': 'Parma', 'AS Roma': 'Roma',
  'US Sassuolo': 'Sassuolo', 'Torino FC': 'Torino', 'Udinese Calcio': 'Udinese',
  'Venezia FC': 'Venezia',
  // Bundesliga 2026-27
  'FC Augsburg': 'Augsburg', 'Bayer 04 Leverkusen': 'Bayer Leverkusen', 'Bayern Munich': 'Bayern Munich',
  'Borussia Dortmund': 'Borussia Dortmund', 'Borussia Mönchengladbach': 'Gladbach',
  'Eintracht Frankfurt': 'Eintracht Frankfurt', 'SC Freiburg': 'Freiburg', 'Hamburger SV': 'Hamburg',
  'TSG 1899 Hoffenheim': 'Hoffenheim', '1.FC Köln': 'Köln', '1.FSV Mainz 05': 'Mainz',
  'RB Leipzig': 'RB Leipzig', 'FC Schalke 04': 'Schalke 04', 'SV 07 Elversberg': 'Elversberg',
  'SC Paderborn 07': 'Paderborn', 'VfB Stuttgart': 'Stuttgart',
  '1.FC Union Berlin': 'Union Berlin', 'SV Werder Bremen': 'Werder Bremen',
  // Ligue 1 2026-27
  'Angers SCO': 'Angers', 'AJ Auxerre': 'Auxerre', 'Stade Brestois 29': 'Brest',
  'Le Havre AC': 'Le Havre', 'Le Mans FC': 'Le Mans', 'RC Lens': 'Lens', 'LOSC Lille': 'Lille',
  'FC Lorient': 'Lorient', 'Olympique Lyon': 'Lyon', 'Olympique Marseille': 'Marseille',
  'AS Monaco': 'Monaco', 'OGC Nice': 'Nice', 'Paris FC': 'Paris FC',
  'Paris Saint-Germain': 'PSG', 'Stade Rennais FC': 'Rennes', 'RC Strasbourg Alsace': 'Strasbourg',
  'FC Toulouse': 'Toulouse', 'ESTAC Troyes': 'Troyes',
  // Saudi Pro League 2026-27
  'Al-Ahli SFC': 'Al-Ahli', 'Al-Ettifaq FC': 'Al-Ettifaq', 'Al-Faisaly FC': 'Al-Faisaly',
  'Al-Fateh SC': 'Al-Fateh', 'Al-Fayha FC': 'Al-Fayha', 'Al-Hazem SC': 'Al-Hazem',
  'Al-Hilal SFC': 'Al-Hilal', 'Al-Ittihad Club': 'Al-Ittihad', 'Al-Khaleej FC': 'Al-Khaleej',
  'Al-Kholood Club': 'Al-Kholood', 'Al-Nassr FC': 'Al-Nassr', 'Al-Qadsiah FC': 'Al-Qadsiah',
  'Al-Riyadh SC': 'Al-Riyadh', 'Al-Shabab FC': 'Al-Shabab', 'Al-Taawoun FC': 'Al-Taawoun',
  'Al-Diraiyah FC': 'Al-Diriyah', 'NEOM SC': 'NEOM SC',
  // MLS 2026
  'Atlanta United FC': 'Atlanta United', 'Charlotte FC': 'Charlotte FC',
  'Chicago Fire FC': 'Chicago Fire', 'FC Cincinnati': 'FC Cincinnati',
  'Columbus Crew': 'Columbus Crew', 'D.C. United': 'D.C. United', 'Inter Miami CF': 'Inter Miami',
  'CF Montréal': 'CF Montréal', 'Nashville SC': 'Nashville SC',
  'New England Revolution': 'New England Revolution', 'New York City FC': 'New York City FC',
  'Red Bull New York': 'New York Red Bulls', 'Orlando City SC': 'Orlando City',
  'Philadelphia Union': 'Philadelphia Union', 'Toronto FC': 'Toronto FC',
  'Austin FC': 'Austin FC', 'Colorado Rapids': 'Colorado Rapids', 'FC Dallas': 'FC Dallas',
  'Houston Dynamo FC': 'Houston Dynamo', 'Los Angeles Galaxy': 'LA Galaxy',
  'Los Angeles FC': 'LAFC', 'Minnesota United FC': 'Minnesota United',
  'Portland Timbers': 'Portland Timbers', 'Real Salt Lake City': 'Real Salt Lake',
  'San Diego FC': 'San Diego FC', 'San Jose Earthquakes': 'San Jose Earthquakes',
  'Seattle Sounders FC': 'Seattle Sounders', 'Sporting Kansas City': 'Sporting Kansas City',
  'St. Louis CITY SC': 'St. Louis City', 'Vancouver Whitecaps FC': 'Vancouver Whitecaps',
  // Eredivisie 2026-27
  'Ajax Amsterdam': 'Ajax', 'PSV Eindhoven': 'PSV', 'Feyenoord Rotterdam': 'Feyenoord',
  'AZ Alkmaar': 'AZ Alkmaar', 'FC Utrecht': 'Utrecht', 'FC Twente Enschede': 'Twente',
  'NEC Nijmegen': 'NEC Nijmegen', 'Sparta Rotterdam': 'Sparta Rotterdam',
  'Go Ahead Eagles': 'Go Ahead Eagles', 'Fortuna Sittard': 'Fortuna Sittard',
  'SC Heerenveen': 'Heerenveen', 'PEC Zwolle': 'PEC Zwolle', 'FC Groningen': 'Groningen',
  'Excelsior Rotterdam': 'Excelsior', 'SC Telstar': 'Telstar', 'Willem II Tilburg': 'Willem II',
  // Primeira Liga 2026-27 (Round 140: promoted Marítimo + Académico de Viseu
  // replace relegated Tondela + AVS; Casa Pia survived the playoff)
  'SL Benfica': 'Benfica', 'FC Porto': 'Porto', 'Sporting CP': 'Sporting CP',
  'SC Braga': 'Braga', 'Vitória Guimarães SC': 'Vitória Guimarães',
  'FC Famalicão': 'Famalicão', 'Rio Ave FC': 'Rio Ave', 'Casa Pia AC': 'Casa Pia',
  'GD Estoril Praia': 'Estoril', 'Moreirense FC': 'Moreirense', 'FC Arouca': 'Arouca',
  'Gil Vicente FC': 'Gil Vicente', 'CD Santa Clara': 'Santa Clara', 'CD Nacional': 'Nacional',
  'CF Estrela Amadora': 'Estrela Amadora', 'FC Alverca': 'Alverca',
  // Scottish Premiership 2026-27 (St Johnstone up, Livingston down,
  // St Mirren survived the playoff)
  'Celtic FC': 'Celtic', 'Rangers FC': 'Rangers', 'Aberdeen FC': 'Aberdeen',
  'Heart of Midlothian FC': 'Hearts', 'Hibernian FC': 'Hibernian',
  'Dundee United FC': 'Dundee United', 'Dundee FC': 'Dundee', 'Motherwell FC': 'Motherwell',
  'Kilmarnock FC': 'Kilmarnock', 'Falkirk FC': 'Falkirk', 'St. Johnstone FC': 'St Johnstone',
  // Süper Lig 2026-27 (Erzurumspor, Amedspor and Çorum FK up; Antalyaspor,
  // Kayserispor and Fatih Karagümrük down)
  'Galatasaray': 'Galatasaray', 'Fenerbahce': 'Fenerbahçe', 'Besiktas JK': 'Beşiktaş',
  'Trabzonspor': 'Trabzonspor', 'Basaksehir FK': 'Başakşehir', 'Samsunspor': 'Samsunspor',
  'Eyüpspor': 'Eyüpspor', 'Göztepe': 'Göztepe', 'Kasimpasa': 'Kasımpaşa',
  'Alanyaspor': 'Alanyaspor', 'Konyaspor': 'Konyaspor', 'Gaziantep FK': 'Gaziantep FK',
  'Genclerbirligi Ankara': 'Gençlerbirliği', 'Caykur Rizespor': 'Rizespor',
  // Round 177: Austrian Bundesliga 2026-27 (Rapid, LASK and co join; RB
  // Salzburg was already baked as a UCL flavor club and keeps its name).
  // Membership verified 2026-08-19 against worldfootball's live table and
  // Soccerway's fixtures, which agree on all twelve.
  'Red Bull Salzburg': 'RB Salzburg', 'SK Sturm Graz': 'Sturm Graz',
  'Rapid Vienna': 'Rapid Wien', 'LASK': 'LASK', 'Wolfsberger AC': 'Wolfsberger AC',
  'SCR Altach': 'Altach', 'Austria Vienna': 'Austria Wien',
  'Grazer AK 1902': 'Grazer AK', 'SV Ried': 'Ried', 'WSG Tirol': 'WSG Tirol',
  'TSV Hartberg': 'Hartberg',
  // Round 177: Super League Greece 2026-27 (Olympiacos was already baked as
  // a UCL flavor club and keeps its name). Membership verified 2026-08-19
  // against Soccerway's fixtures and the Wikipedia season page (Iraklis and
  // Kalamata up, AEL and Panserraikos down).
  'Olympiacos Piraeus': 'Olympiacos', 'Panathinaikos': 'Panathinaikos',
  'AEK Athens': 'AEK Athens', 'PAOK Thessaloniki': 'PAOK',
  'Aris Thessaloniki': 'Aris', 'Asteras Aktor': 'Asteras Tripolis',
  'Atromitos Athens': 'Atromitos', 'Levadiakos': 'Levadiakos',
  'OFI Crete': 'OFI', 'Panetolikos': 'Panetolikos',
  // Round 185: Danish Superliga 2026-27. Membership verified 2026-08-19
  // against the Wikipedia season page and worldfootball's live table, which
  // agree on all twelve (Lyngby and AC Horsens up, Fredericia and Vejle
  // down; AGF the reigning champions). The dataset spells two clubs with
  // ö for ø, mapped here as found.
  'Bröndby IF': 'Brøndby IF', 'FC Copenhagen': 'FC Copenhagen',
  'FC Midtjylland': 'FC Midtjylland', 'FC Nordsjaelland': 'FC Nordsjælland',
  'Aarhus GF': 'AGF', 'Viborg FF': 'Viborg FF', 'Randers FC': 'Randers FC',
  'Odense Boldklub': 'OB', 'Silkeborg IF': 'Silkeborg IF',
  'Lyngby Boldklub': 'Lyngby',
  // Round 185: Swiss Super League 2026-27. Membership verified 2026-08-19
  // against the Wikipedia season page and Swiss press coverage (Nau.ch),
  // which agree on all twelve (Vaduz up after five years, Winterthur down;
  // Thun the reigning champions; Vaduz are the league's Liechtenstein
  // guests exactly as in real life).
  'FC Basel 1893': 'Basel', 'BSC Young Boys': 'Young Boys',
  'FC St. Gallen 1879': 'St. Gallen', 'FC Luzern': 'Luzern',
  'FC Lausanne-Sport': 'Lausanne-Sport', 'Servette FC': 'Servette',
  'Grasshopper Club Zurich': 'Grasshopper', 'FC Lugano': 'Lugano',
  'FC Sion': 'Sion', 'FC Thun': 'Thun', 'FC Zürich': 'FC Zürich',
  'FC Vaduz': 'Vaduz',
  // Round 189: SuperSport HNL 2026-27. Membership verified 2026-08-19
  // against rezultati.com's live 2026-27 fixture list, which names exactly
  // these ten, agreeing with the season math (Vukovar 1991 relegated 10th
  // of 10 per their Wikipedia club page; Rudeš promoted per Index.hr and
  // Vrisak.info, both 2026-05-23; Dinamo Zagreb the reigning champions,
  // their 26th). The dataset's Croatia traps: FK Istra is a DIFFERENT
  // club (Serbia), ND Gorica is Slovenian, and the Dinamo family spans
  // eight countries, so every mapping below is the exact full DB name.
  'GNK Dinamo Zagreb': 'Dinamo Zagreb', 'HNK Hajduk Split': 'Hajduk Split',
  'HNK Rijeka': 'Rijeka', 'NK Osijek': 'Osijek', 'NK Varazdin': 'Varaždin',
  'Slaven Belupo Koprivnica': 'Slaven Belupo', 'NK Istra 1961': 'Istra 1961',
  'NK Lokomotiva Zagreb': 'Lokomotiva Zagreb', 'HNK Gorica': 'Gorica',
  'NK Rudes': 'Rudeš',
  // Round 394: the two leagues Rounds 142 and 143 spliced into the roster by
  // hand, mapped at last so the bake owns them. Memberships are the ones
  // those rounds shipped; the dataset spellings were learned by looking each
  // carried block's players up in the 2026 rows (Round 393).
  // 2. Bundesliga 2026-27
  'VfL Wolfsburg': 'Wolfsburg', '1.FC Heidenheim 1846': 'Heidenheim', 'FC St. Pauli': 'St. Pauli',
  'VfL Bochum': 'Bochum', 'Hertha BSC': 'Hertha BSC', '1.FC Magdeburg': 'Magdeburg',
  '1.FC Kaiserslautern': 'Kaiserslautern', 'Holstein Kiel': 'Holstein Kiel', 'Hannover 96': 'Hannover 96',
  'Eintracht Braunschweig': 'Braunschweig', 'SpVgg Greuther Fürth': 'Greuther Fürth',
  'SV Darmstadt 98': 'Darmstadt', 'Arminia Bielefeld': 'Arminia Bielefeld', 'Karlsruher SC': 'Karlsruhe',
  // Belgian Pro League 2026-27 (Club Brugge is the UCL flavor entry below)
  'RSC Anderlecht': 'Anderlecht', 'Union Saint-Gilloise': 'Union Saint-Gilloise', 'KRC Genk': 'Genk',
  'KAA Gent': 'Gent', 'Royal Antwerp FC': 'Antwerp', 'Standard Liège': 'Standard Liège',
  'KV Mechelen': 'Mechelen', 'KVC Westerlo': 'Westerlo', 'Sint-Truidense VV': 'Sint-Truiden',
  'Oud-Heverlee Leuven': 'OH Leuven', 'Cercle Brugge': 'Cercle Brugge', 'RAAL La Louvière': 'La Louvière',
  'SK Beveren': 'Beveren', 'KV Kortrijk': 'Kortrijk', 'Zulte Waregem': 'Zulte Waregem',
  'Royal Charleroi SC': 'Charleroi',
  // UCL flavor clubs outside the baked leagues
  'Club Brugge KV': 'Club Brugge',
};
