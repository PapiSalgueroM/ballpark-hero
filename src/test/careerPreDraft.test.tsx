/**
 * Round 914: the road to the draft, one engine for the four US careers.
 *
 * The pick decides the team, the descriptors carry each sport's verified
 * rules (docs/audits/US-PRE-DRAFT-RULES-2026-10.md), every card prints what
 * it applies, growth respects the ceiling, and a corrupt save block resets
 * that block alone. The distribution checks (median pick by stock decile,
 * lottery frequencies) live in scripts/simCareerPreDraft.mjs.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { PreDraftSeasonCard } from '@/components/career/PreDraftSeasonCard';
import { DraftShowcaseCard } from '@/components/career/DraftShowcaseCard';
import {
  loadPreDraft, preDraftChoicePool, preDraftChoose, preDraftEffectText, preDraftEffectiveEffect,
  preDraftOrder, preDraftPlaySeason, preDraftRunDraft, preDraftShowcase, preDraftStart,
  SKIP_DELTA, type PreDraftDescriptor, type PreDraftState,
} from '@/lib/careerPreDraft';
import { nflPreDraftDescriptor } from '@/lib/nflCareerPreDraft';
import { nbaPreDraftDescriptor } from '@/lib/nbaCareerPreDraft';
import { mlbPreDraftDescriptor, MLB_MINOR_LEVELS } from '@/lib/mlbCareerPreDraft';
import { nhlPreDraftDescriptor } from '@/lib/nhlCareerPreDraft';

const ALL: PreDraftDescriptor[] = [
  nflPreDraftDescriptor('now'), nflPreDraftDescriptor('y2005'),
  nbaPreDraftDescriptor('now'), nbaPreDraftDescriptor('y2004'),
  mlbPreDraftDescriptor('now'), mlbPreDraftDescriptor('y2004'),
  nhlPreDraftDescriptor('now'), nhlPreDraftDescriptor('y2006'),
];

/** Plays a whole road, always taking option `opt` and the given approach. */
function road(desc: PreDraftDescriptor, seed: string, routeId: string, rating = 68, opt = 0, approach: 'allout' | 'steady' | 'skip' = 'steady'): PreDraftState {
  let s = preDraftStart(desc, { seed, routeId, rating, pot: rating + 12 });
  for (let guard = 0; guard < 20 && s.phase !== 'showcase'; guard += 1) {
    s = s.phase === 'season' ? preDraftPlaySeason(desc, s) : preDraftChoose(desc, s, opt);
  }
  s = preDraftShowcase(desc, s, approach);
  return preDraftRunDraft(desc, s);
}

describe('the descriptors carry the verified rules', () => {
  it('rounds per sport and era', () => {
    expect(ALL.map(d => `${d.sport}:${d.eraId}:${d.rounds}`)).toEqual([
      'nfl:now:7', 'nfl:y2005:7', 'nba:now:2', 'nba:y2004:2', 'mlb:now:20', 'mlb:y2004:50', 'nhl:now:7', 'nhl:y2006:7',
    ]);
  });
  it('the NBA lottery is the non playoff teams, sixteen make the playoffs', () => {
    for (const d of [nbaPreDraftDescriptor('now'), nbaPreDraftDescriptor('y2004')]) {
      expect(d.lottery).not.toBeNull();
      expect(d.teamIds().length - d.lottery!.teams).toBe(16);
      expect(d.lottery!.combos.length).toBe(d.lottery!.teams);
      expect(d.lottery!.combos.reduce((a, b) => a + b, 0)).toBe(1000);
    }
    expect(nbaPreDraftDescriptor('now').lottery!.drawn).toBe(4);
    expect(nbaPreDraftDescriptor('y2004').lottery!.drawn).toBe(3);
  });
  it('straight from high school is a 2003-04 road only', () => {
    expect(nbaPreDraftDescriptor('y2004').routes.some(r => r.id === 'prep')).toBe(true);
    expect(nbaPreDraftDescriptor('now').routes.some(r => r.id === 'prep')).toBe(false);
  });
  it('no other sport has a lottery here, and every route is one to three seasons', () => {
    for (const d of ALL) {
      if (d.sport !== 'nba') expect(d.lottery).toBeNull();
      for (const r of d.routes) { expect(r.seasons).toBeGreaterThanOrEqual(1); expect(r.seasons).toBeLessThanOrEqual(3); }
    }
  });
});

describe('the pick decides the team', () => {
  it('a drafted player joins the team that holds his pick, in every sport and era', () => {
    for (const d of ALL) {
      for (let i = 0; i < 40; i += 1) {
        const s = road(d, `t${i}`, d.routes[i % d.routes.length].id, 60 + (i % 16));
        const out = s.draft!;
        expect(s.phase).toBe('done');
        if (out.pick !== null) {
          expect(out.team).toBe(preDraftOrder(d, `t${i}`).order[out.pick - 1]);
          expect(out.round).toBe(Math.ceil(out.pick / d.teamIds().length));
        } else {
          expect(d.teamIds()).toContain(out.team);
        }
      }
    }
  });
  it('the order has rounds times teams picks and every round holds every team once', () => {
    for (const d of ALL) {
      const { order } = preDraftOrder(d, 'ord');
      const n = d.teamIds().length;
      expect(order.length).toBe(n * d.rounds);
      for (let r = 0; r < d.rounds; r += 1) expect(new Set(order.slice(r * n, (r + 1) * n)).size).toBe(n);
    }
  });
  it('the same seed replays the same road, another seed does not', () => {
    const d = nflPreDraftDescriptor('now');
    expect(road(d, 'same', 'power')).toEqual(road(d, 'same', 'power'));
    const picks = new Set(Array.from({ length: 12 }, (_, i) => road(d, `x${i}`, 'power').draft!.pick));
    expect(picks.size).toBeGreaterThan(3);
  });
  it('the age at the draft is the route start age plus its seasons', () => {
    for (const d of ALL) for (const r of d.routes) {
      expect(road(d, 'age', r.id).draft!.ageAtDraft).toBe(r.startAge + r.seasons);
    }
  });
});

describe('cards print what they apply', () => {
  it('every option, from every card, on a mid and an edge state', () => {
    for (const d of ALL) {
      const base = preDraftStart(d, { seed: 'c', routeId: d.routes[0].id, rating: 70, pot: 72 });
      const edges: PreDraftState[] = [base, { ...base, stock: 98, health: 95, rating: 72 }, { ...base, stock: 1, health: 5 }];
      for (const card of preDraftChoicePool(d)) for (let k = 0; k < card.options.length; k += 1) for (const st of edges) {
        const s = { ...st, phase: 'choice' as const, pendingChoice: card.id };
        const eff = preDraftEffectiveEffect(s, card.options[k].effect);
        const after = preDraftChoose(d, s, k);
        expect(after.stock - s.stock).toBe(eff.stock ?? 0);
        expect(after.rating - s.rating).toBe(eff.rating ?? 0);
        expect(after.health - s.health).toBe(eff.health ?? 0);
        expect(after.rating).toBeLessThanOrEqual(Math.max(s.pot, s.rating));
        expect(preDraftEffectText(eff)).toMatch(eff.stock || eff.rating || eff.health ? /[+-]\d/ : /No change/);
      }
    }
  });
  it('skipping the showcase costs exactly what it says', () => {
    const d = mlbPreDraftDescriptor('now');
    let s = preDraftStart(d, { seed: 'sk', routeId: 'hs', rating: 68, pot: 80 });
    s = { ...s, phase: 'showcase', stock: 50 };
    expect(preDraftShowcase(d, s, 'skip').stock).toBe(50 + SKIP_DELTA);
  });
  it('going all out never moves the stock less than playing it safe on the same drill', () => {
    const d = nhlPreDraftDescriptor('now');
    for (let i = 0; i < 30; i += 1) {
      const s = { ...preDraftStart(d, { seed: `sc${i}`, routeId: 'junior', rating: 60 + i % 15, pot: 90 }), phase: 'showcase' as const, stock: 50 };
      const a = preDraftShowcase(d, s, 'allout').showcase!;
      const b = preDraftShowcase(d, s, 'steady').showcase!;
      expect(a.grade).toBe(b.grade);
      expect(Math.abs(a.stockDelta)).toBeGreaterThan(Math.abs(b.stockDelta));
    }
  });
});

describe('growth, money and the seasons after the draft', () => {
  it('no step ever lifts the rating past the ceiling', () => {
    for (const d of ALL) for (let i = 0; i < 20; i += 1) {
      const s = road(d, `g${i}`, d.routes[i % d.routes.length].id, 66 + (i % 8), 0);
      expect(s.rating).toBeLessThanOrEqual(s.pot);
      expect(s.draft!.ratingAfter).toBeLessThanOrEqual(s.pot);
    }
  });
  it('MLB quotes a slot only for the verified picks of the modern draft', () => {
    const now = mlbPreDraftDescriptor('now');
    const then = mlbPreDraftDescriptor('y2004');
    expect(now.slotValue!(1)).toBe(11350600);
    expect(now.slotValue!(25)).toBe(3696000);
    expect(now.slotValue!(26)).toBeNull();
    expect(then.slotValue).toBeUndefined();
    expect(then.bonusLine!(1)).not.toMatch(/\$/);
    expect(now.bonusLine!(301)).toMatch(/150,000/);
  });
  it('MLB plays one to three minor league seasons climbing to Triple-A; NHL one to three back on its route', () => {
    const lengths = new Set<number>();
    for (const d of [mlbPreDraftDescriptor('now'), mlbPreDraftDescriptor('y2004')]) for (let i = 0; i < 20; i += 1) {
      const out = road(d, `m${i}`, 'college', 60 + i).draft!;
      const dev = out.devSeasons;
      expect(dev.length).toBeGreaterThanOrEqual(1);
      expect(dev.length).toBeLessThanOrEqual(3);
      lengths.add(dev.length);
      /* Every step of the climb, not only the top: n seasons are the last n
         rungs of the ladder in order, one rung a season, a year older each. */
      expect(dev.map(x => x.level)).toEqual(MLB_MINOR_LEVELS.slice(MLB_MINOR_LEVELS.length - dev.length));
      dev.forEach((x, k) => expect(x.age).toBe(out.ageAtDraft + k));
      if (out.pick === null) expect(dev[0].level).toBe('A ball');
    }
    expect([...lengths].sort()).toEqual([1, 2, 3]);
  });
  it('an undrafted MLB player starts in A ball, as his line says', () => {
    const d = mlbPreDraftDescriptor('now');
    let undrafted = 0;
    for (let i = 0; i < 12; i += 1) {
      /* Rating 80 alone would climb one or two rungs if drafted. */
      const s = { ...preDraftStart(d, { seed: `u${i}`, routeId: 'college', rating: 80, pot: 90 }), phase: 'draft' as const, stock: 0, showcase: { approach: 'skip' as const, drill: '', grade: null, stockDelta: -2 } };
      const out = preDraftRunDraft(d, s).draft!;
      if (out.pick !== null) continue;
      undrafted += 1;
      expect(out.devSeasons.map(x => x.level)).toEqual(['A ball', 'Double-A', 'Triple-A']);
    }
    expect(undrafted).toBeGreaterThan(5);
    expect(d.undraftedLine).toMatch(/A ball/);
  });
  it('MLB and NHL lines are rates, never a games or innings count', () => {
    for (const d of [mlbPreDraftDescriptor('now'), mlbPreDraftDescriptor('y2004'), nhlPreDraftDescriptor('now'), nhlPreDraftDescriptor('y2006')]) {
      for (let i = 0; i < 12; i += 1) {
        const s = road(d, `r${i}`, d.routes[i % d.routes.length].id, 64 + i);
        const labels = [...s.lines, ...s.draft!.devSeasons].flatMap(x => x.stats.map(st => st.label));
        expect(labels.length).toBeGreaterThan(0);
        for (const l of labels) expect(['G', 'GP', 'Games', 'IP', 'K', 'HR', 'RBI', 'PTS']).not.toContain(l);
      }
    }
  });
  it('the NHL combine names no on ice drill', () => {
    for (const d of [nhlPreDraftDescriptor('now'), nhlPreDraftDescriptor('y2006')]) {
      for (const x of d.drills) expect(x).not.toMatch(/skat/i);
    }
  });
  it('NHL development seasons stay on the route', () => {
    const nhl = nhlPreDraftDescriptor('y2006');
    const dev = road(nhl, 'h', 'college').draft!.devSeasons;
    expect(dev.every(x => x.level === 'NCAA college hockey')).toBe(true);
    expect(road(nflPreDraftDescriptor('now'), 'n', 'power').draft!.devSeasons).toEqual([]);
  });
});

describe('the save block', () => {
  const d = nbaPreDraftDescriptor('now');
  const done = road(d, 'save', 'one');
  it('a finished block round trips', () => {
    expect(loadPreDraft(JSON.parse(JSON.stringify(done)))).toEqual(done);
  });
  it('a save from before Round 914 has no block and reads as none', () => {
    expect(loadPreDraft(undefined)).toBeNull();
    expect(loadPreDraft(null)).toBeNull();
  });
  it('a corrupt block resets that block alone', () => {
    expect(loadPreDraft({ ...done, v: 2 })).toBeNull();
    expect(loadPreDraft({ ...done, sport: 'cricket' })).toBeNull();
    expect(loadPreDraft({ ...done, stock: 'high' })).toBeNull();
    expect(loadPreDraft({ ...done, phase: 'lunch' })).toBeNull();
    expect(loadPreDraft({ ...done, draft: null })).toBeNull();
    expect(loadPreDraft({ ...done, choicesSeen: [1] })).toBeNull();
    expect(loadPreDraft('[]')).toBeNull();
  });
  it('a block the cards cannot draw resets, down to the elements', () => {
    const mlb = mlbPreDraftDescriptor('now');
    const mlbDone = road(mlb, 'deep', 'college');
    expect(mlbDone.draft!.devSeasons.length).toBeGreaterThan(0);
    const mid: PreDraftState = { ...preDraftPlaySeason(d, preDraftStart(d, { seed: 'mid', routeId: 'three', rating: 70, pot: 80 })) };
    expect(mid.phase).toBe('choice');
    const bad: unknown[] = [
      { ...done, lines: [{}] },
      { ...done, lines: [{ ...done.lines[0], stats: [{ label: 'PPG' }] }] },
      { ...done, lines: [{ ...done.lines[0], stats: null }] },
      { ...mlbDone, draft: { ...mlbDone.draft!, devSeasons: [{}] } },
      { ...done, draft: { ...done.draft!, team: 7 } },
      { ...done, draft: { ...done.draft!, pick: 3, round: null } },
      { ...done, showcase: null },
      { ...done, showcase: { approach: 'allout', drill: 'Max vertical', grade: 'Z', stockDelta: 4 } },
      { ...done, phase: 'draft' },
      { ...done, phase: 'draft', draft: {} },
      { ...mid, pendingChoice: null },
      { ...mid, pendingChoice: 4 },
      { ...mid, phase: 'season' },
      { ...mid, draft: {} },
    ];
    for (const b of bad) expect(loadPreDraft(b)).toBeNull();
    /* A good mid road block still loads, with and without the descriptor. */
    expect(loadPreDraft(JSON.parse(JSON.stringify(mid)))).toEqual(mid);
    expect(loadPreDraft(JSON.parse(JSON.stringify(mid)), d)).toEqual(mid);
    expect(loadPreDraft(JSON.parse(JSON.stringify(mlbDone)), mlb)).toEqual(mlbDone);
  });
  it('with the descriptor: another sport, era or route resets, a card no longer dealt is dropped', () => {
    const mid = preDraftPlaySeason(d, preDraftStart(d, { seed: 'mid', routeId: 'three', rating: 70, pot: 80 }));
    expect(loadPreDraft(mid, nflPreDraftDescriptor('now'))).toBeNull();
    expect(loadPreDraft(mid, nbaPreDraftDescriptor('y2004'))).toBeNull();
    expect(loadPreDraft({ ...mid, routeId: 'prep' }, d)).toBeNull();
    const healed = loadPreDraft({ ...mid, pendingChoice: 'retired_card' }, d)!;
    expect(healed.phase).toBe('season');
    expect(healed.pendingChoice).toBeNull();
    let finalChoice = mid;
    while (finalChoice.seasonsDone < 3) finalChoice = preDraftPlaySeason(d, preDraftChoose(d, finalChoice, 0));
    expect(finalChoice.phase).toBe('choice');
    const last = loadPreDraft({ ...finalChoice, pendingChoice: 'retired_card' }, d)!;
    expect(last.phase).toBe('showcase');
    /* The healed block draws a button to press. */
    const { getAllByRole, unmount } = render(<PreDraftSeasonCard desc={d} state={healed} onPlaySeason={() => {}} onChoose={() => {}} />);
    expect(getAllByRole('button').length).toBeGreaterThan(0);
    unmount();
  });
  it('meters out of range come back clamped', () => {
    expect(loadPreDraft({ ...done, stock: 140, health: -9 })!.stock).toBe(100);
    expect(loadPreDraft({ ...done, stock: 140, health: -9 })!.health).toBe(0);
  });
});

describe('the cards on screen', () => {
  afterEach(() => cleanup());
  it('the season card prints each option with the numbers the choice applies', () => {
    for (const d of ALL) {
      let s = preDraftStart(d, { seed: 'ui', routeId: d.routes[0].id, rating: 70, pot: 71 });
      s = preDraftPlaySeason(d, s);
      if (s.phase !== 'choice') continue;
      const { getAllByTestId, unmount } = render(<PreDraftSeasonCard desc={d} state={s} onPlaySeason={() => {}} onChoose={() => {}} />);
      const card = preDraftChoicePool(d).find(c => c.id === s.pendingChoice)!;
      const shown = getAllByTestId('pre-draft-effect').map(e => e.textContent);
      expect(shown).toEqual(card.options.map(o => preDraftEffectText(preDraftEffectiveEffect(s, o.effect))));
      unmount();
    }
  });
  it('the showcase prints the table it applies, and the result names the pick holder', () => {
    const d = nbaPreDraftDescriptor('y2004');
    const s0 = { ...preDraftStart(d, { seed: 'show', routeId: 'prep', rating: 74, pot: 90 }), phase: 'showcase' as const };
    const { getAllByTestId, unmount } = render(<DraftShowcaseCard desc={d} state={s0} onShowcase={() => {}} onRunDraft={() => {}} />);
    expect(getAllByTestId('approach-promise').map(e => e.textContent)).toEqual(['Grade A +10, B +4, C -3, D -8', 'Grade A +5, B +2, C -1, D -3', `Draft stock ${SKIP_DELTA}`]);
    unmount();
    /* Near the top and bottom of the meter the card prints the clamped move,
       and the showcase applies exactly that move. */
    for (const stock of [97, 1]) {
      const edge = { ...s0, stock };
      const r = render(<DraftShowcaseCard desc={d} state={edge} onShowcase={() => {}} onRunDraft={() => {}} />);
      const printed = r.getAllByTestId('approach-promise').map(e => e.textContent);
      expect(printed).toEqual(stock === 97
        ? ['Grade A +3, B +3, C -3, D -8', 'Grade A +3, B +2, C -1, D -3', 'Draft stock -2']
        : ['Grade A +10, B +4, C -1, D -1', 'Grade A +5, B +2, C -1, D -1', 'Draft stock -1']);
      r.unmount();
      for (const a of ['allout', 'steady'] as const) {
        const sc = preDraftShowcase(d, edge, a).showcase!;
        expect(printed[a === 'allout' ? 0 : 1]).toContain(`${sc.grade} ${sc.stockDelta >= 0 ? '+' : ''}${sc.stockDelta}`);
      }
      expect(preDraftShowcase(d, edge, 'skip').stock - stock).toBe(stock === 97 ? -2 : -1);
    }
    /* Stock 100 is always the first pick (preDraftBoardRank), and stock 0
       goes undrafted on most seeds, so both branches are drawn every run. */
    const shown = preDraftShowcase(d, s0, 'allout');
    const top = preDraftRunDraft(d, { ...shown, stock: 100 });
    expect(top.draft!.pick).toBe(1);
    const a = render(<DraftShowcaseCard desc={d} state={top} onShowcase={() => {}} onRunDraft={() => {}} />);
    expect(a.getByTestId('draft-result').textContent).toContain(`${d.teamLabel(preDraftOrder(d, 'show').order[0])} hold the pick`);
    a.unmount();
    const none = Array.from({ length: 10 }, (_, i) => preDraftRunDraft(d, { ...shown, seed: `show${i}`, stock: 0 })).find(x => x.draft!.pick === null)!;
    expect(none).toBeDefined();
    const b = render(<DraftShowcaseCard desc={d} state={none} onShowcase={() => {}} onRunDraft={() => {}} />);
    const text = b.getByTestId('draft-result').textContent ?? '';
    expect(text).toContain('Undrafted');
    expect(text).toContain(d.undraftedLine);
    expect(text).toContain(d.teamLabel(none.draft!.team));
  });
});
