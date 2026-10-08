/* Round 1107: the career moment kit (src/components/career-moments), held at
   source level and in Chromium. Needs no build: the kit is bundled in memory
   with esbuild, the stylesheet is the real src/index.css through Tailwind
   and postcss (so the site's blanket reduced motion rule is in the rig), and
   Chromium comes from scripts/lib/playwrightLoader.mjs. Nothing is written
   to the tree or to a shared cache, and nothing here is statistical: the rig
   draws no random number, so the only tuned number is K7's height bound.

   HOW TO READ A RUN
     clean:    closing line "simCareerMoments: N checks, 0 failed", exit 0.
     control:  CAREER_MOMENTS_CONTROL=<name>. A control rewrites a COPY of one
               source file (the tree is never written) and refuses to run if
               its rewrite changed nothing. The closing line names the checks
               that went red. Exit 0 ONLY when they are exactly the control's
               own; anything else (nothing red, or a neighbour red) is exit 1.
               So in a list of control runs every line should read exit 0.

   SECTION 1, SOURCE (comments are dropped by the TypeScript printer first)
     S1 imports     every import in the kit folder is react, a sibling in the
                    folder, the shared cup, the celebration layer or cn. An
                    allow list, so a new import fails by default.
     S2 no clock    no Math.random, Date, storage, timer or animation frame
                    anywhere in the folder's code.
     S3 flat colour the scene's colour never sits inside a gradient and no
                    repeating pattern exists in the folder.
     S6 seams       careerMoments.ts imports only types (bar react and the
                    kit's hook file), and the two soccer re-exporters import
                    the kit by FILE, never through its index.

   CONTROLS (the check each must turn red, and nothing else)
     import       CareerMomentCard.tsx also imports the soccer engine     S1
     clock        useCareerMoment.ts reads Date.now()                      S2
     stripe       the bar is painted with a repeating gradient             S3
     enginevalue  careerMoments.ts imports a VALUE from the soccer engine  S6
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import ts from 'typescript';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = 'src/components/career-moments';
const HOOK = `${KIT}/useCareerMoment.ts`;
const CARD = `${KIT}/CareerMomentCard.tsx`;
const STYLES = `${KIT}/CareerMomentStyles.tsx`;
const SOCCER_KEYS = 'src/components/soccer-career/careerMoments.ts';
const SOCCER_FX = 'src/components/soccer-career/CareerFx.tsx';

/* Each control and the checks it must turn red. */
const CONTROLS = {
  import: ['S1'],
  clock: ['S2'],
  stripe: ['S3'],
  enginevalue: ['S6'],
};
const CONTROL = process.env.CAREER_MOMENTS_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`simCareerMoments: unknown control "${CONTROL}". Known: ${Object.keys(CONTROLS).join(', ')}`);
  process.exit(2);
}

let checks = 0;
const red = new Map();
function check(id, cond, message) {
  checks += 1;
  if (cond) return true;
  if (!red.has(id)) red.set(id, []);
  red.get(id).push(message);
  console.error(`  FAIL ${id}: ${message}`);
  return false;
}
function abort(message) {
  console.error(`simCareerMoments: ${message}`);
  process.exit(2);
}

/* A control's copies: repo path -> rewritten text. The scan and the bundle
   both read through here, so the tree itself is never touched. */
const swapped = new Map();
const abs = rel => path.join(ROOT, rel);
const raw = rel => fs.readFileSync(abs(rel), 'utf8');
const read = rel => swapped.get(rel) ?? raw(rel);
/** Rewrite `from` (which must be in the file exactly `times` times) in a copy. */
function mutate(rel, from, to, times = 1) {
  const src = read(rel);
  const found = src.split(from).length - 1;
  if (found !== times) abort(`control ${CONTROL} cannot run: ${rel} holds its anchor ${found} time(s), expected ${times}: ${from.slice(0, 70)}`);
  const out = src.split(from).join(to);
  if (out === src) abort(`control ${CONTROL} cannot run: the rewrite of ${rel} changed nothing`);
  swapped.set(rel, out);
}
/** Put a line at the very top of a copy. */
function prepend(rel, line) {
  swapped.set(rel, `${line}\n${read(rel)}`);
}

const kindOf = rel => (rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const treeOf = rel => ts.createSourceFile(rel, read(rel), ts.ScriptTarget.Latest, true, kindOf(rel));
const printer = ts.createPrinter({ removeComments: true });
/** The file's code with every comment gone, strings and markup intact. */
const codeOf = rel => printer.printFile(treeOf(rel));
/** Every module a file imports or re-exports: { spec, typeOnly, line }. */
function importsOf(rel) {
  const tree = treeOf(rel);
  const out = [];
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      const clause = ts.isImportDeclaration(node) ? node.importClause : node;
      const named = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : node.exportClause;
      const everyNameIsType = !!named && ts.isNamedImports(named) || (!!named && ts.isNamedExports(named))
        ? named.elements.length > 0 && named.elements.every(e => e.isTypeOnly) && !(ts.isImportDeclaration(node) && node.importClause?.name)
        : false;
      out.push({ spec: node.moduleSpecifier.text, typeOnly: !!clause?.isTypeOnly || everyNameIsType, line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1 });
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(tree) === 'require') && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
      out.push({ spec: node.arguments[0].text, typeOnly: false, line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return out;
}
const kitFiles = fs.readdirSync(abs(KIT)).filter(f => /\.tsx?$/.test(f)).sort().map(f => `${KIT}/${f}`);

/* ---------- the control's copy, made before anything reads a file ---------- */
if (CONTROL === 'import') prepend(CARD, "import { formatWage } from '@/lib/soccerCareerEngine';");
if (CONTROL === 'clock') mutate(HOOK, 'if (key && live) settled.add(key);', 'if (key && live && Date.now() > 0) settled.add(key);');
if (CONTROL === 'stripe') mutate(STYLES, 'width: 4px; background-color: var(--cmo-ink); }', 'width: 4px; background: repeating-linear-gradient(45deg, var(--cmo-ink) 0 4px, transparent 4px 8px); }');
if (CONTROL === 'enginevalue') prepend(SOCCER_KEYS, "import { formatWage } from '@/lib/soccerCareerEngine';");
if (CONTROL) console.log(`CONTROL ${CONTROL} ON: ${[...swapped.keys()].join(', ')} read from a rewritten copy; expected red: ${CONTROLS[CONTROL].join(', ')}`);

/* ---------- 1. Source ---------- */
console.log(`1) Source: ${kitFiles.length} files in ${KIT}`);
{
  /* S1. The kit imports no game file. */
  const ALLOWED = new Set(['react', '@/components/game/VictoryMoment', '@/components/club-manager/Celebration', '@/lib/utils']);
  let seen = 0;
  for (const rel of kitFiles) {
    for (const imp of importsOf(rel)) {
      seen += 1;
      const sibling = imp.spec.startsWith('./') && !imp.spec.includes('..') && ['.ts', '.tsx'].some(ext => fs.existsSync(abs(`${KIT}/${imp.spec.slice(2)}${ext}`)));
      check('S1', ALLOWED.has(imp.spec) || sibling, `${rel} line ${imp.line} imports "${imp.spec}", which is not react, a file of the kit, the shared cup, the celebration layer or cn`);
    }
  }
  check('S1', seen >= 12, `only ${seen} imports were read in the kit folder, so this check is not looking at the kit`);
  console.log(`   S1 ${seen} imports read against the allow list`);
}
{
  /* S2. No clock, no storage, no dice. */
  const BANNED = ['Math.random', 'Date.now', 'new Date', 'localStorage', 'sessionStorage', 'indexedDB', 'setTimeout', 'setInterval', 'requestAnimationFrame'];
  let chars = 0;
  for (const rel of kitFiles) {
    const code = codeOf(rel);
    chars += code.length;
    for (const word of BANNED) check('S2', !code.includes(word), `${rel} uses ${word}; a scene holds no clock, no storage and no dice`);
  }
  check('S2', chars > 8000, `only ${chars} characters of kit code were read, so this check is not looking at the kit`);
  console.log(`   S2 ${chars} characters of code read for ${BANNED.length} banned words`);
}
{
  /* S3. One flat colour. Every gradient( is read to its closing bracket. */
  let uses = 0;
  let gradients = 0;
  for (const rel of kitFiles) {
    const code = codeOf(rel);
    uses += code.split('--cmo-ink').length - 1;
    check('S3', !code.includes('repeating-'), `${rel} declares a repeating pattern; the scene's colour is a solid fill only`);
    let at = code.indexOf('gradient(');
    while (at >= 0) {
      gradients += 1;
      let depth = 0;
      let end = at + 'gradient'.length;
      do { if (code[end] === '(') depth += 1; else if (code[end] === ')') depth -= 1; end += 1; } while (depth > 0 && end < code.length);
      check('S3', !code.slice(at, end).includes('--cmo-ink'), `${rel} puts the scene's colour inside a gradient: ${code.slice(at, end).slice(0, 80)}`);
      at = code.indexOf('gradient(', end);
    }
  }
  check('S3', uses >= 3, `the scene's colour is used ${uses} time(s) in the kit, so this check is not reading the style block`);
  console.log(`   S3 the scene's colour is used ${uses} times, ${gradients} gradient(s) read`);
}
{
  /* S6. The seams. careerMoments.ts is imported by the Season Centre, which
     other sports mount, so a VALUE import of the soccer engine there would
     put that engine on their pages. And a shared file that imported the kit
     through its index would hand every page the whole kit. */
  const BY_FILE = new Set([`@/${HOOK.slice(4, -3)}`, `@/${KIT.slice(4)}/Confetti`]);
  let read = 0;
  for (const imp of importsOf(SOCCER_KEYS)) {
    read += 1;
    check('S6', imp.typeOnly || imp.spec === 'react' || imp.spec === `@/${HOOK.slice(4, -3)}`, `${SOCCER_KEYS} line ${imp.line} imports a value from "${imp.spec}"; everything there but react and the kit's hook file must be a type import`);
  }
  for (const rel of [SOCCER_KEYS, SOCCER_FX]) {
    const fromKit = importsOf(rel).filter(imp => imp.spec.startsWith(`@/${KIT.slice(4)}`));
    check('S6', fromKit.length >= 1, `${rel} no longer imports the kit, so the lift is gone or this check is not reading it`);
    for (const imp of fromKit) {
      read += 1;
      check('S6', BY_FILE.has(imp.spec), `${rel} line ${imp.line} imports the kit as "${imp.spec}"; a shared file imports the hook or the confetti by file, never the index`);
    }
  }
  console.log(`   S6 ${read} imports read on the two soccer re-exporters`);
}

/* ---------- 2. In Chromium: the rig ---------- */
/* The fixtures. Every word and number is a test value; the kit is handed
   strings and never formats one, so the rig needs no engine for F1 to F5. */
const TICKS = ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Defending', 'Strength', 'Stamina', 'Vision']
  .map((label, i) => ({ label, to: String(71 + i), from: String(69 + i) }));
const FIXTURES = [
  { name: 'F1', id: 'rig-f1', art: true, done: false,
    spec: { kind: 'signing', key: 'rig|f1', tone: 'good', colour: '#1d4ed8', title: 'Signed with Rivertown', lines: ['3 years', 'Free transfer'], count: { text: '15k', from: '2k', label: 'your pay' } } },
  { name: 'F2', id: 'rig-f2', art: false, done: true,
    spec: { kind: 'trophy', key: 'rig|f2', tone: 'gold', title: 'Summit Cup 2031', lines: ['Champions', 'Won on the last day', 'Your first cup'], count: { text: '9', label: 'goals in the run' } } },
  { name: 'F3', id: 'rig-f3', art: false, done: true,
    spec: { kind: 'award', key: 'rig|f3', tone: 'gold', title: 'Player of the Season', lines: ['Voted by the league'] } },
  { name: 'F4', id: 'rig-f4', art: true, done: true, ticks: TICKS,
    spec: { kind: 'milestone', key: 'rig|f4', tone: 'good', title: 'Up to 74 overall', lines: ['You started the season on 71'], count: { text: '74', from: '71', label: 'overall' } } },
  { name: 'F5', id: 'rig-f5', art: true, done: true,
    spec: { kind: 'milestone', key: 'rig|f5', tone: 'quiet', title: 'Down to 70 overall', lines: ['You started the season on 72', 'A hard year'], count: { text: '70', from: '72', label: 'overall' } } },
];
const WIDTHS = [320, 390, 1280];
const RIG_URL = 'http://rig.test/';

const ENTRY = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { CareerMomentCard, settleMoments, isMomentSettled } from '@/components/career-moments';

const root = createRoot(document.getElementById('root'));
window.rig = {
  done: 0,
  states: [],
  mount(fx) {
    window.rig.states = [];
    flushSync(() => root.render(
      <div id="stage" style={{ padding: 12 }}>
        {fx.top ? <div style={{ height: fx.top }} /> : null}
        <CareerMomentCard key={fx.mount ?? fx.name} spec={fx.spec} bind={fx.id}
          art={fx.art ? <span className="rig-art" /> : undefined}
          onDone={fx.done ? () => { window.rig.done += 1; } : undefined}
          ticks={fx.ticks} embedded={fx.embedded} stacked={fx.stacked} />
      </div>));
  },
  clear() { flushSync(() => root.render(null)); },
  settle(keys) { settleMoments(keys); },
  settled(key) { return isMomentSettled(key); },
};
/* Every state the scene on the page passes through, in order. */
new MutationObserver(() => {
  const el = document.querySelector('[data-career-moment]');
  const state = el ? el.getAttribute('data-cmo-state') : 'gone';
  if (window.rig.states[window.rig.states.length - 1] !== state) window.rig.states.push(state);
}).observe(document.getElementById('root'), { subtree: true, childList: true, attributes: true, attributeFilter: ['data-cmo-state'] });
`;
/* The files the rig mounts, handed to Tailwind raw so every utility class
   they use exists in the rig's stylesheet. */
const MOUNTED = [...kitFiles, 'src/components/game/VictoryMoment.tsx', 'src/components/club-manager/Celebration.tsx', 'src/components/club-manager/CelebrationStyles.tsx'];
const copies = { name: 'control-copies', setup(b) {
  b.onLoad({ filter: /\.(tsx?|css)$/ }, args => {
    const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
    if (!swapped.has(rel)) return undefined;
    return { contents: swapped.get(rel), loader: rel.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
  });
} };
const bundle = await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'tsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', logLevel: 'error',
  alias: { '@': abs('src') }, plugins: [copies],
});
const configOut = await build({ entryPoints: [abs('tailwind.config.ts')], write: false, format: 'cjs', platform: 'node', logLevel: 'error' });
const configModule = { exports: {} };
new Function('module', 'exports', 'require', configOut.outputFiles[0].text)(configModule, configModule.exports, createRequire(import.meta.url));
const sheet = await postcss([tailwind({ ...configModule.exports.default, content: [{ raw: ENTRY + MOUNTED.map(read).join('\n'), extension: 'tsx' }] })])
  .process(read('src/index.css'), { from: abs('src/index.css') });
const SERVED = new Map([
  [RIG_URL, ['text/html', '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/rig.css"><style>.rig-art { display: block; width: 56px; height: 56px; border-radius: 9999px; background: #64748b; }</style></head><body><div id="root"></div><script src="/rig.js"></script></body></html>']],
  [`${RIG_URL}rig.css`, ['text/css', sheet.css]],
  [`${RIG_URL}rig.js`, ['text/javascript', bundle.outputFiles[0].text]],
]);
console.log(`2) In Chromium: ${FIXTURES.length} fixtures at ${WIDTHS.join(', ')} px, motion on and reduced; bundle ${Math.round(bundle.outputFiles[0].text.length / 1024)}K, stylesheet ${Math.round(sheet.css.length / 1024)}K, Tailwind was handed ${MOUNTED.length} files`);

const browser = await chromium.launch({ args: ['--no-sandbox'] });
/** A page of the rig. Every request but the rig's own three is refused. */
async function openRig(width, reducedMotion) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
  const trouble = [];
  page.on('pageerror', e => trouble.push(`page error: ${String(e).slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) trouble.push(`console error: ${m.text().slice(0, 200)}`); });
  await page.route('**/*', route => {
    const hit = SERVED.get(route.request().url());
    return hit ? route.fulfill({ contentType: hit[0], body: hit[1] }) : route.abort();
  });
  await page.goto(RIG_URL);
  await page.waitForFunction(() => !!window.rig, null, { timeout: 20000 });
  return { page, trouble };
}
/** Mount one fixture and wait until the scene is drawn. */
async function mount(page, fx) {
  await page.evaluate(f => window.rig.mount(f), fx);
  await page.locator('[data-career-moment]').waitFor({ timeout: 20000 });
}
const waitState = (page, state) => page.locator(`[data-career-moment][data-cmo-state="${state}"]`).waitFor({ timeout: 20000 });

try {
  for (const width of WIDTHS) for (const reducedMotion of ['no-preference', 'reduce']) {
    const { page, trouble } = await openRig(width, reducedMotion);
    const where = `${width}px ${reducedMotion === 'reduce' ? 'reduced' : 'motion'}`;
    for (const fx of FIXTURES) {
      const at = `${fx.name} ${where}`;
      await mount(page, fx);
      await waitState(page, 'live').catch(() => undefined);
      const drawn = await page.evaluate(() => {
        const el = document.querySelector('[data-career-moment]');
        return { state: el.getAttribute('data-cmo-state'), kind: el.getAttribute('data-career-moment'), title: el.querySelector('h3')?.textContent ?? '', states: window.rig.states };
      });
      check('RIG', drawn.kind === fx.spec.kind && drawn.title === fx.spec.title, `${at}: the scene drew as ${drawn.kind} "${drawn.title}", expected ${fx.spec.kind} "${fx.spec.title}"`);
      check('RIG', drawn.state === 'live' && drawn.states.join('>') === 'fresh>live', `${at}: a first mount in view must go fresh then live, saw ${drawn.states.join('>') || 'nothing'} and ended ${drawn.state}`);
      await page.evaluate(() => window.rig.clear());
    }
    check('RIG', trouble.length === 0, `${where}: the rig page reported ${trouble.length} error(s): ${trouble.slice(0, 2).join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

/* ---------- the verdict ---------- */
const failed = [...red.values()].reduce((n, list) => n + list.length, 0);
const redIds = [...red.keys()].sort();
if (CONTROL) {
  const want = [...CONTROLS[CONTROL]].sort();
  const exact = redIds.length === want.length && redIds.every((id, i) => id === want[i]);
  console.log(`simCareerMoments CONTROL ${CONTROL}: ${checks} checks, red on ${redIds.join(', ') || 'nothing'} (expected ${want.join(', ')}): ${exact ? 'the control fired on its own check and the others stayed green' : 'NOT what this control must do'}`);
  process.exit(exact ? 0 : 1);
}
console.log(`simCareerMoments: ${checks} checks, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
