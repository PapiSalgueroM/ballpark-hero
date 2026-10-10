// Remote-only fixtures and copied source builds for the two results layout fixes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {build as bundle} from 'esbuild';
export const ROOT=process.cwd(),BASE='09df145abfb241679022b41903d2f19bc254ebf9',OUT=path.resolve('soccer-results-layout-artifacts'),NOW=1791720000000,KEY='soccerCareerSave';
export const copy=v=>JSON.parse(JSON.stringify(v)),sha=v=>createHash('sha256').update(v).digest('hex');
export const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:30*1024*1024}).trim();
export function held(files){return files.map(file=>({file,sha256:sha(fs.readFileSync(file))}));}
export function seeded(seed,fn){const old=Math.random,oldNow=Date.now,draws=[];let n=seed>>>0;Math.random=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);const v=((t^t>>>14)>>>0)/4294967296;draws.push(v);return v;};Date.now=()=>NOW;try{return{value:fn(),draws};}finally{Math.random=old;Date.now=oldNow;}}
export async function oracleBundle(browser=false){
 const loaded=[],temp=fs.mkdtempSync(path.join(os.tmpdir(),'results-layout-oracle-')),file=path.join(temp,'oracle.cjs');
 try{const r=await bundle({stdin:{contents:"export * as engine from './src/lib/soccerCareerEngine';export * as moments from './src/components/soccer-career/careerMoments';export * as reveal from './src/lib/soccerAwardReveal';export * as cup from './src/lib/soccerCareerCup';",resolveDir:ROOT},bundle:true,platform:browser?'browser':'node',format:browser?'iife':'cjs',globalName:browser?'ResultsOracle':undefined,outfile:browser?undefined:file,write:!browser,jsx:'automatic',alias:{'@':path.join(ROOT,'src')},define:{'import.meta.env':'{"PROD":true,"DEV":false}'},loader:{'.css':'empty','.svg':'empty','.png':'empty'},logLevel:'error',plugins:[{name:'held-production-source',setup(b){b.onLoad({filter:/\.(tsx?|json)$/},args=>{const relative=path.relative(ROOT,args.path).replaceAll('\\','/');if(!relative.startsWith('src/'))return;const raw=fs.readFileSync(args.path),contents=raw.toString('utf8').replaceAll('\r\n','\n');loaded.push({file:relative,rawSha256:sha(raw),compiledSha256:sha(contents)});return{contents,loader:relative.endsWith('.json')?'json':relative.endsWith('.tsx')?'tsx':'ts'};});}}]});return{value:browser?r.outputFiles[0].text:createRequire(path.join(ROOT,'package.json'))(file),loaded};}finally{fs.rmSync(temp,{recursive:true,force:true});}
}
export function nextPhase(B,input){const E=B.engine,c=copy(input),clubs=E.FALLBACK_CLUBS;switch(c.phase){
 case'newspaper':return E.dismissNewspaper(c);case'season_summary':return E.dismissSummary(c,clubs);
 case'ballon_dor':if(!c.pendingBallonDor.revealed)return B.reveal.revealBallonDorResult(c);if(E.bdorSpeechOpen(c))return E.giveBdorSpeech(c,'tears');return E.dismissBallonDor(c,clubs);
 case'world_cup':if(E.worldCupSpeechOpen(c))return E.giveWorldCupSpeech(c,'for_the_country');return E.dismissWorldCup(c,clubs);
 case'international_debut':return E.dismissDebut(c,clubs);case'rivalry_event':return E.dismissRivalryEvent(c,clubs);
 case'social_media_action':if(!c.socialMediaActionUsedThisSeason)return E.applySocialMediaAction(c,'stay_off');if(c.pendingCoverAthleteEvent)return E.handleCoverAthleteDecision(c,false);return E.dismissSocialMediaPhase(c,clubs);
 case'random_events':return E.applyEventChoice(c,0,clubs);case'moral_dilemma':if(c.pendingMoralDilemma)return E.applyMoralDilemmaChoice(c,1);return E.dismissMoralDilemma(c,clubs);
 case'red_card_appeal_result':return E.dismissAppealResult(c,clubs);case'transfer_window':return E.stayAtClub(c);
 case'rehab_choice':return E.applyRehabChoice(c,0);default:throw Error('Unsupported genuine preparation phase '+c.phase);
}}
function finish(B,start,seed){let c=start;const trace=[];for(let step=0;step<32&&c.phase!=='playing';step++){const input=copy(c),result=seeded(seed+step,()=>nextPhase(B,input));assert.notEqual(JSON.stringify(result.value),JSON.stringify(input),'Actual preparation callback advances');trace.push({phase:input.phase,input,...result});c=result.value;}assert.equal(c.phase,'playing');return{state:c,trace};}
export function prepare(B){
 const captured=JSON.parse(fs.readFileSync('scripts/data/careerLeagueWorldSaves1100.json','utf8')).saves.find(v=>v.id==='ere'&&v.kind==='player');assert(captured);
 const repaired=seeded(600,()=>B.engine.repairCareer(copy(captured.state)));const initial=repaired.value;
 const first=seeded(601,()=>B.engine.advanceProSeason(copy(initial),B.engine.FALLBACK_CLUBS));const settled=finish(B,first.value,610);
 let chosen=null;const searched=[];
 for(let seed=1;seed<=80;seed++){const result=seeded(seed,()=>B.engine.advanceProSeason(copy(settled.state),B.engine.FALLBACK_CLUBS)),c=result.value,run=B.cup.readCupRun(c.pendingSummary);searched.push({seed,phase:c.phase,year:c.pendingSummary?.year,cup:run?.result,tournament:c.pendingTournament?.short});if(c.phase==='newspaper'&&run&&B.cup.cupExitLine(run)&&c.pendingTournament&&(c.intlHistory??[]).some(h=>h.short==='World Cup')){chosen={seed,input:settled.state,...result};break;}}
 assert(chosen,'Bounded actual2030 newspaper/cup-exit/tournament fixture exists');
 const summary=seeded(900,()=>B.engine.dismissNewspaper(copy(chosen.value)));assert.equal(summary.value.phase,'season_summary');
 const continuation=finish(B,summary.value,950),world=continuation.trace.find(t=>t.phase==='world_cup'&&!B.engine.worldCupSpeechOpen(t.input)),transfer=continuation.trace.find(t=>t.phase==='transfer_window');assert(world&&transfer,'Actual result continuations include world cup and transfer window');
 const preparation={scope:'Existing complete ere2028 save, then genuine current unchanged engine2029 advancement and actual continuation callbacks. Selected2030 result is actual seeded advance, never an edited result or forced phase.',captured,repaired,first,settled,chosen,summary,continuation,searched};
 fs.writeFileSync(path.join(OUT,'preparation.json'),JSON.stringify(preparation,null,2));return{newspaper:chosen.value,summary:summary.value,world:world.input,transfer:transfer.input,preparation};
}
export async function originalLayout(id,file){
 const current=fs.readFileSync(file),original=execFileSync('git',['show',BASE+':'+file],{maxBuffer:30*1024*1024}),temp=fs.mkdtempSync(path.join(os.tmpdir(),'results-layout-'+id+'-')),archive=path.join(temp,'base.tar'),tree=path.join(temp,'tree'),loaded=[];let targetCount=0;
 assert.notEqual(sha(current),sha(original),'Copied original layout actually differs');fs.mkdirSync(tree);
 execFileSync('git',['archive','--format=tar','--output='+archive,BASE]);execFileSync('tar',['-xf',archive,'-C',tree]);
 for(const product of ['src/pages/SoccerCareer.tsx','src/components/soccer-career/InternationalPanel.tsx'])fs.writeFileSync(path.join(tree,product),product===file?original:fs.readFileSync(product));
 fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(tree,'node_modules'),'dir');
 const {build}=await import('vite'),previousCwd=process.cwd();try{process.chdir(tree);await build({root:tree,configFile:path.join(tree,'vite.config.ts'),mode:'production',logLevel:'warn',build:{outDir:path.join(tree,'dist'),emptyOutDir:true},plugins:[{name:'held-copied-tree',enforce:'pre',transform(source,module){const relative=path.relative(tree,module.split('?')[0]).replaceAll('\\','/');if(!relative.startsWith('src/'))return;const raw=fs.readFileSync(module.split('?')[0]);if(relative===file){targetCount++;assert.equal(sha(raw),sha(original),'Selected source is actual original bytes');}loaded.push({file:relative,rawSha256:sha(raw),compiledSha256:sha(source),original:relative===file});}}]});}finally{process.chdir(previousCwd);}
 assert.equal(targetCount,1);assert.equal(sha(fs.readFileSync(file)),sha(current),'Product source unchanged during copied build');const retained=path.join(OUT,'copied-source',id);fs.mkdirSync(retained,{recursive:true});fs.writeFileSync(path.join(retained,'current.tsx'),current);fs.writeFileSync(path.join(retained,'original.tsx'),original);const styles=[];for(const entry of fs.readdirSync(path.join(tree,'dist','assets'))){if(!entry.endsWith('.css'))continue;const raw=fs.readFileSync(path.join(tree,'dist','assets',entry));fs.writeFileSync(path.join(retained,entry),raw);styles.push({file:path.relative(OUT,path.join(retained,entry)),sha256:sha(raw),bytes:raw.length});}assert(styles.length,'Actual copied Tailwind CSS retained');return{id,file,dir:path.join(tree,'dist'),cleanup:temp,retainedSource:{current:path.relative(OUT,path.join(retained,'current.tsx')),original:path.relative(OUT,path.join(retained,'original.tsx'))},styles,targetCount,beforeSha256:sha(current),afterSha256:sha(original),base:BASE,baseTree:git('rev-parse',BASE+'^{tree}'),tailwindScope:'Actual copied tree is the build cwd and its own original/current source files are scanned by its original Tailwind config, not transformed strings outside the content scan.',loaded};
}
export function dependencies(mode){
 const file=path.join(OUT,'dependencies-before.json'),packagesFiles=held(['package.json','package-lock.json']);
 if(mode==='before'){const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8')),packages=[];for(const[d,m]of Object.entries(lock.packages)){const f=path.join(d,'package.json');if(!d.startsWith('node_modules/')||!fs.existsSync(f)||!m.version)continue;const a=JSON.parse(fs.readFileSync(f,'utf8'));assert.equal(a.version,m.version);packages.push({directory:d,name:a.name,version:a.version});}assert(packages.length);fs.writeFileSync(file,JSON.stringify({packagesFiles,packages},null,2));}
 else{const before=JSON.parse(fs.readFileSync(file,'utf8'));assert.deepEqual(packagesFiles,before.packagesFiles);for(const p of before.packages){const a=JSON.parse(fs.readFileSync(path.join(p.directory,'package.json'),'utf8'));assert.equal(a.name,p.name);assert.equal(a.version,p.version);}fs.writeFileSync(path.join(OUT,'dependencies-after.json'),JSON.stringify({...before,browserPackage:JSON.parse(fs.readFileSync('node_modules/playwright/package.json','utf8')).version},null,2));}console.log('PASS installed locked dependencies and package bytes '+mode);
}
if(process.argv[2]==='dependencies'){assert(process.env.CI);fs.mkdirSync(OUT,{recursive:true});dependencies(process.argv[3]);}

if(process.argv[2]==='units'){
 const report=JSON.parse(fs.readFileSync(path.join(OUT,'units.json'),'utf8'));assert.equal(report.success,true);assert.equal(report.numFailedTests,0);assert.equal(report.numPendingTests,0);assert.equal(report.numTodoTests??0,0);
 for(const file of ['careerRecordedStats.test.tsx','phonePanelFocus.test.tsx']){const result=report.testResults.find(v=>v.name.endsWith('/'+file));assert(result&&result.assertionResults.length>0);assert(result.assertionResults.every(v=>v.status==='passed'),file+' all actual assertions passed');}
 console.log('PASS actual nonempty recorded-facts and phone suites: '+report.numPassedTests+' assertions, no skipped/pending/todo cases');
}