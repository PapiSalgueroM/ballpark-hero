// Remote-only complete saved-boundary component evidence, no browser or natural-career credit.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

assert(process.env.CI, 'Remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.SOCCER_LUTON_DISPLAY_OUT || 'historical-opponent-artifacts/proof');
assert(!fs.existsSync(OUT), 'A fresh proof folder preserves all earlier results'); fs.mkdirSync(OUT, { recursive: true });
const COMPONENT = 'src/components/soccer-career/SoccerSeasonCentre.tsx', UNIT = 'src/test/historicalOpponentLabels.test.ts';
const OBSERVER = 'scripts/qa/soccerHistoricalOpponentDisplayObserver.tsx', FIXTURE = 'scripts/data/careerLeagueWorldSaves1100.json';
const copy = value => JSON.parse(JSON.stringify(value)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ref = (name, value) => { const body = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value, null, 2)); const target = path.join(OUT, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, body); return { path: name, bytes: body.length, sha256: hash(body) }; };
const report = { status: 'running', identity: {head:process.env.GITHUB_SHA??null,runId:process.env.GITHUB_RUN_ID??null,attempt:process.env.GITHUB_RUN_ATTEMPT??null}, scope: 'Eight explicit fictional saved-boundary actual component cases, separate frozen eight pure units and exact copied Source/input/observation controls. No browser/pixel/natural/live claim.', processes: [], arms: [], controls: [], errors: [] };
const save = () => ref('report.json', report), errorText = error => String(error?.stack || error);
const subjects = [
  ['table-first','Luton display: normal first meeting'], ['table-return','Luton display: normal return meeting'],
  ['severe-first','Luton display: severe first meeting'], ['severe-return','Luton display: severe return meeting'],
  ['wrong-year','Luton display: wrong year refuses overlay'], ['wrong-league','Luton display: another league refuses overlay'],
  ['ambiguous-first','Luton display: ambiguous first meeting refuses overlay'], ['ambiguous-return','Luton display: ambiguous return meeting refuses overlay'],
];
const pins = [
  ['scripts/genCareerLeagueSeasons.mjs',10719,'0e66daf8402796a3e73710138e106a9e564d2f29f2b8e8fc6fa02908cd589ce7'],
  ['src/data/careerHistoricalOpponentDisplay.ts',499,'a3f4b8563daa776d921a1374430a5b2c3efcc0a5a389c97151ed56f34087999b'],
  ['src/lib/season/historicalOpponentLabels.ts',2490,'8c67960342059cbaa1d7860d821afdef8122a92fb33d3bee60d5400bbd7e26dc'],
  [COMPONENT,31496,'94c3c55e9d5c46a84c9c17a5d17713114bc14c0e94e26e03391b363ce7895ce2'],
  [UNIT,6038,'412887e712a58ca91ed56a8ea82ebbecd975a599380abc2726857e53b57d195a'],
];
const held = [...pins.map(row => row[0]), 'src/data/careerLeagueSeasons.ts', 'scripts/data/leagueSeasons/premier-league.json', FIXTURE, 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts', 'src/lib/soccerCareerLeague.ts', 'src/lib/season/core.ts', 'src/lib/season/soccer.ts', 'src/lib/season/soccerEvents.ts', 'src/lib/season/resume.ts', 'src/components/season-centre/resumeStore.ts', 'src/components/season-centre/SeasonCentre.tsx', 'src/components/season-centre/SeasonCentreHelp.tsx', 'src/components/season-centre/MatchClock.tsx', 'src/components/season-centre/MiniPitch.tsx', 'src/components/motion/RankShiftTable.tsx', 'src/components/club-manager/LeagueTableCard.tsx', 'src/test/setup.ts', 'vitest.config.ts', 'package.json', 'package-lock.json', 'scripts/lib/offlineTransport.cjs', OBSERVER, 'scripts/qa/soccerHistoricalOpponentDisplayProof.mjs'];
const source = stage => held.map(file => { const body = fs.readFileSync(path.join(ROOT, file)); return { file, ...ref(`source/${stage}/${file}`, body) }; });
const sourceIdentity = rows => rows.map(({ file, bytes, sha256 }) => ({ file, bytes, sha256 }));
const fileRows = folder => fs.readdirSync(folder,{withFileTypes:true}).flatMap(item => item.isDirectory() ? fileRows(path.join(folder,item.name)) : item.isFile() ? [path.join(folder,item.name)] : (()=>{throw new Error('Only regular evidence files and directories');})());
const typedDraws = draws => { assert(Array.isArray(draws)); for(const draw of draws) { assert.deepEqual(Object.keys(draw).sort(),['caller','phase','value']); assert.equal(typeof draw.value,'number'); assert(Number.isFinite(draw.value)&&draw.value>=0&&draw.value<1); assert.equal(typeof draw.caller,'string'); assert.equal(typeof draw.phase,'string'); } };
const componentCopy = path.join(ROOT, 'src/components/soccer-career', `__luton_component_${process.pid}.tsx`), testCopy = path.join(ROOT, 'src/test', `__luton_observer_${process.pid}.test.tsx`);
const owned = new Map();
const writeOwned = (target, body) => { assert(!fs.existsSync(target), 'Owned temporary path must be absent'); fs.writeFileSync(target, body, { flag: 'wx' }); owned.set(target, Buffer.from(body)); assert(fs.readFileSync(target).equals(owned.get(target))); };
const processRun = (id, args, env = {}) => {
  const argv=['--require',path.join(ROOT,'scripts/lib/offlineTransport.cjs'),...args];
  const row = { id, command: process.execPath, args:argv, cwd: ROOT, env, status: 'running' }; report.processes.push(row); save();
  const child = spawnSync(process.execPath, argv, { cwd: ROOT, env: { ...process.env, ...env }, maxBuffer: 100000000 });
  row.stdout = ref(`process/${id}/stdout.txt`, child.stdout || Buffer.alloc(0)); row.stderr = ref(`process/${id}/stderr.txt`, child.stderr || Buffer.alloc(0)); row.exit = child.status; row.signal = child.signal; row.error = child.error ? errorText(child.error) : null; row.status = 'closed'; save(); return row;
};
const dataFindings = row => {
  const out = [], eligible = ['table','severe'].includes(row.boundary);
  if (eligible) {
    if (row.view.fixtures.filter(item => item.name === 'Luton Town').length !== 2) out.push('fixture-display-binding');
    if (!row.view.scoreNames.includes('Luton Town')) out.push('match-display-binding');
    if (row.boundary === 'table' && row.view.table.filter(item => item.club === 'Luton Town').length !== 1) out.push('table-display-binding');
  } else if (row.model.names.includes('Luton Town') || row.view.fixtures.some(item => item.name === 'Luton Town') || row.view.table.some(item => item.club === 'Luton Town') || row.view.scoreNames.includes('Luton Town')) out.push('scope-refusal');
  return out;
};
const readFindings = witness => [witness.before.raw !== witness.after.raw && 'raw-save', JSON.stringify(witness.before.draws) !== JSON.stringify(witness.after.draws) && 'read-rng'].filter(Boolean);
const runtimeDiagnostics = (id, processRow, result, testFile, failed) => {
  const raw = fs.readFileSync(path.join(OUT,processRow.stdout.path)).toString('utf8')+'\n'+fs.readFileSync(path.join(OUT,processRow.stderr.path)).toString('utf8');
  const text = stripVTControlCharacters(raw), detect = value => /\b(?:Unhandled Errors|Unhandled Error|Unhandled Rejection|Failed Suites|Source Errors)\b/.test(value);
  const row = {id,status:'running',rawStdout:processRow.stdout,rawStderr:processRow.stderr,before:ref(`diagnostics/${id}/before.txt`,text),errors:[]};report.runtimeDiagnostics??=[];report.runtimeDiagnostics.push(row);save();
  try {
    assert.equal(result.testResults.length,1);const file=result.testResults[0];assert.equal(file.name,testFile);assert.equal(file.message,'');assert.equal(file.status,failed?'failed':'passed');
    row.beforeFindings=detect(text)?['vitest-runtime-diagnostic']:[];save();assert.deepEqual(row.beforeFindings,[],'No unrelated runtime or failed-suite diagnostic');
    const banner='\nUnhandled Errors\n', fault=text+banner;row.fault=ref(`diagnostics/${id}/fault.txt`,fault);row.faultFindings=detect(fault)?['vitest-runtime-diagnostic']:[];save();assert.notEqual(fault,text);assert.deepEqual(row.faultFindings,['vitest-runtime-diagnostic']);
    assert(fault.endsWith(banner));const undo=fault.slice(0,-banner.length);row.undo=ref(`diagnostics/${id}/undo.txt`,undo);row.undoFindings=detect(undo)?['vitest-runtime-diagnostic']:[];row.actualSameFaultReversed=true;save();assert.equal(undo,text);assert.deepEqual(row.undoFindings,[]);row.status='pass';save();
  }catch(error){row.status='fail';row.errors.push(errorText(error));save();throw error;}
};
const copiedControl = (id, value, mutate, reverse, detector, wanted) => {
  const before=copy(value), row={id,status:'running',before:ref(`controls/${id}/before.json`,before),errors:[]};report.controls.push(row);save();
  let applied=false;
  try { row.mutations=mutate(value);applied=true;row.fault=ref(`controls/${id}/fault.json`,value);row.findings=detector(value);save();assert.notDeepEqual(value,before);assert.deepEqual(row.findings,wanted); }
  catch(error){row.errors.push({stage:'fault',error:errorText(error)});}
  finally { if(applied)try{reverse(value,row.mutations);row.undo=ref(`controls/${id}/undo.json`,value);row.undoFindings=detector(value);row.actualSameFaultReversed=true;save();assert.deepEqual(value,before);assert.deepEqual(row.undoFindings,[]);}catch(error){row.errors.push({stage:'undo',error:errorText(error)});}row.status=row.errors.length===0&&row.actualSameFaultReversed?'pass':'fail';save(); }
  if(row.status!=='pass')report.errors.push({control:id,errors:row.errors});return row;
};
const captureArm = (id, alias, expectedFailureIds) => {
  const folder = path.join(OUT,'arms',id), observations = path.join(folder,'observations'), output = path.join(folder,'vitest.json'); fs.mkdirSync(observations,{recursive:true});
  const row = { id, status:'running', expectedFailureIds, records:[], errors:[] }; report.arms.push(row); save();
  try {
    const env = { SOCCER_LUTON_ARM:id, SOCCER_LUTON_OBSERVATIONS:observations, SOCCER_LUTON_FIXTURES:path.join(OUT,'fixtures.json'), NO_DOUBLE_SWAP:alias ? JSON.stringify({ '@/components/soccer-career/SoccerSeasonCentre':alias }) : '' };
    row.process = processRun(id,[path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',testCopy,'--no-cache','--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json',`--outputFile=${output}`],env);
    row.observationFiles = fileRows(observations).map(file=>{const body=fs.readFileSync(file);return {file:path.relative(observations,file).split(path.sep).join('/'),bytes:body.length,sha256:hash(body)};});
    if (fs.existsSync(output)) row.vitest = ref(`arms/${id}/vitest-retained.json`,fs.readFileSync(output));
    for (const [subject] of subjects) if (fs.existsSync(path.join(observations,`${subject}.json`))) row.records.push(ref(`arms/${id}/observations/${subject}.json`,fs.readFileSync(path.join(observations,`${subject}.json`))));
    if (fs.existsSync(path.join(observations,'full-global-draws.json'))) row.fullGlobalDraws=ref(`arms/${id}/full-global-draws.json`,fs.readFileSync(path.join(observations,'full-global-draws.json'))); save();
    assert(row.vitest && row.fullGlobalDraws); const result=JSON.parse(fs.readFileSync(output)), assertions=result.testResults.flatMap(file=>file.assertionResults); row.assertions=ref(`arms/${id}/assertions.json`,assertions); save();
    runtimeDiagnostics(id,row.process,result,testCopy,expectedFailureIds.length>0);
    assert.equal(result.numTotalTests,8); assert.equal(result.numPendingTests,0); assert.equal(result.numTodoTests,0); assert.deepEqual(assertions.map(item=>item.title).sort(),subjects.map(item=>item[1]).sort());
    const expectedTitles=expectedFailureIds.map(subject=>subjects.find(item=>item[0]===subject)[1]); assert.deepEqual(assertions.filter(item=>item.status==='failed').map(item=>item.title).sort(),expectedTitles.sort());
    assert.equal(result.numFailedTests,expectedFailureIds.length); assert.equal(result.numPassedTests,8-expectedFailureIds.length); assert.equal(row.process.exit,expectedFailureIds.length?1:0); assert.equal(row.process.signal,null); assert.equal(row.process.error,null);
    assert.deepEqual(row.observationFiles.map(item=>item.file).sort(),[...subjects.map(([subject])=>`${subject}.json`),'full-global-draws.json'].sort());
    typedDraws(JSON.parse(fs.readFileSync(path.join(observations,'full-global-draws.json'))));
    assert.equal(row.records.length,8); row.actual=[];
    for (let index=0;index<subjects.length;index++) { const record=JSON.parse(fs.readFileSync(path.join(observations,`${subjects[index][0]}.json`))); row.actual.push(record); save();
      assert.equal(record.id,subjects[index][0]); assert.equal(record.title,subjects[index][1]); assert.equal(record.inputBefore,record.inputAfter); assert.equal(record.rawAfter,record.inputBefore);
      assert.equal(record.status,expectedFailureIds.includes(record.id)?'fail':'pass'); assert.deepEqual(record.findings,dataFindings(record)); assert.deepEqual(record.findings,expectedFailureIds.includes(record.id)?['table-display-binding']:[]);
      assert.equal(record.errors.length,expectedFailureIds.includes(record.id)?1:0);if(expectedFailureIds.includes(record.id)){assert.equal(record.errors[0].name,'AssertionError');assert(record.errors[0].message.includes(`LUTON_COMPONENT_${record.id}`));}
      assert.deepEqual(record.reads.map(interval=>interval.id),['fixtures','actual-match','names-and-table']); typedDraws(record.loaded.draws);typedDraws(record.draws);
      for (const interval of record.reads) { typedDraws(interval.before.draws);typedDraws(interval.after.draws);assert.equal(interval.error,undefined); assert.deepEqual(interval.findings,[]); assert.deepEqual(readFindings(interval),[]); }
      for (const input of record.ambiguity) { assert.equal(input.status,'pass'); assert.equal(input.actualSameFaultReversed,true); assert.notEqual(input.beforeRaw,input.faultRaw); assert.equal(input.undoRaw,input.beforeRaw); assert.equal(input.refused,true); const before=JSON.parse(input.beforeRaw),fault=JSON.parse(input.faultRaw);assert(Number.isInteger(input.changedSlot)&&input.changedSlot>0);assert.equal(before.labels[input.changedSlot].named,true);assert.deepEqual(fault.labels[input.changedSlot],{name:'another club',named:false,key:`copied-ambiguity-${input.changedSlot}`});fault.labels[input.changedSlot]=copy(before.labels[input.changedSlot]);assert.deepEqual(fault,before); }
      if (record.boundary==='ambiguous') assert(record.ambiguity.length>0); else assert.equal(record.ambiguity.length,0);
      assert.deepEqual(record.view.fixtures.map(item=>item.md),record.base.games.map(game=>game.md));assert.deepEqual(record.view.fixtures.map(item=>item.name),record.base.games.map(game=>record.model.names[game.opp]));
      assert.deepEqual(record.view.scoreNames,record.target.home?[record.fixture.career.seasons[0].club,record.model.names[record.target.opp]]:[record.model.names[record.target.opp],record.fixture.career.seasons[0].club]);
      assert.deepEqual(record.view.table.map(item=>[item.cells[0],...item.cells.slice(2)]),record.renderedTableExpected.map(item=>item.numericCells));assert.equal(record.view.table.length,record.base.mode==='table'?record.base.teams:0);
      assert.deepEqual(record.numericTableBefore,record.numericTableAfter); assert.equal(record.rawCallerEqualityAcrossArmsClaim,false);
      const assertion=assertions.find(item=>item.title===record.title); if (expectedFailureIds.includes(record.id)) assert(assertion.failureMessages.length>0&&assertion.failureMessages.every(message=>message.includes(`LUTON_COMPONENT_${record.id}`))); else assert.deepEqual(assertion.failureMessages,[]);
    }
    row.actualRows=ref(`arms/${id}/all-records.json`,row.actual); delete row.actual; row.status='pass'; save(); return row;
  } catch(error) { row.status='fail'; row.errors.push(errorText(error)); report.errors.push({arm:id,error:errorText(error)}); save(); return row; }
};
try {
  assert(!process.env.NO_DOUBLE_SWAP,'No inherited subject alias'); report.sourceBefore=source('before');
  for(const [file,length,wanted]of pins){const raw=fs.readFileSync(path.join(ROOT,file)).toString('utf8').replaceAll('\r\n','\n');assert.equal(Buffer.byteLength(raw),length);assert.equal(hash(Buffer.from(raw)),wanted);}
  const oldLedger=fs.readFileSync(path.join(ROOT,'src/data/careerLeagueSeasons.ts')); report.oldLedger=ref('source/old-careerLeagueSeasons.ts',oldLedger); assert.equal(hash(Buffer.from(oldLedger.toString('utf8').replaceAll('\r\n','\n'))),'3346772b1c61a0d46dabd7191ec4d021f76a6c9089dc35d0814d3a0432cf3c33');
  const generator=processRun('generator-check',['scripts/genCareerLeagueSeasons.mjs','--check']); assert.equal(generator.exit,0); assert.equal(generator.signal,null); assert.equal(generator.error,null); assert(oldLedger.equals(fs.readFileSync(path.join(ROOT,'src/data/careerLeagueSeasons.ts'))));
  const rawFixture=fs.readFileSync(path.join(ROOT,FIXTURE)); report.fixtureSource=ref('source/full-fixtures.json',rawFixture); const candidates=JSON.parse(rawFixture).saves.filter(row=>row.id==='ere'); assert.equal(candidates.length,1);
  const fixtures=[]; for(const id of ['table','severe','wrong-year','wrong-league','ambiguous']) { const career=copy(candidates[0].state), before=copy(career), severe=id==='severe', year=id==='wrong-year'?2024:2023, club=id==='wrong-league'?'Ajax':'Arsenal';
    const season={year,age:26,club,clubCountry:id==='wrong-league'?'Netherlands':'England',clubTier:1,apps:severe?14:32,leagueApps:severe?14:30,goals:severe?4:10,assists:severe?3:6,cleanSheets:0,yellowCards:2,redCards:0,rating:7.2,injury:severe?'ACL':null,injuryWeeks:severe?28:0,injurySevere:severe,leagueTitle:!severe,leagueFinish:severe?undefined:1,leagueSize:severe?undefined:id==='wrong-league'?18:20,domesticCup:false,championsLeague:false,worldCup:false,ballonDor:false,ballonDorRank:null,type:'playing',intApps:0,intGoals:0,intAssists:0,intRating:0,tournament:null,tournamentResult:null};
    career.playerName='Display fixture';career.position='ST';career.phase='playing';career.seasons=[season];career.awards=[];career.phone={...career.phone,world:{year,leagues:{},ucl:''}};delete career.seasonMoments;
    fixtures.push({id,scope:'Deliberate fictional saved boundary, not factual season or player statistics',before,career}); }
  report.fixtures=ref('fixtures.json',fixtures);
  const unitOutput=path.join(OUT,'units.json'), unit=processRun('pure-eight-units',[path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',UNIT,'--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json',`--outputFile=${unitOutput}`]);
  if(fs.existsSync(unitOutput))report.unit=ref('units-retained.json',fs.readFileSync(unitOutput)); save(); assert.equal(unit.exit,0);assert.equal(unit.signal,null);assert.equal(unit.error,null); assert(report.unit); const unitResult=JSON.parse(fs.readFileSync(unitOutput)); assert.equal(unitResult.numTotalTests,8);assert.equal(unitResult.numPassedTests,8);assert.equal(unitResult.numFailedTests,0);assert.equal(unitResult.numPendingTests,0);assert.equal(unitResult.numTodoTests,0);
  runtimeDiagnostics('pure-eight-units',unit,unitResult,path.join(ROOT,UNIT),false);
  const unitTitles=['contains only the checked Luton membership and preserves the old ledger','names the unique slot after real derivation, severe=false','names the unique slot after real derivation, severe=true','rejects another year, league, own club or nonplaying row','refuses multiple unnamed slots and keeps every nonlabel value','refuses a mismatch between the unused member and the unnamed slot','refuses foreign or duplicate named members','refuses a wrong frame or a fixture stream without every opponent slot'];
  const unitAssertions=unitResult.testResults.flatMap(file=>file.assertionResults);report.unitAssertions=ref('unit-assertions.json',unitAssertions);save();assert.deepEqual(unitAssertions.map(item=>item.title).sort(),unitTitles.sort());assert(unitAssertions.every(item=>item.status==='passed'&&item.failureMessages.length===0));
  const observer=fs.readFileSync(path.join(ROOT,OBSERVER));report.observer=ref('source/observer.tsx',observer);writeOwned(testCopy,observer);
  const current=fs.readFileSync(path.join(ROOT,COMPONENT)), from='season: historical ? { ...s, labels: historical.labels } : s,',to='season: s,';
  const text=current.toString('utf8');assert.equal(text.split(from).length-1,1);const fault=Buffer.from(text.replace(from,to));assert(!fault.equals(current));report.bindingSourceControl={before:ref('controls/table-binding/before.tsx',current),fault:ref('controls/table-binding/fault.tsx',fault),from,to};writeOwned(componentCopy,current);
  const currentArm=captureArm('current',componentCopy,[]);
  assert(fs.readFileSync(componentCopy).equals(current));fs.writeFileSync(componentCopy,fault);owned.set(componentCopy,fault);assert(fs.readFileSync(componentCopy).equals(fault));
  const originalArm=captureArm('original-table-binding',componentCopy,['table-first','table-return']);
  assert(fs.readFileSync(componentCopy).equals(fault));const changedText=fs.readFileSync(componentCopy).toString('utf8');assert.equal(changedText.split(to).length-1,1);const reversed=Buffer.from(changedText.replace(to,from));assert(reversed.equals(current));fs.writeFileSync(componentCopy,reversed);owned.set(componentCopy,reversed);report.bindingSourceControl.undo=ref('controls/table-binding/undo.tsx',fs.readFileSync(componentCopy));save();
  const undoArm=captureArm('whole-undo',componentCopy,[]);assert(report.arms.every(row=>row.status==='pass'));
  const load=arm=>JSON.parse(fs.readFileSync(path.join(OUT,arm.actualRows.path)));const currentRows=load(currentArm),faultRows=load(originalArm),undoRows=load(undoArm);
  report.comparisons=[];for(let index=0;index<subjects.length;index++){const a=currentRows[index],b=faultRows[index],u=undoRows[index],comparison={id:a.id,status:'running',current:currentArm.records[index],fault:originalArm.records[index],undo:undoArm.records[index]};report.comparisons.push(comparison);save();
    assert.equal(a.inputBefore,b.inputBefore);assert.equal(a.inputBefore,u.inputBefore);assert.deepEqual(a.model,u.model);assert.deepEqual(a.modelUnsupportedFields,u.modelUnsupportedFields);assert.deepEqual(a.modelUnsupportedFields,b.modelUnsupportedFields);assert.deepEqual(a.view,u.view);assert.deepEqual(a.numericTableBefore,b.numericTableBefore);assert.deepEqual(a.numericTableAfter,b.numericTableAfter);
    const expected=copy(b.model);if(['table','severe'].includes(a.boundary)){assert.deepEqual(a.model.season.labels[a.targetSlot],{name:'Luton Town',named:true,key:'Luton Town'});assert.deepEqual(b.model.season.labels[a.targetSlot],b.base.labels[b.targetSlot]);expected.season.labels[a.targetSlot]=copy(a.model.season.labels[a.targetSlot]);}assert.deepEqual(expected,a.model);assert.deepEqual(a.model.names,b.model.names);assert.deepEqual(a.view.fixtures,b.view.fixtures);assert.deepEqual(a.view.scoreNames,b.view.scoreNames);
    for(const actual of [a,b,u])for(let position=0;position<actual.view.table.length;position++){const label=actual.model.season.labels[actual.renderedTableExpected[position].slot],rendered=actual.view.table[position];assert.equal(rendered.club,label.key);assert.equal(rendered.cells[1],label.named?label.name:'another club');}
    comparison.rawCallerEqualityClaim=false;comparison.status='pass';save(); }
  copiedControl('scope-refusal-copy',copy(currentRows.find(row=>row.id==='wrong-year')),value=>{assert.notEqual(value.model.names[1],'Luton Town');assert.notEqual(value.view.scoreNames[0],'Luton Town');const changes=[{container:'model.names',key:1,before:value.model.names[1]},{container:'view.scoreNames',key:0,before:value.view.scoreNames[0]}];value.model.names[1]='Luton Town';value.view.scoreNames[0]='Luton Town';return changes;},(value,changes)=>{for(const change of changes)(change.container==='model.names'?value.model.names:value.view.scoreNames)[change.key]=change.before;},dataFindings,['scope-refusal']);
  copiedControl('read-purity-copy',copy(currentRows[0].reads.find(row=>row.id==='fixtures')),value=>{assert.equal(typeof value.after.raw,'string');assert(Array.isArray(value.after.draws));const changes={raw:value.after.raw,drawCount:value.after.draws.length,appended:{value:.25,caller:'labelled copied observation only',phase:'copied-control'}};value.after.raw+=' ';value.after.draws.push(changes.appended);return changes;},(value,changes)=>{assert.equal(value.after.raw,changes.raw+' ');assert.equal(value.after.draws.length,changes.drawCount+1);assert.deepEqual(value.after.draws.at(-1),changes.appended);value.after.raw=value.after.raw.slice(0,-1);value.after.draws.pop();},readFindings,['raw-save','read-rng']);save();
}catch(error){report.errors.push({stage:'proof',error:errorText(error)});}
finally{
  for(const [target,wanted]of owned){try{const actual=fs.readFileSync(target);report.temporarySources??=[];report.temporarySources.push({path:target,body:ref(`source/temporary/${path.basename(target)}`,actual)});assert(actual.equals(wanted),'Do not delete an unknown temporary Source');fs.unlinkSync(target);}catch(error){report.errors.push({stage:'owned-cleanup',path:target,error:errorText(error)});}}
  try{report.sourceAfter=source('after');assert.deepEqual(sourceIdentity(report.sourceAfter),sourceIdentity(report.sourceBefore));report.wholeSourceHeld=true;}catch(error){report.errors.push({stage:'source-after',error:errorText(error)});}
  report.status=report.errors.length===0&&report.arms.length===3&&report.arms.every(row=>row.status==='pass')&&report.comparisons?.length===8&&report.comparisons.every(row=>row.status==='pass')&&report.controls.length===2&&report.controls.every(row=>row.status==='pass')&&report.runtimeDiagnostics?.length===4&&report.runtimeDiagnostics.every(row=>row.status==='pass')&&report.wholeSourceHeld?'pass':'fail';save();
  try{const files=fileRows(OUT).sort().map(file=>{const body=fs.readFileSync(file);return {path:path.relative(OUT,file).split(path.sep).join('/'),bytes:body.length,sha256:hash(body)};});ref('physical-body-vector.json',{scope:'All proof files before this standalone vector, including final report. This vector has no recursive self hash. Outer workflow independently measures every physical payload file and its caps.',files});}catch(error){report.errors.push({stage:'physical-vector',error:errorText(error)});report.status='fail';save();}
}
console.log(`Luton component arms: ${report.arms.filter(row=>row.status==='pass').length}/3.`);console.log(`Luton copied observation controls: ${report.controls.length}/2.`);console.log(`${report.status==='pass'?'PASS':'FAIL'} Luton display component proof`);if(report.status!=='pass')process.exitCode=1;
