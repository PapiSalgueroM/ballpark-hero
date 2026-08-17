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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const plArg = process.argv.find(a => a.startsWith('--pl='));
const llArg = process.argv.find(a => a.startsWith('--laliga='));
if (!plArg || !llArg) {
  console.error('Usage: node scripts/bakeEra2010.mjs --pl=pl2010.json --laliga=laliga2010.json');
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

/* Same curves as bakeClubManagerRosters.mjs, verbatim, so a 2010 value and a
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
