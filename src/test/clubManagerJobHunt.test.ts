/**
 * Round 783: the job hunt's state machine, src/lib/clubManagerJobHunt.ts.
 *
 * The pure half only: the limits (one open application, three a season, a
 * decline's cooldown, nothing while a move is already booked), the countdown
 * to the answer, the decision model's direction (standing up, tier gap down,
 * trouble up) and its clamp, the words, and the two exits (join now, join in
 * the summer) including the rollover consuming a booked move exactly once.
 * Since the Round 783 review also: no application beside a live approach or
 * in the last league games, the busy state that keeps approaches away, the
 * rollover keeping the cooldowns, a waiting yes, and the sack ending the hunt.
 * The engine side is measured by scripts/simCmApplications.mjs.
 */
import { describe, it, expect } from 'vitest';
import {
  ANSWER_MAX_MATCHES, ANSWER_MIN_MATCHES, APPLICATIONS_PER_SEASON, COOLDOWN_SEASONS, ODDS_CEILING, ODDS_FLOOR,
  acceptanceOdds, applicationsLeft, applyRefusal, bookSummerMove, closeOnJoiningNow, consumeSummerMove, cooldownUntil,
  countDown, decideApplication, declineLine, acceptLine, leavingLine, employedProfile, jobHuntOf, oddsWord,
  openApplication, recordDecision, huntBusy, rollOverHunt, waitingYes, dropOnSack,
} from '@/lib/clubManagerJobHunt';
import type { ApplicationInput, JobHunt } from '@/lib/clubManagerJobHunt';
import type { Approach } from '@/lib/clubManager';
import type { ManagerProfile } from '@/lib/managerOffers';

type Stub = {
  season: number; week: number; clubName: string;
  pendingMove?: { club: string; blurb: string } | null;
  sacked: boolean; wilderness?: null | { weeksOut: number; formerClub: string; offers: never[]; seen: never[] };
  approach?: Approach | null;
  jobHunt?: JobHunt;
};

const career = (over: Partial<Stub> = {}): Stub => ({
  season: 2, week: 10, clubName: 'My Club', pendingMove: null, sacked: false, wilderness: null, ...over,
});
const target = { club: 'Other Club', league: 'A League', tier: 3 };
const fixedRng = (...vals: number[]) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };

const input = (over: Partial<ApplicationInput> = {}): ApplicationInput => ({
  standing: 50, myTier: 3, targetTier: 3, overshoot: 0, formWins: 2, targetTrouble: 0, targetPos: 8, targetClubs: 20, ...over,
});

describe('an old save', () => {
  it('reads as nothing in flight and can apply', () => {
    const c = career();
    expect(c.jobHunt).toBeUndefined();
    const hunt = jobHuntOf(c);
    expect(hunt.open).toBeNull();
    expect(hunt.summerMove).toBeNull();
    expect(hunt.cooldowns).toEqual([]);
    expect(applicationsLeft(c)).toBe(APPLICATIONS_PER_SEASON);
    expect(applyRefusal(c, target.club)).toBeNull();
  });

  it('drops a mangled block rather than trusting it', () => {
    const c = career({ jobHunt: { open: { club: 7 } } as unknown as JobHunt });
    expect(jobHuntOf(c).open).toBeNull();
  });
});

describe('sending one', () => {
  it('refuses your own club, and a manager out of work', () => {
    expect(applyRefusal(career(), 'My Club')).toBe('own');
    expect(applyRefusal(career({ sacked: true }), target.club)).toBe('sacked');
    expect(applyRefusal(career({ wilderness: { weeksOut: 1, formerClub: 'My Club', offers: [], seen: [] } }), target.club)).toBe('sacked');
  });

  it('fixes the delay inside two to five match days and the roll at the moment of applying', () => {
    for (const r of [0, 0.249, 0.25, 0.5, 0.75, 0.999]) {
      const hunt = openApplication(career(), target, fixedRng(r, 0.42));
      expect(hunt).not.toBeNull();
      const open = hunt!.open!;
      expect(open.matchesLeft).toBeGreaterThanOrEqual(ANSWER_MIN_MATCHES);
      expect(open.matchesLeft).toBeLessThanOrEqual(ANSWER_MAX_MATCHES);
      expect(open.roll).toBe(0.42);
      expect(open.status).toBe('pending');
      expect(open.season).toBe(2);
      expect(open.week).toBe(10);
      expect(hunt!.sent).toBe(1);
    }
    expect(openApplication(career(), target, fixedRng(0)).open!.matchesLeft).toBe(ANSWER_MIN_MATCHES);
    expect(openApplication(career(), target, fixedRng(0.999)).open!.matchesLeft).toBe(ANSWER_MAX_MATCHES);
  });

  it('allows one at a time', () => {
    const c = career({ jobHunt: openApplication(career(), target)! });
    expect(applyRefusal(c, 'Third Club')).toBe('open');
    expect(openApplication(c, { ...target, club: 'Third Club' })).toBeNull();
  });

  it('refuses while a move is already booked, either way it was booked', () => {
    expect(applyRefusal(career({ pendingMove: { club: 'X', blurb: '' } }), target.club)).toBe('committed');
    const booked: JobHunt = { ...jobHuntOf(career()), summerMove: { club: 'X', blurb: '' } };
    expect(applyRefusal(career({ jobHunt: booked }), target.club)).toBe('committed');
  });

  it('allows three a season and resets the count when the season moves on', () => {
    let c = career();
    for (let i = 0; i < APPLICATIONS_PER_SEASON; i++) {
      const hunt = openApplication(c, { ...target, club: `Club ${i}` });
      expect(hunt).not.toBeNull();
      c = { ...c, jobHunt: recordDecision(hunt!, false, c.week, 0.2) };
    }
    expect(applicationsLeft(c)).toBe(0);
    expect(applyRefusal(c, 'Club 9')).toBe('limit');
    const next = { ...c, season: c.season + 1 };
    expect(applicationsLeft(next)).toBe(APPLICATIONS_PER_SEASON);
    expect(applyRefusal(next, 'Club 9')).toBeNull();
  });

  /* Round 783 review: the rules the review added to the state machine. */
  const approach: Approach = { club: 'Suitor', leagueName: 'A League', tierLabel: 'Giant', blurb: '', week: 9, expiresWeek: 14 };

  it('refuses while another club is waiting on your answer to its approach', () => {
    expect(applyRefusal(career({ approach }), target.club)).toBe('approach');
    expect(openApplication(career({ approach }), target)).toBeNull();
    expect(applyRefusal(career({ approach: null }), target.club)).toBeNull();
  });

  it('refuses in the last league games, so every answer lands while the season is still on', () => {
    expect(applyRefusal(career(), target.club, ANSWER_MAX_MATCHES)).toBeNull();
    expect(applyRefusal(career(), target.club, ANSWER_MAX_MATCHES - 1)).toBe('late');
    expect(applyRefusal(career(), target.club, 0)).toBe('late');
    expect(openApplication(career(), target, Math.random, ANSWER_MAX_MATCHES - 1)).toBeNull();
    /* Even the longest wait fits in what is left when it is allowed to go. */
    expect(openApplication(career(), target, fixedRng(0.999), ANSWER_MAX_MATCHES)!.open!.matchesLeft).toBeLessThanOrEqual(ANSWER_MAX_MATCHES);
  });

  it('reads busy, the state in which no approach is made or committed to, only with one out or one booked', () => {
    expect(huntBusy(career())).toBe(false);
    const out = openApplication(career(), target)!;
    expect(huntBusy(career({ jobHunt: out }))).toBe(true);
    expect(huntBusy(career({ jobHunt: recordDecision(out, true, 12, 0.5) }))).toBe(true);
    expect(huntBusy(career({ jobHunt: bookSummerMove(recordDecision(out, true, 12, 0.5), 'blurb')! }))).toBe(true);
    expect(huntBusy(career({ jobHunt: recordDecision(out, false, 12, 0.2) }))).toBe(false);
  });
});

describe('the season turning over, and the sack', () => {
  it('the rollover clears the slot and the count but keeps every cooldown', () => {
    const c = career();
    const declined = recordDecision(openApplication(c, target)!, false, 12, 0.2);
    const rolled = rollOverHunt(declined, c.season + 1);
    expect(rolled.open).toBeNull();
    expect(rolled.summerMove).toBeNull();
    expect(rolled.sent).toBe(0);
    expect(rolled.sentSeason).toBe(c.season + 1);
    expect(rolled.cooldowns).toEqual(declined.cooldowns);
    expect(applyRefusal({ ...c, season: c.season + 1, jobHunt: rolled }, target.club)).toBe('cooldown');
    const twice = rollOverHunt(rolled, c.season + 2);
    expect(applyRefusal({ ...c, season: c.season + 2, jobHunt: twice }, target.club)).toBeNull();
  });

  it('a yes nobody answered is still waiting at the season end, a pending one or a no is not', () => {
    const out = openApplication(career(), target)!;
    expect(waitingYes(out)).toBeNull();
    expect(waitingYes(recordDecision(out, false, 12, 0.2))).toBeNull();
    expect(waitingYes(recordDecision(out, true, 12, 0.5))).toBe(target.club);
    expect(waitingYes(bookSummerMove(recordDecision(out, true, 12, 0.5), 'blurb')!)).toBeNull();
  });

  it('the sack ends the hunt: nothing open, nothing booked, the cooldowns and the count kept', () => {
    const c = career();
    const declined = recordDecision(openApplication(c, target)!, false, 12, 0.2);
    const booked = bookSummerMove(recordDecision(openApplication({ ...c, jobHunt: declined }, { ...target, club: 'Third Club' })!, true, 14, 0.5), 'blurb')!;
    expect(booked.summerMove).not.toBeNull();
    const dropped = dropOnSack(booked);
    expect(dropped.open).toBeNull();
    expect(dropped.summerMove).toBeNull();
    expect(dropped.cooldowns).toEqual(booked.cooldowns);
    expect(dropped.sent).toBe(booked.sent);
    expect(huntBusy(career({ jobHunt: dropped }))).toBe(false);
    expect(dropOnSack(openApplication(c, target)!).open).toBeNull();
  });
});

describe('the answer', () => {
  it('counts down one of your match days at a time and is due exactly when it reaches zero', () => {
    let hunt = openApplication(career(), target, fixedRng(0.6, 0.5))!;
    const n = hunt.open!.matchesLeft;
    for (let i = 1; i < n; i++) {
      const t = countDown(hunt);
      expect(t.due).toBe(false);
      hunt = t.hunt;
    }
    const last = countDown(hunt);
    expect(last.due).toBe(true);
    expect(last.hunt.open!.matchesLeft).toBe(0);
  });

  it('does nothing once accepted', () => {
    const hunt = recordDecision(openApplication(career(), target)!, true, 12, 0.5);
    expect(countDown(hunt).due).toBe(false);
    expect(countDown(hunt).hunt).toBe(hunt);
  });

  it('a no shuts the door through next season and clears the slot', () => {
    const c = career();
    const hunt = recordDecision(openApplication(c, target)!, false, 12, 0.2);
    expect(hunt.open).toBeNull();
    expect(cooldownUntil({ ...c, jobHunt: hunt }, target.club)).toBe(c.season + COOLDOWN_SEASONS);
    expect(applyRefusal({ ...c, jobHunt: hunt }, target.club)).toBe('cooldown');
    expect(applyRefusal({ ...c, season: c.season + 1, jobHunt: hunt }, target.club)).toBe('cooldown');
    expect(applyRefusal({ ...c, season: c.season + 2, jobHunt: hunt }, target.club)).toBeNull();
    /* The slot is free for another club straight away. */
    expect(applyRefusal({ ...c, jobHunt: hunt }, 'Third Club')).toBeNull();
  });

  it('a yes keeps the application waiting on you with the odds it worked to', () => {
    const hunt = recordDecision(openApplication(career(), target)!, true, 12, 0.61);
    expect(hunt.open!.status).toBe('accepted');
    expect(hunt.open!.decidedWeek).toBe(12);
    expect(hunt.open!.odds).toBe(0.61);
    expect(hunt.cooldowns).toEqual([]);
  });
});

describe('the decision model', () => {
  it('rises with standing, every step of the way', () => {
    let last = -1;
    for (let s = 0; s <= 100; s += 5) {
      const p = acceptanceOdds(input({ standing: s }));
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
    expect(acceptanceOdds(input({ standing: 90 }))).toBeGreaterThan(acceptanceOdds(input({ standing: 40 })) + 0.3);
  });

  it('falls with every tier you apply up and rises a little applying down', () => {
    const same = acceptanceOdds(input({ myTier: 3, targetTier: 3 }));
    const up1 = acceptanceOdds(input({ myTier: 3, targetTier: 2 }));
    const up2 = acceptanceOdds(input({ myTier: 3, targetTier: 1 }));
    const down = acceptanceOdds(input({ myTier: 3, targetTier: 4 }));
    expect(up1).toBeLessThan(same);
    expect(up2).toBeLessThan(up1);
    expect(down).toBeGreaterThan(same);
  });

  it('listens more the worse their own season is going', () => {
    let last = -1;
    for (let t = 0; t <= 20; t += 2) {
      const p = acceptanceOdds(input({ targetTrouble: t }));
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
    expect(acceptanceOdds(input({ targetTrouble: 18 }))).toBeGreaterThan(acceptanceOdds(input({ targetTrouble: 0 })) + 0.15);
  });

  it('never reaches certainty either way', () => {
    expect(acceptanceOdds(input({ standing: 100, targetTrouble: 20, formWins: 5, overshoot: 8, targetTier: 4, myTier: 1 }))).toBe(ODDS_CEILING);
    expect(acceptanceOdds(input({ standing: 0, targetTrouble: 0, formWins: 0, overshoot: -8, targetTier: 1, myTier: 4 }))).toBe(ODDS_FLOOR);
  });

  it('is decided by the stored roll against the odds, nothing else', () => {
    const p = acceptanceOdds(input());
    expect(decideApplication(input(), p - 0.001)).toEqual({ accepted: true, odds: p });
    expect(decideApplication(input(), p + 0.001)).toEqual({ accepted: false, odds: p });
  });

  it('puts the odds into four plain words', () => {
    expect(oddsWord(0.05)).toBe('A long shot');
    expect(oddsWord(0.3)).toBe('Unlikely');
    expect(oddsWord(0.5)).toBe('A real chance');
    expect(oddsWord(0.8)).toBe('They will listen');
  });
});

describe('the words', () => {
  it('give the reason that weighed most, voiced by a role, never a quote', () => {
    const up = declineLine(input({ myTier: 3, targetTier: 1, standing: 50 }), 'Big Club', 'My Club', ['W', 'L', 'D']);
    expect(up).toContain('run a club this size');
    const happy = declineLine(input({ targetTrouble: 0, targetPos: 3 }), 'Other Club', 'My Club', []);
    expect(happy).toContain('3rd');
    expect(happy).toContain('happy with the man they have');
    const thin = declineLine(input({ standing: 30, targetTrouble: 5 }), 'Other Club', 'My Club', []);
    expect(thin).toContain('Without a trophy');
    const form = declineLine(input({ standing: 60, targetTrouble: 5, formWins: 0 }), 'Other Club', 'My Club', ['L', 'L', 'D', 'L', 'L']);
    expect(form).toContain('(LLDLL)');
    const roll = declineLine(input({ standing: 60, targetTrouble: 5, formWins: 3, overshoot: 1 }), 'Other Club', 'My Club', []);
    expect(roll).toContain('somebody they already knew');
    for (const line of [up, happy, thin, form, roll, acceptLine('Other Club', 'My Club'), leavingLine('A', 'B', 'now', 'Someone'), leavingLine('A', 'B', 'summer', '')]) {
      expect(line).not.toMatch(/["“”]/);
      expect([...line].some(c => c === String.fromCharCode(0x2013) || c === String.fromCharCode(0x2014))).toBe(false);
    }
  });
});

describe('the two exits', () => {
  const accepted = () => recordDecision(openApplication(career(), target)!, true, 12, 0.5);

  it('the summer is booked only off a yes, closes the slot, and fires once at the rollover', () => {
    expect(bookSummerMove(openApplication(career(), target)!, 'blurb')).toBeNull();
    const booked = bookSummerMove(accepted(), 'blurb')!;
    expect(booked.open).toBeNull();
    expect(booked.summerMove).toEqual({ club: target.club, blurb: 'blurb' });
    const rolled = consumeSummerMove(booked, 'My Club', 3, 'Interim Name');
    expect(rolled.summerMove).toBeNull();
    expect(rolled.sent).toBe(0);
    expect(rolled.sentSeason).toBe(3);
    expect(rolled.lastMove).toEqual({ from: 'My Club', to: target.club, interim: 'Interim Name', season: 3, week: 0, when: 'summer' });
    /* A second rollover has nothing to take and changes no move. */
    const again = consumeSummerMove(rolled, target.club, 4, 'Nobody');
    expect(again.summerMove).toBeNull();
    expect(again.lastMove).toEqual(rolled.lastMove);
  });

  it('joining now closes the slot and records who took the old dugout', () => {
    const closed = closeOnJoiningNow(accepted(), 'My Club', 'Interim Name', 2, 14);
    expect(closed.open).toBeNull();
    expect(closed.lastMove).toEqual({ from: 'My Club', to: target.club, interim: 'Interim Name', season: 2, week: 14, when: 'now' });
  });

  it('the club reads a manager in work as on his own terms', () => {
    const base: ManagerProfile = {
      playingRep: 0, seasonsSinceRetired: 0, managerTrophies: 1, promotions: 0, relegations: 0, seasonsManaged: 3,
      lastTier: 3, departure: 'sacked', seasonsOut: 2, nationality: 'England', workedIn: [],
    };
    const p = employedProfile(base);
    expect(p.departure).toBe('resigned');
    expect(p.seasonsOut).toBe(0);
    expect(p.managerTrophies).toBe(1);
  });
});
