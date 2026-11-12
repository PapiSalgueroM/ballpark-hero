import { decodePage, lineCounter, textOf, titleOf } from './html.mjs';

export const roundBasis = 'labelled';
export const listAsOf = 'read day';

/** J.League Data Site prints season, competition, round, date, time, home, score, and away. */
export function parse(pages) {
  if (pages.length !== 1) throw new Error('J.League Data Site needs one schedule page');
  const { text } = decodePage(pages[0]);
  const lineOf = lineCounter(text);
  const rows = [];
  for (const match of text.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => textOf(cell[1]).normalize('NFKC'));
    if (cells[0] !== '2026/27' || cells[1] !== 'J1') continue;
    const round = /^第(\d+)節/.exec(cells[2]);
    const home = cells[5], away = cells[7];
    if (!round || !home || !away) throw new Error(`J.League Data Site: incomplete match on line ${lineOf(match.index)}`);
    rows.push({ sourceLine: lineOf(match.index), ref: `offset ${match.index}`, round: Number(round[1]), home, away });
  }
  if (!rows.length) throw new Error('J.League Data Site has no 2026/27 J1 matches');
  return { rows, title: titleOf(text) };
}
