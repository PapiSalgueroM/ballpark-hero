/* Round 1107: the pure pieces Soccer Career's milestone scenes are built from
   (src/components/soccer-career/careerMilestones.ts), held against the REAL
   engine.

   Twenty four careers are played on a seeded Math.random (mulberry32, set
   here and restored in a finally), each stepped the way the page steps it.
   At EVERY season step the growth note is checked against the two saves
   field by field, from a deep copy taken before the step, and the same note
   is built again from the live object the engine was handed: the two must be
   equal, which is what lets the page compare its own state before and after
   without copying it.

   Not vacuous, measured on these seeds (the run prints the line):
   COUNTS_PLACEHOLDER

   If a change to the engine starves one of the three counts the test asks
   for (an armband, a rise of OVERALL_JUMP, a fall), change the SEEDS, never
   the assertion. The share of seasons with a scene is printed, not asserted:
   it is the lead's call whether OVERALL_JUMP still earns its number. */
import { describe, expect, it } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { attrTreeFor } from '@/lib/soccerCareerAttributes';
import {
  OVERALL_JUMP, armbandSpecs, debutSpec, growthTicks, overallSpec, seasonGrowthNote,
} from '@/components/soccer-career/careerMilestones';
import { debutMomentKey } from '@/components/soccer-career/careerMoments';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clubs = E.FALLBACK_CLUBS;

/* The page's own answers to every screen between two seasons, first choice
   each time (the table scripts/playReducedMotion.mjs steps a career with). */
function step(st: CareerState): CareerState | null {
  switch (st.phase) {
    case 'youth': return E.advanceYouthYear(st, clubs);
    case 'contract_offer': return (st.pendingOffers || []).length ? E.acceptOffer(st, st.pendingOffers[0]) : { ...st, phase: 'playing' };
    case 'playing': return E.advanceProSeason(st, clubs);
    case 'newspaper': return E.dismissNewspaper(st);
    case 'season_summary': return E.dismissSummary(st, clubs);
    case 'ballon_dor': return E.dismissBallonDor(st, clubs);
    case 'international_debut': return E.dismissDebut(st, clubs);
    case 'world_cup': return E.dismissWorldCup(st, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(st, clubs);
    case 'social_media_action': return st.pendingCoverAthleteEvent ? E.handleCoverAthleteDecision(st, false) : E.dismissSocialMediaPhase(st, clubs);
    case 'random_events': return (st.pendingEvents || [])[0]?.choices?.length ? E.applyEventChoice(st, 0, clubs) : { ...st, phase: 'playing', pendingEvents: [] };
    case 'moral_dilemma': return E.dismissMoralDilemma(E.applyMoralDilemmaChoice(st, 0), clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(st, clubs);
    case 'rehab_choice': return E.applyRehabChoice(st, 0);
    case 'transfer_window': return E.stayAtClub(st);
    case 'retirement_suggestion': return E.declineRetirementSuggestion(st, clubs);
    default: return null;
  }
}

const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);
const POSITIONS = ['ST', 'CM', 'CB', 'GK'];
const NATIONS = ['Brazil', 'England', 'Portugal', 'Japan', 'Ghana', 'Scotland'];
const rounded = (c: CareerState, key: string) => Math.round(Number((c as unknown as Record<string, unknown>)[key]));

describe('Round 1107: the growth note is the difference between two saves, nothing else', () => {
  it('holds at every season step of 24 seeded careers, and the sample is not vacuous', () => {
    const seen = { careers: 0, seasons: 0, rises: 0, falls: 0, flat: 0, clubArmbands: 0, intlArmbands: 0, debuts: 0, ticks: 0, longestRun: 0 };
    const real = Math.random;
    try {
      for (const seed of SEEDS) {
        Math.random = mulberry32(1107000 + seed * 31);
        const o = 62 + (seed % 5) * 4;
        const stats = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
        let st: CareerState | null = E.initCareer(`Kit ${seed}`, NATIONS[seed % NATIONS.length], POSITIONS[seed % POSITIONS.length], '2010-14', stats, o, 2010, clubs, null, 84 + (seed % 4) * 4);
        seen.careers += 1;
        let run = 0;
        for (let guard = 0; guard < 700 && st && !st.retired; guard += 1) {
          if (st.phase === 'international_debut') {
            seen.debuts += 1;
            const debut = debutSpec(st);
            expect(debut.kind).toBe('milestone');
            expect(debut.tone).toBe('gold');
            expect(debut.key).toBe(debutMomentKey(st));
            expect(debut.key).not.toBeNull();
            expect(debut.title).toBe('INTERNATIONAL DEBUT');
            expect(debut.lines).toEqual([
              `${st.playerName} has been called up to the ${st.nationality} national team!`,
              `${st.nationality} · Age ${st.age} · OVR ${st.overall}`,
              '🎉 Your international journey begins.',
            ]);
          }
          if (st.phase !== 'playing') { st = step(st); continue; }
          const before: CareerState = JSON.parse(JSON.stringify(st));
          const next = E.advanceProSeason(st, clubs);
          const note = seasonGrowthNote(before, next);
          /* The engine left the object it was handed alone, so the page may
             compare its own state before and after without a copy. */
          expect(seasonGrowthNote(st, next), `seed ${seed} step ${guard}`).toEqual(note);
          if (next.seasons.length <= before.seasons.length) {
            expect(note).toBeNull();
            st = next;
            continue;
          }
          seen.seasons += 1;
          expect(note).not.toBeNull();
          const n = note!;
          const row = next.seasons[next.seasons.length - 1];
          expect([n.year, n.club]).toEqual([row.year, row.club]);
          expect(n.overall).toEqual({ from: before.overall, to: next.overall });
          expect(Number.isInteger(before.overall) && Number.isInteger(next.overall), 'an overall prints as it is stored').toBe(true);
          const tree = attrTreeFor(next.position);
          const changed = tree.filter(f => rounded(before, f.key) !== rounded(next, f.key));
          expect(n.attrs).toEqual(changed.map(f => ({ key: f.key, label: f.label, from: rounded(before, f.key), to: rounded(next, f.key) })));
          expect(growthTicks(n)).toEqual(n.attrs.map(a => ({ label: a.label, to: String(a.to), from: String(a.from) })));
          seen.ticks += n.attrs.length;
          expect(n.clubCaptain).toBe(!(before.isClubCaptain ?? false) && (next.isClubCaptain ?? false));
          expect(n.intlCaptain).toBe(!before.intStats.isCaptain && next.intStats.isCaptain);

          const rise = next.overall - before.overall;
          const scene = overallSpec(n, next);
          if (rise >= OVERALL_JUMP) {
            seen.rises += 1;
            run += 1;
            seen.longestRun = Math.max(seen.longestRun, run);
            expect(scene).not.toBeNull();
            expect(scene!.title).toBe(`Up to ${next.overall} overall`);
            expect(scene!.lines).toEqual([`You started the season on ${before.overall}`]);
            expect(scene!.count).toEqual({ text: String(next.overall), from: String(before.overall), label: 'overall' });
            expect(scene!.tone).toBe('good');
            expect(scene!.colour).toBe(next.currentClubColor);
            expect(scene!.key).toContain(`|${n.year}|${before.overall}|${next.overall}`);
          } else {
            run = 0;
            if (rise < 0) seen.falls += 1; else seen.flat += 1;
            /* A fall, or a small rise, never gets a scene. */
            expect(scene).toBeNull();
          }

          const bands = armbandSpecs(n, next);
          expect(bands.length).toBe((n.clubCaptain ? 1 : 0) + (n.intlCaptain ? 1 : 0));
          if (n.clubCaptain) {
            seen.clubArmbands += 1;
            expect(bands[0].title).toBe('©️ Club captain');
            expect(bands[0].lines).toEqual([`The ${next.currentClub} armband is yours`]);
            expect(bands[0].colour).toBe(next.currentClubColor);
          }
          if (n.intlCaptain) {
            seen.intlArmbands += 1;
            const band = bands[bands.length - 1];
            expect(band.title).toBe(`©️ Captain of ${next.nationality}`);
            expect(band.colour).toBeUndefined();
          }
          for (const band of bands) { expect(band.tone).toBe('gold'); expect(band.kind).toBe('milestone'); }
          expect(new Set(bands.map(b => b.key)).size).toBe(bands.length);
          st = next;
        }
      }
    } finally {
      Math.random = real;
    }
    const share = Math.round((seen.rises / seen.seasons) * 1000) / 10;
    console.log(`careerMilestones: ${JSON.stringify(seen)}; ${share} percent of played seasons rise by ${OVERALL_JUMP} or more`);
    expect(seen.careers).toBe(24);
    expect(seen.seasons).toBeGreaterThan(200);
    expect(seen.clubArmbands, 'the sample never took a club armband: change the seeds').toBeGreaterThanOrEqual(1);
    expect(seen.rises, 'the sample never rose by OVERALL_JUMP: change the seeds').toBeGreaterThanOrEqual(1);
    expect(seen.falls, 'the sample never fell: change the seeds').toBeGreaterThanOrEqual(1);
    expect(seen.debuts, 'the sample never reached a first cap: change the seeds').toBeGreaterThanOrEqual(1);
    expect(seen.ticks).toBeGreaterThan(0);
  }, 240_000);

  it('a step that wrote no season is no note', () => {
    const base = { seasons: [{ year: 2012, club: 'A' }], position: 'ST', overall: 70, intStats: { isCaptain: false } } as unknown as CareerState;
    expect(seasonGrowthNote(base, { ...base })).toBeNull();
    expect(seasonGrowthNote(base, { ...base, seasons: [] } as CareerState)).toBeNull();
  });

  it('the jump is exactly OVERALL_JUMP: one under is a tile, a fall is never a scene', () => {
    const career = (overall: number, seasons: number) => ({
      seasons: Array.from({ length: seasons }, (_, i) => ({ year: 2012 + i, club: 'Rivertown FC', apps: 30, goals: 10 })),
      position: 'ST', overall, playerName: 'A', nationality: 'B', currentClub: 'Rivertown FC', currentClubColor: '#1D4ED8', intStats: { isCaptain: false },
      pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall,
    }) as unknown as CareerState;
    const at = (from: number, to: number) => { const next = career(to, 2); return overallSpec(seasonGrowthNote(career(from, 1), next)!, next); };
    expect(OVERALL_JUMP).toBe(3);
    expect(at(70, 73)?.title).toBe('Up to 73 overall');
    expect(at(70, 72)).toBeNull();
    expect(at(70, 70)).toBeNull();
    expect(at(73, 70)).toBeNull();
    /* The same rise in another season, or another rise in the same one, is another key. */
    const next = career(73, 2);
    const note = seasonGrowthNote(career(70, 1), next)!;
    expect(overallSpec(note, next)!.key).not.toBe(overallSpec({ ...note, year: note.year + 1 }, next)!.key);
    expect(growthTicks(note).length).toBe(attrTreeFor('ST').length);
    expect(growthTicks(note)[0]).toEqual({ label: attrTreeFor('ST')[0].label, to: '73', from: '70' });
  });
});
