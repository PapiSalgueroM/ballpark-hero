// Release BP probe (never committed): take Round 1519's reconcileRetirement out of repairCareer in the CURRENT
// checkout, so a load leaves a disagreeing retired flag and phase alone again (the engine before 1519 on load).
// The anchor must stand exactly once or it exits 2. Run in a throwaway checkout and restore it after.
import fs from 'node:fs';
const f = 'src/lib/soccerCareerEngine.ts';
const s = fs.readFileSync(f, 'utf8');
const a = '  if (s.phase === "season_summary" && !s.pendingSummary) s.phase = "playing";\n  reconcileRetirement(s);\n';
const n = s.split(a).length - 1;
if (n !== 1) { console.log(`mutNoRecon1519: CANNOT APPLY, the anchor is there ${n} times`); process.exit(2); }
fs.writeFileSync(f, s.replace(a, '  if (s.phase === "season_summary" && !s.pendingSummary) s.phase = "playing";\n'));
console.log('mutNoRecon1519: reconcileRetirement taken out of repairCareer (the load)');
