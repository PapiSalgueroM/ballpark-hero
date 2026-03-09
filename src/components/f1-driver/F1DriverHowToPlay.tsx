import { HowToPlay } from '@/components/game/HowToPlay';

const RULES = [
  'A mystery driver is chosen each round.',
  'Clues are revealed one at a time — from a vibe word to a famous moment.',
  'Type the driver\'s name to guess after each clue.',
  'Fewer clues used = higher score (max 1,000 points).',
  'Daily challenge gives everyone the same driver.',
];

export function F1DriverHowToPlay() {
  return <HowToPlay title="How to Play — Guess The Driver" rules={RULES} />;
}
