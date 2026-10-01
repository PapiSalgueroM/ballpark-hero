/* Round 706. Readers for the five college table migrations, so that
   scripts/simCollegeTables.mjs holds the code against the SQL files themselves
   and never against a number somebody retyped.

   Every function here is pure: SQL text in, a report out. Nothing is fetched
   and nothing is written. The constants each migration guards, the invented
   1977 rows, the rk lists and the cbb_programs arrays are all parsed out of the
   migration's CODE (its comments stripped first), so the harness and the
   migration cannot drift apart without one of them going red, and a check can
   never be satisfied by the prose explaining it.

   The one reader that looks at prose on purpose is readNflBreakdown: the nfl
   migration states its per year round counts in its header, and the harness
   requires those to add up to the constants the code declares, so the header
   cannot go on describing a derivation the block no longer does. */

export const lf = s => String(s).replace(/\r\n/g, '\n');

/** The SQL with every `--` comment removed, quotes respected. */
export function sqlCode(sql) {
  return lf(sql).split('\n').map(line => {
    let inQuote = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === "'") inQuote = !inQuote;
      else if (!inQuote && ch === '-' && line[i + 1] === '-') return line.slice(0, i);
    }
    return line;
  }).join('\n');
}

/** The SQL's comment text alone (the header prose), for the one reader that wants it. */
export function sqlProse(sql) {
  return lf(sql).split('\n').filter(l => /^\s*--/.test(l)).map(l => l.replace(/^\s*--\s?/, '')).join('\n');
}

/** A SQL string literal decoded: 'it''s' and U&'Loyola\2013Chicago' both come back as text. */
export function decodeSqlString(literal) {
  const s = literal.trim();
  const m = s.match(/^(U&)?'([\s\S]*)'$/i);
  if (!m) return null;
  let body = m[2].replace(/''/g, "'");
  if (m[1]) body = body.replace(/\\\+([0-9A-Fa-f]{6})|\\([0-9A-Fa-f]{4})/g, (_, six, four) => String.fromCodePoint(parseInt(six ?? four, 16)));
  return body;
}

const STRING = "(?:U&)?'(?:[^']|'')*'";

/** Every `name constant <type> := value;` in the declare block, in order, duplicates included. */
export function readConstantDeclarations(sql) {
  const out = [];
  for (const m of sqlCode(sql).matchAll(new RegExp(`^\\s*(\\w+)\\s+constant\\s+(\\w+)\\s*:=\\s*(\\d+|${STRING})\\s*;`, 'gm'))) {
    out.push({ name: m[1], type: m[2].toLowerCase(), value: /^\d+$/.test(m[3]) ? Number(m[3]) : decodeSqlString(m[3]) });
  }
  return out;
}

/** Every integer constant as { name: value }. */
export function readMigrationConstants(sql) {
  const out = {};
  for (const d of readConstantDeclarations(sql)) if (d.type === 'integer') out[d.name] = d.value;
  return out;
}

/** How many `do $migration$` blocks the file opens and closes. */
export function readDoBlocks(sql) {
  const code = sqlCode(sql);
  return {
    opens: (code.match(/\bdo\s+\$migration\$/gi) ?? []).length,
    closes: (code.match(/\$migration\$\s*;/g) ?? []).length,
  };
}

/** How many times a constant's name appears in the code (its declaration counts once). */
export function countUses(sql, name) {
  return (sqlCode(sql).match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
}

/* ------------------------------------------------------------------ */
/* nfl_draft_picks                                                     */
/* ------------------------------------------------------------------ */

/** The (id, player_name) pairs step 2b deletes, parsed from the SQL's IN list. */
export function readInventedRows(sql) {
  const block = sqlCode(sql).match(/\(id,\s*player_name\)\s+in\s*\(([\s\S]*?)\)\s*;/i);
  if (!block) return [];
  return [...block[1].matchAll(/\(\s*(\d+)\s*,\s*'((?:[^']|'')*)'\s*\)/g)].map(m => ({ id: Number(m[1]), player_name: m[2].replace(/''/g, "'") }));
}

/** The header's measured counts: rows filed round 1 past their boundary, and the per year derived and unknown lists. */
export function readNflBreakdown(sql) {
  const prose = sqlProse(sql).replace(/\s+/g, ' ');
  const n = s => Number(String(s).replace(/,/g, ''));
  const years = text => [...text.matchAll(/(\d{4})\s+(\d+)/g)].map(m => ({ year: Number(m[1]), count: Number(m[2]) }));
  const past = prose.match(/Measured:\s*([\d,]+)\s+such rows in (\d+) drafts/);
  const lists = prose.match(/Measured:\s*([\d,]+)\s+derived\s*\(([^)]*)\)\s+and\s+([\d,]+)\s+set NULL\s*\(([^)]*)\)/);
  if (!past || !lists) return null;
  return {
    pastBoundary: n(past[1]), drafts: Number(past[2]),
    derived: n(lists[1]), derivedByYear: years(lists[2]),
    unknown: n(lists[3]), unknownByYear: years(lists[4]),
  };
}

/** The sample rows the nfl block reads back after step 3: [year, pick, round] for every `(pick = N and round = R)`. */
export function readNflReadBacks(sql) {
  const out = [];
  for (const m of sqlCode(sql).matchAll(/where year = (\d{4}) and ([^;]*?round[^;]*?);/g)) {
    const year = Number(m[1]);
    const one = m[2].match(/pick = (\d+) and player_name = '(?:[^']|'')*' and round = (\d+)/);
    if (one) out.push([year, Number(one[1]), Number(one[2])]);
    for (const p of m[2].matchAll(/\(pick = (\d+) and round = (\d+)\)/g)) out.push([year, Number(p[1]), Number(p[2])]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* cfb_qb_stats, cfb_rb_stats                                           */
/* ------------------------------------------------------------------ */

/** The rk list a cfb migration deletes, parsed from its `rk in (...)`. */
export function readRkList(sql) {
  const m = sqlCode(sql).match(/rk\s+in\s*\(([\d\s,]+)\)/i);
  return m ? m[1].split(',').map(s => Number(s.trim())).filter(Number.isInteger) : [];
}

/* ------------------------------------------------------------------ */
/* cbb_programs                                                        */
/* ------------------------------------------------------------------ */

const sqlArray = text => [...text.matchAll(new RegExp(STRING, 'g'))].map(m => decodeSqlString(m[0]));

/** The pairs the block allows, the UPDATEs (with the values their WHERE demands) and the DELETEs. */
export function readCbbMigration(sql) {
  const code = sqlCode(sql);
  const texts = Object.fromEntries(readConstantDeclarations(sql).filter(d => d.type === 'text').map(d => [d.name, d.value]));
  const value = tok => (tok === undefined ? undefined : /^(U&)?'/i.test(tok) ? decodeSqlString(tok) : texts[tok]);
  const whereOf = part => ({
    id: part.match(/\bid\s*=\s*'([0-9a-f-]{36})'/i)?.[1],
    school_name: value(part.match(new RegExp(`\\bschool_name\\s*=\\s*(${STRING}|\\w+)`))?.[1]),
    championships_hint: value(part.match(new RegExp(`\\bchampionships_hint\\s*=\\s*(${STRING})`))?.[1]),
    common_names: (m => (m ? sqlArray(m[1]) : undefined))(part.match(/\bcommon_names\s*=\s*array\[([^\]]*)\]/i)),
  });
  const updates = new Map();
  const deletes = new Map();
  for (const stmt of code.split(';')) {
    const s = stmt.trim();
    let m = s.match(/^update\s+public\.cbb_programs\s+set\s+common_names\s*=\s*array\[([^\]]*)\]\s+where\s+([\s\S]*)$/i);
    if (m) { const where = whereOf(m[2]); updates.set(where.id, { after: sqlArray(m[1]), where }); continue; }
    m = s.match(/^delete\s+from\s+public\.cbb_programs\s+where\s+([\s\S]*)$/i);
    if (m) { const where = whereOf(m[1]); deletes.set(where.id, { where }); }
  }
  const pairBlock = code.match(/not in\s*\(([\s\S]*?)\)\s*;/i);
  const pairs = pairBlock ? [...pairBlock[1].matchAll(/\(\s*'([0-9a-f-]{36})'\s*,\s*'([0-9a-f-]{36})'\s*\)/g)].map(m => [m[1], m[2]]) : [];
  return { pairs, updates, deletes, texts };
}
