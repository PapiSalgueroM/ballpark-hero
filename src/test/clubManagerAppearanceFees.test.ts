import { describe, expect, it } from 'vitest';
import { acceptBid, appearanceFeeClubs, appearanceFeeDesk, appearanceFeeTerms, applyForJob, beginLeagueCoachSeason, canBookAppearanceFee,
  buildMarket, dealPackageValue, finishSeason, generateIncomingBids, loanOutPlayer, makeHalftimeSub, makeOffer,
  offerTerms, playNextEntry, recallLoanedPlayer, resumeMatch, setTransferStatus, startCareer, startNegotiation,
  startNextSeason, type AppearanceFee, type CareerState, type DealExtras } from '@/lib/clubManager';
import { joinClubNow } from '@/lib/clubManagerCalendar';
import { addAppearanceFee, recordFeeAppearances, settleAppearanceFees } from '@/lib/clubManagerAppearanceFees';
import { closeLedger, projectFinances } from '@/lib/clubManagerFinances';
import { startOptionsOf } from '@/lib/clubManagerStart';

function seeded<T>(seed: number, action: () => T): T {
  const original = Math.random;
  Math.random = () => {
    seed = (Math.imul(1664525,seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try { return action(); } finally { Math.random = original; }
}

function table() {
  const rules = { championshipPlayoffs:true, bundesligaPlayoff:true, frenchPlayoffs:true, inSeasonRatings:true,
    worldRatingTiming:true, opening2026Loans:true, opening2026Transfers:true } as const;
  const fresh = seeded(1974,() => beginLeagueCoachSeason(startCareer('Aston Villa','now',undefined,undefined,undefined,undefined,rules)));
  const target = buildMarket(fresh).find(p => p.name === 'Abde Ezzalzouli')!;
  return seeded(516,() => startNegotiation(fresh,target))!;
}

function sign(extras?: DealExtras) {
  const agreed = seeded(7345,() => makeOffer(table(),27.8,extras))!;
  return seeded(511,() => offerTerms(agreed,agreed.negotiation!.terms!.want))!;
}

function play(state: CareerState, include: boolean, seed: number) {
  const kickoff = seeded(532+seed,() => playNextEntry(state,{ varReviews:['goal'] }));
  if (!kickoff.state.live) return kickoff;
  let active = kickoff.state;
  const man = active.squad.find(p => p.appearanceFeeId && !p.onLoan);
  if (man && include && !active.live!.onPitch.includes(man.id)) {
    const out = active.live!.onPitch.find(id => active.squad.find(p => p.id === id)?.position !== 'GK')!;
    active = makeHalftimeSub(active,out,man.id)!;
  }
  return seeded(219+seed,() => resumeMatch(active));
}

function four() {
  let state = sign({addOn:5,appearanceTrigger:5});
  for(let n=0;n<12 && appearanceFeeDesk(state)[0].appearances<4;n++) state=play(state,true,n).state;
  expect(appearanceFeeDesk(state)[0]).toMatchObject({appearances:4,paid:0,status:'tracking'});
  return state;
}

function listedSale(state: CareerState, id: string) {
  const listed = setTransferStatus(state,id,'listed');
  for(let n=1;n<400;n++) {
    const copy = structuredClone(listed);
    seeded(Math.imul(n,2654435761),() => generateIncomingBids(copy,true));
    if (copy.incomingBids?.some(b=>b.playerId===id && !b.loan)) {
      const sale = acceptBid(copy,id);
      if (sale) return sale;
    }
  }
  throw Error('No ordinary bid accepted');
}

function endOfSeason(initial: CareerState) {
  let state = structuredClone(initial);
  for (let n=0; state.week<state.calendar.length && n<120; n++) {
    state = seeded(33652+Math.imul(n,2654435761),() => playNextEntry(state,{skipHalftime:true})).state;
  }
  expect(state.week).toBe(state.calendar.length);
  return seeded(33955,()=>finishSeason(state)).state;
}

function takeJob(career: CareerState, club: string) {
  let application: CareerState | null=null;
  for(let seed=1;seed<120 && !application;seed++){
    const sent=seeded(Math.imul(seed,2654435761),()=>applyForJob(career,club));
    if(sent?.jobHunt?.open && sent.jobHunt.open.roll<0.05) application=sent;
  }
  expect(application).not.toBeNull();
  let before=application!;
  for(let n=0;before.jobHunt?.open?.status==='pending' && n<10;n++) before=play(before,false,20+n).state;
  expect(before.jobHunt!.open!.status).toBe('accepted');
  return {before,hired:seeded(241,()=>joinClubNow(before))!};
}

describe('negotiated senior league appearance fees', () => {
  it('prices the actual selected package, commits only on signing and preserves the ordinary fee paths', () => {
    const open = table(), target = open.negotiation!.player, ask = open.negotiation!.theirAsk;
    expect(appearanceFeeTerms(5,5)).toEqual({amount:5,threshold:5,sellerValue:4});
    expect(appearanceFeeTerms(5,15)).toEqual({amount:5,threshold:15,sellerValue:2.8});
    expect(dealPackageValue(open,ask,23.8,{addOn:5,appearanceTrigger:5})).toBe(27.8);
    expect(dealPackageValue(open,ask,23.8,{addOn:5,appearanceTrigger:15})).toBe(26.6);
    expect(dealPackageValue(open,ask,23.8,{addOn:5})).toBe(26.8);
    const short = seeded(7345,() => makeOffer(open,23.8,{addOn:5,appearanceTrigger:5}))!;
    const long = seeded(7345,() => makeOffer(open,23.8,{addOn:5,appearanceTrigger:15}))!;
    expect(short.negotiation!.phase).toBe('terms');
    expect(long.negotiation!.phase).toBe('fee');
    expect(short.appearanceFees).toBeUndefined();
    expect(short.budget).toBe(open.budget);
    const euroTable = { ...short, startOptions: { ...startOptionsOf(short), currency: 'EUR' as const } };
    const euro = seeded(511, () => offerTerms(euroTable, euroTable.negotiation!.terms!.want))!;
    expect(euro.negotiation!.note).toContain('€23.8m up front, €5m after 5 senior league appearances');
    for(const bad of [{addOn:0,appearanceTrigger:5},{addOn:5,appearanceTrigger:9},{addOn:4.55,appearanceTrigger:15}]) {
      expect(makeOffer(open,27.8,bad as DealExtras)).toBeNull();
    }
    const signed = sign({addOn:5,appearanceTrigger:5});
    expect(signed.budget).toBe(36.9);
    expect(signed.seasonSignings.at(-1)).toMatchObject({name:target.name,fee:27.8,bonus:8.3});
    expect(appearanceFeeDesk(signed)[0]).toMatchObject({player:target.name,buyer:'Aston Villa',seller:'Real Betis',amount:5,threshold:5,appearances:0,paid:0,payments:[]});
    expect(signed.pendingAddOns ?? []).toEqual([]);
    const generic = sign({addOn:5});
    expect(generic.appearanceFees).toBeUndefined();
    expect(generic.pendingAddOns).toEqual([{name:target.name,to:'Real Betis',amount:5}]);
    expect(sign().appearanceFees).toBeUndefined();
    const broken = structuredClone(short);
    broken.negotiation!.agreedExtras = {addOn:5,appearanceTrigger:12} as unknown as DealExtras;
    const refused = offerTerms(broken,broken.negotiation!.terms!.want)!;
    expect(refused.budget).toBe(open.budget);
    expect(refused.squad).toEqual(open.squad);
    expect(refused.appearanceFees).toBeUndefined();
  });

  it('counts a used sub, omits the unused bench and European fixtures, charges once at 5 and at 15', () => {
    for(const threshold of [5,15] as const) {
      let state = sign({addOn:5,appearanceTrigger:threshold});
      const untouched = play(state,false,0);
      expect(appearanceFeeDesk(untouched.state)[0].appearances).toBe(0);
      let reached=0, excluded=0;
      for (let n=0;n<35 && reached<threshold;n++) {
        const before = state.budget, prior = appearanceFeeDesk(state)[0], match = play(state,true,n);
        const noDebt = structuredClone(state);
        delete noDebt.appearanceFees;
        const matched = play(noDebt,true,n);
        state = match.state;
        const row=appearanceFeeDesk(state)[0];
        const player=state.squad.find(p=>p.id===row.playerId)!;
        if (match.report?.competition==='league' && player.comp?.league?.apps === reached+1) reached++;
        if (match.report && match.report.competition!=='league') {
          excluded++;
          expect(row.appearances).toBe(prior.appearances);
        }
        expect(row.appearances).toBe(reached);
        if (reached<threshold) {
          expect(row.paid).toBe(0);
          expect(state.budget).toBe(matched.state.budget);
        } else {
          expect(row).toMatchObject({status:'paid',paid:5,payments:[{season:1,week:match.state.week-1,amount:5}]});
          expect(matched.state.budget-state.budget).toBeCloseTo(5,2);
          expect(before).toBeGreaterThan(10);
        }
        state = JSON.parse(JSON.stringify(state));
      }
      expect(excluded).toBeGreaterThan(0);
      expect(reached).toBe(threshold);
      const paid=appearanceFeeDesk(state)[0];
      expect(appearanceFeeDesk(play(state,true,88).state)[0]).toEqual(paid);
    }
  },30000);

  it('holds the reserve, reconciles actual dated payment amounts and preserves debt after a permanent exit', () => {
    const state = four();
    state.budget=6.5;
    const match=play(state,true,5), charged=match.state, row=appearanceFeeDesk(charged)[0];
    expect(row.appearances).toBe(5);
    expect(row.status).toBe('due');
    expect(row.paid).toBeGreaterThan(0);
    expect(row.paid).toBeLessThan(5);
    expect(charged.budget).toBe(5);
    expect(row.payments).toEqual([{season:1,week:5,amount:row.paid}]);
    const beforePayments = structuredClone(charged);
    delete beforePayments.appearanceFees;
    expect(closeLedger(charged).transferOut-closeLedger(beforePayments).transferOut).toBeCloseTo(row.paid,2);
    expect(projectFinances(charged).spendActual-projectFinances(beforePayments).spendActual).toBeCloseTo(row.paid,2);
    const noMoney = JSON.parse(JSON.stringify(charged)) as CareerState;
    settleAppearanceFees(noMoney,{season:1,week:5});
    expect(appearanceFeeDesk(noMoney)[0]).toEqual(row);
    // A reopened transfer window permits an ordinary bid before the following match.
    const sold = listedSale({...noMoney,transferWindow:'january'},row.playerId);
    expect(appearanceFeeDesk(sold)[0]).toEqual(row);
    const settled=play(sold,false,6).state, final=appearanceFeeDesk(settled)[0];
    expect(final.status).toBe('paid');
    expect(final.payments).toHaveLength(2);
    expect(final.payments.reduce((s,p) => s+Math.round(p.amount*100),0)).toBe(500);
    expect(final.paid).toBe(5);
    expect(appearanceFeeDesk(play(settled,false,7).state)[0]).toEqual(final);
  });

  it('follows the loaned registration even when a lookalike takes its former squad ID, and voids a sale before threshold', () => {
    const signed=sign({addOn:5,appearanceTrigger:5});
    const first=play(signed,true,0).state, row=appearanceFeeDesk(first)[0];
    const away=seeded(522,() => loanOutPlayer(structuredClone(first),row.playerId,undefined,undefined,'straight'))!;
    expect(away.loanedOut!.find(l=>l.player.id===row.playerId)!.player.appearanceFeeId).toBe(row.id);
    const reserve=away.squad.find(p=>!away.xiIds.includes(p.id))!;
    reserve.name=row.player; reserve.id=row.playerId;
    const notHis=play(away,false,1).state;
    expect(appearanceFeeDesk(notHis)[0]).toEqual(row);
    const recalled=recallLoanedPlayer(notHis,row.playerId)!;
    const truePlayer=recalled.squad.find(p=>p.appearanceFeeId===row.id)!;
    expect(truePlayer.id).not.toBe(row.playerId);
    const next=play(recalled,true,2).state;
    expect(appearanceFeeDesk(next)[0]).toMatchObject({playerId:truePlayer.id,appearances:2,paid:0});
    const sale=listedSale(first,row.playerId);
    expect(appearanceFeeDesk(sale)[0]).toMatchObject({status:'void',appearances:1,paid:0,closed:{season:1,week:first.week}});
    expect(appearanceFeeDesk(play(sale,false,1).state)[0].status).toBe('void');
  });

  it('carries actual league progress across summer and jobs without crediting inherited fixtures', () => {
    const first=play(sign({addOn:5,appearanceTrigger:15}),true,0).state;
    const row=appearanceFeeDesk(first)[0];
    const away=seeded(522,()=>loanOutPlayer(first,row.playerId,undefined,undefined,'straight'))!;
    const finished=endOfSeason(away);
    expect(appearanceFeeDesk(finished)[0]).toEqual(row);
    const home=seeded(1013904226,()=>startNextSeason(finished));
    expect(home.season).toBe(2);
    expect(appearanceFeeDesk(home)[0]).toEqual(row);
    const resumed=play(JSON.parse(JSON.stringify(home)),true,0).state;
    expect(appearanceFeeDesk(resumed)[0]).toMatchObject({appearances:2,lastAppearance:{season:2}});
    const destination='Everton';
    const newClub=seeded(1013904226,()=>startNextSeason(finished,destination));
    expect(newClub.clubName).toBe(destination);
    expect(appearanceFeeClubs(newClub)).toEqual(['Aston Villa']);
    expect(appearanceFeeDesk(newClub)).toEqual([]);
    expect(appearanceFeeDesk(newClub,'Aston Villa')[0]).toEqual(row);
    expect(appearanceFeeDesk(play(newClub,true,4).state,'Aston Villa')[0]).toEqual(row);
    // Send a real application and wait for the other board to decide.
    const move=takeJob(first,'Everton'), hired=move.hired;
    const previous=appearanceFeeDesk(move.before)[0];
    expect(hired.clubName).toBe('Everton');
    expect(appearanceFeeDesk(hired)).toEqual([]);
    expect(appearanceFeeDesk(hired,'Aston Villa')[0]).toEqual(previous);
    const returning=takeJob(hired,'Aston Villa').hired;
    expect(returning.clubName).toBe('Aston Villa');
    expect(appearanceFeeDesk(returning)[0]).toEqual(previous);
    const man=returning.squad.find(p=>p.worldRosterKey===previous.worldKey)!;
    expect(man).toBeDefined();
    // The return rebuilt a different XI. Put that exact registration on the team sheet.
    const slot=returning.xiIds.indexOf(man.id);
    if (slot<0) returning.xiIds[1]=man.id;
    let managed=returning;
    for(let n=0;n<10 && appearanceFeeDesk(managed)[0].appearances===previous.appearances;n++) managed=play(managed,true,n).state;
    expect(appearanceFeeDesk(managed)[0].appearances).toBe(previous.appearances+1);
  },30000);

  it('preserves unsupported ledgers, charges the correct club on summer cash and itemizes only this season', () => {
    const state=four();
    state.budget=6.5;
    const partial=play(state,true,5).state;
    const debt=appearanceFeeDesk(partial)[0];
    expect(debt.status).toBe('due');
    const finished=endOfSeason(sign());
    finished.appearanceFees=[debt];
    const control=structuredClone(finished);
    delete control.appearanceFees;
    const stay=seeded(1013904226,()=>startNextSeason(finished));
    const plain=seeded(1013904226,()=>startNextSeason(control));
    const paid=appearanceFeeDesk(stay)[0];
    expect(paid).toMatchObject({status:'paid',paid:5,lastPaid:{season:2,week:0}});
    const remaining=Math.round((debt.amount-debt.paid)*100)/100;
    expect(paid.payments).toEqual([...debt.payments,{season:2,week:0,amount:remaining}]);
    expect(plain.budget-stay.budget).toBeCloseTo(remaining,2);
    expect(closeLedger(stay).transferOut).toBe(remaining);
    const other='Everton';
    const moved=seeded(1013904226,()=>startNextSeason(finished,other));
    const without=seeded(1013904226,()=>startNextSeason(control,other));
    expect(moved.budget).toBe(without.budget);
    expect(closeLedger(moved).transferOut).toBe(closeLedger(without).transferOut);
    expect(appearanceFeeDesk(moved,'Aston Villa')[0]).toEqual(debt);
    const bad=table();
    for(const saved of [{version:2,ledger:[debt]},[debt,{...debt,version:2}],[debt,debt],[{...debt,newTerms:'future'}]]) {
      bad.appearanceFees=saved as unknown as AppearanceFee[];
      expect(canBookAppearanceFee(bad)).toBe(false);
      expect(makeOffer(bad,27.8,{addOn:5,appearanceTrigger:5})).toBeNull();
      const ordinary=seeded(7345,()=>makeOffer(bad,27.8,{addOn:5}))!;
      const signed=seeded(511,()=>offerTerms(ordinary,ordinary.negotiation!.terms!.want))!;
      expect(signed.negotiation!.status).toBe('agreed');
      expect(signed.appearanceFees).toEqual(saved);
    }
  },30000);

  it('keeps an old unseeded purchase tied to its exact player and ignores a repeated or backdated match', () => {
    const open=table();
    delete open.worldSeed;
    delete open.worldRoster;
    delete open.negotiation!.player.worldRosterKey;
    delete open.negotiation!.player.worldRosterSince;
    const accepted=seeded(7345,()=>makeOffer(open,27.8,{addOn:5,appearanceTrigger:5}))!;
    const signed=seeded(511,()=>offerTerms(accepted,accepted.negotiation!.terms!.want))!;
    const row=appearanceFeeDesk(signed)[0], man=signed.squad.find(p=>p.id===row.playerId)!;
    expect(row.worldKey).toBeUndefined();
    expect(man.appearanceFeeId).toBe(row.id);
    recordFeeAppearances(signed,{season:1,week:1},[{...man,appearanceFeeId:undefined}]);
    recordFeeAppearances(signed,{season:1,week:1},[{...man,onLoan:true}]);
    expect(appearanceFeeDesk(signed)[0].appearances).toBe(0);
    for(const week of [2,2,1]) recordFeeAppearances(signed,{season:1,week},[man]);
    expect(appearanceFeeDesk(signed)[0].appearances).toBe(1);
    // A game-generated registration keeps its existing provenance when the desk records the terms.
    const generated = {...man, id:'simulated-registration', generated:true};
    signed.squad = [...signed.squad,generated];
    addAppearanceFee(signed,generated,'Real Betis',5,15);
    expect(appearanceFeeDesk(signed)[0]).toMatchObject({playerId:generated.id,generated:true});
  });
});
