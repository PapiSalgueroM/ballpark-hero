/**
 * Round 1140: a translated page must not crash.
 *
 * THE BUG, reproduced in a real browser on the build that was live on 2026-10-08. A
 * Brazilian player could not create a Soccer Career, and Try this page again failed
 * too. His browser had translated the page to Portuguese. A page translator swaps
 * every text node for <font> elements of its own. React still holds the old text
 * nodes, so the next time it removes one (the "Choose nationality" placeholder
 * giving way to "Brazil") the browser throws NotFoundError: that node is not a child
 * of that parent any more. The whole route fell into the error boundary, and its
 * retry reloads into the same translated page, so it failed every single time.
 * Measured on the walk from the create screen to the first season: thirteen
 * separate updates would each have thrown. A pt-BR locale, the Sao Paulo timezone
 * and Brazil as nationality did nothing on their own. Translation alone did it.
 *
 * WHAT THIS DOES. removeChild and insertBefore stop throwing for exactly that case,
 * a node whose parent is no longer the one the caller remembers. Removing a node
 * that is already gone is a no-op. Inserting before a reference that is gone
 * appends at the end, so new content still shows up, if not always in the perfect
 * spot. Every other call goes straight to the browser's own method, untouched.
 *
 * WHAT IT DOES NOT DO. The translator's own <font> node stays where the translator
 * put it, so a translated page can keep a stale word beside a fresh one. That is a
 * wording blemish for somebody who asked for a translation, against a page that
 * would not open at all. The real cure for any one spot is to give a changing
 * string its own <span>: React then swaps an element and never touches a text node
 * the translator has replaced.
 *
 * `window.__DUKB_NO_TRANSLATE_GUARD__` set before the app boots leaves the browser's
 * methods alone. It exists for scripts/playTranslatedPage.mjs, whose control proves
 * the walk really does crash without the guard.
 */

type GuardWindow = Window & typeof globalThis & { __DUKB_NO_TRANSLATE_GUARD__?: boolean };

const MARK = '__dukbTranslateGuard';

export function installTranslateGuard(win: GuardWindow = window as GuardWindow): boolean {
  const NodeCtor = win.Node;
  if (typeof NodeCtor !== 'function' || !NodeCtor.prototype) return false;
  if (win.__DUKB_NO_TRANSLATE_GUARD__) return false;
  const proto = NodeCtor.prototype as Node & { [MARK]?: boolean };
  if (proto[MARK]) return true;

  const nativeRemoveChild = proto.removeChild;
  const nativeInsertBefore = proto.insertBefore;

  // One line in the console is enough to explain an odd looking translated page.
  let told = false;
  const tell = (what: string) => {
    if (told) return;
    told = true;
    console.warn(`[dukb] ${what} a node this page no longer owns. A page translator moved it, carrying on.`);
  };

  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child && child.parentNode === null) {
      tell('Skipped removing');
      return child;
    }
    return nativeRemoveChild.call(this, child) as T;
  };

  proto.insertBefore = function <T extends Node>(this: Node, node: T, reference: Node | null): T {
    if (reference && reference.parentNode !== this) {
      tell('Appended instead of inserting before');
      return nativeInsertBefore.call(this, node, null) as T;
    }
    return nativeInsertBefore.call(this, node, reference) as T;
  };

  proto[MARK] = true;
  return true;
}
