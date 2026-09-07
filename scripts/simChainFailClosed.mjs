/* A chain game never ends your run because it could not check the answer.
 *
 * Round 500. The standing rule in CLAUDE.md is explicit: "Connect4 and chain
 * hooks reject without ending the game on network errors." All three chain
 * games broke it, and each hook carried a correct FAIL CLOSED comment over a
 * catch block that could not fire.
 *
 * WHY THE CATCH COULD NOT FIRE. Every infrastructure failure in these
 * validators answers HTTP 200 with a bare {valid:false}. A 200 is not a thrown
 * error, so it sailed past the catch, landed in the branch that handles a wrong
 * answer, ended the run and filed the score through useGameCompletion. The
 * validators' own reason strings said "so this cannot be counted" and then the
 * client counted it. Twelve return sites across the three files: nine saying
 * "cannot be counted" (a missing service key, a PostgREST error mid-page, an
 * empty read, an unhandled exception) and three rate limiter 429s.
 *
 * WORSE IN NBA CHAIN, and it needed no outage at all. useNbaChain used a raw
 * fetch with no resp.ok check anywhere, so the validator's own rate limiter
 * (429, "Slow down a moment and try again") was parsed straight into the
 * verdict. A fast typist could end their own game.
 *
 * AND THE DEFERRAL THE VALIDATOR ADDED ON PURPOSE WAS NULLIFIED.
 * nba-chain-validate has a branch so a pairing the data cannot settle is NOT
 * judged: when both men are still active at the 2024 data edge it returns
 * {valid:false, coverageGap:true} explaining the records stop in 2024. Nothing
 * in src read that flag, so the deferral ended the run. Measured 2026-09-07
 * over the live table: 569 players sit at the 2024 edge and 148,608 of their
 * 161,596 pairs (92 percent) land on it. Alperen Sengun and Kevin Durant are
 * real Houston teammates in 2025-26, so answering correctly ended your game.
 *
 * WHAT THIS HOLDS:
 *   1. Every infrastructure return in the three validators carries unverified,
 *      and no genuine sport verdict does. Marking a real "they were never
 *      teammates" as unverified would be the opposite mistake and would hand
 *      out free retries forever.
 *   2. All three hooks treat unverified as a retry that ends nothing.
 *   3. useNbaChain checks the response status before reading a verdict out of
 *      the body, and reads the coverageGap flag.
 *   4. Live, against the deployed function and costing nothing: the real
 *      Sengun/Durant pairing still comes back as a deferral rather than a
 *      verdict, so the branch this round exists to honour is really reachable.
 *
 * NEGATIVE CONTROLS, both fire on correct code:
 *   CHAIN_FAILCLOSED_CONTROL=bareverdict strips the unverified flag as the
 *     harness reads the validators, reproducing what shipped, so section 1 goes
 *     red naming the sites.
 *   CHAIN_FAILCLOSED_CONTROL=endsrun expects the hooks to END the run on an
 *     unverified reply, which is what they used to do, so section 2 goes red.
 *
 * Run: node scripts/simChainFailClosed.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CHAIN_FAILCLOSED_CONTROL || '';
if (CONTROL && !['bareverdict', 'endsrun'].includes(CONTROL)) {
  console.error(`CHAIN_FAILCLOSED_CONTROL=${CONTROL} is not a control this harness knows (bareverdict, endsrun)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const GAMES = [
  { key: 'tennis', fn: 'tennis-chain-validate', hook: 'useTennisChain.ts' },
  { key: 'nascar', fn: 'nascar-chain-validate', hook: 'useNascarChain.ts' },
  { key: 'nba', fn: 'nba-chain-validate', hook: 'useNbaChain.ts' },
];

/* an infrastructure refusal is one whose own text says it could not check, or
   the rate limiter. Everything else is a verdict about the sport. */
const INFRA = /cannot be counted|Slow down a moment/;

console.log('1) every infrastructure refusal says unverified, and no sport verdict does');
{
  let infra = 0, flagged = 0, verdicts = 0, wronglyFlagged = 0;
  for (const g of GAMES) {
    let src = readFileSync(path.join(ROOT, 'supabase', 'functions', g.fn, 'index.ts'), 'utf8');
    if (CONTROL === 'bareverdict') src = src.replace(/valid: false, unverified: true,/g, 'valid: false,');
    /* every object literal that answers valid:false, with its reason */
    const returns = [...src.matchAll(/\{\s*valid: false,(?:\s*unverified: true,)?\s*reason:\s*(`[^`]*`|"[^"]*")/g)];
    if (returns.length === 0) fail(`${g.fn}: no valid:false returns were parsed, so this section proved nothing for it`);
    for (const m of returns) {
      const isInfra = INFRA.test(m[1]);
      const hasFlag = /unverified: true/.test(m[0]);
      if (isInfra) {
        infra += 1;
        if (hasFlag) flagged += 1;
        else fail(`${g.fn} refuses with ${m[1].slice(0, 58)}... and no unverified flag, so the hook will end the run and file the score`);
      } else {
        verdicts += 1;
        if (hasFlag) { wronglyFlagged += 1; fail(`${g.fn} marks a real sport verdict unverified (${m[1].slice(0, 50)}...), which hands out a free retry on a genuinely wrong answer`); }
      }
    }
  }
  console.log(`   ${infra} infrastructure refusals, ${flagged} flagged; ${verdicts} sport verdicts, ${wronglyFlagged} wrongly flagged`);
  if (infra < 9) fail(`only ${infra} infrastructure refusals found across three validators, which is fewer than the nine this round measured`);
  if (CONTROL === 'bareverdict' && flagged === infra) {
    console.error('   CONTROL bareverdict changed nothing: stripping the flag must leave refusals unflagged');
    process.exit(1);
  }
}

console.log('2) every hook treats unverified as a retry that ends nothing');
{
  for (const g of GAMES) {
    const src = readFileSync(path.join(ROOT, 'src', 'hooks', g.hook), 'utf8');
    const reads = /\.unverified\b/.test(src);
    if (!reads) fail(`${g.hook} never reads the unverified flag, so a refusal the validator marked uncountable still ends the run`);
    /* The branch that handles unverified must not end the game. BRACE MATCHED,
       not a fixed character window: the first draft read 700 characters from
       the flag and so measured whichever block happened to come next, which
       made the answer depend on how long the comment above it was. Tennis
       passed and NBA failed on identical, correct code. A window that slides
       onto the neighbouring block is not a check, it is a coin toss. */
    const idx = src.indexOf('.unverified');
    let branch = '';
    if (idx >= 0) {
      const open = src.indexOf('{', idx);
      if (open >= 0) {
        let depth = 0;
        for (let i = open; i < src.length; i += 1) {
          if (src[i] === '{') depth += 1;
          else if (src[i] === '}') { depth -= 1; if (depth === 0) { branch = src.slice(open, i + 1); break; } }
        }
      }
    }
    if (idx >= 0 && !branch) fail(`${g.hook}: could not find the body of the unverified branch, so this section proved nothing for it`);
    const endsIt = /gameStatus:\s*'ended'|setPhase\('ended'\)/.test(branch);
    const wantEnds = CONTROL === 'endsrun';
    if (endsIt !== wantEnds) {
      if (endsIt) fail(`${g.hook} still ends the run inside its unverified branch, which is the whole defect`);
      else fail(`${g.hook}: control endsrun expected the run to end here and it does not`);
    }
    console.log(`   ${g.hook.padEnd(20)} reads unverified: ${reads ? 'yes' : 'NO'}; ends the run there: ${endsIt ? 'YES' : 'no'}`);
  }
  if (CONTROL === 'endsrun' && failures === 0) {
    console.error('   CONTROL endsrun changed nothing');
    process.exit(1);
  }
}

console.log('3) NBA Chain reads the status line and the coverage flag');
{
  const src = readFileSync(path.join(ROOT, 'src', 'hooks', 'useNbaChain.ts'), 'utf8');
  const okCheck = /if\s*\(!resp\.ok\)/.test(src);
  const gap = /coverageGap/.test(src);
  if (!okCheck) fail('useNbaChain does not check resp.ok, so the validator\'s own 429 rate limiter is parsed into a verdict and ends the run');
  if (!gap) fail('useNbaChain does not read coverageGap, so the deferral the validator adds on purpose still ends the run');
  /* the status check has to come BEFORE the body is read as a verdict */
  const okAt = src.indexOf('if (!resp.ok)');
  const jsonAt = src.indexOf('await resp.json()');
  if (okAt > 0 && jsonAt > 0 && okAt > jsonAt) fail('useNbaChain checks resp.ok only after parsing the body as a verdict');
  console.log(`   resp.ok checked: ${okCheck ? 'yes' : 'NO'} (at ${okAt}, before json at ${jsonAt}); coverageGap read: ${gap ? 'yes' : 'NO'}`);
}

console.log('4) the deferral is really reachable, against the deployed function');
{
  const client = readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
  const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
  const r = await fetch(`${URL_}/functions/v1/nba-chain-validate`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', origin: 'https://douknowball.com' },
    body: JSON.stringify({ previousPlayer: 'Alperen Sengun', newPlayer: 'Kevin Durant' }),
  });
  const b = await r.json().catch(() => ({}));
  console.log(`   Sengun + Durant -> status ${r.status} valid=${b.valid} coverageGap=${b.coverageGap ?? false} unverified=${b.unverified ?? false}`);
  if (r.status !== 200) fail(`the deployed nba-chain-validate answered ${r.status} for a normal pairing`);
  else if (b.coverageGap !== true) {
    fail(`the deployed function no longer defers on Sengun/Durant (valid=${b.valid}, reason ${String(b.reason).slice(0, 90)}). They are real 2025-26 Houston teammates, so either the data now covers 2025-26, in which case retire this probe deliberately, or the deferral branch has been lost.`);
  }
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else {
  console.log(failures === 0
    ? '\nsimChainFailClosed: green. A chain game that cannot check your answer says so, and your run survives.'
    : `\nsimChainFailClosed: ${failures} finding(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}
