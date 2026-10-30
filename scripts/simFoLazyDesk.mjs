/* Round 1550: the NFL Front Office fetches its GM career kit when it needs it, and the page never brings it.
 *
 * Round 1533 bound the desk host (src/lib/gmDeskHost.ts), the seat market (gmSeat.ts, managerOffers.ts), the
 * seat packs, the NFL adapter and the out of work screen to the board statically: /front-office went from 372.9K
 * to 389.5K of gzipped JavaScript against its 374K row. Round 1550 split what every screen reads
 * (src/lib/gmCareerFace.ts, src/lib/gmSeatRecord.ts) from the rest, which is one chunk the board asks for
 * (src/components/front-office/nflCareerKit.ts, through nflCareerKitLoad.ts). The weight itself is measured by
 * scripts/sweepWeight.mjs on a served build; this harness holds the two promises the split rests on, from source,
 * with no build and no browser.
 *
 *   1  The page's static import graph. Walked from src/pages/FrontOffice.tsx through every value import (a type
 *      import, and an import whose every name is a type, is erased by the compiler and not followed; a dynamic
 *      import() is an edge to a chunk fetched later and is not followed). Not one of the kit's modules may be in
 *      it, and the face, the loader and the board must be (so a walker that reaches nothing cannot pass), and the
 *      loader must hold the one dynamic edge to the kit. Stricter than the bundler where it differs (an import
 *      the compiler would drop as unused still counts here), never looser. Round 1542 (its closing check of
 *      2026-10-22, the page had grown 5.8K): the season's awards (src/lib/nflSeasonAwards.ts, named in the press
 *      that already waits for the kit), the shared ranking they call (foSeasonStats.ts) and the season card with
 *      its words are not in it either, while the recorder (nflSeasonStats.ts) must be.
 *   2  The hub's Career box before the kit equals the box after it. Before the kit is here the board builds a
 *      save older than the record from the save alone (hostBoxLegacy: the tier and the last grade left out);
 *      after, from the league through the adapter (nflLegacy). Over three NFL leagues (two of fifteen men, one
 *      of full rosters), a third of the clubs in each, and a grid of saves (seasons, titles, fired, counted, a
 *      champion or none, a mandate, four desks: none, no record, a record of another club, a record that fits),
 *      the Career box must read the same, word for word. The GM level box reads the desk alone, which is the
 *      same on both paths. Vacuity guards: the two records themselves must differ somewhere (else the check
 *      proves nothing), the kit's record must carry a tier other than the bottom one and a last grade somewhere,
 *      and a stored record that fits must be read as itself. Measured 2026-10-22: 55296 saves, the records differ
 *      in 30348, a tier other than the bottom one in 39744, a last grade in 9216, a stored record in 13824.
 *   3  Round 1561 (fix, the NHL row): section 1 for /nhl-front-office, walked from src/pages/NhlFrontOffice.tsx. The
 *      page carries its board, the NHL desk boxes, the face, the loader nhlCareerKitLoad.ts and the shared glue
 *      (useGmCareerKit, GmCareerKitHolding, careerBinding), and not one module of the shared kit core, the NHL's
 *      adapter and career (gmDeskHostNhl.ts, nhlGmCareer.ts, nhlCareerKit.ts) or the NFL's kit; the loader holds the
 *      one dynamic edge to nhlCareerKit.ts. Measured 2026-10-30: 104 files reached, 16 kit modules checked absent.
 *   4  Round 1561 (fix, the NHL row): section 2 over three NHL leagues (seeds 1561, 1559, 41), the kit's record read
 *      through nhlLegacy. Measured 2026-10-30: 55296 saves, the records differ in 31584, a tier other than the
 *      bottom one in 41472, a last grade in 9216, a stored record in 13824.
 *
 * Negative controls (SIM_FO_LAZY_DESK_CONTROL), source rewrites applied in memory or at bundle time, never on
 * disk; each must turn its own section red and the run says FIRED or DID NOT FIRE:
 *   eager       the board imports the kit statically beside its loader                       section 1
 *   hostimport  the career boxes take their words from the whole host again                  section 1
 *   tiertile    the Career box prints the stint's tier, which the hub's record leaves out    section 2
 *   boxseasons  the hub's record counts one season more than the save                        section 2
 *   closestatic the board imports the season's awards statically again (Round 1542)          section 1
 *   nhleager    the NHL board imports its kit statically beside its loader                   section 3
 *   nhlhostvalue the NHL board's type only import of the whole host becomes a value import   section 3
 *   nhltiertile tiertile, held on the NHL leagues                                             section 4
 *   nhlboxseasons boxseasons, held on the NHL leagues                                         section 4
 *
 * Run: node scripts/simFoLazyDesk.mjs   (SIM_FO_LAZY_DESK_CONTROL=<name> for a control)
 * Reads no database and no network: the bundle is refused if it names the database host.
 */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_FO_LAZY_DESK_CONTROL || '';
const lf = s => s.replace(/\r\n/g, '\n');
const src = (...p) => path.join(ROOT, 'src', ...p);

/* name: [section, file, the text it rewrites, what it becomes] */
const CONTROLS = {
  /* Round 1561: the board's loader import names the loader itself (the shared hook takes it), the same line */
  eager: ['1', src('components', 'front-office', 'FrontOfficeBoard.tsx'),
    "import { loadNflCareerKit, nflCareerKitLoader, type NflCareerKit } from '@/components/front-office/nflCareerKitLoad';",
    "import { loadNflCareerKit, nflCareerKitLoader, type NflCareerKit } from '@/components/front-office/nflCareerKitLoad';\nimport '@/components/front-office/nflCareerKit';"],
  hostimport: ['1', src('components', 'front-office-shared', 'gmCareerDesk.tsx'),
    "import { hostCareerTile, hostMarketTile, hostXpTile } from '@/lib/gmCareerFace';",
    "import { hostCareerTile, hostMarketTile, hostXpTile } from '@/lib/gmDeskHost';"],
  tiertile: ['2', src('lib', 'gmCareerFace.ts'),
    'value: `Season ${hostStintSeasons(seat, index) + 1}`,',
    'value: `Season ${hostStintSeasons(seat, index) + 1} t${s.tier}`,'],
  boxseasons: ['2', src('lib', 'gmCareerFace.ts'),
    '    seasonsPlayed: f.seasonsPlayed, titles: f.titles, fired: f.fired, lastGrade: null,',
    '    seasonsPlayed: f.seasonsPlayed + 1, titles: f.titles, fired: f.fired, lastGrade: null,'],
  closestatic: ['1', src('components', 'front-office', 'FrontOfficeBoard.tsx'),
    "import { FoAwardBadge } from '@/components/front-office-shared/FoAwardBadge';",
    "import { FoAwardBadge } from '@/components/front-office-shared/FoAwardBadge';\nimport '@/lib/nflSeasonAwards';"],
  /* Round 1561 (fix): the NHL row's controls. nhleager is eager on the NHL board; nhlhostvalue turns the board's type
     only import of the whole host into a value import (the static pull of a kit module other than the kit itself,
     which no walk sees, because the kit's chunk is still asked for); the two box controls are section 2's on the NHL
     leagues. */
  nhleager: ['3', src('components', 'nhl-front-office', 'NhlFrontOfficeBoard.tsx'),
    "import { nhlCareerKitLoader } from '@/components/nhl-front-office/nhlCareerKitLoad';",
    "import { nhlCareerKitLoader } from '@/components/nhl-front-office/nhlCareerKitLoad';\nimport '@/components/nhl-front-office/nhlCareerKit';"],
  nhlhostvalue: ['3', src('components', 'nhl-front-office', 'NhlFrontOfficeBoard.tsx'),
    "import type { GmCareerBinding } from '@/lib/gmDeskHost';",
    "import { type GmCareerBinding, hostMarket } from '@/lib/gmDeskHost';\nvoid hostMarket;"],
  nhltiertile: ['4', src('lib', 'gmCareerFace.ts'),
    'value: `Season ${hostStintSeasons(seat, index) + 1}`,',
    'value: `Season ${hostStintSeasons(seat, index) + 1} t${s.tier}`,'],
  nhlboxseasons: ['4', src('lib', 'gmCareerFace.ts'),
    '    seasonsPlayed: f.seasonsPlayed, titles: f.titles, fired: f.fired, lastGrade: null,',
    '    seasonsPlayed: f.seasonsPlayed + 1, titles: f.titles, fired: f.fired, lastGrade: null,'],
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_FO_LAZY_DESK_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const overrides = new Map();
if (CONTROL) {
  const [section, file, from, to] = CONTROLS[CONTROL];
  const text = lf(fs.readFileSync(file, 'utf8'));
  if (!text.includes(from)) {
    console.error(`control cannot run: ${path.basename(file)} does not hold the text ${CONTROL} rewrites (${from.slice(0, 70)}...)`);
    process.exit(2);
  }
  if (text.split(from).length !== 2) { console.error(`control cannot run: the text ${CONTROL} rewrites is there more than once`); process.exit(2); }
  overrides.set(path.resolve(file).toLowerCase(), text.replace(from, to));
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}; section ${section} must go red`);
}
const readSrc = file => overrides.get(path.resolve(file).toLowerCase()) ?? lf(fs.readFileSync(file, 'utf8'));

let section = '';
const failedIn = new Map();
let failures = 0;
const fail = m => {
  failures++;
  failedIn.set(section, (failedIn.get(section) ?? 0) + 1);
  if ((failedIn.get(section) ?? 0) <= 12) console.log(`   FAIL ${m}`);
};
const ok = (cond, m) => { if (!cond) fail(typeof m === 'function' ? m() : m); return !!cond; };
const begin = (id, title) => { section = id; console.log(`${id}) ${title}`); };

/* ================================================================== */
/* 1. The page's static import graph                                  */
/* ================================================================== */

/** The code with its comments blanked out, strings, templates and regex literals kept as they are. */
function stripComments(text) {
  let out = '';
  let i = 0, prev = '';
  while (i < text.length) {
    const c = text[i], d = text[i + 1];
    if (c === '/' && d === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      const e = text.indexOf('*/', i + 2);
      const end = e < 0 ? text.length : e + 2;
      out += text.slice(i, end).replace(/[^\n]/g, ' ');
      i = end;
      continue;
    }
    if (c === '\'' || c === '"' || c === '`') {
      let j = i + 1;
      while (j < text.length && text[j] !== c) { if (text[j] === '\\') j++; j++; }
      out += text.slice(i, j + 1); i = j + 1; prev = 'x'; continue;
    }
    if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev))) {
      let j = i + 1, cls = false;
      while (j < text.length && text[j] !== '\n') {
        if (text[j] === '\\') { j += 2; continue; }
        if (text[j] === '[') cls = true; else if (text[j] === ']') cls = false; else if (text[j] === '/' && !cls) break;
        j++;
      }
      out += text.slice(i, j + 1); i = j + 1; prev = 'x'; continue;
    }
    if (!/\s/.test(c)) prev = c;
    out += c; i++;
  }
  return out;
}

/** True when every name in a brace list is marked `type` (the compiler erases the whole statement). */
const allTypes = names => {
  const parts = names.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
  return parts.length > 0 && parts.every(p => p.startsWith('type '));
};

/** The value imports and the dynamic imports of one file, as module specifiers. */
function edgesOf(text) {
  const code = stripComments(text);
  const values = [], dynamic = [];
  for (const m of code.matchAll(/(?:^|[;\n}])\s*import\s+(type\s+)?([\w$*{}\s,]+?)\s+from\s+['"]([^'"]+)['"]/g)) {
    if (m[1]) continue;
    const clause = m[2].trim();
    if (clause.startsWith('{') && allTypes(clause)) continue;
    values.push(m[3]);
  }
  for (const m of code.matchAll(/(?:^|[;\n}])\s*import\s+['"]([^'"]+)['"]/g)) values.push(m[1]);
  for (const m of code.matchAll(/(?:^|[;\n}])\s*export\s+(type\s+)?(\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g)) {
    if (m[1]) continue;
    if (m[2].startsWith('{') && allTypes(m[2])) continue;
    values.push(m[3]);
  }
  for (const m of code.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) dynamic.push(m[1]);
  return { values, dynamic };
}

const EXTS = ['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx', ''];
function resolveSpec(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(ROOT, 'src', spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null; /* a package: not this repo's code */
  for (const e of EXTS) {
    const f = base + e;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return path.resolve(f);
  }
  return undefined;
}

const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
/* What the kit is: the modules the page must never carry. */
const KIT_ONLY = [
  'src/lib/gmDeskHost.ts', 'src/lib/gmSeat.ts', 'src/lib/managerOffers.ts', 'src/data/gmSeat/packs.ts',
  'src/lib/gmDeskHostNfl.ts', 'src/lib/nflGmCareer.ts', 'src/components/front-office/nflCareerKit.ts',
  'src/components/front-office-shared/GmOutOfWork.tsx', 'src/components/front-office-shared/GmJobMarketPanel.tsx',
  'src/components/front-office-shared/GmCareerPanel.tsx', 'src/components/front-office-shared/GmXpDeskPanel.tsx',
  /* Round 1559: the shared bind and the core every sport's kit carries */
  'src/lib/gmCareerBind.ts', 'src/components/front-office-shared/gmCareerKitCore.ts',
];
/* Round 1542: the season's awards and the shared ranking ride in the kit (the close is in the press that waits for
   it), the season card, its words and the shared card in the card's own chunk: the page carries none of them. */
const SEASON_LAZY = [
  'src/lib/nflSeasonAwards.ts', 'src/lib/foSeasonStats.ts', 'src/lib/nflSeasonView.ts',
  'src/components/front-office/NflSeasonStats.tsx', 'src/components/front-office-shared/FoSeasonStatsCard.tsx',
];
/* What the page must carry, so a walker that reaches nothing cannot pass. */
const PAGE_MUST = [
  'src/components/front-office/FrontOfficeBoard.tsx', 'src/lib/gmCareerFace.ts', 'src/lib/gmSeatRecord.ts',
  'src/components/front-office/nflCareerKitLoad.ts', 'src/components/front-office-shared/gmCareerDesk.tsx', 'src/lib/nflGmDesk.ts',
  'src/lib/nflSeasonStats.ts',
  /* Round 1559: the loader's shared fetch once rule, a leaf the page carries */
  'src/components/front-office-shared/careerKitLoader.ts',
  /* Round 1561: the board's career glue, shared with the NHL board: the page carries all three, none of them the kit */
  'src/components/front-office-shared/useGmCareerKit.ts', 'src/components/front-office-shared/GmCareerKitHolding.tsx',
  'src/components/front-office-shared/careerBinding.ts',
];

/* Round 1561 (fix): the NHL row. /nhl-front-office fetches its own kit (nhlCareerKit.ts through nhlCareerKitLoad.ts)
   the NFL's way, so its page is held to the same promise: not one module of the shared kit core, the NHL's adapter or
   its career, and not one module of the NFL's kit either (the two pages share the face, the loader and the glue, never
   a kit). */
const NHL_KIT_ONLY = [
  ...KIT_ONLY.filter(k => !['src/lib/gmDeskHostNfl.ts', 'src/lib/nflGmCareer.ts', 'src/components/front-office/nflCareerKit.ts'].includes(k)),
  'src/lib/gmDeskHostNhl.ts', 'src/lib/nhlGmCareer.ts', 'src/components/nhl-front-office/nhlCareerKit.ts',
  'src/lib/gmDeskHostNfl.ts', 'src/lib/nflGmCareer.ts', 'src/components/front-office/nflCareerKit.ts',
];
const NHL_PAGE_MUST = [
  'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', 'src/components/nhl-front-office/NhlGmDesk.tsx',
  'src/lib/gmCareerFace.ts', 'src/lib/gmSeatRecord.ts', 'src/lib/nhlGmDesk.ts',
  'src/components/nhl-front-office/nhlCareerKitLoad.ts', 'src/components/front-office-shared/gmCareerDesk.tsx',
  'src/components/front-office-shared/careerKitLoader.ts', 'src/components/front-office-shared/useGmCareerKit.ts',
  'src/components/front-office-shared/GmCareerKitHolding.tsx', 'src/components/front-office-shared/careerBinding.ts',
];

/** Walk one page's static import graph and hold it to its row: what it must carry, what it must never carry, and
    the one dynamic edge from its loader to its kit. */
function pageGraph(row) {
  const start = path.resolve(row.page);
  const seen = new Map(); /* file -> the file that first imported it */
  const dynamicEdges = [];
  const unresolved = [];
  const queue = [start];
  seen.set(start, null);
  while (queue.length) {
    const f = queue.shift();
    if (!/\.(ts|tsx)$/.test(f)) continue;
    const { values, dynamic } = edgesOf(readSrc(f));
    for (const d of dynamic) { const t = resolveSpec(f, d); if (t) dynamicEdges.push([rel(f), rel(t)]); }
    for (const s of values) {
      const t = resolveSpec(f, s);
      if (t === null) continue;
      if (t === undefined) { unresolved.push(`${rel(f)} -> ${s}`); continue; }
      if (!seen.has(t)) { seen.set(t, f); queue.push(t); }
    }
  }
  const files = new Set([...seen.keys()].map(rel));
  /* the import chain that brought a file in, page first */
  const chain = r => { const out = []; let f = path.resolve(ROOT, r); while (f) { out.unshift(rel(f)); f = seen.get(f); } return out.join(' > '); };
  ok(unresolved.length === 0, () => `${unresolved.length} imports in the page's graph do not resolve (${unresolved.slice(0, 3).join('; ')})`);
  ok(files.size >= 80, `the walk reached ${files.size} files from the page, fewer than the 80 a page of this site imports`);
  for (const m of row.must) ok(files.has(m), `the walk never reached ${m}, which the page imports: the walker is blind`);
  for (const k of row.kitOnly) ok(!files.has(k), () => `the page carries ${k}, which is the kit's: ${chain(k)}`);
  for (const k of row.lazy) ok(!files.has(k), () => `the page carries ${k}, which rides in the kit or the season card's chunk: ${chain(k)}`);
  ok(dynamicEdges.some(([a, b]) => a === row.loader && b === row.kit),
    `the loader ${row.loader} does not fetch the kit ${row.kit} with a dynamic import`);
  console.log(`   ${files.size} files reached from ${rel(start)}, ${dynamicEdges.length} dynamic edges seen, ${row.kitOnly.length} kit modules and ${row.lazy.length} season modules checked absent`);
}

begin('1', 'the page carries the boxes and the loader, and not one module of the career kit');
pageGraph({
  page: src('pages', 'FrontOffice.tsx'), must: PAGE_MUST, kitOnly: KIT_ONLY, lazy: SEASON_LAZY,
  loader: 'src/components/front-office/nflCareerKitLoad.ts', kit: 'src/components/front-office/nflCareerKit.ts',
});

begin('3', 'NHL row: /nhl-front-office carries the boxes and its loader, and not one module of any career kit');
pageGraph({
  page: src('pages', 'NhlFrontOffice.tsx'), must: NHL_PAGE_MUST, kitOnly: NHL_KIT_ONLY, lazy: [],
  loader: 'src/components/nhl-front-office/nhlCareerKitLoad.ts', kit: 'src/components/nhl-front-office/nhlCareerKit.ts',
});

/* ================================================================== */
/* 2. The boxes before the kit equal the boxes after it               */
/* ================================================================== */

function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'esbuild', 'package.json'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) { console.error(`no node_modules with esbuild above ${ROOT}`); process.exit(2); }
    d = up;
  }
}
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'simFoLazyDesk-')).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
const ENTRY = `${WORK}/entry.mjs`;
const BUNDLE = `${WORK}/bundle.cjs`;
const lib = n => `'${ROOT_URL}/src/lib/${n}.ts'`;
fs.writeFileSync(ENTRY, `
export * as F from ${lib('gmCareerFace')};
export * as C from ${lib('nflGmCareer')};
export * as E from ${lib('frontOffice')};
export * as G from ${lib('gmDesk')};
export { FO_DEPTH } from '${ROOT_URL}/src/data/frontOfficeDepth.ts';
export { FO_TEAM_MAP } from '${ROOT_URL}/src/data/frontOfficePlayers.ts';
export * as NC from ${lib('nhlGmCareer')};
export * as NE from ${lib('nhlFrontOffice')};
export { NHL_TEAM_MAP } from '${ROOT_URL}/src/data/conquestDataNhl.ts';
`);
const esbuild = createRequire(`${modulesDir()}/`)('esbuild');
await esbuild.build({
  entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', alias: { '@': `${ROOT_URL}/src` },
  outfile: BUNDLE, logLevel: 'error',
  plugins: [{
    name: 'control',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        const hit = overrides.get(path.resolve(args.path).toLowerCase());
        return hit === undefined ? undefined : { contents: hit, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    },
  }],
});
{
  const text = fs.readFileSync(BUNDLE, 'utf8');
  for (const host of ['supabase.co', 'integrations/supabase']) {
    if (text.includes(host)) { console.error(`refusing to run: the bundle names ${host}`); process.exit(2); }
  }
}
const { F, C, E, G, FO_DEPTH, FO_TEAM_MAP, NC, NE, NHL_TEAM_MAP } = createRequire(import.meta.url)(BUNDLE);

/* Lehmer's generator, seeded per league: the same leagues every run. */
const lehmer = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 48271) % 2147483647) / 2147483647; };

/** The Career box before the kit against the box with it, over whole leagues of one sport (row: its leagues, its
    legacy read through the kit's adapter, its club names). */
function boxesEqual(row) {
  const { leagues, legacyOf, nameOf } = row;
  let cases = 0, differ = 0, tierNot4 = 0, graded = 0, fits = 0;
  const J = v => JSON.stringify(v);
  leagues.forEach((lg, li) => {
    const ids = Object.keys(lg.teams).sort();
    const sample = ids.filter((_, i) => i % 3 === li % 3);
    for (const team of sample) {
      const other = ids.find(x => x !== team);
      for (const sp of [0, 1, 3, 7]) {
        for (const ti of [...new Set([0, 1, sp])].filter(n => n <= sp)) {
          for (const fired of [false, true]) {
            for (const sc of [false, true]) {
              for (const champ of ['', team, other]) {
                for (const mandate of [
                  null,
                  { tier: 'playoffs', text: '', winFloor: 0, reqLevel: 1, season: lg.season },
                  { tier: 'title', text: '', winFloor: 0, reqLevel: 4, season: lg.season },
                  { tier: 'rebuild', text: '', winFloor: 3, reqLevel: 0, season: lg.season - 1 },
                ]) {
                  const facts = { team, seasonsPlayed: sp, titles: ti, fired, seasonCounted: sc, mandate, champion: champ };
                  const box = F.hostBoxLegacy({ team, season: lg.season, seasonCounted: sc, seasonsPlayed: sp, titles: ti, fired });
                  if (champ) lg.champions.push({ season: lg.season, team: champ });
                  const legacy = legacyOf(lg, facts);
                  if (champ) lg.champions.pop();
                  const mine = F.hostLegacySeat({ ...box, tier: legacy.tier });
                  const theirs = F.hostLegacySeat({ ...box, team: other, fired: true });
                  const desks = [
                    null,
                    G.freshGmDesk(),
                    G.withGmBlock(G.freshGmDesk(), F.GM_HOST_KEYS.seat, theirs),
                    G.withGmBlock(G.freshGmDesk(), F.GM_HOST_KEYS.seat, mine),
                  ];
                  for (const desk of desks) {
                    cases++;
                    const real = F.hostSeatOf(desk, legacy);
                    const light = F.hostSeatOf(desk, box);
                    if (J(real) !== J(light)) differ++;
                    if (real === light) fits++;
                    if (real.career.stints[0].tier !== 4) tierNot4++;
                    if (legacy.lastGrade !== null) graded++;
                    const a = J(F.hostCareerTile(real, nameOf)), b = J(F.hostCareerTile(light, nameOf));
                    ok(a === b, () => `${team} in league ${li + 1}, ${sp} seasons, ${ti} titles, fired ${fired}, counted ${sc}, champion '${champ}', `
                      + `desk ${desks.indexOf(desk)}: the Career box reads ${b} before the kit and ${a} with it`);
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  /* Vacuity: the two records must really differ, the kit's must carry what the hub's leaves out, and a stored
     record that fits must be read as itself on both paths. */
  ok(differ > 0, 'the hub record and the kit record never differ, so section 2 compares nothing');
  ok(tierNot4 > 0, "the kit's record never carries a tier other than the bottom one");
  ok(graded > 0, "the kit's record never carries a last grade");
  ok(fits > 0, 'no stored record fit its save, so the stored path was never read');
  console.log(`   ${cases} saves over ${leagues.length} leagues: the records differ in ${differ}, the kit's tier is not the bottom one in ${tierNot4}, a last grade in ${graded}, a stored record read as itself in ${fits}`);
}

begin('2', 'the Career box drawn before the kit is the box drawn with it, save by save (the GM level box reads the desk alone, the same on both)');
boxesEqual({
  leagues: [E.initLeague(lehmer(1550)), E.initLeague(lehmer(1533)), E.initLeague(lehmer(31), { depth: FO_DEPTH })],
  legacyOf: (lg, facts) => C.nflLegacy(lg, { ...facts, rounds: [] }),
  nameOf: id => { const t = FO_TEAM_MAP.get(id); return t ? `${t.city} ${t.name}` : id; },
});

begin('4', 'NHL row: the Career box drawn before the kit is the box the NHL kit draws, save by save');
boxesEqual({
  leagues: [NE.initNhlLeague(lehmer(1561)), NE.initNhlLeague(lehmer(1559)), NE.initNhlLeague(lehmer(41))],
  legacyOf: (lg, facts) => NC.nhlLegacy(lg, { ...facts, series: [] }),
  nameOf: id => { const t = NHL_TEAM_MAP.get(id); return t ? `${t.city} ${t.name}` : id; },
});

/* ================================================================== */
const red = [...failedIn.keys()].join(', ');
if (CONTROL) {
  const want = CONTROLS[CONTROL][0];
  const hits = failedIn.get(want) ?? 0;
  console.log(hits > 0
    ? `simFoLazyDesk CONTROL ${CONTROL} FIRED: section ${want} went red with ${hits} failures (red sections ${red})`
    : `simFoLazyDesk CONTROL ${CONTROL} DID NOT FIRE: section ${want} stayed green (red sections ${red || 'none'})`);
  process.exit(1);
}
console.log(failures ? `simFoLazyDesk: ${failures} failures (sections ${red})` : 'simFoLazyDesk: all checks passed');
process.exit(failures ? 1 : 0);
