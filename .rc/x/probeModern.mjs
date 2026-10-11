// Round 1304 fix pass probe (never committed; sent to a runner as .rc/x/probeModern.mjs).
// A career that starts TODAY: is its out of work screen byte equal before and after the fix?
// Bundles the engine twice from this tree: as it is, and with src/lib/clubManager.ts and
// src/lib/managerJobMarket.ts read from the commit before the fix pass (BASE, default 94647e74).
// usage: node <this> [clubsPerLeague] ; exit 0 when every career is byte equal at every step.
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = ROOT.replaceAll('\\', '/');
const BASE = process.env.BASE ?? '94647e74';
const PER = Number(process.argv[2] ?? 4);
const SWAP = ['src/lib/clubManager.ts', 'src/lib/managerJobMarket.ts'];
const { build } = await import('esbuild');
async function engine(tag, swap) {
  const id = `${process.pid}-${Date.now()}-${tag}`;
  const entry = path.join(os.tmpdir(), `pmodEntry-${id}.mjs`);
  const out = path.join(os.tmpdir(), `pmod-${id}.bundle.mjs`);
  fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${R}/src/lib/clubManager.ts');
const eras = await import('${R}/src/lib/clubManagerEras.ts');
export { engine, eras };
`);
  let swapped = 0;
  const plugin = {
    name: 'base',
    setup(b) {
      b.onLoad({ filter: /[\\/]src[\\/]lib[\\/](clubManager|managerJobMarket)\.ts$/ }, a => {
        if (!swap) return undefined;
        const rel = SWAP.find(s => a.path.replaceAll('\\', '/').endsWith(s));
        if (!rel) return undefined;
        swapped += 1;
        return { contents: execSync(`git show ${BASE}:${rel}`, { cwd: ROOT, maxBuffer: 1 << 28 }).toString('utf8'), loader: 'ts' };
      });
    },
  };
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', plugins: [plugin] });
  const m = await import(pathToFileURL(out).href);
  fs.rmSync(entry, { force: true });
  fs.rmSync(out, { force: true });
  if (swap && swapped !== SWAP.length) { console.error(`REFUSED: ${swapped} of ${SWAP.length} base files were swapped in`); process.exit(2); }
  if (process.env.PROBE_ERA) await m.eras.ensureAllEraRosters();
  return m.engine;
}
const head = await engine('head', false);
const base = await engine('base', true);
const srcHead = fs.readFileSync(path.join(ROOT, SWAP[0]), 'utf8');
const srcBase = execSync(`git show ${BASE}:${SWAP[0]}`, { cwd: ROOT, maxBuffer: 1 << 28 }).toString('utf8');
if (!srcHead.includes('function eraOfferClubs(') || srcBase.includes('function eraOfferClubs(')) { console.error('REFUSED: the head must hold eraOfferClubs and the base must not'); process.exit(2); }

const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_NOW = Date.now;
const h = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
function run(cm, club, i) {
  Date.now = () => 1790000000000;
  Math.random = seeded(21001 + i * 7919);
  const sacked = { ...cm.startCareer(club, ERA), sacked: true };
  let out = cm.enterWilderness(sacked);
  const rng = seeded(22003 + i * 104729);
  const steps = [h(out)];
  let calls = 0;
  for (let w = 0; w < 12; w++) {
    out = cm.wildernessWeek(out, rng);
    steps.push(h(out.wilderness));
    calls = Math.max(calls, out.wilderness.seen.length);
  }
  const silent = { ...sacked, wilderness: { weeksOut: 7, formerClub: club, offers: [], seen: [] } };
  for (const v of [0.36, 0.65, 0.99]) steps.push(h(cm.wildernessWeek(silent, () => v).wilderness));
  const offer = out.wilderness.offers[out.wilderness.offers.length - 1];
  let moved = 0;
  if (offer) {
    const next = cm.acceptWildernessJob(out, offer.club);
    steps.push(h(next));
    moved = next && next.clubName === offer.club ? 1 : 0;
  }
  Date.now = REAL_NOW;
  return { steps, calls, took: offer ? 1 : 0, moved };
}
let careers = 0, differ = 0, calls = 0, took = 0, moved = 0, steps = 0;
const eg = [];
const ERA = process.env.PROBE_ERA || undefined;
const LEAGUES = ERA ? head.ERA_LEAGUES[ERA] : head.REAL_LEAGUES;
for (const lg of LEAGUES) {
  const n = lg.clubs.length;
  const picks = [...new Set([0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1].slice(0, PER))];
  for (const k of picks) {
    const club = ERA ? lg.clubs[k] : head.playableClubs(lg.id)[k].name;
    const a = run(head, club, careers);
    const b = run(base, club, careers);
    careers += 1; calls += a.calls; took += a.took; moved += a.moved; steps += a.steps.length;
    const at = a.steps.findIndex((s, j) => s !== b.steps[j]);
    if (at >= 0 || a.steps.length !== b.steps.length) { differ += 1; if (eg.length < 5) eg.push(`${club} (${lg.id}) at step ${at}`); }
  }
}
console.log(`${ERA ? `CONTROL, a past season (${ERA})` : 'modern'} out of work, head against ${BASE}: ${careers} careers in ${LEAGUES.length} leagues, ${steps} states hashed, ${calls} clubs rang, ${took} jobs taken (${moved} moved the manager); ${differ} careers differ${eg.length ? `: ${eg.join('; ')}` : ''}`);
if (calls < careers || took < careers / 2) { console.error('REFUSED: too few calls or jobs taken for the comparison to mean anything'); process.exit(2); }
console.log(differ ? `PROBE RED: ${differ} careers differ` : 'PROBE GREEN: every career is byte equal at every step');
process.exit(differ ? 1 : 0);
