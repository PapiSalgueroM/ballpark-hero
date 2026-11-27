import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, transformSync } from 'esbuild';
import { createElement } from 'react';
import ts from 'typescript';
import { importBundled } from './lib/cmFixtureSources/gameBundle.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const route = /const ClubManager = lazy\(\(\) => import\(["']\.\/(pages\/[^"']+)["']\)\)/.exec(app)?.[1];
assert(route, 'the App must route Club Manager through its lazy entry');
const entry = 'src/' + route + '.tsx';
const control = process.env.CM_OPENING_CONTROL === 'eager';
if (control) {
  assert(!entry.endsWith('/ClubManager.tsx'), 'control needs the lightweight entry');
}
const bundle = await build({
  absWorkingDir: root, bundle: true, write: false, format: 'esm', splitting: true, metafile: true,
  outdir: 'cm-opening-probe', logLevel: 'error',
  ...(control ? { stdin: { contents: `export * from './src/lib/clubManager'; export { default } from './${entry}';`, resolveDir: root } } : { entryPoints: [entry] }),
});
const outputs = bundle.metafile.outputs;
const first = Object.entries(outputs).find(([, output]) => output.entryPoint === (control ? '<stdin>' : entry))?.[0];
assert(first, 'the selected route must emit a first chunk');
const reachable = new Set();
const inputs = new Set();
function walk(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const input of Object.keys(outputs[file].inputs)) inputs.add(input);
  for (const target of outputs[file].imports) {
    if (!target.external && target.kind === 'import-statement') walk(target.path);
  }
}
walk(first);
const forbidden = /\/((useClubManager|clubManager|clubManagerEras|ClubManagerClubList|clubManagerRosters|clubManagerWorldRosters)\.[tj]sx?)$/;
assert(![...inputs].some(input => forbidden.test(input)),
  'the first Club Manager route chunk must not statically load gameplay, boot, or roster data: ' + [...inputs].filter(input => forbidden.test(input)).join(', '));
console.log('Opening graph: the actual App route can load without Club Manager engine, roster, or career boot.');

const { gate, keys, eras, engineEras } = await importBundled(`
  export * as gate from '@/lib/clubManagerOpening';
  export * as keys from '@/lib/clubManagerSaveKeys';
  export * as eras from '@/lib/clubManagerEraCards';
  export * as engineEras from '@/lib/clubManagerEras';
`);
const { SAVE_KEY, parkedKey, SLOT_COUNT } = keys;
const noData = () => null;
assert.equal(gate.hasClubManagerBootData(noData, noData), false);
assert.equal(gate.hasClubManagerBootData(() => { throw new Error('blocked store'); }, noData), true);
assert.equal(gate.hasClubManagerBootData(noData, () => { throw new Error('blocked session'); }), true);
for (const key of [SAVE_KEY, ...Array.from({ length: SLOT_COUNT }, (_, slot) => parkedKey(slot + 1))]) {
  for (const value of ['', '{bad data', '{"clubName":"Arsenal"}']) {
    assert.equal(gate.hasClubManagerBootData(k => k === key ? value : null, noData), true, key);
  }
}
assert.equal(gate.hasClubManagerBootData(noData, key => key === 'dukb-cm-land-on-hub' ? '1' : null), true);
console.log('Save gate: empty storage can open the picker; active, parked, damaged, blocked, and Hot Seat storage go through career boot.');

const { CM_ERA_CARDS } = eras;
assert.equal(CM_ERA_CARDS.length, 5);
assert.deepEqual(CM_ERA_CARDS.map(era => era.id), ['now', 'era2020', 'era2015', 'era2010', 'era2005']);
assert.deepEqual(CM_ERA_CARDS.map(({ id, label, startYear, emoji, blurb }) => ({ id, label, startYear, emoji, blurb })),
  engineEras.CM_ERAS.map(({ id, label, startYear, emoji, blurb }) => ({ id, label, startYear, emoji, blurb })));
console.log('Era data: all five opening cards use the engine era IDs, labels, years, icons and descriptions.');

const deferred = Object.entries(outputs).filter(([file]) => !reachable.has(file));
assert(deferred.some(([, output]) => Object.keys(output.inputs).some(input => input.endsWith('/useClubManager.ts'))));
assert(deferred.some(([, output]) => Object.keys(output.inputs).some(input => input.endsWith('/ClubManagerClubList.tsx'))));
console.log('Deferred graph: the existing career boot and canonical roster catalogue remain reachable.');

function parsePage(file) {
  return ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function matches(tree, test) {
  const found = [];
  function visit(node) {
    if (test(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return found;
}
const usesStartup = node => ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'ClubManagerStartup';
function initializer(tree, name) {
  const vars = matches(tree, node => ts.isVariableDeclaration(node) && node.name.getText() === name);
  assert.equal(vars.length, 1, name);
  return vars[0].initializer.getText();
}
function evaluate(expression, scope = {}) {
  // Compile the actual TSX expression and supply only the bindings this render uses.
  const { code } = transformSync('return (' + expression + ');', { loader: 'tsx', jsxFactory: 'createElement' });
  return Function('createElement', ...Object.keys(scope), code)(createElement, ...Object.values(scope));
}
const frame = parsePage('src/components/club-manager/ClubManagerFrame.tsx');
const declaration = matches(frame, n => ts.isFunctionDeclaration(n) && n.name?.text === 'ClubManagerStartup');
assert.equal(declaration.length, 1);
let startupSource = declaration[0].getText().replace(/^export\s+/, '');
const loadingHeight = 'max-sm:min-h-svh';
if (process.env.CM_OPENING_CONTROL === 'short-startup') {
  assert(startupSource.includes(loadingHeight), 'the control needs a reserved loading height');
  startupSource = startupSource.replace(loadingHeight, '');
}
const ClubManagerStartup = evaluate(startupSource);
function checkStartup(element, label, saved, pulse = false) {
  assert.equal(element.type, ClubManagerStartup, label);
  const status = ClubManagerStartup(element.props);
  assert.equal(status.type, 'div');
  assert.equal(status.props.role, 'status');
  assert.equal(status.props.children, label);
  assert.equal(status.props['data-cm-startup'], saved ? '' : undefined, label + ' saved-career marker');
  const classes = new Set(status.props.className.split(/\s+/));
  assert(classes.has(loadingHeight), 'startup reserves one viewport on single-column phones');
  for (const name of ['min-h-48', 'py-12', 'text-sm']) assert(classes.has(name), 'startup class ' + name);
  if (pulse) assert(classes.has('animate-pulse'), 'generic boot retains its status animation');
}
function suspenseFallback(node) {
  const attribute = node.parent.parent;
  assert(ts.isJsxAttribute(attribute) && attribute.name.getText() === 'fallback');
  const suspense = attribute.parent.parent;
  assert(ts.isJsxOpeningElement(suspense) && suspense.tagName.getText() === 'Suspense');
  return suspense.parent;
}
const entryTree = parsePage(entry);
const runtimeTree = parsePage('src/pages/ClubManager.tsx');
const entryUses = matches(entryTree, usesStartup);
const runtimeUses = matches(runtimeTree, usesStartup);
assert.equal(entryUses.length, 1);
assert.equal(runtimeUses.length, 2);
const entryChoice = entryUses[0].parent;
assert(ts.isConditionalExpression(entryChoice));
const entryBoundary = suspenseFallback(entryChoice);
assert(entryBoundary.children.some(child => ts.isJsxSelfClosingElement(child) && child.tagName.getText() === 'ClubManagerContents'));
const picker = Symbol('public picker');
const directCheck = initializer(entryTree, 'openDirect');
for (const [direct, requestedSlot, expected] of [
  [true, undefined, true], [false, 2, true], [false, null, true], [false, undefined, false],
]) {
  const openDirect = evaluate(directCheck, { direct, requestedSlot });
  const element = evaluate(entryChoice.getText(), { openDirect, picker, ClubManagerStartup });
  if (expected) checkStartup(element, 'Loading Club Manager...', true);
  else assert.equal(element, picker, 'a public era pick keeps its picker during the module load');
}
const boot = runtimeUses.find(node => ts.isCallExpression(node.parent) && node.parent.expression.getText() === 'shell');
assert(boot, 'generic boot status goes into the game shell');
const publicSetupCheck = initializer(runtimeTree, 'loadingPublicSetup');
for (const [initialEra, requestedSlot, hasData, saved] of [
  ['now', undefined, false, false], [undefined, undefined, false, true],
  ['now', 2, false, true], ['now', undefined, true, true],
]) {
  const loadingPublicSetup = evaluate(publicSetupCheck, { initialEra, requestedSlot, hasClubManagerBootData: () => hasData });
  checkStartup(evaluate(boot.getText(), { ClubManagerStartup, loadingPublicSetup }), 'Loading…', saved, true);
}
const slots = runtimeUses.find(node => node !== boot);
const slotBoundary = suspenseFallback(slots);
assert(slotBoundary.children.some(child => ts.isJsxSelfClosingElement(child) && child.tagName.getText() === 'ManagerSlotsScreen'));
checkStartup(evaluate(slots.getText(), { ClubManagerStartup }), 'Loading screen...', true);
console.log('Startup layout: direct requests, public setup, saved boot and slot fallback use the correct marker and responsive height.');
