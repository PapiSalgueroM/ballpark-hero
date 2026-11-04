import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const out=process.argv[2];assert(out);fs.mkdirSync(out,{recursive:true});
const target="src/lib/soccerCareerTransferBrief.ts",before=fs.readFileSync(target),span="  if ((career.transferBrief !== undefined && !held) || held?.result || (minimumApps !== undefined && !validMinimum(minimumApps))) return career;",replacement="  if (held?.result || (minimumApps !== undefined && !validMinimum(minimumApps))) return career;";
const sha=b=>createHash('sha256').update(b).digest('hex'),text=before.toString('utf8');assert.equal(text.split(span).length-1,1);
const changed=Buffer.from(text.replace(span,replacement));assert(!changed.equals(before));assert.equal(changed.toString().split(replacement).length-1,1);
for(const[name,body]of[['original',before],['mutated',changed]])fs.writeFileSync(path.join(out,name+'-helper.ts'),body);
const rows=[];
function run(name,extra={},fault=false){
 const receipt=path.join(out,name+'-transport.log');fs.writeFileSync(receipt,'');
 const p=spawnSync(process.execPath,['scripts/simSaveKeeper.mjs'],{env:{...process.env,...extra,SIM_OFFLINE_RECEIPT:receipt},encoding:'utf8',timeout:600000,maxBuffer:16*1024*1024});
 const log=(p.stdout||'')+'\n'+(p.stderr||'');fs.writeFileSync(path.join(out,name+'.log'),log);
 const exit={status:p.status,signal:p.signal,error:p.error?String(p.error):null};fs.writeFileSync(path.join(out,name+'-exit.json'),JSON.stringify(exit)+'\n');
 assert(!p.error&&p.signal===null,name+' native completion');assert.equal(p.status,fault?1:0,name+' native exit');assert.equal(fs.statSync(receipt).size,0);
 assert(!/TypeError|SyntaxError|ReferenceError|Cannot find module|is not a function|Unhandled\s+(?:Error|Rejection)/.test(log),name+' no runtime/setup credit');
 if(name==='fault'){assert(log.includes('PRESERVED_PART_WRITE'));assert(log.includes('edit replaced or changed the unreadable source'));assert(log.includes('simSaveKeeper: RED in section(s) 1.'));}
if(name==='row-control'){assert(log.includes('(transferBrief.version='));assert(log.includes('simSaveKeeper control partbrief: its own sentence:'));assert(log.includes('simSaveKeeper control partbrief: FIRED. Section 1 is red.'));}
 if(!fault)assert(log.includes('simSaveKeeper: all green. The keeper holds on real saves of all 21 long games.'));
 rows.push({name,...exit,helperSHA256:sha(fs.readFileSync(target)),transportBytes:fs.statSync(receipt).size});
}
try{
 run('healthy');
 fs.writeFileSync(target,changed);assert(fs.readFileSync(target).equals(changed));run('fault',{},true);
 const inverse=fs.readFileSync(target).toString().replace(replacement,span);assert.equal(inverse,text);fs.writeFileSync(target,before);assert(fs.readFileSync(target).equals(before));fs.writeFileSync(path.join(out,'restored-helper.ts'),fs.readFileSync(target));run('restored');
 run('row-control',{SIM_SAVE_KEEPER_CONTROL:'partbrief'},true);
}finally{fs.writeFileSync(target,before);assert(fs.readFileSync(target).equals(before));}
assert.equal(rows.length,4);fs.writeFileSync(path.join(out,'admission.json'),JSON.stringify({status:'qualified',target,originalSHA256:sha(before),mutatedSHA256:sha(changed),restoredSHA256:sha(fs.readFileSync(target)),changedBytes:true,wholeInverse:true,rows},null,2)+'\n');
console.log('Preserved brief physical guard control: healthy0, owned fault1, restored0, existing row-control1; exact source restored.');
