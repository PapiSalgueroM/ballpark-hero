/* Round 585: gems and packs, on the real academy page.

   THE RISK. A pack is the one place in the tycoon where chance decides what you
   get, so it is where a game can quietly turn into something it must never be:
   odds that are not the odds drawn, a draw that a reload can repeat, a kid
   delivered twice or never, a price the button does not show, or gems that come
   from somewhere other than playing.

   HOW. The real Wonderkid Factory page (the same AcademyPanel the tycoon's
   Academy tab renders), the real academy hook and lib, the real ledger in
   src/lib/tycoonRewards.ts, jsdom's localStorage, the academy's 250ms clock on
   fake timers, and a seeded Math.random. The stadium half (a watched win pays its
   gems) drives the real stadium hook the same way.

   The wrapper is scripts/simTycoonPacks.mjs; run that, not this file alone. */
import './dailyReload/mocks';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { mountPage } from './dailyReload/harness';
import WonderkidFactory from '@/pages/WonderkidFactory';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import { SAVE_KEY, PACKS, TIERS, newFactory, serialize } from '@/lib/wonderkidFactory';
import { REWARDS_KEY, newLedger, GEM_PAY } from '@/lib/tycoonRewards';
import { TYCOON_SAVE_KEY, newTycoon, newLeague, serializeTycoon, tick } from '@/lib/stadiumTycoon';
import type { TycoonState } from '@/lib/stadiumTycoon';

const EPOCH = 1767225600000;
const TEST_MS = 120_000;
let vnow = 0;

function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function measured(line: string) {
  console.log(`PACKS| ${line}`);
}
const ledger = () => JSON.parse(localStorage.getItem(REWARDS_KEY) ?? 'null');
const academy = () => { act(() => { window.dispatchEvent(new Event('pagehide')); }); return JSON.parse(localStorage.getItem(SAVE_KEY) as string); };
function seed(gems: number, beds = 0) {
  const a = newFactory(EPOCH, 42);
  a.levels = { ...a.levels, dorms: 2 };
  for (let i = 0; i < beds; i += 1) {
    a.prospects.push({ id: a.nextId++, name: `Filler Kid ${i}`, nation: 'England', pos: 'MF', age: 16, ageClock: 0, rating: 50, potential: 70 });
  }
  a.scoutProgress = -1e9; /* no scout fills a bed during a test */
  localStorage.setItem(SAVE_KEY, serialize(a));
  localStorage.setItem(REWARDS_KEY, JSON.stringify({ ...newLedger(7), earned: gems }));
}
async function openPacks() {
  const tile = [...document.querySelectorAll('button')].find(b => /Packs/.test(b.textContent ?? ''));
  if (!tile) throw new Error('no Packs tile on the academy');
  await act(async () => { fireEvent.click(tile); });
  await act(async () => { await vi.dynamicImportSettled(); });
}
const openButton = (id: string) => document.querySelector(`[data-open-pack="${id}"]`) as HTMLButtonElement;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vnow = 0;
  localStorage.clear();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + Math.round(vnow));
  vi.spyOn(performance, 'now').mockImplementation(() => vnow);
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(585));
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('packs on the real academy', () => {
  it('1 every pack prints the published odds, before its button', async () => {
    seed(0);
    mountPage(<WonderkidFactory />, '/wonderkid-factory');
    await openPacks();
    let rows = 0;
    for (const pack of PACKS) {
      const panel = document.querySelector(`[data-odds="${pack.id}"]`);
      expect(panel, `no odds panel for the ${pack.name}`).not.toBeNull();
      for (const t of TIERS) {
        const row = panel?.querySelector(`[data-odd="${t.id}"]`);
        const shown = (row?.textContent ?? '').match(/(\d+)%\s*$/)?.[1];
        expect(Number(shown), `the ${pack.name} shows ${shown}% for ${t.label}, the table says ${pack.odds[t.id]}`).toBe(pack.odds[t.id]);
        rows += 1;
      }
      const sum = TIERS.reduce((n, t) => n + pack.odds[t.id], 0);
      expect(sum, `the ${pack.name}'s odds add to ${sum}`).toBe(100);
      const button = openButton(pack.id);
      expect(panel!.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING, `the ${pack.name}'s button comes before its odds`).toBeTruthy();
      expect(/buy/i.test(button.textContent ?? ''), `the ${pack.name}'s button says buy`).toBe(false);
    }
    measured(`${PACKS.length} packs print ${rows} odds exactly as PACKS holds them, each above its button`);
  }, TEST_MS);

  it('2 a pack costs what its button says, the first Scout Pack is free, and the button waits for a bed and the gems', async () => {
    seed(130);
    mountPage(<WonderkidFactory />, '/wonderkid-factory');
    await openPacks();
    expect(openButton('scout').textContent, 'the first Scout Pack does not say it is free').toMatch(/free/i);
    expect(openButton('club').textContent).toBe(`Open for ${PACKS[1].price} gems`);
    expect(openButton('elite').disabled, 'the Elite Pack opens with 130 gems').toBe(true);
    act(() => { fireEvent.click(openButton('club')); });
    const afterClub = ledger();
    expect(afterClub.earned - afterClub.spent, 'the Club Pack did not cost its price').toBe(130 - PACKS[1].price);
    act(() => { fireEvent.click(document.querySelector('[data-pack-reveal] button') as HTMLElement); });
    act(() => { fireEvent.click(openButton('scout')); });
    expect(ledger().spent, 'the first Scout Pack cost gems').toBe(PACKS[1].price);
    act(() => { fireEvent.click(document.querySelector('[data-pack-reveal] button') as HTMLElement); });
    expect(openButton('scout').textContent, 'the second Scout Pack is still free').toBe(`Open for ${PACKS[0].price} gems`);
    expect(openButton('scout').disabled, 'the second Scout Pack opens with 30 gems left').toBe(false);

    cleanup();
    seed(1000, 5);
    mountPage(<WonderkidFactory />, '/wonderkid-factory');
    await openPacks();
    expect(PACKS.every(p => openButton(p.id).disabled), 'a pack opens into a full academy').toBe(true);
    measured('the Club Pack cost its printed price, the first Scout Pack cost nothing and the second its price, and a full academy opens nothing');
  }, TEST_MS);

  it('3 the card shows the tier drawn, and the kid in the bed carries it', async () => {
    const tiers: string[] = [];
    for (let run = 0; run < 12; run += 1) {
      cleanup();
      localStorage.clear();
      vi.mocked(Math.random).mockImplementation(seededRandom(run + 1));
      seed(10000);
      localStorage.setItem(REWARDS_KEY, JSON.stringify({ ...newLedger(1000 + run * 97), earned: 10000 }));
      mountPage(<WonderkidFactory />, '/wonderkid-factory');
      await openPacks();
      act(() => { fireEvent.click(openButton('elite')); });
      const drawn = ledger().pending;
      const card = document.querySelector('[data-pack-reveal]');
      expect(card?.getAttribute('data-tier'), 'the card tier is not the tier drawn').toBe(drawn.tier);
      expect(card?.textContent ?? '', 'the card does not name the kid drawn').toContain(drawn.kid.name);
      expect(card?.querySelector('[data-tier-label]')?.textContent, 'the card headline is not the tier drawn').toBe(TIERS.find(t => t.id === drawn.tier)!.label);
      const bed = academy().prospects.find((p: { name: string }) => p.name === drawn.kid.name);
      expect(bed?.tier, 'the kid in the bed does not carry the tier drawn').toBe(drawn.tier);
      const band = TIERS.find(t => t.id === drawn.tier)!;
      expect(bed.potential >= band.potMin && bed.potential <= band.potMax, `a ${band.label} kid has a ceiling of ${bed.potential}`).toBe(true);
      tiers.push(drawn.tier);
    }
    measured(`12 Elite Packs: every card showed the tier drawn and every kid carried it (${[...new Set(tiers)].join(', ')})`);
  }, TEST_MS);

  it('4 a reload in the middle of a reveal shows the same kid, delivered exactly once', async () => {
    seed(500);
    const first = mountPage(<WonderkidFactory />, '/wonderkid-factory');
    await openPacks();
    act(() => { fireEvent.click(openButton('club')); });
    const drawn = ledger().pending;
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    first.unmount();

    mountPage(<WonderkidFactory />, '/wonderkid-factory');
    act(() => { vi.advanceTimersByTime(1000); });
    await openPacks();
    const card = document.querySelector('[data-pack-reveal]');
    expect(card?.textContent ?? '', 'the reload did not show the same kid').toContain(drawn.kid.name);
    const beds = academy().prospects.filter((p: { name: string }) => p.name === drawn.kid.name).length;
    expect(beds, `after a reload the pack kid is in ${beds} beds`).toBe(1);
    expect(ledger().opened.club, 'the reload opened another pack').toBe(1);

    /* The worst moment: the draw is stored and the tab dies before the academy saves him. */
    cleanup();
    localStorage.clear();
    seed(0);
    const a = JSON.parse(localStorage.getItem(SAVE_KEY) as string);
    localStorage.setItem(REWARDS_KEY, JSON.stringify({ ...newLedger(7), earned: 100, spent: 100, opened: { scout: 0, club: 1, elite: 0 }, dry: { scout: 0, club: 1, elite: 0 }, pending: { seq: 1, pack: 'club', tier: 'talent', kid: { id: 999, name: 'Stranded Kid', nation: 'Spain', pos: 'FW', age: 16, ageClock: 0, rating: 52, potential: 80 } } }));
    localStorage.setItem(SAVE_KEY, JSON.stringify(a));
    for (let i = 0; i < 2; i += 1) {
      const view = mountPage(<WonderkidFactory />, '/wonderkid-factory');
      act(() => { vi.advanceTimersByTime(1000); });
      act(() => { window.dispatchEvent(new Event('pagehide')); });
      view.unmount();
    }
    const after = JSON.parse(localStorage.getItem(SAVE_KEY) as string);
    const stranded = after.prospects.filter((p: { name: string }) => p.name === 'Stranded Kid');
    expect(stranded.length, `a pack stored but never delivered arrived ${stranded.length} times over two reloads`).toBe(1);
    expect(after.packsDelivered, 'the academy did not count the delivery').toBe(1);
    measured(`a reload mid-reveal showed ${drawn.kid.name} again, in one bed, one pack opened; a draw stranded by a dead tab arrived once over two reloads`);
  }, TEST_MS);

  it('5 a watched win at the ground earns its gems once, and nothing else earns any', () => {
    localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon({ ...newTycoon(EPOCH), levels: { ...newTycoon(EPOCH).levels, squad: 200 }, minute: 88 }, EPOCH));
    let frameCb: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frameCb = cb; return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => { frameCb = null; });
    let latest: ReturnType<typeof useStadiumTycoon> | null = null;
    const Probe = () => { latest = useStadiumTycoon(); return null; };
    render(<Probe />);
    const frames = (n: number) => { for (let i = 0; i < n; i += 1) { const cb = frameCb; if (!cb) return; frameCb = null; vnow += 200; act(() => { cb(vnow); }); } };
    /* taps, a purchase and a golden catch are not results */
    for (let i = 0; i < 20; i += 1) act(() => { latest!.doTap(50, 50); });
    act(() => { latest!.doBuy('stands'); });
    expect(ledger()?.earned ?? 0, 'taps and a purchase earned gems').toBe(0);
    /* 0.01 lands under the squad's goal chance and over the opponent's floor of 0.008: only we score. */
    vi.mocked(Math.random).mockImplementation(() => 0.01);
    frames(40);
    const s = latest!.state;
    const l = ledger();
    const wins = s.totalWins;
    expect(s.totalMatches, 'the match did not finish').toBeGreaterThanOrEqual(1);
    expect(wins, 'the rigged match was not a win').toBe(s.totalMatches);
    expect(l.earned, `${wins} watched wins earned ${l.earned} gems`).toBe(wins * GEM_PAY.win);
    expect(l.lastMatch, 'the ledger did not key the full time on the match count').toBe(s.totalMatches);
    vi.unstubAllGlobals();
    measured(`20 taps and a purchase earned 0 gems; ${wins} watched win(s) earned ${l.earned}, keyed on match ${l.lastMatch}`);
  }, TEST_MS);

  /* The review's cases, each a way a pack could have lost a kid or a gem. */
  it('6 a kid still waiting for a bed cannot be waved away, and moves in when one frees', async () => {
    seed(0, 5);
    localStorage.setItem(REWARDS_KEY, JSON.stringify({ ...newLedger(7), earned: 100, spent: 100, opened: { scout: 0, club: 1, elite: 0 }, nextSeq: 2, pending: { seq: 1, pack: 'club', tier: 'talent', kid: { id: 1, name: 'Waiting Kid', nation: 'Spain', pos: 'FW', age: 16, ageClock: 0, rating: 52, potential: 80 } } }));
    mountPage(<WonderkidFactory />, '/wonderkid-factory');
    act(() => { vi.advanceTimersByTime(500); });
    await openPacks();
    expect(document.querySelector('[data-pack-waiting]'), 'the card does not say he is waiting for a bed').not.toBeNull();
    expect([...document.querySelectorAll('[data-pack-reveal] button')].length, 'a waiting kid can be waved away').toBe(0);
    expect(ledger().pending?.kid.name, 'the waiting kid was dropped').toBe('Waiting Kid');
    const back = [...document.querySelectorAll('button')].find(b => /Hub/.test(b.textContent ?? ''));
    act(() => { fireEvent.click(back as HTMLElement); });
    const sell = [...document.querySelectorAll('button')].find(b => /^Sell for/.test((b.textContent ?? '').trim()));
    act(() => { fireEvent.click(sell as HTMLElement); });
    act(() => { vi.advanceTimersByTime(500); });
    const beds = academy().prospects.filter((p: { name: string }) => p.name === 'Waiting Kid').length;
    expect(beds, 'the waiting kid did not move into the freed bed').toBe(1);
    await openPacks();
    const welcome = document.querySelector('[data-pack-reveal] button') as HTMLElement | null;
    expect(welcome, 'once in a bed he still cannot be welcomed').not.toBeNull();
    act(() => { fireEvent.click(welcome!); });
    expect(ledger().pending, 'welcoming him did not clear the card').toBeNull();
    measured('a kid with no bed could not be waved away, moved in when a bed was sold free, and was then welcomed');
  }, TEST_MS);

  it('7 an academy that remembers more packs than a lost ledger still gets the next kid', async () => {
    const a = newFactory(EPOCH, 42);
    a.levels = { ...a.levels, dorms: 2 };
    a.packsDelivered = 4;
    a.scoutProgress = -1e9;
    localStorage.setItem(SAVE_KEY, serialize(a));
    localStorage.setItem(REWARDS_KEY, JSON.stringify({ ...newLedger(9), earned: 150 }));
    mountPage(<WonderkidFactory />, '/wonderkid-factory');
    await openPacks();
    act(() => { fireEvent.click(openButton('club')); });
    const drawn = ledger().pending;
    const after = academy();
    expect(drawn.seq, 'the pack reused a number the academy had already delivered').toBe(5);
    expect(after.prospects.some((p: { name: string }) => p.name === drawn.kid.name), 'the kid never reached a bed').toBe(true);
    expect(after.packsDelivered, 'the academy did not count him').toBe(5);
    measured('with the ledger lost and the academy at four packs, the next pack carried number 5 and moved in');
  }, TEST_MS);

  it('8 away wins earn one gem each, and a watched title adds its twenty', () => {
    let frameCb: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frameCb = cb; return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => { frameCb = null; });
    let latest: ReturnType<typeof useStadiumTycoon> | null = null;
    const Probe = () => { latest = useStadiumTycoon(); return null; };
    const frames = (n: number) => { for (let i = 0; i < n; i += 1) { const cb = frameCb; if (!cb) return; frameCb = null; vnow += 200; act(() => { cb(vnow); }); } };
    const strong = () => ({ ...newTycoon(EPOCH), levels: { ...newTycoon(EPOCH).levels, squad: 200 } });
    vi.mocked(Math.random).mockImplementation(() => 0.01);

    /* three hours away: six away wins at the top of a long league */
    const away = { ...strong(), league: newLeague(0, 6, 0), bestDivision: 6, savedAt: EPOCH };
    localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(away as never, EPOCH));
    vnow = 3 * 3600 * 1000;
    const view = render(<Probe />);
    const awayWins = latest!.awayTrip?.results.filter(m => m.result === 'W').length ?? 0;
    expect(awayWins, 'three hours away played no away wins').toBeGreaterThan(0);
    expect(ledger().earned, `${awayWins} away wins earned ${ledger().earned} gems`).toBe(awayWins * GEM_PAY.awayWin);
    view.unmount();

    /* a watched final matchday, top of the table: the win and the title */
    cleanup();
    localStorage.clear();
    latest = null;
    let s: TycoonState = strong();
    const shape = { matchdays: 5 };
    for (let guard = 0; guard < 100000 && !((s.league?.matchday ?? 0) === shape.matchdays - 1 && s.minute >= 85); guard += 1) s = tick(s, 1.4, () => 0.01).state;
    localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon({ ...s, savedAt: vnow + EPOCH } as never, vnow + EPOCH));
    render(<Probe />);
    frames(60);
    const titles = latest!.state.leagueTitles ?? 0;
    expect(titles, 'the rigged final matchday did not win the title').toBe(1);
    expect(ledger().earned, `the title match earned ${ledger().earned} gems`).toBe(GEM_PAY.win + GEM_PAY.title);
    vi.unstubAllGlobals();
    measured(`${awayWins} away wins earned ${awayWins * GEM_PAY.awayWin} gems; the watched title match earned ${GEM_PAY.win + GEM_PAY.title}`);
  }, TEST_MS);

  it('9 malformed saved card fields stay safe before and after delivery', async () => {
    for (const nation of [{}, '__proto__', 'constructor']) {
      cleanup();
      localStorage.clear();
      seed(0);
      localStorage.setItem(REWARDS_KEY, JSON.stringify({ ...newLedger(7), earned: 100, spent: 100, opened: { scout: 0, club: 1, elite: 0 }, nextSeq: 2, pending: { seq: 1, pack: 'club', tier: 'talent', kid: { id: {}, name: 'Stored Kid', nation, pos: {}, age: {}, ageClock: {}, rating: {}, potential: {} } } }));
      mountPage(<WonderkidFactory />, '/wonderkid-factory');
      await openPacks();
      const card = document.querySelector('[data-pack-reveal]');
      expect(card, 'malformed saved fields crashed the reveal').not.toBeNull();
      expect(card?.textContent).toContain('Stored Kid');
      expect(card?.textContent).toContain('MF');
      expect(card?.textContent).toContain('age 16');
      expect(card?.textContent).toContain('rated 40');
      expect(card?.textContent).not.toMatch(/NaN|undefined|\[object/);
      act(() => { vi.advanceTimersByTime(500); });
      const kid = academy().prospects.find((p: { name: string }) => p.name === 'Stored Kid');
      expect(kid, 'the repaired draw was lost instead of delivered').toMatchObject({ nation: 'England', pos: 'MF', age: 16, rating: 40, potential: 74, tier: 'talent' });
    }
    measured('object-valued saved card fields and inherited nation names render safely and the same repaired kid reaches a bed');
  }, TEST_MS);

  it('10 a refused academy write keeps the paid draw through same-visit recovery and reload', async () => {
    for (const reload of [false, true]) {
      cleanup();
      localStorage.clear();
      seed(100);
      let blocked = true;
      const original = Storage.prototype.setItem;
      let refusals = 0;
      const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
        if (key === SAVE_KEY && blocked) {
          refusals += 1;
          throw new DOMException('No room for the academy save', 'QuotaExceededError');
        }
        original.call(this, key, value);
      });
      mountPage(<WonderkidFactory />, '/wonderkid-factory');
      await openPacks();
      act(() => { fireEvent.click(openButton('club')); });
      const drawn = ledger().pending;
      expect(refusals, 'the storage rejection did not fire').toBeGreaterThan(0);
      expect(drawn, 'the paid draw was not banked').not.toBeNull();
      expect(document.querySelector('[data-pack-save-blocked]'), 'the screen hides the save problem').not.toBeNull();
      expect(document.querySelector('[data-pack-reveal] button'), 'an unsaved delivery can be welcomed').toBeNull();
      expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).prospects.length).toBe(0);
      expect(ledger().spent).toBe(PACKS[1].price);
      if (reload) cleanup();
      blocked = false;
      if (reload) {
        mountPage(<WonderkidFactory />, '/wonderkid-factory');
        await openPacks();
      }
      act(() => { vi.advanceTimersByTime(500); });
      const saved = academy();
      expect(saved.prospects.filter((p: { name: string }) => p.name === drawn.kid.name).length, 'recovery did not deliver the same kid exactly once').toBe(1);
      expect(saved.packsDelivered).toBe(drawn.seq);
      expect(ledger().opened.club, 'recovery charged another pack').toBe(1);
      expect(document.querySelector('[data-pack-save-blocked]')).toBeNull();
      act(() => { fireEvent.click(document.querySelector('[data-pack-reveal] button')!); });
      expect(ledger().pending).toBeNull();
      cleanup();
      writes.mockRestore();
    }
    measured('a paid pack survived refused academy writes, recovered once in the same visit and after reload, with one charge and the original kid');
  }, TEST_MS);

  it('11 dismissal retains the draw when the latest academy state cannot be saved', async () => {
    seed(100);
    mountPage(<WonderkidFactory />, '/wonderkid-factory');
    await openPacks();
    act(() => { fireEvent.click(openButton('club')); });
    const drawn = ledger().pending;
    const original = Storage.prototype.setItem;
    let refusals = 0;
    const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === SAVE_KEY) {
        refusals += 1;
        throw new DOMException('Storage unavailable', 'QuotaExceededError');
      }
      original.call(this, key, value);
    });
    act(() => { fireEvent.click(document.querySelector('[data-pack-reveal] button')!); });
    expect(refusals, 'dismissal did not try to persist the academy').toBeGreaterThan(0);
    expect(ledger().pending?.seq, 'a failed academy save cleared the recovery draw').toBe(drawn.seq);
    expect(document.querySelector('[data-pack-save-blocked]')).not.toBeNull();
    writes.mockRestore();
    act(() => { fireEvent.click(document.querySelector('[data-pack-reveal] button')!); });
    expect(ledger().pending).toBeNull();
    expect(academy().prospects.filter((p: { name: string }) => p.name === drawn.kid.name).length).toBe(1);
    measured('Welcome retained the recovery draw after a refused save and dismissed it once the academy was saved');
  }, TEST_MS);

  it('12 a refused ledger debit cannot deliver a kid or spend gems', async () => {
    seed(100);
    const original = Storage.prototype.setItem;
    let refusals = 0;
    const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === REWARDS_KEY) {
        refusals += 1;
        throw new DOMException('No room for the pack draw', 'QuotaExceededError');
      }
      original.call(this, key, value);
    });
    mountPage(<WonderkidFactory />, '/wonderkid-factory');
    await openPacks();
    act(() => { fireEvent.click(openButton('club')); });
    expect(refusals, 'the ledger rejection did not fire').toBeGreaterThan(0);
    expect(ledger().spent, 'a refused debit spent durable gems').toBe(0);
    expect(ledger().pending).toBeNull();
    expect(document.querySelector('[data-pack-reveal]'), 'a refused debit revealed a kid').toBeNull();
    expect(academy().prospects.length, 'a refused debit delivered a free kid').toBe(0);
    expect(document.querySelector('[data-pack-save-blocked]')).not.toBeNull();
    expect(openButton('club').disabled, 'a refused debit spent gems only in memory').toBe(false);
    cleanup();
    writes.mockRestore();
    mountPage(<WonderkidFactory />, '/wonderkid-factory');
    await openPacks();
    act(() => { fireEvent.click(openButton('club')); });
    expect(ledger().spent).toBe(PACKS[1].price);
    expect(ledger().opened.club).toBe(1);
    expect(academy().prospects.length).toBe(1);
    expect(document.querySelector('[data-pack-save-blocked]')).toBeNull();
    measured('a refused ledger debit delivered no kid and spent no gems, then one paid pack opened after storage recovered');
  }, TEST_MS);
});
