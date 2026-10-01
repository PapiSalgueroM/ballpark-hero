import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLayoutEffect } from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import ConquestRegionMap, { type ConquestRegionMapProps } from '@/components/conquest/ConquestRegionMap';
import { boundMapView, fitMapView, panMapView, zoomMapView } from '@/lib/conquestMapView';
import type { ConquestMapSport } from '@/lib/conquestMapLook';

const sport: ConquestMapSport = {
  key: 'fixture', regionNoun: 'territory', viewBox: { width: 120, height: 80 },
  regions: Array.from({ length: 6 }, (_, index) => {
    const x = index % 3 * 40, y = Math.floor(index / 3) * 40;
    return { id: `r${index}`, name: ['North Vale', 'East Vale', 'River Vale', 'South Vale', 'West Vale', 'Coast Vale'][index], path: `M${x} ${y}L${x + 40} ${y}L${x + 40} ${y + 40}L${x} ${y + 40}Z`, labelX: x + 20, labelY: y + 20 };
  }),
  adjacency: { r0: ['r1', 'r3'], r1: ['r0', 'r2', 'r4'], r2: ['r1', 'r5'], r3: ['r0', 'r4'], r4: ['r1', 'r3', 'r5'], r5: ['r2', 'r4'] },
  teams: [
    { id: 'amber', city: 'Alder', name: 'Owls', color: '#bd6200' },
    { id: 'blue', city: 'Birch', name: 'Foxes', color: '#006dbd' },
    { id: 'green', city: 'Cedar', name: 'Hares', color: '#0d8a31' },
  ],
};
const owners = Object.freeze({ r0: 'amber', r1: 'amber', r2: 'blue', r3: null, r4: null, r5: 'blue' });
const props = { sport, owners, powerupStates: new Set(['r1', 'r3']), invincibleTeams: new Set(['amber']), focusRegions: null, showLegend: false };
const map = (view: ReturnType<typeof render>) => view.container.querySelector('svg[data-map]') as SVGSVGElement;
const box = (view: ReturnType<typeof render>) => map(view).getAttribute('viewBox')!.split(' ').map(Number);
const action = (view: ReturnType<typeof render>, name: string) => view.getByRole('button', { name });
const open = (view: ReturnType<typeof render>) => fireEvent.click(action(view, 'Explore map'));
const matches = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll('[data-match="true"]')].map(node => node.getAttribute('data-region'));
const filter = (view: ReturnType<typeof render>, label: string, value: string) => fireEvent.change(view.getByLabelText(label), { target: { value } });
function BeforePassive({ capture, ...mapProps }: ConquestRegionMapProps & { capture: () => void }) {
  useLayoutEffect(() => { capture(); });
  return <ConquestRegionMap {...mapProps} />;
}

afterEach(cleanup);

describe('conquest Explore geometry', () => {
  it('bounds zoom and pan, retaining the viewport center and the full map aspect ratio', () => {
    const full = { x: 0, y: 0, scale: 1 };
    const zoom = zoomMapView(full, 2, sport.viewBox);
    expect(zoom).toEqual({ x: 30, y: 20, scale: 2 });
    expect(panMapView(zoom, 1000, -1000, sport.viewBox)).toEqual({ x: 60, y: 0, scale: 2 });
    expect(boundMapView({ x: -1000, y: 1000, scale: 99 }, sport.viewBox)).toEqual({ x: 0, y: 80 - 80 / 2.6, scale: 2.6 });
    expect(zoomMapView(zoom, 0, sport.viewBox)).toEqual(full);
  });

  it('fits actual region bounds with padding and clamps edge fits within the map', () => {
    const fit = fitMapView({ minX: 40, minY: 0, maxX: 80, maxY: 40 }, sport.viewBox);
    expect(fit.scale).toBeCloseTo(80 / 46.4);
    expect(fit.x).toBeCloseTo(25.2);
    expect(fit.y).toBe(0);
    expect(fit.x + 120 / fit.scale).toBeLessThanOrEqual(120);
    expect(fit.y + 80 / fit.scale).toBeLessThanOrEqual(80);
    expect(fitMapView({ minX: 0, minY: 0, maxX: 120, maxY: 80 }, sport.viewBox)).toEqual({ x: 0, y: 0, scale: 1 });
  });
});

describe('actual Conquest map Explore', () => {
  it('starts quiet and retains the map, hit nodes, fills and selected details across open, filter and close', () => {
    const view = render(<ConquestRegionMap {...props} />);
    const svg = map(view);
    const paths = [...view.container.querySelectorAll('[data-layer="fill"], [data-layer="hit"], [data-layer="camera"]')];
    const target = action(view, 'View North Vale details');
    fireEvent.click(target);
    const panel = view.getByRole('region', { name: 'Territory details' });
    expect(view.queryByRole('region', { name: 'Explore map controls' })).toBeNull();
    expect(box(view)).toEqual([0, 0, 120, 80]);
    open(view);
    filter(view, 'Owner', 'blue');
    expect(map(view)).toBe(svg);
    expect([...view.container.querySelectorAll('[data-layer="fill"], [data-layer="hit"], [data-layer="camera"]')]).toEqual(paths);
    expect(view.getByRole('region', { name: 'Territory details' })).toBe(panel);
    expect(panel).toHaveTextContent('Alder Owls');
    expect(view.container.querySelector('[data-layer="fill"][data-region="r0"]')).toHaveAttribute('data-owner', 'amber');
    expect(view.container.querySelector('[data-layer="fill"][data-region="r0"]')).toHaveStyle({ opacity: '0.25' });
    fireEvent.click(action(view, 'Close Explore'));
    expect(box(view)).toEqual([0, 0, 120, 80]);
    expect(view.container.querySelector('[data-match]')).toBeNull();
    fireEvent.click(action(view, 'Close territory details'));
    expect(document.activeElement).toBe(target);
  });

  it('combines search, owner and availability against current territory facts and gives truthful empty counts', () => {
    const view = render(<ConquestRegionMap {...props} />);
    open(view);
    expect(view.getByRole('status')).toHaveTextContent('6 of 6 territories match');
    filter(view, 'Find a territory or team', '  aLdEr oWlS  ');
    expect(matches(view)).toEqual(['r0', 'r1']);
    filter(view, 'Owner', 'amber');
    filter(view, 'Availability', 'invincible');
    expect(matches(view)).toEqual(['r0', 'r1']);
    filter(view, 'Find a territory or team', 'East');
    expect(matches(view)).toEqual(['r1']);
    filter(view, 'Owner', 'blue');
    expect(matches(view)).toEqual([]);
    expect(view.getByRole('status')).toHaveTextContent('0 of 6 territories match. No matches');
    expect(action(view, 'Fit matches')).toBeDisabled();
    fireEvent.click(action(view, 'Reset filters'));
    expect(matches(view)).toHaveLength(6);
    expect(view.getByLabelText('Owner')).toHaveValue('');
    expect(view.getByLabelText('Find a territory or team')).toHaveValue('');
    expect(view.getByLabelText('Availability')).toHaveValue('all');
    filter(view, 'Owner', 'green');
    expect(matches(view)).toEqual([]);
    expect(JSON.stringify(owners)).toBe('{"r0":"amber","r1":"amber","r2":"blue","r3":null,"r4":null,"r5":"blue"}');
  });

  it('counts a power-up only on unclaimed land and updates filters and details from live ownership', () => {
    const view = render(<ConquestRegionMap {...props} />);
    open(view);
    filter(view, 'Availability', 'powerup');
    expect(matches(view)).toEqual(['r3']);
    fireEvent.click(action(view, 'View South Vale details'));
    expect(view.getByRole('region', { name: 'Territory details' })).toHaveTextContent('Power-Up available');
    view.rerender(<ConquestRegionMap {...props} owners={{ ...owners, r3: 'blue' }} />);
    expect(matches(view)).toEqual([]);
    expect(view.getByRole('region', { name: 'Territory details' })).toHaveTextContent('Birch Foxes');
    expect(view.getByRole('region', { name: 'Territory details' })).not.toHaveTextContent('Power-Up available');
    filter(view, 'Availability', 'unclaimed');
    expect(matches(view)).toEqual(['r4']);
  });

  it('uses a bounded manual viewport with a stable identity camera and restores the automatic camera on exit', () => {
    const view = render(<ConquestRegionMap {...props} focusRegions={['r0']} />);
    const camera = view.container.querySelector('[data-layer="camera"]')!;
    const automatic = (camera as SVGGElement).style.transform;
    expect(automatic).not.toBe('none');
    open(view);
    expect(camera).toHaveStyle({ transform: 'none', transition: 'none' });
    for (let i = 0; i < 8; i++) fireEvent.click(action(view, 'Zoom in'));
    expect(box(view)[2]).toBeCloseTo(120 / 2.6);
    expect(action(view, 'Zoom in')).toBeDisabled();
    for (let i = 0; i < 8; i++) {
      fireEvent.click(action(view, 'Pan right'));
      fireEvent.click(action(view, 'Pan down'));
    }
    const [x, y, w, h] = box(view);
    expect(x + w).toBeCloseTo(120);
    expect(y + h).toBeCloseTo(80);
    expect(action(view, 'Pan right')).toBeDisabled();
    expect(action(view, 'Pan down')).toBeDisabled();
    fireEvent.click(action(view, 'Reset view'));
    expect(box(view)).toEqual([0, 0, 120, 80]);
    expect(action(view, 'Zoom out')).toBeDisabled();
    fireEvent.click(action(view, 'Close Explore'));
    expect(view.container.querySelector('[data-layer="camera"]')).toBe(camera);
    expect((camera as SVGGElement).style.transform).toBe(automatic);
  });

  it('fits only matching regions without dropping hit nodes and keeps clones of current facts quiet', () => {
    const view = render(<ConquestRegionMap {...props} />);
    open(view);
    filter(view, 'Find a territory or team', 'East Vale');
    fireEvent.click(action(view, 'Fit matches'));
    const fitted = box(view);
    expect(fitted[2]).toBeCloseTo(69.6);
    expect(fitted[0]).toBeCloseTo(25.2);
    const hits = [...view.container.querySelectorAll('[data-layer="hit"]')];
    view.rerender(<ConquestRegionMap {...props} owners={{ ...owners }} powerupStates={new Set(props.powerupStates)} invincibleTeams={new Set(props.invincibleTeams)} />);
    expect(box(view)).toEqual(fitted);
    expect([...view.container.querySelectorAll('[data-layer="hit"]')]).toEqual(hits);
    expect(matches(view)).toEqual(['r1']);
    fireEvent.keyDown(action(view, 'View West Vale details'), { key: 'Enter' });
    expect(view.getByRole('region', { name: 'Territory details' })).toHaveAttribute('data-region-details', 'r4');
  });

  it('suppresses the drag click only, uses the starting screen matrix, then allows a fresh tap and cancelled gesture', () => {
    const view = render(<ConquestRegionMap {...props} />);
    open(view);
    fireEvent.click(action(view, 'Zoom in'));
    const svg = map(view), target = action(view, 'View North Vale details');
    Object.defineProperty(svg, 'getScreenCTM', { value: () => ({ inverse: () => ({ a: 0.5, b: 0, c: 0, d: 0.5 }) }) });
    Object.defineProperty(svg, 'setPointerCapture', { value: vi.fn() });
    Object.defineProperty(svg, 'hasPointerCapture', { value: () => true });
    Object.defineProperty(svg, 'releasePointerCapture', { value: vi.fn() });
    const pointer = (type: string, x: number, y: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
      Object.defineProperties(event, { pointerId: { value: 7 }, isPrimary: { value: true } });
      fireEvent(target, event);
    };
    const before = box(view);
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 110, 104);
    expect(box(view)[0]).toBeCloseTo(before[0] - 5);
    expect(box(view)[1]).toBeCloseTo(before[1] - 2);
    fireEvent(target, new Event('lostpointercapture', { bubbles: true }));
    pointer('pointermove', 112, 106);
    expect(box(view)[0]).toBeCloseTo(before[0] - 6);
    pointer('pointerup', 112, 106);
    fireEvent.click(target, { detail: 1 });
    expect(view.queryByRole('region', { name: 'Territory details' })).toBeNull();
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 102, 102);
    pointer('pointerup', 102, 102);
    fireEvent.click(target);
    expect(view.getByRole('region', { name: 'Territory details' })).toHaveAttribute('data-region-details', 'r0');
    fireEvent.click(action(view, 'Close territory details'));
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 112, 106);
    pointer('pointerup', 112, 106);
    fireEvent.click(target, { detail: 0 });
    expect(view.getByRole('region', { name: 'Territory details' })).toHaveAttribute('data-region-details', 'r0');
    fireEvent.click(action(view, 'Close territory details'));
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 112, 106);
    pointer('pointerup', 112, 106);
    fireEvent.keyDown(target, { key: 'Enter' });
    expect(view.getByRole('region', { name: 'Territory details' })).toHaveAttribute('data-region-details', 'r0');
    fireEvent.click(action(view, 'Close territory details'));
    fireEvent.click(action(view, 'Reset view'));
    fireEvent.click(action(view, 'Zoom in'));
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 108, 104);
    const capturedView = box(view);
    fireEvent(svg, new Event('lostpointercapture', { bubbles: true }));
    pointer('pointermove', 114, 108);
    expect(box(view)).toEqual(capturedView);
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 110, 110);
    pointer('pointercancel', 110, 110);
    fireEvent.click(target);
    expect(view.getByRole('region', { name: 'Territory details' })).toHaveAttribute('data-region-details', 'r0');
  });

  it('hands the camera back immediately on scene gating and resets view, filters and mode for a new sport', () => {
    const beforePassive: { box: string | null; open: boolean }[] = [];
    const capture = () => beforePassive.push({ box: document.querySelector('svg[data-map]')?.getAttribute('viewBox') ?? null, open: !!document.querySelector('[data-map-explore]') });
    const view = render(<BeforePassive {...props} capture={capture} />);
    const svg = map(view);
    open(view);
    filter(view, 'Owner', 'amber');
    fireEvent.click(action(view, 'Zoom in'));
    view.rerender(<BeforePassive {...props} exploreEnabled={false} focusRegions={['r5']} capture={capture} />);
    expect(beforePassive.at(-1)).toEqual({ box: '0 0 120 80', open: false });
    expect(map(view)).toBe(svg);
    expect(box(view)).toEqual([0, 0, 120, 80]);
    expect(action(view, 'Explore map')).toBeDisabled();
    expect(view.queryByRole('region', { name: 'Explore map controls' })).toBeNull();
    expect(view.container.querySelector('[data-layer="camera"]')).not.toHaveStyle({ transform: 'none' });
    view.rerender(<BeforePassive {...props} capture={capture} />);
    open(view);
    expect(view.getByLabelText('Owner')).toHaveValue('');
    expect(box(view)).toEqual([0, 0, 120, 80]);
    fireEvent.click(action(view, 'Zoom in'));
    view.rerender(<BeforePassive {...props} sport={{ ...sport, key: 'other', viewBox: { width: 240, height: 160 } }} capture={capture} />);
    expect(beforePassive.at(-1)).toEqual({ box: '0 0 240 160', open: false });
    expect(view.queryByRole('region', { name: 'Explore map controls' })).toBeNull();
    expect(box(view)).toEqual([0, 0, 240, 160]);
    open(view);
    expect(box(view)).toEqual([0, 0, 240, 160]);
  });

  it('keeps focused controls independent of territory keyboard activation and preserves Space details and close focus', () => {
    const view = render(<ConquestRegionMap {...props} />);
    open(view);
    for (const control of within(view.getByRole('region', { name: 'Explore map controls' })).getAllByRole('button')) {
      control.focus();
      fireEvent.keyDown(control, { key: 'Enter' });
      fireEvent.keyDown(control, { key: ' ' });
      expect(view.queryByRole('region', { name: 'Territory details' })).toBeNull();
    }
    const target = action(view, 'View River Vale details');
    target.focus();
    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true, bubbles: true });
    fireEvent(target, event);
    expect(event.defaultPrevented).toBe(true);
    expect(view.getByRole('region', { name: 'Territory details' })).toHaveAttribute('data-region-details', 'r2');
    fireEvent.click(action(view, 'Close territory details'));
    expect(document.activeElement).toBe(target);
  });
});
