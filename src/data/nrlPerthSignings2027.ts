import type { NrlRole } from '@/lib/nrlManager';

// Club-announced names and positions as of 13 November 2026.
// https://www.perthbears.com.au/team/
// https://www.perthbears.com.au/news/2026/10/30/blake-wilson-ready-to-reach-new-heights-with-perth-bears/
// https://www.seaeagles.com.au/teams/nrl-premiership/manly-warringah-sea-eagles/blake-wilson/
// Reuse verified 2026 NRL IDs. The remaining keys are local identifiers.
// Left/right and prop numbers are assignments for the game's lineup.
export const NRL_PERTH_SIGNINGS_2027: readonly (readonly [number | string, string, NrlRole])[] = [
  ['mason-barber', 'Mason Barber', 'Fullback'],
  ['jack-cole', 'Jack Cole', 'Five-eighth'],
  [504712, 'Josh Curran', 'Lock'],
  ['iszac-faasuamaleaui', 'Iszac Fa’asuamaleaui', 'Prop 8'],
  ['mavrik-geyer', 'Mavrik Geyer', 'Left Second Row'],
  ['liam-henry', 'Liam Henry', 'Prop 10'],
  [506018, 'Corey Horsburgh', 'Prop 8'],
  ['kit-laulilii', 'Kit Laulilii', 'Lock'],
  [100011335, 'Luke Laulilii', 'Right Wing'],
  ['james-mcdonnell', 'James McDonnell', 'Right Second Row'],
  [505537, 'Nick Meaney', 'Fullback'],
  ['harry-newman', 'Harry Newman', 'Left Centre'],
  ['mikolaj-oledzki', 'Mikolaj Oledzki', 'Prop 10'],
  ['niwhai-puru', 'Niwhai Puru', 'Halfback'],
  [509762, 'Sean Russell', 'Right Centre'],
  ['toby-sexton', 'Toby Sexton', 'Halfback'],
  [504371, 'Gehamat Shibasaki', 'Left Wing'],
  ['luke-smith', 'Luke Smith', 'Left Second Row'],
  [100006166, 'Morgan Smithies', 'Lock'],
  ['tyson-smoothy', 'Tyson Smoothy', 'Hooker'],
  [500852, 'Scott Sorensen', 'Right Second Row'],
  ['jonathan-sua', 'Jonathan Sua', 'Left Wing'],
  [504175, 'Siosifa Talakai', 'Left Second Row'],
  ['apa-twidle', 'Apa Twidle', 'Halfback'],
  [100003968, 'Chris Vea’ila', 'Right Centre'],
  ['blake-wilson', 'Blake Wilson', 'Right Wing'],
  [507680, 'Tyran Wishart', 'Halfback'],
];
