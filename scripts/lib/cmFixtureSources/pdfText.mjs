/**
 * Round 1213: read the text layer of a simple PDF with nothing but zlib.
 *
 * Enough of the format for a table exported from a word processor, which is
 * what the DFL's fixture lists are: Flate compressed page content streams whose
 * text is shown with Tj and TJ between BT and ET, each run placed by a text
 * matrix (a b c d x y Tm). It returns, page by page, the runs with their
 * position, and a helper that folds runs on one baseline into a line.
 *
 * It does not decode composite fonts (hex strings through a ToUnicode map). A
 * page that shows text that way comes back with a count of the runs it could
 * not read, and the caller refuses the file rather than work with half a page.
 */
import zlib from 'node:zlib';

/** Decode one PDF literal string body (between its outer brackets) as WinAnsi text. */
function literal(body) {
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch !== '\\') { out += ch; continue; }
    const next = body[i + 1];
    if (next === undefined) break;
    if (/[0-7]/.test(next)) {
      const oct = /^[0-7]{1,3}/.exec(body.slice(i + 1))[0];
      out += String.fromCharCode(parseInt(oct, 8));
      i += oct.length;
    } else {
      out += ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' })[next] ?? (next === '\n' ? '' : next);
      i += 1;
    }
  }
  return new TextDecoder('windows-1252').decode(Uint8Array.from(out, c => c.charCodeAt(0) & 0xff));
}

/** Every literal string inside one TJ array or Tj operand, joined. Counts the hex strings it had to skip. */
function shownText(operand) {
  let text = '';
  let hex = 0;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < operand.length; i += 1) {
    const ch = operand[i];
    if (ch === '\\' && depth > 0) { i += 1; continue; }
    if (ch === '(') { if (depth === 0) start = i + 1; depth += 1; continue; }
    if (ch === ')' && depth > 0) {
      depth -= 1;
      if (depth === 0) text += literal(operand.slice(start, i));
      continue;
    }
    if (ch === '<' && depth === 0 && operand[i + 1] !== '<') hex += 1;
  }
  return { text, hex };
}

/** The inflated content streams of a PDF that show text, in file order. */
export function contentStreams(buf) {
  const latin = buf.toString('latin1');
  const streams = [];
  let at = 0;
  for (;;) {
    const s = latin.indexOf('stream', at);
    if (s < 0) break;
    let start = s + 6;
    if (latin[start] === '\r') start += 1;
    if (latin[start] === '\n') start += 1;
    const end = latin.indexOf('endstream', start);
    if (end < 0) break;
    at = end + 9;
    const dictAt = latin.lastIndexOf('<<', s);
    if (dictAt < 0 || !/\/FlateDecode/.test(latin.slice(dictAt, s))) continue;
    let out;
    try {
      out = zlib.inflateSync(buf.subarray(start, end)).toString('latin1');
    } catch {
      continue;
    }
    if (/\bBT\b/.test(out) && /T[jJ]/.test(out)) streams.push({ offset: s, text: out });
  }
  return streams;
}

/** The text runs of one content stream: { x, y, text }, in the order they are drawn. */
export function textRuns(stream) {
  const runs = [];
  let unread = 0;
  for (const block of stream.matchAll(/\bBT\b([\s\S]*?)\bET\b/g)) {
    let x = 0;
    let y = 0;
    const ops = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm|(\[(?:[^\]\\(]|\\.|\((?:[^)\\]|\\.)*\))*\])\s*TJ|(\((?:[^)\\]|\\.)*\))\s*Tj/g;
    for (const op of block[1].matchAll(ops)) {
      if (op[5] !== undefined) { x = Number(op[5]); y = Number(op[6]); continue; }
      const shown = shownText(op[7] ?? op[8]);
      unread += shown.hex;
      if (shown.text) runs.push({ x, y, text: shown.text });
    }
  }
  return { runs, unread };
}

/** Fold runs into lines: runs whose baselines are within tolerance share a line, cells ordered left to right. */
export function linesOf(runs, tolerance = 2) {
  const lines = [];
  for (const run of runs) {
    let line = lines.find(l => Math.abs(l.y - run.y) <= tolerance);
    if (!line) { line = { y: run.y, cells: [] }; lines.push(line); }
    line.cells.push(run);
  }
  for (const l of lines) l.cells.sort((a, b) => a.x - b.x);
  return lines.sort((a, b) => b.y - a.y);
}
