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
const { startCareer, playNextEntry, sortedUclGroup, uclLegsFor } = cm;

function fieldOf(s) {
  const groups = [];
  if (s.uclGroup) groups.push(s.uclGroup.table);
  for (const g of s.uclWorld ?? []) groups.push(g.table);
  if (groups.length < 8) return null;
  const winners = [];
  const runners = [];
  for (const t of groups.slice(0, 8)) {
    const rows = sortedUclGroup(s, t).map(r => r.club);
    winners.push(rows[0]);
    runners.push(rows[1]);
  }
  return { winners: new Set(winners), runners: new Set(runners) };
}

for (const club of ['Valencia', 'Barcelona', 'Chelsea']) {
  for (const era of ['era2005', 'era2010', 'era2015']) {
    let s;
    try { s = startCareer(club, era); } catch (e) { console.log(`${club}/${era}: startCareer threw ${e}`); continue; }
    // Downgrade to the pre-507 calendar exactly as simUclLegs section 5 does.
    s.calendar = s.calendar
      .filter(e => !(e.type === 'uclKo' && e.uclLeg === 2))
      .map(e => (e.type === 'uclKo' ? { type: e.type, round: e.round, uclRound: e.uclRound } : e));
    let guard = 0;
    let reported = false;
    while (guard < 400) {
      guard += 1;
      if (!s.calendar || s.week >= s.calendar.length) break;
      const r = playNextEntry(s, { skipHalftime: true });
      if (!r || !r.state) break;
      s = r.state;
      if (!reported && (s.uclBracket ?? []).some(t => t.round === 'R16')) {
        const f = fieldOf(s);
        const ties = (s.uclBracket ?? []).filter(t => t.round === 'R16');
        if (f) {
          const homeIsRunner = ties.filter(t => f.runners.has(t.home)).length;
          const homeIsWinner = ties.filter(t => f.winners.has(t.home)).length;
          const mine = ties.find(t => t.mine);
          const r16weeks = s.calendar.filter(e => e.type === 'uclKo' && e.uclRound === 'R16').length;
          console.log(`${club}/${era}: legs(R16)=${uclLegsFor(era, 'R16')} calendarR16weeks=${r16weeks} ties=${ties.length} home-is-groupRunnerUp=${homeIsRunner} home-is-groupWinner=${homeIsWinner}` +
            (mine ? ` | my tie ${mine.home} v ${mine.away}; I am ${mine.home === club ? 'HOME' : 'AWAY'}; I ${f.winners.has(club) ? 'WON my group' : f.runners.has(club) ? 'finished 2nd' : 'was not in the field'}` : ' | not in the R16'));
        }
        reported = true;
      }
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    if (!reported) console.log(`${club}/${era}: never reached an R16 bracket`);
  }
}
