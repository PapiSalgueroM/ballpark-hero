/* Release AN fix pass: one named mutation, one command, the file put back. Sent as an extra file with a
   SERIAL remote check, never committed. Exit code = the command's. Exit 3 = the anchor was not there once. */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const VITEST = 'node_modules/.bin/vitest run --testTimeout=300000 --hookTimeout=120000';
const MUTATIONS = {
  flatwaits: {
    file: 'src/lib/translateGuard.ts',
    from: 'const WAITS = [1000, 2000, 4000, 8000];',
    to: 'const WAITS = [1000, 1000, 1000, 1000];',
    cmd: `${VITEST} src/test/translateGuard.test.tsx`,
  },
  norecord: {
    file: 'src/components/us-career/UsCareerBoard.tsx',
    from: '    playedRef.current = c;\n',
    to: '',
    cmd: `${VITEST} src/test/usSeasonCentreEntry.test.tsx`,
  },
  shoot10: {
    file: 'src/lib/clubManager.ts',
    from: 'for (let i = 1; side.length < SHOOTOUT_MAX_ORDER; i++) side.push({ n: `Their taker',
    to: 'for (let i = 1; side.length < SHOOTOUT_MAX_ORDER - 1; i++) side.push({ n: `Their taker',
    cmd: 'node scripts/simCmShootoutOrder.mjs',
  },
  nocap: {
    file: 'src/lib/soccerClubSquadSheet.ts',
    from: ' It lists up to four players at each position, the highest rated ones, so not everyone at the club is here.',
    to: '',
    cmd: `${VITEST} src/lib/soccerClubSquad.test.ts`,
  },
};

const name = process.argv[2];
const m = MUTATIONS[name];
if (!m) { console.error(`fxmut: no mutation named ${name}`); process.exit(3); }
const original = fs.readFileSync(m.file, 'utf8');
const lf = original.replace(/\r\n/g, '\n');
const hits = lf.split(m.from).length - 1;
if (hits !== 1) { console.error(`fxmut ${name}: the anchor is in ${m.file} ${hits} times, not once`); process.exit(3); }
fs.writeFileSync(m.file, lf.replace(m.from, m.to));
console.log(`fxmut ${name}: ${m.file} mutated, running: ${m.cmd}`);
let code = 1;
try {
  const r = spawnSync(m.cmd, { shell: true, stdio: 'inherit' });
  code = r.status ?? 1;
} finally {
  fs.writeFileSync(m.file, original);
}
console.log(`fxmut ${name}: command exit ${code}, file restored`);
process.exit(code);
