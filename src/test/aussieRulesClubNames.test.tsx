/* Round 1572: every club name a player can see on Aussie Rules Manager, pulled out of the screens
   structurally (never by searching for the names we expect) and held to the two sourced 2026 list.
   Run by scripts/simAflClubNames.mjs section 4, which also proves its control fires. */
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AussieRulesLeagueBoard from '@/components/aussie-rules-manager/AussieRulesLeagueBoard';
import AussieRulesManager from '@/pages/AussieRulesManager';
import { CLUBS, clubOf, createLeague, draftPool, pickRefusal, readLeagueSave, reduceLeague, SAVE_KEY, switchClubSet, type ClubSetId, type LeagueAction, type LeagueState } from '@/lib/aussieRulesLeague';
import { AFL_CLUBS_2026 } from '@/data/aflClubs2026';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => <nav>Fixture navigation</nav> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const COUNTER = { direct: 'control', pressure: 'direct', control: 'pressure' } as const;
const bot = (s: LeagueState): LeagueAction => s.phase === 'prepare' ? (s.match ? { type: 'prepare', choice: 'train' } : { type: 'simWeek' })
  : s.phase === 'quarter' || s.phase === 'break' ? { type: 'playMatch', tactic: COUNTER[clubOf(s, s.match!.homeId === s.myClub ? s.match!.awayId : s.match!.homeId)!.style] }
  : s.phase === 'draft' && s.draft!.at < s.draft!.order.length ? { type: 'draftAuto' } : { type: 'next' };
const until = (s: LeagueState, done: (s: LeagueState) => boolean) => { let state = s; for (let n = 0; !done(state) && n < 5000; n += 1) state = reduceLeague(state, bot(state)); expect(done(state)).toBe(true); return state; };
const store = (state: LeagueState) => localStorage.setItem(SAVE_KEY, JSON.stringify(state));
const words = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
/** A screen's text without the switch card, the one place an invented league career names a real club on purpose. */
const textOf = (el: Element) => { const copy = el.cloneNode(true) as Element; copy.querySelectorAll('[data-arl-switch]').forEach(card => card.remove()); return words(copy.textContent); };

const REAL_FULL = new Set(AFL_CLUBS_2026.map(c => c.full)), REAL_SHORT = new Set(AFL_CLUBS_2026.map(c => c.short));
const FAKE_FULL = new Set(CLUBS.map(c => `${c.place} ${c.nickname}`)), FAKE_SHORT = new Set(CLUBS.map(c => c.place));
const BANDS = ['Finished 1st to 3rd in 2026', 'Finished 4th to 7th in 2026', 'Finished 8th to 11th in 2026', 'Finished 12th to 15th in 2026', 'Finished 16th to 18th in 2026'];
const has = (text: string, name: string) => new RegExp(`(^|[^A-Za-z])${name}([^A-Za-z]|$)`).test(text);

type Pulled = Record<'header' | 'hub' | 'premier' | 'score' | 'events' | 'results' | 'ladder' | 'finals' | 'history' | 'draft' | 'switchFrom' | 'switchTo', string[]>;
const TIE = /^(?:[A-Za-z ]+: )?(.+?)(?: \d+\.\d+ \(\d+\))? v (.+?)(?: \d+\.\d+ \(\d+\))?(?: \(after extra time\))?$/;
function pair(text: string, into: string[]) { const m = TIE.exec(words(text)); expect(m, `a fixture line: ${text}`).not.toBeNull(); into.push(m![1], m![2]); }

/** Opens every panel the hub offers and pulls each club string out by where it sits on the screen. */
function pullAll(view: ReturnType<typeof render>, mine: () => void, texts: string[]): Pulled {
  const out: Pulled = { header: [], hub: [], premier: [], score: [], events: [], results: [], ladder: [], finals: [], history: [], draft: [], switchFrom: [], switchTo: [] };
  const box = view.container;
  out.header.push(words(box.querySelector('header p')!.textContent).split(' · Season')[0]);
  const next = view.getByText('Next match', { selector: 'div' }).closest('button')!;
  const sub = [...next.querySelectorAll('div')].map(d => words(d.textContent)).find(t => t.startsWith('v '));
  if (sub) out.hub.push(sub.slice(2));
  const lost = box.querySelector('[data-arl-premier]');
  if (lost) { const m = /^(.+?) are the premiers, beating (.+?) \d+\.\d+ \(\d+\) to/.exec(words(lost.textContent)); expect(m).not.toBeNull(); out.premier.push(m![1], m![2]); }
  const titles = [...box.querySelectorAll('button div')].map(d => words(d.textContent)).filter(t => ['Next match', 'Ladder', 'Squad', 'Finals', 'Club', 'Draft'].includes(t));
  for (const title of titles) {
    fireEvent.click(view.getByText(title, { selector: 'div' }).closest('button')!);
    for (const strong of box.querySelectorAll('[data-arl-score] strong')) out.score.push(words(strong.textContent));
    for (const li of box.querySelectorAll('[data-arl-match] details li')) { const m = /^[^:]+: (.+?), (.+?), (?:goal|behind) \(/.exec(words(li.textContent)); expect(m, li.textContent ?? '').not.toBeNull(); out.events.push(m![2]); }
    for (const li of box.querySelectorAll('[data-arl-match] ul li')) pair(li.textContent ?? '', out.results);
    for (const th of box.querySelectorAll('[data-arl-ladder] th')) out.ladder.push(words(th.textContent).replace(/^\d+\. /, ''));
    for (const li of box.querySelectorAll('[data-arl-final]')) pair(li.textContent ?? '', out.finals);
    for (const li of box.querySelectorAll('[data-arl-history]')) {
      const text = words(li.textContent);
      const m = /Premiers: (.+?), beating (.+?) \d+\.\d+ \(\d+\) to .*Most goals: .+? \((.+?)\), \d+\.$/.exec(text);
      expect(m, text).not.toBeNull(); out.history.push(m![1], m![2], m![3]);
    }
    if (title === 'Draft') mine();
    for (const row of box.querySelectorAll('.fo-draft-row span.truncate')) { const m = /^\d+\. (.+?) (?:take|select) /.exec(words(row.textContent)); expect(m, row.textContent ?? '').not.toBeNull(); out.draft.push(m![1]); }
    for (const card of box.querySelectorAll('[data-arl-switch] p')) { const m = /^Play on with the real AFL club names\? (.+?) become (.+?)\. Players/.exec(words(card.textContent)); expect(m, card.textContent ?? '').not.toBeNull(); out.switchFrom.push(m![1]); out.switchTo.push(m![2]); }
    texts.push(textOf(box));
    fireEvent.click(view.getByRole('button', { name: /Hub/ }));
  }
  return out;
}

/** Five moments of one career in a set: prepare, a played match, finals week 1, season over, and the draft after one pick. */
function moments(set: ClubSetId | undefined) {
  // Seed 6: club-17 has three picks at its first draft (seed 5 has none, so no draft card to read).
  const start = set ? createLeague(6, 'club-17', set)! : createLeague(6, 'club-17')!;
  const played = until(start, s => s.phase === 'report');
  const finals = until(played, s => s.stage === 'finals' && s.phase === 'report' && s.week === 0);
  const over = until(finals, s => s.phase === 'seasonOver');
  const draft = until(over, s => s.phase === 'draft');
  return [start, played, finals, over, draft];
}
/** Every moment rendered on its own board: the strings pulled, and the text of the hub and of every panel. */
function screens(set: ClubSetId | undefined) {
  const pulled: Pulled[] = [], texts: string[] = [];
  for (const state of moments(set)) {
    cleanup(); localStorage.clear(); store(state);
    const view = render(<MemoryRouter><AussieRulesLeagueBoard /></MemoryRouter>);
    const pickOne = () => {
      if (state.phase !== 'draft') return;
      const ok = draftPool(state).find(p => pickRefusal(state, p.id) === null)!;
      fireEvent.click(view.container.querySelector(`[data-arl-prospect="${ok.id}"]`)!);
    };
    pulled.push(pullAll(view, pickOne, texts));
    texts.push(textOf(view.container));
  }
  return { pulled, texts };
}
const KEYS = ['header', 'hub', 'premier', 'score', 'events', 'results', 'ladder', 'finals', 'history', 'draft'] as const;
const counts = (all: Pulled[]) => Object.fromEntries(KEYS.map(k => [k, all.reduce((n, p) => n + p[k].length, 0)])) as Record<typeof KEYS[number], number>;
/** The full form sits on the header and the score card; every other screen prints the short form. */
const strays = (all: Pulled[], full: Set<string>, short: Set<string>) => all.flatMap(p => KEYS.flatMap(k => p[k].filter(name => !(k === 'header' || k === 'score' ? full : short).has(name)).map(name => `${k}: ${name}`)));

describe('Aussie Rules Manager club names (Round 1572)', () => {
  it('(i) a new career picks from the 18 AFL clubs by name, under the five 2026 ladder bands', () => {
    const view = render(<MemoryRouter><AussieRulesManager /></MemoryRouter>);
    const rules = view.queryByRole('dialog');
    if (rules) fireEvent.click(within(rules).getByRole('button', { name: "Let's Play!" }));
    const menu = view.container.querySelector('[data-arl-phase="menu"]')!;
    expect([...menu.querySelectorAll('h3')].map(h => words(h.textContent))).toEqual(BANDS);
    const groups = [...menu.querySelectorAll('h3')].map(h => [...h.parentElement!.querySelectorAll('[data-arl-club] strong')].map(s => words(s.textContent)));
    const edges = [0, 3, 7, 11, 15, 18];
    expect(groups).toEqual(edges.slice(0, 5).map((low, i) => AFL_CLUBS_2026.filter(c => c.ladder2026 > low && c.ladder2026 <= edges[i + 1]).map(c => c.full)));
    const names = [...menu.querySelectorAll('[data-arl-club] strong')].map(s => words(s.textContent));
    expect(names).toHaveLength(18);
    expect(names.filter(name => !REAL_FULL.has(name) || FAKE_FULL.has(name))).toEqual([]);
    expect([...menu.querySelectorAll('[data-arl-club] span')].every(s => / style in this game · 36 players$/.test(words(s.textContent)))).toBe(true);
    expect(words(menu.textContent)).not.toMatch(/Battlers|Contenders|fictional/);
    fireEvent.click(menu.querySelector('[data-arl-club="club-17"]')!);
    const saved = readLeagueSave(localStorage.getItem(SAVE_KEY))!;
    expect(saved.clubSet).toBe('afl2026');
    expect(saved.clubName).toBe('Essendon');
    expect(words(view.container.querySelector('section[data-arl-phase] header p')!.textContent)).toBe('Essendon · Season 1');
  });

  it('(ii) a real club career prints only two sourced club names on every panel', () => {
    const { pulled, texts } = screens('afl2026');
    const n = counts(pulled);
    console.log(`real set pulled: ${JSON.stringify(n)}`);
    for (const key of ['header', 'hub', 'score', 'events', 'results', 'ladder', 'finals', 'history', 'draft'] as const) expect(n[key], `${key} strings pulled`).toBeGreaterThan(0);
    expect(n.ladder).toBe(90);
    expect(strays(pulled, REAL_FULL, REAL_SHORT)).toEqual([]);
    expect(texts.length).toBeGreaterThan(20);
    expect(texts.flatMap(text => [...FAKE_SHORT].filter(place => has(text, place)))).toEqual([]);
    expect(pulled.flatMap(p => p.switchTo), 'a real career is never offered the switch').toEqual([]);
  });

  it('(iii) a career with no club set prints only its own invented names', () => {
    const { pulled, texts } = screens(undefined);
    const n = counts(pulled);
    console.log(`invented set pulled: ${JSON.stringify(n)}`);
    for (const key of ['header', 'hub', 'score', 'events', 'results', 'ladder', 'finals', 'history', 'draft'] as const) expect(n[key], `${key} strings pulled`).toBeGreaterThan(0);
    expect(strays(pulled, FAKE_FULL, FAKE_SHORT)).toEqual([]);
    expect(texts.flatMap(text => [...REAL_FULL, ...REAL_SHORT].filter(name => has(text, name)))).toEqual([]);
    /* The one real name an old career sees is the offer to switch, on its Club panel at every moment. */
    expect(pulled.flatMap(p => p.switchFrom)).toEqual(Array(5).fill(`${CLUBS[17].place} ${CLUBS[17].nickname}`));
    expect(pulled.flatMap(p => p.switchTo)).toEqual(Array(5).fill('Essendon'));
  });

  it('(iv) the Club panel switches an old career to the real names, after one cancel', () => {
    const before = until(createLeague(5, 'club-17')!, s => s.round === 3 && s.phase === 'report');
    store(before);
    const view = render(<MemoryRouter><AussieRulesLeagueBoard /></MemoryRouter>);
    const box = view.container;
    fireEvent.click(view.getByText('Ladder', { selector: 'div' }).closest('button')!);
    const order = [...box.querySelectorAll('[data-arl-ladder]')].map(row => row.getAttribute('data-arl-ladder'));
    const numbers = [...box.querySelectorAll('[data-arl-ladder] td')].map(td => words(td.textContent));
    fireEvent.click(view.getByRole('button', { name: /Hub/ }));
    fireEvent.click(view.getByText('Club', { selector: 'div' }).closest('button')!);
    expect(box.querySelector('[data-arl-switchconfirm]')).toBeNull();
    fireEvent.click(box.querySelector('[data-arl-switchask]')!);
    fireEvent.click(box.querySelector('[data-arl-switchkeep]')!);
    expect(localStorage.getItem(SAVE_KEY)).toBe(JSON.stringify(before));
    expect(box.querySelector('[data-arl-switchask]')).not.toBeNull();
    fireEvent.click(box.querySelector('[data-arl-switchask]')!);
    fireEvent.click(box.querySelector('[data-arl-switchconfirm]')!);
    expect(localStorage.getItem(SAVE_KEY)).toBe(JSON.stringify(switchClubSet(before)));
    expect(readLeagueSave(localStorage.getItem(SAVE_KEY))).toEqual(switchClubSet(before));
    expect(box.querySelector('[data-arl-switch]')).toBeNull();
    expect(words(box.querySelector('header p')!.textContent)).toBe('Essendon · Season 1');
    fireEvent.click(view.getByRole('button', { name: /Hub/ }));
    fireEvent.click(view.getByText('Ladder', { selector: 'div' }).closest('button')!);
    expect([...box.querySelectorAll('[data-arl-ladder]')].map(row => row.getAttribute('data-arl-ladder'))).toEqual(order);
    expect([...box.querySelectorAll('[data-arl-ladder] td')].map(td => words(td.textContent))).toEqual(numbers);
    expect([...box.querySelectorAll('[data-arl-ladder] th')].map(th => words(th.textContent).replace(/^\d+\. /, '')).every(name => REAL_SHORT.has(name))).toBe(true);
  });
});

beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockReturnValue(0.25); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
