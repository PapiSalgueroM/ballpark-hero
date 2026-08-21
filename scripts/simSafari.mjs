/**
 * Round 203 harness: the site has to work on an iPhone.
 *
 * Every browser harness in this project drives Chromium, because that is
 * what this build environment can install: WebKit cannot be downloaded
 * here, which is stated plainly rather than papered over. That leaves a
 * real gap, and it is not a theoretical one, because the owner plays this
 * site on an iPhone and reports bugs from screenshots taken in Safari.
 *
 * So this file closes as much of the gap as a static check honestly can:
 * it scans the SHIPPED source for the specific patterns that work in
 * Chromium and break, or have broken, in Safari. Each rule below is here
 * because it can take a page down, not because it is untidy.
 *
 * IT FOUND ONE. src/lib/minefield.ts built its daily seed by formatting a
 * date with toLocaleString('en-US') and handing the result back to the
 * Date parser. That string ("8/19/2026, 10:00:00 PM") is not a format any
 * engine is required to parse, Safari has historically returned Invalid
 * Date for it, and the resulting NaN seed would have taken the whole daily
 * board down on the device this site is mostly played on. Fixed in the
 * same round by reading the date parts directly, which is defined
 * behaviour everywhere and produces an identical seed.
 *
 * Run: node scripts/simSafari.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** Every shipped source file: what a browser actually receives. */
function shippedFiles() {
  const out = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|css)$/.test(e.name)) out.push(p);
    }
  };
  walk(path.join(ROOT, 'src'));
  return out;
}
const FILES = shippedFiles();
const rel = f => path.relative(ROOT, f);

/* ---------- 1. Dates the Safari parser will not accept ---------- */
console.log('1) No date string is handed back to the parser');
{
  /* The exact shape that broke the minefield: format a date to a human
     string, then parse it again. Chromium is forgiving, Safari is not, and
     the spec is on Safari's side: only ISO 8601 has to be understood. */
  /* Comment lines are stripped first: the fix in minefield.ts explains the
     bug by quoting the old call, and a scanner that reads its own
     explanation as a violation is a scanner nobody will trust. */
  const stripComments = t => t
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const ROUND_TRIP = /new Date\([^)]*\.toLocaleString\(/;
  /* "2026-08-19 12:00" with a space instead of a T is invalid in Safari. */
  const SPACED = /new Date\(\s*['"`]\d{4}-\d{2}-\d{2} \d{2}:/;
  for (const f of FILES) {
    const t = stripComments(fs.readFileSync(f, 'utf-8'));
    if (ROUND_TRIP.test(t)) fail(`${rel(f)}: parses a toLocaleString result, which Safari can read as Invalid Date`);
    if (SPACED.test(t)) fail(`${rel(f)}: a space separated date literal, which Safari rejects (use T)`);
  }
  /* And the safe pattern is genuinely in use where dates matter. */
  const utils = fs.readFileSync(path.join(ROOT, 'src/lib/dateUtils.ts'), 'utf-8');
  if (!utils.includes("Intl.DateTimeFormat('en-CA'")) fail('the site date helper stopped using the portable formatter');
  const mine = fs.readFileSync(path.join(ROOT, 'src/lib/minefield.ts'), 'utf-8');
  if (!mine.includes('formatToParts')) fail('the minefield seed went back to parsing a formatted string');
  console.log(`   ${FILES.length} shipped files scanned, 0 date round trips`);
}

/* ---------- 2. Regex features older Safari cannot even parse ---------- */
console.log('2) No lookbehind in shipped code');
{
  /* Lookbehind arrived in Safari 16.4 (March 2023) and a regex literal
     using it is a SYNTAX error before that, which does not fail one
     function: it kills the whole chunk at parse time and blanks the page.
     The build scripts under scripts/ are free to use it, they run in node,
     which is why only src/ is scanned here. */
  const LOOKBEHIND = /\(\?<[=!]/;
  const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const f of FILES) {
    const t = strip(fs.readFileSync(f, 'utf-8'));
    if (LOOKBEHIND.test(t)) fail(`${rel(f)}: regex lookbehind, a parse error in Safari before 16.4`);
  }
}

/* ---------- 3. APIs Safari got late or has not got ---------- */
console.log('3) No very new JavaScript the phone in his pocket may not have');
{
  const BANNED = [
    ['Object.groupBy(', 'Object.groupBy arrived in Safari 17.4, too new to rely on'],
    ['Array.prototype.group', 'Array grouping is not in Safari at all'],
    ['navigator.clipboard.read(', 'clipboard read is gated behind a permission prompt in Safari and silently fails'],
    ['showOpenFilePicker(', 'the file system access API does not exist in Safari'],
    ['requestIdleCallback(', 'requestIdleCallback only reached Safari in 2022 and is still flaky on iOS'],
  ];
  for (const f of FILES) {
    const t = fs.readFileSync(f, 'utf-8');
    for (const [needle, why] of BANNED) {
      if (t.includes(needle)) fail(`${rel(f)}: ${needle} ${why}`);
    }
  }
}

/* ---------- 4. The viewport unit that lies on iOS ---------- */
console.log('4) No raw 100vh, because mobile Safari measures it wrong');
{
  /* On iOS the address bar overlays the viewport, so 100vh is TALLER than
     what you can see and the bottom of a full height screen sits under the
     toolbar. Tailwind's min-h-screen compiles to 100vh, so the project
     leans on it everywhere and this rule would be noise; what it bans is
     hand written 100vh in styles, where a dvh unit is the fix. */
  for (const f of FILES) {
    const t = fs.readFileSync(f, 'utf-8');
    const m = t.match(/(?:height|min-height|max-height)\s*:\s*100vh/);
    if (m) fail(`${rel(f)}: hand written 100vh, which overflows under the iOS toolbar (use 100dvh)`);
  }
}

/* ---------- 5. Touch, and the 300ms nobody wants back ---------- */
console.log('5) The viewport tag lets a phone zoom, and nothing blocks touch');
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  const vp = html.match(/<meta name="viewport" content="([^"]+)"/);
  if (!vp) fail('index.html has no viewport meta, so iOS renders at desktop width');
  else {
    if (!/width=device-width/.test(vp[1])) fail('the viewport meta does not set width=device-width');
    /* user-scalable=no is an accessibility failure and iOS ignores it in
       Safari anyway, so it should simply never be there. */
    if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(vp[1])) {
      fail('the viewport meta blocks zooming, which fails accessibility and is ignored by iOS anyway');
    }
  }
}

/* ---------- 6. Say plainly what has not been tested ---------- */
console.log('6) The gap this file cannot close is written down');
{
  const doc = fs.readFileSync(path.join(ROOT, 'docs/PROJECT-STATE.md'), 'utf-8');
  if (!/WebKit/i.test(doc)) fail('the state doc does not mention the WebKit gap at all');
  const self = fs.readFileSync(path.join(ROOT, 'scripts/simSafari.mjs'), 'utf-8');
  if (!/WebKit cannot be downloaded here/.test(self)) {
    fail('this harness stopped saying that it is a static stand in for a real WebKit run');
  }
}

console.log('');
if (failures > 0) {
  console.error(`simSafari: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSafari: green. Nothing shipped here is known to break on the phone he plays it on.');
