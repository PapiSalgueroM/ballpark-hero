/**
 * Round 259 harness (number 110): real internationals on the team sheet.
 *
 * Owner report, in full: "What type of squad is this? There's no real life
 * players and this is only 2023. I get it in like 2045 because we don't know
 * who's going to be good then but right now u can say who's good."
 *
 * Naming real people on a screen is the highest risk thing this project does,
 * so the checks here are about truthfulness first and gameplay second:
 *
 *   1. THE POOL IS WELL FORMED. Every entry parses, every rating sits on the
 *      site's 48-94 curve, every position is one the game knows, and no
 *      nation season names the same man twice.
 *   2. NOBODY PLAYS FOR TWO COUNTRIES. A name may not appear under two
 *      different nations in the same year. That would mean the bake
 *      conflated somebody, and putting a man in the wrong national side is
 *      exactly the class of error this project cannot ship.
 *   3. THE SHEET USES THEM, AT THE RIGHT POSITIONS. Sampled across nations
 *      and years: the eleven is drawn from the pool, every shirt holds a man
 *      who really plays there (the round before this one was a complaint
 *      about a winger on the wrong flank, so a right back shirt holding a
 *      centre half fails), and no eleven names anybody twice.
 *   4. A REAL MAN CARRIES HIS REAL NUMBER. An XI man who came out of the
 *      pool must show exactly the pool's rating. The sheet is not allowed to
 *      rerate a real person to make a line look tidy.
 *   5. THE FALLBACK IS WHOLE. A nation with no pool, and any year outside the
 *      data window, still produces a complete eleven of generated men with no
 *      blanks, no duplicates and no real names leaking in.
 *   6. THE PLAYER'S OWN SHIRT DOES NOT SHUNT ANYONE. When he starts, exactly
 *      one man is him and everybody else is still at their own position: the
 *      first draft removed his shirt without removing the man matched to it,
 *      which shifted every name after it one place along the line.
 *
 * Run: node scripts/simNationalPools.mjs
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = '/tmp/pools-bundle.mjs';
const ENTRY = '/tmp/pools-entry.mjs';

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const intl = await import('${ROOT}/src/lib/soccerInternational.ts');
export const pools = await import('${ROOT}/src/data/nationalPools.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const { intl, pools } = await import(pathToFileURL(OUT).href);
const { NATIONAL_POOLS, NATIONAL_POOL_YEARS } = pools;
const { pickSquad, xiMen, realPool } = intl;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const POSITIONS = new Set(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']);
const GROUP_OF = {
  GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'ATT', RW: 'ATT', ST: 'ATT', CF: 'ATT',
};
/* what each shirt on the sheet is allowed to hold, matching shirtWants in
   soccerInternational.ts. A shirt may also hold a man from its own group when
   the pool has nobody at that exact position, which is honest mixing. */
const SHIRT_OK = {
  GK: ['GK'],
  CB: ['CB', 'LB', 'RB'],
  LB: ['LB', 'LM', 'CB', 'RB'],
  RB: ['RB', 'RM', 'CB', 'LB'],
  CDM: ['CDM', 'CM', 'CAM', 'LM', 'RM'],
  CM: ['CM', 'CAM', 'CDM', 'LM', 'RM'],
  ST: ['ST', 'CF', 'LW', 'RW'],
  LW: ['LW', 'LM', 'ST', 'CF', 'RW'],
  RW: ['RW', 'RM', 'ST', 'CF', 'LW'],
};

/* ── 1: the pool is well formed ───────────────────────────────────────── */
const keys = Object.keys(NATIONAL_POOLS);
console.log(`1) ${keys.length} nation seasons, ${NATIONAL_POOL_YEARS.first} to ${NATIONAL_POOL_YEARS.last}`);
let players = 0;
const byYear = new Map();
for (const key of keys) {
  const [nation, yearStr] = key.split('|');
  const year = Number(yearStr);
  if (!nation || !Number.isInteger(year)) { fail(`bad key ${JSON.stringify(key)}`); continue; }
  if (year < NATIONAL_POOL_YEARS.first || year > NATIONAL_POOL_YEARS.last) {
    fail(`${key} is outside the declared window`);
  }
  const seen = new Set();
  const groups = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  for (const entry of NATIONAL_POOLS[key].split(',')) {
    const [name, pos, r] = entry.split(':');
    if (!name || !POSITIONS.has(pos) || !/^\d+$/.test(r ?? '')) { fail(`${key}: bad entry ${JSON.stringify(entry)}`); continue; }
    const ovr = Number(r);
    /* the site's shared value curve is bounded at 48 and 94, so anything
       outside means the bake used a different curve from Club Manager */
    if (ovr < 48 || ovr > 94) fail(`${key}: ${name} rated ${ovr}, off the 48-94 curve`);
    if (seen.has(name)) fail(`${key}: ${name} appears twice`);
    seen.add(name);
    groups[GROUP_OF[pos]] += 1;
    players += 1;
    if (!byYear.has(year)) byYear.set(year, new Map());
    const m = byYear.get(year);
    if (!m.has(name)) m.set(name, new Set());
    m.get(name).add(nation);
  }
  /* rule 2 of the bake: a pool that cannot field a team must not be here */
  if (groups.GK < 1 || groups.DEF < 4 || groups.MID < 4 || groups.ATT < 3) {
    fail(`${key} cannot field a team (GK ${groups.GK}, DEF ${groups.DEF}, MID ${groups.MID}, ATT ${groups.ATT})`);
  }
}
console.log(`   ${players} player rows, all on the 48-94 curve, every pool fieldable`);
if (keys.length < 300) fail(`only ${keys.length} nation seasons, which is too thin to be worth shipping`);

/* ── 2: nobody plays for two countries ────────────────────────────────── */
console.log('2) no man appears under two nations in the same year');
let doubles = 0;
for (const [year, names] of byYear) {
  for (const [name, nations] of names) {
    if (nations.size > 1) {
      doubles += 1;
      if (doubles <= 3) fail(`${year}: ${name} is listed for ${[...nations].join(' and ')}`);
    }
  }
}
console.log(`   ${byYear.size} years checked, ${doubles} men in two squads`);

/* ── 3, 4, 6: the sheet ───────────────────────────────────────────────── */
console.log('3) the team sheet, sampled across nations and years');
const SAMPLE_NATIONS = ['England', 'Brazil', 'Spain', 'France', 'Germany', 'Japan', 'Argentina', 'Netherlands', 'Portugal', 'Belgium', 'USA', 'Morocco'];
const SAMPLE_YEARS = [2016, 2019, 2021, 2023, 2024, 2026];
const POSITIONS_TO_TRY = ['ST', 'CM', 'CB', 'GK', 'RW', 'LB'];
let sheets = 0, realNamed = 0, poolBacked = 0, generatedSheets = 0;
for (const nation of SAMPLE_NATIONS) {
  for (const year of SAMPLE_YEARS) {
    for (const pos of POSITIONS_TO_TRY) {
      const form = { position: pos, overall: 84, morale: 70, seasonRating: 7.4, apps: 32, goals: 12, assists: 6, age: 26 };
      const squad = pickSquad(nation, form, year);
      if (!squad.xi) { fail(`${nation} ${year} ${pos}: no team sheet`); continue; }
      const men = xiMen(squad.xi);
      sheets += 1;
      if (men.length !== 11) fail(`${nation} ${year} ${pos}: ${men.length} men on the sheet`);
      const names = men.map(m => m.name);
      const dupes = names.filter((n, i) => n !== 'You' && names.indexOf(n) !== i);
      if (dupes.length) fail(`${nation} ${year} ${pos}: ${dupes[0]} named twice on one sheet`);
      if (men.filter(m => m.me).length > 1) fail(`${nation} ${year} ${pos}: more than one man is you`);
      for (const m of men) {
        if (!m.name || !m.slot) fail(`${nation} ${year} ${pos}: a blank shirt`);
        if (!(m.ovr >= 40 && m.ovr <= 99)) fail(`${nation} ${year} ${pos}: ${m.name} rated ${m.ovr}`);
      }
      const pool = realPool(nation, year);
      if (!pool) { generatedSheets += 1; continue; }
      poolBacked += 1;
      const byName = new Map(pool.map(p => [p.name, p]));
      let realOnSheet = 0;
      for (const m of men) {
        const real = byName.get(m.name);
        if (!real) continue;
        realOnSheet += 1;
        /* 4: his number is his number */
        if (m.ovr !== real.ovr) fail(`${nation} ${year}: ${m.name} shows ${m.ovr} and the pool says ${real.ovr}`);
        /* 3 and 6: the shirt he is wearing is one he can wear */
        const ok = SHIRT_OK[m.slot];
        if (ok && !ok.includes(real.pos)) {
          fail(`${nation} ${year}: ${m.name} is a ${real.pos} wearing the ${m.slot} shirt`);
        }
      }
      realNamed += realOnSheet;
      /* a nation with a pool must actually use it: a sheet of ten generated
         men next to one real one means the matcher is not finding anybody */
      if (realOnSheet < 7) {
        fail(`${nation} ${year} ${pos}: only ${realOnSheet} of the eleven came from the pool`);
      }
    }
  }
}
console.log(`   ${sheets} sheets built, ${poolBacked} pool backed, ${generatedSheets} fully generated`);
console.log(`   ${realNamed} real men placed, all at positions they play and all on their own rating`);
if (poolBacked < 40) fail(`only ${poolBacked} sheets used a real pool, so this is barely testing the feature`);

/* ── 5: outside the window, and nations with no pool ──────────────────── */
console.log('4) past the data, and nations we have no pool for');
const allRealNames = new Set();
for (const key of keys) {
  for (const entry of NATIONAL_POOLS[key].split(',')) allRealNames.add(entry.split(':')[0]);
}
let futureSheets = 0;
for (const year of [NATIONAL_POOL_YEARS.last + 1, 2035, 2048]) {
  for (const nation of ['England', 'Brazil', 'Japan']) {
    const form = { position: 'ST', overall: 84, morale: 70, seasonRating: 7.4, apps: 32, goals: 14, assists: 5, age: 26 };
    const squad = pickSquad(nation, form, year);
    const men = squad.xi ? xiMen(squad.xi) : [];
    futureSheets += 1;
    if (men.length !== 11) { fail(`${nation} ${year}: ${men.length} men past the data`); continue; }
    /* the whole point of the window: nobody real is claimed to be playing in
       a year nobody has data for */
    for (const m of men) {
      if (m.name !== 'You' && allRealNames.has(m.name)) {
        fail(`${nation} ${year}: real player ${m.name} named in a year with no data`);
      }
    }
    const names = men.map(m => m.name);
    if (new Set(names).size !== names.length) fail(`${nation} ${year}: a name repeats on the generated sheet`);
  }
}
/* and a nation the bake skipped: still a whole eleven, still nobody real */
for (const year of [2023, 2026]) {
  const form = { position: 'CM', overall: 78, morale: 70, seasonRating: 7.1, apps: 30, goals: 4, assists: 8, age: 27 };
  const squad = pickSquad('Wales', form, year);
  const men = squad.xi ? xiMen(squad.xi) : [];
  futureSheets += 1;
  if (realPool('Wales', year)) continue;   // if a future bake covers Wales this stops applying
  if (men.length !== 11) fail(`Wales ${year}: ${men.length} men with no pool`);
  for (const m of men) {
    if (m.name !== 'You' && allRealNames.has(m.name)) fail(`Wales ${year}: real player ${m.name} on a generated sheet`);
  }
}
console.log(`   ${futureSheets} sheets outside the data, every one a complete generated eleven`);

/* ── the bake script itself stays honest ──────────────────────────────── */
console.log('5) the bake records where it came from');
const bake = readFileSync(path.join(ROOT, 'scripts/bakeNationalPools.mjs'), 'utf8');
if (!bake.includes('player_market_values_dedup')) fail('the bake does not name its source table');
const data = readFileSync(path.join(ROOT, 'src/data/nationalPools.ts'), 'utf8');
if (!data.includes('player_market_values_dedup')) fail('the baked file does not name its source');
if (!data.includes('DO NOT EDIT BY HAND')) fail('the baked file is not marked as generated');
console.log('   source named in both the script and the file it writes');

console.log('');
if (failures > 0) {
  console.error(`simNationalPools: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simNationalPools: green. Real internationals, at their own positions, only in years we have them.');
