import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import ConquestRegionMap from '@/components/conquest/ConquestRegionMap';
import type { ConquestMapSport } from '@/lib/conquestMapLook';

const sport: ConquestMapSport = {
  key: 'fixture', regionNoun: 'territory', viewBox: { width: 120, height: 40 },
  regions: [
    { id: 'north', name: 'North Vale', path: 'M0 0H40V40H0Z', labelX: 20, labelY: 20 },
    { id: 'middle', name: 'Middle Vale', path: 'M40 0H80V40H40Z', labelX: 60, labelY: 20 },
    { id: 'south', name: 'South Vale', path: 'M80 0H120V40H80Z', labelX: 100, labelY: 20 },
  ],
  adjacency: { north: ['middle'], middle: ['north', 'south'], south: ['middle'] },
  teams: [
    { id: 'amber', city: 'Alder', name: 'Owls', color: '#bd6200' },
    { id: 'blue', city: 'Birch', name: 'Foxes', color: '#006dbd' },
  ],
};
const owners = { north: 'amber', middle: 'amber', south: null };
const details = (view: ReturnType<typeof render>) => view.getByRole('region', { name: 'Territory details' });
const hit = (view: ReturnType<typeof render>, name = 'North Vale') => view.getByRole('button', { name: `View ${name} details` });

afterEach(cleanup);

describe('conquest territory details', () => {
  it('keeps initial details closed and hover temporary', () => {
    const view = render(<ConquestRegionMap sport={sport} owners={owners} />);
    expect(view.queryByRole('region', { name: 'Territory details' })).toBeNull();
    expect(hit(view)).toHaveAttribute('tabindex', '0');
    expect(hit(view)).toHaveAttribute('aria-expanded', 'false');
    fireEvent.mouseEnter(hit(view));
    expect(view.getByText('North Vale')).toBeInTheDocument();
    expect(view.queryByRole('region', { name: 'Territory details' })).toBeNull();
    fireEvent.mouseLeave(hit(view));
    expect(view.queryByText('North Vale')).toBeNull();
  });

  it('keeps a tapped selection open after pointer exit and independent hover, then closes with restored focus', () => {
    const view = render(<ConquestRegionMap sport={sport} owners={owners} />);
    const target = hit(view);
    target.focus();
    fireEvent.mouseEnter(target);
    fireEvent.click(target);
    const panel = details(view);
    expect(panel).toHaveAttribute('data-region-details', 'north');
    expect(target).toHaveAttribute('aria-controls', panel.id);
    expect(target).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel).getByRole('heading', { name: 'North Vale' })).toBeInTheDocument();
    expect(panel).toHaveTextContent('Alder Owls');
    expect(panel).toHaveTextContent('2 territories');
    fireEvent.mouseLeave(target);
    fireEvent.mouseEnter(hit(view, 'South Vale'));
    fireEvent.mouseLeave(hit(view, 'South Vale'));
    expect(details(view)).toBe(panel);
    expect(panel).toHaveAttribute('data-region-details', 'north');
    expect(view.queryByText('South Vale')).toBeNull();
    const close = within(panel).getByRole('button', { name: 'Close territory details' });
    close.focus();
    fireEvent.click(close);
    expect(view.queryByRole('region', { name: 'Territory details' })).toBeNull();
    expect(target).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(target);
    expect(hit(view)).toBe(target);
  });

  it.each(['Enter', ' '])('opens details with the %s keyboard action and prevents its default', key => {
    const view = render(<ConquestRegionMap sport={sport} owners={owners} showLegend={false} />);
    const target = hit(view, 'Middle Vale');
    target.focus();
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    fireEvent(target, event);
    expect(event.defaultPrevented).toBe(true);
    expect(details(view)).toHaveAttribute('data-region-details', 'middle');
    expect(target).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toBe(target);
    fireEvent.keyDown(target, { key: 'ArrowRight' });
    expect(details(view)).toHaveAttribute('data-region-details', 'middle');
  });

  it('updates the selected owner, empire count and invincibility from current props without replacing the target', () => {
    const view = render(<ConquestRegionMap sport={sport} owners={owners} invincibleTeams={new Set(['amber'])} />);
    const target = hit(view);
    fireEvent.click(target);
    const panel = details(view);
    expect(panel).toHaveTextContent('Alder Owls');
    expect(panel).toHaveTextContent('2 territories');
    expect(panel).toHaveTextContent('Invincible');
    const changed = { north: 'blue', middle: 'blue', south: 'blue' };
    const original = JSON.stringify(changed);
    view.rerender(<ConquestRegionMap sport={sport} owners={changed} invincibleTeams={new Set()} />);
    expect(details(view)).toBe(panel);
    expect(panel).toHaveTextContent('Birch Foxes');
    expect(panel).toHaveTextContent('3 territories');
    expect(panel).not.toHaveTextContent('Alder Owls');
    expect(panel).not.toHaveTextContent('Invincible');
    expect(hit(view)).toBe(target);
    expect(JSON.stringify(changed)).toBe(original);
  });

  it('shows an unclaimed power-up only while the selected territory is unclaimed', () => {
    const powers = new Set(['south']);
    const view = render(<ConquestRegionMap sport={sport} owners={owners} powerupStates={powers} />);
    fireEvent.click(hit(view, 'South Vale'));
    const panel = details(view);
    expect(panel).toHaveTextContent('Unclaimed');
    expect(panel).toHaveTextContent('Power-Up available');
    view.rerender(<ConquestRegionMap sport={sport} owners={{ ...owners, south: 'blue' }} powerupStates={powers} />);
    expect(details(view)).toBe(panel);
    expect(panel).toHaveTextContent('Birch Foxes');
    expect(panel).toHaveTextContent('1 territory');
    expect(panel).not.toHaveTextContent('Unclaimed');
    expect(panel).not.toHaveTextContent('Power-Up available');
    expect([...powers]).toEqual(['south']);
  });

  it('replaces the selection on another tap and clears it when its region leaves the sport', () => {
    const view = render(<ConquestRegionMap sport={sport} owners={owners} />);
    const first = hit(view);
    fireEvent.click(first);
    fireEvent.click(hit(view, 'South Vale'));
    expect(details(view)).toHaveAttribute('data-region-details', 'south');
    expect(first).toHaveAttribute('aria-expanded', 'false');
    const shortened = { ...sport, regions: sport.regions.slice(0, 2) };
    view.rerender(<ConquestRegionMap sport={shortened} owners={owners} />);
    expect(view.queryByRole('region', { name: 'Territory details' })).toBeNull();
    expect(hit(view)).toHaveAttribute('aria-expanded', 'false');
  });

  it('preserves camera, geometry, home, highlight, battle and takeover layers when details open', () => {
    const props = {
      sport, owners, size: 'stage' as const, labelStyle: 'caps' as const,
      focusRegions: ['north', 'middle'], homeRegions: { amber: 'north' }, highlightTeam: 'amber',
      battle: { attacker: 'amber', defender: 'blue', stage: 'resolved' as const, winner: 'amber', targetRegion: 'middle' },
      takeover: { key: 12, from: { middle: 'blue' } },
    };
    const view = render(<ConquestRegionMap {...props} />);
    const svg = view.container.querySelector('svg')!;
    const camera = view.container.querySelector('[data-layer="camera"]')!;
    const layerSelector = '[data-layer]:not([data-layer="hit"]):not([data-layer="camera"]), [data-label-team]';
    const frozen = [...view.container.querySelectorAll(layerSelector)].map(element => element.outerHTML);
    const hits = view.getAllByRole('button');
    expect(camera).toContainElement(hit(view));
    expect(view.container.querySelector('[data-layer="takeover"]')).toHaveAttribute('data-from', 'blue');
    expect(view.container.querySelector('[data-layer="result"]')).toHaveAttribute('data-gain', '1');
    const cameraStyle = camera.getAttribute('style');
    fireEvent.click(hit(view));
    expect(details(view)).toHaveAttribute('data-region-details', 'north');
    expect(view.container.querySelector('svg')).toBe(svg);
    expect(view.container.querySelector('[data-layer="camera"]')).toBe(camera);
    expect(camera).toHaveAttribute('style', cameraStyle!);
    expect([...view.container.querySelectorAll(layerSelector)].map(element => element.outerHTML)).toEqual(frozen);
    for (const target of hits) expect(target.isConnected).toBe(true);
    expect(svg).toHaveAttribute('viewBox', '0 0 120 40');
  });

  it('keeps an unknown owner visible instead of reporting an unclaimed power-up', () => {
    const view = render(<ConquestRegionMap sport={sport} owners={{ ...owners, north: 'unknown-fixture' }} powerupStates={new Set(['north'])} />);
    fireEvent.click(hit(view));
    expect(details(view)).toHaveTextContent('Owner: unknown-fixture');
    expect(details(view)).not.toHaveTextContent('Unclaimed');
    expect(details(view)).not.toHaveTextContent('Power-Up available');
  });
});
