/**
 * Round 1551 harness: answers that move with the season stay true.
 *
 * Champ or Not, Silverware Sort, Who'd They Beat, the Hall of Champions and the
 * Rugby League Challenge all read the audited champion tables, and until this
 * round nothing noticed when a season was decided and its row never arrived:
 * the 2026 AFL and NRL grand finals were weeks old while Silverware Sort still
 * counted the Brisbane Lions on 5 flags and the Sydney Roosters on 4. Rank 'Em
 * had the mirror problem: a stored career total for a man still playing goes
 * false the night he passes the name above him.
 *
 * It reads only the repo (src/lib/seasonCalendar.ts, supabase/migrations, the
 * saved Record Books pages in public/records) and never the live database.
 *
 *   1. THE CALENDAR covers every competition a daily reads, and nothing else.
 *   2. THE EVIDENCE: each table's `heldThrough` equals the newest season the
 *      repo records it as holding, the larger of the migrations' INSERT rows
 *      and the year span on its saved Record Books page.
 *   3. THE DUE FENCE: 21 days after a final is over (`decidedBy`), its season
 *      must be held. Today is ET, or SEASON_DUE_TODAY=YYYY-MM-DD.
 *   4. COUNTS FROM: a season in the migrations that the saved page has not
 *      shown yet carries a counts from date, and the games' own fetches
 *      (fetchCompetitionRows, fetchFinalsRows, run against a stub client
 *      under a moved clock) hold it out the day before and deal it that day.
 *   5. RANK 'EM: a round naming anyone not on the retired list below says
 *      which finished season its totals run through ("through 2025-26").
 *
 * Measured 2026-10-22 (first runs on a GitHub runner, see results-g/rc-1551.txt):
 * the Brownlow 2026 row fell due on 2026-10-22 (count over by 1 October plus 21
 * days), the AFL's on 2026-10-26, the Dally M's on 2026-10-26 and the NRL's on
 * 2026-10-31, so origin/main without this round's rows would go red from today.
 * Next due after this round: WNBA 2026 on 2026-11-21 and the World Series 2026
 * on 2026-11-26. Both finals were undecided on 2026-10-22.
 *
 * Negative controls, SEASON_DUE_CONTROL=
 *   nextyear   the clock moves a year: every 2027 season is due and missing
 *   strip      the nba-3pm round loses its "through 2025-26" stamp
 *   unheld     the AFL's 2026 INSERT is dropped from the migration evidence
 *   nocounts   the AFL loses its counts from date
 *   unfiltered fetchCompetitionRows is built without its seasonCounts guard
 * Each must exit 1, and its last line names the first failure.
 *
 * Run: node scripts/simSeasonDue.mjs
 */
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLASH = p => p.replaceAll('\\', '/');
const CONTROLS = ['nextyear', 'strip', 'unheld', 'nocounts', 'unfiltered'];
const CONTROL = process.env.SEASON_DUE_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`simSeasonDue: unknown control ${CONTROL}, ABORTED`);
  process.exit(2);
}
if (CONTROL) console.log(`CONTROL ${CONTROL}`);

let failures = 0;
let firstFailure = '';
let checks = 0;
const fail = m => { failures += 1; if (!firstFailure) firstFailure = m; console.error('  FAIL: ' + m); };
const ok = () => { checks += 1; };

/* ---------------------------------------------------------------- the clock */
const etToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
const addDays = (ymd, n) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const ymd = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
let TODAY = process.env.SEASON_DUE_TODAY || etToday();
if (!/^\d{4}-\d{2}-\d{2}$/.test(TODAY)) { console.error('simSeasonDue: SEASON_DUE_TODAY must be YYYY-MM-DD, ABORTED'); process.exit(2); }
if (CONTROL === 'nextyear') TODAY = `${Number(TODAY.slice(0, 4)) + 1}${TODAY.slice(4)}`;
console.log(`today (ET) ${TODAY}`);

/* ------------------------------------------- the bundle, with a stub client */
const TMP = mkdtempSync(path.join(os.tmpdir(), 'seasondue-'));
const STUB = path.join(TMP, 'stubClient.mjs');
writeFileSync(STUB, `
export const STUB = { rows: {} };
export const supabase = {
  from(table) {
    const b = {
      select() { return b; }, order() { return b; }, eq() { return b; }, ilike() { return b; },
      limit() { return Promise.resolve({ data: STUB.rows[table] ?? [], error: null }); },
    };
    return b;
  },
};
`);
const ENTRY = path.join(TMP, 'entry.mjs');
const OUT = path.join(TMP, 'bundle.mjs');
const src = f => SLASH(path.join(ROOT, 'src', 'lib', f));
writeFileSync(ENTRY, `
export * as cal from '${src('seasonCalendar.ts')}';
export * as champ from '${src('champOrNot.ts')}';
export * as whod from '${src('whodTheyBeat.ts')}';
export * as rank from '${src('orderTheList.ts')}';
export * as circuit from '${src('rankEmCircuit.ts')}';
export { STUB } from '${SLASH(STUB)}';
`);
const GUARD = '\n      && seasonCounts(def.table, year, today)) {';
const plugin = {
  name: 'season-due',
  setup(b) {
    b.onResolve({ filter: /integrations[\\/]supabase[\\/]client(\.ts)?$/ }, () => ({ path: STUB }));
    if (CONTROL === 'unfiltered') {
      b.onLoad({ filter: /champOrNot\.ts$/ }, args => {
        const text = readFileSync(args.path, 'utf8').replaceAll('\r\n', '\n');
        if (!text.includes(GUARD)) throw new Error('control unfiltered: the guard is not in champOrNot.ts');
        return { contents: text.replace(GUARD, ') {'), loader: 'ts' };
      });
    }
  },
};
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin],
});
const { cal, champ, whod, rank, circuit, STUB: stub } = await import(pathToFileURL(OUT).href);
const FINALS = cal.SEASON_FINALS;

/* ------------------------------------------------------- 1: the calendar */
console.log('1) the calendar covers every competition a daily reads');
{
  const calKeys = FINALS.map(f => `${f.key}:${f.table}`).sort().join(' ');
  const compKeys = champ.COMPETITIONS.map(c => `${c.key}:${c.table}`).sort().join(' ');
  if (calKeys !== compKeys) fail(`the calendar holds [${calKeys}] and Champ or Not reads [${compKeys}]`); else ok();
  for (const f of whod.FINALS_COMPS) {
    if (!FINALS.some(c => c.table === f.table)) fail(`Who'd They Beat reads ${f.table}, which has no calendar entry`); else ok();
  }
  for (const f of FINALS) {
    const d = f.decidedBy;
    if (!(d.month >= 1 && d.month <= 12 && d.day >= 1 && d.day <= 31)) fail(`${f.table}: decidedBy ${JSON.stringify(d)} is not a date`); else ok();
  }
  console.log(`   ${FINALS.length} competitions, ${whod.FINALS_COMPS.length} finals tables inside them`);
}

/* ------------------------------------------------------- 2: the evidence */
console.log('2) heldThrough matches what the repo records each table holding');
const MIG = path.join(ROOT, 'supabase', 'migrations');
const mirrorYears = new Map(); /* table -> Set of years INSERTed by a migration */
for (const file of readdirSync(MIG).filter(f => /^\d.*\.sql$/.test(f)).sort()) {
  const sql = readFileSync(path.join(MIG, file), 'utf8').replace(/--[^\n]*/g, '');
  const re = /INSERT\s+INTO\s+(?:public\.)?(\w+)\s*\(([^)]*)\)([\s\S]*?);/gi;
  for (const m of sql.matchAll(re)) {
    const table = m[1];
    if (!FINALS.some(f => f.table === table)) continue;
    if (m[2].split(',')[0].trim().toLowerCase() !== 'year') continue;
    const values = m[3].slice(m[3].search(/VALUES/i));
    for (const t of values.matchAll(/\(\s*(\d{4})\s*,/g)) {
      if (!mirrorYears.has(table)) mirrorYears.set(table, new Set());
      mirrorYears.get(table).add(Number(t[1]));
    }
  }
}
if (CONTROL === 'unheld') {
  const s = mirrorYears.get('afl_premiers');
  if (!s || !s.has(2026)) { console.error('control unheld: no 2026 afl_premiers INSERT to drop, ABORTED'); process.exit(2); }
  s.delete(2026);
}
const pageLast = new Map();
for (const f of FINALS) {
  const file = path.join(ROOT, 'public', 'records', f.recordSlug, 'index.html');
  if (!existsSync(file)) { fail(`${f.table}: no saved Record Books page at public/records/${f.recordSlug}`); continue; }
  const meta = readFileSync(file, 'utf8').match(/<meta name="description" content="[^"]*?from (\d{4}) to (\d{4})/);
  if (!meta) { fail(`${f.table}: the saved page carries no "from YYYY to YYYY" span`); continue; }
  pageLast.set(f.table, Number(meta[2]));
  const mirror = mirrorYears.has(f.table) ? Math.max(...mirrorYears.get(f.table)) : null;
  const evidence = Math.max(mirror ?? 0, Number(meta[2]));
  if (f.heldThrough !== evidence) {
    fail(`${f.table}: the calendar says held through ${f.heldThrough}, the repo records ${evidence} (migrations ${mirror ?? 'none'}, saved page ${meta[2]})`);
  } else ok();
  console.log(`   ${f.table}: held through ${f.heldThrough} (migrations ${mirror ?? 'none'}, saved page ${meta[2]})`);
}

/* ------------------------------------------------------ 3: the due fence */
console.log(`3) every final over ${cal.SEASON_DUE_GRACE_DAYS} days ago has its row`);
const dueOn = (f, season) => addDays(ymd(season + (f.decidedBy.seasonOffset ?? 0), f.decidedBy.month, f.decidedBy.day), cal.SEASON_DUE_GRACE_DAYS);
for (const f of FINALS) {
  const year = Number(TODAY.slice(0, 4));
  let latestDue = null;
  for (let s = year - 3; s <= year + 1; s++) if (dueOn(f, s) <= TODAY) latestDue = s;
  const next = Math.max(latestDue, f.heldThrough) + 1;
  if (latestDue > f.heldThrough) {
    fail(`${f.label} ${latestDue}: over by ${addDays(dueOn(f, latestDue), -cal.SEASON_DUE_GRACE_DAYS)}, its row has been due in ${f.table} since ${dueOn(f, latestDue)} and the table is held through ${f.heldThrough}`);
  } else ok();
  console.log(`   ${f.table}: latest due ${latestDue}, held ${f.heldThrough}, next due ${next} on ${dueOn(f, next)}`);
}

/* ---------------------------------------------- 4: counts from a boundary */
console.log('4) a season the saved pages have not shown yet counts from a day boundary');
if (CONTROL === 'nocounts') {
  const afl = FINALS.find(f => f.table === 'afl_premiers');
  if (!afl || !afl.countsFrom || !afl.countsFrom[2026]) { console.error('control nocounts: the AFL has no 2026 counts from date to drop, ABORTED'); process.exit(2); }
  delete afl.countsFrom;
}
for (const f of FINALS) {
  const last = pageLast.get(f.table);
  if (last == null) continue;
  for (const y of [...(mirrorYears.get(f.table) ?? [])].filter(v => v > last)) {
    const from = f.countsFrom?.[y];
    const decided = ymd(y + (f.decidedBy.seasonOffset ?? 0), f.decidedBy.month, f.decidedBy.day);
    if (!from) {
      fail(`${f.table} ${y} is in the migrations but not yet on the saved page and has no counts from date: landing mid day would reshuffle every board already dealt that day`);
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || from <= addDays(decided, -60)) {
      fail(`${f.table} ${y}: counts from ${from} is not a date after its season`);
    } else ok();
  }
}

/* The games' own fetches under a moved clock: held the day before, dealt on
   the day. The Who'd They Beat tables carry no counts from date today, so a
   far season is injected into one of them for the length of the check. */
const RealDate = Date;
const withClock = async (day, fn) => {
  const t = RealDate.parse(`${day}T17:00:00Z`);
  globalThis.Date = class extends RealDate {
    constructor(...a) { super(...(a.length ? a : [t])); }
    static now() { return t; }
  };
  try { return await fn(); } finally { globalThis.Date = RealDate; }
};
const fakeRows = (cols, years) => years.map((year, i) => {
  const r = { id: i + 1 };
  r[cols.yearCol] = year;
  for (const c of cols.text) r[c] = `Side ${String.fromCharCode(65 + (i % 26))}${i}`;
  return r;
});
const probe = async (kind, def, year, from) => {
  const years = [year - 3, year - 2, year - 1, year];
  stub.rows[def.table] = kind === 'champ'
    ? fakeRows({ yearCol: def.yearCol, text: [def.winCol] }, years)
    : fakeRows({ yearCol: def.yearCol, text: [def.winCol, def.loseCol, def.seriesCol] }, years);
  const fetch = kind === 'champ' ? champ.fetchCompetitionRows : whod.fetchFinalsRows;
  const before = await withClock(addDays(from, -1), () => fetch(def));
  const onDay = await withClock(from, () => fetch(def));
  const name = kind === 'champ' ? 'fetchCompetitionRows' : 'fetchFinalsRows';
  if (before.some(r => r.year === year)) fail(`${name} dealt ${def.table} ${year} on ${addDays(from, -1)}, before it counts (${from})`); else ok();
  if (!onDay.some(r => r.year === year)) fail(`${name} still holds ${def.table} ${year} out on ${from}, the day it counts`); else ok();
  if (before.length !== years.length - 1 || onDay.length !== years.length) fail(`${name} on ${def.table}: ${before.length} then ${onDay.length} rows, expected ${years.length - 1} then ${years.length}`); else ok();
};
let probes = 0;
for (const f of FINALS) {
  for (const [y, from] of Object.entries(f.countsFrom ?? {})) {
    const def = champ.COMPETITIONS.find(c => c.table === f.table);
    if (def) { await probe('champ', def, Number(y), from); probes += 1; }
  }
}
{
  const def = whod.FINALS_COMPS[0];
  const entry = FINALS.find(f => f.table === def.table);
  const saved = entry.countsFrom;
  entry.countsFrom = { ...(saved ?? {}), 2030: '2030-12-01' };
  await probe('whod', def, 2030, '2030-12-01');
  await probe('champ', champ.COMPETITIONS.find(c => c.table === def.table), 2030, '2030-12-01');
  probes += 2;
  if (saved) entry.countsFrom = saved; else delete entry.countsFrom;
}
console.log(`   ${probes} fetch probes under a moved clock`);

/* ------------------------------------------------------------- 5: Rank 'Em */
console.log("5) every Rank 'Em round naming an active player says which season it runs through");
/* No game in these leagues since the season named, so their totals cannot
   move. Chris Paul retired on 2026-02-13 (AP; Basketball-Reference and ESPN
   show no 2026-27 row). Jagr still plays in Czechia but has played no NHL game
   since 2017-18. A name not on this list counts as active: fail closed. */
const RETIRED = new Set([
  'Kobe Bryant', 'Dirk Nowitzki', "Shaquille O'Neal", 'Carmelo Anthony', 'Allen Iverson',
  'John Stockton', 'Chris Paul', 'Jason Kidd', 'Steve Nash', 'Magic Johnson',
  'Ray Allen', 'Reggie Miller', 'Tim Duncan', 'Karl Malone', 'Kevin Garnett', 'Dwight Howard', 'Pau Gasol',
  'Hakeem Olajuwon', 'Dikembe Mutombo', 'Kareem Abdul-Jabbar', 'David Robinson',
  'Michael Jordan', 'Gary Payton', 'Robert Parish', 'Vince Carter',
  'Wayne Gretzky', 'Jaromír Jágr', 'Mark Messier', 'Ron Francis', 'Mario Lemieux', 'Brett Hull',
  'Steve Yzerman', 'Adam Oates', 'Patrick Marleau', 'Joe Thornton', 'Chris Chelios',
  'Barry Bonds', 'Henry Aaron', 'Babe Ruth', 'Albert Pujols', 'Willie Mays', 'Pete Rose', 'Ty Cobb',
  'Stan Musial', 'Tris Speaker', 'Rickey Henderson', 'Lou Brock', 'Tim Raines', 'Vince Coleman', 'Kenny Lofton',
]);
const STAMP = /\bthrough (\d{4})(?:-(\d{2}))?\b/;
const rounds = [...rank.RANK_ROUNDS];
const sb = circuit.circuitRoundById('mlb-sb-circuit');
if (sb) rounds.push(sb); else fail('the Legends Circuit stolen base round is missing');
if (CONTROL === 'strip') {
  const r = rounds.find(x => x.id === 'nba-3pm');
  if (!r || !r.statLabel.includes(' through 2025-26')) { console.error('control strip: nba-3pm carries no stamp to strip, ABORTED'); process.exit(2); }
  r.statLabel = r.statLabel.replace(' through 2025-26', '');
}
let stamped = 0;
for (const r of rounds) {
  const active = r.items.map(i => i.name).filter(n => !RETIRED.has(n));
  const m = r.statLabel.match(STAMP);
  if (active.length > 0 && !m) {
    fail(`Rank 'Em ${r.id} names ${active.join(', ')}, still playing, under "${r.statLabel}" with no season stamp: the order goes false when a total moves`);
  } else ok();
  if (m) {
    stamped += 1;
    const finished = m[2] ? ymd(Number(m[1]) + 1, 7, 1) : ymd(Number(m[1]), 11, 15);
    if (TODAY < finished) fail(`Rank 'Em ${r.id}: "${m[0]}" names a season that is not over until ${finished}`); else ok();
  }
  for (let i = 1; i < r.items.length; i++) {
    if (!(r.items[i - 1].value > r.items[i].value)) fail(`Rank 'Em ${r.id}: ${r.items[i - 1].name} and ${r.items[i].name} are not strictly in order`);
  }
}
console.log(`   ${rounds.length} rounds, ${stamped} stamped`);

console.log('');
if (failures > 0) {
  console.error(`simSeasonDue: ${failures} failure${failures === 1 ? '' : 's'}${CONTROL ? ` (control ${CONTROL})` : ''}; first: ${firstFailure}`);
  process.exit(1);
}
console.log(`simSeasonDue: green. ${checks} checks${CONTROL ? `, but control ${CONTROL} did not fire` : ''}.`);
