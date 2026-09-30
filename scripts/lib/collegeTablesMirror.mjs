/* Round 706. The five college table migrations, mirrored in code over a pull of
   the live rows, so scripts/simCollegeTables.mjs can hold each migration's
   constants against the table before it lands and hold its end state after.

   Every function here is pure: rows in, a report out, nothing fetched and
   nothing written. The constants each migration guards are NOT typed here;
   readMigrationConstants parses them out of the SQL file, so the harness and
   the migration cannot drift apart without one of them going red.

   nfl_draft_picks (20260930120000). Step 1 deletes exact copies (lower id
   stays). Step 2 deletes placeholder rows (a forfeit sentence, or no position
   and no college; scripts/lib/draftRounds.mjs isPlaceholderDraftRow is the same
   rule). Step 2b deletes the 13 invented 1977 rows by (id, player_name), the
   list parsed from the SQL. Step 3 derives the round of every row filed round 1
   past its year's first round from the parsed blocks around it, exactly as the
   SQL does (GAP and TAIL branches, integer division), and leaves the rest NULL.

   ncaa_player_stats (20260930120100). Twin slugs identical in every column but
   id and created_at lose every row but the lowest id; '_' names are deleted.
   cfb_qb_stats and cfb_rb_stats (20260930120200, 20260930120300): the '_'
   names at the rk listed in the SQL are deleted.
   cbb_programs (20260930120400): the game's own dedupePrograms decides the
   hidden rows; the SQL's UPDATE arrays and DELETE ids are parsed here so the
   harness can require them to be exactly what the code does. */

import { isPlaceholderDraftRow } from './draftRounds.mjs';
import { isPlaceholderName } from './placeholderName.mjs';

const lf = s => String(s).replace(/\r\n/g, '\n');

/** Every `name constant integer := N` in a migration's declare block. */
export function readMigrationConstants(sql) {
  const out = {};
  for (const m of lf(sql).matchAll(/^\s*(\w+)\s+constant\s+integer\s*:=\s*(\d+)\s*;/gm)) out[m[1]] = Number(m[2]);
  return out;
}

/* ------------------------------------------------------------------ */
/* nfl_draft_picks                                                     */
/* ------------------------------------------------------------------ */

const COPY_COLUMNS = ['year', 'round', 'pick', 'player_name', 'position', 'team', 'college'];
const copyKey = r => JSON.stringify(COPY_COLUMNS.map(c => (r[c] === undefined ? null : r[c])));

/** Rows that have a lower id twin equal in every column but id. */
export function exactCopies(rows) {
  const lowest = new Map();
  for (const r of rows) {
    const k = copyKey(r);
    const cur = lowest.get(k);
    if (cur === undefined || r.id < cur) lowest.set(k, r.id);
  }
  return rows.filter(r => lowest.get(copyKey(r)) !== r.id);
}

/** The (id, player_name) pairs step 2b deletes, parsed from the SQL's IN list. */
export function readInventedRows(sql) {
  const block = lf(sql).match(/\(id,\s*player_name\)\s+in\s*\(([\s\S]*?)\)\s*;/i);
  if (!block) return [];
  return [...block[1].matchAll(/\(\s*(\d+)\s*,\s*'((?:[^']|'')*)'\s*\)/g)].map(m => ({ id: Number(m[1]), player_name: m[2].replace(/''/g, "'") }));
}

/** The migration's step 3 over the rows it would see (after the deletes). */
export function deriveRounds(rows) {
  const byYear = new Map();
  for (const r of rows) {
    if (!byYear.has(r.year)) byYear.set(r.year, []);
    byYear.get(r.year).push(r);
  }
  const newRound = new Map(); // id -> derived round or null, for every unparsed row
  for (const [year, list] of byYear) {
    const blocks = new Map();
    for (const r of list) {
      if (!(r.round >= 2)) continue;
      if (!blocks.has(r.round)) blocks.set(r.round, { round: r.round, lo: r.pick, hi: r.pick, picks: new Set(), c: 0 });
      const b = blocks.get(r.round);
      b.lo = Math.min(b.lo, r.pick); b.hi = Math.max(b.hi, r.pick); b.picks.add(r.pick); b.c += 1;
    }
    const bl = [...blocks.values()].map(b => ({ ...b, n: b.picks.size })).sort((a, b) => a.round - b.round);
    const two = bl.find(b => b.round === 2);
    if (!two) continue;
    const r1End = two.lo - 1;
    const bad = bl.some(b => b.n !== b.hi - b.lo + 1 || b.c !== b.n)
      || bl.some(b1 => bl.some(b2 => b1.round < b2.round && b1.hi >= b2.lo));
    const maxPick = Math.max(...list.map(r => r.pick));
    const unparsed = list.filter(r => r.round === 1 && r.pick > r1End);
    const placed = unparsed.map(u => {
      const a = bl.filter(b => b.hi < u.pick).sort((x, y) => y.hi - x.hi)[0] ?? null;
      const b = bl.filter(x => x.lo > u.pick).sort((x, y) => x.lo - y.lo)[0] ?? null;
      const pa = a ? (bl.filter(x => x.round < a.round).sort((x, y) => y.round - x.round)[0] ?? null) : null;
      return { u, a, b, pa };
    });
    const segments = new Map();
    for (const p of placed) {
      const k = p.a ? p.a.round : 'null';
      if (!segments.has(k)) segments.set(k, { rows: 0, picks: new Set() });
      segments.get(k).rows += 1; segments.get(k).picks.add(p.u.pick);
    }
    for (const { u, a, b, pa } of placed) {
      let round = null;
      if (!bad && a) {
        const s = segments.get(a.round);
        const rowsIn = s.rows, picksIn = s.picks.size;
        const formula = () => a.round + 1 + Math.floor((u.pick - a.hi - 1) / a.n);
        if (b && a.n === b.n && b.round - a.round - 1 >= 1
          && b.lo - 1 - a.hi === (b.round - a.round - 1) * a.n
          && rowsIn === b.lo - 1 - a.hi && picksIn === rowsIn) round = formula();
        else if (!b && pa && pa.n === a.n && maxPick - a.hi >= a.n
          && (maxPick - a.hi) % a.n === 0
          && rowsIn === maxPick - a.hi && picksIn === rowsIn) round = formula();
      }
      newRound.set(u.id, round);
    }
  }
  return newRound;
}

/** Rows filed round 1 at a pick past their year's parsed round one. */
export function roundOnePastBoundary(rows) {
  const r1End = new Map();
  for (const r of rows) if (r.round === 2) r1End.set(r.year, Math.min(r1End.get(r.year) ?? Infinity, r.pick - 1));
  return rows.filter(r => r.round === 1 && r1End.has(r.year) && r.pick > r1End.get(r.year));
}

/** The whole nfl_draft_picks migration over a pull: counts, and the rows it leaves. */
export function mirrorNflDraftPicks(rows, invented) {
  const copies = exactCopies(rows);
  const copyIds = new Set(copies.map(r => r.id));
  let left = rows.filter(r => !copyIds.has(r.id));
  const placeholders = left.filter(isPlaceholderDraftRow);
  const placeholderIds = new Set(placeholders.map(r => r.id));
  left = left.filter(r => !placeholderIds.has(r.id));
  const inventedHit = left.filter(r => invented.some(x => x.id === r.id && x.player_name === r.player_name));
  const inventedIds = new Set(inventedHit.map(r => r.id));
  left = left.filter(r => !inventedIds.has(r.id));
  const derived = deriveRounds(left);
  let nDerived = 0, nUnknown = 0;
  const result = left.map(r => {
    if (!derived.has(r.id)) return r;
    const nr = derived.get(r.id);
    if (nr === null) nUnknown += 1; else nDerived += 1;
    return { ...r, round: nr };
  });
  return { copies: copies.length, placeholders: placeholders.length, invented: inventedHit.length, derived: nDerived, unknown: nUnknown, result };
}

/* ------------------------------------------------------------------ */
/* ncaa_player_stats, cfb_qb_stats, cfb_rb_stats                        */
/* ------------------------------------------------------------------ */

/** The columns the SQL compares before it trusts a twin: everything but id and created_at. */
export const NCAA_TWIN_COLUMNS = ['rk', 'player_name', 'points', 'year_from', 'year_to', 'games', 'games_started', 'minutes',
  'fg', 'fga', 'two_p', 'two_pa', 'three_p', 'three_pa', 'ft', 'fta', 'orb', 'drb', 'trb', 'ast', 'stl', 'blk', 'tov', 'pf',
  'fg_pct', 'two_pct', 'three_pct', 'ft_pct', 'ts_pct', 'efg_pct', 'position', 'schools'];

export function mirrorNcaaPlayerStats(rows) {
  const bySlug = new Map();
  for (const r of rows) {
    if (!bySlug.has(r.player_slug)) bySlug.set(r.player_slug, []);
    bySlug.get(r.player_slug).push(r);
  }
  const noSlug = rows.filter(r => r.player_slug === null || r.player_slug === undefined).length;
  let differing = 0;
  const twinIds = new Set();
  for (const list of bySlug.values()) {
    if (list.length < 2) continue;
    const shapes = new Set(list.map(r => JSON.stringify(NCAA_TWIN_COLUMNS.map(c => r[c] ?? null))));
    if (shapes.size > 1) differing += 1;
    const keep = Math.min(...list.map(r => r.id));
    for (const r of list) if (r.id !== keep) twinIds.add(r.id);
  }
  let left = rows.filter(r => !twinIds.has(r.id));
  const placeholders = left.filter(r => isPlaceholderName(r.player_name));
  const pIds = new Set(placeholders.map(r => r.id));
  left = left.filter(r => !pIds.has(r.id));
  return { noSlug, differing, twins: twinIds.size, placeholders: placeholders.length, result: left };
}

/** The rk list a cfb migration deletes, parsed from its `rk in (...)`. */
export function readRkList(sql) {
  const m = lf(sql).match(/rk\s+in\s*\(([\d\s,]+)\)/i);
  return m ? m[1].split(',').map(s => Number(s.trim())).filter(Number.isInteger) : [];
}

export function mirrorCfbStats(rows, rkList) {
  const placeholders = rows.filter(r => isPlaceholderName(r.player_name));
  const listed = placeholders.filter(r => rkList.includes(r.rk));
  const unlisted = placeholders.filter(r => !rkList.includes(r.rk));
  const listedRk = new Set(listed.map(r => r.rk));
  return { placeholders: placeholders.length, listed: listed.length, unlisted, result: rows.filter(r => !listedRk.has(r.rk)) };
}

/* ------------------------------------------------------------------ */
/* cbb_programs                                                        */
/* ------------------------------------------------------------------ */

const sqlArray = text => [...text.matchAll(/'((?:[^']|'')*)'/g)].map(m => m[1].replace(/''/g, "'"));

/** Every `update ... set common_names = array[...] where id = '...'` and every `delete ... where id = '...'` in the cbb migration. */
export function readCbbMigration(sql) {
  const s = lf(sql);
  const updates = new Map();
  for (const m of s.matchAll(/update\s+public\.cbb_programs\s+set\s+common_names\s*=\s*array\[([^\]]*)\]\s+where\s+id\s*=\s*'([0-9a-f-]{36})'/gi)) updates.set(m[2], sqlArray(m[1]));
  const deletes = [...s.matchAll(/delete\s+from\s+public\.cbb_programs\s+where\s+id\s*=\s*'([0-9a-f-]{36})'/gi)].map(m => m[1]);
  return { updates, deletes };
}
