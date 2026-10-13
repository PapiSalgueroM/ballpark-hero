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

describe('the fleet', () => {
  it('holds a real man, a youth pad, an academy graduate and a made up man', () => {
    const kinds = new Set(FLEET.flatMap(name => built.get(name)!.squad.map(kindOf)));
    for (const want of ['real', 'youth', 'academy', 'generated']) {
      expect(kinds.has(want), `the fleet has no ${want} player`).toBe(true);
    }
  });
});
