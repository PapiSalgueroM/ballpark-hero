import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

const args=process.argv.slice(2),opts={};
assert.equal(args.length,6);
for(let i=0;i<args.length;i+=2){assert(['--out','--spec','--exit-code'].includes(args[i])&&!(args[i]in opts));opts[args[i]]=args[i+1];}
const out=path.resolve(opts['--out']),raw=path.join(out,'raw');
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p).toString('utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const spec=json(opts['--spec']),nativeExit=Number(opts['--exit-code']);
const write=(p,v)=>fs.writeFileSync(path.join(out,p),JSON.stringify(v,null,2)+'\n');
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024});assert.equal(r.status,0);assert.equal(r.stderr,'');return r.stdout;};
function walk(p,prefix=''){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name),prefix+e.name+'/'):[prefix+e.name]);}
function validateReport(report){
 assert.equal(report.success,false);assert.equal(report.numTotalTests,5);assert.equal(report.numPassedTests,0);assert.equal(report.numFailedTests,5);
 assert.equal(report.testResults.length,1);
 for(const k of ['numPendingTests','numTodoTests','numRuntimeErrors'])if(report[k]!==undefined)assert.equal(report[k],0);
 assert(!report.unhandledErrors?.length);
 const rows=report.testResults[0].assertionResults;assert.equal(rows.length,5,'NBA_PENDING_ORIGINAL_CASE_CENSUS');
 assert.deepEqual(rows.map(r=>r.fullName),spec.cases.map(c=>c.name));
 rows.forEach((r,i)=>{assert.equal(r.status,'failed');assert(r.failureMessages.length>0);
 for(const m of r.failureMessages){const s=m.replace(/\x1b\[[0-9;]*m/g,'').trim();assert(/^AssertionError(?:\s+\[[^\]]+\])?:/.test(s));
 assert(s.includes(spec.diagnostic.markers[i]));assert(!/\b(?:TypeError|ReferenceError|SyntaxError|RangeError)\b|Cannot find module|Failed to resolve import|beforeAll|setup failed/i.test(s));}});
}
const fullProjection=j=>({frames:j.frames.map(f=>({action:f.action,raw:f.raw,text:f.text,globalAt:f.globalAt,rngState:f.rngState})),globals:j.globals,
 classView:j.classView?{openerPresent:j.classView.openerPresent,beforeText:j.classView.before?.text,openedText:j.classView.opened?.text,rows:j.classView.rows,campText:j.classView.campText}:null});
const suffix=j=>{const at=j.frames.findIndex(f=>f.action==='PENDING real remount');assert(at>=0);return{frames:j.frames.slice(at).map(f=>({action:f.action,raw:f.raw,text:f.text,globalAt:f.globalAt,rngState:f.rngState})),globals:j.globals};};
try{
 assert.equal(nativeExit,1);assert.equal(process.env.SIM_NETWORK,'offline');assert.equal(process.env.GIT_NO_LAZY_FETCH,'1');
 assert.equal(process.env.NODE_OPTIONS,'--require='+path.resolve('scripts/lib/offlineTransport.cjs'));
 assert.equal(git(['rev-parse','HEAD^']).trim(),spec.baseline.commit);
 assert.equal(git(['rev-parse',spec.baseline.commit+'^{tree}']).trim(),spec.baseline.tree);
 for(const[file,want]of Object.entries(spec.productPins))assert.equal(blob(read(file)),want,'original App pin '+file);
 assert.equal(blob(read(spec.testPath)),spec.testBlob);
 assert.equal(json(path.join(out,'types-passed.json')).command,'node_modules/.bin/tsc --noEmit -p tsconfig.app.json');
 assert.equal(json(path.join(out,'types-passed.json')).exit,0);
 assert.equal(read(path.join(out,'logs/types.exit')).toString().trim(),'0');
 for(const name of ['types','vitest','reader'])assert.equal(read(path.join(out,'transport',name+'.log')).length,0);
 const fixtureBytes=read(spec.originalInputsFile);assert.equal(sha(fixtureBytes),spec.originalInputsSha256);
 const envelope=JSON.parse(fixtureBytes),references={};
 assert.deepEqual(envelope.authority,spec.originalAuthority);assert.equal(envelope.files.length,8);
 for(const row of envelope.files){const b=gunzipSync(Buffer.from(row.gzipBase64,'base64'));assert.equal(b.length,row.bytes);assert.equal(sha(b),row.sha256);references[row.file]=JSON.parse(b);}
 const closing=json(path.join(raw,'closing.json'));
 assert.equal(closing.beforeAllFailure,null);assert.equal(closing.restoredCampFunction,true);assert.equal(closing.restoredJsdomScroll,true);
 assert(!fs.existsSync(path.join(raw,'diagnostic-fallback.json'))&&!fs.existsSync(path.join(raw,'setup-diagnostic.json.gz')));
 const names=closing.records.map(r=>r.file);assert.equal(new Set(names).size,names.length);
 assert.deepEqual(walk(raw).sort(),[...closing.records.map(r=>r.storedFile),'closing.json'].sort());
 let decoded=0,stored=0;
 const bodies={};
 for(const row of closing.records){assert.equal(row.storedFile,row.file+'.gz');assert.equal(row.encoding,'gzip-full-literal-json');
 const b=read(path.join(raw,row.storedFile));assert.equal(b.length,row.storedBytes);assert.equal(sha(b),row.storedSHA256);
 const literal=gunzipSync(b,{maxOutputLength:spec.limits.maxDecodedRawBytes});
 assert.equal(literal.length,row.bytes);assert.equal(sha(literal),row.sha256);bodies[row.file]=JSON.parse(literal);decoded+=literal.length;stored+=b.length;}
 assert.equal(decoded,closing.rawBytes);assert.equal(stored,closing.storedRawBytes);
 assert(decoded<=46137344&&stored<=12582912);for(const c of spec.cases)assert(names.includes(c.raw));
 const run=bodies['run.json'];assert.equal(run.setupsComplete,true);assert.equal(run.noHiddenMarkerOrRealNpcInjected,true);
 assert.deepEqual(run.sourcePins,spec.productPins);assert.deepEqual(run.records,closing.records.filter(r=>r.file!=='run.json'));
 assert.deepEqual(run.bootstrap,{file:'bootstrap.json',retainedColdUi:true});
 assert(run.qualification.every(q=>q.equal&&q.observedSha256===q.normalSha256));
 for(const q of run.qualification){const a=fullProjection(bodies['journeys/'+q.observed+'.json']),b=fullProjection(bodies['journeys/'+q.normal+'.json']);
 assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(sha(JSON.stringify(a)),q.observedSha256);}
 const reportBytes=read(path.join(out,'vitest.json')),report=JSON.parse(reportBytes);validateReport(report);
 const cold=bodies['journeys/road-61-PG.json'],warm=bodies['journeys/legacy-pending-61-PG.json'],old=references['raw/journeys/road-61-PG.json'];
 const oldLegacy=references['raw/legacy-full.json'],legacy=bodies['legacy-full.json'];
 assert.equal(cold.input.pending.raw,old.input.pending.raw,'actual original UI pending bytes');
 assert.equal(sha(legacy.inputRaw),envelope.frozenInputs.professional.sha256);
 assert.equal(legacy.inputRngState,envelope.frozenInputs.professional.rngState);
 assert.equal(warm.frames[0].raw,old.input.pending.raw);assert.equal(warm.frames[0].rngState,envelope.frozenInputs.pending.rngState);
 assert.equal(JSON.stringify(fullProjection(legacy.one)),JSON.stringify(fullProjection(oldLegacy.one)));
 assert.equal(JSON.stringify(fullProjection(legacy.two)),JSON.stringify(fullProjection(oldLegacy.two)));
 assert.equal(JSON.stringify(fullProjection(cold)),JSON.stringify(fullProjection(old)),'NBA_PENDING_ORIGINAL_COLD_REFERENCE_EXACT');
 const actual=suffix(warm),original=suffix(old),offset=original.frames[0].globalAt;
 const differences=[];
 assert.equal(actual.frames.length,original.frames.length);assert.deepEqual(actual.globals,original.globals.slice(offset));
 for(let i=0;i<actual.frames.length;i++){const a=actual.frames[i],o=original.frames[i];
 assert.equal(a.action,o.action);assert.equal(a.raw,o.raw);assert.equal(a.rngState,o.rngState);assert.equal(a.globalAt+offset,o.globalAt);
 if(a.text!==o.text)differences.push({index:i,action:a.action,originalText:o.text,actualText:a.text});}
 assert.deepEqual(differences.map(d=>({index:d.index,action:d.action})),[{index:5,action:'Draft day'}],'NBA_PENDING_ORIGINAL_SINGLE_PRESENTATION_DIFFERENCE');
 const projection=JSON.stringify(actual);assert.equal(Buffer.byteLength(projection),spec.diagnostic.candidateWarmProjection.projectionBytes);
 assert.equal(sha(projection),spec.diagnostic.candidateWarmProjection.projectionSHA256,'NBA_PENDING_ORIGINAL_REPRODUCES_ACTUAL_CANDIDATE_WARM_TEXT');
 const prior=JSON.stringify(report),copy=JSON.parse(prior),removed=copy.testResults[0].assertionResults.pop();
 assert.notEqual(JSON.stringify(copy),prior);assert.throws(()=>validateReport(copy),/NBA_PENDING_ORIGINAL_CASE_CENSUS/);
 copy.testResults[0].assertionResults.push(removed);assert.equal(JSON.stringify(copy),prior);assert.equal(sha(read(path.join(out,'vitest.json'))),sha(reportBytes));
 const tracked=git(['ls-files','-z']);assert.equal(tracked,read(path.join(out,'tracked-before.bin')).toString());
 assert.equal(git(['ls-files','-s']),read(path.join(out,'index-before.txt')).toString());
 assert.equal(git(['status','--porcelain=v1','--untracked-files=all']),'');
 const before=read(path.join(out,'source-before.sha256')).toString();
 for(const file of tracked.split('\0').filter(Boolean))assert(before.includes(sha(read(file))+'  '+file+'\n'));
 assert(read('package-lock.json').equals(read(path.join(out,'package-lock-before.json'))));
 const log=read(path.join(out,'logs/vitest.stdout.log')).toString()+read(path.join(out,'logs/vitest.stderr.log')).toString();
 assert(!/Unhandled Errors|Vitest caught|uncaughtException|unhandledRejection|Cannot find module|Failed to resolve import|SIM_OFFLINE_BLOCK/.test(log));
 write('presentation-differences.json',differences);
 write('diagnostic-admission.json',{status:'ORIGINAL_SOURCE_REPRODUCED_COLD_WARM_TEXT_DIFFERENCE',baseline:spec.baseline,nativeExit,
 cases:5,featureAbsences:4,sameLegacyTextFailure:1,privateForkTapeCaptured:false,all8OriginalReferencesHeld:true,
 suffixFrames:actual.frames.length,suffixGlobalDraws:actual.globals.length,allSavedRawActionsCheckpointsAndGlobalTapeExact:true,
 coldWholeOriginalProjectionExact:true,warmWholeProjectionSHA256:sha(projection),matchesCandidateWarmProjection:true,
 warmLogicalFile:'journeys/legacy-pending-61-PG.json',warmLiteralSHA256:closing.records.find(r=>r.file==='journeys/legacy-pending-61-PG.json').sha256,
 actualReportOmissionControlOwned:true,sourceIndexLockStatusHeld:true,decodedBytes:decoded,storedBytes:stored,
 limits:'Causal original-source presentation diagnostic only. No candidate feature, build, native or public qualification. No text normalization or new warm actor.'});
 console.log('NBA_PENDING_ORIGINAL_CAUSE_ADMITTED: original cold fallback and warm cinema differ only at Draft day; full old input/state/actions/global tape held; actual candidate warm trace exactly reproduced.');
}catch(error){write('diagnostic-admission.json',{status:'NOT_ADMITTED',error:String(error),nativeExit,fullProof:false});console.error(error);process.exitCode=1;}
