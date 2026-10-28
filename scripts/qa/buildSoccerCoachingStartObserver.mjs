import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const sha=body=>createHash('sha256').update(body).digest('hex');
const react=['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime'];
export async function buildSoccerCoachingStartObserver({root=process.cwd(),out}={}){
  root=path.resolve(root);
  const page=path.join(root,'src/pages/SoccerCareer.tsx'),raw=fs.readFileSync(page),source=raw.toString('utf8');
  assert.equal((source.match(/function RetirementCeremonyCard\(/g)||[]).length,1);
  assert.equal((source.match(/function PostRetirementCard\(/g)||[]).length,1);
  const appendix='\nexport { RetirementCeremonyCard, PostRetirementCard };\n';
  assert(!source.includes(appendix),'Observer export is new');
  const owned=out===undefined;
  let cacheRoot;
  if(owned){cacheRoot=path.join(fs.realpathSync(path.join(root,'node_modules')),'.cache');fs.mkdirSync(cacheRoot,{recursive:true});out=fs.mkdtempSync(path.join(cacheRoot,'sc-coaching-start-observer-'));}
  else{out=path.resolve(out);fs.mkdirSync(out,{recursive:true});}
  const file=path.join(out,'observed-page.cjs'),observed=source+appendix;
  let disposed=false;
  const dispose=()=>{
    if(disposed)return;
    disposed=true;
    try{assert.equal(sha(fs.readFileSync(page)),sha(raw),'Canonical page source is held through observer cleanup');}
    finally{if(owned){assert.equal(path.dirname(out),cacheRoot);assert(path.basename(out).startsWith('sc-coaching-start-observer-'));fs.rmSync(out,{recursive:true,force:true});}}
  };
  try{
    const fromRoot=createRequire(path.join(root,'package.json')),fromObserver=createRequire(file),reactRuntime={};
    for(const name of react){const expected=fs.realpathSync(fromRoot.resolve(name)),actual=fs.realpathSync(fromObserver.resolve(name));assert.equal(actual,expected,name+' has the actual root runtime identity');reactRuntime[name]={root:expected,observer:actual};}
    fs.writeFileSync(path.join(out,'observed-page.tsx'),observed);
    const normalized=file=>path.resolve(file).replaceAll('\\','/').toLowerCase(),target=normalized(page);
    let loaded=0;
    const built=await build({
      stdin:{contents:"export { RetirementCeremonyCard, PostRetirementCard } from './src/pages/SoccerCareer';",resolveDir:root,loader:'ts'},
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
