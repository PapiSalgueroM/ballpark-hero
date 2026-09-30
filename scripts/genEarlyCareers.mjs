/**
 * genEarlyCareers: Round 704. The NHL and NBA career tables were missing the
 * early eras, so the grids refused true answers (Gordie Howe for Red Wings x
 * 300+ goals, Wilt Chamberlain for Lakers x 10,000 points).
 *
 * WHAT WAS ACTUALLY WRONG, measured on 2026-09-30 against the live tables
 * (read only), because the audit's one line summary of each was not the shape:
 *   nhl_player_stats  one CAREER row per skater, built from 1967-68 onward
 *                     only. A career that ended before 1967-68 is absent
 *                     (Maurice Richard), and one that crossed it is cut at it
 *                     (Gordie Howe 349 points, exactly his 1967-68 to 1979-80).
 *   nba_player_stats  one CAREER row per player, holding exactly the players
 *                     who played in 1979-80 or later, with their WHOLE career
 *                     (Rick Barry 18,395 and Elvin Hayes 27,313 are complete).
 *                     Every career that ended before 1979-80 is absent: 0 of
 *                     the table's 3,227 rows end earlier. The audit's "started
 *                     before 1965-66" was the symptom, not the rule (Earl Monroe
 *                     and Willis Reed started later and are missing too).
 *
 * SO THE FIX IS TWO DIFFERENT THINGS:
 *   insert  a new career row for every career wholly before the cutoff
 *   update  (NHL only) the truncated row of every skater who crossed it,
 *           compare and set: only when the live row still holds exactly the
 *           post cutoff totals this script measured from the league's own
 *           record, which is also the proof that row is the same man.
 *
 * SOURCES (see the migration header for licences):
 *   NHL  the league's official stats API, api.nhle.com/stats/rest, skater
 *        summary and bios, gameTypeId=2 (regular season only), keyed by the
 *        NHL's own player id. person_key 'nhl-<id>'.
 *   NBA  "NBA Stats (1947-present)", Sumitro Datta, CC0: Public Domain,
 *        derived from Basketball-Reference, pinned to one commit of the
 *        author's repository. BAA and NBA seasons only (the NBA counts the
 *        BAA as its own history; the ABA is excluded, as the live table
 *        excludes it: Rick Barry's row is his NBA total only). Keyed by the
 *        Basketball-Reference player id, the table's existing person_key
 *        convention (hardati01).
 *
 * THE METRIC DEFINITIONS MATCH THE LIVE ROWS, measured rather than assumed:
 *   - regular season only, playoffs excluded, in both;
 *   - a counting stat the league did not record in some seasons is summed over
 *     the seasons it did record (Barry's steals cover 1973-74 on), and is NULL
 *     when it was recorded in none of a player's seasons (a 1950s NBA career
 *     has no steals, no three pointers and no games started);
 *   - NHL: only games, goals, assists, points and penalty minutes are imported.
 *     Those are the counting stats every season of the league's record holds.
 *     Everything else stays as it was: NULL on a new row, and 1967-68 onward on
 *     an updated one (plus minus and shots do not exist for the early seasons);
 *   - fg_pct, ft_pct and ts_pct are recomputed from the summed columns with the
 *     formulas the live rows use (ts = pts / (2 * (fga + 0.44 * fta)), checked
 *     against Elvin Hayes's live 0.491).
 *
 * NAMESAKES ARE NEVER MERGED. Identity is the source's player id. And because
 * src/lib/gridEngine.ts indexes players by normalized name with the last row
 * winning, a new row whose normalized name equals any live row, or another new
 * row, is HELD rather than inserted: inserting it could silently replace a
 * modern player in the grid. Every held row is listed with its reason.
 *
 * WRITES ONLY FILES. It never writes to the database; the rows reach it through
 * the unapplied migration supabase/migrations/20260930_round_704_early_careers.sql.
 *
 *   node scripts/genEarlyCareers.mjs            fetch sources, read live, write
 *   EARLY_CAREERS_CACHE=<dir>                   where downloads are cached
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.env.EARLY_CAREERS_CACHE || path.join(os.tmpdir(), 'r704-early-careers');
fs.mkdirSync(CACHE, { recursive: true });

export const NBA_COMMIT = '76a70b41ad1c13948f25c62c921ed822e5db7f0e';
const NBA_RAW = `https://raw.githubusercontent.com/sumitrodatta/bball-reference-datasets/${NBA_COMMIT}/Data/`;
const NHL_API = 'https://api.nhle.com/stats/rest/en/skater';
export const NBA_CUTOFF = 1980; // season end year: 1979-80
export const NHL_CUTOFF = 19671968;

/* The live table's convention is Hockey-Reference's season codes (Chicago is
   CBH until 1985-86). The NHL API uses its own; this maps the early ones. Every
   code is checked on a Hockey-Reference player page in the pin file. */
export const NHL_TEAM_CODES = {
  BOS: 'BOS', BRK: 'BRO', CHI: 'CBH', DCG: 'DTC', DET: 'DET', DFL: 'DTF', HAM: 'HAM',
  MMR: 'MMR', MTL: 'MTL', MWN: 'MWN', NYA: 'NYA', NYR: 'NYR', PIR: 'PIR', QBD: 'QBD',
  QUA: 'PHQ', SEN: 'OTS', SLE: 'SLE', TAN: 'TAN', TOR: 'TOR', TSP: 'TSP',
};
const NHL_POSITION = { C: 'C', L: 'LW', R: 'RW', D: 'D' };

/* The grid engine's own normalization (src/lib/gridEngine.ts normalizeGridName). */
const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
export const normName = (n) => String(n).normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim().replace(/\s+/g, ' ');

export const seasonLabel = (endYear) => `${endYear - 1}-${String(endYear).slice(2)}`;
const nhlLabel = (id) => `${String(id).slice(0, 4)}-${String(id).slice(6)}`;

// ---------------------------------------------------------------- fetching

async function cached(name, get) {
  const file = path.join(CACHE, name);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const text = await get();
  fs.writeFileSync(file, text);
  return text;
}

async function fetchText(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.text();
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
}

/* The stats API silently caps a response at 10,000 rows, so every call pages
   by season window and must come back with total equal to rows received. */
async function nhlReport(report, exp, agg) {
  const url = `${NHL_API}/${report}?isAggregate=${agg}&isGame=false&start=0&limit=-1`
    + `&sort=${encodeURIComponent(agg ? '[{"property":"playerId","direction":"ASC"}]' : '[{"property":"playerId","direction":"ASC"},{"property":"seasonId","direction":"ASC"}]')}`
    + `&cayenneExp=${encodeURIComponent(exp)}`;
  const key = `nhl-${report}-${agg}-${exp.replace(/[^0-9a-z]+/gi, '_')}.json`;
  const d = JSON.parse(await cached(key, () => fetchText(url)));
  if (!Array.isArray(d.data) || d.data.length !== d.total || d.total >= 10000) {
    throw new Error(`NHL ${report} ${exp}: received ${d.data?.length} of ${d.total}; a capped or partial page is refused`);
  }
  return d.data;
}

function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let field = '', row = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [h, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(h.map((k, j) => [k, r[j]])));
}

/* Read only, through the public REST endpoint with the anon key the site ships. */
export function liveClient() {
  const src = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
  const url = src.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1];
  const key = src.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
  if (!url || !key) throw new Error('could not read the Supabase URL and anon key from client.ts');
  return async function readAll(table, select) {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      /* The anon role's statement timeout (57014) cancels a page now and then
         under load; Round 358 measured it as transient. Retry, then give up. */
      let page = null, last = '';
      for (let attempt = 1; attempt <= 5 && !page; attempt++) {
        const r = await fetch(`${url}/rest/v1/${table}?select=${select}&order=id.asc&offset=${from}&limit=1000`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        if (r.ok) page = await r.json();
        else { last = `${r.status} ${await r.text()}`; await new Promise((res) => setTimeout(res, 1500 * attempt)); }
      }
      if (!page) throw new Error(`live ${table}: ${last}`);
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return rows;
  };
}

const num = (v) => (v === undefined || v === null || v === '' || v === 'NA' ? null : Number(v));
const sumTracked = (rows, k) => {
  const vals = rows.map((r) => r[k]).filter((v) => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
};
const r3 = (x) => (x === null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);

// ---------------------------------------------------------------- NBA

const NBA_STATS = ['g', 'mp', 'fg', 'fga', 'x3p', 'x3pa', 'ft', 'fta', 'orb', 'drb', 'trb', 'ast', 'stl', 'blk', 'tov', 'pf', 'pts'];
const isMulti = (team) => /^\dTM$|^TOT$/.test(team);

export function nbaCareers(totalsCsv, infoCsv) {
  const info = new Map(parseCsv(infoCsv).map((r) => [r.player_id, r]));
  const byId = new Map();
  for (const r of parseCsv(totalsCsv)) {
    if (r.lg !== 'NBA' && r.lg !== 'BAA') continue;
    const row = { id: r.player_id, name: r.player, season: Number(r.season), team: r.team, age: num(r.age) };
    for (const k of NBA_STATS) row[k] = num(r[k]);
    (byId.get(row.id) || byId.set(row.id, []).get(row.id)).push(row);
  }
  const careers = [];
  for (const [id, rows] of byId) {
    const seasons = [...new Set(rows.map((r) => r.season))].sort((a, b) => a - b);
    // A traded season has a combined nTM row plus one row per team: the combined row is the season.
    const seasonRows = seasons.map((s) => {
      const x = rows.filter((r) => r.season === s);
      const multi = x.filter((r) => isMulti(r.team));
      if (multi.length > 1) throw new Error(`${id} ${s}: two combined rows`);
      if (!multi.length && x.length > 1) throw new Error(`${id} ${s}: several teams and no combined row`);
      return multi[0] || x[0];
    });
    const teams = [...new Set(rows.filter((r) => !isMulti(r.team)).map((r) => r.team))].sort();
    const ages = seasonRows.map((r) => r.age).filter((a) => a !== null);
    const t = Object.fromEntries(NBA_STATS.map((k) => [k, sumTracked(seasonRows, k)]));
    const ci = info.get(id);
    const pos = ci && ci.pos && ci.pos !== 'NA' ? ci.pos[0] : null;
    careers.push({
      id, name: rows[0].name, first: seasons[0], last: seasons[seasons.length - 1], seasons: seasons.length,
      rows, seasonRows, teams, pos, posRaw: ci?.pos ?? null, hof: ci?.hof === 'TRUE',
      ageRange: ages.length ? `${Math.min(...ages)}-${Math.max(...ages)}` : null,
      t,
    });
  }
  return careers;
}

export function nbaRow(c) {
  const { t } = c;
  return {
    person_key: c.id,
    player_name: c.name,
    year_from: seasonLabel(c.first),
    year_to: seasonLabel(c.last),
    age_range: c.ageRange,
    games: t.g,
    games_started: null,
    minutes: t.mp,
    fg: t.fg, fga: t.fga,
    three_p: t.x3p, three_pa: t.x3pa,
    ft: t.ft, fta: t.fta,
    orb: t.orb, drb: t.drb, trb: t.trb,
    ast: t.ast, stl: t.stl, blk: t.blk, tov: t.tov, pf: t.pf,
    points: t.pts,
    fg_pct: t.fga ? r3(t.fg / t.fga) : null,
    three_pct: t.x3pa ? r3(t.x3p / t.x3pa) : null,
    ft_pct: t.fta ? r3(t.ft / t.fta) : null,
    ts_pct: t.fga || t.fta ? r3(t.pts / (2 * (t.fga + 0.44 * t.fta))) : null,
    position: c.pos,
    teams: c.teams.join(','),
  };
}

// ---------------------------------------------------------------- NHL

function ageOnFeb1(birth, seasonId) {
  const endYear = Number(String(seasonId).slice(4));
  const [by, bm, bd] = birth.split('-').map(Number);
  let age = endYear - by;
  if (bm > 2 || (bm === 2 && bd > 1)) age -= 1;
  return age;
}

export function nhlCareers(early, post, bios) {
  const bio = new Map(bios.map((b) => [b.playerId, b]));
  const byId = new Map();
  for (const r of early) (byId.get(r.playerId) || byId.set(r.playerId, { early: [], post: [] }).get(r.playerId)).early.push(r);
  for (const r of post) if (byId.has(r.playerId)) byId.get(r.playerId).post.push(r);
  const careers = [];
  for (const [pid, { early: e, post: p }] of byId) {
    e.sort((a, b) => a.seasonId - b.seasonId);
    p.sort((a, b) => a.seasonId - b.seasonId);
    const b = bio.get(pid);
    const sum = (rows, k) => rows.reduce((a, r) => a + r[k], 0);
    const teams = new Set();
    for (const r of e) for (const code of String(r.teamAbbrevs).split(',').map((s) => s.trim())) {
      const mapped = NHL_TEAM_CODES[code];
      if (!mapped) throw new Error(`NHL team code ${code} has no mapping (${r.skaterFullName} ${r.seasonId})`);
      teams.add(mapped);
    }
    const positions = new Set(e.map((r) => r.positionCode));
    if (positions.size !== 1) throw new Error(`${pid} has ${positions.size} position codes`);
    const tot = (rows) => ({ games: sum(rows, 'gamesPlayed'), goals: sum(rows, 'goals'), assists: sum(rows, 'assists'), points: sum(rows, 'points'), pim: sum(rows, 'penaltyMinutes') });
    careers.push({
      pid, key: `nhl-${pid}`, name: e[0].skaterFullName, birth: b?.birthDate ?? null, hof: b?.isInHallOfFameYn === 'Y',
      position: NHL_POSITION[e[0].positionCode],
      early: e, post: p, earlyTeams: [...teams].sort(),
      earlyTot: tot(e), postTot: p.length ? tot(p) : null,
      first: e[0].seasonId, lastEarly: e[e.length - 1].seasonId,
      firstPost: p[0]?.seasonId ?? null, lastPost: p[p.length - 1]?.seasonId ?? null,
    });
  }
  return careers;
}

const ageRange = (birth, fromId, toId) => (birth ? `${ageOnFeb1(birth, fromId)}-${ageOnFeb1(birth, toId)}` : null);

// ---------------------------------------------------------------- build

export async function build({ log = console.log } = {}) {
  const readAll = liveClient();
  const nbaLive = await readAll('nba_player_stats', 'id,player_name,person_key,year_from,year_to,games,points,trb,ast,teams,position');
  const nhlLive = await readAll('nhl_player_stats', 'id,player_name,person_key,year_from,year_to,age_range,games,goals,assists,points,pim,teams,position');
  log(`live: nba_player_stats ${nbaLive.length} rows, nhl_player_stats ${nhlLive.length} rows`);

  // ---- NBA
  const totalsCsv = await cached('nba-Player Totals.csv', () => fetchText(NBA_RAW + 'Player%20Totals.csv'));
  const infoCsv = await cached('nba-Player Career Info.csv', () => fetchText(NBA_RAW + 'Player%20Career%20Info.csv'));
  const careers = nbaCareers(totalsCsv, infoCsv);
  const liveByNorm = new Map();
  for (const r of nbaLive) (liveByNorm.get(normName(r.player_name)) || liveByNorm.set(normName(r.player_name), []).get(normName(r.player_name))).push(r);
  const statSig = (g, p, trb, ast) => `${g}|${p}|${trb}|${ast}`;
  const liveBySig = new Map(nbaLive.map((r) => [statSig(r.games, r.points, r.trb, r.ast), r]));

  const nbaInsert = [], nbaHeld = [], nbaStraddle = { agree: 0, differ: [], missing: [], spelledDifferently: [] };
  const early = careers.filter((c) => c.last < NBA_CUTOFF);
  const straddlers = careers.filter((c) => c.first < NBA_CUTOFF && c.last >= NBA_CUTOFF);
  for (const c of straddlers) {
    const row = nbaRow(c);
    const live = liveByNorm.get(normName(c.name)) || [];
    const same = live.find((l) => l.games === row.games && l.points === row.points && l.trb === row.trb && l.ast === row.ast);
    if (same) { nbaStraddle.agree++; continue; }
    const bySig = liveBySig.get(statSig(row.games, row.points, row.trb, row.ast));
    if (bySig) { nbaStraddle.spelledDifferently.push({ id: c.id, name: c.name, live: bySig.player_name }); continue; }
    if (live.length) nbaStraddle.differ.push({ id: c.id, name: c.name, source: [row.games, row.points, row.trb, row.ast], live: live.map((l) => [l.player_name, l.games, l.points, l.trb, l.ast, l.year_from, l.year_to]) });
    else nbaStraddle.missing.push({ id: c.id, name: c.name, year_from: row.year_from, year_to: row.year_to, games: row.games, points: row.points });
  }
  const earlyNorm = new Map();
  for (const c of early) (earlyNorm.get(normName(c.name)) || earlyNorm.set(normName(c.name), []).get(normName(c.name))).push(c);
  for (const c of early) {
    const n = normName(c.name);
    if (liveByNorm.has(n)) { nbaHeld.push({ person_key: c.id, name: c.name, reason: `namesake of live row(s) ${liveByNorm.get(n).map((l) => `${l.player_name} ${l.year_from} to ${l.year_to}`).join('; ')}` }); continue; }
    const others = earlyNorm.get(n).filter((o) => o.id !== c.id);
    if (others.length) { nbaHeld.push({ person_key: c.id, name: c.name, reason: `namesake of another early career: ${others.map((o) => `${o.id} ${seasonLabel(o.first)} to ${seasonLabel(o.last)}`).join('; ')}` }); continue; }
    if (c.t.g === null || c.t.g <= 0) { nbaHeld.push({ person_key: c.id, name: c.name, reason: 'no games recorded' }); continue; }
    nbaInsert.push(nbaRow(c));
  }
  log(`NBA: ${careers.length} BAA and NBA careers in the source; ${early.length} ended before 1979-80; ${nbaInsert.length} to insert, ${nbaHeld.length} held`);
  log(`NBA straddlers (a season on both sides of 1979-80): ${straddlers.length}; live row agrees ${nbaStraddle.agree}, spelled differently ${nbaStraddle.spelledDifferently.length}, differs ${nbaStraddle.differ.length}, missing ${nbaStraddle.missing.length}`);

  // ---- NHL
  const nhlEarly = await nhlReport('summary', 'seasonId>=19171918 and seasonId<=19661967 and gameTypeId=2', false);
  const ids = new Set(nhlEarly.map((r) => r.playerId));
  const post = [];
  for (const [a, b] of [[19671968, 19721973], [19731974, 19781979], [19791980, 19841985], [19851986, 19901991]]) {
    post.push(...(await nhlReport('summary', `seasonId>=${a} and seasonId<=${b} and gameTypeId=2`, false)).filter((r) => ids.has(r.playerId)));
  }
  if (post.some((r) => r.seasonId >= 19851986)) throw new Error('an early skater played in 1985-86 or later: widen the post cutoff windows');
  const bios = await nhlReport('bios', 'seasonId>=19171918 and seasonId<=19661967 and gameTypeId=2', true);
  const nhl = nhlCareers(nhlEarly, post, bios);

  const nhlLiveByNorm = new Map();
  for (const r of nhlLive) (nhlLiveByNorm.get(normName(r.player_name)) || nhlLiveByNorm.set(normName(r.player_name), []).get(normName(r.player_name))).push(r);
  const nhlInsert = [], nhlUpdate = [], nhlHeld = [];
  const claimedLive = new Set();
  // Straddlers first: they claim their live row by name AND by the post cutoff totals agreeing exactly.
  for (const c of nhl.filter((x) => x.postTot)) {
    const cands = (nhlLiveByNorm.get(normName(c.name)) || []).filter((l) =>
      l.games === c.postTot.games && l.goals === c.postTot.goals && l.assists === c.postTot.assists
      && l.points === c.postTot.points && l.pim === c.postTot.pim
      && l.year_from === nhlLabel(c.firstPost) && l.year_to === nhlLabel(c.lastPost));
    if (cands.length !== 1) {
      const any = nhlLiveByNorm.get(normName(c.name)) || [];
      nhlHeld.push({ person_key: c.key, name: c.name, reason: cands.length ? 'two live rows match the post 1967 totals' : any.length
        ? `live row does not hold the league's 1967-68 onward totals (league ${c.postTot.games} GP ${c.postTot.points} P ${nhlLabel(c.firstPost)} to ${nhlLabel(c.lastPost)}; live ${any.map((l) => `${l.games} GP ${l.points} P ${l.year_from} to ${l.year_to}`).join('; ')})`
        : 'played after 1967-68 but has no live row under this name' });
      continue;
    }
    const l = cands[0];
    claimedLive.add(l.id);
    const liveUpper = String(l.age_range ?? '').split('-')[1];
    const teams = [...new Set([...String(l.teams).split(',').map((s) => s.trim()).filter(Boolean), ...c.earlyTeams])].sort();
    nhlUpdate.push({
      id: l.id, person_key: c.key, player_name: l.player_name,
      before_year_from: l.year_from, before_age_range: l.age_range, before_games: l.games, before_goals: l.goals,
      before_assists: l.assists, before_points: l.points, before_pim: l.pim, before_teams: l.teams,
      year_from: nhlLabel(c.first),
      age_range: c.birth && liveUpper ? `${ageOnFeb1(c.birth, c.first)}-${liveUpper}` : l.age_range,
      games: l.games + c.earlyTot.games, goals: l.goals + c.earlyTot.goals, assists: l.assists + c.earlyTot.assists,
      points: l.points + c.earlyTot.points, pim: l.pim + c.earlyTot.pim,
      teams: teams.join(','),
    });
  }
  const pureEarly = nhl.filter((x) => !x.postTot);
  const earlyNhlNorm = new Map();
  for (const c of nhl) (earlyNhlNorm.get(normName(c.name)) || earlyNhlNorm.set(normName(c.name), []).get(normName(c.name))).push(c);
  for (const c of pureEarly) {
    const n = normName(c.name);
    const live = nhlLiveByNorm.get(n) || [];
    if (live.length) { nhlHeld.push({ person_key: c.key, name: c.name, reason: `namesake of live row(s) ${live.map((l) => `${l.player_name} ${l.year_from} to ${l.year_to}`).join('; ')}` }); continue; }
    const others = earlyNhlNorm.get(n).filter((o) => o.pid !== c.pid);
    if (others.length) { nhlHeld.push({ person_key: c.key, name: c.name, reason: `namesake of another early career: ${others.map((o) => `nhl-${o.pid} ${nhlLabel(o.first)} to ${nhlLabel(o.lastPost ?? o.lastEarly)}`).join('; ')}` }); continue; }
    nhlInsert.push({
      person_key: c.key, player_name: c.name,
      year_from: nhlLabel(c.first), year_to: nhlLabel(c.lastEarly),
      age_range: ageRange(c.birth, c.first, c.lastEarly),
      games: c.earlyTot.games, goals: c.earlyTot.goals, assists: c.earlyTot.assists, points: c.earlyTot.points, pim: c.earlyTot.pim,
      position: c.position, teams: c.earlyTeams.join(','),
    });
  }
  log(`NHL: ${nhl.length} skaters with a season before 1967-68; ${pureEarly.length} wholly before it, ${nhl.length - pureEarly.length} crossed it`);
  log(`NHL: ${nhlInsert.length} to insert, ${nhlUpdate.length} truncated rows to complete, ${nhlHeld.length} held`);

  // ---- per season source rows, for the fence's derivation checks
  const nbaIds = new Set(nbaInsert.map((r) => r.person_key));
  const nbaSeasonCols = ['person_key', 'season', 'team', 'age', ...NBA_STATS];
  const nbaSeasons = careers.filter((c) => nbaIds.has(c.id)).flatMap((c) => c.rows.map((r) => [r.id, seasonLabel(r.season), r.team, r.age, ...NBA_STATS.map((k) => r[k])]));
  const nhlKeys = new Set([...nhlInsert.map((r) => r.person_key), ...nhlUpdate.map((r) => r.person_key)]);
  const nhlSeasonCols = ['person_key', 'season', 'teams', 'position', 'games', 'goals', 'assists', 'points', 'pim'];
  const nhlSeasons = nhl.filter((c) => nhlKeys.has(c.key)).flatMap((c) => c.early.map((r) => [c.key, nhlLabel(r.seasonId),
    String(r.teamAbbrevs).split(',').map((s) => NHL_TEAM_CODES[s.trim()]).join(','), NHL_POSITION[r.positionCode],
    r.gamesPlayed, r.goals, r.assists, r.points, r.penaltyMinutes]));

  return {
    careersFile: {
      about: 'Round 704. The early eras of nba_player_stats and nhl_player_stats, built by scripts/genEarlyCareers.mjs from the sources below and loaded by supabase/migrations/20260930_round_704_early_careers.sql. scripts/simEarlyCareers.mjs holds this file to the per season source rows, the two source pins and the live tables.',
      built: new Date().toISOString().slice(0, 10),
      sources: {
        nba: { name: 'NBA Stats (1947-present), Sumitro Datta', derivedFrom: 'Basketball-Reference', licence: 'CC0: Public Domain (as declared on the Kaggle dataset sumitrodatta/nba-aba-baa-stats)', repository: 'https://github.com/sumitrodatta/bball-reference-datasets', commit: NBA_COMMIT, files: ['Data/Player Totals.csv', 'Data/Player Career Info.csv'], leagues: ['BAA', 'NBA'], seasonType: 'regular season only' },
        nhl: { name: 'NHL stats API (the league\'s official record)', endpoint: `${NHL_API}/summary and ${NHL_API}/bios`, filter: 'gameTypeId=2 (regular season only)', seasons: '1917-18 to 1966-67, plus 1967-68 to 1984-85 for the skaters who crossed 1967-68' },
      },
      cutoffs: { nba: 'careers that ended before 1979-80 (the live table holds every career that reached 1979-80, whole)', nhl: 'seasons before 1967-68 (the live table holds 1967-68 onward only)' },
      nba: {
        columns: Object.keys(nbaRow(early[0])),
        insert: nbaInsert.map((r) => Object.values(r)),
        held: nbaHeld,
        straddlers: nbaStraddle,
      },
      nhl: {
        columns: Object.keys(nhlInsert[0]),
        insert: nhlInsert.map((r) => Object.values(r)),
        updateColumns: Object.keys(nhlUpdate[0]),
        update: nhlUpdate.map((r) => Object.values(r)),
        held: nhlHeld,
      },
    },
    seasonsFile: {
      about: 'Round 704. The per season source rows behind every row scripts/data/earlyCareers2026-09.json inserts or completes, as the sources give them (see that file for the sources). NBA seasons include each traded season\'s combined nTM row and its per team rows; NHL seasons list every team of a traded season. Season labels are the table\'s (1959-60).',
      nba: { columns: nbaSeasonCols, rows: nbaSeasons },
      nhl: { columns: nhlSeasonCols, rows: nhlSeasons },
    },
    debug: { careers, nhl },
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = await build();
  const write = (rel, obj) => {
    const file = path.join(ROOT, rel);
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 0).replace(/\],\[/g, '],\n[') + '\n');
    fs.renameSync(tmp, file);
    console.log(`wrote ${rel} (${fs.statSync(file).size} bytes)`);
  };
  write('scripts/data/earlyCareers2026-09.json', out.careersFile);
  write('scripts/data/earlyCareersSeasons2026-09.json', out.seasonsFile);
}
