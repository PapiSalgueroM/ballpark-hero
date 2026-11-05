import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';

const CURRENT='76e2af6a555d86743a481a50c24dccb8348b26b7',TREE='8106a333f4e95ecb7f9197c98e4708ec232080b6';
const PINS={"scripts/lib/careerClubPool.mjs":"9ac9f0b9437f68e6a6b1f20c640afce109a8352f","src/data/soccerCareerClubPool.ts":"9340217fac2ae3a86877ac878fcd677d22c973bd","src/lib/clubManager.ts":"4b0a734e9fe9ba1e7139ead8d4fe5d6a1574c484","src/data/clubManagerRosters.ts":"66fc430c504bfb97e5fd17762ed3084c2ff6c205","scripts/data/soccerCareerFacts.json":"5a8bcd1ae9b048d2bfa6b759b6b8fff1a7131e13","src/lib/soccerCareerEngine.ts":"94ccfb82dace9fc099c670357472732973e11d73","src/lib/careerEras.ts":"e037022342382b1df9c8a5ede620d2cce480bc23","src/lib/soccerCareerLeagueWorld.ts":"72fcabdd0c557a743aa849b01208140c3030048f","src/data/soccerCareerLowerClubs.ts":"88318bbb4103ae91dccba1671b42b8e13fe3ddbc","src/lib/soccerCareerCup.ts":"1d93842578afa4fb92ed3c012701022fbf9d2e9c","scripts/data/domesticCupSources.json":"7ca21b866ac6641ff953c60c64f531bd674e48ce","src/lib/soccerCareerSave.ts":"86ec011693fd5bc702b5e8ccec05d27775a72a76","src/data/leagueFormat.ts":"802650466c0c4439f12c741e7d1ae28957280f9b","src/pages/SoccerCareer.tsx":"e191a4634c44be5ebe511da0885579fdb6696dc5","src/components/FlagImg.tsx":"f415a12892f747ecf07414e61710584ca98be6a8","src/lib/confederationGroups.ts":"6e7fc26724cb56c6c6f5a1a68be4e32d41dbc3cd","src/lib/soccerCareerLeague.ts":"3bf1c117da22ea2253b8dce264da1ea3a49a0517"};
const GOLDEN={"canonical":{"bytes":341864,"sha256":"de3dbd88e9d8513254c68d398a134582d9f96d06cf685e1f558e16646099d11d"},"academy":{"bytes":99044,"sha256":"9f3c0c4101f19d1b3785e2aaf94e169b5bc99458b0c17579d66cc93d0c2a004c"},"world":{"bytes":172407,"sha256":"a745b5d20367b551b599b802e7c5f8495f33b6c2b6793def311ada48f604ed1b"},"history":{"bytes":664702,"sha256":"9417f1c872bce7082fdea69c4b78a4bd16582d3b1bce2c90fbaa9d7513763e81"},"cup":{"bytes":124444,"sha256":"a5ca1edaad1758c6f596289a6524d258e67d59df10c3eff58e4c6368d454e41b"},"savedOffers":{"bytes":147189,"sha256":"9eb5f205e07f525351e8766441b55f5e3570265f7500b75c36db9eb47b1bbeed"},"creation-ui":{"bytes":493593,"sha256":"bfc4312f78c97db2daa25ecbbbb073fbda83be5a54599b51c42034c835f9aa45"}};
const ORIGINAL_RAW={"canonical":"0c7d95b7d24194b653fef31569b6a770435aae94506ed7963f41bc51c13a61f7","academy":"6d3d0540e144373b48ab773b8e66f04a91841e2ce9c99baaecf25ddf0aa22e6f","world":"263ad3f1df7cdc2d3fc527db98e68eb1d65d6359f25311946a2e0c02b3513cc0","history":"9417f1c872bce7082fdea69c4b78a4bd16582d3b1bce2c90fbaa9d7513763e81","cup":"11530c399e7de5930e55f1f82f93b4bc57edc19248a6e6250bb4677004149485","savedOffers":"9eb5f205e07f525351e8766441b55f5e3570265f7500b75c36db9eb47b1bbeed","creation-ui":"3ed114701db356f65db3559fbeb54f3ef34a26af068c6cff0a406ea50550a3bf"};
const ORIGINAL={run:41958380733,job:127018622387,artifact:13383634508,bytes:2675629,sha256:'3e9c89a2a24207957761b640ede622c587d97c2daaeaaeddd8498afb3d82119e'};
const args=process.argv.slice(2);
assert.equal(args.length,6);assert.equal(args[0],'--out');assert.equal(args[2],'--reference');assert.equal(args[4],'--reference-zip');
assert(process.env.CI,'Remote isolated CI only');
const root=process.cwd(),out=path.resolve(args[1]),reference=path.resolve(args[3]),zip=path.resolve(args[5]);
assert(!out.startsWith(root+path.sep),'Evidence must remain outside tracked checkout');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');};
const git=(...argv)=>execFileSync('git',argv,{cwd:root,maxBuffer:32*1024*1024}).toString().trim();
const tracked=git('ls-files','-z').split('\0').filter(Boolean).sort();
const inventory=()=>Object.fromEntries(tracked.map(file=>[file,sha(fs.readFileSync(file))]));
const status=()=>git('status','--porcelain=v1','--untracked-files=all');
const casesPath='scripts/qa/soccerSegundaBridgeCases.json',readerPath='scripts/qa/soccerSegundaBridgeEvidence.mjs';
assert.equal(sha(fs.readFileSync(casesPath)),'7d88b73e0b2bd4e16c995b6799a25345de7bbc642078e36aba258a6cf2ef1ca3');
assert.equal(sha(fs.readFileSync(readerPath)),'c0ca1003f6b3a3ae4d59b1b1e62b79c56f4f3964ee2f0b90f973a60051dc2af2');
const cases=read(casesPath);assert.equal(cases.cases.length,7);assert.equal(cases.files.length,2);
assert.equal(git('rev-parse','HEAD^'),CURRENT);assert.equal(git('rev-parse',CURRENT+'^{tree}'),TREE);
assert.equal(status(),'');
for(const[file,pin]of Object.entries(PINS))assert.equal(blob(fs.readFileSync(file)),pin,file+' current body');
for(const file of cases.files)assert.equal(sha(fs.readFileSync(file.path)),file.sha256,file.path+' frozen test');
for(const key of ['SEGUNDA_EVIDENCE_DIR','NODE_OPTIONS','RECORD','SEEDS','CAREERS'])assert(!process.env[key],'No inherited test or transport override '+key);
process.env.GIT_NO_LAZY_FETCH='1';
const before=inventory(),head=git('rev-parse','HEAD');
write(path.join(out,'source-before.json'),before);write(path.join(out,'source.txt'),head+'\n'+git('rev-parse','HEAD^{tree}')+'\n');
const report={status:'incomplete',head,productCore:CURRENT,productTree:TREE,sourcePins:PINS,arms:[],
  reference:{run:41963050038,job:127033652938,artifact:13387325465,bytes:8637413,sha256:'699840a8b4eccb73ae5b461db50ed81fac85c23544de5e2074a129f093b3989c'},
  scope:'Two fresh fixed seven-case measurements and complete RAW/reference parity with the admitted pre-guard fixed source. No new fault, build, native, public, normal-harness or whole-suite credit. Existing normal 582 assertions remain unwaived.'};
let failure=null;
const referenceFiles=['admission.json','held-reference.json','generator-derived.json','generator-inputs.json','generator-rendered.ts','original-neutral-offer-profile.json'];
const capture=(relative,dest=relative)=>{
  const b=fs.readFileSync(path.join(reference,relative));write(path.join(out,'input-provenance',dest),b);return b;
};
const same=(a,b,label)=>assert.deepEqual(fs.readFileSync(a),fs.readFileSync(b),label);
const holds=()=>{assert.deepEqual(inventory(),before,'Complete tracked source and lock bytes held');assert.equal(status(),'');};
function child(dir,label,command,argv,extra={}){
  fs.mkdirSync(dir,{recursive:true});
  const receipt=path.join(dir,label+'-transport.log');write(receipt,'');
  const result=spawnSync(command,argv,{cwd:root,env:{...process.env,NODE_OPTIONS:'--require='+path.join(root,'scripts/lib/offlineTransport.cjs'),SIM_NETWORK:'offline',SIM_OFFLINE_RECEIPT:receipt,...extra},encoding:'utf8',timeout:20*60*1000,maxBuffer:40*1024*1024});
  write(path.join(dir,label+'.stdout.log'),result.stdout??'');write(path.join(dir,label+'.stderr.log'),result.stderr??'');
  write(path.join(dir,label+'.native.json'),{command:[command,...argv],nativeExit:result.status,signal:result.signal,error:result.error?String(result.error):null});
  assert.equal(result.error,undefined);assert.equal(result.signal,null);assert.equal(result.status,0,label+' actual native exit');
  assert.equal(fs.statSync(receipt).size,0,'Silent offline transport');
  assert(!/\b(?:Unhandled\s+(?:Errors?|Rejection|Exception)|Vitest caught|uncaughtException|unhandledRejection)\b/i.test((result.stdout??'')+'\n'+(result.stderr??'')),'No hidden child runtime error');
  holds();return result;
}
function measure(name,baseline,priorFixed){
  const dir=path.join(out,name);
  child(dir,'types',path.join(root,'node_modules/.bin/tsc'),['--noEmit','-p','tsconfig.app.json']);
  write(path.join(dir,'types-passed.json'),{command:'node_modules/.bin/tsc --noEmit -p tsconfig.app.json',exit:0});
  child(dir,'vitest',process.execPath,['node_modules/vitest/vitest.mjs','run',...cases.files.map(file=>file.path),'--maxWorkers=1','--minWorkers=1','--reporter=json','--outputFile='+path.join(dir,'vitest.json')],{SEGUNDA_EVIDENCE_DIR:path.join(dir,'evidence')});
  child(dir,'reader',process.execPath,[readerPath,'--out',dir,'--mode','fixed','--exit-code','0','--baseline',baseline,'--cases',casesPath]);
  const admission=read(path.join(dir,'admission.json'));
  assert.equal(admission.status,'fixed-admitted');assert.equal(admission.nativeVitestExit,0);assert.equal(admission.sourceAndOfflineHeld,true);
  assert.deepEqual(admission.tests,read(path.join(priorFixed,'admission.json')).tests);
  for(const item of cases.cases){
    const file=path.join(dir,'evidence',item.raw+'.json'),b=fs.readFileSync(file),want=GOLDEN[item.raw];
    assert.equal(b.length,want.bytes);assert.equal(sha(b),want.sha256,item.raw+' immutable pre-guard RAW');
    same(file,path.join(priorFixed,'evidence',item.raw+'.json'),'Whole old fixed RAW including all frames, references and import/action tapes');
  }
  for(const file of referenceFiles.filter(file=>file!=='admission.json'))same(path.join(dir,file),path.join(priorFixed,file),'Whole pre-guard '+file);
  report.arms.push({name,nativeVitestExit:0,readerStatus:admission.status,evidence:admission.evidence,wholeRawAndReferencesExact:true});
  return dir;
}
try{
  const z=fs.readFileSync(zip);assert.equal(z.length,report.reference.bytes);assert.equal(sha(z),report.reference.sha256,'Exact authenticated outcomes ZIP');
  const prior=read(path.join(reference,'results/outcomes.json'));
  assert.equal(prior.status,'admitted');assert.equal(prior.head,'826d551ed3be6d0ca72a8721ff3cb429446265c5');
  assert.equal(prior.tree,'9b5a32b889a20b3f156775fa56253ac985f75091');assert.equal(prior.finalSourceAndLockHeld,true);assert.deepEqual(prior.originalInput,ORIGINAL);
  assert.equal(fs.readFileSync(path.join(reference,'controller-native-exit.txt'),'utf8').trim(),'0');
  same(path.join(reference,'source-before.json'),path.join(reference,'source-after.json'),'Authenticated reference whole source hold');
  for(const file of ['status-before.txt','status-after.txt','transport/controller.log'])assert.equal(fs.statSync(path.join(reference,file)).size,0);
  const first=read(path.join(reference,'input-provenance/original-admission.json'));
  assert.equal(first.status,'original-admitted');assert.equal(first.head,'abd5f1d616a14da15c76ef380a4447a09a62cd86');assert.equal(first.sourceAndOfflineHeld,true);
  const baseline=path.join(out,'input-provenance','original'),fixed=path.join(out,'input-provenance','fixed');
  for(const mode of ['original','fixed','restored-fixed']){
    const admitted=read(path.join(reference,'results',mode,'admission.json'));
    assert.equal(admitted.status,mode==='original'?'original-admitted':'fixed-admitted');assert.equal(admitted.sourceAndOfflineHeld,true);
    assert.equal(admitted.nativeVitestExit,mode==='original'?1:0);assert.deepEqual(admitted.tests,first.tests);
    for(const file of referenceFiles)capture('results/'+mode+'/'+file,mode+'/'+file);
    for(const item of cases.cases){
      const relative='results/'+mode+'/evidence/'+item.raw+'.json',b=capture(relative,mode+'/evidence/'+item.raw+'.json');
      const want=mode==='original'?first.evidence[item.raw]:GOLDEN[item.raw];
      assert.equal(b.length,want.bytes);assert.equal(sha(b),want.sha256);
      assert.equal(admitted.evidence[item.raw].sha256,want.sha256);
      assert.equal(prior.arms.find(arm=>arm.name===mode).evidence[item.raw],want.sha256);
      if(mode==='original')assert.equal(sha(b),ORIGINAL_RAW[item.raw],'Repeated original RAW exact to sole original admission');
    }
  }
  for(const item of cases.cases)same(path.join(fixed,'evidence',item.raw+'.json'),path.join(out,'input-provenance','restored-fixed','evidence',item.raw+'.json'),'Prior restored fixed RAW exact');
  capture('results/outcomes.json','outcomes.json');capture('input-provenance/original-admission.json','original-admission.json');
  capture('source-before.json','source-before.json');capture('source-after.json','source-after.json');capture('source-hold.json','source-hold.json');
  write(path.join(out,'input-provenance','frozen-golden.json'),{originalInput:ORIGINAL,preGuardFixed:GOLDEN,
    factsNoteBridge:{run:41975418941,job:127073014161,head:'b3d80f793350da32b39e4d06a21edd470f78005e',artifact:13391961458,allSevenRawExactToPreGuardFixed:true,authority:'Previously admitted separate facts-note measurement; this workflow directly authenticates and repeats the earlier fixed RAW, without reacquiring that artifact.'}});
  const a=measure('fixed',baseline,fixed),b=measure('repeat-fixed',baseline,fixed);
  for(const item of cases.cases)same(path.join(a,'evidence',item.raw+'.json'),path.join(b,'evidence',item.raw+'.json'),'Two fresh whole RAW files exact');
  for(const file of referenceFiles.filter(file=>file!=='admission.json'))same(path.join(a,file),path.join(b,file),'Two fresh reference files exact');
  report.status='admitted';
}catch(error){failure=error;report.error=String(error?.stack??error);}
finally{
  try{holds();report.finalSourceAndLockHeld=true;}
  catch(error){failure??=error;report.status='incomplete';report.holdError=String(error?.stack??error);}
  write(path.join(out,'source-after.json'),inventory());write(path.join(out,'status-after.txt'),status());
  write(path.join(out,'qualification.json'),report);
}
if(failure)throw failure;
assert.equal(report.arms.length,2);
console.log('SC_SEGUNDA_FROZEN_SEVEN_ADMITTED 2 x 7 passed; all complete RAW and generator/reference files exact to admitted pre-guard fixed evidence');
