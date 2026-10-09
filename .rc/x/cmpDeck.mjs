/* cmpDeck.mjs (fixer scratch, Round 1103, never committed): what moved between two deck C digests, by sport. */
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).map(p => JSON.parse(fs.readFileSync(p, 'utf8')));
for (const sport of Object.keys(b)) {
  const x = a[sport]; const y = b[sport];
  if (!x) { console.log(`${sport}: new in the recording`); continue; }
  const cards = Object.keys({ ...x.cards, ...y.cards }).filter(id => JSON.stringify(x.cards[id]) !== JSON.stringify(y.cards[id]));
  const lines = y.drawLines.map((l, i) => (l === x.drawLines[i] ? -1 : i)).filter(i => i >= 0);
  const same = JSON.stringify(x) === JSON.stringify(y);
  console.log(`${sport}: ${same ? 'BYTE EQUAL' : 'MOVED'}; fixtures ${x.fixtures} -> ${y.fixtures}; cards that changed ${cards.length} of ${Object.keys(y.cards).length}${cards.length ? ` (${cards.slice(0, 12).map(id => `${id} dealt ${x.cards[id]?.dealt ?? 'none'} -> ${y.cards[id]?.dealt ?? 'none'}`).join('; ')})` : ''}; draw lines that changed ${lines.length} of ${y.drawLines.length}${lines.length ? ` (saves ${lines.slice(0, 40).join(', ')}${lines.length > 40 ? ', ...' : ''})` : ''}; draws hash ${x.draws === y.draws ? 'same' : `${x.draws} -> ${y.draws}`}`);
}
