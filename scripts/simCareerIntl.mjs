/* Round 1541: the international summers of NBA My Career, Part A (dark).

   The bundle holds src/data/basketballIntl.ts, src/lib/careerIntl.ts,
   src/lib/keyedRng.ts, src/lib/nbaCareerIntl.ts, the NBA binding
   (src/lib/nbaCareerSport.ts) and the drive that mirrors the board
   (src/test/helpers/usCareerDrive.ts); section 7 bundles the same binding and
   drive from INTL_BASE_DIR as well. Nothing here reaches the network: the
   ledger is a committed file and the saves of section 8 are built locally by
   scripts/lib/realSaves.mjs.

   Sections (INTL_SECTIONS, default 1,2,3,4,6,9,10,11,12; 5, 7 and 8 are asked for by name):
     1. the ledger. Every fact in scripts/data/basketballIntlSources.json has two
        reads on two hosts that are not each other (fiba.basketball and
        about.fiba.basketball are one body), none a wiki, each with its words;
        the rows of src/data/basketballIntl.ts equal the ledger's values; the
        partial list equals the editions with a fact short of two.
     2. the calendar. Every edition id is its competition and the summer it was
        played; one edition a summer at most; the game's own cycles start one
        cycle after the last ledgered edition of their competition; every summer
        2004 to 2050 resolves to a ledger edition, a projected one or none; and
        (2b, through the real NBA engine) the season labelled Y is called to the
        summer Y + 1; (Round 1544) the static gate the board reads,
        src/lib/nbaCareerIntlGate.ts, agrees with the ledger on every summer
        2004 to 2050, its cycles and the help's facts.
     3. the fields. A played field is as big as its shape, holds no nation
        twice, holds the USA and every nation its finishing places name; every
        nation draws a flag or is on the named no flag list; Serbia and
        Montenegro is kept as it played; an edition still to come has no field,
        and the field the game draws for it is the same for every career.
     4. the call, INTL_FLEET careers an era (default 400) through the real NBA
        engine: called exactly when the oracle (87 since Round 1544, 36, 50,
        an edition, a career not ending with that season) says so.
     5. the tournament, INTL_TOURNEYS tournaments an edition kind (default 8000
        since Round 1544) in ten seed sets: gold and medal rates by rating tier
        inside the PLAYED editions' BANDS for every kind (played, still to
        come, projected: Round 1544's ruling L3), gold rising tier to tier
        (RISE), the knock's hurt share by age inside KNOCK_BANDS and rising
        with age (KNOCK_RISE). Sets 1 to 5 set the bands, sets 6 to 10 are held
        out; the measured numbers sit in the comments above BANDS and
        KNOCK_BANDS.
     6. one engine and the stream: the bracket runner's fingerprints live in
        careerIntl.ts alone, and a tournament never calls Math.random.
     7. what must not move (needs INTL_BASE_DIR, a worktree of the base): the
        same careers with no answer equal the base byte for byte; resting moves
        only the intl block; going moves the block and, after a knock, health
        and what follows; deals before the first knock agree; legacy never
        reads the block.
     8. saves: the repair leaves every real NBA save byte identical and drops a
        broken block, row or last alone; (Round 1544) every tournament a go
        fleet played is played again, byte for byte, from the final save (so
        nothing of it is stored), a stored last the replay equals is dropped and
        one it does not equal is kept; with INTL_OLD_DIR (a tree of Round 1541's
        closing head) the saves that code wrote are repaired and counted.
     12. the weight (Round 1544): src/pages/NbaMyCareer.tsx bundled with
        splitting; the page's static closure, read off the metafile, holds the
        gate and none of the ledger, careerIntl.ts or nbaCareerIntl.ts, which
        sit in lazy chunks; Round 1557's International view is a named export of IntlSummerResult.tsx.
     9. the case (Round 1557), INTL_CASE_FLEET careers an era (default 200),
        always go and always rest: the hub's tile is the rings plus the case
        plus the medals (counted by the module, not the tile's reader); the
        case's medal rows hold every medal once with its summer; no medal is a
        season's award; a career that only rested draws rings plus the case.
     10. the badges (Round 1557), the same fleets: each medal badge is lit
        exactly when the summers say its fact holds, all three are lit in the
        always go fleet and none ever in the always rest fleet.
     11. the words (Round 1557): every capitalised word in the visible text of
        the national team's files (and Round 1557's regions of the shared
        ones) is a nation, host or competition of the ledger or a fixed word.
   9, 10 and 11 run by default since Round 1557. Measured on a runner
   (r1557-s2b, head f01ee1555): 9 and 10 took 123 s; of 200 careers an era,
   now 91 went at least once, 86 brought home a medal, 70 a gold, throwback
   87, 87 and 80; 173 careers with a medal (490 medals) and 178 that only
   rested; lit in the always go fleet intl_medal 173, olympic_gold 125,
   world_cup_gold 117, in the always rest fleet 0 (the floors, 20 careers
   each way and one lighting a badge, sit far under that); 11 read 156
   capitalised words in 10 sources. Controls: tilenomedal 173 failures,
   deadmedal 244, realname 2.

   Controls (INTL_CONTROL=<name>; run each with INTL_SECTIONS set to its own
   section, or it also runs the default sections). Each is asserted to change
   something before it runs (an anchor that is not there once exits 2):
     onesource    one calendar fact of oly-2008 keeps one read          (1 red)
     shiftyear    oly-2008's src year moved to 2009                      (2 red)
     seasonyear   the call reads the season label, not the summer after  (2 red)
     dupnation    oly-2012's field holds Spain twice                     (3 red)
     fieldsize    wc-2014's field loses a nation                         (3 red)
     genfield     a drawn field keyed to the career, not the edition     (3 red)
     anyyear      every summer answers an edition                        (4 red)
     lowbar       the bar is five points lower in the bind               (4 red)
     endcall      the call ignores a career ending with this season      (4 red)
     nolift       he lifts the USA by nothing                            (5 red)
     nobronze     no bronze game is played                               (5 red)
     knockflip    the knock comparison flipped                           (5 red)
     knockage     the knock forgets his age                              (5 red)
     easyfuture   a summer still to come gives each nation the mean of its
                  rungs again (Round 1541's field)                       (5 red)
     copy         a copy of the runner planted in a sport file           (6 red)
     mathrandom   the pot draw uses Math.random                          (6 red)
     restwrites   resting takes a point of health                        (7 red)
     legacyreads  legacy counts his medals                               (7 red)
     norepair     the repair on load does nothing                        (8 red)
     gateyear     the gate's 2004 moved to 2005                          (2 red)
     staticledger the NBA binding imports the ledger statically         (12 red)
     tilenomedal  the honours lose the medal row                         (9 red)
     deadmedal    the Olympic gold badge asks for a hundred golds        (10 red)
     realname     a real NBA player's name planted in a copy of the
                  International view                                    (11 red)
   (Round 1544: seasonyear, anyyear, endcall, lowbar and knockage edit the
   gate, where the call's conditions and the knock's numbers now live.)

   Exit codes: 0 green, 1 red (or a control that fired), 2 could not run,
   3 a control that did not fire. Green means the closing summary line AND
   the exit code; a control's last line says FIRED or DID NOT FIRE. */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { buildRealSaves } from './lib/realSaves.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.INTL_CONTROL || '';
const SECTIONS = new Set((process.env.INTL_SECTIONS || '1,2,3,4,6,9,10,11,12').split(',').map(s => s.trim()));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'careerIntl-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });

const INTL = 'src/lib/careerIntl.ts';
const NBA = 'src/lib/nbaCareerIntl.ts';
const GATE = 'src/lib/nbaCareerIntlGate.ts';
const SPORT = 'src/lib/nbaCareerSport.ts';
const CONTROLS = {
  onesource: { section: '1', note: 'one calendar fact of oly-2008 keeps one read' },
  shiftyear: { section: '2', note: "oly-2008's src year moved by one" },
  dupnation: { section: '3', note: "oly-2012's field holds Spain twice" },
  fieldsize: { section: '3', note: "wc-2014's field loses a nation" },
  genfield: { section: '3', note: 'a generated field is drawn on a stream keyed to the career, not the edition', edits: [{ file: INTL, from: 'bind.rng(`intl-field:${e.id}`)', to: 'bind.rng(`intl-field:${e.id}:${Math.random()}`)' }] },
  copy: { section: '6', note: 'a private copy of the bracket runner planted in a sport file' },
  seasonyear: { section: '2', note: 'the call reads the season label itself, not the summer after it', edits: [{ file: GATE, from: 'const summer = nbaIntlSummerOf(line.year);', to: 'const summer = line.year;' }] },
  anyyear: { section: '4', note: 'every summer answers an edition', edits: [{ file: GATE, from: 'if (!nbaIntlIsEditionSummer(summer)) return null;', to: 'void summer;' }, { file: NBA, from: 'return summer === null ? null : NBA_INTL_CALENDAR.editionFor(summer);', to: 'return summer === null ? null : NBA_INTL_CALENDAR.editionFor(summer) ?? NBA_INTL_CALENDAR.byId(`oly-${summer}`);' }] },
  endcall: { section: '4', note: 'the call ignores a career that ends with this season', edits: [{ file: GATE, from: ' || nbaShouldRetire(c) || endsAfterSeason(c, line.year)) return null;', to: ') return null;' }] },
  lowbar: { section: '4', note: 'the bar is five points lower in the gate', edits: [{ file: GATE, from: 'line.ovr < INTL_CALL_UP_OVR', to: 'line.ovr < INTL_CALL_UP_OVR - 5' }] },
  legacyreads: { section: '7', note: 'legacy counts his medals' },
  restwrites: { section: '7', note: 'resting takes a point of health', edits: [{ file: NBA, from: 'answer: (c, choice) => answerCallUp(c as NbaIntlCareer, NBA_INTL_BIND, choice),', to: "answer: (c, choice) => { if (choice === 'rest') c.health -= 1; return answerCallUp(c as NbaIntlCareer, NBA_INTL_BIND, choice); }," }] },
  norepair: { section: '8', note: 'the repair on load does nothing', edits: [{ file: INTL, from: 'export function repairIntlOnLoad<C extends IntlCareer>(c: C, bind?: IntlSportBind<C>): boolean {', to: 'export function repairIntlOnLoad<C extends IntlCareer>(c: C, bind?: IntlSportBind<C>): boolean {\n  if (c) return false;' }] },
  nolift: { section: '5', note: 'he lifts the USA by nothing', edits: [{ file: NBA, from: 'liftOf: c => nbaIntlLift(lastLine(c)?.ovr ?? 0),', to: 'liftOf: () => 0,' }] },
  nobronze: { section: '5', note: 'no bronze game is played', edits: [{ file: INTL, from: 'if (shape.bronze && semiLosers.length === 2) {', to: 'if (false && shape.bronze && semiLosers.length === 2) {' }] },
  knockflip: { section: '5', note: 'the knock comparison is flipped, so he comes home hurt from most tournaments', edits: [{ file: INTL, from: 'const hurt = rng() < bind.knockChance(c);', to: 'const hurt = rng() > bind.knockChance(c);' }] },
  knockage: { section: '5', note: 'the knock forgets his age', edits: [{ file: GATE, from: 'INTL_KNOCK_BASE + INTL_KNOCK_PER_YEAR * Math.max(0, age - INTL_KNOCK_AGE)', to: 'INTL_KNOCK_BASE' }] },
  easyfuture: { section: '5', note: "a summer still to come gives each nation the mean of its rungs again (Round 1541's field)", edits: [{ file: NBA, from: 'return INTL_RUNG_STRENGTH[past[Math.min(past.length - 1, Math.floor(rng() * past.length))]];', to: 'return past.reduce((s, r) => s + INTL_RUNG_STRENGTH[r], 0) / past.length;' }] },
  mathrandom: { section: '6', note: 'the pot draw uses Math.random', edits: [{ file: INTL, from: 'const j = Math.floor(rng() * (i + 1));', to: 'const j = Math.floor(Math.random() * (i + 1));' }] },
  gateyear: { section: '2', note: "the gate's first edition summer moved from 2004 to 2005", edits: [{ file: GATE, from: '[2004, 2006, 2008,', to: '[2005, 2006, 2008,' }] },
  staticledger: { section: '12', note: 'the NBA binding imports the ledger statically', edits: [{ file: SPORT, from: "import { NBA_CAREER_INTL_LAZY } from '@/lib/nbaCareerIntlGate';", to: "import { NBA_CAREER_INTL_LAZY } from '@/lib/nbaCareerIntlGate';\nimport { BASKETBALL_INTL_EDITIONS } from '@/data/basketballIntl';" }, { file: SPORT, from: '  intl: NBA_CAREER_INTL_LAZY,', to: '  intl: { ...NBA_CAREER_INTL_LAZY, ledgerRows: BASKETBALL_INTL_EDITIONS.length },' }] },
  tilenomedal: { section: '9', note: 'the honours lose the medal row, so the tile forgets the medals', edits: [{ file: SPORT, from: "...(medals > 0 ? [{ label: medals === 1 ? 'international medal' : 'international medals', n: medals }] : []),", to: '' }] },
  deadmedal: { section: '10', note: 'the Olympic gold badge asks for a hundred golds, so nobody can earn it', edits: [{ file: 'src/lib/careerBadges.ts', from: 'test: f => (f.intl?.golds.oly ?? 0) >= 1', to: 'test: f => (f.intl?.golds.oly ?? 0) >= 100' }] },
  realname: { section: '11', note: "a real NBA player's name planted in a copy of the International view" },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control "${CONTROL}": use ${Object.keys(CONTROLS).join(', ')}`); process.exit(2); }
if (CONTROL && !SECTIONS.has(CONTROLS[CONTROL].section)) SECTIONS.add(CONTROLS[CONTROL].section);

/* Source rewrites at bundle time, never on disk; each anchor must be there once. */
const rewrites = new Map();
for (const ed of (CONTROL && CONTROLS[CONTROL].edits) || []) {
  const abs = path.join(ROOT, ed.file);
  const src = rewrites.get(abs) ?? fs.readFileSync(abs, 'utf8').split('\r\n').join('\n');
  const hits = src.split(ed.from).length - 1;
  if (hits !== 1) { console.error(`control ${CONTROL} cannot run: ${ed.file} holds "${ed.from}" ${hits} times, not once, so it would prove nothing`); process.exit(2); }
  rewrites.set(abs, src.replace(ed.from, ed.to));
}
const controlPlugin = {
  name: 'career-intl-control',
  setup(b) {
    if (!rewrites.size) return;
    b.onLoad({ filter: /\.tsx?$/ }, args => {
      const abs = path.resolve(args.path);
      if (!rewrites.has(abs)) return undefined;
      return { contents: rewrites.get(abs), loader: abs.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(abs) };
    });
  },
};

/* ─── bundle ─────────────────────────────────────────────────────────────── */
const ENTRY = path.join(TMP, 'entry.mjs');
const OUT = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, [
  `export * as data from '${ROOT_URL}/src/data/basketballIntl.ts';`,
  `export * as intl from '${ROOT_URL}/src/lib/careerIntl.ts';`,
  `export * as keyed from '${ROOT_URL}/src/lib/keyedRng.ts';`,
  `export * as nbaIntl from '${ROOT_URL}/src/lib/nbaCareerIntl.ts';`,
  `export * as gate from '${ROOT_URL}/src/lib/nbaCareerIntlGate.ts';`,
  `export { NBA_CAREER_SPORT } from '${ROOT_URL}/src/lib/nbaCareerSport.ts';`,
  `export * as drive from '${ROOT_URL}/src/test/helpers/usCareerDrive.ts';`,
  `export * as hub from '${ROOT_URL}/src/lib/careerHub.ts';`,
].join('\n'));
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') }, plugins: [controlPlugin] });
const { data, intl, keyed, nbaIntl, gate, NBA_CAREER_SPORT, drive, hub } = await import(`file://${OUT.replaceAll('\\', '/')}`);
const LEDGER = () => ({ shapes: data.BASKETBALL_INTL_SHAPES, editions: data.BASKETBALL_INTL_EDITIONS, cycles: data.BASKETBALL_INTL_CYCLES, partial: data.BASKETBALL_INTL_PARTIAL, lastPlayed: data.BASKETBALL_LAST_PLAYED_SUMMER });
let MATH_RANDOM_CALLS = 0;
const realRandom = Math.random;
Math.random = () => { MATH_RANDOM_CALLS += 1; return realRandom(); };
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/basketballIntlSources.json'), 'utf8'));

/* ─── controls, applied in memory and proven to change something ─────────── */
const rowOf = id => data.BASKETBALL_INTL_EDITIONS.find(r => r[0] === id);
function mustChange(what, before, after) {
  if (JSON.stringify(before) === JSON.stringify(after)) { console.error(`control ${CONTROL} cannot run: ${what} did not change, so it would prove nothing`); process.exit(2); }
}
if (CONTROL) {
  console.log(`NEGATIVE CONTROL ${CONTROL}: ${CONTROLS[CONTROL].note} (section ${CONTROLS[CONTROL].section} must fail)`);
  if (CONTROL === 'onesource') {
    const f = ledger.editions['oly-2008']?.calendar;
    if (!f || f.reads.length < 2) { console.error('control onesource cannot run: oly-2008 calendar has no second read'); process.exit(2); }
    const before = f.reads.length; f.reads = f.reads.slice(0, 1); mustChange('the read count', before, f.reads.length);
  }
  if (CONTROL === 'shiftyear') {
    const r = rowOf('oly-2008');
    if (!r || r[2] !== 2008) { console.error('control shiftyear cannot run: oly-2008 is not a 2008 row'); process.exit(2); }
    r[2] = 2009; mustChange('the year', 2008, r[2]);
  }
  if (CONTROL === 'dupnation') {
    const r = rowOf('oly-2012');
    const i = r ? r[6].indexOf('Great Britain') : -1;
    if (i < 0 || !r[6].includes('Spain')) { console.error('control dupnation cannot run: oly-2012 field lacks Great Britain or Spain'); process.exit(2); }
    const before = [...r[6]]; r[6][i] = 'Spain'; mustChange('the field', before, r[6]);
  }
  if (CONTROL === 'fieldsize') {
    const r = rowOf('wc-2014');
    if (!r || !r[6] || r[6].length !== 24) { console.error('control fieldsize cannot run: wc-2014 field is not 24'); process.exit(2); }
    r[6].splice(r[6].indexOf('Finland'), 1); mustChange('the field size', 24, r[6].length);
  }
}

/* ─── reporting ──────────────────────────────────────────────────────────── */
const failed = new Map();
let checks = 0;
function check(section, ok, msg) {
  checks += 1;
  if (!ok) { failed.set(section, (failed.get(section) ?? 0) + 1); if ((failed.get(section) ?? 0) <= 12) console.log(`  FAIL [${section}] ${msg}`); }
}
const shapeOf = id => data.BASKETBALL_INTL_SHAPES.find(s => s[0] === id);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ─── 1. the ledger ──────────────────────────────────────────────────────── */
const hostOf = url => { const h = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); return h.endsWith('fiba.basketball') ? 'fiba.basketball' : h; };
const WIKI = h => /wiki|fandom\.com|kiwix/.test(h);
function shortOf(f) {
  if (f.short) return f.short;
  const hosts = new Set(f.reads.map(r => hostOf(r.url)));
  return f.reads.length < 2 || hosts.size < 2 ? `${f.reads.length} reads on ${hosts.size} hosts` : '';
}
if (SECTIONS.has('1')) {
  console.log('section 1: the ledger');
  check('1', ledger.read === data.BASKETBALL_INTL_VERIFIED_ON, `ledger read ${ledger.read} vs src ${data.BASKETBALL_INTL_VERIFIED_ON}`);
  let facts = 0;
  const shortEds = new Set();
  const allFacts = [...Object.entries(ledger.rules).map(([k, f]) => [`rules.${k}`, f]),
    ...Object.entries(ledger.editions).flatMap(([id, e]) => Object.entries(e).map(([k, f]) => [`${id}.${k}`, f]))];
  for (const [key, f] of allFacts) {
    facts += 1;
    check('1', typeof f.says === 'string' && f.says.length > 10 && 'value' in f && Array.isArray(f.reads), `${key} lacks says, value or reads`);
    for (const r of f.reads) {
      check('1', !!r.url && !!r.who && typeof r.words === 'string' && r.words.length > 8, `${key} has a read without url, who or words`);
      check('1', !WIKI(hostOf(r.url)), `${key} cites a wiki host ${hostOf(r.url)}`);
    }
    const s = shortOf(f);
    if (key.startsWith('rules.')) check('1', !s, `${key} is short: ${s}`);
    else if (s) shortEds.add(key.split('.')[0]);
  }
  const partial = [...data.BASKETBALL_INTL_PARTIAL].sort();
  check('1', same(partial, [...shortEds].sort()), `partial list ${partial.join(' ')} vs editions with a short fact ${[...shortEds].sort().join(' ')}`);
  check('1', ledger.rules['fiba-minutes'].value === data.FIBA_GAME_MINUTES && ledger.rules['nba-minutes'].value === data.NBA_GAME_MINUTES, 'game lengths differ from the ledger');
  const ids = data.BASKETBALL_INTL_EDITIONS.map(r => r[0]);
  check('1', same([...ids].sort(), Object.keys(ledger.editions).sort()), `src ids ${ids.length} vs ledger ${Object.keys(ledger.editions).length}`);
  for (const r of data.BASKETBALL_INTL_EDITIONS) {
    const e = ledger.editions[r[0]];
    if (!e) continue;
    const cal = e.calendar?.value ?? {};
    check('1', cal.comp === r[1] && cal.year === r[2] && cal.host === r[4] && (cal.games ?? null) === (r[8] ?? null), `${r[0]} calendar differs: ledger ${JSON.stringify(cal)}`);
    check('1', e.name?.value === r[3], `${r[0]} name ${r[3]} vs ledger ${e.name?.value}`);
    check('1', e.shape?.value === r[5], `${r[0]} shape ${r[5]} vs ledger ${e.shape?.value}`);
    check('1', same(e.field?.value ?? null, r[6]), `${r[0]} field differs from the ledger`);
    check('1', same(e.rungs?.value ?? null, r[7]), `${r[0]} places differ from the ledger`);
  }
  const played = data.BASKETBALL_INTL_EDITIONS.filter(r => r[6]).map(r => r[2]);
  check('1', Math.max(...played) === data.BASKETBALL_LAST_PLAYED_SUMMER, `last played summer ${data.BASKETBALL_LAST_PLAYED_SUMMER} vs ledger ${Math.max(...played)}`);
  console.log(`  ${facts} facts, ${allFacts.reduce((n, [, f]) => n + f.reads.length, 0)} reads, partial: ${partial.join(' ') || 'none'}`);
}

/* ─── 2. the calendar ────────────────────────────────────────────────────── */
/* The harness's own resolver, read off the ledger JSON (not the src rows), so
   a src row moved by a year disagrees with it, and so the tournament module's
   editionFor (step 2) and the NBA mapping (step 3) can be held to it. */
function resolve(year) {
  const hit = Object.entries(ledger.editions).find(([, e]) => e.calendar.value.year === year);
  if (hit) return { id: hit[0], kind: ledger.editions[hit[0]].field ? 'played' : 'future' };
  for (const [comp, first, every] of data.BASKETBALL_INTL_CYCLES) if (year >= first && (year - first) % every === 0) return { id: `${comp}-${year}`, kind: 'projected' };
  return null;
}
if (SECTIONS.has('2')) {
  console.log('section 2: the calendar');
  const years = new Map();
  for (const r of data.BASKETBALL_INTL_EDITIONS) {
    const m = /^(oly|wc)-(\d{4})$/.exec(r[0]);
    check('2', !!m && m[1] === r[1] && Number(m[2]) === r[2], `${r[0]} is not its competition and summer (comp ${r[1]}, year ${r[2]})`);
    check('2', !years.has(r[2]), `two editions in ${r[2]}: ${years.get(r[2])} and ${r[0]}`);
    years.set(r[2], r[0]);
  }
  for (const [comp, first, every] of data.BASKETBALL_INTL_CYCLES) {
    const last = Math.max(...data.BASKETBALL_INTL_EDITIONS.filter(r => r[1] === comp).map(r => r[2]));
    check('2', first - last === every, `${comp} projection starts ${first}, ${first - last} after the last ledgered ${last}, not one cycle of ${every}`);
  }
  const table = [];
  let none = 0;
  for (let y = 2004; y <= 2050; y += 1) {
    const e = resolve(y);
    const row = data.BASKETBALL_INTL_EDITIONS.find(r => r[2] === y);
    if (e && e.kind !== 'projected') check('2', !!row && row[0] === e.id, `${y} is the ledger's ${e.id} but the src rows say ${row?.[0] ?? 'nothing'}`);
    else check('2', !row, `${y} has src row ${row?.[0]} the ledger does not hold`);
    if (!e) none += 1;
    table.push(e ? e.id : '-');
  }
  console.log(`  2004 to 2050: ${table.filter(t => t !== '-').length} summers with an edition, ${none} without`);
  console.log(`  ${table.join(' ')}`);
  /* Round 1544 (the lead's ruling L5): the static gate (src/lib/nbaCareerIntlGate.ts) holds its own copy of
     the edition summers, the cycles and the help's facts, so the board needs no ledger before a call. It must
     answer every summer exactly as the ledger's calendar and the harness's resolver do. Control gateyear. */
  let gateAgrees = 0;
  for (let y = 2004; y <= 2050; y += 1) {
    const g = gate.nbaIntlIsEditionSummer(y);
    const ok = g === !!nbaIntl.NBA_INTL_CALENDAR.editionFor(y) && g === !!resolve(y);
    check('2', ok, `the gate says ${y} ${g ? 'holds' : 'holds no'} edition, the ledger's calendar says ${nbaIntl.NBA_INTL_CALENDAR.editionFor(y)?.id ?? 'none'}`);
    if (ok) gateAgrees += 1;
  }
  check('2', same(gate.NBA_INTL_LEDGER_SUMMERS, data.BASKETBALL_INTL_EDITIONS.map(r => r[2]).sort((a, b) => a - b)), `the gate's ledger summers ${JSON.stringify(gate.NBA_INTL_LEDGER_SUMMERS)} are not the ledger rows' years`);
  check('2', same(gate.NBA_INTL_GATE_CYCLES, data.BASKETBALL_INTL_CYCLES.map(([, first, every]) => [first, every])), `the gate's cycles ${JSON.stringify(gate.NBA_INTL_GATE_CYCLES)} are not the ledger's`);
  check('2', same(gate.NBA_INTL_HELP_FACTS, nbaIntl.nbaIntlHelpFactsOfLedger()), `the help's facts ${JSON.stringify(gate.NBA_INTL_HELP_FACTS)} are not the ledger's ${JSON.stringify(nbaIntl.nbaIntlHelpFactsOfLedger())}`);
  check('2', same(gate.nbaIntlHelpRules(), gate.nbaIntlHelpRules(nbaIntl.nbaIntlHelpFactsOfLedger())), 'the static help reads differently on the ledger\'s facts');
  console.log(`  the static gate: ${gateAgrees} of 47 summers 2004 to 2050 agree with the ledger's calendar; help facts ${same(gate.NBA_INTL_HELP_FACTS, nbaIntl.nbaIntlHelpFactsOfLedger()) ? 'equal' : 'DIFFER'}`);
}

/* ─── 3. the fields ──────────────────────────────────────────────────────── */
/* A nation with no flag renders as its name (FlagImg.tsx); these are named so
   a new one cannot slip in unseen. */
const NO_FLAG = new Set(['Puerto Rico', 'Serbia and Montenegro']);
function flagKeys() {
  const src = fs.readFileSync(path.join(ROOT, 'src/components/FlagImg.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const at = src.indexOf('export const FLAG_CODES');
  const block = src.slice(at, src.indexOf('};', at));
  return new Set([...block.matchAll(/"([^"]+)":\s*"[a-z-]+"/g)].map(m => m[1]));
}
if (SECTIONS.has('3')) {
  console.log('section 3: the fields');
  const flags = flagKeys();
  check('3', flags.size > 150 && flags.has('USA') && flags.has('Lithuania'), `FLAG_CODES read ${flags.size} keys`);
  const nations = new Set();
  for (const r of data.BASKETBALL_INTL_EDITIONS) {
    const [id, , year, , , shapeId, field, rungs] = r;
    const shape = shapeOf(shapeId);
    check('3', !!shape, `${id} shape ${shapeId} is not a shape row`);
    const playedAs = shape && !shape[8] ? shapeOf(shape[9]) : shape;
    check('3', !!playedAs && playedAs[8] && (!shape || playedAs[1] === shape[1]), `${id} plays as a shape that is missing, unplayable or another size`);
    if (year > data.BASKETBALL_LAST_PLAYED_SUMMER) { check('3', field === null && rungs === null, `${id} is still to come but has a field or places`); continue; }
    check('3', Array.isArray(field) && field.length === shape?.[1], `${id} field holds ${field?.length} nations, the shape ${shape?.[1]}`);
    if (!Array.isArray(field)) continue;
    check('3', new Set(field).size === field.length, `${id} field holds a nation twice`);
    check('3', field.includes('USA'), `${id} field lacks the USA`);
    const placed = rungs ? [rungs[0], rungs[1], rungs[2], rungs[3], ...rungs[4]] : [];
    check('3', placed.length === 8 && new Set(placed).size === 8, `${id} places name ${new Set(placed).size} distinct nations, not 8`);
    for (const n of placed) check('3', field.includes(n), `${id} places ${n}, who is not in its field`);
    for (const n of field) {
      nations.add(n);
      check('3', flags.has(n) || NO_FLAG.has(n), `${id} nation ${n} has no flag and is not on the no flag list`);
      if (n === 'Serbia and Montenegro') check('3', year <= 2006, `${id} names Serbia and Montenegro after 2006`);
      if (n === 'Serbia' || n === 'Montenegro') check('3', year >= 2007, `${id} names ${n} alone before 2007`);
    }
  }
  console.log(`  ${data.BASKETBALL_INTL_EDITIONS.filter(r => r[6]).length} played fields, ${nations.size} nations, no flag: ${[...nations].filter(n => !flags.has(n)).join(', ') || 'none'}`);
}

/* A sport free bind the harness owns, on the real calendar, for the sections
   that need the module before (or beside) the NBA bind. */
const RUNG = { gold: 92, silver: 89, bronze: 87, fourth: 85, quarter: 82, field: 76 };
function harnessBind(cal) {
  const norm = r => { let u = 0; let v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return {
    slug: 'sim', calendar: cal, nationOf: () => 'USA',
    callOf: c => cal.editionFor(c.year + 1),
    strengthOf: (e, n) => RUNG[intl.intlRungOf(e, n) ?? 'field'],
    liftOf: () => 1,
    play(a, b, rng) {
      let sa = Math.round(80 + 1.2 * (a - b) + 9 * norm(rng));
      let sb = Math.round(80 + 1.2 * (b - a) + 9 * norm(rng));
      let ot = 0;
      while (sa === sb) { ot += 1; sa += Math.round(10 + 3 * norm(rng)); sb += Math.round(10 + 3 * norm(rng)); }
      return { a: sa, b: sb, ot };
    },
    groupDraws: false, groupPoints: [2, 1, 1],
    tableOrder: (x, y) => y.won - x.won || (y.pf - y.pa) - (x.pf - x.pa),
    lineOf: (_c, rng) => ({ pts: Math.round(20 + 5 * rng()) }),
    knockChance: () => 0.1, knock: c => { c.health -= 8; }, ageOf: c => c.age, careerKey: c => c.name, rng: keyed.keyedRng,
  };
}

/* ─── 3, second half: the fields the game draws ──────────────────────────── */
if (SECTIONS.has('3')) {
  const cal = intl.intlCalendar(LEDGER());
  const bind = harnessBind(cal);
  let drawn = 0;
  for (let y = 2025; y <= 2050; y += 1) {
    const e = cal.editionFor(y);
    if (!e || e.field) continue;
    drawn += 1;
    const f1 = intl.intlFieldOf(bind, e, 'USA');
    const f2 = intl.intlFieldOf({ ...bind, careerKey: () => 'another career' }, e, 'USA');
    check('3', !!f1 && f1.generated, `${e.id} draws no field`);
    if (!f1) continue;
    const past = cal.played().filter(x => x.comp === e.comp);
    const near = new Set(past.slice(-2).flatMap(x => x.field));
    const wide = new Set(past.flatMap(x => x.field));
    check('3', near.size >= e.play.teams, `${e.id} pool of the last two fields holds ${near.size}, short of ${e.play.teams}`);
    check('3', f1.field.length === e.play.teams && new Set(f1.field).size === f1.field.length && f1.field.includes('USA'), `${e.id} drawn field is ${f1.field.length} nations, the shape ${e.play.teams}, or lacks the USA`);
    check('3', f1.field.every(n => wide.has(n)), `${e.id} drawn field names a nation from no played field`);
    check('3', same(f1.field, f2?.field), `${e.id} drawn field differs between two careers`);
  }
  console.log(`  ${drawn} summers 2025 to 2050 draw their field (the same for every career)`);
}

/* ─── 6. one engine and the stream ───────────────────────────────────────── */
/* The runner's fingerprints: code shapes only a copy of the bracket runner
   would hold. They must live in careerIntl.ts and nowhere else in src. */
const FINGERPRINTS = ['semiLosers', 'm + 1 - s', 'seeded.slice(p * shape.groups', 'slice(0, (n * (n - 1)) / 2)'];
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
function srcFiles(dir, out = []) {
  for (const d of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${d.name}`;
    if (d.isDirectory()) { if (rel !== 'src/test') srcFiles(rel, out); }
    else if (/\.tsx?$/.test(d.name) && !/\.test\.tsx?$/.test(d.name)) out.push(rel);
  }
  return out;
}
if (SECTIONS.has('6')) {
  console.log('section 6: one engine and the stream');
  const home = stripComments(fs.readFileSync(path.join(ROOT, INTL), 'utf8'));
  for (const f of FINGERPRINTS) check('6', home.includes(f), `careerIntl.ts no longer holds the fingerprint "${f}", so the fence would prove nothing`);
  const files = srcFiles('src').filter(f => f !== INTL).map(f => [f, stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8'))]);
  if (CONTROL === 'copy') {
    const raw = fs.readFileSync(path.join(ROOT, INTL), 'utf8');
    const at = raw.indexOf('export function runIntlTournament');
    const body = raw.slice(at, raw.indexOf('/* ─── the save', at));
    if (at < 0 || body.length < 500) { console.error('control copy cannot run: runIntlTournament was not found to copy'); process.exit(2); }
    files.push(['src/lib/nbaCareerIntl.ts (planted copy)', stripComments(body.replace('export function runIntlTournament', 'function privateRunner'))]);
  }
  for (const [f, text] of files) for (const fp of FINGERPRINTS) check('6', !text.includes(fp), `${f} holds the runner's fingerprint "${fp}": bind careerIntl.ts, never copy it`);
  const cal = intl.intlCalendar(LEDGER());
  const bind = harnessBind(cal);
  const before = MATH_RANDOM_CALLS;
  let went = 0;
  for (let i = 0; i < 120; i += 1) {
    const year = 2003 + (i % 44);
    const a = { name: `career ${i}`, year, age: 27, health: 90 };
    const b = JSON.parse(JSON.stringify(a));
    if (!intl.pendingCallUp(a, bind)) continue;
    intl.answerCallUp(a, bind, 'go');
    intl.answerCallUp(b, bind, 'go');
    went += 1;
    check('6', same(a, b), `career ${i} played ${a.intl?.summers[0]?.edition} two ways`);
  }
  check('6', MATH_RANDOM_CALLS === before, `Math.random was called ${MATH_RANDOM_CALLS - before} times in pending, answer and the run`);
  check('6', went >= 50, `only ${went} careers were called, too few to prove anything`);
  console.log(`  ${files.length} src files fenced, ${went} tournaments played twice, Math.random calls ${MATH_RANDOM_CALLS - before}`);
}

/* ─── 2b and 4: the call, through the real NBA engine ────────────────────── */
/* The fleet drives the NBA binding through src/test/helpers/usCareerDrive.ts,
   the drive that mirrors the board (camp, season, progress, the summer dealt,
   then the call, then the cards, then the team roll), FLEET careers an era,
   seeds 0 to FLEET - 1. The oracle states the bar itself (87, 36, 50) rather
   than reading the bind's constants, so a control that moves the bind's
   comparison cannot move the oracle with it. It also states the end of a
   career: the board ends a career after a season his farewell or retirement
   names before any summer (UsCareerBoard.tsx, endsAfterSeason), but the drive
   only stops on the engine's hard stop, so it reaches summers the board never
   does; such a summer is never called (control endcall). */
const FLEET = Number(process.env.INTL_FLEET || 400);
const ERAS = [['now', undefined, 2027], ['y2004', 'y2004', 2004]];
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
/* Round 1544 (the lead's ruling L1): the bar is 87. */
const ORACLE = { ovr: 87, age: 36, health: 50 };
if (SECTIONS.has('2') || SECTIONS.has('4')) {
  console.log(`sections 2b and 4: the call, ${FLEET} careers an era through the real NBA engine`);
  for (const [era, eraId, firstSummer] of ERAS) {
    let careers = 0; let called = 0; let calls = 0; let summers = 0; let rated = 0; let hurtBlocked = 0; let oldBlocked = 0; let endBlocked = 0;
    const firsts = new Map();
    const bests = [];
    for (let i = 0; i < FLEET; i += 1) {
      let mine = 0;
      let first = null;
      let best = 0;
      const onSummer = c => {
        const line = c.seasons[c.seasons.length - 1];
        const summer = line.year + 1;
        if (first === null) first = summer;
        summers += 1;
        const ed = resolve(summer);
        const suspended = line.teamResult === 'SUSPENDED' || (c.suspendedSeasons ?? 0) > 0;
        const r = c.retirement;
        const ending = !!r && ((r.retiredYear !== undefined && line.year >= r.retiredYear) || (r.farewellYear !== undefined && line.year >= r.farewellYear));
        if (ed && !suspended && line.ovr >= ORACLE.ovr) {
          rated += 1;
          if (ending) endBlocked += 1;
          if (c.health < ORACLE.health) hurtBlocked += 1;
          if (c.age > ORACLE.age) oldBlocked += 1;
        }
        if (ed && !suspended && !ending && c.age <= ORACLE.age && c.health >= ORACLE.health) best = Math.max(best, line.ovr);
        const meets = !!ed && !c.retired && !ending && !suspended && line.ovr >= ORACLE.ovr && c.age <= ORACLE.age && c.health >= ORACLE.health;
        const call = nbaIntl.NBA_CAREER_INTL.pending(c);
        /* Round 1544: what the board reads before the module loads, the binding's static gate. */
        const gateYear = NBA_CAREER_SPORT.intl.pendingYear(c);
        check('4', (gateYear !== null) === meets && (gateYear === null || gateYear === summer), `${era} ${i} summer ${summer}: the gate says ${gateYear}, the oracle says ${meets}`);
        check('4', (NBA_CAREER_SPORT.intl.curtainLine(c) !== null) === meets, `${era} ${i} summer ${summer}: the curtain line and the oracle disagree`);
        check('4', !!call === meets,`${era} ${i} summer ${summer}: ovr ${line.ovr} age ${c.age} health ${c.health} edition ${ed?.id ?? 'none'}, called ${!!call}, the oracle says ${meets}`);
        if (call) {
          mine += 1;
          check('2', call.year === summer && call.edition.id === ed?.id, `${era} ${i}: the season labelled ${line.year} is called to ${call.edition.id}, the summer after it is ${summer} (${ed?.id ?? 'none'})`);
        }
      };
      drive.driveCareer(NBA_CAREER_SPORT, { key: `intl:${era}:${i}`, pos: POS[i % POS.length], arch: i, eraId, seasons: 30, onSummer });
      careers += 1;
      bests.push(best);
      if (mine) called += 1;
      calls += mine;
      if (first !== null) firsts.set(first, (firsts.get(first) ?? 0) + 1);
    }
    check('2', firsts.size === 1 && firsts.has(firstSummer), `${era}: first summers ${JSON.stringify([...firsts])}, expected ${firstSummer}`);
    check('4', called > 0, `${era}: nobody was ever called, so the section proves nothing`);
    console.log(`  ${era}: ${careers} careers, ${summers} summers, first summer ${[...firsts.keys()].join(' ')}; called at least once ${called} (${(100 * called / careers).toFixed(1)} percent), ${calls} calls (${(calls / careers).toFixed(2)} a career, ${(calls / Math.max(1, called)).toFixed(2)} a called career)`);
    console.log(`  ${era}: share of careers ever called if the bar were 84 to 92: ${[84, 85, 86, 87, 88, 89, 90, 91, 92].map(b => `${b} ${(100 * bests.filter(x => x >= b).length / careers).toFixed(1)}`).join(", ")}`);
    console.log(`  ${era}: ${rated} edition summers rated ${ORACLE.ovr} or more; held back by health under ${ORACLE.health}: ${hurtBlocked} (${(100 * hurtBlocked / Math.max(1, rated)).toFixed(1)} percent), by age over ${ORACLE.age}: ${oldBlocked}; by a career ending with that season: ${endBlocked}`);
  }
}

/* ─── 5. the tournament, by rating tier ──────────────────────────────────── */
/* TOURNEYS tournaments an edition kind a seed set (played, still to come,
   projected), ten seed sets: sets 1 to 5 set the bands (BANDS below, read off
   their printed rates with headroom), sets 6 to 10 are held out and must sit
   inside them. A career at the call is a season line at a tier's rating and
   nothing else, so the tier is the only thing that moves a rate. Tournament k
   plays tier k mod 4 and edition (k div 4) mod the kind's editions, so every
   tier meets every edition of its kind (Round 1541's fix: the edition used to
   run on k itself, which locked each tier of the 4 future and 8 projected
   editions to one competition, World Cups for two tiers and Olympics for the
   other two, and measured the competition instead of the tier).
   ROUND 1544. The tiers are read from the bar (87: 87-89, 90-92, 93-95,
   96-99), so each tier's lift is what it was at 86 and the played editions'
   rates are the same to the decimal (the rating moves nothing else). The
   default is 8000 tournaments a kind a set (2000 a tier): Round 1541's 2000
   left a held out set's standard error at 2.2 points, so a calibrated future
   kind sat a coin toss from the band; more tournaments, never a wider band. */
const TOURNEYS = Number(process.env.INTL_TOURNEYS || 8000);
const TIERS = [[ORACLE.ovr, ORACLE.ovr + 2], [ORACLE.ovr + 3, ORACLE.ovr + 5], [ORACLE.ovr + 6, ORACLE.ovr + 8], [ORACLE.ovr + 9, 99]];
const KINDS = ['played', 'future', 'projected'];
/* Gold and medal bands a tier (percent): [gold low, gold high, medal low, medal high], the PLAYED
   editions' bands, held to every kind since Round 1544 (the lead's ruling L3: summers still to come and
   projected ones must sit inside what played summers measure). Measured by Round 1541's fix (2000
   tournaments a kind a set, so 500 a tier): played sets 1 to 5 ranged, gold then medal, by tier,
   gold 45.0-49.4, 53.6-59.8, 60.8-64.0, 63.0-66.2, medal 77.8-80.4, 82.0-85.4, 88.2-89.2, 90.2-91.0; each
   band is that range widened by 6 points (close to three errors at 500 a tier) on both sides. These numbers
   do not move in Round 1544. What Round 1544 measured at 8000 a set (2000 a tier), gold percent:
     played     sets 1 to 5 46.6-47.8, 54.3-57.1, 62.4-65.0, 64.2-66.7; held out 46.1-48.0, 54.5-57.0,
                63.7-64.6, 65.0-66.5 (pooled 47.4, 55.7, 64.2, 65.5)
     future     sets 1 to 5 41.8-45.5, 54.0-57.0, 62.6-64.3, 65.1-69.8; held out 43.9-47.0, 54.3-56.2,
                64.0-67.0, 66.0-68.8 (pooled 44.9, 55.4, 65.3, 67.3)
     projected  sets 1 to 5 44.5-48.1, 55.0-57.7, 64.7-67.3, 67.8-69.0; held out 44.9-47.9, 56.1-58.6,
                64.4-67.3, 65.6-70.0 (pooled 46.4, 57.3, 65.7, 68.0)
   and medal percent held out: played 77.8-79.0, 83.3-84.5, 87.8-89.4, 89.0-90.3; future 75.2-77.7,
   82.9-84.8, 89.0-90.0, 88.8-90.7; projected 77.0-79.3, 85.3-85.8, 88.5-90.6, 89.7-92.5. All inside. The
   closest edge is projected 96-99 gold at 70.0 against 72.2 (a standard error of about 1.0 at 2000 a tier).
   Before Round 1544 (each nation at the MEAN of its rungs) the future kind's held out gold pooled 69.4,
   79.8, 88.4, 89.4: control easyfuture puts that back and must go red. */
const BANDS = {
  played: [[39.0, 55.4, 71.8, 86.4], [47.6, 65.8, 76.0, 91.4], [54.8, 70.0, 82.2, 95.2], [57.0, 72.2, 84.2, 97.0]],
};
/* Gold must rise from tier to tier (the first three) by at least this many points, pooled over the held out
   sets (2500 a tier, a standard error on a difference of about 1.4 points). Sets 1 to 5 pooled rose at least
   5.8 (played, 89-91 to 92-94); the held out sets at least 8.4 (projected, 89-91 to 92-94). The 95-99 tier is
   not held to a rise: the lift is capped at 4, reached at 94, so it measured 1.0 to 1.7 over 92-94 and could
   tie. */
const RISE = 3;
/* The knock: the share of tournaments he comes home hurt from, by his age that
   summer (the NBA bind's rule: 8 percent, plus 1 point a year over 30, so 8, 8,
   11 and 14 at the four ages). Age moves nothing in a tournament but its last
   draw, so the tiers' rates above do not see it; the age runs on
   (k div 4) div the kind's editions, so every age meets every tier and edition.
   Measured with the bands above (about 1,500 tournaments an age a set): sets 1
   to 5 ranged 7.7-9.0, 7.6-9.0, 10.2-11.7, 13.0-15.3 (pooled 8.2, 8.2, 10.6,
   14.1); a set's rate has a standard error of 0.7 to 0.9 points, so each band
   is that range widened by 3 points (three to four errors). The held out sets
   measured 6.8-8.6, 6.8-7.9, 10.2-12.5, 13.2-14.1 (all inside), pooled 7.6,
   7.3, 11.2, 13.7. The rise from 26 to 36, pooled over the held out sets
   (a standard error of about 0.5 points), measured 6.1 (5.9 over sets 1 to 5)
   and must be at least KNOCK_RISE. Controls: knockflip (the comparison flipped,
   so he comes home hurt from most tournaments) and knockage (the age term
   dropped). */
const KNOCK_AGES = [26, 30, 33, 36];
const KNOCK_BANDS = [[4.7, 12.0], [4.6, 12.0], [7.2, 14.7], [10.0, 18.3]];
const KNOCK_RISE = 3;
const tierCareer = (ovr, k, age) => ({
  name: `band ${k}`, pos: 'SF', draftPick: 1, age, health: 80, retired: false,
  seasons: [{ year: 2000, ovr, ppg: 24, rpg: 6, apg: 5, teamResult: 'band', games: 70 }],
});
if (SECTIONS.has('5')) {
  console.log(`section 5: the tournament, ${TOURNEYS} tournaments an edition kind, ten seed sets`);
  const cal = nbaIntl.NBA_INTL_CALENDAR;
  const editions = { played: cal.played(), future: [], projected: [] };
  for (let y = 2025; y <= 2050; y += 1) { const e = cal.editionFor(y); if (e && e.kind !== 'played') editions[e.kind].push(e); }
  const rates = {};
  const hurtTally = {};
  let invariants = 0;
  for (let set = 1; set <= 10; set += 1) {
    hurtTally[set] = KNOCK_AGES.map(() => ({ n: 0, hurt: 0 }));
    for (const kind of KINDS) {
      const eds = editions[kind];
      const tally = TIERS.map(() => ({ n: 0, gold: 0, medal: 0 }));
      const kt = hurtTally[set];
      for (let k = 0; k < TOURNEYS; k += 1) {
        /* Three counters that never move together: the tier is k mod 4, the
           edition and the rating inside the tier run on j = k div 4 (so every
           tier plays every edition of the kind), and the age runs on j div the
           number of editions (so every age meets every edition and tier). */
        const ti = k % TIERS.length;
        const j = Math.floor(k / TIERS.length);
        const [lo, hi] = TIERS[ti];
        const ovr = lo + (j % (hi - lo + 1));
        const e = eds[j % eds.length];
        const ai = Math.floor(j / eds.length) % KNOCK_AGES.length;
        const t = intl.runIntlTournament(e, 'USA', nbaIntl.NBA_INTL_BIND, tierCareer(ovr, k, KNOCK_AGES[ai]), keyed.keyedRng(`band:${set}:${kind}:${k}`));
        if (!t) { check('5', false, `${e.id} played no tournament`); continue; }
        kt[ai].n += 1;
        if (t.hurt) kt[ai].hurt += 1;
        const place = t.places.USA;
        tally[ti].n += 1;
        if (place === 'gold') tally[ti].gold += 1;
        if (place === 'gold' || place === 'silver' || place === 'bronze') tally[ti].medal += 1;
        /* the unit file's invariants, on every tournament */
        invariants += 1;
        const by = p => Object.entries(t.places).filter(([, x]) => x === p).map(([n]) => n);
        const medals = [...by('gold'), ...by('silver'), ...by('bronze')];
        if (e.play.bronze) check('5', medals.length === 3 && new Set(medals).size === 3 && by('fourth').length === 1, `${e.id} set ${set} #${k}: podium ${medals.join(',')}`);
        check('5', t.champion === t.games.find(g => g.round === 'final')?.winner, `${e.id} #${k}: the champion is not the final's winner`);
        let w = 0; let l = 0;
        for (const gr of t.groups) for (const r of gr.table) { w += r.won; l += r.lost; }
        check('5', w === l, `${e.id} #${k}: group wins ${w}, losses ${l}`);
        for (const g of t.games) if (g.sa === g.sb || g.a === g.b || !(g.winner === g.a || g.winner === g.b)) check('5', false, `${e.id} #${k}: a level, self or unwon game`);
      }
      rates[`${set}:${kind}`] = tally.map(x => ({ gold: (100 * x.gold) / x.n, medal: (100 * x.medal) / x.n }));
    }
  }
  const fmt = r => r.map(x => `${x.gold.toFixed(1)}/${x.medal.toFixed(1)}`).join('  ');
  for (const kind of KINDS) {
    console.log(`  ${kind} (gold/medal percent by tier ${TIERS.map(([a, b]) => `${a}-${b}`).join(', ')}):`);
    for (let set = 1; set <= 10; set += 1) console.log(`    set ${set}${set > 5 ? ' (held out)' : ''}: ${fmt(rates[`${set}:${kind}`])}`);
    const lo = TIERS.map((_, ti) => Math.min(...[1, 2, 3, 4, 5].map(s => rates[`${s}:${kind}`][ti].gold)));
    const hi = TIERS.map((_, ti) => Math.max(...[1, 2, 3, 4, 5].map(s => rates[`${s}:${kind}`][ti].gold)));
    console.log(`    sets 1 to 5 gold range by tier: ${lo.map((x, i) => `${x.toFixed(1)} to ${hi[i].toFixed(1)}`).join(', ')}`);
    const held = TIERS.map((_, ti) => [6, 7, 8, 9, 10].reduce((s, x) => s + rates[`${x}:${kind}`][ti].gold, 0) / 5);
    console.log(`    held out pooled gold by tier: ${held.map(x => x.toFixed(1)).join(', ')}; rises ${held.slice(1).map((x, i) => (x - held[i]).toFixed(1)).join(', ')}`);
    if (BANDS) {
      for (let s = 6; s <= 10; s += 1) TIERS.forEach((_, ti) => {
        const [g0, g1, m0, m1] = BANDS.played[ti];
        const r = rates[`${s}:${kind}`][ti];
        check('5', r.gold >= g0 && r.gold <= g1 && r.medal >= m0 && r.medal <= m1, `${kind} set ${s} tier ${TIERS[ti].join('-')}: gold ${r.gold.toFixed(1)} medal ${r.medal.toFixed(1)} outside the played band ${g0}-${g1} / ${m0}-${m1}`);
      });
    }
    if (RISE !== null) for (let ti = 1; ti < 3; ti += 1) check('5', held[ti] - held[ti - 1] >= RISE, `${kind}: gold rises ${(held[ti] - held[ti - 1]).toFixed(1)} from tier ${TIERS[ti - 1].join('-')} to ${TIERS[ti].join('-')}, under ${RISE}`);
  }
  const hurtPct = x => (100 * x.hurt) / Math.max(1, x.n);
  console.log(`  the knock (hurt percent by age ${KNOCK_AGES.join(', ')}; the rule says ${KNOCK_AGES.map(a => (100 * nbaIntl.nbaIntlKnockChance(a)).toFixed(0)).join(', ')}):`);
  for (let set = 1; set <= 10; set += 1) console.log(`    set ${set}${set > 5 ? ' (held out)' : ''}: ${hurtTally[set].map(x => `${hurtPct(x).toFixed(1)} of ${x.n}`).join('  ')}`);
  const pool = sets => KNOCK_AGES.map((_, ai) => {
    const x = sets.reduce((s, set) => ({ n: s.n + hurtTally[set][ai].n, hurt: s.hurt + hurtTally[set][ai].hurt }), { n: 0, hurt: 0 });
    return hurtPct(x);
  });
  const kLo = KNOCK_AGES.map((_, ai) => Math.min(...[1, 2, 3, 4, 5].map(s => hurtPct(hurtTally[s][ai]))));
  const kHi = KNOCK_AGES.map((_, ai) => Math.max(...[1, 2, 3, 4, 5].map(s => hurtPct(hurtTally[s][ai]))));
  console.log(`    sets 1 to 5 range by age: ${kLo.map((x, i) => `${x.toFixed(1)} to ${kHi[i].toFixed(1)}`).join(', ')}; pooled ${pool([1, 2, 3, 4, 5]).map(x => x.toFixed(1)).join(', ')}`);
  const kHeld = pool([6, 7, 8, 9, 10]);
  console.log(`    held out pooled by age: ${kHeld.map(x => x.toFixed(1)).join(', ')}; rise from ${KNOCK_AGES[0]} to ${KNOCK_AGES[KNOCK_AGES.length - 1]}: ${(kHeld[kHeld.length - 1] - kHeld[0]).toFixed(1)}`);
  if (KNOCK_BANDS) {
    for (let s = 6; s <= 10; s += 1) KNOCK_AGES.forEach((age, ai) => {
      const [b0, b1] = KNOCK_BANDS[ai];
      const r = hurtPct(hurtTally[s][ai]);
      check('5', r >= b0 && r <= b1, `the knock, set ${s} age ${age}: hurt ${r.toFixed(1)} percent outside ${b0}-${b1}`);
    });
  }
  if (KNOCK_RISE !== null) check('5', kHeld[kHeld.length - 1] - kHeld[0] >= KNOCK_RISE, `the knock rises ${(kHeld[kHeld.length - 1] - kHeld[0]).toFixed(1)} from age ${KNOCK_AGES[0]} to ${KNOCK_AGES[KNOCK_AGES.length - 1]}, under ${KNOCK_RISE}`);
  console.log(`  ${invariants} tournaments held to the invariants`);
}

/* ─── 7. what must not move ──────────────────────────────────────────────── */
/* The same FLEET careers an era, four ways: INTL_BASE's NBA binding and drive
   (INTL_BASE_DIR, a worktree of the commit the branch started from, or of
   origin/main's merge base after a merge), and this head with no policy,
   always go and always rest. A career never called is byte identical to the
   base; one that only rested differs by its intl key alone; one that went
   differs only through its block and, after the first summer it came home
   hurt, its health and what follows from it. The deal comes before the
   answer: every call's dealt cards, up to and including the summer of the
   first knock, are the same in the go and rest arms. */
const BASE_DIR = process.env.INTL_BASE_DIR || '';
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
if (SECTIONS.has('7')) {
  console.log(`section 7: what must not move, ${FLEET} careers an era against ${BASE_DIR || '(no base)'}`);
  if (!BASE_DIR || !fs.existsSync(path.join(BASE_DIR, 'src/lib/nbaCareerSport.ts'))) { console.error('section 7 needs INTL_BASE_DIR, a worktree of the base commit'); process.exit(2); }
  const BENTRY = path.join(TMP, 'base-entry.mjs');
  const BOUT = path.join(TMP, 'base-bundle.mjs');
  const B = path.resolve(BASE_DIR).replaceAll('\\', '/');
  fs.writeFileSync(BENTRY, `export { NBA_CAREER_SPORT } from '${B}/src/lib/nbaCareerSport.ts';\nexport * as drive from '${B}/src/test/helpers/usCareerDrive.ts';\n`);
  await build({ entryPoints: [BENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BOUT, logLevel: 'error', absWorkingDir: path.resolve(BASE_DIR), alias: { '@': path.join(path.resolve(BASE_DIR), 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
  const base = await import(pathToFileURL(BOUT).href);
  const legacyOf = CONTROL === 'legacyreads'
    ? c => { const l = NBA_CAREER_SPORT.legacyOf(c); return { ...l, score: l.score + intl.intlStatsOf(c.intl).medals }; }
    : c => NBA_CAREER_SPORT.legacyOf(c);
  const strip = json => { const c = JSON.parse(json); delete c.intl; return c; };
  for (const [era, eraId] of ERAS) {
    const n = { never: 0, rested: 0, went: 0, hurt: 0, unhurt: 0 };
    const leg = { go: [], rest: [], goHof: 0, restHof: 0 };
    const sizes = [];
    for (let i = 0; i < FLEET; i += 1) {
      const o = { key: `intl7:${era}:${i}`, pos: POS[i % POS.length], arch: i, eraId, seasons: 30 };
      const baseJson = base.drive.driveCareer(base.NBA_CAREER_SPORT, o).json;
      const none = drive.driveCareer(NBA_CAREER_SPORT, o);
      const go = drive.driveCareer(NBA_CAREER_SPORT, { ...o, intl: 'go', intlFace: nbaIntl.NBA_CAREER_INTL });
      const rest = drive.driveCareer(NBA_CAREER_SPORT, { ...o, intl: 'rest', intlFace: nbaIntl.NBA_CAREER_INTL });
      check('7', none.json === baseJson, `${era} ${i}: with no answer the career differs from the base`);
      if (!rest.intlLog.length) {
        n.never += 1;
        check('7', rest.json === baseJson && go.json === baseJson && !go.intlLog.length, `${era} ${i}: never called, yet the career moved`);
        continue;
      }
      n.rested += 1;
      check('7', same(strip(rest.json), JSON.parse(baseJson)), `${era} ${i}: resting moved something beside the intl block`);
      const gc = JSON.parse(go.json);
      const rows = gc.intl?.summers ?? [];
      const firstHurt = rows.find(r => r.went && r.hurt);
      /* Every call up to and including the summer of the first knock is dealt before it, so its cards are
         the same whether he goes or rests; after a knock the careers may part. */
      const upTo = firstHurt ? firstHurt.year : Infinity;
      const goCalls = go.intlLog.filter(x => x.year <= upTo);
      const restCalls = rest.intlLog.filter(x => x.year <= upTo);
      check('7', goCalls.length > 0 && same(goCalls.map(x => [x.year, x.edition, x.dealt]), restCalls.map(x => [x.year, x.edition, x.dealt])), `${era} ${i}: a call's deal differs between go and rest before the first knock (${goCalls.length} go calls, ${restCalls.length} rest calls up to ${upTo})`);
      n.went += 1;
      if (gc.seasons.length >= 21) sizes.push([baseJson.length, go.json.length, gc.intl?.summers?.length ?? 0]);
      if (!firstHurt) {
        n.unhurt += 1;
        check('7', same(strip(go.json), JSON.parse(baseJson)), `${era} ${i}: went and never came home hurt, yet more than the block moved`);
      } else {
        n.hurt += 1;
        const bc = JSON.parse(baseJson);
        const before = s => s.year < firstHurt.year;
        check('7', same(gc.seasons.filter(before), bc.seasons.filter(before)), `${era} ${i}: the seasons before the first knock (${firstHurt.year}) moved`);
      }
      const rc = JSON.parse(rest.json);
      const lg = legacyOf(gc); const lr = legacyOf(rc);
      check('7', same(legacyOf(gc), legacyOf(strip(go.json))), `${era} ${i}: legacy reads the intl block`);
      leg.go.push(lg.score); leg.rest.push(lr.score);
      if (lg.hof) leg.goHof += 1;
      if (lr.hof) leg.restHof += 1;
    }
    check('7', n.rested > 0 && n.never > 0 && n.unhurt > 0, `${era}: the fleet has no called, never called or unhurt career, so the section proves nothing`);
    console.log(`  ${era}: never called ${n.never}, called ${n.rested} (went and never hurt ${n.unhurt}, hurt at least once ${n.hurt})`);
    if (sizes.length) console.log(`  ${era}: save bytes of a career of 21 seasons or more that went every time it was called: first ${sizes[0][0]} on the base, ${sizes[0][1]} on this head (${sizes[0][2]} summers); the save grows by ${median(sizes.map(x => x[1] - x[0]))} bytes at the median, ${Math.max(...sizes.map(x => x[1] - x[0]))} at most, over ${sizes.length} careers`);
    console.log(`  ${era}: called careers, legacy median always go ${median(leg.go)} vs always rest ${median(leg.rest)}; Hall share ${(100 * leg.goHof / Math.max(1, leg.go.length)).toFixed(1)} vs ${(100 * leg.restHof / Math.max(1, leg.rest.length)).toFixed(1)} percent (measured, never asserted)`);
  }
}

/* ─── 8. saves ───────────────────────────────────────────────────────────── */
/* Part A's board never calls the repair, so the repair is run directly: over
   every NBA save scripts/lib/realSaves.mjs builds (each must come back byte
   identical) and over a planted broken block, row and last (each dropped
   alone, the rest of the career untouched). */
if (SECTIONS.has('8')) {
  console.log('section 8: saves');
  /* Round 1557 (1544's review, minor 7): every NBA save realSaves.mjs builds over INTL_REAL_SEEDS seeds (default
     16), not the four seeds' two, and the four planted blocks below go into every one of them rather than the
     first. realSaves builds one NBA save a seed: a played career on the seeds with seed % 4 below 2 and a prospect
     (c null, no career to repair) on the others, so the saves checked here are the played half, 8 of 16 by
     construction (corrected by 1557's fix, review-read-1557 minor 5: the floor below is that structural count, not
     a measured band, so it has no headroom to set). */
  const REAL_SEEDS = Number(process.env.INTL_REAL_SEEDS || 16);
  const { fleet } = await buildRealSaves({ root: ROOT, tmpDir: path.join(TMP, 'real'), seeds: Array.from({ length: REAL_SEEDS }, (_, i) => i) });
  const built = (fleet['/nba-my-career'] ?? []).map(raw => JSON.parse(raw));
  const saves = built.filter(s => s && s.c);
  console.log(`  realSaves built ${built.length} NBA saves: ${saves.length} played careers, ${built.length - saves.length} prospects with no career`);
  check('8', saves.length >= REAL_SEEDS / 2, `only ${saves.length} NBA saves were built over ${REAL_SEEDS} seeds`);
  for (const [k, s] of saves.entries()) {
    const c = JSON.parse(JSON.stringify(s.c));
    const was = JSON.stringify(c);
    check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(c) === false && JSON.stringify(c) === was, `real save ${k} moved on repair`);
  }
  const good = () => [
    { year: 2004, edition: 'oly-2004', went: false },
    { year: 2008, edition: 'oly-2008', went: true, age: 25, place: 'gold', games: 8, wins: 8, avg: { pts: 20, reb: 5, ast: 4 }, hurt: false },
  ];
  const plant = (s, intlBlock) => { const c = JSON.parse(JSON.stringify(s.c)); c.intl = intlBlock; return c; };
  for (const sample of saves) {
    const plain = JSON.stringify(sample.c);
    const a = plant(sample, { v: 9, summers: 'broken' });
    check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(a) && !('intl' in a) && JSON.stringify(a) === plain, 'a broken block was not dropped alone');
    const b = plant(sample, { v: 1, summers: [...good(), { year: 2006, edition: 'oly-2008', went: false }] });
    check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(b) && same(b.intl?.summers, good()), 'a broken row was not dropped alone');
    const cOk = plant(sample, { v: 1, summers: good(), last: { v: 1, edition: 'oly-2008' } });
    check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(cOk) && same(cOk.intl, { v: 1, summers: good() }), 'a broken last was not dropped alone');
    const d = plant(sample, { v: 1, summers: [{ year: 2035, edition: 'wc-2035', went: true, age: 30, place: 'gold', games: 8, wins: 8, avg: { pts: 20 }, hurt: false }] });
    check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(d) === false && d.intl.summers.length === 1, 'a projected summer was dropped');
  }
  console.log(`  ${saves.length} NBA saves over ${REAL_SEEDS} seeds (${saves.filter(s => s.c.seasons?.length).length} with seasons played) repaired byte identical; four planted blocks checked in each`);

  /* Round 1544 (the lead's ruling L4): nothing of a tournament is stored. A go fleet, each answer's
     tournament captured as it was played, then played again from the career's FINAL save (seasons later,
     health knocked, older): byte for byte the same. A save the way Round 1541's code wrote it (the latest
     tournament kept in last) loses that last when the replay equals it, and keeps it, as what the screens
     show, when it does not. */
  const RF = Number(process.env.INTL_REPLAY_FLEET || 60);
  let replays = 0; let dropped = 0; let kept = 0;
  for (const [era, eraId] of ERAS) {
    for (let i = 0; i < RF; i += 1) {
      const r = drive.driveCareer(NBA_CAREER_SPORT, { key: `intl8:${era}:${i}`, pos: POS[i % POS.length], arch: i, eraId, seasons: 30, intl: 'go', intlFace: nbaIntl.NBA_CAREER_INTL });
      const c = JSON.parse(r.json);
      check('8', !c.intl || !('last' in c.intl), `${era} ${i}: a save stores a tournament`);
      for (const x of r.intlLog) {
        if (x.played === 'null') continue;
        replays += 1;
        check('8', JSON.stringify(nbaIntl.NBA_CAREER_INTL.tournamentOf(c, x.year)) === x.played, `${era} ${i} summer ${x.year}: the replay from the final save differs from the tournament played`);
      }
      const latest = [...r.intlLog].reverse().find(x => x.played !== 'null');
      if (!latest) continue;
      const old = JSON.parse(r.json);
      old.intl.last = JSON.parse(latest.played);
      const rows = JSON.stringify(old.intl.summers);
      check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(old) === true && !('last' in old.intl) && JSON.stringify(old.intl.summers) === rows, `${era} ${i}: a stored last the replay equals was not dropped alone`);
      dropped += 1;
      const odd = JSON.parse(r.json);
      odd.intl.last = JSON.parse(latest.played);
      odd.intl.last.games[0].sa += 1;
      const was = JSON.stringify(odd);
      check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(odd) === false && JSON.stringify(odd) === was, `${era} ${i}: a stored last the replay does not equal was not kept`);
      check('8', JSON.stringify(nbaIntl.NBA_CAREER_INTL.tournamentOf(odd, latest.year)) === JSON.stringify(odd.intl.last), `${era} ${i}: a kept snapshot is not what the screens show`);
      kept += 1;
    }
  }
  check('8', replays >= 100 && dropped > 0 && kept > 0, `only ${replays} tournaments were played again (${dropped} dropped, ${kept} kept), so the section proves little`);
  console.log(`  ${replays} tournaments of ${RF} go careers an era played again from the final save, byte identical; planted lasts: ${dropped} equal to the replay dropped, ${kept} unequal kept`);

  /* With INTL_OLD_DIR (a tree of Round 1541's closing head, 74ece9992): the saves THAT code wrote, repaired
     here. Measured, never banded: how many keep their last, and the reason, by kind of summer. */
  if (process.env.INTL_OLD_DIR) {
    const O = path.resolve(process.env.INTL_OLD_DIR).replaceAll('\\', '/');
    const OENTRY = path.join(TMP, 'old-entry.mjs');
    const OOUT = path.join(TMP, 'old-bundle.mjs');
    fs.writeFileSync(OENTRY, `export { NBA_CAREER_SPORT } from '${O}/src/lib/nbaCareerSport.ts';\nexport * as drive from '${O}/src/test/helpers/usCareerDrive.ts';\n`);
    await build({ entryPoints: [OENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OOUT, logLevel: 'error', absWorkingDir: path.resolve(O), alias: { '@': path.join(path.resolve(O), 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
    const oldCode = await import(pathToFileURL(OOUT).href);
    const tally = {};
    let withLast = 0;
    for (const [era, eraId] of ERAS) {
      for (let i = 0; i < RF; i += 1) {
        const r = oldCode.drive.driveCareer(oldCode.NBA_CAREER_SPORT, { key: `intl8old:${era}:${i}`, pos: POS[i % POS.length], arch: i, eraId, seasons: 30, intl: 'go' });
        const c = JSON.parse(r.json);
        if (!c.intl?.last) continue;
        withLast += 1;
        const rows = JSON.stringify(c.intl.summers);
        const kind = nbaIntl.NBA_INTL_CALENDAR.byId(c.intl.last.edition)?.kind ?? 'unknown';
        const row = c.intl.summers.find(x => x.went && x.edition === c.intl.last.edition);
        const ovr = c.seasons.filter(s => nbaIntl.nbaIntlSummerOf(s.year) === row?.year).pop()?.ovr ?? 0;
        nbaIntl.NBA_CAREER_INTL.repairOnLoad(c);
        check('8', JSON.stringify(c.intl.summers) === rows, `old ${era} ${i}: the repair moved a summer row`);
        const key = `${kind} ${ovr >= 95 ? 'rated 95 or more' : 'rated under 95'}`;
        tally[key] ??= { dropped: 0, kept: 0 };
        tally[key][c.intl.last ? 'kept' : 'dropped'] += 1;
      }
    }
    check('8', withLast > 0, 'Round 1541\'s code wrote no save with a stored last, so 8c proves nothing');
    console.log(`  8c, ${withLast} saves Round 1541's code wrote with a stored last, repaired here: ${Object.entries(tally).map(([k, v]) => `${k}: ${v.dropped} dropped, ${v.kept} kept`).join('; ')}`);
  }
}

/* ─── 12. the weight: the page's static graph holds no ledger ───────────── */
/* Round 1544 (the lead's ruling L5). src/pages/NbaMyCareer.tsx is bundled the
   way the site splits it (esbuild, splitting on, every dynamic import its own
   chunk), and the page's entry output is walked through its STATIC imports
   only. Every source module in that closure is read off the bundler's
   metafile, its graph, not source text. The ledger, the bracket runner and
   the NBA bind must be outside it and inside some lazy chunk; the gate must
   be inside it. Control staticledger (the binding imports the ledger): red.
   The weight in bytes is measured on a served build by sweepWeight. */
if (SECTIONS.has('12')) {
  console.log('section 12: the static graph of /nba-my-career');
  const empty = ['.css', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.woff', '.woff2', '.mp3', '.ttf'];
  const viteOnly = { name: 'r1544-vite-only', setup(b) {
    b.onResolve({ filter: /\?(url|raw)$/ }, a => ({ path: a.path, namespace: 'r1544-empty' }));
    b.onLoad({ filter: /.*/, namespace: 'r1544-empty' }, () => ({ contents: 'export default "";', loader: 'js' }));
  } };
  const res = await build({
    entryPoints: [path.join(ROOT, 'src/pages/NbaMyCareer.tsx')], bundle: true, splitting: true, format: 'esm', platform: 'browser',
    outdir: path.join(TMP, 'graph'), write: false, metafile: true, logLevel: 'error', absWorkingDir: ROOT, jsx: 'automatic',
    alias: { '@': path.join(ROOT, 'src') }, loader: Object.fromEntries(empty.map(x => [x, 'empty'])),
    define: { 'process.env.NODE_ENV': '"production"' }, plugins: [controlPlugin, viteOnly],
  });
  const outs = res.metafile.outputs;
  /* With splitting every dynamically imported module is an entry point too, so the page's own is found by name. */
  const entry = Object.keys(outs).find(k => (outs[k].entryPoint ?? '').replaceAll('\\', '/').endsWith('src/pages/NbaMyCareer.tsx'));
  check('12', !!entry, 'the page has no entry output');
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const k = stack.pop();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    for (const im of outs[k]?.imports ?? []) if (im.kind === 'import-statement' && !im.external) stack.push(im.path);
  }
  const inputsOf = keys => new Set(keys.flatMap(k => Object.keys(outs[k].inputs).map(f => f.replaceAll('\\', '/'))));
  const statics = inputsOf([...seen]);
  const lazies = inputsOf(Object.keys(outs).filter(k => !seen.has(k)));
  const has = (set, f) => [...set].some(x => x.endsWith(f));
  for (const f of ['src/data/basketballIntl.ts', 'src/lib/careerIntl.ts', 'src/lib/nbaCareerIntl.ts', 'src/components/us-career/IntlCallUpCard.tsx', 'src/components/us-career/IntlSummerResult.tsx']) {
    check('12', !has(statics, f), `${f} is in the static graph of /nba-my-career`);
    check('12', has(lazies, f), `${f} is in no lazy chunk, so the page cannot load it`);
  }
  check('12', has(statics, 'src/lib/nbaCareerIntlGate.ts'), 'the static gate is not in the static graph, so the board cannot read it');
  check('12', statics.size > 200, `the static graph holds ${statics.size} modules, too few to be the page`);
  console.log(`  ${seen.size} static outputs (${statics.size} modules) of ${Object.keys(outs).length}; ledger static: ${has(statics, 'src/data/basketballIntl.ts')}, bracket runner static: ${has(statics, 'src/lib/careerIntl.ts')}, gate static: ${has(statics, 'src/lib/nbaCareerIntlGate.ts')}`);
}

/* ─── 9 and 10. the case and the badges (Round 1557) ─────────────────────── */
/* INTL_CASE_FLEET careers an era (default 200, seeds 0 up), each driven twice
   through the real NBA engine with the face mounted: always go and always rest.
   9: the hub's tile is the rings plus the case plus the medals (the medals
   counted by the module, intlStatsOf, not by the reader the tile uses); the
   case's medal rows hold every medal once with its summer; no medal is ever a
   season's award; a career that only rested draws rings plus the case. 10: each
   of the three medal badges is lit exactly when the module says its fact holds,
   all three are lit somewhere in the always go fleet (both eras together), and
   none is ever lit in the always rest fleet. */
const CASE_FLEET = Number(process.env.INTL_CASE_FLEET || 200);
const MEDAL_BADGES = ['intl_medal', 'olympic_gold', 'world_cup_gold'];
if (SECTIONS.has('9') || SECTIONS.has('10')) {
  console.log(`sections 9 and 10: the case and the badges, ${CASE_FLEET} careers an era, always go and always rest`);
  const t0 = Date.now();
  const lit = Object.fromEntries(MEDAL_BADGES.map(id => [id, 0]));
  let restLit = 0; let medalCareers = 0; let medalsSeen = 0; let restCareers = 0;
  const caseTotal = c => hub.trophyLines(c.seasons).reduce((n, l) => n + l.n, 0);
  const tileTotal = c => hub.honoursTotal({ rings: NBA_CAREER_SPORT.ringsOf(c), honours: NBA_CAREER_SPORT.honours(c) });
  for (const [era, eraId] of ERAS) {
    const e = { went: 0, medals: 0, golds: 0 };
    for (let i = 0; i < CASE_FLEET; i += 1) {
      const o = { key: `intl9:${era}:${i}`, pos: POS[i % POS.length], arch: i, eraId, seasons: 30 };
      const go = JSON.parse(drive.driveCareer(NBA_CAREER_SPORT, { ...o, intl: 'go', intlFace: nbaIntl.NBA_CAREER_INTL }).json);
      const rest = JSON.parse(drive.driveCareer(NBA_CAREER_SPORT, { ...o, intl: 'rest', intlFace: nbaIntl.NBA_CAREER_INTL }).json);
      const stats = intl.intlStatsOf(go.intl);
      const rows = nbaIntl.NBA_CAREER_INTL.trophyRows(go);
      if (stats.tournaments > 0) e.went += 1;
      if (stats.medals > 0) { medalCareers += 1; e.medals += 1; medalsSeen += stats.medals; }
      if (stats.gold > 0) e.golds += 1;
      if (SECTIONS.has('9')) {
        const rings = NBA_CAREER_SPORT.ringsOf(go);
        check('9', tileTotal(go) === rings + caseTotal(go) + stats.medals, `${era} ${i}: the tile says ${tileTotal(go)}, the rings, the case and the medals are ${rings} + ${caseTotal(go)} + ${stats.medals}`);
        check('9', rows.reduce((n, r) => n + r.n, 0) === stats.medals, `${era} ${i}: the case's medal rows hold ${rows.reduce((n, r) => n + r.n, 0)} medals, the summers ${stats.medals}`);
        const medalYears = (go.intl?.summers ?? []).filter(r => r.went && ['gold', 'silver', 'bronze'].includes(r.place)).map(r => r.year).sort();
        check('9', JSON.stringify(rows.flatMap(r => r.years).sort()) === JSON.stringify(medalYears), `${era} ${i}: the medal rows' years are not the medal summers`);
        const labels = new Set(rows.map(r => r.label));
        check('9', hub.trophyLines(go.seasons).every(l => !labels.has(l.label) && !/gold|silver|bronze/i.test(l.label)), `${era} ${i}: a medal sits in a season's awards`);
        if (rest.intl) {
          restCareers += 1;
          check('9', tileTotal(rest) === NBA_CAREER_SPORT.ringsOf(rest) + caseTotal(rest) && !NBA_CAREER_SPORT.honours(rest).some(h => /medal/.test(h.label)), `${era} ${i}: a career that only rested has a medal on the tile`);
        }
      }
      if (SECTIONS.has('10')) {
        const earned = new Set(NBA_CAREER_SPORT.earnedBadges(go).map(b => b.id));
        const want = { intl_medal: stats.medals > 0, olympic_gold: (stats.byComp.oly?.gold ?? 0) > 0, world_cup_gold: (stats.byComp.wc?.gold ?? 0) > 0 };
        for (const id of MEDAL_BADGES) {
          check('10', earned.has(id) === want[id], `${era} ${i}: ${id} is ${earned.has(id) ? 'lit' : 'dark'} while the summers say ${want[id]}`);
          if (earned.has(id)) lit[id] += 1;
        }
        const restEarned = NBA_CAREER_SPORT.earnedBadges(rest).map(b => b.id).filter(id => MEDAL_BADGES.includes(id));
        check('10', restEarned.length === 0, `${era} ${i}: always rest lit ${restEarned.join(', ')}`);
        restLit += restEarned.length;
      }
    }
    console.log(`  ${era}: ${e.went} of ${CASE_FLEET} went at least once, ${e.medals} brought home a medal, ${e.golds} a gold`);
  }
  if (SECTIONS.has('9')) {
    check('9', medalCareers >= 20 && restCareers >= 20, `only ${medalCareers} careers with a medal and ${restCareers} that rested, so the section proves little`);
    console.log(`  section 9: ${medalCareers} careers with a medal (${medalsSeen} medals), ${restCareers} careers that only rested`);
  }
  if (SECTIONS.has('10')) {
    for (const id of MEDAL_BADGES) check('10', lit[id] > 0, `${id} is never lit in the always go fleet: a badge nobody can earn`);
    console.log(`  section 10: lit in the always go fleet: ${MEDAL_BADGES.map(id => `${id} ${lit[id]}`).join(', ')}; in the always rest fleet: ${restLit}`);
  }
  console.log(`  sections 9 and 10 took ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

/* ─── 11. the words (Round 1557) ─────────────────────────────────────────── */
/* Every capitalised word in the string literals, template text and JSX text of
   the national team's files is a nation, host or competition from the ledger,
   or one of the fixed words below. No real person is ever named there (the
   player's own name comes from his save, never from source). Comments are
   stripped first: a guard reads the code, not the prose about it. */
const WORD_FILES = [
  'src/components/us-career/IntlCallUpCard.tsx', 'src/components/us-career/IntlSummerResult.tsx',
  'src/components/us-career/TrophyCase.tsx',
  'src/lib/nbaCareerIntlGate.ts', 'src/lib/nbaCareerIntl.ts',
];
/* The new words of shared files: the region between the two anchors, both required. */
const WORD_REGIONS = [
  ['src/lib/careerBadges.ts', '/* ─── Round 1557: the medal badges', '/* ─── NFL'],
  ['src/lib/careerBadges.ts', '...intlBadges<NbaBadgeFacts>(', '...closingBadges<NbaBadgeFacts>('],
  ['src/components/us-career/UsCareerBoard.tsx', '{panel === \'trophies\' && intlOpen && intl ? (', '{/* Round 469: the peaks between the trophies.'],
  ['src/lib/nbaCareerSport.ts', '/* Round 1557: and the medals', 'roleBadge:'],
];
/* Measured 2026-10-29 on Round 1557's head: 156 capitalised words read in 10 sources, every one of them a ledger
   word or one of these. Each is a game word (a sentence's first word, a round, a medal, a label), FIBA and the NBA
   (bodies, not people), and SUSPENDED, a season result the gate compares against. */
const FIXED_WORDS = new Set([
  'The', 'You', 'Your', 'Back', 'Continue', 'Go', 'Rest', 'Gold', 'Silver', 'Bronze', 'Olympic', 'International', 'Record',
  'US', 'A', 'No', 'In', 'If', 'It', 'This', 'Every', 'Nothing', 'Past', 'Example', 'Called', 'Resting', 'Tournaments',
  'Groups', 'Group', 'Round', 'Quarter', 'Semi', 'Final', 'Fourth', 'Out', 'Champion', 'Host', 'R', 'QF', 'SF', 'W', 'L', 'OT',
  'Trophy', 'Case', 'Medal', 'Hall', 'Fame', 'MVPs', 'All', 'Star', 'NBA', 'FIBA', 'SUSPENDED',
]);
/* The text a reader can see in a source: string literals, template text (not its ${} code) and JSX text. */
function visibleText(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  const readQuoted = q => { let s = ''; i += 1; while (i < n && src[i] !== q) { if (src[i] === '\\') { s += src[i + 1] ?? ''; i += 2; continue; } s += src[i]; i += 1; } i += 1; return s; };
  function code(stopAtBrace) {
    let depth = 0;
    let jsx = '';
    while (i < n) {
      const c = src[i];
      const d = src[i + 1];
      if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i += 1; continue; }
      if (c === '/' && d === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? n : end + 2; continue; }
      if (c === '\'' || c === '"') { out.push(readQuoted(c)); continue; }
      if (c === '`') {
        i += 1; let s = '';
        while (i < n && src[i] !== '`') {
          if (src[i] === '\\') { s += src[i + 1] ?? ''; i += 2; continue; }
          if (src[i] === '$' && src[i + 1] === '{') { out.push(s); s = ' '; i += 2; code(true); continue; }
          s += src[i]; i += 1;
        }
        i += 1; out.push(s); continue;
      }
      if (c === '{') depth += 1;
      if (c === '}') { if (stopAtBrace && depth === 0) { i += 1; return; } depth -= 1; }
      /* JSX text: what sits between the > that closes a tag and the next < or {, when it reads as words, not
         code. A tag's > follows a name, a quote, a brace or a slash, never a space or = (a comparison, an arrow).
         The text is stepped over, so an apostrophe in it ("this career's own") is never read as a quote. Text
         goes on after an expression ("for {editionLabel}. You're {age} that summer."), so a } starts a run too. */
      if ((c === '>' && i > 0 && /[A-Za-z0-9"'}/]/.test(src[i - 1])) || c === '}') {
        jsx = ''; let j = i + 1;
        while (j < n && src[j] !== '<' && src[j] !== '{' && src[j] !== '}' && !(src[j] === '/' && (src[j + 1] === '/' || src[j + 1] === '*'))) { jsx += src[j]; j += 1; }
        if (/[A-Za-z]/.test(jsx) && !/[;=()[\]]/.test(jsx) && !/\b(export|import|interface|const|let|function|type|extends|return)\b/.test(jsx)) { out.push(jsx); i = j; continue; }
      }
      i += 1;
    }
  }
  code(false);
  /* module paths and class lists are not words a reader sees */
  return out.filter(s => !/^[@.]?\.?\//.test(s) && !/^@\//.test(s));
}
/* a word, without its "'s" or "'re": "FIBA's" is FIBA, "You're" is You */
const capitalised = text => text.match(/\b[A-Z][A-Za-z]*/g) ?? [];
if (SECTIONS.has('11')) {
  console.log('section 11: the words of the national team\'s files');
  const ledgerWords = new Set();
  for (const r of data.BASKETBALL_INTL_EDITIONS) {
    for (const s of [r[3], r[4], ...(r[6] ?? [])]) for (const w of capitalised(String(s ?? ''))) ledgerWords.add(w);
  }
  const allowed = w => ledgerWords.has(w) || FIXED_WORDS.has(w);
  const sources = [];
  for (const f of WORD_FILES) sources.push([f, fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n')]);
  for (const [f, from, to] of WORD_REGIONS) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
    const a = s.indexOf(from); const b = a < 0 ? -1 : s.indexOf(to, a + from.length);
    check('11', a >= 0 && b > a && s.split(from).length === 2, `${f}: the region "${from.slice(0, 40)}" is not there once with its end after it`);
    if (a >= 0 && b > a) sources.push([`${f} (Round 1557's region)`, s.slice(a, b)]);
  }
  if (CONTROL === 'realname') {
    const k = sources.findIndex(([f]) => f.endsWith('IntlSummerResult.tsx'));
    const anchor = '<h3 className="text-lg font-black tracking-tight">🌍 International</h3>';
    if (k < 0 || sources[k][1].split(anchor).length !== 2) { console.error('control realname cannot run: the International heading is not in IntlSummerResult.tsx once'); process.exit(2); }
    const before = sources[k][1];
    sources[k][1] = before.replace(anchor, `${anchor}\n<p>Kevin Durant welcomes you to the national team.</p>`);
    mustChange('the view', before, sources[k][1]);
  }
  let words = 0;
  const strays = new Map();
  for (const [f, src] of sources) {
    for (const t of visibleText(src)) {
      for (const w of capitalised(t)) {
        words += 1;
        if (!allowed(w)) strays.set(w, [...(strays.get(w) ?? []), [f, t.trim().slice(0, 70)]]);
      }
    }
  }
  if (process.env.INTL_WORDS_LIST) console.log(`  strays: ${[...strays.keys()].join(' ')}`);
  for (const [w, at] of strays) check('11', false, `"${w}" in ${[...new Set(at.map(x => x[0]))].join(', ')} ("${at[0][1]}") is no nation, host or competition of the ledger and no fixed word`);
  check('11', words >= 100, `only ${words} capitalised words were read, so the section proves little`);
  console.log(`  ${words} capitalised words read in ${sources.length} sources, ${ledgerWords.size} ledger words, ${FIXED_WORDS.size} fixed words, ${strays.size} strays`);
}

/* ─── summary ────────────────────────────────────────────────────────────── */
const reds = [...failed.entries()].map(([s, n]) => `section ${s}: ${n}`);
if (CONTROL) {
  const fired = failed.has(CONTROLS[CONTROL].section);
  console.log(`simCareerIntl: control ${CONTROL} ${fired ? 'FIRED' : 'DID NOT FIRE'} (section ${CONTROLS[CONTROL].section}${fired ? `, ${failed.get(CONTROLS[CONTROL].section)} failures` : ' stayed green'})`);
  process.exit(fired ? 1 : 3);
}
console.log(reds.length ? `simCareerIntl: RED, ${checks} checks, ${reds.join(', ')}` : `simCareerIntl: GREEN, ${checks} checks over sections ${[...SECTIONS].join(',')}`);
process.exit(reds.length ? 1 : 0);
