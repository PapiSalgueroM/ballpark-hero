/**
 * Round 307: the two attributes-and-a-focus that turn a hand rolled overlay
 * into something a screen reader announces and a keyboard can leave.
 *
 * The site's shadcn dialogs already do all of this (and full focus
 * trapping); these helpers are for the seven older overlays built as plain
 * fixed divs, where converting to the Dialog component would risk their
 * bespoke styling (the Soccer Career phone is literally drawn as a phone).
 * They give each one the essentials: dialog semantics, focus moved inside
 * on open, Escape to close. Full focus trapping stays on the conversion
 * backlog and the /accessibility page says so.
 *
 * focusDialogOnMount is a STABLE function on purpose: passed as ref={...}
 * it keeps the same identity across renders, so React does not re-run it
 * every render the way it re-runs a fresh arrow function, and the focus
 * happens exactly once per mount instead of stealing focus on every
 * keystroke typed inside the panel.
 */
export function focusDialogOnMount(el: HTMLElement | null): void {
  if (el && !el.dataset.dukbFocused) {
    el.dataset.dukbFocused = '1';
    el.focus();
  }
}

export function escapeCloses(onClose: () => void) {
  return (e: { key: string }) => {
    if (e.key === 'Escape') onClose();
  };
}
