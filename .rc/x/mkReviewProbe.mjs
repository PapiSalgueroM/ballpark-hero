/* Round 1314 probe, never committed: writes scripts/playClubManagerReview.mjs, a copy of the walk that,
   on the season review, reports over fifteen seconds whether the transfer business heading and the
   champions line ever fade in (computed opacity, their CSS animations' state), with a shot at each time. */
import fs from 'node:fs';
let s = fs.readFileSync('scripts/playClubManager.mjs', 'utf8').replace(/\r\n/g, '\n');
const anchor = '    const rv = t;\n    reviewSeen = true;\n';
if (s.split(anchor).length !== 2) { console.error('mkReviewProbe: anchor not found exactly once'); process.exit(1); }
s = s.replace(anchor, anchor + `    {
      const look = () => page.evaluate(() => {
        const pick = txt => [...document.querySelectorAll('div,p,span')].find(e => e.textContent && e.textContent.trim() === txt);
        const champ = [...document.querySelectorAll('div,p')].find(e => /^Champions:/.test((e.textContent || '').trim()) && e.children.length < 4);
        const show = el => el ? { op: getComputedStyle(el).opacity, cls: el.className, top: Math.round(el.getBoundingClientRect().top),
          anims: el.getAnimations().map(a => \`\${a.animationName || ''} \${a.playState} t=\${Math.round(a.currentTime ?? -1)} delay=\${a.effect?.getTiming().delay}\`) } : null;
        return { hidden: document.hidden, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, scrollY: Math.round(scrollY),
          tb: show(pick('Transfer business')), champ: show(champ), tickRows: document.querySelectorAll('.cm-tick-in').length };
      }).catch(e => ({ error: String(e) }));
      let waited = 0;
      for (const at of [0, 2000, 5000, 10000, 15000]) {
        await page.waitForTimeout(at - waited); waited = at;
        console.log('   REVIEW PROBE at ' + at + ' ms: ' + JSON.stringify(await look()));
        if (process.env.RC_OUT) await page.screenshot({ path: path.join(process.env.RC_OUT, 'review-' + at + '.png') }).catch(() => {});
        if (at === 5000) await page.getByText('Transfer business', { exact: true }).first().scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      }
    }
`);
fs.writeFileSync('scripts/playClubManagerReview.mjs', s);
console.log('mkReviewProbe: scripts/playClubManagerReview.mjs written');
