/* Reviewer's probe, never committed. Runs on the MERGED tree: plays real careers with the engine and holds every
   season of the simulated league world to what a player would read off his own screens. */
import { describe, it, expect } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { deriveSeason, tableAt } from '@/lib/season/core';
import { buildSoccerSeasonCtx, SOCCER } from '@/lib/season/soccer';
import { SC_CLUB_CANON } from '@/data/clubRivalries';

/* eslint-disable @typescript-eslint/no-explicit-any */
const clubs = E.FALLBACK_CLUBS;
const key = (name: string) => ((SC_CLUB_CANON as any)[name] ?? name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const PYR: Record<string, { other: string; count: number; upper: boolean; size: number }> = {
  'Premier League': { other: 'Championship', count: 3, upper: true, size: 20 }, Championship: { other: 'Premier League', count: 3, upper: false, size: 24 },
  Bundesliga: { other: '2. Bundesliga', count: 2, upper: true, size: 18 }, '2. Bundesliga': { other: 'Bundesliga', count: 2, upper: false, size: 18 },
  'Ligue 1': { other: 'Ligue 2', count: 2, upper: true, size: 18 }, 'Ligue 2': { other: 'Ligue 1', count: 2, upper: false, size: 18 },
  'Serie A': { other: 'Serie B', count: 3, upper: true, size: 20 }, 'Serie B': { other: 'Serie A', count: 3, upper: false, size: 20 },
  'La Liga': { other: 'Segunda Division', count: 3, upper: true, size: 20 }, 'Segunda Division': { other: 'La Liga', count: 3, upper: false, size: 20 },
};
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
    case 'random_events': return s.pendingEvents?.[0] ? E.applyEventChoice(s, (s.pendingEvents[0] as any).id === 9 ? n % 2 : 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
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

describe('reviewer probe: the simulated league world a player reads', () => {
  it('holds its own promises over real careers', () => {
    const bad: Record<string, string[]> = {};
    const note = (k: string, line: string) => { (bad[k] ??= []).push(line); };
    const tierOf = new Map(clubs.map(c => [key(c.name), c.tier]));
    let careers = 0, rows = 0, tableRows = 0, hisDown = 0, hisUp = 0, derbyRows = 0, bytesMax = 0;
    const downByTier: Record<string, number> = {}, bigDown: Record<string, number> = {}, hisDownByTier: Record<string, number> = {};
    let worldMoves = 0;
    const stable = { rows: 0, moved: 0, oldRows: 0, oldMoved: 0 };
    const ev = { cards: 0, appeals: 0, behind: 0 };
    const gone = { n: 0, back: 0, backYears: 0, never: 0, neverYears: 0 }; const goneEx: string[] = [];
    const rv: Record<string, { n: number; pos: number; down: number; bottomHalf: number }> = {};
    const POS = ['ST', 'CM', 'CB', 'GK', 'LW', 'RB'], NAT = ['England', 'Spain', 'Italy', 'Germany', 'France', 'England'];
    for (let n = 0; n < 300; n++) {
      const seed = 52000 + n, ovr = [58, 64, 70, 76, 84][n % 5];
      Math.random = seeded(seed);
      const st = { pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr };
      let s = E.initCareer(`World ${seed}`, NAT[n % 6], POS[n % 6], '2020s', st, ovr, 2020, clubs, null, 88);
      const atSummary = new Map<number, { order: string[] | null; row: string; rivals: string }>();
      const answered = new Map<string, number>();
      for (let guard = 0; guard < 1500 && !s.retired; guard++) {
        const ps: any = s.phase === 'season_summary' ? s.pendingSummary : null;
        if (ps && ps.type === 'playing' && !atSummary.has(ps.year)) {
          let order: string[] | null = null; let rivals = '';
          try {
            const ctx = buildSoccerSeasonCtx(s, clubs, ps);
            rivals = `${ctx.mode}/${(ctx as any).why ?? ''}/${((ctx as any).rivals ?? []).join(',')}/${(ctx as any).champion ?? ''}`;
            const d = deriveSeason(SOCCER, ps, ctx);
            if (d?.mode === 'table') order = tableAt(d, d.rounds.length).map(t => d.labels[t.slot].name);
          } catch { /* reported at the end */ }
          atSummary.set(ps.year, { order, row: JSON.stringify(ps), rivals });
        }
        if (s.phase === 'random_events' && s.pendingEvents?.[0]) { const k = `${(s.seasons[s.seasons.length - 1] as any)?.year}:${(s.pendingEvents[0] as any).id}`; answered.set(k, (answered.get(k) ?? 0) + 1); }
        if ((s.phase as string) === 'red_card_appeal_result') { ev.appeals += 1; if ((s.pendingEvents?.length ?? 0) > 0) ev.behind += 1; }
        s = step(s, n);
      }
      for (const [k, v] of answered) { ev.cards += v; if (v > 1) note('E1 one event card answered twice in one season', `${seed} ${k} x${v}`); }
      careers += 1;
      for (const row of s.seasons.filter((r: any) => r.type === 'playing') as any[]) {
        const was = atSummary.get(row.year);
        if (!was) continue;
        let now: string[] | null = null; let rivalsNow = '';
        try {
          const ctx = buildSoccerSeasonCtx(s, clubs, row);
          rivalsNow = `${ctx.mode}/${(ctx as any).why ?? ''}/${((ctx as any).rivals ?? []).join(',')}/${(ctx as any).champion ?? ''}`;
          const d = deriveSeason(SOCCER, row, ctx);
          if (d?.mode === 'table') now = tableAt(d, d.rounds.length).map(t => d.labels[t.slot].name);
        } catch { /* below */ }
        if (row.leagueWorld) stable.rows += 1; else stable.oldRows += 1;
        if (JSON.stringify(was.order) !== JSON.stringify(now)) {
          if (row.leagueWorld) stable.moved += 1; else stable.oldMoved += 1;
          const a = JSON.parse(was.row), b = row;
          const fields = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => k !== 'leagueWorld' && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
          note(row.leagueWorld ? 'S1 the final table of a finished WORLD season is not the one he was shown at the summary' : 'S0 the final table of a finished season WITHOUT a world is not the one he was shown at the summary', `${seed} ${row.year} ${row.club}: row fields changed since [${fields.join(',')}]; ctx then ${was.rivals} now ${rivalsNow}; then ${was.order ? was.order.slice(-4).join('>') : 'no table'} now ${now ? now.slice(-4).join('>') : 'no table'}`);
        }
        const p0 = row.leagueWorld ? PYR[row.leagueWorld.league] : null;
        if (was.order && p0) {
          const want = (p0.upper ? was.order.slice(-p0.count) : was.order.slice(0, p0.count)).map(key).sort().join('|');
          const moved = (row.leagueWorld.movements ?? []).filter((m: any) => m.from === row.leagueWorld.league).map((m: any) => key(m.club)).sort().join('|');
          if (want !== moved) note('S2 the clubs that left are not the ones the SUMMARY TIME table shows', `${seed} ${row.year} ${row.club}: moved ${moved} want ${want}`);
        }
      }
      bytesMax = Math.max(bytesMax, JSON.stringify(s).length);
      const played = s.seasons.filter((r: any) => r.type === 'playing') as any[];
      for (const [i, row] of played.entries()) {
        const w = row.leagueWorld;
        if (row.year >= 2026 && !w && PYR[clubs.find(c => key(c.name) === key(row.club))?.league ?? '']) note('I0 a 2026+ season at a club of the five pyramids holds no league world', `${seed} ${row.year} ${row.club}`);
        if (!w) continue;
        rows += 1;
        const tag = `${seed} ${row.year} ${row.club} (${w.league})`;
        const p = PYR[w.league];
        if (!p) { note('I6 unknown league', tag); continue; }
        const mk = w.members.map(key);
        if (w.members.length !== p.size || new Set(mk).size !== p.size) note('I6 the field is not the division size', `${tag}: ${w.members.length}`);
        if (row.leagueSize !== undefined && row.leagueSize !== p.size) note('I6 leagueSize is not the division size', `${tag}: ${row.leagueSize}`);
        if (row.leagueFinish !== undefined && (row.leagueFinish < 1 || row.leagueFinish > p.size)) note('I6 finish outside the table', `${tag}: ${row.leagueFinish}`);
        if ((row.leagueApps ?? 0) > 2 * (p.size - 1)) note('I6 more league games than the calendar holds', `${tag}: ${row.leagueApps}`);
        if (!!row.leagueTitle !== (key(w.champion) === key(row.club))) note('I4 title and champion disagree', `${tag}: title ${!!row.leagueTitle}, champion ${w.champion}, finish ${row.leagueFinish}`);
        if (row.derbies?.length) { derbyRows += 1; for (const d of row.derbies) if (!mk.includes(key(d.rival))) note('I1 a league derby against a club outside his division', `${tag}: ${d.rival}`); }
        /* his place: the Season Centre's final table when it draws one, else the row */
        let place: number | undefined = row.leagueFinish;
        try {
          const ctx = buildSoccerSeasonCtx(s, clubs, row);
          const d = deriveSeason(SOCCER, row, ctx);
          if (d?.mode === 'table') {
            tableRows += 1;
            const order = tableAt(d, d.rounds.length).map(t => d.labels[t.slot].name);
            if (p.upper) {
              const rivalKeys = (row.derbies ?? []).map((x: any) => key(x.rival));
              const downNow = (w.movements ?? []).filter((m: any) => m.from === w.league).map((m: any) => key(m.club));
              order.forEach((nm, idx) => {
                const k = key(nm); if (k === key(row.club)) return;
                const t = tierOf.get(k) ?? 4; if (t > 2) return;
                const g = rivalKeys.includes(k) ? (rv[`rival tier ${t}`] ??= { n: 0, pos: 0, down: 0, bottomHalf: 0 }) : (rv[`other tier ${t}`] ??= { n: 0, pos: 0, down: 0, bottomHalf: 0 });
                g.n += 1; g.pos += idx + 1; if (downNow.includes(k)) g.down += 1; if (idx + 1 > p.size / 2) g.bottomHalf += 1;
                if (downNow.includes(k) && rivalKeys.includes(k)) {
                  let away = 0, back = false;
                  for (const later of played.slice(i + 1)) { if (!later.leagueWorld || later.leagueWorld.league !== w.league) break; if (later.leagueWorld.members.map(key).includes(k)) { back = true; break; } away += 1; }
                  gone.n += 1; if (back) { gone.back += 1; gone.backYears += away; } else { gone.never += 1; gone.neverYears += away; }
                  if (goneEx.length < 10) goneEx.push(`${seed} ${row.year} ${row.club}: ${nm} (pool tier ${t}) placed ${idx + 1} of ${p.size} and went down; ${back ? `back after ${away} seasons away` : `still down ${away} seasons later when his time in that league ended`}`);
                }
              });
            }
            const at = order.findIndex(nm => key(nm) === key(row.club)) + 1;
            if (row.leagueFinish !== undefined && at !== row.leagueFinish) note('I3 the final table puts him somewhere else than the row', `${tag}: table ${at}, row ${row.leagueFinish}`);
            if (key(order[0]) !== key(row.leagueTitle ? row.club : w.champion)) note('I4 the top of the final table is not the saved champion', `${tag}: ${order[0]} vs ${w.champion}`);
            const ok = [...order.map(key)].sort().join('|') === [...mk].sort().join('|');
            if (!ok) note('I3 the final table is not the saved field', tag);
            place = at;
            const downs = order.slice(-p.count).map(key), ups = order.slice(0, p.count).map(key);
            const moved = (w.movements ?? []).filter((m: any) => m.from === w.league).map((m: any) => key(m.club)).sort().join('|');
            const want = (p.upper ? downs : ups).sort().join('|');
            if (moved !== want) note('I3 the clubs that left his division are not the ones the final table shows', `${tag}: moved ${moved} want ${want}`);
          }
        } catch (e) { note('I3 deriving the season threw', `${tag}: ${(e as Error).message.slice(0, 120)}`); }
        const should = place === undefined ? null : p.upper ? (place > p.size - p.count ? 'relegated' : null) : (place <= p.count ? 'promoted' : null);
        const got = w.movement?.kind ?? null;
        if (!row.injurySevere && should !== got) note('I3 his own movement does not follow his place', `${tag}: place ${place} of ${p.size}, movement ${got}`);
        if (w.movement) { if (w.movement.kind === 'relegated') { hisDown += 1; hisDownByTier[`tier ${row.clubTier}`] = (hisDownByTier[`tier ${row.clubTier}`] ?? 0) + 1; } else hisUp += 1; }
        for (const m of (w.movements ?? []) as any[]) {
          worldMoves += 1;
          if (m.kind !== 'relegated') continue;
          const t = tierOf.get(key(m.club)) ?? 4;
          downByTier[`tier ${t}`] = (downByTier[`tier ${t}`] ?? 0) + 1;
          if (t === 1 && key(m.club) !== key(row.club)) bigDown[m.club] = (bigDown[m.club] ?? 0) + 1;
        }
        const next = played[i + 1];
        if (next?.leagueWorld && next.year === row.year + 1) {
          const nk = next.leagueWorld.members.map(key);
          if (key(next.club) === key(row.club)) {
            const wantLeague = w.movement ? w.movement.to : w.league;
            if (next.leagueWorld.league !== wantLeague) note('I2 next season he is not in the division the movement named', `${tag}: next ${next.leagueWorld.league}, want ${wantLeague}`);
            if (w.movement?.kind === 'relegated' && next.clubTier < 4) note('I5 a relegated club kept a top flight tier', `${tag}: next tier ${next.clubTier}`);
          }
          const league = next.leagueWorld.league;
          const here = w.league === league ? mk : null;
          if (here) {
            const out = (w.movements ?? []).filter((m: any) => m.from === league).map((m: any) => key(m.club));
            const inn = (w.movements ?? []).filter((m: any) => m.to === league).map((m: any) => key(m.club));
            const want = [...here.filter((c: string) => !out.includes(c)), ...inn].sort().join('|');
            if (want !== [...nk].sort().join('|')) {
              const wantSet = want.split('|');
              const extra = nk.filter((c: string) => !wantSet.includes(c)), missing = wantSet.filter((c: string) => !nk.includes(c));
              note('I2 next season\'s field is not this field after the listed moves', `${tag}: next club ${next.club}, severe ${!!row.injurySevere}, loan ${row.onLoanFrom ?? 'no'}, ${(w.movements ?? []).length} moves listed (${out.length} out, ${inn.length} in), in the next field but not expected [${extra.join(',')}], expected but gone [${missing.join(',')}]`);
            }
          }
        }
      }
    }
    const share = (o: Record<string, number>) => Object.entries(o).sort().map(([k, v]) => `${k}: ${v}`).join(', ');
    console.log(`[rv world] ${careers} careers, ${rows} league world seasons (${tableRows} with a final table, ${derbyRows} with derbies), his club went down ${hisDown} times (${share(hisDownByTier)}) and up ${hisUp}; largest save ${bytesMax} bytes`);
    console.log(`[rv world] ${worldMoves} listed moves; relegated clubs by their pool tier: ${share(downByTier)}`);
    console.log(`[rv world] big clubs in HIS top flight table, by whether they are his derby rival: ${Object.entries(rv).sort().map(([k, g]) => `${k}: ${g.n} club seasons, mean place ${(g.pos / g.n).toFixed(1)}, bottom half ${(100 * g.bottomHalf / g.n).toFixed(1)}%, relegated ${g.down} (${(100 * g.down / g.n).toFixed(1)}%)`).join(' | ')}`);
    console.log(`[rv world] a big rival sent down ${gone.n} times: back in his league before he left it ${gone.back} times (mean ${(gone.backYears / Math.max(1, gone.back)).toFixed(1)} seasons away), not back ${gone.never} times (mean ${(gone.neverYears / Math.max(1, gone.never)).toFixed(1)} more seasons watched)`);
    for (const line of goneEx) console.log(`[rv world]    EXAMPLE ${line}`);
    console.log(`[rv world] tier 1 clubs (not his) sent down: ${Object.entries(bigDown).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} x${v}`).join(', ') || 'none'}`);
    const kinds = Object.keys(bad);
    console.log(`[rv world] events: ${ev.cards} cards answered, ${ev.appeals} appeal results shown, ${ev.behind} of them with cards still queued behind`);
    console.log(`[rv world] stability: ${stable.rows} finished seasons derived at their summary and again at the end of the career, ${stable.moved} drew a different final table; seasons without a world: ${stable.oldRows}, ${stable.oldMoved} different`);
    for (const k of kinds) { console.log(`[rv world] BROKEN ${k}: ${bad[k].length} times`); for (const line of bad[k].slice(0, 6)) console.log(`[rv world]    ${line.slice(0, 700)}`); }
    console.log(`[rv world] ${kinds.length} kinds of broken promise`);
    expect(kinds).toEqual([]);
  });
});
