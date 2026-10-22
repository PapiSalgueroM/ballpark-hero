import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GmEarnedDraftScreen, LOTTERY_CARD_MIN_HEIGHT, type GmEarnedDraftScreenProps } from './GmEarnedDraftScreen';
import type { SavedDraftOrder } from '@/lib/gmEarnedDraft';
import { buildDraftNight } from '@/lib/draftNight';

/* Round 1540: the shared screen, server rendered (no Link inside, so no router). The lottery card is lazy, so a
   server render of stage lottery draws the lazy box at its fixed height, whatever order it is handed. */
const CLUBS = Array.from({ length: 30 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`);
const order: SavedDraftOrder = {
  v: 1, sport: 'toy', draftYear: 2027, rulesId: 'toy', first: CLUBS, later: CLUBS, lottery: null, plain: 'no-lottery', level: [],
};
const rules = null;
const lottery = null;
const choices = Array.from({ length: 14 }, (_, i) => ({ id: `p${i}`, name: `Prospect ${i + 1}`, sub: 'G · age 20', grade: 80 - i }));
const run = { night: buildDraftNight(null, [{ team: 'C01', playerName: 'Prospect A', pos: 'G', grade: 77 }]), headline: 'Picks 1 to 11 are in.' };
const help = [{ heading: 'How it works', lines: ['One line of help.'] }];
const draw = (p: Partial<GmEarnedDraftScreenProps>): string => renderToStaticMarkup(<GmEarnedDraftScreen year={2027} stage="clock" {...p} />);
const count = (html: string, attr: string): number => html.split(attr).length - 1;

/** The screen's own markup: the two shared cards and the lazy box keep their own small print (critic 1540
    correction 3), so they are cut out before the scan, and the scan says it skipped them. */
function ownMarkup(html: string): { own: string; skipped: number } {
  let own = html;
  let skipped = 0;
  for (const attr of ['data-draft-night', 'data-gm-lottery', 'data-gm-panel-loading']) {
    const at = own.indexOf(attr);
    if (at < 0) continue;
    const start = own.lastIndexOf('<div', at);
    let depth = 0;
    let i = start;
    for (; i < own.length; i += 1) {
      if (own.startsWith('<div', i)) depth += 1;
      else if (own.startsWith('</div>', i)) { depth -= 1; if (depth === 0) break; }
    }
    own = own.slice(0, start) + own.slice(i + '</div>'.length);
    skipped += 1;
  }
  return { own, skipped };
}

describe('GmEarnedDraftScreen', () => {
  it('stage lottery: the chances, no heading "?", the lazy card box at its fixed height', () => {
    const html = draw({
      stage: 'lottery', chances: ['Your club goes in seeded 3rd of 14.'], help,
      lottery: { order, myClub: 'C03', rules, lottery, onContinue: () => {}, continueLabel: 'Continue to the draft' },
    });
    expect(count(html, 'data-gm-draft-chances')).toBe(1);
    expect(html).toContain('Lottery night first.');
    expect(html).toContain('Your club goes in seeded 3rd of 14.');
    expect(count(html, 'data-gm-draft-help')).toBe(0);
    expect(count(html, 'data-gm-panel-loading')).toBe(1);
    expect(html).toContain(`min-height:${LOTTERY_CARD_MIN_HEIGHT}px`);
    expect(count(html, 'data-gm-draft-choice')).toBe(0);
  });

  it('stage clock: the lines, the "?", fourteen choices, the staff button, and no lottery card', () => {
    const html = draw({ lines: ['You pick 12th and 41st.', 'You are on the clock at 12.'], help, run, choices, onPick: () => {}, staff: { label: 'Let your staff make your 2 picks', onPress: () => {} } });
    expect(html).toContain('You are on the clock at 12.');
    expect(count(html, 'data-gm-draft-help="')).toBe(1);
    expect(count(html, 'data-gm-draft-help-panel')).toBe(0);
    expect(count(html, 'data-gm-draft-choice=')).toBe(14);
    expect(html).toContain('Let your staff make your 2 picks');
    expect(count(html, 'data-gm-lottery')).toBe(0);
    expect(count(html, 'data-gm-panel-loading')).toBe(0);
    expect(html).toContain('Picks 1 to 11 are in.');
    expect(count(html, 'data-gm-draft-finish')).toBe(0);
  });

  it('every slot used and the summer refused: the finish button in place of the board', () => {
    const html = draw({ help, choices, staff: { label: 'Let your staff make your pick', onPress: () => {} }, finish: { label: 'Finish the draft and the summer', onPress: () => {} } });
    expect(count(html, 'data-gm-draft-finish')).toBe(1);
    expect(html).toContain('Finish the draft and the summer');
    expect(count(html, 'data-gm-draft-choice=')).toBe(0);
    expect(count(html, 'data-gm-draft-staff')).toBe(0);
  });

  it('stage over: with no run it draws its OWN Continue to the hub; with one, the card carries it', () => {
    const bare = draw({ stage: 'over', lines: ['Every pick of the draft is in.'], help, run: null, onLeave: () => {} });
    expect(count(bare, 'data-gm-draft-done')).toBe(1);
    expect(count(bare, 'data-gm-draft-leave')).toBe(1);
    expect(bare).toContain('Continue to the hub');
    const empty = draw({ stage: 'over', help, run: { night: buildDraftNight(null, []), headline: 'x' }, onLeave: () => {} });
    expect(count(empty, 'data-gm-draft-leave')).toBe(1);
    const withRun = draw({ stage: 'over', help, run, onLeave: () => {} });
    expect(count(withRun, 'data-gm-draft-leave')).toBe(0);
    expect(count(withRun, 'data-draft-continue')).toBe(1);
  });

  it('no 10 or 11 px text of the screen\'s own, at any stage (the shared cards and the lazy box skipped, and counted)', () => {
    const pages = [
      draw({ stage: 'lottery', chances: ['a'], lottery: { order, myClub: 'C03', rules, lottery } }),
      draw({ lines: ['b'], help, run, choices, staff: { label: 's', onPress: () => {} } }),
      draw({ stage: 'over', lines: ['c'], help, run, onLeave: () => {} }),
      draw({ stage: 'over', lines: ['c'], help, onLeave: () => {} }),
    ];
    let skipped = 0;
    for (const html of pages) {
      const cut = ownMarkup(html);
      skipped += cut.skipped;
      expect(cut.own).not.toMatch(/text-\[(10|11)px\]/);
      expect(cut.own).toContain('data-gm-draft-heading');
    }
    expect(skipped).toBe(3);
    /* The scan sees small print when it is there. */
    expect(pages[1]).toMatch(/text-\[10px\]/);
  });
});
