/**
 * Round 580 harness: Stadium Tycoon's two rooms, and the saves the merge promises
 * never to migrate.
 *
 * The tycoon merge (docs/design/round-580-tycoon-merge.md) puts Wonderkid
 * Factory's academy on an Academy tab inside /stadium-tycoon. Two things can go
 * quietly wrong and no screenshot would show either:
 *
 *   - A room that stops while the other is on screen. src/test/tycoonRooms.test.tsx
 *     drives the real page at the real frame cadence and measures the stadium's
 *     match clock and the academy's own save against a baseline (part A).
 *   - A save that stops loading the way it did. The arc never bumps a version or
 *     renames a key; later rounds only add optional fields. Part B holds today's
 *     loaders to a committed corpus of eight saves, and holds a frozen copy of
 *     today's two libs to the same answers, so a later round can prove its saves
 *     still load in the build it replaced.
 *
 * Every check has a negative control and the harness runs all of them. A control
 * that rewrites text asserts the text is there first, or refuses to run.
 *
 *   A) the page suite, plain, then five broken copies of the page
 *      remount         the stadium's hook moves into the room, so it unmounts
 *      unmountacademy  the academy panel unmounts under the Stadium tab
 *      doublemount     a second academy hook on the page
 *      noaccent        the panel's status never reaches the tab
 *      unseentimer     the promotion card's timer runs while nobody can see it
 *   B) save sections, plain, then five broken inputs
 *      bump            a lib copy with SAVE_VERSION 2
 *      rename          a lib copy with another stadium save key
 *      tamper          a frozen lib with one byte changed
 *      shortname       the rival name entry cut to its first two words
 *      thin            a corpus without its doctored saves
 *
 * Page copies go to dist/.tycoon-rooms-control-<name>/ (the dist/.completion-control
 * precedent: inside the repo so the copy resolves node_modules). Never run this
 * while a build is running, a build empties dist.
 *
 * Run: node scripts/simTycoonRooms.mjs
 */
import { execSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/tycoonRooms.test.tsx';
const PAGE = path.join(ROOT, 'src/pages/StadiumTycoon.tsx');
const LIBS = { stadium: path.join(ROOT, 'src/lib/stadiumTycoon.ts'), academy: path.join(ROOT, 'src/lib/wonderkidFactory.ts') };
const FROZEN = path.join(ROOT, 'scripts/fixtures/tycoonV1');
const CORPUS = path.join(ROOT, 'src/test/fixtures/tycoonSaves.json');
const RIVALS = path.join(ROOT, 'scripts/simNoRivalNames.mjs');
const TWEAKS = path.join(ROOT, 'docs/TWEAKS-2026-08-28.md');
const ORDINARY_COPY = path.join(ROOT, 'src/lib/nhlCareerLifeA.ts');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoonrooms-'));
const controlDirs = [];
process.on('exit', () => {
  for (const d of controlDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
});

/* ======================================================================
   A) the page suite
   ====================================================================== */

function runSuite(env) {
  const out = path.join(tmp, `report-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(
    process.execPath,
    /* The json reporter is the verdict; the default one is the only way the
       ROOMS| measurement lines reach this process. */
    ['node_modules/vitest/vitest.mjs', 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 },
  );
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(out)) {
    console.error(text.slice(-3000));
    return null;
  }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  const rows = [];
  rows.notes = [...text.matchAll(/ROOMS\| (.+)/g)].map(m => m[1].trim());
  rows.loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-1500) : null;
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) {
      rows.push({ title: a.title || (a.fullName || '').trim(), status: a.status, messages: (a.failureMessages || []).join('\n') });
    }
  }
  return rows;
}

function detail(messages) {
  const line = messages.split('\n').map(s => s.trim()).find(s => s && !s.startsWith('AssertionError:') && !s.startsWith('at '));
  return (line || messages.split('\n')[0] || '').slice(0, 240);
}

const sectionOf = title => Number((title.match(/^(\d+)/) || [])[1] || 0);

const PAGE_LINES = {
  hook: '  const g = useStadiumTycoon();\n',
  roomSignature: 'function StadiumRoom({ g, visible, onNeedsYou }: { g: ReturnType<typeof useStadiumTycoon>; visible: boolean; onNeedsYou: (v: boolean) => void }) {\n',
  roomMount: "<StadiumRoom g={g} visible={room === 'stadium'} onNeedsYou={setStadiumNeedsYou} />",
  academyMount: '{academyOpened && (',
  onStatus: 'onStatus={setAcademyStatus}',
  unseenTimer: 'if (!g.promotion || !visible) return;',
  hookImport: "import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';\n",
};

/** Each control: the rewrites it plants, and the sections it must turn red and
 *  leave green. Sections it does not grade may go either way. */
const PAGE_CONTROLS = [
  {
    name: 'remount',
    why: "the stadium's hook lives in the room, so opening the Academy unmounts it",
    rewrites: [
      [PAGE_LINES.hook, ''],
      [PAGE_LINES.roomSignature, 'function StadiumRoom({ visible, onNeedsYou }: { visible: boolean; onNeedsYou: (v: boolean) => void }) {\n  const g = useStadiumTycoon();\n'],
      [PAGE_LINES.roomMount, "{room === 'stadium' && <StadiumRoom visible onNeedsYou={setStadiumNeedsYou} />}"],
    ],
    red: [2],
    green: [1, 3, 4, 5, 6],
  },
  {
    name: 'unmountacademy',
    why: 'the academy panel is only mounted while its tab is showing',
    rewrites: [[PAGE_LINES.academyMount, "{room === 'academy' && ("]],
    red: [4, 6],
    green: [1, 2, 3, 5],
  },
  {
    name: 'doublemount',
    why: 'a second academy hook runs on the page itself',
    rewrites: [
      [PAGE_LINES.hookImport, PAGE_LINES.hookImport + "import { useWonderkidFactory } from '@/hooks/useWonderkidFactory';\n"],
      [PAGE_LINES.hook, PAGE_LINES.hook + '  useWonderkidFactory();\n'],
    ],
    red: [1],
    green: [2, 5],
  },
  {
    name: 'noaccent',
    why: "the academy panel's status never reaches the tab",
    rewrites: [[PAGE_LINES.onStatus, 'onStatus={() => undefined}']],
    red: [6],
    green: [1, 2, 3, 4, 5],
  },
  {
    name: 'unseentimer',
    why: "the promotion card's four second timer runs while the Academy is showing",
    rewrites: [[PAGE_LINES.unseenTimer, 'if (!g.promotion) return;']],
    red: [7],
    green: [1, 2, 3, 4, 5, 6],
  },
];

console.log('Round 580: Stadium Tycoon rooms, over the REAL page at the REAL frame cadence');
console.log(`   suite: ${TEST}`);
console.log('');
console.log('A) the shipped page');
const live = runSuite({});
if (!live) abort('  FAIL: the suite produced no report at all, so nothing here was measured');
for (const row of live) {
  console.log(`   ${row.status === 'passed' ? 'pass' : 'FAIL'}  ${row.title}`);
  if (row.status !== 'passed') fail(`${row.title}: ${detail(row.messages)}`);
}
if (live.length < 7) fail(`only ${live.length} of the 7 room tests ran, so this harness measured less than it claims`);
console.log('   what it measured:');
for (const note of live.notes) console.log(`     ${note}`);
if (live.notes.length < 7) fail(`the suite printed ${live.notes.length} measurements, so some test returned without measuring anything`);

const pageSrc = read(PAGE);
for (const control of PAGE_CONTROLS) {
  console.log('');
  console.log(`A.${control.name}) negative control: ${control.why}`);
  let copy = pageSrc;
  for (const [from, to] of control.rewrites) {
    if (copy.split(from).length - 1 !== 1) abort(`  control ${control.name}: the page does not carry exactly one "${from.trim()}", so this control would prove nothing`);
    copy = copy.replace(from, to);
  }
  const dir = path.join(ROOT, 'dist', `.tycoon-rooms-control-${control.name}`);
  controlDirs.push(dir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'StadiumTycoon.tsx');
  fs.writeFileSync(file, copy);
  const rows = runSuite({ TYCOON_ROOMS_PAGE: file.replaceAll('\\', '/') });
  fs.rmSync(dir, { recursive: true, force: true });
  if (!rows) { fail(`control ${control.name}: the run produced no report, so the control proves nothing`); continue; }
  if (rows.loadError) { fail(`control ${control.name}: the rewritten page did not load, so every red is a crash:\n${rows.loadError}`); continue; }
  if (rows.length < 7) { fail(`control ${control.name}: only ${rows.length} tests ran`); continue; }
  for (const row of rows) {
    const n = sectionOf(row.title);
    const graded = control.red.includes(n) || control.green.includes(n);
    const want = control.red.includes(n) ? 'failed' : 'passed';
    const mark = !graded ? '--  ' : row.status === want ? 'ok  ' : 'BAD ';
    console.log(`   ${mark} ${row.status.padEnd(6)} ${row.title}`);
    if (control.red.includes(n)) {
      if (row.status !== 'failed') fail(`control ${control.name}: "${row.title}" stayed green, so that check is dead`);
      else console.log(`         measured: ${detail(row.messages)}`);
    }
    if (control.green.includes(n) && row.status !== 'passed') {
      fail(`control ${control.name}: "${row.title}" went red too, so the control breaks more than it claims and the red proves nothing (${detail(row.messages)})`);
    }
  }
}

/* ======================================================================
   B) the saves
   ====================================================================== */

async function bundle(entry, name) {
  const out = path.join(tmp, `${name}-${Math.random().toString(36).slice(2)}.mjs`);
  execSync(`npx --no-install esbuild "${entry}" --bundle --format=esm --platform=node --alias:@=${ROOT}/src --outfile="${out}" --log-level=error`,
    { cwd: ROOT, shell: true });
  return import('file:///' + out.replace(/\\/g, '/'));
}

function reproduce(stadium, academy, entries, now) {
  const wrong = [];
  for (const e of entries) {
    let got;
    if (e.key === 'stadium') {
      const s = stadium.deserializeTycoon(e.raw, now);
      got = s ? stadium.serializeTycoon(s, now) : null;
    } else {
      const s = academy.deserialize(e.raw, now);
      got = s ? academy.serialize(s) : null;
    }
    if (got !== e.loaded) wrong.push(`${e.key}/${e.name}`);
  }
  return wrong;
}

const sha = text => crypto.createHash('sha256').update(text).digest('hex');

/** RIVAL_NAMES, evaluated out of the guard's own source. */
function rivalEntries(file) {
  const src = read(file);
  const start = src.indexOf('const RIVAL_NAMES = [');
  const end = src.indexOf('\n];', start);
  if (start < 0 || end < 0) return null;
  // eslint-disable-next-line no-new-func
  return new Function(`return ${src.slice(start + 'const RIVAL_NAMES = '.length, end + 2)}`)();
}

/** The app the owner cited, read from the doc so this file never names it. */
function citedApp() {
  /* The sentence wraps across lines in the doc, so whitespace is folded first. */
  const m = read(TWEAKS).replace(/\s+/g, ' ').match(/Inspiration: the (.+?) app\./);
  return m ? m[1].trim() : null;
}

/** All five save sections over one set of inputs. Returns { B1: [msgs], ... }. */
async function saveSections({ stadiumLib, academyLib, frozenDir, rivalsFile, corpusFile }) {
  const out = { B1: [], B2: [], B3: [], B4: [], B5: [] };
  const corpus = JSON.parse(read(corpusFile));
  const entries = corpus.entries || [];
  const stadium = await bundle(stadiumLib, 'stadium');
  const academy = await bundle(academyLib, 'academy');

  if (stadium.TYCOON_SAVE_KEY !== 'stadiumTycoonSaveV1') out.B1.push(`the stadium save key is ${JSON.stringify(stadium.TYCOON_SAVE_KEY)}, and every existing save lives under stadiumTycoonSaveV1`);
  if (academy.SAVE_KEY !== 'wonderkidFactoryV1') out.B1.push(`the academy save key is ${JSON.stringify(academy.SAVE_KEY)}, and every existing save lives under wonderkidFactoryV1`);

  const wrong = reproduce(stadium, academy, entries, corpus.now);
  if (entries.length === 0) out.B2.push('the corpus is empty');
  if (wrong.length) out.B2.push(`the current loaders no longer give the recorded answer for ${wrong.join(', ')}`);

  let pins = null;
  try { pins = JSON.parse(read(path.join(frozenDir, 'pins.json'))); } catch { out.B3.push('pins.json is missing or unreadable'); }
  if (pins) {
    for (const [name, want] of Object.entries(pins.files || {})) {
      const text = read(path.join(frozenDir, name));
      if (sha(text) !== want) out.B3.push(`frozen ${name} no longer matches its pin, so it is not the V1 lib any more`);
    }
    if (Object.keys(pins.files || {}).length !== 2) out.B3.push('pins.json does not pin both libs');
    if (out.B3.length === 0) {
      const fStadium = await bundle(path.join(frozenDir, 'stadiumTycoon.ts'), 'frozen-stadium');
      const fAcademy = await bundle(path.join(frozenDir, 'wonderkidFactory.ts'), 'frozen-academy');
      const fWrong = reproduce(fStadium, fAcademy, entries, corpus.now);
      if (fWrong.length) out.B3.push(`the frozen V1 loaders give a different answer for ${fWrong.join(', ')}`);
    }
  }

  const rivals = rivalEntries(rivalsFile);
  const app = citedApp();
  if (!rivals) out.B4.push('RIVAL_NAMES could not be read out of the guard');
  else if (!app) out.B4.push('the owner\'s cited app could not be read out of docs/TWEAKS-2026-08-28.md');
  else {
    const hits = rivals.filter(r => new RegExp(r, 'i').test(app));
    const ordinary = read(ORDINARY_COPY);
    if (hits.length !== 1) out.B4.push(`${hits.length} RIVAL_NAMES entries match the cited app, expected exactly one`);
    for (const h of hits) {
      if (new RegExp(h, 'i').test(ordinary)) out.B4.push(`the entry /${h}/ also matches ordinary copy in src/lib/nhlCareerLifeA.ts, so it would fail the build on a sentence about hockey`);
    }
    /* Teeth: the two word prefix really does match that sentence, so the check
       above is asking a question with a live answer. */
    const words = app.toLowerCase().split(' ');
    if (!new RegExp(`\\b${words[0]} ?${words[1]}`, 'i').test(ordinary)) out.B4.push('the ordinary copy this section relies on no longer contains the two word prefix, so the boundary check proves nothing');
  }

  const count = key => entries.filter(e => e.key === key).length;
  if (count('stadium') < 4 || count('academy') < 4) out.B5.push(`the corpus holds ${count('stadium')} stadium and ${count('academy')} academy saves, under four of each`);
  const raw = name => entries.find(e => e.name === name);
  const stadiumRaws = entries.filter(e => e.key === 'stadium').map(e => JSON.parse(e.raw));
  if (!stadiumRaws.some(s => !('legacySeeded' in s))) out.B5.push('no stadium save without legacySeeded, so the raw latch path is untested');
  const doc = raw('doctored');
  if (!doc || doc.key !== 'stadium') out.B5.push('no doctored stadium save');
  const dup = raw('duplicateIds');
  if (!dup || (() => { const ids = JSON.parse(dup.raw).prospects.map(k => k.id); return new Set(ids).size === ids.length; })()) out.B5.push('no academy save with duplicate kid ids');
  const kids = raw('doctoredKids');
  if (!kids || !JSON.parse(kids.raw).prospects.some(k => ['GK', 'DF', 'MF', 'FW'].includes(k.pos) && (k.rating > k.potential || k.age > 23))) out.B5.push('no doctored academy save with valid positions, so the rating and age clamps are never reached');
  return out;
}

function report(result, label) {
  for (const [section, msgs] of Object.entries(result)) {
    console.log(`   ${msgs.length ? 'RED ' : 'ok  '} ${section}${label ? ` (${label})` : ''}${msgs.length ? `: ${msgs[0]}` : ''}`);
  }
}

console.log('');
console.log('B) the saves: keys, the corpus, the frozen V1 libs, the rival name, the corpus shape');
const plainInputs = { stadiumLib: LIBS.stadium, academyLib: LIBS.academy, frozenDir: FROZEN, rivalsFile: RIVALS, corpusFile: CORPUS };
const plain = await saveSections(plainInputs);
report(plain);
for (const [section, msgs] of Object.entries(plain)) for (const m of msgs) fail(`${section}: ${m}`);
{
  const corpus = JSON.parse(read(CORPUS));
  const pins = JSON.parse(read(path.join(FROZEN, 'pins.json')));
  console.log(`   ${corpus.entries.length} saves reproduced by today's loaders and by the V1 libs frozen at ${String(pins.commit).slice(0, 8)}`);
}

const copyTo = (name, text) => { const f = path.join(tmp, name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return f; };
const mustRewrite = (text, from, to, what) => {
  if (!text.includes(from)) abort(`  control: ${what} does not contain ${JSON.stringify(from)}, so this control would prove nothing`);
  return text.replace(from, to);
};

const SAVE_CONTROLS = [
  {
    name: 'bump',
    red: ['B2'], green: ['B1', 'B3', 'B4', 'B5'],
    inputs: () => ({
      ...plainInputs,
      stadiumLib: copyTo('bump/stadiumTycoon.ts', mustRewrite(read(LIBS.stadium), 'const SAVE_VERSION = 1;', 'const SAVE_VERSION = 2;', 'stadiumTycoon.ts')),
      academyLib: copyTo('bump/wonderkidFactory.ts', mustRewrite(read(LIBS.academy), 'const SAVE_VERSION = 1;', 'const SAVE_VERSION = 2;', 'wonderkidFactory.ts')),
    }),
  },
  {
    name: 'rename',
    red: ['B1'], green: ['B2'],
    inputs: () => ({
      ...plainInputs,
      stadiumLib: copyTo('rename/stadiumTycoon.ts', mustRewrite(read(LIBS.stadium), "TYCOON_SAVE_KEY = 'stadiumTycoonSaveV1'", "TYCOON_SAVE_KEY = 'stadiumTycoonSave'", 'stadiumTycoon.ts')),
    }),
  },
  {
    name: 'tamper',
    red: ['B3'], green: ['B1', 'B2'],
    inputs: () => {
      const dir = path.join(tmp, 'tamper');
      fs.mkdirSync(dir, { recursive: true });
      for (const f of fs.readdirSync(FROZEN)) fs.copyFileSync(path.join(FROZEN, f), path.join(dir, f));
      const text = read(path.join(dir, 'wonderkidFactory.ts'));
      fs.writeFileSync(path.join(dir, 'wonderkidFactory.ts'), mustRewrite(text, 'export const LEAVE_AGE = 24;', 'export const LEAVE_AGE = 25;', 'the frozen academy lib'));
      return { ...plainInputs, frozenDir: dir };
    },
  },
  {
    name: 'shortname',
    red: ['B4'], green: ['B1', 'B2', 'B3'],
    inputs: () => {
      const app = citedApp();
      const words = app.toLowerCase().split(' ');
      const full = `'\\\\b${words[0]} ?${words[1]} ?${words[2]}\\\\b'`;
      const cut = `'\\\\b${words[0]} ?${words[1]}'`;
      return { ...plainInputs, rivalsFile: copyTo('shortname/simNoRivalNames.mjs', mustRewrite(read(RIVALS), full, cut, 'simNoRivalNames.mjs')) };
    },
  },
  {
    name: 'thin',
    red: ['B5'], green: ['B1', 'B2', 'B3', 'B4'],
    inputs: () => {
      const corpus = JSON.parse(read(CORPUS));
      corpus.entries = corpus.entries.filter(e => !['doctored', 'duplicateIds', 'doctoredKids', 'preBoardroom'].includes(e.name));
      return { ...plainInputs, corpusFile: copyTo('thin/tycoonSaves.json', JSON.stringify(corpus)) };
    },
  },
];

for (const control of SAVE_CONTROLS) {
  console.log('');
  console.log(`B.${control.name}) negative control`);
  const result = await saveSections(control.inputs());
  report(result, control.name);
  for (const s of control.red) if (result[s].length === 0) fail(`control ${control.name}: ${s} stayed green, so that check is dead`);
  for (const s of control.green) if (result[s].length > 0) fail(`control ${control.name}: ${s} went red too (${result[s][0]}), so the control breaks more than it claims`);
}

console.log('');
if (failures > 0) {
  console.error(`simTycoonRooms: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTycoonRooms: green.');
console.log('   The stadium clock runs the same whether or not the Academy tab was open, to the thousandth of a second.');
console.log('   The Academy tab and the Wonderkid Factory page leave byte identical academies, and the academy keeps its watched clock under the Stadium tab.');
console.log('   Today\'s loaders and the frozen V1 libs give the recorded answer for every save in the corpus.');
console.log('   All ten controls fired exactly where they should.');
