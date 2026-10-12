// AXG diagnosis: write scripts/wildDiag.mjs, a copy of scripts/playWilderness.mjs that says where its loop stands.
// Run on the runner's copy only (never committed): node .rc/x/mkWildDiag.mjs && node scripts/wildDiag.mjs
import fs from 'node:fs';
const src = fs.readFileSync('scripts/playWilderness.mjs', 'utf8');
const loop = 'for (let i = 0; i < 120 && !sacked; i++) {';
const after = "say(sacked, 'the board ran out of patience and the wilderness opened');";
if (src.split(loop).length !== 2 || src.split(after).length !== 2) { console.error('mkWildDiag: an anchor is not in the walk exactly once'); process.exit(2); }
const trace = loop + `
  if (i % 8 === 0) { try { console.log('DIAG i', i, 'url', page.url(), JSON.stringify((await page.locator('button:visible').allInnerTexts()).map(s => s.replace(/\\s+/g, ' ').slice(0, 28)).slice(0, 30))); } catch (e) { console.log('DIAG trace failed', String(e)); } }`;
const end = after + `
if (!sacked) {
  try { await page.screenshot({ path: (process.env.RC_OUT || '.') + '/wild-end.png' }); } catch (e) { console.log('DIAG shot failed', String(e)); }
  try {
    console.log('DIAG end url', page.url());
    console.log('DIAG end buttons', JSON.stringify((await page.locator('button:visible').allInnerTexts()).map(s => s.replace(/\\s+/g, ' ').slice(0, 40)).slice(0, 50)));
    console.log('DIAG end tabs', JSON.stringify(await page.getByRole('tab').allInnerTexts()));
    console.log('DIAG end dialogs', await page.locator('[role=dialog]').count(), JSON.stringify((await page.locator('[role=dialog]').allInnerTexts()).map(s => s.replace(/\\s+/g, ' ').slice(0, 200))));
    console.log('DIAG end save', await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('dukb-club-manager-save') || '{}'); return JSON.stringify({ boardConfidence: c.boardConfidence, week: c.week, season: c.season, phase: c.phase, club: c.club && (c.club.name || c.club), matchday: c.matchday, pendingKeys: Object.keys(c).filter(k => /pending|modal|wilder|sack|job/i.test(k)) }); }));
  } catch (e) { console.log('DIAG end failed', String(e)); }
}`;
fs.writeFileSync('scripts/wildDiag.mjs', src.replace(loop, trace).replace(after, end));
console.log('mkWildDiag: wrote scripts/wildDiag.mjs');
