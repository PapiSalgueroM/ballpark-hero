/* Release AQ probe, never committed. Runs on a BASE tree (origin/main, origin/release-ap-int): plays Soccer
   Careers with that tree's own engine, keeps a save at the first sight of every phase and at a few later points,
   and writes them with a fingerprint of every season as that tree's Season Centre derives it. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { deriveSeason, tableAt } from '@/lib/season/core';
import { buildSoccerSeasonCtx, SOCCER } from '@/lib/season/soccer';

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
  switch (s.phase as string) {
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
export function fingerprint(career: CareerState): Record<string, unknown>[] {
  return career.seasons.filter((r: any) => r.type === 'playing').map((row: any) => {
    try {
      const ctx = buildSoccerSeasonCtx(career, clubs, row);
      const s = deriveSeason(SOCCER, row, ctx);
      if (!s) return { year: row.year, club: row.club, mode: ctx.mode, why: ctx.why, derived: false };
      const games = s.games.map((g: any) => `${g.home ? 'H' : 'A'}${g.us}-${g.them}${g.played ? 'p' : 'x'}${g.line?.goals ?? 0}`).join(' ');
      const table = s.mode === 'table' ? tableAt(s, s.rounds.length).map(t => `${s.labels[t.slot].name}:${t.pts}`).join(',') : '';
      return { year: row.year, club: row.club, mode: ctx.mode, why: ctx.why, derived: true, teams: s.teams, games, table, labels: s.labels.map(l => l.name).join(',') };
    } catch (e) { return { year: row.year, club: row.club, error: String((e as Error).message).slice(0, 160) }; }
  });
}

describe('probe: saves made by this tree', () => {
  it('writes them', () => {
    const out: { seed: number; start: number; phase: string; year: number; seasons: number; why: string; save: CareerState; fp: Record<string, unknown>[] }[] = [];
    const seenPhase = new Set<string>();
    const plans = [
      { seed: 5101, pos: 'ST', nat: 'England', ovr: 72 }, { seed: 5102, pos: 'CM', nat: 'Spain', ovr: 70 },
      { seed: 5103, pos: 'CB', nat: 'Italy', ovr: 68 }, { seed: 5104, pos: 'GK', nat: 'Germany', ovr: 70 },
      { seed: 5105, pos: 'ST', nat: 'France', ovr: 76 }, { seed: 5106, pos: 'CM', nat: 'Brazil', ovr: 74 },
    ];
    for (const p of plans) {
      Math.random = seeded(p.seed);
      const st = { pace: p.ovr, shooting: p.ovr, passing: p.ovr, dribbling: p.ovr, defending: p.ovr, physical: p.ovr, reflexes: p.ovr };
      let s = E.initCareer(`Old Save ${p.seed}`, p.nat, p.pos, '2020s', st, p.ovr, 2020, clubs, null, 90);
      const keep = (why: string) => {
        const save: CareerState = JSON.parse(JSON.stringify(s));
        const last: any = save.seasons[save.seasons.length - 1];
        out.push({ seed: p.seed, start: 2020, phase: String(save.phase), year: last?.year ?? 0, seasons: save.seasons.length, why, save, fp: fingerprint(save) });
      };
      let marks = 0;
      for (let guard = 0; guard < 1500 && !s.retired; guard++) {
        const last: any = s.seasons[s.seasons.length - 1];
        const year = last?.year ?? 0;
        const key = `${s.phase}`;
        if (year >= 2025 && !seenPhase.has(key)) { seenPhase.add(key); keep(`first ${key}`); }
        if (s.phase === 'playing' && (year === 2025 || year === 2027 || year === 2031) && marks < 3 && !out.some(o => o.seed === p.seed && o.year === year && o.phase === 'playing')) { marks += 1; keep(`playing after ${year}`); }
        s = step(s);
      }
      if (s.retired) keep('retired');
    }
    const dir = process.env.RC_OUT || '.tmp-fx';
    fs.mkdirSync(dir, { recursive: true });
    const label = process.env.SAVES_LABEL || 'base';
    fs.writeFileSync(path.join(dir, `saves-${label}.json`), JSON.stringify(out));
    console.log(`[make saves] ${label}: ${out.length} saves, phases: ${[...seenPhase].join(', ')}`);
    console.log(`[make saves] ${label}: ${out.map(o => `${o.seed}/${o.phase}/${o.year}/${o.seasons}`).join(' ')}`);
    expect(out.length).toBeGreaterThan(8);
  });
});
