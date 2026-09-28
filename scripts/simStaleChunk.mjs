/* Round 667: a stale lazy chunk after a deploy reloads the page once, it does
   not paint "This page broke".

   Two players reported it in the days after the 2026-09-22 deploy: Club
   Manager "sends me to the home screen when I change the tactic", and Soccer
   Career "says it broke and the advance buttons stop working". Neither game
   navigates home. RouteErrorBoundary does, and it paints after a dynamic
   import rejects because the tab's old entry bundle asked for a chunk whose
   hashed filename left the host with the deploy. Club Manager lazy loads
   eight panels, and the tactics tab is the first thing a returning player
   taps.

   This reads the CODE of the three files involved, never their comments (the
   simPrerender house rule: prose about a check is the one place its string is
   guaranteed to appear), and holds four things:

   1. src/lib/freshBuild.ts registers a window listener for vite:preloadError
      that cancels the event, and watchForNewBuild wires it;
   2. the reload is guarded by a sessionStorage once flag, so a host that is
      genuinely down shows the boundary on the second failure instead of
      reloading forever;
   3. RouteErrorBoundary catches a chunk load error and reloads once before
      painting, through the same guard rather than a second one;
   4. src/main.tsx still calls watchForNewBuild at boot, so the listener is
      live on every page.

   Negative controls (SIM_STALE_CHUNK_CONTROL): nolistener deletes the
   addEventListener call from an in memory copy (section 1 red), noguard
   removes the sessionStorage set so the once flag never lands (section 2
   red). Each asserts its anchor exists exactly once first. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_STALE_CHUNK_CONTROL || '';
const EXPECT = { nolistener: [1], noguard: [2] };
if (CONTROL && !(CONTROL in EXPECT)) { console.error('unknown control ' + CONTROL); process.exit(1); }

/* Strip block and line comments so a check can only be satisfied by code. */
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
function rewrite(src, anchor, replacement, why) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`${why}: anchor appears ${n} times, refusing to run a dead control`); process.exit(2); }
  return src.replace(anchor, replacement);
}

let fresh = fs.readFileSync(path.join(ROOT, 'src/lib/freshBuild.ts'), 'utf8').replaceAll('\r\n', '\n');
const boundary = code(fs.readFileSync(path.join(ROOT, 'src/components/RouteErrorBoundary.tsx'), 'utf8').replaceAll('\r\n', '\n'));
const main = code(fs.readFileSync(path.join(ROOT, 'src/main.tsx'), 'utf8').replaceAll('\r\n', '\n'));
if (CONTROL === 'nolistener') fresh = rewrite(fresh, "window.addEventListener('vite:preloadError', (event: Event) => {", "((event: Event) => {", 'nolistener');
if (CONTROL === 'noguard') fresh = rewrite(fresh, "sessionStorage.setItem(STALE_KEY, '1');", '', 'noguard');
const freshCode = code(fresh);

let failures = 0; const red = new Set(); let section = 0;
const fail = m => { failures++; red.add(section); console.log('   FAIL ' + m); };
const ok = m => console.log('   ok   ' + m);

section = 1;
console.log('1) freshBuild listens for vite:preloadError and cancels it');
{
  const listens = /window\.addEventListener\(\s*['"]vite:preloadError['"]/.test(freshCode);
  const cancels = /preventDefault\(\)/.test(freshCode);
  const wired = /function watchForNewBuild[\s\S]*?reloadOnStaleChunk\(\)/.test(freshCode);
  if (!listens) fail('no window.addEventListener for vite:preloadError in the code');
  if (!cancels) fail('the listener never calls preventDefault, so the import still throws');
  if (!wired) fail('watchForNewBuild does not wire reloadOnStaleChunk, so nothing registers it');
  if (listens && cancels && wired) ok('listener registered from watchForNewBuild, event cancelled');
}

section = 2;
console.log('2) the reload happens once per tab, through a sessionStorage flag');
{
  const fn = freshCode.match(/function reloadOnceForStaleChunk\(\)[\s\S]*?\n\}/);
  if (!fn) fail('reloadOnceForStaleChunk is missing');
  else {
    const body = fn[0];
    const reads = /sessionStorage\.getItem\(STALE_KEY\)/.test(body);
    const sets = /sessionStorage\.setItem\(STALE_KEY/.test(body);
    const reloads = /window\.location\.reload\(\)/.test(body);
    const setBeforeReload = sets && reloads && body.indexOf('sessionStorage.setItem') < body.indexOf('window.location.reload');
    if (!reads) fail('the guard never reads the flag');
    if (!sets) fail('the guard never sets the flag, so it would reload on every failure');
    if (!reloads) fail('the guard never reloads');
    if (sets && reloads && !setBeforeReload) fail('the flag is set after the reload call, so a fast reload could skip it');
    if (reads && sets && reloads && setBeforeReload) ok('flag read, set, then reload, in that order');
  }
}

section = 3;
console.log('3) RouteErrorBoundary reloads once on a chunk load error through the same guard');
{
  const catches = /componentDidCatch\s*\(/.test(boundary);
  const uses = /isStaleChunkError\(/.test(boundary) && /reloadOnceForStaleChunk\(/.test(boundary);
  const imports = /from ['"]@\/lib\/freshBuild['"]/.test(boundary);
  const ownGuard = /sessionStorage\.(get|set)Item/.test(boundary);
  if (!catches) fail('no componentDidCatch, so a caught chunk error goes straight to the broken page');
  if (!uses) fail('componentDidCatch does not classify the error and call the shared reload');
  if (!imports) fail('the boundary does not import from freshBuild, so it cannot share the once guard');
  if (ownGuard) fail('the boundary keeps its own sessionStorage guard, two guards can reload twice');
  if (catches && uses && imports && !ownGuard) ok('chunk errors reload once through the shared guard');
}

section = 4;
console.log('4) main.tsx still boots the watcher');
{
  if (!/watchForNewBuild\(\)/.test(main)) fail('main.tsx no longer calls watchForNewBuild, so the listener is never registered');
  else ok('watchForNewBuild() called at boot');
}

console.log('');
if (CONTROL) {
  const want = EXPECT[CONTROL]; const got = [...red].sort();
  const same = got.length === want.length && want.every(w => red.has(w));
  if (same) { console.log(`simStaleChunk: control ${CONTROL} turned section(s) ${want.join(', ')} red and nothing else. The check works.`); process.exit(1); }
  console.log(`simStaleChunk: control ${CONTROL} should have reddened exactly ${want.join(', ')}, got [${got.join(', ') || 'none'}]. The control proves nothing.`); process.exit(2);
}
if (failures) { console.error(`simStaleChunk: ${failures} failure(s) in section(s) ${[...red].sort().join(', ')}`); process.exit(1); }
console.log('simStaleChunk: green. A tab left open across a deploy reloads once for a missing chunk instead of painting the broken page.');
