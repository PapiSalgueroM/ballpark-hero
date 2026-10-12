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
 * Controls (Round 1314), each adds one file to the scan in memory and must
 * fail its own section on that file ("FIRED", exit 1; "DID NOT FIRE", exit 2):
 *   SIM_SAFARI_CONTROL=lookbehind  a /(?<=a)b/ literal: section 2
 *   SIM_SAFARI_CONTROL=testimport  an import of '@/test/helpers': section 0
 *   SIM_SAFARI_CONTROL=barevh      height:100vh with no dvh line: section 4
 *   SIM_SAFARI_CONTROL=vhafter     the 100dvh line BEFORE the 100vh: section 4
 *   SIM_SAFARI_CONTROL=dvhcomment  the dvh line only inside a comment: section 4
 *   SIM_SAFARI_CONTROL=customprop  a custom property set to 100vh: section 4
 *   SIM_SAFARI_CONTROL=lvhafter    a 100lvh line after the 100vh: section 4
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
let section = 0;
const failed = [];
const fail = m => { failures += 1; failed.push({ section, m }); console.error('  FAIL: ' + m); };

/* Round 1314: what ships is src/ WITHOUT its tests. A vitest file runs in
   node and never reaches a browser, so a lookbehind in one is no more a
   Safari parse error than one under scripts/ is. Round 1010a's
   useTransferPathGuidance.test.ts turned section 2 red for that reason
   alone. Left out: everything under src/test/ and every *.test.* or
   *.spec.* file elsewhere in src/. Section 0 then fails if a kept file
   imports a left out one, because a test helper that ships is shipped.
   Measured on origin/main 35f85630: 2071 files under src, 519 left out
   (409 under src/test, 110 test files elsewhere), 1552 scanned. */
const TEST_DIR = path.join(ROOT, 'src', 'test');
const isTestFile = p => p === TEST_DIR || p.startsWith(TEST_DIR + path.sep) || /\.(test|spec)\.[^./\\]+$/.test(path.basename(p));

/** Every shipped source file: what a browser actually receives. */
function shippedFiles() {
  const out = [];
  const left = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|css)$/.test(e.name)) (isTestFile(p) ? left : out).push(p);
    }
  };
  walk(path.join(ROOT, 'src'));
  return { out, left };
}
const { out: FILES, left: LEFT_OUT } = shippedFiles();
const rel = f => path.relative(ROOT, f);

/* ---------- Controls: each adds ONE file to the scan, in memory ----------
   SIM_SAFARI_CONTROL=<name>. Nothing is written to disk. Each must fail
   its own section on the control file, and the closing line says which:
   "control <name> FIRED" exits 1, "DID NOT FIRE" exits 2. */
const CONTROLS = {
  lookbehind: { file: 'lookbehind.ts', section: 2, text: "export const r = /(?<=a)b/;\n" },
  testimport: { file: 'testimport.ts', section: 0, text: "import { helper } from '@/test/helpers';\nexport const h = helper;\n" },
  barevh: { file: 'barevh.css', section: 4, text: '.ctl-box { height: 100vh; }\n' },
  vhafter: { file: 'vhafter.css', section: 4, text: '.ctl-box { height: 100dvh; height: 100vh; }\n' },
  dvhcomment: { file: 'dvhcomment.css', section: 4, text: '.ctl-box { height: 100vh; /* height: 100dvh; */ }\n' },
  customprop: { file: 'customprop.css', section: 4, text: '.ctl-box { --ctl-stage-height: 100vh; height: var(--ctl-stage-height); }\n' },
  lvhafter: { file: 'lvhafter.css', section: 4, text: '.ctl-box { height: 100vh; height: 100lvh; }\n' },
};
const CONTROL = process.env.SIM_SAFARI_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`simSafari: unknown control "${CONTROL}" (known: ${Object.keys(CONTROLS).join(', ')}). Refusing to run.`);
  process.exit(2);
}
const VIRTUAL = new Map();
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const p = path.join(ROOT, 'src', '__control__', c.file);
  VIRTUAL.set(p, c.text);
  FILES.push(p);
  console.log(`CONTROL ${CONTROL}: ${rel(p)} added to the scan in memory`);
}
const read = f => (VIRTUAL.has(f) ? VIRTUAL.get(f) : fs.readFileSync(f, 'utf-8'));
const stripJsComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ---------- 0. The scan covers what ships, and no test file ships ---------- */
section = 0;
console.log('0) The scan covers what ships: no shipped file imports a test file');
{
  const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"]+)\1/g;
  const leftSet = new Set(LEFT_OUT);
  const resolveTo = (from, spec) => {
    if (spec.startsWith('@/')) return path.join(ROOT, 'src', spec.slice(2));
    if (spec.startsWith('.')) return path.resolve(path.dirname(from), spec);
    return null;
  };
  let imports = 0;
  for (const f of FILES) {
    if (!/\.tsx?$/.test(f)) continue;
    const t = stripJsComments(read(f));
    for (const m of t.matchAll(SPEC)) {
      const base = resolveTo(f, m[2]);
      if (!base) continue;
      imports += 1;
      const tries = [base, ...['.ts', '.tsx', '.css'].map(x => base + x), path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
      if (isTestFile(base) || tries.some(x => leftSet.has(x))) {
        fail(`${rel(f)}: imports '${m[2]}', a test file, so the test file ships too`);
      }
    }
  }
  const underTest = LEFT_OUT.filter(p => p.startsWith(TEST_DIR + path.sep)).length;
  console.log(`   ${FILES.length + LEFT_OUT.length} files under src, ${LEFT_OUT.length} test files left out (${underTest} under src/test, ${LEFT_OUT.length - underTest} *.test.* or *.spec.* elsewhere), ${FILES.length} scanned, ${imports} local imports read`);
}

/* ---------- 1. Dates the Safari parser will not accept ---------- */
section = 1;
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
    const t = stripComments(read(f));
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
section = 2;
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
    const t = strip(read(f));
    if (LOOKBEHIND.test(t)) fail(`${rel(f)}: regex lookbehind, a parse error in Safari before 16.4`);
  }
}

/* ---------- 3. APIs Safari got late or has not got ---------- */
section = 3;
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
    const t = read(f);
    for (const [needle, why] of BANNED) {
      if (t.includes(needle)) fail(`${rel(f)}: ${needle} ${why}`);
    }
  }
}

/* ---------- 4. The viewport unit that lies on iOS ---------- */
section = 4;
console.log('4) No raw 100vh, because mobile Safari measures it wrong');
{
  /* On iOS the address bar overlays the viewport, so 100vh is TALLER than
     what you can see and the bottom of a full height screen sits under the
     toolbar. Tailwind's min-h-screen compiles to 100vh, so the project
     leans on it everywhere and this rule would be noise; what it bans is
     hand written 100vh in styles, where a dvh unit is the fix. */
  /* Round 1314: the fix is allowed to keep 100vh as a FALLBACK. A block
     that sets the property in 100vh and then sets the SAME property again
     in dvh or svh after it (Round 1101's LiveSimMotion.css stage box)
     is exactly the cure: a browser without the new units keeps the 100vh,
     and every Safari since 15.4 (desktop and iOS) takes the line after it.
     lvh is NOT a cure: 100lvh is the large viewport, the same size as
     100vh, so the block still runs under the toolbar (control lvhafter;
     W3C css-values-4 and WebKit's Safari 15.4 post say the same).
     The block is read from the 100vh to the next } after it, with
     comments stripped first, so a dvh line that only sits inside
     a comment is no fallback at all (control dvhcomment). A bare 100vh, or
     a 100vh that comes after the dvh line, still fails.
     The property is read with no left boundary, as before this round, so a
     custom property holding 100vh (the old --app-height trick, or
     --cm-stage-height: 100vh read back through var()) is caught as well:
     ANY custom property set to 100vh counts as bare unless the same block
     sets that same custom property again in dvh or svh (control
     customprop). The boundary lives only in the fallback search, so a
     min-height line never stands in for a height one. */
  const VH = /(--[\w-]+|(?:min-|max-)?height)\s*:\s*100vh(?![\w%])/g;
  const stripStyle = (f, t) => (/\.css$/.test(f) ? t.replace(/\/\*[\s\S]*?\*\//g, '') : stripJsComments(t));
  for (const f of FILES) {
    const t = stripStyle(f, read(f));
    let bare = false;
    for (const m of t.matchAll(VH)) {
      const prop = m[1];
      const end = m.index + m[0].length;
      const close = t.indexOf('}', end);
      const rest = t.slice(end, close === -1 ? t.length : close);
      const after = new RegExp(`(^|[^-\\w])${prop}\\s*:\\s*[^;{}]*?\\d*\\.?\\d+[ds]vh(?![\\w%])`);
      if (!after.test(rest)) { bare = true; break; }
    }
    if (bare) fail(`${rel(f)}: hand written 100vh, which overflows under the iOS toolbar (use 100dvh)`);
  }
}

/* ---------- 5. Touch, and the 300ms nobody wants back ---------- */
section = 5;
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
section = 6;
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
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const name = rel(path.join(ROOT, 'src', '__control__', c.file));
  const mine = failed.filter(x => x.m.startsWith(name + ':'));
  const own = mine.filter(x => x.section === c.section);
  const elsewhere = mine.filter(x => x.section !== c.section);
  const others = failed.length - mine.length;
  if (own.length > 0 && elsewhere.length === 0) {
    console.error(`simSafari: control ${CONTROL} FIRED: section ${c.section} failed on ${name} (${others} other failure${others === 1 ? '' : 's'} in the run)`);
    process.exit(1);
  }
  console.error(`simSafari: control ${CONTROL} DID NOT FIRE as designed: section ${c.section} failures on ${name}: ${own.length}, in other sections: ${elsewhere.length}`);
  process.exit(2);
}
if (failures > 0) {
  console.error(`simSafari: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSafari: green. Nothing shipped here is known to break on the phone he plays it on.');
