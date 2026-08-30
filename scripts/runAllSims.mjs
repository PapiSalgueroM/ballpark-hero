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
  /* Round 133: this used to be a plain search for the word "playwright"
     anywhere in the file, and it had a real victim. simNoRivalNames.mjs lists
     '.playwright-mcp' among the directories it skips, so it matched, got filed
     as a browser harness, and was quietly left out of every default run. A
     guard that never runs is not a guard, and the way it failed was silent:
     the suite still printed "all green" while skipping the newest check in it.
     What actually makes a harness need a browser is IMPORTING playwright, so
     that is what gets asked now. */
  return /(?:import|require)\s*(?:[\w{},*\s]*from\s*)?['"][^'"]*playwright/i.test(src);
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

/* ONLY means "which harnesses do I run" to this file and "which game route do I
   play" to playGames.mjs, and the two meanings are not compatible. Running
   ONLY=playGames to chase one failure handed playGames the string
   "sweepGames,playGames,simTactics,playClubManager" as a URL path and it died on
   an invalid URL, which reads exactly like a broken harness and is not one.
   A runner has to hand its children a clean environment rather than leaking the
   flags that were meant for itself, so both of this file's own controls are
   stripped on the way down. */
const OWN_CONTROLS = ['ONLY', 'BROWSER'];

function run(file, extraEnv = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    let out = '';
    const childEnv = { ...process.env, ...extraEnv };
    for (const k of OWN_CONTROLS) if (!(k in extraEnv)) delete childEnv[k];
    const child = spawn(process.execPath, [path.join(HERE, file)], {
      cwd: ROOT,
      env: childEnv,
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

/* ROUND 356: A HARNESS THAT COULD NOT REACH THE DATABASE IS NOT A FAILING
 * HARNESS, AND IT IS NOT A PASSING ONE EITHER.
 *
 * Four harnesses read the live database (R344 simValueFreshness, R345
 * simWorldXiPositions, R353 simSoccerGridTiers, R354 simGridArchive) and the
 * count climbs with every data-backed fence. The cloud sandbox's egress proxy
 * answers that host with a 403, so in that lane all four fail every single
 * run, and a board that is permanently four-red stops being read, which costs
 * far more than the four checks do.
 *
 * The fix is not a list of harness names here. This file's own rule is that
 * sniffing beats a list that goes stale, and a text sniff would miss half of
 * them anyway: two reach the database indirectly, through app libs, and never
 * mention it. What every one of them DOES do is say so in its output, in the
 * words its author chose, before exiting non-zero:
 *
 *     DATABASE UNREACHABLE. NOTHING WAS CHECKED.
 *     SUPABASE UNREACHABLE OR POOL TOO SMALL. NOTHING WAS CHECKED.
 *     NBA GRID DATA UNREACHABLE. NOTHING WAS CHECKED.
 *     SOCCER GRID POOL UNREACHABLE OR TOO SMALL. NOTHING WAS CHECKED.
 *
 * So the harness is believed when it says it checked nothing, and the runner
 * checks the claim rather than taking it: it probes the database ONCE itself.
 *
 *   database unreachable  -> that harness is SKIPPED, with the reason printed.
 *   database reachable    -> it stays a FAILURE, because there the sentence
 *                            means the data broke, not that the sandbox did.
 *
 * A skip is never counted as a pass, is listed by name, and is repeated in the
 * closing line, because Round 100's lesson is that a run covering less than it
 * appears to reads as "everything is fine" when it is not. On the desktop lane,
 * where the database answers, this changes nothing at all.
 *
 * DB_PROBE=reachable forces the reachable branch, which turns the skips back
 * into the four failures and proves the probe is what suppresses them. */
const NOTHING_CHECKED = /NOTHING WAS CHECKED/i;

async function databaseReachable() {
  const forced = process.env.DB_PROBE || '';
  if (forced === 'reachable') return { ok: true, why: 'DB_PROBE=reachable forced it' };
  if (forced === 'unreachable') return { ok: false, why: 'DB_PROBE=unreachable forced it' };
  let url; let key;
  try {
    const client = readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
    url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)?.[1];
    key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)?.[1];
  } catch { /* the client file is the source of truth and it is not there */ }
  if (!url || !key) return { ok: false, why: 'no database URL or key in src/integrations/supabase/client.ts' };
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    /* Any HTTP answer from the database itself counts as reachable, including
       an error status. What must not count is the proxy's own refusal, which
       is what the sandbox returns and which never comes from that host. */
    const body = await res.text().catch(() => '');
    if (/host not in allowlist/i.test(body)) return { ok: false, why: `the egress proxy refused the host (HTTP ${res.status})` };
    return { ok: true, why: `answered HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, why: String(err).slice(0, 100) };
  }
}

const db = await databaseReachable();

const failures = [];
const skipped = [];

console.log(`Running ${nodeGroup.length} node harness${nodeGroup.length === 1 ? '' : 'es'}`);
const nodeResults = await pool(nodeGroup, 3, (f) => run(f));
for (const r of nodeResults) {
  if (r.verdict === 'FAIL' && !db.ok && NOTHING_CHECKED.test(r.out)) {
    r.verdict = 'SKIP';
    r.why = `it reached no database and said so, and the database is unreachable here (${db.why})`;
  }
}
report(nodeResults);
failures.push(...nodeResults.filter((r) => r.verdict !== 'PASS' && r.verdict !== 'SKIP'));
skipped.push(...nodeResults.filter((r) => r.verdict === 'SKIP'));

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
  /* Round 284: not `npx serve -s dist` any more. That flag rewrites every
     extension-less path to index.html before it looks at the filesystem, so
     the prerendered documents were never served and playSoftFourOhFour
     reported the 404 marker firing on real pages. scripts/lib/hostLikeServer
     does what the live host does: the route's own document if it has one,
     index.html with a 200 if it does not. */
  const server = spawn(process.execPath, [path.join(HERE, 'lib', 'hostLikeServer.mjs'), 'dist', String(PORT)], {
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
  /* Round 127: SWEEP_BASE as well as BASE. Every browser harness in the repo
     reads SWEEP_BASE and falls back to a hardcoded 127.0.0.1:4173, so this only
     ever worked on the default port. Running the suite with PORT set to
     anything else served dist on the new port and then sent all four harnesses
     at 4173, where they got connection refused on every single route and came
     back with hundreds of failures that had nothing to do with anything. */
  const browserResults = await pool(browserGroup, 1, (f) =>
    run(f, {
      BASE: `http://127.0.0.1:${PORT}`,
      SWEEP_BASE: `http://127.0.0.1:${PORT}`,
      PORT: String(PORT),
    }),
  );
  report(browserResults);
  failures.push(...browserResults.filter((r) => r.verdict !== 'PASS'));
  server.kill();
}

console.log('');
/* Round 356: a skip is said out loud every time, above the verdict line, so
   "all green" can never quietly mean "all green except the ones nobody ran". */
if (skipped.length) {
  console.log(
    `${skipped.length} harness${skipped.length === 1 ? '' : 'es'} SKIPPED, not run and not counted: ` +
      `${skipped.map((r) => r.file.replace('.mjs', '')).join(', ')}.`,
  );
  console.log(`Each one reached no database and said so, and the database is unreachable here: ${db.why}.`);
  console.log('Run these where egress to the database is open, or DB_PROBE=reachable to see them fail here.');
}
if (!failures.length) {
  const ran = nodeResults.length + (WANT_BROWSER ? browserGroup.length : 0) - skipped.length;
  console.log(`All ${ran} harnesses green${skipped.length ? `, ${skipped.length} skipped above` : ''}.`);
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
