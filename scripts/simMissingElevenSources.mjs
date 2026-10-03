/**
 * Round 950 harness: every Missing Eleven sheet is read from two hosts, and
 * the sheets Round 950 added are exactly the rows of their committed record.
 *
 * Missing Eleven blanks one man from a real Super Bowl starting unit. A
 * starting eleven is a claim about the world that nobody can check on the
 * card, so the file's rule has always been two sources per sheet and a side
 * dropped when they disagree. Round 950 grew the pool from 18 to 40 and made
 * the rule checkable: each new sheet names its two hosts in its source note
 * (the league's own game book on nfl.com and the pro-football-reference.com
 * starters table, never Wikipedia), and every row is in
 * scripts/data/missingElevenVerified2026-10.json with both hosts' own text.
 *
 * 1) Every sheet's source note names at least two different hosts, and a
 *    wiki is not counted as one. Sixteen of the 18 older sheets named only
 *    pfr shorthand and Wikipedia (or one host); Round 950 reread all 16 from
 *    the same two hosts, every one agreed 11/11, and their notes now say so.
 * 2) Every record sheet is in the file with the same eleven men in the same
 *    order and positions, the same match facts and the same blanks, and each
 *    record row agrees with itself across both hosts (the game book's initial
 *    and surname, pfr's full name). The record's two sources are on two
 *    different non wiki hosts and their URLs are on the hosts they name.
 *    The 16 reread older sheets (legacyRecheck) are held to the same rows,
 *    names in order, with pfr's spelling recorded where it differs (Ben
 *    Watson, Steve Neal, Michael Person).
 * 3) Every reveal line on a record sheet has evidence for that man in the
 *    record, so no line is written from memory.
 * 4) Every blank can be solved fairly, on all 40 sheets: the blank points at
 *    its own slot, nobody else on the sheet shares its surname (a surname
 *    guess is accepted), and the surname the hints spell out is not a suffix.
 * 5) The daily. dailyIndex shuffles in cycles the length of the pool, so a
 *    longer pool deals a different sheet on every date. Before
 *    ELEVEN_GROWN_DAILY_FROM the deal must equal what origin/main deals
 *    (MAIN_DEALS, measured on origin/main 3da2d38f on 2026-10-03 with the
 *    same fake clock): the outcome against a baseline, not the code against
 *    itself. From the cutover every full cycle of 40 days shows every sheet
 *    once, no sheet runs two days, and all 22 new sheets are dealt by the
 *    end of the first full cycle.
 *
 * Every check here is exact, there is no sampled statistic and so no band
 * to set. Measured 2026-10-03: 40 sheets all naming two hosts, 22 record
 * sheets with 242 starter rows plus 16 reread sheets with 176, 40 reveal
 * lines with evidence,
 * 123 blanks, 9 of 9 frozen main deals matched, 3 full cycles after the
 * cutover with all 40 sheets in each and 0 repeats. Every control fires.
 *
 * Negative controls, SIM_ME_CONTROL=<name>. Each asserts the text it mutates
 * exists before mutating it, and the run fails unless the check it targets
 * went red:
 *   onehost   drops pro-football-reference.com from one new source note (1)
 *   wikihost  swaps that host for en.wikipedia.org (1, a wiki is no host)
 *   legacyrow replaces a starter on a reread older sheet (2)
 *   swap      replaces one starter in the file with a man not in the record (2)
 *   recordpfr blanks one pfr cell in the record (2)
 *   fact      adds a reveal line to a blank the record has no evidence for (3)
 *   slot      points one blank at the wrong slot (4)
 *   olddeal   deals the daily from the whole pool on every date (5)
 *
 * Run: node scripts/simMissingElevenSources.mjs
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const LIB = `${ROOT}/src/lib/missingEleven.ts`;
const RECORD = `${ROOT}/scripts/data/missingElevenVerified2026-10.json`;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simME-')).replace(/\\/g, '/');

const CONTROL = process.env.SIM_ME_CONTROL || '';
const CONTROLS = { onehost: 1, wikihost: 1, swap: 2, legacyrow: 2, recordpfr: 2, fact: 3, slot: 4, olddeal: 5 };
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}`); process.exit(2); }

const red = new Set();
let failures = 0;
const fail = (section, m) => { failures += 1; red.add(section); console.error(`  FAIL (${section}): ${m}`); };

let src = fs.readFileSync(LIB, 'utf8');
const rec = JSON.parse(fs.readFileSync(RECORD, 'utf8'));

/* Controls mutate the inputs, never the checks. */
const mustReplace = (text, from, to, what) => {
  if (!text.includes(from)) { console.error(`control ${CONTROL}: ${what} not found, the control would change nothing`); process.exit(2); }
  return text.replace(from, to);
};
if (CONTROL === 'onehost') src = mustReplace(src, 'pro-football-reference.com box score 202402110kan #vis_starters', 'box score 202402110kan #vis_starters', 'the SB LVIII 49ers pfr host');
if (CONTROL === 'wikihost') src = mustReplace(src, 'pro-football-reference.com box score 202402110kan #vis_starters', 'en.wikipedia.org box score 202402110kan #vis_starters', 'the SB LVIII 49ers pfr host');
if (CONTROL === 'legacyrow') src = mustReplace(src, "S('FB', 'Patrick DiMarco'),", "S('FB', 'Mike Tolbert'),", 'the SB LI Falcons fullback');
if (CONTROL === 'swap') src = mustReplace(src, "S('C', 'Jake Brendel'),", "S('C', 'Alex Mack'),", 'the SB LVIII 49ers center');
if (CONTROL === 'fact') src = mustReplace(src, "{ name: 'Jake Brendel', slotIndex: 8, nationality: 'USA' }", "{ name: 'Jake Brendel', slotIndex: 8, nationality: 'USA', fact: 'Snapped every down.' }", 'the Brendel blank');
if (CONTROL === 'slot') src = mustReplace(src, "{ name: 'Noah Gray', slotIndex: 5,", "{ name: 'Noah Gray', slotIndex: 4,", 'the Noah Gray blank');
if (CONTROL === 'olddeal') src = mustReplace(src, 'return dateStr < ELEVEN_GROWN_DAILY_FROM ? ELEVEN_ORIGINAL_POOL : ELEVEN_LINEUPS.length;', 'return ELEVEN_LINEUPS.length;', 'the daily pool size');
if (CONTROL === 'recordpfr') {
  const row = rec.sheets.find((s) => s.id === 'sb-lix-phi')?.starters?.[2];
  if (!row || row[3] !== 'A.J. Brown/WR') { console.error('control recordpfr: the A.J. Brown pfr cell is not where expected'); process.exit(2); }
  row[3] = '';
}

fs.writeFileSync(`${TMP}/missingEleven.ts`, src);
fs.writeFileSync(`${TMP}/entry.mjs`, `export * from '${TMP}/missingEleven.ts';\n`);
await esbuild.build({ entryPoints: [`${TMP}/entry.mjs`], bundle: true, format: 'esm', platform: 'node', outfile: `${TMP}/bundle.mjs`, logLevel: 'error', alias: { '@': `${ROOT}/src` } });

/* A fixed clock the module reads through getTodayET (noon UTC, morning in New York). */
const RealDate = Date;
let fixedNow = RealDate.UTC(2026, 9, 3, 18, 0, 0);
globalThis.Date = class extends RealDate {
  constructor(...a) { if (a.length === 0) super(fixedNow); else super(...a); }
  static now() { return fixedNow; }
};
const m = await import(pathToFileURL(`${TMP}/bundle.mjs`).href);
const LINEUPS = m.ELEVEN_LINEUPS;
if (!Array.isArray(LINEUPS) || LINEUPS.length === 0) { console.error('ELEVEN_LINEUPS not found'); process.exit(1); }

/* Hosts named in a note: dotted names ending in a web suffix, reduced to the
   registrable pair (static.www.nfl.com is nfl.com). */
const HOST_RE = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|org|net|edu|gov|us)\b/gi;
const WIKI = /wiki|fandom/i;
const registrable = (h) => h.toLowerCase().split('.').slice(-2).join('.');
const hostsOf = (note) => [...new Set((String(note).match(HOST_RE) ?? []).map(registrable))];
const realHosts = (note) => hostsOf(note).filter((h) => !WIKI.test(h));

console.log('1) Every sheet names two hosts, and a wiki is not one');
{
  let two = 0;
  for (const l of LINEUPS) {
    const hosts = realHosts(l.source);
    if (hosts.length >= 2) two += 1;
    else fail(1, `${l.id} names ${hosts.length ? hosts.join(', ') : 'no host'}; a sheet needs two hosts that are not wikis`);
  }
  console.log(`   ${two} of ${LINEUPS.length} sheets name two hosts or more`);
}

/* The game book prints "LG 73 N.Allegretti" or "LT 74 Ch.Johnson"; the
   surname is what follows the last dot of the initials. */
const bookSurname = (cell) => String(cell).replace(/^\S+\s+\d+\s*/, '').replace(/^[A-Za-z]{1,4}\./, '').trim();
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;
const surnameOf = (name) => {
  const parts = String(name).trim().split(/\s+/);
  while (parts.length > 1 && SUFFIX.test(parts[parts.length - 1])) parts.pop();
  return parts[parts.length - 1];
};

console.log('2) Every Round 950 sheet is its record, row for row');
const byId = new Map(LINEUPS.map((l) => [l.id, l]));
{
  let rows = 0;
  for (const s of rec.sheets) {
    const l = byId.get(s.id);
    if (!l) { fail(2, `record sheet ${s.id} is not in the file`); continue; }
    const hosts = [...new Set(s.sources.map((x) => registrable(x.host)))].filter((h) => !WIKI.test(h));
    if (hosts.length < 2) fail(2, `${s.id}: the record names ${hosts.length} non wiki host(s)`);
    for (const x of s.sources) {
      let u;
      try { u = new URL(x.url); } catch { fail(2, `${s.id}: ${x.url} is not a URL`); continue; }
      if (registrable(u.hostname) !== registrable(x.host)) fail(2, `${s.id}: ${x.url} is not on ${x.host}`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(x.read))) fail(2, `${s.id}: a source with no read date`);
    }
    if (s.agree !== '11/11') fail(2, `${s.id}: the record says ${s.agree}, and a sheet ships only at 11/11`);
    if (s.starters.length !== 11) fail(2, `${s.id}: ${s.starters.length} rows in the record`);
    for (const [pos, name, book, pfr] of s.starters) {
      rows += 1;
      if (!book || !pfr) { fail(2, `${s.id} ${name}: a host cell is empty`); continue; }
      if (fold(bookSurname(book)) !== fold(name.split(/\s+/).slice(1).join(' ').replace(/\s+(Jr\.?|III|II)$/i, ''))) fail(2, `${s.id} ${name}: the game book prints ${book}`);
      if (!String(book).startsWith(pos + ' ')) fail(2, `${s.id} ${name}: position ${pos} is not the game book's (${book})`);
      if (!String(pfr).startsWith(name + '/')) fail(2, `${s.id} ${name}: pfr prints ${pfr}`);
    }
    const want = s.starters.map((r) => `${r[0]} ${r[1]}`).join(', ');
    const got = l.slots.map((x) => `${x.position} ${x.name}`).join(', ');
    if (want !== got) fail(2, `${s.id}: the file's eleven differ from the record`);
    for (const k of ['team', 'opponent', 'matchDate', 'venue', 'scoreLine', 'unit']) {
      const fileVal = k === 'unit' ? (l.unit ?? 'offense') : l[k];
      if (fileVal !== s[k]) fail(2, `${s.id}: ${k} is ${fileVal} in the file and ${s[k]} in the record`);
    }
    if (l.dateLabel !== s.game) fail(2, `${s.id}: dateLabel ${l.dateLabel} is not ${s.game}`);
    const wantC = (s.candidates ?? []).map((c) => `${c.name}@${c.slotIndex}:${c.nationality}`).join(', ');
    const gotC = l.blankCandidates.map((c) => `${c.name}@${c.slotIndex}:${c.nationality}`).join(', ');
    if (wantC !== gotC) fail(2, `${s.id}: blanks differ from the record (${gotC})`);
    if (!realHosts(l.source).includes('nfl.com') || !realHosts(l.source).includes('pro-football-reference.com')) fail(2, `${s.id}: the source note does not name both of the record's hosts`);
  }
  const older = rec.legacyRecheck?.sheets ?? [];
  let olderRows = 0;
  for (const s of older) {
    const l = byId.get(s.id);
    if (!l) { fail(2, `reread sheet ${s.id} is not in the file`); continue; }
    const hosts = [...new Set(s.sources.map((x) => registrable(x.host)))].filter((h) => !WIKI.test(h));
    if (hosts.length < 2) fail(2, `${s.id}: the reread names ${hosts.length} non wiki host(s)`);
    if (s.agree !== '11/11') fail(2, `${s.id}: the reread says ${s.agree}`);
    const fileNames = l.slots.map((x) => x.name).join(', ');
    if (fileNames !== s.starters.map((r) => r[1]).join(', ')) fail(2, `${s.id}: the file's eleven differ from the reread`);
    for (const [, name, book, pfr, note] of s.starters) {
      olderRows += 1;
      const tail = String(book).replace(/^\S+\s+\d+\s*/, '');
      if (fold(bookSurname(book)) !== fold(name.split(/\s+/).slice(1).join(' ').replace(/\s+(Jr\.?|III|II)$/i, '')) || fold(tail)[0] !== fold(name)[0]) fail(2, `${s.id} ${name}: the game book prints ${book}`);
      const alias = /^pfr prints (.+)$/.exec(String(note ?? ''))?.[1];
      if (!String(pfr).startsWith(name + '/') && !(alias && String(pfr).startsWith(alias + '/'))) fail(2, `${s.id} ${name}: pfr prints ${pfr}`);
    }
  }
  /* The two older defenses whose notes already name two publishers of their
     own (check 1 holds them to that); Round 950 did not reread them. */
  const OWN_TWO_HOSTS = ['sb-xx-chi-d', 'sb-xxxv-bal-d'];
  const covered = new Set([...rec.sheets, ...older].map((s) => s.id).concat(OWN_TWO_HOSTS));
  for (const l of LINEUPS) if (!covered.has(l.id)) fail(2, `${l.id} is in neither the record nor the reread, so nothing holds it to its sources`);
  console.log(`   ${rec.sheets.length} record sheets, ${rows} starter rows, and ${older.length} reread older sheets, ${olderRows} rows, each read the same on both hosts`);
}

console.log('3) Every reveal line on a Round 950 sheet has evidence in the record');
{
  let lines = 0;
  for (const s of rec.sheets) {
    const l = byId.get(s.id);
    if (!l) continue;
    const evidence = new Set((s.facts ?? []).filter((f) => String(f.fact ?? '').trim()).map((f) => f.name));
    for (const c of l.blankCandidates) {
      if (!c.fact) continue;
      lines += 1;
      if (!evidence.has(c.name)) fail(3, `${s.id}: the reveal line for ${c.name} has no evidence in the record`);
      if (/[–—]/.test(c.fact)) fail(3, `${s.id}: the reveal line for ${c.name} carries a long dash`);
    }
  }
  console.log(`   ${lines} reveal lines, each backed by a record entry`);
}

console.log('4) Every blank can be solved fairly');
{
  let blanks = 0;
  for (const l of LINEUPS) {
    const names = l.slots.map((x) => x.name);
    for (const c of l.blankCandidates) {
      blanks += 1;
      if (names[c.slotIndex] !== c.name) fail(4, `${l.id}: ${c.name} points at slot ${c.slotIndex}, which holds ${names[c.slotIndex]}`);
      const sur = fold(surnameOf(c.name));
      const twin = names.filter((n) => n !== c.name && fold(surnameOf(n)) === sur);
      if (twin.length) fail(4, `${l.id}: ${c.name} shares a surname with ${twin.join(', ')}, so the blank is given away`);
      const last = String(c.name).trim().split(/\s+/).pop();
      if (SUFFIX.test(last)) fail(4, `${l.id}: ${c.name} ends in a suffix, so the hints would spell "${last}"`);
      if (!String(c.nationality ?? '').trim()) fail(4, `${l.id}: ${c.name} has no nationality for the first hint`);
    }
  }
  console.log(`   ${blanks} blanks on ${LINEUPS.length} sheets, each on its own slot with a surname nobody else on the sheet has`);
}

/* What origin/main deals (3da2d38f, measured 2026-10-03 with this clock) from
   the measuring day to the cutover. Dailies before 2026-10-03 are over and
   nobody can play them again; Round 950 took Kyle Brady off the SB XLII
   Patriots blanks (Tom Brady on the same sheet answered it), which moved
   only the already finished 2026-10-01 deal. */
const MAIN_DEALS = {
  '2026-10-03': 'sb-xlv-pit|David Johnson', '2026-10-04': 'sb-xlviii-sea-d|Clinton McDonald',
  '2026-10-05': 'sb-xlv-gb|James Jones', '2026-10-06': 'sb-50-den|Vernon Davis', '2026-10-07': 'sb-50-den-d|Danny Trevathan',
  '2026-10-08': 'sb-liv-kc|Mecole Hardman', '2026-10-09': 'sb-xx-chi-d|Leslie Frazier', '2026-10-10': 'sb-liv-sf|Kyle Juszczyk',
  '2026-10-11': 'sb-xlix-ne|Shane Vereen',
};
const setDate = (iso) => { const [y, mo, d] = iso.split('-').map(Number); fixedNow = RealDate.UTC(y, mo - 1, d, 18, 0, 0); };
const isoPlus = (iso, k) => { const [y, mo, d] = iso.split('-').map(Number); return new RealDate(RealDate.UTC(y, mo - 1, d + k)).toISOString().slice(0, 10); };

console.log('5) The daily: no played daily changes, then the whole pool deals');
{
  const cut = m.ELEVEN_GROWN_DAILY_FROM;
  const FIRST = 18;
  if (typeof cut !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(cut)) fail(5, 'ELEVEN_GROWN_DAILY_FROM is missing');
  const deal = (iso) => { setDate(iso); const p = m.getDailyElevenPuzzle(); return `${p.lineup.id}|${p.candidate.name}`; };
  let same = 0;
  for (const [iso, want] of Object.entries(MAIN_DEALS)) {
    if (iso >= cut) continue;
    const got = deal(iso);
    if (got === want) same += 1;
    else fail(5, `${iso} deals ${got}, origin/main dealt ${want}`);
  }
  const before = Object.keys(MAIN_DEALS).filter((d) => d < cut).length;
  if (before < 7) fail(5, `only ${before} frozen main deals fall before the cutover, too few to prove anything`);
  const firstIds = LINEUPS.slice(0, FIRST).map((l) => l.id);
  const mainIds = new Set(Object.values(MAIN_DEALS).map((v) => v.split('|')[0]));
  for (const id of mainIds) if (!firstIds.includes(id)) fail(5, `${id} was dealt on main but is not among the first ${FIRST} sheets`);
  /* dailyIndex walks the pool in cycles cut on the day number, not on the
     cutover, so the full cycles are found by the day number. */
  const pool = LINEUPS.length;
  const dayNo = (iso) => { const [y, mo, d] = iso.split('-').map(Number); return Math.floor(RealDate.UTC(y, mo - 1, d) / 86_400_000); };
  const seen = [];
  let runs = 0;
  for (let k = 0; k < pool * 4; k += 1) {
    setDate(isoPlus(cut, k));
    seen.push(m.getDailyElevenPuzzle().lineup.id);
    if (k > 0 && seen[k] === seen[k - 1]) runs += 1;
  }
  if (runs) fail(5, `${runs} sheets dealt two days running after the cutover`);
  let a = 0;
  while (dayNo(isoPlus(cut, a)) % pool !== 0) a += 1;
  let cycles = 0;
  for (let w = a; w + pool <= seen.length; w += pool) {
    cycles += 1;
    const n = new Set(seen.slice(w, w + pool)).size;
    if (n !== pool) fail(5, `the cycle from ${isoPlus(cut, w)} shows ${n} of ${pool} sheets`);
  }
  if (cycles < 3) fail(5, `only ${cycles} full cycles measured after the cutover`);
  const firstCycle = seen.slice(0, a + pool);
  const fresh = rec.sheets.map((s) => s.id).filter((id) => !firstCycle.includes(id));
  if (fresh.length) fail(5, `new sheets not dealt by the end of the first full cycle: ${fresh.join(', ')}`);
  console.log(`   ${same} of ${before} days from 2026-10-03 to ${cut} deal exactly what origin/main deals; after it, ${cycles} full cycles each show all ${pool} sheets, ${runs} repeats`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log('');
if (CONTROL) {
  const target = CONTROLS[CONTROL];
  if (red.has(target)) {
    console.log(`simMissingElevenSources: control ${CONTROL} turned check ${target} red, as it must (${failures} failure${failures === 1 ? '' : 's'}).`);
    process.exit(0);
  }
  console.error(`simMissingElevenSources: control ${CONTROL} did NOT turn check ${target} red. The check is not working.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simMissingElevenSources: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log(`simMissingElevenSources: green. ${LINEUPS.length} sheets, ${rec.sheets.length + (rec.legacyRecheck?.sheets?.length ?? 0)} of them row for row against the record.`);
