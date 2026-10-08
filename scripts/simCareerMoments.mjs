/* Round 1107: the career moment kit (src/components/career-moments), held at
   source level and in Chromium. Needs no build: the kit is bundled in memory
   with esbuild, the stylesheet is the real src/index.css through Tailwind
   and postcss (so the site's blanket reduced motion rule is in the rig), and
   Chromium comes from scripts/lib/playwrightLoader.mjs. Nothing is written
   to the tree or to a shared cache, the rig page refuses every request but
   its own three, and nothing here is statistical: the rig draws no random
   number, so the only tuned number is K7's height bound.

   HOW TO READ A RUN
     clean:    closing line "simCareerMoments: N checks, 0 failed", exit 0.
     control:  CAREER_MOMENTS_CONTROL=<name>. A control rewrites a COPY of one
               source file (the tree is never written) and refuses to run
               (exit 2) if its rewrite changed nothing. A source control's
               copy is fed to the scan only, a browser control's to the
               bundle only. The closing line names the checks that went red.
               Exit 0 ONLY when they are exactly the control's own; nothing
               red, or a neighbour red, is exit 1. So in a list of control
               runs every line should read exit 0.

   SECTION 1, SOURCE (comments are dropped by the TypeScript printer first)
     S1 imports     every import in the kit folder is react, a sibling in the
                    folder, the shared cup, the celebration layer or cn. An
                    allow list, so a new import fails by default.
     S2 no clock    no Math.random, Date, storage, timer or animation frame
                    anywhere in the folder's code.
     S3 flat colour the scene's colour never sits inside a gradient and no
                    repeating pattern exists in the folder.
     S4 bindings    read off the TypeScript tree: SignedSlip.tsx holds exactly
                    one SigningMoment element, and the hook and the confetti
                    are each defined once in src, in the kit folder.
     S5 bind ids    each id the browser walk finds a binding by is written in
                    src exactly once outside src/test.
     S6 seams       careerMoments.ts imports only types (bar react and the
                    kit's hook file), and the two soccer re-exporters import
                    the kit by FILE, never through its index.

   SECTION 2, IN CHROMIUM
     The rig mounts five fixtures, each at 320, 390 and 1280 px, with motion
     on and with reducedMotion "reduce":
       F1 a signing    art, two lines, a count with a before, #1d4ed8, good
       F2 a trophy     three lines, a count with no before, gold, a button
       F3 an award     one line, gold, a button
       F4 a milestone  a count with a before, eight ticks, good, a button
       F5 a milestone  two lines, a count with a before, QUIET, a button
       F6slip          the REAL SignedSlip: a transfer with a fee and a wage
                       before, for a career with a look and a club colour.
                       Its words are the engine's own formatting, read off
                       the page. K1 also wants one avatar whose shirt is the
                       club colour and a scene that carries the same colour.
     Tailwind is handed the raw source of everything the rig mounts: the six
     kit files, SignedSlip.tsx, PlayerAvatar.tsx, VictoryMoment.tsx,
     Celebration.tsx and CelebrationStyles.tsx.
     RIG  every fixture draws, a first mount in view goes fresh then live,
          and the page reports no error.
     K1 facts       the settled words (style blocks, drawings and the old
                    number layer left out) hold the title, each line and the
                    count in that order, and no digit run the fixture lacks.
     K2 stationary  with every animation paused and set to 0, 25, 50, 75 and
                    100 percent of the longest end time, the card's and the
                    button's LAYOUT box, the card's drawn size and the page's
                    width and height are the same at all five points. The
                    layout box is the measure because a quiet card's one rise
                    is a 7 px transform on the card itself, which moves no
                    neighbour. A page that is too wide all along is K7's.
     K3 the number  at each point every visible layer of the number reads the
                    value before or the value now, the final layer always
                    reads the value now, the first frame shows only the value
                    before and the last only the value now.
     K4 it moves    a tenth of the way into its own animation (its own delay
                    plus a tenth of its own duration) the title is a matrix
                    more than 0.02 off standing still, and so is the cup on a
                    trophy. Measured 2026-10-08 at 390 px: the title
                    matrix(1.20898, 0, 0, 1.20898, 0, 0), the cup
                    matrix(0.944042, -0.0476784, 0.0476784, 0.944042, 0, 5.18335).
                    A quiet card has exactly one animation, cmRise on the card.
     K5 reduced     under reduce nothing in the card has an animation or a
                    transition longer than 10 ms (playReducedMotion's measure
                    and its SLOW_MS), every beat has opacity 1, no confetti,
                    and the old number and the ring are display none with
                    animation name none.
     K6 once        a: a first mount goes fresh then live with its old number
                    and 50 confetti pieces, a second mount of the same key is
                    still, with K5's measure holding while motion is ON, no
                    old number, no confetti. b: a key settled on load is still
                    on its first mount. c: 3000 px below the fold it waits,
                    unsettled, every beat and the cup paused; scrolled into
                    view it goes live and is settled. d: a null key is still.
     K7 fit         no fixture makes the page wider than the window at any
                    width, and the tallest stand alone fixture at 320 px is
                    under K7_BOUND. Measured 2026-10-08 on three runs that
                    agreed to the pixel (GitHub runner, Linux fonts): F1 193,
                    F2 233, F3 145, F4 441, F5 215. Tallest 441 px, plus 15
                    percent, rounded up: 508 px. A Windows run wraps a little
                    differently; the 15 percent is the room for that.
     K8 the button  pressed three times at its own coordinates with the play
                    held on its first frame, onDone is called exactly once;
                    the button is at least 44 px tall; no onDone, no button;
                    an embedded scene has no button, no bar and no confetti.
     K9 no effects  Storage.prototype.setItem, removeItem and clear, and
                    Math.random, are wrapped once the bundle has loaded and
                    before anything mounts: zero calls on every page.

   CONTROLS, each seen on 2026-10-08 on the GitHub runner, red on its own
   check with every other check green (the closing line says so, exit 0):
     import       CareerMomentCard.tsx also imports the soccer engine      S1
     clock        useCareerMoment.ts reads Date.now()                       S2
     stripe       the bar is painted with a repeating gradient              S3
     unbind       SignedSlip.tsx draws the plain card, not SigningMoment   S4
     dupbind      the slip's bind id is written a second time              S5
     enginevalue  careerMoments.ts imports a VALUE from the soccer engine   S6
     stray        the view prints 9041, which no fixture carries            K1
     grow         cmoInk animates height instead of a transform             K2
     third        the old number layer prints the value before plus "0"     K3
     frozen       cmSlam runs for 0 s and the cup's lift for 0 ms           K4
     motion       the kit's, the cup's and the celebration layer's reduce
                  rules and the site's blanket rule are made unmatchable    K5
     replay       the hook's initialiser ignores the settled set            K6a, K6b
     eager        the hook goes live without waiting to be seen             K6c
     wide         the card gets a 400 px minimum width                      K7
     gated        the button is hidden behind cm-rise-gated and a delay     K8
     savewrite    the hook writes one localStorage key when it settles      K9
   Steps 4a to 4c measured them on fe4c4de8 plus this file. */
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
const VICTORY = 'src/components/game/VictoryMoment.tsx';
const CELEBRATION_STYLES = 'src/components/club-manager/CelebrationStyles.tsx';
const INDEX_CSS = 'src/index.css';
const SLIP = 'src/components/soccer-career/SignedSlip.tsx';
const AVATAR = 'src/components/soccer-career/PlayerAvatar.tsx';
/* The ids the browser walk finds the two bindings by. */
const BIND_IDS = ['sc-signing'];

/* Each control and the checks it must turn red. */
const CONTROLS = {
  import: ['S1'],
  clock: ['S2'],
  stripe: ['S3'],
  enginevalue: ['S6'],
  unbind: ['S4'],
  dupbind: ['S5'],
  stray: ['K1'],
  grow: ['K2'],
  third: ['K3'],
  frozen: ['K4'],
  motion: ['K5'],
  replay: ['K6a', 'K6b'],
  eager: ['K6c'],
  wide: ['K7'],
  gated: ['K8'],
  savewrite: ['K9'],
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

/* A control's copies: repo path -> rewritten text. The tree itself is never
   touched. A source control's copy is fed to the scan and never to the
   bundle; a browser control's copy is fed to the bundle and never to the
   scan. So a control can only turn red the half it was written for. */
const swapped = new Map();
const abs = rel => path.join(ROOT, rel);
const raw = rel => fs.readFileSync(abs(rel), 'utf8');
const read = rel => swapped.get(rel) ?? raw(rel);
const SOURCE_CONTROLS = new Set(['import', 'clock', 'stripe', 'enginevalue', 'unbind', 'dupbind']);
const scanRead = rel => (SOURCE_CONTROLS.has(CONTROL) ? read(rel) : raw(rel));
const bundleRead = rel => (SOURCE_CONTROLS.has(CONTROL) ? raw(rel) : read(rel));
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
const treeOf = rel => ts.createSourceFile(rel, scanRead(rel), ts.ScriptTarget.Latest, true, kindOf(rel));
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
if (CONTROL === 'unbind') mutate(SLIP, '<SigningMoment spec=', '<CareerMomentCard spec=');
if (CONTROL === 'dupbind') prepend(SLIP, 'const twin = "sc-signing";');
if (CONTROL === 'stray') mutate(CARD, '{children}', "{children}<span>{' 9041'}</span>");
if (CONTROL === 'grow') mutate(STYLES, '@keyframes cmoInk { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }', '@keyframes cmoInk { 0% { height: 0px; } 100% { height: 24px; } }');
if (CONTROL === 'third') mutate(CARD, 'className="cmo-num-old" style={at(beats.count ?? 0)}>{from}</span>', 'className="cmo-num-old" style={at(beats.count ?? 0)}>{from}0</span>');
if (CONTROL === 'frozen') {
  mutate(CELEBRATION_STYLES, 'animation: cmSlam 0.4s', 'animation: cmSlam 0s');
  mutate(VICTORY, 'animation: victory-lift 900ms', 'animation: victory-lift 0ms');
}
if (CONTROL === 'motion') {
  /* Every reduced motion rule the rig could lean on is made unmatchable: the
     kit's, the cup's, the celebration layer's and the site's blanket rule. */
  for (const rel of [STYLES, VICTORY, CELEBRATION_STYLES, INDEX_CSS]) {
    const rule = 'prefers-reduced-motion: reduce';
    mutate(rel, rule, 'prefers-reduced-motion: no-such-preference', Math.max(1, read(rel).split(rule).length - 1));
  }
}
if (CONTROL === 'replay') mutate(HOOK, 'useState(() => key !== null && !settled.has(key))', 'useState(() => key !== null)');
if (CONTROL === 'eager') mutate(HOOK, 'if (typeof IntersectionObserver === "undefined") { setLive(true); return; }', 'if (true) { setLive(true); return; }');
if (CONTROL === 'wide') mutate(STYLES, '.cmo { position: relative; }', '.cmo { position: relative; min-width: 400px; }');
if (CONTROL === 'gated') mutate(CARD, "data-cmo-done onClick={onDone} className={cn('cmo-done", "data-cmo-done onClick={onDone} style={loud ? { animationDelay: '1.2s' } : undefined} className={cn(loud && 'cm-rise-gated', 'cmo-done");
if (CONTROL === 'savewrite') mutate(HOOK, 'if (key && live) settled.add(key);', "if (key && live) { settled.add(key); window.localStorage.setItem('cmo-settled', key); }");
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
/* Every .ts and .tsx file under src, as repo paths. */
function walkSrc(dir = 'src', out = []) {
  for (const entry of fs.readdirSync(abs(dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walkSrc(rel, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}
const srcFiles = walkSrc();
/** How many JSX elements named `tag` a file holds, and the ancestors of each. */
function elementsOf(rel, tag) {
  const tree = treeOf(rel);
  const found = [];
  const visit = node => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(tree) === tag) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return { tree, found };
}
{
  /* S4. The bindings, read off the TypeScript tree (never off a comment), and
     one definition each of the hook and the confetti, both in the kit. */
  const slip = elementsOf(SLIP, 'SigningMoment');
  check('S4', slip.found.length === 1, `${SLIP} holds ${slip.found.length} SigningMoment element(s), expected exactly one: the slip is the signing scene`);
  for (const [name, shape] of [['useCareerMoment', /(?:function\s+useCareerMoment\s*\(|(?:const|let|var)\s+useCareerMoment\s*=)/], ['Confetti', /(?:function\s+Confetti\s*\(|(?:const|let|var)\s+Confetti\s*=)/]]) {
    const defs = srcFiles.filter(rel => shape.test(scanRead(rel)) && shape.test(codeOf(rel)));
    check('S4', defs.length === 1 && defs[0].startsWith(`${KIT}/`), `${name} must be defined exactly once, in ${KIT}; found ${defs.join(', ') || 'no definition'}`);
  }
  console.log(`   S4 ${slip.found.length} SigningMoment in the slip; ${srcFiles.length} source files read for a second definition of the hook or the confetti`);
}
{
  /* S5. Each bind id is in src exactly once outside src/test, raw text and
     comments included: the browser walk's controls rewrite the id in the
     served files and need it to be the only one. */
  for (const id of BIND_IDS) {
    const hits = srcFiles.filter(rel => !rel.startsWith('src/test/')).flatMap(rel => Array(scanRead(rel).split(id).length - 1).fill(rel));
    check('S5', hits.length === 1, `the bind id "${id}" is written ${hits.length} time(s) in src outside src/test (${[...new Set(hits)].join(', ') || 'nowhere'}), expected exactly once`);
  }
  console.log(`   S5 ${BIND_IDS.length} bind id(s) counted across ${srcFiles.filter(rel => !rel.startsWith('src/test/')).length} files`);
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
import { SignedSlip } from '@/components/soccer-career/SignedSlip';
import { formatWage } from '@/lib/soccerCareerEngine';
import { localizeMoney } from '@/lib/soccerCurrency';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';

const root = createRoot(document.getElementById('root'));
/* F6's career: a look and one flat club colour, nothing else the slip reads. */
const CAREER = { playerName: 'Rig Player', nationality: 'Portugal', position: 'ST', seasons: [], appearance: defaultAppearance(), currentClubColor: '#1D4ED8' };
const real = fx => (fx.real === 'slip' ? <SignedSlip key={fx.mount ?? fx.name} note={{ ...fx.note, forCareer: CAREER }} /> : null);
window.rig = {
  done: 0,
  states: [],
  /* The engine's own formatting of F6's numbers, so the harness never formats one. */
  words: { wage: formatWage(45000), before: formatWage(20000), fee: localizeMoney('€12.5M'), colour: CAREER.currentClubColor },
  mount(fx) {
    window.rig.states = [];
    flushSync(() => root.render(
      <div id="stage" style={{ padding: 12 }}>
        {fx.top ? <div style={{ height: fx.top }} /> : null}
        {fx.real ? real(fx) : (
          <CareerMomentCard key={fx.mount ?? fx.name} spec={fx.spec} bind={fx.id}
            art={fx.art ? <span className="rig-art" /> : undefined}
            onDone={fx.done ? () => { window.rig.done += 1; } : undefined}
            ticks={fx.ticks} embedded={fx.embedded} stacked={fx.stacked} />
        )}
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
const MOUNTED = [...kitFiles, SLIP, AVATAR, 'src/components/game/VictoryMoment.tsx', 'src/components/club-manager/Celebration.tsx', 'src/components/club-manager/CelebrationStyles.tsx'];
const copies = { name: 'control-copies', setup(b) {
  b.onLoad({ filter: /\.(tsx?|css)$/ }, args => {
    const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
    if (!swapped.has(rel) || SOURCE_CONTROLS.has(CONTROL)) return undefined;
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
const sheet = await postcss([tailwind({ ...configModule.exports.default, content: [{ raw: ENTRY + MOUNTED.map(bundleRead).join('\n'), extension: 'tsx' }] })])
  .process(bundleRead(INDEX_CSS), { from: abs(INDEX_CSS) });
const SERVED = new Map([
  [RIG_URL, ['text/html', '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/rig.css"><style>.rig-art { display: block; width: 56px; height: 56px; border-radius: 9999px; background: #64748b; }</style></head><body><div id="root"></div><script src="/rig.js"></script></body></html>']],
  [`${RIG_URL}rig.css`, ['text/css', sheet.css]],
  [`${RIG_URL}rig.js`, ['text/javascript', bundle.outputFiles[0].text]],
]);
console.log(`2) In Chromium: ${FIXTURES.length} fixtures at ${WIDTHS.join(', ')} px, motion on and reduced; bundle ${Math.round(bundle.outputFiles[0].text.length / 1024)}K, stylesheet ${Math.round(sheet.css.length / 1024)}K, Tailwind was handed ${MOUNTED.length} files`);

/* ----- what runs inside the page ----- */
const SLOW_MS = 10;
/* K7: the tallest stand alone fixture at 320 px may not pass this. See the header. */
const K7_BOUND = 508;
const POINTS = [0, 0.25, 0.5, 0.75, 1];
/* Pause every animation and walk the play by hand: 0, 25, 50, 75 and 100
   percent of the longest end time (the confetti's fall is decoration with
   its own clock and is left out of that length, though it is moved too).
   At each point: the card's and the button's LAYOUT box (a quiet card's one
   rise is a 7 px transform on the card itself, which moves no neighbour, so
   the layout box is the measure of "nothing on the page moved"), the card's
   drawn size, the page's size, and every layer of the number. Then the early
   frame of the title and of the cup, each at its own delay plus a tenth of
   its own duration. */
const samplePlay = () => {
  const card = document.querySelector('[data-career-moment]');
  const button = card.querySelector('[data-cmo-done]');
  const all = document.getAnimations();
  const isConfetti = a => !!(a.effect && a.effect.target && a.effect.target.classList && a.effect.target.classList.contains('animate-confetti-fall'));
  let end = 0;
  for (const a of all) {
    a.pause();
    if (!isConfetti(a)) end = Math.max(end, Number(a.effect.getComputedTiming().endTime) || 0);
  }
  const layout = el => {
    let x = 0, y = 0;
    for (let n = el; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return [x, y, el.offsetWidth, el.offsetHeight].join(',');
  };
  const points = [];
  for (const pct of [0, 0.25, 0.5, 0.75, 1]) {
    for (const a of all) a.currentTime = pct * end;
    const r = card.getBoundingClientRect();
    points.push({
      pct,
      card: layout(card),
      size: `${Math.round(r.width * 100) / 100},${Math.round(r.height * 100) / 100}`,
      button: button ? layout(button) : 'none',
      page: `${document.documentElement.scrollWidth},${document.documentElement.scrollHeight}`,
      layers: [...card.querySelectorAll('[data-cmo-number] *')].map(el => {
        const s = getComputedStyle(el);
        return { text: el.textContent, final: el.hasAttribute('data-cmo-number-final'), shown: s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.01 };
      }),
    });
  }
  /* The early frame of one element's own animation. */
  const early = el => {
    if (!el) return null;
    const own = all.filter(a => a.effect && a.effect.target === el && !a.effect.pseudoElement);
    if (own.length === 0) return { name: 'none', transform: getComputedStyle(el).transform, at: 0, duration: 0 };
    const t = own[0].effect.getComputedTiming();
    const at = Number(t.delay) + Number(t.duration) * 0.1;
    own[0].currentTime = at;
    const out = { name: own[0].animationName, transform: getComputedStyle(el).transform, at, duration: Number(t.duration) };
    own[0].currentTime = end;
    return out;
  };
  const title = early(card.querySelector('h3'));
  const cup = early(card.querySelector('.victory-cup'));
  for (const a of all) a.currentTime = end;
  const names = [card, ...card.querySelectorAll('*')]
    .filter(el => !el.classList.contains('animate-confetti-fall') && getComputedStyle(el).animationName !== 'none')
    .map(el => `${el === card ? 'card' : el.tagName.toLowerCase()}:${getComputedStyle(el).animationName}`);
  return { end, animations: all.length, points, title, cup, names };
};
/* Under reduced motion: playReducedMotion's own measure, on the card. */
const measureReduced = slowMs => {
  const card = document.querySelector('[data-career-moment]');
  const ms = v => Math.max(0, ...String(v).split(',').map(x => { x = x.trim(); return x.endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000; }).filter(n => Number.isFinite(n)));
  const slow = [];
  for (const el of [card, ...card.querySelectorAll('*')]) {
    const s = getComputedStyle(el);
    const t = ms(s.transitionDuration);
    const a = s.animationName !== 'none' ? ms(s.animationDuration) : 0;
    if (t > slowMs || a > slowMs) slow.push(`${el.tagName.toLowerCase()}.${String(el.getAttribute('class') || '').split(' ')[0]} t=${t} a=${a}`);
  }
  const quietOnes = [...card.querySelectorAll('.cmo-num-old, .cmo-ring')].map(el => {
    const s = getComputedStyle(el);
    return { cls: String(el.getAttribute('class')), name: s.animationName, display: s.display };
  });
  return {
    slow,
    beats: [...card.querySelectorAll('[data-cmo-beat]')].map(el => ({ beat: el.getAttribute('data-cmo-beat'), opacity: getComputedStyle(el).opacity })),
    confetti: document.querySelectorAll('.animate-confetti-fall').length,
    quietOnes,
  };
};
/* The settled words: a clone with every style block, every drawing and the
   old number layer taken out (a style block's CSS is full of digits and is
   not printed text). */
const settledText = () => {
  const copy = document.querySelector('[data-career-moment]').cloneNode(true);
  copy.querySelectorAll('style, svg, [data-cmo-number-old]').forEach(n => n.remove());
  return [...copy.querySelectorAll('*')].reduce((text, el) => {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) text.push(n.textContent.trim());
    return text;
  }, []).join(' | ');
};

/* ----- what the harness makes of it ----- */
const digitRuns = s => String(s).match(/\d+/g) || [];
/* K1. The facts: the title, each line and the count's text, in that order,
   and no digit run the fixture does not carry. */
function checkFacts(at, fx, text) {
  const { spec } = fx;
  const facts = [spec.title, ...(spec.lines ?? []).slice(0, 3), ...(spec.count ? [spec.count.text] : [])];
  let cursor = 0;
  for (const fact of facts) {
    const found = text.indexOf(fact, cursor);
    check('K1', found >= 0, `${at}: "${fact}" is missing or out of order in the settled text: ${text.slice(0, 160)}`);
    if (found >= 0) cursor = found + fact.length;
  }
  const allowed = new Set(digitRuns(JSON.stringify([spec, fx.ticks ?? []])));
  for (const run of digitRuns(text)) check('K1', allowed.has(run), `${at}: the scene prints ${run}, a number its fixture never carried`);
}
/* K2. Stationary: nothing the play does changes a layout box or the page. */
function checkStationary(at, play) {
  check('K2', play.end > 300 && play.animations > 0, `${at}: the play is ${play.end} ms long over ${play.animations} animation(s), so nothing was sampled`);
  for (const key of ['card', 'size', 'button', 'page']) {
    const seen = [...new Set(play.points.map(p => p[key]))];
    check('K2', seen.length === 1, `${at}: the ${key} box changes during the play: ${play.points.map(p => `${p.pct * 100}%=${p[key]}`).join(' ')}`);
  }
}
/* K3. The number never lies: whatever is visible is the value before or the
   value now, and at the end only the value now. */
function checkNumber(at, fx, play) {
  const { count } = fx.spec;
  if (!count) return;
  const truths = new Set([count.text, ...(count.from ? [count.from] : [])]);
  for (const p of play.points) {
    const shown = p.layers.filter(l => l.shown);
    for (const l of shown) check('K3', truths.has(l.text), `${at}: at ${p.pct * 100}% the number shows "${l.text}", which is neither ${[...truths].join(' nor ')}`);
    const final = p.layers.filter(l => l.final);
    check('K3', final.length === 1 && final[0].text === count.text, `${at}: at ${p.pct * 100}% the final number layer reads ${final.map(l => l.text).join(',') || 'nothing'}, expected ${count.text}`);
    if (p.pct === 1) check('K3', shown.length === 1 && shown[0].text === count.text, `${at}: at rest the number shows ${shown.map(l => l.text).join(' and ') || 'nothing'}, expected only ${count.text}`);
    if (p.pct === 0 && count.from && fx.spec.tone !== 'quiet') check('K3', shown.length === 1 && shown[0].text === count.from, `${at}: on the first frame the number shows ${shown.map(l => l.text).join(' and ') || 'nothing'}, expected the value before, ${count.from}`);
  }
}
/* K4. It really moves. An early frame of the title (and of the cup) is a
   matrix at least 0.02 away from standing still; a quiet card moves once, as
   a whole. */
const offIdentity = transform => {
  const m = /^matrix\(([^)]+)\)$/.exec(String(transform));
  if (!m) return 0;
  const n = m[1].split(',').map(Number);
  return Math.max(...[1, 0, 0, 1, 0, 0].map((id, i) => Math.abs(n[i] - id)));
};
function checkMoves(at, fx, play) {
  if (fx.spec.tone === 'quiet') {
    check('K4', play.names.join(' ') === 'card:cmRise', `${at}: a quiet card has one animation, cmRise on the card itself; found ${play.names.join(' ') || 'none'}`);
    return;
  }
  check('K4', !!play.title && offIdentity(play.title.transform) > 0.02, `${at}: the title is standing still a tenth of the way into its slam (${play.title ? `${play.title.name} at ${play.title.at} ms: ${play.title.transform}` : 'no h3'})`);
  if (fx.spec.kind === 'trophy') check('K4', !!play.cup && offIdentity(play.cup.transform) > 0.02, `${at}: the cup is standing still a tenth of the way into its lift (${play.cup ? `${play.cup.name} at ${play.cup.at} ms: ${play.cup.transform}` : 'no cup'})`);
  moved.push(`${at} title ${play.title?.transform}${play.cup ? ` cup ${play.cup.transform}` : ''}`);
}
const moved = [];
/* K5. Reduced motion: nothing longer than SLOW_MS, every beat visible, no
   confetti, and the old number and the ring gone, animation and all. */
function checkReduced(at, fx, got) {
  check('K5', got.slow.length === 0, `${at}: ${got.slow.length} element(s) still move for more than ${SLOW_MS} ms under reduce (${got.slow.slice(0, 3).join('; ')})`);
  for (const b of got.beats) check('K5', Number(b.opacity) === 1, `${at}: the ${b.beat} beat has opacity ${b.opacity} under reduce`);
  check('K5', got.beats.length >= 1, `${at}: no beat was found to measure`);
  check('K5', got.confetti === 0, `${at}: ${got.confetti} confetti piece(s) fall under reduce`);
  for (const q of got.quietOnes) check('K5', q.name === 'none' && q.display === 'none', `${at}: .${q.cls} is ${q.display} with animation ${q.name} under reduce; it must be gone, animation and all`);
  const expectHidden = (fx.spec.count?.from && fx.spec.tone !== 'quiet' ? 1 : 0) + (fx.spec.kind === 'award' && fx.spec.tone !== 'quiet' ? 1 : 0);
  check('K5', got.quietOnes.length === expectHidden, `${at}: ${got.quietOnes.length} old number or ring layer(s) in the markup, expected ${expectHidden}, so the rule above measured the wrong thing`);
}

const heights = [];
/* K9. No side effects: not one storage write and not one random draw. */
async function checkSideEffects(page, where) {
  const side = await page.evaluate(() => window.side);
  check('K9', side.storage.length === 0, `${where}: the kit wrote to storage ${side.storage.length} time(s): ${side.storage.slice(0, 3).join(', ')}`);
  check('K9', side.random === 0, `${where}: ${side.random} random number(s) were drawn while scenes mounted, played and left`);
}

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
  /* K9's ledger, wrapped once the bundle has loaded (React draws its own
     random keys while it loads) and before anything is mounted. */
  await page.evaluate(() => {
    window.side = { storage: [], random: 0 };
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const real = Storage.prototype[method];
      Storage.prototype[method] = function (...args) { window.side.storage.push(method + ' ' + String(args[0] ?? '')); return real.apply(this, args); };
    }
    const realRandom = Math.random;
    Math.random = function () { window.side.random += 1; return realRandom(); };
  });
  return { page, trouble };
}
/** Mount one fixture and wait until the scene is drawn. */
async function mount(page, fx) {
  await page.evaluate(f => window.rig.mount(f), fx);
  await page.locator('[data-career-moment]').waitFor({ timeout: 20000 });
}
const waitState = (page, state) => page.locator(`[data-career-moment][data-cmo-state="${state}"]`).waitFor({ timeout: 20000 });

try {
  /* F6, the REAL signing slip: a transfer with a fee and a wage before, for a
     career with a look and a club colour. Its words are the engine's own
     formatting, read off the page, so the harness never formats a number. */
  {
    const { page } = await openRig(390, 'no-preference');
    const words = await page.evaluate(() => window.rig.words);
    await page.close();
    FIXTURES.push({ name: 'F6slip', real: 'slip', id: 'sc-signing', art: true, done: false, colour: words.colour,
      note: { kind: 'transfer', club: 'Rivertown FC', years: 3, wage: 45000, fee: 12.5, prevWage: 20000 },
      spec: { kind: 'signing', tone: 'good', colour: words.colour, title: '✍️ Signed with Rivertown FC', lines: [`3 years at ${words.wage}`, `${words.fee} fee`], count: { text: words.wage, from: words.before, label: 'your wage' } } });
  }
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
      if (fx.real === 'slip') {
        /* His avatar in the new colour is what the signing scene is for. */
        const worn = await page.evaluate(() => {
          const scenes = document.querySelectorAll('[data-signed-slip] [data-career-moment="signing"][data-cmo-bind="sc-signing"]');
          const avatars = scenes[0] ? scenes[0].querySelectorAll('svg[aria-label="Player avatar"]') : [];
          return { scenes: scenes.length, avatars: avatars.length, shirt: avatars[0]?.querySelector('path')?.getAttribute('fill') ?? '', ink: scenes[0] ? scenes[0].style.getPropertyValue('--cmo-ink') : '' };
        });
        check('K1', worn.scenes === 1 && worn.avatars === 1 && worn.shirt === fx.colour && worn.ink === fx.colour.toLowerCase(), `${at}: the slip must hold one signing scene with one avatar whose shirt is ${fx.colour} and whose colour is ${fx.colour.toLowerCase()}; found ${worn.scenes} scene(s), ${worn.avatars} avatar(s), shirt ${worn.shirt || 'none'}, colour ${worn.ink || 'none'}`);
      }
      if (reducedMotion === 'reduce') {
        checkReduced(at, fx, await page.evaluate(measureReduced, SLOW_MS));
      } else {
        const play = await page.evaluate(samplePlay);
        checkStationary(at, play);
        checkNumber(at, fx, play);
        checkMoves(at, fx, play);
      }
      checkFacts(at, fx, await page.evaluate(settledText));
      const fit = await page.evaluate(() => ({ wide: document.documentElement.scrollWidth, view: window.innerWidth, height: document.querySelector('[data-career-moment]').offsetHeight }));
      check('K7', fit.wide <= fit.view, `${at}: the page is ${fit.wide} px wide in a ${fit.view} px window, so the scene scrolls sideways`);
      if (width === 320 && reducedMotion !== 'reduce') heights.push([fx.name, fit.height]);
      await page.evaluate(() => window.rig.clear());
    }
    await checkSideEffects(page, where);
    check('RIG', trouble.length === 0, `${where}: the rig page reported ${trouble.length} error(s): ${trouble.slice(0, 2).join(' | ')}`);
    await page.close();
  }

  /* K6, once, and K8, the button: one page at 390 px with motion on. */
  {
    const { page, trouble } = await openRig(390, 'no-preference');
    const F2 = FIXTURES[1];
    const stateNow = () => page.evaluate(() => document.querySelector('[data-career-moment]')?.getAttribute('data-cmo-state') ?? 'gone');
    const settle = ms => page.waitForTimeout(ms);
    const once = { ...F2, spec: { ...F2.spec, key: 'rig|k6a', count: { text: '9', from: '7', label: 'goals in the run' } } };

    /* (a) fresh, then live; a second mount of the same key is still. */
    await mount(page, { ...once, mount: 'a1' });
    await waitState(page, 'live').catch(() => undefined);
    await page.waitForFunction(() => document.querySelectorAll('.animate-confetti-fall').length > 0, null, { timeout: 5000 }).catch(() => undefined);
    const first = await page.evaluate(() => ({ states: window.rig.states.join('>'), old: document.querySelectorAll('[data-cmo-number-old]').length, confetti: document.querySelectorAll('.animate-confetti-fall').length }));
    check('K6a', first.states === 'fresh>live' && first.old === 1 && first.confetti === 50, `the first mount of a key must go fresh then live with its old number and its 50 confetti pieces; saw ${first.states}, ${first.old} old number(s), ${first.confetti} piece(s)`);
    await page.evaluate(() => window.rig.clear());
    await mount(page, { ...once, mount: 'a2' });
    await settle(700);
    const second = await page.evaluate(slowMs => {
      const card = document.querySelector('[data-career-moment]');
      const ms = v => Math.max(0, ...String(v).split(',').map(x => { x = x.trim(); return x.endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000; }).filter(n => Number.isFinite(n)));
      let slow = 0;
      for (const el of [card, ...card.querySelectorAll('*')]) {
        const s = getComputedStyle(el);
        if (ms(s.transitionDuration) > slowMs || (s.animationName !== 'none' && ms(s.animationDuration) > slowMs)) slow += 1;
      }
      return { states: window.rig.states.join('>'), slow, old: card.querySelectorAll('[data-cmo-number-old]').length, confetti: document.querySelectorAll('.animate-confetti-fall').length, cup: card.querySelectorAll('.victory-cup').length };
    }, SLOW_MS);
    check('K6a', second.states === 'still', `a second mount of the same key must be still and stay still; saw ${second.states}`);
    check('K6a', second.slow === 0 && second.old === 0 && second.confetti === 0 && second.cup === 1, `a still card must hold nothing longer than ${SLOW_MS} ms, no old number and no confetti, with its cup drawn; saw ${second.slow} slow, ${second.old} old, ${second.confetti} confetti, ${second.cup} cup`);
    await page.evaluate(() => window.rig.clear());

    /* (b) a key settled on load is still on its very first mount. */
    await page.evaluate(() => window.rig.settle(['rig|k6b', null]));
    await mount(page, { ...once, mount: 'b', spec: { ...once.spec, key: 'rig|k6b' } });
    await settle(700);
    const loaded = await page.evaluate(() => window.rig.states.join('>'));
    check('K6b', loaded === 'still', `a key the save already held must be still on its first mount; saw ${loaded}`);
    await page.evaluate(() => window.rig.clear());

    /* (c) below the fold it waits, unsettled and paused; seen, it plays. */
    await mount(page, { ...once, mount: 'c', top: 3000, spec: { ...once.spec, key: 'rig|k6c' } });
    await settle(900);
    const waiting = await page.evaluate(() => {
      const card = document.querySelector('[data-career-moment]');
      const moving = [...card.querySelectorAll('[data-cmo-beat], [data-cmo-number] *, .victory-cup')].filter(el => getComputedStyle(el).animationName !== 'none');
      return { state: card.getAttribute('data-cmo-state'), settled: window.rig.settled('rig|k6c'), moving: moving.length, running: moving.filter(el => getComputedStyle(el).animationPlayState !== 'paused').length, cup: getComputedStyle(card.querySelector('.victory-cup')).animationPlayState };
    });
    check('K6c', waiting.state === 'fresh' && waiting.settled === false, `a scene 3000 px below the fold must wait unsettled; it is ${waiting.state} and settled is ${waiting.settled}`);
    check('K6c', waiting.moving >= 5 && waiting.running === 0 && waiting.cup === 'paused', `while it waits every beat and the cup hold their first frame; ${waiting.running} of ${waiting.moving} are running and the cup is ${waiting.cup}`);
    await page.evaluate(() => document.querySelector('[data-career-moment]').scrollIntoView());
    await waitState(page, 'live').catch(() => undefined);
    const seen = await page.evaluate(() => ({ state: document.querySelector('[data-career-moment]').getAttribute('data-cmo-state'), settled: window.rig.settled('rig|k6c') }));
    check('K6c', seen.state === 'live' && seen.settled === true, `scrolled into view it must go live and be settled; it is ${seen.state} and settled is ${seen.settled}`);
    await page.evaluate(() => { window.rig.clear(); window.scrollTo(0, 0); });

    /* (d) a null key is never animated. */
    await mount(page, { ...once, mount: 'd', spec: { ...once.spec, key: null } });
    await settle(400);
    check('K6d', (await stateNow()) === 'still', `a scene with a null key must be still; it is ${await stateNow()}`);
    await page.evaluate(() => window.rig.clear());

    /* K8. The button can be pressed on the very first frame and fires once.
       Pressed at its own coordinates, three times, with the play held at 0. */
    for (const fx of FIXTURES.filter(f => f.done)) {
      await mount(page, { ...fx, mount: `k8-${fx.name}`, spec: { ...fx.spec, key: `rig|k8|${fx.name}` } });
      await waitState(page, 'live').catch(() => undefined);
      const spot = await page.evaluate(() => {
        for (const a of document.getAnimations()) { a.pause(); a.currentTime = 0; }
        window.rig.done = 0;
        const buttons = document.querySelectorAll('[data-career-moment] button');
        const r = buttons[0].getBoundingClientRect();
        return { buttons: buttons.length, x: r.x + r.width / 2, y: r.y + r.height / 2, height: r.height };
      });
      for (let i = 0; i < 3; i++) await page.mouse.click(spot.x, spot.y);
      const fired = await page.evaluate(() => window.rig.done);
      check('K8', spot.buttons === 1 && spot.height >= 44, `${fx.name}: a scene with onDone draws one button at least 44 px tall; found ${spot.buttons} at ${spot.height} px`);
      check('K8', fired === 1, `${fx.name}: three presses on the first frame must call onDone exactly once; it was called ${fired} time(s)`);
      await page.evaluate(() => window.rig.clear());
    }
    await mount(page, { ...FIXTURES[0], mount: 'k8-none', spec: { ...FIXTURES[0].spec, key: 'rig|k8|none' } });
    check('K8', (await page.locator('[data-career-moment] button').count()) === 0, 'a scene without onDone must draw no button');
    await page.evaluate(() => window.rig.clear());
    await mount(page, { ...F2, mount: 'k8-embedded', embedded: true, spec: { ...F2.spec, key: 'rig|k8|embedded' } });
    await waitState(page, 'live').catch(() => undefined);
    await settle(400);
    const embedded = await page.evaluate(() => ({ buttons: document.querySelectorAll('[data-career-moment] button').length, bar: document.querySelectorAll('.cmo-bar').length, confetti: document.querySelectorAll('.animate-confetti-fall').length }));
    check('K8', embedded.buttons === 0 && embedded.bar === 0 && embedded.confetti === 0, `an embedded scene has no button, no bar and no confetti; found ${embedded.buttons}, ${embedded.bar}, ${embedded.confetti}`);
    await page.evaluate(() => window.rig.clear());
    await checkSideEffects(page, 'the once and button page');
    check('RIG', trouble.length === 0, `the once and button page reported ${trouble.length} error(s): ${trouble.slice(0, 2).join(' | ')}`);
    await page.close();
  }

  /* K7's height bound: the tallest stand alone fixture at 320 px, at rest. */
  {
    const tallest = heights.reduce((best, h) => (h[1] > best[1] ? h : best), ['none', 0]);
    console.log(`   K7 heights at 320 px, at rest: ${heights.map(h => `${h[0]} ${h[1]}`).join(', ')}; tallest ${tallest[0]} at ${tallest[1]} px, bound ${K7_BOUND} px`);
    check('K7', heights.length === FIXTURES.length && tallest[1] > 0, `only ${heights.length} of ${FIXTURES.length} fixtures were measured at 320 px`);
    check('K7', tallest[1] <= K7_BOUND, `the tallest scene at 320 px is ${tallest[0]} at ${tallest[1]} px, over the bound of ${K7_BOUND} px`);
  }
  if (moved.length) console.log(`   K4 early frames at 390 px: ${moved.filter(m => m.includes(' 390px ')).join(' ; ')}`);
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
