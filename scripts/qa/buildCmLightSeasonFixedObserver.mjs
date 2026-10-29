import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const sha=body=>createHash('sha256').update(body).digest('hex');
const react=['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime'];
const pins={
  'src/lib/clubManager.ts':'4c3863cfd5a676bdbf4415fef337886b9324a2ae255a4389f12a8269eaa7735d',
  'src/components/club-manager/TrainingScreen.tsx':'ac9fbad9de7b0d9c33cedc32d45723361a36454f9759522aa203d964da6124a2',
  'src/components/club-manager/IndividualLightSeason.tsx':'5dd992d1a55a7b4a0657cc6b5500150ced0bbbb61d85e6898441861d0ba85a63',
  'src/hooks/useClubManager.ts':'dce880b04eb80792eb3ea97354aa5f0d146f89c5280f57055c04dbb1db274b62',
  'src/pages/ClubManager.tsx':'22020e1efc2b71069afb3d8c6cb2ba5fc00cc0a7abf3aa306fd7964d379d308c',
};
const oldPath='qa/cm-light-season-v1/original/clubManager.ts';
const appendix='\nexport { tickWeek as cmLightWeek, nightSquadTick as cmLightNight, agePlayer as cmLightAge, returnLoanedPlayers as cmLightLoanReturn };\n';

export async function buildCmLightSeasonObserver({root=process.cwd(),out,worker=false}={}){
  root=path.resolve(root);
  const engine=path.join(root,'src/lib/clubManager.ts'),source=fs.readFileSync(engine,'utf8');
  const old=fs.readFileSync(path.join(root,oldPath),'utf8');
  const held=()=>Object.fromEntries(Object.entries(pins).map(([file,pin])=>{
    const actual=sha(fs.readFileSync(path.join(root,file)));assert.equal(actual,pin,'Exact PR420 source '+file);return[file,actual];
  }));
  const before=held();assert.equal(sha(old),'05de3cfca8d978e6117979fb29b82b2ece7b9fb6ee1f2ce3c051e379e36de86e','Actual retained PR420 engine');
  for(const name of ['tickWeek','nightSquadTick','agePlayer','returnLoanedPlayers'])assert.equal((source.match(new RegExp('function '+name+'\\(','g'))||[]).length,1,'One actual private '+name);
  assert(!source.includes(appendix)&&!old.includes(appendix),'Only new QA exports');
  const owned=out===undefined;
  let cacheRoot;
  if(owned){cacheRoot=path.join(fs.realpathSync(path.join(root,'node_modules')),'.cache');fs.mkdirSync(cacheRoot,{recursive:true});out=fs.mkdtempSync(path.join(cacheRoot,'cm-light-season-observer-'));}
  else{out=path.resolve(out);fs.mkdirSync(out,{recursive:true});}
  const file=path.join(out,'observed.cjs'),baseFile=path.join(out,'base.cjs');
  let disposed=false;
  const dispose=()=>{
    if(disposed)return;disposed=true;
    try{assert.deepEqual(held(),before,'Canonical source held through cleanup');}
    finally{if(owned){assert.equal(path.dirname(out),cacheRoot);assert(path.basename(out).startsWith('cm-light-season-observer-'));fs.rmSync(out,{recursive:true,force:true});}}
  };
  try{
    const fromRoot=createRequire(path.join(root,'package.json')),fromObserver=createRequire(file),reactRuntime={};
    for(const name of react){const expected=fs.realpathSync(fromRoot.resolve(name)),actual=fs.realpathSync(fromObserver.resolve(name));assert.equal(actual,expected,name+' actual root identity');reactRuntime[name]={root:expected,observer:actual};}
    if(!worker){
      const moduleUrl=pathToFileURL(fileURLToPath(import.meta.url)).href;
      const program='const {buildCmLightSeasonObserver}=await import('+JSON.stringify(moduleUrl)+');const value=await buildCmLightSeasonObserver('+JSON.stringify({root,out,worker:true})+');process.stdout.write(JSON.stringify(value.observer));';
      const child=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,env:{...process.env},encoding:'utf8',timeout:60_000,maxBuffer:4*1024*1024});
      fs.writeFileSync(path.join(out,'child.stdout.log'),child.stdout||'');fs.writeFileSync(path.join(out,'child.stderr.log'),child.stderr||'');
      assert.ifError(child.error);assert.equal(child.signal,null);assert.equal(child.status,0,'Actual Node builder: '+(child.stderr||''));assert.equal(child.stderr,'');
      const observer=JSON.parse(child.stdout);
      assert.deepEqual(observer.sourceBefore,before);assert.deepEqual(observer.sourceAfter,before);assert.deepEqual(observer.reactRuntime,reactRuntime);
      assert.equal(observer.appendix,appendix);assert.equal(observer.onlyAppendedPrivateExports,true);
      assert.equal(observer.observedEngineSHA256,sha(source+appendix));assert.equal(observer.baseEngineSHA256,sha(old+appendix));
      assert.equal(observer.compiledSHA256,sha(fs.readFileSync(file)));assert.equal(observer.baseCompiledSHA256,sha(fs.readFileSync(baseFile)));
      assert.equal(fs.readFileSync(path.join(out,'observed-engine.ts'),'utf8'),source+appendix);assert.equal(fs.readFileSync(path.join(out,'base-engine.ts'),'utf8'),old+appendix);
      assert.deepEqual(held(),before);return{file,baseFile,directory:out,observer,dispose,owned};
    }
    const {build}=await import('esbuild');
    fs.writeFileSync(path.join(out,'observed-engine.ts'),source+appendix);fs.writeFileSync(path.join(out,'base-engine.ts'),old+appendix);
    const normalized=p=>path.resolve(p).replaceAll('\\','/').toLowerCase(),target=normalized(engine);
    async function bundle(label,contents,includeScreen){
      let loaded=0;
      const built=await build({
        stdin:{contents:"export * as cm from './src/lib/clubManager';"+(includeScreen?"export {TrainingScreen} from './src/components/club-manager/TrainingScreen';":''),resolveDir:root,loader:'ts'},
        outfile:label==='observed'?file:baseFile,bundle:true,format:'cjs',platform:'node',jsx:'automatic',nodePaths:[path.join(root,'node_modules')],
        external:react,alias:{'@':path.join(root,'src')},define:{'import.meta.env':JSON.stringify({PROD:true,DEV:false,MODE:'test',BASE_URL:'/'})},
        loader:{'.css':'empty','.svg':'empty','.png':'empty','.jpg':'empty','.webp':'empty'},metafile:true,logLevel:'error',
        plugins:[{name:'actual-engine-private-exports',setup(b){b.onLoad({filter:/clubManager\.ts$/},args=>{
          if(normalized(args.path)!==target)return;
          loaded++;assert.equal(sha(fs.readFileSync(engine)),before['src/lib/clubManager.ts']);return{contents,loader:'ts',resolveDir:path.dirname(engine)};
        });}}],
      });
      assert.equal(loaded,1,'One actual engine body per bundle, including cycles');
      const inputs=Object.keys(built.metafile.inputs).filter(p=>p.startsWith('src/')).map(p=>({path:p,canonicalSHA256:sha(fs.readFileSync(path.join(root,p))),...(normalized(path.join(root,p))===target?{compiledOverrideSHA256:sha(contents)}:{})}));
      fs.writeFileSync(path.join(out,label+'.metafile.json'),JSON.stringify(built.metafile,null,2));fs.writeFileSync(path.join(out,label+'.inputs.json'),JSON.stringify(inputs,null,2));
      return{engineLoads:loaded,actualSourceInputs:inputs.length};
    }
    const topology={observed:await bundle('observed',source+appendix,true),base:await bundle('base',old+appendix,false)};
    assert.deepEqual(held(),before);
    const observer={sourceBefore:before,sourceAfter:held(),appendix,onlyAppendedPrivateExports:true,observedEngineSHA256:sha(source+appendix),baseEngineSHA256:sha(old+appendix),compiledSHA256:sha(fs.readFileSync(file)),baseCompiledSHA256:sha(fs.readFileSync(baseFile)),reactRuntime,topology,scope:'Actual TrainingScreen and actual engine with append-only private QA exports. Separate reference retains exact PR420 engine; other dependencies are current and held. Module initialization is excluded from action RNG measurements.'};
    fs.writeFileSync(path.join(out,'observer.json'),JSON.stringify(observer,null,2));
    return{file,baseFile,directory:out,observer,dispose,owned};
  }catch(error){dispose();throw error;}
}
