/* Review of Round 1338 (run lens): apply ONE mutation to the runner's checkout, on disk.
   The request line restores with git checkout -- src scripts after its checks.
   Each mutation asserts its anchor appears exactly once, or exits 9 (a dead mutation proves nothing). */
import fs from 'node:fs';

const M = {
  /* plugin, off by one: the wait goes in front of the rethrow branch instead of after it */
  m1: ['scripts/lib/vitePreloadWait.mjs', 'const end = found[0].index + found[0][0].length;', 'const end = found[0].index;'],
  /* page flag set before the reload call (critic item 14's order) */
  m2: ['src/lib/freshBuild.ts', '  window.location.reload();\n  /* after the call, so it is true only once the browser took the navigation */\n  reloadAsked = true;\n', '  reloadAsked = true;\n  window.location.reload();\n'],
  /* stale constant: the page flag starts true */
  m3: ['src/lib/freshBuild.ts', 'let reloadAsked = false;', 'let reloadAsked = true;'],
  /* the flag read moved above the optional kit line */
  m4: ['src/lib/freshBuild.ts', '    if (isOptionalChunkError((event as Event & { payload?: unknown }).payload)) return;\n    if (reloadAsked || reloadOnceForStaleChunk()) event.preventDefault();', '    if (reloadAsked) { event.preventDefault(); return; }\n    if (isOptionalChunkError((event as Event & { payload?: unknown }).payload)) return;\n    if (reloadOnceForStaleChunk()) event.preventDefault();'],
  /* dropped: the page flag is never set */
  m5: ['src/lib/freshBuild.ts', '  /* after the call, so it is true only once the browser took the navigation */\n  reloadAsked = true;\n', ''],
  /* the plugin applies in serve instead of build, so no build runs it */
  m6: ['scripts/lib/vitePreloadWait.mjs', "    name: 'dukb-preload-wait',\n    apply: 'build',", "    name: 'dukb-preload-wait',\n    apply: 'serve',"],
};
const name = process.argv[2];
if (!M[name]) { console.error('unknown mutation ' + name); process.exit(9); }
const [file, from, to] = M[name];
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
const text = crlf ? raw.replaceAll('\r\n', '\n') : raw;
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`${name}: anchor appears ${n} times in ${file}, refusing a dead mutation`); process.exit(9); }
if (process.argv[3] === '--dry') { console.log(`${name}: anchor found once in ${file} (dry, nothing written)`); process.exit(0); }
let out = text.replace(from, to);
if (crlf) out = out.replaceAll('\n', '\r\n');
fs.writeFileSync(file, out);
console.log(`mutation ${name} applied to ${file}`);
