import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const sha=b=>createHash('sha256').update(b).digest('hex');
const react=['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime'];
export async function buildSoccerManagerFocusFixedObserver({root=process.cwd(),out,worker=false}={}){
 root=path.resolve(root);
 const page=path.join(root,'src/pages/SoccerCareer.tsx'),raw=fs.readFileSync(page),source=raw.toString('utf8');
 const engine=path.join(root,'src/lib/soccerCareerEngine.ts'),engineRaw=fs.readFileSync(engine);
 const original=path.join(root,'qa/sc-manager-season-focus-v1/original/soccerCareerEngine.ts'),originalRaw=fs.readFileSync(original);
 assert.equal(sha(originalRaw),'bf4beb5151213325277a44c83cef6a72528d14b612368b8db70c7b2288508708','Retained pre-feature Engine');
 assert.equal((source.match(/function ManagerPanel\(/g)||[]).length,1);
 assert.equal((source.match(/function GameScreen\(/g)||[]).length,1);
 const appendix="\nexport { GameScreen, ManagerPanel };\nexport * as engine from '@/lib/soccerCareerEngine';\nexport * as save from '@/lib/soccerCareerSave';\nexport * as focus from '@/lib/soccerCareerManagerFocus';\nexport * as jobs from '@/lib/soccerCareerManagerJobReview';\n";
 assert(!source.includes(appendix),'Observer export is new');
 const observed=source+appendix,owned=out===undefined;
 let cacheRoot;
 if(owned){cacheRoot=path.join(fs.realpathSync(path.join(root,'node_modules')),'.cache');fs.mkdirSync(cacheRoot,{recursive:true});out=fs.mkdtempSync(path.join(cacheRoot,'sc-manager-focus-observer-'));}
 else{out=path.resolve(out);fs.mkdirSync(out,{recursive:true});}
 const file=path.join(out,'observed-page.cjs'),referenceFile=path.join(out,'original-engine.cjs');
 let disposed=false;
 const held=()=>{assert.equal(sha(fs.readFileSync(page)),sha(raw),'Canonical Page held');assert.equal(sha(fs.readFileSync(engine)),sha(engineRaw),'Canonical Engine held');assert.equal(sha(fs.readFileSync(original)),sha(originalRaw),'Retained Engine held');};
 const dispose=()=>{if(disposed)return;disposed=true;try{held();}finally{if(owned){assert.equal(path.dirname(out),cacheRoot);assert(path.basename(out).startsWith('sc-manager-focus-observer-'));fs.rmSync(out,{recursive:true,force:true});}}};
 try{
  const fromRoot=createRequire(path.join(root,'package.json')),fromObserver=createRequire(file),reactRuntime={};
  for(const name of react){const expected=fs.realpathSync(fromRoot.resolve(name)),actual=fs.realpathSync(fromObserver.resolve(name));assert.equal(actual,expected,name+' actual root identity');reactRuntime[name]={root:expected,observer:actual};}
  if(!worker){
   const moduleUrl=pathToFileURL(fileURLToPath(import.meta.url)).href;
   const program='const {buildSoccerManagerFocusFixedObserver}=await import('+JSON.stringify(moduleUrl)+');const built=await buildSoccerManagerFocusFixedObserver('+JSON.stringify({root,out,worker:true})+');process.stdout.write(JSON.stringify(built.observer));';
   const child=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,env:{...process.env},encoding:'utf8',timeout:45_000,maxBuffer:1024*1024});
   fs.writeFileSync(path.join(out,'observer-child.stdout.log'),child.stdout||'');fs.writeFileSync(path.join(out,'observer-child.stderr.log'),child.stderr||'');
   assert.ifError(child.error);assert.equal(child.signal,null);assert.equal(child.status,0,'Actual Node observer child: '+(child.stderr||''));assert.equal(child.stderr,'');
   const observer=JSON.parse(child.stdout);
   assert.equal(observer.canonicalSha256,sha(raw));assert.equal(observer.observedSha256,sha(observed));assert.equal(observer.appendix,appendix);assert.equal(observer.onlyAppendedExports,true);
   assert.equal(observer.compiledSha256,sha(fs.readFileSync(file)));assert.equal(observer.reference.compiledSha256,sha(fs.readFileSync(referenceFile)));assert.equal(observer.reference.originalSHA256,sha(originalRaw));
   assert.equal(observer.engineInputs,1);assert.equal(observer.reference.engineInputs,1);assert.deepEqual(observer.reactRuntime,reactRuntime);
   assert.equal(fs.readFileSync(path.join(out,'observed-page.tsx'),'utf8'),observed);held();
   return{file,referenceFile,dispose,owned,observer};
  }
  const {build}=await import('esbuild');
  fs.writeFileSync(path.join(out,'observed-page.tsx'),observed);
  const normalized=f=>path.resolve(f).replaceAll('\\','/').toLowerCase(),target=normalized(page),engineTarget=normalized(engine);
  const options={bundle:true,format:'cjs',platform:'node',jsx:'automatic',nodePaths:[path.join(root,'node_modules')],external:react,alias:{'@':path.join(root,'src')},define:{'import.meta.env':JSON.stringify({PROD:true,DEV:false,MODE:'test',BASE_URL:'/'})},loader:{'.css':'empty','.svg':'empty','.png':'empty','.jpg':'empty','.webp':'empty'},metafile:true,logLevel:'error'};
  let loaded=0;
  const built=await build({...options,stdin:{contents:"export {GameScreen,ManagerPanel,engine,save,focus,jobs} from './src/pages/SoccerCareer';",resolveDir:root,loader:'ts'},outfile:file,
   plugins:[{name:'append-actual-page-exports',setup(b){b.onLoad({filter:/SoccerCareer\.tsx$/},args=>{if(normalized(args.path)!==target)return;loaded++;held();return{contents:observed,loader:'tsx',resolveDir:path.dirname(args.path)};});}}],
  });
  assert.equal(loaded,1,'One actual Page observer load');
  const countEngine=meta=>Object.keys(meta.inputs).filter(p=>normalized(path.resolve(root,p))===engineTarget).length;
  const engineInputs=countEngine(built.metafile);assert.equal(engineInputs,1,'One canonical Engine in actual Page bundle');
  fs.writeFileSync(path.join(out,'observed-page.metafile.json'),JSON.stringify(built.metafile,null,2));
  let referenceLoads=0;
  const reference=await build({...options,stdin:{contents:"export * as engine from '@/lib/soccerCareerEngine';export * as save from '@/lib/soccerCareerSave';",resolveDir:root,loader:'ts'},outfile:referenceFile,
   plugins:[{name:'retained-pre-feature-engine',setup(b){b.onLoad({filter:/soccerCareerEngine\.ts$/},args=>{if(normalized(args.path)!==engineTarget)return;referenceLoads++;held();return{contents:originalRaw.toString('utf8'),loader:'ts',resolveDir:path.dirname(engine)};});}}],
  });
  assert.equal(referenceLoads,1,'One retained Engine load in separate reference bundle');const referenceInputs=countEngine(reference.metafile);assert.equal(referenceInputs,1);
  fs.writeFileSync(path.join(out,'original-engine.metafile.json'),JSON.stringify(reference.metafile,null,2));held();
  return{file,referenceFile,dispose,owned,observer:{canonicalSha256:sha(raw),observedSha256:sha(observed),appendix,onlyAppendedExports:true,compiledSha256:sha(fs.readFileSync(file)),engineInputs,engineSHA256:sha(engineRaw),reactRuntime,reference:{file:referenceFile,compiledSha256:sha(fs.readFileSync(referenceFile)),originalSHA256:sha(originalRaw),engineInputs:referenceInputs,scope:'Only Engine is frozen in separate reference bundle; every other dependency is current. Module initialization is excluded and unmeasured, not an import-RNG claim.'}}};
 }catch(error){dispose();throw error;}
}
