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
 *
 * Round 1559: the NHL board joins as a row of the default path alone (its
 * career block joins in Round 1561, with the bind that gives it one). The
 * walk is the same walk in hockey's presses (row.drive: waive to the limit of
 * 15, "Play Round N", "Final stretch + playoffs", the hockey draft). Its keys
 * in the fixture were recorded on a GitHub runner from 115c68092, the commit
 * Round 1559 started on, whose NHL board is the one this round leaves byte
 * equal; the NFL keys are untouched. With them, three saves written by that
 * board (block 'the saves the base wrote'): fired with the desk on, fired
 * with the desk off, and the hub in the middle of a season with the desk on.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';

/* The real completion hook, with a spy where it records (the career block counts the finishes it records). Nothing
   it does touches the save, so the default path's digests are what they were with the hook stubbed. */
const completion = vi.hoisted(() => ({ calls: [] as { path: string; score: number | undefined }[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/lib/completions', () => ({
  recordActivity: () => undefined,
  recordCompletion: (p: string, score?: number) => { completion.calls.push({ path: p, score }); },
  getCurrentPlayerName: () => undefined,
}));
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
  /** Round 1559: the career block runs only on a board that has the career (the NHL's joins in Round 1561). */
  career: boolean;
  /** Round 1559: the board's own presses for the default path walk. */
  drive: BoardDrive;
}
interface BoardDrive {
  /** Cut or waive until the board will play; how many went. */
  toLimit(): number;
  /** One more man off the roster; false when nobody could go. */
  dropOne(): boolean;
  /** Every period with the one press button, the last press playing the playoffs. Stops on the recap. */
  playSeason(row: BoardRow, at: (label: string) => void): void;
  /** Draft night, until the save says hub. */
  runDraft(row: BoardRow): void;
}
const BOARDS: BoardRow[] = [
  {
    sport: 'nfl', saveKey: 'front-office-save-v1', clubLabel: 'Kansas City Chiefs',
    load: async () => ((process.env.FO_BOARD_NFL
      ? await import(/* @vite-ignore */ process.env.FO_BOARD_NFL)
      : await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType }).default,
    career: true,
    drive: { toLimit: cutToLimit, dropOne: cutOne, playSeason, runDraft },
  },
  {
    sport: 'nhl', saveKey: 'nhl-front-office-save-v1', clubLabel: 'Detroit Red Wings',
    load: async () => ((process.env.FO_BOARD_NHL
      ? await import(/* @vite-ignore */ process.env.FO_BOARD_NHL)
      : await import('@/components/nhl-front-office/NhlFrontOfficeBoard')) as { default: ComponentType }).default,
    career: false,
    drive: { toLimit: waiveToLimit, dropOne: waiveOne, playSeason: playNhlSeason, runDraft: runNhlDraft },
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
  /* Release BR seam: Round 1542's additions are set aside the same way, the season's lines and award history on the
     league and every man's first year stamp and awards anywhere in it (all absent on every save before 1542). With
     them set aside every checkpoint is still the record taken before this round (rBRg-gmc2, all 15 green; on the
     base all 15 green too); with the league's two alone it is not (6 red), so the stamps on the men are real.
     The NFL's alone: the NHL row was recorded after 1542, so nothing of its save is set aside but the two blocks. */
  if (row.sport === 'nfl') { const lg = s?.league; if (lg) { delete lg.stats; delete lg.awards; const strip = (o: any): void => { if (!o || typeof o !== 'object') return; delete o.rookieSeason; delete o.awards; for (const v of Object.values(o)) strip(v); }; strip(lg); } }
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

/* Round 1559: the NHL board's own presses. The Roster, Free agency and Play boxes are the shared hub's. */
/** One waiver through the Roster box: the last man by rating, two taps. False when nobody could be waived. */
function waiveOne(): boolean {
  openTile('Roster');
  const arms = buttons().filter(b => /^Waive, \$/.test((b.textContent ?? '').trim()) && !b.disabled);
  if (!arms.length) return false;
  fireEvent.click(arms[arms.length - 1]);
  const confirm = buttonNamed('Waive him');
  if (!confirm) return false;
  fireEvent.click(confirm);
  return true;
}
/** The board will not play a roster over 15: waive until it fits (the line above the boxes says when it does not). */
function waiveToLimit(): number {
  let n = 0;
  while (document.querySelector('[data-roster-limit]') && n < 40) { if (!waiveOne()) break; n += 1; }
  return n;
}
/** Every round with the one press button, the last one playing the playoffs. Stops on the recap. */
function playNhlSeason(row: BoardRow, at: (label: string) => void) {
  openTile('Play');
  for (let guard = 0; guard < 30; guard += 1) {
    const s = readSave(row);
    if (s.phase !== 'hub') return;
    const finalPress = buttonNamed('Final stretch + playoffs');
    if (finalPress) { fireEvent.click(finalPress); continue; }
    const round = s.league.round;
    const press = buttonNamed(`Play Round ${round}`);
    if (!press) throw new Error(`no Play Round ${round} button on the play box`);
    fireEvent.click(press);
    if (round === 1) at('round 1');
    if (round === 9) at('round 9');
  }
  throw new Error('the season did not close in 30 presses');
}
/** Draft night: the first prospect on the screen at each pick, or the finish button with no pick left, until the save says hub. */
function runNhlDraft(row: BoardRow) {
  for (let n = 0; n < 30 && readSave(row).phase === 'draft'; n += 1) {
    const prospects = buttons().filter(b => /· age \d+/.test(b.textContent ?? '') && !b.disabled);
    if (prospects.length) { fireEvent.click(prospects[0]); continue; }
    const finish = buttonNamed('Finish the draft and offseason');
    if (!finish) throw new Error('the draft shows no prospect and no way on');
    fireEvent.click(finish);
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
    const cuts = row.drive.toLimit();
    if (season === 1) {
      if (row.drive.dropOne()) at('cut');
      if (signOne()) at('sign');
    } else if (cuts > 0) at('cuts');
    row.drive.playSeason(row, at);
    const closed = readSave(row);
    expect(closed.fired, `seed ${seed} season ${season}: nobody is fired on the default path`).toBeFalsy();
    at('recap');
    if (answerPresser()) at('answered');
    fireEvent.click(buttonNamed(/Go to the draft/)!);
    at('draft');
    row.drive.runDraft(row);
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

/* ================================================================== */
/* BLOCK 'the saves the base wrote' (Round 1559, the NHL board)         */
/* ================================================================== */
/* Three NHL saves written by the board of the commit Round 1559 started on, recorded once beside the default path's
   keys: fired with the desk on (its blocks, no seat or xp), fired with the desk off (no gm), and the hub after round 9
   with the desk on. Here each mounts with storage byte equal and keeps the phase the base wrote; Round 1561, whose
   bind gives a fired NHL save the out of work screen, adds where each lands. */
const NHL_TITLE_ASK = (season: number) => ({ tier: 'title', text: 'Win the Stanley Cup. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season });
const PLANTED = ['fired desk on', 'fired desk off', 'hub desk on'] as const;

/** A new NHL save on the real board, the presser answered. */
async function nhlStarted(row: BoardRow, seed: number) {
  const { Board } = await freshBoard(row, seed);
  const view = render(<Board />);
  clickText(row.clubLabel);
  await waitFor(() => expect(readSave(row)?.phase).toBe('hub'), { timeout: 120_000 });
  answerPresser();
  return { Board, view };
}

/** The three saves, each as the board left it in storage. */
async function nhlPlantedSaves(row: BoardRow): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const deskOn of [true, false]) {
    /* doomed the way the career block dooms the NFL's: trust 5 under a title ask, his men at 60, the last round */
    const { Board, view } = await nhlStarted(row, deskOn ? 7 : 8);
    view.unmount();
    const s = readSave(row);
    if (!deskOn) delete s.gm;
    s.trust = 5;
    s.mandate = NHL_TITLE_ASK(s.league.season);
    for (const p of s.league.teams[s.myTeam].players) p.ovr = 60;
    s.league.round = 20;
    localStorage.setItem(row.saveKey, JSON.stringify(s));
    const doomed = render(<Board />);
    waiveToLimit();
    openTile('Play');
    fireEvent.click(buttonNamed('Final stretch + playoffs')!);
    await waitFor(() => expect(readSave(row)?.phase).toBe('fired'), { timeout: 60_000 });
    doomed.unmount();
    out[`fired desk ${deskOn ? 'on' : 'off'}`] = localStorage.getItem(row.saveKey)!;
    localStorage.clear();
  }
  const { view } = await nhlStarted(row, 9);
  waiveToLimit();
  openTile('Play');
  for (let round = 1; round <= 9; round += 1) fireEvent.click(buttonNamed(`Play Round ${round}`)!);
  expect(readSave(row).league.round).toBe(10);
  view.unmount();
  out['hub desk on'] = localStorage.getItem(row.saveKey)!;
  localStorage.clear();
  return out;
}

describe('nhl board: the saves the base wrote', () => {
  const row = BOARDS.find(b => b.sport === 'nhl')!;
  if (RECORDING) {
    it('three saves written by the base board are recorded beside its default path', async () => {
      const saves = await nhlPlantedSaves(row);
      for (const [name, raw] of Object.entries(saves)) console.log(`FO_GM_CAREER_PLANTED ${name}|${raw.length} chars|phase ${JSON.parse(raw).phase}`);
      const file = process.env.FO_GM_CAREER_OUT || FIXTURE;
      const prior = JSON.parse(fs.readFileSync(file, 'utf8'));
      prior.nhl = { ...prior.nhl, planted: { recordedFrom: process.env.FO_GM_CAREER_FROM ?? 'unknown', saves } };
      fs.writeFileSync(file, `${JSON.stringify(prior, null, 2)}\n`);
      expect(Object.keys(saves)).toEqual([...PLANTED]);
    });
    return;
  }
  const planted = fs.existsSync(FIXTURE) ? JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).nhl?.planted : null;
  for (const name of PLANTED) {
    it(`${name}: it mounts with storage byte equal, on the phase the base wrote`, async () => {
      const raw: string | undefined = planted?.saves?.[name];
      expect(raw, `nothing is recorded for nhl ${name}: record on the base with FO_GM_CAREER=record`).toBeDefined();
      const s = JSON.parse(raw!);
      expect(s.phase).toBe(name.startsWith('fired') ? 'fired' : 'hub');
      expect(!!s.fired).toBe(name.startsWith('fired'));
      if (name.endsWith('on')) {
        expect(s.gm?.blocks, 'the desk rides on the save').toBeDefined();
        expect(s.gm.blocks.seat ?? s.gm.blocks.xp, 'the base wrote no career block').toBeUndefined();
      } else expect(s.gm).toBeUndefined();
      const { Board } = await freshBoard(row, 1);
      localStorage.setItem(row.saveKey, raw!);
      render(<Board />);
      await waitFor(() => expect(buttons().length).toBeGreaterThan(0), { timeout: 30_000 });
      await new Promise(r => setTimeout(r, 50));
      expect(localStorage.getItem(row.saveKey), 'mounting writes nothing').toBe(raw);
    });
  }
});

/* ================================================================== */
/* BLOCK 'the career': fired is a chapter, not the end (Round 1533)    */
/* ================================================================== */
const TITLE_ASK = (season: number) => ({ tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season });
const outScreen = () => document.querySelector('[data-gm-out-of-work]');
/** A career box on the out of work screen by its title. */
async function openCareerBox(title: string) {
  const box = Array.from(document.querySelectorAll('[data-gm-out-of-work] [data-gm-desk="tiles"] button'))
    .find(b => Array.from(b.querySelectorAll('div')).some(dv => (dv.textContent ?? '').trim() === title));
  if (!box) throw new Error(`no career box titled ${title}`);
  fireEvent.click(box);
  await waitFor(() => expect(document.querySelector('[data-gm-market]')).not.toBeNull(), { timeout: 30_000 });
}
const offerIds = () => Array.from(document.querySelectorAll('[data-gm-offer]')).map(b => b.getAttribute('data-gm-offer'));

/** A new save on the real board, then the last week of a season he cannot survive: trust 5 under a title ask, his
    roster gutted, the league at its final week (the way playOwnerMandate dooms one). Pressed once: he is fired. */
async function doomedSave(row: BoardRow, Board: ComponentType) {
  let view = render(<Board />);
  clickText(row.clubLabel);
  await waitFor(() => expect(readSave(row)?.phase).toBe('hub'), { timeout: 120_000 });
  answerPresser();
  view.unmount();
  const s = readSave(row);
  s.trust = 5;
  s.mandate = TITLE_ASK(s.league.season);
  for (const p of s.league.teams[s.myTeam].players) p.ovr = 60;
  s.league.week = 17;
  localStorage.setItem(row.saveKey, JSON.stringify(s));
  view = render(<Board />);
  cutToLimit();
  openTile('This week');
  fireEvent.click(buttonNamed('Play the final week + playoffs')!);
  await waitFor(() => expect(readSave(row)?.phase).toBe('fired'), { timeout: 60_000 });
  return view;
}

/** His record planted on a fired save (the host's own block), and the counters that go with it. */
function plantRecord(row: BoardRow, seat: any, seasons: number) {
  const s = readSave(row);
  s.gm = { ...(s.gm ?? { v: 1, blocks: {} }), blocks: { ...(s.gm?.blocks ?? {}), seat } };
  s.seasonsPlayed = seasons;
  s.titles = 0;
  localStorage.setItem(row.saveKey, JSON.stringify(s));
}

for (const row of BOARDS.filter(b => b.career)) {
  describe(`${row.sport} board: the career`, () => {
    it('fired: the recap offers who is calling and keeps the save; a remount opens the out of work screen with three boxes', async () => {
      const { Board } = await freshBoard(row, 11);
      completion.calls.length = 0;
      const view = await doomedSave(row, Board);
      expect(buttonNamed(/Take another front office/), 'no button on the recap deletes the save').toBeNull();
      /* A new save starts at 0 XP and has closed one season, so its XP is that season's pay: the recap's XP line
         shows only when the season paid (controlFrontOfficeBoard xpzero). */
      const paid = readSave(row).gm.blocks.xp.xp;
      console.log(`FO_GM_CAREER|fired recap|season paid ${paid} XP`);
      expect(!!document.querySelector('[data-gm-xp-recap]'), `the XP line on a season that paid ${paid}`).toBe(paid > 0);
      const call = buttonNamed('See who is calling');
      expect(call, 'the recap offers who is calling').not.toBeNull();
      fireEvent.click(call!);
      expect(readSave(row)?.fired, 'the save is still in storage, fired').toBe(true);
      expect(outScreen(), 'the out of work screen').not.toBeNull();
      view.unmount();
      render(<Board />);
      expect(outScreen(), 'a remount opens the out of work screen').not.toBeNull();
      expect(document.querySelectorAll('[data-gm-out-of-work] [data-gm-desk="tiles"] button')).toHaveLength(3);
      expect(completion.calls, 'nothing is recorded as a finish through the firing').toHaveLength(0);
    });

    it('taking an offer takes two taps, never the club that let him go, and the arrival stages no title even at the champion', async () => {
      const { Board } = await freshBoard(row, 12);
      completion.calls.length = 0;
      let view = await doomedSave(row, Board);
      const old = readSave(row).myTeam;
      fireEvent.click(buttonNamed('See who is calling')!);
      /* The club that calls first is made the closed season's champion, so the arrival meets a parade that is not his. */
      let target = '';
      for (let k = 0; k < 3; k += 1) {
        view.unmount();
        view = render(<Board />);
        await openCareerBox('Job market');
        const ids = offerIds();
        expect(ids.length, 'somebody calls after a firing').toBeGreaterThan(0);
        expect(ids, 'the club that let him go is not in his feed').not.toContain(old);
        if (ids[0] === target) break;
        target = ids[0]!;
        const s = readSave(row);
        s.postseason.champion = target;
        s.league.champions[s.league.champions.length - 1].team = target;
        localStorage.setItem(row.saveKey, JSON.stringify(s));
      }
      fireEvent.click(document.querySelector(`[data-gm-offer="${target}"]`)!);
      const take = () => document.querySelector('[data-gm-take]') as HTMLButtonElement;
      fireEvent.click(take());
      expect(readSave(row).myTeam, 'one tap only arms').toBe(old);
      fireEvent.click(take());
      const s = readSave(row);
      expect([s.myTeam, s.trust, s.fired, s.phase]).toEqual([target, 60, false, 'recap']);
      expect(s.postseason.champion, 'the club he joined won the closed season').toBe(target);
      const recap = document.querySelector('[data-verdict-reveal]')?.textContent ?? '';
      expect(recap, 'the arrival line').toContain('You take over the');
      expect(recap, 'no title of his is staged').not.toContain('Your build. Your rings.');
      expect(document.querySelector('[data-verdict-reveal]')?.className ?? '', 'no title pulse').not.toContain('cm-win-pulse');
      /* The room meets him, then his new club's draft, and the summer keeps the ask he was shown. */
      const ask = s.mandate;
      expect(ask.season).toBe(s.league.season + 1);
      answerPresser();
      fireEvent.click(buttonNamed(/Go to the draft/)!);
      runDraft(row);
      const after = readSave(row);
      expect([after.phase, after.myTeam, JSON.stringify(after.mandate)]).toEqual(['hub', target, JSON.stringify(ask)]);
      expect(completion.calls, 'nothing is recorded through the market, the take, the arrival and the draft').toHaveLength(0);
      /* His next title at his new club records the career once, at the career's score. */
      view.unmount();
      const t = readSave(row);
      for (const p of t.league.teams[t.myTeam].players) p.ovr = 99;
      localStorage.setItem(row.saveKey, JSON.stringify(t));
      render(<Board />);
      cutToLimit();
      playSeason(row, () => undefined);
      const won = readSave(row);
      expect(won.postseason.champion, 'a club of 99s wins it').toBe(target);
      expect(completion.calls).toEqual([{ path: '/front-office', score: won.titles * 100 + won.seasonsPlayed * 5 }]);
    });

    it('a year out: two taps, the league a season on with one more champion, his counters as they were', async () => {
      const { Board } = await freshBoard(row, 13);
      const view = await doomedSave(row, Board);
      view.unmount();
      const H = await import('@/lib/gmDeskHost');
      const SEAT = await import('@/lib/gmSeat');
      const { nflDeskHost } = await import('@/lib/gmDeskHostNfl');
      const s0 = readSave(row);
      /* A record whose next year is still open (the stay out button is drawn only then). */
      let planted = false;
      for (const grades of [['overachieved', 'met', 'missed'], ['met', 'met', 'missed'], ['title', 'met', 'badly']] as const) {
        const tier = SEAT.leagueTiers(H.hostSeatTeams(nflDeskHost, s0.league, (id: string) => id)).get(s0.myTeam) ?? 4;
        let c = SEAT.newGmCareer(s0.myTeam, tier, s0.league.season - grades.length + 1);
        for (const g of grades) c = SEAT.recordSeatSeason(c, g);
        const seat = { v: 1 as const, career: SEAT.endSeatStint(c, 'fired'), last: s0.league.season };
        if (H.hostCanSitOut(H.hostMarket(nflDeskHost, s0.league, seat, (id: string) => id))) { plantRecord(row, seat, grades.length); planted = true; break; }
      }
      expect(planted, 'a record with next year open').toBe(true);
      render(<Board />);
      await openCareerBox('Job market');
      const before = readSave(row);
      const sit = () => document.querySelector('[data-gm-sit-out]') as HTMLButtonElement;
      expect(sit(), 'the stay out button').not.toBeNull();
      fireEvent.click(sit());
      expect(readSave(row).league.season, 'one tap only arms').toBe(before.league.season);
      fireEvent.click(sit());
      const s = readSave(row);
      expect([s.league.season, s.league.champions.length, s.seasonsPlayed, s.titles, s.phase, s.fired, s.myTeam])
        .toEqual([before.league.season + 1, before.league.champions.length + 1, before.seasonsPlayed, before.titles, 'fired', true, before.myTeam]);
      expect(s.gm.blocks.seat.career.seasonsOut).toBe(1);
      expect(s.postseason.champion).toBe(s.league.champions[s.league.champions.length - 1].team);
      expect(outScreen()?.textContent ?? '', 'the card says the year').toContain('Out of work, 1 season');
    });

    it('a point spent in Ownership survives a remount, and a tree off the live list sells nothing', async () => {
      const { Board } = await freshBoard(row, 15);
      let view = render(<Board />);
      clickText(row.clubLabel);
      await waitFor(() => expect(readSave(row)?.phase).toBe('hub'), { timeout: 120_000 });
      answerPresser();
      view.unmount();
      const X = await import('@/lib/gmXp');
      const s = readSave(row);
      s.gm.blocks.xp = X.addXp(X.defaultGmXp(), 2000);
      localStorage.setItem(row.saveKey, JSON.stringify(s));
      view = render(<Board />);
      const tree = (t: string) => document.querySelector(`[data-gm-tree="${t}"] button`) as HTMLButtonElement | null;
      openTile('GM level');
      await waitFor(() => expect(tree('ownership')).not.toBeNull(), { timeout: 30_000 });
      expect(tree('scouting')!.disabled, 'a tree off the live list sells nothing').toBe(true);
      fireEvent.click(tree('ownership')!);
      expect(readSave(row).gm.blocks.xp.points.ownership).toBe(1);
      view.unmount();
      render(<Board />);
      expect(readSave(row).gm.blocks.xp.points.ownership, 'the point is in the save after a remount').toBe(1);
      openTile('GM level');
      await waitFor(() => expect(tree('ownership')).not.toBeNull(), { timeout: 30_000 });
      expect(tree('ownership')!.textContent).toContain('(1/5)');
    });

    it('a closed market draws no stay out button, and the new front office link deletes the save on the second tap only', async () => {
      const { Board } = await freshBoard(row, 14);
      const view = await doomedSave(row, Board);
      view.unmount();
      const H = await import('@/lib/gmDeskHost');
      const SEAT = await import('@/lib/gmSeat');
      const { nflDeskHost } = await import('@/lib/gmDeskHostNfl');
      const s0 = readSave(row);
      let planted = false;
      for (const grades of [['badly', 'badly', 'badly'], ['missed', 'badly'], ['badly']] as const) {
        for (const out of [1, 2]) {
          const tier = SEAT.leagueTiers(H.hostSeatTeams(nflDeskHost, s0.league, (id: string) => id)).get(s0.myTeam) ?? 4;
          let c = SEAT.newGmCareer(s0.myTeam, tier, s0.league.season - out - grades.length + 1);
          for (const g of grades) c = SEAT.recordSeatSeason(c, g);
          c = SEAT.endSeatStint(c, 'fired');
          for (let i = 0; i < out; i += 1) c = SEAT.sitOutYear(c);
          const seat = { v: 1 as const, career: c, last: s0.league.season - out };
          if (!planted && H.hostMarket(nflDeskHost, s0.league, seat, (id: string) => id)?.state === 'closed') { plantRecord(row, seat, grades.length); planted = true; }
        }
      }
      expect(planted, 'a closed market').toBe(true);
      render(<Board />);
      await openCareerBox('Job market');
      expect(document.querySelector('[data-gm-market="closed"]')).not.toBeNull();
      expect(document.querySelector('[data-gm-sit-out]'), 'no stay out button on a closed market').toBeNull();
      backToHub();
      cleanup();
      render(<Board />);
      const link = () => buttonNamed('Start a new front office');
      expect(link()).not.toBeNull();
      fireEvent.click(link()!);
      expect(readSave(row), 'one tap only arms').not.toBeNull();
      expect(document.querySelector('[data-gm-arm="restart"]')).not.toBeNull();
      fireEvent.click(link()!);
      expect(readSave(row), 'the second tap starts over').toBeNull();
      expect(screen.getAllByText(row.clubLabel).length, 'the pick screen').toBeGreaterThan(0);
    });

    /* Decision 4's old save rows and the 1223 critic's A5: a career box opens through setGmOpen alone, so looking
       never switches a desk off save's desk on (controlFrontOfficeBoard lookopens drops the board's filter). */
    it('looking at Career and GM level on the hub of a save whose desk is off writes nothing', async () => {
      const { Board } = await freshBoard(row, 16);
      let view = render(<Board />);
      clickText(row.clubLabel);
      await waitFor(() => expect(readSave(row)?.phase).toBe('hub'), { timeout: 120_000 });
      answerPresser();
      view.unmount();
      const s = readSave(row);
      delete s.gm;
      localStorage.setItem(row.saveKey, JSON.stringify(s));
      view = render(<Board />);
      const before = localStorage.getItem(row.saveKey);
      await lookAt('Career', '[data-gm-career]');
      await lookAt('GM level', '[data-gm-xp-desk]');
      expect(localStorage.getItem(row.saveKey), 'looking wrote nothing to the save').toBe(before);
      expect(readSave(row).gm, 'the desk is still off').toBeUndefined();
      view.unmount();
    });

    it('looking at all three boxes out of work, desk off, writes nothing', async () => {
      const { Board } = await freshBoard(row, 17);
      const view = await doomedSave(row, Board);
      view.unmount();
      const s = readSave(row);
      delete s.gm;
      localStorage.setItem(row.saveKey, JSON.stringify(s));
      render(<Board />);
      expect(outScreen(), 'a fired save whose desk is off opens out of work').not.toBeNull();
      const before = localStorage.getItem(row.saveKey);
      await lookAt('Job market', '[data-gm-market]');
      await lookAt('Career', '[data-gm-career]');
      await lookAt('GM level', '[data-gm-xp-desk]');
      expect(localStorage.getItem(row.saveKey), 'looking wrote nothing to the save').toBe(before);
      expect(readSave(row).gm, 'the desk is still off').toBeUndefined();
    });

    /* The close builds the verdict on the desk as the final week's tick left it (the ref), never on the render's
       desk from before the press, which would put an approach that ran out back on the desk
       (controlFrontOfficeBoard deskstale). */
    it('a staff approach that runs out in the final week is still settled after the close', async () => {
      const { Board } = await freshBoard(row, 18);
      let view = render(<Board />);
      clickText(row.clubLabel);
      await waitFor(() => expect(readSave(row)?.phase).toBe('hub'), { timeout: 120_000 });
      answerPresser();
      view.unmount();
      const s = readSave(row);
      const staff = s.gm.blocks.staff.block;
      const post = Object.keys(staff).find(k => !['v', 'poach', 'matchesLeft', 'hires', 'seasonSpend'].includes(k) && staff[k]);
      expect(post, 'a seated post').toBeDefined();
      staff.poach = { postId: post, club: Object.keys(s.league.teams).find(id => id !== s.myTeam), weeksLeft: 1 };
      s.league.week = 17;
      localStorage.setItem(row.saveKey, JSON.stringify(s));
      view = render(<Board />);
      cutToLimit();
      openTile('This week');
      fireEvent.click(buttonNamed('Play the final week + playoffs')!);
      await waitFor(() => expect(['recap', 'fired']).toContain(readSave(row)?.phase), { timeout: 60_000 });
      const after = readSave(row).gm.blocks;
      expect(after.xp, 'the season closed through the desk host').toBeDefined();
      expect(after.staff.block.poach, 'the approach ran out in the final week').toBeNull();
      expect(after.staff.block[post!], 'and the man walked').toBeNull();
      view.unmount();
    });
  });
}

/* Round 1559 (Round 1533's finding 12, its critic 21): the title WATCHED at the club he took. The NFL board alone
   holds the room while a playoff game runs on the clock (roomHeld: useGameCompletion reads the finish as it stood
   before the press until full time); the other boards record on the plain path, which the take case above walks.
   He is fired, takes the first offer, meets the room and runs the new club's draft; the new club plays its season
   as 99s and its bracket up to the title game, which is then played at the club's own ratings (a blowout has no
   clock, so its watch would end at once and prove nothing), stream by stream until a final he WINS ON THE CLOCK.
   While he watches nothing is recorded; full time records exactly one finish, at the career's score. */
describe('nfl board: a title watched at the club he took', () => {
  it('the title game watched to full time records one finish, at the career score, and none before it', async () => {
    const row = BOARDS.find(b => b.sport === 'nfl')!;
    const { Board } = await freshBoard(row, 12);
    const GB = await import('@/lib/gmBracket');
    const PS = await import('@/lib/frontOfficePostseason');
    completion.calls.length = 0;
    let view = await doomedSave(row, Board);
    const old = readSave(row).myTeam;
    fireEvent.click(buttonNamed('See who is calling')!);
    view.unmount();
    view = render(<Board />);
    await openCareerBox('Job market');
    const target = offerIds()[0]!;
    expect(target, 'somebody calls, and not the club that let him go').toBeTruthy();
    expect(target).not.toBe(old);
    fireEvent.click(document.querySelector(`[data-gm-offer="${target}"]`)!);
    const take = () => document.querySelector('[data-gm-take]') as HTMLButtonElement;
    fireEvent.click(take());
    fireEvent.click(take());
    expect(readSave(row).myTeam, 'the seat is taken').toBe(target);
    answerPresser();
    fireEvent.click(buttonNamed(/Go to the draft/)!);
    runDraft(row);
    expect(readSave(row).phase).toBe('hub');
    view.unmount();
    /* the new club's season as 99s, a week a press, then its bracket a round a press up to the title game */
    const s0 = readSave(row);
    const own = new Map<string, number>(s0.league.teams[target].players.map((p: any) => [p.id, p.ovr]));
    for (const p of s0.league.teams[target].players) p.ovr = 99;
    localStorage.setItem(row.saveKey, JSON.stringify(s0));
    view = render(<Board />);
    cutToLimit();
    openTile('This week');
    for (let g = 0; g < 30 && !readSave(row).playoffs; g += 1) {
      const press = buttonNamed(`Play Week ${readSave(row).league.week}`);
      if (!press) throw new Error(`no Play Week ${readSave(row).league.week} button on the week box`);
      fireEvent.click(press);
    }
    expect(readSave(row).playoffs, 'Week 17 opened the bracket').toBeTruthy();
    const finalNext = () => {
      const s = readSave(row);
      const f = PS.NFL_POSTSEASON.formatFor(s.league.season);
      const w = f && s.playoffs ? GB.bracketWeek(f, s.playoffs) : null;
      const pairs = f && w !== null ? GB.bracketPairings(f, s.playoffs, w) : null;
      return pairs && pairs.length === 1 ? pairs[0] : null;
    };
    for (let r = 0; r < 6 && !finalNext(); r += 1) fireEvent.click(document.querySelector('[data-press="round"]')!);
    const fin = finalNext();
    expect(fin && [fin.homeId, fin.awayId], 'a club of 99s is in the title game').toContain(target);
    expect(completion.calls, 'nothing is recorded from the firing to the title game').toHaveLength(0);
    view.unmount();
    /* the title game at the club's own ratings, watched, stream by stream */
    const pre = readSave(row);
    for (const p of pre.league.teams[target].players) if (own.has(p.id)) p.ovr = own.get(p.id);
    const start = JSON.stringify(pre);
    let won = false;
    for (let k = 1; k <= 40 && !won; k += 1) {
      cleanup();
      localStorage.setItem(row.saveKey, start);
      completion.calls.length = 0;
      Math.random = lehmer(k * 104729);
      render(<Board />);
      openTile('This week');
      const watch = document.querySelector('[data-watch-round]') as HTMLButtonElement | null;
      expect(watch, 'his title game can be watched').not.toBeNull();
      fireEvent.click(watch!);
      const clocked = await waitFor(() => expect(document.querySelector('[data-match-clock]')).not.toBeNull()).then(() => true, () => false);
      const s = readSave(row);
      if (!clocked || s.postseason?.champion !== target) continue;
      won = true;
      expect([s.phase, s.myTeam], 'the press closed the season at the club he took').toEqual(['recap', target]);
      expect(completion.calls, 'nothing is recorded while he watches').toHaveLength(0);
      fireEvent.click(document.querySelector('[data-gameday-speed="Results"]')!);
      await waitFor(() => expect(document.querySelector('[data-verdict-reveal]')).not.toBeNull());
      await waitFor(() => expect(completion.calls.length).toBeGreaterThan(0));
      console.log(`FO_GM_CAREER|watched title|stream ${k}|titles ${s.titles}|seasons ${s.seasonsPlayed}|calls ${JSON.stringify(completion.calls)}`);
      expect(completion.calls, 'full time records the title once, at the career score').toEqual([{ path: '/front-office', score: s.titles * 100 + s.seasonsPlayed * 5 }]);
    }
    expect(won, 'a title game won on the clock, in forty streams').toBe(true);
  });
});

/** A career box (by its title, in any desk row on screen) opened, its lazy panel landed, and the bar's Hub tapped. */
async function lookAt(title: string, landed: string) {
  const box = Array.from(document.querySelectorAll('[data-gm-desk="tiles"] button'))
    .find(b => Array.from(b.querySelectorAll('div')).some(dv => (dv.textContent ?? '').trim() === title));
  if (!box) throw new Error(`no career box titled ${title}`);
  fireEvent.click(box);
  await waitFor(() => expect(document.querySelector(landed)).not.toBeNull(), { timeout: 30_000 });
  backToHub();
  await waitFor(() => expect(document.querySelector('[data-gm-desk="panel"]')).toBeNull(), { timeout: 30_000 });
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
