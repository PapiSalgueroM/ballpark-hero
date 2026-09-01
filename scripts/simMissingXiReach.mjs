/* Missing XI reachability harness: can a player actually SUBMIT every answer?

   Round 383. Born out of the Round 381 sweep, which measured that 28 of the
   324 distinct blank answers in src/lib/missingXi.ts could not be submitted
   at all (the true number through the real guess path was 12). The page runs
   PlayerAutocomplete with validateOnly, so the only strings a player can ever
   lock in are the rows the search surfaces, and for a dozen names the
   database spelling never matches the lineup spelling (hyphen, name order, a
   nickname, a mononym, a transliteration, an accent the ilike leg misses).
   The existing simMissingXi.mjs sat green the whole time because it tests
   the matcher in isolation: it asks "does the candidate match itself" and
   never "does the real search hand the player a row the matcher accepts".

   This harness runs the REAL guess path. For every distinct blank candidate
   it calls the real searchPlayers with the page's own search options, using
   each string a player would type (the full name, the surname, the first
   name), merges the roster the page hands the autocomplete through the same
   mergeLocalNames the component calls, and fails unless some query surfaces
   a row that isCorrectGuess accepts. Every query runs and is reported on its
   own, so the partial-name paths are measured rather than assumed. Nothing
   here is a copy of the app's logic; every function is imported from the
   bundle. The one thing a bundle cannot run is the component itself, so
   section 1 pins the two lines through which the roster reaches a player
   (the merge call and the setSuggestions that receives it) in code with
   comments stripped, along with the page's element carrying both props.

   Section 3 is the identity fence. Every alias must have one table row
   carrying both the candidate's nationality and a club he was at, with
   every word of the lineup's club present in the table's ("Chelsea" is in
   "Chelsea FC"; "Manchester United" is not in "Manchester City"). That is
   what refuses the mistake the Round 381 handoff would have shipped (the
   table's "Petit" is Armando Petit of Benfica, not Emmanuel Petit). Then
   every candidate's surname is swept around the match year: any row that
   is him (his nationality, his club at the time) must be a string the
   matcher accepts. That is what found Nacho: the Real Madrid rows are
   "Nacho Fernández", the exact string "Nacho" is a Betis left-back, and
   only the wrong man's row was accepted. Namesake strings (the table's
   "Raul" is Brazilian) are reported, not failed: the right man's accented
   row is accepted too, it is the subtitle on offer that is somebody else's.

   Network. The prominence leg of searchPlayers fetches the same 1,000 rows
   for every query, so identical GET URLs are answered from a memo after the
   first live fetch. That is a transport cache, not a stub: the first answer
   for each URL is the live database, and the ilike leg is unique per query
   so it is always live. That pool is ordered on value with no tiebreak and
   317 rows tie at its 1,000th seat, so which of them a run sees is not
   deterministic; nothing here asserts on it. If the database is unreachable
   the run says SUPABASE UNREACHABLE. NOTHING WAS CHECKED. and exits 1, which
   runAllSims turns into a SKIP only when its own probe agrees the database
   is down. Transport errors are never counted as findings.

   Negative controls (house rule: prove each check can fail). Each asserts it
   changed something before running and is judged only on the section it
   targets, so a failure elsewhere cannot green it:
     SIM_MISSINGXI_REACH_CONTROL=noprop       deletes localNames from the page
                                             element before section 1.
     SIM_MISSINGXI_REACH_CONTROL=nocomponent  deletes the merge call from the
                                             component source before section 1.
     SIM_MISSINGXI_REACH_CONTROL=nolocal      drops the roster from the merge;
                                             section 2 must go red, which is
                                             the state Round 381 found.
     SIM_MISSINGXI_REACH_CONTROL=badalias     hangs the table's "Petit" on
                                             Emmanuel Petit; section 3 must
                                             refuse it as a different man.
     SIM_MISSINGXI_REACH_CONTROL=stripalias   drops every alias; section 3
                                             must then find the men stored
                                             under strings the matcher
                                             refuses (Nacho, Park, Bosingwa).

   Run: node scripts/simMissingXiReach.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_MISSINGXI_REACH_CONTROL || '';
const ENTRY = path.join(os.tmpdir(), 'missingXiReachEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'missingXiReach.bundle.mjs');

let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0, 3: 0 };
const fail = m => { failures += 1; bySection[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

fs.writeFileSync(ENTRY, `
export * as xi from '${ROOT_URL}/src/lib/missingXi.ts';
export * as ps from '${ROOT_URL}/src/lib/playerSearch.ts';
export { supabase } from '${ROOT_URL}/src/integrations/supabase/client.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

/* Both stubs must be installed in THIS process before the bundle is imported:
   the supabase client asks for localStorage and captures fetch when its
   module evaluates. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const realFetch = globalThis.fetch;
const memo = new Map();
const net = { live: 0, memo: 0, refused: false, failed: 0 };
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  const method = ((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
  if (method !== 'GET') return realFetch(input, init);
  if (!memo.has(url)) {
    net.live += 1;
    memo.set(url, (async () => {
      const r = await realFetch(input, init);
      const body = await r.text();
      if (/host not in allowlist/i.test(body)) net.refused = true;
      const headers = [...r.headers.entries()].filter(([k]) => !/^content-(encoding|length)$/i.test(k));
      return { status: r.status, statusText: r.statusText, headers, body };
    })().catch(err => { net.failed += 1; throw err; }));
  } else {
    net.memo += 1;
  }
  const c = await memo.get(url);
  return new Response(c.body, { status: c.status, statusText: c.statusText, headers: c.headers });
};

const { xi, ps, supabase } = await import(pathToFileURL(BUNDLE).href);
const { LINEUPS, isCorrectGuess } = xi;

const nothingChecked = () => abort('\nSUPABASE UNREACHABLE. NOTHING WAS CHECKED.');

/* Source read as code: block comments, // comments to end of line, and
   string literals all removed before any shape is looked for. */
const asCode = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, '""');

/* Words that carry no identity when two club or country strings are
   compared: prefixes and suffixes only. "United" and "City" stay, because
   they are what tells the two Manchester clubs apart. */
const NOISE = new Set(['fc', 'sl', 'as', 'ac', 'sc', 'cr', 'cf', 'bk', 'ss', 'ssc', 'club', 'football', 'the', 'de', 'do', 'da', 'of', 'and']);
/* A club string that carries one of these names another club than the bare
   city does: "RCD Espanyol Barcelona" is not Barcelona, "Inter Milan" is not
   AC Milan. Present in the table's string and absent from the lineup's, it
   breaks the match. */
const QUALIFIERS = ['espanyol', 'inter', 'atletico'];
const tokens = s => ps.normalizeName(s).split(/[^a-z]+/).filter(t => t.length >= 3 && !NOISE.has(t));
/* Every word of what the lineup says must appear in what the table says. */
const covers = (actual, expected) => {
  const A = new Set(tokens(actual));
  const E = tokens(expected);
  if (E.length === 0 || !E.every(t => A.has(t))) return false;
  return !QUALIFIERS.some(qual => A.has(qual) && !E.includes(qual));
};

section = 1;
console.log('1) The roster reaches the player: the page passes it, and the component merges it into what it shows');
{
  const pageFile = path.join(ROOT, 'src/pages/MissingXi.tsx');
  let page = asCode(fs.readFileSync(pageFile, 'utf8'));
  const element = page.match(/<PlayerAutocomplete\b[\s\S]*?\/>/);
  if (!element) fail('MissingXi.tsx has no <PlayerAutocomplete ... /> element in its code');
  else {
    let el = element[0];
    if (CONTROL === 'noprop') {
      if (!/localNames=\{XI_ROSTER_NAMES\}/.test(el)) abort('control cannot run: the prop it is meant to delete is not there');
      el = el.replace(/localNames=\{XI_ROSTER_NAMES\}/, '');
    }
    if (!/localNames=\{XI_ROSTER_NAMES\}/.test(el)) fail('the page element does not pass localNames={XI_ROSTER_NAMES}, so only database spellings can be submitted');
    if (!/searchOptions=\{XI_SEARCH_OPTIONS\}/.test(el)) fail('the page element does not pass searchOptions={XI_SEARCH_OPTIONS}, so this harness would not be walking the search the player gets');
  }

  const compFile = path.join(ROOT, 'src/components/game/PlayerAutocomplete.tsx');
  let comp = asCode(fs.readFileSync(compFile, 'utf8'));
  const mergeCall = /mergeLocalNames\(\s*remote\s*,\s*localNames\s*,\s*value\s*,\s*searchOptions\.exclude\s*\)/;
  if (CONTROL === 'nocomponent') {
    if (!mergeCall.test(comp)) abort('control cannot run: the merge call it is meant to delete is not there');
    comp = comp.replace(mergeCall, 'remote');
  }
  if (!mergeCall.test(comp)) fail('PlayerAutocomplete no longer merges localNames through mergeLocalNames, so the roster never reaches the dropdown');
  if (!/setSuggestions\(\s*mergeLocal\(/.test(comp)) fail('PlayerAutocomplete does not hand the merged list to setSuggestions, so the roster never reaches the dropdown');

  const roster = xi.XI_ROSTER_NAMES;
  if (!Array.isArray(roster)) fail('XI_ROSTER_NAMES is not exported from missingXi.ts');
  else {
    const slots = new Set(LINEUPS.flatMap(l => l.slots.map(s => ps.normalizeName(s.name))));
    const rosterKeys = new Set(roster.map(n => ps.normalizeName(n)));
    for (const k of slots) if (!rosterKeys.has(k)) fail(`roster is missing starter "${k}"`);
    if (rosterKeys.size !== roster.length) fail('roster carries two spellings of one man');
    /* The roster must be the whole file, never one lineup: eleven names would
       hand the answer to anyone who types two characters. */
    if (roster.length < 500) fail(`roster has ${roster.length} names, which is not the whole file`);
    console.log(`   roster: ${roster.length} distinct starters across ${LINEUPS.length} lineups`);
  }
  if (typeof ps.mergeLocalNames !== 'function') fail('mergeLocalNames is not exported from playerSearch.ts');
  if (!xi.XI_SEARCH_OPTIONS || typeof xi.XI_SEARCH_OPTIONS !== 'object') fail('XI_SEARCH_OPTIONS is not exported from missingXi.ts');
}

/* One entry per distinct answer. The same man blanks in several lineups
   (Park Ji-sung in two), and reachability is a property of the name. */
const byName = new Map();
for (const lu of LINEUPS) for (const c of lu.blankCandidates) if (!byName.has(c.name)) byName.set(c.name, { c, lineup: lu.id });
const candidates = [...byName.values()];

const options = xi.XI_SEARCH_OPTIONS;
const minChars = (options && options.minChars) ?? 3;
const roster = Array.isArray(xi.XI_ROSTER_NAMES) ? xi.XI_ROSTER_NAMES : [];
const useLocal = CONTROL !== 'nolocal';

const queriesFor = name => {
  const words = name.trim().split(/\s+/);
  const out = [];
  for (const [kind, q] of [['full', name], ['surname', words[words.length - 1]], ['first', words[0]]]) {
    if (ps.normalizeName(q).length < minChars) continue;
    if (out.some(o => o.q === q)) continue;
    out.push({ kind, q });
  }
  return out;
};

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

section = 2;
if (CONTROL === 'noprop' || CONTROL === 'nocomponent' || CONTROL === 'badalias') {
  console.log('2) (skipped under this control, it exercises a different check)');
} else if (!options) {
  console.log('2) (skipped: no search options to walk)');
} else {
  if (CONTROL === 'nolocal' && (roster.length === 0 || typeof ps.mergeLocalNames !== 'function')) abort('control cannot run: there is no roster to strip');
  console.log(`2) Every one of ${candidates.length} distinct answers can be locked in through the real search${useLocal ? '' : ' (roster stripped)'}`);
  let errors = 0;
  let queriesRun = 0;
  const verdicts = await pool(candidates, 6, async ({ c, lineup }) => {
    const via = {};
    let offered = [];
    for (const { kind, q } of queriesFor(c.name)) {
      queriesRun += 1;
      const res = await ps.searchPlayers({ ...options, query: q });
      if (res.error) { errors += 1; via[kind] = 'error'; continue; }
      const merged = useLocal ? ps.mergeLocalNames(res.results, roster, q) : res.results;
      const at = merged.findIndex(e => isCorrectGuess(e.name, c));
      via[kind] = at === -1 ? null : at + 1;
      if (kind === 'full') offered = merged.slice(0, 3).map(e => e.name);
    }
    return { c, lineup, via, offered };
  });
  if (net.refused || (net.live > 0 && net.failed === net.live)) nothingChecked();
  /* Every query erroring is a dead database, not 324 unreachable answers. Some
     erroring is a real finding and stays one. */
  if (queriesRun > 0 && errors === queriesRun) nothingChecked();
  const reachable = v => Object.values(v.via).some(x => typeof x === 'number');
  const unreachable = verdicts.filter(v => !reachable(v));
  for (const v of unreachable) {
    fail(`"${v.c.name}" (${v.lineup}) cannot be submitted: typing the name offers ${v.offered.length ? v.offered.map(n => `"${n}"`).join(', ') : 'nothing'}`);
  }
  const count = kind => verdicts.filter(v => typeof v.via[kind] === 'number').length;
  const asked = kind => verdicts.filter(v => kind in v.via).length;
  const rowOne = verdicts.filter(v => v.via.full === 1).length;
  console.log(`   ${verdicts.length - unreachable.length} reachable, ${unreachable.length} unreachable, ${errors} search errors over ${queriesRun} queries`);
  console.log(`   by full name ${count('full')} of ${asked('full')} (${rowOne} as the first row), by surname ${count('surname')} of ${asked('surname')}, by first name ${count('first')} of ${asked('first')}`);
  console.log(`   network: ${net.live} live GETs, ${net.memo} answered from the memo`);
}

section = 3;
if (CONTROL === 'nolocal' || CONTROL === 'noprop' || CONTROL === 'nocomponent') {
  console.log('3) (skipped under this control, it exercises a different check)');
} else {
  console.log('3) Every alias is the SAME man, and no man is stored under a string the matcher refuses');
  /* Three questions, in order of strength.
     (a) Every alias: one row must carry both the candidate's nationality and
         a club he was at. Aliases are hand added data, eight of them, and this
         is what refuses Armando Petit standing in for Emmanuel Petit.
     (b) Every candidate: the table's rows around the match year that carry
         his nationality and his club at the time, found by his surname, must
         all be strings the matcher accepts. This is what found Nacho: the
         2022 and 2024 Real Madrid rows are "Nacho Fernández", the exact
         string "Nacho" is a Betis left-back, and only the wrong man's row
         was accepted. It cannot demand a club row for a 1998 final in a
         table that starts in 2004, because it only looks at what is there.
     (c) Every candidate whose exact name is a table string: if none of those
         rows carries his nationality, the string is a namesake (the table's
         "Raul" is Brazilian; Raúl of Real Madrid is stored with the accent,
         which the matcher accepts but the search rarely surfaces). That is a
         display defect, not a wrong answer, so it is reported and counted,
         not failed. */
  const stripAll = CONTROL === 'stripalias';
  const matchYear = lu => Number(String(lu.matchDate).slice(0, 4));
  const plainClub = s => s.replace(/\(.*?\)/g, ' ');
  const entries = [];
  for (const lu of LINEUPS) {
    for (const c of lu.blankCandidates) {
      const cand = stripAll ? { ...c, aliases: [] } : c;
      entries.push({ c: cand, lu });
    }
  }
  if (stripAll && !entries.some(e => LINEUPS.some(l => l.blankCandidates.some(c => c.aliases && c.aliases.length)))) abort('control cannot run: no alias to strip');
  if (CONTROL === 'badalias') {
    const petit = entries.find(e => e.c.name === 'Emmanuel Petit');
    if (!petit) abort('control cannot run: could not find Emmanuel Petit to corrupt');
    if (petit.c.aliases && petit.c.aliases.length) abort('control cannot run: Emmanuel Petit already carries an alias');
    petit.c = { ...petit.c, aliases: ['Petit'] };
  }

  let rowsRead = 0;
  let transport = 0;
  let aliasesChecked = 0;
  let surnamesChecked = 0;
  const namesakes = [];
  const seenAlias = new Set();
  const seenName = new Set();

  for (const { c, lu } of entries) {
    /* (a) aliases */
    for (const alias of c.aliases || []) {
      const key = `${c.name}|${c.clubAtTime}|${alias}`;
      if (seenAlias.has(key)) continue;
      seenAlias.add(key);
      if (ps.normalizeName(alias) === ps.normalizeName(c.name)) { fail(`${lu.id}: alias "${alias}" on "${c.name}" is the same string, it does nothing`); continue; }
      const { data, error } = await supabase.from('player_market_values').select('nationality, club, year').eq('player_name', alias).limit(1000);
      if (error) { transport += 1; continue; }
      rowsRead += data.length;
      if (data.length === 0) { fail(`${lu.id}: alias "${alias}" on "${c.name}" is not a database spelling at all`); continue; }
      aliasesChecked += 1;
      const same = data.some(r => covers(r.nationality || '', c.nationality) && covers(r.club || '', plainClub(c.clubAtTime)));
      if (!same) {
        const shape = [...new Set(data.map(r => `${r.nationality} at ${r.club}`))].slice(0, 4).join('; ');
        fail(`${lu.id}: alias "${alias}" on "${c.name}" has no row as ${c.nationality} at ${c.clubAtTime}, the table has ${shape}: a different man`);
      }
    }

    /* (b) and (c), once per name and lineup */
    const nameKey = `${c.name}|${lu.id}`;
    if (seenName.has(nameKey)) continue;
    seenName.add(nameKey);
    const words = c.name.trim().split(/\s+/);
    const surname = c.surname ?? words[words.length - 1];
    const year = matchYear(lu);
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, nationality, club, year')
      .ilike('player_name', `%${surname}%`)
      .gte('year', year - 1)
      .lte('year', year + 1)
      .limit(1000);
    if (error) { transport += 1; continue; }
    rowsRead += data.length;
    surnamesChecked += 1;
    /* The same man under another string shares his words with the lineup's
       name in one direction or the other ("Nacho" in "Nacho Fernández",
       "Bosingwa" in "Jose Bosingwa", "Ji-sung Park" and "Park Ji-sung").
       A teammate who merely contains the surname does not: "Lorenzo
       Insigne" is not Giovanni Di Lorenzo, whatever the club and year. */
    const cWords = new Set(ps.normalizeName(c.name).split(' '));
    const sharesWords = n => {
      const w = ps.normalizeName(n).split(' ');
      return w.every(x => cWords.has(x)) || [...cWords].every(x => w.includes(x));
    };
    const his = data.filter(r => sharesWords(r.player_name || '') && covers(r.nationality || '', c.nationality) && covers(r.club || '', plainClub(c.clubAtTime)));
    /* If a string the matcher accepts already carries a row that is him, the
       others sharing his words are namesakes (the table's "Roberto" is a
       goalkeeper at Espanyol; Sergi Roberto is stored as Sergi Roberto). Only
       when no accepted string reaches him does a refused one become the bug. */
    const reachedAlready = his.some(r => isCorrectGuess(r.player_name, c));
    if (!reachedAlready) {
      const refused = [...new Set(his.map(r => r.player_name))].filter(n => !isCorrectGuess(n, c));
      for (const n of refused) {
        fail(`${lu.id}: the table stores "${c.name}" as "${n}" (${c.nationality} at ${c.clubAtTime} around ${year}) and the matcher refuses that row`);
      }
    }
    const exact = data.filter(r => r.player_name === c.name);
    if (exact.length > 0 && !exact.some(r => covers(r.nationality || '', c.nationality))) {
      namesakes.push(`"${c.name}" (${lu.id}) is ${[...new Set(exact.map(r => r.nationality))].join('/')} in the table`);
    }
  }
  if (transport > 0 && rowsRead === 0) nothingChecked();
  if (transport > 0) console.log(`   ${transport} lookups hit a transport error and were not counted`);
  for (const n of namesakes) console.log(`   namesake, display only: ${n}`);
  console.log(`   ${aliasesChecked} aliases checked, ${surnamesChecked} surnames swept around their match year, ${namesakes.length} namesake strings, ${rowsRead} rows read`);
}

if (CONTROL) {
  const target = { noprop: 1, nocomponent: 1, nolocal: 2, badalias: 3, stripalias: 3 }[CONTROL];
  if (!target) abort(`unknown control "${CONTROL}"`);
  const fired = bySection[target];
  const elsewhere = failures - fired;
  if (fired > 0) {
    console.log(`\ncontrol "${CONTROL}": ${fired} failure(s) fired in section ${target} as expected, the check works${elsewhere ? ` (${elsewhere} elsewhere, not counted)` : ''}`);
    process.exit(0);
  }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${target}, the check is dead${elsewhere ? ` (${elsewhere} failure(s) elsewhere do not count)` : ''}`);
}

if (failures > 0) {
  console.error(`\nsimMissingXiReach: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimMissingXiReach: all green');
