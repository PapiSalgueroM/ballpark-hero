/* Round 1523 probe (not committed): the distribution of Soccer Career morale at the press.
   Two readings per press: the hub's (the save the player pressed on) and the engine's (state.morale as
   generateSeasonStats sees it, after the summer's phone texts). Two choosers: the passive player of
   scripts/lib/careerStep.mjs (first choice of every card) and a chooser who picks any choice at random from a
   stream of his own. Prints percentiles, a histogram and how often the two readings differ. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { careerStep } from '../../scripts/lib/careerStep.mjs';

const ROOT = process.cwd();
const N = Number(process.env.PROBE_N || 160);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'morale-probe-'));
const out = path.join(temp, 'bundle.mjs');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
await build({ absWorkingDir: ROOT, stdin: { contents: "export * as E from './src/lib/soccerCareerEngine'; export * as A from './src/lib/soccerCareerAttributes';", resolveDir: ROOT },
  outfile: out, bundle: true, format: 'esm', platform: 'node', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
let text = fs.readFileSync(out, 'utf8');
const needle = 'function generateSeasonStats(state, clubs) {';
if (text.split(needle).length !== 2) { console.log('ABORT: generateSeasonStats not found once in the bundle'); process.exit(1); }
text = text.replace(needle, `${needle}\n  if (globalThis.__press) globalThis.__press(state);`);
fs.writeFileSync(out, text);
const { E, A } = await import(pathToFileURL(out).href);

const mul = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const POS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'CDM', 'RB'];
const keys = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];

function run(chooser) {
  const hub = [], eng = [], pairs = [];
  let careers = 0, seasons = 0;
  for (let i = 0; i < N; i += 1) {
    Math.random = mul(9001 + i * 131);
    const pick = mul(77 + i * 17);
    const pos = POS[i % POS.length], ovr = 56 + (i % 5) * 3;
    const off = A.POSITION_OFFSETS[pos];
    const stats = Object.fromEntries(keys.map((k, j) => [k, Math.max(25, Math.min(99, ovr + off[j]))]));
    let c = E.initCareer('Probe', i % 2 ? 'England' : 'Spain', pos, '2020-24', stats, ovr, 2020, E.FALLBACK_CLUBS, null, Math.min(94, ovr + 20));
    let pressed = null;
    globalThis.__press = st => { if (pressed !== null) { eng.push(st.morale); pairs.push([pressed, st.morale]); pressed = null; } };
    for (let step = 0; step < 1200 && !c.retired; step += 1) {
      if (c.phase === 'retirement_suggestion') { c = E.declineRetirementSuggestion(c, E.FALLBACK_CLUBS); continue; }
      if (c.phase === 'retirement_ceremony' || c.phase === 'post_retirement' || c.phase === 'retired') break;
      if (c.phase === 'playing') { hub.push(c.morale); pressed = c.morale; seasons += 1; }
      if (chooser === 'random' && c.phase === 'random_events' && c.pendingEvents && c.pendingEvents[0]) {
        const n = (c.pendingEvents[0].choices || []).length || 1;
        c = E.applyEventChoice(c, Math.floor(pick() * n), E.FALLBACK_CLUBS);
        continue;
      }
      c = careerStep(E, c, E.FALLBACK_CLUBS);
      pressed = null;
    }
    careers += 1;
  }
  globalThis.__press = null;
  return { hub, eng, pairs, careers, seasons };
}
const q = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
for (const chooser of ['passive', 'random']) {
  const r = run(chooser);
  console.log(`${chooser}: ${r.careers} careers, ${r.seasons} presses, ${r.eng.length} engine reads`);
  for (const [name, a] of [['hub', r.hub], ['engine', r.eng]]) {
    console.log(`  ${name}: mean ${mean(a).toFixed(1)}  p10 ${q(a, 0.1)} p25 ${q(a, 0.25)} median ${q(a, 0.5)} p75 ${q(a, 0.75)} p90 ${q(a, 0.9)}`);
    const h = new Array(11).fill(0); for (const v of a) h[Math.min(10, Math.floor(v / 10))] += 1;
    console.log(`  ${name} by tens: ${h.map((v, k) => `${k * 10}:${(100 * v / a.length).toFixed(1)}`).join(' ')}`);
  }
  const moved = r.pairs.filter(([a, b]) => a !== b).length;
  const diff = r.pairs.map(([a, b]) => b - a);
  console.log(`  hub to engine: ${moved} of ${r.pairs.length} moved, mean move ${mean(diff).toFixed(2)}, p10 ${q(diff, 0.1)} p90 ${q(diff, 0.9)}`);
}
console.log('moraleProbe: done');
