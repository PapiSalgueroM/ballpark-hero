import { describe, expect, it } from 'vitest';
import { paintCageArena } from '@/components/cage-clash/CageClashCanvas';
import { createCageFight, type CageFight } from '@/lib/cageClash';

type Rect = { x: number; y: number; w: number; h: number; color: string };
function drawing(state: CageFight | null, reduced = false) {
  const rects: Rect[] = [], polygons: { points: number[][]; color: string }[] = [], labels: { text: string; x: number; y: number; color: string }[] = [];
  let transform = { x: 0, y: 0, sx: 1, sy: 1 }, points: number[][] = [];
  const stack: typeof transform[] = [];
  const point = (x: number, y: number) => [transform.x + x * transform.sx, transform.y + y * transform.sy];
  const context = {
    fillStyle: '', imageSmoothingEnabled: true, font: '', textAlign: '',
    save() { stack.push({ ...transform }); }, restore() { transform = stack.pop()!; },
    translate(x: number, y: number) { transform.x += x * transform.sx; transform.y += y * transform.sy; },
    scale(x: number, y: number) { transform.sx *= x; transform.sy *= y; },
    fillRect(x: number, y: number, w: number, h: number) {
      const a = point(x, y), b = point(x + w, y + h);
      rects.push({ x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]), color: this.fillStyle });
    },
    beginPath() { points = []; }, moveTo(x: number, y: number) { points.push(point(x, y)); }, lineTo(x: number, y: number) { points.push(point(x, y)); },
    closePath() {}, rect() {}, clip() {}, stroke() {},
    fill() { polygons.push({ points: points.map(p => [...p]), color: this.fillStyle }); },
    fillText(text: string, x: number, y: number) { const p = point(x, y); labels.push({ text, x: p[0], y: p[1], color: this.fillStyle }); },
  };
  paintCageArena(context as unknown as CanvasRenderingContext2D, state, reduced);
  return { rects, polygons, labels, smoothing: context.imageSmoothingEnabled };
}
function fight(pose: CageFight['player']['action'] = 'idle', ticks = 0, side: 'player' | 'cpu' = 'player') {
  const state = createCageFight('grappler', 'grappler', 1068);
  state.player.x = 25; state.cpu.x = 75; state.tick = 0; state[side].action = pose; state[side].actionTicks = ticks;
  return state;
}
function ground(level: 0 | 1 | 2 = 0, top: 'player' | 'cpu' = 'player', pose: CageFight['player']['action'] = 'idle', ticks = 0, side: 'player' | 'cpu' = 'player') {
  const state = fight(pose, ticks, side); state.position = 'ground'; state.groundLevel = level; state.top = top; return state;
}
function rectangles(scene: ReturnType<typeof drawing>, color: string, w: number, h: number) {
  return scene.rects.filter(rect => rect.color === color && rect.w === w && rect.h === h).map(rect => [rect.x, rect.y, rect.w, rect.h]);
}
function tip(scene: ReturnType<typeof drawing>, color: string, w: number, h: number) {
  const matches = rectangles(scene, color, w, h); expect(matches).toHaveLength(1); return matches[0];
}

describe('Cage grapple motion actual canvas footprints', () => {
  it('shows distinct guard half guard and mount legs even with reduced motion', () => {
    const feet = [[161, 134, 10, 3], [166, 134, 10, 3], [171, 134, 10, 3]];
    const heels = [[169, 116], [173, 121], [187, 132]];
    for (const reduced of [false, true]) for (const level of [0, 1, 2] as const) {
      const scene = drawing(ground(level), reduced);
      expect(tip(scene, '#915b46', 10, 3)).toEqual(feet[level]);
      expect(scene.rects).toContainEqual({ x: heels[level][0], y: heels[level][1], w: 4, h: 4, color: '#e7b58a' });
    }
    expect(tip(drawing(ground(0, 'cpu', 'guard')), '#638bff', 6, 5)).toEqual([161, 112, 6, 5]);
  });

  it('mirrors the actual top corner and keeps bottom legs attached to the other fighter', () => {
    const feet = [[149, 134, 10, 3], [144, 134, 10, 3], [139, 134, 10, 3]], heels = [[147, 116], [143, 121], [129, 132]];
    for (const level of [0, 1, 2] as const) {
      const scene = drawing(ground(level, 'cpu'));
      expect(tip(scene, '#b78264', 10, 3)).toEqual(feet[level]);
      expect(scene.rects).toContainEqual({ x: heels[level][0], y: heels[level][1], w: 4, h: 4, color: '#bf825b' });
      expect(scene.labels).toContainEqual({ text: 'CPU ON TOP', x: 160, y: 177, color: '#b8c5d7' });
    }
    expect(tip(drawing(ground(0, 'player', 'grapple', 4)), '#638bff', 6, 6)).toEqual([175, 134, 6, 6]);
    expect(tip(drawing(ground(0, 'cpu', 'grapple', 4, 'cpu')), '#fb7867', 6, 6)).toEqual([139, 134, 6, 6]);
  });

  it('draws a separate grapple load drive and settle from top bottom and clinch', () => {
    const top: number[][] = [], bottom: number[][] = [], clinch: number[][] = [];
    for (const ticks of [6, 4, 2]) {
      top.push(tip(drawing(ground(0, 'player', 'grapple', ticks)), '#638bff', 6, 6));
      bottom.push(tip(drawing(ground(0, 'cpu', 'grapple', ticks)), '#638bff', 6, 5));
      const state = fight('grapple', ticks); state.position = 'clinch'; clinch.push(tip(drawing(state), '#638bff', 6, 7));
    }
    expect(top).toEqual([[170, 123, 6, 6], [175, 134, 6, 6], [167, 128, 6, 6]]);
    expect(bottom).toEqual([[154, 115, 6, 5], [170, 103, 6, 5], [162, 112, 6, 5]]);
    expect(clinch).toEqual([[107, 112, 6, 7], [119, 112, 6, 7], [112, 112, 6, 7]]);
  });

  it('draws the longer escape effort and preserves its distinct clinch frames', () => {
    const top: number[][] = [], bottom: number[][] = [], clinch: number[][] = [];
    for (const ticks of [12, 8, 4]) {
      top.push(tip(drawing(ground(0, 'player', 'escape', ticks)), '#638bff', 6, 6));
      bottom.push(tip(drawing(ground(0, 'cpu', 'escape', ticks)), '#638bff', 6, 5));
      const state = fight('escape', ticks); state.position = 'clinch'; clinch.push(tip(drawing(state), '#638bff', 6, 7));
    }
    expect(top).toEqual([[160, 107, 6, 6], [176, 130, 6, 6], [165, 112, 6, 6]]);
    expect(bottom).toEqual([[161, 119, 6, 5], [177, 108, 6, 5], [168, 119, 6, 5]]);
    expect(clinch).toEqual([[101, 110, 6, 7], [121, 111, 6, 7], [105, 97, 6, 7]]);
  });

  it('uses each fighters actual submission pressure for three grips at constant action ticks', () => {
    const pressures = [0, 24, 25, 64, 65, 100];
    const top = [[172, 123, 6, 5], [172, 123, 6, 5], [166, 127, 6, 5], [166, 127, 6, 5], [161, 124, 6, 5], [161, 124, 6, 5]];
    const bottom = [[172, 109, 6, 5], [172, 109, 6, 5], [163, 106, 6, 5], [163, 106, 6, 5], [152, 109, 6, 5], [152, 109, 6, 5]];
    for (const reduced of [false, true]) for (let index = 0; index < pressures.length; index++) {
      const high = ground(0, 'player', 'submit', 2), low = ground(0, 'cpu', 'submit', 2);
      high.player.submission = low.player.submission = pressures[index];
      expect(tip(drawing(high, reduced), '#638bff', 6, 5)).toEqual(top[index]);
      expect(tip(drawing(low, reduced), '#638bff', 6, 5)).toEqual(bottom[index]);
    }
    const state = ground(0, 'cpu', 'submit', 2); state.cpu.action = 'submit'; state.cpu.actionTicks = 2;
    state.player.submission = 0; state.cpu.submission = 80;
    expect(tip(drawing(state), '#638bff', 6, 5)).toEqual([172, 109, 6, 5]);
    expect(tip(drawing(state), '#fb7867', 6, 5)).toEqual([153, 124, 6, 5]);
    state.player.submission = 80; state.cpu.submission = 0;
    expect(tip(drawing(state), '#638bff', 6, 5)).toEqual([152, 109, 6, 5]);
    expect(tip(drawing(state), '#fb7867', 6, 5)).toEqual([142, 123, 6, 5]);
  });

  it('holds reduced effort still while keeping ground position and pressure truthful', () => {
    for (const pose of ['grapple', 'escape'] as const) for (const position of ['top', 'bottom', 'clinch'] as const) {
      const ticks = pose === 'grapple' ? [6, 4, 2] : [12, 8, 4];
      const state = position === 'clinch' ? fight(pose, ticks[1]) : ground(1, position === 'top' ? 'player' : 'cpu', pose, ticks[1]);
      if (position === 'clinch') state.position = 'clinch';
      const contact = drawing(state);
      for (const phase of ticks) { state.player.actionTicks = phase; state.tick = 12; expect(drawing(state, true)).toEqual(contact); }
    }
    const inactive = ground(0, 'player', 'grapple', 0);
    expect(tip(drawing(inactive), '#638bff', 6, 6)).toEqual([175, 134, 6, 6]);
    const low = ground(0, 'player', 'submit', 2); low.player.submission = 10;
    const high = ground(2, 'player', 'submit', 2); high.player.submission = 80;
    expect(tip(drawing(low, true), '#915b46', 10, 3)).toEqual([161, 134, 10, 3]);
    expect(tip(drawing(high, true), '#915b46', 10, 3)).toEqual([171, 134, 10, 3]);
    expect(tip(drawing(low, true), '#638bff', 6, 5)).toEqual([172, 123, 6, 5]);
    expect(tip(drawing(high, true), '#638bff', 6, 5)).toEqual([161, 124, 6, 5]);
  });

  it('paints repeated grapple states without advancing or editing the fight', () => {
    for (const pose of ['grapple', 'escape', 'submit', 'guard'] as const) for (const top of ['player', 'cpu'] as const) {
      const state = ground(2, top, pose, 2); state.tick = 43; state.player.health = 63; state.player.cooldown = 17; state.cpu.submission = 71;
      const bytes = JSON.stringify(state), first = drawing(state);
      for (let repeat = 0; repeat < 3; repeat++) expect(drawing(state)).toEqual(first);
      drawing(state, true); expect(JSON.stringify(state)).toBe(bytes);
    }
  });

  it('preserves the original arena and accepted standing strikes independently of grappling', () => {
    const scene = drawing(null); expect(scene.smoothing).toBe(false);
    expect(scene.rects[0]).toEqual({ x: 0, y: 0, w: 320, h: 180, color: '#0c1427' });
    expect(scene.polygons).toContainEqual({ points: [[45, 86], [275, 86], [307, 115], [286, 156], [34, 156], [13, 115]], color: '#edddae' });
    expect(scene.rects).toContainEqual({ x: 28, y: 165, w: 264, h: 5, color: '#263954' });
    expect(scene.labels).toContainEqual({ text: 'YOU', x: 46, y: 177, color: '#638bff' });
    expect(scene.labels).toContainEqual({ text: 'CPU', x: 276, y: 177, color: '#fb7867' });
    expect(scene.labels).toContainEqual({ text: 'READY TO RUMBLE', x: 160, y: 78, color: '#ffc65a' });
    expect(drawing(null, true)).toEqual(scene);
    expect([6, 4, 2].map(ticks => tip(drawing(fight('jab', ticks)), '#638bff', 8, 7))).toEqual([[101, 94, 8, 7], [121, 96, 8, 7], [109, 95, 8, 7]]);
    expect(tip(drawing(fight('power', 4)), '#638bff', 8, 8)).toEqual([116, 93, 8, 8]);
    expect(tip(drawing(fight('kick', 4)), '#915b46', 7, 5)).toEqual([124, 110, 7, 5]);
  });
});
