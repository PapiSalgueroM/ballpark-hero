/* Reviewer probe (Round 1584, run lens): play the REAL soccer-grid-validate handler, base vs head, with a fake
   database and a fake model, the way simValidatorRefusalHold loads it. No network: createClient and fetch are fakes.
   Usage on the runner: node .rc/x/playGrid.mjs   (BASE_REF defaults to eb8ae0614)
   Exit 1 when a head expectation fails. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { transform } from 'esbuild';

const BASE_REF = process.env.BASE_REF || 'eb8ae0614';
const FN = 'supabase/functions/soccer-grid-validate/index.ts';
const headSrc = fs.readFileSync(FN, 'utf8').replace(/\r\n/g, '\n');
const baseSrc = execFileSync('git', ['show', `${BASE_REF}:${FN}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n');

const world = { stints: [], cache: null, ai: 'yes', aiCalls: 0, writes: [] };
function resolveCall(call) {
  const ops = call.ops.map(o => o[0]);
  let data;
  if (call.table === 'ai_validation_cache') {
    if (ops.includes('upsert')) { world.writes.push(call.ops.find(o => o[0] === 'upsert')[1]); data = null; }
    else if (ops.includes('maybeSingle')) data = world.cache ? { verdict: structuredClone(world.cache) } : null;
    else data = [];
  } else if (call.table === 'soccer_player_club_stints') data = structuredClone(world.stints);
  else data = [];
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
const aiReply = content => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
async function fakeFetch() {
  world.aiCalls += 1;
  const yes = world.ai === 'yes';
  return aiReply(JSON.stringify({ matchesRow: yes, matchesColumn: yes, valid: yes, reason: yes ? 'model says yes' : 'model says no', fullName: world.name }));
}
const ENV = { GEMINI_API_KEY: 'test-key', SUPABASE_URL: 'http://fake.local', SUPABASE_SERVICE_ROLE_KEY: 'fake' };
const quiet = { log() {}, error() {}, warn() {}, info() {} };
async function load(raw) {
  const stripped = raw.replace(/^import\s[^\n]*?from\s+"https:\/\/[^"]+";[ \t]*$/gm, '');
  const { code } = await transform(stripped, { loader: 'ts', target: 'es2022' });
  let handler = null;
  new Function('serve', 'createClient', 'Deno', 'fetch', 'setInterval', 'console', code)(
    h => { handler = h; }, () => fakeClient, { env: { get: k => ENV[k] } }, fakeFetch, () => 0, quiet);
  return handler;
}
let ip = 0;
async function ask(handler, player, row, col) {
  ip += 1;
  const req = new Request('http://fake.local/soccer-grid-validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://douknowball.com', 'x-forwarded-for': `10.7.${ip >> 8}.${ip & 255}` },
    body: JSON.stringify({ playerName: player, rowAttribute: row, colAttribute: col }),
  });
  return (await handler(req)).json();
}
const st = (player_name, club, first_year, last_year, nationality, position, debut_year, debut_age) =>
  ({ player_name, club, first_year, last_year, seasons: last_year - first_year + 1, nationality, position, debut_year, debut_age, person_key: null });

const DZ = [st('Artem Dzyuba', 'Spartak Moscow', 2011, 2014, 'Russia', 'Centre-Forward', 2011, 22),
  st('Artem Dzyuba', 'Arsenal Tula', 2018, 2018, 'Russia', 'Centre-Forward', 2011, 22),
  st('Artem Dzyuba', 'Zenit St. Petersburg', 2015, 2021, 'Russia', 'Centre-Forward', 2011, 22)];
const KL = [st('Valeriy Klimov', 'Arsenal Tula', 2004, 2004, 'Russia', 'Right Winger', 2004, 29)];
const PE = [st('Oleg Pestryakov', 'Arsenal Kyiv', 2004, 2005, 'Russia', 'Left Midfield', 2004, 29)];
const SK = [st('Bukayo Saka', 'Arsenal FC', 2019, 2026, 'England', 'Right Winger', 2019, 17)];
const U21 = [st('Test Youngster', 'Arsenal FC U21', 2018, 2020, 'England', 'Centre-Forward', 2018, 18)];
const SPLIT = [st('Test Splitter', 'Arsenal FC / Nottingham Forest', 2012, 2012, 'England', 'Centre-Forward', 2008, 19)];
const BER = [st('Test Ghanaian', 'Berekum Arsenal', 2010, 2011, 'Ghana', 'Centre-Forward', 2010, 20)];
const SAR = [st('Test Argentine', 'Arsenal de Sarandí', 2010, 2011, 'Argentina', 'Centre-Forward', 2010, 20)];
const TWO = [st('Test Twoman', 'Arsenal Tula', 2015, 2016, 'Russia', 'Centre-Forward', 2015, 20),
  st('Test Twoman', 'Arsenal FC', 2012, 2013, 'England', 'Centre-Forward', 2012, 19)];

const A = 'Played for Arsenal', F = 'Forward (FWD)';
const CASES = [
  // name, stints, model, cache, row, col, head expectation (valid, model asked?)
  ['Artem Dzyuba (Tula, complete career)', DZ, 'yes', null, A, F, { valid: false, ai: 0 }],
  ['Artem Dzyuba, label as the column', DZ, 'yes', null, F, A, { valid: false, ai: 0 }],
  ['Valeriy Klimov (Tula, residual), model yes', KL, 'yes', null, A, F, { valid: true, ai: 1 }],
  ['Valeriy Klimov (Tula, residual), model no', KL, 'no', null, A, F, { valid: false, ai: 1 }],
  ['Oleg Pestryakov (Kyiv, residual), model no', PE, 'no', null, A, 'Midfielder (MID)', { valid: false, ai: 1 }],
  ['Test Ghanaian (Berekum Arsenal, complete)', BER, 'yes', null, A, F, { valid: false, ai: 0 }],
  ['Test Argentine (Arsenal de Sarandi string, complete)', SAR, 'yes', null, A, F, { valid: false, ai: 0 }],
  ['Bukayo Saka (London)', SK, 'no', null, A, F, { valid: true, ai: 0 }],
  ['Arsenal FC U21 man', U21, 'no', null, A, F, { valid: true, ai: 0 }],
  ['split season Arsenal FC / Nottingham Forest', SPLIT, 'no', null, A, F, { valid: true, ai: 0 }],
  ['a name with London and Tula rows of two nationalities', TWO, 'no', null, A, F, { valid: true, ai: 0 }],
  ['Dzyuba with a cached yes (served first: the purge covers these)', DZ, 'no', { valid: true, reason: 'Stored acceptance.', fullName: 'Artem Dzyuba' }, A, F, { valid: true, ai: 0 }],
  ['Dzyuba for Zenit (another label unchanged)', DZ, 'no', null, 'Played for Zenit', F, { valid: true, ai: 0 }],
];

const base = await load(baseSrc), head = await load(headSrc);
let bad = 0;
const fmt = r => `valid=${r.valid}${r.unverified ? ' unverified' : ''} reason="${String(r.reason || r.error || '').slice(0, 70)}"`;
for (const [name, stints, ai, cache, row, col, want] of CASES) {
  const out = {};
  for (const [tag, h] of [['base', base], ['head', head]]) {
    Object.assign(world, { stints, cache, ai, aiCalls: 0, writes: [], name: stints[0].player_name });
    const r = await ask(h, stints[0].player_name, row, col);
    out[tag] = { r, ai: world.aiCalls, wrote: world.writes.length };
  }
  const h = out.head;
  const okHead = h.r.valid === want.valid && h.ai === want.ai;
  if (!okHead) bad += 1;
  console.log(`${okHead ? 'ok  ' : 'BAD '} ${name} [${row} x ${col}]`);
  console.log(`       base: ${fmt(out.base.r)} model=${out.base.ai} cacheWrite=${out.base.wrote}`);
  console.log(`       head: ${fmt(h.r)} model=${h.ai} cacheWrite=${h.wrote}   want valid=${want.valid} model=${want.ai}`);
}
console.log(bad ? `playGrid: ${bad} head expectation(s) failed` : `playGrid: green, ${CASES.length} cases played on base ${BASE_REF} and head`);
process.exit(bad ? 1 : 0);
