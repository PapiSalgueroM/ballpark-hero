/* Round 1325: Club Manager's squad list, contracts desk, dressing room and career card tell the truth.

   Every real man's wage and years left are this game's own numbers (a formula and a hash of his name, or whatever
   you renewed him at), and the game holds nobody's real contract. So every place one of the four screens prints a
   real man's wage or years beside his name says so, and no made up man (generated, a youth pad, an academy kid)
   carries that line, because his whole person is the game's already. The worst defeat prints our score first.
   And none of it draws a random number or changes a byte of the career while it renders.

   The careers are real ones from the engine: startCareer for real clubs, the four committed old saves loaded the
   way the page loads them, an academy kid promoted through promoteProspect and a made up journeyman signed through
   signFreeAgent. No player, record or result is invented here. Whether a man is real is decided by this file's
   own rule, never by the screens' predicate, so a screen that gets the rule wrong is caught.

   Sections (scripts/simCmTablesTruth.mjs runs this file and its controls):
     1 the contracts desk, every non loan man in his final year and every "Show the other" pressed
     2 the squad list, every row opened
     3 the dressing room, every rung and every man opened and backed out of
     4 the career card's worst defeat, low number first
     5 every render above draws nothing and leaves the career byte equal
     6 nothing drawn reads undefined, NaN, [object Object] or Infinity */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ContractsCard } from '@/components/club-manager/ContractsCard';
import { SquadScreen } from '@/components/club-manager/SquadScreen';
import { RolesScreen } from '@/components/club-manager/RolesScreen';
import ClubManagerCareerPanel from '@/components/club-manager/ClubManagerCareerPanel';
import {
  startCareer, loadCareer, SAVE_KEY, ensureFreeAgents, signFreeAgent, promoteProspect, playNextEntry,
  type CareerState, type CMPlayer, type Prospect,
} from '@/lib/clubManager';

/* ---------------- this file's own rule for who is real ---------------- */

const isReal = (p: CMPlayer) => !p.generated && !p.isYouth && !p.academyGrad;
const kindOf = (p: CMPlayer) => (p.generated ? 'generated' : p.isYouth ? 'youth' : p.academyGrad ? 'academy' : 'real');

/* ---------------- a seeded stream, so the fleet is the same every run ---------------- */

function seeded(seed: number): () => number {
  let x = (seed >>> 0) || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
function withSeed<T>(seed: number, fn: () => T): T {
  const was = Math.random;
  Math.random = seeded(seed);
  try { return fn(); } finally { Math.random = was; }
}

/* ---------------- the fleet ---------------- */

const FIXTURES: Record<string, string> = {
  'Sevilla old save (Round 1052)': 'scripts/data/cmOldSave1052Fixture.json',
  'Valencia second tier old save': 'scripts/data/cmSecondTierOldSaveFixture.json',
  'Everton book save': 'scripts/data/cmBookSaveEvertonFixture.json',
  'Hertha book save': 'scripts/data/cmBookSaveHerthaFixture.json',
};

function fromFixture(file: string): CareerState {
  const raw = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
  localStorage.setItem(SAVE_KEY, raw);
  const c = loadCareer();
  localStorage.removeItem(SAVE_KEY);
  if (!c) throw new Error(`${file} did not load`);
  return c;
}

/** A made up kid for the academy career, not a real person, promoted by the engine's own promoteProspect. */
function kid(season: number): Prospect {
  return { id: 'r1325-kid', name: 'Fixture Academy Kid', position: 'CM', age: 17, rating: 58, potential: 78, lowGuess: 70, highGuess: 82, source: 'Academy', flag: '', fee: 0.5, season };
}

const BUILDERS: Record<string, () => CareerState> = {
  'Liverpool 2026-27': () => startCareer('Liverpool'),
  'Dundee 2026-27': () => startCareer('Dundee'),
  'Everton 2005-06': () => startCareer('Everton', 'era2005'),
  'OB 2026-27': () => startCareer('OB'),
  'Brentford with an academy graduate': () => {
    const c = startCareer('Brentford');
    const withKid: CareerState = { ...c, academy: { recruitment: 5, coaching: 5, facilities: 5, scouts: [], candidates: [], prospects: [kid(c.season)], lastIntakeSeason: c.season } };
    const next = promoteProspect(withKid, 'r1325-kid');
    if (!next) throw new Error('promoteProspect refused the academy kid');
    return next;
  },
  'Brentford with a made up free agent signed': () => {
    const c = startCareer('Brentford');
    ensureFreeAgents(c);
    for (const f of c.freeAgents ?? []) {
      if (!f.generated) continue;
      const next = signFreeAgent(c, f.name);
      if (next) return next;
    }
    throw new Error('no made up free agent would sign for Brentford');
  },
  ...Object.fromEntries(Object.entries(FIXTURES).map(([name, file]) => [name, () => fromFixture(file)])),
};
const FLEET = Object.keys(BUILDERS);
const built = new Map<string, CareerState>();

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  FLEET.forEach((name, i) => built.set(name, withSeed(1325 + i, BUILDERS[name])));
}, 240000);
afterEach(cleanup);

/** A deep copy, so nothing a render does can reach the fleet. */
const career = (name: string): CareerState => JSON.parse(JSON.stringify(built.get(name)));

const hooks = () => ({
  resignNation: vi.fn(), acceptNation: vi.fn(), answerApproach: vi.fn(),
  applyJob: vi.fn(), joinNow: vi.fn(), joinSummer: vi.fn(), updateManager: vi.fn(),
});

/* ---------------- walking the four screens ---------------- */

/** Called at every state a walk reaches, with the screen's root and a word for where it is. */
type Look = (root: HTMLElement, where: string) => void;
const noLook: Look = () => {};
const buttons = (root: HTMLElement) => [...root.querySelectorAll('button')];
const attrOf = (root: HTMLElement, attr: string) => [...root.querySelectorAll(`[${attr}]`)].map(e => e.getAttribute(attr) as string);
const byAttr = (root: HTMLElement, attr: string, value: string) => [...root.querySelectorAll(`[${attr}]`)].find(e => e.getAttribute(attr) === value) ?? null;

/** Every non loan man in his final year, so the desk lists everybody it can. */
const allFinal = (c: CareerState): CareerState => ({ ...c, squad: c.squad.map(p => (p.onLoan ? p : { ...p, contractYears: 1 })) });

function walkDesk(c: CareerState, look: Look) {
  const { container } = render(<ContractsCard career={c} onRenew={vi.fn()} onRenewWithClause={vi.fn()} onRelease={vi.fn()} onSignFreeAgent={vi.fn()} />);
  look(container, 'desk');
  for (let i = 0; i < 4; i++) {
    const more = buttons(container).find(b => /^Show the other/.test(b.textContent ?? ''));
    if (!more) break;
    fireEvent.click(more);
  }
  look(container, 'desk, every list shown');
  cleanup();
}

function walkSquad(c: CareerState, look: Look) {
  const { container } = render(<SquadScreen squad={c.squad} xiIds={c.xiIds} eraId={c.eraId} captainId={null} career={c} />);
  look(container, 'squad');
  for (const id of attrOf(container, 'data-cm-squad-row')) {
    const row = byAttr(container, 'data-cm-squad-row', id);
    const open = row?.querySelector('button');
    if (open && open.getAttribute('aria-expanded') !== 'true') fireEvent.click(open);
  }
  look(container, 'squad, every row open');
  cleanup();
}

function walkRoom(c: CareerState, look: Look) {
  const { container } = render(<RolesScreen career={c} onSetRole={vi.fn()} />);
  look(container, 'dressing room');
  for (const rung of attrOf(container, 'data-cm-rung')) {
    fireEvent.click(byAttr(container, 'data-cm-rung', rung) as HTMLElement);
    look(container, `rung ${rung}`);
    for (const id of attrOf(container, 'data-cm-room-row')) {
      fireEvent.click(byAttr(container, 'data-cm-room-row', id) as HTMLElement);
      look(container, `player ${id}`);
      fireEvent.click(byAttr(container, 'data-cm-room-back', 'player') as HTMLElement);
    }
    fireEvent.click(byAttr(container, 'data-cm-room-back', 'rung') as HTMLElement);
  }
  cleanup();
}

function walkCard(c: CareerState, look: Look) {
  const { container } = render(<ClubManagerCareerPanel c={c} g={hooks()} nationOffer={null} />);
  look(container, 'career card');
  cleanup();
}

/** Has this row got the line that says the numbers are this game's? Read off the element and its words both. */
function labelled(row: Element): boolean {
  const el = !!row.querySelector('[data-cm-deal-label]') || row.hasAttribute('data-cm-deal-label');
  const words = /this game's (deal|wage|numbers)/.test(row.textContent ?? '');
  expect(el, `the label element and its words disagree in "${(row.textContent ?? '').slice(0, 120)}"`).toBe(words);
  return el;
}

describe('1 the contracts desk labels a real man\'s deal as this game\'s, and no made up man\'s', { timeout: 300000 }, () => {
  it.each(FLEET)('%s', name => {
    const base = career(name);
    for (const c of [base, allFinal(base)]) {
      let checked = 0;
      walkDesk(c, (root, where) => {
        if (where !== 'desk, every list shown') return;
        const finals = c.squad.filter(p => !p.onLoan && (p.contractYears ?? 9) <= 1);
        const leaving = c.squad.filter(p => !p.onLoan && !p.isYouth && p.age >= 20);
        for (const p of finals) {
          const row = byAttr(root, 'data-cm-final-year', p.id);
          expect(row, `${p.name} has no final year row`).not.toBeNull();
          expect(labelled(row!), `${kindOf(p)} ${p.name}, final year row`).toBe(isReal(p));
          checked += 1;
        }
        for (const p of leaving) {
          const row = byAttr(root, 'data-cm-release-row', p.id);
          expect(row, `${p.name} has no Let somebody go row`).not.toBeNull();
          expect(labelled(row!), `${kindOf(p)} ${p.name}, Let somebody go row`).toBe(isReal(p));
          checked += 1;
        }
        const note = root.querySelector('[data-cm-deal-note="desk"]');
        expect(!!note, 'the desk note shows exactly when a list holds a real man').toBe([...finals, ...leaving].some(isReal));
      });
      expect(checked).toBeGreaterThan(0);
    }
  });
});

describe('2 the squad list labels a real man\'s deal as this game\'s, and no made up man\'s', { timeout: 300000 }, () => {
  it.each(FLEET)('%s', name => {
    const c = career(name);
    walkSquad(c, (root, where) => {
      if (where !== 'squad, every row open') return;
      for (const p of c.squad) {
        const detail = byAttr(root, 'data-cm-squad-detail', p.id);
        expect(detail, `${p.name}'s row did not open`).not.toBeNull();
        expect(labelled(detail!), `${kindOf(p)} ${p.name}, squad row detail`).toBe(isReal(p));
        expect(detail!.querySelectorAll('[data-cm-detail]')).toHaveLength(8);
      }
      expect(!!root.querySelector('[data-cm-deal-note="squad"]'), 'the squad note shows exactly when the squad holds a real man').toBe(c.squad.some(isReal));
    });
  });
});

describe('3 the dressing room labels a real man\'s wage as this game\'s, and no made up man\'s', { timeout: 300000 }, () => {
  it.each(FLEET)('%s', name => {
    const c = career(name);
    const seen = new Set<string>();
    walkRoom(c, (root, where) => {
      if (!where.startsWith('player ')) return;
      const id = where.slice('player '.length);
      const card = root.querySelector('[data-cm-room-player]');
      expect(card?.getAttribute('data-cm-room-player')).toBe(id);
      const p = c.squad.find(x => x.id === id)!;
      expect((p.wage ?? 0) > 0, `${p.name} has no wage to show`).toBe(true);
      expect(labelled(card!), `${kindOf(p)} ${p.name}, dressing room`).toBe(isReal(p));
      seen.add(id);
    });
    expect([...seen].sort()).toEqual(c.squad.map(p => p.id).sort());
  });
});

/** The score a defeat should print: the same two numbers, the lower one first. */
function ourScoreFirst(stored: string): string {
  const [a, b] = stored.split('-').map(Number);
  return `${Math.min(a, b)}-${Math.max(a, b)}`;
}

/** Brentford played on a seed until the engine has stored a defeat, the way a season stores one. */
function playedToADefeat(seed: number): CareerState {
  return withSeed(seed, () => {
    let s = startCareer('Brentford');
    for (let i = 0; i < 60 && !s.careerStats.biggestDefeat && s.week < s.calendar.length; i++) {
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    return s;
  });
}

function defeatLine(c: CareerState): string | null {
  const { container } = render(<ClubManagerCareerPanel c={c} g={hooks()} nationOffer={null} />);
  const line = [...container.querySelectorAll('p')].find(p => p.textContent?.includes('Worst defeat:'));
  const text = line?.textContent?.replace(/^.*Worst defeat:\s*/, '') ?? null;
  cleanup();
  return text;
}

/* What the three committed saves hold and what the card must print for each (the brief's decision 3). */
const STORED_DEFEATS: Record<string, { stored: string; line: string }> = {
  'Everton book save': { stored: '5-1', line: '1-5 vs Newcastle' },
  'Hertha book save': { stored: '3-2', line: '2-3 vs Nürnberg' },
  'Sevilla old save (Round 1052)': { stored: '3-0', line: '0-3 vs Atlético Madrid' },
};

describe('4 the worst defeat reads with our score first', () => {
  it.each(Object.keys(FIXTURES))('%s', name => {
    const c = career(name);
    const stored = c.careerStats.biggestDefeat;
    expect(stored, `${name} holds no worst defeat`).toBeTruthy();
    const want = STORED_DEFEATS[name];
    if (want) expect(stored!.score).toBe(want.stored);
    const line = defeatLine(c);
    expect(line).toBe(want ? want.line : `${ourScoreFirst(stored!.score)} vs ${stored!.opp}`);
  });

  it.each([1, 2, 3])('Brentford after played matches, seed %i', seed => {
    const c = playedToADefeat(seed);
    const stored = c.careerStats.biggestDefeat;
    expect(stored, `seed ${seed} played to week ${c.week} without a defeat`).toBeTruthy();
    const [a, b] = stored!.score.split('-').map(Number);
    expect(a).not.toBe(b);
    expect(defeatLine(c)).toBe(`${ourScoreFirst(stored!.score)} vs ${stored!.opp}`);
  }, 120000);
});

/** Every screen and state this file walks, on one career. */
function walkAll(c: CareerState, look: Look) {
  walkDesk(c, look);
  walkSquad(c, look);
  walkRoom(c, look);
  walkCard(c, look);
}

describe('5 rendering the four screens draws nothing and leaves the career byte equal', { timeout: 300000 }, () => {
  it.each(FLEET)('%s', name => {
    const base = career(name);
    for (const [label, c, walk] of [['every screen', base, walkAll], ['the desk with everybody in his final year', allFinal(base), walkDesk]] as const) {
      const before = JSON.stringify(c);
      const was = Math.random;
      let draws = 0;
      Math.random = () => { draws += 1; return was(); };
      try { walk(c, noLook); } finally { Math.random = was; }
      expect(draws, `${label}: random draws while rendering`).toBe(0);
      expect(JSON.stringify(c) === before, `${label}: the career changed while rendering`).toBe(true);
    }
  });
});

const BROKEN = /\bundefined\b|\bNaN\b|\[object Object\]|\bInfinity\b/;

describe('6 nothing drawn reads undefined, NaN, [object Object] or Infinity', { timeout: 300000 }, () => {
  it.each(FLEET)('%s', name => {
    const base = career(name);
    const bad: string[] = [];
    let states = 0;
    const look: Look = (root, where) => {
      states += 1;
      const texts = [root.textContent ?? '', ...[...root.querySelectorAll('[title]')].map(e => e.getAttribute('title') ?? '')];
      for (const t of texts) {
        const m = BROKEN.exec(t);
        if (m) bad.push(`${where}: "${t.slice(Math.max(0, m.index - 60), m.index + 40)}"`);
      }
    };
    walkAll(base, look);
    walkDesk(allFinal(base), look);
    expect(states).toBeGreaterThan(8);
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe('the fleet', () => {
  it('holds a real man, a youth pad, an academy graduate and a made up man', () => {
    const kinds = new Set(FLEET.flatMap(name => built.get(name)!.squad.map(kindOf)));
    for (const want of ['real', 'youth', 'academy', 'generated']) {
      expect(kinds.has(want), `the fleet has no ${want} player`).toBe(true);
    }
  });
});
