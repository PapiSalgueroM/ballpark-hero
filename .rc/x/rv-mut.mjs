// Reviewer's mutation tool (never committed). node rv-mut.mjs <name>  |  node rv-mut.mjs restore
// Each mutation swaps one string that must be in the file exactly once. A backup of every file touched is kept
// under .tmp-fx/rv-bak (or $RUNNER_TEMP on a runner) and `restore` copies it back byte for byte.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BAK = path.join(ROOT, '.tmp-fx', 'rv-bak');
const M = {
  deadheat: { file: 'src/lib/careerRival.ts', from: 'return myScore > hisScore;', to: 'return myScore >= hisScore;' },
  rookie: { file: 'src/lib/nbaMyCareer.ts', from: "nbaRivalSeason(c.year, seasonsPlayed))) notes.push(n);", to: "nbaRivalSeason(c.year, seasonsPlayed + 1))) notes.push(n);" },
  rookie0: { file: 'src/lib/nbaMyCareer.ts', from: "nbaRivalSeason(c.year, seasonsPlayed))) notes.push(n);", to: "nbaRivalSeason(c.year, 0))) notes.push(n);" },
  tickstale: { file: 'src/lib/nbaCareerRivalryEvents.ts', from: 'const p = season ? { ...c, seasons: [...c.seasons, season] } : c;', to: 'const p = c;' },
  tilefinals: { file: 'src/lib/nbaCareerSport.ts', from: "const NBA_TILE_NAMED = ['MVP', 'All-NBA', 'All-Star'];", to: "const NBA_TILE_NAMED = ['MVP', 'All-NBA', 'All-Star', 'Finals MVP'];" },
  leadge: { file: 'src/lib/careerRival.ts', from: 'if (r.myYears > r.hisYears) return `You lead', to: 'if (r.myYears >= r.hisYears) return `You lead' },
  gateyear: { file: 'src/lib/nbaCareerRivalryEvents.ts', from: 'if (!last || r.lastYear !== last.year) return null;', to: 'if (!last) return null;' },
  fansd: { file: 'src/lib/nbaMyCareer.ts', from: 'winShare: 0.5, madePlayoffs: false, fanbase: NBA_FIELD.fans[0], prev: null, everAllNba: false,', to: 'winShare: 0.5, madePlayoffs: true, fanbase: 100, prev: null, everAllNba: false,' },
  hisallstar: { file: 'src/lib/careerRival.ts', from: 'r.lastAllStar = allStar === true;', to: 'r.lastAllStar = r.lastAllStar || allStar === true;' },
  hiscoin: { file: 'src/lib/nbaMyCareer.ts', from: 'year, allStar: !!won.allStar,', to: 'year, allStar: keyed() < 0.065,' },
  applysign: { file: 'src/lib/nbaCareerRivalryEvents.ts', from: "else if (f.his) { s.morale = clamp(s.morale - 5, 0, 100);", to: "else if (f.his) { s.morale = clamp(s.morale + 5, 0, 100);" },
};

const name = process.argv[2];
if (name === 'restore') {
  if (!fs.existsSync(BAK)) { console.log('nothing to restore'); process.exit(0); }
  const list = JSON.parse(fs.readFileSync(path.join(BAK, 'list.json'), 'utf8'));
  for (const f of list) { fs.copyFileSync(path.join(BAK, f.replace(/[\\/]/g, '__')), path.join(ROOT, f)); console.log('restored ' + f); }
  fs.writeFileSync(path.join(BAK, 'list.json'), '[]');
  process.exit(0);
}
const m = M[name];
if (!m) { console.error('no such mutation: ' + name + ' (' + Object.keys(M).join(', ') + ')'); process.exit(2); }
fs.mkdirSync(BAK, { recursive: true });
const listFile = path.join(BAK, 'list.json');
const list = fs.existsSync(listFile) ? JSON.parse(fs.readFileSync(listFile, 'utf8')) : [];
if (list.length) { console.error('a mutation is still applied (' + list.join(', ') + '): restore first'); process.exit(2); }
const p = path.join(ROOT, m.file);
const src = fs.readFileSync(p, 'utf8');
const n = src.split(m.from).length - 1;
if (n !== 1) { console.error(`mutation ${name}: anchor found ${n} times in ${m.file}, need exactly 1`); process.exit(2); }
fs.copyFileSync(p, path.join(BAK, m.file.replace(/[\\/]/g, '__')));
fs.writeFileSync(listFile, JSON.stringify([m.file]));
fs.writeFileSync(p, src.replace(m.from, m.to));
console.log(`mutation ${name} applied to ${m.file}`);
