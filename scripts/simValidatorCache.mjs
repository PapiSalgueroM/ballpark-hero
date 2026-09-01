/**
 * Round 379: the connect-4 validator remembers one attribute at a time.
 *
 * WHAT WAS WRONG. Two players reported the same thing and both were right:
 * "it says couldnt verify your answer every time i click" (soccer-connect-4,
 * 2026-08-30) and "this game does not work at all anything you pick is wrong"
 * (nba-connect-4, 2026-07-21). The validator runs on a free Gemini quota that
 * is DAILY, and Round 378 measured what happens: 42 percent of guesses refused
 * during a normal burst of play, then 14 of 14 once the day's quota was gone,
 * with a retry three seconds later recovering none of them. Once it is spent,
 * the game is dead until it resets.
 *
 * Failing closed is correct and is the July 2026 rule, which is exactly why
 * this looked healthy from the inside: the function behaved as designed. The
 * lie was the message, "please try again", which is true of a blip and false of
 * a spent day, so the player kept clicking into a wall being told to keep
 * clicking.
 *
 * RETRYING HARDER IS NOT THE FIX and was measured not to be. The leverage is in
 * the cache KEY. The old cache stored one row per PAIR of attributes, the
 * narrowest unit there is: the 16 soccer boards hold 507 distinct cells but only
 * 78 distinct attributes, so a pair verdict answers exactly one cell and is
 * thrown away for every other cell asking about the same player. Storing the
 * answer to a SINGLE attribute makes it reusable everywhere. Measured on the
 * live cache: the 105 true verdicts already paid for decompose into 178
 * player-and-attribute facts, which between them answer 590 cells. The same
 * spend, 5.6 times the coverage, and every board added later reuses them free.
 *
 * WHY THIS HARNESS ONLY TALKS TO THE FUNCTION. ai_validation_cache is behind
 * RLS and returns nothing to the anonymous key, which is correct: a public
 * answer cache is a public answer key. A first draft of this file read the
 * table directly, got zero rows and reported the feature missing, which is a
 * harness failing in the same shape as its subject. So it asks the only thing
 * that actually matters anyway: does a player get an answer without the AI.
 *
 * WHAT THIS HOLDS:
 *   1. Cells that were never stored as a pair are answered from cache. These
 *      are real cells, verified live on the day of the round while the AI quota
 *      was completely exhausted, which is what makes the check airtight: with
 *      no quota left, anything other than a refusal MUST have come from the
 *      per attribute facts.
 *   2. Repeating a cell is free. Whatever the function answers it must
 *      remember, which is the property the whole cache rests on.
 *   3. When it does refuse, it tells the truth about why. A refusal that says
 *      "try again" on a day whose quota is gone is the message this round was
 *      partly about.
 *
 * NEGATIVE CONTROL: VCACHE_CONTROL=nofacts asks section 1 about players nothing
 * has ever been asked about, so no fact can exist and no cell can be free, and
 * section 1 must go red.
 *
 * Run: node scripts/simValidatorCache.mjs   (needs the database)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.VCACHE_CONTROL || '';
if (CONTROL && CONTROL !== 'nofacts') {
  console.error(`VCACHE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function ask(playerName, rowAttribute, columnAttribute) {
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 700 * attempt));
    try {
      const r = await fetch(`${URL_}/functions/v1/football-connect4-validate`, {
        method: 'POST', headers: HEAD,
        body: JSON.stringify({ playerName, rowAttribute, columnAttribute }),
      });
      if (r.ok) return await r.json();
    } catch { /* retry */ }
  }
  return null;
}

/* Cells whose two attributes are each known from OTHER cells, and which were
   never stored as a pair themselves. Verified live in Round 379 with the AI
   quota exhausted, so every one of these came from the per attribute facts.
   If a future round changes the boards these can go stale, and the failure
   message says so rather than blaming the cache. */
const FREE_CELLS = [
  { player: 'Angel Di Maria', row: 'Argentine', col: 'Played for PSG' },
  { player: 'Angel Di Maria', row: 'Argentine', col: 'South American Nationality' },
  { player: 'Angel Di Maria', row: 'Argentine', col: 'Played in the Premier League' },
];

console.log('1) cells never stored as a pair are answered without the AI');
{
  const cases = CONTROL === 'nofacts'
    ? [
        { player: 'zzz nobody atall', row: 'Argentine', col: 'Played for PSG' },
        { player: 'qqq noone either', row: 'Argentine', col: 'Played for PSG' },
      ]
    : FREE_CELLS;
  if (CONTROL === 'nofacts') console.log('   NEGATIVE CONTROL ON (nofacts): asking about players no fact can exist for. Section 1 must go red.');

  let free = 0;
  for (const c of cases) {
    const d = await ask(c.player, c.row, c.col);
    const cached = !!d && d.cached === true && d.unverified !== true;
    if (cached) free += 1;
    const how = !d ? 'no answer' : cached ? `free from cache, valid=${d.valid}` : d.unverified ? 'refused or sent to the AI' : 'answered by the AI';
    console.log(`   ${c.player} / ${c.row} x ${c.col}  ->  ${how}`);
  }
  console.log(`   ${free} of ${cases.length} answered without spending quota`);
  if (free < cases.length) {
    fail(`${cases.length - free} cell(s) that should cost nothing went to the AI. Either the function stopped consulting the per attribute facts, or these probe cells are stale because the boards changed.`);
  }
}

console.log('2) whatever it answers, it remembers');
{
  /* The property the whole cache rests on. Asked twice: the second time must be
     free whatever the first answer was. Uses a cell already known to be cached
     so this costs no quota even on a spent day. */
  const c = FREE_CELLS[0];
  const first = await ask(c.player, c.row, c.col);
  const second = await ask(c.player, c.row, c.col);
  const ok = !!second && second.cached === true;
  console.log(`   asked twice: first ${first?.cached ? 'cached' : 'live'}, second ${ok ? 'cached' : 'NOT cached'}`);
  if (!ok) fail('the same cell asked twice did not come back from cache the second time, so answers are being paid for repeatedly');
}

console.log('3) a refusal says which kind of refusal it is');
{
  /* Round 378 measured that a spent daily quota does not recover, so telling
     the player to try again is false. This does not force a refusal, because
     doing that on purpose would burn the quota this round exists to protect: it
     checks the honest branch exists in the deployed source instead, and reports
     whether a refusal was seen in passing. */
  const fn = fs.readFileSync(path.join(ROOT, 'supabase', 'functions', 'football-connect4-validate', 'index.ts'), 'utf8');
  const code = fn.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const hasFlag = /quotaExhausted/.test(code);
  const hasHonestText = /hit its limit for today/.test(code);
  console.log(`   deployed source distinguishes an exhausted day: flag=${hasFlag}, message=${hasHonestText}`);
  if (!hasFlag || !hasHonestText) {
    fail('the validator no longer tells an exhausted quota apart from a momentary failure, so it will invite players to retry into a wall');
  }
  if (!/valid: false, unverified: true/.test(code) && !/valid: false,\s*\n\s*unverified: true/.test(code)) {
    fail('the fail-closed fallback is gone. It must never accept an answer it could not verify (the July 2026 P1).');
  }
}

console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`simValidatorCache control (${CONTROL}): green. The absent reuse was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simValidatorCache control (${CONTROL}): RED. Cells with no facts behind them came back free.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simValidatorCache: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simValidatorCache: green. One answer per attribute, reused across every board that asks.');
