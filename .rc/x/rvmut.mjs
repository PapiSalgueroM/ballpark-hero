// Reviewer's mutation tool (never committed). Runs on the runner checkout only.
//   node .rc/x/rvmut.mjs <id>   applies ONE mutation, asserting its needle is in the file exactly once.
// The request line restores the tree with git checkout afterwards.
import fs from 'node:fs';

const M = {
  shoot10: ['src/lib/clubManager.ts',
    'for (let i = 1; side.length < SHOOTOUT_MAX_ORDER; i++) side.push(',
    'for (let i = 1; side.length < SHOOTOUT_MAX_ORDER - 1; i++) side.push('],
  shootmark: ['src/lib/clubManager.ts',
    "p: 'CM', r: oppS, g: true }",
    "p: 'CM', r: oppS }"],
  nohandover: ['src/lib/translateGuard.ts',
    '          else refresh(parent);',
    '          else owed.delete(parent);'],
  flatwaits: ['src/lib/translateGuard.ts',
    'const WAITS = [1000, 2000, 4000, 8000];',
    'const WAITS = [1000, 1000, 1000, 1000];'],
  keptstale: ['src/lib/safeStorage.ts',
    'try { below.setItem(k, v); kept.delete(k); return; }',
    'try { below.setItem(k, v); return; }'],
  rankbare: ['src/pages/RankEm.tsx',
    '{formatNumber(score)}</span> }]}',
    '{score}</span> }]}'],
  facebare: ['src/pages/FaceOff.tsx',
    '{formatNumber(g.totals.you)} to {formatNumber(g.totals.rival)}, ',
    '{g.totals.you} to {g.totals.rival}, '],
  facepill: ['src/pages/FaceOff.tsx',
    'score={`${formatNumber(g.totals.you)} to ${formatNumber(g.totals.rival)}`}',
    'score={`${g.totals.you} to ${g.totals.rival}`}'],
  hofbare: ['src/components/hof-or-bust/HofOrBustBoard.tsx',
    "value: `${formatNumber(score)} pts` }]}",
    "value: `${score} pts` }]}"],
  cgpick0: ['src/lib/collegeGrid.ts',
    'best_pick: pick === 0 ? null : pick,',
    'best_pick: pick,'],
  nbastages: ['src/lib/nbaMyCareer.ts',
    "'Lost in the conference semis', 'Lost the Conference Finals', 'Lost the NBA Finals'",
    "'Lost the Conference Finals', 'Lost in the conference semis', 'Lost the NBA Finals'"],
};

/* Round 1096 undone on the create screen: the three placeholders are bare strings again. */
M.unspan = [
  ['src/pages/SoccerCareer.tsx', 'placeholder={<span>Choose nationality</span>}', 'placeholder="Choose nationality"'],
  ['src/pages/SoccerCareer.tsx', 'placeholder={<span>Choose position</span>}', 'placeholder="Choose position"'],
  ['src/pages/SoccerCareer.tsx', 'placeholder={<span>Choose era</span>}', 'placeholder="Choose era"'],
];

const id = process.argv[2];
const m = M[id];
if (!m) { console.log(`rvmut: no mutation named ${id}`); process.exit(3); }
for (const [file, from, to] of (Array.isArray(m[0]) ? m : [m])) {
  const text = fs.readFileSync(file, 'utf8');
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log(`rvmut: ${id}: needle found ${n} times in ${file}, not once. NOT APPLIED.`); process.exit(3); }
  fs.writeFileSync(file, text.replace(from, to));
  const after = fs.readFileSync(file, 'utf8');
  if (after === text || !after.includes(to)) { console.log(`rvmut: ${id}: the file did not change`); process.exit(3); }
  console.log(`rvmut: ${id} applied to ${file}`);
}
