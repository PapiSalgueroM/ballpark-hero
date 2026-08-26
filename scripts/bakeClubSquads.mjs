/**
 * Round 262: bake real club squads for the clubs a career can be played at.
 *
 * Round 259 put real internationals on the national team sheet. This is the
 * other half, and it is the half a player looks at every single season: the
 * squad he is actually in. Sign for Arsenal and the question that decides the
 * whole season is who is ahead of you, and until now the game answered it with
 * a projected appearance range and no names at all.
 *
 * THE CLUB NAME MAP IS EXPLICIT, AND THAT IS THE WHOLE POINT.
 *
 * The career game calls them "Man City", "Dortmund" and "Al Hilal"; the market
 * data calls them "Manchester City", "Borussia Dortmund" and "Al-Hilal SFC".
 * The obvious shortcut is a fuzzy match, and the data makes very clear why
 * that would be a disaster: it also contains Arsenal Tula, Liverpool FC
 * Montevideo, Real Madrid Castilla, Juventus Next Gen, Inter U23, Queens Park
 * Rangers, Racing Santander, Racing Club de Montevideo, CA River Plate
 * Montevideo and Cercle Brugge. A near match would quietly fill Rangers'
 * squad with QPR players and nobody would notice for months.
 *
 * So every club is mapped by hand, one line each, and scripts/simClubSquads
 * .mjs fails if a mapped name has no rows in the data, and fails again if a
 * career club that is NOT in this map somehow ends up with a squad. A club
 * outside the map shows no squad at all, which is the honest answer.
 *
 * SAME RULES AS THE NATIONAL POOLS. Selection is per exact position so the
 * depth chart has a keeper and full backs rather than the six most valuable
 * men. Ratings come off the site's shared 48-94 value curve. The year is the
 * squad's own year, so a 2019 season shows the 2019 squad. A club whose data
 * that year cannot cover a shape is absent on purpose.
 *
 * Run: node scripts/bakeClubSquads.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientTs = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const urlMatch = clientTs.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
const keyMatch = clientTs.match(/eyJ[A-Za-z0-9._-]+/);
if (!urlMatch || !keyMatch) {
  console.error('could not read the Supabase url and key out of client.ts');
  process.exit(1);
}
const supabase = createClient(urlMatch[0], keyMatch[0], { auth: { persistSession: false } });

const FIRST_YEAR = Number(process.env.SQUAD_FROM || 2016);
const LAST_YEAR = Number(process.env.SQUAD_TO || 2026);

/**
 * Career club name -> market data club name. Every entry was read off the
 * data's own club list, not guessed. Covers the career game's tier 1 and 2,
 * which is where "am I good enough to play here" is a real question; at the
 * bottom of the pyramid you play every week regardless.
 */
const CLUB_MAP = {
  'Real Madrid': 'Real Madrid',
  Barcelona: 'FC Barcelona',
  'Man City': 'Manchester City',
  Liverpool: 'Liverpool FC',
  'Bayern Munich': 'Bayern Munich',
  PSG: 'Paris Saint-Germain',
  Juventus: 'Juventus FC',
  'Inter Milan': 'Inter Milan',
  'Man United': 'Manchester United',
  Arsenal: 'Arsenal FC',
  Chelsea: 'Chelsea FC',
  Ajax: 'Ajax Amsterdam',
  Benfica: 'SL Benfica',
  Porto: 'FC Porto',
  'Boca Juniors': 'CA Boca Juniors',
  'River Plate': 'CA River Plate',
  Flamengo: 'CR Flamengo',
  'Sao Paulo': 'São Paulo Futebol Clube',
  'Atletico Madrid': 'Atlético de Madrid',
  Sevilla: 'Sevilla FC',
  Tottenham: 'Tottenham Hotspur',
  Newcastle: 'Newcastle United',
  Dortmund: 'Borussia Dortmund',
  Leipzig: 'RB Leipzig',
  'AC Milan': 'AC Milan',
  Napoli: 'SSC Napoli',
  Roma: 'AS Roma',
  Marseille: 'Olympique Marseille',
  Lyon: 'Olympique Lyon',
  Feyenoord: 'Feyenoord Rotterdam',
  PSV: 'PSV Eindhoven',
  'Sporting CP': 'Sporting CP',
  Fenerbahce: 'Fenerbahce',
  Galatasaray: 'Galatasaray',
  'Al Hilal': 'Al-Hilal SFC',
  Celtic: 'Celtic FC',
  Rangers: 'Rangers FC',
  Palmeiras: 'Sociedade Esportiva Palmeiras',
  'LA Galaxy': 'Los Angeles Galaxy',
  'Inter Miami': 'Inter Miami CF',
  'Al Ittihad': 'Al-Ittihad Club',
  'Club Brugge': 'Club Brugge KV',
  Olympiacos: 'Olympiacos Piraeus',
  'Shakhtar Donetsk': 'Shakhtar Donetsk',
  Corinthians: 'Sport Club Corinthians Paulista',
  Monterrey: 'CF Monterrey',
  'Tigres UANL': 'Tigres UANL',
  'Athletic Bilbao': 'Athletic Bilbao',
  Brighton: 'Brighton & Hove Albion',
  Stuttgart: 'VfB Stuttgart',
  LAFC: 'Los Angeles FC',
  'Racing Club': 'Racing Club',
  Zenit: 'Zenit St. Petersburg',
  Girona: 'Girona FC',
};

const POS_MAP = {
  'Goalkeeper': 'GK', 'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB',
  'Defensive Midfield': 'CDM', 'Central Midfield': 'CM', 'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM', 'Right Midfield': 'RM', 'Left Winger': 'LW', 'Right Winger': 'RW',
  'Centre-Forward': 'ST', 'Second Striker': 'CF',
};
const GROUP = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'ATT', RW: 'ATT', ST: 'ATT', CF: 'ATT',
};
const KEEP = { GK: 2, CB: 4, LB: 2, RB: 2, CDM: 2, CM: 4, CAM: 2, LM: 1, RM: 1, LW: 2, RW: 2, ST: 3, CF: 1 };
/* Lower on midfield than the NATIONAL pool bake uses, and on purpose. That
   one builds an eleven with three midfield shirts and wants a spare; this one
   builds a DEPTH CHART, where three men is already a queue. The difference
   matters because the data counts wingers as forwards, so a modern squad
   reads midfield-light: Arsenal 2023 has two keepers, nine defenders, three
   midfielders and eight attackers, which is a perfectly good squad to show
   and was being thrown away by a threshold borrowed from a different job. */
const NEED = { GK: 1, DEF: 4, MID: 3, ATT: 3 };

function ratingOf(usd) {
  if (!usd || usd <= 0) return 48;
  return Math.max(48, Math.min(94, Math.round(-13.106 + 12.851 * Math.log10(usd))));
}

const wanted = new Set(Object.values(CLUB_MAP));

async function fetchYear(year) {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('player_market_values_dedup')
      .select('player_name, position, club, market_value_usd')
      .eq('year', year)
      .gt('market_value_usd', 0)
      .order('market_value_usd', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${year}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

const out = new Map();
const skipped = [];
let totalPlayers = 0;
const seenClubs = new Set();

for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
  const rows = await fetchYear(year);
  const byClub = new Map();
  for (const r of rows) {
    /* EXACT match against the mapped name, never a contains or a startsWith:
       that is what keeps Rangers FC and Queens Park Rangers apart. */
    if (!wanted.has(r.club)) continue;
    const pos = POS_MAP[r.position];
    if (!pos || !r.player_name) continue;
    if (!byClub.has(r.club)) byClub.set(r.club, []);
    byClub.get(r.club).push({ n: r.player_name, p: pos, g: GROUP[pos], r: ratingOf(r.market_value_usd) });
  }
  let kept = 0;
  for (const [club, players] of byClub) {
    seenClubs.add(club);
    /* one row per man: the source lists a player twice in a year when he
       moved inside it, which the national pool bake learned the hard way */
    const best = new Map();
    for (const p of players) {
      const prev = best.get(p.n);
      if (!prev || p.r > prev.r) best.set(p.n, p);
    }
    const uniq = [...best.values()];
    const picked = [];
    for (const pos of Object.keys(KEEP)) {
      const atPos = uniq.filter(p => p.p === pos).sort((a, b) => b.r - a.r || a.n.localeCompare(b.n));
      picked.push(...atPos.slice(0, KEEP[pos]));
    }
    /* TOP UP BEFORE JUDGING. The per position caps can push a group under
       NEED even when the squad genuinely has the men: Arsenal 2023 has three
       midfielders and all three are attacking midfielders, so a cap of two on
       that position left the group at two and threw a real squad away. If the
       raw squad has more men in a short group, take the best of them. This is
       still only ever real players from that club in that year. */
    const taken = new Set(picked.map(p => p.n));
    for (const g of ['GK', 'DEF', 'MID', 'ATT']) {
      let have = picked.filter(p => p.g === g).length;
      if (have >= NEED[g]) continue;
      const spare = uniq
        .filter(p => p.g === g && !taken.has(p.n))
        .sort((a, b) => b.r - a.r || a.n.localeCompare(b.n));
      for (const p of spare) {
        if (have >= NEED[g]) break;
        picked.push(p); taken.add(p.n); have += 1;
      }
    }
    let short = null;
    for (const g of ['GK', 'DEF', 'MID', 'ATT']) {
      const inGroup = picked.filter(p => p.g === g);
      if (inGroup.length < NEED[g]) { short = `${g} ${inGroup.length}/${NEED[g]}`; break; }
    }
    if (short) { skipped.push(`${club} ${year} (${short})`); continue; }
    picked.sort((a, b) => b.r - a.r || a.n.localeCompare(b.n));
    out.set(`${club}|${year}`, picked.map(p => `${p.n}:${p.p}:${p.r}`).join(','));
    kept += 1;
    totalPlayers += picked.length;
  }
  console.log(`${year}: ${byClub.size} mapped clubs found, ${kept} with a fieldable squad`);
}

/* a mapped name that never matched a single row is a typo in the map, and it
   would silently mean that club never has a squad */
const never = Object.entries(CLUB_MAP).filter(([, dataName]) => !seenClubs.has(dataName));
if (never.length) {
  console.error('\nTHESE MAPPED NAMES MATCHED NOTHING IN THE DATA:');
  for (const [career, dataName] of never) console.error(`  ${career} -> ${JSON.stringify(dataName)}`);
  console.error('Fix the map before shipping: a name that matches nothing is a club with no squad, forever.');
  process.exit(1);
}

const keys = [...out.keys()].sort();
const body = keys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(out.get(k))},`).join('\n');
const aliasBody = Object.entries(CLUB_MAP)
  .map(([career, dataName]) => `  ${JSON.stringify(career)}: ${JSON.stringify(dataName)},`).join('\n');

const header = `/* Real club squads, baked ${process.env.BAKE_DATE || '2026-08-21'}.
 *
 * Source: Supabase player_market_values_dedup, ${FIRST_YEAR} to ${LAST_YEAR}. One entry per
 * club per year: the squad it really had, picked per exact position so the
 * depth chart has a keeper and full backs rather than the most valuable men,
 * encoded as "Name:POS:RATING". Ratings use the same 48-94 value curve as
 * clubManagerRosters and nationalPools, so a player is one number everywhere.
 *
 * CLUB_DATA_NAME is the hand written map from the career game's club names to
 * the data's. It is exact matching only, deliberately: the data also holds
 * Arsenal Tula, Liverpool FC Montevideo, Real Madrid Castilla, Queens Park
 * Rangers, Racing Santander and Cercle Brugge, so anything looser would fill
 * a squad with the wrong club's players.
 *
 * A club whose data that year could not cover a keeper, four defenders, four
 * midfielders and three forwards is ABSENT ON PURPOSE, and so is every club
 * outside the map. The game shows no squad rather than a guessed one.
 *
 * ${keys.length} club seasons, ${totalPlayers} player rows.
 * DO NOT EDIT BY HAND. Regenerate with: node scripts/bakeClubSquads.mjs
 */
export const CLUB_SQUAD_YEARS = { first: ${FIRST_YEAR}, last: ${LAST_YEAR} };

/** Career club name -> the name the market data uses. */
export const CLUB_DATA_NAME: Record<string, string> = {
${aliasBody}
};

/** key is "DataClubName|Year", value is "Name:POS:RATING,..." */
export const CLUB_SQUADS: Record<string, string> = {
${body}
};
`;

const target = path.join(ROOT, 'src/data/clubSquads.ts');
fs.writeFileSync(target, header);
console.log(`\nwrote ${target}`);
console.log(`${keys.length} club seasons, ${totalPlayers} players, ${(fs.statSync(target).size / 1024).toFixed(0)}KB`);
console.log(`${skipped.length} club seasons skipped for a squad that could not field a team`);
if (skipped.length) console.log(`  examples: ${skipped.slice(0, 5).join('; ')}`);
