/**
 * Round 531: the Footle fallback pool is baked, never typed.
 *
 * src/data/players.ts used to be 748 hand typed rows, nine facts each, dated
 * "as of Feb 2026" by one comment and checked by nothing. It is the pool
 * Footle plays when the table cannot be reached, and it is read by Squad
 * Deal, Club Manager, Perfect Lineup, Sports Bingo and Gauntlet Draft. Every
 * transfer since it was typed was wrong in it, and a third of its rows had no
 * live row at all (retired men, nicknames, a free agent or two).
 *
 * This bake regenerates the file from the same source every other pool on the
 * site reads, so the fallback and the live pool describe the same world:
 *
 *   WHO is in the pool: scripts/data/playersPoolSeed.json, the distinct names
 *   of the old file. That list is the one editorial input left (which players
 *   are recognisable enough to be guessed); it carries no facts. A seed name is
 *   matched to the table's 2026 rows by exact spelling, then by the accent and
 *   case insensitive key player search uses (normalizeName), then by that key
 *   with the word order reversed (the table writes "Heung-min Son", the old
 *   file wrote "Son Heung-min"). A name that hits nothing, or more than one
 *   row, is SKIPPED and printed, never guessed at. A seed name is used once:
 *   two spellings folding to one key (Moises and Moisés Caicedo) are one man.
 *
 *   WHAT the pool says about each of them: player_market_values, year 2026
 *   (the dedup view carries the identical 5,496 rows for 2026, checked
 *   2026-09-11), paged past the 1,000 row cap, with the verified 2026 window
 *   overlay (scripts/transferOverlay2026.mjs) applied on top by exact name the
 *   way the roster bake applies it. Club, nationality, position, age, market
 *   value, goals and assists come from the row. Position is normalised with
 *   the table the live Footle pool uses (POSITION_NORMALIZE in
 *   src/lib/fetchFootlePlayerPool.ts), so a row that map does not know is
 *   skipped. Value is the row's USD rounded to whole millions; a row under half
 *   a million prints as 1 rather than 0, which the smell list forbids. Goals
 *   and assists are the row's season counts, which for the 2026 rows means the
 *   autumn 2025 snapshot the dataset was imported from: low, and honest about
 *   it, rather than the old file's undated guesses.
 *
 *   LEAGUE comes from a club, never from a name and never from the old file.
 *   First the Club Manager world: the table spelling maps to an engine club
 *   (scripts/lib/dbClubNames.mjs, one copy shared with the roster bake) and
 *   the engine club to the 2026-27 league that lists it (REAL_LEAGUES in
 *   src/lib/clubManager.ts, memberships two source verified; the Premier
 *   League and the Championship were checked again against ESPN's and Sky
 *   Sports' 2026-27 tables on 2026-09-11 and agree). Then, for clubs outside
 *   that world, the club to league maps the live pool uses: footleEnrichment's
 *   CLUB_TO_LEAGUE (through getEnrichment with an empty name, so only the club
 *   decides) and fetchFootlePlayerPool's INSANE_CLUB_LEAGUE. Those two carry
 *   2025/26 memberships, so a club they place in a league the Club Manager
 *   world models completely, without that league's 2026-27 list naming it, is
 *   a club that left the league (Real Oviedo, Leicester City): its league is
 *   unknown and the row is skipped rather than labelled with last season. A
 *   free agent ("Without Club") has no league and is skipped the same way.
 *
 *   KIT NUMBER is getEnrichment's answer for the name and the current club,
 *   which is the hand list's number with the Round 495 guard (a number written
 *   under a different league is dropped), and null when there is none.
 *
 *   TIERS follow the rule the old file implied and the live pool enforces:
 *   the GOAT names fetchFootlePlayerPool keeps are always easy; everyone else
 *   is ranked by market value inside this pool, the top EASY_TOP_N are easy,
 *   the next HARD_NEXT_N are hard, the rest are insane. Ties break on name.
 *   The counts keep the old file's bands (its own header said "~150" easy).
 *
 *   ORDER is by tier, then value descending, then name, so a re-bake with the
 *   same data is byte identical. The header date only moves when the rows
 *   move: a re-bake that changes nothing but the day keeps the old date, so
 *   scripts/simPlayersPool.mjs can require the file to equal a fresh bake.
 *
 * Fails closed: an unreachable table, a short page, an engine league the
 * Player union does not know, or a resolved league outside that union all stop
 * the bake with nothing written.
 *
 * Run:   node scripts/bakePlayers.mjs
 * Fence: node scripts/simPlayersPool.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { TRANSFER_OVERLAY_2026 } from './transferOverlay2026.mjs';
import { DB_TO_ENGINE } from './lib/dbClubNames.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_PATH = path.join(ROOT, 'src', 'data', 'players.ts');
export const SEED_PATH = path.join(ROOT, 'scripts', 'data', 'playersPoolSeed.json');

/** Tier bands, the old file's own proportions (see the header). */
export const EASY_TOP_N = 150;
export const HARD_NEXT_N = 200;
/** The smell list's age window. */
export const AGE_MIN = 15;
export const AGE_MAX = 45;

/** Club Manager's league names -> the Player league union. Fails closed on a
 *  name missing here, so a new engine league cannot silently read 'Other'. */
const ENGINE_LEAGUE_TO_POOL = {
  'Premier League': 'Premier League',
  'EFL Championship': 'EFL Championship',
  'La Liga': 'La Liga',
  'Serie A': 'Serie A',
  'Bundesliga': 'Bundesliga',
  'Ligue 1': 'Ligue 1',
  'Eredivisie': 'Eredivisie',
  'Saudi Pro League': 'Saudi Pro League',
  'MLS Eastern Conference': 'MLS',
  'MLS Western Conference': 'MLS',
  'Primeira Liga': 'Liga Portugal',
  'Scottish Premiership': 'Scottish Premiership',
  'Süper Lig': 'Turkish Süper Lig',
  '2. Bundesliga': '2. Bundesliga',
  'Belgian Pro League': 'Belgian Pro League',
  'Austrian Bundesliga': 'Austrian Bundesliga',
  'Super League Greece': 'Greek Super League',
  'Danish Superliga': 'Danish Superliga',
  'Swiss Super League': 'Swiss Super League',
  'SuperSport HNL': 'Croatian HNL',
};

/* ------------------------------------------------------------------ */
/* The app's own helpers, bundled once                                */
/* ------------------------------------------------------------------ */
let appPromise = null;
export function loadApp() {
  if (appPromise) return appPromise;
  appPromise = (async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-bake-players-'));
    const entry = path.join(tmp, 'entry.ts');
    const bundle = path.join(tmp, 'bundle.mjs');
    fs.writeFileSync(entry, [
      "export { getEnrichment } from '@/data/footleEnrichment';",
      "export { POSITION_NORMALIZE, GOAT_NAMES, INSANE_CLUB_LEAGUE } from '@/lib/fetchFootlePlayerPool';",
      "export { REAL_LEAGUES } from '@/lib/clubManager';",
      "export { normalizeName } from '@/lib/playerSearch';",
      '',
    ].join('\n'));
    await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
    /* The supabase client touches localStorage at module scope; nothing here
       ever talks through it. */
    if (!globalThis.localStorage) {
      globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    }
    return import(pathToFileURL(bundle).href);
  })();
  return appPromise;
}

/** The League union, read off src/types/game.ts so a resolved league that the
 *  type does not carry fails the bake instead of failing tsc later. */
export function leagueUnion() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'types', 'game.ts'), 'utf8');
  const m = src.match(/export type League = ([^;]+);/);
  if (!m) throw new Error('bakePlayers: League union not found in src/types/game.ts');
  return new Set([...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x => x[1]));
}

/* ------------------------------------------------------------------ */
/* The table                                                          */
/* ------------------------------------------------------------------ */
export const ROW_SELECT = 'id,player_name,position,age,nationality,club,market_value_usd,goals,assists';

function restAuth() {
  const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)?.[1];
  const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)?.[1];
  if (!url || !key) throw new Error('bakePlayers: could not read the Supabase URL and key from client.ts');
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

/** One REST call with three attempts; a page that never answers throws. */
export async function rest(pathAndQuery, extraHeaders = {}) {
  const { url, headers } = restAuth();
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let res = null;
    try { res = await fetch(`${url}/rest/v1/${pathAndQuery}`, { headers: { ...headers, ...extraHeaders } }); }
    catch (err) { last = `unreachable (${String(err).slice(0, 80)})`; }
    if (res && res.ok) return { rows: await res.json(), range: res.headers.get('content-range') || '' };
    if (res) last = `HTTP ${res.status}`;
    if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
  }
  throw new Error(`bakePlayers: Supabase ${last} for ${pathAndQuery.slice(0, 100)} after 3 attempts`);
}

/** Every 2026 row, paged past the 1,000 row cap, checked against the exact
 *  count the first page reports so a short answer cannot pass as the table. */
export async function fetchRows2026() {
  const rows = [];
  let total = null;
  for (let from = 0; ; from += 1000) {
    const { rows: page, range } = await rest(
      `player_market_values?select=${ROW_SELECT}&year=eq.2026&order=id.asc`,
      { Range: `${from}-${from + 999}`, ...(from === 0 ? { Prefer: 'count=exact' } : {}) },
    );
    if (from === 0) {
      const m = range.match(/\/(\d+)$/);
      if (!m) throw new Error(`bakePlayers: no exact count in content-range "${range}"`);
      total = Number(m[1]);
    }
    rows.push(...page);
    if (page.length < 1000) break;
  }
  if (rows.length !== total) throw new Error(`bakePlayers: fetched ${rows.length} rows but the table reports ${total}`);
  return rows;
}

/** The verified window moves, by exact name, the way the roster bake does it. */
export function applyOverlay(rows) {
  const byName = new Map();
  for (const r of rows) {
    if (!byName.has(r.player_name)) byName.set(r.player_name, []);
    byName.get(r.player_name).push(r);
  }
  let moved = 0;
  for (const e of TRANSFER_OVERLAY_2026) {
    if (!e.db) continue;
    for (const r of byName.get(e.name) || []) {
      if (r.club !== e.db) { r.club = e.db; moved += 1; }
    }
  }
  return moved;
}

/* ------------------------------------------------------------------ */
/* League, from the club only                                         */
/* ------------------------------------------------------------------ */
export function buildLeagueResolver(app) {
  const union = leagueUnion();
  const engineLeague = new Map();
  for (const lg of app.REAL_LEAGUES) {
    const pool = ENGINE_LEAGUE_TO_POOL[lg.name];
    if (!pool) throw new Error(`bakePlayers: engine league "${lg.name}" has no entry in ENGINE_LEAGUE_TO_POOL`);
    if (!union.has(pool)) throw new Error(`bakePlayers: "${pool}" is not in the League union`);
    for (const club of lg.clubs) {
      const prev = engineLeague.get(club);
      if (prev && prev !== pool) throw new Error(`bakePlayers: engine club "${club}" is listed in two leagues`);
      engineLeague.set(club, pool);
    }
  }
  const modelled = new Set(engineLeague.values());

  /* The table writes one row of "Fenerbahçe" beside twenty one of
     "Fenerbahce" (measured 2026-09-11, Kasımpaşa the same). An accent only
     variant of a mapped spelling is the same club; anything shorter or longer
     is not tried, because "Liverpool FC Montevideo" and "Chelsea FC U21" are
     real and different teams, and those rows must fall through as unknown. */
  const foldedKeys = new Map();
  for (const key of Object.keys(DB_TO_ENGINE)) {
    const f = app.normalizeName(key);
    if (foldedKeys.has(f) && DB_TO_ENGINE[foldedKeys.get(f)] !== DB_TO_ENGINE[key]) {
      throw new Error(`bakePlayers: "${key}" and "${foldedKeys.get(f)}" fold to one spelling but map to different clubs`);
    }
    foldedKeys.set(f, key);
  }

  /** { league, source } or { league: null, reason }. */
  return function resolveLeague(club) {
    const engine = DB_TO_ENGINE[club] ?? DB_TO_ENGINE[foldedKeys.get(app.normalizeName(club)) ?? ''];
    if (engine) {
      const league = engineLeague.get(engine);
      if (league) return { league, source: 'clubManager 2026-27' };
      return { league: null, reason: `"${club}" maps to engine club "${engine}" that no 2026-27 league lists` };
    }
    const fromEnrichment = app.getEnrichment('', club).league;
    const league = fromEnrichment !== 'Other' ? fromEnrichment : (app.INSANE_CLUB_LEAGUE[club] ?? null);
    if (!league) return { league: null, reason: `no club to league mapping knows "${club}"` };
    if (modelled.has(league)) {
      return { league: null, reason: `"${club}" is mapped to ${league} by a 2025/26 list but is not a 2026-27 member of it` };
    }
    if (!union.has(league)) throw new Error(`bakePlayers: resolved league "${league}" for "${club}" is not in the League union`);
    return { league, source: fromEnrichment !== 'Other' ? 'footleEnrichment club map' : 'fetchFootlePlayerPool insane club map' };
  };
}

/* ------------------------------------------------------------------ */
/* Seed names -> rows                                                 */
/* ------------------------------------------------------------------ */
export function readSeed() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  if (!Array.isArray(seed.names) || seed.names.length === 0) throw new Error('bakePlayers: the seed has no names');
  return seed;
}

export function matchSeed(names, rows, normalizeName) {
  const exact = new Map();
  const folded = new Map();
  for (const r of rows) {
    (exact.get(r.player_name) ?? exact.set(r.player_name, []).get(r.player_name)).push(r);
    const k = normalizeName(r.player_name);
    (folded.get(k) ?? folded.set(k, []).get(k)).push(r);
  }
  const matched = [];
  const skipped = [];
  const usedKeys = new Set();
  const usedIds = new Set();
  for (const name of names) {
    const key = normalizeName(name);
    if (usedKeys.has(key)) { skipped.push({ name, reason: 'same player as an earlier seed name (folds to one key)' }); continue; }
    usedKeys.add(key);
    let hits = exact.get(name) || [];
    let how = 'exact';
    if (hits.length !== 1) { hits = folded.get(key) || []; how = 'folded'; }
    if (hits.length === 0) { hits = folded.get(key.split(' ').reverse().join(' ')) || []; how = 'reversed'; }
    if (hits.length === 0) { skipped.push({ name, reason: 'no 2026 row in player_market_values' }); continue; }
    if (hits.length > 1) { skipped.push({ name, reason: `ambiguous: ${hits.length} 2026 rows fold to this name (${hits.map(h => `${h.player_name} @ ${h.club}`).join('; ')})` }); continue; }
    const row = hits[0];
    if (usedIds.has(row.id)) { skipped.push({ name, reason: `same row as an earlier seed name (${row.player_name})` }); continue; }
    usedIds.add(row.id);
    matched.push({ name, row, how });
  }
  return { matched, skipped };
}

/* ------------------------------------------------------------------ */
/* Row -> Player                                                      */
/* ------------------------------------------------------------------ */
export function rowToPlayer(row, app, resolveLeague) {
  const position = app.POSITION_NORMALIZE[row.position ?? ''];
  if (!position) return { player: null, reason: `position "${row.position}" is not in POSITION_NORMALIZE` };
  const resolved = resolveLeague(row.club);
  if (!resolved.league) return { player: null, reason: resolved.reason };
  const age = Number(row.age);
  if (!Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX) return { player: null, reason: `age ${row.age} is outside ${AGE_MIN}..${AGE_MAX}` };
  const usd = Number(row.market_value_usd);
  if (!(usd > 0)) return { player: null, reason: `market value ${row.market_value_usd} is not above zero` };
  if (!Number.isInteger(row.goals) || !Number.isInteger(row.assists) || row.goals < 0 || row.assists < 0) {
    return { player: null, reason: `goals ${row.goals} / assists ${row.assists} are not whole non negative counts` };
  }
  if (!row.nationality || !String(row.nationality).trim()) return { player: null, reason: 'no nationality on the row' };
  return {
    player: {
      name: row.player_name,
      club: row.club,
      nationality: row.nationality,
      league: resolved.league,
      goals: row.goals,
      assists: row.assists,
      position,
      kitNumber: app.getEnrichment(row.player_name, row.club).kitNumber,
      age,
      marketValue: Math.max(1, Math.round(usd / 1_000_000)),
      difficulty: 'easy',
    },
    leagueSource: resolved.source,
    usd,
  };
}

/** Tier by value rank inside the pool, GOATs always easy; returns the pool in
 *  its final order (tier, value desc, name). */
export function tierPool(entries, goatKeys, normalizeName) {
  const byValue = [...entries].sort((a, b) => b.usd - a.usd || a.player.name.localeCompare(b.player.name, 'en'));
  let rank = 0;
  for (const e of byValue) {
    if (goatKeys.has(normalizeName(e.player.name))) { e.player.difficulty = 'easy'; continue; }
    e.player.difficulty = rank < EASY_TOP_N ? 'easy' : rank < EASY_TOP_N + HARD_NEXT_N ? 'hard' : 'insane';
    rank += 1;
  }
  const order = { easy: 0, hard: 1, insane: 2 };
  return byValue.sort((a, b) => order[a.player.difficulty] - order[b.player.difficulty]
    || b.usd - a.usd || a.player.name.localeCompare(b.player.name, 'en'));
}

/* ------------------------------------------------------------------ */
/* Render                                                             */
/* ------------------------------------------------------------------ */
const TIER_TITLES = {
  easy: 'EASY: the GOAT names plus the top of the value ranking',
  hard: 'HARD: the next band by value',
  insane: 'INSANE: the rest of the pool',
};

function q(s) { return JSON.stringify(s); }

export function renderFile(pool, meta, date) {
  const counts = { easy: 0, hard: 0, insane: 0 };
  for (const e of pool) counts[e.player.difficulty] += 1;
  const lines = [
    `// GENERATED by scripts/bakePlayers.mjs on ${date}. DO NOT EDIT BY HAND: re-run the bake.`,
    '//',
    `// The Footle fallback pool: ${pool.length} players (easy ${counts.easy}, hard ${counts.hard}, insane ${counts.insane}).`,
    `// Source: player_market_values year 2026 (${meta.tableRows} rows) plus the verified 2026 window overlay`,
    `// (scripts/transferOverlay2026.mjs, ${meta.overlayMoved} rows moved at bake time). Seed: scripts/data/playersPoolSeed.json,`,
    `// ${meta.seedNames} names, ${meta.matched} matched (${meta.reversed} by reversed word order), ${meta.skipped} skipped and listed by the bake.`,
    '//',
    '// Rules (the full text is the bake script header):',
    '//   club, nationality, position, age, value, goals, assists: the row, nothing else. Position through',
    '//     POSITION_NORMALIZE (src/lib/fetchFootlePlayerPool.ts). Value is USD rounded to millions, floor 1.',
    '//   goals and assists: the row\'s season counts, an autumn 2025 snapshot for the 2026 rows.',
    '//   league: from the club. Club Manager\'s 2026-27 memberships first (scripts/lib/dbClubNames.mjs plus',
    '//     REAL_LEAGUES), then the live pool\'s club maps for clubs outside that world; unknown league = skipped.',
    '//   kitNumber: getEnrichment(name, club).kitNumber, null when no number is on file.',
    `//   difficulty: GOAT names always easy; otherwise value rank in this pool, top ${EASY_TOP_N} easy, next ${HARD_NEXT_N} hard, rest insane.`,
    '//   order: tier, then value descending, then name. The date above moves only when a row moves.',
    '// Fence: node scripts/simPlayersPool.mjs',
    "import { Player } from '@/types/game';",
    '',
    'export const players: Player[] = [',
  ];
  let current = null;
  for (const e of pool) {
    const p = e.player;
    if (p.difficulty !== current) {
      current = p.difficulty;
      if (lines[lines.length - 1] !== '') lines.push('');
      lines.push(`  // === ${TIER_TITLES[current]} (${counts[current]}) ===`);
    }
    lines.push(`  { name: ${q(p.name)}, club: ${q(p.club)}, nationality: ${q(p.nationality)}, league: ${q(p.league)}, goals: ${p.goals}, assists: ${p.assists}, position: ${q(p.position)}, kitNumber: ${p.kitNumber === null ? 'null' : p.kitNumber}, age: ${p.age}, marketValue: ${p.marketValue}, difficulty: ${q(p.difficulty)} },`);
  }
  lines.push('];', '');
  return lines.join('\n');
}

const DATE_RE = /^\/\/ GENERATED by scripts\/bakePlayers\.mjs on (\d{4}-\d{2}-\d{2})\./m;

/** The date the existing file carries, when its body equals the new one. */
export function settleDate(existingText, renderWith, today) {
  if (!existingText) return today;
  const m = existingText.replace(/\r\n/g, '\n').match(DATE_RE);
  if (!m) return today;
  const strip = t => t.replace(/\r\n/g, '\n').replace(DATE_RE, '// GENERATED by scripts/bakePlayers.mjs on DATE.');
  return strip(existingText) === strip(renderWith('DATE')) ? m[1] : today;
}

/* ------------------------------------------------------------------ */
/* The bake                                                           */
/* ------------------------------------------------------------------ */
export async function bake({ rows = null, today = new Date().toISOString().slice(0, 10) } = {}) {
  const app = await loadApp();
  const tableRows = rows ?? await fetchRows2026();
  const overlayMoved = applyOverlay(tableRows);
  const resolveLeague = buildLeagueResolver(app);
  const seed = readSeed();
  const { matched, skipped } = matchSeed(seed.names, tableRows, app.normalizeName);
  const goatKeys = new Set([...app.GOAT_NAMES].map(n => app.normalizeName(n)));

  const entries = [];
  const leagueSources = {};
  for (const m of matched) {
    const r = rowToPlayer(m.row, app, resolveLeague);
    if (!r.player) { skipped.push({ name: m.name, reason: r.reason, row: m.row }); continue; }
    leagueSources[r.leagueSource] = (leagueSources[r.leagueSource] || 0) + 1;
    entries.push({ player: r.player, usd: r.usd, seedName: m.name, how: m.how });
  }
  const pool = tierPool(entries, goatKeys, app.normalizeName);
  const meta = {
    tableRows: tableRows.length,
    overlayMoved,
    seedNames: seed.names.length,
    matched: pool.length,
    reversed: pool.filter(e => e.how === 'reversed').length,
    skipped: skipped.length,
    leagueSources,
  };
  const existing = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf8') : '';
  const date = settleDate(existing, d => renderFile(pool, meta, d), today);
  return { text: renderFile(pool, meta, date), pool, skipped, meta, date };
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (invokedDirectly) {
  const { text, pool, skipped, meta, date } = await bake();
  const existing = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf8') : '';
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(OUT_PATH, text.split('\n').join(eol));
  const counts = { easy: 0, hard: 0, insane: 0 };
  for (const e of pool) counts[e.player.difficulty] += 1;
  console.log(`bakePlayers: ${meta.tableRows} table rows, overlay moved ${meta.overlayMoved}; seed ${meta.seedNames} names, ${pool.length} baked (easy ${counts.easy}, hard ${counts.hard}, insane ${counts.insane}), ${skipped.length} skipped; date ${date}`);
  console.log(`  league sources: ${Object.entries(meta.leagueSources).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const reversed = pool.filter(e => e.how === 'reversed');
  if (reversed.length) console.log(`  matched by reversed word order: ${reversed.map(e => `${e.seedName} -> ${e.player.name}`).join('; ')}`);
  console.log('  skipped:');
  for (const s of skipped) console.log(`    ${s.name}: ${s.reason}`);
  console.log(`wrote ${path.relative(ROOT, OUT_PATH)}`);
}
