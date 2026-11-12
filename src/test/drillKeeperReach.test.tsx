import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DrillKeeper } from '@/components/soccer-career/DrillPlayers';

type Point = { x: number; y: number };
type Pose = { origin: Point; glove: Point; contact?: Point; catching?: boolean };

function draw(pose: Pose) {
  const markup = renderToStaticMarkup(<svg><DrillKeeper {...pose} /></svg>);
  const host = document.createElement('div');
  host.innerHTML = markup;
  const keeper = host.querySelector('[data-drill-keeper]')!;
  const groups = [...keeper.children].slice(1);
  expect(groups).toHaveLength(2);
  const arms = groups.map(group => {
    const path = group.querySelector('path')!;
    const values = (path.getAttribute('d')!.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi) ?? []).map(Number);
    expect(values).toHaveLength(6);
    const hand = group.querySelector('ellipse')!;
    const handPosition = { x: Number(hand.getAttribute('cx')), y: Number(hand.getAttribute('cy')) };
    expect(values[4]).toBe(handPosition.x);
    expect(values[5]).toBe(handPosition.y);
    return {
      shoulder: { x: values[0], y: values[1] },
      bend: { x: values[2], y: values[3] },
      hand: handPosition,
    };
  });
  return { markup, keeper, arms };
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

describe('drill keeper catch reach', () => {
  const dives = [
    { name: 'right high', origin: { x: 180, y: 130 }, glove: { x: 210, y: 105 }, contact: { x: 252, y: 81 } },
    { name: 'left low', origin: { x: 180, y: 130 }, glove: { x: 152, y: 123 }, contact: { x: 111, y: 146 } },
    { name: 'straight high', origin: { x: 180, y: 130 }, glove: { x: 180, y: 102 }, contact: { x: 180, y: 70 } },
  ];

  for (const dive of dives) {
    it(`keeps both arms in proportion through a ${dive.name} catch`, () => {
      for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        const contact = {
          x: dive.glove.x + (dive.contact.x - dive.glove.x) * fraction,
          y: dive.glove.y + (dive.contact.y - dive.glove.y) * fraction,
        };
        const { arms } = draw({ ...dive, contact, catching: true });
        for (const arm of arms) {
          expect(distance(arm.shoulder, arm.hand), `${dive.name}/${fraction}: shoulder to glove`).toBeLessThanOrEqual(24);
          const curveBound = distance(arm.shoulder, arm.bend) + distance(arm.bend, arm.hand);
          expect(curveBound, `${dive.name}/${fraction}: drawn arm length`).toBeLessThanOrEqual(26);
        }
      }
    });
  }

  it('keeps the two gloves centred on the actual saved-ball contact', () => {
    for (const dive of dives) {
      const { arms } = draw({ ...dive, catching: true });
      expect((arms[0].hand.x + arms[1].hand.x) / 2).toBeCloseTo(dive.contact.x, 10);
      expect((arms[0].hand.y + arms[1].hand.y) / 2).toBeCloseTo(dive.contact.y, 10);
    }
  });

  it('preserves the complete pose when contact is omitted or equals the glove', () => {
    for (const { origin, glove } of dives) {
      for (const catching of [false, true]) {
        expect(draw({ origin, glove, catching }).markup).toBe(draw({ origin, glove, contact: glove, catching }).markup);
      }
    }
  });

  it('keeps an unshifted idle keeper finite and upright', () => {
    const point = { x: 180, y: 130 };
    const { markup, keeper, arms } = draw({ origin: point, glove: point });
    expect(markup).not.toMatch(/NaN|Infinity/);
    expect(keeper.querySelector('[data-drill-keeper-body]')!.getAttribute('transform')).toContain('rotate(0)');
    for (const arm of arms) expect(distance(arm.shoulder, arm.hand)).toBeLessThanOrEqual(24);
  });
});
