import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
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

const framePath = path.join(root, 'src/components/club-manager/ClubManagerFrame.tsx');
const loadingHeight = 'max-sm:min-h-svh';
let frame = fs.readFileSync(framePath, 'utf8');
if (process.env.CM_OPENING_CONTROL === 'short-startup') {
  assert(frame.includes(loadingHeight), 'the control needs a reserved loading height');
  frame = frame.replace(loadingHeight, '');
}
const startupClass = frame.replace(/\/\*[\s\S]*?\*\//g, '')
  .match(/return <div role="status" data-cm-startup className=\{([^}]+)\}/)?.[1];
assert(startupClass?.includes(loadingHeight), 'saved startup reserves one viewport on single-column phones');
const entrySource = fs.readFileSync(path.join(root, entry), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'src/pages/ClubManager.tsx'), 'utf8');
assert.match(entrySource, /fallback=\{direct\s*\? <ClubManagerStartup\b[^>]*>Loading Club Manager/);
assert.match(runtime, /return shell\(<ClubManagerStartup\b[^>]*>Loading…<\/ClubManagerStartup>\);/);
assert.match(runtime, /<Suspense fallback=\{<ClubManagerStartup\b[^>]*>Loading screen\.\.\.<\/ClubManagerStartup>\}>\s*<ManagerSlotsScreen\b/);
assert(startupClass?.includes('min-h-48 py-12 text-sm'), 'the shared startup owns the tablet and desktop height');
assert.match(entrySource, /<ClubManagerStartup>Loading Club Manager/);
assert.match(runtime, /<ClubManagerStartup className="animate-pulse">Loading…/);
assert.match(runtime, /<ClubManagerStartup>Loading screen/);
assert.equal([...entrySource.matchAll(/<ClubManagerStartup\b/g)].length, 1);
assert.equal([...runtime.matchAll(/<ClubManagerStartup\b/g)].length, 2);
console.log('Startup layout: only direct entry, generic boot and manager-slot loading reserve the mobile viewport.');
