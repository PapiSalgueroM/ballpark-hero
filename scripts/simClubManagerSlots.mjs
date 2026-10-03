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
 *      index, reads as slot 1, and reading the slots writes nothing.
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
 *
 * MEASURED on the healthy engine, six streams (the default and SIM_SEED 1 to
 * 5), 2026-10-02:
 *   section 1: 20 of 20 season digests identical on every stream.
 *   section 2: everything Club Manager keeps on the device with three careers
 *     at the final whistle of season 15 (one active and full, two parked and
 *     lean): 413,738 / 416,441 / 414,717 / 416,960 / 416,606 / 415,901
 *     characters. Default stream by key: active (Barcelona, the 2010-11 world
 *     is two leagues) 90,724, Everton parked 163,966, Lincoln City parked
 *     159,017, index 31. Under the dupe control the same stream holds a fifth
 *     key, a lean 52,023 copy of the smallest career, total 465,761.
 *   BUDGET 440,000 sits 23,000 over the largest healthy total and 25,000
 *   under what the dupe control leaves (a lean copy of the smallest career),
 *   against a spread of 3,222 between streams. For scale, simClubManagerSaveSize
 *   works against a 5 MB origin quota, and three careers take under a fifth of it.
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
import { execSync } from 'node:child_process';
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
const BUDGET = 440_000; // healthy 413,738 to 416,960 over six streams; one duplicated career (the dupe control) 465,761
const SAVE_KEY = 'dukb-club-manager-save';
/* SIM_SEED re-roots every career's stream, to measure the fences on fresh
   samples on purpose. The default is the stream the fences are judged on. */
const BASE_SEED = ((Number(process.env.SIM_SEED) || 0) * 15485863 + 0x2f6b9) >>> 0;

const CONTROL = process.env.SLOTS_CONTROL || '';
const OWN = { nopark: 1, dupe: 2, norollback: 3 };
if (CONTROL && !(CONTROL in OWN)) {
  console.error(`SLOTS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(OWN).join(', ')})`);
  process.exit(1);
}
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
};
if (CONTROL) {
  let src = readLF(`${ROOT}/src/lib/clubManagerSlots.ts`);
  const [from, to, where] = SLOT_SWAPS[CONTROL];
  src = swap(src, from, to, `clubManagerSlots.ts (${where})`);
  src = swap(src, "from './clubManager';", `from '${ROOT_URL}/src/lib/clubManager.ts';`, 'the engine import');
  src = swap(src, "from './clubManagerEras';", `from '${ROOT_URL}/src/lib/clubManagerEras.ts';`, 'the eras import');
  slotsPath = `${TMP}/clubManagerSlots.control.ts`;
  fs.writeFileSync(slotsPath, src);
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
const GENERATED_ID = /"(?:youth|sc|pr|pq|msg)-[a-z0-9-]+"/g;
const digest = s => {
  const { h2h, ...rest } = s;
  const seen = new Map();
  return JSON.stringify(rest).replace(GENERATED_ID, m => {
    if (!seen.has(m)) seen.set(m, `"#id${seen.size}"`);
    return seen.get(m);
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
    fail(`${CAREERS[i].label}: season ${firstBad + 1} differs from the career played alone, in ${diffKeys(a[firstBad].d, b[firstBad].d).slice(0, 12).join(', ')}`);
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
reseed(0, 99);
const oldBytes = JSON.stringify(startCareer('Everton'));
store.set(SAVE_KEY, oldBytes);
const v4 = readSlots();
if (activeSlot() !== 1 || !v4[0].active || v4[0].summary?.clubName !== 'Everton') fail('an old save does not read as slot 1');
if (v4[1].summary || v4[2].summary) fail('an old save shows careers in slots 2 or 3');
if (store.size !== 1 || store.get(SAVE_KEY) !== oldBytes) fail('reading the slots wrote to the store');
console.log(`   old save in slot 1, ${store.size} key on the device, bytes untouched: ${store.get(SAVE_KEY) === oldBytes}`);

/* ================================================================== */
/* The verdict                                                         */
/* ================================================================== */
fs.rmSync(TMP, { recursive: true, force: true });
const red = Object.entries(failures).filter(([, n]) => n > 0).map(([k]) => Number(k));
if (CONTROL) {
  const own = OWN[CONTROL];
  /* The check each control is there to prove, not a neighbour of it: the
     byte fence itself for dupe, a moved store for norollback. */
  const needTag = { dupe: 'budget', norollback: 'moved' }[CONTROL];
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
