import assert from 'node:assert/strict';

/** Restore the previous Nightclub text for the historical engine comparisons. */
export function inverseUsNightclubReceipt(sport, source) {
  const nfl = sport === 'nfl';
  const ending = nfl ? ', and a line around the block of people who know your name.' : ' and a line around the block.';
  const previousReceipt = `log = 'The club opened. Four million cleaned${ending}'; break;`;
  const currentReceipt = 'log = `The club opened. ${formatNumber(w)}M cleaned' + ending + '`; break;';
  const edits = [
    ["effect: 'Washes up to 4M, heat +3'", "effect: 'Washes 4M, heat +3'"],
    [currentReceipt + (nfl ? ' }' : ''), previousReceipt],
  ];
  if (nfl || sport === 'mlb') edits.push(["import { formatNumber } from './formatNumber';\n", '']);
  if (nfl) {
    edits.push(
      ["case 'shady_club': { const w = Math.min(4, c.dirtyMoney ?? 0);", "case 'shady_club':"],
      ['s.netWorth = Math.round((s.netWorth + w) * 10) / 10; s.heat =',
        's.netWorth = Math.round((s.netWorth + Math.min(4, c.dirtyMoney ?? 0)) * 10) / 10; s.heat ='],
    );
  }
  for (const [current, previous] of edits) {
    assert.equal(source.split(current).length, 2, `${sport}: one current Nightclub anchor: ${current}`);
    source = source.replace(current, () => previous);
  }
  return source;
}
