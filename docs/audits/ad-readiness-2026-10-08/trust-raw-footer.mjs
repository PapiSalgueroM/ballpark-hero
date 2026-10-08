// Phase 0 audit, trust area, item 4b (raw half): footers, trademark
// disclaimers and consent banner text in the saved pages a crawler reads.
// Reads only. Writes trust-raw-footer.json beside itself.
// Run from the worktree root: node docs/audits/ad-readiness-2026-10-08/trust-raw-footer.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs/audits/ad-readiness-2026-10-08/trust-raw-footer.json');

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === 'index.html') out.push(p);
  }
  return out;
}

const count = (s, re) => (s.match(re) || []).length;

function measure(html) {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, ' ');
  const body = (noComments.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, noComments])[1];
  const noScript = body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const text = noScript.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  return {
    footerTags: count(noScript, /<footer[\s>]/gi),
    respectiveOwners: count(text, /property of their respective owners/gi),
    independentFanProject: count(text, /independent fan project/gi),
    notAffiliated: count(text, /not affiliated with/gi),
    copyrightLine: count(text, /© 2026 DoUKnowBall/g),
    consentBannerText: count(text, /Ads and analytics only run if you press Accept/gi),
    cookieChoicesButton: count(text, /Cookie choices/gi),
    reportBug: count(text, /Report a bug/gi),
    privacyLinks: count(noScript, /href="\/privacy"/gi),
    snapshotBlock: count(noScript, /id="dukb-snapshot"/gi),
    words: text.trim().split(' ').length,
  };
}

const pub = path.join(ROOT, 'public');
const rows = [{ route: '/', ...measure(readFileSync(path.join(ROOT, 'index.html'), 'utf8')) }];
for (const f of walk(pub, [])) {
  const rel = path.relative(pub, f).replace(/\\/g, '/').replace(/\/?index\.html$/, '');
  if (!rel) continue;
  rows.push({ route: '/' + rel, ...measure(readFileSync(f, 'utf8')) });
}

const tally = key => {
  const t = {};
  for (const r of rows) t[r[key]] = (t[r[key]] || 0) + 1;
  return t;
};
const summary = {
  pages: rows.length,
  footerTags: tally('footerTags'),
  respectiveOwners: tally('respectiveOwners'),
  independentFanProject: tally('independentFanProject'),
  notAffiliated: tally('notAffiliated'),
  copyrightLine: tally('copyrightLine'),
  consentBannerText: tally('consentBannerText'),
  cookieChoicesButton: tally('cookieChoicesButton'),
  twoOrMoreOwnerDisclaimers: rows.filter(r => r.respectiveOwners >= 2).map(r => r.route),
  noOwnerDisclaimer: rows.filter(r => r.respectiveOwners === 0).map(r => r.route),
  twoOrMoreFooterTags: rows.filter(r => r.footerTags >= 2).map(r => r.route),
  noFooterTag: rows.filter(r => r.footerTags === 0).map(r => r.route),
};
writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), summary, rows }, null, 1));
console.log(JSON.stringify(summary, null, 1).slice(0, 4000));
