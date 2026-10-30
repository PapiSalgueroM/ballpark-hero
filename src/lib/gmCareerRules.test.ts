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
 *
 * Round 1561 (its brief R2, 1559's R3): the NFL board and page now call the shared pieces themselves, so the NFL
 * copies they were lifted from are FROZEN below as they stood at c68bce039 (Round 1559's closing head, the base of
 * Round 1561), each case still holds the shared piece equal to that copy, and each also asserts the board or page
 * calls the shared piece and no longer carries its own copy (so a second copy cannot grow back beside it).
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

/* FROZEN: FrontOffice.tsx's frontOfficeCareerRules at c68bce039, word for word. */
function nflPageRules1559(): string[] {
  const xp = hostXpHelp();
  return [
    'Getting fired does not end the save. Zero trust upstairs costs you the job, and See who is calling opens the job market: franchises in the same league that rate your record call with the ask they would grade you on. The club that fired you never calls.',
    'Take a job and you move to that club\'s real roster, cap sheet and picks, meet the room and run its draft. Your record, your titles and your GM XP come with you. The old club\'s staff and re-sign desk stay behind.',
    'If the phone can still ring next year you can sit a season out: the league plays on without you, then the market reads again. Once the phone has stopped for good the screen says so, and a new front office is the way back in.',
    'Your GM earns XP every graded season from wins, titles, playoff rounds and the grade against the ask, and each level is a point. Ownership (a missed season costs less trust) and Media (a gamble at the podium lands more often) work now. The other trees say Not here yet.',
    xp[xp.length - 1].replace(/^Worked example: /, 'For example: '),
  ];
}

describe('hostCareerRules', () => {
  it("is the NFL page's five career sentences byte for byte for 'nfl'", () => {
    const nflPage = nflPageRules1559();
    expect(nflPage).toHaveLength(5);
    expect(hostCareerRules('nfl')).toEqual(nflPage);
  });

  it('the NFL page calls it and carries no copy of its own', () => {
    const page = read('src/pages/FrontOffice.tsx');
    expect(between(page, 'function frontOfficeCareerRules(): string[] {', '\n}\n').trim()).toBe("return hostCareerRules('nfl');");
    expect(page).not.toContain('Getting fired does not end the save.');
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

/* FROZEN: the NFL board's three feed lines at c68bce039 (its takeSeat and sitOut), as they were typed. */
type TakeR = { offer: { teamId: string; ask: { season: number; text: string } } };
const nflOfferGone1559 = 'That offer is not on the table any more.';
const nflTakeLine1559 = (label: (id: string) => string, teamId: string, r: TakeR) =>
  `You take over the ${label(teamId)}. The ${r.offer.ask.season} ask: ${r.offer.ask.text}`;
const nflSatOutLine1559 = (label: (id: string) => string, r: { report: { season: number; champion: string } }) =>
  `You sat out ${r.report.season}. The ${label(r.report.champion)} won it.`;

describe('the three feed lines', () => {
  const board = read('src/components/front-office/FrontOfficeBoard.tsx');
  const label = (id: string) => `Club ${id}`;

  it("an offer gone is the board's literal line", () => {
    expect(hostOfferGoneLine()).toBe(nflOfferGone1559);
  });

  it("a take is the board's template on the same offer", () => {
    const r = { offer: { teamId: 'DAL', ask: { season: 2027, text: 'Win the division.' } } };
    const boardLine = nflTakeLine1559(label, 'DAL', r);
    expect(hostTakeoverLine(label, r.offer as never)).toBe(boardLine);
    expect(boardLine).toBe('You take over the Club DAL. The 2027 ask: Win the division.');
  });

  it("a year out is the board's template on the same report", () => {
    const r = { report: { season: 2026, champion: 'KC' } };
    const boardLine = nflSatOutLine1559(label, r);
    expect(hostSatOutLine(r.report, label)).toBe(boardLine);
    expect(boardLine).toBe('You sat out 2026. The Club KC won it.');
  });

  it('the NFL board prints all three through the shared functions and types none of them itself', () => {
    expect(board).toContain('setNewsFeed(f => [hostOfferGoneLine(), ...f].slice(0, 6));');
    expect(board).toContain('setNewsFeed([hostTakeoverLine(label, r.offer)]);');
    expect(board).toContain('setNewsFeed([hostSatOutLine(r.report, label)]);');
    expect(board).not.toContain(nflOfferGone1559);
    expect(board).not.toContain('You take over the');
    expect(board).not.toContain('You sat out');
  });
});

/* FROZEN: the NFL board's kitNeeded at c68bce039, the expression as it was typed. */
const nflKitNeeded1559 = (kit: unknown, phase: string, presser: unknown, careerBoxOpen: boolean, league: { week: number } | null, REGULAR_WEEKS: number) => !kit && (
  phase === 'recap' || phase === 'fired' || presser !== null || careerBoxOpen
  || (phase === 'hub' && !!league && league.week >= REGULAR_WEEKS)
);

describe('careerKitNeeded', () => {
  const board = read('src/components/front-office/FrontOfficeBoard.tsx');
  /* the moment the NFL board hands the shared hook, evaluated as the board writes it; the hook asks when the kit is
     absent and careerKitNeeded says so (useGmCareerKit.ts: `!kit && careerKitNeeded(moment)`) */
  const momentText = between(board, 'useGmCareerKit(nflCareerKitLoader, {', '}, {');
  const boardMoment = new Function('phase', 'presser', 'careerBoxOpen', 'league', 'REGULAR_WEEKS', `return {${momentText}};`);
  const hook = read('src/components/front-office-shared/useGmCareerKit.ts');
  const boardKitNeeded = (kit: unknown, phase: string, presser: unknown, careerBoxOpen: boolean, league: { week: number } | null, weeks: number) =>
    !kit && careerKitNeeded(boardMoment(phase, presser, careerBoxOpen, league, weeks));

  it('the NFL board asks through the shared hook and carries no copy of the rule', () => {
    expect(hook).toContain('const needed = !kit && careerKitNeeded(moment);');
    expect(board).not.toContain('const kitNeeded');
    expect(board).not.toContain("|| (phase === 'hub' && !!league && league.week >= REGULAR_WEEKS)");
  });

  it("equals the NFL board's kitNeeded on every moment, and the board never asks once the kit is here", () => {
    let rows = 0, asks = 0;
    for (const phase of ['pick', 'hub', 'draft', 'recap', 'fired']) {
      for (const presser of [null, { kind: 'x' }]) {
        for (const careerBoxOpen of [false, true]) {
          for (const league of [null, { week: 1 }, { week: REGULAR_WEEKS - 1 }, { week: REGULAR_WEEKS }, { week: REGULAR_WEEKS + 1 }]) {
            const want = !!nflKitNeeded1559(null, phase, presser, careerBoxOpen, league, REGULAR_WEEKS);
            const lastPeriod = !!league && league.week >= REGULAR_WEEKS;
            expect(careerKitNeeded({ phase, presser: presser !== null, boxOpen: careerBoxOpen, lastPeriod }), J({ phase, presser, careerBoxOpen, league })).toBe(want);
            expect(!!boardKitNeeded(null, phase, presser, careerBoxOpen, league, REGULAR_WEEKS), J({ phase, presser, careerBoxOpen, league })).toBe(want);
            expect(!!nflKitNeeded1559({}, phase, presser, careerBoxOpen, league, REGULAR_WEEKS)).toBe(false);
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
