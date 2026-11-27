import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const control = process.env.FLANK_CONTROL;
const mutations = {
  'ignore-overlap': {
    filter: /clubManagerFlank\.ts$/,
    before: "const overlap = plan.support === 'overlap';",
    after: 'const overlap = false;',
  },
  'stack-chances': {
    filter: /clubManager\.ts$/,
    before: 'const share = tacticsImpl()?.ordinaryChanceShare(live) ?? 1;',
    after: 'const share = 1;',
  },
};
if (control) assert(Object.hasOwn(mutations, control), 'Unknown flank control');
const plugins = control ? [{ name: control, setup(builder) {
  const { filter, before, after } = mutations[control];
  builder.onLoad({ filter }, async ({ path }) => {
    const source = await readFile(path, 'utf8');
    assert.equal(source.split(before).length, 2, 'Control must change exactly one instruction');
    return { loader: 'ts', contents: source.replace(before, after) };
  });
} }] : [];
const bundle = await build({ stdin: { resolveDir: process.cwd(), contents:
  "import './src/lib/clubManagerTactics'; export { startCareer, playNextEntry, changeLive, resumeMatch } from './src/lib/clubManager';" },
  bundle: true, format: 'esm', platform: 'node', write: false, plugins });
const game = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const modes = ['normal', 'hold', 'overlap'];
const totals = Object.fromEntries(modes.map(mode => [mode, { for: 0, against: 0, entries: 0, shots: 0, counters: 0 }]));
const changes = { better: 0, worse: 0 };
let pairs = 0;

function seeded(seed, run) {
  const random = Math.random, clock = Date.now;
  Date.now = () => 1793000000000;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try { return run(); } finally { Math.random = random; Date.now = clock; }
}

function observe(report, mode) {
  const t = totals[mode];
  const mine = report.myScorers.length, theirs = report.oppScorers.length;
  t.for += mine;
  t.against += theirs;
  for (const event of report.detail.play) {
    if (event.flankMove?.outcome === 'entry') t.entries++;
    if (event.flankChance === 'entry') t.shots++;
    if (event.flankChance === 'counter') t.counters++;
  }
  return Math.sign(mine - theirs);
}

const clubs = ['Brentford', 'Real Madrid', 'Everton', 'Bayern Munich', 'Valencia', 'Tottenham'];
for (const [index, club] of clubs.entries()) {
  let career = seeded(92126 + index, () => game.startCareer(club));
  let league = 0;
  for (let i = 0; i < 100 && league < 30; i++) {
    const kickoff = seeded(84101 + 17 * i + index, () => game.playNextEntry(career));
    if (kickoff.kind === 'halftime' && kickoff.state.calendar[kickoff.state.live.week].type === 'league') {
      league++;
      for (let replay = 0; replay < 2; replay++) {
        const outcomes = {};
        for (const mode of modes) {
          let state = structuredClone(kickoff.state);
          if (mode !== 'normal') {
            state.live.flankDraw = (index + 1) * 1000 + 13 * i + 7 * replay;
            state = seeded(19, () => game.changeLive(state, 46, { kind: 'flank', plan: { side: 'left', support: mode } }));
            assert(state, club + ' could not issue its halftime instruction');
          }
          const seed = 873 + i * 55 + replay + index * 5;
          const { report } = seeded(seed, () => game.resumeMatch(state));
          outcomes[mode] = observe(report, mode);
        }
        if (outcomes.overlap > outcomes.hold) changes.better++;
        if (outcomes.overlap < outcomes.hold) changes.worse++;
        pairs++;
      }
    }
    career = seeded(93280 + i + index, () => game.playNextEntry(career, { skipHalftime: true })).state;
    if (career.sacked) break;
  }
  assert.equal(league, 30, club + ' needs thirty common league fixtures');
}

assert.equal(pairs, 360);
for (const mode of modes) console.log(mode, JSON.stringify(totals[mode]));
console.log(pairs, 'matched fixtures, overlap improves', changes.better, 'results and worsens', changes.worse);
const { normal, hold, overlap } = totals;
assert.equal(normal.entries + normal.shots + normal.counters, 0);
assert(hold.entries > 0 && hold.shots > 0 && hold.counters > 0);
assert(overlap.entries > hold.entries * 1.2, 'Overlapping must produce more entries');
assert(overlap.shots > hold.shots * 1.3, 'Overlapping must create more shots from entries');
assert(overlap.counters > hold.counters * 1.5, 'Overlapping must concede more counter chances');
assert(changes.better > 0 && changes.worse > 0, 'Neither instruction should win every changed result');
// On these matched halves the allocated model shifted total scoring by at most
// 0.20 goals per fixture. Adding every new chance on top shifted it by 0.47.
for (const mode of [hold, overlap]) {
  const scoringChange = (mode.for + mode.against - normal.for - normal.against) / pairs;
  assert(Math.abs(scoringChange) < 0.32, 'Flank plans must share ordinary scoring opportunities');
}
