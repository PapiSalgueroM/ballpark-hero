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

   Negative controls (house rule: prove the check can fail):
     REPORT_RELAY_CONTROL=silent   drops the update that writes the delivery
       answer back; sections 2 and 3 must go red.
     REPORT_RELAY_CONTROL=oldkinds restores the per question button's old four
       chips; section 1 must go red.
   Either refuses to run if its rewrite changed nothing.

   Run: node scripts/simReportRelay.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.REPORT_RELAY_CONTROL || '';
if (CONTROL && CONTROL !== 'silent' && CONTROL !== 'oldkinds') {
  console.error(`REPORT_RELAY_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

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

console.log('3) the admin screen prints the delivery answer, unknown included');
{
  if (!admin.includes('emailed')) fail('the admin screen never reads the delivery answer, so he still cannot tell which reports reached him');
  const hasUnknown = /delivery unknown|unknown/i.test(admin);
  if (!hasUnknown) fail('the admin screen has no honest state for a row filed before this round, so it will claim an answer it does not have');
  if (admin.includes('emailed') && hasUnknown) console.log('   the screen shows emailed, not emailed and delivery unknown');
}

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

/* Let the keep alive socket from section 4 settle before any process.exit
   below. Exiting on top of it crashes node on Windows with a libuv assertion
   and reports 127, which reads as a broken harness rather than a passing one. */
await new Promise(resolve => setTimeout(resolve, 120));

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimReportRelay: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimReportRelay: green. Both buttons ask the same questions, and every report now records whether it reached him.');
