/**
 * Round 531 harness: the four front office cap lines have sources, and the
 * screens say so.
 *
 * Before this round each GM engine priced every contract against a bare
 * literal with no publisher and no read date, and two of the four were
 * wrong (NFL 260 against a published 301.2, NBA 155 against a published
 * 164.961). src/lib/leagueCaps.ts now holds the four figures, the day they
 * were read and two sources each, the engines import from it, and every
 * roster screen prints the read date under the cap. The evidence behind the
 * pinned numbers is docs/audits/league-caps-2026-09-11.md.
 *
 * What is checked:
 *
 *   1. THE VALUES AND THE DATE. The figures exported by leagueCaps.ts equal
 *      the ones in the evidence file, typed here on purpose (the
 *      simSilverwareSort shape: the truth in the harness, the file must
 *      agree). The read date is a real ISO day, not in the future, and the
 *      label on screen is that day's month and year. Each of the four base
 *      figures carries at least two https sources in the comment above it.
 *   2. THE ENGINES IMPORT, THEY DO NOT RETYPE. With comments stripped, each
 *      engine's exported base (SALARY_CAP_BASE and its three siblings) is
 *      assigned the named export from './leagueCaps' and never a numeric
 *      literal, and at runtime the engine's export equals the figure.
 *   3. THE SCREENS SAY THE DATE. Each of the four boards is rendered through
 *      react-dom/server inside a MemoryRouter (the pick screen, which proves
 *      the board renders with the new import) and then mounted for real in
 *      jsdom with a saved league at the hub, the Roster box is opened, and
 *      the line "Cap figures as of <label>" has to sit directly under the
 *      line that prints the cap. A server render alone cannot reach that
 *      screen: the boards restore their save inside an effect, and
 *      renderToStaticMarkup never runs effects, so the mounted render is the
 *      one that finds the line.
 *
 * Negative control (house rule: prove the checks can fail). It refuses to
 * run if its rewrite found nothing to rewrite, and it never touches disk: the
 * rewritten engine is served to the bundler from memory.
 *   CAPS_CONTROL=retype   the NFL engine's cap goes back to the literal 260.
 *                         Sections 2 and 3 must go red (the source check, the
 *                         runtime value, and the NFL screen printing $260M).
 *
 * Run: node scripts/simLeagueCaps.mjs
 */
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.CAPS_CONTROL ?? '';
const require = createRequire(import.meta.url);

/* The truth, typed from docs/audits/league-caps-2026-09-11.md. */
const PINNED = {
  CAPS_AS_OF: '2026-09-11',
  CAPS_AS_OF_LABEL: 'September 2026',
  NFL_SALARY_CAP_2026: 301.2,
  NBA_SALARY_CAP_2026_27: 164.961,
  NBA_TAX_LEVEL_2026_27: 200.428,
  NHL_UPPER_LIMIT_2026_27: 104,
  NHL_UPPER_LIMIT_2027_28: 113.5,
  MLB_CBT_THRESHOLD_2026: 244,
};

const ENGINES = [
  { sport: 'NFL', lib: 'src/lib/frontOffice.ts', base: 'SALARY_CAP_BASE', figure: 'NFL_SALARY_CAP_2026',
    board: 'src/components/front-office/FrontOfficeBoard.tsx', saveKey: 'front-office-save-v1', init: 'initLeague', pick: 'Take over a front office' },
  { sport: 'NBA', lib: 'src/lib/nbaFrontOffice.ts', base: 'NBA_CAP_BASE', figure: 'NBA_SALARY_CAP_2026_27',
    board: 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx', saveKey: 'nba-front-office-save-v1', init: 'initNbaLeague', pick: 'Take over a front office' },
  { sport: 'NHL', lib: 'src/lib/nhlFrontOffice.ts', base: 'NHL_CAP_BASE', figure: 'NHL_UPPER_LIMIT_2026_27',
    board: 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', saveKey: 'nhl-front-office-save-v1', init: 'initNhlLeague', pick: 'Take over an NHL front office' },
  { sport: 'MLB', lib: 'src/lib/mlbFrontOffice.ts', base: 'MLB_TAX_BASE', figure: 'MLB_CBT_THRESHOLD_2026',
    board: 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', saveKey: 'mlb-front-office-save-v1', init: 'initMlbLeague', pick: 'Take over a baseball front office' },
];

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = (cond, m) => { if (!cond) fail(m); };

/* ---- sources, with the control applied in memory ---- */
const sources = Object.fromEntries(ENGINES.map(e => [e.lib, fs.readFileSync(path.join(ROOT, e.lib), 'utf8')]));
const capsSrc = fs.readFileSync(path.join(ROOT, 'src/lib/leagueCaps.ts'), 'utf8');

if (CONTROL === 'retype') {
  const lib = 'src/lib/frontOffice.ts';
  const old = 'export const SALARY_CAP_BASE = NFL_SALARY_CAP_2026;';
  if (!sources[lib].includes(old)) throw new Error(`control changed nothing: ${lib} does not contain "${old}"`);
  sources[lib] = sources[lib].replace(old, 'export const SALARY_CAP_BASE = 260;');
  console.log('NEGATIVE CONTROL ON: the NFL engine carries the literal 260 again; sections 2 and 3 must go red');
} else if (CONTROL) {
  throw new Error(`unknown CAPS_CONTROL "${CONTROL}"`);
}

/* Code, not prose: a guard that reads source must read the code. Block
   comments go, and line comments that start a line or follow whitespace go,
   which leaves a URL inside a string alone. */
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[ \t])\/\/.*$/gm, '$1');

/* ---- bundle: leagueCaps, the four engines, the four boards, React ---- */
const TMP = os.tmpdir();
const ENTRY = path.join(TMP, `leagueCaps.${process.pid}.entry.mjs`);
const BUNDLE = path.join(TMP, `leagueCaps.${process.pid}.bundle.cjs`);
/* Resolved from this file, not from ROOT/node_modules: a worktree resolves
   its packages by walking up to the main tree, and the entry sits in the
   temp directory where a bare name would resolve to nothing. The boards
   import the bare names from src, which resolves to the same files, so the
   bundle holds one React. */
const pkg = name => require.resolve(name).replaceAll('\\', '/');
fs.writeFileSync(ENTRY, `
export * as caps from '${ROOT_URL}/src/lib/leagueCaps.ts';
${ENGINES.map(e => `export * as ${e.sport} from '${ROOT_URL}/${e.lib}';`).join('\n')}
${ENGINES.map(e => `export { default as ${e.sport}Board } from '${ROOT_URL}/${e.board}';`).join('\n')}
export { default as React, act } from '${pkg('react')}';
export { renderToStaticMarkup } from '${pkg('react-dom/server.node')}';
export { createRoot } from '${pkg('react-dom/client')}';
export { MemoryRouter } from '${pkg('react-router-dom')}';
`);

/* The same four modules the season close test mocks: completion tracking
   reads the auth context and writes to the database, recordActivity inserts
   a row, the share buttons draw a canvas, the reveal scroll calls
   scrollIntoView which jsdom does not have. None is under test. */
const STUBS = {
  '@/hooks/useGameCompletion': 'export const useGameCompletion = () => undefined;',
  '@/lib/completions': 'export const recordActivity = () => undefined;',
  '@/components/game/ShareButtons': 'export default function ShareButtons() { return null; }',
  '@/hooks/useRevealScroll': 'export const useRevealScroll = () => ({ current: null });',
};
const stubPlugin = {
  name: 'dukb-stubs',
  setup(b) {
    b.onResolve({ filter: /^@\/(hooks\/useGameCompletion|lib\/completions|components\/game\/ShareButtons|hooks\/useRevealScroll)$/ },
      args => ({ path: args.path, namespace: 'dukb-stub' }));
    b.onLoad({ filter: /.*/, namespace: 'dukb-stub' }, args => ({ contents: STUBS[args.path], loader: 'js' }));
  },
};
/* The engines are served from memory so the control never touches disk. */
const libPaths = new Map(ENGINES.map(e => [path.resolve(ROOT, e.lib), e.lib]));
const memoryPlugin = {
  name: 'dukb-memory-engines',
  setup(b) {
    b.onLoad({ filter: /(frontOffice|nbaFrontOffice|nhlFrontOffice|mlbFrontOffice)\.ts$/ }, args => {
      const key = libPaths.get(path.resolve(args.path));
      if (!key) return null;
      return { contents: sources[key], loader: 'ts', resolveDir: path.dirname(args.path) };
    });
  },
};
await build({
  entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  plugins: [stubPlugin, memoryPlugin],
});

/* jsdom has to exist before react-dom loads, it decides at load whether a
   document is there. */
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
const win = dom.window;
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MouseEvent', 'getComputedStyle', 'localStorage']) {
  /* defineProperty, not assignment: recent Node versions expose navigator
     (and can expose localStorage) as a getter on the global. */
  Object.defineProperty(globalThis, k, { value: win[k], configurable: true, writable: true });
}
globalThis.requestAnimationFrame = cb => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = id => clearTimeout(id);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mod = require(BUNDLE);
const { caps, React, act, renderToStaticMarkup, createRoot, MemoryRouter } = mod;

/* ---------- 1. the values and the date ---------- */
console.log('1) The values and the date');
for (const [name, want] of Object.entries(PINNED)) {
  ok(caps[name] === want, `leagueCaps.${name} is ${caps[name]}, the evidence file says ${want}`);
}
ok(/^\d{4}-\d{2}-\d{2}$/.test(caps.CAPS_AS_OF), `CAPS_AS_OF "${caps.CAPS_AS_OF}" is not an ISO day`);
const asOf = new Date(caps.CAPS_AS_OF + 'T00:00:00Z');
ok(!Number.isNaN(asOf.getTime()) && asOf.getTime() <= Date.now(), `CAPS_AS_OF ${caps.CAPS_AS_OF} is in the future`);
const monthYear = asOf.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }) + ' ' + asOf.getUTCFullYear();
ok(caps.CAPS_AS_OF_LABEL === monthYear, `CAPS_AS_OF_LABEL "${caps.CAPS_AS_OF_LABEL}" is not the month of ${caps.CAPS_AS_OF} (${monthYear})`);
ok(caps.capNote() === `Cap figures as of ${caps.CAPS_AS_OF_LABEL}`, `capNote() reads "${caps.capNote()}"`);
/* Two sources per base figure: the comment block right above each export. */
for (const e of ENGINES) {
  const at = capsSrc.indexOf(`export const ${e.figure} =`);
  ok(at > 0, `leagueCaps.ts does not export ${e.figure}`);
  const before = capsSrc.slice(0, at);
  const blockStart = before.lastIndexOf('/**');
  const block = before.slice(blockStart);
  const urls = (block.match(/https:\/\/[^\s*]+/g) ?? []);
  const hosts = new Set(urls.map(u => new URL(u).hostname.replace(/^www\./, '')));
  ok(urls.length >= 2 && hosts.size >= 2, `${e.figure} names ${urls.length} source URL(s) on ${hosts.size} host(s); two different publishers are required`);
}
console.log(`   ${Object.keys(PINNED).length} pinned values, read ${caps.CAPS_AS_OF}, shown as "${caps.CAPS_AS_OF_LABEL}"`);

/* ---------- 2. the engines import, they do not retype ---------- */
console.log('2) The engines import, they do not retype');
for (const e of ENGINES) {
  const code = stripComments(sources[e.lib]);
  const literal = new RegExp(`export const ${e.base}\\s*=\\s*[\\d.]+`);
  ok(!literal.test(code), `${e.lib}: ${e.base} is a numeric literal again`);
  const named = new RegExp(`export const ${e.base}\\s*=\\s*${e.figure}\\s*;`);
  ok(named.test(code), `${e.lib}: ${e.base} is not assigned ${e.figure}`);
  const imported = new RegExp(`import\\s*\\{[^}]*\\b${e.figure}\\b[^}]*\\}\\s*from\\s*'\\./leagueCaps'`);
  ok(imported.test(code), `${e.lib}: ${e.figure} is not imported from ./leagueCaps`);
  ok(mod[e.sport][e.base] === PINNED[e.figure], `${e.lib}: ${e.base} is ${mod[e.sport][e.base]} at runtime, leagueCaps says ${PINNED[e.figure]}`);
}
console.log(`   ${ENGINES.length} engines, each base assigned its named figure from ./leagueCaps`);

/* ---------- 3. the screens say the date ---------- */
console.log('3) The screens say the date');
const rng = (() => { let s = 531; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
const wanted = `Cap figures as of ${PINNED.CAPS_AS_OF_LABEL}`;
for (const e of ENGINES) {
  const Board = mod[`${e.sport}Board`];
  const el = React.createElement(MemoryRouter, null, React.createElement(Board));

  /* the server render: the pick screen, so the board renders at all under
     the router with the new import */
  win.localStorage.clear();
  let ssr = '';
  /* MemoryRouter warns that useLayoutEffect does nothing on the server. It
     is right and it does not matter here, the pick screen has no layout
     effect of its own. Anything else console.error says is kept. */
  const realError = console.error;
  console.error = (...args) => { if (!String(args[0]).includes('useLayoutEffect does nothing on the server')) realError(...args); };
  try { ssr = renderToStaticMarkup(el); } catch (err) { fail(`${e.sport}: server render threw: ${err.message}`); } finally { console.error = realError; }
  ok(ssr.includes(e.pick), `${e.sport}: server render did not reach the pick screen ("${e.pick}")`);

  /* the mounted render: a saved league at the hub, then the Roster box */
  const league = mod[e.sport][e.init](rng);
  const myTeam = Object.keys(league.teams)[0];
  win.localStorage.setItem(e.saveKey, JSON.stringify({ league, myTeam, phase: 'hub', titles: 0, seasonsPlayed: 0 }));
  const host = win.document.getElementById('root');
  const root = createRoot(host);
  try {
    act(() => { root.render(el); });
    const tiles = [...host.querySelectorAll('*')].filter(n => n.children.length === 0 && n.textContent.trim() === 'Roster');
    ok(tiles.length > 0, `${e.sport}: no Roster box on the hub (phase did not restore?)`);
    if (tiles.length > 0) act(() => { tiles[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true })); });
    const note = [...host.querySelectorAll('p')].find(p => p.textContent === wanted);
    ok(note, `${e.sport}: the roster screen does not print "${wanted}"`);
    if (note) {
      const above = note.previousElementSibling?.textContent ?? '';
      const capText = `$${league.cap}M`;
      ok(above.includes(capText), `${e.sport}: the line above the date reads "${above}", expected it to print the cap ${capText}`);
      ok(league.cap === PINNED[e.figure], `${e.sport}: the saved league's cap is ${league.cap}, leagueCaps says ${PINNED[e.figure]}`);
    }
  } finally {
    act(() => { root.unmount(); });
    win.localStorage.clear();
  }
}
console.log(`   ${ENGINES.length} boards rendered on the server and mounted in jsdom, the date line under the cap on each`);

fs.rmSync(ENTRY, { force: true });
fs.rmSync(BUNDLE, { force: true });

if (failures) {
  console.error(`\nsimLeagueCaps: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimLeagueCaps: green. Four caps, two sources each, read on one day, and every screen says which day.');
