import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { isGameRoute } from '@/components/StorageNotice';
import { GameAdInventory } from './GameAdInventory';

it('mounts the empty inventory after the game footer and excludes site pages', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  const placedAfterFooter = /\{normalizeRoutePath\(pathname\) === "\/soccer-career" \? <Footer soccerControls \/> : <Footer \/>\}\s*\{gameRoute && <GameAdInventory \/>\}/.test(app);
  expect(placedAfterFooter).toBe(true);
  expect(['/club-manager', '/nba-my-career', '/nrl-team-manager', '/nrl-team-manager/'].every(isGameRoute)).toBe(true);
  expect(['/', '/soccer', '/pro-basketball', '/about', '/contact', '/privacy', '/terms'].some(isGameRoute)).toBe(false);
});

it('keeps all standard reservations empty and inaccessible', () => {
  const { container } = render(<GameAdInventory />);
  const inventory = container.querySelector('[data-game-ad-inventory]')!;
  expect(inventory).toHaveAttribute('aria-hidden', 'true');
  expect(inventory).toHaveAttribute('data-no-prerender');
  const slots = Array.from(inventory.querySelectorAll('[data-ad-reservation]'));
  expect(slots.map(slot => slot.getAttribute('data-ad-reservation'))).toEqual(['728x90', '300x250', '300x600', '320x50']);
  expect(slots.every(slot => slot.childNodes.length === 0)).toBe(true);
  expect(inventory.querySelector('[data-dukb-manual-ad], [data-ad-slot], .adsbygoogle, script, iframe, a, button, [tabindex]')).toBeNull();
});
