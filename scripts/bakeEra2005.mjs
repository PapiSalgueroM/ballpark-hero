/**
 * Round 176: bake the 2005-06 era world for Club Manager, the last slice of
 * the past eras program the data can honestly reach (player_market_values
 * bottoms out at 2004, and a season needs the year AFTER it for the two-way
 * move verification, so 2005-06 is the floor and an exact 2000 era stays
 * impossible). Two leagues, Premier League and La Liga, forty clubs, every
 * player a real year-2005 Transfermarkt row from our own table. The season
 * itself: Mourinho's Chelsea going back to back, Ronaldinho's Ballon d'Or
 * Barcelona, a 17 year old Messi, Gerrard's Istanbul champions.
 *
 * OFFLINE ONLY. The cloud sandbox cannot reach Supabase directly, so this
 * script reads two dump files produced through the Supabase MCP:
 *
 *   node scripts/bakeEra2005.mjs --pl=pl2005.json --laliga=laliga2005.json
 *
 * Each dump is {"rows":[{player_name, club, position, age, market_value_usd}]}
 * from:
 *   SELECT json_agg(json_build_object(...)) FROM (
 *     SELECT DISTINCT ON (player_name) player_name, club, position, age,
 *       market_value_usd
 *     FROM player_market_values
 *     WHERE year = 2005 AND club IN (...the league's DB name variants...)
 *     ORDER BY player_name, market_value_usd DESC) t;
 *
 * NOTE: the base table, NOT the dedup view, and year = 2005 exactly. No 2004
 * fallback: thin is honest, that is what ERA2005_PARTIAL is for, and this
 * era leans on it harder than any other. Cadiz hold exactly ONE real
 * year-2005 row and Alaves seven, so both ship as declared partial squads
 * padded with made up youth players, and the picker says so. That is the
 * honest shape of the data floor, not a bug.
 *
 * THE CALENDAR CORRECTION. Year-2005 snapshots straddle the summer 2005
 * window unevenly (Robinho and Scott Parker already sit at their new clubs,
 * Michael Owen does not), so the correction list moves exactly the famous
 * movers the dumps show at pre-window clubs, every one verified two ways:
 * common history AND the table's own year-2006 rows showing the destination
 * (queried 2026-08-19). Values stay the year-2005 snapshot for everyone.
 * Players who left this two-league world entirely (Vieira to Juventus, Figo
 * and Samuel to Inter, Anelka whose January 2005 Fenerbahce move predates
 * the season) are removed rather than relocated.
 *
 * FAILS CLOSED on unmapped positions, missing marquee anchors, or a thin
 * club that is not in the expected-thin list.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runExtend, readPull, updateNationalityBlock, POS_MAP, ratingOf, gbpM } from './lib/eraBakeExtend.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Round 902: Serie A, the Bundesliga and Ligue 1 join through the shared step
   in scripts/lib/eraBakeExtend.mjs. See THE BIG FIVE EXTENSION further down. */
const bigFiveArg = process.argv.includes('--extend-big-five');

const plArg = process.argv.find(a => a.startsWith('--pl='));
const llArg = process.argv.find(a => a.startsWith('--laliga='));
if (!bigFiveArg && (!plArg || !llArg)) {
  console.error('Usage: node scripts/bakeEra2005.mjs --extend-big-five [--base=<the 40 club file>] [--pull=<year 2005 pull>] [--next=<year 2006 pull>] [--dry] [--check]');
  console.error('   or (Round 176, superseded full bake): node scripts/bakeEra2005.mjs --pl=pl2005.json --laliga=laliga2005.json');
  process.exit(1);
}

/* DB club name -> era engine club name. Shared clubs reuse the exact 2026
 * world spelling, and clubs already named by the 2010 or 2015 eras reuse
 * THAT spelling. 2005-only clubs get their natural short names. */
const DB_TO_ERA_PL = {
  'Arsenal FC': 'Arsenal', 'Aston Villa': 'Aston Villa',
  'Birmingham City': 'Birmingham City', 'Blackburn Rovers': 'Blackburn Rovers',
  'Bolton Wanderers': 'Bolton Wanderers', 'Charlton Athletic': 'Charlton Athletic',
  'Chelsea FC': 'Chelsea', 'Everton FC': 'Everton', 'Fulham FC': 'Fulham',
  'Liverpool FC': 'Liverpool', 'Manchester City': 'Manchester City',
  'Manchester United': 'Manchester United', 'Middlesbrough FC': 'Middlesbrough',
  'Newcastle United': 'Newcastle', 'Portsmouth FC': 'Portsmouth',
  'Sunderland AFC': 'Sunderland', 'Tottenham Hotspur': 'Tottenham',
  'West Bromwich Albion': 'West Brom', 'West Ham United': 'West Ham',
  'Wigan Athletic': 'Wigan Athletic',
};
const DB_TO_ERA_LL = {
  'Deportivo Alavés': 'Alavés', 'Athletic Bilbao': 'Athletic Club',
  'Atlético de Madrid': 'Atlético Madrid', 'FC Barcelona': 'Barcelona',
  'Cádiz CF': 'Cádiz', 'Celta de Vigo': 'Celta Vigo',
  'Deportivo de La Coruña': 'Deportivo La Coruña',
  // The table splits Espanyol across two name variants; both are the club.
  'RCD Espanyol Barcelona': 'Espanyol', 'RCD Espanyol': 'Espanyol',
  'Getafe CF': 'Getafe', 'Málaga CF': 'Málaga', 'RCD Mallorca': 'Mallorca',
  'CA Osasuna': 'Osasuna', 'Racing Santander': 'Racing Santander',
  'Real Betis Balompié': 'Real Betis', 'Real Madrid': 'Real Madrid',
  'Real Sociedad': 'Real Sociedad', 'Sevilla FC': 'Sevilla',
  'Valencia CF': 'Valencia', 'Villarreal CF': 'Villarreal',
  'Real Zaragoza': 'Zaragoza',
};

/* The verified summer 2005 window corrections. `to: null` means the player
 * left this two-league world entirely. Every entry checked against the
 * table's own year-2006 rows on 2026-08-19. */
const ERA_MOVES_2005 = [
  // England's window, and the Liverpool rebuild after Istanbul.
  { n: 'Michael Owen', to: 'Newcastle' },
  { n: 'Shaun Wright-Phillips', to: 'Chelsea' },
  { n: 'Edwin van der Sar', to: 'Manchester United' },
  { n: 'Pepe Reina', to: 'Liverpool' },
  { n: 'Mohamed Sissoko', to: 'Liverpool' },
  { n: 'Fernando Morientes', to: 'Liverpool' },
  { n: 'Milan Baros', to: 'Aston Villa' },
  { n: 'Yakubu', to: 'Middlesbrough' },
  { n: 'Asier del Horno', to: 'Chelsea' },
  // Newcastle's outgoing side of the Owen summer.
  { n: 'Craig Bellamy', to: 'Blackburn Rovers' },
  { n: 'Jermaine Jenas', to: 'Tottenham' },
  { n: 'Patrick Kluivert', to: 'Valencia' },
  // Spain's window.
  { n: 'Sergio Ramos', to: 'Real Madrid' },
  { n: 'Júlio Baptista', to: 'Real Madrid' },
  { n: 'David Villa', to: 'Valencia' },
  { n: 'Maxi Rodríguez', to: 'Atlético Madrid' },
  { n: 'Mateja Kežman', to: 'Atlético Madrid' },
  // Out of this two-league world entirely.
  { n: 'Luís Figo', to: null },
  { n: 'Patrick Vieira', to: null },
  { n: 'Walter Samuel', to: null },
  { n: 'Nicolas Anelka', to: null },
];
/* Arrivals from outside carry their own year-2005 row data (position, age,
 * value) pulled the same day, destinations verified via year-2006 rows. */
const ERA_ARRIVALS_2005 = [
  { n: 'Michael Essien', to: 'Chelsea', position: 'Defensive Midfield', age: 22, usd: 41000000 },
  { n: 'Peter Crouch', to: 'Liverpool', position: 'Centre-Forward', age: 23, usd: 11000000 },
  { n: 'Ji-sung Park', to: 'Manchester United', position: 'Attacking Midfield', age: 23, usd: 9000000 },
  { n: 'Aleksandr Hleb', to: 'Arsenal', position: 'Attacking Midfield', age: 23, usd: 12000000 },
  { n: 'Mark van Bommel', to: 'Barcelona', position: 'Central Midfield', age: 27, usd: 13000000 },
];

/* ================= Round 902: THE BIG FIVE EXTENSION ================= */
/* The era grows from two leagues to five IN PLACE, by the move Round 899
   made for 2015-16, through the same shared step scripts/lib/eraBakeExtend.mjs
   (read its header: the shipped 40 club file is the truth for the two
   leagues it holds, its lines carried through as bytes; the 2005-06 Serie A,
   Bundesliga and Ligue 1 come from an OFFLINE pull of the base table; every
   correction is declared below and proved twice). Run:

     node scripts/bakeEra2005.mjs --extend-big-five

   THE DATA, OFFLINE. Production is off limits to a bake, so the lead pulled
   the base table player_market_values once into two files (defaults below,
   --pull= and --next= override): every row of years 2005, 2010 and 2015,
   and every row of 2006, 2011 and 2016. The documented query shape (base
   table, year = 2005 exact, DISTINCT ON (player_name) ... ORDER BY
   player_name, market_value_usd DESC, no fallback year) is reproduced from
   the first file: filter the year and the league's club spellings, keep one
   row per player_name with the highest value, and break a tie on the lowest
   id so the bake is deterministic. The second file is used ONLY as the
   second proof of a summer 2005 move: the club the year 2006 row names.

   RUNNING IT AGAIN. The step refuses a file that already holds a new
   league's club. To regenerate, hand it the 40 club file it grew from:
     git show 06dc0741:src/data/clubManagerEra2005.ts > base.ts
     node scripts/bakeEra2005.mjs --extend-big-five --base=base.ts
   Add --check to rebuild and compare with the shipped file instead of
   writing (scripts/simEraBakeExtend.mjs does exactly that when the pulls
   are on the machine).

   THE RESERVE SIDE SPELLINGS. Eleven second team or youth spellings of
   2005-06 Bundesliga clubs hold year 2005 rows (no Serie A or Ligue 1 club
   has one) ("FC Bayern Munich II" four,
   "Hertha BSC II" three, "Bayer 04 Leverkusen II" three, "Borussia
   Dortmund II" two, one each at the II sides of Wolfsburg, Stuttgart,
   Bielefeld, Hannover, Duisburg and Bremen, and "Hannover 96 U19" one),
   and "FC Bayern Munich" holds two rows of teenagers apart from the 22 of
   "Bayern Munich". Like the six reserve spellings Round 899 met in 2015,
   they stay out of the maps and their rows stay out of the world: the table
   files them under a second team, and the documented query names the first
   team spellings only. */

/* Table spelling -> engine name, all three new leagues. Membership of each,
 * two sources read 2026-10-03 that agree on every club: RSSSF's season
 * records and ESPN's final standings,
 *   https://www.rsssf.org/tablesi/ital06.html and
 *   https://www.espn.com/soccer/standings/_/league/ITA.1/season/2005 (20),
 *   https://www.rsssf.org/tablesd/duit06.html and .../league/GER.1/season/2005 (18),
 *   https://www.rsssf.org/tablesf/fran06.html and .../league/FRA.1/season/2005 (20).
 * Every spelling was checked against the pull (the step fails on a spelling
 * with no rows). Names reuse the 2026 world's spelling wherever the club
 * exists there, and the 2015-16 era's where it exists only there, so colours
 * and rivalries carry over. Clubs with no other name in the game take their
 * natural short name; AC Ajaccio keeps its prefix because GFC Ajaccio, its
 * neighbour, is already a club of the 2015-16 era. */
const DB_TO_ERA_SA = {
  'Juventus FC': 'Juventus', 'AC Milan': 'AC Milan', 'Inter Milan': 'Inter Milan',
  'ACF Fiorentina': 'Fiorentina', 'AS Roma': 'Roma', 'SS Lazio': 'Lazio',
  'Chievo Verona': 'Chievo Verona', 'Palermo FC': 'Palermo', 'US Livorno 1915': 'Livorno',
  'Parma Calcio 1913': 'Parma', 'FC Empoli': 'Empoli', 'Ascoli Calcio': 'Ascoli',
  'Udinese Calcio': 'Udinese', 'UC Sampdoria': 'Sampdoria', 'Reggina 1914': 'Reggina',
  'Cagliari Calcio': 'Cagliari', 'Siena FC': 'Siena', 'ACR Messina': 'Messina',
  'US Lecce': 'Lecce', 'Treviso FBC 1993': 'Treviso',
};
const DB_TO_ERA_BL = {
  'Bayern Munich': 'Bayern Munich', 'SV Werder Bremen': 'Werder Bremen', 'Hamburger SV': 'Hamburg',
  'FC Schalke 04': 'Schalke 04', 'Bayer 04 Leverkusen': 'Bayer Leverkusen', 'Hertha BSC': 'Hertha BSC',
  'Borussia Dortmund': 'Borussia Dortmund', '1.FC Nuremberg': 'Nürnberg', 'VfB Stuttgart': 'Stuttgart',
  'Borussia Mönchengladbach': 'Gladbach', '1.FSV Mainz 05': 'Mainz', 'Hannover 96': 'Hannover 96',
  'Arminia Bielefeld': 'Arminia Bielefeld', 'Eintracht Frankfurt': 'Eintracht Frankfurt',
  'VfL Wolfsburg': 'Wolfsburg', '1.FC Kaiserslautern': 'Kaiserslautern', '1.FC Köln': 'Köln',
  'MSV Duisburg': 'Duisburg',
};
const DB_TO_ERA_L1 = {
  'Olympique Lyon': 'Lyon', 'FC Girondins Bordeaux': 'Bordeaux', 'LOSC Lille': 'Lille',
  'RC Lens': 'Lens', 'Olympique Marseille': 'Marseille', 'AJ Auxerre': 'Auxerre',
  'Stade Rennais FC': 'Rennes', 'OGC Nice': 'Nice', 'Paris Saint-Germain': 'PSG',
  'AS Monaco': 'Monaco', 'Le Mans FC': 'Le Mans', 'AS Nancy-Lorraine': 'Nancy',
  'AS Saint-Étienne': 'Saint-Étienne', 'FC Nantes': 'Nantes', 'FC Sochaux-Montbéliard': 'Sochaux',
  'FC Toulouse': 'Toulouse', 'ESTAC Troyes': 'Troyes', 'AC Ajaccio': 'AC Ajaccio',
  'RC Strasbourg Alsace': 'Strasbourg', 'FC Metz': 'Metz',
};

/* THE SUMMER 2005 WINDOW, FIVE LEAGUES WIDE. The year 2005 rows of the three
 * new leagues mostly predate that summer's window (Toni still at Palermo,
 * Gilardino at Parma, Ribery at Metz, Kuranyi at Stuttgart), so they need
 * the correction the first two leagues got in Round 176, and the first two
 * need a re-audit because the world grew. Every correction is proved twice:
 * a published record AND the table's own year 2006 row, which the shared
 * step CHECKS in code (a move or an arrival dies unless a year 2006 row
 * names the destination; a removal dies if a year 2006 row still sits
 * inside the world, unless it is flagged `later`).
 *
 * The published records, read 2026-10-03, cited on the lines by these keys:
 *   FB   FBref, "2005-2006 Big 5 European Leagues Stats (players)", every man
 *        who played a league game in the five leagues that season with his
 *        club and games, read through the Wayback Machine's copy of 5 Aug
 *        2026: https://fbref.com/en/comps/Big5/2005-2006/stats/players/2005-2006-Big-5-European-Leagues-Stats
 *   KI   kicker, "Wechselboerse, 1. Bundesliga, Saison 2005/06", every
 *        arrival and departure of the eighteen clubs dated line by line,
 *        read through the Wayback Machine's copy of 24 Sep 2005:
 *        http://www.kicker.de/content/saison/transfers.asp
 *   LEQ  L'Equipe's dated dispatches of that summer, cited by their article
 *        id, read through the Wayback Machine:
 *        http://www.lequipe.fr/Football/<id>.html
 *   REP  la Repubblica, cited by the article slug and date, read through
 *        the Wayback Machine: http://www.repubblica.it/2005/<month>/sezioni/sport/calcio/<slug>/
 *   and, named on the line, UEFA.com news, 11v11.com club histories,
 *   soccerway transfer histories and Ultima Hora; and for the review fix
 *   of UNRESOLVED below only, as spot checks of single men, the English or
 *   Italian Wikipedia article named on the line (read 2026-10-03).
 *
 * WHERE AND WHEN. FBref and the year 2006 row prove WHERE a man played in
 * 2005-06; neither proves WHEN he got there, and a January arrival must not
 * be placed at the start of the season. So a correction is made only when
 * its WHEN is proved too, one of two ways:
 *   1. games: he played at least 19 of the 34 Bundesliga rounds or 22 of
 *      the 38 rounds elsewhere for his new club and none for the old one.
 *      A January arrival cannot reach that (the Bundesliga came back from
 *      its winter break with 17 rounds left, Serie A on 8 January with 20,
 *      and the other three leagues with fewer than 22), so these lines cite
 *      FB alone (with a KI date where kicker has one).
 *   2. a dated record from the summer of 2005 naming the move (KI, LEQ,
 *      REP or another named on the line).
 * The kicker list is treated as the whole Bundesliga window: a move into
 * or out of a Bundesliga club that is not on it did not happen that summer
 * (Boris Zivkovic reached Koln, Masmanidis, Kristiansen, Hoiland, Tararache,
 * Cabanas, Borbely, Azaouagh, de Jong and Julio dos Santos their clubs, only
 * later). A man with no proof of WHEN is never moved on a guess, but a keep
 * is a claim too: where the records put him somewhere else at the start of
 * the season, he is removed rather than kept (see UNRESOLVED). Records that
 * showed a January move kept the snapshot too (Pelizzoli to Reggina and
 * Pepe to Udinese on 1 Jan 2006, soccerway; Baseggio to Treviso and Saidi
 * to Lecce at the winter break; Frau stayed at Lyon at the deadline, LEQ
 * 20050824_201250).
 *
 * WHO IS IN SCOPE. Every man of the three new leagues, every shipped line
 * whose summer 2005 move touches a new league (twelve moved and one removed
 * below), and Round 176's own corrections (Vieira, Figo and Samuel, removed
 * then for leaving the world, arrive now; Essien and Hleb fold). Moves that
 * stay inside the Premier League and La Liga are Round 176's choice and are
 * not reopened here.
 *
 * THE RESERVE ROWS. A reserve side row promoted inside its own club is not
 * a transfer (Fritz, Tremmel, Lamprecht stay out with their spellings); a
 * reserve side row that moved club is one (Rau, Bayern II to Bielefeld;
 * Kuffour, Bayern II to Roma).
 *
 * ONE NAME, TWO NEW LEAGUES. Two names have year 2005 rows at two clubs of
 * the new leagues, each one two real men (FB has both at their clubs). Since
 * Round 901's review fix the step refuses to settle that in silence, so
 * B5_POOL_NAMESAKES names the row that stays, the same rows the value rule
 * kept before: 'Rafael' is two Brazilians born 1980, the Lille centre-back
 * Rafael Schmitz (kept) and the Messina full-back Rafael da Silva; 'Adailton'
 * is the Rennes centre-back born 1983 (kept) and the Nancy full-back born
 * 1979. The engine keys players by name, so Messina and Nancy each lose one
 * real man to the one name, one player rule.
 *
 * UNRESOLVED, THEN RESOLVED. The first pass left twenty-two men of the new
 * leagues where the year 2005 snapshot has them, because they showed signs
 * of having moved by the deadline (a summer listing, no FBref game for the
 * snapshot club, a year 2006 row elsewhere) but no record proving WHEN was
 * found. A review then found most of them elsewhere, so the fix round
 * checked every one, and two the first pass never listed. Three moved on
 * dated records with a year 2006 row at the club (Manuel Belleri and
 * Roberto Baronio to Lazio, Oscar Lopez to Real Betis). Seventeen were
 * removed because the records put them somewhere else at the start of the
 * season: Alessandro Doga, Alessandro Monticciolo, Alexander Manninger,
 * Cristian Bucchi, Fabio Pecchia, Filippo Antonelli Agomeri, Florin Bratu,
 * Goran Rubil, Jean Carlos, Lamberto Zauli, Loris Del Nevo, Manuel Caponi,
 * Mattia Marchesetti, Roberto Colacone, Roberto Cortellini, Toledo and Tore
 * Andre Flo. Two stay because their records keep them where the snapshot
 * has them: Benoit Angbwa (Lille) and Ilyas Zeytullaev (Reggina until his
 * January 2006 loan to Crotone). The two never listed, Mohamed Kallon
 * (Monaco, loaned to Al-Ittihad on 29 Jul 2005) and Valerio Virga (Roma,
 * loaned to Ascoli and injured all season), are removed too. The same check
 * kept Christian Maggio and Gianni Guigou at Fiorentina and Roberto Nanni
 * at Siena: all three went on in January 2006. A sweep of the men FBref
 * splits between two clubs found two more who started the season at the
 * OTHER club and were back at the snapshot club only in January: Olivier Sorlin
 * (Monaco, moved there) and Yacine Abdessadki (Toulouse, removed, no row
 * places him there); the rest of that sweep checked out (Mickael Pagis,
 * Pierre-Alain Frau, David Di Michele, Matteo Guardalben and Stefano Mauri
 * all left their snapshot club in January 2006). Arrivals with no proof of
 * WHEN (forty candidate rows, most of them January signings) are simply not
 * added. Three shipped lines are left as Round 176 made them because their
 * summer move stayed outside the new leagues: David Bellion (Manchester
 * United, loaned to West Ham), Marcio Amoroso (Malaga, gone to Sao Paulo)
 * and Valery Mezague (Portsmouth, back to Montpellier). */

/* BIG_FIVE_CORRECTIONS_START */
/* THE FOLDS: two men Round 176 brought INTO the first two leagues as
 * arrivals from Germany and France. Their year 2005 rows now surface in the
 * new leagues' pulls at the clubs they left; the shipped line stays, the row
 * is dropped, one man, one club. The step proves each fold is one row (same
 * position, age and value on both sides). */
const B5_FOLDS = [
  { n: 'Michael Essien', why: 'Lyon to Chelsea, Round 176 arrival (FB: 31 Premier League games for Chelsea, none for Lyon)' },
  { n: 'Aleksandr Hleb', why: 'Stuttgart to Arsenal, Round 176 arrival (FB: 25 Premier League games for Arsenal, none for Stuttgart)' },
];

/* THE NAMESAKE: one string worn by two real men, one in a new league and
 * one in the shipped world. FBref's 2005-06 rows give the two birth years
 * and the table's own rows agree on age and country: the Real Betis forward
 * Fernando, Spanish, born 1979 (25 in the year 2005 row), and the Siena
 * midfielder Fernando Menegazzo, Brazilian, born 1981 (23). The engine keys
 * players by name, so the standing rule decides: the higher value stays,
 * which is the Betis line (1.5m against 0.8m). Menegazzo spent 2005-06 on
 * loan at Bordeaux, so the rule costs Bordeaux one real man. */
const B5_NAMESAKES = [
  { n: 'Fernando', why: 'the Real Betis forward born 1979 (Spain) and the Siena midfielder Fernando Menegazzo born 1981 (Brazil)' },
];
const B5_POOL_NAMESAKES = [
  { n: 'Rafael', keep: 'Lille', why: 'two Brazilians born 1980: the Lille centre-back Rafael Schmitz (FB: 26 Ligue 1 games for Lille; his year 2006 row is Lille too) and the Messina full-back Rafael da Silva (FB: 17 Serie A games for Messina), dropped by the one name, one player rule' },
  { n: 'Adailton', keep: 'Rennes', why: 'two Brazilian defenders: the Rennes centre-back born 1983 (FB: 19 Ligue 1 games for Rennes; his year 2006 row is Rennes too) and the Nancy full-back born 1979 (FB: 16 Ligue 1 games for Nancy), dropped by the one name, one player rule' },
];
const B5_MOVES = [
  { n: 'Abdelnasser Ouadah', to: 'Metz', why: 'AC Ajaccio to Metz (FB: 28 Ligue 1 games for Metz, none for AC Ajaccio)' },
  { n: 'Abel Xavier', to: 'Middlesbrough', why: 'released by Roma, signed for Middlesbrough by 1 Sep 2005 (LEQ 20050901_001310)' },
  { n: 'Alberto Gilardino', to: 'AC Milan', why: 'Parma to AC Milan (FB: 34 Serie A games for AC Milan, none for Parma)' },
  { n: 'Alessandro Budel', to: 'Cagliari', why: 'Parma to Cagliari (FB: 30 Serie A games for Cagliari, none for Parma)' },
  { n: 'Alessandro Lucarelli', to: 'Reggina', why: 'Livorno to Reggina (FB: 33 Serie A games for Reggina, none for Livorno)' },
  { n: 'Alessandro Potenza', to: 'Mallorca', why: 'Inter loaned him to Mallorca for 2005-06, announced among Cuper\'s summer signings (Ultima Hora, El Mallorca se perfila, 24 Jul 2005)' },
  { n: 'Alessio Tacchinardi', to: 'Villarreal', why: 'Juventus to Villarreal (FB: 23 La Liga games for Villarreal, none for Juventus)' },
  { n: 'Andrea Capone', to: 'Cagliari', why: 'Treviso to Cagliari (FB: 28 Serie A games for Cagliari, none for Treviso)' },
  { n: 'Andrea Giallombardo', to: 'Lazio', why: 'Livorno loaned him to Lazio for the season, 1 Jul 2005 (soccerway transfers, Andrea Giallombardo)' },
  { n: 'Andy van der Meyde', to: 'Everton', why: 'Inter to Everton, 31 Aug 2005 (LEQ 20050831_181652)' },
  { n: 'Antonio Filippini', to: 'Treviso', why: 'Lazio to Treviso (FB: 31 Serie A games for Treviso, none for Lazio)' },
  { n: 'Barreto', to: 'Udinese', why: 'Treviso to Udinese (FB: 27 Serie A games for Udinese, none for Treviso)' },
  { n: 'Benjamin Lense', to: 'Nürnberg', why: 'Arminia Bielefeld to Nürnberg (KI 25 May 2005)' },
  { n: 'Benoît Pedretti', to: 'Lyon', why: 'Marseille to Lyon, signed 17 Jun 2005 (LEQ 20050617_174929)' },
  { n: 'Bernardo Corradi', to: 'Parma', why: 'Valencia to Parma (FB: 36 Serie A games for Parma, none for Valencia)' },
  { n: 'Bernd Korzynietz', to: 'Arminia Bielefeld', why: 'Gladbach to Arminia Bielefeld (KI 25 May 2005; FB: 34 Bundesliga games for Arminia Bielefeld, none for Gladbach)' },
  { n: 'Bill Tchato', to: 'Nice', why: 'Kaiserslautern to Nice (KI 25 May 2005; FB: 24 Ligue 1 games for Nice, none for Kaiserslautern)' },
  { n: 'Bonaventure Kalou', to: 'PSG', why: 'Auxerre to PSG (FB: 28 Ligue 1 games for PSG, none for Auxerre)' },
  { n: 'Branko Boskovic', to: 'Troyes', why: 'PSG loaned him to Troyes, set for his first game on 6 Aug 2005 (LEQ 20050805_122748)' },
  { n: 'Bruno Cheyrou', to: 'Bordeaux', why: 'Marseille to Bordeaux (FB: 26 Ligue 1 games for Bordeaux, none for Marseille)' },
  { n: 'Bryan Bergougnoux', to: 'Toulouse', why: 'Lyon to Toulouse (FB: 33 Ligue 1 games for Toulouse, none for Lyon)' },
  { n: 'Camel Meriem', to: 'Monaco', why: 'Bordeaux to Monaco (FB: 30 Ligue 1 games for Monaco, none for Bordeaux)' },
  { n: 'Cesare Bovo', to: 'Roma', why: 'Parma to Roma (FB: 22 Serie A games for Roma, none for Parma)' },
  { n: 'Christian Abbiati', to: 'Juventus', why: 'AC Milan loaned him to Juventus for the season, August 2005 (REP abbiatijuve)' },
  { n: 'Christian Bassila', to: 'Sunderland', why: 'Strasbourg to Sunderland, signed 22 Aug 2005 after one early game (LEQ 20050822_143656)' },
  { n: 'Christian Obodo', to: 'Udinese', why: 'Fiorentina to Udinese (FB: 28 Serie A games for Udinese, none for Fiorentina)' },
  { n: 'Christophe Landrin', to: 'PSG', why: 'Lille to PSG (FB: 26 Ligue 1 games for PSG, none for Lille)' },
  { n: 'Cristian Brocchi', to: 'Fiorentina', why: 'AC Milan to Fiorentina (FB: 35 Serie A games for Fiorentina, none for AC Milan)' },
  { n: 'Cristiano Doni', to: 'Mallorca', why: 'Sampdoria to Mallorca (FB: 25 La Liga games for Mallorca, none for Sampdoria)' },
  { n: 'Cyril Rool', to: 'Nice', why: 'Bordeaux to Nice (FB: 29 Ligue 1 games for Nice, none for Bordeaux)' },
  { n: 'Daniel Bierofka', to: 'Stuttgart', why: 'Bayer Leverkusen to Stuttgart (KI 25 May 2005)' },
  { n: 'Danijel Ljuboja', to: 'Stuttgart', why: 'PSG to Stuttgart (KI 26 Aug 2005; FB: 26 Bundesliga games for Stuttgart, none for PSG)' },
  { n: 'Daouda Jabi', to: 'AC Ajaccio', why: 'Lens to AC Ajaccio (FB: 31 Ligue 1 games for AC Ajaccio, none for Lens)' },
  { n: 'David Pizarro', to: 'Inter Milan', why: 'Udinese to Inter Milan (FB: 24 Serie A games for Inter Milan, none for Udinese)' },
  { n: 'Davide Chiumiento', to: 'Le Mans', why: 'Juventus loaned him from Siena on to Le Mans for the season, 22 Jul 2005 (LEQ 20050722_171925)' },
  { n: 'Delron Buckley', to: 'Borussia Dortmund', why: 'Arminia Bielefeld to Borussia Dortmund (KI 25 May 2005; FB: 28 Bundesliga games for Borussia Dortmund, none for Arminia Bielefeld)' },
  { n: 'Denilson', to: 'Bordeaux', why: 'Real Betis to Bordeaux (FB: 31 Ligue 1 games for Bordeaux, none for Real Betis)' },
  { n: 'Diego Placente', to: 'Celta Vigo', why: 'Bayer Leverkusen to Celta Vigo (KI 20 Jul 2005; FB: 25 La Liga games for Celta Vigo, none for Bayer Leverkusen)' },
  { n: 'Dimitrios Grammozis', to: 'Köln', why: 'Kaiserslautern to Köln (KI 25 May 2005; FB: 19 Bundesliga games for Köln, none for Kaiserslautern)' },
  { n: 'Édgar Álvarez', to: 'Roma', why: 'his Cagliari loan ended on 30 Jun 2005 and Penarol loaned him to Roma from 1 Jul 2005 (soccerway transfers, Edgar Alvarez)' },
  { n: 'Edgar Davids', to: 'Tottenham', why: 'Inter Milan to Tottenham (FB: 31 Premier League games for Tottenham, none for Inter Milan)' },
  { n: 'Eduardo Costa', to: 'Espanyol', why: 'Marseille to Espanyol (FB: 30 La Liga games for Espanyol, none for Marseille)' },
  { n: 'Emanuele Filippini', to: 'Treviso', why: 'Lazio to Treviso (FB: 30 Serie A games for Treviso, none for Lazio)' },
  { n: 'Emiliano Bonazzoli', to: 'Sampdoria', why: 'Reggina to Sampdoria, scoring twice for Sampdoria at Treviso on 21 Sep 2005 (REP trevisosampdoria)' },
  { n: 'Emre Belözoğlu', to: 'Newcastle', why: 'Inter to Newcastle, 14 Jul 2005 (LEQ 20050714_225619)' },
  { n: 'Enzo Maresca', to: 'Sevilla', why: 'Fiorentina to Sevilla (FB: 29 La Liga games for Sevilla, none for Fiorentina)' },
  { n: 'Éric Cubilier', to: 'Monaco', why: 'back at Monaco from his Lens loan, 15 Jun 2005 (LEQ 20050615_150051)' },
  { n: 'Erik Edman', to: 'Rennes', why: 'Tottenham to Rennes, signed 31 Aug 2005 (LEQ 20050831_112317)' },
  { n: 'Ervin Skela', to: 'Kaiserslautern', why: 'Arminia Bielefeld to Kaiserslautern (KI 25 May 2005; FB: 34 Bundesliga games for Kaiserslautern, none for Arminia Bielefeld)' },
  { n: 'Ewerthon', to: 'Zaragoza', why: 'Borussia Dortmund to Zaragoza (KI 8 Jul 2005; FB: 37 La Liga games for Zaragoza, none for Borussia Dortmund)' },
  { n: 'Fabian Ernst', to: 'Schalke 04', why: 'Werder Bremen to Schalke 04 (KI 25 May 2005; FB: 32 Bundesliga games for Schalke 04, none for Werder Bremen)' },
  { n: 'Fabio Bazzani', to: 'Sampdoria', why: 'back at Sampdoria from his Lazio loan, injured in a Sampdoria friendly, 1 Aug 2005 (UEFA.com newsid 322512)' },
  { n: 'Francesco Coco', to: 'Livorno', why: 'Inter Milan to Livorno (FB: 28 Serie A games for Livorno, none for Inter Milan)' },
  { n: 'Francesco Cozza', to: 'Reggina', why: 'Siena to Reggina (FB: 33 Serie A games for Reggina, none for Siena)' },
  { n: 'Francesco Modesto', to: 'Reggina', why: 'Ascoli to Reggina (FB: 37 Serie A games for Reggina, none for Ascoli)' },
  { n: 'Franck Ribéry', to: 'Marseille', why: 'Metz to Marseille (FB: 35 Ligue 1 games for Marseille, none for Metz)' },
  { n: 'Franck Signorino', to: 'Nantes', why: 'Metz to Nantes (FB: 33 Ligue 1 games for Nantes, none for Metz)' },
  { n: 'Gaetano D\'Agostino', to: 'Messina', why: 'Roma to Messina (FB: 27 Serie A games for Messina, none for Roma)' },
  { n: 'Gerard López', to: 'Monaco', why: 'Barcelona to Monaco, among Monaco\'s official signings by 1 Jun 2005 (LEQ 20050601_084436)' },
  { n: 'Giorgio Chiellini', to: 'Juventus', why: 'Fiorentina to Juventus, 29 Jun 2005 (REP calciomerc, 30 Jun 2005)' },
  { n: 'Giovanni Pasquale', to: 'Parma', why: 'Siena to Parma (FB: 22 Serie A games for Parma, none for Siena)' },
  { n: 'Giuliano Giannichedda', to: 'Juventus', why: 'Lazio to Juventus, named among Juventus\'s summer arrivals on 19 Jul 2005 (LEQ 20050719_113126)' },
  { n: 'Giuseppe Colucci', to: 'Livorno', why: 'Reggina to Livorno (FB: 24 Serie A games for Livorno, none for Reggina)' },
  { n: 'Giuseppe Pancaro', to: 'Fiorentina', why: 'released by AC Milan, agreed a two year contract with Fiorentina, 13 Jul 2005 (UEFA.com, Pancaro plumps for Fiorentina)' },
  { n: 'Guy Demel', to: 'Hamburg', why: 'Borussia Dortmund to Hamburg (KI 27 Jun 2005; FB: 22 Bundesliga games for Hamburg, none for Borussia Dortmund)' },
  { n: 'Habib Bamogo', to: 'Nantes', why: 'Marseille to Nantes (FB: 31 Ligue 1 games for Nantes, none for Marseille)' },
  { n: 'Hanno Balitsch', to: 'Hannover 96', why: 'Mainz to Hannover 96 (KI 25 May 2005; FB: 31 Bundesliga games for Hannover 96, none for Mainz)' },
  { n: 'Hassan El Fakiri', to: 'Gladbach', why: 'Monaco to Gladbach (KI 2 Aug 2005; FB: 31 Bundesliga games for Gladbach, none for Monaco)' },
  { n: 'Hernán Crespo', to: 'Chelsea', why: 'AC Milan to Chelsea (FB: 30 Premier League games for Chelsea, none for AC Milan)' },
  { n: 'Hidetoshi Nakata', to: 'Bolton Wanderers', why: 'Fiorentina loaned him to Bolton for the season, 16 Aug 2005 (LEQ 20050816_145939)' },
  { n: 'Imre Szabics', to: 'Köln', why: 'Stuttgart to Köln (KI 8 Jun 2005, Fans wünschen sich Hochkaräter)' },
  { n: 'Ioannis Amanatidis', to: 'Eintracht Frankfurt', why: 'Kaiserslautern to Eintracht Frankfurt (KI 25 Jul 2005; FB: 32 Bundesliga games for Eintracht Frankfurt, none for Kaiserslautern)' },
  { n: 'Jaime Valdés', to: 'Lecce', why: 'Fiorentina to Lecce (FB: 26 Serie A games for Lecce, none for Fiorentina)' },
  { n: 'Javier Saviola', to: 'Sevilla', why: 'Monaco to Sevilla (FB: 29 La Liga games for Sevilla, none for Monaco)' },
  { n: 'Jérémy Mathieu', to: 'Toulouse', why: 'Sochaux to Toulouse (FB: 35 Ligue 1 games for Toulouse, none for Sochaux)' },
  { n: 'Jesper Grønkjær', to: 'Stuttgart', why: 'Atlético Madrid to Stuttgart (FB: 25 Bundesliga games for Stuttgart, none for Atlético Madrid)' },
  { n: 'John Utaka', to: 'Rennes', why: 'Lens to Rennes (FB: 28 Ligue 1 games for Rennes, none for Lens)' },
  { n: 'Jon Dahl Tomasson', to: 'Stuttgart', why: 'AC Milan to Stuttgart (KI 16 Jul 2005; FB: 26 Bundesliga games for Stuttgart, none for AC Milan)' },
  { n: 'José Luís Vidigal', to: 'Udinese', why: 'Livorno to Udinese (FB: 23 Serie A games for Udinese, none for Livorno)' },
  { n: 'Julian de Guzmán', to: 'Deportivo La Coruña', why: 'Hannover 96 to Deportivo La Coruña (KI 25 May 2005; FB: 22 La Liga games for Deportivo La Coruña, none for Hannover 96)' },
  { n: 'Jurica Vranjes', to: 'Werder Bremen', why: 'Stuttgart to Werder Bremen (KI 25 May 2005; FB: 29 Bundesliga games for Werder Bremen, none for Stuttgart)' },
  { n: 'Kevin Kuranyi', to: 'Schalke 04', why: 'Stuttgart to Schalke 04 (KI 11 Jun 2005; FB: 30 Bundesliga games for Schalke 04, none for Stuttgart)' },
  { n: 'Laurent Batlles', to: 'Toulouse', why: 'Marseille to Toulouse, signed 24 Aug 2005 after four early games (LEQ 20050824_213423)' },
  { n: 'Lorik Cana', to: 'Marseille', why: 'PSG to Marseille (FB: 30 Ligue 1 games for Marseille, none for PSG)' },
  { n: 'Luca Toni', to: 'Fiorentina', why: 'Palermo to Fiorentina (FB: 38 Serie A games for Fiorentina, none for Palermo)' },
  { n: 'Luca Vigiani', to: 'Reggina', why: 'Livorno to Reggina (FB: 36 Serie A games for Reggina, none for Livorno)' },
  { n: 'Ludovic Magnin', to: 'Stuttgart', why: 'Werder Bremen to Stuttgart (KI 25 May 2005; FB: 25 Bundesliga games for Stuttgart, none for Werder Bremen)' },
  { n: 'Mamadou Bagayoko', to: 'Nice', why: 'Nantes to Nice (FB: 32 Ligue 1 games for Nice, none for Nantes)' },
  { n: 'Mamadou Niang', to: 'Marseille', why: 'Strasbourg to Marseille (FB: 28 Ligue 1 games for Marseille, none for Strasbourg)' },
  { n: 'Manuel Belleri', to: 'Lazio', why: 'Udinese to Lazio in co-ownership, among Lazio\'s summer 2005 arrivals (en.wikipedia, 2005-06 SS Lazio season; it.wikipedia, Manuel Belleri; FB: 16 Serie A games for Lazio, none for Udinese)' },
  { n: 'Marco Donadel', to: 'Fiorentina', why: 'Sampdoria to Fiorentina (FB: 34 Serie A games for Fiorentina, none for Sampdoria)' },
  { n: 'Marek Jankulovski', to: 'AC Milan', why: 'Udinese to AC Milan (FB: 22 Serie A games for AC Milan, none for Udinese)' },
  { n: 'Martin Petrov', to: 'Atlético Madrid', why: 'Wolfsburg to Atlético Madrid (KI 25 Jul 2005; FB: 36 La Liga games for Atlético Madrid, none for Wolfsburg)' },
  { n: 'Massimo Maccarone', to: 'Middlesbrough', why: 'back at Middlesbrough when his Siena loan ended on 31 May 2005 (11v11.com club history, Massimo Maccarone)' },
  { n: 'Mathieu Berson', to: 'Auxerre', why: 'Aston Villa to Auxerre (FB: 27 Ligue 1 games for Auxerre, none for Aston Villa)' },
  { n: 'Matías Lequi', to: 'Celta Vigo', why: 'Lazio to Celta Vigo (FB: 29 La Liga games for Celta Vigo, none for Lazio)' },
  { n: 'Matteo Ferrari', to: 'Everton', why: 'Roma loaned him to Everton on 26 Aug 2005 (11v11.com club history, Matteo Ferrari)' },
  { n: 'Michael Delura', to: 'Hannover 96', why: 'Schalke 04 to Hannover 96 (KI 25 May 2005; FB: 25 Bundesliga games for Hannover 96, none for Schalke 04)' },
  { n: 'Michele Pazienza', to: 'Fiorentina', why: 'Udinese to Fiorentina (FB: 23 Serie A games for Fiorentina, none for Udinese)' },
  { n: 'Mike Hanke', to: 'Wolfsburg', why: 'Schalke 04 to Wolfsburg (KI 3 Jun 2005; FB: 31 Bundesliga games for Wolfsburg, none for Schalke 04)' },
  { n: 'Mohamed Zidan', to: 'Mainz', why: 'Werder Bremen to Mainz (KI 31 Aug 2005; FB: 26 Bundesliga games for Mainz, none for Werder Bremen)' },
  { n: 'Niclas Jensen', to: 'Fulham', why: 'Borussia Dortmund to Fulham (KI 17 Jul 2005, Dänischer Nationalspieler wechselt in die Premier League)' },
  { n: 'Nicola Amoruso', to: 'Reggina', why: 'Messina to Reggina (FB: 29 Serie A games for Reggina, none for Messina)' },
  { n: 'Niels Oude Kamphuis', to: 'Gladbach', why: 'Schalke 04 to Gladbach (KI 30 May 2005, Suche nach einem Verteidiger geht weiter)' },
  { n: 'Olivier Kapo', to: 'Monaco', why: 'Juventus to Monaco (FB: 25 Ligue 1 games for Monaco, none for Juventus)' },
  { n: 'Olivier Sorlin', to: 'Monaco', why: 'Rennes to Monaco for 2005-06, the first half at Monaco and back at Rennes in the January 2006 window (en.wikipedia, Olivier Sorlin: Monaco 2005-2006; fr.wikipedia, Olivier Sorlin; FB: 20 Ligue 1 games for Monaco, 13 for Rennes)' },
  { n: 'Óscar López', to: 'Real Betis', why: 'his Lazio loan from Barcelona was 2004-05 only, and Barcelona loaned him to Real Betis on 3 Aug 2005 (en.wikipedia, Oscar Lopez (footballer, born 1980); FB: 18 La Liga games for Real Betis, none for Lazio)' },
  { n: 'Otto Addo', to: 'Mainz', why: 'Borussia Dortmund to Mainz (KI 25 May 2005, Stürmer kommt aus Dortmund)' },
  { n: 'Patrick Owomoyela', to: 'Werder Bremen', why: 'Arminia Bielefeld to Werder Bremen (KI 25 May 2005; FB: 32 Bundesliga games for Werder Bremen, none for Arminia Bielefeld)' },
  { n: 'Patrick Weiser', to: 'Köln', why: 'Wolfsburg to Köln (KI 29 Aug 2005, Zehnter Neuzugang steht fest)' },
  { n: 'Paul Stalteri', to: 'Tottenham', why: 'Werder Bremen to Tottenham (KI 25 May 2005; FB: 33 Premier League games for Tottenham, none for Werder Bremen)' },
  { n: 'Péguy Luyindula', to: 'Auxerre', why: 'Marseille loaned him to Auxerre, 12 Aug 2005 (LEQ 20050812_212950)' },
  { n: 'Pekka Lagerblom', to: 'Werder Bremen', why: 'Nürnberg to Werder Bremen (KI 25 May 2005)' },
  { n: 'Philipp Lahm', to: 'Bayern Munich', why: 'Stuttgart to Bayern Munich (KI 25 May 2005; FB: 20 Bundesliga games for Bayern Munich, none for Stuttgart)' },
  { n: 'Philippe Brunel', to: 'Sochaux', why: 'Lille to Sochaux, signed 27 Jun 2005 (LEQ 20050628_102334)' },
  { n: 'Pontus Farnerud', to: 'Strasbourg', why: 'Monaco to Strasbourg (FB: 32 Ligue 1 games for Strasbourg, none for Monaco)' },
  { n: 'Rémy Vercoutre', to: 'Lyon', why: 'back at Lyon from his Strasbourg loan as second keeper, confirmed 17 Jun 2005 (LEQ 20050617_211647)' },
  { n: 'Robert Kovac', to: 'Juventus', why: 'Bayern Munich to Juventus (KI 25 May 2005)' },
  { n: 'Roberto Baronio', to: 'Lazio', why: 'his Chievo loan ended on 30 Jun 2005 and he was a Lazio player until Lazio loaned him to Udinese in January 2006 (en.wikipedia, 2005-06 SS Lazio season; it.wikipedia, Roberto Baronio, 7 Lazio games before the loan; FB files all 17 of his games under Udinese and none under Chievo)' },
  { n: 'Rodrigo Taddei', to: 'Roma', why: 'Siena to Roma (FB: 38 Serie A games for Roma, none for Siena)' },
  { n: 'Rolando Bianchi', to: 'Reggina', why: 'Cagliari to Reggina, 1 Jul 2005 (soccerway transfers, Rolando Bianchi)' },
  { n: 'Samuele Dalla Bona', to: 'Sampdoria', why: 'Lecce to Sampdoria (FB: 29 Serie A games for Sampdoria, none for Lecce)' },
  { n: 'Santiago Solari', to: 'Inter Milan', why: 'Real Madrid to Inter, official on 9 Jul 2005 (REP calciomercato3, 10 Jul 2005)' },
  { n: 'Santos', to: 'Toulouse', why: 'Sochaux to Toulouse (FB: 25 Ligue 1 games for Toulouse, none for Sochaux)' },
  { n: 'Sasa Bjelanovic', to: 'Ascoli', why: 'Lecce to Ascoli (FB: 31 Serie A games for Ascoli, none for Lecce)' },
  { n: 'Sébastien Frey', to: 'Fiorentina', why: 'Parma to Fiorentina, 25 Jun 2005 (REP violamano, 26 Jun 2005)' },
  { n: 'Sezer Öztürk', to: 'Nürnberg', why: 'Bayer Leverkusen to Nürnberg (KI 11 Jul 2005)' },
  { n: 'Shabani Nonda', to: 'Roma', why: 'Monaco to Roma, signed 10 Jun 2005 (LEQ 20050611_091532)' },
  { n: 'Souleymane Camara', to: 'Nice', why: 'Monaco to Nice, signed 29 Aug 2005 (LEQ 20050829_191959)' },
  { n: 'Stefano Fiore', to: 'Fiorentina', why: 'Valencia to Fiorentina (FB: 38 Serie A games for Fiorentina, none for Valencia)' },
  { n: 'Stefano Morrone', to: 'Livorno', why: 'Palermo to Livorno (FB: 35 Serie A games for Livorno, none for Palermo)' },
  { n: 'Stéphane Dalmat', to: 'Racing Santander', why: 'Inter (on loan at Toulouse) to Racing Santander, signed 18 Jul 2005 (LEQ 20050718_094712)' },
  { n: 'Sylvain Monsoreau', to: 'Lyon', why: 'Sochaux to Lyon, signed 21 Jun 2005 (LEQ 20050621_174112)' },
  { n: 'Teemu Tainio', to: 'Tottenham', why: 'Auxerre to Tottenham (FB: 24 Premier League games for Tottenham, none for Auxerre)' },
  { n: 'Thimothée Atouba', to: 'Hamburg', why: 'Tottenham to Hamburg (KI 12 Jul 2005; FB: 31 Bundesliga games for Hamburg, none for Tottenham)' },
  { n: 'Thomas Brdaric', to: 'Hannover 96', why: 'Wolfsburg to Hannover 96 (KI 3 Jun 2005; FB: 31 Bundesliga games for Hannover 96, none for Wolfsburg)' },
  { n: 'Thomas Hitzlsperger', to: 'Stuttgart', why: 'Aston Villa to Stuttgart (KI 25 May 2005; FB: 26 Bundesliga games for Stuttgart, none for Aston Villa)' },
  { n: 'Tiago Mendes', to: 'Lyon', why: 'Chelsea to Lyon (FB: 29 Ligue 1 games for Lyon, none for Chelsea)' },
  { n: 'Toifilou Maoulida', to: 'Monaco', why: 'Rennes to Monaco, signed by 1 Jun 2005 (LEQ 20050601_084436)' },
  { n: 'Torsten Frings', to: 'Werder Bremen', why: 'Bayern Munich to Werder Bremen (KI 10 Jun 2005; FB: 28 Bundesliga games for Werder Bremen, none for Bayern Munich)' },
  { n: 'Tranquillo Barnetta', to: 'Bayer Leverkusen', why: 'Hannover 96 to Bayer Leverkusen (KI 25 May 2005; FB: 31 Bundesliga games for Bayer Leverkusen, none for Hannover 96)' },
  { n: 'Vahid Hashemian', to: 'Hannover 96', why: 'Bayern Munich to Hannover 96 (KI 25 May 2005; FB: 29 Bundesliga games for Hannover 96, none for Bayern Munich)' },
  { n: 'Valeri Bozhinov', to: 'Fiorentina', why: 'Lecce to Fiorentina (FB: 27 Serie A games for Fiorentina, none for Lecce)' },
  { n: 'Valérien Ismaël', to: 'Bayern Munich', why: 'Werder Bremen to Bayern Munich (KI 10 Jun 2005; FB: 30 Bundesliga games for Bayern Munich, none for Werder Bremen)' },
  { n: 'Veljko Paunovic', to: 'Getafe', why: 'Hannover 96 to Getafe (KI 25 May 2005; FB: 30 La Liga games for Getafe, none for Hannover 96)' },
  { n: 'Vikash Dhorasoo', to: 'PSG', why: 'AC Milan to PSG (FB: 34 Ligue 1 games for PSG, none for AC Milan)' },
  { n: 'Vincent Candela', to: 'Udinese', why: 'Roma to Udinese (FB: 26 Serie A games for Udinese, none for Roma)' },
  { n: 'Vladimir Smicer', to: 'Bordeaux', why: 'Liverpool to Bordeaux (FB: 25 Ligue 1 games for Bordeaux, none for Liverpool)' },
  { n: 'Wilson Oruma', to: 'Marseille', why: 'Sochaux to Marseille (FB: 30 Ligue 1 games for Marseille, none for Sochaux)' },
  { n: 'Yohan Démont', to: 'Lens', why: 'AC Ajaccio to Lens (FB: 34 Ligue 1 games for Lens, none for AC Ajaccio)' },
];
const B5_REMOVALS = [
  { n: 'Aílton', why: 'Schalke to Besiktas for 3m, 21 Jul 2005 (KI 21 Jul 2005, Drei Millionen Abloese fuer Ailton); his year 2006 row is Hamburg, where he went in January 2006 (FBref: 13 games for Hamburg)', later: true },
  { n: 'Albert Riera', why: 'Bordeaux to Espanyol, signed 8 Jul 2005 (LEQ 20050708_230409); his year 2006 row is Manchester City, where he went on loan in January 2006 (FBref: 8 games for Espanyol, 15 for City)', later: true },
  { n: 'Alessandro Doga', why: 'Livorno to Mantova, a three year contract signed on 15 Jul 2005 (it.wikipedia, Alessandro Doga); his year 2006 row is Mantova' },
  { n: 'Alessandro Monticciolo', why: 'Ascoli to Lucchese in the summer of 2005, 11 Serie C1 games there that season (it.wikipedia, Alessandro Monticciolo); no league game for Ascoli (FB) and no year 2006 row', single: true },
  { n: 'Alessandro Rosina', why: 'Parma to Torino, 1 Jul 2005 (soccerway transfers, Alessandro Rosina)' },
  { n: 'Alexander Manninger', why: 'his Siena loan was 2004-05 only; Red Bull Salzburg re-signed him from Bologna in July 2005, 16 games there in 2005-06 (en.wikipedia, Alexander Manninger); his year 2006 row is Red Bull Salzburg' },
  { n: 'Alexander Voigt', why: 'left Köln in the summer of 2005 (KI 13 Jun 2005, Voigt-Wechsel nach Kerkrade perfekt)' },
  { n: 'Almami Moreira', why: 'left Hamburg in the summer of 2005 (KI 25 May 2005)' },
  { n: 'Anthony Braizat', why: 'Toulouse to Cannes, listed among Toulouse\'s departures on 22 Jun 2005 (LEQ 20050622_183836)' },
  { n: 'Anthony Seric', why: 'Lazio to Panathinaikos, 1 Jul 2005 (soccerway transfers, Anthony Seric)' },
  { n: 'Arnaud Le Lan', why: 'Rennes to Guingamp, 1 Jul 2005 (soccerway transfers, Arnaud Le Lan)' },
  { n: 'Benjamin Nicaise', why: 'Metz to Amiens on a free, 1 Jul 2005 (soccerway transfers, Benjamin Nicaise)' },
  { n: 'Björn Schlicke', why: 'Hamburg to Koln, 17 Jun 2005 (KI 17 Jun 2005, Schlicke wechselt zum FC); no year 2006 row, so the table cannot place him at Koln', single: true },
  { n: 'Brahim Hemdani', why: 'Marseille to Rangers, one of Rangers\' summer signings by 6 Jul 2005 (LEQ 20050706_082357)' },
  { n: 'Bruno Cirillo', why: 'to AEK Athens on a free, 1 Jul 2005 (soccerway transfers, Bruno Cirillo)' },
  { n: 'Carlo Zotti', why: 'Roma loaned him to Ascoli for the season, 1 Jul 2005 (soccerway transfers, Carlo Zotti); no year 2006 row to place him at Ascoli', single: true },
  { n: 'Carlos Gamarra', why: 'Inter to Palmeiras, 1 Jul 2005 (soccerway transfers, Carlos Gamarra)' },
  { n: 'Charles-Edouard Coridon', why: 'left PSG, out of contract and without a club on 28 Aug 2005 (LEQ 20050828_212740)' },
  { n: 'Christian Riganò', why: 'Fiorentina to Empoli for the season (FBref 2005-06: 33 Serie A games for Empoli, none for Fiorentina); no year 2006 row to place him', single: true },
  { n: 'Christian Vieri', why: 'Inter to AC Milan, 6 Jul 2005 (REP vierimilan, 7 Jul 2005); his year 2006 row is Monaco, where he went in January 2006 (FBref: 8 games for Milan, 7 for Monaco)', later: true },
  { n: 'Christophe Avezac', why: 'Metz to Dijon, one of Dijon\'s signings by 22 Jun 2005 (LEQ 20050622_150838)' },
  { n: 'Cristian Bucchi', why: 'Ascoli sold their half of him to Modena in the summer of 2005, 41 Serie B games for Modena in 2005-06 (en.wikipedia, Cristian Bucchi); his year 2006 row is Modena' },
  { n: 'Cristian Raimondi', why: 'Palermo to Arezzo, 1 Jul 2005 (soccerway transfers, Cristian Raimondi)' },
  { n: 'Cristiano Lupatelli', why: 'Fiorentina to Parma for the autumn (FBref 2005-06: 8 games for Parma, then 5 for Palermo, none for Fiorentina); his year 2006 row is Palermo, reached in January 2006', later: true },
  { n: 'Daniele Corvia', why: 'Roma loaned him to Ternana for the season, 1 Jul 2005 (soccerway transfers, Daniele Corvia)' },
  { n: 'Daniele Di Donato', why: 'Siena to Arezzo, 1 Jul 2005 (soccerway transfers, Daniele Di Donato)' },
  { n: 'David Suarez', why: 'Toulouse to Guingamp, listed among Toulouse\'s departures on 22 Jun 2005 (LEQ 20050622_183836)' },
  { n: 'Dimitrios Eleftheropoulos', why: 'Messina to Roma on a free, 1 Jul 2005 (soccerway transfers, Dimitrios Eleftheropoulos), but his year 2006 row says retired, so the table cannot place him at Roma' },
  { n: 'Dino Fava', why: 'Udinese to Treviso for the season (FBref 2005-06: 22 Serie A games for Treviso, none for Udinese); no year 2006 row to place him', single: true },
  { n: 'Domenico Giampà', why: 'Messina loaned him to Ascoli for the season (FBref 2005-06: 24 Serie A games for Ascoli, none for Messina); his year 2006 row is Messina, back from that loan', later: true },
  { n: 'Edgaras Jankauskas', why: 'his Nice loan over, Porto released him to FBK Kaunas on 1 Jul 2005 and he joined Hearts in August (soccerway transfers, Edgaras Jankauskas)' },
  { n: 'Élson', why: 'left Stuttgart in the summer of 2005 (KI 31 Aug 2005, Brasilianer soll Spielpraxis sammeln)' },
  { n: 'Evanilson', why: 'left Dortmund on a free in the summer of 2005 (KI 25 May 2005) and is on no Bundesliga club\'s summer arrivals in the same list; his year 2006 row is Koln, a later window (FBref: 3 games for Koln)', later: true },
  { n: 'Fabián Carini', why: 'Inter to Cagliari on a free, 1 Jul 2005 (soccerway transfers, Fabian Carini), but his year 2006 row says retired, so the table cannot place him at Cagliari' },
  { n: 'Fabio Pecchia', why: 'his Siena loan was 2004-05 only; 32 Serie B games for Bologna in 2005-06 (it.wikipedia, Fabio Pecchia); his year 2006 row is Bologna' },
  { n: 'Fabrice Fiorèse', why: 'Marseille loaned him to Al-Rayyan for the season, 29 Jul 2005 (LEQ 20050730_004317)' },
  { n: 'Fabrizio Miccoli', why: 'back at Juventus from his Fiorentina loan, then loaned to Benfica for the season on 31 Aug 2005 (LEQ 20050831_160323)' },
  { n: 'Fausto Rossini', why: 'joined Udinese from Atalanta by 29 Jun 2005 (UEFA.com newsid 312951), so not at Sampdoria; no year 2006 row to place him at Udinese', single: true },
  { n: 'Filipe Teixeira', why: 'PSG to Academica Coimbra, signed by 4 Aug 2005 (LEQ 20050803_211432)' },
  { n: 'Filippo Antonelli Agomeri', why: 'Ascoli to Chievo in the summer of 2005, one Serie A game for Chievo on 30 Oct 2005, then on loan to Messina in January 2006 (it.wikipedia, Filippo Antonelli); his year 2006 row is Messina, reached in that later window, and no row places him at Chievo', later: true },
  { n: 'Florin Bratu', why: 'Nantes loaned him to Dinamo Bucharest for 2005-06, 23 games there (en.wikipedia, Florin Bratu); no league game for Nantes (FB) and no year 2006 row', single: true },
  { n: 'França', why: 'left Bayer Leverkusen in the summer of 2005 (KI 3 Aug 2005)' },
  { n: 'Frank Wiblishauser', why: 'left Nürnberg in the summer of 2005 (KI 30 Aug 2005, Abwehrspieler wechselt nach St. Gallen)' },
  { n: 'Gennaro Iezzo', why: 'Cagliari to Napoli, 1 Jul 2005 (soccerway transfers, Gennaro Iezzo)' },
  { n: 'Georgios Karagounis', why: 'Inter to Benfica, signed 30 Aug 2005 (LEQ 20050830_152401)' },
  { n: 'Gianfranco Zola', why: 'retired from Cagliari, 30 Jun 2005 (REP zolaritiro, 1 Jul 2005)' },
  { n: 'Giovanni Federico', why: 'left Köln in the summer of 2005 (KI 25 May 2005, Vertrag bis 2007)' },
  { n: 'Giuseppe Reina', why: 'left Hertha BSC in the summer of 2005 (KI 30 May 2005)' },
  { n: 'Goran Rubil', why: 'stayed at Nantes to the end of 2004-05 and signed for Shonan Bellmare in mid 2005 (en.wikipedia, Goran Rubil); his year 2006 row is HNK Rijeka' },
  { n: 'Grégory Paisley', why: 'Sochaux to Metz, signed 7 Jun 2005 (LEQ 20050607_162950); his year 2006 row is Troyes, where he went in January 2006 (FBref: 8 games for Metz, 13 for Troyes)', later: true },
  { n: 'Gustavo Nery', why: 'left Werder Bremen in the summer of 2005 (KI 25 May 2005)' },
  { n: 'Holger Wehlage', why: 'left Duisburg in the summer of 2005 (KI 25 May 2005, Mittelfeldspieler ist ablösefrei)' },
  { n: 'Ibrahim Tall', why: 'Sochaux to Hearts on a free, 1 Jul 2005 (soccerway transfers, Ibrahim Tall); no year 2006 row', single: true },
  { n: 'Igor Demo', why: 'left Gladbach in the summer of 2005 (KI 26 Jun 2005)' },
  { n: 'Ivan Gvozdenovic', why: 'his Metz loan ended on 30 Jun 2005 and he went back to Club Brugge (soccerway transfers, Ivan Gvozdenovic)' },
  { n: 'Ivo Ulich', why: 'left Gladbach in the summer of 2005 (KI 11 Aug 2005, Mittelfeldspieler wechselt zu Vissel Kobe)' },
  { n: 'Jacek Bak', why: 'released by Lens to join Al-Rayyan, 2 Aug 2005 (LEQ 20050802_233832)' },
  { n: 'Javier Portillo', why: 'Real Madrid, back from his Fiorentina loan, loaned him to Club Brugge on 31 Aug 2005 (LEQ 20050831_203734)' },
  { n: 'Jean Carlos', why: 'his Hamburg loan from Feyenoord was 2004-05 only (en.wikipedia, Jean Carlos (footballer, born 1983)); no league game for Hamburg in 2005-06 (FB); his year 2006 row is Fluminense' },
  { n: 'Jean-Philippe Caillet', why: 'Metz to Litex Lovech, 19 Jul 2005 (LEQ 20050719_170746)' },
  { n: 'Jérémy Gavanon', why: 'Marseille to Clermont, gone by 21 Jul 2005 (LEQ 20050721_105008)' },
  { n: 'Johan Audel', why: 'Lille loaned him to Lorient for the season, 26 Jul 2005 (soccerway transfers, Johan Audel)' },
  { n: 'Joris Van Hout', why: 'left Gladbach in the summer of 2005 (KI 9 Jun 2005, Belgier unterschreibt für drei Jahre); no year 2006 row', single: true },
  { n: 'José-Karl Pierre-Fanfan', why: 'PSG to Rangers, 6 Jul 2005 (LEQ 20050706_082357)' },
  { n: 'Julien Rodriguez', why: 'Monaco to Rangers, official on 4 Aug 2005 (LEQ 20050804_161642)' },
  { n: 'Julio Cáceres', why: 'Nantes to Atletico Mineiro, signed by 16 Jul 2005 (LEQ 20050716_230512)' },
  { n: 'Jürgen Gjasula', why: 'left Kaiserslautern in the summer of 2005 (KI 19 Jul 2005, Jurgen Gjasula nach St. Gallen - Rückkehr von Marco Reich ist kein Thema); no year 2006 row', single: true },
  { n: 'Jürgen Kramny', why: 'left Mainz in the summer of 2005 (KI 16 Jun 2005); no year 2006 row', single: true },
  { n: 'Kamil Kosowski', why: 'left Kaiserslautern in the summer of 2005 (KI 31 Aug 2005, Kosowski geht nach England - Nekounam kommt nicht)' },
  { n: 'Krisztián Lisztes', why: 'released by Werder Bremen (KI 25 May 2005), a free agent until Gladbach signed him on 1 Sep 2005, after the window (KI 1 Sep 2005); his year 2006 row is retired' },
  { n: 'Lamberto Zauli', why: 'Palermo to Sampdoria for the start of 2005-06, then Bologna in January 2006 (en.wikipedia, Lamberto Zauli; FB: 8 games for Sampdoria, none for Palermo); his year 2006 row is Bologna, so no row places him at Sampdoria' },
  { n: 'Lawrence Aidoo', why: 'left Nürnberg in the summer of 2005 (KI 4 Jul 2005, Nach dem Aidoo-Transfer); no year 2006 row', single: true },
  { n: 'Leonardo Talamonti', why: 'his one year Lazio loan from Rosario Central ended in 2005 and he went home to Argentina, to River Plate (c5n.com, Jugo en River y en Lazio)' },
  { n: 'Loris Del Nevo', why: 'Cagliari to Triestina in Serie B for 2005-06, then Ternana in January (it.wikipedia, Loris Del Nevo); no league game for Cagliari (FB) and no year 2006 row', single: true },
  { n: 'Luca Ariatti', why: 'Fiorentina to Atalanta, 1 Jul 2005 (soccerway transfers, Luca Ariatti)' },
  { n: 'Ludovic Clément', why: 'Toulouse to Montpellier, listed among Toulouse\'s departures on 22 Jun 2005 (LEQ 20050622_183836)' },
  { n: 'Mamadou Seck', why: 'out of contract at AC Ajaccio and missing from its preseason on 27 Jun 2005 (LEQ 20050627_214654)' },
  { n: 'Manuel Caponi', why: 'not in Empoli\'s 2005-06 squad (it.wikipedia, Empoli Football Club 2005-2006) and no league game for Empoli that season (FB); no year 2006 row', single: true },
  { n: 'Marcel Ketelaer', why: 'left Nürnberg in the summer of 2005 (KI 20 Jun 2005, Paulinho bleibt zumindest bis zum Winter)' },
  { n: 'Marcelo Trapasso', why: 'released by Sochaux, signed for Chateauroux on 31 Aug 2005 (LEQ 20050831_185130); no year 2006 row', single: true },
  { n: 'Marco Borriello', why: 'Reggina to Sampdoria for the autumn (FBref 2005-06: 11 games for Sampdoria, then 20 for Treviso, none for Reggina); his year 2006 row is Treviso, reached in January 2006', later: true },
  { n: 'Mario Lička', why: 'his Livorno loan ended on 30 Jun 2005 and Ostrava let him go to Slovacko on 1 Jul 2005 (soccerway transfers, Mario Licka); no year 2006 row', single: true },
  { n: 'Markus Hausweiler', why: 'Gladbach to Duisburg on a free (KI 25 May 2005); no year 2006 row, so the table cannot place him at Duisburg', single: true },
  { n: 'Martin Djetou', why: 'left Nice, without a club on 25 Aug 2005 (LEQ 20050825_190050); no year 2006 row (FBref: 3 games for Bolton later in the season)', single: true },
  { n: 'Martin Pieckenhagen', why: 'left Hamburg in the summer of 2005 (KI 5 Jul 2005, Keeper wechselt in die Niederlande)' },
  { n: 'Massimiliano Fusani', why: 'Chievo to Modena, 1 Jul 2005 (soccerway transfers, Massimiliano Fusani)' },
  { n: 'Matthias Langkamp', why: 'Arminia Bielefeld to Wolfsburg (KI 25 May 2005); no year 2006 row, so the table cannot place him at Wolfsburg', single: true },
  { n: 'Mattia Marchesetti', why: 'began 2005-06 on loan at Cremonese in Serie B, 18 games, then Sampdoria in January 2006 (it.wikipedia, Mattia Marchesetti); his year 2006 row is Sampdoria, reached in that later window', later: true },
  { n: 'Michalis Kapsis', why: 'Bordeaux to Olympiacos, announced 5 Jul 2005 (LEQ 20050705_144649)' },
  { n: 'Mika Nurmela', why: 'left Kaiserslautern in the summer of 2005 (KI 25 May 2005)' },
  { n: 'Mirko Savini', why: 'Fiorentina to Napoli on a free, 1 Jul 2005 (soccerway transfers, Mirko Savini)' },
  { n: 'Miso Brecko', why: 'left Hamburg in the summer of 2005 (KI 11 Aug 2005, Chance für Prica - Rydlewicz ins zentrale Mittelfeld)' },
  { n: 'Mohamed Kallon', why: 'Monaco loaned him to Al-Ittihad on 29 Jul 2005, 18 games there in 2005-06 (en.wikipedia, Mohamed Kallon); his year 2006 row is Monaco, back from that loan', later: true },
  { n: 'Mounir Diane', why: 'Lens loaned him to Bastia for the season, 25 Aug 2005 (LEQ 20050825_211922)' },
  { n: 'Mozart', why: 'Reggina to Spartak Moscow, 1 Jul 2005 (soccerway transfers, Mozart)' },
  { n: 'Nebojsa Krupnikovic', why: 'Hannover to Arminia Bielefeld on a free (KI 25 May 2005), but his year 2006 row is JEF United, so the table cannot place him at Bielefeld' },
  { n: 'Nico Van Kerckhoven', why: 'left Gladbach in the summer of 2005 (KI 25 May 2005)' },
  { n: 'Nicolas Bonnal', why: 'AC Ajaccio announced his departure on 8 Jun 2005 (LEQ 20050608_195430)' },
  { n: 'Nicolas Marin', why: 'Saint-Etienne loaned him to Sedan for the season, 1 Jul 2005 (soccerway transfers, Nicolas Marin)' },
  { n: 'Nilmar', why: 'Lyon loaned him to Corinthians until 30 Jun 2006, 23 Aug 2005 (LEQ 20050823_220344)' },
  { n: 'Pavel Drsek', why: 'left Duisburg in the summer of 2005 (KI 25 May 2005, Abstiegsgefährdeter Erstligist verpflichtet Duisburger Abwehrrecken)' },
  { n: 'Per Kröldrup', why: 'Udinese to Everton on 27 Jun 2005 (11v11.com club history, Per Kroldrup); his year 2006 row is Fiorentina, where he went on 20 Jan 2006 (same record; FBref: 1 game for Everton, 14 for Fiorentina)', later: true },
  { n: 'Predrag Ocokoljic', why: 'Toulouse to Chateauroux on a free, 1 Jul 2005 (soccerway transfers, Predrag Ocokoljic); no year 2006 row', single: true },
  { n: 'Renaud Cohade', why: 'Bordeaux loaned him to Sete for the season, 30 Aug 2005 (LEQ 20050830_170012)' },
  { n: 'Renaud Connen', why: 'AC Ajaccio loaned him to Grenoble for the season, 16 Jul 2005 (LEQ 20050716_174700)' },
  { n: 'Reto Ziegler', why: 'Tottenham loaned him to Hamburg, 31 Aug 2005 (KI; LEQ 20050831_171255); his year 2006 row is Wigan, where he went on loan in January 2006 (FBref: 8 games for Hamburg, 10 for Wigan)', later: true },
  { n: 'Roberto Colacone', why: 'Ascoli to Modena, at Modena from 2005 to 2007 (it.wikipedia, Roberto Colacone) and not in Ascoli\'s 2005-06 squad (it.wikipedia, Ascoli Calcio 1898 2005-2006); his year 2006 row is Modena' },
  { n: 'Roberto Cortellini', why: 'his Treviso spell was 2004-05; two full seasons at Brescia from 2005-06 (it.wikipedia, Roberto Cortellini); his year 2006 row is Brescia' },
  { n: 'Robson Ponté', why: 'left Bayer Leverkusen in the summer of 2005 (KI 25 May 2005)' },
  { n: 'Roman Wallner', why: 'left Hannover 96 in the summer of 2005 (KI 29 Jun 2005); no year 2006 row', single: true },
  { n: 'Samir Handanovič', why: 'Udinese loaned him out (FBref 2005-06: 1 game for Lazio, 3 for Treviso, none for Udinese); no year 2006 row', single: true },
  { n: 'Sead Ramovic', why: 'left Gladbach in the summer of 2005 (KI 4 Jul 2005, Torhüter wechselt zum Aufsteiger)' },
  { n: 'Selim Benachour', why: 'PSG to Vitoria Guimaraes, signed by 21 Jul 2005 (LEQ 20050721_111746)' },
  { n: 'Selim Teber', why: 'left Kaiserslautern in the summer of 2005 (KI 29 Jun 2005); no year 2006 row', single: true },
  { n: 'Serge Dié', why: 'Nice left him out on his way out of the club, 6 Aug 2005 (LEQ 20050806_001906)' },
  { n: 'Shunsuke Nakamura', why: 'Reggina to Celtic, signed by 25 Jul 2005 (LEQ 20050725_233252)' },
  { n: 'Sigamary Diarra', why: 'Sochaux to Laval, signed by 11 Jul 2005 (LEQ 20050711_132059)' },
  { n: 'Stephen Appiah', why: 'Juventus to Fenerbahce, 21 Jul 2005 (REP mercato20lug, 22 Jul 2005)' },
  { n: 'Steve Marlet', why: 'Marseille to Wolfsburg, 18 Aug 2005 (KI; LEQ 20050816_124554); no year 2006 row, so the table cannot place him at Wolfsburg', single: true },
  { n: 'Sven Vermant', why: 'left Schalke 04 in the summer of 2005 (KI 30 Jun 2005)' },
  { n: 'Sylvain N\'Diaye', why: 'Marseille to Levante, signed 23 Aug 2005 (LEQ 20050824_102822)' },
  { n: 'Tchiressoua Guel', why: 'Nancy to Lorient on a free, 1 Jul 2005 (soccerway transfers, Tchiressoua Guel)' },
  { n: 'Thiago Ribeiro', why: 'his Bordeaux loan ended on 30 Jun 2005 and he went home to Rio Branco, then Sao Paulo (soccerway transfers, Thiago Ribeiro)' },
  { n: 'Thibault Scotto', why: 'Nice loaned him to Amiens for the season, 1 Jul 2005 (soccerway transfers, Thibault Scotto); no year 2006 row', single: true },
  { n: 'Thomas Rytter', why: 'left Wolfsburg in the summer of 2005 (KI 21 Jul 2005, Bröndby IF zahlt keine Ablösesumme)' },
  { n: 'Timo Achenbach', why: 'left Köln in the summer of 2005 (KI 2 Aug 2005, Neuzugang für die linke Bahn); no year 2006 row', single: true },
  { n: 'Toledo', why: 'not in Ascoli\'s 2005-06 squad (it.wikipedia, Ascoli Calcio 1898 2005-2006) and no league game for Ascoli that season (FB); his year 2006 row is Taranto' },
  { n: 'Tommy Svindal Larsen', why: 'left Nurnberg on a free in the summer of 2005 (KI 25 May 2005); his year 2006 row is Odd Grenland' },
  { n: 'Tore André Flo', why: 'Siena to Vålerenga in July 2005 (en.wikipedia, Tore André Flo; no league game for Siena in 2005-06, FB); his year 2006 row is Vålerenga' },
  { n: 'Traianos Dellas', why: 'out of contract at Roma on 30 Jun 2005, a free agent until AEK Athens signed him on 19 Sep 2005 (UEFA.com newsid 342702)' },
  { n: 'Valerio Virga', why: 'Roma loaned him to Ascoli for 2005-06 and a cruciate injury in a summer friendly kept him out all season (it.wikipedia, Valerio Virga); his year 2006 row is Roma, back from that loan, so no row places him at Ascoli', later: true },
  { n: 'Vasilios Tsiartas', why: 'left Koln in the summer of 2005 (KI 29 Jun 2005, Tsiartas, Vassilios)' },
  { n: 'Victor Agali', why: 'Nice to Kayseri Erciyesspor on a free, 1 Jul 2005 (soccerway transfers, Victor Agali)' },
  { n: 'Yacine Abdessadki', why: 'Strasbourg to Toulouse on a three year deal in 2005, six months and 9 games there, then back at Strasbourg in the January 2006 window (fr.wikipedia, Yacine Abdessadki; FB: 9 Ligue 1 games for Toulouse, 13 for Strasbourg); his year 2006 row is Strasbourg, reached in that later window, and no row places him at Toulouse', later: true },
  { n: 'Yacine Bezzaz', why: 'AC Ajaccio to Valenciennes on a free, 1 Jul 2005 (soccerway transfers, Yacine Bezzaz)' },
];
const B5_ARRIVALS = [
  { n: 'Adel Chedli', from: 'Istres Football Club', to: 'Nürnberg', why: 'Istres Football Club to Nürnberg (KI 23 Jun 2005, Nach Mnari kommt der zweite tunesische Nationalspieler)' },
  { n: 'André Pinga', from: 'Torino FC', to: 'Treviso', why: 'Torino FC to Treviso (FB: 24 Serie A games for Treviso)' },
  { n: 'Andrea Caracciolo', from: 'Brescia Calcio', to: 'Palermo', why: 'Brescia Calcio to Palermo (FB: 35 Serie A games for Palermo)' },
  { n: 'Andrea Cossu', from: 'Hellas Verona', to: 'Cagliari', why: 'Hellas Verona to Cagliari (FB: 22 Serie A games for Cagliari)' },
  { n: 'Anthar Yahia', from: 'SC Bastia', to: 'Nice', why: 'Bastia to Nice, signed 20 Jun 2005 (LEQ 20050620_203806)' },
  { n: 'Antonio Mirante', from: 'FC Crotone', to: 'Siena', why: 'FC Crotone to Siena (FB: 26 Serie A games for Siena)' },
  { n: 'Aruna Dindane', from: 'RSC Anderlecht', to: 'Lens', why: 'RSC Anderlecht to Lens (FB: 28 Ligue 1 games for Lens)' },
  { n: 'Axel Bellinghausen', from: 'Fortuna Düsseldorf', to: 'Kaiserslautern', why: 'Fortuna Düsseldorf to Kaiserslautern (KI 25 May 2005; FB: 20 Bundesliga games for Kaiserslautern)' },
  { n: 'Benjamin Huggel', from: 'FC Basel 1893', to: 'Eintracht Frankfurt', why: 'FC Basel 1893 to Eintracht Frankfurt (KI 27 Jun 2005; FB: 28 Bundesliga games for Eintracht Frankfurt)' },
  { n: 'Cesare Natali', from: 'Atalanta BC', to: 'Udinese', why: 'Atalanta to Udinese on a five year contract, 29 Jun 2005 (UEFA.com newsid 312951)' },
  { n: 'Christian Giménez', from: 'FC Basel 1893', to: 'Marseille', why: 'Basel to Marseille, one of the new signings on 26 Aug 2005 (LEQ 20050826_000248)' },
  { n: 'Christoph Preuß', from: 'VfL Bochum', to: 'Eintracht Frankfurt', why: 'VfL Bochum to Eintracht Frankfurt (KI 25 May 2005; FB: 23 Bundesliga games for Eintracht Frankfurt)' },
  { n: 'Damiano Zenoni', from: 'Atalanta BC', to: 'Udinese', why: 'Atalanta BC to Udinese (FB: 32 Serie A games for Udinese)' },
  { n: 'David Kobylík', from: 'SK Sigma Olomouc', to: 'Arminia Bielefeld', why: 'SK Sigma Olomouc to Arminia Bielefeld (KI 13 Jun 2005; FB: 25 Bundesliga games for Arminia Bielefeld)' },
  { n: 'David Rozehnal', from: 'Club Brugge KV', to: 'PSG', why: 'Club Brugge KV to PSG (FB: 38 Ligue 1 games for PSG)' },
  { n: 'Delfim', from: 'Moreirense FC', to: 'Marseille', why: 'back at Marseille from his Moreirense loan, starting for the club on 9 Aug 2005 (LEQ 20050811_113946)' },
  { n: 'Dennis Gentenaar', from: 'NEC Nijmegen', to: 'Borussia Dortmund', why: 'NEC Nijmegen to Borussia Dortmund (KI 30 May 2005)' },
  { n: 'Ellery Cairo', from: 'SC Freiburg', to: 'Hertha BSC', why: 'SC Freiburg to Hertha BSC (KI 27 May 2005, Angreifer kann auf Grund einer Ausstiegsklausel wechseln)' },
  { n: 'Erjon Bogdani', from: 'Hellas Verona', to: 'Siena', why: 'Hellas Verona to Siena (FB: 34 Serie A games for Siena)' },
  { n: 'Fabio Quagliarella', from: 'Torino FC', to: 'Ascoli', why: 'Torino FC to Ascoli (FB: 33 Serie A games for Ascoli)' },
  { n: 'Francisco Copado', from: 'SpVgg Unterhaching', to: 'Eintracht Frankfurt', why: 'SpVgg Unterhaching to Eintracht Frankfurt (KI 25 May 2005; FB: 24 Bundesliga games for Eintracht Frankfurt)' },
  { n: 'Giampaolo Pazzini', from: 'Atalanta BC', to: 'Fiorentina', why: 'Atalanta BC to Fiorentina (FB: 27 Serie A games for Fiorentina)' },
  { n: 'Gianluca Comotto', from: 'Torino FC', to: 'Ascoli', why: 'Torino FC to Ascoli (FB: 31 Serie A games for Ascoli)' },
  { n: 'Giuseppe Sculli', from: 'Brescia Calcio', to: 'Messina', why: 'Brescia Calcio to Messina (FB: 34 Serie A games for Messina)' },
  { n: 'Ibrahima Bakayoko', from: 'Istres Football Club', to: 'Livorno', why: 'Istres to Livorno, signed 18 Aug 2005 (LEQ 20050819_131942)' },
  { n: 'Ivan Saenko', from: 'Karlsruher SC', to: 'Nürnberg', why: 'Karlsruher SC to Nürnberg (KI 25 May 2005; FB: 25 Bundesliga games for Nürnberg)' },
  { n: 'Jan Polák', from: 'FC Slovan Liberec', to: 'Nürnberg', why: 'FC Slovan Liberec to Nürnberg (KI 25 May 2005; FB: 32 Bundesliga games for Nürnberg)' },
  { n: 'Jelle Van Damme', from: 'Southampton FC', to: 'Werder Bremen', why: 'Southampton FC to Werder Bremen (KI 3 Jul 2005)' },
  { n: 'Johann Vogel', from: 'PSV Eindhoven', to: 'AC Milan', why: 'PSV to AC Milan after the Dutch Cup final, announced 26 May 2005 (UEFA.com, Milan swoop for Vogel)' },
  { n: 'John Carew', from: 'Besiktas JK', to: 'Lyon', why: 'Besiktas JK to Lyon (FB: 26 Ligue 1 games for Lyon)' },
  { n: 'Kai Michalke', from: 'Alemannia Aachen', to: 'Duisburg', why: 'Alemannia Aachen to Duisburg (KI 25 May 2005)' },
  { n: 'Leon Andreasen', from: 'Aarhus GF', to: 'Werder Bremen', why: 'Aarhus GF to Werder Bremen (KI 25 May 2005)' },
  { n: 'Levan Tskitishvili', from: 'SC Freiburg', to: 'Wolfsburg', why: 'to Wolfsburg from a club in Donetsk, the former Freiburg man (KI 27 Jul 2005, Transfer des Georgiers unter Dach und Fach - Ex-Freiburger kommt aus Donezk); his year 2005 row still files him at SC Freiburg, which is the row this line reads' },
  { n: 'Luís Figo', from: 'Real Madrid', to: 'Inter Milan', why: 'Real Madrid to Inter Milan (FB: 34 Serie A games for Inter Milan)' },
  { n: 'Manuel Pasqual', from: 'SS Arezzo', to: 'Fiorentina', why: 'SS Arezzo to Fiorentina (FB: 35 Serie A games for Fiorentina)' },
  { n: 'Marcin Zewlakow', from: 'Excelsior Mouscron', to: 'Metz', why: 'Mouscron to Metz, cleared to play for Metz on 5 Aug 2005 (LEQ 20050805_150058)' },
  { n: 'Marco Motta', from: 'Atalanta BC', to: 'Udinese', why: 'Atalanta to Udinese, named among Udinese\'s summer arrivals on 29 Jun 2005 (UEFA.com newsid 312951)' },
  { n: 'Mourad Meghni', from: 'Bologna FC 1909', to: 'Sochaux', why: 'Bologna loaned him to Sochaux, his debut set for 27 Aug 2005 (LEQ 20050826_105824)' },
  { n: 'Nicola Legrottaglie', from: 'Bologna FC 1909', to: 'Siena', why: 'Bologna FC 1909 to Siena (FB: 28 Serie A games for Siena)' },
  { n: 'Nicola Pozzi', from: 'Delfino Pescara 1936', to: 'Empoli', why: 'Delfino Pescara 1936 to Empoli (FB: 24 Serie A games for Empoli)' },
  { n: 'Pasquale Foggia', from: 'FC Crotone', to: 'Ascoli', why: 'FC Crotone to Ascoli (FB: 34 Serie A games for Ascoli)' },
  { n: 'Patrick Vieira', from: 'Arsenal FC', to: 'Juventus', why: 'Arsenal FC to Juventus (FB: 31 Serie A games for Juventus)' },
  { n: 'Peter Van der Heyden', from: 'Club Brugge KV', to: 'Wolfsburg', why: 'Club Brugge KV to Wolfsburg (KI 25 May 2005; FB: 24 Bundesliga games for Wolfsburg)' },
  { n: 'Petr Ruman', from: 'SpVgg Greuther Fürth', to: 'Mainz', why: 'SpVgg Greuther Fürth to Mainz (KI 25 May 2005; FB: 24 Bundesliga games for Mainz)' },
  { n: 'Philipp Degen', from: 'FC Basel 1893', to: 'Borussia Dortmund', why: 'FC Basel 1893 to Borussia Dortmund (KI 25 May 2005; FB: 31 Bundesliga games for Borussia Dortmund)' },
  { n: 'Pierre Womé', from: 'Brescia Calcio', to: 'Inter Milan', why: 'Brescia to Inter, signed 30 Jun 2005 (LEQ 20050630_174724)' },
  { n: 'Rabiu Afolabi', from: 'Austria Vienna', to: 'Sochaux', why: 'Austria Vienna to Sochaux (FB: 32 Ligue 1 games for Sochaux)' },
  { n: 'Rafael van der Vaart', from: 'Ajax Amsterdam', to: 'Hamburg', why: 'Ajax Amsterdam to Hamburg (KI 25 May 2005; FB: 19 Bundesliga games for Hamburg)' },
  { n: 'Raffaele Palladino', from: 'US Salernitana 1919', to: 'Livorno', why: 'US Salernitana 1919 to Livorno (FB: 22 Serie A games for Livorno)' },
  { n: 'Razundara Tjikuzu', from: 'FC Hansa Rostock', to: 'Duisburg', why: 'FC Hansa Rostock to Duisburg (KI 25 May 2005; FB: 23 Bundesliga games for Duisburg)' },
  { n: 'Ricardo Sousa', from: 'De Graafschap Doetinchem', to: 'Hannover 96', why: 'De Graafschap Doetinchem to Hannover 96 (KI 25 May 2005)' },
  { n: 'Riccardo Montolivo', from: 'Atalanta BC', to: 'Fiorentina', why: 'Atalanta to Fiorentina, 1 Jul 2005 (soccerway transfers, Riccardo Montolivo)' },
  { n: 'Romain Rocchi', from: 'SC Bastia', to: 'AC Ajaccio', why: 'SC Bastia to AC Ajaccio (FB: 24 Ligue 1 games for AC Ajaccio)' },
  { n: 'Romaric', from: 'KSK Beveren', to: 'Le Mans', why: 'Beveren to Le Mans, a Le Mans player in the club\'s statement of 30 Aug 2005 (LEQ 20050830_105430)' },
  { n: 'Sabri Lamouchi', from: 'Genoa CFC', to: 'Marseille', why: 'Genoa CFC to Marseille (FB: 32 Ligue 1 games for Marseille)' },
  { n: 'Samuel Kuffour', from: 'FC Bayern Munich II', to: 'Roma', why: 'Bayern to Roma, 9 Jun 2005 (REP veromercato, 10 Jun 2005)' },
  { n: 'Sébastien Mazure', from: 'SM Caen', to: 'Saint-Étienne', why: 'Caen to Saint-Etienne, fit for the ASSE on 26 Aug 2005 (LEQ 20050826_204517)' },
  { n: 'Sibusiso Zuma', from: 'FC Copenhagen', to: 'Arminia Bielefeld', why: 'FC Copenhagen to Arminia Bielefeld (KI 31 May 2005; FB: 25 Bundesliga games for Arminia Bielefeld)' },
  { n: 'Simon Rolfes', from: 'Alemannia Aachen', to: 'Bayer Leverkusen', why: 'Alemannia Aachen to Bayer Leverkusen (KI 25 May 2005; FB: 32 Bundesliga games for Bayer Leverkusen)' },
  { n: 'Stephen Makinwa', from: 'Atalanta BC', to: 'Palermo', why: 'Atalanta BC to Palermo (FB: 23 Serie A games for Palermo)' },
  { n: 'Thomas Kahlenberg', from: 'Bröndby IF', to: 'Auxerre', why: 'Bröndby IF to Auxerre (FB: 38 Ligue 1 games for Auxerre)' },
  { n: 'Tobias Rau', from: 'FC Bayern Munich II', to: 'Arminia Bielefeld', why: 'FC Bayern Munich II to Arminia Bielefeld (KI 15 Jul 2005, Linksfuß kommt vom FC Bayern)' },
  { n: 'Tobias Willi', from: 'Red Bull Salzburg', to: 'Duisburg', why: 'Red Bull Salzburg to Duisburg (KI 25 May 2005; FB: 25 Bundesliga games for Duisburg)' },
  { n: 'Tom Geißler', from: 'SV Wacker Burghausen', to: 'Mainz', why: 'SV Wacker Burghausen to Mainz (KI 23 Jun 2005, Burghauser Mittelfeldakteur wechselt zum Klopp-Team)' },
  { n: 'Tomas Locatelli', from: 'Bologna FC 1909', to: 'Siena', why: 'Bologna FC 1909 to Siena (FB: 28 Serie A games for Siena)' },
  { n: 'Túlio de Melo', from: 'Aalborg BK', to: 'Le Mans', why: 'Aalborg BK to Le Mans (FB: 24 Ligue 1 games for Le Mans)' },
  { n: 'Valon Behrami', from: 'Hellas Verona', to: 'Lazio', why: 'Hellas Verona to Lazio (FB: 26 Serie A games for Lazio)' },
  { n: 'Walter Samuel', from: 'Real Madrid', to: 'Inter Milan', why: 'Real Madrid to Inter Milan (FB: 27 Serie A games for Inter Milan)' },
  { n: 'Youssef Mokhtari', from: 'FC Energie Cottbus', to: 'Köln', why: 'FC Energie Cottbus to Köln (KI 15 Aug 2005, Mittelfeldmann kommt auf Leihbasis an den Rhein)' },
  { n: 'Youssouf Hadji', from: 'SC Bastia', to: 'Rennes', why: 'Bastia to Rennes, signed 23 Jun 2005 (LEQ 20050623_175120)' },
  { n: 'Zé António', from: 'Académica Coimbra', to: 'Gladbach', why: 'Académica Coimbra to Gladbach (KI 23 Jun 2005; FB: 34 Bundesliga games for Gladbach)' },
  { n: 'Zlatan Bajramovic', from: 'SC Freiburg', to: 'Schalke 04', why: 'SC Freiburg to Schalke 04 (KI 25 May 2005; FB: 25 Bundesliga games for Schalke 04)' },
];
/* BIG_FIVE_CORRECTIONS_END */

if (bigFiveArg) {
  const argOf = (flag, dflt) => {
    const a = process.argv.find(x => x.startsWith(`${flag}=`));
    return a ? a.slice(a.indexOf('=') + 1) : dflt;
  };
  const file = path.join(ROOT, 'src/data/clubManagerEra2005.ts');
  const res = runExtend({
    file: argOf('--base', file), outFile: file, prefix: 'ERA2005', year: 2005,
    rows: readPull(argOf('--pull', 'C:/Users/antho/dukb-handoff/data/market-base-2005-2010-2015.json')),
    nextRows: readPull(argOf('--next', 'C:/Users/antho/dukb-handoff/data/market-base-2006-2011-2016.json')),
    newLeagues: [
      { label: 'Serie A', dbToEra: DB_TO_ERA_SA },
      { label: 'Bundesliga', dbToEra: DB_TO_ERA_BL },
      { label: 'Ligue 1', dbToEra: DB_TO_ERA_L1 },
    ],
    worldDbToEra: { ...DB_TO_ERA_PL, ...DB_TO_ERA_LL, ...DB_TO_ERA_SA, ...DB_TO_ERA_BL, ...DB_TO_ERA_L1 },
    folds: B5_FOLDS, moves: B5_MOVES, removals: B5_REMOVALS, arrivals: B5_ARRIVALS, namesakes: B5_NAMESAKES,
    poolNamesakes: B5_POOL_NAMESAKES,
    /* A 2005-06 Serie A, Bundesliga and Ligue 1 without their own headlines
       are not those leagues, and the re-audit has to have landed. */
    anchors: [
      ['Juventus', 'Gianluigi Buffon'], ['Juventus', 'Fabio Cannavaro'], ['Juventus', 'Pavel Nedved'],
      ['Juventus', 'Zlatan Ibrahimović'], ['Juventus', 'Patrick Vieira'],
      ['AC Milan', 'Andriy Shevchenko'], ['AC Milan', 'Kaká'], ['AC Milan', 'Alberto Gilardino'],
      ['Inter Milan', 'Luís Figo'], ['Inter Milan', 'Walter Samuel'], ['Fiorentina', 'Luca Toni'],
      ['Bayern Munich', 'Michael Ballack'], ['Bayern Munich', 'Philipp Lahm'], ['Werder Bremen', 'Miroslav Klose'],
      ['Lyon', 'Juninho Pernambucano'], ['Marseille', 'Franck Ribéry'], ['PSG', 'Pauleta'],
      ['Chelsea', 'Michael Essien'], ['Arsenal', 'Aleksandr Hleb'], ['Barcelona', 'Ronaldinho'],
    ],
    /* Thin only where the table itself is thin (under 8 real rows after the
       corrections), measured 2026-10-03: Nancy and Troyes (both promoted
       that summer) and Treviso (promoted when Genoa and Torino were thrown
       out), and the two the era already carried, Cadiz and Alaves. */
    expectedThin: ['Alavés', 'Cádiz', 'Nancy', 'Treviso', 'Troyes'],
    header: s => [
      '// AUTO-GENERATED by scripts/bakeEra2005.mjs (Round 176, extended Round 902).',
      '// The 2005-06 era world: real year-2005 Transfermarkt rows from',
      `// player_market_values for all ${s.clubs} clubs of the 2005-06 Premier League,`,
      '// La Liga, Serie A, Bundesliga and Ligue 1. The last three joined in Round',
      '// 902 through the extend step (scripts/lib/eraBakeExtend.mjs; the new',
      '// leagues from an offline pull of the base table, the lines already shipped',
      '// carried through as bytes). Memberships and sources are in the script',
      '// header. The verified summer 2005 window corrections are applied across',
      `// all five leagues (${s.moves} rows moved, removed, arrived or folded in`,
      '// total). Values in £m at the year-2005 snapshot, ratings 48-94 on the',
      '// same curve as the 2026 bake. Regenerate per the header of',
      '// scripts/bakeEra2005.mjs.',
      '// DO NOT EDIT BY HAND.',
    ],
  }, { write: !process.argv.includes('--dry') && !process.argv.includes('--check') });
  const s = res.stats;
  console.log(`Extended to ${s.players} players across ${s.clubs} clubs (${s.partial.length} partial: ${s.partial.join(', ')}).`);
  console.log(`Big five corrections: ${s.moved} moved, ${s.removed} removed, ${s.arrived} arrived, ${s.folded} folded, ${s.collisions} namesakes resolved.`);
  console.log(`Shipped lines: ${s.shippedLines}, of which ${s.shippedKept} are still in the world byte for byte. Touched:`);
  for (const t of s.touched) console.log(`  ${t}`);
  console.log(`New club sizes: ${Object.entries(s.sizes).map(([c, n]) => `${c} ${n}`).join(', ')}`);
  if (process.argv.includes('--check')) {
    const norm = t => t.replace(/\r\n/g, '\n');
    if (norm(fs.readFileSync(file, 'utf8')) !== norm(res.text)) {
      console.error('CHECK: the rebuilt era file differs from src/data/clubManagerEra2005.ts');
      process.exit(1);
    }
    console.log('CHECK: the rebuilt era file is byte identical to the shipped one (line endings aside).');
    process.exit(0);
  }
  if (!process.argv.includes('--dry')) {
    const n = updateNationalityBlock(path.join(ROOT, 'src/data/playerNationalities.ts'), 'era2005', res);
    console.log(`Nationalities, era2005 block: ${n.added} added, ${n.changed} re-pointed, ${n.dropped} dropped, ${n.total} entries for ${s.players} players.`);
  }
  process.exit(0);
}

/* POS_MAP, ratingOf and gbpM, the same curves as bakeClubManagerRosters.mjs
 * so a 2005 value and a 2026 value mean the same thing on the rating scale,
 * come from scripts/lib/eraBakeExtend.mjs (imported at the top), one copy for
 * every era bake. Round 902 moved this file's 'Sweeper' entry into it, so the
 * map this path reads is the one it always had. */

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
  ...readDump(plArg, DB_TO_ERA_PL, 'Premier League 2005'),
  ...readDump(llArg, DB_TO_ERA_LL, 'La Liga 2005'),
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
for (const mv of ERA_MOVES_2005) {
  const rec = byPlayer.get(mv.n);
  if (!rec) {
    console.error(`FATAL: mover "${mv.n}" not found in the dumps, the correction list is stale`);
    process.exit(1);
  }
  if (mv.to === null) { byPlayer.delete(mv.n); removed += 1; }
  else { rec.engine = mv.to; moved += 1; }
}
for (const ar of ERA_ARRIVALS_2005) {
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
    console.error(`FATAL: anchor ${name} missing from 2005 ${club}`);
    process.exit(1);
  }
};
anchor('Barcelona', 'Ronaldinho');
anchor('Barcelona', 'Lionel Messi');
anchor('Chelsea', 'Frank Lampard');
anchor('Chelsea', 'Michael Essien');
anchor('Liverpool', 'Steven Gerrard');
anchor('Arsenal', 'Thierry Henry');
anchor('Real Madrid', 'Zinédine Zidane');
anchor('Real Madrid', 'Sergio Ramos');
anchor('Newcastle', 'Michael Owen');
anchor('Valencia', 'David Villa');

const EXPECTED_THIN = new Set(['Cádiz', 'Alavés']);
const partial = [];
let total = 0;
for (const club of engineClubs) {
  const n = byClub.get(club).length;
  total += n;
  if (n < 8) {
    partial.push(club);
    if (!EXPECTED_THIN.has(club)) {
      console.error(`FATAL: ${club} has only ${n} real 2005 players and was not expected thin`);
      process.exit(1);
    }
  }
}

/* Emit. */
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const clubsSorted = [...engineClubs].sort();
let out = `// AUTO-GENERATED by scripts/bakeEra2005.mjs (Round 176). The 2005-06 era
// world: real year-2005 Transfermarkt rows from player_market_values for all
// 40 clubs of the 2005-06 Premier League and La Liga, with the verified
// summer 2005 window corrections applied (${moved} moved, ${removed} left for
// clubs outside this world, ${arrived} arrived from outside it). Values in £m
// at the year-2005 snapshot, ratings 48-94 on the same curve as the 2026
// bake. Regenerate per the header of scripts/bakeEra2005.mjs.
// DO NOT EDIT BY HAND.
import type { BakedPlayer } from '@/data/clubManagerRosters';

export const ERA2005_META = {
  year: 2005,
  players: ${total},
  clubs: ${clubsSorted.length},
  moves: ${moved + removed + arrived},
};

/** 2005 clubs where the year-2005 table runs thin (under 8 real players);
 *  the game pads these squads with youth players and the picker says so. */
export const ERA2005_PARTIAL: string[] = ${JSON.stringify(partial.sort())};

export const ERA2005_ROSTERS: Record<string, BakedPlayer[]> = {
`;
for (const club of clubsSorted) {
  out += `  '${esc(club)}': [\n`;
  for (const p of byClub.get(club)) {
    out += `    { n: '${esc(p.n)}', p: '${p.p}', a: ${p.a}, v: ${p.v}, r: ${p.r} },\n`;
  }
  out += `  ],\n`;
}
out += `};\n`;

fs.writeFileSync(path.join(ROOT, 'src/data/clubManagerEra2005.ts'), out);
console.log(`Baked ${total} players across ${clubsSorted.length} clubs (${partial.length} partial) -> src/data/clubManagerEra2005.ts`);
console.log(`Window corrections: ${moved} moved, ${removed} removed, ${arrived} arrived`);
