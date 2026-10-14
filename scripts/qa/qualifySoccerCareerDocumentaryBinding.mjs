/* Remote-only negative controls for the actual old Cold source-equivalence fence. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Binding controls require remote offline transport');
assert.equal(process.env.CAREER_DOCUMENTARY_PHASE, 'fixed', 'Binding controls require the fixed documentary phase');
assert(process.env.CAREER_DOCUMENTARY_OUT && path.isAbsolute(process.env.CAREER_DOCUMENTARY_OUT), 'Binding controls require an absolute packet root');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(process.env.CAREER_DOCUMENTARY_OUT, 'binding-controls');
assert(OUT !== ROOT && !OUT.startsWith(path.join(ROOT, 'dist') + path.sep), 'Binding evidence must stay outside the build');
assert(!fs.existsSync(OUT), 'Refuse to replace retained binding controls');
fs.mkdirSync(OUT, { recursive: true });
const files = ['scripts/simSoccerCareerColdContext.mjs', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerRealismA.ts',
  'src/lib/soccerCareerSave.ts', 'src/lib/soccerCareerLife.ts', 'src/lib/soccerCareerContracts.ts',
  'src/lib/soccerCareerLifeConsequences.ts', 'src/lib/soccerCareerRoutineEvents.ts', 'src/test/soccerCareerColdContext.test.ts',
  'scripts/playSoccerCareerPendingPopularity.mjs', '.github/workflows/soccer-career-cold-context.yml',
  '.github/workflows/soccer-career-documentary-review.yml', 'scripts/qa/qualifySoccerCareerDocumentaryBinding.mjs'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
for (const [file, bytes] of held) {
  const before = path.join(OUT, 'before', file); fs.mkdirSync(path.dirname(before), { recursive: true }); fs.writeFileSync(before, bytes);
}
const original = held.get('scripts/simSoccerCareerColdContext.mjs').toString('utf8'), life = held.get('src/lib/soccerCareerLife.ts').toString('utf8');
const sha = value => createHash('sha256').update(value).digest('hex');
const anchor = "const sources = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));\n";
const effect = 'setFlag(s, "rDocCrew", 2); s.integrityBonus += 2;', wrongEffect = 'setFlag(s, "rDocCrew", 2); s.integrityBonus += 0;';
assert.equal(original.split(anchor).length - 1, 1, 'One actual source-map construction is required');
assert.equal(life.split(effect).length - 1, 1, 'One actual earned631 effect is required');
const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
assert.equal(git.status, 0); assert.equal(git.signal, null); assert.equal(git.error, undefined);
const progress = { head: git.stdout.trim(), status: 'running', helperSha256: sha(original), lifeSha256: sha(life), arms: [] };
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const save = () => write(path.join(OUT, 'source.json'), { ...progress, sourceReceipts: [...held].map(([file, before]) => ({
  file, beforePath: 'before/' + file, beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(path.join(ROOT, file))) })) });
save();
const SETUP = /SyntaxError:|ReferenceError:|TypeError:|ERR_MODULE_NOT_FOUND|ERR_REQUIRE_ESM|Cannot find module|Failed to load|Failed to resolve import|Unhandled (?:Errors?|Rejection)|Uncaught Exception/i;
try {
  for (const mode of ['body', 'unrelated']) {
    const dir = path.join(OUT, mode), childOut = path.join(dir, 'fixed'); fs.mkdirSync(dir);
    const injection = mode === 'body'
      ? `sources.set(LIFE, sources.get(LIFE).replace(${JSON.stringify(effect)}, ${JSON.stringify(wrongEffect)}));\n`
      : "sources.set(LIFE, sources.get(LIFE) + '\\n ');\n";
    const offset = original.indexOf(anchor) + anchor.length;
    const copied = original.slice(0, offset) + injection + original.slice(offset);
    const inverse = copied.slice(0, offset) + copied.slice(offset + injection.length);
    assert.notEqual(copied, original); assert.equal(inverse, original, 'Removing only the source-map injection restores the complete helper');
    const lifeOffset = mode === 'body' ? life.indexOf(effect) : life.length;
    const faultLife = mode === 'body' ? life.replace(effect, wrongEffect) : life + '\n ';
    const lifeInverse = mode === 'body' ? faultLife.slice(0, lifeOffset) + effect + faultLife.slice(lifeOffset + wrongEffect.length) : faultLife.slice(0, life.length);
    assert.notEqual(faultLife, life); assert.equal(lifeInverse, life, 'The source-map fault inverse holds every app byte');
    fs.writeFileSync(path.join(dir, 'helper.before.mjs'), original); fs.writeFileSync(path.join(dir, 'helper.control.mjs'), copied);
    fs.writeFileSync(path.join(dir, 'life.before.ts'), life); fs.writeFileSync(path.join(dir, 'life.control.ts'), faultLife);
    const expectedCause = mode === 'body' ? 'Only one exact recorded documentary addition may bind the old Cold proof'
      : 'Removing only the full631 body and unique priority pair must restore the whole held42a Life source';
    const row = { mode, expectedCause, injection: { anchor, offset, text: injection, beforeSha256: sha(original),
      afterSha256: sha(copied), inverseSha256: sha(inverse) }, lifeFault: { offset: lifeOffset, anchor: mode === 'body' ? effect : '',
      replacement: mode === 'body' ? wrongEffect : '\n ', beforeSha256: sha(life), afterSha256: sha(faultLife), inverseSha256: sha(lifeInverse) } };
    progress.arms.push(row); save(); write(path.join(dir, 'transform.json'), row);
    const childFile = path.join(ROOT, `scripts/.qa-documentary-binding-${mode}-${randomUUID()}.mjs`);
    const tmpRoot = path.join(ROOT, 'tmp'), beforeDirs = new Set(fs.existsSync(tmpRoot) ? fs.readdirSync(tmpRoot) : []);
    let result;
    try {
      fs.writeFileSync(childFile, copied);
      result = spawnSync(process.execPath, [childFile], { cwd: ROOT, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', CAREER_COLD_PHASE: 'fixed', CAREER_COLD_OUT: dir,
          SC_COLD_CONTEXT_EXPECT_RED: '', SC_COLD_CONTEXT_CONTROL: '' } });
    } finally {
      fs.rmSync(childFile, { force: true });
      row.emptyTemporaryDirectories = [];
      for (const name of fs.existsSync(tmpRoot) ? fs.readdirSync(tmpRoot) : []) {
        if (beforeDirs.has(name) || !name.startsWith('soccer-cold-context-')) continue;
        const temporary = path.resolve(tmpRoot, name); assert(temporary.startsWith(tmpRoot + path.sep));
        if (fs.statSync(temporary).isDirectory() && fs.readdirSync(temporary).length === 0) {
          row.emptyTemporaryDirectories.push(path.relative(ROOT, temporary)); fs.rmdirSync(temporary);
        }
      }
      save();
    }
    const output = (result.stdout || '') + (result.stderr || '');
    fs.writeFileSync(path.join(dir, 'output.log'), output);
    row.process = { status: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code } : null };
    row.outputSha256 = sha(output); write(path.join(dir, 'process.json'), row.process); save();
    assert.equal(result.error, undefined, 'Actual guard child must complete without process errors');
    assert.equal(result.signal, null); assert.equal(result.status, 1, 'Actual source-equivalence guard must reject each effective fault');
    assert(!SETUP.test(output), 'No setup, module or unhandled failure credit');
    assert.deepEqual(output.match(/^AssertionError \[ERR_ASSERTION\]: .+$/gm), ['AssertionError [ERR_ASSERTION]: ' + expectedCause]);
    assert.equal(fs.readFileSync(path.join(childOut, 'soccerCareerLife.ts.before'), 'utf8'), faultLife, 'Actual child source map adopted exactly the retained fault');
    assert.equal(fs.readFileSync(path.join(childOut, path.basename(childFile) + '.before'), 'utf8'), copied, 'Actual child retained the full copied helper');
    assert(!fs.existsSync(path.join(childOut, 'unit.json')) && !fs.existsSync(path.join(childOut, 'engine.mjs')), 'The actual source guard must refuse before compilation or unit execution');
    if (mode === 'unrelated') {
      const binding = JSON.parse(fs.readFileSync(path.join(childOut, 'documentary-life-binding.json'), 'utf8'));
      assert.equal(binding.candidateSha256, sha(faultLife)); assert.notEqual(binding.inverseSha256, binding.parentSha256);
      assert.equal(sha(fs.readFileSync(path.join(childOut, binding.inversePath))), binding.inverseSha256);
      row.rejectedBinding = binding;
    }
    for (const [file, before] of held) assert.deepEqual(fs.readFileSync(path.join(ROOT, file)), before, 'Every actual app and proof file must stay held');
    row.effective = true; row.status = 'qualified-rejection'; save(); write(path.join(dir, 'qualified.json'), row);
    console.log(`Actual Cold binding ${mode}: child exit1; one exact guard refusal; effective source-map fault ${row.lifeFault.afterSha256}.`);
  }
  progress.status = 'complete'; save();
  console.log(`Actual source held: ${held.size} files; both full helper inverses and both physical Life fault copies retained.`);
  console.log('Two actual old-Cold source guard refusals: known631 corruption and unrelated whole-parent drift. No app mutation or child compiler/unit credit.');
} catch (error) { progress.methodError = error?.stack || String(error); save(); throw error; }
