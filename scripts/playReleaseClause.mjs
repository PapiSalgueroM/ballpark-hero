/**
 * Round 193 browser harness: the contracts desk on the wall at last, and
 * the clause deal signed and deleted like a person would.
 *
 * simReleaseClause proves the engine; this proves the MOUNT, because the
 * round's ugliest find was that ContractsCard was built in Round 105 and
 * never rendered anywhere: renewals were unreachable for 88 rounds. So the
 * walk takes a real job, opens the Squad tab, finds the desk, signs the
 * cheaper clause deal on a final-year player, watches the granted-clauses
 * ledger appear with the exit number, deletes it with the full-price
 * renewal, and reloads to prove the desk survives.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playReleaseClause.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fresh = await page.locator('text=Start Fresh').count();
  if (fresh) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }

  console.log('1) Take a real job in the modern era');
  await page.locator('button:has-text("2026-27")').first().click();
  await page.waitForTimeout(700);
  await page.locator('text=England').first().click();
  await page.waitForTimeout(700);
  await page.locator('text=Premier League').first().click();
  await page.waitForTimeout(700);
  /* The modern tile shortens the display name: it reads "Newcastle", not
     "Newcastle United" (probed against the real build). */
  await page.locator('button:has-text("Newcastle")').first().click();
  await page.waitForTimeout(500);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
  await page.locator('text=Take the job').click();
  await page.waitForTimeout(2000);
  say(/Newcastle/i.test(await page.locator('body').textContent() ?? ''), 'the Newcastle job is on');

  console.log('2) The contracts desk is finally on the wall (the Round 105 mount fix)');
  await page.locator('button:has-text("Squad")').first().click();
  await page.waitForTimeout(900);
  const desk = page.locator('[data-contracts-desk]');
  say(await desk.count() === 1, 'the contracts desk renders on the Squad tab');
  const deskText = await desk.innerText();
  say(/k of \d+k a week/i.test(deskText), 'the wage bill reads against the cap');
  say(/final year/i.test(deskText), 'the final-year list is present (staggered deals guarantee expirers)');
  say(/\+Clause/i.test(deskText), 'the clause deal is offered next to the plain renewal');
  say(/exit/i.test(deskText), 'the clause button quotes the exit number');

  console.log('3) Sign the cheaper deal with the exit door in it');
  const clauseBtn = desk.locator('button:has-text("+Clause")').first();
  await clauseBtn.click();
  await page.waitForTimeout(800);
  const deskAfter = await page.locator('[data-contracts-desk]').innerText();
  say(/Release clauses you have granted \(1\)/i.test(deskAfter), 'the granted-clauses ledger appears with one door');
  say(/clause £?\d/i.test(deskAfter) || /clause \d/i.test(deskAfter), 'the ledger quotes the clause number');
  say(/Remove/i.test(deskAfter), 'the full-price removal renewal is offered');

  console.log('4) The desk survives a reload, and the clause with it');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const resume = page.locator('button:has-text("Resume Career")');
  if (await resume.count()) { await resume.first().click(); await page.waitForTimeout(900); }
  await page.locator('button:has-text("Squad")').first().click();
  await page.waitForTimeout(900);
  const deskBack = await page.locator('[data-contracts-desk]').innerText();
  say(/Release clauses you have granted \(1\)/i.test(deskBack), 'the granted clause survived the reload');

  console.log('5) The full-price renewal deletes the door');
  await page.locator('[data-contracts-desk] button:has-text("Remove")').first().click();
  await page.waitForTimeout(800);
  const deskFinal = await page.locator('[data-contracts-desk]').innerText();
  say(!/Release clauses you have granted/i.test(deskFinal), 'the ledger is empty again: the plain renewal deleted the clause');

  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playReleaseClause: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playReleaseClause: green. The desk is on the wall and the door opens and shuts like the engine promised.');
