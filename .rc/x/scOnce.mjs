/* Reviewer sc-engine, Release AW: every new decision settles once, with a reload in the middle of each. */
import { seeded, withRng, leafDiff, shape } from './scLib.mjs';
import { lockstep, snapshots, tally, top } from './scLock.mjs';

export function runOnce({ N, headB, invOffersB, HEAD, hold }) {
  const L = headB, E = L.soccer, clubs = E.FALLBACK_CLUBS, P = E.projectLeagueApps;
  const load = (lib, serial) => lib.soccer.repairCareer(JSON.parse(serial));
  const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
  const c = { tw: 0, filed: 0, result: 0, offered: 0, noInterest: 0, noMatch: 0, rerolled: 0, reloadLost: 0, reloadReroll: 0, changed: 0,
    midReload: 0, resolveBad: 0, vetOffers: 0, vetWrong: 0, youngOffers: 0, youngWrong: 0, vetMoved: 0, playOnErr: 0 };
  const ratios = new Map(), samples = [];
  const note = line => { if (samples.length < 14) samples.push(line); };
  const f = { n: 0, eligible: 0, twice: 0, retired: 0, notRetired: 0, lostPlan: 0, guardLeaks: 0, reloadDiff: 0, err: 0, sugg: 0, suggRetired: 0, bannerStuck: 0 };
  const fRows = new Map(), fAfter = new Map();
  const a = { n: 0, changed: 0, twice: 0, lost: 0, openNext: 0, err: 0 }, aBlocked = new Map();
  const it = { n: 0, back: 0, twice: 0, lost: 0, err: 0 }, itCost = new Map();
  for (let seed = 1; seed <= N; seed++) {
    const list = snapshots(seed, HEAD).list;
    for (const sn of list.filter(x => ['tw', 'tw30', 'tw34'].includes(x.cat))) for (const p of ['minutes', 'level', 'home']) {
      c.tw++;
      const s = load(L, sn.serial), s1 = L.brief.setTransferBrief(s, p);
      if (s1 === s) continue;
      c.filed++;
      const draw = seed * 1000 + sn.k * 7 + p.length;
      const s2 = withRng(seeded(draw), () => E.requestTransferDecision(s1, clubs));
      const res = L.brief.transferBriefResult(s2, P);
      if (!res) { note(`no stored result: seed ${seed} ${sn.cat} ${p}`); continue; }
      c.result++;
      if (res.status === 'offered') c.offered++; else if (res.status === 'no_interest') c.noInterest++; else c.noMatch++;
      if (withRng(seeded(draw + 1), () => E.requestTransferDecision(s2, clubs)) !== s2) c.rerolled++;
      const s2r = load(L, JSON.stringify(s2));
      if (!L.brief.transferBriefResult(s2r, P)) { c.reloadLost++; note(`result lost on reload: seed ${seed} ${sn.cat} ${p} ${res.status}`); }
      if (!same(withRng(seeded(draw + 2), () => E.requestTransferDecision(s2r, clubs)), s2r)) c.reloadReroll++;
      if (!same(L.brief.setTransferBrief(s2r, p === 'home' ? 'level' : 'home'), s2r) || !same(L.brief.setTransferBrief(s2r, null), s2r)) c.changed++;
      const mid = withRng(seeded(draw), () => E.requestTransferDecision(load(L, JSON.stringify(s1)), clubs));
      if (JSON.stringify(mid) !== JSON.stringify(s2)) c.midReload++;
      const stay = E.stayAtClub(s2);
      if (stay.transferBrief !== undefined || stay.phase !== 'playing') c.resolveBad++;
      if (!res.offer) continue;
      const took = E.acceptOffer(s2, res.offer);
      if (took.transferBrief !== undefined || took.currentClub !== res.offer.club.name) c.resolveBad++;
      const t1 = invOffersB.brief.setTransferBrief(load(invOffersB, sn.serial), p);
      const old = withRng(seeded(draw), () => invOffersB.soccer.requestTransferDecision(t1, clubs)).transferSituation?.offer;
      if (old && old.club.name === res.offer.club.name) {
        const want = L.contracts.soccerTransferTerms({ age: s.age, overall: s.overall, weeklyWage: old.wage, seasons: s.seasons }, old.wage, old.contractYears);
        const right = want.wage === res.offer.wage && want.contractYears === res.offer.contractYears;
        if (s.age >= 30) {
          c.vetOffers++;
          if (!right) { c.vetWrong++; note(`veteran brief offer wrong: seed ${seed} age ${s.age} got ${res.offer.wage} want ${want.wage} old ${old.wage}`); }
          if (res.offer.wage !== old.wage) c.vetMoved++;
          tally(ratios, (res.offer.wage / old.wage).toFixed(2));
        } else { c.youngOffers++; if (res.offer.wage !== old.wage || !right) c.youngWrong++; }
      }
      const [on] = lockstep(seed, [HEAD], { from: JSON.stringify(took), k0: sn.k + 1, skip: 0, steps: 40 });
      if (on.error) { c.playOnErr++; note(`play on after a brief offer threw: ${on.error}`); }
    }
    for (const sn of list.filter(x => x.cat === 'play30' || x.cat === 'mid:retirement_suggestion')) {
      const s = load(L, sn.serial), sugg = s.phase === 'retirement_suggestion';
      f.n++; if (sugg) f.sugg++;
      if (!L.farewell.farewellEligibility(s).eligible) continue;
      f.eligible++;
      const s1 = withRng(seeded(seed + 5), () => E.announceFarewellSeason(s, clubs));
      const plan = L.farewell.readSoccerFarewell(s1);
      if (!plan) { f.err++; note(`announce left no plan: seed ${seed} ${sn.cat}`); continue; }
      if (withRng(seeded(seed + 6), () => E.announceFarewellSeason(s1, clubs)) !== s1) f.twice++;
      let done = false, hadFinal = s1.seasons.length > plan.sourceCount; const seen = [];
      const [plain, re] = lockstep(seed, [HEAD, { ...HEAD, name: 'reload', reload: true }], { from: JSON.stringify(s1), k0: sn.k + 1, skip: sn.draws + 50, steps: 90, onFrame: (st, k, d, phase) => {
        if (st.farewellSeason !== undefined && !st.retired && !L.farewell.readSoccerFarewell(st)) f.lostPlan++;
        /* `phase` is the phase the press LEFT: it counts only when the final row was already written before the press. */
        if (hadFinal) seen.push(phase);
        hadFinal = st.seasons.length > plan.sourceCount;
        if (!done && L.farewell.farewellSeasonComplete(st) && !st.retired) {
          done = true;
          if (E.advanceProSeason(st, clubs) !== st || E.acceptRetirementSuggestion(st) !== st || E.declineRetirementSuggestion(st, clubs) !== st) f.guardLeaks++;
        }
      } });
      if (plain.error) { f.err++; note(`farewell career threw: seed ${seed}: ${plain.error}`); }
      if (re.diverged || re.error) { f.reloadDiff++; note(`farewell with a reload every press differs: seed ${seed}: ${re.error ?? JSON.stringify(re.diverged)}`); }
      const end = plain.state;
      if (end?.retired) {
        f.retired++; if (sugg) f.suggRetired++;
        tally(fRows, `${end.seasons.length - plan.sourceCount} rows after the announcement, last type ${end.seasons[end.seasons.length - 1].type}, last club ${end.seasons[end.seasons.length - 1].clubTier === 99 ? 'YEAR OUT' : 'a club'}, phase ${end.phase}`);
        if (E.manualRetire(end) !== end || E.dismissSummary(end, clubs) !== end || E.dismissNewspaper(end) !== end) f.guardLeaks++;
      } else {
        f.notRetired++; if (end?.isFinalSeason) f.bannerStuck++;
        note(`farewell never retired: seed ${seed} ${sn.cat} age ${s.age} phase ${end?.phase} rows +${(end?.seasons.length ?? 0) - plan.sourceCount} plan now ${JSON.stringify(L.farewell.readSoccerFarewell(end))}`);
      }
      for (const ph of new Set(seen)) tally(fAfter, ph);
    }
    for (const sn of list.filter(x => x.cat === 'between')) {
      a.n++;
      const s = { ...load(L, sn.serial), agentId: 'cousin' }, s1 = L.agent.changeCareerAgent(s, 'shark');
      if (s1 === s || s1.agentId !== 'shark' || !L.agent.readAgentReview(s1)) { tally(aBlocked, `first: ${L.agent.agentReviewEligibility(s).reason}`); continue; }
      a.changed++;
      const s1r = load(L, JSON.stringify(s1));
      if (L.agent.changeCareerAgent(s1, 'super') !== s1 || !same(L.agent.changeCareerAgent(s1r, 'super'), s1r)) a.twice++;
      let nextSeen = false;
      const [on] = lockstep(seed, [HEAD], { from: JSON.stringify(s1), k0: sn.k, skip: sn.draws, steps: 400, onFrame: st => {
        if (st.agentReview !== undefined && !L.agent.readAgentReview(st)) a.lost++;
        if (!nextSeen && st.phase === 'playing' && st.seasons.length > s1.seasons.length) {
          nextSeen = true;
          const e = L.agent.agentReviewEligibility(st);
          if (e.available) a.openNext++; else tally(aBlocked, `next season: ${e.reason}`);
        }
      } });
      if (on.error) a.err++;
    }
    for (const sn of list.filter(x => x.cat === 'intl')) {
      it.n++;
      const s = load(L, sn.serial), s0 = E.retireFromInternational(s), s1 = L.intl.makeInternationallyAvailable(s0);
      if (s1 === s0 || !s1.internationalCareer || s1.intStats.isRetired) { tally(itCost, `blocked: ${L.intl.internationalReturnEligibility(s0).reason}`); continue; }
      it.back++;
      const again = E.retireFromInternational(s1);
      if (L.intl.makeInternationallyAvailable(again) !== again) it.twice++;
      tally(itCost, `retire then return changes: ${shape(leafDiff(JSON.parse(JSON.stringify(s)), JSON.parse(JSON.stringify(s1))))}`);
      const [on] = lockstep(seed, [HEAD], { from: JSON.stringify(s1), k0: sn.k, skip: sn.draws, steps: 400, onFrame: st => { if (st.internationalReturn !== undefined && !L.intl.readInternationalReturn(st)) it.lost++; } });
      if (on.error) it.err++;
    }
  }
  for (const line of samples) console.log(`  ${line}`);
  console.log(`brief: ${JSON.stringify(c)}`);
  console.log(`brief offers from 30, head wage over the wage with the offers condition out (ratio, count):\n${top(ratios, 12)}`);
  hold(c.result > 100 && c.result === c.filed, `every filed brief stores one result (${c.result} of ${c.filed}; offered ${c.offered}, no interest ${c.noInterest}, no match ${c.noMatch})`);
  hold(c.rerolled + c.reloadLost + c.reloadReroll + c.changed + c.midReload === 0, 'a stored brief answer cannot be asked again, changed, cleared or lost by a reload, and a reload between filing and asking changes nothing');
  hold(c.resolveBad === 0, 'accepting the offer or staying clears the brief and ends the window');
  hold(c.vetOffers >= 20 && c.vetWrong === 0, `a brief offer from 30 carries exactly the veteran terms (${c.vetOffers} offers, ${c.vetWrong} wrong, ${c.vetMoved} with a changed wage)`);
  hold(c.youngOffers >= 20 && c.youngWrong === 0, `a brief offer under 30 keeps the drawn terms (${c.youngOffers} offers, ${c.youngWrong} wrong)`);
  hold(c.playOnErr === 0, 'a career plays on after signing a brief offer');
  console.log(`farewell: ${JSON.stringify(f)}\n  rows after the announcement:\n${top(fRows)}\n  presses after the final row was written (phase left, careers):\n${top(fAfter, 20)}`);
  hold(f.eligible >= 50, `enough farewell seasons were announced (${f.eligible} of ${f.n} saves, ${f.sugg} at a retirement suggestion)`);
  hold(f.notRetired === 0 && f.err === 0, `every announced farewell ends in retirement (${f.retired} retired, ${f.notRetired} did not, ${f.err} errors)`);
  hold(f.twice === 0 && f.guardLeaks === 0 && f.lostPlan === 0, `one announcement, one final season: second press ${f.twice}, guard leaks ${f.guardLeaks}, plan lost mid way ${f.lostPlan}`);
  hold(f.reloadDiff === 0, `a reload after every press of a farewell season changes nothing (${f.reloadDiff})`);
  hold(![...fAfter.keys()].some(ph => ['transfer_window', 'playing', 'random_events', 'retirement_suggestion'].includes(ph)), 'no transfer window, second season, random event or retirement suggestion is pressed after the final row');
  console.log(`agent review: ${JSON.stringify(a)}\n${top(aBlocked)}`);
  hold(a.changed >= 50 && a.twice === 0 && a.lost === 0 && a.err === 0, `the agent review changes once a season and its receipt stays readable to retirement (changed ${a.changed}, twice ${a.twice}, unreadable frames ${a.lost})`);
  hold(a.openNext >= a.changed * 0.9, `the review opens again the next season (${a.openNext} of ${a.changed})`);
  console.log(`national team: ${JSON.stringify(it)}\n${top(itCost)}`);
  hold(it.back >= 30 && it.twice === 0 && it.lost === 0 && it.err === 0, `the comeback works once a season and its receipt stays readable (back ${it.back}, twice ${it.twice}, unreadable frames ${it.lost})`);
}
