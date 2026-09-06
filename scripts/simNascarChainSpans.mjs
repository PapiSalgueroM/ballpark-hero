/* Every NASCAR Chain starting driver can actually be played from.
 *
 * Round 488. The game deals one of 25 starting drivers and asks for a champion
 * who took a title while that driver was racing. The driver's racing span came
 * from nascar_drivers.first_year and last_year, and that table is a stub: 83
 * rows, every statistical column null in all of them, 79 with no span at all,
 * and the four that have one hold 19 and 20, a year truncated to its first two
 * digits.
 *
 * So the old code fell back to the span of the driver's own TITLE years, which
 * is not a career:
 *   - Kevin Harvick's span was 2014 to 2014, one season, against a real career
 *     of 2001 to 2023. Nearly every true link to him was refused.
 *   - Martin Truex Jr. was 2017 to 2017.
 *   - A driver who never won a title had NO span, so seven of the twenty five
 *     starters could not be answered at all and the run ended on the first
 *     guess: Carl Edwards, Dale Earnhardt Jr., Denny Hamlin, Jeff Burton,
 *     Kasey Kahne, Mark Martin, Ryan Newman.
 *
 * The fix derives the span from seasons the driver is RECORDED in: race wins,
 * pole positions and titles. All of that is real data already in the database,
 * and nothing is invented. It is a LOWER BOUND on purpose, because a career
 * starts before the first win and ends after the last, so it can still refuse a
 * true link at the very edges. Refusing what cannot be proven is the direction
 * this validator is meant to fail in.
 *
 * WHAT THIS HOLDS, against the live database and the live function:
 *   1. Every starter has a derived span, measured against the baseline of how
 *      many would have had one under the old title-only rule. A fix that
 *      quietly stopped working would drop back towards that baseline.
 *   2. No derived span is absurd: first <= last, and both inside the sport.
 *   3. The live function answers for the drivers who used to be unanswerable,
 *      and still refuses a link across eras and a name that is not a driver.
 *   4. The source reads the race tables, so a revert to title years alone is
 *      caught even on a day when the live probes happen to pass.
 *
 * NEGATIVE CONTROLS, both fire on correct code:
 *   NASCAR_SPANS_CONTROL=titlesonly derives the span from titles alone, which
 *     is the old rule, so section 1 drops to 18 of 25 and goes red.
 *   NASCAR_SPANS_CONTROL=sourceblind expects the source NOT to read the race
 *     tables, so section 4 goes red.
 *
 * Run: node scripts/simNascarChainSpans.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.NASCAR_SPANS_CONTROL || '';
if (CONTROL && !['titlesonly', 'sourceblind'].includes(CONTROL)) {
  console.error(`NASCAR_SPANS_CONTROL=${CONTROL} is not a control this harness knows (titlesonly, sourceblind)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function rest(qs, attempt = 0) {
  try {
    const res = await fetch(`${URL_}/rest/v1/${qs}`, { headers: HEAD });
    if (res.ok) return res.json();
  } catch { /* retried below */ }
  if (attempt === 0) { await new Promise(r => setTimeout(r, 700)); return rest(qs, 1); }
  return null;
}

/* The starters are read from the game's own list rather than copied, so a
   starter added to the game is checked without anyone remembering to. */
const startersSrc = fs.readFileSync(path.join(ROOT, 'src', 'types', 'nascarChain.ts'), 'utf8');
const block = startersSrc.slice(startersSrc.indexOf('NASCAR_CHAIN_STARTERS'));
const STARTERS = [...block.slice(0, block.indexOf('];')).matchAll(/'([^']+)'/g)].map(m => m[1]);

const enc = encodeURIComponent;

console.log('1) every starting driver has a racing span');
{
  if (STARTERS.length < 10) { fail(`only ${STARTERS.length} starters parsed from src/types/nascarChain.ts`); }
  const champs = (await rest('nascar_champions?select=year,driver_name&limit=1000')) ?? [];
  let withSpan = 0, titleOnly = 0;
  const spans = [];
  for (const name of STARTERS) {
    const titles = champs.filter(r => r.driver_name === name).map(r => r.year);
    if (titles.length > 0) titleOnly++;
    const years = [...titles];
    if (CONTROL !== 'titlesonly') {
      const [w, cw, pw] = await Promise.all([
        rest(`nascar_race_results?select=year&winner=eq.${enc(name)}&limit=1000`),
        rest(`nascar_cup_races?select=year&winning_driver=eq.${enc(name)}&limit=1000`),
        rest(`nascar_cup_races?select=year&pole_winner=eq.${enc(name)}&limit=1000`),
      ]);
      for (const set of [w, cw, pw]) for (const r of set ?? []) if (typeof r.year === 'number') years.push(r.year);
    }
    if (years.length === 0) { spans.push({ name, first: null, last: null }); continue; }
    withSpan++;
    spans.push({ name, first: Math.min(...years), last: Math.max(...years) });
  }
  console.log(`   ${withSpan}/${STARTERS.length} starters have a span; under the old title-only rule it was ${titleOnly}/${STARTERS.length}`);
  const stuck = spans.filter(s => s.first === null).map(s => s.name);
  if (stuck.length) fail(`${stuck.length} starting drivers have no span at all and the run ends on the first guess: ${stuck.join(', ')}`);
  if (CONTROL === 'titlesonly' && stuck.length === 0) {
    console.error('   CONTROL titlesonly changed nothing: title years alone must leave starters without a span');
    process.exit(1);
  }

  console.log('2) no derived span is absurd');
  const NOW = 2026;
  let bad = 0;
  for (const s of spans.filter(x => x.first !== null)) {
    if (s.first > s.last || s.first < 1949 || s.last > NOW + 1) { fail(`${s.name} has an impossible span ${s.first} to ${s.last}`); bad++; }
  }
  console.log(`   ${spans.filter(x => x.first !== null).length} spans checked, ${bad} impossible`);
  const sample = spans.filter(x => x.first !== null).slice(0, 4);
  sample.forEach(s => console.log(`   ${s.name}: ${s.first} to ${s.last}`));
}

console.log('3) the live function answers the drivers who could not be played from');
{
  /* These four had no title and therefore no span at all before this round.
     The partner is a champion who really won inside their career. */
  const PAIRS = [
    ['Denny Hamlin', 'Kyle Busch'],
    ['Dale Earnhardt Jr.', 'Jimmie Johnson'],
    ['Mark Martin', 'Dale Earnhardt'],
    ['Ryan Newman', 'Tony Stewart'],
  ];
  let ok = 0;
  for (const [cur, guess] of PAIRS) {
    const res = await fetch(`${URL_}/functions/v1/nascar-chain-validate`, {
      method: 'POST', headers: { ...HEAD, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentDriver: cur, guessedDriver: guess }),
    });
    const j = await res.json().catch(() => ({}));
    const noDates = /no recorded seasons|do not have career dates/.test(String(j.reason || ''));
    if (noDates) fail(`${cur} still has no usable career dates, so the run ends on the first guess`);
    else if (j.valid === true) ok++;
    else fail(`${guess} after ${cur} should be a valid link and came back: ${String(j.reason || '').slice(0, 80)}`);
    console.log(`   ${guess} <- ${cur}: ${j.valid === true ? j.connection : String(j.reason || '').slice(0, 60)}`);
  }
  /* The fix must not have turned the validator into a yes machine. */
  const refusals = [
    ['Richard Petty', 'Kyle Larson', 'eras that do not meet'],
    ['Jeff Gordon', 'Lionel Messi', 'not a driver at all'],
  ];
  for (const [cur, guess, why] of refusals) {
    const res = await fetch(`${URL_}/functions/v1/nascar-chain-validate`, {
      method: 'POST', headers: { ...HEAD, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentDriver: cur, guessedDriver: guess }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.valid === true) fail(`${guess} after ${cur} was ACCEPTED and should not be (${why})`);
    console.log(`   ${guess} <- ${cur}: ${j.valid === true ? 'ACCEPTED' : 'refused'} (${why})`);
  }
  console.log(`   ${ok}/${PAIRS.length} previously dead starters now answer`);
}

console.log('4) the source derives the span from recorded seasons');
{
  const src = fs.readFileSync(path.join(ROOT, 'supabase', 'functions', 'nascar-chain-validate', 'index.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const reads = CONTROL === 'sourceblind' ? false : /nascar_race_results/.test(src) && /nascar_cup_races/.test(src);
  if (!reads) fail('nascar-chain-validate no longer reads the race tables: without them a driver with no title has no span and the game ends on the first guess');
  console.log(`   reads the race tables: ${reads ? 'yes' : 'NO'}`);
  if (CONTROL === 'sourceblind' && failures === 0) {
    console.error('   CONTROL sourceblind changed nothing');
    process.exit(1);
  }
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exit(failures > 0 ? 0 : 1);
}
console.log(failures === 0
  ? '\nsimNascarChainSpans: green. Every starting driver has a real span and the game can be played from all of them.'
  : `\nsimNascarChainSpans: ${failures} finding(s).`);
process.exit(failures === 0 ? 0 : 1);
