import { describe, expect, it } from 'vitest';
import { POLLS } from '@/data/pollFixtures';

const NONPARTICIPANT = /^(?:yes\b|no\b|someone|something|the field|today'?s best field|a modern squad|footwork|power|natural talent|work ethic|defense|offense|the game|the halftime show|playoff|march madness|wimbledon|us open|monaco|monza|lambeau|arrowhead)/i;

describe('Poll of the Day fallback matchups', () => {
  it('keeps every fallback as a simple named head to head', () => {
    for (const poll of POLLS) {
      expect(
        poll.prompt,
        `${poll.key} uses awkward wording: ${poll.prompt}`,
      ).toMatch(/^Who (?:ranks higher all time|you got)\?$/);

      for (const choice of [poll.a, poll.b]) {
        const label = choice.replace(/^[^\p{L}\p{N}]+/u, '').trim();
        expect(label, `${poll.key} uses a nonparticipant choice: ${label}`).not.toMatch(NONPARTICIPANT);
      }
    }
  });
});
