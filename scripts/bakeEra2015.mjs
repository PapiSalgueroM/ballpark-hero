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
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const plArg = process.argv.find(a => a.startsWith('--pl='));
const llArg = process.argv.find(a => a.startsWith('--laliga='));
if (!plArg || !llArg) {
  console.error('Usage: node scripts/bakeEra2015.mjs --pl=pl2015.json --laliga=laliga2015.json');
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
