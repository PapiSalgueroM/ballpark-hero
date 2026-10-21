/* Round 1523 probe (not committed): the natural fleet's shift for design variants, a passive fleet (never answers
   the phone, the house fleet) and an engaged one (answers every waiting text before each press).
   PROBE_FLEET=passive|engaged PROBE_VARIANTS=off,v1,max1,per15 PROBE_N=400 node .rc/x/variantProbe.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { careerStep } from '../../scripts/lib/careerStep.mjs';

const ROOT = process.cwd();
const FLEET = process.env.PROBE_FLEET || 'passive';
const VARIANTS = (process.env.PROBE_VARIANTS || 'off,v1').split(',');
const N = Number(process.env.PROBE_N || 400);
const SEED = Number(process.env.PROBE_SEED || 1523);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'variant-probe-'));
const FORM = path.join(ROOT, 'src/lib/careerForm.ts');
const formText = fs.readFileSync(FORM, 'utf8').split('\r\n').join('\n');
const PATCH = {
  off: [["const step = Math.round(moraleForm('soccer', morale));", 'const step = 0;']],
  v1: [],
  max1: [['export const SOCCER_MORALE_STEP_MAX = 2;', 'export const SOCCER_MORALE_STEP_MAX = 1;']],
  per15: [['soccer: { per: 10, neutral: 81 },', 'soccer: { per: 15, neutral: 81 },']],
  n86: [['soccer: { per: 10, neutral: 81 },', 'soccer: { per: 10, neutral: 86 },']],
  per20: [['soccer: { per: 15, neutral: 81 },', 'soccer: { per: 20, neutral: 81 },']],
  per25: [['soccer: { per: 15, neutral: 81 },', 'soccer: { per: 25, neutral: 81 },']],
  p15v: [],
};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
async function bundle(v) {
  let text = formText;
  for (const [a, b] of PATCH[v]) { if (text.split(a).length !== 2) throw new Error(`${v}: ${a}`); text = text.replace(a, b); }
  const out = path.join(TMP, `${v}.mjs`);
  await build({ absWorkingDir: ROOT, stdin: { contents: "export * as E from './src/lib/soccerCareerEngine'; export * as A from './src/lib/soccerCareerAttributes';", resolveDir: ROOT },
    outfile: out, bundle: true, format: 'esm', platform: 'node', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    plugins: [{ name: 'f', setup(b) { b.onLoad({ filter: /careerForm\.ts$/ }, () => ({ contents: text, loader: 'ts' })); } }] });
  return import(pathToFileURL(out).href);
}
const mul = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const POS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'CDM', 'RB', 'RW', 'LB'];
const KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const TIERS = ['GOAT', 'LEGEND', 'GREAT', 'SOLID PRO', 'JOURNEYMAN'];
function fleet({ E, A }) {
  let league = 0, seasons = 0, rating = 0, bdor = 0, morale = 0, presses = 0;
  const tiers = Object.fromEntries(TIERS.map(t => [t, 0]));
  for (let i = 0; i < N; i += 1) {
    Math.random = mul(SEED * 1000 + i);
    const pos = POS[i % POS.length], ovr = 56 + (i % 5) * 3, off = A.POSITION_OFFSETS[pos];
    const stats = Object.fromEntries(KEYS.map((k, j) => [k, Math.max(25, Math.min(99, ovr + off[j]))]));
    let c = E.initCareer('Form Sim', i % 2 ? 'England' : 'Spain', pos, '2020-24', stats, ovr, 2020, E.FALLBACK_CLUBS, null, Math.min(94, ovr + 20));
    for (let k = 0; k < 2000 && !c.retired; k += 1) {
      if (c.phase === 'retirement_suggestion') { c = E.declineRetirementSuggestion(c, E.FALLBACK_CLUBS); continue; }
      if (c.phase === 'retirement_ceremony' || c.phase === 'post_retirement' || c.phase === 'retired') break;
      if (c.phase === 'playing') {
        if (FLEET === 'engaged') for (let r = 0; r < 6; r += 1) {
          const t = (c.phone?.threads ?? []).find(th => th.pending);
          if (!t) break;
          const next = E.answerPhoneText(c, t.id, 0);
          if (next === c) break;
          c = next;
        }
        morale += c.morale; presses += 1;
      }
      c = careerStep(E, c, E.FALLBACK_CLUBS);
    }
    for (const row of c.seasons) if (row.type === 'playing' && row.clubTier < 99) { seasons += 1; league += row.leagueApps ?? row.apps; rating += row.rating; if (row.ballonDor) bdor += 1; }
    tiers[E.calculateLegacy(c).tier] += 1;
  }
  return { league: league / seasons, rating: rating / seasons, bdor: 100 * bdor / N, morale: morale / presses, tiers: Object.fromEntries(TIERS.map(t => [t, 100 * tiers[t] / N])) };
}
const out = {};
for (const v of VARIANTS) {
  out[v] = fleet(await bundle(v));
  const b = out[v];
  console.log(`${FLEET} ${v}: league ${b.league.toFixed(2)} rating ${b.rating.toFixed(3)} bdor ${b.bdor.toFixed(2)} morale ${b.morale.toFixed(1)} | ${TIERS.map(t => `${t} ${b.tiers[t].toFixed(1)}`).join(' ')}`);
  if (out.off && v !== 'off') console.log(`   shift vs off: league ${(b.league - out.off.league).toFixed(2)} rating ${(b.rating - out.off.rating).toFixed(3)} bdor ${(b.bdor - out.off.bdor).toFixed(2)} | ${TIERS.map(t => `${t} ${(b.tiers[t] - out.off.tiers[t]).toFixed(1)}`).join(' ')}`);
}
console.log('variantProbe: done');
