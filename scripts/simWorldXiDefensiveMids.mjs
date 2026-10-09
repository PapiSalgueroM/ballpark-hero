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
 *      carries a dry run of THIS file's statements: it was run on the live
 *      database inside BEGIN and ROLLBACK, ran to the end, and the sha256 of
 *      its top level statements recorded with that result (codeSha256) is the
 *      sha256 of the statements on disk, so a change to anything Postgres would
 *      run turns this red until the dry run is repeated. Comments are not
 *      hashed: they do not run (the dry run's own wrapper started after the
 *      header), so the header can carry the apply procedure without voiding
 *      the dry run. The SQL is read as code: comments are blanked by the lexer
 *      before anything is parsed, and CRLF is normalised first because a
 *      Windows checkout is CRLF.
 *   2. The named current defensive midfielders are in the pool World XI itself
 *      fetches (fetchWorldXiPool, bundled from src/lib/worldXi.ts): the
 *      report's four plus a list from the research, each at his club with his
 *      country, and a search for his name in his country's slot offers him;
 *      and every row the record writes is a pooled player at its club.
 *      Measured before the migration: 0 of the named are there.
 *      THE RECORD IS PINNED TO ITS CHECK DATE (record.checkedOn), not to the
 *      table forever. A row may differ from the record only where a later
 *      check says so: an entry in the record's laterChecks, dated after
 *      checkedOn and not after the day the fence runs (UTC), from a round
 *      after this one, naming the row by the name and
 *      club the record wrote, the field it changes (club, nationality or
 *      position), the value the table now carries, and two sources on two
 *      different hosts. The newest valid entry for a field wins, and every
 *      check in sections 2 to 4 reads the row through it. Each written row is
 *      held to that on all three fields: a row pooled at a club that neither
 *      the record nor a valid later entry names is a finding (moved), a row
 *      pooled for a country neither names is a finding (differs), and a row
 *      pooled at a position neither names fails section 3 (cdm). So is an
 *      entry that breaks any of those rules (laterentry), and it explains
 *      nothing. The written rows themselves are never edited: they are what
 *      the migration wrote, and section 1 holds them to it. An entry records a
 *      changed row, not a removed one: a round that deletes one of these rows
 *      says so here, in the fence, not in the record.
 *   3. They fit the slots Round 319's rules give them: every written row found
 *      in the pool is a CDM and fits every CDM and every CM slot in every
 *      formation (or, where a later check moved his position, sits at the
 *      position it names).
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
 *     nocommit        the closing `commit;` is dropped                          frame
 *     innercommit     `commit; begin;` lands between the guards and the insert  txn
 *     guardcount      the staged row guard expects one row fewer                guards
 *     guardafter      the post write DM count guard adds one row fewer          guards
 *     stagedrift      Ugarte's staged value moved by one dollar                 agree
 *     commented       Ugarte's staged line commented out                        unstaged
 *     extrastaged     a row the record does not write is staged                 extra
 *     stagedtwice     Ugarte's staged line appears twice                        dupstaged
 *     fixmissing      Bennacer's club correction dropped from the SQL           fixUnstaged
 *     dryrunstale     one character of a raise message changed after the run   dryrun
 *   section 1, the record copy:
 *     dryrunkept      the dry run's counts after ROLLBACK keep the written rows dryrunoutcome
 *     dryrunraised    the dry run's result says it raised                       dryrunoutcome
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
 *     heldband        a row held for its value is moved inside the band         heldvalue
 *     heldposition    a row held for its position gets a midfield primary       heldposition
 *     heldwritten     a held row is given a written row's name and club         heldwritten
 *   The controls below that change the table or add a later check act on the
 *   CONTROL SUBJECT: the first named man whom no later check names (Manuel
 *   Ugarte while nothing names him), so a later round that moves Ugarte and
 *   records it moves the controls to the next man instead of breaking them.
 *   section 2:
 *     noplayer        the subject's 2026 row dropped from what the game is served named, staged
 *     nosearch        worldXi.ts' search refuses any query with a space         search
 *     moved           the subject served at another club, no later check says so moved
 *     recountry       the subject served for another country, no later check     differs
 *     latestale       a later check for the subject dated on the record's day    laterentry
 *     latefuture      a later check for the subject dated a year after today     laterentry
 *     lateonehost     a later check whose two sources are one host (.com, .de)  laterentry
 *     lateorphan      a later check naming a row the record does not write      laterentry
 *     (each of the four must be refused by its own rule and by no other: the
 *     rest of its entry is the valid one movedsourced uses)
 *   section 3:
 *     normalize       "Defensive Midfield" normalised to CB in squadDeal.ts     cdm
 *     cmslot          CM slots stop taking a CDM (squadDeal.ts, positionFit.ts) slots
 *     reposition      the subject served at central midfield, no later check    cdm
 *   section 4:
 *     namesake        the Round 669 same year keying by club undone in worldXi  namesake
 *     dupname         a second 2026 row of the subject, at another club, served  declared
 * POSITIVE CONTROLS prove a rule lets through what it must, so the pins above
 * can be lived with. Each must leave every section green AND show that its
 * change reached the check (exit 0 and the held mark); otherwise it exits 4.
 *     movedsourced    the subject at another club WITH a valid later check       section 2
 *     recountrysourced  the subject for another country WITH a valid one       section 2
 *     repositionsourced the subject at central midfield WITH a valid one       section 3
 *     commentonly     one character of a comment changed after the dry run      section 1
 * The controls that write a later check run the fence's clock as of the day
 * after the record's check when today is still the record's own day, because
 * no later check can be dated before then; only the clock moves, never a rule.
 * WXIDM_CONTROL=all runs the baseline first and refuses unless it is green,
 * then every control and every positive control in turn, and is green only if
 * each one behaved. Before the migration is applied the live baseline is red
 * by design, so WXIDM_CONTROL=all needs WXIDM_PROJECT=1 until the migration
 * lands, and runs alone after it.
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
  dollarquote: [1, ['lex']], nocommit: [1, ['frame']], innercommit: [1, ['txn']],
  guardcount: [1, ['guards']], guardafter: [1, ['guards']], stagedrift: [1, ['agree']], commented: [1, ['unstaged']],
  extrastaged: [1, ['extra']], stagedtwice: [1, ['dupstaged']], fixmissing: [1, ['fixUnstaged']], dryrunstale: [1, ['dryrun']],
  dryrunkept: [1, ['dryrunoutcome']], dryrunraised: [1, ['dryrunoutcome']],
  recordcounts: [1, ['counts']], fixextra: [1, ['fixUnrecorded']], namesakeflag: [1, ['namesakeflag']],
  recordvalue: [1, ['rate']], recordband: [1, ['band']], recordposition: [1, ['position']], recordprimary: [1, ['primary']],
  recordage: [1, ['age']], recordtmage: [1, ['identityage']], recordcitizenship: [1, ['citizenship']],
  recordcountry: [1, ['country']], heldband: [1, ['heldvalue']], heldposition: [1, ['heldposition']], heldwritten: [1, ['heldwritten']],
  noplayer: [2, ['named', 'staged']], nosearch: [2, ['search']],
  moved: [2, ['moved']], recountry: [2, ['differs']],
  latestale: [2, ['laterentry']], latefuture: [2, ['laterentry']], lateonehost: [2, ['laterentry']], lateorphan: [2, ['laterentry']],
  normalize: [3, ['cdm']], cmslot: [3, ['slots']], reposition: [3, ['cdm']],
  namesake: [4, ['namesake']], dupname: [4, ['declared']],
};
/* the one later check rule each laterentry control breaks: it must be the only
   rule that fires, or the control proves some other rule and not its own */
const LATER_RULE = { latestale: 'stale', latefuture: 'future', lateonehost: 'hosts', lateorphan: 'orphan' };
/* positive controls: [the section whose rule they exercise, what they change] */
const POSITIVES = {
  movedsourced: [2, 'the control subject served at another club with a valid later check'],
  recountrysourced: [2, 'the control subject served for another country with a valid later check'],
  repositionsourced: [3, 'the control subject served at central midfield with a valid later check'],
  commentonly: [1, 'one character of a migration comment changed after the dry run'],
};
const CONTROL = process.env.WXIDM_CONTROL || '';
const MARK = 'WXIDM-CONTROL-BEHAVED';
const HELD = 'WXIDM-POSITIVE-HELD';
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
  for (const name of Object.keys(POSITIVES)) {
    const r = spawnSync(process.execPath, [SELF], { env: { ...process.env, WXIDM_CONTROL: name }, encoding: 'utf8' });
    const out = `${r.stdout || ''}\n${r.stderr || ''}`;
    const ok = r.status === 0 && out.includes(`${HELD} ${name}:`);
    if (!ok) bad += 1;
    const lines = out.trim().split('\n').filter(Boolean);
    const shown = (ok ? lines.find(l => l.startsWith(`${HELD} ${name}:`)) : lines.pop()) || '';
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${name.padEnd(17)} exit ${r.status}  ${shown}`);
    if (!ok) for (const l of out.trim().split('\n').filter(Boolean).slice(-12)) console.log(`         | ${l}`);
  }
  const total = Object.keys(CONTROLS).length + Object.keys(POSITIVES).length;
  console.log('');
  if (bad) { console.error(`simWorldXiDefensiveMids controls: ${bad} of ${total} did not behave.`); process.exit(1); }
  console.log(`simWorldXiDefensiveMids controls: green. All ${Object.keys(CONTROLS).length} turned their own section red with their own check, and no other section; all ${Object.keys(POSITIVES).length} positive controls reached their check and left every section green.`);
  process.exit(0);
}
if (CONTROL && !(CONTROL in CONTROLS) && !(CONTROL in POSITIVES)) {
  console.error(`WXIDM_CONTROL=${CONTROL} is not a control this harness knows (${[...Object.keys(CONTROLS), ...Object.keys(POSITIVES)].join(', ')}, all)`);
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
if (CONTROL in CONTROLS) console.log(`NEGATIVE CONTROL ${CONTROL} is on: section ${CONTROLS[CONTROL][0]} is SUPPOSED to go red with check ${CONTROLS[CONTROL][1].join(' and ')}, and no other section.\n`);
if (CONTROL in POSITIVES) console.log(`POSITIVE CONTROL ${CONTROL} is on (${POSITIVES[CONTROL][1]}): every section is SUPPOSED to stay green, section ${POSITIVES[CONTROL][0]} included.\n`);

/* ---- per section, per check bookkeeping ---- */
let commentOnlyEdit = false; // the positive control commentonly changed the bytes and not the statements
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
if (CONTROL.startsWith('record') || ['fixextra', 'namesakeflag', 'heldband', 'heldposition', 'heldwritten', 'dryrunkept', 'dryrunraised'].includes(CONTROL)) {
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
  if (CONTROL === 'heldposition') {
    const h = record.held.filter(x => x.name === 'Jerdy Schouten' && x.heldBy === 'position');
    if (h.length !== 1) refuse(`the record holds ${h.length} Jerdy Schouten rows for their position, not one`);
    expect(h[0].fotmob.primary, 'Center Back', "Schouten's FotMob primary");
    h[0].fotmob.primary = 'Defensive Midfielder';
  }
  if (CONTROL === 'heldwritten') {
    const h = record.held.filter(x => x.name === 'Wouter Burger' && x.club === 'TSG 1899 Hoffenheim');
    if (h.length !== 1) refuse(`the record holds ${h.length} Wouter Burger rows, not one`);
    h[0].name = u.name;
    h[0].club = u.club;
  }
  if (CONTROL === 'dryrunkept') {
    expect(record.dryRun?.afterRollback?.dm2026, record.existingChecked.length, "the dry run's Defensive Midfield count after ROLLBACK");
    record.dryRun.afterRollback.dm2026 += record.write.length;
  }
  if (CONTROL === 'dryrunraised') {
    expect(record.dryRun?.result, 'ran to the end, no exception', "the dry run's result");
    record.dryRun.result = 'raised: Round 669: expected 46 checked Defensive Midfield rows';
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
  if (CONTROL === 'nocommit') {
    const anchor = 'end $$;\n\ncommit;';
    once(sqlText, anchor, 'the migration copy');
    sqlText = sqlText.replace(anchor, () => 'end $$;\n');
  }
  if (CONTROL === 'innercommit') {
    const anchor = '\ninsert into public.player_market_values (';
    once(sqlText, anchor, 'the migration copy', sqlCode());
    sqlText = sqlText.replace(anchor, () => `\ncommit;\nbegin;\n${anchor}`);
  }
  if (CONTROL === 'guardafter') {
    const E = recordDisk.existingChecked.length, n = recordDisk.write.length;
    const anchor = `if n <> ${E} + ${n} then`;
    once(sqlText, anchor, 'the migration copy', sqlCode());
    sqlText = sqlText.replace(anchor, () => `if n <> ${E} + ${n - 1} then`);
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
    const anchor = "'Round 669: staged rows repeat a name: %'";
    once(sqlText, anchor, 'the migration copy', sqlCode());
    sqlText = sqlText.replace(anchor, () => "'Round 669: staged rows repeat a name! %'");
  }
  if (CONTROL === 'commentonly') {
    const anchor = '-- Round 669 (2026-09-28, fixed the same day): World XI knows its defensive';
    once(sqlText, anchor, 'the migration copy');
    if (count(sqlCode(), anchor) !== 0) refuse('the anchor is in the code, not only in a comment');
    sqlText = sqlText.replace(anchor, () => '-- Round 669 (2026-09-28, fixed the same day)! World XI knows its defensive');
  }
}

/* ---- section 1: the record and the migration ---- */
section = 1;
console.log('1) the record and the migration');
{
  const lex = lexSql(sqlText);
  if (lex.error) fail('lex', `the migration does not lex: ${lex.error}`);
  const top = lex.statements.map(s => s.text.toLowerCase());
  if (top[0] !== 'begin') fail('frame', `the migration's first statement is not begin: ${JSON.stringify((top[0] || '').slice(0, 40))}`);
  if (!lex.error && top[top.length - 1] !== 'commit') fail('frame', `the migration's last statement is not commit: ${JSON.stringify((top[top.length - 1] || '').slice(0, 40))}`);
  const txn = lex.statements.slice(1, -1).filter(s => /^(begin|commit|rollback|end|abort|start\s+transaction|savepoint|release)\b/i.test(s.text));
  for (const s of txn) fail('txn', `a transaction statement sits inside the migration at line ${s.line}: ${s.text.slice(0, 40)}`);

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
    if (written.has(key(h))) fail('heldwritten', `${h.name} (${h.club}) is both held and written`);
    if (h.heldBy === 'valueBand') {
      const ratio = h.fotmob.valueEur / h.transfermarktValueEur;
      if (ratio >= band.low && ratio <= band.high) fail('heldvalue', `${h.name} is held for his value, but FotMob's figure is ${ratio.toFixed(3)} of Transfermarkt's, inside the band`);
    }
    if (h.heldBy === 'position' && !OUTSIDE_MIDFIELD.has(h.fotmob.primary)) fail('heldposition', `${h.name} is held for his position, but FotMob's primary is ${h.fotmob.primary}, a midfield role`);
  }

  /* the dry run the record carries is a run of this file's STATEMENTS. The
     statements are hashed, not the bytes: a comment is never executed (the
     dry run's own wrapper started after the header), so the header may say
     more after the dry run, while any change to what Postgres would run
     turns this red until the dry run is repeated. */
  const sha = t => createHash('sha256').update(t, 'utf8').digest('hex');
  const fileSha = sha(sqlText);
  const codeSha = sha(lex.statements.map(s => s.text).join(';\n'));
  commentOnlyEdit = fileSha !== sha(sqlOnDisk) && codeSha === sha(lexSql(sqlOnDisk).statements.map(s => s.text).join(';\n'));
  const dr = record.dryRun;
  let shaNote = '';
  if (!dr) fail('dryrun', 'the record carries no dry run of the migration');
  else {
    if (!dr.codeSha256) fail('dryrun', "the record's dry run carries no codeSha256, the sha256 of the statements it ran");
    else if (dr.codeSha256 !== codeSha) fail('dryrun', `the dry run was of different statements (codeSha256 ${String(dr.codeSha256).slice(0, 12)}, the file on disk gives ${codeSha.slice(0, 12)}): run it again and record it`);
    else shaNote = fileSha === dr.migrationSha256 ? '; the file is byte for byte the one dry run' : '; comments changed since the dry run, its statements did not';
    if (dr.result !== 'ran to the end, no exception') fail('dryrunoutcome', `the dry run's result is ${JSON.stringify(dr.result)}`);
    if (dr.before?.dm2026 !== E || dr.afterRollback?.dm2026 !== E || dr.before?.total2026 !== dr.afterRollback?.total2026) fail('dryrunoutcome', `the dry run's counts do not show an unchanged table: ${JSON.stringify({ before: dr.before, afterRollback: dr.afterRollback })}`);
  }
  console.log(`   ${staged.length} staged rows against ${N} in the record; ${gotFix.size} corrections against ${wantFix.size}; ${record.held.length} held; ${lex.statements.length} top level statements, begin to commit${dr ? `; dry run of ${dr.ranOn}${shaNote}` : ''}`);
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
    /* a connect timeout on a loaded machine is not a finding: three tries, then say nothing was checked */
    let res = null;
    for (let t = 1; !res; t += 1) {
      try { res = await realFetch(`${URL_}/rest/v1/player_market_values?select=id,player_name,nationality,position,club,market_value_usd,year,age&year=eq.2026&market_value_usd=gt.0&order=id.asc&limit=1000&offset=${off}`, { headers: H }); } catch (err) {
        if (t === 3) { console.error(`DATABASE UNREACHABLE FOR THE 2026 READ (${err.cause?.code || err.message}, three tries). NOTHING WAS CHECKED.`); process.exit(1); }
      }
    }
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

/* ---- the subject of the controls that change the table or add a later
   check: the first named man whom no later check names, taken from the
   record. While nothing names him that is Manuel Ugarte; once a data round
   moves Ugarte and records it, the controls move to the next man instead of
   refusing, so a legitimate move never leaves this gate without its
   controls. ---- */
const SUBJECT_CONTROLS = ['noplayer', 'dupname', 'moved', 'recountry', 'reposition', 'movedsourced', 'recountrysourced', 'repositionsourced', 'latestale', 'latefuture', 'lateonehost', 'lateorphan'];
const SUBJECT = (() => {
  const named = new Set((Array.isArray(recordDisk.laterChecks) ? recordDisk.laterChecks : []).map(e => e?.name));
  for (const [name, club, country] of NAMED) {
    const w = recordDisk.write.filter(r => r.name === name);
    if (w.length === 1 && w[0].club === club && w[0].nationality === country && !named.has(name)) return w[0];
  }
  return null;
})();
if (SUBJECT_CONTROLS.includes(CONTROL)) {
  if (!SUBJECT) refuse('every named man has a later check, so no row is left for this control to change');
  if (!/^https:\/\/www\.transfermarkt\.com\//.test(SUBJECT.transfermarkt?.url || '') || !/^https:\/\/www\.fotmob\.com\//.test(SUBJECT.fotmob?.url || '')) refuse(`the record carries no transfermarkt.com and fotmob.com pages for ${SUBJECT.name}`);
  console.log(`   control subject: ${SUBJECT.name} (${SUBJECT.club}, ${SUBJECT.nationality}), the first named man no later check names\n`);
}
/* a country the subject does not play for, for the country controls */
const OTHER_COUNTRY = SUBJECT && SUBJECT.nationality === 'Argentina' ? 'Uruguay' : 'Argentina';
const isSubject = r => SUBJECT && r.player_name === SUBJECT.name && r.club === SUBJECT.club;

let controlDropped = 0;
let controlAdded = 0;
let controlMoved = 0;
let controlRecountried = 0;
let controlRepositioned = 0;
const MOVES_SUBJECT = CONTROL === 'moved' || CONTROL === 'movedsourced';
const RECOUNTRIES_SUBJECT = CONTROL === 'recountry' || CONTROL === 'recountrysourced';
const REPOSITIONS_SUBJECT = CONTROL === 'reposition' || CONTROL === 'repositionsourced';
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
    if (!res.ok || !is2026 || (CONTROL !== 'noplayer' && CONTROL !== 'dupname' && !MOVES_SUBJECT && !RECOUNTRIES_SUBJECT && !REPOSITIONS_SUBJECT)) return res;
    rows = await res.json();
  }
  if (CONTROL === 'noplayer' && is2026) {
    const before = rows.length;
    rows = rows.filter(r => !isSubject(r));
    controlDropped += before - rows.length;
  }
  if (MOVES_SUBJECT && is2026) {
    rows = rows.map(r => {
      if (!isSubject(r)) return r;
      controlMoved += 1;
      return { ...r, club: 'Control FC' };
    });
  }
  if (RECOUNTRIES_SUBJECT && is2026) {
    rows = rows.map(r => {
      if (!(isSubject(r) && r.nationality === SUBJECT.nationality)) return r;
      controlRecountried += 1;
      return { ...r, nationality: OTHER_COUNTRY };
    });
  }
  if (REPOSITIONS_SUBJECT && is2026) {
    rows = rows.map(r => {
      if (!(isSubject(r) && r.position === 'Defensive Midfield')) return r;
      controlRepositioned += 1;
      return { ...r, position: 'Central Midfield' };
    });
  }
  if (CONTROL === 'dupname' && is2026 && off === 0) {
    rows = [...rows, { player_name: SUBJECT.name, nationality: SUBJECT.nationality, position: 'Defensive Midfield', club: 'Control FC', market_value_usd: 1080000, year: 2026, age: SUBJECT.age }];
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
if (CONTROL === 'normalize') swapSource('src/lib/squadShape.ts', [["'Defensive Midfield': 'CDM'", "'Defensive Midfield': 'CB'"]]);
if (CONTROL === 'cmslot') {
  swapSource('src/lib/squadShape.ts', [["const MD: Position[] = ['CM', 'CDM', 'CAM'];", "const MD: Position[] = ['CM', 'CAM'];"]]);
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
  'export const { fetchWorldXiPool, fitsSlot, suggestCountryPlayers, primaryCountry } = w;',
  'export const { FORMATIONS, normalizePosition } = s;',
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
const { fetchWorldXiPool, fitsSlot, suggestCountryPlayers, primaryCountry, normalizePosition, FORMATIONS } = await import(pathToFileURL(BUNDLE).href);
const data = await fetchWorldXiPool();
fs.rmSync(TMP, { recursive: true, force: true });
if (!data) {
  console.error('SUPABASE UNREACHABLE OR POOL TOO SMALL. NOTHING WAS CHECKED.');
  process.exit(1);
}
if (CONTROL === 'noplayer' && controlDropped !== 1) refuse(`it should drop exactly one ${SUBJECT.name} row from what the game is served, it dropped ${controlDropped}`);
if (CONTROL === 'dupname' && controlAdded !== 1) refuse(`it should add exactly one second ${SUBJECT.name} row to what the game is served, it added ${controlAdded}`);
if (MOVES_SUBJECT && controlMoved !== 1) refuse(`it should move exactly one ${SUBJECT.name} row in what the game is served, it moved ${controlMoved}`);
if (RECOUNTRIES_SUBJECT && controlRecountried !== 1) refuse(`it should change the country of exactly one ${SUBJECT.name} row in what the game is served, it changed ${controlRecountried}`);
if (REPOSITIONS_SUBJECT && controlRepositioned !== 1) refuse(`it should change the position of exactly one ${SUBJECT.name} row in what the game is served, it changed ${controlRepositioned}`);

const at = (name, club) => data.players.filter(p => p.name === name && p.club === club);

/* ---- the later check controls: one entry each, in memory, on the record
   copy sections 2 to 4 read. The valid shape is movedsourced's; each negative
   control breaks exactly one rule of it. ---- */
if (!Array.isArray(recordDisk.laterChecks)) refuse('the record carries no laterChecks list');
const dayAfter = d => new Date(Date.parse(`${d}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
/* today in UTC, which is never behind the Eastern day the checks are written on */
const REAL_TODAY = new Date().toISOString().slice(0, 10);
/* The controls that write a later check are a later data round, so they run
   the fence as of the day after the record's check at the earliest: on the
   record's own day no later check can be dated yet, and without this every
   one of them would also trip the "not after today" rule and prove nothing
   of its own. Only the clock moves, in memory; the rules do not. */
const LATER_CONTROLS = ['movedsourced', 'recountrysourced', 'repositionsourced', 'latestale', 'latefuture', 'lateonehost', 'lateorphan'];
const TODAY = LATER_CONTROLS.includes(CONTROL) && dayAfter(recordDisk.checkedOn) > REAL_TODAY ? dayAfter(recordDisk.checkedOn) : REAL_TODAY;
if (TODAY !== REAL_TODAY) console.log(`   (control ${CONTROL}: the fence's clock reads ${TODAY}, the day after the record's check, not ${REAL_TODAY}; a later check cannot be dated on the record's own day)\n`);
{
  /* the subject's own two pages from the record, saying what the entry says */
  const pages = says => [
    { url: SUBJECT.transfermarkt.url, says },
    { url: SUBJECT.fotmob.url, says },
  ];
  const entry = over => ({
    name: SUBJECT.name, recordClub: SUBJECT.club, field: 'club', to: 'Control FC',
    checkedOn: dayAfter(recordDisk.checkedOn), round: recordDisk.round + 1,
    sources: pages('Control FC'),
    ...over,
  });
  if (CONTROL === 'movedsourced') recordDisk.laterChecks.push(entry({}));
  if (CONTROL === 'recountrysourced') recordDisk.laterChecks.push(entry({ field: 'nationality', to: OTHER_COUNTRY, sources: pages(OTHER_COUNTRY) }));
  if (CONTROL === 'repositionsourced') recordDisk.laterChecks.push(entry({ field: 'position', to: 'Central Midfield', sources: pages('Central Midfield') }));
  if (CONTROL === 'latestale') recordDisk.laterChecks.push(entry({ checkedOn: recordDisk.checkedOn }));
  if (CONTROL === 'latefuture') recordDisk.laterChecks.push(entry({ checkedOn: new Date(Date.parse(`${TODAY}T00:00:00Z`) + 365 * 86400000).toISOString().slice(0, 10) }));
  if (CONTROL === 'lateonehost') recordDisk.laterChecks.push(entry({ sources: [
    { url: SUBJECT.transfermarkt.url, says: 'Control FC' },
    { url: SUBJECT.transfermarkt.url.replace('https://www.transfermarkt.com/', 'https://www.transfermarkt.de/'), says: 'Control FC' },
  ] }));
  if (CONTROL === 'lateorphan') {
    if (recordDisk.write.some(w => w.name === SUBJECT.name && w.club === 'Control FC')) refuse(`the record writes ${SUBJECT.name} at Control FC`);
    recordDisk.laterChecks.push(entry({ recordClub: 'Control FC' }));
  }
}
/* the entry the control wrote, so a positive control can see its own entry
   applied, whatever real later checks the record already carries */
const CONTROL_ENTRY = LATER_CONTROLS.includes(CONTROL) ? recordDisk.laterChecks[recordDisk.laterChecks.length - 1] : null;
let controlEntryApplied = false;

/* ---- the record as of today: every tracked row (the written rows, and the
   other man of each declared namesake, whose club section 4 names) as the
   record checked it, with every valid later check applied in date order ---- */
const LATER_FIELDS = ['club', 'nationality', 'position'];
/* the registrable name of a host: transfermarkt.com and transfermarkt.de are one source */
const hostName = u => {
  let h = '';
  try { h = new URL(u).hostname.toLowerCase(); } catch { return ''; }
  const parts = h.split('.');
  const tld2 = parts.length >= 3 && parts[parts.length - 1].length === 2 && parts[parts.length - 2].length <= 3;
  return parts[parts.length - (tld2 ? 3 : 2)] || '';
};
const isDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const rowKey = (name, club) => `${name}|${club}`;
const expected = new Map();
for (const w of recordDisk.write) expected.set(rowKey(w.name, w.club), { name: w.name, club: w.club, nationality: w.nationality, position: 'Defensive Midfield', kind: 'written', by: new Map() });
for (const [name, , otherClub] of NAMESAKES) expected.set(rowKey(name, otherClub), { name, club: otherClub, nationality: null, position: null, kind: 'namesake', by: new Map() });
const expectedOf = (name, recordClub) => expected.get(rowKey(name, recordClub));
let laterApplied = 0;
const laterFindings = [];
const laterRules = new Set(); // the rule ids that refused an entry, for the controls' isolation
{
  const valid = [];
  for (const [i, e] of recordDisk.laterChecks.entries()) {
    const why = [];
    const no = (rule, m) => { why.push(m); laterRules.add(rule); };
    const row = e && expected.get(rowKey(e.name, e.recordClub));
    if (!row) no('orphan', `it names ${e?.name} at ${e?.recordClub}, a row the record neither writes nor declares`);
    if (!LATER_FIELDS.includes(e?.field)) no('field', `field ${JSON.stringify(e?.field)} is not one of ${LATER_FIELDS.join(', ')}`);
    else if (row && row.kind === 'namesake' && e.field !== 'club') no('field', 'only the club of a declared namesake is tracked');
    if (typeof e?.to !== 'string' || !e.to.trim()) no('value', 'it carries no value the table now holds (to)');
    else if (e.field === 'position' && !normalizePosition(e.to.trim())) no('value', `position ${JSON.stringify(e.to)} is not a table position the game knows`);
    if (!isDay(e?.checkedOn) || !(e.checkedOn > recordDisk.checkedOn)) no('stale', `checkedOn ${JSON.stringify(e?.checkedOn)} is not a day after the record's ${recordDisk.checkedOn}`);
    else if (e.checkedOn > TODAY) no('future', `checkedOn ${e.checkedOn} is after today (${TODAY}, UTC): no check has happened on a day that has not come yet`);
    if (!Number.isInteger(e?.round) || e.round <= recordDisk.round) no('round', `round ${JSON.stringify(e?.round)} is not a round after ${recordDisk.round}`);
    const hosts = new Set((Array.isArray(e?.sources) ? e.sources : [])
      .filter(s => /^https:\/\//.test(s?.url || '') && typeof s?.says === 'string' && s.says.trim())
      .map(s => hostName(s.url)).filter(Boolean));
    if (hosts.size < 2) no('hosts', `its sources come from ${hosts.size} host${hosts.size === 1 ? '' : 's'} (${[...hosts].join(', ') || 'none'}); two different hosts are needed, each with a url and what it says`);
    if (why.length) { laterFindings.push(`laterChecks[${i}] (${e?.name}, ${e?.field}): ${why.join('; ')}`); continue; }
    valid.push(e);
  }
  valid.sort((a, b) => a.checkedOn.localeCompare(b.checkedOn));
  const sameDay = new Set();
  for (const e of valid) {
    const k = `${rowKey(e.name, e.recordClub)}|${e.field}|${e.checkedOn}`;
    if (sameDay.has(k)) { laterRules.add('sameday'); laterFindings.push(`two later checks for ${e.name}'s ${e.field} on ${e.checkedOn}: which one holds is not decidable`); continue; }
    sameDay.add(k);
    const row = expectedOf(e.name, e.recordClub);
    row[e.field] = e.to;
    row.by.set(e.field, `Round ${e.round}, ${e.checkedOn}`);
    laterApplied += 1;
    if (e === CONTROL_ENTRY) controlEntryApplied = true;
  }
}
/* where the pool has a tracked row: at the club it should be at, and if he is
   not there, wherever else his name is pooled that no other tracked row of that
   name explains */
function locate(x) {
  const here = at(x.name, x.club);
  if (here.length) return { here, elsewhere: [] };
  const explained = new Set([...expected.values()].filter(y => y.name === x.name).map(y => y.club));
  return { here, elsewhere: data.players.filter(p => p.name === x.name && !explained.has(p.club)) };
}
const according = x => (x.by.has('club') ? `the later check of ${x.by.get('club')} says ${x.club}` : `the record (checked ${recordDisk.checkedOn}) says ${x.club} and no later check says otherwise`);

/* ---- section 2: the named current defensive midfielders are in the pool ---- */
section = 2;
console.log('\n2) the named current defensive midfielders are in the pool the game fetches');
{
  for (const m of laterFindings) fail('laterentry', `${m}. It explains nothing until it is fixed.`);
  let present = 0;
  for (const [name, club, country] of NAMED) {
    /* the list names each man as the record wrote him; where he is now is the record's to say */
    const x = expectedOf(name, club);
    const w = recordDisk.write.find(r => r.name === name && r.club === club);
    if (!x || x.kind !== 'written' || !w || w.nationality !== country) { fail('named', `${name} (${club}, ${country}) is on the named list but the record writes no such row`); continue; }
    const { here, elsewhere } = locate(x);
    if (!here.length) {
      if (!elsewhere.length) fail('named', `${name} (${x.club}, ${x.nationality}) is not in the World XI pool, so his slot says nobody matches`);
      continue; // pooled elsewhere: reported once, as moved, with the written rows below
    }
    const slotCountry = primaryCountry(x.nationality);
    if (!here.some(p => p.country === slotCountry)) continue; // pooled for another country: reported once, as differs, with the written rows below
    const offered = suggestCountryPlayers(data, slotCountry, name).some(p => p.name === name && p.club === x.club);
    if (!offered) { fail('search', `${name} is pooled but a search for his name in ${slotCountry}'s slot does not offer him`); continue; }
    present += 1;
  }
  let writtenIn = 0;
  const missing = [];
  const moved = [];
  const differs = [];
  for (const w of recordDisk.write) {
    const x = expectedOf(w.name, w.club);
    const { here, elsewhere } = locate(x);
    if (here.length) {
      writtenIn += 1;
      const country = primaryCountry(x.nationality);
      if (!here.some(p => p.country === country)) differs.push(`${w.name} (${x.club}) is pooled for ${[...new Set(here.map(p => p.country))].join(' and ')}, but ${x.by.has('nationality') ? `the later check of ${x.by.get('nationality')} says ${x.nationality}` : `the record (checked ${recordDisk.checkedOn}) says ${x.nationality} and no later check says otherwise`}`);
    } else if (elsewhere.length) moved.push(`${w.name} is pooled at ${[...new Set(elsewhere.map(p => p.club))].join(' and ')}, but ${according(x)}`);
    else missing.push(`${w.name} (${x.club})`);
  }
  if (moved.length) fail('moved', `${moved.length} of the record's rows sit at a club nothing sourced names: ${moved.slice(0, 3).join('; ')}. A data round that moved a player adds an entry to laterChecks in scripts/data/defensiveMidfield2026.json (the name and club the record wrote, field "club", the club the table now carries, the day checked, its round, and two sources on two different hosts). The written row stays as the migration wrote it.`);
  if (differs.length) fail('differs', `${differs.length} of the record's rows play for a country nothing sourced names: ${differs.slice(0, 3).join('; ')}. A data round that changed a player's country adds an entry to laterChecks in scripts/data/defensiveMidfield2026.json (field "nationality", the value the table now carries, the day checked, its round, and two sources on two different hosts). The written row stays as the migration wrote it.`);
  if (missing.length) fail('staged', `${missing.length} of the record's rows are not in the pool, e.g. ${missing.slice(0, 4).join(', ')}`);
  const cdm = data.players.filter(p => p.position === 'CDM').length;
  console.log(`   record checked ${recordDisk.checkedOn}; ${recordDisk.laterChecks.length} later check${recordDisk.laterChecks.length === 1 ? '' : 's'} on file, ${laterApplied} applied`);
  console.log(`   ${present} of ${NAMED.length} named defensive midfielders pooled and offered by search (before Round 669: 0)`);
  console.log(`   ${writtenIn} of the record's ${recordDisk.write.length} rows pooled where the record says; ${cdm} pooled CDMs of ${data.players.length} players (before Round 669: 46)`);
}

/* ---- section 3: they fit the slots ---- */
section = 3;
console.log('\n3) they fit every CDM and CM slot the formations have');
let repositioned = 0; // written rows a later check moved off defensive midfield
let subjectRepositionHeld = false; // the control subject, moved by one, pooled where it says
{
  const slots = FORMATIONS.flatMap(f => f.slots.filter(s => s.label === 'CDM' || s.label === 'CM').map(s => ({ ...s, formation: f.name })));
  const cdmSlots = slots.filter(s => s.label === 'CDM').length;
  const cmSlots = slots.filter(s => s.label === 'CM').length;
  if (!cdmSlots || !cmSlots) refuse(`the formations offer ${cdmSlots} CDM and ${cmSlots} CM slots; both must exist or this section measures nothing`);
  let checked = 0;
  let misfit = 0;
  for (const w of recordDisk.write) {
    const x = expectedOf(w.name, w.club);
    /* a later check that moved his position names where he plays now; he is
       held to that and not to the defensive midfield slots */
    const want = x.by.has('position') ? normalizePosition(x.position) : 'CDM';
    if (want !== 'CDM') {
      repositioned += 1;
      for (const p of at(w.name, x.club)) {
        if (p.position !== want) fail('cdm', `${p.name} (${p.club}) is pooled as ${p.position}, but the later check of ${x.by.get('position')} says ${x.position} (${want})`);
        else if (SUBJECT && w.name === SUBJECT.name && w.club === SUBJECT.club) subjectRepositionHeld = true;
      }
      continue;
    }
    for (const p of at(w.name, x.club)) {
      checked += 1;
      if (p.position !== 'CDM') { misfit += 1; fail('cdm', `${p.name} (${p.club}) is pooled as ${p.position}, not CDM, and no later check in scripts/data/defensiveMidfield2026.json says his position changed`); continue; }
      const bad = slots.filter(sl => !fitsSlot(p, sl)).map(sl => `${sl.formation} ${sl.label}`);
      if (bad.length) { misfit += 1; fail('slots', `${p.name} (${p.club}) does not take ${bad.slice(0, 3).join(', ')}${bad.length > 3 ? ` and ${bad.length - 3} more` : ''}`); }
    }
  }
  if (checked === 0) fail('slots', "none of the record's rows is in the pool, so no slot was checked");
  console.log(`   ${checked - misfit} of ${checked} pooled written players fit all ${cdmSlots} CDM and ${cmSlots} CM slots across ${FORMATIONS.length} formations${repositioned ? ` (${repositioned} moved off defensive midfield by a later check, not held to it)` : ''}`);
}

/* ---- section 4: namesakes stay two people, and only declared ones ---- */
section = 4;
console.log('\n4) namesakes stay two people, and every name in the pool twice is a declared namesake');
{
  for (const [name, writtenClub, otherClub, country] of NAMESAKES) {
    /* each man at the club the record, or a later check of him, names */
    const newClub = expectedOf(name, writtenClub).club;
    const oldClub = expectedOf(name, otherClub).club;
    const a = data.players.find(p => p.name === name && p.club === newClub);
    const b = data.players.find(p => p.name === name && p.club === oldClub);
    if (!a) fail('namesake', `${name} of ${newClub} is not in the pool`);
    if (!b) fail('namesake', `${name} of ${oldClub} is not in the pool (a namesake swallowed him, or he moved and no later check of him says where)`);
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
  const declared = new Map(NAMESAKES.map(([name, a, b]) => [name, [expectedOf(name, a).club, expectedOf(name, b).club].sort().join(' and ')]));
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
if (CONTROL in POSITIVES) {
  /* green is not enough: the change must have reached the rule it exercises */
  const reached = CONTROL === 'movedsourced' ? controlMoved === 1 && controlEntryApplied
    : CONTROL === 'recountrysourced' ? controlRecountried === 1 && controlEntryApplied
      : CONTROL === 'repositionsourced' ? controlRepositioned === 1 && controlEntryApplied && subjectRepositionHeld
        : commentOnlyEdit;
  const how = { movedsourced: 'read him at his new club through the later check', recountrysourced: 'read him for his new country through the later check', repositionsourced: 'held him to central midfield through the later check, not to the defensive midfield slots', commentonly: 'matched the dry run on its statements' }[CONTROL];
  if (!red.length && reached) {
    console.log(`${HELD} ${CONTROL}: ${POSITIVES[CONTROL][1]}, and every section stayed green (section ${POSITIVES[CONTROL][0]} ${how}).`);
    process.exitCode = 0;
  } else {
    console.error(`simWorldXiDefensiveMids positive control ${CONTROL}: CONTROL FAILED. Expected every section green with the change reaching its check; got section${red.length === 1 ? '' : 's'} ${red.length ? red.join(', ') : 'none'} red, change reached: ${reached}.`);
    process.exitCode = 4;
  }
} else if (CONTROL) {
  const [want, checks] = CONTROLS[CONTROL];
  const missed = checks.filter(c => !firedChecks.has(c));
  /* a laterentry control must be refused by its own rule and by no other */
  const rule = LATER_RULE[CONTROL];
  const ruleOk = !rule || (laterRules.size === 1 && laterRules.has(rule));
  const ruleNote = rule ? `, refused by the ${rule} rule alone` : '';
  if (red.length === 1 && red[0] === want && !missed.length && ruleOk) {
    console.log(`${MARK} ${CONTROL}: section ${want} went red through ${checks.join(' and ')} (${failed.get(want)} finding${failed.get(want) === 1 ? '' : 's'}${ruleNote}) and no other section did.`);
    process.exitCode = 1;
  } else {
    console.error(`simWorldXiDefensiveMids control ${CONTROL}: CONTROL FAILED. Expected only section ${want} red through ${checks.join(' and ')}${rule ? ` and the ${rule} rule alone` : ''}; got section${red.length === 1 ? '' : 's'} ${red.length ? red.join(', ') : 'none'}${missed.length ? `, and ${missed.join(', ')} never fired` : ''}${rule ? `, rules fired: ${[...laterRules].join(', ') || 'none'}` : ''}.`);
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
