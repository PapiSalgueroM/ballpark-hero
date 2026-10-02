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
function estimate(record,models){
 const prior=priorFor(record.sourceIdentity),pos=record.seed.pos,seasons=record.observations;
 if(pos==='OL'){
  const exposure=seasons.reduce((s,r)=>s+r.exposure*recency[r.season],0),confidence=exposure/(exposure+500);
  const participation=exposure?seasons.reduce((s,r)=>s+r.participation*r.exposure*recency[r.season],0)/exposure:0;
  return{rating:Math.round(prior*(1-confidence)+(70+16*participation)*confidence),confidence,partial:true,basis:'participation/draft proxy; blocking quality unmeasured',seasons:seasons.map(r=>r.season)};
 }
 if(['QB','RB','WR','TE'].includes(pos)){
  const model=models.offense[pos];assert.ok(model,'Supported offense model required');
  let exposure=0,zSum=0;
  for(const row of seasons){
   const sample=row.exposure*recency[row.season];
   const raw=row.metrics.reduce((s,value,i)=>s+(value==null?0:model.featureWeights[i]*clip((value-model.mean[i])/model.sd[i],-3,3)),0);
   const z=(raw-model.compositeCenter)/model.compositeSd;
   exposure+=sample;zSum+=z*sample;
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
export function buildFullRatings(inputs){
 assert.equal(new Set(inputs.records.map(p=>p.key)).size,inputs.records.length,'Unique eligible roster keys');
 const rated=inputs.records.map(p=>({...p,estimate:estimate(p,inputs.models)}));
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
 if (!measured) reasons.push('no-measured-opportunities');
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
