import assert from 'node:assert/strict';

export function createSelectedOfferFixture({ engine: E, codec }) {
  const home={id:'offer-home',name:'Offer Home FC',country:'England',tier:1,color:'#123456',league:'Fixture League'};
  const a={...home,id:'offer-a',name:'Harbour Offer FC'},b={...home,id:'offer-b',name:'Riverside Offer FC'};
  let career=E.initCareer('Offer Browser','England','ST','2020-24',
    {pace:75,shooting:75,passing:75,dribbling:75,defending:75,physical:75,reflexes:75},75,2020,[home],null,90);
  const row={year:2028,age:24,club:home.name,clubCountry:home.country,clubTier:1,apps:32,goals:17,assists:8,cleanSheets:4,
    yellowCards:2,redCards:0,rating:8,ovr:75,leagueTitle:false,domesticCup:false,championsLeague:false,worldCup:false,
    ballonDor:false,ballonDorRank:null,type:'playing',intApps:0,intGoals:0,intAssists:0,intRating:0,tournament:null,tournamentResult:null};
  career={...career,age:24,currentClub:home.name,currentClubCountry:home.country,currentClubTier:1,currentClubColor:home.color,
    currentLeague:home.league,weeklyWage:8000,contractYearsLeft:1,netWorth:3,totalEarnings:5,agentFeesPaid:0,
    phase:'transfer_window',retired:false,agentId:'self',seasons:[...career.seasons,row],pendingOffers:[],
    transferSituation:{type:'bidding_war',offerA:{club:a,wage:10000,contractYears:3,transferFee:1},
      offerB:{club:b,wage:12000,contractYears:4,transferFee:4}}};
  for(let n=0;n<2;n++)career=E.repairCareer(codec.parseSoccerCareerSave(codec.serializeSoccerCareerSave(career)));
  assert.equal(career.phase,'transfer_window');assert.equal(career.transferSituation?.type,'bidding_war');
  assert.equal(career.agentId,'self');assert.equal(career.weeklyWage,8000);
  assert.equal(career.transferSituation.offerB.wage,12000);
  assert.equal(career.transferSituation.offerB.contractYears,4);
  const raw=codec.serializeSoccerCareerSave(career);
  assert(codec.isSoccerCareerSave(codec.parseSoccerCareerSave(raw)));
  return {raw,expected:{key:'soccerCareerSave',home:home.name,clubA:a.name,clubB:b.name,year:2029,
    a:JSON.parse(JSON.stringify(career.transferSituation.offerA)),b:JSON.parse(JSON.stringify(career.transferSituation.offerB)),
    stats:Object.fromEntries(['pace','shooting','passing','dribbling','defending','physical','reflexes','overall'].map(k=>[k,career[k]])),
    scope:'Explicit fictional current-offer fixture, actual constructor/codec/repair, not natural career progression.'}};
}

export async function runSelectedOffer({page,width,base,fixture,photo,tap,goto,save}) {
  const x=fixture.expected,key=x.key;
  const state=async()=>JSON.parse(await save(key));
  const skills=c=>Object.fromEntries(Object.keys(x.stats).map(k=>[k,c[k]]));
  const contract=c=>({club:c.currentClub,wage:c.weeklyWage,years:c.contractYearsLeft,phase:c.phase,
    agentId:c.agentId,agentFeesPaid:c.agentFeesPaid,stats:skills(c),negotiated:c.programme?.negotiated});
  await goto('/soccer-career');
  if(base)assert.equal(new URL(page.url()).origin,new URL(base).origin);
  await page.getByRole('button',{name:'Review contract with '+x.clubA,exact:true}).waitFor({state:'visible'});
  await page.getByRole('button',{name:'Review contract with '+x.clubB,exact:true}).waitFor({state:'visible'});
  await tap(page.locator('[data-soccer-programme-open]'));
  await tap(page.locator('[data-programme-start]'));
  await tap(page.locator('[data-programme-tile="negotiation"]'));
  const picker=page.getByRole('combobox',{name:'Offer to negotiate',exact:true}),beforeSelection=await save(key);
  await picker.selectOption('1');
  const label=await picker.locator('option:checked').textContent();
  assert.equal(label,x.clubB+': EUR 12,000 a week, 4 years');
  assert.equal(await save(key),beforeSelection,'Selecting/reading does not commit a proposal');
  const before=await state();
  assert.deepEqual(before.transferSituation.offerA,x.a);assert.deepEqual(before.transferSituation.offerB,x.b);
  await tap(page.locator('[data-programme-choice="wage"]'));
  await page.waitForFunction(({key,wage})=>{try{return JSON.parse(localStorage.getItem(key)).transferSituation?.offerB?.wage===wage;}catch{return false;}},{key,wage:13200});
  const counteredRaw=await save(key),countered=JSON.parse(counteredRaw);
  assert.equal(countered.transferSituation.type,'bidding_war');
  assert.deepEqual(countered.transferSituation.offerA,x.a);
  assert.deepEqual(countered.transferSituation.offerB,{...x.b,wage:13200});
  assert.deepEqual(countered.programme.negotiated,[{year:x.year,club:x.clubB,mode:'wage',accepted:true}]);
  const outside={...countered,transferSituation:before.transferSituation};
  if(before.programme===undefined)delete outside.programme;else outside.programme=before.programme;
  assert.deepEqual(outside,before,'Only the selected offer and negotiation receipt changed');
  assert.deepEqual(skills(countered),x.stats);
  for(const id of['wage','shorter'])assert.equal(await page.locator('[data-programme-choice="'+id+'"]').isDisabled(),true,'One proposal per club');
  await tap(page.locator('[data-programme-close]'));
  const review=page.getByRole('button',{name:'Review contract with '+x.clubB,exact:true});
  await tap(review);
  const dialog=page.locator('[data-soccer-offer-review]');
  await dialog.waitFor({state:'visible'});
  assert.equal(await dialog.locator('[data-offer-club]').textContent(),x.clubB);
  assert.equal(await dialog.locator('[data-offer-signed-wage]').getAttribute('data-offer-signed-wage'),'13200');
  assert.equal(await dialog.locator('[data-offer-contract-years]').getAttribute('data-offer-contract-years'),'4');
  await photo('offer-review','[data-soccer-offer-review]');
  await tap(dialog.getByRole('button',{name:'Back',exact:true}));
  await dialog.waitFor({state:'hidden'});
  assert.equal(await save(key),counteredRaw,'Review/Back does not sign');
  assert.equal((await state()).currentClub,x.home);assert.equal((await state()).weeklyWage,8000);
  await tap(review);await dialog.waitFor({state:'visible'});
  await tap(dialog.getByRole('button',{name:'Sign contract',exact:true}));
  await page.waitForFunction(({key,club})=>{try{const c=JSON.parse(localStorage.getItem(key));return c.phase==='playing'&&c.currentClub===club;}catch{return false;}},{key,club:x.clubB});
  const signed=await state(),wanted={club:x.clubB,wage:13200,years:4,phase:'playing',agentId:'self',agentFeesPaid:0,
    stats:x.stats,negotiated:[{year:x.year,club:x.clubB,mode:'wage',accepted:true}]};
  assert.deepEqual(contract(signed),wanted);
  await page.reload();
  await page.getByRole('button',{name:'Open the training ground',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(club=>document.querySelector('#dukb-main')?.textContent.includes(club),x.clubB);
  const reloaded=await state();
  assert.deepEqual(contract(reloaded),wanted,'Actual reload keeps the signed contract and one receipt');
  return {width,selectedLabel:label,selectionReadOnly:true,offerA:countered.transferSituation.offerA,
    offerBCountered:countered.transferSituation.offerB,review:{club:x.clubB,wage:13200,years:4,backHeld:true},
    signed:contract(signed),reloaded:contract(reloaded),
    scope:'Compiled Page B-selection/counter/actual contract review and signing/real codec reload. No annual payment or natural-career claim.'};
}
