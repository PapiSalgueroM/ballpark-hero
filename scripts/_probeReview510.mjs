import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/probeR510.entry.mjs`;
const BUNDLE = `${TMP}/probeR510.bundle.mjs`;

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
  const winners = new Set();
  const runners = new Set();
  for (const t of groups.slice(0, 8)) {
    const rows = sortedUclGroup(s, t).map(r => r.club);
    winners.add(rows[0]);
    runners.add(rows[1]);
  }
  return { winners, runners };
}

let seedHome = 0;
let seedAway = 0;
let mineSeedAway = 0;
let mineSeedHome = 0;
const clubs = ['Valencia', 'Barcelona', 'Chelsea', 'Sevilla', 'Porto', 'Ajax'];
for (const club of clubs) {
  for (const era of ['era2005', 'era2010', 'era2015']) {
    let s;
    try { s = startCareer(club, era); } catch { continue; }
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
          seedHome += ties.filter(t => f.winners.has(t.home)).length;
          seedAway += ties.filter(t => f.winners.has(t.away)).length;
          const mine = ties.find(t => t.mine);
          if (mine) {
            const iWonGroup = f.winners.has(club);
            const iAmHome = mine.home === club;
            if (iWonGroup && !iAmHome) mineSeedAway += 1;
            if (iWonGroup && iAmHome) mineSeedHome += 1;
            console.log(`${club}/${era}: legs=${uclLegsFor(era, 'R16')} R16weeks=${s.calendar.filter(e => e.type === 'uclKo' && e.uclRound === 'R16').length} | ${mine.home} v ${mine.away} | I ${iWonGroup ? 'WON group' : f.runners.has(club) ? 'was 2nd' : '?'} and play ${iAmHome ? 'HOME' : 'AWAY'} | tie.legs=${mine.legs ?? 'undef'} score ${mine.homeGoals}-${mine.awayGoals} winner ${mine.winner}`);
          }
        }
        reported = true;
      }
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
  }
}
console.log(`\nLEGACY R16 across all sampled ties: group winner at tie.home ${seedHome}, at tie.away ${seedAway}`);
console.log(`My own tie when I won the group: HOME ${mineSeedHome}, AWAY ${mineSeedAway}`);
