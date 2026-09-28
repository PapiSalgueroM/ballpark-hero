/**
 * Round 669 harness: World XI knows its defensive midfielders.
 *
 * The report (World XI "Wrong answer", 2026-09-21): a CDM or CM slot answered
 * "Nobody from X matches that" for Manuel Ugarte, Sofyan Amrabat, Wataru Endo,
 * Tyler Adams and PSG's Vitinha. The game was right about its pool and the pool
 * was wrong: player_market_values carried no "Defensive Midfield" rows for 2023
 * to 2025 and 46 for 2026. Round 669 writes the missing 2026 rows, two sourced
 * and recorded in scripts/data/defensiveMidfield2026.json, as the migration
 * supabase/migrations/20260928_round_669_defensive_midfield_2026.sql.
 *
 * What this holds:
 *   1. The record and the migration. The migration LEXES (every string and
 *      dollar quote closes, and begin and commit are its first and last
 *      statements with no other transaction statement between them: the
 *      builder's file left `end $;` where `end $$;` belonged and nothing
 *      noticed). Every number in its guards is the record's own count. It
 *      stages exactly the record's rows, once each, with the same country, age
 *      and value, and exactly the record's corrections. Every written row is
 *      two sourced by the record's own rules: value is Transfermarkt's times
 *      the rate, FotMob's value sits inside the record's band, Transfermarkt's
 *      main position is defensive midfield and FotMob lists it among the
 *      positions he has played while its own primary for him is a midfield
 *      role (never a defender or a winger), the age is his age on the record's
 *      reference date (2026-01-01, the table's convention) and Transfermarkt's
 *      age today agrees with FotMob's birth date, and both hosts name the same
 *      country. Every held row is held for the reason it gives. And the record
 *      carries a dry run of THIS file: it was run on the live database inside
 *      BEGIN and ROLLBACK, ran to the end, and the sha256 recorded with that
 *      result is the sha256 of the file on disk, so an edit after the dry run
 *      turns this red until the dry run is repeated. The SQL is read as code:
 *      comments are blanked by the lexer before anything is parsed, and CRLF
 *      is normalised first because a Windows checkout is CRLF.
 *   2. The named current defensive midfielders are in the pool World XI itself
 *      fetches (fetchWorldXiPool, bundled from src/lib/worldXi.ts): the
 *      report's four plus a list from the research, each at his club with his
 *      country, and a search for his name in his country's slot offers him;
 *      and every row the record writes is a pooled player at its club.
 *      Measured before the migration: 0 of the named are there.
 *   3. They fit the slots Round 319's rules give them: every written row found
 *      in the pool is a CDM and fits every CDM and every CM slot in every
 *      formation.
 *   4. Namesakes stay two people, and only declared namesakes are two people:
 *      Paris Saint-Germain's Vitinha and Genoa's are both in the pool and a
 *      search for "vitinha" in Portugal's slot offers both, and every name that
 *      appears more than once in the pool is a declared namesake. World XI keys
 *      a same year namesake by club since this round, so a second 2026 row
 *      written for one transferred man (instead of updating his row) would now
 *      show him twice; this is what catches that.
 *
 * MODES. By default it reads the live pool, so sections 2 to 4 are RED until
 * the migration is applied: that is the point of it. WXIDM_PROJECT=1 answers
 * the game's 2026 fetch with the live rows plus the RECORD's rows and the
 * record's corrections, so the game side can be measured before the migration
 * lands. It is a projection of the record, never of the SQL: it parses nothing
 * out of the migration. What proves the SQL is section 1 (it stages exactly the
 * record and lexes clean) and the dry run the record carries (it executes).
 * WXIDM_PROJECT refuses (exit 2) once the migration is live.
 *
 * NEGATIVE CONTROLS. WXIDM_CONTROL=<name> breaks one input in memory, never on
 * disk. Each refuses to run (exit 2) unless the thing it changes is there
 * exactly once (in code, where the anchor is code). Each must turn its own
 * section red and no other, AND the named check must be among the findings;
 * the run then exits 1 and prints the behaved mark. A control that misses its
 * check, or reddens another section, exits 4.
 *   section 1, the migration copy:
 *     dollarquote     the last `end $$;` becomes `end $;` (the builder's bug)   lex
 *     guardcount      the staged row guard expects one row fewer                guards
 *     stagedrift      Ugarte's staged value moved by one dollar                 agree
 *     commented       Ugarte's staged line commented out                        unstaged
 *     extrastaged     a row the record does not write is staged                 extra
 *     stagedtwice     Ugarte's staged line appears twice                        dupstaged
 *     fixmissing      Bennacer's club correction dropped from the SQL           fixUnstaged
 *     dryrunstale     one character of a comment changed after the dry run      dryrun
 *   section 1, the record copy:
 *     recordcounts    the record's own count of written rows is off by one      counts
 *     fixextra        Bennacer's correction dropped from the record             fixUnrecorded
 *     namesakeflag    Vitinha's namesake declaration dropped                    namesakeflag
 *     recordvalue     Ugarte's Transfermarkt value moved                        rate
 *     recordband      Ugarte's FotMob value set far outside the band            band
 *     recordposition  FotMob no longer lists Ugarte at defensive midfield       position
 *     recordprimary   FotMob's primary for Ugarte becomes Center Back           primary
 *     recordage       FotMob's birth date for Ugarte moved to 1 January         age
 *     recordtmage     FotMob's birth date for Ugarte moved to 31 December       identityage
 *     recordcitizenship  Transfermarkt's first citizenship for Ugarte changed   citizenship
 *     recordcountry   FotMob plays Ugarte for another country                   country
 *     heldband        a row held for its value is moved inside the band         heldconsistent
 *   section 2:
 *     noplayer        Ugarte's 2026 row dropped from what the game is served    named, staged
 *     nosearch        worldXi.ts' search refuses any query with a space         search
 *   section 3:
 *     normalize       "Defensive Midfield" normalised to CB in squadDeal.ts     cdm
 *     cmslot          CM slots stop taking a CDM (squadDeal.ts, positionFit.ts) slots
 *   section 4:
 *     namesake        the Round 669 same year keying by club undone in worldXi  namesake
 *     dupname         a second 2026 Ugarte row, at another club, is served      declared
 * WXIDM_CONTROL=all runs the baseline first and refuses unless it is green,
 * then every control in turn, and is green only if each one behaved. Before
 * the migration is applied the live baseline is red by design, so
 * WXIDM_CONTROL=all needs WXIDM_PROJECT=1 until the migration lands, and runs
 * alone after it.
 *
 * Run: node scripts/simWorldXiDefensiveMids.mjs                       (live, needs the database)
 *      WXIDM_PROJECT=1 node scripts/simWorldXiDefensiveMids.mjs        (before the migration)
 *      WXIDM_PROJECT=1 WXIDM_CONTROL=all node scripts/simWorldXiDefensiveMids.mjs
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const RECORD = path.join(ROOT, 'scripts/data/defensiveMidfield2026.json');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260928_round_669_defensive_midfield_2026.sql');
const PROJECT = process.env.WXIDM_PROJECT === '1';
const CONTROLS = {
  dollarquote: [1, ['lex']], guardcount: [1, ['guards']], stagedrift: [1, ['agree']], commented: [1, ['unstaged']],
  extrastaged: [1, ['extra']], stagedtwice: [1, ['dupstaged']], fixmissing: [1, ['fixUnstaged']], dryrunstale: [1, ['dryrun']],
  recordcounts: [1, ['counts']], fixextra: [1, ['fixUnrecorded']], namesakeflag: [1, ['namesakeflag']],
  recordvalue: [1, ['rate']], recordband: [1, ['band']], recordposition: [1, ['position']], recordprimary: [1, ['primary']],
  recordage: [1, ['age']], recordtmage: [1, ['identityage']], recordcitizenship: [1, ['citizenship']],
  recordcountry: [1, ['country']], heldband: [1, ['heldconsistent']],
  noplayer: [2, ['named', 'staged']], nosearch: [2, ['search']],
  normalize: [3, ['cdm']], cmslot: [3, ['slots']],
  namesake: [4, ['namesake']], dupname: [4, ['declared']],
};
const CONTROL = process.env.WXIDM_CONTROL || '';
const MARK = 'WXIDM-CONTROL-BEHAVED';
const lf = s => s.replace(/\r\n/g, '\n');
const readText = f => lf(fs.readFileSync(f, 'utf8'));

if (CONTROL === 'all') {
  const base = spawnSync(process.execPath, [SELF], { env: { ...process.env, WXIDM_CONTROL: '' }, encoding: 'utf8' });
  if (base.status !== 0) {
    const last = `${base.stdout || ''}\n${base.stderr || ''}`.trim().split('\n').filter(Boolean).pop() || '';
    console.error(`simWorldXiDefensiveMids controls: the baseline is not green (exit ${base.status}), and a control proves nothing on a red baseline.`);
    console.error(`  ${last}`);
    if (!PROJECT) console.error('  Before the migration is applied the live baseline is red by design: run WXIDM_PROJECT=1 WXIDM_CONTROL=all.');
    process.exit(2);
  }
  console.log('  baseline green, running the controls\n');
  let bad = 0;
  for (const name of Object.keys(CONTROLS)) {
    const r = spawnSync(process.execPath, [SELF], { env: { ...process.env, WXIDM_CONTROL: name }, encoding: 'utf8' });
    const out = `${r.stdout || ''}\n${r.stderr || ''}`;
    const ok = r.status === 1 && out.includes(`${MARK} ${name}:`);
    if (!ok) bad += 1;
    const lines = out.trim().split('\n').filter(Boolean);
    const shown = (ok ? lines.find(l => l.startsWith(`${MARK} ${name}:`)) : lines.pop()) || '';
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${name.padEnd(17)} exit ${r.status}  ${shown}`);
    if (!ok) for (const l of out.trim().split('\n').filter(Boolean).slice(-12)) console.log(`         | ${l}`);
  }
  console.log('');
  if (bad) { console.error(`simWorldXiDefensiveMids controls: ${bad} of ${Object.keys(CONTROLS).length} did not behave.`); process.exit(1); }
  console.log(`simWorldXiDefensiveMids controls: green. All ${Object.keys(CONTROLS).length} turned their own section red with their own check, and no other section.`);
  process.exit(0);
}
if (CONTROL && !(CONTROL in CONTROLS)) {
  console.error(`WXIDM_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')}, all)`);
  process.exit(2);
}
const refuse = m => { console.error(`control ${CONTROL} cannot run: ${m}`); process.exit(2); };
const count = (text, anchor) => text.split(anchor).length - 1;
/* Anchor exactly once in the text, and, for an anchor that is code, exactly
   once in the code with comments blanked, so a swap can never land in prose. */
const once = (text, anchor, what, code) => {
  const n = count(text, anchor);
  if (n !== 1) refuse(`${what}: the anchor ${JSON.stringify(anchor)} appears ${n} times, not once`);
  if (code !== undefined && count(code, anchor) !== 1) refuse(`${what}: the anchor ${JSON.stringify(anchor)} is not in the code, only in a comment`);
};
if (CONTROL) console.log(`NEGATIVE CONTROL ${CONTROL} is on: section ${CONTROLS[CONTROL][0]} is SUPPOSED to go red with check ${CONTROLS[CONTROL][1].join(' and ')}, and no other section.\n`);

/* ---- per section, per check bookkeeping ---- */
const failed = new Map();
const firedChecks = new Set();
let section = 0;
const fail = (check, m) => {
  failed.set(section, (failed.get(section) || 0) + 1);
  firedChecks.add(check);
  if (failed.get(section) <= 8) console.error(`  FAIL [${check}]: ${m}`);
};

/* ---- JS comments blanked (strings kept), for anchors in source files ---- */
function jsCode(src) {
  let out = '';
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? src.length : e + 2; out += src.slice(i, end).replace(/[^\n]/g, ' '); i = end; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

/* ---- the SQL lexer: strings, quoted identifiers, dollar quotes, line and
   (nesting) block comments. Returns the code with comments blanked, the
   top level statements, and the first quote that never closes. ---- */
function lexSql(sql) {
  let code = '';
  let stmt = '';
  let line = 1;
  let stmtLine = 1;
  const statements = [];
  const push = () => { if (stmt.trim()) statements.push({ text: stmt.trim(), line: stmtLine }); stmt = ''; };
  for (let i = 0; i < sql.length;) {
    const c = sql[i];
    if (!stmt.trim() && !/\s/.test(c)) stmtLine = line;
    if (c === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') { code += ' '; i++; }
      continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      const open = line;
      let depth = 0;
      do {
        if (sql[i] === '/' && sql[i + 1] === '*') { depth++; code += '  '; i += 2; continue; }
        if (sql[i] === '*' && sql[i + 1] === '/') { depth--; code += '  '; i += 2; continue; }
        if (sql[i] === '\n') { line++; code += '\n'; } else code += ' ';
        i++;
      } while (i < sql.length && depth > 0);
      if (depth > 0) return { code, statements, error: `a block comment opened at line ${open} never closes` };
      continue;
    }
    if (c === "'" || c === '"') {
      const open = line;
      let j = i + 1;
      for (;;) {
        if (j >= sql.length) return { code, statements, error: `a ${c === "'" ? 'string' : 'quoted identifier'} opened at line ${open} never closes` };
        if (sql[j] === c) { if (sql[j + 1] === c) { j += 2; continue; } break; }
        j++;
      }
      const s = sql.slice(i, j + 1);
      line += (s.match(/\n/g) || []).length;
      code += s; stmt += s; i = j + 1;
      continue;
    }
    if (c === '$' && !(i > 0 && /[A-Za-z0-9_]/.test(sql[i - 1]))) {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 80));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end < 0) return { code, statements, error: `the dollar quote ${tag} opened at line ${line} never closes, so everything after it (commit included) is inside it` };
        const s = sql.slice(i, end + tag.length);
        line += (s.match(/\n/g) || []).length;
        code += s; stmt += s; i = end + tag.length;
        continue;
      }
    }
    if (c === ';') { code += c; push(); i++; continue; }
    if (c === '\n') line++;
    code += c; stmt += c; i++;
  }
  if (stmt.trim()) return { code, statements, error: `the last statement (line ${stmtLine}) has no closing semicolon` };
  return { code, statements, error: null };
}
function tuples(statements, table) {
  const st = statements.find(s => s.text.startsWith(`insert into ${table} (`));
  if (!st) return null;
  const at = st.text.indexOf(') values');
  if (at < 0) return null;
  const body = st.text.slice(at + ') values'.length);
  const out = [];
  for (const m of body.matchAll(/\(((?:'(?:[^']|'')*'|[^()'])*)\)/g)) {
    const fields = [];
    for (const f of m[1].matchAll(/'((?:[^']|'')*)'|(-?\d+)|(null)/g)) fields.push(f[1] !== undefined ? f[1].replace(/''/g, "'") : f[2] !== undefined ? Number(f[2]) : null);
    out.push(fields);
  }
  return out;
}
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const ageOn = (born, on) => {
  const [by, bm, bd] = born.split('-').map(Number);
  const [y, m, d] = on.split('-').map(Number);
  return y - by - ((m < bm || (m === bm && d < bd)) ? 1 : 0);
};
/* FotMob and Transfermarkt spell a handful of countries differently */
const COUNTRY_ALIAS = { usa: 'united states', 'ivory coast': "cote d'ivoire", czechia: 'czech republic', 'bosnia and herzegovina': 'bosnia-herzegovina', 'congo dr': 'dr congo' };
const foldCountry = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const sameCountry = (a, b) => { const x = foldCountry(a), y = foldCountry(b); return x === y || COUNTRY_ALIAS[x] === y || COUNTRY_ALIAS[y] === x; };
/* FotMob primaries outside midfield: a defender or a winger */
const OUTSIDE_MIDFIELD = new Set(['Center Back', 'Right Back', 'Left Back', 'Right Wing-Back', 'Left Wing-Back', 'Right Winger', 'Left Winger']);

/* ---- inputs: the record read twice (the copy on disk serves the projection
   and sections 2 to 4; the copy a control may change is section 1's), and the
   SQL, both with CRLF normalised ---- */
const recordText = readText(RECORD);
const recordDisk = JSON.parse(recordText);
const record = JSON.parse(recordText);
const sqlOnDisk = readText(MIGRATION);
let sqlText = sqlOnDisk;

const ugarteOf = rec => {
  const rows = rec.write.filter(w => w.name === 'Manuel Ugarte');
  if (rows.length !== 1) refuse(`the record carries ${rows.length} Manuel Ugarte rows, not one`);
  return rows[0];
};
if (CONTROL.startsWith('record') || ['fixextra', 'namesakeflag', 'heldband'].includes(CONTROL)) {
  const u = ugarteOf(record);
  const expect = (got, want, what) => { if (got !== want) refuse(`${what} is ${JSON.stringify(got)}, the control expects ${JSON.stringify(want)}`); };
  if (CONTROL === 'recordcounts') { expect(record.counts.write, record.write.length, "the record's count of written rows"); record.counts.write += 1; }
  if (CONTROL === 'recordvalue') { expect(u.transfermarkt.valueEur, 25000000, "Ugarte's Transfermarkt value"); u.transfermarkt.valueEur = 26000000; }
  if (CONTROL === 'recordband') { expect(u.fotmob.valueEur, 30586410, "Ugarte's FotMob value"); u.fotmob.valueEur = 1; }
  if (CONTROL === 'recordposition') { expect(u.fotmob.primary, 'Defensive Midfielder', "Ugarte's FotMob primary"); expect(u.fotmob.positions.join(','), 'DM,CM', "Ugarte's FotMob positions"); u.fotmob.primary = 'Central Midfielder'; u.fotmob.positions = ['CM']; }
  if (CONTROL === 'recordprimary') { expect(u.fotmob.primary, 'Defensive Midfielder', "Ugarte's FotMob primary"); u.fotmob.primary = 'Center Back'; }
  if (CONTROL === 'recordage') { expect(u.fotmob.born, '2001-04-11', "Ugarte's FotMob birth date"); u.fotmob.born = '2001-01-01'; }
  if (CONTROL === 'recordtmage') { expect(u.fotmob.born, '2001-04-11', "Ugarte's FotMob birth date"); u.fotmob.born = '2001-12-31'; }
  if (CONTROL === 'recordcitizenship') { expect(u.transfermarkt.citizenship.join(','), 'Uruguay', "Ugarte's Transfermarkt citizenship"); u.transfermarkt.citizenship = ['Argentina']; }
  if (CONTROL === 'recordcountry') { expect(u.fotmob.country, 'Uruguay', "Ugarte's FotMob country"); u.fotmob.country = 'Argentina'; }
  if (CONTROL === 'fixextra') {
    const i = record.corrections.findIndex(c => c.name === 'Ismaël Bennacer' && c.field === 'club');
    if (i < 0 || record.corrections.filter(c => c.name === 'Ismaël Bennacer').length !== 1) refuse('the record does not carry exactly one Bennacer correction');
    record.corrections.splice(i, 1);
  }
  if (CONTROL === 'namesakeflag') {
    const v = record.write.filter(w => w.name === 'Vitinha' && w.namesake);
    if (v.length !== 1) refuse(`the record declares ${v.length} Vitinha namesakes, not one`);
    delete v[0].namesake;
  }
  if (CONTROL === 'heldband') {
    const h = record.held.filter(x => x.name === 'Jon Gorrotxategi' && x.heldBy === 'valueBand');
    if (h.length !== 1) refuse(`the record holds ${h.length} Jon Gorrotxategi rows for their value, not one`);
    h[0].fotmob.valueEur = Math.round(h[0].transfermarktValueEur * record.valueBand.percentiles.median);
  }
}
{
  const u = ugarteOf(recordDisk);
  const UGARTE_LINE = `(${q(u.name)}, ${q(u.club)}, ${q(u.nationality)}, ${u.age}, ${u.value_usd}, null, null)`;
  const sqlCode = () => lexSql(sqlText).code;
  if (CONTROL === 'dollarquote') {
    const anchor = 'end $$;\n\ncommit;';
    once(sqlText, anchor, 'the migration copy');
    sqlText = sqlText.replace(anchor, () => 'end $;\n\ncommit;');
  }
  if (CONTROL === 'guardcount') {
    const n = recordDisk.write.length;
    const anchor = `if n <> ${n} then raise exception 'Round 669: expected ${n} staged rows`;
    once(sqlText, anchor, 'the migration copy', sqlCode());
    sqlText = sqlText.replace(anchor, () => anchor.replace(`if n <> ${n} then`, `if n <> ${n - 1} then`));
  }
  if (CONTROL === 'stagedrift') {
    once(sqlText, UGARTE_LINE, 'the migration copy', sqlCode());
    sqlText = sqlText.replace(UGARTE_LINE, () => UGARTE_LINE.replace(`, ${u.value_usd}, `, `, ${u.value_usd + 1}, `));
  }
  if (CONTROL === 'commented') {
    const line = `  ${UGARTE_LINE},\n`;
    once(sqlText, line, 'the migration copy');
    sqlText = sqlText.replace(line, () => `  -- ${UGARTE_LINE},\n`);
  }
  if (CONTROL === 'extrastaged') {
    const line = `  ${UGARTE_LINE},\n`;
    once(sqlText, line, 'the migration copy');
    sqlText = sqlText.replace(line, () => `${line}  ('Control Player', 'Control FC', 'Uruguay', 24, 1080000, null, null),\n`);
  }
  if (CONTROL === 'stagedtwice') {
    const line = `  ${UGARTE_LINE},\n`;
    once(sqlText, line, 'the migration copy');
    sqlText = sqlText.replace(line, () => `${line}${line}`);
  }
  if (CONTROL === 'fixmissing') {
    const line = "  ('Ismaël Bennacer', 'Without Club', 'Al-Gharafa SC'),\n";
    once(sqlText, line, 'the migration copy');
    sqlText = sqlText.replace(line, () => '');
  }
  if (CONTROL === 'dryrunstale') {
    const anchor = '-- UNAPPLIED. Written for review;';
    once(sqlText, anchor, 'the migration copy');
    sqlText = sqlText.replace(anchor, () => '-- UNAPPLIED! Written for review;');
  }
}

/* ---- section 1: the record and the migration ---- */
section = 1;
console.log('1) the record and the migration');
{
  const lex = lexSql(sqlText);
  if (lex.error) fail('lex', `the migration does not lex: ${lex.error}`);
  const top = lex.statements.map(s => s.text.toLowerCase());
  if (top[0] !== 'begin') fail('lex', `the migration's first statement is not begin: ${JSON.stringify((top[0] || '').slice(0, 40))}`);
  if (!lex.error && top[top.length - 1] !== 'commit') fail('lex', `the migration's last statement is not commit: ${JSON.stringify((top[top.length - 1] || '').slice(0, 40))}`);
  const txn = lex.statements.slice(1, -1).filter(s => /^(begin|commit|rollback|end|abort|start\s+transaction|savepoint|release)\b/i.test(s.text));
  for (const s of txn) fail('lex', `a transaction statement sits inside the migration at line ${s.line}: ${s.text.slice(0, 40)}`);

  /* every number a guard compares with is the record's own */
  const N = record.write.length;
  const E = record.existingChecked.length;
  const clubFixes = record.corrections.filter(c => c.field === 'club').length;
  const ageFixes = record.corrections.filter(c => c.field === 'age').length;
  const guard = (re, want, what) => {
    const hits = [...lex.code.matchAll(re)];
    if (!hits.length) { fail('guards', `the migration has no ${what} guard`); return; }
    for (const h of hits) if (h.slice(1).some(x => Number(x) !== want)) fail('guards', `the ${what} guard reads ${h[0].trim()}, the record says ${want}`);
  };
  guard(/if n <> (\d+) then raise exception 'Round 669: expected (\d+) staged rows/g, N, 'staged row count');
  guard(/if n <> (\d+) then raise exception 'Round 669: expected (\d+) club corrections/g, clubFixes, 'club correction count');
  guard(/if n <> (\d+) then raise exception 'Round 669: expected (\d+) age corrections/g, ageFixes, 'age correction count');
  guard(/if n <> (\d+) then raise exception 'Round 669: expected the (\d+) checked/g, E, 'existing row count');
  guard(/if n <> (\d+) \+ \d+ then/g, E, 'rows after (existing part)');
  guard(/if n <> \d+ \+ (\d+) then/g, N, 'rows after (written part)');
  guard(/b\.total_2026 \+ (\d+)/g, N, 'total after');

  const c = record.counts;
  const lens = { write: record.write.length, corrections: record.corrections.length, existingChecked: record.existingChecked.length, held: record.held.length, alreadyPresent: record.alreadyPresent.length };
  for (const [k, v] of Object.entries(lens)) if (c[k] !== v) fail('counts', `the record's counts.${k} says ${c[k]}, it carries ${v}`);
  if (N === 0) fail('counts', 'the record writes nothing');

  const staged = (tuples(lex.statements, 'r669_dm') || []).map(([name, club, nationality, age, value, namesakeClub, namesakePosition]) => ({ name, club, nationality, age, value, namesakeClub, namesakePosition }));
  const key = r => `${r.name}|${r.club}`;
  const byKey = new Map();
  for (const s of staged) {
    if (byKey.has(key(s))) fail('dupstaged', `${s.name} (${s.club}) is staged twice`);
    byKey.set(key(s), s);
  }
  const want = new Set();
  const band = record.valueBand;
  for (const w of record.write) {
    want.add(key(w));
    const s = byKey.get(key(w));
    const tm = w.transfermarkt, fm = w.fotmob;
    if (!s) fail('unstaged', `${w.name} (${w.club}) is in the record but not staged in the migration`);
    else {
      if (s.nationality !== w.nationality || s.age !== w.age || s.value !== w.value_usd) fail('agree', `${w.name}: the migration stages ${s.nationality}, ${s.age}, ${s.value}; the record says ${w.nationality}, ${w.age}, ${w.value_usd}`);
      if (!!w.namesake !== !!s.namesakeClub) fail('namesakeflag', `${w.name}: a namesake in the record ${!!w.namesake}, in the migration ${!!s.namesakeClub}`);
    }
    if (w.value_usd !== Math.round(tm.valueEur * record.eurUsdRate)) fail('rate', `${w.name}: ${w.value_usd} is not Transfermarkt's EUR ${tm.valueEur} times ${record.eurUsdRate}`);
    const ratio = fm.valueEur / tm.valueEur;
    if (!(ratio >= band.low && ratio <= band.high)) fail('band', `${w.name}: FotMob's EUR ${fm.valueEur} is ${ratio.toFixed(3)} of Transfermarkt's EUR ${tm.valueEur}, outside ${band.low} to ${band.high}`);
    if (!fm.positions.includes('DM')) fail('position', `${w.name}: FotMob does not list defensive midfield among the positions he has played`);
    if (OUTSIDE_MIDFIELD.has(fm.primary)) fail('primary', `${w.name}: FotMob's primary for him is ${fm.primary}, a defender or a winger`);
    if (w.age !== ageOn(fm.born, record.ageReference) || (tm.born && w.age !== ageOn(tm.born, record.ageReference))) fail('age', `${w.name}: the row says ${w.age}, his age on ${record.ageReference} from his birth date is ${ageOn(fm.born, record.ageReference)}`);
    if (tm.age !== ageOn(tm.born || fm.born, record.checkedOn)) fail('identityage', `${w.name}: Transfermarkt gives ${tm.age} today, the birth date gives ${ageOn(tm.born || fm.born, record.checkedOn)}`);
    if (w.nationality !== tm.citizenship[0]) fail('citizenship', `${w.name}: the row's country ${w.nationality} is not Transfermarkt's first citizenship ${tm.citizenship[0]}`);
    if (!sameCountry(w.nationality, fm.country)) fail('country', `${w.name}: FotMob plays him for ${fm.country}, the row says ${w.nationality}`);
  }
  for (const s of staged) if (!want.has(key(s))) fail('extra', `${s.name} (${s.club}) is staged but the record does not write him`);

  const fixKey = (field, name, from, to) => `${field}|${name}|${from}|${to}`;
  const wantFix = new Set(record.corrections.map(x => fixKey(x.field, x.name, x.from, x.to)));
  const gotFix = new Set([
    ...(tuples(lex.statements, 'r669_fix') || []).map(([name, from, to]) => fixKey('club', name, from, to)),
    ...(tuples(lex.statements, 'r669_age') || []).map(([name, from, to]) => fixKey('age', name, from, to)),
  ]);
  for (const k of wantFix) if (!gotFix.has(k)) fail('fixUnstaged', `the correction ${k} is in the record but not the migration`);
  for (const k of gotFix) if (!wantFix.has(k)) fail('fixUnrecorded', `the migration corrects ${k}, which the record does not`);

  /* every held row is held for the reason it gives, and none is written */
  const written = new Set(record.write.map(key));
  for (const h of record.held) {
    if (written.has(key(h))) fail('heldconsistent', `${h.name} (${h.club}) is both held and written`);
    if (h.heldBy === 'valueBand') {
      const ratio = h.fotmob.valueEur / h.transfermarktValueEur;
      if (ratio >= band.low && ratio <= band.high) fail('heldconsistent', `${h.name} is held for his value, but FotMob's figure is ${ratio.toFixed(3)} of Transfermarkt's, inside the band`);
    }
    if (h.heldBy === 'position' && !OUTSIDE_MIDFIELD.has(h.fotmob.primary)) fail('heldconsistent', `${h.name} is held for his position, but FotMob's primary is ${h.fotmob.primary}, a midfield role`);
  }

  /* the dry run the record carries is a run of this file, byte for byte */
  const sha = createHash('sha256').update(sqlText, 'utf8').digest('hex');
  const dr = record.dryRun;
  if (!dr) fail('dryrun', 'the record carries no dry run of the migration');
  else {
    if (dr.migrationSha256 !== sha) fail('dryrun', `the dry run was of a different file (sha256 ${String(dr.migrationSha256).slice(0, 12)}, the file on disk is ${sha.slice(0, 12)}): run it again and record it`);
    if (dr.result !== 'ran to the end, no exception') fail('dryrun', `the dry run's result is ${JSON.stringify(dr.result)}`);
    if (dr.before?.dm2026 !== E || dr.afterRollback?.dm2026 !== E || dr.before?.total2026 !== dr.afterRollback?.total2026) fail('dryrun', `the dry run's counts do not show an unchanged table: ${JSON.stringify({ before: dr.before, afterRollback: dr.afterRollback })}`);
  }
  console.log(`   ${staged.length} staged rows against ${N} in the record; ${gotFix.size} corrections against ${wantFix.size}; ${record.held.length} held; ${lex.statements.length} top level statements, begin to commit${dr ? `; dry run of ${dr.ranOn}` : ''}`);
}

/* ---- the pool, fetched by the game's own code ---- */
const client = readText(path.join(ROOT, 'src/integrations/supabase/client.ts'));
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const realFetch = globalThis.fetch;
const H = { apikey: KEY, authorization: `Bearer ${KEY}` };

async function allLive2026() {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const res = await realFetch(`${URL_}/rest/v1/player_market_values?select=id,player_name,nationality,position,club,market_value_usd,year,age&year=eq.2026&market_value_usd=gt.0&order=id.asc&limit=1000&offset=${off}`, { headers: H });
    if (!res.ok) { console.error(`DATABASE REFUSED THE 2026 READ (HTTP ${res.status}). NOTHING WAS CHECKED.`); process.exit(1); }
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

let served2026 = null; // the projected 2026 snapshot, when projecting
if (PROJECT) {
  const live = await allLive2026();
  const landed = recordDisk.write.filter(w => live.some(r => r.player_name === w.name && r.club === w.club && r.position === 'Defensive Midfield'));
  if (landed.length) {
    console.error(`WXIDM_PROJECT refuses: ${landed.length} of the record's rows are already live (${landed.slice(0, 3).map(w => w.name).join(', ')}), so the migration is applied. Run without WXIDM_PROJECT.`);
    process.exit(2);
  }
  for (const c of recordDisk.corrections) {
    for (const r of live) {
      if (r.player_name !== c.name || r.position !== 'Defensive Midfield') continue;
      if (c.field === 'club' && r.club === c.from) r.club = c.to;
      if (c.field === 'age' && r.age === c.from) r.age = c.to;
    }
  }
  let id = Math.max(...live.map(r => r.id));
  served2026 = [...live, ...recordDisk.write.map(w => ({ id: ++id, player_name: w.name, nationality: w.nationality, position: 'Defensive Midfield', club: w.club, market_value_usd: w.value_usd, year: 2026, age: w.age }))];
  console.log(`\n   PROJECTED FROM THE RECORD (not the SQL): the live ${live.length} rows of 2026 plus the record's ${recordDisk.write.length} rows and ${recordDisk.corrections.length} corrections`);
}

let controlDropped = 0;
let controlAdded = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (!url.pathname.endsWith('/rest/v1/player_market_values')) return realFetch(input, init);
  const is2026 = url.searchParams.get('year') === 'eq.2026';
  const off = Number(url.searchParams.get('offset') || 0);
  let rows;
  if (PROJECT && is2026) {
    const lim = Number(url.searchParams.get('limit') || 1000);
    rows = served2026.slice(off, off + lim);
  } else {
    const res = await realFetch(input, init);
    if (!res.ok || !is2026 || (CONTROL !== 'noplayer' && CONTROL !== 'dupname')) return res;
    rows = await res.json();
  }
  if (CONTROL === 'noplayer' && is2026) {
    const before = rows.length;
    rows = rows.filter(r => !(r.player_name === 'Manuel Ugarte' && r.club === 'Manchester United'));
    controlDropped += before - rows.length;
  }
  if (CONTROL === 'dupname' && is2026 && off === 0) {
    rows = [...rows, { player_name: 'Manuel Ugarte', nationality: 'Uruguay', position: 'Defensive Midfield', club: 'Control FC', market_value_usd: 1080000, year: 2026, age: 24 }];
    controlAdded += 1;
  }
  return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
};

/* bundle worldXi exactly as the page uses it; the source controls swap a
   file's text in memory through a load hook, never on disk */
const swaps = new Map();
const swapSource = (rel, pairs) => {
  const f = path.join(ROOT, rel);
  let text = readText(f);
  for (const [a, b] of pairs) {
    once(text, a, rel, jsCode(text));
    text = text.replace(a, () => b);
  }
  swaps.set(path.normalize(f), text);
};
if (CONTROL === 'normalize') swapSource('src/lib/squadDeal.ts', [["'Defensive Midfield': 'CDM'", "'Defensive Midfield': 'CB'"]]);
if (CONTROL === 'cmslot') {
  swapSource('src/lib/squadDeal.ts', [["const MD: Position[] = ['CM', 'CDM', 'CAM'];", "const MD: Position[] = ['CM', 'CAM'];"]]);
  swapSource('src/lib/positionFit.ts', [["CDM: ['CM'], CAM: ['CM'],", "CDM: [], CAM: ['CM'],"]]);
}
if (CONTROL === 'nosearch') swapSource('src/lib/worldXi.ts', [['if (q.length < 2) return [];', "if (q.length < 2 || q.includes(' ')) return [];"]]);
if (CONTROL === 'namesake') {
  swapSource('src/lib/worldXi.ts', [
    ['prev.byClub.get(club)', "prev.byClub.get('')"],
    ['prev.byClub.set(club, player)', "prev.byClub.set('', player)"],
    ['new Map([[club, player]])', "new Map([['', player]])"],
  ]);
}
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simWxiDm-'));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `const w = await import('${ROOT.replaceAll('\\', '/')}/src/lib/worldXi.ts');`,
  `const s = await import('${ROOT.replaceAll('\\', '/')}/src/lib/squadDeal.ts');`,
  'export const { fetchWorldXiPool, fitsSlot, suggestCountryPlayers } = w;',
  'export const { FORMATIONS } = s;',
].join('\n'));
let swapped = 0;
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') },
  plugins: [{
    name: 'control-swap',
    setup(b) {
      b.onLoad({ filter: /\.tsx?$/ }, args => {
        const text = swaps.get(path.normalize(args.path));
        if (text === undefined) return undefined;
        swapped += 1;
        return { contents: text, loader: 'ts' };
      });
    },
  }],
});
if (swaps.size && swapped !== swaps.size) refuse(`${swaps.size} source swaps prepared, ${swapped} reached the bundle`);
const { fetchWorldXiPool, fitsSlot, suggestCountryPlayers, FORMATIONS } = await import(pathToFileURL(BUNDLE).href);
const data = await fetchWorldXiPool();
fs.rmSync(TMP, { recursive: true, force: true });
if (!data) {
  console.error('SUPABASE UNREACHABLE OR POOL TOO SMALL. NOTHING WAS CHECKED.');
  process.exit(1);
}
if (CONTROL === 'noplayer' && controlDropped !== 1) refuse(`it should drop exactly one Ugarte row from what the game is served, it dropped ${controlDropped}`);
if (CONTROL === 'dupname' && controlAdded !== 1) refuse(`it should add exactly one second Ugarte row to what the game is served, it added ${controlAdded}`);

const at = (name, club) => data.players.filter(p => p.name === name && p.club === club);

/* ---- the named current defensive midfielders (the report's four, then the
   research's most valuable and most widely known, across leagues). Robert
   Andrich was on the first list and is held now (FotMob plays him at centre
   back), so Kaishu Sano takes his place. Namesakes are held in section 4, so
   the namesake control cannot reach this list. ---- */
const NAMED = [
  ['Manuel Ugarte', 'Manchester United', 'Uruguay'],
  ['Sofyan Amrabat', 'Ajax Amsterdam', 'Morocco'],
  ['Wataru Endo', 'Liverpool FC', 'Japan'],
  ['Tyler Adams', 'AFC Bournemouth', 'United States'],
  ['Aleksandar Pavlovic', 'Bayern Munich', 'Germany'],
  ['Adam Wharton', 'Crystal Palace', 'England'],
  ['Carlos Baleba', 'Manchester United', 'Cameroon'],
  ['Angelo Stiller', 'VfB Stuttgart', 'Germany'],
  ['James Garner', 'Everton FC', 'England'],
  ['Morten Hjulmand', 'Atlético de Madrid', 'Denmark'],
  ['Máximo Perrone', 'Como 1907', 'Argentina'],
  ['Alan Varela', 'FC Porto', 'Argentina'],
  ['Aleksandar Stanković', 'Inter Milan', 'Serbia'],
  ['Ethan Ampadu', 'Leeds United', 'Wales'],
  ['Tyler Morton', 'Olympique Lyon', 'England'],
  ['Nicolas Seiwald', 'RB Leipzig', 'Austria'],
  ['Sander Berge', 'Fulham FC', 'Norway'],
  ['Youssouf Fofana', 'Sevilla FC', 'France'],
  ['Ardon Jashari', 'AC Milan', 'Switzerland'],
  ['Roméo Lavia', 'Chelsea FC', 'Belgium'],
  ['Samuele Ricci', 'Como 1907', 'Italy'],
  ['Billy Gilmour', 'SSC Napoli', 'Scotland'],
  ['Ibrahim Sangaré', 'Nottingham Forest', "Cote d'Ivoire"],
  ['Marc Casadó', 'Deportivo de La Coruña', 'Spain'],
  ['Richard Ríos', 'Al-Ittihad Club', 'Colombia'],
  ['Bryan Cristante', 'AS Roma', 'Italy'],
  ['Jefferson Lerma', 'Crystal Palace', 'Colombia'],
  ['Callum McGregor', 'Celtic FC', 'Scotland'],
  ['Kaishu Sano', '1.FSV Mainz 05', 'Japan'],
  ['Andrés Cubas', 'Vancouver Whitecaps FC', 'Paraguay'],
];
/* [name, the club the record writes, the club of the other man already in 2026, country] */
const NAMESAKES = [
  ['Vitinha', 'Paris Saint-Germain', 'Genoa CFC', 'Portugal'],
];

/* ---- section 2: the named current defensive midfielders are in the pool ---- */
section = 2;
console.log('\n2) the named current defensive midfielders are in the pool the game fetches');
{
  let present = 0;
  for (const [name, club, country] of NAMED) {
    const hit = at(name, club).find(p => p.country === country);
    if (!hit) { fail('named', `${name} (${club}, ${country}) is not in the World XI pool, so his slot says nobody matches`); continue; }
    const offered = suggestCountryPlayers(data, country, name).some(p => p.name === name && p.club === club);
    if (!offered) { fail('search', `${name} is pooled but a search for his name in ${country}'s slot does not offer him`); continue; }
    present += 1;
  }
  let writtenIn = 0;
  const missing = [];
  for (const w of recordDisk.write) {
    if (at(w.name, w.club).length) writtenIn += 1;
    else missing.push(`${w.name} (${w.club})`);
  }
  if (missing.length) fail('staged', `${missing.length} of the record's rows are not in the pool, e.g. ${missing.slice(0, 4).join(', ')}`);
  const cdm = data.players.filter(p => p.position === 'CDM').length;
  console.log(`   ${present} of ${NAMED.length} named defensive midfielders pooled and offered by search (before Round 669: 0)`);
  console.log(`   ${writtenIn} of the record's ${recordDisk.write.length} rows pooled; ${cdm} pooled CDMs of ${data.players.length} players (before Round 669: 46)`);
}

/* ---- section 3: they fit the slots ---- */
section = 3;
console.log('\n3) they fit every CDM and CM slot the formations have');
{
  const slots = FORMATIONS.flatMap(f => f.slots.filter(s => s.label === 'CDM' || s.label === 'CM').map(s => ({ ...s, formation: f.name })));
  const cdmSlots = slots.filter(s => s.label === 'CDM').length;
  const cmSlots = slots.filter(s => s.label === 'CM').length;
  if (!cdmSlots || !cmSlots) refuse(`the formations offer ${cdmSlots} CDM and ${cmSlots} CM slots; both must exist or this section measures nothing`);
  let checked = 0;
  let misfit = 0;
  for (const w of recordDisk.write) {
    for (const p of at(w.name, w.club)) {
      checked += 1;
      if (p.position !== 'CDM') { misfit += 1; fail('cdm', `${p.name} (${p.club}) is pooled as ${p.position}, not CDM`); continue; }
      const bad = slots.filter(sl => !fitsSlot(p, sl)).map(sl => `${sl.formation} ${sl.label}`);
      if (bad.length) { misfit += 1; fail('slots', `${p.name} (${p.club}) does not take ${bad.slice(0, 3).join(', ')}${bad.length > 3 ? ` and ${bad.length - 3} more` : ''}`); }
    }
  }
  if (checked === 0) fail('slots', "none of the record's rows is in the pool, so no slot was checked");
  console.log(`   ${checked - misfit} of ${checked} pooled written players fit all ${cdmSlots} CDM and ${cmSlots} CM slots across ${FORMATIONS.length} formations`);
}

/* ---- section 4: namesakes stay two people, and only declared ones ---- */
section = 4;
console.log('\n4) namesakes stay two people, and every name in the pool twice is a declared namesake');
{
  for (const [name, newClub, oldClub, country] of NAMESAKES) {
    const a = data.players.find(p => p.name === name && p.club === newClub);
    const b = data.players.find(p => p.name === name && p.club === oldClub);
    if (!a) fail('namesake', `${name} of ${newClub} is not in the pool`);
    if (!b) fail('namesake', `${name} of ${oldClub} is not in the pool (a namesake swallowed him)`);
    if (a && b && country) {
      const offered = suggestCountryPlayers(data, country, name.toLowerCase()).filter(p => p.name === name).map(p => p.club);
      if (!(offered.includes(newClub) && offered.includes(oldClub))) fail('namesake', `a search for "${name.toLowerCase()}" in ${country}'s slot offers ${offered.join(' and ') || 'nobody'}, not both`);
    }
    console.log(`   ${name}: ${a ? newClub : 'MISSING ' + newClub} and ${b ? oldClub : 'MISSING ' + oldClub}`);
  }
  const clubsOf = new Map();
  for (const p of data.players) {
    if (!clubsOf.has(p.name)) clubsOf.set(p.name, []);
    clubsOf.get(p.name).push(p.club);
  }
  const declared = new Map(NAMESAKES.map(([name, a, b]) => [name, [a, b].sort().join(' and ')]));
  let twice = 0;
  for (const [name, clubs] of clubsOf) {
    if (clubs.length < 2) continue;
    twice += 1;
    const got = [...clubs].sort().join(' and ');
    if (!declared.has(name)) fail('declared', `${name} is in the pool ${clubs.length} times (${got}) and is not a declared namesake: a second row for one man, or a namesake nobody checked`);
    else if (declared.get(name) !== got) fail('declared', `${name} is in the pool at ${got}, declared as ${declared.get(name)}`);
  }
  console.log(`   ${twice} name${twice === 1 ? '' : 's'} in the pool more than once, ${declared.size} declared`);
}

/* ======================================================================= */
/* The verdict sets exitCode and lets the process end on its own: calling
   process.exit here, with fetch's sockets still closing, crashed Node on
   Windows once in 26 control runs (a libuv assertion, exit 3221226505). */
console.log('');
const red = [...failed.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const [want, checks] = CONTROLS[CONTROL];
  const missed = checks.filter(c => !firedChecks.has(c));
  if (red.length === 1 && red[0] === want && !missed.length) {
    console.log(`${MARK} ${CONTROL}: section ${want} went red through ${checks.join(' and ')} (${failed.get(want)} finding${failed.get(want) === 1 ? '' : 's'}) and no other section did.`);
    process.exitCode = 1;
  } else {
    console.error(`simWorldXiDefensiveMids control ${CONTROL}: CONTROL FAILED. Expected only section ${want} red through ${checks.join(' and ')}; got section${red.length === 1 ? '' : 's'} ${red.length ? red.join(', ') : 'none'}${missed.length ? `, and ${missed.join(', ')} never fired` : ''}.`);
    process.exitCode = 4;
  }
} else if (red.length) {
  const n = [...failed.values()].reduce((a, b) => a + b, 0);
  console.error(`simWorldXiDefensiveMids${PROJECT ? ' (projected from the record)' : ''}: ${n} failure${n === 1 ? '' : 's'} in section${red.length === 1 ? '' : 's'} ${red.join(', ')}.`);
  if (!PROJECT && red.includes(2)) console.error('If supabase/migrations/20260928_round_669_defensive_midfield_2026.sql is not applied yet, that is why: WXIDM_PROJECT=1 measures the record before it lands.');
  process.exitCode = 1;
} else {
  console.log(`simWorldXiDefensiveMids${PROJECT ? ' (projected from the record; the migration is not applied yet)' : ''}: green. The migration lexes and stages the record, the defensive midfielders are pooled, offered and fit their slots, and only declared namesakes are two people.`);
  process.exitCode = 0;
}
