import { describe, expect, it } from 'vitest';
import { paintCageArena } from '@/components/cage-clash/CageClashCanvas';
import { createCageFight, type CageFight } from '@/lib/cageClash';

type Rect = { x: number; y: number; w: number; h: number; color: string };
type Strike = 'jab' | 'power' | 'kick';
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
  const state = createCageFight('balanced', 'balanced', 1067);
  state.player.x = 25; state.cpu.x = 75; state.tick = 0; state[side].action = pose; state[side].actionTicks = ticks;
  return state;
}
function tip(scene: ReturnType<typeof drawing>, color: string, w: number, h: number) {
  const matches = scene.rects.filter(rect => rect.color === color && rect.w === w && rect.h === h);
  expect(matches).toHaveLength(1);
  const rect = matches[0]; return [rect.x, rect.y, rect.w, rect.h];
}
function standing(pose: Strike, side: 'player' | 'cpu' = 'player', crossed = false) {
  return [6, 4, 2].map(ticks => {
    const state = fight(pose, ticks, side); if (crossed) { state.player.x = 75; state.cpu.x = 25; }
    const color = pose === 'kick' ? side === 'player' ? '#915b46' : '#b78264' : side === 'player' ? '#638bff' : '#fb7867';
    return tip(drawing(state), color, pose === 'kick' ? 7 : 8, pose === 'power' ? 8 : pose === 'kick' ? 5 : 7);
  });
}

describe('Cage strike motion actual canvas footprints', () => {
  it('draws a tucked jab windup an extended contact and a returning glove', () => {
    expect(standing('jab')).toEqual([[101, 94, 8, 7], [121, 96, 8, 7], [109, 95, 8, 7]]);
    const clinch = fight('jab', 4); clinch.position = 'clinch';
    expect(tip(drawing(clinch), '#638bff', 8, 7)).toEqual([121, 96, 8, 7]);
  });

  it('draws distinct heavy and kick arcs while a clinch knee stays bent', () => {
    expect(standing('power')).toEqual([[81, 92, 8, 8], [116, 93, 8, 8], [102, 100, 8, 8]]);
    expect(standing('kick')).toEqual([[103, 117, 7, 5], [124, 110, 7, 5], [112, 123, 7, 5]]);
    const knees = [6, 4, 2].map(ticks => { const state = fight('kick', ticks); state.position = 'clinch'; return tip(drawing(state), '#915b46', 7, 5); });
    expect(knees).toEqual([[102, 123, 7, 5], [108, 114, 7, 5], [101, 124, 7, 5]]);
  });

  it('mirrors both corners toward their opponent even after they cross sides', () => {
    const expected = {
      jab: [[211, 94, 8, 7], [191, 96, 8, 7], [203, 95, 8, 7]],
      power: [[231, 92, 8, 8], [196, 93, 8, 8], [210, 100, 8, 8]],
      kick: [[210, 117, 7, 5], [189, 110, 7, 5], [201, 123, 7, 5]],
    };
    for (const pose of ['jab', 'power', 'kick'] as const) {
      expect(standing(pose, 'cpu')).toEqual(expected[pose]);
      expect(standing(pose, 'player', true)).toEqual(expected[pose]);
    }
    expect(standing('jab', 'cpu', true)).toEqual([[101, 94, 8, 7], [121, 96, 8, 7], [109, 95, 8, 7]]);
  });

  it('draws downward top strikes and upward bottom strikes through all three stages', () => {
    const topJabs: number[][] = [], topPower: number[][] = [], bottomJabs: number[][] = [], cpuTop: number[][] = [];
    for (const ticks of [6, 4, 2]) {
      const top = fight('jab', ticks); top.position = 'ground'; top.top = 'player';
      topJabs.push(tip(drawing(top), '#638bff', 6, 6));
      top.player.action = 'power'; top.player.posture = true; topPower.push(tip(drawing(top), '#638bff', 8, 7));
      const bottom = fight('jab', ticks); bottom.position = 'ground'; bottom.top = 'cpu';
      bottomJabs.push(tip(drawing(bottom), '#638bff', 6, 5));
      const cpu = fight('jab', ticks, 'cpu'); cpu.position = 'ground'; cpu.top = 'cpu'; cpuTop.push(tip(drawing(cpu), '#fb7867', 6, 6));
    }
    expect(topJabs).toEqual([[161, 109, 6, 6], [168, 129, 6, 6], [163, 120, 6, 6]]);
    expect(topPower).toEqual([[162, 90, 8, 7], [169, 129, 8, 7], [164, 104, 8, 7]]);
    expect(bottomJabs).toEqual([[164, 123, 6, 5], [172, 109, 6, 5], [169, 117, 6, 5]]);
    expect(cpuTop).toEqual([[153, 109, 6, 6], [146, 129, 6, 6], [151, 120, 6, 6]]);
    const guard = fight('guard'); guard.position = 'ground'; guard.top = 'cpu'; const scene = drawing(guard);
    expect(tip(scene, '#638bff', 6, 5)).toEqual([161, 112, 6, 5]);
    expect(scene.labels).toContainEqual({ text: 'CPU ON TOP', x: 160, y: 177, color: '#b8c5d7' });
  });

  it('cycles normal idle and walking but keeps reduced motion and guard poses static', () => {
    const idle = fight(), idle0 = drawing(idle); idle.tick = 6; const idle6 = drawing(idle);
    expect(idle0.rects).toContainEqual({ x: 90, y: 84, w: 13, h: 9, color: '#bf825b' });
    expect(idle6.rects).toContainEqual({ x: 90, y: 85, w: 13, h: 9, color: '#bf825b' });
    const move = fight('move'), move0 = drawing(move); move.tick = 4; const move4 = drawing(move);
    expect(move0.rects).toContainEqual({ x: 78, y: 132, w: 10, h: 4, color: '#bf825b' });
    expect(move4.rects).toContainEqual({ x: 84, y: 132, w: 10, h: 4, color: '#bf825b' });
    for (const pose of ['idle', 'move', 'guard'] as const) {
      const state = fight(pose), first = drawing(state, true); state.tick = 12; expect(drawing(state, true)).toEqual(first);
    }
    expect(drawing(fight('move'), true).rects).toContainEqual({ x: 81, y: 132, w: 10, h: 4, color: '#bf825b' });
    expect(tip(drawing(fight('guard'), true), '#638bff', 8, 9)).toEqual([100, 87, 8, 9]);
    for (const pose of ['jab', 'power', 'kick'] as const) {
      const contact = drawing(fight(pose, 4));
      for (const ticks of [6, 4, 2]) { const state = fight(pose, ticks); state.tick = 12; expect(drawing(state, true)).toEqual(contact); }
    }
    const ground = fight('power', 4); ground.position = 'ground'; ground.top = 'player'; ground.player.posture = true; const contact = drawing(ground);
    ground.player.actionTicks = 6; ground.tick = 12; expect(drawing(ground, true)).toEqual(contact);
    ground.player.actionTicks = 2; expect(drawing(ground, true)).toEqual(contact);
  });

  it('paints repeated live poses without advancing or editing any fight state', () => {
    for (const pose of ['jab', 'power', 'kick', 'guard', 'move', 'submit'] as const) {
      const state = fight(pose, 4); state.tick = 43; state.player.health = 63; state.player.cooldown = 17; state.cpu.submission = 21;
      if (pose === 'submit') { state.position = 'ground'; state.top = 'player'; }
      const bytes = JSON.stringify(state); const first = drawing(state);
      for (let repeat = 0; repeat < 3; repeat++) expect(drawing(state)).toEqual(first);
      drawing(state, true); expect(JSON.stringify(state)).toBe(bytes);
    }
  });

  it('preserves the original empty arena floor rails and corner labels independently of strike poses', () => {
    const scene = drawing(null); expect(scene.smoothing).toBe(false);
    expect(scene.rects[0]).toEqual({ x: 0, y: 0, w: 320, h: 180, color: '#0c1427' });
    expect(scene.polygons).toContainEqual({ points: [[45, 86], [275, 86], [307, 115], [286, 156], [34, 156], [13, 115]], color: '#edddae' });
    expect(scene.rects).toContainEqual({ x: 28, y: 165, w: 264, h: 5, color: '#263954' });
    expect(scene.labels).toContainEqual({ text: 'YOU', x: 46, y: 177, color: '#638bff' });
    expect(scene.labels).toContainEqual({ text: 'CPU', x: 276, y: 177, color: '#fb7867' });
    expect(scene.labels).toContainEqual({ text: 'READY TO RUMBLE', x: 160, y: 78, color: '#ffc65a' });
    expect(drawing(null, true)).toEqual(scene);
  });
});
