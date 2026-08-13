/**
 * Round 70: bake real 2026 rosters for Club Manager from the Transfermarkt
 * style data already sitting in Supabase (player_market_values_dedup view,
 * security_invoker over the public-read player_market_values table).
 *
 * Produces src/data/clubManagerRosters.ts: every club in the big five
 * leagues plus the UCL flavor clubs, with real names, positions, ages and
 * market values, and a rating derived from value on a 48-94 curve.
 *
 * Re-run this script whenever the market value data gets a fresh year:
 *   node scripts/bakeClubManagerRosters.mjs
 *
 * FAILS CLOSED: if any club comes back thin, any position is unmapped, or
 * the sanity anchors are missing, it exits 1 and writes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const YEAR = 2026;

/* ------------------------------------------------------------------ */
/* Supabase client from the app's own hardcoded values                */
/* ------------------------------------------------------------------ */
const clientTs = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const urlMatch = clientTs.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
const keyMatch = clientTs.match(/eyJ[A-Za-z0-9_.-]+/);
if (!urlMatch || !keyMatch) {
  console.error('FATAL: could not extract Supabase URL/key from client.ts');
  process.exit(1);
}
const supabase = createClient(urlMatch[0], keyMatch[0], { auth: { persistSession: false } });

/* ------------------------------------------------------------------ */
/* DB club name -> engine club name (Transfermarkt style -> ours)     */
/* ------------------------------------------------------------------ */
const DB_TO_ENGINE = {
  // Premier League
  'Arsenal FC': 'Arsenal', 'Aston Villa': 'Aston Villa', 'AFC Bournemouth': 'Bournemouth',
  'Brentford FC': 'Brentford', 'Brighton & Hove Albion': 'Brighton', 'Burnley FC': 'Burnley',
  'Chelsea FC': 'Chelsea', 'Crystal Palace': 'Crystal Palace', 'Everton FC': 'Everton',
  'Fulham FC': 'Fulham', 'Leeds United': 'Leeds United', 'Liverpool FC': 'Liverpool',
  'Manchester City': 'Manchester City', 'Manchester United': 'Manchester United',
  'Newcastle United': 'Newcastle', 'Nottingham Forest': 'Nottingham Forest',
  'Sunderland AFC': 'Sunderland', 'Tottenham Hotspur': 'Tottenham',
  'West Ham United': 'West Ham', 'Wolverhampton Wanderers': 'Wolves',
  // La Liga
  'Deportivo Alavés': 'Alavés', 'Athletic Bilbao': 'Athletic Club', 'Atlético de Madrid': 'Atlético Madrid',
  'FC Barcelona': 'Barcelona', 'Real Betis Balompié': 'Real Betis', 'Celta de Vigo': 'Celta Vigo',
  'Elche CF': 'Elche', 'RCD Espanyol Barcelona': 'Espanyol', 'Getafe CF': 'Getafe',
  'Girona FC': 'Girona', 'Levante UD': 'Levante', 'RCD Mallorca': 'Mallorca',
  'CA Osasuna': 'Osasuna', 'Real Oviedo': 'Real Oviedo', 'Rayo Vallecano': 'Rayo Vallecano',
  'Real Madrid': 'Real Madrid', 'Real Sociedad': 'Real Sociedad', 'Sevilla FC': 'Sevilla',
  'Valencia CF': 'Valencia', 'Villarreal CF': 'Villarreal',
  // Serie A
  'Atalanta BC': 'Atalanta', 'Bologna FC 1909': 'Bologna', 'Cagliari Calcio': 'Cagliari',
  'Como 1907': 'Como', 'US Cremonese': 'Cremonese', 'ACF Fiorentina': 'Fiorentina',
  'Genoa CFC': 'Genoa', 'Inter Milan': 'Inter Milan', 'Juventus FC': 'Juventus',
  'SS Lazio': 'Lazio', 'US Lecce': 'Lecce', 'AC Milan': 'AC Milan', 'SSC Napoli': 'Napoli',
  'Parma Calcio 1913': 'Parma', 'Pisa Sporting Club': 'Pisa', 'AS Roma': 'Roma',
  'US Sassuolo': 'Sassuolo', 'Torino FC': 'Torino', 'Udinese Calcio': 'Udinese',
  'Hellas Verona': 'Verona',
  // Bundesliga
  'FC Augsburg': 'Augsburg', 'Bayer 04 Leverkusen': 'Bayer Leverkusen', 'Bayern Munich': 'Bayern Munich',
  'Borussia Dortmund': 'Borussia Dortmund', 'Borussia Mönchengladbach': 'Gladbach',
  'Eintracht Frankfurt': 'Eintracht Frankfurt', 'SC Freiburg': 'Freiburg', 'Hamburger SV': 'Hamburg',
  '1.FC Heidenheim 1846': 'Heidenheim', 'TSG 1899 Hoffenheim': 'Hoffenheim', '1.FC Köln': 'Köln',
  '1.FSV Mainz 05': 'Mainz', 'RB Leipzig': 'RB Leipzig', 'FC St. Pauli': 'St. Pauli',
  'VfB Stuttgart': 'Stuttgart', '1.FC Union Berlin': 'Union Berlin',
  'SV Werder Bremen': 'Werder Bremen', 'VfL Wolfsburg': 'Wolfsburg',
  // Ligue 1
  'Angers SCO': 'Angers', 'AJ Auxerre': 'Auxerre', 'Stade Brestois 29': 'Brest',
  'Le Havre AC': 'Le Havre', 'RC Lens': 'Lens', 'LOSC Lille': 'Lille', 'FC Lorient': 'Lorient',
  'Olympique Lyon': 'Lyon', 'Olympique Marseille': 'Marseille', 'FC Metz': 'Metz',
  'AS Monaco': 'Monaco', 'FC Nantes': 'Nantes', 'OGC Nice': 'Nice', 'Paris FC': 'Paris FC',
  'Paris Saint-Germain': 'PSG', 'Stade Rennais FC': 'Rennes', 'RC Strasbourg Alsace': 'Strasbourg',
  'FC Toulouse': 'Toulouse',
  // UCL flavor clubs (playable opponents in Europe, not in the five leagues)
  'SL Benfica': 'Benfica', 'FC Porto': 'Porto', 'Sporting CP': 'Sporting CP',
  'Ajax Amsterdam': 'Ajax', 'PSV Eindhoven': 'PSV', 'Feyenoord Rotterdam': 'Feyenoord',
  'Celtic FC': 'Celtic', 'Rangers FC': 'Rangers', 'Galatasaray': 'Galatasaray',
  'Fenerbahce': 'Fenerbahçe', 'Club Brugge KV': 'Club Brugge', 'Red Bull Salzburg': 'RB Salzburg',
  'Olympiacos Piraeus': 'Olympiacos',
};

const POS_MAP = {
  'Goalkeeper': 'GK',
  'Centre-Back': 'CB',
  'Left-Back': 'LB',
  'Right-Back': 'RB',
  'Defensive Midfield': 'CDM',
  'Central Midfield': 'CM',
  'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM',
  'Right Midfield': 'RM',
  'Left Winger': 'LW',
  'Right Winger': 'RW',
  'Centre-Forward': 'ST',
  'Second Striker': 'CF',
};

/** USD market value -> game rating on a 48-94 curve ($216m -> 94, $1m -> 64). */
function ratingOf(usd) {
  if (!usd || usd <= 0) return 48;
  const r = Math.round(-13.106 + 12.851 * Math.log10(usd));
  return Math.max(48, Math.min(94, r));
}

/** USD -> pounds sterling millions, one decimal. */
function gbpM(usd) {
  const m = (usd * 0.75) / 1e6;
  return Math.round(m * 10) / 10;
}

/* ------------------------------------------------------------------ */
/* Fetch                                                              */
/* ------------------------------------------------------------------ */
const dbNames = Object.keys(DB_TO_ENGINE);
const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('player_market_values_dedup')
    .select('id,player_name,club,position,age,market_value_usd')
    .eq('year', YEAR)
    .in('club', dbNames)
    .order('id', { ascending: true })
    .range(from, from + 999);
  if (error) {
    console.error('FATAL: query failed:', error.message);
    process.exit(1);
  }
  rows.push(...(data ?? []));
  if (!data || data.length < 1000) break;
}
console.log(`Fetched ${rows.length} rows for year ${YEAR}`);

/* ------------------------------------------------------------------ */
/* Assemble + validate (fail closed)                                  */
/* ------------------------------------------------------------------ */
const errors = [];
const byClub = new Map();
const seenPerClub = new Map();
for (const r of rows) {
  const engineClub = DB_TO_ENGINE[r.club];
  if (!engineClub) { errors.push(`Unmapped club: ${r.club}`); continue; }
  const pos = POS_MAP[r.position];
  if (!pos) { errors.push(`Unmapped position "${r.position}" (${r.player_name})`); continue; }
  const name = String(r.player_name ?? '').trim();
  if (!name) { errors.push(`Empty name in ${r.club}`); continue; }
  const age = Number(r.age);
  if (!Number.isFinite(age) || age < 15 || age > 45) { errors.push(`Bad age ${r.age} for ${name}`); continue; }
  const usd = Number(r.market_value_usd);
  if (!Number.isFinite(usd) || usd <= 0) { errors.push(`Bad value ${r.market_value_usd} for ${name}`); continue; }
  const key = `${engineClub}:${name}`;
  if (seenPerClub.has(key)) continue; // duplicate guard
  seenPerClub.set(key, true);
  if (!byClub.has(engineClub)) byClub.set(engineClub, []);
  byClub.get(engineClub).push({ n: name, p: pos, a: age, v: gbpM(usd), r: ratingOf(usd) });
}

for (const list of byClub.values()) list.sort((a, b) => b.v - a.v || a.n.localeCompare(b.n));

const engineClubs = [...new Set(Object.values(DB_TO_ENGINE))];
for (const club of engineClubs) {
  const n = (byClub.get(club) ?? []).length;
  if (n < 7) errors.push(`Club too thin: ${club} has ${n} players (need >= 7)`);
}

// Sanity anchors: the exact complaints and known 2026 facts must hold.
const has = (club, frag) => (byClub.get(club) ?? []).some(p => p.n.includes(frag));
if (!has('Barcelona', 'Lewandowski')) errors.push('ANCHOR: Lewandowski missing from Barcelona');
if (!has('Manchester City', 'Haaland')) errors.push('ANCHOR: Haaland missing from Manchester City');
if (!has('Real Madrid', 'Mbapp')) errors.push('ANCHOR: Mbappé missing from Real Madrid');
if (!has('Girona', 'ter Stegen')) errors.push('ANCHOR: ter Stegen not at Girona (2026 data said he is)');

const xiAvg = club => {
  const rs = (byClub.get(club) ?? []).map(p => p.r).sort((a, b) => b - a).slice(0, 11);
  while (rs.length < 11) rs.push(60);
  return rs.reduce((s, r) => s + r, 0) / 11;
};
if (!(xiAvg('Real Madrid') > xiAvg('Real Oviedo'))) errors.push('SANITY: Real Madrid <= Real Oviedo');
if (!(xiAvg('Bayern Munich') > xiAvg('Heidenheim'))) errors.push('SANITY: Bayern <= Heidenheim');
if (!(xiAvg('PSG') > xiAvg('Le Havre'))) errors.push('SANITY: PSG <= Le Havre');

const total = [...byClub.values()].reduce((s, l) => s + l.length, 0);
if (total < 1800) errors.push(`Only ${total} players total (expected 1800+)`);

if (errors.length) {
  console.error('FAILED CLOSED, nothing written. Problems:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Emit                                                               */
/* ------------------------------------------------------------------ */
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const clubsSorted = engineClubs.slice().sort();
let out = `// Round 70: real rosters for every Club Manager club, generated ${new Date().toISOString().slice(0, 10)}
// Source: Supabase player_market_values_dedup (Transfermarkt style data), year ${YEAR}.
// ${total} players across ${clubsSorted.length} clubs. Values in £m, ratings on a 48-94
// curve derived from market value. Regenerate with: node scripts/bakeClubManagerRosters.mjs
// DO NOT EDIT BY HAND.
import type { Position } from '@/types/game';

export interface BakedPlayer {
  /** Full name. */
  n: string;
  /** Position. */
  p: Position;
  /** Age as of the ${YEAR} dataset. */
  a: number;
  /** Market value in £m. */
  v: number;
  /** Game rating 48-94 derived from market value. */
  r: number;
}

export const CM_ROSTER_META = { generated: '${new Date().toISOString().slice(0, 10)}', year: ${YEAR}, players: ${total}, clubs: ${clubsSorted.length} };

export const CM_ROSTERS: Record<string, BakedPlayer[]> = {
`;
for (const club of clubsSorted) {
  out += `  '${esc(club)}': [\n`;
  for (const p of byClub.get(club)) {
    out += `    { n: '${esc(p.n)}', p: '${p.p}', a: ${p.a}, v: ${p.v}, r: ${p.r} },\n`;
  }
  out += `  ],\n`;
}
out += `};\n`;

fs.writeFileSync(path.join(ROOT, 'src/data/clubManagerRosters.ts'), out);
console.log(`Wrote src/data/clubManagerRosters.ts (${(out.length / 1024).toFixed(0)}KB)`);

/* Summary for eyeballing */
for (const club of clubsSorted) {
  const list = byClub.get(club);
  console.log(
    `${club.padEnd(20)} ${String(list.length).padStart(3)} players  XI ${xiAvg(club).toFixed(1)}  top: ${list[0].n} (£${list[0].v}m, ${list[0].r})`,
  );
}
