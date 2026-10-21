/**
 * One shared answer to the cookie banner for every browser walk (Round 1535).
 *
 * The banner is src/components/CookieConsent.tsx: a region labelled "Cookie choices". Round 1442 rebuilt it, and
 * the button that keeps advertising and analytics off went from "Essential only" to "Reject all" ("Accept" became
 * "Accept all", and "Save choices" and "Cancel" are new). Forty six walks still clicked "Essential only", found
 * nothing, carried on with the banner up, and then failed somewhere else: the banner sits fixed over the bottom of
 * the screen and, while it is pending, body[data-consent-pending] clamps every dialog above it.
 *
 * So every walk answers it here, in one place. Each label is matched exactly, and the old one is still matched,
 * because reviewers and gates run the same walk against older base builds (git worktree add <old sha>), whose
 * banner still says "Essential only".
 *
 * answerConsent(page) waits briefly for the banner. If it never shows (a stored answer, a page without it, a
 * help dialog that already took it) it returns 'absent'. If it shows, it presses the reject button, waits until the
 * banner is gone and body no longer carries data-consent-pending, and returns 'rejected' ('accepted' for
 * { choice: 'accept' }). A banner that is up with no such button throws, naming the labels it looked for, so a walk
 * fails on the banner itself rather than three screens later.
 *
 * Options: wait (ms to wait for the banner to appear, default 3000), timeout (ms for the press and for the banner
 * to go, default 5000), press (the walk's own way of pressing a locator, for walks that avoid Playwright's
 * scroll-first click), choice ('reject' or 'accept').
 *
 * Control: ANSWER_CONSENT_CONTROL=none makes answerConsent do nothing and return 'skipped', which is exactly the
 * state every walk was in while it clicked a label the banner no longer had. A walk run under it must go red (or
 * abort) for the banner's reason; that is how Round 1535 proved the helper is what makes the walks green.
 */

export const CONSENT_REGION = '[role="region"][aria-label="Cookie choices"], [role="dialog"][aria-label="Cookie choices"]';
export const REJECT_LABELS = ['Reject all', 'Essential only'];
export const ACCEPT_LABELS = ['Accept all', 'Accept'];

export function consentControlOn() {
  return process.env.ANSWER_CONSENT_CONTROL === 'none';
}

export function consentBanner(page) {
  return page.locator(CONSENT_REGION).first();
}

/** The banner's button for one choice, matched by exact label, new label first. Null when the banner has none. */
export async function consentButton(page, choice = 'reject') {
  const banner = consentBanner(page);
  for (const label of choice === 'accept' ? ACCEPT_LABELS : REJECT_LABELS) {
    const button = banner.getByRole('button', { name: label, exact: true });
    if (await button.count()) return button.first();
  }
  return null;
}

export async function answerConsent(page, { wait = 3000, timeout = 5000, press, choice = 'reject' } = {}) {
  if (consentControlOn()) return 'skipped';
  const banner = consentBanner(page);
  const shown = await banner.waitFor({ state: 'visible', timeout: wait }).then(() => true, () => false);
  if (!shown) return 'absent';
  const button = await consentButton(page, choice);
  if (!button) {
    const labels = (choice === 'accept' ? ACCEPT_LABELS : REJECT_LABELS).join('" or "');
    throw new Error(`answerConsent: the Cookie choices banner is up but has no "${labels}" button`);
  }
  if (press) await press(button);
  else await button.click({ timeout });
  await banner.waitFor({ state: 'hidden', timeout });
  await page.waitForFunction(() => !document.body.hasAttribute('data-consent-pending'), null, { timeout });
  return choice === 'accept' ? 'accepted' : 'rejected';
}

/**
 * What the page stored as its consent answer, in either store shape: 'rejected', 'accepted' or null. Round 1442
 * moved the answer from cookie-consent ('essential' or 'accepted') to cookie-consent-v2 (JSON with advertising and
 * analytics), so a walk that read the old key alone reads null on the new build.
 */
export async function storedConsent(page) {
  return page.evaluate(() => {
    try {
      const v2 = localStorage.getItem('cookie-consent-v2');
      if (v2) {
        const value = JSON.parse(v2);
        if (value && typeof value.advertising === 'boolean') return value.advertising || value.analytics ? 'accepted' : 'rejected';
      }
      const old = localStorage.getItem('cookie-consent');
      if (old === 'essential') return 'rejected';
      if (old === 'accepted') return 'accepted';
    } catch { /* an unreadable store has no answer */ }
    return null;
  });
}
