import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import PotentialProgress from '@/components/soccer-career/PotentialProgress';
import { effectivePotential, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { ballonDorAwaitingReveal, revealBallonDorResult } from '@/lib/soccerAwardReveal';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function savedCareer(): CareerState {
  const fixture = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  return structuredClone(fixture.saves.find((row: { id: string }) => row.id === 'ere').state);
}

function view(career: CareerState) {
  return <PotentialProgress ceiling={effectivePotential(career)} earned={career.potentialEarned ?? 0}
    eliteRun={career.eliteStreak ?? 0} overall={career.overall} retired={career.retired}
    awardPending={ballonDorAwaitingReveal(career) !== null} />;
}

function pendingCareer(won: boolean, phase: CareerState['phase'] = 'ballon_dor'): CareerState {
  const career = savedCareer();
  const season = { ...career.seasons.at(-1)!, year: 2030, ballonDor: won, ballonDorRank: won ? 1 : 3 } as SeasonRecord;
  return { ...career, phase, overall: 78, potential: 80, potentialEarned: won ? 2 : 0,
    eliteStreak: won ? 3 : 0, seasons: [...career.seasons.slice(0, -1), season], pendingSummary: season,
    pendingBallonDor: { year: 2030, playerRank: won ? 1 : 3, playerPoints: 70,
      playerNominated: true, nominees: [] } };
}

function privacyFindings(node: Element) {
  return node.getAttribute('data-potential-progress') === 'waiting'
    && node.querySelectorAll('[data-potential-ceiling], [data-potential-run], [data-potential-next]').length === 0
    ? [] : ['pending-progress-exposure'];
}

function wallFindings(node: Element) {
  return node.textContent?.includes('99 is the ceiling limit.') && !node.querySelector('[data-potential-next]')
    ? [] : ['hard-wall-target'];
}

describe('Soccer Career potential progress display', () => {
  it('shows the actual saved run without treating old seasons as near-ceiling evidence', () => {
    const career = { ...savedCareer(), overall: 70, potential: 90, potentialEarned: 0, eliteStreak: 3,
      pendingBallonDor: null };
    render(view(career));
    const panel = screen.getByRole('region', { name: 'Potential progress' });
    expect(panel.textContent).toContain('Elite run: 3 seasons.');
    expect(panel.textContent).toContain('88+ overall');
    expect(panel.textContent).not.toContain('Overall target met now.');
    expect(panel.textContent).not.toContain('consecutive');
  });

  it('keeps the run target visible when the current overall target is already met', () => {
    render(view({ ...savedCareer(), overall: 88, potential: 90, potentialEarned: 0, eliteStreak: 1, pendingBallonDor: null }));
    const panel = screen.getByRole('region', { name: 'Potential progress' });
    expect(panel.textContent).toContain('Elite run: 1 season.');
    expect(panel.textContent).toContain('elite run 2+');
    expect(panel.textContent).toContain('Overall target met now.');
  });

  it('shows the real effective ceiling and earned points with the actual eligibility requirements', () => {
    render(view({ ...savedCareer(), overall: 88, potential: 90, potentialEarned: 2, eliteStreak: 2, pendingBallonDor: null }));
    const panel = screen.getByRole('region', { name: 'Potential progress' });
    expect(panel.textContent).toContain('Ceiling 92/99');
    expect(panel.textContent).toContain('2 earned');
    expect(panel.textContent).toContain('90+ overall');
    expect(screen.getByText('Elite-season requirements').tagName).toBe('SUMMARY');
    expect(panel.textContent).toMatch(/30\+ appearances.*7\.5\+ rating/);
    expect(panel.textContent).toMatch(/Champions League, World Cup or Ballon d'Or/);
    expect(panel.textContent).toMatch(/tier 1 or tier 2.*30\+ goals.*8\.2\+ rating/);
  });

  it.each([95, 99])('keeps the 99 ceiling wall independent of overall %s', overall => {
    render(view({ ...savedCareer(), overall, potential: 99, potentialEarned: 0, eliteStreak: 5, pendingBallonDor: null }));
    const panel = screen.getByRole('region', { name: 'Potential progress' });
    expect(wallFindings(panel)).toEqual([]);
    expect(panel.textContent).toContain('Elite run: 5 seasons.');
    expect(panel.querySelector('details')).toBeNull();
  });

  it('keeps the saved record on retirement without promising another ceiling point', () => {
    render(view({ ...savedCareer(), retired: true, overall: 78, potential: 85, eliteStreak: 2, pendingBallonDor: null }));
    const panel = screen.getByRole('region', { name: 'Potential progress' });
    expect(panel.textContent).toContain('Career complete.');
    expect(panel.querySelector('[data-potential-next]')).toBeNull();
    expect(panel.querySelector('details')).toBeNull();
  });

  it('reads absent legacy counters as zero without migrating the save', () => {
    const career = { ...savedCareer(), pendingBallonDor: null };
    delete career.eliteStreak; delete career.potentialEarned;
    const before = JSON.stringify(career);
    render(view(career));
    expect(screen.getByRole('region', { name: 'Potential progress' }).textContent).toContain('Elite run: 0 seasons.');
    expect(JSON.stringify(career)).toBe(before);
    expect(Object.prototype.hasOwnProperty.call(career, 'eliteStreak')).toBe(false);
  });

  it.each(['newspaper', 'season_summary', 'ballon_dor', 'world_cup', 'international_debut', 'rivalry_event'] as const)(
    'conceals award-dependent counters during the actual queued %s boundary', phase => {
      let hidden: string | undefined;
      for (const won of [false, true]) {
        const career = pendingCareer(won, phase), raw = JSON.stringify(career);
        const rendered = render(view(career));
        const panel = screen.getByRole('region', { name: 'Potential progress' });
        expect(ballonDorAwaitingReveal(career)).toBe(2030);
        expect(privacyFindings(panel)).toEqual([]);
        if (hidden !== undefined) expect(panel.outerHTML).toBe(hidden);
        hidden = panel.outerHTML;
        expect(JSON.stringify(career)).toBe(raw);
        rendered.unmount();
        const revealed = revealBallonDorResult({ ...career, phase: 'ballon_dor' });
        render(view(revealed));
        expect(ballonDorAwaitingReveal(revealed)).toBeNull();
        expect(screen.getByRole('region', { name: 'Potential progress' }).textContent)
          .toContain(won ? 'Elite run: 3 seasons.' : 'Elite run: 0 seasons.');
        cleanup();
      }
    },
  );

  it.each(['revealed', 'speech', 'stale'] as const)('does not conceal an already visible %s award boundary', kind => {
    const career = pendingCareer(true);
    if (kind === 'revealed') career.pendingBallonDor!.revealed = true;
    if (kind === 'speech') career.pendingBallonDor!.speech = { id: 'thanks', line: 'Thanks', moved: '' };
    if (kind === 'stale') career.pendingBallonDor!.year = 2029;
    render(view(career));
    expect(ballonDorAwaitingReveal(career)).toBeNull();
    expect(screen.getByRole('region', { name: 'Potential progress' }).textContent).toContain('Ceiling 82/99');
  });

  it('keeps full saved bytes and consumes no random draw across reads and rerenders', () => {
    const career = pendingCareer(true), raw = JSON.stringify(career);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('A display must not draw'); });
    const rendered = render(view(career));
    rendered.rerender(view(career));
    const revealed = revealBallonDorResult(career);
    rendered.rerender(view(revealed));
    expect(JSON.stringify(career)).toBe(raw);
    expect(revealed.seasons).toBe(career.seasons);
    expect(random).not.toHaveBeenCalled();
  });

  it('binds the actual Attributes consumer to the guarded plain props', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/SoccerCareer.tsx'), 'utf8');
    const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const code = stripComments(source);
    expect(code.match(/<PotentialProgress\b/g)).toHaveLength(1);
    expect(code).toMatch(/<PotentialProgress\s+ceiling=\{ceiling\}\s+earned=\{earned\}/);
    expect(code).toMatch(/eliteRun=\{career\.eliteStreak \?\? 0\}/);
    expect(code).toMatch(/awardPending=\{ballonDorAwaitingReveal\(career\) !== null\}/);
    const insertion = code.match(/<PotentialProgress\b[\s\S]*?\/>/g)!;
    expect(insertion).toHaveLength(1);
    expect(source.split(insertion[0])).toHaveLength(2);
    const commented = insertion[0].split('\n').map(line => `// ${line}`).join('\n');
    const fault = source.replace(insertion[0], commented);
    expect(fault).not.toBe(source);
    expect(stripComments(fault).match(/<PotentialProgress\b/g)).toBeNull();
    const undo = fault.replace(commented, insertion[0]);
    expect(undo).toBe(source);
  });

  it('detects a labelled copied pending-view exposure and restores the whole actual DOM', () => {
    render(view(pendingCareer(true)));
    const healthy = screen.getByRole('region', { name: 'Potential progress' });
    const fault = healthy.cloneNode(true) as Element, before = fault.outerHTML;
    const extra = document.createElement('p'); extra.dataset.potentialCeiling = ''; extra.textContent = 'Ceiling 82/99';
    fault.appendChild(extra);
    expect(fault.outerHTML).not.toBe(before);
    expect(privacyFindings(healthy)).toEqual([]);
    expect(privacyFindings(fault)).toEqual(['pending-progress-exposure']);
    extra.remove();
    expect(fault.outerHTML).toBe(before);
    expect(privacyFindings(fault)).toEqual([]);
  });

  it('detects a labelled copied 99-wall target and restores the whole actual DOM', () => {
    render(view({ ...savedCareer(), overall: 99, potential: 99, pendingBallonDor: null }));
    const healthy = screen.getByRole('region', { name: 'Potential progress' });
    const fault = healthy.cloneNode(true) as Element, before = fault.outerHTML;
    const extra = document.createElement('p'); extra.dataset.potentialNext = ''; extra.textContent = 'Next ceiling point';
    fault.appendChild(extra);
    expect(fault.outerHTML).not.toBe(before);
    expect(wallFindings(healthy)).toEqual([]);
    expect(wallFindings(fault)).toEqual(['hard-wall-target']);
    extra.remove();
    expect(fault.outerHTML).toBe(before);
    expect(wallFindings(fault)).toEqual([]);
  });
});
