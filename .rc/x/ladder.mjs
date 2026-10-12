/* Round 1320 step (a) probe: hostNextYear over a ladder of synthetic careers, on whatever tree ROOT is.
   Prints the count, the answer shares and a sha1 of every answer in order. The same ladder is in
   scripts/simCollegeSeat.mjs S9, which holds the lifted seatNextYear to the digest printed here on the base. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const ROOT = path.resolve(process.argv[2] || process.cwd());
const ROOT_URL = ROOT.replaceAll('\\', '/');
function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'esbuild', 'package.json'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) throw new Error('no esbuild');
    d = up;
  }
}
const NM = modulesDir();
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ladder-')).replaceAll('\\', '/');
fs.writeFileSync(`${WORK}/entry.mjs`, `export * as H from '${ROOT_URL}/src/lib/gmDeskHost.ts';\n`);
const esbuild = createRequire(`${NM}/`)('esbuild');
await esbuild.build({ entryPoints: [`${WORK}/entry.mjs`], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
  alias: { '@': `${ROOT_URL}/src` }, outfile: `${WORK}/b.cjs`, logLevel: 'error' });
const { H } = createRequire(import.meta.url)(`${WORK}/b.cjs`);

/* ---- the ladder (copied verbatim into simCollegeSeat S9) ---- */
function seatLadder() {
  const out = [];
  const ENDS = ['fired', 'walked', 'poached', 'expired'];
  for (let titles = 0; titles <= 6; titles++)
    for (let over = 0; over <= 3; over++)
      for (const filler of [0, 3, 8])
        for (const lastGrade of ['met', 'missed', 'badly'])
          for (const ended of ENDS)
            for (let out0 = 0; out0 <= 4; out0++)
              for (let tier = 1; tier <= 4; tier++)
                for (const inLeague of [true, false]) {
                  const grades = [
                    ...Array(titles).fill('title'), ...Array(over).fill('overachieved'),
                    ...Array(filler).fill('met'), lastGrade,
                  ];
                  const career = {
                    version: 1, seasonsOut: out0,
                    stints: [{ team: 'old', tier: inLeague ? 4 : tier, from: 1, grades, ended }],
                  };
                  /* the old club's tier today, or absent from the league so the stint's own tier is read */
                  const tiers = new Map([['a', 1], ['b', 2], ['c', 3], ['d', 4]]);
                  if (inLeague) tiers.set('old', tier);
                  out.push({ career, tiers });
                }
  return out;
}
const ladder = seatLadder();
const answers = ladder.map(({ career, tiers }) => H.hostNextYear({ career }, tiers));
const text = JSON.stringify(answers);
const share = {};
for (const a of answers) { const k = `${a.nextYear}:${a.climbTo}`; share[k] = (share[k] ?? 0) + 1; }
console.log(`ladder ${ladder.length} careers; answers ${JSON.stringify(share)}`);
console.log(`ladder digest ${crypto.createHash('sha1').update(text).digest('hex')}`);
fs.rmSync(WORK, { recursive: true, force: true });
