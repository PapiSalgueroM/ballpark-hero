import { decodePage, lineCounter, textOf, titleOf } from './html.mjs';

export const roundBasis = 'labelled';
export const listAsOf = 'read day';

/** One labelled details block per round, with named home and away spans in each fixture link. */
export function parse(pages) {
  if (pages.length !== 1) throw new Error('PHONBALL needs one schedule page');
  const { text } = decodePage(pages[0]);
  const lineOf = lineCounter(text);
  const rows = [];
  for (const block of text.matchAll(/<details\b[^>]*\bclass="lrnd"[^>]*><summary>Regular Season - (\d+)[\s\S]*?<\/summary>([\s\S]*?)<\/details>/g)) {
    const bodyOffset = block.index + block[0].indexOf(block[2]);
    for (const match of block[2].matchAll(/<a class="lmrow" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const home = /<span class="lt h">\s*<span>([\s\S]*?)<\/span>/.exec(match[2]);
      const away = /<span class="lt a">\s*(?:<img[^>]+>)?\s*<span>([\s\S]*?)<\/span>/.exec(match[2]);
      const sourceLine = lineOf(bodyOffset + match.index);
      if (!home || !away) throw new Error(`PHONBALL: incomplete match on line ${sourceLine}`);
      rows.push({ sourceLine, ref: match[1], round: Number(block[1]), home: textOf(home[1]), away: textOf(away[1]) });
    }
  }
  if (!rows.length) throw new Error('PHONBALL has no labelled J1 matches');
  return { rows, title: titleOf(text) };
}
