/**
 * simGolfMajors: Round 733. public.golf_majors was verified row by row, the
 * result is a pinned record, and the migration that fixes the table is held to
 * that record here, statement by statement.
 *
 * WHY THIS EXISTS. The table stored a single dash character (U+2014) as the
 * champion for 25 years a major was not played, so any count of golfers gave
 * the dash 25 majors, and it carried a double dagger footnote mark (U+2021) on
 * three names, which split Bobby Jones into two people (5 rows plain, 2 marked)
 * and is how src/data/golfLegends.ts once shipped him with 5 majors. It also
 * stopped at 2025 for three championships. Round 733 checked every one of the
 * 526 rows against the championship's own champions list plus a second list
 * from another organisation and wrote what it found, with the URLs and the
 * date, to scripts/data/golfMajorsVerified2026-09.json. The fix is
 * supabase/migrations/20260930_round_733_golf_majors.sql: it deletes the 25
 * placeholders, strips the mark from three names and inserts the three 2026
 * champions, and it is guarded on an md5 of the rows it read and an md5 of
 * the end state it promises. Nothing else holds those two constants to the
 * record, so a hand edit to either file would leave a migration that refuses
 * to run (fine) or one that runs and lands somewhere the record does not
 * describe (not fine). This harness recomputes both from the record and
 * replays the migration on the record's rows.
 *
 * WHAT IT CHECKS. Every check is an equality against the record, the SQL or
 * the shipped file: nothing here is statistical, so there is no margin to set
 * and no distribution to measure headroom on. Every count (526 read, 25
 * dropped, 3 corrected, 3 filled, 504 at the end, 60 legends) is read from the
 * files, never typed here, so the numbers in this header are description, not
 * assertion.
 *
 *    1. The record. Every row carries exactly two sources that are URLs, on two
 *       different ORGANISATIONS (usga.org and usopen.com are the USGA, theopen.com,
 *       randa.org and aigwomensopen.com are The R&A, pga.com and pgachampionship.com
 *       are the PGA of America, and every regional subdomain of one site is that
 *       site), at least one on an official host for that championship per the
 *       record's own officialHosts map, none on Wikipedia or a copy of it, and a
 *       printed value for each. The check date and the read date are real
 *       calendar dates that have happened. A verified row's value equals what
 *       was stored; a corrected row's differs and says why; a dropped row's
 *       stored value is exactly the single dash (U+2014), its value is null and
 *       it says why. Ids are unique, every tournament has an official host list,
 *       the counts block agrees with the rows, and no year plus tournament appears
 *       twice in the end state. Each filled 2026 row carries its champion, venue
 *       and nationality sources (two organisations each, the champion and venue
 *       ones with an official host) and names, in copiedFrom, the live row its
 *       score and venue strings were copied from: that row must be in the record
 *       under the same championship and the strings must be equal, so the stray
 *       space in "Southport , England" is there because the table's own ten Open
 *       rows at Royal Birkdale carry it, not by accident.
 *    2. The hashes. The read hash (md5 of id|year|tournament|player_name ordered
 *       by id, newline joined) is recomputed from the rows' stored values and
 *       the end hash (md5 of year|tournament|player_name ordered by tournament in
 *       C collation then year) from the surviving values plus the filled rows.
 *       Each must equal the record's constant AND the constant the SQL guards
 *       on, and the two row counts the SQL guards on must equal the record's.
 *    3. The migration, replayed. The SQL is read with its comments stripped and
 *       parsed: it must be one transaction, with a guard block before the first
 *       write and one after the last, each raising. The DELETE's id list must
 *       equal the record's dropped ids and its chr() must be the dash. Each
 *       UPDATE's ids must be corrected rows whose stored value is exactly the
 *       old value the predicate spells and whose verified value is the new one.
 *       Each INSERT tuple must equal a filled row field by field. Then the three
 *       statements are applied to the record's read state and the result must be
 *       exactly the record's end state, row for row, with the end hash the SQL
 *       expects. The replay uses the SQL's own predicates, so a DELETE that named
 *       a row whose player is not the dash would delete nothing there and the
 *       count would be off, exactly as Postgres would leave it.
 *    4. The consumer. src/data/golfLegends.ts (read with comments stripped) ships
 *       a majors count and a first and last win year for every legend; each must
 *       equal what the record's end state gives that golfer over the four men's
 *       majors. That is the check that would have caught Bobby Jones at 5.
 *
 * Nothing here touches the network. The live table was read once, through the
 * public REST endpoint, when the record was written; the record carries the
 * hash of that read and the migration refuses to run if the table has moved.
 *
 * NEGATIVE CONTROLS (SIM_GOLF_MAJORS_CONTROL). Each edits an in memory copy
 * and refuses to run if its anchor is missing or the edit changed nothing. The
 * harness then runs twice, untouched and with the control, and the control
 * proves its check only if every new failure is in the sections named, at least
 * one of them in each, and no other section gained or lost a failure. Under a
 * control the harness exits 1 when the break was caught that way and 2 when it
 * was not (the control proves nothing).
 *   hash        one verified row's stored and verified value both change,
 *               so the record drifts from both hashes, and the replay no
 *               longer lands where the SQL's end guard expects            sections 2, 3
 *   onesource   one row loses its second source                           section 1
 *   sameorg     one U.S. Open row's ESPN source becomes usopen.com, the
 *               USGA twice                                                section 1
 *   futuredate  the check date moves to 2099                              section 1
 *   copied      the Open's filled venue loses the space the table carries,
 *               in the record only: copiedFrom disagrees, and the INSERT
 *               no longer matches the record                              sections 1, 3
 *   deleteid    the SQL's DELETE loses id 10                              section 3
 *   insert      the SQL's INSERT venue loses that space                   section 3
 *   legend      golfLegends puts Bobby Jones back to 5 majors             section 4
 *
 * Run: node scripts/simGolfMajors.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD = 'scripts/data/golfMajorsVerified2026-09.json';
const MIGRATION = 'supabase/migrations/20260930_round_733_golf_majors.sql';
const LEGENDS = 'src/data/golfLegends.ts';
const CONTROL = process.env.SIM_GOLF_MAJORS_CONTROL || '';
const EXPECT = { hash: [2, 3], onesource: [1], sameorg: [1], futuredate: [1], copied: [1, 3], deleteid: [3], insert: [3], legend: [4] };
if (CONTROL && !(CONTROL in EXPECT)) {
  console.error(`SIM_GOLF_MAJORS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`);
  process.exit(2);
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const stripSqlComments = (t) => t.replace(/--[^\n]*/g, '');
const stripTsComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');
const DASH = String.fromCodePoint(8212);
const clone = (o) => JSON.parse(JSON.stringify(o));
const snip = (v) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > 120 ? `${s.slice(0, 120)}...` : s; };

/* ---------- sources: hosts, organisations, official ---------- */
const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; } };
const MULTI_SUFFIX = new Set(['co.uk', 'org.uk', 'com.au', 'co.nz', 'co.jp', 'com.br', 'co.za', 'co.in']);
const registrable = (h) => {
  const p = h.split('.');
  return p.length >= 3 && MULTI_SUFFIX.has(p.slice(-2).join('.')) ? p.slice(-3).join('.') : p.slice(-2).join('.');
};
/* Different sites owned by one organisation. Only ownership that is certain. */
const OWNER = {
  'usga.org': 'the USGA', 'usopen.com': 'the USGA',
  'theopen.com': 'The R&A', 'randa.org': 'The R&A', 'aigwomensopen.com': 'The R&A',
  'pga.com': 'the PGA of America', 'pgachampionship.com': 'the PGA of America',
  'masters.com': 'Augusta National', 'pgatour.com': 'the PGA Tour', 'lpga.com': 'the LPGA Tour',
  'espn.com': 'ESPN', 'espn.co.uk': 'ESPN', 'espn.com.au': 'ESPN',
};
const orgOf = (h) => { const s = registrable(h); return OWNER[s] ?? s; };
const onHost = (h, list) => list.some(d => h === d || h.endsWith('.' + d));
const isWikiCopy = (h) => /wiki|dbpedia|alchetron|everipedia/.test(h);
const isRealDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const TODAY = (() => {
  const utc = new Date().toISOString().slice(0, 10);
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return local > utc ? local : utc;
})();
const nameKey = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/* C collation orders by byte; every tournament name here is ASCII, so code
   unit order is byte order. Ties cannot happen: year plus tournament is unique. */
const cOrder = (a, b) => (a.tournament < b.tournament ? -1 : a.tournament > b.tournament ? 1 : a.year - b.year);
const endHashOf = (rows) => md5([...rows].sort(cOrder).map(r => `${r.year}|${r.tournament}|${r.player_name}`).join('\n'));
const readHashOf = (rows) => md5([...rows].sort((a, b) => a.id - b.id).map(r => `${r.id}|${r.year}|${r.tournament}|${r.player_name}`).join('\n'));

/* ---------- SQL parsing ---------- */
const unq = (s) => s.replace(/''/g, "'");
/* Splits an INSERT's values block into tuples and each tuple into fields, by
   scanning quotes and parentheses: "U.S. Open (golf)" holds a parenthesis. */
function parseTuples(block) {
  const tuples = [];
  let depth = 0; let inQ = false; let field = ''; let fields = [];
  const pushField = () => { const f = field.trim(); if (f !== '') fields.push(/^'/.test(f) ? unq(f.slice(1, -1)) : (/^-?\d+$/.test(f) ? Number(f) : f)); field = ''; };
  for (let i = 0; i < block.length; i++) {
    const c = block[i];
    if (inQ) {
      field += c;
      if (c === "'") { if (block[i + 1] === "'") { field += "'"; i++; } else inQ = false; }
      continue;
    }
    if (c === "'") { inQ = true; field += c; continue; }
    if (c === '(') { depth++; if (depth === 1) { fields = []; field = ''; continue; } }
    if (c === ')') { depth--; if (depth === 0) { pushField(); tuples.push(fields); continue; } }
    if (depth === 0) continue;
    if (c === ',' && depth === 1) { pushField(); continue; }
    field += c;
  }
  return tuples;
}
function parseMigration(sqlText) {
  const code = stripSqlComments(sqlText);
  const out = { code, counts: [], hashes: [], deletes: [], updates: [], inserts: [], guards: [] };
  for (const m of code.matchAll(/count\(\*\) from public\.golf_majors\) <> (\d+)/g)) out.counts.push(Number(m[1]));
  for (const m of code.matchAll(/<> '([0-9a-f]{32})'/g)) out.hashes.push(m[1]);
  for (const m of code.matchAll(/delete from public\.golf_majors where player_name = chr\((\d+)\) and id in \(([\d,\s]+)\);/g)) {
    out.deletes.push({ at: m.index, chr: Number(m[1]), ids: m[2].split(',').map(s => Number(s.trim())) });
  }
  for (const m of code.matchAll(/update public\.golf_majors set player_name = '((?:[^']|'')*)' where id in \(([\d,\s]+)\) and player_name = '((?:[^']|'')*)' \|\| chr\((\d+)\);/g)) {
    out.updates.push({ at: m.index, to: unq(m[1]), ids: m[2].split(',').map(s => Number(s.trim())), from: unq(m[3]) + String.fromCodePoint(Number(m[4])) });
  }
  for (const m of code.matchAll(/insert into public\.golf_majors \(([^)]+)\) values\s*([\s\S]*?\));/g)) {
    out.inserts.push({ at: m.index, columns: m[1].split(',').map(s => s.trim()), tuples: parseTuples(m[2]) });
  }
  for (const m of code.matchAll(/do \$\$[\s\S]*?end \$\$;/g)) out.guards.push({ at: m.index, text: m[0], raises: (m[0].match(/raise exception/g) || []).length });
  out.begin = code.search(/\bbegin;/);
  out.commit = code.search(/\bcommit;/);
  return out;
}

/* ---------- the fence ---------- */
function runFence(record, sqlText, legendsText, quiet) {
  const failures = [];
  let section = 0;
  const say = (m) => { if (!quiet) console.log(m); };
  const fail = (tag, msg) => { failures.push({ section, tag, msg }); if (!quiet) console.error(`  FAIL [${tag}]: ${msg}`); };
  const head = (n, title) => { section = n; say(`\n--- ${n}. ${title} ---`); };
  const rows = Array.isArray(record.rows) ? record.rows : [];
  const filled = Array.isArray(record.filled) ? record.filled : [];
  const official = record.officialHosts ?? {};

  const checkSources = (where, list, { needOfficial, tournament }) => {
    if (!Array.isArray(list) || list.length < 2) return fail('sources', `${where}: ${Array.isArray(list) ? list.length : 'no'} source(s), two are required`);
    const hosts = list.map(hostOf);
    if (hosts.some(h => !h)) return fail('sources', `${where}: a source is not a URL (${snip(list)})`);
    const wiki = hosts.find(isWikiCopy);
    if (wiki) return fail('wiki', `${where}: ${wiki} is Wikipedia or a copy of it, never a source`);
    const orgs = new Set(hosts.map(orgOf));
    if (orgs.size < 2) return fail('org', `${where}: ${hosts.join(' and ')} belong to one organisation (${[...orgs][0]}), which is one source twice`);
    if (needOfficial) {
      const hostsFor = official[tournament];
      if (!Array.isArray(hostsFor) || !hostsFor.length) return fail('official', `${where}: the record lists no official host for ${tournament}`);
      if (!hosts.some(h => onHost(h, hostsFor))) return fail('official', `${where}: no source on an official host for ${tournament} (${hostsFor.join(', ')}); got ${hosts.join(', ')}`);
    }
    return undefined;
  };

  head(1, 'the record: two sources on two organisations per row, one official, a real past check date, statuses that mean what they say, unique ids, counts that add up, filled rows that name the live row they copied');
  {
    if (record.round !== 733) fail('shape', `record.round is ${snip(record.round)}, not 733`);
    if (record.table !== 'public.golf_majors') fail('shape', `record.table is ${snip(record.table)}`);
    for (const [k, v] of [['checkedOn', record.checkedOn], ['read.on', record.read?.on]]) {
      if (!isRealDate(v)) fail('date', `${k} ${JSON.stringify(v)} is not a real calendar date`);
      else if (v > TODAY) fail('date', `${k} ${v} is in the future (today is ${TODAY})`);
    }
    if (!rows.length) fail('shape', 'the record holds no rows, so nothing below measures anything');
    const ids = new Set();
    const byStatus = { verified: 0, corrected: 0, dropped: 0 };
    for (const r of rows) {
      const where = `rows[id ${r.id}]`;
      if (!Number.isInteger(r.id) || r.id <= 0) fail('shape', `${where}: id is not a positive integer`);
      else if (ids.has(r.id)) fail('duplicate', `${where}: id listed twice`);
      ids.add(r.id);
      if (!Number.isInteger(r.year) || r.year < 1860 || r.year > Number(TODAY.slice(0, 4))) fail('shape', `${where}: year ${snip(r.year)} is not a season this table can hold`);
      if (!Array.isArray(official[r.tournament])) fail('official', `${where}: tournament ${snip(r.tournament)} has no official host list in the record`);
      if (typeof r.stored !== 'string' || !r.stored) fail('shape', `${where}: stored is not a non empty string`);
      if (!(r.status in byStatus)) { fail('status', `${where}: status ${snip(r.status)} is not verified, corrected or dropped`); continue; }
      byStatus[r.status] += 1;
      if (r.status === 'verified' && r.value !== r.stored) fail('status', `${where}: verified, yet value ${snip(r.value)} differs from stored ${snip(r.stored)}`);
      if (r.status === 'corrected') {
        if (typeof r.value !== 'string' || !r.value || r.value === r.stored) fail('status', `${where}: corrected, yet value ${snip(r.value)} is empty or equals stored`);
        if (typeof r.why !== 'string' || !r.why.trim()) fail('status', `${where}: corrected with no why`);
      }
      if (r.status === 'dropped') {
        if (r.value !== null) fail('status', `${where}: dropped, yet value is ${snip(r.value)}, not null`);
        if (r.stored !== DASH) fail('status', `${where}: dropped, yet stored ${JSON.stringify(r.stored)} is not the single dash placeholder (U+2014)`);
        if (r.reason !== 'notPlayed' || typeof r.why !== 'string' || !r.why.trim()) fail('status', `${where}: dropped without reason notPlayed and a why`);
      }
      checkSources(where, r.src, { needOfficial: true, tournament: r.tournament });
      if (!Array.isArray(r.printed) || r.printed.length !== (r.src?.length ?? 0) || r.printed.some(p => typeof p !== 'string' || !p.trim())) fail('printed', `${where}: printed must hold one non empty value per source`);
    }
    const c = record.counts ?? {};
    const want = { read: rows.length, verified: byStatus.verified, corrected: byStatus.corrected, dropped: byStatus.dropped, filled: filled.length, endState: rows.length - byStatus.dropped + filled.length };
    for (const [k, v] of Object.entries(want)) if (c[k] !== v) fail('counts', `counts.${k} is ${snip(c[k])}, the rows give ${v}`);
    if (record.read?.rows !== rows.length) fail('counts', `read.rows is ${snip(record.read?.rows)}, the record holds ${rows.length}`);
    if (record.read?.placeholders !== byStatus.dropped) fail('counts', `read.placeholders is ${snip(record.read?.placeholders)}, the record drops ${byStatus.dropped}`);
    if (record.end?.rows !== want.endState) fail('counts', `end.rows is ${snip(record.end?.rows)}, the record ends at ${want.endState}`);
    /* The end state: no year plus tournament twice, and a filled row fills a gap. */
    const seen = new Map();
    for (const r of rows.filter(x => x.status !== 'dropped')) {
      const k = `${r.year}|${r.tournament}`;
      if (seen.has(k)) fail('duplicate', `${k} appears twice in the end state (ids ${seen.get(k)} and ${r.id})`);
      seen.set(k, r.id);
    }
    const byId = new Map(rows.map(r => [r.id, r]));
    filled.forEach((f, i) => {
      const where = `filled[${i}] ${f.year} ${f.tournament}`;
      for (const k of ['year', 'tournament', 'tour', 'rank', 'player_name', 'nationality', 'score', 'venue']) {
        if (f[k] === undefined || f[k] === null || f[k] === '') fail('shape', `${where}: no ${k}`);
      }
      const k = `${f.year}|${f.tournament}`;
      if (seen.has(k)) fail('duplicate', `${where}: the record already holds this year and championship (id ${seen.get(k)}), so it is not a gap`);
      seen.set(k, `filled[${i}]`);
      checkSources(`${where} src`, f.src, { needOfficial: true, tournament: f.tournament });
      checkSources(`${where} srcVenue`, f.srcVenue, { needOfficial: true, tournament: f.tournament });
      /* Nationality is not a championship record, so no official host is
         required; two organisations still are. */
      checkSources(`${where} srcNationality`, f.srcNationality, { needOfficial: false });
      if (!Array.isArray(f.printed) || f.printed.length !== (f.src?.length ?? 0)) fail('printed', `${where}: printed must hold one value per source`);
      const cf = f.copiedFrom;
      if (!cf || typeof cf !== 'object') { fail('copied', `${where}: no copiedFrom, so nothing says where its score and venue strings come from`); return; }
      const src = byId.get(cf.id);
      if (!src) fail('copied', `${where}: copiedFrom.id ${snip(cf.id)} is not a row in the record`);
      else {
        if (src.tournament !== f.tournament) fail('copied', `${where}: copied from id ${cf.id}, a ${src.tournament} row, not this championship`);
        if (src.status === 'dropped') fail('copied', `${where}: copied from id ${cf.id}, a placeholder row`);
        if (cf.year !== src.year || cf.player_name !== src.value) fail('copied', `${where}: copiedFrom says id ${cf.id} is ${cf.year} ${snip(cf.player_name)}, the record says ${src.year} ${snip(src.value)}`);
      }
      if (cf.score !== f.score) fail('copied', `${where}: score ${JSON.stringify(f.score)} is not what the copied row stores, ${JSON.stringify(cf.score)}`);
      if (cf.venue !== f.venue) fail('copied', `${where}: venue ${JSON.stringify(f.venue)} is not what the copied row stores, ${JSON.stringify(cf.venue)}`);
      if (!isRealDate(cf.readOn)) fail('date', `${where}: copiedFrom.readOn ${JSON.stringify(cf.readOn)} is not a real calendar date`);
      else if (cf.readOn > TODAY) fail('date', `${where}: copiedFrom.readOn ${cf.readOn} is in the future`);
      if (typeof cf.through !== 'string' || !/rest\/v1\/golf_majors/.test(cf.through)) fail('copied', `${where}: copiedFrom.through does not name the REST read it came from`);
    });
    say(`  ${rows.length} rows: ${byStatus.verified} verified, ${byStatus.corrected} corrected, ${byStatus.dropped} dropped; ${filled.length} filled; end state ${want.endState}`);
  }

  /* The read state and the end state, as rows of the table. */
  const readState = rows.map(r => ({ id: r.id, year: r.year, tournament: r.tournament, player_name: r.stored }));
  const endState = [
    ...rows.filter(r => r.status !== 'dropped').map(r => ({ year: r.year, tournament: r.tournament, player_name: r.value })),
    ...filled.map(f => ({ year: f.year, tournament: f.tournament, player_name: f.player_name })),
  ];
  const mig = parseMigration(sqlText);

  head(2, 'the hashes: read and end recomputed from the record, equal to the record and to the SQL guards, with the row counts the SQL guards on');
  {
    const readHash = readHashOf(readState);
    const endHash = endHashOf(endState);
    if (record.read?.hash !== readHash) fail('readhash', `record.read.hash ${snip(record.read?.hash)} but the rows hash to ${readHash}`);
    if (record.end?.hash !== endHash) fail('endhash', `record.end.hash ${snip(record.end?.hash)} but the end state hashes to ${endHash}`);
    if (mig.hashes.length !== 2) fail('sql', `the migration guards on ${mig.hashes.length} hash constant(s), two expected (read, end)`);
    else {
      if (mig.hashes[0] !== readHash) fail('readhash', `the migration's read guard is ${mig.hashes[0]}, the record's rows hash to ${readHash}`);
      if (mig.hashes[1] !== endHash) fail('endhash', `the migration's end guard is ${mig.hashes[1]}, the record's end state hashes to ${endHash}`);
    }
    if (mig.counts.length !== 2) fail('sql', `the migration guards on ${mig.counts.length} row count(s), two expected`);
    else {
      if (mig.counts[0] !== readState.length) fail('count', `the migration expects ${mig.counts[0]} rows before, the record read ${readState.length}`);
      if (mig.counts[1] !== endState.length) fail('count', `the migration expects ${mig.counts[1]} rows after, the record ends at ${endState.length}`);
    }
    const hasReadExpr = /id \|\| '\|' \|\| year \|\| '\|' \|\| tournament \|\| '\|' \|\| player_name[^)]*order by id\)/.test(mig.code);
    const hasEndExpr = /year \|\| '\|' \|\| tournament \|\| '\|' \|\| player_name[^)]*order by tournament collate "C", year\)/.test(mig.code);
    if (!hasReadExpr) fail('sql', 'the read guard does not hash id|year|tournament|player_name ordered by id, so the recomputation here is not what it computes');
    if (!hasEndExpr) fail('sql', 'the end guard does not hash year|tournament|player_name ordered by tournament (C) then year, so the recomputation here is not what it computes');
    say(`  read ${readHash} over ${readState.length} rows, end ${endHash} over ${endState.length} rows`);
  }

  head(3, 'the migration, replayed on the record: one transaction, guarded before and after, every DELETE id a dropped row, every UPDATE a corrected row, every INSERT a filled row, landing exactly on the end state');
  {
    const writes = [...mig.deletes, ...mig.updates, ...mig.inserts].map(w => w.at);
    if (mig.begin < 0 || mig.commit < 0 || !(mig.begin < Math.min(...writes)) || !(mig.commit > Math.max(...writes))) fail('transaction', 'the writes are not wrapped in one begin ... commit');
    if (mig.guards.length !== 2) fail('guard', `${mig.guards.length} guard block(s), two expected (before the first write, after the last)`);
    else {
      if (!(mig.guards[0].at < Math.min(...writes))) fail('guard', 'the first guard block is not before the first write');
      if (!(mig.guards[1].at > Math.max(...writes))) fail('guard', 'the second guard block is not after the last write');
      mig.guards.forEach((g, i) => { if (g.raises < 2) fail('guard', `guard block ${i + 1} raises ${g.raises} time(s), a count check and a hash check are expected`); });
    }
    if (mig.deletes.length !== 1) fail('delete', `${mig.deletes.length} DELETE statement(s), one expected`);
    const dropped = rows.filter(r => r.status === 'dropped');
    const droppedIds = new Set(dropped.map(r => r.id));
    for (const d of mig.deletes) {
      if (String.fromCodePoint(d.chr) !== DASH) fail('delete', `the DELETE predicate is chr(${d.chr}), not the dash placeholder (U+2014)`);
      const sqlIds = new Set(d.ids);
      for (const id of sqlIds) if (!droppedIds.has(id)) fail('delete', `the DELETE names id ${id}, which the record does not drop`);
      for (const id of droppedIds) if (!sqlIds.has(id)) fail('delete', `the record drops id ${id}, which the DELETE does not name`);
      if (sqlIds.size !== d.ids.length) fail('delete', 'the DELETE names an id twice');
    }
    const corrected = rows.filter(r => r.status === 'corrected');
    const updatedIds = new Set();
    const byId = new Map(rows.map(r => [r.id, r]));
    for (const u of mig.updates) {
      for (const id of u.ids) {
        updatedIds.add(id);
        const r = byId.get(id);
        if (!r) { fail('update', `the UPDATE names id ${id}, which is not in the record`); continue; }
        if (r.status !== 'corrected') fail('update', `the UPDATE names id ${id}, which the record marks ${r.status}, not corrected`);
        if (r.stored !== u.from) fail('update', `id ${id}: the UPDATE predicate spells the stored value ${JSON.stringify(u.from)}, the record read ${JSON.stringify(r.stored)}`);
        if (r.value !== u.to) fail('update', `id ${id}: the UPDATE writes ${JSON.stringify(u.to)}, the record verified ${JSON.stringify(r.value)}`);
      }
    }
    for (const r of corrected) if (!updatedIds.has(r.id)) fail('update', `the record corrects id ${r.id}, which no UPDATE names`);
    if (mig.inserts.length !== 1) fail('insert', `${mig.inserts.length} INSERT statement(s), one expected`);
    const inserted = [];
    for (const ins of mig.inserts) {
      for (const t of ins.tuples) {
        if (t.length !== ins.columns.length) { fail('insert', `an INSERT tuple has ${t.length} values for ${ins.columns.length} columns`); continue; }
        inserted.push(Object.fromEntries(ins.columns.map((c, i) => [c, t[i]])));
      }
    }
    if (inserted.length !== filled.length) fail('insert', `the INSERT adds ${inserted.length} row(s), the record fills ${filled.length}`);
    for (const f of filled) {
      const hit = inserted.find(x => x.year === f.year && x.tournament === f.tournament);
      if (!hit) { fail('insert', `no INSERT tuple for ${f.year} ${f.tournament}`); continue; }
      for (const k of Object.keys(hit)) {
        if (hit[k] !== f[k]) fail('insert', `${f.year} ${f.tournament}: the INSERT writes ${k} ${JSON.stringify(hit[k])}, the record holds ${JSON.stringify(f[k])}`);
      }
    }
    /* Replay, with the SQL's own predicates. */
    let table = readState.map(r => ({ ...r }));
    for (const d of mig.deletes) { const ids = new Set(d.ids); const mark = String.fromCodePoint(d.chr); table = table.filter(r => !(ids.has(r.id) && r.player_name === mark)); }
    for (const u of mig.updates) { const ids = new Set(u.ids); for (const r of table) if (ids.has(r.id) && r.player_name === u.from) r.player_name = u.to; }
    for (const x of inserted) table.push({ id: null, year: x.year, tournament: x.tournament, player_name: x.player_name });
    const replayHash = endHashOf(table);
    if (table.length !== endState.length) fail('replay', `replaying the migration leaves ${table.length} rows, the record ends at ${endState.length}`);
    if (mig.hashes[1] && replayHash !== mig.hashes[1]) fail('replay', `replaying the migration hashes to ${replayHash}, the SQL's own end guard expects ${mig.hashes[1]}, so it would roll itself back`);
    const key = (r) => `${r.year}|${r.tournament}|${r.player_name}`;
    const wantKeys = new Map(); for (const r of endState) wantKeys.set(key(r), (wantKeys.get(key(r)) ?? 0) + 1);
    const gotKeys = new Map(); for (const r of table) gotKeys.set(key(r), (gotKeys.get(key(r)) ?? 0) + 1);
    for (const [k, n] of wantKeys) if (gotKeys.get(k) !== n) fail('replay', `the record's end state holds ${k} (${n}), the replay ${gotKeys.get(k) ?? 0}`);
    for (const [k, n] of gotKeys) if (!wantKeys.has(k)) fail('replay', `the replay holds ${k} (${n}), which the record's end state does not`);
    say(`  ${mig.deletes.reduce((n, d) => n + d.ids.length, 0)} deleted, ${[...updatedIds].length} updated, ${inserted.length} inserted; replay lands on ${table.length} rows hashing ${replayHash}`);
  }

  head(4, 'the consumer: every legend in src/data/golfLegends.ts has the majors count and the first and last win the end state gives that golfer');
  {
    const code = stripTsComments(legendsText);
    const legends = [...code.matchAll(/\{\s*name:\s*'((?:[^'\\]|\\.)+)',\s*majors:\s*(\d+),\s*firstWin:\s*(\d+),\s*lastWin:\s*(\d+)/g)]
      .map(m => ({ name: m[1].replace(/\\'/g, "'"), majors: Number(m[2]), firstWin: Number(m[3]), lastWin: Number(m[4]) }));
    if (legends.length < 20) fail('legends', `parsed ${legends.length} legend(s) from ${LEGENDS}, so the shape has changed and nothing here measures anything`);
    const men = endState.filter(r => !/women/i.test(r.tournament));
    const byName = new Map();
    for (const r of men) { const k = nameKey(r.player_name); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(r); }
    for (const l of legends) {
      const got = byName.get(nameKey(l.name)) ?? [];
      if (!got.length) { fail('legend', `${l.name}: not one row in the end state`); continue; }
      const years = got.map(r => r.year);
      const first = Math.min(...years); const last = Math.max(...years);
      if (got.length !== l.majors) fail('legend', `${l.name}: the file ships ${l.majors} majors, the end state holds ${got.length} (${got.map(r => `${r.year} ${r.tournament}`).join('; ')})`);
      if (first !== l.firstWin) fail('legend', `${l.name}: the file ships firstWin ${l.firstWin}, the end state's first is ${first}`);
      if (last !== l.lastWin) fail('legend', `${l.name}: the file ships lastWin ${l.lastWin}, the end state's last is ${last}`);
    }
    say(`  ${legends.length} legends checked against ${men.length} men's rows`);
  }

  return failures;
}

/* ---------- controls: in memory edits that must fire ---------- */
const refuse = (why) => { console.error(`  control ${CONTROL} cannot run: ${why}`); process.exit(2); };
const rewrite = (text, from, to, what) => {
  if (!text.includes(from)) refuse(`${what}: anchor ${JSON.stringify(from)} is not in the text`);
  const out = text.replace(from, to);
  if (out === text) refuse(`${what}: the edit changed nothing`);
  return out;
};
function applyControl(name, record, sql, legends) {
  const rec = clone(record);
  if (name === 'hash') {
    const r = rec.rows.find(x => x.status === 'verified');
    if (!r) refuse('no verified row to perturb');
    const before = JSON.stringify(r);
    r.stored = `${r.stored}x`; r.value = r.stored;
    if (JSON.stringify(r) === before) refuse('hash changed nothing');
    return { rec, sql, legends };
  }
  if (name === 'onesource') {
    const r = rec.rows.find(x => x.status === 'verified' && Array.isArray(x.src) && x.src.length === 2);
    if (!r) refuse('no two source row');
    r.src = r.src.slice(0, 1); r.printed = r.printed.slice(0, 1);
    return { rec, sql, legends };
  }
  if (name === 'sameorg') {
    const r = rec.rows.find(x => x.tournament === 'U.S. Open (golf)' && x.src.some(u => /espn\.com/.test(u)) && x.src.some(u => /usga\.org/.test(u)));
    if (!r) refuse('no U.S. Open row sourced on usga.org and espn.com');
    const i = r.src.findIndex(u => /espn\.com/.test(u));
    r.src[i] = 'https://www.usopen.com/history.html';
    return { rec, sql, legends };
  }
  if (name === 'futuredate') {
    if (!isRealDate(rec.checkedOn)) refuse('checkedOn is not a date to move');
    rec.checkedOn = '2099-01-01';
    return { rec, sql, legends };
  }
  if (name === 'copied') {
    const f = rec.filled.find(x => x.tournament === 'The Open Championship');
    if (!f || f.venue !== 'Southport , England') refuse('the Open filled row does not carry "Southport , England"');
    f.venue = 'Southport, England';
    return { rec, sql, legends };
  }
  if (name === 'deleteid') return { rec, sql: rewrite(sql, 'id in (10, 11, 12,', 'id in (11, 12,', 'deleteid'), legends };
  /* The anchor carries the course before the town so it lands in the INSERT
     tuple and not in the header comment, which the parser strips. */
  if (name === 'insert') return { rec, sql: rewrite(sql, "'Royal Birkdale', 'Southport , England')", "'Royal Birkdale', 'Southport, England')", 'insert'), legends };
  if (name === 'legend') return { rec, sql, legends: rewrite(legends, "name: 'Bobby Jones', majors: 7", "name: 'Bobby Jones', majors: 5", 'legend') };
  return refuse('unknown control');
}

/* ---------- run ---------- */
for (const rel of [RECORD, MIGRATION, LEGENDS]) {
  if (!fs.existsSync(path.join(ROOT, rel))) { console.error(`simGolfMajors: ${rel} is not there, so nothing here measures anything`); process.exit(CONTROL ? 2 : 1); }
}
const BASE_RECORD = JSON.parse(read(RECORD));
const BASE_SQL = read(MIGRATION);
const BASE_LEGENDS = read(LEGENDS);
const keyOf = (f) => `${f.section}|${f.tag}|${f.msg}`;

if (!CONTROL) {
  const failures = runFence(BASE_RECORD, BASE_SQL, BASE_LEGENDS, false);
  console.log('');
  if (failures.length) {
    const bySection = new Map();
    for (const f of failures) bySection.set(f.section, (bySection.get(f.section) ?? 0) + 1);
    console.error(`simGolfMajors: ${failures.length} failure(s). By section: ${[...bySection].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s} (${n})`).join(', ')}`);
    process.exit(1);
  }
  console.log(`simGolfMajors: green. Every row of the record is sourced on two organisations with an official host, both migration hashes and both counts recompute from it, the migration replayed on the record lands exactly on its end state, and every golf legend the site ships agrees with that end state.`);
  process.exit(0);
}

const { rec, sql, legends } = applyControl(CONTROL, BASE_RECORD, BASE_SQL, BASE_LEGENDS);
const base = runFence(BASE_RECORD, BASE_SQL, BASE_LEGENDS, true);
const ctl = runFence(rec, sql, legends, true);
const baseKeys = new Set(base.map(keyOf));
const ctlKeys = new Set(ctl.map(keyOf));
const added = ctl.filter(f => !baseKeys.has(keyOf(f)));
const gone = base.filter(f => !ctlKeys.has(keyOf(f)));
const want = EXPECT[CONTROL];
console.log(`CONTROL ${CONTROL}: ${added.length} new failure(s), ${gone.length} gone, against an untouched run with ${base.length}.`);
for (const f of added) console.log(`  + [${f.section} ${f.tag}] ${f.msg}`);
for (const f of gone) console.log(`  - [${f.section} ${f.tag}] ${f.msg}`);
const hitEvery = want.every(s => added.some(f => f.section === s));
const stray = added.filter(f => !want.includes(f.section)).length + gone.length;
if (hitEvery && !stray) {
  console.log(`\nCONTROL ${CONTROL}: section(s) ${want.join(', ')} caught the break (${added.length} new) and no other section moved. The check works.`);
  process.exit(1);
}
console.error(`\nCONTROL ${CONTROL}: expected new failures in section(s) ${want.join(', ')} and nothing new or gone elsewhere; got ${added.length} new (${[...new Set(added.map(f => f.section))].join(', ') || 'none'}) and ${gone.length} gone. The control proves nothing.`);
process.exit(2);
