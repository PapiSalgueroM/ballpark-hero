// Round 1587: writes the two SQL files that move the Arsenal de Sarandí men out of "Arsenal FC", from the ledger and
// the lead's exports only (no network, no database):
//   supabase/migrations/20261101120000_round_1587_arsenal_de_sarandi.sql   the RECORD (never raises on drift: it counts
//       rewritten, already current, drifted and missing rows and says so in a NOTICE; a bad checksum still raises)
//   scripts/qa/clubNamesakes1587Applied.sql                                the form the lead runs ONCE (all or nothing:
//       raises, applying nothing, unless every payload row of both tables still matches its read or is already current)
// Run: node scripts/qa/genClubNamesakes1587.mjs [--market <Q2.json>] [--stints <Q3.json>] [--check]
//   --check exits 1 when either committed file differs from what this run would write (the apply's "has the table
//   moved since the export" step: at the apply the lead passes FRESH exports and expects no difference). The header
//   names the COMMITTED exports whatever --market and --stints say, so a fresh file saved under a dated name compares
//   by content only (review 1587 major 1); --market or --stints without --check is refused, so the committed files are
//   only ever written from the committed exports.
// THE MARKET PAYLOAD is every Q2 row of every sarandi man of arsenalLedger.json; its new club is its old club with every
//   " / " part equal to "Arsenal FC" replaced by 'Arsenal de Sarandí'.
// THE STINTS PAYLOAD (critic 1584 correction 2: the stints table has no age and keys careers by player_name plus
//   nationality): a Q3 stint moves iff its club (or one " / " part) is "Arsenal FC", at least one Q2 row with the same
//   player_name and nationality has a year inside [first_year, last_year], and every such Q2 row is a sarandi row of ONE
//   ledger man. A stint that also covers a london row, a row nobody judged, or rows of two men is HELD and named; a
//   stint whose name and nationality are a sarandi man's but whose span covers none of his rows is HELD too.
// Each row is updated only while the Postgres recipe of its own columns equals the export's h (scripts/lib/
// arsenalGuard1587.mjs has the recipes); "already current" is a row that holds the new club and whose recipe, with the
// old club put back, still equals h. The payload is ONE line of JSON in a dollar quoted string with its md5 checked
// first, so a CRLF checkout cannot change it.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SQL_MARKET_HASH, SQL_STINT_HASH, marketHash, stintHash } from '../lib/arsenalGuard1587.mjs';
import { NAMESAKE, MARKET_FILE } from './genArsenalLedger1587.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = path.join(ROOT, 'scripts', 'data', 'clubNamesakes1584');
export const MIGRATION = 'supabase/migrations/20261101120000_round_1587_arsenal_de_sarandi.sql';
export const APPLIED = 'scripts/qa/clubNamesakes1587Applied.sql';
export const STINTS_FILE = 'arsenalStints-2026-10-29.json';
export const SOURCE = `${MARKET_FILE} and ${STINTS_FILE}`;
export const STORED = 'Arsenal FC';
// the stored name lives in ONE place, the ledger generator (review 1587 minor 2)
export { NAMESAKE };
export const rewriteClub = (club) => String(club).split(' / ').map((p) => (p === STORED ? NAMESAKE : p)).join(' / ');
const hasStoredPart = (club) => String(club).split(' / ').includes(STORED);

export function computePayload(ledger, market, stints) {
  const byId = new Map(market.map((r) => [r.id, r]));
  const manOf = new Map();
  for (const m of ledger.men) for (const id of m.rows) manOf.set(id, m);
  const sarMen = ledger.men.filter((m) => m.verdict === 'sarandi');
  const marketRows = [];
  for (const m of sarMen) for (const id of m.rows) {
    const r = byId.get(id);
    if (!r) throw new Error(`ledger row ${id} (${m.name}) is not in the market export`);
    if (!hasStoredPart(r.club)) throw new Error(`ledger row ${id} (${m.name}) does not read ${STORED}`);
    marketRows.push({ id: r.id, h: r.h, old: r.club, new: rewriteClub(r.club) });
  }
  marketRows.sort((a, b) => a.id - b.id);
  const sarKeys = new Set(sarMen.flatMap((m) => m.rows.map((id) => `${byId.get(id).player_name}|${byId.get(id).nationality}`)));
  const stintRows = [], held = [];
  for (const s of stints.slice().sort((a, b) => a.id - b.id)) {
    if (!hasStoredPart(s.club)) continue;
    const covered = market.filter((r) => r.player_name === s.player_name && r.nationality === s.nationality && r.year >= s.first_year && r.year <= s.last_year);
    const key = `${s.player_name}|${s.nationality}`;
    if (!covered.length) { if (sarKeys.has(key)) held.push({ id: s.id, name: s.player_name, span: [s.first_year, s.last_year], why: 'a sarandi man\'s name and nationality, but no Q2 row of his inside the span' }); continue; }
    const men = new Set(covered.map((r) => manOf.get(r.id)));
    const verdicts = [...men].map((m) => (m ? m.verdict : 'unjudged'));
    if (verdicts.every((v) => v === 'sarandi') && men.size === 1) { stintRows.push({ id: s.id, h: s.h, old: s.club, new: rewriteClub(s.club) }); continue; }
    if (verdicts.includes('sarandi')) held.push({ id: s.id, name: s.player_name, span: [s.first_year, s.last_year], why: `covers ${covered.length} Q2 rows: ${[...men].map((m) => (m ? `${m.name} (${m.verdict})` : 'unjudged')).join(', ')}` });
  }
  return { market: marketRows, stints: stintRows, held };
}

// The guard columns the recipe reads are exactly what the export carries, so the export's h must be the recipe of the
// row; a payload whose h is not its row's recipe is refused before anything is written.
export function checkHashes(market, stints) {
  const bad = market.filter((r) => marketHash(r) !== r.h).map((r) => `market ${r.id}`)
    .concat(stints.filter((r) => stintHash(r) !== r.h).map((r) => `stint ${r.id}`));
  return bad;
}

// One DO block over both tables. strict = the applied form (raise unless everything matches); otherwise the record.
export function writeSql(payload, { strict, source }) {
  const json = JSON.stringify({ market: payload.market, stints: payload.stints });
  if (/[\r\n]/.test(json) || json.includes('$r1587$')) throw new Error('the payload cannot be one dollar quoted line');
  const sum = createHash('md5').update(json, 'utf8').digest('hex');
  const N = payload.market.length, M = payload.stints.length;
  const mNow = SQL_MARKET_HASH('t', 't.club'), mOld = SQL_MARKET_HASH('t', 'p.old_club');
  const sNow = SQL_STINT_HASH('t', 't.club'), sOld = SQL_STINT_HASH('t', 'p.old_club');
  const parts = (key) => `select (x->>'id')::bigint as id, x->>'h' as h, x->>'old' as old_club, x->>'new' as new_club from jsonb_array_elements(payload::jsonb -> '${key}') x`;
  const count = (key, table, now, old, pre) => [
    `  with p as (${parts(key)}),`,
    `  c as (select p.*, t.id as tid, t.club as tclub, ${now} as h_now, ${old} as h_old from p left join ${table} t on t.id = p.id)`,
    `  select count(*) filter (where tid is null), count(*) filter (where tid is not null and h_now = h),`,
    `         count(*) filter (where tid is not null and h_now <> h and tclub = new_club and h_old = h)`,
    `    into ${pre}_missing, ${pre}_match, ${pre}_already from c;`,
    `  ${pre}_drift := ${pre}_want - ${pre}_missing - ${pre}_match - ${pre}_already;`,
  ];
  const update = (key, table, now, pre) => [
    `  with p as (${parts(key)})`,
    `  update ${table} t set club = p.new_club from p where t.id = p.id and ${now} = p.h;`,
    `  get diagnostics ${pre}_done = row_count;`,
  ];
  const head = strict
    ? ['-- Round 1587: the APPLIED FORM. Run ONCE with execute_sql, on a clear day (scripts/qa/namesakeDealtDay1587.mjs),',
      '-- after a fresh Q2 and Q3 regenerate this file unchanged (genClubNamesakes1587.mjs --check). All or nothing:',
      `-- EXPECT the notice "Round 1587: ${N} market rows and ${M} stint rows rewritten, 0 already current, 0 drifted, 0 missing".`,
      '-- Anything else raises and writes nothing. A second run raises nothing and rewrites nothing: it counts every row as',
      '-- already current. Never rehearsed on production: PGlite only (scripts/qa/rehearseClubNamesakes1587.mjs).']
    : ['-- Round 1587: Arsenal de Sarandí\'s men out of "Arsenal FC" in player_market_values and soccer_player_club_stints.',
      '-- THE RECORD of what the lead applied with scripts/qa/clubNamesakes1587Applied.sql (the same payload). Replayed',
      '-- anywhere, it rewrites only rows that still match their read, never raises on drift, and says what it found.'];
  const lines = [
    ...head,
    `-- Generated by scripts/qa/genClubNamesakes1587.mjs from ${source} and scripts/data/clubNamesakes1584/arsenalLedger.json.`,
    `-- ${N} market rows (every row of the ledger's sarandi men), ${M} stints (critic 1584 correction 2's rule), payload md5 ${sum}.`,
    'do $r1587$',
    'declare',
    `  payload text := '${json.replace(/'/g, "''")}';`,
    `  m_want int := ${N}; s_want int := ${M};`,
    '  m_missing int; m_match int; m_already int; m_drift int; m_done int;',
    '  s_missing int; s_match int; s_already int; s_drift int; s_done int;',
    'begin',
    `  if md5(payload) <> '${sum}' then`,
    "    raise exception 'Round 1587: the payload checksum does not match, nothing written';",
    '  end if;',
    ...count('market', 'public.player_market_values', mNow, mOld, 'm'),
    ...count('stints', 'public.soccer_player_club_stints', sNow, sOld, 's'),
    ...(strict ? [
      '  if m_missing <> 0 or m_drift <> 0 or s_missing <> 0 or s_drift <> 0 then',
      "    raise exception 'Round 1587: % market and % stint rows drifted, % and % missing, nothing written', m_drift, s_drift, m_missing, s_missing;",
      '  end if;'] : []),
    ...update('market', 'public.player_market_values', mNow, 'm'),
    ...update('stints', 'public.soccer_player_club_stints', sNow, 's'),
    ...(strict ? [
      '  if m_done <> m_match or s_done <> s_match then',
      "    raise exception 'Round 1587: % of % market and % of % stint rows rewritten, a row moved under the update, nothing written', m_done, m_match, s_done, s_match;",
      '  end if;'] : []),
    "  raise notice 'Round 1587: % market rows and % stint rows rewritten, % already current, % drifted, % missing',",
    '    m_done, s_done, m_already + s_already, m_drift + s_drift, m_missing + s_missing;',
    'end $r1587$;',
    '',
  ];
  return { sql: lines.join('\n'), md5: sum, N, M };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const fresh = process.argv.includes('--market') || process.argv.includes('--stints');
  if (fresh && !process.argv.includes('--check')) { console.log('REFUSED: --market and --stints only check (the SQL files are written from the committed exports)'); process.exit(2); }
  const marketFile = arg('--market', path.join(DATA, MARKET_FILE));
  const stintsFile = arg('--stints', path.join(DATA, STINTS_FILE));
  const ledger = JSON.parse(fs.readFileSync(path.join(DATA, 'arsenalLedger.json'), 'utf8'));
  const market = JSON.parse(fs.readFileSync(marketFile, 'utf8'));
  const stints = JSON.parse(fs.readFileSync(stintsFile, 'utf8'));
  const bad = checkHashes(market, stints);
  if (bad.length) { console.error(`${bad.length} exported rows whose h is not their own recipe (${bad.slice(0, 3).join(', ')}). Nothing written.`); process.exit(1); }
  const pending = ledger.men.filter((m) => m.verdict !== 'sarandi' && m.verdict !== 'london');
  if (pending.length) { console.error(`${pending.length} men are neither sarandi nor london (${pending.map((m) => m.name).join(', ')}). Nothing written.`); process.exit(1); }
  const payload = computePayload(ledger, market, stints);
  for (const h of payload.held) console.log(`  HELD stint ${h.id} ${h.name} ${h.span.join('-')}: ${h.why}`);
  const rec = writeSql(payload, { strict: false, source: SOURCE });
  const app = writeSql(payload, { strict: true, source: SOURCE });
  console.log(`market ${rec.N} rows, stints ${rec.M} rows, held ${payload.held.length}; payload md5 ${rec.md5}`);
  let differ = 0;
  for (const [rel, text] of [[MIGRATION, rec.sql], [APPLIED, app.sql]]) {
    const file = path.join(ROOT, rel);
    if (process.argv.includes('--check')) {
      const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
      if (cur !== text) { differ += 1; console.log(`DIFFERS: ${rel}`); } else console.log(`same: ${rel}`);
    } else { fs.writeFileSync(file, text); console.log(`wrote ${rel}`); }
  }
  if (differ) { console.log('FAIL: the table moved since the committed export (or the ledger changed). Stop the apply.'); process.exit(1); }
}
