/**
 * Release AU fix pass (2026-10-10): the chance wheel, as a browser walk meets it.
 *
 * Since Rounds 1197 to 1208 an event choice with odds leaves a receipt on the
 * Soccer Career save (state.chanceWheel), and a receipt nobody has seen opens
 * the wheel over whatever screen of the career loads next. For a player that
 * is the next thing to answer: Spin the wheel or Show result, then Continue.
 * A walk that plants a save made through applyEventChoice meets the same
 * wheel, so it answers it the same way, through this one helper, and goes on
 * to what it came to measure. Nothing here edits a save: the page marks the
 * receipt seen when Continue is pressed, exactly as it does for a player.
 *
 * wheelBoxes(page)            what the open wheel looks like: can it be
 *                             answered, and is the one line it exists to show
 *                             whole on the screen (inside the viewport, inside
 *                             the dialog, inside every box that clips it).
 * answerChanceWheel(page, how) answers an open wheel ('spin' or 'skip') and
 *                             returns the boxes before and after the reveal
 *                             and how long the reveal took; null when no
 *                             wheel is open.
 *
 * Reads no network. Imported by walks; it runs nothing at import time.
 */
export const WHEEL = '[data-career-chance-wheel]';
export const WHEEL_WAITING = 'Ready to reveal your saved result.';

export const wheelBoxes = page => page.evaluate(sel => {
  const dialog = document.querySelector(sel);
  if (!dialog) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const box = el => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), height: Math.round(r.height) }; };
  const inside = (a, b) => a.top >= b.top - 1 && a.bottom <= b.bottom + 1 && a.left >= b.left - 1 && a.right <= b.right + 1;
  const screen = { top: 0, bottom: vh, left: 0, right: vw };
  /* Whole: inside the screen, the dialog and every ancestor up to the dialog that clips what it holds. */
  const whole = el => {
    const r = box(el);
    if (r.height < 1 || !inside(r, screen) || !inside(r, box(dialog))) return false;
    for (let up = el.parentElement; up && up !== dialog; up = up.parentElement) {
      const cs = getComputedStyle(up);
      if ((cs.overflowY !== 'visible' || cs.overflowX !== 'visible') && !inside(r, box(up))) return false;
    }
    return true;
  };
  const result = dialog.querySelector('[data-wheel-result]');
  const disk = dialog.querySelector('[data-wheel-disk]');
  const buttons = [...dialog.querySelectorAll('[data-wheel-spin], [data-wheel-skip], [data-wheel-continue]')];
  const ms = v => Math.max(0, ...String(v).split(',').map(x => { x = x.trim(); return x.endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000; }).filter(n => Number.isFinite(n)));
  return {
    viewport: `${vw}x${vh}`,
    dialog: box(dialog),
    result: result ? { ...box(result), text: result.textContent, whole: whole(result) } : null,
    disk: disk ? { ...box(disk), whole: whole(disk), transitionMs: ms(getComputedStyle(disk).transitionDuration) } : null,
    buttons: buttons.map(b => ({ name: b.textContent.trim(), ...box(b), whole: whole(b), enabled: !b.disabled })),
  };
}, WHEEL);

export async function answerChanceWheel(page, how = 'skip') {
  const dialog = page.locator(WHEEL);
  if (await dialog.count() === 0) return null;
  const before = await wheelBoxes(page);
  const started = Date.now();
  await dialog.locator(how === 'spin' ? '[data-wheel-spin]' : '[data-wheel-skip]').click();
  await page.waitForFunction(waiting => {
    const r = document.querySelector('[data-wheel-result]');
    return !!r && r.textContent !== waiting && !!document.querySelector('[data-wheel-continue]');
  }, WHEEL_WAITING, { timeout: 10000 });
  const revealMs = Date.now() - started;
  const after = await wheelBoxes(page);
  await dialog.locator('[data-wheel-continue]').click();
  await dialog.waitFor({ state: 'hidden', timeout: 10000 });
  return { before, after, revealMs };
}
