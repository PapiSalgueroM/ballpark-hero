/**
 * Round 374: give the driver game its clues, from data that is actually true.
 *
 * THE BUG. /guess-nascar-driver read six clue columns off `nascar_drivers`:
 * vibe_word, era_hint, car_number_hint, wins_hint, championship_hint,
 * famous_moment_hint, plus common_names. NONE OF THOSE COLUMNS EXIST. Every
 * clue rendered as undefined, so a player was shown six blank cards and could
 * only win by typing the driver's exact name out of nowhere. The table's real
 * columns are nearly empty too: of 83 rows only rank, driver_name and country
 * are populated, wins on 2, championships on 3, manufacturer on 0. It is a
 * registry listed game marked daily and new, and nascar_scores has rows in it,
 * so people tried to play this.
 *
 * WHAT THE DATA CAN AND CANNOT SUPPORT, which is the whole design.
 *
 *   `nascar_race_results` has 2,104 rows from 1949 to 2025, all populated. It
 *   is NOT a complete win log and must never be totalled. Nineteen seasons are
 *   missing outright, 1957 through 1969 among them, which is exactly why Junior
 *   Johnson and Ned Jarrett, both fifty win drivers, have zero rows in it. Even
 *   the modern range is holed: 1979, 1982 and 1983 are absent. A "won 105 races"
 *   clue computed from this table would be false for almost everyone, and that
 *   is precisely the kind of plausible number this repo does not ship.
 *   It also mixes in exhibition races: the Busch Clash and the Daytona
 *   qualifying races sit alongside points races under the same shape. So no
 *   clue built from a row here may call it a "Cup Series win" either.
 *   WHAT EACH ROW IS, is a true fact: this driver won this race in this year.
 *   Clues are built only from that, one row at a time.
 *
 *   `nascar_champions` has all 77 seasons, 1949 to 2025, complete, with team,
 *   manufacturer and wins that season. Championship counts ARE safe to state,
 *   in both directions: "won it three times" and "never won it" are both
 *   verifiable against a complete table.
 *
 * ELIGIBILITY IS DERIVED, not listed: a driver needs at least four recorded
 * wins so there is enough real material for six distinct clues. 64 of the 83
 * qualify. A driver who does not is left out rather than padded, which is the
 * same call cbbGrid makes about its school pool.
 *
 * The output is committed and rendered synchronously, like gridArchive.json and
 * recordBooks.json, so a crawler receives the game instead of a spinner and the
 * page stops querying Supabase on every visit.
 *
 * Run: node scripts/genNascarDrivers.mjs   (needs the database)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];

export const MIN_WINS = 4;
export const CLUE_COUNT = 6;

/* Paged, because PostgREST caps every select at 1000 rows whatever the limit
   says, and race_results has 2,104. This repo has been bitten by that five
   times in nine rounds. */
export async function pull(table, columns) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let rows = null;
    for (let attempt = 0; attempt <= 2 && !rows; attempt++) {
      if (attempt) await new Promise(r => setTimeout(r, 500 * attempt));
      try {
        const res = await fetch(`${URL_}/rest/v1/${table}?select=${columns}`, {
          headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
        });
        if (res.ok) rows = await res.json();
      } catch { rows = null; }
    }
    if (!rows) throw new Error(`${table}: the database did not answer after three attempts`);
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const ordinal = n => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/* Jewels in the order a fan would rank them. Matched on the race name because
   that is the only thing the table carries, and the alternate names are real
   historical names for the same race rather than guesses. */
const JEWELS = [
  { label: 'Daytona 500', test: n => /daytona 500/i.test(n) },
  { label: 'Southern 500', test: n => /southern 500/i.test(n) },
  { label: 'Coca-Cola 600', test: n => /coca-cola 600|world 600/i.test(n) },
  { label: 'Brickyard 400', test: n => /brickyard 400/i.test(n) },
];

/* Aliases are DERIVED, never invented: a suffix dropped and the punctuation
   stripped. Nothing here decides that somebody is called "Junior". */
export function aliasesFor(name) {
  const out = new Set();
  const bare = name.replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  out.add(bare);
  const noSuffix = bare.replace(/\s+(Jr|Sr|II|III|IV)$/i, '').trim();
  if (noSuffix && noSuffix !== bare) out.add(noSuffix);
  out.delete(name);
  return [...out];
}

/* THE CLUE LADDER, vague to specific, and every line is a statement the tables
   can back. Exported so the fence recomputes it from the same definition
   instead of reimplementing the wording, which is the drift this repo pays for
   whenever a rule lives in two places. */
export function cluesFor(driver, wins, titles) {
  const years = wins.map(w => w.year).sort((a, b) => a - b);
  const y0 = years[0], y1 = years[years.length - 1];
  const seasons = new Set(years).size;
  /* THE LABEL IS GENERATED WITH THE LINE IT LABELS. The board used to carry a
     hardcoded list, ['Vibe', 'Era', 'Car Number', 'Cup Series Wins',
     'Championships', 'Famous Moment'], written for the columns that never
     existed. Two of those are actively wrong for this data: there is no car
     number anywhere in the database, and "Cup Series Wins" over a race result
     row is the one claim this table cannot support. A label defined in a
     different file from its clue is a second place for the truth to live. */
  const clues = [];
  const labels = [];
  const add = (label, text) => { labels.push(label); clues.push(text); };

  add('Era', y0 === y1
    ? `Has race wins on record in the ${y0} season.`
    : `Has race wins on record between ${y0} and ${y1}.`);

  add('Championships', titles.length
    ? `Won the Cup Series championship ${ordinal(titles.length)}.`
    : 'Never won the Cup Series championship.');

  if (titles.length) {
    /* OWNER DRIVERS BREAK THE OBVIOUS VERSION OF THIS CLUE, and the leak guard
       is what found it: for Alan Kulwicki and Herb Thomas, champions.team IS
       the driver's own name, because they ran their own cars. Naming the team
       would print the answer on the card, so the team half is dropped whenever
       it contains the driver's name. */
    const t = titles[0];
    const teamIsSelf = t.team && driver.toLowerCase().includes(String(t.team).toLowerCase().split(/\s+/)[0].toLowerCase())
      && String(t.team).toLowerCase().includes(driver.toLowerCase().split(/\s+/).slice(-1)[0].toLowerCase());
    if (t.manufacturer && t.team && !teamIsSelf) add('Title car', `Took a title year in a ${t.manufacturer}, with ${t.team}.`);
    else if (t.manufacturer) add('Title car', `Took a title year driving a ${t.manufacturer}.`);
    else add('Title year', `Took a title in the ${t.year} season.`);
  } else {
    add('Seasons', `Has wins on record in ${seasons} different season${seasons === 1 ? '' : 's'}.`);
  }

  /* The remaining three are single race facts, which stay true no matter what
     the table is missing. Picked at spread positions so they are not three
     wins from one afternoon, and never the same race twice. */
  const used = new Set();
  const takeRace = (label, w) => {
    used.add(`${w.year}|${w.race_name}`);
    add(label, `Won the ${w.race_name} in ${w.year}.`);
  };
  const sorted = [...wins].sort((a, b) => a.year - b.year || a.race_name.localeCompare(b.race_name));
  const jewel = JEWELS.map(j => sorted.find(w => j.test(w.race_name))).find(Boolean);
  if (jewel) takeRace('Big one', jewel);

  const remaining = sorted.filter(w => !used.has(`${w.year}|${w.race_name}`));
  const picks = [];
  if (remaining.length) picks.push(remaining[0]);
  if (remaining.length > 2) picks.push(remaining[Math.floor(remaining.length / 2)]);
  if (remaining.length > 1) picks.push(remaining[remaining.length - 1]);
  for (const w of picks) {
    if (clues.length >= CLUE_COUNT) break;
    if (used.has(`${w.year}|${w.race_name}`)) continue;
    takeRace('A win', w);
  }
  return { clues: clues.slice(0, CLUE_COUNT), labels: labels.slice(0, CLUE_COUNT) };
}

export function buildPool(drivers, results, champions) {
  const winsBy = new Map();
  for (const r of results) {
    if (!r.winner || !r.race_name || !Number.isFinite(Number(r.year))) continue;
    if (!winsBy.has(r.winner)) winsBy.set(r.winner, []);
    winsBy.get(r.winner).push({ year: Number(r.year), race_name: String(r.race_name) });
  }
  const titlesBy = new Map();
  for (const c of champions) {
    if (!c.driver_name) continue;
    if (!titlesBy.has(c.driver_name)) titlesBy.set(c.driver_name, []);
    titlesBy.get(c.driver_name).push(c);
  }
  for (const list of titlesBy.values()) list.sort((a, b) => a.year - b.year);

  const pool = [];
  const skipped = [];
  /* Sorted by name, for the reason Round 362 wrote down: the daily index is
     pool[dateSeed % pool.length] and it needs an order no ordinary row edit can
     move. nascar_drivers has no primary key at all and its `rank` is a computed
     standing a refresh could renumber, so the name is the only stable key. */
  for (const d of [...drivers].sort((a, b) => String(a.driver_name).localeCompare(String(b.driver_name)))) {
    const name = String(d.driver_name || '').trim();
    if (!name) continue;
    /* A race named after the driver prints the answer on the clue card. Real
       and not hypothetical: the first run caught the Alan Kulwicki Memorial and
       a Herb Thomas race. Dropped from the clue MATERIAL rather than patched
       afterwards, so the four win floor still means four usable facts. */
    const all = winsBy.get(name) || [];
    const surname = name.split(/\s+/).slice(-1)[0].replace(/[.,]/g, '');
    const wins = all.filter(w => {
      const n = w.race_name.toLowerCase();
      if (n.includes(name.toLowerCase())) return false;
      if (surname.length > 3 && n.includes(surname.toLowerCase())) return false;
      /* 90 rows, all between 1949 and 1953, carry a PLACEHOLDER for the race
         name: "1951-26", "1953-03". "Won the 1951-26 in 1951" is not a clue, it
         is a database artifact printed at a player. Rejected by shape (a real
         race name has a word in it) rather than by listing the ones seen. */
      if (!/[A-Za-z]{3}/.test(w.race_name)) return false;
      return true;
    });
    if (wins.length < MIN_WINS) { skipped.push(`${name} (${wins.length} usable recorded wins)`); continue; }
    const { clues, labels } = cluesFor(name, wins, titlesBy.get(name) || []);
    if (clues.length < CLUE_COUNT) { skipped.push(`${name} (only ${clues.length} clues could be built)`); continue; }
    pool.push({ id: name, driver_name: name, common_names: aliasesFor(name), clue_labels: labels, clues });
  }
  return { pool, skipped };
}

const RUN_DIRECTLY = Boolean(process.argv[1]) && import.meta.url === `file:///${process.argv[1].replaceAll('\\', '/')}`;
if (RUN_DIRECTLY) {
  const [drivers, results, champions] = await Promise.all([
    pull('nascar_drivers', 'driver_name'),
    pull('nascar_race_results', 'year,race_name,winner'),
    pull('nascar_champions', 'year,driver_name,team,manufacturer'),
  ]);
  console.log(`   pulled ${drivers.length} drivers, ${results.length} race results, ${champions.length} champion seasons`);

  const { pool, skipped } = buildPool(drivers, results, champions);

  /* Refuse to write a file that would ship the game as hollow as the one being
     fixed. The measured pool is 64; a floor well under it catches a broken read
     without going red on an ordinary data edit. */
  if (pool.length < 40) {
    console.error(`only ${pool.length} drivers qualified, which is a broken read rather than a thin sport`);
    process.exit(1);
  }
  const bad = pool.filter(p => p.clues.length !== CLUE_COUNT || p.clues.some(c => !c || !c.trim()));
  if (bad.length) {
    console.error(`${bad.length} drivers have a missing or empty clue, which is the bug this round exists to fix`);
    process.exit(1);
  }
  /* A clue naming the driver is the answer, printed on the card. */
  const leaks = pool.filter(p => p.clues.some(c => c.toLowerCase().includes(p.driver_name.toLowerCase())));
  if (leaks.length) {
    console.error(`${leaks.length} drivers have a clue containing their own name: ${leaks.slice(0, 3).map(l => l.driver_name).join(', ')}`);
    process.exit(1);
  }

  fs.writeFileSync(path.join(ROOT, 'src', 'data', 'nascarDrivers.json'), JSON.stringify({
    note: 'Generated by scripts/genNascarDrivers.mjs from nascar_race_results and nascar_champions. Every clue is a fact one of those tables states directly. Race results are NOT a complete win log (19 seasons are missing, 1957-1969 among them) and they include exhibition races, so nothing here totals them or calls them Cup Series wins; each clue names one real race in one real year. Championship counts come from nascar_champions, which is complete for all 77 seasons.',
    drivers: pool,
  }, null, 1) + '\n');

  console.log(`   ${pool.length} drivers in the pool, ${skipped.length} left out for want of real facts`);
  for (const s of skipped.slice(0, 6)) console.log(`      skipped: ${s}`);
  console.log(`wrote src/data/nascarDrivers.json`);
  console.log('');
  for (const p of pool.slice(0, 2)) {
    console.log(`   ${p.driver_name}`);
    for (const c of p.clues) console.log(`      ${c}`);
  }
}
