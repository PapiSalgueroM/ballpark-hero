/**
 * Round 1559: the GM career's shared pieces held equal to the NFL copies they were lifted from, until the NFL board
 * and page call them themselves (brief R3, critic 13: two copies of one rule are held by a test, never by intent).
 *
 * - hostCareerRules('nfl') is FrontOffice.tsx's frontOfficeCareerRules, evaluated from that page's own source
 *   (comments out), and the other three sports differ only in the word for the books (gmSport's cap model).
 * - hostOfferGoneLine, hostTakeoverLine and hostSatOutLine are the three feed lines FrontOfficeBoard.tsx prints,
 *   read off the board and evaluated on the same values.
 * - careerKitNeeded is the board's kitNeeded expression, with the kit absent, on the whole truth table of the
 *   moments it reads (and with the kit present the board never asks).
 * - makeCareerKitLoader fetches once for every caller, forgets a failed fetch, and reports its three states.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hostCareerRules, hostXpHelp } from './gmCareerFace';
import { hostOfferGoneLine, hostSatOutLine, hostTakeoverLine } from './gmDeskHost';
import { careerKitNeeded, makeCareerKitLoader } from '@/components/front-office-shared/careerKitLoader';
import { REGULAR_WEEKS } from './frontOffice';
import { GM_SPORTS, GM_SPORT_KEYS } from './gmSport';

const read = (rel: string) =>
  fs.readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const between = (src: string, start: string, end: string): string => {
  const i = src.indexOf(start);
  expect(i, `anchor not found: ${start}`).toBeGreaterThanOrEqual(0);
  const j = src.indexOf(end, i + start.length);
  expect(j, `end not found after: ${start}`).toBeGreaterThan(i);
  return src.slice(i + start.length, j);
};

describe('hostCareerRules', () => {
  it("is the NFL page's five career sentences byte for byte for 'nfl'", () => {
    const page = read('src/pages/FrontOffice.tsx');
    const body = between(page, 'function frontOfficeCareerRules(): string[] {', '\n}\n');
    const nflPage = new Function('hostXpHelp', body)(hostXpHelp) as string[];
    expect(nflPage).toHaveLength(5);
    expect(hostCareerRules('nfl')).toEqual(nflPage);
  });

  it('names the books from the sport descriptor: a payroll under a tax line, a cap sheet under a cap', () => {
    const nfl = hostCareerRules('nfl');
    for (const key of GM_SPORT_KEYS) {
      const rules = hostCareerRules(key);
      const books = GM_SPORTS[key].cap.model === 'cbtLine' ? 'payroll' : 'cap sheet';
      expect(rules).toHaveLength(5);
      expect(rules[1]).toBe(nfl[1].replace('cap sheet', books));
      expect(rules.filter((_, i) => i !== 1)).toEqual(nfl.filter((_, i) => i !== 1));
    }
    expect(hostCareerRules('mlb')[1]).toContain('real roster, payroll and picks');
    expect(hostCareerRules('nhl')[1]).toContain('real roster, cap sheet and picks');
  });
});

describe('the three feed lines', () => {
  const board = read('src/components/front-office/FrontOfficeBoard.tsx');
  const label = (id: string) => `Club ${id}`;

  it('an offer gone is the board\'s literal line', () => {
    expect(board).toContain(`'${hostOfferGoneLine()}'`);
  });

  it("a take is the board's template on the same offer", () => {
    const tpl = between(board, 'setNewsFeed([`You take over', '`]);');
    const r = { offer: { teamId: 'DAL', ask: { season: 2027, text: 'Win the division.' } } };
    const boardLine = new Function('label', 'teamId', 'r', 'return `You take over' + tpl + '`;')(label, 'DAL', r);
    expect(hostTakeoverLine(label, r.offer as never)).toBe(boardLine);
    expect(boardLine).toBe('You take over the Club DAL. The 2027 ask: Win the division.');
  });

  it("a year out is the board's template on the same report", () => {
    const tpl = between(board, 'setNewsFeed([`You sat out', '`]);');
    const r = { report: { season: 2026, champion: 'KC' } };
    const boardLine = new Function('label', 'r', 'return `You sat out' + tpl + '`;')(label, r);
    expect(hostSatOutLine(r.report, label)).toBe(boardLine);
    expect(boardLine).toBe('You sat out 2026. The Club KC won it.');
  });
});

describe('careerKitNeeded', () => {
  const board = read('src/components/front-office/FrontOfficeBoard.tsx');
  const expr = between(board, 'const kitNeeded = ', ';');
  const boardKitNeeded = new Function('kit', 'phase', 'presser', 'careerBoxOpen', 'league', 'REGULAR_WEEKS', `return ${expr};`);

  it("equals the NFL board's kitNeeded on every moment, and the board never asks once the kit is here", () => {
    let rows = 0, asks = 0;
    for (const phase of ['pick', 'hub', 'draft', 'recap', 'fired']) {
      for (const presser of [null, { kind: 'x' }]) {
        for (const careerBoxOpen of [false, true]) {
          for (const league of [null, { week: 1 }, { week: REGULAR_WEEKS - 1 }, { week: REGULAR_WEEKS }, { week: REGULAR_WEEKS + 1 }]) {
            const want = !!boardKitNeeded(null, phase, presser, careerBoxOpen, league, REGULAR_WEEKS);
            const lastPeriod = !!league && league.week >= REGULAR_WEEKS;
            expect(careerKitNeeded({ phase, presser: presser !== null, boxOpen: careerBoxOpen, lastPeriod }), J({ phase, presser, careerBoxOpen, league })).toBe(want);
            expect(!!boardKitNeeded({}, phase, presser, careerBoxOpen, league, REGULAR_WEEKS)).toBe(false);
            rows++; if (want) asks++;
          }
        }
      }
    }
    expect(rows).toBe(100);
    expect(asks).toBeGreaterThan(0);
    expect(asks).toBeLessThan(rows);
  });

  it('a season being played, the draft and the pick screen never ask', () => {
    for (const phase of ['pick', 'draft']) expect(careerKitNeeded({ phase, presser: false, boxOpen: false, lastPeriod: true })).toBe(false);
    expect(careerKitNeeded({ phase: 'hub', presser: false, boxOpen: false, lastPeriod: false })).toBe(false);
    expect(careerKitNeeded({ phase: 'hub', presser: false, boxOpen: false, lastPeriod: true })).toBe(true);
  });
});

describe('makeCareerKitLoader', () => {
  it('fetches once for every caller and keeps the kit', async () => {
    let calls = 0;
    const kit = { name: 'kit' };
    const loader = makeCareerKitLoader(() => { calls++; return Promise.resolve(kit); });
    expect(loader.state()).toBe('idle');
    expect(loader.now()).toBeNull();
    const a = loader.load(), b = loader.load();
    expect(loader.state()).toBe('loading');
    expect(await a).toBe(kit);
    expect(await b).toBe(kit);
    expect(await loader.load()).toBe(kit);
    expect(calls).toBe(1);
    expect(loader.state()).toBe('ready');
    expect(loader.now()).toBe(kit);
  });

  it('forgets a failed fetch, so the next ask tries again', async () => {
    let calls = 0;
    const kit = { name: 'kit' };
    const loader = makeCareerKitLoader(() => { calls++; return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(kit); });
    await expect(loader.load()).rejects.toThrow('offline');
    expect(loader.state()).toBe('idle');
    expect(loader.now()).toBeNull();
    expect(await loader.load()).toBe(kit);
    expect(calls).toBe(2);
    expect(loader.state()).toBe('ready');
  });
});

function J(v: unknown): string { return JSON.stringify(v); }
