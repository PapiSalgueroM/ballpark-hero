/* Round 910: the shared staff desk, in unit form. scripts/simGmStaff.mjs is
   the harness (the Club Manager fixture, every pack, every level step); these
   are the promises a bind leans on, small enough to read at a glance. */
import { createElement, useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GM_STAFF_EMPTY_LINE, gmBoundedEdge, gmDefaultStaff, gmEffectAt, gmHireStaff, gmIsValidStaff, gmScoutBand,
  gmScoutNoise, gmScoutSpread, gmStaffEffect, gmStaffOf, gmStaffShortlist, gmStaffWage, gmStatureAnchor, gmTickStaff,
} from '@/lib/gmStaff';
import type { GmStaffBlock, GmStaffCtx } from '@/lib/gmStaff';
import { coordinatorEdge, STAFF_EDGE_PER_POINT, STAFF_NEUTRAL, STAFF_UNIT_EDGE_MAX } from '@/lib/collegeProgram';
import { CM_STAFF_RULES, staffWage } from '@/lib/clubManagerStaff';
import { GM_STAFF_PACKS, NFL_STAFF_PACK } from '@/data/gmStaff/packs';
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
  it('tightens at every level, not just between the ends', () => {
    for (let lv = 1; lv < 10; lv++) {
      expect(gmScoutSpread(lv + 1)).toBeLessThan(gmScoutSpread(lv));
      expect(Math.abs(gmScoutNoise(0.01, lv + 1))).toBeLessThan(Math.abs(gmScoutNoise(0.01, lv)));
    }
    expect(gmScoutBand(75, 1)).toMatchObject({ lo: 71, hi: 79 });
    expect(gmScoutBand(75, 10)).toMatchObject({ lo: 74, hi: 76 });
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
