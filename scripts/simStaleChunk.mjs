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
      reloading forever, and it stands down under the prerenderer
      (window.__DUKB_PRERENDER__), where no chunk can be stale and a reload
      mid capture would strand the snapshot;
   3. RouteErrorBoundary catches a chunk load error and reloads once before
      painting, through the same guard rather than a second one;
   4. src/main.tsx still calls watchForNewBuild at boot, so the listener is
      live on every page;
   5. (Round 1144) every reload freshBuild.ts makes on the app's own account
      asks the storage seam for waiting saves first. A game whose save the
      browser refused keeps it in the open page for the player's Retry, and a
      reload throws it away: a review of Release AN saw a stale chunk do that,
      and the Season Center tile's Reload. Section 2 also holds the order in
      reloadOnceForStaleChunk: the ask comes before the once flag is set, so
      a reload that was held does not spend the tab's one reload.
   6. (Round 1144 review) the two reloads that sit on every page, a career's
      included, do the same: the update toast's Refresh goes through
      reloadToRetryChunk, and the footer's Cookie choices retries a waiting
      save before it reloads. Section 3 also holds that the boundary lets
      go of held saves before it asks for its reload: by then the game
      that held them is unmounted, and a reload refused for their sake
      protected nothing and left the player on the broken page.
   7. (Round 1338) a page that has asked for its reload waits with it. The
      build makes a cancelled import wait (scripts/lib/vitePreloadWait.mjs,
      scripts/simPreloadWait.mjs), so freshBuild.ts keeps a page flag: the
      listener cancels on it before it asks reloadOnceForStaleChunk, after
      the optional kit line; the flag is declared false and set true exactly
      once, inside reloadOnceForStaleChunk, after the once flag is written
      and after window.location.reload() returns, so it is true only once
      the browser took the navigation.
   8. (Round 1338) a loader's own catch never reloads on its own. Across src
      (comments stripped, tests left out) no import() chain has a .catch that
      calls reloadToRetryChunk or location.reload, except the two
      SaveMovedNotice loaders (SoccerCareer.tsx and ClubManager.tsx), whose
      reload ends itself: each must be there exactly once. A catch that
      reloads by itself loops on a file that stays missing (CareerStory on
      the retired screen did) and, under blocked storage, throws away a
      career held in memory.

   Negative controls (SIM_STALE_CHUNK_CONTROL): nolistener deletes the
   addEventListener call from an in memory copy (section 1 red), noguard
   removes the sessionStorage set so the once flag never lands (section 2
   red), noprerender deletes the prerender stand down (section 2 red),
   nooffline (Release AM) deletes the offline stand down (section 2 red),
   nosave (Round 1144) deletes the ask for waiting saves from
   reloadOnceForStaleChunk (sections 2 and 5 red), norelease (Round 1144
   review) stops the boundary letting go of held saves before it asks for
   the reload (section 3 red), barenudge (Round 1144 review) puts the bare
   reload back on the update toast's Refresh (section 6 red), nowait (Round
   1338) takes the page flag out of the listener (section 7 red), flagfirst
   (Round 1338) sets the page flag above the once flag read (section 7 red),
   catchreload (Round 1338) puts CareerStory's old reloading catch back
   (section 8 red).
   Each asserts its anchor exists exactly once first. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_STALE_CHUNK_CONTROL || '';
const EXPECT = { nolistener: [1], noguard: [2], noprerender: [2], nooffline: [2], nosave: [2, 5], norelease: [3], barenudge: [6], nowait: [7], flagfirst: [7], catchreload: [8] };
/* Exit 2, never 1: 1 is a control that fired, and a mistyped name must not read as one. */
if (CONTROL && !(CONTROL in EXPECT)) { console.error('unknown control ' + CONTROL); process.exit(2); }

/* Strip block and line comments so a check can only be satisfied by code. */
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
function rewrite(src, anchor, replacement, why) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`${why}: anchor appears ${n} times, refusing to run a dead control`); process.exit(2); }
  return src.replace(anchor, replacement);
}

let fresh = fs.readFileSync(path.join(ROOT, 'src/lib/freshBuild.ts'), 'utf8').replaceAll('\r\n', '\n');
let boundaryRaw = fs.readFileSync(path.join(ROOT, 'src/components/RouteErrorBoundary.tsx'), 'utf8').replaceAll('\r\n', '\n');
let nudgeRaw = fs.readFileSync(path.join(ROOT, 'src/components/layout/UpdateNudge.tsx'), 'utf8').replaceAll('\r\n', '\n');
const footer = code(fs.readFileSync(path.join(ROOT, 'src/components/game/Footer.tsx'), 'utf8').replaceAll('\r\n', '\n'));
const main = code(fs.readFileSync(path.join(ROOT, 'src/main.tsx'), 'utf8').replaceAll('\r\n', '\n'));
if (CONTROL === 'nolistener') fresh = rewrite(fresh, "window.addEventListener('vite:preloadError', (event: Event) => {", "((event: Event) => {", 'nolistener');
if (CONTROL === 'noguard') fresh = rewrite(fresh, "sessionStorage.setItem(STALE_KEY, '1');", '', 'noguard');
/* Release AM: this control had been dead since Round 832 gave reloadToRetryChunk
   the same stand down line (two matches, so it refused to run). It now takes
   the one inside reloadOnceForStaleChunk, found by the line that follows it
   there and nowhere else.
   Release AN: one release later the merge killed it again. Round 1142's stand
   down (a session store that dies with the page) landed between the prerender
   line and the offline comment this was anchored on, so the anchor matched
   nothing and the control refused to run (exit 2, loudly, so nothing passed
   falsely). An anchor that names its neighbour dies whenever a line lands
   between the two, and it has now done that twice, so the control no longer
   names one: it cuts reloadOnceForStaleChunk out by its own declaration and
   deletes the prerender line inside that function only, wherever it sits.
   Both steps still refuse to run on anything but exactly one match. */
/* Round 1144: nosave is cut the same way, for the same reason (reloadToRetryChunk carries the same line). */
function cutFromStaleReload(LINE, why) {
  const HEAD = 'export function reloadOnceForStaleChunk(): boolean {\n';
  const from = fresh.indexOf(HEAD);
  const to = from < 0 ? -1 : fresh.indexOf('\n}\n', from);
  if (fresh.split(HEAD).length - 1 !== 1 || to < 0) { console.error(why + ': reloadOnceForStaleChunk is not declared exactly once, refusing to run a dead control'); process.exit(2); }
  fresh = fresh.slice(0, from) + rewrite(fresh.slice(from, to), LINE, '', why) + fresh.slice(to);
}
if (CONTROL === 'noprerender') cutFromStaleReload("  if ((window as unknown as { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__) return false;\n", 'noprerender');
if (CONTROL === 'nosave') cutFromStaleReload('  if (!settlePendingSaves()) return false;\n', 'nosave');
if (CONTROL === 'nooffline') fresh = rewrite(fresh, '  if (navigator.onLine === false) return false;', '', 'nooffline');
/* Round 1144 review: the two controls below edit the boundary and the update toast, in memory like the rest. */
if (CONTROL === 'norelease') boundaryRaw = rewrite(boundaryRaw, 'const unsaved = !releasePendingSaves();', 'const unsaved = false;', 'norelease');
if (CONTROL === 'barenudge') nudgeRaw = rewrite(nudgeRaw, 'if (reloadToRetryChunk() || !hasPendingSaves()) return;', 'window.location.reload();', 'barenudge');
/* Round 1338: the page flag, in memory like the rest. */
if (CONTROL === 'nowait') fresh = rewrite(fresh, 'if (reloadAsked || reloadOnceForStaleChunk())', 'if (reloadOnceForStaleChunk())', 'nowait');
if (CONTROL === 'flagfirst') {
  fresh = rewrite(fresh, '  reloadAsked = true;\n', '', 'flagfirst');
  fresh = rewrite(fresh, "  try {\n    if (sessionStorage.getItem(STALE_KEY) === '1') return false;", "  reloadAsked = true;\n  try {\n    if (sessionStorage.getItem(STALE_KEY) === '1') return false;", 'flagfirst');
}
const boundary = code(boundaryRaw);
const nudge = code(nudgeRaw);
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
    const standsDown = /__DUKB_PRERENDER__[^\n]*return false/.test(body);
    /* Release AM: offline, a reload lands on the browser's own offline page.
       The stand down has to come before the flag is set, or an offline
       failure spends the tab's one reload. */
    const offline = /navigator\.onLine === false[^\n]*return false/.test(body);
    const offlineFirst = offline && sets && body.indexOf('navigator.onLine') < body.indexOf('sessionStorage.setItem');
    /* Round 1144: a save the browser refused is retried once before the reload, and while it is
       still refused there is none. Before the flag, like offline, or a held reload spends the one. */
    const saves = /!settlePendingSaves\(\)\)\s*return false/.test(body);
    const savesFirst = saves && sets && body.indexOf('settlePendingSaves') < body.indexOf('sessionStorage.setItem');
    if (!saves) fail('the guard does not ask for waiting saves, so a stale chunk reloads over a save the browser refused and the player loses it');
    else if (sets && !savesFirst) fail('the ask for waiting saves comes after the once flag is set, so a held reload spends the one reload');
    if (!offline) fail('the guard does not stand down offline, so a failed chunk reloads onto the browser\'s own offline page');
    else if (sets && !offlineFirst) fail('the offline stand down comes after the once flag is set, so an offline failure spends the one reload');
    if (!standsDown) fail('the guard does not stand down under the prerenderer (window.__DUKB_PRERENDER__), so a capture could reload mid page');
    if (!reads) fail('the guard never reads the flag');
    if (!sets) fail('the guard never sets the flag, so it would reload on every failure');
    if (!reloads) fail('the guard never reloads');
    if (sets && reloads && !setBeforeReload) fail('the flag is set after the reload call, so a fast reload could skip it');
    if (standsDown && offlineFirst && savesFirst && reads && sets && reloads && setBeforeReload) ok('stands down under the prerenderer, offline and over a refused save, then flag read, set, then reload, in that order');
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
  /* Round 1144 review: when an error reaches this boundary the game under it is unmounted, and a save
     it was holding went with it. The boundary has to let go of the hold (after one last retry) BEFORE
     it asks for the reload, or the reload is refused for the sake of a save that is already gone and
     the player gets "This page broke" where one reload would have given him a working page. */
  const didCatch = (boundary.match(/componentDidCatch\s*\([\s\S]*?\n  \}/) ?? [''])[0];
  const lets = didCatch.indexOf('releasePendingSaves()');
  const releases = lets >= 0 && lets < didCatch.indexOf('reloadOnceForStaleChunk(');
  if (!releases) fail('componentDidCatch does not let go of held saves before it asks for the reload, so a chunk that fails inside a game with a refused save paints the broken page instead of reloading once');
  if (catches && uses && imports && !ownGuard && releases) ok('chunk errors reload once through the shared guard, after the held saves of the game that just went are let go');
}

section = 4;
console.log('4) main.tsx still boots the watcher');
{
  if (!/watchForNewBuild\(\)/.test(main)) fail('main.tsx no longer calls watchForNewBuild, so the listener is never registered');
  else ok('watchForNewBuild() called at boot');
}

section = 5;
console.log('5) every reload freshBuild makes asks for waiting saves first');
{
  /* each top level function, by its own text: a reload has to follow an ask in the SAME function */
  const fns = freshCode.match(/(?:async )?function \w+\([^)]*\)[^{]*\{[\s\S]*?\n\}/g) ?? [];
  const reloaders = fns.filter(fn => /window\.location\.reload\(\)/.test(fn));
  const nameOf = fn => (fn.match(/function (\w+)/) ?? [])[1] ?? '?';
  const bare = reloaders.filter(fn => { const ask = fn.indexOf('settlePendingSaves()'); return ask < 0 || ask > fn.indexOf('window.location.reload()'); });
  const total = (freshCode.match(/window\.location\.reload\(\)/g) ?? []).length;
  if (reloaders.length < 3 || total !== reloaders.length) fail(`${total} reload call(s) in ${reloaders.length} function(s) of freshBuild.ts, expected one each in at least three (check, reloadOnceForStaleChunk, reloadToRetryChunk): this check is not reading the file it thinks it is`);
  else if (bare.length) fail(`${bare.map(nameOf).join(', ')} reload${bare.length === 1 ? 's' : ''} without asking for waiting saves first, so a save the browser refused is thrown away`);
  else ok(`${reloaders.map(nameOf).join(', ')}: each asks for waiting saves before it reloads`);
}

section = 6;
console.log('6) the reloads on every page (the update toast, the footer) ask for waiting saves first');
{
  /* Round 1144 review: these two are mounted on every page, a career's included, and both reloaded
     bare. The update toast shows at the very moment check() above declines to reload over a refused
     save, so its Refresh goes through the same guard. The footer's Cookie choices has to work every
     time (it is how a choice is taken back), so it is not held: the save gets its retry first. */
  const nudgeBare = /location\.reload\(/.test(nudge);
  const nudgeGuarded = /reloadToRetryChunk\(\)/.test(nudge) && /from ['"]@\/lib\/freshBuild['"]/.test(nudge);
  const ask = footer.indexOf('settlePendingSaves()');
  const footerReloads = (footer.match(/location\.reload\(/g) ?? []).length;
  const footerAsks = footerReloads === 1 && ask >= 0 && ask < footer.indexOf('location.reload(');
  if (nudgeBare) fail('UpdateNudge reloads the page itself: its Refresh would go over a save the browser refused');
  if (!nudgeGuarded) fail('UpdateNudge does not reload through reloadToRetryChunk from freshBuild');
  if (!footerAsks) fail(`the footer has ${footerReloads} reload call(s) and ${ask < 0 ? 'never asks' : 'asks'} for waiting saves before the first: a refused save would not get its retry`);
  if (!nudgeBare && nudgeGuarded && footerAsks) ok('the update toast reloads through the shared guard, and the footer retries a waiting save before its reload');
}

section = 7;
console.log('7) a page that asked for its reload waits with it (the page flag)');
{
  /* Round 1338: the build makes a cancelled import wait, so cancelling is safe exactly when a reload is on
     its way. The flag must mean that and nothing else: declared false, set true once, only after the once
     flag is written and the browser took window.location.reload(), and read by the listener before it asks
     for a second reload (which the once flag would refuse, leaving the second failure to break the page). */
  const declared = (freshCode.match(/\blet reloadAsked = false;/g) ?? []).length;
  const sets = (freshCode.match(/\breloadAsked\s*=\s*true\b/g) ?? []).length;
  const writes = (freshCode.match(/\breloadAsked\s*=(?!=)/g) ?? []).length;
  const fn = (freshCode.match(/function reloadOnceForStaleChunk\(\)[\s\S]*?\n\}/) ?? [''])[0];
  const at = fn.search(/\breloadAsked\s*=\s*true\b/);
  /* a missing set or reload is section 2's finding; here only the order is read */
  const afterOnce = at > fn.indexOf('sessionStorage.setItem(STALE_KEY');
  const afterReload = at > fn.indexOf('window.location.reload()');
  const beforeReturn = at >= 0 && at < fn.lastIndexOf('return true');
  const listener = (freshCode.match(/function reloadOnStaleChunk\(\)[\s\S]*?\n\}/) ?? [''])[0];
  const waits = /if \(reloadAsked \|\| reloadOnceForStaleChunk\(\)\) event\.preventDefault\(\);/.test(listener);
  const kitFirst = listener.indexOf('isOptionalChunkError(') >= 0 && listener.indexOf('isOptionalChunkError(') < listener.indexOf('reloadAsked');
  if (declared !== 1) fail(`reloadAsked is declared false ${declared} time(s), expected once`);
  if (sets !== 1 || writes !== 2) fail(`reloadAsked is set true ${sets} time(s) and written ${writes} time(s), expected one set and the declaration`);
  if (at < 0) fail('reloadAsked is never set inside reloadOnceForStaleChunk, so a second failure in the page breaks it');
  else if (!afterOnce || !afterReload || !beforeReturn) fail('reloadAsked is set before the once flag is written or before window.location.reload() returns, so a page whose reload never came would wait for ever');
  if (!waits) fail('the listener does not cancel on reloadAsked before it asks reloadOnceForStaleChunk, so the second failure in a reloading page reaches a boundary');
  else if (!kitFirst) fail('the page flag is read before the optional kit line, so a sound kit error in a reloading page would be cancelled');
  if (declared === 1 && sets === 1 && writes === 2 && at >= 0 && afterOnce && afterReload && beforeReturn && waits && kitFirst) ok('declared false, set once after the once flag and after the reload call, read by the listener after the kit line');
}

section = 8;
console.log('8) a loader\'s own catch never reloads, the two SaveMovedNotice loaders excepted');
{
  const files = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'test') walk(p); } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) files.push(p); } };
  walk(path.join(ROOT, 'src'));
  const ALLOWED = { 'src/pages/SoccerCareer.tsx': 0, 'src/pages/ClubManager.tsx': 0 };
  const bad = []; let chains = 0;
  for (const f of files) {
    const rel = path.relative(ROOT, f).replaceAll('\\', '/');
    let raw = fs.readFileSync(f, 'utf8').replaceAll('\r\n', '\n');
    if (CONTROL === 'catchreload' && rel === 'src/pages/SoccerCareer.tsx') raw = rewrite(raw, 'import("@/components/soccer-career/CareerStory").catch(() => new Promise<never>(() => undefined))', 'import("@/components/soccer-career/CareerStory").catch(() => { reloadToRetryChunk(); return new Promise<never>(() => undefined); })', 'catchreload');
    /* comments stripped with their line breaks kept, so a finding names its real line */
    const t = raw.replace(/\/\*[\s\S]*?\*\//g, s => s.replace(/[^\n]/g, '')).replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const m of t.matchAll(/(?<![\w$.])import\s*\(/g)) {
      /* the chain: from import( to the end of its expression (a ; , or closing bracket at depth 0) */
      let depth = 0; let i = m.index;
      for (; i < t.length; i++) {
        const ch = t[i];
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) { depth--; if (depth < 0) break; }
        else if (depth === 0 && (ch === ';' || ch === ',')) break;
      }
      const chain = t.slice(m.index, i);
      chains++;
      const c = chain.search(/\.catch\s*\(/);
      if (c < 0 || !/reloadToRetryChunk\s*\(|location\.reload\s*\(/.test(chain.slice(c))) continue;
      if (rel in ALLOWED && /^import\(\s*['"]@\/components\/SaveMovedNotice['"]\s*\)/.test(chain)) { ALLOWED[rel]++; continue; }
      bad.push(`${rel}:${t.slice(0, m.index).split('\n').length}`);
    }
  }
  const off = Object.entries(ALLOWED).filter(([, n]) => n !== 1);
  if (chains < 100) fail(`only ${chains} import( chains read: this check is not reading src`);
  if (bad.length) fail(`an import() chain reloads from its own .catch: ${bad.join(', ')}. A loader's catch never reloads on its own (it loops on a file that stays missing, and under blocked storage drops a career held in memory)`);
  if (off.length) fail(`the SaveMovedNotice loader with its reload is not there exactly once in ${off.map(([k, n]) => `${k} (${n})`).join(', ')}: update this allowlist only with a reason`);
  if (chains >= 100 && !bad.length && !off.length) ok(`${chains} import( chains in src, none reloads from its own catch but the two SaveMovedNotice loaders`);
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
