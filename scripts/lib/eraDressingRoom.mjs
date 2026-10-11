/**
 * Round 672: into a Club Manager dressing room the way a player gets there
 * now, and the squad read off the Squad tab's own panel.
 *
 * playEra2005, playEra2010 and playEra2015 all walked in with one press of
 * "Take the job" and then read the whole page body for the names they wanted.
 * Two things broke that, neither of them a game bug:
 *
 *   1. Round 303 put a fifth step behind that press, the dugout form, with its
 *      own "Take the job" and a "Skip: just manage". The walks never pressed
 *      either, so they sat on the form and never reached the hub at all.
 *   2. The "Squad" they clicked was `text=Squad`, a case blind substring
 *      match. On the dugout step, where they were stuck, the first match was
 *      the intro line ("squads as of August 2026"), a paragraph, not a tab,
 *      and nothing tied the click to the Squad tab on any screen.
 *
 * And because they read the whole body, every name the Club Manager guide
 * happens to mention (Vardy, Dybala, Rooney) passed from the guide text at the
 * bottom of the page while the squad was never on screen. Only the names the
 * guide does not mention (Owen, Shearer, Schmeichel, Buffon, Pogba) went red,
 * which is how these walks came to be red on main on 2026-09-28.
 *
 * So this takes the classic career path the other Club Manager walks take
 * (playClubManager, playDealDesk): the confirm bar, then Skip: just manage,
 * then the Squad TAB by role, and it hands back the text of the panel that tab
 * controls. A squad claim is checked against that panel and nothing else.
 *
 * ERA_CONTROL=drop is the negative control, shared by the three walks: each
 * walk names the men it claims, and the served clubManager chunk has their era
 * data rows renamed, which is the game's squad data losing them, while the
 * guide copy that used to satisfy the old reads is left alone (the verdict
 * prints which dropped names the page body still carried). Exactly the checks
 * that name those men have to go red.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), 'dist');
export const ERA_CONTROL = process.env.ERA_CONTROL || '';
if (ERA_CONTROL && !['drop', 'ghost'].includes(ERA_CONTROL)) { console.error(`ERA_CONTROL=${ERA_CONTROL} is not a control the era walks know`); process.exit(2); }
const DROPPED = 'Control Dropped';

/**
 * Round 1304: where a name is written in the GAME, which is the page without
 * its guide. Each era walk ended on "no 2026 player leaked into this season",
 * read off the whole page body, the one read Round 672 left on the body. Since
 * Round 971 the guide under the game says what 2020-21 is ("Haaland and
 * Bellingham at Dortmund ... Bruno Fernandes at Manchester United"), and the
 * guide stays on the page, so the 2005, 2010 and 2015 walks went red on a
 * sentence about another season while the dressing room was clean. This walks
 * the page's text nodes, leaves out the guide (data-seo-content) and anything
 * that is not shown as text, and hands back where the name is written, so a
 * real leak is reported with its place and the guide can name whom it likes.
 */
export async function namedInGame(page, name) {
  return page.evaluate(n => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const text = t.textContent ?? '';
      if (!text.includes(n)) continue;
      const el = t.parentElement;
      if (!el || el.closest('[data-seo-content], script, style, noscript, template')) continue;
      out.push(`<${el.tagName.toLowerCase()}> "${text.trim().slice(0, 70)}"`);
    }
    return out;
  }, name);
}

/**
 * ERA_CONTROL=ghost (Round 1304): write a name into the Squad tab's own panel,
 * as a leak into the dressing room would. True when it was written. The
 * walk's "no 2026 player leaked" check must then go red, and only it.
 */
export async function plantGhost(page, name) {
  return page.evaluate(n => {
    const tab = [...document.querySelectorAll('[role="tab"]')].find(t => (t.textContent ?? '').trim() === 'Squad');
    const panel = tab ? document.getElementById(tab.getAttribute('aria-controls') ?? '') : null;
    if (!panel) return false;
    const s = document.createElement('span');
    s.setAttribute('data-era-control', 'ghost');
    s.textContent = n;
    panel.appendChild(s);
    return true;
  }, name);
}

/** The verdict on a ghost control run. `target` is the leak check's label as the walk words it. */
export function judgeGhostControl(harness, failed, target, planted) {
  if (!planted) {
    console.error(`${harness} control: RED. The name was never written into the squad panel, so a red run would be red for some other reason.`);
    return 1;
  }
  const hit = failed.filter(t => t.startsWith(target));
  const collateral = failed.filter(t => !t.startsWith(target));
  if (hit.length === 1 && collateral.length === 0) {
    console.error(`${harness} control: green. A 2026 name written into the squad panel was reported by the leak check and by nothing else (${hit[0]}). Exiting non zero, because a run with findings fails.`);
  } else {
    console.error(`${harness} control: RED. Expected exactly the leak check red, got ${hit.length} of it and ${collateral.length} other(s): ${collateral.join('; ') || 'none'}.`);
  }
  return 1;
}

/* The shape of one era data row in the built chunk: {n:"Michael Owen",p:"ST",... */
const rowNeedle = name => `{n:${JSON.stringify(name)},`;

/**
 * Assert, before a browser starts, that every name is an era data row in the
 * served build, so the swap has something to change. Returns an error line,
 * or null when the control can run.
 */
export async function assertDropControl(base, names) {
  const dir = path.join(DIST, 'assets');
  for (const name of names) {
    const needle = rowNeedle(name);
    const file = fs.readdirSync(dir).filter(f => f.endsWith('.js'))
      .find(f => fs.readFileSync(path.join(dir, f), 'utf8').includes(needle));
    if (!file) return `no built asset carries the data row ${needle}, so dropping it would change nothing`;
    let served = '';
    try { served = await (await fetch(`${base}/assets/${file}`)).text(); } catch { /* judged below */ }
    if (!served.includes(needle)) return `/assets/${file} did not come back from the server with ${needle} in it`;
    console.log(`  control  ${needle} confirmed in the served /assets/${file}`);
  }
  return null;
}

/** Rename those rows in every script this page is served. Counts swaps. */
export async function installDropControl(page, names, tally) {
  await page.route('**/*.js', async route => {
    const res = await route.fetch();
    let body = await res.text();
    let hit = false;
    for (const name of names) {
      const needle = rowNeedle(name);
      if (body.includes(needle)) { body = body.split(needle).join(rowNeedle(DROPPED)); hit = true; }
    }
    if (hit) tally.swaps += 1;
    await route.fulfill({ response: res, body });
  });
}

/**
 * From a picked club (confirm bar on screen) to the Squad tab. Returns the
 * body text on the hub, the squad panel's text, and whether the panel really
 * listed a squad, so a negative claim is never read off an empty panel.
 */
export async function enterSquad(page) {
  await page.locator('text=Take the job').click();
  const skip = page.getByRole('button', { name: /^Skip: just manage$/ }).first();
  await skip.waitFor({ timeout: 9000 }).catch(() => {});
  await skip.click({ timeout: 5000 }).catch(() => {});
  const tab = page.getByRole('tab', { name: /^Squad$/ }).first();
  await tab.waitFor({ timeout: 15000 }).catch(() => {});
  if (await tab.count().catch(() => 0) === 0) return { hub: '', squad: '', listed: false };
  const hub = (await page.locator('body').innerText().catch(() => '')) || '';
  await tab.click({ timeout: 5000 }).catch(() => {});
  const panelId = await tab.getAttribute('aria-controls').catch(() => null);
  const panel = panelId ? page.locator(`[id="${panelId}"]`) : null;
  if (panel) await panel.getByText(/in squad\)/i).first().waitFor({ timeout: 9000 }).catch(() => {});
  const squad = panel ? ((await panel.innerText().catch(() => '')) || '') : '';
  return { hub, squad, listed: /\(\d+ in squad\)/i.test(squad) };
}

/** The verdict on a control run, printed and turned into an exit code.
    `stillNamed` is every dropped man the hub page's body text still named
    during the run, measured rather than assumed. */
export function judgeDropControl(harness, failed, targets, tally, stillNamed) {
  if (tally.swaps === 0) {
    console.error(`${harness} control: RED. The drop never landed on a served asset, so a red run would be red for some other reason.`);
    return 1;
  }
  const hit = targets.filter(t => failed.includes(t));
  const collateral = failed.filter(t => !targets.includes(t));
  console.log(`   control: ${tally.swaps} served asset(s) rewritten, ${hit.length} of ${targets.length} target checks red, ${collateral.length} other check(s) red`);
  console.log(`   control: the page body still named ${stillNamed.length ? stillNamed.join(', ') : 'none of them'} while the squad data had lost them`);
  if (hit.length === targets.length && collateral.length === 0) {
    console.error(`${harness} control: green. Taking those men out of the era squad data was reported by exactly the checks that claim them, so the squad is read off the squad. Exiting non zero, because a run with findings fails.`);
  } else {
    console.error(`${harness} control: RED. Expected exactly ${targets.length} red (${targets.join('; ')}), got ${hit.length} of them and ${collateral.length} other(s): ${collateral.join('; ') || 'none'}.`);
  }
  return 1;
}
