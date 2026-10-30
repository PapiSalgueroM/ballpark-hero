// Reviewer mutations for Round 1576 (runner only; the request line restores the tree with git checkout).
// Usage: node .rc/x/rv-mut.mjs <name>
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const RECORD = 'scripts/data/bingoClubAdditions-2026-10.json';
const HARNESS = 'scripts/simBingoClubCounts.mjs';
const name = process.argv[2];
const rec = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
const all = [...rec.additions, ...rec.agrees, ...rec.partial];
const man = n => {
  const e = all.find(x => x.name === n);
  if (!e) { console.log(`MUTATION ABORT: ${n} not in the record`); process.exit(9); }
  return e;
};
const writeRec = () => fs.writeFileSync(RECORD, JSON.stringify(rec, null, 2) + '\n');
const regen = () => console.log(execSync('node scripts/genBingoClubAdditions.mjs 2>&1; echo gen-exit=$?', { encoding: 'utf8', shell: '/bin/bash' }).trim());
const patch = (file, from, to, count = 1) => {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== count) { console.log(`MUTATION ABORT: "${from.slice(0, 60)}" found ${n} times in ${file}, expected ${count}`); process.exit(9); }
  fs.writeFileSync(file, src.split(from).join(to));
};

if (name === 'bornone') {
  const e = man('Marcus Rashford');
  e.identity.sources = e.identity.sources.slice(0, 1);
  writeRec();
} else if (name === 'family') {
  const e = man('Marcus Rashford');
  const s = e.window.clubs[0].sources;
  const i = s.findIndex(x => x.url.includes('fotmob.com'));
  if (i < 0) { console.log('MUTATION ABORT: no fotmob source'); process.exit(9); }
  s[i].url = 'https://www.transfermarkt.us/marcus-rashford/profil/spieler/258923';
  writeRec();
} else if (name === 'stalerange') {
  const e = man('Marcus Rashford');
  const c = e.clubs.find(x => x.club === 'FC Barcelona');
  c.fromSeason = '2024-25';
  c.toSeason = '2024-25';
  writeRec();
  regen();
} else if (name === 'noround') {
  const e = man('Tijjani Reijnders');
  if (e.round !== 1576) { console.log('MUTATION ABORT: Reijnders has no round 1576'); process.exit(9); }
  delete e.round;
  writeRec();
} else if (name === 'holefilter') {
  patch(HARNESS, "if (p && !holeSet.has(p.name)) out.add(p.name);", 'if (p) out.add(p.name);');
} else if (name === 'fromswap') {
  patch(HARNESS, 'if (fromKey && !counted.has(fromKey)) out.add(p.name);', 'if (fromKey && counted.has(fromKey)) out.add(p.name);');
} else if (name === 'mancity') {
  const e = man('Tijjani Reijnders');
  const c = e.clubs.find(x => x.club === 'Manchester City');
  const w = e.window.clubs.find(x => x.club === 'Manchester City');
  if (!c || !w) { console.log('MUTATION ABORT: no Manchester City on Reijnders'); process.exit(9); }
  c.club = 'Man City';
  w.club = 'Man City';
  writeRec();
  regen();
} else if (name === 'namesake') {
  const e = man('Nico González');
  e.nationality = 'Spain';
  writeRec();
  regen();
} else if (name === 'fleet') {
  patch(HARNESS, 'for (let seed = 1; seed <= 200; seed++) {', 'for (let seed = 1; seed <= 2000; seed++) {', 2);
  patch(HARNESS, 'if (boardsEqual !== 200)', 'if (boardsEqual !== 2000)');
  patch(HARNESS, 'if (prevBoards !== 200)', 'if (prevBoards !== 2000)');
} else {
  console.log(`MUTATION ABORT: unknown ${name}`);
  process.exit(9);
}
console.log(`MUTATION APPLIED: ${name}`);
console.log(execSync('git diff --stat', { encoding: 'utf8' }).trim());
