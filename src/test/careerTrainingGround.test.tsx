/* Round 913: the training ground fixture.

   The four Round 81 drills (cone run, burst tap, zone pick with the keeper
   save mode, gate tap) moved out of the one 531 line Soccer Career panel into
   src/components/career/drills behind a sport skin. Soccer Career is one in
   five pageviews, so the move had to change nothing a player can see or feel.

   This file is how that was held. BEFORE any code moved it played scripted
   taps against the panel as it stood on origin/main a4433f41 (seeded
   Math.random, fake timers, a fixed clock) and wrote what the panel showed
   after every tap into careerTrainingGround.fixture.json: the dialog's text,
   a hash of the whole rendered markup, how many random draws had been used,
   and what the callbacks received. Every run since replays the same taps and
   has to get the same bytes.

   Record again (only ever from a tree whose behaviour you mean to pin):
     RECORD_TRAINING_FIXTURE=1 vitest run src/test/careerTrainingGround.test.tsx
   The recorder was proved honest when it was written: two recordings gave the
   same bytes, and a scratch copy of the panel with one constant changed went
   red on replay: of 43 tests, the keeper tell 650 to 700 failed 7, the gate
   window 1400 to 1300 failed 6, the cone slip 8 to 9 failed 2, and the miss
   chance 0.12 to 0.2 failed 1 (the one script that drew between the two).
   scripts/simCareerTraining.mjs keeps those four as standing controls. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import TrainingGround from '@/components/career/TrainingGround';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { RATING_TRAINING, trainingTier, type TrainingDrillSkin, type TrainingSport } from '@/lib/careerTraining';
import { NFL_TRAINING_POSITIONS, nflTraining } from '@/lib/nflCareerTraining';
import { NBA_TRAINING_POSITIONS, nbaTraining } from '@/lib/nbaCareerTraining';
import { MLB_TRAINING_POSITIONS, mlbTraining } from '@/lib/mlbCareerTraining';
import { NHL_TRAINING_POSITIONS, nhlTraining } from '@/lib/nhlCareerTraining';

const FIXTURE = path.resolve(process.cwd(), 'src/test/careerTrainingGround.fixture.json');
const RECORD = process.env.RECORD_TRAINING_FIXTURE === '1';
const RECORDED_FROM = 'origin/main a4433f41';

/** mulberry32: small, seedable, and the same on every machine. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const career = (position: string) => ({
  position, overall: 70, potential: 80, potentialEarned: 0,
  seasons: [{ year: 2031 }], trainingSeasonYear: 2030,
  statBoostNextSeason: {}, morale: 50, events: [],
} as unknown as CareerState);

interface Snap { at: string; text: string; html: string; draws: number }
interface Recorded { trace: Snap[]; calls: string[] }

class Run {
  trace: Snap[] = [];
  calls: string[] = [];
  view: ReturnType<typeof render>;
  constructor(position: string, available: boolean) {
    this.view = render(
      <TrainingPanel
        career={career(position)}
        available={available}
        onComplete={(drill, score) => { this.calls.push(`complete ${drill} ${score}`); }}
        onDrill={(kind, count) => { this.calls.push(`drill ${kind} ${count}`); }}
        onClose={() => { this.calls.push('close'); }}
      />,
    );
  }
  snap(at: string) {
    const dialog = this.view.container.querySelector('[role="dialog"]');
    this.trace.push({
      at,
      text: (dialog?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      html: createHash('sha256').update(this.view.container.innerHTML).digest('hex').slice(0, 16),
      draws: vi.mocked(Math.random).mock.calls.length,
    });
  }
  wait(ms: number) { act(() => { vi.advanceTimersByTime(ms); }); }
  button(name: string | RegExp) { return this.view.getByRole('button', { name }); }
  tap(name: string | RegExp) { fireEvent.click(this.button(name)); }
  zones() { return [...this.view.container.querySelectorAll<HTMLButtonElement>('[data-training-zone]')]; }
  /** Bank the result, walk back to the career, and note what the callbacks got. */
  bank() {
    this.snap('result');
    this.tap('Bank the session');
    this.snap('banked');
    this.tap('Back to your career');
    this.snap('closed');
  }
  done(): Recorded { return { trace: this.trace, calls: this.calls }; }
}

interface Script { name: string; position: string; seed: number; available?: boolean; play: (run: Run) => void }
const SCRIPTS: Script[] = [];
const script = (name: string, position: string, seed: number, play: (run: Run) => void, available = true) => {
  SCRIPTS.push({ name, position, seed, available, play });
};

/* ── the menu, open and shut, for an outfielder and a keeper ── */
for (const position of ['ST', 'GK', 'CB']) {
  script(`menu open ${position}`, position, 1, run => { run.snap('menu'); });
  script(`menu shut ${position}`, position, 1, run => { run.snap('menu'); run.tap('Close'); run.snap('closed'); }, false);
}

/* ── cone run: numbers are cone taps, strings wait that many milliseconds ── */
const cones = (name: string, position: string, steps: Array<number | string>) => {
  script(`cones ${name} ${position}`, position, 7, run => {
    run.tap(/Cone Slalom/);
    run.snap('open');
    for (const step of steps) {
      if (typeof step === 'string') { run.wait(Number(step)); run.snap(`wait ${step}`); continue; }
      run.tap(String(step));
      run.snap(`cone ${step}`);
    }
    run.bank();
  });
};
cones('clean and quick', 'ST', [1, '300', 2, '300', 3, '300', 4, '300', 5, '300', 6, '300', 7, '300', 8]);
cones('five slips', 'ST', [2, 2, 2, 2, 2, 1, 2, 3, 4, 5, 6, 7, 8]);
cones('slow and sloppy', 'CB', [3, 1, '1250', 2, 5, '1250', 3, '1250', 4, '1250', 5, 1, '1250', 6, '1250', 7, '1250', 8]);
cones('so slow it floors', 'GK', [1, '9000', 2, '9000', 3, 4, 5, 6, 7, 7, 3, 2, 1, 4, 5, 6, '4000', 8]);
script('cones back out and start over ST', 'ST', 7, run => {
  run.tap(/Cone Slalom/);
  for (const n of [1, 2, 3]) { run.tap(String(n)); run.wait(450); }
  run.tap('5');
  run.snap('three cones in, one slip');
  run.tap('‹ Drills');
  run.snap('menu');
  run.wait(700);
  run.tap(/Cone Slalom/);
  run.snap('reopened');
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) { run.tap(String(n)); run.wait(520); run.snap(`cone ${n}`); }
  run.bank();
});

/* ── burst tap: tap count, and the gap between taps ── */
const burst = (taps: number, gap: number, position = 'ST') => {
  script(`burst ${taps} taps ${position}`, position, 11, run => {
    run.tap(/Sprint Burst/);
    run.snap('open');
    run.tap(/Tap to start the 5 second sprint/);
    run.snap('started');
    for (let i = 0; i < taps; i++) { run.tap(/GO GO GO/); if (gap) run.wait(gap); if (i % 7 === 0) run.snap(`tap ${i + 1}`); }
    run.tap('‹ Drills');
    run.snap('back is dead while it runs');
    run.wait(5000);
    run.bank();
  });
};
burst(0, 0);
burst(9, 310);
burst(16, 150, 'GK');
burst(25, 90);
burst(31, 40);
burst(40, 20, 'CB');

/* ── zone pick, the taker's side: five zones, with taps during the reveal ── */
const pens = (seed: number, picks: number[], position = 'ST') => {
  script(`pens ${picks.join('')} seed ${seed} ${position}`, position, seed, run => {
    run.tap(/Penalty Placement/);
    run.snap('open');
    picks.forEach((zone, i) => {
      fireEvent.click(run.zones()[zone]);
      run.snap(`pen ${i + 1} at ${zone}`);
      fireEvent.click(run.zones()[(zone + 1) % 6]);
      run.snap('a tap during the reveal');
      run.wait(1099);
      run.snap('still showing');
      run.wait(1);
    });
    run.bank();
  });
};
pens(3, [0, 1, 2, 0, 2]);
pens(4, [3, 4, 5, 3, 5]);
pens(5, [4, 4, 4, 4, 4], 'CB');
pens(6, [0, 5, 2, 3, 1]);
pens(8, [2, 2, 0, 0, 1], 'CM');
pens(9, [5, 3, 5, 3, 4]);
pens(21, [1, 0, 4, 2, 5]);

/* ── zone pick, the keeper's side: 'tell' dives where the tell flashed ── */
const litZone = (run: Run) => run.zones().findIndex(z => z.className.includes('bg-amber-400/40'));
const saves = (seed: number, dives: Array<number | 'tell'>) => {
  script(`keeper ${dives.join(' ')} seed ${seed}`, 'GK', seed, run => {
    run.tap(/Shot Stopping/);
    run.snap('open');
    run.wait(599);
    run.snap('no tell yet');
    run.wait(1);
    dives.forEach((dive, i) => {
      const tell = litZone(run);
      run.snap(`tell ${i + 1} at ${tell}`);
      fireEvent.click(run.zones()[2]);
      run.wait(649);
      run.snap('a dive before the shot does nothing');
      run.wait(1);
      run.snap('shot');
      const zone = dive === 'tell' ? tell : dive;
      fireEvent.click(run.zones()[zone]);
      run.snap(`dive ${zone}`);
      fireEvent.click(run.zones()[(zone + 2) % 6]);
      run.snap('a second dive does nothing');
      run.wait(1099);
      run.snap('still showing');
      run.wait(1);
    });
    run.bank();
  });
};
saves(31, ['tell', 'tell', 'tell', 'tell', 'tell']);
saves(32, ['tell', 'tell', 'tell', 'tell', 'tell']);
saves(33, [3, 3, 3, 3, 3]);
saves(34, [5, 'tell', 4, 'tell', 0]);
saves(35, ['tell', 1, 'tell', 2, 'tell']);
saves(36, [0, 1, 2, 0, 1]);

/* ── gate tap: h hits the lit gate, m taps the wrong one, t lets it shut ── */
const gates = (seed: number, pattern: string, position = 'ST') => {
  script(`gates ${pattern} seed ${seed} ${position}`, position, seed, run => {
    run.tap(/Passing Gates/);
    run.snap('open');
    run.tap(/Tap to start the passing drill/);
    run.snap('started');
    [...pattern].forEach((move, n) => {
      const lit = run.button('🚩');
      const all = [...lit.parentElement!.querySelectorAll<HTMLButtonElement>('button')];
      const at = all.indexOf(lit as HTMLButtonElement);
      if (move === 'h') fireEvent.click(lit);
      else if (move === 'm') fireEvent.click(all[(at + 1) % 6]);
      else { run.wait(Math.max(650, 1400 - n * 100) - 1); run.snap('about to shut'); run.wait(1); }
      run.snap(`gate ${n + 1} ${move} lit ${at}`);
      if (move !== 't' && n < 7) {
        fireEvent.click(all[at]);
        run.wait(349);
        run.snap('a tap between gates does nothing');
        run.wait(1);
      }
    });
    run.bank();
  });
};
gates(41, 'hhhhhhhh');
gates(42, 'hhhhhhhm');
gates(43, 'hmhthhmh', 'CM');
gates(44, 'thhhmhth');
gates(45, 'mmttmhtm', 'GK');
gates(46, 'tttttttt');
gates(47, 'hhmhhthh', 'CB');

/* ── walking out of a drill while one of its timers is still running. None of
      these is pretty (a drill you left can still finish, or nudge the next
      one), and all of them are how the panel has always behaved, so the move
      keeps them: the state lives where it lived, in the panel. ── */
script('leaving on the last penalty still finishes it', 'ST', 51, run => {
  run.tap(/Penalty Placement/);
  for (const zone of [3, 5, 4, 3]) { fireEvent.click(run.zones()[zone]); run.wait(1100); }
  fireEvent.click(run.zones()[5]);
  run.snap('fifth penalty');
  run.tap('‹ Drills');
  run.snap('menu');
  run.wait(1100);
  run.bank();
});
script('leaving a penalty and coming straight back', 'ST', 52, run => {
  run.tap(/Penalty Placement/);
  fireEvent.click(run.zones()[4]);
  run.snap('first penalty');
  run.tap('‹ Drills');
  run.tap(/Penalty Placement/);
  run.snap('reopened');
  run.wait(1100);
  run.snap('the old reveal lands');
  let guard = 0;
  while (run.zones().length && guard++ < 8) { fireEvent.click(run.zones()[3]); run.snap('penalty'); run.wait(1100); }
  run.bank();
});
script('a keeper leaves on the tell and comes back', 'GK', 53, run => {
  run.tap(/Shot Stopping/);
  run.wait(600);
  run.snap(`tell at ${litZone(run)}`);
  run.tap('‹ Drills');
  run.wait(650);
  run.snap('menu, the shot fired behind it');
  run.tap(/Shot Stopping/);
  run.snap('reopened');
  run.wait(600);
  for (let i = 0; i < 5; i++) {
    const tell = litZone(run);
    run.wait(650);
    fireEvent.click(run.zones()[tell]);
    run.snap(`dive ${tell}`);
    run.wait(1100);
  }
  run.bank();
});
script('leaving the gates lets them run out behind the menu', 'ST', 54, run => {
  run.tap(/Passing Gates/);
  run.tap(/Tap to start the passing drill/);
  fireEvent.click(run.button('🚩'));
  run.wait(350);
  fireEvent.click(run.button('🚩'));
  run.wait(350);
  run.snap('two through');
  run.tap('‹ Drills');
  run.snap('menu');
  run.wait(3000);
  run.snap('menu, three seconds on');
  run.wait(6000);
  run.bank();
});

const fixture: { recordedFrom: string; scripts: Record<string, Recorded> } | null =
  existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : null;
const recorded: Record<string, Recorded> = {};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the training ground plays the way it was recorded', () => {
  it('every script has its own name', () => {
    expect(new Set(SCRIPTS.map(s => s.name)).size).toBe(SCRIPTS.length);
  });

  for (const s of SCRIPTS) {
    it(s.name, () => {
      vi.spyOn(Math, 'random').mockImplementation(seeded(s.seed));
      const run = new Run(s.position, s.available ?? true);
      s.play(run);
      const got = run.done();
      if (RECORD) { recorded[s.name] = got; return; }
      expect(fixture, 'there is no fixture to replay').not.toBeNull();
      const want = fixture!.scripts[s.name];
      expect(want, `the fixture has no script called "${s.name}"`).toBeDefined();
      expect(got.trace.map(t => t.at)).toEqual(want.trace.map(t => t.at));
      got.trace.forEach((snap, i) => {
        expect(snap, `"${s.name}" step ${i} (${snap.at})`).toEqual(want.trace[i]);
      });
      expect(got.calls).toEqual(want.calls);
    });
  }

  it('the fixture is exactly these scripts', () => {
    if (RECORD) {
      /* one snap a line, so a re-record shows up in a diff as the taps that moved */
      const blocks = Object.entries(recorded).map(([name, r]) => (
        ` ${JSON.stringify(name)}: {"calls": ${JSON.stringify(r.calls)}, "trace": [\n${r.trace.map(s => `  ${JSON.stringify(s)}`).join(',\n')}\n ]}`
      ));
      writeFileSync(FIXTURE, `{"recordedFrom": ${JSON.stringify(RECORDED_FROM)}, "scripts": {\n${blocks.join(',\n')}\n}}\n`);
      return;
    }
    expect(Object.keys(fixture!.scripts).sort()).toEqual(SCRIPTS.map(s => s.name).sort());
  });
});

/* ── the four American skins, played on the same ground ──
   Every position of every sport: the menu shows that position's drills, each
   one plays to a result, the result says what the shared bank pays, and the
   callback gets the skin's own drill id. Math.random is held at 0.5 here, so
   the guesser always goes bottom left (zone 3) and the lit gate is always 3. */
const SKINS: Array<{ sport: string; positions: string[]; skin: (pos: string) => TrainingSport }> = [
  { sport: 'NFL', positions: NFL_TRAINING_POSITIONS, skin: p => nflTraining(p as never) },
  { sport: 'NBA', positions: NBA_TRAINING_POSITIONS, skin: p => nbaTraining(p as never) },
  { sport: 'MLB', positions: MLB_TRAINING_POSITIONS, skin: p => mlbTraining(p as never) },
  { sport: 'NHL', positions: NHL_TRAINING_POSITIONS, skin: p => nhlTraining(p as never) },
];

/** The button whose words are, or include, these. Plain DOM, because a role
    query walks the whole accessibility tree and this runs hundreds of times. */
function button(view: ReturnType<typeof render>, words: string, exact = false): HTMLButtonElement {
  const found = [...view.container.querySelectorAll('button')]
    .find(b => (exact ? b.textContent === words : (b.textContent ?? '').includes(words)));
  expect(found, `no button saying "${words}"`).toBeDefined();
  return found!;
}

/** Play one drill well enough for an elite session. */
function play(view: ReturnType<typeof render>, d: TrainingDrillSkin) {
  const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
  const zones = () => [...view.container.querySelectorAll<HTMLButtonElement>('[data-training-zone]')];
  if (d.kind === 'cones') {
    for (let n = 1; n <= 8; n++) { fireEvent.click(button(view, String(n), true)); wait(300); }
  } else if (d.kind === 'burst') {
    fireEvent.click(button(view, d.startTitle));
    for (let i = 0; i < 26; i++) fireEvent.click(button(view, d.go));
    wait(5000);
  } else if (d.kind === 'zones') {
    expect(zones().map(z => z.getAttribute('aria-label'))).toEqual(d.zones.map(z => `${d.verb} ${z}`));
    if (d.mode === 'save') {
      wait(600);
      expect(view.getByText(d.tell)).toBeInTheDocument();
      for (let i = 0; i < 5; i++) { wait(650); fireEvent.click(zones()[3]); wait(1100); }
    } else {
      for (let i = 0; i < 5; i++) { fireEvent.click(zones()[4]); expect(view.getByText(d.made)).toBeInTheDocument(); wait(1100); }
    }
  } else {
    fireEvent.click(button(view, d.startTitle));
    for (let i = 0; i < 8; i++) { fireEvent.click(button(view, d.lit, true)); wait(350); }
  }
}

describe('the American skins play on the same ground', () => {
  beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.5); });

  for (const { sport, positions, skin } of SKINS) {
    it(`${sport}: every position's menu, and every drill to a banked result`, () => {
      expect(positions.length).toBeGreaterThan(0);
      /* positions share drills, so each different drill is played once */
      const played = new Set<string>();
      for (const pos of positions) {
        const s = skin(pos);
        expect(s.drills.length, `${sport} ${pos} has too few drills`).toBeGreaterThanOrEqual(2);
        expect(new Set(s.drills.map(d => d.id)).size, `${sport} ${pos} repeats a drill id`).toBe(s.drills.length);
        const menu = render(<TrainingGround sport={s} available onComplete={vi.fn()} onClose={vi.fn()} />);
        expect(menu.container.querySelector('[role="dialog"]')).toHaveAttribute('aria-label', s.label);
        expect(menu.getByText(s.rule)).toBeInTheDocument();
        expect(menu.getAllByText(/^Trains /)).toHaveLength(s.drills.length);
        const noted = menu.container.querySelector(`[data-training-${s.note?.marker ?? 'no'}-rule]`);
        if (s.note) expect(noted).toHaveTextContent(s.note.text); else expect(noted).toBeNull();
        cleanup();
        /* the season's session is used: the tiles are gone and the menu says so */
        const shut = render(<TrainingGround sport={s} available={false} onComplete={vi.fn()} onClose={vi.fn()} />);
        expect(shut.getByText(s.shut.body)).toBeInTheDocument();
        expect(shut.queryByText(/^Trains /)).toBeNull();
        cleanup();
        for (const d of s.drills) {
          const key = JSON.stringify(d);
          if (played.has(key)) continue;
          played.add(key);
          const onComplete = vi.fn();
          const onClose = vi.fn();
          const view = render(<TrainingGround sport={s} available onComplete={onComplete} onClose={onClose} />);
          fireEvent.click(button(view, `${d.name}Trains ${d.stat}`));
          play(view, d);
          const score = Number(view.container.querySelector('[data-training-score]')?.textContent);
          expect(score, `${sport} ${pos} ${d.name}`).toBeGreaterThanOrEqual(80);
          expect(view.container.querySelector('[data-training-result]')).toHaveAttribute('data-training-result', d.id);
          expect(view.getByText(RATING_TRAINING.tierLine(trainingTier(score), d.stat))).toBeInTheDocument();
          fireEvent.click(button(view, s.bank, true));
          expect(onComplete).toHaveBeenCalledExactlyOnceWith(d.id, score);
          fireEvent.click(button(view, s.done, true));
          expect(onClose).toHaveBeenCalledTimes(1);
          cleanup();
        }
      }
      expect(played.size, `${sport} played too few different drills`).toBeGreaterThanOrEqual(4);
    }, 60000);
  }

  it('a goalie and a hitter save, a skater and a pitcher place', () => {
    const mode = (s: TrainingSport) => s.drills.flatMap(d => (d.kind === 'zones' ? [d.mode] : []));
    expect(mode(nhlTraining('G'))).toEqual(['save']);
    expect(mode(nhlTraining('C'))).toEqual(['pick']);
    expect(mode(mlbTraining('SS'))).toEqual(['save']);
    expect(mode(mlbTraining('SP'))).toEqual(['pick']);
    expect(mode(nflTraining('QB'))).toEqual(['pick']);
    expect(mode(nflTraining('K'))).toEqual(['pick']);
    expect(mode(nflTraining('RB'))).toEqual([]);
  });
});
