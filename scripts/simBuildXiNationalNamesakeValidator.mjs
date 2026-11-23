import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.env.BUILD_XI_VALIDATOR_WORKTREE ?? fileURLToPath(new URL('../',import.meta.url)));
const requireFromRepo = createRequire(path.join(root,'package.json'));
const { build } = requireFromRepo('esbuild');
const ref = process.env.BUILD_XI_NATIONAL_VALIDATOR_REF;
const edgeRelative = 'supabase/functions/validate-player/index.ts';
const oldSha = 'dd0e02e9c9218f12455fe4efc685cb5a6b01fb6e119140e6717e2d9f37aa249d';
const source = ref
  ? execFileSync('git',['show',ref+':'+edgeRelative],{cwd:root,encoding:'utf8'})
  : readFileSync(path.join(root,edgeRelative),'utf8');
const sourceSha = createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex');
if (ref) assert.equal(sourceSha,oldSha,'known v13 fixture artifact');
const market = JSON.parse(readFileSync(path.join(root,'scripts/data/bingoPoolHistory-2026-10-29.json'),'utf8')).rows;
const reviewedRows = market.filter(({player_name:name}) => /^(Vitinha|Nico González|Lionel Messi)$/.test(name));
const byId = id => {
  const row = market.find(row => row.id === id);
  assert.ok(row,'real archived row ' + id);
  return row;
};
const psg = byId(177617), marseille = byId(166895);
const porto = byId(167401);
const squadSource = readFileSync(path.join(root,'supabase/migrations/20260901_round_389_world_cup_2026_squads.sql'),'utf8');
assert.ok(squadSource.includes("('Vitinha','Portugal','MF',23,'2000-02-13',38,0,'Paris Saint-Germain',2026)"));
assert.ok(squadSource.includes("('Nicolás González','Argentina','MF',15,'1998-04-06',51,6,'Atlético Madrid',2026)"));
// Projection of the recorded senior names into the old name-only squad API.
const squad = [{ country:'Portugal',player_name:'Vitinha' },
  {country:'Argentina',player_name:'Nicolás González'},{country:'Argentina',player_name:'Lionel Messi'}];
const midfield = 'Vítor Machado Ferreira', striker = 'Vítor Manuel Carvalho Oliveira';
const argentine = 'Nicolás Iván González', spanish = 'Nicolás González Iglesias';

const edge = await build({
  stdin:{contents:source,loader:'ts',resolveDir:path.dirname(path.join(root,edgeRelative))},
  bundle:true,write:false,format:'cjs',platform:'neutral',external:['https://deno.land/*','https://esm.sh/*'],
});
const front = await build({
  stdin:{contents:[
    "export {buildXiExclusions,buildXiSearchExclusionKeys} from './src/lib/buildXiPlayers.ts';",
    "export {dedupeAndRank,SOCCER_MARKET_VALUE_SOURCE} from './src/lib/playerSearch.ts';",
    "export {checkLineupPick} from './src/lib/positionFit.ts';",
    "export {normalizePosition} from './src/lib/squadShape.ts';",
    "export {clubPickVerifies} from './src/lib/buildXiDraft.ts';",
  ].join('\n'),loader:'ts',resolveDir:root},
  bundle:true,write:false,format:'cjs',platform:'node',logLevel:'silent',
  plugins:[{name:'private sports search',setup(b){
    b.onResolve({filter:/^@\/integrations\/supabase\/client$/}, () => ({namespace:'fixture',path:'client'}));
    b.onLoad({filter:/^client$/,namespace:'fixture'}, () => ({contents:'export const supabase={};',loader:'js'}));
  }}],
});
const client = {module:{exports:{}},require:requireFromRepo};
runInNewContext(front.outputFiles[0].text,client);
const {buildXiExclusions,buildXiSearchExclusionKeys,dedupeAndRank,SOCCER_MARKET_VALUE_SOURCE,
  checkLineupPick,normalizePosition,clubPickVerifies} = client.module.exports;
const pickFromRow = row => ({
  rawName:row.player_name,rawPosition:row.position,club:row.club,nationality:row.nationality,
  year:row.year,recordId:row.id,
});
const picked = {playerName:'Vitinha',label:'CDM',role:'CDM',assignedTeam:'PSG',isNation:false,pick:pickFromRow(psg)};
const sourceChoice = {
  ...SOCCER_MARKET_VALUE_SOURCE,exclusionKeys:buildXiSearchExclusionKeys,
  metaColumns:{...SOCCER_MARKET_VALUE_SOURCE.metaColumns,recordId:'id'},
};
const filtered = [psg,porto,marseille].filter(row => row.nationality==='Portugal');
const before = dedupeAndRank([filtered],sourceChoice,'vitinha',{limit:10});
assert.equal(before.length,1);
assert.equal(before[0].meta.recordId,177617);
assert.equal(checkLineupPick('Vitinha','ST','ST',before[0].meta.position,normalizePosition).ok,false);
const result = dedupeAndRank([filtered],sourceChoice,'vitinha',{limit:10,exclude:buildXiExclusions([picked])});
assert.equal(result.length,1);
assert.equal(result[0].meta.recordId,166895);
assert.equal(checkLineupPick('Vitinha','ST','ST',result[0].meta.position,normalizePosition).ok,true);
assert.equal(clubPickVerifies({name:'Portugal',isNation:true},'ST',pickFromRow(marseille)),false);
const currentRequest = {playerName:result[0].name,teamName:'Portugal',isNation:true,position:'ST'};
assert.equal(currentRequest.playerName,'Vitinha');
console.log('PASS exact client search/role seam exposes Marseille ST row 166895 after PSG row 177617; national slot needs validator');

const cached = (playerName,team,slot) => ({game:'build-your-xi',cache_key:
  playerName.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()+'|'+team.toLowerCase()+'|'+slot+'|n',
  verdict:{valid:true,reason:'Poisoned legacy answer',fullName:playerName}});
function driver({hits=[],error=false}={}) {
  const reads=[],writes=[];
  let handle, aiCalls=0;
  const tables={player_market_values:reviewedRows,national_team_squads:squad,ai_validation_cache:hits};
  const sb={from(table) {
    let rows=tables[table].slice();
    const chain={
      select(){reads.push(table); return chain;},
      eq(key,value){rows=rows.filter(row=>row[key]===value);return chain;},
      in(key,values){rows=rows.filter(row=>values.includes(row[key]));return chain;},
      like(key,value){
        const exact = value.replaceAll('_',' ');
        rows=rows.filter(row=>row[key]===exact);
        return chain;
      },
      limit(n){rows=rows.slice(0,n);return chain;},
      maybeSingle(){return Promise.resolve({data:rows[0]??null});},
      upsert(value){writes.push(value);return Promise.resolve({error:null});},
      then(resolve){return Promise.resolve(error&&table==='player_market_values'
        ? {data:null,error:{message:'simulated table failure'}} : {data:rows,error:null}).then(resolve);},
    };
    return chain;
  }};
  runInNewContext(edge.outputFiles[0].text,{
    exports:{},require(module){
      if(module.startsWith('https://deno.land/')) return {serve:h=>{handle=h;}};
      if(module.startsWith('https://esm.sh/')) return {createClient:()=>sb};
      assert.fail('Unexpected module '+module);
    },
    Deno:{env:{get:()=>undefined}}, Request,Response,console,setInterval(){},fetch(){
      aiCalls += 1;
      throw Error('No network is available');
    },
  });
  const ask = async body => {
    const response = await handle(new Request('https://proof.invalid/validate-player',{method:'POST',body:JSON.stringify(body)}));
    assert.equal(response.status,200);
    return response.json();
  };
  return {ask,reads,writes,get aiCalls(){return aiCalls;}};
}
const nation = (playerName,teamName,position) => ({playerName,teamName,position,isNation:true});
const expectsHold = result => {
  assert.equal(result.valid,false);
  assert.equal(result.unverified,true);
};

if (process.env.BUILD_XI_NATIONAL_OLD_CONTROL === '1') {
  const baseline = driver();
  const verdict = await baseline.ask(currentRequest);
  assert.equal(verdict.valid,true);
  assert.equal(verdict.source,'records');
  assert.equal(baseline.writes.length,1);
  assert.equal(baseline.writes[0].cache_key,'vitinha|portugal|ST|n');
  console.log('REPRODUCED v13 false positive from records after the client exposes the other Vitinha',JSON.stringify(verdict));
  console.log('Exact Edge SHA-256',sourceSha);
} else {
  const cases = [
    ['old bare Portugal/ST refuses the cold false join before legacy cache writes',async()=>{
      const f=driver();
      expectsHold(await f.ask(currentRequest));
      assert.ok(!f.reads.includes('ai_validation_cache'));
      assert.deepEqual(f.writes,[]);
    }],
    ['explicit other Vitinha stays unverified, including at a shared midfield slot and from positive caches',async()=>{
      const f=driver({hits:[cached(striker,'Portugal','CAM'),cached('Vitinha','Portugal','ST')]});
      expectsHold(await f.ask(nation(striker,'Portugal','CAM')));
      expectsHold(await f.ask(nation(striker,'Portugal','ST')));
      expectsHold(await f.ask(currentRequest));
      expectsHold(await f.ask(nation('Vitinha!','Portugal','ST')));
      expectsHold(await f.ask(nation(striker,'!!!',undefined)));
      assert.ok(!f.reads.includes('ai_validation_cache'));
      assert.equal(f.aiCalls,0);
      assert.deepEqual(f.writes,[]);
    }],
    ['explicit and legacy midfielder keep the senior Portugal pick',async()=>{
      const f=driver();
      for(const name of [midfield,'Vitinha','Vitor Machado Ferreira']){
        const verdict=await f.ask(nation(name,'Portugal','CDM'));
        assert.equal(verdict.valid,true);
        assert.equal(verdict.fullName,midfield);
        assert.equal(verdict.source,'records');
      }
      expectsHold(await f.ask(nation(midfield,'Portugal','ST')));
      assert.ok(!f.reads.includes('national_team_squads'));
    }],
    ['Nico national proof is senior and person-specific', async()=>{
      const f=driver({hits:[cached(spanish,'Spain','CDM')]});
      for (const name of [argentine,'Nicolás González','Nico González']){
        const verdict=await f.ask(nation(name,'Argentina','LW'));
        assert.equal(verdict.valid,true);
        assert.equal(verdict.fullName,argentine);
      }
      expectsHold(await f.ask(nation(spanish,'Spain','CDM')));
      expectsHold(await f.ask(nation(spanish,'Argentina','LW')));
      expectsHold(await f.ask(nation('Nico González','Argentina','CDM')));
      assert.ok(!f.reads.includes('ai_validation_cache'));
    }],
    ['market outage holds proof rather than relying on the same-name cache',async()=>{
      const f=driver({error:true,hits:[cached('Vitinha','Portugal','CDM')]});
      expectsHold(await f.ask(nation('Vitinha','Portugal','CDM')));
      assert.equal(f.aiCalls,0);
    }],
    ['ordinary cached or cold national verdicts and reviewed club routes stay available',async()=>{
      const old=driver({hits:[cached('Lionel Messi','Argentina','RW')]});
      assert.equal((await old.ask(nation('Lionel Messi','Argentina','RW'))).cached,true);
      const cold=driver();
      assert.equal((await cold.ask(nation('Lionel Messi','Argentina','RW'))).valid,true);
      const club=await cold.ask({playerName:'Vitinha',teamName:'Marseille',position:'ST',isNation:false});
      assert.equal(club.valid,true);
      assert.equal(club.fullName,'Vitinha');
    }],
  ];
  let failures=0;
  for(const [label,check] of cases){
    try{await check();console.log('PASS',label);}
    catch(error){failures+=1;console.error('FAIL',label,error.message);}
  }
  console.log('Edge SHA-256',sourceSha);
  if(failures)process.exitCode=1;
}
