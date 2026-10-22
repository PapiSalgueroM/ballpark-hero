/**
 * Round 1524: Soccer Career's club owner tail (src/lib/soccerCareerOwner.ts).
 *
 * Until this round a career that bought a club got a random tier 3 or 4 club, a "Won the league!" coin and otherwise
 * an invented "Finished <random position>". Now he picks a club off a list for sale, every season is played on the
 * manager tail's own table (managerLeagueField for the field, playDugoutTable for the points), and before every
 * season he makes one call: where the budget goes. This harness bundles the real engine and holds all of it.
 *
 *   1) The clubs for sale: two per price band he can afford (4 at €200M, 6 at €250M or more, none under €50M), every
 *      price and debt is its tier band's, the list is the same on every visit and moves with the save, and the club
 *      he picks is the club he buys, for its price, with no Math.random draw. A name not on the list buys nothing.
 *      Every tile for a season before 2026-27 prints that season's own league (the ledgers' name for the league the
 *      club was in), and none when the ledgers place the club in no league, never today's label (review 2026-10-22).
 *   2) Every season's finish is the table's: over a fleet of owner tails through the engine, the result line names
 *      the position the stored table gives him, a title only from first, a promotion only from the top two of a
 *      lower tier, a relegation only from the bottom three, and the counters agree with the rows. The table is drawn
 *      from the save's own stream: the same season replays the same row whatever Math.random holds, and the next
 *      season is a new table (two seasons in a row in one league never show the same four rivals on the same points).
 *   3) Each call moves what it says it moves, paired against placing nothing on the same keyed seasons (common
 *      random numbers, so the only difference is the call): Sign players adds points this season and costs wages
 *      now; Fund the academy adds nothing this season, then points and money later; Grow the ground costs money
 *      now, never a point, and pays more over the horizon; Pay down the debt adds points and money at once.
 *   4) No dominant choice: over the same fleet, at a 6 season horizon every call beats every other call somewhere
 *      (points or money) by a margin, and at 3, 6 and 10 seasons no call is the best at both.
 *   5) An owner save from before this round (written by the base engine itself) loads, keeps its club and its
 *      rows byte for byte, and plays on from its next season on the table.
 *   6) Careers that never buy a club are byte equal to the base: seeded careers to retirement, then the manager,
 *      pundit and walk away tails, on the base engine and this one, every state after every step and the
 *      Math.random count equal.
 *
 * Measured on this branch (runner r1524-s4 and r1524-s7a for salt 1, this PC for salts 2 and 3; the bands below sit
 * well inside every salt):
 *   1) 4 clubs at €200M and €249M (tiers 4 4 3 3), 6 at €250M and €900M, 2 at €60M, none at €49M; 152 different clubs
 *      across 60 saves; 40 of 40 purchases the club picked, at its price, with no draw.
 *   2) 640 owner seasons: 0 finishes the table did not produce, 68 titles, 96 promotions, 33 relegations, 630 in a
 *      named league, 278 of a verified size; 30 of 30 seasons the same under two Math.random streams.
 *   3) at 6 seasons, against placing nothing (salts 1, 2, 3): Sign players +10.29, +10.19, +10.00 points and this
 *      season +5.00 points, -2.00M; Fund the academy +7.69, +7.49, +7.51 points and +6.28, +5.95, +5.62M, this season
 *      exactly 0 and 0; Grow the ground exactly 0 points, +11.95, +11.35, +11.29M, this season -1.20M; Pay down the
 *      debt +4.73, +4.87, +4.89 points and +7.20, +7.24, +7.05M, this season +0.77 points and +1.06M.
 *      Bands: 4 points and -0.5M (signings now), 4 points and 2M (academy over 6), -0.5M now and 5M over 6 (ground),
 *      0.3 points and 0.4M now (debt).
 *   4) the closest pair at 6 seasons is the academy against the debt: the debt pays 1.25M to 1.9M more, the academy
 *      gives 2.6 points more, against margins of 0.3M and 0.5 points. Most points and most money: squad and stadium at
 *      3 and 6 seasons, youth and stadium at 10.
 *   5) 12 of 12 old saves play on.  6) 16 careers, 790 states and draw counts, 96 manager seasons: 0 differ.
 * Added after the round's reviews (runner r1524-fix2, salts 1, 4 and 9): 1) 4464 tiles for 1995 to 2025, 0 name a
 * league the ledgers do not give the club that season (3086, 3086 and 3071 name none); control saleleague 3185 of
 * 4464. 2) 549, 550 and 550 back to back seasons in one league, 0 replay last season's four rivals on the same points;
 * control stalekey 319 of 556 (57 percent) against the bound of 1 percent.
 *
 * Negative controls, SIM_OWNER_CONTROL=<name>, each asserting the string it mutates is in its file exactly once
 * (exit 2 otherwise), each measured red: randomclub (section 1, the old random club), coin (section 2, the old
 * invented finish), mathrandom (section 2, the table off Math.random), squadnoop, youthnoop, stadiumnoop, debtnoop
 * (section 3, each call's effect gone), dominant (section 4, signings that pay), oldsave (section 5, a save with no
 * debt field), drawshift (section 6, one extra draw in the shared table). Added after the round's reviews:
 * saleleague (section 1, the tile's old league, today's label or the list's key, put back), stalekey (section 2,
 * the season dropped from the season's key, so every season of a club replays the last one's rivals), eager
 * (section 0, the owner tail in memory before it is loaded), bands (section 1, three clubs a band), overprice
 * (section 1, a band offered to a man 60M short of its price).
 * Options: SIM_OWNER_BASE=<sha> (default: git merge-base HEAD origin/main), SIM_OWNER_SALT=<n> (default 1),
 * SIM_OWNER_ONLY=<sections, e.g. 3,4>.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_OWNER_CONTROL ?? '';
const SALT = Number(process.env.SIM_OWNER_SALT || 1);
const ONLY = new Set((process.env.SIM_OWNER_ONLY || '1,2,3,4,5,6').split(',').map(s => Number(s.trim())));

const ENGINE = 'src/lib/soccerCareerEngine.ts';
const LEAGUE = 'src/lib/soccerCareerLeague.ts';
const OWNER = 'src/lib/soccerCareerOwner.ts';
const GATE = 'src/lib/soccerOwnerGate.ts';
const CONTROLS = {
  randomclub: [{ file: OWNER, from: '  if (!club) return null;', to: '  if (!club) return null; { const old = clubs.filter(c => c.tier >= 3); if (old.length) club.name = old[Math.floor(Math.random() * old.length)].name; }' }],
  coin: [{ file: OWNER, from: '    : (sizeUnknown ? `Finished ${finishZone(me.pos, leagueSize)}.` : `Finished ${ordinal(me.pos)}${ofSize} on ${me.pts} points.`);',
    to: '    : `Finished ${["3rd", "5th", "8th", "mid-table", "lower half"][Math.floor(Math.random() * 5)]}`;' }],
  mathrandom: [{ file: OWNER, from: 'const rng = keyedStream(`${input.key}|table`);', to: 'const rng = Math.random;' }],
  squadnoop: [{ file: OWNER, from: '  squadEdge: 5,', to: '  squadEdge: 0,' }],
  youthnoop: [{ file: OWNER, from: '  academyEdge: 1.5,', to: '  academyEdge: 0,' }, { file: OWNER, from: '  academySales: 0.2,', to: '  academySales: 0,' }],
  stadiumnoop: [{ file: OWNER, from: '  stadiumYield: 0.6,', to: '  stadiumYield: 0,' }],
  debtnoop: [{ file: OWNER, from: '  if (plan === "debt") debt = tenth(Math.max(0, debt - budget));', to: '' }],
  dominant: [{ file: OWNER, from: '  squadWages: 0.5,', to: '  squadWages: -3,' }],
  oldsave: [{ file: OWNER, from: '    debt: Math.max(0, num(os.debt)),', to: '    debt: Math.max(0, os.debt as number),' }],
  drawshift: [{ file: LEAGUE, from: '  const games = field.length * 2; // home and away vs each rival', to: '  rng(); const games = field.length * 2;' }],
  /* added after the round's reviews (2026-10-22) */
  saleleague: [{ file: OWNER, from: 'leagueLine: leagueSeasonLine(c, input.year),', to: 'leagueLine: leagueKeyInYear(c, input.year) ?? c.league,' }],
  stalekey: [{ file: OWNER, from: '|${own.club}|${season}`', to: '|${own.club}`' }],
  eager: [{ file: GATE, from: 'let OWNER: OwnerTailModule | null = null;', to: 'import * as EAGER from "./soccerCareerOwner";\nlet OWNER: OwnerTailModule | null = EAGER as unknown as OwnerTailModule;' }],
  bands: [{ file: OWNER, from: 'export const OWNER_PER_BAND = 2;', to: 'export const OWNER_PER_BAND = 3;' }],
  overprice: [{ file: OWNER, from: '    if (!(num(input.netWorth) >= band.price)) continue;', to: '    if (!(num(input.netWorth) + 60 >= band.price)) continue;' }],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}`); process.exit(2); }

let failures = 0;
const fail = m => { failures += 1; console.error(`  FAIL: ${m}`); };
const lf = s => s.split('\r\n').join('\n');

/* The base: the tree this round is cut from, or the merge base once main is merged in. */
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }).trim();
let BASE = process.env.SIM_OWNER_BASE || '';
if (!BASE && ONLY.has(5) || !BASE && ONLY.has(6)) {
  try { BASE = git(['merge-base', 'HEAD', 'origin/main']); } catch { BASE = ''; }
  if (!BASE) { console.error('no base: set SIM_OWNER_BASE or fetch origin/main'); process.exit(2); }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ownertail-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });
const norm = p => path.resolve(p).split(path.sep).join('/').toLowerCase();
let applied = 0;
/* The head arm: the tree as it is, with the control (if any) applied to its source as it loads. */
const controlPlugin = { name: 'owner-control', setup(b) {
  if (!CONTROL) return;
  const byFile = new Map();
  for (const edit of CONTROLS[CONTROL]) byFile.set(norm(path.join(ROOT, edit.file)), [...(byFile.get(norm(path.join(ROOT, edit.file))) || []), edit]);
  b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
    const edits = byFile.get(norm(args.path));
    if (!edits) return undefined;
    let src = lf(fs.readFileSync(args.path, 'utf8'));
    for (const e of edits) {
      if (src.split(e.from).length !== 2) { console.error(`control ${CONTROL}: the string it mutates is not in ${e.file} exactly once`); process.exit(2); }
      src = src.replace(e.from, () => e.to);
      applied += 1;
    }
    return { contents: src, loader: 'ts' };
  });
} };
/* The base arm: the files this round changed, as the base tree has them. */
const baseFiles = [ENGINE, LEAGUE];
const basePlugin = { name: 'owner-base', setup(b) {
  const want = new Map(baseFiles.map(f => [norm(path.join(ROOT, f)), f]));
  b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
    const file = want.get(norm(args.path));
    if (!file) return undefined;
    return { contents: lf(git(['show', `${BASE}:${file}`])), loader: 'ts' };
  });
} };
const R = p => path.join(ROOT, p).replaceAll('\\', '/');
async function bundle(name, entry, plugins) {
  const ENTRY = path.join(tmp, `${name}.entry.mjs`);
  const OUT = path.join(tmp, `${name}.bundle.mjs`);
  fs.writeFileSync(ENTRY, `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };\n${entry}`);
  await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, plugins });
  return import(pathToFileURL(OUT).href);
}
const HEAD = await bundle('head', `export * as engine from '${R(ENGINE)}';\nexport * as owner from '${R(OWNER)}';\nexport * as save from '${R('src/lib/soccerCareerSave.ts')}';\nexport * as league from '${R(LEAGUE)}';\n`, [controlPlugin]);
const E = HEAD.engine, O = HEAD.owner, S = HEAD.save, L = HEAD.league;
if (CONTROL) {
  if (applied !== CONTROLS[CONTROL].length) { console.error(`control ${CONTROL}: applied ${applied} of ${CONTROLS[CONTROL].length} edits`); process.exit(2); }
  console.log(`CONTROL ${CONTROL} applied: this run is meant to go red`);
}
const BASEM = (ONLY.has(5) || ONLY.has(6)) ? await bundle('base', `export * as engine from '${R(ENGINE)}';\n`, [basePlugin]) : null;
if (BASEM) console.log(`base ${BASE.slice(0, 10)}`);
await E.loadManagerMarket();
if (BASEM) await BASEM.engine.loadManagerMarket();
const CLUBS = E.FALLBACK_CLUBS;

const REAL_RANDOM = Math.random;
const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* Math.random for one call, seeded and counted; the count is returned. */
function seeded(seed, fn) {
  const rnd = mulberry32(seed);
  let n = 0;
  Math.random = () => { n += 1; return rnd(); };
  try { return { value: fn(), draws: n }; } finally { Math.random = REAL_RANDOM; }
}
const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const f2 = v => (Number.isFinite(v) ? v.toFixed(2) : String(v));

/* One playing career to its ceremony, the seeded loop the money harness uses, on either engine. */
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const NATIONS = ['England', 'Spain', 'France', 'Brazil', 'Germany', 'Argentina', 'Portugal', 'Italy'];
const POSITIONS = ['ST', 'CM', 'CB', 'LW', 'GK', 'CAM', 'RB'];
const ERAS = ['2020s', '2020s', '1990s'];
function playToCeremony(eng, seed, trace) {
  const clubs = eng.FALLBACK_CLUBS;
  let c = seeded(seed, () => eng.initCareer(`Owner ${seed}`, NATIONS[seed % NATIONS.length], POSITIONS[seed % POSITIONS.length],
    ERAS[seed % ERAS.length], flat(70), 70, seed % 3 === 2 ? 1994 : 2020, clubs, null, 88 + (seed % 11)));
  trace?.push(c.draws, JSON.stringify(c.value));
  c = c.value;
  for (let guard = 1; !c.retired && guard < 40; guard += 1) {
    const step = seeded(seed * 7919 + guard, () => {
      if (c.phase === 'retirement_suggestion') return eng.acceptRetirementSuggestion(c);
      return c.phase === 'youth' ? eng.advanceYouthYear(c, clubs) : eng.advanceProSeason(c, clubs);
    });
    c = step.value;
    if (c.transferSituation) c = { ...c, transferSituation: null };
    trace?.push(step.draws, JSON.stringify(c));
  }
  return c;
}

/* The retired career the owner sections buy from: one seeded career, its name varied for the fleet (the name is
   part of the save's key, so every name is its own list and its own seasons). */
let CEREMONY = null;
const ceremony = () => (CEREMONY ??= playToCeremony(E, 11));
const named = (c, i, netWorth) => ({ ...c, playerName: `Owner ${SALT}-${i}`, netWorth });
const PLANS = ['squad', 'youth', 'stadium', 'debt'];

/* The owner tail is a lazy chunk (src/lib/soccerOwnerGate.ts): nothing is bought and no season is played before it
   lands, which is checked first; then it is loaded the way the page loads it. */
{
  const c = named(ceremony(), 0, 300);
  if (E.ownerTailReady() || E.choosePostRetirement(c, 'owner', CLUBS) !== c) fail('the engine bought a club before the owner tail was loaded');
  await E.loadOwnerTail();
  if (!E.ownerTailReady()) fail('the owner tail did not load');
  console.log(`0) the owner tail loads on demand: before the load nothing is bought, after it ${E.ownerTailReady() ? 'it is ready' : 'it is still missing'}`);
}

if (ONLY.has(1)) {
  console.log('1) The clubs for sale');
  const c0 = ceremony();
  console.log(`   the ceremony career: phase ${c0.phase}, ${c0.seasons.length} seasons, last ${c0.seasons[c0.seasons.length - 1]?.year}`);
  if (c0.phase !== 'retirement_ceremony') fail(`the seeded career ended in ${c0.phase}, not at the ceremony`);
  const bands = { 49: 0, 60: 2, 200: 4, 249: 4, 250: 6, 900: 6 };
  for (const [nw, want] of Object.entries(bands)) {
    const list = O.ownerClubsOnSale(named(c0, 0, Number(nw)), CLUBS);
    const tiers = list.map(c => c.tier).join('');
    console.log(`   at €${nw}M: ${list.length} clubs (tiers ${tiers || 'none'})`);
    if (list.length !== want) fail(`at €${nw}M the list holds ${list.length} clubs, not ${want}`);
    for (const c of list) {
      const band = O.OWNER_TIERS[c.tier];
      if (!O.OWNER_SALE_TIERS.includes(c.tier)) fail(`${c.name} is offered at tier ${c.tier}`);
      if (c.price !== band.price || c.debt !== band.debt) fail(`${c.name}: €${c.price}M and €${c.debt}M debt, not its band's €${band.price}M and €${band.debt}M`);
      if (c.price > Number(nw)) fail(`${c.name} costs €${c.price}M, more than the €${nw}M he has`);
    }
  }
  /* the same list on every visit, whatever Math.random holds; a different save, a different list */
  const seen = new Set();
  let unstable = 0;
  for (let i = 0; i < 60; i += 1) {
    const c = named(c0, i, 300);
    const a = seeded(1, () => JSON.stringify(O.ownerClubsOnSale(c, CLUBS)));
    const b = seeded(2, () => JSON.stringify(O.ownerClubsOnSale(c, CLUBS)));
    if (a.value !== b.value || a.draws + b.draws > 0) unstable += 1;
    for (const club of JSON.parse(a.value)) seen.add(club.name);
  }
  console.log(`   60 saves: ${seen.size} different clubs offered, ${unstable} lists that moved between visits or drew Math.random`);
  if (unstable > 0) fail(`${unstable} lists moved between two visits or drew from Math.random`);
  if (seen.size < 30) fail(`only ${seen.size} different clubs across 60 saves: the list barely moves with the save`);
  /* he buys the club he picks, for its price, with no draw; a name not on the list buys nothing */
  let wrong = 0, drew = 0, bought = 0;
  for (let i = 0; i < 40; i += 1) {
    const c = named(c0, i, 300);
    const list = O.ownerClubsOnSale(c, CLUBS);
    const want = list[i % list.length];
    const r = seeded(100 + i, () => E.choosePostRetirement(c, 'owner', CLUBS, want.name));
    const os = r.value.ownerState;
    bought += 1;
    if (r.draws > 0) drew += 1;
    if (!os || os.club !== want.name || os.clubTier !== want.tier || Math.abs(r.value.netWorth - (300 - want.price)) > 1e-9
      || os.debt !== want.debt || r.value.phase !== 'owner_season') wrong += 1;
  }
  const notForSale = named(c0, 0, 300);
  const refused = E.choosePostRetirement(notForSale, 'owner', CLUBS, 'Real Madrid');
  const first = E.choosePostRetirement(notForSale, 'owner', CLUBS);
  console.log(`   ${bought} purchases: ${wrong} not the club picked at its price, ${drew} that drew Math.random; a club not for sale ${refused === notForSale ? 'buys nothing' : 'was bought'}; no name buys ${first.ownerState?.club}`);
  if (wrong > 0) fail(`${wrong} of ${bought} purchases were not the club he picked at its band's price and debt`);
  if (drew > 0) fail(`${drew} purchases drew from Math.random`);
  if (refused !== notForSale) fail('a club that is not for sale was bought');
  if (first.ownerState?.club !== O.ownerClubsOnSale(notForSale, CLUBS)[0].name) fail('a call with no club does not buy the first on the list');
  /* the league a tile prints is the season's own, as the manager's cards print it: before 2026-27 the ledgers'
     name for that club's league that season, and none when the ledgers place the club in no league (never today's
     label, never the list's key where the season had another name) */
  let tiles = 0, falseLeague = 0, none = 0;
  const falseEx = [];
  for (let year = 1995; year < L.LIST_SEASON; year += 1) {
    for (let k = 0; k < 24; k += 1) {
      for (const t of O.ownerClubsForSale({ clubs: CLUBS, year, netWorth: 1000, key: `sale${SALT}|${year}|${k}` })) {
        tiles += 1;
        const want = L.clubLedgerSeason(t.name, year)?.name ?? null;
        const printed = typeof t.leagueLine === 'string' ? t.leagueLine.replace(/, \d{4}-\d{2}$/, '') : null;
        if (printed === null) none += 1;
        if (printed !== want) {
          falseLeague += 1;
          if (falseEx.length < 3) falseEx.push(`${year} ${t.name}: "${printed}" where the ledgers say ${want === null ? 'no league' : `"${want}"`}`);
        }
      }
    }
  }
  console.log(`   ${tiles} tiles for the seasons 1995 to ${L.LIST_SEASON - 1}: ${falseLeague} name a league the ledgers do not give that club that season, ${none} name no league`);
  for (const e of falseEx) console.log(`     e.g. ${e}`);
  if (tiles < 3000) fail(`only ${tiles} tiles were read before 2026-27`);
  if (falseLeague > 0) fail(`${falseLeague} of ${tiles} tiles before 2026-27 name a league the club was not in that season`);
}

/* One owner tail through the engine: buy the i-th save's club, then H seasons, each with a call. */
function ownerTail(i, H, check) {
  const c0 = named(ceremony(), i, 300);
  const list = O.ownerClubsOnSale(c0, CLUBS);
  let c = E.choosePostRetirement(c0, 'owner', CLUBS, list[i % list.length].name);
  for (let k = 0; k < H; k += 1) {
    const plan = PLANS[(i + k) % 4];
    c = O.chooseOwnerPlan(c, O.ownerPlanOpen(c.ownerState, plan) ? plan : 'squad');
    const before = c;
    c = seeded(i * 1009 + k, () => E.advanceOwnerSeason(c, CLUBS)).value;
    check?.(before, c);
  }
  return c;
}
const ord = n => L.ordinal(n);
if (ONLY.has(2)) {
  console.log('2) Every finish is the table\'s');
  let rows = 0, wrong = 0, titles = 0, promos = 0, rels = 0, named_ = 0, verified = 0, counters = 0;
  let pairs = 0, replayed = 0;
  const rivals = t => (Array.isArray(t) ? t : []).filter(r => !r.you).slice(0, 4).map(r => `${r.club}:${r.pts}`).join('|');
  const examples = [];
  for (let i = 0; i < 80; i += 1) {
    let tailTitles = 0, tailPromos = 0;
    const end = ownerTail(i, 8, (before, after) => {
      const prev = before.ownerState, os = after.ownerState, row = os.seasonResults[os.seasonResults.length - 1];
      rows += 1;
      const table = Array.isArray(row.table) ? row.table : [];
      const me = table.find(r => r.you);
      const size = row.leagueSize;
      const problems = [];
      if (!me || me.pos !== row.playerPos || me.pts !== row.playerPts) problems.push('his row of the table is not the row the season names');
      for (let j = 1; j < table.length; j += 1) if (table[j].pts > table[j - 1].pts || table[j].pos <= table[j - 1].pos) problems.push('the table is out of order');
      const pos = row.playerPos, pts = row.playerPts;
      const sizeUnknown = typeof row.league === 'string' && row.sizeVerified !== true;
      const want = pos === 1
        ? (sizeUnknown ? 'CHAMPIONS, top of the table.' : `CHAMPIONS. ${pts} points, ${row.sizeVerified ? `${ord(pos)} of ${size}` : 'top of the table'}.`)
        : (sizeUnknown ? `Finished ${L.finishZone(pos, size)}.` : `Finished ${ord(pos)}${row.sizeVerified ? ` of ${size}` : ''} on ${pts} points.`);
      if (typeof row.result !== 'string' || !row.result.startsWith(want)) problems.push(`the line says "${String(row.result).slice(0, 60)}" for ${ord(pos)} of ${size}`);
      if (row.trophy !== (pos === 1)) problems.push('a title that is not first, or first with no title');
      const promoted = prev.clubTier > 1 && pos <= 2;
      const relegated = pos >= size - 2 && prev.clubTier < 4;
      const tier = promoted ? prev.clubTier - 1 : relegated ? prev.clubTier + 1 : prev.clubTier;
      if (row.tier !== tier || os.clubTier !== tier) problems.push(`tier ${os.clubTier} after ${ord(pos)} from tier ${prev.clubTier}`);
      if (pos === 1) { titles += 1; tailTitles += 1; }
      if (promoted) { promos += 1; tailPromos += 1; }
      if (relegated) rels += 1;
      if (typeof row.league === 'string') named_ += 1;
      if (row.sizeVerified) verified += 1;
      if (problems.length) { wrong += 1; if (examples.length < 3) examples.push(`${os.club} S${row.year}: ${problems[0]}`); }
      /* a new season is a new table: two seasons in a row of one club in one league never show the same four
         rivals on the same points (a key without the season replays last season's rivals) */
      const last = prev.seasonResults[prev.seasonResults.length - 1];
      if (last && last.club === row.club && last.league === row.league && last.leagueSize === row.leagueSize) {
        pairs += 1;
        if (rivals(last.table) === rivals(table)) replayed += 1;
      }
    });
    if (end.ownerState.trophies !== tailTitles || end.ownerState.promotions !== tailPromos) counters += 1;
  }
  console.log(`   ${rows} owner seasons: ${wrong} finishes the table did not produce, ${titles} titles, ${promos} promotions, ${rels} relegations; ${named_} in a named league, ${verified} of a verified size`);
  for (const e of examples) console.log(`     e.g. ${e}`);
  if (rows < 600) fail(`only ${rows} owner seasons were played`);
  if (wrong > 0) fail(`${wrong} of ${rows} owner seasons carry a finish, title or move the table did not produce`);
  if (counters > 0) fail(`${counters} tails whose trophy or promotion counters disagree with their rows`);
  if (titles === 0 || promos === 0 || rels === 0) fail('a fleet with no title, no promotion or no relegation proves nothing about them');
  console.log(`   ${pairs} back to back seasons in one league: ${replayed} show last season's top four rivals on the same points`);
  if (pairs < 300) fail(`only ${pairs} back to back seasons in one league were compared`);
  if (replayed * 100 > pairs) fail(`${replayed} of ${pairs} seasons replay last season's rivals on the same points: the season is not in the table's key`);
  /* the table is the save's own: the same season under two different Math.random streams is the same season */
  let moved = 0;
  for (let i = 0; i < 30; i += 1) {
    const c = O.chooseOwnerPlan(ownerTail(i, 2), 'squad');
    const a = seeded(7, () => E.advanceOwnerSeason(c, CLUBS)).value.ownerState;
    const b = seeded(8, () => E.advanceOwnerSeason(c, CLUBS)).value.ownerState;
    if (JSON.stringify(a) !== JSON.stringify(b)) moved += 1;
  }
  console.log(`   30 seasons replayed under two Math.random streams: ${moved} came out different`);
  if (moved > 0) fail(`${moved} of 30 owner seasons changed with Math.random: the table is not the save's own`);
}

/* ─── Sections 3 and 4: one call against placing nothing, on the same keyed seasons ───
   A fleet of owner states (a bought club, 0 to 3 seasons already played with mixed calls, in three eras), and
   from each one the same R seasons played twice: once with the call placed in the first season, once with nothing
   placed, every later season placing nothing. The keys are the same, so the rivals' points are the same and the
   whole difference is the call. Points are his league points, money what the seasons paid, €M. */
const FLEET = 600;
function fleetState(i) {
  const key = `fleet${SALT}|${i}`;
  const year = [2031, 2012, 1999][i % 3];
  const list = O.ownerClubsForSale({ clubs: CLUBS, year, netWorth: 1000, key });
  let os = O.ownerStart(list[i % list.length]);
  const warm = i % 4;
  for (let k = 0; k < warm; k += 1) {
    const p = PLANS[(i * 7 + k * 3) % 4];
    if (O.ownerPlanOpen(os, p)) os = { ...os, plan: p };
    os = O.playOwnerSeason(os, { clubs: CLUBS, year: year + k, key: `${key}|w${k}` }).os;
  }
  return { os, key, year: year + warm };
}
function playFrom(st, first, R) {
  let os = first ? { ...st.os, plan: first } : st.os;
  let pts = 0, money = 0, pts0 = 0, money0 = 0;
  for (let k = 0; k < R; k += 1) {
    const r = O.playOwnerSeason(os, { clubs: CLUBS, year: st.year + k, key: `${st.key}|s${k}` });
    const row = r.os.seasonResults[r.os.seasonResults.length - 1];
    pts += row.playerPts; money += r.income;
    if (k === 0) { pts0 = row.playerPts; money0 = r.income; }
    os = r.os;
  }
  return { pts, money, pts0, money0 };
}
const STATES = (ONLY.has(3) || ONLY.has(4)) ? Array.from({ length: FLEET }, (_, i) => fleetState(i)) : [];
/** Mean effect of each call against placing nothing, over the states where every call is open (`all`) or where
 *  that call is open (`own`). */
function effects(R) {
  const own = Object.fromEntries(PLANS.map(p => [p, { pts: [], money: [], pts0: [], money0: [] }]));
  const all = Object.fromEntries(PLANS.map(p => [p, { pts: [], money: [] }]));
  for (const st of STATES) {
    const base = playFrom(st, null, R);
    const open = PLANS.filter(p => O.ownerPlanOpen(st.os, p));
    for (const p of open) {
      const r = playFrom(st, p, R);
      const d = { pts: r.pts - base.pts, money: r.money - base.money, pts0: r.pts0 - base.pts0, money0: r.money0 - base.money0 };
      for (const k of Object.keys(d)) own[p][k].push(d[k]);
      if (open.length === PLANS.length) { all[p].pts.push(d.pts); all[p].money.push(d.money); }
    }
  }
  const m = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, mean(v)]));
  return {
    own: Object.fromEntries(PLANS.map(p => [p, { ...m(own[p]), n: own[p].pts.length }])),
    all: Object.fromEntries(PLANS.map(p => [p, { ...m(all[p]), n: all[p].pts.length }])),
  };
}
const EFFECTS = {};
for (const R of [3, 6, 10]) if (ONLY.has(3) || ONLY.has(4)) EFFECTS[R] = effects(R);
const show = (label, e) => {
  console.log(`   ${label}`);
  for (const p of PLANS) {
    const v = e[p];
    console.log(`     ${p.padEnd(8)} n ${String(v.n).padStart(3)}  points ${f2(v.pts).padStart(6)}  money ${f2(v.money).padStart(6)}${v.pts0 !== undefined ? `  this season: points ${f2(v.pts0)} money ${f2(v.money0)}` : ''}`);
  }
};

if (ONLY.has(3)) {
  console.log('3) Each call moves what it says it moves (against placing nothing, same keyed seasons)');
  const e = EFFECTS[6].own;
  show(`${FLEET} owner states, 6 seasons, each call where it is open:`, e);
  const need = (ok, m) => { if (!ok) fail(m); };
  need(e.squad.n >= 500 && e.youth.n >= 300 && e.stadium.n >= 300 && e.debt.n >= 200, 'too few states where the calls are open');
  need(e.squad.pts0 >= 4, `Sign players adds ${f2(e.squad.pts0)} points this season (designed 5, need 4)`);
  need(e.squad.money0 <= -0.5, `Sign players costs ${f2(-e.squad.money0)}M in wages this season (need 0.5 or more)`);
  need(e.youth.pts0 === 0 && e.youth.money0 === 0, `Fund the academy moved this season (points ${f2(e.youth.pts0)}, money ${f2(e.youth.money0)}): it says nothing this season`);
  need(e.youth.pts >= 4, `Fund the academy adds ${f2(e.youth.pts)} points over 6 seasons (need 4)`);
  need(e.youth.money >= 2, `Fund the academy adds ${f2(e.youth.money)}M over 6 seasons (need 2)`);
  need(e.stadium.money0 <= -0.5, `Grow the ground costs ${f2(-e.stadium.money0)}M this season (need 0.5 or more)`);
  need(e.stadium.pts === 0, `Grow the ground moved the table by ${f2(e.stadium.pts)} points: it never adds a point`);
  need(e.stadium.money >= 5, `Grow the ground adds ${f2(e.stadium.money)}M over 6 seasons (need 5)`);
  need(e.debt.pts0 >= 0.3, `Pay down the debt adds ${f2(e.debt.pts0)} points this season (need 0.3)`);
  need(e.debt.money0 >= 0.4, `Pay down the debt adds ${f2(e.debt.money0)}M this season (need 0.4)`);
}

if (ONLY.has(4)) {
  console.log('4) No dominant choice');
  const e6 = EFFECTS[6].all;
  show(`the ${e6.squad.n} states where all four calls are open, 6 seasons:`, e6);
  const PTS_MARGIN = 0.5, MONEY_MARGIN = 0.3;
  let pairs = 0;
  for (const a of PLANS) for (const b of PLANS) {
    if (a === b) continue;
    pairs += 1;
    const beats = e6[b].pts - e6[a].pts >= PTS_MARGIN || e6[b].money - e6[a].money >= MONEY_MARGIN;
    if (!beats) fail(`${a} is never beaten by ${b} by a margin at 6 seasons (points ${f2(e6[b].pts - e6[a].pts)}, money ${f2(e6[b].money - e6[a].money)}): ${a} dominates ${b}`);
  }
  if (e6.squad.n < 150) fail(`only ${e6.squad.n} states with all four calls open`);
  console.log(`   ${pairs} ordered pairs: every call is beaten by every other somewhere by ${PTS_MARGIN} points or ${MONEY_MARGIN}M`);
  for (const R of [3, 6, 10]) {
    const e = EFFECTS[R].all;
    const topPts = PLANS.reduce((x, p) => (e[p].pts > e[x].pts ? p : x), PLANS[0]);
    const topMoney = PLANS.reduce((x, p) => (e[p].money > e[x].money ? p : x), PLANS[0]);
    console.log(`   ${String(R).padStart(2)} seasons: most points ${topPts} (${f2(e[topPts].pts)}), most money ${topMoney} (${f2(e[topMoney].money)})`);
    if (topPts === topMoney) fail(`at ${R} seasons ${topPts} is the best call for points and for money: a dominant choice`);
  }
}

if (ONLY.has(5)) {
  console.log('5) An owner save from before this round plays on');
  const BE = BASEM.engine;
  const c0 = playToCeremony(BE, 11);
  let ok = 0, problems = 0;
  const examples = [];
  for (let i = 0; i < 12; i += 1) {
    /* the old save, written by the base engine: its random club, two of its coin seasons */
    let old = seeded(500 + i, () => BE.choosePostRetirement({ ...c0, playerName: `Old ${i}`, netWorth: 300 }, 'owner', BE.FALLBACK_CLUBS)).value;
    for (let k = 0; k < 2; k += 1) old = seeded(600 + i * 10 + k, () => BE.advanceOwnerSeason(old)).value;
    const raw = S.serializeSoccerCareerSave(old);
    const loaded = S.parseSoccerCareerSave(raw);
    const issues = [];
    if (!S.isSoccerCareerSave(loaded)) issues.push('the save does not load');
    const oldRows = JSON.stringify(old.ownerState.seasonResults);
    if ('debt' in old.ownerState || 'plan' in old.ownerState) issues.push('the base wrote a field of this round, so this is not an old save');
    const open = PLANS.filter(p => O.ownerPlanOpen(loaded.ownerState, p));
    if (open.join() !== 'squad,youth,stadium') issues.push(`an old save opens ${open.join(' ')}, not squad, youth and stadium (it has no debt)`);
    let c = O.chooseOwnerPlan(loaded, open[i % open.length]);
    if (c.ownerState.plan !== open[i % open.length]) issues.push('the call was not saved');
    c = seeded(700 + i, () => E.advanceOwnerSeason(c, CLUBS)).value;
    c = seeded(800 + i, () => E.advanceOwnerSeason(O.chooseOwnerPlan(c, 'squad'), CLUBS)).value;
    const os = c.ownerState, rows = os.seasonResults;
    if (os.club !== old.ownerState.club) issues.push(`the club became ${os.club}`);
    if (JSON.stringify(rows.slice(0, 2)) !== oldRows) issues.push('the old rows changed');
    if (rows.length !== 4 || os.season !== 4) issues.push(`${rows.length} rows and season ${os.season} after two more seasons`);
    for (const r of rows.slice(2)) {
      if (!Array.isArray(r.table) || !r.table.some(t => t.you) || typeof r.playerPos !== 'number') issues.push('a new season has no table');
      if (!Number.isFinite(r.income)) issues.push(`a new season paid ${r.income}`);
    }
    if (!Number.isFinite(c.netWorth)) issues.push(`net worth ${c.netWorth}`);
    if (!S.isSoccerCareerSave(S.parseSoccerCareerSave(S.serializeSoccerCareerSave(c)))) issues.push('the save after the new seasons does not load');
    if (issues.length) { problems += 1; if (examples.length < 3) examples.push(`${old.ownerState.club}: ${issues[0]}`); } else ok += 1;
  }
  console.log(`   12 old owner saves (base ${BASE.slice(0, 8)}): ${ok} load, keep their club and rows, and play on the table; ${problems} do not`);
  for (const e of examples) console.log(`     e.g. ${e}`);
  if (problems > 0) fail(`${problems} of 12 old owner saves did not play on`);
}

if (ONLY.has(6)) {
  console.log('6) Careers that never buy a club are byte equal to the base');
  const BE = BASEM.engine;
  const tails = [
    ['manager', (eng, c) => { c = eng.choosePostRetirement(c, 'manager', eng.FALLBACK_CLUBS); for (let k = 0; k < 6; k += 1) c = eng.advanceManagerSeason(c, eng.FALLBACK_CLUBS); return eng.endManagerCareer(c); }],
    ['pundit', (eng, c) => { c = eng.choosePostRetirement(c, 'pundit', eng.FALLBACK_CLUBS); for (let k = 0; k < 6; k += 1) c = eng.advancePunditSeason(c, ['praise_player', 'criticise_manager', 'bold_prediction'][k % 3]); return eng.endPunditCareer(c); }],
    ['retire', (eng, c) => eng.choosePostRetirement(c, 'retire', eng.FALLBACK_CLUBS)],
  ];
  let steps = 0, differ = 0, careers = 0, managerSeasons = 0;
  const firstDiff = [];
  const run = (eng, seed) => {
    const trace = [];
    const c = playToCeremony(eng, seed, trace);
    for (const [name, tail] of tails) {
      const r = seeded(seed * 31 + name.length, () => tail(eng, c));
      trace.push(`${name}:${r.draws}`, JSON.stringify(r.value));
    }
    return trace;
  };
  for (let seed = 101; seed <= 116; seed += 1) {
    const a = run(BE, seed), b = run(E, seed);
    careers += 1;
    if (a.length !== b.length) { differ += 1; firstDiff.push(`seed ${seed}: ${a.length} steps on the base, ${b.length} here`); continue; }
    for (let k = 0; k < a.length; k += 1) {
      steps += 1;
      if (a[k] !== b[k]) { differ += 1; if (firstDiff.length < 3) firstDiff.push(`seed ${seed} step ${k}: ${String(a[k]).slice(0, 40)} on the base, ${String(b[k]).slice(0, 40)} here`); break; }
    }
    const mgr = JSON.parse(b[b.length - 5]);
    managerSeasons += mgr.managerState?.seasonResults?.length ?? 0;
  }
  console.log(`   ${careers} seeded careers, ${steps} states and draw counts compared (${managerSeasons} manager seasons among them): ${differ} careers differ from the base`);
  for (const d of firstDiff) console.log(`     ${d}`);
  if (managerSeasons < careers * 5) fail(`only ${managerSeasons} manager seasons were compared`);
  if (differ > 0) fail(`${differ} of ${careers} careers that never buy a club differ from the base`);
}

if (failures) {
  console.log(`simSoccerOwnerTail: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`simSoccerOwnerTail: green. The owner picks his club, plays on the table, and every call does what it says and none is best at everything${CONTROL ? ` (CONTROL ${CONTROL} did not fire)` : ''}.`);
