/**
 * Round 1213: the few HTML chores every page parser shares. No DOM, no
 * dependency: the fixture pages are tables, and a parser that names the exact
 * markup it expects fails loudly the day the markup changes.
 */

/** Decode a page by the charset it declares (the header first, then its meta tag), never by a guess. */
export function decodePage(page) {
  const fromHeader = /charset=["']?([\w-]+)/i.exec(page.meta?.contentType || '');
  const head = page.body.subarray(0, 4096).toString('latin1');
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head);
  const declared = (fromHeader?.[1] || fromMeta?.[1] || '').toLowerCase();
  if (!declared) throw new Error(`the page ${page.file} declares no charset`);
  const label = declared === 'iso-8859-1' ? 'windows-1252' : declared;
  let decoder;
  try {
    decoder = new TextDecoder(label, { fatal: false });
  } catch {
    throw new Error(`the page ${page.file} declares a charset this parser cannot decode: ${declared}`);
  }
  return { text: decoder.decode(page.body), charset: declared };
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** The readable text of a fragment: tags out, entities decoded, runs of space folded to one. */
export function textOf(fragment) {
  return fragment
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => (Object.hasOwn(ENTITIES, name.toLowerCase()) ? ENTITIES[name.toLowerCase()] : m))
    .replace(/\s+/g, ' ')
    .trim();
}

/** The page's own title, as text. */
export function titleOf(text) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text);
  return m ? textOf(m[1]) : null;
}

/** Line number (from 1) of an offset in a text. */
export function lineCounter(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return offset => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };
}
