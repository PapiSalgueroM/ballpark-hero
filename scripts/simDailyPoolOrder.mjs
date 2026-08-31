/**
 * Round 362: the daily puzzle's pool arrives in a guaranteed order, and every
 * column the code orders by actually exists.
 *
 * WHY SECTION 1 EXISTS. src/lib/dateUtils.ts documents pool[dateSeed % length]
 * as this site's daily mechanism, deliberately: consecutive days differ by one,
 * the index moves by one, the pool rotates. That is correct, and it rests
 * entirely on the pool arriving in the same order every time. A select with no
 * order by gives no such guarantee. Postgres returns heap order, which looks
 * perfectly stable right up until a row is edited, because an UPDATE rewrites
 * that tuple to the end of the heap and shifts every index after it. The
 * mapping from date to puzzle then changes silently, and two players on the
 * same date can be served different puzzles. Three hooks had this
 * (useCbbProgram, useNascarDriver, useGuessTheNation) and the codebase already
 * did it right everywhere else, which is what made them worth fixing rather
 * than worth redesigning.
 *
 * WHY SECTION 2 EXISTS, AND IT IS THE ONE THAT EARNS ITS KEEP. Fixing section 1
 * meant adding .order('id') to three tables. One of them, nascar_drivers, HAS
 * NO id COLUMN, and no primary key either. That query returns a 400 and the
 * hook turns it into its error state, so the game would simply have stopped
 * working. Nothing would have caught it: the Supabase client is reached through
 * `as any` in several of these hooks, so tsc sees nothing, and no unit test
 * touches a live schema. Section 2 asks the database whether every column the
 * code orders by is real.
 *
 * What it holds:
 *   1. Every file that takes a date derived index over a fetched pool orders
 *      that fetch explicitly.
 *   2. Every (table, order column) pair anywhere in src resolves against the
 *      live schema.
 *
 * NEGATIVE CONTROLS, one per section:
 *   DAILYORDER_CONTROL=noorder strips the .order() out of one hook's in memory
 *   copy (refusing to run if there was none to strip) and section 1 goes red.
 *   DAILYORDER_CONTROL=badcolumn adds a (table, column) pair that cannot exist
 *   and section 2 goes red.
 *
 * Run: node scripts/simDailyPoolOrder.mjs   (needs the network for section 2)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.DAILYORDER_CONTROL || '';
if (CONTROL && CONTROL !== 'noorder' && CONTROL !== 'badcolumn') {
  console.error(`DAILYORDER_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}
const FILES = walk(path.join(ROOT, 'src')).map(p => ({ p, rel: path.relative(ROOT, p).replaceAll('\\', '/'), src: fs.readFileSync(p, 'utf8') }));

/* Strip comments before matching anything. This repo has been bitten four
   separate times by a guard that was satisfied by the prose explaining why the
   guard exists, and the notes added in this very round say "order" repeatedly. */
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* Take each .from('table') and the chain that follows it, bounded either by the
   next .from( or by 400 characters, whichever comes first. An earlier draft
   expressed this as one regex with a lookahead for the next .from(, which
   silently DROPPED any chain whose successor sat further than the window: the
   match simply failed and the table was never examined. It reported
   useGuessTheNation as having zero pool reads while that file was the very one
   under investigation. A harness that cannot see a file passes it. */
function chains(c) {
  const out = [];
  for (const m of c.matchAll(/\.from\s*\(\s*['"`]([a-z0-9_]+)['"`]\s*\)/g)) {
    const start = m.index + m[0].length;
    const rest = c.slice(start, start + 400);
    const next = rest.search(/\.from\s*\(/);
    out.push({ table: m[1], body: next === -1 ? rest : rest.slice(0, next) });
  }
  return out;
}

/* A daily index: a modulo by something's .length in a file that also derives a
   seed from the date. Deliberately shape based rather than a list of hooks, so
   a game added tomorrow is covered without anyone remembering. */
const DATE_SEEDED = /dateSeed\s*\(|getDateSeed\s*\(|parseInt\s*\(\s*(?:today|todayStr|getTodayET\(\)|getTodayStr\(\))/;
const MODULO_INDEX = /%\s*[A-Za-z_$][\w$.]*\.length/;

console.log('1) every date indexed pool is fetched with an explicit order');
{
  const candidates = FILES.filter(f => {
    const c = code(f.src);
    return DATE_SEEDED.test(c) && MODULO_INDEX.test(c) && /\.from\s*\(\s*['"`]/.test(c);
  });
  console.log(`   ${candidates.length} files take a date derived index over a fetched pool`);
  if (candidates.length < 3) {
    fail(`only ${candidates.length} such files found, which means this scan stopped recognising the pattern rather than that the pattern went away`);
  }

  for (const f of candidates) {
    let c = code(f.src);
    if (CONTROL === 'noorder' && f.rel.endsWith('useCbbProgram.ts')) {
      const before = c;
      c = c.replace(/\n\s*\.order\([^)]*\)/, '');
      if (c === before) { console.error('control cannot run: useCbbProgram had no .order() to strip'); process.exit(1); }
      console.log('   NEGATIVE CONTROL ON: useCbbProgram stripped of its .order(), section 1 must go red');
    }
    /* Count select chains that feed a pool against the ones that order. A file
       may legitimately hold several queries (a pool read plus a score write),
       so the rule is that it must not contain MORE unordered pool selects than
       ordered ones, checked by looking at each .from(...) chain in turn. */
    const found = chains(c);
    const poolReads = found.filter(m => /\.select\s*\(/.test(m.body) && !/\.insert\s*\(|\.upsert\s*\(/.test(m.body));
    /* A chain narrowed with .eq(, .single() or a head count is a lookup or a
       tally, not the positional pool: useHofOrBust reads hof_votes filtered to
       one player and reduces it to two numbers, and nothing is ever indexed by
       position. Only unnarrowed reads can be the pool. The honest limit of this
       rule is that a pool which legitimately filters (say .eq('active', true))
       and is then indexed would be missed; no such pool exists today. */
    const unordered = poolReads.filter(m => !/\.order\s*\(/.test(m.body) && !/\.eq\s*\(|\.single\s*\(|\.maybeSingle\s*\(|head:\s*true/.test(m.body));
    console.log(`   ${f.rel.padEnd(42)} ${poolReads.length} pool reads, ${unordered.length} without an order`);
    for (const u of unordered) {
      fail(`${f.rel} selects from "${u.table}" with no .order(), and the file indexes a pool by date, so the date to puzzle mapping is not guaranteed stable`);
    }
  }
}

console.log('2) every column the code orders by exists on that table');
{
  /* Pair each .from('table') with the .order('column') calls in the same chain.
     Both live and generated types are bypassed with `as any` in several hooks,
     so tsc cannot see these and only the database can answer. */
  const pairs = new Map();
  for (const f of FILES) {
    const c = code(f.src);
    for (const m of chains(c)) {
      for (const o of m.body.matchAll(/\.order\s*\(\s*['"`]([a-z0-9_]+)['"`]/g)) {
        pairs.set(`${m.table}.${o[1]}`, { table: m.table, column: o[1], file: f.rel });
      }
    }
  }
  if (CONTROL === 'badcolumn') {
    pairs.set('cbb_programs.column_that_cannot_exist', { table: 'cbb_programs', column: 'column_that_cannot_exist', file: '(control)' });
    console.log('   NEGATIVE CONTROL ON: an impossible order column added, section 2 must go red');
  }

  const list = [...pairs.values()];
  console.log(`   ${list.length} distinct (table, order column) pairs in src`);
  if (list.length < 10) fail(`only ${list.length} pairs found, so this scan is not reading the source properly`);

  let bad = 0;
  for (const pr of list) {
    const r = await fetch(`${URL_}/rest/v1/${pr.table}?select=${pr.column}&order=${pr.column}.asc&limit=1`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (!r.ok) {
      let msg = '';
      try { msg = (JSON.parse(await r.text()) || {}).message || ''; } catch { msg = `${r.status}`; }
      /* A table the anon key cannot read at all is not this check's business:
         it reports 401/42501 rather than a missing column. */
      if (r.status === 401 || r.status === 403) continue;
      bad += 1;
      fail(`${pr.file} orders ${pr.table} by "${pr.column}" and the database says: ${msg}`);
    }
  }
  console.log(`   ${list.length - bad} of ${list.length} resolve against the live schema`);
}

console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`simDailyPoolOrder control (${CONTROL}): green. It was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simDailyPoolOrder control (${CONTROL}): RED. The planted fault went unnoticed.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simDailyPoolOrder: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simDailyPoolOrder: green. Every date indexed pool is ordered, and every order column is real.');
