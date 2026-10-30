/**
 * Round 1583: read ESPN's public athlete service and nba.com's player page for every man on an NBA Connections
 * board (his NBA clubs season by season, his career regular season totals, his birthplace, his draft, whether he
 * is still playing) and write the record the NBA checker judges by: scripts/data/nbaConnectionsRecord-2026-10.json.
 *
 *   node scripts/usConnections/fetchNbaRecord.mjs fetch <work>       (MAX men a run, serial and paced)
 *   READ_ON=2026-10-29 node scripts/usConnections/fetchNbaRecord.mjs export <work> <out.json>   (the first write only)
 *   READ_ON=2026-10-29 node scripts/usConnections/fetchNbaRecord.mjs add <work>   (records only grow, Round 1574's rule)
 *
 * The names: every tile of src/data/nbaConnectionsPuzzles.ts, the men a fix may deal in (EXTRA), and with
 * NAMES_FROM=<a table file or a read only export> every man on those rows (a table file: its exported and decided
 * boards both). The record is one host for clubs and totals (ESPN) and one for the draft and the roster status
 * (nba.com); the second host for every fact is basketball-reference.com (scripts/usConnections/verifyNbaFacts.mjs),
 * and the checker reads both.
 *
 * nba.com's person id comes from the league's own player index (stats.nba.com/js/data/ptsd/stats_ptsd.js, read once
 * into the work folder); its player page carries COUNTRY (a nationality, never read as a birthplace), ROSTERSTATUS,
 * DRAFT_YEAR, DRAFT_ROUND and DRAFT_NUMBER (the overall pick). ESPN's displayDraft gives the pick within its round.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { athlete, athleteStats, searchAthletes, sleep } from './espnAthletes.mjs';
import { fold, nbaBirthCountry } from '../lib/usConnectionsCheck.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPORT = 'basketball/nba';

/* men a fix may deal in, read on both hosts before any is used */
export const EXTRA = [
  /* nbaconn-002 "Born in France": candidates for Tony Parker's place (he was born in Bruges, Belgium) */
  'Victor Wembanyama', 'Ian Mahinmi',
  /* nbaconn-004 "Played for the Sacramento Kings": candidates for DeMarcus Cousins' place, if he leaves */
  "De'Aaron Fox", 'Domantas Sabonis',
];
/* tile name -> ESPN athlete id where the search finds a namesake first or no one */
export const PICK = {
  /* the search does not find his NBA athlete (only a FIBA one); the id is the one ESPN's own box score of the
     2014 Finals, game 5 (event 400559378), gives him */
  'Boris Diaw': 2167,
  'Jimmy Butler': 6430, // ESPN's display name is "Jimmy Butler III"
  'Mark Jackson': 370, // the point guard (Knicks, Pacers, 1987 to 2004); the search's first ten are namesakes
  'Victor Oladipo': 2527963, // the search finds only his G League listing, under the same athlete id
  'Michael Jordan': 1035, // the Bulls and Wizards guard, not the 1990s namesake ESPN also lists
};
/* tile name -> nba.com person id where the league's index holds namesakes */
export const NBA_PICK = { 'Patrick Ewing': 121, 'Jimmy Butler': 202710 };

async function tileNames() {
  const R = ROOT.replaceAll('\\', '/');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbarec-'));
  fs.writeFileSync(path.join(tmp, 'e.mjs'), `export const b = (await import('${R}/src/data/nbaConnectionsPuzzles.ts')).nbaConnectionsPuzzles;`);
  await build({ entryPoints: [path.join(tmp, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error' });
  const { b } = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
  const live = [];
  for (const f of (process.env.NAMES_FROM ?? '').split(',').filter(Boolean)) {
    const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!Array.isArray(doc)) { for (const r of doc.rows ?? []) for (const g of [...r.exported, ...r.board]) live.push(...g.players); continue; }
    live.push(...doc.flatMap(r => { const v = typeof r.groups_json === 'string' ? JSON.parse(r.groups_json) : r.groups_json; return (Array.isArray(v) ? v : []).flatMap(g => g.players ?? []); }));
  }
  return [...new Set([...b.flatMap(x => x.groups.flatMap(g => g.players)), ...EXTRA, ...live])].sort();
}

/** nba.com's player index ([id, "Last, First", active, from, to, ...]), read once into the work folder. */
async function nbaIndex(work) {
  const f = path.join(work, '_ptsd.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const r = await fetch('https://stats.nba.com/js/data/ptsd/stats_ptsd.js', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36', Referer: 'https://www.nba.com/' } });
  if (!r.ok) throw new Error(`the nba.com player index answered ${r.status}`);
  const t = await r.text();
  const players = JSON.parse(t.replace(/^var stats_ptsd = /, '').replace(/;\s*$/, '')).data.players;
  fs.writeFileSync(f, JSON.stringify(players));
  return players;
}
const indexName = p => { const [last, first] = String(p[1]).split(', '); return first ? `${first} ${last}` : last; };

/** nba.com's player page data (pageProps.player.info), the fields the record keeps. */
async function nbaInfo(id) {
  const r = await fetch(`https://www.nba.com/player/${id}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' }, redirect: 'follow' });
  if (!r.ok) return { status: r.status };
  const m = (await r.text()).match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  const info = m ? JSON.parse(m[1])?.props?.pageProps?.player?.info : null;
  if (!info) return { status: 'no page data' };
  const keep = ['PERSON_ID', 'DISPLAY_FIRST_LAST', 'COUNTRY', 'ROSTERSTATUS', 'DRAFT_YEAR', 'DRAFT_ROUND', 'DRAFT_NUMBER', 'TEAM_NAME', 'FROM_YEAR', 'TO_YEAR'];
  return Object.fromEntries(keep.map(k => [k, info[k] ?? null]));
}

const step = process.argv[2];
const WORK = path.resolve(process.argv[3] ?? '.tmp-fx/nbawork');
const MAX = Number(process.env.MAX ?? 30);

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) && step === 'fetch') {
  fs.mkdirSync(WORK, { recursive: true });
  const index = await nbaIndex(WORK);
  let n = 0;
  for (const name of await tileNames()) {
    const f = path.join(WORK, fold(name) + '.json');
    if (fs.existsSync(f)) continue;
    if (n++ >= MAX) break;
    let id = PICK[name];
    let found = null;
    if (!id) { found = await searchAthletes(name, 'nba'); id = found[0]?.id; }
    const nbaFound = index.filter(p => fold(indexName(p)) === fold(name)).map(p => ({ id: p[0], from: p[3], to: p[4] }));
    const nbaId = NBA_PICK[name] ?? nbaFound[0]?.id ?? null;
    if (!id) { fs.writeFileSync(f, JSON.stringify({ name, error: 'no ESPN NBA player found', found, nbaId, nbaFound })); console.log(name, 'NONE'); continue; }
    const a = await athlete(SPORT, id);
    await sleep(250);
    const stats = await athleteStats(SPORT, id);
    await sleep(250);
    const info = nbaId ? await nbaInfo(nbaId) : null;
    await sleep(250);
    fs.writeFileSync(f, JSON.stringify({ name, id, found, athlete: a?.athlete ?? null, stats, nbaId, nbaFound, info }));
    console.log(name, id, nbaId, (found ?? []).length > 1 ? `ESPN NAMESAKES ${found.map(x => `${x.id} ${x.subtitle}`).join(' | ')}` : '', nbaFound.length > 1 ? `NBA NAMESAKES ${nbaFound.map(x => `${x.id} ${x.from}-${x.to}`).join(' | ')}` : '');
  }
  console.log('fetched', Math.min(n, MAX));
}

const num = v => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
/* "2003: Rd 1, Pk 1 (CLE)" -> [2003, 1, 1, 'CLE'] (the pick within its round) */
const espnDraft = s => { const m = String(s ?? '').match(/^(\d{4}): Rd (\d+), Pk (\d+) \(([A-Z]+)\)$/); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4]] : null; };

/**
 * One man's row. ESPN: seasons (each regular season row's club, the season named by its end year as "YYYY-YY",
 * a traded season's "<season> Totals" row skipped), career regular season totals (the Totals category; games from
 * the Averages one), birthplace and its country, ESPN's active flag and draft line. nba.com: the person id, the
 * roster status and the draft (the overall pick). active: ESPN's flag, or nba.com's "Active", or a season from
 * 2024-25 on (an unsigned veteran can still sign and add to a mark).
 */
export function parseNba(raw) {
  const a = raw.athlete ?? {};
  const st = raw.stats ?? {};
  const teams = st.teams ?? {};
  const cat = name => (st.categories ?? []).find(c => c.name === name);
  const seasons = {};
  for (const row of cat('totals')?.statistics ?? []) {
    const y = row.season?.year;
    if (!y || / Totals$/.test(String(row.teamSlug))) continue;
    const team = teams[row.teamSlug]?.displayName?.replace(/\s+/g, ' ').trim() ?? `slug:${row.teamSlug}`;
    (seasons[`${y - 1}-${String(y).slice(2)}`] ??= new Set()).add(team);
  }
  const at = (c, key) => { const i = (c?.names ?? []).indexOf(key); return i < 0 || !Array.isArray(c?.totals) ? null : num(String(c.totals[i]).replace(/,/g, '').split('-')[0]); };
  const tot = cat('totals');
  const career = tot ? {
    GP: at(cat('averages'), 'gamesPlayed'), PTS: at(tot, 'points'), REB: at(tot, 'totalRebounds'), AST: at(tot, 'assists'),
    FG3M: at(tot, 'threePointFieldGoalsMade-threePointFieldGoalsAttempted'), STL: at(tot, 'steals'), BLK: at(tot, 'blocks'),
  } : null;
  const info = raw.info ?? {};
  const draft = num(info.DRAFT_NUMBER) !== null ? [num(info.DRAFT_YEAR), num(info.DRAFT_ROUND), num(info.DRAFT_NUMBER)] : null;
  const keys = Object.keys(seasons).sort();
  const espnActive = !!a.active;
  return {
    espn: Number(raw.id),
    nba: raw.nbaId ?? null,
    name: a.displayName ?? null,
    bornText: a.displayBirthPlace ?? null,
    born: nbaBirthCountry(a.displayBirthPlace),
    espnActive,
    rosterStatus: info.ROSTERSTATUS ?? null,
    active: espnActive || info.ROSTERSTATUS === 'Active' || keys.some(k => Number(k.slice(0, 4)) >= 2024),
    seasons: Object.fromEntries(keys.map(k => [k, [...seasons[k]].sort()])),
    career,
    espnDraft: espnDraft(a.displayDraft),
    draft,
  };
}

const ABOUT = 'Round 1583. The record the NBA Connections checker judges every tile by: ESPN\'s public athlete service (site.web.api.espn.com, the athlete and its stats: clubs season by season from the regular season rows, career regular season totals, the birthplace as ESPN prints it and its country, ESPN\'s active flag and draft line) and nba.com\'s player page (the person id from the league\'s player index, the roster status and the draft with its overall pick). The second host for every fact is basketball-reference.com (scripts/data/nbaConnectionsSecondHost-2026-10.json), and the checker reads both: where the two disagree on a verdict it returns unknown, never a guess. ESPN keeps no seasons for Larry Bird and an incomplete record for some other early careers (no Milwaukee seasons and offensive plus defensive rebounds only for Kareem Abdul-Jabbar; rebounds were not split before 1973-74): those are decided in scripts/data/nbaConnectionsVerified-2026-10.json (overlay) on two hosts. ESPN names a moved or renamed club\'s old seasons by the club as it then was (Seattle SuperSonics, New Jersey Nets, New Orleans Hornets, NO/Oklahoma City Hornets, Charlotte Bobcats, San Diego Rockets, Buffalo Braves) and the Clippers under two names (LA Clippers, Los Angeles Clippers). Totals move while a season is played: the read date holds them. Regenerate with scripts/usConnections/fetchNbaRecord.mjs; never edit by hand.';
const text = doc => JSON.stringify(doc).replace(/,"men":\{/, ',\n"men":{\n').replace(/\},"(?=[^"]+":\{"espn")/g, '},\n"') + '\n';

async function readMen() {
  const men = {};
  const problems = [];
  for (const name of await tileNames()) {
    const f = path.join(WORK, fold(name) + '.json');
    if (!fs.existsSync(f)) { problems.push(`${name}: not fetched`); continue; }
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!raw.id || !raw.athlete) { problems.push(`${name}: ${raw.error ?? 'no athlete'}`); continue; }
    if ((raw.found ?? []).length > 1 && !PICK[name]) problems.push(`${name}: ESPN namesakes ${raw.found.map(x => `${x.id} ${x.subtitle}`).join(' | ')}`);
    if ((raw.nbaFound ?? []).length > 1 && !NBA_PICK[name]) problems.push(`${name}: nba.com namesakes ${raw.nbaFound.map(x => x.id).join(' | ')}`);
    men[name] = parseNba(raw);
  }
  return { men, problems };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) && step === 'export') {
  const day = process.env.READ_ON;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) { console.error('export needs READ_ON=YYYY-MM-DD'); process.exit(2); }
  const { men, problems } = await readMen();
  const doc = { about: ABOUT, source: 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/<id> and <id>/stats; https://www.nba.com/player/<id>', read: day, men: Object.fromEntries(Object.keys(men).sort().map(n => [n, men[n]])) };
  fs.writeFileSync(process.argv[4], text(doc));
  console.log('wrote', process.argv[4], Object.keys(men).length, 'men');
  for (const p of problems) console.log('  PROBLEM ' + p);
}

/* Round 1574's rule: records only grow. Every man and field the committed record holds is copied verbatim; a man it
   lacks is added whole with readOn, a man it holds gains only the fields he lacks (addedOn). Refuses when a fetch
   found another ESPN id for a man already held, and checks before writing that no existing field changed. */
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) && step === 'add') {
  const day = process.env.READ_ON;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) { console.error('add needs READ_ON=YYYY-MM-DD, the day the pages were read'); process.exit(2); }
  const file = path.join(ROOT, 'scripts', 'data', 'nbaConnectionsRecord-2026-10.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { men: fresh, problems } = await readMen();
  const men = { ...doc.men };
  const added = [];
  const grown = [];
  for (const [name, row] of Object.entries(fresh)) {
    if (!men[name]) { men[name] = { ...row, readOn: day }; added.push(name); continue; }
    if (men[name].espn !== row.espn) { problems.push(`${name}: the record holds ESPN ${men[name].espn}, the fetch found ${row.espn}; nothing added for him`); continue; }
    const more = Object.fromEntries(Object.entries(row).filter(([k]) => !(k in men[name])));
    if (Object.keys(more).length) { men[name] = { ...men[name], ...more, addedOn: day }; grown.push(name); }
  }
  const out = { ...doc, men: Object.fromEntries(Object.keys(men).sort().map(n => [n, men[n]])) };
  const back = JSON.parse(text(out));
  for (const [n, m] of Object.entries(doc.men)) for (const [k, v] of Object.entries(m)) {
    if (JSON.stringify(back.men[n]?.[k]) !== JSON.stringify(v)) { console.error(`STOP: add would change ${n}.${k}`); process.exit(1); }
  }
  for (const k of Object.keys(doc)) if (k !== 'men' && JSON.stringify(back[k]) !== JSON.stringify(doc[k])) { console.error(`STOP: add would change ${k}`); process.exit(1); }
  fs.writeFileSync(file, text(out));
  console.log(`add: ${added.length} men added, ${grown.length} men gained fields, ${Object.keys(doc.men).length} kept verbatim`);
  for (const p of problems) console.log('  PROBLEM ' + p);
}
