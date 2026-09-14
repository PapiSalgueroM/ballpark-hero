/**
 * simFootleLeagues: Footle's two club-to-league maps must agree with the
 * season the rest of the site is playing.
 *
 * THE DEFECT THIS EXISTS FOR (found 2026-09-13, fixed in Round 560).
 * src/data/footleEnrichment.ts CLUB_TO_LEAGUE and
 * src/lib/fetchFootlePlayerPool.ts INSANE_CLUB_LEAGUE were both written
 * against the 2025/26 season and were never moved when the season turned.
 * Club Manager had already been re-based on 2026-27 (REAL_LEAGUES in
 * src/lib/clubManager.ts carries the promotions and relegations with a dated
 * comment per league), so the same site was simultaneously telling a Club
 * Manager player that West Ham are a Championship club and a Footle player
 * that West Ham are a Premier League club. Hull City, newly promoted, had no
 * entry at all, so their seventeen rows in the live 2026 pool read 'Other'.
 *
 * WHY A HARNESS AND NOT JUST A FIX. The same rot is guaranteed to happen
 * again every August unless something refuses to let it. A promoted club is
 * the cheapest possible wrong fact to ship: nothing crashes, tsc is happy,
 * and the only person who notices is a player who knows the league.
 *
 * WHAT IT CHECKS.
 *  0. The REAL_LEAGUES parse itself is sane, because getting that wrong is
 *     the failure mode that wasted the first pass at this: clubManager.ts
 *     also holds ERA league definitions in the same {id, name, clubs} shape,
 *     and reading those as current membership "proved" that Leicester are a
 *     2026-27 Premier League club and that Coventry are in two divisions at
 *     once. The parse is bounded to the REAL_LEAGUES array literal, and this
 *     section fails if any club ends up in two different Footle leagues.
 *  1. No map entry contradicts REAL_LEAGUES.
 *  2. No map entry claims a league the site models while REAL_LEAGUES' own
 *     membership for that league does not contain the club. This is the one
 *     that catches relegation out of the modelled world: Verona claiming
 *     Serie A after going down to Serie B.
 *  3. CLUB_TO_LEAGUE names every club in both English divisions. Those two
 *     are the ones the live pool is thickest in and the ones that churn every
 *     season, so completeness there means a promotion is a move between two
 *     blocks rather than a club quietly dropping out of the map.
 *
 * WHAT IT DELIBERATELY DOES NOT CHECK. Completeness outside England. Both
 * maps are fallbacks for clubs that actually appear in the pool, so filling
 * them with all 330 REAL_LEAGUES clubs under REAL_LEAGUES' short spellings
 * would add rows the database never matches and call it coverage.
 *
 * CONTROLS (each rewrites the source text and refuses to run if the rewrite
 * changed nothing, so green can never mean "the control did not fire"):
 *   FOOTLE_LEAGUES_CONTROL=relegated  a Championship club put back in the
 *                                     Premier League, section 1 must fire
 *   FOOTLE_LEAGUES_CONTROL=missing    an English club deleted from
 *                                     CLUB_TO_LEAGUE, section 3 must fire
 *   FOOTLE_LEAGUES_CONTROL=erapool    the REAL_LEAGUES parse unbounded so the
 *                                     era definitions leak in, section 0 must
 *                                     fire. This reproduces the exact wrong
 *                                     reading described above.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.FOOTLE_LEAGUES_CONTROL || '';
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const CM = 'src/lib/clubManager.ts';
const FE = 'src/data/footleEnrichment.ts';
const FP = 'src/lib/fetchFootlePlayerPool.ts';

let failures = 0;
const fail = msg => { console.error('  FAIL: ' + msg); failures += 1; };
const fired = new Set();
const section = n => ({ fail: msg => { fired.add(n); fail(msg); } });

/* A control that edits nothing is a control that proves nothing. */
const rewrite = (src, from, to, what) => {
  if (!src.includes(from)) {
    console.error(`CONTROL ${CONTROL} cannot run: ${what} not found in the source.`);
    console.error('The control is stale, so this run would have been green for the wrong reason.');
    process.exit(2);
  }
  return src.split(from).join(to);
};

// ---------------------------------------------------------------------------
// 0. Parse REAL_LEAGUES, bounded to its own array literal.
// ---------------------------------------------------------------------------
const cmSrc = read(CM);
const parseRealLeagues = (src, bounded) => {
  const decl = src.indexOf('export const REAL_LEAGUES');
  if (decl < 0) { fail(`${CM} no longer declares REAL_LEAGUES`); return []; }
  // The '[' of the value, not the one in the "LeagueDef[]" type annotation.
  const open = src.indexOf('[', src.indexOf('=', decl));
  let end = open;
  if (bounded) {
    let depth = 0;
    for (; end < src.length; end++) {
      if (src[end] === '[') depth++;
      else if (src[end] === ']') { depth--; if (depth === 0) break; }
    }
  } else {
    end = src.length - 1; // the control: read on into the era definitions
  }
  const body = src.slice(open, end + 1);
  const re = /id:\s*'([^']+)',\s*name:\s*'([^']+)'[\s\S]*?clubs:\s*\[([^\]]*)\]/g;
  const out = [];
  let m;
  while ((m = re.exec(body))) {
    out.push({ id: m[1], name: m[2], clubs: [...m[3].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x => x[1]) });
  }
  return out;
};
const leagues = parseRealLeagues(cmSrc, CONTROL !== 'erapool');

console.log('--- 0. the REAL_LEAGUES parse ---');
const totalClubs = leagues.reduce((a, l) => a + l.clubs.length, 0);
console.log(`  read ${leagues.length} leagues and ${totalClubs} club rows from ${CM}`);
if (leagues.length < 15) section(0).fail(`only ${leagues.length} leagues parsed, expected the full REAL_LEAGUES list`);
if (totalClubs < 250) section(0).fail(`only ${totalClubs} club rows parsed, expected the full REAL_LEAGUES list`);

/* Footle's label for each REAL_LEAGUES league the site models under a name of
   its own. A league missing here is simply not cross-checked, so the list is
   printed rather than assumed. */
const FOOTLE_LABEL = {
  'Premier League': 'Premier League', 'EFL Championship': 'EFL Championship',
  'La Liga': 'La Liga', 'Serie A': 'Serie A', 'Bundesliga': 'Bundesliga',
  '2. Bundesliga': '2. Bundesliga', 'Ligue 1': 'Ligue 1', 'Eredivisie': 'Eredivisie',
  'Saudi Pro League': 'Saudi Pro League',
  'MLS Eastern Conference': 'MLS', 'MLS Western Conference': 'MLS',
  'Primeira Liga': 'Liga Portugal', 'Scottish Premiership': 'Scottish Premiership',
  'Süper Lig': 'Turkish Süper Lig', 'Belgian Pro League': 'Belgian Pro League',
  'Austrian Bundesliga': 'Austrian Bundesliga', 'Super League Greece': 'Greek Super League',
  'Danish Superliga': 'Danish Superliga', 'Swiss Super League': 'Swiss Super League',
  'SuperSport HNL': 'Croatian HNL',
};
const unlabelled = leagues.map(l => l.name).filter(n => !FOOTLE_LABEL[n]);
console.log(`  not cross-checked, no Footle label: ${unlabelled.length ? unlabelled.join(', ') : '(none)'}`);

/* Normalisation. Both sides are hand typed by different people at different
   times, so 'Wolverhampton Wanderers' and 'Wolves' have to meet somewhere.
   Generic club-form tokens drop; anything that is a genuinely different name
   gets an explicit alias below, and every alias is checked against
   REAL_LEAGUES so a typo cannot quietly stop a club being compared. */
const DROP = new Set(['fc', 'cf', 'sc', 'afc', 'ac', 'as', 'ss', 'ssc', 'acf', 'bc', 'cfc',
  'kv', 'krc', 'kaa', 'rsc', 'royal', 'sv', 'vfl', 'vfb', 'tsg', 'sk', 'rc', 'losc', 'aj',
  'ud', 'ca', 'rcd', 'club', 'calcio', 'us', 'sl', 'gd', 'jk', 'ogc', 'stade', 'olympique',
  'sfc', 'cd', 'bk', 'ff', 'if', 'fsv', 'estac', 'gnk', 'hnk', 'the']);
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t && !DROP.has(t)).join(' ');

const ALIAS = {
  // England
  'wolverhampton wanderers': 'wolves', 'wolverhampton': 'wolves',
  'west bromwich albion': 'west brom', 'queens park rangers': 'qpr',
  'brighton hove albion': 'brighton', 'tottenham hotspur': 'tottenham',
  'newcastle united': 'newcastle', 'west ham united': 'west ham',
  // Spain
  'athletic bilbao': 'athletic', 'atletico de madrid': 'atletico madrid',
  'celta de vigo': 'celta vigo', 'deportivo alaves': 'alaves',
  'deportivo de la coruna': 'deportivo la coruna',
  'espanyol barcelona': 'espanyol', 'real betis balompie': 'real betis',
  'real oviedo': 'oviedo',
  // Italy
  'hellas verona': 'verona', 'bologna 1909': 'bologna', 'como 1907': 'como',
  'parma 1913': 'parma', 'pisa sporting': 'pisa',
  // Germany
  '1 koln': 'koln', '1 union berlin': 'union berlin', '1 mainz 05': 'mainz',
  'mainz 05': 'mainz', 'bayer 04 leverkusen': 'bayer leverkusen',
  '1899 hoffenheim': 'hoffenheim', '1 heidenheim 1846': 'heidenheim',
  'hamburger': 'hamburg', 'borussia monchengladbach': 'gladbach',
  'monchengladbach': 'gladbach', 'paderborn 07': 'paderborn',
  '07 elversberg': 'elversberg',
  // France
  'paris saint germain': 'psg', 'olympique marseille': 'marseille',
  'olympique lyon': 'lyon', 'angers sco': 'angers',
  'strasbourg alsace': 'strasbourg', 'brestois 29': 'brest', 'havre': 'le havre',
  'rennais': 'rennes',
  // elsewhere
  'ajax amsterdam': 'ajax', 'feyenoord rotterdam': 'feyenoord', 'psv eindhoven': 'psv',
  'red bull salzburg': 'rb salzburg', 'salzburg': 'rb salzburg', 'sturm graz': 'sturm graz',
  'olympiacos piraeus': 'olympiacos', 'paok thessaloniki': 'paok',
  'basaksehir fk': 'basaksehir', 'basel 1893': 'basel', 'st gallen 1879': 'st gallen',
  'red bull new york': 'new york red bulls', 'los angeles galaxy': 'la galaxy',
  'los angeles': 'lafc', 'brugge kv': 'brugge', 'estoril praia': 'estoril',
};
const key = s => { const n = norm(s); return ALIAS[n] || n; };

const realOf = new Map();
const labelsPerClub = new Map();
for (const l of leagues) {
  const label = FOOTLE_LABEL[l.name];
  for (const c of l.clubs) {
    const k = key(c);
    if (!realOf.has(k)) realOf.set(k, []);
    realOf.get(k).push({ league: l.name, label, spelling: c });
    if (label) {
      if (!labelsPerClub.has(k)) labelsPerClub.set(k, new Set());
      labelsPerClub.get(k).add(label);
    }
  }
}
const doubled = [...labelsPerClub].filter(([, set]) => set.size > 1);
if (doubled.length) {
  for (const [k, set] of doubled.slice(0, 8)) {
    section(0).fail(`"${k}" is in two leagues at once (${[...set].join(' and ')}), so the parse is reading something that is not this season's membership`);
  }
  if (doubled.length > 8) section(0).fail(`and ${doubled.length - 8} more clubs in two leagues at once`);
} else {
  console.log('  every club sits in exactly one of the leagues Footle models');
}

/* A false merge is the dangerous direction for a normaliser: two different
   clubs collapsing to one key would have each vouching for the other's
   league. Two spellings of the SAME club sharing a key is the whole point. */
const spellingsPerKey = new Map();
for (const l of leagues) for (const c of l.clubs) {
  if (!spellingsPerKey.has(key(c))) spellingsPerKey.set(key(c), new Set());
  spellingsPerKey.get(key(c)).add(`${c} (${l.name})`);
}
const merged = [...spellingsPerKey].filter(([, set]) => set.size > 1);
for (const [k, set] of merged) {
  fail(`normalising collapses two REAL_LEAGUES clubs onto "${k}": ${[...set].join(' and ')}`);
}
if (!merged.length) console.log(`  no two REAL_LEAGUES clubs collapse onto one name under the ${Object.keys(ALIAS).length} spelling aliases`);

/* Aliases whose target is in no modelled league are not broken, they are
   clubs that dropped out of the modelled world. Printed so the reader can see
   which, because a long list here would mean the season data has moved on. */
const outside = Object.entries(ALIAS).filter(([, v]) => !realOf.has(v)).map(([k, v]) => `${k} -> ${v}`);
console.log(`  aliases pointing outside the modelled leagues: ${outside.length ? outside.join(', ') : '(none)'}`);

// ---------------------------------------------------------------------------
// The two maps.
// ---------------------------------------------------------------------------
const readMap = (src, marker, where) => {
  const start = src.indexOf(marker);
  if (start < 0) { fail(`${where} no longer declares ${marker}`); return {}; }
  const open = src.indexOf('{', start);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  // Strip comments first: the prose explaining a club's league names both the
  // club and the league, and would be read as an entry.
  const body = src.slice(open + 1, i).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ');
  const out = {};
  for (const e of body.matchAll(/'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g)) out[e[1]] = e[2];
  return out;
};

let feSrc = read(FE);
const fpSrc = read(FP);
if (CONTROL === 'relegated') {
  feSrc = rewrite(feSrc, `'Burnley FC': 'EFL Championship',`, `'Burnley FC': 'Premier League',`,
    'the Burnley entry');
}
if (CONTROL === 'missing') {
  feSrc = rewrite(feSrc, `'Hull City': 'Premier League',`, ` `, 'the Hull City entry');
}
const maps = [
  { name: 'CLUB_TO_LEAGUE', file: FE, entries: readMap(feSrc, 'const CLUB_TO_LEAGUE', FE) },
  { name: 'INSANE_CLUB_LEAGUE', file: FP, entries: readMap(fpSrc, 'export const INSANE_CLUB_LEAGUE', FP) },
];
const MODELLED = new Set(Object.values(FOOTLE_LABEL));

// ---------------------------------------------------------------------------
// 1. No entry may contradict REAL_LEAGUES.
// ---------------------------------------------------------------------------
console.log('\n--- 1. no club is in one league here and another in REAL_LEAGUES ---');
for (const map of maps) {
  let compared = 0;
  for (const [club, lg] of Object.entries(map.entries)) {
    const hits = realOf.get(key(club));
    if (!hits) continue;
    const want = [...new Set(hits.map(h => h.label).filter(Boolean))];
    if (!want.length) continue;
    compared += 1;
    if (!want.includes(lg)) {
      section(1).fail(`${map.file}: "${club}" is ${lg} here and ${want.join(' / ')} in REAL_LEAGUES`);
    }
  }
  if (compared === 0) {
    section(1).fail(`${map.name}: not one entry matched a REAL_LEAGUES club, so this section checked nothing`);
  } else {
    console.log(`  ${map.name}: ${compared} of ${Object.keys(map.entries).length} entries name a club REAL_LEAGUES carries, and all agree`);
  }
}

// ---------------------------------------------------------------------------
// 2. No entry may claim a modelled league it is not a member of.
// ---------------------------------------------------------------------------
console.log('\n--- 2. nobody claims a league they were relegated out of ---');
for (const map of maps) {
  let claims = 0;
  for (const [club, lg] of Object.entries(map.entries)) {
    if (!MODELLED.has(lg)) continue;
    claims += 1;
    if (!realOf.has(key(club))) {
      section(2).fail(`${map.file}: "${club}" claims ${lg}, but REAL_LEAGUES has no such club in any 2026-27 competition`);
    }
  }
  console.log(`  ${map.name}: ${claims} entries claim a league the site models`);
}

// ---------------------------------------------------------------------------
// 3. CLUB_TO_LEAGUE covers both English divisions in full.
// ---------------------------------------------------------------------------
console.log('\n--- 3. both English divisions are named in full ---');
const have = new Set(Object.keys(maps[0].entries).map(key));
for (const l of leagues.filter(x => x.id === 'premier' || x.id === 'championship')) {
  const missing = l.clubs.filter(c => !have.has(key(c)));
  if (missing.length) {
    section(3).fail(`${FE}: ${l.name} is missing ${missing.join(', ')}, so those clubs' players would read "Other"`);
  } else {
    console.log(`  ${l.name}: all ${l.clubs.length} clubs present`);
  }
}

// ---------------------------------------------------------------------------
const EXPECT = { relegated: 1, missing: 3, erapool: 0 };
if (CONTROL) {
  const want = EXPECT[CONTROL];
  if (want === undefined) { console.error(`Unknown FOOTLE_LEAGUES_CONTROL "${CONTROL}"`); process.exit(2); }
  if (fired.has(want)) {
    console.log(`\nCONTROL ${CONTROL}: section ${want} fired, as it must. The check works.`);
    process.exit(0);
  }
  console.error(`\nCONTROL ${CONTROL}: section ${want} did NOT fire. The check is not measuring what it claims to.`);
  process.exit(1);
}
if (failures) { console.error(`\nsimFootleLeagues: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimFootleLeagues: both Footle club maps agree with the season Club Manager is playing.');
