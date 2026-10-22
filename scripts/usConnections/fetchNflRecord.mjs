/**
 * Round 1558: read ESPN's public athlete service for every man on an NFL
 * Connections board (his clubs season by season from his stats, career
 * yards, college and draft line) and write the record the NFL checker
 * judges by: scripts/data/nflConnectionsRecord-2026-10.json.
 *
 * pro-football-reference.com answers a script with a bot check, and a bot
 * check is never worked around, so it is not read here. The NFL Grid's roster
 * table (scripts/data/nflGridPlayers.json, nflverse rosters 1970 to 2025) is
 * the second host for clubs, college and draft: the harness compares the two,
 * and a man they disagree on is decided in
 * scripts/data/nflConnectionsVerified-2026-10.json on two hosts.
 *
 *   node scripts/usConnections/fetchNflRecord.mjs fetch <work>       (MAX men a run)
 *   node scripts/usConnections/fetchNflRecord.mjs export <work> <out.json>
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [, , step, workArg, outArg] = process.argv;
const WORK = path.resolve(workArg ?? '.tmp-fx/nflwork');
const MAX = Number(process.env.MAX ?? 40);
const API = 'https://site.web.api.espn.com/apis';
fs.mkdirSync(WORK, { recursive: true });

/* men a fix may deal in */
export const EXTRA = [
  /* the man the round took off nflconn-004: kept, so the live table's row from before the round is judged too */
  "Le'Veon Bell",
];
/* tile name -> ESPN athlete id where the search finds a namesake first */
export const PICK = {
  /* the service files these men under another name, so a name search finds no one */
  'Cam Heyward': '13977', // Cameron Heyward
  'Tony Romo': '5209',
  'Travis Etienne': '4239996', // Travis Etienne Jr.
  /* namesakes: the man the board means (checked against his clubs on the board) */
  'Aaron Jones': '3042519', // the Packers running back (Aaron Jones Sr. on the service), not the Colts tackle
  'Adrian Peterson': '10452', // the Vikings running back, not the Bears one
  'Andre Johnson': '4461', // the Texans receiver
  'Chandler Jones': '14927', // the Patriots and Cardinals pass rusher
  'Chris Jones': '3044859', // the Chiefs defensive tackle
  'Clay Matthews': '12438', // Clay Matthews III, the Packers linebacker
  'DeVonta Smith': '4241478', // the Eagles receiver from Alabama
  'Justin Jefferson': '4262921', // the Vikings receiver from LSU
  'Lamar Jackson': '3916387', // the Ravens quarterback
};

const fold = s => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tileNames() {
  const R = ROOT.replaceAll('\\', '/');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nflrec-'));
  fs.writeFileSync(path.join(tmp, 'e.mjs'), `export const b = (await import('${R}/src/data/nflConnectionsPuzzles.ts')).nflConnectionsPuzzles;`);
  await build({ entryPoints: [path.join(tmp, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error' });
  const { b } = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
  /* NAMES_FROM=<a read only export of the live table>: the record reads every man on the live rows too, so the
     rows past the file (dealt only from the table) are judged by the same checker */
  const live = process.env.NAMES_FROM ? JSON.parse(fs.readFileSync(process.env.NAMES_FROM, 'utf8')).flatMap(r => { const v = typeof r.groups_json === 'string' ? JSON.parse(r.groups_json) : r.groups_json; return (Array.isArray(v) ? v : []).flatMap(g => g.players ?? []); }) : [];
  return [...new Set([...b.flatMap(x => x.groups.flatMap(g => g.players)), ...EXTRA, ...live])].sort();
}

async function getJson(url) {
  for (let i = 0; i < 3; i += 1) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (r.ok) return await r.json();
      console.log('  status', r.status, url);
      if (r.status === 404) return null;
    } catch (e) { console.log('  error', e.message); }
    await sleep(1500);
  }
  return null;
}

if (step === 'fetch') {
  let n = 0;
  for (const name of await tileNames()) {
    const f = path.join(WORK, fold(name) + '.json');
    if (fs.existsSync(f)) continue;
    if (n++ >= MAX) break;
    let id = PICK[name];
    let found = null;
    if (!id) {
      const s = await getJson(`${API}/search/v2?query=${encodeURIComponent(name)}&limit=10&type=player`);
      const players = (s?.results ?? []).filter(r => r.type === 'player').flatMap(r => r.contents ?? []);
      const nfl = players.filter(c => c.defaultLeagueSlug === 'nfl' && fold(c.displayName) === fold(name));
      found = nfl.map(c => ({ id: (c.uid.match(/a:(\d+)/) ?? [])[1], name: c.displayName, subtitle: c.subtitle }));
      id = found[0]?.id;
    }
    if (!id) { fs.writeFileSync(f, JSON.stringify({ name, error: 'no NFL player found', found })); console.log(name, 'NONE'); continue; }
    const athlete = await getJson(`${API}/common/v3/sports/football/nfl/athletes/${id}`);
    await sleep(200);
    const stats = await getJson(`${API}/common/v3/sports/football/nfl/athletes/${id}/stats`);
    await sleep(200);
    fs.writeFileSync(f, JSON.stringify({ name, id, found, athlete, stats }));
    console.log(name, id, (found ?? []).length > 1 ? `NAMESAKES ${found.map(x => x.id + ' ' + x.subtitle).join(' | ')}` : '');
  }
  console.log('fetched', Math.min(n, MAX));
}

/** Clubs by season (from every stats category), career yards, college and draft line. */
export function parseEspn(raw) {
  const seasons = {};
  const totals = {};
  const teams = raw.stats?.teams ?? {};
  for (const cat of raw.stats?.categories ?? []) {
    for (const row of cat.statistics ?? []) {
      const slug = row.teamSlug;
      const y = row.season?.year;
      if (!y || !slug || !teams[slug]) continue;
      (seasons[y] ??= new Set()).add(teams[slug].abbreviation);
    }
    const names = cat.names ?? [];
    const yi = names.indexOf(cat.name === 'passing' ? 'passingYards' : cat.name === 'rushing' ? 'rushingYards' : cat.name === 'receiving' ? 'receivingYards' : '');
    if (yi >= 0 && Array.isArray(cat.totals)) totals[cat.name] = Number(String(cat.totals[yi]).replace(/,/g, ''));
  }
  const a = raw.athlete?.athlete ?? {};
  return {
    espn: raw.id,
    seasons: Object.fromEntries(Object.entries(seasons).sort().map(([y, s]) => [y, [...s].sort()])),
    yards: totals,
    college: a.college?.name ?? null,
    draft: a.displayDraft ?? null,
    pos: a.position?.abbreviation ?? null,
  };
}

if (step === 'export') {
  const men = {};
  const problems = [];
  for (const name of await tileNames()) {
    const f = path.join(WORK, fold(name) + '.json');
    if (!fs.existsSync(f)) { problems.push(`${name}: not fetched`); continue; }
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!raw.id) { problems.push(`${name}: ${raw.error}`); continue; }
    if ((raw.found ?? []).length > 1 && !PICK[name]) problems.push(`${name}: namesakes ${raw.found.map(x => x.id + ' ' + x.subtitle).join(' | ')}`);
    men[name] = parseEspn(raw);
  }
  const doc = {
    about: 'Round 1558. The record the NFL Connections checker judges every tile by, read from ESPN\'s public athlete service (site.web.api.espn.com): each man\'s clubs season by season (every stats category), his career passing, rushing and receiving yards (regular season), college and draft line. One host; the NFL Grid roster table (scripts/data/nflGridPlayers.json) is the second for clubs, college and draft, and a group this record flags is decided on two hosts in scripts/data/nflConnectionsVerified-2026-10.json. Regenerate with scripts/usConnections/fetchNflRecord.mjs; never edit by hand.',
    source: `${API}/common/v3/sports/football/nfl/athletes/<id> and <id>/stats`,
    read: process.env.READ_ON ?? null,
    men,
  };
  fs.writeFileSync(outArg, JSON.stringify(doc).replace(/,"men":\{/, ',\n"men":{\n').replace(/\},"(?=[^"]+":\{"espn")/g, '},\n"') + '\n');
  console.log('wrote', outArg, Object.keys(men).length, 'men');
  for (const p of problems) console.log('  PROBLEM ' + p);
}
