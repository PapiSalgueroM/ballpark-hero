/**
 * Round 175: bake the 2015-16 era world for Club Manager, phase two of the
 * past eras program (phase one was scripts/bakeEra2010.mjs, Round 146). Two
 * leagues, Premier League and La Liga, forty clubs, every player a real
 * year-2015 Transfermarkt row from our own player_market_values table. The
 * season is the one where Leicester came from 5000-1 to win the whole thing.
 *
 * OFFLINE ONLY. The cloud sandbox cannot reach Supabase directly, so this
 * script reads two dump files produced through the Supabase MCP:
 *
 *   node scripts/bakeEra2015.mjs --pl=pl2015.json --laliga=laliga2015.json
 *
 * Each dump is {"rows":[{player_name, club, position, age, market_value_usd}]}
 * from:
 *   SELECT json_agg(json_build_object(...)) FROM (
 *     SELECT DISTINCT ON (player_name) player_name, club, position, age,
 *       market_value_usd
 *     FROM player_market_values
 *     WHERE year = 2015 AND club IN (...the league's 20 DB name variants...)
 *     ORDER BY player_name, market_value_usd DESC) t;
 *
 * NOTE: the base table, NOT the dedup view, and year = 2015 exactly. No 2014
 * fallback: thin is honest, that is what ERA2015_PARTIAL is for. That rule
 * has one visible cost in this era: Wes Morgan, the champions' captain, has
 * year-2014 and year-2016 rows but NO year-2015 row at all, so he is not in
 * this world, and we say that here rather than invent a snapshot for him.
 *
 * THE U21 CLUB VARIANTS. Two first team goalkeepers' year-2015 rows sit
 * under U21 club name variants in the table ("Leicester City U21" holds
 * Kasper Schmeichel, "Sunderland AFC U21" holds Vito Mannone; both verified
 * as those clubs' actual first choice keepers in 2015-16, and both variants
 * hold exactly one row). The PL query's IN list includes those two variants
 * and the map below folds them into their first teams.
 *
 * THE CALENDAR CORRECTION. Year-2015 value snapshots predate the summer 2015
 * window, and that summer was enormous, so the famous movers sit at their
 * 2014-15 clubs in the raw dumps (Sterling at Liverpool, Pedro at Barcelona,
 * De Bruyne at Wolfsburg). ERA_MOVES_2015 and ERA_ARRIVALS_2015 correct
 * exactly the movers whose wrong club would be glaring, every one verified
 * two ways: common history AND the table's own year-2016 rows showing the
 * destination club (queried 2026-08-18). Values stay the year-2015 snapshot
 * for every player, moved or not, so the value basis is uniform. Players who
 * left this two-league world entirely (Di Maria to PSG, Xavi to Al Sadd,
 * Casillas to Porto, Gerrard to LA) are removed rather than relocated.
 * Christian Fuchs joined the champions that summer too, but the table holds
 * no year-2016 row for him, so he fails the two-way verification and is left
 * out rather than added on one source.
 *
 * FAILS CLOSED on unmapped positions, missing marquee anchors, or a thin
 * club that is not in the expected-thin list.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runExtend, readPull, updateNationalityBlock } from './lib/eraBakeExtend.mjs';

const ROOT =path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ================= Round 191: the Serie A extension ================= */
/* The era grows its third league IN PLACE. The original --pl/--laliga
   full-bake path below still documents how the first forty clubs were
   made, but its input dumps were session files that no longer exist, so
   regenerating from scratch would mean re-transcribing seven hundred
   rows by hand, and every hand-copied row is a chance to corrupt a world
   that already shipped verified. The extend mode treats the SHIPPED
   clubManagerEra2015.ts as the source of truth for the Premier League
   and La Liga (it IS the byte-exact output of the original bake), adds
   the 2015-16 Serie A from a fresh dump (same documented SQL shape, base
   table, year = 2015 exact, DISTINCT ON), and applies ONLY the
   cross-window corrections below, every one verified against the table's
   own year-2016 rows on 2026-08-20. Run:

     node scripts/bakeEra2015.mjs --extend-seriea=seriea2015.json

   Corrections follow the Round 175 rules exactly: values stay the
   year-2015 snapshot for every player, moved or not; a mover needs
   common history AND a year-2016 row naming the destination; players
   who left the (now three-league) world are removed, not relocated.
   TWO removals are single-source by documented exception: Andrea Pirlo
   (to New York City) and Samuel Eto'o (to Antalyaspor) have NO year-2016
   row anywhere because the table does not track those leagues, so the
   two-way rule cannot fire; but KEEPING them at Juventus and Sampdoria
   would be affirmatively false, and a removal, unlike a placement,
   cannot invent anything. The asymmetry is the point.
   THE SHAQIRI FOLD: his year-2015 row surfaces in the Serie A dump at
   Inter, but the shipped Premier League world already carries him at
   Stoke via the Round 175 arrivals list, from the same row's data. The
   dump row is dropped in favor of the shipped line, one man, one club. */

const extendArg = process.argv.find(a => a.startsWith('--extend-seriea='));
/* Round 899: the Bundesliga and Ligue 1 join through the shared step in
   scripts/lib/eraBakeExtend.mjs. See THE BIG FIVE EXTENSION further down. */
const bigFiveArg = process.argv.includes('--extend-big-five');

const plArg = process.argv.find(a => a.startsWith('--pl='));
const llArg = process.argv.find(a => a.startsWith('--laliga='));
if (!extendArg && !bigFiveArg && (!plArg || !llArg)) {
  console.error('Usage: node scripts/bakeEra2015.mjs --extend-big-five [--base=<the 60 club file>] [--pull=<year 2015 pull>] [--next=<year 2016 pull>] [--dry]');
  console.error('   or (Round 191, already applied): node scripts/bakeEra2015.mjs --extend-seriea=seriea2015.json');
  console.error('   or (superseded full bake): node scripts/bakeEra2015.mjs --pl=pl2015.json --laliga=laliga2015.json');
  process.exit(1);
}

/* DB club name -> era engine club name. Shared clubs reuse the exact 2026
 * world spelling, and clubs already named by the 2010 era reuse THAT
 * spelling (the era decides which roster FILE is read, so the same name in
 * several files is several different squads, not a collision). 2015-only
 * clubs get their natural short names. */
const DB_TO_ERA_PL = {
  'Arsenal FC': 'Arsenal', 'Aston Villa': 'Aston Villa',
  'AFC Bournemouth': 'Bournemouth', 'Chelsea FC': 'Chelsea',
  'Crystal Palace': 'Crystal Palace', 'Everton FC': 'Everton',
  'Leicester City': 'Leicester City', 'Liverpool FC': 'Liverpool',
  'Manchester City': 'Manchester City', 'Manchester United': 'Manchester United',
  'Newcastle United': 'Newcastle', 'Norwich City': 'Norwich City',
  'Southampton FC': 'Southampton', 'Stoke City': 'Stoke City',
  'Sunderland AFC': 'Sunderland', 'Swansea City': 'Swansea City',
  'Tottenham Hotspur': 'Tottenham', 'Watford FC': 'Watford',
  'West Bromwich Albion': 'West Brom', 'West Ham United': 'West Ham',
  // See THE U21 CLUB VARIANTS in the header: two keepers' 2015 rows.
  'Leicester City U21': 'Leicester City', 'Sunderland AFC U21': 'Sunderland',
};
const DB_TO_ERA_LL = {
  'Athletic Bilbao': 'Athletic Club', 'Atlético de Madrid': 'Atlético Madrid',
  'FC Barcelona': 'Barcelona', 'Celta de Vigo': 'Celta Vigo',
  'Deportivo de La Coruña': 'Deportivo La Coruña', 'SD Eibar': 'Eibar',
  'RCD Espanyol Barcelona': 'Espanyol', 'Getafe CF': 'Getafe',
  'Granada CF': 'Granada', 'UD Las Palmas': 'Las Palmas',
  'Levante UD': 'Levante', 'Málaga CF': 'Málaga',
  'Rayo Vallecano': 'Rayo Vallecano', 'Real Betis Balompié': 'Real Betis',
  'Real Madrid': 'Real Madrid', 'Real Sociedad': 'Real Sociedad',
  'Sevilla FC': 'Sevilla', 'Sporting Gijón': 'Sporting Gijón',
  'Valencia CF': 'Valencia', 'Villarreal CF': 'Villarreal',
};

/* The verified summer 2015 window corrections. `to: null` means the player
 * left this two-league world entirely. Every entry checked against the
 * table's own year-2016 rows on 2026-08-18. */
const ERA_MOVES_2015 = [
  // The Premier League's own merry-go-round.
  { n: 'Raheem Sterling', to: 'Manchester City' },
  { n: 'Christian Benteke', to: 'Liverpool' },
  { n: 'Fabian Delph', to: 'Manchester City' },
  { n: 'Morgan Schneiderlin', to: 'Manchester United' },
  { n: 'Nathaniel Clyne', to: 'Liverpool' },
  { n: 'Petr Cech', to: 'Arsenal' },
  { n: 'James Milner', to: 'Liverpool' },
  { n: 'Toby Alderweireld', to: 'Tottenham' },
  { n: 'Radamel Falcao', to: 'Chelsea' },
  { n: 'Glen Johnson', to: 'Stoke City' },
  { n: 'Mario Suárez', to: 'Watford' },
  // Spain to England, England to Spain, Spain to Spain.
  { n: 'Pedro', to: 'Chelsea' },
  { n: 'Nicolás Otamendi', to: 'Manchester City' },
  { n: 'Arda Turan', to: 'Barcelona' },
  { n: 'Luciano Vietto', to: 'Atlético Madrid' },
  { n: 'Aleix Vidal', to: 'Barcelona' },
  { n: 'Raúl García', to: 'Athletic Club' },
  { n: 'Iago Aspas', to: 'Celta Vigo' },
  { n: 'Gerard Deulofeu', to: 'Everton' },
  { n: 'Lucas Vázquez', to: 'Real Madrid' },
  { n: 'Denis Suárez', to: 'Villarreal' },
  { n: 'Juanmi', to: 'Southampton' },
  { n: 'Adama Traoré', to: 'Aston Villa' },
  { n: 'Alen Halilovic', to: 'Sporting Gijón' },
  { n: 'Michael Krohn-Dehli', to: 'Sevilla' },
  // Out of this two-league world entirely.
  { n: 'Ángel Di María', to: null },
  { n: 'Robin van Persie', to: null },
  { n: 'Mario Balotelli', to: null },
  { n: 'Steven Gerrard', to: null },
  { n: 'Xavi', to: null },
  { n: 'Iker Casillas', to: null },
  { n: 'Sami Khedira', to: null },
  { n: 'Mario Mandžukić', to: null },
  { n: 'Carlos Bacca', to: null },
  { n: 'Fábio Coentrão', to: null },
  { n: 'Chicharito', to: null },
  { n: 'Sergi Darder', to: null },
  { n: 'Jeison Murillo', to: null },
  { n: 'Ivan Cavaleiro', to: null },
  { n: 'Héctor Moreno', to: null },
  { n: 'Martín Montoya', to: null },
  { n: 'Raúl Jiménez', to: null },
];
/* Arrivals from outside carry their own year-2015 row data (position, age,
 * value) pulled the same day, destinations verified via year-2016 rows. */
const ERA_ARRIVALS_2015 = [
  { n: 'Kevin De Bruyne', to: 'Manchester City', position: 'Attacking Midfield', age: 23, usd: 65000000 },
  { n: 'Anthony Martial', to: 'Manchester United', position: 'Centre-Forward', age: 19, usd: 27000000 },
  { n: 'Memphis Depay', to: 'Manchester United', position: 'Second Striker', age: 20, usd: 30000000 },
  { n: 'Bastian Schweinsteiger', to: 'Manchester United', position: 'Central Midfield', age: 30, usd: 30000000 },
  { n: 'Heung-min Son', to: 'Tottenham', position: 'Left Winger', age: 22, usd: 27000000 },
  { n: 'Roberto Firmino', to: 'Liverpool', position: 'Centre-Forward', age: 23, usd: 38000000 },
  { n: 'Dimitri Payet', to: 'West Ham', position: 'Attacking Midfield', age: 27, usd: 16000000 },
  { n: "N'Golo Kanté", to: 'Leicester City', position: 'Defensive Midfield', age: 23, usd: 8000000 },
  { n: 'Shinji Okazaki', to: 'Leicester City', position: 'Centre-Forward', age: 28, usd: 9000000 },
  { n: 'Georginio Wijnaldum', to: 'Newcastle', position: 'Central Midfield', age: 24, usd: 19000000 },
  { n: 'Jackson Martínez', to: 'Atlético Madrid', position: 'Centre-Forward', age: 28, usd: 38000000 },
  { n: 'Yohan Cabaye', to: 'Crystal Palace', position: 'Central Midfield', age: 28, usd: 22000000 },
  { n: 'Xherdan Shaqiri', to: 'Stoke City', position: 'Attacking Midfield', age: 23, usd: 19000000 },
  { n: 'André Ayew', to: 'Swansea City', position: 'Centre-Forward', age: 25, usd: 14000000 },
];

/* ---- Round 191: Serie A extension data ---- */

/* DB club name -> era engine club name for the 2015-16 Serie A, membership
 * verified 2026-08-20 against the Wikipedia season page (Juventus champions,
 * their fifth straight; Carpi, Frosinone and Bologna up) and worldfootball's
 * fixture list, which names exactly these twenty. Shared clubs reuse the
 * 2026 world spelling; 2015-only clubs get their natural short names. */
const DB_TO_ERA_SA = {
  'Juventus FC': 'Juventus', 'SSC Napoli': 'Napoli', 'AS Roma': 'Roma',
  'Inter Milan': 'Inter Milan', 'AC Milan': 'AC Milan',
  'ACF Fiorentina': 'Fiorentina', 'SS Lazio': 'Lazio', 'Torino FC': 'Torino',
  'Genoa CFC': 'Genoa', 'UC Sampdoria': 'Sampdoria', 'US Sassuolo': 'Sassuolo',
  'Udinese Calcio': 'Udinese', 'FC Empoli': 'Empoli',
  'Chievo Verona': 'Chievo Verona', 'Palermo FC': 'Palermo',
  'Atalanta BC': 'Atalanta', 'Bologna FC 1909': 'Bologna',
  'Hellas Verona': 'Hellas Verona', 'AC Carpi': 'Carpi',
  'Frosinone Calcio': 'Frosinone',
};

/* The verified summer 2015 corrections the Serie A extension needs, every
 * one checked against year-2016 rows on 2026-08-20. Three kinds:
 * within-Serie-A, Serie A <-> the existing two leagues (both directions),
 * and out of the world (to: null). See the mode header for the two
 * documented single-source removals. */
const SA_EXTEND_MOVES = [
  // The Juventus rebuild, both directions.
  { n: 'Paulo Dybala', to: 'Juventus' },          // Palermo -> Juve, 2016 row Juventus FC
  { n: 'Juan Cuadrado', to: 'Juventus' },         // Fiorentina row -> Juve, 2016 confirms
  { n: 'Neto', to: 'Juventus' },                  // Fiorentina -> Juve, 2016 confirms
  { n: 'Daniele Rugani', to: 'Juventus' },        // Empoli -> Juve, 2016 confirms
  { n: 'Simone Zaza', to: 'Juventus' },           // Sassuolo -> Juve, 2016 confirms
  { n: 'Arturo Vidal', to: null },                // -> Bayern, 2016 confirms
  { n: 'Carlos Tévez', to: null },                // -> Boca, 2016 confirms
  { n: 'Kingsley Coman', to: null },              // -> Bayern, 2016 confirms
  { n: 'Fernando Llorente', to: null },           // -> Sevilla... in-world! See below.
  { n: 'Angelo Ogbonna', to: 'West Ham' },        // -> West Ham, 2016 confirms
  { n: 'Sebastian Giovinco', to: null },          // -> Toronto, 2016 confirms (left Feb 2015)
  { n: 'Andrea Pirlo', to: null },                // -> New York City; single-source, see header
  // Milan's window.
  { n: 'Alessio Romagnoli', to: 'AC Milan' },     // Sampdoria row -> Milan, 2016 confirms
  { n: 'Andrea Bertolacci', to: 'AC Milan' },     // Genoa -> Milan, 2016 confirms
  { n: 'Juraj Kucka', to: 'AC Milan' },           // Genoa -> Milan, 2016 confirms
  { n: 'Adil Rami', to: null },                   // -> Sevilla... in-world! See below.
  { n: 'Marco van Ginkel', to: 'Stoke City' },    // loan end -> Stoke loan, 2016 confirms
  { n: 'Pablo Armero', to: 'Udinese' },           // 2016 row Udinese Calcio
  { n: 'Salvatore Bocchetti', to: null },         // -> Spartak Moscow, 2016 confirms
  // Inter's window.
  { n: 'Miranda', to: 'Inter Milan' },            // Atletico -> Inter, 2016 confirms
  { n: 'Stevan Jovetić', to: 'Inter Milan' },     // Man City -> Inter, 2016 confirms
  { n: 'Adem Ljajic', to: 'Inter Milan' },        // Roma -> Inter, 2016 confirms
  { n: 'Mateo Kovacic', to: 'Real Madrid' },      // Inter -> Real, 2016 confirms
  { n: 'Lukas Podolski', to: null },              // -> Galatasaray, 2016 confirms
  { n: 'Daniel Osvaldo', to: null },              // -> Boca, 2016 confirms
  { n: 'Xherdan Shaqiri', to: 'DROP_DUPLICATE' }, // the Shaqiri fold, see header
  { n: "Yann M'Vila", to: 'Sunderland' },         // 2016 row Sunderland AFC
  { n: 'Zdravko Kuzmanovic', to: 'Udinese' },     // 2016 row Udinese Calcio
  // Roma's window, both directions.
  { n: 'Edin Dzeko', to: 'Roma' },                // Man City -> Roma, 2016 confirms
  { n: 'Mohamed Salah', to: 'Roma' },             // Fiorentina row -> Roma, 2016 confirms
  { n: 'Wojciech Szczęsny', to: 'Roma' },         // Arsenal -> Roma, 2016 confirms
  { n: 'Iago Falque', to: 'Roma' },               // Genoa -> Roma, 2016 confirms
  { n: 'Mattia Destro', to: 'Bologna' },          // 2016 row Bologna FC 1909
  { n: 'Davide Astori', to: 'Fiorentina' },       // 2016 row ACF Fiorentina
  { n: 'Seydou Doumbia', to: null },              // loan back east, 2016 row not at Roma
  { n: 'Mapou Yanga-Mbiwa', to: null },           // -> Lyon, 2016 confirms
  { n: 'Salih Uçan', to: null },                  // -> Fenerbahce, 2016 confirms
  { n: 'Jose Cholevas', to: 'Watford' },          // 2016 row Watford FC
  { n: 'Víctor Ibarbo', to: 'Watford' },          // loan, 2016 row Watford FC
  // Napoli's window, both directions.
  { n: 'Elseid Hysaj', to: 'Napoli' },            // Empoli -> Napoli, 2016 confirms
  { n: 'Allan', to: 'Napoli' },                   // Udinese -> Napoli, 2016 confirms
  { n: 'Mirko Valdifiori', to: 'Napoli' },        // Empoli -> Napoli, 2016 confirms
  { n: 'Gökhan Inler', to: 'Leicester City' },    // the champions bought him, 2016 confirms
  { n: 'Miguel Britos', to: 'Watford' },          // 2016 row Watford FC
  { n: 'Duván Zapata', to: 'Udinese' },           // loan, 2016 row Udinese Calcio
  { n: 'Jonathan de Guzmán', to: 'Carpi' },       // loan, 2016 row AC Carpi
  { n: 'Walter Gargano', to: null },              // -> Monterrey, 2016 confirms
  { n: 'Mariano Andújar', to: null },             // -> Estudiantes, 2016 confirms
  { n: 'Henrique', to: null },                    // -> Fluminense, 2016 confirms
  { n: 'Giandomenico Mesto', to: null },          // -> Panathinaikos, 2016 confirms
  // Fiorentina's clear-out beyond the above.
  { n: 'Stefan Savic', to: 'Atlético Madrid' },   // the Vietto counterweight, 2016 confirms
  { n: 'Mario Gómez', to: null },                 // -> Besiktas, 2016 confirms
  { n: 'Joaquín', to: 'Real Betis' },             // 2016 row Real Betis Balompie
  { n: 'Juan Manuel Vargas', to: 'Real Betis' },  // 2016 row Real Betis Balompie
  { n: 'Micah Richards', to: 'Aston Villa' },     // loan end, 2016 confirms
  { n: 'José María Basanta', to: null },          // -> Monterrey, 2016 confirms
  { n: 'Matías Vecino', to: 'Fiorentina' },       // Empoli row -> Fiorentina, 2016 confirms
  // The rest of the league's window.
  { n: 'Matteo Darmian', to: 'Manchester United' }, // Torino -> United, 2016 confirms
  { n: 'Andrea Belotti', to: 'Torino' },          // Palermo -> Torino, 2016 confirms
  { n: 'Alessandro Matri', to: 'Lazio' },         // Genoa row -> Lazio, 2016 confirms
  { n: 'Jasmin Kurtic', to: 'Atalanta' },         // Fiorentina row -> Atalanta, 2016 confirms
  { n: 'Yohan Benalouane', to: 'Leicester City' },// Atalanta -> the champions, 2016 confirms
  { n: 'Pedro Obiang', to: 'West Ham' },          // Sampdoria -> West Ham, 2016 confirms
  { n: 'Sergio Romero', to: 'Manchester United' },// Sampdoria -> United, 2016 confirms
  { n: 'Stefano Okaka', to: null },               // -> Anderlecht, 2016 confirms
  { n: "Samuel Eto'o", to: null },                // -> Antalyaspor; single-source, see header
  { n: 'Maxime Lestienne', to: null },            // -> PSV, 2016 confirms
  { n: 'Lucas Evangelista', to: null },           // -> Panathinaikos, 2016 confirms
];

/* Fernando Llorente and Adil Rami both moved to SEVILLA, which is in this
 * world. They are moves, not removals; the entries above that said null
 * are overridden here so the intent reads clearly in one place. */
for (const m of SA_EXTEND_MOVES) {
  if (m.n === 'Fernando Llorente') m.to = 'Sevilla';
  if (m.n === 'Adil Rami') m.to = 'Sevilla';
}

/* Arrivals into the Serie A from outside the three-league world, each with
 * its own year-2015 row data, destinations verified via year-2016 rows. */
const SA_ARRIVALS = [
  /* Five of these are RE-ADDITIONS: Round 175 removed them from the
     two-league world as "left for clubs outside it", and the club they
     left FOR is Serie A, which exists now. Their year-2015 rows are
     restored verbatim from the table (queried 2026-08-20), destinations
     verified via year-2016 rows like every other correction. */
  { n: 'Mario Mandžukić', to: 'Juventus', position: 'Centre-Forward', age: 28, usd: 28000000 },
  { n: 'Sami Khedira', to: 'Juventus', position: 'Central Midfield', age: 27, usd: 27000000 },
  { n: 'Carlos Bacca', to: 'AC Milan', position: 'Centre-Forward', age: 28, usd: 27000000 },
  { n: 'Mario Balotelli', to: 'AC Milan', position: 'Centre-Forward', age: 24, usd: 16000000 },
  { n: 'Jeison Murillo', to: 'Inter Milan', position: 'Centre-Back', age: 22, usd: 11000000 },
  { n: 'Alex Sandro', to: 'Juventus', position: 'Left-Back', age: 23, usd: 26000000 },
  { n: 'Geoffrey Kondogbia', to: 'Inter Milan', position: 'Defensive Midfield', age: 21, usd: 26000000 },
  { n: 'Ivan Perišić', to: 'Inter Milan', position: 'Left Winger', age: 25, usd: 17000000 },
  { n: 'Nikola Kalinić', to: 'Fiorentina', position: 'Centre-Forward', age: 26, usd: 11000000 },
  { n: 'Pepe Reina', to: 'Napoli', position: 'Goalkeeper', age: 32, usd: 4000000 },
];

/* ================= Round 899: THE BIG FIVE EXTENSION ================= */
/* The era grows from three leagues to five IN PLACE, by the Round 191 move
   made twice, through the shared step scripts/lib/eraBakeExtend.mjs (read
   its header: the shipped 60 club file is the truth for the three leagues
   it holds, its lines carried through as bytes; the 2015-16 Bundesliga and
   Ligue 1 come from an OFFLINE pull of the base table; every correction is
   declared below and proved twice). Run:

     node scripts/bakeEra2015.mjs --extend-big-five

   THE DATA, OFFLINE. Production is off limits to a bake, so the lead pulled
   the base table player_market_values once into two files (defaults below,
   --pull= and --next= override): every row of years 2005, 2010 and 2015,
   and every row of 2006, 2011 and 2016. The documented query shape (base
   table, year = 2015 exact, DISTINCT ON (player_name) ... ORDER BY
   player_name, market_value_usd DESC, no fallback year) is reproduced from
   the first file: filter the year and the league's club spellings, keep one
   row per player_name with the highest value, and break a tie on the lowest
   id so the bake is deterministic. The second file is used ONLY as the
   second proof of a summer move: the club the following year's row names.

   RUNNING IT AGAIN. The step refuses a file that already holds a new
   league's club. To regenerate, hand it the 60 club file it grew from:
     git show 89d31144:src/data/clubManagerEra2015.ts > base.ts
     node scripts/bakeEra2015.mjs --extend-big-five --base=base.ts

   THE RESERVE SIDE SPELLINGS. Six clubs' second teams hold one year-2015
   row each ("VfB Stuttgart II", "Hamburger SV II", "Borussia Dortmund II",
   "Hannover 96 II", "FC Bayern Munich II", "VfL Wolfsburg II"). Unlike the
   two U21 keepers of Round 175, none of the six is a first team regular of
   2015-16, so those spellings stay out of the maps and those rows stay out
   of the world. */

/* Table spelling -> engine name. Membership of the 2015-16 Bundesliga, two
 * sources read 2026-10-02 that agree on all eighteen: RSSSF's season record
 * (https://www.rsssf.org/tablesd/duit2016.html) and ESPN's final standings
 * (https://www.espn.com/soccer/standings/_/league/GER.1/season/2015). Every
 * spelling was checked against the pull (the step fails on a spelling with
 * no rows). Names reuse the 2026 world's spelling wherever the club exists
 * there (Gladbach, Köln, Hamburg, Mainz, Hertha BSC, Hannover 96,
 * Darmstadt, Wolfsburg), so colours and rivalries carry over; Ingolstadt is
 * the one club with no 2026 name. */
const DB_TO_ERA_BL = {
  'Bayern Munich': 'Bayern Munich', 'Borussia Dortmund': 'Borussia Dortmund',
  'Bayer 04 Leverkusen': 'Bayer Leverkusen', 'Borussia Mönchengladbach': 'Gladbach',
  'FC Schalke 04': 'Schalke 04', '1.FSV Mainz 05': 'Mainz', 'Hertha BSC': 'Hertha BSC',
  'VfL Wolfsburg': 'Wolfsburg', '1.FC Köln': 'Köln', 'Hamburger SV': 'Hamburg',
  'FC Ingolstadt 04': 'Ingolstadt', 'FC Augsburg': 'Augsburg',
  'SV Werder Bremen': 'Werder Bremen', 'SV Darmstadt 98': 'Darmstadt',
  'TSG 1899 Hoffenheim': 'Hoffenheim', 'Eintracht Frankfurt': 'Eintracht Frankfurt',
  'VfB Stuttgart': 'Stuttgart', 'Hannover 96': 'Hannover 96',
};
/* The 2015-16 Ligue 1, the same two publishers, read the same day, agreeing
 * on all twenty: RSSSF (https://www.rsssf.org/tablesf/fran2016.html) and
 * ESPN (https://www.espn.com/soccer/standings/_/league/FRA.1/season/2015). */
const DB_TO_ERA_L1 = {
  'Paris Saint-Germain': 'PSG', 'Olympique Lyon': 'Lyon', 'AS Monaco': 'Monaco',
  'OGC Nice': 'Nice', 'LOSC Lille': 'Lille', 'AS Saint-Étienne': 'Saint-Étienne',
  'SM Caen': 'Caen', 'Stade Rennais FC': 'Rennes', 'Angers SCO': 'Angers',
  'SC Bastia': 'Bastia', 'FC Girondins Bordeaux': 'Bordeaux',
  'Montpellier HSC': 'Montpellier', 'Olympique Marseille': 'Marseille',
  'FC Nantes': 'Nantes', 'FC Lorient': 'Lorient', 'EA Guingamp': 'Guingamp',
  'FC Toulouse': 'Toulouse', 'Stade Reims': 'Reims', 'GFC Ajaccio': 'GFC Ajaccio',
  'ESTAC Troyes': 'Troyes',
};

/* THE SUMMER 2015 WINDOW, FIVE LEAGUES WIDE. Year-2015 rows predate that
 * summer's window, so the two new leagues need the same correction the first
 * three got, and the first three need a re-audit because the world grew.
 * Every correction below is proved twice: a published record of the transfer
 * AND the table's own year-2016 row, which the shared step CHECKS in code
 * (a move or an arrival dies unless a year-2016 row names the destination; a
 * removal dies if a year-2016 row still sits inside the world). Values stay
 * the year-2015 snapshot for every player, moved or not.
 *
 * The published records, all read 2026-10-02, cited below by these keys:
 *   WS-EN, WS-FR, WS-DE, WS-IT, WS-ES  World Soccer, "Summer 2015 transfers,
 *        August 11 update", club by club ins and outs, one page per league:
 *        https://worldsoccer.com/features/summer-2015-transfers-august-4-update-363811
 *        (England), /2 (France), /3 (Germany), /4 (Italy), /5 (Spain).
 *   MF   Maxifoot, "Tableaux transfert mercato Ete 2015", the whole French
 *        window: https://www.maxifoot.fr/mercato/index-ete-2015.php
 *   and for the late August deals the World Soccer list predates, the report
 *   named on the line (ESPN, Goal, Sports Illustrated, the club's own site).
 *
 * WHAT COUNTS AS GLARING. Every mover valued at 4.5m pounds or more in the
 * year-2015 snapshot was looked at, plus every smaller move the two lists
 * above already prove. Smaller moves with no published record at hand stay
 * where the snapshot has them: thin evidence is not a reason to move a man. */

/* THE FOLDS: thirteen men Rounds 175 and 191 brought INTO the first three
 * leagues as arrivals from Germany or France. Their year-2015 rows now
 * surface in the new leagues' pulls at the clubs they left; the shipped line
 * stays, the row is dropped, one man, one club. The step proves each fold is
 * one row (same position, age and value on both sides). */
const B5_FOLDS = [
  { n: 'Kevin De Bruyne', why: 'Wolfsburg to Manchester City, Round 175 arrival' },
  { n: 'Heung-min Son', why: 'Leverkusen to Tottenham, Round 175 arrival' },
  { n: 'Bastian Schweinsteiger', why: 'Bayern to Manchester United, Round 175 arrival (WS-DE, WS-EN)' },
  { n: 'Roberto Firmino', why: 'Hoffenheim to Liverpool, Round 175 arrival (WS-DE, WS-EN)' },
  { n: 'Shinji Okazaki', why: 'Mainz to Leicester, Round 175 arrival (WS-DE, WS-EN)' },
  { n: 'Dimitri Payet', why: 'Marseille to West Ham, Round 175 arrival (WS-FR, WS-EN)' },
  { n: 'Yohan Cabaye', why: 'PSG to Crystal Palace, Round 175 arrival (WS-FR)' },
  { n: 'Anthony Martial', why: 'Monaco to Manchester United, Round 175 arrival' },
  { n: 'André Ayew', why: 'Marseille to Swansea, Round 175 arrival (WS-FR)' },
  { n: "N'Golo Kanté", why: 'Caen to Leicester, Round 175 arrival (WS-FR)' },
  { n: 'Ivan Perišić', why: 'Wolfsburg to Inter, Round 191 arrival' },
  { n: 'Geoffrey Kondogbia', why: 'Monaco to Inter, Round 191 arrival (WS-FR)' },
  { n: 'Pepe Reina', why: 'Bayern to Napoli, Round 191 arrival (WS-DE, WS-IT)' },
];

/* THE NAMESAKES: four strings worn by two real men each, one in a new
 * league and one in the shipped world. The table itself carries both men in
 * both years (two year-2015 rows and two year-2016 rows, different clubs,
 * different ages), and each pair's birth years are in the harness beside the
 * allowlist that names them (scripts/simEra2015.mjs). The engine keys
 * players by name, so the standing rule decides: the higher value stays. */
const B5_NAMESAKES = [
  { n: 'Naldo', why: 'the Wolfsburg centre-back (32) and the Getafe centre-back (26)' },
  { n: 'Marcelo', why: 'the Hannover centre-back (27) and the Real Madrid left-back (26)' },
  { n: 'Rafinha', why: 'the Bayern right-back (29) and the Barcelona midfielder (21)' },
  { n: 'Adama Traoré', why: 'the Lille midfielder from Mali (19) and the Barcelona winger Round 175 moved to Aston Villa (18)' },
];
/* MOVES INSIDE THE FIVE LEAGUE WORLD. `why` is the first proof; the second,
 * the year-2016 row at the destination, is checked by the step. */
const B5_MOVES = [
  // Germany to Germany.
  { n: 'Julian Draxler', to: 'Wolfsburg', why: 'Schalke to Wolfsburg, 31 Aug 2015 (Goal.com Germany, Deadline Day: Die Transfers der Bundesliga im Ueberblick)' },
  { n: 'Dante', to: 'Wolfsburg', why: 'Bayern to Wolfsburg, 30 Aug 2015 (Goal.com Germany, the same deadline day list)' },
  { n: 'Max Kruse', to: 'Wolfsburg', why: 'Gladbach to Wolfsburg (WS-DE)' },
  { n: 'Gonzalo Castro', to: 'Borussia Dortmund', why: 'Leverkusen to Dortmund (WS-DE)' },
  { n: 'Kevin Kampl', to: 'Bayer Leverkusen', why: 'Dortmund to Leverkusen, 28 Aug 2015 (ESPN, Bayer Leverkusen sign Borussia Dortmund Kevin Kampl; bvb.de, Kevin Kampl wechselt zu Bayer Leverkusen)' },
  { n: 'Christoph Kramer', to: 'Bayer Leverkusen', why: 'back to Leverkusen as his Gladbach loan ended (Goal.com Germany list; the year-2015 row is his loan club)' },
  { n: 'Josip Drmic', to: 'Gladbach', why: 'Leverkusen to Gladbach (WS-DE)' },
  { n: 'Lars Stindl', to: 'Gladbach', why: 'Hannover to Gladbach (WS-DE)' },
  { n: 'Johannes Geis', to: 'Schalke 04', why: 'Mainz to Schalke (WS-DE)' },
  { n: 'Franco Di Santo', to: 'Schalke 04', why: 'Bremen to Schalke (WS-DE)' },
  { n: 'Pierre-Emile Højbjerg', to: 'Schalke 04', why: 'Bayern loaned him to Schalke, 28 Aug 2015 (Goal.com, Schalke loan Pierre-Emile Hojbjerg from Bayern Munich; ESPN); the year-2015 row is his earlier loan club Augsburg' },
  { n: 'Stefan Reinartz', to: 'Eintracht Frankfurt', why: 'Leverkusen to Frankfurt (WS-DE)' },
  { n: 'David Abraham', to: 'Eintracht Frankfurt', why: 'Hoffenheim to Frankfurt (WS-DE)' },
  { n: 'Sven Ulreich', to: 'Bayern Munich', why: 'Stuttgart to Bayern (WS-DE)' },
  { n: 'Mitchell Weiser', to: 'Hertha BSC', why: 'Bayern to Hertha (WS-DE)' },
  { n: 'Mitchell Langerak', to: 'Stuttgart', why: 'Dortmund to Stuttgart (WS-DE)' },
  { n: 'Milos Jojic', to: 'Köln', why: 'Dortmund to Koln (WS-DE)' },
  { n: 'Leonardo Bittencourt', to: 'Köln', why: 'Hannover to Koln (WS-DE)' },
  { n: 'Anthony Modeste', to: 'Köln', why: 'Hoffenheim to Koln (WS-DE)' },
  { n: 'Anthony Ujah', to: 'Werder Bremen', why: 'Koln to Bremen (WS-DE)' },
  { n: 'Gotoku Sakai', to: 'Hamburg', why: 'Stuttgart to Hamburg (WS-DE)' },
  { n: 'Aaron Hunt', to: 'Hamburg', why: 'Wolfsburg to Hamburg, 31 Aug 2015 (Goal.com Germany, the same deadline day list)' },
  // Germany to England, Italy, Spain and France.
  { n: 'Abdul Rahman Baba', to: 'Chelsea', why: 'Augsburg to Chelsea, Aug 2015 (Fox Sports, Chelsea complete transfer move for Augsburg\'s Baba Rahman)' },
  { n: 'Kevin Wimmer', to: 'Tottenham', why: 'Koln to Tottenham (WS-DE)' },
  { n: 'Joselu', to: 'Stoke City', why: 'Hannover to Stoke (WS-DE, WS-EN)' },
  { n: 'Valon Behrami', to: 'Watford', why: 'Hamburg to Watford (WS-DE, WS-EN)' },
  { n: 'Sebastian Prödl', to: 'Watford', why: 'Bremen to Watford (WS-DE, WS-EN)' },
  { n: 'Jakub Błaszczykowski', to: 'Fiorentina', why: 'Dortmund loaned him to Fiorentina, 31 Aug 2015 (ESPN, Jakub Blaszczykowski joins Fiorentina on loan from Dortmund; FourFourTwo)' },
  { n: 'Antonio Rüdiger', to: 'Roma', why: 'Stuttgart loaned him to Roma, Aug 2015 (ESPN, Antonio Rudiger completes Roma loan move from Stuttgart)' },
  { n: 'Rafael van der Vaart', to: 'Real Betis', why: 'Hamburg to Betis, free (WS-DE, WS-ES)' },
  { n: 'Kevin Trapp', to: 'PSG', why: 'Frankfurt to PSG (WS-DE, WS-FR)' },
  { n: 'Jimmy Briand', to: 'Guingamp', why: 'Hannover to Guingamp (WS-DE, WS-FR)' },
  // France to France.
  { n: 'Layvin Kurzawa', to: 'PSG', why: 'Monaco to PSG, 27 Aug 2015 (MF; ESPN, Layvin Kurzawa from Monaco to PSG)' },
  { n: 'Lucas Ocampos', to: 'Marseille', why: 'Monaco to Marseille (WS-FR)' },
  { n: 'Thomas Lemar', to: 'Monaco', why: 'Caen to Monaco (WS-FR)' },
  { n: 'Adama Traoré', to: 'Monaco', why: 'the Lille midfielder, Lille to Monaco (WS-FR); the year-2016 table holds a Monaco row under this name' },
  { n: 'Farès Bahlouli', to: 'Monaco', why: 'Lyon to Monaco (WS-FR)' },
  { n: 'Valère Germain', to: 'Nice', why: 'Monaco loaned him to Nice (WS-FR)' },
  { n: 'Eric Bauthéac', to: 'Lille', why: 'Nice to Lille (WS-FR)' },
  { n: 'Nolan Roux', to: 'Saint-Étienne', why: 'Lille to Saint-Etienne (WS-FR)' },
  { n: 'Yoann Gourcuff', to: 'Rennes', why: 'left Lyon that summer (WS-FR) and signed for Rennes' },
  { n: 'Ryad Boudebouz', to: 'Montpellier', why: 'Bastia to Montpellier (WS-FR)' },
  // France to England, Spain and Italy.
  { n: 'Florian Thauvin', to: 'Newcastle', why: 'Marseille to Newcastle, Aug 2015 (MF)' },
  { n: "Clinton N'Jie", to: 'Tottenham', why: 'Lyon to Tottenham, Aug 2015 (MF)' },
  { n: 'Jordan Amavi', to: 'Aston Villa', why: 'Nice to Aston Villa (WS-FR)' },
  { n: 'Idrissa Gueye', to: 'Aston Villa', why: 'Lille to Aston Villa (WS-FR, WS-EN)' },
  { n: 'Jordan Ayew', to: 'Aston Villa', why: 'Lorient to Aston Villa (WS-FR, WS-EN)' },
  { n: 'Jordan Veretout', to: 'Aston Villa', why: 'Nantes to Aston Villa (WS-FR, WS-EN)' },
  { n: 'Max Gradel', to: 'Bournemouth', why: 'Saint-Etienne to Bournemouth (WS-FR, WS-EN)' },
  { n: 'Ola Toivonen', to: 'Sunderland', why: 'Rennes loaned him to Sunderland, Aug 2015 (MF)' },
  { n: 'Yannick Carrasco', to: 'Atlético Madrid', why: 'Monaco to Atletico (WS-FR)' },
  { n: 'Aymen Abdennour', to: 'Valencia', why: 'Monaco to Valencia, Aug 2015 (MF)' },
  { n: 'Alphonse Areola', to: 'Villarreal', why: 'PSG loaned him to Villarreal (WS-FR); the year-2015 row is his earlier loan club Bastia' },
  { n: 'Mariano', to: 'Sevilla', why: 'Bordeaux to Sevilla (WS-FR, WS-ES)' },
  { n: 'Didier Digard', to: 'Real Betis', why: 'Nice to Betis, free (WS-FR, WS-ES)' },
  { n: 'Lucas Digne', to: 'Roma', why: 'PSG loaned him to Roma, Aug 2015 (MF)' },
  // The first three leagues to France and Germany: shipped lines that move.
  { n: 'Rafael', to: 'Lyon', why: 'Manchester United to Lyon (WS-FR)' },
  { n: 'Benjamin Stambouli', to: 'PSG', why: 'Tottenham to PSG (WS-FR, WS-EN)' },
  { n: 'Javier Manquillo', to: 'Marseille', why: 'Atletico loaned him to Marseille (WS-FR); the shipped line sat at his 2014-15 loan club Liverpool' },
  { n: 'Lucas Silva', to: 'Marseille', why: 'Real Madrid loaned him to Marseille, Aug 2015 (MF)' },
  { n: 'Rémy Cabella', to: 'Marseille', why: 'Newcastle loaned him to Marseille, Aug 2015 (MF)' },
  { n: 'Emiliano Insúa', to: 'Stuttgart', why: 'Atletico to Stuttgart (WS-DE); the shipped line sat at his 2014-15 loan club Rayo Vallecano' },
  { n: 'Frederik Sørensen', to: 'Köln', why: 'Juventus to Koln (WS-DE); the shipped line sat at his 2014-15 loan club Hellas Verona' },
];
/* OUT OF THE WORLD. A removal, unlike a placement, cannot invent anything
 * (the Round 191 asymmetry), so it is also the honest answer for a man who
 * certainly left his year-2015 club but whose season start club the table's
 * year-2016 row cannot prove. `single`: no year-2016 row exists at all.
 * `later`: the year-2016 row names a club of this world that he only reached
 * in January 2016, so it cannot place him in August 2015. */
const B5_REMOVALS = [
  { n: 'Jefferson Farfán', why: 'Schalke to Al Jazira (WS-DE)' },
  { n: 'Tranquillo Barnetta', why: 'Schalke to Philadelphia Union (WS-DE)' },
  { n: 'André-Pierre Gignac', why: 'Marseille to Tigres (WS-FR)' },
  { n: 'Simon Kjaer', why: 'left Lille that summer (WS-FR), for Fenerbahce by his year-2016 row' },
  { n: 'Christian Fuchs', why: 'Schalke to Leicester, free (WS-DE, WS-EN)', single: 'the table has no year-2016 row for him (Round 175 found the same), so he cannot be PLACED at Leicester on one proof; but Schalke are in the world now and leaving the champions\' left-back there would be false' },
  { n: 'Dimitar Berbatov', why: 'released by Monaco (WS-FR)', single: 'no year-2016 row; he left the five leagues' },
  { n: 'Rod Fanni', why: 'left Marseille (WS-FR)', single: 'no year-2016 row; he left the five leagues' },
  { n: 'Giannelli Imbula', why: 'Marseille to Porto (WS-FR, MF)', later: 'the year-2016 row is Stoke City, where Porto sold him in January 2016' },
  { n: 'Ciro Immobile', why: 'Dortmund loaned him to Sevilla (WS-DE, WS-ES)', later: 'the year-2016 row is Torino, his January 2016 loan, so Sevilla cannot be proved from the table and he is taken out rather than placed on one proof' },
  { n: 'Claudio Beauvue', why: 'Guingamp to Lyon (WS-FR, MF)', later: 'the year-2016 row is Celta Vigo, who bought him in January 2016, so Lyon cannot be proved from the table' },
  { n: 'Mevlüt Erdinç', why: 'Saint-Etienne to Hannover (WS-DE, MF)', later: 'the year-2016 row is Guingamp, his January 2016 loan, so Hannover cannot be proved from the table' },
  { n: 'Papy Djilobodji', why: 'Nantes to Chelsea, 1 Sep 2015 (MF)', later: 'the year-2016 row is Werder Bremen, his January 2016 loan, so Chelsea cannot be proved from the table' },
  { n: 'Stephan El Shaarawy', why: 'a shipped AC Milan line: Milan loaned him to Monaco that summer (WS-FR, MF)', later: 'the year-2016 row is Roma, his January 2016 loan, so Monaco cannot be proved from the table; Round 191 left him at Milan because Monaco was outside its world' },
];

/* ARRIVALS: a year-2015 row at a club outside the two new leagues' pulls,
 * read from the pull by name and table club (never typed), placed at the
 * club both proofs name. THE RE-AUDIT: eight of these are men Rounds 175
 * and 191 REMOVED from the first three leagues because they left for a
 * German or French club that was outside the world then and is inside it
 * now (Di Maria, Vidal, Coman, Chicharito, Coentrao, Cavaleiro, Darder,
 * Yanga-Mbiwa). The other removals of those rounds went to leagues this
 * world still does not hold and stay out. */
const B5_ARRIVALS = [
  // The re-audit: removed by Rounds 175 and 191, home now.
  { n: 'Ángel Di María', from: 'Manchester United', to: 'PSG', why: 'Manchester United to PSG (WS-FR, WS-EN); Round 175 removal' },
  { n: 'Arturo Vidal', from: 'Juventus FC', to: 'Bayern Munich', why: 'Juventus to Bayern (WS-DE); Round 191 removal' },
  { n: 'Kingsley Coman', from: 'Juventus FC', to: 'Bayern Munich', why: 'Juventus loaned him to Bayern, 30 Aug 2015 (Goal.com Germany, the deadline day list); Round 191 removal' },
  { n: 'Chicharito', from: 'Real Madrid', to: 'Bayer Leverkusen', why: 'Manchester United to Leverkusen, 31 Aug 2015 (Goal.com Germany, the deadline day list); Round 175 removal, the year-2015 row is his loan club' },
  { n: 'Fábio Coentrão', from: 'Real Madrid', to: 'Monaco', why: 'Real Madrid loaned him to Monaco, Aug 2015 (MF); Round 175 removal' },
  { n: 'Ivan Cavaleiro', from: 'Deportivo de La Coruña', to: 'Monaco', why: 'Benfica to Monaco (WS-FR); Round 175 removal, the year-2015 row is his loan club' },
  { n: 'Sergi Darder', from: 'Málaga CF', to: 'Lyon', why: 'Malaga to Lyon, Aug 2015 (MF); Round 175 removal' },
  { n: 'Mapou Yanga-Mbiwa', from: 'AS Roma', to: 'Lyon', why: 'Roma to Lyon, Aug 2015 (MF); Round 191 removal' },
  // New to the five leagues.
  { n: 'Douglas Costa', from: 'Shakhtar Donetsk', to: 'Bayern Munich', why: 'Shakhtar to Bayern (WS-DE)' },
  { n: 'Joshua Kimmich', from: 'RB Leipzig', to: 'Bayern Munich', why: 'Stuttgart, via his Leipzig loan, to Bayern (WS-DE)' },
  { n: 'Julian Weigl', from: 'TSV 1860 Munich', to: 'Borussia Dortmund', why: '1860 Munich to Dortmund (WS-DE)' },
  { n: 'Roman Bürki', from: 'SC Freiburg', to: 'Borussia Dortmund', why: 'Freiburg to Dortmund (WS-DE)' },
  { n: 'Jonathan Tah', from: 'Fortuna Düsseldorf', to: 'Bayer Leverkusen', why: 'Hamburg to Leverkusen (WS-DE); the year-2015 row is his loan club' },
  { n: 'Admir Mehmedi', from: 'SC Freiburg', to: 'Bayer Leverkusen', why: 'Freiburg to Leverkusen (WS-DE)' },
  { n: 'Charles Aránguiz', from: 'Sport Club Internacional', to: 'Bayer Leverkusen', why: 'Internacional to Leverkusen, 13 Aug 2015 (Sports Illustrated, Bayer Leverkusen signs Chile\'s Charles Aranguiz; ESPN)' },
  { n: 'Nico Elvedi', from: 'FC Zürich', to: 'Gladbach', why: 'Zurich to Gladbach (WS-DE)' },
  { n: 'Júnior Caiçara', from: 'Ludogorets Razgrad', to: 'Schalke 04', why: 'Ludogorets to Schalke (WS-DE)' },
  { n: 'Fabian Schär', from: 'FC Basel 1893', to: 'Hoffenheim', why: 'Basel to Hoffenheim (WS-DE)' },
  { n: 'Pavel Kaderabek', from: 'AC Sparta Prague', to: 'Hoffenheim', why: 'Sparta Prague to Hoffenheim (WS-DE)' },
  { n: 'Jonathan Schmid', from: 'SC Freiburg', to: 'Hoffenheim', why: 'Freiburg to Hoffenheim (WS-DE)' },
  { n: 'Eduardo Vargas', from: 'Queens Park Rangers', to: 'Hoffenheim', why: 'Napoli to Hoffenheim, Aug 2015 (ESPN, Hoffenheim sign Chile forward Eduardo Vargas from Napoli; tsg-hoffenheim.de); the year-2015 row is his loan club' },
  { n: 'Oliver Sorg', from: 'SC Freiburg', to: 'Hannover 96', why: 'Freiburg to Hannover (WS-DE)' },
  { n: 'Luc Castaignos', from: 'FC Twente Enschede', to: 'Eintracht Frankfurt', why: 'Twente to Frankfurt (WS-DE)' },
  { n: 'Albin Ekdal', from: 'Cagliari Calcio', to: 'Hamburg', why: 'Cagliari to Hamburg (WS-DE)' },
  { n: 'Aron Jóhannsson', from: 'AZ Alkmaar', to: 'Werder Bremen', why: 'AZ to Bremen (WS-DE)' },
  { n: 'Mathieu Valbuena', from: 'Dynamo Moscow', to: 'Lyon', why: 'Dynamo Moscow to Lyon (WS-FR)' },
  { n: 'Guido Carrillo', from: 'Club Estudiantes de La Plata', to: 'Monaco', why: 'Estudiantes to Monaco (WS-FR)' },
  { n: 'Mario Pašalić', from: 'Elche CF', to: 'Monaco', why: 'Chelsea loaned him to Monaco (WS-FR); the year-2015 row is his earlier loan club' },
  { n: 'Karim Rekik', from: 'PSV Eindhoven', to: 'Marseille', why: 'Manchester City to Marseille (WS-FR); the year-2015 row is his loan club' },
  { n: 'Rolando', from: 'RSC Anderlecht', to: 'Marseille', why: 'Porto to Marseille, 31 Aug 2015 (MF); the year-2015 row is his loan club' },
  { n: 'Juan Fernando Quintero', from: 'FC Porto', to: 'Rennes', why: 'Porto loaned him to Rennes, Aug 2015 (MF)' },
  { n: 'Robert Beric', from: 'Rapid Vienna', to: 'Saint-Étienne', why: 'Rapid Vienna to Saint-Etienne, 31 Aug 2015 (MF)' },
  { n: 'Kolbeinn Sigthórsson', from: 'Ajax Amsterdam', to: 'Nantes', why: 'Ajax to Nantes (WS-FR)' },
  { n: 'Majeed Waris', from: 'Trabzonspor', to: 'Lorient', why: 'Trabzonspor to Lorient (WS-FR)' },
  { n: 'Baptiste Guillaume', from: 'RC Lens', to: 'Lille', why: 'Lens to Lille (WS-FR)' },
];
/* BIG_FIVE_CORRECTIONS_END */

if (bigFiveArg) {
  const argOf = (flag, dflt) => {
    const a = process.argv.find(x => x.startsWith(`${flag}=`));
    return a ? a.slice(a.indexOf('=') + 1) : dflt;
  };
  const file = path.join(ROOT, 'src/data/clubManagerEra2015.ts');
  const res = runExtend({
    file: argOf('--base', file), outFile: file, prefix: 'ERA2015', year: 2015,
    rows: readPull(argOf('--pull', 'C:/Users/antho/dukb-handoff/data/market-base-2005-2010-2015.json')),
    nextRows: readPull(argOf('--next', 'C:/Users/antho/dukb-handoff/data/market-base-2006-2011-2016.json')),
    newLeagues: [
      { label: 'Bundesliga', dbToEra: DB_TO_ERA_BL },
      { label: 'Ligue 1', dbToEra: DB_TO_ERA_L1 },
    ],
    worldDbToEra: { ...DB_TO_ERA_PL, ...DB_TO_ERA_LL, ...DB_TO_ERA_SA, ...DB_TO_ERA_BL, ...DB_TO_ERA_L1 },
    folds: B5_FOLDS, moves: B5_MOVES, removals: B5_REMOVALS, arrivals: B5_ARRIVALS, namesakes: B5_NAMESAKES,
    /* A 2015-16 Bundesliga and Ligue 1 without their own headlines are not
       those leagues, and the re-audit has to have landed. */
    anchors: [
      ['Bayern Munich', 'Robert Lewandowski'], ['Bayern Munich', 'Thomas Müller'], ['Bayern Munich', 'Manuel Neuer'],
      ['Bayern Munich', 'Arturo Vidal'], ['Bayern Munich', 'Douglas Costa'],
      ['Borussia Dortmund', 'Marco Reus'], ['Borussia Dortmund', 'Pierre-Emerick Aubameyang'],
      ['Wolfsburg', 'Julian Draxler'], ['Bayer Leverkusen', 'Chicharito'],
      ['PSG', 'Zlatan Ibrahimović'], ['PSG', 'Ángel Di María'], ['PSG', 'Thiago Silva'],
      ['Lyon', 'Alexandre Lacazette'],
      ['Manchester City', 'Kevin De Bruyne'], ['Leicester City', "N'Golo Kanté"], ['Leicester City', 'Jamie Vardy'],
      ['Barcelona', 'Lionel Messi'], ['Juventus', 'Paulo Dybala'],
    ],
    /* Thin only where the table itself is thin (under 8 real rows after
       the corrections). Re-measured 2026-10-02: Ingolstadt 7 and Darmstadt 7
       (both promoted that summer), Angers 5 and GFC Ajaccio 2 (likewise). */
    expectedThin: ['Las Palmas', 'Frosinone', 'Angers', 'GFC Ajaccio', 'Ingolstadt', 'Darmstadt'],
    header: s => [
      '// AUTO-GENERATED by scripts/bakeEra2015.mjs (Round 175, extended Rounds 191 and 899).',
      '// The 2015-16 era world: real year-2015 Transfermarkt rows from',
      `// player_market_values for all ${s.clubs} clubs of the 2015-16 Premier League,`,
      '// La Liga, Serie A, Bundesliga and Ligue 1. The Serie A joined in Round 191',
      '// and the Bundesliga and Ligue 1 in Round 899, both through the extend step',
      '// (scripts/lib/eraBakeExtend.mjs; the new leagues from an offline pull of',
      '// the base table, the lines already shipped carried through as bytes).',
      '// Memberships and sources are in the script header. The verified summer',
      `// 2015 window corrections are applied across all five leagues (${s.moves} rows`,
      '// moved, removed, arrived or folded in total). Values in £m at the',
      '// year-2015 snapshot, ratings 48-94 on the same curve as the 2026 bake.',
      '// Regenerate per the header of scripts/bakeEra2015.mjs.',
      '// DO NOT EDIT BY HAND.',
    ],
  }, { write: !process.argv.includes('--dry') });
  const s = res.stats;
  console.log(`Extended to ${s.players} players across ${s.clubs} clubs (${s.partial.length} partial: ${s.partial.join(', ')}).`);
  console.log(`Big five corrections: ${s.moved} moved, ${s.removed} removed, ${s.arrived} arrived, ${s.folded} folded, ${s.collisions} namesakes resolved.`);
  console.log(`Shipped lines: ${s.shippedLines}, of which ${s.shippedKept} are still in the world byte for byte. Touched:`);
  for (const t of s.touched) console.log(`  ${t}`);
  console.log(`New club sizes: ${Object.entries(s.sizes).map(([c, n]) => `${c} ${n}`).join(', ')}`);
  /* The market's nationality filter reads one map per world, and it must hold
     exactly this world's names: each new line takes the nationality on the
     row it was baked from, and a man who left the world leaves the map. */
  if (!process.argv.includes('--dry')) {
    const n = updateNationalityBlock(path.join(ROOT, 'src/data/playerNationalities.ts'), 'era2015', res);
    console.log(`Nationalities, era2015 block: ${n.added} added, ${n.changed} re-pointed, ${n.dropped} dropped, ${n.total} entries for ${s.players} players.`);
  }
  process.exit(0);
}

/* Same curves as bakeClubManagerRosters.mjs, verbatim, so a 2015 value and a
 * 2026 value mean the same thing on the rating scale. */
const POS_MAP = {
  'Goalkeeper': 'GK', 'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB',
  'Defensive Midfield': 'CDM', 'Central Midfield': 'CM', 'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM', 'Right Midfield': 'RM', 'Left Winger': 'LW', 'Right Winger': 'RW',
  'Centre-Forward': 'ST', 'Second Striker': 'CF',
};
function ratingOf(usd) {
  if (!usd || usd <= 0) return 48;
  const r = Math.round(-13.106 + 12.851 * Math.log10(usd));
  return Math.max(48, Math.min(94, r));
}
function gbpM(usd) {
  const m = (usd * 0.75) / 1e6;
  return Math.round(m * 10) / 10;
}

/* ------------------- Round 191: the extend mode ------------------- */
if (extendArg) {
  const SA_CLUBS = [...new Set(Object.values(DB_TO_ERA_SA))];

  /* 1. The shipped file is the truth for the first forty clubs. */
  fs.writeFileSync('/tmp/era2015ExtendEntry.mjs',
    `const m = await import('${ROOT}/src/data/clubManagerEra2015.ts');\nexport const R = m.ERA2015_ROSTERS;\nexport const META = m.ERA2015_META;\n`);
  execSync(`${ROOT}/node_modules/.bin/esbuild /tmp/era2015ExtendEntry.mjs --bundle --format=esm --platform=node --outfile=/tmp/era2015Extend.bundle.mjs --log-level=error`);
  const { R: EXISTING, META: OLD_META } = await import('/tmp/era2015Extend.bundle.mjs');
  if (SA_CLUBS.some(c => EXISTING[c])) {
    console.error('FATAL: the shipped file already holds a Serie A club; extend must not run twice');
    process.exit(1);
  }
  const world = {};
  for (const [club, list] of Object.entries(EXISTING)) world[club] = list.map(p => ({ ...p }));
  for (const c of SA_CLUBS) world[c] = [];
  const clubOfExisting = new Map();
  for (const [club, list] of Object.entries(EXISTING)) for (const p of list) clubOfExisting.set(p.n, club);

  /* 2. The fresh Serie A dump. */
  const dumpPath = extendArg.slice(extendArg.indexOf('=') + 1);
  const saRows = JSON.parse(fs.readFileSync(dumpPath, 'utf8')).rows ?? [];
  const saPool = new Map();
  for (const r of saRows) {
    const engine = DB_TO_ERA_SA[r.club];
    if (!engine) { console.error(`FATAL: Serie A dump row at unmapped club "${r.club}"`); process.exit(1); }
    const prev = saPool.get(r.player_name);
    if (!prev || r.market_value_usd > prev.usd) {
      saPool.set(r.player_name, { engine, position: r.position, age: r.age, usd: r.market_value_usd });
    }
  }
  console.log(`Serie A 2015 dump: ${saPool.size} distinct names`);

  /* 3. The corrections. */
  let moved = 0, removed = 0, arrived = 0, folded = 0;
  const bake = (name, rec) => ({ n: name, p: POS_MAP[rec.position], a: rec.age, v: gbpM(rec.usd), r: ratingOf(rec.usd) });
  for (const mv of SA_EXTEND_MOVES) {
    const inSa = saPool.get(mv.n);
    const oldClub = clubOfExisting.get(mv.n);
    if (!inSa && !oldClub) { console.error(`FATAL: mover "${mv.n}" not found in either world, the list is stale`); process.exit(1); }
    if (mv.to === 'DROP_DUPLICATE') {
      if (!inSa || !oldClub) { console.error(`FATAL: fold "${mv.n}" expected on both sides`); process.exit(1); }
      saPool.delete(mv.n); folded += 1; continue;
    }
    if (inSa) {
      saPool.delete(mv.n);
      if (mv.to === null) { removed += 1; continue; }
      if (!POS_MAP[inSa.position]) { console.error(`FATAL: unmapped position "${inSa.position}" (${mv.n})`); process.exit(1); }
      if (!world[mv.to]) { console.error(`FATAL: mover "${mv.n}" bound for unknown club "${mv.to}"`); process.exit(1); }
      world[mv.to].push(bake(mv.n, inSa));
      moved += 1;
      continue;
    }
    /* The mover lives in the shipped forty (Dzeko, Szczesny, Jovetic, Miranda). */
    const list = world[oldClub];
    const idx = list.findIndex(p => p.n === mv.n);
    const [row] = list.splice(idx, 1);
    if (mv.to === null) { removed += 1; continue; }
    if (!world[mv.to]) { console.error(`FATAL: mover "${mv.n}" bound for unknown club "${mv.to}"`); process.exit(1); }
    world[mv.to].push(row);
    moved += 1;
  }
  for (const ar of SA_ARRIVALS) {
    if (saPool.has(ar.n) || clubOfExisting.has(ar.n)) {
      console.error(`FATAL: arrival "${ar.n}" already in a dump, remove the duplicate entry`);
      process.exit(1);
    }
    if (!world[ar.to]) { console.error(`FATAL: arrival "${ar.n}" bound for unknown club "${ar.to}"`); process.exit(1); }
    world[ar.to].push(bake(ar.n, { position: ar.position, age: ar.age, usd: ar.usd }));
    arrived += 1;
  }

  /* 4. One name, one player, per era world: a Serie A name colliding with a
     shipped name is two real men wearing one string (Hellas Verona's
     Fernandinho against Manchester City's, their Rafael against United's),
     and the era engine keys players by name, so only one can exist. Same
     rule as the original merge: the higher value stays, and the drop is
     logged out loud. */
  let collisions = 0;
  for (const [name, rec] of [...saPool.entries()]) {
    const oldClub = clubOfExisting.get(name);
    if (!oldClub || !world[oldClub]?.some(p => p.n === name)) continue;
    const oldRow = world[oldClub].find(p => p.n === name);
    if (gbpM(rec.usd) > oldRow.v) {
      world[oldClub] = world[oldClub].filter(p => p.n !== name);
      console.log(`  name collision: '${name}' kept at Serie A value over ${oldClub}'s ${oldRow.v}m`);
    } else {
      saPool.delete(name);
      console.log(`  name collision: '${name}' kept at ${oldClub} (${oldRow.v}m) over the Serie A row`);
    }
    collisions += 1;
  }

  /* 5. Bake the rest of the league. */
  for (const [name, rec] of saPool) {
    if (!POS_MAP[rec.position]) { console.error(`FATAL: unmapped position "${rec.position}" (${name})`); process.exit(1); }
    world[rec.engine].push(bake(name, rec));
  }
  for (const list of Object.values(world)) list.sort((a, b) => b.v - a.v || a.n.localeCompare(b.n));

  /* 6. Anchors: a 2015-16 Serie A without its own headline is not one. */
  const anchor2 = (club, name) => {
    if (!(world[club] ?? []).some(pl => pl.n === name)) {
      console.error(`FATAL: anchor ${name} missing from 2015 ${club}`);
      process.exit(1);
    }
  };
  anchor2('Juventus', 'Paul Pogba');
  anchor2('Juventus', 'Paulo Dybala');
  anchor2('Juventus', 'Gianluigi Buffon');
  anchor2('Napoli', 'Gonzalo Higuaín');
  anchor2('Napoli', 'Marek Hamsik');
  anchor2('Roma', 'Francesco Totti');
  anchor2('Roma', 'Edin Dzeko');
  anchor2('Inter Milan', 'Mauro Icardi');
  anchor2('AC Milan', 'Carlos Bacca');
  anchor2('Fiorentina', 'Nikola Kalinić');
  anchor2('Leicester City', 'Gökhan Inler');
  anchor2('Leicester City', 'Jamie Vardy');
  anchor2('Barcelona', 'Lionel Messi');

  /* 7. Thin only where the table itself is thin. */
  const EXPECTED_THIN_ALL = new Set(['Las Palmas', 'Frosinone']);
  const partialAll = [];
  let totalAll = 0;
  const clubsAll = Object.keys(world).sort((a, b) => a.localeCompare(b));
  for (const club of clubsAll) {
    const n = world[club].length;
    totalAll += n;
    if (n < 8) {
      partialAll.push(club);
      if (!EXPECTED_THIN_ALL.has(club)) {
        console.error(`FATAL: ${club} has only ${n} real 2015 players and was not expected thin`);
        process.exit(1);
      }
    }
  }

  /* 8. Emit the sixty-club world. */
  const escX = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const movesAll = OLD_META.moves + moved + removed + arrived + folded;
  let outX = `// AUTO-GENERATED by scripts/bakeEra2015.mjs (Round 175, extended Round 191).
// The 2015-16 era world: real year-2015 Transfermarkt rows from
// player_market_values for all 60 clubs of the 2015-16 Premier League,
// La Liga and Serie A (the Serie A joined via the extend mode, see the
// script header; membership verified against the Wikipedia season page
// and worldfootball's fixture list, dump 2026-08-20). The verified
// summer 2015 window corrections are applied across all three leagues
// (${movesAll} rows moved, removed, arrived or folded in total). Values in £m
// at the year-2015 snapshot, ratings 48-94 on the same curve as the 2026
// bake. Regenerate per the header of scripts/bakeEra2015.mjs.
// DO NOT EDIT BY HAND.
import type { BakedPlayer } from '@/data/clubManagerRosters';

export const ERA2015_META = {
  year: 2015,
  players: ${totalAll},
  clubs: ${clubsAll.length},
  moves: ${movesAll},
};

/** 2015 clubs where the year-2015 table runs thin (under 8 real players);
 *  the game pads these squads with youth players and the picker says so. */
export const ERA2015_PARTIAL: string[] = ${JSON.stringify(partialAll.sort())};

export const ERA2015_ROSTERS: Record<string, BakedPlayer[]> = {
`;
  for (const club of clubsAll) {
    outX += `  '${escX(club)}': [\n`;
    for (const p of world[club]) {
      outX += `    { n: '${escX(p.n)}', p: '${p.p}', a: ${p.a}, v: ${p.v}, r: ${p.r} },\n`;
    }
    outX += `  ],\n`;
  }
  outX += `};\n`;
  fs.writeFileSync(path.join(ROOT, 'src/data/clubManagerEra2015.ts'), outX);
  console.log(`Extended to ${totalAll} players across ${clubsAll.length} clubs (${partialAll.length} partial).`);
  console.log(`Serie A corrections: ${moved} moved, ${removed} removed, ${arrived} arrived, ${folded} folded, ${collisions} name collisions resolved.`);
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
  ...readDump(plArg, DB_TO_ERA_PL, 'Premier League 2015'),
  ...readDump(llArg, DB_TO_ERA_LL, 'La Liga 2015'),
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
for (const mv of ERA_MOVES_2015) {
  const rec = byPlayer.get(mv.n);
  if (!rec) {
    console.error(`FATAL: mover "${mv.n}" not found in the dumps, the correction list is stale`);
    process.exit(1);
  }
  if (mv.to === null) { byPlayer.delete(mv.n); removed += 1; }
  else { rec.engine = mv.to; moved += 1; }
}
for (const ar of ERA_ARRIVALS_2015) {
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

/* Validate: anchors, and thinness only where the table itself is thin. The
 * anchor list leans on the champions on purpose: a 2015-16 world without
 * Vardy, Mahrez and Kante at Leicester would be missing its own headline. */
const anchor = (club, name) => {
  if (!(byClub.get(club) ?? []).some(pl => pl.n === name)) {
    console.error(`FATAL: anchor ${name} missing from 2015 ${club}`);
    process.exit(1);
  }
};
anchor('Barcelona', 'Lionel Messi');
anchor('Barcelona', 'Neymar');
anchor('Real Madrid', 'Cristiano Ronaldo');
anchor('Leicester City', 'Jamie Vardy');
anchor('Leicester City', 'Riyad Mahrez');
anchor('Leicester City', "N'Golo Kanté");
anchor('Leicester City', 'Kasper Schmeichel');
anchor('Manchester City', 'Kevin De Bruyne');
anchor('Chelsea', 'Pedro');

const EXPECTED_THIN = new Set(['Las Palmas']);
const partial = [];
let total = 0;
for (const club of engineClubs) {
  const n = byClub.get(club).length;
  total += n;
  if (n < 8) {
    partial.push(club);
    if (!EXPECTED_THIN.has(club)) {
      console.error(`FATAL: ${club} has only ${n} real 2015 players and was not expected thin`);
      process.exit(1);
    }
  }
}

/* Emit. */
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const clubsSorted = [...engineClubs].sort();
let out = `// AUTO-GENERATED by scripts/bakeEra2015.mjs (Round 175). The 2015-16 era
// world: real year-2015 Transfermarkt rows from player_market_values for all
// 40 clubs of the 2015-16 Premier League and La Liga, with the verified
// summer 2015 window corrections applied (${moved} moved, ${removed} left for
// clubs outside this world, ${arrived} arrived from outside it). Values in £m
// at the year-2015 snapshot, ratings 48-94 on the same curve as the 2026
// bake. Regenerate per the header of scripts/bakeEra2015.mjs.
// DO NOT EDIT BY HAND.
import type { BakedPlayer } from '@/data/clubManagerRosters';

export const ERA2015_META = {
  year: 2015,
  players: ${total},
  clubs: ${clubsSorted.length},
  moves: ${moved + removed + arrived},
};

/** 2015 clubs where the year-2015 table runs thin (under 8 real players);
 *  the game pads these squads with youth players and the picker says so. */
export const ERA2015_PARTIAL: string[] = ${JSON.stringify(partial.sort())};

export const ERA2015_ROSTERS: Record<string, BakedPlayer[]> = {
`;
for (const club of clubsSorted) {
  out += `  '${esc(club)}': [\n`;
  for (const p of byClub.get(club)) {
    out += `    { n: '${esc(p.n)}', p: '${p.p}', a: ${p.a}, v: ${p.v}, r: ${p.r} },\n`;
  }
  out += `  ],\n`;
}
out += `};\n`;

fs.writeFileSync(path.join(ROOT, 'src/data/clubManagerEra2015.ts'), out);
console.log(`Baked ${total} players across ${clubsSorted.length} clubs (${partial.length} partial) -> src/data/clubManagerEra2015.ts`);
console.log(`Window corrections: ${moved} moved, ${removed} removed, ${arrived} arrived`);
