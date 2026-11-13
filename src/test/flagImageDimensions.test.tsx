import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { FlagFromEmoji, FlagImg } from '@/components/FlagImg';

it.each([
  ['country name', <FlagImg name="Germany" size={12} showLabel />, 'Germany', 'de', 12, 9],
  ['country emoji', <FlagFromEmoji emoji="🇪🇸" size={18} />, '🇪🇸', 'es', 18, 14],
] as const)('reserves the displayed dimensions for a %s flag', (_, flag, name, code, width, height) => {
  render(flag);
  const image = screen.getByRole('img', { name });
  expect(image).toHaveAttribute('width', String(width));
  expect(image).toHaveAttribute('height', String(height));
  expect(image).toHaveAttribute('loading', 'lazy');
  expect(image).toHaveAttribute('src', 'https://flagcdn.com/w40/' + code + '.png');
  expect(image).toHaveStyle({ width: width + 'px', height: height + 'px' });
});
