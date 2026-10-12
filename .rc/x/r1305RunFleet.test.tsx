/**
 * REVIEWER'S PROBE for Round 1305 (never committed; sent to a runner as an extra file and copied into src/test/
 * of the tree it runs in: the round's head, or a worktree of the base cbfa94fd).
 *
 * FLEET MODE (no R1305_IN): for each league kind, desk off and on, and each seed, a new league is played
 * on the REAL board from Week 1 by presses: sixteen weeks, the final week with the playoffs, the draft, the
 * summer and three weeks of the next season. After every press it prints a sha1 of the save with the two things
 * the round changes set aside (the key gameLog deleted; the two scores of every game under postseason.rounds
 * zeroed). The lines R1305F of the head and of the base must be equal. With R1305_OUT it also writes raw saves
 * at four points (after Week 8, the recap, the draft after one pick, the next season's hub).
 *
 * CROSS MODE (R1305_IN=<a file FLEET MODE wrote>): each raw save is put in storage, the board of THIS tree is
 * mounted on it, and play goes on for a few presses. Lines R1305X of the head and of the base, continuing the
 * same save, must be equal: an old save loads and plays on the head exactly as on the base, and a save the head
 * wrote loads and plays on the base.
 *
 * Lines R1305L say what the save's gameLog holds (they differ between the trees by design and are not diffed).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import type { ComponentType } from 'react';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.setConfig({ testTimeout: 3_000_000 });

/* eslint-disable @typescript-eslint/no-explicit-any */
function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const SAVE_KEY = 'front-office-save-v1';
const REAL_RANDOM = Math.random;
const useRandom = (fn: () => number) => { Math.random = fn; };
const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');
const raw = () => localStorage.getItem(SAVE_KEY);
const read = (): any => JSON.parse(raw()!);
const IN = process.env.R1305_IN || '';
const OUT = process.env.R1305_OUT || '';
const SEEDS = (process.env.R1305_SEEDS || '3,21').split(',').map(Number);
const dumps: Record<string, string> = {};

function digest(text: string | null): string {
  if (text === null) return 'NOSAVE';
  const s = JSON.parse(text);
  delete s.gameLog;
  for (const r of s.postseason?.rounds ?? []) for (const g of r.games) { g.homeScore = 0; g.awayScore = 0; }
  return sha1(JSON.stringify(s));
}
const REGULAR = /^w[0-9]+$/;
function logLine(text: string | null): string {
  if (text === null) return 'nosave';
  const s = JSON.parse(text);
  const club = s.league.teams[s.myTeam];
  const log = s.gameLog;
  if (log === undefined) return `hasLog=0|club=${club.wins}-${club.losses}`;
  const games: any[] = Array.isArray(log?.games) ? log.games : [];
  const reg = games.filter(g => REGULAR.test(String(g.where)));
  const won = reg.filter(g => g.winner === s.myTeam).length;
  const mine = games.every(g => g.home === s.myTeam || g.away === s.myTeam);
  const keys = new Set(games.map(g => g.key)).size === games.length;
  const low = games.length ? Math.min(...games.map(g => Math.min(g.homeScore, g.awayScore))) : -1;
  return `hasLog=1|v=${log?.v}|season=${log?.season}/${s.league.season}|n=${games.length}|first=${games[0]?.where}|last=${games[games.length - 1]?.where}|logrec=${won}-${reg.length - won}|club=${club.wins}-${club.losses}|allMine=${mine}|keysUnique=${keys}|lowestSide=${low}`;
}
function emit(kind: 'F' | 'X', id: string, point: string) {
  const text = raw();
  const s = text ? JSON.parse(text) : null;
  console.log(`R1305${kind}|${id}|${point}|${digest(text)}|phase=${s?.phase}|season=${s?.league?.season}|week=${s?.league?.week}`);
  console.log(`R1305L|${id}|${point}|${logLine(text)}`);
}

async function freshGame(moduleSeed: number) {
  vi.resetModules();
  useRandom(lehmer(moduleSeed));
  await import('@/lib/entityIds');
  const E: any = await import('@/lib/frontOffice');
  const { FO_DEPTH }: any = await import('@/data/frontOfficeDepth');
  const { openNflDesk }: any = await import('@/lib/nflGmDesk');
  const { default: Board } = (await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };
  return { E, FO_DEPTH, openNflDesk, Board };
}

const buttons = () => [...document.querySelectorAll('button')] as HTMLButtonElement[];
const textOf = (b: Element) => (b.textContent ?? '').trim();
function playButton(): HTMLButtonElement | null {
  return buttons().find(b => /^Play Week [0-9]+$/.test(textOf(b)) || textOf(b) === 'Play the final week + playoffs') ?? null;
}
function openWeek(): boolean {
  if (playButton()) return true;
  const box = screen.queryAllByText('This week')[0];
  if (box) fireEvent.click(box);
  return playButton() !== null;
}
/** One press of the week's button. False when no button could be found or the save did not move. */
function pressWeek(): boolean {
  if (!openWeek()) return false;
  const before = raw();
  fireEvent.click(playButton()!);
  return raw() !== before;
}
function pickUntilHub(kind: 'F' | 'X', id: string, tag: string, onFirst?: () => void): void {
  let n = 0;
  while (read().phase === 'draft' && n < 14) {
    const rows = screen.queryAllByText(/· age [0-9]+/);
    if (rows.length === 0) { console.log(`R1305${kind}|${id}|${tag}STUCK-nodraftrows|-`); break; }
    fireEvent.click(rows[0]);
    n += 1;
    emit(kind, id, `${tag}pick${n}`);
    if (n === 1 && onFirst) onFirst();
  }
}

afterEach(() => { cleanup(); Math.random = REAL_RANDOM; localStorage.clear(); });

if (!IN) {
  describe('R1305 reviewer fleet: whole seasons on the real board', () => {
    for (const kind of ['fifteen', 'deep'] as const) {
      for (const desk of [false, true]) {
        for (const seed of SEEDS) {
          const id = `${kind}|desk ${desk ? 'on' : 'off'}|seed ${seed}`;
          it(id, async () => {
            const G = await freshGame(1305);
            const rng = lehmer(seed);
            const league: any = kind === 'deep' ? G.E.initLeague(rng, { depth: G.FO_DEPTH }) : G.E.initLeague(rng);
            const clubs = Object.keys(league.teams);
            const team = clubs[seed % clubs.length];
            const save: any = { league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 };
            if (seed % 2 === 1) {
              save.trust = 50;
              save.mandate = { tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season: league.season };
            }
            if (seed % 5 === 0) {
              /* the doomed season: title or bust, no trust left to lose, a roster that cannot */
              save.trust = 5;
              save.mandate = { tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season: league.season };
              for (const p of league.teams[team].players) p.ovr = 60;
              league.teams[team].defense = 60;
            } else if (seed % 7 === 0) {
              /* a roster of 99s: a deep run and often a title */
              for (const p of league.teams[team].players) p.ovr = 99;
              league.teams[team].defense = 99;
            }
            if (desk) save.gm = G.openNflDesk(league, team);
            localStorage.setItem(SAVE_KEY, JSON.stringify(save));
            useRandom(lehmer(1000 + seed));
            let view = render(<G.Board />);
            emit('F', id, 'load');
            let stuck = false;
            for (let w = 1; w <= G.E.REGULAR_WEEKS; w += 1) {
              if (!pressWeek()) { console.log(`R1305F|${id}|s1w${w}STUCK|-`); stuck = true; break; }
              emit('F', id, `s1w${w}`);
              if (w === 8) dumps[`${id}|w8`] = raw()!;
            }
            expect(stuck, 'season one played to its end').toBe(false);
            const recap = read();
            dumps[`${id}|recap`] = raw()!;
            const post = recap.postseason;
            console.log(`R1305L|${id}|ending|phase=${recap.phase}|champion=${post?.champion}|club=${team} ${recap.league.teams[team].wins}-${recap.league.teams[team].losses}|trust=${recap.trust}|fired=${recap.fired}|titles=${recap.titles}`);
            if (post) console.log(`R1305F|${id}|winners|${post.rounds.flatMap((r: any) => r.games.map((g: any) => `${g.home}>${g.away}:${g.winner}`)).join(',')}`);
            if (post) console.log(`R1305L|${id}|playoffscores|${post.rounds.flatMap((r: any) => r.games.map((g: any) => `${g.homeScore}-${g.awayScore}`)).join(',')}`);
            if (recap.phase === 'fired') return;
            view.unmount();
            view = render(<G.Board />);
            emit('F', id, 'recap-reload');
            fireEvent.click(screen.getByText('Go to the draft'));
            emit('F', id, 'draft');
            pickUntilHub('F', id, '', () => { if (read().phase === 'draft') dumps[`${id}|pick1`] = raw()!; });
            emit('F', id, 'hub2');
            if (read().phase !== 'hub') return;
            dumps[`${id}|hub2`] = raw()!;
            view.unmount();
            view = render(<G.Board />);
            emit('F', id, 'hub2-reload');
            for (let w = 1; w <= 3; w += 1) {
              if (!pressWeek()) { console.log(`R1305F|${id}|s2w${w}STUCK|-`); break; }
              emit('F', id, `s2w${w}`);
            }
            view.unmount();
          });
        }
      }
    }
    it('writes the dumps', () => {
      if (OUT) fs.writeFileSync(OUT, JSON.stringify(dumps));
      console.log(`R1305L|dumps|${Object.keys(dumps).length} saves${OUT ? ` written to ${OUT}` : ''}`);
      expect(Object.keys(dumps).length).toBeGreaterThan(0);
    });
  });
} else {
  const saves: Record<string, string> = JSON.parse(fs.readFileSync(IN, 'utf8'));
  describe('R1305 reviewer cross: saves of one build continued on this one', () => {
    for (const id of Object.keys(saves).sort()) {
      it(id, async () => {
        const G = await freshGame(4242);
        localStorage.setItem(SAVE_KEY, saves[id]);
        useRandom(lehmer(909));
        let view = render(<G.Board />);
        const refused = screen.queryAllByText('This week').length === 0 && read().phase === 'hub';
        console.log(`R1305X|${id}|mounted|sameBytes=${raw() === saves[id]}|refused=${refused}`);
        emit('X', id, 'load');
        const phase = read().phase;
        if (phase === 'recap') {
          fireEvent.click(screen.getByText('Go to the draft'));
          emit('X', id, 'draft');
        }
        if (read().phase === 'draft') {
          pickUntilHub('X', id, 'x');
          /* a reload ends whatever the summer put on screen, as a player's next visit would */
          view.unmount();
          view = render(<G.Board />);
          emit('X', id, 'after-summer-reload');
        }
        if (read().phase === 'hub') {
          for (let k = 1; k <= 3; k += 1) {
            if (!pressWeek()) { console.log(`R1305X|${id}|press${k}STUCK|-`); break; }
            emit('X', id, `press${k}`);
          }
        }
        view.unmount();
        expect(refused, 'the save was not refused').toBe(false);
      });
    }
  });
}
