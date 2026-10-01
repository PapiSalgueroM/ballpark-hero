import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ChainTimeline } from '@/components/ufc-chain/ChainTimeline';
import { TennisChainTimeline } from '@/components/tennis-chain/TennisChainTimeline';
import { NascarChainTimeline } from '@/components/nascar-chain/NascarChainTimeline';
import motion from '@/components/game/ChainLinkMotion.module.css';
import type { ChainLink, UfcFighter } from '@/types/ufcChain';
import type { TennisChainLink } from '@/types/tennisChain';
import type { NascarChainLink } from '@/types/nascarChain';

const fighter = (index: number): UfcFighter => ({
  name: `Fixture Fighter ${index}`, weightClass: 'Fixture Weight', record: '17-3-1',
  wins: 17, losses: 3, draws: 1, isHallOfFamer: index === 0,
});
const combatChain = (count: number): ChainLink[] => Array.from({ length: count }, (_, index) => ({
  fighter: fighter(index), defeatedBy: index < count - 1 ? fighter(index + 1) : undefined,
  bonusPoints: index === 1 ? 25 : undefined,
}));
const tennisChain = (count: number): TennisChainLink[] => Array.from({ length: count }, (_, index) => ({
  playerName: `Fixture Tennis Player ${index}`,
  slamConnection: index < count - 1 ? `Fixture tournament connection ${index}` : undefined,
}));
const nascarChain = (count: number): NascarChainLink[] => Array.from({ length: count }, (_, index) => ({
  driverName: `Fixture Racing Driver ${index}`,
  connection: index < count - 1 ? `Fixture championship connection ${index}` : undefined,
}));
const variants = [
  {
    label: 'combat', endedClass: 'bg-red-600', playingClass: 'bg-red-700',
    draw: (count: number, status: 'playing' | 'ended', snapshot?: (value: unknown) => void) => {
      const chain = combatChain(count);
      snapshot?.(chain);
      return <ChainTimeline chain={chain} gameStatus={status} />;
    },
    names: (count: number) => combatChain(count).map(link => link.fighter.name),
    connections: (count: number) => Array(Math.max(0, count - 1)).fill('defeated by'),
  },
  {
    label: 'tennis', endedClass: 'bg-purple-700', playingClass: 'bg-emerald-800',
    draw: (count: number, status: 'playing' | 'ended', snapshot?: (value: unknown) => void) => {
      const chain = tennisChain(count);
      snapshot?.(chain);
      return <TennisChainTimeline chain={chain} gameStatus={status} />;
    },
    names: (count: number) => tennisChain(count).map(link => link.playerName),
    connections: (count: number) => tennisChain(count).flatMap(link => link.slamConnection ? [link.slamConnection] : []),
  },
  {
    label: 'nascar', endedClass: 'bg-red-700', playingClass: 'bg-neutral-800',
    draw: (count: number, status: 'playing' | 'ended', snapshot?: (value: unknown) => void) => {
      const chain = nascarChain(count);
      snapshot?.(chain);
      return <NascarChainTimeline chain={chain} gameStatus={status} />;
    },
    names: (count: number) => nascarChain(count).map(link => link.driverName),
    connections: (count: number) => nascarChain(count).flatMap(link => link.connection ? [link.connection] : []),
  },
];
const links = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-chain-link]'));
const connections = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-chain-connection]'));

afterEach(cleanup);

for (const variant of variants) {
  describe(`${variant.label} chain timeline motion`, () => {
    it('keeps an empty chain empty', () => {
      const view = render(variant.draw(0, 'playing'));
      expect(view.container).toBeEmptyDOMElement();
    });

    it('keeps a seed quiet and displays its unchanged starting length', () => {
      const view = render(variant.draw(1, 'playing'));
      const seed = links(view.container)[0];
      expect(seed).toHaveAttribute('data-chain-link', 'seed');
      expect(seed).not.toHaveClass(motion.latest);
      expect(connections(view.container)).toHaveLength(0);
      expect(view.getByText('Chain Length: 0')).toBeVisible();
      expect(view.queryByText(/Multiplier Active/)).toBeNull();
      expect(view.queryByRole('button')).toBeNull();
    });

    it('reveals only the appended link and connection while retaining earlier nodes', () => {
      const view = render(variant.draw(1, 'playing'));
      const timeline = view.container.querySelector('[data-chain-timeline]');
      const seed = links(view.container)[0];
      view.rerender(variant.draw(2, 'playing'));
      const firstAppend = links(view.container);
      const firstConnection = connections(view.container)[0];
      expect(firstAppend[0]).toBe(seed);
      expect(firstAppend[0]).toHaveAttribute('data-chain-link', 'earlier');
      expect(firstAppend[0]).not.toHaveClass(motion.latest);
      expect(firstAppend[1]).toHaveAttribute('data-chain-link', 'latest');
      expect(firstAppend[1]).toHaveClass(motion.latest);
      expect(firstConnection).toHaveAttribute('data-chain-connection', 'latest');
      expect(firstConnection).toHaveClass(motion.connection);
      const newestClass = firstAppend[1].className;
      const connectionClass = firstConnection.className;
      view.rerender(variant.draw(2, 'playing'));
      expect(links(view.container)).toHaveLength(firstAppend.length);
      links(view.container).forEach((link, index) => expect(link).toBe(firstAppend[index]));
      expect(connections(view.container)[0]).toBe(firstConnection);
      expect(firstAppend[1].className).toBe(newestClass);
      expect(firstConnection.className).toBe(connectionClass);
      view.rerender(variant.draw(3, 'playing'));
      const secondAppend = links(view.container);
      expect(secondAppend[0]).toBe(seed);
      expect(secondAppend[1]).toBe(firstAppend[1]);
      expect(secondAppend[1]).not.toHaveClass(motion.latest);
      expect(secondAppend[2]).toHaveClass(motion.latest);
      expect(connections(view.container)[0]).toBe(firstConnection);
      expect(firstConnection).not.toHaveClass(motion.connection);
      expect(connections(view.container)[1]).toHaveClass(motion.connection);
      expect(view.container.querySelector('[data-chain-timeline]')).toBe(timeline);
    });

    it('preserves chain length and multiplier thresholds', () => {
      for (const [count, multiplier] of [[1, 1], [5, 1], [6, 1.5], [10, 1.5], [11, 2]]) {
        const view = render(variant.draw(count, 'playing'));
        expect(links(view.container)).toHaveLength(count);
        expect(view.getByText(`Chain Length: ${count - 1}`)).toBeVisible();
        if (multiplier > 1) expect(view.getByText(`🔥 x${multiplier} Multiplier Active!`)).toBeVisible();
        else expect(view.queryByText(/Multiplier Active/)).toBeNull();
        view.unmount();
      }
    });

    it('keeps exact names and connections, input data and ended styling', () => {
      let input: unknown;
      const element = variant.draw(3, 'playing', value => { input = value; });
      const original = JSON.stringify(input);
      const view = render(element);
      const before = links(view.container);
      expect(before.map(link => link.querySelector('.font-bold')?.textContent?.replace('⭐', ''))).toEqual(variant.names(3));
      expect(connections(view.container).map(connection => connection.textContent)).toEqual(variant.connections(3));
      expect(before.at(-1)).toHaveClass(variant.playingClass);
      if (variant.label === 'combat') {
        expect(view.getByText('⭐')).toBeVisible();
        expect(view.getAllByText('Fixture Weight · 17-3-1')).toHaveLength(3);
        expect(view.getByText('+25 bonus')).toBeVisible();
      }
      view.rerender(variant.draw(3, 'ended'));
      expect(links(view.container)).toHaveLength(before.length);
      links(view.container).forEach((link, index) => expect(link).toBe(before[index]));
      expect(before.at(-1)).toHaveClass(variant.endedClass);
      expect(connections(view.container).map(connection => connection.textContent)).toEqual(variant.connections(3));
      expect(view.getByText('Chain Length: 2')).toBeVisible();
      expect(JSON.stringify(input)).toBe(original);
    });
  });
}
