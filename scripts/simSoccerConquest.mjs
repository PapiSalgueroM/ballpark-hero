/* Round 459: the Soccer Conquest, measured against its own basis.
 *
 * THE GAME: /soccer-conquest plays the imperialism format with the 96 clubs
 * of the 2026-27 top five leagues on a hex cartogram of Europe, through the
 * shared engine (src/lib/imperialismEngine.ts) with the sport injected from
 * src/data/soccerConquest.ts. Nothing in that file is a typed rating: the
 * strength of every club is its 2026 squad market value on record, and the
 * membership is the same list Club Manager plays.
 *
 * WHAT THIS HOLDS:
 *   1. MEMBERSHIP IS CLUB MANAGER'S. The 96 names equal REAL_LEAGUES' five
 *      top flights, so a promotion applied in one file cannot be missed in
 *      the other.
 *   2. STRENGTH IS THE MARKET, NOT A HAND. Every club's value and row count
 *      in the data file equal the saved pull (scripts/data/
 *      soccerConquestValues.json), every overall equals strengthFromValue of
 *      that value, the band is 55 to 95, more value never means less
 *      strength, and the partial list is exactly the clubs under the row
 *      floor. --refresh re-pulls the table through the same query the file
 *      documents and rewrites both files.
 *   3. THE MAP IS WHOLE. 154 regions, symmetric borders, every club's home
 *      region seeded to it, every region seeded to a club of its own country
 *      that the engine knows, every label inside the viewBox, and the guide
 *      copy carries the real region and matchday counts.
 *   4. EVERY SEASON ENDS WITH ONE CHAMPION, over hundreds of seeded seasons
 *      through the real engine (the board's loop: random pairings, the
 *      eight club bracket, total conquest), no club is dead (every club
 *      annexes land at least once), no region is frozen (every region
 *      changes hands at least once), and the crown is not a fixed outcome.
 *   5. THE DAILY REPLAYS BYTE IDENTICAL. The same date deals the same
 *      season twice, another date deals a different one.
 *   6. STRENGTH TRACKS THE BASIS. Win rate over the seeded seasons correlates
 *      with the market strength, and a control that SHUFFLES the strengths
 *      among the clubs breaks that correlation and changes who wins.
 *   7. THE LEADERBOARD CAP IS THE PERFECT RUN. game_score_caps carries the
 *      completion key at exactly perfectScore (needs the database).
 *
 * NEGATIVE CONTROLS (SIM_SOCCER_CONQUEST_CONTROL=...), each refusing to run
 * if its rewrite changed nothing:
 *   typed   a copy of the data file gives every club overall 75, a typed
 *           flat rating; sections 2 and 6 must go red.
 *   ghost   a copy drops one club from the club table while its home region
 *           keeps naming it; section 3 (an owner the engine does not know)
 *           and section 4 (a region nobody can take) must go red.
 *
 * Run: node scripts/simSoccerConquest.mjs
 *      node scripts/simSoccerConquest.mjs --refresh   (re-pulls the values, needs the database)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const TMP = os.tmpdir().replace(/\\/g, '/');
const DATA_SRC = `${ROOT}/src/data/soccerConquest.ts`;
const VALUES_FILE = `${ROOT}/scripts/data/soccerConquestValues.json`;
const GUIDE_SRC = `${ROOT}/src/data/gameContent/soccer2.ts`;
const CONTROL = process.env.SIM_SOCCER_CONQUEST_CONTROL || '';
const REFRESH = process.argv.includes('--refresh');
const KNOWN_CONTROLS = ['typed', 'ghost'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`SIM_SOCCER_CONQUEST_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN_CONTROLS.join(', ')})`);
  process.exit(1);
}
const SEASONS = 300;
const norm = s => s.replace(/\r\n/g, '\n');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const refuse = m => { console.error(`control ${CONTROL}: ${m}, refusing to run a dead control`); process.exit(1); };

/* ---------- the database, read the way the site reads it ---------- */
const client = fs.readFileSync(`${ROOT}/src/integrations/supabase/client.ts`, 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };
async function rest(pathAndQuery) {
  let last = '';
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 400 * attempt));
    try {
      const r = await fetch(`${URL_}/rest/v1/${pathAndQuery}`, { headers: HEAD });
      if (r.ok) return r.json();
      last = `${r.status} ${await r.text()}`;
      if (r.status === 401 || r.status === 403 || r.status === 400) break;
    } catch (e) { last = String(e); }
  }
  throw new Error(`the database refused ${pathAndQuery}: ${last}`);
}

/* ---------- --refresh: re-pull the values and rewrite both files ---------- */
if (REFRESH) {
  const saved = JSON.parse(fs.readFileSync(VALUES_FILE, 'utf8'));
  let src = norm(fs.readFileSync(DATA_SRC, 'utf8'));
  let drift = 0;
  for (const [id, entry] of Object.entries(saved.clubs)) {
    let rows = 0, total = 0;
    for (const alias of entry.aliases) {
      const got = await rest(`player_market_values?select=market_value_usd&year=eq.${saved.year}&club=eq.${encodeURIComponent(alias)}&limit=1000`);
      rows += got.length;
      total += got.reduce((t, r) => t + Number(r.market_value_usd || 0), 0);
    }
    if (rows !== entry.rows || total !== entry.totalUsd) {
      drift += 1;
      console.log(`   ${id}: ${entry.rows} rows / ${entry.totalUsd} -> ${rows} rows / ${total}`);
    }
    entry.rows = rows;
    entry.totalUsd = total;
    const re = new RegExp(`(\\['${id}', '[^']+', '[A-Z]{3}', '[A-Z_]+', )\\d+, \\d+\\]`);
    if (!re.test(src)) { console.error(`--refresh: no CLUB_ROWS line for ${id} in soccerConquest.ts`); process.exit(1); }
    src = src.replace(re, `$1${total}, ${rows}]`);
  }
  saved.pulledAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(VALUES_FILE, JSON.stringify(saved, null, 2) + '\n');
  fs.writeFileSync(DATA_SRC, src);
  console.log(`--refresh: ${Object.keys(saved.clubs).length} clubs re-pulled for ${saved.year}, ${drift} changed, both files rewritten`);
}

/* ---------- the control rewrites, in a temp copy ---------- */
const dataSource = norm(fs.readFileSync(DATA_SRC, 'utf8'));
let dataSrcPath = DATA_SRC;
function controlCopy(needle, replacement, what) {
  if (!dataSource.includes(needle)) refuse(`the line to rewrite is not in soccerConquest.ts (${needle})`);
  const rewritten = dataSource.replace(needle, replacement);
  if (rewritten === dataSource) refuse('the rewrite changed nothing');
  dataSrcPath = `${TMP}/soccerConquest.control.ts`;
  fs.writeFileSync(dataSrcPath, rewritten);
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${what}`);
}
if (CONTROL === 'typed') {
  controlCopy('overall: strengthFromValue(valueUsd),', 'overall: 75,', 'every club is a typed 75, sections 2 and 6 must go red');
}
if (CONTROL === 'ghost') {
  controlCopy("  ['LEM', 'Le Mans', 'FRA', 'FRA_MANS', ", "  // ['LEM', 'Le Mans', 'FRA', 'FRA_MANS', ", 'Le Mans is gone from the club table while Le Mans the region still names it, sections 3 and 4 must go red');
}

/* ---------- bundle the real modules ---------- */
const ENTRY = `${TMP}/soccerConquest.entry.mjs`;
const BUNDLE = `${TMP}/soccerConquest.bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as data from '${dataSrcPath}';
export * as eng from '${ROOT}/src/lib/imperialismEngine.ts';
export * as daily from '${ROOT}/src/lib/conquestDaily.ts';
export { REAL_LEAGUES } from '${ROOT}/src/lib/clubManager.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=node --alias:@=${ROOT}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: `${ROOT}/node_modules` },
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: () => null, length: 0 };
const { data, eng, daily, REAL_LEAGUES } = createRequire(import.meta.url)(BUNDLE);
const { SOCCER_CLUBS, SOCCER_CONQUEST_MAP: MAP, SOCCER_IMPERIALISM: SPORT, INITIAL_TERRITORIES_SOCCER: SEED, SOCCER_CONQUEST_PARTIAL, PARTIAL_ROWS, OVERALL_MIN, OVERALL_MAX, strengthFromValue, SOCCER_CONQUEST_GAME } = data;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* The board's season loop, step for step: random pairings for the regular
   rounds, then the eight seeds paired first against last, three bracket
   rounds, a total conquest ending it early. */
function playSeason(sport, rng, favorite = null, predict = null) {
  let owners = eng.seedEmpires(sport);
  let records = eng.emptyRecords(sport);
  let bracket = null, champion = null, round = 1, hits = 0, calls = 0, madePlayoffs = false;
  const annexed = new Set();
  const flips = {};
  const wins = {};
  const played = {};
  const log = [];
  let landedAtPlayoff = 0;
  while (!champion) {
    let pairs;
    if (bracket) {
      const s = bracket.alive;
      pairs = [];
      for (let i = 0; i < s.length / 2; i++) pairs.push([s[i], s[s.length - 1 - i]]);
    } else {
      pairs = eng.randomPairings(sport, rng);
    }
    const featured = favorite ? pairs.find(([h, a]) => h === favorite || a === favorite) : null;
    const guess = featured && predict ? predict(featured, owners, records) : null;
    const next = { ...owners };
    const games = pairs.map(([h, a]) => eng.resolveGame(sport, h, a, next, rng, records));
    records = eng.applyRecords(records, games);
    for (const g of games) {
      const loser = g.winner === g.home ? g.away : g.home;
      wins[g.winner] = (wins[g.winner] || 0) + 1;
      played[g.winner] = (played[g.winner] || 0) + 1;
      played[loser] = (played[loser] || 0) + 1;
      if (g.swing > 0) { annexed.add(g.winner); for (const r of g.flipped) flips[r] = (flips[r] || 0) + 1; }
    }
    if (guess) {
      calls += 1;
      const fg = games.find(g => (g.home === featured[0] && g.away === featured[1]) || (g.home === featured[1] && g.away === featured[0]));
      if (fg && fg.winner === guess) hits += 1;
    }
    log.push(games.map(g => `${g.home}${g.homeScore}-${g.awayScore}${g.away}${g.overtime ? 'p' : ''}`).join(','));
    owners = next;
    if (bracket) {
      const winners = games.map(g => g.winner);
      if (bracket.round >= 2 || winners.length === 1) { champion = winners[0]; break; }
      bracket = { round: bracket.round + 1, alive: winners };
      continue;
    }
    const wiped = eng.totalConquest(next);
    if (wiped) { champion = wiped; break; }
    if (round >= sport.regularRounds) {
      const seeds = eng.playoffSeeds(sport, next, records);
      landedAtPlayoff = new Set(Object.values(next)).size;
      madePlayoffs = favorite ? seeds.includes(favorite) : false;
      bracket = { round: 0, alive: seeds };
    } else {
      round += 1;
    }
  }
  const score = favorite ? eng.finalScore(favorite, owners, hits, champion, madePlayoffs) : 0;
  return { champion, owners, records, annexed, flips, wins, played, hits, calls, madePlayoffs, rounds: log.length, log, score, landedAtPlayoff };
}

/* ---------- 1: membership is Club Manager's ---------- */
console.log('1) The 96 clubs are the five top flights Club Manager plays');
{
  const want = new Map();
  for (const id of ['premier', 'laliga', 'seriea', 'bundesliga', 'ligue1']) {
    const lg = REAL_LEAGUES.find(l => l.id === id);
    if (!lg) { fail(`REAL_LEAGUES has no league ${id}`); continue; }
    want.set(lg.name, new Set(lg.clubs));
  }
  const have = new Map();
  for (const c of SOCCER_CLUBS) {
    if (!have.has(c.league)) have.set(c.league, new Set());
    have.get(c.league).add(c.name);
  }
  let matched = 0;
  for (const [league, names] of want) {
    const got = have.get(league) ?? new Set();
    const missing = [...names].filter(n => !got.has(n));
    const extra = [...got].filter(n => !names.has(n));
    if (missing.length || extra.length) fail(`${league}: missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'}`);
    else matched += names.size;
  }
  console.log(`   ${SOCCER_CLUBS.length} clubs, ${matched} names matched across ${want.size} leagues`);
  if (SOCCER_CLUBS.length !== 96) fail(`${SOCCER_CLUBS.length} clubs, expected 96`);
  const ids = new Set(SOCCER_CLUBS.map(c => c.id));
  if (ids.size !== SOCCER_CLUBS.length) fail('duplicate club ids');
}

/* ---------- 2: strength is the market ---------- */
console.log('2) Strength is the market value on record, never a typed number');
{
  const saved = JSON.parse(fs.readFileSync(VALUES_FILE, 'utf8'));
  let agree = 0, drift = [], wrongOverall = 0, outOfBand = 0, inversions = 0;
  for (const c of SOCCER_CLUBS) {
    const s = saved.clubs[c.id];
    if (!s) { drift.push(`${c.id} has no saved pull`); continue; }
    if (s.rows !== c.valueRows || s.totalUsd !== c.valueUsd) drift.push(`${c.id} file says ${c.valueUsd}/${c.valueRows}, pull says ${s.totalUsd}/${s.rows}`);
    else agree += 1;
    if (c.overall !== strengthFromValue(c.valueUsd)) wrongOverall += 1;
    if (c.overall < OVERALL_MIN || c.overall > OVERALL_MAX) outOfBand += 1;
  }
  const byValue = [...SOCCER_CLUBS].sort((a, b) => a.valueUsd - b.valueUsd);
  for (let i = 1; i < byValue.length; i++) if (byValue[i].overall < byValue[i - 1].overall) inversions += 1;
  const partialWant = SOCCER_CLUBS.filter(c => c.valueRows < PARTIAL_ROWS).map(c => c.id).sort().join(',');
  const partialHave = [...SOCCER_CONQUEST_PARTIAL].sort().join(',');
  const ov = SOCCER_CLUBS.map(c => c.overall).sort((a, b) => a - b);
  const ageDays = Math.round((Date.now() - Date.parse(saved.pulledAt)) / 86400000);
  console.log(`   ${agree} of ${SOCCER_CLUBS.length} clubs match the saved ${saved.year} pull (${saved.pulledAt}, ${ageDays} days old); overalls ${ov[0]} to ${ov[ov.length - 1]}, median ${ov[Math.floor(ov.length / 2)]}; ${wrongOverall} not derived from the value, ${outOfBand} outside ${OVERALL_MIN}..${OVERALL_MAX}, ${inversions} value order inversions; partial: ${partialHave || 'none'}`);
  for (const d of drift.slice(0, 5)) fail(d);
  if (drift.length > 5) fail(`and ${drift.length - 5} more clubs drifted from the pull`);
  if (wrongOverall > 0) fail(`${wrongOverall} clubs carry an overall that is not strengthFromValue of their value: a typed rating`);
  if (outOfBand > 0) fail(`${outOfBand} clubs outside the ${OVERALL_MIN} to ${OVERALL_MAX} band`);
  if (inversions > 0) fail(`${inversions} clubs are worth more than a neighbour and rated lower`);
  if (partialWant !== partialHave) fail(`partial list is ${partialHave || 'empty'}, the row floor says ${partialWant || 'empty'}`);
  if (ov[ov.length - 1] - ov[0] < 20) fail(`the band in use is only ${ov[ov.length - 1] - ov[0]} points wide, the market is not reaching the engine`);
}

/* ---------- 3: the map is whole ---------- */
console.log('3) The map is whole: borders, homes, seeding, viewBox, guide counts');
{
  const regions = MAP.regions;
  const ids = new Set(regions.map(r => r.id));
  let oneWay = 0, unknown = 0, outside = 0;
  for (const [a, ns] of Object.entries(MAP.adjacency)) {
    if (!ids.has(a)) unknown += 1;
    for (const b of ns) if (!MAP.adjacency[b] || !MAP.adjacency[b].includes(a)) oneWay += 1;
  }
  for (const r of regions) {
    if (!(r.id in MAP.adjacency)) unknown += 1;
    if (r.labelX < 0 || r.labelY < 0 || r.labelX > MAP.viewBox.width || r.labelY > MAP.viewBox.height) outside += 1;
  }
  const clubIds = new Set(SOCCER_CLUBS.map(c => c.id));
  const countryOf = new Map(regions.map(r => [r.id, r.country]));
  let homeSeeded = 0, unknownOwner = [], crossCountry = 0, unseeded = 0;
  for (const c of SOCCER_CLUBS) if (SEED[c.home] === c.id) homeSeeded += 1;
  for (const r of regions) {
    const owner = SEED[r.id];
    if (!owner) { unseeded += 1; continue; }
    if (!clubIds.has(owner)) { unknownOwner.push(`${r.id}->${owner}`); continue; }
    const club = SOCCER_CLUBS.find(c => c.id === owner);
    if (club.country !== countryOf.get(r.id)) crossCountry += 1;
  }
  const guide = norm(fs.readFileSync(GUIDE_SRC, 'utf8'));
  const block = (guide.split("'/soccer-conquest': {")[1] || '').split("\n  '/")[0];
  const saysRegions = block.includes(`${regions.length} regions`);
  const saysRounds = block.includes(`${SPORT.regularRounds} matchdays`) || block.includes(`${SPORT.regularRounds} regular matchdays`);
  const saysClubs = block.includes(`${SOCCER_CLUBS.length}`);
  const registry = norm(fs.readFileSync(`${ROOT}/src/data/gameRegistry.ts`, 'utf8'));
  const entry = registry.split('\n').find(l => l.includes(`path: '${SOCCER_CONQUEST_GAME.path}'`)) || '';
  console.log(`   ${regions.length} regions, viewBox ${MAP.viewBox.width}x${MAP.viewBox.height}, ${oneWay} one way borders, ${unknown} border rows without a drawing, ${outside} labels outside the viewBox`);
  console.log(`   ${homeSeeded} of ${SOCCER_CLUBS.length} clubs open on their home region, ${unseeded} regions unseeded, ${unknownOwner.length} seeded to an owner the engine does not know, ${crossCountry} seeded across a border`);
  console.log(`   guide says ${regions.length} regions: ${saysRegions ? 'yes' : 'NO'}; says ${SPORT.regularRounds} matchdays: ${saysRounds ? 'yes' : 'NO'}; says ${SOCCER_CLUBS.length} clubs: ${saysClubs ? 'yes' : 'NO'}; registry entry ${entry ? 'present' : 'MISSING'}${entry.includes('daily: true') ? ', daily' : ', NOT daily'}`);
  if (oneWay > 0) fail(`${oneWay} one way border edges`);
  if (unknown > 0) fail(`${unknown} regions drawn and bordered inconsistently`);
  if (outside > 0) fail(`${outside} labels outside the viewBox`);
  if (homeSeeded !== SOCCER_CLUBS.length) fail(`${SOCCER_CLUBS.length - homeSeeded} clubs do not open on their home region`);
  if (unseeded > 0) fail(`${unseeded} regions open with no owner`);
  if (unknownOwner.length > 0) fail(`regions seeded to a club that is not in the engine: ${unknownOwner.join(' ')}`);
  if (crossCountry > 0) fail(`${crossCountry} regions open under a club from another country`);
  if (!saysRegions || !saysRounds || !saysClubs) fail('the guide copy does not carry the real region, matchday and club counts');
  if (!entry) fail('no registry entry for the route');
  else if (!entry.includes('daily: true')) fail('the registry entry is not marked daily');
}

/* ---------- 4: hundreds of seasons through the real engine ---------- */
console.log(`4) ${SEASONS} seeded seasons: one champion each, no dead club, no frozen region`);
const seasons = [];
{
  const champions = new Map();
  const annexedEver = new Set();
  const flipsEver = {};
  let totalConquests = 0, roundsSum = 0, landedSum = 0, bad = 0;
  for (let s = 0; s < SEASONS; s++) {
    const r = playSeason(SPORT, mulberry32(459000 + s));
    seasons.push(r);
    if (!r.champion || !SPORT.teams.some(t => t.id === r.champion)) { bad += 1; continue; }
    champions.set(r.champion, (champions.get(r.champion) || 0) + 1);
    for (const id of r.annexed) annexedEver.add(id);
    for (const [region, n] of Object.entries(r.flips)) flipsEver[region] = (flipsEver[region] || 0) + n;
    if (r.rounds < SPORT.regularRounds + 3) totalConquests += 1;
    roundsSum += r.rounds;
    landedSum += r.landedAtPlayoff;
  }
  const dead = SPORT.teams.filter(t => !annexedEver.has(t.id)).map(t => t.id);
  const frozen = MAP.regions.filter(r => !flipsEver[r.id]).map(r => r.id);
  const top = [...champions.entries()].sort((a, b) => b[1] - a[1]);
  const topShare = top.length ? top[0][1] / SEASONS : 1;
  console.log(`   ${SEASONS - bad} seasons ended with one champion, ${totalConquests} by total conquest; ${(roundsSum / SEASONS).toFixed(1)} rounds per season, ${(landedSum / SEASONS).toFixed(1)} clubs landed at the playoff`);
  console.log(`   ${champions.size} different champions, top ${top.slice(0, 5).map(([id, n]) => `${id} ${n}`).join(', ')}; clubs that never annexed: ${dead.join(' ') || 'none'}; regions that never changed hands: ${frozen.join(' ') || 'none'}`);
  if (bad > 0) fail(`${bad} seasons did not end with a champion the engine knows`);
  if (dead.length > 0) fail(`${dead.length} dead clubs never took land in ${SEASONS} seasons`);
  if (frozen.length > 0) fail(`${frozen.length} regions never changed hands in ${SEASONS} seasons`);
  /* Measured on 2026-09-05 over 300 seasons: 46 different champions, the
     favourite (Manchester City) taking 26, which is 8.7 percent, every season
     running the full 13 rounds and 13.6 clubs landed at the playoff. A single
     club above a third of the crowns is a snowball, not a season, and under
     twenty champions is a fixed crown; both sit far from the measurement. */
  if (champions.size < 20) fail(`only ${champions.size} different champions in ${SEASONS} seasons, the crown is close to fixed`);
  if (topShare > 0.34) fail(`${top[0][0]} took ${(100 * topShare).toFixed(0)}% of the crowns`);
}

/* ---------- 5: the daily replays byte identical ---------- */
console.log('5) The daily deals the same season twice, and another day deals another');
{
  const favorite = SOCCER_CLUBS[0].id;
  const predict = ([h]) => h;
  const a = playSeason(SPORT, daily.dailyConquestRng('soccer', '2026-09-05'), favorite, predict);
  const b = playSeason(SPORT, daily.dailyConquestRng('soccer', '2026-09-05'), favorite, predict);
  const c = playSeason(SPORT, daily.dailyConquestRng('soccer', '2026-09-06'), favorite, predict);
  const same = JSON.stringify([a.log, a.owners, a.score]) === JSON.stringify([b.log, b.owners, b.score]);
  const differs = JSON.stringify(a.log) !== JSON.stringify(c.log);
  console.log(`   2026-09-05 twice: ${same ? 'identical' : 'DIFFERENT'} (${a.rounds} rounds, champion ${a.champion}, score ${a.score}); 2026-09-06: ${differs ? 'a different season' : 'THE SAME season'}`);
  if (!same) fail('the same date dealt two different seasons');
  if (!differs) fail('two dates dealt the same season, the date is not in the seed');
}

/* ---------- 6: strength tracks the basis, and a shuffle changes who wins ---------- */
console.log('6) Win rate follows the market strength, and shuffling the strengths changes who wins');
{
  const pearson = (xs, ys) => {
    const n = xs.length;
    const mx = xs.reduce((t, v) => t + v, 0) / n, my = ys.reduce((t, v) => t + v, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
  };
  const rateOf = runs => {
    const w = {}, p = {};
    for (const r of runs) for (const t of SPORT.teams) { w[t.id] = (w[t.id] || 0) + (r.wins[t.id] || 0); p[t.id] = (p[t.id] || 0) + (r.played[t.id] || 0); }
    return SPORT.teams.map(t => (p[t.id] ? w[t.id] / p[t.id] : 0));
  };
  const overall = SPORT.teams.map(t => t.overall);
  const real = pearson(overall, rateOf(seasons));
  // the shuffle: the same clubs, the same map, the strengths dealt out at random
  const shuffled = [...overall];
  const srng = mulberry32(4590);
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(srng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const sportShuffled = { ...SPORT, teams: SPORT.teams.map((t, i) => ({ ...t, overall: shuffled[i] })) };
  const runs = [];
  for (let s = 0; s < SEASONS; s++) runs.push(playSeason(sportShuffled, mulberry32(459000 + s)));
  const control = pearson(overall, rateOf(runs));
  const realChamps = new Map(); for (const r of seasons) realChamps.set(r.champion, (realChamps.get(r.champion) || 0) + 1);
  const ctrlChamps = new Map(); for (const r of runs) ctrlChamps.set(r.champion, (ctrlChamps.get(r.champion) || 0) + 1);
  const realTop = [...realChamps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
  const ctrlTop = [...ctrlChamps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
  const overlap = realTop.filter(id => ctrlTop.includes(id)).length;
  const moved = seasons.filter((r, i) => r.champion !== runs[i].champion).length;
  console.log(`   win rate vs market strength r = ${real.toFixed(3)}; with the strengths shuffled r = ${Number.isFinite(control) ? control.toFixed(3) : 'n/a'}; top 8 champions overlap ${overlap} of 8; ${moved} of ${SEASONS} seasons crown a different club under the shuffle`);
  /* Measured 2026-09-05 over 300 seasons: r = 0.998 real, r = -0.035 with the
     strengths shuffled, 1 of the top 8 champions in common, 297 of 300
     seasons crowning a different club. The floors and ceilings below leave
     that distribution a long way to fall before they fire. */
  if (!Number.isFinite(real) || real < 0.75) fail(`win rate does not follow the market strength (r = ${real})`);
  if (!Number.isFinite(control) || control > 0.35) fail(`the shuffle did not break the link to the market (r = ${control}), so the engine is not reading the strengths`);
  if (moved < SEASONS * 0.7) fail(`the shuffle changed the champion in only ${moved} of ${SEASONS} seasons`);
  if (overlap > 5) fail(`${overlap} of the top 8 champions survived the shuffle`);
}

/* ---------- 7: the leaderboard cap is the perfect run ---------- */
console.log('7) The leaderboard cap row is the measured perfect run');
{
  const perfect = eng.perfectScore(SPORT);
  const key = SOCCER_CONQUEST_GAME.gameId;
  try {
    const rows = await rest(`game_score_caps?select=game,max_score&game=eq.${encodeURIComponent(key)}`);
    const cap = rows[0]?.max_score;
    console.log(`   perfect run ${perfect} (${MAP.regions.length} regions x 3 + ${SPORT.regularRounds + 3} calls x 25 + 250); cap row for ${key}: ${cap ?? 'MISSING'}`);
    if (cap == null) fail(`${key} has no game_score_caps row, so every point earned in it is discarded`);
    else if (Number(cap) !== perfect) fail(`the cap row says ${cap}, the perfect run measures ${perfect}`);
  } catch (e) {
    fail(String(e.message || e));
  }
}

/* No process.exit after the fetch above: on Windows node aborts on a libuv
   assertion when the keep alive socket is still closing, which turned a
   green run into a non zero exit. Set the code and let the loop drain. */
if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exitCode = 0; }
  else { console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`); process.exitCode = 1; }
} else {
  console.log(failures === 0 ? '\nALL SOCCER CONQUEST CHECKS PASSED' : `\n${failures} FAILURES`);
  process.exitCode = failures === 0 ? 0 : 1;
}
