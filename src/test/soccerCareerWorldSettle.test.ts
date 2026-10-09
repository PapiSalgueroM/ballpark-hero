/* Release AQ: the league world of real engine careers, held to what a player
   reads off his own screens. Two defects of the reviewed head live here.

   1. A season a severe injury cut short never reached the settle, so the
      next season finished it with no record: over 300 careers 102 seasons
      moved clubs unseen and his own club changed division 4 times with no
      line anywhere. Every world season is now settled where it ends.
   2. The settle drew the Season Centre's season inside the engine. It now
      reads the saved season alone, and the Season Centre's table has to show
      the saved clubs in the places that changed hands.

   The careers are the engine's own (advanceProSeason and the cards between
   seasons), on a seeded Math.random, so this is the game and not a fixture. */
import { describe, expect, it } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { deriveSeason, tableAt } from '@/lib/season/core';
import { buildSoccerSeasonCtx, SOCCER } from '@/lib/season/soccer';
import { leagueWorldZone, readLeagueWorldSeason } from '@/lib/soccerCareerLeagueWorld';
import { canonClub } from '@/lib/soccerCareerDerby';

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
function step(s: CareerState, n: number): CareerState {
  switch (s.phase as string) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[n % o.length]) : { ...s, phase: 'playing' }; }
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
    case 'transfer_window': return s.transferSituation?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s);
    case 'retirement_suggestion': return E.declineRetirementSuggestion(s, clubs);
    default: throw new Error(`no move for ${s.phase}`);
  }
}
const POS = ['ST', 'CM', 'CB', 'GK', 'LW', 'RB'];
const NAT = ['England', 'Spain', 'Italy', 'Germany', 'France', 'England'];
function play(n: number): CareerState {
  const seed = 52000 + n;
  const ovr = [58, 64, 70, 76, 84][n % 5];
  const real = Math.random;
  Math.random = seeded(seed);
  try {
    const st = { pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr };
    let s = E.initCareer(`World ${seed}`, NAT[n % 6], POS[n % 6], '2020s', st, ovr, 2020, clubs, null, 88);
    for (let guard = 0; guard < 1500 && !s.retired; guard++) s = step(s, n);
    return s;
  } finally { Math.random = real; }
}
const worldRows = (s: CareerState) => s.seasons.filter((r): r is SeasonRecord => r.type === 'playing' && !!readLeagueWorldSeason(r));

describe('Soccer Career: every season of the league world is settled and shown as saved', () => {
  it('settles the injury years too, and next season plays in the field the moves left', () => {
    let rows = 0; let severe = 0; let moved = 0; let severeMoved = 0;
    for (let n = 0; n < 40; n++) {
      const s = play(n);
      const played = s.seasons.filter(r => r.type === 'playing');
      for (const [i, row] of played.entries()) {
        const w = readLeagueWorldSeason(row);
        if (!w) continue;
        rows += 1;
        const tag = `${52000 + n} ${row.year} ${row.club}`;
        const zone = leagueWorldZone(w);
        expect(zone, `${tag}: settled, with the clubs that left its division`).not.toBeNull();
        if (row.injurySevere) severe += 1;
        const own = zone!.clubs.some(c => canonClub(c) === canonClub(row.club));
        expect(!!w.movement, `${tag}: his own move is written exactly when his club is one of them`).toBe(own);
        if (own) { moved += 1; if (row.injurySevere) severeMoved += 1; }
        /* a played season moves his club by the place the season saved, and by nothing else */
        if (!row.injurySevere) {
          const size = w.members.length;
          const due = zone!.side === 'bottom' ? row.leagueFinish! > size - zone!.count : row.leagueFinish! <= zone!.count;
          expect(own, `${tag}: finished ${row.leagueFinish} of ${size}`).toBe(due);
          expect(w.movement?.kind ?? null).toBe(due ? (zone!.side === 'bottom' ? 'relegated' : 'promoted') : null);
        }
        const next = played[i + 1];
        const nextWorld = next ? readLeagueWorldSeason(next) : null;
        if (!next || !nextWorld || next.year !== row.year + 1) continue;
        if (canonClub(next.club) === canonClub(row.club)) expect(nextWorld.league, `${tag}: next season he is where the move put his club`).toBe(w.movement ? w.movement.to : w.league);
        if (nextWorld.league !== w.league) continue;
        const left = zone!.clubs.map(canonClub);
        const field = nextWorld.members.map(canonClub);
        for (const club of w.members.map(canonClub)) expect(field.includes(club), `${tag}: ${club} next season`).toBe(!left.includes(club));
      }
    }
    console.log(`[world settle] ${rows} world seasons, ${severe} cut short by a severe injury, his club moved ${moved} times (${severeMoved} of them in an injury year)`);
    expect(rows).toBeGreaterThan(300);
    expect(severe).toBeGreaterThanOrEqual(5);
    expect(moved).toBeGreaterThanOrEqual(5);
  }, 600000);

  it('draws each settled table with the saved clubs in the places that changed hands', () => {
    let tables = 0; let wanted = 0; let withRival = 0;
    for (let n = 0; n < 14; n++) {
      const s = play(n);
      for (const row of worldRows(s)) {
        const w = readLeagueWorldSeason(row)!;
        const ctx = buildSoccerSeasonCtx(s, clubs, row);
        if (ctx.mode !== 'table') continue;
        wanted += 1;
        const d = deriveSeason(SOCCER, row, ctx);
        if (!d || d.mode !== 'table') continue;
        tables += 1;
        if (ctx.rivals.length > 0) withRival += 1;
        const zone = leagueWorldZone(w)!;
        const names = tableAt(d, d.rounds.length).map(t => canonClub(d.labels[t.slot].name));
        const shown = zone.side === 'bottom' ? names.slice(-zone.count) : names.slice(0, zone.count);
        expect([...shown].sort(), `${52000 + n} ${row.year} ${row.club}`).toEqual(zone.clubs.map(canonClub).sort());
        expect(names.indexOf(canonClub(row.club)) + 1).toBe(row.leagueFinish);
      }
    }
    console.log(`[world settle] ${wanted} table seasons, ${tables} drawn, ${withRival} of them with a derby rival in the table`);
    expect(tables).toBeGreaterThan(80);
    expect(withRival).toBeGreaterThan(20);
    /* a table the saved zone cannot be drawn into would show as a season that refuses to open */
    expect(tables / wanted).toBeGreaterThan(0.97);
  }, 600000);
});
