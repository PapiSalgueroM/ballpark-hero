// Release BP triage SCRATCH (never committed): on the runner's throwaway checkout, let simCmVar's prior bundle build.
// Today's sibling modules, which the prior engine is linked with, now import names the prior engine never had:
// weighedTrophies (clubManagerMeters, pulled in since Round 1443 made clubManagerFinances import it, MAIN) and
// careerPlace and shownNation (clubManagerBoardAsks since Round 1520, BP). This patch appends to the prior engine's
// source a re-export of exactly the missing names from today's engine file (already in that bundle), so the
// siblings get the functions they get in today's bundle and the prior engine's own code is unchanged.
// A model of a harness fix, run on both trees to compare them; prints which names it bridged.
import fs from 'node:fs';
const file = 'scripts/simCmVar.mjs';
const src = fs.readFileSync(file, 'utf8');
if (src.includes('cmVarPatchShim')) { console.log('cmVarPatch: already applied on this checkout'); process.exit(0); }
const from = "const oldFactory = await bundle(git.stdout, ";
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`cmVarPatch: anchor found ${n} times, not once`); process.exit(2); }
const shim = [
  "const cmVarPatchShim = ['careerPlace', 'shownNation', 'weighedTrophies'].filter(name => new RegExp('export (function|const) ' + name + '\\\\b').test(sources[engine]) && !new RegExp('export (function|const) ' + name + '\\\\b').test(git.stdout));",
  "    console.log('cmVarPatch shim: prior engine re-exports ' + (cmVarPatchShim.join(', ') || 'nothing') + ' from today');",
  "    const priorShimmed = git.stdout + (cmVarPatchShim.length ? '\\nexport { ' + cmVarPatchShim.join(', ') + \" } from '\" + path.join(root, 'src/lib/clubManager.ts').split(path.sep).join('/') + \"';\\n\" : '');",
  "    const oldFactory = await bundle(priorShimmed, ",
].join('\n');
fs.writeFileSync(file, src.replace(from, shim));
console.log('cmVarPatch: 1 rewrite (prior engine bundle bridged)');
