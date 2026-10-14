import React from 'react';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

const observed = vi.hoisted(() => {
  const native = Math.random;
  const value: any = { native, phase: 'module-bootstrap', draws: [], models: [], derived: [], ambiguous: false };
  Math.random = () => { const result = native(); value.draws.push({ value: result, caller: new Error().stack ?? null, phase: value.phase }); return result; };
  return value;
});
vi.mock('@/lib/season/core', async importOriginal => {
  const actual: any = await importOriginal();
  return { ...actual, deriveSeason: (...args: any[]) => {
    const before = actual.deriveSeason(...args);
    if (!observed.ambiguous || !before) return before;
    const changed = { ...before, labels: before.labels.map((label: any) => ({ ...label })) };
    const slot = changed.labels.findIndex((label: any, index: number) => index > 0 && label.named);
    if (slot < 1) throw new Error('No named slot for labelled copied-input ambiguity');
    const prior = changed.labels[slot];
    changed.labels[slot] = { name: 'another club', named: false, key: `copied-ambiguity-${slot}` };
    observed.derived.push({ beforeRaw: JSON.stringify(before), faultRaw: JSON.stringify(changed), slot, prior, actualChangedInput: changed, caller: new Error().stack });
    return changed;
  } };
});
vi.mock('@/components/season-centre/SeasonCentre', async importOriginal => {
  const actual: any = await importOriginal(), react = await import('react');
  return { ...actual, SeasonCentre: (props: any) => {
    observed.models.push(props.model);
    return react.createElement(actual.SeasonCentre, props);
  } };
});
import SoccerSeasonCentre from '@/components/soccer-career/SoccerSeasonCentre';
import { FALLBACK_CLUBS } from '@/lib/soccerCareerEngine';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import { buildSoccerSeasonCtx, SOCCER } from '@/lib/season/soccer';
import { deriveSeason, planMoments, tableAt } from '@/lib/season/core';
import { soccerOwnGoals } from '@/lib/season/soccerEvents';
import { historicalOpponentLabels } from '@/lib/season/historicalOpponentLabels';

const KEY = 'soccerCareerSave', RESUME = 'seasonCentre:v1:soccer';
const declarations = [
  { id: 'table-first', title: 'Luton display: normal first meeting', boundary: 'table', meeting: 0 },
  { id: 'table-return', title: 'Luton display: normal return meeting', boundary: 'table', meeting: 1 },
  { id: 'severe-first', title: 'Luton display: severe first meeting', boundary: 'severe', meeting: 0 },
  { id: 'severe-return', title: 'Luton display: severe return meeting', boundary: 'severe', meeting: 1 },
  { id: 'wrong-year', title: 'Luton display: wrong year refuses overlay', boundary: 'wrong-year', meeting: 0 },
  { id: 'wrong-league', title: 'Luton display: another league refuses overlay', boundary: 'wrong-league', meeting: 0 },
  { id: 'ambiguous-first', title: 'Luton display: ambiguous first meeting refuses overlay', boundary: 'ambiguous', meeting: 0 },
  { id: 'ambiguous-return', title: 'Luton display: ambiguous return meeting refuses overlay', boundary: 'ambiguous', meeting: 1 },
];
const clone = (value: any) => JSON.parse(JSON.stringify(value));
const nonlabels = (season: any) => { const { labels, ...rest } = season; return rest; };
const metadata = (value: any, route = '$', rows: any[] = []): any[] => {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') { rows.push({ route, type: typeof value, source: typeof value === 'function' ? String(value) : null }); return rows; }
  if (value && typeof value === 'object') for (const key of Object.keys(value)) metadata(value[key], `${route}.${key}`, rows);
  return rows;
};
const snapshot = () => ({ raw: localStorage.getItem(KEY), draws: clone(observed.draws) });
const findings = (row: any) => {
  const out: string[] = [], eligible = ['table', 'severe'].includes(row.boundary);
  if (eligible) {
    if (row.view.fixtures.filter((value: any) => value.name === 'Luton Town').length !== 2) out.push('fixture-display-binding');
    if (!row.view.scoreNames.includes('Luton Town')) out.push('match-display-binding');
    if (row.boundary === 'table' && row.view.table.filter((value: any) => value.club === 'Luton Town').length !== 1) out.push('table-display-binding');
  } else if (row.model.names.includes('Luton Town') || row.view.fixtures.some((value: any) => value.name === 'Luton Town') || row.view.table.some((value: any) => value.club === 'Luton Town') || row.view.scoreNames.includes('Luton Town')) out.push('scope-refusal');
  return out;
};
afterEach(() => { cleanup(); observed.ambiguous = false; vi.unstubAllGlobals(); });
afterAll(() => { Math.random = observed.native; const folder = process.env.SOCCER_LUTON_OBSERVATIONS; if (folder) fs.writeFileSync(path.join(folder, 'full-global-draws.json'), JSON.stringify(observed.draws, null, 2)); });

describe('actual Luton historical display component boundaries', () => {
  for (const spec of declarations) it(spec.title, async () => {
    const folder = process.env.SOCCER_LUTON_OBSERVATIONS, fixtureFile = process.env.SOCCER_LUTON_FIXTURES;
    if (!folder || !fixtureFile) throw new Error('Mandatory retained observations and full fixtures paths');
    fs.mkdirSync(folder, { recursive: true });
    const row: any = { ...spec, arm: process.env.SOCCER_LUTON_ARM, status: 'running', views: [], reads: [], ambiguity: [], errors: [] };
    let mounted: ReturnType<typeof render> | undefined, career: any;
    const retain = () => fs.writeFileSync(path.join(folder, `${spec.id}.json`), JSON.stringify(row, null, 2));
    retain();
    try {
      observed.phase = `${spec.id}:setup`; observed.models = []; observed.derived = []; observed.ambiguous = false;
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 0));
      vi.stubGlobal('cancelAnimationFrame', (handle: number) => clearTimeout(handle));
      vi.stubGlobal('scrollTo', () => {});
      vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(min-width: 768px)', media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }));
      row.domApparatus = { wideQuery: '(min-width: 768px)', wideMatches: true, otherMediaMatches: false, raf: 'native timers', scroll: 'JSDOM noop', pixelClaim: false };
      await act(async () => {}); await import('@/components/season-centre/MiniPitch');
      const fixtures = JSON.parse(fs.readFileSync(fixtureFile, 'utf8')), fixture = fixtures.find((value: any) => value.id === spec.boundary);
      if (!fixture) throw new Error('Exact declared saved boundary missing');
      career = clone(fixture.career); const savedRow = career.seasons[0]; row.fixture = fixture; row.inputBefore = JSON.stringify(career);
      expect(isSoccerCareerSave(career)).toBe(true);
      const ctx = buildSoccerSeasonCtx(career, FALLBACK_CLUBS, savedRow), base = deriveSeason(SOCCER, savedRow, ctx);
      expect(base).not.toBeNull();
      const expected = soccerOwnGoals(base!, planMoments(SOCCER, savedRow, ctx, base!));
      row.base = clone(base); row.expectedNonlabelPresentation = clone(expected); row.context = clone(ctx);
      const unnamed = base!.labels.flatMap((label: any, index: number) => label.named ? [] : [index]);
      const targetSlot = ['wrong-year', 'wrong-league'].includes(spec.boundary) ? 1 : unnamed[0];
      if (!['wrong-year', 'wrong-league'].includes(spec.boundary)) expect(unnamed).toHaveLength(1);
      const meetings = base!.games.filter(game => game.opp === targetSlot); expect(meetings).toHaveLength(2);
      const target = meetings[spec.meeting]; expect(target).toBeDefined(); row.target = clone(target); row.targetSlot = targetSlot;
      localStorage.clear(); localStorage.setItem(KEY, row.inputBefore);
      if (target.md > 1) localStorage.setItem(RESUME, JSON.stringify({ key: base!.key, year: savedRow.year, md: target.md - 1, speed: 'results', stable: ctx.mode !== 'table' || ctx.finish?.finish === 1, round: 'Matchday' }));
      observed.ambiguous = spec.boundary === 'ambiguous'; observed.phase = `${spec.id}:mount`;
      mounted = render(<SoccerSeasonCentre career={career} clubs={FALLBACK_CLUBS} row={savedRow} mode="watch" onClose={() => { row.closeCalls = (row.closeCalls ?? 0) + 1; }} offer={false} />);
      await waitFor(() => expect(observed.models.length).toBeGreaterThan(0));
      const help = mounted.container.querySelector('[data-season-help]');
      if (help) { fireEvent.click(within(help as HTMLElement).getByRole('button', { name: 'Got it', exact: true })); await waitFor(() => expect(mounted!.container.querySelector('[data-season-help]')).toBeNull()); }
      const latest = () => observed.models.at(-1), fixtureRows = () => Array.from(mounted!.container.querySelectorAll('[data-fixtures] [data-fixture-row]'), element => ({ md: Number(element.getAttribute('data-fixture-row')), name: element.querySelector('[data-fixture-name]')?.textContent, html: element.outerHTML }));
      const tableRows = () => Array.from(mounted!.container.querySelectorAll('[data-centre-table] [data-club]'), element => ({ club: element.getAttribute('data-club'), text: element.textContent, cells: Array.from(element.children, cell => cell.textContent), html: element.outerHTML }));
      const read = async (id: string, operation: () => any) => { observed.phase = `${spec.id}:${id}`; const before = snapshot(), record: any = { id, before }; row.reads.push(record); retain();
        try { record.output = await operation(); return record.output; } catch (error) { record.error = String((error as Error)?.stack ?? error); throw error; }
        finally { record.after = snapshot(); record.findings = [before.raw !== record.after.raw && 'raw-save', JSON.stringify(before.draws) !== JSON.stringify(record.after.draws) && 'read-rng'].filter(Boolean); retain(); expect(record.findings).toEqual([]); } };
      row.loaded = snapshot();
      const fixtureView = await read('fixtures', () => fixtureRows());
      expect(fixtureView).toHaveLength(base!.games.length);
      const kickoff = mounted.container.querySelector('[data-kickoff]'); expect(kickoff).not.toBeNull();
      const roundWord = latest().season.mode === 'results' ? 'League game' : latest().words.round;
      const button = target.md > 1 ? within(kickoff as HTMLElement).getByRole('button', { name: `▶ ${roundWord} ${target.md}`, exact: true }) : within(kickoff as HTMLElement).getAllByRole('button')[0];
      row.publicActions = { kickoff: button.textContent, poster: null, results: null };
      await read('actual-match', async () => {
        fireEvent.click(button);
        if (mounted!.container.querySelector('[data-poster]')) {
          const bar = mounted!.container.querySelector('[data-centre-bar]'); expect(bar).not.toBeNull();
          const continueButton = within(bar as HTMLElement).getByRole('button', { name: `▶ ${roundWord} ${target.md}`, exact: true }); row.publicActions.poster = continueButton.textContent; fireEvent.click(continueButton);
        }
        await waitFor(() => expect(mounted!.container.querySelector(`[data-matchday="${target.md}"] [data-match-clock]`)).not.toBeNull());
        const speedGroup = within(mounted!.container).getByRole('group', { name: 'Clock speed', exact: true }), results = within(speedGroup).getByRole('button', { name: 'Results', exact: true });
        row.publicActions.results = results.textContent; fireEvent.click(results);
        await waitFor(() => expect(mounted!.container.querySelector(`[data-matchday="${target.md}"] [data-full-time]`)).not.toBeNull());
        if (ctx.mode === 'table') await waitFor(() => expect(mounted!.container.querySelector('[data-centre-table]')?.textContent).toContain(`After ${latest().words.round.toLowerCase()} ${target.md}`));
      });
      const view = await read('names-and-table', () => ({ fixtures: fixtureRows(), table: tableRows(), scoreNames: Array.from(mounted!.container.querySelectorAll(`[data-matchday="${target.md}"] [data-score-bar] span`)).filter(element => !element.hasAttribute('data-score-bug')).map(element => element.textContent), html: mounted!.container.innerHTML }));
      row.model = clone(latest()); row.modelUnsupportedFields = metadata(latest()); row.view = view; row.views = observed.models.map((model: any) => ({ data: clone(model), unsupportedFields: metadata(model) }));
      row.numericTableBefore = tableAt(base!, base!.games.length); row.numericTableAfter = tableAt(latest().season, latest().season.games.length);
      expect(nonlabels(latest().season)).toEqual(nonlabels(expected)); expect(row.numericTableAfter).toEqual(row.numericTableBefore);
      expect(view.fixtures.map((item: any) => item.md)).toEqual(base!.games.map(game => game.md));
      expect(view.fixtures.map((item: any) => item.name)).toEqual(base!.games.map(game => latest().names[game.opp]));
      expect(view.scoreNames).toEqual(target.home ? [savedRow.club, latest().names[target.opp]] : [latest().names[target.opp], savedRow.club]);
      row.renderedTableExpected = tableAt(base!, target.md).map((item, index) => ({ slot: item.slot, numericCells: [String(index + 1), String(item.w), String(item.d), String(item.l), `${item.gf}-${item.ga}`, item.gf - item.ga > 0 ? `+${item.gf-item.ga}` : String(item.gf-item.ga), String(item.pts)] }));
      expect(view.table.map((item: any) => [item.cells[0], ...item.cells.slice(2)])).toEqual(row.renderedTableExpected.map((item: any) => item.numericCells));
      expect(JSON.stringify(career)).toBe(row.inputBefore); expect(localStorage.getItem(KEY)).toBe(row.inputBefore);
      expect(spec.boundary === 'severe' ? view.table.length : ctx.mode === 'table' ? view.table.length : 0).toBe(spec.boundary === 'severe' ? 0 : ctx.mode === 'table' ? base!.teams : 0);
      row.findings = findings(row); retain();
      expect(row.findings, `LUTON_COMPONENT_${spec.id}`).toEqual([]);
      row.status = 'pass';
    } catch (error) { row.status = 'fail'; row.errors.push({ name: (error as Error)?.name ?? typeof error, message: String((error as Error)?.message ?? error), stack: String((error as Error)?.stack ?? error) }); throw error; }
    finally {
      try {
        mounted?.unmount();
        for (const item of observed.derived) {
          const changed = item.actualChangedInput, record: any = { beforeRaw: item.beforeRaw, faultRaw: item.faultRaw, changedSlot: item.slot, caller: item.caller, status: 'running' }; row.ambiguity.push(record); retain();
          expect(JSON.stringify(changed)).toBe(item.faultRaw); changed.labels[item.slot] = item.prior;
          record.undoRaw = JSON.stringify(changed); record.actualSameFaultReversed = true; retain();
          expect(record.undoRaw).toBe(item.beforeRaw);
          const input = JSON.parse(item.faultRaw); record.refused = historicalOpponentLabels(row.fixture.career.seasons[0], row.context, input) === null; retain(); expect(record.refused).toBe(true); record.status = 'pass';
        }
      } catch (error) { row.status = 'fail'; row.errors.push({ stage: 'ambiguity-and-unmount', stack: String((error as Error)?.stack ?? error) }); throw error; }
      finally { row.inputAfter = career ? JSON.stringify(career) : null; row.rawAfter = localStorage.getItem(KEY); row.draws = clone(observed.draws); row.rawCallerEqualityAcrossArmsClaim = false; retain(); }
    }
  });
});
