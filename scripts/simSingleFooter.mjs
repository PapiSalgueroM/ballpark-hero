/**
 * Round 313 harness: exactly one footer, the global one.
 *
 * Round 49 put ONE footer on every page, rendered once in App.tsx after the
 * routes. GameShell then grew its own copy inside the content column, six
 * quiz boards and the Records page kept theirs, and every page drawn through
 * any of them stacked two full footers, disclaimer and all, which Anthony
 * screenshotted on 2026-08-28. The rendered proof at the time: 2 footer
 * elements and the disclaimer twice in the live DOM of /soccer-grid.
 *
 * The rule this holds: the ONLY file in src that renders <Footer /> is
 * App.tsx, and the only file that may import it is App.tsx (the component's
 * own file defines it). Comments are stripped before matching, because
 * GameShell's own doc comment shows the old boilerplate including a Footer
 * tag, and a guard that reads prose is a guard that lies (the four-in-one-day
 * lesson in CLAUDE.md).
 *
 * NEGATIVE CONTROL: FOOTER_CONTROL=double appends a Footer render to the
 * GameShell source in memory; the scan must report it.
 *
 * Run: node scripts/simSingleFooter.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.FOOTER_CONTROL || '';
if (CONTROL && CONTROL !== 'double') { console.error(`FOOTER_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const strip = t => t
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ');

const files = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true })
  .map(String)
  .filter(f => /\.(ts|tsx)$/.test(f));

let renders = 0;
for (const f of files) {
  const rel = f.replaceAll('\\', '/');
  let text = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
  if (CONTROL === 'double' && rel === 'components/game/GameShell.tsx') {
    const before = text;
    text += '\nconst Doubled = () => <Footer />;\n';
    if (text === before) { console.error('control changed nothing'); process.exit(1); }
    console.log('   NEGATIVE CONTROL ON: a Footer render appended to GameShell in memory, the scan must report it');
  }
  const code = strip(text);
  const isFooterItself = rel === 'components/game/Footer.tsx';
  const isApp = rel === 'App.tsx';
  const renderHits = (code.match(/<Footer[\s/>]/g) || []).length;
  if (renderHits && !isApp && !isFooterItself) {
    fail(`${rel} renders <Footer /> (${renderHits}x); the one global footer lives in App.tsx`);
  }
  if (isApp) renders += renderHits;
  if (!isApp && !isFooterItself && /from ['"]@\/components\/game\/Footer['"]/.test(code)) {
    fail(`${rel} imports the Footer component; only App.tsx may`);
  }
}
if (renders !== 1) fail(`App.tsx renders <Footer /> ${renders} times; exactly once is the rule`);
console.log(`   ${files.length} src files scanned; App.tsx renders the footer exactly once`);
console.log(`   the import ban held: no file outside App.tsx pulls the Footer component in`);

console.log('');
if (CONTROL === 'double') {
  if (failures > 0) { console.log(`simSingleFooter control: green. The planted render was reported (${failures} finding).`); process.exit(0); }
  console.error('simSingleFooter control: RED. A planted Footer render went unreported.'); process.exit(1);
}
if (failures > 0) { console.error(`simSingleFooter: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('   teeth: comment stripped scan, render site pinned to App.tsx, imports banned everywhere else');
console.log('simSingleFooter: green. One footer, rendered once, on every page.');
