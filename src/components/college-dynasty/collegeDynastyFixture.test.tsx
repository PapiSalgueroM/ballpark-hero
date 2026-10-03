/**
 * Round 912: the fixture that holds both college dynasty boards to the
 * behaviour they had before they became one board.
 *
 * CFB Dynasty and CBB Dynasty were two copies of one board, so a fix had to
 * land twice (Round 426). Round 912 made them one shared board driven by a
 * sport descriptor, with no behaviour change at all. This file is the proof.
 * It drives each REAL board in jsdom down a scripted path with a seeded
 * Math.random: pick a school, open every tab, play the whole season, the
 * recap, a reload on the recap, the recruiting trail (filters, signings, a
 * refusal), the staff window (shop, hire, let go), close the class, reload,
 * play on, and then two older saves (one from before the program layer, one
 * written on the recap before the recap was saved). After every click it
 * records a hash of the rendered markup, a hash of the text, the save in
 * localStorage, how many random draws the board has made, and what the board
 * handed the share buttons, the completion hook and the reveal scroll.
 *
 * The fixture was recorded from origin/main's tree before any code moved
 * (the sha is in its header). COLLEGE_FIXTURE_RECORD=1 writes it again
 * (COLLEGE_FIXTURE_OUT picks another file, COLLEGE_FIXTURE_FULL=1 keeps the
 * whole text of every step, for diffing a mismatch). Without those it
 * replays and every step must match byte for byte.
 * scripts/simCollegeDynastyBoard.mjs runs it and carries the negative
 * controls.
 */
import type { ComponentType } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import CfbDynastyBoard from '@/components/cfb-dynasty/CfbDynastyBoard';
import CbbDynastyBoard from '@/components/cbb-dynasty/CbbDynastyBoard';
import { initCfb, CFB_SCHOOL_MAP } from '@/lib/cfbDynasty';
import { initCbb, CBB_SCHOOL_MAP } from '@/lib/cbbDynasty';
import { makeIdMinter } from '@/lib/entityIds';

/* What the board hands the three things it does not draw itself. Kept as
   the latest value rather than a log of calls, so the count of renders is
   not part of the fixture; the values are. */
const seen = vi.hoisted(() => ({ share: null as unknown, completion: null as unknown, reveal: null as unknown }));
vi.mock('@/hooks/useGameCompletion', () => ({
  useGameCompletion: (...args: unknown[]) => { seen.completion = args; },
}));
vi.mock('@/components/game/ShareButtons', () => ({
  default: (props: Record<string, unknown>) => { seen.share = props; return null; },
}));
vi.mock('@/hooks/useRevealScroll', () => ({
  useRevealScroll: (key: unknown) => { seen.reveal = key; return { current: null }; },
}));

const FIXTURE = path.resolve(__dirname, 'collegeDynastyFixture.json');
const RECORD = process.env.COLLEGE_FIXTURE_RECORD === '1';
const FULL = process.env.COLLEGE_FIXTURE_FULL === '1';
const OUT = process.env.COLLEGE_FIXTURE_OUT ? path.resolve(process.env.COLLEGE_FIXTURE_OUT) : FIXTURE;

const EPOCH = makeIdMinter('x')().slice(1, -2);
const sha = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

interface Step {
  step: string; html: string; text: string; save: string; draws: number;
  info: string; share: string | null; completion: string; reveal: string; head: string; full?: string;
}

interface Sport {
  name: 'cfb' | 'cbb';
  Board: ComponentType;
  key: string;
  school: string;
  standings: string;
  position: string;
  /** A save from before the program layer existed: the engine's own start, no depth. */
  plainSave: (rng: () => number) => unknown;
}

const SPORTS: Sport[] = [
  {
    name: 'cfb', Board: CfbDynastyBoard, key: 'cfb-dynasty-save-v1', school: 'ALA', standings: 'Conferences', position: 'QB',
    plainSave: rng => ({ st: initCfb('ALA', rng), phase: 'season', recruits: null, portal: null }),
  },
  {
    name: 'cbb', Board: CbbDynastyBoard, key: 'cbb-dynasty-save-v1', school: 'UK', standings: 'Leagues', position: 'PG',
    plainSave: rng => ({ st: initCbb('UK', rng), phase: 'season', recruits: null, portal: null }),
  },
];

const schoolName = (s: Sport) => (s.name === 'cfb' ? CFB_SCHOOL_MAP.get(s.school)?.name : CBB_SCHOOL_MAP.get(s.school)?.name) ?? s.school;

const PLAY = /^(Play (Week|Round) \d+|Final week \+ the Playoff|Final round \+ March)$/;
const txt = (el: Element) => (el.textContent ?? '').trim();
const ask = (el: Element) => Number(/asks (\d+) NIL/.exec(el.textContent ?? '')?.[1] ?? 0);

/* One scripted path through one board. Every click is followed by a step. */
function run(sport: Sport): Step[] {
  const steps: Step[] = [];
  let draws = 0;
  let rng = lehmer(912);
  vi.spyOn(Math, 'random').mockImplementation(() => { draws += 1; return rng(); });
  localStorage.clear();
  seen.share = null; seen.completion = null; seen.reveal = null;
  let view = render(<sport.Board />);
  const text = () => view.container.textContent ?? '';
  const buttons = () => [...view.container.querySelectorAll('button')];
  const button = (want: string | RegExp) => {
    const b = buttons().find(x => (typeof want === 'string' ? txt(x) === want : want.test(txt(x))));
    if (!b) throw new Error(`${sport.name}: no button ${String(want)} after step ${steps.length} (${steps[steps.length - 1]?.step})`);
    return b;
  };
  const snap = (step: string) => {
    const html = view.container.innerHTML;
    /* The text without the celebration keyframes, so the head reads as the screen does. */
    const shown = view.container.cloneNode(true) as HTMLElement;
    shown.querySelectorAll('style').forEach(s => s.remove());
    const t = (shown.textContent ?? '').replace(/\s+/g, ' ').trim();
    /* Entity ids carry a per page load token drawn at import, before any seed
       can reach it (src/lib/entityIds.ts), so it is written as a placeholder. */
    const save = (localStorage.getItem(sport.key) ?? '').split(EPOCH).join('<load>');
    let info = '';
    if (save) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const s: any = JSON.parse(save);
      info = JSON.stringify({
        keys: Object.keys(s).join(','), phase: s.phase, season: s.st?.season, round: s.st?.round, nil: s.st?.nil,
        played: s.st?.seasonsPlayed, titles: s.st?.myTitles, depth: s.st?.depth ?? null,
        recruits: s.recruits?.length ?? null, portal: s.portal?.length ?? null,
      });
    }
    steps.push({
      step, html: sha(html), text: sha(t), save: sha(save), draws, info,
      share: seen.share ? sha(JSON.stringify(seen.share)) : null,
      completion: JSON.stringify(seen.completion), reveal: String(seen.reveal), head: t.slice(0, 200),
      ...(FULL ? { full: t } : {}),
    });
  };
  const click = (want: string | RegExp, step: string) => { fireEvent.click(button(want)); snap(step); };
  const reload = (step: string) => { cleanup(); view = render(<sport.Board />); snap(step); };
  const tabs = (tag: string) => {
    for (const t of ['Play', 'Schedule', 'Top 25', sport.standings, 'Roster']) click(t, `${tag}: tab ${t}`);
  };
  const playSeason = (tag: string) => {
    click('Play', `${tag}: tab Play`);
    for (let i = 0; i < 30 && !text().includes('Hit the recruiting trail'); i += 1) {
      const b = button(PLAY);
      const label = txt(b);
      if (i === 5 || label.startsWith('Final')) { tabs(`${tag}: before ${label}`); click('Play', `${tag}: back to Play`); }
      fireEvent.click(button(PLAY));
      snap(`${tag}: ${label}`);
    }
  };

  snap('pick');
  click(new RegExp(`^${schoolName(sport)}Prestige`), 'start');
  tabs('new dynasty');
  playSeason('season one');
  const recapSave = localStorage.getItem(sport.key) ?? '';
  reload('reload on the recap');
  click('Hit the recruiting trail', 'recruiting trail');

  const [position, stars] = [...view.container.querySelectorAll('select')];
  fireEvent.change(position, { target: { value: sport.position } }); snap('filter position');
  fireEvent.change(stars, { target: { value: '4' } }); snap('filter stars');
  click('Reset filters', 'filters reset');
  const rows = (border: string) => buttons().filter(b => /Sign$/.test(txt(b)) && b.className.includes(border));
  fireEvent.click(rows('hover:border-primary/60')[0]); snap('sign high school');
  fireEvent.click(rows('hover:border-gold/60')[0]); snap('sign portal');
  for (let i = 0; i < 8 && !text().includes('Not enough NIL'); i += 1) {
    const hs = rows('hover:border-primary/60');
    if (hs.length === 0) break;
    fireEvent.click(hs.reduce((a, b) => (ask(b) > ask(a) ? b : a)));
    snap(`sign the dearest ${i}`);
  }

  /* The staff window: open the first chair's market, hire, let him go, hire
     into the empty chair, close the market. */
  const chair = buttons().find(b => txt(b) === 'Shop' || txt(b) === 'Hire');
  snap(chair ? 'staff window open' : 'NO STAFF WINDOW');
  if (chair) {
    fireEvent.click(chair); snap('staff: market open');
    const market = () => buttons().filter(b => txt(b) !== 'Hire' && /Hire$/.test(txt(b)));
    fireEvent.click(market()[0]); snap('staff: hire');
    const letGo = buttons().find(b => txt(b) === 'Let go');
    if (letGo) { fireEvent.click(letGo); snap('staff: let go'); }
    if (market()[0]) { fireEvent.click(market()[0]); snap('staff: hire into the empty chair'); }
    const close = buttons().find(b => txt(b) === 'Close');
    if (close) { fireEvent.click(close); snap('staff: market closed'); }
    /* Spend the pot on the cheapest recruits until one is refused, then the
       second chair, dearest asks first, until the pot refuses a coach too. */
    for (let i = 0; i < 12; i += 1) {
      const hs = rows('hover:border-primary/60');
      if (hs.length === 0) break;
      const before = localStorage.getItem(sport.key);
      fireEvent.click(hs.reduce((a, b) => (ask(b) < ask(a) ? b : a)));
      snap(`drain the pot ${i}`);
      if (localStorage.getItem(sport.key) === before) break;
    }
    const second = buttons().filter(b => txt(b) === 'Shop' || txt(b) === 'Hire')[1];
    if (second) {
      fireEvent.click(second); snap('staff: second market open');
      const salary = (b: Element) => Number(/asks (\d+)/.exec(b.textContent ?? '')?.[1] ?? 0);
      for (let i = 0; i < 4 && !text().includes('Not enough budget'); i += 1) {
        const m = market();
        if (m.length === 0) break;
        fireEvent.click(m.reduce((a, b) => (salary(b) > salary(a) ? b : a)));
        snap(`staff: dearest hire ${i}`);
      }
    }
  }
  click('Close the class, run it back', 'class closed');
  reload('reload in season two');
  tabs('season two');
  click('Play', 'season two: tab Play');
  click(PLAY, 'season two: first round');
  click(PLAY, 'season two: second round');
  click('Schedule', 'season two: schedule');

  /* An old save written on the recap before the recap was saved opens on the
     recruiting trail, the recap's only way out. */
  cleanup();
  rng = lehmer(913);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const old: any = JSON.parse(recapSave);
  delete old.postseason; delete old.march;
  localStorage.setItem(sport.key, JSON.stringify(old));
  view = render(<sport.Board />);
  snap('old recap save');

  /* A save from before the program layer: a whole season, the trail, and the
     close that switches the layer on. */
  cleanup();
  localStorage.clear();
  rng = lehmer(914);
  localStorage.setItem(sport.key, JSON.stringify(sport.plainSave(lehmer(915))));
  view = render(<sport.Board />);
  snap('plain save');
  tabs('plain');
  playSeason('plain season');
  click('Hit the recruiting trail', 'plain: recruiting trail');
  fireEvent.click(rows('hover:border-primary/60')[0]); snap('plain: sign high school');
  click('Close the class, run it back', 'plain: class closed, layer on');
  tabs('plain season two');
  click('Fire yourself and start over', 'reset');
  return steps;
}

const recorded: Record<string, Step[]> = {};

describe('Round 912: both college dynasty boards hold their recorded behaviour', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  for (const sport of SPORTS) {
    it(`${sport.name}: every step matches the fixture`, () => {
      const steps = run(sport);
      expect(steps.length).toBeGreaterThan(60);
      if (RECORD) {
        recorded[sport.name] = steps;
        const body = { recordedFrom: process.env.COLLEGE_FIXTURE_SHA ?? 'unknown', seeds: [912, 913, 914, 915], sports: recorded };
        fs.writeFileSync(OUT, JSON.stringify(body, null, 1) + '\n');
        return;
      }
      const want: Step[] = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).sports[sport.name];
      expect(want.length).toBeGreaterThan(60);
      const fields: (keyof Step)[] = ['step', 'html', 'text', 'save', 'draws', 'info', 'share', 'completion', 'reveal'];
      let first = '';
      for (let i = 0; i < Math.max(want.length, steps.length) && !first; i += 1) {
        const a = want[i];
        const b = steps[i];
        if (!a || !b) { first = `step ${i}: ${a ? 'missing now' : 'not in the fixture'} (${(a ?? b).step})`; break; }
        const off = fields.filter(f => a[f] !== b[f]);
        if (off.length) first = `step ${i} (${a.step}) differs in ${off.join(', ')}\n  was: ${a.head}\n  now: ${b.head}\n  was info ${a.info}\n  now info ${b.info}`;
      }
      expect(first).toBe('');
    }, 120_000); /* a full scripted dynasty: 3 s on a quiet machine, 14 s on a busy one */
  }
});
