/*
 * Round 942 harness: GM XP and skill trees, lifted out of Club Manager.
 *
 * The owner, 2026-10-02: every manager game should behave like the soccer one.
 * Club Manager has had manager XP and seven skill trees since Round 513; the GM
 * sims had none. Round 942 moved the level curve and the point spending out of
 * clubManagerXp.ts into src/lib/gmXp.ts, over a tree list passed in, and gave
 * the GM seats seven trees of their own as data. This harness fences both.
 *
 * Sections:
 *  1. Club Manager did not move by one point. scripts/data/cmXpFixture.json was
 *     recorded from origin/main 64d5be42 BEFORE any code moved: every level of
 *     the curve, levelFor, pointsEarned and levelProgress at every threshold and
 *     either side of it, 300 seeded spend walks of twelve spends (7200 lines),
 *     the validation corpus, every effect at every point, 200 seeded season
 *     awards. 7796 lines, hashed per section, every tenth line kept as text to
 *     point at a mismatch. Recorded twice: identical bytes. Replayed after the
 *     lift: identical.
 *  2. A GM climbs Club Manager's ladder exactly: same XP at every level, same
 *     level, points and progress either side of every threshold, and 200 paired
 *     seeded walks of 40 spends refused and accepted identically.
 *  3. Nothing spent is the game that shipped: every consumer at zero points
 *     hands back exactly what it was given.
 *  4. Every point moves its consumer at EVERY step from 1 to 5, for EVERY real
 *     input, not the mean and not the two ends (Round 513's Media tree passed an
 *     ends check while points 3 to 5 bought nothing). The inputs are read from
 *     the shared front office modules: the draft's -4..+4 scouting error, the
 *     firm and sour trade premiums, frontOfficeCuts' dead money for seven
 *     salaries, gradeSeason's trust losses, every press gamble's odds. It is all
 *     deterministic (rolls are a 1000 point grid, not draws), so the measured
 *     smallest step is exact and each floor is half of it:
 *       scouting 0.15 (floor 0.07)    negotiation 0.02 (0.01)   cap craft 0.04 (0.02)
 *       development 0.05 (0.025)      trading 0.08 (0.04)       ownership 1 (0.5)
 *       media 0.03 (0.015)
 *  5. Each tile's "at the cap" words match what five points do, within a tenth:
 *     measured 0.55, 0.90, 0.80, 1.25, 0.60, 0.636 and +0.15.
 *  6. A point cannot be conjured, a tree takes five, a full board is 35, a spend
 *     never mutates, and 15 mangled blocks each read as a fresh one without
 *     touching the save around them.
 *  7. Earning: every source pays, a title outpays a .700 season, and the same
 *     good season fills the board at Club Manager's pace (measured 540 GM XP
 *     against 580, 54.6 seasons against 50.9, ratio 1.07, band 0.83 to 1.2).
 *
 * Negative controls (GMXP_CONTROL=...), each refusing to run if its text is gone:
 *   curvestep   XP_LEVEL_STEP 1.04 to 1.041 in whichever file holds the curve:
 *               section 1 red (4 sections of the fixture).
 *   gmcap       a sixth point per GM tree: section 2 red.
 *   nocap       the shared spend forgets the cap: sections 1, 2 and 6 red.
 *   saturate    ownership stops paying after two points: section 4 red on
 *               points 3 to 5, while the ends only line it prints stays 7 of 7.
 *   notneutral  negotiation shaves every ask at zero points: section 3 red.
 *   claim       media buys 0.02 a point, the tile still says fifteen: section 5
 *               red while section 4 stays green.
 * A control that leaves every check green exits 1.
 *
 * Nothing here reads the network: it bundles src/lib modules that import no
 * client, and reads only the fixture.
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
const KNOWN = ['curvestep', 'gmcap', 'nocap', 'saturate', 'notneutral', 'claim'];
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
const swapInto = (file, alias, pairs) => {
  let src = readSrc(file);
  for (const [from, to] of pairs) {
    if (!src.includes(from)) {
      console.error(`control cannot run: ${path.basename(file)} does not contain the text GMXP_CONTROL=${CONTROL} rewrites`);
      console.error(`  looked for: ${from}`);
      process.exit(1);
    }
    src = src.replace(from, to);
  }
  const copy = `${TMP}/simGmXp.${process.pid}.${path.basename(file)}`;
  fs.writeFileSync(copy, src);
  overrides[alias] = copy;
};
const HAS_GM = fs.existsSync(GM_PATH);
if (CONTROL === 'curvestep') {
  /* One constant of the level curve, nudged. Whichever file holds the curve
     (Club Manager before the lift, gmXp after it), the fixture must go red. */
  const anchor = 'export const XP_LEVEL_STEP = 1.04;';
  const holder = HAS_GM && readSrc(GM_PATH).includes(anchor) ? GM_PATH : CM_PATH;
  swapInto(holder, holder === GM_PATH ? '@/lib/gmXp' : '@/lib/clubManagerXp', [[anchor, 'export const XP_LEVEL_STEP = 1.041;']]);
} else if (CONTROL === 'gmcap') {
  /* The GM board grows a sixth point a tree: no longer Club Manager's curve. Section 2. */
  swapInto(GM_PATH, '@/lib/gmXp', [['export const GM_MAX_TREE_POINTS = 5;', 'export const GM_MAX_TREE_POINTS = 6;']]);
} else if (CONTROL === 'nocap') {
  /* The shared spend forgets the tree cap. Sections 1 (Club Manager delegates) and 6. */
  swapInto(GM_PATH, '@/lib/gmXp', [['  if (now >= set.maxPoints) return null;', '']]);
} else if (CONTROL === 'saturate') {
  /* Round 513's real defect in GM clothes: ownership stops paying after two
     points. Section 4 must catch it; the ends only line it prints must not. */
  swapInto(GM_PATH, '@/lib/gmXp', [[
    '  return Math.round(delta * (1 - points * GM_TRUST_CUSHION_PER_POINT));',
    '  return Math.round(delta * (1 - Math.min(2, points) * GM_TRUST_CUSHION_PER_POINT));',
  ]]);
} else if (CONTROL === 'notneutral') {
  /* Negotiation shaves a point off every ask even with nothing spent. Section 3. */
  swapInto(GM_PATH, '@/lib/gmXp', [
    ['  if (points <= 0) return ask;', ''],
    ['  return ask * (1 - points * GM_ASK_EDGE_PER_POINT);', '  return ask * (0.99 - points * GM_ASK_EDGE_PER_POINT);'],
  ]);
} else if (CONTROL === 'claim') {
  /* The code drifts from the tile: media buys two points of odds, the tile still
     says fifteen at the cap. Section 4 stays green (it still moves); section 5 must not. */
  swapInto(GM_PATH, '@/lib/gmXp', [['export const GM_PRESS_ODDS_PER_POINT = 0.03;', 'export const GM_PRESS_ODDS_PER_POINT = 0.02;']]);
}

/* ---------- bundle the real modules ---------- */
const ENTRY = `${TMP}/simGmXp.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/simGmXp.${process.pid}.bundle.mjs`;
fs.writeFileSync(ENTRY, [
  "export * as cm from '@/lib/clubManagerXp';",
  HAS_GM ? "export * as gm from '@/lib/gmXp';" : 'export const gm = null;',
  /* The shared front office modules, read for the real numbers each GM tree's
     consumer is handed. None of them imports anything that reaches a network. */
  "export * as talks from '@/lib/foTradeTalks';",
  "export * as mandate from '@/lib/foOwnerMandate';",
  "export * as press from '@/lib/foGmPress';",
  "export * as cuts from '@/lib/frontOfficeCuts';",
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
const { cm, gm, talks, mandate, press, cuts } = await import(pathToFileURL(BUNDLE).href);
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

if (!gm) {
  console.error('\nsimGmXp: src/lib/gmXp.ts does not exist, so only the Club Manager replay ran');
  process.exit(1);
}

/* ---------- 2. A GM climbs exactly the ladder a manager climbs ---------- */
console.log('2) The GM curve is Club Manager\'s, at every level, and so is every spend');
{
  let checked = 0;
  if (gm.GM_MAX_LEVEL !== cm.MAX_LEVEL) fail(`GM max level ${gm.GM_MAX_LEVEL}, Club Manager ${cm.MAX_LEVEL}`);
  if (gm.GM_TREES.length !== cm.SKILL_TREES.length) fail(`GM has ${gm.GM_TREES.length} trees, Club Manager ${cm.SKILL_TREES.length}`);
  if (gm.GM_MAX_TREE_POINTS !== cm.MAX_TREE_POINTS) fail(`GM tree cap ${gm.GM_MAX_TREE_POINTS}, Club Manager ${cm.MAX_TREE_POINTS}`);
  for (let l = -1; l <= cm.MAX_LEVEL + 3; l++) {
    const t = cm.xpForLevel(l);
    if (gm.xpForLevel(l) !== t) fail(`level ${l}: GM needs ${gm.xpForLevel(l)} XP, Club Manager ${t}`);
    for (const xp of [t - 1, t, t + 1]) {
      checked += 1;
      const a = `${gm.levelFor(xp, gm.GM_MAX_LEVEL)} ${gm.pointsEarned(xp, gm.GM_MAX_LEVEL)} ${gm.levelProgress(xp, gm.GM_MAX_LEVEL)}`;
      const b = `${cm.levelFor(xp)} ${cm.pointsEarned(xp)} ${cm.levelProgress(xp)}`;
      if (a !== b) fail(`at ${xp} XP the GM reads level, points, progress ${a}; Club Manager ${b}`);
    }
  }
  /* The same seeded spend walk on both seats, tree i of one standing for tree i
     of the other: every refusal and every point must land the same way. */
  const rnd = mulberry32(4242);
  const toGm = pts => Object.fromEntries(cm.SKILL_TREES.map((t, i) => [gm.GM_TREES[i], pts[t]]));
  let spends = 0;
  for (let w = 0; w < 200; w++) {
    let c = { ...cm.defaultXp(), xp: Math.floor(rnd() * (cm.xpForLevel(cm.MAX_LEVEL) + 3000)) };
    let g = { ...gm.defaultGmXp(), xp: c.xp };
    for (let s = 0; s < 40; s++) {
      const i = Math.floor(rnd() * cm.SKILL_TREES.length);
      const cr = cm.spendPoint(c, cm.SKILL_TREES[i]);
      const gr = gm.spendGmPoint(g, gm.GM_TREES[i]);
      spends += 1;
      if ((cr === null) !== (gr === null)) { fail(`walk ${w} spend ${s}: Club Manager ${cr ? 'took' : 'refused'} it, the GM ${gr ? 'took' : 'refused'} it`); break; }
      if (cr) { c = cr; g = gr; }
      if (show(toGm(c.points)) !== show(g.points) || cm.pointsFree(c) !== gm.gmPointsFree(g)) {
        fail(`walk ${w} spend ${s}: the boards diverged`); break;
      }
    }
  }
  if (!failures) ok(`${checked} XP probes over ${cm.MAX_LEVEL + 5} levels and ${spends} paired spends land the same on both seats`);
}

/* ---------- the real numbers each GM consumer is handed ---------- */
/* Read from the shared front office modules, not typed here, so a retune of the
   engine is a retune of what this harness measures. */
const REAL = (() => {
  const m = { tier: 'contend', text: '', winFloor: 0, reqLevel: 2, season: 1 };
  const out = (lvl, title = false) => ({ wins: 40, madePlayoffs: lvl >= 1, roundsWon: lvl >= 2 ? 1 : 0, reachedFinal: lvl >= 3, wonTitle: title });
  const graded = [out(0), out(1), out(2), out(3), out(3, true)].map(o => mandate.gradeSeason(m, o));
  const words = { title: 'the title', playoffs: 'the playoffs', round: 'a series', games: 82 };
  const base = { justHired: false, teamLabel: 'Test City', fired: false, wonTitle: false, gradeResult: null, tradeLine: null, seasonsPlayed: 3 };
  const facts = [{ justHired: true, seasonsPlayed: 0 }, { wonTitle: true, gradeResult: 'title' }, { gradeResult: 'badly' },
    { gradeResult: 'missed' }, { tradeLine: 'a deal' }, { gradeResult: 'met' }].map(f => ({ ...base, ...f }));
  const odds = new Set();
  for (const f of facts) for (const o of press.buildGmPresser(words, f)?.options ?? []) if (o.effect.gamble) odds.add(o.effect.gamble.odds);
  const deadNow = [1, 2.5, 4, 9, 14, 22, 35].map(salary => cuts.deadMoneyFor({ salary, years: 3, guaranteed: false }).now);
  return {
    noise: [-4, -3, -2, -1, 0, 1, 2, 3, 4],
    asks: [1.2, 4.5, 12, 30],
    deadNow,
    growth: [[1, 12], [3, 10], [6, 15]],
    premiums: [talks.FIRM_PREMIUM, talks.SOUR_PREMIUM],
    losses: graded.map(g => g.trustDelta).filter(d => d < 0),
    gains: graded.map(g => g.trustDelta).filter(d => d >= 0),
    odds: [...odds].sort(),
  };
})();
if (REAL.losses.length < 2 || REAL.odds.length < 3 || REAL.deadNow.some(d => !(d > 0))) {
  fail(`the front office numbers this harness reads came back thin: losses ${show(REAL.losses)}, odds ${show(REAL.odds)}, dead ${show(REAL.deadNow)}`);
}

/* Each GM tree, the consumer it feeds, and a reading of that consumer at p points
   over the real inputs. `dir` is the way a point must push the reading. */
const ROLLS = Array.from({ length: 1000 }, (_, i) => (i + 0.5) / 1000);
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const CONSUMERS = {
  scouting: { feeds: 'expected read error of a prospect, per scouting error the draft drew (a perfect read has nothing to fix)', dir: -1,
    read: p => REAL.noise.filter(n => n !== 0).map(n => mean(ROLLS.map(r => Math.abs(gm.scoutedNoise(n, p, r))))) },
  negotiation: { feeds: 'opening contract ask, as a share of the agent figure', dir: -1,
    read: p => REAL.asks.map(a => gm.contractAsk(a, p) / a) },
  capCraft: { feeds: 'dead money a release leaves, as a share of the shared engine figure', dir: -1,
    read: p => REAL.deadNow.map(d => gm.craftedDeadMoney(d, p) / d) },
  development: { feeds: 'a young player year of growth, as a share of the base growth', dir: 1,
    read: p => REAL.growth.map(([g, h]) => gm.developedGrowth(g, h, p) / g) },
  trading: { feeds: 'a rival premium over value, as a share of the firm and sour premiums', dir: -1,
    read: p => REAL.premiums.map(x => (gm.tradePremium(x, p) - 1) / (x - 1)) },
  ownership: { feeds: 'trust lost to a missed and a badly missed mandate', dir: -1,
    read: p => REAL.losses.map(d => -gm.cushionTrustLoss(d, p)) },
  media: { feeds: 'odds each candid or bold answer lands', dir: 1,
    read: p => REAL.odds.map(o => gm.pressOdds(o, p)) },
};

/* ---------- 3. Nothing spent is the game that shipped ---------- */
console.log('3) A GM who has spent nothing gets exactly the numbers the front office produced');
{
  const f0 = failures;
  let checked = 0;
  const xs = [-28, -16, -4, -2.5, -1, 0, 0.45, 0.97, 1, 1.02, 1.15, 2.5, 7, 30];
  for (const x of xs) {
    for (const r of [0, 0.01, 0.5, 0.99]) if (gm.scoutedNoise(x, 0, r) !== x) fail(`scoutedNoise moved ${x} at zero points`);
    const at0 = { contractAsk: gm.contractAsk(x, 0), craftedDeadMoney: gm.craftedDeadMoney(x, 0),
      developedGrowth: gm.developedGrowth(x, 3, 0), tradePremium: gm.tradePremium(x, 0),
      cushionTrustLoss: gm.cushionTrustLoss(x, 0), pressOdds: gm.pressOdds(x, 0) };
    for (const [name, v] of Object.entries(at0)) { checked += 1; if (!Object.is(v, x)) fail(`${name}(${x}) at zero points is ${v}`); }
  }
  const fresh = gm.defaultGmXp();
  for (const t of gm.GM_TREES) {
    if (gm.gmTreePoints(fresh, t) !== 0 || gm.gmTreePoints(undefined, t) !== 0) fail(`a fresh or absent block has points in ${t}`);
  }
  if (failures === f0) ok(`${checked + 4 * xs.length} readings at zero points hand back exactly what they were given; fresh and absent blocks are empty`);
}

/* ---------- 4. Every point moves its consumer, at every step ---------- */
console.log('4) Every GM tree point moves the number it feeds, at every step from 1 to the cap');
{
  /* The smallest step each tree must take, in the reading's own units. Set at
     about half the smallest step measured (header), so a tree that loses half its
     bite at any one level fails, and a tree that stops moving fails by miles. */
  const MIN_STEP = {
    scouting: 0.07, negotiation: 0.01, capCraft: 0.02, development: 0.025,
    trading: 0.04, ownership: 0.5, media: 0.015,
  };
  let endsOnly = 0;
  for (const t of gm.GM_TREES) {
    const c = CONSUMERS[t];
    if (!c) { fail(`tree ${t} has no consumer in this harness`); continue; }
    if (!gm.GM_TREE_INFO[t]) fail(`tree ${t} has no screen entry`);
    /* r[p][k]: the reading for real input k with p points. Every input, every step. */
    const r = [];
    for (let p = 0; p <= gm.GM_MAX_TREE_POINTS; p++) r.push(c.read(p));
    let worst = Infinity;
    let endsOk = true;
    r[0].forEach((_, k) => {
      for (let p = 1; p <= gm.GM_MAX_TREE_POINTS; p++) {
        const step = c.dir * (r[p][k] - r[p - 1][k]);
        worst = Math.min(worst, step);
        if (!(step >= MIN_STEP[t])) fail(`${t}: point ${p} moved input ${k} by ${step.toFixed(4)}, below the ${MIN_STEP[t]} a point must buy`);
      }
      if (!(c.dir * (r[gm.GM_MAX_TREE_POINTS][k] - r[0][k]) >= MIN_STEP[t])) endsOk = false;
    });
    if (endsOk) endsOnly += 1;
    const avg = r.map(row => mean(row).toFixed(4)).join(c.dir > 0 ? ' < ' : ' > ');
    console.log(`   ${t} (${c.feeds}), mean over ${r[0].length} real inputs: ${avg}`);
    if (worst >= MIN_STEP[t]) ok(`${t}: smallest step over every input and level ${worst.toFixed(4)} (floor ${MIN_STEP[t]})`);
  }
  /* What a 0 against the cap check would have said. It is printed, never relied
     on: GMXP_CONTROL=saturate keeps it green while the per step check goes red. */
  console.log(`   (an ends only check passes ${endsOnly} of ${gm.GM_TREES.length} trees)`);
}

/* ---------- 5. What each tile promises is what the code applies ---------- */
console.log('5) Each tile\'s "at the cap" line matches what five points actually do');
{
  /* The claim in GM_TREE_INFO[t].atMax, as a number, and the reading it is about:
     the capped reading over the untouched one (media: the odds added). Within a
     tenth either way, so the words cannot drift from the code. */
  const CLAIM = {
    scouting: { says: 'a little over half', want: 0.55, of: 'ratio' },
    negotiation: { says: 'about a tenth off', want: 0.9, of: 'ratio' },
    capCraft: { says: 'about a fifth less', want: 0.8, of: 'ratio' },
    development: { says: 'about a quarter more', want: 1.25, of: 'ratio' },
    trading: { says: 'about 40 percent less', want: 0.6, of: 'ratio' },
    ownership: { says: 'about a third less', want: 2 / 3, of: 'ratio' },
    media: { says: '15 points more often', want: 0.15, of: 'gain' },
  };
  for (const t of gm.GM_TREES) {
    const c = CONSUMERS[t];
    const cl = CLAIM[t];
    const text = gm.GM_TREE_INFO[t]?.atMax ?? '';
    if (!text.toLowerCase().includes(cl.says)) { fail(`${t}: the tile no longer says "${cl.says}" (it says "${text}"), recheck the claim`); continue; }
    const lo = mean(c.read(0));
    const hi = mean(c.read(gm.GM_MAX_TREE_POINTS));
    const got = cl.of === 'ratio' ? hi / lo : hi - lo;
    if (Math.abs(got - cl.want) > Math.abs(cl.want) * 0.1) fail(`${t}: the tile says "${cl.says}" but five points give ${got.toFixed(3)}`);
    else ok(`${t}: "${cl.says}" and five points give ${got.toFixed(3)}`);
  }
}

/* ---------- 6. Points cannot be conjured, overfilled or taken back; the block fails closed ---------- */
console.log('6) Spending rules hold for a GM, and a mangled block resets alone');
{
  const f0 = failures;
  const fresh = gm.defaultGmXp();
  if (gm.spendGmPoint(fresh, 'scouting') !== null) fail('a GM with no XP bought a point');
  const rich = { ...fresh, xp: gm.xpForLevel(gm.GM_MAX_LEVEL) + 10 };
  let b = rich;
  let bought = 0;
  for (let i = 0; i < gm.GM_MAX_TREE_POINTS + 3; i++) { const n = gm.spendGmPoint(b, 'trading'); if (n) { b = n; bought += 1; } }
  if (bought !== gm.GM_MAX_TREE_POINTS) fail(`a rich GM put ${bought} points into one tree, the cap is ${gm.GM_MAX_TREE_POINTS}`);
  if (gm.spendGmPoint(rich, 'bogus') !== null) fail('a point went into a tree that does not exist');
  if (rich.points.trading !== 0) fail('spending mutated the block it was handed');
  const all = gm.GM_TREES.reduce(acc => {
    let x = acc;
    for (const t of gm.GM_TREES) for (let i = 0; i < gm.GM_MAX_TREE_POINTS; i++) x = gm.spendGmPoint(x, t) ?? x;
    return x;
  }, rich);
  if (gm.pointsSpent(gm.GM_TREE_SET, all) !== gm.GM_MAX_LEVEL - 1) fail(`a maxed GM spent ${gm.pointsSpent(gm.GM_TREE_SET, all)} points, the board holds ${gm.GM_MAX_LEVEL - 1}`);
  if (gm.gmPointsFree(all) !== 0) fail('a full board still shows free points');

  const garbage = [undefined, null, 7, 'x', [], {}, { ...fresh, v: 2 }, { ...fresh, xp: -1 }, { ...fresh, xp: NaN },
    { ...fresh, xp: '9' }, { ...fresh, points: null }, { ...fresh, points: { ...fresh.points, media: 6 } },
    { ...fresh, points: { ...fresh.points, ownership: 1.5 } }, { ...fresh, points: { ...fresh.points, scouting: -1 } },
    { v: 1, xp: 50, points: { scouting: 1 } }];
  garbage.forEach((g, i) => {
    if (gm.isValidGmXp(g)) fail(`garbage #${i} passed as a GM block`);
    if (show(gm.gmXpOf(g)) !== show(fresh)) fail(`garbage #${i} did not read as a fresh block`);
  });
  const good = { v: 1, xp: 5000, points: { ...fresh.points, ownership: 3 } };
  if (!gm.isValidGmXp(good) || gm.gmXpOf(good) !== good) fail('a sound block was not read as itself');
  /* A save with a mangled block: reading it touches nothing else and repairs nothing in place. */
  const save = { season: 4, champions: ['A', 'B'], gmXp: { v: 1, xp: 'lots' } };
  const before = JSON.stringify(save);
  const read = gm.gmXpOf(save.gmXp);
  if (JSON.stringify(save) !== before || show(read) !== show(fresh)) fail('reading a mangled block changed the save or did not reset the block');
  if (failures === f0) ok(`cap ${gm.GM_MAX_TREE_POINTS} a tree, ${gm.GM_MAX_LEVEL - 1} points a board, ${garbage.length} mangled blocks reset alone`);
}

/* ---------- 7. Earning it, and how long the board takes ---------- */
console.log('7) A GM earns at Club Manager\'s pace, and achievements outpay volume');
{
  const f0 = failures;
  const base = { winPct: 0.5, titles: 0, playoffRoundsWon: 0, mandateSteps: 0, placesAboveExpectation: 0, prospectsGraduated: 0 };
  const t0 = gm.gmSeasonXp(base).total;
  for (const [k, v] of Object.entries({ winPct: 0.6, titles: 1, playoffRoundsWon: 1, mandateSteps: 1, placesAboveExpectation: 1, prospectsGraduated: 1 })) {
    if (!(gm.gmSeasonXp({ ...base, [k]: v }).total > t0)) fail(`more ${k} did not pay more`);
  }
  const winning = gm.gmSeasonXp({ ...base, winPct: 0.7 }).total;
  const title = gm.gmSeasonXp({ ...base, titles: 1 }).total;
  if (!(title > winning)) fail(`a title (${title}) did not outpay a .700 season (${winning})`);
  if (gm.gmSeasonXp({ ...base, winPct: NaN, titles: -2, mandateSteps: 9 }).total !== 2 * gm.GM_XP_PER_MANDATE_STEP) fail('garbage season input was not cleaned');
  for (const [r, n] of [['title', 2], ['overachieved', 2], ['met', 1], ['missed', 0], ['badly', 0]]) {
    if (gm.mandateSteps(r) !== n) fail(`mandate ${r} counted ${gm.mandateSteps(r)} steps`);
  }
  /* The same good season, priced by each seat. Measured 540 GM against 580 Club
     Manager, so the GM board fills in about 1.07 times the seasons; the band is
     a sixth either way, wide of that and narrow enough to catch a doubled rate. */
  const gmGood = gm.gmSeasonXp({ winPct: 0.6, titles: 1, playoffRoundsWon: 3, mandateSteps: 2, placesAboveExpectation: 2, prospectsGraduated: 1 }).total;
  const cmGood = cm.seasonXp({ wins: 20, trophies: 1, objectivesMet: 2, placesAboveExpectation: 2, youthPromoted: 1, euroRoundsReached: 3, soldMoreThanBought: true }).total;
  const board = gm.xpForLevel(gm.GM_MAX_LEVEL);
  const ratio = (board / gmGood) / (board / cmGood);
  console.log(`   good season: GM ${gmGood} XP, Club Manager ${cmGood}; whole board ${board} XP = ${(board / gmGood).toFixed(1)} GM seasons, ${(board / cmGood).toFixed(1)} Club Manager seasons`);
  if (ratio < 5 / 6 || ratio > 6 / 5) fail(`a GM fills the board in ${ratio.toFixed(2)} times Club Manager's seasons`);
  if (failures === f0) ok(`every source pays, a title beats a .700 season (${title} to ${winning}), pace ratio ${ratio.toFixed(2)}`);
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
