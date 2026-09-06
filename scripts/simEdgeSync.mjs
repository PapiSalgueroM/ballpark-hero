/* An edge function edited in the repo and never redeployed reads as working code.
 *
 * Round 485. Build Your XI's verdict screen had been serving its "our pundit's
 * offline" fallback to every player who finished a lineup, for months. The
 * cause was one word in the DEPLOYED evaluate-lineup: `gemini-2.0-flash`, a
 * model with no free quota on this key. The repo copy of that file already said
 * `gemini-2.5-flash`, so anyone who read the repo saw correct code, and anyone
 * who trusted the repo would have concluded the function was fine.
 *
 * Worse, the two files had diverged in BOTH directions. The repo was ahead on
 * the model line and behind on everything else: the deployed version carried
 * the entire market-value fallback, sanitizeName and SYSTEM_PROMPT, none of
 * which existed in the repo file. Redeploying the repo to fix the model would
 * have deleted the fallback.
 *
 * CLAUDE.md already says the deployed version is the source of truth and that
 * this directory must be kept in step with it. Round 316 already found three
 * stale files hiding fixed deployed versions. What was missing was a check.
 *
 * WHAT THIS HOLDS. `scripts/data/edgeDeployed.json` records the sha256 of each
 * function's repo file at the moment it was last deployed and reviewed.
 *   1. Every function directory is classified: either in `synced` with a hash,
 *      or named in `unverified`. A new function cannot appear unnoticed.
 *   2. Every `synced` file still hashes to its recorded value. A file edited
 *      since it was deployed goes RED, which is exactly the state
 *      evaluate-lineup sat in.
 *   3. `unverified` is a RATCHET and may only ever shrink. It is the honest
 *      record of the functions nobody has confirmed against production yet, and
 *      it must not be padded to make this file pass.
 *
 * It deliberately does NOT claim the repo file equals the deployed file: a
 * harness cannot read the deployed source without a management token. It claims
 * the narrower, checkable thing: this file has not changed since someone last
 * deployed it. That is the state that misled everyone here.
 *
 * WHEN YOU DEPLOY A FUNCTION: update its entry (or move it out of `unverified`)
 * in the same commit. That is the whole discipline this file exists to enforce.
 *
 * Negative control: EDGE_SYNC_CONTROL=drift edits one synced file in memory, so
 * section 2 must go red. It refuses to run if the edit changed nothing.
 *
 * Run: node scripts/simEdgeSync.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FN_DIR = path.join(ROOT, 'supabase', 'functions');
const LEDGER = path.join(ROOT, 'scripts', 'data', 'edgeDeployed.json');

const CONTROL = process.env.EDGE_SYNC_CONTROL || '';
if (CONTROL && CONTROL !== 'drift') {
  console.error(`EDGE_SYNC_CONTROL=${CONTROL} is not a control this harness knows (drift)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* Line endings are normalised before hashing. This repo is checked out on
   Windows with autocrlf, so a file's bytes on disk differ between machines
   while its content does not, and a hash over the raw bytes would go red on a
   fresh clone for a reason that has nothing to do with deployment. */
const hashOf = text => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex');

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const synced = ledger.synced || {};
const unverified = new Set(ledger.unverified || []);

const dirs = fs.readdirSync(FN_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .filter(n => fs.existsSync(path.join(FN_DIR, n, 'index.ts')))
  .sort();

console.log('1) every function is classified');
{
  let unclassified = 0;
  for (const slug of dirs) {
    if (!synced[slug] && !unverified.has(slug)) {
      fail(`${slug} is neither recorded as deployed nor listed as unverified: classify it in scripts/data/edgeDeployed.json`);
      unclassified++;
    }
  }
  for (const slug of Object.keys(synced)) {
    if (!dirs.includes(slug)) fail(`the ledger records ${slug} and there is no such function directory`);
  }
  for (const slug of unverified) {
    if (!dirs.includes(slug)) fail(`the ledger lists ${slug} as unverified and there is no such function directory`);
  }
  console.log(`   ${dirs.length} functions, ${Object.keys(synced).length} recorded as deployed, ${unverified.size} unverified, ${unclassified} unclassified`);
}

console.log('2) nothing recorded as deployed has been edited since');
{
  let armed = false;
  let drifted = 0;
  for (const slug of Object.keys(synced).sort()) {
    const file = path.join(FN_DIR, slug, 'index.ts');
    if (!fs.existsSync(file)) { fail(`${slug} is in the ledger and its index.ts is gone`); continue; }
    let text = fs.readFileSync(file, 'utf8');
    if (CONTROL === 'drift' && !armed) {
      const before = text;
      text += '\n// control edit\n';
      if (text === before) { console.error('control changed nothing'); process.exit(1); }
      armed = true;
      console.log(`   NEGATIVE CONTROL ON: ${slug} edited in memory, this section must go red`);
    }
    const now = hashOf(text);
    if (now !== synced[slug].sha256) {
      fail(`${slug} has changed since it was deployed on ${synced[slug].date} (version ${synced[slug].version}). Redeploy it and update the ledger, or the live site is not running this code.`);
      drifted++;
    }
  }
  console.log(`   ${Object.keys(synced).length} checked, ${drifted} edited without a redeploy`);
  if (CONTROL === 'drift' && drifted === 0) {
    console.error('   CONTROL drift changed nothing: an edited file must be reported');
    process.exit(1);
  }
}

console.log('3) the unverified list is a ratchet');
{
  /* Measured 2026-09-06: 25 functions had never been checked against what is
     actually deployed, and Rounds 486 to 489 confirmed the nba, tennis, nascar and soccer grid validators, leaving 21. The number may fall and must never rise, because the
     only way it rises is somebody adding a function and declining to confirm
     it, or moving a confirmed one back to make this file quiet. */
  const BASELINE = 21;
  if (unverified.size > BASELINE) {
    fail(`the unverified list has grown from ${BASELINE} to ${unverified.size}: confirm the new function against production rather than adding it here`);
  }
  console.log(`   ${unverified.size} unverified against a baseline of ${BASELINE}`);
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exit(failures > 0 ? 0 : 1);
}
console.log(failures === 0
  ? '\nsimEdgeSync: green. Nothing deployed has been edited behind the live site\'s back.'
  : `\nsimEdgeSync: ${failures} finding(s).`);
process.exit(failures === 0 ? 0 : 1);
