/* Round 1326: Club Manager says what it means. The permanent fence for the
   round's words (a copy round: it moves no draw, scripts/qa/cmCopyOnly1326.mjs
   is the proof of that).

   The engine is bundled from CM_COPY_ROOT (default this tree), like
   simCmLeagueRules' CM_RULES_ROOT, so every section can be run against the
   tree before the round and must be RED there (proof it sees the defect),
   green on the round's head, and red under its control.

   1. ARTICLES (cm m11). For every league of REAL_LEAGUES and of every era,
      every club's buildBoardObjectives labels and boardWantLabel: a title ask
      reads exactly `Win ${toLeague(name)}` ("Win La Liga", "Win Serie A",
      "Win the Premier League"); the double reads exactly `Win the ${name} and
      ${cupName} double` (there the article belongs to "double"); no other
      label holds "the La Liga", "the Serie" or "the Ligue". Then one seeded
      season each for Barcelona, Juventus and PSG through the weekly news: at
      least one "top ..." or "sharpest attack in ..." line per league (a FAIL,
      never a skip, when none) and none with the slip. Then a source guard over
      the CODE (comments stripped by esbuild, JSX kept) of
      src/lib/clubManager*.ts and src/components/club-manager/*.tsx: no
      template or JSX text that puts a literal "the " before an interpolation
      naming a league, except two allowlisted shapes, each counted exactly.
      Control CM_COPY_CONTROL=article: leagueDemand's title line back to
      `Win the ${league.name}`.

   Run: node scripts/simCmCopy.mjs [--section=1,2,3,4,5]
        CM_COPY_ROOT=<another tree> node scripts/simCmCopy.mjs   (the base: must be red)
   Exit: 0 green, 1 red (or a control that FIRED), 2 could not run, 3 a
   control that did not fire.
*/
import { build, transform } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(process.env.CM_COPY_ROOT || SCRIPT_ROOT);
const FWD = ROOT.split(String.fromCharCode(92)).join('/');
const CONTROL = process.env.CM_COPY_CONTROL || '';
const secArg = process.argv.slice(2).find(a => a.startsWith('--section='));
const SECTIONS = secArg ? secArg.slice(10).split(',').map(Number) : [1];
const cannot = m => { console.error(`simCmCopy: could not run: ${m}`); process.exit(2); };

/* Each control rewrites one line of one file as the bundler (and the source
   guard) reads it, never on disk. */
const CONTROLS = {
  article: {
    file: 'src/lib/clubManager.ts', section: 1,
    fixed: '\n    return { target: 1, label: `Win ${toLeague(league.name)}` };',
    broken: '\n    return { target: 1, label: `Win the ${league.name}` };',
  },
};
const ctl = CONTROL ? CONTROLS[CONTROL] : null;
if (CONTROL && !ctl) cannot(`CM_COPY_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
if (ctl && !SECTIONS.includes(ctl.section)) cannot(`control ${CONTROL} guards section ${ctl.section}, which this run does not run`);
const lf = s => s.split('\r\n').join('\n');
const readTree = rel => {
  const src = lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  if (!ctl || rel !== ctl.file) return src;
  if (src.split(ctl.fixed).length !== 2) cannot(`control ${CONTROL}: ${rel} does not hold exactly one copy of the line it rewrites`);
  return src.replace(ctl.fixed, ctl.broken);
};
if (ctl) {
  readTree(ctl.file);
  console.log(`CONTROL ${CONTROL}: one line of ${ctl.file} rewritten, section ${ctl.section} must go red`);
}

let failures = 0;
const fail = m => { failures += 1; console.error(`  FAIL: ${m}`); };
const hashKey = s => { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;
Date.now = () => 1790000000000;
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};

const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'cmcopy-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
let reached = !ctl;
async function bundle(name, lines) {
  const entry = path.join(TMP, `${name}-entry.mjs`);
  const out = path.join(TMP, `${name}.mjs`);
  fs.writeFileSync(entry, lines.join('\n'));
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', jsx: 'automatic',
    alias: { '@': `${FWD}/src` }, nodePaths: [path.join(SCRIPT_ROOT, 'node_modules')],
    plugins: [{
      name: 'cm-copy-control',
      setup(b) {
        b.onLoad({ filter: /\.tsx?$/ }, a => {
          if (!ctl || path.resolve(a.path) !== path.resolve(ROOT, ctl.file)) return undefined;
          reached = true;
          return { contents: readTree(ctl.file), loader: a.path.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(a.path) };
        });
      },
    }],
  });
  return import(pathToFileURL(out).href);
}
const engine = await bundle('engine', [
  `export * as cm from '${FWD}/src/lib/clubManager.ts';`,
  `export * as eras from '${FWD}/src/lib/clubManagerEras.ts';`,
]);
const { cm } = engine;
if (ctl && ctl.file.startsWith('src/lib/') && !reached) cannot(`control ${CONTROL}: the rewritten ${ctl.file} never reached the bundle`);
if (typeof cm.toLeague !== 'function') cannot('clubManager.ts exports no toLeague (Round 1040 wrote it)');
async function ensureEra(eraId) {
  if (!eraId || eraId === 'now') return;
  const load = engine.eras.ensureEraRosters ?? cm.ensureEraRosters;
  if (typeof load === 'function') await load(eraId);
}
const SLIP = /\bthe (La Liga|Serie |Ligue )/;

/* ------------------------------------------------------------------ */
async function sectionArticles() {
  console.log('1) articles: the board asks, the weekly news and the source');
  const worlds = [['now', cm.REAL_LEAGUES], ...Object.entries(cm.ERA_LEAGUES)];
  let labels = 0;
  const titleBy = [];
  for (const [eraId, leagues] of worlds) {
    await ensureEra(eraId);
    for (const l of leagues) {
      const want = `Win ${cm.toLeague(l.name)}`;
      const titleLike = s => s === `Win the ${l.name}` || s === `Win ${l.name}`;
      let titles = 0;
      for (const club of l.clubs) {
        const era = eraId === 'now' ? undefined : eraId;
        const objs = cm.buildBoardObjectives(club, !!l.euro, l.clubs.length, era, l.clubs);
        const said = [...objs.map(o => [o.id, o.label]), ['boardWantLabel', cm.boardWantLabel(club, era)]];
        for (const [id, label] of said) {
          labels += 1;
          if (titleLike(label)) {
            if (id !== 'boardWantLabel') titles += 1;
            if (label !== want) fail(`${eraId} ${l.name}, ${club}: the ${id} ask reads "${label}", want "${want}"`);
          } else if (id === 'double') {
            const m = label.match(/^Win the (.+) and (.+) double$/);
            if (!m || m[1] !== l.name) fail(`${eraId} ${l.name}, ${club}: the double reads "${label}"`);
          } else if (SLIP.test(label)) fail(`${eraId} ${l.name}, ${club}: the ${id} ask reads "${label}"`);
        }
      }
      titleBy.push(`${eraId === 'now' ? '' : `${eraId} `}${l.name} ${titles}`);
      if (/^(La Liga|Serie A|Ligue 1)$/.test(l.name) && titles === 0) fail(`${eraId} ${l.name}: no club is sent for the title, so the check saw nothing`);
    }
  }
  console.log(`   ${labels} labels read; title asks per league: ${titleBy.join(', ')}`);

  /* One seeded season each through the weekly news. */
  for (const club of ['Barcelona', 'Juventus', 'PSG']) {
    Math.random = seeded(hashKey(`cm-copy|${club}`));
    let s = cm.startCareer(club, 'now');
    const league = cm.careerLeagueOf(s).name;
    const seen = new Set();
    for (let i = 0; i < 220; i++) {
      const r = cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      for (const h of s.aiHeadlines ?? []) seen.add(h);
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    Math.random = REAL_RANDOM;
    const lines = [...seen].filter(h => / top .+ on \d+ points? after /.test(h) || /sharpest attack in /.test(h));
    const named = lines.filter(h => h.includes(` ${league}`));
    if (!named.length) fail(`${club}: a season of weekly news printed no "top ..." or "sharpest attack in ..." line about ${league}`);
    for (const h of lines) if (SLIP.test(h)) fail(`${club}: the news says "${h}"`);
    console.log(`   ${club} (${league}): ${seen.size} headlines, ${lines.length} table lines, e.g. "${(named[0] ?? '').slice(0, 90)}"`);
  }

  /* The source guard: code only, JSX kept, every file of the engine and the screens. */
  const ALLOW = [
    { shape: /^Win the \$\{league\.name\} and \$\{cupName\} double$/, why: 'the article belongs to "double"', want: 1 },
    { shape: /^carrying the \$\{l\.league\} leaders$/, why: 'the article belongs to "leaders"', want: 2 },
  ];
  const counts = ALLOW.map(() => 0);
  const files = [
    ...fs.readdirSync(path.join(ROOT, 'src', 'lib')).filter(f => /^clubManager[A-Za-z]*\.ts$/.test(f)).map(f => `src/lib/${f}`),
    ...fs.readdirSync(path.join(ROOT, 'src', 'components', 'club-manager')).filter(f => f.endsWith('.tsx')).map(f => `src/components/club-manager/${f}`),
  ];
  let hits = 0;
  for (const rel of files) {
    const code = (await transform(readTree(rel), { loader: rel.endsWith('x') ? 'tsx' : 'ts', jsx: 'preserve' })).code;
    for (const m of code.matchAll(/(?<![A-Za-z])[Tt]he (?:\$\{|\{)([^{}]*)\}/g)) {
      const expr = m[1];
      if (!/league|\blg\b/i.test(expr) || /cup|uel|continental/i.test(expr)) continue;
      hits += 1;
      const line = code.slice(code.lastIndexOf('`', m.index) + 1, code.indexOf('`', m.index + m[0].length));
      const k = ALLOW.findIndex(a => a.shape.test(line));
      if (k >= 0) counts[k] += 1;
      else fail(`${rel}: "${m[0]}" puts "the" before a league name (in: ${code.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20).replace(/\s+/g, ' ')})`);
    }
  }
  ALLOW.forEach((a, i) => {
    if (counts[i] !== a.want) fail(`the allowlisted shape ${a.shape} is in the code ${counts[i]} times where ${a.want} were reasoned (${a.why})`);
  });
  console.log(`   source guard: ${files.length} files, ${hits} league interpolations after "the", allowlisted ${ALLOW.map((a, i) => `${counts[i]} (${a.why})`).join(', ')}`);
}

/* ------------------------------------------------------------------ */
const RUN = { 1: sectionArticles };
for (const n of SECTIONS) {
  if (!RUN[n]) cannot(`no section ${n}`);
  await RUN[n]();
}
const where = ROOT === SCRIPT_ROOT ? 'this tree' : ROOT;
if (ctl) {
  if (failures) { console.log(`simCmCopy: CONTROL ${CONTROL} FIRED (${failures} failures, as it must)`); process.exit(1); }
  console.log(`simCmCopy: CONTROL ${CONTROL} DID NOT FIRE: section ${ctl.section} is blind to it`);
  process.exit(3);
}
if (failures) { console.log(`simCmCopy: RED on ${where}, ${failures} failures`); process.exit(1); }
console.log(`simCmCopy: green on ${where}. Sections ${SECTIONS.join(', ')}: the board, the news and the screens say the league the way people say it.`);
process.exit(0);
