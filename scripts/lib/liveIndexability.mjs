import { JSDOM } from 'jsdom';

const blocksIndexing = value => /^(?:noindex|none)$/i.test(value.trim());
const PARAMETER_RULES = new Set(['max-snippet', 'max-image-preview', 'max-video-preview', 'unavailable_after']);

/* Round 741: inspect actual tags and response headers, never prose or inert
   markup. JSDOM neither executes scripts nor searches template contents. */
export function liveIndexabilityFindings(html, headers = []) {
  const findings = [];
  const dom = new JSDOM(html);
  try {
    for (const meta of dom.window.document.querySelectorAll('meta[name][content]')) {
      const name = meta.getAttribute('name').trim().toLowerCase();
      if (name !== 'robots' && name !== 'googlebot') continue;
      const content = meta.getAttribute('content');
      if (content.split(',').some(blocksIndexing)) {
        findings.push(`blocks Google indexing with meta ${name}=${JSON.stringify(content)}`);
      }
    }
  } finally {
    dom.window.close();
  }

  for (const header of headers) {
    if (header.name.toLowerCase() !== 'x-robots-tag') continue;
    let crawler = '';
    for (let rule of header.value.split(',')) {
      rule = rule.trim();
      const scoped = rule.match(/^([\w-]+)\s*:\s*(.*)$/);
      if (scoped) {
        const prefix = scoped[1].toLowerCase();
        if (PARAMETER_RULES.has(prefix)) continue;
        crawler = prefix;
        rule = scoped[2];
      }
      if ((!crawler || crawler === 'googlebot') && blocksIndexing(rule)) {
        findings.push(`blocks Google indexing with X-Robots-Tag=${JSON.stringify(header.value)}`);
        break;
      }
    }
  }
  return findings;
}
