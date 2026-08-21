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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const plArg = process.argv.find(a => a.startsWith('--pl='));
const llArg = process.argv.find(a => a.startsWith('--laliga='));
if (!plArg || !llArg) {
  console.error('Usage: node scripts/bakeEra2005.mjs --pl=pl2005.json --laliga=laliga2005.json');
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

/* Same curves as bakeClubManagerRosters.mjs, verbatim, so a 2005 value and a
 * 2026 value mean the same thing on the rating scale. */
const POS_MAP = {
  'Goalkeeper': 'GK', 'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB',
  'Defensive Midfield': 'CDM', 'Central Midfield': 'CM', 'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM', 'Right Midfield': 'RM', 'Left Winger': 'LW', 'Right Winger': 'RW',
  'Centre-Forward': 'ST', 'Second Striker': 'CF', 'Sweeper': 'CB',
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
