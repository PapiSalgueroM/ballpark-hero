// Engine applicability only. The historical Results proof and its late guard stay unchanged.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const BASE='afd8f6863681507693a3af34b6038e049dfcd419';
const engine='src/lib/soccerCareerEngine.ts';
const sha=value=>createHash('sha256').update(value).digest('hex');

export function compareEngine(root=process.cwd()){
 root=path.resolve(root);
 const base=BASE;
 const rawGit=(...args)=>execFileSync('git',['-C',root,...args],{maxBuffer:30*1024*1024,stdio:['ignore','pipe','pipe']});
 const git=(...args)=>rawGit(...args).toString('utf8').trim();
 const original=rawGit('show',base+':'+engine),current=fs.readFileSync(path.join(root,engine));
 // Keep the exact normalization used by the existing git helper and late assertion.
 const engineOriginal=original.toString('utf8').trim().replaceAll('\r\n','\n');
 const engineCurrent=current.toString('utf8').replaceAll('\r\n','\n').trim();
 return{
  result:engineCurrent===engineOriginal?'match':'mismatch',
  scope:'Engine applicability only; no historical layout proof is qualified here',
  expected:{ref:base,commit:git('rev-parse',base+'^{commit}'),tree:git('rev-parse',base+'^{tree}'),blob:git('rev-parse',base+':'+engine),rawSha256:sha(original),normalizedSha256:sha(engineOriginal),normalizedBytes:Buffer.byteLength(engineOriginal)},
  current:{root,commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),headBlob:git('rev-parse','HEAD:'+engine),worktreeBlob:git('hash-object','--no-filters','--',engine),rawSha256:sha(current),normalizedSha256:sha(engineCurrent),normalizedBytes:Buffer.byteLength(engineCurrent)}
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let report;
 try{report=compareEngine(process.argv[2]??process.cwd());}
 catch(error){report={result:'error',root:path.resolve(process.argv[2]??process.cwd()),error:{name:error.name,message:error.message}};}
 try{
  const output=JSON.stringify(report,null,2)+'\n';
  if(process.argv[3]){
   const file=path.resolve(process.argv[3]);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,output);
  }
  process.stdout.write(output);
  process.exitCode=report.result==='match'?0:report.result==='mismatch'?1:2;
 }catch(error){console.error('Applicability evidence error: '+error.message);process.exitCode=2;}
}
