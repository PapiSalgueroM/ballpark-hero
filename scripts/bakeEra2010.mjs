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
const B5_MOVES = [];
const B5_REMOVALS = [];
const B5_ARRIVALS = [];
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
