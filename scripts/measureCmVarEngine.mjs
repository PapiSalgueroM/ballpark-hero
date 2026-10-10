/* Round 1218. Measures what scripts/genCmVarRates.mjs needs from the engine, on the fleet the bands use.
 *
 *   node scripts/measureCmVarEngine.mjs                       plays the fleet (heavy: a GitHub runner's job), prints
 *                                                            one line "CMVAR_ENGINE {json}" and writes the same json
 *                                                            to $RC_OUT/cmVarEngine.measured.json when RC_OUT is set
 *   node scripts/measureCmVarEngine.mjs --adopt <file> <runner result> <head>
 *                                                            light: turns that json into scripts/data/cmVarEngine.json
 *                                                            with where it was measured, so no figure is typed by hand
 *
 * The measure plays league matches with reviews asked for on PROBE rates: no goal is reviewed (so the goals
 * counted are the goals the engine draws before any review), and a missed foul is reviewed at a small known
 * rate. From it: reviewable goals a match, and penalties awarded a match per unit of rate.
 */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleCm, playFleet, FLEET_CLUBS } from './lib/cmVarFleet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = path.join(ROOT, 'scripts/data/cmVarEngine.json');
const PROBE = 0.004;
const round = (x, d) => Number(x.toFixed(d));

/** The generated rates module with its rates line swapped for another. Throws when the line is not there. */
export function ratesSourceWith(rates) {
  const src = fs.readFileSync(path.join(ROOT, 'src/data/clubManagerVarRates.ts'), 'utf8').replaceAll('\r\n', '\n');
  const line = /^export const CM_VAR_RATES = \{[^}]*\} as const;$/m;
  if (!line.test(src)) throw new Error('measureCmVarEngine: the generated rates line was not found');
  return src.replace(line, `export const CM_VAR_RATES = ${JSON.stringify(rates)} as const;`);
}

if (process.argv[2] === '--adopt') {
  const [, , , file, runner, head] = process.argv;
  if (!file || !runner || !head) { console.log('usage: --adopt <file> <runner result> <head>'); process.exit(2); }
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  const now = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const next = { what: now.what, provisional: false, fleet: now.fleet, ...m, runner, head };
  fs.writeFileSync(LEDGER, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`measureCmVarEngine: adopted ${m.leagueMatches} league matches from ${runner} at ${head}.`);
  process.exit(0);
}

const seeds = (process.env.CM_VAR_MEASURE_SEEDS || '11,12,13,14,15,16,17,18,19,20').split(',').map(Number);
const clubs = process.env.CM_VAR_MEASURE_CLUBS ? FLEET_CLUBS.slice(0, Number(process.env.CM_VAR_MEASURE_CLUBS)) : FLEET_CLUBS;
const perClub = Number(process.env.CM_VAR_MEASURE_PER_CLUB || 60);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const folder = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'cmvar-measure-'));
process.on('exit', () => { try { fs.rmSync(folder, { recursive: true, force: true }); } catch { /* best effort */ } });
const started = Date.now();
const cm = await bundleCm(ROOT, folder, { ratesSource: ratesSourceWith({ goalReview: 0, overturn: 1, penaltyReview: 0, missedFoulReview: PROBE, penaltyScores: 0.76, penaltyOnTarget: 0.65 }) });
const fleet = playFleet(cm, { seeds, clubs, perClub });
const L = fleet.byKind.league;
if (L.matches === 0) { console.log('measureCmVarEngine: the fleet played no league match'); process.exit(1); }
if (L.ruledOut || L.goalConfirmed || L.penaltyConfirmed) { console.log('measureCmVarEngine: the probe rates did not reach the engine (a goal or a penalty was reviewed)'); process.exit(1); }
const measured = {
  seeds, leagueMatches: L.matches,
  reviewableGoalsPerMatch: round(L.reviewableGoals / L.matches, 4),
  foulsPerMatch: round(L.fouls / L.matches, 3),
  probeRate: PROBE, awardsAtProbeRate: L.penaltyAwarded,
  awardsPerMatchPerUnitRate: round(L.penaltyAwarded / L.matches / PROBE, 3),
};
console.log(`measureCmVarEngine: ${fleet.careers} careers, ${L.matches} league matches, ${fleet.byKind.cup.matches} cup, ${fleet.byKind.uclGroup.matches + fleet.byKind.uclKo.matches} Champions League, ${Math.round((Date.now() - started) / 1000)} s.`);
console.log(`measureCmVarEngine: goals ${round(L.goals / L.matches, 3)} a match, ${measured.reviewableGoalsPerMatch} of them reviewable; fouls ${measured.foulsPerMatch}; penalties ${round(L.penalties / L.matches, 4)}; awards at the probe rate ${L.penaltyAwarded} (${L.awardedScored} scored).`);
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'cmVarEngine.measured.json'), JSON.stringify(measured, null, 2));
console.log(`CMVAR_ENGINE ${JSON.stringify(measured)}`);
