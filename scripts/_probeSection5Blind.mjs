/* Probe: can simUclLegs section 5's assertions pass while the Round 507
   regression is fully restored? Section 5 only ever plays ONE club (Valencia).
   The guard it is testing lives on the AI-only path, so it is never evaluated
   in a season where the manager's own club is in every knockout week. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');

const BROKEN = process.env.BROKEN === '1';
let enginePath = `${ROOT}/src/lib/clubManager.ts`;
if (BROKEN) {
  let src = fs.readFileSync(enginePath, 'utf8').replaceAll('\r\n', '\n');
  const from = '        if (!entry.uclLeg || entry.uclLeg >= legs) advanceUclBracket(state, entry.uclRound);';
  if (!src.includes(from)) { console.error('anchor missing'); process.exit(1); }
  src = src.replace(from, '        if (legs === 1 || (entry.uclLeg ?? 1) === legs) advanceUclBracket(state, entry.uclRound);');
  enginePath = `${TMP}/probe.broken.engine.ts`;
  fs.writeFileSync(enginePath, src);
}

const ENTRY = `${TMP}/probeBlind.entry.mjs`;
const BUNDLE = `${TMP}/probeBlind.bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${enginePath.replaceAll('\\', '/')}');
export const cm = mod;
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { cm } = await import(pathToFileURL(BUNDLE).href);
const { startCareer, playNextEntry } = cm;

const CLUBS = ['Valencia', 'Barcelona', 'Real Madrid', 'Bayern Munich', 'AC Milan', 'Liverpool', 'Chelsea', 'Juventus', 'Inter', 'Arsenal'];

for (const club of CLUBS) {
  const line = [];
  for (const era of ['era2005', 'era2010', 'era2015']) {
    let s;
    try { s = startCareer(club, era); } catch { line.push(`${era}: n/a`); continue; }
    s.calendar = s.calendar
      .filter(e => !(e.type === 'uclKo' && e.uclLeg === 2))
      .map(e => (e.type === 'uclKo' ? { type: e.type, round: e.round, uclRound: e.uclRound } : e));
    let guard = 0;
    while (guard < 400) {
      guard += 1;
      if (!s.calendar || s.week >= s.calendar.length) break;
      const r = playNextEntry(s, { skipHalftime: true });
      if (!r || !r.state) break;
      s = r.state;
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    const br = s.uclBracket ?? [];
    const settled = round => br.filter(t => t.round === round && t.winner).length;
    const seeded = round => br.filter(t => t.round === round).length;
    const champ = br.find(t => t.round === 'F')?.winner ?? null;
    /* Exactly simUclLegs section 5's two assertions. */
    const pass = !(seeded('R16') > 0 && settled('R16') !== seeded('R16')) && !!champ;
    line.push(`${era}: R16 ${settled('R16')}/${seeded('R16')} F ${settled('F')}/${seeded('F')} champ=${champ ?? 'NONE'} sacked=${!!s.sacked} => section5 ${pass ? 'PASS' : 'FAIL'}`);
  }
  console.log(`${club}\n   ${line.join('\n   ')}`);
}
