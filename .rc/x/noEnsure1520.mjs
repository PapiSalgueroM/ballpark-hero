// Release BP triage SCRATCH probe (never committed): in the CURRENT checkout (a throwaway worktree on a runner),
// make Round 1520's ensureMadeUpNations do nothing, to see whether the stamp it runs in loadCareer and playNextEntry is
// what moves simCmShootoutOrder's historical unmanaged play. Exit 2 when the anchor is not there exactly once.
import fs from 'node:fs';
const file = 'src/lib/clubManager.ts';
const src = fs.readFileSync(file, 'utf8');
const from = 'export function ensureMadeUpNations(state: CareerState): void {';
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`noEnsure1520: CANNOT APPLY, anchor found ${n} times`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, from + ' if (state) return;'));
console.log('noEnsure1520: ensureMadeUpNations returns at once');
