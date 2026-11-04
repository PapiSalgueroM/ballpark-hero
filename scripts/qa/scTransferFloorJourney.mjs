import assert from 'node:assert/strict';

// The caller supplies its real source-bound engine, codec and programme bundles.
export function createSelectedOfferFixture({engine:E,codec,programme:P}) {
  assert.equal(typeof P?.settleSoccerProgramme,'function');
  const home={id:'floor-browser-home',name:'Appearance Browser FC',country:'England',tier:2,color:'#123456',league:'Fixture Home League'};
  let career=E.initCareer('Appearance Browser','England','ST','2020-24',
    {pace:75,shooting:75,passing:75,dribbling:75,defending:75,physical:75,reflexes:75},75,2020,[{...home,tier:1}],null,90);
  const row={year:2027,age:23,club:home.name,clubCountry:home.country,clubTier:2,apps:20,leagueApps:20,
    goals:7,assists:4,cleanSheets:0,yellowCards:2,redCards:0,rating:7.2,ovr:75,
    leagueTitle:false,domesticCup:false,championsLeague:false,worldCup:false,ballonDor:false,ballonDorRank:null,type:'playing',
    intApps:0,intGoals:0,intAssists:0,intRating:0,tournament:null,tournamentResult:null};
  career={...career,age:23,currentClub:home.name,currentClubCountry:home.country,currentClubTier:2,currentClubColor:home.color,
    currentLeague:home.league,weeklyWage:8000,contractYearsLeft:1,netWorth:3,totalEarnings:5,agentFeesPaid:0,
    phase:'playing',retired:false,agentId:'self',seasons:[...career.seasons,row],pendingOffers:[],transferSituation:null};
  career=P.chooseProgramme(career,'promise','starter');
  assert.equal(career.programme?.plan?.year,2028);
  assert.equal(career.programme?.plan?.choices.promise,'starter');
  const completed={...row,year:2028,age:24,apps:10,leagueApps:10,goals:3,assists:2};
  career={...career,age:24,seasons:[...career.seasons,completed]};
  P.settleSoccerProgramme(career,completed);
  career={...career,phase:'transfer_window',transferSituation:{type:'no_interest'}};
  for(let n=0;n<2;n++)career=E.repairCareer(codec.parseSoccerCareerSave(codec.serializeSoccerCareerSave(career)));
  assert.equal(P.programmePromiseBroken(career),true,'Actual recorded promise settlement grants the existing response rule');
  assert.equal(career.transferBrief,undefined);
  const pool=E.FALLBACK_CLUBS;
  assert(Array.isArray(pool)&&pool.length>100,'Same bundled pool used by the real Page');
  const normal=E.transferBriefPreview(career,pool),minimum=E.transferBriefPreview(career,pool,26);
  const normalLevel=normal.options.find(x=>x.id==='level'),minimumLevel=minimum.options.find(x=>x.id==='level');
  assert.equal(normal.eligible,true);assert(normalLevel.matchingCount>0);
  assert.deepEqual(normalLevel.projection,{min:20,max:30});
  assert(minimumLevel.matchingCount>0);assert.deepEqual(minimumLevel.tiers,[3]);
  assert.deepEqual(minimumLevel.projection,{min:26,max:34});
  const raw=codec.serializeSoccerCareerSave(career);
  assert(codec.isSoccerCareerSave(codec.parseSoccerCareerSave(raw)));
  return {raw,expected:{key:'soccerCareerSave',home:home.name,priority:'level',minimumApps:26,
    context:{club:home.name,seasonCount:career.seasons.length,lastYear:2028,overall:75,age:24,nationality:'England'},
    poolCount:pool.length,eligibleCount:normalLevel.eligibleCount,normalLevel,minimumLevel,
    stats:Object.fromEntries(['pace','shooting','passing','dribbling','defending','physical','reflexes','overall'].map(k=>[k,career[k]])),
    programme:JSON.parse(JSON.stringify(career.programme)),
    scope:'Controlled fictional career and explicit low-appearance senior record, settled by the real programme helper. Uses the Page bundled club pool and existing guaranteed-response rule; no RNG override or natural-career claim.'}};
}

export async function runSelectedOffer({page,width,base,fixture,engine:E,photo,tap,goto,save}) {
  assert.equal(typeof E?.projectLeagueApps,'function','Caller supplies the real SC engine for read-only projection checks');
  const x=fixture.expected,key=x.key,state=async()=>JSON.parse(await save(key));
  const skills=c=>Object.fromEntries(Object.keys(x.stats).map(k=>[k,c[k]]));
  const contract=c=>({club:c.currentClub,country:c.currentClubCountry,tier:c.currentClubTier,league:c.currentLeague,
    wage:c.weeklyWage,years:c.contractYearsLeft,phase:c.phase,agentId:c.agentId,agentFeesPaid:c.agentFeesPaid,
    netWorth:c.netWorth,totalEarnings:c.totalEarnings,stats:skills(c),programme:c.programme,brief:c.transferBrief});
  await goto('/soccer-career');
  if(base)assert.equal(new URL(page.url()).origin,new URL(base).origin);
  await page.locator('[data-request-transfer]').waitFor({state:'visible'});
  const initialRaw=await save(key);assert.equal(initialRaw,fixture.raw);
  await tap(page.locator('[data-transfer-brief-open]'));
  const help=page.getByRole('button',{name:'Choose a priority',exact:true});
  if(await help.count())await tap(help);
  await page.locator('[data-transfer-brief-preview]').waitFor({state:'visible'});
  await page.locator('[data-transfer-brief-preview]').getByText(new RegExp('^'+x.eligibleCount+' eligible clubs before')).waitFor({state:'visible'});
  const minimum=page.getByRole('combobox',{name:'Minimum projected league appearances',exact:true});
  await minimum.selectOption('26');
  const level=page.locator('[data-transfer-priority="level"]');
  await page.waitForFunction(({count})=>document.querySelector('[data-transfer-priority="level"]')?.textContent.includes(count+' matching club'),{count:x.minimumLevel.matchingCount});
  await tap(level);
  assert.equal(await save(key),initialRaw,'Reading the actual pool and editing the brief is not a saved decision');
  await tap(page.locator('[data-transfer-brief-save]'));
  await page.waitForFunction(({key})=>{try{const b=JSON.parse(localStorage.getItem(key)).transferBrief;return b?.priority==='level'&&b.minimumApps===26;}catch{return false;}},{key});
  const staged=await state();
  assert.deepEqual(staged.transferBrief,{version:1,priority:'level',context:x.context,minimumApps:26});
  const initial=JSON.parse(initialRaw),outside={...staged};delete outside.transferBrief;
  assert.deepEqual(outside,initial,'Only the saved window brief changes');
  await tap(page.locator('[data-request-transfer]'));
  await page.waitForFunction(({key})=>{try{const c=JSON.parse(localStorage.getItem(key));return c.phase==='transfer_window'&&c.transferSituation?.type==='request_result'&&!!c.transferSituation.offer;}catch{return false;}},{key});
  const responseRaw=await save(key),response=JSON.parse(responseRaw),offer=response.transferSituation.offer,result=response.transferBrief?.result;
  assert.equal(response.transferBrief.minimumApps,26);assert.deepEqual(response.transferBrief.context,x.context);
  assert.equal(result?.status,'offered');assert.deepEqual(result.offer,offer);
  assert.equal(result.eligibleCount,x.eligibleCount);assert.equal(result.matchingCount,x.minimumLevel.matchingCount);
  assert(E.FALLBACK_CLUBS.some(c=>c.id===offer.club.id&&c.name===offer.club.name&&c.country===offer.club.country),'Offer belongs to the real bundled Page pool');
  const band=E.projectLeagueApps(response.overall,offer.club.tier,offer.club.name,0);
  assert(band.min>=26);assert.deepEqual(result.projection,band);assert.equal(offer.club.tier,3);
  assert.deepEqual(skills(response),x.stats);assert.deepEqual(response.programme,x.programme);
  assert.equal(await page.locator('[data-request-transfer]').count(),0,'A completed response cannot be requested again');
  await page.reload();
  const review=page.getByRole('button',{name:'Review contract with '+offer.club.name,exact:true});
  await review.waitFor({state:'visible'});
  assert.equal(await save(key),responseRaw,'Reload preserves the exact sealed response rather than rerolling');
  assert.equal(await page.locator('[data-request-transfer]').count(),0);
  await tap(review);
  const dialog=page.locator('[data-soccer-offer-review]');await dialog.waitFor({state:'visible'});
  assert.equal(await dialog.locator('[data-offer-club]').textContent(),offer.club.name);
  assert.equal(await dialog.locator('[data-offer-signed-wage]').getAttribute('data-offer-signed-wage'),String(offer.wage));
  assert.equal(await dialog.locator('[data-offer-contract-years]').getAttribute('data-offer-contract-years'),String(offer.contractYears));
  await photo('appearance-floor-offer','[data-soccer-offer-review]');
  await tap(dialog.getByRole('button',{name:'Back',exact:true}));await dialog.waitFor({state:'hidden'});
  assert.equal(await save(key),responseRaw,'Review and Back do not sign');
  await tap(review);await dialog.waitFor({state:'visible'});await tap(dialog.getByRole('button',{name:'Sign contract',exact:true}));
  await page.waitForFunction(({key,club})=>{try{const c=JSON.parse(localStorage.getItem(key));return c.phase==='playing'&&c.currentClub===club;}catch{return false;}},{key,club:offer.club.name});
  const signed=await state(),wanted={club:offer.club.name,country:offer.club.country,tier:offer.club.tier,league:offer.club.league,
    wage:offer.wage,years:offer.contractYears,phase:'playing',agentId:'self',agentFeesPaid:0,netWorth:3,totalEarnings:5,
    stats:x.stats,programme:x.programme,brief:undefined};
  assert.deepEqual(contract(signed),wanted);
  const signedBand=E.projectLeagueApps(signed.overall,signed.currentClubTier,signed.currentClub,0);assert.deepEqual(signedBand,band);
  await page.reload();await page.getByRole('button',{name:'Open the training ground',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(club=>document.querySelector('#dukb-main')?.textContent.includes(club),offer.club.name);
  const reloaded=await state();assert.deepEqual(contract(reloaded),wanted);
  return {width,poolCount:x.poolCount,eligibleCount:x.eligibleCount,minimumApps:26,normalLevel:x.normalLevel,minimumLevel:x.minimumLevel,
    savedBrief:staged.transferBrief,offer,projection:band,sealedResponseReload:true,reviewBackHeld:true,signed:contract(signed),reloaded:contract(reloaded),
    scope:'Actual native brief choice and request through the full bundled Page pool, actual offer review/signing and codec reload. Projected appearances are not guaranteed starts.'};
}
