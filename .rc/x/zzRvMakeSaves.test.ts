/* Reviewer's probe, never committed. Runs on the BASE tree (origin/release-ap-int): plays Soccer Careers with the
   base engine and keeps a save at the first sight of every KIND of screen the builder's proof did not cover:
   the appeal result, a contract offer, the youth years, the debut, each frozen out card, a dugout save, and a
   save from the base with events still queued behind an appeal. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
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
const kindOf = (s: CareerState): string => {
  const sit: any = s.transferSituation;
  if (s.phase === 'transfer_window') return `transfer_window:${sit?.type ?? 'none'}${sit?.mode ? ':' + sit.mode : ''}${sit?.type === 'frozen_out' ? (sit.offers?.length ? ':offers' : ':nooffers') : ''}`;
  if (s.phase === 'random_events' && s.pendingAppealResult) return 'random_events:appeal_waiting';
  return String(s.phase);
};
function step(s: CareerState, big: boolean): CareerState {
  switch (s.phase as string) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'contract_offer': {
      const o = [...(s.pendingOffers || [])];
      if (!o.length) return { ...s, phase: 'playing' };
      /* the biggest club that asked, so a modest player ends up on the fringe and gets listed */
      const pick = big ? o.sort((a: any, b: any) => (a.club?.tier ?? 9) - (b.club?.tier ?? 9))[0] : o[0];
      return E.acceptOffer(s, pick);
    }
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': {
      const ev: any = s.pendingEvents?.[0];
      if (!ev) return { ...s, pendingEvents: [], phase: 'playing' };
      return E.applyEventChoice(s, ev.id === 9 ? 1 : 0, clubs);
    }
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

describe('reviewer probe: saves made by the base tree', () => {
  it('writes them', () => {
    const out: { seed: number; kind: string; year: number; seasons: number; save: CareerState }[] = [];
    const seen = new Map<string, number>();
    const want = (k: string) => (seen.get(k) ?? 0) < (k.startsWith('transfer_window:frozen_out') || k.startsWith('red_card') || k.startsWith('random_events:appeal') ? 3 : 1);
    const positions = ['ST', 'CM', 'CB', 'GK', 'LW', 'RB'];
    const nations = ['England', 'Spain', 'Italy', 'Germany', 'France', 'Brazil'];
    for (let n = 0; n < 60; n++) {
      const seed = 8800 + n;
      const ovr = n % 3 === 0 ? 58 : n % 3 === 1 ? 64 : 74;
      Math.random = seeded(seed);
      const st = { pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr };
      let s = E.initCareer(`Rv Save ${seed}`, nations[n % 6], positions[n % 6], '2020s', st, ovr, 2020, clubs, null, 88);
      const keep = (kind: string) => {
        const save: CareerState = JSON.parse(JSON.stringify(s));
        const last: any = save.seasons[save.seasons.length - 1];
        seen.set(kind, (seen.get(kind) ?? 0) + 1);
        out.push({ seed, kind, year: last?.year ?? 0, seasons: save.seasons.length, save });
      };
      for (let guard = 0; guard < 1500 && !s.retired; guard++) {
        const last: any = s.seasons[s.seasons.length - 1];
        const year = last?.year ?? 0;
        const k = kindOf(s);
        const early = k === 'youth' || k === 'contract_offer' || k === 'international_debut';
        if ((early || year >= 2025) && want(k)) keep(k);
        s = step(s, n % 3 !== 2);
      }
      if (s.retired && n < 4) {
        try {
          s = E.choosePostRetirement(s, 'manager', clubs);
          for (let i = 0; i < 2; i++) s = E.advanceManagerSeason(s, clubs);
          keep(`dugout:${String(s.phase)}`);
        } catch (e) { console.log(`[rv make] dugout threw on the base: ${(e as Error).message.slice(0, 160)}`); }
      }
    }
    const dir = process.env.RC_OUT || '.tmp-fx';
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'rv-saves-base.json'), JSON.stringify(out));
    console.log(`[rv make] ${out.length} saves; kinds: ${[...seen.entries()].map(([k, v]) => `${k} x${v}`).join(', ')}`);
    expect(out.length).toBeGreaterThan(6);
  });
});
