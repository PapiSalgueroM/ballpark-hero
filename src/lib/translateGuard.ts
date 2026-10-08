/**
 * Round 1140: a translated page must not crash.
 * Round 1141: and it must stay right.
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
 * LAYER ONE (Round 1140). removeChild and insertBefore stop throwing for exactly
 * that case, a node whose parent is no longer the one the caller remembers.
 * Removing a node that is already gone is a no-op. Inserting before a reference
 * that is gone appends at the end. Every other call goes straight to the browser's
 * own method, untouched. That ends the crash and nothing else: the translator's
 * copy stays where it was, so the page kept a stale word beside a fresh one
 * ("Choose positionStriker (ST)") and a number React updated in place never moved
 * (the header said Age 16 when the player was 20).
 *
 * LAYER TWO (Round 1141) knows which copy stands for which text node and puts
 * React's intent through to it. What it is built on was measured on the real
 * translator, in Portuguese, Japanese and German, not assumed:
 *  - The swap is an insert and a remove. A <font> goes in right before the text
 *    node, then the text node leaves, and the record of that removal names the
 *    <font> as its previous sibling. Every text node gets one wrapper of its own,
 *    numbers, signs and names included.
 *  - The words are NOT kept node by node. A sentence made of several text nodes
 *    ("Age " and "16") is translated as one and shared out again as the language
 *    needs: in Portuguese the first wrapper came back empty and the second held
 *    "16 anos", in German five nodes became two full wrappers and three empty ones.
 *    So one wrapper cannot be mended alone. The whole group goes back together.
 *  - A text node the translator has already taken is never translated again when it
 *    is put back (it marks the node), but a brand new text node is translated
 *    within about a tenth of a second. So React's own node is never put back. A
 *    fresh stand in with the same words goes where the wrapper was, the translator
 *    takes that, and the map follows.
 *  - Writing into a stand in the translator is still working on freezes an older
 *    value. So a stand in that has been on the page for a turn is never written,
 *    it is replaced.
 * Which gives one rule: whenever React removes, inserts before, or rewrites a text
 * node the translator took, every translated string directly inside that same
 * element is handed back to the translator as fresh text, in React's order, with
 * React's current words. Measured on the real translator: one rewrite caused
 * exactly one new swap for each string of the group and nothing after it, and a
 * hundred rewrites in a row left the element with exactly the nodes it started
 * with.
 *
 * Layer two cannot touch an untranslated page: it writes to the DOM only from
 * inside a call that names a text node with a translator's copy on record, and a
 * copy only gets on record when a <font> arrived in the very batch of changes that
 * took the text node away. Every step of it sits in a try that falls back to layer
 * one.
 *
 * What it does not mend: a wrapper the translator shares between an element's own
 * strings and a child element's (bold words in the middle of a sentence) is only
 * refreshed on the outer side, and a text node React moves, as opposed to removes
 * or rewrites, is not followed.
 *
 * Switches, both read once, before the app boots, and both there for
 * scripts/playTranslatedPage.mjs:
 *   window.__DUKB_NO_TRANSLATE_GUARD__  nothing is installed (the crash is back)
 *   window.__DUKB_NO_TRANSLATE_LIVE__   layer one only (the stale word is back)
 * window.__dukbTranslateStats counts what layer two did. On a page nobody
 * translated every number in it stays at zero.
 */

export interface TranslateStats {
  /** text nodes a translator took and left a copy for */
  swaps: number;
  /** removals put through to the translator's copy */
  removed: number;
  /** inserts placed before the translator's copy */
  inserted: number;
  /** translated copies handed back to the translator as fresh text */
  restored: number;
}

type GuardWindow = Window & typeof globalThis & {
  __DUKB_NO_TRANSLATE_GUARD__?: boolean;
  __DUKB_NO_TRANSLATE_LIVE__?: boolean;
  __dukbTranslateStats?: TranslateStats;
};

const MARK = '__dukbTranslateGuard';

interface Natives {
  removeChild: Node['removeChild'];
  insertBefore: Node['insertBefore'];
}

interface Live {
  /** React removes `child`, which `parent` no longer holds. True when its copy was removed in its place. */
  remove(parent: Node, child: Node): boolean;
  /** React inserts before `reference`, which `parent` no longer holds. What stands there now, or null. */
  before(parent: Node, reference: Node): Node | null;
}

const isWrapper = (node: Node | null): node is Element => !!node && node.nodeType === 1 && node.nodeName === 'FONT';

/** Layer two. Null when this window cannot carry it, and then layer one stands alone. */
function makeLive(win: GuardWindow, native: Natives): Live | null {
  const doc = win.document;
  if (!doc || typeof win.MutationObserver !== 'function') return null;

  const stats: TranslateStats = { swaps: 0, removed: 0, inserted: 0, restored: 0 };
  win.__dukbTranslateStats = stats;

  /** React's text node, to what stands for it on the page: a translator's wrapper, or a stand in waiting for one. */
  const shown = new WeakMap<Node, Node>();
  /** The other way round. */
  const owner = new WeakMap<Node, Node>();
  /** Stand ins made in this same turn. No translator has read them yet: it reads the page in a microtask at the earliest. */
  let young: Set<Node> | null = null;

  /**
   * THE MAP. A swap is a text node leaving while a <font> that arrived in the same batch sits where it stood:
   * added by the same record, or the removed node's previous or next sibling. The "same batch" half is what
   * keeps an ordinary removal beside an older wrapper from ever being read as a swap.
   */
  const take = (records: MutationRecord[]) => {
    let arrived: Set<Node> | null = null;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const gone = record.removedNodes;
      if (gone.length === 0) continue;
      for (let j = 0; j < gone.length; j++) {
        const text = gone[j];
        if (text.nodeType !== 3) continue;
        if (!arrived) {
          arrived = new Set();
          for (let a = 0; a < records.length; a++) {
            const came = records[a].addedNodes;
            for (let b = 0; b < came.length; b++) if (isWrapper(came[b])) arrived.add(came[b]);
          }
        }
        let wrapper: Node | null = null;
        const here = record.addedNodes;
        for (let k = 0; k < here.length && !wrapper; k++) if (isWrapper(here[k])) wrapper = here[k];
        if (!wrapper && record.previousSibling && arrived.has(record.previousSibling)) wrapper = record.previousSibling;
        if (!wrapper && record.nextSibling && arrived.has(record.nextSibling)) wrapper = record.nextSibling;
        if (!wrapper || owner.has(wrapper) || wrapper.parentNode !== record.target) continue;
        // A stand in of ours was taken: the entry belongs to the node React holds.
        const mine = owner.get(text) || text;
        owner.delete(text);
        shown.set(mine, wrapper);
        owner.set(wrapper, mine);
        stats.swaps += 1;
      }
    }
  };
  const observer = new win.MutationObserver(take);
  observer.observe(doc, { childList: true, subtree: true });
  /** React can commit in a microtask that runs ahead of the observer's own, so every lookup reads the queue first. */
  const flush = () => take(observer.takeRecords());

  /**
   * THE ONE RULE. Every translated string directly inside `parent` goes back to the translator as a brand new
   * text node holding React's current words. Never React's own node (the translator would not look at it
   * again) and never a write into a stand in from an earlier turn (the translator may be working on it).
   */
  const refresh = (parent: Node) => {
    let child = parent.firstChild;
    while (child) {
      const next = child.nextSibling;
      const mine = owner.get(child);
      if (mine) {
        const words = mine.nodeValue || '';
        if (young && young.has(child)) {
          if (child.nodeValue !== words) child.nodeValue = words;
        } else {
          const standIn = (mine.ownerDocument || doc).createTextNode(words);
          native.insertBefore.call(parent, standIn, child);
          native.removeChild.call(parent, child);
          owner.delete(child);
          owner.set(standIn, mine);
          shown.set(mine, standIn);
          if (!young) {
            young = new Set();
            Promise.resolve().then(() => { young = null; });
          }
          young.add(standIn);
          stats.restored += 1;
        }
      }
      child = next;
    }
  };

  return {
    remove(parent, child) {
      if (child.nodeType !== 3) return false;
      flush();
      const copy = shown.get(child);
      if (!copy || copy.parentNode !== parent) return false;
      native.removeChild.call(parent, copy);
      shown.delete(child);
      owner.delete(copy);
      stats.removed += 1;
      // The words of the node that left may live in a neighbour's wrapper, and the other way round.
      refresh(parent);
      return true;
    },
    before(parent, reference) {
      if (reference.nodeType !== 3) return null;
      flush();
      const copy = shown.get(reference);
      if (!copy || copy.parentNode !== parent) return null;
      // The new node lands in the middle of a sentence the translator shared out its own way, so the
      // sentence goes back whole and the new node takes its place among React's words.
      refresh(parent);
      stats.inserted += 1;
      return shown.get(reference) || null;
    },
  };
}

export function installTranslateGuard(win: GuardWindow = window as GuardWindow): boolean {
  const NodeCtor = win.Node;
  if (typeof NodeCtor !== 'function' || !NodeCtor.prototype) return false;
  if (win.__DUKB_NO_TRANSLATE_GUARD__) return false;
  const proto = NodeCtor.prototype as Node & { [MARK]?: boolean };
  if (proto[MARK]) return true;

  const nativeRemoveChild = proto.removeChild;
  const nativeInsertBefore = proto.insertBefore;
  const live = win.__DUKB_NO_TRANSLATE_LIVE__ ? null : makeLive(win, { removeChild: nativeRemoveChild, insertBefore: nativeInsertBefore });

  // One line in the console is enough to explain an odd looking translated page.
  let told = false;
  const tell = (what: string) => {
    if (told) return;
    told = true;
    console.warn(`[dukb] ${what} a node this page no longer owns. A page translator moved it, carrying on.`);
  };

  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child && child.parentNode !== this) {
      if (live) {
        try {
          if (live.remove(this, child)) return child;
        } catch {
          // layer one, below
        }
      }
      tell('Skipped removing');
      return child;
    }
    return nativeRemoveChild.call(this, child) as T;
  };

  proto.insertBefore = function <T extends Node>(this: Node, node: T, reference: Node | null): T {
    if (reference && reference.parentNode !== this) {
      if (live) {
        let copy: Node | null = null;
        try {
          copy = live.before(this, reference);
        } catch {
          // layer one, below
        }
        if (copy && copy.parentNode === this) return nativeInsertBefore.call(this, node, copy) as T;
      }
      tell('Appended instead of inserting before');
      return nativeInsertBefore.call(this, node, null) as T;
    }
    return nativeInsertBefore.call(this, node, reference) as T;
  };

  proto[MARK] = true;
  return true;
}
