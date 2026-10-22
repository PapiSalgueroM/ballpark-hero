// Round 1543 one shot leg (never committed): runBot with the new `counts` flag off
// returns exactly what the base tycoonBots returns (pace, seeds 1 to 3, 30 minutes),
// and with it on returns the same plus countFirsts. Run from the repo root on a runner
// after: git show <base>:scripts/lib/tycoonBots.mjs > scripts/lib/tycoonBotsBase1543.mjs
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const head = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/tycoonBots.mjs')).href);
const base = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/tycoonBotsBase1543.mjs')).href);
const tmp = head.freshTmp('probe-bots');
const T = await head.bundleTs(ROOT, path.join(ROOT, 'src/lib/stadiumTycoon.ts'), tmp, 'probe');
const dt = head.readDt(ROOT);
let same = 0; let bad = 0;
for (const seed of [1, 2, 3]) {
  const a = JSON.stringify(base.runBot(T, { policy: 'pace', seed, minutes: 30, dt }));
  const b = JSON.stringify(head.runBot(T, { policy: 'pace', seed, minutes: 30, dt }));
  const on = head.runBot(T, { policy: 'pace', seed, minutes: 30, dt, counts: true });
  const { countFirsts, ...rest } = on;
  const c = JSON.stringify(rest);
  const ok = a === b && a === c && countFirsts && Object.keys(countFirsts.goals).length > 0;
  if (ok) same += 1; else bad += 1;
  console.log(`seed ${seed}: base ${a.length} chars, head flag off ${a === b ? 'identical' : 'DIFFERS'}, flag on without countFirsts ${a === c ? 'identical' : 'DIFFERS'}; goals ${Object.keys(countFirsts.goals).length} k, wins ${Object.keys(countFirsts.wins).length} k, streak ${Object.keys(countFirsts.streak).length} k`);
}
console.log(`probeBots1543: ${same} of 3 identical, ${bad} differ`);
process.exit(bad ? 1 : 0);
