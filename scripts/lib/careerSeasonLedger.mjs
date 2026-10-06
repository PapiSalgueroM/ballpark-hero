/**
 * Round 1010b: the season ledger (scripts/data/careerSeason2025.json) as code,
 * shared by the generator (scripts/genCareerSeasonAdditions.mjs) and the
 * fences (simCareerSeasonAdditions, simTransferPathHints, simCareerSeasonTruth).
 *
 * The ledger records, per wave, the rows a season adds, the snapshot rows it
 * corrects field by field, the careers that ended, the men held for a relabel
 * round and the duplicate entries it removes. Everything here is pure: the
 * pool after the ledger is applyLedger(pool before), the pool before is
 * undoLedger(pool after), and each direction is proved by the bake hash the
 * ledger stores (preBake, postBake), so a fence can always rebuild the side it
 * needs from whichever side the committed bake is on.
 *
 * Season strings: a split season is "2025-2026", a calendar season "2025",
 * joined by a plain hyphen only (seasonSpan in src/lib/transferPathModes.ts
 * spans nothing otherwise, so a dash typed by hand silently drops the link).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const LEDGER_FILE = 'scripts/data/careerSeason2025.json';
export const SPLIT_SEASON = /^\d{4}-\d{4}$/;
export const CALENDAR_SEASON = /^\d{4}$/;
/* hosts that never count as a source: the wikis */
export const WIKI_HOST = /(^|\.)(wikipedia|wikidata|wikimedia|wikiwand|fandom)\./i;
/* second level labels under a country code that are not registrable on their own */
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu']);

export const clone = v => JSON.parse(JSON.stringify(v));
export const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
/** The hash the ledger stores for a pool: JSON of the bake's own export. */
export const bakeHash = players => sha256(JSON.stringify(players));

/** The ledger as committed: two space JSON with each source object and each short string list on one line. */
export function formatLedger(ledger) {
  return JSON.stringify(ledger, null, 2)
    .replace(/\{\n\s+"url": [^}]*?\n\s+\}/g, m => m.replace(/\s*\n\s*/g, ' '))
    .replace(/\[\n\s+("[^"\n]*",?\n\s+)*"[^"\n]*"\n\s+\]/g, m => m.replace(/\s*\n\s*/g, ' ').replace('[ ', '[').replace(' ]', ']')) + '\n';
}

/** The registrable host of a URL (www and other subdomains folded): us.soccerway.com and soccerway.com are one host. */
export function registrableHost(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
  const labels = host.split('.');
  if (labels.length <= 2) return host;
  const tld = labels[labels.length - 1], second = labels[labels.length - 2];
  const keep = tld.length === 2 && SECOND_LEVEL.has(second) ? 3 : 2;
  return labels.slice(-keep).join('.');
}

/** The distinct non-wiki hosts that carry a field, over a row's sources. */
export function hostsFor(sources, field) {
  const hosts = new Set();
  for (const s of sources ?? []) {
    if (!Array.isArray(s.fields) || !s.fields.includes(field)) continue;
    const h = registrableHost(s.url);
    if (h && !WIKI_HOST.test(`.${h}`) && !WIKI_HOST.test(String(s.url))) hosts.add(h);
  }
  return hosts;
}

const NUMERIC_FIELDS = ['goals', 'appearances', 'assists'];
const LABELLED = { goals: /(\d+) goals?\b/g, assists: /(\d+) assists?\b/g, appearances: /(\d+) (?:apps|games?|appearances)\b/g };
const NONE = { goals: /\bno goals?\b/, assists: /\bno assists?\b/, appearances: /\bno (?:apps|games?|appearances)\b/ };

/**
 * The total a source's own recorded reading (`reads`) gives for a numeric
 * field, or null when the reading states no total for it. A labelled total
 * outside brackets wins ("42 games 27 goals", the last one when the reading
 * lists competitions first: per competition splits sit before the colon or in
 * brackets); "no goal" reads 0; an appearances page reads "Name: 35 (...)";
 * a source carrying one numeric field may read as a bare leading number, or
 * "absent from the list" (0). Anything else is not a reading of that field.
 */
export function readingOf(source, field) {
  if (!NUMERIC_FIELDS.includes(field)) return null;
  const text = String(source?.reads ?? '').trim();
  const flat = text.replace(/\([^()]*\)/g, ' ');
  const labelled = [...flat.matchAll(LABELLED[field])];
  if (labelled.length) return Number(labelled[labelled.length - 1][1]);
  if (NONE[field].test(flat)) return 0;
  if (field === 'appearances') { const m = /^[^:\d]+:\s*(\d+)\b/.exec(text); if (m) return Number(m[1]); }
  const numeric = (source?.fields ?? []).filter(f => NUMERIC_FIELDS.includes(f));
  if (numeric.length === 1 && numeric[0] === field) {
    const m = /^(\d+)\b/.exec(text);
    if (m) return Number(m[1]);
    if (/^absent from\b/.test(text)) return 0;
  }
  return null;
}

/**
 * What the sources' own readings say about one value: every source that
 * carries the field and states a total must state this one, and at least one
 * must state it. Returns the problems, empty when the value is what was read.
 */
export function readingProblems(sources, field, value) {
  const read = (sources ?? []).filter(s => Array.isArray(s.fields) && s.fields.includes(field))
    .map(s => ({ url: s.url, n: readingOf(s, field) })).filter(r => r.n !== null);
  if (!read.length) return [`no source's recorded reading states the ${field} total`];
  return read.filter(r => r.n !== value).map(r => `${field} ${value}, but ${r.url} reads ${r.n}`);
}

/** The season a club's existing rows are written in: 'split', 'calendar', 'mixed' or 'none'. */
export function clubStyle(players, club) {
  let split = 0, calendar = 0;
  for (const p of players) for (const s of p.career) {
    if (s.club !== club) continue;
    if (SPLIT_SEASON.test(s.season)) split += 1;
    else if (CALENDAR_SEASON.test(s.season)) calendar += 1;
  }
  if (split && calendar) return 'mixed';
  return split ? 'split' : calendar ? 'calendar' : 'none';
}

/* ------------------------------------------------------------------ */
/* Apply and undo                                                      */
/* ------------------------------------------------------------------ */

/** The season row a ledger entry writes. */
export const rowOf = r => ({ season: r.season, club: r.club, goals: r.goals, assists: r.assists, appearances: r.appearances, marketValue: r.marketValue });

/**
 * Wave 2 (Round 1017): an inserted row is a spell of an earlier season the
 * pool never carried (a mid-season move, or the 2025 Club World Cup at a new
 * club), placed directly `before` or `after` one existing row, its anchor,
 * named by season and club as that row reads once the changed entries are
 * applied (Rashford's Aston Villa spell goes after the row relabelled
 * Manchester United). The anchor must be exactly one row of his career.
 */
export function anchorOf(r) {
  const a = r.before ?? r.after;
  if (!a || (r.before && r.after)) throw new Error(`inserted ${r.player} ${r.season} ${r.club}: name exactly one of before and after`);
  return { ...a, side: r.before ? 'before' : 'after' };
}

function anchorIndex(career, r) {
  const a = anchorOf(r);
  const at = career.flatMap((s, i) => (s.season === a.season && s.club === a.club ? [i] : []));
  if (at.length !== 1) throw new Error(`inserted ${r.player} ${r.season} ${r.club}: ${at.length} rows read ${a.season} ${a.club}, the anchor must be exactly one`);
  return at[0];
}

/**
 * The pool after the ledger, from the pool before it. Throws on anything the
 * ledger expects and the pool does not carry (a missing man, an old value that
 * differs, a row that already exists), so a stale ledger cannot apply quietly.
 * Order: changed (every entry names its row as it read BEFORE the ledger, so
 * a club change and the stats changes of the same row all find it), then
 * inserted (in ledger order), then added (appended); removed men go last.
 */
export function applyLedger(before, ledger) {
  const players = clone(before);
  const byName = new Map(players.map(p => [p.name, p]));
  const removed = new Set();
  for (const r of ledger.removed ?? []) {
    if (!byName.has(r.player)) throw new Error(`removed ${r.player} is not in the pool`);
    if (!byName.has(r.keptAs)) throw new Error(`removed ${r.player} is kept as ${r.keptAs}, who is not in the pool`);
    removed.add(r.player);
  }
  const targets = (ledger.changed ?? []).map(c => {
    const row = byName.get(c.player)?.career.find(s => s.season === c.season && s.club === c.club);
    if (!row) throw new Error(`changed ${c.player} ${c.season} ${c.club}: no such row`);
    return [c, row];
  });
  for (const [c, row] of targets) {
    if (row[c.field] !== c.from) throw new Error(`changed ${c.player} ${c.season} ${c.club}: ${c.field} reads ${row[c.field]}, the ledger expects ${c.from}`);
    row[c.field] = c.to;
  }
  for (const r of ledger.inserted ?? []) {
    const p = byName.get(r.player);
    if (!p) throw new Error(`inserted ${r.player} is not in the pool`);
    if (p.career.some(s => s.season === r.season && s.club === r.club)) throw new Error(`inserted ${r.player} ${r.season} ${r.club} is already there`);
    const at = anchorIndex(p.career, r);
    p.career.splice(anchorOf(r).side === 'before' ? at : at + 1, 0, rowOf(r));
  }
  for (const a of ledger.added ?? []) {
    const p = byName.get(a.player);
    if (!p) throw new Error(`added ${a.player} is not in the pool`);
    if (p.career.some(s => s.season === a.season && s.club === a.club)) throw new Error(`added ${a.player} ${a.season} ${a.club} is already there`);
    p.career.push({ season: a.season, club: a.club, goals: a.goals, assists: a.assists, appearances: a.appearances, marketValue: a.marketValue });
  }
  return players.filter(p => !removed.has(p.name));
}

/**
 * The pool before the ledger, from the pool after it: the added rows dropped
 * from the end of each career, each inserted row taken out from beside its
 * anchor, every changed field put back, and each removed
 * man re-inserted from the copy the ledger keeps of him, directly after the
 * man he was kept as (his sorted position). The caller proves the result with
 * bakeHash against ledger.preBake.sha256.
 */
export function undoLedger(after, ledger, { appendRemoved = false } = {}) {
  const players = clone(after);
  const byName = new Map(players.map(p => [p.name, p]));
  for (const a of [...(ledger.added ?? [])].reverse()) {
    const p = byName.get(a.player);
    const last = p?.career[p.career.length - 1];
    if (!last || last.season !== a.season || last.club !== a.club) throw new Error(`undo: ${a.player} does not end at the added ${a.season} ${a.club}`);
    p.career.pop();
  }
  for (const r of [...(ledger.inserted ?? [])].reverse()) {
    const career = byName.get(r.player)?.career ?? [];
    const at = career.flatMap((s, i) => (s.season === r.season && s.club === r.club ? [i] : []));
    if (at.length !== 1) throw new Error(`undo: ${r.player} carries ${at.length} rows ${r.season} ${r.club}, the inserted row must be exactly one`);
    const a = anchorOf(r), next = career[a.side === 'before' ? at[0] + 1 : at[0] - 1];
    if (!next || next.season !== a.season || next.club !== a.club) throw new Error(`undo: ${r.player} ${r.season} ${r.club} no longer sits ${a.side} ${a.season} ${a.club}`);
    career.splice(at[0], 1);
  }
  /* each changed entry names its row as it read before the ledger; after it,
     a row whose club was changed reads the new club */
  const clubAfter = new Map((ledger.changed ?? []).filter(c => c.field === 'club').map(c => [`${c.player}|${c.season}|${c.club}`, c.to]));
  const undoTargets = (ledger.changed ?? []).map(c => {
    const club = clubAfter.get(`${c.player}|${c.season}|${c.club}`) ?? c.club;
    return [c, byName.get(c.player)?.career.find(s => s.season === c.season && s.club === club)];
  });
  for (const [c, row] of undoTargets) {
    if (!row || row[c.field] !== c.to) throw new Error(`undo: ${c.player} ${c.season} ${c.club} ${c.field} is not the corrected ${c.to}`);
    row[c.field] = c.from;
  }
  for (const r of ledger.removed ?? []) {
    if (!r.copy) throw new Error(`undo: the ledger keeps no copy of ${r.player}`);
    const at = players.findIndex(p => p.name === r.keptAs);
    if (at < 0) throw new Error(`undo: ${r.keptAs} is not in the pool`);
    if (appendRemoved) players.push(clone(r.copy));
    else players.splice(at + 1, 0, clone(r.copy));
  }
  return players;
}

/* ------------------------------------------------------------------ */
/* Coverage: who still stops at the season before                      */
/* ------------------------------------------------------------------ */

/**
 * On the pool AFTER the ledger: every man whose last row is still the
 * ledger's previous season and who is neither ended nor held is unaccounted.
 * The fence holds that count to a committed baseline that only ever falls.
 */
export function coverage(after, ledger) {
  const ended = new Set((ledger.ended ?? []).map(e => e.player));
  const held = new Set((ledger.held ?? []).map(h => h.player));
  const added = new Set((ledger.added ?? []).map(a => a.player));
  const lastOf = p => p.career[p.career.length - 1]?.season;
  const stopAtPrevious = after.filter(p => lastOf(p) === ledger.previousSeason);
  const unaccounted = stopAtPrevious.filter(p => !ended.has(p.name) && !held.has(p.name)).map(p => p.name);
  const notCovered = [];
  const names = new Set(after.map(p => p.name));
  for (const name of added) {
    const p = after.find(x => x.name === name);
    if (!p || lastOf(p) !== ledger.season) notCovered.push(`${name}: added, but his last row is ${p ? lastOf(p) : '(not in the pool)'}`);
  }
  for (const name of [...ended, ...held]) if (!names.has(name)) notCovered.push(`${name}: listed as ended or held, not in the pool`);
  const olderStops = after.filter(p => {
    const m = /^(\d{4})/.exec(lastOf(p) ?? '');
    const prevStart = Number(String(ledger.previousSeason).slice(0, 4));
    return m && Number(m[1]) === prevStart - 1 && SPLIT_SEASON.test(lastOf(p));
  }).length;
  return { unaccounted, notCovered, accounted: { added: added.size, ended: ended.size, held: held.size }, olderStops };
}

/* ------------------------------------------------------------------ */
/* Career Quiz: the daily is pool[YYYYMMDD % length] on the name order */
/* ------------------------------------------------------------------ */

const dayKey = d => d.toISOString().slice(0, 10);
const seedOf = key => Number(key.replace(/-/g, ''));
const addDays = (key, n) => { const d = new Date(`${key}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return dayKey(d); };

/**
 * What a change of pool on `start` does to the Career Quiz daily
 * (src/hooks/useCareerGame.ts: playerPool[dateSeed(today) % length]):
 * changedDays, how many of the `days` days from `start` deal a different man
 * than the old pool would have; reDealt, how many of those days deal a man
 * already dealt in the `window` days before (history on the old pool before
 * `start`, the new pool from it), against the same count with no change.
 */
export function careerQuizShift(beforeNames, afterNames, start, { days = 60, window = 90 } = {}) {
  const pick = (names, key) => names[seedOf(key) % names.length];
  const count = useAfter => {
    let reDealt = 0;
    for (let i = 0; i < days; i += 1) {
      const key = addDays(start, i);
      const man = pick(useAfter ? afterNames : beforeNames, key);
      for (let back = 1; back <= window; back += 1) {
        const prev = addDays(key, -back);
        const pool = useAfter && prev >= start ? afterNames : beforeNames;
        if (pick(pool, prev) === man) { reDealt += 1; break; }
      }
    }
    return reDealt;
  };
  /* the fixed window reading: how many of the next `days` answers were already
     among the answers of the `window` days before `start` */
  const recent = new Set();
  for (let back = 1; back <= window; back += 1) recent.add(pick(beforeNames, addDays(start, -back)));
  const fixed = names => { let n = 0; for (let i = 0; i < days; i += 1) if (recent.has(pick(names, addDays(start, i)))) n += 1; return n; };
  let changedDays = 0;
  for (let i = 0; i < days; i += 1) {
    const key = addDays(start, i);
    if (pick(beforeNames, key) !== pick(afterNames, key)) changedDays += 1;
  }
  return {
    start, days, window, changedDays,
    reDealt: count(true), reDealtWithoutChange: count(false),
    reDealtFromLastWindow: fixed(afterNames), reDealtFromLastWindowWithoutChange: fixed(beforeNames),
    firstDay: { before: pick(beforeNames, start), after: pick(afterNames, start) },
  };
}

/* ------------------------------------------------------------------ */
/* The page's own modules, bundled once per run into a private folder  */
/* ------------------------------------------------------------------ */

/**
 * Bundles the bake, the rule filters and the club flags with esbuild into a
 * folder made fresh for this run (mkdtemp), so two runs at once never share a
 * file (the harness temp file race). Returns the module.
 */
export async function loadSiteModules(root, { bakeText = null } = {}) {
  const { build } = await import('esbuild');
  const src = path.join(root, 'src').replaceAll('\\', '/');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'career-season-'));
  const entry = path.join(dir, 'entry.mjs'), out = path.join(dir, 'bundle.mjs');
  /* bakeText: a bake as it stood at some commit (git show), bundled in place of the working file */
  let bake = `${src}/data/careerPlayers.ts`;
  if (bakeText !== null) { bake = path.join(dir, 'careerPlayers.ts').replaceAll('\\', '/'); fs.writeFileSync(bake, bakeText); }
  fs.writeFileSync(entry, [
    `export { careerPlayers, CAREER_FALLBACK_META } from '${bake}';`,
    `export { playersUnderRule, seasonSpan, isEuropeanClub } from '${src}/lib/transferPathModes.ts';`,
    `export { flagForClub } from '${src}/lib/careerLadder.ts';`,
    `export { flagEmojiToIso } from '${src}/lib/flagUtils.ts';`,
  ].join('\n'));
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(root, 'src') } });
  try { return await import(pathToFileURL(out).href); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/* ------------------------------------------------------------------ */
/* Reading a season migration's Transfer Path rows back                */
/* ------------------------------------------------------------------ */

const RENAME_ROW = /^\s*\('((?:[^']|'')*)', '((?:[^']|'')*)', '((?:[^']|'')*)', '((?:[^']|'')*)', '((?:[^']|'')*)'\),?$/gm;
const REWRITE_ROW = /^\s*\('((?:[^']|'')*)', '((?:[^']|'')*)', '((?:[^']|'')*)', '(classic|europe|active)', (\d+|null::smallint), ('(?:[^']|'')*'|null::text), (\d+|null::smallint), ('(?:[^']|'')*'|null::text)\),?$/gm;

/**
 * The renames and rule entry rewrites a season migration carries, read from
 * its own VALUES lists: { renames: [{ id, oldA, oldB, a, b }], rewrites:
 * [{ id, a, b, rule, old, next }] } with old and next { minSteps, hint } or
 * null. CRLF is folded and comments are dropped first.
 */
export function parseSeasonMigrationPuzzles(sql) {
  const code = String(sql).replaceAll('\r\n', '\n').replace(/^\s*--.*$/gm, '');
  const un = s => s.replace(/''/g, "'");
  const block = (marker) => {
    const end = code.indexOf(marker);
    if (end < 0) return '';
    const start = code.lastIndexOf('for desired in', end);
    return start < 0 ? '' : code.slice(start, end);
  };
  const renames = [...block(') as rows(puzzle_id, old_player_a, old_player_b, player_a, player_b)').matchAll(RENAME_ROW)]
    .map(m => ({ id: un(m[1]), oldA: un(m[2]), oldB: un(m[3]), a: un(m[4]), b: un(m[5]) }));
  const entry = (min, hint) => (min === 'null::smallint' ? null : { minSteps: Number(min), hint: un(hint.slice(1, -1)) });
  const rewrites = [...block(') as rows(puzzle_id, player_a, player_b, rule, old_min_steps, old_hint, min_steps, hint)').matchAll(REWRITE_ROW)]
    .map(m => ({ id: un(m[1]), a: un(m[2]), b: un(m[3]), rule: m[4], old: entry(m[5], m[6]), next: entry(m[7], m[8]) }));
  return { renames, rewrites };
}

const sameEntry = (x, y) => (x === null && y === null) || (!!x && !!y && x.minSteps === y.minSteps && x.hint === y.hint);

/**
 * Which side of a season migration's Transfer Path writes a table is on.
 * liveById: puzzle id -> { playerA, playerB, classic, europe, active } with
 * each rule { minSteps, hint } or null. 'before' when every renamed puzzle
 * still has its old names and every rewritten entry its old value, 'after'
 * when every one has the new, 'mixed' otherwise.
 */
export function seasonMigrationState(parsed, liveById) {
  let before = 0, after = 0, total = 0;
  for (const r of parsed.renames) {
    total += 1;
    const p = liveById.get(r.id);
    if (p && p.playerA === r.oldA && p.playerB === r.oldB) before += 1;
    else if (p && p.playerA === r.a && p.playerB === r.b) after += 1;
  }
  for (const r of parsed.rewrites) {
    total += 1;
    const live = liveById.get(r.id)?.[r.rule] ?? null;
    if (!liveById.has(r.id)) continue;
    if (sameEntry(live, r.old)) before += 1;
    else if (sameEntry(live, r.next)) after += 1;
  }
  if (total && before === total) return 'before';
  if (total && after === total) return 'after';
  return 'mixed';
}
