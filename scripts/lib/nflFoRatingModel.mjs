// Simulation estimates from a frozen offline source checkpoint. Contracts remain fictional.
import assert from 'node:assert/strict';
const clip=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const recency={2023:.45,2024:.7,2025:1};
const defenseWeights={CB:{rating:.45,coverageYards:.35,coverageCompletions:.2},DE:{pressure:.65,sacks:.25,tackles:.1},DT:{pressure:.55,sacks:.2,tackles:.25},OLB:{rating:.3,missed:.3,tackles:.3,pressure:.1},ILB:{rating:.3,missed:.3,tackles:.3,pressure:.1},S:{rating:.45,missed:.25,tackles:.25,pressure:.05}};
const currentRole=depth=>({DE:'DE',DT:'DT',NT:'DT',ILB:'ILB',MLB:'ILB',OLB:'OLB',CB:'CB',FS:'S',SS:'S',S:'S'})[depth]??null;
function priorFor(facts){
 const pick=Number(facts.draftNumber)||0,exp=Number(facts.yearsExperience)||0;
 return exp<=1?(pick?68+14*(1-Math.min(1,Math.log(pick)/Math.log(263))):66):70;
}
/* ROUND 1130, THE OFFENSE LAYER (model nfl-v2.3). The checkpoint's offense
   estimate reads how WELL a quarterback, back, receiver or tight end played
   (three or four rate metrics a season) and never how MUCH of the work he
   carried or what he produced, so a back with 339 opportunities and ordinary
   rates sat under a fullback with one sharp rate on 19. The layer adds the two
   things the frozen checkpoint and the two sourced 2025 file already hold:

     workload    w = the largest, over his seasons, of
                 (the season's opportunities x carry[season]) / the position's
                 typical load; zVol = clip((min(w, cap) - 1) / workloadSd).
                 A full load in 2025 reads about 1.
     production  his agreed 2025 regular season line (scripts/data/
                 nfl2025Production.json, two publishers), on the generator's
                 own skillScore, PER GAME, as a z score inside his position
                 among the clubs' fifteen. A man with no agreed line, or under
                 minGames, is read on his workload instead: never on an
                 invented line.

   measured = clip(84 + gain x (efficiency x zEff + workload x zVol +
   production x zProd), 55, 98), then the checkpoint's own shrink toward the
   prior, untouched. A man the roster record labels FB whom two more publishers
   also call a fullback (scripts/data/nflFullbackRoles2026.json) is not rated
   as a ball carrier at all: his carries are not his job, so he reads one flat
   number, fullbackOvr, the middle of the backup band, with the limited
   evidence mark. That number is a stated judgement, and the same number for
   every fullback says so.

   buildFullRatings(inputs) with NO layer is v2.2 exactly, forever: it is the
   frozen arm every comparison is made against, and the suite's tuple hash
   proves it. Offensive linemen and every defender run the v2.2 code in both
   arms.

   WHERE THE CONSTANTS CAME FROM. Measured 2026-10-08 on the two sourced file
   (326 agreed or settled offense lines, 15 confirmed fullbacks);
   scripts/simFoRatingOrder.mjs measures the same things on every run.

                                          QB        RB        WR        TE
     the fifteen, mean and sd, v2.2    81.4 7.3  81.0 6.9  80.6 7.3  81.9 6.5
     the fifteen, mean and sd, layer   81.3 6.9  81.2 7.4  81.1 7.5  81.9 6.4
     median load of the fifteen       504/497   199/192    85/81     76/74
     rank agreement with 2025
     production among starters, v2.2     .51       .49       .38       .23
     the same, layer                     .77       .87       .83       .74

   gain 13 and the three blend weights are the designer's, and the RULE they
   were chosen by is what matters: each position's mean and sd among the
   fifteen stays within one point of v2.2's, because the engine's constants
   and every later value curve stand on that scale. The table shows it holds
   on the two sourced file, so nothing was moved. A workload only variant was
   measured by the designer and rejected: it squeezes the quarterbacks,
   because every starting quarterback carries the same load.
   workloadSd .45: the population sd of min(w, 1.6) over the fifteen's backs
   and receivers measures .436, inside the .40 to .50 the design allowed.
   carry is a judgement stated out loud: a full load two seasons ago still
   counts for most of one. minGames 4 is the selection rule's own floor.
   fullbackOvr 63 is the middle of the backup band (61 to 65). */
function estimate(record,models,layer=null,productionStats=null){
 const prior=priorFor(record.sourceIdentity),pos=record.seed.pos,seasons=record.observations;
 if(pos==='OL'){
  const exposure=seasons.reduce((s,r)=>s+r.exposure*recency[r.season],0),confidence=exposure/(exposure+500);
  const participation=exposure?seasons.reduce((s,r)=>s+r.participation*r.exposure*recency[r.season],0)/exposure:0;
  return{rating:Math.round(prior*(1-confidence)+(70+16*participation)*confidence),confidence,partial:true,basis:'participation/draft proxy; blocking quality unmeasured',seasons:seasons.map(r=>r.season)};
 }
 if(['QB','RB','WR','TE'].includes(pos)){
  const model=models.offense[pos];assert.ok(model,'Supported offense model required');
  if(layer&&isFullback(record,layer))return{rating:layer.fullbackOvr,confidence:0,partial:true,fullback:true,workload:null,basis:'fullback: not rated as a ball carrier',seasons:seasons.map(r=>r.season)};
  let exposure=0,zSum=0;
  for(const row of seasons){
   const sample=row.exposure*recency[row.season];
   const raw=row.metrics.reduce((s,value,i)=>s+(value==null?0:model.featureWeights[i]*clip((value-model.mean[i])/model.sd[i],-3,3)),0);
   const z=(raw-model.compositeCenter)/model.compositeSd;
   exposure+=sample;zSum+=z*sample;
  }
  if(layer){
   const confidence=exposure/(exposure+model.shrinkExposure),zEff=exposure?zSum/exposure:0;
   let workload=0;for(const row of seasons)workload=Math.max(workload,row.exposure*layer.carry[row.season]/model.typicalExposure);
   const zVol=clip((Math.min(workload,layer.workloadCap)-1)/layer.workloadSd,-2.5,2.5);
   const line=layer.production.get(record.key),cohort=productionStats?.[pos];
   const hasLine=!!(line&&line.games>=layer.minGames&&cohort);
   const zProd=hasLine?clip((line.score/line.games-cohort.mean)/cohort.sd,-2.5,2.5):zVol;
   const measured=clip(84+layer.gain*(layer.blend.efficiency*zEff+layer.blend.workload*zVol+layer.blend.production*zProd),55,98);
   return{rating:Math.round(prior*(1-confidence)+measured*confidence),confidence,partial:!exposure,workload,productionLine:hasLine,basis:exposure?'dated multiyear source production estimate':'draft-only rookie or unmeasured veteran prior',seasons:seasons.map(r=>r.season)};
  }
  const confidence=exposure/(exposure+model.shrinkExposure),measured=clip(84+12*(exposure?zSum/exposure:0),55,98);
  return{rating:Math.round(prior*(1-confidence)+measured*confidence),confidence,partial:!exposure,basis:exposure?'dated multiyear source production estimate':'draft-only rookie or unmeasured veteran prior',seasons:seasons.map(r=>r.season)};
 }
 assert.ok(['DB','DL','LB'].includes(pos),'Only currently supported positions');
 const total=seasons.reduce((s,r)=>s+r.baseExposure*recency[r.season],0),features={};
 for(const row of seasons){
  const model=models.defense[`${row.season}|${row.role}`];assert.ok(model,'Dated defensive normalizer required');
  assert.equal(model.role,row.role,'Dated role must match normalizer');
  for(const[key,weight]of Object.entries(defenseWeights[row.role])){
   const m=row.features[key],f=model.features[key];if(!m||!f)continue;
   const weightedExposure=m.exposure*recency[row.season],z=(clip((m.value-f.mean)/f.sd,-3,3)-model.compositeCenter)/model.compositeSd;
   const accumulated=features[key]??{weightedExposure:0,units:0,zSum:0,weight:0};
   accumulated.weightedExposure+=weightedExposure;accumulated.units+=weightedExposure/f.typicalExposure;accumulated.zSum+=z*weightedExposure;
   accumulated.weight+=weight*row.baseExposure*recency[row.season]/total;features[key]=accumulated;
  }
 }
 let evidence=0,score=0;
 for(const f of Object.values(features)){
  const confidence=f.units/(f.units+.5);evidence+=f.weight*confidence;score+=f.weight*confidence*f.zSum/f.weightedExposure;
 }
 const measured=total&&evidence>0?clip(84+12*score/evidence,55,98):null;
 const rating=measured==null?Math.round(prior):Math.round(prior*(1-evidence)+measured*evidence);
 const datedRoles=[...new Set(seasons.map(r=>r.role))],role=currentRole(record.sourceIdentity.depthChartPosition);
 const partial=!total||datedRoles.includes('OLB')||datedRoles.some(r=>['S','ILB'].includes(r))||datedRoles.length>1||seasons.some(r=>r.partial)||!role||!datedRoles.includes(role);
 return{rating,confidence:evidence,partial,currentRole:role,datedRoles,basis:total?'dated defensive features; explicit opportunity proxies':'unsupported dated role or no measured opportunities',seasons:seasons.map(r=>r.season)};
}
function fictionalDemand(pos,ovr){
 if(pos==='QB')return Math.round(Math.max(1.5,(ovr-66)*1.8-18)*10)/10;
 return Math.round(Math.max(1,(ovr-66)*1.15-12)*10)/10;
}
const floorFor=p=>p.seed.pos==='QB'?1.5:1;
/* The layer's constants. The caller adds two things read from committed files:
   production, a Map of record key to { games, score } built from agreed or
   settled rows only, and fullbacks, a Set of the record keys two publishers
   confirm. version names the day the layer's tuple hash was recorded. */
export const OFFENSE_LAYER=Object.freeze({
 version:'nfl-v2.3-2026-10-08',
 base:'nfl-v2.2-2026-10-02',
 carry:Object.freeze({2023:.6,2024:.8,2025:1}),
 workloadCap:1.6,workloadSd:.45,
 blend:Object.freeze({efficiency:.45,workload:.2,production:.35}),
 gain:13,minGames:4,fullbackOvr:63,
});
export const OFFENSE_POSITIONS=Object.freeze(['QB','RB','WR','TE']);
/** A fullback for the layer: the record's own label AND the two sourced ledger. Either alone is not enough. */
function isFullback(record,layer){return record.sourceIdentity.depthChartPosition==='FB'&&!!layer.fullbacks?.has(record.key);}
/** Per position, the mean and population sd of production per game among the fifteen who hold an agreed line. Never typed. */
export function productionCohorts(inputs,layer){
 const out={};
 for(const pos of OFFENSE_POSITIONS){
  const values=[];
  for(const r of inputs.records){
   if(r.seed.pos!==pos||r.tier!=='core'||isFullback(r,layer))continue;
   const line=layer.production.get(r.key);
   if(line&&line.games>=layer.minGames)values.push(line.score/line.games);
  }
  if(values.length<2)continue;
  values.sort((a,b)=>a-b); // one summing order, so the same pool gives the same bits whatever order its records arrive in
  const mean=values.reduce((s,v)=>s+v,0)/values.length,sd=Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/values.length);
  if(sd>0)out[pos]={mean,sd,count:values.length};
 }
 return out;
}
export function buildFullRatings(inputs,layer=null){
 assert.equal(new Set(inputs.records.map(p=>p.key)).size,inputs.records.length,'Unique eligible roster keys');
 let cohorts=null;
 if(layer){
  assert.equal(layer.base,inputs.version,'The offense layer stands on this checkpoint version');
  assert.ok(layer.production instanceof Map&&layer.fullbacks instanceof Set,'The offense layer needs its production Map and its fullback Set');
  cohorts=productionCohorts(inputs,layer);
  /* allowNoProduction is for a holdout measurement only (the harness rates the pool with every 2025 line removed);
     the generator never sets it, and readOffenseLayer refuses to bake on a thin production file */
  for(const pos of OFFENSE_POSITIONS)assert.ok(cohorts[pos]||layer.allowNoProduction===true,'Agreed production among the fifteen is required for every offense position: '+pos);
 }
 const rated=inputs.records.map(p=>({...p,estimate:estimate(p,inputs.models,layer,cohorts)}));
 const prices=new Map();
 for(const team of [...new Set(rated.map(p=>p.team))]){
  const active=rated.filter(p=>p.team===team&&p.tier!=='practice'),practice=rated.filter(p=>p.team===team&&p.tier==='practice');
  const totalTenths=Math.round(active.reduce((s,p)=>s+p.seed.salary,0)*10),floorTenths=active.reduce((s,p)=>s+Math.round(floorFor(p)*10),0),surplus=totalTenths-floorTenths;
  assert.ok(surplus>=0,'Original payroll covers simulation floors');
  const demand=active.map(p=>Math.max(0,fictionalDemand(p.seed.pos,p.estimate.rating)-floorFor(p))),totalDemand=demand.reduce((s,v)=>s+v,0);
  assert.ok(totalDemand>0,'Fictional allocation has demand');
  const shares=active.map((p,i)=>({p,amount:surplus*demand[i]/totalDemand}));
  const remainder=surplus-shares.reduce((s,p)=>s+Math.floor(p.amount),0);
  const order=shares.map((p,index)=>({index,fraction:p.amount-Math.floor(p.amount),key:p.p.key})).sort((a,b)=>b.fraction-a.fraction||a.key.localeCompare(b.key));
  const extras=new Set(order.slice(0,remainder).map(p=>p.index));
  shares.forEach((p,index)=>prices.set(p.p.key,(Math.round(floorFor(p.p)*10)+Math.floor(p.amount)+(extras.has(index)?1:0))/10));
  const multiplier=surplus/(totalDemand*10);
  for(const p of practice)prices.set(p.key,Math.round((floorFor(p)+Math.max(0,fictionalDemand(p.seed.pos,p.estimate.rating)-floorFor(p))*multiplier)*10)/10);
  assert.equal(Math.round(active.reduce((s,p)=>s+prices.get(p.key),0)*10),totalTenths,'Exact original club opening payroll');
 }
 return rated.map(p=>({key:p.key,team:p.team,tier:p.tier,...p.seed,ovr:p.estimate.rating,salary:prices.get(p.key),evidence:p.estimate}));
}


/** Compact simulation lineage for a newly created full-roster player, not live data. */
export function openingRatingEvidence(record, rated, modelVersion, openingWindow) {
 const measured = rated.evidence.confidence > 0;
 const defensive = ['DB', 'DL', 'LB'].includes(record.seed.pos);
 const rookieDraft = Number(record.sourceIdentity.yearsExperience) <= 1 && Number(record.sourceIdentity.draftNumber) > 0;
 const basis = !measured ? (rookieDraft ? 'draft-prior' : 'unmeasured-prior')
  : record.seed.pos === 'OL' ? 'participation-proxy' : defensive ? 'defensive-proxy' : 'production';
 const reasons = [];
 /* Round 1130: a confirmed fullback has opportunities, they are just not his job, so he carries his own reason */
 if (rated.evidence.fullback) reasons.push('fullback-role-unmeasured');
 else if (!measured) reasons.push('no-measured-opportunities');
 if (record.seed.pos === 'OL') reasons.push('blocking-quality-unmeasured');
 if (defensive) {
  const roles = rated.evidence.datedRoles;
  if (roles.includes('OLB')) reasons.push('ambiguous-dated-role');
  if (roles.some(role => ['S', 'ILB'].includes(role))) reasons.push('assignment-quality-unmeasured');
  if (roles.length > 1) reasons.push('dated-role-changed');
  if (record.observations.some(row => row.partial)) reasons.push('limited-dated-exposure');
  if (!rated.evidence.currentRole) reasons.push('current-role-unsupported');
  else if (!roles.includes(rated.evidence.currentRole)) reasons.push('current-role-unmeasured');
 }
 return { modelVersion, openingWindow, originKey: record.key, openingOvr: rated.ovr,
  basis, partial: rated.evidence.partial, partialReasons: reasons };
}
