import { describe, expect, it } from 'vitest';
import {
  finishSeason, isPartialClub, loanOutRefusal, playNextEntry, startCareer, startNextSeason,
} from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import {
  agreeLoanPlan, loanPlanHistoryOf, loanPlanHosts, loanPlanLoans, loanPlanPreview, recallPlannedLoanee, reviewLoanPlan,
} from '@/lib/clubManagerLoanPlan';

/* Skeptic probe for BS-cm416-1 (independent of the reviewer's probe). For each club: plan the youngest eligible
   outfield man out on loan at week 0, tap Review loan plan before every calendar step of the season, and record
   every saved ratingChange, every rating the loaned man carries while away, and every history row. Then settle
   the summer and read his rating at home. A control proves the probe can see a non zero change at all. */
const CLUBS = ['Everton', 'Fulham', 'Newcastle United', 'Chelsea', 'Brentford'];
const planned = (s: CareerState) => loanPlanLoans(s).find(l => l.development !== undefined);

describe('BS-cm416-1 skeptic probe', () => {
  for (const club of CLUBS) {
    it(club, () => {
      let c: CareerState;
      try { c = startCareer(club); } catch (e) { console.log(`VFBS ${club} startCareer threw ${String(e)}`); return; }
      const candidates = c.squad.filter(p => p.position !== 'GK' && loanOutRefusal(c, p.id) === null)
        .sort((a, b) => a.age - b.age);
      let chosen: { id: string; name: string; age: number; rating: number } | null = null; let host = '';
      for (const p of candidates) {
        const h = loanPlanHosts(c).find(n => !isPartialClub(n, c.eraId) && loanPlanPreview(c, p.id, n, 'standard') !== null);
        if (h) { chosen = p; host = h; break; }
      }
      if (!chosen) { console.log(`VFBS ${club} no plannable player`); return; }
      let s = agreeLoanPlan(c, loanPlanPreview(c, chosen.id, host, 'standard')!)!;
      expect(s).toBeTruthy();
      const start = planned(s)!.development!;
      /* Control: the same review against a loan whose rating was moved by 3 must save ratingChange 3. */
      const moved: CareerState = JSON.parse(JSON.stringify(s));
      planned(moved)!.player.rating += 3;
      const ctl = reviewLoanPlan(moved, planned(moved)!.player.id);
      const ctlChange = ctl ? planned(ctl)!.development!.review!.ratingChange : null;
      expect(ctlChange).toBe(3);
      const squadStart = new Map(s.squad.map(p => [p.name, p.rating]));
      const changes = new Set<number>(), away = new Set<number>(); let reviews = 0, refused = 0, steps = 0;
      let recallChange: number | null | 'none' = 'none';
      for (let guard = 0; guard < 220; guard++) {
        const loan = planned(s);
        if (loan) {
          away.add(loan.player.rating);
          const r = reviewLoanPlan(s, loan.player.id);
          if (r) { s = r; reviews++; const v = planned(s)?.development?.review?.ratingChange; if (v !== undefined) changes.add(v); }
          else refused++;
          if (recallChange === 'none' && s.transferWindow !== null && s.week > start.startedWeek) {
            const rc = recallPlannedLoanee(s, loan.player.id, start.id);
            const rows = rc ? loanPlanHistoryOf(rc) ?? [] : [];
            recallChange = rc ? rows[rows.length - 1]?.ratingChange ?? null : null;
          }
        }
        const res = playNextEntry(s, { skipHalftime: true }); s = res.state; steps++;
        if (res.kind === 'seasonOver') break;
      }
      const endLoan = planned(s);
      const atEndReview = endLoan ? reviewLoanPlan(s, endLoan.player.id) : null;
      const history = loanPlanHistoryOf(s) ?? [];
      const histChanges = [...new Set(history.map(r => r.rating - r.ratingAtStart))];
      const squadMoved = s.squad.filter(p => squadStart.has(p.name) && squadStart.get(p.name) !== p.rating).length;
      const awayEnd = endLoan ? endLoan.player.rating : null;
      const next = startNextSeason(finishSeason(s).state);
      const home = next.squad.find(p => p.name === chosen!.name);
      const histAfter = loanPlanHistoryOf(next) ?? [];
      console.log(`VFBS ${club} player=${chosen.name} age=${chosen.age} start=${start.ratingAtStart} host=${host} steps=${steps}`
        + ` reviews=${reviews} refused=${refused} savedChanges=[${[...changes].join(',')}] awayRatings=[${[...away].join(',')}]`
        + ` historyRows=${history.length} historyChanges=[${histChanges.join(',')}] reviewAtSeasonOver=${atEndReview ? 'saved' : 'null'}`
        + ` recallLoggedChange=${String(recallChange)} squadMenWhoseRatingMovedInSeason=${squadMoved}/${squadStart.size}`
        + ` awayAtSeasonEnd=${awayEnd} homeAfterSummer=${home ? home.rating : 'not home'}`
        + ` historyAfterSummer=${histAfter.length} anyRowRecordsReturn=${histAfter.some(r => r.rating !== r.ratingAtStart)}`
        + ` control=${ctlChange}`);
    }, 900000);
  }
});
