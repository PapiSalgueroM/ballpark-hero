import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { FO_DEPTH } from '@/data/frontOfficeDepth';
import { initLeague, type GmPlayer, type LeagueState } from '@/lib/frontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';
const seeded = () => { let n = 889; return () => { n = Math.imul(n, 1664525) + 1013904223 >>> 0; return n / 4294967296; }; };
function fixture() {
  const league = initLeague(seeded(), { depth: FO_DEPTH, userTeam: 'CLE' });
  // A persisted new-model fixture also runs against the original Board for the negative baseline.
  for (const t of Object.values(league.teams)) for (const p of [...t.players, ...(t.practice ?? [])]) {
    const evidence = FO_DEPTH[t.abbr].ratingEvidence?.[`${p.name}|${p.pos}`];
    if (evidence) p.openingRatingEvidence = JSON.parse(JSON.stringify(evidence));
  }
  const player = league.teams.CLE.players.find(p => p.openingRatingEvidence?.partial)!;
  expect(player).toBeTruthy();
  player.name = 'Fictional evidence player';
  player.noSeason = true;
  return { league, player };
}
function open(league: LeagueState, player: GmPlayer) {
  localStorage.setItem(KEY, JSON.stringify({ league, myTeam: 'CLE', phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
  const raw = localStorage.getItem(KEY);
  render(<FrontOfficeBoard />);
  fireEvent.click(screen.getByText('Roster', { exact: true }));
  fireEvent.click(document.querySelector(`[data-roster-group="${player.pos}"]`)!);
  expect(localStorage.getItem(KEY)).toBe(raw);
  return document.querySelector(`[data-roster-row="${player.id}"]`) as HTMLElement;
}

describe('NFL saved opening rating evidence', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it('explains a partial new estimate instead of reusing the old draft-only claim', () => {
    const { league, player } = fixture();
    const row = open(league, player);
    expect(row.textContent).toContain(`opening estimate ${player.openingRatingEvidence!.openingOvr}`);
    expect(row.textContent).toContain('limited evidence');
    expect(row.textContent).not.toContain('no 2025 season, rated on draft spot');
    expect(row.querySelector('[data-rating-partial]')).toBeTruthy();
    expect(row.querySelector('[data-draft-rated]')).toBeNull();
    expect(document.querySelector('[data-rating-legend]')?.textContent).toContain('contracts are fictional');
  });

  it('retains the original evidence after transfer, development and reload', () => {
    const { league } = fixture();
    const from = league.teams.KC;
    const player = from.players.find(p => p.openingRatingEvidence?.partial)!;
    expect(player).toBeTruthy();
    const original = JSON.parse(JSON.stringify(player.openingRatingEvidence));
    from.players = from.players.filter(p => p.id !== player.id);
    player.name = 'Fictional transferred evidence player';
    player.ovr = Math.min(99, original.openingOvr + 2);
    league.teams.CLE.players.push(player);
    league.champions.push({ season: league.season - 1, team: 'CLE' });
    const row = open(league, player);
    expect(row.textContent).toContain(`opening estimate ${original.openingOvr}`);
    expect(row.querySelector('b.text-primary')?.textContent).toBe(`${player.ovr}e`);
    expect(document.querySelector('[data-rating-legend]')?.textContent).toContain('Later changes come from this save');
    const raw = localStorage.getItem(KEY)!;
    cleanup();
    render(<FrontOfficeBoard />);
    expect(localStorage.getItem(KEY)).toBe(raw);
    const restored = JSON.parse(raw).league.teams.CLE.players.find((p: GmPlayer) => p.id === player.id);
    expect(restored.openingRatingEvidence).toEqual(original);
  });

  it('keeps an existing full-roster save on its original rating and label', () => {
    const { league, player } = fixture();
    for (const t of Object.values(league.teams)) for (const p of [...t.players, ...(t.practice ?? [])]) delete p.openingRatingEvidence;
    player.ovr = 65;
    const row = open(league, player);
    expect(row.textContent).toContain('no 2025 season, rated on draft spot');
    expect(row.querySelector('[data-rating-partial]')).toBeNull();
    expect(document.querySelector('[data-rating-legend]')).toBeNull();
    expect(JSON.parse(localStorage.getItem(KEY)!).league.teams.CLE.players.find((p: GmPlayer) => p.id === player.id).ovr).toBe(65);
  });

  it('does not crash or present an unsupported basis from damaged metadata', () => {
    const { league, player } = fixture();
    player.openingRatingEvidence!.basis = 'unknown' as never;
    const row = open(league, player);
    expect(row.querySelector('[data-rating-partial]')).toBeNull();
    expect(row.textContent).not.toContain('opening estimate');
    expect(row.textContent).toContain('opening evidence unavailable');
    expect(row.querySelector('[data-draft-rated]')).toBeNull();
  });
});
