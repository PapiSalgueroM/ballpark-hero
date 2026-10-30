/**
 * Round 1558: read the NHL's own data service (api-web.nhle.com) for every
 * man on an NHL Connections board (his NHL clubs season by season, career
 * regular season totals, birth country, draft) and write the record the NHL
 * checker judges by: scripts/data/nhlConnectionsRecord-2026-10.json.
 *
 *   node scripts/usConnections/fetchNhlRecord.mjs fetch <work>       (MAX men a run)
 *   node scripts/usConnections/fetchNhlRecord.mjs export <work> <out.json>
 *   node scripts/usConnections/fetchNhlRecord.mjs add <work>         (Round 1574: records only grow)
 *
 * Round 1574: NAMES_FROM may also name a table file (scripts/data/nhlConnectionsTable-2026-10.json), whose rows'
 * exported and decided boards both count (fetch into a new work folder, so every landing is read the same day).
 * The `add` step never rewrites a man the committed record
 * holds: it copies every existing man and every existing field verbatim, adds the men the record lacks (each with
 * readOn, the day his landing was read) and adds to an existing man only the fields he lacks (with addedOn).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [, , step, workArg, outArg] = process.argv;
const WORK = path.resolve(workArg ?? '.tmp-fx/nhlwork');
const MAX = Number(process.env.MAX ?? 40);
fs.mkdirSync(WORK, { recursive: true });

/* men a fix may deal in */
export const EXTRA = [
  /* Round 1558's fix of nhlconn-004: two Sharks far from 1,000 points */
  'Marc-Edouard Vlasic', 'Macklin Celebrini',
  /* the man the round took off nhlconn-004 (Brent Burns stays on nhlconn-003): kept for the live table's old row */
  'Erik Karlsson',
];
/* Round 1574: men a rebuilt NHL table group deals in (read on two hosts before any is used) */
export const EXTRA_1574 = [
  'Nick Schmaltz', // nhlconn-018's Utah group, in place of Karel Vejmelka (an active goalie beside the Vezina)
  'Gord Pettinger', // nhlconn-014's three franchise Cup group, in place of Al Arbour (his 1954 Cup is on one host)
];
/* tile name -> NHL player id where the search finds a namesake first */
export const PICK = {
  /* the search does not match the tile spelling */
  'David Pastrňák': 8477956,
  'Ryan Nugent-Hopkins': 8476454,
  /* namesakes: the man the board means */
  'Erik Karlsson': 8474578, // the defenceman (Senators, Sharks, Penguins), not the Hurricanes forward
  'Sebastian Aho': 8478427, // the Hurricanes forward, not the Penguins defenceman
  /* Round 1574 */
  'Jakub Voráček': 8474161, // the search does not match the accented spelling
  'Taylor Hall': 8475791, // the forward drafted first overall in 2010 (Hart 2017-18), not the 1980s namesake
  "Ryan O'Reilly": 8475158, // the centre (Avalanche, Sabres, Blues, Maple Leafs, Predators), not the 2020s prospect
};

const fold = s => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tileNames() {
  const R = ROOT.replaceAll('\\', '/');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nhlrec-'));
  fs.writeFileSync(path.join(tmp, 'e.mjs'), `export const b = (await import('${R}/src/data/nhlConnectionsPuzzles.ts')).nhlConnectionsPuzzles;`);
  await build({ entryPoints: [path.join(tmp, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error' });
  const { b } = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
  /* NAMES_FROM=<a read only export of the live table>: the record reads every man on the live rows too, so the
     rows past the file (dealt only from the table) are judged by the same checker */
  const live = [];
  for (const f of (process.env.NAMES_FROM ?? '').split(',').filter(Boolean)) {
    const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
    /* a table file: every man on a row's exported board and on its decided board */
    if (!Array.isArray(doc)) { for (const r of doc.rows ?? []) for (const g of [...r.exported, ...r.board]) live.push(...g.players); continue; }
    live.push(...doc.flatMap(r => { const v = typeof r.groups_json === 'string' ? JSON.parse(r.groups_json) : r.groups_json; return (Array.isArray(v) ? v : []).flatMap(g => g.players ?? []); }));
  }
  return [...new Set([...b.flatMap(x => x.groups.flatMap(g => g.players)), ...EXTRA, ...EXTRA_1574, ...live])].sort();
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
      const s = await getJson(`https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=20&q=${encodeURIComponent(name)}`);
      found = (s ?? []).filter(p => fold(p.name) === fold(name)).map(p => ({ id: p.playerId, name: p.name, last: p.lastSeasonId, team: p.lastTeamAbbrev }));
      id = found[0]?.id;
    }
    if (!id) { fs.writeFileSync(f, JSON.stringify({ name, error: 'no player found', found })); console.log(name, 'NONE'); continue; }
    const landing = await getJson(`https://api-web.nhle.com/v1/player/${id}/landing`);
    await sleep(200);
    fs.writeFileSync(f, JSON.stringify({ name, id, found, landing }));
    console.log(name, id, (found ?? []).length > 1 ? `NAMESAKES ${found.map(x => `${x.id} ${x.team} ${x.last}`).join(' | ')}` : '');
  }
  console.log('fetched', Math.min(n, MAX));
}

/** NHL clubs by season (regular season rows), career regular season totals, birth country, draft. */
export function parseNhl(raw) {
  const L = raw.landing ?? {};
  const seasons = {};
  for (const s of L.seasonTotals ?? []) {
    if (s.leagueAbbrev !== 'NHL' || s.gameTypeId !== 2) continue;
    const y = String(s.season).slice(0, 4) + '-' + String(s.season).slice(6, 8);
    (seasons[y] ??= new Set()).add(s.teamName?.default);
  }
  const c = L.careerTotals?.regularSeason ?? {};
  return {
    nhl: Number(raw.id),
    name: `${L.firstName?.default ?? ''} ${L.lastName?.default ?? ''}`.trim(),
    country: L.birthCountry ?? null,
    pos: L.position ?? null,
    active: !!L.isActive,
    seasons: Object.fromEntries(Object.entries(seasons).sort().map(([y, s]) => [y, [...s].sort()])),
    career: { GP: c.gamesPlayed ?? 0, G: c.goals ?? 0, A: c.assists ?? 0, P: c.points ?? 0 },
    draft: L.draftDetails ? [L.draftDetails.year, L.draftDetails.round, L.draftDetails.overallPick, L.draftDetails.teamAbbrev] : null,
    ...parseNhlMore(raw),
  };
}

/**
 * Round 1574: the fields the table groups need, from the same landing.
 *   aw    trophy name (as the landing names it) -> the seasons won, "YYYY-YY", newest last; the Stanley Cup rows
 *         are playoff rows (gameTypeId 3), the rest regular season awards
 *   sg    NHL regular season goals by season (a season split between clubs summed)
 *   gp    NHL regular season games by season (summed the same way)
 *   cg    NHL regular season goals by club, the club's name as each season row gives it
 *   pc    NHL playoff clubs by season (gameTypeId 3 rows): the club a Cup was won with
 *   wins  a goalie's career regular season wins (absent for a skater)
 *   hhof  1 when the landing says he is in the Hockey Hall of Fame, else 0
 */
export function parseNhlMore(raw) {
  const L = raw.landing ?? {};
  const yy = s => String(s).slice(0, 4) + '-' + String(s).slice(6, 8);
  const aw = {};
  for (const a of L.awards ?? []) {
    const t = a.trophy?.default;
    if (!t) continue;
    aw[t] = [...new Set([...(aw[t] ?? []), ...(a.seasons ?? []).map(s => yy(s.seasonId))])].sort();
  }
  const sg = {};
  const gp = {};
  const cg = {};
  const pc = {};
  for (const s of L.seasonTotals ?? []) {
    if (s.leagueAbbrev !== 'NHL') continue;
    const y = yy(s.season);
    if (s.gameTypeId === 2) {
      sg[y] = (sg[y] ?? 0) + (s.goals ?? 0);
      gp[y] = (gp[y] ?? 0) + (s.gamesPlayed ?? 0);
      const t = s.teamName?.default;
      if (t) cg[t] = (cg[t] ?? 0) + (s.goals ?? 0);
    }
    if (s.gameTypeId === 3) (pc[y] ??= new Set()).add(s.teamName?.default);
  }
  const c = L.careerTotals?.regularSeason ?? {};
  return {
    aw: Object.fromEntries(Object.entries(aw).sort(([a], [b]) => (a < b ? -1 : 1))),
    sg: Object.fromEntries(Object.entries(sg).sort()),
    gp: Object.fromEntries(Object.entries(gp).sort()),
    cg: Object.fromEntries(Object.entries(cg).sort(([a], [b]) => (a < b ? -1 : 1))),
    pc: Object.fromEntries(Object.entries(pc).sort().map(([y, s]) => [y, [...s].sort()])),
    ...(L.position === 'G' ? { wins: c.wins ?? 0 } : {}),
    hhof: L.inHHOF ? 1 : 0,
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
    if ((raw.found ?? []).length > 1 && !PICK[name]) problems.push(`${name}: namesakes ${raw.found.map(x => `${x.id} ${x.team} ${x.last}`).join(' | ')}`);
    men[name] = parseNhl(raw);
  }
  const doc = {
    about: 'Round 1558. The record the NHL Connections checker judges every tile by, read from the NHL\'s own data service (api-web.nhle.com, the player landing page): each man\'s NHL clubs season by season (regular season rows), his career regular season games, goals, assists and points, birth country and draft. One host; a group this record flags is decided on two hosts in scripts/data/nhlConnectionsVerified-2026-10.json. Career points move while a season is played: the read date is the line that holds them. Regenerate with scripts/usConnections/fetchNhlRecord.mjs; never edit by hand.',
    source: 'https://api-web.nhle.com/v1/player/<id>/landing',
    read: process.env.READ_ON ?? null,
    men,
  };
  fs.writeFileSync(outArg, JSON.stringify(doc).replace(/,"men":\{/, ',\n"men":{\n').replace(/\},"(?=[^"]+":\{"nhl")/g, '},\n"') + '\n');
  console.log('wrote', outArg, Object.keys(men).length, 'men');
  for (const p of problems) console.log('  PROBLEM ' + p);
}

/*
 * Round 1574: records only grow. Every man the committed record holds, and every field he has, is copied verbatim;
 * a man it lacks is added whole (readOn: the day his landing was read), and a man it holds gains only the fields he
 * lacks (addedOn: that day). Refuses to write when a fetch found another player id for a man already held, and
 * checks before writing that no existing field changed.
 *   READ_ON=2026-10-29 NAMES_FROM=scripts/data/nhlConnectionsTable-2026-10.json node scripts/usConnections/fetchNhlRecord.mjs add <work>
 */
if (step === 'add') {
  const day = process.env.READ_ON;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) { console.error('add needs READ_ON=YYYY-MM-DD, the day the landings were read'); process.exit(2); }
  const file = path.join(ROOT, 'scripts', 'data', 'nhlConnectionsRecord-2026-10.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const men = { ...doc.men };
  const added = [];
  const grown = [];
  const problems = [];
  for (const name of await tileNames()) {
    const f = path.join(WORK, fold(name) + '.json');
    if (!fs.existsSync(f)) { problems.push(`${name}: not fetched`); continue; }
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!raw.id) { problems.push(`${name}: ${raw.error}`); continue; }
    if ((raw.found ?? []).length > 1 && !PICK[name]) problems.push(`${name}: namesakes ${raw.found.map(x => `${x.id} ${x.team} ${x.last}`).join(' | ')}`);
    const row = parseNhl(raw);
    if (!men[name]) { men[name] = { ...row, readOn: day }; added.push(name); continue; }
    if (men[name].nhl !== row.nhl) { problems.push(`${name}: the record holds ${men[name].nhl}, the fetch found ${row.nhl}; nothing added for him`); continue; }
    const more = Object.fromEntries(Object.entries(row).filter(([k]) => !(k in men[name])));
    if (Object.keys(more).length) { men[name] = { ...men[name], ...more, addedOn: day }; grown.push(name); }
  }
  const out = { ...doc, men: Object.fromEntries(Object.keys(men).sort().map(n => [n, men[n]])) };
  if (!out.grown1574) out.grown1574 = 'Round 1574 grew this record without changing it: men added for the NHL table rows carry readOn, the day their landing was read; a man already held kept every value and gained only new fields (aw, sg, gp, cg, pc, wins, hhof), marked addedOn.';
  const keys = Object.keys(out).filter(k => k !== 'men');
  const ordered = { ...Object.fromEntries(keys.map(k => [k, out[k]])), men: out.men };
  const text = JSON.stringify(ordered).replace(/,"men":\{/, ',\n"men":{\n').replace(/\},"(?=[^"]+":\{"nhl")/g, '},\n"') + '\n';
  const back = JSON.parse(text);
  for (const [n, m] of Object.entries(doc.men)) for (const [k, v] of Object.entries(m)) {
    if (JSON.stringify(back.men[n]?.[k]) !== JSON.stringify(v)) { console.error(`STOP: add would change ${n}.${k}`); process.exit(1); }
  }
  for (const k of Object.keys(doc)) if (k !== 'men' && JSON.stringify(back[k]) !== JSON.stringify(doc[k])) { console.error(`STOP: add would change ${k}`); process.exit(1); }
  fs.writeFileSync(file, text);
  console.log(`add: ${added.length} men added, ${grown.length} men gained fields, ${Object.keys(doc.men).length} kept verbatim`);
  for (const p of problems) console.log('  PROBLEM ' + p);
}
