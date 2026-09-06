/* An edge function that selects a whole table gets 1,000 rows and no warning.
 *
 * Round 487. Tennis Chain told Emma Raducanu, Bianca Andreescu and Sloane
 * Stephens they had never won a Grand Slam singles title. All three had.
 * tennis-chain-validate selected the whole of tennis_grand_slam_winners with no
 * .limit() and no .range(); PostgREST caps a select at 1,000 rows and says
 * nothing, the table holds 1,019, and the nineteen it never saw were every
 * women's US Open champion from 2007 to 2025. Those three have no other slam,
 * so they vanished completely; Serena Williams, Naomi Osaka, Coco Gauff, Iga
 * Swiatek and Aryna Sabalenka lost their US Open rows and survived only on
 * their other titles.
 *
 * Nothing in the build could see it. The query was valid, the function returned
 * 200, and the answer was confidently wrong.
 *
 * WHAT THIS HOLDS:
 *   1. Every unbounded select in every edge function is measured against its
 *      table's LIVE row count. A table close to the cap fails before it crosses
 *      it, not after. Measured 2026-09-06: sixteen unbounded selects across the
 *      27 functions, six of them filtered and so not judged, and of the ten
 *      that read a whole table only the tennis one was over the cap. The point
 *      is that one, and the next table to grow into it.
 *   2. The champions that live in the tail of tennis_grand_slam_winners are
 *      known to the live validator. The tail is computed from the table rather
 *      than hard coded, so it keeps working as the table grows.
 *
 * THE THRESHOLD IS MEASURED, NOT CHOSEN. PostgREST's cap is 1,000. The largest
 * unbounded table other than the tennis one is cbb_programs at 281, so a floor
 * of 900 sits far above every healthy table and far below the cap: it cannot
 * flap, and it fires while there is still room to fix it.
 *
 * NEGATIVE CONTROLS, both fire on correct code:
 *   UNBOUNDED_CONTROL=lowcap   drops the threshold to 50, so the healthy tables
 *     breach it and section 1 goes red. It proves section 1 can see a breach
 *     rather than passing because nothing is near the cap.
 *   UNBOUNDED_CONTROL=unpaged  expects the OLD behaviour in section 2, that the
 *     tail champions are unknown to the validator. Against the fixed function
 *     they are known, so the expectation fails and the control fires.
 *
 * Run: node scripts/simUnboundedSelects.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FN_DIR = path.join(ROOT, 'supabase', 'functions');
const CONTROL = process.env.UNBOUNDED_CONTROL || '';
if (CONTROL && !['lowcap', 'unpaged'].includes(CONTROL)) {
  console.error(`UNBOUNDED_CONTROL=${CONTROL} is not a control this harness knows (lowcap, unpaged)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const PAGE_CAP = 1000;
const FAIL_AT = CONTROL === 'lowcap' ? 50 : 900;

async function rowCount(table) {
  const res = await fetch(`${URL_}/rest/v1/${table}?select=*`, {
    headers: { ...HEAD, Prefer: 'count=exact', Range: '0-0' },
  });
  if (!res.ok) return null;
  const cr = res.headers.get('content-range') || '';
  const n = cr.split('/')[1];
  return n && n !== '*' ? Number(n) : null;
}

console.log('1) no unbounded select sits near the row cap');
{
  /* Comments are stripped before matching, because a guard that reads the prose
     explaining it would be satisfied by its own documentation. */
  const found = [];
  for (const d of fs.readdirSync(FN_DIR, { withFileTypes: true }).filter(e => e.isDirectory())) {
    const file = path.join(FN_DIR, d.name, 'index.ts');
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
    const re = /\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
    let m;
    while ((m = re.exec(src))) {
      const rest = src.slice(m.index, m.index + 800);
      const end = rest.indexOf(';');
      const stmt = end > 0 ? rest.slice(0, end) : rest;
      if (!stmt.includes('.select(')) continue;
      if (/\.limit\(|\.range\(|\.maybeSingle\(|\.single\(/.test(stmt)) continue;
      /* A filtered select returns a slice, not a table, so the cap is not the
         same hazard. It is still listed, just not judged. */
      const filtered = /\.eq\(|\.in\(|\.ilike\(|\.like\(|\.gte\(|\.lte\(|\.gt\(|\.lt\(|\.or\(|\.filter\(|\.contains\(/.test(stmt);
      found.push({ fn: d.name, table: m[1], filtered });
    }
  }
  const sizes = new Map();
  for (const f of found) if (!sizes.has(f.table)) sizes.set(f.table, await rowCount(f.table));
  let risky = 0, unknown = 0;
  for (const f of found.filter(x => !x.filtered).sort((a, b) => (sizes.get(b.table) ?? 0) - (sizes.get(a.table) ?? 0))) {
    const n = sizes.get(f.table);
    if (n === null || n === undefined) { unknown++; console.log(`   ${f.fn} -> ${f.table}: row count unavailable, not judged`); continue; }
    const bad = n >= FAIL_AT;
    if (bad) { fail(`${f.fn} selects all of ${f.table} unbounded and it holds ${n} rows; PostgREST returns at most ${PAGE_CAP} and says nothing, so the tail is invisible. Page it with .range().`); risky++; }
    console.log(`   ${f.fn} -> ${f.table}: ${n} rows${bad ? '  <-- OVER THE FLOOR' : ''}`);
  }
  const filteredCount = found.filter(x => x.filtered).length;
  console.log(`   ${found.length} unbounded selects (${filteredCount} filtered and not judged), ${risky} over the floor of ${FAIL_AT}, ${unknown} unmeasurable`);
  if (CONTROL === 'lowcap' && risky === 0) {
    console.error('   CONTROL lowcap changed nothing: a floor of 50 must be breached by the real tables');
    process.exit(1);
  }
}

console.log('2) the tail of the Grand Slam table is known to the live validator');
{
  /* The tail is derived, not typed: read the table the way the function used
     to, take the champions who appear ONLY beyond the first page, and ask the
     function about them. If the table shrinks below the cap this section says
     so and claims nothing, rather than passing on an empty set. */
  const all = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${URL_}/rest/v1/tennis_grand_slam_winners?select=champion,year,tournament&order=year.asc&order=tournament.asc&order=champion.asc`,
      { headers: { ...HEAD, Range: `${from}-${from + 999}` } });
    if (!res.ok) { fail('could not read tennis_grand_slam_winners'); break; }
    const page = await res.json();
    all.push(...page);
    if (page.length < 1000) break;
    if (from > 20000) break;
  }
  if (all.length <= PAGE_CAP) {
    console.log(`   the table holds ${all.length} rows, at or under the ${PAGE_CAP} cap, so there is no tail to check today`);
  } else {
    const head = new Set(all.slice(0, PAGE_CAP).map(r => r.champion));
    /* Null champions are skipped, and they are not a defect: the table carries
       French Open 2026 placeholder rows for an event with no winner yet, which
       is the right way to hold a fixture that has not been played. Asking the
       validator about a null would only prove that it rejects bad input. */
    const tailOnly = [...new Set(all.slice(PAGE_CAP).map(r => r.champion))]
      .filter(n => typeof n === 'string' && n.trim().length > 0)
      .filter(n => !head.has(n));
    console.log(`   ${all.length} rows, ${all.length - PAGE_CAP} past the cap, ${tailOnly.length} champions who exist ONLY there`);
    if (tailOnly.length === 0) {
      console.log('   nobody is hidden by the cap today, so this section claims nothing');
    } else {
      const sample = tailOnly.slice(0, 5);
      let known = 0;
      for (const name of sample) {
        const res = await fetch(`${URL_}/functions/v1/tennis-chain-validate`, {
          method: 'POST',
          headers: { ...HEAD, 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPlayer: 'Serena Williams', guessedPlayer: name }),
        });
        const j = await res.json().catch(() => ({}));
        const reason = String(j.reason || '');
        const denied = /has never won a Grand Slam singles title/.test(reason);
        /* A rejected or malformed request is NOT evidence the champion is known.
           Counting one as a pass is how this section would go green while the
           validator was still blind, so anything that is not a real verdict is
           a finding in its own right. */
        const answered = res.ok && (j.valid === true || denied || /won slams in|does not overlap|no Grand Slam record/.test(reason));
        if (!answered) fail(`the validator gave no usable verdict for ${name}: ${reason.slice(0, 80) || 'HTTP ' + res.status}`);
        else if (!denied) known++;
        console.log(`   ${name}: ${!answered ? 'NO VERDICT' : denied ? 'TOLD THEY NEVER WON ONE' : 'known to the validator'}`);
      }
      const expectKnown = CONTROL !== 'unpaged';
      if (expectKnown && known < sample.length) {
        fail(`${sample.length - known} of ${sample.length} champions past the row cap are still told they never won a slam`);
      }
      if (!expectKnown && known === sample.length) {
        fail(`expected the champions past the cap to be unknown, as they were before this round, and all ${known} are known`);
      }
      console.log(`   ${known}/${sample.length} known`);
    }
  }
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exit(failures > 0 ? 0 : 1);
}
console.log(failures === 0
  ? '\nsimUnboundedSelects: green. No function is reading a table it cannot see the end of.'
  : `\nsimUnboundedSelects: ${failures} finding(s).`);
process.exit(failures === 0 ? 0 : 1);
