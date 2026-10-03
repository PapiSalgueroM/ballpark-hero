/**
 * Round 973: Soccer Career's academy year, its report card and its one focus
 * (src/lib/soccerCareerAcademy.ts, applied inside advanceYouthYear, shown by
 * src/components/soccer-career/AcademyReportCard.tsx).
 *
 *   1. No focus is main, byte for byte. The tree this branch grew from (git
 *      merge-base HEAD origin/main, archived to a temp folder and bundled
 *      beside this tree) and this tree drive the same seeded careers from
 *      initCareer through the academy year, the contract and the first pro
 *      seasons, and the whole save must match after every step. On this tree
 *      the report is built at the academy step exactly as the page builds it,
 *      so a report that drew from Math.random would part the two streams.
 *      A career that picks a focus and then drops it must match too.
 *   2. Every focus moves only its own family, by the printed amount. Each
 *      seed is played twice from the same dice, once with no focus and once
 *      with each family the position offers (six, seven for a keeper): the
 *      focused family must come out exactly the printed amount above the
 *      no focus arm, every other stat identical, and the save, the report and
 *      the card must all name that same amount. The amount is read off the
 *      picker's own rendered words, so the promise is what is checked.
 *   3. Potential stays the ceiling (the Round 96 and 116 rule). The printed
 *      ladder is walked one overall at a time against four ceilings, and on
 *      the real careers of part 2 the focus never lifts a career past its
 *      ceiling, with every rung (2, 1 and 0) seen on real saves.
 *   4. The report tells the truth: every line is the after minus the before
 *      of the real saves, it is built twice the same, it draws nothing, the
 *      cup run does not move with the focus, and the card prints what the
 *      report holds.
 *   5. Old and corrupt saves: a save sitting in the academy with no field
 *      plays on, and a focus that is not one of the position's families
 *      (a corrupt or hand edited save) moves no stat at all.
 *
 * Negative controls (SIM_CAREER_ACADEMY_CONTROL), each must turn its section
 * red, each patch refused unless its exact text is in the file:
 *   alwayswrite   the year writes academyFocusAdded with no focus  -> section 1
 *   drawinreport  the report picks its cup run with Math.random     -> sections 1 and 4
 *   leak          the focus also adds a point to a second family   -> section 2
 *   wrongprint    the picker promises one more than the year adds  -> sections 2 and 3
 *   nocap         the ladder ignores the ceiling                   -> sections 2 and 3
 *   cardlie       the card prints the before value as the after    -> section 4
 *   corrupt       a foreign focus is trusted without a check       -> section 5
 *
 * MEASURED on the round's tree, seeds 0 to 4 (SIM_CAREER_ACADEMY_SEED):
 *   section 1: 2,838 to 2,990 saves compared against the merge base, 60 of
 *     60 academy years each with a report, every save identical.
 *   section 2: 427 focused academy years a seed; the rungs came up as
 *     +2 x177 to x184, +1 x157 to x164, 0 x86 (the 0 rung is the 14 legacy
 *     saves whose ceiling sits on or under the overall). Floors are about
 *     half the lowest: +2 at least 90, +1 at least 75, 0 at least 40. These
 *     are coverage floors (the rung has to be exercised), never a max.
 *   section 3: 0 careers lifted past their ceiling on every seed.
 *   section 4: 2,611 report lines a seed, 0 wrong, 0 draws, 0 unstable.
 *   Each run takes 14 to 20 seconds plus the two bundles.
 *   Controls: all seven FIRED on their own sections (alwayswrite also turns 2
 *   and 5 red, since the stray field shows on the no focus and corrupt arms).
 *
 * Run: node scripts/simCareerAcademy.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_CAREER_ACADEMY_CONTROL ?? '';
const ACADEMY = 'src/lib/soccerCareerAcademy.ts';
const CARD = 'src/components/soccer-career/AcademyReportCard.tsx';
const CONTROLS = {
  alwayswrite: { file: ACADEMY, from: '  if (!focus) return 0;\n  const before = s[focus];', to: '  if (!focus) { s.academyFocusAdded = 0; return 0; }\n  const before = s[focus];' },
  drawinreport: { file: ACADEMY, from: '(h % 4) + lift', to: 'Math.floor(Math.random() * 4) + lift' },
  leak: { file: ACADEMY, from: '  s.academyFocusAdded = s[focus] - before;', to: '  s.academyFocusAdded = s[focus] - before;\n  s[focus === "pace" ? "physical" : "pace"] += 1;' },
  wrongprint: { file: ACADEMY, from: '`+${ACADEMY_FOCUS_BONUS} to that skill', to: '`+${ACADEMY_FOCUS_BONUS + 1} to that skill' },
  nocap: { file: ACADEMY, from: '  if (!(overall < potential)) return 0;\n  if (overall >= potential - ACADEMY_FOCUS_NEAR) return 1;\n', to: '' },
  cardlie: { file: CARD, from: '{l.after} <span', to: '{l.before} <span' },
  corrupt: { file: ACADEMY, from: '  return academyFocusOptions(s.position).some(o => o.key === f) ? (f as AcademyFocus) : null;', to: '  return f as AcademyFocus;' },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}`); process.exit(2); }

let failures = 0;
const sectionFails = {};
let section = 0;
const fail = msg => { failures += 1; sectionFails[section] = (sectionFails[section] ?? 0) + 1; if (sectionFails[section] <= 8) console.log(`   FAIL ${msg}`); };
const check = (ok, msg) => { if (!ok) fail(msg); };

const require = createRequire(path.join(ROOT, 'package.json'));
const esbuild = require('esbuild');
const MODULES = path.dirname(path.dirname(require.resolve('react/package.json')));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `careeracademy-${process.pid}-`));

/** Bundles one tree's engine (and, when `withAcademy`, the academy module and
    its cards). `patches` replace exact text as files load; nothing on disk is
    written, and a patch whose text is missing refuses to run. */
async function bundle(root, name, { withAcademy, patches = [] }) {
  const R = root.replaceAll('\\', '/');
  const entry = path.join(TMP, `${name}.tsx`);
  const out = path.join(TMP, `${name}.cjs`);
  fs.writeFileSync(entry, [
    "import * as React from 'react';",
    "import { renderToStaticMarkup } from 'react-dom/server';",
    `export * as soccer from '${R}/src/lib/soccerCareerEngine.ts';`,
    ...(withAcademy ? [
      `export * as academy from '${R}/${ACADEMY}';`,
      `import * as cards from '${R}/${CARD}';`,
      'export const renderReport = report => renderToStaticMarkup(React.createElement(cards.AcademyReportCard, { report }));',
      'export const renderPicker = (position, focus) => renderToStaticMarkup(React.createElement(cards.AcademyFocusPicker, { position, focus, onPick: () => undefined }));',
    ] : []),
  ].join('\n'));
  const norm = p => p.replaceAll('\\', '/').toLowerCase();
  const applied = new Set();
  const plugin = {
    name: 'academy-patch',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, async args => {
        const mine = patches.filter(p => norm(path.join(root, p.file)) === norm(args.path));
        if (!mine.length) return undefined;
        let src = await fs.promises.readFile(args.path, 'utf8');
        for (const p of mine) {
          const eol = !src.includes(p.from) && src.includes(p.from.replaceAll('\n', '\r\n')) ? '\r\n' : '\n';
          const from = p.from.replaceAll('\n', eol);
          if (!src.includes(from)) throw new Error(`control refused: ${p.file} does not contain ${JSON.stringify(p.from.slice(0, 80))}`);
          if (src.split(from).length !== 2) throw new Error(`control refused: ${p.file} contains its text more than once`);
          src = src.replace(from, p.to.replaceAll('\n', eol));
          applied.add(p);
        }
        return { contents: src, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    },
  };
  await esbuild.build({
    entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
    alias: { '@': `${R}/src` }, nodePaths: [MODULES], absWorkingDir: root,
    define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    outfile: out, logLevel: 'error', plugins: [plugin],
  });
  for (const p of patches) if (!applied.has(p)) throw new Error(`control refused: ${p.file} was never loaded`);
  return require(out);
}

/* The tree this branch grew from, written out of git object by object (no
   tar, no checkout: nothing in the working tree or the index is touched). */
function writeBaseTree() {
  const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 30 });
  const base = git(['merge-base', 'HEAD', 'origin/main']).toString().trim();
  const dir = path.join(TMP, 'base');
  const entries = git(['ls-tree', '-r', '-z', base, 'src']).toString().split('\0').filter(Boolean)
    .map(line => { const [meta, file] = line.split('\t'); return { sha: meta.split(' ')[2], file }; });
  const blob = execFileSync('git', ['cat-file', '--batch'], {
    cwd: ROOT, input: entries.map(e => e.sha).join('\n') + '\n', maxBuffer: 1 << 30,
  });
  let at = 0;
  for (const e of entries) {
    const nl = blob.indexOf(10, at);
    const size = Number(blob.subarray(at, nl).toString().split(' ')[2]);
    const target = path.join(dir, e.file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, blob.subarray(nl + 1, nl + 1 + size));
    at = nl + 1 + size + 1;
  }
  return { base, dir, files: entries.length };
}

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const REAL_RANDOM = Math.random;
/* SIM_CAREER_ACADEMY_SEED shifts every seed, for measuring the bands; the
   committed bands hold on the default 0 and were checked on 1 to 4. */
const SEED_SHIFT = (Number(process.env.SIM_CAREER_ACADEMY_SEED ?? 0) | 0) * 1000003;
const seeded = seed => { Math.random = mulberry32(seed + SEED_SHIFT); };
const unseed = () => { Math.random = REAL_RANDOM; };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const NATS = ['England', 'Brazil', 'France', 'Spain', 'Argentina', 'Nigeria', 'Japan', 'Norway', 'Germany', 'Mexico'];
const POSITIONS = ['ST', 'LW', 'CAM', 'RW', 'CM', 'CB', 'GK', 'CDM', 'LB', 'RB'];
const ERAS = [
  { value: '1990-94', startYear: 1990 }, { value: '2000-04', startYear: 2000 },
  { value: '2010-14', startYear: 2010 }, { value: '2015-19', startYear: 2015 },
  { value: '2020-24', startYear: 2020 }, { value: '2025', startYear: 2025 },
];
/* Ceilings from the tightest initCareer allows (overall + 2) to wide open, so
   the near and at ceiling rungs come up on real saves, not only in the walk. */
const HEADROOM = [2, 3, 4, 6, 9, 14, 22, 0, -1];
const STATS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];

function newCareer(soccer, c) {
  const era = ERAS[c % ERAS.length];
  const o = 48 + ((c * 7) % 31);
  const h = HEADROOM[c % HEADROOM.length];
  const flat = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
  const s = soccer.initCareer(
    `Academy Probe ${c}`, NATS[c % NATS.length], POSITIONS[(c * 3) % POSITIONS.length], era.value,
    flat, o, era.startYear, soccer.FALLBACK_CLUBS, null, Math.min(99, o + Math.max(2, h)),
  );
  /* Round 159's legacy shape: a save whose rolled ceiling sits on or under
     its overall (the build editor once out-typed the roll). initCareer no
     longer writes one, but saves like it exist, and they are the only way
     the at ceiling rung comes up on a real academy year. */
  if (h < 2) s.potential = o + h;
  return s;
}

const tierOf = o => o?.club?.tier ?? o?.clubTier ?? 9;
const bestOffer = offers => [...offers].sort((a, b) => tierOf(a) - tierOf(b) || (b.wage ?? 0) - (a.wage ?? 0))[0];

/** One step of a career, the same choice every time for the same save. */
function step(soccer, s, clubs) {
  switch (s.phase) {
    case 'youth': return soccer.advanceYouthYear(s, clubs);
    case 'contract_offer': return s.pendingOffers?.length ? soccer.acceptOffer(s, bestOffer(s.pendingOffers)) : { ...s, phase: 'playing' };
    case 'playing': return soccer.advanceProSeason(s, clubs);
    case 'newspaper': return soccer.dismissNewspaper(s);
    case 'season_summary': return soccer.dismissSummary(s, clubs);
    case 'ballon_dor': return soccer.dismissBallonDor(s, clubs);
    case 'international_debut': return soccer.dismissDebut(s, clubs);
    case 'world_cup': return soccer.dismissWorldCup(s, clubs);
    case 'rivalry_event': return soccer.dismissRivalryEvent(s, clubs);
    case 'social_media_action': return soccer.dismissSocialMediaPhase(s, clubs);
    case 'moral_dilemma': {
      const next = soccer.applyMoralDilemmaChoice(s, 0);
      return next.phase === 'moral_dilemma' ? soccer.dismissMoralDilemma(next, clubs) : next;
    }
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      return ev?.choices?.length ? soccer.applyEventChoice(s, 0, clubs) : { ...s, phase: 'playing', pendingEvents: [] };
    }
    case 'red_card_appeal_result': return soccer.dismissAppealResult(s, clubs);
    case 'rehab_choice': return soccer.applyRehabChoice(s, 0);
    case 'transfer_window': return soccer.stayAtClub(s);
    case 'retirement_suggestion': return soccer.declineRetirementSuggestion(s, clubs);
    default: return null;
  }
}

const CONTROL_SECTIONS = {
  alwayswrite: [1], drawinreport: [1, 4], leak: [2], wrongprint: [2, 3], nocap: [2, 3], cardlie: [4], corrupt: [5],
};
const counted = fn => {
  const inner = Math.random;
  let n = 0;
  Math.random = () => { n += 1; return inner(); };
  try { return { value: fn(), draws: n }; } finally { Math.random = inner; }
};
const signed = n => (n > 0 ? `+${n}` : `${n}`);

async function main() {
  const t0 = Date.now();
  if (CONTROL) console.log(`CONTROL ${CONTROL} active: section ${CONTROL_SECTIONS[CONTROL].join(' and ')} must go red\n`);
  const { base, dir, files } = writeBaseTree();
  const here = await bundle(ROOT, 'here', { withAcademy: true, patches: CONTROL ? [CONTROLS[CONTROL]] : [] });
  const was = await bundle(dir, 'base', { withAcademy: false });
  const { soccer, academy } = here;
  const clubs = soccer.FALLBACK_CLUBS;
  console.log(`bundled this tree and ${base.slice(0, 8)} (${files} files under src) in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  /* 1 */
  section = 1;
  console.log('1) No focus is main, byte for byte');
  const CAREERS1 = 60, PRO_SEASONS = 3;
  let compared = 0, youthSteps = 0, reports1 = 0;
  for (let c = 0; c < CAREERS1; c += 1) {
    const trails = {};
    for (const arm of ['base', 'here', 'cleared']) {
      const eng = arm === 'base' ? was.soccer : soccer;
      seeded(c * 7919 + 13);
      let s = newCareer(eng, c);
      if (arm === 'cleared') {
        const pick = academy.academyFocusOptions(s.position)[c % 6].key;
        s = academy.withAcademyFocus(academy.withAcademyFocus(s, pick), null);
      }
      const trail = [JSON.stringify(s)];
      let pro = 0, guard = 0;
      while (pro < PRO_SEASONS && guard++ < 150) {
        if (s.phase === 'playing') pro += 1;
        const next = step(eng, s, clubs);
        if (!next) { trail.push(`(no driver for phase ${s.phase})`); break; }
        if (arm !== 'base' && s.phase === 'youth') {
          /* exactly what the page does at the press */
          const r = academy.buildAcademyReport(s, next, soccer.effectivePotential(s));
          if (arm === 'here') { youthSteps += 1; if (r) reports1 += 1; }
        }
        s = next;
        trail.push(JSON.stringify(s));
      }
      unseed();
      trails[arm] = trail;
    }
    for (const arm of ['here', 'cleared']) {
      const a = trails.base, b = trails[arm];
      const at = a.findIndex((x, i) => x !== b[i]);
      if (at >= 0 || a.length !== b.length) {
        const i = at >= 0 ? at : Math.min(a.length, b.length);
        fail(`career ${c} (${arm}) parts from ${base.slice(0, 8)} at step ${i} of ${a.length}: phase ${JSON.parse(a[i] ?? '{}').phase ?? '?'}`);
      }
      compared += a.length;
    }
  }
  console.log(`   ${CAREERS1} careers, ${compared} saves compared against ${base.slice(0, 8)}, ${youthSteps} academy years, ${reports1} reports built`);
  check(youthSteps === CAREERS1 && reports1 === CAREERS1, `every career should play one academy year and get one report (${youthSteps} years, ${reports1} reports)`);
  check(compared >= CAREERS1 * 2 * 8, `too few saves compared (${compared}), the check cannot prove much`);

  /* The promise, read off the picker's own words for an outfielder and a keeper. */
  const RULE = /\+(\d+) to that skill on top of the year&#x27;s normal growth, \+(\d+) if the year leaves you within (\d+) of your ceiling, nothing once you are on it\./;
  const printed = {};
  for (const pos of ['ST', 'GK']) {
    const m = here.renderPicker(pos, null).match(RULE);
    if (!m) { fail(`the ${pos} picker does not print the focus rule`); continue; }
    printed[pos] = { bonus: Number(m[1]), nearBonus: Number(m[2]), near: Number(m[3]) };
  }
  const promise = printed.ST ?? { bonus: NaN, nearBonus: NaN, near: NaN };
  const ladder = (overall, pot) => (overall >= pot ? 0 : overall >= pot - promise.near ? promise.nearBonus : promise.bonus);

  /* 2, 3 and 4 share the runs: each seed with no focus, then with every focus. */
  const CAREERS2 = 70;
  const rungs = { 0: 0, 1: 0, 2: 0 };
  let runs = 0, breaches = 0, nearSeen = 0, reportDraws = 0, reportsBuilt = 0, cardLines = 0;
  const truth = { lines: 0, wrong: 0, cupMoved: 0, unstable: 0 };
  const sec = (n, ok, msg) => { const was = section; section = n; check(ok, msg); section = was; };
  for (let c = 0; c < CAREERS2; c += 1) {
    const start = () => { seeded(c * 104729 + 7); const s = newCareer(soccer, c); unseed(); return s; };
    const play = s => { seeded(c * 31 + 5); const out = soccer.advanceYouthYear(s, clubs); unseed(); return out; };
    const before0 = start();
    const pot = soccer.effectivePotential(before0);
    const plain = play(before0);
    const plainReport = academy.buildAcademyReport(start(), plain, pot);
    sec(2, plain.academyFocusAdded === undefined && !('academyFocus' in plain), `career ${c}: the no focus arm wrote a focus field`);
    sec(4, plainReport && plainReport.focus === null, `career ${c}: the no focus report names a focus`);
    for (const opt of academy.academyFocusOptions(before0.position)) {
      runs += 1;
      const picked = academy.withAcademyFocus(start(), opt.key);
      const after = play(academy.withAcademyFocus(start(), opt.key));
      const want = Math.min(ladder(plain.overall, pot), 99 - plain[opt.key]);
      const got = after[opt.key] - plain[opt.key];
      rungs[got] = (rungs[got] ?? 0) + 1;
      if (plain.overall >= pot - promise.near) nearSeen += 1;
      sec(2, got === want, `career ${c} ${before0.position} focus ${opt.key}: moved ${signed(got)}, the picker promises ${signed(want)} (overall ${plain.overall}, ceiling ${pot})`);
      for (const k of STATS) {
        if (k !== opt.key) sec(2, after[k] === plain[k], `career ${c} focus ${opt.key}: ${k} moved ${signed(after[k] - plain[k])} and it was not the focus`);
      }
      sec(2, after.academyFocusAdded === got, `career ${c} focus ${opt.key}: the save says it added ${after.academyFocusAdded}, it added ${got}`);
      if (plain.overall <= pot && after.overall > pot) breaches += 1;

      const built = counted(() => academy.buildAcademyReport(picked, after, pot));
      reportDraws += built.draws;
      const r = built.value;
      if (!r) { sec(4, false, `career ${c} focus ${opt.key}: no report for a real academy year`); continue; }
      reportsBuilt += 1;
      if (JSON.stringify(r) !== JSON.stringify(academy.buildAcademyReport(picked, after, pot))) truth.unstable += 1;
      sec(2, r.focus?.key === opt.key && r.focus?.added === got, `career ${c} focus ${opt.key}: the report says ${r.focus?.key} ${r.focus?.added}, the year added ${got}`);
      if (r.cupLine !== plainReport?.cupLine) truth.cupMoved += 1;
      for (const l of r.lines) {
        truth.lines += 1;
        if (l.before !== picked[l.key] || l.after !== after[l.key] || l.delta !== after[l.key] - picked[l.key] || l.focus !== (l.key === opt.key)) truth.wrong += 1;
      }
      sec(4, r.overallBefore === picked.overall && r.overallAfter === after.overall, `career ${c}: the report's overall ${r.overallBefore} to ${r.overallAfter} is not the saves' ${picked.overall} to ${after.overall}`);
      const row = after.seasons[after.seasons.length - 1];
      sec(4, r.apps === row.apps && r.goals === row.goals && r.assists === row.assists && r.year === row.year, `career ${c}: the report's season line is not the season row`);
      const html = here.renderReport(r);
      for (const l of r.lines) {
        cardLines += 1;
        const seg = html.split(`data-academy-line="${l.key}"`)[1]?.split('data-academy-line=')[0] ?? '';
        sec(4, seg.includes(`>${l.after} <span`) && seg.includes(`>${signed(l.delta)}</span>`), `career ${c}: the card's ${l.key} line does not print ${l.after} ${signed(l.delta)}`);
      }
      sec(2, html.includes(academy.academyFocusResultLine(r.focus).replaceAll("'", '&#x27;')), `career ${c} focus ${opt.key}: the card does not print the focus line`);
    }
  }
  section = 2;
  console.log('\n2) Every focus moves only its own family, by the printed amount');
  console.log(`   printed: +${promise.bonus}, +${promise.nearBonus} within ${promise.near} of the ceiling (keeper card: ${JSON.stringify(printed.GK)})`);
  console.log(`   ${CAREERS2} careers, ${runs} focused academy years, moved by: +2 x${rungs[2]}, +1 x${rungs[1]}, 0 x${rungs[0]}`);
  check(JSON.stringify(printed.ST) === JSON.stringify(printed.GK), 'the keeper picker prints a different rule from the outfield one');
  check(runs >= CAREERS2 * 6, `too few focused years (${runs})`);

  /* 3 */
  section = 3;
  console.log('\n3) Potential stays the ceiling');
  let walked = 0;
  for (const pot of [60, 75, 88, 99]) {
    for (let o = pot - 8; o <= pot + 2; o += 1) {
      walked += 1;
      check(academy.academyFocusBonus(o, pot) === ladder(o, pot), `overall ${o} under a ${pot} ceiling: the year adds ${academy.academyFocusBonus(o, pot)}, the picker promises ${ladder(o, pot)}`);
    }
  }
  check(academy.academyFocusBonus(70, 70) === 0 && academy.academyFocusBonus(75, 70) === 0, 'a focus still adds on or past the ceiling');
  console.log(`   ${walked} rungs walked against four ceilings; ${breaches} real careers lifted past their ceiling by a focus; ${nearSeen} focused years started the rule within ${promise.near} of the ceiling`);
  check(breaches === 0, `${breaches} focused academy years ended above a ceiling the plain year stayed under`);
  check(rungs[2] >= 90 && rungs[1] >= 75 && rungs[0] >= 40, `every rung has to come up on real saves (+2 x${rungs[2]}, +1 x${rungs[1]}, 0 x${rungs[0]})`);

  /* 4 */
  section = 4;
  console.log('\n4) The report tells the truth');
  console.log(`   ${reportsBuilt} reports, ${truth.lines} lines (${truth.wrong} wrong), ${cardLines} card lines, ${reportDraws} draws, ${truth.unstable} unstable, cup moved by a focus ${truth.cupMoved} times`);
  check(reportsBuilt === runs, `${runs - reportsBuilt} academy years got no report`);
  check(truth.wrong === 0, `${truth.wrong} report lines are not the after minus the before of the saves`);
  check(reportDraws === 0, `building the reports drew ${reportDraws} times from Math.random`);
  check(truth.unstable === 0, `${truth.unstable} reports came out different the second time`);
  check(truth.cupMoved === 0, `the cup run moved with the focus ${truth.cupMoved} times`);
  check(truth.lines >= runs * 6, 'too few report lines to prove anything');

  /* 5 */
  section = 5;
  console.log('\n5) Old and corrupt saves');
  let corruptRuns = 0, reloads = 0;
  for (let c = 0; c < 30; c += 1) {
    const start = () => { seeded(c * 104729 + 7); const s = newCareer(soccer, c); unseed(); return s; };
    const play = s => { seeded(c * 31 + 5); const out = soccer.advanceYouthYear(s, clubs); unseed(); return out; };
    const plain = play(start());
    const outfield = start().position !== 'GK';
    for (const bad of ['banana', 7, null, {}, 'overall', ...(outfield ? ['reflexes'] : [])]) {
      corruptRuns += 1;
      const after = play({ ...start(), academyFocus: bad });
      const moved = STATS.filter(k => after[k] !== plain[k]);
      check(moved.length === 0, `career ${c}: a corrupt focus ${JSON.stringify(bad)} moved ${moved.join(', ')}`);
      check(after.academyFocusAdded === undefined, `career ${c}: a corrupt focus ${JSON.stringify(bad)} wrote academyFocusAdded ${after.academyFocusAdded}`);
    }
    /* A focused save written to storage and read back plays the same year. */
    const pick = academy.academyFocusOptions(start().position)[c % 6].key;
    const direct = play(academy.withAcademyFocus(start(), pick));
    const loaded = play(soccer.repairCareer(JSON.parse(JSON.stringify(academy.withAcademyFocus(start(), pick)))));
    reloads += 1;
    check(STATS.every(k => loaded[k] === direct[k]) && loaded.academyFocusAdded === direct.academyFocusAdded,
      `career ${c}: a focused save read back from storage plays a different year`);
  }
  console.log(`   ${corruptRuns} academy years on corrupt focus values, ${reloads} focused saves read back from storage`);

  console.log('');
  const red = Object.keys(sectionFails).map(Number).sort();
  if (CONTROL) {
    const want = CONTROL_SECTIONS[CONTROL];
    const fired = want.every(n => red.includes(n));
    console.log(`CONTROL ${CONTROL}: ${fired ? 'FIRED' : 'DID NOT FIRE'} (wanted section ${want.join(' and ')} red; red sections: ${red.join(', ') || 'none'})`);
    if (!fired) failures += 1;
  }
  console.log(failures === 0
    ? `simCareerAcademy: ALL CHECKS PASSED in ${((Date.now() - t0) / 1000).toFixed(1)}s`
    : `simCareerAcademy: ${failures} FAILURES (red sections: ${red.join(', ') || 'none'})`);
  return failures === 0 ? 0 : 1;
}

let code = 1;
try {
  code = await main();
} catch (e) {
  console.log(`simCareerAcademy: CRASHED ${e?.stack ?? e}`);
  code = 1;
} finally {
  unseed();
  fs.rmSync(TMP, { recursive: true, force: true });
}
process.exit(code);
