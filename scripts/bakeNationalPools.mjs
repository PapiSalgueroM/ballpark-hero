/**
 * Round 259: bake real international pools out of the market value table.
 *
 * Owner report, in full: "What type of squad is this? There's no real life
 * players and this is only 2023. I get it in like 2045 because we don't know
 * who's going to be good then but right now u can say who's good."
 *
 * He is right and the fix is data we already own. player_market_values_dedup
 * carries a name, a nationality, a position, an age and a market value for
 * every year from 2004 to 2026, which is exactly a national pool once it is
 * grouped by country and year. So for the years the data covers, the squad
 * screen names real internationals; past the data it keeps generating people,
 * which is the part he explicitly said he understood.
 *
 * THE RULES THIS BAKE FOLLOWS.
 *
 *   1. A PLAYER ONLY EVER APPEARS FOR THE NATION HIS ROW SAYS. Nothing is
 *      inferred from a name, a league or a club. Nationality comes off the
 *      row and nowhere else.
 *   2. THE POOL MUST BE ABLE TO FIELD A TEAM. Taking the sixteen most
 *      valuable players of a small nation produced a Belarus squad of one
 *      keeper and fifteen wide midfielders, all rated 64, because at the
 *      bottom of the value table everything is worth the same and the shape
 *      is whatever the scrape happened to hold. So players are picked PER
 *      POSITION GROUP, and a nation whose pool cannot cover a keeper, a back
 *      line, a midfield and a front line is skipped for that year and falls
 *      back to generated names. Fail closed, quietly.
 *   3. RATINGS COME OFF THE SAME CURVE AS EVERY OTHER REAL PLAYER ON THE
 *      SITE, the one in bakeClubManagerRosters.mjs, so a striker cannot be
 *      an 84 in Club Manager and a 71 in an international squad.
 *   4. THE YEAR IS THE PLAYER'S OWN YEAR. A 2023 squad is built from 2023
 *      rows, so it holds who was actually good in 2023 rather than today's
 *      squad wearing an old date.
 *
 * The window is deliberately not the whole table: every year of every nation
 * would be most of a megabyte carried in the repo forever, and the value is
 * concentrated in the recent years, where a player can check the squad
 * against his own memory. Set YEARS to widen it.
 *
 * Run: node scripts/bakeNationalPools.mjs
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

const FIRST_YEAR = Number(process.env.POOL_FROM || 2016);
const LAST_YEAR = Number(process.env.POOL_TO || 2026);

/* the same map bakeClubManagerRosters uses, so a position means one thing */
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
/**
 * How many of each EXACT position to keep, not each group.
 *
 * The first pass kept the best six defenders and the best six midfielders,
 * and the team sheet then handed those shirts out in rating order, so England
 * 2023 lined up with Trent Alexander-Arnold at centre half. That is the same
 * complaint the owner had made about the shape a round earlier, arriving by a
 * different route. Keeping a couple of each real position means the sheet can
 * put a right back at right back.
 */
/* CB and CM sit at four because plenty of nations have no recognised full
   back or holding midfielder in the data at all, and a fourth centre half
   is what a manager reaches for in that situation too. */
const KEEP = { GK: 2, CB: 4, LB: 2, RB: 2, CDM: 2, CM: 4, CAM: 2, LM: 1, RM: 1, LW: 2, RW: 2, ST: 3, CF: 1 };
/** Below this in any group the pool cannot field a team, so the nation is skipped. */
const NEED = { GK: 1, DEF: 4, MID: 4, ATT: 3 };

/** USD market value -> game rating on the site's 48-94 curve. */
function ratingOf(usd) {
  if (!usd || usd <= 0) return 48;
  return Math.max(48, Math.min(94, Math.round(-13.106 + 12.851 * Math.log10(usd))));
}

async function fetchYear(year) {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('player_market_values_dedup')
      .select('player_name, position, nationality, market_value_usd')
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

const out = new Map();          // `${nation}|${year}` -> compact string
const skipped = [];
let totalPlayers = 0;

for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
  const rows = await fetchYear(year);
  const byNation = new Map();
  for (const r of rows) {
    const pos = POS_MAP[r.position];
    if (!pos || !r.nationality || !r.player_name) continue;
    if (!byNation.has(r.nationality)) byNation.set(r.nationality, []);
    byNation.get(r.nationality).push({ n: r.player_name, p: pos, g: GROUP[pos], r: ratingOf(r.market_value_usd) });
  }
  /* One row per man. The source can hold the same player twice in a year,
     typically because he changed club inside it, and picking per position
     then took him once as a central midfielder and once as an attacking one.
     Caught by the harness on 162 nation seasons, from Wales to Uruguay. The
     most valuable row wins, which is the same rule the rest of the site uses
     when the market table disagrees with itself. */
  for (const [nation, players] of byNation) {
    const best = new Map();
    for (const p of players) {
      const prev = best.get(p.n);
      if (!prev || p.r > prev.r) best.set(p.n, p);
    }
    byNation.set(nation, [...best.values()]);
  }
  let kept = 0;
  for (const [nation, players] of byNation) {
    /* rule 2: pick per group, and refuse a pool that cannot make a team */
    const picked = [];
    for (const pos of Object.keys(KEEP)) {
      const atPos = players.filter(p => p.p === pos).sort((a, b) => b.r - a.r || a.n.localeCompare(b.n));
      picked.push(...atPos.slice(0, KEEP[pos]));
    }
    /* The fieldable test runs on WHAT IS KEPT, not on the raw pool. The first
       version tested the raw pool and then capped below it, so Slovakia 2025
       passed on four centre halves and shipped three. Check the thing you are
       actually going to ship. */
    let short = null;
    for (const g of ['GK', 'DEF', 'MID', 'ATT']) {
      const inGroup = picked.filter(p => p.g === g);
      if (inGroup.length < NEED[g]) { short = `${g} ${inGroup.length}/${NEED[g]}`; break; }
    }
    if (short) { skipped.push(`${nation} ${year} (${short})`); continue; }
    picked.sort((a, b) => b.r - a.r || a.n.localeCompare(b.n));
    out.set(`${nation}|${year}`, picked.map(p => `${p.n}:${p.p}:${p.r}`).join(','));
    kept += 1;
    totalPlayers += picked.length;
  }
  console.log(`${year}: ${rows.length} rows, ${byNation.size} nations, ${kept} with a fieldable pool`);
}

const keys = [...out.keys()].sort();
const body = keys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(out.get(k))},`).join('\n');

const header = `/* Real international pools, baked ${new Date(Date.parse(process.env.BAKE_DATE || '2026-08-21')).toISOString().slice(0, 10)}.
 *
 * Source: Supabase player_market_values_dedup, ${FIRST_YEAR} to ${LAST_YEAR}. Each entry is
 * one nation in one year: the best real players it had that year, picked per
 * position group so the pool can always field an eleven, encoded as
 * "Name:POS:RATING" separated by commas. Ratings use the same 48-94 value
 * curve as clubManagerRosters, so one player is one number across the site.
 *
 * A nation whose pool that year could not cover a keeper, four defenders,
 * four midfielders and three forwards is ABSENT ON PURPOSE, and the squad
 * screen falls back to generated players for it. That is not a gap to fill
 * later: taking the most valuable sixteen of a thin nation produced fifteen
 * wide midfielders all rated 64, which is worse than an honest invention.
 *
 * ${keys.length} nation seasons, ${totalPlayers} player rows.
 * DO NOT EDIT BY HAND. Regenerate with: node scripts/bakeNationalPools.mjs
 */
export const NATIONAL_POOL_YEARS = { first: ${FIRST_YEAR}, last: ${LAST_YEAR} };

/** key is "Nation|Year", value is "Name:POS:RATING,Name:POS:RATING,..." */
export const NATIONAL_POOLS: Record<string, string> = {
${body}
};
`;

const target = path.join(ROOT, 'src/data/nationalPools.ts');
fs.writeFileSync(target, header);
console.log(`\nwrote ${target}`);
console.log(`${keys.length} nation seasons, ${totalPlayers} players, ${(fs.statSync(target).size / 1024).toFixed(0)}KB`);
console.log(`${skipped.length} nation seasons skipped for a pool that could not field a team`);
console.log(`  examples: ${skipped.slice(0, 5).join('; ')}`);
