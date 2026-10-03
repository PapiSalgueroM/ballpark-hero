/* Actual CFB recruiting filters, original generated-state signing and refusal baseline.
   CFB_RECRUIT_FILTER_CONTROL=unfilter|resave mutates asserted disposable copies only. */
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm,rmdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),control=process.env.CFB_RECRUIT_FILTER_CONTROL||'';
const independent='holds independent original signing and refusal effects without targeting';
const controls={
  unfilter:{test:'combines position and inclusive star threshold across both boards in source order',anchor:'const matchesFilters = (r: Rc) => (!positionFilter || r.pos === positionFilter) && (!starFilter || r.stars >= Number(starFilter));',replacement:'const matchesFilters = () => true;'},
  resave:{test:'does not save, regenerate, mutate pools or expose hidden ability while filtering',anchor:'onChange={e => setPositionFilter(e.target.value)}',replacement:"onChange={e => { setPositionFilter(e.target.value); persist(st, 'recruit', recruits, portal); }}"},
};
assert.ok(!control||Object.hasOwn(controls,control),'Known CFB recruiting control');
/* Round 912: the filters live in the shared college board now, which CFB Dynasty's board hands its sport;
   the controls rewrite a copy of that file and point its alias at the copy. Both files are held to their bytes. */
const boardFile='src/components/college-dynasty/CollegeDynastyBoard.tsx',parity=[];
for(const f of[boardFile,'src/components/cfb-dynasty/CfbDynastyBoard.tsx','src/test/cfbRecruitFilters.test.tsx','src/lib/cfbDynasty.ts','src/lib/collegeProgram.ts','src/hooks/useGameCompletion.ts','src/lib/completions.ts','src/components/game/ShareButtons.tsx']){const raw=await readFile(path.join(root,f));parity.push(()=>readFile(path.join(root,f)).then(current=>assert.deepEqual(current,raw,'Held original bytes '+f)))}
const board=(await readFile(path.join(root,boardFile),'utf8')).replace(/\r\n/g,'\n');
let folder;const owned=[];
try{
 await mkdir(path.join(root,'.sim-control'),{recursive:true});folder=await mkdtemp(path.join(root,'.sim-control/cfb-recruit-'));
 const reportFile=path.join(folder,'report.json');owned.push(reportFile);
 const env={...process.env,FORCE_COLOR:'0',DEBUG_PRINT_LIMIT:'1200'};delete env.NO_DOUBLE_SWAP;
 const args=[path.join(root,'node_modules/vitest/vitest.mjs'),'run','src/test/cfbRecruitFilters.test.tsx','--reporter=verbose','--reporter=json','--outputFile.json='+reportFile,'--maxWorkers=1','--no-file-parallelism'];
 if(control){const spec=controls[control];assert.equal(board.split(spec.anchor).length-1,1,'Unique actual control binding');const changed=board.replace(spec.anchor,spec.replacement);assert.notEqual(changed,board,'Actual copied source changed');const copy=path.join(folder,'CollegeDynastyBoard.tsx');owned.push(copy);await writeFile(copy,changed);env.NO_DOUBLE_SWAP=JSON.stringify({'@/components/college-dynasty/CollegeDynastyBoard':copy});args.push('--testNamePattern',spec.test+'|'+independent)}
 const run=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024}),output=(run.stdout||'')+'\n'+(run.stderr||'');process.stdout.write(output);
 assert.ok(!run.error&&!run.signal,'Runner must finish normally');assert.doesNotMatch(output,/Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/,'Runner faults earn no credit');
 const report=JSON.parse(await readFile(reportFile,'utf8')),rows=report.testResults.flatMap(r=>r.assertionResults);assert.equal(rows.length,8);assert.equal(Number(report.numUnhandledErrors??0),0);
 if(control){const intended=rows.find(r=>r.title===controls[control].test);assert.equal(run.status,1);assert.equal(report.numFailedTests,1);assert.equal(report.numPassedTests,1);assert.equal(report.numPendingTests,6);assert.equal(intended?.status,'failed');assert.match(intended.failureMessages.join('\n'),/AssertionError:|Error: expect\((?:element|received)\)\.|TestingLibraryElementError:/);assert.equal(rows.find(r=>r.title===independent)?.status,'passed');console.log('CFB_RECRUIT_FILTER_RECEIPT: '+JSON.stringify({control,failed:1,independentPassed:1,skipped:6,intended:intended.title,message:intended.failureMessages.join('\n')}))}
 else{assert.equal(run.status,0);assert.equal(report.numPassedTests,8);assert.equal(report.numFailedTests,0);assert.equal(report.numPendingTests,0);console.log('simCfbRecruitFilters: eight actual Board/original-engine outcomes passed.')}
 console.log('simCfbRecruitFilters: combined position/stars, source order, strict retained nodes, truthful counts/reset/no-match/exhausted.');
 console.log('simCfbRecruitFilters: filtering is local, no save/RNG/regeneration/selection/completion or hidden high-school ability.');
 console.log('simCfbRecruitFilters: exact selected IDs/FR/SO/NIL and independent original accepted/refused sign effects hold.');
}finally{for(const f of owned)await rm(f,{force:true});if(folder)await rmdir(folder);for(const verify of parity)await verify()}
console.log('simCfbRecruitFilters: source bytes held, only owned disposable copies removed.');
