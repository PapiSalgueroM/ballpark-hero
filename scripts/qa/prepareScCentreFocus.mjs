import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
async function main(){
const ROOT=process.cwd(),OUT=process.env.SC_CENTRE_FOCUS_OUT;
assert(process.env.CI==='1'&&path.isAbsolute(OUT||'')&&!OUT.startsWith(ROOT+path.sep),'SC_CENTRE_SETUP_EXTERNAL_CI');
fs.mkdirSync(OUT,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const write=(name,value)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n');
const raw=fs.readFileSync('qa/sc-centre-focus-v1/CONTRACT.json'),C=JSON.parse(raw);
assert.equal(sha(raw),process.env.SC_BROWSER_CONTRACT_SHA256,'SC_CENTRE_SETUP_CONTRACT');
function held(){return Object.fromEntries(Object.entries(C.sourcePins).map(([name,pin])=>{const b=fs.readFileSync(name);assert.equal(blob(b),pin.gitBlob,'SC_CENTRE_SETUP_SOURCE '+name);assert.equal(sha(b),pin.sha256,'SC_CENTRE_SETUP_SOURCE_SHA '+name);return[name,{gitBlob:blob(b),sha256:sha(b)}];}));}
const sourceBefore=held(),report={status:'STARTED',sourceBefore,youthAttempts:[],seniorAttempts:[],bounds:{youth:512,senior:256},scope:'Actual engine constructor, youth, offered contract and senior preview in Node. No browser onboarding or real match claim.'};
const flush=()=>write('FIXTURE-PREPARATION.json',report);flush();
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){},clear(){}};
try{
 const oracle=path.join(OUT,'oracle.cjs');
 const compiled=await build({stdin:{contents:"export * as E from './src/lib/soccerCareerEngine';export * as S from './src/lib/soccerCareerSave';export * as P from './src/data/soccerCareerClubPool';export {settleLoadedMoments} from './src/components/soccer-career/careerMoments';",resolveDir:ROOT,loader:'ts'},outfile:oracle,bundle:true,platform:'node',format:'cjs',jsx:'automatic',metafile:true,alias:{'@':path.join(ROOT,'src')},define:{'import.meta.env':'{"DEV":false,"PROD":true,"MODE":"test"}'},loader:{'.css':'empty','.svg':'empty','.png':'empty'},logLevel:'error'});
 write('oracle-metafile.json',compiled.metafile);
 const inputs=Object.keys(compiled.metafile.inputs).filter(file=>file.startsWith('src/')).map(file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,sha256:sha(b),gitBlob:blob(b)};});write('oracle-source-inputs.json',inputs);
 const B=createRequire(path.join(ROOT,'package.json'))(oracle),{E,S}=B;
 for(const f of [E.initCareer,E.advanceYouthYear,E.acceptOffer,E.advanceProSeason,E.repairCareer,S.serializeSoccerCareerSave,S.parseSoccerCareerSave,S.isSoccerCareerSave,B.settleLoadedMoments])assert.equal(typeof f,'function','SC_CENTRE_SETUP_PUBLIC_API');
 const ids=new Set(B.P.CAREER_CLUB_POOL.filter(c=>c.league==='Ligue 2'&&B.P.CAREER_POOL_SINCE[c.name]===2026).map(c=>c.id));assert.equal(ids.size,17,'SC_CENTRE_SETUP_ACTUAL_L2_POOL');
 function taped(seed,action){const random=Math.random,now=Date.now,draws=[];let n=seed>>>0;const next=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};Math.random=()=>{const v=next();draws.push(v);return v;};Date.now=()=>C.now;try{return{value:action(),draws,next:next()};}finally{Math.random=random;Date.now=now;}}
 function normalize(value){const parsed=S.parseSoccerCareerSave(S.serializeSoccerCareerSave(value));assert(S.isSoccerCareerSave(parsed),'SC_CENTRE_SETUP_OFFICIAL_CODEC');const current=E.repairCareer(parsed);B.settleLoadedMoments(current);return current;}
 let youth;
 for(let seed=1;seed<=512&&!youth;seed++){
  const run=taped(seed,()=>{const stats={pace:42,shooting:42,passing:42,dribbling:42,defending:42,physical:42,reflexes:42};const initial=E.initCareer('League Release','France','CM','2020s',stats,42,2025,E.FALLBACK_CLUBS,null,60),next=E.advanceYouthYear(initial,E.FALLBACK_CLUBS);assert.equal(next.age,17);assert.equal(next.seasons.at(-1).year,2026);assert.equal(next.phase,'contract_offer');const offered=next.pendingOffers.find(o=>ids.has(o.club.id));if(!offered)return{initial,youth:next,offered:null};assert(next.overall<56);const signed=normalize(E.acceptOffer(next,offered));assert.equal(signed.phase,'playing');assert.equal(signed.currentClub,offered.club.name);assert.equal(signed.currentLeague,'Ligue 2');return{initial,youth:next,offered,signed};});
  report.youthAttempts.push({seed,overall:run.value.youth.overall,phase:run.value.youth.phase,offerIds:run.value.youth.pendingOffers.map(o=>o.club.id),drawCount:run.draws.length,next:run.next,selected:run.value.offered?.club.id??null});flush();if(run.value.offered)youth={seed,...run};
 }
 assert(youth,'SC_CENTRE_SETUP_YOUTH_BOUND512');write('actual-youth-contract.json',youth);
 const signedRaw=S.serializeSoccerCareerSave(youth.value.signed);assert.equal(S.serializeSoccerCareerSave(normalize(youth.value.signed)),signedRaw,'SC_CENTRE_SETUP_SIGNED_NORMALIZATION');
 let senior;
 for(let seed=1;seed<=256&&!senior;seed++){
  const run=taped(seed,()=>E.advanceProSeason(structuredClone(youth.value.signed),E.FALLBACK_CLUBS)),row=run.value.seasons.at(-1);
  const accepted=run.value.seasons.length===youth.value.signed.seasons.length+1&&row?.type==='playing'&&row.club===youth.value.signed.currentClub&&row.year===2027&&row.apps>0&&!row.injurySevere&&row.leagueSize===18&&row.leagueWorld?.members.length===18&&run.value.phase==='newspaper'&&Array.isArray(run.value.pendingNews)&&run.value.pendingNews.length>0;
  report.seniorAttempts.push({seed,phase:run.value.phase,pendingNews:run.value.pendingNews?.length??0,club:row?.club,year:row?.year,apps:row?.apps,injurySevere:!!row?.injurySevere,leagueSize:row?.leagueSize,memberCount:row?.leagueWorld?.members.length,drawCount:run.draws.length,next:run.next,accepted:!!accepted});flush();if(accepted)senior={seed,...run};
 }
 assert(senior,'SC_CENTRE_SETUP_SENIOR_BOUND256');write('actual-senior-preview.json',senior);
 const liveRaw=S.serializeSoccerCareerSave(senior.value),replayRaw=S.serializeSoccerCareerSave(normalize(senior.value));assert.equal(S.serializeSoccerCareerSave(normalize(normalize(senior.value))),replayRaw,'SC_CENTRE_SETUP_REPLAY_NORMALIZATION');
 for(const [name,body]of [['signed.save',signedRaw],['preview.save',liveRaw],['replay.save',replayRaw]])fs.writeFileSync(path.join(OUT,name),body);
 const files=['oracle.cjs','oracle-metafile.json','oracle-source-inputs.json','actual-youth-contract.json','actual-senior-preview.json','signed.save','preview.save','replay.save'];
 report.files=files.map(name=>{const b=fs.readFileSync(path.join(OUT,name));return{name,bytes:b.length,sha256:sha(b)};});report.seniorSeed=senior.seed;report.sourceAfter=held();assert.deepEqual(report.sourceAfter,sourceBefore);report.status='PREPARED';flush();
}catch(error){report.status='SETUP_REFUSED';report.error={name:error.name,message:error.message,stack:error.stack};flush();console.error(error);process.exitCode=2;}
}
try{await main();}catch(error){console.error(error);process.exitCode=2;}
