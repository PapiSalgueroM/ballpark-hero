/* Real Board and original remote mapping, score, save, share and completion outcomes. */
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm,rmdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),control=process.env.TENNIS_FEEDBACK_CONTROL||'';
const independent='holds independent original six-clue payouts exact saves full shares and once completion';
const staleAnchor='  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);';
const controls={
  stale:{test:'keeps a committed first-clue win correct at the old delayed boundary',edits:[[staleAnchor,staleAnchor+`\n  const handleGuess = (name: string) => { const captured = gameState; makeGuess(name); window.setTimeout(() => { if (captured?.gameStatus === 'playing') setFeedback({ kind: 'wrong', turn: captured.guesses.length + 1, status: 'won' }); }, 50); };`],['onGuess={makeGuess}','onGuess={handleGuess}']]},
  silent:{test:'cues repeated accepted wrong appends with stable clues and the original600 win',edits:[["prior.gameStatus === 'playing' && gameState.guesses.length === prior.guesses.length + 1",'false']]},
  restore:{test:'restores completed and partial dailies quietly without paying a restored finish',edits:[['      setFeedback(null);\n    } else if (prior.gameStatus',"      setFeedback(gameState ? { kind: 'correct', turn: gameState.guesses.length, status: gameState.gameStatus } : null);\n    } else if (prior.gameStatus"]]},
  cleanup:{test:'clears reset and unmount timers without leaking delayed feedback',edits:[['return () => window.clearTimeout(timer);','return () => {};']]},
  settle:{test:'keeps hints and clones quiet without restarting or extending a live cue',edits:[['window.setTimeout(() => setFeedback(null), 600);','window.setTimeout(() => setFeedback(null), 6000);']]},
  exhausted:{test:'reports the exhausted last miss truthfully with the original zero-score loss',edits:[["isOver ? 'Wrong guess. The answer is below.' : 'Wrong guess! Try again...'","'Wrong guess! Try again...'"]]},
  finite:{test:'binds finite static-motion cues full guess text and owned44px actions',css:true,edits:[['tennisReply 420ms ease-out 1;','tennisReply 420ms ease-out infinite;']]},
  reduced:{test:'binds finite static-motion cues full guess text and owned44px actions',css:true,edits:[['.reply, .won, .lost { animation: none; }','.reply, .won, .lost { animation: tennisReply 420ms ease-out 1; }']]},
  names:{test:'binds finite static-motion cues full guess text and owned44px actions',edits:[['${feedbackStyles.guessName} px-3 py-1','px-3 py-1']]},
  targets:{test:'binds finite static-motion cues full guess text and owned44px actions',css:true,edits:[['min-height: 44px;','min-height: 20px;']]},
  help:{test:'reopens actual active-game help without changing the accepted round',edits:[['          <TennisPlayerHowToPlay />\n          {!isOver', '          {!isOver']]},
};
assert.ok(!control||control in controls,'Known Tennis feedback control');
const boardFile='src/components/tennis-player/TennisPlayerBoard.tsx',cssFile='src/components/tennis-player/TennisPlayerFeedback.module.css';
const parity=[];
for(const f of[boardFile,cssFile,'src/hooks/useTennisPlayer.ts','src/types/tennisPlayer.ts','src/components/tennis-player/TennisPlayerSearch.tsx','src/lib/dailyRecord.ts','src/hooks/useGameCompletion.ts','src/lib/completions.ts','src/components/game/ShareButtons.tsx']){const raw=await readFile(path.join(root,f));parity.push(()=>readFile(path.join(root,f)).then(current=>assert.deepEqual(current,raw,'Actual source bytes held '+f)))}
const board=(await readFile(path.join(root,boardFile),'utf8')).replace(/\r\n/g,'\n'),css=(await readFile(path.join(root,cssFile),'utf8')).replace(/\r\n/g,'\n');
let folder;const owned=[];
try{
 await mkdir(path.join(root,'.sim-control'),{recursive:true});folder=await mkdtemp(path.join(root,'.sim-control/tennis-feedback-'));
 const reportFile=path.join(folder,'report.json');owned.push(reportFile);
 const env={...process.env,FORCE_COLOR:'0',DEBUG_PRINT_LIMIT:'1200'};delete env.NO_DOUBLE_SWAP;delete env.TENNIS_FEEDBACK_CSS;
 const args=[path.join(root,'node_modules/vitest/vitest.mjs'),'run','src/test/tennisPlayerFeedback.test.tsx','--reporter=verbose','--reporter=json','--outputFile.json='+reportFile,'--maxWorkers=1','--no-file-parallelism'];
 if(control){
  const spec=controls[control];let changed=spec.css?css:board;
  for(const[anchor,replacement]of spec.edits){assert.equal(changed.split(anchor).length-1,1,'Actual executable control binding is unique');const before=changed;changed=changed.replace(anchor,replacement);assert.notEqual(changed,before,'Copied mutation changed bytes')}
  let code=spec.css?board:changed;const copy=path.join(folder,'TennisPlayerBoard.tsx');
  for(const name of['TennisPlayerSearch','TennisPlayerHowToPlay','TennisPlayerFeedback.module.css']){const anchor=`from './${name}'`;assert.equal(code.split(anchor).length-1,1);code=code.replace(anchor,`from '@/components/tennis-player/${name}'`)}
  owned.push(copy);await writeFile(copy,code);const swaps={'@/components/tennis-player/TennisPlayerBoard':copy};
  if(spec.css){const cssCopy=path.join(folder,'TennisPlayerFeedback.module.css');owned.push(cssCopy);await writeFile(cssCopy,changed);swaps['@/components/tennis-player/TennisPlayerFeedback.module.css']=cssCopy;env.TENNIS_FEEDBACK_CSS=cssCopy}
  env.NO_DOUBLE_SWAP=JSON.stringify(swaps);args.push('--testNamePattern',spec.test+'|'+independent);
 }
 const run=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024}),output=(run.stdout||'')+'\n'+(run.stderr||'');process.stdout.write(output);
 assert.ok(!run.error&&!run.signal,'Actual runner completes normally');assert.doesNotMatch(output,/Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/,'Runner faults earn no outcome credit');
 const report=JSON.parse(await readFile(reportFile,'utf8')),rows=report.testResults.flatMap(f=>f.assertionResults);assert.equal(rows.length,10,'Ten actual outcome cases collect');assert.equal(Number(report.numUnhandledErrors??0),0);
 if(control){const spec=controls[control],intended=rows.find(r=>r.title===spec.test);assert.equal(run.status,1);assert.equal(report.numFailedTests,1);assert.equal(report.numPassedTests,1);assert.equal(report.numPendingTests,8);assert.equal(intended?.status,'failed');assert.match(intended.failureMessages.join('\n'),/AssertionError:|Error: expect\((?:element|received)\)\.|TestingLibraryElementError:/,'Intended real assertion fails');assert.equal(rows.find(r=>r.title===independent)?.status,'passed');console.log('TENNIS_FEEDBACK_RECEIPT: '+JSON.stringify({control,intended:spec.test,failed:1,independentPassed:1,skipped:8,message:intended.failureMessages.join('\n')}))}
 else{assert.equal(run.status,0);assert.equal(report.numPassedTests,10);assert.equal(report.numFailedTests,0);assert.equal(report.numPendingTests,0);console.log('simTennisPlayerFeedback: ten actual Board/original hook outcomes pass.')}
 console.log('simTennisPlayerFeedback: original six payouts, authored clue labels/strings, exact saves/full cards and once completion.');
 console.log('simTennisPlayerFeedback: actual repeated guesses, quiet hints/clones/restore, Give-up isolation and owned600ms cleanup.');
 console.log('simTennisPlayerFeedback: finite420/static reduced cues, complete name binding and owned44px actions.');
}finally{for(const f of owned)await rm(f,{force:true});if(folder)await rmdir(folder);for(const verify of parity)await verify()}
console.log('simTennisPlayerFeedback: original bytes held and only owned disposable files cleaned.');
