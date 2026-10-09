/* Round 1037: Soccer Career knows who was in each league, season by season.

   The six Round 1036 ledgers (scripts/data/leagueSeasons/, 1990-91 to
   2025-26, two independent non-wiki sources a season) are generated into
   src/data/careerLeagueSeasons.ts, and src/lib/soccerCareerLeague.ts reads
   them through one lookup (leagueInYear and its siblings). This harness holds
   the file to the ledgers and every screen that prints a league to them.

   Sections
   a FILE      the generated file is exactly what the generator renders from
               the ledgers; every verified season is in it with its size and
               every canon club; every canon name is a club of the career's
               world; for every club of that world and every season 1990 to
               2025 the lookup answers what the ledgers say (this harness
               reads the ledgers itself, by exact canon name); no club of the
               world is matched to an unnamed member (a missed canon); every
               job market club matches at most one league a season, and every
               MARKET_SPELLINGS entry finds its club; the module's identityKey
               is the generator's on every printed name; the summary's old
               save guard prints no league beside a saved size that is not
               the season's own, before 2026-27 and after it.
   b PLAYED    seeded careers starting in 1990, 1998, 2005, 2012 and 2019,
               played screen by screen to retirement and then into the dugout.
               Every offer, loan and dugout job line names the league the
               ledgers put the club in that season, or nothing; every finish
               of a past season sits in the club's real league at that
               season's verified size, and the line printed with it names
               that league; every derby of a past season is against a club
               in the same league that year; every dugout table of a past
               season in one of the six is headed by that season's name, has
               the verified size, and names only that season's members, none
               twice and never his own club; his own club sits in a league
               it was not in that season only where the game itself put it
               there (a season it named at that club, or a move out of one),
               never by a job's label, which is today's. The season an
               offer, loan or dugout job card names is the season then
               played (held to the record, not to the helper the page
               reads). Twelve forced dugout jobs, the same on every seed,
               keep a floor under the past tables. The phone's world agrees
               with the season card: a title is crowned in the league the
               card names and the club is crowned nowhere else (every club
               of the world, one season in five, title and no title).
   c BASELINE  from 2026-27 on nothing moves: careers starting in 2025 are
               replayed on this tree and on SIM_LEAGUE_SEASONS_BASE (default
               origin/main, or origin/release-ah while that is not on main,
               read with git archive) with the seven Round 1022
               pins released in the baseline too, so the comparison isolates
               the binds; every season from 2026 and every dugout row from
               2026 must be identical. The pins' own effect is printed (the
               same replay without releasing them in the baseline).
               Round 1100 moves 2026-27 on purpose (the pool, the rows, the
               band): a career that differs is replayed with that round's
               seven source files read from the base, and must then be equal.
               Rounds 1185 and 1187's form selection and Youth Mentor
               catalog changes are removed only in
               copied attribution arms, including combinations of earlier
               arms. Equality still compares every original returned field.
   d WIRING    the page prints no raw label where a past season can show:
               the offer, loan, academy, dugout market and club cards and the
               season summary all go through the lookup (read from the page
               with comments stripped).

   Negative controls, SIM_LEAGUE_SEASONS_CONTROL=<name>. Each asserts the
   string it rewrites exists (in memory, never on disk) and the run exits 0
   only if its target section went red:
     wrongseason  West Ham moved into the 2011-12 Premier League in the
                  generated file                                      -> a
     crossdiv     a derby allowed whatever league the rival is in     -> b
     wrongtable   the dugout's past table drawn from the next season  -> b
     todaylabel   a past offer card prints today's label              -> b
     finishwrong  the finish drawn in today's league again           -> b
     cardwire     the club card prints the saved label again          -> d
     oldsize      finishLeague's saved size guard deleted             -> a
     jobleak      the dugout no longer told whether the game placed
                  his club, so a job's label seats it again           -> b
     jobyear      managerNextSeasonYear one season early              -> b
     offeryear    nextSeasonYear one season early                     -> b
     selfnamed    his own club left among a past table's rivals       -> b
     phonemine    the phone reads his league from today's label       -> b
     unheld       (Round 1100 review) Hertha Berlin dropped from
                  RELABELLED_1037, so its finish is placed in a league
                  the size of the one it left                         -> a
     future       a future season rating altered in every candidate
                  arm, including all copied attribution bundles      -> c
   (unheld measured red on 2026-10-08: the table is not the seven released
   clubs, and a saved Hertha finish is placed in the 2. Bundesliga.)
   The new future control awaits remote proof. Original controls were
   measured red on 2026-10-06 (seed 1, base origin/release-ah): the
   file differs from the ledgers and the lookup has West Ham in two leagues
   in 2011 (wrongseason); Fiorentina meets Bologna in seasons Bologna was a
   division down (crossdiv); a Malaga 2015-16 table names Osasuna, who were
   in the Segunda (wrongtable); an AZ Alkmaar card for 1992-93 says
   "Eredivisie, 1992-93" (todaylabel); a Fiorentina 1993-94 finish of 18 in a
   season the club was in Serie B (finishwrong); the card's raw label is
   back and its lookup gone (cardwire, 2 failures). The review fixes' six,
   measured red on 2026-10-07 (seed 1): 2635 finishes printed beside a
   league of another size, Real Madrid 2000-01 at 24 beside La Liga's 20
   (oldsize); Wrexham 2010-11, Bristol City 1995-96 and Sunderland 2018-19
   seated in a league they were not in on the strength of the job's label,
   7 failures (jobleak); a Dortmund job card for 2020-21 played in 2021-22,
   18 failures (jobyear); an offer card for 1991-92 before a 1992-93
   season, 668 (offeryear); Dortmund named as Dortmund's rival, 16
   (selfnamed); Nottingham Forest 2012-13 and Newcastle 1991-92 crowned in
   the Premier League while the card says Championship, 193 (phonemine).

   Run: node scripts/simCareerLeagueSeasons.mjs
   No network and no database: everything is bundled from this tree (and,
   for section c, from the base ref through git archive). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { inverseCareerDevelopment } from './lib/careerDevelopmentAttribution1185.mjs';
import { readLedgers, buildSeasons, render, identityKey as genIdentity, OUT as GEN_OUT } from './genCareerLeagueSeasons.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fwd = ROOT.replaceAll('\\', '/');
/* the node_modules this script itself resolved esbuild from, so a base tree
   unpacked in the temp folder resolves its packages too */
const NODE_MODULES = (() => {
  const p = createRequire(import.meta.url).resolve('esbuild');
  return p.slice(0, p.lastIndexOf('node_modules') + 'node_modules'.length);
})();
const CONTROL = process.env.SIM_LEAGUE_SEASONS_CONTROL || '';
/* the base: origin/main, or Release AH while it is not on main (this round
   is built on it, and a main without Rounds 1022 and 1029 moves for reasons
   that are not this round's) */
const gitOk = cmd => { try { execSync(cmd, { cwd: ROOT, stdio: 'ignore' }); return true; } catch { return false; } };
const BASE = process.env.SIM_LEAGUE_SEASONS_BASE
  || (gitOk('git rev-parse --verify --quiet origin/release-ah') && !gitOk('git merge-base --is-ancestor origin/release-ah origin/main')
    ? 'origin/release-ah' : 'origin/main');
const SEED = Number(process.env.SIM_LEAGUE_SEASONS_SEED || 1);
const LIST_SEASON = 2026;

const red = new Set();
let section = '0';
let failures = 0;
const shown = {};
const fail = m => {
  failures += 1; red.add(section);
  shown[section] = (shown[section] || 0) + 1;
  if (shown[section] <= 12) console.error(`  FAIL [${section}]: ${m}`);
};
const ok = (cond, m) => { if (!cond) fail(m); return cond; };
const head = (id, title) => { section = id; console.log(`\n${id}. ${title}`); };

/* ─── Controls ─── */
const swap = (from, to) => s => {
  if (!s.includes(from)) { console.error(`control ${CONTROL}: anchor not found: ${from}`); process.exit(2); }
  return s.replace(from, to);
};
const CONTROLS = {
  wrongseason: ['a', 'src/data/careerLeagueSeasons.ts', s => {
    const pl = s.indexOf('    2011: { name: "Premier League"');
    if (pl < 0) { console.error('control wrongseason: the 2011 Premier League row is missing'); process.exit(2); }
    return s.slice(0, pl) + s.slice(pl).replace('clubs: [', 'clubs: ["West Ham", ');
  }],
  crossdiv: ['b', 'src/lib/soccerCareerDerby.ts', swap('canonClub(c.name) === other && derbyLeague(c.name, c.league, year) === league);', 'canonClub(c.name) === other);')],
  wrongtable: ['b', 'src/lib/soccerCareerLeague.ts', swap('const ledger = league !== null ? ledgerLeague(league, input.year) : null;', 'const ledger = league !== null ? ledgerLeague(league, input.year + 1) : null;')],
  todaylabel: ['b', 'src/lib/soccerCareerLeague.ts', swap('return `${name}, ${seasonSpan(year)}`;', 'return `${club.league}, ${seasonSpan(year)}`;')],
  finishwrong: ['b', 'src/lib/soccerCareerEngine.ts', swap('league: leagueKeyInYear({ name: state.currentClub, league: state.currentLeague }, seasonYear), year: seasonYear,', 'league: state.currentLeague, year: seasonYear,')],
  cardwire: ['d', 'src/pages/SoccerCareer.tsx', swap('`${clubCardLeague(career, currentSeason.year)}${career.contractYearsLeft}yr left · ', '`${career.currentLeague} · ${career.contractYearsLeft}yr left · ')],
  oldsize: ['a', 'src/lib/soccerCareerLeague.ts', swap('if (savedSize !== null && savedSize !== leagueSizeFor(key, year)) return null;', '')],
  jobleak: ['b', 'src/lib/soccerCareerEngine.ts', swap('year: calYear, from: movedFrom, placed }', 'year: calYear, from: movedFrom }')],
  jobyear: ['b', 'src/lib/soccerCareerEngine.ts', swap('?? 2024) + (s.managerState?.season ?? 0) + 1;', '?? 2024) + (s.managerState?.season ?? 0);')],
  offeryear: ['b', 'src/lib/soccerCareerEngine.ts', swap('return (s.seasons[s.seasons.length - 1]?.year ?? 0) + 1;', 'return (s.seasons[s.seasons.length - 1]?.year ?? 0);')],
  selfnamed: ['b', 'src/lib/soccerCareerLeague.ts', swap('let named = s.clubs.filter(n => !(member && me.canon === n));', 'let named = [...s.clubs];')],
  /* Round 1100 review: Hertha Berlin dropped from the table finishLeague reads */
  unheld: ['a', 'src/lib/soccerCareerLeague.ts', swap('"Hertha Berlin": "Bundesliga", ', '')],
  phonemine: ['b', 'src/lib/soccerPhone.ts', swap('const mine = name === myLeague;', 'const mine = name === s.currentLeague;')],
  future: ['c', 'src/lib/soccerCareerEngine.ts', s => {
    const from = 'apps, leagueApps, goals, assists, cleanSheets, yellowCards, redCards, rating,';
    const to = 'apps, leagueApps, goals, assists, cleanSheets, yellowCards, redCards, rating: lastYear + 1 >= 2026 ? rating + 0.125 : rating,';
    if (s.split(from).length !== 2) { console.error('control future: the actual season row anchor is not unique'); process.exit(2); }
    const changed = s.replace(from, to);
    if (changed === s) { console.error('control future: the copied source did not change'); process.exit(2); }
    replayReceipt.futureEdits.push({ beforeSha256: sha(s), afterSha256: sha(changed), effective: true });
    return changed;
  }],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
const [controlSection, controlFile, controlEdit] = CONTROLS[CONTROL] || [];
let controlFired = false;
const readSrc = rel => {
  let s = fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');
  if (controlFile === rel) { s = controlEdit(s); controlFired = true; }
  return s;
};
const controlPlugin = { name: 'control', setup(b) {
  if (!controlFile || controlFile.endsWith('.tsx')) return;
  const tail = controlFile.split('/').pop().replace(/\./g, '\\.');
  b.onLoad({ filter: new RegExp(`${tail}$`) }, args => {
    if (!args.path.replaceAll('\\', '/').endsWith(controlFile)) return undefined;
    return { contents: readSrc(controlFile), loader: 'ts' };
  });
} };

const tmp = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'simLeagueSeasons-'));
const replayOut = process.env.SIM_LEAGUE_SEASONS_ARTIFACTS ? path.resolve(process.env.SIM_LEAGUE_SEASONS_ARTIFACTS) : null;
if (replayOut) fs.mkdirSync(replayOut, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const heldSources = ['scripts/simCareerLeagueSeasons.mjs', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSelection.ts',
  'src/lib/soccerCareerPreparation.ts', 'src/lib/soccerCareerMentor.ts', 'src/lib/soccerPhone.ts', 'src/lib/clubManager.ts',
  'src/data/careerLeagueSeasons.ts', 'src/data/clubRivalries.ts', 'src/data/leagueFormat.ts', 'src/data/soccerCareerClubPool.ts',
  'src/lib/careerEras.ts', 'src/lib/soccerCareerDerby.ts', 'src/lib/soccerCareerLeague.ts',
  'scripts/lib/careerDevelopmentAttribution1185.mjs'];
const sourceHashes = () => {
  const held = {};
  for (const file of heldSources) {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    held[file] = sha(bytes);
  }
  return held;
};
const replayReceipt = { base: BASE,
  baseCommit: execFileSync('git', ['rev-parse', '--verify', `${BASE}^{commit}`], { cwd: ROOT, encoding: 'utf8' }).trim(),
  baseTree: execFileSync('git', ['rev-parse', '--verify', `${BASE}^{tree}`], { cwd: ROOT, encoding: 'utf8' }).trim(),
  seed: SEED, control: CONTROL || null, cases: [], inverses: [], futureEdits: [], sourceBefore: sourceHashes() };
const retainReplay = (seed, arm, value) => {
  const file = `${seed}-${arm}.json`;
  if (replayOut) fs.writeFileSync(path.join(replayOut, file), value);
  return { file, sha256: sha(value) };
};
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const realRandom = Math.random;
const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Bundle a tree's engine, league module, derby module, data and job market. */
async function bundle(root, name, plugins, withLedger = true) {
  const r = root.replaceAll('\\', '/');
  const entry = path.join(tmp, `${name}-entry.mjs`);
  fs.writeFileSync(entry, `
export * as E from '${r}/src/lib/soccerCareerEngine.ts';
export * as L from '${r}/src/lib/soccerCareerLeague.ts';
export * as D from '${r}/src/lib/soccerCareerDerby.ts';
export * as J from '${r}/src/lib/managerJobMarket.ts';
export * as P from '${r}/src/lib/soccerPhone.ts';
${withLedger ? "" : "// "}export * as S from '${r}/src/data/careerLeagueSeasons.ts';
`);
  const out = path.join(tmp, `${name}.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    logLevel: 'error', alias: { '@': `${r}/src` }, plugins, loader: { '.json': 'json' }, nodePaths: [NODE_MODULES] });
  return import(pathToFileURL(out).href);
}
const M = await bundle(ROOT, 'tree', [controlPlugin]);
if (CONTROL && controlFile.endsWith('.ts') && !controlFired) { console.error(`control ${CONTROL} never reached ${controlFile}`); process.exit(2); }
if (CONTROL) console.log(`CONTROL ${CONTROL} applied: section ${controlSection} is meant to go red`);
const { E, L, J, S, P } = M;

/* ─── The ledgers, read here on their own ───
   truth.get(year).get(canon) = { key, name, size }, by exact canon name. */
const ledgers = readLedgers();
const truth = new Map();
const byLeague = new Map();
for (const { label, ledger } of ledgers) {
  for (const s of ledger.seasons) {
    if (s.verified !== true) continue;
    const span = ledger.tierNames.find(t => s.season >= t.from && s.season <= t.to);
    const row = { key: label, name: span.name, size: s.size, canon: s.clubs.map(c => c.canon).filter(Boolean),
      printed: s.clubs.map(c => c.printed) };
    byLeague.set(`${label}|${s.startYear}`, row);
    const y = truth.get(s.startYear) ?? new Map();
    for (const c of row.canon) y.set(c, row);
    truth.set(s.startYear, y);
  }
}
const truthOf = (canon, year) => (year < LIST_SEASON ? truth.get(year)?.get(canon) ?? null : null);
const span = y => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
const WORLD = E.FALLBACK_CLUBS;
const worldNames = new Set(WORLD.map(c => c.name));

/* ─── a. FILE ─── */
head('a', 'FILE: the generated file is the ledgers, and the lookup answers them');
const fileText = readSrc('src/data/careerLeagueSeasons.ts').replace(/\r\n/g, '\n');
ok(fileText === render(buildSeasons(ledgers)), `${path.relative(ROOT, GEN_OUT)} is not what the generator renders from the ledgers (stale, or edited by hand)`);
let seasonsIn = 0; let canonIn = 0;
for (const [k, row] of byLeague) {
  const [label, y] = k.split('|');
  const got = S.CAREER_LEAGUE_SEASONS[label]?.[Number(y)];
  if (!ok(!!got, `${label} ${span(Number(y))}: verified in the ledger, missing from the file`)) continue;
  seasonsIn += 1;
  ok(got.size === row.size, `${label} ${span(Number(y))}: size ${got.size}, the ledger says ${row.size}`);
  ok(got.clubs.length + got.others.length === row.size, `${label} ${span(Number(y))}: ${got.clubs.length} named and ${got.others.length} unnamed for ${row.size} places`);
  ok(JSON.stringify([...got.clubs].sort()) === JSON.stringify([...row.canon].sort()), `${label} ${span(Number(y))}: the named clubs differ from the ledger's canon clubs`);
  canonIn += got.clubs.length;
  for (const c of got.clubs) ok(worldNames.has(c), `${label} ${span(Number(y))}: ${c} is not a club of the career's world`);
}
const verifiedCount = ledgers.reduce((n, l) => n + l.ledger.seasons.filter(s => s.verified === true).length, 0);
ok(seasonsIn === verifiedCount && verifiedCount === 216, `${seasonsIn} seasons in the file for ${verifiedCount} verified in the ledgers (216 expected)`);
/* every club of the world, every season the ledgers reach */
let answers = 0; let placed = 0;
for (const c of WORLD) {
  for (let y = 1990; y < LIST_SEASON; y++) {
    const want = truthOf(c.name, y);
    const got = L.leagueInYear(c, y);
    answers += 1;
    if (want) placed += 1;
    ok(got === (want ? want.name : null), `${c.name} ${span(y)}: the lookup says ${got}, the ledgers ${want ? want.name : 'no league'}`);
    ok(L.leagueKeyInYear(c, y) === (want ? want.key : null), `${c.name} ${span(y)}: key ${L.leagueKeyInYear(c, y)}, the ledgers ${want ? want.key : 'none'}`);
    const m = L.clubLedgerSeason(c.name, y);
    ok(!(m && m.canon === null), `${c.name} ${span(y)}: matched to an unnamed member of ${m && m.key}, a canon the ledgers missed or a false identity`);
  }
  ok(L.leagueInYear(c, LIST_SEASON) === (c.league || null), `${c.name}: from 2026-27 the lookup must answer today's label "${c.league}"`);
}
/* the summary's old save guard (decision 7): a finish saved at a size that
   is not the season's own was drawn in today's league before this round,
   so no league is printed beside it; the season's own size prints the
   ledgers' league */
let guarded = 0;
const heldSameSize = [];
/* the seven Round 1022 released, as they stood in the base: id and old label
   (section c puts them back in the base engine from the same list) */
const RELEASED = [['fb-43', 'Premier League'], ['fb-66', 'Bundesliga'], ['fb-70', 'Ligue 1'], ['fb-93', 'Primera Division Paraguay'],
  ['fb-96', 'La Liga'], ['fb-106', 'Premier League'], ['fb-137', 'Liga 1 Indonesia']];
/* Round 1100 review: the hold below learned each club's old label from
   RELABELLED_1037, the very table finishLeague reads, so a club dropped from
   that table fell to the other branch and passed. The old labels are this
   harness's own list, and the src table must be exactly it. */
const releasedOld = new Map(RELEASED.map(([id, old]) => [WORLD.find(c => c.id === id)?.name, old]));
ok(!releasedOld.has(undefined) && JSON.stringify(Object.entries(L.RELABELLED_1037).sort()) === JSON.stringify([...releasedOld].sort()),
  `RELABELLED_1037 (${Object.keys(L.RELABELLED_1037).join(', ')}) is not the seven released clubs with the labels they left (${[...releasedOld.keys()].join(', ')})`);
for (const c of WORLD) {
  for (let y = 1990; y < LIST_SEASON; y++) {
    const want = truthOf(c.name, y);
    if (!want) continue;
    guarded += 1;
    const other = want.size === 20 ? 24 : 20;
    ok(L.finishLeague(c, y, want.size)?.name === want.name, `${c.name} ${span(y)}: a finish saved at ${want.size} prints ${L.finishLeague(c, y, want.size)?.name ?? 'no league'}, the ledgers ${want.name}`);
    ok(L.finishLeague(c, y, other) === null, `${c.name} ${span(y)}: a finish saved at ${other} is printed beside ${want.name}, which had ${want.size}`);
  }
  /* and from 2026-27: an old save at one of the seven released clubs drew
     its finish in the old label's league, whose size is not the new one's */
  const now = L.leagueSizeFor(c.league, 2030);
  if (now) {
    guarded += 1;
    /* Round 1100 sized more leagues, and two of the seven released clubs now
       sit in a league the same size as the one they left (Hertha Berlin: the
       Bundesliga and the 2. Bundesliga are both 18). Size alone can no longer
       tell an old save's finish from a new one there, so finishLeague places
       NO finish for that club (RELABELLED_1037), in any save. The guard fails
       when the two sizes are equal and the club is not held, and when they
       differ and the label is not printed. */
    const old = releasedOld.get(c.name);
    const sameSize = old !== undefined && old !== c.league && L.leagueSizeFor(old, 2030) === now;
    if (sameSize) { heldSameSize.push(c.name); ok(L.finishLeague(c, 2030, now) === null, `${c.name} 2030-31: it left ${old} for ${c.league}, both ${now} clubs, yet a saved finish is placed in ${c.league}`); }
    else ok(L.finishLeague(c, 2030, now)?.name === c.league, `${c.name} 2030-31: a finish saved at ${now} prints ${L.finishLeague(c, 2030, now)?.name ?? 'no league'}, the label ${c.league}`);
    ok(L.finishLeague(c, 2030, now === 20 ? 24 : 20) === null, `${c.name} 2030-31: a finish saved at another size is printed beside the ${c.league} of ${now}`);
  }
}
ok(guarded >= 1000, `only ${guarded} club seasons held the old save guard (floor 1000)`);
ok(heldSameSize.length >= 1, 'no released club sits in a league the size of the one it left, so the same size hold was not exercised');
console.log(`  released clubs whose old and new league share a size, so no saved finish is placed for them: ${heldSameSize.join(', ') || 'none'}`);
/* the job market's clubs: one league a season at most, and the spellings */
await J.loadManagerMarket?.();
const market = J.allOfferClubs();
let marketPlaced = 0;
for (const o of market) {
  for (let y = 1990; y < LIST_SEASON; y++) {
    const hits = [];
    for (const [k, row] of byLeague) {
      if (!k.endsWith(`|${y}`)) continue;
      if (row.printed.some(ps => ps.some(p => genIdentity(p) === genIdentity(L.MARKET_SPELLINGS[o.name] ?? o.name))) || row.canon.includes(o.name)) hits.push(row.key);
    }
    ok(hits.length <= 1, `${o.name} ${span(y)}: its spelling is found in ${hits.join(' and ')}`);
    if (L.clubLedgerSeason(o.name, y)) marketPlaced += 1;
  }
}
for (const [from, to] of Object.entries(L.MARKET_SPELLINGS)) {
  ok(market.some(o => o.name === from), `MARKET_SPELLINGS: ${from} is not a job market club`);
  ok([...byLeague.values()].some(r => r.printed.some(ps => ps.some(p => genIdentity(p) === genIdentity(to)))), `MARKET_SPELLINGS: no source printed ${to}`);
}
let printedNames = 0;
for (const row of byLeague.values()) for (const ps of row.printed) for (const p of ps) { printedNames += 1; ok(L.identityKey(p) === genIdentity(p), `identityKey disagrees with the generator on "${p}"`); }
console.log(`  ${seasonsIn} seasons, ${canonIn} named places; ${answers} club seasons answered (${placed} in a league); ${market.length} market clubs placed in ${marketPlaced} club seasons; ${printedNames} printed names keyed alike; ${guarded} club seasons hold the old save guard`);

/* ─── b. PLAYED ─── */
head('b', 'PLAYED: seeded careers from 1990 to 2019, to retirement and into the dugout');
/* a job market or table club against the ledgers: by canon name, then by
   the identity of any spelling the sources printed */
const marketTruth = (name, y) => {
  if (y >= LIST_SEASON) return null;
  const want = genIdentity(L.MARKET_SPELLINGS[name] ?? name);
  for (const [k, row] of byLeague) {
    if (!k.endsWith(`|${y}`)) continue;
    if (row.canon.includes(name) || row.printed.some(ps => ps.some(p => genIdentity(p) === want))) return row;
  }
  return null;
};
const lineWant = (row, y, today) => (y >= LIST_SEASON ? (today || null) : row ? `${row.name}, ${span(y)}` : null);
const worldLabel = name => WORLD.find(c => c.name === name)?.league ?? '';
const step = (s, clubs, X = E) => {
  switch (s.phase) {
    case 'youth': return X.advanceYouthYear(s, clubs);
    case 'playing': return X.advanceProSeason(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? X.acceptOffer(s, o[(s.seasons.length * 7) % o.length]) : { ...s, phase: 'playing' }; }
    case 'rehab_choice': return X.applyRehabChoice(s, 1);
    case 'newspaper': return X.dismissNewspaper(s);
    case 'season_summary': return X.dismissSummary(s, clubs);
    case 'random_events': return s.pendingEvents?.[0] ? X.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'moral_dilemma': return s.pendingMoralDilemma ? X.applyMoralDilemmaChoice(s, 1) : X.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return s.pendingCoverAthleteEvent ? X.handleCoverAthleteDecision(s, false) : X.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return X.dismissAppealResult(s, clubs);
    case 'international_debut': return X.dismissDebut(s, clubs);
    case 'world_cup': return X.dismissWorldCup(s, clubs);
    case 'rivalry_event': return X.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return X.dismissBallonDor(s, clubs);
    case 'transfer_window': return s.transferSituation?.type === 'contract_expiry' ? X.signExtension(s) : X.stayAtClub(s);
    case 'retirement_suggestion': return X.declineRetirementSuggestion(s, clubs);
    default: return null;
  }
};
const cov = { careers: 0, seasons: 0, past: 0, pastSized: 0, pastChamp: 0, pastNone: 0, pastTitleNone: 0, derbies: 0,
  offers: 0, offersNone: 0, cards: 0, dugout: 0, dugoutLedger: 0, dugoutNamed: 0, dugoutUnknown: 0, jobs: 0, jobsNone: 0, stuck: 0,
  offerYears: 0, jobYears: 0, dugoutSeated: 0, dugoutUnplaced: 0, forced: 0, phone: 0, phoneSwapped: 0 };
const checkOffer = (club, y, where) => {
  cov.offers += 1;
  const want = lineWant(truthOf(club.name, y), y, club.league);
  const got = L.leagueSeasonLine(club, y);
  if (got === null && y < LIST_SEASON) cov.offersNone += 1;
  ok(got === want, `${where} ${club.name} for ${span(y)}: the card says ${JSON.stringify(got)}, the ledgers ${JSON.stringify(want)}`);
};
const checkSeason = (row) => {
  const y = row.year;
  cov.seasons += 1;
  if (y >= LIST_SEASON) return;
  cov.past += 1;
  const t = truthOf(row.club, y);
  const where = `${row.club} ${span(y)}`;
  if (row.leagueSize !== undefined) {
    if (ok(!!t && row.leagueSize === t.size, `${where}: a finish of ${row.leagueSize} clubs, the ledgers ${t ? `${t.name} of ${t.size}` : 'no league'}`)) cov.pastSized += 1;
    if (t && t.key === 'Championship') cov.pastChamp += 1;
  }
  if (!t) {
    cov.pastNone += 1;
    ok(row.leagueSize === undefined && (row.leagueFinish === undefined || (row.leagueFinish === 1 && row.leagueTitle === true)), `${where}: a finish (${row.leagueFinish} of ${row.leagueSize}) in a season the club was in none of the six`);
    if (row.leagueFinish === 1) cov.pastTitleNone += 1;
  } else if (row.leagueFinish !== undefined) {
    ok(row.leagueSize === t.size, `${where}: finish ${row.leagueFinish} with no size in ${t.name}, which had ${t.size}`);
  }
  if (row.leagueFinish !== undefined) {
    const printed = L.finishLeague({ name: row.club, league: worldLabel(row.club) }, y, row.leagueSize ?? null);
    ok((printed ? printed.name : null) === (t ? t.name : null), `${where}: the summary prints ${printed ? printed.name : 'no league'}, the ledgers ${t ? t.name : 'none'}`);
  }
  for (const d of row.derbies ?? []) {
    cov.derbies += 1;
    const r = truthOf(d.rival, y);
    ok(!!t && !!r && r.key === t.key, `${where}: a derby with ${d.rival}, who was in ${r ? r.name : 'none of the six'} while ${row.club} was in ${t ? t.name : 'none'}`);
  }
};
const STARTS = [[1990, '1990-94'], [1998, '1995-99'], [2005, '2005-09'], [2012, '2010-14'], [2019, '2015-19']];
const NATIONS = ['England', 'Spain', 'Italy', 'Germany', 'France', 'Brazil', 'Netherlands', 'Argentina'];
const POSITIONS = ['ST', 'CM', 'CB', 'GK', 'LW', 'RB', 'CAM', 'ST'];
const PER_START = Number(process.env.SIM_LEAGUE_SEASONS_PER_START || 8);
const DUGOUT_SEASONS = 10;
await E.loadManagerMarket();
const offersOf = s => {
  const out = [...(s.pendingOffers ?? []), ...(s.pendingLoanOffers ?? [])];
  const t = s.transferSituation;
  if (t) for (const k of ['offer', 'offerA', 'offerB']) if (t[k]?.club) out.push(t[k]);
  if (t?.offers) out.push(...t.offers.filter(o => o?.club));
  return out;
};
const checkDugoutRow = (s, row, calYear, prev) => {
  if (calYear >= LIST_SEASON || !row.table) return;
  cov.dugout += 1;
  const lr = typeof row.league === 'string' ? byLeague.get(`${row.league}|${calYear}`) ?? null : null;
  const words = L.dugoutTableWords(row);
  const rivals = row.table.filter(r => !r.you && !r.unnamed && r.club);
  const club = row.table.find(r => r.you)?.club ?? row.club;
  const where = `${club} ${span(calYear)}`;
  if (lr) {
    cov.dugoutLedger += 1;
    cov.dugoutNamed += rivals.length;
    ok(words.header === `Final table · ${lr.name}`, `${where}: the table is headed "${words.header}", the season's league was ${lr.name}`);
    ok(row.leagueSize === lr.size && row.sizeVerified === true, `${where}: a table of ${row.leagueSize} (verified ${row.sizeVerified}) for ${lr.name} of ${lr.size}`);
    ok(row.lineupUnknown !== true, `${where}: a ledger season still marked lineup unknown`);
    for (const r of rivals) ok(lr.canon.includes(r.club), `${where}: ${r.club} named in ${lr.name}, which it was not in that season`);
    ok((row.knownRivals ?? 0) <= lr.size - 1, `${where}: ${row.knownRivals} rivals named for ${lr.size} places`);
    /* his own row: in a league he was not in that season only where the
       game itself put him (a season it named at this club, or a move out
       of one), never by a job's label, which is today's */
    const t = marketTruth(club, calYear);
    if (!t || t.key !== lr.key) {
      cov.dugoutSeated += 1;
      ok(!!prev && prev.year === row.year - 1 && prev.club === club && typeof prev.league === 'string' && prev.lineupUnknown !== true,
        `${where}: seated in the ${lr.name}, which the club was not in (${t ? t.name : 'none of the six'}), with no season of the game's own behind it`);
    }
    /* nobody twice, and never his own club as a rival */
    const mine = L.clubLedgerSeason(club, calYear)?.canon ?? null;
    ok(new Set(rivals.map(r => r.club)).size === rivals.length, `${where}: a rival named twice (${rivals.map(r => r.club).join(', ')})`);
    ok(!rivals.some(r => r.club === club || (mine !== null && r.club === mine)), `${where}: his own club named as a rival too`);
  } else {
    if (row.lineupUnknown === true && row.league === undefined) cov.dugoutUnplaced += 1;
    cov.dugoutUnknown += 1;
    ok(words.header === 'Final table', `${where}: a season the ledgers do not hold is headed "${words.header}"`);
    ok(rivals.length === 0, `${where}: names ${rivals.map(r => r.club).join(', ')} in a league the ledgers do not hold`);
  }
};
/* The dugout, season by season: every job card, the season it names held
   to the season the table that follows is drawn for, and every past table. */
const playDugout = (s, seasons) => {
  for (let d = 0; d < seasons; d++) {
    const ms = s.managerState;
    let jobYear = null;
    if (ms.unemployed) {
      const y = E.managerNextSeasonYear(s);
      for (const off of ms.offers ?? []) {
        cov.jobs += 1;
        const got = L.leagueSeasonLine({ name: off.club, league: off.league }, y);
        if (got === null && y < LIST_SEASON) cov.jobsNone += 1;
        ok(got === lineWant(marketTruth(off.club, y), y, off.league), `dugout job ${off.club} for ${span(y)}: the card says ${JSON.stringify(got)}`);
      }
      if ((ms.offers ?? []).length) { s = E.acceptManagerOffer(s, 0); jobYear = y; }
    }
    const before = s.managerState.seasonResults;
    const prev = before[before.length - 1];
    s = E.advanceManagerSeason(s, WORLD);
    const after = s.managerState;
    const row = after.seasonResults[after.seasonResults.length - 1];
    const calYear = (s.seasons[s.seasons.length - 1]?.year ?? 2024) + after.season;
    if (jobYear !== null && row && row.table) {
      cov.jobYears += 1;
      ok(calYear === jobYear, `dugout job at ${row.club}: its card named ${span(jobYear)}, and the table that followed was ${span(calYear)}`);
    }
    if (row && row.year === after.season) checkDugoutRow(s, row, calYear, prev);
  }
  return s;
};
/* The phone's world against the season card: his title is crowned in the
   league the card names (where the phone keeps that league), and his club
   is crowned nowhere else, nor anywhere when he did not win. A season in
   none of the six may be crowned only under a label the ledgers do not
   hold (Ajax and the Eredivisie). */
const phoneAgrees = (club, label, year, won, w, key, where) => {
  cov.phone += 1;
  const allowed = key ?? (L.ledgerLeague(label, year) ? null : label);
  if (won && allowed && allowed in w.leagues) ok(w.leagues[allowed] === club, `${where}: the card says he won the ${allowed}, the phone crowns ${w.leagues[allowed]}`);
  const crowned = Object.entries(w.leagues).filter(([, c]) => c === club).map(([lg]) => lg);
  ok(crowned.every(lg => won && lg === allowed), `${where}: the phone crowns him in the ${crowned.join(' and ')} (his title ${won}, the card's league ${allowed ?? 'none'})`);
};
const checkPhone = (s, row) => {
  const w = s.phone?.world;
  if (!w || w.year !== row.year || row.year >= LIST_SEASON || row.club !== s.currentClub) return;
  const key = L.finishLeague({ name: row.club, league: s.currentLeague }, row.year, row.leagueSize ?? null)?.key ?? null;
  phoneAgrees(row.club, s.currentLeague, row.year, row.leagueTitle === true, w, key, `${row.club} ${span(row.year)}`);
};
for (const [start, era] of STARTS) {
  for (let k = 0; k < PER_START; k++) {
    const seed = SEED * 1000003 + start * 101 + k * 7919;
    Math.random = mulberry32(seed);
    const o = 62 + ((k * 5) % 19);
    const pos = POSITIONS[k % POSITIONS.length];
    const st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: pos === 'GK' ? o + 10 : o - 30 };
    let s = E.initCareer(`Ledger ${seed}`, NATIONS[(k + start) % NATIONS.length], pos, era, st, o, start, WORLD, null, Math.min(94, o + 12));
    cov.careers += 1;
    let seen = s.seasons.length;
    let steps = 0;
    /* the season an offer or loan card names must be the season that is
       then played: the page reads nextSeasonYear, so this holds it to the
       record rather than to itself */
    let offerYear = null;
    for (; steps < 1200 && !s.retired; steps++) {
      const offs = offersOf(s);
      for (const off of offs) checkOffer(off.club, E.nextSeasonYear(s), s.phase);
      if (offs.length && s.phase !== 'youth') offerYear = E.nextSeasonYear(s);
      if (s.phase === 'playing' && s.seasons.length) {
        cov.cards += 1;
        const y = s.seasons[s.seasons.length - 1].year;
        const t = truthOf(s.currentClub, y);
        ok(L.leagueInYear({ name: s.currentClub, league: s.currentLeague }, y) === (y >= LIST_SEASON ? (s.currentLeague || null) : t ? t.name : null), `club card ${s.currentClub} ${span(y)}: the wrong league`);
        if (s.pendingLoanOffers?.length && s.seasons.length % 3 === 0) { s = E.acceptLoan(s, s.pendingLoanOffers[0]); continue; }
      }
      const n = step(s, WORLD);
      if (!n) { cov.stuck += 1; break; }
      s = n;
      while (seen < s.seasons.length) {
        const row = s.seasons[seen];
        if (row.type === 'playing') {
          if (offerYear !== null) {
            cov.offerYears += 1;
            ok(row.year === offerYear, `an offer card named ${span(offerYear)}, and the season played next was ${span(row.year)}`);
            offerYear = null;
          }
          checkSeason(row);
          checkPhone(s, row);
        }
        seen += 1;
      }
    }
    if (!s.retired) { cov.stuck += 1; continue; }
    s = E.choosePostRetirement(s, 'manager', WORLD);
    if (!s.managerState) { cov.stuck += 1; continue; }
    playDugout(s, DUGOUT_SEASONS);
  }
}
/* Forced jobs, the same on every seed, so the past tables are checked on a
   floor no draw can empty (seed 4 once drew no dugout season in the six):
   clubs in one of the six that season, and clubs whose label (today's) is
   one of the six while the ledgers put them in none that season. */
const FORCED = [['Leeds United', 2010], ['Newcastle', 2008], ['Ipswich Town', 1997], ['Fiorentina', 1994], ['Malaga', 2015],
  ['Wolves', 2010], ['West Ham', 2011], ['Sunderland', 2018], ['Nottingham Forest', 2005], ['Brentford', 2005], ['Juventus', 2006], ['Ipswich Town', 2019]];
Math.random = mulberry32(20261006);
const before = { ledger: cov.dugoutLedger, unplaced: cov.dugoutUnplaced, seated: cov.dugoutSeated };
const forcedBase = E.initCareer('Forced', 'England', 'CM', '2005-09', { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 40 }, 70, 2005, WORLD, null, 80);
for (const [name, y] of FORCED) {
  const w = WORLD.find(c => c.name === name);
  if (!ok(!!w, `forced job: ${name} is not a club of the career's world`)) continue;
  Math.random = mulberry32(y * 131 + name.length);
  const s = { ...forcedBase, retired: true, phase: 'retired', seasons: [{ ...(forcedBase.seasons[0] ?? {}), year: y - 1 }],
    managerState: { club: 'Out of work', clubTier: 4, season: 0, trophies: 0, promotions: 0, seasonResults: [], unemployed: true, seasonsOut: 0,
      offers: [{ club: name, tier: w.tier, league: w.league, brief: 'A forced job.' }], nationalTeamOffer: false, managingNationalTeam: false } };
  if (!ok(E.managerNextSeasonYear(s) === y, `forced job ${name}: the state does not start in ${span(y)}`)) continue;
  cov.forced += 1;
  playDugout(s, 8);
}
const forced = { ledger: cov.dugoutLedger - before.ledger, unplaced: cov.dugoutUnplaced - before.unplaced, seated: cov.dugoutSeated - before.seated };
/* The phone's world against the season card, over every club of the world
   in one season of each five: when he wins his league the phone crowns him
   in the league the card names, and nowhere else; when he does not, it
   crowns him nowhere. */
Math.random = mulberry32(4242);
const phoneBase = E.initCareer('Phone', 'England', 'ST', '2005-09', { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 50 }, 80, 2005, WORLD, null, 88);
for (const y of [1991, 1996, 2001, 2006, 2011, 2016, 2021, 2025]) {
  for (const c of WORLD) {
    const key = L.finishLeague(c, y, null)?.key ?? null;
    if (key === null && !L.ledgerLeague(c.league, y)) continue;
    if (key !== c.league) cov.phoneSwapped += 1;
    for (const won of [true, false]) {
      const w = P.worldSeasonTick({ ...phoneBase, currentClub: c.name, currentLeague: c.league }, { year: y, playerLeagueTitle: won, playerUcl: false });
      phoneAgrees(c.name, c.league, y, won, w, key, `phone ${c.name} ${span(y)}`);
    }
  }
}
Math.random = realRandom;
console.log(`  ${cov.careers} careers, ${cov.seasons} playing seasons (${cov.past} before 2026-27: ${cov.pastSized} finishes sized from the ledgers, ${cov.pastChamp} of them in the Championship, ${cov.pastNone} in no ledger league, ${cov.pastTitleNone} titles there), ${cov.derbies} past derbies`);
console.log(`  ${cov.offers} offer and loan cards (${cov.offersNone} past ones with no league), ${cov.cards} club cards, ${cov.jobs} dugout jobs (${cov.jobsNone} with no league); dugout ${cov.dugout} past seasons: ${cov.dugoutLedger} from the ledgers naming ${cov.dugoutNamed} rivals, ${cov.dugoutUnknown} unknown (${cov.dugoutUnplaced} of them a club the ledgers put in none of the six), ${cov.dugoutSeated} seated by the game's own seasons; ${cov.stuck} stuck`);
console.log(`  years held to the record: ${cov.offerYears} offer seasons, ${cov.jobYears} dugout jobs; ${cov.forced} forced jobs (${forced.ledger} ledger seasons, ${forced.unplaced} unplaced, ${forced.seated} seated); phone against the card ${cov.phone} times (${cov.phoneSwapped} club seasons whose label is not that season's league)`);
ok(cov.stuck === 0, `${cov.stuck} careers stuck on a screen this harness cannot answer`);
/* Floors, so a run that saw too little cannot pass for a green one. Measured
   2026-10-07 after the review fixes over SIM_LEAGUE_SEASONS_SEED 1 to 5 (40
   careers each, plus the forced jobs): past finishes sized from the ledgers
   221, 278, 319, 287, 334; past derbies 167, 275, 302, 266, 348; offer and
   loan cards 1676, 1728, 1697, 1678, 1713; dugout seasons from the ledgers
   88, 105, 110, 66, 90 naming 259, 289, 321, 193, 266 rivals (the forced
   jobs alone give 66: before them seed 4 drew none at all, and the seeded
   careers' share is bimodal); unplaced 29, 43, 30, 29, 30 and seated 31,
   29, 36, 23, 29 (forced alone 29 and 23); dugout jobs held to their season
   21, 28, 28, 23, 20; offer seasons held 668, 697, 671, 678, 692; the phone
   held to the card 2052, 2050 and 2049 times on seeds 1, 2 and 5 (nearly all
   of it the fixed sweep). Each floor sits near half the lowest seed.
   Championship finishes ran 13, 0, 36, 24, 6, so they get no floor (the
   vitest file and section a hold the Championship's sizes). */
const FLOOR = { pastSized: 110, derbies: 80, offers: 800, dugoutLedger: 33, dugoutNamed: 95, dugoutUnplaced: 14, dugoutSeated: 11,
  jobYears: 10, offerYears: 330, phone: 1000 };
for (const [k, min] of Object.entries(FLOOR)) ok(cov[k] >= min, `coverage: ${k} ${cov[k]}, the floor is ${min}`);

/* ─── c. BASELINE ─── */
head('c', `BASELINE: from 2026-27 on, nothing moves against ${BASE}`);
const PINS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'soccerCareerFacts.json'), 'utf8')).clubLeagues;
const BASELINE_CAREERS = Number(process.env.SIM_LEAGUE_SEASONS_BASELINE || 12);
let baseRoot = null;
try {
  baseRoot = path.join(tmp, 'base');
  fs.mkdirSync(baseRoot, { recursive: true });
  execSync(`git archive ${BASE} src | tar --force-local -x -C "${baseRoot.replaceAll('\\', '/')}"`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'], shell: 'bash' });
} catch (err) { fail(`git archive ${BASE} failed: ${String(err.message).slice(0, 160)}`); baseRoot = null; }
const releasePins = release => ({ name: 'pins', setup(b) {
  b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => {
    let src = fs.readFileSync(args.path, 'utf8');
    if (release) {
      for (const [id, old] of RELEASED) {
        const row = PINS[id];
        const from = `{ id: "${id}", name: "${row.name}", `;
        const at = src.indexOf(from);
        if (at < 0) { console.error(`baseline: row ${id} not in the base engine`); process.exit(2); }
        const end = src.indexOf('},', at);
        const line = src.slice(at, end);
        if (!line.includes(`league: "${old}" `) && !line.includes(`league: "${row.league}" `)) { console.error(`baseline: ${id} has neither label`); process.exit(2); }
        src = src.slice(0, at) + line.replace(`league: "${old}" `, `league: "${row.league}" `) + src.slice(end);
      }
    }
    return { contents: src, loader: 'ts' };
  });
} });
/* a 2025 career played screen by screen, then ten dugout seasons; returns
   what a player sees from 2026-27 on */
async function replay(T, seed) {
  Math.random = mulberry32(seed);
  const k = seed % 8;
  const o = 62 + ((k * 5) % 19);
  const pos = POSITIONS[k];
  const st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: pos === 'GK' ? o + 10 : o - 30 };
  await T.E.loadManagerMarket();
  let s = T.E.initCareer(`Base ${seed}`, NATIONS[k], pos, '2025', st, o, 2025, T.E.FALLBACK_CLUBS, null, Math.min(94, o + 12));
  for (let i = 0; i < 1200 && !s.retired; i++) {
    const n = step.call(null, s, T.E.FALLBACK_CLUBS, T.E);
    if (!n) break;
    s = n;
  }
  const seasons = s.seasons.filter(r => r.year >= LIST_SEASON);
  const dug = [];
  if (s.retired) {
    s = T.E.choosePostRetirement(s, 'manager', T.E.FALLBACK_CLUBS);
    for (let d = 0; d < DUGOUT_SEASONS && s.managerState; d++) {
      if (s.managerState.unemployed && (s.managerState.offers ?? []).length) s = T.E.acceptManagerOffer(s, 0);
      s = T.E.advanceManagerSeason(s, T.E.FALLBACK_CLUBS);
      dug.push(s.managerState.seasonResults[s.managerState.seasonResults.length - 1]);
    }
  }
  Math.random = realRandom;
  /* Round 1041: the season row's cupRun (drawn from its own keyed generator,
     scripts/simCareerDomesticCup.mjs section 1) is not part of this compare */
  return JSON.stringify({ seasons, dug, retired: s.retired }, (k, v) => (k === 'cupRun' ? undefined : v));
}
/* Round 1041's two truth fixes move a career on purpose: a season in which
   the association played no cup is never won (Mexico has none from 2020-21),
   and the phone's world crowns cup winners by association. A career that
   differs from the base is checked once more on this tree with both rules
   taken out (in memory): equal then, the move is that round's and is
   printed; still different, it fails as before. When the base already holds
   Round 1041 the anchors still match and the arm is simply not needed. */
const R1041_OUT = [
  ['soccerCareerEngine.ts', '\n    && domesticCupFor(cupAssociation(state.currentClubCountry, state.currentLeague), seasonYear).kind !== "NONE";', ';'],
  ['soccerPhone.ts', 'if (assoc === undefined || opts.playerCupAssociation === undefined) {', 'if (true) {'],
];
const r1041Out = { name: 'r1041out', setup(b) {
  b.onLoad({ filter: /(soccerCareerEngine|soccerPhone)\.ts$/ }, args => {
    if (!path.resolve(args.path).toLowerCase().startsWith(path.resolve(ROOT, 'src').toLowerCase())) return undefined;
    let src = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
    if (CONTROL === 'future' && args.path.endsWith('soccerCareerEngine.ts')) { src = controlEdit(src); controlFired = true; }
    for (const [file, from, to] of R1041_OUT) {
      if (!args.path.endsWith(file)) continue;
      if (src.split(from).length !== 2) { console.error(`Round 1041 arm: the anchor is not in ${file} exactly once`); process.exit(2); }
      src = src.replace(from, to);
    }
    return { contents: src, loader: 'ts' };
  });
} };
/* Round 1100 (every league a real league) moves a career from 2026-27 on
   purpose: the club pool grew from 241 to 460 clubs, eight plain leagues got a
   size, a format and a cadence row, the finish outside the five is banded by
   the club's place in its own league, and the odd ledger gives the dugout a
   league's real number of rows. All of it lives in seven source files. A
   career that differs from the base is replayed on this tree with those
   seven files read from the base instead: equal then, the move is the
   round's and is printed; still different, it fails as before. Once the base
   holds the round the two trees agree and the arm is not needed. */
const R1100_FILES = ['data/careerLeagueSeasons.ts', 'data/clubRivalries.ts', 'data/leagueFormat.ts', 'data/soccerCareerClubPool.ts', 'lib/careerEras.ts', 'lib/soccerCareerDerby.ts', 'lib/soccerCareerLeague.ts'];
const r1100Out = { name: 'r1100out', setup(b) {
  b.onLoad({ filter: /\.ts$/ }, args => {
    const rel = path.relative(path.resolve(ROOT, 'src'), path.resolve(args.path)).split(path.sep).join('/');
    if (!R1100_FILES.includes(rel)) return undefined;
    const from = path.join(baseRoot, 'src', rel);
    if (!fs.existsSync(from)) { console.error(`Round 1100 arm: the base has no src/${rel}`); process.exit(2); }
    return { contents: fs.readFileSync(from, 'utf8').split('\r').join(''), loader: 'ts', resolveDir: path.dirname(args.path) };
  });
} };
/* Round 1052 added a league to Club Manager's world (the Russian Premier
   League), and a player's dugout years draw their job offers from every club
   of that world, so a career whose manager years are drawn after it plays
   differently from a base without the league. Same arm as Round 1041's: a
   career that differs from the base is checked once more on this tree with
   the league taken out in memory (its league row, its rules row and its
   nation, the three things the round appended to the engine's tables):
   equal then, the move is that round's and is printed; still different, it
   fails as before. When the base already holds the league the arm is simply
   not needed. A later gathered league adds its ids to the two lists. */
const R1052_LEAGUES = ['russia'];
const R1052_NATIONS = ['russia'];
const r1052Out = { name: 'r1052out', setup(b) {
  b.onLoad({ filter: /[\\/]lib[\\/]clubManager\.ts$/ }, args => {
    if (!path.resolve(args.path).toLowerCase().startsWith(path.resolve(ROOT, 'src').toLowerCase())) return undefined;
    let src = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
    const cut = (start, end, what) => {
      const a = src.indexOf(start);
      const z = a < 0 ? -1 : src.indexOf(end, a);
      if (a < 0 || z < 0 || src.indexOf(start, a + 1) >= 0) { console.error(`Round 1052 arm: ${what} is not in clubManager.ts exactly once`); process.exit(2); }
      src = src.slice(0, a) + src.slice(z + end.length);
    };
    for (const id of R1052_LEAGUES) { cut(`\n  ${id}: {\n`, '\n  },', `the rules row ${id}`); cut(`\n  {\n    id: '${id}',`, '\n  },', `the league row ${id}`); }
    for (const id of R1052_NATIONS) cut(`\n  { id: '${id}', name: `, ' },', `the nation ${id}`);
    return { contents: src, loader: 'ts' };
  });
} };
/* Restore only the certified form draw adjustment and whole Youth Mentor
   catalog object in copied candidate bundles. Every returned season and
   dugout field must still match the base, including after earlier inverses. */
const r1185Out = with1041 => ({ name: with1041 ? 'r1185and1041out' : 'r1185out', setup(b) {
  b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => {
    if (!path.resolve(args.path).toLowerCase().startsWith(path.resolve(ROOT, 'src').toLowerCase())) return undefined;
    let src = fs.readFileSync(args.path, 'utf8').replaceAll('\r\n', '\n');
    if (CONTROL === 'future') { src = controlEdit(src); controlFired = true; }
    const inverseReceipts = [];
    src = inverseCareerDevelopment(src, inverseReceipts);
    for (const receipt of inverseReceipts) replayReceipt.inverses.push({ ...receipt, arm: with1041 ? '1185+1187+1041' : '1185+1187' });
    if (with1041) {
      for (const [file, old, replacement] of R1041_OUT) {
        if (!args.path.endsWith(file)) continue;
        if (src.split(old).length !== 2) { console.error(`Round 1041 combined arm: the anchor is not in ${file} exactly once`); process.exit(2); }
        src = src.replace(old, replacement);
      }
    }
    return { contents: src, loader: 'ts' };
  });
} });
const futurePlugins = CONTROL === 'future' ? [controlPlugin] : [];
if (baseRoot) {
  const B = await bundle(baseRoot, 'base', [releasePins(true)], false);
  const Bkeep = await bundle(baseRoot, 'basekeep', [releasePins(false)], false);
  let same = 0; let differ = 0; let pinsMove = 0; let rows = 0; let by1041 = 0; let by1100 = 0; let by1052 = 0; let byBoth = 0; let by1185 = 0;
  let Mout = null; let Mout1100 = null; let Mout1052 = null; let MoutBoth = null;
  const formBundles = new Map();
  const formArms = [[], ['1041'], ['1100'], ['1052'], ['1041', '1100'], ['1041', '1052'], ['1100', '1052'], ['1041', '1100', '1052']];
  for (let i = 0; i < BASELINE_CAREERS; i++) {
    const seed = SEED * 7777 + i * 104729;
    const mine = await replay(M, seed);
    const base = await replay(B, seed);
    const kept = await replay(Bkeep, seed);
    const receipt = { seed, current: retainReplay(seed, 'current', mine), baseReleased: retainReplay(seed, 'base-released', base), baseKept: retainReplay(seed, 'base-kept', kept), attempts: [], acceptedArm: null };
    replayReceipt.cases.push(receipt);
    const tryArm = async (name, T) => {
      const value = await replay(T, seed);
      const equal = value === base;
      receipt.attempts.push({ arm: name, ...retainReplay(seed, name, value), equal });
      if (equal) receipt.acceptedArm = name;
      return equal;
    };
    const tryFormArms = async () => {
      for (const others of formArms) {
        const name = ['1185', '1187', ...others].join('+');
        if (!formBundles.has(name)) {
          const plugins = [r1185Out(others.includes('1041'))];
          if (others.includes('1041')) plugins.push(r1041Out);
          if (others.includes('1100')) plugins.push(r1100Out);
          if (others.includes('1052')) plugins.push(r1052Out);
          formBundles.set(name, await bundle(ROOT, `tree-${name}`, plugins));
        }
        if (await tryArm(name, formBundles.get(name))) return true;
      }
      return false;
    };
    rows += JSON.parse(mine).seasons.length + JSON.parse(mine).dug.length;
    if (mine === base) { same += 1; receipt.acceptedArm = 'raw'; }
    else if (await tryArm('1041', Mout ??= await bundle(ROOT, 'tree1041out', [r1041Out]))) { same += 1; by1041 += 1; console.log(`  career ${seed}: moved by Round 1041's two truth fixes (equal to the base with them taken out)`); }
    else if (await tryArm('1100', Mout1100 ??= await bundle(ROOT, 'tree1100out', [r1100Out, ...futurePlugins]))) { same += 1; by1100 += 1; }
    else if (await tryArm('1052', Mout1052 ??= await bundle(ROOT, 'tree1052out', [r1052Out, ...futurePlugins]))) { same += 1; by1052 += 1; console.log(`  career ${seed}: moved by Round 1052's new league in the dugout's job market (equal to the base with the league taken out)`); }
    /* Release AO: a tree that holds both rounds over a base that holds neither. A career whose playing years met
       Round 1100's bigger pool AND whose dugout years met Round 1052's league equals the base only with both taken
       out at once (the two arms read different files: clubManager.ts is not one of Round 1100's seven). */
    else if (await tryArm('1100+1052', MoutBoth ??= await bundle(ROOT, 'tree1100and1052out', [r1100Out, r1052Out, ...futurePlugins]))) { same += 1; byBoth += 1; console.log(`  career ${seed}: moved by Rounds 1100 and 1052 together (equal to the base only with both taken out)`); }
    else if (await tryFormArms()) { same += 1; by1185 += 1; console.log(`  career ${seed}: moved by Rounds 1185 and 1187's form selection and Youth Mentor catalog (${receipt.acceptedArm}; complete replay equals the base only after the declared copied inverses)`); }
    else {
      differ += 1;
      const a = JSON.parse(mine); const b = JSON.parse(base);
      const at = a.seasons.findIndex((r, j) => JSON.stringify(r) !== JSON.stringify(b.seasons[j]));
      fail(`career ${seed}: from 2026-27 it plays differently from ${BASE} (first at ${at >= 0 ? `season ${a.seasons[at]?.year} ${a.seasons[at]?.club}` : 'the dugout'})`);
    }
    if (base !== kept) pinsMove += 1;
  }
  console.log(`  ${same} of ${BASELINE_CAREERS} careers from 2025 identical from 2026-27 on (${rows} seasons and dugout rows compared); releasing the seven pins alone moves ${pinsMove} of them (attributed to the release, not the binds); ${by1041} of the identical ones only once Round 1041's two truth fixes are taken out, ${by1100} only once Round 1100's seven files are read from the base (the pool, the rows and the band moved them, on purpose)`);
  if (by1052) console.log(`  ${by1052} of the identical careers are identical only with Round 1052's league taken out of the dugout's job market`);
  if (byBoth) console.log(`  ${byBoth} of the identical careers are identical only with Round 1100's seven files read from the base and Round 1052's league taken out, both at once`);
  if (by1185) console.log(`  ${by1185} complete replays equal the historical base only with Rounds 1185 and 1187's form adjustment and whole Youth Mentor catalog restored, plus any explicitly named earlier inverse arms`);
  replayReceipt.baseline = { careers: BASELINE_CAREERS, same, differ, rows, pinsMove, by1041, by1100, by1052, byBoth, by1185 };
  /* 430, 428 and 431 rows over seeds 1 to 3 */
  ok(rows >= BASELINE_CAREERS * 25, `only ${rows} rows compared over ${BASELINE_CAREERS} careers (floor ${BASELINE_CAREERS * 25})`);
}

/* ─── d. WIRING ─── */
head('d', 'WIRING: the page prints a past season\'s league only through the lookup');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1').replace(/\{\s*\}/g, '{}');
const page = strip(readSrc('src/pages/SoccerCareer.tsx'));
const RAW = [
  ['offer.club.league}', 'an offer or loan card prints the club\'s saved label'],
  ['academyClub.league}', 'the academy card prints the saved label'],
  ['· {o.league}', 'the dugout market prints the market\'s label'],
  ['${career.currentLeague} ·', 'the club card prints the saved label'],
  ['league={clubs.find(', 'the season summary takes today\'s label'],
];
for (const [s, why] of RAW) ok(!page.includes(s), `${why} (${s})`);
const NEED = [
  ['leagueSeasonLine(offer.club, nextSeasonYear(career))', 'the offer card'],
  ['leagueSeasonLine(club, nextSeasonYear(career))', 'the loan cards'],
  ['leagueSeasonLine(academyClub,', 'the academy card'],
  ['leagueSeasonLine({ name: o.club, league: o.league }, managerNextSeasonYear(career))', 'the dugout market'],
  ['clubCardLeague(career, currentSeason.year)', 'the club card'],
  ['leagueInYear({ name: career.currentClub, league: career.currentLeague }, year)', 'the club card\'s lookup'],
  ['leagueOf={finishLeague(', 'the season summary'],
  ['namedInLeague(crowned, league, season.year)', 'the summary\'s champion'],
];
for (const [s, where] of NEED) ok(page.includes(s), `${where} no longer reads the lookup (${s})`);
const loanUses = page.split('loanLeagueLine(offer.club, career)').length - 1;
ok(loanUses === 2, `the loan line is used ${loanUses} times, 2 expected (both loan screens)`);
console.log(`  ${RAW.length} raw label prints absent, ${NEED.length} lookups present, both loan screens wired`);

/* ─── Summary ─── */
replayReceipt.sourceAfter = sourceHashes();
ok(JSON.stringify(replayReceipt.sourceAfter) === JSON.stringify(replayReceipt.sourceBefore), 'candidate replay source bytes changed during verification');
replayReceipt.failures = failures;
replayReceipt.failedSections = [...red];
replayReceipt.failureCounts = shown;
replayReceipt.controlFired = controlFired;
replayReceipt.status = CONTROL ? (red.has(controlSection) && (CONTROL !== 'future' || red.size === 1) ? 'expected-fault' : 'failed') : failures ? 'failed' : 'passed';
if (replayOut) fs.writeFileSync(path.join(replayOut, 'report.json'), JSON.stringify(replayReceipt, null, 2));
if (CONTROL) {
  const fired = red.has(controlSection);
  console.log(`\nCONTROL ${CONTROL}: section ${controlSection} ${fired ? `went red as it should (${shown[controlSection]} failures there, ${failures} in all)` : 'stayed green: the check does not work'}`);
  process.exit(fired && (CONTROL !== 'future' || red.size === 1) ? 0 : 1);
}
console.log(failures ? `\nsimCareerLeagueSeasons: ${failures} failures (sections ${[...red].join(', ')})` : '\nsimCareerLeagueSeasons: all sections green');
process.exit(failures ? 1 : 0);
