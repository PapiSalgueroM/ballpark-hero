/* Round 1605 one-off probe (never committed): do the built lift classes do what they say, and only at the widths
   they name? Reads every double quoted className holding data-consent-pending in the three files this round
   touched, puts an element with exactly that class string on a served page, fakes a pending banner 300 px tall,
   and reads the computed position and bottom at 390 and 1280, pending and answered. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE ?? 'http://localhost:4173';
const files = ['src/pages/ClubManager.tsx', 'src/components/club-manager/CustomClubForm.tsx', 'src/pages/SoccerCareer.tsx', 'src/pages/WorldCupPredictor.tsx'];
const found = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of src.matchAll(/className="([^"]*data-consent-pending[^"]*)"/g)) found.push({ f, cls: m[1] });
}
const want = c => {
  const sm = /sm:\[body/.test(c);
  const m = c.match(/_\+_([0-9.]+)rem\)\]/);
  return { sm, off: m ? Number(m[1]) * 16 : 0 };
};
const browser = await pw.chromium.launch();
let bad = 0;
console.log(`${found.length} lifted class strings found`);
for (const { f, cls } of found) {
  const { sm, off } = want(cls);
  for (const w of [390, 1280]) for (const pending of [true, false]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const got = await page.evaluate(({ cls, pending }) => {
      const b = document.createElement('button');
      b.className = cls;
      b.textContent = 'probe';
      document.body.appendChild(b);
      if (pending) { document.body.dataset.consentPending = '1'; document.body.style.setProperty('--dukb-consent-height', '300px'); }
      else { delete document.body.dataset.consentPending; document.body.style.removeProperty('--dukb-consent-height'); }
      const s = getComputedStyle(b);
      return { position: s.position, bottom: s.bottom };
    }, { cls, pending });
    await ctx.close();
    const fixedHere = !sm || w >= 640;
    const expectBottom = !fixedHere ? null : `${(pending ? 300 : 0) + off}px`;
    /* below sm the button is in the flow: Chrome resolves an unset bottom on a relative box to 0px, and the lift
       must not move it, pending or answered */
    const ok = fixedHere ? got.position === 'fixed' && got.bottom === expectBottom : got.position === 'relative' && got.bottom === '0px';
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok ' : 'BAD'} ${f.split('/').pop()} ${sm ? 'sm ' : ''}+${off} at ${w} ${pending ? 'pending ' : 'answered'}: ${got.position} bottom ${got.bottom} (want ${fixedHere ? `fixed ${expectBottom}` : 'relative 0px'})`);
  }
}
await browser.close();
if (found.length < 5) { console.log(`probeLift: only ${found.length} lifted class strings, expected 5`); process.exit(2); }
console.log(bad ? `probeLift: RED, ${bad} reads off` : 'probeLift: green, every lift lands where it says and only at its widths');
process.exit(bad ? 1 : 0);
