/**
 * Round 916: the Fight Career life layer, the quick checks. The measured ones
 * (identity over 1,040 careers, decisions per gap, every ladder step) live in
 * scripts/simFightCareer.mjs section 7; these are the shape rules a change
 * should trip in seconds.
 */
import { describe, it, expect } from 'vitest';
import { newFightCareer, runCamp, takeFight } from '@/lib/fightCareer';
import {
  LIFE_CARDS, isBoutNeutral, describeLifeEffect, ensureLife, answerLifeCard, cloneForLife, applyLifeEffect,
  TRAINERS, MANAGERS, describeTrainer, describeManager,
} from '@/lib/fightCareerLife';
import { lifeNewCareer, lifeRunCamp, lifeTakeFight, nextLifeStep } from '@/lib/fightCareerLifeFlow';
import { FIGHT_INBOX_TEXTS, neutralInboxChoice } from '@/lib/fightCareerInbox';
import {
  FIGHT_RIVALRY_CHOICES, dismissFightRivalryEvent, answerFightRivalryChoice, neutralRivalryChoice,
} from '@/lib/fightCareerRivalry';

const PLAN = { conditioning: 2, power: 2, defence: 1, speed: 1 };
const LOOKS = ['box', 'press', 'counter'] as const;

describe('the deck', () => {
  it('has at least 36 cards, unique ids, and one neutral option on each', () => {
    expect(LIFE_CARDS.length).toBeGreaterThanOrEqual(36);
    expect(new Set(LIFE_CARDS.map(c => c.id)).size).toBe(LIFE_CARDS.length);
    for (const c of LIFE_CARDS) {
      const neutral = c.options.filter(o => o.neutral);
      expect(neutral, c.id).toHaveLength(1);
      expect(isBoutNeutral(neutral[0].effect), c.id).toBe(true);
      expect(c.cooldown, c.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('every text and every rival choice has a reply that moves nothing', () => {
    for (const t of FIGHT_INBOX_TEXTS) expect(neutralInboxChoice(t), t.id).toBeGreaterThanOrEqual(0);
    for (const d of FIGHT_RIVALRY_CHOICES) expect(d.choices.filter(c => c.neutral), d.id).toHaveLength(1);
  });

  it('writes no dashes anywhere a player reads', () => {
    const words = [
      ...LIFE_CARDS.flatMap(c => [c.title, c.text, ...c.options.flatMap(o => [o.label, o.line, describeLifeEffect(o.effect)])]),
      ...FIGHT_INBOX_TEXTS.flatMap(t => [t.text, ...t.choices.flatMap(c => [c.label, c.reply])]),
      ...TRAINERS.map(describeTrainer), ...MANAGERS.map(describeManager),
    ];
    for (const w of words) expect(w).not.toMatch(/[–—]/);
  });
});

describe('words and numbers', () => {
  it('describes a cost and charges exactly that cost', () => {
    const st = cloneForLife(lifeNewCareer('Words', 'welter', 'outboxer'));
    st.life.bank = 1;
    applyLifeEffect(st, { cash: -0.04 });
    expect(describeLifeEffect({ cash: -0.04 })).toBe('Bank -0.04m.');
    expect(st.life.bank).toBe(0.96);
    expect(describeLifeEffect({})).toBe('Nothing changes.');
  });
});

describe('saves', () => {
  it('opens a save from before the round with its record untouched and a default corner', () => {
    let v1 = newFightCareer('Old', 'light', 'swarmer', 'vitest-v1');
    for (let i = 0; i < 4; i += 1) v1 = takeFight(runCamp(v1, PLAN), v1.offers[1].id, [...LOOKS])!.state;
    const opened = ensureLife(JSON.parse(JSON.stringify(v1)));
    const { life, ...rest } = opened;
    expect(JSON.stringify(rest)).toBe(JSON.stringify(v1));
    expect(life.trainer.kind).toBe('allround');
    expect(life.manager.kind).toBe('family');
    expect(life.pending).toEqual([]);
  });

  it('resets a corrupt life block alone', () => {
    const st = lifeNewCareer('Junk', 'fly', 'counter');
    const fixed = ensureLife({ ...st, life: 'garbage' as never });
    expect(fixed.fighter).toEqual(st.fighter);
    expect(fixed.life.v).toBe(1);
  });

  it('comes back to the same card after a reload', () => {
    let st = lifeNewCareer('Reload', 'middle', 'slugger', 'allround', 'family', 'vitest-reload');
    st = lifeTakeFight(lifeRunCamp(st, PLAN), st.offers[0].id, [...LOOKS])!.state;
    const step = nextLifeStep(st);
    expect(step).not.toBeNull();
    const back = ensureLife(JSON.parse(JSON.stringify(st)));
    expect(nextLifeStep(back)).toEqual(step);
  });
});

describe('neutral play', () => {
  it('fights the same fights as the engine alone', () => {
    for (const seed of ['n1', 'n2', 'n3']) {
      let base = newFightCareer('Same', 'welter', 'outboxer', seed);
      let life = lifeNewCareer('Same', 'welter', 'outboxer', 'allround', 'family', seed);
      for (let i = 0; i < 8 && !base.retired; i += 1) {
        for (let guard = 0; guard < 12; guard += 1) {
          const step = nextLifeStep(life);
          if (!step) break;
          if (step.kind === 'beat') life = dismissFightRivalryEvent(life)!;
          else if (step.kind === 'choice') life = answerFightRivalryChoice(life, neutralRivalryChoice(step.card.id))!.state;
          else life = answerLifeCard(life, step.card.options.findIndex(o => o.neutral))!.state;
        }
        expect(nextLifeStep(life)).toBeNull();
        const id = base.offers[1].id;
        base = takeFight(runCamp(base, PLAN), id, [...LOOKS])!.state;
        life = lifeTakeFight(lifeRunCamp(life, PLAN), id, [...LOOKS])!.state;
        expect(life.fighter.damage).toBe(base.fighter.damage);
        expect(life.history.map(h => h.result + h.method)).toEqual(base.history.map(h => h.result + h.method));
      }
    }
  });
});
