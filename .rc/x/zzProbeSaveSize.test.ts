/* Release AQ probe, never committed: where the Soccer Career save's bytes go on the merged tree.
   Same play() as src/test/careerStory.test.tsx (the longest career plus ten dugout seasons). */
import { describe, it, expect } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';

/* eslint-disable @typescript-eslint/no-explicit-any */
const clubs = E.FALLBACK_CLUBS;
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function step(s: CareerState): CareerState {
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': return s.pendingEvents?.[0] ? E.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'moral_dilemma': return s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, 1) : E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'transfer_window': return (s.transferSituation as any)?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s);
    case 'retirement_suggestion': return E.declineRetirementSuggestion(s, clubs);
    default: throw new Error(`no move for ${s.phase}`);
  }
}
function play(seed: number): CareerState {
  Math.random = seeded(seed);
  const ovr = 70;
  const st = { pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr };
  let s = E.initCareer(`Story ${seed}`, 'England', 'CM', '2020s', st, ovr, 2020, clubs, null, 88);
  let steps = 0;
  for (let guard = 0; guard < 2000; guard++) {
    if (s.retired || steps >= 99) break;
    const isStep = s.phase === 'youth' || s.phase === 'playing';
    s = step(s);
    if (isStep) steps++;
  }
  return s;
}
const size = (v: unknown) => v === undefined ? 0 : JSON.stringify(v).length;

describe('probe: the save by field', () => {
  it.each([9748, 9749, 9750])('seed %i', seed => {
    let s = play(seed);
    expect(s.retired).toBe(true);
    const rows = s.seasons.length;
    s = E.choosePostRetirement(s, 'manager', clubs);
    for (let i = 0; i < 10; i++) s = E.advanceManagerSeason(s, clubs);
    const any = s as any;
    const total = size(s);
    const top: Record<string, number> = {};
    for (const k of Object.keys(any)) top[k] = size(any[k]);
    const topSorted = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(' ');
    const rowField: Record<string, number> = {};
    for (const row of any.seasons) for (const k of Object.keys(row)) rowField[k] = (rowField[k] ?? 0) + size(row[k]) + k.length + 4;
    const rowSorted = Object.entries(rowField).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(' ');
    const lw = any.seasons.map((r: any) => r.leagueWorld).filter(Boolean);
    const lwMovements = lw.reduce((n: number, w: any) => n + size(w.movements), 0);
    const lwMembers = lw.reduce((n: number, w: any) => n + size(w.members), 0);
    const cup = any.seasons.reduce((n: number, r: any) => n + size(r.clubCupRun), 0);
    console.log(`[save probe] seed ${seed}: ${rows} rows, save ${total} B | top: ${topSorted}`);
    console.log(`[save probe] seed ${seed}: season rows by field: ${rowSorted}`);
    console.log(`[save probe] seed ${seed}: rows with leagueWorld ${lw.length}, their movements ${lwMovements} B, members ${lwMembers} B; clubCupRun ${cup} B; career.leagueWorld ${size(any.leagueWorld)} B; lastUCLResult ${size(any.lastUCLResult)} B`);
    expect(total).toBeGreaterThan(0);
  });
});
