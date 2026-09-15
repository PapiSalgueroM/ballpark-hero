/* College Grid page harness: the page judges in memory, charges only a no, offers the key's names and says only what the key holds.

   Round 611. College Grid used to send every guess to an AI validator that
   runs out of its free allowance for most of the US day; a guess it could
   not confirm was never counted, so boards could be neither won nor lost.
   The page now judges against the answer key in memory. This fence reads the
   page's code with comments stripped (a guard that reads its own prose
   proves nothing) so the old path cannot come back one line at a time.

   WHAT THIS HOLDS:
     1. JUDGED IN MEMORY. src/hooks/useCollegeGrid.ts imports @/lib/collegeGrid,
        calls judgeCollegeCell and fetchCollegeGridData, and carries no
        functions.invoke(, no exhausted and no checkingDown. The page carries
        no checkingDown either.
     2. ONLY A NO COSTS A GUESS. In submitGuess, the not-found and duplicate
        branches and the unknown branch all return without calling
        addDailyGuess; every addDailyGuess call sits after the unknown branch;
        the no branch adds { t: 'x' }; the catch adds only on a yes.
     3. THE KEY'S NAMES. src/components/college-grid/CollegeGridSearch.tsx
        searches COLLEGE_GRID_PLAYER_SOURCE with validateOnly and never
        imports the hand typed nflCareerPlayers list.
     4. THE COPY ONLY ASKS WHAT THE POOL OFFERS. The '/college-grid' guide
        entry, the page, the how to play dialog and the hook's messages name
        no retired label, no 2000 to 2026 pool and no "any name you can
        spell". Every (player, school, criterion) the copy states judges yes
        against the committed key, and each named player is first asserted to
        still be in that copy. The page's examples are parsed out of the page
        itself; the prose claims are listed below with the file they live in.
        Every criterion the guide, the page or the dialog names (First Round
        Pick, Top 5 Pick and so on) is dealt on at least one board, so the
        copy never promises a column the pool cannot deal.
     5. A SAVE FROM ANOTHER BOARD IS NOT SHOWN. Both action shapes carry the
        board id, every addDailyGuess call passes it, and a restored log with
        a different id is compared, cleared with reset(), held off the screen
        while it clears, and cannot be played on.

   NEGATIVE CONTROLS. Every one runs on EVERY invocation, in memory, and each
   refuses to run unless its target text appears exactly once:
     invoke         plants a functions.invoke of college-grid-validate in the hook   section 1
     chargeunknown  plants an addDailyGuess x in the unknown branch                  section 2
     typedlist      plants the nflCareerPlayers import in the search box             section 3
     copy           plants "SEC Conference" into the guide intro                     section 4
     undealt        plants a criterion no board deals into the guide intro           section 4
     noboardid      removes the board id comparison from the hook                    section 5
   SIM_CGPAGE_CONTROL=<name> runs just that control and exits 0 only if it fired.

   Run: node scripts/simCollegeGridPage.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readKeyFile } from './genCollegeGridData.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = 'src/hooks/useCollegeGrid.ts';
const PAGE = 'src/pages/CollegeGrid.tsx';
const DIALOG = 'src/components/college-grid/CollegeGridHowToPlay.tsx';
const SEARCH = 'src/components/college-grid/CollegeGridSearch.tsx';
const GUIDE = 'src/data/gameContent/college.ts';

const CONTROLS = { invoke: 1, chargeunknown: 2, typedlist: 3, copy: 4, undealt: 4, noboardid: 5 };
const ONLY = process.env.SIM_CGPAGE_CONTROL || '';
if (ONLY && !CONTROLS[ONLY]) {
  console.error(`SIM_CGPAGE_CONTROL=${ONLY} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simcgpage-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function mustReplace(text, from, to, what) {
  const n = text.split(from).length - 1;
  if (n !== 1) abort(`control cannot run: ${what} carries ${n} copies of ${JSON.stringify(from.slice(0, 70))}, not exactly one, so this control would prove nothing`);
  return text.replace(from, to);
}

/** The text from the first "{" at or after `at` to its matching "}", or null. */
function blockFrom(text, at) {
  const open = text.indexOf('{', at);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') { depth -= 1; if (depth === 0) return { start: open, end: i + 1, body: text.slice(open, i + 1) }; }
  }
  return null;
}

function guideEntry(content) {
  const start = content.indexOf("'/college-grid': {");
  if (start < 0) return '';
  const end = content.indexOf("\n  '/", start + 1);
  return content.slice(start, end < 0 ? content.length : end);
}

const source = {
  hook: stripComments(read(HOOK)),
  page: stripComments(read(PAGE)),
  dialog: stripComments(read(DIALOG)),
  search: stripComments(read(SEARCH)),
  guide: guideEntry(read(GUIDE)),
};
if (!source.guide) abort(`${GUIDE} has no '/college-grid' entry; NOTHING WAS CHECKED`);

// ---------------------------------------------------------------------------
// The sections, each a function of the source it reads so a control can feed it a planted copy
// ---------------------------------------------------------------------------

function sectionOne(hook, page) {
  const out = [];
  if (!/from '@\/lib\/collegeGrid'/.test(hook)) out.push('the hook does not import @/lib/collegeGrid');
  if (!/judgeCollegeCell\(/.test(hook)) out.push('the hook does not judge with judgeCollegeCell');
  if (!/fetchCollegeGridData\(\)/.test(hook)) out.push('the hook does not fetch the key');
  if (/functions\.invoke\(/.test(hook)) out.push('the hook invokes an edge function; the page must judge in memory');
  if (/exhausted/i.test(hook)) out.push('the hook still reads an exhausted flag');
  if (/checkingDown/.test(hook)) out.push('the hook still carries checkingDown');
  if (/checkingDown/.test(page)) out.push('the page still carries checkingDown');
  return out;
}

function sectionTwo(hook) {
  const out = [];
  const at = hook.indexOf('const submitGuess');
  const submit = at >= 0 ? blockFrom(hook, hook.indexOf('async (playerName', at)) : null;
  if (!submit) return ['no submitGuess body found in the hook'];
  const body = submit.body;
  const judgeAt = body.indexOf('judgeCollegeCell(');
  if (judgeAt < 0) return ['submitGuess does not call judgeCollegeCell'];
  const before = body.slice(0, judgeAt);
  if (!/if \(!player\) \{[^}]*return;/.test(before)) out.push('a name the key does not carry no longer returns before judging');
  if (!/already on your board[\s\S]*?return;/.test(before)) out.push('a player already on the board no longer returns before judging');
  if (/addDailyGuess\(/.test(before)) out.push('a guess is added before the verdict (the not-found or duplicate branch charges)');
  const unknownAt = body.indexOf("if (verdict === 'unknown')");
  const unknown = unknownAt >= 0 ? blockFrom(body, unknownAt) : null;
  if (!unknown) out.push("no if (verdict === 'unknown') branch in submitGuess");
  else {
    if (/addDailyGuess\(/.test(unknown.body)) out.push('the unknown branch calls addDailyGuess, so a guess the records cannot settle is charged');
    if (!/return;/.test(unknown.body)) out.push('the unknown branch does not return, so it falls through to a charge');
    const calls = [...body.matchAll(/addDailyGuess\(/g)].map(m => m.index);
    if (calls.some(i => i < unknown.end)) out.push('an addDailyGuess call sits before the end of the unknown branch');
  }
  const yesAt = body.indexOf("if (verdict === 'yes') {");
  const yes = yesAt >= 0 ? blockFrom(body, yesAt) : null;
  const rest = yes ? body.slice(yes.end) : '';
  const elseBlock = /^\s*else\s*\{/.test(rest) ? blockFrom(rest, 0) : null;
  if (!yes || !elseBlock) out.push("no if (verdict === 'yes') { ... } else { ... } pair in submitGuess");
  else {
    if (!/addDailyGuess\(\{ t: 'x'/.test(elseBlock.body)) out.push("the no branch does not add { t: 'x' }");
    if (!/addDailyGuess\(\{ t: 'ok'/.test(yes.body)) out.push("the yes branch does not add { t: 'ok' }");
  }
  const xCalls = (body.match(/addDailyGuess\(\{ t: 'x'/g) || []).length;
  if (xCalls !== 1) out.push(`submitGuess adds a miss in ${xCalls} places; only the no branch may`);
  const catchAt = body.indexOf('catch');
  const catchBlock = catchAt >= 0 ? blockFrom(body, catchAt) : null;
  if (catchBlock && /addDailyGuess\(/.test(catchBlock.body) && !/if \(verdict === 'yes'\) addDailyGuess\(\{ t: 'ok'/.test(catchBlock.body)) out.push('the catch adds a guess that is not a yes');
  return out;
}

function sectionThree(search) {
  const out = [];
  if (!/source: COLLEGE_GRID_PLAYER_SOURCE/.test(search)) out.push('the search box does not search COLLEGE_GRID_PLAYER_SOURCE');
  if (!/\bvalidateOnly\b/.test(search)) out.push('the search box lets free text through (validateOnly is gone)');
  if (/nflCareerPlayers/.test(search)) out.push('the search box imports the hand typed nflCareerPlayers list again');
  if (/localNames=/.test(search)) out.push('the search box hands a local names list to the autocomplete');
  return out;
}

const RETIRED = [
  [/conference/i, 'a conference'], [/\b(SEC|Big Ten|Pac-12|ACC|Big 12)\b/, 'a conference name'],
  [/pro bowl/i, 'Pro Bowler'], [/hall of fame/i, 'Hall of Famer'], [/\bMVP\b/i, 'NFL MVP'], [/super bowl/i, 'Won a Super Bowl'],
  [/national champ/i, 'National Champion'], [/all-american/i, 'All-American'], [/outland/i, 'Outland Trophy'],
  [/doak walker/i, 'Doak Walker Award'], [/thorpe/i, 'Jim Thorpe Award'], [/butkus/i, 'Butkus Award'],
  [/undrafted/i, 'Went Undrafted'], [/10\+|ten or more (nfl )?seasons|played 10/i, 'Played 10+ NFL Seasons'],
  [/transferred schools/i, 'Transferred Schools'], [/two sports/i, 'Played Two Sports'],
  [/defensive end/i, 'Defensive End'], [/defensive tackle/i, 'Defensive Tackle'], [/cornerback/i, 'Cornerback'], [/\bsafety\b/i, 'Safety'],
  [/\b2000\b[^.\n]{0,12}\b2026\b/, 'the 2000 to 2026 pool'], [/any name you can spell/i, "'any name you can spell'"],
];

/** The hook's string literals only: its code names fields like entry.undrafted. */
const stringLiterals = code => [...code.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map(m => m[0]).join('\n');

/* The prose claims, each with the file whose copy states it. The page's own
   examples array is parsed rather than listed. */
const PROSE_CLAIMS = [
  [DIALOG, 'Deion Sanders', 'Florida State', 'Defensive Back'],
  [DIALOG, 'Jalen Hurts', 'Alabama', 'Quarterback'],
  [DIALOG, 'Jalen Hurts', 'Oklahoma', 'Quarterback'],
  [GUIDE, 'Derrick Henry', 'Alabama', 'Heisman Winner'],
  [GUIDE, 'Chase Young', 'Ohio State', 'First Round Pick'],
  [GUIDE, 'Chase Young', 'Ohio State', 'Defensive Lineman'],
  [GUIDE, 'Chase Young', 'Ohio State', 'Linebacker'],
  [GUIDE, 'Scott Frost', 'Nebraska', 'Quarterback'],
  [GUIDE, 'Scott Frost', 'Nebraska', 'Defensive Back'],
  [GUIDE, 'JaMarcus Russell', 'LSU', 'Quarterback'],
  [GUIDE, 'JaMarcus Russell', 'LSU', '1st Overall Pick'],
  [GUIDE, 'Joe Burrow', 'LSU', 'Quarterback'],
  [GUIDE, 'Joe Burrow', 'Ohio State', 'Quarterback'],
  [GUIDE, 'Jalen Hurts', 'Alabama', 'Quarterback'],
  [GUIDE, 'Jalen Hurts', 'Oklahoma', 'Quarterback'],
];
/* Facts the guide's prose states beside a claim: Henry "won it in 2015", Russell "the first overall pick in 2007". */
const PROSE_FACTS = [
  [GUIDE, 'Derrick Henry', 'won it in 2015', e => e.heismanYear === 2015, e => `heisman_year ${e.heismanYear}`],
  [GUIDE, 'JaMarcus Russell', 'first overall pick in 2007', (e, p) => e.bestPick === 1 && p.draft_best_year === 2007, (e, p) => `best_pick ${e.bestPick} in ${p.draft_best_year}`],
];

let judge = null;
async function loadJudge() {
  const entry = path.join(TMP, 'entry.mjs');
  const bundle = path.join(TMP, 'bundle.mjs');
  const abs = f => path.join(ROOT, f).replaceAll('\\', '/');
  fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${abs('src/lib/collegeGrid.ts')}');
export const engine = await import('${abs('src/lib/gridEngine.ts')}');
export const puzzles = await import('${abs('src/data/collegeGridPuzzles.ts')}');
`);
  const r = spawnSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${entry}" --bundle --format=esm --platform=node --outfile="${bundle}" --log-level=error`, { shell: true, encoding: 'utf8' });
  if (r.status !== 0) abort(`esbuild could not bundle the College Grid judge:\n${r.stderr || r.stdout}`);
  const { lib, engine, puzzles } = await import(pathToFileURL(bundle).href);
  const raws = readKeyFile(JSON.parse(read('scripts/data/collegeGridPlayers.json')));
  const entries = lib.indexCollegeEntries(raws);
  const byName = new Map(entries.map(e => [engine.normalizeGridName(e.name), e]));
  const proofById = new Map(raws.map(p => [p.id, p.proof]));
  const dealt = new Set(puzzles.collegeGridPuzzles.flatMap(b => [...b.rows, ...b.cols].map(a => a.label)));
  return { lib, engine, byName, proofById, size: entries.length, dealt, boards: puzzles.collegeGridPuzzles.length };
}

function sectionFour(texts) {
  const out = [];
  const places = [['the guide entry', texts.guide], [PAGE, texts.page], [DIALOG, texts.dialog], [`${HOOK} strings`, stringLiterals(texts.hook)]];
  for (const [where, text] of places) {
    for (const [re, label] of RETIRED) {
      const m = text.match(re);
      if (m) out.push(`${where} names a retired label (${label}): "${text.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\s+/g, ' ')}"`);
    }
  }
  /* A column the copy promises has to be one a board deals (1st Overall Pick
     clears the floor at one school, so no board can carry it). */
  const named = [];
  for (const l of judge.lib.CRITERIA_LABELS) {
    for (const [where, text] of places.slice(0, 3)) {
      if (!text.includes(l.label)) continue;
      named.push(l.label);
      if (!judge.dealt.has(l.label)) out.push(`${where} names ${l.label}, which none of the ${judge.boards} boards deals`);
    }
  }
  const examples = texts.page.match(/examples=\{\[([\s\S]*?)\]\}/);
  const claims = [];
  if (!examples) out.push(`${PAGE} has no examples array to check`);
  else {
    for (const m of examples[1].matchAll(/"([^"]+)"|'([^']+)'/g)) {
      const line = m[1] ?? m[2];
      const parsed = line.match(/^(.+?) \+ (.+?) = (.+)$/);
      if (!parsed) { out.push(`${PAGE} example "${line}" is not "School + Criterion = Name, Name"`); continue; }
      for (const name of parsed[3].split(',').map(s => s.trim()).filter(Boolean)) claims.push([PAGE, name, parsed[1].trim(), parsed[2].trim()]);
    }
    if (claims.length < 6) out.push(`${PAGE} examples yield only ${claims.length} claims`);
  }
  const textOf = f => (f === GUIDE ? texts.guide : f === DIALOG ? texts.dialog : texts.page);
  let judged = 0;
  for (const [f, name, row, col] of [...claims, ...PROSE_CLAIMS]) {
    if (!textOf(f).includes(name)) { out.push(`${f} no longer names ${name}; drop or update the claim ${name} x ${row} x ${col} in this harness`); continue; }
    const e = judge.byName.get(judge.engine.normalizeGridName(name));
    if (!e) { out.push(`${f} names ${name}, and the key has no such player`); continue; }
    if (e.name !== name) out.push(`${f} names ${name}, and the key spells him ${e.name}`);
    if (!judge.lib.labelOf(row) || !judge.lib.labelOf(col)) { out.push(`${f}: "${row}" or "${col}" is not a College Grid label`); continue; }
    const v = judge.lib.judgeCollegeCell(e, row, col);
    if (v !== 'yes') out.push(`${f} says ${name} fits ${row} x ${col}, and the key judges ${v}`);
    judged += 1;
  }
  for (const [f, name, phrase, ok, what] of PROSE_FACTS) {
    const text = textOf(f);
    if (!text.includes(name) || !text.includes(phrase)) { out.push(`${f} no longer says ${name} ... "${phrase}"; update this fact`); continue; }
    const e = judge.byName.get(judge.engine.normalizeGridName(name));
    const p = e && judge.proofById.get(e.id);
    if (!e || !ok(e, p)) out.push(`${f} says ${name} ${phrase}, and the key holds ${e ? what(e, p) : 'no such player'}`);
  }
  return { out, judged, parsed: claims.length, named: new Set(named).size };
}

function sectionFive(hook) {
  const out = [];
  if (!/\{ t: 'ok';[^}]*\bboard: string[^}]*\}/.test(hook)) out.push("the ok action shape does not carry board: string");
  if (!/\{ t: 'x';[^}]*\bboard: string[^}]*\}/.test(hook)) out.push("the x action shape does not carry board: string");
  const calls = [...hook.matchAll(/addDailyGuess\((\{[^}]*\})\)/g)].map(m => m[1]);
  if (calls.length < 2) out.push(`only ${calls.length} addDailyGuess calls found`);
  for (const c of calls) if (!/\bboard\b/.test(c)) out.push(`addDailyGuess(${c}) does not pass the board id`);
  const stale = hook.match(/const staleLog = ([^;]+);/);
  if (!stale || !/\.board !== puzzle\.id/.test(stale[1])) out.push('no restored action is compared with the board id (staleLog)');
  if (!/useEffect\(\(\) => \{\s*if \(staleLog\) reset\(\);\s*\}/.test(hook)) out.push('a stale log is not cleared with reset()');
  if (!/const isLoading = [^;]*\bstaleLog\b/.test(hook)) out.push('a stale log is not held off the screen while it clears');
  if (!/if \([^)]*\bstaleLog\b[^)]*\) return;/.test(hook)) out.push('submitGuess can play on a stale log');
  return out;
}

// ---------------------------------------------------------------------------

judge = await loadJudge();
const report = (n, title, out, extra) => {
  console.log(`\n${n}) ${title}`);
  out.forEach(fail);
  if (extra) console.log(`   ${extra}`);
};

if (!ONLY) {
  report(1, 'Judged in memory: the hook imports the lib, judges locally, and never invokes the validator', sectionOne(source.hook, source.page), 'hook and page read as code');
  report(2, 'Only a no costs a guess', sectionTwo(source.hook), 'submitGuess read branch by branch');
  report(3, "The key's names: COLLEGE_GRID_PLAYER_SOURCE with validateOnly, no typed list", sectionThree(source.search), 'search box read as code');
  const four = sectionFour(source);
  report(4, 'The copy only asks what the pool offers', four.out, `${four.parsed} example claims parsed from the page and ${PROSE_CLAIMS.length} prose claims, ${four.judged} judged against the ${judge.size} row key; ${PROSE_FACTS.length} stated facts read; ${four.named} criteria named in the copy, each checked against the labels the ${judge.boards} boards deal`);
  report(5, 'A save from another board is not shown', sectionFive(source.hook), 'action shapes, guesses and the stale log read');
}

const fired = [];
const grade = (name, out) => {
  if (out.length) { fired.push(name); console.log(`   fired: ${out[0].slice(0, 160)}`); } else fail(`control ${name} changed nothing: section ${CONTROLS[name]} stayed green`);
};
const want = name => !ONLY || ONLY === name;
console.log('\nNegative controls');

if (want('invoke')) {
  console.log('\ninvoke) a functions.invoke of college-grid-validate planted in the hook');
  const hook = mustReplace(source.hook, 'const verdict = judgeCollegeCell(player, rowAttr, colAttr);',
    "const verdict = judgeCollegeCell(player, rowAttr, colAttr);\n      const { data } = await supabase.functions.invoke('college-grid-validate', { body: { playerName } });", HOOK);
  grade('invoke', sectionOne(hook, source.page));
}
if (want('chargeunknown')) {
  console.log('\nchargeunknown) an addDailyGuess x planted in the unknown branch');
  const hook = mustReplace(source.hook, "if (verdict === 'unknown') {", "if (verdict === 'unknown') {\n        addDailyGuess({ t: 'x', board: puzzle.id });", HOOK);
  grade('chargeunknown', sectionTwo(hook));
}
if (want('typedlist')) {
  console.log('\ntypedlist) the nflCareerPlayers import planted in the search box');
  const search = mustReplace(source.search, "import { COLLEGE_GRID_PLAYER_SOURCE } from '@/lib/collegeGrid';",
    "import { COLLEGE_GRID_PLAYER_SOURCE } from '@/lib/collegeGrid';\nimport { nflCareerPlayers } from '@/data/nflCareerPlayers';", SEARCH);
  grade('typedlist', sectionThree(search));
}
if (want('copy')) {
  console.log('\ncopy) "SEC Conference" planted into the guide intro');
  const guide = mustReplace(source.guide, '    intro: [\n', '    intro: [\n      "Rows can be the SEC Conference.",\n', `${GUIDE} '/college-grid' entry`);
  grade('copy', sectionFour({ ...source, guide }).out);
}
if (want('undealt')) {
  const label = judge.lib.CRITERIA_LABELS.map(l => l.label).find(l => !judge.dealt.has(l));
  if (!label) abort('control undealt cannot run: every criterion is dealt on some board, so there is no undealt label to plant');
  console.log(`\nundealt) "${label}", which no board deals, planted into the guide intro`);
  const guide = mustReplace(source.guide, '    intro: [\n', `    intro: [\n      "Columns include ${label}.",\n`, `${GUIDE} '/college-grid' entry`);
  const hits = texts => sectionFour(texts).out.filter(m => m.startsWith(`the guide entry names ${label}, which none`));
  const before = hits(source).length;
  const after = hits({ ...source, guide });
  grade('undealt', after.length > before ? after : []);
}
if (want('noboardid')) {
  console.log('\nnoboardid) the board id comparison removed from the hook');
  const hook = mustReplace(source.hook, 'dailyActions.some((a) => a.board !== puzzle.id)', 'false', HOOK);
  grade('noboardid', sectionFive(hook));
}

console.log('');
if (ONLY) {
  if (failures > 0) abort(`control "${ONLY}": did NOT fire in section ${CONTROLS[ONLY]}, the check is dead`);
  console.log(`control "${ONLY}": fired in section ${CONTROLS[ONLY]} as expected, the check works`);
  process.exit(0);
}
if (failures > 0) {
  console.error(`simCollegeGridPage: red, ${failures} failure${failures === 1 ? '' : 's'} above.`);
  process.exit(1);
}
console.log(`simCollegeGridPage: green. The page judges in memory, charges only a no, offers the key's names, says only what the key holds, and drops another board's save; all ${fired.length} controls fired.`);
