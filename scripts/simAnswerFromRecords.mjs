/* Every validator that CAN answer from our own data still does.
 *
 * Rounds 482 to 490, all shipped on 2026-09-06, share one idea: a validator
 * should answer from the site's own tables before it spends a call on a free
 * AI allowance that is exhausted for most of the day. Five validators were
 * changed to do that, and each has its own fence for its own defect. This is
 * the cheap smoke test across all of them at once, driven against PRODUCTION,
 * because that is where every one of those defects lived.
 *
 * It holds both directions on purpose. A validator that answers everything
 * from records would be worse than one that answers nothing, so each round
 * also carries a case that must NOT be confirmed: Haaland was never at
 * Liverpool, Tom Brady never won a slam, Richard Petty and Kyle Larson never
 * raced together, and Derrick Henry went 45th overall in the second round.
 *
 * A LESSON FROM WRITING IT, kept because it cost two false alarms: a records
 * answer is recognised by its REASON, not by the source field. That field is
 * attached only to a fresh answer, and a cached verdict returns the stored
 * object without it, so checking the field alone reports a perfectly working
 * records path as broken the second time it is asked.
 *
 * Negative controls. RECORDS_CONTROL=nofallthrough expects the cases that must
 * NOT be confirmed to be confirmed, so it goes red against correct code and
 * proves this file can tell a confirmation from a fall-through.
 * RECORDS_CONTROL=silent makes every function call come back with no verdict,
 * which is the 2026-09-12 failure reproduced on demand. It proves the retry
 * runs, that three silent tries still fail rather than passing, and that the
 * run says so in words. It refuses to pass if it silenced nothing.
 *
 * IT RUNS AGAINST THE LIVE SITE, WHICH MEANS ITS RED IS NOT ALWAYS A BRANCH.
 * Nothing here reads branch code beyond the project URL and the publishable
 * key: every answer comes from the DEPLOYED edge functions and the live
 * tables, so this file reports the same thing on every branch and on none.
 * That is the same family as simConnect4ClubRecords, which CLAUDE.md already
 * records as red for live reasons. Round 537 made the distinction visible
 * rather than leaving the next reader to find it: see the call helper below.
 *
 * Run: node scripts/simAnswerFromRecords.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.RECORDS_CONTROL || '';
if (CONTROL && CONTROL !== 'nofallthrough' && CONTROL !== 'silent') { console.error(`RECORDS_CONTROL=${CONTROL} is not a control this harness knows (nofallthrough, silent)`); process.exit(1); }
const c = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const U = c.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const K = c.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };
/* A CALL THAT NEVER ANSWERED IS NOT A WRONG ANSWER, and Round 537 had to tell
   the two apart. On 2026-09-12 this harness went red on exactly one of its
   sixteen checks, the FIRST call it makes, with no reason string in the
   response at all: `.catch(() => ({}))` had swallowed a transport failure and
   the empty object then read as "not settled from records". The verdict it was
   asking for has been cached and correct since 2026-09-06, every other call in
   the same run succeeded, and no commit in the branch touches
   supabase/functions, so nothing about the answer was wrong. A cold isolate on
   the first request is what that looks like.
   So a call that comes back with no verdict at all is retried, twice, with a
   short backoff, and the empties are counted. A verdict is NEVER retried:
   a wrong answer stays a failure the first time it is given, which is the
   whole point of the file. */
let emptyAnswers = 0, retried = 0;
const once = (fn, body) => (CONTROL === 'silent'
  ? Promise.resolve({})
  : fetch(`${U}/functions/v1/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body) }).then(r => r.json()).catch(() => ({})));
const answered = j => j && (typeof j.valid === 'boolean' || String(j.reason || '') !== '');
const call = async (fn, body) => {
  let j = await once(fn, body);
  for (let attempt = 1; attempt <= 2 && !answered(j); attempt++) {
    retried += 1;
    await new Promise(r => setTimeout(r, 700 * attempt));
    j = await once(fn, body);
  }
  if (!answered(j)) { emptyAnswers += 1; j = { ...j, reason: 'THE FUNCTION DID NOT ANSWER after 3 tries, so this is the service and not the data' }; }
  return j;
};
/* A records answer is recognised by its REASON, not by the source field: the
   field is only attached on a fresh answer, and a cached verdict returns the
   stored object without it. Checking the field alone reports a working records
   path as broken the second time it is asked, which it did. */
const fromRecords = j => j.valid === true && /Verified from our own records/.test(String(j.reason || ''));
const rest = qs => fetch(`${U}/rest/v1/${qs}`, { headers: H }).then(r => r.json()).catch(() => null);

let pass = 0, fail = 0;
const check = (round, what, ok, detail) => {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${round}  ${what}${detail ? '  -> ' + detail : ''}`);
};

// 482 / 484: Build Your XI answers from our own records, club and nation
{
  const a = await call('validate-player', { playerName: 'Erling Haaland', teamName: 'Manchester City', isNation: false, position: 'ST' });
  check('482', 'Haaland at Man City settled from records', fromRecords(a), String(a.reason || '').slice(0, 44));
  const b = await call('validate-player', { playerName: 'Lionel Messi', teamName: 'Argentina', isNation: true, position: 'RW' });
  check('482', 'Messi for Argentina settled from records', fromRecords(b), String(b.reason || '').slice(0, 44));
  const d = await call('validate-player', { playerName: 'Erling Haaland', teamName: 'Liverpool', isNation: false, position: 'ST' });
  check('482', 'Haaland at Liverpool NOT confirmed', CONTROL === 'nofallthrough' ? fromRecords(d) : !fromRecords(d), 'fell through, correct');
}

// 483: the Build Your XI dropdown offers only the real club
{
  const rows = await rest('player_market_values?select=club&club=in.(%22FC%20Barcelona%22)&limit=200');
  const clubs = new Set((rows || []).map(r => r.club));
  check('483', 'Barcelona pool is only FC Barcelona', clubs.size === 1 && clubs.has('FC Barcelona'), [...clubs].join(', '));
}

// 484: the squad table carries the armband as a column, not inside the name
{
  const annotated = await rest('national_team_squads?select=player_name&player_name=like.*(*&limit=5');
  const captains = await rest('national_team_squads?select=player_name&is_captain=is.true&limit=5');
  check('484', 'no squad name still holds "( captain )"', Array.isArray(annotated) && annotated.length === 0, `${(annotated || []).length} annotated`);
  check('484', 'the captaincy survived as a column', Array.isArray(captains) && captains.length > 0, `${(captains || []).length} sampled`);
}

// 486: NBA Chain knows the accented stars
{
  const a = await call('nba-chain-validate', { previousPlayer: 'Jamal Murray', newPlayer: 'Nikola Jokic' });
  check('486', 'Jokic answerable', a.valid === true, a.connection || a.reason);
  const b = await call('nba-chain-validate', { previousPlayer: 'Kyrie Irving', newPlayer: 'Luka Doncic' });
  check('486', 'Doncic answerable', b.valid === true, b.connection || b.reason);
}

// 487: Tennis Chain sees past the row cap
{
  const a = await call('tennis-chain-validate', { currentPlayer: 'Serena Williams', guessedPlayer: 'Bianca Andreescu' });
  check('487', 'Andreescu is a known champion', a.valid === true, a.connection || a.reason);
  const b = await call('tennis-chain-validate', { currentPlayer: 'Rafael Nadal', guessedPlayer: 'Tom Brady' });
  check('487', 'Tom Brady still refused', CONTROL === 'nofallthrough' ? b.valid === true : b.valid === false, String(b.reason || '').slice(0, 46));
}

// 488: NASCAR Chain can be played from a driver with no title
{
  const a = await call('nascar-chain-validate', { currentDriver: 'Denny Hamlin', guessedDriver: 'Kyle Busch' });
  check('488', 'Hamlin has a racing span', a.valid === true, a.connection || String(a.reason || '').slice(0, 46));
  const b = await call('nascar-chain-validate', { currentDriver: 'Richard Petty', guessedDriver: 'Kyle Larson' });
  check('488', 'eras that do not meet still refused', b.valid === false, 'refused');
}

// 489: Soccer Grid's dead club labels
{
  const a = await call('soccer-grid-validate', { playerName: 'Lionel Messi', rowAttribute: 'Played for PSG', colAttribute: 'Forward (FWD)' });
  check('489', 'PSG is answerable', a.valid === true, String(a.reason || '').slice(0, 40));
  const b = await call('soccer-grid-validate', { playerName: 'Iago Aspas', rowAttribute: 'Played for Celta Vigo', colAttribute: 'Forward (FWD)' });
  check('489', 'Celta Vigo is answerable', b.valid === true, String(b.reason || '').slice(0, 40));
}

// 490: College Grid answers from its own tables
{
  const a = await call('college-grid-validate', { playerName: 'Joe Burrow', rowAttribute: 'Heisman Winner', colAttribute: 'First Round Pick' });
  const fromData = a.valid === true && (a.cached === true || /Verified from college/.test(String(a.reason || '')));
  check('490', 'Burrow settled without the model', fromData, String(a.reason || '').slice(0, 40));
  const b = await call('college-grid-validate', { playerName: 'Derrick Henry', rowAttribute: 'First Round Pick', colAttribute: 'Alabama' });
  const wrong = b.valid === true && /Verified from college/.test(String(b.reason || ''));
  check('490', 'a second round pick is not confirmed', CONTROL === 'nofallthrough' ? wrong : !wrong, wrong ? 'WRONGLY CONFIRMED' : 'not confirmed');
}

if (CONTROL) {
  if (CONTROL === 'silent' && (retried === 0 || emptyAnswers === 0)) {
    console.error(`\nNEGATIVE CONTROL silent silenced nothing (${retried} retries, ${emptyAnswers} empties), so it proves nothing.`);
    process.exit(1);
  }
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${fail} finding(s), ${retried} retried, ${emptyAnswers} silent. A control run is expected to be red.`);
  process.exit(fail > 0 ? 0 : 1);
}
console.log(`\n${pass} passed, ${fail} failed. ${retried} call(s) retried for an empty response, ${emptyAnswers} still silent after three tries.`);
if (emptyAnswers > 0) {
  console.error('Read the failures above as the live service, not the branch: those calls returned no verdict at all.');
}
process.exit(fail === 0 ? 0 : 1);
