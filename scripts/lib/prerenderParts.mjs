export function prerenderPartKey(part) {
  return part.key || part.s;
}

/**
 * Keep the first sample's order while removing blocks that are not present in
 * the comparison sample. A disclosure is all or nothing at its boundaries:
 * changing children may fall out, but surviving children can never be left
 * outside their <details> element.
 */
export function intersectPrerenderParts(first, later) {
  const inLater = new Set(later.map(prerenderPartKey));
  const candidate = first.filter(part => inLater.has(prerenderPartKey(part)));
  const boundaries = new Map();
  for (const part of candidate) {
    if (!part.disclosure || !part.boundary) continue;
    const found = boundaries.get(part.disclosure) || new Set();
    found.add(part.boundary);
    boundaries.set(part.disclosure, found);
  }
  return candidate.filter(part => {
    if (!part.disclosure) return true;
    const found = boundaries.get(part.disclosure);
    return found?.has('open') && found.has('close');
  });
}

export function renderPrerenderParts(parts) {
  const lines = [];
  let chromeOpen = false;
  for (const part of parts) {
    if (part.chrome && !chromeOpen) {
      lines.push('<div data-site-chrome>');
      chromeOpen = true;
    }
    if (!part.chrome && chromeOpen) {
      lines.push('</div>');
      chromeOpen = false;
    }
    lines.push(part.s);
  }
  if (chromeOpen) lines.push('</div>');
  return lines.join('\n');
}
