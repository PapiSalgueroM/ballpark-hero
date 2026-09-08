import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/probeLegacy.entry.mjs`;
const BUNDLE = `${TMP}/probeLegacy.bundle.mjs`;

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT_URL}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { cm } = await import(pathToFileURL(BUNDLE).href);
const { startCareer, playNextEntry, fixtureFor, sortedUclGroup } = cm;

const ERAS = ['era2005', 'era2010', 'era2015'];
const CLUBS = ['Barcelona', 'Real Madrid', 'Chelsea', 'Valencia', 'Arsenal', 'Bayern Munich'];

for (const eraId of ERAS) {
  for (const club of CLUBS) {
    let s = startCareer(club, eraId);
    if (!s.uclGroup) continue;
    s.calendar = s.calendar
      .filter(e => !(e.type === 'uclKo' && e.uclLeg === 2))
      .map(e => (e.type === 'uclKo' ? { type: e.type, round: e.round, uclRound: e.uclRound } : e));

    let guard = 0;
    let reported = false;
    while (guard < 400) {
      guard += 1;
      if (!s.calendar || s.week >= s.calendar.length) break;
      const entry = s.calendar[s.week];
      if (entry.type === 'uclKo' && entry.uclRound === 'R16' && s.uclKoRound === 'R16') {
        const fx = fixtureFor(s, entry);
        const tie = s.uclBracket?.find(t => t.round === 'R16' && t.mine);
        const rows = sortedUclGroup(s, s.uclGroup.table);
        const myPos = rows.findIndex(r => r.club === club) + 1;
        const koWeeks = s.calendar.filter(e => e.type === 'uclKo' && e.uclRound === 'R16').length;
        console.log(`${eraId} ${club}: group pos ${myPos}, R16 weeks ${koWeeks}, tie "${tie ? `${tie.home} v ${tie.away}` : 'none'}", venue ${fx ? (fx.home ? 'HOME' : 'AWAY') : 'n/a'}, label "${fx?.compLabel}"`);
        reported = true;
        break;
      }
      const r = playNextEntry(s, { skipHalftime: true });
      if (!r || !r.state) break;
      s = r.state;
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    if (!reported) console.log(`${eraId} ${club}: did not reach the R16 (exit ${s.uclKoRound})`);
  }
}
