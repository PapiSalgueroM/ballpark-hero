import { act, fireEvent } from '@testing-library/react';

/* Round 1082: an offer card no longer signs. Its button is Review contract,
   which opens a dialog drawn in a portal on document.body, and that dialog's
   own Sign contract is the only thing that accepts the deal. A page walker
   that only looks inside the screen card would press Review contract for
   ever on a screen with nothing but offers (Release AL: three seeds of
   careerDilemmaReach ran out of steps exactly there).

   Call this straight after pressing a button. When the button was a Review
   contract it finishes the signing the way a player does and returns true;
   for any other button it does nothing and returns false. It throws when the
   review does not open, because then a player could not sign either. */
export async function signThroughReview(pressed: HTMLElement, settle: () => Promise<void>): Promise<boolean> {
  if (!(pressed.textContent ?? '').trim().startsWith('Review contract')) return false;
  const dialog = document.body.querySelector('[data-soccer-offer-review]');
  const sign = dialog
    ? Array.from(dialog.querySelectorAll('button')).find(b => (b.textContent ?? '').trim() === 'Sign contract')
    : undefined;
  if (!sign) throw new Error('Review contract opened no dialog with a Sign contract button');
  await act(async () => { fireEvent.click(sign); });
  await settle();
  return true;
}
