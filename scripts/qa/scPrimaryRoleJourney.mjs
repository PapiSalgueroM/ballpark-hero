import assert from 'node:assert/strict';

// Source-bound fixture construction only. Browser input, clocks and RNG stay native.
export function createPrimaryRoleFixture({engine:E,codec,programme:P}) {
  assert.equal(typeof E.advanceProSeason,'function');assert.equal(typeof P.chooseProgramme,'function');
  const club=E.FALLBACK_CLUBS.find(row=>row.tier===2&&row.country==='England');assert(club);
  const attributes=['pace','shooting','passing','dribbling','defending','physical','reflexes'];
  let career=null,attempts=0;
  for(;attempts<12&&!career;attempts++){
    let c=E.initCareer('Primary Role Browser','England','ST','2020-24',
      Object.fromEntries(attributes.map(key=>[key,98])),98,2024,E.FALLBACK_CLUBS,null,99);
    c=E.acceptOffer(c,{club,wage:12000,contractYears:5,transferFee:0});
    c={...c,rival:null,rivalCreated:true,internationalCareer:false,intStats:{...c.intStats,isRetired:true}};
    let complete=true;
    for(let year=0;year<2;year++){
      // Only the presentation phase is staged between actual engine-completed seasons.
      c={...c,phase:'playing'};
      c=P.chooseProgramme(c,'position','LW');
      assert.equal(c.programme?.plan?.choices.position,'LW');
      const priorYear=c.seasons.at(-1).year;
      c=E.advanceProSeason(c,E.FALLBACK_CLUBS);
      const row=c.seasons.at(-1),receipt=c.programme?.receipts.at(-1);
      if(!row||row.year!==priorYear+1||row.type!=='playing'||row.apps<=0||row.injurySevere
        ||row.club!==club.name||receipt?.status!=='completed'||receipt.year!==row.year||receipt.choices.position!=='LW'){
        complete=false;break;
      }
    }
    if(complete&&c.programme?.secondaryTraining?.seasons===2&&c.programme?.secondaryPosition?.position==='LW')career=c;
  }
  assert(career,'Bounded actual-season fixture search must earn both completed course receipts');
  const proofRows=JSON.parse(JSON.stringify(career.seasons.slice(-2)));
  const proofReceipts=JSON.parse(JSON.stringify(career.programme.receipts.slice(-2)));
  assert.deepEqual(proofRows.map(row=>row.year),[2025,2026]);
  assert.deepEqual(proofReceipts.map(row=>[row.year,row.status,row.choices.position,row.secondaryPosition]),
    [[2025,'completed','LW',null],[2026,'completed','LW','LW']]);
  // Controlled current attributes test that adoption cannot hand out rating points.
  career={...career,phase:'playing'};
  for(const key of attributes)career[key]=98;
  career.overall=E.calcOverall(career,career.position);assert.equal(career.overall,98);
  for(let i=0;i<2;i++)career=E.repairCareer(codec.parseSoccerCareerSave(codec.serializeSoccerCareerSave(career)));
  career=P.chooseProgramme(P.chooseProgramme(P.chooseProgramme(career,'tactics','creator'),'bonuses','goals'),'position','LW');
  assert.equal(P.programmeEffects(career).appsMult,0.97*1.03);
  assert.deepEqual(career.seasons.slice(-2),proofRows);assert.deepEqual(career.programme.receipts.slice(-2),proofReceipts);
  const raw=codec.serializeSoccerCareerSave(career),read=codec.parseSoccerCareerSave(raw);
  assert(codec.isSoccerCareerSave(read));assert.equal(codec.serializeSoccerCareerSave(E.repairCareer(read)),raw);
  return {raw,expected:{key:'soccerCareerSave',from:'ST',to:'LW',attributes:[...attributes,'overall'],value:98,
    club:career.currentClub,age:career.age,attempts,proofRows,proofReceipts,
    secondaryTraining:JSON.parse(JSON.stringify(career.programme.secondaryTraining)),
    secondaryPosition:JSON.parse(JSON.stringify(career.programme.secondaryPosition)),
    plan:JSON.parse(JSON.stringify(career.programme.plan)),
    scope:'Controlled fictional player from the real constructor and contract acceptance. Two completed course receipts and playing records come from actual advanceProSeason calls, never handwritten receipts. Presentation phase is staged between model seasons; current attributes are explicitly normalized to98 afterward. No natural-career or ordinary phase-progression claim. No RNG or clock override.'}};
}

export async function runPrimaryRole({page,width,base,fixture,engine:E,photo,tap,goto,save}) {
  const x=fixture.expected,key=x.key,read=async()=>JSON.parse(await save(key));
  const idle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const scroll=()=>page.evaluate(()=>[scrollX,scrollY]);
  const native=async(label,control,action)=>{
    await control.scrollIntoViewIfNeeded();if(width<768)await control.tap({trial:true});else await control.click({trial:true});await idle();const before=await scroll();
    if(action)await action();else await tap(control);await idle();const after=await scroll();
    assert.deepEqual(after,before,label+' document scroll held');return {label,before,after};
  };
  const observations=[];
  await goto('/soccer-career');if(base)assert.equal(new URL(page.url()).origin,new URL(base).origin);
  const opener=page.locator('[data-soccer-programme-open]');await opener.waitFor({state:'visible'});
  const initialRaw=await save(key);assert.equal(initialRaw,fixture.raw,'Actual reader keeps the source-bound fixture');
  const before=await read();assert.equal(before.position,x.from);
  assert.deepEqual(before.seasons.slice(-2),x.proofRows);assert.deepEqual(before.programme.receipts.slice(-2),x.proofReceipts);
  assert.deepEqual(before.programme.secondaryTraining,x.secondaryTraining);assert.deepEqual(before.programme.secondaryPosition,x.secondaryPosition);
  assert.deepEqual(Object.fromEntries(x.attributes.map(k=>[k,before[k]])),Object.fromEntries(x.attributes.map(k=>[k,98])));
  assert.equal(E.calcOverall(before,before.position),98);
  observations.push(await native('Open plans',opener));
  const dialog=page.locator('[data-soccer-programme]');await dialog.waitFor({state:'visible'});
  const rules=await dialog.locator('[data-programme-rules]').textContent();
  assert(/3%/.test(rules)&&/adopt|primary/i.test(rules)&&/two.*season/i.test(rules),'Worked example explains the earned role and flexibility cost');
  observations.push(await native('Read plans',dialog.getByRole('button',{name:'See my plans',exact:true})));
  const position=dialog.locator('[data-programme-tile="position"]');
  observations.push(await native('Open second position',position));
  const detail=dialog.locator('[data-programme-detail="position"]');await detail.waitFor({state:'visible'});
  assert((await detail.locator('[data-programme-context]').textContent()).includes('Current primary position: ST.'));
  assert.equal(await save(key),initialRaw,'Opening help and role detail is read only');
  observations.push(await native('Back to plans',dialog.getByRole('button',{name:'Back to plans',exact:true})));
  observations.push(await native('Close unchanged plans',dialog.getByRole('button',{name:'Close career programme',exact:true})));
  await dialog.waitFor({state:'hidden'});assert.equal(await save(key),initialRaw,'Default close changes no saved choice');
  observations.push(await native('Reopen plans',opener));
  await dialog.waitFor({state:'visible'});
  observations.push(await native('Read reopened plans',dialog.getByRole('button',{name:'See my plans',exact:true})));
  observations.push(await native('Reopen second position',dialog.locator('[data-programme-tile="position"]')));
  const option=dialog.locator('[data-programme-option="adopt"]'),button=dialog.getByRole('button',{name:'Choose Make LW my primary position',exact:true});
  await option.waitFor({state:'visible'});assert.equal(await button.isEnabled(),true);
  const tradeoff=await option.locator('[data-programme-tradeoff]').textContent();
  assert(/3%/.test(tradeoff)&&/course/i.test(tradeoff)&&/flexibility/i.test(tradeoff));
  assert.equal(await save(key),initialRaw);
  await photo('earned-primary-role','[data-programme-option="adopt"]');
  observations.push(await native('Adopt earned LW',button));
  await page.waitForFunction(key=>{try{return JSON.parse(localStorage.getItem(key)).position==='LW';}catch{return false;}},key);
  await page.waitForFunction(()=>document.querySelector('[data-programme-context]')?.textContent.includes('Current primary position: LW.'));
  const afterRaw=await save(key),after=JSON.parse(afterRaw),wanted=JSON.parse(initialRaw);
  wanted.position='LW';delete wanted.programme.secondaryTraining;delete wanted.programme.secondaryPosition;
  delete wanted.programme.plan.choices.position;
  assert.deepEqual(after,wanted,'Only primary position and the consumed course/flexibility paths change');
  assert.deepEqual(after.programme.plan.choices,{tactics:'creator',bonuses:'goals'});
  assert.deepEqual(after.programme.plan.bonusEuros,before.programme.plan.bonusEuros);
  assert.deepEqual(after.seasons,before.seasons);
  assert.deepEqual(Object.fromEntries(x.attributes.map(k=>[k,after[k]])),Object.fromEntries(x.attributes.map(k=>[k,98])));
  assert.equal(await dialog.locator('[data-programme-choice="adopt"]').count(),0,'Consumed qualification cannot be adopted twice');
  observations.push(await native('Close adopted plans',dialog.getByRole('button',{name:'Close career programme',exact:true})));
  await dialog.waitFor({state:'hidden'});
  await page.reload();await opener.waitFor({state:'visible'});
  assert.equal(await save(key),afterRaw,'Reload preserves the full adopted save bytes');
  const loaded=await read();assert.deepEqual(loaded,wanted);
  observations.push(await native('Open persisted plans',opener));await dialog.waitFor({state:'visible'});
  observations.push(await native('Read persisted plans',dialog.getByRole('button',{name:'See my plans',exact:true})));
  observations.push(await native('Read persisted role',dialog.locator('[data-programme-tile="position"]')));
  assert((await dialog.locator('[data-programme-context]').textContent()).includes('Current primary position: LW.'));
  assert.equal(await dialog.locator('[data-programme-choice="adopt"]').count(),0);
  assert.equal(await save(key),afterRaw,'Persisted role inspection is read only');
  return {width,from:x.from,to:loaded.position,attributes:Object.fromEntries(x.attributes.map(k=>[k,loaded[k]])),
    sourceCourseRows:x.proofRows,sourceCourseReceipts:x.proofReceipts,actualSeasonProof:true,defaultReadHeld:true,
    flexibilityConsumed:true,otherPlansHeld:true,fullSaveOnlyAllowedPaths:true,reloadedBytesHeld:true,observations,
    scope:'Actual native earned-role adoption and complete save/reload at fixed source. Attributes98, contracts, money, prior seasons and unrelated plans held. Fixture course receipts use real season calls. Future role-model consequences are separately covered by ordinary tests; no natural progression claim.'};
}
