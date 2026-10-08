// Release AM reviewer (us-careers), never committed. Second walk: what the first one left open.
// usage: node walk2.mjs <shotsDir> <reportFile>   (BASE from the environment)
import { open, toHub, advance, check, note, report, save, keyOf, chromium } from './walk.mjs';
import { measure, hubLine, retry, PHONE, DESK, NOTICE } from './walkMain.mjs';

const bodyText = page => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const hallText = page => page.evaluate(() => {
  const card = document.querySelector('div.rounded-xl.border-2.bg-gradient-to-b');
  return card ? card.innerText.replace(/\s+/g, ' ').trim() : null;
});
const playRect = page => page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Play the \d{4}/.test(x.textContent || ''));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight, scrollY: Math.round(window.scrollY), inView: r.top >= 0 && r.bottom <= window.innerHeight };
});
const scored = s => s.completions.map(p => { try { return JSON.parse(p); } catch { return p; } });
const create = async (s, name) => {
  await s.goto();
  await s.page.locator('input[aria-label="Your player name"]').fill(name);
  await s.page.locator('button:has-text("Enter the draft")').click();
  await s.page.waitForTimeout(900);
};
const playOne = async s => {
  await s.page.locator('button:has-text("Play the")').first().click();
  await s.page.waitForTimeout(700);
  return toHub(s.page, 40);
};

/* W1. where the page is after a quick create, with storage healthy: is the hub in view? */
async function landing(browser, vp, slug, tag) {
  const s = await open(browser, vp, slug, tag);
  await create(s, 'Landing Probe');
  const r = await playRect(s.page);
  note(`${tag} ${slug} landing after a clean quick create`, r);
  check(!(await measure(s.page)), `${tag} ${slug}: a clean create shows no save notice`);
  await s.shot('clean-create-landing');
  await s.context.close();
}

const OPTIONAL = ['prospect', 'netWorth', 'dirtyMoney', 'heat', 'suspendedSeasons', 'purchased', 'lifeFlags', 'appearance', 'yearlyCosts', 'rival', 'eraId', 'role', 'money',
  'headlines', 'phoneInbox', 'phoneUsedIds', 'karma', 'pendingRivalryEvent', 'lastRivalryEventId', 'rivalryIntensity', 'pendingRivalryChoice', 'rivalryChoicesSeen', 'practice',
  'summer', 'eventLastFired', 'summerSalt', 'retirement', 'hallSpeech', 'numberRetiredBy'];

/* W2. an old save: every optional career field gone and no coach key. Active, then retired. */
async function oldSave(browser, vp, slug, tag) {
  const s = await open(browser, vp, slug, tag);
  const { page } = s;
  const key = keyOf(slug);
  await create(s, 'Old Save');
  await playOne(s);
  const stripped = await page.evaluate(({ k, optional }) => {
    const raw = JSON.parse(localStorage.getItem(k));
    const present = optional.filter(f => f in raw.c);
    for (const f of optional) delete raw.c[f];
    localStorage.setItem(k, JSON.stringify({ c: raw.c, phase: 'season', teamQuality: raw.teamQuality }));
    return present;
  }, { k: key, optional: OPTIONAL });
  note(`${tag} ${slug} old save: optional fields stripped`, stripped);
  const errorsBefore = report.errors.length;
  await s.goto();
  const txt = await bodyText(page);
  check(/Play the \d{4} season/.test(txt) && /Old Save/.test(txt), `${tag} ${slug}: an old active save opens on its hub`, txt.slice(0, 160));
  await s.shot('old-active-hub');
  const trail = await playOne(s);
  const after = JSON.parse((await s.stored()) || 'null');
  check(['hub', 'retired'].includes(trail[trail.length - 1]) && after?.c?.seasons?.length === 2, `${tag} ${slug}: the old save plays its next season and saves it`, `${trail.join(',')} seasons ${after?.c?.seasons?.length}`);
  const retiredBytes = await page.evaluate(({ k, optional }) => {
    const raw = JSON.parse(localStorage.getItem(k));
    for (const f of optional) delete raw.c[f];
    raw.c.retired = true;
    const out = JSON.stringify({ c: raw.c, phase: 'retired', teamQuality: raw.teamQuality });
    localStorage.setItem(k, out);
    return out;
  }, { k: key, optional: OPTIONAL });
  const posted = s.completions.length;
  await s.goto();
  await page.waitForTimeout(6000);
  const t2 = await bodyText(page);
  check(/Old Save retires/.test(t2), `${tag} ${slug}: an old retired save opens on the retirement screen`, t2.slice(0, 160));
  check(s.completions.length === posted, `${tag} ${slug}: opening an old retired save posts no completion`, `${posted} then ${s.completions.length}`);
  check((await s.stored()) === retiredBytes, `${tag} ${slug}: opening an old retired save writes nothing`);
  note(`${tag} ${slug} old retired hall card`, await hallText(page));
  await s.shot('old-retired', true);
  check(report.errors.length === errorsBefore, `${tag} ${slug}: no page error while the old saves load`, JSON.stringify(report.errors.slice(errorsBefore)));
  await s.context.close();
}

/* W4. a pending save and a trip Home inside the same tab. */
async function homeAndBack(browser, vp, slug, tag) {
  const s = await open(browser, vp, slug, tag);
  const { page } = s;
  await create(s, 'Tab Probe');
  const diskBefore = await s.stored();
  await s.block(true);
  await playOne(s);
  const m = await measure(page);
  check(m && m.op === 'write', `${tag} ${slug}: the played season shows the write notice`, JSON.stringify(m));
  note(`${tag} ${slug} notice words`, m && m.text);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('a[href="/"]').first().click();
  await page.waitForTimeout(1500);
  await s.shot('home-with-pending-save');
  await s.block(false);
  await page.goBack();
  await page.waitForTimeout(2000);
  const now = JSON.parse((await s.stored()) || 'null');
  note(`${tag} ${slug} after Home and Back in the same tab`, { seasonsOnDisk: now?.c?.seasons?.length ?? null, diskUnchanged: (await s.stored()) === diskBefore, notice: !!(await measure(page)), hub: await hubLine(page) });
  await s.shot('back-from-home');
  await s.context.close();
}

export { landing, oldSave, homeAndBack, bodyText, hallText, playRect, scored, create, playOne };
