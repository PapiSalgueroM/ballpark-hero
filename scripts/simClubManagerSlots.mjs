/*
 * Round 928 harness: three manager slots in Club Manager, and a swap that can
 * never cost a career.
 *
 * src/lib/clubManagerSlots.ts keeps the career being played at the engine's
 * own SAVE_KEY and parks the other two, lean, under keys of their own. Every
 * section below runs the REAL engine and the REAL slots module, bundled.
 *
 *   1) THREE CAREERS, ROUND ROBIN. Everton (today), Lincoln City (today, a
 *      named manager, a padded squad and a league that promotes, so league
 *      overrides are registered and must be cleared) and 2010-11 Barcelona
 *      (an era save, whose squads are awaited before it opens, the way the
 *      page awaits them). Twenty switches round robin with a full season
 *      played after each. Every season of every career is digested and
 *      compared with the same career played ALONE on the same seed, saved
 *      and opened the single career way between seasons. The digest is the
 *      whole career with one field left out: h2h, the one ledger the lean
 *      shape cuts (to the six meetings per opponent the pre match facts read).
 *      Anything that leaks between careers, or that parking loses, shows up
 *      as a difference somewhere in the rest of the save.
 *   2) THE BYTES. The three careers are played on, switching, to the final
 *      whistle of season 15 each (where a save is biggest, before the summer
 *      resets the in season ledgers), and everything Club Manager keeps on
 *      the device (the active save, two parked ones, the index) must sit
 *      under BUDGET.
 *   3) A STORE THAT REFUSES. The swap is refused at each of its writes in
 *      turn (the park, the index, the incoming career) and on a store whose
 *      byte quota cannot hold the park. Every refusal answers false and
 *      leaves every stored byte exactly as it was, so all three careers are
 *      where they were. Then a roomy store, and the swap goes through with
 *      all three careers still readable.
 *   4) AN OLD SAVE. A save written before slots, alone at SAVE_KEY with no
 *      index, reads as slot 1, and reading the slots writes nothing. Since
 *      the second review the save is a lived in one (four seasons and
 *      fifteen matches of Everton, real meetings in its h2h, written by the engine's saveCareer),
 *      it opens, and a trip through slot 2 and back returns every field but
 *      h2h equal, with h2h the last six meetings per opponent.
 *
 * Negative controls (each rewrites a copy of the slots module, after
 * asserting the text it rewrites is there exactly once, and must turn its
 * own section red):
 *   SLOTS_CONTROL=nopark      the swap never parks the outgoing career.
 *                             Section 1 (careers lost on the first lap).
 *   SLOTS_CONTROL=dupe        the incoming career's parked copy is never
 *                             dropped, so a whole career is stored twice.
 *                             Section 2.
 *   SLOTS_CONTROL=norollback  a refused incoming write leaves the park and
 *                             the index moved. Section 3.
 *   SLOTS_CONTROL=oldversion  the tiles accept another save version, so an
 *                             old save no longer reads as slot 1. Section 4.
 *   SLOTS_CONTROL=leanmore    the park drops the season history too, so the
 *                             old save comes back changed. Section 4.
 *   SLOTS_CONTROL=decisioncontent the park changes a decision's words.
 *                                Section 4 must read that roundtrip difference.
 *
 * MEASURED on the healthy engine, six streams (the default and SIM_SEED 1 to
 * 5), 2026-10-06, Round 1072 automatic Quick Sim coaching:
 *   section 1: 20 of 20 season digests identical on every stream.
 *   section 2: everything Club Manager keeps on the device with three careers
 *     at the final whistle of season 15 (one active and full, two parked and
 *     lean): 444,005 / 444,634 / 442,415 / 444,992 / 442,545 / 442,058
 *     characters. Exact pre-1072 main on the same harness: 439,821 / 439,872 /
 *     440,871 / 440,150 / 439,884 / 438,756, so the old 440,000 fence already
 *     failed on two streams after earlier engine growth. Coaching changes
 *     existing squad and career outcomes, with four saved keys in both arms;
 *     existing optional live:null adds only 36 characters across the careers.
 *     Default keys: active Barcelona 109,938, Everton parked 169,315, Lincoln
 *     City parked 164,721, index 31. The dupe control adds a lean 57,768 copy
 *     of Barcelona, a fifth key, total 501,773.
 *   BUDGET 470,000 sat 25,008 over the largest healthy total and 31,773
 *   under what the dupe control leaves, against a spread of 2,934 between
 *   healthy streams. For scale, simClubManagerSaveSize
 *   works against a 5 MB origin quota, and three careers take under a fifth of it.
 *   Round 1052 moved BUDGET to 495,000 (a GitHub runner, 2026-10-08). Every
 *   one of the three careers carries the world, and the world had grown since
 *   the numbers above were taken: on that round's base (5ba57826, 26 leagues)
 *   the default stream already stood at 464,279. With the Russian Premier
 *   League as league 27 (1fa0a7a7), default stream and SIM_SEED 1 to 5:
 *   469,468 / 470,019 / 466,396 / 467,431 / 469,767 / 468,078, so SIM_SEED 1
 *   went over the old 470,000 by 19 characters on a healthy engine. The dupe
 *   control on that tree leaves 528,801 across five keys and fired through
 *   the budget check. 495,000 sits 24,981 over the largest healthy total and
 *   33,801 under the control's, the margins the old number was set with.
 *   Measured again at 183690a7 after the round's review added 46 men to
 *   the Russian squads, default stream and SIM_SEED 1 to 5: 467,493 /
 *   468,823 / 466,605 / 466,736 / 467,591 / 469,185; the dupe control
 *   leaves 526,831 across five keys and fired through the budget check.
 *   495,000 sits 25,815 over the largest healthy total and 31,831 under
 *   the control's, so it stays. On that tree SIM_SEED 3 and 4 are red in
 *   section 4 by its own guard and nowhere else: the lived in Everton
 *   save they draw (191 and 189 h2h rows) has met no opponent more than
 *   six times, so the park cuts nothing and the section says the stream
 *   reads nothing rather than passing on it. The default stream and
 *   SIM_SEED 1, 2 and 5 exercise the cut (188, 185, 180 and 190 rows).
 *   section 4 (2026-10-03, default, SIM_SEED 1, 2): the lived in save stands
 *     at season 5, week 19 with 190 / 196 / 191 h2h rows (115,179 / 116,726 /
 *     115,876 characters); the park cuts 1 / 2 / 2 of them, so the lean cut
 *     is exercised on every stream, and every other field comes back equal.
 *
 * The digest renames the ids the engine builds from a module counter or the
 * clock (see digest below). Those differ between any two runs of one career,
 * slots or no slots, and the first draft of this file read them as a leak.
 *
 * Nothing here reads dist or the network; the clock reaches only the generated
 * ids, which the digest renames.
 * Run: node scripts/simClubManagerSlots.mjs
 */
import './lib/seedRandom.mjs';
import { expandPackedWorldRosterState } from './qa/managerWorldRosterDigest.cjs';
import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cmSlots-')).replaceAll('\\', '/');
const ENTRY = `${TMP}/entry.mjs`;
const BUNDLE = `${TMP}/bundle.mjs`;

const SWITCHES = Number(process.env.SLOTS_SWITCHES || 20);
const BUDGET_SEASON = Number(process.env.SLOTS_BUDGET_SEASON || 15);
const BUDGET = 495_000; // Round 1052, 27 leagues: measured healthy 466,396 to 470,019; actual duplicated career control 528,801 (was 470,000: healthy 442,058 to 444,992, control 501,773)
const SAVE_KEY = 'dukb-club-manager-save';
/* SIM_SEED re-roots every career's stream, to measure the fences on fresh
   samples on purpose. The default is the stream the fences are judged on. */
const BASE_SEED = ((Number(process.env.SIM_SEED) || 0) * 15485863 + 0x2f6b9) >>> 0;

const CONTROL = process.env.SLOTS_CONTROL || '';
const OWN = { nopark: 1, dupe: 2, norollback: 3, oldversion: 4, leanmore: 4, decisioncontent: 4 };
if (CONTROL && !(CONTROL in OWN)) {
  console.error(`SLOTS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(OWN).join(', ')})`);
  process.exit(1);
}
const evidenceDir = process.env.CM_SLOTS_ARTIFACTS || path.join(ROOT, 'cm-slots-artifacts');
fs.mkdirSync(evidenceDir, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const sourceHashes = [];
for (const file of ['src/lib/clubManager.ts', 'src/lib/clubManagerSlots.ts']) {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  sourceHashes.push({ file, before: sha(bytes) });
}
const heldSources = () => {
  const sources = [];
  for (const { file, before } of sourceHashes) {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    const after = sha(bytes);
    sources.push({ file, before, after, held: before === after });
  }
  return sources;
};
if (CONTROL === 'decisioncontent' && process.env.CM_SLOTS_EVIDENCE_CHILD !== '1') {
  const runs = [];
  for (const name of ['', CONTROL]) {
    const childDir = path.join(evidenceDir, name || 'baseline');
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: ROOT,
      env: { ...process.env, SLOTS_CONTROL: name, CM_SLOTS_EVIDENCE_CHILD: '1', CM_SLOTS_ARTIFACTS: childDir },
      encoding: 'utf8', timeout: 240000, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
    });
    fs.writeFileSync(path.join(evidenceDir, `${name || 'baseline'}-runner.log`), `${run.stdout || ''}\n${run.stderr || ''}`);
    let report = null;
    try { report = JSON.parse(fs.readFileSync(path.join(childDir, `${name || 'normal'}-report.json`), 'utf8')); } catch { /* missing evidence receives no credit */ }
    runs.push({ name: name || 'baseline', exit: run.status, error: run.error?.message ?? null, signal: run.signal, report });
  }
  const [baseline, fault] = runs;
  const validRun = run => !run.error && !run.signal && Array.isArray(run.report?.runtimeErrors) && run.report.runtimeErrors.length === 0
    && Array.isArray(run.report.sources) && run.report.sources.length === 2 && run.report.sources.every(row => row.held);
  const receipt = fault.report?.mutation;
  const sources = heldSources();
  const passed = validRun(baseline) && baseline.exit === 0 && baseline.report.red.length === 0
    && validRun(fault) && fault.exit === 1 && JSON.stringify(fault.report.red) === '[4]'
    && fault.report.tags['4']?.includes('roundtrip') && receipt?.anchorCount === 1
    && receipt.original !== receipt.changed && sources.every(row => row.held);
  fs.writeFileSync(path.join(evidenceDir, 'decisioncontent-control.json'), JSON.stringify({ passed, sources, runs }, null, 2));
  fs.rmSync(TMP, { recursive: true, force: true });
  if (!passed) {
    console.error('CONTROL DID NOT FIRE: decisioncontent requires its sole roundtrip failure, a fresh green normal baseline, zero runtime errors and held source bytes');
    process.exit(2);
  }
  console.log('CONTROL FIRED: SLOTS_CONTROL=decisioncontent changed only decision roundtrip; fresh normal baseline green, executable receipt verified and source bytes held');
  process.exit(1);
}
const runtimeErrors = [];
const captureRuntime = error => { runtimeErrors.push({ name: error?.name, message: String(error?.message ?? error) }); process.exitCode = 2; };
process.on('uncaughtExceptionMonitor', captureRuntime);
process.on('unhandledRejection', captureRuntime);
let mutation = null;
const abort = m => { console.error(m); process.exit(1); };
const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const swap = (src, from, to, where) => {
  const n = src.split(from).length - 1;
  if (n !== 1) abort(`control cannot run: ${where} appears ${n} times in the shape SLOTS_CONTROL=${CONTROL} rewrites, not once\n  looked for: ${JSON.stringify(from)}`);
  return src.replace(from, () => to);
};

function findUp(rel) {
  let dir = ROOT;
  for (let i = 0; i < 6; i++) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p) || fs.existsSync(p + '.cmd')) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return abort(`could not find ${rel} above ${ROOT}`);
}
const ESBUILD = findUp(path.join('node_modules', '.bin', 'esbuild'));

/* ---------- the slots module, with a control's rewrite where asked ---------- */
let slotsPath = `${ROOT_URL}/src/lib/clubManagerSlots.ts`;
const SLOT_SWAPS = {
  nopark: [
    '    if (park !== null) localStorage.setItem(parkedKey(from), park);\n    else localStorage.removeItem(parkedKey(from));\n',
    '',
    'the park step of switchSlot',
  ],
  norollback: [
    '    try { writeIndex(from); } catch { /* the same size it was a moment ago */ }\n    undoPark();\n    return false;\n',
    '    return false;\n',
    'the rollback after a refused incoming write',
  ],
  dupe: [
    '  try { localStorage.removeItem(parkedKey(slot)); } catch { /* harmless if it stays */ }\n',
    '',
    'the drop of the incoming parked copy',
  ],
  oldversion: [
    'export const READABLE_SAVE_VERSION = 3;\n',
    'export const READABLE_SAVE_VERSION = 4;\n',
    'the save version the tiles accept',
  ],
  leanmore: [
    '  if (outgoing) return JSON.stringify(leanCareer(outgoing));\n',
    '  if (outgoing) return JSON.stringify({ ...leanCareer(outgoing), history: [] });\n',
    'the lean park of the career in memory',
  ],
  decisioncontent: [
    '  if (outgoing) return JSON.stringify(leanCareer(outgoing));\n',
    "  if (outgoing) return JSON.stringify({ ...leanCareer(outgoing), decisions: outgoing.decisions?.map((d, i) => i === 0 ? { ...d, text: 'Wrong decision!!' + d.text.slice(16) } : d) });\n",
    'the preserved content of a parked decision',
  ],
};
if (CONTROL) {
  let src = readLF(`${ROOT}/src/lib/clubManagerSlots.ts`);
  const original = src;
  const [from, to, where] = SLOT_SWAPS[CONTROL];
  src = swap(src, from, to, `clubManagerSlots.ts (${where})`);
  src = swap(src, "from './clubManager';", `from '${ROOT_URL}/src/lib/clubManager.ts';`, 'the engine import');
  src = swap(src, "from './clubManagerEras';", `from '${ROOT_URL}/src/lib/clubManagerEras.ts';`, 'the eras import');
  slotsPath = `${TMP}/clubManagerSlots.control.ts`;
  fs.writeFileSync(slotsPath, src);
  if (CONTROL === 'decisioncontent') {
    mutation = { file: 'src/lib/clubManagerSlots.ts', anchor: from, replacement: to,
      anchorCount: original.split(from).length - 1, original: sha(original), changed: sha(src) };
    fs.writeFileSync(path.join(evidenceDir, 'decisioncontent-copied-source.ts'), src);
  }
  console.log(`NEGATIVE CONTROL ON: SLOTS_CONTROL=${CONTROL}, the slots module is a rewritten copy`);
}

/* A store with a byte quota and a refusal hook, measured in characters. */
fs.writeFileSync(ENTRY, `
const store = new Map();
globalThis.__store = store;
globalThis.__quota = Infinity;
globalThis.__refuse = null;
const used = () => { let n = 0; for (const [k, v] of store) n += k.length + v.length; return n; };
globalThis.__used = used;
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    v = String(v);
    if (globalThis.__refuse && globalThis.__refuse(k)) throw new Error('QuotaExceededError (refusal stub)');
    const after = used() - (store.has(k) ? k.length + store.get(k).length : 0) + k.length + v.length;
    if (after > globalThis.__quota) throw new Error('QuotaExceededError (quota stub)');
    store.set(k, v);
  },
  removeItem: k => { store.delete(k); },
  clear: () => store.clear(),
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
export const cm = await import('${ROOT_URL}/src/lib/clubManager.ts');
export const eras = await import('${ROOT_URL}/src/lib/clubManagerEras.ts');
export const slots = await import('${slotsPath}');
`);
execSync(
  `"${ESBUILD}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { cm, eras, slots } = await import(pathToFileURL(BUNDLE).href);
const { startCareer, playNextEntry, finishSeason, startNextSeason, saveCareer, loadCareer, savedCareerEraId, clearCareer } = cm;
const { ensureEraRosters } = eras;
const { switchSlot, readSlots, activeSlot, parkedKey, SLOTS_INDEX_KEY } = slots;
for (const [name, fn] of Object.entries({ startCareer, playNextEntry, finishSeason, startNextSeason, saveCareer, loadCareer, savedCareerEraId, clearCareer, ensureEraRosters, switchSlot, readSlots, activeSlot, parkedKey })) {
  if (typeof fn !== 'function') abort(`the harness could not reach ${name}; the bundle is not the shape it expects`);
}
if (cm.SAVE_KEY !== SAVE_KEY) abort(`SAVE_KEY is ${cm.SAVE_KEY}, not the key this harness and the home page read`);
const store = globalThis.__store;

const failures = { 1: 0, 2: 0, 3: 0, 4: 0 };
let section = 1;
const tags = {};
const fail = (m, tag = 'check') => { failures[section] += 1; (tags[section] ??= new Set()).add(tag); console.error('  FAIL: ' + m); };

/* ---------- the careers, the seeds, a season ---------- */
const CAREERS = [
  { label: 'Everton (today)', club: 'Everton', era: 'now' },
  { label: 'Lincoln City (today, named manager)', club: 'Lincoln City', era: 'now',
    manager: { name: 'Harness Manager', nationality: 'England', background: 'coachingBadges', style: 'counter' } },
  { label: 'Barcelona (2010-11 era)', club: 'Barcelona', era: 'era2010' },
];

/** The stream from scripts/lib/seedRandom.mjs, rooted per career and season,
    so a career's season draws the same numbers whatever ran before it. */
function reseed(career, season) {
  let a = (BASE_SEED + career * 7919 + season * 104729) >>> 0;
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let nudges = 0;
/** One season and the summer after it. The board is not what this file
    measures, so a manager below 35 is kept in his job by fiat (the same
    rule in both arms, so it cannot open a difference), and counted. */
function playOne(s) {
  for (let guard = 0; guard < 140; guard++) {
    if (s.boardConfidence < 35) { s = { ...s, boardConfidence: 55 }; nudges += 1; }
    const res = playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (res.kind === 'seasonOver') break;
    if (guard === 139) throw new Error('a season never ended in 140 entries');
  }
  const r = finishSeason(s);
  return { fin: r.state, sum: r.summary, next: startNextSeason(r.state) };
}

/** The whole career but h2h, the one ledger the lean park cuts. The ids the
    engine builds from a module counter or the clock (inbox msg-, press pq-,
    youth-, scout sc-, prospect pr-) are renamed in order of first appearance:
    the counters are shared by every career a page has played since it loaded
    and the clock never repeats, so the same career run twice carries
    different labels on the same messages and players. Renaming keeps every
    message, player and reference; it drops only the label's number. */
const GENERATED_ID = /"(desk-\d+-\d+-appeal-)?((?:youth|sc|pr|pq|msg)-[a-z0-9-]+)"/g;
const digest = s => {
  const { h2h, ...rest } = expandPackedWorldRosterState(s);
  const seen = new Map();
  // Appeals embed the player's id; retain their kind, season and week.
  return JSON.stringify(rest).replace(GENERATED_ID, (_m, prefix, id) => {
    if (!seen.has(id)) seen.set(id, `#id${seen.size}`);
    return JSON.stringify((prefix ?? '') + seen.get(id));
  });
};
function diffKeys(a, b) {
  const x = JSON.parse(a), y = JSON.parse(b);
  return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
}
/** The first path at which two values part, with both sides, for the log. */
function firstPath(x, y, at = '') {
  if (JSON.stringify(x) === JSON.stringify(y)) return null;
  if (x && y && typeof x === 'object' && typeof y === 'object') {
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      const p = firstPath(x[k], y[k], `${at}.${k}`);
      if (p) return p;
    }
  }
  return `${at}: ${JSON.stringify(x)?.slice(0, 140)} vs ${JSON.stringify(y)?.slice(0, 140)}`;
}
const line = sum => `#${sum.position} ${sum.points}pts ${sum.trophies.length}T`;

async function openActive() {
  await ensureEraRosters(savedCareerEraId() ?? undefined);
  return loadCareer();
}

/** The same career ALONE: started, saved, and opened the single career way
    before every season. */
async function aloneRun(i, seasons) {
  store.clear();
  clearCareer();
  const C = CAREERS[i];
  await ensureEraRosters(C.era);
  reseed(i, 0);
  saveCareer(startCareer(C.club, C.era, undefined, C.manager));
  const out = [];
  for (let season = 1; season <= seasons; season++) {
    const s = await openActive();
    if (!s) { fail(`${C.label} alone: the save would not open before season ${season}`); break; }
    reseed(i, season);
    const { fin, sum, next } = playOne(s);
    out.push({ d: digest(fin), line: line(sum) });
    saveCareer(next);
  }
  return out;
}

/* ================================================================== */
const counts = [0, 1, 2].map(i => Array.from({ length: SWITCHES }, (_, k) => k % 3).filter(x => x === i).length);
console.log(`1) Three careers, ${SWITCHES} switches round robin with a season after each (${counts.join(', ')} seasons), every season equal to the same career played alone`);
/* ================================================================== */
section = 1;
const t0 = Date.now();
const alone = [];
for (let i = 0; i < 3; i++) alone.push(await aloneRun(i, counts[i]));
const tAlone = Date.now() - t0;

store.clear();
clearCareer();
let mem = null;
const switched = [[], [], []];
const played = [0, 0, 0];
let lapOk = true;
/* The three careers are created the way the page creates them: New manager
   in an empty slot parks whatever is open, and the new career lands in it. */
for (let i = 0; i < 3; i++) {
  const C = CAREERS[i];
  if (i + 1 !== activeSlot() && !switchSlot(i + 1, mem)) { fail(`could not open empty slot ${i + 1} for ${C.label}`); lapOk = false; break; }
  await ensureEraRosters(C.era);
  reseed(i, 0);
  mem = startCareer(C.club, C.era, undefined, C.manager);
  saveCareer(mem);
}
const views0 = readSlots();
const clubs0 = views0.map(v => v.summary?.clubName ?? null);
console.log(`   slots after creation: ${clubs0.join(' | ')}; manager in slot 2: ${views0[1].summary?.managerName ?? 'none'}`);
if (clubs0.join('|') !== CAREERS.map(c => c.club).join('|')) fail(`the three slots read ${clubs0.join(', ')} after creation`);
if (views0[1].summary?.managerName !== 'Harness Manager') fail('slot 2 does not carry its manager name');
if (views0[2].summary?.eraId !== 'era2010') fail('slot 3 does not read as the 2010-11 era');

/** One switch to `target`, then a season there. Returns false when the
    career that opened is not the one the slot held. */
async function switchAndPlay(target, record, keepFinished = false) {
  const i = target - 1;
  if (!switchSlot(target, mem)) { fail(`switch to slot ${target} was refused on a roomy store`); return false; }
  mem = null;
  const s = await openActive();
  if (!s || s.clubName !== CAREERS[i].club) {
    fail(`slot ${target} opened ${s ? s.clubName : 'nothing'}, not ${CAREERS[i].label}`);
    return false;
  }
  if (s.season !== played[i] + 1) fail(`${CAREERS[i].label} opened in season ${s.season}, expected ${played[i] + 1}`);
  played[i] += 1;
  reseed(i, played[i]);
  const { fin, sum, next } = playOne(s);
  if (record) switched[i].push({ d: digest(fin), line: line(sum) });
  /* keepFinished holds the career at its season's end, before the summer
     resets the in season ledgers: the biggest a save gets. */
  mem = keepFinished ? fin : next;
  saveCareer(mem);
  /* What is on the device after every switch: three careers, the right three. */
  const clubs = readSlots().map(v => v.summary?.clubName ?? null).join('|');
  if (clubs !== CAREERS.map(c => c.club).join('|')) { fail(`after the switch to slot ${target} the slots read ${clubs}`); return false; }
  return true;
}

for (let k = 0; k < SWITCHES && lapOk; k++) {
  if (!(await switchAndPlay((k % 3) + 1, true))) lapOk = false;
}
let same = 0, compared = 0;
for (let i = 0; i < 3; i++) {
  const a = alone[i], b = switched[i];
  if (b.length !== a.length) fail(`${CAREERS[i].label}: ${b.length} seasons played through the slots, ${a.length} alone`);
  let firstBad = null;
  for (let s = 0; s < Math.min(a.length, b.length); s++) {
    compared += 1;
    if (a[s].d === b[s].d) same += 1;
    else if (firstBad === null) firstBad = s;
  }
  console.log(`   ${CAREERS[i].label.padEnd(36)} alone: ${a.map(x => x.line).join(', ')}`);
  console.log(`   ${''.padEnd(36)} slots: ${b.map(x => x.line).join(', ')}`);
  if (firstBad !== null) {
    const changed = diffKeys(a[firstBad].d, b[firstBad].d);
    fail(`${CAREERS[i].label}: season ${firstBad + 1} differs from the career played alone, in ${changed.slice(0, 12).join(', ')}`, changed.includes('decisions') ? 'decision' : 'check');
    console.error(`        first difference ${firstPath(JSON.parse(a[firstBad].d), JSON.parse(b[firstBad].d))}`);
  }
}
console.log(`   ${same} of ${compared} season digests identical to the career played alone; board nudges ${nudges}; alone arm ${Math.round(tAlone / 1000)} s, total ${Math.round((Date.now() - t0) / 1000)} s`);
if (compared < SWITCHES) fail(`only ${compared} of ${SWITCHES} seasons were compared`);

/* ================================================================== */
console.log(`2) The three careers played on, switching, to season ${BUDGET_SEASON} each: everything on the device under ${BUDGET} characters`);
/* ================================================================== */
section = 2;
for (let k = SWITCHES; lapOk && played.some(n => n < BUDGET_SEASON - 1) && k < SWITCHES + 3 * BUDGET_SEASON; k++) {
  const target = (k % 3) + 1;
  if (played[target - 1] >= BUDGET_SEASON - 1) continue;
  if (!(await switchAndPlay(target, false))) lapOk = false;
}
/* The last lap plays season BUDGET_SEASON of each and parks it at the final
   whistle of the season, before the summer, where a save is at its biggest
   (simClubManagerSaveSize measures the same point). */
for (const target of [1, 2, 3]) {
  if (lapOk && !(await switchAndPlay(target, false, true))) lapOk = false;
}
const cmKeys = [...store.keys()].filter(k => k === SAVE_KEY || k === SLOTS_INDEX_KEY || k.startsWith('dukb-cm-slot-'));
const bytesOf = k => k.length + store.get(k).length;
const total = cmKeys.reduce((a, k) => a + bytesOf(k), 0);
console.log(`   seasons played: ${played.join(', ')}; keys: ${cmKeys.map(k => `${k} ${bytesOf(k)}`).join(', ')}`);
console.log(`   total ${total} characters across ${cmKeys.length} keys (budget ${BUDGET})`);
fs.writeFileSync(path.join(evidenceDir, `${CONTROL || 'normal'}-sizes.json`), JSON.stringify({ arm: process.env.CM_SLOTS_ARM || 'current-source',
  control: CONTROL || 'normal', engineHash: sourceHashes[0].before, seed: BASE_SEED, total, budget: BUDGET,
  slots: cmKeys.map(key => {
    const value = JSON.parse(store.get(key));
    return { key, chars: bytesOf(key), club: value.clubName ?? null, season: value.season ?? null,
      squad: { total: value.squad?.length ?? 0, youth: value.squad?.filter(p => p.isYouth).length ?? 0, loans: value.squad?.filter(p => p.onLoan).length ?? 0 },
      arrays: Object.fromEntries(Object.entries(value).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])),
      fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, JSON.stringify(v).length])),
    };
  }),
}, null, 2));
if (played.some(n => n < BUDGET_SEASON)) fail(`the careers reached only ${played.join(", ")} seasons, short of ${BUDGET_SEASON}`);
if (cmKeys.filter(k => k !== SLOTS_INDEX_KEY).length !== 3) fail(`${cmKeys.length} Club Manager keys on the device, not three saves and an index`);
if (total > BUDGET) fail(`three season ${BUDGET_SEASON} careers take ${total} characters, over the ${BUDGET} budget`, 'budget');

/* ================================================================== */
console.log('3) A store that refuses: every refused swap answers false and moves nothing');
/* ================================================================== */
section = 3;
const snapshot = () => JSON.stringify([...store.entries()].sort());
const holdings = () => readSlots().map(v => v.summary ? `${v.summary.clubName} s${v.summary.season}` : '-').join(' | ');
/* The refusals are tried from whichever slot is open towards each other
   slot, so the index write is a real setItem at least once (to slot 2 or 3). */
const from = activeSlot();
const targets = [1, 2, 3].filter(n => n !== from);
let refusals = 0;
for (const target of targets) {
  for (const [what, refuse] of [
    ['the park', k => k === parkedKey(from)],
    ['the index', k => k === SLOTS_INDEX_KEY],
    ['the incoming career', k => k === SAVE_KEY],
  ]) {
    if (what === 'the index' && target === 1) continue; // slot 1's index is a removal, never refused
    const before = snapshot(), had = holdings();
    globalThis.__refuse = refuse;
    const ok = switchSlot(target, mem);
    globalThis.__refuse = null;
    refusals += 1;
    if (ok) fail(`slot ${from} to ${target}: ${what} was refused and the swap still said it worked`);
    if (snapshot() !== before) fail(`slot ${from} to ${target}: ${what} was refused and the store changed (now ${holdings()}, was ${had})`, 'moved');
  }
}
/* A quota that cannot hold the park, with nothing refused by name. */
{
  const before = snapshot();
  globalThis.__quota = globalThis.__used() + 1000;
  const ok = switchSlot(targets[0], mem);
  globalThis.__quota = Infinity;
  refusals += 1;
  if (ok) fail('a store with 1,000 characters to spare took a whole parked career');
  if (snapshot() !== before) fail('a store out of room changed while refusing the swap');
}
console.log(`   ${refusals} refused swaps from slot ${from}; holdings unchanged: ${holdings()}`);
/* And on a roomy store the swap goes through, with all three still there. */
const beforeRoomy = holdings().replace(/ s\d+/g, '');
if (!switchSlot(targets[0], mem)) fail('the swap was refused on a roomy store');
mem = null;
const opened = await openActive();
if (!opened || opened.clubName !== CAREERS[targets[0] - 1].club) fail(`slot ${targets[0]} opened ${opened ? opened.clubName : 'nothing'} after the refusals`);
if (holdings().replace(/ s\d+/g, '') !== beforeRoomy) fail(`after the roomy swap the slots read ${holdings()}`);

/* ================================================================== */
console.log('4) An old save, from before slots: slot 1, and reading writes nothing');
/* ================================================================== */
section = 4;
store.clear();
clearCareer();
/* Second review: a save that has been played in, four seasons and fifteen
   matches of Everton with real meetings in its h2h, written by the engine's own
   saveCareer (the branch's engine differs from main's by one export keyword,
   so these are the bytes main writes for the same play). */
reseed(0, 99);
let lived = startCareer('Everton');
for (let k = 0; k < 4; k++) { reseed(0, 99 + k); lived = playOne(lived).next; }
reseed(0, 103);
for (let i = 0; i < 15; i++) lived = playNextEntry(lived, { skipHalftime: true }).state;
saveCareer(lived);
const oldBytes = store.get(SAVE_KEY);
const oldH2h = (lived.h2h ?? []).length;
if (lived.season !== 5 || oldH2h === 0) fail(`the old save fixture is not lived in (season ${lived.season}, ${oldH2h} h2h rows)`, 'fixture');
const v4 = readSlots();
if (activeSlot() !== 1 || !v4[0].active || v4[0].summary?.clubName !== 'Everton') fail('an old save does not read as slot 1', 'slot1');
if (v4[1].summary || v4[2].summary) fail('an old save shows careers in slots 2 or 3');
if (store.size !== 1 || store.get(SAVE_KEY) !== oldBytes) fail('reading the slots wrote to the store');
console.log(`   old save (season ${lived.season}, week ${lived.week}, ${oldH2h} h2h rows, ${oldBytes.length} chars) in slot 1, ${store.size} key on the device, bytes untouched: ${store.get(SAVE_KEY) === oldBytes}`);
/* It opens, and a trip through another slot brings it back whole: every
   field but h2h equal, and h2h the last six meetings per opponent. */
const oldOpened = loadCareer();
if (!oldOpened || oldOpened.clubName !== 'Everton' || oldOpened.season !== 5) fail('loadCareer does not open the old save', 'slot1');
else {
  const ok1 = switchSlot(2, oldOpened);
  saveCareer(startCareer('Lincoln City'));
  const ok2 = switchSlot(1);
  const back = loadCareer();
  if (!ok1 || !ok2 || !back) fail(`the trip through slot 2 did not come back (${ok1}, ${ok2}, ${!!back})`, 'roundtrip');
  else {
    if (digest(back) !== digest(oldOpened)) fail(`the old save came back changed at ${firstPath(JSON.parse(digest(oldOpened)), JSON.parse(digest(back)))}`, 'roundtrip');
    const last6 = c => { const by = {}; for (const h of c.h2h ?? []) (by[h.opp] ??= []).push(JSON.stringify(h)); return JSON.stringify(Object.keys(by).sort().map(k => [k, by[k].slice(-6)])); };
    if (last6(back) !== last6(oldOpened)) fail('the old save came back without the last six meetings per opponent', 'roundtrip');
    if ((back.h2h ?? []).length >= oldH2h) fail(`the fixture never reaches the lean cut (h2h ${oldH2h} -> ${(back.h2h ?? []).length})`, 'fixture');
    console.log(`   through slot 2 and back: equal but h2h ${digest(back) === digest(oldOpened)}, h2h ${oldH2h} -> ${(back.h2h ?? []).length} rows, last six per opponent kept ${last6(back) === last6(oldOpened)}`);
  }
}

/* ================================================================== */
/* The verdict                                                         */
/* ================================================================== */
fs.rmSync(TMP, { recursive: true, force: true });
const red = Object.entries(failures).filter(([, n]) => n > 0).map(([k]) => Number(k));
await new Promise(resolve => setImmediate(resolve));
const sources = heldSources();
fs.writeFileSync(path.join(evidenceDir, `${CONTROL || 'normal'}-report.json`), JSON.stringify({ red,
  failures, tags: Object.fromEntries(Object.entries(tags).map(([key, value]) => [key, [...value]])),
  runtimeErrors, sources, mutation,
}, null, 2));
if (runtimeErrors.length || sources.some(row => !row.held)) {
  console.error('simClubManagerSlots: runtime errors or changed original source bytes receive no control credit');
  process.exit(2);
}
if (CONTROL) {
  const own = OWN[CONTROL];
  /* The check each control is there to prove, not a neighbour of it: the
     byte fence itself for dupe, a moved store for norollback. */
  const needTag = { dupe: 'budget', norollback: 'moved', oldversion: 'slot1', leanmore: 'roundtrip', decisioncontent: 'roundtrip' }[CONTROL];
  const firedOwn = red.includes(own) && (!needTag || tags[own]?.has(needTag));
  if (firedOwn) {
    console.log(`\nCONTROL FIRED: SLOTS_CONTROL=${CONTROL} turned section ${own} red${needTag ? ` through its ${needTag} check` : ''} (red sections: ${red.join(', ')}), as it must`);
    process.exit(1);
  }
  console.error(`\nCONTROL DID NOT FIRE: SLOTS_CONTROL=${CONTROL} left section ${own}${needTag ? `'s ${needTag} check` : ''} green (red sections: ${red.join(', ') || 'none'})`);
  process.exit(2);
}
if (red.length) {
  console.error(`\nsimClubManagerSlots: RED, sections ${red.join(', ')} (${Object.values(failures).reduce((a, b) => a + b, 0)} failures)`);
  process.exit(1);
}
console.log('\nsimClubManagerSlots: all sections green');
