/**
 * Round 357 harness: the split spec is still the spec.
 *
 * docs/spec/ holds the owner's Master Build Specification cut into 29 parts so a
 * session can load one section instead of 7,691 lines. A split document has one
 * failure mode a single file does not have: a part can be edited, truncated,
 * duplicated or quietly dropped, and every other part still reads fine. Nothing
 * about the directory looks wrong afterwards. So the split is only safe if
 * something reconstitutes it and compares.
 *
 * That is what this does. It strips each part's generated header, concatenates the
 * bodies in manifest order, and requires the SHA-256 of the result to equal the
 * hash of the document as adopted in Round 337. Five checks:
 *
 *   1. Every part named in the manifest exists, carries its header markers, and
 *      its body hashes to the recorded value.
 *   2. The parts concatenated in order reproduce the source hash and line count.
 *   3. Section headings derived FROM THE FILES match the manifest's lists, so a
 *      moved or renamed section cannot pass by leaving the manifest alone.
 *   4. No stray .md in docs/spec is missing from the manifest, and the README
 *      index lists every part and every section.
 *   5. The header is the only text in the directory nobody's owner wrote: it must
 *      sit at the top of the file and nowhere else.
 *
 * Controls, because a green run has to be able to mean something:
 *   SPEC_SPLIT_CONTROL=drop      deletes a real section from one part in memory.
 *   SPEC_SPLIT_CONTROL=unlisted  hides a part from the manifest in memory.
 * Both must go red. Each asserts the thing it edits was really there first, so a
 * control that changes nothing refuses to run rather than reporting success.
 *
 * Run: node scripts/simSpecSplit.mjs
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_DIR = path.join(ROOT, 'docs/spec');
const CONTROL = process.env.SPEC_SPLIT_CONTROL || '';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);
const sha = s => createHash('sha256').update(s, 'utf8').digest('hex');

console.log('simSpecSplit: the split spec reconstitutes into the document it came from');
if (CONTROL) console.log(`  CONTROL ACTIVE: ${CONTROL} (this run is expected to fail)`);

// A missing manifest or index is the loudest possible version of this failure, so it
// gets a sentence rather than a stack trace.
for (const required of ['MANIFEST.json', 'README.md']) {
  if (!fs.existsSync(path.join(SPEC_DIR, required))) {
    console.error(`  FAIL: docs/spec/${required} is missing, so nothing here can be verified at all.`);
    console.error('simSpecSplit: 1 failure(s).');
    process.exit(1);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(SPEC_DIR, 'MANIFEST.json'), 'utf8'));
const readme = fs.readFileSync(path.join(SPEC_DIR, 'README.md'), 'utf8');
const { headerOpen, headerClose } = manifest;
let parts = manifest.parts;

if (CONTROL === 'unlisted') {
  const victim = parts[parts.length - 1];
  if (!fs.existsSync(path.join(SPEC_DIR, victim.file))) {
    console.error('CONTROL REFUSED: the part it means to hide is not on disk.');
    process.exit(2);
  }
  parts = parts.slice(0, -1);
  console.log(`  control: ${victim.file} hidden from the manifest in memory`);
}

// ---- 1. every part reads, carries its header, and hashes to its recorded body.
const bodies = [];
for (const p of parts) {
  const file = path.join(SPEC_DIR, p.file);
  if (!fs.existsSync(file)) { fail(`${p.file} is in the manifest and not on disk`); bodies.push(''); continue; }
  const raw = fs.readFileSync(file, 'utf8');

  const openAt = raw.indexOf(headerOpen);
  const closeAt = raw.indexOf(headerClose);
  if (openAt !== 0) { fail(`${p.file} does not open with the part header`); }
  if (closeAt < 0) { fail(`${p.file} has no closing header marker`); bodies.push(''); continue; }
  if (raw.indexOf(headerOpen, 1) >= 0) fail(`${p.file} carries a second header block`);

  let body = raw.slice(closeAt + headerClose.length);
  if (body.startsWith('\n')) body = body.slice(1);

  if (CONTROL === 'drop' && p.file === parts[5].file) {
    const lines = body.split('\n');
    const start = lines.findIndex(l => /^# /.test(l));
    const next = lines.findIndex((l, i) => i > start && /^# /.test(l));
    if (start < 0 || next < 0) {
      console.error('CONTROL REFUSED: no whole section found to drop, so the edit would change nothing.');
      process.exit(2);
    }
    const removed = lines[start];
    body = [...lines.slice(0, start), ...lines.slice(next)].join('\n');
    console.log(`  control: dropped "${removed}" from ${p.file} in memory`);
  }

  if (sha(body) !== p.bodySha256) fail(`${p.file} does not match its recorded hash, it has been edited or truncated`);
  bodies.push(body);
}
if (!failures) ok(`${parts.length} parts present, headed and hashing to the manifest`);

// ---- 2. concatenated in order they reproduce the adopted document.
const rebuilt = bodies.join('\n');
const rebuiltSha = sha(rebuilt);
if (rebuiltSha !== manifest.sourceSha256) {
  fail(`the parts no longer reconstitute the spec: got ${rebuiltSha.slice(0, 16)}, expected ${manifest.sourceSha256.slice(0, 16)}`);
} else {
  ok(`reconstitutes to ${manifest.sourceSha256.slice(0, 16)}, the document adopted in Round 337`);
}
const rebuiltLines = rebuilt.split('\n').length;
if (rebuiltLines !== manifest.sourceLines) {
  fail(`line count moved: ${rebuiltLines} rebuilt against ${manifest.sourceLines} recorded`);
} else {
  ok(`${rebuiltLines} lines, unchanged`);
}

// ---- 3. section headings come from the files, not from the manifest's word.
let sectionCount = 0;
const allSections = [];
for (let i = 0; i < parts.length; i++) {
  const derived = bodies[i].split('\n').filter(l => /^# /.test(l)).map(l => l.replace(/^# /, '').trim());
  sectionCount += derived.length;
  allSections.push(...derived);
  const recorded = parts[i].sections;
  if (derived.length !== recorded.length || derived.some((s, j) => s !== recorded[j])) {
    fail(`${parts[i].file}: headings on disk disagree with the manifest (${derived.length} found, ${recorded.length} listed)`);
  }
}
if (new Set(allSections).size !== allSections.length) {
  const seen = new Set();
  const dupes = allSections.filter(s => (seen.has(s) ? true : (seen.add(s), false)));
  fail(`a section appears in more than one part: ${[...new Set(dupes)].join('; ')}`);
}
if (sectionCount !== 361) fail(`361 sections were adopted, ${sectionCount} are present`);
if (!failures) ok(`${sectionCount} sections, each in exactly one part, headings matching the manifest`);

// ---- 4. nothing on disk is unlisted, and the index covers everything.
const listed = new Set(parts.map(p => p.file));
const onDisk = fs.readdirSync(SPEC_DIR).filter(f => f.endsWith('.md') && f !== 'README.md');
for (const f of onDisk) {
  if (!listed.has(f)) fail(`${f} sits in docs/spec and is in no manifest entry, so nothing verifies it`);
}
for (const p of parts) {
  if (!readme.includes(`(./${p.file})`)) fail(`README does not link ${p.file}, so a reader cannot find it`);
}
for (const s of allSections) {
  if (!readme.includes(`| ${s} |`)) fail(`README's section lookup is missing "${s}"`);
}
if (!failures) ok(`${onDisk.length} files on disk, all listed, README links every part and looks up every section`);

// ---- 5. the header cannot appear anywhere but the top of a part.
for (const p of parts) {
  const file = path.join(SPEC_DIR, p.file);
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  const bodyStart = raw.indexOf(headerClose) + headerClose.length;
  if (raw.slice(bodyStart).includes(headerOpen)) fail(`${p.file} has a header marker inside its body`);
}
if (readme.includes(headerOpen) && !readme.includes('`' + headerOpen + '`')) {
  fail('the README carries a raw header marker rather than a quoted mention of one');
}

console.log('');
if (failures) {
  console.error(`simSpecSplit: ${failures} failure(s).`);
  if (CONTROL) console.error('The control fired, which is what it is for. Run without SPEC_SPLIT_CONTROL for the real result.');
  process.exit(1);
}
if (CONTROL) {
  console.error(`simSpecSplit: CONTROL ${CONTROL} was active and NOTHING failed. The check is not looking at what it claims to look at.`);
  process.exit(1);
}
console.log('simSpecSplit: PASS. docs/spec is the spec, whole and in one piece.');
