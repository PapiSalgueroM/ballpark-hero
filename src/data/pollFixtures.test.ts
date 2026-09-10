import { describe, expect, it } from 'vitest';

/* scripts/simPollCharacter.mjs points this at a changed copy of the pool
   under its controls, so the rules below are proven to fire and not only to
   pass. Same trick as PollOfTheDay.test.tsx. */
const fixturesPath = process.env.POLL_FIXTURES;
const { POLLS } = fixturesPath
  ? await import(/* @vite-ignore */ fixturesPath)
  : await import('@/data/pollFixtures');

const CANNED = new Set(['Who you got?', 'Who ranks higher all time?']);
const LONG_DASH = /[–—]/;
const label = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, '').trim();

describe('Poll of the Day fallback pool', () => {
  it('is a pool worth falling back on', () => {
    expect(POLLS.length).toBeGreaterThanOrEqual(30);
    const keys = new Set(POLLS.map((p: { key: string }) => p.key));
    expect(keys.size, 'duplicate poll keys').toBe(POLLS.length);
  });

  it('keeps the prompts varied', () => {
    /* The owner's word for a pool of identical prompts was "dull". The two
       Round 509 strings are allowed as a garnish and refused as a rule. */
    const canned = POLLS.filter((p: { prompt: string }) => CANNED.has(p.prompt)).length;
    expect(canned, `${canned} of ${POLLS.length} prompts are the canned strings`).toBeLessThanOrEqual(Math.floor(POLLS.length / 5));
    const seen = new Map<string, number>();
    for (const p of POLLS) seen.set(p.prompt, (seen.get(p.prompt) ?? 0) + 1);
    for (const [prompt, n] of seen) {
      expect(n, `"${prompt}" is used ${n} times`).toBeLessThanOrEqual(3);
    }
    expect(seen.size, 'distinct prompts').toBeGreaterThanOrEqual(Math.ceil(POLLS.length * 0.8));
  });

  it('asks a real question every time', () => {
    for (const p of POLLS) {
      expect(p.prompt, `${p.key}: not a question`).toMatch(/\?$/);
      expect(p.prompt.length, `${p.key}: prompt length`).toBeGreaterThanOrEqual(10);
      expect(p.prompt.length, `${p.key}: prompt length`).toBeLessThanOrEqual(100);
      expect(p.prompt, `${p.key}: long dash in the prompt`).not.toMatch(LONG_DASH);
    }
  });

  it('keeps every choice short', () => {
    /* His 2026-08-16 rule, word for word: a name, a team, Yes or No, never a
       whole sentence. Three words, and the emoji in front does not count. */
    for (const p of POLLS) {
      const choices = [p.a, p.b, p.c, p.d].filter((c): c is string => typeof c === 'string');
      expect(choices.length, `${p.key}: choice count`).toBeGreaterThanOrEqual(2);
      expect(choices.length, `${p.key}: choice count`).toBeLessThanOrEqual(4);
      for (const raw of choices) {
        const text = label(raw);
        expect(text.length, `${p.key}: empty choice`).toBeGreaterThan(0);
        const words = text.split(/\s+/).length;
        expect(words, `${p.key}: "${text}" runs past three words`).toBeLessThanOrEqual(3);
        expect(text.length, `${p.key}: "${text}" is too long for a button`).toBeLessThanOrEqual(24);
        expect(text, `${p.key}: "${text}" reads as a sentence`).not.toMatch(/[.!]$/);
        expect(raw, `${p.key}: long dash in a choice`).not.toMatch(LONG_DASH);
      }
    }
  });
});
