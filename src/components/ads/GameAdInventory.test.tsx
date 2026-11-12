import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { GameAdInventory } from './GameAdInventory';

it('provides one empty reservation per size without registering a live ad slot', () => {
  const { container } = render(<GameAdInventory />);
  const inventory = container.querySelector('[data-game-ad-inventory]');
  expect(inventory).toHaveAttribute('aria-hidden', 'true');
  expect(inventory).toHaveAttribute('data-no-prerender');
  const slots = Array.from(inventory!.querySelectorAll('[data-ad-reservation]'));
  expect(slots.map(slot => slot.getAttribute('data-ad-reservation'))).toEqual(['728x90', '300x250', '300x600', '320x50']);
  expect(slots.every(slot => slot.childNodes.length === 0)).toBe(true);
  expect(inventory!.querySelector('[data-dukb-manual-ad], [data-ad-slot], .adsbygoogle, script, iframe, a, button, [tabindex]')).toBeNull();
});
