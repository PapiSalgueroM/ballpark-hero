/**
 * Round 1533: a GM's career on the real front office boards, parameterised by
 * board (the NFL case now; the next bind adds its board as a row of BOARDS).
 *
 * BLOCK 'the default path'. The real board in vitest, Math.random replaced by
 * a seeded generator BEFORE the board's modules are imported (vi.resetModules
 * then a dynamic import, entityIds first, so the id epoch is pinned), seeds
 * 1, 2 and 3, two seasons each: start a club on the pick screen, give the
 * safe answer at each presser, cut to the limit (and one man more) and sign
 * one free agent in season one, play every week with the one press button,
 * take the first prospect at each pick. At each checkpoint the save in
 * storage is hashed (sha1 of its JSON, the id epoch taken out, and
 * gm.blocks.seat and gm.blocks.xp set aside: the two blocks this round adds).
 * Twice a seed: desk on (a new save opens with it) and desk off (gm deleted
 * from the save right after the start, then a reload). Trust starts at 60
 * and two seasons can cost at most 56, so no walk is fired.
 *
 * THE RECORD. FrontOfficeGmCareer.fixture.json beside this file was written
 * ONCE, on a GitHub runner, from the commit this round started on (before a
 * line of the board moved), with FO_GM_CAREER=record; never again. With no
 * recording for a case the file fails: a digest test with nothing recorded
 * proves nothing.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.setConfig({ testTimeout: 600_000 });

/* eslint-disable @typescript-eslint/no-explicit-any */
function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const REAL_RANDOM = Math.random;
const RECORDING = process.env.FO_GM_CAREER === 'record';
const FIXTURE = path.join(process.cwd(), 'src', 'components', 'front-office-shared', 'FrontOfficeGmCareer.fixture.json');
const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');

interface BoardRow {
  sport: string;
  saveKey: string;
  /** The club button on the pick screen. */
  clubLabel: string;
  load(): Promise<ComponentType>;
}
const BOARDS: BoardRow[] = [
  {
    sport: 'nfl', saveKey: 'front-office-save-v1', clubLabel: 'Kansas City Chiefs',
    load: async () => ((process.env.FO_BOARD_NFL
      ? await import(/* @vite-ignore */ process.env.FO_BOARD_NFL)
      : await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType }).default,
  },
];

afterEach(() => { cleanup(); Math.random = REAL_RANDOM; localStorage.clear(); });

/** A fresh module graph whose ids are fixed: the seeded stream is in place before entityIds is evaluated. */
async function freshBoard(row: BoardRow, seed: number) {
  vi.resetModules();
  Math.random = lehmer(1533 * 100 + seed);
  const ids = await import('@/lib/entityIds');
  const Board = await row.load();
  const probe = ids.makeIdMinter('x')();
  const epoch = probe.slice(1, probe.lastIndexOf('-'));
  return { Board, epoch };
}

const readSave = (row: BoardRow): any => {
  const raw = localStorage.getItem(row.saveKey);
  return raw ? JSON.parse(raw) : null;
};

/** The save with the epoch taken out and the two blocks this round adds set aside. */
function digest(row: BoardRow, epoch: string): string {
  const s = readSave(row);
  if (s?.gm?.blocks) { delete s.gm.blocks.seat; delete s.gm.blocks.xp; }
  return sha1(JSON.stringify(s).split(epoch).join('E'));
}

const clickText = (text: string | RegExp) => fireEvent.click(screen.getAllByText(text)[0]);
const buttons = (): HTMLButtonElement[] => Array.from(document.querySelectorAll('button'));
const buttonNamed = (name: string | RegExp): HTMLButtonElement | null =>
  buttons().find(b => (typeof name === 'string' ? (b.textContent ?? '').trim() === name : name.test((b.textContent ?? '').trim()))) ?? null;
/** The bar above an opened box says "Hub". */
const backToHub = () => { const back = buttonNamed('Hub'); if (back) fireEvent.click(back); };
/** A hub box by its title word (the small upper case line of the box). */
const openTile = (title: string) => {
  backToHub();
  const box = buttons().find(b => Array.from(b.querySelectorAll('div')).some(dv => (dv.textContent ?? '').trim() === title && dv.className.includes('uppercase')));
  if (!box) throw new Error(`no hub box titled ${title}`);
  fireEvent.click(box);
};

/** One cut through the Roster box: the biggest group, its last man by rating, two taps. False when nothing could be cut. */
function cutOne(): boolean {
  openTile('Roster');
  const groups = Array.from(document.querySelectorAll('[data-roster-group]')).filter(g => g.getAttribute('data-roster-group') !== 'practice');
  if (groups.length) {
    const count = (g: Element) => Number(/· (\d+)/.exec(g.textContent ?? '')?.[1] ?? 0);
    fireEvent.click([...groups].sort((a, b) => count(b) - count(a))[0]);
  }
  const arms = buttons().filter(b => /^Cut, \$/.test((b.textContent ?? '').trim()) && !b.disabled);
  if (!arms.length) return false;
  fireEvent.click(arms[arms.length - 1]);
  const confirm = buttonNamed('Cut him');
  if (!confirm) return false;
  fireEvent.click(confirm);
  return true;
}
const overLimit = () => !!document.querySelector('[data-over-limit]');
/** The board will not play a roster over the limit: cut until it fits (the Roster box says when it does not). */
function cutToLimit(): number {
  let n = 0;
  openTile('Roster');
  while (overLimit() && n < 40) { if (!cutOne()) break; n += 1; openTile('Roster'); }
  return n;
}
/** Sign the first free agent the market will let him sign. */
function signOne(): boolean {
  openTile('Free agency');
  const sign = buttons().find(b => (b.textContent ?? '').trim() === 'Sign' && !b.disabled);
  if (!sign) return false;
  fireEvent.click(sign);
  return true;
}
/** Every week with the one press button, the final week's press playing the playoffs. Stops on the recap. */
function playSeason(row: BoardRow, at: (label: string) => void) {
  openTile('This week');
  for (let guard = 0; guard < 30; guard += 1) {
    const s = readSave(row);
    if (s.phase !== 'hub') return;
    const finalPress = buttonNamed('Play the final week + playoffs');
    if (finalPress) { fireEvent.click(finalPress); continue; }
    const week = s.league.week;
    const press = buttonNamed(`Play Week ${week}`);
    if (!press) throw new Error(`no Play Week ${week} button on the week box`);
    fireEvent.click(press);
    if (week === 1) at('week 1');
    if (week === 9) at('week 9');
  }
  throw new Error('the season did not close in 30 presses');
}
/** Draft night: the first prospect on the screen at each pick, until the save says hub. */
function runDraft(row: BoardRow) {
  for (let n = 0; n < 20 && readSave(row).phase === 'draft'; n += 1) {
    const rows = screen.queryAllByText(/· age \d+/);
    if (rows.length) { fireEvent.click(rows[0]); continue; }
    const skip = buttons().find(b => /no picks|without/i.test(b.textContent ?? '') && !b.disabled);
    if (!skip) throw new Error('the draft shows no prospect and no way on');
    fireEvent.click(skip);
  }
}

/** One career walk on one board: the checkpoints it passed, in order, each with its digest. */
async function walk(row: BoardRow, seed: number, deskOn: boolean): Promise<string[]> {
  const out: string[] = [];
  const { Board, epoch } = await freshBoard(row, seed);
  const at = (label: string) => out.push(`${label}:${digest(row, epoch)}`);
  let view = render(<Board />);
  clickText(row.clubLabel);
  await waitFor(() => expect(readSave(row)?.phase).toBe('hub'), { timeout: 120_000 });
  at('start');
  if (!deskOn) {
    const s = readSave(row);
    delete s.gm;
    localStorage.setItem(row.saveKey, JSON.stringify(s));
    view.unmount();
    view = render(<Board />);
  }
  if (answerPresser()) at('presser');
  for (let season = 1; season <= 2; season += 1) {
    const cuts = cutToLimit();
    if (season === 1) {
      if (cutOne()) at('cut');
      if (signOne()) at('sign');
    } else if (cuts > 0) at('cuts');
    playSeason(row, at);
    const closed = readSave(row);
    expect(closed.fired, `seed ${seed} season ${season}: nobody is fired on the default path`).toBeFalsy();
    at('recap');
    if (answerPresser()) at('answered');
    fireEvent.click(buttonNamed(/Go to the draft/)!);
    at('draft');
    runDraft(row);
    expect(readSave(row).phase).toBe('hub');
    at('summer');
    /* the next season opens on a reload, which is where the save says it is */
    view.unmount();
    view = render(<Board />);
  }
  view.unmount();
  return out;
}

for (const row of BOARDS) {
  describe(`${row.sport} board: the default path`, () => {
    const recorded = fs.existsSync(FIXTURE) ? JSON.parse(fs.readFileSync(FIXTURE, 'utf8'))[row.sport] : null;
    const printed: Record<string, string[]> = {};
    for (const seed of [1, 2, 3]) {
      for (const deskOn of [true, false]) {
        const id = `seed ${seed}|desk ${deskOn ? 'on' : 'off'}`;
        it(`${id}: every checkpoint of two seasons is the base's`, async () => {
          const got = await walk(row, seed, deskOn);
          console.log(`FO_GM_CAREER|${row.sport}|${id}|${got.length} checkpoints|${got.map(g => g.split(':')[0]).join(',')}`);
          if (RECORDING) { printed[id] = got; return; }
          expect(recorded?.cases?.[id], `nothing is recorded for ${row.sport} ${id}: record on the base with FO_GM_CAREER=record`).toBeDefined();
          expect(got).toEqual(recorded.cases[id]);
        });
      }
    }
    it('the record is written once, from the base', () => {
      if (!RECORDING) { expect(Object.keys(recorded?.cases ?? {})).toHaveLength(6); return; }
      const file = process.env.FO_GM_CAREER_OUT || FIXTURE;
      const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
      prior[row.sport] = { recordedFrom: process.env.FO_GM_CAREER_FROM ?? 'unknown', cases: printed };
      fs.writeFileSync(file, `${JSON.stringify(prior, null, 2)}\n`);
      console.log(`FO_GM_CAREER_RECORD ${row.sport} ${Object.keys(printed).length} cases -> ${file}`);
      expect(Object.keys(printed)).toHaveLength(6);
    });
  });
}

/** The safe answer (the first, which never gambles) at a presser on screen, if there is one. */
function answerPresser(): boolean {
  const card = document.querySelector('[data-gm-press]');
  if (!card) return false;
  const first = within(card as HTMLElement).queryAllByRole('button')[0];
  if (!first) return false;
  fireEvent.click(first);
  return true;
}
