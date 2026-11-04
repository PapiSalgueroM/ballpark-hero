import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const out=process.env.QA_OUT;
assert(out && !out.startsWith(process.cwd()+path.sep));
const target='src/components/us-career/FreeAgencyPanel.tsx';
const file='src/test/usSigningRequestSafetyAudit.test.tsx';
const original=fs.readFileSync(target,'utf8');
const hash=v=>createHash('sha256').update(v).digest('hex');
assert.equal(execFileSync('git',['hash-object',target],{encoding:'utf8'}).trim(),'1d32d94e38245f2b919a7762f90076991b562a9f');
const replacements=[
{key:'missing-consume',before:'              signing.current = null;\n              setReview(null);\n              onSign(request.index);',after:'              setReview(null);\n              onSign(request.index);',marker:'US_SIGN_REQUEST_CONSUMED_BEFORE_CALLBACK'},
{key:'missing-current-terms-check',before:'  const sameSigningQuote = (request: SigningReview) => reviewSigning && w === request.window\n    && w.offers[request.index] === request.source && !request.source.gone\n    && JSON.stringify(request.source) === JSON.stringify(request.offer);',after:'  const sameSigningQuote = (request: SigningReview) => true;',marker:'US_SIGN_CLICK_RECHECKS_CURRENT_SCALARS'}
];
const cases=['Fifth signing request safety audit consumes the request before entering a reentrant signing callback','Fifth signing request safety audit rechecks mutated scalar terms on click before any rerender'];
function run(name,marker){
 const folder=path.join(out,name);fs.mkdirSync(folder,{recursive:true});
 const receipt=path.join(folder,'transport.log');fs.writeFileSync(receipt,'');
 const p=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',file,'--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile='+path.join(folder,'units.json')],{encoding:'utf8',env:{...process.env,SIM_OFFLINE_RECEIPT:receipt},timeout:120000,maxBuffer:8*1024*1024});
 const log=(p.stdout||'')+'\n'+(p.stderr||'');fs.writeFileSync(path.join(folder,'units.log'),log);
 assert(!p.error && !p.signal,name+' completed');
 assert.equal(p.status,marker?1:0,name+' native status');
 assert.equal(fs.statSync(receipt).size,0);
 assert(!/Unhandled\s+(?:Error|Rejection)|Vitest caught [1-9]|uncaughtException|unhandledRejection/i.test(log));
 const j=JSON.parse(fs.readFileSync(path.join(folder,'units.json')));
 assert.equal(j.testResults.length,1);assert.equal(j.numPendingTests,0);assert.equal(j.numTodoTests,0);
 const rows=j.testResults[0].assertionResults;assert.deepEqual(rows.map(x=>x.fullName).sort(),[...cases].sort());
 const failed=rows.filter(x=>x.status==='failed');assert.equal(failed.length,marker?1:0);
 assert.equal(rows.filter(x=>x.status==='passed').length,marker?1:2);
 if(marker){const message=failed[0].failureMessages.join('\n');assert(message.includes('AssertionError')&&message.includes(marker),name+' owned assertion');assert(!/TypeError|ReferenceError|SyntaxError/.test(message));}
 return {name,status:p.status,passed:j.numPassedTests,failed:j.numFailedTests,marker:marker??null};
}
const results=[run('fixed')],controls=[];
try{
 for(const c of replacements){assert.equal(original.split(c.before).length-1,1,c.key+' exact physical mutation');const changed=original.replace(c.before,c.after);assert.notEqual(changed,original);controls.push({name:c.key,fixed:hash(original),control:hash(changed)});fs.writeFileSync(target,changed);try{results.push(run(c.key,c.marker));}finally{fs.writeFileSync(target,original);assert.equal(fs.readFileSync(target,'utf8'),original);}}
 results.push(run('restored'));
}finally{fs.writeFileSync(target,original);}
fs.writeFileSync(path.join(out,'admission.json'),JSON.stringify({status:'qualified',scope:'Supplemental two-case physical panel safety controls only. No final build, browser or publication admission.',core:'9ac4800245baeb0ff822921ab62f3071ff2e8562',panelBlob:'1d32d94e38245f2b919a7762f90076991b562a9f',results,controls},null,2)+'\n');
console.log('US signing safety audit: fixed2, each physical control1 owned failure plus1 held pass, restored2.');
