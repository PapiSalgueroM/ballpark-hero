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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

const plArg = process.argv.find(a => a.startsWith('--pl='));
const llArg = process.argv.find(a => a.startsWith('--laliga='));
if (!extendArg && (!plArg || !llArg)) {
  console.error('Usage: node scripts/bakeEra2015.mjs --extend-seriea=seriea2015.json');
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
