/* Round 795: the 2026 transfer windows reach the games.

   Players reported Player Bingo's transfers as stale and some players as
   missing. Rounds 735 to 740 researched the January and summer 2026 windows
   league by league into scripts/data/window2026/ (one JSON array per league,
   each row in the overlay's shape plus two sources, a window and a checked
   date) and the players the 2026 market rows lack into missingPlayers.json.
   This builder is the one place those files become data the games read. It
   reads every research file present, keeps only the rows that pass the rules
   below, and writes two files together:

     (a) scripts/data/window2026/overlayAdditions.generated.mjs, the accepted
         rows in the form scripts/transferOverlay2026.mjs consumes. The overlay
         imports it, so both bakes (Club Manager's rosters and the Footle pool)
         apply the moves by name the way they apply the hand list.
     (b) ONE migration, supabase/migrations/20261001170000_round_795_window_2026.sql,
         UNAPPLIED, that moves each player's single 2026 market row to the
         verified club, inserts the 2026 rows the missing players file proves,
         and writes the 2026 stint rows the way Round 707 did. It is fail
         closed: list counts, the 2026 row count and a hash of the moved rows
         are checked before any write, every write must touch exactly the
         planned number of rows, and the after state is hashed again.

   THE RULES. A row is kept only when every one holds; a refused row is
   printed with its reasons and listed in the generated file's header.
     shape     name, to (engine club or null), db, loan (true or absent), add
               ({p, a 15 to 45, usd above 0} or absent), sources.
     sources   exactly two https URLs on two different hosts, never Wikipedia.
     window    "2026-01" or "2026-summer". A missing players row may have none
               (it is a row the table lacks, not a move); it must then say
               status "verified" and carry an insert block that agrees with it.
     flags     a row that says dbAbsent or dbMissing names a club the table
               does not carry, so the migration cannot write it.
     spelling  db is a club spelling the 2026 rows already carry.
     engine    to is what scripts/lib/dbClubNames.mjs maps db to; an unmapped
               db goes with to null or a known empty engine club.
     overlay   the name (exact, or accent and case folded) is not already in
               the hand written overlay.
     rows      the name matches exactly one 2026 row. A row with add may match
               none, or one at a club the roster bake does not model. A missing
               players row must match none.
     bake      a row with a club, no add and no 2025 or 2026 row at a modeled
               club would stop the roster bake ("not found and no add data").
     ledger    scripts/data/rosterConfirmation2026.json adjudicates Club
               Manager squads after the overlay; a row it contradicts would
               make the bake and the table disagree, so it is refused.
     twice     a name in two league files is one move when both rows agree on
               to, db, loan and add (kept once, traced to both), and refused
               everywhere when they do not. Two accepted names that fold to one
               key are refused too.
     dashes    no em or en dash in anything written.

   RERUN. When a research file grows, run this again: both outputs are
   rewritten from the files and the live table, byte for byte the same for the
   same inputs (no clock is read). Once the migration has been APPLIED the plan
   is history: the builder sees its after state in the table, refuses to
   rewrite it, and new rows need a new migration in a later round.

   Reads the database read only through the public REST endpoint with the URL
   and key in src/integrations/supabase/client.ts. Unreachable means it stops
   with nothing written.

   Run:   node scripts/buildWindow2026.mjs            (writes both outputs)
          node scripts/buildWindow2026.mjs --check    (writes nothing, exit 1 if
                                                       the committed outputs differ)
   Fence: node scripts/simWindow2026Integration.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { TRANSFER_OVERLAY_2026_HAND } from './transferOverlay2026.mjs';
import { DB_TO_ENGINE } from './lib/dbClubNames.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR = path.join(ROOT, 'scripts', 'data', 'window2026');
export const ADDITIONS_REL = 'scripts/data/window2026/overlayAdditions.generated.mjs';
export const MIGRATION_REL = 'supabase/migrations/20261001170000_round_795_window_2026.sql';

/* The research files, in the order their rows are emitted. A new league file
   goes here; any other .json in the folder stops the build, so a file cannot
   be dropped in and silently ignored. */
export const RESEARCH_FILES = [
  { key: 'premierLeague', file: 'premierLeague.json', label: 'Premier League', kind: 'move' },
  { key: 'laLiga', file: 'laLiga.json', label: 'La Liga', kind: 'move' },
  { key: 'bundesliga', file: 'bundesliga.json', label: 'Bundesliga', kind: 'move' },
  { key: 'serieA', file: 'serieA.json', label: 'Serie A', kind: 'move' },
  { key: 'ligue1', file: 'ligue1.json', label: 'Ligue 1', kind: 'move' },
  { key: 'missingPlayers', file: 'missingPlayers.json', label: 'Missing players', kind: 'missing' },
];
const NOT_RESEARCH = /\.left-out\.json$/;

export const WINDOWS = new Set(['2026-01', '2026-summer']);
const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);
const hasDash = s => typeof s === 'string' && (s.includes(EN_DASH) || s.includes(EM_DASH));

export const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
export const md5 = s => crypto.createHash('md5').update(s, 'utf8').digest('hex');

/* ------------------------------------------------------------------ */
/* What the roster bake knows, read from its own source               */
/* ------------------------------------------------------------------ */
/* The bake runs on import, so its two lists are read as text: the known empty
   engine clubs (real clubs with no dataset rows) and the positions it maps.
   Comments are cut first so a name in a comment cannot count. */
export function readBakeLists() {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'bakeClubManagerRosters.mjs'), 'utf8')
    .replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const empty = src.match(/const KNOWN_EMPTY = \[([\s\S]*?)\];/);
  const pos = src.match(/const POS_MAP = \{([\s\S]*?)\};/);
  if (!empty || !pos) throw new Error('buildWindow2026: could not read KNOWN_EMPTY or POS_MAP from scripts/bakeClubManagerRosters.mjs');
  const knownEmpty = new Set([...empty[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => m[1]));
  const positions = new Set([...pos[1].matchAll(/'((?:[^'\\]|\\.)*)'\s*:/g)].map(m => m[1]));
  if (knownEmpty.size < 10 || positions.size < 10) throw new Error('buildWindow2026: the bake lists parsed short, the reader is broken');
  return { knownEmpty, positions };
}

/* ------------------------------------------------------------------ */
/* The database, read only                                            */
/* ------------------------------------------------------------------ */
function restAuth() {
  const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)?.[1];
  const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)?.[1];
  if (!url || !key) throw new Error('buildWindow2026: could not read the Supabase URL and key from client.ts');
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

/* Three attempts, the transient 500 lesson simTransferOverlay carries. */
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
  throw new Error(`buildWindow2026: Supabase ${last} for ${pathAndQuery.slice(0, 120)} after 3 attempts. Nothing was written.`);
}

const inList = names => encodeURIComponent(names.map(n => `"${String(n).replace(/"/g, '\\"')}"`).join(','));

/** Market rows for the names in the given years, 40 names a query. */
export async function marketRows(names, years) {
  const out = [];
  for (let i = 0; i < names.length; i += 40) {
    const chunk = names.slice(i, i + 40);
    const { rows } = await rest(`player_market_values?select=id,player_name,club,year,position,age,market_value_usd&year=in.(${years.join(',')})&player_name=in.(${inList(chunk)})&order=id.asc&limit=1000`);
    if (rows.length >= 1000) throw new Error('buildWindow2026: a market row page came back full, the chunk is too big');
    out.push(...rows);
  }
  return out;
}

/** Stint rows for the names, 40 names a query. */
export async function stintRows(names) {
  const out = [];
  for (let i = 0; i < names.length; i += 40) {
    const chunk = names.slice(i, i + 40);
    const { rows } = await rest(`soccer_player_club_stints?select=id,player_name,club,first_year,last_year&player_name=in.(${inList(chunk)})&order=id.asc&limit=1000`);
    if (rows.length >= 1000) throw new Error('buildWindow2026: a stint page came back full, the chunk is too big');
    out.push(...rows);
  }
  return out;
}

/** The club spellings among `clubs` that the 2026 rows carry, one probe each. */
export async function presentSpellings(clubs) {
  const present = new Set();
  for (let i = 0; i < clubs.length; i += 10) {
    await Promise.all(clubs.slice(i, i + 10).map(async c => {
      const { rows } = await rest(`player_market_values?select=club&year=eq.2026&club=eq.${encodeURIComponent(c)}&limit=1`);
      if (rows.length > 0) present.add(c);
    }));
  }
  return present;
}

/** The exact count of 2026 market rows, from the count header. */
export async function count2026() {
  const { range } = await rest('player_market_values?select=id&year=eq.2026', { Prefer: 'count=exact', Range: '0-0' });
  const m = range.match(/\/(\d+)$/);
  if (!m) throw new Error(`buildWindow2026: no exact count in content-range "${range}"`);
  return Number(m[1]);
}

/* ------------------------------------------------------------------ */
/* The research files                                                 */
/* ------------------------------------------------------------------ */
export function readResearch(dir = DIR) {
  const known = new Set(RESEARCH_FILES.map(f => f.file));
  const stray = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !NOT_RESEARCH.test(f) && !known.has(f));
  if (stray.length) throw new Error(`buildWindow2026: ${stray.join(', ')} in scripts/data/window2026 is not a research file this builder knows; add it to RESEARCH_FILES`);
  const out = [];
  for (const f of RESEARCH_FILES) {
    const p = path.join(dir, f.file);
    if (!fs.existsSync(p)) continue;
    const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(rows)) throw new Error(`buildWindow2026: ${f.file} is not a JSON array`);
    out.push({ ...f, rows });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Offline rules for one row                                          */
/* ------------------------------------------------------------------ */
export function offlineProblems(row, kind) {
  const p = [];
  if (typeof row !== 'object' || row === null || Array.isArray(row)) return ['not an object'];
  if (typeof row.name !== 'string' || !row.name.trim() || row.name !== row.name.trim()) p.push('shape: name must be a trimmed non empty string');
  if (!(typeof row.to === 'string' || row.to === null)) p.push('shape: to must be an engine club or null');
  if (typeof row.db !== 'string' || !row.db.trim()) p.push('shape: no db spelling');
  if ('loan' in row && row.loan !== true) p.push('shape: loan is true or absent');
  if ('add' in row) {
    const a = row.add;
    if (!a || typeof a.p !== 'string' || !Number.isInteger(a.a) || a.a < 15 || a.a > 45 || !(Number(a.usd) > 0)) p.push('shape: add must be {p, a 15 to 45, usd above 0}');
  }
  const s = Array.isArray(row.sources) ? row.sources : null;
  if (!s || s.length !== 2) p.push(`sources: ${s ? s.length : 'no'} sources, the rule is exactly two`);
  else {
    if (s.some(u => typeof u !== 'string' || !u.startsWith('https://') || !hostOf(u))) p.push('sources: every source must be a parseable https URL');
    const hosts = s.map(hostOf);
    if (hosts[0] && hosts[0] === hosts[1]) p.push(`sources: both on ${hosts[0]}, two sources means two hosts`);
    if (hosts.some(h => h === 'wikipedia.org' || h.endsWith('.wikipedia.org'))) p.push('sources: Wikipedia is a spot check, never a source');
  }
  if (kind === 'missing') {
    if ('window' in row && !WINDOWS.has(row.window)) p.push(`window: ${JSON.stringify(row.window)} is not 2026-01 or 2026-summer`);
    if (row.status !== 'verified') p.push(`status: "${row.status}"${Array.isArray(row.missing) ? ` (missing ${row.missing.join(', ')})` : ''}, only a verified row may write a market row`);
    const ins = row.insert;
    if (!row.add) p.push('missing: no add data');
    if (!ins || typeof ins !== 'object') p.push('missing: no insert block');
    else if (row.add) {
      if (ins.player_name !== row.name) p.push('missing: insert.player_name is not the row name');
      if (ins.club !== row.db) p.push('missing: insert.club is not db');
      if (ins.year !== 2026) p.push('missing: insert.year is not 2026');
      if (ins.position !== row.add.p) p.push('missing: insert.position is not add.p');
      if (ins.age !== row.add.a) p.push('missing: insert.age is not add.a');
      if (ins.market_value_usd !== row.add.usd || !Number.isInteger(ins.market_value_usd)) p.push('missing: insert.market_value_usd is not add.usd as a whole number');
      if (typeof ins.nationality !== 'string' || !ins.nationality.trim()) p.push('missing: insert.nationality is empty');
    }
  } else if (!WINDOWS.has(row.window)) {
    p.push(`window: ${JSON.stringify(row.window)} is not 2026-01 or 2026-summer`);
  }
  if (row.dbAbsent || row.dbMissing) p.push(`flags: the row says the table has no "${row.db}" spelling, so nothing can be written for it`);
  for (const v of [row.name, row.to, row.db, row.add?.p, row.insert?.nationality, ...(Array.isArray(row.sources) ? row.sources : [])]) {
    if (hasDash(v)) { p.push('dashes: an em or en dash in a written field'); break; }
  }
  return p;
}

/* ------------------------------------------------------------------ */
/* The plan                                                           */
/* ------------------------------------------------------------------ */
/** Reads the files and the live table and returns the full plan; writes nothing. */
export async function buildPlan({ research = readResearch(), log = () => {} } = {}) {
  const { knownEmpty, positions } = readBakeLists();
  const engineClubs = new Set([...Object.values(DB_TO_ENGINE), ...knownEmpty]);
  const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'rosterConfirmation2026.json'), 'utf8'));
  const handNames = new Set(TRANSFER_OVERLAY_2026_HAND.map(e => e.name));
  const handFolded = new Set(TRANSFER_OVERLAY_2026_HAND.map(e => fold(e.name)));

  /* Every row, with its file and index, and its offline problems. */
  const cands = [];
  for (const f of research) {
    f.rows.forEach((row, index) => {
      cands.push({ file: f.key, label: f.label, kind: f.kind, index, row, problems: offlineProblems(row, f.kind) });
    });
  }
  for (const c of cands) {
    if (typeof c.row?.name !== 'string') continue;
    if (handNames.has(c.row.name)) c.problems.push('overlay: already in the hand written overlay');
    else if (handFolded.has(fold(c.row.name))) c.problems.push('overlay: folds to a name already in the hand written overlay');
  }

  /* Live reads for every named row. */
  const names = [...new Set(cands.map(c => c.row?.name).filter(n => typeof n === 'string' && n.trim()))].sort();
  log(`reading the table for ${names.length} names`);
  const market = await marketRows(names, [2025, 2026]);
  const stints = await stintRows(names);
  const spellings = [...new Set(cands.map(c => c.row?.db).filter(d => typeof d === 'string' && d.trim()))].sort();
  const present = await presentSpellings(spellings);
  const rows2026Total = await count2026();
  const byName = new Map();
  for (const r of market) (byName.get(r.player_name) ?? byName.set(r.player_name, []).get(r.player_name)).push(r);
  const stintsByName = new Map();
  for (const s of stints) (stintsByName.get(s.player_name) ?? stintsByName.set(s.player_name, []).get(s.player_name)).push(s);

  const ledgerBy = new Map();
  for (const m of ledger.movedTo || []) ledgerBy.set(m.name, { kind: 'movedTo', club: m.to });
  for (const m of ledger.confirmedStill || []) ledgerBy.set(m.name, { kind: 'confirmedStill', club: m.club });
  for (const m of ledger.pending || []) ledgerBy.set(m.name, { kind: 'pending', club: m.club });
  for (const m of ledger.removedClubNotModelled || []) ledgerBy.set(m.name, { kind: 'removedClubNotModelled', club: null });
  for (const m of ledger.notCurrent || []) ledgerBy.set(m.name, { kind: 'notCurrent', club: null });

  for (const c of cands) {
    const r = c.row;
    if (typeof r?.name !== 'string' || typeof r?.db !== 'string') continue;
    if (!present.has(r.db) && !r.dbAbsent && !r.dbMissing) c.problems.push(`spelling: "${r.db}" is not a club spelling the 2026 rows carry`);
    const mapped = DB_TO_ENGINE[r.db];
    if (mapped !== undefined && r.to !== mapped) c.problems.push(`engine: db "${r.db}" is the bake's "${mapped}", but to says ${JSON.stringify(r.to)}`);
    if (mapped === undefined && r.to !== null && !knownEmpty.has(r.to)) c.problems.push(`engine: db "${r.db}" is not a club the bake maps, so to must be null or a known empty engine club, not ${JSON.stringify(r.to)}`);
    if (r.to !== null && typeof r.to === 'string' && !engineClubs.has(r.to)) c.problems.push(`engine: "${r.to}" is not a club the roster bake knows`);

    const all = byName.get(r.name) || [];
    const rows26 = all.filter(x => x.year === 2026);
    c.rows26 = rows26;
    if (rows26.length > 1) c.problems.push(`rows: ${rows26.length} rows for 2026 (${rows26.map(x => x.club).join(' | ')}), the migration keys on the name alone`);
    else if (c.kind === 'missing') {
      if (rows26.length !== 0) c.problems.push(`rows: already has a 2026 row (${rows26[0].club}), there is nothing missing to insert`);
    } else if (r.add) {
      if (rows26.length === 1 && DB_TO_ENGINE[rows26[0].club] !== undefined) c.problems.push(`rows: has add data but a 2026 row at a modeled club (${rows26[0].club}), add is for players the bake cannot find`);
    } else if (rows26.length === 0) {
      c.problems.push('rows: no 2026 row and no add data, the migration would change nothing');
    }
    c.add = r.add ? { p: r.add.p, a: r.add.a, usd: r.add.usd } : null;
    if (c.kind === 'move' && r.to !== null && !r.add) {
      const findable = all.some(x => DB_TO_ENGINE[x.club] !== undefined && positions.has(x.position)
        && Number(x.market_value_usd) > 0 && Number(x.age) >= 14 && Number(x.age) <= 45);
      /* The bake reads only rows at clubs it models, so a man whose single
         2026 row sits at a club it does not (Leicester, Nantes, "Without
         Club") is added from that row: the table's own position, age and
         value, exactly what the bake reads once the migration has moved the
         row. The hand list typed the same thing for Spertsyan; here it is
         derived, never typed. */
      const own = rows26.length === 1 ? rows26[0] : null;
      if (!findable && own && positions.has(own.position) && Number(own.market_value_usd) > 0 && Number.isInteger(own.age) && own.age >= 15 && own.age <= 45) {
        c.add = { p: own.position, a: own.age, usd: Number(own.market_value_usd) };
        c.addDerived = true;
      } else if (!findable) {
        c.problems.push('bake: no usable 2025 or 2026 row at a club the roster bake models, no add data, and no usable 2026 row to add him from, the bake would stop');
      }
    }
    const l = ledgerBy.get(r.name);
    if (l) {
      if (l.club === null && r.to !== null) c.problems.push(`ledger: rosterConfirmation2026.json lists him as ${l.kind}, which takes him out of every squad`);
      else if (l.club !== null && r.to !== l.club) c.problems.push(`ledger: rosterConfirmation2026.json has him ${l.kind} at ${l.club}, the row says ${JSON.stringify(r.to)}`);
    }
  }

  /* Cross file: one name, one move. */
  const byExact = new Map();
  for (const c of cands) if (typeof c.row?.name === 'string') (byExact.get(c.row.name) ?? byExact.set(c.row.name, []).get(c.row.name)).push(c);
  /* One move is one (to, db) pair. Loan is information only (nothing written
     reads it), so two files that agree on the club and disagree on the loan
     are one move without the flag, listed so the disagreement is seen. The
     add data written must agree too. */
  const loanDisputed = [];
  for (const [name, list] of byExact) {
    if (list.length < 2) continue;
    const sig = c => JSON.stringify([c.row.to, c.row.db, c.add ? [c.add.p, c.add.a, c.add.usd] : null]);
    const sameFile = new Set(list.map(c => c.file)).size !== list.length;
    if (sameFile || new Set(list.map(sig)).size !== 1) {
      for (const c of list) c.problems.push(`twice: ${name} is in ${list.map(x => x.file).join(' and ')} and the rows do not agree on one move`);
    } else {
      for (const c of list.slice(1)) c.duplicateOf = list[0];
      if (new Set(list.map(c => !!c.row.loan)).size > 1) {
        list[0].loanDisputed = true;
        loanDisputed.push(`${name} (${list.map(c => `${c.file} ${c.row.loan ? 'loan' : 'permanent'}`).join(', ')})`);
      }
    }
  }

  /* Accepted: the first of each agreeing group, every problem free. A group is
     accepted only when every member is clean. */
  const accepted = [];
  for (const c of cands) {
    if (c.duplicateOf) continue;
    const group = [c, ...cands.filter(x => x.duplicateOf === c)];
    if (group.some(x => x.problems.length)) {
      for (const x of group) if (!x.problems.length) x.problems.push(`twice: the agreeing row in ${group.find(y => y.problems.length).file} was refused`);
      continue;
    }
    accepted.push({ c, files: group.map(x => x.file) });
  }
  /* Two accepted spellings of one man would move him twice. */
  const byFold = new Map();
  for (const a of accepted) (byFold.get(fold(a.c.row.name)) ?? byFold.set(fold(a.c.row.name), []).get(fold(a.c.row.name))).push(a);
  const foldClash = new Set();
  for (const list of byFold.values()) if (list.length > 1) for (const a of list) { foldClash.add(a); a.c.problems.push(`twice: ${list.map(x => x.c.row.name).join(' and ')} fold to one name`); }
  const kept = accepted.filter(a => !foldClash.has(a));

  /* The emitted entries, the market moves, the inserts and the stints. */
  const additions = [];
  const moves = [];
  const inserts = [];
  const stintPlan = [];
  const noStint = [];
  for (const { c, files } of kept) {
    const r = c.row;
    const from = c.rows26.length === 1 ? c.rows26[0].club : null;
    const entry = { name: r.name, to: r.to, db: r.db };
    if (r.loan && !c.loanDisputed) entry.loan = true;
    if (c.add) entry.add = c.add;
    if (c.addDerived) entry.addDerived = true;
    entry.from = from;
    if (r.window) entry.window = r.window;
    entry.research = files;
    entry.sources = [...r.sources];
    additions.push(entry);
    if (from !== null && from !== r.db) moves.push({ name: r.name, from, to: r.db });
    if (c.kind === 'missing') {
      const i = r.insert;
      inserts.push({ name: r.name, position: i.position, age: i.age, nationality: i.nationality, club: i.club, usd: i.market_value_usd });
    }
    if (r.window) {
      const own = stintsByName.get(r.name) || [];
      if (own.length === 0) noStint.push(r.name);
      else if (!own.some(s => s.club === r.db && s.first_year <= 2026 && 2026 <= s.last_year)) stintPlan.push({ name: r.name, club: r.db });
    }
  }

  const hashBefore = md5(moves.map(m => `${m.name}|${m.from}`).join('\n'));
  const hashAfter = md5(moves.map(m => `${m.name}|${m.to}`).join('\n'));

  const perFile = {};
  for (const f of research) perFile[f.key] = { label: f.label, rows: f.rows.length, accepted: 0, alsoIn: 0, refused: 0, moves: 0, already: 0, adds: 0, derived: 0, inserts: 0, stints: 0 };
  for (const c of cands) {
    if (c.duplicateOf && !c.problems.length) perFile[c.file].alsoIn += 1;
    else if (c.problems.length) perFile[c.file].refused += 1;
  }
  const moveNames = new Set(moves.map(m => m.name));
  const stintNames = new Set(stintPlan.map(s => s.name));
  for (const a of additions) {
    const pf = perFile[a.research[0]];
    pf.accepted += 1;
    if (moveNames.has(a.name)) pf.moves += 1;
    else if (a.from !== null) pf.already += 1;
    if (a.add) pf.adds += 1;
    if (a.addDerived) pf.derived += 1;
    if (stintNames.has(a.name)) pf.stints += 1;
  }
  if (perFile.missingPlayers) perFile.missingPlayers.inserts = inserts.length;

  const refused = cands.filter(c => c.problems.length).map(c => ({ file: c.file, name: typeof c.row?.name === 'string' ? c.row.name : `(row ${c.index + 1})`, problems: c.problems }));
  return { additions, moves, inserts, stints: stintPlan, noStint, refused, loanDisputed, perFile, hashBefore, hashAfter, rows2026Total };
}

/* ------------------------------------------------------------------ */
/* Rendering                                                          */
/* ------------------------------------------------------------------ */
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const js = v => JSON.stringify(v);

function countsLines(plan, prefix) {
  const out = [];
  for (const pf of Object.values(plan.perFile)) {
    out.push(`${prefix}${pf.label}: ${pf.rows} rows, ${pf.accepted} accepted (${pf.moves} market moves, ${pf.already} already at the club, ${pf.adds} with add data (${pf.derived} of them from the 2026 row), ${pf.inserts} market rows inserted, ${pf.stints} stints), ${pf.alsoIn} also in an earlier file, ${pf.refused} refused`);
  }
  return out;
}

export function renderAdditions(plan) {
  const lines = [
    '// GENERATED by scripts/buildWindow2026.mjs. DO NOT EDIT BY HAND: fix a research file in',
    '// scripts/data/window2026/ and re-run the builder, which rewrites this file and the migration',
    `// ${MIGRATION_REL} together.`,
    '//',
    '// The 2026 window rows that passed every rule in the builder header, in the shape',
    '// scripts/transferOverlay2026.mjs consumes (name, to, db, loan, add), plus:',
    '//   from      the club on the player\'s 2026 row when the plan was measured (null: no 2026 row).',
    '//             The migration moves that row from `from` to `db`; simTransferOverlay reads it to',
    '//             tell a pending migration from a rolled back one.',
    '//   addDerived  add was not in the research row: it is the player\'s own 2026 row (position, age,',
    '//             value) at a club the roster bake does not model, the values the bake reads once',
    '//             the migration has moved that row.',
    '//   window    the window of the move (absent for a missing players row that is not a move).',
    '//   research  the research file(s) the row came from; sources are the first file\'s two.',
    '//',
    ...countsLines(plan, '// '),
    `//   total: ${plan.additions.length} entries, ${plan.moves.length} market moves, ${plan.inserts.length} market rows inserted, ${plan.stints.length} stints`,
    '//',
    `// Two files agree on the club and disagree on the loan (${plan.loanDisputed.length}), so the loan flag is left off:`,
    ...plan.loanDisputed.map(x => `//   ${x}`),
    '//',
    `// Refused (${plan.refused.length}), each with its first reason; the builder prints them all:`,
    ...plan.refused.map(r => `//   ${r.file}: ${r.name}: ${r.problems[0]}`),
    '',
    `export const WINDOW_2026_MIGRATION = ${js(MIGRATION_REL)};`,
    '',
    'export const WINDOW_2026_ADDITIONS = [',
    ...plan.additions.map(e => `  ${js(e)},`),
    '];',
    '',
  ];
  return lines.join('\n');
}

export function renderMigration(plan) {
  const L = [];
  const push = (...xs) => L.push(...xs);
  push(
    '-- Round 795: the 2026 transfer windows reach the market value and stint tables.',
    '--',
    '-- GENERATED by scripts/buildWindow2026.mjs from scripts/data/window2026/*.json. DO NOT EDIT BY',
    '-- HAND: fix a research file and re-run the builder, which rewrites this file and',
    `-- ${ADDITIONS_REL} together.`,
    '--',
    '-- UNAPPLIED. Written for review; the release manager applies it, the whole file in one call',
    '-- through the Supabase MCP (apply_migration or execute_sql). Before applying, run',
    '-- node scripts/simWindow2026Integration.mjs, which must report the table PENDING; afterwards it',
    '-- must report APPLIED. Anything else is the table having moved: re-run the builder first.',
    '--',
    '-- WHY. Players reported Player Bingo\'s transfers as stale and some players as missing. The 2026',
    '-- market rows are an autumn 2025 snapshot; Rounds 735 to 740 researched the January and summer',
    '-- 2026 windows league by league, two sources a move, and the players the 2026 rows lack. Player',
    '-- Bingo, Footle, Rarity Round and player search read this table directly, and Soccer Grid and',
    '-- Soccer Connect 4 confirm club history from the stint table, so the moves have to land here.',
    '--',
    '-- WHAT IT DOES, in one transaction, only after every guard below has passed:',
    `--   1. ${plan.moves.length} market rows: the player's single 2026 row moves from the club the table carried`,
    '--      when the plan was measured (r795_moves.from_club) to the verified club (to_club, the',
    '--      research row\'s db spelling, one the 2026 rows already carry). A loan writes the club he',
    '--      plays for, the dataset\'s own convention.',
    `--   2. ${plan.inserts.length} market rows inserted for players the 2026 rows lack (missingPlayers.json rows`,
    '--      with status verified), every column from the research row\'s insert block. A partial row',
    '--      (a value not two source verified) is refused by the builder and written nowhere.',
    `--   3. ${plan.stints.length} stint rows in soccer_player_club_stints, the Round 707 way: a (name, club) pair`,
    '--      with no stint of that name at that exact club covering 2026 gets first_year = last_year =',
    '--      2026, seasons 1, nationality and position from the 2026 market row (else his latest stint),',
    '--      debut_year, debut_age and name_folded copied from his latest stint, person_key null.',
    `--      ${plan.noStint.length} accepted movers have no stint row at all to copy from and get none here.`,
    '--   The old club\'s stint is not cut back: the 2026 market row is the autumn 2025 season, so the',
    '--   player really was there in the season the table files as 2026 (Round 707\'s reasoning).',
    '--',
    '-- PER RESEARCH FILE (accepted rows only reach this file):',
    ...countsLines(plan, '--   '),
    '--',
    '-- GUARDS, checked before the first write; any one off and it raises and writes nothing:',
    '--   the three lists hold exactly the counts below; the table holds exactly',
    `--   ${plan.rows2026Total} rows for 2026; every moving name has exactly one 2026 row and it says from_club;`,
    '--   the md5 of those rows (name|club, in list order) is hash_before; every destination is a',
    '--   spelling the 2026 rows carry; no inserted name has a 2026 row; every stint name has a stint',
    '--   row to copy from, at most one 2026 market row, and no stint at that club covering 2026.',
    '-- Every write must touch exactly its expected count, and afterwards the moved rows hash to',
    '-- hash_after, the table holds the old count plus the inserts, every inserted row is there once',
    '-- and every stint pair is covered. Any miss raises and the whole transaction rolls back.',
    '--',
    '-- UNDO. The final notice prints the highest market and stint ids before the inserts:',
    '--   delete from public.player_market_values where id > <market id> and year = 2026 and player_name in (<the inserted names>);',
    '--   delete from public.soccer_player_club_stints where id > <stint id> and first_year = 2026 and last_year = 2026 and seasons = 1 and person_key is null;',
    '--   and, for every r795_moves row, set club = from_club where year = 2026 and player_name = player_name and club = to_club.',
    '',
    'do $migration$',
    'declare',
    `  expected_moves constant integer := ${plan.moves.length};`,
    `  expected_inserts constant integer := ${plan.inserts.length};`,
    `  expected_stints constant integer := ${plan.stints.length};`,
    `  expected_rows_2026 constant integer := ${plan.rows2026Total};`,
    `  hash_before constant text := ${q(plan.hashBefore)};`,
    `  hash_after constant text := ${q(plan.hashAfter)};`,
    '  n integer;',
    '  h text;',
    '  max_market_before bigint;',
    '  max_stint_before bigint;',
    'begin',
    '  create temporary table r795_moves (seq integer primary key, player_name text not null unique, from_club text not null, to_club text not null) on commit drop;',
  );
  if (plan.moves.length) {
    push('  insert into r795_moves (seq, player_name, from_club, to_club) values');
    plan.moves.forEach((m, i) => push(`    (${i + 1}, ${q(m.name)}, ${q(m.from)}, ${q(m.to)})${i === plan.moves.length - 1 ? '' : ','}`));
    push('  ;');
  }
  push('  create temporary table r795_inserts (seq integer primary key, player_name text not null unique, position text not null, age integer not null, nationality text not null, club text not null, market_value_usd bigint not null) on commit drop;');
  if (plan.inserts.length) {
    push('  insert into r795_inserts (seq, player_name, position, age, nationality, club, market_value_usd) values');
    plan.inserts.forEach((x, i) => push(`    (${i + 1}, ${q(x.name)}, ${q(x.position)}, ${x.age}, ${q(x.nationality)}, ${q(x.club)}, ${x.usd})${i === plan.inserts.length - 1 ? '' : ','}`));
    push('  ;');
  }
  push('  create temporary table r795_stints (seq integer primary key, player_name text not null, club text not null, unique (player_name, club)) on commit drop;');
  if (plan.stints.length) {
    push('  insert into r795_stints (seq, player_name, club) values');
    plan.stints.forEach((s, i) => push(`    (${i + 1}, ${q(s.name)}, ${q(s.club)})${i === plan.stints.length - 1 ? '' : ','}`));
    push('  ;');
  }
  push(
    '',
    '  -- GUARD 1: the lists are the lists the builder wrote.',
    '  select count(*) into n from r795_moves;',
    "  if n <> expected_moves then raise exception 'Round 795: the move list holds % rows, expected %. Nothing was changed.', n, expected_moves; end if;",
    '  select count(*) into n from r795_inserts;',
    "  if n <> expected_inserts then raise exception 'Round 795: the insert list holds % rows, expected %. Nothing was changed.', n, expected_inserts; end if;",
    '  select count(*) into n from r795_stints;',
    "  if n <> expected_stints then raise exception 'Round 795: the stint list holds % rows, expected %. Nothing was changed.', n, expected_stints; end if;",
    '',
    '  -- GUARD 2: the 2026 rows are where the plan measured them.',
    '  select count(*) into n from public.player_market_values where year = 2026;',
    "  if n <> expected_rows_2026 then raise exception 'Round 795: the table holds % rows for 2026, the plan measured %. Re-run scripts/buildWindow2026.mjs. Nothing was changed.', n, expected_rows_2026; end if;",
    '  select count(*) into n from r795_moves o',
    '   where (select count(*) from public.player_market_values m where m.year = 2026 and m.player_name = o.player_name) <> 1',
    '      or not exists (select 1 from public.player_market_values m where m.year = 2026 and m.player_name = o.player_name and m.club = o.from_club);',
    "  if n <> 0 then raise exception 'Round 795: % moving names are not one 2026 row at the measured club. Re-run scripts/buildWindow2026.mjs. Nothing was changed.', n; end if;",
    "  select md5(coalesce(string_agg(o.player_name || '|' || m.club, E'\\n' order by o.seq), '')) into h",
    '    from r795_moves o join public.player_market_values m on m.year = 2026 and m.player_name = o.player_name;',
    "  if h is distinct from hash_before then raise exception 'Round 795: the moving rows hash to %, the plan measured %. Nothing was changed.', h, hash_before; end if;",
    '  select count(*) into n from (select to_club as club from r795_moves union select club from r795_inserts) d',
    '   where not exists (select 1 from public.player_market_values m where m.year = 2026 and m.club = d.club);',
    "  if n <> 0 then raise exception 'Round 795: % destination spellings are not carried by the 2026 rows. Nothing was changed.', n; end if;",
    '  select count(*) into n from r795_inserts i where exists (select 1 from public.player_market_values m where m.year = 2026 and m.player_name = i.player_name);',
    "  if n <> 0 then raise exception 'Round 795: % names to insert already have a 2026 row. Nothing was changed.', n; end if;",
    '',
    '  -- GUARD 3: every stint pair is still missing and has a stint row to copy from.',
    '  select count(*) into n from r795_stints t where not exists (select 1 from public.soccer_player_club_stints s where s.player_name = t.player_name);',
    "  if n <> 0 then raise exception 'Round 795: % stint names have no stint row to copy from. Nothing was changed.', n; end if;",
    '  select count(*) into n from r795_stints t where (select count(*) from public.player_market_values m where m.year = 2026 and m.player_name = t.player_name) > 1;',
    "  if n <> 0 then raise exception 'Round 795: % stint names carry more than one 2026 market row. Nothing was changed.', n; end if;",
    '  select count(*) into n from r795_stints t where exists (select 1 from public.soccer_player_club_stints s',
    '     where s.player_name = t.player_name and s.club = t.club and 2026 between s.first_year and s.last_year);',
    "  if n <> 0 then raise exception 'Round 795: % stint pairs already have a 2026 stint. Re-run scripts/buildWindow2026.mjs. Nothing was changed.', n; end if;",
    '',
    '  select max(id) into max_market_before from public.player_market_values;',
    '  select max(id) into max_stint_before from public.soccer_player_club_stints;',
    '',
    '  -- WRITE 1: each moving 2026 row goes to the verified club.',
    '  update public.player_market_values m',
    '     set club = o.to_club',
    '    from r795_moves o',
    '   where m.year = 2026 and m.player_name = o.player_name and m.club = o.from_club;',
    '  get diagnostics n = row_count;',
    "  if n <> expected_moves then raise exception 'Round 795: moved % rows, expected %. Rolled back.', n, expected_moves; end if;",
    '',
    '  -- WRITE 2: the 2026 rows the missing players file proves.',
    '  insert into public.player_market_values (player_name, position, age, nationality, club, market_value_usd, year)',
    '  select i.player_name, i.position, i.age, i.nationality, i.club, i.market_value_usd, 2026',
    '    from r795_inserts i order by i.seq;',
    '  get diagnostics n = row_count;',
    "  if n <> expected_inserts then raise exception 'Round 795: inserted % market rows, expected %. Rolled back.', n, expected_inserts; end if;",
    '',
    '  -- WRITE 3: the 2026 stints, the Round 707 way.',
    '  insert into public.soccer_player_club_stints',
    '    (player_name, club, first_year, last_year, seasons, nationality, position,',
    '     debut_year, debut_age, person_key, name_folded)',
    '  select t.player_name, t.club, 2026, 2026, 1,',
    '         coalesce(m.nationality, latest.nationality),',
    '         coalesce(m.position, latest.position),',
    '         latest.debut_year, latest.debut_age, null, latest.name_folded',
    '    from r795_stints t',
    '    left join public.player_market_values m on m.year = 2026 and m.player_name = t.player_name',
    '   cross join lateral (',
    '     select s.nationality, s.position, s.debut_year, s.debut_age, s.name_folded',
    '       from public.soccer_player_club_stints s',
    '      where s.player_name = t.player_name',
    '      order by s.last_year desc, s.id desc',
    '      limit 1',
    '   ) latest',
    '   order by t.seq;',
    '  get diagnostics n = row_count;',
    "  if n <> expected_stints then raise exception 'Round 795: inserted % stint rows, expected %. Rolled back.', n, expected_stints; end if;",
    '',
    '  -- AFTER: the table says what the plan promised.',
    "  select md5(coalesce(string_agg(o.player_name || '|' || m.club, E'\\n' order by o.seq), '')) into h",
    '    from r795_moves o join public.player_market_values m on m.year = 2026 and m.player_name = o.player_name;',
    "  if h is distinct from hash_after then raise exception 'Round 795: after the update the moving rows hash to %, expected %. Rolled back.', h, hash_after; end if;",
    '  select count(*) into n from public.player_market_values where year = 2026;',
    "  if n <> expected_rows_2026 + expected_inserts then raise exception 'Round 795: the table holds % rows for 2026 after the writes, expected %. Rolled back.', n, expected_rows_2026 + expected_inserts; end if;",
    '  select count(*) into n from r795_inserts i',
    '   where (select count(*) from public.player_market_values m where m.year = 2026 and m.player_name = i.player_name and m.club = i.club) <> 1;',
    "  if n <> 0 then raise exception 'Round 795: % inserted names are not exactly one 2026 row at their club. Rolled back.', n; end if;",
    '  select count(*) into n from r795_stints t where not exists (select 1 from public.soccer_player_club_stints s',
    '     where s.player_name = t.player_name and s.club = t.club and 2026 between s.first_year and s.last_year);',
    "  if n <> 0 then raise exception 'Round 795: % stint pairs are still uncovered after the insert. Rolled back.', n; end if;",
    '',
    "  raise notice 'Round 795: % market rows moved, % market rows inserted above id %, % stints inserted above id %.', expected_moves, expected_inserts, max_market_before, expected_stints, max_stint_before;",
    'end',
    '$migration$;',
    '',
  );
  return L.join('\n');
}

/* ------------------------------------------------------------------ */
/* The committed migration, read back                                 */
/* ------------------------------------------------------------------ */
/** The move, insert and stint lists and constants out of a migration's text. */
export function parseMigration(sql) {
  const code = sql.replace(/\r\n/g, '\n').split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
  const constant = name => {
    const m = code.match(new RegExp(`${name} constant (?:integer|text) := ('?)([^';]*)\\1;`));
    return m ? (m[1] ? m[2] : Number(m[2])) : undefined;
  };
  const block = table => {
    const m = code.match(new RegExp(`insert into ${table} \\(([^)]*)\\) values\\n([\\s\\S]*?)\\n\\s*;`));
    if (!m) return [];
    return m[2].split('\n').map(l => l.trim().replace(/,$/, '')).filter(Boolean).map(l => {
      const cells = [...l.slice(1, -1).matchAll(/'((?:[^']|'')*)'|(-?\d+)/g)].map(x => (x[1] !== undefined ? x[1].replace(/''/g, "'") : Number(x[2])));
      return cells;
    });
  };
  return {
    code,
    expectedMoves: constant('expected_moves'),
    expectedInserts: constant('expected_inserts'),
    expectedStints: constant('expected_stints'),
    expectedRows2026: constant('expected_rows_2026'),
    hashBefore: constant('hash_before'),
    hashAfter: constant('hash_after'),
    moves: block('r795_moves').map(([seq, name, from, to]) => ({ seq, name, from, to })),
    inserts: block('r795_inserts').map(([seq, name, position, age, nationality, club, usd]) => ({ seq, name, position, age, nationality, club, usd })),
    stints: block('r795_stints').map(([seq, name, club]) => ({ seq, name, club })),
  };
}

/** PENDING (the table is the plan's before state), APPLIED (its after state), or MOVED. */
export async function liveState(mig) {
  const names = [...new Set([...mig.moves.map(m => m.name), ...mig.inserts.map(i => i.name)])];
  const rows = names.length ? (await marketRows(names, [2026])) : [];
  const by = new Map();
  for (const r of rows) (by.get(r.player_name) ?? by.set(r.player_name, []).get(r.player_name)).push(r);
  let atFrom = 0, atTo = 0, elsewhere = 0, insPresent = 0, insAbsent = 0, insOther = 0;
  const odd = [];
  for (const m of mig.moves) {
    const list = by.get(m.name) || [];
    if (list.length === 1 && list[0].club === m.from) atFrom += 1;
    else if (list.length === 1 && list[0].club === m.to) atTo += 1;
    else { elsewhere += 1; odd.push(`${m.name}: ${list.map(r => r.club).join(' | ') || 'no 2026 row'} (plan ${m.from} to ${m.to})`); }
  }
  for (const i of mig.inserts) {
    const list = by.get(i.name) || [];
    if (list.length === 0) insAbsent += 1;
    else if (list.length === 1 && list[0].club === i.club) insPresent += 1;
    else { insOther += 1; odd.push(`${i.name}: ${list.map(r => r.club).join(' | ')} (insert at ${i.club})`); }
  }
  const total = await count2026();
  const hash = md5(mig.moves.map(m => `${m.name}|${(by.get(m.name) || [])[0]?.club ?? ''}`).join('\n'));
  let state = 'MOVED';
  if (elsewhere === 0 && insOther === 0 && atTo === 0 && insPresent === 0 && hash === mig.hashBefore && total === mig.expectedRows2026) state = 'PENDING';
  if (elsewhere === 0 && insOther === 0 && atFrom === 0 && insAbsent === 0 && hash === mig.hashAfter && total === mig.expectedRows2026 + mig.expectedInserts) state = 'APPLIED';
  return { state, atFrom, atTo, elsewhere, insPresent, insAbsent, insOther, total, hash, odd, byName: by };
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (invokedDirectly) {
  const check = process.argv.includes('--check');
  const addPath = path.join(ROOT, ADDITIONS_REL);
  const migPath = path.join(ROOT, MIGRATION_REL);
  try {
    if (fs.existsSync(migPath)) {
      const s = await liveState(parseMigration(fs.readFileSync(migPath, 'utf8')));
      if (s.state === 'APPLIED') {
        console.error(`buildWindow2026: ${MIGRATION_REL} is APPLIED (the table carries its after state), so its plan is history and is not rewritten. New rows need a new migration in a later round. Nothing was written.`);
        process.exit(1);
      }
    }
    const plan = await buildPlan({ log: m => console.log(`  ${m}`) });
    const additions = renderAdditions(plan);
    const migration = renderMigration(plan);
    console.log('buildWindow2026:');
    for (const l of countsLines(plan, '  ')) console.log(l);
    console.log(`  total ${plan.additions.length} entries: ${plan.moves.length} market moves, ${plan.inserts.length} inserts, ${plan.stints.length} stints, ${plan.noStint.length} movers with no stint row to copy from; 2026 rows ${plan.rows2026Total}`);
    console.log(`  hash before ${plan.hashBefore}, after ${plan.hashAfter}`);
    console.log(`  refused ${plan.refused.length}:`);
    for (const r of plan.refused) console.log(`    ${r.file}: ${r.name}: ${r.problems.join('; ')}`);
    if (check) {
      const lf = t => t.replace(/\r\n/g, '\n');
      const sameA = fs.existsSync(addPath) && lf(fs.readFileSync(addPath, 'utf8')) === additions;
      const sameM = fs.existsSync(migPath) && lf(fs.readFileSync(migPath, 'utf8')) === migration;
      console.log(`  --check: additions ${sameA ? 'identical' : 'DIFFER'}, migration ${sameM ? 'identical' : 'DIFFERS'}`);
      process.exit(sameA && sameM ? 0 : 1);
    }
    fs.writeFileSync(addPath, additions);
    fs.writeFileSync(migPath, migration);
    console.log(`  wrote ${ADDITIONS_REL} and ${MIGRATION_REL}`);
  } catch (err) {
    console.error(String(err.message || err));
    process.exit(1);
  }
}
