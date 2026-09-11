/**
 * Round 544: one game falling over must not take the site with it.
 *
 * WHY THIS EXISTS. On 2026-09-11 a player reported that Club Manager crashed on
 * "See Season Review" and they could not progress. Round 541 fixed the throw.
 * The other half of that report was that there was no error boundary anywhere
 * in the app: a grep for ErrorBoundary, componentDidCatch and
 * getDerivedStateFromError across the whole repo returned nothing. So the throw
 * unmounted the entire React root and the visitor got a white page with no
 * header, no footer, no link home and no report a bug button, because every one
 * of those lives inside the tree that had just come down.
 *
 * That turned one render bug on one of 130-odd routes into a total site failure
 * for that visitor, every time, and it had been true since the site was built.
 *
 * WHAT THIS HOLDS:
 *   1. A boundary exists and implements the React contract that actually
 *      RECOVERS: the static getDerivedStateFromError. componentDidCatch alone
 *      stops the throw and then renders nothing, which the nocatch control
 *      below demonstrates rather than asserts.
 *   2. It really catches. A child that throws during render is rendered through
 *      the real React reconciler, and the boundary's recovery screen has to
 *      come out the other side. This is the section that would have been false
 *      before this round, and it asserts an outcome rather than the presence of
 *      a file.
 *   3. The recovery screen is usable: a link back to the home page, and the
 *      sentence telling a player their save is still on the device. A boundary
 *      that catches and then shows nothing is the white page again with extra
 *      steps.
 *   4. It wraps the routes in src/App.tsx, and inside the Suspense boundary so
 *      the global footer still renders underneath it. The footer is where the
 *      report a bug button lives, and it is the most useful thing on the screen
 *      at the moment a page has broken.
 *   5. The boundary's own render is trivial: no hooks, no imports of game code,
 *      no data access. It is the last thing standing when something else has
 *      already failed, so if it can throw there is nothing underneath it.
 *
 * NEGATIVE CONTROLS, one per claim that could go green for the wrong reason:
 *   BOUNDARY_CONTROL=unwrapped removes the boundary from the in-memory copy of
 *   src/App.tsx, which is exactly the state the file shipped in, and section 4
 *   must go red.
 *   BOUNDARY_CONTROL=nocatch strips the static getDerivedStateFromError from
 *   the component before bundling, leaving componentDidCatch in place. That is
 *   the plausible half-fix somebody writes when they think logging the error is
 *   the job, and SECTION 2 must go red on it: the boundary stops the throw but
 *   renders nothing, which is the white page again with extra steps. Section 1
 *   stays green under it on purpose, because it reads the real shipped file and
 *   the control only mutates the copy that gets bundled. Section 2 is the one
 *   that matters: without it this harness would be asserting a file exists.
 * Both assert the mutation really changed the source first and refuse to run
 * otherwise.
 *
 * Run: node scripts/simErrorBoundary.mjs      (no database, no build)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CONTROL = process.env.BOUNDARY_CONTROL || '';
const KNOWN_CONTROLS = ['unwrapped', 'nocatch'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`BOUNDARY_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const BOUNDARY_SRC_PATH = path.join(ROOT, 'src/components/RouteErrorBoundary.tsx');
if (!fs.existsSync(BOUNDARY_SRC_PATH)) {
  console.error('there is no RouteErrorBoundary.tsx at all');
  process.exit(1);
}
const boundarySrc = fs.readFileSync(BOUNDARY_SRC_PATH, 'utf8');

let appSrc = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
if (CONTROL === 'unwrapped') {
  const open = /\s*<RouteErrorBoundary resetKey=\{pathname\}>\n/;
  const close = /\s*<\/RouteErrorBoundary>\n/;
  if (!open.test(appSrc) || !close.test(appSrc)) {
    console.error('CONTROL unwrapped cannot find the boundary in App.tsx, so it would change nothing');
    process.exit(1);
  }
  const mutated = appSrc.replace(open, '\n').replace(close, '\n');
  if (mutated === appSrc) { console.error('CONTROL unwrapped changed nothing'); process.exit(1); }
  appSrc = mutated;
  console.log('   NEGATIVE CONTROL ON: the boundary removed from App.tsx, section 4 must go red');
}

/* ------------------------------------------------------------------ */
console.log('\n1) A boundary exists and implements the contract that actually catches');
if (!/static\s+getDerivedStateFromError/.test(boundarySrc)) {
  fail('no static getDerivedStateFromError: componentDidCatch alone stops the throw and then renders nothing, which is a blank page rather than a recovery');
}
if (!/class\s+RouteErrorBoundary\s+extends\s+Component/.test(boundarySrc)) {
  fail('RouteErrorBoundary is not a class component, and only a class can be an error boundary in React 18');
}
if (!failures) console.log('   getDerivedStateFromError present on a class component');

/* ------------------------------------------------------------------ */
console.log('2) It really catches: a throwing child rendered through the real reconciler');
let before = failures;
/* A REAL client render in a real DOM. React's SERVER renderer does not support
   error boundaries at all, it rethrows, so renderToStaticMarkup would report
   this boundary as broken when it is fine. jsdom plus react-dom/client is the
   reconciler the players actually run.

   Only the component is bundled, with react left external, and the bundle is
   written inside the repo so that bare import resolves. jsdom itself is never
   bundled: it is a node package full of builtins that esbuild cannot inline. */
const BUNDLE = path.join(ROOT, 'node_modules', '.dukb-boundary-bundle.mjs');
let bundleFrom = BOUNDARY_SRC_PATH;
if (CONTROL === 'nocatch') {
  const marker = /\n  static getDerivedStateFromError\(\): State \{[\s\S]*?\n  \}\n/;
  if (!marker.test(boundarySrc)) {
    console.error('CONTROL nocatch cannot find getDerivedStateFromError to strip, so it would change nothing');
    process.exit(1);
  }
  const mutated = boundarySrc.replace(marker, '\n');
  if (mutated === boundarySrc) { console.error('CONTROL nocatch changed nothing'); process.exit(1); }
  bundleFrom = path.join(ROOT, 'node_modules', '.dukb-boundary-nocatch.tsx');
  fs.writeFileSync(bundleFrom, mutated);
  console.log('   NEGATIVE CONTROL ON: getDerivedStateFromError stripped, sections 1 and 2 must go red');
}
execSync(`${ROOT}/node_modules/.bin/esbuild ${bundleFrom} --bundle --format=esm --platform=neutral --jsx=automatic --external:react --external:react-dom --external:react/jsx-runtime --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { JSDOM } = await import('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://douknowball.com/club-manager' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
/* node 22 defines navigator as a getter only, so it needs redefining rather than assigning */
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import('react')).default;
const { flushSync } = await import('react-dom');
const { createRoot } = await import('react-dom/client');
const RouteErrorBoundary = (await import(pathToFileURL(BUNDLE).href)).default;
for (const f of [BUNDLE, path.join(ROOT, 'node_modules', '.dukb-boundary-nocatch.tsx')]) { try { fs.unlinkSync(f); } catch { /* best effort */ } }

const Boom = () => { throw new Error('deliberate test throw'); };

const renderInto = child => {
  const host = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  /* React logs a caught error to console.error on the way past. Silence it so a
     passing run does not read like a failing one. */
  const realError = console.error;
  console.error = () => {};
  try {
    flushSync(() => root.render(React.createElement(RouteErrorBoundary, { resetKey: '/club-manager' }, child)));
  } finally {
    console.error = realError;
  }
  return host.innerHTML;
};

let caught = '';
try {
  caught = renderInto(React.createElement(Boom));
} catch (e) {
  fail(`the throw escaped the boundary: ${e.message}. A child that throws still takes the tree down.`);
}
const healthy = renderInto(React.createElement('p', null, 'the real page'));
if (!/the real page/.test(healthy)) fail('the boundary does not render its children when nothing is wrong');
if (/deliberate test throw/.test(caught)) fail('the raw error text reached the page');
if (!caught) fail('the boundary caught the throw but rendered nothing, which is the white page again with extra steps');
if (failures === before) console.log('   a throwing child was caught and a healthy child rendered through untouched');

/* ------------------------------------------------------------------ */
console.log('3) The recovery screen gives the player a way out and tells them the save is safe');
before = failures;
if (!caught) {
  fail('section 2 produced no markup, so there is nothing here to check and this section must not read as green');
} else {
  if (!/href="\/"/.test(caught)) fail('no link back to the home page, so the visitor is stuck exactly as they were on the white page');
  if (!/still on this device/i.test(caught)) fail('the screen does not say the save survived, and "the page went blank" and "my career is gone" feel identical from the player side');
  if (!/report a bug/i.test(caught)) fail('the screen does not point at the report a bug button');
  if (caught.length < 200) fail(`the recovery screen is ${caught.length} characters, which is not a usable page`);
}
if (failures === before) console.log('   home link, save reassurance and the report a bug pointer all present');

/* ------------------------------------------------------------------ */
console.log('4) It wraps the routes in App.tsx, inside Suspense so the footer survives');
before = failures;
const openIdx = appSrc.indexOf('<RouteErrorBoundary');
const closeIdx = appSrc.indexOf('</RouteErrorBoundary>');
const routesIdx = appSrc.indexOf('<Routes>');
const routesEnd = appSrc.indexOf('</Routes>');
const suspenseIdx = appSrc.indexOf('<Suspense');
const footerIdx = appSrc.indexOf('<Footer />');
if (openIdx < 0 || closeIdx < 0) {
  fail('src/App.tsx does not wrap anything in RouteErrorBoundary, so a render throw still unmounts the whole root');
} else {
  if (!(openIdx < routesIdx && routesEnd < closeIdx)) fail('the boundary does not enclose <Routes>');
  if (!(suspenseIdx >= 0 && suspenseIdx < openIdx)) fail('the boundary is not inside the Suspense boundary');
  if (!(footerIdx >= 0 && closeIdx < footerIdx)) fail('the global footer is inside the boundary, so a crash takes the report a bug button with it');
}
if (failures === before) console.log('   wraps Routes, inside Suspense, with the footer outside it');

/* ------------------------------------------------------------------ */
console.log('5) The boundary\'s own render is trivial, because nothing catches it');
before = failures;
const body = boundarySrc.slice(boundarySrc.indexOf('export class RouteErrorBoundary'));
for (const [what, re] of [
  ['a hook', /\buse[A-Z]\w*\(/],
  ['a dynamic import', /\bimport\(/],
  ['a fetch', /\bfetch\(/],
  ['localStorage', /localStorage/],
  ['a clock read', /Date\.now\(\)|new Date\(/],
]) {
  if (re.test(body)) fail(`the boundary uses ${what}, and it is the last thing standing when something else has already failed`);
}
if (failures === before) console.log('   no hooks, no imports, no fetch, no storage, no clock');

/* ------------------------------------------------------------------ */
if (CONTROL) {
  if (failures > 0) { console.log(`\n   CONTROL FIRED: the ${CONTROL} mutation was caught`); process.exit(0); }
  console.error(`\n   CONTROL DID NOT FIRE: the harness cannot see the ${CONTROL} mutation`);
  process.exit(1);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsimErrorBoundary: all green');
