/**
 * Round 316 harness: no validator ever accepts an answer it could not check.
 *
 * The July 2026 P1: with the free Gemini quota exhausted, validators that
 * returned {valid:true} on their error paths accepted every nonsense answer
 * on the site. The rule was written into CLAUDE.md, the grid validators were
 * fixed, and then the same shape was found alive TWICE more: Round 315 found
 * Build Your XI's deployed validator accepting on every failure path, and
 * Round 316 found four more repo copies carrying it (three turned out to be
 * stale files hiding fixed deployed versions, one was live in production).
 * A rule that has been reintroduced three times needs a fence, not a memory.
 *
 * WHAT IT HOLDS, on every supabase/functions/x/index.ts, comments stripped
 * (a guard that reads prose lies, per the standing harness rules):
 *   1. No object pairs valid:true with an error-shaped reason ("Could not
 *      verify", "Could not parse", "Validation error", "allowing", or
 *      "Accepted (validation error)"). That exact pairing is the smoking gun
 *      of every fail-open found so far; deterministic verdicts that honestly
 *      earn valid:true ("Verified from NFL career records") do not match.
 *   2. Any function that returns unverified:true must also say valid:false
 *      beside it somewhere, because unverified-but-valid is a contradiction.
 *
 * NEGATIVE CONTROL: VALIDATOR_CONTROL=open appends a fail-open literal to one
 * function's source in memory and section 1 must go red.
 *
 * Run: node scripts/simValidatorsFailClosed.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FN_DIR = path.join(ROOT, 'supabase', 'functions');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.VALIDATOR_CONTROL || '';
if (CONTROL && CONTROL !== 'open') { console.error(`VALIDATOR_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const fns = fs.readdirSync(FN_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .filter(n => fs.existsSync(path.join(FN_DIR, n, 'index.ts')));

console.log('1) no error path returns valid:true');
const ERROR_REASONS = /(could not verify|could not parse|validation error|, allowing|accepted \(validation error\)|unable to check|unable to verify)/i;
let controlArmed = false;
let scanned = 0;
let unverifiedFns = 0;
for (const name of fns) {
  let text = fs.readFileSync(path.join(FN_DIR, name, 'index.ts'), 'utf8');
  if (CONTROL === 'open' && !controlArmed) {
    const planted = '\nconst fallback = { valid: true, reason: "Could not verify, allowing." };\n';
    const before = text;
    text += planted;
    if (text === before) { console.error('control changed nothing'); process.exit(1); }
    controlArmed = true;
    console.log(`   NEGATIVE CONTROL ON: a fail-open literal appended to ${name} in memory, this section must go red`);
  }
  const code = strip(text);
  scanned += 1;
  /* an object that contains valid: true and an error-shaped reason within a
     few lines of each other is the exact fail-open literal every incident
     used. Window rather than brace matching, so formatting cannot hide it. */
  for (const m of code.matchAll(/valid:\s*true/g)) {
    const window = code.slice(Math.max(0, m.index - 200), m.index + 300);
    if (ERROR_REASONS.test(window)) {
      fail(`${name}/index.ts pairs valid:true with an error-shaped reason, the July P1 fail-open shape`);
      break;
    }
  }
  /* 2: unverified means NOT valid, always */
  if (/unverified:\s*true/.test(code)) {
    unverifiedFns += 1;
    if (!/valid:\s*false[^}]{0,120}unverified:\s*true|unverified:\s*true[^}]{0,120}valid:\s*false/s.test(code)) {
      fail(`${name}/index.ts returns unverified:true without valid:false beside it`);
    }
  }
}
console.log(`   ${scanned} edge functions scanned`);
console.log(`   ${unverifiedFns} of them return unverified:true and owe a valid:false beside it`);

console.log('');
if (CONTROL === 'open') {
  if (failures > 0) { console.log(`simValidatorsFailClosed control: green. The planted fail-open was reported (${failures} finding).`); process.exit(0); }
  console.error('simValidatorsFailClosed control: RED. A planted fail-open went unreported.'); process.exit(1);
}
if (failures > 0) { console.error(`simValidatorsFailClosed: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simValidatorsFailClosed: green. Nothing a validator could not check gets accepted.');
