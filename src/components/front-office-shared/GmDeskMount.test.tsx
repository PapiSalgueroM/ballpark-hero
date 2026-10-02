/**
 * Round 907: the GM desk mount, on all four sports.
 *
 * The mount is a seam: nothing a player sees ships with it. So this file
 * mounts it the way a bound board will, with two toy systems written against
 * the real contract (their own block key, validator and fresh value), and
 * checks the promises the brief makes: an empty list draws nothing, a box
 * opens onto its panel alone with a way back, a panel's write lands in its
 * own block and no other, and a corrupt block costs that block only.
 *
 * scripts/simGmDesk.mjs carries the outcome checks and the negative controls;
 * this is the taps.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { GmDeskMount } from './GmDeskMount';
import {
  freshGmDesk, gmBlock, withGmBlock, readGmDesk,
  type GmDesk, type GmFacts, type GmPanelDef,
} from '@/lib/gmDesk';
import { GM_SPORT_KEYS, GM_SPORTS, type GmSportKey } from '@/lib/gmSport';
import type { FoHubFacts } from '@/lib/foHub';

afterEach(cleanup);

const HUB: FoHubFacts = {
  roster: [], freeAgents: [], capRoom: 12, wins: 3, losses: 1, period: 5, periods: 17,
  playWord: 'Play', periodWord: 'round', hasFixtures: false, nextOpponent: null, lastResult: null,
  place: 2, cut: 8, tableName: 'the conference', tradeLine: null, titles: 0,
};
const FACTS: GmFacts = { teamId: 'AAA', teamLabel: 'Test City Testers', seasonsPlayed: 2, phase: 'hub', hub: HUB };

/* Toy system one: a counter in its own block. */
interface Tally { n: number }
const isTally = (v: unknown): v is Tally =>
  typeof v === 'object' && v !== null && Number.isInteger((v as Tally).n) && (v as Tally).n >= 0;
const freshTally = (): Tally => ({ n: 0 });
const TALLY: GmPanelDef = {
  key: 'tally',
  title: 'Tally',
  tile: ({ desk, sport }) => {
    const t = gmBlock(desk, 'tally', isTally, freshTally);
    return { icon: '#', value: `${t.n} counted`, sub: `per ${sport.words.period}`, accent: t.n === 0 };
  },
  Panel: ({ desk, sport, facts, onDesk }) => {
    const t = gmBlock(desk, 'tally', isTally, freshTally);
    return (
      <div>
        <p data-testid="tally-line">{facts.teamLabel}: {t.n} in {sport.words.league}, chasing {sport.words.title}</p>
        <button onClick={() => onDesk(withGmBlock(desk, 'tally', { n: t.n + 1 }))}>Count one</button>
      </div>
    );
  },
};

/* Toy system two: a panel with a hook of its own, to prove a panel is a real
   component and opening and closing it never moves the mount's hook order. */
const NOTES: GmPanelDef = {
  key: 'notes',
  title: 'Notes',
  tile: ({ facts }) => (facts.seasonsPlayed > 0 ? { icon: 'N', value: 'Open', sub: `after ${facts.seasonsPlayed} seasons`, accent: false } : null),
  Panel: ({ onBack }) => {
    const [taps, setTaps] = useState(0);
    return (
      <div>
        <p data-testid="notes-taps">taps {taps}</p>
        <button onClick={() => setTaps(n => n + 1)}>Tap</button>
        <button onClick={onBack}>Done</button>
      </div>
    );
  },
};

/** The board's half of the wiring: it holds what is open and it holds the desk. */
function Host({ sport, panels, initial, startOpen = null, facts = FACTS, onSaved }: {
  sport: GmSportKey; panels: readonly GmPanelDef[]; initial?: GmDesk; startOpen?: string | null; facts?: GmFacts;
  onSaved?: (d: GmDesk) => void;
}) {
  const [open, setOpen] = useState<string | null>(startOpen);
  const [desk, setDesk] = useState<GmDesk>(initial ?? freshGmDesk());
  return (
    <div data-testid="host">
      <GmDeskMount sport={sport} desk={desk} facts={facts} panels={panels} open={open} onOpen={setOpen}
        onDesk={d => { setDesk(d); onSaved?.(d); }} />
    </div>
  );
}

describe('GmDeskMount', () => {
  it.each(GM_SPORT_KEYS)('%s: an empty panel list draws nothing', sport => {
    render(<Host sport={sport} panels={[]} />);
    expect(screen.getByTestId('host').innerHTML).toBe('');
  });

  it.each(GM_SPORT_KEYS)('%s: a box opens onto its panel alone, and Hub comes back', sport => {
    render(<Host sport={sport} panels={[TALLY, NOTES]} />);
    expect(screen.getByText('Tally')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();
    expect(screen.getByText(`per ${GM_SPORTS[sport].words.period}`)).toBeTruthy();

    fireEvent.click(screen.getByText('Tally'));
    /* the panel, in this sport's words, and no boxes under it */
    expect(screen.getByTestId('tally-line').textContent).toBe(
      `Test City Testers: 0 in ${GM_SPORTS[sport].words.league}, chasing ${GM_SPORTS[sport].words.title}`);
    expect(screen.queryByText('Notes')).toBeNull();
    expect(document.querySelector('[data-gm-desk="tiles"]')).toBeNull();
    expect(document.querySelector('[data-gm-panel="tally"]')).not.toBeNull();

    fireEvent.click(screen.getByText('Hub'));
    expect(screen.getByText('Notes')).toBeTruthy();
    expect(document.querySelector('[data-gm-desk="panel"]')).toBeNull();
  });

  it('a panel writes its own block and leaves every other block alone', () => {
    const saved: GmDesk[] = [];
    const initial = withGmBlock(withGmBlock(freshGmDesk(), 'tally', { n: 4 }), 'someoneElse', { keep: ['me'] });
    render(<Host sport="nba" panels={[TALLY]} initial={initial} startOpen="tally" onSaved={d => saved.push(d)} />);
    fireEvent.click(screen.getByText('Count one'));
    fireEvent.click(screen.getByText('Count one'));
    expect(saved).toHaveLength(2);
    expect(saved[1].blocks.tally).toEqual({ n: 6 });
    expect(saved[1].blocks.someoneElse).toEqual({ keep: ['me'] });
    expect(screen.getByTestId('tally-line').textContent).toContain(': 6 in the NBA');
    /* and the whole thing survives the trip through a save */
    expect(readGmDesk(JSON.parse(JSON.stringify(saved[1])))).toEqual(saved[1]);
  });

  it('a corrupt block resets that block alone', () => {
    const initial = readGmDesk({ v: 1, blocks: { tally: { n: 'lots' }, someoneElse: { keep: ['me'] } } });
    const saved: GmDesk[] = [];
    render(<Host sport="mlb" panels={[TALLY]} initial={initial} onSaved={d => saved.push(d)} />);
    expect(screen.getByText('0 counted')).toBeTruthy();
    fireEvent.click(screen.getByText('Tally'));
    fireEvent.click(screen.getByText('Count one'));
    expect(saved[0].blocks).toEqual({ tally: { n: 1 }, someoneElse: { keep: ['me'] } });
  });

  it('a box whose tile says null is left off, and a hub with no boxes draws nothing', () => {
    const rookie: GmFacts = { ...FACTS, seasonsPlayed: 0 };
    const first = render(<Host sport="nhl" panels={[TALLY, NOTES]} facts={rookie} />);
    expect(screen.getByText('Tally')).toBeTruthy();
    expect(screen.queryByText('Notes')).toBeNull();
    first.unmount();
    render(<Host sport="nhl" panels={[NOTES]} facts={rookie} />);
    expect(screen.getByTestId('host').innerHTML).toBe('');
  });

  it('a key that names no panel shows the hub, and a tile key opens the same panel a panel key does', () => {
    const first = render(<Host sport="nfl" panels={[TALLY, NOTES]} startOpen="gone" />);
    expect(document.querySelector('[data-gm-desk="tiles"]')).not.toBeNull();
    first.unmount();
    render(<Host sport="nfl" panels={[TALLY, NOTES]} startOpen="gm:notes" />);
    expect(document.querySelector('[data-gm-panel="notes"]')).not.toBeNull();
  });

  it('a panel with hooks of its own survives being opened, closed and opened again', () => {
    render(<Host sport="nfl" panels={[TALLY, NOTES]} />);
    fireEvent.click(screen.getByText('Notes'));
    fireEvent.click(screen.getByText('Tap'));
    expect(screen.getByTestId('notes-taps').textContent).toBe('taps 1');
    fireEvent.click(screen.getByText('Done'));
    fireEvent.click(screen.getByText('Tally'));
    fireEvent.click(screen.getByText('Hub'));
    fireEvent.click(screen.getByText('Notes'));
    expect(screen.getByTestId('notes-taps').textContent).toBe('taps 0');
  });

  it('a panel written against the base facts mounts on a board whose facts carry more', () => {
    interface BoardFacts extends GmFacts { pickLedger: number[] }
    const facts: BoardFacts = { ...FACTS, pickLedger: [1, 2] };
    const wants: GmPanelDef<BoardFacts> = {
      key: 'picks', title: 'Picks',
      tile: ({ facts: f }) => ({ icon: 'P', value: `${f.pickLedger.length} picks`, sub: 'this draft', accent: false }),
      Panel: () => null,
    };
    /* the compile is the test: a base panel sits in a wider board's list */
    const list: readonly GmPanelDef<BoardFacts>[] = [TALLY, wants];
    render(<GmDeskMount sport="nba" desk={freshGmDesk()} facts={facts} panels={list} open={null} onOpen={() => {}} onDesk={() => {}} />);
    expect(screen.getByText('2 picks')).toBeTruthy();
    expect(screen.getByText('Tally')).toBeTruthy();
  });
});
