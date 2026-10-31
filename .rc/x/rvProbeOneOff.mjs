// Reviewer probe (rBVG-cm-bv) of simOneOffCups section 3. Hypothesis: the only thing that parts the two arms is the
// press's preview of the NEXT fixture, which in the head arm is the super cup night itself (the night the section
// already takes out of the calendar) and in the other arm is the league opener. The probe takes the press block out
// of both arms' records (nothing else) and prints, at each first difference, which keys differ.
// Run from the repo root of a scratch worktree on the runner.
import fs from 'node:fs';
const file = 'scripts/simOneOffCups.mjs';
let src = fs.readFileSync(file, 'utf8');
const once = (from, to) => {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`rvProbeOneOff: anchor stands ${n} times, refusing: ${from.slice(0, 70)}`); process.exit(9); }
  src = src.replace(from, to);
};
once('        const headRecord = st => ((st.calendar',
  '        const noP = st => { if (!st || !st.press) return st; const c = { ...st }; delete c.press; return c; };\n' +
  '        const headRecord = st0 => { const st = noP(st0); return ((st.calendar');
once("st.calendar.filter(e => !e.night) }) : withoutDsc(st));\n        const pastNight",
  "st.calendar.filter(e => !e.night) }) : withoutDsc(st)); };\n        const pastNight");
once('        const b = await journey(off, f, seed, mode, { record: st => JSON.stringify(st) });',
  '        const b = await journey(off, f, seed, mode, { record: st => JSON.stringify(noP(st)) });');
fs.writeFileSync(file, src);
console.log('rvProbeOneOff: applied (the press block left out of both arms of section 3)');
