/* Every Soccer Career era window is reachable, and every league it names is real.

   Round 302, off the owner's 2026-08-26 tweaks document: more leagues (he
   named Liga Portugal, Eredivisie, Scottish, MLS, Saudi, K League) and more
   eras (he named 2015/16, 2010/11, 05/06 starts). The engine had modeled
   eight half decade windows all along while the picker exposed four decade
   starts, and the era title race knew five leagues. This harness pins the
   expansion so neither can silently shrink or drift:

   1. eight contiguous windows covering 1990 to 2029, every one reachable
      from the creation screen picker (parsed from the page source, so a
      picker edit that strands a window goes red);
   2. every window carries the full league key set, minus two pinned
      founding exemptions (MLS before its 1996 kickoff, K League before
      2010) that cannot quietly grow;
   3. league keys are byte identical to FALLBACK_CLUBS league labels, so
      the phone feed's champion headlines and the Ballon d'Or honours
      lookup can never miss on a near duplicate string;
   4. each owner named league has real playable depth (3+ clubs) in
      FALLBACK_CLUBS, and a 1990 season contains no MLS club, proving the
      founded after table holds for the league that did not exist yet.

   6. Round 1024: every era star (the Ballon d'Or field and the world feed,
      163 real players plus the reigning winner) is pinned to the season by
      season ledger in scripts/data/careerEraStarsVerified2026-10/: his
      club and nationality must equal the ledger row, the row's club must
      follow from its own seasons by the stated rule (most seasons of the
      window, a split season half to each club, a tie keeps the game's club
      if tied, else the middle season's, else the later club; 2025-2029 is
      the 2026-27 club), every row carries two sources and none of them is
      Wikipedia, the chosen club holds at least one season backed by two
      hosts, and the 2025-2029 window agrees with the verified 2026 overlay
      on every name both carry. Exact pins, so there is no band to measure.

   Negative controls, each asserting the text it mutates exists first (the
   simPrerender house rule) and each required to raise its own failure, not
   just any failure:
     SIM_CAREER_ERAS_CONTROL=drop    one window's "Primeira Liga" key deleted
     SIM_CAREER_ERAS_CONTROL=club    Salah's 2025-2029 club put back to Liverpool
     SIM_CAREER_ERAS_CONTROL=derive  one ledger season of Matthaeus flipped, so
                                     the ledger's club no longer follows

   Run: node scripts/simCareerEras.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const failMsgs = [];
const fail = m => { failures += 1; failMsgs.push(m); console.error('  FAIL: ' + m); };
const CONTROL_MODE = process.env.SIM_CAREER_ERAS_CONTROL || '';
/* Source controls edit a copy of careerEras.ts; derive edits the ledger in
   memory. expect is the failure each one must raise. */
const CONTROLS = {
  drop: { needle: '"Primeira Liga": ["Porto", "Benfica", "Sporting CP"],', replace: '', expect: /missing "Primeira Liga"/ },
  club: { needle: 'S("Mohamed Salah", "Egypt", "RW", "Trabzonspor",', replace: 'S("Mohamed Salah", "Egypt", "RW", "Liverpool",', expect: /Mohamed Salah.*"Liverpool"/ },
  derive: { expect: /Lothar Matthäus.*does not follow/ },
};
if (CONTROL_MODE && !CONTROLS[CONTROL_MODE]) { console.error(`unknown SIM_CAREER_ERAS_CONTROL "${CONTROL_MODE}"`); process.exit(1); }
const CONTROL = Boolean(CONTROL_MODE);

const ENTRY = path.join(os.tmpdir(), 'careerEras.entry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'careerEras.bundle.mjs');
let erasPath = `${ROOT}/src/lib/careerEras.ts`;
if (CONTROL && CONTROLS[CONTROL_MODE].needle) {
  const { needle, replace } = CONTROLS[CONTROL_MODE];
  const src = fs.readFileSync(erasPath, 'utf8');
  if (!src.includes(needle)) { console.error('control run: the text the control edits is not in the source, refusing to run a dead control'); process.exit(1); }
  erasPath = path.join(os.tmpdir(), 'careerEras.control.ts');
  /* The copy lives outside src, so its relative imports are pointed back at
     src/lib or the bundle cannot resolve them. */
  const libDir = `${ROOT.replaceAll('\\', '/')}/src/lib/`;
  fs.writeFileSync(erasPath, src.replace(needle, replace).replaceAll('from "./', `from "${libDir}`));
}
fs.writeFileSync(ENTRY, `
export { ERA_DEFS, eraDefFor, adjustClubsForYear } from '${erasPath.replaceAll('\\', '/')}';
export { FALLBACK_CLUBS } from '${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerEngine.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { ERA_DEFS, eraDefFor, adjustClubsForYear, FALLBACK_CLUBS } = await import(pathToFileURL(BUNDLE).href);

console.log('1) eight contiguous windows, 1990 to 2029');
{
  if (ERA_DEFS.length !== 8) fail(`${ERA_DEFS.length} era windows, expected 8`);
  const sorted = [...ERA_DEFS].sort((a, b) => a.from - b.from);
  if (sorted[0].from !== 1990) fail(`first window starts ${sorted[0].from}, expected 1990`);
  if (sorted[sorted.length - 1].to !== 2029) fail(`last window ends ${sorted[sorted.length - 1].to}, expected 2029`);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].from !== sorted[i - 1].to + 1) fail(`gap or overlap between windows ending ${sorted[i - 1].to} and starting ${sorted[i].from}`);
  }
  console.log(`   ${ERA_DEFS.length} windows, ${sorted[0].from} to ${sorted[sorted.length - 1].to}, contiguous`);
}

console.log('2) every window carries the full league set, minus the two pinned founding exemptions');
{
  /* The canonical set comes from the newest window, where everything exists. */
  const last = [...ERA_DEFS].sort((a, b) => a.from - b.from)[ERA_DEFS.length - 1];
  const canonical = Object.keys(last.leagues);
  if (canonical.length < 11) fail(`the newest window has only ${canonical.length} league keys, the Round 302 expansion expected 12`);
  /* league -> the first year the game can name it honestly; a window that
     ends before that may omit the league, everything else must carry it.
     The pins below then fix the exact absence lists in both directions. */
  const EXEMPT_BEFORE = { 'MLS': 1996, 'K League 1': 2010 };
  for (const era of ERA_DEFS) {
    for (const key of canonical) {
      const present = Object.prototype.hasOwnProperty.call(era.leagues, key);
      const exemptFrom = EXEMPT_BEFORE[key];
      const exempt = exemptFrom !== undefined && era.to < exemptFrom;
      if (!present && !exempt) fail(`${era.from}-${era.to} is missing "${key}" and has no founding exemption`);
    }
    for (const key of Object.keys(era.leagues)) {
      if (!canonical.includes(key)) fail(`${era.from}-${era.to} has key "${key}" the newest window does not, a drifted or misspelled league`);
      const list = era.leagues[key];
      if (list.length < 3) fail(`${era.from}-${era.to} "${key}" has only ${list.length} contenders, floor is 3`);
      if (new Set(list).size !== list.length) fail(`${era.from}-${era.to} "${key}" repeats a contender`);
    }
  }
  /* Pin the exemptions exactly so they cannot quietly grow. */
  const missingMls = ERA_DEFS.filter(e => !e.leagues['MLS']).map(e => e.from).sort();
  if (missingMls.join(',') !== '1990') fail(`MLS is absent from windows starting [${missingMls}], expected only 1990`);
  const missingK = ERA_DEFS.filter(e => !e.leagues['K League 1']).map(e => e.from).sort();
  if (missingK.join(',') !== '1990,1995,2000,2005') fail(`K League 1 is absent from windows starting [${missingK}], expected 1990 through 2005`);
  console.log(`   ${canonical.length} canonical leagues, exemptions pinned: MLS before 1996, K League 1 before 2010`);
}

console.log('3) era league keys match FALLBACK_CLUBS labels byte for byte');
{
  const labels = new Set(FALLBACK_CLUBS.map(c => c.league));
  const keys = new Set(ERA_DEFS.flatMap(e => Object.keys(e.leagues)));
  for (const key of keys) {
    if (!labels.has(key)) fail(`era league "${key}" matches no FALLBACK_CLUBS league label, headlines and honours will never attach to a playable club`);
  }
  /* The near miss detector: two labels that differ only by case or spacing
     are one league typed twice. */
  const fold = s => s.toLowerCase().replace(/\s+/g, ' ');
  const seen = new Map();
  for (const l of [...labels, ...keys]) {
    const f = fold(l);
    if (seen.has(f) && seen.get(f) !== l) fail(`"${seen.get(f)}" and "${l}" differ only by case or spacing, one league typed twice`);
    seen.set(f, l);
  }
  console.log(`   ${keys.size} era league keys, all present among ${labels.size} club labels, no near duplicates`);
}

console.log('4) the creation picker reaches every window');
{
  const page = fs.readFileSync(`${ROOT}/src/pages/SoccerCareer.tsx`, 'utf8');
  const rows = [...page.matchAll(/\{ value: "([^"]+)", label: "([^"]+)", startYear: (\d+) \}/g)]
    .map(m => ({ value: m[1], label: m[2], startYear: Number(m[3]) }));
  if (rows.length !== 8) fail(`picker has ${rows.length} era rows, expected 8`);
  if (new Set(rows.map(r => r.value)).size !== rows.length) fail('picker era values repeat');
  const reached = new Set(rows.map(r => eraDefFor(r.startYear).from));
  if (reached.size !== ERA_DEFS.length) {
    const stranded = ERA_DEFS.filter(e => !reached.has(e.from)).map(e => `${e.from}-${e.to}`);
    fail(`picker reaches ${reached.size} of ${ERA_DEFS.length} windows; stranded: ${stranded.join(', ')}`);
  }
  for (const want of [2005, 2010, 2015]) {
    if (!rows.some(r => r.startYear === want)) fail(`no ${want} start in the picker, the tweaks document asked for it by name`);
  }
  console.log(`   ${rows.length} picker rows reach all ${ERA_DEFS.length} windows, 2005/2010/2015 starts present`);
}

console.log('5) the owner named leagues have playable depth, and 1990 has no MLS');
{
  for (const league of ['Primeira Liga', 'Eredivisie', 'Scottish Premiership', 'MLS', 'Saudi Pro League', 'K League 1']) {
    const n = FALLBACK_CLUBS.filter(c => c.league === league).length;
    if (n < 3) fail(`"${league}" has ${n} playable clubs, the depth pass floor is 3`);
  }
  const in1990 = adjustClubsForYear(FALLBACK_CLUBS, 1990).filter(c => c.league === 'MLS');
  if (in1990.length > 0) fail(`a 1990 season offers MLS clubs (${in1990.map(c => c.name).join(', ')}), the league started in 1996`);
  const now = adjustClubsForYear(FALLBACK_CLUBS, 2026).filter(c => c.league === 'MLS').length;
  if (now < 5) fail(`only ${now} MLS clubs exist in 2026, the founded after entries cut too deep`);
  console.log(`   six named leagues at 3+ clubs, MLS empty in 1990 and ${now} strong in 2026`);
}

console.log('6) every era star is pinned to the season by season ledger');
{
  const LEDGER_DIR = `${ROOT}/scripts/data/careerEraStarsVerified2026-10`;
  const rows = ['eras-1990-1999', 'eras-2000-2014', 'eras-2015-2029']
    .flatMap(f => JSON.parse(fs.readFileSync(`${LEDGER_DIR}/${f}.json`, 'utf8')).rows);
  if (CONTROL_MODE === 'derive') {
    const row = rows.find(r => r.window === '1990-1994' && r.name === 'Lothar Matthäus');
    if (!row || row.seasons['1994-95'] !== 'Bayern Munich') { console.error('control run: the ledger season the control flips is not there, refusing to run a dead control'); process.exit(1); }
    row.seasons['1994-95'] = 'Inter Milan';
  }
  const HOST_KEYS = ['sm', 'nft', 'rsssf', 'fsq', 'uefa', 'espn', 'overlay', 'psv.nl', 'saopaulofc.net', 'fcbarcelona.com'];
  const hostCount = h => new Set((h || '').replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(k => HOST_KEYS.includes(k))).size;
  const seasonKeys = def => Array.from({ length: def.to - def.from + 1 }, (_, i) => `${def.from + i}-${String((def.from + i + 1) % 100).padStart(2, '0')}`);
  /* The rule the ledger's about text states, recomputed so the club is
     derived from the seasons, never typed beside them. */
  const derive = (row, def) => {
    const keys = seasonKeys(def);
    if (def.from === 2025) return row.seasons['2026-27'];
    const tally = new Map();
    keys.forEach((k, i) => {
      const parts = row.seasons[k] ? row.seasons[k].split(' / ') : [];
      for (const p of parts) {
        const t = tally.get(p) || { n: 0, last: -1 };
        tally.set(p, { n: t.n + 1 / parts.length, last: i });
      }
    });
    const max = Math.max(...[...tally.values()].map(t => t.n));
    const tied = [...tally].filter(([, t]) => Math.abs(t.n - max) < 1e-9).map(([c]) => c);
    if (tied.length === 1) return tied[0];
    if (tied.includes(row.game)) return row.game;
    const mid = (row.seasons[keys[Math.floor(keys.length / 2)]] || '').split(' / ').find(c => tied.includes(c));
    if (mid) return mid;
    return tied.sort((a, b) => tally.get(b).last - tally.get(a).last)[0];
  };
  const matched = new Set();
  let stars = 0;
  for (const def of ERA_DEFS) {
    const keys = seasonKeys(def);
    for (const star of def.stars) {
      stars += 1;
      const row = rows.find(r => r.window === `${def.from}-${def.to}` && r.name === star.name);
      if (!row) { fail(`${def.from}-${def.to} ${star.name} has no ledger row, an unverified real player in the field`); continue; }
      matched.add(row);
      if (star.club !== row.club) fail(`${def.from}-${def.to} ${star.name}: the game has club "${star.club}", the ledger says "${row.club}"`);
      if (star.nationality !== row.nationality) fail(`${def.from}-${def.to} ${star.name}: the game has nationality "${star.nationality}", the ledger says "${row.nationality}"`);
      if (Object.keys(row.seasons).join() !== keys.join()) fail(`${def.from}-${def.to} ${star.name}: ledger seasons ${Object.keys(row.seasons).join()} are not the window's`);
      const want = derive(row, def);
      if (want !== row.club) fail(`${def.from}-${def.to} ${star.name}: ledger club "${row.club}" does not follow from its seasons, the rule gives "${want}"`);
      if (!Array.isArray(row.sources) || row.sources.length < 2) fail(`${def.from}-${def.to} ${star.name}: fewer than two sources`);
      if ((row.sources || []).some(u => /wikipedia\.org/i.test(u))) fail(`${def.from}-${def.to} ${star.name}: Wikipedia cited as a source`);
      const backed = keys.filter(k => (row.seasons[k] || '').split(' / ').includes(row.club) && hostCount(row.hosts[k]) >= 2);
      if (backed.length === 0) fail(`${def.from}-${def.to} ${star.name}: no season at "${row.club}" is backed by two hosts`);
    }
  }
  for (const r of rows) if (!matched.has(r)) fail(`ledger row ${r.window} ${r.name} matches no star in ERA_DEFS`);
  /* The current window against the repo's own verified 2026 record. */
  const { TRANSFER_OVERLAY_2026 } = await import(pathToFileURL(`${ROOT}/scripts/transferOverlay2026.mjs`).href);
  const now = ERA_DEFS.find(d => d.from === 2025);
  let overlaid = 0;
  for (const star of now.stars) {
    const move = TRANSFER_OVERLAY_2026.find(m => m.name === star.name);
    if (!move || !move.to) continue;
    overlaid += 1;
    if (move.to !== star.club) fail(`2025-2029 ${star.name}: the game has "${star.club}", the verified 2026 overlay has "${move.to}"`);
  }
  if (overlaid < 3) fail(`only ${overlaid} current window stars found in the 2026 overlay, expected Rodri, Salah and Endrick at least`);
  const corrected = rows.filter(r => r.status === 'corrected').length;
  console.log(`   ${stars} star lines, ${rows.length} ledger rows, every club derived from its seasons (${corrected} corrected from the old table), ${overlaid} current stars agree with the 2026 overlay`);
}

if (CONTROL) {
  if (failMsgs.some(m => CONTROLS[CONTROL_MODE].expect.test(m))) { console.log(`\ncontrol run (${CONTROL_MODE}): ${failures} failure(s) fired as expected`); process.exit(0); }
  console.error(`\ncontrol run (${CONTROL_MODE}): the mutation did not raise its own failure, the check is dead`);
  process.exit(1);
}
console.log('   teeth: exemptions pinned by exact window list, picker parsed from page source, labels byte compared');
if (failures > 0) { console.error(`\nsimCareerEras: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimCareerEras: all green');
