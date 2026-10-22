/**
 * Round 1540: the earned draft night on the real NBA board (brief 1540 3.8 B, with critic 1540's corrections).
 * Every save is a closed season built by construction (records set, a real postseason, the champion pushed) with
 * the GM desk on; Math.random is a seeded Lehmer stream. The cases: (a) from the recap, the chances first and no
 * spoiler, Continue to his slot, his picks, the summer and the hub; (b) a draft already open with no night keeps the
 * old draft; (c) he holds pick 1, and pick 60; (d) he holds no pick, and an emptied class; (e) a traded first and a
 * bought first; (f) a night broken mid draft finishes the old way; (g) reloads at the card and on the clock;
 * (h) two presses in one act; (i) the heading "?" over the stage; (j) every slot used and the summer not run;
 * (k) abandoning the franchise. A summer the desk refuses cannot be built from the engine (runDeskOffseason ends
 * every man's case before it checks), so (j) plants the state such a refusal leaves.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { initNbaLeague, runNbaPlayoffs, NBA_ROUNDS, type NbaLeague, type SeriesResult } from '@/lib/nbaFrontOffice';
import { nbaPicksOf, openNbaDesk, syncNbaPicks } from '@/lib/nbaGmDesk';
import { withGmBlock, type GmDesk } from '@/lib/gmDesk';
import { movePicks, pickKey } from '@/lib/gmEarnedDraft';
import {
  NBA_DRAFT_BLOCK, nbaDraftByStaff, nbaDraftChances, nbaDraftHeading, nbaDraftNightOf, nbaEarnedDraftClass, openNbaDraftNight,
  ordinal, type GmDraftNight,
} from '@/lib/nbaEarnedDraft';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';

vi.setConfig({ testTimeout: 180_000 });

/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY = 'nba-front-office-save-v1';
const saved = (): any => JSON.parse(localStorage.getItem(KEY) ?? 'null');
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
function lehmer(seed: number): (() => number) & { calls: () => number } {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  let calls = 0;
  const draw = () => { calls += 1; s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  return Object.assign(draw, { calls: () => calls });
}
const realRandom = Math.random;
let draws = lehmer(1);
beforeEach(() => { localStorage.clear(); draws = lehmer(4242); Math.random = draws; });
afterEach(() => { cleanup(); Math.random = realRandom; });

interface Built { save: any; league: NbaLeague; series: SeriesResult[]; me: string; ids: string[]; order: GmDraftNight['order'] }
/** A closed season: ids[0] has the worst record, ids[29] the best; the GM's club is picked from the ids; `moves`
    move picks of this draft on the desk's ledger and the engine's lists, the way a deal does, before the night. */
function closedSave(seed: number, pickMe: (ids: string[]) => string, moves: (b: { me: string; order: GmDraftNight['order']; ids: string[] }) => [number, string, string][] = () => []): Built {
  const rng = lehmer(seed);
  const league = initNbaLeague(rng);
  const ids = Object.keys(league.teams).sort();
  ids.forEach((id, i) => { league.teams[id].wins = 26 + i; league.teams[id].losses = 56 - i; });
  league.round = NBA_ROUNDS;
  const { series, champion } = runNbaPlayoffs(league, rng);
  league.champions.push({ season: league.season, team: champion });
  const me = pickMe(ids);
  const order = openNbaDraftNight(openNbaDesk(clone(league), me), clone(league), series, me)!.night.order;
  let gm: GmDesk = openNbaDesk(league, me);
  let ledger = nbaPicksOf(gm, league);
  for (const [round, orig, to] of moves({ me, order, ids })) ledger = movePicks(ledger, [pickKey({ year: league.season, round, orig })], to);
  syncNbaPicks(league, ledger);
  gm = withGmBlock(gm, 'picks', ledger);
  const save = { league, myTeam: me, phase: 'recap', titles: 0, seasonsPlayed: 1, draftClass: null, picksLeft: 0, postseason: { series, champion, gradeLine: null }, gm };
  return { save, league, series, me, ids, order };
}
const mount = (save: any) => { localStorage.setItem(KEY, JSON.stringify(save)); return render(<NbaFrontOfficeBoard />); };
const night = (): GmDraftNight => { const s = saved(); return nbaDraftNightOf(s.gm, s.league)!; };
const goToDraft = async () => {
  const go = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Go to the draft')!;
  expect(go).toBeTruthy();
  fireEvent.click(go);
  await waitFor(() => expect(document.querySelector('[data-gm-lottery]')).toBeTruthy());
};
const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const press = (sel: string) => { const n = $(sel); expect(n, sel).toBeTruthy(); fireEvent.click(n!); };
const headingLines = () => [...document.querySelectorAll('[data-gm-draft-lines] p')].map(p => p.textContent);
const toHub = () => { press($('[data-draft-continue]') ? '[data-draft-continue]' : '[data-gm-draft-leave]'); };
/** The board's own words outside the lottery card and the chances, where nothing may say where his picks landed. */
const ownText = (): string => {
  const copy = document.body.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[data-gm-lottery], [data-gm-draft-chances], [data-gm-panel-loading]').forEach(n => n.remove());
  return copy.textContent ?? '';
};
const spoils = (text: string, overall: number): boolean => new RegExp(`\\b${ordinal(overall)}\\b|\\bat ${overall}\\b|\\bpick ${overall}\\b`, 'i').test(text);

describe('the earned draft night on the NBA board', () => {
  it('(a) from the recap: the chances first and no spoiler, Continue to his slot, his two picks, the summer, the hub', async () => {
    const b = closedSave(11, ids => ids[2]);
    mount(b.save);
    await goToDraft();
    const n = night();
    expect(n.seen).toBe(false);
    expect([...document.querySelectorAll('[data-gm-draft-chances] p')].map(p => p.textContent)).toEqual(nbaDraftChances(n, b.me));
    const seed = n.order.lottery!.field.find(f => f.club === b.me)!.seed;
    expect($('[data-gm-draft-chances] p')!.textContent).toMatch(new RegExp(`^Your club goes in seeded ${ordinal(seed)} of 14\\. By the table it has a `));
    const mine = n.slots.filter(s => s.holder === b.me).map(s => s.overall);
    expect(mine).toHaveLength(2);
    for (const o of mine) expect(spoils(ownText(), o), `pick ${o} is given away before Continue`).toBe(false);
    expect(spoils(ownText(), 999)).toBe(false);
    press('[data-lottery-continue]');
    expect(night().made).toBe(mine[0] - 1);
    expect(headingLines()).toContain(`You are on the clock at ${mine[0]}.`);
    if (mine[0] > 1) expect($('[data-draft-night]')).toBeTruthy();
    /* The scan sees a landed slot once the night may say it: the heading now reads "You pick ...". */
    for (const o of mine) expect(spoils(ownText(), o)).toBe(true);
    press('[data-gm-draft-choice]');
    expect(night().made).toBe(mine[1] - 1);
    expect(headingLines()).toContain(`You are on the clock at ${mine[1]}.`);
    /* His pick's feed line, in the old path's words (the summer's lines replace the feed after the last pick, as on
       the old path). */
    expect(document.body.textContent).toMatch(/📥 Drafted .+ \([GFC]\), true rating \d+ vs scouted \d+\./);
    press('[data-gm-draft-choice]');
    const end = saved();
    expect(end.phase).toBe('hub');
    expect(end.league.season).toBe(b.league.season + 1);
    expect($('[data-gm-earned-draft]')!.getAttribute('data-gm-earned-draft')).toBe('over');
    toHub();
    expect($('[data-gm-earned-draft]')).toBeNull();
  });

  it('(b) a draft already open with the desk on and no night finishes the old way; a night planted there takes over', async () => {
    const b = closedSave(12, ids => ids[20]);
    const cls = nbaEarnedDraftClass(lehmer(5), 20, new Set()).slice(0, 24);
    const open = { ...b.save, phase: 'draft', draftClass: cls, picksLeft: 2, draftAiBatchesLeft: 2 };
    mount(open);
    expect($('[data-gm-earned-draft]')).toBeNull();
    expect($('.grid.max-h-96')).toBeTruthy();
    cleanup();
    localStorage.clear();
    const planted = openNbaDraftNight(open.gm, clone(b.league), b.series, b.me)!;
    mount({ ...open, gm: planted.desk });
    expect($('[data-gm-earned-draft]')).toBeTruthy();
  });

  it('(c) he holds pick 1: no run card and on the clock at 1; he holds only pick 60: on the clock at 60 after 59 picks', async () => {
    const top = closedSave(13, ids => ids[20], ({ me, order }) => (order.first[0] === me ? [] : [[1, order.first[0], me]]));
    mount(top.save);
    await goToDraft();
    press('[data-lottery-continue]');
    expect($('[data-draft-night]')).toBeNull();
    expect(headingLines()).toContain('You are on the clock at 1.');
    press('[data-gm-draft-staff]');
    expect(saved().phase).toBe('hub');
    cleanup();
    localStorage.clear();
    const last = closedSave(14, ids => ids[20], ({ me, order, ids }) => {
      const end = order.later[order.later.length - 1];
      const away = ids.find(c => c !== me && c !== end)!;
      return [[1, me, away], [2, me, away], [2, end, me]];
    });
    mount(last.save);
    await goToDraft();
    expect(night().slots.filter(s => s.holder === last.me).map(s => s.overall)).toEqual([60]);
    press('[data-lottery-continue]');
    expect(night().made).toBe(59);
    expect(headingLines()).toContain('You are on the clock at 60.');
    expect($('[data-draft-night]')!.textContent).toContain('Picks 1 to 59 are in.');
    press('[data-gm-draft-choice]');
    expect(saved().phase).toBe('hub');
  });

  it('(d) no pick: Continue runs every slot and the summer; with the class emptied every slot passes and the screen draws its own way out', async () => {
    const away = ({ me, ids }: { me: string; ids: string[] }): [number, string, string][] => [[1, me, ids.find(c => c !== me)!], [2, me, ids.find(c => c !== me)!]];
    const b = closedSave(15, ids => ids[4], away);
    mount(b.save);
    await goToDraft();
    expect(night().slots.some(s => s.holder === b.me)).toBe(false);
    press('[data-lottery-continue]');
    expect(saved().phase).toBe('hub');
    expect(saved().league.season).toBe(b.league.season + 1);
    expect($('[data-gm-earned-draft]')!.getAttribute('data-gm-earned-draft')).toBe('over');
    expect($('[data-draft-continue]')).toBeTruthy();
    cleanup();
    localStorage.clear();
    const e = closedSave(16, ids => ids[4], away);
    mount(e.save);
    await goToDraft();
    const emptied = { ...saved(), draftClass: [] };
    cleanup();
    mount(emptied);
    await waitFor(() => expect($('[data-lottery-continue]')).toBeTruthy());
    press('[data-lottery-continue]');
    expect(saved().phase).toBe('hub');
    expect($('[data-draft-night]')).toBeNull();
    expect($('[data-gm-draft-leave]')!.textContent).toBe('Continue to the hub');
  });

  it('(e) a first he traded away is used by the club that holds it, one he bought is his at that club\'s place', async () => {
    const b = closedSave(17, ids => ids[2], ({ me, ids }) => [[1, me, ids[25]], [1, ids[5], me]]);
    mount(b.save);
    await goToDraft();
    expect($('[data-gm-draft-chances]')!.textContent).toContain('wherever it lands');
    expect($('[data-gm-draft-chances]')!.textContent).toContain('You also hold');
    press('[data-lottery-continue]');
    const n = night();
    expect(headingLines()).toEqual(nbaDraftHeading(n, b.me));
    expect(n.slots.find(s => s.round === 1 && s.orig === b.me)!.holder).toBe(b.ids[25]);
    expect(n.slots.find(s => s.round === 1 && s.orig === b.ids[5])!.holder).toBe(b.me);
    expect(headingLines().some(l => /^Your club's own first, \d+(st|nd|rd|th), is /.test(l ?? ''))).toBe(true);
    expect(headingLines().some(l => /^You hold .* first, \d+(st|nd|rd|th)\.$/.test(l ?? ''))).toBe(true);
  });

  it('(f) a night broken mid draft, at each field, finishes the old way with the rivals\' batches', async () => {
    for (const [i, breakIt] of [(x: any) => { x.made = 999; }, (x: any) => { x.slots = 'x'; }, (x: any) => { x.order = {}; }, (x: any) => { x.year = 1999; }].entries()) {
      localStorage.clear();
      const b = closedSave(30 + i, ids => ids[20]);
      mount(b.save);
      await goToDraft();
      press('[data-lottery-continue]');
      const s = saved();
      breakIt(s.gm.blocks[NBA_DRAFT_BLOCK]);
      cleanup();
      mount(s);
      expect($('[data-gm-earned-draft]'), `break ${i}`).toBeNull();
      for (let k = 0; k < 6 && saved().phase !== 'hub'; k += 1) {
        const choice = document.querySelector('.grid.max-h-96 button') as HTMLElement | null;
        const finish = [...document.querySelectorAll('button')].find(x => x.textContent?.trim() === 'Finish draft and offseason');
        fireEvent.click((choice ?? finish)!);
      }
      expect(saved().phase, `break ${i}`).toBe('hub');
      expect(saved().league.season).toBe(b.league.season + 1);
      cleanup();
    }
  });

  it('(g) a reload at the card draws its last frame with Continue live; a reload on the clock is the same slot and class with no draw', async () => {
    const b = closedSave(18, ids => ids[1]);
    mount(b.save);
    await goToDraft();
    expect($('[data-lottery-settled]')).toBeNull();
    cleanup();
    const atCard = draws.calls();
    mount(saved());
    await waitFor(() => expect($('[data-lottery-settled]')).toBeTruthy());
    expect($('[data-lottery-continue]')).toBeTruthy();
    expect(draws.calls()).toBe(atCard);
    press('[data-lottery-continue]');
    press('[data-gm-draft-choice]');
    const between = saved();
    const line = headingLines().find(l => l?.startsWith('You are on the clock at'));
    expect(line).toBeTruthy();
    cleanup();
    const before = draws.calls();
    mount(between);
    expect(draws.calls()).toBe(before);
    expect(headingLines()).toContain(line);
    expect(saved().draftClass).toEqual(between.draftClass);
    expect($('[data-gm-lottery]')).toBeNull();
  });

  it('(h) two presses in one act are one effect each: one class, one Continue, one pick, one summer', async () => {
    const b = closedSave(19, ids => ids[3]);
    mount(b.save);
    const go = [...document.querySelectorAll('button')].find(x => x.textContent?.trim() === 'Go to the draft')!;
    const writes: string[] = [];
    const set = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) { if (k === KEY) writes.push(v); return set.call(this, k, v); });
    act(() => { go.click(); go.click(); });
    expect(writes).toHaveLength(1);
    await waitFor(() => expect($('[data-gm-lottery]')).toBeTruthy());
    const mine = night().slots.filter(s => s.holder === b.me).map(s => s.overall);
    const cont = $('[data-lottery-continue]')!;
    act(() => { cont.click(); cont.click(); });
    expect(night().made).toBe(mine[0] - 1);
    const players = saved().league.teams[b.me].players.length;
    const pick = $('[data-gm-draft-choice]')!;
    act(() => { pick.click(); pick.click(); });
    expect(saved().league.teams[b.me].players.length).toBe(players + 1);
    const staff = $('[data-gm-draft-staff]')!;
    act(() => { staff.click(); staff.click(); });
    spy.mockRestore();
    expect(saved().phase).toBe('hub');
    expect(saved().league.season).toBe(b.league.season + 1);
  });

  it('(i) no heading "?" while the card is up; after Continue it opens over the stage and the run card stays the same node', async () => {
    const b = closedSave(20, ids => ids[20]);
    mount(b.save);
    await goToDraft();
    expect($('[data-gm-draft-help]')).toBeNull();
    press('[data-lottery-continue]');
    const card = $('[data-draft-night]');
    expect(card).toBeTruthy();
    press('[data-gm-draft-help]');
    expect($('[data-gm-draft-help-panel]')).toBeTruthy();
    expect($('[data-gm-draft-help-panel]')!.textContent).toContain('Before the draw');
    press('[data-gm-draft-help-close]');
    expect($('[data-gm-draft-help-panel]')).toBeNull();
    expect($('[data-draft-night]')).toBe(card);
  });

  it('(j) every slot used and the summer not run (the state a refused summer leaves): the finish button runs it', async () => {
    const b = closedSave(21, ids => ids[8]);
    const opened = openNbaDraftNight(b.save.gm, clone(b.league), b.series, b.me)!;
    const lg = clone(b.league);
    const cls = nbaEarnedDraftClass(lehmer(9), opened.night.slots.length, new Set());
    const all = nbaDraftByStaff(lg, opened.desk, b.me, cls, lehmer(10))!;
    expect(all.done).toBe(true);
    mount({ ...b.save, league: lg, phase: 'draft', draftClass: all.left, picksLeft: 0, draftAiBatchesLeft: 2, gm: all.desk });
    expect($('[data-gm-earned-draft]')!.getAttribute('data-gm-earned-draft')).toBe('clock');
    expect($('[data-gm-draft-choice]')).toBeNull();
    expect($('[data-gm-draft-finish]')!.textContent).toBe('Finish the draft and the summer');
    press('[data-gm-draft-finish]');
    expect(saved().phase).toBe('hub');
    expect(saved().league.season).toBe(b.league.season + 1);
    expect($('[data-gm-earned-draft]')!.getAttribute('data-gm-earned-draft')).toBe('over');
  });

  it('(k) leaving the night and abandoning the franchise leaves nothing of it on screen', async () => {
    const b = closedSave(22, ids => ids[9]);
    mount(b.save);
    await goToDraft();
    press('[data-lottery-continue]');
    press('[data-gm-draft-staff]');
    toHub();
    expect($('[data-gm-earned-draft]')).toBeNull();
    const abandon = [...document.querySelectorAll('button')].find(x => x.textContent?.includes('Abandon franchise and restart'))!;
    fireEvent.click(abandon);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect($('[data-gm-earned-draft]')).toBeNull();
    expect(document.body.textContent).toContain('Take over a front office');
  });
});
