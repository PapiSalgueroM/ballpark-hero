/**
 * Release AU, second fix pass (2026-10-10): a cup night, as a browser walk of
 * the Soccer Season Centre meets it.
 *
 * Since Rounds 1197 to 1208 the Season Centre stops between two league games
 * for every cup game the save kept (src/lib/soccerSeasonCalendar.ts places
 * them: a continental game from league game 3 on, the domestic cup's early
 * rounds after league game 5, the later rounds by their share of the season).
 * The bar then offers, one after the other:
 *
 *   [data-centre-next-cup]        "▶ <cup>: <round>", at full time of the league
 *                                 game the cup night comes after
 *   [data-calendar-cup-reveal]    "▶ Show saved cup result", on the cup night
 *   [data-calendar-cup-continue]  "▶ <next cup>: <round>", "▶ Matchday N",
 *                                 "▶ League game N" or "▶ Season review", once
 *                                 the result is shown
 *
 * A player presses them in turn. A walk that only knows "▶ Matchday" stops dead
 * at the first one, so the walks of the Season Centre press them through this
 * one helper and go on to what they came to measure. Each press is the button's
 * own click, the way those walks press every other button of the bar.
 *
 * pressCupNight(page)           one press of whichever of the three is on the
 *                               screen. Returns { what, label } with what one of
 *                               'open', 'reveal', 'on', or null when the screen
 *                               holds none of them.
 * throughCupNights(page, each)  presses until none of the three is left: the
 *                               league (or the review) is on the stage again.
 *                               `each(press)` runs on every cup night right after
 *                               its result is shown, so a walk can measure that
 *                               screen too. Returns { nights, presses, labels }.
 *
 * Reads no network, edits no save, runs nothing at import time.
 */
export const CUP_OPEN = '[data-centre-next-cup]';
export const CUP_REVEAL = '[data-calendar-cup-reveal]';
export const CUP_ON = '[data-calendar-cup-continue]';

export async function pressCupNight(page, settleMs = 150) {
  const pressed = await page.evaluate(order => {
    const root = document.querySelector('[data-season-centre]');
    if (!root) return null;
    for (const [selector, what] of order) {
      const button = root.querySelector(selector);
      if (button && !button.disabled) {
        const label = button.textContent.trim();
        button.click();
        return { what, label };
      }
    }
    return null;
  }, [[CUP_REVEAL, 'reveal'], [CUP_ON, 'on'], [CUP_OPEN, 'open']]);
  if (pressed) await page.waitForTimeout(settleMs);
  return pressed;
}

export async function throughCupNights(page, each = null, limit = 80) {
  const out = { nights: 0, presses: 0, labels: [] };
  for (let i = 0; i < limit; i += 1) {
    const pressed = await pressCupNight(page);
    if (!pressed) break;
    out.presses += 1;
    out.labels.push(pressed.label);
    if (pressed.what === 'reveal') {
      out.nights += 1;
      if (each) await each(pressed);
    }
  }
  return out;
}
