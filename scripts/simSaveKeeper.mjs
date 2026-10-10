/**
 * Round 1219: the save keeper, on real saves of all 21 long games.
 *
 * src/lib/saveKeeper.ts stages a "Put that save back" and applies it while
 * the next page loads, before any game is in memory, and copies a held save
 * aside before a newer version of its game refuses or migrates it. The unit
 * tests (src/test/saveKeeper.test.ts) hold its logic on short strings and
 * scripts/playSaveKeeper.mjs holds it in a real browser with a game open.
 * This harness holds it on SAVES THE GAMES REALLY WRITE, built at run time by
 * each game's own engine (scripts/lib/realSaves.mjs).
 *
 * SECTIONS
 *   0  the fixtures. All 21 games, SEEDS saves each; sizes printed; each
 *      fixture's top level keys are the keys of the literal its game's writer
 *      stringifies (read on the TypeScript tree); the writer is found by the
 *      fact, the setItem that names the game's key; every game with a pure
 *      loader accepts its own fixtures.
 *   1  the version table (SAVE_VERSIONS). Every row's real save holds exactly
 *      `current` where the row says; every other game's real save holds no
 *      whole number named v, version or saveVersion at its top level or one
 *      level down; and where the game exports a loader, a real save one
 *      version down and one version up is handed to it and the row's
 *      `other` and `oldest` must agree with what the loader answered.
 *   2  an ordinary boot writes nothing. A fixture of every game planted,
 *      runSaveKeeper through the real seam: zero writes, zero removes, the
 *      exact set of keys read, and every stored save byte equal before and
 *      after.
 *   3  the put back on real saves, and every crash point. For each game a
 *      save A kept aside and a different save B at the key: staged through
 *      restoreNow, applied by runSaveKeeper. Then the store dies at every
 *      storage call in turn and a healthy store boots over the same map.
 *   4  the copy before a version step, on real saves with the version
 *      lowered by one (declared as altered): exactly one copy, byte equal,
 *      three older backups untouched, a second boot writes nothing, and what
 *      the card then offers is printed.
 *   5  what the boot pass costs: the time of one pass with every versioned
 *      save held, beside a pass over an empty store. Printed, not asserted
 *      (node on a runner is not a phone; the walk measures it in Chromium
 *      under a CPU throttle).
 *
 * NEGATIVE CONTROLS, SIM_SAVE_KEEPER_CONTROL=<name>. Each one changes the
 * keeper's source IN MEMORY (or a fixture), refuses to run when the text it
 * changes is not there, and must turn its own section red:
 *   dropkey       one top level key is dropped from one fixture        (0)
 *   versiontable  Club Manager's current becomes 4                     (1)
 *   norow         Stadium Tycoon's row is removed                      (1)
 *   onebyte       one character of one stored save changes after boot  (2)
 *   bootwrite     the keeper writes a marker on every boot             (2)
 *   noaside       the apply skips the copy aside                       (3)
 *   journalfirst  the journal is removed before the key is written     (3)
 *   pileup        the byte equal check before a quiet copy is skipped  (4)
 * A control that fired exits 1 and its last line says FIRED. One that did not
 * fire, or could not run, exits 2 and says so. A green run exits 0.
 *
 * MEASURED (first green run, 2026-10-10, GitHub runner, node 24): see the
 * summary block this harness prints; the numbers are copied into
 * docs/audits/ROUND-1219-NOTES.md.
 *
 * Reads no network and no database. Each run bundles into its own temp
 * folder, so two runs at once cannot mix trees.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';
import { buildRealSaves, WRITERS, PURE_LOADERS } from './lib/realSaves.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_SAVE_KEEPER_CONTROL || '';
const CONTROLS = ['dropkey', 'versiontable', 'norow', 'onebyte', 'bootwrite', 'noaside', 'journalfirst', 'pileup'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`SIM_SAVE_KEEPER_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(2); }
const SEEDS = [0, 1, 2, 3];
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simSaveKeeper-'));

const failed = new Set();
let section = '';
const fail = msg => { failed.add(section); console.log(`   FAIL  ${msg}`); };
const ok = msg => console.log(`   ok    ${msg}`);
const check = (cond, good, bad) => (cond ? ok(good) : fail(bad ?? good));
const sha = text => crypto.createHash('sha256').update(text, 'utf16le').digest('hex').slice(0, 12);
const readLF = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/* ------------------------------------------------------------------ */
/* The keeper under test, bundled with the real seam. A control rewrites
   saveKeeper.ts in memory and refuses to run when its anchor is gone. */
const KEEPER = 'src/lib/saveKeeper.ts';
const SWAPS = {
  versiontable: ["'/club-manager': { at: ['saveVersion'], current: 3, oldest: 3, other: 'refuses' },", "'/club-manager': { at: ['saveVersion'], current: 4, oldest: 4, other: 'refuses' },"],
  norow: ["  '/stadium-tycoon': { at: ['v'], current: 1, oldest: 1, other: 'refuses' },\n", ''],
  bootwrite: ['    const outcome = applyPending(storage);\n', "    try { storage.setItem('dukb-control-marker', '1'); } catch { /* control */ }\n    const outcome = applyPending(storage);\n"],
  noaside: ["      const copied = copyAside(entry, storage, now);\n      if (!copied.ok) return done(false, { why: 'no-room' });\n      made = copied.backupKey;", '      const copied = { ok: true, backupKey: null as string | null };\n      made = copied.backupKey;'],
  journalfirst: ['  try {\n    /* Written OVER the old save', '  forget(storage);\n  try {\n    /* Written OVER the old save'],
  pileup: ['    if (heldAside(entry, storage, raw)) continue;\n', ''],
};
let keeperSrc = readLF(KEEPER);
if (CONTROL in SWAPS) {
  const [from, to] = SWAPS[CONTROL];
  if (!keeperSrc.includes(from)) { console.error(`simSaveKeeper control ${CONTROL}: CANNOT RUN. The text it rewrites is not in ${KEEPER}, so the control would change nothing.`); process.exit(2); }
  keeperSrc = keeperSrc.replace(from, to);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL} (${KEEPER} rewritten in memory)`);
} else if (CONTROL) {
  console.log(`NEGATIVE CONTROL ON: ${CONTROL} (harness side, no source changed)`);
}

/** A Map backed storage that counts, records the keys it was read at, and can die at call N. */
function makeStore(m = new Map()) {
  const s = { m, calls: 0, dieAt: Infinity, sets: 0, removes: 0, read: new Set(), wrote: [] };
  const tick = () => { s.calls += 1; if (s.calls >= s.dieAt) throw new Error('the store died'); };
  s.api = {
    get length() { tick(); return s.m.size; },
    key: i => { tick(); return [...s.m.keys()][i] ?? null; },
    getItem: k => { tick(); s.read.add(String(k)); return s.m.has(k) ? s.m.get(k) : null; },
    setItem: (k, v) => { tick(); if (s.full) throw new Error('QuotaExceededError'); s.sets += 1; s.wrote.push(String(k)); s.m.set(String(k), String(v)); },
    removeItem: k => { tick(); s.removes += 1; s.wrote.push(String(k)); s.m.delete(String(k)); },
    clear: () => { s.m.clear(); },
  };
  s.reset = () => { s.calls = 0; s.sets = 0; s.removes = 0; s.read = new Set(); s.wrote = []; s.dieAt = Infinity; };
  return s;
}

/* The engines first, while there is no window: an engine that sees one would
   reach for a browser this process does not have. Their loaders are called
   the same way later (noWindow). */
console.log('simSaveKeeper: building a real save of every long game with its own engine...');
let real;
try {
  real = await buildRealSaves({ root: ROOT, tmpDir: path.join(TMP, 'real'), seeds: SEEDS });
} catch (err) {
  console.error(`simSaveKeeper: the fixtures could not be built: ${String(err?.stack || err).split('\n').slice(0, 4).join(' | ')}`);
  process.exit(2);
}
const fleet = real.fleet;
const noWindow = fn => { const w = globalThis.window; delete globalThis.window; try { return fn(); } finally { globalThis.window = w; } };
const accepts = Object.fromEntries(Object.entries(real.accepts).map(([r, f]) => [r, raw => noWindow(() => f(raw))]));
/* Control dropkey: one fixture loses a top level key its writer always writes.
   Only section 0's shape check reads this copy, so only section 0 can go red. */
let shapeFleet = fleet;
if (CONTROL === 'dropkey') {
  const route = '/cfb-dynasty';
  const o = JSON.parse(fleet[route][0]);
  if (!('portal' in o)) { console.error('simSaveKeeper control dropkey: CANNOT RUN. The CFB Dynasty fixture has no top level key portal to drop.'); process.exit(2); }
  delete o.portal;
  shapeFleet = { ...fleet, [route]: [JSON.stringify(o), ...fleet[route].slice(1)] };
}

/* The seam (src/lib/safeStorage.ts) decides what the browser's storage is AS
   IT LOADS. Under node with no window it resolves to "blocked" and the keeper
   returns at once, so every check below would pass by doing nothing. The
   window is therefore set up BEFORE the bundle is imported, and the first
   assertion is that the seam reads it as ok. */
const page = makeStore();
globalThis.window = {
  localStorage: page.api,
  sessionStorage: makeStore().api,
  location: { pathname: '/', replace() {}, assign() {} },
  navigator: {},
};

const keeperBundle = path.join(TMP, 'keeper.bundle.mjs');
await build({
  stdin: {
    contents: `
      export * from './src/lib/saveKeeper';
      export { CONTINUE_SAVES, describeSave } from './src/data/continueSaves';
      export { BROKEN_SAVE_MARK, BACKUPS_KEPT, SET_ASIDE_SEEN_KEY, backupKeysOf, offeredBackup } from './src/lib/brokenSaveRecovery';
      export { getStorageTrouble } from './src/lib/safeStorage';
    `,
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: keeperBundle, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') },
  plugins: [{
    name: 'keeper-control',
    setup(b) {
      b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]saveKeeper\.ts$/ }, args => ({ contents: keeperSrc, loader: 'ts', resolveDir: path.dirname(args.path) }));
    },
  }],
});
const K = await import(pathToFileURL(keeperBundle).href);
const ENTRIES = K.CONTINUE_SAVES;
const byPath = Object.fromEntries(ENTRIES.map(e => [e.path, e]));
const MARK = K.BROKEN_SAVE_MARK;
const backupsIn = (m, e) => [...m.keys()].filter(k => k.startsWith(`${e.saveKey}${MARK}`));

/* ------------------------------------------------------------------ */
section = '0';
console.log('\n0. the fixtures: real saves of all 21 games, and each one is what its game writes');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const topKeys = raw => { const o = JSON.parse(raw); return o && typeof o === 'object' && !Array.isArray(o) ? Object.keys(o) : null; };
{
  const routes = ENTRIES.map(e => e.path);
  const missing = routes.filter(r => !fleet[r] || fleet[r].length !== SEEDS.length);
  check(routes.length >= 21 && missing.length === 0, `${routes.length} long games, ${SEEDS.length} real saves each (${routes.length * SEEDS.length} saves)`,
    `the fleet is short: ${routes.length} games listed, missing or short: ${missing.join(', ') || 'none'}`);
  let largest = ['', 0];
  for (const r of routes) {
    const lens = (fleet[r] || []).map(s => s.length).sort((a, b) => a - b);
    if (!lens.length) continue;
    if (lens[lens.length - 1] > largest[1]) largest = [r, lens[lens.length - 1]];
    const keys = topKeys(fleet[r][0]);
    console.log(`         ${r.padEnd(22)} ${String(lens[0]).padStart(7)} to ${String(lens[lens.length - 1]).padStart(7)} chars, median ${String(lens[lens.length >> 1]).padStart(7)}, ${new Set(fleet[r]).size} distinct, keys: ${keys ? keys.slice(0, 9).join(' ') + (keys.length > 9 ? ` (+${keys.length - 9})` : '') : 'NOT AN OBJECT'}`);
    if (!keys) fail(`${r}: a real save is not a JSON object`);
    if (new Set(fleet[r]).size < 2) fail(`${r}: every seed made the same save, so the put back section could not tell two games apart`);
  }
  console.log(`         largest real save: ${largest[0]} at ${largest[1]} chars`);
}

/* The writer, found by the fact: a .setItem( whose first argument IS the
   game's key (a string, or a constant that resolves to it in that file or in
   the module it is imported from). Read on the TypeScript tree, so a comment
   or a string that merely mentions the key finds nothing. */
const parse = rel => ts.createSourceFile(rel, readLF(rel), ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const walkTree = (node, visit) => { visit(node); ts.forEachChild(node, c => walkTree(c, visit)); };
const unwrap = n => { let c = n; while (c && (ts.isParenthesizedExpression(c) || ts.isAsExpression(c) || ts.isSatisfiesExpression(c) || ts.isNonNullExpression(c))) c = c.expression; return c; };
const constsOf = sf => {
  const out = new Map();
  walkTree(sf, n => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isStringLiteralLike(n.initializer)) out.set(n.name.text, n.initializer.text); });
  return out;
};
/* An engine is imported by many files; its constants are read once. */
const constCache = new Map();
const constsOfFile = rel => { if (!constCache.has(rel)) constCache.set(rel, constsOf(parse(rel))); return constCache.get(rel); };
const resolveModule = (fromRel, spec) => {
  const base = spec.startsWith('@/') ? path.join('src', spec.slice(2)) : spec.startsWith('.') ? path.join(path.dirname(fromRel), spec) : null;
  if (!base) return null;
  for (const ext of ['.ts', '.tsx', '/index.ts']) { const p = (base + ext).replace(/\\/g, '/'); if (fs.existsSync(path.join(ROOT, p))) return p; }
  return null;
};
/** Every string a .setItem( first argument resolves to in this file, with the call's second argument. */
function setItemKeys(rel) {
  const sf = parse(rel);
  const local = constsOf(sf);
  const imported = new Map();
  walkTree(sf, n => {
    if (!ts.isImportDeclaration(n) || !n.importClause?.namedBindings || !ts.isNamedImports(n.importClause.namedBindings)) return;
    const target = resolveModule(rel, n.moduleSpecifier.text);
    if (!target) return;
    const theirs = constsOfFile(target);
    for (const el of n.importClause.namedBindings.elements) {
      const v = theirs.get((el.propertyName ?? el.name).text);
      if (v !== undefined) imported.set(el.name.text, v);
    }
  });
  const out = [];
  walkTree(sf, n => {
    if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression) || n.expression.name.text !== 'setItem' || n.arguments.length < 2) return;
    const a = unwrap(n.arguments[0]);
    const key = ts.isStringLiteralLike(a) ? a.text : ts.isIdentifier(a) ? (local.get(a.text) ?? imported.get(a.text)) : undefined;
    if (key !== undefined) out.push({ key, value: n.arguments[1].getText(sf) });
  });
  return out;
}
/** Every object literal this file hands to JSON.stringify: its direct keys and the keys inside its spreads. */
function stringifiedLiterals(rel) {
  const sf = parse(rel);
  /* A literal declared under a name and stringified by that name (const base = {...}; JSON.stringify(base)).
     A name can be declared more than once in a file, so every such literal is a candidate. */
  const declared = new Map();
  walkTree(sf, n => {
    if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || !n.initializer || !ts.isObjectLiteralExpression(unwrap(n.initializer))) return;
    if (!declared.has(n.name.text)) declared.set(n.name.text, []);
    declared.get(n.name.text).push(unwrap(n.initializer));
  });
  const out = [];
  walkTree(sf, n => {
    if (!ts.isCallExpression(n) || n.expression.getText(sf) !== 'JSON.stringify' || n.arguments.length < 1) return;
    const arg = unwrap(n.arguments[0]);
    const lits = ts.isObjectLiteralExpression(arg) ? [arg] : ts.isIdentifier(arg) ? (declared.get(arg.text) ?? []) : [];
    for (const lit of lits) {
      const direct = []; const spread = [];
      for (const p of lit.properties) {
        if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) direct.push(p.name.getText(sf));
        else if (ts.isSpreadAssignment(p)) walkTree(p.expression, c => { if (ts.isObjectLiteralExpression(c)) for (const q of c.properties) if (q.name) spread.push(q.name.getText(sf)); });
      }
      out.push({ direct, spread });
    }
  });
  return out;
}
{
  const srcFiles = [];
  const scan = dir => { for (const f of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) { const rel = `${dir}/${f.name}`; if (f.isDirectory()) scan(rel); else if (/\.tsx?$/.test(f.name) && !/\.test\.tsx?$/.test(f.name) && !rel.startsWith('src/test/') && stripComments(readLF(rel)).includes('.setItem(')) srcFiles.push(rel); } };
  scan('src');
  const writersByKey = new Map();
  for (const rel of srcFiles) for (const w of setItemKeys(rel)) { if (!writersByKey.has(w.key)) writersByKey.set(w.key, []); writersByKey.get(w.key).push({ rel, value: w.value }); }
  let held = 0;
  for (const e of ENTRIES) {
    const row = WRITERS[e.path];
    if (!row) { fail(`${e.path}: no row in WRITERS (scripts/lib/realSaves.mjs), so nothing says how its save is written`); continue; }
    const found = writersByKey.get(e.saveKey) ?? [];
    const here = found.filter(w => w.rel === row.file);
    if (row.indirect) {
      const code = stripComments(readLF(row.file));
      const gone = row.indirect.filter(a => !code.includes(a));
      if (gone.length) { fail(`${e.path}: its writer reaches the key through a binding, and the anchor(s) that show it are gone from ${row.file}: ${gone.join(' | ')}`); continue; }
    } else if (here.length === 0) {
      fail(`${e.path}: no .setItem( in ${row.file} names the key ${e.saveKey} (writers found for that key: ${found.map(w => w.rel).join(', ') || 'none anywhere in src'})`);
      continue;
    }
    if (row.kind === 'serializer' && !here.some(w => w.value.includes(`${row.fn}(`))) { fail(`${e.path}: ${row.file} writes ${e.saveKey} but not with ${row.fn}(...), so the fixture is not the writer's own output`); continue; }
    if (row.kind === 'whole' && !here.some(w => /^JSON\.stringify\(\s*[A-Za-z_$][\w$]*\s*\)$/.test(w.value))) { fail(`${e.path}: ${row.file} no longer writes ${e.saveKey} as JSON.stringify of one state object`); continue; }
    if (row.kind === 'literal') {
      const lits = stringifiedLiterals(row.file);
      const unset = Object.keys(row.unset ?? {});
      const bad = [];
      for (const raw of shapeFleet[e.path] ?? []) {
        const keys = topKeys(raw) ?? [];
        const fits = lits.some(l => keys.every(k => l.direct.includes(k) || l.spread.includes(k)) && l.direct.every(k => keys.includes(k) || unset.includes(k)));
        if (!fits) bad.push(keys.join(' '));
      }
      if (bad.length) { fail(`${e.path}: a fixture's top level keys (${bad[0]}) are not the keys of any literal ${row.file} stringifies (${lits.map(l => l.direct.join(' ')).join(' | ') || 'none found'})`); continue; }
      /* A wrapper that grew its own version number would be invisible to section 1's table. */
      const versioned = lits.flatMap(l => [...l.direct, ...l.spread]).filter(k => ['v', 'version', 'saveVersion'].includes(k));
      if (versioned.length) { fail(`${e.path}: the literal ${row.file} stringifies has a top level ${versioned[0]}, which SAVE_VERSIONS does not know`); continue; }
    }
    held += 1;
  }
  check(held === ENTRIES.length, `${held} of ${ENTRIES.length} games: the writer is found by its setItem (or its named binding) and the fixture is shaped as it writes`);
  let accepted = 0;
  const refused = [];
  for (const r of PURE_LOADERS) for (const raw of fleet[r] ?? []) { if (accepts[r](raw)) accepted += 1; else refused.push(r); }
  check(refused.length === 0 && accepted === PURE_LOADERS.length * SEEDS.length, `${accepted} fixtures over ${PURE_LOADERS.length} games are accepted by the game's own loader`,
    `the game's own loader refuses its fixture on: ${[...new Set(refused)].join(', ')} (${accepted} accepted)`);
}

/* ------------------------------------------------------------------ */
section = '1';
console.log('\n1. the version table: what each save really holds, and what its game does with another number');
const V = K.SAVE_VERSIONS;
/** The same save with the number at a path changed (declared as altered: it is parsed and written again). */
const withVersion = (raw, at, n) => {
  const o = JSON.parse(raw);
  let cur = o;
  for (let i = 0; i < at.length - 1; i += 1) cur = cur[at[i]];
  cur[at[at.length - 1]] = n;
  return JSON.stringify(o);
};
{
  const rows = Object.keys(V);
  check(rows.length > 0 && rows.every(r => byPath[r]), `all ${rows.length} rows of SAVE_VERSIONS are long games on the list`, `a row of SAVE_VERSIONS is not a path on CONTINUE_SAVES: ${rows.filter(r => !byPath[r]).join(', ')}`);
  for (const r of rows) {
    const row = V[r];
    const got = (fleet[r] ?? []).map(raw => K.versionIn(raw, row.at));
    check(got.length === SEEDS.length && got.every(n => n === row.current), `${r}: every real save holds ${row.current} at ${row.at.join('.')}`,
      `${r}: real saves hold ${[...new Set(got)].join(', ') || 'nothing'} at ${row.at.join('.')}, the table says ${row.current}`);
  }
  const NAMES = ['v', 'version', 'saveVersion'];
  const clean = [];
  for (const e of ENTRIES) {
    if (V[e.path]) continue;
    const hits = new Set();
    for (const raw of fleet[e.path] ?? []) {
      const o = JSON.parse(raw);
      const look = (obj, where) => { for (const n of NAMES) if (Object.prototype.hasOwnProperty.call(obj, n) && Number.isInteger(obj[n])) hits.add(`${where}${n}=${obj[n]}`); };
      look(o, '');
      for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object' && !Array.isArray(v)) look(v, `${k}.`);
    }
    if (hits.size) fail(`${e.path}: its real save holds a version number (${[...hits].join(', ')}) and SAVE_VERSIONS has no row for it`);
    else clean.push(e.path);
  }
  check(clean.length === ENTRIES.length - rows.length, `the other ${clean.length} games hold no whole number named v, version or saveVersion at the top level or one level down`);
  for (const r of rows) {
    const row = V[r];
    const load = accepts[r];
    if (!load) { console.log(`         ${r}: no pure loader is exported, so "${row.other}" is held by reading its engine only`); continue; }
    const same = load(withVersion(fleet[r][0], row.at, row.current));
    const down = load(withVersion(fleet[r][0], row.at, row.current - 1));
    const up = load(withVersion(fleet[r][0], row.at, row.current + 1));
    const wantDown = row.other === 'ignores' || (row.other === 'migrates' && row.current - 1 >= row.oldest);
    const wantUp = row.other === 'ignores';
    check(same === true && down === wantDown && up === wantUp,
      `${r}: its own loader ${down ? 'opens' : 'refuses'} a real save one version down and ${up ? 'opens' : 'refuses'} one up, as the row says (${row.other}, oldest ${row.oldest})`,
      `${r}: the row says ${row.other} with oldest ${row.oldest}, but its loader answered: written again at current ${same}, one down ${down}, one up ${up}`);
  }
}

/* ------------------------------------------------------------------ */
section = '2';
console.log('\n2. an ordinary boot writes nothing');
const PENDING = K.PENDING_RESTORE_KEY;
const acting = ENTRIES.filter(e => V[e.path] && V[e.path].other !== 'ignores');
{
  const trouble = K.getStorageTrouble();
  check(trouble === null, 'the seam reads the page storage as ok, so the keeper really runs', `the seam answers "${trouble}": the keeper returns at once and every check below would pass by doing nothing`);
  page.m = new Map(ENTRIES.map(e => [e.saveKey, fleet[e.path][0]]));
  page.m.set('cookie-consent', 'accepted');
  const before = new Map(page.m);
  page.reset();
  K.runSaveKeeper();
  if (CONTROL === 'onebyte') {
    const k = ENTRIES[0].saveKey;
    const v = page.m.get(k);
    page.m.set(k, `${v.slice(0, 40)}${v[40] === 'x' ? 'y' : 'x'}${v.slice(41)}`);
  }
  const changed = [...before].filter(([k, v]) => page.m.get(k) !== v).map(([k]) => k);
  const extra = [...page.m.keys()].filter(k => !before.has(k));
  check(page.sets === 0 && page.removes === 0, `zero writes and zero removes in ${page.calls} storage calls`, `the boot wrote or removed: ${page.wrote.join(', ')}`);
  check(changed.length === 0 && extra.length === 0, `all ${before.size} stored values are byte equal before and after (one fixture of every game; sha256 of the whole store ${sha([...page.m].sort().join('\u0000'))})`,
    `not byte equal after a boot. Changed: ${changed.join(', ') || 'none'}. New keys: ${extra.join(', ') || 'none'}`);
  const want = [PENDING, ...acting.map(e => e.saveKey)].sort();
  const got = [...page.read].sort();
  check(JSON.stringify(got) === JSON.stringify(want), `the keys read are exactly the journal and the ${acting.length} games that act on a version (${got.length} keys)`, `read ${got.join(', ')}; expected exactly ${want.join(', ')}`);
}

/* ------------------------------------------------------------------ */
section = '3';
console.log('\n3. the put back on real saves, and every crash point');
const T0 = new Date('2026-10-10T08:00:00Z');
const at = ms => new Date(T0.getTime() + ms);
{
  let whole = 0; let points = 0; let applied = 0; let untouched = 0; let refusedFull = 0;
  const broken = [];
  for (const e of ENTRIES) {
    const [A, B] = fleet[e.path];
    const src = `${e.saveKey}${MARK}2026-01-02T03-04-05`;
    const other = ENTRIES.find(x => x.path !== e.path);
    const bystander = fleet[other.path][2];
    const seed = () => new Map([[e.saveKey, B], [src, A], [other.saveKey, bystander]]);

    /* The whole thing through the real seam: restoreNow stages, the boot applies. */
    page.m = seed();
    page.reset();
    const staged = K.restoreNow(e, src);
    const untouchedByStage = page.m.get(e.saveKey) === B && page.m.has(PENDING);
    K.runSaveKeeper();
    const out = K.takeOutcome(e.path);
    const copies = backupsIn(page.m, e).filter(k => page.m.get(k) === B);
    const good = staged.ok === true && untouchedByStage && page.m.get(e.saveKey) === A && page.m.get(src) === A && copies.length === 1
      && backupsIn(page.m, e).length === 2 && !page.m.has(PENDING) && !!out && out.ok === true && out.kept === true && page.m.get(other.saveKey) === bystander;
    if (good) whole += 1;
    else broken.push(`${e.path}: staged ${JSON.stringify(staged)}, key is ${page.m.get(e.saveKey) === A ? 'A' : page.m.get(e.saveKey) === B ? 'B' : 'neither'}, copies of B ${copies.length}, backups ${backupsIn(page.m, e).length}, journal left ${page.m.has(PENDING)}, outcome ${JSON.stringify(out)}`);

    /* A full store (writes throw, removes work): refused, and nothing but the journal's own absence differs. */
    const full = makeStore(seed());
    K.stageRestore(e, src, full.api, T0);
    full.full = true;
    const fullOut = K.applyPending(full.api, at(1000));
    if (fullOut && fullOut.ok === false && fullOut.why === 'no-room' && JSON.stringify([...full.m].sort()) === JSON.stringify([...seed()].sort())) refusedFull += 1;
    else broken.push(`${e.path}: a full store answered ${JSON.stringify(fullOut)} and left ${[...full.m.keys()].sort().join(', ')}`);

    /* THE LOOP: the store dies at call N (that call and every later one throw), then a healthy store boots over the same map. */
    const count = makeStore(seed());
    K.stageRestore(e, src, count.api, T0);
    K.applyPending(count.api, at(1000));
    const total = count.calls;
    for (let n = 1; n <= total + 1; n += 1) {
      const dying = makeStore(seed());
      dying.dieAt = n;
      const answered = K.stageRestore(e, src, dying.api, T0).ok;
      const landed = dying.m.has(PENDING);
      if (answered) K.applyPending(dying.api, at(1000));
      const outcome = K.applyPending(makeStore(dying.m).api, at(3000));
      const m = dying.m;
      const held = m.get(e.saveKey);
      const texts = backupsIn(m, e).map(k => m.get(k));
      const wrong = [];
      if (m.has(PENDING)) wrong.push('a journal is left');
      if (held !== A && held !== B) wrong.push('the key holds neither save');
      if (![...m.values()].includes(B)) wrong.push('the save he had is in no key');
      if (![...m.values()].includes(A)) wrong.push('the save asked for is in no key');
      if (new Set(texts).size !== texts.length) wrong.push('two backups hold the same bytes');
      if (m.get(other.saveKey) !== bystander) wrong.push('another game\'s save moved');
      if (outcome && outcome.ok !== (held === A)) wrong.push('the outcome does not say what the key holds');
      if (landed && held !== A) wrong.push('LIVENESS: the journal landed and the put back never happened');
      if (!landed && JSON.stringify([...m].sort()) !== JSON.stringify([...seed()].sort())) wrong.push('nothing was staged, yet the store changed');
      points += 1;
      if (landed) applied += 1; else untouched += 1;
      if (wrong.length) { broken.push(`${e.path}, the store dies at call ${n} of ${total}: ${wrong.join('; ')}`); break; }
    }
  }
  for (const b of broken.slice(0, 8)) fail(b);
  if (broken.length > 8) fail(`and ${broken.length - 8} more`);
  check(whole === ENTRIES.length, `${whole} of ${ENTRIES.length} games: staged by restoreNow (key untouched), applied by the boot, the save he had kept aside once, the source backup still there, no journal left`);
  check(refusedFull === ENTRIES.length, `${refusedFull} of ${ENTRIES.length} games: a full store refuses the put back and the whole store is as it was`);
  check(broken.length === 0 && points > ENTRIES.length * 8 && untouched > 0 && applied > untouched,
    `${points} crash points over ${ENTRIES.length} games: ${applied} ended applied (the journal had landed), ${untouched} untouched (it had not), and at none of them was a save lost, a key emptied or a copy stacked twice`);
}

/* ------------------------------------------------------------------ */
section = '4';
console.log('\n4. the copy before a version step, on real saves one version down (declared as altered)');
{
  let held = 0;
  for (const e of acting) {
    const row = V[e.path];
    const lowered = withVersion(fleet[e.path][0], row.at, row.current - 1);
    const three = [['2025-09-01T09-00-00', fleet[e.path][1]], ['2025-09-02T09-00-00', fleet[e.path][2]], ['2025-09-03T09-00-00', fleet[e.path][3]]].map(([s, v]) => [`${e.saveKey}${MARK}${s}`, v]);
    page.m = new Map([[e.saveKey, lowered], ...three]);
    page.reset();
    K.runSaveKeeper();
    const all = backupsIn(page.m, e);
    const copies = all.filter(k => page.m.get(k) === lowered);
    const olderKept = three.every(([k, v]) => page.m.get(k) === v);
    const removes = page.removes;
    const offered = K.offeredBackup(e, page.api);
    page.reset();
    K.runSaveKeeper();
    const secondQuiet = page.sets === 0 && page.removes === 0;
    /* Round 1219 review: the quiet copy is marked answered and is the save at
       the key, so the card passes over it and still offers the newest of the
       three older ones the player never answered. It used to offer nothing. */
    const newestOlder = three[2][0];
    const good = copies.length === 1 && all.length === 4 && olderKept && removes === 0 && page.m.get(e.saveKey) === lowered && secondQuiet && offered === newestOlder;
    if (good) held += 1;
    else fail(`${e.path}: copies of the old save ${copies.length} (want 1), backups ${all.length} (want 4), the three older ones kept ${olderKept}, removes ${removes}, a second boot quiet ${secondQuiet}, the card offers ${offered ?? 'nothing'} (want ${newestOlder})`);
  }
  check(held === acting.length, `${held} of ${acting.length} games that act on a version: one byte equal copy, the three older backups untouched (nothing is pruned without a press), a second boot writes nothing, and the card still offers the newest older backup the player never answered`);
  const ignoring = ENTRIES.filter(e => V[e.path] && V[e.path].other === 'ignores');
  page.m = new Map(ignoring.map(e => [e.saveKey, withVersion(fleet[e.path][0], V[e.path].at, V[e.path].current - 1)]));
  page.reset();
  K.runSaveKeeper();
  check(ignoring.length === 4 && page.sets === 0 && page.removes === 0 && ignoring.every(e => !page.read.has(e.saveKey)),
    `the ${ignoring.length} games that ignore their version (${ignoring.map(e => e.path).join(', ')}) get no copy and are not even read`);
}

/* ------------------------------------------------------------------ */
section = '5';
console.log('\n5. what the boot pass costs (printed, not asserted)');
{
  const time = runs => { const ts = []; for (let i = 0; i < runs; i += 1) { const t = performance.now(); K.runSaveKeeper(); ts.push(performance.now() - t); } ts.sort((a, b) => a - b); return ts; };
  const biggest = r => [...fleet[r]].sort((a, b) => b.length - a.length)[0];
  page.m = new Map(ENTRIES.map(e => [e.saveKey, biggest(e.path)]));
  page.reset();
  time(50);
  const heldAll = time(300);
  const chars = acting.reduce((n, e) => n + page.m.get(e.saveKey).length, 0);
  const writes = page.sets + page.removes;
  page.m = new Map();
  time(50);
  const empty = time(300);
  const ms = x => x.toFixed(3);
  console.log(`         all 21 saves held (the ${acting.length} that are parsed total ${chars} chars): median ${ms(heldAll[150])} ms, 95th ${ms(heldAll[285])} ms a pass`);
  console.log(`         an empty store:                                                   median ${ms(empty[150])} ms, 95th ${ms(empty[285])} ms a pass`);
  if (writes !== 0) fail(`the timed passes wrote ${writes} time(s); an ordinary boot must write nothing`);
}

/* ------------------------------------------------------------------ */
const red = [...failed].sort();
console.log('');
const OWN = { dropkey: '0', versiontable: '1', norow: '1', onebyte: '2', bootwrite: '2', noaside: '3', journalfirst: '3', pileup: '4' };
/* A lie in the table or a write on every boot is also seen by the sections that boot the keeper. */
const ALSO = { versiontable: ['2', '3', '4', '5'], bootwrite: ['3', '4', '5'], norow: ['4'] };
if (CONTROL) {
  const stray = red.filter(s => s !== OWN[CONTROL] && !(ALSO[CONTROL] ?? []).includes(s));
  if (failed.has(OWN[CONTROL]) && stray.length === 0) {
    console.log(`simSaveKeeper control ${CONTROL}: FIRED. Section ${OWN[CONTROL]} is red${red.length > 1 ? ` (and ${red.filter(s => s !== OWN[CONTROL]).join(', ')}, which the same change reaches)` : ''}.`);
    process.exit(1);
  }
  console.log(`simSaveKeeper control ${CONTROL}: DID NOT FIRE. Red sections: ${red.join(', ') || 'none'}; section ${OWN[CONTROL]} had to be red${stray.length ? ` and ${stray.join(', ')} had to stay green` : ''}.`);
  process.exit(2);
}
if (red.length) { console.log(`simSaveKeeper: RED in section(s) ${red.join(', ')}.`); process.exit(1); }
console.log('simSaveKeeper: all green. The keeper holds on real saves of all 21 long games.');

