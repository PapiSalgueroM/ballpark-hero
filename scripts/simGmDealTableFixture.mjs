/*
 * Round 908 harness: the deal table fixture. The fee table (what an offer reads
 * as, the closeness meter, what an answer costs in patience) and the valuation
 * band moved out of src/lib/clubManagerDeals.ts into the shared
 * src/lib/gmDealTable.ts so the four front offices can sit at the same table.
 * A move is only a move if nothing a player can see changed, and this file is
 * the proof: a recording of Club Manager's table made on origin/main BEFORE any
 * code moved, replayed against whatever the tree is now.
 *
 * RECORDED ON: origin/main a4433f41, 2026-10-02, before gmDealTable.ts existed.
 * The recording lives in scripts/data/gmDealTable.fixture.json.
 *
 * What is recorded, each section as a hash plus enough plain text to debug a
 * mismatch by eye:
 *  A. The pure table. offerVerdict and dealCloseness over a grid of asks and
 *     of offers from 0.30 to 1.10 of the ask in steps of 0.01 (every step, not
 *     the two ends), patienceCost for all four answers, and the constants.
 *  B. The band. valuationBand and valuationLine over the first 60 players of
 *     the real market at lead scout levels 1, 4, 7 and 10 at three clubs.
 *  C. The live table. The real engine path: startCareer, buildMarket,
 *     startNegotiation and makeOffer, with Math.random seeded per walk, one
 *     unchanged offer repeated at seven shares of the opening ask at four
 *     clubs. Every step records the ask, the patience left, the meter, the
 *     status and the phase, so a draw that moved or went missing shows up as a
 *     different walk.
 *
 * HOW THE RECORDER WAS PROVED HONEST (2026-10-02, on a4433f41):
 *   recorded twice, the two files were byte identical (see the numbers under
 *   MEASURED below), and each control below turned the replay red.
 *
 * Negative controls. Each rewrites ONE constant in memory through an esbuild
 * load hook (nothing on disk changes), in whichever of the two files holds the
 * line today, and refuses to run if the line is in neither:
 *   GM_DEAL_FIXTURE_CONTROL=shift   INSULT_RATIO 0.75 becomes 0.79: sections A
 *                                   and C must both stop matching. (A first
 *                                   draft moved it to 0.74 and section C did
 *                                   not notice, because no walk makes an offer
 *                                   between 0.74 and 0.75 of the ask. A control
 *                                   that small proved the grid and nothing
 *                                   about the live table, so it was widened.)
 *   GM_DEAL_FIXTURE_CONTROL=walk    WALKOUT_RATIO 0.55 becomes 0.45: A and C.
 *   GM_DEAL_FIXTURE_CONTROL=patience  a counter costs no patience: A and C.
 *   GM_DEAL_FIXTURE_CONTROL=exact   VALUATION_EXACT_AT 0.02 becomes 0.06:
 *                                   section B must stop matching.
 *
 * MEASURED, 2026-10-02, on a4433f41 before the move:
 *   section   lines   sha256 (first 16)    what the walks reached
 *   A         573     cd990b30454f73b8     7 asks x 81 offers, 4 answers, 6 constants
 *   B         720     706d8ae667797412     3 clubs x 4 scout levels x 60 players
 *   C         101     0756155c7b01a42d     28 walks: 12 steps collapsed, 6 hijacked,
 *                                          10 reached the terms table, 4 walkouts
 *   recorded twice: both files sha256 ec370e41a74dd3ac..., byte identical (cmp).
 *   replay on the same tree: 3 of 3 sections identical, exit 0.
 *   controls: shift A and C red (exit 1), walk A and C red (exit 1), patience
 *   A and C red (exit 1), exact B red (exit 1). The first draft of shift (0.74)
 *   exited 2: A red, C untouched, which is the harness saying so itself.
 *
 * Run:    node scripts/simGmDealTableFixture.mjs
 * Record: GM_DEAL_FIXTURE=record node scripts/simGmDealTableFixture.mjs
 *         (only ever on a tree whose behaviour is the one to be kept)
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const FIXTURE = `${ROOT}/scripts/data/gmDealTable.fixture.json`;
const RECORD = process.env.GM_DEAL_FIXTURE === 'record';
const CONTROL = process.env.GM_DEAL_FIXTURE_CONTROL || '';

const CONTROLS = {
  shift: { from: 'export const INSULT_RATIO = 0.75;', to: 'export const INSULT_RATIO = 0.79;', sections: ['A', 'C'] },
  walk: { from: 'export const WALKOUT_RATIO = 0.55;', to: 'export const WALKOUT_RATIO = 0.45;', sections: ['A', 'C'] },
  patience: { from: "  if (verdict === 'counter') return 1;", to: "  if (verdict === 'counter') return 0;", sections: ['A', 'C'] },
  exact: { from: 'export const VALUATION_EXACT_AT = 0.02;', to: 'export const VALUATION_EXACT_AT = 0.06;', sections: ['B'] },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`GM_DEAL_FIXTURE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}
if (CONTROL && RECORD) {
  console.error('refusing to record under a control: that would write a broken table into the fixture');
  process.exit(1);
}

/* A worktree has no node_modules of its own, so walk up to the first one that
   holds esbuild rather than hard coding the root. */
function findNodeModules() {
  let dir = ROOT;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'node_modules', 'esbuild', 'package.json'))) return path.join(dir, 'node_modules');
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  console.error('could not find node_modules/esbuild above ' + ROOT);
  process.exit(1);
}
const NODE_MODULES = findNodeModules();
const esbuild = createRequire(path.join(NODE_MODULES, 'x.js'))('esbuild');

/* The two files a control may rewrite. The line lives in exactly one of them. */
const TABLE_FILES = ['clubManagerDeals.ts', 'gmDealTable.ts'];
let controlHits = 0;
const controlPlugin = {
  name: 'gm-deal-fixture-control',
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/]lib[\\/](clubManagerDeals|gmDealTable)\.ts$/ }, args => {
      let text = fs.readFileSync(args.path, 'utf8').replaceAll('\r\n', '\n');
      const c = CONTROLS[CONTROL];
      if (c && text.includes(c.from)) {
        text = text.replace(c.from, c.to);
        controlHits += 1;
      }
      return { contents: text, loader: 'ts' };
    });
  },
};

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gmDealFixture-'));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
export * as cm from '${ROOT_URL}/src/lib/clubManager.ts';
export * as deals from '${ROOT_URL}/src/lib/clubManagerDeals.ts';
export * as staff from '${ROOT_URL}/src/lib/clubManagerStaff.ts';
`);
await esbuild.build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: BUNDLE,
  logLevel: 'error',
  alias: { '@': `${ROOT_URL}/src` },
  plugins: [controlPlugin],
});
if (CONTROL && controlHits !== 1) {
  console.error(`control cannot run: "${CONTROLS[CONTROL].from}" was found ${controlHits} times across ${TABLE_FILES.join(' and ')}, it must be there exactly once`);
  process.exit(1);
}
/* Set before the bundle loads: an ESM import is hoisted above any statement in the entry file. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { cm, deals, staff } = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(TMP, { recursive: true, force: true });

for (const [name, fn] of Object.entries({
  startCareer: cm.startCareer, buildMarket: cm.buildMarket, startNegotiation: cm.startNegotiation, makeOffer: cm.makeOffer,
  offerVerdict: deals.offerVerdict, dealCloseness: deals.dealCloseness, patienceCost: deals.patienceCost,
  valuationBand: deals.valuationBand, valuationLine: deals.valuationLine, ensureStaff: staff.ensureStaff,
})) {
  if (typeof fn !== 'function') {
    console.error(`the harness could not reach ${name}; the bundle is not the shape it expects`);
    process.exit(1);
  }
}

/* The stream is this file's own and ignores SIM_SEED on purpose: a fixture
   replayed on a different stream is a different recording, not a failure. */
function seed(n) {
  let a = n >>> 0;
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sha = lines => crypto.createHash('sha256').update(lines.join('\n')).digest('hex');
/** Every Nth line kept as plain text, so a mismatch can be read without a debugger. */
const sample = (lines, every) => lines.filter((_, i) => i % every === 0);

/* ---------- A. the pure table ---------- */
function sectionA() {
  const lines = [];
  lines.push(`AGREE=${deals.AGREE_RATIO} INSULT=${deals.INSULT_RATIO} WALKOUT=${deals.WALKOUT_RATIO}`);
  lines.push(`PATIENCE_MIN=${deals.OPENING_PATIENCE_MIN} PATIENCE_SPREAD=${deals.OPENING_PATIENCE_SPREAD} CONVERGENCE=${deals.ASK_CONVERGENCE}`);
  for (const v of ['agreed', 'counter', 'insulted', 'walkout']) lines.push(`patienceCost(${v})=${deals.patienceCost(v)}`);
  for (const ask of [0, 0.3, 1, 7.5, 12, 45, 120]) {
    for (let step = 30; step <= 110; step++) {
      const offer = Math.round(ask * step) / 100;
      lines.push(`ask=${ask} offer=${offer} ${deals.offerVerdict(offer, ask)} ${deals.dealCloseness(offer, ask)}`);
    }
  }
  return lines;
}

/* ---------- B. the band ---------- */
function withScoutLevel(state, level) {
  const s = { ...state };
  staff.ensureStaff(s);
  s.staff = { ...s.staff };
  s.staff.scout = { id: `scout-fixture-${level}`, name: 'Fixture Scout', level, potential: Math.max(level, 10), wage: 10, since: s.season, academy: false };
  return s;
}
function sectionB() {
  const lines = [];
  ['Aston Villa', 'Napoli', 'Ajax'].forEach((club, ci) => {
    seed(9080 + ci);
    const base = cm.startCareer(club);
    const market = cm.buildMarket(base).filter(m => !m.generated).slice(0, 60);
    for (const level of [1, 4, 7, 10]) {
      const s = withScoutLevel(base, level);
      for (const m of market) {
        const r = deals.valuationBand(s, m);
        lines.push(`${club}|L${level}|${m.name}|${r.low}|${r.high}|${r.spread}|${r.exact}|${deals.valuationLine(s, m)}`);
      }
    }
  });
  return lines;
}

/* ---------- C. the live table ---------- */
function openDeal(state) {
  const market = cm.buildMarket(state);
  const top = Math.min(45, Math.max(1, state.budget * 0.8));
  const bottom = Math.min(12, Math.max(0.5, top * 0.4));
  const target = market.find(m => m.price >= bottom && m.price <= top && !m.generated);
  if (!target) return null;
  const opened = cm.startNegotiation(state, target);
  if (!opened || !opened.negotiation) return null;
  return opened;
}
function sectionC() {
  const lines = [];
  const MULTS = [0.5, 0.62, 0.76, 0.84, 0.88, 0.92, 0.98];
  ['Aston Villa', 'Napoli', 'Sevilla', 'Ajax'].forEach((club, ci) => {
    MULTS.forEach((mult, mi) => {
      seed(90800 + ci * 100 + mi);
      let s = openDeal(cm.startCareer(club));
      if (!s) { lines.push(`${club}|${mult}|no deal opened`); return; }
      const bid = s.negotiation.theirAsk * mult;
      lines.push(`${club}|${mult}|open|${s.negotiation.player.name}|ask=${s.negotiation.theirAsk}|pat=${s.negotiation.patience}`);
      let n = 0;
      while (s.negotiation && s.negotiation.status === 'open' && s.negotiation.phase !== 'terms' && n < 14) {
        n += 1;
        const next = cm.makeOffer(s, bid);
        if (!next) { lines.push(`${club}|${mult}|${n}|refused`); break; }
        s = next;
        const g = s.negotiation;
        lines.push(`${club}|${mult}|${n}|ask=${g.theirAsk}|pat=${g.patience}|meter=${g.lastCloseness}|${g.status}|${g.phase ?? 'fee'}|stage=${g.stage}|rival=${g.rivalOffer ?? '-'}|${g.note}`);
      }
    });
  });
  return lines;
}

const built = { A: sectionA(), B: sectionB(), C: sectionC() };
const EVERY = { A: 9, B: 37, C: 1 };
const now = {};
for (const k of ['A', 'B', 'C']) now[k] = { lines: built[k].length, sha256: sha(built[k]), text: sample(built[k], EVERY[k]) };

const HEADER = {
  what: 'Club Manager deal table and valuation band, recorded before the Round 908 move into gmDealTable.ts',
  recordedOn: 'origin/main a4433f41',
  recordedDate: '2026-10-02',
  recorder: 'scripts/simGmDealTableFixture.mjs',
};

if (RECORD) {
  fs.writeFileSync(FIXTURE, JSON.stringify({ header: HEADER, sections: now }, null, 1) + '\n');
  for (const k of ['A', 'B', 'C']) console.log(`recorded ${k}: ${now[k].lines} lines, sha256 ${now[k].sha256.slice(0, 16)}`);
  console.log(`\nsimGmDealTableFixture: RECORDED to scripts/data/gmDealTable.fixture.json`);
  process.exit(0);
}

if (!fs.existsSync(FIXTURE)) {
  console.error('no fixture on disk: scripts/data/gmDealTable.fixture.json is missing');
  process.exit(1);
}
const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).sections;
let failures = 0;
const changed = [];
for (const k of ['A', 'B', 'C']) {
  const w = want[k];
  const n = now[k];
  if (!w || w.lines < 20) {
    failures += 1;
    console.error(`  FAIL: section ${k} of the fixture is missing or too thin to prove anything (${w ? w.lines : 0} lines)`);
    continue;
  }
  if (w.sha256 === n.sha256 && w.lines === n.lines) {
    console.log(`${k}) identical: ${n.lines} lines, sha256 ${n.sha256.slice(0, 16)}`);
    continue;
  }
  changed.push(k);
  failures += 1;
  console.error(`  FAIL: section ${k} no longer replays (${w.lines} lines recorded, ${n.lines} now)`);
  /* The sampled text is how a mismatch is read: print the first few sampled
     lines that differ, recorded against now. */
  let shown = 0;
  for (let i = 0; i < Math.max(w.text.length, n.text.length) && shown < 4; i++) {
    if (w.text[i] !== n.text[i]) {
      shown += 1;
      console.error(`    recorded: ${String(w.text[i]).slice(0, 170)}`);
      console.error(`    now:      ${String(n.text[i]).slice(0, 170)}`);
    }
  }
  if (shown === 0) console.error('    (the sampled lines agree, the difference is in a line the sample skipped)');
}

if (CONTROL) {
  /* Under a control the replay must go red in exactly the sections that
     constant can reach. Anything else means the control proved nothing. */
  const expect = CONTROLS[CONTROL].sections;
  const ok = expect.every(k => changed.includes(k));
  console.log(`\ncontrol ${CONTROL}: sections that stopped matching: ${changed.join(', ') || 'none'} (expected at least ${expect.join(', ')})`);
  console.log(ok
    ? `simGmDealTableFixture: CONTROL ${CONTROL} FIRED, the replay went red as it must (exit 1)`
    : `simGmDealTableFixture: CONTROL ${CONTROL} DID NOT FIRE, the fixture cannot see this constant (exit 2)`);
  process.exit(ok ? 1 : 2);
}

console.log(failures === 0
  ? '\nsimGmDealTableFixture: PASS, the deal table replays the recording line for line (3 sections)'
  : `\nsimGmDealTableFixture: FAIL, ${failures} section(s) differ from the recording`);
process.exit(failures === 0 ? 0 : 1);
