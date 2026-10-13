/**
 * Round 1323 harness: one tab wins. A Club Manager career open in two tabs can
 * never be wiped or replayed by the stale tab (src/lib/saveFence.ts).
 *
 * Every section runs the REAL engine, the REAL slots module and the REAL fence,
 * bundled. Two tabs are two separately evaluated copies of the same bundle
 * (two module instances, so two page fences), over ONE shared store planted as
 * window.localStorage, which is where the page's fence looks. The store is the
 * bare stub the sims plant (getItem, setItem, removeItem, nothing else), so the
 * fence is proven to run on it.
 *
 * SECTIONS
 *   tabs    The hunt's cases, played the way the page plays them (adopt before
 *           the read, a write after every change, the leave write at the end):
 *           B1 the clobber (tab A on week N, tab B plays three matches, A
 *           leaves: the save on disk is still B's), M1 the replay three times
 *           (B plays the fixture, stale A plays the same fixture: the last
 *           result on disk is B's every time), and the Hot Seat carry on (a
 *           surviving Hot Seat manager handed over while tab A holds a career:
 *           A's leave write does not land over the handover).
 *   source  Every call in src (comments stripped, code only) that writes or
 *           removes the Club Manager save sits inside a saveFence.write, or is
 *           on the short ALLOWED list with its reason, and every allowed entry
 *           is still there.
 *
 * NEGATIVE CONTROLS (each asserts the text it rewrites is present exactly once
 * and prints how many times it fired; a control that fired zero times exits 2):
 *   SAVE_FENCE_CONTROL=nofence   the fence never moves the generation (its
 *                                setItem is cut from the bundle): the clobber
 *                                and the replays come back, tabs goes red.
 *   SAVE_FENCE_CONTROL=rawwrite  a raw SAVE_KEY setItem planted in an in memory
 *                                copy of clubManagerSlots.ts: source goes red.
 *
 * MEASURED: see the numbers written under each section once taken on a runner.
 * Nothing here reads dist or the network.
 * Run: node scripts/simSaveFence.mjs [SAVE_FENCE_SECTIONS=tabs,source]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAVE_KEY = 'dukb-club-manager-save';
const FENCE_KEY = 'dukb-fence:dukb-club-manager-save';
const CONTROL = process.env.SAVE_FENCE_CONTROL || '';
const CONTROLS = { nofence: 'tabs', rawwrite: 'source' };
if (CONTROL && !(CONTROL in CONTROLS)) { console.error(`SAVE_FENCE_CONTROL=${CONTROL} is not a control here (${Object.keys(CONTROLS).join(', ')})`); process.exit(1); }
const WANT = (process.env.SAVE_FENCE_SECTIONS || 'tabs,source').split(',').map(s => s.trim()).filter(Boolean);
const run = name => WANT.includes(name) || (CONTROL && CONTROLS[CONTROL] === name);
const red = new Map();
const checks = new Map();
const fail = (section, message) => { (red.get(section) ?? red.set(section, []).get(section)).push(message); console.error(`  FAIL [${section}]: ${message}`); };
const tick = (section, n = 1) => checks.set(section, (checks.get(section) ?? 0) + n);
let fired = 0;
const lf = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const once = (text, from, where) => {
  const n = text.split(from).length - 1;
  if (n !== 1) { console.error(`control cannot run: ${where} holds its anchor ${n} times, not once: ${JSON.stringify(from)}`); process.exit(1); }
  return text;
};

/* ---------- the shared store, as window.localStorage ---------- */
const store = new Map();
const stub = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
};
globalThis.localStorage = stub;
globalThis.window = { localStorage: stub };

/* ---------- the bundle (controls patch it on load) ---------- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'saveFence-'));
const NOFENCE_FROM = '          s.setItem(fenceKeyOf(saveKey), String(next));\n';
async function bundle() {
  const entry = path.join(TMP, 'entry.mjs');
  const out = path.join(TMP, 'bundle.mjs');
  const P = rel => JSON.stringify(path.join(ROOT, rel).replaceAll('\\', '/'));
  fs.writeFileSync(entry, [
    `export * as cm from ${P('src/lib/clubManager.ts')};`,
    `export * as slots from ${P('src/lib/clubManagerSlots.ts')};`,
    `export * as fence from ${P('src/lib/saveFence.ts')};`,
    `export * as hs from ${P('src/lib/managerHotSeat.ts')};`,
  ].join('\n') + '\n');
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'save-fence-control', setup(b) {
      b.onLoad({ filter: /saveFence\.ts$/ }, args => {
        if (CONTROL !== 'nofence') return undefined;
        const text = once(lf(args.path), NOFENCE_FROM, 'saveFence.ts');
        fired += 1;
        return { contents: text.replace(NOFENCE_FROM, ''), loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  let copies = 0;
  return async () => import(`${pathToFileURL(out).href}?tab=${++copies}`);
}

/** The stream from scripts/lib/seedRandom.mjs's family (mulberry32), counted. */
function seed(n) {
  let a = (n * 2654435761 + 0x2f6b9) >>> 0;
  let calls = 0;
  const draw = () => {
    calls += 1;
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  draw.calls = () => calls;
  return draw;
}

/** What the hunt read off the save: the week, how many meetings, the last one. */
const face = raw => {
  if (!raw) return 'no save';
  const c = JSON.parse(raw);
  const h = c.h2h ?? [];
  const last = h[h.length - 1];
  return `${c.clubName} week ${c.week}, ${h.length} meetings, last ${last ? `${last.opp} ${last.score}` : 'none'}`;
};

/** One tab, the way useClubManager plays it: adopt before the read, a write
    after every change, the leave write and the release at the end. */
function tab(mod, name) {
  const { cm, fence } = mod;
  const t = {
    name, s: null, refused: 0,
    persist() { const ok = cm.saveCareer(t.s); if (!ok) t.refused += 1; return ok; },
    open() { fence.saveFence.adopt(SAVE_KEY); t.s = cm.loadCareer(); if (t.s) t.persist(); return t.s; },
    start(club) { fence.saveFence.adopt(SAVE_KEY); t.s = cm.startCareer(club); t.persist(); },
    /** Plays entries until n more meetings are on the career, writing after each. */
    play(n) {
      const want = (t.s.h2h ?? []).length + n;
      for (let guard = 0; (t.s.h2h ?? []).length < want && guard < 40; guard++) {
        t.s = cm.playNextEntry(t.s, { skipHalftime: true }).state;
        t.persist();
      }
    },
    moved: () => fence.saveFence.moved(SAVE_KEY),
    leave() { const ok = t.s ? t.persist() : true; fence.saveFence.release(SAVE_KEY); t.s = null; return ok; },
  };
  return t;
}

async function sectionTabs(load) {
  console.log('tabs: two tabs on one career, and a Hot Seat handover beside one');
  const engA = await load();
  const engB = await load();
  const realRandom = Math.random;
  try {
    /* B1: the clobber. */
    Math.random = seed(11);
    store.clear();
    const A = tab(engA, 'A');
    A.start('Brighton');
    A.play(1);
    const startFace = face(store.get(SAVE_KEY));
    const B = tab(engB, 'B');
    B.open();
    B.play(3);
    const afterB = face(store.get(SAVE_KEY));
    const staleSeen = A.moved();
    const leaveOk = A.leave();
    const afterLeave = face(store.get(SAVE_KEY));
    B.leave();
    B.open();
    const reloaded = B.s ? `${B.s.clubName} week ${B.s.week}` : 'nothing';
    B.leave();
    console.log(`  B1 start: ${startFace}\n     after B played three: ${afterB}\n     after A left: ${afterLeave} (A saw the move: ${staleSeen}, its leave write landed: ${leaveOk})`);
    tick('tabs', 4);
    if (startFace === afterB) fail('tabs', 'B1: tab B played three matches and the save did not move');
    if (!staleSeen) fail('tabs', 'B1: tab A never saw that tab B had played on');
    if (leaveOk) fail('tabs', 'B1: tab A\'s leave write landed over tab B\'s career');
    if (afterLeave !== afterB) fail('tabs', `B1 CLOBBER: the save went from "${afterB}" back to "${afterLeave}"`);
    if (!reloaded.startsWith(afterB.split(',')[0])) fail('tabs', `B1: tab B reloaded to ${reloaded}, not ${afterB}`);

    /* M1: the replay, three times. Both tabs fresh, A first; B plays the next
       fixture; A, never reloaded, plays the same fixture and tries to write it. */
    for (let i = 0; i < 3; i++) {
      Math.random = seed(20 + i);
      const a = tab(engA, 'A');
      const b = tab(engB, 'B');
      a.open();
      b.open();
      b.play(1);
      const theirs = face(store.get(SAVE_KEY));
      a.play(1);
      const ours = face(JSON.stringify(a.s));
      const after = face(store.get(SAVE_KEY));
      a.leave();
      b.leave();
      console.log(`  REPLAY ${i}: B wrote "${theirs}", stale A played "${ours}", on disk after A: "${after}" (A refused ${a.refused} times)`);
      tick('tabs', 2);
      if (after !== theirs) fail('tabs', `M1 REPLAY ${i}: stale tab A replaced "${theirs}" with "${after}"`);
      if (a.refused === 0) fail('tabs', `M1 REPLAY ${i}: stale tab A was never refused`);
    }

    /* The Hot Seat carry on, while tab A holds a Club Manager career. */
    Math.random = seed(31);
    store.clear();
    const H = tab(engA, 'A');
    H.start('Everton');
    H.play(2);
    const { hs } = engB;
    const pool = hs.hotSeatPool();
    let run = null;
    for (let k = 0; k < 40 && !run; k++) {
      let r = hs.startHotSeat({ club: pool[(k * 7) % pool.length].club, seed: 1000 + k });
      for (let g = 0; !r.verdict && g < 40; g++) r = hs.pendingPress(r) ? hs.answerHotSeatPress(r, 0) : hs.playHotSeatMatch(r, 'balanced', null);
      if (hs.canCarryOn(r)) run = r;
    }
    tick('tabs');
    if (!run) { fail('tabs', 'HOT SEAT: no surviving Hot Seat manager in 40 free play seeds, nothing to hand over'); return; }
    const handed = hs.carryOnInClubManager(run, { replace: true });
    const handedFace = face(store.get(SAVE_KEY));
    const sawIt = H.moved();
    const hLeave = H.leave();
    const afterH = face(store.get(SAVE_KEY));
    console.log(`  HOT SEAT: ${run.state.clubName} handed over (${handed}): "${handedFace}"; tab A saw it: ${sawIt}; after A left: "${afterH}"`);
    tick('tabs', 3);
    if (handed !== 'saved') fail('tabs', `HOT SEAT: the carry on answered ${handed}`);
    if (!sawIt) fail('tabs', 'HOT SEAT: tab A never saw the handover');
    if (hLeave || afterH !== handedFace) fail('tabs', `HOT SEAT: tab A's leave write put "${afterH}" over the handover "${handedFace}"`);
  } finally {
    Math.random = realRandom;
  }
}

/* ---------- source: every writer of the save is fenced or allowed ---------- */
/* Writers that reach the Club Manager save by a game's entry.saveKey, which
   no fence call can wrap without teaching those generic modules about one
   game. Each is safe for the reason given, and each must still be there. */
const ALLOWED = [
  { file: 'src/lib/brokenSaveRecovery.ts', fn: 'moveAside', reason: 'the error boundary\'s fresh start and the damaged tile\'s Clear: the bytes are copied aside first, and the page then reloads or writes through the fence (clearCareer) at once' },
  { file: 'src/lib/brokenSaveRecovery.ts', fn: 'restoreBackup', reason: 'a put back swaps before any game is in the page\'s memory (its own header); the next boot of that page writes through the fence and stales every other tab' },
  { file: 'src/lib/saveKeeper.ts', fn: 'applyPending', reason: 'the keeper applies a staged put back in main.tsx before React mounts; the page\'s own boot write right after moves the generation' },
];
const RAW_ANCHOR = 'export function deleteSlot(slot: number): void {\n';
const RAW_PLANT = "  try { localStorage.setItem(SAVE_KEY, '{}'); } catch { /* planted */ }\n";
function walkSrc(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'test') walkSrc(p, out); }
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$|\.d\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}
function sectionSource() {
  console.log('source: every call in src that writes the Club Manager save is fenced or allowed');
  const seenAllowed = new Set();
  let fenced = 0, generic = 0, scanned = 0;
  for (const file of walkSrc(path.join(ROOT, 'src'))) {
    const rel = path.relative(ROOT, file).replaceAll('\\', '/');
    let text = lf(file);
    if (CONTROL === 'rawwrite' && rel === 'src/lib/clubManagerSlots.ts') {
      once(text, RAW_ANCHOR, rel);
      if (text.includes(RAW_PLANT)) { console.error('control cannot run: the planted write is already in the file'); process.exit(1); }
      text = text.replace(RAW_ANCHOR, RAW_ANCHOR + RAW_PLANT);
      fired += 1;
    }
    if (!/\.(setItem|removeItem)\(/.test(text)) continue;
    scanned += 1;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const cmIds = new Set();
    if (/import\s*\{[^}]*\bSAVE_KEY\b[^}]*\}\s*from\s*'(@\/lib\/clubManager|\.\/clubManager)'/.test(text)) cmIds.add('SAVE_KEY');
    const decls = [];
    const collect = n => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) decls.push(n); ts.forEachChild(n, collect); };
    collect(sf);
    for (const d of decls) if (d.initializer.getText(sf) === `'${SAVE_KEY}'`) cmIds.add(d.name.text);
    for (const d of decls) {
      if (ts.isCallExpression(d.initializer) || ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) continue;
      if ([...cmIds].some(id => new RegExp(`\\b${id}\\b`).test(d.initializer.getText(sf)))) cmIds.add(d.name.text);
    }
    const visit = node => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && ['setItem', 'removeItem'].includes(node.expression.name.text) && node.arguments.length) {
        const arg = node.arguments[0];
        const key = arg.getText(sf);
        const cm = (ts.isIdentifier(arg) && cmIds.has(key)) || key === `'${SAVE_KEY}'`;
        /* A generic writer: a game's saveKey in a module that walks the
           registered long games (src/data/continueSaves.ts), Club Manager among them. */
        const gen = !cm && /(^|\.)saveKey$/.test(key) && /\b(ContinueSave|CONTINUE_SAVES)\b/.test(text);
        if (cm || gen) {
          const names = [];
          let isFenced = false;
          for (let a = node.parent; a; a = a.parent) {
            if ((ts.isArrowFunction(a) || ts.isFunctionExpression(a)) && a.parent && ts.isCallExpression(a.parent)
              && a.parent.expression.getText(sf) === 'saveFence.write') isFenced = true;
            if ((ts.isArrowFunction(a) || ts.isFunctionExpression(a)) && a.parent && ts.isVariableDeclaration(a.parent) && ts.isIdentifier(a.parent.name)) {
              names.push(a.parent.name.text);
              if (new RegExp(`saveFence\\.write\\(SAVE_KEY, ${a.parent.name.text}\\)`).test(text)) isFenced = true;
            }
            if ((ts.isFunctionDeclaration(a) || ts.isMethodDeclaration(a)) && a.name) names.push(a.name.getText(sf));
          }
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          const where = `${rel}:${line} ${names[names.length - 1] ?? '(module)'} ${node.expression.name.text}(${key})`;
          tick('source');
          if (isFenced) fenced += 1;
          else {
            const allow = ALLOWED.find(e => e.file === rel && names.includes(e.fn));
            if (allow) { generic += 1; seenAllowed.add(allow); }
            else fail('source', `a write of the Club Manager save outside the fence and off the allowed list: ${where}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  for (const e of ALLOWED) if (!seenAllowed.has(e)) fail('source', `allowed entry ${e.file} ${e.fn} no longer writes the save: take it off the list`);
  console.log(`  ${scanned} files write storage; ${fenced} writes of the save inside saveFence.write, ${generic} on the allowed list (${ALLOWED.length} entries, each still there)`);
  if (fenced < 5) fail('source', `only ${fenced} fenced writes found; saveCareer (2), clearCareer, the swap and deleteSlot make 5`);
}

/* ---------- run ---------- */
const load = run('tabs') ? await bundle() : null;
if (run('tabs')) await sectionTabs(load);
if (run('source')) sectionSource();
fs.rmSync(TMP, { recursive: true, force: true });
const sections = [...new Set([...WANT, ...(CONTROL ? [CONTROLS[CONTROL]] : [])])];
for (const s of sections) console.log(`  section ${s}: ${checks.get(s) ?? 0} checks, ${(red.get(s) ?? []).length} red`);
if (CONTROL) {
  const own = CONTROLS[CONTROL];
  if (!fired) { console.error(`CONTROL DID NOT FIRE: SAVE_FENCE_CONTROL=${CONTROL} changed nothing`); process.exit(2); }
  if (!(red.get(own) ?? []).length) { console.error(`CONTROL DID NOT TURN ITS SECTION RED: SAVE_FENCE_CONTROL=${CONTROL} fired ${fired} times and section ${own} stayed green`); process.exit(2); }
  console.log(`CONTROL FIRED: SAVE_FENCE_CONTROL=${CONTROL} fired ${fired} times and section ${own} went red with ${red.get(own).length} findings`);
  process.exit(1);
}
const reds = [...red.values()].reduce((n, l) => n + l.length, 0);
if (reds) { console.log(`simSaveFence: RED, ${reds} findings`); process.exit(1); }
console.log(`simSaveFence: all green (${sections.join(', ')})`);
