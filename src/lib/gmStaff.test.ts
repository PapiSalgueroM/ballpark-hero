/* Round 910: the shared staff desk, in unit form. scripts/simGmStaff.mjs is
   the harness (the Club Manager fixture, every pack, every level step); these
   are the promises a bind leans on, small enough to read at a glance. */
import { createElement, useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GM_STAFF_EMPTY_LINE, gmBoundedEdge, gmDefaultStaff, gmEffectAt, gmHireStaff, gmInjuryWeeks, gmIsValidStaff, gmMatchedWage,
  gmRolloverStaff, gmSackStaff, gmScoutBand, gmScoutNoise, gmScoutSpread, gmStaffEffect, gmStaffOf, gmStaffShortlist,
  gmStaffWage, gmStatureAnchor, gmSummerWalk, gmTickStaff,
} from '@/lib/gmStaff';
import type { GmStaffBlock, GmStaffCtx } from '@/lib/gmStaff';
import { coordinatorEdge, STAFF_EDGE_PER_POINT, STAFF_NEUTRAL, STAFF_UNIT_EDGE_MAX } from '@/lib/collegeProgram';
import { CM_STAFF_RULES, isValidStaff, sackStaff, staffOf, staffWage } from '@/lib/clubManagerStaff';
import { startCareer } from '@/lib/clubManager';
import { CFB_STAFF_PACK, GM_STAFF_PACKS, NFL_STAFF_PACK } from '@/data/gmStaff/packs';
import type { NflStaffPost } from '@/data/gmStaff/packs';
import { GmStaffPanel } from '@/components/front-office-shared/GmStaffPanel';

afterEach(cleanup);

const ctxFor = (owner: string, stature = 0.5, week = 1): GmStaffCtx<NflStaffPost> => ({
  owner, world: 'now', season: 1, week, money: 1,
  anchor: post => gmStatureAnchor(owner, post, stature), inHouse: 2, rivals: () => ['Rival One', 'Rival Two'],
});

describe('the bounded edge could carry the college coordinators unchanged', () => {
  it('matches coordinatorEdge at every rating, past both ends', () => {
    for (let r = 0; r <= 150; r += 0.5) {
      expect(gmBoundedEdge(r, STAFF_NEUTRAL, STAFF_EDGE_PER_POINT, STAFF_UNIT_EDGE_MAX)).toBeCloseTo(coordinatorEdge(r), 12);
    }
  });
  it('holds the cap on a value that is not a number', () => {
    expect(gmBoundedEdge(Number.NaN, 70, 0.12, 3)).toBe(0);
    expect(gmBoundedEdge(Infinity, 70, 0.12, 3)).toBe(0);
  });
});

describe('the scouting read', () => {
  it('is the front offices\' own draw with nobody in the job', () => {
    for (let i = 0; i < 900; i++) {
      const u = (i + 0.5) / 900;
      expect(gmScoutNoise(u, 1)).toBe(Math.floor(u * 9) - 4);
    }
  });
  it('tightens at every level, not just between the ends, on the whole number grade the game shows', () => {
    const us = Array.from({ length: 1800 }, (_, i) => (i + 0.5) / 1800);
    const meanMiss = (lv: number) => us.reduce((t, u) => t + Math.abs(gmScoutNoise(u, lv)), 0) / us.length;
    for (let lv = 1; lv < 10; lv++) {
      expect(gmScoutSpread(lv + 1)).toBeLessThan(gmScoutSpread(lv));
      /* Measured 0.185 a step; rounding the miss to the nearest would make level 2 the same as level 1. */
      expect(meanMiss(lv) - meanMiss(lv + 1)).toBeGreaterThan(0.09);
    }
    for (const u of us) expect(Number.isInteger(gmScoutNoise(u, 2))).toBe(true);
  });
  it('shows a band that holds every miss the scout can make, and narrows where the worst miss does', () => {
    const reach = [4, 4, 4, 3, 3, 3, 2, 2, 2, 1];
    for (let lv = 1; lv <= 10; lv++) {
      const band = gmScoutBand(75, lv);
      expect([band.lo, band.hi]).toEqual([75 - reach[lv - 1], 75 + reach[lv - 1]]);
      for (let i = 0; i < 900; i++) {
        const g = 75 + gmScoutNoise((i + 0.5) / 900, lv);
        expect(g >= band.lo && g <= band.hi).toBe(true);
      }
    }
  });
});

describe('effects stay between their two ends', () => {
  it('reads none at level 1 and on an empty desk, and never passes the cap on a corrupt save', () => {
    const e = { key: 'offEdge', none: 0, best: 2.25 };
    expect(gmEffectAt(e, 1)).toBe(0);
    expect(gmEffectAt(e, 99)).toBe(2.25);
    expect(gmEffectAt(e, -40)).toBe(0);
    expect(gmEffectAt(e, Number.NaN)).toBe(0);
    const blank = gmDefaultStaff(NFL_STAFF_PACK.rules, ctxFor('Blank Club'));
    const empty = { ...blank, hc: null, oc: null, dc: null, scouting: null, trainer: null } as GmStaffBlock<NflStaffPost>;
    expect(gmStaffEffect(NFL_STAFF_PACK, empty, 'offEdge')).toBe(0);
    const wild = { ...blank, hc: { ...blank.hc!, level: 99 }, oc: { ...blank.oc!, level: 99 } } as GmStaffBlock<NflStaffPost>;
    expect(gmStaffEffect(NFL_STAFF_PACK, wild, 'offEdge')).toBe(3);
  });
});

describe('Club Manager reads its numbers through the shared desk', () => {
  it('pays exactly what Round 471 paid at every level, today and in an era', () => {
    for (let lv = -1; lv <= 12; lv++) {
      expect(staffWage(lv, false)).toBe(Math.max(1, Math.round(3 + 2.1 * Math.max(1, Math.min(10, lv)))));
      expect(staffWage(lv, true)).toBe(Math.max(1, Math.round((3 + 2.1 * Math.max(1, Math.min(10, lv))) * 0.75)));
      expect(gmStaffWage(CM_STAFF_RULES, lv, 1)).toBe(staffWage(lv, false));
    }
  });
});

describe('a save', () => {
  it('without a desk, or with a mangled one, reads its day one people and nothing else moves', () => {
    const ctx = ctxFor('Old Save Club');
    const save = { money: 41, staff: { v: 1, hc: 'garbage' } as unknown };
    const read = gmStaffOf(NFL_STAFF_PACK.rules, save.staff, ctx);
    expect(gmIsValidStaff(NFL_STAFF_PACK.rules, read)).toBe(true);
    expect(read).toEqual(gmDefaultStaff(NFL_STAFF_PACK.rules, ctx));
    expect(gmStaffOf(NFL_STAFF_PACK.rules, undefined, ctx)).toEqual(read);
    expect(save.money).toBe(41);
  });
  it('never sees a rival come in for the head coach', () => {
    const ctx = ctxFor('Strong Club', 1);
    const block = gmDefaultStaff(NFL_STAFF_PACK.rules, ctx);
    for (const p of NFL_STAFF_PACK.posts) block[p.id] = { ...block[p.id]!, level: 10, potential: 10 };
    for (let week = 1; week <= 400; week++) {
      const ev = gmTickStaff(NFL_STAFF_PACK.rules, block, { ...ctx, week });
      expect(ev?.post).not.toBe('hc');
      block.poach = null;
    }
  });
});

describe('an approach on the desk', () => {
  it('goes with the man the GM pays off, in every pack and in Club Manager, and the desk does not reset', () => {
    for (const pack of GM_STAFF_PACKS) {
      const ctx = { owner: `${pack.id} sack`, world: 'now', season: 1, week: 1, money: 1, anchor: (post: string) => gmStatureAnchor(`${pack.id} sack`, post, 0.5), inHouse: 2, rivals: () => ['R'] };
      const base = gmDefaultStaff(pack.rules, ctx);
      for (const target of pack.posts.filter(p => !p.head)) {
        const block = { ...base, poach: { postId: target.id, club: 'R', weeksLeft: 2 } } as GmStaffBlock;
        expect(gmIsValidStaff(pack.rules, block)).toBe(true);
        const done = gmSackStaff(pack.rules, block, target.id, 1e9)!;
        expect(done.next.poach).toBeNull();
        expect(gmIsValidStaff(pack.rules, done.next)).toBe(true);
        expect(gmStaffOf(pack.rules, done.next, ctx).hires).toBe(base.hires + 1);
      }
    }
    const career = startCareer('Everton');
    const good = staffOf(career);
    const withPoach = { ...career, budget: 1e6, staff: { ...good, poach: { postId: 'attack' as const, club: 'Leeds United', weeksLeft: 2 } } };
    const after = sackStaff(withPoach, 'attack')!;
    expect(isValidStaff(after.staff)).toBe(true);
    expect(staffOf(after).poach).toBeNull();
    expect(staffOf(after).hires).toBe(good.hires + 1);
  });
  it('takes its man at the summer when nobody answered, on the once a season college desk too', () => {
    const r = CFB_STAFF_PACK.rules;
    const ctx = { owner: 'Summer U', world: 'now', season: 1, week: 1, money: 1, anchor: () => 8, inHouse: 2, rivals: () => ['State'] };
    const block = { ...gmDefaultStaff(r, ctx), poach: { postId: 'recruiting' as const, club: 'State', weeksLeft: 1 } };
    const man = block.recruiting!;
    const gone = gmSummerWalk(r, block)!;
    expect(gone).toMatchObject({ kind: 'walked', post: 'recruiting', club: 'State' });
    expect(gone.person).toBe(man);
    const next = gmRolloverStaff(r, block, { ...ctx, season: 2 });
    expect(next.recruiting).toBeNull();
    expect(next.poach).toBeNull();
    expect(gmIsValidStaff(r, next)).toBe(true);
    /* Club Manager's own summer is fixed by its fixture and keeps letting a pending approach lapse. */
    expect(gmSummerWalk(CM_STAFF_RULES, { ...staffOf(startCareer('Everton')), poach: { postId: 'attack' as const, club: 'Leeds United', weeksLeft: 1 } })).toBeNull();
  });
});

describe('the trainer', () => {
  const e = { key: 'injuryWeeks', none: 1, best: 0.75 };
  it('never clears a player in under a week, never keeps him out longer, and on average cuts what the tile says', () => {
    const rolls = Array.from({ length: 1000 }, (_, i) => (i + 0.5) / 1000);
    for (let lv = 1; lv <= 10; lv++) {
      let sum = 0;
      for (const roll of rolls) {
        const out = gmInjuryWeeks(3, e, lv, roll);
        expect(Number.isInteger(out) && out >= 1 && out <= 3).toBe(true);
        sum += out;
      }
      expect(sum / rolls.length).toBeCloseTo(3 * gmEffectAt(e, lv), 2);
    }
    expect(gmInjuryWeeks(2, { key: 'injuryWeeks', none: 1, best: 0 }, 10, 0.9)).toBe(1);
    expect(gmInjuryWeeks(0.4, e, 10)).toBe(0.4);
    expect(gmInjuryWeeks(Number.NaN, e, 10)).toBe(0);
  });
});

describe('every pack', () => {
  it('opens a valid desk for a small and a big owner', () => {
    for (const pack of GM_STAFF_PACKS) {
      for (const stature of [0, 1]) {
        const ctx = { owner: `${pack.id} owner`, world: 'now', season: 1, week: 1, money: 1, anchor: (post: string) => gmStatureAnchor(`${pack.id} owner`, post, stature), inHouse: 2, rivals: () => ['R'] };
        expect(gmIsValidStaff(pack.rules, gmDefaultStaff(pack.rules, ctx))).toBe(true);
      }
    }
  });
});

describe('the panel', () => {
  function Harness({ vacant }: { vacant: NflStaffPost | null }) {
    const ctx = ctxFor('Panel Club');
    const start = gmDefaultStaff(NFL_STAFF_PACK.rules, ctx);
    if (vacant) start[vacant] = null;
    const [state, setState] = useState({ block: start, purse: 8, line: '' });
    return createElement('div', null,
      createElement(GmStaffPanel<NflStaffPost>, {
        pack: NFL_STAFF_PACK, block: state.block, ctx, purse: state.purse,
        onChange: (block, purse, line) => setState({ block, purse, line }),
      }),
      createElement('p', { 'data-feed': true }, state.line));
  }

  it('shows one tile per post, opens a post with a back button, and explains itself behind ?', () => {
    const { container, getByText, getByLabelText } = render(createElement(Harness, { vacant: null }));
    const tiles = container.querySelectorAll('[data-gm-staff-post]');
    expect(tiles.length).toBe(NFL_STAFF_PACK.posts.length);
    fireEvent.click(container.querySelector('[data-gm-staff-post="oc"]')!);
    expect(container.querySelector('[data-gm-staff-open="oc"]')).not.toBeNull();
    expect(container.querySelector('[data-staff-effect="offEdge"]')!.textContent).toMatch(/rating points on the offense|No lift yet/);
    fireEvent.click(getByText('Back to the staff'));
    expect(container.querySelectorAll('[data-gm-staff-post]').length).toBe(NFL_STAFF_PACK.posts.length);
    fireEvent.click(getByLabelText('How the staff desk works'));
    expect(container.querySelector('[data-gm-staff-help]')!.textContent).toContain('Worked example');
    expect(container.textContent).not.toMatch(/[\u2013\u2014]/);
  });

  it('quotes an approach in the sport\'s words, with its deadline unit and the wage a match really pays', () => {
    const ctx = ctxFor('Poach Club');
    const block = { ...gmDefaultStaff(NFL_STAFF_PACK.rules, ctx), poach: { postId: 'oc' as const, club: 'Rival One', weeksLeft: 2 } };
    const { container } = render(createElement(GmStaffPanel<NflStaffPost>, { pack: NFL_STAFF_PACK, block, ctx, purse: 8, onChange: () => {} }));
    const card = container.querySelector('[data-gm-staff-poach="oc"]')!.textContent!;
    expect(card).toContain('Rival One want your offensive coordinator as their head coach');
    expect(card).toContain('answer within 2 weeks and before the season ends or he goes');
    expect(card).toContain(`Matching puts him on ${gmMatchedWage(NFL_STAFF_PACK.rules, block.oc!.wage)}k a week for good`);
  });

  it('hires off the shortlist into an empty chair and charges the quoted fee', () => {
    const { container, getAllByText } = render(createElement(Harness, { vacant: 'oc' }));
    fireEvent.click(container.querySelector('[data-gm-staff-post="oc"]')!);
    expect(container.querySelector('[data-gm-staff-shortlist="oc"]')).not.toBeNull();
    const effectLines = [...container.querySelectorAll('[data-staff-effect]')].map(n => n.textContent);
    expect(effectLines[0]).toBe(GM_STAFF_EMPTY_LINE);
    /* What the desk itself says the first man costs, worked out beside the screen. */
    const ctx = ctxFor('Panel Club');
    const start = gmDefaultStaff(NFL_STAFF_PACK.rules, ctx);
    start.oc = null;
    const pick = gmStaffShortlist(NFL_STAFF_PACK.rules, start, ctx, 'oc')[0];
    const done = gmHireStaff(NFL_STAFF_PACK.rules, start, ctx, 'oc', pick.person.id, 8)!;
    expect(done.purse).toBeCloseTo(8 - pick.fee, 10);
    fireEvent.click(getAllByText('Hire')[0]);
    const feed = container.querySelector('[data-feed]')!.textContent!;
    expect(feed).toBe(`${pick.person.name} is the new offensive coordinator, ${pick.fee}m to bring him in.`);
    expect(container.querySelector('[data-gm-staff-open]')).toBeNull();
    expect(container.querySelector('[data-gm-staff-post="oc"]')!.textContent).not.toContain('Nobody');
  });
});
