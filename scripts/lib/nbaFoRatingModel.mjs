import assert from 'node:assert/strict';
export const MODEL_VERSION='nba894-review-v0.4';
export const MODEL_CONFIG=Object.freeze({currentWeight:.65,priorWeight:.35,priorOnlyConfidence:.6,cohortMinimumMinutes:600,gradeMinimum:60,gradeMaximum:99,clipLow:.05,clipHigh:.95,calibrationCenter:84,calibrationSpread:12,genericRolePrior:72,priorOpportunityWeight:.5});
const bounded=(n,low,high)=>Math.max(low,Math.min(high,n));
const numeric=(n,field)=>{assert.ok(Number.isFinite(n)&&n>=0,'valid nonnegative '+field);return n;};
const ratio=(n,d)=>d>0?n/d:null;
export const normalizeName=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.'’]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
export const roleFor=position=>position.startsWith('G')||position==='PG'||position==='SG'?'G':position.startsWith('C')?'C':'F';
const percentile=(value,values)=>{if(value==null||!values.length)return null;const below=values.filter(v=>v<value).length,equal=values.filter(v=>v===value).length;return(below+.5*equal)/values.length;};
const confidence=(opportunities,prior)=>opportunities/(opportunities+prior);
const DEFINITIONS=Object.freeze({
 scoring:{exposure:'minutes',prior:600},
 efficiency:{exposure:'shooting',prior:350},
 creation:{exposure:'possessions',prior:1200},
 security:{exposure:'creationEvents',prior:160},
 spacing:{exposure:'threes',prior:180},
 rebounds:{exposure:'minutes',prior:900},
 disruption:{exposure:'minutes',prior:1100},
 role:{exposure:'games',prior:25},
});
export function features(base,advanced){
 const min=numeric(base.MIN,'season total minutes'),gp=numeric(base.GP,'games'),shots=numeric(base.FGA,'FGA')+.44*numeric(base.FTA,'FTA');
 for(const k of ['PTS','AST','TOV','FG3M','FG3A','OREB','DREB','STL','BLK'])numeric(base[k],k);
 assert.ok(gp>0&&min>0,'observation with minutes and games');
 assert.ok(Math.abs(min/gp-advanced.MIN)<=.050001,'advanced MIN is per game, Base MIN is total');
 for(const key of ['AST_PCT','REB_PCT'])if(advanced[key]!=null)assert.ok(Number.isFinite(advanced[key])&&advanced[key]>=0&&advanced[key]<=1,'valid optional measured percentage '+key);
 const possessions=numeric(advanced.POSS,'possessions'),creationEvents=base.AST+base.TOV;
 return {values:{scoring:36*base.PTS/min,efficiency:ratio(base.PTS,2*shots),creation:advanced.AST_PCT,security:ratio(base.AST,creationEvents),spacing:36*base.FG3M/min,rebounds:advanced.REB_PCT,disruption:36*(base.STL+base.BLK)/min,role:min/gp},exposures:{minutes:min,games:gp,shooting:shots,threes:base.FG3A,possessions,creationEvents},observed:{games:gp,totalMinutes:min,advancedMinutesPerGame:advanced.MIN,shootingAttempts:shots,threePointAttempts:base.FG3A,creationEvents,possessions}};
}
export function makeCohorts(baseRows,advancedRows){
 const advanced=new Map(advancedRows.map(r=>[r.PLAYER_ID,r]));
 const eligible=baseRows.filter(r=>r.MIN>=MODEL_CONFIG.cohortMinimumMinutes&&r.GP>0&&advanced.has(r.PLAYER_ID));
 assert.ok(eligible.length>200,'nonempty qualified league cohort');
 const lists=Object.fromEntries(Object.keys(DEFINITIONS).map(k=>[k,[]]));
 for(const base of eligible){const measured=features(base,advanced.get(base.PLAYER_ID));for(const k of Object.keys(lists))if(measured.values[k]!=null)lists[k].push(measured.values[k]);}
 return {eligible:eligible.length,lists};
}
export function measureSeason(base,advanced,cohort,recency=1){
 const f=features(base,advanced),components={};
 for(const[k,d]of Object.entries(DEFINITIONS)){
  const rank=percentile(f.values[k],cohort.lists[k]);
  const target=rank==null?.5:bounded(rank,MODEL_CONFIG.clipLow,MODEL_CONFIG.clipHigh);
  const certainty=rank==null?0:confidence(f.exposures[d.exposure],d.prior)*recency;
  components[k]={raw:f.values[k],percentile:rank,target,confidence:certainty,score:.5+(target-.5)*certainty,opportunities:f.exposures[d.exposure],priorOpportunities:d.prior};
 }
 return {observed:f.observed,components};
}
const OFFENSE_WEIGHTS={G:{scoring:.3,efficiency:.2,creation:.3,security:.1,spacing:.1},F:{scoring:.35,efficiency:.25,creation:.2,security:.1,spacing:.1},C:{scoring:.3,efficiency:.35,creation:.2,security:.1,spacing:.05}};
const weighted=(components,weights)=>Object.entries(weights).reduce((n,[k,w])=>n+components[k].score*w,0);
const rawPart=(measurement,weights)=>Object.entries(weights).reduce((n,[k,w])=>n+measurement.components[k].target*w,0);
const certaintyPart=(measurement,weights)=>Object.entries(weights).reduce((n,[k,w])=>n+measurement.components[k].confidence*w,0);
const partWeights=position=>({offense:OFFENSE_WEIGHTS[roleFor(position)],defense:{disruption:.65,rebounds:.35},role:{role:.7,rebounds:.3}});
export function makeCalibration(seeds,baseRows,advancedRows,cohort){
 const named=new Map();for(const row of baseRows){const key=normalizeName(row.PLAYER_NAME),list=named.get(key)??[];list.push(row);named.set(key,list);}const advanced=new Map(advancedRows.map(r=>[r.PLAYER_ID,r]));
 const samples={offense:[],defense:[],role:[]};
 for(const seed of seeds){const rows=named.get(normalizeName(seed.name))??[],b=rows.length===1?rows[0]:null;if(!b||b.MIN<MODEL_CONFIG.cohortMinimumMinutes||!advanced.has(b.PLAYER_ID))continue;const m=measureSeason(b,advanced.get(b.PLAYER_ID),cohort);for(const[k,weights]of Object.entries(partWeights(seed.position)))samples[k].push(rawPart(m,weights));}
 return Object.fromEntries(Object.entries(samples).map(([k,values])=>{assert.ok(values.length>200,'dated composite calibration sample');const center=values.reduce((a,b)=>a+b,0)/values.length,sd=Math.sqrt(values.reduce((n,v)=>n+(v-center)**2,0)/values.length);assert.ok(sd>.02,'nonzero measured raw composite variance');return[k,{n:values.length,center,sd,source:'dated >=600-minute unchanged-seed raw target composites, before confidence shrink'}];}));
}
export function combineMeasurements(position,current,prior){
 const role=roleFor(position),weights=current&&prior?[MODEL_CONFIG.currentWeight,MODEL_CONFIG.priorWeight]:current?[1,0]:prior?[0,1]:[0,0],generic=MODEL_CONFIG.genericRolePrior;
 const season=measurement=>Object.fromEntries(Object.entries(partWeights(position)).map(([k,part])=>{
  const raw=rawPart(measurement,part),calibration=measurement.calibration?.[k];assert.ok(calibration&&calibration.sd>0,'explicit dated raw composite calibration');
  const z=(raw-calibration.center)/calibration.sd;
  const unclipped=MODEL_CONFIG.calibrationCenter+MODEL_CONFIG.calibrationSpread*z;
  const target=bounded(unclipped,MODEL_CONFIG.gradeMinimum,MODEL_CONFIG.gradeMaximum);
  const confidence=certaintyPart(measurement,part);
  return[k,{raw,z,unclipped,target,confidence,grade:generic+(target-generic)*confidence}];
 }));
 const now=current?season(current):null,old=prior?season(prior):null;
 const combined=Object.fromEntries(Object.entries(partWeights(position)).map(([k,part])=>{
  if(!current&&!prior)return[k,{target:generic,confidence:0,grade:generic}];
  const nowWeight=(now?.[k].confidence??0)*weights[0],oldWeight=(old?.[k].confidence??0)*weights[1],denom=nowWeight+oldWeight;
  const target=denom>0?((now?.[k].target??0)*nowWeight+(old?.[k].target??0)*oldWeight)/denom:generic;
  const certainty=current&&prior?Object.entries(part).reduce((sum,[feature,w])=>{const exposure=(current.components[feature].percentile==null?0:current.components[feature].opportunities)+MODEL_CONFIG.priorOpportunityWeight*(prior.components[feature].percentile==null?0:prior.components[feature].opportunities);return sum+w*confidence(exposure,DEFINITIONS[feature].prior);},0):now?.[k].confidence??old?.[k].confidence??0;
  return[k,{target,confidence:certainty,grade:generic+(target-generic)*certainty,currentTargetWeight:nowWeight,priorTargetWeight:oldWeight}];
 }));
 const grades=Object.fromEntries(Object.entries(combined).map(([k,c])=>[k,c.grade]));
 const overall=.65*grades.offense+.15*grades.defense+.2*grades.role;
 const components=Object.fromEntries(Object.keys(DEFINITIONS).map(k=>[k,{score:current||prior?(current?.components[k].score??0)*weights[0]+(prior?.components[k].score??0)*weights[1]:.5,confidence:current||prior?(current?.components[k].confidence??0)*weights[0]+(prior?.components[k].confidence??0)*weights[1]:0}]));
 return {overall:Math.round(overall),offense:Math.round(grades.offense),defense:Math.round(grades.defense),role:Math.round(grades.role),index:(overall-60)/39,components,composites:{current:now,prior:old},combined,seasonWeights:weights,roleCohort:role,genericRolePrior:generic,defensiveStatus:'partial: counting and rebounding only, no individual defensive ability observation',roleStatus:'partial: existing seed position not independently verified, no official position field',currentAvailable:!!current,priorAvailable:!!prior};
}
export function generateModel(seeds,inputs){
 const lookup=rows=>{const named=new Map();for(const r of rows){const key=normalizeName(r.PLAYER_NAME);const list=named.get(key)??[];list.push(r);named.set(key,list);}return named;};
 const currentNamed=lookup(inputs.current),priorNamed=lookup(inputs.prior);
 const currentAdvanced=new Map(inputs.currentAdvanced.map(r=>[r.PLAYER_ID,r])),priorAdvanced=new Map(inputs.priorAdvanced.map(r=>[r.PLAYER_ID,r]));
 const priorById=new Map(inputs.prior.map(r=>[r.PLAYER_ID,r]));
 const currentCohort=makeCohorts(inputs.current,inputs.currentAdvanced),priorCohort=makeCohorts(inputs.prior,inputs.priorAdvanced);
 const calibration={current:makeCalibration(seeds,inputs.current,inputs.currentAdvanced,currentCohort),prior:makeCalibration(seeds,inputs.prior,inputs.priorAdvanced,priorCohort)};
 const usedIds=new Set();
 const players=seeds.map(seed=>{
  const exactCurrent=currentNamed.get(normalizeName(seed.name))??[],current=exactCurrent.length===1?exactCurrent[0]:null;
  const exactPrior=priorNamed.get(normalizeName(seed.name))??[],prior=current?priorById.get(current.PLAYER_ID)??null:exactPrior.length===1?exactPrior[0]:null;
  const identity=current??prior;
  if(identity){assert.ok(!usedIds.has(identity.PLAYER_ID),'unique seeded identity');usedIds.add(identity.PLAYER_ID);}
  const measuredCurrent=current?measureSeason(current,currentAdvanced.get(current.PLAYER_ID),currentCohort):null;
  const measuredPrior=prior?measureSeason(prior,priorAdvanced.get(prior.PLAYER_ID),priorCohort,current?1:MODEL_CONFIG.priorOnlyConfidence):null;
  if(measuredCurrent)measuredCurrent.calibration=calibration.current;if(measuredPrior)measuredPrior.calibration=calibration.prior;
  const model=combineMeasurements(seed.position,measuredCurrent,measuredPrior);
  return {team:seed.team,name:seed.name,position:seed.position,originalOverall:seed.overall,officialId:identity?.PLAYER_ID??null,status:current?'current-source candidate':prior?'prior-only, current-season identity/sample missing':'generic role-cohort simulation prior, identity unresolved',partial:true,model,evidence:{identity:'exact normalized name only, no guessed aliases',position:{value:seed.position,source:'unchanged existing seed',auditDate:'2026-07-10',independentVerification:false},current:current?{season:'2025-26',observedTeam:current.TEAM_ABBREVIATION,ageInSeason:current.AGE,...measuredCurrent}:null,prior:prior?{season:'2024-25',observedTeam:prior.TEAM_ABBREVIATION,ageInSeason:prior.AGE,...measuredPrior}:null},limits:['Simulation rating, not a historical fact or independently verified scouting grade.','Official datasets share one NBA source lineage.','Seasonal team and age are not current roster or exact present age.','The defense component omits DEF_RATING and is incomplete.']};
 });
 return {version:MODEL_VERSION,config:MODEL_CONFIG,calibration,cohorts:{current:currentCohort.eligible,prior:priorCohort.eligible},players};
}
export function openingFinance(seeds,model,salaryFor){
 return [...new Set(seeds.map(p=>p.team))].map(team=>{
  const rows=model.players.filter(p=>p.team===team),original=seeds.filter(p=>p.team===team),budgetTenths=Math.round(original.reduce((n,p)=>n+salaryFor(p.overall),0)*10),minimumTenths=20;
  const asks=rows.map(p=>salaryFor(p.model.overall)),aboveFloor=asks.map(v=>Math.max(0,v*10-minimumTenths)),available=budgetTenths-minimumTenths*rows.length,total=aboveFloor.reduce((a,b)=>a+b,0);
  assert.ok(available>=0&&total>0,'positive opening budget and graded allocation');
  const exact=aboveFloor.map(v=>minimumTenths+available*v/total),tenths=exact.map(Math.floor),remaining=budgetTenths-tenths.reduce((a,b)=>a+b,0);
  const order=exact.map((v,i)=>({i,fraction:v-Math.floor(v)})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);for(let n=0;n<remaining;n++)tenths[order[n].i]++;
  return {team,originalBudget:budgetTenths/10,candidateBudget:tenths.reduce((a,b)=>a+b,0)/10,policy:'Simulation opening prices allocated from new grade asks within the exact original club budget and $2M floor, not real contracts. Terms and ages are held separately.',players:rows.map((p,i)=>({name:p.name,position:p.position,overall:p.model.overall,originalOverall:p.originalOverall,originalSalary:salaryFor(p.originalOverall),gradeAsk:asks[i],salary:tenths[i]/10}))};
 });
}
