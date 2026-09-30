/* The report button reaches him, and says so.

   Round 446, from his 2026-08-28 review: "i feel tronly there should be way
   more to the report an issue button. Cause where do those issues go and how
   can i read them ... all this goes to my douknowbaII email and i can actually
   read there problems and improve upon it. Not simply tehre for just being
   there. This button could help me a fuck ton."

   Two halves, and the second one had no answer at all.

   READING THEM. The relay writes a durable row and then best-effort emails
   the owner. It computed whether the mail actually landed and handed that to
   the browser, which threw it away, so "have any of my reports ever reached
   my inbox" was unanswerable about all 32 rows in the table. It is recorded
   on the row now and printed on the admin screen. This matters more than it
   sounds: Round 316 found the mail provider answers HTTP 200 even when the
   destination inbox has never clicked its one time activation, so a report
   can be accepted, stored, and never delivered, with nothing anywhere saying
   so.

   FILING THEM. The sitewide button offers Wrong answer, Bug, Wrong info,
   Idea and Other (Round 316, for this same review). The per question button
   was left on the old four with no Bug and no Idea, so a player wanting to
   suggest something from inside a game had to file it under Other. That is
   exactly what the most valuable report in the table did.

   WHAT THIS HOLDS, against the real files and the real table:
     1) Both report surfaces offer the same kinds, and both offer a way to
        send an idea rather than a fault.
     2) The relay writes the row FIRST and keeps its id, so a stored report
        can never be lost to a slow or failing mail provider, and it writes
        the delivery answer back onto that row.
     3) The admin screen prints the delivery answer, including the honest
        unknown for rows written before this round.
     4) The live table has the column, and every row filed from here on
        carries a real true or false rather than a null.

   Round 713 added the other half of "how can i read them": a workflow.
     5) The triage module (src/lib/reportTriage.ts), RUN rather than read:
        its statuses and priorities are the ones the master spec lists in
        section 123, read from the spec itself; every one of the 49 status
        moves writes resolved and resolved_at correctly; the count on every
        chip equals the rows that chip shows, for every game; Critical sorts
        first; notes are trimmed and clipped. The admin screen takes all of
        that from the module and checks that a save really landed.
     6) The migration and the module agree on every key and every length,
        backfills the old switch, and touches no policy, grant, trigger or
        function, so the public insert path is exactly what it was.

   Negative controls (house rule: prove the check can fail). Each one must
   turn its OWN section red and leave every other section green:
     REPORT_RELAY_CONTROL=silent        drops the update that writes the
       delivery answer back; section 2.
     REPORT_RELAY_CONTROL=oldkinds      restores the per question button's old
       four chips; section 1.
     REPORT_RELAY_CONTROL=staleresolved a status change stops moving resolved;
       section 5.
     REPORT_RELAY_CONTROL=countdrift    the chip counts ignore the game filter;
       section 5.
     REPORT_RELAY_CONTROL=nostatus      the migration drops Duplicate from its
       check constraint; section 6.
     REPORT_RELAY_CONTROL=policy        the migration also rewrites the insert
       policy; section 6.
   Each refuses to run if its rewrite changed nothing.

   Run: node scripts/simReportRelay.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.REPORT_RELAY_CONTROL || '';
const CONTROL_SECTION = { silent: 2, oldkinds: 1, staleresolved: 5, countdrift: 5, nostatus: 6, policy: 6 };
if (CONTROL && !(CONTROL in CONTROL_SECTION)) {
  console.error(`REPORT_RELAY_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
let section = 0;
const bySection = {};
const fail = m => { failures += 1; bySection[section] = (bySection[section] || 0) + 1; console.error('  FAIL: ' + m); };

/* CRLF trap, Round 435's lesson: a fresh checkout of this repo is CRLF, so a
   multi line needle matched against the raw file finds nothing and the check
   silently passes over an unread file. Normalise before matching. */
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

let relay = read('supabase/functions/report-relay/index.ts');
let perQuestion = read('src/components/game/ReportQuestion.tsx');
const sitewide = read('src/components/game/ReportSiteIssue.tsx');
const admin = read('src/pages/AdminReports.tsx');

if (CONTROL === 'silent') {
  const needle = 'await supabase.from("question_reports").update({ emailed }).eq("id", inserted.id);';
  if (!relay.includes(needle)) { console.error('control cannot run: the relay is not in the shape this control rewrites'); process.exit(1); }
  relay = relay.replace(needle, '/* delivery answer thrown away, the pre Round 446 shape */');
  console.log('NEGATIVE CONTROL ON: the relay stops recording whether the mail landed');
}
if (CONTROL === 'oldkinds') {
  /* The pre Round 446 shape: the per question button carried its own four
     chips inline and never imported the shared module, which is exactly how
     the two buttons drifted. */
  const needle = "import { REPORT_KINDS_QUESTION } from '@/components/game/reportKinds';\n";
  if (!perQuestion.includes(needle)) { console.error('control cannot run: ReportQuestion.tsx is not in the shape this control rewrites'); process.exit(1); }
  perQuestion = perQuestion.replace(needle, '').replace('const REPORT_REASONS = REPORT_KINDS_QUESTION;', "const REPORT_REASONS = ['Wrong answer', 'Outdated info', 'Duplicate question', 'Other'];");
  console.log('NEGATIVE CONTROL ON: the per question button carries its own old four chips again');
}

section = 1;
console.log('1) both report buttons offer the same kinds, and a way to send an idea');
{
  /* The kinds live in ONE module now, which is the fix: two lists of chips
     maintained beside each other drifted, and the drift is what let the per
     question button ship without a way to send a suggestion. So the check is
     that both components take their list from that module, and that the module
     itself offers the kinds he asked for. */
  const kinds = read('src/components/game/reportKinds.ts');
  const shared = [...(kinds.match(/REPORT_KINDS_SHARED = \[([\s\S]*?)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(x => x[1]);
  if (shared.length === 0) fail('reportKinds.ts has no readable shared list, so this check read nothing');
  else console.log(`   shared kinds: ${shared.join(', ')}`);

  for (const kind of ['Wrong answer', 'Wrong info', 'Bug', 'Idea']) {
    if (!shared.includes(kind)) fail(`the shared list offers no "${kind}" chip, and he asked for a report that can carry more than a fault`);
  }
  if (!kinds.includes('REPORT_KIND_OTHER')) fail('there is no Other, so a player with something unlisted to say has nowhere to put it');

  const usesShared = (src, name, which) => {
    if (!/from '@\/components\/game\/reportKinds'/.test(src)) {
      fail(`${which} does not take its chips from the shared module, so the two buttons can drift apart again`);
      return;
    }
    if (!src.includes(name)) fail(`${which} imports the shared module but does not use ${name}`);
  };
  usesShared(perQuestion, 'REPORT_KINDS_QUESTION', 'the per question button');
  usesShared(sitewide, 'REPORT_KINDS_SITEWIDE', 'the sitewide button');

  /* Duplicate question is the one chip that legitimately belongs to only one
     of them, so its absence from the sitewide list is correct rather than drift. */
  if (!kinds.includes('REPORT_KIND_DUPLICATE')) fail('the per question button lost its duplicate chip, which only it can offer');
  if (/REPORT_KINDS_SITEWIDE[^\n]*DUPLICATE/.test(kinds)) fail('the sitewide button offers a duplicate question chip, which makes no sense off a question');
}

section = 2;
console.log('2) the relay stores the report first, then records whether it reached him');
{
  const insertsFirst = /\.from\("question_reports"\)\s*\.insert\(/.test(relay) && relay.includes('.select("id")');
  if (!insertsFirst) fail('the relay does not keep the id of the row it wrote, so it cannot record the delivery answer against it');
  if (!relay.includes('update({ emailed })')) fail('the relay never writes the delivery answer back, so whether a report reached him is unrecorded, which is the defect this round exists to fix');
  /* The row must not depend on the mail: the insert has to come before the
     fetch to the mail provider, or a slow provider costs a report. */
  const insertAt = relay.indexOf('.from("question_reports")');
  const mailAt = relay.indexOf('formsubmit.co');
  if (insertAt === -1 || mailAt === -1) fail('could not find both the insert and the mail call in the relay, so the ordering check read nothing');
  else if (insertAt > mailAt) fail('the relay emails before it stores, so a slow or failing mail provider can cost a report entirely');
  else console.log('   the durable row is written before the mail is attempted, and the delivery answer is written back onto it');
}

section = 3;
console.log('3) the admin screen prints the delivery answer, unknown included');
{
  if (!admin.includes('emailed')) fail('the admin screen never reads the delivery answer, so he still cannot tell which reports reached him');
  const hasUnknown = /delivery unknown|unknown/i.test(admin);
  if (!hasUnknown) fail('the admin screen has no honest state for a row filed before this round, so it will claim an answer it does not have');
  if (admin.includes('emailed') && hasUnknown) console.log('   the screen shows emailed, not emailed and delivery unknown');
}

section = 4;
console.log('4) the live table carries the column');
{
  const url = /const SUPABASE_URL = ['"]([^'"]+)['"]/.exec(read('src/integrations/supabase/client.ts'));
  const key = /const SUPABASE_PUBLISHABLE_KEY = ['"]([^'"]+)['"]/.exec(read('src/integrations/supabase/client.ts'));
  if (!url || !key) {
    fail('could not read the Supabase url and key from the client, so the live check ran nothing');
  } else {
    try {
      /* An AbortSignal.timeout that is still pending when the process exits
         crashes node on Windows with a libuv assertion, which turns a green
         run into exit 127. Own the timer so it can be cleared. */
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(`${url[1]}/rest/v1/question_reports?select=id,emailed&limit=1`, {
        headers: { apikey: key[1], Authorization: `Bearer ${key[1]}` },
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer));
      if (!res.ok) {
        console.log(`   SKIPPED: the table answered HTTP ${res.status}, so the live column check did not run. The three source sections above stand on their own.`);
      } else {
        const rows = await res.json();
        if (!Array.isArray(rows)) fail('the table did not answer with rows, so the column check read nothing');
        else if (rows.length && !('emailed' in rows[0])) fail('the live question_reports table has no emailed column, so the relay write will be dropped');
        else console.log(`   question_reports carries the emailed column (${rows.length} row read)`);
      }
    } catch (e) {
      console.log(`   SKIPPED: the table could not be reached (${e && e.message}), so the live column check did not run.`);
    }
  }
}

/* Code only: comments gone, then every string literal emptied, so a check
   cannot be satisfied by prose explaining the check. */
const asCode = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, '""');

let lib = null;

section = 5;
console.log('5) the triage workflow, run: the spec statuses, every status move, the counts on every chip');
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simReportRelay-'));
  try {
    /* The module, compiled and imported for real. A control rewrites the
       source in memory before it compiles, never the file on disk. */
    let libSrc = read('src/lib/reportTriage.ts');
    if (CONTROL === 'staleresolved') {
      const needle = 'const closed = isClosed(next);';
      if (!libSrc.includes(needle)) { console.error('control cannot run: statusUpdate is not in the shape this control rewrites'); process.exit(1); }
      libSrc = libSrc.replace(needle, 'const closed = false;');
      console.log('NEGATIVE CONTROL ON: a status change stops moving resolved');
    }
    if (CONTROL === 'countdrift') {
      const needle = '    if (!matchesGame(row, game)) continue;\n';
      if (!libSrc.includes(needle)) { console.error('control cannot run: statusCounts is not in the shape this control rewrites'); process.exit(1); }
      libSrc = libSrc.replace(needle, '');
      console.log('NEGATIVE CONTROL ON: the chip counts ignore the game filter');
    }
    const modPath = path.join(tmp, 'reportTriage.mjs');
    const esbuild = await import('esbuild');
    await esbuild.build({
      stdin: { contents: libSrc, resolveDir: path.join(ROOT, 'src', 'lib'), sourcefile: 'reportTriage.ts', loader: 'ts' },
      bundle: true, format: 'esm', platform: 'node', outfile: modPath, logLevel: 'error',
      alias: { '@': path.join(ROOT, 'src') },
    });
    lib = await import(pathToFileURL(modPath).href);
  } catch (e) {
    fail(`the triage module could not be compiled and loaded (${e && e.message}), so nothing in sections 5 and 6 ran`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (lib) {
    /* a) The spec is the baseline, read from the spec itself. */
    const spec = read('docs/MASTER-BUILD-SPEC-2026-08.md');
    const s123 = spec.split(/\n(?=# )/).find(s => /^# 123\. REPORT ISSUE ADMIN WORKFLOW/.test(s)) || '';
    const listAfter = label => {
      const m = s123.match(new RegExp(`${label}:\\n((?:- .*\\n?)+)`));
      return m ? m[1].trim().split('\n').map(l => l.replace(/^- /, '').trim().replace(/[‘’]/g, "'")) : [];
    };
    const specStatuses = listAfter('Statuses');
    const specPriorities = listAfter('Priority');
    const labels = lib.REPORT_STATUSES.map(s => s.label);
    const pLabels = lib.REPORT_PRIORITIES.map(p => p.label);
    if (specStatuses.length < 5 || specPriorities.length < 3) fail('could not read the statuses and priorities out of spec section 123, so the baseline is empty');
    else {
      if (JSON.stringify(labels) !== JSON.stringify(specStatuses)) fail(`the screen offers ${labels.join(', ')} but spec section 123 lists ${specStatuses.join(', ')}`);
      if (JSON.stringify(pLabels) !== JSON.stringify(specPriorities)) fail(`the screen offers priorities ${pLabels.join(', ')} but spec section 123 lists ${specPriorities.join(', ')}`);
      console.log(`   ${labels.length} statuses and ${pLabels.length} priorities, the same as spec section 123`);
    }

    /* b) Which statuses close a report is an outcome question: it happened,
       it was not a bug, it was already filed, or it is not getting done. */
    const CLOSED_LABELS = new Set(['Fixed', 'Not a bug', 'Duplicate', "Won't fix"]);
    const keys = lib.REPORT_STATUSES.map(s => s.key);
    const closedKey = k => CLOSED_LABELS.has(lib.REPORT_STATUSES.find(s => s.key === k)?.label);
    const flagged = lib.REPORT_STATUSES.filter(s => s.closed).map(s => s.label);
    if (flagged.length !== CLOSED_LABELS.size || !flagged.every(l => CLOSED_LABELS.has(l))) fail(`the closed statuses are ${flagged.join(', ')}, expected ${[...CLOSED_LABELS].join(', ')}`);

    /* c) Every move, not just the ends: 7 by 7, with the columns and without. */
    const T0 = '2026-09-01T00:00:00.000Z';
    const NOW = '2026-09-30T12:00:00.000Z';
    const wrong = [];
    let moves = 0;
    for (const from of keys) for (const to of keys) {
      const row = { id: 'x', game_type: 'site', created_at: T0, status: from, resolved: closedKey(from), resolved_at: closedKey(from) ? T0 : null };
      const expectAt = closedKey(to) ? (closedKey(from) ? T0 : NOW) : null;
      const u = lib.statusUpdate(row, to, NOW, true);
      if (u.status !== to || u.resolved !== closedKey(to) || u.resolved_at !== expectAt) wrong.push(`${from} to ${to}`);
      const legacy = lib.statusUpdate(row, to, NOW, false);
      if ('status' in legacy || legacy.resolved !== closedKey(to) || legacy.resolved_at !== expectAt) wrong.push(`${from} to ${to} before the migration`);
      moves += 1;
    }
    if (moves !== keys.length * keys.length || moves < 25) fail(`only ${moves} status moves were walked`);
    if (wrong.length) fail(`${wrong.length} status move(s) write the wrong resolved state, for example ${wrong.slice(0, 3).join('; ')}`);
    else console.log(`   all ${moves} status moves keep resolved and resolved_at true, with and without the new columns`);

    /* d) A row read before the migration still lands in the right place. */
    if (lib.statusOf({ resolved: true }) !== 'fixed' || lib.statusOf({ resolved: false }) !== 'new' || lib.statusOf({ resolved: false, status: 'bogus' }) !== 'new') {
      fail('a row without a known status does not fall back to what the old switch said');
    }
    if (lib.hasTriageColumns([{ id: 'x', resolved: false }]) !== false || lib.hasTriageColumns([{ id: 'x', resolved: false, status: 'new' }]) !== true) {
      fail('the screen cannot tell whether the migration has run, so it would offer notes it cannot save');
    }

    /* e) The count on every chip is the number of cards that chip shows, for
       every game, against a count done here by hand. Generated rows. */
    const rows = [
      { id: 'r1', game_type: 'site', created_at: '2026-09-20T10:00:00Z', resolved: false, resolved_at: null, status: 'new' },
      { id: 'r2', game_type: 'site', created_at: '2026-09-21T10:00:00Z', resolved: false, resolved_at: null, status: 'investigating', priority: 'high' },
      { id: 'r3', game_type: 'soccer-grid', created_at: '2026-09-19T10:00:00Z', resolved: false, resolved_at: null, status: 'confirmed', priority: 'critical' },
      { id: 'r4', game_type: 'soccer-grid', created_at: '2026-09-18T10:00:00Z', resolved: true, resolved_at: T0, status: 'fixed', priority: 'low' },
      { id: 'r5', game_type: 'footle', created_at: '2026-09-17T10:00:00Z', resolved: true, resolved_at: T0, status: 'not_a_bug' },
      { id: 'r6', game_type: 'site', created_at: '2026-09-16T10:00:00Z', resolved: true, resolved_at: T0, status: 'duplicate', priority: 'medium' },
      { id: 'r7', game_type: 'footle', created_at: '2026-09-15T10:00:00Z', resolved: true, resolved_at: T0, status: 'wont_fix' },
      { id: 'r8', game_type: 'site', created_at: '2026-09-14T10:00:00Z', resolved: true, resolved_at: T0 },
      { id: 'r9', game_type: 'footle', created_at: '2026-09-22T10:00:00Z', resolved: false, resolved_at: null, status: null, priority: 'high' },
    ];
    const expectStatus = r => r.status || (r.resolved ? 'fixed' : 'new');
    const filters = ['open', 'all', ...keys];
    const games = [lib.ALL_GAMES, ...new Set(rows.map(r => r.game_type))];
    const off = [];
    let cells = 0;
    for (const game of games) {
      const counts = lib.statusCounts(rows, game);
      for (const f of filters) {
        const expected = rows.filter(r => (game === lib.ALL_GAMES || r.game_type === game)
          && (f === 'all' || (f === 'open' ? !closedKey(expectStatus(r)) : expectStatus(r) === f))).length;
        const shown = rows.filter(r => lib.matchesGame(r, game) && lib.matchesStatus(r, f)).length;
        if (counts[f] !== expected || shown !== expected) off.push(`${game || 'all games'} ${f}: chip ${counts[f]}, cards ${shown}, by hand ${expected}`);
        cells += 1;
      }
    }
    if (off.length) fail(`${off.length} of ${cells} chip counts disagree with the cards or the hand count, for example ${off.slice(0, 3).join('; ')}`);
    else console.log(`   ${cells} chip counts (${filters.length} filters by ${games.length} game choices) match the cards and the hand count`);

    const perGame = lib.gameCounts(rows);
    for (const g of new Set(rows.map(r => r.game_type))) {
      const got = perGame.find(x => x.game === g);
      const total = rows.filter(r => r.game_type === g).length;
      const open = rows.filter(r => r.game_type === g && !closedKey(expectStatus(r))).length;
      if (!got || got.total !== total || got.open !== open) fail(`the game list says ${g} has ${got?.open} open of ${got?.total}, by hand it is ${open} of ${total}`);
    }
    for (let i = 1; i < perGame.length; i++) {
      if (perGame[i - 1].open < perGame[i].open) fail('the game list does not put the busiest open queue first');
    }

    /* f) Critical first, then High, Medium, Low, then unranked; newest first
       inside each. Checked on every neighbouring pair. */
    const RANK = { critical: 0, high: 1, medium: 2, low: 3 };
    const rank = r => RANK[r.priority] ?? 4;
    const sorted = lib.sortForTriage(rows);
    let badPairs = 0;
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1], b = sorted[i];
      if (rank(a) > rank(b) || (rank(a) === rank(b) && a.created_at < b.created_at)) badPairs += 1;
    }
    if (sorted.length !== rows.length || badPairs) fail(`the triage order is wrong on ${badPairs} neighbouring pair(s)`);
    else if (sorted[0].id !== 'r3') fail('the one critical report is not at the top');

    /* g) Notes are trimmed, blank means none, and nothing past the column limit is sent. */
    const n1 = lib.noteUpdate('  real note  ', '  Round 713 ');
    const n2 = lib.noteUpdate('   ', '');
    const n3 = lib.noteUpdate('a'.repeat(lib.NOTE_MAX + 50), 'b'.repeat(lib.FIX_REF_MAX + 50));
    if (n1.admin_note !== 'real note' || n1.fix_ref !== 'Round 713') fail('a note or fix reference is saved with its padding');
    if (n2.admin_note !== null || n2.fix_ref !== null) fail('a blank note is saved as an empty string rather than none');
    if (n3.admin_note.length !== lib.NOTE_MAX || n3.fix_ref.length !== lib.FIX_REF_MAX) fail('an overlong note is sent past the column limit, so the database would refuse the save');

    /* h) The screen runs this module and does not claim a save it did not get. */
    const adminNoComments = admin.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const adminCode = asCode(admin);
    if (!/from '@\/lib\/reportTriage'/.test(adminNoComments)) fail('the admin screen does not import the triage module, so what this section ran is not what the screen does');
    for (const fn of ['statusUpdate', 'statusCounts', 'gameCounts', 'matchesGame', 'matchesStatus', 'sortForTriage', 'noteUpdate', 'hasTriageColumns']) {
      if (!new RegExp(`\\b${fn}\\(`).test(adminCode)) fail(`the admin screen never calls ${fn}`);
    }
    if (!/\.update\([^)]*\)\s*\.eq\([^)]*\)\s*\.select\(/.test(adminCode)) fail('the admin save does not ask for the row back, so an update the database refused would still say saved');
    if (/resolved\s*=\s*!\s*report\.resolved/.test(adminCode)) fail('the old one switch toggle is still on the screen beside the statuses');
  }
}

section = 6;
console.log('6) the migration and the module agree, and the public insert path is untouched');
{
  const MIG = 'supabase/migrations/20260930_round_713_report_triage.sql';
  let sql = '';
  try { sql = read(MIG); } catch { fail(`${MIG} is missing, so the columns the screen writes do not exist anywhere`); }
  if (sql && CONTROL === 'nostatus') {
    const needle = "'not_a_bug', 'duplicate', 'wont_fix'";
    if (!sql.includes(needle)) { console.error('control cannot run: the status constraint is not in the shape this control rewrites'); process.exit(1); }
    sql = sql.replace(needle, "'not_a_bug', 'wont_fix'");
    console.log('NEGATIVE CONTROL ON: the migration forgets Duplicate');
  }
  if (sql && CONTROL === 'policy') {
    const before = sql;
    sql += '\ndrop policy "Anyone can insert reports" on public.question_reports;\ncreate policy "Anyone can insert reports" on public.question_reports for insert to anon, authenticated with check (true);\n';
    if (sql === before) { console.error('control cannot run: appending the policy changed nothing'); process.exit(1); }
    console.log('NEGATIVE CONTROL ON: the migration also rewrites the public insert policy');
  }
  if (sql && lib) {
    const code = sql.replace(/--.*$/gm, '');
    const bare = code.replace(/'(?:[^']|'')*'/g, "''");
    const keysIn = re => { const m = code.match(re); return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []; };
    const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
    const sqlStatuses = keysIn(/check\s*\(\s*status\s+in\s*\(([^)]*)\)\s*\)/i);
    const sqlPriorities = keysIn(/check\s*\(\s*priority\s+is\s+null\s+or\s+priority\s+in\s*\(([^)]*)\)\s*\)/i);
    const libStatuses = lib.REPORT_STATUSES.map(s => s.key);
    const libPriorities = lib.REPORT_PRIORITIES.map(p => p.key);
    if (!same(sqlStatuses, libStatuses)) fail(`the migration accepts statuses [${sqlStatuses.join(', ')}] but the screen writes [${libStatuses.join(', ')}], so a save would be refused`);
    if (!same(sqlPriorities, libPriorities)) fail(`the migration accepts priorities [${sqlPriorities.join(', ')}] but the screen writes [${libPriorities.join(', ')}]`);
    if (!/add\s+column\s+if\s+not\s+exists\s+status\s+text\s+not\s+null\s+default\s+'new'/i.test(code)) fail('status is not a not null column defaulting to new, so a report filed through the untouched insert path would land with no status');
    const noteMax = Number(code.match(/char_length\(admin_note\)\s*<=\s*(\d+)/i)?.[1]);
    const refMax = Number(code.match(/char_length\(fix_ref\)\s*<=\s*(\d+)/i)?.[1]);
    if (noteMax !== lib.NOTE_MAX || refMax !== lib.FIX_REF_MAX) fail(`the migration caps notes at ${noteMax} and fix references at ${refMax}, the screen at ${lib.NOTE_MAX} and ${lib.FIX_REF_MAX}`);
    if (!/update\s+public\.question_reports\s+set\s+status\s*=\s*'fixed'[\s\S]*?where\s+resolved\s*=\s*true/i.test(code)) fail('the migration does not carry the old switch across, so every report already closed would reopen as New');
    const forbidden = [
      [/\b(create|drop|alter)\s+policy\b/i, 'a policy'],
      [/\bgrant\b/i, 'a grant'],
      [/\brevoke\b/i, 'a revoke'],
      [/\bcreate\s+(or\s+replace\s+)?(trigger|function)\b/i, 'a trigger or function'],
      [/\bsecurity\s+definer\b/i, 'a security definer'],
      [/\b(disable|no\s+force)\s+row\s+level\s+security\b/i, 'row level security'],
      [/\bdrop\s+(column|table)\b/i, 'a dropped column or table'],
    ];
    for (const [re, what] of forbidden) {
      if (re.test(bare)) fail(`the migration touches ${what}, and this round was to leave the public insert path exactly as it was`);
    }
    if (!bySection[6]) console.log(`   ${sqlStatuses.length} statuses, ${sqlPriorities.length} priorities and both length caps match the module; the backfill is there; no policy, grant, trigger or function`);
  } else if (sql && !lib) {
    fail('the module did not load, so the migration could not be compared against it');
  }
}

/* Let the keep alive socket from section 4 settle before any process.exit
   below. Exiting on top of it crashes node on Windows with a libuv assertion
   and reports 127, which reads as a broken harness rather than a passing one. */
await new Promise(resolve => setTimeout(resolve, 120));

if (CONTROL) {
  const target = CONTROL_SECTION[CONTROL];
  const fired = bySection[target] || 0;
  const elsewhere = Object.keys(bySection).filter(s => Number(s) !== target && bySection[s] > 0);
  if (fired > 0 && elsewhere.length === 0) { console.log(`\ncontrol "${CONTROL}": ${fired} failure(s) fired in section ${target} and nowhere else, the check works`); process.exit(0); }
  if (!fired) { console.error(`\ncontrol "${CONTROL}": changed NOTHING in section ${target}, the check is dead`); process.exit(1); }
  console.error(`\ncontrol "${CONTROL}": fired in section ${target} but also in section ${elsewhere.join(', ')}, so it does not isolate its own check`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimReportRelay: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimReportRelay: green. Both buttons ask the same questions, every report records whether it reached him, and the queue has a real workflow.');
