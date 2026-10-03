/*
 * Round 942 harness: GM XP and skill trees, lifted out of Club Manager.
 *
 * HEADER_PLACEHOLDER
 *
 * Run: node scripts/simGmXp.mjs
 * Record the Club Manager fixture (only ever from a tree whose clubManagerXp.ts
 * is origin/main's): GMXP_RECORD=1 GMXP_MAIN_SHA=<sha> node scripts/simGmXp.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const FIXTURE = `${ROOT}/scripts/data/cmXpFixture.json`;
const CM_PATH = `${ROOT}/src/lib/clubManagerXp.ts`;
const GM_PATH = `${ROOT}/src/lib/gmXp.ts`;
const RECORD = process.env.GMXP_RECORD === '1';
const CONTROL = process.env.GMXP_CONTROL || '';
const KNOWN = ['curvestep'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`GMXP_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}
if (RECORD && CONTROL) {
  console.error('refusing to record a fixture with a control applied');
  process.exit(1);
}

/* Read a source file with line endings normalised: the anchors below are LF and
   Anthony's checkout is CRLF. Every read of src in this harness goes through here. */
const readSrc = p => fs.readFileSync(p, 'utf8').replaceAll('\r\n', '\n');

/* ---------- controls: rewrite a COPY of a module and alias the bundle to it ---------- */
const overrides = {};
const swapInto = (file, alias, from, to) => {
  const src = readSrc(file);
  if (!src.includes(from)) {
    console.error(`control cannot run: ${path.basename(file)} does not contain the text GMXP_CONTROL=${CONTROL} rewrites`);
    console.error(`  looked for: ${from}`);
    process.exit(1);
  }
  const copy = `${TMP}/simGmXp.${process.pid}.${path.basename(file)}`;
  fs.writeFileSync(copy, src.replace(from, to));
  overrides[alias] = copy;
};
const HAS_GM = fs.existsSync(GM_PATH);
if (CONTROL === 'curvestep') {
  /* One constant of the level curve, nudged. Whichever file holds the curve
     (Club Manager before the lift, gmXp after it), the fixture must go red. */
  const anchor = 'export const XP_LEVEL_STEP = 1.04;';
  const holder = HAS_GM && readSrc(GM_PATH).includes(anchor) ? GM_PATH : CM_PATH;
  swapInto(holder, holder === GM_PATH ? '@/lib/gmXp' : '@/lib/clubManagerXp', anchor, 'export const XP_LEVEL_STEP = 1.041;');
}

/* ---------- bundle the real modules ---------- */
const ENTRY = `${TMP}/simGmXp.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/simGmXp.${process.pid}.bundle.mjs`;
fs.writeFileSync(ENTRY, [
  "export * as cm from '@/lib/clubManagerXp';",
  HAS_GM ? "export * as gm from '@/lib/gmXp';" : 'export const gm = null;',
].join('\n'));
const aliasPlugin = {
  name: 'dukb-alias',
  setup(b) {
    b.onResolve({ filter: /^@\// }, args => {
      if (overrides[args.path]) return { path: overrides[args.path] };
      const base = `${ROOT}/src/${args.path.slice(2)}`;
      for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
        if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) return { path: base + ext };
      }
      return null;
    });
  },
};
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', plugins: [aliasPlugin],
});
const { cm, gm } = await import(pathToFileURL(BUNDLE).href);
for (const f of [ENTRY, BUNDLE, ...Object.values(overrides)]) { try { fs.unlinkSync(f); } catch { /* gone */ } }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);

/* Seeded, so the recorder writes the same bytes every time it runs. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sha = lines => crypto.createHash('sha256').update(lines.join('\n')).digest('hex');
const show = v => (v === null ? 'null' : v === undefined ? 'undefined' : typeof v === 'number' ? String(v) : JSON.stringify(v));

/* ================================================================== */
/* The Club Manager fixture: every number the XP screen and the engine */
/* read, from the real module, at every level and every point.         */
/* ================================================================== */
function cmSections(x) {
  const S = {};
  const trees = x.SKILL_TREES;
  const blockWith = pts => ({ ...x.defaultXp(), points: { ...x.defaultXp().points, ...pts } });

  S.constants = [
    `SKILL_TREES=${show(trees)}`, `MAX_TREE_POINTS=${x.MAX_TREE_POINTS}`, `MAX_LEVEL=${x.MAX_LEVEL}`,
    `XP_FIRST_LEVEL=${x.XP_FIRST_LEVEL}`, `XP_LEVEL_STEP=${x.XP_LEVEL_STEP}`, `XP_VERSION=${x.XP_VERSION}`,
    `defaultXp=${show(x.defaultXp())}`,
    `TREE_INFO=${show(trees.map(t => x.TREE_INFO[t]))}`,
  ];

  S.curve = [];
  for (let l = -1; l <= x.MAX_LEVEL + 3; l++) S.curve.push(`L=${l} xpForLevel=${x.xpForLevel(l)}`);

  S.levels = [];
  const probe = xp => S.levels.push(
    `xp=${xp} level=${x.levelFor(xp)} earned=${x.pointsEarned(xp)} progress=${x.levelProgress(xp)}`);
  for (const xp of [-50, -1, 0, NaN, Infinity, 1e9]) probe(xp);
  for (let l = 1; l <= x.MAX_LEVEL + 2; l++) {
    const t = x.xpForLevel(l);
    const gap = x.xpForLevel(l + 1) - t;
    for (const xp of [t - 1, t, t + 1, t + Math.floor(gap / 2), t + Math.floor(gap / 3)]) probe(xp);
  }

  S.spend = [];
  const rnd = mulberry32(942);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const top = x.xpForLevel(x.MAX_LEVEL) + 5000;
  for (let w = 0; w < 300; w++) {
    const pts = {};
    for (const t of trees) {
      const r = rnd();
      pts[t] = r < 0.55 ? 0 : r < 0.95 ? Math.floor(rnd() * (x.MAX_TREE_POINTS + 1)) : pick([x.MAX_TREE_POINTS + 1, -1, 2.5, undefined]);
    }
    let block = { ...blockWith({}), xp: Math.floor(rnd() * top), points: pts };
    if (rnd() < 0.2) block.xp = x.xpForLevel(1 + Math.floor(rnd() * x.MAX_LEVEL));
    for (let s = 0; s < 12; s++) {
      const tree = rnd() < 0.08 ? 'bogus' : pick(trees);
      const before = `free=${x.pointsFree(block)} spent=${x.pointsSpent(block)}`;
      const res = x.spendPoint(block, tree);
      S.spend.push(`w=${w} s=${s} ${tree} ${before} -> ${show(res)}`);
      const career = { season: w, managerXp: block };
      S.spend.push(`  career -> ${show(x.spendSkillPoint(career, tree))}`);
      if (res) block = res;
    }
  }

  S.valid = [];
  const corpus = [
    undefined, null, 0, 'x', [], {}, x.defaultXp(),
    { ...x.defaultXp(), v: 2 }, { ...x.defaultXp(), xp: -1 }, { ...x.defaultXp(), xp: NaN },
    { ...x.defaultXp(), xp: '5' }, { ...x.defaultXp(), points: [] }, { ...x.defaultXp(), points: null },
    { ...x.defaultXp(), graduatesSeen: 4 }, { ...x.defaultXp(), graduatesSeen: -1 }, { ...x.defaultXp(), graduatesSeen: '3' },
    { ...x.defaultXp(), xp: 99999, graduatesSeen: 0 },
  ];
  for (const t of trees) {
    for (const n of [0, 1, x.MAX_TREE_POINTS, x.MAX_TREE_POINTS + 1, -1, 1.5, '2', null]) {
      corpus.push({ ...x.defaultXp(), xp: 1234, points: { ...x.defaultXp().points, [t]: n } });
    }
    const missing = { ...x.defaultXp().points };
    delete missing[t];
    corpus.push({ ...x.defaultXp(), points: missing });
  }
  corpus.forEach((c, i) => {
    const state = { managerXp: c === undefined ? undefined : JSON.parse(JSON.stringify(c ?? null)) };
    const tp = trees.map(t => x.treePoints(state, t)).join(',');
    const read = show(x.xpOf(state));
    const ensured = show(x.ensureXp(state));
    S.valid.push(`#${i} valid=${x.isValidXp(c)} xpOf=${read} ensure=${ensured} after=${show(state.managerXp)} tp=${tp}`);
  });

  S.effects = [];
  const EFFECTS = ['dutyEdge', 'valuationTighten', 'askEdge', 'youthIntakeEdge', 'youthReportEdge',
    'promiseCushion', 'gateEdge', 'pressCushion'];
  const effectLine = state => EFFECTS.map(e => `${e}=${x[e](state)}`).join(' ');
  S.effects.push(`absent ${effectLine({})}`);
  for (let p = -1; p <= x.MAX_TREE_POINTS + 1; p++) {
    S.effects.push(`all=${p} ${effectLine({ managerXp: blockWith(Object.fromEntries(trees.map(t => [t, p]))) })}`);
    for (const t of trees) S.effects.push(`${t}=${p} ${effectLine({ managerXp: blockWith({ [t]: p }) })}`);
  }

  S.season = [];
  const rs = mulberry32(513);
  const edge = [0, -1, 2.5, NaN, Infinity];
  for (let i = 0; i < 200; i++) {
    const v = () => (rnd() < 0.1 ? edge[Math.floor(rs() * edge.length)] : Math.floor(rs() * 30));
    const input = {
      wins: v(), trophies: v() % 4, objectivesMet: v() % 3, placesAboveExpectation: v() - 5,
      youthPromoted: v() % 5, euroRoundsReached: v() % 6, soldMoreThanBought: rs() < 0.5,
    };
    S.season.push(`${show(input)} -> ${show(x.seasonXp(input))}`);
  }
  for (const [xp, add] of [[0, 10], [5, -3], [5, NaN], [5, 2.6], [100, Infinity], [7, 0]]) {
    S.season.push(`addXp(${xp},${add}) -> ${show(x.addXp({ ...x.defaultXp(), xp }, add))}`);
  }
  return S;
}

/* Small sections are kept whole; big ones keep a hash plus every tenth line, which
   is enough to point at where a replay first goes wrong. */
const WHOLE = ['constants', 'curve', 'levels', 'effects'];
function toFixture(S, mainSha) {
  const sections = {};
  for (const [name, lines] of Object.entries(S)) {
    const keep = WHOLE.includes(name) ? lines.map((l, i) => [i, l]) : lines.map((l, i) => [i, l]).filter(([i]) => i % 10 === 0);
    sections[name] = { count: lines.length, sha256: sha(lines), lines: keep };
  }
  return {
    about: 'Round 942: Club Manager XP recorded from the real clubManagerXp.ts before the lift into gmXp.ts. Replayed by scripts/simGmXp.mjs section 1; it must match byte for byte.',
    recordedFrom: mainSha,
    sections,
  };
}

function replay(S, fx) {
  let bad = 0;
  for (const [name, want] of Object.entries(fx.sections)) {
    const got = S[name];
    if (!got) { fail(`fixture section ${name} is not produced any more`); bad += 1; continue; }
    if (got.length === want.count && sha(got) === want.sha256) continue;
    bad += 1;
    const diff = want.lines.find(([i, l]) => got[i] !== l);
    fail(`section ${name}: ${got.length} lines (want ${want.count}), hash differs` +
      (diff ? `\n      first kept line that differs, #${diff[0]}\n      want: ${diff[1]}\n      got:  ${got[diff[0]]}` : ' (between kept lines)'));
  }
  for (const name of Object.keys(S)) if (!fx.sections[name]) { fail(`section ${name} has no fixture`); bad += 1; }
  return bad;
}

/* ---------- 1. Club Manager did not move by one point ---------- */
const cmS = cmSections(cm);
if (RECORD) {
  const mainSha = process.env.GMXP_MAIN_SHA || '';
  if (!/^[0-9a-f]{7,40}$/.test(mainSha)) {
    console.error('GMXP_RECORD needs GMXP_MAIN_SHA, the origin/main commit this clubManagerXp.ts came from');
    process.exit(1);
  }
  fs.writeFileSync(FIXTURE, JSON.stringify(toFixture(cmS, mainSha), null, 1) + '\n');
  const total = Object.values(cmS).reduce((n, l) => n + l.length, 0);
  console.log(`recorded ${total} lines in ${Object.keys(cmS).length} sections to scripts/data/cmXpFixture.json from ${mainSha}`);
  process.exit(0);
}
console.log('1) Club Manager XP replays the fixture recorded before the lift');
{
  const fx = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const lines = Object.values(fx.sections).reduce((n, s) => n + s.count, 0);
  if (lines < 3000) fail(`the fixture holds ${lines} lines, too few to be the recording this harness writes`);
  const bad = replay(cmS, fx);
  if (!bad) ok(`${lines} lines over ${Object.keys(fx.sections).length} sections match the recording from ${fx.recordedFrom}`);
}

/* ---------- summary ---------- */
if (failures) {
  console.error(`\nsimGmXp: ${failures} failure(s)${CONTROL ? ` under GMXP_CONTROL=${CONTROL}` : ''}`);
  process.exit(1);
}
if (CONTROL) {
  console.error(`\nsimGmXp: GMXP_CONTROL=${CONTROL} did not fire, every check stayed green: the control is broken`);
  process.exit(1);
}
console.log('\nsimGmXp: all checks passed');
