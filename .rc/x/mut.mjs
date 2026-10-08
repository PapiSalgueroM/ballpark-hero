// Round 1142 fixer: do the new tests FIRE? Each mutation changes one thing in the source,
// runs the test file that has to catch it, and puts the file back. Runs on the remote runner (LF files).
// Exit 0 only when every mutation was caught (vitest went red on it).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const T = {
  handle: 'src/test/guestHandleVisit.test.tsx',
  fresh: 'src/test/freshBuildBlockedStorage.test.ts',
  cookie: 'src/test/cookieConsentStorage.test.tsx',
  vote: 'src/test/hofOrBustVoteOnce.test.tsx',
  seam: 'src/test/safeStorage.test.ts',
  client: 'src/test/supabaseClientBlockedStorage.test.ts',
  boot: 'src/test/storageBlockedBoot.test.tsx',
};
const MUTATIONS = [
  { name: 'handle-minted-every-call', file: 'src/lib/completions.ts', from: '  if (visitHandle !== null) return visitHandle;\n', to: '', tests: [T.handle] },
  { name: 'new-build-reload-guard-gone', file: 'src/lib/freshBuild.ts', from: '    if (sessionStorageIsMemory) return;\n', to: '', tests: [T.fresh] },
  { name: 'stale-chunk-reload-guard-gone', file: 'src/lib/freshBuild.ts', from: '  if (sessionStorageIsMemory) return false;\n', to: '', tests: [T.fresh] },
  { name: 'ad-slot-reads-bare-storage', file: 'src/components/ads/AdBanner.tsx', from: "return safeLocalStorage.getItem('cookie-consent');", to: "return localStorage.getItem('cookie-consent');", tests: [T.cookie] },
  { name: 'banner-writes-bare-storage', file: 'src/components/CookieConsent.tsx', from: "try { safeLocalStorage.setItem('cookie-consent', choice); }", to: "try { localStorage.setItem('cookie-consent', choice); }", tests: [T.cookie] },
  { name: 'vote-sent-without-a-marker', file: 'src/hooks/useHofOrBust.ts', from: '    if (!remembered) return;\n', to: '', tests: [T.vote] },
  { name: 'seam-writes-as-it-loads', file: 'src/lib/safeStorage.ts', from: '      real.getItem(PROBE_KEY);\n', to: "      real.setItem(PROBE_KEY, '1'); real.removeItem(PROBE_KEY);\n", tests: [T.seam] },
  { name: 'seam-writes-as-it-loads (client pin)', file: 'src/lib/safeStorage.ts', from: '      real.getItem(PROBE_KEY);\n', to: "      real.setItem(PROBE_KEY, '1'); real.removeItem(PROBE_KEY);\n", tests: [T.client] },
  { name: 'refused-seam-write-not-heard', file: 'src/lib/safeStorage.ts', from: 'catch { onRefused?.(); }', to: 'catch { /* quiet */ }', tests: [T.seam] },
  { name: 'refused-safeSetItem-not-heard', file: 'src/lib/safeStorage.ts', from: '    refusedWrite = true;\n    return false;', to: '    return false;', tests: [T.seam] },
  { name: 'unlisted-games-dropped', file: 'src/components/StorageNotice.tsx', from: '  return UNLISTED_GAME_ROUTES.includes(path)\n    || ALL_GAMES.some(', to: '  return ALL_GAMES.some(', tests: [T.boot] },
  { name: 'notice-never-probes', file: 'src/components/StorageNotice.tsx', from: 'const trouble = probeStorageWrites();', to: 'const trouble = null as ReturnType<typeof probeStorageWrites>;', tests: [T.boot] },
];

let missed = 0;
for (const m of MUTATIONS) {
  const original = fs.readFileSync(m.file, 'utf8');
  if (!original.includes(m.from)) { console.log(`MUT ${m.name}: REFUSED, the text to change is not in ${m.file}`); missed += 1; continue; }
  fs.writeFileSync(m.file, original.replace(m.from, m.to));
  let status = null;
  let tail = '';
  try {
    const run = spawnSync('node_modules/.bin/vitest', ['run', ...m.tests, '--testTimeout=60000', '--hookTimeout=60000'], { encoding: 'utf8' });
    status = run.status;
    tail = ((run.stdout || '') + (run.stderr || '')).split('\n').filter(l => /Tests\s|FAIL|failed/.test(l)).slice(0, 3).join(' | ').replace(/\u001b\[[0-9;]*m/g, '').slice(0, 200);
  } finally {
    fs.writeFileSync(m.file, original);
  }
  const caught = status !== 0;
  if (!caught) missed += 1;
  console.log(`MUT ${m.name}: vitest exit=${status} ${caught ? 'CAUGHT' : 'NOT CAUGHT'} | ${tail}`);
}
console.log(`\nmutations: ${MUTATIONS.length - missed} of ${MUTATIONS.length} caught`);
process.exit(missed ? 1 : 0);
