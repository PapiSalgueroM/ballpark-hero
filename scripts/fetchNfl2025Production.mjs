/* scripts/fetchNfl2025Production.mjs

   Round 1130. THE 2025 REGULAR SEASON, AS TWO PUBLISHERS PRINT IT.

   Writes and checks scripts/data/nfl2025Production.json: one row for every man
   of the NFL Front Office pool (the 2,163 records of the frozen rating
   checkpoint, scripts/data/nflFoRatingInputs2026.json) that either publisher
   prints a 2025 regular season line for, with both lines side by side and a
   verdict per field. It is the ONLY place an opening rating's production term
   and a printed key stat may come from, and a number two publishers disagree
   about feeds nothing and prints nothing.

   The name starts with "fetch" on purpose: scripts/runAllSims.mjs only runs
   sim*.mjs, so nothing ever runs this by accident. It is the one script of
   the round that touches the network, and it never touches the database.

   SOURCE A, the league's play by play as nflverse compiles it:
     https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_2025.csv
     joined to a man by the roster record's gsis_id (the CSV's player_id).
   SOURCE B, ESPN's league wide statistics, regular season only (seasontype 2):
     https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byathlete
     paged to the end for passing, rushing and receiving, joined to a man by
     the roster record's espn_id (the athlete id).
   The two are separate compilations: A is rebuilt from the play by play by
   nflfastR, B is the league's official statistics feed as ESPN carries it.
   They are expected to disagree in a few places (stat corrections, laterals,
   a man who dressed and recorded nothing), and a file with NO disagreement at
   all over a thousand rows would mean B was read from A's lineage: the
   script stops on that as surely as on too many.

   MODES
     --pull    network: downloads A into scripts/.cache/nflverse/ and every page
               of B into scripts/.cache/nfl2025Production/ (both ignored by git;
               a page already in the cache is not asked for again), then
               writes the file.
     (none)    offline: rebuilds the file from the cache.
     --check   offline, no cache needed: re-derives every row's agreed list and
               status and every header count from the committed rows and
               compares. This is what the harness and the gates run.
     --settle <reads.json>   offline: attaches hand reads of a third publisher
               to disputed rows of the committed file as settledBy blocks and
               rewrites it. The reads file is { source, reads: [{ key, url,
               read, values, note? }] }, typed by a person off one page at a
               time (never crawled). A read that sides with neither publisher
               is kept on the row and the row stays disputed.

   THE GAMES COLUMN IS WHERE THE TWO DIFFER, and it is a difference of
   definition: A counts the games in which a man recorded a statistic, B the
   games he played. Every one of the 189 disputes on the day the file was
   written is that column (B higher by 1 to 15, never lower) and no yardage,
   attempt, catch or touchdown differs anywhere. Games stays a headline field
   all the same, because a rating reads production PER GAME: a disputed row
   feeds nothing until a third publisher is read for it. For the forty
   disputed men among the clubs' fifteen that was done by hand from the
   league's own player pages (nfl.com); every one sided with B.

   WHAT A ROW HOLDS. key (club|name|shelf, the checkpoint's own key), the two
   ids, the shelf, `a` and `b` (each publisher's line, or null when it prints
   none), `agreed` (the fields on which both print the same number) and
   `status`:
     agree       every headline field of the man's shelf is agreed
     disagree    a headline field differs: the row feeds nothing
     one-source  only one publisher has the man
     settled     a disagree row a third publisher was read for by hand (the
                 settledBy block names it); it counts only when the third
                 source matches one of the two on every headline field
   A dash in B (a column it does not print for the man) is null, never zero.

   WHAT THIS BRANCH PULLS. Passing, rushing and receiving. No publisher prints
   a line for an offensive lineman, and B's defensive categories are pulled by
   the Conquest branch of this round (only a Conquest key stat reads a
   defender's line), so every lineman and every defender is one-source here.
   That is the honest state, and nothing rates a man on a one-source row.

   STARTS AND SNAPS are not in the file: neither feed prints games started, and
   snap counts have one public lineage. Workload everywhere in the round is the
   opportunity count both publishers print (pass attempts, carries, catches).
*/
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fetchSeasonStats, STATS_RELEASE_URL } from './lib/nflverseStats.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PRODUCTION = path.join(ROOT, 'scripts', 'data', 'nfl2025Production.json');
const CHECKPOINT = path.join(ROOT, 'scripts', 'data', 'nflFoRatingInputs2026.json');
const RECORD = path.join(ROOT, 'scripts', 'data', 'nflRosters2026.json');
const CACHE_B = path.join(ROOT, 'scripts', '.cache', 'nfl2025Production');
export const SEASON = 2025;
const B_URL = 'https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byathlete';
/** The league wide lists of B this branch pages to the end, and the column each is sorted on. */
export const B_REQUESTS = [
  { category: 'offense:passing', sort: 'passing.passingYards:desc' },
  { category: 'offense:rushing', sort: 'rushing.rushingYards:desc' },
  { category: 'offense:receiving', sort: 'receiving.receivingYards:desc' },
];
const sha256 = v => createHash('sha256').update(v).digest('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------- the fields
   One name per number, with the column each publisher prints it under. A
   missing column stops the script: it is never read as zero. */
export const FIELDS = {
  games:   { a: 'games',            b: ['general', 'gamesPlayed'] },
  passAtt: { a: 'attempts',         b: ['passing', 'passingAttempts'] },
  passYds: { a: 'passing_yards',    b: ['passing', 'passingYards'] },
  passTd:  { a: 'passing_tds',      b: ['passing', 'passingTouchdowns'] },
  passInt: { a: 'passing_interceptions', b: ['passing', 'interceptions'] },
  rushAtt: { a: 'carries',          b: ['rushing', 'rushingAttempts'] },
  rushYds: { a: 'rushing_yards',    b: ['rushing', 'rushingYards'] },
  rushTd:  { a: 'rushing_tds',      b: ['rushing', 'rushingTouchdowns'] },
  targets: { a: 'targets',          b: ['receiving', 'receivingTargets'] },
  rec:     { a: 'receptions',       b: ['receiving', 'receptions'] },
  recYds:  { a: 'receiving_yards',  b: ['receiving', 'receivingYards'] },
  recTd:   { a: 'receiving_tds',    b: ['receiving', 'receivingTouchdowns'] },
};
export const OFFENSE_FIELDS = Object.keys(FIELDS);
/** The fields that must ALL agree before a row may feed a rating or a printed stat. */
export const HEADLINE = {
  QB: ['games', 'passAtt', 'passYds', 'passTd', 'passInt', 'rushYds', 'rushTd'],
  RB: ['games', 'rushAtt', 'rushYds', 'rushTd', 'rec', 'recYds', 'recTd'],
  WR: ['games', 'rec', 'recYds', 'recTd', 'rushYds', 'rushTd'],
  TE: ['games', 'rec', 'recYds', 'recTd', 'rushYds', 'rushTd'],
  OL: ['games'],
  DL: ['games'], LB: ['games'], DB: ['games'],
};
export const OFFENSE_SHELVES = ['QB', 'RB', 'WR', 'TE'];

/* ------------------------------------------------------------- source B */
const bPageFile = (category, page) => path.join(CACHE_B, `${category.replace(':', '-')}-p${String(page).padStart(2, '0')}.json`);
const bUrl = (category, sort, page) => `${B_URL}?region=us&lang=en&contentorigin=espn&isqualified=false&season=${SEASON}&seasontype=2&category=${encodeURIComponent(category)}&sort=${encodeURIComponent(sort)}&limit=50&page=${page}`;

/** One page of B, from the cache when it is there. Gentle: one request at a time, a pause after each. */
async function bPage(category, sort, page, { network, log }) {
  const file = bPageFile(category, page);
  if (fs.existsSync(file) && fs.statSync(file).size > 500) return fs.readFileSync(file, 'utf8');
  if (!network) throw new Error(`${path.relative(ROOT, file)} is not in the cache: run with --pull`);
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(bUrl(category, sort, page), { headers: { 'User-Agent': 'douknowball-front-office (contact: douknowball1@gmail.com)' } });
      if (!res.ok) last = `HTTP ${res.status}`;
      else {
        const text = await res.text();
        const j = JSON.parse(text);
        if (!Array.isArray(j.athletes) || !Array.isArray(j.categories) || !j.pagination) last = 'not a statistics page';
        else if (j.requestedSeason?.year !== SEASON || j.requestedSeason?.type?.type !== 2) last = 'not the 2025 regular season';
        else { fs.mkdirSync(CACHE_B, { recursive: true }); fs.writeFileSync(file, text); log(`fetched ${path.basename(file)} (${j.athletes.length} athletes)`); await sleep(700); return text; }
      }
    } catch (err) { last = String(err).slice(0, 120); }
    await sleep(1500 * attempt);
  }
  throw new Error(`source B ${category} page ${page} could not be fetched: ${last}`);
}

/** Every page of every list, in order. Returns the raw texts with their page numbers. */
async function bAll({ network, log }) {
  const out = [];
  for (const { category, sort } of B_REQUESTS) {
    const first = await bPage(category, sort, 1, { network, log });
    const pages = JSON.parse(first).pagination.pages;
    out.push({ category, sort, page: 1, text: first });
    for (let page = 2; page <= pages; page += 1) out.push({ category, sort, page, text: await bPage(category, sort, page, { network, log }) });
  }
  return out;
}

/** A printed number of B: thousands commas off, a dash is null (not printed), anything else stops the script. */
function bNumber(raw, where) {
  if (raw === '-' || raw == null) return null;
  const n = Number(String(raw).replace(/,/g, ''));
  if (!Number.isFinite(n)) throw new Error(`source B printed "${raw}" at ${where}: not a number`);
  return n;
}

/** Every athlete of every page: Map<athlete id, { name, fields }>. A man two lists print differently stops the script. */
function parseB(pages) {
  const athletes = new Map();
  for (const { category, page, text } of pages) {
    const j = JSON.parse(text);
    const index = {};
    for (const [field, { b: [cat, col] }] of Object.entries(FIELDS)) {
      const group = j.categories.find(c => c.name === cat);
      const at = group ? group.names.indexOf(col) : -1;
      if (at < 0) throw new Error(`source B ${category} page ${page} has no ${cat}.${col} column: that is what a renamed field looks like`);
      index[field] = [cat, at];
    }
    for (const row of j.athletes) {
      const id = String(row.athlete.id);
      const fields = {};
      for (const [field, [cat, at]] of Object.entries(index)) {
        const group = row.categories.find(c => c.name === cat);
        fields[field] = group ? bNumber(group.totals[at], `${row.athlete.displayName} ${cat}`) : null;
      }
      const seen = athletes.get(id);
      if (seen) {
        for (const f of OFFENSE_FIELDS) if (seen.fields[f] !== fields[f]) throw new Error(`source B prints ${row.athlete.displayName} ${f} as ${seen.fields[f]} in one list and ${fields[f]} in ${category}`);
      } else athletes.set(id, { name: row.athlete.displayName, fields });
    }
  }
  return athletes;
}

/* ------------------------------------------------------------- source A */
/** A printed number of A. An empty cell is null; a column that is not there at all stops the script. */
function aFields(row, columns) {
  const out = {};
  for (const [field, { a: col }] of Object.entries(FIELDS)) {
    if (!columns.has(col)) throw new Error(`source A has no ${col} column: that is what a renamed field looks like`);
    const raw = row[col];
    const n = raw === '' || raw == null ? null : Number(raw);
    if (n !== null && !Number.isFinite(n)) throw new Error(`source A printed "${raw}" for ${row.player_display_name} ${col}`);
    out[field] = n;
  }
  return out;
}

/* ------------------------------------------------------------- the verdict
   Everything below is pure: the harness (scripts/simFoRatingOrder.mjs), the
   generator and --check all call these on the committed rows. */

/** Which fields a row carries for its shelf: the whole offense line for the four skill shelves, games for the rest. */
export const fieldsFor = shelf => (OFFENSE_SHELVES.includes(shelf) ? OFFENSE_FIELDS : ['games']);

/** `agreed` and `status` from the row's own `a`, `b` and `settledBy`, and nothing else. */
export function derive(row) {
  const headline = HEADLINE[row.shelf];
  const agreed = row.a && row.b ? fieldsFor(row.shelf).filter(f => row.a[f] !== null && row.a[f] !== undefined && row.a[f] === row.b[f]) : [];
  let status = !row.a || !row.b ? 'one-source' : headline.every(f => agreed.includes(f)) ? 'agree' : 'disagree';
  if (status === 'disagree' && settledSide(row, agreed)) status = 'settled';
  return { agreed, status };
}

/** Which publisher a third source sided with on a disputed row, or null. It must print every headline
    field the two dispute and agree with ONE of them on all of those, and nothing it prints may contradict
    that publisher anywhere else on the headline list. A field it leaves blank (a league page prints no
    rushing line for a receiver who never carried) is covered only when the two publishers already agree
    on it: a blank is never read as a zero. */
export function settledSide(row, agreed = derive({ ...row, settledBy: undefined }).agreed) {
  const v = row.settledBy?.values;
  if (!v || !row.a || !row.b) return null;
  for (const side of [row.a, row.b]) {
    if (HEADLINE[row.shelf].every(f => (Number.isFinite(v[f]) ? v[f] === side[f] : agreed.includes(f)))) return side;
  }
  return null;
}

/** The numbers a rating or a printed stat may read off a row, or null when the row may feed nothing.
    An agreed row gives its agreed fields; a settled row gives the third source's headline fields plus
    whatever else the two publishers agree on. A field outside that set is simply absent. */
export function usable(row) {
  if (row.status === 'agree') return Object.fromEntries(row.agreed.map(f => [f, row.a[f]]));
  if (row.status === 'settled') {
    const side = settledSide(row, row.agreed);
    if (!side) return null;
    const out = Object.fromEntries(row.agreed.map(f => [f, row.a[f]]));
    for (const f of HEADLINE[row.shelf]) out[f] = side[f];
    return out;
  }
  return null;
}

/** The headline opportunity count both publishers print: pass attempts, carries plus catches, catches. */
export function workloadOf(shelf, u) {
  if (!u) return null;
  if (shelf === 'QB') return u.passAtt ?? null;
  if (shelf === 'RB') return u.rushAtt == null || u.rec == null ? null : u.rushAtt + u.rec;
  if (shelf === 'WR' || shelf === 'TE') return u.rec ?? null;
  return null;
}

/** Header counts, re-derivable from the rows and the pool alone. */
export function countRows(rows, pool) {
  const byStatus = {}, byShelf = {}, differ = {}, blank = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    (byShelf[r.shelf] ??= {})[r.status] = (byShelf[r.shelf][r.status] ?? 0) + 1;
    if (r.a && r.b) for (const f of fieldsFor(r.shelf)) {
      if (r.a[f] === r.b[f]) continue;
      if (r.a[f] == null || r.b[f] == null) blank[f] = (blank[f] ?? 0) + 1; else differ[f] = (differ[f] ?? 0) + 1;
    }
  }
  const have = new Set(rows.map(r => r.key)), noRow = {};
  for (const p of pool) if (!have.has(p.key)) (noRow[p.shelf] ??= {})[p.tier] = (noRow[p.shelf][p.tier] ?? 0) + 1;
  const status = new Map(rows.map(r => [r.key, r.status]));
  const fifteen = pool.filter(p => p.tier === 'core');
  const withA = new Set(rows.filter(r => r.a).map(r => r.key));
  const exposed = pool.filter(p => OFFENSE_SHELVES.includes(p.shelf) && p.exposure2025);
  /* keys in one fixed order, so the same rows always count to the same bytes whatever order they were read in */
  const sorted = o => Object.fromEntries(Object.entries(o).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)).map(([k, v]) => [k, v && typeof v === 'object' ? sorted(v) : v]));
  return {
    offenseMenWithA2025LineInTheCheckpoint: exposed.length,
    ofThoseWithASourceARow: exposed.filter(p => withA.has(p.key)).length,
    pool: pool.length, rows: rows.length, byStatus: sorted(byStatus), byShelf: sorted(byShelf), noRowByShelfAndTier: sorted(noRow),
    fieldsBothPrintDifferently: sorted(differ), fieldsOnePublisherLeavesBlank: sorted(blank),
    fifteenDisputed: fifteen.filter(p => status.get(p.key) === 'disagree').length,
    fifteenOffense: fifteen.filter(p => OFFENSE_SHELVES.includes(p.shelf)).length,
    fifteenOffenseUsable: fifteen.filter(p => OFFENSE_SHELVES.includes(p.shelf) && ['agree', 'settled'].includes(status.get(p.key))).length,
  };
}

/** The anchors: lines the scouts read off two publishers by hand before this file existed. If the file
    disagrees with one, the file is wrong until proven otherwise. */
export const ANCHORS = [
  { key: 'LV|Ashton Jeanty|RB', values: { rushAtt: 266, rushYds: 975, rushTd: 5, rec: 55, recYds: 346, recTd: 5 } },
];

/** Every reason the file may not be trusted, as a list of sentences (empty when it may). */
export function stopReasons(rows, counts) {
  const out = [];
  if (counts.fifteenDisputed > 40) out.push(`${counts.fifteenDisputed} of the 480 fifteen are disputed, over 40: that is a join or column bug, not forty real disagreements`);
  const both = rows.filter(r => r.a && r.b);
  const anyDispute = Object.values(counts.fieldsBothPrintDifferently).reduce((s, n) => s + n, 0);
  if (both.length > 1000 && anyDispute === 0) out.push(`${both.length} rows carry both publishers and not one number differs: source B was read from source A's lineage`);
  if (counts.fifteenOffenseUsable * 2 < counts.fifteenOffense) out.push(`only ${counts.fifteenOffenseUsable} of the ${counts.fifteenOffense} offense men among the fifteen hold an agreed row: that is what a renamed field looks like`);
  if (counts.ofThoseWithASourceARow * 3 < counts.offenseMenWithA2025LineInTheCheckpoint) out.push(`only ${counts.ofThoseWithASourceARow} of the ${counts.offenseMenWithA2025LineInTheCheckpoint} offense men the checkpoint holds a 2025 line for found a source A row: the join is broken`);
  const byKey = new Map(rows.map(r => [r.key, r]));
  for (const anchor of ANCHORS) {
    const row = byKey.get(anchor.key), u = row && usable(row);
    for (const [f, want] of Object.entries(anchor.values)) if (!u || u[f] !== want) out.push(`anchor ${anchor.key} ${f}: the file says ${u ? u[f] : 'nothing usable'}, two publishers read by hand say ${want}`);
  }
  return out;
}

/* ------------------------------------------------------------- the file */
const HEAD_KEYS = ['what', 'season', 'seasonType', 'sourceA', 'sourceB', 'headline', 'counts'];

/** The file's text: a small header, then one man a line, sorted by key, LF endings, a stable key order. */
export function renderProduction(head, rows) {
  const ordered = [...rows].sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0)).map(r => {
    const line = { key: r.key, gsis: r.gsis, espn: r.espn, shelf: r.shelf, a: r.a, b: r.b, agreed: r.agreed, status: r.status };
    if (r.settledBy) line.settledBy = r.settledBy;
    return JSON.stringify(line);
  });
  const top = JSON.stringify(Object.fromEntries(HEAD_KEYS.map(k => [k, head[k]])), null, 1);
  return `${top.slice(0, top.lastIndexOf('}')).trimEnd()},\n "rows": [\n${ordered.join(',\n')}\n ]\n}\n`;
}

/** The pool the file covers: every checkpoint man with his ids, shelf and tier. */
export function readPool() {
  const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
  const rec = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
  const col = name => { const i = rec.rosterColumns.indexOf(name); if (i < 0) throw new Error(`the roster record has no ${name} column`); return i; };
  const g = col('gsis_id'), e = col('espn_id');
  const espnOf = new Map(rec.roster.map(r => [r[g], r[e]]));
  const pool = checkpoint.records.map(r => ({ key: r.key, tier: r.tier, shelf: r.seed.pos, gsis: r.sourceIdentity.gsisId, espn: espnOf.get(r.sourceIdentity.gsisId) || null, exposure2025: (r.observations ?? []).some(o => o.season === SEASON && o.exposure > 0) }));
  const manifest = checkpoint.sourceManifest.acquisitions.find(a => a.sourceUrl.endsWith(`stats_player_reg_${SEASON}.csv`));
  return { pool, checkpointSha: manifest?.sha256 ?? null };
}

const fold = t => t.split('\r\n').join('\n');
const day = file => fs.statSync(file).mtime.toISOString().slice(0, 10);
const pick = (all, shelf) => Object.fromEntries(fieldsFor(shelf).map(f => [f, all[f]]));

/** Both sources (from the cache, or the network with --pull) into rows and a header. */
async function build({ network, log }) {
  const aName = `stats_player_reg_${SEASON}.csv`;
  const aFile = path.join(ROOT, 'scripts', '.cache', 'nflverse', aName);
  if (!network && !fs.existsSync(aFile)) throw new Error(`${path.relative(ROOT, aFile)} is not in the cache: run with --pull`);
  const { rows: aRows, file } = await fetchSeasonStats(SEASON, { kind: 'reg', log });
  const columns = new Set(Object.keys(aRows[0]));
  for (const need of ['player_id', 'season', 'season_type']) if (!columns.has(need)) throw new Error(`source A has no ${need} column`);
  if (aRows.some(r => r.season !== String(SEASON) || r.season_type !== 'REG')) throw new Error('source A carries a row that is not the 2025 regular season');
  const aById = new Map();
  for (const r of aRows) { if (aById.has(r.player_id)) throw new Error(`source A prints ${r.player_id} twice`); aById.set(r.player_id, r); }
  const pages = await bAll({ network, log });
  const athletes = parseB(pages);
  const { pool, checkpointSha } = readPool();
  const kept = fs.existsSync(PRODUCTION) ? new Map(JSON.parse(fs.readFileSync(PRODUCTION, 'utf8')).rows.filter(r => r.settledBy).map(r => [r.key, r.settledBy])) : new Map();
  const rows = [];
  for (const p of pool) {
    const aRow = aById.get(p.gsis), bRow = p.espn ? athletes.get(String(p.espn)) : null;
    if (!aRow && !bRow) continue;
    const row = { key: p.key, gsis: p.gsis, espn: p.espn, shelf: p.shelf, a: aRow ? pick(aFields(aRow, columns), p.shelf) : null, b: bRow ? pick(bRow.fields, p.shelf) : null };
    if (kept.has(p.key)) row.settledBy = kept.get(p.key);
    Object.assign(row, derive(row));
    rows.push(row);
  }
  const aSha = sha256(fs.readFileSync(file));
  const head = {
    what: 'The 2025 NFL regular season line of every man in the NFL Front Office pool, as two publishers print it, side by side. Written and checked by scripts/fetchNfl2025Production.mjs (read its header). A row feeds a rating or a printed stat only when its status is agree or settled. It never reaches the browser.',
    season: SEASON, seasonType: 'regular',
    sourceA: { publisher: 'nflverse stats_player (the league play by play, compiled by nflfastR)', url: `${STATS_RELEASE_URL}/${aName}`, joinedOn: 'gsis_id', read: day(file), sha256: aSha, rows: aRows.length, sha256TheRatingCheckpointSawOn20261002: checkpointSha, sameBytesAsTheCheckpointSaw: aSha === checkpointSha },
    sourceB: { publisher: 'ESPN league statistics by athlete, season 2025, seasontype 2 (regular season)', url: B_URL, joinedOn: 'espn_id', read: pages.map(p => day(bPageFile(p.category, p.page))).sort().pop(), athletes: athletes.size, requests: pages.map(p => ({ category: p.category, sort: p.sort, page: p.page, athletes: JSON.parse(p.text).athletes.length, sha256: sha256(p.text) })) },
    headline: HEADLINE,
    counts: countRows(rows, pool),
  };
  return { head, rows, pool };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const log = m => console.log('   ' + m);
  const say = (head, rows) => {
    const c = head.counts;
    console.log(`${c.rows} rows for ${c.pool} men: ${Object.entries(c.byStatus).map(([k, v]) => `${k} ${v}`).join(', ')}`);
    console.log(`the fifteen: ${c.fifteenDisputed} disputed; offense ${c.fifteenOffenseUsable} of ${c.fifteenOffense} usable`);
    console.log(`fields both print differently: ${JSON.stringify(c.fieldsBothPrintDifferently)}; one leaves blank: ${JSON.stringify(c.fieldsOnePublisherLeavesBlank)}`);
    const stops = stopReasons(rows, c);
    for (const s of stops) console.error('STOP: ' + s);
    return stops.length;
  };
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(PRODUCTION)) { console.error(`${path.relative(ROOT, PRODUCTION)} is missing`); process.exit(1); }
    const text = fold(fs.readFileSync(PRODUCTION, 'utf8'));
    const file = JSON.parse(text);
    const { pool } = readPool();
    const rows = file.rows.map(r => ({ ...r, ...derive(r) }));
    const want = renderProduction({ ...file, counts: countRows(rows, pool) }, rows);
    const stops = say({ ...file, counts: countRows(rows, pool) }, rows);
    const same = want === text;
    console.log(`${same ? 'up to date' : 'STALE'}: ${path.relative(ROOT, PRODUCTION)} (every agreed list, status and header count re-derived from the rows)`);
    process.exit(same && !stops ? 0 : 1);
  }
  if (process.argv.includes('--settle')) {
    const from = process.argv[process.argv.indexOf('--settle') + 1];
    if (!from || !fs.existsSync(from)) { console.error('--settle needs the path of a reads file'); process.exit(1); }
    const reads = JSON.parse(fs.readFileSync(from, 'utf8'));
    const file = JSON.parse(fold(fs.readFileSync(PRODUCTION, 'utf8')));
    const byKey = new Map(file.rows.map(r => [r.key, r]));
    let settled = 0;
    for (const read of reads.reads) {
      const row = byKey.get(read.key);
      if (!row) { console.error(`STOP: ${read.key} is not a row of the file; nothing written`); process.exit(1); }
      if (derive({ ...row, settledBy: undefined }).status !== 'disagree') { console.error(`STOP: ${read.key} is not a disputed row; nothing written`); process.exit(1); }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(read.read ?? '') || !/^https:\/\//.test(read.url ?? '')) { console.error(`STOP: the read for ${read.key} has no day or no address; nothing written`); process.exit(1); }
      row.settledBy = { source: reads.source, url: read.url, read: read.read, values: read.values, ...(read.note ? { note: read.note } : {}) };
      const side = settledSide(row);
      if (side) settled += 1;
      console.log(`   ${read.key}: ${side ? `sides with source ${side === row.a ? 'A' : 'B'} (games ${side.games})` : 'sides with neither publisher on every headline field, the row stays disputed'}`);
    }
    const { pool } = readPool();
    const rows = file.rows.map(r => ({ ...r, ...derive(r) }));
    const head = { ...file, counts: countRows(rows, pool) };
    console.log(`${reads.reads.length} reads, ${settled} rows settled`);
    if (say(head, rows)) { console.error('nothing written'); process.exit(1); }
    fs.writeFileSync(PRODUCTION, renderProduction(head, rows));
    console.log(`wrote ${path.relative(ROOT, PRODUCTION)}`);
    process.exit(0);
  }
  const { head, rows } = await build({ network: process.argv.includes('--pull'), log });
  const stops = say(head, rows);
  if (stops) { console.error('nothing written'); process.exit(1); }
  fs.writeFileSync(PRODUCTION, renderProduction(head, rows));
  console.log(`wrote ${path.relative(ROOT, PRODUCTION)}`);
}
