/**
 * Round 154 harness: create your own club.
 *
 * The owner's ask, 2026-08-17, verbatim: "create a create my team for the
 * manger game and its full customizatable with crests and stadium and
 * starting money and everything if everything."
 *
 * The design under test: a custom club REPLACES the weakest club of its
 * chosen league for that save only, its day-one squad is generated players
 * top to bottom (the real market is where real players come from), its def
 * (rank, tier, color) answers through a per-save registry, and its crest is
 * abstract geometry plus sanitized initials.
 *
 * What would catch a real regression here:
 *  - a custom club allowed to wear a real club's name (the engine is
 *    name-keyed; a second "Arsenal" would merge with the real one everywhere)
 *  - the replaced club still turning up in the table, the cup, the results,
 *    the buyers, the suitors, in season one OR after a summer rollover
 *  - a real footballer in the generated day-one squad
 *  - a small-tier custom board demanding the title anywhere in the world
 *  - the custom spec not surviving a save/load roundtrip, or a stale
 *    registration coloring a real club's career
 *  - crest markup that lets user input escape into it
 *
 * Run: node scripts/simCreateClub.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/createClubEntry.mjs';
const BUNDLE = '/tmp/createClub.bundle.mjs';

fs.writeFileSync(ENTRY, `
const STORE = new Map();
globalThis.localStorage = {
  getItem: k => (STORE.has(k) ? STORE.get(k) : null),
  setItem: (k, v) => { STORE.set(k, String(v)); },
  removeItem: k => { STORE.delete(k); },
};
const mod = await import('${ROOT}/src/lib/clubManager.ts');
const eras = await import('${ROOT}/src/lib/clubManagerEras.ts');
const e10 = await import('${ROOT}/src/data/clubManagerEra2010.ts');
export const cm = mod;
export const worlds = { modern: (await import('${ROOT}/src/data/clubManagerRosters.ts')).CM_ROSTERS, era2010: e10.ERA2010_ROSTERS };
export const erasMod = eras;
`);
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`,
  { stdio: 'inherit' },
);

const { cm, worlds } = await import(BUNDLE);
const {
  startCareer, startNextSeason, finishSeason, playNextEntry, sortedTable, buildMarket,
  validateCustomClubName, crestSvg, sanitizeCrestInitials, registerCustomClub,
  clubDefFor, boardWantLabel, saveCareer, loadCareer, clearCareer,
  REAL_LEAGUES, ERA_LEAGUES, playableClubs, CUSTOM_TIERS, CREST_SHAPES, CREST_PATTERNS,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;

const CREST = { shape: 0, pattern: 2, color1: '#7c3aed', color2: '#f8fafc', initials: 'RA' };
const spec = (over = {}) => ({
  name: 'Real Anthony', stadium: 'Salguero Park', crest: { ...CREST },
  budgetTier: 'mid', leagueId: 'premier', replacedClub: '', ...over,
});

const playSeason = (state) => {
  let s = state;
  for (let i = 0; i < 90; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
};

/* Every real player name in every world, for the no-real-players check. */
const REAL_PLAYER_NAMES = new Set();
for (const world of Object.values(worlds)) {
  for (const roster of Object.values(world)) for (const p of roster) REAL_PLAYER_NAMES.add(p.n);
}

/* ---------- 1. The name guard ---------- */
console.log('1) A custom club cannot wear a real club\'s name');
{
  const everyRealClub = [
    ...REAL_LEAGUES.flatMap(l => l.clubs),
    ...Object.values(ERA_LEAGUES).flat().flatMap(l => l.clubs),
  ];
  let passedRealNames = 0;
  for (const club of everyRealClub) {
    if (validateCustomClubName(club) === null) { passedRealNames += 1; fail(`"${club}" was accepted as a custom club name`); }
  }
  // The folding: diacritics, case, badge-prefix noise and famous alternate
  // forms of clubs the game names differently all still collide.
  for (const tricky of [
    'Malaga', 'malaga', 'MALAGA', 'FC Barcelona', 'Hercules', 'Atletico Madrid',
    'Paris Saint-Germain', 'bayern munich', 'Tottenham Hotspur', 'Internazionale',
    'Wolverhampton Wanderers', 'Sporting Lisbon',
  ]) {
    if (validateCustomClubName(tricky) === null) fail(`"${tricky}" slipped past the collision fold`);
  }
  for (const fine of ['Real Anthony', 'Salguero City', 'DoUKnow United', 'AS Anthony 04']) {
    const err = validateCustomClubName(fine);
    if (err !== null) fail(`"${fine}" was rejected: ${err}`);
  }
  if (validateCustomClubName('ab') === null) fail('a 2-character name was accepted');
  if (validateCustomClubName('x'.repeat(30)) === null) fail('a 30-character name was accepted');
  console.log(`   ${everyRealClub.length} real club names checked, ${passedRealNames} wrongly accepted`);
}

/* ---------- 2. Day one: the swap, the squad, the market ---------- */
console.log('2) Day one is your club, generated squad, real market');
{
  Math.random = seeded(41);
  const s = startCareer('Real Anthony', 'now', spec());
  const replaced = s.customClub?.replacedClub;
  if (!replaced || !REAL_LEAGUES[0].clubs.includes(replaced)) {
    fail(`replacedClub is "${replaced}", not a Premier League club`);
  }
  if (s.leagueClubs.length !== 20) fail(`league has ${s.leagueClubs.length} clubs`);
  if (!s.leagueClubs.includes('Real Anthony')) fail('my club is not in leagueClubs');
  if (s.leagueClubs.includes(replaced)) fail(`${replaced} is still in leagueClubs`);
  if (s.uclGroup !== null) fail('a brand new club started inside the Champions League');
  if (s.budget !== CUSTOM_TIERS.mid.budget) fail(`mid tier budget is ${s.budget}, expected ${CUSTOM_TIERS.mid.budget}`);
  if (s.customClub?.stadium !== 'Salguero Park') fail(`stadium came out as "${s.customClub?.stadium}"`);

  const realInSquad = s.squad.filter(p => REAL_PLAYER_NAMES.has(p.name));
  if (realInSquad.length) fail(`real players in the generated day-one squad: ${realInSquad.map(p => p.name).join(', ')}`);
  const untagged = s.squad.filter(p => !p.generated && !p.isYouth);
  if (untagged.length) fail(`${untagged.length} squad players are not tagged generated`);
  if (s.squad.length < 22) fail(`day-one squad is only ${s.squad.length} strong`);
  const gks = s.squad.filter(p => p.position === 'GK').length;
  if (gks < 2) fail(`only ${gks} goalkeepers generated`);
  const dupes = s.squad.length - new Set(s.squad.map(p => p.name)).size;
  if (dupes) fail(`${dupes} duplicate names inside the generated squad`);

  // The def answers through the registry: my color, an honest bottom-end rank.
  const def = clubDefFor('Real Anthony');
  if (def.color !== '#7c3aed') fail(`clubDefFor color is ${def.color}`);
  if (def.expectation < 15) fail(`a mid-tier custom club ranks #${def.expectation} in the Premier League, which flatters it wildly`);
  const want = boardWantLabel('Real Anthony');
  if (/Win the/.test(want)) fail(`day-one Premier League board wants "${want}"`);
  if (/Top \d+/i.test(want)) fail(`board want uses banned phrasing: "${want}"`);

  // The market is the real one, and the replaced club's players are still on
  // it BY DESIGN: those players exist, their club is just not in your game.
  const market = buildMarket(s);
  if (market.length < 300) fail(`market holds only ${market.length} players`);
  const realOnMarket = market.filter(p => REAL_PLAYER_NAMES.has(p.name)).length;
  if (realOnMarket / Math.max(1, market.length) < 0.95) fail(`only ${realOnMarket}/${market.length} market players are real`);
  if (!market.some(p => p.club === replaced)) fail(`${replaced}'s players vanished from the market; they should remain, labeled, by design`);
  console.log(`   replaced ${replaced} · squad ${s.squad.length} all generated · market ${market.length} (${realOnMarket} real) · rank #${def.expectation} · wants "${want}"`);
}

/* ---------- 3. The replaced club is out of the world, all season ---------- */
console.log('3) The displaced club appears nowhere a club can act');
{
  Math.random = seeded(97);
  const s0 = startCareer('Real Anthony', 'now', spec({ budgetTier: 'small' }));
  const replaced = s0.customClub.replacedClub;
  const s = playSeason(s0);
  const table = sortedTable(s.table);
  if (table.length !== 20) fail(`final table has ${table.length} rows`);
  const myRow = table.find(r => r.club === 'Real Anthony');
  if (!myRow) fail('my club is missing from the final table');
  else if (myRow.w + myRow.d + myRow.l !== 38) fail(`my club played ${myRow.w + myRow.d + myRow.l} league games`);
  if (table.some(r => r.club === replaced)) fail(`${replaced} is in the final table`);
  for (const tie of s.cupBracket ?? []) {
    if (tie.home === replaced || tie.away === replaced) fail(`${replaced} is in the cup bracket (${tie.round})`);
  }
  const mine = (s.cupBracket ?? []).filter(t => t.round === 'R16' && t.mine).length;
  if (mine !== 1) fail(`my club holds ${mine} R16 cup ties`);
  for (const r of s.resultLog ?? []) {
    if (r.home === replaced || r.away === replaced) fail(`${replaced} played a logged fixture`);
  }
  for (const h of s.aiHeadlines ?? []) {
    if (h.startsWith(`${replaced} sign `)) fail(`${replaced} is buying players: "${h}"`);
  }
  for (const t of s.transferLog ?? []) {
    if (t.to === replaced) fail(`${replaced} signed ${t.name} in the transfer log`);
  }
  const fin = finishSeason(s);
  if ((fin.summary.offers ?? []).some(o => o.club === replaced)) fail(`${replaced} offered me a job`);
  console.log(`   season complete, finished #${table.indexOf(myRow) + 1}, ${replaced} fully absent`);
}

/* ---------- 4. Boards read the squad, not the wallet ---------- */
console.log('4) Custom boards are honest at every tier, everywhere');
{
  Math.random = seeded(13);
  let titleDemands = 0;
  const ranks = {};
  for (const lg of REAL_LEAGUES) {
    const s = startCareer('Real Anthony', 'now', spec({ leagueId: lg.id, budgetTier: 'small' }));
    const league = s.boardObjectives.find(o => o.id === 'league');
    if (!league) { fail(`no league objective in ${lg.id}`); continue; }
    if (/Win the/.test(league.label)) { titleDemands += 1; fail(`a SMALL custom club in ${lg.id} is told "${league.label}"`); }
    if (/Top \d+/i.test(league.label)) fail(`banned phrasing in ${lg.id}: "${league.label}"`);
    const rival = s.boardObjectives.find(o => o.id === 'rival');
    if (rival) {
      if (rival.rivalName === s.customClub.replacedClub) fail(`${lg.id}: my rival is the club I replaced`);
      if (!s.leagueClubs.includes(rival.rivalName)) fail(`${lg.id}: rival ${rival.rivalName} is not in my league this save`);
    }
  }
  /* Rank monotonicity is measured in the Eredivisie, where the tiers can
     actually separate (measured 2026-08-17: ranks #11 / #7 / #4). In the
     Premier League all three tiers honestly rank about #20, which makes a
     monotonicity check there pass without testing anything. */
  for (const tier of ['small', 'mid', 'big']) {
    const s = startCareer('Real Anthony', 'now', spec({ budgetTier: tier, leagueId: 'eredivisie' }));
    ranks[tier] = clubDefFor('Real Anthony').expectation;
  }
  if (!(ranks.big < ranks.mid && ranks.mid < ranks.small)) {
    fail(`Eredivisie ranks do not separate by tier: small #${ranks.small}, mid #${ranks.mid}, big #${ranks.big}`);
  }
  // And in the stacked Premier League, honesty means the bottom end.
  const plBig = startCareer('Real Anthony', 'now', spec({ budgetTier: 'big' }));
  const plRank = clubDefFor('Real Anthony').expectation;
  if (plRank < 15) fail(`a big-tier custom club ranks #${plRank} in the Premier League, which flatters it wildly`);
  if (plBig.boardObjectives.some(o => o.id === 'league' && /Win the/.test(o.label))) {
    fail('a day-one custom club is told to win the Premier League');
  }
  console.log(`   ${REAL_LEAGUES.length} leagues checked at small tier, 0 title demands expected, ${titleDemands} found · Eredivisie ranks s/m/b: #${ranks.small}/#${ranks.mid}/#${ranks.big} · PL big rank #${plRank}`);
}

/* ---------- 5. Seasons complete at every tier; the summer keeps the club ---------- */
console.log('5) Three tiers play full seasons; the rollover keeps your club');
{
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const run = (tier, leagueId, i) => {
    Math.random = seeded(i * 7919 + tier.length * 31 + leagueId.length);
    const s = playSeason(startCareer('Real Anthony', 'now', spec({ budgetTier: tier, leagueId })));
    const table = sortedTable(s.table);
    return table.findIndex(r => r.club === 'Real Anthony') + 1;
  };
  const plSmall = [1, 2, 3].map(i => run('small', 'premier', i));
  const plBig = [1, 2, 3].map(i => run('big', 'premier', i));
  console.log(`   PL finishes · small: ${plSmall.join(',')} · big: ${plBig.join(',')}`);
  // Measured 2026-08-17: PL small mean 20.0, big mean 19.7. The Premier
  // League crushes both, which is the honest shape; the assert is only that
  // a 62-anchor squad never lands top half there.
  if (mean(plSmall) < 12) fail(`small-tier custom club averaged #${mean(plSmall).toFixed(1)} in the Premier League`);
  // Money separates where the league allows it. Measured in the Eredivisie
  // 2026-08-17: small 16-17th (mean 16.7), big 1-5th (mean 2.3). A gap of 5
  // places keeps honest daylight under fourteen places of measured headroom.
  const erSmall = [1, 2, 3].map(i => run('small', 'eredivisie', i));
  const erBig = [1, 2, 3].map(i => run('big', 'eredivisie', i));
  console.log(`   Eredivisie finishes · small: ${erSmall.join(',')} · big: ${erBig.join(',')}`);
  if (mean(erBig) > mean(erSmall) - 5) {
    fail(`Eredivisie: big money (mean ${mean(erBig).toFixed(1)}) does not clearly beat small money (mean ${mean(erSmall).toFixed(1)})`);
  }

  // The summer rollover: club kept, swap recomputed, replaced club still out.
  Math.random = seeded(31337);
  const s1 = playSeason(startCareer('Real Anthony', 'now', spec()));
  const s2 = startNextSeason(s1);
  if (!s2.customClub) fail('the rollover dropped my custom club');
  if (!s2.leagueClubs.includes('Real Anthony')) fail('season two league lost my club');
  if (s2.leagueClubs.includes(s2.customClub?.replacedClub)) fail('season two still fields the replaced club');
  if (s2.leagueClubs.length !== 20) fail(`season two league has ${s2.leagueClubs.length} clubs`);
  if (!s2.clubStrengths['Real Anthony']) fail('season two has no strength for my club');
  const s2want = s2.boardObjectives.find(o => o.id === 'league');
  if (s2want && /Top \d+/i.test(s2want.label)) fail(`season two board says "${s2want.label}"`);

  // Walking away: the club dies with your tenure, the registry clears.
  const s2b = startNextSeason(s1, 'Arsenal');
  if (s2b.customClub) fail('moving to Arsenal kept the custom spec on the save');
  if (s2b.clubName !== 'Arsenal') fail(`moving landed at ${s2b.clubName}`);
  if (s2b.leagueClubs.includes('Real Anthony')) fail('my abandoned club still plays in the league');
  if (clubDefFor('Real Anthony').color === '#7c3aed') fail('the registry still answers for a club that no longer exists');
  console.log(`   rollover kept the club (replaced: ${s2.customClub?.replacedClub}); leaving dissolved it`);
}

/* ---------- 6. Save, load, and no bleed into real careers ---------- */
console.log('6) The spec survives save/load; real careers stay untouched');
{
  Math.random = seeded(71);
  const s = startCareer('Real Anthony', 'now', spec());
  saveCareer(s);
  const back = loadCareer();
  if (!back) fail('the custom save did not load at all');
  else {
    if (JSON.stringify(back.customClub) !== JSON.stringify(s.customClub)) fail('customClub did not roundtrip byte for byte');
    if (clubDefFor('Real Anthony').color !== '#7c3aed') fail('loading did not re-register the custom club');
  }
  // A save whose customClub does not match its clubName is tampered: strip it.
  const tampered = JSON.parse(JSON.stringify(s));
  tampered.clubName = 'Arsenal';
  saveCareer(tampered);
  const cleaned = loadCareer();
  if (cleaned?.customClub) fail('a mismatched customClub survived loading');
  // A plain real-club career clears the registry on both paths.
  Math.random = seeded(72);
  const arsenal = startCareer('Arsenal', 'now');
  if (arsenal.customClub) fail('a real-club career carries a customClub');
  if (clubDefFor('Real Anthony').color === '#7c3aed') fail('starting a real career left the old registration alive');
  if (clubDefFor('Arsenal').color !== '#ef0107') fail(`Arsenal's color came back ${clubDefFor('Arsenal').color}`);
  if (!arsenal.squad.some(p => REAL_PLAYER_NAMES.has(p.name))) fail('an Arsenal career has no real players, the registry polluted buildSquad');
  saveCareer(arsenal);
  const backArsenal = loadCareer();
  if (backArsenal?.customClub) fail('loading a real save invented a customClub');
  clearCareer();
  console.log('   roundtrip clean, tampered save stripped, real careers unpolluted');
}

/* ---------- 7. The crest is sealed ---------- */
console.log('7) Crest markup is deterministic, self-contained and injection-proof');
{
  let checked = 0;
  for (let sh = 0; sh < CREST_SHAPES.length; sh++) {
    for (let pa = 0; pa < CREST_PATTERNS.length; pa++) {
      const svg = crestSvg({ shape: sh, pattern: pa, color1: '#dc2626', color2: '#f8fafc', initials: 'AB' }, 40);
      checked += 1;
      if (!svg.startsWith('<svg')) fail(`shape ${sh} pattern ${pa}: not an svg`);
      const external = svg.replace('xmlns="http://www.w3.org/2000/svg"', '');
      if (/https?:/.test(external)) fail(`shape ${sh} pattern ${pa}: external reference in crest`);
      if (/url\((?!#)/.test(svg)) fail(`shape ${sh} pattern ${pa}: non-fragment url() in crest`);
    }
  }
  const a = crestSvg({ ...CREST }, 40);
  const b = crestSvg({ ...CREST }, 40);
  if (a !== b) fail('the same spec produced two different crests');
  const evil = crestSvg({ shape: 0, pattern: 0, color1: '"><script>alert(1)</script>', color2: '#fff', initials: '<img src=x>' }, 40);
  if (/<script|<img|alert\(/.test(evil)) fail('user input escaped into the crest markup');
  if (sanitizeCrestInitials('a!b@c#d') !== 'ABC') fail(`initials sanitize gave "${sanitizeCrestInitials('a!b@c#d')}"`);
  console.log(`   ${checked} shape x pattern combos sealed, injection attempts neutralized`);
}

Math.random = REAL_RANDOM;
registerCustomClub(null);
console.log('');
if (failures > 0) {
  console.error(`simCreateClub: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simCreateClub: green. Found a club, and the world makes room for it.');
