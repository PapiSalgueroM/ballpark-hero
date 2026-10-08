// Round 1142 fixer: do the new BROWSER checks fire? Each mutation changes the source, builds the
// site into its own folder, serves it on its own port, runs playStorageBlocked scoped to the
// routes that matter, and puts the source back. Exit 0 only when every mutation turned the harness red
// on the line it was aimed at. Runs on the remote runner (LF files, Chromium installed).
import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';

const OLD_COMPLETIONS = fs.readFileSync('.rc/x/completions.old.ts', 'utf8');
const MUTATIONS = [
  { name: 'old-guest-handle (the render loop)', file: 'src/lib/completions.ts', whole: OLD_COMPLETIONS,
    env: { ONLY: '/footle,/soccer-career', MODES: 'full' }, expect: /FAIL .*leaving: .*NEVER DREW|FAIL .*writes refused in one idle second/ },
  { name: 'ad-slot-reads-bare-storage', file: 'src/components/ads/AdBanner.tsx',
    from: "return safeLocalStorage.getItem('cookie-consent');", to: "return localStorage.getItem('cookie-consent');",
    env: { ONLY: '/whats-new', MODES: 'full' }, expect: /FAIL .*"Accept": the answer held/ },
  { name: 'vote-sent-without-a-marker', file: 'src/hooks/useHofOrBust.ts', from: '    if (!remembered) return;\n', to: '',
    env: { ONLY: '/hof-or-bust', MODES: 'full' }, expect: /FAIL .*community votes sent/ },
  { name: 'long-notice-on-a-phone', file: 'src/components/StorageNotice.tsx',
    from: '"Storage is blocked, so progress won\'t save."', to: '"This browser blocks storage, so progress won\'t be saved."',
    env: { ONLY: '/soccer-career', MODES: 'blocked' }, expect: /FAIL .*wide BLOCKED: the notice is one line tall/ },
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let missed = 0;
let port = 4180;
for (const m of MUTATIONS) {
  port += 1;
  const original = fs.readFileSync(m.file, 'utf8');
  if (!m.whole && !original.includes(m.from)) { console.log(`HMUT ${m.name}: REFUSED, the text to change is not in ${m.file}`); missed += 1; continue; }
  if (m.whole && m.whole === original) { console.log(`HMUT ${m.name}: REFUSED, the old file is the same as the new one`); missed += 1; continue; }
  const out = `dist-mut-${port}`;
  let server = null;
  let status = null;
  let text = '';
  try {
    fs.writeFileSync(m.file, m.whole ?? original.replace(m.from, m.to));
    const build = spawnSync('node_modules/.bin/vite', ['build', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], { encoding: 'utf8' });
    if (build.status !== 0) { console.log(`HMUT ${m.name}: THE BUILD FAILED\n${(build.stderr || build.stdout || '').slice(-600)}`); missed += 1; continue; }
    server = spawn('node', ['scripts/lib/hostLikeServer.mjs', out, String(port)], { stdio: 'ignore' });
    await sleep(2500);
    const run = spawnSync('node', ['scripts/playStorageBlocked.mjs'], {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, ...m.env, BASE: `http://localhost:${port}`, SWEEP_BASE: `http://localhost:${port}`, PLAY_STORAGE_NATIVE: 'off', PLAY_STORAGE_CONTROL: '', PLAY_STORAGE_OUT: '', RC_OUT: '' },
    });
    status = run.status;
    text = (run.stdout || '') + (run.stderr || '');
  } finally {
    fs.writeFileSync(m.file, original);
    if (server) server.kill();
  }
  const fails = text.split('\n').filter(l => /^\s*FAIL\s/.test(l));
  const aimed = fails.filter(l => m.expect.test(l));
  const summary = (text.split('\n').filter(l => /^playStorageBlocked.*checks/.test(l)).pop() || 'no summary line').trim();
  const caught = status === 1 && aimed.length > 0;
  if (!caught) missed += 1;
  console.log(`HMUT ${m.name}: exit=${status} ${caught ? 'CAUGHT' : 'NOT CAUGHT'} | ${summary} | ${aimed.length} aimed FAIL of ${fails.length}`);
  for (const l of aimed.slice(0, 3)) console.log('     ' + l.trim().slice(0, 240));
  if (!caught) for (const l of fails.slice(0, 6)) console.log('     other: ' + l.trim().slice(0, 240));
}
console.log(`\nbrowser mutations: ${MUTATIONS.length - missed} of ${MUTATIONS.length} caught`);
process.exit(missed ? 1 : 0);
