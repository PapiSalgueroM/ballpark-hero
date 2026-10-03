/**
 * Round 146: bake the 2010-11 era world for Club Manager, phase one of
 * docs/PAST-ERAS-DESIGN.md. Two leagues, Premier League and La Liga, forty
 * clubs, every player a real year-2010 Transfermarkt row from our own
 * player_market_values table.
 *
 * OFFLINE ONLY. The cloud sandbox cannot reach Supabase directly, so this
 * script reads two dump files produced through the Supabase MCP:
 *
 *   node scripts/bakeEra2010.mjs --pl=pl2010.json --laliga=laliga2010.json
 *
 * Each dump is {"rows":[{player_name, club, position, age, market_value_usd}]}
 * from:
 *   SELECT json_agg(json_build_object(...)) FROM (
 *     SELECT DISTINCT ON (player_name) player_name, club, position, age,
 *       market_value_usd
 *     FROM player_market_values
 *     WHERE year = 2010 AND club IN (...the league's 20 DB name variants...)
 *     ORDER BY player_name, market_value_usd DESC) t;
 *
 * NOTE: the base table, NOT the dedup view, and year = 2010 exactly. No 2009
 * fallback: thin is honest, that is what ERA2010_PARTIAL is for.
 *
 * THE CALENDAR CORRECTION. Year-2010 value snapshots can predate the summer
 * 2010 window, so a handful of famous movers sit at their 2009-10 club in
 * the raw dump (David Villa at Valencia). ERA_MOVES_2010 corrects exactly
 * those, every one verified two ways: common history AND the table's own
 * year-2011 rows showing the destination club (queried 2026-08-17). Values
 * stay the year-2010 snapshot for every player, moved or not, so the value
 * basis is uniform. Ibrahimovic and Robinho left for Milan, outside this
 * two-league world, so they are removed rather than relocated.
 *
 * FAILS CLOSED on unmapped positions, missing marquee anchors, or a thin
 * club that is not in the expected-thin list.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runExtend, readPull, updateNationalityBlock, POS_MAP, ratingOf, gbpM } from './lib/eraBakeExtend.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Round 901: the Serie A, the Bundesliga and Ligue 1 join through the shared
   step in scripts/lib/eraBakeExtend.mjs (see THE BIG FIVE EXTENSION below). */
const bigFiveArg = process.argv.includes('--extend-big-five');
const plArg = process.argv.find(a => a.startsWith('--pl='));
const llArg = process.argv.find(a => a.startsWith('--laliga='));
if (!bigFiveArg && (!plArg || !llArg)) {
  console.error('Usage: node scripts/bakeEra2010.mjs --extend-big-five [--base=<the 40 club file>] [--pull=<year 2010 pull>] [--next=<year 2011 pull>] [--dry] [--check]');
  console.error('   or (Round 146, the original two league bake): node scripts/bakeEra2010.mjs --pl=pl2010.json --laliga=laliga2010.json');
  process.exit(1);
}

/* DB club name -> era engine club name. Shared clubs reuse the exact 2026
 * world spelling (the era decides which roster FILE is read, so the same
 * name in both files is two different squads, not a collision). 2010-only
 * clubs get their natural short names. */
const DB_TO_ERA_PL = {
  'Arsenal FC': 'Arsenal', 'Aston Villa': 'Aston Villa',
  'Birmingham City': 'Birmingham City', 'Blackburn Rovers': 'Blackburn Rovers',
  'Blackpool FC': 'Blackpool', 'Bolton Wanderers': 'Bolton Wanderers',
  'Chelsea FC': 'Chelsea', 'Everton FC': 'Everton', 'Fulham FC': 'Fulham',
  'Liverpool FC': 'Liverpool', 'Manchester City': 'Manchester City',
  'Manchester United': 'Manchester United', 'Newcastle United': 'Newcastle',
  'Stoke City': 'Stoke City', 'Sunderland AFC': 'Sunderland',
  'Tottenham Hotspur': 'Tottenham', 'West Bromwich Albion': 'West Brom',
  'West Ham United': 'West Ham', 'Wigan Athletic': 'Wigan Athletic',
  'Wolverhampton Wanderers': 'Wolves',
};
const DB_TO_ERA_LL = {
  'UD Almería': 'Almería', 'Athletic Bilbao': 'Athletic Club',
  'Atlético de Madrid': 'Atlético Madrid', 'FC Barcelona': 'Barcelona',
  'Deportivo de La Coruña': 'Deportivo La Coruña',
  'RCD Espanyol Barcelona': 'Espanyol', 'Getafe CF': 'Getafe',
  'Hércules CF': 'Hércules', 'Levante UD': 'Levante', 'Málaga CF': 'Málaga',
  'RCD Mallorca': 'Mallorca', 'CA Osasuna': 'Osasuna',
  'Racing Santander': 'Racing Santander', 'Real Madrid': 'Real Madrid',
  'Real Sociedad': 'Real Sociedad', 'Sevilla FC': 'Sevilla',
  'Sporting Gijón': 'Sporting Gijón', 'Valencia CF': 'Valencia',
  'Villarreal CF': 'Villarreal', 'Real Zaragoza': 'Zaragoza',
};

/* The verified summer 2010 window corrections. `to: null` means the player
 * left this two-league world entirely. Arrivals from outside carry their own
 * year-2010 row data (position, age, value) pulled the same day. */
const ERA_MOVES_2010 = [
  { n: 'David Villa', to: 'Barcelona' },
  { n: 'David Silva', to: 'Manchester City' },
  { n: 'James Milner', to: 'Manchester City' },
  { n: 'Javier Mascherano', to: 'Barcelona' },
  { n: 'Joe Cole', to: 'Liverpool' },
  { n: 'Rafael van der Vaart', to: 'Tottenham' },
  { n: 'Zlatan Ibrahimović', to: null },
  { n: 'Robinho', to: null },
];
const ERA_ARRIVALS_2010 = [
  { n: 'Mesut Özil', to: 'Real Madrid', position: 'Attacking Midfield', age: 21, usd: 29000000 },
  { n: 'Ángel Di María', to: 'Real Madrid', position: 'Right Winger', age: 21, usd: 27000000 },
  { n: 'Mario Balotelli', to: 'Manchester City', position: 'Centre-Forward', age: 19, usd: 28000000 },
];

/* POS_MAP, ratingOf and gbpM, the same curves as bakeClubManagerRosters.mjs
 * so a 2010 value and a 2026 value mean the same thing on the rating scale,
 * come from scripts/lib/eraBakeExtend.mjs (imported at the top since Round
 * 901, the verbatim copy that sat here removed): one copy of the curve for
 * every era bake. */

/* ================= Round 901: THE BIG FIVE EXTENSION ================= */
/* The era grows from two leagues to five IN PLACE, by the move Round 899
   made for 2015-16, through the same shared step
   (scripts/lib/eraBakeExtend.mjs; read its header: the shipped 40 club file
   is the truth for the two leagues it holds, its lines carried through as
   bytes; the 2010-11 Serie A, Bundesliga and Ligue 1 come from an OFFLINE
   pull of the base table; every correction is declared below and proved
   twice). Run:

     node scripts/bakeEra2010.mjs --extend-big-five

   THE DATA, OFFLINE. Production is off limits to a bake, so the lead pulled
   the base table player_market_values once into two files (defaults below,
   --pull= and --next= override): every row of years 2005, 2010 and 2015,
   and every row of 2006, 2011 and 2016. The documented query shape (base
   table, year = 2010 exact, DISTINCT ON (player_name) ... ORDER BY
   player_name, market_value_usd DESC, no fallback year) is reproduced from
   the first file: filter the year and the league's club spellings, keep one
   row per player_name with the highest value, and break a tie on the lowest
   id so the bake is deterministic. The second file is used ONLY as the
   second proof of a summer move: the club the year-2011 row names.

   RUNNING IT AGAIN. The step refuses a file that already holds a new
   league's club. To regenerate, hand it the 40 club file it grew from:
     git show 06dc0741:src/data/clubManagerEra2010.ts > base.ts
     node scripts/bakeEra2010.mjs --extend-big-five --base=base.ts
   Add --check to rebuild and compare with the shipped file instead of
   writing (scripts/simEraBakeExtend.mjs does exactly that when the pulls
   are on the machine).

   THE SPELLINGS LEFT OUT. A handful of year-2010 rows sit at a variant
   spelling of a member club: "Roma" (three youth forwards), "Genoa" (one),
   the Primavera sides of Juventus, Napoli, Catania and Sampdoria, and the
   second teams of Bayern, Schalke, Stuttgart and Wolfsburg. None is a first
   team regular of 2010-11, so those spellings stay out of the maps and the
   rows stay out of the world, as Round 899 did with its reserve sides. The
   row at "FC Bayern Munich" is Mehmet Ekici, who spent 2010-11 on loan at
   Nurnberg; see the moves. */

/* Table spelling -> engine name, in final table order. Membership of the
 * 2010-11 Serie A, two sources read 2026-10-03 that agree on all twenty:
 * RSSSF's season record (https://www.rsssf.org/tablesi/ital2011.html) and
 * ESPN's final standings
 * (https://www.espn.com/soccer/standings/_/league/ITA.1/season/2010). Every
 * spelling was checked against the pull (the step fails on a spelling with
 * no rows). Names reuse the 2026 and 2015 spellings wherever the club exists
 * there, so colours and rivalries carry over. */
const DB_TO_ERA_SA = {
  'AC Milan': 'AC Milan', 'Inter Milan': 'Inter Milan', 'SSC Napoli': 'Napoli',
  'Udinese Calcio': 'Udinese', 'SS Lazio': 'Lazio', 'AS Roma': 'Roma',
  'Juventus FC': 'Juventus', 'Palermo FC': 'Palermo', 'ACF Fiorentina': 'Fiorentina',
  'Genoa CFC': 'Genoa', 'Chievo Verona': 'Chievo Verona', 'Parma Calcio 1913': 'Parma',
  'Catania FC': 'Catania', 'Cagliari Calcio': 'Cagliari', 'Cesena FC': 'Cesena',
  'Bologna FC 1909': 'Bologna', 'US Lecce': 'Lecce', 'UC Sampdoria': 'Sampdoria',
  'Brescia Calcio': 'Brescia', 'SSC Bari': 'Bari',
};
/* The 2010-11 Bundesliga, the same two publishers, read the same day,
 * agreeing on all eighteen: RSSSF (https://www.rsssf.org/tablesd/duit2011.html)
 * and ESPN (https://www.espn.com/soccer/standings/_/league/GER.1/season/2010). */
const DB_TO_ERA_BL = {
  'Borussia Dortmund': 'Borussia Dortmund', 'Bayer 04 Leverkusen': 'Bayer Leverkusen',
  'Bayern Munich': 'Bayern Munich', 'Hannover 96': 'Hannover 96', '1.FSV Mainz 05': 'Mainz',
  '1.FC Nuremberg': 'Nürnberg', '1.FC Kaiserslautern': 'Kaiserslautern', 'Hamburger SV': 'Hamburg',
  'SC Freiburg': 'Freiburg', '1.FC Köln': 'Köln', 'TSG 1899 Hoffenheim': 'Hoffenheim',
  'VfB Stuttgart': 'Stuttgart', 'SV Werder Bremen': 'Werder Bremen', 'FC Schalke 04': 'Schalke 04',
  'VfL Wolfsburg': 'Wolfsburg', 'Borussia Mönchengladbach': 'Gladbach',
  'Eintracht Frankfurt': 'Eintracht Frankfurt', 'FC St. Pauli': 'St. Pauli',
};
/* The 2010-11 Ligue 1, the same two publishers, read the same day, agreeing
 * on all twenty: RSSSF (https://www.rsssf.org/tablesf/fran2011.html) and ESPN
 * (https://www.espn.com/soccer/standings/_/league/FRA.1/season/2010). The
 * twentieth, Arles-Avignon, sits in the table under its founding name,
 * "Athlétic Club Arlésien": five year-2010 rows (eight year-2011 ones), the
 * thinnest squad of the five leagues. A search for "Arles" misses it, which
 * is how the round's plan came to believe the club had no rows at all. */
const DB_TO_ERA_L1 = {
  'LOSC Lille': 'Lille', 'Olympique Marseille': 'Marseille', 'Olympique Lyon': 'Lyon',
  'Paris Saint-Germain': 'PSG', 'FC Sochaux-Montbéliard': 'Sochaux', 'Stade Rennais FC': 'Rennes',
  'FC Girondins Bordeaux': 'Bordeaux', 'FC Toulouse': 'Toulouse', 'AJ Auxerre': 'Auxerre',
  'AS Saint-Étienne': 'Saint-Étienne', 'FC Lorient': 'Lorient', 'Valenciennes FC': 'Valenciennes',
  'AS Nancy-Lorraine': 'Nancy', 'Montpellier HSC': 'Montpellier', 'SM Caen': 'Caen',
  'Stade Brestois 29': 'Brest', 'OGC Nice': 'Nice', 'AS Monaco': 'Monaco', 'RC Lens': 'Lens',
  'Athlétic Club Arlésien': 'Arles-Avignon',
};

/* BIG_FIVE_CORRECTIONS_START */
/* THE FOLDS: two men Round 146 brought INTO the first two leagues as
 * arrivals from Germany and Italy. Their year-2010 rows now surface in the
 * new leagues' pulls at the clubs they left; the shipped line stays, the row
 * is dropped, one man, one club. The step proves each fold is one row (same
 * position, age and value on both sides). */
const B5_FOLDS = [
  { n: 'Mesut Özil', why: 'Werder Bremen to Real Madrid, Round 146 arrival' },
  { n: 'Mario Balotelli', why: 'Inter to Manchester City, Round 146 arrival' },
];
/* THE NAMESAKES: strings worn by two real men each, one in a new league and
 * one in the shipped world (birth dates in the harness beside the allowlist
 * that names them, scripts/simEra2010.mjs). The engine keys players by name,
 * so the standing rule decides: the higher value stays. */
const B5_NAMESAKES = [
  { n: 'Pablo Álvarez', why: 'the Catania right-back from Argentina (25) and the Deportivo winger from Spain (29)' },
  { n: 'Henrique', why: 'the Bordeaux centre-back (26) and the Racing Santander centre-back (23), both Brazilian' },
  { n: 'Adriano', why: 'the Monaco right-back (27) and the Sevilla left-back (25), both Brazilian' },
  { n: 'Eduardo', why: 'the Lens forward from Brazil (29) and the Arsenal forward from Croatia (26)' },
  { n: 'Fernando', why: 'the Bordeaux defensive midfielder from Brazil (28) and the Malaga midfielder from Spain (30)' },
];
const B5_MOVES = [
  { n: 'Marco Amelia', to: 'AC Milan', why: 'Genoa to AC Milan (ESPN-IT, 25 Jul 2010)' },
  { n: 'Sokratis', to: 'AC Milan', why: 'Genoa to AC Milan (ESPN-IT, 25 Jul 2010)' },
  { n: 'Laurent Koscielny', to: 'Arsenal', why: 'Lorient to Arsenal (ESPN-FR, 7 Jul 2010)' },
  { n: 'Marouane Chamakh', to: 'Arsenal', why: 'Bordeaux to Arsenal (ESPN-EN, 21 May 2010)' },
  { n: 'Adriano', to: 'Barcelona', why: 'Sevilla to Barcelona (ESPN-ES, 17 Jul 2010)' },
  { n: 'Hanno Balitsch', to: 'Bayer Leverkusen', why: 'Hannover to Leverkusen on a free (kicker, 28 May 2010, Balitsch zurueck zu Bayer)' },
  { n: 'Michael Ballack', to: 'Bayer Leverkusen', why: 'Chelsea to Bayer Leverkusen (ESPN-EN, 1 Jul 2010)' },
  { n: 'Sidney Sam', to: 'Bayer Leverkusen', why: 'Hamburg, after his Kaiserslautern loan, to Leverkusen (kicker, 19 May 2010, Bayer schnappt sich Sam)' },
  { n: 'Andreas Ottl', to: 'Bayern Munich', why: 'back at Bayern from his Nurnberg loan, 1 Jul 2010 (KICKER)' },
  { n: 'Breno', to: 'Bayern Munich', why: 'back at Bayern from his Nurnberg loan, 1 Jul 2010 (KICKER)' },
  { n: 'Toni Kroos', to: 'Bayern Munich', why: 'Bayer Leverkusen to Bayern Munich (Süddeutshe Zeitung, 10 Aug 2010, Kroos kehrt von Leverkusen zu Bayern zurück)' },
  { n: 'Aleksandr Hleb', to: 'Birmingham City', why: 'Stuttgart to Birmingham City (ESPN-EN, 31 Aug 2010)' },
  { n: 'Diego Pérez', to: 'Bologna', why: 'Monaco to Bologna (ESPN-FR, 28 Jul 2010)' },
  { n: 'Rene Krhin', to: 'Bologna', why: 'Inter Milan to Bologna (ESPN-IT, 28 Jul 2010)' },
  { n: 'Riccardo Meggiorini', to: 'Bologna', why: 'Bari to Bologna (ESPN-IT, 22 Jul 2010)' },
  { n: 'Fahid Ben Khalfallah', to: 'Bordeaux', why: 'Valenciennes to Bordeaux (France Football, 27 Aug 2010, Ben Khalfallah a signé (off.))' },
  { n: 'Moussa Maazou', to: 'Bordeaux', why: 'Monaco to Bordeaux (France Football, 25 Aug 2010, Maazou à Bordeaux (off.))' },
  { n: 'Alessandro Diamanti', to: 'Brescia', why: 'West Ham to Brescia (ESPN-EN, 24 Aug 2010)' },
  { n: 'Yohan Mollo', to: 'Caen', why: 'Monaco to Caen (France Football, 7 Jul 2010, Mollo à Caen, Aubameyang arrive)' },
  { n: 'Luis Jiménez', to: 'Cesena', why: 'Parma to Cesena by way of Ternana, 31 Aug 2010 (KICKER; ESPN-IT, 25 Jul 2010, the Ternana leg)' },
  { n: 'Gelson Fernandes', to: 'Chievo Verona', why: 'Saint-Étienne to Chievo Verona (AC ChievoVerona, 30 Aug 2010, Gelson Fernandes Al ChievoVerona)' },
  { n: 'Marco Andreolli', to: 'Chievo Verona', why: 'Roma to Chievo Verona (AC ChievoVerona, 24 Aug 2010, UFFICIALE: ANDREOLLI E THEREAU AL CHIEVOVERONA)' },
  { n: 'Jesús Dátolo', to: 'Espanyol', why: 'Napoli loaned him to Espanyol (ESPN-IT, 8 Jul 2010, as Datolo)' },
  { n: 'Alessio Cerci', to: 'Fiorentina', why: 'Roma to Fiorentina (AS Roma, 26 Aug 2010, Cessione a titolo definitivo dei diritti alle prestazioni sportive del calciatore Alessio Cerci)' },
  { n: 'Gaetano D\'Agostino', to: 'Fiorentina', why: 'Udinese to Fiorentina (ESPN-IT, 22 Jul 2010)' },
  { n: 'Jan Rosenthal', to: 'Freiburg', why: 'Hannover 96 to Freiburg (ARD, 11 Jun 2010, SC Freiburg holt Jan Rosenthal)' },
  { n: 'Chico Flores', to: 'Genoa', why: 'Almeria to Genoa (ESPN-IT, 21 Jul 2010, as Chico)' },
  { n: 'Luca Toni', to: 'Genoa', why: 'Roma to Genoa (ESPN-IT, 25 Jul 2010)' },
  { n: 'Rafinha', to: 'Genoa', why: 'Schalke 04 to Genoa (ESPN-DE, 17 Aug 2010)' },
  { n: 'Mohamadou Idrissou', to: 'Gladbach', why: 'Freiburg to Gladbach, 1 Jul 2010 (KICKER)' },
  { n: 'Dennis Diekmeier', to: 'Hamburg', why: 'Nurnberg to Hamburg, 16 Jul 2010 (KICKER)' },
  { n: 'Heiko Westermann', to: 'Hamburg', why: 'Schalke 04 to Hamburg (Hamburger Morgenpost, 21 Jul 2010, So tickt der neue HSV-Star)' },
  { n: 'David Trezeguet', to: 'Hércules', why: 'Juventus to Hércules (the club, 29 Aug 2010)' },
  { n: 'Nelson Valdez', to: 'Hércules', why: 'Dortmund to Hercules, 17 Aug 2010 (KICKER)' },
  { n: 'Sebastian Rudy', to: 'Hoffenheim', why: 'Stuttgart to Hoffenheim (VfB Stuttgart, 23 Aug 2010, Rudy geht nach Hoffenheim)' },
  { n: 'Jonathan Biabiany', to: 'Inter Milan', why: 'Parma to Inter Milan (ESPN-IT, 25 Jul 2010)' },
  { n: 'Luca Castellazzi', to: 'Inter Milan', why: 'Sampdoria to Inter Milan (ESPN-IT, 25 Jul 2010)' },
  { n: 'McDonald Mariga', to: 'Inter Milan', why: 'Parma to Inter, at Inter from 1 Feb 2010 (KICKER); the year-2010 row is his old club' },
  { n: 'Alberto Aquilani', to: 'Juventus', why: 'Liverpool to Juventus (ESPN-EN, 25 Aug 2010)' },
  { n: 'Armand Traoré', to: 'Juventus', why: 'Arsenal to Juventus (ESPN-EN, 31 Aug 2010)' },
  { n: 'Fabio Quagliarella', to: 'Juventus', why: 'Napoli to Juventus (Juventus FC, 27 Aug 2010, Agreement with S.S.C Napoli for the temporary acquisition of the registration rights of the player Fabio Quagliarella)' },
  { n: 'Jorge Martínez', to: 'Juventus', why: 'Catania to Juventus (ESPN-IT, 22 Jul 2010)' },
  { n: 'Leonardo Bonucci', to: 'Juventus', why: 'Bari to Juventus (ESPN-IT, 22 Jul 2010)' },
  { n: 'Marco Motta', to: 'Juventus', why: 'Roma to Juventus (ESPN-IT, 25 Jul 2010)' },
  { n: 'Marco Storari', to: 'Juventus', why: 'Sampdoria to Juventus (ESPN-IT, 4 Aug 2010)' },
  { n: 'Simone Pepe', to: 'Juventus', why: 'Udinese to Juventus (ESPN-IT, 25 Jul 2010)' },
  { n: 'Chadli Amri', to: 'Kaiserslautern', why: 'Mainz to Kaiserslautern (the club, Chadli Amri wechselt von Mainz 05 zu Aufsteiger 1. FC Kaiserslautern)' },
  { n: 'Clemens Walch', to: 'Kaiserslautern', why: 'Stuttgart to Kaiserslautern (VfB Stuttgart, 12 Aug 2010, Walch heads for FCK)' },
  { n: 'Erwin Hoffer', to: 'Kaiserslautern', why: 'Napoli to Kaiserslautern (ESPN-DE, 25 Jul 2010)' },
  { n: 'Jan Moravek', to: 'Kaiserslautern', why: 'Schalke 04 to Kaiserslautern (the club, Jan Moravek kommt zum FCK)' },
  { n: 'Martin Lanig', to: 'Köln', why: 'Stuttgart to Köln (Süddeutsche Zeitung, 18 Jun 2010, Lanig-Wechsel nach Köln perfekt)' },
  { n: 'Javier Garrido', to: 'Lazio', why: 'Manchester City to Lazio (ESPN-EN, 30 Jul 2010)' },
  { n: 'Mark Bresciano', to: 'Lazio', why: 'Palermo to Lazio (ESPN-IT, 25 Jul 2010)' },
  { n: 'Andrea Rispoli', to: 'Lecce', why: 'Brescia to Lecce by way of Parma, 30 Aug 2010 (KICKER)' },
  { n: 'Jeda', to: 'Lecce', why: 'Cagliari to Lecce, 31 Aug 2010 (KICKER)' },
  { n: 'David Rozehnal', to: 'Lille', why: 'Hamburg to Lille (Hamburger Morgenpost, 31 Aug 2010, HSV-Ladenhüter Rozehnal geht!)' },
  { n: 'Moussa Sow', to: 'Lille', why: 'Rennes to Lille on a free, 1 Jul 2010 (KICKER; MF-TOP10)' },
  { n: 'Christian Poulsen', to: 'Liverpool', why: 'Juventus to Liverpool (ESPN-EN, 12 Aug 2010)' },
  { n: 'Kévin Monnet-Paquet', to: 'Lorient', why: 'Lens to Lorient, 1 Jul 2010 (KICKER)' },
  { n: 'Jimmy Briand', to: 'Lyon', why: 'Rennes to Lyon (Reuters, 8 Jun 2010, Striker Briand to join Lyon on four-year deal)' },
  { n: 'Pape Diakhaté', to: 'Lyon', why: 'Dynamo Kyiv loaned him to Lyon, 31 Aug 2010 (KICKER); the year-2010 row is his earlier loan club' },
  { n: 'Yoann Gourcuff', to: 'Lyon', why: 'Bordeaux to Lyon, 24 Aug 2010 (KICKER; MF-TOP15, the dearest deal of the French summer)' },
  { n: 'Fernando Cavenaghi', to: 'Mallorca', why: 'Bordeaux to Mallorca (ESPN-ES, 26 Aug 2010)' },
  { n: 'Aleksandar Kolarov', to: 'Manchester City', why: 'Lazio to Manchester City (ESPN-EN, 24 Jul 2010)' },
  { n: 'Jérôme Boateng', to: 'Manchester City', why: 'Hamburg to Manchester City (ESPN-EN, 1 Jul 2010)' },
  { n: 'André Ayew', to: 'Marseille', why: 'back at Marseille from his Arles-Avignon loan, 1 Jul 2010 (KICKER; MF-TOP10)' },
  { n: 'André-Pierre Gignac', to: 'Marseille', why: 'Toulouse to Marseille, 20 Aug 2010 (KICKER; MF-TOP15)' },
  { n: 'César Azpilicueta', to: 'Marseille', why: 'Osasuna to Marseille (ESPN-ES, 28 Jun 2010)' },
  { n: 'Loïc Rémy', to: 'Marseille', why: 'Nice to Marseille, 19 Aug 2010 (KICKER; MF-TOP15)' },
  { n: 'Daniel Niculae', to: 'Monaco', why: 'Auxerre to Monaco (France Football, 13 Jun 2010, Niculae 3 ans à Monaco)' },
  { n: 'Laurent Bonnart', to: 'Monaco', why: 'Marseille to Monaco, 1 Jul 2010 (KICKER)' },
  { n: 'Garry Bocaly', to: 'Montpellier', why: 'Marseille to Montpellier, 29 Jan 2010 (KICKER); the year-2010 row is his old club' },
  { n: 'Marama Vahirua', to: 'Nancy', why: 'Lorient to Nancy, 1 Jul 2010 (KICKER)' },
  { n: 'Edinson Cavani', to: 'Napoli', why: 'Palermo to Napoli (ESPN-IT, 25 Jul 2010)' },
  { n: 'Hatem Ben Arfa', to: 'Newcastle', why: 'Marseille to Newcastle (ESPN-EN, 28 Aug 2010)' },
  { n: 'Julian Schieber', to: 'Nürnberg', why: 'Stuttgart loaned him to Nurnberg (1. FC Nurnberg, 2 Jun 2010, Club leiht Schieber aus)' },
  { n: 'Fernando Marqués', to: 'Parma', why: 'Espanyol to Parma (ESPN-ES, 25 Jul 2010)' },
  { n: 'Massimo Gobbi', to: 'Parma', why: 'Fiorentina to Parma (Parma FC, 18 Aug 2010, Gobbi al Parma / Domani, 19 agosto la presentazione ufficiale)' },
  { n: 'Sebastian Giovinco', to: 'Parma', why: 'Juventus to Parma (ESPN-IT, 17 Aug 2010)' },
  { n: 'Mathieu Bodmer', to: 'PSG', why: 'Lyon to PSG (France Football, 29 Jun 2010, Bodmer signe mercredi au PSG)' },
  { n: 'Nenê', to: 'PSG', why: 'Monaco to PSG (MF-TOP15; MF-TOP10, the best buy of the French summer)' },
  { n: 'Siaka Tiéné', to: 'PSG', why: 'Valenciennes to PSG, 31 Aug 2010 (KICKER)' },
  { n: 'Markus Rosenberg', to: 'Racing Santander', why: 'Werder Bremen to Racing Santander (Deutsche Fußball Liga, 31 Aug 2010, Rosenberg verlängert und wechselt)' },
  { n: 'Sami Khedira', to: 'Real Madrid', why: 'Stuttgart to Real Madrid (ESPN-ES, 30 Jul 2010)' },
  { n: 'Georges Mandjeck', to: 'Rennes', why: 'Stuttgart to Rennes after his Kaiserslautern loan, 1 Jul 2010 (KICKER; MF-REC)' },
  { n: 'Onyekachi Apam', to: 'Rennes', why: 'Nice to Rennes, 1 Jul 2010 (KICKER; MF-TOP15)' },
  { n: 'Stéphane Dalmat', to: 'Rennes', why: 'Sochaux to Rennes (France Football, 18 Jul 2010, Dalmat à Rennes, c’est fait)' },
  { n: 'Víctor Montaño', to: 'Rennes', why: 'Montpellier to Rennes (MF-TOP15)' },
  { n: 'Fábio Simplício', to: 'Roma', why: 'Palermo to Roma (ESPN-IT, 25 Jul 2010)' },
  { n: 'Marco Borriello', to: 'Roma', why: 'AC Milan to Roma (AS Roma, 31 Aug 2010, ACQUISIZIONE A TITOLO TEMPORANEO, CON OBBLIGO DI RISCATTO PER L’ACQUISIZIONE A TITOLO DEFINITIVO DEI DIRITTI ALLE PRESTAZIONI SPORTIVE DEL CALCIATORE MARCO BORRIELLO)' },
  { n: 'Paolo Castellini', to: 'Roma', why: 'Parma to Roma (ESPN-IT, 25 Aug 2010)' },
  { n: 'Albin Ebondo', to: 'Saint-Étienne', why: 'Toulouse to Saint-Etienne on a free, 1 Jul 2010 (KICKER; MF-TOP10)' },
  { n: 'Carlos Bocanegra', to: 'Saint-Étienne', why: 'Rennes to Saint-Étienne (France Football, 16 Jul 2010, Bocanegra à Saint-Etienne)' },
  { n: 'Sylvain Marchal', to: 'Saint-Étienne', why: 'Lorient to Saint-Étienne (France Football, 12 May 2010, Marchal à l’ASSE (officiel))' },
  { n: 'Daniele Dessena', to: 'Sampdoria', why: 'Cagliari to Sampdoria (ESPN-IT, 22 Jul 2010)' },
  { n: 'Christoph Metzelder', to: 'Schalke 04', why: 'Real Madrid to Schalke 04 (the club, 27 Apr 2010)' },
  { n: 'José Manuel Jurado', to: 'Schalke 04', why: 'Atlético Madrid to Schalke 04 (the club, 31 Aug 2010)' },
  { n: 'Klaas-Jan Huntelaar', to: 'Schalke 04', why: 'AC Milan to Schalke 04 (Süddeutsche Zeitung, 31 Aug 2010, Magath im Kaufrausch)' },
  { n: 'Raúl', to: 'Schalke 04', why: 'Real Madrid to Schalke 04 (ESPN-ES, 26 Jul 2010)' },
  { n: 'Luca Cigarini', to: 'Sevilla', why: 'Napoli to Sevilla (ESPN-ES, 17 Aug 2010)' },
  { n: 'Martín Cáceres', to: 'Sevilla', why: 'Juventus loan over, Barcelona loaned him to Sevilla, 31 Aug 2010 (KICKER)' },
  { n: 'Mouhamadou Dabo', to: 'Sevilla', why: 'Saint-Étienne to Sevilla (ESPN-ES, 23 May 2010)' },
  { n: 'Carlos Zambrano', to: 'St. Pauli', why: 'Schalke 04 to St. Pauli (FC Schalke 04, 10 Jul 2010, Zambrano an FC St. Pauli ausgeliehen)' },
  { n: 'Thomas Kessler', to: 'St. Pauli', why: 'Köln to St. Pauli (FC St. Pauli, 23 Jun 2010, Torhüter kommt zwei Jahre auf Leihbasis)' },
  { n: 'Christian Gentner', to: 'Stuttgart', why: 'Wolfsburg to Stuttgart (VfB Stuttgart, 8 Jan 2010, Gentner’s return)' },
  { n: 'Asamoah Gyan', to: 'Sunderland', why: 'Rennes to Sunderland (ESPN-EN, 31 Aug 2010)' },
  { n: 'Germán Denis', to: 'Udinese', why: 'Napoli to Udinese (ESPN-IT, 17 Aug 2010)' },
  { n: 'Giampiero Pinzi', to: 'Udinese', why: 'back at Udinese from his Chievo loan, 1 Jul 2010 (KICKER)' },
  { n: 'Ricardo Costa', to: 'Valencia', why: 'Lille to Valencia (ESPN-ES, 17 May 2010)' },
  { n: 'Tino Costa', to: 'Valencia', why: 'Montpellier to Valencia (ESPN-ES, 1 Jul 2010)' },
  { n: 'Marko Arnautovic', to: 'Werder Bremen', why: 'Inter Milan to Werder Bremen (ESPN-DE, 25 Jul 2010)' },
  { n: 'Mikaël Silvestre', to: 'Werder Bremen', why: 'Arsenal to Bremen (Deutsche Fussball Liga, 30 Aug 2010, Werder holt Arsenal-Star)' },
  { n: 'Thomas Hitzlsperger', to: 'West Ham', why: 'Stuttgart to West Ham (ESPN-EN, 5 Jun 2010)' },
  { n: 'Diego', to: 'Wolfsburg', why: 'Juventus to Wolfsburg (Deutsche Fußball Liga, 27 Aug 2010, Diego-Wechsel perfekt)' },
  { n: 'Simon Kjaer', to: 'Wolfsburg', why: 'Palermo to Wolfsburg, 8 Jul 2010 (KICKER)' },
  { n: 'Nicolás Bertolo', to: 'Zaragoza', why: 'Palermo to Zaragoza (ESPN-ES, 17 Aug 2010)' },
];
const B5_REMOVALS = [
  { n: 'Adaílton', why: 'Bologna to Sion, 1 Jan 2010 (KICKER)' },
  { n: 'Alberto Zapater', why: 'Genoa to Sporting (ESPN-IT, 28 Jul 2010)' },
  { n: 'Aleksandar Lukovic', why: 'Udinese to Zenit St Petersburg (ESPN-IT, 17 Aug 2010)' },
  { n: 'Bakari Koné', why: 'Marseille to Lekhwiya, 1 Jul 2010 (KICKER; MF-TOP15)' },
  { n: 'Christian Lell', why: 'Bayern Munich to Hertha BSC (Deutsche Fußball Liga, 23 Jun 2010, Lell wechselt von München nach Berlin)' },
  { n: 'Colin Kazım-Richards', why: 'his Toulouse loan ended, back at Fenerbahce 1 Jul 2010 (KICKER)' },
  { n: 'Daniel Gygax', why: 'Nürnberg to FC Luzern (the club, FC Luzern verpflichtet Daniel Gygax)' },
  { n: 'Danijel Aleksic', why: 'Genoa to Greuther Fürth (SpVgg Greuther Fürth, 31 Aug 2010, SpVgg leiht Stürmer Danijel Aleksic für ein Jahr aus)' },
  { n: 'David Beckham', why: 'his Milan loan ended, back at LA Galaxy 1 Jul 2010 (KICKER)' },
  { n: 'Du-ri Cha', why: 'Freiburg to Celtic (ESPN-DE, 2 Jul 2010)' },
  { n: 'Filip Trojan', why: 'Mainz to MSV Duisburg (DerWesten, 5 Aug 2010, MSV Duisburg:MSV hat gute Chancen bei Trojan)' },
  { n: 'Francesco Lodi', why: 'Udinese to Frosinone, 1 Jul 2010 (KICKER)' },
  { n: 'Franco Zuculini', why: 'Hoffenheim loaned him to Genoa (ESPN-DE, 28 Jul 2010), Racing Club from Feb 2011 (ESPN-IT, 5 Feb 2011); the year-2011 row is Racing Club' },
  { n: 'François Modesto', why: 'Monaco to Olympiacos, 1 Jul 2010 (KICKER)' },
  { n: 'Guido Marilungo', why: 'his Lecce loan ended, at Sampdoria from 1 Jul 2010, Atalanta from 12 Jan 2011 (KICKER); the year-2011 row is Atalanta' },
  { n: 'Guly', why: 'Cesena to Southampton (ESPN-IT, 23 Aug 2010)' },
  { n: 'Ismaël Bangoura', why: 'Rennes to Al-Nasr Dubai (MF-TOP15, the summer 2010 deals)' },
  { n: 'Issiar Dia', why: 'Nancy to Fenerbahce, 1 Jul 2010 (KICKER; MF-TOP15)' },
  { n: 'Jean-Alain Boumsong', why: 'Lyon to Panathinaikos, 1 Jul 2010 (KICKER; MF-REC)' },
  { n: 'Jiri Stajner', why: 'Hannover 96 to Slovan Liberec (Focus, 15 May 2010, Jiri Stajner verlässt Hannover)' },
  { n: 'Johan Audel', why: 'Valenciennes to Stuttgart, 9 Aug 2010 (KICKER); the year-2011 row is outside the world' },
  { n: 'Julian Koch', why: 'Borussia Dortmund to MSV Duisburg (MSV Duisburg, 20 Apr 2010, U20-Nationalspieler verstärkt die Zebras zur neuen Saison – MSV leiht Julian Koch von Borussia Dortmund aus)' },
  { n: 'Keirrison', why: 'Fiorentina to Santos (ESPN-ES, 26 Jul 2010)' },
  { n: 'Kevin Kuranyi', why: 'Schalke 04 to Dynamo Moscow (Die Welt, 9 May 2010, Kuranyi kassiert für drei Jahre Moskau 18 Millionen)' },
  { n: 'Kevin Mirallas', why: 'Saint-Etienne to Olympiacos, 1 Jul 2010 (KICKER)' },
  { n: 'Mamadou Niang', why: 'Marseille to Fenerbahce, 15 Aug 2010 (KICKER; MF-TOP15)' },
  { n: 'Mancini', why: 'his Milan loan ended, back at Inter 1 Jul 2010, Atletico Mineiro from 17 Jan 2011 (KICKER); the year-2011 row is Atletico Mineiro' },
  { n: 'Marcus Berg', why: 'Hamburg to PSV Eindhoven (Süddeutsche Zeitung, 23 Jul 2010, Berg nach Eindhoven)' },
  { n: 'Marino Defendi', why: 'his Lecce loan ended, at Atalanta (Serie B) from 1 Jul 2010 (KICKER)' },
  { n: 'Markus Steinhöfer', why: 'Kaiserslautern loan over, at Frankfurt from 1 Jul 2010 and at Basel from 26 Jan 2011 (KICKER); the year-2011 row is Basel' },
  { n: 'Martin Jørgensen', why: 'Fiorentina to Aarhus, 1 Feb 2010 (KICKER)' },
  { n: 'Mauro Camoranesi', why: 'Juventus to Stuttgart, 31 Aug 2010, Lanus from 2 Feb 2011 (KICKER); the year-2011 row is Lanus' },
  { n: 'Peter Niemeyer', why: 'Werder Bremen to Hertha BSC (Hertha BSC, 9 Aug 2010, Peter Niemeyer ist Herthaner)' },
  { n: 'Réver', why: 'Wolfsburg to Atletico Mineiro, 31 Jul 2010 (KICKER)' },
  { n: 'Ricardo Osorio', why: 'Stuttgart to C.F. Monterrey (the club, Terra – Se incorpora Ricardo Osorio al equipo)' },
  { n: 'Ricardo Quaresma', why: 'Inter Milan to Besiktas (ESPN-IT, 25 Jul 2010)' },
  { n: 'Róbert Vittek', why: 'Lille to Ankaragucu, 1 Feb 2010 (KICKER)' },
  { n: 'Roberto Hilbert', why: 'Stuttgart to Beşiktaş J.K. (Focus, 22 Jun 2010, Besiktas nimmt Hilbert unter Vertrag)' },
  { n: 'Salvatore Bocchetti', why: 'Genoa to Rubin Kazan, 28 Aug 2010 (KICKER)' },
  { n: 'Savio Nsereko', why: 'left Bologna as his loan ended, listed Bologna to Monaco (ESPN-FR, 22 Jul 2010); the year-2011 row is outside the world' },
  { n: 'Sidney Govou', why: 'Lyon to Panathinaikos, 1 Jul 2010 (KICKER; MF-REC)' },
  { n: 'Stephan El Shaarawy', why: 'Genoa to Padova (ESPN-IT, 25 Jul 2010)' },
  { n: 'Timo Hildebrand', why: 'Hoffenheim to Sporting, 1 Sep 2010 (KICKER)' },
  { n: 'Vicente Sánchez', why: 'Schalke 04 to América (ESPN-DE, 7 Jul 2010)' },
  { n: 'Yonese Hanine', why: 'Chievo Verona to Crotone (AC ChievoVerona, 8 Jul 2010, UFFICIALE: HANINE IN PRESTITO AL CROTONE)' },
  { n: 'Zoran Tosic', why: 'Köln to CSKA Moscow (ESPN-EN, 15 Jun 2010)' },
  { n: 'Zvjezdan Misimovic', why: 'Wolfsburg to Galatasaray, 31 Aug 2010 (KICKER)' },
  { n: 'Andrea Ranocchia', why: 'Inter bought him and loaned him to Genoa for the first half of 2010-11 (ESPN-IT, 22 Jul 2010, Bari to Genoa)', later: 'the year-2011 row is Inter, where he went in January 2011, so it cannot place him at the season start' },
  { n: 'Davide Lanzafame', why: 'his Parma loan ended, back at Juventus 1 Jul 2010 (KICKER; ESPN-IT, 25 Jul 2010)', later: 'the year-2011 row is Brescia, where he went on 4 Jan 2011 (KICKER)' },
  { n: 'Eduardo', why: 'Arsenal to Shakhtar Donetsk, 21 Jul 2010 (ESPN-EN)', later: 'the year-2011 Genoa row is a different man, the Portugal goalkeeper Eduardo, who arrives at Genoa below; this Eduardo\'s own year-2011 row is Shakhtar' },
  { n: 'Eric-Maxim Choupo-Moting', why: 'his Nurnberg loan ended, back at Hamburg 1 Jul 2010 (KICKER)', later: 'the year-2011 row is Mainz, where he went in summer 2011' },
  { n: 'Obafemi Martins', why: 'Wolfsburg to Rubin Kazan, 10 Jul 2010 (KICKER)', later: 'the year-2011 row is Birmingham, where he went on loan on 31 Jan 2011 (ESPN-EN)' },
  { n: 'Pierre-Emerick Aubameyang', why: 'his Lille loan ended, Milan loaned him to Monaco, 1 Jul 2010 (KICKER)', later: 'the year-2011 row is Saint-Etienne, where he went on 31 Jan 2011 (KICKER)' },
  { n: 'Andrea Parola', why: 'Cagliari to Libre (ESPN-IT, 22 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Andrea Raggi', why: 'Bologna to Bari, 1 Jul 2010 (KICKER; ESPN-IT, 22 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Antonio Mazzotta', why: 'Lecce to Lecce (US Lecce, 22 Jun 2010, Esercitato il diritto di compartecipazione su Mazzotta); no year-2011 row at all', single: true },
  { n: 'Aristide Bancé', why: 'Mainz to Al Ahli (placekicker, 15 Aug 2010, Aristide Bancé wechselt zum Al Ahli FC nach Dubai); no year-2011 row at all', single: true },
  { n: 'Arnold Bruggink', why: 'released by Hannover in summer 2010, at Twente from 25 Oct 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Augusto Fernández', why: 'Saint-Étienne to Vélez Sarsfield (ESPN-FR, 28 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Benjamin Gavanon', why: 'Sochaux to Nancy, 1 Jul 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Christian Obodo', why: 'Udinese to Torino (ESPN-IT, 17 Aug 2010); no year-2011 row at all', single: true },
  { n: 'Christoph Spycher', why: 'Eintracht Frankfurt to BSC Young Boys (BSC Young Boys, 28 Apr 2010, YB holt Christoph Spycher); no year-2011 row at all', single: true },
  { n: 'Damiano Zenoni', why: 'Parma to Libre (ESPN-IT, 25 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Daniele Franceschini', why: 'Sampdoria to Libre (ESPN-IT, 25 Jul 2010); no year-2011 row at all', single: true },
  { n: 'David Suazo', why: 'his Genoa loan ended, back at Inter 1 Jul 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Dida', why: 'AC Milan to Libre (ESPN-IT, 25 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Eidur Gudjohnsen', why: 'Monaco to Stoke, 31 Aug 2010 (KICKER; ESPN-EN, 31 Aug 2010); no year-2011 row at all', single: true },
  { n: 'Élson', why: 'Hannover 96 to VfB Stuttgart (Deutsche Fußball Liga, 22 Jul 2010, Elson-Wechsel vorerst geplatzt); no year-2011 row at all', single: true },
  { n: 'Erik Jendrisek', why: 'Kaiserslautern to FC Schalke 04 (the club, 29 Oct 2010); no year-2011 row at all', single: true },
  { n: 'Fabio Cannavaro', why: 'Juventus to Al Ahli (ESPN-IT, 25 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Francesco Valiani', why: 'Bologna to Parma, 1 Feb 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Hernán Crespo', why: 'Genoa loaned him to Parma, 30 Jan 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Igor Budan', why: 'Palermo to Cesena, 31 Aug 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Jonathan Santana', why: 'Wolfsburg to Kayserispor (VfL Wolfsburg, 15 Jul 2010, Jonathan Santana wechselt in die Türkei); no year-2011 row at all', single: true },
  { n: 'Julio Cruz', why: 'Lazio to Libre (ESPN-IT, 25 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Kakhaber Kaladze', why: 'left Milan on 30 Aug 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Leandro Rinaudo', why: 'Napoli to Juventus on loan, 31 Aug 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Lukas Sinkiewicz', why: 'Bayer Leverkusen to FC Augsburg (FC Augsburg, 20 Jul 2010, Lukas Sinkiewicz wechselt zum FCA); no year-2011 row at all', single: true },
  { n: 'Maicosuel', why: 'Hoffenheim to Botafogo FR (1899 Hoffenheim, 21 Jul 2010, Maicosuel wechselt nach Botafogo); no year-2011 row at all', single: true },
  { n: 'Maniche', why: 'Koln to Sporting, 1 Jul 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Manuele Blasi', why: 'his Palermo loan ended, back at Napoli 1 Jul 2010 (KICKER; ESPN-IT, 25 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Marcelo Zalayeta', why: 'Bologna to Kayserispor (Kayserispor, 25 Aug 2010, MARCELO DANUBIO ZALAYETA KULÜBÜMÜZDE); no year-2011 row at all', single: true },
  { n: 'Marco Pisano', why: 'Bari to Parma (Parma FC, 2 Aug 2010, Pisano al Parma, Olivera al Torino); no year-2011 row at all', single: true },
  { n: 'Mariano Bogliacino', why: 'Napoli to Chievo Verona (ESPN-IT, 28 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Max Tonetto', why: 'left Roma when his contract ended on 30 Jun 2010 (KICKER; ESPN-IT, 25 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Mickaël Tavares', why: 'Nürnberg to Middlesbrough (ESPN-DE, 28 Aug 2010); no year-2011 row at all', single: true },
  { n: 'Nicola Mingazzini', why: 'Bologna to Libre (ESPN-IT, 22 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Paolo Sammarco', why: 'Udinese to Sampdoria, 1 Jul 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Pedro Kamatà', why: 'Bari to Siena (ESPN-IT, 22 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Petter Hansson', why: 'Rennes to Monaco, 1 Jul 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Rob Friend', why: 'Gladbach to Hertha BSC (Der Tagesspiegel, 19 Jun 2010, Hertha holt Stürmer Rob Friend); no year-2011 row at all', single: true },
  { n: 'Roberto Guana', why: 'his Bologna loan ended, Palermo to Chievo, 5 Aug 2010 (KICKER; ESPN-IT, 17 Aug 2010); no year-2011 row at all', single: true },
  { n: 'Selim Teber', why: 'Eintracht Frankfurt to Kayserispor (Hessischer Rundfunk, 7 Jul 2010, Teber kehrt Eintracht den Rücken); no year-2011 row at all', single: true },
  { n: 'Stephen Appiah', why: 'Bologna to Libre (ESPN-IT, 22 Jul 2010); no year-2011 row at all', single: true },
  { n: 'Vladimir Koman', why: 'his Bari loan ended, at Sampdoria from 1 Jul 2010 (KICKER); no year-2011 row at all', single: true },
  { n: 'Yohan Benalouane', why: 'Saint-Étienne to Cesena (AS Saint-Étienne, 31 Aug 2010, Benalouane transféré à Cesena (Série A)); no year-2011 row at all', single: true },
];
const B5_ARRIVALS = [
  { n: 'Robinho', from: 'Manchester City', to: 'AC Milan', why: 'Manchester City to AC Milan (ESPN-EN, 31 Aug 2010)' },
  { n: 'Zlatan Ibrahimović', from: 'FC Barcelona', to: 'AC Milan', why: 'Barcelona loaned him to Milan, 28 Aug 2010 (KICKER); Round 146 removal, home now' },
  { n: 'Anthony Le Tallec', from: 'Le Mans FC', to: 'Auxerre', why: 'Le Mans FC to Auxerre (L\'Equipe, 26 Jun 2010, Le Tallec, 4 ans à Auxerre)' },
  { n: 'Abdelkader Ghezzal', from: 'Siena FC', to: 'Bari', why: 'Siena FC to Bari (ESPN-IT, 22 Jul 2010)' },
  { n: 'Domagoj Vida', from: 'NK Osijek', to: 'Bayer Leverkusen', why: 'NK Osijek to Bayer Leverkusen (Bayer 04 Leverkusen, 29 Apr 2010, Bayer 04 verpflichtet Domagoj Vida)' },
  { n: 'Albin Ekdal', from: 'Siena FC', to: 'Bologna', why: 'Siena FC to Bologna (ESPN-IT, 22 Jul 2010)' },
  { n: 'György Garics', from: 'Atalanta BC', to: 'Bologna', why: 'Atalanta BC to Bologna (Atalanta BC, 9 Aug 2010, RAIMONDI ALL’ATALANTA, GARICS AL BOLOGNA)' },
  { n: 'Luca Siligardi', from: 'US Triestina', to: 'Bologna', why: 'US Triestina to Bologna (ESPN-IT, 22 Jul 2010)' },
  { n: 'Matteo Rubin', from: 'Torino FC', to: 'Bologna', why: 'Torino FC to Bologna (Bologna FC 1909, 20 Aug 2010, Rubin al Bologna)' },
  { n: 'Anthony Modeste', from: 'Angers SCO', to: 'Bordeaux', why: 'Angers SCO to Bordeaux (France Football, 12 Aug 2010, Modeste à Bordeaux, c’est fait!)' },
  { n: 'Robert Lewandowski', from: 'Lech Poznan', to: 'Borussia Dortmund', why: 'Lech Poznan to Borussia Dortmund (Revier Sport, 11 Jun 2010, BVB: Robert Lewandowski, Transfer ist perfekt)' },
  { n: 'Shinji Kagawa', from: 'Cerezo Osaka', to: 'Borussia Dortmund', why: 'Cerezo Osaka to Borussia Dortmund (Deutsche Fußball Liga, 11 May 2010, Kagawa wechselt zum BVB)' },
  { n: 'Damien Marcq', from: 'US Boulogne', to: 'Caen', why: 'US Boulogne to Caen (France Football, 27 Jun 2010, Marcq à Caen lundi)' },
  { n: 'Romain Hamouma', from: 'Stade Lavallois', to: 'Caen', why: 'Stade Lavallois to Caen (France Football, 26 May 2010, Hamouma signe à Caen)' },
  { n: 'Ivan Pelizzoli', from: 'UC AlbinoLeffe', to: 'Cagliari', why: 'UC AlbinoLeffe to Cagliari (Cagliari Calcio, 26 Aug 2010, Pelizzoli è del Cagliari)' },
  { n: 'Theofanis Gekas', from: 'Hertha BSC', to: 'Eintracht Frankfurt', why: 'Hertha BSC to Eintracht Frankfurt (the club, Eintracht verpflichtet Theofanis Gekas)' },
  { n: 'Artur Boruc', from: 'Celtic FC', to: 'Fiorentina', why: 'Celtic FC to Fiorentina (ESPN-IT, 15 Jul 2010)' },
  { n: 'Eduardo', from: 'SC Braga', to: 'Genoa', why: 'the Portugal goalkeeper, Braga to Genoa (ESPN-IT, 25 Jul 2010, as Eduardo Carvalho)' },
  { n: 'Miguel Veloso', from: 'Sporting CP', to: 'Genoa', why: 'Sporting CP to Genoa (ESPN-IT, 28 Jul 2010)' },
  { n: 'Igor de Camargo', from: 'Standard Liège', to: 'Gladbach', why: 'Standard Liège to Gladbach (the club, Borussia verpflichtet Igor de Camargo)' },
  { n: 'Änis Ben-Hatira', from: 'MSV Duisburg', to: 'Hamburg', why: 'MSV Duisburg to Hamburg (Die Welt, 4 Jun 2010, Überangebot im HSV-Kader bringt Mitläufern Probleme)' },
  { n: 'Gojko Kacar', from: 'Hertha BSC', to: 'Hamburg', why: 'Hertha to Hamburg, 23 Jul 2010 (KICKER)' },
  { n: 'Jaroslav Drobný', from: 'Hertha BSC', to: 'Hamburg', why: 'Hertha BSC to Hamburg (Hamburger SV, 6 Jul 2010, Drobny-Wechsel perfekt: )' },
  { n: 'Emanuel Pogatetz', from: 'Middlesbrough FC', to: 'Hannover 96', why: 'Middlesbrough FC to Hannover 96 (Hannover 96, 2 Jun 2010, Innenverteidiger Pogatetz kommt)' },
  { n: 'Mohammed Abdellaoue', from: 'Vålerenga Fotball Elite', to: 'Hannover 96', why: 'Vålerenga Fotball Elite to Hannover 96 (Hannover 96, 18 Aug 2010, Unser ’Star aus Oslo’)' },
  { n: 'Moritz Stoppelkamp', from: 'Rot-Weiß Oberhausen', to: 'Hannover 96', why: 'Rot-Weiß Oberhausen to Hannover 96 (the club, Stoppelkamp verlässt RWO)' },
  { n: 'Gylfi Sigurdsson', from: 'Reading FC', to: 'Hoffenheim', why: 'Reading FC to Hoffenheim (ESPN-DE, 31 Aug 2010)' },
  { n: 'Peniel Mlapa', from: 'TSV 1860 Munich', to: 'Hoffenheim', why: 'TSV 1860 Munich to Hoffenheim (TSG 1899 Hoffenheim, 25 May 2010, Hoffenheim verpflichtet deutschen U19-Nationalspieler Mlapa)' },
  { n: 'Tom Starke', from: 'MSV Duisburg', to: 'Hoffenheim', why: 'MSV Duisburg to Hoffenheim (the club)' },
  { n: 'Philippe Coutinho', from: 'Clube de Regatas Vasco da Gama', to: 'Inter Milan', why: 'Clube de Regatas Vasco da Gama to Inter Milan (ESPN-IT, 25 Jul 2010)' },
  { n: 'Milos Krasic', from: 'CSKA Moscow', to: 'Juventus', why: 'CSKA Moscow to Juventus (Juventus FC, 21 Aug 2010, Agreement with PFC Cska Moscow for the acquisition of the registration rights of the player Milos Krasic)' },
  { n: 'Christian Tiffert', from: 'MSV Duisburg', to: 'Kaiserslautern', why: 'MSV Duisburg to Kaiserslautern (the club, Christian Tiffert wird ein Roter Teufel)' },
  { n: 'Stiven Rivic', from: 'FC Energie Cottbus', to: 'Kaiserslautern', why: 'FC Energie Cottbus to Kaiserslautern (RP Online, 1 Jul 2010, Kaiserslautern holt Rivic)' },
  { n: 'Mato Jajalo', from: 'Siena FC', to: 'Köln', why: 'Siena FC to Köln (1. FC Köln, 2 Jul 2010, FC leiht Mato Jajalo aus)' },
  { n: 'Davide Brivio', from: 'LR Vicenza', to: 'Lecce', why: 'LR Vicenza to Lecce (ESPN-IT, 28 Jul 2010)' },
  { n: 'Ignacio Piatti', from: 'CA Independiente', to: 'Lecce', why: 'CA Independiente to Lecce (ESPN-IT, 4 Aug 2010)' },
  { n: 'Christian Fuchs', from: 'VfL Bochum', to: 'Mainz', why: 'VfL Bochum to Mainz (Kicker, 20 Jul 2010, Fuchs verteidigt für Mainz)' },
  { n: 'Lewis Holtby', from: 'VfL Bochum', to: 'Mainz', why: 'VfL Bochum to Mainz (FSV Mainz 05, 28 May 2010, Lewis Holtby wechselt zu Mainz 05)' },
  { n: 'Sami Allagui', from: 'SpVgg Greuther Fürth', to: 'Mainz', why: 'SpVgg Greuther Fürth to Mainz (Bild, 30 Jul 2010, Greuther Fürth:Sami Allagui wechselt zu Mainz 05)' },
  { n: 'Luigi Vitale', from: 'US Livorno 1915', to: 'Napoli', why: 'US Livorno 1915 to Napoli (ESPN-IT, 28 Jul 2010)' },
  { n: 'Mehmet Ekici', from: 'FC Bayern Munich', to: 'Nürnberg', why: 'FC Bayern Munich to Nürnberg (Deutsche Fußball Liga, 2 Jul 2010, Nürnberg leiht Bayerns Ekici aus)' },
  { n: 'Timmy Simons', from: 'PSV Eindhoven', to: 'Nürnberg', why: 'PSV to Nurnberg (1. FC Nurnberg, 16 Jul 2010, Timmy Simons wechselt zum Club)' },
  { n: 'Ezequiel Muñoz', from: 'CA Boca Juniors', to: 'Palermo', why: 'CA Boca Juniors to Palermo (ESPN-IT, 28 Jul 2010)' },
  { n: 'Matteo Darmian', from: 'Calcio Padova', to: 'Palermo', why: 'Calcio Padova to Palermo (ESPN-IT, 25 Jul 2010)' },
  { n: 'Mauricio Pinilla', from: 'US Grosseto 1912', to: 'Palermo', why: 'US Grosseto 1912 to Palermo (ESPN-IT, 25 Jul 2010)' },
  { n: 'Antonio Candreva', from: 'US Livorno 1915', to: 'Parma', why: 'US Livorno 1915 to Parma (Udinese Calcio, 30 Aug 2010, Candreva ceduto al Parma)' },
  { n: 'Filipe Oliveira', from: 'SC Braga', to: 'Parma', why: 'SC Braga to Parma (ESPN-IT, 25 Jul 2010)' },
  { n: 'Gabriel Paletta', from: 'CA Boca Juniors', to: 'Parma', why: 'CA Boca Juniors to Parma (ESPN-IT, 25 Jul 2010)' },
  { n: 'Jean-Armel Kana-Biyik', from: 'Le Havre AC', to: 'Rennes', why: 'Le Havre AC to Rennes (France Football, 22 Jun 2010, Kana-Biyik 4 ans à Rennes)' },
  { n: 'Aleandro Rosi', from: 'Siena FC', to: 'Roma', why: 'Siena FC to Roma (ESPN-IT, 25 Jul 2010)' },
  { n: 'Angelo da Costa', from: 'Ancona Calcio', to: 'Sampdoria', why: 'Ancona Calcio to Sampdoria (ESPN-IT, 17 Aug 2010)' },
  { n: 'Gianluca Curci', from: 'Siena FC', to: 'Sampdoria', why: 'Siena FC to Sampdoria (ESPN-IT, 25 Jul 2010)' },
  { n: 'Atsuto Uchida', from: 'Kashima Antlers', to: 'Schalke 04', why: 'Kashima Antlers to Schalke 04 (FC Schalke 04, 13 Jun 2010, WM-Teilnehmer Atsuto Uchida wechselt zu den Knappen)' },
  { n: 'Ciprian Deac', from: 'CFR Cluj', to: 'Schalke 04', why: 'CFR Cluj to Schalke 04 (Deutsche Fußball Liga, 27 Aug 2010, Schalke angelt sich Ciprian Deac)' },
  { n: 'Kyriakos Papadopoulos', from: 'Olympiacos Piraeus', to: 'Schalke 04', why: 'Olympiacos Piraeus to Schalke 04 (FC Schalke 04, 23 Jun 2010, Papadopoulos signs for Royal Blues)' },
  { n: 'Sergio Escudero', from: 'Real Murcia CF', to: 'Schalke 04', why: 'Real Murcia CF to Schalke 04 (FC Schalke 04, 2 Aug 2010, Sergio Escudero: Gebe mein letztes Hemd für den Erfolg mit Schalke!)' },
  { n: 'Fin Bartels', from: 'FC Hansa Rostock', to: 'St. Pauli', why: 'FC Hansa Rostock to St. Pauli (Hamburger Abendblatt, 12 May 2010, Rostocker Stürmer Fin Bartels ist sich mit dem FC St. Pauli einig)' },
  { n: 'Pablo Armero', from: 'Sociedade Esportiva Palmeiras', to: 'Udinese', why: 'Sociedade Esportiva Palmeiras to Udinese (Udinese Calcio, 28 Aug 2010, PABLO ARMERO E’ UFFICIALMENTE BIANCONERO)' },
  { n: 'Wesley', from: 'Santos FC', to: 'Werder Bremen', why: 'Santos FC to Werder Bremen (Werder Bremen, 20 Aug 2010, Zusage des FC Santos: Wesley wechselt nach Bremen)' },
  { n: 'Arne Friedrich', from: 'Hertha BSC', to: 'Wolfsburg', why: 'Hertha BSC to Wolfsburg (Deutsche Fußball Liga, 2 Jul 2010, Friedrich wechselt nach Wolfsburg)' },
];
/* BIG_FIVE_CORRECTIONS_END */

/* A 2010-11 Serie A, Bundesliga and Ligue 1 without their own headlines are
   not those leagues, and the re-audit has to have landed. */
const BIG_FIVE_ANCHORS = [
  ['Barcelona', 'Lionel Messi'], ['Real Madrid', 'Cristiano Ronaldo'], ['Manchester United', 'Wayne Rooney'],
];
/* Thin only where the table itself is thin (under 8 real rows after the
   corrections). */
const BIG_FIVE_THIN = ['Blackpool', 'Arles-Avignon', 'Cesena'];

if (bigFiveArg) {
  const argOf = (flag, dflt) => {
    const a = process.argv.find(x => x.startsWith(`${flag}=`));
    return a ? a.slice(a.indexOf('=') + 1) : dflt;
  };
  const file = path.join(ROOT, 'src/data/clubManagerEra2010.ts');
  const res = runExtend({
    file: argOf('--base', file), outFile: file, prefix: 'ERA2010', year: 2010,
    rows: readPull(argOf('--pull', 'C:/Users/antho/dukb-handoff/data/market-base-2005-2010-2015.json')),
    nextRows: readPull(argOf('--next', 'C:/Users/antho/dukb-handoff/data/market-base-2006-2011-2016.json')),
    newLeagues: [
      { label: 'Serie A', dbToEra: DB_TO_ERA_SA },
      { label: 'Bundesliga', dbToEra: DB_TO_ERA_BL },
      { label: 'Ligue 1', dbToEra: DB_TO_ERA_L1 },
    ],
    worldDbToEra: { ...DB_TO_ERA_PL, ...DB_TO_ERA_LL, ...DB_TO_ERA_SA, ...DB_TO_ERA_BL, ...DB_TO_ERA_L1 },
    folds: B5_FOLDS, moves: B5_MOVES, removals: B5_REMOVALS, arrivals: B5_ARRIVALS, namesakes: B5_NAMESAKES,
    anchors: BIG_FIVE_ANCHORS,
    expectedThin: BIG_FIVE_THIN,
    header: s => [
      '// AUTO-GENERATED by scripts/bakeEra2010.mjs (Round 146, extended Round 901).',
      '// The 2010-11 era world: real year-2010 Transfermarkt rows from',
      `// player_market_values for all ${s.clubs} clubs of the 2010-11 Premier League,`,
      '// La Liga, Serie A, Bundesliga and Ligue 1. The last three joined in Round',
      '// 901 through the extend step (scripts/lib/eraBakeExtend.mjs; the new',
      '// leagues from an offline pull of the base table, the lines already',
      '// shipped carried through as bytes). Memberships and sources are in the',
      '// script header. The verified summer 2010 window corrections are applied',
      `// across all five leagues (${s.moves} rows moved, removed, arrived or folded`,
      '// in total). Values in £m at the year-2010 snapshot, ratings 48-94 on the',
      '// same curve as the 2026 bake. Regenerate per the header of',
      '// scripts/bakeEra2010.mjs.',
      '// DO NOT EDIT BY HAND.',
    ],
  }, { write: !process.argv.includes('--dry') && !process.argv.includes('--check') });
  const s = res.stats;
  console.log(`Extended to ${s.players} players across ${s.clubs} clubs (${s.partial.length} partial: ${s.partial.join(', ')}).`);
  console.log(`Big five corrections: ${s.moved} moved, ${s.removed} removed, ${s.arrived} arrived, ${s.folded} folded, ${s.collisions} namesakes resolved.`);
  console.log(`Shipped lines: ${s.shippedLines}, of which ${s.shippedKept} are still in the world byte for byte. Touched:`);
  for (const t of s.touched) console.log(`  ${t}`);
  console.log(`New club sizes: ${Object.entries(s.sizes).map(([c, n]) => `${c} ${n}`).join(', ')}`);
  /* --check: rebuild and compare with the shipped file, write nothing (the
     harness scripts/simEraBakeExtend.mjs runs this from the 40 club base). */
  if (process.argv.includes('--check')) {
    const norm = t => t.replace(/\r\n/g, '\n');
    if (norm(fs.readFileSync(file, 'utf8')) !== norm(res.text)) {
      console.error('CHECK: the rebuilt era file differs from src/data/clubManagerEra2010.ts');
      process.exit(1);
    }
    console.log('CHECK: the rebuilt era file is byte identical to the shipped one (line endings aside).');
    process.exit(0);
  }
  /* The market's nationality filter reads one map per world, and it must hold
     exactly this world's names. */
  if (!process.argv.includes('--dry')) {
    const n = updateNationalityBlock(path.join(ROOT, 'src/data/playerNationalities.ts'), 'era2010', res);
    console.log(`Nationalities, era2010 block: ${n.added} added, ${n.changed} re-pointed, ${n.dropped} dropped, ${n.total} entries for ${s.players} players.`);
  }
  process.exit(0);
}

/* ------------------------------------------------------------------ */
const readDump = (arg, map, label) => {
  const p = arg.slice(arg.indexOf('=') + 1);
  const dump = JSON.parse(fs.readFileSync(p, 'utf8'));
  const rows = dump.rows ?? dump;
  const out = [];
  for (const r of rows) {
    const engine = map[r.club];
    if (!engine) {
      console.error(`FATAL: ${label} dump row at unmapped club "${r.club}"`);
      process.exit(1);
    }
    out.push({ ...r, engine });
  }
  console.log(`${label}: ${out.length} rows`);
  return out;
};

const rows = [
  ...readDump(plArg, DB_TO_ERA_PL, 'Premier League 2010'),
  ...readDump(llArg, DB_TO_ERA_LL, 'La Liga 2010'),
];

/* One name, one player, per era world. The dumps are DISTINCT ON already,
 * but the two leagues could share a name; keep the higher value row. */
const byPlayer = new Map();
for (const r of rows) {
  const prev = byPlayer.get(r.player_name);
  if (!prev || r.market_value_usd > prev.market_value_usd) byPlayer.set(r.player_name, r);
}

/* Apply the window corrections. */
let moved = 0, removed = 0, arrived = 0;
for (const mv of ERA_MOVES_2010) {
  const rec = byPlayer.get(mv.n);
  if (!rec) {
    console.error(`FATAL: mover "${mv.n}" not found in the dumps, the correction list is stale`);
    process.exit(1);
  }
  if (mv.to === null) { byPlayer.delete(mv.n); removed += 1; }
  else { rec.engine = mv.to; moved += 1; }
}
for (const ar of ERA_ARRIVALS_2010) {
  if (byPlayer.has(ar.n)) {
    console.error(`FATAL: arrival "${ar.n}" already in the dumps, remove the duplicate entry`);
    process.exit(1);
  }
  byPlayer.set(ar.n, { player_name: ar.n, engine: ar.to, position: ar.position, age: ar.age, market_value_usd: ar.usd });
  arrived += 1;
}

/* Group, map positions (fail closed), sort. */
const engineClubs = [...new Set([...Object.values(DB_TO_ERA_PL), ...Object.values(DB_TO_ERA_LL)])];
const byClub = new Map(engineClubs.map(c => [c, []]));
for (const rec of byPlayer.values()) {
  const p = POS_MAP[rec.position];
  if (!p) {
    console.error(`FATAL: unmapped position "${rec.position}" (${rec.player_name})`);
    process.exit(1);
  }
  byClub.get(rec.engine).push({ n: rec.player_name, p, a: rec.age, v: gbpM(rec.market_value_usd), r: ratingOf(rec.market_value_usd) });
}
for (const list of byClub.values()) list.sort((a, b) => b.v - a.v || a.n.localeCompare(b.n));

/* Validate: anchors, and thinness only where the table itself is thin. */
const anchor = (club, name) => {
  if (!(byClub.get(club) ?? []).some(pl => pl.n === name)) {
    console.error(`FATAL: anchor ${name} missing from 2010 ${club}`);
    process.exit(1);
  }
};
anchor('Barcelona', 'Lionel Messi');
anchor('Real Madrid', 'Cristiano Ronaldo');
anchor('Manchester United', 'Wayne Rooney');
anchor('Barcelona', 'David Villa');
anchor('Tottenham', 'Rafael van der Vaart');

const EXPECTED_THIN = new Set(['Blackpool']);
const partial = [];
let total = 0;
for (const club of engineClubs) {
  const n = byClub.get(club).length;
  total += n;
  if (n < 8) {
    partial.push(club);
    if (!EXPECTED_THIN.has(club)) {
      console.error(`FATAL: ${club} has only ${n} real 2010 players and was not expected thin`);
      process.exit(1);
    }
  }
}

/* Emit. */
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const clubsSorted = [...engineClubs].sort();
let out = `// AUTO-GENERATED by scripts/bakeEra2010.mjs (Round 146). The 2010-11 era
// world: real year-2010 Transfermarkt rows from player_market_values for all
// 40 clubs of the 2010-11 Premier League and La Liga, with the verified
// summer 2010 window corrections applied (${moved} moved, ${removed} left for
// clubs outside this world, ${arrived} arrived from outside it). Values in £m
// at the year-2010 snapshot, ratings 48-94 on the same curve as the 2026
// bake. Regenerate per the header of scripts/bakeEra2010.mjs.
// DO NOT EDIT BY HAND.
import type { BakedPlayer } from '@/data/clubManagerRosters';

export const ERA2010_META = {
  year: 2010,
  players: ${total},
  clubs: ${clubsSorted.length},
  moves: ${moved + removed + arrived},
};

/** 2010 clubs where the year-2010 table runs thin (under 8 real players);
 *  the game pads these squads with youth players and the picker says so. */
export const ERA2010_PARTIAL: string[] = ${JSON.stringify(partial.sort())};

export const ERA2010_ROSTERS: Record<string, BakedPlayer[]> = {
`;
for (const club of clubsSorted) {
  out += `  '${esc(club)}': [\n`;
  for (const p of byClub.get(club)) {
    out += `    { n: '${esc(p.n)}', p: '${p.p}', a: ${p.a}, v: ${p.v}, r: ${p.r} },\n`;
  }
  out += `  ],\n`;
}
out += `};\n`;

fs.writeFileSync(path.join(ROOT, 'src/data/clubManagerEra2010.ts'), out);
console.log(`Baked ${total} players across ${clubsSorted.length} clubs (${partial.length} partial) -> src/data/clubManagerEra2010.ts`);
console.log(`Window corrections: ${moved} moved, ${removed} removed, ${arrived} arrived`);
