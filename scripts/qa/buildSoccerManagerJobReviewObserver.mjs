import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sha=body=>createHash('sha256').update(body).digest('hex');
const react=['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime'];
export async function buildSoccerManagerJobReviewObserver({root=process.cwd(),out,worker=false}={}){
  root=path.resolve(root);
  const page=path.join(root,'src/pages/SoccerCareer.tsx'),raw=fs.readFileSync(page),source=raw.toString('utf8');
  assert.equal((source.match(/function ManagerPanel\(/g)||[]).length,1);
  const appendix='\nexport { ManagerPanel, advanceManagerSeason, loadManagerMarket };\n';
  assert(!source.includes(appendix),'Observer export is new');
  const owned=out===undefined;
  let cacheRoot;
  if(owned){cacheRoot=path.join(fs.realpathSync(path.join(root,'node_modules')),'.cache');fs.mkdirSync(cacheRoot,{recursive:true});out=fs.mkdtempSync(path.join(cacheRoot,'sc-manager-job-review-observer-'));}
  else{out=path.resolve(out);fs.mkdirSync(out,{recursive:true});}
  const file=path.join(out,'observed-page.cjs'),observed=source+appendix;
  let disposed=false;
  const dispose=()=>{
    if(disposed)return;
    disposed=true;
    try{assert.equal(sha(fs.readFileSync(page)),sha(raw),'Canonical page source is held through observer cleanup');}
    finally{if(owned){assert.equal(path.dirname(out),cacheRoot);assert(path.basename(out).startsWith('sc-manager-job-review-observer-'));fs.rmSync(out,{recursive:true,force:true});}}
  };
  try{
    const fromRoot=createRequire(path.join(root,'package.json')),fromObserver=createRequire(file),reactRuntime={};
    for(const name of react){const expected=fs.realpathSync(fromRoot.resolve(name)),actual=fs.realpathSync(fromObserver.resolve(name));assert.equal(actual,expected,name+' has the actual root runtime identity');reactRuntime[name]={root:expected,observer:actual};}
    if(!worker){
      const moduleUrl=pathToFileURL(fileURLToPath(import.meta.url)).href;
      const program="const { buildSoccerManagerJobReviewObserver } = await import("+JSON.stringify(moduleUrl)+"); const built = await buildSoccerManagerJobReviewObserver("+JSON.stringify({root,out,worker:true})+"); process.stdout.write(JSON.stringify(built.observer));";
      const child=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,env:{...process.env},encoding:'utf8',timeout:45_000,maxBuffer:1024*1024});
      fs.writeFileSync(path.join(out,'observer-child.stdout.log'),child.stdout||'');
      fs.writeFileSync(path.join(out,'observer-child.stderr.log'),child.stderr||'');
      assert.ifError(child.error);
      assert.equal(child.signal,null,'Actual Node observer child completed without a signal');
      assert.equal(child.status,0,'Actual Node observer child completed: '+(child.stderr||''));
      assert.equal(child.stderr,'','Actual Node observer child has no runtime diagnostics');
      const observer=JSON.parse(child.stdout);
      assert.equal(observer.canonicalSha256,sha(raw));
      assert.equal(observer.observedSha256,sha(observed));
      assert.equal(observer.appendix,appendix);
      assert.equal(observer.onlyAppendedExports,true);
      assert.equal(observer.compiledSha256,sha(fs.readFileSync(file)));
      assert.deepEqual(observer.reactRuntime,reactRuntime,'Child and parent resolve the same actual React runtime');
      assert.equal(fs.readFileSync(path.join(out,'observed-page.tsx'),'utf8'),observed,'Child compiled the exact append-only observer');
      assert.equal(sha(fs.readFileSync(page)),sha(raw),'Canonical page source held after child build');
      return{file,dispose,owned,observer};
    }
    const { build }=await import('esbuild');
    fs.writeFileSync(path.join(out,'observed-page.tsx'),observed);
    const normalized=file=>path.resolve(file).replaceAll('\\','/').toLowerCase(),target=normalized(page);
    let loaded=0;
    const built=await build({
      stdin:{contents:"export { ManagerPanel, advanceManagerSeason, loadManagerMarket } from './src/pages/SoccerCareer';",resolveDir:root,loader:'ts'},
      outfile:file,bundle:true,format:'cjs',platform:'node',jsx:'automatic',nodePaths:[path.join(root,'node_modules')],
      external:react,alias:{'@':path.join(root,'src')},
      define:{'import.meta.env':JSON.stringify({PROD:true,DEV:false,MODE:'test',BASE_URL:'/'})},
      loader:{'.css':'empty','.svg':'empty','.png':'empty','.jpg':'empty','.webp':'empty'},metafile:true,logLevel:'error',
      plugins:[{name:'append-observer-exports',setup(b){b.onLoad({filter:/SoccerCareer\.tsx$/},args=>{
        if(normalized(args.path)!==target)return;
        loaded++;assert.equal(sha(fs.readFileSync(args.path)),sha(raw),'Actual canonical page held during bundle');
        return{contents:observed,loader:'tsx',resolveDir:path.dirname(args.path)};
      });}}],
    });
    assert.equal(loaded,1,'One actual page observer load');
    fs.writeFileSync(path.join(out,'observed-page.metafile.json'),JSON.stringify(built.metafile,null,2));
    assert.equal(sha(fs.readFileSync(page)),sha(raw),'Canonical page source held after observer build');
    return{file,dispose,owned,observer:{canonicalSha256:sha(raw),observedSha256:sha(observed),appendix,onlyAppendedExports:true,compiledSha256:sha(fs.readFileSync(file)),reactRuntime}};
  }catch(error){dispose();throw error;}
}
