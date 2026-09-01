/**
 * Round 375: a database write that is never sent.
 *
 * WHAT WAS WRONG. `guess_nation_scores` had ZERO rows while
 * `daily_completions`, the sitewide recorder, held eight finished games of
 * guess-the-nation, the most recent 2026-08-27. Every sibling game agreed with
 * its own table: ufc-chain 7 completions and 8 rows, guess-cbb-team 3 and 206,
 * guess-nascar-driver 1 and 19. Only this one recorded nothing, ever.
 *
 * WHY. The Supabase query builder is a THENABLE. Building the query sends
 * nothing; the request only leaves when something awaits it or calls .then().
 * Both writes in useGuessTheNation stopped at the semicolon:
 *
 *     supabase.from('guess_nation_scores').insert({ ... });      // never sent
 *     supabase.from('nascar_scores').insert({ ... }).then(()=>{}) // sent
 *
 * It is not RLS, and that was checked rather than assumed: running the same
 * insert as the `anon` role inside a rolled back transaction, the database
 * accepts it. The request simply never arrived.
 *
 * WHY THIS SHAPE IS SO EASY TO SHIP. It has no symptom. Nothing throws, nothing
 * logs, the game plays perfectly and the player sees their score. The only
 * evidence is an empty table nobody was looking at, which is why it survived
 * from the game's launch until an unrelated audit went looking for empty
 * tables on purpose.
 *
 * WHAT THIS HOLDS:
 *   1. SOURCE. No insert, update, upsert or delete anywhere in `src` is left
 *      unawaited, unreturned, unassigned and unthened. This is the class.
 *   2. RUNTIME, and this is the one that proves the fix rather than the shape.
 *      A real browser plays a round of Guess the Nation to a finish and the
 *      harness watches the network: a POST to the scores table must actually
 *      leave. A source check would pass on any spelling of the bug it did not
 *      anticipate; this one asks the only question that matters, did the
 *      request go.
 *
 * NEGATIVE CONTROLS:
 *   WRITES_CONTROL=drop     strips the `.then(() => {})` off the fixed lines in
 *                           an in memory copy of the source, restoring exactly
 *                           what shipped, and section 1 must go red.
 *   WRITES_CONTROL=noserve  serves a bundle with the same `.then()` stripped,
 *                           so the browser really does replay the bug, and
 *                           section 2 must go red. This is the control that
 *                           proves section 2 watches the wire.
 * Both refuse to run if what they strip was not there to strip.
 *
 * Run: node scripts/simWritesAreSent.mjs   (needs dist for section 2)
 */
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CONTROL = process.env.WRITES_CONTROL || '';
if (CONTROL && CONTROL !== 'drop' && CONTROL !== 'noserve') {
  console.error(`WRITES_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

console.log('1) no database write in src is built and then dropped on the floor');
{
  const files = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.tsx?$/.test(e.name)) files.push(f);
    }
  };
  walk(path.join(ROOT, 'src'));

  const CALL = /\.from\(\s*['"`]([a-z_0-9]+)['"`]\s*\)\s*\n?\s*\.(insert|upsert|update|delete)\s*\(/g;
  let total = 0, dropped = 0, planted = 0;
  for (const f of files) {
    let src = fs.readFileSync(f, 'utf8');
    if (CONTROL === 'drop' && f.endsWith(path.join('hooks', 'useGuessTheNation.ts'))) {
      const before = src;
      /* Restore the shipped bug exactly: the builder with nothing after it. */
      src = src.replace(/\}\)\.then\(\(\) => \{\}\);/g, '});');
      if (src === before) { console.error('control cannot run: there was no .then() to strip in useGuessTheNation.ts'); process.exit(1); }
      planted += 1;
    }
    for (const m of [...src.matchAll(CALL)]) {
      total += 1;
      /* Walk FORWARD from the write's opening paren to the end of the chain,
         so a multi line argument object does not hide the tail. */
      let i = m.index + m[0].length - 1, depth = 0;
      while (i < src.length) {
        if (src[i] === '(') depth += 1;
        else if (src[i] === ')') { depth -= 1; if (depth === 0) break; }
        i += 1;
      }
      let tail = src.slice(i + 1);
      /* Chained filters are still part of the same unsent builder. */
      let guard = 0;
      while (guard++ < 12) {
        const c = /^\s*\.(eq|neq|gt|gte|lt|lte|in|is|match|filter|select|single|maybeSingle|order|limit|throwOnError)\s*\(/.exec(tail);
        if (!c) break;
        let j = tail.indexOf('(', c[0].length - 1), d2 = 0;
        while (j < tail.length) {
          if (tail[j] === '(') d2 += 1;
          else if (tail[j] === ')') { d2 -= 1; if (d2 === 0) break; }
          j += 1;
        }
        tail = tail.slice(j + 1);
      }
      const thened = /^\s*\.(then|catch|finally)\s*\(/.test(tail);

      /* Walk BACKWARD to the start of the statement, not just the line. The
         first version of this check only read the current line's prefix and
         reported three false positives where the `await` sat a line above. */
      const head = src.slice(0, m.index);
      const bound = Math.max(head.lastIndexOf(';'), head.lastIndexOf('{'), head.lastIndexOf('}'), head.lastIndexOf('=>'));
      const stmt = head.slice(bound + 1);
      const sent = /\b(await|return)\b/.test(stmt) || /=\s*$/.test(stmt.trimEnd().slice(-1) === '=' ? stmt.trimEnd() : '') || /=[^=]*$/.test(stmt.split('supabase')[0] || '');

      if (!thened && !sent) {
        dropped += 1;
        const line = src.slice(0, m.index).split('\n').length;
        if (dropped <= 6) fail(`${path.relative(ROOT, f)}:${line} builds a ${m[2]} into ${m[1]} and never sends it. The Supabase builder is a thenable: add .then(() => {}) or await it.`);
      }
    }
  }
  if (CONTROL === 'drop') {
    if (planted === 0) { console.error('control cannot run: useGuessTheNation.ts was never reached'); process.exit(1); }
    console.log('   NEGATIVE CONTROL ON (drop): the .then() stripped from the fixed lines, restoring what shipped. Section 1 must go red.');
  }
  console.log(`   ${total} write calls in src, ${dropped} never sent`);
  if (total < 20) fail(`only ${total} write calls were found, so the scan is not reaching the code`);
}

console.log('2) a finished round really does put a request on the wire');
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  fail('there is no dist to serve, so the runtime half could not run');
} else {
  const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
  const isFile = f => { try { return fs.statSync(f).isFile(); } catch { return false; } };
  let stripped = 0;
  const server = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(DIST, p);
    if (p !== '/' && !p.endsWith('.html') && isFile(f)) {
      let body = fs.readFileSync(f);
      if (CONTROL === 'noserve' && p.endsWith('.js')) {
        /* Replay the bug in the SERVED bundle. Minified, so the shape is
           matched rather than the source text: an insert into the scores table
           whose promise is consumed. Removing the consumer leaves the builder
           unsent, exactly as before the fix. */
        const s = body.toString('utf8');
        if (s.includes('guess_nation_scores')) {
          const out = s.replace(/\.then\(\(\)=>\{\}\)/g, '');
          if (out !== s) { stripped += 1; body = Buffer.from(out, 'utf8'); }
        }
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
      res.end(body);
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(fs.readFileSync(path.join(DIST, 'index.html')));
  });
  const PORT = 4186;
  await new Promise(r => server.listen(PORT, r));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const posted = [];
  page.on('request', r => {
    if (r.method() === 'POST' && /\/rest\/v1\/guess_nation_scores/.test(r.url())) posted.push(r.url());
  });
  /* The write is the only thing under test, so the response is stubbed rather
     than sent to the live project: this harness must not add rows to a real
     scores table every time somebody runs the board. */
  await page.route('**/rest/v1/guess_nation_scores*', route => route.fulfill({ status: 201, body: '[]', contentType: 'application/json' }));

  await page.goto(`http://127.0.0.1:${PORT}/guess-the-nation`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  let played = false;
  try {
    const start = page.getByRole('button', { name: /daily/i }).first();
    await start.click({ timeout: 8000 });
    await page.waitForTimeout(1200);
    /* Guess until the round ends, win or lose: both paths write through the
       same builder, so the harness never needs to know today's country.
       THE INPUT HAS NO ENTER HANDLER. A guess is only submitted by clicking a
       suggestion, which the first draft of this section did not know: it typed
       nonsense, pressed Enter, reported played=true and saw no request, which
       looks exactly like the bug. So it types a real prefix and clicks. */
    const PREFIXES = ['ge', 'br', 'ja', 'ca', 'no', 'sp', 'it', 'ke', 'ch', 'po', 'sw', 'ar', 'me', 'in'];
    for (const prefix of PREFIXES) {
      if (posted.length) break;
      const box = page.locator('input[aria-label="Search countries"]').first();
      if (!(await box.count())) break;
      await box.fill(prefix);
      await page.waitForTimeout(300);
      const option = page.locator('div.absolute button, div.absolute [role="option"]').first();
      if (!(await option.count())) continue;
      await option.click();
      played = true;
      await page.waitForTimeout(400);
    }
  } catch (e) {
    fail(`the harness could not drive Guess the Nation to a finish: ${String(e).split('\n')[0]}`);
  }
  await page.waitForTimeout(1200);

  if (CONTROL === 'noserve') {
    if (stripped === 0) { console.error('control cannot run: no served bundle contained a .then() to strip'); process.exit(1); }
    console.log(`   NEGATIVE CONTROL ON (noserve): the .then() stripped from ${stripped} served bundle(s), so the browser replays the bug. Section 2 must go red.`);
  }
  console.log(`   played=${played}, POSTs to guess_nation_scores seen: ${posted.length}`);
  if (!played) fail('no guess was ever submitted, so this section proved nothing about the write');
  else if (posted.length === 0) fail('a round finished and NOTHING was posted to guess_nation_scores. That is the bug: the builder was created and never sent.');

  await browser.close();
  server.close();
}

console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`simWritesAreSent control (${CONTROL}): green. The restored bug was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simWritesAreSent control (${CONTROL}): RED. The bug was restored and nothing noticed.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simWritesAreSent: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simWritesAreSent: green. Every write is sent, and a finished round proves it on the wire.');
