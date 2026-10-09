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
/* Bytes by key path (array indices folded), own bytes = the key, its quotes and colon, and a scalar's text. */
function byPath(root: unknown): Map<string, number> {
  const out = new Map<string, number>();
  const add = (p: string, n: number) => out.set(p, (out.get(p) ?? 0) + n);
  const walk = (v: any, p: string) => {
    if (v === null || typeof v !== 'object') { add(p, v === undefined ? 0 : JSON.stringify(v).length + 1); return; }
    if (Array.isArray(v)) { add(p, 2); for (const x of v) walk(x, p + '[]'); return; }
    add(p, 2);
    for (const k of Object.keys(v)) { if (v[k] === undefined) continue; add(p + '.' + k, k.length + 3); walk(v[k], p + '.' + k); }
  };
  walk(root, '');
  return out;
}
const under = (m: Map<string, number>, prefix: string) => [...m].filter(([k]) => k === prefix || k.startsWith(prefix + '.') || k.startsWith(prefix + '[')).reduce((n, [, v]) => n + v, 0);

describe('probe 2: the save by key path', () => {
  it.each([9748, 9749, 9750])('seed %i', seed => {
    let s = play(seed);
    expect(s.retired).toBe(true);
    s = E.choosePostRetirement(s, 'manager', clubs);
    for (let i = 0; i < 10; i++) s = E.advanceManagerSeason(s, clubs);
    const any = s as any;
    const total = size(s);
    const m = byPath(s);
    const rows = any.seasons.length;
    const worldRows = any.seasons.filter((r: any) => r.leagueWorld).length;
    const cupRows = any.seasons.filter((r: any) => r.clubCupRun).length;
    console.log(`[p2] seed ${seed}: save ${total} B, ${rows} rows, ${worldRows} with leagueWorld, ${cupRows} with clubCupRun`);
    const tops = Object.keys(any).map(k => [k, under(m, '.' + k)] as const).sort((a, b) => b[1] - a[1]).slice(0, 14);
    console.log(`[p2] seed ${seed} top: ` + tops.map(([k, v]) => `${k}=${v}`).join(' '));
    const rowKeys = new Set<string>();
    for (const r of any.seasons) for (const k of Object.keys(r)) rowKeys.add(k);
    const rk = [...rowKeys].map(k => [k, under(m, '.seasons[].' + k)] as const).sort((a, b) => b[1] - a[1]).slice(0, 14);
    console.log(`[p2] seed ${seed} rows: ` + rk.map(([k, v]) => `${k}=${v}`).join(' '));
    for (const prefix of ['.seasons[].clubCupRun', '.seasons[].leagueWorld', '.leagueWorld', '.lastUCLResult', '.seasons[].cupRun', '.seasons[].leagueChampions']) {
      const sub = [...m].filter(([k]) => k.startsWith(prefix)).sort((a, b) => b[1] - a[1]).slice(0, 16);
      console.log(`[p2] seed ${seed} ${prefix} (${under(m, prefix)} B): ` + sub.map(([k, v]) => `${k.slice(prefix.length) || '(self)'}=${v}`).join(' '));
    }
    expect(total).toBeGreaterThan(0);
  });
});
