'use strict';
async function main(mode){
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {stripVTControlCharacters}=require('node:util');
const ROOT=fs.realpathSync(process.cwd()),OUT=fs.realpathSync(process.env.NBA_PROGRESSION_OUT),SHADOW=path.resolve(process.env.NBA_PROGRESSION_SHADOW);
const PARENT='b1e39a6cfe41c1869392db3670123c7f7ba6d9ff',PARENT_TREE='563b850cbbaad8b3b5e5e3700a84109fc66dc888';
const BRANCH='codex/nba-career-progression-20261027',WF='.github/workflows/nba-career-progression.yml',SELF='scripts/qa/nbaCareerProgression.cjs',DOC='docs/PROJECT-STATE.md';
const TEST='src/test/nbaSeason20BoardProgression.test.tsx',OLD_TEST='src/test/usCareerMarketBoard.test.tsx',CARD='src/components/us-career/ExtensionCard.tsx';
const TEST_PIN={bytes:22232,sha256:'7d4e5cb43478028f6e3b7a6e128f80cbe97cc110b87156858a8c778c0e09f128',gitBlob:'863f3c21365e33d9d9e3ab34b97fc3e49bf64cd6'};
const CARD_PIN={bytes:7894,sha256:'5ed63734357603416bf0ba86989a37905b45de0072b85ffdec47ae7d5f732b77',gitBlob:'ed81c8eeccb6dd1db17b5a4f18fe1ed37350a2ca'};
const CANDIDATE_PIN={bytes:8044,sha256:'9f7aff137651107c21a5eb62b52af7b9fd8e7fd771a9165c2f076e01d225875b',gitBlob:'fd50a1341bfdd62d457922f06abb9226c814e9f6'};
const DOC_BINDING={"parent":{"bytes":1864335,"sha256":"a9d2f49a3ee08f69f833f4673f9baef79f482978182e02f6b0f415abc2af9590","gitBlob":"374d53f8e0955a819c55f32a185718abd6ea0420"},"tail":{"bytes":1470,"sha256":"6ece04bff266796ef3ad72850cfa4574e6aed31ff8b88d33dde899aa7b8f97a1","gitBlob":"74e159524486138c565dc562c857d27056fd9fab"},"candidate":{"bytes":1865805,"sha256":"04c26d11543b25a1a140c840ef2a8e2b688bb4cd13c402fa82fa3c2617fd5049","gitBlob":"e0d5b24048795334f401fe8ff040f7f5b0ef7e5d"}};
const COPY_STAGES=[{"afterUtf8Positions":[3216],"stageAfter":{"gitBlob":"b1277a1fbdac862720a72916a23ea26d65002bff","bytes":7947,"sha256":"761eae85ae9a3c5ad58b44f8509a9a93b397fc45344f14d79396a281ed161ad0"},"occurrences":1,"beforePositions":[3216],"beforeUtf8Positions":[3216],"before":"          This is the last {seasonWord} on your deal. Sign the extension and you are set,\n          usually a little under what the open market pays. Turn it down and you play the\n          year out and reach free agency, where everybody bids and nothing is promised.","stageBefore":{"gitBlob":"ed81c8eeccb6dd1db17b5a4f18fe1ed37350a2ca","bytes":7894,"sha256":"5ed63734357603416bf0ba86989a37905b45de0072b85ffdec47ae7d5f732b77"},"fullPositionedInverse":true,"after":"          This is the last {seasonWord} on your current deal.{' '}\n          {o ? 'You can sign the extension or turn it down and play the year out.' : 'There is no extension offer right now. Choose Play the year out to continue.'}\n          {' '}Playing out this deal leads to free agency only if your career continues.","afterPositions":[3216]},{"afterUtf8Positions":[3920],"stageAfter":{"gitBlob":"fd50a1341bfdd62d457922f06abb9226c814e9f6","bytes":8044,"sha256":"9f7aff137651107c21a5eb62b52af7b9fd8e7fd771a9165c2f076e01d225875b"},"occurrences":1,"beforePositions":[3920],"beforeUtf8Positions":[3920],"before":">{talk.note}</p>","stageBefore":{"gitBlob":"b1277a1fbdac862720a72916a23ea26d65002bff","bytes":7947,"sha256":"761eae85ae9a3c5ad58b44f8509a9a93b397fc45344f14d79396a281ed161ad0"},"fullPositionedInverse":true,"after":">{o || talk.pushed ? talk.note : 'No extension is on the table. Your current deal still covers this season.'}</p>","afterPositions":[3920]}];
const OLD_SUITE={"file":"src/test/usCareerMarketBoard.test.tsx","groups":[{"ancestor":"US market on the saved board","titles":["nfl restores the exact opening extension without a draw or save write","nba restores the exact opening extension without a draw or save write","mlb restores the exact opening extension without a draw or save write","nhl restores the exact opening extension without a draw or save write","nfl restores pending freeagency reveal, acknowledges once and keeps spent offers across reload","nba restores pending freeagency reveal, acknowledges once and keeps spent offers across reload","mlb restores pending freeagency reveal, acknowledges once and keeps spent offers across reload","nhl restores pending freeagency reveal, acknowledges once and keeps spent offers across reload","a stale talk is dropped alone and the whole underlying career remains on the hub","a saved extension decline returns to the hub and does not open another talk on load"]},{"ancestor":"NBA season twenty contract paths on the saved board","titles":["opens and signs an expired deal before playing season twenty-one","offers the remaining-year extension before playing season twenty-one","plays the final season with two years remaining without opening a market","plays season twenty-one when the final-year extension has no offer","restores the exact late-career offers on reload without drawing or playing","keeps an already retired season-twenty save out of contract talks"]}]};
const PROGRESSION_SUITE={file:TEST,groups:[{ancestor:'NBA fresh-board season progression diagnostic',titles:['records eight legal seeded careers without fabricating a season-twenty state']}]};
const SEEDS=Array.from({length:8},(_,i)=>'nba20-progression:'+i);
const ids=['baseline-types','baseline-saved-board','baseline-progression','candidate-types','candidate-saved-board','candidate-progression'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const pin=b=>({bytes:b.length,sha256:sha(b),gitBlob:blob(b)});
const same=(body,expected,label)=>assert.deepEqual(pin(body),expected,label);
function regular(file){const s=fs.lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink(),'NBA_PROGRESS_REGULAR');return fs.readFileSync(file);}
function output(name){assert(!path.isAbsolute(name)&&!name.split(/[\\/]/).includes('..'));const file=path.resolve(OUT,name);assert(file.startsWith(OUT+path.sep));return file;}
function write(name,body){const file=output(name);fs.mkdirSync(path.dirname(file),{recursive:true});const b=Buffer.isBuffer(body)?body:Buffer.from(body);const fd=fs.openSync(file,'wx');try{fs.writeFileSync(fd,b);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}assert(regular(file).equals(b));return file;}
const save=(name,value)=>write(name,JSON.stringify(value,null,2)+'\n');
const json=name=>JSON.parse(regular(output(name)));
const git=args=>cp.execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
assert.notEqual(OUT,ROOT);assert(!OUT.startsWith(ROOT+path.sep));assert.notEqual(SHADOW,ROOT);assert(!SHADOW.startsWith(ROOT+path.sep));assert.notEqual(SHADOW,OUT);assert(!SHADOW.startsWith(OUT+path.sep));assert(!OUT.startsWith(SHADOW+path.sep));
function sourceSnapshot(){return Object.fromEntries(cp.execFileSync('git',['ls-files','-z'],{cwd:ROOT}).toString().split('\0').filter(Boolean).map(file=>{assert(!path.isAbsolute(file)&&!file.split('/').includes('..'));const body=regular(path.join(ROOT,file));assert(fs.realpathSync(path.join(ROOT,file)).startsWith(ROOT+path.sep));return[file,pin(body)];}));}
function binding(){
 assert.equal(process.env.GITHUB_REPOSITORY,'PapiSalgueroM/ballpark-hero');assert.equal(process.env.GITHUB_REPOSITORY_ID,'1195729679');
 assert.equal(process.env.GITHUB_REF,'refs/heads/'+BRANCH);assert.equal(git(['rev-parse','HEAD']),process.env.GITHUB_SHA);assert.equal(git(['show','-s','--format=%P','HEAD']),PARENT);assert.equal(git(['rev-parse',PARENT+'^{tree}']),PARENT_TREE);
 assert.equal(process.env.NODE_OPTIONS,'--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs'));assert.equal(process.env.SIM_NETWORK,'offline');
 for(const name of ['NO_DOUBLE_SWAP','US_BOARD_CONTROL_ALIAS','US_BOARD_CONTROL_FILE','SIM_SEED','VITEST','ONLY','NODE_PATH','COMPLETION_HOOK','OWNED_TIMEOUTS_HOOK'])assert.equal(process.env[name],undefined,'NBA_PROGRESS_NO_OVERRIDE');
 same(regular(path.join(ROOT,TEST)),TEST_PIN,'NBA_PROGRESS_TEST_PIN');
 same(regular(path.join(ROOT,CARD)),CARD_PIN,'NBA_PROGRESS_BASE_CARD');
 same(regular(path.join(ROOT,OLD_TEST)),{bytes:14569,sha256:'f1cdcb2c4c222c2eee7625d88239cccc546f6fd02d284425a8c5d088d3a15263',gitBlob:'ecac94d3bf7c37436ff9047bdeee87ba2b5915a5'},'NBA_PROGRESS_OLD16_HELD');
 const parentDoc=cp.execFileSync('git',['show',PARENT+':'+DOC],{cwd:ROOT,maxBuffer:4*1024*1024}),doc=regular(path.join(ROOT,DOC));same(parentDoc,DOC_BINDING.parent,'NBA_PROGRESS_PARENT_DOC');assert(doc.subarray(0,parentDoc.length).equals(parentDoc));same(doc.subarray(parentDoc.length),DOC_BINDING.tail,'NBA_PROGRESS_DOC_TAIL');same(doc,DOC_BINDING.candidate,'NBA_PROGRESS_DOC');
 const source=sourceSnapshot();assert.equal(Object.keys(source).length,5382);
 for(const file of [WF,SELF,TEST,DOC])assert.equal(source[file].gitBlob,git(['rev-parse','HEAD:'+file]));
 return {source:process.env.GITHUB_SHA,parent:PARENT,parentTree:PARENT_TREE,tree:git(['rev-parse','HEAD^{tree}']),run:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,pid:process.pid,sourceBlobs:5382,parentBlobs:5379,directPaths:4,otherParentBodiesHeld:5378,productChanges:0,copyOverlayOnly:true,helper:source[SELF],newTest:source[TEST],oldTest:source[OLD_TEST],doc:source[DOC]};
}
function sourceHold(label){
 const expected=json('all-source.before.json'),actual=sourceSnapshot();assert.deepEqual(actual,expected,'NBA_PROGRESS_CANONICAL_SOURCE_HELD');
 assert.equal(cp.execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024}),'','NBA_PROGRESS_CANONICAL_CLEAN');
 save(label+'-source-hold.json',{pid:process.pid,source:process.env.GITHUB_SHA,bodies:Object.keys(actual).length,allBodiesHeld:true});
}
function shadowSnapshot(){
 const link=path.join(SHADOW,'node_modules');assert(fs.lstatSync(link).isSymbolicLink(),'NBA_PROGRESS_MODULE_LINK');assert.equal(fs.realpathSync(link),fs.realpathSync(path.join(ROOT,'node_modules')));
 const rows={};function walk(dir,relative=''){for(const item of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const rel=relative?relative+'/'+item.name:item.name,file=path.join(dir,item.name),s=fs.lstatSync(file);if(rel==='node_modules'){assert(s.isSymbolicLink());continue;}assert(!s.isSymbolicLink(),'NBA_PROGRESS_NO_SHADOW_SOURCE_LINK');if(s.isDirectory())walk(file,rel);else{assert(s.isFile());rows[rel]=pin(regular(file));}}}walk(SHADOW);return rows;
}
function shadowHold(label){assert.deepEqual(shadowSnapshot(),json('shadow-source.expected.json'),'NBA_PROGRESS_EXACT_SHADOW_HELD');save(label+'-shadow-hold.json',{pid:process.pid,fullTrackedGraph:true,onlyProductOverlay:CARD,card:pin(regular(path.join(SHADOW,CARD)))});}
function createShadow(){
 assert(!fs.existsSync(SHADOW));fs.mkdirSync(SHADOW);const source=json('all-source.before.json');
 for(const file of Object.keys(source)){const dest=path.join(SHADOW,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(ROOT,file),dest,fs.constants.COPYFILE_EXCL);same(regular(dest),source[file],'NBA_PROGRESS_FULL_TRACKED_COPY');}
 const file=path.join(SHADOW,CARD),original=regular(file);same(original,CARD_PIN);
 let text=original.toString('utf8');const inverses=[];
 for(const stage of COPY_STAGES){same(Buffer.from(text),stage.stageBefore);const at=text.indexOf(stage.before);assert(at>=0&&text.indexOf(stage.before,at+stage.before.length)===-1);assert.equal(at,stage.beforePositions[0]);assert.equal(Buffer.byteLength(text.slice(0,at)),stage.beforeUtf8Positions[0]);inverses.push({at,before:stage.before,after:stage.after});text=text.slice(0,at)+stage.after+text.slice(at+stage.before.length);same(Buffer.from(text),stage.stageAfter);}
 const candidate=Buffer.from(text);same(candidate,CANDIDATE_PIN);assert(!candidate.equals(original));let inverse=text;for(const stage of inverses.reverse()){assert.equal(inverse.slice(stage.at,stage.at+stage.after.length),stage.after);inverse=inverse.slice(0,stage.at)+stage.before+inverse.slice(stage.at+stage.after.length);}assert.equal(inverse,original.toString());
 write('copy-v4/ExtensionCard.original.tsx',original);write('copy-v4/ExtensionCard.candidate.tsx',candidate);save('copy-v4/literal-map.json',{stages:COPY_STAGES,original:CARD_PIN,candidate:CANDIDATE_PIN,fullInverse:true,canonicalMutated:false});
 fs.writeFileSync(file,candidate);assert(regular(file).equals(candidate));fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(SHADOW,'node_modules'),'dir');
 const expected={...source,[CARD]:CANDIDATE_PIN};assert.deepEqual(shadowSnapshot(),expected);save('shadow-source.expected.json',expected);save('shadow-identity.json',{root:SHADOW,canonical:ROOT,files:Object.keys(source).length,config:path.join(SHADOW,'vitest.config.ts'),modules:fs.realpathSync(path.join(SHADOW,'node_modules')),fullTrackedCopy:true,importsRewritten:false,onlyProductOverlay:CARD});
}
function native(id,status){
 const r=json(id+'.closed.json');assert.equal(r.id,id);
 assert(Number.isInteger(r.pid)&&r.pid>0,'BUILD_XI_NATIVE_PID');
 assert.equal(r.status,status,'BUILD_XI_NATIVE_STATUS');assert.equal(r.signal,null);assert.equal(r.error,null);
 assert.equal(r.closed,true);assert.equal(r.deadlineExpired,false);assert.deepEqual(r.signalAttempts,[]);
 assert.equal(r.receiptBytes,0);assert.equal(regular(output(id+'.transport')).length,0);
 for(const stream of ['stdout','stderr']){const b=regular(output(id+'.'+stream));assert.equal(b.length,r[stream+'Bytes']);assert.equal(sha(b),r[stream+'Sha256']);}
 return r;
}
async function run(id,args,status,deadlineMs,extra={},command=process.execPath,cwd=ROOT){
 const receipt=output(id+'.transport');write(id+'.transport','');
 const so=fs.openSync(output(id+'.stdout'),'wx'),se=fs.openSync(output(id+'.stderr'),'wx');
 const r={id,command,args,cwd,overrides:extra,startedAt:new Date().toISOString(),pid:null,status:null,signal:null,error:null,closed:false,deadlineMs,deadlineExpired:false,signalAttempts:[]};
 const child=cp.spawn(command,args,{cwd,detached:true,stdio:['ignore',so,se],env:{...process.env,NODE_OPTIONS:'--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs'),SIM_OFFLINE_RECEIPT:receipt,SIM_NETWORK:'offline',...extra}});
 r.pid=child.pid??null;save(id+'.start.json',r);
 let term=null,kill=null;
 const signalGroup=signal=>{const a={signal,at:new Date().toISOString(),error:null};try{process.kill(-child.pid,signal);}catch(e){a.error={name:e.name,message:e.message,code:e.code??null};}r.signalAttempts.push(a);};
 if(child.pid)term=setTimeout(()=>{r.deadlineExpired=true;signalGroup('SIGTERM');kill=setTimeout(()=>{if(!r.closed)signalGroup('SIGKILL');},15000);},deadlineMs);
 child.on('error',e=>r.error={name:e.name,message:e.message,code:e.code??null});
 await new Promise(resolve=>child.on('close',(code,signal)=>{r.status=code;r.signal=signal;r.closed=true;r.closedAt=new Date().toISOString();resolve();}));
 if(term)clearTimeout(term);if(kill)clearTimeout(kill);fs.closeSync(so);fs.closeSync(se);
 r.receiptBytes=regular(receipt).length;
 for(const stream of ['stdout','stderr']){const b=regular(output(id+'.'+stream));r[stream+'Bytes']=b.length;r[stream+'Sha256']=sha(b);}
 save(id+'.closed.json',r);return {record:r,expectedStatus:status};
}



const declaredCases=suite=>suite.groups.flatMap(group=>group.titles.map(title=>({title,ancestor:group.ancestor,fullName:group.ancestor+' '+title})));
function suiteArgs(file,report,root){return[path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',file,'--config='+path.join(root,'vitest.config.ts'),'--root='+root,'--no-cache','--maxWorkers=1','--no-file-parallelism','--reporter=verbose','--reporter=json','--outputFile='+report];}
function classify(reportFile,suite,root){
 const report=JSON.parse(regular(reportFile)),cases=declaredCases(suite);assert.equal(report.success,true);assert.equal(report.numTotalTests,cases.length);assert.equal(report.numPassedTests,cases.length);assert.equal(report.numFailedTests,0);assert.equal(report.numPendingTests,0);assert.equal(report.numTodoTests,0);assert.equal(report.testResults.length,1);
 const file=report.testResults[0];assert.equal(path.resolve(file.name),path.resolve(root,suite.file));assert.equal(file.status,'passed');assert.equal(file.message??'','');assert.equal(file.assertionResults.length,cases.length);
 for(const expected of cases){const matches=file.assertionResults.filter(row=>row.fullName===expected.fullName);assert.equal(matches.length,1);const row=matches[0];assert.equal(row.title,expected.title);assert.deepEqual(row.ancestorTitles,[expected.ancestor]);assert.equal(row.status,'passed');assert.deepEqual(row.failureMessages,[]);}return{file:suite.file,cases:cases.length,passed:cases.length};
}
function noRuntimeCredit(id){assert(!/Unhandled (?:Errors?|Rejection|Exception)|Error during collection|Failed to load url|Cannot find module|Cannot find package|Test timed out|worker exited unexpectedly/i.test(regular(output(id+'.stdout')).toString()+'\n'+regular(output(id+'.stderr')).toString()),'NBA_PROGRESS_NO_INFRASTRUCTURE_CREDIT');}
function evidence(dir,name){
 const file=path.resolve(dir,name+'.json');assert(file.startsWith(dir+path.sep));const raw=regular(file),value=JSON.parse(raw);
 if(value.encoding!=='concatenated UTF8 JSON')return{value,raw};
 assert(Number.isInteger(value.bytes)&&Array.isArray(value.parts));const parts=value.parts.map(row=>{const full=fs.realpathSync(row.file);assert(full.startsWith(dir+path.sep));const body=regular(full);assert.equal(body.length,row.bytes);assert.equal(sha(body),row.sha256);return body;});const body=Buffer.concat(parts);assert.equal(body.length,value.bytes);assert.equal(sha(body),value.sha256);return{value:JSON.parse(body),raw:body};
}
function progression(arm){
 const dir=output(arm+'-evidence'),summary=evidence(dir,'summary').value;
 assert(['OBSERVED_REAL_20_ROW_BOUNDARY','NOT_REACHED'].includes(summary.status));assert.deepEqual(summary.plannedSeeds,SEEDS);assert.deepEqual(summary.completedSeeds,SEEDS);assert.deepEqual(summary.unrunSeeds,[]);assert.equal(summary.episodes.length,8);
 const controls=[['creation-rows','NBA20_FRESH_ZERO_ROWS'],['history-prefix','NBA20_HISTORY_PREFIX'],['extra-row','NBA20_LEGAL_ROW_GROWTH'],['saved-year','NBA20_ONE_REAL_YEAR'],['reload-row','NBA20_RELOAD_SAVED_BYTES']];
 for(const[id,marker]of controls){const before=evidence(dir,'control-'+id+'.before').raw,changed=evidence(dir,'control-'+id+'.changed').raw,restored=evidence(dir,'control-'+id+'.restored').raw,work=regular(path.join(dir,'control-'+id+'.work.json')),diagnostic=evidence(dir,'control-'+id+'.diagnostic').value;assert(!changed.equals(before));assert(restored.equals(before)&&work.equals(before));assert.equal(diagnostic.name,'AssertionError');assert(diagnostic.message.includes(marker)&&diagnostic.stack.includes(marker));}
 for(let i=0;i<8;i++){const episode=summary.episodes[i];assert.equal(episode.seed,SEEDS[i]);assert(episode.actions>0&&episode.actions<=512);assert(episode.rows>=0&&episode.rows<=21);assert(['EARLY_RETIRED','REACHED_20_THEN_RETIRED','ROW_LIMIT_REACHED_ACTIVE'].includes(episode.outcome));assert.equal(episode.reached20,episode.rows>=20);const rng=evidence(dir,'seed-'+i+'.rng').value;assert.equal(rng.seed,SEEDS[i]);assert.equal(rng.cursor,rng.values.length);for(const value of rng.values)assert(Number.isFinite(value)&&value>=0&&value<1);}
 return summary;
}
function pairEvidence(baseline,candidate){
 function records(arm,summary){
  const dir=output(arm+'-evidence'),names=new Set(),rows=new Map(),cards=new Map();
  for(const reference of summary.references){const file=fs.realpathSync(reference.file);assert(file.startsWith(dir+path.sep));const body=regular(file);assert.equal(body.length,reference.bytes);assert.equal(sha(body),reference.sha256);const name=path.basename(file).replace(/\.json$/,'');assert(!names.has(name));names.add(name);rows.set(name,evidence(dir,name).value);}
  const expected=new Set();
  for(let i=0;i<8;i++){const episode=summary.episodes[i],prefix='seed-'+i;for(const suffix of ['initial','rng','outcome'])expected.add(prefix+'.'+suffix);let copyIndex=0;
   for(let n=1;n<=episode.actions;n++){const name=prefix+'.action-'+String(n).padStart(4,'0');expected.add(name);const action=rows.get(name);assert(action,'NBA_PROGRESS_ACTION_MEMBER');
    if(action.kind==='extension-decline'){const witness=episode.encounteredCopy[copyIndex++];assert(witness&&typeof witness.text==='string'&&witness.text.length>0);const raw=action.before.raw,text=witness.text;assert(typeof raw==='string'&&raw.length>0);assert.equal(action.before.text.split(text).length-1,1,'NBA_PROGRESS_CARD_WITNESS');if(cards.has(raw))assert.equal(cards.get(raw),text);else cards.set(raw,text);}
   }assert.equal(copyIndex,episode.encounteredCopy.length);
  }
  for(const id of ['creation-rows','history-prefix','extra-row','saved-year','reload-row'])for(const role of ['before','changed','restored','diagnostic'])expected.add('control-'+id+'.'+role);
  assert.deepEqual([...names].sort(),[...expected].sort(),'NBA_PROGRESS_EVIDENCE_CENSUS');return{rows,cards};
 }
 const a=records('baseline',baseline),b=records('candidate',candidate);
 function textEqual(left,right,raw){
  if(left===right)return;
  assert(a.cards.has(raw)&&b.cards.has(raw),'NBA_PROGRESS_ONLY_WITNESSED_CARD_TEXT');
  const first=a.cards.get(raw),second=b.cards.get(raw);assert.equal(left.split(first).length-1,1);assert.equal(right.split(second).length-1,1);
  assert.equal(left.replace(first,'[reviewed ExtensionCard copy]'),right.replace(second,'[reviewed ExtensionCard copy]'),'NBA_PROGRESS_SURROUNDING_TEXT_HELD');
 }
 function snapshotEqual(left,right){assert.equal(left.raw,right.raw,'NBA_PROGRESS_PAIRED_SAVE_BYTES');assert.equal(left.rngAt,right.rngAt,'NBA_PROGRESS_PAIRED_CURSOR');assert.deepEqual(left.buttons,right.buttons,'NBA_PROGRESS_PAIRED_BUTTONS');if('save'in left||'save'in right)assert.deepEqual(left.save,right.save);textEqual(left.text,right.text,left.raw);}
 const selected=[];
 for(let i=0;i<8;i++){
  const one=baseline.episodes[i],two=candidate.episodes[i];const strip=episode=>({...episode,encounteredCopy:episode.encounteredCopy.map(({text,...rest})=>rest)});
  assert.deepEqual(strip(one),strip(two),'NBA_PROGRESS_PAIRED_ENDPOINT');
  assert.deepEqual(a.rows.get('seed-'+i+'.rng'),b.rows.get('seed-'+i+'.rng'),'NBA_PROGRESS_PAIRED_RNG_TAPE');
  snapshotEqual(a.rows.get('seed-'+i+'.initial'),b.rows.get('seed-'+i+'.initial'));
  for(let n=1;n<=one.actions;n++){const name='seed-'+i+'.action-'+String(n).padStart(4,'0'),left=a.rows.get(name),right=b.rows.get(name);
   assert.equal(left.kind,right.kind);assert.equal(left.buttonText,right.buttonText,'NBA_PROGRESS_SELECTED_LABEL');assert.deepEqual(left.rng,right.rng,'NBA_PROGRESS_ACTION_RNG');
   snapshotEqual(left.before,right.before);snapshotEqual(left.after,right.after);
  }
  assert.deepEqual(strip(a.rows.get('seed-'+i+'.outcome')),strip(b.rows.get('seed-'+i+'.outcome')));
  for(let n=0;n<one.encounteredCopy.length;n++){const left=one.encounteredCopy[n],right=two.encounteredCopy[n];assert.equal(typeof right.text,'string');assert.equal(left.atRows,right.atRows);assert.equal(left.branch,right.branch);assert.equal(left.kind,right.kind);}
  selected.push({seed:one.seed,actions:one.actions,actualRows:one.rows,outcome:one.outcome,reached20:one.reached20,reloads:one.reloads,copyBranches:one.encounteredCopy.map(row=>row.branch)});
 }
 for(const id of ['creation-rows','history-prefix','extra-row','saved-year','reload-row']){
  for(const role of ['before','changed','restored'])snapshotEqual(a.rows.get('control-'+id+'.'+role),b.rows.get('control-'+id+'.'+role));
  const left=a.rows.get('control-'+id+'.diagnostic'),right=b.rows.get('control-'+id+'.diagnostic');assert.equal(left.name,right.name);assert.equal(left.message,right.message);
 }
 const omit=summary=>{const{references,episodes,...rest}=summary;return rest;};assert.deepEqual(omit(baseline),omit(candidate),'NBA_PROGRESS_PAIRED_SUMMARY');
 return{source:process.env.GITHUB_SHA,pid:process.pid,seeds:8,outcome:baseline.status,target20Observed:baseline.status==='OBSERVED_REAL_20_ROW_BOUNDARY',pairedStatesActionsAndRngExact:true,onlyAllowedDisplayDifference:'Actual retained ExtensionCard blocks, joined by exact saved bytes and witnessed at actual decline; every surrounding text byte and all button labels held.',episodes:selected,copyBranchesObserved:baseline.copyBranchesObserved,copyBranchesUntested:baseline.copyBranchesUntested,controlsPerArm:5,newSourceFaultTrips:0,reporterSaveReproduced:false,bugFixed:false,actualBrowser:false,scope:'Finite fresh-career jsdom diagnostic only. NOT_REACHED is not reproduction, repair or refutation; active21 is retained as its own endpoint.'};
}
async function checks(){
 save('orchestrator.start.json',{pid:process.pid,source:process.env.GITHUB_SHA});createShadow();
 const results=[];
 for(const arm of ['baseline','candidate']){
  const root=arm==='baseline'?ROOT:SHADOW;
  await run(arm+'-types',[path.join(ROOT,'node_modules/typescript/bin/tsc'),'--noEmit','-p',path.join(root,'tsconfig.app.json')],0,240000,{},process.execPath,root);native(arm+'-types',0);noRuntimeCredit(arm+'-types');
  await run(arm+'-saved-board',suiteArgs(OLD_TEST,output(arm+'-saved-board.json'),root),0,240000,{},process.execPath,root);native(arm+'-saved-board',0);noRuntimeCredit(arm+'-saved-board');classify(output(arm+'-saved-board.json'),OLD_SUITE,root);
  await run(arm+'-progression',suiteArgs(TEST,output(arm+'-progression.json'),root),0,240000,{NBA_SEASON20_PROGRESSION_OUT:output(arm+'-evidence')},process.execPath,root);native(arm+'-progression',0);noRuntimeCredit(arm+'-progression');classify(output(arm+'-progression.json'),PROGRESSION_SUITE,root);results.push(progression(arm));
  sourceHold(arm);shadowHold(arm);
 }
 const pair=pairEvidence(results[0],results[1]);save('paired-progression.json',pair);
 save('functional-admission.json',{source:process.env.GITHUB_SHA,pid:process.pid,commands:6,baselineCases:17,candidateCases:17,actualSeedsPerArm:8,copyOverlayOnly:true,progressionOutcome:pair.outcome,sourceFaultTriplets:0,copiedDataControlsPerArm:5,noBrowserBuildOrFullSuite:true,reporterSaveUnavailable:true,live:false});
}
if(mode==='source'){save('source-binding.json',binding());save('all-source.before.json',sourceSnapshot());}
else if(mode==='checks')await checks();
else if(mode==='final'){
 const before=json('source-binding.json'),now=binding();assert.deepEqual({...now,pid:before.pid},before);
 const rows=ids.map(id=>native(id,0));assert.equal(new Set(rows.map(row=>row.pid)).size,6);ids.forEach(noRuntimeCredit);
 for(const arm of ['baseline','candidate']){const root=arm==='baseline'?ROOT:SHADOW;classify(output(arm+'-saved-board.json'),OLD_SUITE,root);classify(output(arm+'-progression.json'),PROGRESSION_SUITE,root);progression(arm);}
 const paired=json('paired-progression.json');assert.equal(paired.source,process.env.GITHUB_SHA);assert.equal(paired.seeds,8);
 sourceHold('final');shadowHold('final');
 const outer=[before.pid,json('orchestrator.start.json').pid,process.pid];assert.equal(new Set([...rows.map(row=>row.pid),...outer]).size,9);
 for(const id of ['foundation','orchestrator']){assert.equal(regular(output(id+'.exit')).toString().trim(),'0');assert.equal(regular(output(id+'.transport')).length,0);}
 save('native-selected-processes.json',{source:process.env.GITHUB_SHA,rows,outerPids:outer,supervised:6,outer:3,guardedSelectedCohorts:9,scope:'Selected commands, not every Vitest worker. npm ci is separate installation.'});
 save('final-binding.json',{source:process.env.GITHUB_SHA,pid:process.pid,commands:6,seedsPerArm:8,pairedOutcome:paired.outcome,canonicalSourceHeld:true,onlyShadowOverlay:CARD,controlsPerArm:5,fullSuite:false,build:false,browser:false,productAdopted:false,live:false});
}else throw Error('Unknown NBA progression mode');
}
main(process.argv[2]).then(()=>console.log('NBA fresh progression '+process.argv[2]+' complete, pid '+process.pid)).catch(error=>{console.error(error.stack||error);process.exitCode=1;});

