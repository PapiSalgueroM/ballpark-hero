/* Reviewer's mutation runner (never committed). usage: node .rc/x/rvMut.mjs <id>
   Applies ONE small mutation to the checked out tree on the runner, runs the harnesses that should notice,
   prints one line per harness, restores the file with git, and exits 0. The verdict is the last line:
   "MUT <id>: KILLED by a, b" or "MUT <id>: SURVIVED (n harnesses green)". */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const sim = (name, env = {}) => ({ name: name + (env.SNAPSHOT_PROBE_ONLY ? ':probe' : ''), cmd: 'node', args: [`scripts/${name}.mjs`], env: { ...env } });
const vt = (...files) => ({ name: `vitest:${files.map(f => f.replace('src/test/', '')).join('+')}`, cmd: 'node_modules/.bin/vitest', args: ['run', ...files, '--testTimeout=300000', '--hookTimeout=120000'], env: {} });

const ENGINE = 'src/lib/soccerCareerEngine.ts';
const WORLD = 'src/lib/soccerCareerLeagueWorld.ts';
const WORLD_SET = [
  vt('src/test/soccerCareerLeagueWorld.test.ts'),
  sim('simSoccerLeagueWorldLookup'),
  sim('simCareerLeagueWorld', { SNAPSHOT_PROBE_ONLY: '1' }),
  sim('simSeasonCentreTable'),
  sim('simSeasonCentreAgreement'),
  sim('simCareerLeagueWorld'),
];
const DISCIPLINE_SET = [vt('src/test/soccerDiscipline.test.ts', 'src/test/soccerSeasonAvailability.test.ts'), sim('simSeasonCentreAgreement')];
const CONTRACT_SET = [vt('src/test/soccerCareerContracts.test.ts'), sim('simSoccerContractMoves'), sim('simClubVerdict'), sim('simLoanSpell'), sim('simContracts')];

const MUTS = {
  cooldownharness: { file: 'scripts/simCareerLifeCooldowns.mjs', from: "if (s.phase === 'random_events' && prevPhase !== 'random_events') {", to: "if (s.phase === 'random_events' && prevPhase !== 'random_events' && prevPhase !== 'red_card_appeal_result') {", run: [sim('simCareerLifeCooldowns')], what: 'NOT A MUTATION: the harness driver no longer opens a second batch when the appeal result is shown between two cards; SURVIVED here means the red was the driver counting the same queue twice' },
  none: { file: WORLD, from: 'const up = orderFor(p.lower).slice(0, p.count);', to: 'const up = orderFor(p.lower).slice(0, p.count);', run: [...WORLD_SET.slice(0, 5), ...DISCIPLINE_SET.slice(0, 1), ...CONTRACT_SET, vt('src/test/soccerSeasonCompetitions.test.tsx', 'src/test/trophyCabinet.test.tsx'), sim('simSoccerSeasonCompetitions')], what: 'BASELINE, no change: every harness must be green in the copy' },
  upoff: { file: WORLD, from: 'const up = orderFor(p.lower).slice(0, p.count);', to: 'const up = orderFor(p.lower).slice(1, p.count + 1);', run: WORLD_SET, what: 'the lower division champion is NOT promoted, 2nd to (count+1)th go up' },
  bundes3: { file: WORLD, from: "{ upper: 'Bundesliga', lower: '2. Bundesliga', count: 2 },", to: "{ upper: 'Bundesliga', lower: '2. Bundesliga', count: 3 },", run: WORLD_SET, what: 'three clubs swap in Germany instead of two' },
  notierfloor: { file: WORLD, from: 'return { ...c, league, tier: lower ? Math.max(4, c.tier) : c.tier };', to: 'return { ...c, league, tier: c.tier };', run: WORLD_SET, what: 'a relegated club keeps its top flight tier in the second division' },
  downtop: { file: WORLD, from: 'const down = orderFor(p.upper).slice(-p.count);', to: 'const down = orderFor(p.upper).slice(-p.count - 1, -1);', run: WORLD_SET, what: 'the bottom club stays up, the three above it go down' },
  banforever: { file: ENGINE, from: 'else delete s.pendingSuspensionMatches;', to: 'else void 0;', run: DISCIPLINE_SET, what: 'a served ban is never cleared, so it is served again every season' },
  appealnoban: { file: ENGINE, from: 's.pendingSuspensionMatches = serveClubSuspension(0, 0, s.pendingSuspensionMatches).remaining + result.banLength;', to: 'void 0;', run: DISCIPLINE_SET, what: 'a rejected appeal queues no ban' },
  acceptnoban: { file: ENGINE, from: 'apply: s => { s.pendingSuspensionMatches = serveClubSuspension(0, 0, s.pendingSuspensionMatches).remaining + 3; s.popularity', to: 'apply: s => { s.popularity', run: DISCIPLINE_SET, what: 'accepting the 3 match ban queues no ban' },
  wrongoffer: { file: ENGINE, from: 'const offer = verdict.offers.find(candidate => !!candidate.isLoan === loan);', to: 'const offer = verdict.offers.find(candidate => !!candidate.isLoan !== loan);', run: CONTRACT_SET, what: 'a sale listing completes through a loan offer and the other way round' },
  renewalwage: { file: ENGINE, from: "    s.contractYearsLeft = quote.contractYears ?? rand(2, 4);\n    s.weeklyWage = quote.weeklyWage;", to: "    s.contractYearsLeft = quote.contractYears ?? rand(2, 4);", run: CONTRACT_SET, what: 'a veteran renewal keeps the old wage' },
  cuprunyear: { file: ENGINE, from: 's.lastUCLResult = { ...uclResult, seasonYear: season.year, club: season.club };', to: 's.lastUCLResult = { ...uclResult, seasonYear: season.year + 1, club: season.club };', run: [vt('src/test/soccerSeasonCompetitions.test.tsx', 'src/test/trophyCabinet.test.tsx'), sim('simSoccerSeasonCompetitions')], what: 'the saved cup run is bound to the wrong season' },
};

const id = process.argv[2];
const m = MUTS[id];
if (!m) { console.log(`unknown mutation ${id}; known: ${Object.keys(MUTS).join(', ')}`); process.exit(2); }
/* Each mutation works in its own clean copy of the commit, so three can run at once. */
const HOME = process.cwd();
const COPY = `${process.env.RUNNER_TEMP || '/tmp'}/rvcopy-${id}`;
fs.mkdirSync(COPY, { recursive: true });
const ar = spawnSync('bash', ['-c', `git archive HEAD | tar -x -C "${COPY}" && ln -s "${HOME}/node_modules" "${COPY}/node_modules"`], { encoding: 'utf8' });
if (ar.status !== 0) { console.log(`MUT ${id}: NOT APPLIED, the copy failed: ${ar.stderr}`); process.exit(4); }
process.chdir(COPY);
const raw = fs.readFileSync(m.file, 'utf8');
const parts = raw.split(m.from);
if (parts.length !== 2) { console.log(`MUT ${id}: NOT APPLIED, the anchor occurs ${parts.length - 1} times in ${m.file}`); process.exit(3); }
fs.writeFileSync(m.file, parts.join(m.to));
console.log(`MUT ${id}: ${m.what}`);
const killed = []; const green = [];
try {
  for (const h of m.run) {
    const t0 = Date.now();
    const tmp = `${process.env.RUNNER_TEMP || '/tmp'}/rvmut-${id}-${h.name.replace(/[^a-z0-9]+/gi, '_')}`;
    fs.mkdirSync(tmp, { recursive: true });
    const r = spawnSync(h.cmd, h.args, { encoding: 'utf8', timeout: 1500000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: `--require=${process.cwd()}/scripts/lib/offlineTransport.cjs`, ...h.env, TEMP: tmp, TMP: tmp, TMPDIR: tmp } });
    const out = `${r.stdout || ''}\n${r.stderr || ''}`.trim().split('\n').filter(l => l.trim() && !/^\s+at /.test(l));
    const last = out.slice(-1)[0] || '';
    const firstFail = out.find(l => /FAIL|AssertionError|ERR_ASSERTION|✗|×| failed|Error:/.test(l)) || '';
    const code = r.status === null ? `signal ${r.signal}` : r.status;
    console.log(`  ${h.name} exit=${code} ${Math.round((Date.now() - t0) / 1000)}s | ${last.slice(0, 160)}${code !== 0 ? ` || first: ${firstFail.slice(0, 220)}` : ''}`);
    (code === 0 ? green : killed).push(h.name);
  }
} finally {
  fs.writeFileSync(m.file, raw);
}
console.log(killed.length ? `MUT ${id}: KILLED by ${killed.join(', ')} (green: ${green.join(', ') || 'none'})` : `MUT ${id}: SURVIVED (${green.length} harnesses green: ${green.join(', ')})`);
