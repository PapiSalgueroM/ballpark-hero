/**
 * Round 199 harness: nobody invented on this site wears a real person's name.
 *
 * Round 197 built the guarded pools for the international elevens after
 * finding that the soccer career engine could mint Mohamed Salah as a
 * generated contender. That fixed two generators. This file finishes the
 * job for the whole site: every remaining name generator is enumerated in
 * full and checked against every real player name the project ships.
 *
 * What that turned up: Club Manager's youth academy could produce Noah
 * Okafor and Diego Costa, two men who exist, as kids in your own squad.
 * Both surnames left the bank in this round.
 *
 * The rule this file enforces, forever:
 *
 *   1. EVERY generator is registered here. A scan of src/lib finds name
 *      banks by shape, so a new generator that forgets to register fails
 *      the suite rather than shipping unchecked.
 *   2. EVERY combination a generator can produce is enumerated. These are
 *      small closed sets on purpose (a few hundred each), so the check is
 *      exhaustive, not a sample.
 *   3. NONE of them may equal a real player's name, where "real" means any
 *      name shipped in src/data (the harvest reads about 8,500 of them) or
 *      any of the 5,622 real players baked into the Club Manager worlds.
 *
 * Run: node scripts/simInventedNames.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf-8');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const BUNDLE_WORLDS = '/tmp/inv.bundle.mjs';

/* Every generator on the site: file, first-name bank, surname bank, and
   what it invents. Add a row when you add a generator; section 4 checks
   that nothing is missing. */
const GENERATORS = [
  { file: 'src/lib/cfbDynasty.ts', first: 'FIRST', last: 'LAST', what: 'college football recruits' },
  { file: 'src/lib/cbbDynasty.ts', first: 'FIRST', last: 'LAST', what: 'college basketball recruits' },
  { file: 'src/lib/frontOffice.ts', first: 'FIRST', last: 'LAST', what: 'GM game draft classes' },
  { file: 'src/lib/careerRival.ts', first: 'FIRST', last: 'LAST', what: 'career rivals' },
  { file: 'src/lib/clubManager.ts', first: 'YOUTH_FIRST', last: 'YOUTH_LAST', what: 'academy kids' },
  { file: 'src/lib/clubManager.ts', first: 'SCOUT_FIRST', last: 'SCOUT_LAST', what: 'scouts' },
  /* Runtime-guarded: makeGeneratedName re-rolls the surname until the pair
     is not a real player, so its raw cross-product legitimately contains
     collisions (Bruno + Fernandes among them) that it can never emit.
     Section 2b calls the real function instead of multiplying the banks. */
  { file: 'src/lib/clubManagerEras.ts', first: 'GEN_FIRST', last: 'GEN_LAST', what: 'era world filler', guarded: true },
  { file: 'src/lib/mlbFrontOffice.ts', first: 'FA_FIRST', last: 'FA_LAST', what: 'MLB free agents' },
  { file: 'src/lib/nbaFrontOffice.ts', first: 'FA_FIRST', last: 'FA_LAST', what: 'NBA free agents' },
  { file: 'src/lib/nhlFrontOffice.ts', first: 'FA_FIRST', last: 'FA_LAST', what: 'NHL free agents' },
];

const bankOf = (src, name) => {
  const m = src.match(new RegExp(`const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map(x => x[1] ?? x[2]);
};

/* ---------- 1. The real-name universe ---------- */
console.log('1) Harvesting every real player name the site ships');
const real = new Set();
{
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) {
        const t = fs.readFileSync(p, 'utf-8');
        for (const m of t.matchAll(/\b(?:name|n|player|playerName):\s*'([A-Z][^']{2,40})'/g)) real.add(m[1]);
        for (const m of t.matchAll(/\b(?:name|n|player|playerName):\s*"([A-Z][^"]{2,40})"/g)) real.add(m[1]);
      }
    }
  };
  walk(path.join(ROOT, 'src/data'));
  /* Plus the baked Club Manager worlds, through the bundler, because their
     nationality map is the canonical list of real footballers here. */
  const ENTRY = '/tmp/invEntry.mjs';
  const BUNDLE = BUNDLE_WORLDS;
  fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export { NATIONALITY_BY_WORLD } from '${ROOT}/src/data/playerNationalities.ts';
export { allIntlNames } from '${ROOT}/src/lib/intlNames.ts';
`);
  execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
  const { NATIONALITY_BY_WORLD, allIntlNames } = await import(BUNDLE);
  for (const world of Object.values(NATIONALITY_BY_WORLD)) for (const n of Object.keys(world)) real.add(n);
  globalThis.__intl = allIntlNames();
  if (real.size < 8000) fail(`only ${real.size} real names harvested, the check is not checking much`);
  console.log(`   ${real.size} real names, from src/data and the four sealed worlds`);
}

/* ---------- 2. Every generator, every combination ---------- */
console.log('2) Every combination of every generator, against all of them');
{
  let total = 0;
  for (const g of GENERATORS) {
    if (g.guarded) continue;
    const src = read(g.file);
    const firsts = bankOf(src, g.first);
    const lasts = bankOf(src, g.last);
    if (!firsts || !lasts || !firsts.length || !lasts.length) {
      fail(`${g.file}: could not read ${g.first} x ${g.last}, the generator may have been rewritten`);
      continue;
    }
    const combos = [];
    for (const a of firsts) for (const b of lasts) combos.push(`${a} ${b}`);
    total += combos.length;
    const hits = combos.filter(n => real.has(n));
    if (hits.length) {
      fail(`${g.what} (${g.file}) can be named after real players: ${hits.slice(0, 6).join(' | ')}`);
    }
    /* The free agent banks are ten by ten on purpose: a handful of names
       per offseason, not a population. A hundred is the floor. */
    if (combos.length < 100) fail(`${g.what}: only ${combos.length} possible names, repeats would be constant`);
  }
  /* And the Round 197 pools, so one harness owns the whole rule. */
  const intl = globalThis.__intl ?? [];
  if (intl.length < 4000) fail(`the international pools enumerated ${intl.length} names`);
  const intlHits = intl.filter(n => real.has(n));
  if (intlHits.length) fail(`international pools collide: ${intlHits.slice(0, 6).join(' | ')}`);
  total += intl.length;
  console.log(`   ${total} invented names across ${GENERATORS.length} generators plus the international pools, 0 belong to anybody real`);
}

/* ---------- 2b. The runtime-guarded generator, exercised ---------- */
console.log('2b) The era filler re-rolls its way past every real name');
{
  const ENTRY = '/tmp/eraNameEntry.mjs';
  const BUNDLE = '/tmp/eraName.bundle.mjs';
  fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export { makeGeneratedName } from '${ROOT}/src/lib/clubManagerEras.ts';
`);
  execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
  const { makeGeneratedName } = await import(BUNDLE);
  const seen = new Set();
  let hits = 0;
  for (let i = 0; i < 20000; i++) {
    const n = makeGeneratedName(`probe-${i}`);
    seen.add(n);
    if (real.has(n)) { if (hits < 5) fail(`the era filler emitted a real player: ${n}`); hits += 1; }
  }
  if (seen.size < 500) fail(`20,000 rolls produced only ${seen.size} distinct names`);
  /* The static half of the same question: which pairings could this
     generator still emit, and is any of them real ANYWHERE on the site? The
     runtime blocklist is built from Club Manager rosters only, so five
     names (an NFL centre, an NHL defenceman, an MLB infielder, a Danish
     midfielder, a Brazilian defender) had to be listed explicitly in
     ALSO_REAL_ELSEWHERE. This recomputes that list from the data so it can
     never fall behind. */
  const eraSrc = read('src/lib/clubManagerEras.ts');
  const eraFirst = bankOf(eraSrc, 'GEN_FIRST') ?? [];
  const eraLast = bankOf(eraSrc, 'GEN_LAST') ?? [];
  const listed = new Set([...(eraSrc.match(/const ALSO_REAL_ELSEWHERE[^=]*=\s*\[([\s\S]*?)\];/) ?? [,''])[1].matchAll(/'([^']+)'/g)].map(m => m[1]));
  const cmWorlds = new Set();
  {
    const { NATIONALITY_BY_WORLD } = await import(BUNDLE_WORLDS);
    for (const w of Object.values(NATIONALITY_BY_WORLD)) for (const n of Object.keys(w)) cmWorlds.add(n);
  }
  const uncovered = [];
  for (const a of eraFirst) for (const b of eraLast) {
    const n = `${a} ${b}`;
    if (real.has(n) && !cmWorlds.has(n) && !listed.has(n)) uncovered.push(n);
  }
  if (uncovered.length) {
    fail(`the era filler can emit real people the roster guard cannot see: ${uncovered.slice(0, 8).join(' | ')}. Add them to ALSO_REAL_ELSEWHERE.`);
  }
  console.log(`   20,000 rolls, ${seen.size} distinct invented names, ${hits} real ones; ${eraFirst.length}x${eraLast.length} pairings checked against the whole site, ${listed.size} listed, ${uncovered.length} uncovered`);
}

/* ---------- 3. A generated name is never mistaken for a real one ---------- */
console.log('3) The two banks that were caught stay caught');
{
  /* Regression pins for the exact names this round removed. Named on
     purpose: a future edit that reintroduces either surname alongside its
     first name fails here with the reason attached. */
  const cm = read('src/lib/clubManager.ts');
  const youthLast = bankOf(cm, 'YOUTH_LAST') ?? [];
  const youthFirst = bankOf(cm, 'YOUTH_FIRST') ?? [];
  if (youthFirst.includes('Noah') && youthLast.includes('Okafor')) fail('the academy can name a kid Noah Okafor again');
  if (youthFirst.includes('Diego') && youthLast.includes('Costa')) fail('the academy can name a kid Diego Costa again');
  /* And the Round 197 pair. */
  const intlSrc = read('src/lib/intlNames.ts');
  /* Read the BANK, not the file: the comment above it explains the removal
     by naming the surname, and matching raw text flagged that explanation. */
  const hispanic = intlSrc.match(/id: 'hispanic'[\s\S]*?lasts: \[([^\]]*)\]/);
  if (hispanic && /'Ledesma'/.test(hispanic[1])) fail('the hispanic pool can produce Cristian Ledesma again');
  const engine = read('src/lib/soccerCareerEngine.ts');
  for (const banned of ['GEN_FIRST_NAMES', 'GEN_LAST_NAMES', 'RIVAL_FIRST_NAMES', 'RIVAL_LAST_NAMES']) {
    if (engine.includes(`const ${banned}`)) fail(`${banned} is back, that bank could mint Mohamed Salah`);
  }
}

/* ---------- 4. No generator escapes the register ---------- */
console.log('4) A new generator cannot ship unregistered');
{
  const registered = new Set(GENERATORS.map(g => `${g.file}::${g.first}`));
  const found = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) {
        const rel = path.relative(ROOT, p);
        const t = fs.readFileSync(p, 'utf-8');
        for (const m of t.matchAll(/const ([A-Z_]*FIRST[A-Z_]*)\s*(?::[^=]+)?=\s*\[/g)) {
          found.push(`${rel}::${m[1]}`);
        }
      }
    }
  };
  walk(path.join(ROOT, 'src/lib'));
  const strays = found.filter(f => !registered.has(f));
  if (strays.length) {
    fail(`name banks with nobody checking them: ${strays.join(' | ')}. Register them in GENERATORS or route them through intlNames.`);
  }
  console.log(`   ${found.length} banks in src/lib, all registered`);
}

/* ---------- 5. Copy discipline ---------- */
console.log('5) No em or en dash in the banks');
{
  const DASHES = /[\u2013\u2014]/; /* by codepoint, the simEras convention */
  for (const g of GENERATORS) {
    const src = read(g.file);
    for (const bank of [g.first, g.last]) {
      const names = bankOf(src, bank) ?? [];
      for (const n of names) if (DASHES.test(n)) fail(`${g.file} ${bank}: dash in "${n}"`);
    }
  }
}

/* ---------- 6. Round 206: and no two of them share a name ---------- */
console.log('6) No two men on the same team are called the same thing');
{
  /* The sibling of the rule this file was built for. Round 199 stopped an
     invented man carrying a REAL person's name; this stops him carrying
     ANOTHER INVENTED man's name on the same team, which was happening and
     was visible: a thin club ships a squad of sixteen academy kids, the
     bank held 400 combinations, and the birthday problem does the rest.
     Measured before the fix: about ONE DAY ONE SQUAD IN FIVE at Kifisia or
     Volos contained two men with identical names and identical "(Youth)"
     suffixes, indistinguishable when picking an eleven or selling one.
     Fixed by a hard uniqueness guard, with the bank widened from 400 to
     1,296 so the guard rarely has to do anything. */
  const ENTRY = '/tmp/dupeNameEntry.mjs';
  const BUNDLE = '/tmp/dupeName.bundle.mjs';
  fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${ROOT}/src/lib/clubManager.ts';
`);
  execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
  const cmEngine = await import(BUNDLE);

  const dupesIn = list => {
    const counts = new Map();
    for (const n of list) counts.set(n, (counts.get(n) ?? 0) + 1);
    return [...counts.entries()].filter(([, c]) => c > 1).map(([n, c]) => `${n} x${c}`);
  };

  /* The two clubs that ship fully youth-padded squads, plus a normal club
     as the control. */
  let padded = 0, squadsChecked = 0;
  for (const club of ['Kifisia', 'Volos', 'Everton']) {
    for (let i = 0; i < 25; i += 1) {
      let st;
      try { st = cmEngine.startCareer(club); } catch (e) { fail(`${club} would not start: ${e.message}`); break; }
      squadsChecked += 1;
      padded += st.squad.filter(p => p.isYouth).length;
      const d = dupesIn(st.squad.map(p => p.name));
      if (d.length) fail(`${club} day one: two men called the same thing (${d.join(', ')})`);
    }
  }

  /* And across seasons, where the summer intake, the academy and the
     scouting network all add names to a squad that already has some. */
  let seasons = 0, playersSeen = 0;
  for (let career = 0; career < 3; career += 1) {
    let st = cmEngine.startCareer('Everton');
    for (let season = 0; season < 3; season += 1) {
      let guard = 0;
      while (guard < 260) {
        guard += 1;
        const res = cmEngine.playNextEntry(st, { skipHalftime: true });
        st = res.state;
        /* Squad and academy books together: a scouted boy who shares a name
           with a first teamer is the same bug wearing a different shirt. */
        const all = [...st.squad.map(p => p.name), ...(st.academy?.prospects ?? []).map(p => p.name)];
        const d = dupesIn(all);
        if (d.length) { fail(`season ${season}: two men called the same thing (${d.join(', ')})`); guard = 999; break; }
        if (st.pendingSummary || res.kind === 'seasonEnd' || res.kind === 'seasonOver') break;
      }
      playersSeen += st.squad.length;
      seasons += 1;
      try {
        const fin = cmEngine.finishSeason(st);
        st = cmEngine.startNextSeason(fin.state ?? fin);
      } catch { break; }
      if (st.sacked) break;
    }
  }

  /* The guard itself is in the source, not just its effect, so a future
     tidy cannot delete it and pass on luck alone. */
  const cmSrc = read('src/lib/clubManager.ts');
  if (!/function uniqueYouthName\(/.test(cmSrc)) fail('the youth name uniqueness guard is gone');
  if (!/makeYouth\(position: Position, minRating = 55, maxRating = 68, taken: Set<string>/.test(cmSrc)) {
    fail('makeYouth no longer takes the name book');
  }
  if (/`\$\{pick\(YOUTH_FIRST\)\} \$\{pick\(YOUTH_LAST\)\}/.test(cmSrc)) {
    fail('something is building an academy name by picking blind again');
  }
  const firsts = (bankOf(cmSrc, 'YOUTH_FIRST') ?? []).length;
  const lasts = (bankOf(cmSrc, 'YOUTH_LAST') ?? []).length;
  /* The bank has to comfortably outsize the biggest squad it fills, or the
     guard spends its life walking the cross product. */
  if (firsts * lasts < 900) fail(`the academy bank is down to ${firsts * lasts} names, too few for a padded squad`);
  console.log(`   ${squadsChecked} day one squads (${padded} academy kids in them), ${seasons} seasons, ${playersSeen} squad places, 0 shared names; bank is ${firsts}x${lasts} = ${firsts * lasts}`);
}

console.log('');
if (failures > 0) {
  console.error(`simInventedNames: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simInventedNames: green. Every invented man on this site is invented all the way down.');
