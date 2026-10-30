// Reviewer attribution of the cmLeagueRulesDigest.json retake (a runner only, sent as .rc/x/digest1593.mjs, #!serial).
// node .rc/x/digest1593.mjs playoff   the base's digest file, the head with ONLY my club's Europa League opt in dropped
//                                     (scripts/lib/worldUelPlay.mjs PLAY_EDITS): must be green (the participant is the cause)
// node .rc/x/digest1593.mjs plain     the base's digest file, the head as it is: must be red (the retake was needed)
// Restores both files byte for byte. Prints the harness's last lines and the exit code.
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { PLAY_EDITS } from '../../scripts/lib/worldUelPlay.mjs';

const mode = process.argv[2];
const DIGEST = 'scripts/data/cmLeagueRulesDigest.json';
const saved = new Map();
const keep = f => { if (!saved.has(f)) saved.set(f, fs.readFileSync(f)); };
let code = 2;
try {
  keep(DIGEST);
  fs.writeFileSync(DIGEST, execFileSync('git', ['show', `14a9af704:${DIGEST}`]));
  if (mode === 'playoff') {
    for (const e of PLAY_EDITS) {
      keep(e.file);
      const t = fs.readFileSync(e.file, 'utf8');
      if (t.split(e.from).length - 1 !== 1) { console.log(`digest1593: ABORT, the opt in line stands ${t.split(e.from).length - 1} times`); process.exit(2); }
      fs.writeFileSync(e.file, t.replace(e.from, e.to));
    }
  }
  const r = spawnSync('node', ['scripts/simCmLeagueRules.mjs'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const lines = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n');
  console.log(lines.filter(l => /FAIL|differ|moved|passed|RED/i.test(l)).slice(0, 30).join('\n'));
  console.log(lines.slice(-3).join('\n'));
  code = r.status;
} finally {
  for (const [f, b] of saved) fs.writeFileSync(f, b);
}
console.log(`digest1593 ${mode}: simCmLeagueRules exit ${code}`);
process.exit(code ?? 2);
