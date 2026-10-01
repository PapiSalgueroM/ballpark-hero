/* Round 703 harness: a stored refusal is HELD until the records pass has run,
 * and every validator still fails closed, proved by RUNNING the handlers.
 *
 * Round 703 changed nine edge functions so a "no" in ai_validation_cache can no
 * longer outrank the site's own career tables: soccer-grid, football-grid,
 * college-grid, validate-player, and the five Connect 4 validators. Its first
 * fence (simConnect4FranchiseCodes) holds the franchise code maps and reads
 * catch blocks as TEXT. Review found two edits that leave that fence and every
 * other gate green:
 *   - serving a stored refusal before the records pass, which is exactly the
 *     bug the round fixed, put back;
 *   - a catch that fails open by setting state ("rowKnown = true") rather than
 *     by writing the literal valid:true, which a text check cannot see.
 * The harnesses that do touch the cache (simValidatorCache, simAnswerFromRecords,
 * simConnect4ClubRecords) call the DEPLOYED functions, so they cannot see a
 * branch at all. So this file runs the branch's own code.
 *
 * HOW. Each supabase/functions/<fn>/index.ts is read, its two URL imports
 * (serve, createClient) are removed, it is typed away with esbuild and run with
 * a fake serve that captures the handler, a fake Supabase client that answers
 * from a scripted world, a fake Deno.env and a fake fetch standing in for the
 * model. Then real Requests go through the real handler.
 *
 * WHAT IT HOLDS, for each of the nine:
 *   1. baseline: a stored yes is served, and the model is not asked.
 *   2. hold and overturn: a stored refusal plus records that prove the answer
 *      gives valid:true with no model call. Serving the refusal first fails here.
 *   3. hold and keep: a stored refusal plus records that do not decide it gives
 *      the stored refusal back (same reason, cached:true) and the model is NOT
 *      asked, even though the fake model would say yes. Dropping the held
 *      refusal fails here.
 *   4. reach: no stored verdict and a records miss does reach the model, once.
 *      This is the positive control on the instrumentation: without it, "the
 *      model was not asked" in 2 and 3 could be a fake that never answers.
 *   5. fail closed, three ways: every database call throws and the model call
 *      throws; every database call returns an error object and the model
 *      answers HTTP 500; the database is empty and the model answers garbage.
 *      Each must come back valid:false (never true) with unverified:true.
 *      Unlike a text check, this sees a catch that fails open by any route.
 *   6. the five Connect 4 validators only: with a team half the records prove
 *      and an award half only the model can answer, the model's "no" on the
 *      proved half does not win (6a), and a bare "no" that never says which
 *      half it meant comes back unverified rather than as a refusal (6b).
 *
 * Everything is deterministic: no seeds, no bands, no network. It asserts what
 * the functions return, never how their source reads.
 *
 * BASELINE, measured 2026-10-01 with REFUSAL_HOLD_REF=origin/main (61f85133,
 * the functions production ran before this round): 18 failures. Step 2 fails
 * in eight of the nine (football-connect4 already re-checked its club halves
 * in Round 707), and 6a and 6b fail in all five Connect 4 validators. On the
 * Round 703 branch: green.
 *
 * NEGATIVE CONTROLS, REFUSAL_HOLD_CONTROL=<case>. Each edits one source in
 * memory after asserting the text it edits is there exactly once; the run must
 * exit 1 with the defect reported, and exits 2 if it stayed green.
 *   servefirst      nba-connect4: the stored refusal is served before records (2)
 *   gridservefirst  football-grid: the same, in a grid validator (2)
 *   dropheld        football-grid: the held refusal is never returned (3)
 *   catchstate      nba-connect4: a cache error marks both halves known yes (5)
 *
 * Run: node scripts/simValidatorRefusalHold.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { transform } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FN_DIR = path.join(ROOT, 'supabase', 'functions');
const CONTROLS = {
  servefirst: ['nba-connect4-validate', '        pairRefusal = stored;\n',
    '        return new Response(JSON.stringify({ ...stored, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });\n'],
  gridservefirst: ['football-grid-validate', '      cachedRefusal = stored;\n',
    '      return json({ ...stored, cached: true }, corsHeaders);\n'],
  dropheld: ['football-grid-validate', '  if (cachedRefusal) return json({ ...cachedRefusal, cached: true }, corsHeaders);\n', '\n'],
  catchstate: ['nba-connect4-validate',
    '      knownFullName = (rowFact?.fullName as string) || (colFact?.fullName as string) || playerName;\n    } catch { /* cache down -> fall through to AI */ }',
    '      knownFullName = (rowFact?.fullName as string) || (colFact?.fullName as string) || playerName;\n    } catch { rowKnown = true; colKnown = true; }'],
};
const CONTROL = process.env.REFUSAL_HOLD_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`REFUSAL_HOLD_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fail = (m) => { failures += 1; console.log('  FAIL: ' + m); };
const ok = (m) => console.log('  ok    ' + m);
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

/* ---------- the nine, each with what its records pass can decide ---------- */

const PLAYER = 'Test Player';
const usConnect4 = (fn, rowLabel, rowCode, colLabel, colCode, award) => ({
  fn,
  body: { playerName: PLAYER, rowAttribute: rowLabel, columnAttribute: colLabel },
  /* Step 6: the row is a team the records prove, the column an award no
     records pass reads, so only the model can answer it. */
  half: { columnAttribute: award },
  /* The table and column names are read from the function itself, so a
     rename cannot leave this file answering a table nobody reads. */
  rows(table, hit, src) {
    const T = src.match(/const RECORDS_TABLE = "([^"]+)"/)?.[1];
    const N = src.match(/const RECORDS_NAME = "([^"]+)"/)?.[1];
    const C = src.match(/const RECORDS_TEAMS = "([^"]+)"/)?.[1];
    if (table !== T) return undefined;
    return [{ [N]: PLAYER, [C]: hit ? `${rowCode},${colCode}` : 'ZZZ' }];
  },
});
const nflStint = (team, debut) => ({ player_name: PLAYER, team, position: 'QB', college: 'Alabama', first_season: debut, last_season: debut + 5, debut_season: debut, debut_age: debut >= 2003 ? 22 : null });
const soccerStint = (club, debut) => ({ player_name: PLAYER, club, nationality: 'England', position: 'Centre-Forward', first_year: debut, last_year: debut + 8, debut_year: debut, debut_age: debut >= 2005 ? 19 : 25 });

const SUBJECTS = [
  {
    fn: 'football-grid-validate',
    body: { playerName: PLAYER, rowAttribute: 'Played for Bears', colAttribute: 'Played for Packers' },
    rows(table, hit) {
      /* A miss keeps the Packers half unknown: an early career is not complete,
         so a missing team is not a no. */
      if (table === 'nfl_player_team_stints') return hit ? [nflStint('CHI', 2010), nflStint('GB', 2010)] : [nflStint('CHI', 1990)];
      if (table === 'nfl_team_codes') return [
        { team_code: 'CHI', team_name: 'Chicago Bears', franchise: 'Chicago Bears' },
        { team_code: 'GB', team_name: 'Green Bay Packers', franchise: 'Green Bay Packers' },
      ];
      return undefined;
    },
  },
  {
    fn: 'college-grid-validate',
    body: { playerName: PLAYER, rowAttribute: 'Alabama', colAttribute: 'Quarterback' },
    rows(table, hit) {
      if (table === 'nfl_player_team_stints') return [{ player_name: PLAYER, position: 'QB', college: hit ? 'Alabama' : 'Auburn' }];
      return undefined;
    },
  },
  {
    fn: 'soccer-grid-validate',
    body: { playerName: PLAYER, rowAttribute: 'Played for Chelsea', colAttribute: 'Played for Arsenal' },
    rows(table, hit) {
      if (table === 'soccer_player_club_stints') return hit ? [soccerStint('Chelsea FC', 2010), soccerStint('Arsenal FC', 2010)] : [soccerStint('Chelsea FC', 1990)];
      return undefined;
    },
  },
  {
    fn: 'validate-player',
    body: { playerName: PLAYER, teamName: 'Real Madrid', isNation: false },
    rows(table, hit) {
      if (table === 'player_market_values') return [{ player_name: PLAYER, club: hit ? 'Real Madrid' : 'Getafe CF', position: 'Centre-Forward', nationality: 'Spain' }];
      return undefined;
    },
  },
  {
    fn: 'football-connect4-validate',
    body: { playerName: PLAYER, rowAttribute: 'Played for Real Madrid', columnAttribute: 'Played for Chelsea' },
    half: { columnAttribute: 'Champions League Winner' },
    rows(table, hit) {
      if (table === 'soccer_player_club_stints') return hit
        ? [{ player_name: PLAYER, club: 'Real Madrid', nationality: 'Spain' }, { player_name: PLAYER, club: 'Chelsea FC', nationality: 'Spain' }]
        : [{ player_name: PLAYER, club: 'Getafe CF', nationality: 'Spain' }];
      return undefined;
    },
  },
  usConnect4('nba-connect4-validate', 'Lakers', 'LAL', 'Celtics', 'BOS', 'MVP Winner'),
  usConnect4('nfl-connect4-validate', 'Lions', 'DET', 'Bears', 'CHI', 'MVP Winner'),
  usConnect4('nhl-connect4-validate', 'Bruins', 'BOS', 'Canadiens', 'MTL', 'Hart Trophy'),
  usConnect4('mlb-connect4-validate', 'Yankees', 'NYY', 'Red Sox', 'BOS', 'MVP Winner'),
];

/* ---------- the scripted world the fakes answer from ---------- */

const world = { pair: null, facts: [], hit: false, db: 'ok', ai: 'no', aiCalls: 0, src: '', desc: null };

function resolveCall(call) {
  if (world.db === 'throw') return Promise.reject(new Error('database down'));
  if (world.db === 'error') return Promise.resolve({ data: null, error: { message: 'database down' } });
  const ops = call.ops.map((o) => o[0]);
  let data;
  if (call.table === 'ai_validation_cache') {
    if (ops.includes('upsert')) data = null;
    else if (ops.includes('maybeSingle')) data = world.pair ? { verdict: structuredClone(world.pair) } : null;
    else if (ops.includes('in')) data = structuredClone(world.facts);
    else data = [];
  } else {
    data = world.desc.rows(call.table, world.hit, world.src) ?? [];
  }
  return Promise.resolve({ data, error: null });
}
const fakeClient = {
  from(table) {
    const call = { table, ops: [] };
    const builder = new Proxy({}, {
      get(_, prop) {
        if (prop === 'then') return (res, rej) => resolveCall(call).then(res, rej);
        if (prop === 'maybeSingle' || prop === 'single') return () => { call.ops.push([prop]); return resolveCall(call); };
        return (...args) => { call.ops.push([prop, ...args]); return builder; };
      },
    });
    return builder;
  },
};
const aiReply = (content, status = 200) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status, headers: { 'Content-Type': 'application/json' } });
async function fakeFetch() {
  world.aiCalls += 1;
  if (world.ai === 'throw') throw new Error('model unreachable');
  if (world.ai === '500') return new Response('upstream error', { status: 500 });
  if (world.ai === 'garbage') return aiReply('I am not sure about that one.');
  /* split: the model refuses the half the records proved and accepts the
     other. bare: a no that never says which half it meant. */
  if (world.ai === 'split') return aiReply(JSON.stringify({ matchesRow: false, matchesColumn: true, valid: false, reason: 'model says no', fullName: PLAYER }));
  if (world.ai === 'bare') return aiReply(JSON.stringify({ valid: false, reason: 'model says no', fullName: PLAYER }));
  const yes = world.ai === 'yes';
  return aiReply(JSON.stringify({ matchesRow: yes, matchesColumn: yes, valid: yes, reason: yes ? 'model says yes' : 'model says no', fullName: PLAYER }));
}
const ENV = { GEMINI_API_KEY: 'test-key', SUPABASE_URL: 'http://fake.local', SUPABASE_SERVICE_ROLE_KEY: 'fake' };
const fakeDeno = { env: { get: (k) => ENV[k] } };
const quiet = { log() {}, error() {}, warn() {}, info() {} };

async function load(name, raw) {
  const stripped = raw.replace(/^import\s[^\n]*?from\s+"https:\/\/[^"]+";[ \t]*$/gm, '');
  if (/^\s*import\s/m.test(stripped)) throw new Error('an import this harness cannot stand in for');
  const { code } = await transform(stripped, { loader: 'ts', target: 'es2022' });
  let handler = null;
  const serve = (h) => { handler = h; };
  const createClient = () => fakeClient;
  new Function('serve', 'createClient', 'Deno', 'fetch', 'setInterval', 'console', code)(
    serve, createClient, fakeDeno, fakeFetch, () => 0, quiet);
  if (!handler) throw new Error('the module never called serve');
  return handler;
}

let ipSeq = 0;
async function ask(handler, desc, body = desc.body) {
  ipSeq += 1;
  const req = new Request(`http://fake.local/${desc.fn}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://douknowball.com', 'x-forwarded-for': `10.9.${ipSeq >> 8}.${ipSeq & 255}` },
    body: JSON.stringify(body),
  });
  const res = await handler(req);
  return res.json();
}

/* ---------- arm the control ---------- */

/* REFUSAL_HOLD_REF=<git ref> runs the same checks over that ref's functions
   instead of the working tree: the baseline in the header was measured so. */
const REF = process.env.REFUSAL_HOLD_REF || '';
const sourceOf = (fn) => (REF
  ? execFileSync('git', ['show', `${REF}:supabase/functions/${fn}/index.ts`], { cwd: ROOT, encoding: 'utf8' }).replace(/\r\n/g, '\n')
  : read(path.join(FN_DIR, fn, 'index.ts')));
if (REF) console.log(`SOURCES FROM ${REF}, not the working tree.\n`);
const sources = new Map(SUBJECTS.map((d) => [d.fn, sourceOf(d.fn)]));
if (CONTROL) {
  const [fn, old, neu] = CONTROLS[CONTROL];
  const raw = sources.get(fn);
  const count = raw.split(old).length - 1;
  if (count !== 1) { console.error(`control ${CONTROL} changed nothing: its text occurs ${count} times in ${fn}, wanted exactly 1`); process.exit(1); }
  sources.set(fn, raw.replace(old, neu));
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}, ${fn} edited in memory. This run must go red.\n`);
}

/* ---------- run ---------- */

const REFUSAL = { valid: false, matchesRow: false, matchesColumn: false, reason: 'Stored refusal from an earlier model answer.', fullName: PLAYER };
const STORED_YES = { valid: true, matchesRow: true, matchesColumn: true, reason: 'Stored acceptance.', fullName: PLAYER };
const reset = (over) => Object.assign(world, { pair: null, facts: [], hit: false, db: 'ok', ai: 'no', aiCalls: 0 }, over);

for (const desc of SUBJECTS) {
  console.log(desc.fn);
  const src = sources.get(desc.fn);
  let handler;
  try { handler = await load(desc.fn, src); } catch (e) { fail(`${desc.fn}: could not be loaded and run: ${String(e).slice(0, 160)}`); continue; }
  world.desc = desc;
  world.src = src;
  const before = failures;
  const step = async (label, over, check, body) => {
    reset(over);
    let r;
    try { r = await ask(handler, desc, body ? { ...desc.body, ...body } : desc.body); } catch (e) { fail(`${desc.fn}: ${label}: the handler threw ${String(e).slice(0, 120)}`); return; }
    const why = check(r);
    if (why) fail(`${desc.fn}: ${label}: ${why} (got ${JSON.stringify(r).slice(0, 160)}, model asked ${world.aiCalls} times)`);
  };

  await step('1 a stored yes is served', { pair: STORED_YES, ai: 'no' },
    (r) => (r.valid !== true ? 'a stored yes was not served' : world.aiCalls ? 'the model was asked about a stored yes' : ''));
  await step('2 a held refusal falls to records that prove it', { pair: REFUSAL, hit: true, ai: 'no' },
    (r) => (r.valid !== true ? 'the stored refusal outranked records that prove the answer' : world.aiCalls ? 'the model was asked although the records settled it' : ''));
  await step('3 a held refusal stands when the records do not decide it', { pair: REFUSAL, hit: false, ai: 'yes' },
    (r) => (r.valid !== false ? 'the held refusal was overturned without the records proving anything'
      : r.reason !== REFUSAL.reason ? 'the held refusal was not the answer returned'
      : world.aiCalls ? 'the model was asked to second guess a held refusal' : ''));
  await step('4 a records miss with nothing stored reaches the model', { hit: false, ai: 'no' },
    (r) => (world.aiCalls !== 1 ? 'the fake model was not reached once, so 2 and 3 prove nothing' : r.valid === true ? 'the model said no and the answer was yes' : ''));
  for (const [label, over] of [
    ['5a every read throws and the model throws', { db: 'throw', ai: 'throw' }],
    ['5b every read errors and the model answers 500', { db: 'error', ai: '500' }],
    ['5c nothing on file and the model answers garbage', { db: 'ok', ai: 'garbage' }],
  ]) {
    await step(label, over, (r) => (r.valid === true ? 'an unverifiable answer was ACCEPTED, the July 2026 fail open'
      : r.unverified !== true ? 'refused without unverified:true, so the client burns the guess' : ''));
  }
  if (desc.half) {
    await step('6a the model does not outvote a half the records proved', { hit: true, ai: 'split' },
      (r) => (world.aiCalls !== 1 ? 'the unproved half never reached the model' : r.valid !== true ? 'the model\'s no on the proved half beat the records' : ''), desc.half);
    await step('6b a bare no beside a proved half is unverified, not a refusal', { hit: true, ai: 'bare' },
      (r) => (r.valid === true ? 'a bare no was turned into a yes' : r.unverified !== true ? 'a no that never said which half it meant was served as a refusal' : ''), desc.half);
  }
  if (failures === before) ok(`${desc.fn}: stored yes served; held refusal overturned by records and kept without them, no model call either way; a miss reaches the model; three failure modes all valid:false, unverified:true${desc.half ? '; a proved half is not outvoted by the model' : ''}`);
}

/* ---------- verdict ---------- */

console.log('');
if (CONTROL) {
  if (failures > 0) {
    console.log(`simValidatorRefusalHold control ${CONTROL}: the planted defect was reported (${failures} finding${failures === 1 ? '' : 's'}). This red is expected.`);
    process.exit(1);
  }
  console.error(`simValidatorRefusalHold control ${CONTROL}: RED. The planted defect went unreported, the check does not work.`);
  process.exit(2);
}
if (failures > 0) { console.error(`simValidatorRefusalHold: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log(`simValidatorRefusalHold: green. ${SUBJECTS.length} validators run: a stored refusal waits for the records, and every failure mode fails closed.`);
