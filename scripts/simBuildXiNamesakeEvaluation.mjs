import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../',import.meta.url));
const relativeEdge = 'supabase/functions/evaluate-lineup/index.ts';
const ref = process.env.BUILD_XI_NAMESAKE_EVAL_REF;
const source = ref
  ? execFileSync('git', ['show', ref + ':' + relativeEdge], {cwd:root,encoding:'utf8'})
  : readFileSync(path.join(root,relativeEdge),'utf8');
const {outputFiles} = await build({
  stdin:{contents:source,loader:'ts',resolveDir:path.join(root,'supabase/functions/evaluate-lineup')},
  bundle:true,write:false,format:'cjs',platform:'neutral',external:['https://deno.land/*'],logLevel:'silent',
});
const frozen = JSON.parse(readFileSync(path.join(root,'scripts/data/bingoPoolHistory-2026-10-29.json'),'utf8')).rows;
const byId = id => {
  const row = frozen.find(entry => entry.id === id);
  assert.ok(row, 'exact recorded season row ' + id);
  return row;
};
const names = /^(Vitinha|Nico González|Erling Haaland|Lionel Messi|Mohamed Salah)$/;
const records = frozen.filter(row => names.test(row.player_name));
const marseille2023 = byId(157985);
const marseille2024 = byId(166895);
const psg2026 = byId(177617);
assert.deepEqual([marseille2023,marseille2024,psg2026].map(row=>[row.club,row.position,row.market_value_usd]),[
  ['Olympique Marseille','Centre-Forward',24_000_000],
  ['Olympique Marseille','Centre-Forward',15_000_000],
  ['Paris Saint-Germain','Defensive Midfield',151_200_000],
]);
const forward = 'Vítor Manuel Carvalho Oliveira';
const midfielder = 'Vítor Machado Ferreira';
const player = (playerName,assignedTeam,label='ST',extra={}) => ({playerName,assignedTeam,label,...extra});
const pick = (row,extra={}) => ({
  recordId:row.id, rawName:row.player_name, club:row.club, nationality:row.nationality,
  year:row.year, rawPosition:row.position, value:999_000_000, ...extra,
});
const hits = (requests, host) => requests.filter(request => request.hostname === host);

async function serveFixture(players, {ai, failMarket=false, aiFailure=false}={}) {
  const requests = [];
  let handler;
  const env = {SUPABASE_URL:'https://db.invalid', SUPABASE_ANON_KEY:'fixture-anon'};
  if (ai || aiFailure) env.GEMINI_API_KEY = 'fixture-model';
  const mockFetch = async (raw, init={}) => {
    const url = new URL(raw);
    requests.push({hostname:url.hostname,path:url.pathname,params:url.searchParams,body:init.body});
    if (url.hostname === 'db.invalid' && url.pathname === '/rest/v1/player_market_values') {
      assert.equal(init.method ?? 'GET','GET');
      if (failMarket) return new Response('fixture unavailable',{status:503});
      const clauses = new Set((url.searchParams.get('or') ?? '').slice(1,-1).toLowerCase().split(','));
      const returned = records.filter(row => {
        return clauses.has('player_name.ilike.' + row.player_name.toLowerCase()) || clauses.has('id.eq.' + row.id)
          || url.searchParams.get('id') === 'eq.' + row.id;
      });
      const cols = url.searchParams.get('select').split(',');
      return Response.json(returned.map(row => Object.fromEntries(cols.map(col=>[col,row[col]]))));
    }
    if (url.hostname === 'generativelanguage.googleapis.com' && url.pathname.endsWith('/chat/completions')) {
      if (aiFailure) return new Response('fixture exhausted',{status:429});
      assert.ok(ai,'model cannot be reached outside its explicit fixture');
      return Response.json({choices:[{message:{content:JSON.stringify(ai)}}]});
    }
    assert.fail('Unexpected outbound path in offline fixture ' + url.hostname + url.pathname);
  };
  runInNewContext(outputFiles[0].text,{
    exports:{},require(id) {
      assert.ok(id.startsWith('https://deno.land/'));
      return {serve(callback){handler=callback;}};
    },
    Deno:{env:{get:key=>env[key]}}, fetch:mockFetch, Request,Response,URL,URLSearchParams,Headers,
    setInterval(){}, console:{log(){}},
  });
  const res = await handler(new Request('https://isolated.invalid/evaluate-lineup',{
    method:'POST', body:JSON.stringify({formation:'4-3-3',players}),
  }));
  assert.equal(res.status,200);
  return {result:await res.json(),requests};
}

const checks = {
  'legacy Marseille or PSG vitinha resolves alone to the correct identity and price':async()=>{
    const marseille = await serveFixture([player('Vitinha','Marseille')]);
    assert.match(marseille.result.analysis,/1\/1/);
    assert.match(marseille.result.analysis,/\$24M/);
    assert.match(marseille.result.analysis,new RegExp(forward));
    assert.doesNotMatch(marseille.result.analysis,/\$151M/);
    const paris = await serveFixture([player('Vitinha','PSG','CDM')]);
    assert.match(paris.result.analysis,/\$151M/);
    assert.match(paris.result.analysis,new RegExp(midfielder));
  },
  'an exact picked row wins over the same person’s more expensive year and caller value':async()=>{
    const result = await serveFixture([player(forward,'Marseille','ST',{pick:pick(marseille2024)})]);
    assert.match(result.result.analysis,/1\/1/);
    assert.match(result.result.analysis,/\$15M/);
    assert.doesNotMatch(result.result.analysis,/\$24M|\$151M|\$999M/);
  },
  'existing selected snapshots without an id can still preserve the dated valuation':async()=>{
    const result = await serveFixture([player('Vitinha','Marseille','ST',{pick:pick(marseille2024,{recordId:undefined})})]);
    assert.match(result.result.analysis,/\$15M/);
  },
  'two selected people count twice and use their own exact values':async()=>{
    const result = await serveFixture([
      player(forward,'Marseille','ST',{pick:pick(marseille2024)}),
      player(midfielder,'PSG','CDM',{pick:pick(psg2026)}),
    ]);
    assert.match(result.result.analysis,/2\/2/);
    assert.match(result.result.analysis,/\$83M/);
    assert.match(result.result.analysis,new RegExp(midfielder));
  },
  'legacy namesakes remain two players in the scored XI with ordinary teammates':async()=>{
    const result = await serveFixture([
      player('Vitinha','Marseille','ST'),player('Vitinha','PSG','CDM'),
      player('Erling Haaland','Manchester City','ST'),player('Lionel Messi','Barcelona','RW'),
      player('Mohamed Salah','Liverpool','RW'),
    ]);
    assert.match(result.result.analysis,/5\/5/);
    assert.match(result.result.analysis,/\$149M/);
  },
  'an exact id for the other player cannot override the selected club or canonical name':async()=>{
    const response = await serveFixture([player(forward,'Marseille','ST',{pick:pick(psg2026)})], {
      ai:{rating:'Winners',headline:'Unverified',analysis:'Wrong identity could be scored.'},
    });
    assert.match(response.result.analysis,/0\/1/);
    assert.doesNotMatch(response.result.analysis,/\$151M|Wrong identity/);
    assert.equal(hits(response.requests,'generativelanguage.googleapis.com').length,0);
  },
  'a bare Portuguese nickname and drafted position provide no market identity':async()=>{
    const response = await serveFixture([player('Vitinha','Portugal','ST',{isNation:true})]);
    assert.match(response.result.analysis,/0\/1/);
    assert.doesNotMatch(response.result.analysis,/\$151M|\$24M/);
  },
  'a priced club row distinguishes the chosen person without certifying the nation assignment':async()=>{
    const response = await serveFixture([player('Vitinha','Portugal','ST',{isNation:true,pick:pick(marseille2023)})], {
      ai:{rating:'Top 4 Finish 📈',headline:'Exact person',analysis:'The selected player was evaluated.',reviewedIdentities:{'1':forward}},
    });
    assert.equal(response.result.headline,'Exact person');
    const [request] = hits(response.requests,'generativelanguage.googleapis.com');
    const prompt = JSON.parse(request.body).messages.at(-1).content;
    assert.match(prompt,/draft assignment: Portugal, country/);
    assert.match(prompt,/verify club appearances and international caps independently/);
    assert.ok(prompt.includes(forward));
  },
  'a model verdict must echo both exact people in their numbered slots':async()=>{
    const players = [player(forward,'Marseille','ST'),player(midfielder,'PSG','CDM')];
    const valid = {rating:'Top 4 Finish 📈',headline:'Balanced squad',analysis:'Both reviewed players were evaluated.',
      reviewedIdentities:{'1':forward,'2':midfielder}};
    const selected = await serveFixture(players,{ai:valid});
    assert.equal(selected.result.analysis,valid.analysis);
    assert.ok(!Object.hasOwn(selected.result,'reviewedIdentities'));
    const [request] = hits(selected.requests,'generativelanguage.googleapis.com');
    assert.ok(request);
    const prompt = JSON.parse(request.body).messages.at(-1).content;
    assert.ok(prompt.includes(forward) && prompt.includes(midfielder));
    assert.match(prompt,/reviewedIdentities/);
    for (const bad of [undefined,{'1':'Vitinha','2':'Vitinha'},{'1':midfielder,'2':forward},{'1':forward}]) {
      const rejected = await serveFixture(players,{ai:{...valid,reviewedIdentities:bad}});
      assert.notEqual(rejected.result.analysis,valid.analysis);
      assert.match(rejected.result.analysis,/2\/2/);
      assert.match(rejected.result.analysis,/\$88M/);
    }
  },
  'verified Spanish and Argentine Nico records get their own pricing':async()=>{
    const result = await serveFixture([player('Nico González','Barcelona','CDM'),player('Nico González','Juventus','LW')]);
    assert.match(result.result.analysis,/2\/2/);
    assert.match(result.result.analysis,/\$35M/);
    assert.match(result.result.analysis,/Nicolás Iván González/);
  },
  'market or model failure leaves a safe complete verdict':async()=>{
    const result = await serveFixture([player(forward,'Marseille','ST',{pick:pick(marseille2023)})],{failMarket:true,aiFailure:true});
    assert.match(result.result.analysis,/0\/1/);
    assert.equal(result.result.rating,'Unrated XI');
    assert.ok(result.result.headline);
    assert.doesNotMatch(result.result.analysis,/\$151M|\$999M/);
  },
  'ordinary teams still use the existing three field model verdict without a market read':async()=>{
    const ai = {rating:'Top 4 Finish 📈',headline:'Ordinary name',analysis:'Unchanged verdict contract.'};
    const result = await serveFixture([player('Erling Haaland','Manchester City')],{ai});
    assert.deepEqual(result.result,ai);
    assert.equal(hits(result.requests,'db.invalid').length,0);
  },
};

let failures = 0;
for (const [name,check] of Object.entries(checks)) {
  try { await check(); console.log('PASS',name); }
  catch (error) { failures += 1; console.error('FAIL',name,error.message); }
}
if (failures) process.exitCode = 1;
