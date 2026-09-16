/* Round 629: a harness may not carry an anchor that can never match.
 *
 * WHY THIS EXISTS, and it is not hypothetical. Round 620 shipped five negative
 * controls with `simFightCareer`. Two of them, `noretire` and `driftdaily`,
 * had never once fired. Round 625 shipped `simFightGym` with the same defect
 * in `noretire`, and `simTransferPathRepeat` and `simPollCharacter` carried it
 * too. In every case the harness read a file under `src/` with a plain
 * `readFileSync`, then looked for an anchor written across more than one line.
 *
 * Anthony's checkout stores those files CRLF. An anchor written inside a
 * harness is LF. So a SINGLE line anchor matches and a MULTI line one cannot,
 * ever. The well written harnesses then abort with "control cannot run", which
 * is loud and safe but means the control has never actually been exercised
 * here. The badly written ones replace nothing, stay green, and the section
 * reads as verified when its control did nothing at all. That is the exact
 * reading of green the repo's rules warn about, and it is invisible on an LF
 * checkout, where every one of these works perfectly.
 *
 * THE RULE, deliberately about the mechanism and not about a list of known
 * offenders, because a check written for a known offender cannot find the next
 * one: a harness that reads a file under `src/` AND searches it with a multi
 * line string literal MUST normalise line endings when it reads.
 *
 * Any of the four idioms already used across the repo counts:
 *   .replaceAll('\r\n', '\n')   .replace(/\r\n/g, '\n')
 *   .split('\r\n').join('\n')   .split(/\r?\n/)
 *
 * CONTROL: ANCHOR_CONTROL=strip analyses a copy of the scripts directory with
 * the normalisation removed from simFightCareer.mjs, and this harness must
 * then report it. A control that changed nothing exits non zero rather than
 * quietly leaving the check green.
 *
 * Run: node scripts/simHarnessAnchors.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.ANCHOR_CONTROL || '';
if (CONTROL && CONTROL !== 'strip') {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = m => console.log(`   ok   ${m}`);

/* The four normalisation idioms in use across the repo. */
const NORMALISERS = [
  "replaceAll('\\r\\n'",
  'replaceAll("\\r\\n"',
  'replace(/\\r\\n/g',
  "split('\\r\\n')",
  'split(/\\r?\\n/',
];

/* A readFileSync whose path expression names a src path. Deliberately not
   "any readFileSync": a harness reading its own bundle (simOpposition reads
   an esbuild output, which is always LF) is not at risk and must not be
   dragged in as a false positive. */
const READS_SRC = /readFileSync\([^;]{0,160}?['"`][^'"`]*src[\\/][^'"`]*['"`]/;
const READS_SRC_JOIN = /readFileSync\(\s*path\.join\([^)]*['"`]src['"`]/;

/**
 * Multi line literals that are ANCHORS INTO THE SOURCE, decided by asking the
 * source rather than by parsing the harness.
 *
 * Two drafts got this wrong in opposite directions. The first matched every
 * multi line literal and reported 47 harnesses, nearly all false: a harness's
 * own console output is full of strings like "\nsimFreeKick: green. The
 * corners pay..." which are printed and never matched. The second looked only
 * at literals sitting inline in a `.includes(...)` call and found zero,
 * because the usual shape names the anchor first and passes it to a helper.
 *
 * So neither the text nor the call site decides it. The file does: if the
 * literal appears in a real source file once line endings are normalised, it
 * is an anchor into that file, whatever plumbing carries it there. If it also
 * does NOT appear in that file's raw bytes, it cannot match as written.
 */
function sourceAnchors(src, corpus) {
  const out = [];
  const re = /(['"])((?:\\.|(?!\1)[^\r\n])*?)\1/g;
  let m;
  while ((m = re.exec(src))) {
    const litRaw = m[2];
    if (!litRaw.includes('\\n')) continue;
    if (litRaw.includes('\\r\\n')) continue;   // already CRLF aware
    if (litRaw.length < 20) continue;
    const lit = litRaw
      .replace(/\\n/g, '\n').replace(/\\t/g, '\t')
      .replace(/\\'/g, "'").replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    for (const [, both] of corpus) {
      if (!both.norm.includes(lit)) continue;
      /* present in the file, and unmatchable against the bytes on disk */
      if (!both.raw.includes(lit)) out.push(litRaw.split('\\n')[0].slice(0, 56));
      break;
    }
  }
  return out;
}

/** Every source file a harness might read, raw and normalised. */
function readCorpus(root) {
  const corpus = new Map();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx|css|html)$/.test(e.name)) {
        const raw = fs.readFileSync(p, 'utf8');
        corpus.set(p, { raw, norm: raw.split('\r\n').join('\n') });
      }
    }
  })(path.join(root, 'src'));
  return corpus;
}

function analyse(dir, corpus) {
  const files = fs.readdirSync(dir).filter(f => /^(sim|play).*\.mjs$/.test(f));
  const bad = [];
  let readsSrc = 0;
  let withAnchors = 0;
  for (const f of files) {
    if (f === 'simHarnessAnchors.mjs') continue;   // this file quotes the idioms it looks for
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    if (!READS_SRC.test(src) && !READS_SRC_JOIN.test(src)) continue;
    readsSrc += 1;
    const normalises = NORMALISERS.some(n => src.includes(n));
    /* Counted for the in scope tally whether or not it normalises, so the
       tally measures the shape and not the compliance. A tally that only
       counted offenders would fall to zero the moment they were fixed and the
       vacuity check below would then fire on a healthy repo. */
    const anchors = sourceAnchors(src, corpus);
    if (normalises) { withAnchors += 1; continue; }
    if (!anchors.length) continue;
    withAnchors += 1;
    bad.push({ f, count: anchors.length, sample: anchors[0] });
  }
  return { files: files.length, readsSrc, withAnchors, bad };
}

let dir = path.join(ROOT, 'scripts');

if (CONTROL === 'strip') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anchors-'));
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(tmp, f));
  }
  const victim = path.join(tmp, 'simFightCareer.mjs');
  const before = fs.readFileSync(victim, 'utf8');
  const after = before.split(".replaceAll('\\r\\n', '\\n')").join('');
  if (after === before) {
    console.log('   FAIL control strip found no normalisation to remove in simFightCareer.mjs, so it would change nothing');
    process.exit(1);
  }
  fs.writeFileSync(victim, after);
  console.log('   [control strip applied: simFightCareer.mjs reads raw]');
  dir = tmp;
}

console.log('1) no harness carries an anchor it can never match');
const corpus = readCorpus(ROOT);
const r = analyse(dir, corpus);
console.log(`   ${r.files} harnesses, ${r.readsSrc} read a src file, ${r.withAnchors} of those search it with a multi line anchor`);

/* If nothing in the repo had this shape the check would be vacuous: it would
   pass on an empty set and nobody would notice it had stopped testing. */
if (r.withAnchors < 5) {
  fail(`only ${r.withAnchors} harnesses match the shape this checks, so the check has nothing to fence and has probably stopped finding them`);
} else {
  ok(`${r.withAnchors} harnesses are in scope, so the check is looking at something`);
}

if (r.bad.length) {
  for (const b of r.bad) {
    fail(`${b.f} searches a src file with ${b.count} multi line anchor(s) and never normalises line endings, so on a CRLF checkout they match nothing (e.g. "${b.sample}...")`);
  }
} else {
  ok('every harness that searches a src file with a multi line anchor normalises line endings first');
}

console.log('');
if (CONTROL) {
  if (failures > 0) {
    console.log(`control "${CONTROL}": ${failures} failure(s) fired as expected, the check works`);
    process.exit(0);
  }
  console.log(`control "${CONTROL}": fired nothing, so this check is dead`);
  process.exit(1);
}
if (failures > 0) {
  console.log(`simHarnessAnchors: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simHarnessAnchors: green. No harness carries an unmatchable anchor.');
process.exit(0);
