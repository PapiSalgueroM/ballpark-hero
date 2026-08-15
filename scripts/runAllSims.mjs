/**
 * Round 125: the guards needed a guard.
 *
 * Every round since about the fortieth has left a permanent harness behind, and
 * the whole point of a permanent harness is that a later round cannot quietly
 * undo the thing it proved. That only works if somebody actually runs them, and
 * nobody was. Round 119 gave every match a half time, which parked
 * playNextEntry on the interval waiting for a decision, and seven harnesses
 * that drive a season in a loop stalled on the very first match and started
 * reporting hundreds of failures. Rounds 119, 120, 121 and 122 all shipped on
 * top of that without anyone noticing, because the only way to notice was to
 * remember to type seven filenames and read the output.
 *
 * So this runs all of them, in one command, and comes back with one number.
 *
 * It also catches the quieter version of the same problem, which cost a whole
 * afternoon in Round 124: a harness that throws on import, prints one line of
 * stack to stderr and exits, or one whose checks all get skipped, can still
 * come back green. A harness that finishes suspiciously fast, or prints almost
 * nothing, did not run, whatever its exit code says. That is a failure here.
 *
 *   node scripts/runAllSims.mjs           the node harnesses, no browser needed
 *   node scripts/runAllSims.mjs --browser also the ones that drive a real page
 *   ONLY=simCup,simWorld node scripts/runAllSims.mjs   just those two
 *
 * The browser group needs a built site on a local port. It is opt in because it
 * takes minutes and because Playwright cannot reach the live domain from a
 * sandbox anyway, so it serves dist/ instead.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const WANT_BROWSER = process.argv.includes('--browser') || process.env.BROWSER === '1';
const ONLY = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const PORT = Number(process.env.PORT || 4173);

/* A harness that comes back this quiet did not do any work.
   The first version of this file also failed anything that finished in under
   four hundred milliseconds, on the theory that real work takes time. That was
   wrong and it is worth writing down why, because it is a tempting rule.
   simManagerOffers and simRetirementToManager both do their entire job in about
   190ms: they run hundreds of offer windows over plain arithmetic with no
   season loop underneath, so they are fast because the thing they check is
   cheap, not because they skipped it. Both printed a full report and both were
   marked EMPTY. How long a harness takes tells you about the shape of what it
   is checking, not about whether it checked it. What it PRINTED tells you that,
   so that is the only signal here now. */
const MIN_LINES = 4;

/* Anything that imports Playwright drives a real page and needs the site
   served. Sniffing the file beats keeping a list here that goes stale the first
   time somebody adds a harness and forgets this one exists. */
function needsBrowser(file) {
  const src = readFileSync(path.join(HERE, file), 'utf8');
  return /playwright/i.test(src);
}

const all = readdirSync(HERE)
  .filter((f) => /^(sim|play|sweep)[A-Za-z0-9]*\.mjs$/.test(f))
  .filter((f) => f !== 'runAllSims.mjs')
  .sort();

const chosen = ONLY.length
  ? all.filter((f) => ONLY.includes(f) || ONLY.includes(f.replace(/\.mjs$/, '')))
  : all;

const nodeGroup = chosen.filter((f) => !needsBrowser(f));
const browserGroup = chosen.filter((f) => needsBrowser(f));

if (ONLY.length) {
  const missing = ONLY.filter(
    (o) => !chosen.some((f) => f === o || f.replace(/\.mjs$/, '') === o),
  );
  if (missing.length) {
    console.log(`ONLY named ${missing.join(', ')} and there is no such harness`);
    process.exit(1);
  }
}

function run(file, extraEnv = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    let out = '';
    const child = spawn(process.execPath, [path.join(HERE, file)], {
      cwd: ROOT,
      env: { ...process.env, ...extraEnv },
    });
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      const ms = Date.now() - started;
      const lines = out.split('\n').filter((l) => l.trim()).length;
      let verdict = code === 0 ? 'PASS' : 'FAIL';
      let why = '';
      if (verdict === 'PASS' && lines < MIN_LINES) {
        verdict = 'EMPTY';
        why = `printed ${lines} line${lines === 1 ? '' : 's'}, so its checks did not run`;
      }
      resolve({ file, verdict, why, ms, lines, out });
    });
  });
}

/* Three at a time. They are all CPU bound and several of them run thousands of
   careers, so more than that just makes them fight each other for the same
   cores and the wall clock does not improve. */
async function pool(files, size, fn) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, files.length) }, async () => {
      while (next < files.length) {
        const mine = files[next++];
        results.push(await fn(mine));
      }
    }),
  );
  return results.sort((a, b) => a.file.localeCompare(b.file));
}

function report(results) {
  for (const r of results) {
    const secs = (r.ms / 1000).toFixed(1).padStart(6);
    console.log(`  ${r.verdict.padEnd(5)} ${r.file.padEnd(28)} ${secs}s`);
    if (r.why) console.log(`        ${r.why}`);
  }
}

const failures = [];

console.log(`Running ${nodeGroup.length} node harness${nodeGroup.length === 1 ? '' : 'es'}`);
const nodeResults = await pool(nodeGroup, 3, (f) => run(f));
report(nodeResults);
failures.push(...nodeResults.filter((r) => r.verdict !== 'PASS'));

if (browserGroup.length && !WANT_BROWSER) {
  console.log(
    `\nSkipping ${browserGroup.length} browser harness${browserGroup.length === 1 ? '' : 'es'} ` +
      `(${browserGroup.map((f) => f.replace('.mjs', '')).join(', ')}). Pass --browser to include them.`,
  );
  /* Round 100's lesson, worth repeating: a run that silently covers less than
     it looks like it covers reads as "everything is fine" when it is not. So
     say out loud what was left out rather than printing a clean sheet. */
} else if (browserGroup.length) {
  if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    console.log('\nNo dist/ to serve. Run npm run build first.');
    process.exit(1);
  }
  console.log(`\nServing dist on ${PORT} for ${browserGroup.length} browser harnesses`);
  const server = spawn('npx', ['serve', '-s', 'dist', '-l', String(PORT)], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  /* serve takes a moment to bind and there is no callback to wait on, so poll
     the port rather than sleeping a guessed number of seconds. */
  const deadline = Date.now() + 30000;
  let up = false;
  while (Date.now() < deadline && !up) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      if (res.ok) up = true;
    } catch { /* not listening yet */ }
    if (!up) await new Promise((r) => setTimeout(r, 400));
  }
  if (!up) {
    server.kill();
    console.log(`Nothing came up on ${PORT}, so the browser harnesses cannot run.`);
    process.exit(1);
  }
  const browserResults = await pool(browserGroup, 1, (f) =>
    run(f, { BASE: `http://127.0.0.1:${PORT}`, PORT: String(PORT) }),
  );
  report(browserResults);
  failures.push(...browserResults.filter((r) => r.verdict !== 'PASS'));
  server.kill();
}

console.log('');
if (!failures.length) {
  console.log(`All ${nodeResults.length + (WANT_BROWSER ? browserGroup.length : 0)} harnesses green.`);
  process.exit(0);
}

for (const f of failures) {
  console.log(`----- ${f.file} (${f.verdict}) -----`);
  const lines = f.out.split('\n');
  const interesting = lines.filter((l) => /FAIL|BROKEN|Error|error:/.test(l)).slice(0, 12);
  console.log((interesting.length ? interesting : lines.slice(-14)).join('\n'));
  console.log('');
}
console.log(`${failures.length} harness${failures.length === 1 ? '' : 'es'} not green.`);
process.exit(1);
