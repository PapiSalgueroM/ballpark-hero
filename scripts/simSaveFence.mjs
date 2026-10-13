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
 *           leaves: the save on disk is still B's, and so is it after the live
 *           viewer's own write that follows a leave by Back), M1 the replay three times
 *           (B plays the fixture, stale A plays the same fixture: the last
 *           result on disk is B's every time), and the Hot Seat carry on (a
 *           surviving Hot Seat manager handed over while tab A holds a career:
 *           A's leave write does not land over the handover).
 *   source  Every call in src (comments stripped, code only) that writes or
 *           removes the Club Manager save sits inside a saveFence.write, or is
 *           on the short ALLOWED list with its reason, and every allowed entry
 *           is still there. Since Round 1330 the same for the Soccer Career
 *           save (soccerCareerSave), with its own allowed list.
 *   fleet   The three careers simClubManagerSlots plays (Everton today, a
 *           padded Lincoln City with a named manager, 2010-11 Barcelona), plus
 *           the review's squeeze (Everton, at every window two loans in, loans
 *           out down to the floor of 14, both loans broken: the engine itself
 *           writes 12 men and plays on, and every seed must reach it), seeds 0
 *           to 4 (SAVE_FENCE_SEEDS), two seasons each, a save, a load
 *           and a save again after EVERY entry. No played save ever reaches a
 *           state a load repair fires on. A save holding a negative budget
 *           opens with that budget, no draw, and the base's JSON (the load
 *           leaves negatives alone). With FENCE_BASE (a worktree of the
 *           commit before the round): every face (both saves' bytes and the
 *           draw count) equals the base engine's, and every Club Manager save
 *           scripts/lib/realSaves.mjs builds with the BASE engine opens to the
 *           same JSON on head and base.
 *
 * NEGATIVE CONTROLS (each asserts the text it rewrites is present exactly once
 * and prints how many times it fired; a control that fired zero times exits 2):
 *   SAVE_FENCE_CONTROL=nofence   the fence never moves the generation (its
 *                                setItem is cut from the bundle): the clobber
 *                                and the replays come back, tabs goes red.
 *   SAVE_FENCE_CONTROL=rawwrite  a raw SAVE_KEY setItem planted in an in memory
 *                                copy of clubManagerSlots.ts: source goes red.
 *   SAVE_FENCE_CONTROL=rawsoccer (Round 1330) a raw SAVE_KEY setItem planted in an
 *                                in memory copy of SoccerCareer.tsx: source red.
 *   SAVE_FENCE_CONTROL=loaddraw  one Math.random call inside loadCareer: the
 *                                draw count parts from the base, fleet red.
 *   SAVE_FENCE_CONTROL=repairall the budget repair runs on every load: the
 *                                saved bytes part from the base, fleet red.
 *   SAVE_FENCE_CONTROL=squadline the squad repair's line back at the transfer
 *                                floor of 14 (the code the review caught): the
 *                                squeezed saves get made up youth, fleet red.
 *   SAVE_FENCE_CONTROL=budgetneg a negative budget repaired like one that is
 *                                not a number: fleet red.
 *   (the fleet controls need FENCE_BASE and refuse to run without it)
 *
 * MEASURED on a runner (r1323-fx2, head 15160971, FENCE_BASE 8fea14e2): tabs
 * 15 checks; source 96 files write storage, 6 writes of the save fenced, 4 on
 * the allowed list (3 entries); fleet 1938 saves, 0 in a state a repair fires
 * on, 1938 of 1938 faces equal to the base's, 465 squeezed saves under 14 men
 * (92 to 94 a seed), the negative budget opens at -2.5 with 0 draws, old saves
 * 4 of 4. Round 1330 (r1330-sc-landing): source also finds the Soccer Career
 * save written 3 times inside saveFence.write and 4 times on its allowed list
 * (3 entries); rawsoccer fired once and turned source red with 1 finding.
 * Every check is an exact equality, so there is no band to set.
 * Nothing here reads dist or the network.
 * Run: [FENCE_BASE=<worktree of the base commit>] [SAVE_FENCE_SECTIONS=tabs,source,fleet] node scripts/simSaveFence.mjs
 */
import crypto from 'node:crypto';
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
const CONTROLS = { nofence: 'tabs', rawwrite: 'source', rawsoccer: 'source', loaddraw: 'fleet', repairall: 'fleet', squadline: 'fleet', budgetneg: 'fleet' };
if (CONTROL && !(CONTROL in CONTROLS)) { console.error(`SAVE_FENCE_CONTROL=${CONTROL} is not a control here (${Object.keys(CONTROLS).join(', ')})`); process.exit(1); }
if (CONTROLS[CONTROL] === 'fleet' && !process.env.FENCE_BASE) { console.error(`control cannot run: SAVE_FENCE_CONTROL=${CONTROL} is judged against the base commit, set FENCE_BASE`); process.exit(1); }
const WANT = (process.env.SAVE_FENCE_SECTIONS || (CONTROL ? CONTROLS[CONTROL] : 'tabs,source,fleet')).split(',').map(s => s.trim()).filter(Boolean);
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
const LOADDRAW_FROM = '    const rawBudget: unknown = parsed.budget;\n';
const REPAIRALL_FROM = "    if (typeof rawBudget !== 'number' || !Number.isFinite(rawBudget)) {\n";
const SQUADLINE_FROM = '    if (parsed.squad.length < 11) {\n';
/** The engine bundled from `root` (this tree, or FENCE_BASE). `patch` names a
    head control to apply on load. Each call of the answer is a fresh module
    instance: a fresh tab, or a fresh arm with no module state carried over. */
async function bundle(root = ROOT, label = 'head', patch = CONTROL) {
  const entry = path.join(TMP, `entry-${label}.mjs`);
  const out = path.join(TMP, `bundle-${label}.mjs`);
  const P = rel => JSON.stringify(path.join(root, rel).replaceAll('\\', '/'));
  const has = rel => fs.existsSync(path.join(root, rel));
  fs.writeFileSync(entry, [
    `export * as cm from ${P('src/lib/clubManager.ts')};`,
    `export * as eras from ${P('src/lib/clubManagerEras.ts')};`,
    `export * as slots from ${P('src/lib/clubManagerSlots.ts')};`,
    has('src/lib/saveFence.ts') ? `export * as fence from ${P('src/lib/saveFence.ts')};` : 'export const fence = null;',
    `export * as hs from ${P('src/lib/managerHotSeat.ts')};`,
  ].join('\n') + '\n');
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    absWorkingDir: root, alias: { '@': path.join(root, 'src') },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'save-fence-control', setup(b) {
      b.onLoad({ filter: /(saveFence|clubManager)\.ts$/ }, args => {
        const file = path.basename(args.path);
        let text = null;
        if (patch === 'nofence' && file === 'saveFence.ts') text = once(lf(args.path), NOFENCE_FROM, file).replace(NOFENCE_FROM, '');
        if (patch === 'loaddraw' && file === 'clubManager.ts') text = once(lf(args.path), LOADDRAW_FROM, file).replace(LOADDRAW_FROM, `    Math.random();\n${LOADDRAW_FROM}`);
        if (patch === 'repairall' && file === 'clubManager.ts') text = once(lf(args.path), REPAIRALL_FROM, file).replace(REPAIRALL_FROM, '    if (true) {\n');
        if (patch === 'squadline' && file === 'clubManager.ts') text = once(lf(args.path), SQUADLINE_FROM, file).replace(SQUADLINE_FROM, '    if (parsed.squad.length < 14) {\n');
        if (patch === 'budgetneg' && file === 'clubManager.ts') text = once(lf(args.path), REPAIRALL_FROM, file).replace(REPAIRALL_FROM, "    if (typeof rawBudget !== 'number' || !Number.isFinite(rawBudget) || rawBudget < 0) {\n");
        if (text === null) return undefined;
        fired += 1;
        console.log(`NEGATIVE CONTROL ON: SAVE_FENCE_CONTROL=${patch} rewrote ${file} in the ${label} bundle`);
        return { contents: text, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  let copies = 0;
  return async () => import(`${pathToFileURL(out).href}?copy=${++copies}`);
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
    /* As the hook's unmount: the last write, then the release, except that a
       page another tab has moved on stays held until the unmount is over. */
    leave() { const ok = t.s ? t.persist() : true; if (!t.moved()) fence.saveFence.release(SAVE_KEY); t.last = t.s; t.s = null; return ok; },
    /** The live viewer's own unmount write, which React runs after the hook's
        cleanup, then the end of that commit (the held stale page lets go). */
    late() { const ok = t.last ? cm.saveCareer(t.last) : false; if (t.moved()) fence.saveFence.release(SAVE_KEY); return ok; },
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
    /* The review's door (r1323-run-d W1): left by Back mid Play Live, the live
       viewer writes after the hook's cleanup. Still refused. */
    const lateOk = A.late();
    const afterLate = face(store.get(SAVE_KEY));
    tick('tabs');
    if (lateOk || afterLate !== afterB) fail('tabs', `B1 BACK: the live viewer's write after the leave took the save from "${afterB}" to "${afterLate}"`);
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
/* Round 1330: Soccer Career's save is fenced too. The same generic writers
   reach it by entry.saveKey (it is a registered long game in
   src/data/continueSaves.ts), each safe for its own reason here. */
const SOCCER_KEY = 'soccerCareerSave';
const SOCCER_ALLOWED = [
  { file: 'src/lib/brokenSaveRecovery.ts', fn: 'moveAside', reason: 'the error boundary\'s fresh start and the damaged tile\'s Clear: the bytes are copied aside first, then the page reloads or opens on the creation screen with no career in memory, and its next Begin Career writes through the fence (saveCareer) and stales every other tab' },
  { file: 'src/lib/brokenSaveRecovery.ts', fn: 'restoreBackup', reason: 'a put back swaps before any career is in the page\'s memory; the next mount adopts, reads, and its mount write goes through the fence and stales every other tab' },
  { file: 'src/lib/saveKeeper.ts', fn: 'applyPending', reason: 'the keeper applies a staged put back in main.tsx before React mounts; the page\'s mount write right after moves the generation' },
];
const SOCCER_RAW_FILE = 'src/pages/SoccerCareer.tsx';
const SOCCER_RAW_ANCHOR = '  const handleBeginCareer = () => {\n';
const SOCCER_RAW_PLANT = "    try { localStorage.setItem(SAVE_KEY, '{}'); } catch { /* planted */ }\n";
function walkSrc(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'test') walkSrc(p, out); }
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$|\.d\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}
function sectionSource() {
  console.log('source: every call in src that writes the Club Manager save or the Soccer Career save is fenced or allowed');
  const seenAllowed = new Set();
  const seenSoccerAllowed = new Set();
  let fenced = 0, generic = 0, scanned = 0;
  let scFenced = 0, scGeneric = 0;
  for (const file of walkSrc(path.join(ROOT, 'src'))) {
    const rel = path.relative(ROOT, file).replaceAll('\\', '/');
    let text = lf(file);
    if (CONTROL === 'rawwrite' && rel === 'src/lib/clubManagerSlots.ts') {
      once(text, RAW_ANCHOR, rel);
      if (text.includes(RAW_PLANT)) { console.error('control cannot run: the planted write is already in the file'); process.exit(1); }
      text = text.replace(RAW_ANCHOR, RAW_ANCHOR + RAW_PLANT);
      fired += 1;
    }
    if (CONTROL === 'rawsoccer' && rel === SOCCER_RAW_FILE) {
      once(text, SOCCER_RAW_ANCHOR, rel);
      if (text.includes(SOCCER_RAW_PLANT)) { console.error('control cannot run: the planted write is already in the file'); process.exit(1); }
      text = text.replace(SOCCER_RAW_ANCHOR, SOCCER_RAW_ANCHOR + SOCCER_RAW_PLANT);
      fired += 1;
    }
    if (!/\.(setItem|removeItem)\(/.test(text)) continue;
    scanned += 1;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const cmIds = new Set();
    if (/import\s*\{[^}]*\bSAVE_KEY\b[^}]*\}\s*from\s*'(@\/lib\/clubManager|\.\/clubManager)'/.test(text)) cmIds.add('SAVE_KEY');
    const scIds = new Set();
    const decls = [];
    const collect = n => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) decls.push(n); ts.forEachChild(n, collect); };
    collect(sf);
    for (const d of decls) if (d.initializer.getText(sf) === `'${SAVE_KEY}'`) cmIds.add(d.name.text);
    for (const d of decls) if (ts.isStringLiteralLike(d.initializer) && d.initializer.text === SOCCER_KEY) scIds.add(d.name.text);
    for (const d of decls) {
      if (ts.isCallExpression(d.initializer) || ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) continue;
      if ([...cmIds].some(id => new RegExp(`\\b${id}\\b`).test(d.initializer.getText(sf)))) cmIds.add(d.name.text);
      if ([...scIds].some(id => new RegExp(`\\b${id}\\b`).test(d.initializer.getText(sf)))) scIds.add(d.name.text);
    }
    const visit = node => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && ['setItem', 'removeItem'].includes(node.expression.name.text) && node.arguments.length) {
        const arg = node.arguments[0];
        const key = arg.getText(sf);
        const cm = (ts.isIdentifier(arg) && cmIds.has(key)) || key === `'${SAVE_KEY}'`;
        const sc = (ts.isIdentifier(arg) && scIds.has(key)) || (ts.isStringLiteralLike(arg) && arg.text === SOCCER_KEY);
        /* A generic writer: a game's saveKey in a module that walks the
           registered long games (src/data/continueSaves.ts), Club Manager
           and Soccer Career among them. */
        const gen = !cm && !sc && /(^|\.)saveKey$/.test(key) && /\b(ContinueSave|CONTINUE_SAVES)\b/.test(text);
        if (cm || sc || gen) {
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
          if (cm || gen) {
            tick('source');
            if (isFenced) fenced += 1;
            else {
              const allow = ALLOWED.find(e => e.file === rel && names.includes(e.fn));
              if (allow) { generic += 1; seenAllowed.add(allow); }
              else fail('source', `a write of the Club Manager save outside the fence and off the allowed list: ${where}`);
            }
          }
          if (sc || gen) {
            tick('source');
            if (isFenced) scFenced += 1;
            else {
              const allow = SOCCER_ALLOWED.find(e => e.file === rel && names.includes(e.fn));
              if (allow) { scGeneric += 1; seenSoccerAllowed.add(allow); }
              else fail('source', `a write of the Soccer Career save outside the fence and off the allowed list: ${where}`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  for (const e of ALLOWED) if (!seenAllowed.has(e)) fail('source', `allowed entry ${e.file} ${e.fn} no longer writes the save: take it off the list`);
  for (const e of SOCCER_ALLOWED) if (!seenSoccerAllowed.has(e)) fail('source', `Soccer Career allowed entry ${e.file} ${e.fn} no longer writes the save: take it off the list`);
  console.log(`  ${scanned} files write storage; ${fenced} writes of the save inside saveFence.write, ${generic} on the allowed list (${ALLOWED.length} entries, each still there)`);
  console.log(`  Soccer Career: ${scFenced} writes of soccerCareerSave inside saveFence.write, ${scGeneric} on the allowed list (${SOCCER_ALLOWED.length} entries, each still there)`);
  if (fenced < 5) fail('source', `only ${fenced} fenced writes found; saveCareer (2), clearCareer, the swap and deleteSlot make 5`);
  if (scFenced < 3) fail('source', `only ${scFenced} fenced Soccer Career writes found; saveCareer, clearCareer and deleteUnusableSave make 3`);
}

/* ---------- fleet: the save's bytes and the stream do not move ---------- */
const FLEET = [
  { label: 'Everton (today)', club: 'Everton', era: 'now' },
  { label: 'Lincoln City (today, named manager, padded)', club: 'Lincoln City', era: 'now',
    manager: { name: 'Harness Manager', nationality: 'England', background: 'coachingBadges', style: 'counter' } },
  { label: 'Barcelona (2010-11)', club: 'Barcelona', era: 'era2010' },
  /* The review's squeeze (r1323-run-b probe): at every window two loans in,
     loaned out down to the floor of 14, both loans broken, so the engine
     itself writes a squad of 12 and plays on with it. */
  { label: 'Everton (today, squeezed to 12 at every window)', club: 'Everton', era: 'now', squeeze: true },
];
/** The manager's own moves in an open window, every one an engine function the
    transfer desk calls: two loans in, loans out down to 14, both loans broken. */
function squeeze(cm, s) {
  let taken = 0;
  for (const mp of cm.buildMarket(s)) {
    if (taken >= 2) break;
    if (!cm.loanEligible(s, mp)) continue;
    const next = cm.loanIn(s, mp);
    if (next) { s = next; taken += 1; }
  }
  for (let guard = 0; s.squad.length > 14 && guard < 60; guard++) {
    const p = s.squad.find(x => !x.onLoan && cm.loanOutRefusal(s, x.id) === null);
    const next = p ? cm.loanOutPlayer(s, p.id) : null;
    if (!next) break;
    s = next;
  }
  for (const p of s.squad.filter(x => x.onLoan)) { const next = cm.breakLoan(s, p.id); if (next) s = next; }
  return s;
}
const FLEET_SEEDS = (process.env.SAVE_FENCE_SEEDS || '0,1,2,3,4').split(',').map(Number);
const FLEET_SEASONS = Number(process.env.SAVE_FENCE_SEASONS || 2);
const sha = s => crypto.createHash('sha256').update(s ?? '').digest('hex').slice(0, 16);
/** A state the engine never writes: what each load repair fires on. */
const repairWanted = raw => {
  const c = JSON.parse(raw);
  const ids = new Set(c.squad.map(p => p.id));
  const out = [];
  if (typeof c.budget !== 'number' || !Number.isFinite(c.budget)) out.push('budget');
  if (c.squad.length < 11) out.push('squad');
  if (c.xiIds.some(id => id !== null && !ids.has(id))) out.push('xi');
  return out;
};
/** One career on one stream: after EVERY entry a save, a load and a save
    again. The faces are both saves' hashes and the draws so far. */
function playFleet(mod, C, seedN, wanted, seen = { under14: 0 }) {
  const { cm } = mod;
  const draw = seed(seedN * 7919 + FLEET.indexOf(C) * 104729 + 1);
  const realRandom = Math.random, realNow = Date.now;
  Math.random = draw;
  Date.now = () => 1791302400000;
  const faces = [];
  const round = (s, tag) => {
    cm.saveCareer(s);
    const a = store.get(SAVE_KEY);
    for (const w of repairWanted(a)) wanted.push(`${C.label} seed ${seedN} ${tag}: ${w}`);
    if (JSON.parse(a).squad.length < 14) seen.under14 += 1;
    const back = cm.loadCareer();
    if (!back) { faces.push(`${tag}|unreadable`); return; }
    cm.saveCareer(back);
    faces.push(`${tag}|${sha(a)}|${sha(store.get(SAVE_KEY))}|${draw.calls()}`);
  };
  try {
    store.clear();
    let s = cm.startCareer(C.club, C.era, undefined, C.manager);
    round(s, 'start');
    let lastWindow = null;
    for (let season = 0; season < FLEET_SEASONS; season++) {
      for (let guard = 0; s.week < s.calendar.length && guard < 220; guard++) {
        if (C.squeeze && s.transferWindow && s.transferWindow !== lastWindow) { s = squeeze(cm, s); round(s, `s${season} w${s.week} squeezed`); }
        lastWindow = s.transferWindow;
        const r = cm.playNextEntry(s, { skipHalftime: true });
        s = r.state;
        round(s, `s${season} w${s.week}`);
        if (r.kind === 'seasonOver') break;
      }
      const fin = cm.finishSeason(s);
      s = cm.startNextSeason(fin.state);
      round(s, `s${season + 1} start`);
    }
  } finally {
    Math.random = realRandom;
    Date.now = realNow;
  }
  return faces;
}
async function sectionFleet() {
  const BASE = process.env.FENCE_BASE ? path.resolve(process.env.FENCE_BASE) : null;
  console.log(`fleet: ${FLEET.length} careers x seeds ${FLEET_SEEDS.join(',')} x ${FLEET_SEASONS} seasons, a save, a load and a save after every entry${BASE ? `, against FENCE_BASE ${BASE}` : ' (no FENCE_BASE: the repairs alone)'}`);
  const headLoad = await bundle(ROOT, 'fleet-head', CONTROL);
  const baseLoad = BASE ? await bundle(BASE, 'fleet-base', '') : null;
  const wanted = [];
  let entries = 0, equal = 0, firstDiff = null;
  const squeezed = new Map();
  for (const C of FLEET) {
    for (const n of FLEET_SEEDS) {
      const head = await headLoad();
      await head.eras.ensureEraRosters(C.era);
      const seen = { under14: 0 };
      const hf = playFleet(head, C, n, wanted, seen);
      if (C.squeeze) squeezed.set(n, seen.under14);
      entries += hf.length;
      if (!baseLoad) continue;
      const base = await baseLoad();
      await base.eras.ensureEraRosters(C.era);
      const bf = playFleet(base, C, n, []);
      tick('fleet', hf.length);
      for (let i = 0; i < Math.max(hf.length, bf.length); i++) {
        if (hf[i] === bf[i]) { equal += 1; continue; }
        firstDiff ??= `${C.label} seed ${n}: head "${hf[i]}" base "${bf[i]}"`;
        break;
      }
      if (hf.length !== bf.length) firstDiff ??= `${C.label} seed ${n}: head played ${hf.length} entries, base ${bf.length}`;
    }
  }
  tick('fleet');
  console.log(`  ${entries} saves on head, ${wanted.length} of them in a state a load repair fires on${baseLoad ? `; ${equal} faces equal to the base commit's (both saves' bytes and the draw count)` : ''}`);
  if (wanted.length) fail('fleet', `a played save reached a repair condition, so a repair would change it: ${wanted.slice(0, 3).join('; ')}`);
  if (firstDiff) fail('fleet', `head and base part: ${firstDiff}`);
  /* The squeeze proves something only if it really wrote squads under 14. */
  const thin = [...squeezed.entries()].filter(([, k]) => k === 0).map(([n]) => n);
  tick('fleet');
  console.log(`  squeezed career: ${[...squeezed.values()].reduce((a, b) => a + b, 0)} saves the engine wrote with fewer than 14 men (seed:saves ${[...squeezed.entries()].map(([n, k]) => `${n}:${k}`).join(' ')})`);
  if (thin.length) fail('fleet', `the squeeze wrote no squad under 14 on seed(s) ${thin.join(', ')}, so it proves nothing there`);
  /* A NEGATIVE budget is left as it is on load. No engine of today writes one
     (every debit checks the kitty first), but startNextSeason clamps one at the
     summer for an older or a hand edited save, so the load does not touch it. */
  {
    const opened = [];
    for (const load of [headLoad, baseLoad].filter(Boolean)) {
      const mod = await load();
      await mod.eras.ensureEraRosters('now');
      const realRandom = Math.random, realNow = Date.now;
      const draw = seed(1323);
      Math.random = draw;
      Date.now = () => 1791302400000;
      try {
        store.clear();
        mod.cm.saveCareer({ ...mod.cm.startCareer('Everton', 'now'), budget: -2.5 });
        const before = draw.calls();
        const back = mod.cm.loadCareer();
        opened.push({ budget: back?.budget, draws: draw.calls() - before, json: JSON.stringify(back) });
      } finally {
        Math.random = realRandom;
        Date.now = realNow;
      }
    }
    tick('fleet');
    const [h, b] = opened;
    console.log(`  negative budget: saved at -2.5, opened on head at ${h.budget} with ${h.draws} draws${b ? `, ${h.json === b.json ? 'the same JSON as' : 'NOT the same JSON as'} the base's` : ''}`);
    if (h.budget !== -2.5 || h.draws !== 0) fail('fleet', `a negative budget was changed on load: -2.5 opened as ${h.budget} with ${h.draws} draws`);
    if (b && h.json !== b.json) fail('fleet', 'a save with a negative budget opens differently on head and base');
  }
  if (!baseLoad) { console.log('  (set FENCE_BASE to a worktree of the base commit for the byte and draw comparison and the old saves)'); return; }
  /* OLD SAVES: every Club Manager save scripts/lib/realSaves.mjs builds with
     the BASE engine (no fence key anywhere) opens to the same JSON on both. */
  const { buildRealSaves } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/realSaves.mjs')).href);
  const real = await buildRealSaves({ root: BASE, tmpDir: path.join(TMP, 'real'), seeds: [0, 1, 2, 3] });
  globalThis.localStorage = stub; // its bundle plants a store of its own on globalThis
  const raws = real.fleet['/club-manager'] ?? [];
  const head = await headLoad();
  const base = await baseLoad();
  await head.eras.ensureAllEraRosters();
  await base.eras.ensureAllEraRosters();
  const realNow = Date.now;
  Date.now = () => 1791302400000;
  let same = 0;
  try {
    for (const [i, raw] of raws.entries()) {
      const open = mod => { store.clear(); store.set(SAVE_KEY, raw); return JSON.stringify(mod.cm.loadCareer()); };
      const h = open(head), b = open(base);
      tick('fleet');
      if (h === 'null') fail('fleet', `old save ${i} (base engine's bytes) does not open on head`);
      else if (h !== b) fail('fleet', `old save ${i} opens differently on head and base`);
      else same += 1;
    }
  } finally {
    Date.now = realNow;
  }
  console.log(`  old saves: ${same} of ${raws.length} Club Manager saves the base engine wrote open to the same JSON on head and base`);
  if (raws.length < 4) fail('fleet', `realSaves gave ${raws.length} Club Manager saves, not 4`);
}

/* ---------- run ---------- */
const load = run('tabs') ? await bundle() : null;
if (run('tabs')) await sectionTabs(load);
if (run('source')) sectionSource();
if (run('fleet')) await sectionFleet();
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
