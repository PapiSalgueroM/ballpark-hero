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
               is the generator's on every printed name.
   b PLAYED    seeded careers starting in 1990, 1998, 2005, 2012 and 2019,
               played screen by screen to retirement and then into the dugout.
               Every offer, loan and dugout job line names the league the
               ledgers put the club in that season, or nothing; every finish
               of a past season sits in the club's real league at that
               season's verified size, and the line printed with it names
               that league; every derby of a past season is against a club
               in the same league that year; every dugout table of a past
               season in one of the six is headed by that season's name, has
               the verified size, and names only that season's members.
   c BASELINE  from 2026-27 on nothing moves: careers starting in 2025 are
               replayed on this tree and on SIM_LEAGUE_SEASONS_BASE (default
               origin/main, read with git archive) with the seven Round 1022
               pins released in the baseline too, so the comparison isolates
               the binds; every season from 2026 and every dugout row from
               2026 must be identical. The pins' own effect is printed (the
               same replay without releasing them in the baseline).
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

   Run: node scripts/simCareerLeagueSeasons.mjs
   No network and no database: everything is bundled from this tree (and,
   for section c, from the base ref through git archive). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
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
const BASE = process.env.SIM_LEAGUE_SEASONS_BASE || 'origin/main';
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
  todaylabel: ['b', 'src/lib/soccerCareerLeague.ts', s => swap('export function leagueSeasonLine(club: { name: string; league: string }, year: number): string | null {\n  const name = leagueInYear(club, year);', 'export function leagueSeasonLine(club: { name: string; league: string }, year: number): string | null {\n  const name = club.league || null;')(s.replace(/\r\n/g, '\n'))],
  finishwrong: ['b', 'src/lib/soccerCareerEngine.ts', swap('league: leagueKeyInYear({ name: state.currentClub, league: state.currentLeague }, seasonYear), year: seasonYear,', 'league: state.currentLeague, year: seasonYear,')],
  cardwire: ['d', 'src/pages/SoccerCareer.tsx', swap('`${clubCardLeague(career, currentSeason.year)}${career.contractYearsLeft}yr left · ', '`${career.currentLeague} · ${career.contractYearsLeft}yr left · ')],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
const [controlSection, controlFile, controlEdit] = CONTROLS[CONTROL] || [];
let controlFired = false;
const readSrc = rel => {
  let s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
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
const { E, L, J, S } = M;

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
console.log(`  ${seasonsIn} seasons, ${canonIn} named places; ${answers} club seasons answered (${placed} in a league); ${market.length} market clubs placed in ${marketPlaced} club seasons; ${printedNames} printed names keyed alike`);

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
  offers: 0, offersNone: 0, cards: 0, dugout: 0, dugoutLedger: 0, dugoutNamed: 0, dugoutUnknown: 0, jobs: 0, jobsNone: 0, stuck: 0 };
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
const checkDugoutRow = (s, row, calYear) => {
  if (calYear >= LIST_SEASON || !row.table) return;
  cov.dugout += 1;
  const lr = typeof row.league === 'string' ? byLeague.get(`${row.league}|${calYear}`) ?? null : null;
  const words = L.dugoutTableWords(row);
  const rivals = row.table.filter(r => !r.you && !r.unnamed && r.club);
  const where = `${s.managerState.club} ${span(calYear)}`;
  if (lr) {
    cov.dugoutLedger += 1;
    cov.dugoutNamed += rivals.length;
    ok(words.header === `Final table · ${lr.name}`, `${where}: the table is headed "${words.header}", the season's league was ${lr.name}`);
    ok(row.leagueSize === lr.size && row.sizeVerified === true, `${where}: a table of ${row.leagueSize} (verified ${row.sizeVerified}) for ${lr.name} of ${lr.size}`);
    ok(row.lineupUnknown !== true, `${where}: a ledger season still marked lineup unknown`);
    for (const r of rivals) ok(lr.canon.includes(r.club), `${where}: ${r.club} named in ${lr.name}, which it was not in that season`);
    ok((row.knownRivals ?? 0) <= lr.size - 1, `${where}: ${row.knownRivals} rivals named for ${lr.size} places`);
  } else {
    cov.dugoutUnknown += 1;
    ok(words.header === 'Final table', `${where}: a season the ledgers do not hold is headed "${words.header}"`);
    ok(rivals.length === 0, `${where}: names ${rivals.map(r => r.club).join(', ')} in a league the ledgers do not hold`);
  }
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
    for (; steps < 1200 && !s.retired; steps++) {
      for (const off of offersOf(s)) checkOffer(off.club, E.nextSeasonYear(s), s.phase);
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
      while (seen < s.seasons.length) { const row = s.seasons[seen]; if (row.type === 'playing') checkSeason(row); seen += 1; }
    }
    if (!s.retired) { cov.stuck += 1; continue; }
    s = E.choosePostRetirement(s, 'manager', WORLD);
    if (!s.managerState) { cov.stuck += 1; continue; }
    for (let d = 0; d < DUGOUT_SEASONS; d++) {
      const ms = s.managerState;
      if (ms.unemployed) {
        const y = E.managerNextSeasonYear(s);
        for (const off of ms.offers ?? []) {
          cov.jobs += 1;
          const got = L.leagueSeasonLine({ name: off.club, league: off.league }, y);
          if (got === null && y < LIST_SEASON) cov.jobsNone += 1;
          ok(got === lineWant(marketTruth(off.club, y), y, off.league), `dugout job ${off.club} for ${span(y)}: the card says ${JSON.stringify(got)}`);
        }
        if ((ms.offers ?? []).length) s = E.acceptManagerOffer(s, 0);
      }
      s = E.advanceManagerSeason(s, WORLD);
      const after = s.managerState;
      const row = after.seasonResults[after.seasonResults.length - 1];
      const calYear = (s.seasons[s.seasons.length - 1]?.year ?? 2024) + after.season;
      if (row && row.year === after.season) checkDugoutRow(s, row, calYear);
    }
  }
}
Math.random = realRandom;
console.log(`  ${cov.careers} careers, ${cov.seasons} playing seasons (${cov.past} before 2026-27: ${cov.pastSized} finishes sized from the ledgers, ${cov.pastChamp} of them in the Championship, ${cov.pastNone} in no ledger league, ${cov.pastTitleNone} titles there), ${cov.derbies} past derbies`);
console.log(`  ${cov.offers} offer and loan cards (${cov.offersNone} past ones with no league), ${cov.cards} club cards, ${cov.jobs} dugout jobs (${cov.jobsNone} with no league); dugout ${cov.dugout} past seasons: ${cov.dugoutLedger} from the ledgers naming ${cov.dugoutNamed} rivals, ${cov.dugoutUnknown} unknown; ${cov.stuck} stuck`);
ok(cov.stuck === 0, `${cov.stuck} careers stuck on a screen this harness cannot answer`);
/* Floors, so a run that saw too little cannot pass for a green one. Measured
   2026-10-06 over SIM_LEAGUE_SEASONS_SEED 1, 2 and 3 (40 careers each):
   past finishes sized from the ledgers 221, 278, 319; past derbies 167, 275,
   302; offer and loan cards 1676, 1728, 1697; dugout seasons from the
   ledgers 22, 53, 45 naming 66, 140, 132 rivals. Each floor sits near half
   the lowest seed. Championship finishes ran 13, 0, 36, so they get no floor
   (the vitest file and section a hold the Championship's sizes). */
const FLOOR = { pastSized: 110, derbies: 80, offers: 800, dugoutLedger: 10, dugoutNamed: 30 };
for (const [k, min] of Object.entries(FLOOR)) ok(cov[k] >= min, `coverage: ${k} ${cov[k]}, the floor is ${min}`);

/* ─── c. BASELINE ─── */
head('c', `BASELINE: from 2026-27 on, nothing moves against ${BASE}`);
const PINS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'soccerCareerFacts.json'), 'utf8')).clubLeagues;
/* the seven Round 1022 released, as they stood in the base: name and old label */
const RELEASED = [['fb-43', 'Premier League'], ['fb-66', 'Bundesliga'], ['fb-70', 'Ligue 1'], ['fb-93', 'Primera Division Paraguay'],
  ['fb-96', 'La Liga'], ['fb-106', 'Premier League'], ['fb-137', 'Liga 1 Indonesia']];
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
  return JSON.stringify({ seasons, dug, retired: s.retired });
}
if (baseRoot) {
  const B = await bundle(baseRoot, 'base', [releasePins(true)], false);
  const Bkeep = await bundle(baseRoot, 'basekeep', [releasePins(false)], false);
  let same = 0; let differ = 0; let pinsMove = 0; let rows = 0;
  for (let i = 0; i < BASELINE_CAREERS; i++) {
    const seed = SEED * 7777 + i * 104729;
    const mine = await replay(M, seed);
    const base = await replay(B, seed);
    const kept = await replay(Bkeep, seed);
    rows += JSON.parse(mine).seasons.length + JSON.parse(mine).dug.length;
    if (mine === base) same += 1;
    else {
      differ += 1;
      const a = JSON.parse(mine); const b = JSON.parse(base);
      const at = a.seasons.findIndex((r, j) => JSON.stringify(r) !== JSON.stringify(b.seasons[j]));
      fail(`career ${seed}: from 2026-27 it plays differently from ${BASE} (first at ${at >= 0 ? `season ${a.seasons[at]?.year} ${a.seasons[at]?.club}` : 'the dugout'})`);
    }
    if (base !== kept) pinsMove += 1;
  }
  console.log(`  ${same} of ${BASELINE_CAREERS} careers from 2025 identical from 2026-27 on (${rows} seasons and dugout rows compared); releasing the seven pins alone moves ${pinsMove} of them (attributed to the release, not the binds)`);
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
if (CONTROL) {
  const fired = red.has(controlSection);
  console.log(`\nCONTROL ${CONTROL}: section ${controlSection} ${fired ? `went red as it should (${shown[controlSection]} failures there, ${failures} in all)` : 'stayed green: the check does not work'}`);
  process.exit(fired ? 0 : 1);
}
console.log(failures ? `\nsimCareerLeagueSeasons: ${failures} failures (sections ${[...red].join(', ')})` : '\nsimCareerLeagueSeasons: all sections green');
process.exit(failures ? 1 : 0);
