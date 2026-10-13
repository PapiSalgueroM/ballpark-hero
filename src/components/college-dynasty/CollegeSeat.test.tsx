/**
 * Round 1320: the athletic director on both college boards, in jsdom, with
 * seeded saves built from the real engines. The held fixture
 * (collegeDynastyFixture.test.tsx) proves he changes nothing else; this file
 * proves what he does: the ask on the tile in the pack's words, the card and
 * its rules with Back, the live line read off the record, the grade and trust
 * on the recap, the offer to an older dynasty and "Not now" writing nothing,
 * and a block that does not check out loading as an old save.
 */
import type { ComponentType } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import CfbDynastyBoard from '@/components/cfb-dynasty/CfbDynastyBoard';
import CbbDynastyBoard from '@/components/cbb-dynasty/CbbDynastyBoard';
import { initCfb, CFB_SCHOOLS, CFB_ROUNDS, simCfbRound, runCfbPostseason, heismanRace } from '@/lib/cfbDynasty';
import { initCbb, CBB_SCHOOLS, CBB_ROUNDS, simCbbRound, runMarch, poyRace } from '@/lib/cbbDynasty';
import { cfbSeatBinding } from '@/lib/cfbSeatBind';
import { cbbSeatBinding } from '@/lib/cbbSeatBind';
import { collegeBid, collegeTileView, newCollegeSeat } from '@/lib/collegeSeat';
import { GM_SEAT_PACKS } from '@/data/gmSeat/packs';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => {} }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

interface Sport {
  name: 'cfb' | 'cbb'; Board: ComponentType; key: string; school: string; label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  init: (id: string, rng: () => number, opts?: { depth?: boolean }) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  binding: any;
}
const SPORTS: Sport[] = [
  { name: 'cfb', Board: CfbDynastyBoard, key: 'cfb-dynasty-save-v1', school: 'ALA', label: 'Alabama', init: initCfb, binding: cfbSeatBinding },
  { name: 'cbb', Board: CbbDynastyBoard, key: 'cbb-dynasty-save-v1', school: 'UK', label: 'Kentucky', init: initCbb, binding: cbbSeatBinding },
];
const PLAY = /^(Play (Week|Round) \d+|Final week \+ the Playoff|Final round \+ March)$/;
const txt = (el: Element) => (el.textContent ?? '').trim();

function mount(sport: Sport, save?: unknown) {
  localStorage.clear();
  if (save !== undefined) localStorage.setItem(sport.key, JSON.stringify(save));
  const view = render(<sport.Board />);
  const q = (sel: string) => view.container.querySelector(sel);
  const buttons = () => [...view.container.querySelectorAll('button')];
  const button = (want: string | RegExp) => {
    const b = buttons().find(x => (typeof want === 'string' ? txt(x) === want : want.test(txt(x))));
    if (!b) throw new Error(`no button ${String(want)}`);
    return b;
  };
  const saved = () => JSON.parse(localStorage.getItem(sport.key) ?? 'null');
  return { view, q, button, buttons, saved };
}

describe('Round 1320: the athletic director on the college boards', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  for (const sport of SPORTS) {
    it(`${sport.name}: a new dynasty starts with him, the tile carries the ask, and the card opens and closes`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1320));
      const m = mount(sport);
      expect(m.q('[data-college-seat="pick"]')).toBeTruthy();
      fireEvent.click(m.button(new RegExp(`^${sport.label}Prestige`)));
      const st = m.saved().st;
      expect(st.seat?.v).toBe(1);
      const tile = m.q('[data-college-seat="tile"]')!;
      expect(tile).toBeTruthy();
      expect(txt(tile)).toContain(st.seat.mandate.text);
      expect(Object.values(GM_SEAT_PACKS[sport.name].asks).some(a => a.split('{')[0] && st.seat.mandate.text.startsWith(a.split('{')[0]))).toBe(true);
      expect(txt(tile)).toContain('Trust 60');
      fireEvent.click(tile);
      expect(m.q('[data-college-seat="card"]')).toBeTruthy();
      expect(m.buttons().some(b => txt(b) === 'Play')).toBe(true);
      fireEvent.click(m.view.container.querySelector('[aria-label="How the athletic director works"]')!);
      const rules = m.q('[data-college-seat="rules"]')!;
      expect(txt(rules)).toContain('Trust starts at 60 of 100');
      fireEvent.click(m.button(/Back$/));
      expect(m.q('[data-college-seat="card"]')).toBeTruthy();
      fireEvent.click(m.button(/Back$/));
      expect(m.q('[data-college-seat="card"]')).toBeNull();
      expect(m.q('[data-college-seat="tile"]')).toBeTruthy();
    });

    it(`${sport.name}: the live line follows the record, and the recap grades the year and moves trust`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1321));
      const m = mount(sport);
      fireEvent.click(m.button(new RegExp(`^${sport.label}Prestige`)));
      fireEvent.click(m.button('Play'));
      for (let i = 0; i < 30 && !m.q('[data-college-seat="recap"]'); i += 1) {
        const st = m.saved().st;
        const want = collegeTileView(st.seat, sport.binding.view(st));
        expect(txt(m.q('[data-college-seat="tile"]')!)).toContain(want!.line);
        fireEvent.click(m.button(PLAY));
      }
      const recap = m.q('[data-college-seat="recap"]')!;
      expect(recap).toBeTruthy();
      const st = m.saved().st;
      const s = st.seat.career.stints[0];
      expect(s.grades.length).toBe(1);
      expect(txt(recap)).toContain(`Trust upstairs: ${st.seat.trust} of 100`);
      const verdict = GM_SEAT_PACKS[sport.name].verdicts[s.grades[0] as 'met'];
      expect(txt(recap)).toContain(verdict.replace(/\{\w+\}/g, '').slice(0, 12));
      expect(m.buttons().some(b => txt(b).includes('Hit the recruiting trail'))).toBe(true);
    });

    it(`${sport.name}: an older dynasty is offered him at the first press; Not now writes nothing, Take the ask writes the block`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1322));
      const plain = { st: sport.init(sport.school, lehmer(7)), phase: 'season', recruits: null, portal: null };
      const m = mount(sport, plain);
      const before = localStorage.getItem(sport.key);
      expect(m.q('[data-college-seat="optin"]')).toBeTruthy();
      expect(txt(m.q('[data-college-seat="optin"]')!)).toContain('Trust at zero gets you let go');
      fireEvent.click(m.button('Not now'));
      expect(localStorage.getItem(sport.key)).toBe(before);
      expect(m.q('[data-college-seat="optin"]')).toBeNull();
      expect(m.q('[data-college-seat="passed"]')).toBeTruthy();
      cleanup();
      const again = mount(sport, plain);
      fireEvent.click(again.button('Take the ask'));
      expect(again.saved().st.seat.v).toBe(1);
      expect(again.q('[data-college-seat="tile"]')).toBeTruthy();
    });

    it(`${sport.name}: a block that does not check out loads as an old save, never a crash`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1323));
      const st = sport.init(sport.school, lehmer(8), { depth: true });
      const good = newCollegeSeat(sport.binding.view(st));
      for (const bad of [{ ...good, trust: 140 }, { ...good, trust: -5 }, { ...good, trust: '60' }, { ...good, career: { version: 1, stints: [], seasonsOut: 0 } }, 'seat']) {
        cleanup();
        const m = mount(sport, { st: { ...st, seat: bad }, phase: 'season', recruits: null, portal: null });
        expect(m.q('[data-college-seat="optin"]')).toBeTruthy();
        expect(m.q('[data-college-seat="tile"]')).toBeNull();
      }
    });

    /* ---- Round 1320 step 2b: the firing, the market, the move, the year out ---- */

    /** A coach with two titles behind him at the weakest program, one trust point left, asked to make the
        field, at the season's last round: anything short of the field is a firing, and the market wants him. */
    const firingSave = () => {
      const schools = sport.name === 'cfb' ? CFB_SCHOOLS : CBB_SCHOOLS;
      const weak = [...schools].sort((a, b) => a.prestige - b.prestige || a.id.localeCompare(b.id))[0].id;
      const st = sport.init(weak, lehmer(9), { depth: true });
      const seat = newCollegeSeat(sport.binding.view(st));
      seat.trust = 1;
      seat.mandate = { ...seat.mandate!, tier: 'playoffs', reqLevel: 1, winFloor: 0 };
      seat.career.stints[0] = { ...seat.career.stints[0], from: st.season - 3, grades: ['title', 'title', 'overachieved'] };
      st.seat = seat;
      st.round = sport.name === 'cfb' ? 12 : 10;
      return { st, phase: 'season', recruits: null, portal: null };
    };
    const fireIt = (m: ReturnType<typeof mount>) => {
      fireEvent.click(m.button('Play'));
      fireEvent.click(m.button(PLAY));
    };

    it(`${sport.name}: trust at zero is a firing, the recap says so, and See who calls opens the same market after a reload`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1324));
      const m = mount(sport, firingSave());
      fireIt(m);
      expect(m.q('[data-college-seat="fired"]')).toBeTruthy();
      expect(m.buttons().some(b => txt(b).includes('Hit the recruiting trail'))).toBe(false);
      expect(m.saved().phase).toBe('recap');
      expect(m.saved().st.seat.career.stints[0].ended).toBe('fired');
      fireEvent.click(m.button('See who calls'));
      const market = txt(m.q('[data-college-seat="market"]')!);
      expect(market).toContain('let you go');
      expect(m.saved().phase).toBe('recap');
      /* the rules reopen from the market, where a fired coach has no card to reach them from */
      fireEvent.click(m.view.container.querySelector('[data-college-seat="market"] [aria-label="How the athletic director works"]')!);
      expect(m.q('[data-college-seat="market"]')).toBeNull();
      expect(txt(m.q('[data-college-seat="rules"]')!)).toContain('A program that let you go never calls again');
      fireEvent.click(m.button(/Back$/));
      expect(txt(m.q('[data-college-seat="market"]')!)).toBe(market);
      cleanup();
      const again = mount(sport, again0(sport));
      expect(txt(again.q('[data-college-seat="market"]')!)).toBe(market);
    });

    it(`${sport.name}: Take the job moves him once and opens the new program's trail; Sit the year out plays a season without him`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1325));
      const m = mount(sport, firingSave());
      fireIt(m);
      fireEvent.click(m.button('See who calls'));
      const fired = m.saved();
      const take = m.buttons().find(b => txt(b) === 'Take the job');
      expect(take, 'a coach with two titles behind him drew no offer').toBeTruthy();
      const to = take!.getAttribute('aria-label')!.replace('Take the job at ', '');
      fireEvent.click(take!);
      fireEvent.click(take!);
      const after = m.saved();
      expect(after.phase).toBe('recruit');
      expect(after.st.seat.career.stints.length).toBe(2);
      expect(after.st.seat.career.stints[1].from).toBe(fired.st.season + 1);
      expect(after.st.seat.trust).toBe(60);
      expect(after.st.myTeam).not.toBe(fired.st.myTeam);
      expect(sport.binding.view(after.st).programs.find((p: { id: string; name: string }) => p.id === after.st.myTeam).name).toBe(to);
      expect(txt(m.q('[data-college-seat="moved"]')!)).toContain(`head coach at ${to} now`);
      if ('lastRivalry' in after.st) expect(after.st.lastRivalry).toBeNull();
      /* a reload on the new program's trail keeps him: the new stint starts the season after the one on record */
      reloadOnTrail(sport, after);
      cleanup();
      /* the year out, from the same fired save */
      localStorage.clear();
      const y = mount(sport, fired);
      const sit = y.buttons().find(b => txt(b) === 'Sit the year out');
      expect(sit, 'the fired save offered no year out, so the year out went untested').toBeTruthy();
      fireEvent.click(sit!);
      const out = y.saved();
      expect(out.st.season).toBe(fired.st.season + 1);
      expect(out.st.myTitles).toBe(fired.st.myTitles);
      expect(out.st.seasonsPlayed).toBe(fired.st.seasonsPlayed);
      expect(out.st.seat.career.seasonsOut).toBe(fired.st.seat.career.seasonsOut + 1);
      expect(out.phase).toBe('recap');
      expect(y.q('[data-college-seat="market"]')).toBeTruthy();
    });

    it(`${sport.name}: a closed market offers only a new dynasty, and hostile market saves load somewhere sane`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1326));
      const m = mount(sport, firingSave());
      fireIt(m);
      const fired = m.saved();
      cleanup();
      const shut = JSON.parse(JSON.stringify(fired));
      shut.st.seat.career = { version: 1, seasonsOut: 4, stints: [{ team: shut.st.myTeam, tier: 4, from: shut.st.season, grades: ['badly'], ended: 'fired' }] };
      const c = mount(sport, shut);
      expect(c.q('[data-college-seat="market"]')).toBeTruthy();
      expect(c.buttons().map(txt)).toContain('Start a new dynasty');
      expect(c.buttons().some(b => txt(b) === 'Take the job' || txt(b) === 'Sit the year out')).toBe(false);
      cleanup();
      /* phase 'market' and no seat on an open season: the season screen */
      const plain = { st: sport.init(sport.school, lehmer(10), { depth: true }), phase: 'market', recruits: null, portal: null };
      const p = mount(sport, plain);
      expect(p.q('[data-college-seat="market"]')).toBeNull();
      expect(p.buttons().some(b => txt(b) === 'Play')).toBe(true);
      cleanup();
      /* phase 'market' with a seat he still holds on a closed season: the trail, never an empty market */
      const holding = JSON.parse(JSON.stringify(fired));
      holding.phase = 'market';
      holding.st.seat.career.stints[0].ended = undefined;
      holding.st.seat.trust = 30;
      const h = mount(sport, holding);
      expect(h.q('[data-college-seat="market"]')).toBeNull();
      expect(h.saved().phase).toBe('recruit');
      cleanup();
      /* a fired seat on a season screen whose season is closed: the market */
      const onSeason = JSON.parse(JSON.stringify(fired));
      onSeason.phase = 'season';
      const s2 = mount(sport, onSeason);
      expect(s2.q('[data-college-seat="market"]')).toBeTruthy();
      cleanup();
      /* a fired seat on the trail (no build writes it): the seat is dropped and the dynasty plays on */
      const onTrail = JSON.parse(JSON.stringify(fired));
      onTrail.phase = 'recruit';
      const t = mount(sport, onTrail);
      expect(t.q('[data-college-seat="market"]')).toBeNull();
      cleanup();
      /* a fired seat on a season still open (no build writes it): the seat is dropped alone and the season plays on */
      const open = JSON.parse(JSON.stringify(fired));
      if (sport.name === 'cfb') open.st.natties = open.st.natties.filter((n: { season: number }) => n.season !== open.st.season);
      else open.st.titles = open.st.titles.filter((n: { season: number }) => n.season !== open.st.season);
      open.phase = 'season';
      const o = mount(sport, open);
      expect(o.q('[data-college-seat="market"]')).toBeNull();
      expect(o.q('[data-college-seat="tile"]')).toBeNull();
      expect(o.q('[data-college-seat="passed"]')).toBeTruthy();
      expect(o.buttons().some(b => txt(b) === 'Play')).toBe(true);
      cleanup();
      /* a fired seat saved on 'market' (no build writes that phase) on a closed season: the market, the same one */
      const onMarket = JSON.parse(JSON.stringify(fired));
      onMarket.phase = 'market';
      const k = mount(sport, onMarket);
      expect(k.q('[data-college-seat="market"]')).toBeTruthy();
      expect(txt(k.q('[data-college-seat="market"]')!)).toContain('let you go');
    });
  }
});

/** A coach who just moved, reloaded on the new program's trail: st.season is still the season he left (the
    offseason moves it), so his new stint starts one past it. The seat must survive the load and the offseason. */
function reloadOnTrail(sport: Sport, moved: { phase: string; st: { myTeam: string; season: number; seat: { career: { stints: { from: number }[] } } } }) {
  expect(moved.phase).toBe('recruit');
  expect(moved.st.seat.career.stints.at(-1)!.from).toBe(moved.st.season + 1);
  cleanup();
  const back = mount(sport, moved);
  expect(back.q('[data-college-seat="moved"]'), 'the trail after a reload does not say where he coaches now').toBeTruthy();
  fireEvent.click(back.button('Close the class, run it back'));
  expect(back.q('[data-college-seat="moved"]')).toBeNull();
  const next = back.saved();
  expect(next.st.myTeam).toBe(moved.st.myTeam);
  expect(next.st.seat?.career.stints.length, 'a reload on the trail after a move dropped the athletic director').toBe(moved.st.seat.career.stints.length);
  expect(back.q('[data-college-seat="tile"]')).toBeTruthy();
}

/** The save as the board left it (the market is never saved, so this is the recap it opened from). */
function again0(sport: Sport) {
  return JSON.parse(localStorage.getItem(sport.key) ?? 'null');
}

/* ---- Round 1320 step 3: the call from above ---- */

/** A whole season played through the engine at a second tier program, its recap held, and a record whose
    newest grade is a title this season; the first `from` whose keyed draw bids is kept. */
function bidSave(sport: Sport) {
  const schools = (sport.name === 'cfb' ? CFB_SCHOOLS : CBB_SCHOOLS).slice();
  const ranked = schools.sort((a, b) => b.prestige - a.prestige || a.id.localeCompare(b.id));
  const tier2 = ranked[Math.floor(ranked.length * 0.375)].id;
  const rng = lehmer(31);
  const st = sport.init(tier2, rng, { depth: true });
  let recap: unknown;
  if (sport.name === 'cfb') {
    for (let r = 1; r <= CFB_ROUNDS; r += 1) { simCfbRound(st, rng); if (r < CFB_ROUNDS) st.round += 1; }
    const post = runCfbPostseason(st, rng);
    const heisman = heismanRace(st, rng);
    st.natties.push({ season: st.season, team: post.champion });
    recap = { ccgs: post.ccgs, bracket: post.bracket, champion: post.champion, heisman };
  } else {
    for (let r = 1; r <= CBB_ROUNDS; r += 1) { simCbbRound(st, rng); if (r < CBB_ROUNDS) st.round += 1; }
    const result = runMarch(st, rng);
    const poy = poyRace(st, rng);
    st.titles.push({ season: st.season, team: result.champion });
    recap = { result, poy };
  }
  const view = sport.binding.view(st);
  for (let k = 1; k <= 12; k += 1) {
    const seat = newCollegeSeat(view);
    seat.trust = 80;
    seat.career.stints[0] = { team: tier2, tier: 2, from: st.season - k + 1, grades: [...Array(k - 1).fill('met'), 'title'] };
    const bid = collegeBid(seat, view);
    if (bid) {
      st.seat = seat;
      return { save: { st, phase: 'recap', recruits: null, portal: null, [sport.name === 'cfb' ? 'postseason' : 'march']: recap }, bid };
    }
  }
  throw new Error(`${sport.name}: no keyed draw bid over twelve records`);
}

describe('Round 1320: a buyout bid after a big year', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
  for (const sport of SPORTS) {
    it(`${sport.name}: the bid shows on the recap; Go to moves him with the old stint ended as a buyout, Stay put keeps him`, () => {
      vi.spyOn(Math, 'random').mockImplementation(lehmer(1327));
      const { save, bid } = bidSave(sport);
      const m = mount(sport, save);
      const node = m.q('[data-college-seat="bid"]')!;
      expect(node).toBeTruthy();
      expect(txt(node)).toContain(bid.teamName);
      expect(txt(node)).toContain(bid.ask.text);
      fireEvent.click(m.button(`Go to ${bid.teamName}`));
      const after = m.saved();
      expect(after.phase).toBe('recruit');
      expect(after.st.myTeam).toBe(bid.teamId);
      expect(after.st.seat.career.stints.length).toBe(2);
      expect(after.st.seat.career.stints[0].ended).toBe('poached');
      expect(after.st.seat.trust).toBe(60);
      expect(txt(m.q('[data-college-seat="moved"]')!)).toContain(`head coach at ${bid.teamName} now`);
      reloadOnTrail(sport, after);
      cleanup();
      const stay = mount(sport, save);
      fireEvent.click(stay.button('Stay put'));
      expect(stay.q('[data-college-seat="moved"]')).toBeNull();
      const kept = stay.saved();
      expect(kept.phase).toBe('recruit');
      expect(kept.st.myTeam).toBe(save.st.myTeam);
      expect(kept.st.seat.career.stints.length).toBe(1);
    });

    /* The double tap guard remembers the market or bid a press acted on, by season, years out and stints. A new
       dynasty in the same mount meets the same key at its first bid, so the guard has to start over with it. */
    it(`${sport.name}: a second dynasty in one mount takes its own bid, though its key matches the first one's`, () => {
      const rnd = vi.spyOn(Math, 'random').mockImplementation(lehmer(1328));
      const { save, bid } = bidSave(sport);
      const m = mount(sport, save);
      const key = `${save.st.season}:0:1`;
      fireEvent.click(m.button(`Go to ${bid.teamName}`));
      expect(m.saved().st.myTeam).toBe(bid.teamId);
      fireEvent.click(m.button('Close the class, run it back'));
      fireEvent.click(m.button('Fire yourself and start over'));
      const name = sport.binding.view(save.st).programs.find((p: { id: string; name: string }) => p.id === save.st.myTeam).name;
      for (let seed = 1; seed <= 80; seed += 1) {
        rnd.mockImplementation(lehmer(5000 + seed));
        const pick = m.buttons().find(b => txt(b).startsWith(`${name}Prestige`));
        expect(pick, `no pick button for ${name}`).toBeTruthy();
        fireEvent.click(pick!);
        fireEvent.click(m.button('Play'));
        for (let i = 0; i < 30 && !m.q('[data-college-seat="recap"]'); i += 1) fireEvent.click(m.button(PLAY));
        const st = m.saved().st;
        expect(`${st.season}:${st.seat.career.seasonsOut}:${st.seat.career.stints.length}`).toBe(key);
        const offer = collegeBid(st.seat, sport.binding.view(st));
        if (offer) {
          fireEvent.click(m.button(`Go to ${offer.teamName}`));
          const after = m.saved();
          expect(after.phase).toBe('recruit');
          expect(after.st.myTeam).toBe(offer.teamId);
          expect(after.st.seat.career.stints.length).toBe(2);
          console.log(`${sport.name}: the second dynasty's bid came at seed ${5000 + seed}`);
          return;
        }
        fireEvent.click(m.button('Hit the recruiting trail'));
        fireEvent.click(m.button('Close the class, run it back'));
        fireEvent.click(m.button('Fire yourself and start over'));
      }
      throw new Error(`${sport.name}: no second dynasty drew a bid over 80 seeds`);
    }, 120000);
  }
});
