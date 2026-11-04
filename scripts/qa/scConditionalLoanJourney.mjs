import assert from 'node:assert/strict';

const copy = value => JSON.parse(JSON.stringify(value));

// Fixture construction only. All parent-season records are actual engine outputs.
export function createConditionalLoanFixture({engine:E,codec,programme:P}) {
  const parent=E.FALLBACK_CLUBS.find(club=>club.country==='England'&&club.tier===2);
  const borrower=E.FALLBACK_CLUBS.find(club=>club.country==='England'&&club.tier===3);
  assert(parent&&borrower&&parent.name!==borrower.name);
  let career=null,attempts=0;
  for(;attempts<12&&!career;attempts++){
    let c=E.initCareer('Conditional Loan Browser','England','ST','2020-24',
      {pace:75,shooting:75,passing:75,dribbling:75,defending:75,physical:75,reflexes:75},
      75,2024,E.FALLBACK_CLUBS,null,99);
    c={...c,agentId:'self',rival:null,rivalCreated:true,internationalCareer:false,intStats:{...c.intStats,isRetired:true}};
    c=E.acceptOffer(c,{club:parent,wage:12000,contractYears:5,transferFee:0});
    c=E.advanceProSeason(c,E.FALLBACK_CLUBS);
    const played=c.seasons.at(-1);
    if(!played||played.type!=='playing'||played.club!==parent.name||played.apps<=0||played.injurySevere||c.retired)continue;
    // Isolate the next football decision, not natural presentation or story progression.
    c={...c,phase:'playing',pendingEvents:[]};
    c=E.acceptLoan(c,{club:borrower,wage:12000,contractYears:1,transferFee:0,isLoan:true});
    if(c.currentClub===borrower.name&&c.loan?.parentClub===parent.name)career=c;
  }
  assert(career,'Bounded real-parent-season fixture must reach the actual loan');
  for(let i=0;i<2;i++)career=E.repairCareer(codec.parseSoccerCareerSave(codec.serializeSoccerCareerSave(career)));
  assert.equal(career.currentClub,borrower.name);assert.equal(career.loan.parentClub,parent.name);
  assert.equal(career.weeklyWage,12000);assert.equal(career.phase,'playing');
  assert.equal(career.programme,undefined);
  const choices=P.programmeOptions(career).find(view=>view.id==='loan').choices;
  assert(choices.some(choice=>choice.id==='buy_18'&&choice.eligible));
  assert(choices.some(choice=>choice.id==='buy_26'&&choice.eligible));
  const raw=codec.serializeSoccerCareerSave(career),decoded=codec.parseSoccerCareerSave(raw);
  assert(codec.isSoccerCareerSave(decoded));assert.equal(codec.serializeSoccerCareerSave(E.repairCareer(decoded)),raw);
  return {raw,expected:{key:'soccerCareerSave',minimum:18,mode:'buy_18',parent:copy(parent),borrower:copy(borrower),
    wage:12000,years:career.contractYearsLeft,year:career.seasons.at(-1).year+1,rows:copy(career.seasons),
    loan:copy(career.loan),attempts,projection:E.projectLeagueApps(career.overall,career.currentClubTier,career.currentClub,0),
    scope:'Fictional player from the real constructor, actual parent contract and actual completed parent season, then real acceptLoan. Presentation phase is staged and unresolved story prompts are cleared before the isolated loan decision. The browser plays the next actual season with native RNG and clock; injuries and the appearance threshold remain uncertain. No handwritten earned receipts or natural-career claim.'}};
}

// The shared caller owns isolated seeding, real codec binding, traffic, photos and source/dist holds.
export async function runConditionalLoan({page,width,base,fixture,codec,photo,tap,goto,save}) {
  assert.equal(typeof codec.parseSoccerCareerSave,'function');
  const x=fixture.expected,key=x.key;
  const read=async()=>{const value=codec.parseSoccerCareerSave(await save(key));assert(codec.isSoccerCareerSave(value));return value;};
  const idle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const scroll=()=>page.evaluate(()=>[scrollX,scrollY]);
  const actions=[];
  const native=async(label,control)=>{
    await control.scrollIntoViewIfNeeded();
    if(width<768)await control.tap({trial:true});else await control.click({trial:true});
    await idle();const before=await scroll();await tap(control);await idle();const after=await scroll();
    assert.deepEqual(after,before,label+' document scroll held');actions.push({label,before,after});
  };
  const changed=async before=>page.waitForFunction(({key,before})=>{const raw=localStorage.getItem(key);return raw!==null&&raw!==before;},{key,before});
  await goto('/soccer-career');if(base)assert.equal(new URL(page.url()).origin,new URL(base).origin);
  const opener=page.locator('[data-soccer-programme-open]');await opener.waitFor({state:'visible'});
  const initialRaw=await save(key),initial=await read();assert.equal(initialRaw,fixture.raw);
  assert.equal(initial.currentClub,x.borrower.name);assert.deepEqual(initial.loan,x.loan);
  assert.deepEqual(initial.seasons,x.rows);assert.equal(initial.weeklyWage,x.wage);
  const dialog=page.locator('[data-soccer-programme]');
  const open=async()=>{
    await native('Open loan plans',opener);await dialog.waitFor({state:'visible'});
    const rules=await dialog.locator('[data-programme-rules]').textContent();
    assert(/18/.test(rules)&&/26/.test(rules)&&/cup/i.test(rules)&&/parent/i.test(rules));
    await native('Read plans',dialog.getByRole('button',{name:'See my plans',exact:true}));
    await native('Open loan decision',dialog.locator('[data-programme-tile="loan"]'));
    await dialog.locator('[data-programme-detail="loan"]').waitFor({state:'visible'});
  };
  const queue=async()=>{
    const before=await save(key);
    await native('Choose actual league condition',dialog.getByRole('button',{name:'Choose Stay after 18 league appearances',exact:true}));
    await changed(before);
    const actual=await read(),expected=copy(initial);
    expected.programme={version:1,receipts:[],plan:{year:x.year,club:x.borrower.name,choices:{loan:x.mode}},
      loanBuy:{year:x.year,club:x.borrower.name,parent:x.parent.name,ready:false,minimumLeagueApps:18}};
    assert.deepEqual(actual,expected,'SC_LOAN_APP_QUEUE_ONLY_RECORDS_THE_CONDITION');
    return await save(key);
  };
  await open();assert.equal(await save(key),initialRaw,'SC_LOAN_APP_READING_IS_READONLY');
  assert.equal(await dialog.getByRole('button',{name:'Choose Make the move permanent',exact:true}).count(),1);
  const firstQueued=await queue(),expectedCancelled=copy(initial);
  expectedCancelled.programme={version:1,receipts:[],plan:{year:x.year,club:x.borrower.name,choices:{}}};
  await native('Cancel conditional agreement',dialog.getByRole('button',{name:'Cancel plan',exact:true}));
  await changed(firstQueued);assert.deepEqual(await read(),expectedCancelled,'SC_LOAN_APP_CANCEL_SIGNS_NOTHING');
  const queuedRaw=await queue();
  const option=dialog.locator('[data-programme-option="buy_18"]');await option.scrollIntoViewIfNeeded();
  const effect=await option.locator('[data-programme-effect]').textContent(),tradeoff=await option.locator('[data-programme-tradeoff]').textContent();
  assert(/18/.test(effect)&&/two.year/i.test(effect)&&/same weekly wage/i.test(effect));
  assert(/cup/i.test(tradeoff)&&/parent/i.test(tradeoff));
  await photo('conditional-loan','[data-programme-option="buy_18"]');
  await native('Close pending loan agreement',dialog.getByRole('button',{name:'Close career programme',exact:true}));
  await dialog.waitFor({state:'hidden'});assert.equal(await save(key),queuedRaw);
  await page.reload({waitUntil:'domcontentloaded'});await opener.waitFor({state:'visible'});
  assert.equal(await save(key),queuedRaw,'SC_LOAN_APP_PENDING_RELOAD_BYTES');
  await open();assert.equal(await save(key),queuedRaw);
  assert.equal(await option.getByRole('button',{name:'Current choice',exact:true}).count(),1);
  await native('Close persisted loan agreement',dialog.getByRole('button',{name:'Close career programme',exact:true}));
  await dialog.waitFor({state:'hidden'});assert.equal(await save(key),queuedRaw);

  const next=page.getByRole('button',{name:'Next Season',exact:true});assert.equal(await next.count(),1);
  await tap(next);await changed(queuedRaw);
  const finished=await read(),record=finished.seasons.at(-1),receipt=record?.programme;
  assert.equal(finished.seasons.length,initial.seasons.length+1);
  assert.deepEqual(finished.seasons.slice(0,-1),initial.seasons,'SC_LOAN_APP_HISTORY_IS_NOT_REWRITTEN');
  assert.equal(record.year,x.year);assert.equal(record.type,'playing');
  assert.equal(record.club,x.borrower.name);assert.equal(record.onLoanFrom,x.parent.name);
  assert.equal(receipt?.choices.loan,x.mode);assert.deepEqual(finished.programme.receipts.at(-1),receipt);
  const known=Number.isSafeInteger(record.apps)&&record.apps>=0&&Number.isSafeInteger(record.leagueApps)
    &&record.leagueApps>=0&&record.leagueApps<=record.apps;
  const met=record.apps>0&&!record.injurySevere&&known&&record.leagueApps>=18;
  const rehabBoundary=finished.phase==='rehab_choice',outcome=receipt.outcomes.loan??'';
  assert.equal(finished.weeklyWage,x.wage);
  if(rehabBoundary){
    assert.equal(record.injurySevere,true);assert(record.injury);
    assert.equal(finished.pendingRehab?.year,record.year);
    assert.deepEqual(finished.loan,initial.loan,'SC_LOAN_APP_REHAB_RETAINS_EXISTING_LOAN');
    assert.equal(finished.currentClub,x.borrower.name);assert.equal(finished.contractYearsLeft,x.years);
    assert.equal(receipt.status,'interrupted');assert.equal(finished.programme.loanBuy,undefined);
    assert(/interrupted/i.test(outcome));
  }else{
    assert.equal(finished.loan,null);
    assert.equal(finished.currentClub,met?x.borrower.name:x.parent.name,'SC_LOAN_APP_ACTUAL_RECORDED_CONDITION');
    assert.equal(finished.contractYearsLeft,met?2:Math.max(0,x.years-1));
    if(met){
      assert.equal(receipt.status,'completed');assert.equal(finished.programme.loanBuy,undefined);
      assert(/permanent.*two.year/i.test(outcome)&&outcome.includes(String(record.leagueApps))&&/18/.test(outcome));
    }else{
      assert(/not met|interrupted|unavailable|missing/i.test(outcome),'SC_LOAN_APP_HONEST_PARENT_RETURN');
    }
  }
  const finishedRaw=await save(key);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByText('Conditional Loan Browser',{exact:true}).first().waitFor({state:'visible'});
  await page.waitForFunction(key=>localStorage.getItem(key)!==null,key);
  assert.equal(await save(key),finishedRaw,'SC_LOAN_APP_REVIEW_RELOAD_BYTES');
  assert.deepEqual(await read(),finished);
  return {status:'pass',width,actions,queueCancelWholeFrames:true,pendingReloadBytes:true,reviewReloadBytes:true,
    actualReview:{year:record.year,club:record.club,parent:record.onLoanFrom,apps:record.apps,leagueApps:record.leagueApps,
      severe:!!record.injurySevere,countable:known,minimum:18,met,reviewReached:!rehabBoundary,boundary:rehabBoundary?'rehab-paused':met?'permanent':'parent-return',receipt:copy(receipt),currentClub:finished.currentClub,
      weeklyWage:finished.weeklyWage,contractYears:finished.contractYearsLeft},
    projection:x.projection,fixtureScope:x.scope,rngOrClockOverrides:false,
    scope:'Native condition queue/cancel/requeue/reload and one actual model season. At the actual loan review, the recorded threshold controls permanent completion versus the existing parent return. A severe injury pauses earlier at the unchanged rehab boundary with the loan and contract years retained. Availability is uncertain, and this run records its observed branch. No natural-career, provider or cross-branch full-RNG-parity claim.'};
}
