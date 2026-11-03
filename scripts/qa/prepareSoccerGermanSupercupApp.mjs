import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.env.CI, '1');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert(process.env.SC_GERMAN_APP_PREP, 'Explicit fresh preparation output required');
const out = path.resolve(process.env.SC_GERMAN_APP_PREP);
assert(out.startsWith(path.join(root, 'tmp') + path.sep));
assert(!fs.existsSync(out) || fs.readdirSync(out).length === 0);
fs.mkdirSync(out, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const pins = {
  'src/lib/soccerCareerEngine.ts': '09cd78f78d405435167a663f29555d62c4457e53934ffd362784888b4907f994',
  'src/lib/soccerCareerExtraCups.ts': '33d57ca91560cbdfff95127fbfe718b5f9f28a5fa768bf8a61c8b4d7dee009b9',
  'src/lib/season/soccer.ts': '93ce720e49c8b55621e09eb1a7c30d94147aea3cbf5fd8268ccad2232022bd21',
  'scripts/qa/fixtures/soccerGermanSupercup.app-inputs.json': 'ff5bb6f49cd6c428f699a6ae79a1724fa5778ff78ac2932130033fbab881e1ff',
  'src/lib/soccerSeasonCompetitions.ts': '4a15bc180f9963d929dfa5c7f69b4849bd467443317fb9529409c1b7d17b269c',
  'src/lib/soccerSeasonCalendar.ts': 'b134780c700ad22d31a4c8e7486573637596b14d50d801f6075a0ebbc6d254ca',
  'scripts/lib/cmValueCurve.mjs': 'e9fa4cf1961c47493ed8e1b8f718507efdf3746743fe819b8f32128bccf14692',
  'scripts/lib/cmAges.mjs': 'c91917407edc170f6402f721d4592ed78a06ba200c12e2b6a4f286c3ac3602c9',
};
const held = new Map();
const hold = file => {
  const absolute = path.resolve(root, file);
  assert(absolute.startsWith(root + path.sep));
  if (!held.has(absolute)) held.set(absolute, fs.readFileSync(absolute));
};
const receipts = () => [...held].map(([file, bytes]) => ({ file: path.relative(root, file).split(path.sep).join('/'), bytes: bytes.length, sha256: sha(bytes) }));
let primary = null, manifest = null;
const secondary = [], storageOperations = [];
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const storageValues = new Map();
const storage = { getItem(key) { storageOperations.push({ op: 'get', key: String(key) }); return storageValues.get(String(key)) ?? null; },
  setItem(key, value) { storageOperations.push({ op: 'set', key: String(key), bytes: Buffer.byteLength(String(value)) }); storageValues.set(String(key), String(value)); },
  removeItem(key) { storageOperations.push({ op: 'remove', key: String(key) }); storageValues.delete(String(key)); } };
function change(state, edits, keys, value, remove = false) {
  let target = state;
  for (const key of keys.slice(0, -1)) target = target[key];
  const key = keys.at(-1), beforePresent = Object.hasOwn(target, key);
  const row = { keys, beforePresent, before: beforePresent ? clone(target[key]) : null, afterPresent: !remove, after: remove ? null : clone(value) };
  if (remove) delete target[key]; else target[key] = clone(value);
  edits.push(row);
}
function inverse(state, edits) {
  const result = clone(state);
  for (const edit of [...edits].reverse()) {
    let target = result;
    for (const key of edit.keys.slice(0, -1)) target = target[key];
    if (edit.beforePresent) target[edit.keys.at(-1)] = clone(edit.before);
    else delete target[edit.keys.at(-1)];
  }
  return result;
}
try {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: storage });
  for (const file of [...Object.keys(pins), 'package.json', 'package-lock.json', 'tsconfig.app.json', 'src/lib/soccerCareerSave.ts', fileURLToPath(import.meta.url)]) hold(file);
  for (const [file, expected] of Object.entries(pins)) assert.equal(sha(held.get(path.join(root, file))), expected, 'Actual input pin: ' + file);
  const entry = path.join(out, 'entry.mjs');
  fs.writeFileSync(entry, [
    ['engine', 'src/lib/soccerCareerEngine.ts'], ['extra', 'src/lib/soccerCareerExtraCups.ts'],
    ['save', 'src/lib/soccerCareerSave.ts'], ['competitions', 'src/lib/soccerSeasonCompetitions.ts'],
    ['calendar', 'src/lib/soccerSeasonCalendar.ts'], ['world', 'src/lib/soccerCareerLeagueWorld.ts'],
    ['league', 'src/lib/soccerCareerLeague.ts'], ['binding', 'src/lib/season/soccer.ts'], ['season', 'src/lib/season/core.ts'],
  ].map(([name, file]) => 'export * as ' + name + ' from ' + JSON.stringify(path.join(root, file)) + ';').join('\n') + '\n', { flag: 'wx' });
  hold(entry);
  const compiled = await build({ absWorkingDir: root, entryPoints: [entry], outfile: path.join(out, 'actual-readers.mjs'), bundle: true,
    platform: 'node', format: 'esm', target: 'es2022', alias: { '@': path.join(root, 'src') }, tsconfig: path.join(root, 'tsconfig.app.json'), metafile: true, write: false, logLevel: 'silent' });
  write('metafile.json', compiled.metafile);
  assert.equal(compiled.outputFiles.length, 1);
  const executable = Buffer.from(compiled.outputFiles[0].contents);
  fs.writeFileSync(path.join(out, 'actual-readers.mjs'), executable, { flag: 'wx' });
  for (const file of Object.keys(compiled.metafile.inputs)) {
    const absolute = path.resolve(root, file), relative = path.relative(root, absolute).split(path.sep).join('/');
    assert(absolute === entry || relative.startsWith('src/') || relative.startsWith('node_modules/') || relative === 'scripts/lib/cmValueCurve.mjs' || relative === 'scripts/lib/cmAges.mjs', 'Unexpected compiled input: ' + relative);
    hold(absolute);
  }
  write('compiled-inputs.json', { executable: { file: 'actual-readers.mjs', bytes: executable.length, sha256: sha(executable) }, inputs: receipts() });
  const api = await import(pathToFileURL(path.join(out, 'actual-readers.mjs')).href);
  for (const [namespace, method] of [['save','isSoccerCareerSave'],['save','serializeSoccerCareerSave'],['save','parseSoccerCareerSave'],['extra','readCommunityShield'],['extra','countCommunityShields'],['extra','readGermanSupercup'],['extra','germanSupercupPlayerSide'],['extra','countGermanSupercups'],['extra','careerOpeningAnnualStats'],['extra','germanSupercupSeasonStats'],['engine','getCareerTotals'],['engine','advanceProSeason'],['engine','repairCareer'],['engine','calcOverall'],['competitions','savedSeasonCompetitions'],['calendar','cupCalendar'],['world','readLeagueWorldSeason'],['world','leagueWorldForYear'],['world','leagueWorldOrder'],['world','clubKeyOf'],['league','readLeagueFinish'],['binding','soccerSeasonKey'],['binding','buildSoccerSeasonCtx'],['season','deriveSeason']]) assert.equal(typeof api[namespace]?.[method],'function',namespace+'.'+method);
  const dto = value => JSON.parse(JSON.stringify(value)), hashJSON = value => sha(Buffer.from(JSON.stringify(value)));
  const five = row => Object.fromEntries(['apps','goals','assists','cleanSheets','rating'].map(key => [key,row[key]]));
  const same = (a,b) => api.world.clubKeyOf(a) === api.world.clubKeyOf(b);
  const carrier = JSON.parse(held.get(path.join(root,'scripts/qa/fixtures/soccerGermanSupercup.app-inputs.json')));
  assert.equal(carrier.schema,1); assert.deepEqual(carrier.entries.map(item=>item.id),['english-win','english-loss','german-close']);
  const members = new Map(), inputReceipts = [];
  for (const item of carrier.entries) {
    assert.equal(item.encoding,'gzip+hex'); assert(/^[0-9a-f]+$/.test(item.body) && item.body.length % 2 === 0);
    const packed=Buffer.from(item.body,'hex'); assert.equal(packed.length,item.compressed.bytes); assert.equal(sha(packed),item.compressed.sha256);
    const raw=gunzipSync(packed); assert.equal(raw.length,item.raw.bytes); assert.equal(sha(raw),item.raw.sha256);
    fs.writeFileSync(path.join(out,'retained-'+item.id+'.json'),raw,{flag:'wx'}); members.set(item.id,JSON.parse(raw));
    inputReceipts.push({id:item.id,source:item.source,raw:item.raw,compressed:item.compressed,decodedExact:true});
  }
  write('retained-inputs.json',inputReceipts);
  const actions=[], CLOCK=1793448000000;
  function advance(label,input,meta={seed:0,clock:CLOCK}) {
    const working=clone(input),before=dto(working),draws=[],random=Math.random,now=Date.now,start=storageOperations.length;
    let lcg=meta.seed>>>0,output,actionError=null;
    storageValues.clear(); storageOperations.push({op:'context-reset',label,seed:meta.seed});
    Math.random=()=>{lcg=(Math.imul(lcg,1664525)+1013904223)>>>0;const value=lcg/4294967296;draws.push(value);return value;};
    Date.now=()=>meta.clock;
    try {output=api.engine.advanceProSeason(working,api.engine.FALLBACK_CLUBS);} catch(error){actionError=error;}
    finally {Math.random=random;Date.now=now;}
    const record={label,seed:meta.seed,clock:meta.clock,before,inputAfter:dto(working),after:output===undefined?null:dto(output),
      draws,finalLcgState:lcg,storageOperations:clone(storageOperations.slice(start)),
      error:actionError?{name:actionError.name,message:actionError.message,stack:actionError.stack}:null};
    try {write('capture-'+label+'.json',record);} catch(error){if(actionError){secondary.push({name:error.name,message:error.message});throw actionError;}throw error;}
    if(actionError)throw actionError;
    actions.push(record); assert.equal(api.save.isSoccerCareerSave(record.after),true); assert.deepEqual(record.inputAfter,before,'Public action retains the complete JSON input');
    if(meta.draws){assert.deepEqual(draws,meta.draws);assert.equal(lcg,meta.finalLcgState);}
    return record;
  }
  function qualification(before,after) {
    const year=before.seasons.at(-1).year+1,world=api.world.leagueWorldForYear(before,api.engine.FALLBACK_CLUBS,year);
    assert(world,'Actual same-close world before action');
    const order=api.world.leagueWorldOrder(world,'Bundesliga',before.playerName,api.engine.FALLBACK_CLUBS);
    assert.equal(order.length,18);assert.equal(new Set(order.map(value=>api.world.clubKeyOf(value))).size,18);assert.equal(after.phone.world.year,year);
    const leagueWinner=after.phone.world.leagues.Bundesliga,cupWinner=after.phone.world.cups?.Bundesliga;
    assert.equal(leagueWinner,order[0]);assert.equal(typeof cupWinner,'string');assert(cupWinner.length>0);
    const double=same(leagueWinner,cupWinner);
    const expected={version:1,competition:'german-supercup',status:'ready',qualifyingYear:year,eventYear:year+1,seed:after.phone.seed,leagueWinner,cupWinner,
      ...(double?{runnerUp:order[1]}:{}),entrants:[{club:leagueWinner,via:'league-winner'},{club:double?order[1]:cupWinner,via:double?'league-runner-up':'dfb-pokal-winner'}],
      proof:{league:{kind:'league-world-close',year},cup:{kind:'phone-world',year},...(double?{runnerUp:{kind:'league-world-close',year}}:{})}};
    return {expected,order,world,basis:'Existing same-close18-club order and actual phone world, no new capture helper.'};
  }
  for(const id of ['english-win','english-loss']) {
    const old=members.get(id);assert.equal(old.clock,CLOCK);assert.equal(Object.hasOwn(old.before,'germanSupercupQualification'),false);
    const fresh=advance(id,old.before,{seed:old.seed,clock:old.clock,draws:old.draws,finalLcgState:old.finalLcgState});
    const q=qualification(old.before,fresh.after),normalized=clone(fresh.after);delete normalized.germanSupercupQualification;
    write(id+'-agreement.json',{qualification:q,actual:fresh.after.germanSupercupQualification,normalized,oldOutput:old.after,oldInputAfter:old.inputAfter,freshInputAfter:fresh.inputAfter});
    assert.deepEqual(fresh.after.germanSupercupQualification,q.expected);
    assert.deepEqual(normalized,old.after,'Complete qualified a65 English output, only new German root added');assert.deepEqual(fresh.inputAfter,old.inputAfter);
  }
  const closeSource=members.get('german-close'),oldClose=closeSource.closed;
  const close=advance('german-close',oldClose.before,{seed:0,clock:CLOCK,draws:oldClose.draws,finalLcgState:oldClose.finalLcgState});
  const q=qualification(oldClose.before,close.after),oldNormalized=clone(close.after);delete oldNormalized.germanSupercupQualification;
  write('german-close-agreement.json',{qualification:q,actual:close.after.germanSupercupQualification,normalized:oldNormalized,oldOutput:oldClose.after});
  assert.deepEqual(oldNormalized,oldClose.after,'Complete retained qualifying close, only new German root added');assert.deepEqual(close.after.germanSupercupQualification,q.expected);
  assert.equal(q.expected.qualifyingYear,2029);assert.equal(q.expected.eventYear,2030);assert.equal(q.expected.seed,4272396692);
  assert.deepEqual(q.expected.entrants.map(item=>item.club),['Bayern Munich','Leverkusen']);
  function registered(clubName,skill) {
    const state=clone(close.after),edits=[],club=api.engine.FALLBACK_CLUBS.find(value=>same(value.name,clubName));assert(club&&club.country==='Germany');
    for(const [field,value] of Object.entries({phase:'playing',currentClub:club.name,currentClubCountry:club.country,currentClubTier:club.tier,currentClubColor:club.color,currentLeague:club.league}))change(state,edits,[field],value);
    if(skill===99){for(const field of ['pace','shooting','passing','dribbling','defending','physical','reflexes'])change(state,edits,[field],99);change(state,edits,['overall'],api.engine.calcOverall(state,state.position));}
    assert.deepEqual(inverse(state,edits),close.after);
    write('registration-'+clubName.replaceAll(' ','_')+'-'+skill+'.json',{scope:'Explicit consumer-phase/current-club tuple and optional predeclared99 selection lab, not a played transfer/development year.',edits,before:close.after,after:state,inverseExact:true});
    return state;
  }
  const team=result=>{const copy=clone(result);delete copy.player;delete copy.annualRating;return copy;};
  function playProfiles(skill) {
    return q.expected.entrants.map(entrant=>{
      const input=registered(entrant.club,skill),run=advance('german-'+skill+'-'+entrant.club.replaceAll(' ','_')+'-present',input);
      const row=run.after.seasons.at(-1),result=api.extra.readGermanSupercup(row);
      assert(result&&api.extra.germanSupercupPlayerSide(result)!==null);assert.equal(row.year,2030);assert.deepEqual(result.qualification,q.expected);
      return {club:entrant.club,skill,input,run,result};
    });
  }
  const profiles85=playProfiles(85);assert.deepEqual(team(profiles85[0].result),team(profiles85[1].result));
  const hasSelectedWinner=rows=>rows.some(item=>item.result.player.selected&&item.result.player.apps===1&&item.result.player.title);
  let chosen=profiles85;
  if(!hasSelectedWinner(chosen)){chosen=playProfiles(99);for(let i=0;i<2;i++)assert.deepEqual(team(chosen[i].result),team(profiles85[i].result),'Selection lab cannot change team outcome');}
  assert(hasSelectedWinner(chosen),'Stop, no actual selected winner from the two predeclared profiles');
  const chosenSkill=chosen[0].skill,pairs=[];
  for(const item of chosen) {
    const absentInput=clone(item.input);delete absentInput.germanSupercupQualification;
    const absent=advance('german-'+chosenSkill+'-'+item.club.replaceAll(' ','_')+'-absent',absentInput),present=item.run;
    const row=present.after.seasons.at(-1),annual=absent.after.seasons.at(-1),result=api.extra.readGermanSupercup(row);
    assert.deepEqual(present.draws,absent.draws);assert.equal(present.finalLcgState,absent.finalLcgState);
    assert.equal(Object.hasOwn(annual,'germanSupercup'),false);
    assert.deepEqual(api.extra.careerOpeningAnnualStats(row),five(annual));assert.deepEqual(api.extra.germanSupercupSeasonStats(five(annual),result),five(row));
    const normalized=clone(present.after),normalizedRow=normalized.seasons.at(-1),normalizations=[];
    delete normalizedRow.germanSupercup;for(const field of Object.keys(five(annual)))normalizedRow[field]=annual[field];
    normalizations.push('Latest row: only German result and five annual stats');
    if(present.after.pendingSummary?.year===row.year&&same(present.after.pendingSummary.club,row.club)) {
      assert.deepEqual(present.after.pendingSummary,row);normalized.pendingSummary=clone(annual);
      normalizations.push('The actual owned pendingSummary mirror');
    }
    if(row.injurySevere&&annual.injurySevere) {
      const presentOwn=Object.hasOwn(item.input,'germanSupercupQualification'),absentOwn=Object.hasOwn(absentInput,'germanSupercupQualification');
      assert.equal(Object.hasOwn(present.after,'germanSupercupQualification'),presentOwn);assert.equal(Object.hasOwn(absent.after,'germanSupercupQualification'),absentOwn);
      if(presentOwn)assert.deepEqual(present.after.germanSupercupQualification,item.input.germanSupercupQualification);
      if(absentOwn)assert.deepEqual(absent.after.germanSupercupQualification,absentInput.germanSupercupQualification);
      if(absentOwn)normalized.germanSupercupQualification=clone(absent.after.germanSupercupQualification);else delete normalized.germanSupercupQualification;
      normalizations.push('Severe branch: input root presence/value held in each arm; only that input carry normalized');
    }
    const key=api.binding.soccerSeasonKey(present.after.playerName,row),absentKey=api.binding.soccerSeasonKey(absent.after.playerName,annual);
    const plan=api.season.deriveSeason(api.binding.SOCCER,row,api.binding.buildSoccerSeasonCtx(present.after,api.engine.FALLBACK_CLUBS,row));
    const absentPlan=api.season.deriveSeason(api.binding.SOCCER,annual,api.binding.buildSoccerSeasonCtx(absent.after,api.engine.FALLBACK_CLUBS,annual));
    write('pair-'+item.club.replaceAll(' ','_')+'.json',{normalized,absent:absent.after,normalizations,annual:five(annual),final:five(row),result,key,absentKey,plan,absentPlan,sameMainstreamDraws:true});
    assert.deepEqual(normalized,absent.after,'Complete normalized present/absent career, no other field allowance');
    assert(key);assert.equal(key,absentKey);assert(plan);assert.deepEqual(plan,absentPlan);
    pairs.push({...item,absent,key,plan});
  }
  assert.equal(actions.length,chosenSkill===85?7:9);
  const winner=pairs.find(item=>item.result.player.title),other=pairs.find(item=>item!==winner);
  assert(winner&&other&&!other.result.player.title);
  write('capture-summary.json',{scope:'Fixed7 public advances or9 only for the single predeclared99 selection profile. No seed/name search or full UI season.',
    completedCalls:actions.length,chosenSkill,unused85PresentRetained:chosenSkill===99,
    cases:actions.map(item=>({label:item.label,seed:item.seed,clock:item.clock,draws:item.draws.length,drawsSha256:hashJSON(item.draws),finalLcgState:item.finalLcgState}))});
  const prepared=[];
  for(const id of ['win','bench','loss']) {
    const source=id==='loss'?other:winner,original=source.run.after,state=clone(original),edits=[];
    change(state,edits,['phase'],'playing');
    if(id==='bench') {
      const at=state.seasons.length-1,row=state.seasons[at],annual=api.extra.careerOpeningAnnualStats(row);
      assert(annual);write('bench-annual-before-lab.json',{annual,row:clone(row),absentAnnual:source.absent.after.seasons.at(-1)});
      for(const [field,value] of Object.entries(annual))change(state,edits,['seasons',at,field],value);
      for(const field of ['apps','leagueApps','goals','assists','cleanSheets','yellowCards','redCards','rating'])change(state,edits,['seasons',at,field],0);
      for(const field of ['leagueTitle','domesticCup','championsLeague','worldCup','ballonDor','continentalCup'])if(Object.hasOwn(row,field))change(state,edits,['seasons',at,field],false);
      change(state,edits,['seasons',at,'ballonDorRank'],null);
      for(const field of ['leagueFinish','leagueSize','clubCupTitle'])if(Object.hasOwn(row,field))change(state,edits,['seasons',at,field],null,true);
      if(row.derbies)change(state,edits,['seasons',at,'derbies'],row.derbies.map(derby=>({...derby,meetings:derby.meetings.map(meeting=>({...meeting,played:false,goals:0}))})));
      change(state,edits,['seasons',at,'germanSupercup','annualRating'],0);
      change(state,edits,['seasons',at,'germanSupercup','player'],{...row.germanSupercup.player,availability:'unknown',reason:'Explicit saved-result unavailability lab',
        selected:false,apps:0,goals:0,assists:0,cleanSheets:0,rating:null,title:false});
      assert(original.pendingSummary?.year===row.year&&same(original.pendingSummary.club,row.club),'Bench source owns pending summary');
      change(state,edits,['pendingSummary'],clone(row));
      assert.deepEqual(row.leagueWorld,original.seasons.at(-1).leagueWorld);assert.equal(api.league.readLeagueFinish(row),null);
      assert(api.world.readLeagueWorldSeason(row));assert.deepEqual(row.extraCups,original.seasons.at(-1).extraCups);
    }
    write(id+'.original.json',original);write(id+'.state.json',state);
    write(id+'.lab.json',{scope:id==='bench'?'Explicit reversible zero-annual-app/unavailability saved-result lab, not naturally observed bench/injury.':'Actual public action and explicit playing consumer-phase lab, not a UI-played transfer/year.',
      sourceClub:source.club,sourceSkill:chosenSkill,edits,inverse:inverse(state,edits),completeInverse:isDeepStrictEqual(inverse(state,edits),original)});
    assert.deepEqual(inverse(state,edits),original);assert.equal(api.save.isSoccerCareerSave(state),true);
    const row=state.seasons.at(-1),result=api.extra.readGermanSupercup(row);assert(result&&api.extra.germanSupercupPlayerSide(result)!==null);
    const repaired=dto(api.engine.repairCareer(clone(state)));write(id+'.repair.json',{before:state,after:repaired});
    assert.deepEqual(repaired,state,'Stop and retain any invalid optional ledger or silent repair, no extra fixture edits');
    assert.deepEqual(team(result),team(source.result));assert.equal(result.player.title,id==='win');
    assert.equal(api.extra.countGermanSupercups(state.seasons),id==='win'?1:0);
    const annual=api.extra.careerOpeningAnnualStats(row),key=api.binding.soccerSeasonKey(state.playerName,row);
    assert(annual);assert.equal(key===null,id==='bench');
    const plan=key?api.season.deriveSeason(api.binding.SOCCER,row,api.binding.buildSoccerSeasonCtx(state,api.engine.FALLBACK_CLUBS,row)):null;
    if(id!=='bench')assert.deepEqual(plan,source.plan);
    const competitions=api.competitions.savedSeasonCompetitions(state,row),cup=competitions.find(item=>item.id==='german-supercup');
    assert(cup&&cup.matches.length===1);assert.equal(cup.matches[0].home,undefined);assert.equal(cup.matches[0].neutral,undefined);
    const opening=api.calendar.cupCalendar(competitions,34).find(game=>game.id==='german-supercup:0');
    assert(opening&&opening.afterLeague===0&&opening.previous===null);
    const serialized=api.save.serializeSoccerCareerSave(state),decoded=api.save.parseSoccerCareerSave(serialized);
    assert.deepEqual(decoded,state);assert.equal(api.save.isSoccerCareerSave(decoded),true);assert.deepEqual(api.extra.readGermanSupercup(decoded.seasons.at(-1)),result);
    fs.writeFileSync(path.join(out,id+'.save.txt'),serialized,{flag:'wx'});
    const oracle={id,sourceId:source.club,label:row.year+'/'+String(row.year+1).slice(-2)+' · '+row.club,playerName:state.playerName,club:row.club,year:row.year,
      score:result.score,penalties:result.penalties??null,decidedBy:result.decidedBy,winner:result.winner,playerScore:[cup.matches[0].goalsFor,cup.matches[0].goalsAgainst],
      opponent:cup.matches[0].opponent,result:cup.result,note:cup.matches[0].note,playerGoals:result.player.goals,selected:result.player.selected,playerTitle:result.player.title,
      germanCount:api.extra.countGermanSupercups(state.seasons),shieldCount:api.extra.countCommunityShields(state.seasons),totals:api.engine.getCareerTotals(state.seasons),
      apps:row.apps,leagueApps:row.leagueApps,annual,leagueKey:key,leaguePlan:plan,leaguePlanSha256:hashJSON(plan),collectiveLeagueAvailable:api.world.readLeagueWorldSeason(row)!==null,
      englishRootSha256:hashJSON(state.extraCupQualification??null),germanRootSha256:hashJSON(state.germanSupercupQualification??null),
      englishResultSha256:hashJSON(row.extraCups??null),germanResultSha256:hashJSON(row.germanSupercup),
      serializedSha256:sha(Buffer.from(serialized)),serializedBytes:Buffer.byteLength(serialized),seasonsSha256:hashJSON(state.seasons)};
    write(id+'.expected.json',oracle);
    prepared.push({id,saveFile:id+'.save.txt',stateFile:id+'.state.json',labFile:id+'.lab.json',oracleFile:id+'.expected.json',originalFile:id+'.original.json',sourceAction:source.run.label,oracle});
  }
  manifest={schema:1,scope:'Three actual-App saves from fixed public actions, complete old English output parity, same-close German qualification and explicit reversible consumer/bench labs. No natural transfer, bench, real fixture, calibration or full UI year claim.',
    prepared,capturedSource:inputReceipts,capture:{completedCalls:actions.length,chosenSkill,cases:actions.map(item=>({label:item.label,draws:item.draws.length,drawsSha256:hashJSON(item.draws),finalLcgState:item.finalLcgState}))},
    sourceInputs:receipts(),browserClocksAndRandom:'Native and unmodified; only preparation public actions use fixed captured clock/LCG.'};
  write('manifest.json',manifest);
} catch (error) { primary = error; }
finally {
  try { for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(file), bytes, 'Held actual source: ' + file); write('source-holds.json', receipts()); } catch (error) { secondary.push({ name: error.name, message: error.message }); }
  try { write('storage-operations.json', { scope: 'Empty Node import compatibility only, no persistence claim', operations: storageOperations }); } catch (error) { secondary.push({ name: error.name, message: error.message }); }
  try { if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else delete globalThis.localStorage; } catch (error) { secondary.push({ name: error.name, message: error.message }); }
  try { write('receipt.json', { completed: !primary && secondary.length === 0, prepared: manifest?.prepared.length ?? 0, primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary }); } catch (error) { secondary.push({ name: error.name, message: error.message }); }
}
if (primary) throw primary;
assert.equal(secondary.length, 0, 'Fixture preparation holds failed');
console.log('SC_GERMAN_APP_PREP: fixed public actions, exact English/old-close parity, independent German qualification, complete paired careers and three admitted reversible App saves.');
