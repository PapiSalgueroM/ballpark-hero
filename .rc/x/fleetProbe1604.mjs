/* Reviewer probe for Round 1604 (runner only, sent as .rc/x/fleetProbe1604.mjs).
   A. Default path over whole careers: base engine (4bd20c993, git show) and branch engine, same seed, initCareer
      without a name, then up to STEPS careerStep calls; the JSON must match after every step.
   B. Old saves: a career made and played by the base engine, serialized by the base save module, parsed by the
      branch save module, then played on by both engines from the same seed; JSON equal at every step.
   C. Name path: branch initCareer with the shown name, played on; never throws, adds no new top level field.
   Exit 0 only when all three hold. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { bundleCareerSources } from '../../scripts/lib/careerClubPool.mjs';
import { careerStep, seedRandom } from '../../scripts/lib/careerStep.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE_SHA || '4bd20c993';
const STEPS = Number(process.env.STEPS || 90);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet1604-'));
const baseSrc = execFileSync('git', ['show', `${BASE}:src/lib/soccerCareerEngine.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }).replaceAll('\r\n', '\n');
const own = await bundleCareerSources({ root: ROOT, tmpDir });
const base = await bundleCareerSources({ root: ROOT, tmpDir, transforms: { 'lib/soccerCareerEngine.ts': () => baseSrc } });
const ownSrc = fs.readFileSync(path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), 'utf8').replaceAll('\r\n', '\n');
console.log(`base ${BASE} engine differs from branch engine: ${baseSrc !== ownSrc}`);

const NATS = ['England', 'Brazil', 'Spain', 'Germany', 'France', 'Italy', 'Argentina', 'Netherlands', 'Portugal', 'United States', 'Japan', 'Nigeria'];
const ERAS = [['1990-94', 1990], ['2005-09', 2005], ['2020-24', 2020], ['2025', 2025]];
const POS = ['ST', 'CM', 'CB', 'GK', 'LW'];
const BANDS = [38, 52, 64, 74, 84];
const statsAt = ovr => ({ pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr });
const init = (eng, i, ...name) => {
  const nat = NATS[i % NATS.length], [era, yr] = ERAS[Math.floor(i / NATS.length) % ERAS.length], ovr = BANDS[i % BANDS.length], pos = POS[i % POS.length];
  return eng.initCareer(`Fleet ${i}`, nat, pos, era, statsAt(ovr), ovr, yr, eng.FALLBACK_CLUBS, null, Math.min(99, ovr + 10), null, null, ...name);
};
const play = (eng, s, n, log) => {
  for (let k = 0; k < n && !s.retired; k++) { s = careerStep(eng, s, eng.FALLBACK_CLUBS); if (log) log.push(JSON.stringify(s)); }
  return s;
};
let bad = 0;
const N = Number(process.env.CAREERS || 240);

// A
let aSteps = 0, aEqual = 0, aCareers = 0, aFirst = '';
for (let i = 0; i < N; i++) {
  const la = [], lb = [];
  seedRandom(5000 + i); let a = init(base.engine, i); la.push(JSON.stringify(a)); play(base.engine, a, STEPS, la);
  seedRandom(5000 + i); let b = init(own.engine, i); lb.push(JSON.stringify(b)); play(own.engine, b, STEPS, lb);
  aCareers += 1; aSteps += la.length;
  let eq = la.length === lb.length; for (let k = 0; eq && k < la.length; k++) if (la[k] !== lb[k]) eq = false;
  if (eq) aEqual += 1; else if (!aFirst) aFirst = `career ${i}`;
}
console.log(`A default path: ${aEqual} of ${aCareers} careers byte equal to the base at every step (${aSteps} states compared)`);
if (aEqual !== aCareers) { bad += 1; console.log(`  A FAIL first ${aFirst}`); }

// B
let bEqual = 0, bN = 0, bParsed = 0;
for (let i = 0; i < 80; i++) {
  seedRandom(7000 + i); let s = init(base.engine, i); s = play(base.engine, s, 25);
  const raw = base.save.serializeSoccerCareerSave(s);
  const parsed = own.save.parseSoccerCareerSave(raw);
  if (own.save.isSoccerCareerSave(parsed)) bParsed += 1;
  const la = [], lb = [];
  seedRandom(9000 + i); play(base.engine, base.save.parseSoccerCareerSave(raw), 40, la);
  seedRandom(9000 + i); play(own.engine, parsed, 40, lb);
  bN += 1; if (la.length === lb.length && la.every((x, k) => x === lb[k])) bEqual += 1;
}
console.log(`B old saves: ${bParsed} of ${bN} base saves parsed as saves by the branch, ${bEqual} of ${bN} played on byte equal`);
if (bParsed !== bN || bEqual !== bN) { bad += 1; console.log('  B FAIL'); }

// C
let cOk = 0, cKeys = 0, cKept = 0, cN = 0, cErr = '';
for (let i = 0; i < N; i++) {
  const nat = NATS[i % NATS.length], [, yr] = ERAS[Math.floor(i / NATS.length) % ERAS.length], ovr = BANDS[i % BANDS.length];
  seedRandom(11000 + i);
  const shown = own.engine.getYouthAcademyClub(own.eras.adjustClubsForYear(own.engine.FALLBACK_CLUBS, yr), nat, ovr);
  cN += 1;
  try {
    const d = init(own.engine, i);
    const s = init(own.engine, i, shown.name);
    if (s.academyClubName === shown.name && s.currentClub === `${shown.name} Youth`) cKept += 1;
    const kd = Object.keys(d).sort().join(','), ks = Object.keys(s).sort().join(',');
    if (kd === ks) cKeys += 1;
    play(own.engine, s, STEPS); cOk += 1;
  } catch (e) { if (!cErr) cErr = `${i}: ${e && e.message}`; }
}
console.log(`C name path: ${cKept} of ${cN} started at the shown club, ${cKeys} of ${cN} with the default path's field set, ${cOk} of ${cN} played ${STEPS} steps without a throw`);
if (cKept !== cN || cKeys !== cN || cOk !== cN) { bad += 1; console.log(`  C FAIL ${cErr}`); }
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(bad ? `fleetProbe1604: RED (${bad} part(s))` : 'fleetProbe1604: green, default path, old saves and name path all hold');
process.exit(bad ? 1 : 0);
