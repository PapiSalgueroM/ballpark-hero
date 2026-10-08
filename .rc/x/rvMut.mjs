/* Reviewer mutation runner (Round 1046). node .rc/x/rvMut.mjs <id>
   Applies ONE small mutation to a source file on the runner's checkout, rebuilds dist when the
   mutation is in what is served, runs the round's gates, prints one RESULT line per gate, and
   puts the file back (git checkout). Exit 0 always: the summary's last line says what survived. */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const VITEST = 'node_modules/.bin/vitest run src/test/seasonCentreSlots.test.tsx src/test/rankShift.test.ts src/test/seasonResume.test.ts src/test/seasonReplays.test.tsx src/test/miniPitchScene.test.ts src/test/seasonCore.test.ts --testTimeout=300000 --hookTimeout=120000';
const SIM = 'node scripts/simSeasonCentreMotion.mjs';
const PLAY_B = 'ONLY=B1,B1i,B2,B3,B4 SHOTS=/tmp/mshots ENGINES=chromium node scripts/playSeasonCentreMotion.mjs';
const PLAY_C = 'ONLY=C PORT=4571 SHOTS=/tmp/mshots ENGINES=chromium node scripts/playSeasonCentreMotion.mjs';
const PSC = 'PORT=4572 ENGINES=chromium node scripts/playSeasonCentre.mjs';
const PSM = 'PORT=4573 ENGINES=chromium node scripts/playSeasonMoments.mjs';
const SSM = 'node scripts/simSeasonMoments.mjs';
const ENTRY = 'src/components/soccer-career/SoccerSeasonCentre.tsx';

const M = {
  m1: { what: 'RankShift: a commit after one drawn with slide off now slides (the !prev.slide test dropped)', file: 'src/components/motion/RankShiftTable.tsx',
    from: 'if (!prev || !prev.slide || !slide || reducedNow() || rows.length === 0) return;', to: 'if (!prev || !slide || reducedNow() || rows.length === 0) return;', build: false, tests: { vitest: VITEST, playB: PLAY_B } },
  m2: { what: 'viewer: a resume at the LAST round is accepted (md <= M, off by one)', file: 'src/components/season-centre/SeasonCentre.tsx',
    from: 'resume.md >= 1 && resume.md <= M - 1 ? resume : null;', to: 'resume.md >= 1 && resume.md <= M ? resume : null;', build: true, tests: { vitest: VITEST, playC: PLAY_C } },
  m3: { what: 'entry: finishing ANY season clears the kept place (the key guard dropped)', file: ENTRY,
    from: 'else if (readResume(RESUME_GAME)?.key === key) clearResume(RESUME_GAME);', to: 'else clearResume(RESUME_GAME);', build: true, tests: { vitest: VITEST, sim: SIM, playC: PLAY_C } },
  m4: { what: 'entry: moments are offered whenever the page hands onCareer (offer !== false dropped)', file: ENTRY,
    from: 'const canPlay = offer !== false && !!onCareer && !!plan', to: 'const canPlay = !!onCareer && !!plan', build: true, tests: { vitest: VITEST, playC: PLAY_C, playSeasonMoments: PSM, playSeasonCentre: PSC } },
  m5: { what: 'entry: every kept place is written as stable', file: ENTRY,
    from: 'md: at.md, speed: at.speed, stable });', to: 'md: at.md, speed: at.speed, stable: true });', build: true, tests: { vitest: VITEST, sim: SIM, playC: PLAY_C } },
  m6: { what: 'entry: a table season he did not win replays once the world is AT OR PAST its year (=== became <=)', file: ENTRY,
    from: 'return seasonStable(mode, finish) || worldYear === year;', to: 'return seasonStable(mode, finish) || (typeof worldYear === "number" && year <= worldYear);', build: true, tests: { vitest: VITEST, playC: PLAY_C } },
  m7: { what: 'entry: the ledger is applied only when moments are offered (the held rule of critic C1.3 dropped)', file: ENTRY,
    from: '((canPlay || held) && plan ? planMoments', to: '(canPlay && plan ? planMoments', build: true, tests: { vitest: VITEST, playC: PLAY_C, playSeasonMoments: PSM, simSeasonMoments: SSM } },
};

const id = process.argv[2];
const m = M[id];
if (!m) { console.log(`unknown mutation ${id}`); process.exit(2); }
const sh = cmd => spawnSync('bash', ['-c', cmd], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const src = fs.readFileSync(m.file, 'utf8');
const n = src.split(m.from).length - 1;
if (n !== 1) { console.log(`REFUSED ${id}: the needle is in ${m.file} ${n} times, not once`); process.exit(2); }
fs.writeFileSync(m.file, src.replace(m.from, m.to));
console.log(`MUTATION ${id}: ${m.what}`);
console.log(sh(`git diff --stat -- ${m.file}`).stdout.trim());
const lines = [];
try {
  if (m.build) { const b = sh('npm run build'); console.log(`build exit=${b.status}`); if (b.status !== 0) console.log((b.stdout + b.stderr).split('\n').slice(-15).join('\n')); }
  for (const [name, cmd] of Object.entries(m.tests)) {
    const r = sh(cmd);
    const text = (r.stdout + '\n' + r.stderr).replace(/\x1b\[[0-9;]*m/g, '');
    const fails = text.split('\n').filter(l => /^\s*FAIL\b|^ *(×|✗)| FAIL /.test(l)).slice(0, 6).map(l => l.slice(0, 260));
    const last = text.split('\n').filter(l => l.trim()).slice(-1)[0] ?? '';
    const line = `RESULT ${id} ${name} exit=${r.status} | ${last.slice(0, 200)}`;
    lines.push(line);
    console.log(line);
    for (const f of fails) console.log(`   ${f}`);
  }
} finally {
  console.log(sh(`git checkout -- ${m.file} && git status --short -- src scripts | head -5`).stdout.trim() || 'restored: tree clean under src and scripts');
}
const red = lines.filter(l => !/ exit=0 /.test(l)).length;
console.log(`rvMut ${id}: ${red} of ${lines.length} gates went red (${red === 0 ? 'SURVIVED: nothing caught it' : 'caught'})`);
