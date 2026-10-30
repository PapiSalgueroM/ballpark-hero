import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
const ROOT=process.cwd(),OUT=process.env.SC_SIZES_PREFLIGHT_OUT,ACT=path.join(OUT||'','actual');
const PRODUCT='00dd08bc9dd25f21705ad1bcf2c80f51fa7d107b',TREE='a525375a9889c83187335442e63853f69ee7f32d',BRANCH='codex/sc-modern-sizes-preflight-20261030';
const QA=['.github/workflows/sc-programme-modern-sizes-preflight.yml','scripts/qa/preflightProgrammeModernSizes.mjs'],IDS=['ere','cha','sco','her','nan'],ARMS=['original','current','compatibility','historical-opening-on','historical-opening-off','pristine-opening-on','pristine-opening-off'];
const PINS={'scripts/simCareerProgramme.mjs':'8fc310dc1fb18fb1a5ab8c75c45b59bee36895c1','scripts/lib/careerProgrammePoolAttribution.mjs':'ba321a2082390c5156c088b99f79ab32205d67f4','scripts/lib/offlineTransport.cjs':'0fda542a2649fe5da937c6976fd0f5b6073e74b6','scripts/data/careerLeagueWorldSaves1100.json':'81425f731297f0ff72fc4e163dfe1a4cb86814ab'};
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:1<<29}).trim();
const write=(name,v)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(v,null,2)+'\n'),read=name=>JSON.parse(fs.readFileSync(path.join(ACT,name)));
assert(process.env.CI==='true'&&path.isAbsolute(OUT||'')&&OUT!==ROOT&&!OUT.startsWith(ROOT+path.sep),'Remote external evidence');
assert.equal(sha(fs.readFileSync(new URL(import.meta.url))),process.env.SC_SIZES_PREFLIGHT_SHA256);
const files=git('ls-files','-z').split('\0').filter(Boolean).sort();
const source=()=>files.map(file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,sha256:sha(b),executable:!!(fs.statSync(file).mode&0o111)};});
function run(id,command,args,env={},timeout=900000){
 const dir=path.join(OUT,id);fs.mkdirSync(dir);const a=fs.openSync(path.join(dir,'stdout.log'),'wx'),b=fs.openSync(path.join(dir,'stderr.log'),'wx'),start=new Date().toISOString(),clock=process.hrtime.bigint();let r;
 try{r=spawnSync(command,args,{cwd:ROOT,env:{...process.env,...env},timeout,killSignal:'SIGKILL',stdio:['ignore',a,b]});}finally{fs.closeSync(a);fs.closeSync(b);}
 const actual={command,args,start,end:new Date().toISOString(),durationMs:Number(process.hrtime.bigint()-clock)/1e6,status:r.status,signal:r.signal,error:r.error?String(r.error):null,mode:env.PROGRAMME_ATTRIBUTION_CONTROL||null,offlineGuard:env.NODE_OPTIONS||null};fs.writeFileSync(path.join(dir,'process.json'),JSON.stringify(actual,null,2));assert(!actual.error&&!actual.signal&&Number.isInteger(actual.status),'Actual finite child '+id);return{...actual,log:fs.readFileSync(path.join(dir,'stdout.log'),'utf8')+fs.readFileSync(path.join(dir,'stderr.log'),'utf8')};
}
let before,index,refs,privateBefore,child,prepared=false,accepted=false,result,failure,holds=false;
try{
 assert.deepEqual(fs.readdirSync(OUT).sort(),['controller.stderr.log','controller.stdout.log']);
 assert.equal(git('rev-parse',PRODUCT+'^{tree}'),TREE);assert.equal(git('rev-parse','HEAD'),process.env.GITHUB_SHA);assert.equal(process.env.GITHUB_REF_NAME,BRANCH);assert.equal(git('show','-s','--format=%P','HEAD'),PRODUCT);
 assert.equal(files.length,5459);assert.equal(git('ls-tree','-r','--name-only',PRODUCT).split('\n').length,5457);assert.deepEqual(git('diff','--name-status',PRODUCT,'HEAD').split('\n').sort(),QA.map(file=>'A\t'+file).sort());assert.equal(git('status','--porcelain=v1','--untracked-files=all'),'');
 before=source();index=sha(fs.readFileSync(git('rev-parse','--git-path','index')));refs=git('show-ref');write('source-before.json',before);write('git-before.json',{index,refs,head:process.env.GITHUB_SHA});fs.writeFileSync(path.join(OUT,'tracked-files.nul'),files.join('\0')+'\0');
 git('archive','--format=tar','-o',path.join(OUT,'product-source.tar'),PRODUCT);git('archive','--format=tar','-o',path.join(OUT,'proof-source.tar'),'HEAD');
 assert.equal(run('npm-ci','npm',['ci']).status,0);
 fs.mkdirSync(ACT);fs.mkdirSync(path.join(OUT,'tmp'));const copyIndex=path.join(OUT,'private.index');fs.copyFileSync(git('rev-parse','--git-path','index'),copyIndex);
 child={GIT_INDEX_FILE:copyIndex,NODE_OPTIONS:'--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs'),SIM_NETWORK:'offline',SIM_OFFLINE_RECEIPT:path.join(OUT,'transport.jsonl'),TMPDIR:path.join(OUT,'tmp'),TEMP:path.join(OUT,'tmp'),TMP:path.join(OUT,'tmp'),CAREER_PROGRAMME_OUT:ACT,PROGRAMME_REWARD_CONTROL:'',PROGRAMME_ATTRIBUTION_CONTROL:'modern-sizes',FORCE_COLOR:'0',NO_COLOR:'1'};
 privateBefore=execFileSync('git',['--no-optional-locks','ls-files','--stage','-z'],{env:{...process.env,...child}});fs.writeFileSync(path.join(OUT,'private-index-before.entries'),privateBefore);prepared=true;
 for(const[file,pin]of Object.entries(PINS))assert.equal(blob(fs.readFileSync(file)),pin);
 const actual=run('modern-sizes',process.execPath,['scripts/simCareerProgramme.mjs'],child);assert([0,1].includes(actual.status));assert(!/SyntaxError:|ReferenceError:|TypeError:|ERR_MODULE_NOT_FOUND|ERR_REQUIRE_ESM|UnhandledPromiseRejection|unhandled rejection/i.test(actual.log));
 const maps={};
 for(const arm of ARMS){const binding=read(arm+'-binding.json'),loaded=read(arm+'-loaded.json'),body=fs.readFileSync(path.join(ACT,arm+'-engine.cjs'));assert.equal(binding.arm,arm);assert.equal(binding.compiledSHA256,sha(body));assert.equal(binding.loadedSources,arm+'-loaded.json');assert.equal(binding.attributionControl,'modern-sizes');assert.equal(binding.poolNormalized,arm.startsWith('historical-'));assert.equal(binding.playingSizesNormalized,arm.startsWith('historical-')||arm==='pristine-opening-off');
  const map={};for(const row of loaded){assert(!Object.hasOwn(map,row.file));assert.equal(row.arm,arm);assert.equal(row.original,arm==='original');if(row.original)assert.equal(row.sha256,row.compiledSha256);map[row.file]=row;}maps[arm]={binding,compiledSHA256:sha(body),byFile:map};}
 const on=maps['pristine-opening-on'].byFile,off=maps['pristine-opening-off'].byFile;assert.deepEqual(Object.keys(on).sort(),Object.keys(off).sort());
 assert.notEqual(on['src/lib/soccerCareerLeague.ts'].compiledSha256,off['src/lib/soccerCareerLeague.ts'].compiledSha256);assert.equal(read('pristine-opening-off-playing-size-attribution.json').receipts.length,2);assert(!fs.existsSync(path.join(ACT,'pristine-opening-off-pool-attribution.json')));write('ALL-SEVEN-FULL-LOADED-MAPS.json',maps);
 const expected=IDS.flatMap(id=>Array.from({length:10},(_,i)=>'neutral-'+id+'-'+(i+1)+'.json'));assert.deepEqual(fs.readdirSync(ACT).filter(f=>/^neutral-.*\.json$/.test(f)).sort(),expected.sort());
 const prefix=fs.readFileSync(path.join(ACT,'pristine-pairs.jsonl'),'utf8').trim().split('\n').map(v=>JSON.parse(v));assert(prefix.length>0&&prefix.length<=50);
 for(const[i,row]of prefix.entries()){assert.equal(row.id,IDS[Math.floor(i/10)]);assert.equal(row.seed,i%10+1);assert.equal(sha(fs.readFileSync(path.join(ACT,row.file))),row.sha256);const pair=read(row.file);assert.equal(pair.sourceControl,'modern-sizes');const{sha256,...observed}=row;assert.deepEqual(pair.observed,observed);assert(row.drawTapeEqual&&row.inputHeld);assert.equal(row.openingFieldsOff,0);if(i<prefix.length-1||actual.status===0)assert.equal(row.outsideOpeningEqual,true);}
 if(actual.status===1){assert.deepEqual(actual.log.match(/^AssertionError \[ERR_ASSERTION\]: .+$/gm),['AssertionError [ERR_ASSERTION]: SC_PROGRAMME_PRISTINE_NON_OPENING_STATE']);assert.equal(prefix.at(-1).outsideOpeningEqual,false);assert(!fs.existsSync(path.join(ACT,'outcomes.json')));}
 else{assert.equal(prefix.length,50);assert.equal(read('outcomes.json').modernNeutral.length,50);assert.match(actual.log,/Career programme:50 historical pool and playing size original\/on\/off pairs/);}
 result={diagnosis:actual.status===1?'OWNED_SIZE_REFUSAL_OBSERVED':'INEFFECTIVE_CONTROL_NO_PRODUCT_CREDIT',raw:actual.status,priorNeutralPairs:50,pristinePrefix:prefix.length,last:prefix.at(-1),productCredit:false};write('DIAGNOSTIC.json',result);accepted=true;
}catch(error){failure={name:error.name,message:error.message,stack:error.stack};write('ERROR.json',failure);}
finally{if(prepared){try{
 assert.deepEqual(source(),before);assert.equal(sha(fs.readFileSync(git('rev-parse','--git-path','index'))),index);assert.equal(git('show-ref'),refs);assert.equal(git('rev-parse','HEAD'),process.env.GITHUB_SHA);assert.equal(git('status','--porcelain=v1','--untracked-files=all'),'');
 assert.equal(sha(fs.readFileSync(git('rev-parse','--git-path','index'))),index);write('git-after.json',{index,refs,head:git('rev-parse','HEAD')});
 const afterPrivate=execFileSync('git',['--no-optional-locks','ls-files','--stage','-z'],{env:{...process.env,...child}});assert.deepEqual(afterPrivate,privateBefore);fs.writeFileSync(path.join(OUT,'private-index-after.entries'),afterPrivate);
 write('source-after.json',source());holds=true;
 }catch(error){failure??={name:error.name,message:error.message,stack:error.stack};write('HOLDS-ERROR.json',failure);}
 try{assert.equal(run('archive-final','tar',['-cf',path.join(OUT,'source-final.tar'),'--null','--verbatim-files-from','-T',path.join(OUT,'tracked-files.nul')]).status,0);}catch(error){holds=false;failure??={name:error.name,message:error.message};}
 }write('FINAL-HOLDS.json',{holds,sourceAndIndexAndRefs:holds,productCredit:false});write('COMPLETION.json',{status:accepted&&holds?'DIAGNOSTIC_ONLY':'FAILED_REFUSED',product:PRODUCT,source:process.env.GITHUB_SHA,result,failure,appTypesBuildBrowserFullSuite:'UNRUN',dependencyBodyQualification:'UNRUN_NPM_CI_RAW_RETAINED',productCredit:false});process.exitCode=accepted&&holds?0:1;}
