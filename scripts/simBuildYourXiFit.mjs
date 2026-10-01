/* Build Your XI: role fit, chemistry and balance in the season sim (Round 825).

   Master spec section 76 asked for tactical fit, chemistry and role
   compatibility in Build Your XI's simulation. The season was already World
   XI's engine (src/lib/worldXi.ts simulateWorldXiSeason); this round hands it
   three more numbers, all read off data the game already holds for the
   chosen eleven (src/lib/xiFit.ts):

     role fit   Club Manager's Round 505 table (FIT_PENALTY, lifted into
                src/lib/positionFit.ts so both games read the one copy): a
                man in a slot his recorded positions cover costs nothing, next
                door 2, another line 6, a keeper swap 14, on him, averaged
                over the eleven.
     chemistry  the shared chemistry engine (computeChemistry) told to count
                pitch neighbours only: a shared club +0.6, a shared country
                +0.2, capped at +2 for the side.
     balance    no defensive midfielder in a CM or CDM slot costs 1, a wide
                slot held by somebody who is not a wide player costs 0.5 for
                that flank.

   They move the side's rating (in squad rating points) before the league is
   played, and the report says what each was worth in league points on the
   same rolls. World XI never passes them, so its seasons are unchanged.

   This harness bundles the REAL modules from src (esbuild, with the controls
   below rewritten in memory, never on disk) and holds:

     1) Natural slots beat shuffled ones. Over 300 seeded elevens (six
        shapes), the same eleven in its natural slots against the same eleven
        shuffled across the slots. Hard: a natural eleven pays no role fit, a
        shuffled one pays exactly when somebody stands outside his slot's set,
        and with only role fit applied the natural season never takes fewer
        points (same rolls, never a lower rating). BANDS (from measurement,
        see T): the mean points gap with role fit alone, and with all three.
     2) A chemistry link exists only where the data shows it (hard). Every
        link joins two pitch neighbours whose rows carry the same club (or
        the same first nationality) and says which; every neighbour pair that
        shares one has its link; no link touches an empty slot. The layout the
        links read is checked against a line table of this harness's own: the
        keeper only neighbours his back line, no pair spans two lines, and a
        left sided slot sits left of every central slot in its line (the 3-5-2
        used to draw its left wing back on the right).
     3) Every bonus and penalty stays inside its stated bound (hard). Grades
        match the shared rule, role fit sits in [-14, 0], chemistry in
        [0, cap] and the cap binds on an eleven of one club and one country,
        balance in [-(holding + two flanks), 0], the total is the sum, and the
        rules dialog states the same numbers the engine uses. In the season:
        each factor's worth replays (whatIfFinish on the same rolls) to the
        number printed, role fit and balance never gain points, chemistry
        never loses any, and the match rating is the paper rating plus the
        total.
     4) World XI is unchanged. A sha256 over 240 seeded World XI seasons
        (every shape) must equal the digest recorded below, measured on
        origin/main 5497751d before this round touched the engine. And a
        Build Your XI eleven handed a zero breakdown plays exactly the season
        it played with none.
     5) Old reports render. The report tiles render nothing for a report with
        no fit block, the shared report tabs render a pre Round 726 report,
        and the breakdown, its three detail views and the worth tiles render
        for full and half built elevens.

   MEASURED (2026-10-01, BYXI_SEED 0 to 5, 300 elevens each), points the
   natural eleven took over the shuffled one, mean:
     role fit only    see T.roleGap below
     all three        see T.totalGap below
   (the measured numbers and the floors are written next to T.)

   NEGATIVE CONTROLS, BYXI_CONTROL=<name>. Each rewrites one string in one
   source file at bundle time, refuses to run unless that string occurs
   exactly once, and passes only when the section it names goes red and no
   other section does:
     nofit     role fit reads every man as natural.          section 1
     farlinks  chemistry counts every pair, not neighbours.   section 2
     nocap     the chemistry cap is gone.                     section 3
     leak      World XI's season gets a half point nudge.     section 4
     oldcrash  the worth tiles read a report's fit unguarded. section 5

   Run: node scripts/simBuildYourXiFit.mjs
        BYXI_SEED=3 node scripts/simBuildYourXiFit.mjs   (another sample)
        BYXI_PRINT_DIGEST=1 node scripts/simBuildYourXiFit.mjs (World XI digest only)
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.BYXI_CONTROL || '';
const SEED = Number(process.env.BYXI_SEED) || 0;
const PRINT_DIGEST = process.env.BYXI_PRINT_DIGEST === '1';
const lf = s => s.replaceAll('\r\n', '\n');

/* World XI's seasons as they were before this round: sha256 over 240 seeded
   squads, every shape, measured on origin/main 5497751d. */
const WORLD_XI_DIGEST = '2f8cca6578202d4b1ccf3dbc45be0908cef51bf5be50b91a6ff2365722ea6c6c';
const WORLD_XI_SQUADS = 240;

/* Floors set from measurement, see the header. */
const T = {
  elevens: 300,
  roleGap: 0,
  totalGap: 0,
};

/* The node_modules that holds react and esbuild, found by walking up, so a
   worktree inside the repo resolves the main one the way node itself does. */
function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'react', 'package.json')) && fs.existsSync(path.join(nm, 'esbuild', 'package.json'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) { console.error(`no node_modules with react and esbuild above ${ROOT}`); process.exit(2); }
    d = up;
  }
}
const NM = modulesDir();

/* ---- failures, attributed to the section they fell in ---- */
let section = 0;
const failedIn = new Map();
const fail = m => {
  const n = (failedIn.get(section) ?? 0) + 1;
  failedIn.set(section, n);
  if (n <= 8) console.error(`  FAIL [${section}]: ${m}`);
  else if (n === 9) console.error(`  FAIL [${section}]: (further failures in this section not printed)`);
};
const begin = (n, title) => { section = n; console.log(`${n}) ${title}`); };
const J = v => JSON.stringify(v);
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const round1 = n => (Math.round(n * 10) / 10) || 0;

/* ---- the controls: source rewrites applied at bundle time, never on disk ---- */
const FILES = {
  xifit: path.join(ROOT, 'src', 'lib', 'xiFit.ts'),
  chem: path.join(ROOT, 'src', 'lib', 'chemistry.ts'),
  wxi: path.join(ROOT, 'src', 'lib', 'worldXi.ts'),
  tiles: path.join(ROOT, 'src', 'components', 'lineup', 'XiFitBreakdown.tsx'),
};
const CONTROLS = {
  nofit: {
    section: 1, file: 'xifit',
    from: '    return held ? gradeFit(held, s.allowed) : \'natural\';\n',
    to: '    void held; return \'natural\';\n',
    note: 'role fit reads every man as natural; section 1 must go red',
  },
  farlinks: {
    section: 2, file: 'chem',
    from: '      if (opts?.linked && !opts.linked(a, b)) continue;\n',
    to: '      void opts;\n',
    note: 'chemistry counts every pair on the pitch; section 2 must go red',
  },
  nocap: {
    section: 3, file: 'xifit',
    from: 'const chemistryValue = Math.min(CHEMISTRY_CAP, raw);',
    to: 'const chemistryValue = raw;',
    note: 'the chemistry cap is gone; section 3 must go red',
  },
  leak: {
    section: 4, file: 'wxi',
    from: 'const adjust = fit ? fit.roleFit + fit.chemistry + fit.balance : 0;',
    to: 'const adjust = fit ? fit.roleFit + fit.chemistry + fit.balance : 0.5;',
    note: 'a World XI season with no breakdown gets nudged; section 4 must go red',
  },
  oldcrash: {
    section: 5, file: 'tiles',
    from: '  if (!fit) return null;\n',
    to: '',
    note: 'the worth tiles read a report fit block that old reports do not have; section 5 must go red',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`BYXI_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const overrides = new Map();
if (CONTROL) {
  const spec = CONTROLS[CONTROL];
  const file = FILES[spec.file];
  const src = lf(fs.readFileSync(file, 'utf8'));
  const hits = src.split(spec.from).length - 1;
  if (hits !== 1) {
    console.error(`control cannot run: ${path.basename(file)} holds the string BYXI_CONTROL=${CONTROL} rewrites ${hits} times, not once (${spec.from.slice(0, 70).replaceAll('\n', '\\n')})`);
    process.exit(2);
  }
  const out = src.replace(spec.from, spec.to);
  if (out === src) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
  overrides.set(path.resolve(file).toLowerCase(), out);
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${spec.note}`);
}

/* ---- one bundle: the engine, the fit module and the screens ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-byxi-fit-'));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.cjs');
fs.writeFileSync(ENTRY, PRINT_DIGEST
  ? `
export * as wxi from '${ROOT_URL}/src/lib/worldXi.ts';
export { FORMATIONS as WX_FORMATIONS } from '${ROOT_URL}/src/lib/squadDeal.ts';
`
  : `
export * as wxi from '${ROOT_URL}/src/lib/worldXi.ts';
export * as fit from '${ROOT_URL}/src/lib/xiFit.ts';
export * as pf from '${ROOT_URL}/src/lib/positionFit.ts';
export { FORMATIONS as WX_FORMATIONS } from '${ROOT_URL}/src/lib/squadDeal.ts';
export { FORMATIONS as BY_FORMATIONS } from '${ROOT_URL}/src/types/lineupBuilder.ts';
export { XiFitBreakdown, XiFitDetail, XiFitWorth } from '${ROOT_URL}/src/components/lineup/XiFitBreakdown.tsx';
export { SeasonReportTabs } from '${ROOT_URL}/src/components/world-xi/SeasonReportTabs.tsx';
import React from '${NM}/react/index.js';
import { renderToStaticMarkup } from '${NM}/react-dom/server.node.js';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
const esbuild = createRequire(`${NM}/`)('esbuild');
await esbuild.build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  alias: { '@': `${ROOT_URL}/src` },
  outfile: BUNDLE,
  logLevel: 'error',
  plugins: [{
    name: 'control',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        const hit = overrides.get(path.resolve(args.path).toLowerCase());
        if (hit === undefined) return undefined;
        return { contents: hit, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    },
  }],
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const B = createRequire(import.meta.url)(BUNDLE);
fs.rmSync(TMP, { recursive: true, force: true });
const { wxi, WX_FORMATIONS } = B;

/* ---- a seeded stream per eleven, independent of the house stream ---- */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickOf = (rand, arr) => arr[Math.floor(rand() * arr.length)];
const valueOf = rand => Math.round(Math.exp(Math.log(2e6) + rand() * Math.log(75)));

/* ---- World XI's own squads, for the digest ---- */
function worldXiSquad(rand, formation, k) {
  return formation.slots.map((slot, i) => {
    const man = {
      name: `W${k}-${i}-${Math.floor(rand() * 1e6)}`,
      country: `Country ${1 + Math.floor(rand() * 6)}`,
      position: pickOf(rand, slot.allowed),
      club: `Club ${1 + Math.floor(rand() * 6)}`,
      value: valueOf(rand),
      age: 18 + Math.floor(rand() * 17),
    };
    if (rand() < 0.1) man.positionsPlayed = [slot.allowed[0]];
    return man;
  });
}
function worldXiDigest() {
  const h = crypto.createHash('sha256');
  for (let k = 0; k < WORLD_XI_SQUADS; k++) {
    const f = WX_FORMATIONS[k % WX_FORMATIONS.length];
    const squad = worldXiSquad(seeded(9001 + k), f, k);
    h.update(J(wxi.simulateWorldXiSeason(squad, f.name)));
    h.update('\n');
  }
  return h.digest('hex');
}

if (PRINT_DIGEST) {
  console.log(`World XI digest over ${WORLD_XI_SQUADS} squads: ${worldXiDigest()}`);
  process.exit(0);
}

const { fit, pf, BY_FORMATIONS, render, XiFitBreakdown, XiFitDetail, XiFitWorth, SeasonReportTabs } = B;
const FORM_NAMES = Object.keys(BY_FORMATIONS);

/* ---- Build Your XI elevens ---- */
const WIDE = new Set(['LB', 'RB', 'LWB', 'RWB', 'LM', 'RM', 'LW', 'RW']);
const LINE = { GK: 0, LWB: 1, LB: 1, CB: 1, RB: 1, RWB: 1, CDM: 2, LM: 2, CM: 2, RM: 2, CAM: 3, LW: 3, RW: 3, CF: 4, ST: 4 };
const primaryNation = n => (n ?? '').split('/')[0].trim();

/** An eleven whose every man holds a position his slot's own set lists. */
function naturalXi(rand, formationName, k) {
  return BY_FORMATIONS[formationName].map((slot, i) => {
    const allowed = pf.SLOT_ALLOWED_BY_ROLE[slot.role];
    return {
      name: `P${k}-${i}`,
      position: rand() < 0.6 ? slot.role : pickOf(rand, allowed),
      club: rand() < 0.1 ? undefined : `Club ${1 + Math.floor(rand() * 6)}`,
      nationality: rand() < 0.05 ? undefined : `Country ${1 + Math.floor(rand() * 6)}${rand() < 0.1 ? ' / Country 9' : ''}`,
      value: valueOf(rand),
      age: 18 + Math.floor(rand() * 17),
    };
  });
}
function shuffleOf(rand, n) {
  for (;;) {
    const p = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    if (p.some((v, i) => v !== i)) return p;
  }
}
/** The slots the page hands xiFitBreakdown, built the way LineupBuilder builds them. */
function fitSlots(formationName, men) {
  return BY_FORMATIONS[formationName].map((slot, i) => ({
    role: slot.role,
    allowed: pf.SLOT_ALLOWED_BY_ROLE[slot.role],
    man: men[i]
      ? { name: men[i].name, position: men[i].position ?? null, played: men[i].played, club: men[i].club, nationality: men[i].nationality }
      : null,
  }));
}
/** The squad the page hands the season sim, built the way LineupBuilder builds it. */
function squadOf(formationName, men) {
  return BY_FORMATIONS[formationName].map((slot, i) => ({
    name: men[i].name,
    country: men[i].nationality ?? '',
    position: men[i].position ?? slot.role,
    club: men[i].club ?? '',
    value: men[i].value,
    age: men[i].age,
  }));
}

/* Every breakdown the run makes, for sections 2 and 3. */
const seen = [];
const breakdownOf = (formationName, men) => {
  const slots = fitSlots(formationName, men);
  const b = fit.xiFitBreakdown(slots);
  seen.push({ formationName, slots, b });
  return b;
};

/* ======================= 1) natural beats shuffled ======================= */
begin(1, `the same eleven in its natural slots against shuffled, ${T.elevens} elevens, BYXI_SEED ${SEED}`);
const gapsRole = [];
const gapsTotal = [];
const seasons = [];
let shuffledOut = 0;
for (let k = 0; k < T.elevens; k++) {
  const rand = seeded((SEED * 100003 + k * 7919 + 17) >>> 0);
  const f = FORM_NAMES[k % FORM_NAMES.length];
  const men = naturalXi(rand, f, k);
  const perm = shuffleOf(rand, men.length);
  const moved = perm.map(j => men[j]);
  const nat = breakdownOf(f, men);
  const sh = breakdownOf(f, moved);
  if (nat.roleFit.value !== 0) fail(`${f} eleven ${k}: a natural eleven pays role fit ${nat.roleFit.value}`);
  const outside = BY_FORMATIONS[f].some((slot, i) => !pf.SLOT_ALLOWED_BY_ROLE[slot.role].includes(moved[i].position));
  if (outside) shuffledOut += 1;
  if (outside !== (sh.roleFit.value < 0)) fail(`${f} eleven ${k}: shuffled role fit ${sh.roleFit.value} with somebody outside his slot's set: ${outside}`);
  const roleOnly = b => ({ roleFit: b.roleFit.value, chemistry: 0, balance: 0 });
  const natRole = wxi.simulateWorldXiSeason(squadOf(f, men), f, roleOnly(nat));
  const shRole = wxi.simulateWorldXiSeason(squadOf(f, moved), f, roleOnly(sh));
  if (shRole.points > natRole.points) fail(`${f} eleven ${k}: shuffled took ${shRole.points} points to the natural ${natRole.points} with role fit alone, on the same rolls`);
  const natFull = wxi.simulateWorldXiSeason(squadOf(f, men), f, fit.seasonAdjust(nat));
  const shFull = wxi.simulateWorldXiSeason(squadOf(f, moved), f, fit.seasonAdjust(sh));
  gapsRole.push(natRole.points - shRole.points);
  gapsTotal.push(natFull.points - shFull.points);
  seasons.push({ f, men, b: nat, report: natFull }, { f, men: moved, b: sh, report: shFull });
}
const roleGap = mean(gapsRole);
const totalGap = mean(gapsTotal);
console.log(`   ${shuffledOut} of ${T.elevens} shuffled elevens put somebody outside his slot's set; natural minus shuffled points, mean: role fit only ${roleGap.toFixed(2)} (floor ${T.roleGap}), all three ${totalGap.toFixed(2)} (floor ${T.totalGap})`);
if (!(roleGap >= T.roleGap)) fail(`role fit alone: the natural eleven's mean points edge ${roleGap.toFixed(2)} is under the floor ${T.roleGap}`);
if (!(totalGap >= T.totalGap)) fail(`all three: the natural eleven's mean points edge ${totalGap.toFixed(2)} is under the floor ${T.totalGap}`);

/* Half built elevens, the way the page shows the tiles while you pick. */
for (let k = 0; k < 120; k++) {
  const rand = seeded((SEED * 7 + 31337 + k) >>> 0);
  const f = FORM_NAMES[k % FORM_NAMES.length];
  const men = naturalXi(rand, f, 10000 + k);
  const blanks = new Set(shuffleOf(rand, men.length).slice(0, 1 + Math.floor(rand() * 9)));
  breakdownOf(f, men.map((m, i) => (blanks.has(i) ? null : m)));
}

/* ======================= 2) links only where the data shows them ======================= */
begin(2, 'a chemistry link exists only between neighbours the data says share a club or a country');
let linkCount = 0;
let clubLinks = 0;
for (const { formationName, slots, b } of seen) {
  const roles = slots.map(s => s.role);
  const near = new Set(fit.pitchNeighbours(roles).map(([i, j]) => `${Math.min(i, j)}-${Math.max(i, j)}`));
  const has = new Set();
  for (const l of b.chemistry.links) {
    linkCount += 1;
    const key = `${Math.min(l.a, l.b)}-${Math.max(l.a, l.b)}`;
    has.add(`${key}-${l.type}`);
    if (!near.has(key)) fail(`${formationName}: a ${l.type} link joins slots ${l.a} and ${l.b}, which are not neighbours`);
    const A = slots[l.a]?.man;
    const Bm = slots[l.b]?.man;
    if (!A || !Bm) { fail(`${formationName}: a link touches an empty slot (${l.a}, ${l.b})`); continue; }
    if (l.type === 'club') {
      clubLinks += 1;
      const ca = (A.club ?? '').trim();
      if (!ca || ca !== (Bm.club ?? '').trim() || l.value !== ca) fail(`${formationName}: club link ${A.name} (${A.club}) and ${Bm.name} (${Bm.club}) says ${l.value}`);
    } else if (l.type === 'nationality') {
      const na = primaryNation(A.nationality);
      if (!na || na !== primaryNation(Bm.nationality) || l.value !== na) fail(`${formationName}: country link ${A.name} (${A.nationality}) and ${Bm.name} (${Bm.nationality}) says ${l.value}`);
    } else {
      fail(`${formationName}: a link of type ${l.type}, which this game has no data for`);
    }
  }
  for (const key of near) {
    const [i, j] = key.split('-').map(Number);
    const A = slots[i].man;
    const Bm = slots[j].man;
    if (!A || !Bm) continue;
    if ((A.club ?? '').trim() && (A.club ?? '').trim() === (Bm.club ?? '').trim() && !has.has(`${key}-club`)) fail(`${formationName}: neighbours ${A.name} and ${Bm.name} share ${A.club} and have no club link`);
    const na = primaryNation(A.nationality);
    if (na && na === primaryNation(Bm.nationality) && !has.has(`${key}-nationality`)) fail(`${formationName}: neighbours ${A.name} and ${Bm.name} share ${na} and have no country link`);
  }
}
/* The layout the links read, against this harness's own line table. */
for (const f of FORM_NAMES) {
  const roles = BY_FORMATIONS[f].map(s => s.role);
  const spots = fit.pitchCoords(roles);
  for (const [i, j] of fit.pitchNeighbours(roles)) {
    if (Math.abs(LINE[roles[i]] - LINE[roles[j]]) > 1 && LINE[roles[i]] !== LINE[roles[j]]) {
      /* Two lines apart is allowed only when the line between is empty in this shape. */
      const between = roles.some(r => LINE[r] > Math.min(LINE[roles[i]], LINE[roles[j]]) && LINE[r] < Math.max(LINE[roles[i]], LINE[roles[j]]));
      if (between) fail(`${f}: ${roles[i]} and ${roles[j]} are neighbours across a line that has men in it`);
    }
    for (const [a, o] of [[i, j], [j, i]]) {
      if (roles[a] === 'GK' && LINE[roles[o]] !== 1) fail(`${f}: the keeper neighbours ${roles[o]}, not his back line`);
    }
  }
  roles.forEach((r, i) => {
    roles.forEach((c, j) => {
      if (spots[i].row !== spots[j].row || c[0] === 'L' || c[0] === 'R') return;
      if (r[0] === 'L' && !(spots[i].x < spots[j].x)) fail(`${f}: ${r} is drawn at x ${spots[i].x.toFixed(1)}, not left of ${c} at ${spots[j].x.toFixed(1)}`);
      if (r[0] === 'R' && !(spots[i].x > spots[j].x)) fail(`${f}: ${r} is drawn at x ${spots[i].x.toFixed(1)}, not right of ${c} at ${spots[j].x.toFixed(1)}`);
    });
  });
}
console.log(`   ${linkCount} links over ${seen.length} elevens (${clubLinks} club), every one between neighbours who share what it says, none missing`);

/* ======================= 3) every number inside its stated bound ======================= */
begin(3, 'every bonus and penalty inside its stated bound');
const { FIT_PENALTY, gradeFit } = pf;
const { CHEMISTRY_CAP, CHEMISTRY_SCALE, HOLDING_PRICE, WIDTH_PRICE } = fit;
const PENALTIES = new Set(Object.values(FIT_PENALTY));
const BAL_FLOOR = -(HOLDING_PRICE + 2 * WIDTH_PRICE);
for (const { formationName, slots, b } of seen) {
  let sum = 0;
  slots.forEach((s, i) => {
    if (!s.man) {
      if (b.roleFit.grades[i] !== null) fail(`${formationName}: an empty slot has a grade`);
      return;
    }
    const held = s.man.position ? [s.man.position, ...(s.man.played ?? [])] : null;
    const g = held ? gradeFit(held, s.allowed) : 'natural';
    if (b.roleFit.grades[i] !== g) fail(`${formationName}: slot ${i} graded ${b.roleFit.grades[i]}, the shared rule says ${g}`);
    const p = b.roleFit.perMan[i];
    if (!PENALTIES.has(p) || p !== FIT_PENALTY[g]) fail(`${formationName}: slot ${i} pays ${p}, the table says ${FIT_PENALTY[g]}`);
    sum += p ?? 0;
  });
  const rf = b.roleFit.value;
  if (!(rf <= 0 && rf >= -FIT_PENALTY.keeper) || rf !== round1(-sum / slots.length)) fail(`${formationName}: role fit ${rf} for penalties summing ${sum}`);
  const weights = b.chemistry.links.reduce((s, l) => s + (l.type === 'club' ? 3 : 1), 0);
  const raw = round1(weights * CHEMISTRY_SCALE);
  const ch = b.chemistry.value;
  if (!(ch >= 0 && ch <= CHEMISTRY_CAP) || ch !== Math.min(CHEMISTRY_CAP, raw)) fail(`${formationName}: chemistry ${ch} for links weighing ${weights} (cap ${CHEMISTRY_CAP})`);
  const bal = b.balance.value;
  const expectBal = round1(-(b.balance.holding === false ? HOLDING_PRICE : 0) - WIDTH_PRICE * b.balance.narrow.length);
  if (!(bal <= 0 && bal >= BAL_FLOOR) || bal !== expectBal) fail(`${formationName}: balance ${bal}, the rule says ${expectBal} (floor ${BAL_FLOOR})`);
  if (b.total !== round1(rf + ch + bal)) fail(`${formationName}: total ${b.total} is not ${rf} + ${ch} + ${bal}`);
}
/* An eleven of one club and one country: the cap has to bind. */
{
  const men = naturalXi(seeded(4242), '4-4-2', 4242).map(m => ({ ...m, club: 'Club 1', nationality: 'Country 1' }));
  const b = breakdownOf('4-4-2', men);
  if (!(b.chemistry.raw > CHEMISTRY_CAP)) fail(`an eleven of one club and country only raw ${b.chemistry.raw}, so the cap was never tested`);
  if (b.chemistry.value !== CHEMISTRY_CAP) fail(`an eleven of one club and country earns ${b.chemistry.value}, over or under the cap ${CHEMISTRY_CAP}`);
  console.log(`   one club, one country: links raw ${b.chemistry.raw}, paid ${b.chemistry.value} (cap ${CHEMISTRY_CAP})`);
}
/* The season: what each was worth replays to the number printed. */
let worthMoved = 0;
for (const { f, men, b, report } of seasons) {
  const squad = squadOf(f, men);
  const adj = fit.seasonAdjust(b);
  const total = adj.roleFit + adj.chemistry + adj.balance;
  const sf = report.fit;
  if (!sf) { fail(`${f}: a season handed a breakdown has no fit block`); continue; }
  if (wxi.whatIfFinish(squad, f, { adjust: total }).points !== report.points) fail(`${f}: the season's own finish does not replay with its own adjustment`);
  for (const k of ['roleFit', 'chemistry', 'balance']) {
    const replay = wxi.whatIfFinish(squad, f, { adjust: total - adj[k] }).points;
    if (sf.points[k] !== report.points - replay) fail(`${f}: ${k} printed as worth ${sf.points[k]}, the replay says ${report.points - replay}`);
    if (sf[k] !== adj[k]) fail(`${f}: ${k} in the report ${sf[k]}, in the breakdown ${adj[k]}`);
  }
  if (sf.points.roleFit > 0) fail(`${f}: role fit gained ${sf.points.roleFit} points`);
  if (sf.points.balance > 0) fail(`${f}: balance gained ${sf.points.balance} points`);
  if (sf.points.chemistry < 0) fail(`${f}: chemistry lost ${sf.points.chemistry} points`);
  if (sf.matchRating !== round1(report.squadRating + total)) fail(`${f}: match rating ${sf.matchRating} for paper ${report.squadRating} and total ${total}`);
  if (!report.narrative.includes(sf.line)) fail(`${f}: the worth line is not in the narrative`);
  if (sf.points.roleFit || sf.points.chemistry || sf.points.balance) worthMoved += 1;
}
console.log(`   ${seasons.length} seasons replayed factor by factor, ${worthMoved} of them moved by at least one; stated: role fit ${FIT_PENALTY.family}/${FIT_PENALTY.wrong}/${FIT_PENALTY.keeper} on the man, chemistry x${CHEMISTRY_SCALE} up to ${CHEMISTRY_CAP}, holding ${HOLDING_PRICE}, width ${WIDTH_PRICE} a flank`);
/* The rules dialog states the numbers the engine uses (code, not comments). */
{
  const rules = lf(fs.readFileSync(path.join(ROOT, 'src', 'components', 'lineup', 'LineupHowToPlay.tsx'), 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');
  const stated = [
    `${FIT_PENALTY.family} rating points`, `another line ${FIT_PENALTY.wrong}`, `keeper swap ${FIT_PENALTY.keeper}`,
    `+${round1(3 * CHEMISTRY_SCALE)}`, `+${round1(CHEMISTRY_SCALE)}`, `+${CHEMISTRY_CAP}`,
    `costs ${HOLDING_PRICE}`, `costs ${WIDTH_PRICE}`,
  ];
  for (const s of stated) if (!rules.includes(s)) fail(`the rules dialog never says "${s}"`);
}

/* ======================= 4) World XI unchanged ======================= */
begin(4, `World XI's seasons are the ones it played before this round (${WORLD_XI_SQUADS} squads)`);
{
  const d = worldXiDigest();
  console.log(`   digest ${d}`);
  if (d !== WORLD_XI_DIGEST) fail(`World XI's seasons changed: digest ${d}, recorded ${WORLD_XI_DIGEST}`);
  let same = 0;
  for (let k = 0; k < 60; k++) {
    const f = FORM_NAMES[k % FORM_NAMES.length];
    const men = naturalXi(seeded(777 + k), f, 20000 + k);
    const plain = wxi.simulateWorldXiSeason(squadOf(f, men), f);
    const zero = wxi.simulateWorldXiSeason(squadOf(f, men), f, { roleFit: 0, chemistry: 0, balance: 0 });
    if (plain.fit) fail(`${f}: a season with no breakdown carries a fit block`);
    const strip = r => J({ ...r, fit: undefined, narrative: r.narrative.filter(l => l !== r.fit?.line) });
    if (strip(plain) !== strip(zero)) fail(`${f} eleven ${k}: a zero breakdown plays a different season from none`);
    else same += 1;
  }
  console.log(`   ${same} of 60 Build Your XI elevens play the same season with a zero breakdown as with none`);
}

/* ======================= 5) old reports render ======================= */
begin(5, 'old reports render, and the new tiles render for full and half built elevens');
{
  const tryRender = (label, C, props) => {
    try { return render(C, props); } catch (e) { fail(`${label} threw: ${e.message}`); return null; }
  };
  const f0 = WX_FORMATIONS[0];
  const world = wxi.simulateWorldXiSeason(worldXiSquad(seeded(5), f0, 5), f0.name);
  const old = { ...world };
  for (const k of ['goalsFor', 'goalsAgainst', 'cleanSheets', 'assists', 'months', 'playerStats', 'awards', 'whatIf', 'fit']) delete old[k];
  const a = tryRender('the worth tiles on a report with no fit block', XiFitWorth, { fit: old.fit });
  if (a !== null && a !== '') fail(`the worth tiles drew something for a report with no fit block: ${a.slice(0, 80)}`);
  const t = tryRender('the report tabs on a pre Round 726 report', SeasonReportTabs, { report: old });
  if (t !== null && t !== '') fail('the report tabs drew panels for a report that has none');
  const full = tryRender('the report tabs on a World XI report', SeasonReportTabs, { report: world });
  if (full !== null && !full) fail('the report tabs drew nothing for a full report');
  const { f, men, b, report } = seasons.find(s => s.report.fit && (s.report.fit.points.roleFit || s.report.fit.points.chemistry || s.report.fit.points.balance)) ?? seasons[0];
  const w = tryRender('the worth tiles', XiFitWorth, { fit: report.fit });
  if (w !== null) {
    for (const s of ['Role fit', 'Chemistry', 'Balance', String(report.fit.matchRating)]) if (!w.includes(s)) fail(`the worth tiles never say ${s}`);
  }
  const slots = fitSlots(f, men);
  const labels = BY_FORMATIONS[f].map(s => s.label);
  const half = fitSlots(f, men.map((m, i) => (i % 2 ? null : m)));
  for (const [label, sl] of [['full', slots], ['half built', half]]) {
    const bd = fit.xiFitBreakdown(sl);
    const html = tryRender(`the ${label} breakdown`, XiFitBreakdown, { breakdown: bd, slots: sl, labels });
    if (html !== null) for (const s of ['Role fit', 'Chemistry', 'Balance']) if (!html.includes(s)) fail(`the ${label} breakdown never says ${s}`);
    for (const kind of ['role', 'chemistry', 'balance']) {
      const d = tryRender(`the ${label} ${kind} detail`, XiFitDetail, { kind, breakdown: bd, slots: sl, labels });
      if (d !== null && !d) fail(`the ${label} ${kind} detail drew nothing`);
      if (d && kind === 'chemistry') for (const l of bd.chemistry.links) if (!d.includes(sl[l.a].man.name) || !d.includes(sl[l.b].man.name)) fail(`the chemistry detail leaves out the link ${sl[l.a].man.name} and ${sl[l.b].man.name}`);
    }
    const open = tryRender(`the ${label} breakdown opened on role fit`, XiFitBreakdown, { breakdown: bd, slots: sl, labels, initialDetail: 'role' });
    if (open !== null && !open.includes('Back')) fail(`the ${label} breakdown opened on a detail has no Back button`);
  }
  void b;
  console.log('   worth tiles, report tabs, breakdown and its three details rendered for old, full and half built');
}

/* ======================= verdict ======================= */
const red = [...failedIn.keys()].sort((x, y) => x - y);
if (CONTROL) {
  const want = CONTROLS[CONTROL].section;
  const fired = red.includes(want) && red.every(s => s === want);
  console.log(fired
    ? `CONTROL FIRED: BYXI_CONTROL=${CONTROL} turned section ${want} red and nothing else`
    : `CONTROL DID NOT FIRE AS IT SHOULD: BYXI_CONTROL=${CONTROL} wanted section ${want} red alone, red sections: ${red.join(', ') || 'none'}`);
  process.exit(fired ? 0 : 1);
}
const total = [...failedIn.values()].reduce((s, n) => s + n, 0);
console.log(total ? `simBuildYourXiFit: ${total} failures in sections ${red.join(', ')}` : 'simBuildYourXiFit: all checks green');
process.exit(total ? 1 : 0);
