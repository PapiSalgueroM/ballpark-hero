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
 *    The line under each sheet (stadium, city) is printed by the game book
 *    and by a second host (profootballarchives.com for the stadium, it or
 *    espn.com for the city). Every blank's Nationality hint (USA) rests on
 *    two birthplace reads in a US state, pfr's player page and espn.com's
 *    athlete record; a man with no second read is held out of the blanks.
 *    The 16 reread older sheets (legacyRecheck) are held to the same rows,
 *    names in order, with pfr's spelling recorded where it differs (Ben
 *    Watson, Steve Neal, Michael Person).
 * 3) Every reveal line on a record sheet is word for word the line the
 *    record holds for that man (candidates[].reveal), and the record has
 *    evidence for him, so no line is written from memory and a later edit
 *    that turns a true line false cannot pass without changing the record.
 * 4) Every blank can be solved fairly, on all 40 sheets: the blank points at
 *    its own slot, nobody else on the sheet shares its surname (a surname
 *    guess is accepted), the surname the hints spell out is not a suffix,
 *    and a blank a host prints under another full name accepts that name.
 * 5) The daily before the cutover. dailyIndex shuffles in cycles the length
 *    of the pool, so a longer pool deals a different sheet on every date.
 *    Before ELEVEN_GROWN_DAILY_FROM the deal must equal what origin/main
 *    deals (MAIN_DEALS, measured on origin/main with the same fake clock):
 *    the outcome against a baseline, not the code against itself.
 * 6) The daily from the cutover. It deals from ELEVEN_GROWN_POOL (40), a
 *    number and not the length of the list, the first 40 sheets sit in a
 *    frozen order (FROZEN_IDS), and the cutover day and the 19 days after it
 *    deal what was measured (GROWN_DEALS). So moving a sheet, dealing from
 *    41, or a cutover test that slips by a day goes red, while a sheet
 *    appended after the 40 joins Unlimited and leaves every daily alone.
 *    The What's New line names the day the daily switches.
 *    Every full cycle of 40 days shows every sheet once, and all 22 new
 *    sheets are dealt by the end of the first full cycle.
 * 7) The switch. No sheet is dealt the day before the cutover and on it,
 *    and no sheet comes back across the switch sooner than either pool on
 *    its own brings one back.
 *
 * Every check here is exact, there is no sampled statistic and so no band
 * to set. Measured 2026-10-03: 40 sheets all naming two hosts, 22 record
 * sheets with 242 starter rows plus 16 reread sheets with 176, 22 venue
 * lines and 62 birthplaces on two hosts (4 blanks held out for want of a
 * second read), 39 reveal lines equal to the record's, 119 blanks, 3 of
 * them accepting another printed name, 9 of 9 frozen main deals and 20
 * of 20 grown deals matched, 3 full cycles after the cutover with all 40
 * sheets in each, and a shortest return of 2 days in each pool against 9
 * across the switch. Every control fires.
 *
 * Negative controls, SIM_ME_CONTROL=<name>. Each asserts the text it mutates
 * exists before mutating it, and the run fails unless the check it targets
 * went red:
 *   onehost   drops pro-football-reference.com from one new source note (1)
 *   wikihost  swaps that host for en.wikipedia.org (1, a wiki is no host)
 *   legacyrow replaces a starter on a reread older sheet (2)
 *   swap      replaces one starter in the file with a man not in the record (2)
 *   recordpfr blanks one pfr cell in the record (2)
 *   onebirth  drops Noah Gray's espn.com birthplace from the record (2)
 *   onevenue  gives SB XLII's second venue read ESPN's current stadium name (2)
 *   fact      adds a reveal line to a blank the record has no evidence for (3)
 *   factnum   turns the 21-yard McCaffrey catch into a 12-yard one (3)
 *   slot      points one blank at the wrong slot (4)
 *   noalias   takes "Ben Watson" off the Benjamin Watson blank (4)
 *   olddeal   deals the daily from the grown pool on every date (5)
 *   reorder   moves the 40th sheet to slot 18 (6)
 *   grow      appends a 41st sheet and deals the daily from 41 (6)
 *   lte       lets the cutover day deal from the old 18 (6)
 *   wnstale   moves the cutover a week without touching What's New (6)
 *   rerun     deals the cutover day the sheet of the day before (7)
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
const CONTROLS = { onehost: 1, wikihost: 1, swap: 2, legacyrow: 2, recordpfr: 2, onebirth: 2, onevenue: 2, fact: 3, factnum: 3, slot: 4, noalias: 4, olddeal: 5, reorder: 6, grow: 6, lte: 6, wnstale: 6, rerun: 7 };
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
if (CONTROL === 'factnum') src = mustReplace(src, "fact: 'Scored on a 21-yard catch,", "fact: 'Scored on a 12-yard catch,", 'the McCaffrey reveal line');
if (CONTROL === 'noalias') src = mustReplace(src, ", aliases: ['Ben Watson'] }", ' }', 'the Ben Watson alias');
if (CONTROL === 'slot') src = mustReplace(src, "{ name: 'Noah Gray', slotIndex: 5,", "{ name: 'Noah Gray', slotIndex: 4,", 'the Noah Gray blank');
if (CONTROL === 'olddeal') src = mustReplace(src, 'return dateStr < ELEVEN_GROWN_DAILY_FROM ? ELEVEN_ORIGINAL_POOL : ELEVEN_GROWN_POOL;', 'return ELEVEN_GROWN_POOL;', 'the daily pool size');
if (CONTROL === 'lte') src = mustReplace(src, 'return dateStr < ELEVEN_GROWN_DAILY_FROM ?', 'return dateStr <= ELEVEN_GROWN_DAILY_FROM ?', 'the cutover test');
if (CONTROL === 'wnstale') src = mustReplace(src, "export const ELEVEN_GROWN_DAILY_FROM = '2026-10-12';", "export const ELEVEN_GROWN_DAILY_FROM = '2026-10-19';", 'the cutover date');
if (CONTROL === 'grow') src = mustReplace(src, 'export const ELEVEN_GROWN_POOL = 40;', 'export const ELEVEN_GROWN_POOL = 41;', 'the grown pool size');
if (CONTROL === 'rerun') src = mustReplace(src, 'const lineup = ELEVEN_LINEUPS[dailyIndex(today, elevenDailyPoolSize(today))];',
  "const eve = new Date(Date.parse(today + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);\n  const lineup = ELEVEN_LINEUPS[today === ELEVEN_GROWN_DAILY_FROM ? dailyIndex(eve, ELEVEN_ORIGINAL_POOL) : dailyIndex(today, elevenDailyPoolSize(today))];",
  'the daily pick');
if (CONTROL === 'onebirth') {
  const c = rec.sheets.find((s) => s.id === 'sb-lviii-kc')?.candidates?.find((x) => x.name === 'Noah Gray');
  if (!c || c.bornPerEspn !== 'Leominster, MA') { console.error('control onebirth: the Noah Gray espn.com birthplace is not where expected'); process.exit(2); }
  delete c.bornPerEspn;
}
if (CONTROL === 'onevenue') {
  const s = rec.sheets.find((x) => x.id === 'sb-xlii-nyg-d');
  const r = s?.venueReads?.find((x) => x.host === 'profootballarchives.com');
  if (!r || r.venue !== 'University of Phoenix Stadium') { console.error('control onevenue: the SB XLII profootballarchives.com venue is not where expected'); process.exit(2); }
  r.venue = 'State Farm Stadium';
}
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
/* Two controls change the list the module deals from, in place. */
if (CONTROL === 'reorder') {
  if (LINEUPS[39]?.id !== 'sb-xlii-nyg-d') { console.error('control reorder: sb-xlii-nyg-d is not the 40th sheet'); process.exit(2); }
  LINEUPS.splice(18, 0, LINEUPS.pop());
}
if (CONTROL === 'grow') LINEUPS.push({ ...LINEUPS[0], id: 'sb-control-41' });

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

const US_STATES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
const inUsState = (place) => { const m2 = /^[^,]+,\s*([A-Z]{2})$/.exec(String(place ?? '').trim()); return !!m2 && US_STATES.has(m2[1]); };

console.log('2) Every Round 950 sheet is its record, row for row');
const byId = new Map(LINEUPS.map((l) => [l.id, l]));
{
  let rows = 0;
  let venueChecked = 0;
  let birthChecked = 0;
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
    /* The line under the sheet (stadium, city): the game book prints both,
       a second host prints the stadium, and a second host puts it in that city. */
    const [stadium, city] = String(l.venue).split(/,\s*/);
    const reads = s.venueReads ?? [];
    if (!String(s.venueAsPrinted ?? '').includes(stadium) || !String(s.venueAsPrinted ?? '').includes(city)) fail(2, `${s.id}: the game book does not print ${l.venue}`);
    if (!reads.some((r) => registrable(r.host) !== 'nfl.com' && r.venue === stadium)) fail(2, `${s.id}: no second host prints the stadium ${stadium}`);
    if (!reads.some((r) => registrable(r.host) !== 'nfl.com' && String(r.location ?? '').split(',')[0].trim() === city)) fail(2, `${s.id}: no second host puts the stadium in ${city}`);
    for (const r of reads) {
      let u;
      try { u = new URL(r.url); } catch { fail(2, `${s.id}: venue read ${r.url} is not a URL`); continue; }
      if (registrable(u.hostname) !== registrable(r.host) || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.read))) fail(2, `${s.id}: venue read ${r.url} is not on ${r.host} or has no read date`);
    }
    venueChecked += 1;
    /* The Nationality hint: two hosts put the man's birthplace in a US state. */
    for (const c of s.candidates ?? []) {
      if (c.nationality !== 'USA') { fail(2, `${s.id}: ${c.name} is ${c.nationality}, and the record method only covers USA`); continue; }
      const pfrHost = (() => { try { return registrable(new URL(c.pfrPlayer).hostname); } catch { return ''; } })();
      const espnHost = (() => { try { return registrable(new URL(c.espnPlayer).hostname); } catch { return ''; } })();
      if (pfrHost !== 'pro-football-reference.com' || !inUsState(c.bornPerPfr)) fail(2, `${s.id}: ${c.name}'s pfr birthplace (${c.bornPerPfr}) is missing or not in a US state`);
      else if (espnHost !== 'espn.com' || !inUsState(c.bornPerEspn)) fail(2, `${s.id}: ${c.name}'s second birthplace read (${c.bornPerEspn}) is missing or not in a US state`);
      else birthChecked += 1;
    }
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
  console.log(`   ${venueChecked} venue lines read on two hosts, ${birthChecked} blanks born in a US state on two hosts`);
}

console.log('3) Every reveal line on a Round 950 sheet has evidence in the record');
{
  let lines = 0;
  for (const s of rec.sheets) {
    const l = byId.get(s.id);
    if (!l) continue;
    const evidence = new Set((s.facts ?? []).filter((f) => String(f.fact ?? '').trim()).map((f) => f.name));
    const recorded = new Map((s.candidates ?? []).map((c) => [c.name, String(c.reveal ?? '')]));
    for (const c of l.blankCandidates) {
      /* The shipped words are the recorded words, exactly: an edit that turns
         a true line false (21 yards to 12) has to change the record too. */
      if (String(c.fact ?? '') !== (recorded.get(c.name) ?? '')) fail(3, `${s.id}: the reveal line for ${c.name} is not the line the record holds`);
      if (!c.fact) continue;
      lines += 1;
      if (!evidence.has(c.name)) fail(3, `${s.id}: the reveal line for ${c.name} has no evidence in the record`);
      if (/[\u2013\u2014]/.test(c.fact)) fail(3, `${s.id}: the reveal line for ${c.name} carries a long dash`);
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
      for (const a of c.aliases ?? []) {
        if (!m.isCorrectElevenGuess(a, c)) fail(4, `${l.id}: the alias ${a} is not accepted for ${c.name}`);
        if (fold(surnameOf(a)) !== sur) fail(4, `${l.id}: the alias ${a} does not carry ${c.name}'s surname`);
        if (names.some((n) => n !== c.name && fold(n) === fold(a))) fail(4, `${l.id}: the alias ${a} is another man on the sheet`);
      }
    }
  }
  /* A blank whose man a host prints under another full name (the reread's
     "pfr prints Ben Watson") accepts that name as a guess, or a player who
     types what the box score says gets a miss. */
  let aliased = 0;
  for (const s of [...rec.sheets, ...(rec.legacyRecheck?.sheets ?? [])]) {
    const l = byId.get(s.id);
    if (!l) continue;
    const printed = s.starters.map((row) => [row[1], /^pfr prints (.+)$/.exec(String(row[4] ?? ''))?.[1], 'pfr'])
      .concat((s.candidates ?? []).map((c) => [c.name, c.espnName, 'espn.com']));
    for (const [name, alias, host] of printed) {
      const c = l.blankCandidates.find((x) => x.name === name);
      if (!alias || !c) continue;
      aliased += 1;
      if (!m.isCorrectElevenGuess(alias, c)) fail(4, `${s.id}: ${c.name} is a blank and ${host} prints him ${alias}, but the guess ${alias} is a miss`);
    }
  }
  console.log(`   ${aliased} blank${aliased === 1 ? '' : 's'} a host prints under another name, each accepting that name`);
  console.log(`   ${blanks} blanks on ${LINEUPS.length} sheets, each on its own slot with a surname nobody else on the sheet has`);
}

/* What origin/main deals (measured 2026-10-03 on 3da2d38f, rechecked on
   665898cf, with this clock) from the measuring day to 2026-10-25. Only the
   dates before the cutover are compared, so moving the cutover later keeps
   this baseline honest without a new measurement. Dailies before
   2026-10-03 are over and nobody can play them again. Round 950 took Kyle
   Brady off the SB XLII Patriots blanks (Tom Brady on the same sheet
   answered it), which changed the answer on 11 finished dates from
   2025-10-01 on, every one of them an sb-xlii-ne day (2026-08-23,
   2026-09-18 and 2026-10-01 among them), and none from 2026-10-03 to the
   cutover. The 2026-10-24 entry is an sb-xlii-ne day: a cutover moved past
   it goes red here, which is the point. */
const MAIN_DEALS = {
  '2026-10-03': 'sb-xlv-pit|David Johnson', '2026-10-04': 'sb-xlviii-sea-d|Clinton McDonald',
  '2026-10-05': 'sb-xlv-gb|James Jones', '2026-10-06': 'sb-50-den|Vernon Davis', '2026-10-07': 'sb-50-den-d|Danny Trevathan',
  '2026-10-08': 'sb-liv-kc|Mecole Hardman', '2026-10-09': 'sb-xx-chi-d|Leslie Frazier', '2026-10-10': 'sb-liv-sf|Kyle Juszczyk',
  '2026-10-11': 'sb-xlix-ne|Shane Vereen', '2026-10-12': 'sb-50-den-d|Malik Jackson', '2026-10-13': 'sb-lvii-kc|Isiah Pacheco',
  '2026-10-14': 'sb-xlv-gb|James Starks', '2026-10-15': 'sb-xxxv-bal-d|Jamie Sharper', '2026-10-16': 'sb-lii-phi|Halapoulivaati Vaitai',
  '2026-10-17': 'sb-xlv-pit|Rashard Mendenhall', '2026-10-18': 'sb-xx-chi-d|Gary Fencik', '2026-10-19': 'sb-liv-kc|Laurent Duvernay-Tardif',
  '2026-10-20': 'sb-lvii-phi|Jason Kelce', '2026-10-21': 'sb-lii-ne|Dion Lewis', '2026-10-22': 'sb-xlviii-sea-d|Byron Maxwell',
  '2026-10-23': 'sb-xlix-sea|Jermaine Kearse', '2026-10-24': 'sb-xlii-ne|Benjamin Watson', '2026-10-25': 'sb-li-atl|Mohamed Sanu',
};
/* The first 40 sheets in the order the grown daily deals them. dailyIndex
   reads a sheet by its index, so moving one, or dealing from 41, changes
   every deal from the cutover on, today's included. New sheets go on the
   end, after these, and reach the daily only through a new cutover. */
const FROZEN_IDS = [
  'sb-li-ne', 'sb-li-atl', 'sb-xlix-ne', 'sb-xlix-sea', 'sb-xlii-ne', 'sb-50-den', 'sb-lvii-kc', 'sb-lvii-phi', 'sb-xlv-pit', 'sb-xlv-gb',
  'sb-liv-sf', 'sb-liv-kc', 'sb-lii-phi', 'sb-lii-ne', 'sb-xx-chi-d', 'sb-xxxv-bal-d', 'sb-xlviii-sea-d', 'sb-50-den-d', 'sb-lviii-kc', 'sb-lviii-sf',
  'sb-lix-phi', 'sb-lix-phi-d', 'sb-lv-tb', 'sb-lv-tb-d', 'sb-lv-kc', 'sb-lvi-lar', 'sb-lvi-lar-d', 'sb-lvi-cin', 'sb-liii-ne-d', 'sb-liii-lar',
  'sb-xlvii-bal', 'sb-xlvii-sf', 'sb-xlvi-nyg', 'sb-xlvi-ne', 'sb-xliv-no', 'sb-xliv-ind', 'sb-xliii-pit', 'sb-xliii-pit-d', 'sb-xliii-ari', 'sb-xlii-nyg-d',
];
/* What the grown daily deals (this branch, measured 2026-10-03), cutover day
   first. Compared only on dates from the cutover on. Remeasured once, the
   same day, after four blanks with no second birthplace read were held out:
   only 2026-10-18 moved (Jake Ballard to Ahmad Bradshaw, same sheet). */
const GROWN_DEALS = {
  '2026-10-12': 'sb-lvi-lar-d|Eric Weddle', '2026-10-13': 'sb-xlviii-sea-d|Walter Thurmond', '2026-10-14': 'sb-lv-tb|Scott Miller',
  '2026-10-15': 'sb-lii-phi|Halapoulivaati Vaitai', '2026-10-16': 'sb-xlix-sea|Ricardo Lockette', '2026-10-17': 'sb-lviii-sf|Kyle Juszczyk',
  '2026-10-18': 'sb-xlvi-nyg|Ahmad Bradshaw', '2026-10-19': 'sb-lvi-cin|Isaiah Prince', '2026-10-20': 'sb-lv-kc|Andrew Wylie',
  '2026-10-21': 'sb-xlix-ne|Michael Hoomanawanui', '2026-10-22': 'sb-xlii-nyg-d|Reggie Torbor', '2026-10-23': 'sb-xlvii-bal|Vonta Leach',
  '2026-10-24': 'sb-xlv-gb|James Jones', '2026-10-25': 'sb-xliii-ari|Leonard Pope', '2026-10-26': 'sb-li-ne|Martellus Bennett',
  '2026-10-27': 'sb-50-den-d|Sylvester Williams', '2026-10-28': 'sb-xx-chi-d|William Perry', '2026-10-29': 'sb-li-atl|Mohamed Sanu',
  '2026-10-30': 'sb-liv-kc|Mecole Hardman', '2026-10-31': 'sb-liii-lar|Josh Reynolds',
};
const setDate = (iso) => { const [y, mo, d] = iso.split('-').map(Number); fixedNow = RealDate.UTC(y, mo - 1, d, 18, 0, 0); };
const isoPlus = (iso, k) => { const [y, mo, d] = iso.split('-').map(Number); return new RealDate(RealDate.UTC(y, mo - 1, d + k)).toISOString().slice(0, 10); };
const deal = (iso) => { setDate(iso); const p = m.getDailyElevenPuzzle(); return `${p.lineup.id}|${p.candidate.name}`; };
const cut = m.ELEVEN_GROWN_DAILY_FROM;
if (typeof cut !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(cut)) { console.error('ELEVEN_GROWN_DAILY_FROM is missing'); process.exit(1); }

console.log('5) Before the cutover the daily deals what origin/main deals');
{
  const FIRST = 18;
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
  console.log(`   ${same} of ${before} days from 2026-10-03 to ${cut} deal exactly what origin/main deals`);
}

console.log('6) From the cutover the daily deals the first 40 sheets, in their frozen order');
const GROWN = FROZEN_IDS.length;
{
  if (m.ELEVEN_GROWN_POOL !== GROWN) fail(6, `the grown daily deals from ${m.ELEVEN_GROWN_POOL} sheets, not the frozen ${GROWN}; a new sheet needs a new cutover`);
  const ids = LINEUPS.map((l) => l.id);
  const moved = FROZEN_IDS.findIndex((id, i) => ids[i] !== id);
  if (moved >= 0) fail(6, `slot ${moved} holds ${ids[moved]}, the frozen order has ${FROZEN_IDS[moved]} there; new sheets go on the end`);
  let same = 0;
  for (const [iso, want] of Object.entries(GROWN_DEALS)) {
    if (iso < cut) continue;
    const got = deal(iso);
    if (got === want) same += 1;
    else fail(6, `${iso} deals ${got}, the grown daily was measured dealing ${want}`);
  }
  const after = Object.keys(GROWN_DEALS).filter((d) => d >= cut).length;
  if (after < 7) fail(6, `only ${after} measured grown deals fall from the cutover on, too few to prove anything`);
  /* The What's New line tells players the day the daily switches; a cutover
     moved without it would leave that line false. */
  const wn = fs.readFileSync(`${ROOT}/src/pages/WhatsNew.tsx`, 'utf8').split('\n').find((x) => x.includes('Missing Eleven: 40 Super Bowl lineups'));
  const [cy, cmo, cd] = cut.split('-').map(Number);
  const cutWords = `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][cmo - 1]} ${cd}`;
  if (!wn) fail(6, 'the What\'s New line for the 40 lineups is gone');
  else if (!wn.includes(`until ${cutWords}`)) fail(6, `What's New does not say the daily switches on ${cutWords} (${cy})`);
  /* dailyIndex walks the pool in cycles cut on the day number, not on the
     cutover, so the full cycles are found by the day number. */
  const dayNo = (iso) => { const [y, mo, d] = iso.split('-').map(Number); return Math.floor(RealDate.UTC(y, mo - 1, d) / 86_400_000); };
  const seen = [];
  for (let k = 0; k < GROWN * 4; k += 1) { setDate(isoPlus(cut, k)); seen.push(m.getDailyElevenPuzzle().lineup.id); }
  let a = 0;
  while (dayNo(isoPlus(cut, a)) % GROWN !== 0) a += 1;
  let cycles = 0;
  for (let w = a; w + GROWN <= seen.length; w += GROWN) {
    cycles += 1;
    const n = new Set(seen.slice(w, w + GROWN)).size;
    if (n !== GROWN) fail(6, `the cycle from ${isoPlus(cut, w)} shows ${n} of ${GROWN} sheets`);
  }
  if (cycles < 3) fail(6, `only ${cycles} full cycles measured after the cutover`);
  const firstCycle = seen.slice(0, a + GROWN);
  const fresh = rec.sheets.map((s) => s.id).filter((id) => !firstCycle.includes(id));
  if (fresh.length) fail(6, `new sheets not dealt by the end of the first full cycle: ${fresh.join(', ')}`);
  console.log(`   ${same} of ${after} measured days from ${cut} deal as measured, the first ${GROWN} sheets sit in their frozen order, ${cycles} full cycles each show all ${GROWN}`);
}

/* The switch itself. Each pool on its own brings a sheet back after 2 days
   at the shortest (measured 2026-10-03: the 18 pool over 640 days from
   2025-01-01, the 40 pool over 800 days from the cutover), so the switch is
   held to that: no sheet two days running across it, and no sheet back
   sooner than either pool on its own brings one back. Measured: the
   shortest return across the switch is 9 days (sb-xlviii-sea-d, 2026-10-04
   and 2026-10-13). */
console.log('7) The switch deals no sheet back sooner than either pool does on its own');
{
  const shortest = (from, days) => {
    const last = new Map();
    let best = Infinity;
    for (let k = 0; k < days; k += 1) {
      setDate(isoPlus(from, k));
      const id = m.getDailyElevenPuzzle().lineup.id;
      if (last.has(id)) best = Math.min(best, k - last.get(id));
      last.set(id, k);
    }
    return best;
  };
  const oldPool = shortest(isoPlus(cut, -400), 400);
  const newPool = shortest(cut, 400);
  const span = GROWN;
  const ids = [];
  for (let k = -span; k < span; k += 1) { setDate(isoPlus(cut, k)); ids.push(m.getDailyElevenPuzzle().lineup.id); }
  let across = Infinity;
  let where = '';
  for (let i = 0; i < span; i += 1) {
    for (let j = span; j < ids.length; j += 1) {
      if (ids[i] === ids[j] && j - i < across) { across = j - i; where = `${ids[i]} on ${isoPlus(cut, i - span)} and ${isoPlus(cut, j - span)}`; }
    }
  }
  if (ids[span - 1] === ids[span]) fail(7, `${ids[span]} is dealt the day before the cutover and on it`);
  const floor = Math.min(oldPool, newPool);
  if (across < floor) fail(7, `${where}: back after ${across} days across the switch, while each pool on its own waits at least ${floor}`);
  console.log(`   shortest return: ${oldPool} days in the 18 pool, ${newPool} in the 40 pool, ${across} across the switch (${where || 'none'})`);
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
